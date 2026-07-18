/**
 * Planner V1 — M10 Deep Link Canonical Intent Model.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M10):
 * - Single typed authority for Planner deep-link intents derived from URLs
 *   or notification payloads.
 * - No entity objects, no householdId as authority, no tokens, no PII.
 * - Pure types and helpers — no React, no side effects.
 *
 * Binding rules:
 * - `kind` discriminates union; each variant carries minial metadata only.
 * - `entityId` is a validated UUID string only.
 * - `source` is normalized to the closed `PlannerNavigationSource` enum.
 * - `initialTab` only for `planner_root`.
 * - No Search queries, no display names, no callbacks.
 */

import {
  isValidPlannerEntityId,
  isPlannerTabKey,
  normalizePlannerNavigationSource,
  type PlannerTabKey,
  type PlannerNavigationSource,
} from '../../navigation/plannerNavigationContract';

// ---------------------------------------------------------------------------
// 1. Canonical deep-link intent union
// ---------------------------------------------------------------------------

export type { PlannerNavigationSource };

export type PlannerDeepLinkIntent =
  | {
      kind: 'planner_root';
      initialTab?: PlannerTabKey;
      source: PlannerNavigationSource;
    }
  | {
      kind: 'task_detail';
      entityId: string;
      source: PlannerNavigationSource;
    }
  | {
      kind: 'event_detail';
      entityId: string;
      source: PlannerNavigationSource;
    }
  | {
      kind: 'goal_detail';
      entityId: string;
      source: PlannerNavigationSource;
    }
  | {
      kind: 'planner_search';
      source: PlannerNavigationSource;
    };

// ---------------------------------------------------------------------------
// 2. Deep-link consumption state machine
// ---------------------------------------------------------------------------

/**
 * Lifecycle states for a single PlannerDeepLinkIntent.
 *
 *     received → waiting → resolving → consumed
 *                            ↘ discarded
 *
 * - `received`: URL received, parsed into an intent; not yet enqueued for resolution.
 * - `waiting`: intent enqueued, waiting for readiness gates (auth, household, navigation).
 * - `resolving`: intent actively being resolved and navigating.
 * - `consumed`: intent successfully navigated to destination.
 * - `discarded`: intent rejected (invalid, timeout, session change, generation change).
 *
 * One-shot: after consumed or discarded, the intent is removed and never re-executes.
 */
export type DeepLinkIntentState =
  | 'received'
  | 'waiting'
  | 'resolving'
  | 'consumed'
  | 'discarded';

// ---------------------------------------------------------------------------
// 3. Resolution context snapshot
// ---------------------------------------------------------------------------

/**
 * Context captured when the coordinator begins consuming an intent.
 * Used to invalidate the intent if account/household/generation changes.
 */
export type DeepLinkResolutionContext = {
  /** Account identity (auth_user_id) at the time enqueuing began. */
  accountIdentityId: string;
  /** Active household ID at the time enqueuing began. */
  householdId: string;
  /** Monotonic generation counter at resolution time. */
  generation: number;
};

// ---------------------------------------------------------------------------
// 4. Deep-link fingerprint (deduplication)
// ---------------------------------------------------------------------------

/**
 * Non-sensitive fingerprint for deduplicating same-intent URLs within a
 * short window. Does NOT contain entity payload, title, query, household, token.
 */
export type DeepLinkFingerprint = {
  /** The intent kind, e.g. 'task_detail'. */
  kind: PlannerDeepLinkIntent['kind'];
  /** Entity ID when applicable (task/event/goal); null for root/search. */
  entityId: string | null;
  /** Normalized source (deep_link or notification typically). */
  source: PlannerNavigationSource;
};

// ---------------------------------------------------------------------------
// 5. Resolution result (typed outcome)
// ---------------------------------------------------------------------------

export type DeepLinkResolutionResult =
  | { outcome: 'navigated'; intent: PlannerDeepLinkIntent }
  | { outcome: 'rejected'; reason: DeepLinkRejectionReason; intent?: PlannerDeepLinkIntent }
  | { outcome: 'deferred'; intent: PlannerDeepLinkIntent }
  | { outcome: 'duplicate'; fingerprint: DeepLinkFingerprint };

export type DeepLinkRejectionReason =
  | 'invalid_url'
  | 'unsupported_route'
  | 'invalid_entity_id'
  | 'auth_required'
  | 'household_unresolved'
  | 'forbidden'
  | 'not_found'
  | 'feature_disabled'
  | 'navigation_unavailable'
  | 'timeout'
  | 'abort'
  | 'generation_changed'
  | 'account_changed'
  | 'session_cleared'
  | 'unknown';

// ---------------------------------------------------------------------------
// 6. Pure factory helpers
// ---------------------------------------------------------------------------

/**
 * Creates a PlannerDeepLinkIntent from verified individual fields.
 * Never constructs from raw URL string — parsing is done by a separate denier.
 */
export function createPlannerRootIntent(
  source: PlannerNavigationSource,
  initialTab?: PlannerTabKey,
): PlannerDeepLinkIntent {
  return { kind: 'planner_root', source, ...(initialTab ? { initialTab } : {}) };
}

export function createTaskDetailIntent(
  entityId: string,
  source: PlannerNavigationSource,
): PlannerDeepLinkIntent {
  return { kind: 'task_detail', entityId, source };
}

export function createEventDetailIntent(
  entityId: string,
  source: PlannerNavigationSource,
): PlannerDeepLinkIntent {
  return { kind: 'event_detail', entityId, source };
}

export function createGoalDetailIntent(
  entityId: string,
  source: PlannerNavigationSource,
): PlannerDeepLinkIntent {
  return { kind: 'goal_detail', entityId, source };
}

export function createPlannerSearchIntent(
  source: PlannerNavigationSource,
): PlannerDeepLinkIntent {
  return { kind: 'planner_search', source };
}

// ---------------------------------------------------------------------------
// 7. Intent classification helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Returns whether the intent targets a specific entity detail screen.
 */
export function isEntityDetailIntent(
  intent: PlannerDeepLinkIntent,
): intent is PlannerDeepLinkIntent & { kind: 'task_detail' | 'event_detail' | 'goal_detail' } {
  return intent.kind === 'task_detail' || intent.kind === 'event_detail' || intent.kind === 'goal_detail';
}

/**
 * Extracts the entityId from a detail intent (safe — only for detail kinds).
 */
export function extractDetailEntityId(intent: PlannerDeepLinkIntent): string | null {
  if (intent.kind === 'task_detail' || intent.kind === 'event_detail' || intent.kind === 'goal_detail') {
    return intent.entityId;
  }
  return null;
}

/**
 * Maps intent kind to entity kind for navigation purposes.
 */
export function intentToEntityKind(
  intent: PlannerDeepLinkIntent,
): 'task' | 'event' | 'goal' | null {
  switch (intent.kind) {
    case 'task_detail': return 'task';
    case 'event_detail': return 'event';
    case 'goal_detail': return 'goal';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// 8. Fingerprint factory (non-sensitive deduplication)
// ---------------------------------------------------------------------------

/**
 * Creates a non-sensitive fingerprint from a PlannerDeepLinkIntent.
 * Used only for runtime duplication detection within a bounded window.
 * Never includes entity content, titles, query, household, token, PII.
 */
export function createDeepLinkFingerprint(intent: PlannerDeepLinkIntent): DeepLinkFingerprint {
  const entityId = extractDetailEntityId(intent);
  return {
    kind: intent.kind,
    entityId,
    source: intent.source,
  };
}

/**
 * Compares two fingerprints for equality.
 */
export function isSameDeepLinkFingerprint(a: DeepLinkFingerprint, b: DeepLinkFingerprint): boolean {
  return a.kind === b.kind && a.entityId === b.entityId && a.source === b.source;
}

// ---------------------------------------------------------------------------
// 9. Intent serialization (only when physically needed to pass between layers)
// ---------------------------------------------------------------------------

export type SerializableDeepLinkIntent = {
  kind: PlannerDeepLinkIntent['kind'];
  entityId?: string;
  initialTab?: string;
  source: string;
};

/**
 * Converts a PlannerDeepLinkIntent into a plain serializable object.
 * EntityId and initialTab are optional (only for detail/root kinds).
 * Never includes PII, payload, or household data.
 */
export function serializeDeepLinkIntent(intent: PlannerDeepLinkIntent): SerializableDeepLinkIntent {
  const serialized: SerializableDeepLinkIntent = { kind: intent.kind, source: intent.source };
  if (isEntityDetailIntent(intent)) {
    serialized.entityId = intent.entityId;
  }
  if (intent.kind === 'planner_root' && intent.initialTab) {
    serialized.initialTab = intent.initialTab;
  }
  return serialized;
}

// ---------------------------------------------------------------------------
// 10. Error helpers
// ---------------------------------------------------------------------------

/**
 * Returns a user-safe rejection message. Never exposes raw URL, entity ID,
 * household ID, or internal state.
 */
export function rejectionReasonMessage(reason: DeepLinkRejectionReason): string {
  switch (reason) {
    case 'invalid_url':
    case 'invalid_entity_id':
    case 'unsupported_route':
      return 'El enlace no es valido.';
    case 'auth_required':
      return 'Inicia sesion para acceder a Planner.';
    case 'household_unresolved':
      return 'Configura tu hogar antes de usar Planner.';
    case 'forbidden':
      return 'No tenes permiso para ver este contenido.';
    case 'not_found':
      return 'El elemento ya no esta disponible.';
    case 'feature_disabled':
      return 'La busqueda no esta disponible en este momento.';
    case 'navigation_unavailable':
    case 'timeout':
    case 'abort':
      return 'No se pudo abrir el destino en este momento.';
    case 'generation_changed':
    case 'account_changed':
    case 'session_cleared':
      return 'El enlace se descarto por un cambio de contexto.';
    case 'unknown':
    default:
      return 'No se pudo procesar el enlace.';
  }
}

/**
 * Ensures a PlannerDeepLinkIntent is in its most canonical form:
 * - `source` normalized.
 * - No extraneous fields.
 * - `initialTab` valid or dropped.
 */
export function normalizePlannerDeepLinkIntent(
  intent: PlannerDeepLinkIntent,
): PlannerDeepLinkIntent {
  const source = normalizePlannerNavigationSource(intent.source);

  switch (intent.kind) {
    case 'planner_root': {
      const tab = intent.initialTab && isPlannerTabKey(intent.initialTab)
        ? intent.initialTab
        : undefined;
      return { kind: 'planner_root', source, ...(tab ? { initialTab: tab } : {}) };
    }
    case 'task_detail':
      return { kind: 'task_detail', entityId: intent.entityId, source };
    case 'event_detail':
      return { kind: 'event_detail', entityId: intent.entityId, source };
    case 'goal_detail':
      return { kind: 'goal_detail', entityId: intent.entityId, source };
    case 'planner_search':
      return { kind: 'planner_search', source };
  }
}