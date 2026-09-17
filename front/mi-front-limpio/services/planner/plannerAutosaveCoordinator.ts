/**
 * Planner V1 — M11 Presets/Drafts Frontend — Autosave lifecycle coordinator.
 *
 * Lane-owned. A PURE state machine that drives the Drafts autosave surface,
 * built on top of the integrated mutation-identity foundation
 * (`plannerMutationIntent`) and the canonical `PlannerMutationOutcome`
 * (`created | updated | noop | replay`). It emits ONLY the autosave UI states
 * the M11 directive requires:
 *
 *   dirty → autosaving → saved / safe_error / uncertain / conflict
 *
 * It deliberately does NOT implement:
 *   - durable offline storage / persistent retry queue (Reliability's lane),
 *   - a parallel mutation identity (reuses `PlannerMutationIntent`),
 *   - debouncing strategy (handled by the consumer — this reducer just reacts
 *     to events the consumer fires after its debounced autosave attempt).
 *
 * A retry of an UNCERTAIN intent MUST reuse the same `mutationId`
 * and `idempotencyKey` (no new intent). The coordinator refuses to issue a
 * second intent for the same autosave in-flight/uncertain window.
 *
 * Response ordering is respected: in-flight intent N must complete before
 * accepting intent N+1 as the live one; late responses for N are silently
 * dropped when N+1 is already live.
 */
import {
  createPlannerMutationIntent,
  createPlannerVersionedMutationIntent,
  type PlannerMutationIntent,
} from './plannerMutationIntent';
import type { PlannerSafeErrorBehavior } from './plannerErrorAdapter';

export type PlannerAutosaveStatus =
  | 'idle'
  | 'dirty'
  | 'autosaving'
  | 'saved'
  | 'safe_error'
  | 'uncertain'
  | 'conflict';

export type PlannerAutosaveState = {
  readonly status: PlannerAutosaveStatus;
  readonly identity: PlannerMutationIntent | null;
  readonly lastSavedAt: number | null;
  readonly lastError: PlannerSafeErrorBehavior | null;
  /** Sequence number of the currently live autosave intent. */
  readonly liveSeq: number;
  /** True when content has been edited since last confirmed autosave. */
  readonly dirty: boolean;
  /** True while a request is in flight for the live intent. */
  readonly inFlight: boolean;
};

export type PlannerAutosaveEvent =
  | { readonly type: 'EDIT'; readonly seq: number }
  | { readonly type: 'FLUSH'; readonly seq: number }
  | { readonly type: 'SUCCESS'; readonly seq: number; readonly outcome: 'created' | 'updated' | 'noop' | 'replay' }
  | { readonly type: 'ERROR'; readonly seq: number; readonly error: PlannerSafeErrorBehavior }
  | { readonly type: 'RETRY'; readonly seq: number }
  | { readonly type: 'LOCAL_ONLY' };

export function createPlannerAutosaveState(): PlannerAutosaveState {
  return {
    status: 'idle',
    identity: null,
    lastSavedAt: null,
    lastError: null,
    liveSeq: 0,
    dirty: false,
    inFlight: false,
  };
}

/**
 * Reduce an autosave event to a new state. Pure. Never mutates the input.
 *
 * Identity policy:
 * - `FLUSH` creates a fresh intent only when no intent is in-flight for the
 *   same `seq`. A retry (`RETRY`) keeps the SAME identity — this is the
 *   directive's "retry of an uncertain intent MUST reuse the same identity".
 */
export function reducePlannerAutosaveState(
  state: PlannerAutosaveState,
  event: PlannerAutosaveEvent,
  entityKind: string = 'planner.draft',
): PlannerAutosaveState {
  switch (event.type) {
    case 'EDIT':
      return edit(state, event.seq);

    case 'FLUSH':
      return flush(state, event.seq, entityKind);

    case 'SUCCESS':
      return success(state, event.seq, event.outcome);

    case 'ERROR':
      return error(state, event.seq, event.error);

    case 'RETRY':
      return retry(state, event.seq);

    case 'LOCAL_ONLY':
      return { ...state, dirty: true, status: state.inFlight ? state.status : 'dirty' };

    default:
      return state;
  }
}

function edit(state: PlannerAutosaveState, seq: number): PlannerAutosaveState {
  return {
    ...state,
    status: 'dirty',
    dirty: true,
    liveSeq: Math.max(state.liveSeq, seq),
    lastError: null,
  };
}

function flush(state: PlannerAutosaveState, seq: number, entityKind: string): PlannerAutosaveState {
  if (seq < state.liveSeq) {
    // Late flush for an already-superseded edit. Drop it.
    return state;
  }
  if (state.inFlight && seq === state.liveSeq) {
    // Already autosaving this exact content; don't create a new intent.
    return state;
  }
  // Slightly newer edit: bump the live intent. Generate a fresh identity.
  const identity = createPlannerMutationIntent({ kind: 'create', entityKind });
  return {
    ...state,
    status: 'autosaving',
    identity,
    liveSeq: seq,
    inFlight: true,
    dirty: true,
    lastError: null,
  };
}

function success(
  state: PlannerAutosaveState,
  seq: number,
  outcome: 'created' | 'updated' | 'noop' | 'replay',
): PlannerAutosaveState {
  if (seq !== state.liveSeq) {
    // Late response for an already-superseded autosave. Drop silently.
    return state;
  }
  // For `created` outcome, the next versioned update must reuse the version
  // the server assigned. For `updated` / `noop` / `replay` we keep the same
  // identity if the consumer retries the SAME content. The autosave layer does
  // not choose If-Match; the drafts service derives it from the persisted
  // draft (via the recovery read). Here we just clear the conflict-free path.
  void outcome;
  return {
    ...state,
    status: 'saved',
    inFlight: false,
    dirty: false,
    lastSavedAt: Date.now(),
    lastError: null,
  };
}

function error(
  state: PlannerAutosaveState,
  seq: number,
  error: PlannerSafeErrorBehavior,
): PlannerAutosaveState {
  if (seq !== state.liveSeq) {
    return state;
  }
  let status: PlannerAutosaveStatus;
  if (error.category === 'version_conflict' || error.category === 'idempotency_conflict') {
    status = 'conflict';
  } else if (
    error.category === 'uncertain_network_outcome'
    || error.category === 'offline'
    || error.category === 'in_flight'
  ) {
    status = 'uncertain';
  } else {
    status = 'safe_error';
  }
  return {
    ...state,
    status,
    inFlight: false,
    dirty: true, // content preserved; user can retry or keep editing
    lastError: error,
  };
}

function retry(state: PlannerAutosaveState, seq: number): PlannerAutosaveState {
  if (state.status !== 'safe_error' && state.status !== 'uncertain') {
    return state;
  }
  if (!state.identity) {
    return state;
  }
  // Reuse the SAME identity (mutationId + idempotencyKey). Do NOT generate a
  // new identity for a retry of an uncertain intent.
  return {
    ...state,
    status: 'autosaving',
    inFlight: true,
    liveSeq: seq,
    dirty: true,
    lastError: null,
  };
}

/**
 * Helper for callers that want a fresh identity for a NEW autosave session
 * (e.g. recovering a draft from server with an unknown version). NOT used for
 * retries — those reuse the existing identity.
 */
export function freshAutosaveIdentity(entityKind: string): PlannerMutationIntent {
  return createPlannerMutationIntent({ kind: 'create', entityKind });
}

/**
 * Helper for callers that want a versioned identity for an autosave of an
 * existing persisted draft (they know its server-assigned version).
 */
export function versionedAutosaveIdentity(
  entityKind: string,
  expectedVersion: number,
): PlannerMutationIntent {
  return createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind,
    entityVersion: expectedVersion,
  });
}
