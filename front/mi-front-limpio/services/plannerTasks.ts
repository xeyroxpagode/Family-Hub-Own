import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';
import { plannerCache } from './planner/plannerCache';
import { plannerKeys } from './planner/plannerKeys';
import {
  buildPlannerVersionedIntent,
  normalizePlannerMutationResult,
  plannerMutationRequestOptions,
  plannerReadRequestOptions,
  type PlannerMutationIdentity,
  type PlannerMutationResult,
} from './planner/plannerTransportContracts';
import {
  createPlannerMutationIntent,
  type PlannerMutationIntent,
} from './planner/plannerMutationIntent';

export type PlannerTaskStatus =
  | 'pending'
  | 'completed'
  | 'awaiting_verification'
  | 'verified'
  | 'cancelled';

export type PlannerTaskPriority = 'low' | 'normal' | 'high';

export type PlannerTaskTemplateKey =
  | 'cleaning'
  | 'shopping'
  | 'pets'
  | 'medication'
  | 'studies'
  | 'payments';

export type PlannerTaskMember = {
  id: string;
  person_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

export type PlannerTask = {
  id: string;
  household_id: string;
  scope?: 'personal' | 'household' | { type?: 'personal' | 'household'; id?: string | null };
  title: string;
  description?: string | null;
  status: PlannerTaskStatus;
  lifecycle?: PlannerTaskStatus | 'draft' | 'active' | 'trash';
  priority: PlannerTaskPriority;
  template_key?: PlannerTaskTemplateKey | null;
  category?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  requires_verification: boolean;
  created_by_person_id: string;
  created_by_member_id?: string | null;
  assigned_to_member_id?: string | null;
  completed_by_person_id?: string | null;
  completed_by_member_id?: string | null;
  verified_by_person_id?: string | null;
  verified_by_member_id?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  availableActions?: Array<{ action: string; fulfillmentId?: string; disabledReason?: string | null }>;
  assigned_member?: PlannerTaskMember | null;
  completed_member?: PlannerTaskMember | null;
  verified_member?: PlannerTaskMember | null;
  origin_module?: string | null;
  origin_entity_type?: string | null;
  origin_entity_id?: string | null;
  origin_reason?: string | null;
  goal_id?: string | null;
  trashed_at?: string | null;
  trashed_by_member_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by_member_id?: string | null;
  cancelled_reason?: string | null;
  cancelled_from_status?: string | null;
  recurrence?: {
    seriesId?: string | null;
    summary?: string | null;
    rule?: string | null;
    nextOccurrenceDate?: string | null;
  } | null;
  recurrenceSummary?: string | null;
};

export type CreatePlannerTaskPayload = {
  title: string;
  description?: string;
  priority?: PlannerTaskPriority;
  template_key?: PlannerTaskTemplateKey | null;
  category?: string;
  due_date?: string;
  due_time?: string;
  assigned_to_member_id?: string;
  requires_verification?: boolean;
  goal_id?: string | null;
};

export type UpdatePlannerTaskPayload = Partial<CreatePlannerTaskPayload> & {
  expected_version?: number;
};

export type PlannerTaskFilters = {
  status?: PlannerTaskStatus;
  assigned_to_member_id?: string;
  from?: string;
  to?: string;
  template_key?: PlannerTaskTemplateKey;
  include_cancelled?: boolean;
  limit?: number;
  goal_id?: string;
};

export type PlannerTaskAssignmentKindV1 = 'anyone' | 'members' | 'legacy_unassigned';
export type PlannerTaskFulfillmentModeV1 = 'shared_once' | 'each_person';
export type PlannerTaskFulfillmentStatusV1 =
  | 'pending'
  | 'completed'
  | 'awaiting_verification'
  | 'correction_requested'
  | 'verified';
export type PlannerTaskAggregateStateV1 =
  | 'pending'
  | 'partially_completed'
  | 'completed'
  | 'awaiting_verification'
  | 'correction_requested'
  | 'verified';

export type PlannerTaskMemberV1 = {
  id: string;
  personId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  status?: string | null;
};

export type PlannerTaskFulfillmentV1 = {
  id: string;
  scope: 'shared' | 'individual';
  responsibleMember: PlannerTaskMemberV1 | null;
  status: PlannerTaskFulfillmentStatusV1;
  version: number;
  completedBy: PlannerTaskMemberV1 | null;
  completedAt: string | null;
  verifiedBy: PlannerTaskMemberV1 | null;
  verifiedAt: string | null;
  correctionRequestedBy: PlannerTaskMemberV1 | null;
  correctionRequestedAt: string | null;
  correctionComment: string | null;
  resubmittedBy?: PlannerTaskMemberV1 | null;
  resubmittedAt?: string | null;
  resubmissionNote?: string | null;
  inactiveAt: string | null;
  retiredAt: string | null;
};

export type PlannerTaskFulfillmentDtoV1 = {
  taskId: string;
  taskVersion: number;
  assignment: {
    kind: PlannerTaskAssignmentKindV1;
    mode: PlannerTaskFulfillmentModeV1;
    version: number;
    legacyResolutionRequired: boolean;
    assignees: PlannerTaskMemberV1[];
  };
  fulfillments: PlannerTaskFulfillmentV1[];
  aggregate: {
    state: PlannerTaskAggregateStateV1;
    total: number;
    pending: number;
    completed: number;
    awaitingVerification: number;
    correctionRequested: number;
    verified: number;
  };
  availableActions: Array<{ action: string; fulfillmentId?: string }>;
};

export type UpdatePlannerTaskAssignmentV1Payload = {
  assignmentKind: 'anyone' | 'members';
  fulfillmentMode: PlannerTaskFulfillmentModeV1;
  memberIds: string[];
  confirmHistoricalTransition?: boolean;
  confirmLegacyResolution?: boolean;
};

type PlannerTaskResponse = {
  task: PlannerTask;
};

type PlannerTasksResponse = {
  tasks: PlannerTask[];
};

type PlannerTaskFulfillmentResponseV1 = {
  task: PlannerTaskFulfillmentDtoV1;
};

export type PlannerTaskMutationOptions = {
  idempotencyKey?: string;
  mutationId?: string;
  signal?: AbortSignal | null;
  timeoutMs?: number;
  contextScope?: string | null;
};

export type PlannerTaskMutationEnvelope<TData> = PlannerMutationResult<TData>;

const toQueryString = (filters?: PlannerTaskFilters) => {
  const params = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const listPlannerTasks = (accessToken: string, filters?: PlannerTaskFilters) =>
  requestJson<PlannerTasksResponse>(
    `/api/planner/tasks${toQueryString(filters)}`,
    plannerReadRequestOptions({ accessToken }),
  );

export const getTaskById = (accessToken: string, taskId: string) =>
  requestJson<PlannerTaskResponse>(
    `/api/planner/tasks/${taskId}`,
    plannerReadRequestOptions({ accessToken }),
  );

const createTaskIntent = (
  operation: string,
  options?: PlannerTaskMutationOptions,
): PlannerMutationIntent => {
  const intent = createPlannerMutationIntent({ kind: 'create', entityKind: operation });
  return {
    ...intent,
    mutationId: options?.mutationId ?? intent.mutationId,
    idempotencyKey: options?.idempotencyKey ?? intent.idempotencyKey,
  };
};

const versionedTaskIntent = (
  expectedVersion: number,
  options?: PlannerTaskMutationOptions,
): PlannerMutationIntent => {
  const intent = buildPlannerVersionedIntent('task', expectedVersion);
  return {
    ...intent,
    mutationId: options?.mutationId ?? intent.mutationId,
    idempotencyKey: options?.idempotencyKey ?? intent.idempotencyKey,
  };
};

const mutationIdentityOf = (intent: PlannerMutationIntent): PlannerMutationIdentity => ({
  mutationId: intent.mutationId,
  idempotencyKey: intent.idempotencyKey ?? '',
});

export const createPlannerTask = (
  accessToken: string,
  payload: CreatePlannerTaskPayload,
  options?: PlannerTaskMutationOptions,
) => {
  const intent = createTaskIntent('planner.tasks.create', options);
  return requestJson<PlannerTaskResponse>('/api/planner/tasks', {
    ...plannerMutationRequestOptions({
      accessToken,
      payload,
      intent,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'POST',
  })
}

export const createPlannerTaskMutation = async (
  accessToken: string,
  payload: CreatePlannerTaskPayload,
  options?: PlannerTaskMutationOptions,
): Promise<PlannerTaskMutationEnvelope<PlannerTaskResponse>> => {
  const intent = createTaskIntent('planner.tasks.create', options);
  const response = await requestJson<PlannerTaskResponse>('/api/planner/tasks', {
    ...plannerMutationRequestOptions({
      accessToken,
      payload,
      intent,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'POST',
  });
  return normalizePlannerMutationResult<PlannerTaskResponse>(response, mutationIdentityOf(intent));
};

export const updatePlannerTask = (
  accessToken: string,
  taskId: string,
  payload: UpdatePlannerTaskPayload,
  options?: PlannerTaskMutationOptions,
) => {
  const expectedVersion = payload.expected_version ?? 1;
  const intent = versionedTaskIntent(expectedVersion, options);
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}`, {
    ...plannerMutationRequestOptions({
      accessToken,
      payload,
      intent,
      expectedVersion,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'PATCH',
  });
};

export const cancelPlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: PlannerTaskMutationOptions,
) => {
  const version = expectedVersion ?? 1;
  const intent = versionedTaskIntent(version, options);
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}`, {
    ...plannerMutationRequestOptions({
      accessToken,
      intent,
      expectedVersion: version,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'DELETE',
  });
};

export const completePlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: PlannerTaskMutationOptions,
) => {
  const version = expectedVersion ?? 1;
  const intent = versionedTaskIntent(version, options);
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/complete`, {
    ...plannerMutationRequestOptions({
      accessToken,
      intent,
      expectedVersion: version,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'POST',
  });
};

export const submitPlannerTaskForVerification = completePlannerTask;

export const verifyPlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: PlannerTaskMutationOptions,
) => {
  const version = expectedVersion ?? 1;
  const intent = versionedTaskIntent(version, options);
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/verify`, {
    ...plannerMutationRequestOptions({
      accessToken,
      intent,
      expectedVersion: version,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'POST',
  });
};

export const trashPlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: PlannerTaskMutationOptions,
) => {
  const version = expectedVersion ?? 1;
  const intent = versionedTaskIntent(version, options);
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/trash`, {
    ...plannerMutationRequestOptions({
      accessToken,
      intent,
      expectedVersion: version,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'POST',
  });
};

export const reactivatePlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: PlannerTaskMutationOptions,
) => {
  const version = expectedVersion ?? 1;
  const intent = versionedTaskIntent(version, options);
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/reactivate`, {
    ...plannerMutationRequestOptions({
      accessToken,
      intent,
      expectedVersion: version,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'POST',
  });
};

export const restorePlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: PlannerTaskMutationOptions,
) => {
  const version = expectedVersion ?? 1;
  const intent = versionedTaskIntent(version, options);
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/restore`, {
    ...plannerMutationRequestOptions({
      accessToken,
      intent,
      expectedVersion: version,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method: 'POST',
  });
};

type PlannerTaskV1MutationOptions = PlannerTaskMutationOptions;

const requestPlannerTaskV1Mutation = (
  accessToken: string,
  path: string,
  operation: string,
  expectedVersion: number,
  body: Record<string, unknown> | undefined,
  options?: PlannerTaskV1MutationOptions,
  method: 'POST' | 'PUT' = 'POST',
) => {
  const intent = versionedTaskIntent(expectedVersion, {
    ...options,
    idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(operation),
  });
  return requestJson<PlannerTaskFulfillmentResponseV1>(path, {
    ...plannerMutationRequestOptions({
      accessToken,
      payload: body,
      intent,
      expectedVersion,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      contextScope: options?.contextScope,
    }),
    method,
  });
};

export const getPlannerTaskFulfillmentV1 = (accessToken: string, taskId: string) =>
  requestJson<PlannerTaskFulfillmentResponseV1>(
    `/api/planner/v1/tasks/${taskId}/fulfillment`,
    plannerReadRequestOptions({ accessToken }),
  );

export const updatePlannerTaskAssignmentV1 = (
  accessToken: string,
  taskId: string,
  expectedAssignmentVersion: number,
  payload: UpdatePlannerTaskAssignmentV1Payload,
  options?: PlannerTaskV1MutationOptions,
) => requestPlannerTaskV1Mutation(
  accessToken,
  `/api/planner/v1/tasks/${taskId}/assignment`,
  'planner.v1.tasks.assignment.update',
  expectedAssignmentVersion,
  payload,
  options,
  'PUT',
);

export const claimPlannerTaskV1 = (
  accessToken: string,
  taskId: string,
  expectedAssignmentVersion: number,
  options?: PlannerTaskV1MutationOptions,
) => requestPlannerTaskV1Mutation(
  accessToken,
  `/api/planner/v1/tasks/${taskId}/claim`,
  'planner.v1.tasks.claim',
  expectedAssignmentVersion,
  undefined,
  options,
);

const mutatePlannerTaskFulfillmentV1 = (
  accessToken: string,
  taskId: string,
  fulfillmentId: string,
  action: 'complete' | 'verify' | 'request-correction' | 'resubmit' | 'revert' | 'reopen',
  expectedFulfillmentVersion: number,
  body?: Record<string, unknown>,
  options?: PlannerTaskV1MutationOptions,
) => requestPlannerTaskV1Mutation(
  accessToken,
  `/api/planner/v1/tasks/${taskId}/fulfillments/${fulfillmentId}/${action}`,
  `planner.v1.tasks.fulfillments.${action.replace('-', '_')}`,
  expectedFulfillmentVersion,
  body,
  options,
);

export const completePlannerTaskFulfillmentV1 = (
  accessToken: string, taskId: string, fulfillmentId: string, expectedVersion: number,
  options?: PlannerTaskV1MutationOptions,
) => mutatePlannerTaskFulfillmentV1(accessToken, taskId, fulfillmentId, 'complete', expectedVersion, undefined, options);

export const verifyPlannerTaskFulfillmentV1 = (
  accessToken: string, taskId: string, fulfillmentId: string, expectedVersion: number,
  options?: PlannerTaskV1MutationOptions,
) => mutatePlannerTaskFulfillmentV1(accessToken, taskId, fulfillmentId, 'verify', expectedVersion, undefined, options);

export const requestPlannerTaskCorrectionV1 = (
  accessToken: string, taskId: string, fulfillmentId: string, expectedVersion: number,
  comment?: string, options?: PlannerTaskV1MutationOptions,
) => mutatePlannerTaskFulfillmentV1(accessToken, taskId, fulfillmentId, 'request-correction', expectedVersion, { comment }, options);

export const resubmitPlannerTaskFulfillmentV1 = (
  accessToken: string, taskId: string, fulfillmentId: string, expectedVersion: number,
  note?: string, options?: PlannerTaskV1MutationOptions,
) => mutatePlannerTaskFulfillmentV1(accessToken, taskId, fulfillmentId, 'resubmit', expectedVersion, { note }, options);

export const revertPlannerTaskFulfillmentV1 = (
  accessToken: string, taskId: string, fulfillmentId: string, expectedVersion: number,
  options?: PlannerTaskV1MutationOptions,
) => mutatePlannerTaskFulfillmentV1(accessToken, taskId, fulfillmentId, 'revert', expectedVersion, undefined, options);

export const reopenPlannerTaskFulfillmentV1 = (
  accessToken: string, taskId: string, fulfillmentId: string, expectedVersion: number,
  options?: PlannerTaskV1MutationOptions,
) => mutatePlannerTaskFulfillmentV1(accessToken, taskId, fulfillmentId, 'reopen', expectedVersion, undefined, options);

/**
 * G0.3 vertical proof — optimistic complete with cache integration.
 * Demonstrates the full lifecycle: snapshot → patch → server call → reconcile/rollback.
 * Uses plannerCache for context-token-protected storage and exact rollback on 412/5xx/offline.
 */
export async function completePlannerTaskOptimistic(
  accessToken: string,
  taskId: string,
  expectedVersion: number,
  options: { householdId: string; idempotencyKey?: string; signal?: AbortSignal; timeoutMs?: number },
) {
  const mutationId = `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const idempotencyKey = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.complete');

  // Keys are readonly (string | number)[]; convert to unknown[][] for cache API
  const scope = { householdId: options.householdId };
  const detailKey = plannerKeys.tasks.detail(scope, taskId) as unknown[];
  const listKeys = [
    plannerKeys.tasks.all(scope) as unknown[],
    plannerKeys.tasks.list(scope, {}) as unknown[],
  ];
  const affectedKeys = [detailKey, ...listKeys];

  // Register mutation with snapshot (for rollback)
  plannerCache.registerPendingMutation(mutationId, affectedKeys, scope);

  // 2. Optimistic patch: mark task as completed locally
  const newStatus = 'completed' as const;
  plannerCache.applyOptimisticPatch(affectedKeys, (current: any) => {
    if (!current) return current;
    if (Array.isArray(current)) {
      return current.map((t: any) => t.id === taskId ? { ...t, status: newStatus, version: t.version + 1 } : t);
    }
    if (current.id === taskId) {
      return { ...current, status: newStatus, version: current.version + 1 };
    }
    return current;
  });

  try {
    // 3. Server call with If-Match and Idempotency-Key
    const headers: Record<string, string> = { 'Idempotency-Key': idempotencyKey, 'If-Match': String(expectedVersion) };
    const response = await requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/complete`, {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });

    // 4. Success: reconcile with canonical server response
    plannerCache.reconcileOptimistic(mutationId, scope, response.task, detailKey);

    // 5. Directed invalidation (detail is now canonical; lists will refetch)
    plannerCache.executeInvalidation(
      { kind: 'task', action: 'complete', entityId: taskId },
      scope,
    );

    return response;
  } catch (error) {
    // 6. Error: rollback to exact snapshot
    //    On 412 (version_conflict_v2) we rollback and do NOT silently retry.
    if (error instanceof Error && 'status' in error && (error as any).status === 412) {
      plannerCache.rollbackOptimistic(mutationId);
      throw error;
    }
    // Other errors (network, 5xx, abort) — rollback and rethrow
    plannerCache.rollbackOptimistic(mutationId);
    throw error;
  }
}
