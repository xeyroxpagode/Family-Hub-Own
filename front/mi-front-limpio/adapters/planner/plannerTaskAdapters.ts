import type {
  PlannerDetailRouteComponentContract,
  PlannerFormAdapterContract,
  PlannerMutationReducerContract,
  PlannerRootScreenAdapter,
  TasksLaneContract,
} from '../../services/planner/plannerParallelContracts';
import type { PlannerCalendarProjection } from '../../services/planner/plannerCalendarProjection';
import {
  applyPlannerOptimistic,
  markPlannerConflict,
  preserveUncertainPlannerOptimistic,
  reconcilePlannerOptimistic,
  rollbackPlannerOptimistic,
  type PlannerOptimisticOperation,
} from '../../services/planner/plannerOptimisticState';
import {
  buildPlannerVersionedIntent,
  createPlannerCreateIdentity,
  type PlannerMutationIdentity,
  type PlannerMutationOutcome,
} from '../../services/planner/plannerTransportContracts';
import { createPlannerFormState, reducePlannerFormState } from '../../services/planner/plannerFormState';
import { describePlannerVisualState, type PlannerVisualStateKind } from '../../services/planner/plannerVisualStates';
import { plannerKeys, type PlannerHouseholdScope } from '../../services/planner/plannerKeys';
import { parsePlannerEntityDetailParams, ROUTE_NAMES } from '../../navigation/plannerNavigationContract';
import type {
  PlannerTaskAvailableAction,
  PlannerTaskAvailableActionKey,
  PlannerTaskCalendarProjectionV1,
  PlannerTaskDtoV1,
  PlannerTaskLocalMutationState,
  PlannerTaskProjection,
  PlannerTaskRowAction,
  PlannerTaskScope,
} from '../../types/plannerTaskV1';

export const plannerTasksRootAdapter: PlannerRootScreenAdapter & {
  readonly componentName: 'PlannerTasksScreen';
  readonly queryRequirements: readonly string[];
  readonly refreshBehavior: 'stale_while_refresh';
  readonly emptyState: 'dataset_and_filtered';
  readonly views: readonly ['day', 'week', 'month', 'no_date', 'filtered'];
  readonly navigationIntents: readonly ['detail'];
  readonly createIntent: 'open_task_form';
  readonly integrationWiringRequired: 'IR-FRONTEND-TASKS-WIRING-001';
} = {
  key: 'tasks',
  developmentState: 'integration_pending',
  componentName: 'PlannerTasksScreen',
  queryRequirements: ['planner.tasks.list', 'planner.tasks.detail', 'planner.tasks.fulfillment'],
  refreshBehavior: 'stale_while_refresh',
  emptyState: 'dataset_and_filtered',
  views: ['day', 'week', 'month', 'no_date', 'filtered'],
  navigationIntents: ['detail'],
  createIntent: 'open_task_form',
  integrationWiringRequired: 'IR-FRONTEND-TASKS-WIRING-001',
};

export const plannerTaskDetailRouteAdapter: PlannerDetailRouteComponentContract = {
  routeName: ROUTE_NAMES.TaskDetail,
  parseParams: parsePlannerEntityDetailParams,
};

export type PlannerTaskFormValues = {
  readonly title: string;
  readonly description?: string;
  readonly scope: PlannerTaskScope;
  readonly date: string | null;
  readonly time: string | null;
  readonly assignmentKind: 'anyone' | 'members';
  readonly fulfillmentMode: 'shared_once' | 'each_person';
  readonly memberIds: readonly string[];
  readonly requiresVerification: boolean;
  readonly recurrenceRule?: string | null;
};

const validateTaskFormValues = (payload: PlannerTaskFormValues): readonly string[] => {
  const errors: string[] = [];
  if (!payload.title.trim()) errors.push('title_required');
  if (payload.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) errors.push('date_invalid');
  if (payload.time !== null && !/^\d{2}:\d{2}$/.test(payload.time)) errors.push('time_invalid');
  if (payload.scope === 'personal' && payload.assignmentKind === 'anyone') errors.push('personal_anyone_not_allowed');
  if (payload.assignmentKind === 'members' && payload.memberIds.length === 0) errors.push('member_required');
  return errors;
};

export const plannerTaskCreateFormAdapter: PlannerFormAdapterContract<PlannerTaskFormValues> & {
  readonly supportedModes: readonly ['quick', 'full'];
  readonly initialValues: PlannerTaskFormValues;
  readonly stateMachine: ReturnType<typeof createPlannerFormState<PlannerTaskFormValues>>;
} = {
  mode: 'create',
  supportedModes: ['quick', 'full'],
  createIdentity: () => createPlannerCreateIdentity('task'),
  validate: validateTaskFormValues,
  initialValues: {
    title: '',
    description: '',
    scope: 'household',
    date: null,
    time: null,
    assignmentKind: 'anyone',
    fulfillmentMode: 'shared_once',
    memberIds: [],
    requiresVerification: false,
    recurrenceRule: null,
  },
  stateMachine: createPlannerFormState({
    title: '',
    description: '',
    scope: 'household',
    date: null,
    time: null,
    assignmentKind: 'anyone',
    fulfillmentMode: 'shared_once',
    memberIds: [],
    requiresVerification: false,
    recurrenceRule: null,
  }),
};

export const plannerTaskEditFormAdapter: PlannerFormAdapterContract<PlannerTaskFormValues> & {
  readonly supportedModes: readonly ['edit'];
  readonly createVersionedIdentity: (expectedVersion: number) => PlannerMutationIdentity & { readonly expectedVersion: number };
  readonly reduceState: typeof reducePlannerFormState<PlannerTaskFormValues>;
} = {
  mode: 'edit',
  supportedModes: ['edit'],
  createIdentity: () => createPlannerCreateIdentity('task'),
  createVersionedIdentity: (expectedVersion: number) => {
    const intent = buildPlannerVersionedIntent('task', expectedVersion);
    return {
      mutationId: intent.mutationId,
      idempotencyKey: intent.idempotencyKey ?? '',
      expectedVersion,
    };
  },
  validate: validateTaskFormValues,
  reduceState: reducePlannerFormState,
};

export type PlannerTaskMutationListState = {
  readonly tasks: readonly PlannerTaskProjection[];
  readonly operations: ReadonlyMap<string, PlannerOptimisticOperation<readonly PlannerTaskProjection[]>>;
};

export type PlannerTaskMutationResult = {
  readonly task?: PlannerTaskDtoV1;
  readonly projection?: PlannerTaskProjection;
  readonly outcome: PlannerMutationOutcome;
};

export const plannerTaskMutationReducers: PlannerMutationReducerContract<
  PlannerTaskMutationListState,
  PlannerTaskMutationResult
> & {
  readonly applyRowOptimistic: (
    state: PlannerTaskMutationListState,
    taskId: string,
    identity: PlannerMutationIdentity,
    contextToken: number,
    patch: (task: PlannerTaskProjection) => PlannerTaskProjection,
  ) => PlannerTaskMutationListState;
  readonly markUncertain: (state: PlannerTaskMutationListState, taskId: string) => PlannerTaskMutationListState;
  readonly markConflict: (state: PlannerTaskMutationListState, taskId: string) => PlannerTaskMutationListState;
} = {
  applyOptimistic: (state) => state,
  reconcile: (state, result) => {
    const projection = result.projection ?? (result.task ? projectPlannerTask(result.task) : null);
    if (!projection) return state;
    const operation = state.operations.get(projection.id);
    const nextTasks = state.tasks.some((item) => item.id === projection.id)
      ? state.tasks.map((item) => (item.id === projection.id ? projection : item))
      : [projection, ...state.tasks];
    if (!operation) return { ...state, tasks: nextTasks };
    const reconciled = reconcilePlannerOptimistic({
      current: nextTasks,
      operation,
      contextToken: operation.baseContextToken,
      outcome: result.outcome,
      confirmed: nextTasks,
    });
    const operations = new Map(state.operations);
    operations.set(projection.id, reconciled.operation);
    return { tasks: reconciled.state, operations };
  },
  rollback: (state) => {
    const last = [...state.operations.values()].find((item) => item.status !== 'confirmed');
    if (!last) return state;
    const rolled = rollbackPlannerOptimistic(last);
    const operations = new Map(state.operations);
    operations.set(last.entityKey, rolled.operation);
    return { tasks: rolled.state, operations };
  },
  applyRowOptimistic: (state, taskId, identity, contextToken, patch) => {
    const decision = applyPlannerOptimistic({
      current: state.tasks,
      identity,
      entityKey: taskId,
      contextToken,
      busy: state.operations,
      apply: (current) => current.map((item) => (item.id === taskId ? patch(item) : item)),
    });
    if (decision.type === 'ignored_stale_context') return state;
    const operations = new Map(state.operations);
    operations.set(taskId, decision.operation);
    return { tasks: decision.operation.optimistic, operations };
  },
  markUncertain: (state, taskId) => updateOperation(state, taskId, preserveUncertainPlannerOptimistic),
  markConflict: (state, taskId) => updateOperation(state, taskId, markPlannerConflict),
};

export const plannerTaskAvailableActionLabels: Readonly<Record<PlannerTaskAvailableActionKey, string>> = {
  update: 'Editar',
  change_assignment: 'Cambiar asignacion',
  claim: 'Me encargo',
  complete: 'Completar',
  submit_for_verification: 'Enviar a revision',
  verify: 'Verificar',
  request_correction: 'Pedir correccion',
  resubmit: 'Reenviar',
  revert: 'Revertir',
  reopen: 'Reabrir',
  cancel: 'Cancelar',
  reactivate: 'Reactivar',
  trash: 'Mover a papelera',
  restore: 'Restaurar',
};

const rowPrimaryActionOrder: readonly PlannerTaskAvailableActionKey[] = [
  'claim',
  'complete',
  'submit_for_verification',
  'verify',
  'resubmit',
  'reactivate',
  'restore',
];

export function mapPlannerTaskAction(action: PlannerTaskAvailableAction): PlannerTaskRowAction | null {
  if (action.disabledReason) return null;
  if (!isPlannerTaskActionKey(action.action)) return null;
  return {
    key: action.action,
    label: plannerTaskAvailableActionLabels[action.action],
    accessibilityLabel: plannerTaskAvailableActionLabels[action.action],
    fulfillmentId: action.fulfillmentId,
    destructive: action.action === 'cancel' || action.action === 'trash',
  };
}

export function getPlannerTaskPrimaryAction(task: PlannerTaskDtoV1): PlannerTaskRowAction | null {
  const actions = normalizeAvailableActions(task);
  for (const key of rowPrimaryActionOrder) {
    const action = actions.find((item) => item.action === key);
    const mapped = action ? mapPlannerTaskAction(action) : null;
    if (mapped) return mapped;
  }
  if (!task.availableActions && task.status === 'pending') {
    return {
      key: task.requires_verification ? 'submit_for_verification' : 'complete',
      label: task.requires_verification ? 'Enviar a revision' : 'Completar',
      accessibilityLabel: task.requires_verification ? 'Enviar tarea a revision' : 'Completar tarea',
      destructive: false,
    };
  }
  return null;
}

export function projectPlannerTask(
  task: PlannerTaskDtoV1,
  localState: PlannerTaskLocalMutationState = 'confirmed',
): PlannerTaskProjection {
  const lifecycle = task.trashed_at ? 'trash' : task.lifecycle ?? task.status;
  const scope = normalizeTaskScope(task);
  const temporalLabel = task.due_date
    ? `${task.due_date}${task.due_time ? ` ${task.due_time.slice(0, 5)}` : ''}`
    : 'Sin fecha';
  const assignmentSummary = summarizeAssignment(task);
  const fulfillmentSummary = summarizeFulfillment(task);
  const primaryAction = getPlannerTaskPrimaryAction(task);
  const exceptionalIndicator = getPlannerTaskException(task);
  const recurrenceSummary = task.recurrenceSummary ?? task.recurrence?.summary ?? null;
  const accessibilityLabel = [
    task.title,
    temporalLabel,
    assignmentSummary,
    fulfillmentSummary,
    exceptionalIndicator,
    recurrenceSummary,
  ].filter(Boolean).join('. ');

  return {
    id: task.id,
    title: task.title,
    version: task.version,
    scope,
    lifecycle,
    date: task.due_date ?? null,
    time: task.due_time ? task.due_time.slice(0, 5) : null,
    temporalLabel,
    assignmentSummary,
    fulfillmentSummary,
    primaryAction,
    exceptionalIndicator,
    recurrenceSummary,
    localState,
    accessibilityLabel,
    navigationIntent: { kind: 'detail', taskId: task.id },
    priority: task.priority,
  };
}

export function projectPlannerTaskForCalendar(task: PlannerTaskDtoV1): PlannerTaskCalendarProjectionV1 | null {
  if (!task.due_date || task.trashed_at || task.status === 'cancelled') return null;
  return {
    taskId: task.id,
    semanticDate: task.due_date.slice(0, 10),
    time: task.due_time ? task.due_time.slice(0, 5) : null,
    title: task.title,
    lifecycle: task.lifecycle ?? task.status,
    relevantState: task.aggregate?.state ?? task.status,
    projectionVersion: 1,
    detailNavigationIntent: { kind: 'detail', taskId: task.id },
    badgeCountContribution: 1,
    stableOrdering: [task.due_date.slice(0, 10), task.due_time ? task.due_time.slice(0, 5) : '', task.id],
  };
}

export function toPlannerCalendarTaskProjection(task: PlannerTaskDtoV1): PlannerCalendarProjection | null {
  const projection = projectPlannerTaskForCalendar(task);
  if (!projection) return null;
  return {
    entityType: 'task',
    entityId: projection.taskId,
    projectionId: `task:${projection.taskId}:${projection.semanticDate}`,
    semanticDate: projection.semanticDate,
    timed: projection.time !== null,
    allDay: projection.time === null,
    start: projection.time ? `${projection.semanticDate}T${projection.time}:00` : null,
    end: null,
    title: projection.title,
    lifecycle: projection.lifecycle,
    destination: {
      route: 'TaskDetail',
      params: { entityId: projection.taskId, source: 'planner', returnTo: 'planner' },
    },
    domainActionKey: projection.relevantState,
  };
}

export function getPlannerTaskCacheKeys(scope: PlannerHouseholdScope, taskId: string, filters: Record<string, unknown> = {}) {
  return {
    rootList: plannerKeys.tasks.all(scope),
    filteredList: plannerKeys.tasks.list(scope, filters),
    detail: plannerKeys.tasks.detail(scope, taskId),
    calendar: plannerKeys.calendar(scope),
    trash: plannerKeys.trash(scope, 'tasks'),
  } as const;
}

export const plannerTaskVisualStateMatrix: Readonly<Record<
  | 'initial_loading'
  | 'refresh'
  | 'stale'
  | 'offline'
  | 'partial_error'
  | 'empty_dataset'
  | 'empty_filtered'
  | 'fatal'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'uncertain'
  | 'optimistic'
  | 'rollback'
  | 'replay'
  | 'noop'
  | 'success',
  ReturnType<typeof describePlannerVisualState>
>> = {
  initial_loading: describePlannerVisualState('initial_skeleton'),
  refresh: describePlannerVisualState('refresh_visible'),
  stale: describePlannerVisualState('stale'),
  offline: describePlannerVisualState('offline'),
  partial_error: describePlannerVisualState('partial_error'),
  empty_dataset: describePlannerVisualState('empty_dataset'),
  empty_filtered: describePlannerVisualState('empty_filtered'),
  fatal: describePlannerVisualState('fatal_error'),
  forbidden: describePlannerVisualState('fatal_error'),
  not_found: describePlannerVisualState('fatal_error'),
  validation: describePlannerVisualState('inline_validation'),
  conflict: describePlannerVisualState('conflict'),
  uncertain: describePlannerVisualState('pending_sync'),
  optimistic: describePlannerVisualState('pending_sync'),
  rollback: describePlannerVisualState('partial_error'),
  replay: describePlannerVisualState('terminal_submit'),
  noop: describePlannerVisualState('terminal_submit'),
  success: describePlannerVisualState('terminal_submit'),
};

const plannerTaskFormContractAdapter: PlannerFormAdapterContract = {
  mode: 'create',
  createIdentity: plannerTaskCreateFormAdapter.createIdentity,
  validate: (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return ['payload_invalid'];
    const record = payload as Partial<PlannerTaskFormValues>;
    return validateTaskFormValues({
      title: typeof record.title === 'string' ? record.title : '',
      description: typeof record.description === 'string' ? record.description : '',
      scope: record.scope === 'personal' ? 'personal' : 'household',
      date: typeof record.date === 'string' ? record.date : null,
      time: typeof record.time === 'string' ? record.time : null,
      assignmentKind: record.assignmentKind === 'members' ? 'members' : 'anyone',
      fulfillmentMode: record.fulfillmentMode === 'each_person' ? 'each_person' : 'shared_once',
      memberIds: Array.isArray(record.memberIds) ? record.memberIds.filter((item): item is string => typeof item === 'string') : [],
      requiresVerification: record.requiresVerification === true,
      recurrenceRule: typeof record.recurrenceRule === 'string' ? record.recurrenceRule : null,
    });
  },
};

const plannerTaskMutationReducerContractAdapter: PlannerMutationReducerContract = {
  applyOptimistic: (state: unknown) => state,
  reconcile: (state: unknown) => state,
  rollback: (state: unknown) => state,
};

export const plannerTasksLaneContract: TasksLaneContract = {
  root: plannerTasksRootAdapter,
  taskProjection: projectPlannerTask,
  calendarProjection: (task) => toPlannerCalendarTaskProjection(task as PlannerTaskDtoV1),
  detailRoute: plannerTaskDetailRouteAdapter,
  formAdapter: plannerTaskFormContractAdapter,
  mutationReducers: plannerTaskMutationReducerContractAdapter,
  availableActionsMapping: plannerTaskAvailableActionLabels,
};

function updateOperation(
  state: PlannerTaskMutationListState,
  taskId: string,
  updater: (operation: PlannerOptimisticOperation<readonly PlannerTaskProjection[]>) => PlannerOptimisticOperation<readonly PlannerTaskProjection[]>,
): PlannerTaskMutationListState {
  const operation = state.operations.get(taskId);
  if (!operation) return state;
  const operations = new Map(state.operations);
  operations.set(taskId, updater(operation));
  return { ...state, operations };
}

function normalizeTaskScope(task: PlannerTaskDtoV1): PlannerTaskScope {
  if (typeof task.scope === 'string') return task.scope;
  if (task.scope?.type === 'personal' || task.owner_person_id) return 'personal';
  return 'household';
}

function summarizeAssignment(task: PlannerTaskDtoV1): string {
  if (task.assignment?.kind === 'anyone') return 'Cualquiera';
  if (task.assignment?.assignees.length) {
    if (task.assignment.assignees.length === 1) {
      return task.assignment.assignees[0]?.displayName ?? 'Una persona';
    }
    return task.assignment.mode === 'each_person'
      ? `${task.assignment.assignees.length} personas, cada una`
      : `${task.assignment.assignees.length} personas, una vez`;
  }
  if (task.assigned_member?.display_name) return task.assigned_member.display_name;
  if (task.assignees?.length) return task.assignees.map((item) => item.displayName ?? 'Miembro').join(', ');
  return normalizeTaskScope(task) === 'personal' ? 'Personal' : 'Cualquiera';
}

function summarizeFulfillment(task: PlannerTaskDtoV1): string {
  if (task.aggregate) {
    if (task.aggregate.state === 'pending') return `${task.aggregate.pending} pendientes`;
    if (task.aggregate.state === 'partially_completed') return `${task.aggregate.completed + task.aggregate.verified} de ${task.aggregate.total} completaron`;
    if (task.aggregate.state === 'awaiting_verification') return 'Esperando revision';
    if (task.aggregate.state === 'correction_requested') return 'Requiere correccion';
    if (task.aggregate.state === 'verified') return 'Verificada';
    return 'Completada';
  }
  if (task.status === 'awaiting_verification') return 'Esperando revision';
  if (task.status === 'verified') return 'Verificada';
  if (task.status === 'completed') return 'Completada';
  if (task.status === 'cancelled') return 'Cancelada';
  return 'Pendiente';
}

function getPlannerTaskException(task: PlannerTaskDtoV1): string | null {
  if (task.trashed_at) return 'En papelera';
  if (task.aggregate?.state === 'correction_requested') return 'Requiere correccion';
  if (task.status === 'awaiting_verification' || task.aggregate?.state === 'awaiting_verification') return 'Por revisar';
  if (task.status === 'cancelled') return 'Cancelada';
  if (task.priority === 'high') return 'Prioridad alta';
  return null;
}

function normalizeAvailableActions(task: PlannerTaskDtoV1): readonly PlannerTaskAvailableAction[] {
  if (task.availableActions) return task.availableActions;
  if (task.trashed_at) return [{ action: 'restore' }];
  if (task.status === 'cancelled') return [{ action: 'reactivate' }, { action: 'trash' }];
  if (task.status === 'awaiting_verification') return [{ action: 'verify' }];
  if (task.status === 'pending') {
    return [{ action: task.requires_verification ? 'submit_for_verification' : 'complete' }, { action: 'cancel' }, { action: 'trash' }];
  }
  return [];
}

function isPlannerTaskActionKey(action: string): action is PlannerTaskAvailableActionKey {
  return action in plannerTaskAvailableActionLabels;
}
