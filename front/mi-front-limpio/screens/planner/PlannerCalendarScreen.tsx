import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
  EmptyState,
  ErrorState,
  FormActionRow,
  Skeleton,
  Toggle,
  TimePickerSheet,
  DatePickerSheet,
} from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { useAuth } from '../../context/AuthContext';
import { getPlannerCalendar, type PlannerCalendarItem } from '../../services/plannerCalendar';
import { plannerFrontendCoreCalendar } from '../../services/planner/plannerFrontendCoreIntegration';
import type { PlannerCalendarProjection } from '../../services/planner/plannerCalendarProjection';
import { createPlannerEventV1 } from '../../services/plannerEventsV1';
import { createIdempotencyKey } from '../../services/idempotency';
import { dateToYMD, getWeekDays } from './plannerShared';
import { PlannerWeekNavigator } from './PlannerWeekNavigator';

type Props = {
  readonly refreshKey?: number;
  readonly onOpenProjection?: (projection: PlannerCalendarProjection) => void;
  readonly onOpenSeries?: () => void;
};

// The agenda contains canonical Events only (frozen Â§35).
type AgendaRow =
  | { kind: 'event'; id: string; title: string; timeLabel: string; meta: string; allDay: boolean; sort: number; projection: PlannerCalendarProjection };

const timeToMinutes = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  return hours >= 0 && hours < 24 && mins >= 0 && mins < 60 ? hours * 60 + mins : null;
};

export function PlannerCalendarScreen({ refreshKey, onOpenProjection, onOpenSeries }: Props) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
const { session, authMe, loading: authLoading } = useAuth();
  const { markPlannerChanged } = useAppRefresh();
  const accessToken = session?.access_token;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarItems, setCalendarItems] = useState<PlannerCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  // The create sheet targets an explicit date (seeded to the selected day when
  // the sheet opens), so the "Fecha" row is a live control, not a dead one.
  const [eventDate, setEventDate] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const eventScope = 'household' as const;
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventStart, setEventStart] = useState('09:00');
  const [eventEnd, setEventEnd] = useState('10:00');
  const [timePicker, setTimePicker] = useState<'eventStart' | 'eventEnd' | null>(null);

  const selectedDateKey = dateToYMD(selectedDate);
  const visibleWeek = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const visibleWeekStartKey = useMemo(() => dateToYMD(visibleWeek[0].date), [visibleWeek]);

  const load = useCallback(async (silent = false) => {
    if (!accessToken || authLoading) return;
    if (!silent) setLoading(true);
    setCalendarError(null);
    try {
      const response = await getPlannerCalendar(accessToken, { view: 'week', date: visibleWeekStartKey });
      setCalendarItems(response.items);
    } catch (cause) {
      setCalendarError(cause instanceof Error ? cause.message : 'No pudimos cargar los eventos.');
    } finally {
      if (!silent) setLoading(false);
    }
    // Frozen Â§35: `schedule_blocks` are NOT Calendar authority and are NOT read
    // here at all. Recurring activity lives in Horarios (Event Series) and
    // reaches the agenda only through explicit materialization into Events.
  }, [accessToken, authLoading, visibleWeekStartKey]);

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

    // Tasks are NOT Calendar target content (frozen Â§35): they are read from
    // the Tasks surface and are never projected into the agenda. Likewise
    // `schedule_blocks` are not Calendar authority, so the agenda contains
    // canonical Events only.
    return eventRows.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      if (a.sort !== b.sort) return a.sort - b.sort;
      return `${a.kind}:${a.title}`.localeCompare(`${b.kind}:${b.title}`);
    });
  }, [projections, selectedDateKey]);

  const allDayRows = rows.filter((row) => row.allDay);
  const timedRows = rows.filter((row) => !row.allDay);

  const openCreate = () => {
    setEventError(null);
    setEventDate(selectedDateKey);
    setEventTitle('');
    setEventDescription('');
    setEventAllDay(false);
    setEventStart('09:00');
    setEventEnd('10:00');
    setCreateSheetVisible(true);
  };

  const saveEvent = async () => {
    if (!accessToken) return;
    const start = timeToMinutes(eventStart);
    const end = timeToMinutes(eventEnd);
    if (!eventTitle.trim()) {
      setEventError('AgregÃ¡ un tÃ­tulo para el evento.');
      return;
    }
    if (!eventAllDay && (start === null || end === null || end <= start)) {
      setEventError('RevisÃ¡ el horario del evento.');
      return;
    }
    setSavingEvent(true);
    setEventError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
      const scheduling = eventAllDay
        ? { type: 'all_day' as const, startDate: eventDate, endDate: eventDate }
        : {
            type: 'timed' as const,
            startsAt: new Date(`${eventDate}T${eventStart}:00`).toISOString(),
            endsAt: new Date(`${eventDate}T${eventEnd}:00`).toISOString(),
            durationMinutes: end! - start!,
            timeZone,
          };
      await createPlannerEventV1(accessToken, {
        scope: eventScope,
        householdId: authMe?.active_household?.id,
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

  // The agenda contains canonical Events only (frozen Â§35), so opening a row
  // always resolves the canonical Event detail.
  const openRow = (row: AgendaRow) => {
    if (row.kind === 'event') onOpenProjection?.(row.projection);
  };

  const periodLabel = `${visibleWeek[0].date.getDate()}-${visibleWeek[6].date.getDate()} ${visibleWeek[6].date.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase()}`;

  return (
    <View style={styles.screen}>
      <View style={styles.utilityRow}>
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

      {/* Frozen Â§19/Â§36: recurring activity lives in Horarios (Event Series);
          Calendar only renders concrete Events. */}
      {onOpenSeries ? (
        <AppButton variant="ghost" size="sm" onPress={onOpenSeries} accessibilityRole="button" accessibilityLabel="Abrir Horarios">
          <HomePlusIcon name="repeat" size={18} color={colors.text.secondary} />
          <AppText variant="caption" tone="secondary" weight="800">Horarios</AppText>
        </AppButton>
      ) : null}

      <PlannerWeekNavigator
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        showWeekHeader={false}
        getDayIndicator={(date) => {
          const key = dateToYMD(date);
          // Frozen Â§35: the day badge counts Events only. Tasks and
          // `schedule_blocks` are not Calendar content, so counting them here
          // would advertise rows the agenda never renders.
          return projections.filter((event) => event.semanticDate === key).length;
        }}
      />

      {calendarError ? (
        <ErrorState title="No pudimos cargar" description={calendarError} retryLabel="Reintentar" onRetry={() => void load()} />
      ) : null}

      {loading ? (
        <View style={styles.loadingRows}><Skeleton variant="listItem" /><Skeleton variant="listItem" /><Skeleton variant="listItem" /></View>
      ) : rows.length === 0 ? (
        <EmptyState title="DÃ­a libre" description="No hay eventos para este dÃ­a." actionLabel="Agregar" onAction={openCreate} />
      ) : (
        <View>
          {allDayRows.length ? <AgendaSection title="TODO EL DÃA" rows={allDayRows} onOpen={openRow} /> : null}
          {timedRows.length ? <AgendaSection rows={timedRows} onOpen={openRow} /> : null}
        </View>
      )}

<ActionSheet
        visible={createSheetVisible}
        title="Agregar al calendario"
        onRequestClose={() => !savingEvent && setCreateSheetVisible(false)}
        closeDisabled={savingEvent}
        footer={<View style={styles.footer}><AppButton title="Cancelar" variant="ghost" onPress={() => setCreateSheetVisible(false)} disabled={savingEvent} style={{ flex: 1 }} /><AppButton title="Crear evento" onPress={() => void saveEvent()} loading={savingEvent} style={{ flex: 1 }} /></View>}
      >
        <View style={styles.sheet}>
          <View style={styles.eventForm}>
            {eventError ? <AppText variant="bodySmall" tone="danger">{eventError}</AppText> : null}
            <AppInput label="TÃ­tulo" value={eventTitle} onChangeText={setEventTitle} placeholder="Cena familiar" />
            <FormActionRow
              label="Fecha"
              value={eventDate}
              onPress={() => setDatePickerVisible(true)}
            />
            {/* Household Calendar: the scope is fixed by Product Truth, so it
                is presented as read-only context rather than a dead control. */}
            <View style={styles.scopeRow}>
              <AppText variant="bodySmall" tone="secondary" weight="700">Alcance</AppText>
              <AppText variant="bodySmall" weight="800">Hogar</AppText>
            </View>
            <View style={styles.privacyRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" weight="700">Todo el dÃ­a</AppText>
                <AppText variant="caption" tone="secondary">{selectedDateKey}</AppText>
              </View>
              <Toggle value={eventAllDay} onValueChange={setEventAllDay} accessibilityLabel="Todo el dÃ­a" />
            </View>
            {!eventAllDay ? (
              <View style={styles.inlineFields}>
                <View style={styles.inlineField}><FormActionRow label="Inicio" value={eventStart} onPress={() => setTimePicker('eventStart')} /></View>
                <View style={styles.inlineField}><FormActionRow label="Fin" value={eventEnd} onPress={() => setTimePicker('eventEnd')} /></View>
              </View>
            ) : null}
            <AppInput label="Notas" value={eventDescription} onChangeText={setEventDescription} placeholder="Lugar, detalle o recordatorio" multiline />
          </View>
        </View>
        <TimePickerSheet visible={timePicker === 'eventStart'} value={eventStart} onClose={() => setTimePicker(null)} onConfirm={(start) => { setEventStart(start); setTimePicker(null); }} />
        <TimePickerSheet visible={timePicker === 'eventEnd'} value={eventEnd} onClose={() => setTimePicker(null)} onConfirm={(end) => { setEventEnd(end); setTimePicker(null); }} />
        <DatePickerSheet
          visible={datePickerVisible}
          value={eventDate}
          onClose={() => setDatePickerVisible(false)}
          onConfirm={(nextDate) => { setEventDate(nextDate); setDatePickerVisible(false); }}
        />
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
  // Calendar shows canonical Events only (frozen Â§35).
  const icon = 'calendar-outline';
  const accent = colors.terracotta[500];
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
  scopeRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface.soft,
  },
  footer: { flexDirection: 'row', gap: spacing[2] },
  eventForm: { gap: spacing[3] },
  inlineFields: { flexDirection: 'row', gap: spacing[2] },
  inlineField: { flex: 1, minWidth: 0 },
  scheduleForm: { gap: spacing[3] },
}); }
