import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { openEntityDetail } from '../../navigation/plannerNavigationHelpers';
import type { AttentionItem, AttentionResponse, AttentionStatus } from '../../services/planner/plannerAttention';
import { fetchPlannerAttentionRequest } from '../../services/planner/plannerAttentionClient';
import type { ActivityItem, ActivityResponse, ActivityStatus } from '../../services/planner/plannerActivity';
import { fetchPlannerActivityRequest } from '../../services/planner/plannerActivityClient';

type TabKey = 'attention' | 'activity';

const REQUEST_TIMEOUT_MS = 8000;

function entityIcon(entityType: string) {
  if (entityType === 'task') return 'checkbox-outline';
  if (entityType === 'event') return 'calendar-outline';
  return 'flag-outline';
}

function severityColor(severity: string) {
  if (severity === 'critical') return colors.terracotta[600];
  if (severity === 'high') return colors.terracotta[500];
  return colors.sand[600];
}

function attentionCopy(status: AttentionStatus): string {
  if (status.kind === 'loading') return status.stale ? 'Actualizando atención...' : 'Cargando atención...';
  if (status.kind === 'results') return `${status.response.total} asuntos requieren atención.`;
  if (status.kind === 'empty') return 'Nada requiere tu intervención.';
  if (status.kind === 'offline') return status.staleResponse ? 'Sin conexión. Mostrando datos anteriores.' : 'Sin conexión.';
  if (status.kind === 'forbidden') return status.message;
  if (status.kind === 'session_invalid') return status.message;
  if (status.kind === 'error') return status.message;
  return '';
}

function activityCopy(status: ActivityStatus): string {
  if (status.kind === 'loading') return status.stale ? 'Actualizando actividad...' : 'Cargando actividad...';
  if (status.kind === 'results') return 'Actividad reciente del hogar.';
  if (status.kind === 'empty') return 'No hay actividad reciente para mostrar.';
  if (status.kind === 'offline') return status.staleResponse ? 'Sin conexión. Mostrando datos anteriores.' : 'Sin conexión.';
  if (status.kind === 'forbidden') return status.message;
  if (status.kind === 'session_invalid') return status.message;
  if (status.kind === 'error') return status.message;
  return '';
}

function classifyAttentionError(error: unknown, staleResponse: AttentionResponse | null): AttentionStatus {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  if (error instanceof Error && error.name === 'AbortError') return { kind: 'loading', stale: staleResponse !== null };
  if (record.status === 401 || record.code === 'not_authenticated') return { kind: 'session_invalid', message: 'Tu sesión ya no está activa.' };
  if (record.status === 403 || record.code === 'planner_forbidden') return { kind: 'forbidden', message: 'No tenés acceso a Atención en este hogar.' };
  if (error instanceof TypeError || record.code === 'network_error') return { kind: 'offline', staleResponse };
  return { kind: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar Atención.', code: typeof record.code === 'string' ? record.code : null };
}

function classifyActivityError(error: unknown, staleResponse: ActivityResponse | null): ActivityStatus {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  if (error instanceof Error && error.name === 'AbortError') return { kind: 'loading', stale: staleResponse !== null };
  if (record.status === 401 || record.code === 'not_authenticated') return { kind: 'session_invalid', message: 'Tu sesión ya no está activa.' };
  if (record.status === 403 || record.code === 'planner_forbidden') return { kind: 'forbidden', message: 'No tenés acceso a Actividad en este hogar.' };
  if (error instanceof TypeError || record.code === 'network_error') return { kind: 'offline', staleResponse };
  return { kind: 'error', message: error instanceof Error ? error.message : 'No pudimos cargar Actividad.', code: typeof record.code === 'string' ? record.code : null };
}

export function PlannerAttentionActivityScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const contextScope = householdId ? `planner-attention-activity:${householdId}` : 'planner-attention-activity:no-household';

  const [tab, setTab] = useState<TabKey>('attention');
  const [retryNonce, setRetryNonce] = useState(0);
  const [attentionStatus, setAttentionStatus] = useState<AttentionStatus>({ kind: 'initial' });
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>({ kind: 'initial' });
  const [attentionResponse, setAttentionResponse] = useState<AttentionResponse | null>(null);
  const [activityResponse, setActivityResponse] = useState<ActivityResponse | null>(null);
  const attentionSeq = useRef(0);
  const activitySeq = useRef(0);
  const attentionAbortRef = useRef<AbortController | null>(null);
  const activityAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    attentionAbortRef.current?.abort();
    activityAbortRef.current?.abort();
    attentionSeq.current += 1;
    activitySeq.current += 1;
    setTab('attention');
    setAttentionResponse(null);
    setActivityResponse(null);
    setAttentionStatus({ kind: 'initial' });
    setActivityStatus({ kind: 'initial' });
  }, [accessToken, householdId]);

  useEffect(() => {
    if (!accessToken || !householdId) {
      setAttentionStatus({ kind: 'session_invalid', message: 'Tu sesión ya no está activa.' });
      return;
    }
    const controller = new AbortController();
    const sequence = ++attentionSeq.current;
    const staleResponse = attentionResponse;
    attentionAbortRef.current = controller;
    setAttentionStatus({ kind: 'loading', stale: staleResponse !== null });
    void fetchPlannerAttentionRequest({ accessToken, limit: 50, signal: controller.signal, timeoutMs: REQUEST_TIMEOUT_MS, contextScope })
      .then((response) => {
        if (sequence !== attentionSeq.current || controller.signal.aborted) return;
        setAttentionResponse(response);
        setAttentionStatus(response.items.length > 0 ? { kind: 'results', response, stale: false } : { kind: 'empty' });
      })
      .catch((error) => {
        if (sequence !== attentionSeq.current) return;
        const next = classifyAttentionError(error, staleResponse);
        if (next.kind === 'loading') return;
        setAttentionStatus(next);
        if (next.kind !== 'offline') setAttentionResponse(null);
      });
    return () => controller.abort();
  }, [accessToken, contextScope, householdId, retryNonce]);

  useEffect(() => {
    if (!accessToken || !householdId) {
      setActivityStatus({ kind: 'session_invalid', message: 'Tu sesión ya no está activa.' });
      return;
    }
    const controller = new AbortController();
    const sequence = ++activitySeq.current;
    const staleResponse = activityResponse;
    activityAbortRef.current = controller;
    setActivityStatus({ kind: 'loading', stale: staleResponse !== null });
    void fetchPlannerActivityRequest({ accessToken, limit: 50, signal: controller.signal, timeoutMs: REQUEST_TIMEOUT_MS, contextScope })
      .then((response) => {
        if (sequence !== activitySeq.current || controller.signal.aborted) return;
        setActivityResponse(response);
        setActivityStatus(response.groups.length > 0 ? { kind: 'results', response, stale: false } : { kind: 'empty' });
      })
      .catch((error) => {
        if (sequence !== activitySeq.current) return;
        const next = classifyActivityError(error, staleResponse);
        if (next.kind === 'loading') return;
        setActivityStatus(next);
        if (next.kind !== 'offline') setActivityResponse(null);
      });
    return () => controller.abort();
  }, [accessToken, contextScope, householdId, retryNonce]);

  const unresolvedCount = attentionResponse?.items.length ?? 0;
  const refresh = useCallback(() => setRetryNonce((value) => value + 1), []);

  const handleBack = useCallback(() => {
    attentionAbortRef.current?.abort();
    activityAbortRef.current?.abort();
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('PlannerHome');
  }, [navigation]);

  const handleOpenAttention = useCallback((item: AttentionItem) => {
    openEntityDetail(navigation, item.entityType, { entityId: item.entityId, source: 'planner', returnTo: 'previous' });
  }, [navigation]);

  const handleOpenActivity = useCallback((item: ActivityItem) => {
    if (item.entityType === 'milestone') {
      navigation.navigate('GoalDetail', { entityId: item.entityId, source: 'planner', returnTo: 'previous' });
      return;
    }
    openEntityDetail(navigation, item.entityType, { entityId: item.entityId, source: 'planner', returnTo: 'previous' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </Pressable>
        <AppText variant="title3" weight="800" style={styles.title}>Atención y actividad</AppText>
      </View>

      <View style={styles.tabBar}>
        <Pressable onPress={() => setTab('attention')} accessibilityRole="tab" accessibilityLabel={unresolvedCount > 0 ? `Atención, ${unresolvedCount} asuntos` : 'Atención'} accessibilityState={{ selected: tab === 'attention' }} style={[styles.tab, tab === 'attention' && styles.tabActive]}>
          <AppText variant="bodySmall" weight="800" style={tab === 'attention' ? styles.tabActiveText : styles.tabText}>Atención</AppText>
          {unresolvedCount > 0 ? <Badge count={unresolvedCount} /> : null}
        </Pressable>
        <Pressable onPress={() => setTab('activity')} accessibilityRole="tab" accessibilityLabel="Actividad" accessibilityState={{ selected: tab === 'activity' }} style={[styles.tab, tab === 'activity' && styles.tabActive]}>
          <AppText variant="bodySmall" weight="800" style={tab === 'activity' ? styles.tabActiveText : styles.tabText}>Actividad</AppText>
        </Pressable>
      </View>

      <View style={styles.statusLine} accessibilityLiveRegion="polite">
        {(tab === 'attention' && attentionStatus.kind === 'loading') || (tab === 'activity' && activityStatus.kind === 'loading') ? <ActivityIndicator size="small" color={colors.terracotta[600]} /> : null}
        <AppText variant="bodySmall" tone="secondary">{tab === 'attention' ? attentionCopy(attentionStatus) : activityCopy(activityStatus)}</AppText>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {tab === 'attention' ? (
          <AttentionContent status={attentionStatus} items={attentionResponse?.items ?? []} onOpen={handleOpenAttention} onPrimaryAction={handleOpenAttention} onRetry={refresh} />
        ) : (
          <ActivityContent status={activityStatus} groups={activityResponse?.groups ?? []} onOpen={handleOpenActivity} onRetry={refresh} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Badge({ count }: { count: number }) {
  return <View style={styles.badge} accessibilityLabel={`${count} asuntos sin resolver`}><AppText variant="micro" weight="800" tone="inverse">{count > 99 ? '99+' : String(count)}</AppText></View>;
}

function AttentionContent({ status, items, onOpen, onPrimaryAction, onRetry }: { status: AttentionStatus; items: readonly AttentionItem[]; onOpen: (item: AttentionItem) => void; onPrimaryAction: (item: AttentionItem) => void; onRetry: () => void }) {
  if ((status.kind === 'results' || status.kind === 'loading') && items.length > 0) return <>{items.map((item) => <AttentionRow key={item.attentionId} item={item} onOpen={() => onOpen(item)} onPrimaryAction={() => onPrimaryAction(item)} />)}</>;
  if (status.kind === 'empty') return <StateBox title="Sin asuntos" message="Nada requiere tu intervención." />;
  if (status.kind === 'error' || status.kind === 'offline') return <StateBox title="No disponible" message={attentionCopy(status)} onRetry={onRetry} />;
  if (status.kind === 'forbidden' || status.kind === 'session_invalid') return <StateBox title="No disponible" message={attentionCopy(status)} />;
  return <LoadingState />;
}

function ActivityContent({ status, groups, onOpen, onRetry }: { status: ActivityStatus; groups: ActivityResponse['groups']; onOpen: (item: ActivityItem) => void; onRetry: () => void }) {
  if ((status.kind === 'results' || status.kind === 'loading') && groups.length > 0) return <>{groups.map((group) => <ActivityDayGroup key={group.dateKey} group={group} onOpen={onOpen} />)}</>;
  if (status.kind === 'empty') return <StateBox title="Sin actividad" message="No hay actividad reciente para mostrar." />;
  if (status.kind === 'error' || status.kind === 'offline') return <StateBox title="No disponible" message={activityCopy(status)} onRetry={onRetry} />;
  if (status.kind === 'forbidden' || status.kind === 'session_invalid') return <StateBox title="No disponible" message={activityCopy(status)} />;
  return <LoadingState />;
}

function AttentionRow({ item, onOpen, onPrimaryAction }: { item: AttentionItem; onOpen: () => void; onPrimaryAction: () => void }) {
  const color = severityColor(item.severity);
  return (
    <View style={styles.attentionRow}>
      <View style={styles.rowMain}>
        <View style={styles.rowIcon}><HomePlusIcon name={entityIcon(item.entityType)} size={20} color={color} /></View>
        <View style={styles.rowText}><AppText variant="body" weight="800" numberOfLines={2}>{item.title}</AppText><AppText variant="caption" tone="secondary" numberOfLines={2}>{item.summary}</AppText></View>
      </View>
      <View style={styles.rowActions}>
        {item.primaryAction ? <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={onPrimaryAction} accessibilityRole="button" accessibilityLabel={item.primaryAction.label}><AppText variant="caption" weight="800" tone="inverse">{item.primaryAction.label}</AppText></Pressable> : null}
        <Pressable style={({ pressed }) => [styles.openButton, pressed && styles.pressed]} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Abrir ${item.title}`}><AppText variant="caption" weight="800">Abrir</AppText></Pressable>
      </View>
    </View>
  );
}

function ActivityDayGroup({ group, onOpen }: { group: ActivityResponse['groups'][number]; onOpen: (item: ActivityItem) => void }) {
  return (
    <View style={styles.dayGroup} accessibilityLabel={`${group.label}, ${group.items.length} eventos`}>
      <AppText variant="caption" weight="800" tone="secondary" style={styles.dayLabel}>{group.label}</AppText>
      {group.items.map((item) => <ActivityRow key={item.activityId} item={item} onOpen={() => onOpen(item)} />)}
    </View>
  );
}

function ActivityRow({ item, onOpen }: { item: ActivityItem; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${item.summary}. Abrir detalle.`}>
      <View style={styles.activityIcon}><HomePlusIcon name={entityIcon(item.entityType)} size={18} color={colors.text.secondary} /></View>
      <View style={styles.rowText}><AppText variant="bodySmall" numberOfLines={2}>{item.summary}</AppText><AppText variant="caption" tone="tertiary">{item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</AppText></View>
      <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
    </Pressable>
  );
}

function StateBox({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return <View style={styles.stateBox}><AppText variant="title3" weight="800" align="center">{title}</AppText><AppText variant="bodySmall" tone="secondary" align="center">{message}</AppText>{onRetry ? <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button" accessibilityLabel="Reintentar"><AppText variant="bodySmall" weight="800" tone="inverse">Reintentar</AppText></Pressable> : null}</View>;
}

function LoadingState() {
  return <View style={styles.stateBox}><ActivityIndicator size="large" color={colors.terracotta[600]} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: spacing[2] },
  title: { flex: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border.default },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.terracotta[600] },
  tabText: { color: colors.text.secondary },
  tabActiveText: { color: colors.terracotta[600] },
  badge: { minWidth: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.terracotta[600], alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[1] },
  statusLine: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[5], paddingBottom: spacing[2] },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
  attentionRow: { paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border.default },
  rowMain: { flexDirection: 'row', alignItems: 'flex-start' },
  rowIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3], backgroundColor: colors.terracotta[50] },
  rowText: { flex: 1 },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2], marginTop: spacing[2] },
  primaryButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius.md, backgroundColor: colors.terracotta[600] },
  openButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default },
  activityRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border.default },
  activityIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3], backgroundColor: colors.surface.soft },
  dayGroup: { marginTop: spacing[4] },
  dayLabel: { marginBottom: spacing[2] },
  stateBox: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: spacing[3], paddingHorizontal: spacing[6] },
  retryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[5], borderRadius: radius.md, backgroundColor: colors.terracotta[600] },
  pressed: { opacity: 0.7 },
});
