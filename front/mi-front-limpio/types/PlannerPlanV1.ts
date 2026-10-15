/**
 * Compatibility alias of the canonical Plan contract.
 *
 * `Plan` in `./Plan.ts` is the single frontend Plan authority. This module is
 * retained so existing Plan create/list/detail consumers keep importing a
 * stable symbol while the Plan family is cut over.
 */

import type { Plan, PlanLifecycle, PlanScope } from './Plan';
import { PLAN_LIFECYCLE_VALUES, PLAN_SCOPE_VALUES } from './Plan';

export type PlanTransition =
  | 'active'       // preparation -> active
  | 'paused'       // active -> paused
  | 'resume'       // paused -> active
  | 'completed'    // active/paused -> completed
  | 'cancelled'    // preparation/active/paused -> cancelled
  | 'reopen'       // completed/cancelled -> active
  | 'archive'      // any non-trashed lifecycle -> archived
  | 'unarchive';   // lifecycle preserved

export type { PlanScope, PlanLifecycle } from './Plan';
export { PLAN_CONTRACT_FIELDS, PLAN_LIFECYCLE_VALUES, PLAN_SCOPE_VALUES } from './Plan';

export type PlannerPlanV1 = Plan;

export type PlannerPlanMilestoneV1 = {
  id: string;
  goalId: string;
  title: string;
  targetValue: number | null;
  achieved: boolean;
  achievedAt: string | null;
  sortOrder: number;
  createdAt: string;
  version: number;
};

export type CreatePlanInput = {
  title: string;
  description?: string | null;
  scope?: PlanScope;
  targetDate?: string | null;
};

export type UpdatePlanInput = Partial<CreatePlanInput> & {
  expectedVersion?: number;
};

export type TransitionPlanInput = {
  transition: PlanTransition;
  expectedVersion?: number;
  closedReason?: string | null;
  confirmUnresolved?: boolean;
};

export type PlannerPlanFilters = {
  lifecycle?: PlanLifecycle;
  scope?: PlanScope;
  onlyMine?: boolean;
  /** `true` = only archived, `false` = only active (default), `'all'` = both. */
  archived?: boolean | 'all';
  limit?: number;
};

export type PlannerPlansResponse = {
  plans: PlannerPlanV1[];
};

export type PlannerPlanResponse = {
  plan: PlannerPlanV1;
  /**
   * Milestones are NOT Plan V1 components (frozen §20). The read contract
   * intentionally publishes no milestone list; readiness/progress are the
   * authority for "how complete is this Plan".
   */
  readiness?: PlanReadiness;
  progress?: PlanFactualProgress;
};

export type PlanReadinessItem = {
  type: 'task' | 'event' | 'measurement';
  id: string;
  title: string;
  reason: string;
};

export type PlanReadiness = {
  ready: boolean;
  pendingTotal: number;
  pending: { tasks: number; events: number; measurements: number };
  items: PlanReadinessItem[];
};

export type PlanFactualProgress = {
  tasks: { resolved: number; total: number };
  events: { resolved: number; total: number };
  measurements: Array<{
    id: string;
    name: string;
    current: number;
    target: number | null;
    unit: string;
    reached: boolean;
  }>;
};

export type PlanMeasurement = {
  id: string;
  name: string;
  current_value: number;
  target_value: number | null;
  unit: string;
  target_operator: 'gte' | 'lte' | 'eq';
  classification: 'necessary' | 'supporting';
  sort_order: number;
  version: number;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
  targetReached?: boolean;
};

export type PlanMeasurementsResponse = {
  measurements: PlanMeasurement[];
};

export type PlanMeasurementHistoryEntry = {
  id: string;
  measurement_id: string;
  value: number;
  previous_value: number | null;
  operation_id: string;
  recorded_at: string;
};

export type CreatePlanMeasurementInput = {
  name: string;
  unit: string;
  current_value?: number;
  target_value?: number | null;
  target_operator?: 'gte' | 'lte' | 'eq';
  classification?: 'necessary' | 'supporting';
};

const TRANSITION_CAPABILITY_MAP: Record<PlanTransition, string> = {
  active: 'goal.edit_own',
  paused: 'goal.edit_own',
  resume: 'goal.edit_own',
  completed: 'goal.complete_own',
  cancelled: 'goal.close_own',
  reopen: 'goal.close_own',
  archive: 'goal.edit_own',
  unarchive: 'goal.edit_own',
};

const LIFECYCLE_TRANSITIONS: Record<PlanLifecycle, PlanTransition[]> = {
  // Fallback only: the server `availableActions` list is the authority.
  // Preparation exposes NO cancel (frozen §24); paused resumes via `resume`.
  preparation: ['active', 'archive'],
  active: ['paused', 'completed', 'cancelled', 'archive'],
  paused: ['resume', 'completed', 'cancelled', 'archive'],
  completed: ['reopen', 'archive'],
  cancelled: ['reopen', 'archive'],
};

export function canTransition(from: PlanLifecycle, to: PlanTransition): boolean {
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getTransitionCapability(transition: PlanTransition, isOwner: boolean): string {
  if (transition === 'completed' || transition === 'cancelled' || transition === 'reopen') {
    return isOwner
      ? TRANSITION_CAPABILITY_MAP[transition].replace('_own', '_own')
      : TRANSITION_CAPABILITY_MAP[transition].replace('_own', '_any');
  }
  return TRANSITION_CAPABILITY_MAP[transition];
}

export const PLAN_V1_CONSTANTS = {
  LIFECYCLE_VALUES: PLAN_LIFECYCLE_VALUES,
  SCOPE_VALUES: PLAN_SCOPE_VALUES,
  TRANSITIONS: ['active', 'paused', 'resume', 'completed', 'cancelled', 'reopen', 'archive', 'unarchive'] as PlanTransition[],
} as const;
