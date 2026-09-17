import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { ActionPill, AppCard, AppScreen, AppText } from '../../components/ui';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { HomePlannerSections } from './HomePlannerSections';

type Task = any;
type CalendarEvent = any;

const WELLBEING_EMOJIS = ['😞', '😐', '🙂', '😊', '🤩'];

const MOCK_ACTIVITY = [
  { id: '1', avatar: '👩', name: 'Laura', text: 'completó la lista del mercado ✅' },
  { id: '2', avatar: '👧', name: 'Ana',   text: 'terminó su tarea de matemáticas 📚' },
  { id: '3', avatar: '🏠', name: 'Familia', text: 'Evento: Cena especial el viernes 🍽️' },
];

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getCurrentWeekRange() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday.toISOString(), to: sunday.toISOString(), monday };
}

export const HomeAdulto = () => {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();

  const [atHome, setAtHome] = useState(true);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [wellbeing, setWellbeing] = useState<number | null>(null);

  const hour = new Date().getHours();
  const showWellbeing = hour >= 18;
  const firstName = user?.user_metadata?.nombre?.split(' ')[0] ?? 'Hola';
  const now = `${String(hour).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

  const fetchData = useCallback(async () => {
    if (!currentHousehold || !user) return;
    setDataLoading(true);
    setTodayEvents([]);
    setTasks([]);
    setWeekEvents([]);
    setDataLoading(false);
  }, [currentHousehold, user]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const calendarDays = useMemo(() => {
    const { monday } = getCurrentWeekRange();
    const today = new Date();
    return DAY_LETTERS.map((letter, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dots = weekEvents
        .filter(e => new Date(e.start_at).toDateString() === d.toDateString())
        .map(e => e.color)
        .slice(0, 3);
      return { day: letter, date: d.getDate(), dots, isToday: d.toDateString() === today.toDateString() };
    });
  }, [weekEvents]);

  const nextEvent = useMemo(() => {
    const now = new Date();
    return weekEvents.find(e => new Date(e.start_at) > now) ?? null;
  }, [weekEvents]);

  const completeTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <AppScreen scroll bottomInset="tab" contentContainerStyle={styles.content}>

        <View style={styles.topBar}>
          <View>
            <AppText variant="title2">Hola, {firstName}</AppText>
            <AppText variant="caption" tone="tertiary" style={styles.dateLabel}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </AppText>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 24 }}>👤</Text>
            <View style={styles.notifDot} />
          </View>
        </View>

        {currentHousehold && (
          <AppText variant="caption" tone="warning" weight="700" style={styles.householdName}>
            {currentHousehold.nombre}
          </AppText>
        )}

        <HomePlannerSections />

        {/* Status toggle */}
        <AppCard variant="quiet" padding="default" style={styles.statusCard}>
          <View style={styles.toggleRow}>
            <ActionPill label="En casa" selected={atHome} tone="success" onPress={() => setAtHome(true)} />
            <ActionPill label="Sali" selected={!atHome} tone="warning" onPress={() => setAtHome(false)} />
          </View>
          <AppText variant="caption" tone="tertiary" align="center">
            {atHome ? 'Tu familia ve que estas en casa' : 'Tu familia sabe que saliste'}
          </AppText>
        </AppCard>
        {false ? (
          <>
        {/* My schedule */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tu día de hoy</Text>
          <TouchableOpacity><Text style={styles.seeAll}>Ver agenda →</Text></TouchableOpacity>
        </View>
        {dataLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />
        ) : todayEvents.length === 0 ? (
          <View style={[styles.card, { paddingVertical: 20, alignItems: 'center' }]}>
            <Text style={styles.muted}>Sin eventos hoy ✨</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {todayEvents.map((event, idx) => {
              const time = formatTime(event.start_at);
              const isPast = time < now;
              const isCurrent = idx > 0 && formatTime(todayEvents[idx - 1].start_at) < now && time >= now;
              return (
                <View
                  key={event.id}
                  style={[
                    styles.scheduleRow,
                    isCurrent && styles.scheduleRowCurrent,
                    idx < todayEvents.length - 1 && styles.scheduleRowBorder,
                  ]}
                >
                  <Text style={[styles.scheduleTime, isPast && styles.muted]}>{time}</Text>
                  <View style={[styles.scheduleBar, { backgroundColor: event.color + (isPast ? '44' : 'CC') }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scheduleTitle, isPast && styles.muted]}>{event.title}</Text>
                    <View style={[styles.catPill, { backgroundColor: event.color + '22' }]}>
                      <Text style={[styles.catText, { color: event.color }]}>{event.category}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Family activity */}
        <Text style={styles.sectionTitle}>En familia</Text>
        <View style={styles.card}>
          {MOCK_ACTIVITY.map((a, idx) => (
            <View key={a.id} style={[styles.activityRow, idx < MOCK_ACTIVITY.length - 1 && styles.activityBorder]}>
              <Text style={{ fontSize: 28 }}>{a.avatar}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityName}>{a.name}</Text>{' '}{a.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* My tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis tareas</Text>
          {tasks.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tasks.length}</Text>
            </View>
          )}
        </View>
        {dataLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginVertical: 8 }} />
        ) : tasks.length === 0 ? (
          <View style={[styles.taskCard, { justifyContent: 'center' }]}>
            <Text style={styles.muted}>Sin tareas pendientes 🎉</Text>
          </View>
        ) : tasks.map(t => (
          <View key={t.id} style={[styles.taskCard, t.due_date && new Date(t.due_date) < new Date() && styles.taskOverdue]}>
            <TouchableOpacity onPress={() => void completeTask(t.id)} style={styles.checkbox}>
              <View style={styles.checkCircle} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{t.title}</Text>
            </View>
            {t.due_date && new Date(t.due_date) < new Date() && (
              <View style={styles.overdueTag}><Text style={styles.overdueText}>Vencida</Text></View>
            )}
          </View>
        ))}

        {/* Calendar strip */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Esta semana</Text>
        <View style={[styles.card, styles.calendarStrip]}>
          {calendarDays.map(d => (
            <TouchableOpacity key={d.day} style={[styles.dayCell, d.isToday && styles.dayCellToday]}>
              <Text style={[styles.dayLetter, d.isToday && styles.dayLetterToday]}>{d.day}</Text>
              <Text style={[styles.dayNumber, d.isToday && styles.dayNumberToday]}>{d.date}</Text>
              <View style={styles.dotRow}>
                {d.dots.map((dot, i) => (
                  <View key={i} style={[styles.calDot, { backgroundColor: dot }]} />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {nextEvent ? (
          <Text style={styles.nextEvent}>
            📅 Próximo: {nextEvent.title} · {formatTime(nextEvent.start_at)}
          </Text>
        ) : (
          <Text style={styles.nextEvent}>Sin más eventos esta semana</Text>
        )}

          </>
        ) : null}

        {/* Wellbeing (evening only) */}
        {showWellbeing && (
          <AppCard variant="default" padding="generous" style={styles.wellbeingCard}>
            <AppText variant="title3" align="center" style={styles.wellbeingTitle}>
              Como estuvo tu dia?
            </AppText>
            <View style={styles.emojiRow}>
              {WELLBEING_EMOJIS.map((e, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setWellbeing(i)}
                  style={[styles.emojiBtn, wellbeing === i && styles.emojiBtnSelected]}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {wellbeing !== null && (
              <AppText variant="caption" tone="secondary" align="center" style={styles.wellbeingThanks}>
                Gracias. Tu estado se comparte con la familia.
              </AppText>
            )}
          </AppCard>
        )}

        <View style={{ height: 40 }} />
    </AppScreen>
  );
};

const C = {
  bg: colors.background.base,
  surface: colors.surface.card,
  border: colors.border.default,
  text: colors.text.primary,
  textMuted: colors.text.tertiary,
  primary: colors.terracotta[500],
  sage: colors.sage[500],
  amber: colors.warning.base,
};

const styles = StyleSheet.create({
  content: { paddingTop: spacing[1] },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] },
  greeting: { fontSize: 24, fontWeight: '700', color: C.text },
  dateLabel: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  avatarCircle: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.background.soft, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, borderWidth: 2, borderColor: C.bg },
  householdName: { marginBottom: spacing[4] },

  card: { backgroundColor: C.surface, borderRadius: radius.xl, padding: spacing[4], marginBottom: spacing[4], ...shadows.card, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seeAll: { fontSize: 13, color: C.primary, fontWeight: '600' },
  badge: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  muted: { color: C.textMuted, fontSize: 14 },

  statusCard: { marginTop: spacing[2], marginBottom: spacing[5] },
  toggleRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3], width: '100%', justifyContent: 'center' },
  toggleOption: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: C.sage },
  toggleActiveOut: { backgroundColor: C.amber },
  toggleText: { fontSize: 15, fontWeight: '600', color: C.textMuted },
  toggleTextActive: { color: '#FFFFFF' },
  statusSub: { fontSize: 12, color: C.textMuted },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  scheduleRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  scheduleRowCurrent: { backgroundColor: '#FDF3EE', borderRadius: 10, paddingHorizontal: 8 },
  scheduleTime: { fontSize: 13, fontWeight: '700', color: C.text, width: 44 },
  scheduleBar: { width: 4, height: 36, borderRadius: 2 },
  scheduleTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
  catPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  catText: { fontSize: 10, fontWeight: '600' },

  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  activityName: { fontWeight: '700', color: C.text },
  activityText: { fontSize: 14, color: C.textMuted, lineHeight: 20 },

  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  taskOverdue: { borderColor: C.amber + '80', backgroundColor: '#FFFBEB' },
  checkbox: { marginRight: 12 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCCCCC' },
  taskTitle: { fontSize: 15, color: C.text, fontWeight: '500' },
  overdueTag: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  overdueText: { fontSize: 11, color: C.amber, fontWeight: '600' },

  calendarStrip: { flexDirection: 'row', justifyContent: 'space-around', padding: 12 },
  dayCell: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  dayCellToday: { backgroundColor: C.primary },
  dayLetter: { fontSize: 12, color: C.textMuted, fontWeight: '600', marginBottom: 4 },
  dayLetterToday: { color: '#FFF' },
  dayNumber: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
  dayNumberToday: { color: '#FFF' },
  dotRow: { flexDirection: 'row', gap: 2 },
  calDot: { width: 6, height: 6, borderRadius: 3 },
  nextEvent: { fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: -4, marginBottom: 16 },

  wellbeingCard: { marginTop: spacing[2] },
  wellbeingTitle: { marginBottom: spacing[4] },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around' },
  emojiBtn: { minHeight: 44, minWidth: 44, padding: spacing[2], borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  emojiBtnSelected: { backgroundColor: colors.terracotta[50], transform: [{ scale: 1.08 }] },
  wellbeingThanks: { marginTop: spacing[3] },
});
