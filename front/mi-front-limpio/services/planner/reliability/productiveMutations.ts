import { ApiError, generateMutationId, OPERATION_KINDS } from '../../api';
import type { PlannerMutationIntent } from '../plannerMutationIntent';
import { tracePlanWrite, type PlanWriteTraceOperation } from '../planWriteTrace';
import type { PlanGraphWriteRequest, PlanStructureChangesetWriteRequest } from '../plannerPlans';
import type { CreatePlannerEventPayload, PlannerEvent } from '../../plannerEvents';
import type { CreatePlannerTaskPayload, PlannerTask, UpdatePlannerTaskPayload } from '../../plannerTasks';
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';
import { getActivePlannerReliabilityRuntime } from './runtime';
import type { PlannerOperationEntity, PlannerOperationRecord } from './types';

type ReliabilityIntentOptions = {
  readonly mutationId?: string;
  readonly idempotencyKey?: string;
  readonly expectedVersion?: number;
};

type EnqueueConfirmedInput<TPayload> = {
  readonly domain: string;
  readonly operationType: string;
  readonly entity?: PlannerOperationEntity;
  readonly payload: TPayload;
  readonly intent: PlannerMutationIntent;
};

const mutationIdsByIdempotencyKey = new Map<string, string>();

function createPlannerReliabilityIntent(input: {
  readonly entityKind: string;
  readonly operationKind: PlannerMutationIntent['operationKind'];
  readonly options?: ReliabilityIntentOptions;
  readonly expectedVersion?: number;
}): PlannerMutationIntent {
  const idempotencyKey = input.options?.idempotencyKey ?? `idem_${input.entityKind}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const mutationId = input.options?.mutationId
    ?? mutationIdsByIdempotencyKey.get(idempotencyKey)
    ?? generateMutationId();
  mutationIdsByIdempotencyKey.set(idempotencyKey, mutationId);
  return {
    mutationId,
    idempotencyKey,
    ifMatch: input.expectedVersion ?? input.options?.expectedVersion,
    operationKind: input.operationKind,
  };
}

function clearRememberedIntent(intent: PlannerMutationIntent): void {
  if (intent.idempotencyKey) mutationIdsByIdempotencyKey.delete(intent.idempotencyKey);
}

async function enqueueConfirmed<TPayload, TResult>(
  input: EnqueueConfirmedInput<TPayload>,
): Promise<TResult> {
  const runtime = getActivePlannerReliabilityRuntime();
  if (!runtime) {
    throw new ApiError('Planner todavia esta preparando la sincronizacion. Proba de nuevo en un momento.', 0, 'planner_reliability_runtime_unavailable');
  }

  if (input.domain === 'plan') {
    tracePlanWrite({
      operation: traceOperationForPlanInput(input.operationType, input.payload),
      stage: 'runtime_enqueue',
      surface: 'productiveMutations.enqueueConfirmed',
      mutationId: input.intent.mutationId,
      idempotencyKey: input.intent.idempotencyKey,
      planId: planIdForTrace(input.payload),
    });
  }

  const record = await runtime.enqueueAndFlush(input);
  if (record.state === 'confirmed') {
    clearRememberedIntent(input.intent);
    return record.authoritativeResult?.data as TResult;
  }

  if (record.state === 'conflicted') {
    clearRememberedIntent(input.intent);
    throw apiErrorFromConflict(record);
  }

  throw new ApiError(
    'La operacion quedo pendiente de confirmacion. Conservamos tus cambios para reintentar.',
    0,
    record.state === 'uncertain' ? 'planner_reliability_uncertain' : 'planner_reliability_pending',
  );
}

function traceOperationForPlanInput(operationType: string, payload: unknown): PlanWriteTraceOperation {
  if (operationType === 'structure_changeset') return 'structure';
  const graphWrite = planGraphWriteForTrace(payload);
  if (graphWrite?.action === 'create') return 'create';
  if (graphWrite?.payload && (graphWrite.payload as { transition?: unknown }).transition === 'activate') return 'activate';
  return 'lifecycle';
}

function planGraphWriteForTrace(payload: unknown): PlanGraphWriteRequest | null {
  if (payload && typeof payload === 'object' && 'graphWrite' in payload) {
    return (payload as { graphWrite?: PlanGraphWriteRequest }).graphWrite ?? null;
  }
  return null;
}

function planIdForTrace(payload: unknown): string | null {
  const graphWrite = planGraphWriteForTrace(payload);
  if (graphWrite?.planId) return graphWrite.planId;
  if (payload && typeof payload === 'object' && 'structureChangeset' in payload) {
    return (payload as { structureChangeset?: PlanStructureChangesetWriteRequest }).structureChangeset?.planId ?? null;
  }
  return null;
}

function apiErrorFromConflict(record: PlannerOperationRecord): ApiError {
  if (record.conflict?.kind === 'version_conflict') {
    return new ApiError('Este elemento cambio en otro dispositivo. Actualiza y volve a intentar.', 409, 'version_conflict', undefined, record.attempt.requestId);
  }
  if (record.conflict?.kind === 'authorization_blocked') {
    return new ApiError('No tenes permiso para completar esta accion.', 403, 'authorization_blocked', undefined, record.attempt.requestId);
  }
  return new ApiError('No pudimos confirmar esta operacion. Revisala y volve a intentar.', 409, record.conflict?.stableCode ?? 'planner_reliability_conflict', undefined, record.attempt.requestId);
}

function createIntent(entityKind: string, options?: ReliabilityIntentOptions): PlannerMutationIntent {
  return createPlannerReliabilityIntent({
    entityKind,
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    options,
  });
}

function versionedIntent(entityKind: string, expectedVersion: number | undefined, options?: ReliabilityIntentOptions): PlannerMutationIntent {
  if (expectedVersion === undefined) {
    throw new ApiError('Falta la version esperada para guardar con seguridad.', 0, 'planner_reliability_expected_version_required');
  }
  return createPlannerReliabilityIntent({
    entityKind,
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    expectedVersion,
    options,
  });
}

export async function enqueuePlannerTaskCreate(
  payload: CreatePlannerTaskPayload,
  options?: ReliabilityIntentOptions,
): Promise<{ task: PlannerTask }> {
  const task = await enqueueConfirmed<{ payload: CreatePlannerTaskPayload }, PlannerTask>({
    domain: 'task',
    operationType: 'create',
    entity: { type: 'task' },
    payload: { payload },
    intent: createIntent('planner.tasks.create', options),
  });
  return { task };
}

export async function enqueuePlannerTaskUpdate(
  taskId: string,
  payload: UpdatePlannerTaskPayload & { expected_version: number },
  options?: ReliabilityIntentOptions,
): Promise<{ task: PlannerTask }> {
  const task = await enqueueConfirmed<{ payload: UpdatePlannerTaskPayload }, PlannerTask>({
    domain: 'task',
    operationType: 'update',
    entity: { type: 'task', id: taskId },
    payload: { payload },
    intent: versionedIntent('planner.tasks.update', payload.expected_version, options),
  });
  return { task };
}

async function enqueuePlannerTaskVersioned(
  operationType: 'complete' | 'verify' | 'cancel' | 'trash' | 'restore' | 'reactivate',
  taskId: string,
  expectedVersion: number | undefined,
  options?: ReliabilityIntentOptions,
): Promise<{ task: PlannerTask }> {
  const task = await enqueueConfirmed<Record<string, never>, PlannerTask>({
    domain: 'task',
    operationType,
    entity: { type: 'task', id: taskId },
    payload: {},
    intent: versionedIntent(`planner.tasks.${operationType}`, expectedVersion, options),
  });
  return { task };
}

export const enqueuePlannerTaskComplete = (taskId: string, expectedVersion: number | undefined, options?: ReliabilityIntentOptions) =>
  enqueuePlannerTaskVersioned('complete', taskId, expectedVersion, options);
export const enqueuePlannerTaskVerify = (taskId: string, expectedVersion: number | undefined, options?: ReliabilityIntentOptions) =>
  enqueuePlannerTaskVersioned('verify', taskId, expectedVersion, options);
export const enqueuePlannerTaskCancel = (taskId: string, expectedVersion: number | undefined, options?: ReliabilityIntentOptions) =>
  enqueuePlannerTaskVersioned('cancel', taskId, expectedVersion, options);
export const enqueuePlannerTaskTrash = (taskId: string, expectedVersion: number | undefined, options?: ReliabilityIntentOptions) =>
  enqueuePlannerTaskVersioned('trash', taskId, expectedVersion, options);
export const enqueuePlannerTaskRestore = (taskId: string, expectedVersion: number | undefined, options?: ReliabilityIntentOptions) =>
  enqueuePlannerTaskVersioned('restore', taskId, expectedVersion, options);
export const enqueuePlannerTaskReactivate = (taskId: string, expectedVersion: number | undefined, options?: ReliabilityIntentOptions) =>
  enqueuePlannerTaskVersioned('reactivate', taskId, expectedVersion, options);

export async function enqueuePlannerEventCreate(
  payload: CreatePlannerEventPayload,
  options?: ReliabilityIntentOptions,
): Promise<{ event: PlannerEvent }> {
  const event = await enqueueConfirmed<{ payload: CreatePlannerEventPayload }, PlannerEvent>({
    domain: 'event',
    operationType: 'create',
    entity: { type: 'event' },
    payload: { payload },
    intent: createIntent('planner.events.create', options),
  });
  return { event };
}

export async function enqueuePlannerEventUpdate(
  eventId: string,
  payload: CreatePlannerEventPayload & { expected_version?: number },
  options?: ReliabilityIntentOptions,
): Promise<{ event: PlannerEvent }> {
  const event = await enqueueConfirmed<{ payload: CreatePlannerEventPayload }, PlannerEvent>({
    domain: 'event',
    operationType: 'update',
    entity: { type: 'event', id: eventId },
    payload: { payload },
    intent: versionedIntent('planner.events.update', payload.expected_version, options),
  });
  return { event };
}

export async function enqueuePlannerEventCancel(
  eventId: string,
  expectedVersion: number | undefined,
  options?: ReliabilityIntentOptions,
): Promise<{ event: PlannerEvent }> {
  const event = await enqueueConfirmed<Record<string, never>, PlannerEvent>({
    domain: 'event',
    operationType: 'cancel',
    entity: { type: 'event', id: eventId },
    payload: {},
    intent: versionedIntent('planner.events.cancel', expectedVersion, options),
  });
  return { event };
}

export async function enqueuePlannerEventRestore(
  eventId: string,
  expectedVersion: number | undefined,
  options?: ReliabilityIntentOptions,
): Promise<{ event: PlannerEvent }> {
  const event = await enqueueConfirmed<Record<string, never>, PlannerEvent>({
    domain: 'event',
    operationType: 'restore',
    entity: { type: 'event', id: eventId },
    payload: {},
    intent: versionedIntent('planner.events.restore', expectedVersion, options),
  });
  return { event };
}

export async function enqueuePlannerEventOccurrenceOverride(
  baseEventId: string,
  occurrence: Record<string, unknown>,
  options?: ReliabilityIntentOptions,
): Promise<{ event: PlannerEvent }> {
  const event = await enqueueConfirmed<{ occurrence: Record<string, unknown> }, PlannerEvent>({
    domain: 'event',
    operationType: 'occurrence.override',
    entity: { type: 'event', id: baseEventId },
    payload: { occurrence },
    intent: createIntent('planner.events.occurrences.override.create', options),
  });
  return { event };
}

export async function enqueuePlannerPlanGraphWrite<TResult = unknown>(
  request: PlanGraphWriteRequest,
  intent: PlannerMutationIntent,
  operationType: 'create' | 'update' = 'update',
): Promise<TResult> {
  return enqueueConfirmed<{ graphWrite: PlanGraphWriteRequest }, TResult>({
    domain: 'plan',
    operationType,
    entity: plannerPlanEntity(request.planId),
    payload: { graphWrite: request },
    intent,
  });
}

export async function enqueuePlannerPlanStructureChangeset<TResult = unknown>(
  request: PlanStructureChangesetWriteRequest,
  intent: PlannerMutationIntent,
): Promise<TResult> {
  return enqueueConfirmed<{ structureChangeset: PlanStructureChangesetWriteRequest }, TResult>({
    domain: 'plan',
    operationType: 'structure_changeset',
    entity: plannerPlanEntity(request.planId),
    payload: { structureChangeset: request },
    intent,
  });
}

function plannerPlanEntity(planId: string | null | undefined): PlannerOperationEntity {
  if (!planId) return { type: 'plan' };
  return { type: 'plan', id: planId };
}

/**
 * IR-11A-RELIABILITY-001: enqueue Goal restore through the productive mutation
 * runtime. Previously `restoreGoal` used `requestJson` directly, bypassing
 * mutation identity, retry, replay/noop, lost response and late response
 * handling. The plan adapter dispatches `goal.restore` to `restoreGoal`.
 */
export async function enqueuePlannerGoalRestore(
  goalId: string,
  expectedVersion: number | undefined,
  options?: ReliabilityIntentOptions,
): Promise<unknown> {
  return enqueueConfirmed<{ goalId: string; expectedVersion: number }, unknown>({
    domain: 'plan',
    operationType: 'goal.restore',
    entity: { type: 'plan', id: goalId },
    payload: { goalId, expectedVersion: expectedVersion ?? 0 },
    intent: versionedIntent('planner.goals.restore', expectedVersion, options),
  });
}

/**
 * IR-11A-RELIABILITY-001: enqueue Goal Milestone restore through the productive
 * mutation runtime. Previously `restoreGoalMilestone` used `requestJson`
 * directly. The plan adapter dispatches `goal.milestone.restore`.
 */
export async function enqueuePlannerMilestoneRestore(
  goalId: string,
  milestoneId: string,
  expectedVersion: number | undefined,
  options?: ReliabilityIntentOptions,
): Promise<unknown> {
  return enqueueConfirmed<{ goalId: string; milestoneId: string; expectedVersion: number }, unknown>({
    domain: 'plan',
    operationType: 'goal.milestone.restore',
    entity: { type: 'plan', id: milestoneId },
    payload: { goalId, milestoneId, expectedVersion: expectedVersion ?? 0 },
    intent: versionedIntent('planner.goals.milestones.restore', expectedVersion, options),
  });
}

export async function enqueuePlannerPresetCreate(
  payload: Record<string, unknown>,
  options?: ReliabilityIntentOptions,
): Promise<{ preset: PlannerPreset }> {
  const preset = await enqueueConfirmed<{ payload: Record<string, unknown> }, PlannerPreset>({
    domain: 'preset',
    operationType: 'create',
    entity: { type: 'preset' },
    payload: { payload },
    intent: createIntent('planner.presets.create', options),
  });
  return { preset };
}

export async function enqueuePlannerPresetUpdate(
  presetId: string,
  name: string,
  options?: ReliabilityIntentOptions,
): Promise<{ preset: PlannerPreset }> {
  const preset = await enqueueConfirmed<{ name: string }, PlannerPreset>({
    domain: 'preset',
    operationType: 'update',
    entity: { type: 'preset', id: presetId },
    payload: { name },
    intent: versionedIntent('planner.presets.update', options?.expectedVersion, options),
  });
  return { preset };
}

export async function enqueuePlannerPresetStartRevision(
  presetId: string,
  options?: ReliabilityIntentOptions,
): Promise<{ preset: PlannerPreset }> {
  const preset = await enqueueConfirmed<Record<string, never>, PlannerPreset>({
    domain: 'preset',
    operationType: 'revision.start',
    entity: { type: 'preset', id: presetId },
    payload: {},
    intent: createIntent('planner.presets.revisions.start', options),
  });
  return { preset };
}

export async function enqueuePlannerPresetPublishRevision(
  revisionId: string,
  options?: ReliabilityIntentOptions,
): Promise<{ preset: PlannerPreset }> {
  const preset = await enqueueConfirmed<{ revisionId: string }, PlannerPreset>({
    domain: 'preset',
    operationType: 'revision.publish',
    entity: { type: 'preset_revision', id: revisionId },
    payload: { revisionId },
    intent: versionedIntent('planner.presets.revisions.publish', options?.expectedVersion, options),
  });
  return { preset };
}

async function enqueuePlannerPresetVersioned(
  operationType: 'trash' | 'restore',
  presetId: string,
  options?: ReliabilityIntentOptions,
): Promise<{ preset: PlannerPreset }> {
  const preset = await enqueueConfirmed<Record<string, never>, PlannerPreset>({
    domain: 'preset',
    operationType,
    entity: { type: 'preset', id: presetId },
    payload: {},
    intent: versionedIntent(`planner.presets.${operationType}`, options?.expectedVersion, options),
  });
  return { preset };
}

export const enqueuePlannerPresetTrash = (presetId: string, options?: ReliabilityIntentOptions) =>
  enqueuePlannerPresetVersioned('trash', presetId, options);
export const enqueuePlannerPresetRestore = (presetId: string, options?: ReliabilityIntentOptions) =>
  enqueuePlannerPresetVersioned('restore', presetId, options);
