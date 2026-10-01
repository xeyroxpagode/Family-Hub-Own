/** Plan V1 Canonical Product Contract - backed by Goals core */

export type PlanScope = 'personal' | 'household';

export type PlanLifecycle =
  | 'preparation'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type PlanTransition =
  | 'active'       // preparation -> active
  | 'paused'       // active -> paused
  | 'resume'       // paused -> active
  | 'completed'    // active/paused -> completed
  | 'cancelled'    // preparation/active/paused -> cancelled
  | 'reopen'       // completed/cancelled -> active
  | 'archive'      // completed/cancelled -> archived
  | 'unarchive';   // archived completed/cancelled -> unarchived

export type PlannerPlanV1 = {
  id: string;
  title: string;
  description: string | null;
  scope: PlanScope;
  targetDate: string | null;
  lifecycle: PlanLifecycle;
  archivedAt: string | null;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  progress?: {
    percentage: number | null;
    tasks?: { total: number; completed: number; pending: number } | null;
    milestones?: { total: number; completed: number } | null;
  };
};

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
  archived?: boolean;
  limit?: number;
};

export type PlannerPlansResponse = {
  plans: PlannerPlanV1[];
};

export type PlannerPlanResponse = {
  plan: PlannerPlanV1;
  milestones: PlannerPlanMilestoneV1[];
};

const TRANSITION_CAPABILITY_MAP: Record<PlanTransition, string> = {
  active: 'goal.edit_own',
  paused: 'goal.edit_own',
  resume: 'goal.edit_own',
  completed: 'goal.complete_own',
  cancelled: 'goal.close_own',
  reopen: 'goal.close_own',
  archive: 'goal.archive',
  unarchive: 'goal.archive',
};

const LIFECYCLE_TRANSITIONS: Record<PlanLifecycle, PlanTransition[]> = {
  preparation: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
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
  LIFECYCLE_VALUES: ['preparation', 'active', 'paused', 'completed', 'cancelled'] as PlanLifecycle[],
  SCOPE_VALUES: ['personal', 'household'] as PlanScope[],
  TRANSITIONS: ['active', 'paused', 'resume', 'completed', 'cancelled', 'reopen', 'archive', 'unarchive'] as PlanTransition[],
} as const;