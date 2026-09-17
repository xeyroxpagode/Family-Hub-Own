import { requestJson } from './api';
import type { PlannerEventRecurrence, PlannerEventStatus } from './plannerEvents';
import type { PlannerTaskPriority, PlannerTaskStatus, PlannerTaskTemplateKey } from './plannerTasks';

export type PlannerCalendarView = 'day' | 'week' | 'month';

export type PlannerCalendarEventItem = {
  type: 'event';
  id: string;
  occurrence_id?: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  all_day: boolean;
  location_name?: string | null;
  recurrence: PlannerEventRecurrence;
  is_recurring_occurrence?: boolean;
  is_override?: boolean;
  status: PlannerEventStatus;
  version: number;
};

export type PlannerCalendarTaskItem = {
  type: 'task';
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  status: PlannerTaskStatus;
  priority: PlannerTaskPriority;
  template_key?: PlannerTaskTemplateKey | null;
  category?: string | null;
  assigned_to_member_id?: string | null;
  requires_verification: boolean;
  version: number;
};

export type PlannerCalendarItem = PlannerCalendarEventItem | PlannerCalendarTaskItem;

export type PlannerCalendarResponse = {
  view: PlannerCalendarView;
  date: string;
  range: {
    from: string;
    to: string;
  };
  items: PlannerCalendarItem[];
};

export type PlannerCalendarParams = {
  view: PlannerCalendarView;
  date: string;
};

export const getPlannerCalendar = (accessToken: string, params: PlannerCalendarParams) => {
  const query = new URLSearchParams(params).toString();
  return requestJson<PlannerCalendarResponse>(`/api/planner/calendar?${query}`, { accessToken });
};
