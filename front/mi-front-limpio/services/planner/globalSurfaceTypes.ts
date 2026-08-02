/**
 * Planner V1 - 11A.2A Global Surfaces shared types.
 *
 * Internal types for foundations: privacy context, navigation contracts,
 * visibility decisions, entity destinations, and feature/capability gates.
 *
 * NOT: AttentionItem, ActivityItem, GlobalTrashItem DTOs, permanent delete
 * contract, Empty Trash contract, or Archive DTO.
 *
 * Privacy: no Inventory dependency, no hardcoded routes, no frontend-inferred
 * permissions, no content exposure before filtering.
 */

// ---------------------------------------------------------------------------
// Global Surface Identity
// ---------------------------------------------------------------------------

export type GlobalSurfaceId =
  | 'home'
  | 'quick_actions'
  | 'search'
  | 'attention'
  | 'activity'
  | 'trash'
  | 'archive';

export const GLOBAL_SURFACES: readonly GlobalSurfaceId[] = Object.freeze([
  'home',
  'quick_actions',
  'search',
  'attention',
  'activity',
  'trash',
  'archive',
]);

export const SURFACE_EXCLUDED_INVENTORY: readonly GlobalSurfaceId[] = Object.freeze([
  'quick_actions',
  'search',
  'attention',
  'activity',
  'trash',
  'archive',
]);

export const SURFACE_INVENTORY_HOME_EXCEPTION: GlobalSurfaceId = 'home';

// ---------------------------------------------------------------------------
// Planner access context (person, household, ownership, role)
// ---------------------------------------------------------------------------

export type PlannerAccessContext = {
  readonly personId: string;
  readonly householdId: string;
  readonly membershipId: string;
  readonly role: string;
};

export type PlannerScopeKind = 'personal' | 'household';

export type EntityVisibilityInput = {
  readonly scopeKind: PlannerScopeKind;
  readonly ownerPersonId: string;
  readonly householdId: string | null;
};

/**
 * Visibility guard for future Global Surfaces.
 * Applies privacy BEFORE ranking, counting, grouping, or rendering.
 * The coordinator does NOT automatically gain access to private personal
 * content except through an explicit entity rule.
 */
export function isVisibleInPlannerContext(
  entity: EntityVisibilityInput,
  context: PlannerAccessContext,
): boolean {
  if (entity.scopeKind === 'personal') {
    // Personal content is only visible to the owner.
    return entity.ownerPersonId === context.personId;
  }
  if (entity.scopeKind === 'household') {
    return entity.householdId === context.householdId;
  }
  return false;
}

/**
 * Determines if the context changed significantly enough to invalidate
 * surface projections (household switch, person change, membership change).
 */
export function hasPlannerContextChanged(
  prev: PlannerAccessContext | null,
  next: PlannerAccessContext | null,
): boolean {
  if (!prev || !next) return true;
  return (
    prev.householdId !== next.householdId ||
    prev.personId !== next.personId ||
    prev.membershipId !== next.membershipId ||
    prev.role !== next.role
  );
}

// ---------------------------------------------------------------------------
// Search context marker
// ---------------------------------------------------------------------------

export type SearchContextKind = 'active' | 'archived' | 'trash';

export const SEARCH_CONTEXTS: readonly SearchContextKind[] = Object.freeze([
  'active',
  'archived',
  'trash',
]);

export function isSearchContextKind(value: string): value is SearchContextKind {
  return (SEARCH_CONTEXTS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Canonical entity destination (never duplicates Detail)
// ---------------------------------------------------------------------------

export type CanonicalEntityDestination = {
  readonly entityType: 'task' | 'event' | 'plan';
  readonly entityId: string;
  readonly surfaceOrigin?: GlobalSurfaceId;
};

// ---------------------------------------------------------------------------
// Feature / capability gate for surfaces not yet productive
// ---------------------------------------------------------------------------

export type GlobalSurfaceFeatureGate = {
  readonly surfaceId: GlobalSurfaceId;
  readonly enabled: boolean;
  readonly reason?: string;
};

export const GLOBAL_SURFACE_GATES_OFF: Record<GlobalSurfaceId, GlobalSurfaceFeatureGate> = Object.freeze({
  home: { surfaceId: 'home', enabled: true, reason: 'home is a productive Global Surface' },
  quick_actions: { surfaceId: 'quick_actions', enabled: true, reason: 'quick actions is productive' },
  search: { surfaceId: 'search', enabled: true, reason: 'Active Search is productive for Tasks, Events, and Plans' },
  attention: { surfaceId: 'attention', enabled: false, reason: 'Attention count/list not yet implemented' },
  activity: { surfaceId: 'activity', enabled: false, reason: 'Activity timeline not yet implemented' },
  trash: { surfaceId: 'trash', enabled: false, reason: 'Global Trash not yet productive' },
  archive: { surfaceId: 'archive', enabled: false, reason: 'Contextual Archive not yet implemented' },
});

// ---------------------------------------------------------------------------
// Online-only destructive operation markers
// ---------------------------------------------------------------------------

export type OnlineOnlyDestructiveOp = 'permanent_delete' | 'empty_trash';

export const ONLINE_ONLY_DESTRUCTIVE_OPS: readonly OnlineOnlyDestructiveOp[] = Object.freeze([
  'permanent_delete',
  'empty_trash',
]);

export function isOnlineOnlyDestructive(op: string): op is OnlineOnlyDestructiveOp {
  return (ONLINE_ONLY_DESTRUCTIVE_OPS as readonly string[]).includes(op);
}

export const EXCLUDED_DESTRUCTIVE_MESSAGE = 'Esta operacion no esta disponible en este contexto.';

// ---------------------------------------------------------------------------
// Navigation ownership: origin surfaces for future transitions
// ---------------------------------------------------------------------------

export type GlobalSurfaceNavigationOwnership = {
  readonly surfaceId: GlobalSurfaceId;
  readonly originComponent: string;
  /** Where this surface is reached from in the navigation tree. */
  readonly entryPoint: string;
  readonly supportsBack: boolean;
  readonly restoresFocus: boolean;
  readonly supportsKeyboard: boolean;
  /** Feature gate that controls visibility. */
  readonly gate: GlobalSurfaceFeatureGate;
};

export const NAV_OWNERSHIP: Record<GlobalSurfaceId, GlobalSurfaceNavigationOwnership> = Object.freeze({
  home: {
    surfaceId: 'home',
    originComponent: 'HomeTabNavigator (bottom tab Home)',
    entryPoint: 'Home (bottom tab #1)',
    supportsBack: true,
    restoresFocus: false,
    supportsKeyboard: true,
    gate: GLOBAL_SURFACE_GATES_OFF.home,
  },
  quick_actions: {
    surfaceId: 'quick_actions',
    originComponent: 'PlannerSheetHost (center tab Add)',
    entryPoint: 'Center Bottom Navigation button',
    supportsBack: true,
    restoresFocus: true,
    supportsKeyboard: true,
    gate: GLOBAL_SURFACE_GATES_OFF.quick_actions,
  },
  search: {
    surfaceId: 'search',
    originComponent: 'QuickActionsMenu > Search bar',
    entryPoint: 'Search bar inside Quick Actions surface; transitions to full-screen',
    supportsBack: true,
    restoresFocus: true,
    supportsKeyboard: true,
    gate: GLOBAL_SURFACE_GATES_OFF.search,
  },
  attention: {
    surfaceId: 'attention',
    originComponent: 'AppTopBar (attention icon + badge)',
    entryPoint: 'AppTopBar icon; opens full-screen Attention/Activity shared surface',
    supportsBack: true,
    restoresFocus: true,
    supportsKeyboard: true,
    gate: GLOBAL_SURFACE_GATES_OFF.attention,
  },
  activity: {
    surfaceId: 'activity',
    originComponent: 'Attention/Activity shared surface (shared tab)',
    entryPoint: 'Activity tab inside shared Attention/Activity surface',
    supportsBack: true,
    restoresFocus: true,
    supportsKeyboard: true,
    gate: GLOBAL_SURFACE_GATES_OFF.activity,
  },
  trash: {
    surfaceId: 'trash',
    originComponent: 'MoreScreen > Papelera entry + local prefiltered entries',
    entryPoint: 'More > Papelera; local entries from Planner/Tasks/Events/Plans/Presets',
    supportsBack: true,
    restoresFocus: true,
    supportsKeyboard: true,
    gate: GLOBAL_SURFACE_GATES_OFF.trash,
  },
  archive: {
    surfaceId: 'archive',
    originComponent: 'Contextual per-module (Tasks Archive, Events Archive, Plans Archive, Presets Archive)',
    entryPoint: 'Module-local archive screen; no single global Archive screen',
    supportsBack: true,
    restoresFocus: true,
    supportsKeyboard: true,
    gate: GLOBAL_SURFACE_GATES_OFF.archive,
  },
});

// ---------------------------------------------------------------------------
// Local Trash prefilter helper (for future prefiltered Trash entries)
// ---------------------------------------------------------------------------

export type LocalTrashPrefilter = {
  readonly entityType: 'task' | 'event' | 'plan' | 'preset';
  readonly householdId: string;
};

// ---------------------------------------------------------------------------
// Inventory exclusion guard
// ---------------------------------------------------------------------------

export const INVENTORY_ENTITY_TAG = 'inventory';

export function isInventoryContent(entity: { readonly originModule?: string | null }): boolean {
  return entity.originModule === INVENTORY_ENTITY_TAG;
}

export function assertInventoryExcluded(targetSurface: GlobalSurfaceId): void {
  if (SURFACE_EXCLUDED_INVENTORY.includes(targetSurface)) {
    throw new Error(`inventory_excluded_from_${targetSurface}`);
  }
}

export const INVENTORY_EXCLUDED_FROM_SURFACES_MESSAGE: Record<GlobalSurfaceId, string> = Object.freeze({
  home: 'Inventory conserva su excepcion actual en Home.',
  quick_actions: 'Inventory excluido de Quick Actions.',
  search: 'Inventory excluido de Search global durante 11A.',
  attention: 'Inventory excluido de Attention global durante 11A.',
  activity: 'Inventory excluido de Activity global durante 11A.',
  trash: 'Inventory excluido de Global Trash durante 11A.',
  archive: 'Inventory excluido de Archive contextual durante 11A.',
});
