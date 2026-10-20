'use strict';

/**
 * HomePlus Homi Tool Layer — Tool Contract v1.
 *
 * Pure foundation module. It performs no I/O, no HTTP, no data access and it
 * does not depend on any HTTP framework, data layer or business service.
 *
 * The contract version below is the version of the HomePlus Homi Tool
 * Definition contract. It is unrelated to any distributed Homi Contracts
 * package used outside this repository.
 */

const HOMI_TOOL_CONTRACT_VERSION = '1.0.0';

const TOOL_KINDS = Object.freeze(['READ', 'WRITE']);

const TOOL_RISK_FLAGS = Object.freeze([
  'READ_ONLY',
  'LOW_MUTATION',
  'REVERSIBLE_MUTATION',
  'DESTRUCTIVE',
  'SECURITY_SENSITIVE',
  'EXTERNAL_SIDE_EFFECT',
]);

const TOOL_CONFIRMATION = Object.freeze(['NEVER', 'REQUIRED']);

const HOMI_TOOL_DEFINITION_INVALID = 'HOMI_TOOL_DEFINITION_INVALID';

const TOOL_DEFINITION_FIELDS = Object.freeze([
  'contractVersion',
  'id',
  'version',
  'domain',
  'description',
  'kind',
  'riskFlags',
  'confirmation',
  'inputSchema',
  'outputSchema',
]);

const TOOL_ID_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const RESERVED_ID_NAMESPACE = 'homi';
const MAX_DESCRIPTION_LENGTH = 500;

const MUTATION_RISK_FLAGS = Object.freeze([
  'LOW_MUTATION',
  'REVERSIBLE_MUTATION',
  'DESTRUCTIVE',
]);

const CONFIRMATION_REQUIRED_RISK_FLAGS = Object.freeze([
  'DESTRUCTIVE',
  'SECURITY_SENSITIVE',
]);

class HomiToolError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'HomiToolError';
    this.code = code;
    this.details = details || null;
  }
}

function fail(reason, at) {
  throw new HomiToolError(
    HOMI_TOOL_DEFINITION_INVALID,
    `Homi tool definition invalid: ${at} ${reason}`,
    { at, reason }
  );
}

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertJsonCompatible(value, at, ancestors) {
  if (value === null) return;

  const type = typeof value;

  if (type === 'undefined') fail('must not be undefined', at);
  if (type === 'function') fail('must not be a function', at);
  if (type === 'symbol') fail('must not be a symbol', at);
  if (type === 'bigint') fail('must not be a bigint', at);
  if (type === 'number' && !Number.isFinite(value)) fail('must be a finite number', at);
  if (type !== 'object') return;

  if (ancestors.has(value)) fail('must not contain cyclic references', at);
  ancestors.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertJsonCompatible(value[index], `${at}[${index}]`, ancestors);
    }
  } else {
    if (!isPlainObject(value)) fail('must be a plain object', at);
    if (Object.getOwnPropertySymbols(value).length > 0) {
      fail('must not contain symbol keys', at);
    }
    if (Object.getOwnPropertyNames(value).length !== Object.keys(value).length) {
      fail('must not contain non enumerable properties', at);
    }
    for (const key of Object.keys(value)) {
      assertJsonCompatible(value[key], `${at}.${key}`, ancestors);
    }
  }

  ancestors.delete(value);
}

function assertKindAndRiskFlags(kind, riskFlags) {
  if (!TOOL_KINDS.includes(kind)) {
    fail(`must be one of ${TOOL_KINDS.join(', ')}`, 'kind');
  }

  if (!Array.isArray(riskFlags)) fail('must be an array', 'riskFlags');

  const seen = new Set();
  for (let index = 0; index < riskFlags.length; index += 1) {
    const flag = riskFlags[index];
    if (typeof flag !== 'string' || !TOOL_RISK_FLAGS.includes(flag)) {
      fail(`must be one of ${TOOL_RISK_FLAGS.join(', ')}`, `riskFlags[${index}]`);
    }
    if (seen.has(flag)) fail('must not contain duplicate flags', `riskFlags[${index}]`);
    seen.add(flag);
  }

  if (kind === 'READ') {
    if (!seen.has('READ_ONLY')) fail('must include READ_ONLY for READ tools', 'riskFlags');
    for (const flag of MUTATION_RISK_FLAGS) {
      if (seen.has(flag)) fail(`must not include ${flag} for READ tools`, 'riskFlags');
    }
  }

  if (kind === 'WRITE' && seen.has('READ_ONLY')) {
    fail('must not include READ_ONLY for WRITE tools', 'riskFlags');
  }
}

function assertConfirmation(confirmation, riskFlags) {
  if (!TOOL_CONFIRMATION.includes(confirmation)) {
    fail(`must be one of ${TOOL_CONFIRMATION.join(', ')}`, 'confirmation');
  }

  const requiresConfirmation = CONFIRMATION_REQUIRED_RISK_FLAGS.some((flag) => riskFlags.includes(flag));
  if (requiresConfirmation && confirmation !== 'REQUIRED') {
    fail('must be REQUIRED for DESTRUCTIVE or SECURITY_SENSITIVE tools', 'confirmation');
  }
}

function assertInputSchema(inputSchema) {
  if (!isPlainObject(inputSchema)) fail('must be a plain object', 'inputSchema');
  if (inputSchema.type !== 'object') fail('must have type "object"', 'inputSchema.type');
  if (inputSchema.additionalProperties !== false) {
    fail('must have additionalProperties === false', 'inputSchema.additionalProperties');
  }
  if (!isPlainObject(inputSchema.properties)) fail('must be a plain object', 'inputSchema.properties');

  for (const key of Object.keys(inputSchema.properties)) {
    if (!isPlainObject(inputSchema.properties[key])) {
      fail('must be a plain object', `inputSchema.properties.${key}`);
    }
  }

  if (!Array.isArray(inputSchema.required)) fail('must be an array', 'inputSchema.required');

  const seen = new Set();
  for (let index = 0; index < inputSchema.required.length; index += 1) {
    const entry = inputSchema.required[index];
    if (typeof entry !== 'string') fail('must contain strings only', `inputSchema.required[${index}]`);
    if (seen.has(entry)) fail('must not contain duplicate entries', `inputSchema.required[${index}]`);
    seen.add(entry);
    if (!Object.prototype.hasOwnProperty.call(inputSchema.properties, entry)) {
      fail('must reference a declared property', `inputSchema.required[${index}]`);
    }
  }
}

function assertOutputSchema(outputSchema) {
  if (!isPlainObject(outputSchema)) fail('must be a plain object', 'outputSchema');
  if (outputSchema.type !== 'object') fail('must have type "object"', 'outputSchema.type');
}

/**
 * Validate a Tool Definition against contract v1.
 *
 * @param {unknown} definition candidate tool definition
 * @returns {boolean} true when the definition satisfies the contract
 * @throws {HomiToolError} with code HOMI_TOOL_DEFINITION_INVALID
 */
function validateToolDefinition(definition) {
  if (!isPlainObject(definition)) fail('must be a plain object', '<root>');

  for (const key of Object.keys(definition)) {
    if (!TOOL_DEFINITION_FIELDS.includes(key)) fail('is not an allowed top level field', key);
  }

  for (const field of TOOL_DEFINITION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(definition, field)) fail('is required', field);
  }

  assertJsonCompatible(definition, '<root>', new Set());

  if (definition.contractVersion !== HOMI_TOOL_CONTRACT_VERSION) {
    fail(`must be "${HOMI_TOOL_CONTRACT_VERSION}"`, 'contractVersion');
  }

  if (typeof definition.id !== 'string') fail('must be a string', 'id');
  if (!TOOL_ID_PATTERN.test(definition.id)) {
    fail('must match "<domain>.<resource>.<operation>" in lowercase', 'id');
  }
  if (definition.id.split('.')[0] === RESERVED_ID_NAMESPACE) {
    fail('must not use the reserved "homi" namespace', 'id');
  }

  if (typeof definition.version !== 'string') fail('must be a string', 'version');
  if (!VERSION_PATTERN.test(definition.version)) fail('must match MAJOR.MINOR.PATCH', 'version');

  if (typeof definition.domain !== 'string') fail('must be a string', 'domain');
  if (definition.domain !== definition.id.split('.')[0]) {
    fail('must equal the first segment of id', 'domain');
  }

  if (typeof definition.description !== 'string') fail('must be a string', 'description');
  if (definition.description !== definition.description.trim()) fail('must be trimmed', 'description');
  if (definition.description.length === 0) fail('must not be empty', 'description');
  if (definition.description.length > MAX_DESCRIPTION_LENGTH) {
    fail(`must not exceed ${MAX_DESCRIPTION_LENGTH} characters`, 'description');
  }

  assertKindAndRiskFlags(definition.kind, definition.riskFlags);
  assertConfirmation(definition.confirmation, definition.riskFlags);
  assertInputSchema(definition.inputSchema);
  assertOutputSchema(definition.outputSchema);

  return true;
}

function cloneJson(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneJson(entry));
  if (isPlainObject(value)) {
    const clone = {};
    for (const key of Object.keys(value)) clone[key] = cloneJson(value[key]);
    return clone;
  }
  return value;
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return value;
}

function sortRiskFlags(riskFlags) {
  return riskFlags
    .slice()
    .sort((left, right) => TOOL_RISK_FLAGS.indexOf(left) - TOOL_RISK_FLAGS.indexOf(right));
}

/**
 * Validate and canonicalize a Tool Definition.
 *
 * The returned definition is a defensive deep clone that is deeply frozen.
 * The input object is never mutated.
 *
 * @param {unknown} definition candidate tool definition
 * @returns {object} canonical immutable tool definition
 * @throws {HomiToolError} with code HOMI_TOOL_DEFINITION_INVALID
 */
function normalizeToolDefinition(definition) {
  validateToolDefinition(definition);

  const normalized = {
    contractVersion: definition.contractVersion,
    id: definition.id,
    version: definition.version,
    domain: definition.domain,
    description: definition.description,
    kind: definition.kind,
    riskFlags: sortRiskFlags(definition.riskFlags),
    confirmation: definition.confirmation,
    inputSchema: cloneJson(definition.inputSchema),
    outputSchema: cloneJson(definition.outputSchema),
  };

  return deepFreeze(normalized);
}

module.exports = {
  HOMI_TOOL_CONTRACT_VERSION,
  TOOL_KINDS,
  TOOL_RISK_FLAGS,
  TOOL_CONFIRMATION,
  TOOL_DEFINITION_FIELDS,
  TOOL_ID_PATTERN,
  VERSION_PATTERN,
  MAX_DESCRIPTION_LENGTH,
  HOMI_TOOL_DEFINITION_INVALID,
  HomiToolError,
  validateToolDefinition,
  normalizeToolDefinition,
};
