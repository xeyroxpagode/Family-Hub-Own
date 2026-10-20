'use strict';

/**
 * HomePlus Homi Tool Layer — HTTP controller (T07-S4).
 *
 * The controller is thin by contract. It only:
 *   - reads the requested tool id from the route;
 *   - reads and validates the exact invocation body;
 *   - takes the authenticated principal and its bearer token from the
 *     canonical authentication middleware;
 *   - takes the correlation id from the canonical request context;
 *   - calls the Homi executor;
 *   - returns the canonical result or the canonical error.
 *
 * It contains NO Planner logic, it queries no data and it never resolves an
 * identity, a household or a membership by itself.
 */

const { sendApiError, createHttpError } = require('../lib/httpErrors');
const { executeHomiTool } = require('../homiRuntime/toolExecutor');

/**
 * The canonical path of the Homi tool invocation endpoint.
 */
const HOMI_TOOL_INVOKE_PATH = '/tools/:toolId/invoke';

/**
 * The exact allowed top level fields of an invocation body.
 *
 * No other field is accepted: an identity, a membership, a role or a
 * credential can never be supplied by the caller.
 */
const HOMI_INVOKE_BODY_FIELDS = Object.freeze(['actor_id', 'household_id', 'args']);

const HOMI_REQUEST_INVALID = 'HOMI_REQUEST_INVALID';

const isPlainObject = (value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/**
 * @param {string} message safe, credential free message
 * @param {object} [details] safe metadata (field names only)
 * @returns {Error} the request error to throw
 */
function createHomiRequestError(message, details) {
  return createHttpError(400, message, HOMI_REQUEST_INVALID, details ?? null);
}

/**
 * Read and validate the exact invocation body.
 *
 * @param {unknown} body the raw request body
 * @returns {{ actor_id: string, household_id: string, args: object }} the claims
 *   and the arguments
 * @throws {Error} HOMI_REQUEST_INVALID
 */
function readInvocationBody(body) {
  if (!isPlainObject(body)) {
    throw createHomiRequestError('The Homi invocation body must be a JSON object.');
  }

  const unexpected = Object.keys(body).filter((field) => !HOMI_INVOKE_BODY_FIELDS.includes(field));

  if (unexpected.length > 0) {
    throw createHomiRequestError('The Homi invocation body carries unsupported fields.', {
      unexpected,
    });
  }

  for (const field of HOMI_INVOKE_BODY_FIELDS) {
    if (!hasOwn(body, field)) {
      throw createHomiRequestError(`The Homi invocation body requires "${field}".`, {
        field,
      });
    }
  }

  if (typeof body.actor_id !== 'string' || body.actor_id.trim().length === 0) {
    throw createHomiRequestError('The Homi invocation body requires a non-empty "actor_id".', {
      field: 'actor_id',
    });
  }

  if (typeof body.household_id !== 'string' || body.household_id.trim().length === 0) {
    throw createHomiRequestError('The Homi invocation body requires a non-empty "household_id".', {
      field: 'household_id',
    });
  }

  if (!isPlainObject(body.args)) {
    throw createHomiRequestError('The Homi invocation body requires an "args" object.', {
      field: 'args',
    });
  }

  return {
    actor_id: body.actor_id,
    household_id: body.household_id,
    args: body.args,
  };
}

/**
 * Invoke one Homi tool.
 */
const invokeTool = async (req, res) => {
  try {
    const toolId = typeof req?.params?.toolId === 'string' ? req.params.toolId.trim() : '';

    if (toolId.length === 0) {
      throw createHomiRequestError('The Homi invocation requires a tool id.', { field: 'toolId' });
    }

    const invocation = readInvocationBody(req?.body);

    const payload = await executeHomiTool({
      toolId,
      claims: {
        actor_id: invocation.actor_id,
        household_id: invocation.household_id,
      },
      args: invocation.args,
      user: req?.user,
      accessToken: req?.accessToken,
      requestId: req?.requestId ?? null,
    });

    return res.status(200).json(payload);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  HOMI_TOOL_INVOKE_PATH,
  HOMI_INVOKE_BODY_FIELDS,
  HOMI_REQUEST_INVALID,
  invokeTool,
  readInvocationBody,
};
