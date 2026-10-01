import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { AppCard, AppScreen, AppText } from '../../components/ui';
import { colors, radius, shadows, spacing } from '../../constants/theme';
import { HomePlannerSections } from './HomePlannerSections';

type Task = any;
type CalendarEvent = any;

const MOODS = [
  { emoji: '😴', label: 'Cansada',   ring: '#6B7280' },
  { emoji: '😤', label: 'Enojada',   ring: '#DC2626' },
  { emoji: '😐', label: 'Bien',      ring: '#9CA3AF' },
  { emoji: '😊', label: 'Contenta',  ring: '#F59E0B' },
  { emoji: '🤩', label: '¡Genial!',  ring: '#6B4FE8' },
];

const MOCK_ACTIVITY = [
  { id: '1', avatar: '👨', name: 'Papá',   text: 'completó la compra del mercado 💪' },
  { id: '2', avatar: '👩', name: 'Mamá',   text: 'agregó: Cena especial el sábado 🎉' },
  { id: '3', avatar: '📷', name: 'Familia', text: 'Nueva foto familiar subida' },
];

const MOCK_CHALLENGE = {
  title: '30 min sin pantallas en familia',
  members: [
    { name: 'Yo',   avatar: '🧒', pct: 70 },
    { name: 'Mamá', avatar: '👩', pct: 85 },
    { name: 'Papá', avatar: '👨', pct: 50 },
    { name: 'Ana',  avatar: '👧', pct: 90 },
  ],
};

const XP_BY_PRIORITY: Record<string, number> = {
  alta: 80,
  media: 50,
  baja: 30,
  high: 80,
  normal: 50,
  low: 30,
};
const STARS_BY_PRIORITY: Record<string, number> = {
  alta: 3,
  media: 2,
  baja: 1,
  high: 3,
  normal: 2,
  low: 1,
};
const CATEGORY_EMOJI: Record<string, string> = {
  trabajo: '💼', escuela: '📚', familia: '🏠', personal: '🎯',
  salud: '💊', deporte: '⚽', otro: '⭐',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const HomeAdolescente = () => {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [mood, setMood] = useState(3);
  const [xp] = useState(280);
  const [streak] = useState(7);
  const MAX_XP = 400;

  const firstName = user?.user_metadata?.nombre?.split(' ')[0] ?? 'Tú';

  const earnedXp = tasks
    .filter(t => completedIds.has(t.id))
    .reduce((s, t) => s + XP_BY_PRIORITY[t.priority], 0);
  const totalXp = xp + earnedXp;

  const fetchData = useCallback(async () => {
    if (!currentHousehold || !user) return;
    setDataLoading(true);
    setTasks([]);
    setTodayEvents([]);
    setDataLoading(false);
  }, [currentHousehold, user]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const completeQuest = async (id: string) => {
    if (completedIds.has(id)) return;
    setCompletedIds(prev => new Set([...prev, id]));
  };

  const currentMood = MOODS[mood];

  return (
    <AppScreen scroll bottomInset="tab" contentContainerStyle={styles.content}>

        {/* Hero header */}
        <AppCard variant="warning" padding="generous" style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <AppText variant="title2">Hola, {firstName}</AppText>
            <View style={styles.xpRow}>
              <AppText variant="caption" tone="secondary" weight="700">Nivel 4 - {totalXp}/{MAX_XP} XP</AppText>
              <View style={styles.xpBar}>
                <View style={[styles.xpFill, { width: `${Math.min(100, (totalXp / MAX_XP) * 100)}%` as any }]} />
              </View>
            </View>
          </View>
          <View style={styles.streakBadge}>
            <AppText variant="micro" tone="warning" weight="700">{streak} dias</AppText>
          </View>
        </AppCard>

        <HomePlannerSections />

        {/* Mood ring */}
        <AppCard variant="default" padding="generous" style={styles.moodCard}>
          <View style={[styles.moodRing, { borderColor: currentMood.ring, shadowColor: currentMood.ring }]}>
            <Text style={styles.moodEmoji}>{currentMood.emoji}</Text>
          </View>
          <AppText variant="title3" align="center">{currentMood.label}</AppText>
          <AppText variant="caption" tone="tertiary" align="center" style={styles.moodHint}>Como estas hoy? Toca para cambiar</AppText>
          <View style={styles.moodOptions}>
            {MOODS.map((m, i) => (
              <TouchableOpacity key={i} onPress={() => setMood(i)} style={[styles.moodBtn, mood === i && { transform: [{ scale: 1.12 }] }]}>
                <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </AppCard>
        {false ? (
          <>
        {/* Quests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚔️ Misiones de hoy</Text>
        </View>
        {dataLoading ? (
          <ActivityIndicator color={C.violet} style={{ marginVertical: 12 }} />
        ) : tasks.length === 0 ? (
          <View style={styles.questCard}>
            <Text style={{ color: C.textMuted, fontSize: 14, textAlign: 'center' }}>
              Sin misiones pendientes 🎉
            </Text>
          </View>
        ) : tasks.map((t, idx) => {
          const done = completedIds.has(t.id);
          const isBonus = idx === 0 && tasks.length > 1;
          const stars = STARS_BY_PRIORITY[t.priority];
          const questXp = XP_BY_PRIORITY[t.priority];
          const emoji = CATEGORY_EMOJI['personal'];
          return (
            <View key={t.id} style={[styles.questCard, isBonus && styles.questBonus, done && styles.questDone]}>
              {isBonus && <Text style={styles.bonusLabel}>MISIÓN BONUS 🌟</Text>}
              <View style={styles.questRow}>
                <Text style={styles.questEmoji}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.questTitle, done && styles.strikethru]}>{t.title}</Text>
                  <View style={styles.questMeta}>
                    <Text style={styles.questStars}>{'⭐'.repeat(stars)}</Text>
                  </View>
                </View>
                <View style={styles.questRight}>
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpBadgeText}>+{questXp} XP</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.questCheck, done && styles.questCheckDone]}
                    onPress={() => !done && void completeQuest(t.id)}
                  >
                    <Text style={{ fontSize: 14, color: done ? '#FFF' : 'transparent' }}>✓</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Schedule */}
        <Text style={styles.sectionTitle}>📅 Mi agenda de hoy</Text>
        {dataLoading ? (
          <ActivityIndicator color={C.violet} style={{ marginVertical: 8 }} />
        ) : (
          <View style={styles.scheduleCard}>
            {todayEvents.length === 0 ? (
              <Text style={{ color: C.textMuted, fontSize: 13, paddingVertical: 8 }}>Sin eventos hoy ✨</Text>
            ) : todayEvents.map((item, idx) => (
              <View key={item.id} style={[styles.scheduleRow, idx < todayEvents.length - 1 && styles.scheduleRowBorder]}>
                <Text style={{ fontSize: 22 }}>📌</Text>
                <Text style={styles.scheduleTime}>{formatTime(item.start_at)}</Text>
                <Text style={styles.scheduleTitle}>{item.title}</Text>
              </View>
            ))}
          </View>
        )}

          </>
        ) : null}

        {/* Family activity */}
        <AppText variant="title2" style={styles.sectionTitle}>En la familia</AppText>
        <AppCard variant="default" padding="default" style={styles.scheduleCard}>
          {MOCK_ACTIVITY.map((a, idx) => (
            <View key={a.id} style={[styles.activityRow, idx < MOCK_ACTIVITY.length - 1 && styles.scheduleRowBorder]}>
              <Text style={{ fontSize: 26 }}>{a.avatar}</Text>
              <AppText variant="bodySmall" tone="secondary" style={styles.activityText}>
                <AppText variant="bodySmall" weight="700">{a.name}</AppText> {a.text}
              </AppText>
              <TouchableOpacity style={styles.reactBtn}>
                <Text style={{ fontSize: 16 }}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
        </AppCard>

        {/* Family challenge */}
        <AppCard variant="warning" padding="default" style={styles.challengeCard}>
          <AppText variant="micro" tone="warning" weight="700" style={styles.challengeLabel}>DESAFIO FAMILIAR - SEMANA</AppText>
          <AppText variant="title3" style={styles.challengeTitle}>{MOCK_CHALLENGE.title}</AppText>
          <View style={styles.challengeMembers}>
            {MOCK_CHALLENGE.members.map(m => (
              <View key={m.name} style={styles.challengeMember}>
                <Text style={{ fontSize: 26 }}>{m.avatar}</Text>
                <View style={styles.challengeBarBg}>
                  <View style={[styles.challengeBarFill, { width: `${m.pct}%` as any }]} />
                </View>
                <AppText variant="micro" tone="tertiary" style={styles.challengePct}>{m.pct}%</AppText>
              </View>
            ))}
          </View>
          <View style={styles.groupBarBg}>
            <View style={[styles.groupBarFill, { width: '74%' }]} />
          </View>
          <AppText variant="caption" tone="warning" weight="700" align="center">Casi llegan: 74% grupal</AppText>
        </AppCard>

        {/* Private space */}
        <TouchableOpacity style={styles.privateCard}>
          <Text style={styles.lockIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySmall" tone="secondary" weight="700">Mi espacio privado</AppText>
            <AppText variant="caption" tone="tertiary">Proximamente</AppText>
          </View>
          <AppText variant="title3" tone="tertiary">›</AppText>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
    </AppScreen>
  );
};

const C = {
  bg: colors.background.base,
  surface: colors.surface.card,
  border: colors.border.subtle,
  text: colors.text.primary,
  textMuted: colors.text.tertiary,
  violet: colors.terracotta[400],
  primary: colors.terracotta[500],
  gold: colors.sand[500],
};

const styles = StyleSheet.create({
  content: { paddingTop: spacing[1] },

  heroHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: spacing[5],
  },
  heroContent: { flex: 1 },
  greeting: { marginBottom: spacing[2] },
  xpRow: { gap: 4 },
  xpLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  xpBar: { height: 8, backgroundColor: colors.sand[100], borderRadius: radius.pill, overflow: 'hidden' },
  xpFill: { height: 8, backgroundColor: C.primary, borderRadius: radius.pill },
  streakBadge: { backgroundColor: colors.warning.soft, borderRadius: radius.pill, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  streakText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  moodCard: { marginBottom: spacing[5], alignItems: 'center' },
  moodRing: { width: 90, height: 90, borderRadius: radius.pill, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2], backgroundColor: colors.background.soft },
  moodEmoji: { fontSize: 44 },
  moodLabel: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  moodHint: { marginBottom: spacing[3], marginTop: spacing[1] },
  moodOptions: { flexDirection: 'row', gap: 12 },
  moodBtn: { minHeight: 44, minWidth: 44, padding: spacing[2], alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },

  questCard: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: C.border, borderLeftWidth: 3, borderLeftColor: C.violet },
  questBonus: { borderColor: C.gold + '80', borderLeftColor: C.gold },
  questDone: { opacity: 0.5 },
  bonusLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 0.8, marginBottom: 6 },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  questEmoji: { fontSize: 28 },
  questTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
  strikethru: { textDecorationLine: 'line-through', color: C.textMuted },
  questMeta: { flexDirection: 'row', alignItems: 'center' },
  questStars: { fontSize: 12 },
  questRight: { alignItems: 'center', gap: 6 },
  xpBadge: { backgroundColor: C.gold + '33', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  xpBadgeText: { fontSize: 11, fontWeight: '800', color: C.gold },
  questCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.violet, alignItems: 'center', justifyContent: 'center' },
  questCheckDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },

  scheduleCard: { marginBottom: spacing[5] },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  scheduleRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  scheduleTime: { fontSize: 13, color: C.textMuted, fontWeight: '600', width: 44 },
  scheduleTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  activityName: { fontWeight: '700', color: C.text },
  activityText: { flex: 1, fontSize: 13, color: C.textMuted, lineHeight: 18 },
  reactBtn: { padding: 4 },

  challengeCard: { marginBottom: spacing[5] },
  challengeLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 0.8, marginBottom: 6 },
  challengeTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
  challengeMembers: { gap: 8, marginBottom: 12 },
  challengeMember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  challengeBarBg: { flex: 1, height: 6, backgroundColor: colors.sand[100], borderRadius: radius.pill, overflow: 'hidden' },
  challengeBarFill: { height: 6, backgroundColor: C.primary, borderRadius: radius.pill },
  challengePct: { fontSize: 11, color: C.textMuted, width: 32, textAlign: 'right' },
  groupBarBg: { height: 8, backgroundColor: colors.sand[100], borderRadius: radius.pill, overflow: 'hidden', marginBottom: spacing[2] },
  groupBarFill: { height: 8, backgroundColor: C.gold, borderRadius: radius.pill },
  challengeMotivation: { fontSize: 13, color: C.gold, fontWeight: '600', textAlign: 'center' },

  privateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: radius.xl, padding: spacing[4], marginBottom: spacing[2], borderWidth: 1, borderColor: colors.border.default, gap: spacing[3], ...shadows.card },
  lockIcon: { fontSize: 22 },
  privateTitle: { fontSize: 14, fontWeight: '600', color: C.textMuted },
  privateSubtitle: { fontSize: 12, color: C.textMuted + '88', marginTop: 2 },
  privateArrow: { fontSize: 22, color: C.textMuted },
});
