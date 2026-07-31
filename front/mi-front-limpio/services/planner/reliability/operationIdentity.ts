import type { PlannerMutationIntent } from '../plannerMutationIntent';
import type {
  PlannerOperationEntity,
  PlannerOperationPartition,
  PlannerOperationRecord,
  PlannerOperationScope,
  PlannerPendingOperation,
} from './types';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

export function computePlannerRequestHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildPlannerLocalOperationId(input: {
  mutationId: string;
  idempotencyKey: string;
  requestHash: string;
}): string {
  return `op_${computePlannerRequestHash(input).replace(':', '_')}`;
}

export function createPlannerPendingOperation<TPayload>(params: {
  intent: PlannerMutationIntent;
  domain: string;
  operationType: string;
  partition: PlannerOperationPartition;
  scope: PlannerOperationScope;
  payload: TPayload;
  entity?: PlannerOperationEntity;
  dependencies?: readonly string[];
  createdAt: Date;
}): PlannerPendingOperation<TPayload> {
  const requestHash = computePlannerRequestHash({
    domain: params.domain,
    operationType: params.operationType,
    scope: params.scope,
    entity: params.entity ?? null,
    expectedVersion: params.intent.ifMatch ?? null,
    payload: params.payload,
  });
  const idempotencyKey = params.intent.idempotencyKey ?? params.intent.mutationId;
  return {
    schemaVersion: 1,
    localOperationId: buildPlannerLocalOperationId({
      mutationId: params.intent.mutationId,
      idempotencyKey,
      requestHash,
    }),
    mutationId: params.intent.mutationId,
    idempotencyKey,
    requestHash,
    domain: params.domain,
    operationType: params.operationType,
    ownerPartition: {
      authenticatedUserId: params.partition.authenticatedUserId,
    },
    scope: params.scope,
    entity: params.entity,
    expectedVersion: params.intent.ifMatch === undefined ? undefined : Number(params.intent.ifMatch),
    payload: params.payload,
    dependencies: [...(params.dependencies ?? [])],
    createdAt: params.createdAt.toISOString(),
  };
}

export function createPlannerOperationRecord<TPayload>(descriptor: PlannerPendingOperation<TPayload>): PlannerOperationRecord<TPayload> {
  return {
    descriptor,
    state: 'pending',
    attemptCount: 0,
    updatedAt: descriptor.createdAt,
    attempt: {
      requestMayHaveReachedServer: false,
    },
  };
}

export function isSamePlannerOperationIdentity(a: PlannerOperationRecord, b: PlannerOperationRecord): boolean {
  return a.descriptor.mutationId === b.descriptor.mutationId
    && a.descriptor.idempotencyKey === b.descriptor.idempotencyKey
    && a.descriptor.requestHash === b.descriptor.requestHash;
}

export function hasPlannerIdentityConflict(a: PlannerOperationRecord, b: PlannerOperationRecord): boolean {
  return a.descriptor.mutationId === b.descriptor.mutationId
    && a.descriptor.requestHash !== b.descriptor.requestHash;
}

export function assertPlannerOperationScopeMatchesPartition(
  operation: PlannerOperationRecord,
  partition: PlannerOperationPartition,
): void {
  if (operation.descriptor.ownerPartition.authenticatedUserId !== partition.authenticatedUserId) {
    throw new Error('planner_reliability_user_scope_mismatch');
  }
  if (
    operation.descriptor.scope.kind === 'household'
    && operation.descriptor.scope.householdId !== partition.activeHouseholdId
  ) {
    throw new Error('planner_reliability_household_scope_mismatch');
  }
}
