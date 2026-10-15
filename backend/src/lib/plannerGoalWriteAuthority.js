'use strict';

/**
 * Plan write authority — the single frontier between the Plan API services and
 * `planner_goals` writes.
 *
 * Authority: PLANS_TECHNICAL_TRUTH_V1 §2.2 (Personal/Hogar ownership), §6
 * (trash), §15 (writes go through RPCs; the actor is derived from `auth.uid()`,
 * never from a client-supplied person/member id), §22 (versioning + the proven
 * `planner_idempotency_keys` pair, which stays at the controller boundary).
 *
 * Every Plan write in this slice is one of:
 *   create_goal_rpc / update_goal_rpc / transition_goal_rpc / trash_goal_rpc /
 *   restore_goal_rpc
 *
 * None of them is reachable by `anon`, none of them accepts a caller-supplied
 * actor identity, and `authenticated` no longer holds INSERT/UPDATE on the
 * Plan root, so a direct table write is impossible by construction.
 *
 * This module owns three things and nothing else:
 *   1. the read scope that keeps Personal Plans visible after they lose their
 *      household id (RLS remains the authority for who may actually see a row);
 *   2. the RPC error → HTTP mapping shared by the Plan and legacy Goals
 *      services;
 *   3. the translation between the frontend transition vocabulary and the
 *      canonical lifecycle verbs of the writer.
 */

const { createHttpError } = require('./httpErrors');

/**
 * Read scope for a Planner household context.
 *
 * A Hogar Plan belongs to the context household. A Personal Plan has no
 * household at all, so it is addressed by `visibility`; RLS then narrows it to
 * the owner. `onlyMine` additionally pins Personal rows to this person, because
 * `created_by_member_id` is deliberately NULL on a Personal Plan.
 *
 * Exactly one `or` filter is emitted per query on purpose: PostgREST resolves
 * repeated `or` parameters ambiguously.
 *
 * @param {object} context planner context ({ householdId, personId, membershipId })
 * @param {{ onlyMine?: boolean }} [options]
 * @returns {string} PostgREST `or` expression
 */
const planReadScopeClause = (context, { onlyMine = false } = {}) => {
  if (onlyMine) {
    return `created_by_member_id.eq.${context.membershipId},and(visibility.eq.personal,owner_person_id.eq.${context.personId})`;
  }
  return `household_id.eq.${context.householdId},visibility.eq.personal`;
};

/**
 * Apply the Plan read scope to a Supabase query builder.
 *
 * @template T
 * @param {T} request query builder
 * @param {object} context planner context
 * @param {{ onlyMine?: boolean }} [options]
 * @returns {T} the same builder
 */
const applyPlanReadScope = (request, context, options) =>
  request.or(planReadScopeClause(context, options));

/**
 * Translate a SQLSTATE raised by a Plan writer into the canonical HTTP result.
 *
 * 42501 forbidden · 40007 optimistic-concurrency conflict · 22023 invalid input.
 * `messages.forbidden` lets each service keep its own user-facing wording.
 *
 * @param {unknown} error Supabase/PostgREST error
 * @param {{ forbidden: string, versionConflict: string }} messages
 */
const debugWriter = (rpcName, payload) => {
  if (process.env.PLANNER_WRITER_DEBUG !== '1') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    fs.appendFileSync(
      path.join(os.tmpdir(), 'planner-writer-debug.log'),
      `${new Date().toISOString()} ${rpcName} ${JSON.stringify(payload)}\n`,
    );
  } catch { /* diagnostics must never break a request */ }
};

const throwPlanWriterError = (error, messages, rpcName = 'unknown') => {
  const code = error?.code;
  debugWriter(rpcName, { code, message: error?.message, details: error?.details, hint: error?.hint });

  if (code === '42501') {
    throw createHttpError(403, messages.forbidden, 'planner_forbidden');
  }
  if (code === '40007') {
    // 412 (RFC 6585 precondition-failed) is the canonical status for a failed
    // If-Match expectation across every Planner domain; the code stays
    // `version_conflict` so the frontend never maps it to a generic validation
    // error.
    throw createHttpError(412, messages.versionConflict, 'version_conflict');
  }
  if (code === '22023') {
    throw createHttpError(400, error.message ?? 'Datos invalidos.', 'validation_error');
  }

  const isRlsViolation =
    code === 'PGRST301' ||
    (typeof error?.message === 'string' && error.message.toLowerCase().includes('row-level security'));
  // Undefined column / function: never leak a 500 as an opaque error; the
  // caller (and the nightly audit) needs the real PostgREST diagnosis.
  if (code === '42703' || code === '42883' || code === '42P01') {
    const dbError = createHttpError(500, 'El servidor no encontró una columna o función requerida.', 'planner_schema_mismatch');
    dbError.internalCode = code;
    dbError.details = error?.details ?? null;
    throw dbError;
  }
  if (isRlsViolation) {
    throw createHttpError(403, messages.forbidden, 'planner_forbidden');
  }

  const httpError = createHttpError(500, error?.message, error?.code ?? 'internal_error');
  httpError.details = error?.details;
  httpError.hint = error?.hint;
  throw httpError;
};

/**
 * Call a Plan writer and return the raw `jsonb` result.
 *
 * @param {object} context planner context
 * @param {string} rpcName writer name
 * @param {Record<string, unknown>} params writer arguments
 * @param {{ forbidden: string, versionConflict: string }} messages
 */
const callPlanWriter = async (context, rpcName, params, messages) => {
  const { data, error } = await context.client.rpc(rpcName, params);

  if (error) {
    throwPlanWriterError(error, messages, rpcName);
  }

  return data;
};

/**
 * Unwrap a Plan writer result.
 *
 * Writers answer `{ success: true, goal: {...} }` on success and
 * `{ success: false, error: '<code>' }` for a deterministic business outcome
 * (not found, invalid transition). Forbidden and version conflicts are raised as
 * SQLSTATEs instead, so they never reach this function.
 *
 * @param {any} result raw writer result
 * @param {object} options
 * @param {Record<string, { status: number, message: string, code: string }>} options.errors
 * @param {string} [options.errorProperty] property holding the `success` flag
 */
const unwrapPlanWriterResult = (result, { errors, errorProperty = 'error' }) => {
  if (result && result.success === true) {
    return result.goal;
  }

  const failure = result?.[errorProperty] ?? 'goal_not_found';
  const mapped = errors[failure] ?? errors.goal_not_found;

  throw createHttpError(mapped.status, mapped.message, mapped.code);
};

/**
 * Canonical lifecycle verbs accepted by `transition_goal_rpc`.
 *
 * The frontend vocabulary is kept at the edge: `active` means "activate" from
 * Preparation, and resuming a paused Plan is `resume`. Both resolve to the same
 * target state, which is why `paused -> active` is expressed as `resume`.
 */
const PLAN_WRITER_TRANSITIONS = Object.freeze({
  active: 'activate',
  paused: 'pause',
  resume: 'resume',
  completed: 'complete',
  cancelled: 'cancel',
  reopen: 'reopen',
  archive: 'archive',
  unarchive: 'unarchive',
});

/**
 * Map a frontend transition name onto the writer verb, resolving the one
 * ambiguous case (`active` on a paused Plan means resume).
 *
 * @param {string} transition frontend transition name
 * @param {string} currentLifecycle lifecycle of the Plan being transitioned
 * @returns {string} writer verb
 */
const resolvePlanWriterTransition = (transition, currentLifecycle) => {
  const verb = PLAN_WRITER_TRANSITIONS[transition];
  if (!verb) {
    return null;
  }
  if (transition === 'active' && currentLifecycle === 'paused') {
    return 'resume';
  }
  return verb;
};

module.exports = {
  PLAN_WRITER_TRANSITIONS,
  applyPlanReadScope,
  callPlanWriter,
  planReadScopeClause,
  resolvePlanWriterTransition,
  throwPlanWriterError,
  unwrapPlanWriterResult,
};
