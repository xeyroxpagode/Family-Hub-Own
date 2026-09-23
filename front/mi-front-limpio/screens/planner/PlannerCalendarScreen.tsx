import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
  EmptyState,
  ErrorState,
  FilterChip,
  FormActionRow,
  SegmentedControl,
  Skeleton,
  Toggle,
  TimePickerSheet,
} from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { getPlannerCalendar, type PlannerCalendarItem } from '../../services/plannerCalendar';
import { plannerFrontendCoreCalendar } from '../../services/planner/plannerFrontendCoreIntegration';
import type { PlannerCalendarProjection } from '../../services/planner/plannerCalendarProjection';
import { createPlannerEventV1, type EventV1Scope } from '../../services/plannerEventsV1';
import { createIdempotencyKey } from '../../services/idempotency';
import {
  createHouseholdSchedule,
  getSchedulePrivacy,
  listHouseholdSchedules,
  updateHouseholdSchedule,
  updateSchedulePrivacy,
  type HouseholdScheduleBlock,
  type ScheduleColorKey,
} from '../../services/plannerSchedules';
import { dateToYMD, getWeekDays } from './plannerShared';
import { PlannerWeekNavigator } from './PlannerWeekNavigator';

type Props = {
  readonly refreshKey?: number;
  readonly onCreateEvent?: (initialDate: string) => void;
  readonly onOpenProjection?: (projection: PlannerCalendarProjection) => void;
};

type AgendaRow =
  | { kind: 'event'; id: string; title: string; timeLabel: string; meta: string; allDay: boolean; sort: number; projection: PlannerCalendarProjection }
  | { kind: 'task'; id: string; title: string; timeLabel: string; meta: string; allDay: boolean; sort: number; taskId: string }
  | { kind: 'schedule'; id: string; title: string; timeLabel: string; meta: string; allDay: false; sort: number; schedule: HouseholdScheduleBlock; ownerName: string };

type CreateMode = 'event' | 'schedule';
type ScheduleForm = { title: string; start: string; end: string; days: number[]; note: string; color: ScheduleColorKey };

const DAYS = [
  { key: 1, short: 'L', label: 'Lunes' },
  { key: 2, short: 'M', label: 'Martes' },
  { key: 3, short: 'X', label: 'Miércoles' },
  { key: 4, short: 'J', label: 'Jueves' },
  { key: 5, short: 'V', label: 'Viernes' },
  { key: 6, short: 'S', label: 'Sábado' },
  { key: 0, short: 'D', label: 'Domingo' },
] as const;

const minutesToTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const timeToMinutes = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  return hours >= 0 && hours < 24 && mins >= 0 && mins < 60 ? hours * 60 + mins : null;
};

function emptyScheduleForm(day: number): ScheduleForm {
  return { title: '', start: '08:00', end: '09:00', days: [day], note: '', color: 'terracotta' };
}

export function PlannerCalendarScreen({ refreshKey, onOpenProjection }: Props) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { session, authMe, loading: authLoading } = useAuth();
  const { members } = useHousehold();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const ownPersonId = authMe?.person?.id ?? null;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarItems, setCalendarItems] = useState<PlannerCalendarItem[]>([]);
  const [schedules, setSchedules] = useState<Array<HouseholdScheduleBlock & { ownerName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [contextSheetVisible, setContextSheetVisible] = useState(false);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('event');
  const [schedulePersonFilter, setSchedulePersonFilter] = useState<string>('all');
  const [privacy, setPrivacy] = useState(true);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(() => emptyScheduleForm(new Date().getDay()));
  const [editingSchedule, setEditingSchedule] = useState<HouseholdScheduleBlock | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventScope, setEventScope] = useState<EventV1Scope>('household');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventStart, setEventStart] = useState('09:00');
  const [eventEnd, setEventEnd] = useState('10:00');
  const [timePicker, setTimePicker] = useState<'start' | 'end' | 'eventStart' | 'eventEnd' | null>(null);

  const selectedDateKey = dateToYMD(selectedDate);
  const selectedDay = selectedDate.getDay();
  const visibleWeek = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const visibleWeekStartKey = useMemo(() => dateToYMD(visibleWeek[0].date), [visibleWeek]);
  const visibleWeekEndKey = useMemo(() => dateToYMD(visibleWeek[6].date), [visibleWeek]);

  const load = useCallback(async (silent = false) => {
    if (!accessToken || authLoading) return;
    if (!silent) setLoading(true);
    setCalendarError(null);
    setScheduleError(null);
    try {
      const response = await getPlannerCalendar(accessToken, { view: 'week', date: visibleWeekStartKey });
      setCalendarItems(response.items);
    } catch (cause) {
      setCalendarError(cause instanceof Error ? cause.message : 'No pudimos cargar eventos y tareas.');
    }

    try {
      const scheduleResults = await Promise.allSettled(
        members.map(async (member) => {
          const response = await listHouseholdSchedules(accessToken, member.user_id);
          return response.can_view
            ? response.schedules.map((schedule) => ({ ...schedule, ownerName: member.user?.nombre || 'Miembro' }))
            : [];
        }),
      );
      setSchedules(scheduleResults.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
      if (scheduleResults.some((result) => result.status === 'rejected')) setScheduleError('No pudimos cargar algunos horarios.');
      if (ownPersonId) {
        const ownPrivacy = await getSchedulePrivacy(accessToken);
        setPrivacy(ownPrivacy.is_visible_to_household);
      }
    } catch (cause) {
      setScheduleError(cause instanceof Error ? cause.message : 'No pudimos cargar horarios.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, authLoading, members, ownPersonId, visibleWeekStartKey]);

  useEffect(() => {
    if (!authLoading && !accessToken) {
      setLoading(false);
      return;
    }
    void load();
  }, [accessToken, authLoading, load]);

  useEffect(() => {
    if (refreshKey != null) void load(true);
  }, [refreshKey, load]);

  const projections = useMemo(
    () => plannerFrontendCoreCalendar.combineItems(calendarItems.filter((item) => item.type === 'event')),
    [calendarItems],
  );

  const rows = useMemo<AgendaRow[]>(() => {
    const eventRows: AgendaRow[] = projections
      .filter((event) => event.semanticDate === selectedDateKey)
      .map((event) => {
        const time = event.allDay ? '' : event.start?.slice(11, 16) ?? '';
        return {
          kind: 'event',
          id: `event:${event.projectionId ?? event.entityId}:${event.semanticDate}`,
          title: event.title,
          timeLabel: event.allDay ? '' : time,
          meta: 'Evento',
          allDay: event.allDay,
          sort: event.allDay ? -1 : Number(time.replace(':', '') || 0),
          projection: event,
        };
      });

    const taskRows: AgendaRow[] = calendarItems
      .filter((item): item is Extract<PlannerCalendarItem, { type: 'task' }> => item.type === 'task' && item.due_date === selectedDateKey)
      .map((task) => ({
        kind: 'task',
        id: `task:${task.id}`,
        title: task.title,
        timeLabel: task.due_time ?? '',
        meta: 'Tarea',
        allDay: !task.due_time,
        sort: task.due_time ? Number(task.due_time.replace(':', '')) : -1,
        taskId: task.id,
      }));

    const scheduleRows: AgendaRow[] = schedules
      .filter((schedule) => schedule.days_of_week.includes(selectedDay))
      .filter((schedule) => schedulePersonFilter === 'all' || schedule.person_id === schedulePersonFilter)
      .map((schedule) => ({
        kind: 'schedule',
        id: `schedule:${schedule.id}`,
        title: schedule.title,
        timeLabel: minutesToTime(schedule.start_minutes),
        meta: `Hasta ${minutesToTime(schedule.end_minutes)} · ${schedule.ownerName}`,
        allDay: false,
        sort: schedule.start_minutes,
        schedule,
        ownerName: schedule.ownerName,
      }));

    return [...eventRows, ...taskRows, ...scheduleRows].sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      if (a.sort !== b.sort) return a.sort - b.sort;
      return `${a.kind}:${a.title}`.localeCompare(`${b.kind}:${b.title}`);
    });
  }, [calendarItems, projections, schedulePersonFilter, schedules, selectedDateKey, selectedDay]);

  const allDayRows = rows.filter((row) => row.allDay);
  const timedRows = rows.filter((row) => !row.allDay);

  const openCreate = () => {
    setCreateMode('event');
    setEditingSchedule(null);
    setScheduleForm(emptyScheduleForm(selectedDay));
    setEventError(null);
    setEventTitle('');
    setEventDescription('');
    setEventScope(authMe?.active_household?.id ? 'household' : 'personal');
    setEventAllDay(false);
    setEventStart('09:00');
    setEventEnd('10:00');
    setCreateSheetVisible(true);
  };

  const openSchedule = (schedule: HouseholdScheduleBlock) => {
    if (schedule.person_id !== ownPersonId) return;
    setEditingSchedule(schedule);
    setScheduleForm({
      title: schedule.title,
      start: minutesToTime(schedule.start_minutes),
      end: minutesToTime(schedule.end_minutes),
      days: schedule.days_of_week,
      note: schedule.note ?? '',
      color: schedule.color_key,
    });
    setCreateMode('schedule');
    setCreateSheetVisible(true);
  };

  const saveSchedule = async () => {
    if (!accessToken) return;
    const start = timeToMinutes(scheduleForm.start);
    const end = timeToMinutes(scheduleForm.end);
    if (!scheduleForm.title.trim() || start === null || end === null || end <= start || scheduleForm.days.length === 0) {
      Alert.alert('Horario', 'Completá título, horario y al menos un día.');
      return;
    }
    setSavingSchedule(true);
    try {
      const payload = {
        title: scheduleForm.title.trim(),
        start_minutes: start,
        end_minutes: end,
        days_of_week: [...scheduleForm.days].sort(),
        color_key: scheduleForm.color,
        note: scheduleForm.note.trim() || null,
      };
      if (editingSchedule) await updateHouseholdSchedule(accessToken, editingSchedule.id, payload);
      else await createHouseholdSchedule(accessToken, payload);
      markPlannerChanged();
      setCreateSheetVisible(false);
      await load(true);
    } catch (cause) {
      Alert.alert('Horario', cause instanceof Error ? cause.message : 'No pudimos guardar el horario.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const saveEvent = async () => {
    if (!accessToken) return;
    const start = timeToMinutes(eventStart);
    const end = timeToMinutes(eventEnd);
    if (!eventTitle.trim()) {
      setEventError('Agregá un título para el evento.');
      return;
    }
    if (!eventAllDay && (start === null || end === null || end <= start)) {
      setEventError('Revisá el horario del evento.');
      return;
    }
    setSavingEvent(true);
    setEventError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
      const scheduling = eventAllDay
        ? { type: 'all_day' as const, startDate: selectedDateKey, endDate: selectedDateKey }
        : {
            type: 'timed' as const,
            startsAt: new Date(`${selectedDateKey}T${eventStart}:00`).toISOString(),
            endsAt: new Date(`${selectedDateKey}T${eventEnd}:00`).toISOString(),
            durationMinutes: end! - start!,
            timeZone,
          };
      await createPlannerEventV1(accessToken, {
        scope: eventScope,
        householdId: eventScope === 'household' ? authMe?.active_household?.id : undefined,
        lifecycle: 'scheduled',
        title: eventTitle.trim(),
        description: eventDescription.trim() || undefined,
        scheduling,
        attendanceRequired: false,
        location: null,
      }, { idempotencyKey: createIdempotencyKey('planner.events.v1.create') });
      markPlannerChanged();
      setCreateSheetVisible(false);
      await load(true);
    } catch (cause) {
      setEventError(cause instanceof Error ? cause.message : 'No pudimos crear el evento.');
    } finally {
      setSavingEvent(false);
    }
  };

  const togglePrivacy = async (value: boolean) => {
    if (!accessToken) return;
    setPrivacy(value);
    try {
      await updateSchedulePrivacy(accessToken, value);
      markPlannerChanged();
    } catch (cause) {
      setPrivacy(!value);
      Alert.alert('Calendario', cause instanceof Error ? cause.message : 'No pudimos actualizar la privacidad.');
    }
  };

  const openRow = (row: AgendaRow) => {
    if (row.kind === 'event') onOpenProjection?.(row.projection);
    if (row.kind === 'task') onOpenProjection?.({
      entityType: 'task',
      entityId: row.taskId,
      title: row.title,
      semanticDate: selectedDateKey,
      timed: Boolean(row.timeLabel),
      allDay: !row.timeLabel,
      lifecycle: 'active',
      destination: { route: 'TaskDetail', params: { entityId: row.taskId, source: 'planner', returnTo: 'planner' } },
    });
    if (row.kind === 'schedule') openSchedule(row.schedule);
  };

  const periodLabel = `${visibleWeek[0].date.getDate()}-${visibleWeek[6].date.getDate()} ${visibleWeek[6].date.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase()}`;

  return (
    <View style={styles.screen}>
      <View style={styles.utilityRow}>
        <AppButton variant="ghost" size="sm" style={styles.iconButton} onPress={() => setContextSheetVisible(true)} accessibilityRole="button" accessibilityLabel="Filtros de calendario">
          <HomePlusIcon name="options-outline" size={20} color={schedulePersonFilter !== 'all' ? colors.terracotta[600] : colors.text.secondary} />
        </AppButton>
        <View style={styles.periodControl}>
          <AppButton variant="ghost" size="sm" style={styles.periodButton} onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 7))} accessibilityLabel="Semana anterior">
            <HomePlusIcon name="chevron-back" size={18} color={colors.text.secondary} />
          </AppButton>
          <AppText variant="bodySmall" weight="800">{periodLabel}</AppText>
          <AppButton variant="ghost" size="sm" style={styles.periodButton} onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 7))} accessibilityLabel="Semana siguiente">
            <HomePlusIcon name="chevron-forward" size={18} color={colors.text.secondary} />
          </AppButton>
        </View>
        <AppButton variant="ghost" size="sm" style={styles.iconButton} onPress={openCreate} accessibilityRole="button" accessibilityLabel="Agregar al calendario">
          <HomePlusIcon name="add" size={22} color={colors.terracotta[600]} />
        </AppButton>
      </View>

      <PlannerWeekNavigator
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        showWeekHeader={false}
        getDayIndicator={(date) => {
          const key = dateToYMD(date);
          const day = date.getDay();
          const eventCount = projections.filter((event) => event.semanticDate === key).length;
          const taskCount = calendarItems.filter((item) => item.type === 'task' && item.due_date === key).length;
          const scheduleCount = schedules.filter((schedule) => schedule.days_of_week.includes(day) && (schedulePersonFilter === 'all' || schedule.person_id === schedulePersonFilter)).length;
          return eventCount + taskCount + scheduleCount;
        }}
      />

      {calendarError || scheduleError ? (
        <ErrorState title="Calendario parcial" description={[calendarError, scheduleError].filter(Boolean).join(' ')} retryLabel="Reintentar" onRetry={() => void load()} />
      ) : null}

      {loading ? (
        <View style={styles.loadingRows}><Skeleton variant="listItem" /><Skeleton variant="listItem" /><Skeleton variant="listItem" /></View>
      ) : rows.length === 0 ? (
        <EmptyState title="Día libre" description="No hay eventos, horarios ni tareas para este día." actionLabel="Agregar" onAction={openCreate} />
      ) : (
        <View>
          {allDayRows.length ? <AgendaSection title="TODO EL DÍA" rows={allDayRows} onOpen={openRow} /> : null}
          {timedRows.length ? <AgendaSection rows={timedRows} onOpen={openRow} /> : null}
        </View>
      )}

      <ActionSheet visible={contextSheetVisible} title="Calendario" onRequestClose={() => setContextSheetVisible(false)} size="content">
        <View style={styles.sheet}>
          <AppText variant="caption" tone="secondary" weight="800">Horarios de</AppText>
          <View style={styles.chips}>
            <FilterChip label="Todos" selected={schedulePersonFilter === 'all'} onPress={() => setSchedulePersonFilter('all')} />
            {members.map((member) => (
              <FilterChip key={member.user_id} label={member.user?.nombre || 'Miembro'} selected={schedulePersonFilter === member.user_id} onPress={() => setSchedulePersonFilter(member.user_id)} />
            ))}
          </View>
          <View style={styles.privacyRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySmall" weight="700">Compartir con el hogar</AppText>
              <AppText variant="caption" tone="secondary">Tus horarios propios permanecen editables desde acá.</AppText>
            </View>
            <Toggle value={privacy} onValueChange={togglePrivacy} accessibilityLabel="Compartir con el hogar" />
          </View>
        </View>
      </ActionSheet>

      <ActionSheet
        visible={createSheetVisible}
        title={editingSchedule ? 'Editar horario' : 'Agregar al calendario'}
        onRequestClose={() => !savingSchedule && setCreateSheetVisible(false)}
        closeDisabled={savingSchedule || savingEvent}
        footer={createMode === 'event'
          ? <View style={styles.footer}><AppButton title="Cancelar" variant="ghost" onPress={() => setCreateSheetVisible(false)} disabled={savingEvent} style={{ flex: 1 }} /><AppButton title="Crear evento" onPress={() => void saveEvent()} loading={savingEvent} style={{ flex: 1 }} /></View>
          : <View style={styles.footer}><AppButton title="Cancelar" variant="ghost" onPress={() => setCreateSheetVisible(false)} disabled={savingSchedule} style={{ flex: 1 }} /><AppButton title={editingSchedule ? 'Guardar' : 'Crear horario'} onPress={() => void saveSchedule()} loading={savingSchedule} style={{ flex: 1 }} /></View>}
      >
        <View style={styles.sheet}>
          {!editingSchedule ? (
            <SegmentedControl<CreateMode>
              value={createMode}
              options={[{ value: 'event', label: 'Evento' }, { value: 'schedule', label: 'Horario' }]}
              onChange={setCreateMode}
              density="form"
            />
          ) : null}
          {createMode === 'event' ? (
            <View style={styles.eventForm}>
              {eventError ? <AppText variant="bodySmall" tone="danger">{eventError}</AppText> : null}
              <AppInput label="Título" value={eventTitle} onChangeText={setEventTitle} placeholder="Cena familiar" />
              <FormActionRow label="Fecha" value={selectedDateKey} onPress={() => undefined} disabled />
              <FormActionRow label="Alcance" value={eventScope === 'household' ? 'Hogar' : 'Personal'} onPress={() => setEventScope(eventScope === 'household' ? 'personal' : 'household')} />
              <View style={styles.privacyRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="700">Todo el día</AppText>
                  <AppText variant="caption" tone="secondary">{selectedDateKey}</AppText>
                </View>
                <Toggle value={eventAllDay} onValueChange={setEventAllDay} accessibilityLabel="Todo el día" />
              </View>
              {!eventAllDay ? (
                <View style={styles.inlineFields}>
                  <View style={styles.inlineField}><FormActionRow label="Inicio" value={eventStart} onPress={() => setTimePicker('eventStart')} /></View>
                  <View style={styles.inlineField}><FormActionRow label="Fin" value={eventEnd} onPress={() => setTimePicker('eventEnd')} /></View>
                </View>
              ) : null}
              <AppInput label="Notas" value={eventDescription} onChangeText={setEventDescription} placeholder="Lugar, detalle o recordatorio" multiline />
            </View>
          ) : (
            <View style={styles.scheduleForm}>
              <AppInput label="Título" value={scheduleForm.title} onChangeText={(title) => setScheduleForm((previous) => ({ ...previous, title }))} placeholder="Universidad" />
              <FormActionRow label="Desde" value={scheduleForm.start} onPress={() => setTimePicker('start')} />
              <FormActionRow label="Hasta" value={scheduleForm.end} onPress={() => setTimePicker('end')} />
              <AppText variant="caption" tone="secondary" weight="800">Días</AppText>
              <View style={styles.days}>
                {DAYS.map((day) => {
                  const selected = scheduleForm.days.includes(day.key);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[styles.dayButton, selected && styles.dayButtonSelected]}
                      onPress={() => setScheduleForm((previous) => ({ ...previous, days: selected ? previous.days.filter((value) => value !== day.key) : [...previous.days, day.key] }))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={day.label}
                    >
                      <AppText variant="caption" weight="800" tone={selected ? 'inverse' : 'secondary'}>{day.short}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <AppInput label="Nota" value={scheduleForm.note} onChangeText={(note) => setScheduleForm((previous) => ({ ...previous, note }))} placeholder="Aula, lugar o detalle" multiline />
            </View>
          )}
        </View>
        <TimePickerSheet visible={timePicker === 'start'} value={scheduleForm.start} onClose={() => setTimePicker(null)} onConfirm={(start) => { setScheduleForm((previous) => ({ ...previous, start })); setTimePicker(null); }} />
        <TimePickerSheet visible={timePicker === 'end'} value={scheduleForm.end} onClose={() => setTimePicker(null)} onConfirm={(end) => { setScheduleForm((previous) => ({ ...previous, end })); setTimePicker(null); }} />
        <TimePickerSheet visible={timePicker === 'eventStart'} value={eventStart} onClose={() => setTimePicker(null)} onConfirm={(start) => { setEventStart(start); setTimePicker(null); }} />
        <TimePickerSheet visible={timePicker === 'eventEnd'} value={eventEnd} onClose={() => setTimePicker(null)} onConfirm={(end) => { setEventEnd(end); setTimePicker(null); }} />
      </ActionSheet>
    </View>
  );
}

function AgendaSection({ title, rows, onOpen }: { title?: string; rows: AgendaRow[]; onOpen: (row: AgendaRow) => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.agendaSection}>
      {title ? <AppText variant="caption" tone="secondary" weight="800">{title}</AppText> : null}
      {rows.map((row) => <AgendaItem key={row.id} row={row} onOpen={onOpen} />)}
    </View>
  );
}

function AgendaItem({ row, onOpen }: { row: AgendaRow; onOpen: (row: AgendaRow) => void }) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const icon = row.kind === 'event' ? 'calendar-outline' : row.kind === 'schedule' ? 'time-outline' : 'checkbox-outline';
  const scheduleColors: Record<ScheduleColorKey, string> = { terracotta: colors.terracotta[500], sage: colors.sage[500], blue: colors.info.base, gold: colors.warning.base };
  const accent = row.kind === 'event' ? colors.terracotta[500] : row.kind === 'schedule' ? scheduleColors[row.schedule.color_key] : colors.sage[500];
  return (
    <TouchableOpacity style={styles.agendaRow} onPress={() => onOpen(row)} accessibilityRole="button" accessibilityLabel={row.title}>
      <View style={styles.timeColumn}><AppText variant="caption" weight="800" tone={row.timeLabel ? 'primary' : 'tertiary'}>{row.timeLabel}</AppText></View>
      <View style={[styles.kindIcon, { borderColor: accent }]}><HomePlusIcon name={icon} size={17} color={accent} /></View>
      <View style={styles.agendaContent}>
        <AppText variant="body" weight="700" numberOfLines={2}>{row.title}</AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>{row.meta}</AppText>
      </View>
    </TouchableOpacity>
  );
}

function createStyles({ colors, radius, spacing }: ReturnType<typeof useAppTheme>) { return StyleSheet.create({
  screen: { gap: spacing[4], paddingBottom: spacing[5] },
  utilityRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  iconButton: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  periodControl: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingHorizontal: spacing[2] },
  periodButton: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  loadingRows: { gap: spacing[5], paddingVertical: spacing[4] },
  agendaSection: { gap: spacing[1], marginTop: spacing[1] },
  agendaRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  timeColumn: { width: 50, alignItems: 'flex-start' },
  kindIcon: { width: 34, height: 34, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.soft },
  agendaContent: { flex: 1, gap: spacing[1] },
  sheet: { gap: spacing[4] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  privacyRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  footer: { flexDirection: 'row', gap: spacing[2] },
  eventForm: { gap: spacing[3] },
  inlineFields: { flexDirection: 'row', gap: spacing[2] },
  inlineField: { flex: 1, minWidth: 0 },
  scheduleForm: { gap: spacing[3] },
  days: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' },
  dayButton: { width: 38, height: 38, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.soft, borderWidth: 1, borderColor: colors.border.default },
  dayButtonSelected: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
}); }
