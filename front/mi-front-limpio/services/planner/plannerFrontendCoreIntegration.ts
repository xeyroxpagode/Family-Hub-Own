import { toPlannerCalendarTaskProjection } from '../../adapters/planner/plannerTaskAdapters';
import type { PlannerCalendarEventItem, PlannerCalendarItem } from '../plannerCalendar';
import type { PlannerTask } from '../plannerTasks';
import { eventToCalendarProjection } from '../plannerEventsFrontend';
import type { PlannerEventV1 } from '../plannerEventsV1';
import { plannerTasksLaneContract } from '../../adapters/planner/plannerTaskAdapters';
import { plannerEventsLaneContract } from '../plannerEventsFrontend';
import { plansLaneAdapters } from './plannerPlans';
import {
  calendarBadgeForCount,
  combinePlannerCalendarProjections,
  groupPlannerCalendarByDay,
  type PlannerCalendarProjection,
} from './plannerCalendarProjection';

export const plannerFrontendCoreRootAdapters = {
  tasks: plannerTasksLaneContract.root,
  events: plannerEventsLaneContract.root,
  plans: plansLaneAdapters.root,
} as const;

export const plannerFrontendCoreTabs = [
  { key: 'tasks', label: 'Tareas', adapter: plannerFrontendCoreRootAdapters.tasks },
  { key: 'events', label: 'Eventos', adapter: plannerFrontendCoreRootAdapters.events },
  { key: 'plans', label: 'Planes', adapter: plannerFrontendCoreRootAdapters.plans },
] as const;

export function projectPlannerCoreCalendarItem(item: PlannerCalendarItem): PlannerCalendarProjection | null {
  if (item.type === 'task') {
    return toPlannerCalendarTaskProjection(item as unknown as PlannerTask);
  }
  return eventToCalendarProjection(calendarEventItemToEventV1(item));
}

export function combinePlannerCoreCalendarItems(
  items: readonly PlannerCalendarItem[],
): readonly PlannerCalendarProjection[] {
  return combinePlannerCalendarProjections(
    items
      .map(projectPlannerCoreCalendarItem)
      .filter((item): item is PlannerCalendarProjection => item !== null),
  );
}

export const plannerFrontendCoreCalendar = {
  projectItem: projectPlannerCoreCalendarItem,
  combineItems: combinePlannerCoreCalendarItems,
  groupByDay: groupPlannerCalendarByDay,
  badgeForCount: calendarBadgeForCount,
} as const;

function calendarEventItemToEventV1(item: PlannerCalendarEventItem): PlannerEventV1 {
  const startDate = item.starts_at.slice(0, 10);
  const endDate = item.ends_at?.slice(0, 10) ?? startDate;
  return {
    id: item.id,
    version: item.version,
    scope: 'household',
    ownerPersonId: null,
    householdId: null,
    lifecycle: item.status === 'cancelled' ? 'cancelled' : 'scheduled',
    temporalCondition: null,
    title: item.title,
    description: item.description ?? null,
    scheduling: item.all_day
      ? { type: 'all_day', startDate, endDate }
      : {
          type: 'timed',
          startsAt: item.starts_at,
          endsAt: item.ends_at ?? null,
          durationMinutes: null,
          timeZone: 'America/Argentina/Buenos_Aires',
        },
    location: item.location_name
      ? { type: 'other', payload: { display_name: item.location_name } }
      : null,
    recurrence: {
      seriesId: null,
      occurrenceKey: item.occurrence_id ?? null,
      originalStartsAt: item.is_recurring_occurrence ? item.starts_at : null,
      originalStartDate: item.is_recurring_occurrence ? startDate : null,
      rule: item.recurrence && item.recurrence !== 'none'
        ? { frequency: item.recurrence }
        : null,
      seriesVersion: null,
      availableEditScopes: ['this_occurrence'],
    },
    attendanceRequired: false,
    participants: [],
    availableActions: ['update'],
    createdByPersonId: '',
    createdByMemberId: null,
    createdAt: item.starts_at,
    updatedAt: item.starts_at,
  };
}
