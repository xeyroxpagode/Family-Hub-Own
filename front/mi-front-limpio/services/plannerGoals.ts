import { requestJson } from './api';

export type PlannerGoalStatus = 'active' | 'completed' | 'failed';

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
  failed_at: string | null;
  deleted_at: string | null;
  progress_percentage: number | null;
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

export type UpdatePlannerGoalInput = Partial<CreatePlannerGoalInput>;

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

export const createGoal = (accessToken: string, payload: CreatePlannerGoalInput) =>
  requestJson<PlannerGoalResponse>('/api/planner/goals', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export const updateGoal = (
  accessToken: string,
  goalId: string,
  payload: UpdatePlannerGoalInput,
) =>
  requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });

export const deleteGoal = (accessToken: string, goalId: string) =>
  requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}`, {
    method: 'DELETE',
    accessToken,
  });

export const completeGoal = (accessToken: string, goalId: string) =>
  requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/complete`, {
    method: 'POST',
    accessToken,
  });

export const failGoal = (accessToken: string, goalId: string) =>
  requestJson<PlannerGoalResponse>(`/api/planner/goals/${goalId}/fail`, {
    method: 'POST',
    accessToken,
  });

export const listGoalMilestones = (accessToken: string, goalId: string) =>
  requestJson<PlannerGoalMilestonesResponse>(
    `/api/planner/goals/${goalId}/milestones`,
    { accessToken },
  );

export const createGoalMilestone = (
  accessToken: string,
  goalId: string,
  payload: CreateMilestoneInput,
) =>
  requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones`,
    {
      method: 'POST',
      accessToken,
      body: payload,
    },
  );

export const updateGoalMilestone = (
  accessToken: string,
  goalId: string,
  milestoneId: string,
  payload: UpdateMilestoneInput,
) =>
  requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones/${milestoneId}`,
    {
      method: 'PATCH',
      accessToken,
      body: payload,
    },
  );

export const deleteGoalMilestone = (
  accessToken: string,
  goalId: string,
  milestoneId: string,
) =>
  requestJson<PlannerGoalMilestoneResponse>(
    `/api/planner/goals/${goalId}/milestones/${milestoneId}`,
    {
      method: 'DELETE',
      accessToken,
    },
  );
