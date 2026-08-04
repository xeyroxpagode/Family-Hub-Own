/** M11.3A canonical Plan graph DTOs. No visible screen is introduced here. */

export type PlanScope = 'personal' | 'household';
export type PlanLifecycle = 'draft' | 'active' | 'paused' | 'completed' | 'closed' | 'trash';
export type PlanClassification = 'necessary' | 'supporting';
export type PlanGraphEntityType =
  | 'plan'
  | 'milestone'
  | 'measurement'
  | 'manual_condition'
  | 'requirement';

export type PlannerPlan = {
  id: string;
  version: number;
  scope: PlanScope;
  ownerPersonId: string | null;
  householdId: string | null;
  objective: string;
  description: string | null;
  lifecycle: PlanLifecycle;
  targetDate: string | null;
  finalizationKind: 'none' | 'date' | 'event';
  archivedAt: string | null;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  availableActions: readonly string[];
};

export type PlannerPlanMilestone = {
  id: string;
  planId: string;
  version: number;
  title: string;
  description: string | null;
  completionMode: 'automatic' | 'manual';
  lifecycle: 'pending' | 'completed' | 'trash';
  classification: PlanClassification;
  sortOrder: number;
};

export type PlannerPlanMeasurement = {
  id: string;
  planId: string;
  version: number;
  name: string;
  currentValue: number;
  targetValue: number | null;
  unit: string;
  targetOperator: 'gte' | 'lte' | 'eq';
  targetReached: boolean;
  classification: PlanClassification;
  sortOrder: number;
  history: readonly PlannerPlanMeasurementHistoryEntry[];
};

export type PlannerPlanMeasurementHistoryEntry = {
  id: string;
  value: number;
  previousValue: number | null;
  correctionOfId: string | null;
  recordedAt: string;
};

export type PlannerPlanManualCondition = {
  id: string;
  planId: string;
  version: number;
  label: string;
  isSatisfied: boolean;
  classification: PlanClassification;
  sortOrder: number;
};

export type PlanInternalRequirementSubject =
  | { kind: 'milestone'; milestoneId: string }
  | { kind: 'measurement'; measurementId: string }
  | { kind: 'manual_condition'; manualConditionId: string };

export type PlanLinkedEntityAvailability =
  | 'available'
  | 'missing'
  | 'trashed'
  | 'forbidden'
  | 'stale';

export type PlanLinkedEntityDto = {
  entityType: 'task' | 'event';
  externalEntityId: string;
  planRequirementId?: string | null;
  title?: string | null;
  lifecycle?: string | null;
  relationKind: PlanClassification;
  availability: PlanLinkedEntityAvailability;
};

export type PlanFutureExternalRequirementSubject = {
  kind: 'external';
  externalKind: 'task' | 'event';
  externalReferenceKey: string;
  externalEntityId: string | null;
  bindingState: 'bound' | 'unavailable';
  linkedEntity: PlanLinkedEntityDto | null;
};

export type PlannerPlanRequirement = {
  id: string;
  planId: string;
  parentRequirementId: string | null;
  version: number;
  classification: PlanClassification;
  sortOrder: number;
  subject: PlanInternalRequirementSubject | PlanFutureExternalRequirementSubject;
  satisfied: boolean;
};

export type PlannerPlanIndicators = {
  milestoneCount: number;
  completedMilestoneCount: number;
  measurementCount: number;
  reachedMeasurementCount: number;
  necessaryRequirementCount: number;
  satisfiedNecessaryRequirementCount: number;
  supportingRequirementCount: number;
};

export type PlannerPlanDraftIsolation = {
  contained: boolean;
  operationalChildrenPublished: false;
  appearsInHome: false;
  notifies: false;
  recurs: false;
};

export type PlannerPlanGraphDto = {
  plan: PlannerPlan;
  indicators: PlannerPlanIndicators;
  milestones: readonly PlannerPlanMilestone[];
  measurements: readonly PlannerPlanMeasurement[];
  manualConditions: readonly PlannerPlanManualCondition[];
  requirements: readonly PlannerPlanRequirement[];
  draftIsolation: PlannerPlanDraftIsolation;
};

export type PlannerPlanGraphWrite = {
  entityType: PlanGraphEntityType;
  action: string;
  planId: string | null;
  entityId: string | null;
  expectedVersion: number | null;
  /** Required for every child create/update/trash/restore/reorder mutation. */
  expectedPlanVersion: number | null;
  operationId: string;
  idempotencyKey: string;
  payloadHash: string;
  payload: Readonly<Record<string, unknown>>;
};

export type PlannerPlanGraphWriteResult<T> = {
  data: T;
  outcome: 'created' | 'updated' | 'noop' | 'replay';
  version: number;
  planVersion?: number;
  operationId: string;
};

// ---------------------------------------------------------------------------
// P1 CANONICAL PLAN STRUCTURE DOMAIN CONTRACT
// ---------------------------------------------------------------------------

export type PlanStructureSnapshot = PlannerPlanGraphDto;

export type PlanMilestone = PlannerPlanMilestone;

export type PlanMeasurement = PlannerPlanMeasurement;

export type PlanManualCondition = PlannerPlanManualCondition;

export type PlanRequirement = PlannerPlanRequirement;

export type PlanStructureIndicator = PlannerPlanIndicators;

export type PlanActivationReadiness =
  | 'NO_USEFUL_STRUCTURE'
  | 'NECESSARY_REQUIREMENT_PENDING'
  | 'READY'
  | 'BACKEND_ONLY_UNKNOWN';

export type PlanCompletionReadiness = {
  readonly canComplete: boolean;
  readonly blockers: readonly PlanCompletionBlocker[];
};

export type PlanCompletionBlocker =
  | { readonly kind: 'not_active'; readonly label: string }
  | { readonly kind: 'already_completed'; readonly label: string }
  | { readonly kind: 'necessary_requirements_pending'; readonly requirementIds: readonly string[]; readonly label: string }
  | { readonly kind: 'version_conflict'; readonly label: string };

export type PlanStructureMutationOutcome = 'confirmed' | 'noop' | 'replay' | 'version_conflict' | 'invalid_transition' | 'rollback';

export type PlanStructureMutationResult = {
  readonly outcome: PlanStructureMutationOutcome;
  readonly snapshot: PlanStructureSnapshot | null;
  readonly version: number;
  readonly planVersion: number;
  readonly operationId: string;
};

export type PlanStructureOperationKind = 'add' | 'update' | 'trash' | 'restore' | 'reorder' | 'parent_change';

export type PlanStructureOperation = {
  readonly localId: string;
  readonly entityType: 'milestone' | 'measurement' | 'manual_condition' | 'requirement';
  readonly operation: PlanStructureOperationKind;
  readonly entityId: string | null;
  readonly expectedVersion: number | null;
  readonly payload: Readonly<Record<string, unknown>>;
};

export type PlanStructureChangeset = {
  readonly planId: string;
  readonly expectedPlanVersion: number;
  readonly operations: readonly PlanStructureOperation[];
};

export type PlanExternalReferenceShape = {
  readonly externalReferenceType: 'task' | 'event';
  readonly externalReferenceId: string | null;
  readonly necessary: boolean;
  readonly satisfied: boolean;
};

export type PlanRequirementHierarchyNode = {
  readonly id: string;
  readonly parentRequirementId: string | null;
  readonly sortOrder: number;
  readonly children: readonly PlanRequirementHierarchyNode[];
};
