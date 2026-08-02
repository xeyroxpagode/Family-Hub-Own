import {
  cancelPlannerEvent,
  createEventOccurrenceOverride,
  createPlannerEvent,
  reactivatePlannerEvent,
  restorePlannerEvent,
  trashPlannerEvent,
  updatePlannerEvent,
  type CreateOccurrenceOverridePayload,
  type CreatePlannerEventPayload,
  type UpdatePlannerEventPayload,
} from '../../plannerEvents';
import {
  cancelPlannerTask,
  claimPlannerTaskV1,
  completePlannerTask,
  completePlannerTaskFulfillmentV1,
  createPlannerTask,
  reactivatePlannerTask,
  reopenPlannerTaskFulfillmentV1,
  requestPlannerTaskCorrectionV1,
  resubmitPlannerTaskFulfillmentV1,
  restorePlannerTask,
  revertPlannerTaskFulfillmentV1,
  trashPlannerTask,
  updatePlannerTask,
  updatePlannerTaskAssignmentV1,
  verifyPlannerTask,
  verifyPlannerTaskFulfillmentV1,
  type CreatePlannerTaskPayload,
  type UpdatePlannerTaskAssignmentV1Payload,
  type UpdatePlannerTaskPayload,
} from '../../plannerTasks';
import {
  restoreGoal,
  restoreGoalMilestone,
} from '../../plannerGoals';
import {
  autosavePlannerDraft,
  restorePlannerDraft,
  trashPlannerDraft,
  type AutosavePlannerDraftPayload,
} from '../../plannerDrafts';
import {
  createPlannerPreset,
  publishPlannerPresetRevision,
  restorePlannerPreset,
  startPlannerPresetRevision,
  trashPlannerPreset,
  updatePlannerPresetMetadata,
  updatePlannerPresetRevisionDraft,
} from '../../plannerPresets';
import { plannerCache, type HouseholdScope } from '../plannerCache';
import {
  writeCanonicalPlanGraph,
  writeCanonicalPlanStructureChangeset,
  type PlanGraphWriteRequest,
  type PlanStructureChangesetWriteRequest,
} from '../plannerPlans';
import type {
  PlannerAuthoritativeMutationResult,
  PlannerOperationExecutionContext,
  PlannerOperationRecord,
  PlannerReliabilityDomainAdapter,
  PlannerReliabilityRealtimeSignal,
} from './types';

type CanonicalMutationResponse = {
  readonly outcome?: unknown;
  readonly data?: unknown;
  readonly task?: unknown;
  readonly event?: unknown;
  readonly version?: unknown;
  readonly operationId?: unknown;
  readonly operation_id?: unknown;
  readonly requestId?: unknown;
  readonly request_id?: unknown;
};

export type PlannerReliabilityTaskOperationPayload =
  | { readonly payload: CreatePlannerTaskPayload }
  | { readonly payload: UpdatePlannerTaskPayload }
  | { readonly assignment: UpdatePlannerTaskAssignmentV1Payload }
  | { readonly fulfillmentId: string; readonly comment?: string; readonly note?: string };

export type PlannerReliabilityEventOperationPayload =
  | { readonly payload: CreatePlannerEventPayload }
  | { readonly payload: UpdatePlannerEventPayload }
  | { readonly occurrence: CreateOccurrenceOverridePayload };

export type PlannerReliabilityPlanOperationPayload =
  | { readonly graphWrite: PlanGraphWriteRequest }
  | { readonly structureChangeset: PlanStructureChangesetWriteRequest }
  | { readonly goalId: string; readonly expectedVersion: number }
  | { readonly goalId: string; readonly milestoneId: string; readonly expectedVersion: number };

export type PlannerReliabilityPresetOperationPayload =
  | { readonly payload: Parameters<typeof createPlannerPreset>[1] }
  | { readonly presetId: string; readonly name?: string }
  | { readonly revisionId: string; readonly payload?: { adapter_key?: string; payload?: Record<string, unknown> } };

export type PlannerReliabilityDraftOperationPayload =
  | { readonly payload: AutosavePlannerDraftPayload }
  | { readonly draftId: string };

export const PLANNER_RELIABILITY_PRODUCTIVE_DOMAINS = ['task', 'event', 'plan', 'preset', 'draft'] as const;

export function createPlannerReliabilityProductiveAdapters(): PlannerReliabilityDomainAdapter[] {
  return [
    createPlannerReliabilityTaskAdapter(),
    createPlannerReliabilityEventAdapter(),
    createPlannerReliabilityPlanAdapter(),
    createPlannerReliabilityPresetAdapter(),
    createPlannerReliabilityDraftAdapter(),
  ];
}

export function createPlannerReliabilityTaskAdapter(): PlannerReliabilityDomainAdapter<PlannerReliabilityTaskOperationPayload> {
  return {
    domain: 'task',
    async execute(operation, context) {
      const options = mutationOptions(operation, context);
      const version = operation.descriptor.operationType === 'create' ? undefined : requireExpectedVersion(operation);
      const payload = requirePayload(operation) as Record<string, unknown>;
      switch (operation.descriptor.operationType) {
        case 'create':
          return resultOf(await createPlannerTask(context.accessToken, payload.payload as CreatePlannerTaskPayload, options), 'created');
        case 'update':
          return resultOf(await updatePlannerTask(context.accessToken, requireEntityId(operation), {
            ...(payload.payload as UpdatePlannerTaskPayload),
            expected_version: version,
          }, options), 'updated');
        case 'cancel':
          return resultOf(await cancelPlannerTask(context.accessToken, requireEntityId(operation), version, options), 'updated');
        case 'complete':
          return resultOf(await completePlannerTask(context.accessToken, requireEntityId(operation), version, options), 'updated');
        case 'verify':
          return resultOf(await verifyPlannerTask(context.accessToken, requireEntityId(operation), version, options), 'updated');
        case 'trash':
          return resultOf(await trashPlannerTask(context.accessToken, requireEntityId(operation), version, options), 'updated');
        case 'restore':
          return resultOf(await restorePlannerTask(context.accessToken, requireEntityId(operation), version, options), 'updated');
        case 'reactivate':
          return resultOf(await reactivatePlannerTask(context.accessToken, requireEntityId(operation), version, options), 'updated');
        case 'assignment':
          return resultOf(await updatePlannerTaskAssignmentV1(context.accessToken, requireEntityId(operation), version as number, payload.assignment as UpdatePlannerTaskAssignmentV1Payload, options), 'updated');
        case 'claim':
          return resultOf(await claimPlannerTaskV1(context.accessToken, requireEntityId(operation), version as number, options), 'updated');
        case 'fulfillment.complete':
          return resultOf(await completePlannerTaskFulfillmentV1(context.accessToken, requireEntityId(operation), String(payload.fulfillmentId), version as number, options), 'updated');
        case 'fulfillment.verify':
          return resultOf(await verifyPlannerTaskFulfillmentV1(context.accessToken, requireEntityId(operation), String(payload.fulfillmentId), version as number, options), 'updated');
        case 'fulfillment.request_correction':
          return resultOf(await requestPlannerTaskCorrectionV1(context.accessToken, requireEntityId(operation), String(payload.fulfillmentId), version as number, typeof payload.comment === 'string' ? payload.comment : undefined, options), 'updated');
        case 'fulfillment.resubmit':
          return resultOf(await resubmitPlannerTaskFulfillmentV1(context.accessToken, requireEntityId(operation), String(payload.fulfillmentId), version as number, typeof payload.note === 'string' ? payload.note : undefined, options), 'updated');
        case 'fulfillment.revert':
          return resultOf(await revertPlannerTaskFulfillmentV1(context.accessToken, requireEntityId(operation), String(payload.fulfillmentId), version as number, options), 'updated');
        case 'fulfillment.reopen':
          return resultOf(await reopenPlannerTaskFulfillmentV1(context.accessToken, requireEntityId(operation), String(payload.fulfillmentId), version as number, options), 'updated');
        default:
          throw new Error('planner_reliability_unsupported_task_operation');
      }
    },
    async reconcile(operation, result) {
      invalidateDomain(operation, result);
      return { applied: true, invalidationRequested: true };
    },
    isRealtimeSignalRelated: defaultRealtimeRelated,
  };
}

export function createPlannerReliabilityEventAdapter(): PlannerReliabilityDomainAdapter<PlannerReliabilityEventOperationPayload> {
  return {
    domain: 'event',
    async execute(operation, context) {
      const entityId = operation.descriptor.operationType === 'create' ? null : requireEntityId(operation);
      const options = mutationOptions(operation, context);
      const payload = requirePayload(operation) as Record<string, unknown>;
      const version = operation.descriptor.operationType === 'create' || operation.descriptor.operationType === 'occurrence.override'
        ? undefined
        : requireExpectedVersion(operation);
      switch (operation.descriptor.operationType) {
        case 'create':
          return resultOf(await createPlannerEvent(context.accessToken, payload.payload as CreatePlannerEventPayload, options), 'created');
        case 'update':
          return resultOf(await updatePlannerEvent(context.accessToken, entityId ?? '', {
            ...(payload.payload as UpdatePlannerEventPayload),
            expected_version: version,
          }, options), 'updated');
        case 'cancel':
          return resultOf(await cancelPlannerEvent(context.accessToken, entityId ?? '', version, options), 'updated');
        case 'trash':
          return resultOf(await trashPlannerEvent(context.accessToken, entityId ?? '', version, options), 'updated');
        case 'restore':
          return resultOf(await restorePlannerEvent(context.accessToken, entityId ?? '', version, options), 'updated');
        case 'reactivate':
          return resultOf(await reactivatePlannerEvent(context.accessToken, entityId ?? '', version, options), 'updated');
        case 'occurrence.override':
          return resultOf(await createEventOccurrenceOverride(context.accessToken, entityId ?? '', payload.occurrence as CreateOccurrenceOverridePayload, options), 'created');
        default:
          throw new Error('planner_reliability_unsupported_event_operation');
      }
    },
    async reconcile(operation, result) {
      invalidateDomain(operation, result);
      return { applied: true, invalidationRequested: true };
    },
    isRealtimeSignalRelated: defaultRealtimeRelated,
  };
}

export function createPlannerReliabilityPlanAdapter(): PlannerReliabilityDomainAdapter<PlannerReliabilityPlanOperationPayload> {
  return {
    domain: 'plan',
    async execute(operation, context) {
      const request = requestOf(context);
      const payload = requirePayload(operation) as Record<string, unknown>;
      if (operation.descriptor.operationType === 'structure_changeset') {
        const response = await writeCanonicalPlanStructureChangeset(
          request,
          payload.structureChangeset as PlanStructureChangesetWriteRequest,
          intentFromOperation(operation),
        );
        return resultOf(response, 'updated');
      }
      // IR-11A-RELIABILITY-001: route Goal/Milestone restore through Reliability
      // runtime instead of bypassing it with direct requestJson.
      if (operation.descriptor.operationType === 'goal.restore') {
        const goalId = String(payload.goalId ?? '');
        const expectedVersion = Number(payload.expectedVersion ?? 0);
        const response = await restoreGoal(
          context.accessToken,
          goalId,
          expectedVersion,
          {
            idempotencyKey: operation.descriptor.idempotencyKey,
            mutationId: operation.descriptor.mutationId,
            signal: context.signal,
            timeoutMs: context.timeoutMs,
          },
        );
        return resultOf(response, 'updated');
      }
      if (operation.descriptor.operationType === 'goal.milestone.restore') {
        const goalId = String(payload.goalId ?? '');
        const milestoneId = String(payload.milestoneId ?? '');
        const expectedVersion = Number(payload.expectedVersion ?? 0);
        const response = await restoreGoalMilestone(
          context.accessToken,
          goalId,
          milestoneId,
          expectedVersion,
          {
            idempotencyKey: operation.descriptor.idempotencyKey,
            mutationId: operation.descriptor.mutationId,
            signal: context.signal,
            timeoutMs: context.timeoutMs,
          },
        );
        return resultOf(response, 'updated');
      }
      const response = await writeCanonicalPlanGraph(
        request,
        payload.graphWrite as PlanGraphWriteRequest,
        intentFromOperation(operation),
      );
      return resultOf(response, operation.descriptor.operationType === 'create' ? 'created' : 'updated');
    },
    async reconcile(operation, result) {
      invalidateDomain(operation, result);
      return { applied: true, invalidationRequested: true, refetchRequested: operation.descriptor.operationType === 'structure_changeset' };
    },
    isRealtimeSignalRelated: defaultRealtimeRelated,
  };
}

export function createPlannerReliabilityPresetAdapter(): PlannerReliabilityDomainAdapter<PlannerReliabilityPresetOperationPayload> {
  return {
    domain: 'preset',
    async execute(operation, context) {
      const options = presetOptions(operation);
      const payload = requirePayload(operation) as Record<string, unknown>;
      switch (operation.descriptor.operationType) {
        case 'create':
          return resultOf(await createPlannerPreset(context.accessToken, payload.payload as Parameters<typeof createPlannerPreset>[1], options), 'created');
        case 'update':
          return resultOf(await updatePlannerPresetMetadata(context.accessToken, requireEntityId(operation), { name: String(payload.name ?? '') }, options), 'updated');
        case 'revision.start':
          return resultOf(await startPlannerPresetRevision(context.accessToken, requireEntityId(operation), options), 'created');
        case 'revision.update':
          return resultOf(await updatePlannerPresetRevisionDraft(context.accessToken, String(payload.revisionId), (payload.payload as { adapter_key?: string; payload?: Record<string, unknown> }) ?? {}, options), 'updated');
        case 'revision.publish':
          return resultOf(await publishPlannerPresetRevision(context.accessToken, String(payload.revisionId), options), 'updated');
        case 'trash':
          return resultOf(await trashPlannerPreset(context.accessToken, requireEntityId(operation), options), 'updated');
        case 'restore':
          return resultOf(await restorePlannerPreset(context.accessToken, requireEntityId(operation), options), 'updated');
        default:
          throw new Error('planner_reliability_unsupported_preset_operation');
      }
    },
    async reconcile(operation) {
      invalidatePrivateDomain(operation, 'presets');
      return { applied: true, invalidationRequested: true };
    },
    isRealtimeSignalRelated: defaultRealtimeRelated,
  };
}

export function createPlannerReliabilityDraftAdapter(): PlannerReliabilityDomainAdapter<PlannerReliabilityDraftOperationPayload> {
  return {
    domain: 'draft',
    async execute(operation, context) {
      const options = presetOptions(operation);
      const payload = requirePayload(operation) as Record<string, unknown>;
      switch (operation.descriptor.operationType) {
        case 'autosave':
          return resultOf(await autosavePlannerDraft(context.accessToken, payload.payload as AutosavePlannerDraftPayload, options), operation.descriptor.expectedVersion === undefined ? 'created' : 'updated');
        case 'trash':
          return resultOf(await trashPlannerDraft(context.accessToken, requireEntityId(operation), options), 'updated');
        case 'restore':
          return resultOf(await restorePlannerDraft(context.accessToken, requireEntityId(operation), options), 'updated');
        default:
          throw new Error('planner_reliability_unsupported_draft_operation');
      }
    },
    async reconcile(operation) {
      invalidatePrivateDomain(operation, 'drafts');
      return { applied: true, invalidationRequested: true };
    },
    canSupersedePendingOperation(previous, next) {
      return previous.descriptor.entity?.type === 'draft'
        && previous.descriptor.entity?.id === next.descriptor.entity?.id
        && previous.descriptor.operationType === 'autosave'
        && next.descriptor.operationType === 'autosave';
    },
    isRealtimeSignalRelated: defaultRealtimeRelated,
  };
}

function mutationOptions(operation: PlannerOperationRecord, context: PlannerOperationExecutionContext) {
  return {
    mutationId: operation.descriptor.mutationId,
    idempotencyKey: operation.descriptor.idempotencyKey,
    signal: context.signal,
    timeoutMs: context.timeoutMs,
    contextScope: context.partition.activeHouseholdId ?? null,
  };
}

function presetOptions(operation: PlannerOperationRecord) {
  return {
    expectedVersion: operation.descriptor.expectedVersion,
    mutationId: operation.descriptor.mutationId,
    idempotencyKey: operation.descriptor.idempotencyKey,
  };
}

function requestOf(context: PlannerOperationExecutionContext) {
  return {
    accessToken: context.accessToken,
    signal: context.signal,
    timeoutMs: context.timeoutMs,
    contextScope: context.partition.activeHouseholdId ?? null,
  };
}

function intentFromOperation(operation: PlannerOperationRecord) {
  return {
    mutationId: operation.descriptor.mutationId,
    idempotencyKey: operation.descriptor.idempotencyKey,
    ifMatch: operation.descriptor.expectedVersion,
    operationKind: operation.descriptor.expectedVersion === undefined ? 'CREATE_IDEMPOTENT' as const : 'VERSIONED_MUTATION' as const,
  };
}

function requirePayload<T>(operation: PlannerOperationRecord<T>): T {
  if (operation.descriptor.payload === null || operation.descriptor.payload === undefined) {
    throw new Error('planner_reliability_payload_required');
  }
  return operation.descriptor.payload;
}

function requireEntityId(operation: PlannerOperationRecord): string {
  const id = operation.descriptor.entity?.id;
  if (!id) throw new Error('planner_reliability_entity_id_required');
  return id;
}

function requireExpectedVersion(operation: PlannerOperationRecord): number {
  const version = operation.descriptor.expectedVersion;
  if (version === undefined) throw new Error('planner_reliability_expected_version_required');
  return version;
}

function resultOf(
  response: unknown,
  fallbackOutcome: PlannerAuthoritativeMutationResult['outcome'],
): PlannerAuthoritativeMutationResult {
  const record = (response && typeof response === 'object') ? response as CanonicalMutationResponse : {};
  const data = record.data ?? record.task ?? record.event ?? response;
  const outcome = record.outcome === 'created' || record.outcome === 'updated' || record.outcome === 'noop' || record.outcome === 'replay'
    ? record.outcome
    : fallbackOutcome;
  return {
    outcome,
    data,
    version: typeof record.version === 'number'
      ? record.version
      : data && typeof data === 'object' && typeof (data as { version?: unknown }).version === 'number'
      ? (data as { version: number }).version
      : undefined,
    operationId: typeof record.operationId === 'string'
      ? record.operationId
      : typeof record.operation_id === 'string'
      ? record.operation_id
      : null,
    requestId: typeof record.requestId === 'string'
      ? record.requestId
      : typeof record.request_id === 'string'
      ? record.request_id
      : null,
  };
}

function scopeOf(operation: PlannerOperationRecord): HouseholdScope | null {
  return operation.descriptor.scope.kind === 'household'
    ? { householdId: operation.descriptor.scope.householdId }
    : null;
}

function invalidateDomain(operation: PlannerOperationRecord, result: PlannerAuthoritativeMutationResult): void {
  const scope = scopeOf(operation);
  if (!scope) return;
  const entityId = operation.descriptor.entity?.id
    ?? (result.data && typeof result.data === 'object' && typeof (result.data as { id?: unknown }).id === 'string'
      ? (result.data as { id: string }).id
      : undefined);
  const rawAction = operation.descriptor.operationType.split('.')[0];
  if (operation.descriptor.domain === 'task') {
    const action = rawAction === 'assignment' ? 'assign' : rawAction;
    plannerCache.executeInvalidation({ kind: 'task', action: action as 'create' | 'update' | 'complete' | 'cancel' | 'trash' | 'restore' | 'reactivate' | 'assign', entityId }, scope);
  } else if (operation.descriptor.domain === 'event') {
    const action = rawAction === 'occurrence' ? 'override' : rawAction;
    plannerCache.executeInvalidation({ kind: 'event', action: action as 'create' | 'update' | 'cancel' | 'trash' | 'restore' | 'reactivate' | 'override', entityId }, scope);
  } else if (operation.descriptor.domain === 'plan') {
    const action = rawAction === 'structure_changeset'
      ? 'update'
      : rawAction === 'goal'
      ? 'restore'
      : rawAction;
    plannerCache.executeInvalidation({ kind: 'plan', action: action as 'create' | 'update' | 'trash' | 'restore' | 'archive', entityId }, scope);
  }
}

function invalidatePrivateDomain(operation: PlannerOperationRecord, kind: 'presets' | 'drafts'): void {
  const scope = scopeOf(operation);
  if (scope) plannerCache.invalidateKind(kind, scope);
}

function defaultRealtimeRelated(operation: PlannerOperationRecord, signal: PlannerReliabilityRealtimeSignal): boolean {
  return operation.descriptor.entity?.type === signal.entityType
    && operation.descriptor.entity?.id === signal.entityId;
}
