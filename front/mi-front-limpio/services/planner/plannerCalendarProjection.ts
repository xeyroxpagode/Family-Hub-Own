import type { PlannerEntityDetailParams } from '../../navigation/plannerNavigationContract';

export type PlannerCalendarEntityType = 'task' | 'event';
export type PlannerCalendarLifecycle = 'active' | 'scheduled' | 'cancelled' | 'completed' | 'verified' | 'paused' | 'trash' | string;

export type PlannerCalendarDestination = {
  readonly route: 'TaskDetail' | 'EventDetail';
  readonly params: PlannerEntityDetailParams;
};

export type PlannerCalendarProjection = {
  readonly entityType: PlannerCalendarEntityType;
  readonly entityId: string;
  readonly projectionId?: string;
  readonly semanticDate: string;
  readonly timed: boolean;
  readonly allDay: boolean;
  readonly start?: string | null;
  readonly end?: string | null;
  readonly timezone?: string | null;
  readonly title: string;
  readonly lifecycle: PlannerCalendarLifecycle;
  readonly destination: PlannerCalendarDestination;
  readonly domainActionKey?: string;
};

export type PlannerCalendarDay = {
  readonly date: string;
  readonly count: number;
  readonly badge: '' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '9+';
  readonly items: readonly PlannerCalendarProjection[];
};

export function combinePlannerCalendarProjections(
  projections: readonly PlannerCalendarProjection[],
): readonly PlannerCalendarProjection[] {
  const byIdentity = new Map<string, PlannerCalendarProjection>();
  for (const item of projections) {
    const identity = `${item.entityType}:${item.entityId}:${item.projectionId ?? item.semanticDate}`;
    const current = byIdentity.get(identity);
    if (!current || compareCalendarProjection(item, current) < 0) {
      byIdentity.set(identity, item);
    }
  }
  return [...byIdentity.values()].sort(compareCalendarProjection);
}

export function groupPlannerCalendarByDay(
  projections: readonly PlannerCalendarProjection[],
): readonly PlannerCalendarDay[] {
  const grouped = new Map<string, PlannerCalendarProjection[]>();
  for (const item of combinePlannerCalendarProjections(projections)) {
    grouped.set(item.semanticDate, [...(grouped.get(item.semanticDate) ?? []), item]);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      count: items.length,
      badge: calendarBadgeForCount(items.length),
      items,
    }));
}

export function countPlannerCalendarDay(
  projections: readonly PlannerCalendarProjection[],
  date: string,
): number {
  return groupPlannerCalendarByDay(projections).find((day) => day.date === date)?.count ?? 0;
}

export function calendarBadgeForCount(count: number): PlannerCalendarDay['badge'] {
  if (count <= 0) return '';
  if (count > 9) return '9+';
  return String(count) as PlannerCalendarDay['badge'];
}

export function semanticLocalDateFromProjection(input: {
  readonly dateOnly?: string | null;
  readonly allDayDate?: string | null;
  readonly instant?: string | null;
  readonly timezone?: string | null;
}): string {
  if (input.dateOnly) return input.dateOnly.slice(0, 10);
  if (input.allDayDate) return input.allDayDate.slice(0, 10);
  if (!input.instant) return '';
  return input.instant.slice(0, 10);
}

function compareCalendarProjection(a: PlannerCalendarProjection, b: PlannerCalendarProjection): number {
  const date = a.semanticDate.localeCompare(b.semanticDate);
  if (date !== 0) return date;
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  const start = (a.start ?? '').localeCompare(b.start ?? '');
  if (start !== 0) return start;
  const type = a.entityType.localeCompare(b.entityType);
  if (type !== 0) return type;
  return a.entityId.localeCompare(b.entityId);
}
