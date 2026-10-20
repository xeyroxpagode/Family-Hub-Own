'use strict';

/**
 * HomePlus Homi Tool Layer — tool executor (T07-S4).
 *
 * The executor is the single entry point of the executable side of the layer.
 * It enforces a fixed security order:
 *
 *   1. the authenticated authority exists;
 *   2. the authoritative Homi context is resolved from that authority;
 *   3. the distributed identity claims are validated against that context;
 *   4. the tool definition is resolved from the default registry;
 *   5. the definition is proven to be READ;
 *   6. the runtime arguments are validated against the declared schema;
 *   7. the exact binding is resolved;
 *   8. the handler is executed;
 *   9. the canonical tool result is returned.
 *
 * The caller claims are ASSERTIONS, never authority: they are validated
 * against the authoritative context and they never select the actor, the
 * household, the membership or the role. There is no dynamic module loading,
 * no evaluation and no caller provided path.
 */

const { createDefaultHomiToolRegistry } = require('../homi/defaultRegistry');
const { resolveHomiExecutionContext } = require('../homi/contextResolver');
const { validateAuthenticatedInput, validateHomiIdentityClaims } = require('../homi/contextContract');
const { validateToolArguments } = require('./argumentValidator');
const { TOOL_BINDINGS } = require('./toolBindings');
const { homiObservability } = require('./observability');

const HOMI_TOOL_NOT_FOUND = 'HOMI_TOOL_NOT_FOUND';
const HOMI_TOOL_NOT_READ = 'HOMI_TOOL_NOT_READ';
const HOMI_TOOL_ARGUMENT_INVALID = 'HOMI_TOOL_ARGUMENT_INVALID';
const HOMI_TOOL_BINDING_MISSING = 'HOMI_TOOL_BINDING_MISSING';
const HOMI_TOOL_EXECUTION_FAILED = 'HOMI_TOOL_EXECUTION_FAILED';

/**
 * HTTP status of every stable internal Homi code.
 *
 * The context codes of the S2 boundary are preserved verbatim; only the
 * transport status is added here so the canonical error envelope can render
 * them.
 */
const HOMI_ERROR_STATUS = Object.freeze({
  HOMI_AUTH_CONTEXT_INVALID: 401,
  HOMI_CLAIM_INVALID: 400,
  HOMI_CONTEXT_MISMATCH: 403,
  HOMI_CONTEXT_UNAVAILABLE: 403,
  HOMI_TOOL_NOT_FOUND: 404,
  HOMI_TOOL_NOT_READ: 400,
  HOMI_TOOL_ARGUMENT_INVALID: 400,
  HOMI_TOOL_BINDING_MISSING: 500,
  HOMI_TOOL_EXECUTION_FAILED: 500,
});

/**
 * Stable internal error type of the executable Homi layer.
 */
class HomiToolExecutionError extends Error {
  constructor(code, message, details, statusCode, cause) {
    super(message);
    this.name = 'HomiToolExecutionError';
    this.code = code;
    this.statusCode = statusCode ?? HOMI_ERROR_STATUS[code] ?? 500;
    this.details = Object.freeze({ ...(details || {}) });

    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        value: cause,
        enumerable: false,
        writable: false,
        configurable: true,
      });
    }
  }
}

/**
 * The production registry of this slice.
 *
 * It is metadata only and it is never mutated after this module is loaded.
 */
const DEFAULT_REGISTRY = createDefaultHomiToolRegistry();

const isPlainObject = (value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Normalize an error into the canonical HomePlus transport contract.
 *
 * The S2 context errors, the argument errors, the binding errors and the
 * canonical Planner errors keep their own code, status and message. Any other
 * failure becomes an opaque internal error: no stack, no token, no client and
 * no data layer detail ever reaches the caller.
 *
 * @param {unknown} error the raised error
 * @param {string} toolId the requested tool id
 * @returns {Error} the error to propagate
 */
function normalizeExecutionError(error, toolId) {
  if (error instanceof HomiToolExecutionError) return error;

  if (error && typeof error.code === 'string' && HOMI_ERROR_STATUS[error.code]) {
    // An S2 context error, an argument error or a binding error.
    if (typeof error.statusCode !== 'number') {
      error.statusCode = HOMI_ERROR_STATUS[error.code];
    }
    return error;
  }

  if (
    error &&
    typeof error.code === 'string' &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 600
  ) {
    // A canonical HomePlus business error. It is preserved as it is.
    return error;
  }

  return new HomiToolExecutionError(
    HOMI_TOOL_EXECUTION_FAILED,
    'The tool could not be executed.',
    { toolId: typeof toolId === 'string' ? toolId : null },
    HOMI_ERROR_STATUS[HOMI_TOOL_EXECUTION_FAILED],
    error
  );
}

/**
 * Build the Homi tool executor.
 *
 * @param {object} [options] dependency injection
 * @param {object} [options.registry] the tool registry
 * @param {object} [options.bindings] the executable binding map
 * @param {Function} [options.resolveExecutionContext] the context resolver
 * @param {Function} [options.validateArguments] the argument validator
 * @param {object} [options.observability] the observability facade
 * @returns {Function} `async (input) => canonical tool result`
 */
function createHomiToolExecutor(options) {
  const registry = isPlainObject(options) && options.registry ? options.registry : DEFAULT_REGISTRY;
  const bindings = isPlainObject(options) && options.bindings ? options.bindings : TOOL_BINDINGS;
  const resolveExecutionContext =
    isPlainObject(options) && typeof options.resolveExecutionContext === 'function'
      ? options.resolveExecutionContext
      : resolveHomiExecutionContext;
  const validateArguments =
    isPlainObject(options) && typeof options.validateArguments === 'function'
      ? options.validateArguments
      : validateToolArguments;
  const observability =
    isPlainObject(options) && options.observability ? options.observability : homiObservability;

  /**
   * Emit an observability event without ever breaking the execution.
   *
   * @param {string} method the observability method to call
   * @param {object} input the event input
   */
  const emit = async (method, input) => {
    try {
      await observability[method](input);
    } catch (error) {
      // Observability must never break a tool execution.
    }
  };

  return async function executeHomiTool(input) {
    const startedAt = Date.now();

    const requestId =
      typeof input?.requestId === 'string' && input.requestId.trim().length > 0
        ? input.requestId.trim()
        : null;
    const toolId = typeof input?.toolId === 'string' ? input.toolId.trim() : '';
    const claims = input?.claims;
    const args = input?.args;

    const claimedActorId = typeof claims?.actor_id === 'string' ? claims.actor_id : null;
    const claimedHouseholdId = typeof claims?.household_id === 'string' ? claims.household_id : null;

    let actorId = null;
    let householdId = null;

    await emit('started', {
      requestId,
      toolId,
      actorId: claimedActorId,
      householdId: claimedHouseholdId,
      durationMs: Date.now() - startedAt,
    });

    try {
      // 1. The authenticated authority exists.
      const { user, accessToken } = validateAuthenticatedInput({
        user: input?.user,
        accessToken: input?.accessToken,
      });

      // 2. The authoritative context is resolved from that authority alone.
      const resolved = await resolveExecutionContext({ user, accessToken });
      const homiContext = resolved?.context;
      const canonicalContext = resolved?.canonical;

      actorId = typeof homiContext?.actorId === 'string' ? homiContext.actorId : null;
      householdId = typeof homiContext?.householdId === 'string' ? homiContext.householdId : null;

      // 3. The distributed claims are validated against the authoritative
      //    context. They are assertions, never authority.
      validateHomiIdentityClaims(claims, homiContext);

      // 4. The tool definition is resolved from the registry.
      const definition = registry.get(toolId);

      if (!definition) {
        throw new HomiToolExecutionError(
          HOMI_TOOL_NOT_FOUND,
          'The requested tool does not exist.',
          { toolId }
        );
      }

      // 5. The READ-only gate. The executor never runs a WRITE definition.
      if (definition.kind !== 'READ') {
        throw new HomiToolExecutionError(
          HOMI_TOOL_NOT_READ,
          'The requested tool is not a read tool.',
          { toolId }
        );
      }

      // 6. The runtime arguments are validated against the declared schema.
      const validatedArgs = validateArguments(definition.inputSchema, args);

      // 7. The exact binding is resolved.
      const handler = bindings[toolId];

      if (typeof handler !== 'function') {
        throw new HomiToolExecutionError(
          HOMI_TOOL_BINDING_MISSING,
          'The requested tool has no executable binding.',
          { toolId }
        );
      }

      // 8. The handler is executed against the canonical HomePlus context.
      const result = await handler(canonicalContext, validatedArgs, { requestId, homiContext });

      // 9. The canonical tool result is returned.
      await emit('succeeded', {
        requestId,
        toolId,
        actorId,
        householdId,
        durationMs: Date.now() - startedAt,
      });

      return { ok: true, tool_id: toolId, result };
    } catch (error) {
      const normalized = normalizeExecutionError(error, toolId);

      await emit('failed', {
        requestId,
        toolId,
        actorId: actorId ?? claimedActorId,
        householdId: householdId ?? claimedHouseholdId,
        durationMs: Date.now() - startedAt,
        errorCode: normalized?.code ?? HOMI_TOOL_EXECUTION_FAILED,
      });

      throw normalized;
    }
  };
}

/**
 * The production executor of this slice.
 */
const executeHomiTool = createHomiToolExecutor();

module.exports = {
  HOMI_TOOL_NOT_FOUND,
  HOMI_TOOL_NOT_READ,
  HOMI_TOOL_ARGUMENT_INVALID,
  HOMI_TOOL_BINDING_MISSING,
  HOMI_TOOL_EXECUTION_FAILED,
  HOMI_ERROR_STATUS,
  HomiToolExecutionError,
  createHomiToolExecutor,
  executeHomiTool,
};
