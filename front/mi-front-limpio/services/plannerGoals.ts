import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';

export type PlannerGoalStatus = 'active' | 'completed' | 'closed';

export type PlannerGoalVisibility = 'household' | 'personal';

export type PlannerGoalCategory =
  | 'home'
  | 'family'
  | 'finance'
  | 'health'
  | 'education'
  | 'other';

export type PlannerGoalTargetType =
  | 'count'
  | 'percentage'
  | 'amount'
  | 'boolean';

export type PlannerGoalProgressMode =
  | 'steps'
  | 'tasks'
  | 'numeric'
  | 'boolean'
  | 'none';

export type PlannerGoal = {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  status: PlannerGoalStatus;
  visibility: PlannerGoalVisibility;
  category: PlannerGoalCategory;
  progress_mode: PlannerGoalProgressMode;
  target_type: PlannerGoalTargetType | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_by_member_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  failed_at: string | null;
  deleted_at: string | null;
  trashed_at: string | null;
  trashed_by_member_id: string | null;
  progress_percentage: number | null;
  tasks_total?: number | null;
  tasks_completed?: number | null;
  tasks_pending?: number | null;
  milestones_total?: number | null;
  milestones_completed?: number | null;
  version: number;
};

export type PlannerGoalMilestone = {
  id: string;
  goal_id: string;
  title: string;
  target_value: number | null;
  achieved: boolean;
  achieved_at: string | null;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
  trashed_at: string | null;
  trashed_by_member_id: string | null;
  version: number;
};

export type CreatePlannerGoalInput = {
  title: string;
  description?: string | null;
  visibility?: PlannerGoalVisibility;
  category?: PlannerGoalCategory;
  progress_mode?: PlannerGoalProgressMode;
  target_type?: PlannerGoalTargetType | null;
  target_value?: number | null;
  current_value?: number;
  unit?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type UpdatePlannerGoalInput = Partial<CreatePlannerGoalInput> & {
  expected_version?: number;
};

export type CreateMilestoneInput = {
  title: string;
  target_value?: number | null;
  sort_order?: number;
};

export type UpdateMilestoneInput = {
  title?: string;
  target_value?: number | null;
  achieved?: boolean;
  sort_order?: number;
  expected_version?: number;
};

export type PlannerGoalFilters = {
  status?: PlannerGoalStatus;
  category?: PlannerGoalCategory;
  visibility?: PlannerGoalVisibility;
  only_mine?: boolean;
  ends_at_from?: string;
  ends_at_to?: string;
  limit?: number;
};

type PlannerGoalResponse = {
  goal: PlannerGoal;
};

type PlannerGoalsResponse = {
  goals: PlannerGoal[];
};

type PlannerGoalWithMilestonesResponse = {
  goal: PlannerGoal;
  milestones: PlannerGoalMilestone[];
};

type PlannerGoalMilestoneResponse = {
  milestone: PlannerGoalMilestone;
};

type PlannerGoalMilestonesResponse = {
  milestones: PlannerGoalMilestone[];
};

const toQueryString = (filters?: PlannerGoalFilters) => {
  const params = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const listGoals = (accessToken: string, filters?: PlannerGoalFilters) =>
  requestJson<PlannerGoalsResponse>(
    `/api/planner/goals${toQueryString(filters)}`,
    { accessToken },
  );

export const getGoalById = (accessToken: string, goalId: string) =>
  requestJson<PlannerGoalWithMilestonesResponse>(
    `/api/planner/goals/${goalId}`,
    { accessToken },
  );

export const createGoal = (
  accessToken: string,
  payload: CreatePlannerGoalInput,
  options?: { idempotencyKey?: string; mutationId?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.create')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (options?.mutationId) {
    headers['X-Mutation-Id'] = options.mutationId
  }
  return requestJson<PlannerGoalResponse>('/api/planner/goals', {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    body: payload,
    headers,
  })
}

export const updateGoal = (
  accessToken: string,
  goalId: string,
  payload: UpdatePlannerGoalInput,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.update')
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}`, {
    method: 'PATCH',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: payload,
    headers: { 'Idempotency-Key': key },
  });
};

export const deleteGoal = (
  accessToken: string,
  goalId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.delete')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}`, {
    method: 'DELETE',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const trashGoal = (
  accessToken: string,
  goalId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.trash')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/trash`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const restoreGoal = (
  accessToken: string,
  goalId: string,
  expectedVersion: number,
  options?: { idempotencyKey?: string; mutationId?: string; signal?: AbortSignal | null; timeoutMs?: number },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.restore')
  const headers: Record<string, string> = {
    'Idempotency-Key': key,
    'If-Match': String(expectedVersion),
  }
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/restore`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
};

export const completeGoal = (
  accessToken: string,
  goalId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.complete')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/complete`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const closeGoal = (
  accessToken: string,
  goalId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string; closedReason?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.close')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/close`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: { closed_reason: options?.closedReason ?? null },
    headers,
  });
};

export const reopenGoal = (
  accessToken: string,
  goalId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.reopen')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/reopen`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers,
  });
};

export const failGoal = (
  accessToken: string,
  goalId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string; closedReason?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.fail')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/fail`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    body: { closed_reason: options?.closedReason ?? null },
    headers,
  });
};

export const listGoalMilestones = (accessToken: string, goalId: string) =>
  requestJson<PlannerGoalMilestonesResponse>(
    `/api/planner/goals/${goalId}/milestones`,
    { accessToken },
  );

export const createGoalMilestone = (
  accessToken: string,
  goalId: string,
  payload: CreateMilestoneInput,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.milestones.create')
  return requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      accessToken,
      body: payload,
      headers: { 'Idempotency-Key': key },
    },
  )
}

export const updateGoalMilestone = (
  accessToken: string,
  goalId: string,
  milestoneId: string,
  payload: UpdateMilestoneInput,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.milestones.update')
  return requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones/${milestoneId}`,
    {
      method: 'PATCH',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      body: payload,
      headers: { 'Idempotency-Key': key },
    },
  );
};

export const deleteGoalMilestone = (
  accessToken: string,
  goalId: string,
  milestoneId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.milestones.delete')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones/${milestoneId}`,
    {
      method: 'DELETE',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers,
    },
  );
};

export const trashGoalMilestone = (
  accessToken: string,
  goalId: string,
  milestoneId: string,
  expectedVersion?: number,
  options?: { idempotencyKey?: string },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.milestones.trash')
  const headers: Record<string, string> = { 'Idempotency-Key': key }
  if (expectedVersion !== undefined) {
    headers['If-Match'] = String(expectedVersion)
  }
  return requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones/${milestoneId}/trash`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers,
    },
  );
};

export const restoreGoalMilestone = (
  accessToken: string,
  goalId: string,
  milestoneId: string,
  expectedVersion: number,
  options?: { idempotencyKey?: string; mutationId?: string; signal?: AbortSignal | null; timeoutMs?: number },
) => {
  const key = options?.idempotencyKey ?? createIdempotencyKey('planner.goals.milestones.restore')
  const headers: Record<string, string> = {
    'Idempotency-Key': key,
    'If-Match': String(expectedVersion),
  }
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId
  return requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones/${milestoneId}/restore`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers,
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    },
  );
};
