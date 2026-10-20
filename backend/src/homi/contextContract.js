'use strict';

/**
 * HomePlus Homi Tool Layer — authoritative context contract.
 *
 * Pure module. It owns:
 *   - the canonical shape of the normalized Homi context;
 *   - the external distributed Homi identity claim policy;
 *   - the stable internal context error taxonomy.
 *
 * It performs no I/O, holds no client, no credential and no request object,
 * and depends on no HTTP framework, data layer or business service.
 */

/**
 * Canonical normalized Homi context fields (camelCase inside this backend).
 * All of them are required and every value must be a non-empty string.
 */
const HOMI_CONTEXT_FIELDS = Object.freeze([
  'actorId',
  'householdId',
  'membershipId',
  'authUserId',
  'role',
]);

/**
 * The only identity fields an external Homi caller is allowed to assert.
 * Everything else is server derived.
 */
const HOMI_CLAIM_FIELDS = Object.freeze(['actor_id', 'household_id']);

const HOMI_AUTH_CONTEXT_INVALID = 'HOMI_AUTH_CONTEXT_INVALID';
const HOMI_CONTEXT_UNAVAILABLE = 'HOMI_CONTEXT_UNAVAILABLE';
const HOMI_CONTEXT_MISMATCH = 'HOMI_CONTEXT_MISMATCH';
const HOMI_CLAIM_INVALID = 'HOMI_CLAIM_INVALID';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Recursively freeze a value. Used for every object handed back to a caller.
 *
 * @param {unknown} value value to freeze
 * @returns {unknown} the same value, frozen
 */
function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;

  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

/**
 * Stable internal error type for the Homi context boundary.
 *
 * The `cause` is preserved for internal diagnostics only and is intentionally
 * non enumerable so it can never be serialized into a response payload.
 */
class HomiContextError extends Error {
  constructor(code, message, details, cause) {
    super(message);
    this.name = 'HomiContextError';
    this.code = code;
    this.details = deepFreeze(isPlainObject(details) ? { ...details } : {});

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
 * @param {string} code stable internal error code
 * @param {string} message safe, credential free message
 * @param {object} [details] safe metadata (identifiers and field names only)
 * @param {unknown} [cause] original internal cause, kept non enumerable
 * @returns {HomiContextError} the error to throw
 */
function createHomiContextError(code, message, details, cause) {
  return new HomiContextError(code, message, details, cause);
}

/**
 * Validate the authenticated authority handed to the resolver.
 *
 * The caller cannot supply the effective actor, household, membership or role:
 * only the authenticated principal and its bearer token are accepted here.
 *
 * @param {unknown} input `{ user, accessToken }`
 * @returns {{ user: object, accessToken: string }} the validated authority
 * @throws {HomiContextError} HOMI_AUTH_CONTEXT_INVALID
 */
function validateAuthenticatedInput(input) {
  if (!isPlainObject(input)) {
    throw createHomiContextError(
      HOMI_AUTH_CONTEXT_INVALID,
      'Authenticated Homi context input is required.'
    );
  }

  const { user, accessToken } = input;

  if (!isPlainObject(user)) {
    throw createHomiContextError(
      HOMI_AUTH_CONTEXT_INVALID,
      'Authenticated user is required to resolve the Homi context.'
    );
  }

  if (!isNonEmptyString(user.id)) {
    throw createHomiContextError(
      HOMI_AUTH_CONTEXT_INVALID,
      'Authenticated user id is required to resolve the Homi context.'
    );
  }

  if (!isNonEmptyString(accessToken)) {
    throw createHomiContextError(
      HOMI_AUTH_CONTEXT_INVALID,
      'Authenticated access token is required to resolve the Homi context.'
    );
  }

  return { user, accessToken };
}

/**
 * Build the canonical, immutable normalized Homi context.
 *
 * @param {unknown} candidate raw canonical identity values
 * @returns {object} the frozen normalized context
 * @throws {HomiContextError} HOMI_CONTEXT_UNAVAILABLE when a field is missing
 */
function normalizeHomiContext(candidate) {
  const source = isPlainObject(candidate) ? candidate : {};
  const normalized = {};
  const missing = [];

  for (const field of HOMI_CONTEXT_FIELDS) {
    const value = source[field];
    if (!isNonEmptyString(value)) {
      missing.push(field);
      continue;
    }
    normalized[field] = value.trim();
  }

  if (missing.length > 0) {
    throw createHomiContextError(
      HOMI_CONTEXT_UNAVAILABLE,
      'The authoritative HomePlus context is incomplete.',
      { missing }
    );
  }

  return deepFreeze(normalized);
}

/**
 * Validate the distributed Homi identity claims against the authoritative
 * HomePlus context.
 *
 * The claims are assertions, never authority. A mismatching claim is always
 * rejected: the authoritative context is never switched to match the caller.
 *
 * @param {unknown} claims `{ actor_id, household_id }`
 * @param {unknown} context authoritative normalized Homi context
 * @returns {boolean} true when the claims match the authoritative context
 * @throws {HomiContextError} HOMI_CLAIM_INVALID / HOMI_CONTEXT_MISMATCH /
 *   HOMI_CONTEXT_UNAVAILABLE
 */
function validateHomiIdentityClaims(claims, context) {
  if (!isPlainObject(claims)) {
    throw createHomiContextError(
      HOMI_CLAIM_INVALID,
      'Homi identity claims are required.'
    );
  }

  const unexpected = Object.keys(claims).filter((key) => !HOMI_CLAIM_FIELDS.includes(key));
  if (unexpected.length > 0) {
    throw createHomiContextError(
      HOMI_CLAIM_INVALID,
      'Homi identity claims carry unsupported fields.',
      { unexpected }
    );
  }

  for (const field of HOMI_CLAIM_FIELDS) {
    if (!isNonEmptyString(claims[field])) {
      throw createHomiContextError(
        HOMI_CLAIM_INVALID,
        `Homi identity claim "${field}" must be a non-empty string.`,
        { field }
      );
    }
  }

  if (!isPlainObject(context)) {
    throw createHomiContextError(
      HOMI_CONTEXT_UNAVAILABLE,
      'An authoritative Homi context is required to verify identity claims.'
    );
  }

  const expectedActorId = isNonEmptyString(context.actorId) ? context.actorId.trim() : null;
  const expectedHouseholdId = isNonEmptyString(context.householdId)
    ? context.householdId.trim()
    : null;

  if (!expectedActorId || !expectedHouseholdId) {
    throw createHomiContextError(
      HOMI_CONTEXT_UNAVAILABLE,
      'The authoritative HomePlus context is incomplete.'
    );
  }

  if (claims.actor_id.trim() !== expectedActorId) {
    throw createHomiContextError(
      HOMI_CONTEXT_MISMATCH,
      'The Homi actor claim does not match the authoritative actor.',
      { field: 'actor_id' }
    );
  }

  if (claims.household_id.trim() !== expectedHouseholdId) {
    throw createHomiContextError(
      HOMI_CONTEXT_MISMATCH,
      'The Homi household claim does not match the authoritative household.',
      { field: 'household_id' }
    );
  }

  return true;
}

module.exports = {
  HOMI_CONTEXT_FIELDS,
  HOMI_CLAIM_FIELDS,
  HOMI_AUTH_CONTEXT_INVALID,
  HOMI_CONTEXT_UNAVAILABLE,
  HOMI_CONTEXT_MISMATCH,
  HOMI_CLAIM_INVALID,
  HomiContextError,
  createHomiContextError,
  deepFreeze,
  isNonEmptyString,
  isPlainObject,
  validateAuthenticatedInput,
  normalizeHomiContext,
  validateHomiIdentityClaims,
};
