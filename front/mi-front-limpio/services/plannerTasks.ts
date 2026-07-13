import { requestJson } from './api';
import { createIdempotencyKey } from './idempotency';

export type PlannerTaskStatus =
  | 'pending'
  | 'completed'
  | 'awaiting_verification'
  | 'verified'
  | 'cancelled';

export type PlannerTaskPriority = 'low' | 'medium' | 'high' | 'critical';

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
    accessToken,
    body: payload,
    headers: { 'Idempotency-Key': key },
  })
}

export const updatePlannerTask = (
  accessToken: string,
  taskId: string,
  payload: UpdatePlannerTaskPayload,
) =>
  requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });

export const cancelPlannerTask = (accessToken: string, taskId: string, expectedVersion?: number) =>
  requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}`, {
    method: 'DELETE',
    accessToken,
    headers: expectedVersion !== undefined ? { 'If-Match': String(expectedVersion) } : undefined,
  });

export const completePlannerTask = (accessToken: string, taskId: string, expectedVersion?: number) =>
  requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/complete`, {
    method: 'POST',
    accessToken,
    headers: expectedVersion !== undefined ? { 'If-Match': String(expectedVersion) } : undefined,
  });

export const verifyPlannerTask = (accessToken: string, taskId: string, expectedVersion?: number) =>
  requestJson<PlannerTaskResponse>(`/api/planner/tasks/${taskId}/verify`, {
    method: 'POST',
    accessToken,
    headers: expectedVersion !== undefined ? { 'If-Match': String(expectedVersion) } : undefined,
  });
