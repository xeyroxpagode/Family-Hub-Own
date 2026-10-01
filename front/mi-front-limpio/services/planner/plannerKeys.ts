/**
 * Planner V0.3 — Canonical query-key factory.
 *
 * Single public source of truth for ALL Planner query keys.
 * Every household-scoped key includes the active householdId (and where
 * relevant, accountId + membershipId) so that two households (or two
 * memberships in the same household) NEVER share cache.
 *
 * Rules enforced here:
 *   - No implicit household. Every scoped key requires an explicit scope object.
 *   - Filters are normalized (sorted keys, dropped undefined/null/empty) so
 *     equivalent filter objects produce the same key.
 *   - Keys are readonly arrays of primitives — stable for Map/Set, no mutation.
 *   - Consumers MUST import this factory; no inline key strings anywhere.
 *
 * Key taxonomy (each key has a "kind" used for TTL and invalidation):
 *
 *   ROOT:                ['planner']
 *
 *   CAPABILITY:          ['planner','capabilities', accountId, householdId, membershipId]
 *                        → kind: 'capabilities'
 *
 *   COLLECTION ROOT:     ['planner', kind, householdId, 'all']
 *                        → kind: 'tasks' | 'events' | 'goals'
 *
 *   FILTERED LIST:       ['planner', kind, householdId, 'list', filtersKey]
 *                        → kind: 'tasks' | 'events' | 'goals'
 *
 *   DETAIL:              ['planner', kind, householdId, 'detail', entityId]
 *                        → kind: 'tasks' | 'events' | 'goals'
 *
 *   MILESTONES (proj):   ['planner','goals', householdId, 'milestones', goalId]
 *                        ['planner','goals', householdId, 'milestones', goalId, 'detail', milestoneId]
 *                        → kind: 'goals'
 *
 *   SUMMARY:             ['planner','summary', householdId]
 *                        → kind: 'summary'
 *
 *   TRASH:               ['planner','trash', householdId, type?]
 *                        → kind: 'trash'
 *
 *   CALENDAR:            ['planner','calendar', householdId, view?, date?]
 *                        → kind: 'calendar'
 *
 *   SEARCH (reserved):   ['planner','search', householdId, query, filtersKey]
 *                        → kind: 'search' (V1 does NOT implement search backend)
 */

import type { PlannerTaskFilters } from '../plannerTasks';
import type { PlannerEventFilters } from '../plannerEvents';
import type { PlannerGoalFilters } from '../plannerGoals';

/** Scope for household-scoped data (tasks, events, goals, summary, trash, calendar). */
export interface HouseholdScope {
  readonly householdId: string;
}

/** Personal Planner scope. Personal entities must not mix with active household keys. */
export interface PersonalScope {
  readonly personId: string;
}

export type PlannerScope = HouseholdScope | PersonalScope;

/** Scope for capabilities (account + household + membership). */
export interface CapabilityScope {
  readonly accountId: string;
  readonly householdId: string;
  readonly membershipId: string;
}

/** Supported filter shapes (serialized for keys). */
type PlannerTaskFiltersKey = Partial<Record<keyof PlannerTaskFilters, string>>;
type PlannerEventFiltersKey = Partial<Record<keyof PlannerEventFilters, string>>;
type PlannerGoalFiltersKey = Partial<Record<keyof PlannerGoalFilters, string>>;

/** Internal: normalize a filter object to a stable key fragment. */
function normalizeFilters<T extends Record<string, unknown>>(
  filters?: T,
): readonly (string | number)[] {
  if (!filters) return ['*'];
  const entries = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.flatMap(([k, v]) => {
    if (typeof v === 'boolean') return [k, v ? 'true' : 'false'];
    return [k, String(v)];
  });
}

/** Key kinds for TTL and invalidation routing. */
export type PlannerKeyKind =
  | 'tasks'
  | 'events'
  | 'goals'
  | 'plans'
  | 'summary'
  | 'home_summary'
  | 'trash'
  | 'calendar'
  | 'capabilities'
  | 'presets'
  | 'drafts'
  | 'search';

/** Classify a key into its kind (for TTL / invalidation). */
export function classifyKey(key: readonly unknown[]): PlannerKeyKind | null {
  if (key[0] !== 'planner') return null;
  const second = key[1];
  if (typeof second === 'string' && [
    'tasks', 'events', 'goals', 'plans', 'summary', 'home_summary', 'trash', 'calendar', 'capabilities', 'presets', 'drafts', 'search'
  ].includes(second)) {
    return second as PlannerKeyKind;
  }
  return null;
}

/** Extract householdId from a household-scoped key, or null if not scoped. */
export function householdOf(key: readonly unknown[]): string | null {
  if (key[0] !== 'planner') return null;
  const second = key[1];
  if (typeof second !== 'string') return null;
  // capabilities: ['planner','capabilities', accountId, householdId, membershipId]
  if (second === 'capabilities') {
    return typeof key[3] === 'string' ? key[3] : null;
  }
  if (second === 'presets' || second === 'drafts') {
    return key[2] === 'household' && typeof key[3] === 'string' ? key[3] : null;
  }
  // All other household-scoped keys: ['planner', kind, householdId, ...]
  if (typeof key[2] === 'string') return key[2];
  return null;
}

/** Root key (no household). */
function root(): readonly string[] {
  return ['planner'] as const;
}

/** Capability projection key. */
function capabilities(scope: CapabilityScope): readonly (string | number)[] {
  return ['planner', 'capabilities', scope.accountId, scope.householdId, scope.membershipId] as const;
}

/** Task keys. */
function tasksAll(scope: HouseholdScope): readonly (string | number)[] {
  return ['planner', 'tasks', scope.householdId, 'all'];
}

function tasksList(scope: HouseholdScope, filters?: PlannerTaskFilters): readonly (string | number)[] {
  return ['planner', 'tasks', scope.householdId, 'list', ...normalizeFilters(filters)];
}

function tasksDetail(scope: HouseholdScope, taskId: string): readonly (string | number)[] {
  return ['planner', 'tasks', scope.householdId, 'detail', taskId];
}

/** Event keys. */
function eventsAll(scope: HouseholdScope): readonly (string | number)[] {
  return ['planner', 'events', scope.householdId, 'all'];
}

function eventsList(scope: HouseholdScope, filters?: PlannerEventFilters): readonly (string | number)[] {
  return ['planner', 'events', scope.householdId, 'list', ...normalizeFilters(filters)];
}

function eventsDetail(scope: HouseholdScope, eventId: string): readonly (string | number)[] {
  return ['planner', 'events', scope.householdId, 'detail', eventId];
}

/** Goal keys. */
function goalsAll(scope: HouseholdScope): readonly (string | number)[] {
  return ['planner', 'goals', scope.householdId, 'all'];
}

function goalsList(scope: HouseholdScope, filters?: PlannerGoalFilters): readonly (string | number)[] {
  return ['planner', 'goals', scope.householdId, 'list', ...normalizeFilters(filters)];
}

function goalsDetail(scope: HouseholdScope, goalId: string): readonly (string | number)[] {
  return ['planner', 'goals', scope.householdId, 'detail', goalId];
}

function goalsMilestones(scope: HouseholdScope, goalId: string): readonly (string | number)[] {
  return ['planner', 'goals', scope.householdId, 'milestones', goalId];
}

function goalsMilestoneDetail(
  scope: HouseholdScope,
  goalId: string,
  milestoneId: string,
): readonly (string | number)[] {
  return ['planner', 'goals', scope.householdId, 'milestones', goalId, 'detail', milestoneId];
}

/** Canonical Plan keys. Physical V0 services may still consume `goals`. */
function plansAll(scope: HouseholdScope): readonly (string | number)[] {
  return ['planner', 'plans', scope.householdId, 'all'];
}

function plansList(scope: HouseholdScope, filters?: PlannerGoalFilters): readonly (string | number)[] {
  return ['planner', 'plans', scope.householdId, 'list', ...normalizeFilters(filters)];
}

function plansDetail(scope: HouseholdScope, planId: string): readonly (string | number)[] {
  return ['planner', 'plans', scope.householdId, 'detail', planId];
}

/** Summary key. */
function summary(scope: HouseholdScope): readonly (string | number)[] {
  return ['planner', 'summary', scope.householdId];
}

function homeSummary(scope: HouseholdScope): readonly (string | number)[] {
  return ['planner', 'home_summary', scope.householdId];
}

/** Trash key. */
function trash(scope: HouseholdScope, type?: 'tasks' | 'events' | 'goals' | 'all'): readonly (string | number)[] {
  return type
    ? ['planner', 'trash', scope.householdId, type]
    : ['planner', 'trash', scope.householdId];
}

function presets(scope: PlannerScope, type?: 'task' | 'event' | 'plan' | 'all'): readonly (string | number)[] {
  return 'householdId' in scope
    ? ['planner', 'presets', 'household', scope.householdId, type ?? 'all']
    : ['planner', 'presets', 'personal', scope.personId, type ?? 'all'];
}

function drafts(scope: PlannerScope, type?: 'task' | 'event' | 'plan' | 'all'): readonly (string | number)[] {
  return 'householdId' in scope
    ? ['planner', 'drafts', 'household', scope.householdId, type ?? 'all']
    : ['planner', 'drafts', 'personal', scope.personId, type ?? 'all'];
}

/** Calendar key. */
function calendar(
  scope: HouseholdScope,
  view?: 'month' | 'week' | 'day',
  date?: string,
): readonly (string | number)[] {
  const parts = ['planner', 'calendar', scope.householdId] as const;
  if (view) return [...parts, view, date ?? '*'];
  return [...parts];
}

/** Search key (reserved — V1 does not implement backend Search). */
function search(
  scope: HouseholdScope,
  query: string,
  filters?: Record<string, string | number | boolean>,
): readonly (string | number)[] {
  return ['planner', 'search', scope.householdId, query, ...normalizeFilters(filters)];
}

/** Public factory. */
export const plannerKeys = {
  root,
  capabilities,
  tasks: { all: tasksAll, list: tasksList, detail: tasksDetail },
  events: { all: eventsAll, list: eventsList, detail: eventsDetail },
  goals: { all: goalsAll, list: goalsList, detail: goalsDetail, milestones: goalsMilestones, milestoneDetail: goalsMilestoneDetail },
  plans: { all: plansAll, list: plansList, detail: plansDetail },
  summary,
  homeSummary,
  trash,
  presets,
  drafts,
  calendar,
  search,
} as const;

// Helper types for consumers to ensure they pass the right scope
export type { HouseholdScope as PlannerHouseholdScope, PersonalScope as PlannerPersonalScope, CapabilityScope as PlannerCapabilityScope };
