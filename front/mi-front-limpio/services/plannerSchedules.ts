import { requestJson } from './api';

export type ScheduleColorKey = 'terracotta' | 'sage' | 'blue' | 'gold';

export type HouseholdScheduleBlock = {
  id: string;
  household_id: string;
  person_id: string;
  title: string;
  days_of_week: number[];
  start_minutes: number;
  end_minutes: number;
  color_key: ScheduleColorKey;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type SchedulePayload = Pick<
  HouseholdScheduleBlock,
  'title' | 'days_of_week' | 'start_minutes' | 'end_minutes' | 'color_key' | 'note'
>;

export const listHouseholdSchedules = (accessToken: string, personId?: string) =>
  requestJson<{ person_id: string; can_view: boolean; schedules: HouseholdScheduleBlock[] }>(
    `/api/planner/schedules${personId ? `?person_id=${encodeURIComponent(personId)}` : ''}`,
    { accessToken },
  );

export const createHouseholdSchedule = (accessToken: string, payload: SchedulePayload) =>
  requestJson<{ schedule: HouseholdScheduleBlock }>('/api/planner/schedules', {
    method: 'POST',
    accessToken,
    body: payload,
  });

export const updateHouseholdSchedule = (accessToken: string, id: string, payload: SchedulePayload) =>
  requestJson<{ schedule: HouseholdScheduleBlock }>(`/api/planner/schedules/${id}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
  });

export const deleteHouseholdSchedule = (accessToken: string, id: string) =>
  requestJson<{ deleted: boolean }>(`/api/planner/schedules/${id}`, { method: 'DELETE', accessToken });

export const getSchedulePrivacy = (accessToken: string) =>
  requestJson<{ is_visible_to_household: boolean }>('/api/planner/schedules/privacy', { accessToken });

export const updateSchedulePrivacy = (accessToken: string, isVisible: boolean) =>
  requestJson<{ is_visible_to_household: boolean }>('/api/planner/schedules/privacy', {
    method: 'PUT',
    accessToken,
    body: { is_visible_to_household: isVisible },
  });
