'use strict';

/**
 * Planner V0.2 — Mutation intent contract helpers.
 *
 * - `X-Mutation-Id`: per user-intent, stable across retries, opaque+safe.
 * - `If-Match` is required for mutations on existing entities; absence is
 *   a contract violation (not a silent path). Returning 422 (not 409) on
 *   "missing when required" makes it impossible to silently blind-update.
 * - Stale version returns 412 (Precondition Failed) — distinct from a 409
 *   conflict. V0.1 used 409 `version_conflict` for the same case; the new
 *   contract migrates to the status the frontend accepts.
 *
 * Why a separate module from versionHelpers.js / idempotencyHelpers.js:
 * those existed before G0.2 and are referenced by controllers in a stable
 * shape. We add the missing "required when entity exists" + "mutation id"
 * pieces here so we don't disrupt their behavior mid-rollout.
 */

const { createHttpError } = require('./httpErrors');

const MUTATION_ID_HEADER = 'x-mutation-id';
const MAX_MUTATION_ID_LENGTH = 128;
const SAFE_MUTATION_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function sanitizeMutationId(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_MUTATION_ID_LENGTH) return null;
  if (!SAFE_MUTATION_ID_RE.test(trimmed)) return null;
  return trimmed;
}

/**
 * Read+validate `X-Mutation-Id`.
 *
 * For mutating operations we accept ANY of:
 *   - present and valid -> use it;
 *   - absent (not set) -> throw `mutation_id_required` (422). Idempotent
 *     retries must reuse the same value; the frontend owns the lifecycle
 *     so the absence of the header means a contract violation, not a
 *     "no mutation id, no retry" case.
 *
 * The G0.2 rollout starts with `required` true on all Planner mutations;
 * see PLANNER_V0_ERROR_TRANSPORT_CONTRACT.md §10 for the rollout rationale.
 */
function requireMutationId(req) {
  const sanitized = sanitizeMutationId(req?.headers?.[MUTATION_ID_HEADER]);
  if (!sanitized) {
    throw createHttpError(
      422,
      'X-Mutation-Id es obligatorio para mutaciones Planner.',
      'mutation_id_required',
    );
  }
  return sanitized;
}

/**
 * Best-effort read of `X-Mutation-Id` without enforcing. Reused by GET
 * (no-op logging) and by tests that want var only.
 */
function readMutationId(req) {
  return sanitizeMutationId(req?.headers?.[MUTATION_ID_HEADER]);
}

/**
 * Resolve the expected version for a mutation against an existing row.
 *
 * Requires `If-Match` (or `body.expected_version`) to be present; absence
 * is a 422 `expected_version_required`. Invalid integer format is 400
 * `invalid_expected_version` (kept from V0). Mismatch maps to 412
 * `version_conflict_v2`, distinct from the legacy 409 code the V0 contract
 * documented; we keep BOTH behaviors controlled by the rollout flag below.
 *
 * @returns {number} expected version integer.
 */
function parseRequiredExpectedVersion(req) {
  const ifMatch = req.headers?.['if-match']
  const bodyExpected = req.body && typeof req.body.expected_version === 'number' ? req.body.expected_version : undefined
  const providedFromHeader = typeof ifMatch === 'string' && ifMatch.trim() !== ''
  const providedFromBody = Number.isFinite(bodyExpected)

  if (!providedFromHeader && !providedFromBody) {
    throw createHttpError(
      422,
      'If-Match (o expected_version) es obligatorio para mutaciones sobre entidades existentes.',
      'expected_version_required',
    )
  }

  let parsed
  if (providedFromHeader) {
    const cleaned = ifMatch.replace(/^"|"$/g, '')
    parsed = Number.parseInt(cleaned, 10)
  } else {
    parsed = bodyExpected
  }
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw createHttpError(400, 'If-Match debe ser un entero >= 1.', 'invalid_expected_version')
  }
  return parsed
}

/**
 * Assert that the current row version matches the expected version.
 * Throws 412 `version_conflict_v2` (was 409 `version_conflict` in V0).
 */
function assertRequiredExpectedVersionMatches(currentVersion, expectedVersion) {
  if (Number(currentVersion) !== Number(expectedVersion)) {
    throw createHttpError(
      412,
      'La version de la entidad cambio. Actualiza y reintentá.',
      'version_conflict_v2',
      { current: Number(currentVersion), expected: Number(expectedVersion) },
    )
  }
}

module.exports = {
  MUTATION_ID_HEADER,
  requireMutationId,
  readMutationId,
  parseRequiredExpectedVersion,
  assertRequiredExpectedVersionMatches,
  sanitizeMutationId,
};
