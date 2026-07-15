'use strict';

const { createHttpError } = require('./httpErrors');

const MUTATION_ID_HEADER = 'x-mutation-id';
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const MAX_CORRELATION_ID_LENGTH = 128;
const SAFE_CORRELATION_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

const OPERATION_KINDS = Object.freeze({
  READ_ONLY: 'READ_ONLY',
  CREATE_IDEMPOTENT: 'CREATE_IDEMPOTENT',
  VERSIONED_MUTATION: 'VERSIONED_MUTATION',
  NON_VERSIONED_MUTATION: 'NON_VERSIONED_MUTATION',
  AUTH_SESSION_MUTATION: 'AUTH_SESSION_MUTATION',
});

const OPERATION_POLICIES = Object.freeze({
  [OPERATION_KINDS.READ_ONLY]: Object.freeze({
    mutationId: 'not_applicable',
    idempotency: 'not_applicable',
    version: 'not_applicable',
  }),
  [OPERATION_KINDS.CREATE_IDEMPOTENT]: Object.freeze({
    mutationId: 'required',
    idempotency: 'required',
    version: 'not_applicable',
  }),
  [OPERATION_KINDS.VERSIONED_MUTATION]: Object.freeze({
    mutationId: 'required',
    idempotency: 'required',
    version: 'required',
  }),
  [OPERATION_KINDS.NON_VERSIONED_MUTATION]: Object.freeze({
    mutationId: 'required',
    idempotency: 'optional',
    version: 'not_applicable',
  }),
  [OPERATION_KINDS.AUTH_SESSION_MUTATION]: Object.freeze({
    mutationId: 'optional',
    idempotency: 'not_applicable',
    version: 'not_applicable',
  }),
});

function sanitizeCorrelationId(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > MAX_CORRELATION_ID_LENGTH) return null;
  return SAFE_CORRELATION_ID_RE.test(value) ? value : null;
}

function readMutationId(req) {
  return sanitizeCorrelationId(req?.headers?.[MUTATION_ID_HEADER]);
}

function requireMutationId(req) {
  const value = readMutationId(req);
  if (!value) {
    throw createHttpError(422, 'X-Mutation-Id es obligatorio para esta mutación.', 'mutation_id_required');
  }
  return value;
}

function parseIdempotencyKey(req) {
  const raw = req?.headers?.[IDEMPOTENCY_KEY_HEADER];
  if (raw === undefined || raw === null) return null;
  const value = sanitizeCorrelationId(raw);
  if (!value) {
    throw createHttpError(400, 'Idempotency-Key inválido.', 'invalid_idempotency_key');
  }
  return value;
}

function requireIdempotencyKey(req) {
  const value = parseIdempotencyKey(req);
  if (!value) {
    throw createHttpError(422, 'Idempotency-Key es obligatorio para esta mutación.', 'idempotency_key_required');
  }
  return value;
}

function parseExpectedVersion(req, required = false) {
  const rawHeader = req?.headers?.['if-match'];
  const rawBody = req?.body?.expected_version;
  const hasHeader = typeof rawHeader === 'string' && rawHeader.trim() !== '';
  const hasBody = rawBody !== undefined && rawBody !== null;

  if (!hasHeader && !hasBody) {
    if (required) {
      throw createHttpError(
        422,
        'If-Match (o expected_version) es obligatorio para mutaciones sobre entidades existentes.',
        'expected_version_required',
      );
    }
    return null;
  }

  const raw = hasHeader ? rawHeader.replace(/^"|"$/g, '') : rawBody;
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createHttpError(400, 'If-Match debe ser un entero >= 1.', 'invalid_expected_version');
  }
  return parsed;
}

function parseRequiredExpectedVersion(req) {
  return parseExpectedVersion(req, true);
}

function requireMutationContract(req, policyOrKind) {
  const policy = typeof policyOrKind === 'string'
    ? OPERATION_POLICIES[policyOrKind]
    : policyOrKind;
  if (!policy) {
    throw new TypeError(`Unknown mutation contract: ${String(policyOrKind)}`);
  }

  const mutationId = policy.mutationId === 'required'
    ? requireMutationId(req)
    : policy.mutationId === 'optional' ? readMutationId(req) : null;
  const idempotencyKey = policy.idempotency === 'required'
    ? requireIdempotencyKey(req)
    : policy.idempotency === 'optional' ? parseIdempotencyKey(req) : null;
  const expectedVersion = policy.version === 'required'
    ? parseRequiredExpectedVersion(req)
    : policy.version === 'optional' ? parseExpectedVersion(req) : null;

  return { mutationId, idempotencyKey, expectedVersion };
}

function assertExpectedVersionMatches(currentVersion, expectedVersion) {
  if (Number(currentVersion) !== Number(expectedVersion)) {
    throw createHttpError(
      412,
      'La versión de la entidad cambió. Actualizá y reintentá.',
      'version_conflict_v2',
      { current: Number(currentVersion), expected: Number(expectedVersion) },
    );
  }
}

module.exports = {
  MUTATION_ID_HEADER,
  IDEMPOTENCY_KEY_HEADER,
  MAX_CORRELATION_ID_LENGTH,
  SAFE_CORRELATION_ID_RE,
  OPERATION_KINDS,
  OPERATION_POLICIES,
  sanitizeCorrelationId,
  readMutationId,
  requireMutationId,
  parseIdempotencyKey,
  requireIdempotencyKey,
  parseExpectedVersion,
  parseRequiredExpectedVersion,
  requireMutationContract,
  assertExpectedVersionMatches,
};
