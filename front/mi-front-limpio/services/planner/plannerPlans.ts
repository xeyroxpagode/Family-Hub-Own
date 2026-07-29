import { requestJson } from '../api';
import {
  ROUTE_NAMES,
  buildPlannerEntityDetailParams,
  parsePlannerEntityDetailParams,
  type PlannerEntityDetailParams,
} from '../../navigation/plannerNavigationContract';
import type {
  PlanClassification,
  PlanGraphEntityType,
  PlanLifecycle,
  PlanScope,
  PlannerPlan,
  PlannerPlanGraphDto,
  PlannerPlanIndicators,
  PlannerPlanManualCondition,
  PlannerPlanMeasurement,
  PlannerPlanMilestone,
  PlannerPlanRequirement,
} from '../../types/PlannerPlan';
import {
  createPlannerMutationIntent,
  createPlannerVersionedMutationIntent,
  type PlannerMutationIntent,
} from './plannerMutationIntent';
import type {
  PlannerFormAdapterContract,
  PlannerMutationReducerContract,
  PlannerRootScreenAdapter,
  PlansLaneContract,
} from './plannerParallelContracts';
import {
  normalizePlannerMutationResult,
  plannerReadRequestOptions,
  type PlannerMutationResult,
  type PlannerReadRequest,
} from './plannerTransportContracts';
import type { PlannerVisualStateKind } from './plannerVisualStates';
import { getPlannerMotionSpec } from './plannerMotion';

export type PlanListFilters = {
  readonly scope?: PlanScope;
  readonly lifecycle?: PlanLifecycle;
  readonly archived?: boolean;
};

export type PlanListResponse = {
  readonly plans: readonly PlannerPlan[];
};

export type PlanGraphWriteAction =
  | 'create'
  | 'update'
  | 'transition'
  | 'complete'
  | 'reopen'
  | 'record'
  | 'set'
  | 'trash'
  | 'restore';

export type PlanLifecycleTransition =
  | 'activate'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'close'
  | 'reopen'
  | 'archive'
  | 'unarchive'
  | 'trash'
  | 'restore';

export type PlanGraphWriteRequest = {
  readonly entityType: PlanGraphEntityType;
  readonly action: PlanGraphWriteAction;
  readonly planId?: string | null;
  readonly entityId?: string | null;
  readonly expectedVersion?: number | null;
  readonly expectedPlanVersion?: number | null;
  readonly payload?: Readonly<Record<string, unknown>>;
};

export type PlanCreateOutcomeChoice = 'activate_when_valid' | 'save_draft';

export type MinimalPlanCreatePayload = {
  readonly objective: string;
  readonly scope: PlanScope;
  readonly householdId?: string | null;
  readonly description?: string | null;
  readonly targetDate?: string | null;
  readonly finalizationKind?: 'none' | 'date' | 'event';
  readonly initialStructure?: PlanStructureDraft | null;
  readonly outcome: PlanCreateOutcomeChoice;
};

export type PlanStructureNodeDraft = {
  readonly localId: string;
  readonly entityType: Exclude<PlanGraphEntityType, 'plan'>;
  readonly entityId?: string | null;
  readonly action: PlanGraphWriteAction;
  readonly expectedVersion?: number | null;
  readonly classification?: PlanClassification;
  readonly parentRequirementId?: string | null;
  readonly sortOrder?: number;
  readonly payload: Readonly<Record<string, unknown>>;
};

export type PlanStructureDraft = {
  readonly planId: string;
  readonly expectedPlanVersion: number;
  readonly nodes: readonly PlanStructureNodeDraft[];
};

export type PlanStructurePersistenceDecision = {
  readonly kind: 'integration_pending';
  readonly canSubmit: false;
  readonly draft: PlanStructureDraft;
  readonly validationErrors: readonly string[];
  readonly remoteRequest: null;
  readonly reason: 'backend_structure_changeset_route_unmounted';
  readonly integrationRequest: 'PROPOSED IR-FE-PLAN-STRUCTURE-001';
};

export type PlanSyncVisualState = {
  readonly kind: PlannerVisualStateKind;
  readonly pending: boolean;
  readonly uncertain: boolean;
  readonly conflict: boolean;
};

export type PlanActionIntent = {
  readonly key: string;
  readonly label: string;
  readonly destructive: boolean;
  readonly primary: boolean;
};

export type PlanIndicator = {
  readonly key: string;
  readonly label: string;
  readonly emphasis: 'primary' | 'secondary' | 'warning';
};

export type PlanBlocker =
  | { readonly kind: 'conflict'; readonly label: string }
  | { readonly kind: 'requirement'; readonly requirementId: string; readonly label: string }
  | { readonly kind: 'measurement_missing_target'; readonly measurementId: string; readonly label: string }
  | { readonly kind: 'final_event_pending'; readonly requirementId: string; readonly label: string }
  | { readonly kind: 'milestone_pending'; readonly milestoneId: string; readonly label: string }
  | { readonly kind: 'manual_condition_pending'; readonly manualConditionId: string; readonly label: string };

export type PlanCommitment =
  | { readonly kind: 'task'; readonly label: string; readonly navigation: PlannerEntityDetailParams | null }
  | { readonly kind: 'event'; readonly label: string; readonly navigation: PlannerEntityDetailParams | null }
  | { readonly kind: 'milestone'; readonly label: string; readonly milestoneId: string }
  | { readonly kind: 'manual_condition'; readonly label: string; readonly manualConditionId: string }
  | { readonly kind: 'measurement'; readonly label: string; readonly measurementId: string };

export type PlanMilestoneSummary = {
  readonly id: string;
  readonly title: string;
  readonly lifecycle: PlannerPlanMilestone['lifecycle'];
  readonly classification: PlanClassification;
  readonly availableActions: readonly PlanActionIntent[];
};

export type PlanMeasurementSummary = {
  readonly id: string;
  readonly label: string;
  readonly classification: PlanClassification;
  readonly targetReached: boolean;
};

export type PlanSummaryProjection = {
  readonly id: string;
  readonly objective: string;
  readonly scope: PlanScope;
  readonly lifecycle: PlanLifecycle;
  readonly archived: boolean;
  readonly trashed: boolean;
  readonly draft: boolean;
  readonly version: number;
  readonly currentBlocker: PlanBlocker | null;
  readonly nextCommitment: PlanCommitment | null;
  readonly currentMilestone: PlanMilestoneSummary | null;
  readonly primaryMeasurement: PlanMeasurementSummary | null;
  readonly indicators: readonly PlanIndicator[];
  readonly availableActions: readonly PlanActionIntent[];
  readonly detailNavigationIntent: PlannerEntityDetailParams;
  readonly syncVisualState: PlanSyncVisualState;
};

export type PlanRootSectionKey = 'active' | 'paused' | 'terminal' | 'drafts';

export type PlanRootSection = {
  readonly key: PlanRootSectionKey;
  readonly title: string;
  readonly plans: readonly PlanSummaryProjection[];
};

export type PlanDetailProjection = {
  readonly summary: PlanSummaryProjection;
  readonly priority: readonly (
    | { readonly key: 'blocker'; readonly value: PlanBlocker }
    | { readonly key: 'next_commitment'; readonly value: PlanCommitment }
    | { readonly key: 'current_milestone'; readonly value: PlanMilestoneSummary }
    | { readonly key: 'actions'; readonly value: readonly PlanActionIntent[] }
    | { readonly key: 'primary_measurement'; readonly value: PlanMeasurementSummary }
    | { readonly key: 'structure_access'; readonly value: { readonly label: 'Editar estructura' } }
  )[];
  readonly measurements: readonly PlanMeasurementSummary[];
  readonly milestones: readonly PlanMilestoneSummary[];
  readonly requirements: readonly PlannerPlanRequirement[];
  readonly manualConditions: readonly PlannerPlanManualCondition[];
  readonly linkedNavigationIntents: readonly PlannerEntityDetailParams[];
  readonly layout: {
    readonly phone: 'full_screen';
    readonly tablet: 'master_detail_available';
  };
};

type PlanDetailPriorityItem = PlanDetailProjection['priority'][number];

export const plansRootScreenAdapter: PlannerRootScreenAdapter = {
  key: 'plans',
  developmentState: 'available',
};

export const plansDetailRoute = {
  routeName: ROUTE_NAMES.PlanDetail,
  parseParams: parsePlannerEntityDetailParams,
} as const;

export const planCreateAdapter: PlannerFormAdapterContract<MinimalPlanCreatePayload> = {
  mode: 'create',
  createIdentity: () => {
    const intent = createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.plan' });
    return {
      mutationId: intent.mutationId,
      idempotencyKey: intent.idempotencyKey ?? '',
    };
  },
  validate: (payload) => validateMinimalPlanCreate(payload),
};

export const planStructureEditAdapter: PlannerFormAdapterContract<PlanStructureDraft> = {
  mode: 'edit',
  createIdentity: () => {
    const intent = createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.plan.structure' });
    return {
      mutationId: intent.mutationId,
      idempotencyKey: intent.idempotencyKey ?? '',
    };
  },
  validate: (payload) => validatePlanStructureDraft(payload),
};

const plansLaneCreateAdapter: PlannerFormAdapterContract = {
  mode: planCreateAdapter.mode,
  createIdentity: planCreateAdapter.createIdentity,
  validate: (payload) => (
    isMinimalPlanCreatePayload(payload)
      ? planCreateAdapter.validate(payload)
      : ['El plan necesita un formulario valido.']
  ),
};

const plansLaneStructureEditAdapter: PlannerFormAdapterContract = {
  mode: planStructureEditAdapter.mode,
  createIdentity: planStructureEditAdapter.createIdentity,
  validate: (payload) => (
    isPlanStructureDraft(payload)
      ? planStructureEditAdapter.validate(payload)
      : ['La estructura del plan no es valida.']
  ),
};

export const planSummaryProjection = {
  project: projectPlanSummary,
  projectRootSections: projectPlanRootSections,
  projectDetail: projectPlanDetail,
  projectArchive: projectPlanArchive,
  projectTrash: projectPlanTrash,
} as const;

export const planLifecycleMutationReducers: PlannerMutationReducerContract<
  readonly PlanSummaryProjection[],
  PlannerMutationResult<PlannerPlan>
> = {
  applyOptimistic: (state) => state,
  reconcile: (state, result) => reconcilePlanLifecycleList(state, result),
  rollback: (state) => state,
};

const plansLaneLifecycleMutationReducers: PlannerMutationReducerContract = {
  applyOptimistic: (state) => state,
  reconcile: (state, result) => {
    if (!isPlanSummaryProjectionArray(state) || !isPlannerPlanMutationResult(result)) return state;
    return reconcilePlanLifecycleList(state, result);
  },
  rollback: (state) => state,
};

export const linkedEntityNavigationIntents: readonly PlannerEntityDetailParams[] = [];

export const plansLaneAdapters: PlansLaneContract = {
  root: plansRootScreenAdapter,
  planSummaryProjection,
  detailRoute: plansDetailRoute,
  createAdapter: plansLaneCreateAdapter,
  structureEditAdapter: plansLaneStructureEditAdapter,
  lifecycleMutationReducers: plansLaneLifecycleMutationReducers,
  linkedEntityNavigationIntents,
} satisfies PlansLaneContract;

export function listCanonicalPlans(
  request: PlannerReadRequest,
  filters: PlanListFilters = {},
): Promise<PlanListResponse> {
  return requestJson<PlanListResponse>(
    `/api/planner/plans${planFiltersToQueryString(filters)}`,
    plannerReadRequestOptions(request),
  );
}

export function getCanonicalPlanGraph(
  request: PlannerReadRequest,
  planId: string,
): Promise<PlannerPlanGraphDto> {
  return requestJson<PlannerPlanGraphDto>(
    `/api/planner/plans/${encodeURIComponent(planId)}`,
    plannerReadRequestOptions(request),
  );
}

export async function writeCanonicalPlanGraph<TData>(
  request: PlannerReadRequest,
  input: PlanGraphWriteRequest,
  intent: PlannerMutationIntent = createPlanWriteIntent(input),
): Promise<PlannerMutationResult<TData>> {
  const body = planGraphWriteBody(input);
  const path = input.planId
    ? `/api/planner/plans/${encodeURIComponent(input.planId)}/mutations`
    : '/api/planner/plans';
  const response = await requestJson<unknown>(path, {
    accessToken: request.accessToken,
    signal: request.signal,
    timeoutMs: request.timeoutMs,
    contextScope: request.contextScope,
    method: 'POST',
    mutationId: intent.mutationId,
    idempotencyKey: intent.idempotencyKey,
    expectedVersion: typeof intent.ifMatch === 'string' ? Number(intent.ifMatch) : intent.ifMatch,
    operationKind: intent.operationKind,
    body,
  });
  return normalizePlannerMutationResult<TData>(response, {
    mutationId: intent.mutationId,
    idempotencyKey: intent.idempotencyKey,
  });
}

export function createPlanWriteIntent(input: Pick<PlanGraphWriteRequest, 'entityType' | 'action' | 'expectedVersion'>): PlannerMutationIntent {
  const entityKind = `planner.plan.${input.entityType}`;
  if (input.action === 'create') {
    return createPlannerMutationIntent({ kind: 'create', entityKind });
  }
  return createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind,
    entityVersion: input.expectedVersion ?? 1,
  });
}

export function buildMinimalPlanCreateWrite(payload: MinimalPlanCreatePayload): PlanGraphWriteRequest {
  const finalizationKind = payload.finalizationKind ?? (payload.targetDate ? 'date' : 'none');
  return {
    entityType: 'plan',
    action: 'create',
    planId: null,
    entityId: null,
    expectedVersion: null,
    expectedPlanVersion: null,
    payload: {
      objective: payload.objective.trim(),
      scope: payload.scope,
      household_id: payload.scope === 'household' ? payload.householdId ?? null : null,
      description: payload.description?.trim() || null,
      target_date: payload.targetDate ?? null,
      finalization_kind: finalizationKind,
      desired_outcome: payload.outcome,
      initial_structure: payload.initialStructure ? serializeStructureDraft(payload.initialStructure) : null,
    },
  };
}

export function hasMeaningfulPlanCreateContent(payload: MinimalPlanCreatePayload): boolean {
  if (payload.objective.trim().length > 0) return true;
  if (payload.description?.trim()) return true;
  if (payload.targetDate) return true;
  if (payload.finalizationKind && payload.finalizationKind !== 'none') return true;
  return Boolean(payload.initialStructure && payload.initialStructure.nodes.length > 0);
}

export function shouldPersistPlanDraft(payload: MinimalPlanCreatePayload): boolean {
  return payload.outcome === 'save_draft' && hasMeaningfulPlanCreateContent(payload);
}

export function buildPlanLifecycleWrite(
  plan: Pick<PlannerPlan, 'id' | 'version'>,
  transition: PlanLifecycleTransition,
  options: { readonly closedReason?: string | null } = {},
): PlanGraphWriteRequest {
  return {
    entityType: 'plan',
    action: 'transition',
    planId: plan.id,
    entityId: plan.id,
    expectedVersion: plan.version,
    expectedPlanVersion: null,
    payload: {
      transition,
      closed_reason: transition === 'close' ? options.closedReason ?? null : undefined,
    },
  };
}

export function buildPlanStructureChangesetWrite(draft: PlanStructureDraft): PlanStructurePersistenceDecision {
  return {
    kind: 'integration_pending',
    canSubmit: false,
    draft,
    validationErrors: validatePlanStructureDraft(draft),
    remoteRequest: null,
    reason: 'backend_structure_changeset_route_unmounted',
    integrationRequest: 'PROPOSED IR-FE-PLAN-STRUCTURE-001',
  };
}

export function projectPlanSummary(
  input: PlannerPlan | PlannerPlanGraphDto,
  visualState: Partial<PlanSyncVisualState> = {},
): PlanSummaryProjection {
  let graph: PlannerPlanGraphDto | null = null;
  let plan: PlannerPlan;
  if (isPlanGraphDto(input)) {
    graph = input;
    plan = input.plan;
  } else {
    plan = input;
  }
  const syncVisualState = normalizeSyncVisualState(visualState);
  return {
    id: plan.id,
    objective: plan.objective,
    scope: plan.scope,
    lifecycle: plan.lifecycle,
    archived: Boolean(plan.archivedAt),
    trashed: Boolean(plan.trashedAt) || plan.lifecycle === 'trash',
    draft: plan.lifecycle === 'draft',
    version: plan.version,
    currentBlocker: graph ? deriveCurrentBlocker(graph, syncVisualState.conflict) : null,
    nextCommitment: graph ? deriveNextCommitment(graph) : null,
    currentMilestone: graph ? deriveCurrentMilestone(graph) : null,
    primaryMeasurement: graph ? derivePrimaryMeasurement(graph.measurements) : null,
    indicators: graph ? deriveRealIndicators(graph) : deriveListIndicators(plan),
    availableActions: actionsForPlan(plan),
    detailNavigationIntent: buildPlannerEntityDetailParams({
      entityId: plan.id,
      source: 'planner',
      returnTo: 'planner',
    }),
    syncVisualState,
  };
}

export function projectPlanRootSections(plans: readonly PlanSummaryProjection[]): readonly PlanRootSection[] {
  const visible = plans.filter((plan) => !plan.archived && !plan.trashed);
  const sections: PlanRootSection[] = [
    {
      key: 'active',
      title: 'Activos',
      plans: visible.filter((plan) => plan.lifecycle === 'active'),
    },
    {
      key: 'paused',
      title: 'Pausados',
      plans: visible.filter((plan) => plan.lifecycle === 'paused'),
    },
    {
      key: 'terminal',
      title: 'Completados y cerrados',
      plans: visible.filter((plan) => plan.lifecycle === 'completed' || plan.lifecycle === 'closed'),
    },
  ];
  const drafts = visible.filter((plan) => plan.lifecycle === 'draft');
  if (drafts.length > 0) {
    sections.push({
      key: 'drafts',
      title: 'Borradores',
      plans: drafts,
    });
  }
  return sections.filter((section) => section.plans.length > 0);
}

export function projectPlanDetail(
  graph: PlannerPlanGraphDto,
  visualState: Partial<PlanSyncVisualState> = {},
): PlanDetailProjection {
  const summary = projectPlanSummary(graph, visualState);
  const actions = summary.availableActions.filter((action) => action.primary || action.key === 'edit_structure');
  const priority: PlanDetailPriorityItem[] = [];
  if (summary.currentBlocker) priority.push({ key: 'blocker', value: summary.currentBlocker });
  if (summary.nextCommitment) priority.push({ key: 'next_commitment', value: summary.nextCommitment });
  if (summary.currentMilestone) priority.push({ key: 'current_milestone', value: summary.currentMilestone });
  if (actions.length > 0) priority.push({ key: 'actions', value: actions });
  if (summary.primaryMeasurement) priority.push({ key: 'primary_measurement', value: summary.primaryMeasurement });
  priority.push({ key: 'structure_access', value: { label: 'Editar estructura' } });

  return {
    summary,
    priority,
    measurements: graph.measurements.map(measurementToSummary),
    milestones: graph.milestones.map(milestoneToSummary),
    requirements: graph.requirements,
    manualConditions: graph.manualConditions,
    linkedNavigationIntents: deriveLinkedNavigationIntents(graph),
    layout: {
      phone: 'full_screen',
      tablet: 'master_detail_available',
    },
  };
}

export function projectPlanArchive(plans: readonly PlannerPlan[]): readonly PlanSummaryProjection[] {
  return plans
    .filter((plan) => Boolean(plan.archivedAt) && !plan.trashedAt)
    .map((plan) => projectPlanSummary(plan));
}

export function projectPlanTrash(plans: readonly PlannerPlan[]): readonly PlanSummaryProjection[] {
  return plans
    .filter((plan) => Boolean(plan.trashedAt) || plan.lifecycle === 'trash')
    .map((plan) => projectPlanSummary(plan));
}

export function planVisibleCopyTokens(): readonly string[] {
  return [
    'Plan',
    'Planes',
    'Crear plan',
    'Guardar como borrador',
    'Cancelar',
    'Editar estructura',
    'Enviar a papelera',
    'Restaurar',
  ];
}

export function getPlanResponsiveContract(width: number): PlanDetailProjection['layout'] {
  void width;
  return {
    phone: 'full_screen',
    tablet: 'master_detail_available',
  };
}

export function getPlanMotionContract(reduceMotion: boolean) {
  return {
    rowPress: getPlannerMotionSpec('press', reduceMotion),
    stateFeedback: getPlannerMotionSpec('state_transition', reduceMotion),
    rollback: getPlannerMotionSpec('feedback_rollback', reduceMotion),
  };
}

function planGraphWriteBody(input: PlanGraphWriteRequest): Readonly<Record<string, unknown>> {
  return {
    entityType: input.entityType,
    action: input.action,
    planId: input.planId ?? null,
    entityId: input.entityId ?? null,
    expectedPlanVersion: input.expectedPlanVersion ?? null,
    payload: input.payload ?? {},
  };
}

function planFiltersToQueryString(filters: PlanListFilters): string {
  const params = new URLSearchParams();
  if (filters.scope) params.set('scope', filters.scope);
  if (filters.lifecycle) params.set('lifecycle', filters.lifecycle);
  if (filters.archived !== undefined) params.set('archived', filters.archived ? 'true' : 'false');
  const query = params.toString();
  return query ? `?${query}` : '';
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlanScope(value: unknown): value is PlanScope {
  return value === 'personal' || value === 'household';
}

function isPlanLifecycle(value: unknown): value is PlanLifecycle {
  return (
    value === 'draft'
    || value === 'active'
    || value === 'paused'
    || value === 'completed'
    || value === 'closed'
    || value === 'trash'
  );
}

function isPlanGraphEntityType(value: unknown): value is Exclude<PlanGraphEntityType, 'plan'> {
  return value === 'milestone' || value === 'measurement' || value === 'manual_condition' || value === 'requirement';
}

function isPlanGraphWriteAction(value: unknown): value is PlanGraphWriteAction {
  return (
    value === 'create'
    || value === 'update'
    || value === 'transition'
    || value === 'complete'
    || value === 'reopen'
    || value === 'record'
    || value === 'set'
    || value === 'trash'
    || value === 'restore'
  );
}

function isMinimalPlanCreatePayload(value: unknown): value is MinimalPlanCreatePayload {
  if (!isRecord(value)) return false;
  const initialStructure = value.initialStructure;
  const finalizationKind = value.finalizationKind;
  return (
    typeof value.objective === 'string'
    && isPlanScope(value.scope)
    && (value.householdId === undefined || value.householdId === null || typeof value.householdId === 'string')
    && (value.description === undefined || value.description === null || typeof value.description === 'string')
    && (value.targetDate === undefined || value.targetDate === null || typeof value.targetDate === 'string')
    && (
      finalizationKind === undefined
      || finalizationKind === 'none'
      || finalizationKind === 'date'
      || finalizationKind === 'event'
    )
    && (initialStructure === undefined || initialStructure === null || isPlanStructureDraft(initialStructure))
    && (value.outcome === 'activate_when_valid' || value.outcome === 'save_draft')
  );
}

function isPlanStructureDraft(value: unknown): value is PlanStructureDraft {
  if (!isRecord(value) || typeof value.planId !== 'string' || typeof value.expectedPlanVersion !== 'number') {
    return false;
  }
  return Array.isArray(value.nodes) && value.nodes.every(isPlanStructureNodeDraft);
}

function isPlanStructureNodeDraft(value: unknown): value is PlanStructureNodeDraft {
  if (!isRecord(value)) return false;
  return (
    typeof value.localId === 'string'
    && isPlanGraphEntityType(value.entityType)
    && isPlanGraphWriteAction(value.action)
    && isRecord(value.payload)
  );
}

function isPlannerPlan(value: unknown): value is PlannerPlan {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string'
    && typeof value.version === 'number'
    && isPlanScope(value.scope)
    && typeof value.objective === 'string'
    && isPlanLifecycle(value.lifecycle)
    && Array.isArray(value.availableActions)
  );
}

function isPlannerPlanMutationResult(value: unknown): value is PlannerMutationResult<PlannerPlan> {
  return isRecord(value) && isPlannerPlan(value.data);
}

function isPlanSummaryProjection(value: unknown): value is PlanSummaryProjection {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string'
    && typeof value.objective === 'string'
    && isPlanScope(value.scope)
    && isPlanLifecycle(value.lifecycle)
    && typeof value.version === 'number'
  );
}

function isPlanSummaryProjectionArray(value: unknown): value is readonly PlanSummaryProjection[] {
  return Array.isArray(value) && value.every(isPlanSummaryProjection);
}

function validateMinimalPlanCreate(payload: MinimalPlanCreatePayload): readonly string[] {
  const errors: string[] = [];
  if (!payload.objective.trim()) errors.push('objective_required');
  if (payload.scope !== 'personal' && payload.scope !== 'household') errors.push('scope_invalid');
  if (payload.scope === 'household' && !payload.householdId) errors.push('household_required');
  if (payload.outcome !== 'activate_when_valid' && payload.outcome !== 'save_draft') errors.push('outcome_required');
  if (payload.outcome === 'save_draft' && !hasMeaningfulPlanCreateContent(payload)) {
    errors.push('empty_draft_not_persisted');
  }
  if (payload.initialStructure) errors.push(...validatePlanStructureDraft(payload.initialStructure));
  return errors;
}

function validatePlanStructureDraft(payload: PlanStructureDraft): readonly string[] {
  const errors: string[] = [];
  if (!payload.planId) errors.push('plan_id_required');
  if (!Number.isInteger(payload.expectedPlanVersion) || payload.expectedPlanVersion < 1) {
    errors.push('expected_plan_version_required');
  }
  for (const node of payload.nodes) {
    if (!node.localId) errors.push('node_local_id_required');
    if (!['milestone', 'measurement', 'manual_condition', 'requirement'].includes(node.entityType)) {
      errors.push('node_entity_invalid');
    }
    if (node.action !== 'create' && (!Number.isInteger(node.expectedVersion) || Number(node.expectedVersion) < 1)) {
      errors.push('node_expected_version_required');
    }
  }
  return errors;
}

function serializeStructureDraft(draft: PlanStructureDraft): Readonly<Record<string, unknown>> {
  return {
    plan_id: draft.planId,
    expected_plan_version: draft.expectedPlanVersion,
    children_contained: true,
    operation_count: draft.nodes.length,
    operations: draft.nodes.map((node, index) => ({
      local_id: node.localId,
      entity_type: node.entityType,
      action: node.action,
      entity_id: node.entityId ?? null,
      expected_version: node.expectedVersion ?? null,
      expected_plan_version: draft.expectedPlanVersion,
      parent_requirement_id: node.parentRequirementId ?? null,
      classification: node.classification ?? null,
      sort_order: node.sortOrder ?? index,
      payload: node.payload,
    })),
  };
}

function isPlanGraphDto(input: PlannerPlan | PlannerPlanGraphDto): input is PlannerPlanGraphDto {
  return Boolean((input as PlannerPlanGraphDto).plan && (input as PlannerPlanGraphDto).indicators);
}

function normalizeSyncVisualState(input: Partial<PlanSyncVisualState>): PlanSyncVisualState {
  if (input.conflict) return { kind: 'conflict', pending: false, uncertain: false, conflict: true };
  if (input.uncertain) return { kind: 'pending_sync', pending: true, uncertain: true, conflict: false };
  if (input.pending) return { kind: input.kind ?? 'pending_sync', pending: true, uncertain: false, conflict: false };
  return {
    kind: input.kind ?? 'refresh_visible',
    pending: false,
    uncertain: false,
    conflict: false,
  };
}

function deriveCurrentBlocker(graph: PlannerPlanGraphDto, conflict: boolean): PlanBlocker | null {
  if (conflict) return { kind: 'conflict', label: 'Hay cambios por revisar antes de continuar.' };
  const necessaryRequirements = graph.requirements
    .filter((requirement) => requirement.classification === 'necessary' && !requirement.satisfied)
    .sort(sortByOrder);

  for (const requirement of necessaryRequirements) {
    const subject = requirement.subject;
    if (subject.kind === 'measurement') {
      const measurement = graph.measurements.find((item) => item.id === subject.measurementId);
      if (measurement && measurement.targetValue === null) {
        return {
          kind: 'measurement_missing_target',
          measurementId: measurement.id,
          label: `${measurement.name}: falta definir objetivo.`,
        };
      }
    }
  }

  const finalEvent = necessaryRequirements.find((requirement) => (
    requirement.subject.kind === 'external' && requirement.subject.externalKind === 'event'
  ));
  if (finalEvent) {
    return {
      kind: 'final_event_pending',
      requirementId: finalEvent.id,
      label: 'Evento final pendiente.',
    };
  }

  for (const requirement of necessaryRequirements) {
    const subject = requirement.subject;
    if (subject.kind === 'milestone') {
      const milestone = graph.milestones.find((item) => item.id === subject.milestoneId);
      if (milestone && milestone.lifecycle !== 'completed') {
        return {
          kind: 'milestone_pending',
          milestoneId: milestone.id,
          label: `${milestone.title}: hito necesario pendiente.`,
        };
      }
    }
  }

  for (const requirement of necessaryRequirements) {
    const subject = requirement.subject;
    if (subject.kind === 'manual_condition') {
      const condition = graph.manualConditions.find((item) => item.id === subject.manualConditionId);
      if (condition && !condition.isSatisfied) {
        return {
          kind: 'manual_condition_pending',
          manualConditionId: condition.id,
          label: `${condition.label}: condicion necesaria pendiente.`,
        };
      }
    }
  }

  const first = necessaryRequirements[0];
  return first ? {
    kind: 'requirement',
    requirementId: first.id,
    label: requirementLabel(first, graph),
  } : null;
}

function deriveNextCommitment(graph: PlannerPlanGraphDto): PlanCommitment | null {
  const external = graph.requirements
    .filter((requirement) => requirement.classification === 'necessary' && !requirement.satisfied && requirement.subject.kind === 'external')
    .sort(sortByOrder)[0];
  if (external?.subject.kind === 'external') {
    return {
      kind: external.subject.externalKind,
      label: external.subject.externalKind === 'task' ? 'Tarea vinculada pendiente.' : 'Evento vinculado pendiente.',
      navigation: externalNavigationIntent(external),
    };
  }

  const manual = graph.manualConditions
    .filter((condition) => condition.classification === 'necessary' && !condition.isSatisfied)
    .sort(sortByOrder)[0];
  if (manual) {
    return { kind: 'manual_condition', label: manual.label, manualConditionId: manual.id };
  }

  const milestone = graph.milestones
    .filter((item) => item.lifecycle === 'pending')
    .sort(sortByOrder)[0];
  if (milestone) {
    return { kind: 'milestone', label: milestone.title, milestoneId: milestone.id };
  }

  const measurement = graph.measurements
    .filter((item) => !item.targetReached)
    .sort(sortByOrder)[0];
  if (measurement) {
    return { kind: 'measurement', label: measurementToSummary(measurement).label, measurementId: measurement.id };
  }

  return null;
}

function deriveCurrentMilestone(graph: PlannerPlanGraphDto): PlanMilestoneSummary | null {
  const current = graph.milestones
    .filter((milestone) => milestone.lifecycle === 'pending')
    .sort((a, b) => {
      if (a.classification !== b.classification) return a.classification === 'necessary' ? -1 : 1;
      return sortByOrder(a, b);
    })[0];
  return current ? milestoneToSummary(current) : null;
}

function derivePrimaryMeasurement(measurements: readonly PlannerPlanMeasurement[]): PlanMeasurementSummary | null {
  const measurement = [...measurements].sort((a, b) => {
    if (a.classification !== b.classification) return a.classification === 'necessary' ? -1 : 1;
    return sortByOrder(a, b);
  })[0];
  return measurement ? measurementToSummary(measurement) : null;
}

function deriveRealIndicators(graph: PlannerPlanGraphDto): readonly PlanIndicator[] {
  const indicators: PlanIndicator[] = [];
  const i = graph.indicators;
  if (i.milestoneCount > 0) {
    indicators.push({
      key: 'milestones',
      label: `${i.completedMilestoneCount} de ${i.milestoneCount} hitos completados`,
      emphasis: 'secondary',
    });
  }
  for (const measurement of graph.measurements) {
    indicators.push({
      key: `measurement:${measurement.id}`,
      label: measurementToSummary(measurement).label,
      emphasis: measurement.classification === 'necessary' && !measurement.targetReached ? 'warning' : 'secondary',
    });
  }
  const pendingNecessary = i.necessaryRequirementCount - i.satisfiedNecessaryRequirementCount;
  if (i.necessaryRequirementCount > 0) {
    indicators.push({
      key: 'necessary_requirements',
      label: `${pendingNecessary} requisitos necesarios pendientes`,
      emphasis: pendingNecessary > 0 ? 'warning' : 'secondary',
    });
  }
  const finalEventPending = graph.requirements.some((requirement) => (
    requirement.classification === 'necessary'
    && !requirement.satisfied
    && requirement.subject.kind === 'external'
    && requirement.subject.externalKind === 'event'
  ));
  if (finalEventPending) {
    indicators.push({
      key: 'final_event',
      label: 'Evento final pendiente',
      emphasis: 'warning',
    });
  }
  const openActions = countOpenActions(graph);
  if (openActions > 0) {
    indicators.push({
      key: 'open_actions',
      label: `${openActions} acciones abiertas`,
      emphasis: 'secondary',
    });
  }
  return indicators;
}

function deriveListIndicators(plan: PlannerPlan): readonly PlanIndicator[] {
  const indicators: PlanIndicator[] = [{
    key: 'lifecycle',
    label: lifecycleLabel(plan.lifecycle),
    emphasis: plan.lifecycle === 'paused' ? 'warning' : 'secondary',
  }];
  if (plan.targetDate) {
    indicators.push({
      key: 'target_date',
      label: `Fecha objetivo ${plan.targetDate}`,
      emphasis: 'secondary',
    });
  }
  return indicators;
}

function actionsForPlan(plan: PlannerPlan): readonly PlanActionIntent[] {
  const actions = plan.availableActions.map((action) => actionIntent(action));
  if (plan.lifecycle !== 'trash' && !plan.trashedAt) {
    actions.unshift({
      key: 'edit_structure',
      label: 'Editar estructura',
      destructive: false,
      primary: false,
    });
  }
  return actions;
}

function actionIntent(action: string): PlanActionIntent {
  const labels: Record<string, string> = {
    update: 'Editar',
    activate: 'Activar',
    pause: 'Pausar',
    resume: 'Reanudar',
    complete: 'Completar',
    close: 'Cerrar',
    reopen: 'Reabrir',
    archive: 'Archivar',
    unarchive: 'Desarchivar',
    trash: 'Enviar a papelera',
    restore: 'Restaurar',
  };
  return {
    key: action,
    label: labels[action] ?? action,
    destructive: action === 'trash' || action === 'close',
    primary: action === 'activate' || action === 'resume' || action === 'complete' || action === 'restore',
  };
}

function lifecycleLabel(lifecycle: PlanLifecycle): string {
  const labels: Record<PlanLifecycle, string> = {
    draft: 'Borrador',
    active: 'Activo',
    paused: 'Pausado',
    completed: 'Completado',
    closed: 'Cerrado',
    trash: 'Papelera',
  };
  return labels[lifecycle];
}

function milestoneToSummary(milestone: PlannerPlanMilestone): PlanMilestoneSummary {
  return {
    id: milestone.id,
    title: milestone.title,
    lifecycle: milestone.lifecycle,
    classification: milestone.classification,
    availableActions: milestone.completionMode === 'manual'
      ? [
          actionIntent(milestone.lifecycle === 'completed' ? 'reopen' : 'complete'),
          actionIntent('trash'),
        ]
      : [actionIntent('trash')],
  };
}

function measurementToSummary(measurement: PlannerPlanMeasurement): PlanMeasurementSummary {
  const target = measurement.targetValue === null
    ? 'sin objetivo definido'
    : `${formatNumber(measurement.targetValue)} ${measurement.unit}`;
  return {
    id: measurement.id,
    label: `${measurement.name}: ${formatNumber(measurement.currentValue)} de ${target}`,
    classification: measurement.classification,
    targetReached: measurement.targetReached,
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function countOpenActions(graph: PlannerPlanGraphDto): number {
  const openMilestones = graph.milestones.filter((item) => item.lifecycle === 'pending').length;
  const openManual = graph.manualConditions.filter((item) => !item.isSatisfied).length;
  const openMeasurements = graph.measurements.filter((item) => !item.targetReached).length;
  const openExternal = graph.requirements.filter((requirement) => (
    !requirement.satisfied && requirement.subject.kind === 'external'
  )).length;
  return openMilestones + openManual + openMeasurements + openExternal;
}

function deriveLinkedNavigationIntents(graph: PlannerPlanGraphDto): readonly PlannerEntityDetailParams[] {
  return graph.requirements
    .map(externalNavigationIntent)
    .filter((intent): intent is PlannerEntityDetailParams => intent !== null);
}

function externalNavigationIntent(requirement: PlannerPlanRequirement): PlannerEntityDetailParams | null {
  if (requirement.subject.kind !== 'external') return null;
  const futureSubject = requirement.subject as typeof requirement.subject & { readonly externalEntityId?: string | null };
  if (!futureSubject.externalEntityId) return null;
  return buildPlannerEntityDetailParams({
    entityId: futureSubject.externalEntityId,
    source: 'planner',
    returnTo: 'planner',
  });
}

function requirementLabel(requirement: PlannerPlanRequirement, graph: PlannerPlanGraphDto): string {
  const subject = requirement.subject;
  if (subject.kind === 'milestone') {
    return graph.milestones.find((item) => item.id === subject.milestoneId)?.title
      ?? 'Hito necesario pendiente.';
  }
  if (subject.kind === 'measurement') {
    return graph.measurements.find((item) => item.id === subject.measurementId)?.name
      ?? 'Medicion necesaria pendiente.';
  }
  if (subject.kind === 'manual_condition') {
    return graph.manualConditions.find((item) => item.id === subject.manualConditionId)?.label
      ?? 'Condicion necesaria pendiente.';
  }
  return subject.externalKind === 'task' ? 'Tarea vinculada pendiente.' : 'Evento vinculado pendiente.';
}

function sortByOrder(a: { readonly sortOrder: number }, b: { readonly sortOrder: number }): number {
  return a.sortOrder - b.sortOrder;
}

function reconcilePlanLifecycleList(
  state: readonly PlanSummaryProjection[],
  result: PlannerMutationResult<PlannerPlan>,
): readonly PlanSummaryProjection[] {
  const updated = projectPlanSummary(result.data);
  return state.map((item) => (item.id === updated.id ? updated : item));
}
