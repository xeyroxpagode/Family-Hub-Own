/**
 * Planner V1 — M1 canonical navigation contract (single authority).
 *
 * This module is the single typed authority for Planner route names, route
 * params, tab keys, navigation sources, return destinations and serializable
 * param guards used by M1–M13. It contains NO UI components and NO React
 * imports so it can be unit-tested without rendering the app.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` §M1):
 * - Detail routes transport entity IDs only, never full Task/Event/Plan rows.
 * - Detail params are serializable primitives (string, boolean).
 * - `source` uses closed enum; unknown values normalize to `'unknown'`.
 * - `returnTo` uses closed enum; unknown values are rejected (typed guard).
 * - Invalid UUIDs are rejected before any request.
 * - `justCreated` is boolean and ephemeral.
 * Legacy routes (`PlannerHome`, `CreateTask`, etc.) are deliberately retained
 * as compatibility aliases and routed through LEGACY_ROUTE_NAMES; new code
 * MUST consume ROUTE_NAMES instead of string literals.
 *
 * Ownership:
 * - HomePlus navigation types (`navigation/types.ts`) re-export the canonical
 *   types and adapt `PlannerStackParamList` to consume them.
 * - Navigation helpers consume this contract only — they never read screen
 *   state or full entities.
 *
 * Out of scope for M1:
 * - Runtime cold-start deep link resolution (M10).
 * - Visual surfaces (M2/M3).
 * - Search productive screen (M7).
 */

// ---------------------------------------------------------------------------
// 1. Canonical tab keys
// ---------------------------------------------------------------------------

/**
 * Canonical Planner tab keys. Single authority.
 * Visible perspectives are exactly Tareas, Eventos and Planes. Legacy
 * `calendar`/`goals` inputs are accepted only at boundaries and normalized.
 */
export type PlannerTabKey = 'tasks' | 'events' | 'plans';
export type LegacyPlannerTabKey = 'calendar' | 'goals';
export type PlannerTabInputKey = PlannerTabKey | LegacyPlannerTabKey;

export const PLANNER_TAB_KEYS: readonly PlannerTabKey[] = ['tasks', 'events', 'plans'] as const;
export const LEGACY_PLANNER_TAB_KEYS: readonly LegacyPlannerTabKey[] = ['calendar', 'goals'] as const;

export function isPlannerTabKey(value: unknown): value is PlannerTabKey {
  return value === 'tasks' || value === 'events' || value === 'plans';
}

export function normalizePlannerTabKey(value: unknown): PlannerTabKey | null {
  if (isPlannerTabKey(value)) return value;
  if (value === 'calendar') return 'events';
  if (value === 'goals') return 'plans';
  return null;
}

// ---------------------------------------------------------------------------
// 2. Canonical navigation source
// ---------------------------------------------------------------------------

export type PlannerNavigationSource =
  | 'planner'
  | 'home'
  | 'quick_action'
  | 'deep_link'
  | 'notification'
  | 'unknown';

const SOURCE_VALUES: readonly PlannerNavigationSource[] = [
  'planner',
  'home',
  'quick_action',
  'deep_link',
  'notification',
  'unknown',
] as const;

export function isPlannerNavigationSource(value: unknown): value is PlannerNavigationSource {
  return typeof value === 'string' && (SOURCE_VALUES as readonly string[]).includes(value);
}

export function normalizePlannerNavigationSource(value: unknown): PlannerNavigationSource {
  return isPlannerNavigationSource(value) ? value : 'unknown';
}

// ---------------------------------------------------------------------------
// 3. Canonical return target
// ---------------------------------------------------------------------------

export type PlannerReturnTarget = 'planner' | 'home' | 'previous';

const RETURN_TARGET_VALUES: readonly PlannerReturnTarget[] = [
  'planner',
  'home',
  'previous',
] as const;

export function isPlannerReturnTarget(value: unknown): value is PlannerReturnTarget {
  return typeof value === 'string' && (RETURN_TARGET_VALUES as readonly string[]).includes(value);
}

export function normalizePlannerReturnTarget(
  value: unknown,
  fallback: PlannerReturnTarget = 'previous',
): PlannerReturnTarget {
  return isPlannerReturnTarget(value) ? value : fallback;
}

// ---------------------------------------------------------------------------
// 4. UUID validation (v1–v5; we only accept canonical UUID strings)
// ---------------------------------------------------------------------------

/**
 * Accepts canonical UUID strings (any version) with optional surrounding
 * braces (`{...}`) per RFC 4122. Rejects truncations, non-hex digits, any
 * non-string value and entity rows/payloads.
 */
const UUID_PATTERN = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\}?$/;

export function isValidPlannerEntityId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Throws a plain Error (not an ApiError) when validation fails. Callers must
 * treat this as a pre-flight guard and never as a server-side envelope.
 */
export function assertValidPlannerEntityId(value: unknown, label: string): asserts value is string {
  if (!isValidPlannerEntityId(value)) {
    throw new Error(`Invalid ${label}: expected UUID string, got ${typeof value}`);
  }
}

// ---------------------------------------------------------------------------
// 5. Route names — single authority
// ---------------------------------------------------------------------------

export const ROUTE_NAMES = {
  Planner: 'Planner',
  TaskDetail: 'TaskDetail',
  EventDetail: 'EventDetail',
  PlanDetail: 'GoalDetail',
  PlannerSearch: 'PlannerSearch',
  TaskCreate: 'CreateTask',
  TaskEdit: 'EditTask',
  EventCreate: 'CreateEvent',
  EventEdit: 'EditEvent',
  PlanCreate: 'CreateGoal',
  PlanStructureEdit: 'EditGoal',
  PresetLibrary: 'PlannerPresetLibrary',
  Trash: 'PlannerTrash',
  PlanArchive: 'PlannerPlanArchive',
  ConflictReview: 'PlannerConflictReview',
} as const;

export type PlannerRouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];

export const PLANNER_ROUTE_NAMES: readonly PlannerRouteName[] = [
  ROUTE_NAMES.Planner,
  ROUTE_NAMES.TaskDetail,
  ROUTE_NAMES.EventDetail,
  ROUTE_NAMES.PlanDetail,
  ROUTE_NAMES.PlannerSearch,
  ROUTE_NAMES.TaskCreate,
  ROUTE_NAMES.TaskEdit,
  ROUTE_NAMES.EventCreate,
  ROUTE_NAMES.EventEdit,
  ROUTE_NAMES.PlanCreate,
  ROUTE_NAMES.PlanStructureEdit,
  ROUTE_NAMES.PresetLibrary,
  ROUTE_NAMES.Trash,
  ROUTE_NAMES.PlanArchive,
  ROUTE_NAMES.ConflictReview,
] as const;

export function isPlannerRouteName(value: unknown): value is PlannerRouteName {
  return typeof value === 'string' && (PLANNER_ROUTE_NAMES as readonly string[]).includes(value);
}

/**
 * Legacy physical route names preserved during M1 for compatibility.
 * New code MUST consume `ROUTE_NAMES` instead of these literals except where
 * a compatibility wrapper explicitly bridges to the existing screens.
 */
export const LEGACY_ROUTE_NAMES = {
  PlannerHome: 'PlannerHome',
  CreateTask: 'CreateTask',
  EditTask: 'EditTask',
  CreateEvent: 'CreateEvent',
  EditEvent: 'EditEvent',
  CreateGoal: 'CreateGoal',
  EditGoal: 'EditGoal',
  GoalDetail: 'GoalDetail',
  PlannerTrash: 'PlannerTrash',
} as const;

// ---------------------------------------------------------------------------
// 6. Canonical typed params
// ---------------------------------------------------------------------------

/** Serializable root entry params for the Planner shell route. */
export type PlannerRootParams = {
  /** Optional default tab to focus on entry. Legacy values normalize at parse/build time. */
  initialTab?: PlannerTabKey;
  /** Where the navigation originated. */
  source?: PlannerNavigationSource;
};

/** Serializable detail entry params for Task/Event/Plan detail routes. */
export type PlannerEntityDetailParams = {
  /** Required validated UUID of the target entity. */
  entityId: string;
  /** Where the navigation originated (defaults to `'unknown'`). */
  source?: PlannerNavigationSource;
  /** Where the user should land when leaving the detail screen. */
  returnTo?: PlannerReturnTarget;
  /**
   * Ephemeral boolean flag set by create flows to indicate the entity was just
   * created (e.g. for post-create one-shot UX in M5). NOT persisted across
   * navigations.
   */
  justCreated?: boolean;
};

/**
 * Serializable entry params for the (gated) Planner Search route.
 * Search productive screen is NOT implemented in M1.
 */
export type PlannerSearchParams = {
  source?: PlannerNavigationSource;
  returnTo?: PlannerReturnTarget;
};

// ---------------------------------------------------------------------------
// 7. Serialization & validation guards
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the candidate value is plain serializable route params.
 * Used to prevent full entity rows, callbacks, household data, tokens or any
 * non-serializable shape from being transported through navigation params.
 */
export function isSerializablePlannerRouteParam(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const t = typeof value;
  if (t === 'boolean') return true;
  if (t === 'string') return true;
  if (t === 'number' && Number.isFinite(value)) return true;
  if (t !== 'object') return false;
  // Explicitly reject built-in non-serializable objects
  if (value instanceof Date) return false;
  if (value instanceof Map) return false;
  if (value instanceof Set) return false;
  if (value instanceof RegExp) return false;
  if (typeof value === 'function') return false;
  if (Array.isArray(value)) return value.every(isSerializablePlannerRouteParam);
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!isSerializablePlannerRouteParam(record[key])) return false;
  }
  return true;
}

function dropUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

/** Parses & validates raw input as `PlannerRootParams`. Returns a clean, serializable object. */
export function parsePlannerRootParams(input: unknown): PlannerRootParams {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;
  const clean: PlannerRootParams = {};
  // Unknown tab values are ignored silently — deny-safe, no crash.
  const tab = normalizePlannerTabKey(record.initialTab);
  if (tab) clean.initialTab = tab;
  if (isPlannerNavigationSource(record.source)) clean.source = record.source;
  return dropUndefined(clean);
}

/** Parses & validates raw input as `PlannerEntityDetailParams`. */
export function parsePlannerEntityDetailParams(input: unknown): PlannerEntityDetailParams {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Invalid Planner detail params: expected an object');
  }
  const record = input as Record<string, unknown>;

  if (!isValidPlannerEntityId(record.entityId)) {
    throw new Error('Invalid Planner detail params: entityId must be a UUID');
  }

  const clean: PlannerEntityDetailParams = { entityId: record.entityId };
  if (isPlannerNavigationSource(record.source)) clean.source = record.source;
  if (isPlannerReturnTarget(record.returnTo)) clean.returnTo = record.returnTo;
  if (typeof record.justCreated === 'boolean') clean.justCreated = record.justCreated;

  return dropUndefined(clean);
}

/** Parses & validates raw input as `PlannerSearchParams` (denies unknown keys). */
export function parsePlannerSearchParams(input: unknown): PlannerSearchParams {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;
  const clean: PlannerSearchParams = {};
  if (isPlannerNavigationSource(record.source)) clean.source = record.source;
  if (isPlannerReturnTarget(record.returnTo)) clean.returnTo = record.returnTo;
  return dropUndefined(clean);
}

/** Builds a serializable `PlannerRootParams` from a partial input. */
export function buildPlannerRootParams(
  input: { initialTab?: unknown; source?: unknown } = {},
): PlannerRootParams {
  const clean: PlannerRootParams = {};
  const tab = normalizePlannerTabKey(input.initialTab);
  if (tab) clean.initialTab = tab;
  if (isPlannerNavigationSource(input.source)) clean.source = input.source;
  return dropUndefined(clean);
}

/** Builds a serializable `PlannerEntityDetailParams`, validating the entity ID. */
export function buildPlannerEntityDetailParams(input: {
  entityId: unknown;
  source?: unknown;
  returnTo?: unknown;
  justCreated?: unknown;
}): PlannerEntityDetailParams {
  const entityId = input.entityId;
  if (!isValidPlannerEntityId(entityId)) {
    throw new Error('Invalid Planner detail params: entityId must be a UUID');
  }
  const clean: PlannerEntityDetailParams = { entityId };
  if (isPlannerNavigationSource(input.source)) clean.source = input.source;
  if (isPlannerReturnTarget(input.returnTo)) clean.returnTo = input.returnTo;
  if (typeof input.justCreated === 'boolean') clean.justCreated = input.justCreated;
  return dropUndefined(clean);
}

/** Builds a serializable `PlannerSearchParams` from a partial input. */
export function buildPlannerSearchParams(
  input: { source?: unknown; returnTo?: unknown } = {},
): PlannerSearchParams {
  const clean: PlannerSearchParams = {};
  if (isPlannerNavigationSource(input.source)) clean.source = input.source;
  if (isPlannerReturnTarget(input.returnTo)) clean.returnTo = input.returnTo;
  return dropUndefined(clean);
}

// ---------------------------------------------------------------------------
// 8. Pending mutation IDs / justCreated strip helper
// ---------------------------------------------------------------------------

/**
 * Returns a clone of detail params with `justCreated` removed. Use after a
 * single one-shot consumption to prevent the flag from leaking into deep
 * links or back-navigation state.
 */
export function stripEphemeralParams(
  params: PlannerEntityDetailParams,
): PlannerEntityDetailParams {
  const { justCreated: _omit, ...rest } = params;
  return dropUndefined(rest) as PlannerEntityDetailParams;
}

// ---------------------------------------------------------------------------
// 9. Entity kind hint (used by detail helpers to share routing logic)
// ---------------------------------------------------------------------------

export type PlannerEntityKind = 'task' | 'event' | 'plan';
export type LegacyPlannerEntityKind = 'goal';

export const ENTITY_DETAIL_ROUTES: Readonly<Record<PlannerEntityKind, PlannerRouteName>> = {
  task: ROUTE_NAMES.TaskDetail,
  event: ROUTE_NAMES.EventDetail,
  plan: ROUTE_NAMES.PlanDetail,
} as const;

export function resolveDetailRouteName(kind: PlannerEntityKind): PlannerRouteName {
  return ENTITY_DETAIL_ROUTES[kind];
}

export function normalizePlannerEntityKind(kind: PlannerEntityKind | LegacyPlannerEntityKind): PlannerEntityKind {
  return kind === 'goal' ? 'plan' : kind;
}
