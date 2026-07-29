import { OPERATION_KINDS, type RequestJsonOptions } from '../api';
import {
  createPlannerMutationIntent,
  createPlannerVersionedMutationIntent,
  toPlannerReadOptions,
  toRequestJsonOptions,
  type PlannerMutationIntent,
} from './plannerMutationIntent';

export type PlannerEntityType = 'task' | 'event' | 'plan' | 'preset' | 'draft';
export type PlannerMutationOutcome = 'created' | 'updated' | 'noop' | 'replay';

export type PlannerMutationIdentity = {
  readonly mutationId: string;
  readonly idempotencyKey: string;
};

export type PlannerReadRequest = {
  readonly accessToken: string;
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
  readonly contextScope?: string | null;
};

export type PlannerMutationRequest<TPayload = unknown> = PlannerReadRequest & {
  readonly payload?: TPayload;
  readonly intent: PlannerMutationIntent;
  readonly expectedVersion?: number;
};

export type PlannerMutationResult<TData = unknown> = {
  readonly data: TData;
  readonly outcome: PlannerMutationOutcome;
  readonly version?: number;
  readonly operationId: string | null;
  readonly mutationId: string | null;
  readonly idempotencyKey: string | null;
  readonly replayed: boolean;
  readonly noop: boolean;
};

export function createPlannerCreateIdentity(entityType: PlannerEntityType): PlannerMutationIdentity {
  const intent = createPlannerMutationIntent({ kind: 'create', entityKind: `planner.${entityType}` });
  return {
    mutationId: intent.mutationId,
    idempotencyKey: intent.idempotencyKey ?? '',
  };
}

export function createPlannerVersionedIdentity(
  entityType: PlannerEntityType,
  expectedVersion: number | string,
): PlannerMutationIdentity & { readonly expectedVersion: number } {
  const intent = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: `planner.${entityType}`,
    entityVersion: expectedVersion,
  });
  return {
    mutationId: intent.mutationId,
    idempotencyKey: intent.idempotencyKey ?? '',
    expectedVersion: Number(intent.ifMatch),
  };
}

export function plannerReadRequestOptions(request: PlannerReadRequest): RequestJsonOptions {
  return {
    ...toPlannerReadOptions(request),
    contextScope: request.contextScope,
  };
}

export function plannerMutationRequestOptions(request: PlannerMutationRequest): RequestJsonOptions {
  const options = toRequestJsonOptions({
    accessToken: request.accessToken,
    intent: request.intent,
    signal: request.signal,
    timeoutMs: request.timeoutMs,
  });
  return {
    ...options,
    body: request.payload,
    expectedVersion: request.expectedVersion ?? options.expectedVersion,
    operationKind: request.intent.operationKind,
    contextScope: request.contextScope,
  };
}

export function buildPlannerVersionedIntent(
  entityType: PlannerEntityType,
  expectedVersion: number | string,
): PlannerMutationIntent {
  return createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: `planner.${entityType}`,
    entityVersion: expectedVersion,
  });
}

export function normalizePlannerMutationResult<TData>(
  response: unknown,
  fallbackIdentity?: Partial<PlannerMutationIdentity>,
): PlannerMutationResult<TData> {
  const record = response && typeof response === 'object'
    ? response as Record<string, unknown>
    : {};
  const outcome = isMutationOutcome(record.outcome) ? record.outcome : 'updated';
  const version = typeof record.version === 'number' ? record.version : undefined;
  const operationId = typeof record.operationId === 'string'
    ? record.operationId
    : typeof record.operation_id === 'string'
    ? record.operation_id
    : null;
  const mutationId = typeof record.mutationId === 'string'
    ? record.mutationId
    : typeof record.mutation_id === 'string'
    ? record.mutation_id
    : fallbackIdentity?.mutationId ?? null;
  const idempotencyKey = typeof record.idempotencyKey === 'string'
    ? record.idempotencyKey
    : typeof record.idempotency_key === 'string'
    ? record.idempotency_key
    : fallbackIdentity?.idempotencyKey ?? null;

  return {
    data: ('data' in record ? record.data : response) as TData,
    outcome,
    version,
    operationId,
    mutationId,
    idempotencyKey,
    replayed: outcome === 'replay',
    noop: outcome === 'noop',
  };
}

export function requiresPlannerIdempotency(kind: RequestJsonOptions['operationKind']): boolean {
  return kind === OPERATION_KINDS.CREATE_IDEMPOTENT || kind === OPERATION_KINDS.VERSIONED_MUTATION;
}

function isMutationOutcome(value: unknown): value is PlannerMutationOutcome {
  return value === 'created' || value === 'updated' || value === 'noop' || value === 'replay';
}
