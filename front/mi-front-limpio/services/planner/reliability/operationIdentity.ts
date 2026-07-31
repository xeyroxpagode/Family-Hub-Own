import type { PlannerMutationIntent } from '../plannerMutationIntent';
import { OPERATION_KINDS } from '../../api';
import type {
  PlannerOperationEntity,
  PlannerOperationPartition,
  PlannerOperationRecord,
  PlannerOperationScope,
  PlannerPendingOperation,
} from './types';

const MAX_SAFE_PLANNER_VERSION = Number.MAX_SAFE_INTEGER;

function isPlainPlannerHashObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function validatePlannerExpectedVersion(value: unknown, required: boolean): number | undefined {
  if (value === undefined) {
    if (!required) return undefined;
    throw new Error('planner_reliability_expected_version_required');
  }
  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || !Number.isInteger(value)
    || value < 0
    || value > MAX_SAFE_PLANNER_VERSION
  ) {
    throw new Error('planner_reliability_invalid_expected_version');
  }
  return value;
}

function stableStringify(value: unknown, seen: Set<object> = new Set()): string {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'boolean' || type === 'string') return JSON.stringify(value);
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new Error('planner_reliability_non_finite_hash_number');
    return JSON.stringify(value);
  }
  if (
    type === 'undefined'
    || type === 'bigint'
    || type === 'function'
    || type === 'symbol'
    || !value
  ) {
    throw new Error('planner_reliability_invalid_request_hash_material');
  }
  if (value instanceof Date) throw new Error('planner_reliability_date_hash_material');
  if (value instanceof RegExp || value instanceof Map || value instanceof Set || ArrayBuffer.isView(value)) {
    throw new Error('planner_reliability_unsupported_hash_material');
  }
  const objectValue = value as object;
  if (seen.has(objectValue)) throw new Error('planner_reliability_cyclic_hash_material');
  seen.add(objectValue);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          throw new Error('planner_reliability_sparse_hash_array');
        }
      }
      return `[${value.map((item) => stableStringify(item, seen)).join(',')}]`;
    }
    if (!isPlainPlannerHashObject(objectValue)) {
      throw new Error('planner_reliability_custom_object_hash_material');
    }
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => {
      if (record[key] === undefined) throw new Error('planner_reliability_undefined_hash_property');
      return `${JSON.stringify(key)}:${stableStringify(record[key], seen)}`;
    }).join(',')}}`;
  } finally {
    seen.delete(objectValue);
  }
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
  const expectedVersion = validatePlannerExpectedVersion(
    params.intent.ifMatch,
    params.intent.operationKind === OPERATION_KINDS.VERSIONED_MUTATION,
  );
  const requestHash = computePlannerRequestHash({
    domain: params.domain,
    operationType: params.operationType,
    scope: params.scope,
    entity: params.entity ?? null,
    expectedVersion: expectedVersion ?? null,
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
    expectedVersion,
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
