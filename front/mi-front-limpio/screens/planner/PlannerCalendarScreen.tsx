import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ErrorState } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { ApiError } from '../../services/api';
import { getPlannerCalendar, type PlannerCalendarEventItem, type PlannerCalendarItem, type PlannerCalendarView } from '../../services/plannerCalendar';
import { cancelPlannerEvent, listPlannerEvents, reactivatePlannerEvent, trashPlannerEvent, type PlannerEvent } from '../../services/plannerEvents';
import { cancelPlannerTask, completePlannerTask, reactivatePlannerTask, trashPlannerTask } from '../../services/plannerTasks';
import { createIdempotencyKey } from '../../services/idempotency';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import {
  addDays,
  addMonths,
  dateToYMD,
  formatDate,
  getViewDateRange,
  getWeekDays,
  plannerStyles as S,
} from './plannerShared';
import { AgendaItemCard, CalendarDayCell, WeekDayCell } from './PlannerCalendarComponents';
import { colors, spacing } from '../../constants/theme';

type Props = {
  refreshKey?: number;
  onChanged?: () => void;
  onCreateEvent?: (initialDate: string) => void;
  onEditEvent?: (
    eventId: string,
    context?: {
      baseEventId?: string;
      occurrenceId?: string;
      occurrenceStartsAt?: string;
      occurrenceEndsAt?: string;
      isGeneratedRecurringOccurrence?: boolean;
    },
  ) => void;
  onEditTask?: (taskId: string) => void;
  onCreateTask?: (initialDueDate: string) => void;
  onShowToast?: (message: string) => void;
};

type StatusFilter = 'scheduled' | 'cancelled';

const statusFilterLabels: Record<StatusFilter, string> = {
  scheduled: 'Programados',
  cancelled: 'Cancelados',
};

const viewLabels: Record<PlannerCalendarView, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

const getItemDateKey = (item: PlannerCalendarItem) =>
  item.type === 'event' ? dateToYMD(new Date(item.starts_at)) : item.due_date ?? '';

const moveDate = (date: Date, view: PlannerCalendarView, direction: -1 | 1) => {
  if (view === 'day') return addDays(date, direction);
  if (view === 'week') return addDays(date, direction * 7);
  return addMonths(date, direction);
};

export function PlannerCalendarScreen({ refreshKey, onChanged, onCreateEvent, onEditEvent, onEditTask, onCreateTask, onShowToast }: Props) {
  const { session, loading: authLoading } = useAuth();
  const { members } = useHousehold();
  const { plannerChangedAt, markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;

  const [view, setView] = useState<PlannerCalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('scheduled');
  const [items, setItems] = useState<PlannerCalendarItem[]>([]);
  const [cancelledEvents, setCancelledEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventCancelKeyRef = useRef(createIdempotencyKey('planner.events.cancel'));
  const eventTrashKeyRef = useRef(createIdempotencyKey('planner.events.trash'));
  const eventReactivateKeyRef = useRef(createIdempotencyKey('planner.events.reactivate'));
  const taskCancelKeyRef = useRef(createIdempotencyKey('planner.tasks.cancel'));
  const taskReactivateKeyRef = useRef(createIdempotencyKey('planner.tasks.reactivate'));
  const taskCompleteKeyRef = useRef(createIdempotencyKey('planner.tasks.complete'));
  const taskTrashKeyRef = useRef(createIdempotencyKey('planner.tasks.trash'));

  const loadCancelledEvents = useCallback(async (silent = false) => {
    if (!accessToken || authLoading) return;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const { from, to } = getViewDateRange(view, selectedDate);
      if (__DEV__) {
        console.log('[PlannerCalendar] loadCancelledEvents', { view, selectedDate: selectedDate.toISOString(), from: from.toISOString(), to: to.toISOString() });
      }
      const response = await listPlannerEvents(accessToken, {
        status: 'cancelled',
        from: from.toISOString(),
        to: to.toISOString(),
        include_recurring: true,
        limit: 500,
      });
      if (__DEV__) {
        console.log('[PlannerCalendar] cancelledEvents loaded', { count: response.events.length });
      }
      setCancelledEvents(response.events);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar los eventos cancelados.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, authLoading, view, selectedDate]);

  const loadCalendar = useCallback(async (silent = false) => {
    if (!accessToken || authLoading) return;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await getPlannerCalendar(accessToken, {
        view,
        date: dateToYMD(selectedDate),
      });
      setItems(response.items.filter((item) => item.status !== 'cancelled'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar el calendario.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, authLoading, selectedDate, view]);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      setLoading(false);
      return;
    }
    if (statusFilter === 'scheduled') {
      void loadCalendar();
    } else {
      void loadCancelledEvents();
    }
  }, [accessToken, authLoading, statusFilter, loadCalendar, loadCancelledEvents]);

  useEffect(() => {
    if (!accessToken || authLoading) return;
    if (statusFilter === 'scheduled') {
      void loadCalendar(true);
    } else {
      void loadCancelledEvents(true);
    }
  }, [view, dateToYMD(selectedDate), statusFilter]);

  useEffect(() => {
    if (!loading && refreshKey != null) {
      if (statusFilter === 'scheduled') {
        void loadCalendar(true);
      } else {
        void loadCancelledEvents(true);
      }
    }
  }, [refreshKey]);

  useEffect(() => {
    if (!loading && plannerChangedAt > 0) {
      if (statusFilter === 'scheduled') {
        void loadCalendar(true);
      } else {
        void loadCancelledEvents(true);
      }
    }
  }, [plannerChangedAt]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PlannerCalendarItem[]>();
    items.forEach((item) => {
      const key = getItemDateKey(item);
      if (!key) return;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const selectedDateKey = dateToYMD(selectedDate);
const selectedDateItems = useMemo(
    () => groupedItems.find(([dateKey]) => dateKey === selectedDateKey)?.[1] ?? [],
    [groupedItems, selectedDateKey],
  );
  const eventDates = useMemo(() => new Set(groupedItems.map(([dateKey]) => dateKey)), [groupedItems]);
  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const first = new Date(year, month, 1);
    const firstWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<Date | null> = Array.from({ length: firstWeekday }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [selectedDate]);
  const today = useMemo(() => dateToYMD(new Date()), []);
  const viewLabel = viewLabels[view];
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const handleCreateTask = () => {
    onCreateTask?.(selectedDateKey);
  };

  const handleReactivateEvent = async (eventId: string, version?: number) => {
    if (!accessToken) return;
    try {
      setSavingId(eventId);
      const response = await reactivatePlannerEvent(accessToken, eventId, version, { idempotencyKey: eventReactivateKeyRef.current });
      const reactivated = response.event;
      setCancelledEvents((prev) => prev.filter((e) => e.id !== eventId));
      markPlannerChanged();
      onChanged?.();
      onShowToast?.('Evento reactivado.');
      eventReactivateKeyRef.current = createIdempotencyKey('planner.events.reactivate');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'version_conflict') {
        Alert.alert('Conflicto', 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.');
        await loadCancelledEvents(true);
      } else if (err instanceof ApiError && err.code === 'event_in_trash') {
        Alert.alert('Planner', 'El evento está en la papelera. Restáuralo desde allí.');
      } else {
        Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos reactivar el evento.');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleEditEvent = (item: PlannerCalendarEventItem) => {
    const context =
      item.is_recurring_occurrence && !item.is_override
        ? {
            baseEventId: item.id,
            occurrenceId: item.occurrence_id,
            occurrenceStartsAt: item.starts_at,
            occurrenceEndsAt: item.ends_at ?? undefined,
            isGeneratedRecurringOccurrence: true,
          }
        : undefined;

    onEditEvent?.(item.id, context);
  };

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
            >
              <Text style={[S.calendarViewChipText, active && S.calendarViewChipTextActive]}>{viewLabels[viewKey]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ paddingRight: spacing[4] }}>
        {(['scheduled', 'cancelled'] as StatusFilter[]).map((filterKey) => {
          const active = statusFilter === filterKey;
          return (
            <TouchableOpacity
              key={filterKey}
              style={[S.calendarViewChip, active && S.calendarViewChipActive]}
              onPress={() => {
                if (__DEV__) {
                  console.log('[PlannerCalendar] statusFilter changed', filterKey);
                }
                setStatusFilter(filterKey);
              }}
            >
              <Text style={[S.calendarViewChipText, active && S.calendarViewChipTextActive]}>{statusFilterLabels[filterKey]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {statusFilter === 'scheduled' ? (
        <>
      <View style={[S.row, { marginBottom: 14, justifyContent: 'center', alignItems: 'center', gap: spacing[2] }]}>
        <TouchableOpacity
          style={S.calendarNavArrow}
          onPress={() => setSelectedDate((prev) => moveDate(prev, view, -1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <HomePlusIcon name="chevron-back" size={18} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={S.calendarNavToday}
          onPress={() => setSelectedDate(new Date())}
        >
          <Text style={S.calendarNavTodayText}>Hoy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={S.calendarNavArrow}
          onPress={() => setSelectedDate((prev) => moveDate(prev, view, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
          : selectedDateKey === dateToYMD(addDays(new Date(), 1))
          ? `Mañana, ${formatDate(dateToYMD(selectedDate))}`
          : `${selectedDate.toLocaleDateString('es-AR', { weekday: 'long' })}, ${formatDate(dateToYMD(selectedDate))}`}
      </Text>

      {view === 'month' ? (
        <View style={[S.monthGrid, { marginBottom: 20 }]}>
          {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => (
            <Text key={day} style={S.monthWeekday}>{day.slice(0, 1)}</Text>
          ))}
          {monthDays.map((day, index) => {
            const dateKey = day ? dateToYMD(day) : '';
            const selected = dateKey === selectedDateKey;
            const isToday = dateKey === today;
            const dayItems = groupedItems.find(([dk]) => dk === dateKey)?.[1] ?? [];
            const hasEvent = dayItems.some((item) => item.type === 'event');
            const hasTask = dayItems.some((item) => item.type === 'task');

            return (
              <CalendarDayCell
                key={`${dateKey || 'blank'}-${index}`}
                day={day}
                dateKey={dateKey}
                selected={selected}
                isToday={isToday}
                hasEvent={hasEvent}
                hasTask={hasTask}
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
              const selected = dateKey === selectedDateKey;
              const isToday = dateKey === today;
              const dayItems = groupedItems.find(([dk]) => dk === dateKey)?.[1] ?? [];
              const hasEvent = dayItems.some((item) => item.type === 'event');
              const hasTask = dayItems.some((item) => item.type === 'task');

              return (
                <WeekDayCell
                  key={dateKey}
                  date={dayInfo.date}
                  dateKey={dateKey}
                  dayLabel={dayInfo.dayLabel}
                  dayNumber={dayInfo.dayNumber}
                  selected={selected}
                  isToday={isToday}
                  hasEvent={hasEvent}
                  hasTask={hasTask}
                  onPress={() => setSelectedDate(dayInfo.date)}
                />
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={[S.emptyBox, { minHeight: 160 }]}>
          <ActivityIndicator color="#CD7353" />
          <Text style={[S.emptyText, { marginTop: 12 }]}>Cargando calendario...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <ErrorState title="No pudimos cargar el calendario" description={error} retryLabel="Reintentar" onRetry={() => void loadCalendar()} />
      ) : null}

{!loading && !error && groupedItems.length === 0 ? (
        <View style={S.calendarEmptyState}>
          <Text style={S.calendarEmptyTitle}>
            {view === 'day' ? 'Día tranquilo' : view === 'week' ? 'Semana tranquila' : 'No hay nada programado este mes'}
          </Text>
          <Text style={S.calendarEmptyText}>
            {view === 'day'
              ? 'No hay tareas ni eventos para esta fecha.'
              : view === 'week'
              ? 'No hay tareas ni eventos para estos días.'
              : 'Los eventos y tareas con fecha van a aparecer en el calendario.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <TouchableOpacity style={[S.primaryBtn, { marginTop: 8 }]} onPress={() => onCreateEvent?.(selectedDateKey)}>
              <Text style={S.btnText}>Crear evento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.secondaryBtn, { marginTop: 8 }]} onPress={handleCreateTask}>
              <Text style={S.secondaryText}>Crear tarea</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!loading && !error && groupedItems.length > 0 && selectedDateItems.length === 0 ? (
        <View style={S.calendarEmptyState}>
          <Text style={S.calendarEmptyTitle}>
            {view === 'day' ? 'Día tranquilo' : view === 'week' ? 'Día tranquilo' : 'Día tranquilo'}
          </Text>
          <Text style={S.calendarEmptyText}>
            No hay tareas ni eventos para esta fecha.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <TouchableOpacity style={[S.primaryBtn, { marginTop: 8 }]} onPress={() => onCreateEvent?.(selectedDateKey)}>
              <Text style={S.btnText}>Crear evento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.secondaryBtn, { marginTop: 8 }]} onPress={handleCreateTask}>
              <Text style={S.secondaryText}>Crear tarea</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!loading && !error && selectedDateItems.length > 0 ? (
        <View>
          <Text style={[S.label, { marginTop: 8, textTransform: 'none', fontSize: 13 }]}>
            {view === 'month'
              ? `Agenda del ${selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}`
              : view === 'day'
              ? 'Agenda del día'
              : `Agenda del ${selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })}`}
          </Text>
          {selectedDateItems.map((item) => {
            const uniqueKey = item.type === 'event' ? item.occurrence_id ?? item.id : item.id;
            const isSaving = savingId === item.id;

            return (
<AgendaItemCard
                 key={uniqueKey}
                 item={item}
                 isSaving={isSaving}
                 onShowToast={onShowToast}
                 onEditEvent={(evt) => {
                   const context =
                     evt.is_recurring_occurrence && !evt.is_override
                       ? {
                           baseEventId: evt.id,
                           occurrenceId: evt.occurrence_id,
                           occurrenceStartsAt: evt.starts_at,
                           occurrenceEndsAt: evt.ends_at ?? undefined,
                           isGeneratedRecurringOccurrence: true,
                         }
                       : undefined;
                   onEditEvent?.(evt.id, context);
                 }}
onCancelEvent={(eventId, version) => {
                    if (!accessToken) return;
                    Alert.alert('¿Cancelar este evento?', 'El evento dejará de aparecer en el calendario principal. Podrás verlo y reactivarlo desde Cancelados.', [
                      { text: 'Conservar', style: 'cancel' },
                      {
                        text: 'Cancelar evento',
                        style: 'destructive',
                        onPress: async () => {
                          setSavingId(eventId);
                          try {
                            await cancelPlannerEvent(accessToken, eventId, version, { idempotencyKey: eventCancelKeyRef.current });
                            markPlannerChanged();
                            await loadCalendar(true);
                            onChanged?.();
                            onShowToast?.('Evento cancelado.');
                            eventCancelKeyRef.current = createIdempotencyKey('planner.events.cancel');
                          } catch (err) {
                            if (err instanceof ApiError && err.code === 'version_conflict') {
                              Alert.alert('Planner', 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.');
                              await loadCalendar(true);
                            } else {
                              Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos cancelar el evento.');
                            }
                          } finally {
                            setSavingId(null);
                          }
                        },
                      },
                    ]);
                  }}
                  onReactivateEvent={() => {}}
                  onEditTask={(taskId) => onEditTask?.(taskId)}
onCompleteTask={async (taskId) => {
                    if (!accessToken) {
                      Alert.alert('Planner', 'No hay sesión activa para completar la tarea.');
                      return;
                    }
                    // We need the task version - fetch from items
                    const taskItem = selectedDateItems.find(item => item.type === 'task' && item.id === taskId);
                    if (!taskItem) {
                      Alert.alert('Planner', 'No se encontró la tarea.');
                      return;
                    }
                    setSavingId(taskId);
                    try {
                      const response = await completePlannerTask(accessToken, taskId, taskItem.version, { idempotencyKey: taskCompleteKeyRef.current });
                      const task = response.task;
                      markPlannerChanged();
                      await loadCalendar(true);
                      onChanged?.();
                      onShowToast?.(task.requires_verification ? 'Tarea enviada a revisión' : 'Tarea completada');
                      taskCompleteKeyRef.current = createIdempotencyKey('planner.tasks.complete');
                    } catch (err) {
                      Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos completar la tarea.');
                    } finally {
                      setSavingId(null);
                    }
                }}
                  onReactivateTask={(taskId, version) => {
                    if (!accessToken) return;
                    Alert.alert(
                      '¿Reactivar esta tarea?',
                      'La tarea volverá a aparecer en tus tareas activas.',
                      [
                        { text: 'Conservar', style: 'cancel' },
                        {
                          text: 'Reactivar',
                          onPress: async () => {
                            setSavingId(taskId);
                            try {
                              const response = await reactivatePlannerTask(accessToken, taskId, version, { idempotencyKey: taskReactivateKeyRef.current });
                              markPlannerChanged();
                              onChanged?.();
                              onShowToast?.('Tarea reactivada.');
                              taskReactivateKeyRef.current = createIdempotencyKey('planner.tasks.reactivate');
                              await loadCalendar(true);
                            } catch (err) {
                              if (err instanceof ApiError && err.code === 'version_conflict') {
                                Alert.alert('Conflicto', 'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.');
                                await loadCalendar(true);
                              } else if (err instanceof ApiError && err.code === 'task_in_trash') {
                                Alert.alert('Planner', 'La tarea está en la papelera. Restáurala desde allí.');
                              } else {
                                Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos reactivar la tarea.');
                              }
                            } finally {
                              setSavingId(null);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  onCancelTask={(taskId, version) => {
                    if (!accessToken) return;
                    Alert.alert(
                      '¿Cancelar esta tarea?',
                      'La tarea dejará de aparecer en tus tareas activas. Podrás verla y reactivarla desde Canceladas.',
                      [
                        { text: 'Conservar', style: 'cancel' },
                        {
                          text: 'Cancelar tarea',
                          style: 'destructive',
                          onPress: async () => {
                            setSavingId(taskId);
                            try {
                              await cancelPlannerTask(accessToken, taskId, version, { idempotencyKey: taskCancelKeyRef.current });
                              markPlannerChanged();
                              await loadCalendar(true);
                              onChanged?.();
                              onShowToast?.('Tarea cancelada.');
                              taskCancelKeyRef.current = createIdempotencyKey('planner.tasks.cancel');
                            } catch (err) {
                              if (err instanceof ApiError && err.code === 'version_conflict') {
                                Alert.alert('Conflicto', 'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.');
                                await loadCalendar(true);
                              } else {
                                Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos cancelar la tarea.');
                              }
                            } finally {
                              setSavingId(null);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  onTrashEvent={(eventId, version) => {
                    if (!accessToken) return;
                    Alert.alert(
                      'Mover a la papelera',
                      'Mover este evento a la papelera? Lo vas a poder restaurar más adelante.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Mover a la papelera',
                          style: 'destructive',
                          onPress: async () => {
                            setSavingId(eventId);
                            try {
                              await trashPlannerEvent(accessToken, eventId, version, { idempotencyKey: eventTrashKeyRef.current });
                              markPlannerChanged();
                              await loadCalendar(true);
                              onChanged?.();
                              onShowToast?.('Evento movido a la papelera.');
                              eventTrashKeyRef.current = createIdempotencyKey('planner.events.trash');
                            } catch (err) {
                              if (err instanceof ApiError && err.code === 'version_conflict') {
                                Alert.alert('Planner', 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.');
                                await loadCalendar(true);
                              } else {
                                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.');
                              }
                            } finally {
                              setSavingId(null);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  onTrashTask={(taskItem) => {
                    if (!accessToken) return;
                    Alert.alert(
                      'Mover a la papelera',
                      `Mover "${taskItem.title}" a la papelera? La vas a poder restaurar más adelante.`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Mover a la papelera',
                          style: 'destructive',
                          onPress: async () => {
                            setSavingId(taskItem.id);
                            try {
                              await trashPlannerTask(accessToken, taskItem.id, taskItem.version, { idempotencyKey: taskTrashKeyRef.current });
                              markPlannerChanged();
                              await loadCalendar(true);
                              onChanged?.();
                              onShowToast?.('Tarea movida a la papelera.');
                              taskTrashKeyRef.current = createIdempotencyKey('planner.tasks.trash');
                            } catch (err) {
                              if (err instanceof ApiError && err.code === 'version_conflict') {
                                Alert.alert('Conflicto', 'Esta tarea cambió en otro dispositivo. Actualizá y volvé a intentar.');
                                await loadCalendar(true);
                              } else {
                                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.');
                              }
                            } finally {
                              setSavingId(null);
                            }
                          },
                        },
                      ],
                    );
                  }}
               />
            );
          })}
        </View>
      ) : null}
      </>  // close scheduled fragment
    ) : (
      // Cancelled events view
      <View>
        {!loading && !error && cancelledEvents.length === 0 ? (
          <View style={S.calendarEmptyState}>
            <Text style={S.calendarEmptyTitle}>No hay eventos cancelados</Text>
            <Text style={S.calendarEmptyText}>
              Los eventos que canceles van a aparecer acá.
            </Text>
          </View>
        ) : null}
        {!loading && !error && cancelledEvents.length > 0 ? (
          <View>
            <Text style={[S.label, { marginTop: 8, textTransform: 'none', fontSize: 13 }]}>
              Eventos cancelados
            </Text>
            {cancelledEvents.map((evt) => {
               const uniqueKey = evt.id;
               const isSaving = savingId === evt.id;
 
               return (
                 <AgendaItemCard
                   key={uniqueKey}
                   item={{ ...evt, type: 'event' as const }}
                  isSaving={isSaving}
                  onShowToast={onShowToast}
                  onEditEvent={() => {}}
                  onCancelEvent={() => {}}
                  onReactivateEvent={(eventId, version) => {
                    if (!accessToken) return;
                    Alert.alert(
                      '¿Reactivar este evento?',
                      'El evento volverá a aparecer en el calendario.',
                      [
                        { text: 'Conservar', style: 'cancel' },
                        {
                          text: 'Reactivar',
                          onPress: async () => {
                            setSavingId(eventId);
                            try {
                              const response = await reactivatePlannerEvent(accessToken, eventId, version, { idempotencyKey: eventReactivateKeyRef.current });
                              const reactivated = response.event;
                              setCancelledEvents((prev) => prev.filter((e) => e.id !== eventId));
                              markPlannerChanged();
                              onChanged?.();
                              onShowToast?.('Evento reactivado.');
                              eventReactivateKeyRef.current = createIdempotencyKey('planner.events.reactivate');
                            } catch (err) {
                              if (err instanceof ApiError && err.code === 'version_conflict') {
                                Alert.alert('Conflicto', 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.');
                                await loadCancelledEvents(true);
                              } else if (err instanceof ApiError && err.code === 'event_in_trash') {
                                Alert.alert('Planner', 'El evento está en la papelera. Restáuralo desde allí.');
                              } else {
                                Alert.alert('Planner', err instanceof ApiError ? err.message : 'No pudimos reactivar el evento.');
                              }
                            } finally {
                              setSavingId(null);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  onTrashEvent={(eventId, version) => {
                    if (!accessToken) return;
                    Alert.alert(
                      'Mover a la papelera',
                      'Mover este evento a la papelera? Lo vas a poder restaurar más adelante.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Mover a la papelera',
                          style: 'destructive',
                          onPress: async () => {
                            setSavingId(eventId);
                            try {
                              await trashPlannerEvent(accessToken, eventId, version, { idempotencyKey: eventTrashKeyRef.current });
                              markPlannerChanged();
                              await loadCancelledEvents(true);
                              onChanged?.();
                              onShowToast?.('Evento movido a la papelera.');
                              eventTrashKeyRef.current = createIdempotencyKey('planner.events.trash');
                            } catch (err) {
                              if (err instanceof ApiError && err.code === 'version_conflict') {
                                Alert.alert('Planner', 'Este evento cambió en otro dispositivo. Actualizá y volvé a intentar.');
                                await loadCancelledEvents(true);
                              } else {
                                Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo mover a la papelera.');
                              }
                            } finally {
                              setSavingId(null);
                            }
                          },
                        },
                      ],
                    );
                  }}
                  onEditTask={() => {}}
                  onCompleteTask={() => {}}
                  onReactivateTask={() => {}}
                  onCancelTask={() => {}}
                  onTrashTask={() => {}}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    )}
    </View>
  );
}
