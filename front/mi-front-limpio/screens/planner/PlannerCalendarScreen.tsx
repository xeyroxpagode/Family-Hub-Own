import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppButton, AppText, EmptyState, ErrorState } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getPlannerCalendar } from '../../services/plannerCalendar';
import { plannerFrontendCoreCalendar } from '../../services/planner/plannerFrontendCoreIntegration';
import type { PlannerCalendarProjection } from '../../services/planner/plannerCalendarProjection';
import { dateToYMD, getWeekDays } from './plannerShared';
import { PlannerWeekNavigator } from './PlannerWeekNavigator';

type Props = {
  readonly refreshKey?: number;
  readonly onCreateEvent?: (initialDate: string) => void;
  readonly onOpenProjection?: (projection: PlannerCalendarProjection) => void;
};

export function PlannerCalendarScreen({ refreshKey, onCreateEvent, onOpenProjection }: Props) {
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<readonly PlannerCalendarProjection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedDateKey = dateToYMD(selectedDate);
  const visibleWeekStartKey = useMemo(() => dateToYMD(getWeekDays(selectedDate)[0].date), [selectedDate]);

  const load = useCallback(async (silent = false) => {
    if (!accessToken || authLoading) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await getPlannerCalendar(accessToken, { view: 'week', date: visibleWeekStartKey });
      setEvents(plannerFrontendCoreCalendar.combineItems(response.items.filter((item) => item.type === 'event')));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar los eventos.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, authLoading, visibleWeekStartKey]);

  useEffect(() => { if (!authLoading && !accessToken) setLoading(false); else void load(); }, [accessToken, authLoading, load]);
  useEffect(() => { if (refreshKey != null) void load(true); }, [refreshKey, load]);

  const selectedEvents = useMemo(() => events.filter((event) => event.semanticDate === selectedDateKey), [events, selectedDateKey]);
  const today = dateToYMD(new Date());

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View><AppText variant="title2">Eventos</AppText><AppText variant="caption" tone="secondary">Tu agenda del hogar</AppText></View>
        <AppButton variant="icon" onPress={() => onCreateEvent?.(selectedDateKey)} accessibilityLabel="Crear evento"><HomePlusIcon name="add" size={22} color={colors.terracotta[600]} /></AppButton>
      </View>

      <PlannerWeekNavigator selectedDate={selectedDate} onSelectDate={setSelectedDate} getDayIndicator={(date) => events.filter((event) => event.semanticDate === dateToYMD(date)).length} />

      <View style={styles.agendaHeader}><View><AppText variant="body" weight="800">{selectedDateKey === today ? 'Hoy' : selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</AppText><AppText variant="caption" tone="secondary">{selectedEvents.length === 1 ? '1 evento' : `${selectedEvents.length} eventos`}</AppText></View></View>

      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.terracotta[500]} /></View> : error ? <ErrorState description={error} onRetry={() => void load()} /> : selectedEvents.length === 0 ? <EmptyState title="Sin eventos para este dia" description="Crea un evento para que el hogar tenga este momento a la vista." actionLabel="Crear evento" onAction={() => onCreateEvent?.(selectedDateKey)} /> : <View style={styles.agenda}>{selectedEvents.map((event) => <TouchableOpacity key={`${event.entityId}:${event.projectionId ?? event.semanticDate}`} onPress={() => onOpenProjection?.(event)} style={styles.eventCard} accessibilityRole="button" accessibilityLabel={`Abrir evento ${event.title}`}><View style={styles.eventTime}><AppText variant="bodySmall" weight="800">{event.allDay ? 'Todo el dia' : event.start?.slice(11, 16) ?? ''}</AppText>{!event.allDay && event.end ? <AppText variant="caption" tone="tertiary">{event.end.slice(11, 16)}</AppText> : null}</View><View style={styles.eventAccent} /><View style={{ flex: 1, gap: spacing[1] }}><AppText variant="body" weight="800">{event.title}</AppText><AppText variant="caption" tone="secondary">Evento del hogar</AppText></View><HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} /></TouchableOpacity>)}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing[4], paddingBottom: spacing[5] }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, agendaHeader: { paddingTop: spacing[1] }, loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center' }, agenda: { gap: spacing[2] }, eventCard: { minHeight: 82, padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.subtle, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }, eventTime: { width: 58, gap: spacing[1] }, eventAccent: { width: 4, alignSelf: 'stretch', borderRadius: radius.pill, backgroundColor: colors.terracotta[500] },
});
