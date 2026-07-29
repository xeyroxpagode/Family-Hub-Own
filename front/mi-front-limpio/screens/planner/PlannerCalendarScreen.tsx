import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { ErrorState } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  getPlannerCalendar,
  type PlannerCalendarView,
} from '../../services/plannerCalendar';
import {
  plannerFrontendCoreCalendar,
} from '../../services/planner/plannerFrontendCoreIntegration';
import type { PlannerCalendarProjection } from '../../services/planner/plannerCalendarProjection';
import {
  addDays,
  addMonths,
  dateToYMD,
  formatDate,
  getWeekDays,
  plannerStyles as S,
} from './plannerShared';
import { CalendarDayCell, WeekDayCell } from './PlannerCalendarComponents';

type Props = {
  readonly refreshKey?: number;
  readonly onCreateEvent?: (initialDate: string) => void;
  readonly onCreateTask?: (initialDueDate: string) => void;
  readonly onOpenProjection?: (projection: PlannerCalendarProjection) => void;
};

const viewLabels: Record<PlannerCalendarView, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mes',
};

const moveDate = (date: Date, view: PlannerCalendarView, direction: -1 | 1) => {
  if (view === 'day') return addDays(date, direction);
  if (view === 'week') return addDays(date, direction * 7);
  return addMonths(date, direction);
};

export function PlannerCalendarScreen({
  refreshKey,
  onCreateEvent,
  onCreateTask,
  onOpenProjection,
}: Props) {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token;
  const [view, setView] = useState<PlannerCalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<readonly PlannerCalendarProjection[]>([]);
  const [lastGoodItems, setLastGoodItems] = useState<readonly PlannerCalendarProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDateKey = dateToYMD(selectedDate);

  const loadCalendar = useCallback(async (silent = false) => {
    if (!accessToken || authLoading) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await getPlannerCalendar(accessToken, {
        view,
        date: selectedDateKey,
      });
      const combined = plannerFrontendCoreCalendar.combineItems(
        response.items.filter((item) => item.type === 'task' || item.type === 'event'),
      );
      setItems(combined);
      setLastGoodItems(combined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar el calendario.');
      if (!silent && lastGoodItems.length === 0) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, authLoading, selectedDateKey, view, lastGoodItems.length]);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      setLoading(false);
      return;
    }
    void loadCalendar();
  }, [loadCalendar, authLoading, accessToken]);

  useEffect(() => {
    if (!loading && refreshKey != null) void loadCalendar(true);
  }, [refreshKey]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadCalendar(true);
    setRefreshing(false);
  }, [loadCalendar]);

  const dayGroups = useMemo(() => plannerFrontendCoreCalendar.groupByDay(items), [items]);
  const visibleItems = error && lastGoodItems.length > 0 ? lastGoodItems : items;
  const visibleDayGroups = useMemo(() => plannerFrontendCoreCalendar.groupByDay(visibleItems), [visibleItems]);
  const selectedDateItems = useMemo(
    () => visibleDayGroups.find((group) => group.date === selectedDateKey)?.items ?? [],
    [visibleDayGroups, selectedDateKey],
  );

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const firstWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) days.push(new Date(year, month, day));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [selectedDate]);

  const today = useMemo(() => dateToYMD(new Date()), []);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const countForDate = useCallback(
    (dateKey: string) => visibleDayGroups.find((group) => group.date === dateKey)?.count ?? 0,
    [visibleDayGroups],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={[S.headerRow, { marginBottom: 16 }]}>
        <Text style={S.sectionTitle}>Calendario</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingRight: spacing[4] }}>
        {(['day', 'week', 'month'] as PlannerCalendarView[]).map((viewKey) => {
          const active = view === viewKey;
          return (
            <TouchableOpacity
              key={viewKey}
              style={[S.calendarViewChip, active && S.calendarViewChipActive]}
              onPress={() => setView(viewKey)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[S.calendarViewChipText, active && S.calendarViewChipTextActive]}>{viewLabels[viewKey]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[S.row, { marginBottom: 14, justifyContent: 'center', alignItems: 'center', gap: spacing[2] }]}>
        <TouchableOpacity
          style={S.calendarNavArrow}
          onPress={() => setSelectedDate((prev) => moveDate(prev, view, -1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Periodo anterior"
        >
          <HomePlusIcon name="chevron-back" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={S.calendarNavToday} onPress={() => setSelectedDate(new Date())}>
          <Text style={S.calendarNavTodayText}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={S.calendarNavArrow}
          onPress={() => setSelectedDate((prev) => moveDate(prev, view, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Periodo siguiente"
        >
          <HomePlusIcon name="chevron-forward" size={18} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <Text style={[S.label, { marginBottom: 12, textTransform: 'none', fontSize: 13, textAlign: 'center' }]}>
        {view === 'month'
          ? selectedDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
          : view === 'week'
          ? `${formatDate(dateToYMD(weekDays[0].date))} al ${formatDate(dateToYMD(weekDays[6].date))}`
          : selectedDateKey === today
          ? `Hoy, ${formatDate(dateToYMD(selectedDate))}`
          : `${selectedDate.toLocaleDateString('es-AR', { weekday: 'long' })}, ${formatDate(dateToYMD(selectedDate))}`}
      </Text>

      {view === 'month' ? (
        <View style={[S.monthGrid, { marginBottom: 20 }]}>
          {['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'].map((day) => (
            <Text key={day} style={S.monthWeekday}>{day.slice(0, 1)}</Text>
          ))}
          {monthDays.map((day, index) => {
            const dateKey = day ? dateToYMD(day) : '';
            const count = dateKey ? countForDate(dateKey) : 0;
            return (
              <CalendarDayCell
                key={`${dateKey || 'blank'}-${index}`}
                day={day}
                dateKey={dateKey}
                selected={dateKey === selectedDateKey}
                isToday={dateKey === today}
                hasEvent={false}
                hasTask={false}
                count={count}
                onPress={() => day && setSelectedDate(day)}
              />
            );
          })}
        </View>
      ) : view === 'week' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ paddingRight: spacing[4] }}>
          <View style={[S.weekStrip, { flexDirection: 'row', gap: 8 }]}>
            {weekDays.map((dayInfo) => {
              const dateKey = dateToYMD(dayInfo.date);
              return (
                <WeekDayCell
                  key={dateKey}
                  date={dayInfo.date}
                  dateKey={dateKey}
                  dayLabel={dayInfo.dayLabel}
                  dayNumber={dayInfo.dayNumber}
                  selected={dateKey === selectedDateKey}
                  isToday={dateKey === today}
                  hasEvent={false}
                  hasTask={false}
                  count={countForDate(dateKey)}
                  onPress={() => setSelectedDate(dayInfo.date)}
                />
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={[S.emptyBox, { minHeight: 160 }]}>
          <ActivityIndicator color={colors.terracotta[500]} />
          <Text style={[S.emptyText, { marginTop: 12 }]}>Cargando calendario...</Text>
        </View>
      ) : null}

      {!loading && error && visibleItems.length === 0 ? (
        <ErrorState title="No pudimos cargar el calendario" description={error} retryLabel="Reintentar" onRetry={() => void loadCalendar()} />
      ) : null}

      {!loading && error && visibleItems.length > 0 ? (
        <View style={[S.toastBox, { marginBottom: 12 }]}>
          <HomePlusIcon name="alert-circle" size={18} color={colors.warning.base} />
          <Text style={[S.emptyText, { flex: 1 }]}>Mostrando los ultimos datos disponibles.</Text>
        </View>
      ) : null}

      {!loading && !error && dayGroups.length === 0 ? (
        <View style={S.calendarEmptyState}>
          <Text style={S.calendarEmptyTitle}>
            {view === 'day' ? 'Dia tranquilo' : view === 'week' ? 'Semana tranquila' : 'No hay nada programado este mes'}
          </Text>
          <Text style={S.calendarEmptyText}>
            Los eventos y tareas con fecha van a aparecer en el calendario.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <TouchableOpacity style={[S.primaryBtn, { marginTop: 8 }]} onPress={() => onCreateEvent?.(selectedDateKey)}>
              <Text style={S.btnText}>Crear evento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.secondaryBtn, { marginTop: 8 }]} onPress={() => onCreateTask?.(selectedDateKey)}>
              <Text style={S.secondaryText}>Crear tarea</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!loading && visibleItems.length > 0 && selectedDateItems.length === 0 ? (
        <View style={S.calendarEmptyState}>
          <Text style={S.calendarEmptyTitle}>Dia tranquilo</Text>
          <Text style={S.calendarEmptyText}>No hay tareas ni eventos para esta fecha.</Text>
        </View>
      ) : null}

      {!loading && selectedDateItems.length > 0 ? (
        <View>
          <Text style={[S.label, { marginTop: 8, textTransform: 'none', fontSize: 13 }]}>
            Agenda del {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}
          </Text>
          {selectedDateItems.map((item) => (
            <TouchableOpacity
              key={`${item.entityType}:${item.entityId}:${item.projectionId ?? item.semanticDate}`}
              style={[S.calendarAgendaCard, item.entityType === 'event' ? S.calendarAgendaCardEvent : S.calendarAgendaCardTask]}
              onPress={() => onOpenProjection?.(item)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir detalle de ${item.entityType === 'event' ? 'evento' : 'tarea'} ${item.title}`}
            >
              <View style={S.calendarAgendaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={S.calendarAgendaTitle}>{item.title}</Text>
                  <Text style={S.calendarAgendaMeta}>
                    {item.allDay ? 'Todo el dia' : item.start?.slice(11, 16) ?? ''}{item.timezone ? ` - ${item.timezone}` : ''}
                  </Text>
                </View>
                <View style={[S.calendarAgendaBadge, item.entityType === 'event' ? S.calendarAgendaBadgeEvent : S.calendarAgendaBadgeTask]}>
                  <Text style={[S.calendarAgendaBadgeText, item.entityType === 'event' ? S.calendarAgendaBadgeTextEvent : S.calendarAgendaBadgeTextTask]}>
                    {item.entityType === 'event' ? 'Evento' : 'Tarea'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
