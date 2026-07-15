/**
 * Planner V1 — M1 Mutation Intent & Transport Contracts.
 *
 * Purpose:
 * - Single authority for Planner mutation intent identity (`MutationIntent`).
 * - Typed transport options that map to HomePlus Core `requestJson` options.
 * - Guarantee stable mutation IDs across retries of the same user intent.
 * - Guarantee idempotency keys for create, If-Match for versioned mutations.
 * - Adapter over Core (`api.ts`) — NOT a parallel HTTP client.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` §M1):
 * - `mutationId` is stable per user intent. A retry reuses the same ID.
 * - `idempotencyKey` is stable per create intent. Regenerated only for
 *   a genuinely new intent.
 * - Double-tap while pending does NOT create a second intent.
 * - Transport abort does NOT auto-convert retry into a new intent.
 * - Conflict 412 is NOT resolved with last-write-wins.
 * - Mutation IDs are NOT exposed in UI.
 * - Mutation IDs are NOT persisted indefinitely.
 * - Mutation IDs are NOT reused across different entities.
 *
 * Out of scope for M1:
 * - Sheet host submit lock (M3).
 * - Optimistic patch/reconcile/rollback UI (M2/M4/M5).
 * - Post-create redirect (M5).
 */

import {
  generateMutationId,
  createIdempotencyKey,
  OPERATION_KINDS,
  type RequestJsonOptions,
} from '../api';

// ---------------------------------------------------------------------------
// 1. Mutation intent identity (contract; runtime locking → M3)
// ---------------------------------------------------------------------------

/**
 * A single, stable mutation intent tied to one user gesture or action.
 * `mutationId` and `idempotencyKey` (when applicable) are generated once
 * per intent and reused across retries until success, conflict or
 * explicit discard.
 *
 * `operationKind` drives the transport header contract:
 * - `CREATE_IDEMPOTENT` → `Idempotency-Key` required, `If-Match` absent.
 * - `VERSIONED_MUTATION` → `Idempotency-Key` + `If-Match` required.
 * - `NON_VERSIONED_MUTATION` → `Mutation-Id` required, others optional.
 */
export type PlannerMutationIntent = {
  /** Stable across retries. Generated once per user action. */
  readonly mutationId: string;
  /** Stable across retries for CREATE_IDEMPOTENT operations. */
  readonly idempotencyKey?: string;
  /** Entity version for optimistic concurrency (If-Match header). */
  readonly ifMatch?: string | number;
  /** What transport header policy Core should apply. */
  readonly operationKind: typeof OPERATION_KINDS.CREATE_IDEMPOTENT
    | typeof OPERATION_KINDS.VERSIONED_MUTATION
    | typeof OPERATION_KINDS.NON_VERSIONED_MUTATION;
};

/**
 * Create a fresh `PlannerMutationIntent` for a create operation.
 * The generated IDs are stable for this intent until success or discard.
 */
export function createPlannerMutationIntent(params: {
  kind: 'create';
  entityKind: string;
}): PlannerMutationIntent {
  return {
    mutationId: generateMutationId(),
    idempotencyKey: createIdempotencyKey(params.entityKind),
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
  };
}

/**
 * Create a fresh `PlannerMutationIntent` for a versioned mutation (update,
 * complete, cancel, trash, restore).
 */
export function createPlannerVersionedMutationIntent(params: {
  kind: 'versioned';
  entityKind: string;
  entityVersion: number | string;
}): PlannerMutationIntent {
  return {
    mutationId: generateMutationId(),
    idempotencyKey: createIdempotencyKey(params.entityKind),
    ifMatch: String(params.entityVersion),
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
  };
}

/**
 * Clone an existing intent for a retry (preserves mutationId and
 * idempotencyKey — the server deduplicates).
 */
export function clonePlannerMutationIntent(original: PlannerMutationIntent): PlannerMutationIntent {
  return { ...original };
}

/**
 * Returns `mutationId` and `idempotencyKey` from the intent only when
 * they are still valid (the intent hasn't been discarded).
 */
export function activeMutationIntent(intent: PlannerMutationIntent | null): Omit<PlannerMutationIntent, 'operationKind'> | null {
  return intent ? { mutationId: intent.mutationId, idempotencyKey: intent.idempotencyKey, ifMatch: intent.ifMatch } : null;
}

// ---------------------------------------------------------------------------
// 2. Planner transport options (mapping to Core `requestJson`)
// ---------------------------------------------------------------------------

/**
 * Canonical Planner transport options that every Planner read/write
 * service adapter SHOULD accept instead of raw `{ accessToken, signal }`.
 *
 * Maps directly to `RequestJsonOptions` from `api.ts`. Planner-specific
 * wrappers consume this and delegate to Core.
 */
export type PlannerTransportOptions = {
  /** Supabase bearer token. */
  accessToken: string;
  /** Stable intent identity across retries. */
  intent?: PlannerMutationIntent | null;
  /** External AbortSignal (household switch, unmount, timeout). */
  signal?: AbortSignal | null;
  /** Timeout in milliseconds. */
  timeoutMs?: number;
};

/**
 * Convert Planner transport options into Core `RequestJsonOptions`.
 * Never duplicates Core header logic; only bridges Planner policy to Core.
 */
export function toRequestJsonOptions(options: PlannerTransportOptions): RequestJsonOptions {
  const coreOpts: RequestJsonOptions = {
    accessToken: options.accessToken,
    timeoutMs: options.timeoutMs,
    signal: options.signal,
  };

  if (options.intent) {
    coreOpts.mutationId = options.intent.mutationId;
    coreOpts.operationKind = options.intent.operationKind;
    if (options.intent.idempotencyKey) coreOpts.idempotencyKey = options.intent.idempotencyKey;
    if (options.intent.ifMatch !== undefined) {
      coreOpts.expectedVersion = typeof options.intent.ifMatch === 'string'
        ? parseInt(options.intent.ifMatch, 10)
        : options.intent.ifMatch;
    }
  }

  return coreOpts;
}

/**
 * Minimal read-only transport helper. No mutation headers are added.
 */
export function toPlannerReadOptions(options: {
  accessToken: string;
  signal?: AbortSignal | null;
  timeoutMs?: number;
}): RequestJsonOptions {
  return {
    accessToken: options.accessToken,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    operationKind: OPERATION_KINDS.READ_ONLY,
  };
}

// ---------------------------------------------------------------------------
// 3. Safe access token + timeout only (moved abort detection to plannerErrorAdapter)
// ---------------------------------------------------------------------------