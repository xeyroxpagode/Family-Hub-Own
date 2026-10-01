import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';

export type ResponsibilityLifecycle = 'active' | 'paused' | 'archived' | 'trashed';
export type ResponsibilityAssignmentKind = 'fixed' | 'rotation' | 'claimable' | 'unassigned';
export type ResponsibilityScheduleKind = 'daily' | 'weekdays' | 'interval' | 'monthly' | 'after_completion';
export type ResponsibilitySchedule = {
  kind: ResponsibilityScheduleKind;
  interval?: number;
  unit?: 'days' | 'weeks' | 'months' | null;
  weekdays?: number[];
  monthDay?: number | null;
  anchorDate: string;
  time?: string | null;
};
export type ResponsibilityOccurrence = { task_id: string; sequence: number; scheduled_date: string; resolved_at?: string | null; resolution_status?: string | null };
export type PlannerResponsibility = {
  id: string; title: string; description?: string | null; lifecycle: ResponsibilityLifecycle;
  assignment_kind: ResponsibilityAssignmentKind; schedule_kind: ResponsibilityScheduleKind;
  schedule_interval: number; schedule_unit?: 'days' | 'weeks' | 'months' | null;
  weekdays: number[]; month_day?: number | null; anchor_date: string; due_time?: string | null;
  task_defaults: Record<string, unknown>; next_sequence: number; requires_adjustment_reason?: string | null;
  version: number; members: Array<{ member_id: string; position: number }>;
  current_occurrence?: ResponsibilityOccurrence | null; occurrences: ResponsibilityOccurrence[];
};
export type ResponsibilityInput = {
  title: string; description?: string; assignmentKind: ResponsibilityAssignmentKind; memberIds: string[];
  schedule: ResponsibilitySchedule; taskDefaults?: Record<string, unknown>;
};

const mutation = <T>(accessToken: string, path: string, method: 'POST' | 'PATCH', body?: unknown, expectedVersion?: number) => {
  const headers: Record<string, string> = { 'Idempotency-Key': createIdempotencyKey(`planner.responsibilities.${path}`) };
  if (expectedVersion !== undefined) headers['If-Match'] = String(expectedVersion);
  return requestJson<T>(`/api/planner/${path}`, { accessToken, method, body, headers, operationKind: method === 'POST' && expectedVersion === undefined ? OPERATION_KINDS.CREATE_IDEMPOTENT : OPERATION_KINDS.VERSIONED_MUTATION });
};

export const listResponsibilities = (accessToken: string, lifecycle: ResponsibilityLifecycle = 'active') =>
  requestJson<{ responsibilities: PlannerResponsibility[] }>(`/api/planner/responsibilities?lifecycle=${lifecycle}`, { accessToken });
export const getResponsibility = (accessToken: string, id: string) =>
  requestJson<{ responsibility: PlannerResponsibility }>(`/api/planner/responsibilities/${id}`, { accessToken });
export const createResponsibility = (accessToken: string, input: ResponsibilityInput) =>
  mutation<{ responsibility: PlannerResponsibility }>(accessToken, 'responsibilities', 'POST', input);
export const updateResponsibility = (accessToken: string, id: string, input: Partial<ResponsibilityInput>, version: number) =>
  mutation<{ responsibility: PlannerResponsibility }>(accessToken, `responsibilities/${id}`, 'PATCH', input, version);
export const changeResponsibilityLifecycle = (accessToken: string, id: string, action: 'pause' | 'resume' | 'archive' | 'unarchive' | 'trash' | 'restore', version: number) =>
  mutation<{ responsibility: PlannerResponsibility }>(accessToken, `responsibilities/${id}/${action}`, 'POST', undefined, version);
export const replaceResponsibilityCurrentAssignee = (accessToken: string, id: string, taskVersion: number, memberIds: string[]) =>
  mutation<unknown>(accessToken, `responsibilities/${id}/current-task/replace-assignee`, 'POST', { memberIds }, taskVersion);

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function responsibilityScheduleSummary(item: PlannerResponsibility) {
  const time = item.due_time ? ` · ${item.due_time.slice(0, 5)}` : '';
  if (item.schedule_kind === 'daily') return `Todos los días${time}`;
  if (item.schedule_kind === 'weekdays') return `${item.schedule_interval > 1 ? `Cada ${item.schedule_interval} semanas · ` : ''}${item.weekdays.map((day) => DAYS[day]).join(', ')}${time}`;
  if (item.schedule_kind === 'monthly') return `El ${item.month_day} de cada mes${time}`;
  if (item.schedule_kind === 'after_completion') return `${item.schedule_interval} ${item.schedule_unit === 'months' ? 'meses' : item.schedule_unit === 'weeks' ? 'semanas' : 'días'} después de completar${time}`;
  return `Cada ${item.schedule_interval} ${item.schedule_unit === 'months' ? 'meses' : item.schedule_unit === 'weeks' ? 'semanas' : 'días'}${time}`;
}
