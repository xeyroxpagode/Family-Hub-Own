import type {
  PlannerTask,
  PlannerTaskAggregateStateV1,
  PlannerTaskAssignmentKindV1,
  PlannerTaskFulfillmentModeV1,
  PlannerTaskFulfillmentStatusV1,
  PlannerTaskFulfillmentV1,
  PlannerTaskMemberV1,
  PlannerTaskPriority,
  PlannerTaskStatus,
} from '../services/plannerTasks';

export type PlannerTaskScope = 'personal' | 'household';

export type PlannerTaskLifecycle = 'draft' | 'active' | 'cancelled' | 'trash' | PlannerTaskStatus;

export type PlannerTaskAvailableActionKey =
  | 'update'
  | 'change_assignment'
  | 'claim'
  | 'complete'
  | 'submit_for_verification'
  | 'verify'
  | 'request_correction'
  | 'resubmit'
  | 'revert'
  | 'reopen'
  | 'cancel'
  | 'reactivate'
  | 'trash'
  | 'restore';

export type PlannerTaskAvailableAction = {
  readonly action: PlannerTaskAvailableActionKey | string;
  readonly fulfillmentId?: string;
  readonly disabledReason?: string | null;
};

export type PlannerTaskAssignmentV1 = {
  readonly kind: PlannerTaskAssignmentKindV1;
  readonly mode: PlannerTaskFulfillmentModeV1;
  readonly version: number;
  readonly legacyResolutionRequired: boolean;
  readonly assignees: readonly PlannerTaskMemberV1[];
};

export type PlannerTaskAggregateV1 = {
  readonly state: PlannerTaskAggregateStateV1;
  readonly total: number;
  readonly pending: number;
  readonly completed: number;
  readonly awaitingVerification: number;
  readonly correctionRequested: number;
  readonly verified: number;
};

export type PlannerTaskRecurrenceProjection = {
  readonly seriesId?: string | null;
  readonly summary?: string | null;
  readonly rule?: string | null;
  readonly nextOccurrenceDate?: string | null;
};

export type PlannerTaskDtoV1 = PlannerTask & {
  readonly scope?: PlannerTaskScope | { readonly type?: PlannerTaskScope; readonly id?: string | null };
  readonly lifecycle?: PlannerTaskLifecycle;
  readonly availableActions?: readonly PlannerTaskAvailableAction[];
  readonly assignment?: PlannerTaskAssignmentV1;
  readonly assignees?: readonly PlannerTaskMemberV1[];
  readonly fulfillments?: readonly PlannerTaskFulfillmentV1[];
  readonly aggregate?: PlannerTaskAggregateV1;
  readonly recurrence?: PlannerTaskRecurrenceProjection | null;
  readonly recurrenceSummary?: string | null;
  readonly owner_person_id?: string | null;
  readonly deleted_at?: string | null;
  readonly restored_at?: string | null;
  readonly restored_by_member_id?: string | null;
  readonly cancellation?: {
    readonly cancelledAt?: string | null;
    readonly cancelledByMemberId?: string | null;
    readonly reason?: string | null;
    readonly fromLifecycle?: string | null;
  } | null;
};

export type PlannerTaskProjection = {
  readonly id: string;
  readonly title: string;
  readonly version: number;
  readonly scope: PlannerTaskScope;
  readonly lifecycle: PlannerTaskLifecycle;
  readonly date: string | null;
  readonly time: string | null;
  readonly temporalLabel: string;
  readonly assignmentSummary: string;
  readonly fulfillmentSummary: string;
  readonly primaryAction: PlannerTaskRowAction | null;
  readonly exceptionalIndicator: string | null;
  readonly recurrenceSummary: string | null;
  readonly localState: PlannerTaskLocalMutationState;
  readonly accessibilityLabel: string;
  readonly navigationIntent: PlannerTaskNavigationIntent;
  readonly priority: PlannerTaskPriority;
};

export type PlannerTaskLocalMutationState =
  | 'confirmed'
  | 'optimistic'
  | 'rolled_back'
  | 'uncertain'
  | 'conflict'
  | 'offline'
  | 'replay'
  | 'noop';

export type PlannerTaskNavigationIntent =
  | { readonly kind: 'detail'; readonly taskId: string }
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly taskId: string };

export type PlannerTaskRowAction = {
  readonly key: PlannerTaskAvailableActionKey;
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly fulfillmentId?: string;
  readonly destructive: boolean;
};

export type PlannerTaskCalendarProjectionV1 = {
  readonly taskId: string;
  readonly semanticDate: string;
  readonly time: string | null;
  readonly title: string;
  readonly lifecycle: PlannerTaskLifecycle;
  readonly relevantState: PlannerTaskAggregateStateV1 | PlannerTaskStatus;
  readonly projectionVersion: 1;
  readonly detailNavigationIntent: PlannerTaskNavigationIntent;
  readonly badgeCountContribution: 1;
  readonly stableOrdering: readonly [string, string, string];
};
