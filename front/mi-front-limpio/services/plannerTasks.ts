import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';
import { plannerCache } from './planner/plannerCache';
import { plannerKeys } from './planner/plannerKeys';

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
  title: string;
  description?: string | null;
  status: PlannerTaskStatus;
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

type PlannerTaskResponse = {
  task: PlannerTask;
};

type PlannerTasksResponse = {
  tasks: PlannerTask[];
};

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
  requestJson<PlannerTasksResponse>(`/api/planner/tasks${toQueryString(filters)}`, { accessToken });

export const createPlannerTask = (
  accessToken: string,
  payload: CreatePlannerTaskPayload,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.create')
  return requestJson<PlannerTaskResponse>('/api/planner/tasks', {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers: { 'Idempotency-Key': key },
  })
}

export const updatePlannerTask = (
  accessToken: string,
  taskId: string,
  payload: UpdatePlannerTaskPayload,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.update')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (payload.expected_version !== undefined) {
    headers['If-Match'] = String(payload.expected_version)
  }
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}`, {
    method: 'PATCH',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    headers,
  });
};

export const cancelPlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.cancel')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}`, {
    method: 'DELETE',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const completePlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.complete')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/complete`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const verifyPlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.verify')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/verify`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const trashPlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.trash')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/trash`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const reactivatePlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.reactivate')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/reactivate`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const restorePlannerTask = (
  accessToken: string,
  taskId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.tasks.restore')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/restore`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

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
