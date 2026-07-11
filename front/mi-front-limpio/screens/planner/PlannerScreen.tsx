import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { AppCard, AppText, ErrorState, Skeleton } from '../../components/ui';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import { colors } from '../../constants/theme';
import { ApiError } from '../../services/api';
import { getPlannerSummary, type PlannerSummary } from '../../services/plannerSummary';
import { useAuth } from '../../context/AuthContext';
import { EventForm } from './EventForm';
import { PlannerCalendarScreen } from './PlannerCalendarScreen';
import { PlannerGoalsScreen } from './PlannerGoalsScreen';
import { PlannerTasksScreen } from './PlannerTasksScreen';
import { TaskForm } from './TaskForm';
import { plannerStyles as S } from './plannerShared';

type PlannerInternalTab = 'tasks' | 'calendar' | 'goals';
type PlannerSheet =
  | { type: 'task'; mode: 'create' | 'edit'; id?: string; initialDueDate?: string }
  | {
      type: 'event';
      mode: 'create' | 'edit';
      id?: string;
      baseEventId?: string;
      occurrenceId?: string;
      occurrenceStartsAt?: string;
      occurrenceEndsAt?: string;
      isGeneratedRecurringOccurrence?: boolean;
      initialDate?: string;
    };

export function PlannerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const processedNavKeyRef = useRef<string | null>(null);
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [activeTab, setActiveTab] = useState<PlannerInternalTab>(route.params?.initialTab ?? 'tasks');
  const [summary, setSummary] = useState<PlannerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<PlannerSheet | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadSummary = useCallback(async (silent = false) => {
    if (!accessToken) return;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const nextSummary = await getPlannerSummary(accessToken);
      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar Planner.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const p = route.params;
    if (!p?.initialTab && !p?.initialSheet && !p?.sheetKey && !p?.refreshKey) {
      return;
    }

    const key = p?.sheetKey ?? p?.refreshKey ?? `${p?.initialTab ?? ''}-${p?.initialSheet ?? ''}`;
    if (processedNavKeyRef.current === key) {
      return;
    }
    processedNavKeyRef.current = key;

    if (p.initialTab === 'tasks') setActiveTab('tasks');
    else if (p.initialTab === 'calendar') setActiveTab('calendar');
    else if (p.initialTab === 'goals') setActiveTab('goals');

    if (p.initialSheet === 'task') setSheet({ type: 'task', mode: 'create' });
    else if (p.initialSheet === 'event') setSheet({ type: 'event', mode: 'create' });

    if (p.refreshKey) {
      setRefreshKey((value) => value + 1);
      void loadSummary();
    }

    navigation.setParams({
      initialTab: undefined,
      initialSheet: undefined,
      sheetKey: undefined,
      refreshKey: undefined,
    });
  }, [route.params?.initialTab, route.params?.initialSheet, route.params?.sheetKey, route.params?.refreshKey, loadSummary, navigation]);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((value) => value + 1);
      void loadSummary(true);
    }, [loadSummary]),
  );

  const refresh = async () => {
    setRefreshing(true);
    setRefreshKey((value) => value + 1);
    await loadSummary(true);
    setRefreshing(false);
  };

  const changed = () => {
    setRefreshKey((value) => value + 1);
    void loadSummary(true);
  };

  const completeSheetMutation = (message: string) => {
    setSheet(null);
    setToast(message);
    changed();
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
      >
        <View style={[S.headerRow, { marginBottom: 8 }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="title1">Planner</AppText>
            <AppText variant="bodySmall" tone="secondary" style={S.subtitle}>
              Organizá tareas, eventos y el ritmo de tu casa en un solo lugar.
            </AppText>
          </View>
        </View>

        <View style={S.topbarTabsContainer}>
          <TouchableOpacity
            style={[S.topbarTab, activeTab === 'tasks' && S.topbarTabActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <HomePlusIcon name={APP_ICONS.planner.todo} size={16} color={activeTab === 'tasks' ? colors.terracotta[700] : colors.text.tertiary} />
            <AppText variant="micro" tone={activeTab === 'tasks' ? 'primary' : 'tertiary'} weight={activeTab === 'tasks' ? '700' : '500'} style={activeTab === 'tasks' ? S.topbarTabTextActive : S.topbarTabText}>Tareas</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.topbarTab, activeTab === 'calendar' && S.topbarTabActive]}
            onPress={() => setActiveTab('calendar')}
          >
            <HomePlusIcon name={APP_ICONS.planner.calendar} size={16} color={activeTab === 'calendar' ? colors.terracotta[700] : colors.text.tertiary} />
            <AppText variant="micro" tone={activeTab === 'calendar' ? 'primary' : 'tertiary'} weight={activeTab === 'calendar' ? '700' : '500'} style={activeTab === 'calendar' ? S.topbarTabTextActive : S.topbarTabText}>Calendario</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.topbarTab, activeTab === 'goals' && S.topbarTabActive]}
            onPress={() => setActiveTab('goals')}
          >
            <HomePlusIcon name={APP_ICONS.planner.goals} size={16} color={activeTab === 'goals' ? colors.terracotta[700] : colors.text.tertiary} />
            <AppText variant="micro" tone={activeTab === 'goals' ? 'primary' : 'tertiary'} weight={activeTab === 'goals' ? '700' : '500'} style={activeTab === 'goals' ? S.topbarTabTextActive : S.topbarTabText}>Metas</AppText>
          </TouchableOpacity>
        </View>

        {toast ? (
          <View style={S.toastBox}>
            <HomePlusIcon name="checkmark-circle" size={18} color={colors.success.strong} />
            <AppText variant="bodySmall" tone="success" weight="700" style={{ flex: 1 }}>{toast}</AppText>
          </View>
        ) : null}

        {loading ? (
          <Skeleton variant="screenSection" />
        ) : null}

        {!loading && error ? (
          <ErrorState description={error} onRetry={() => void loadSummary()} />
        ) : null}

        {!loading && !error && activeTab === 'tasks' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={[S.row, { gap: 8 }]}>
                <AppCard variant="quiet" padding="compact" style={[S.statCard, S.statCardPending]}>
                  <AppText variant="micro" tone="tertiary" weight="700" style={S.statLabel}>Pendientes</AppText>
                  <AppText variant="title2" style={S.statValue}>
                    {summary?.pending_tasks_count ?? 0}
                  </AppText>
                </AppCard>
                <AppCard variant="quiet" padding="compact" style={[S.statCard, S.statCardToday]}>
                  <AppText variant="micro" tone="warning" weight="700" style={[S.statLabel, S.statLabelToday]}>Hoy</AppText>
                  <AppText variant="title2" style={[S.statValue, S.statValueToday]}>
                    {summary?.today_tasks_count ?? 0}
                  </AppText>
                </AppCard>
                <AppCard variant="warning" padding="compact" style={[S.statCard, S.statCardOverdue]}>
                  <AppText variant="micro" tone="warning" weight="700" style={S.statLabel}>Vencidas</AppText>
                  <AppText variant="title2" style={S.statValue}>
                    {summary?.overdue_tasks_count ?? 0}
                  </AppText>
                </AppCard>
                <AppCard variant="success" padding="compact" style={[S.statCard, S.statCardReview]}>
                  <AppText variant="micro" tone="success" weight="700" style={S.statLabel}>A revisar</AppText>
                  <AppText variant="title2" style={S.statValue}>
                    {summary?.awaiting_verification_count ?? 0}
                  </AppText>
                </AppCard>
              </View>
            </ScrollView>
          </>
        ) : null}

        {activeTab === 'tasks' ? (
          <PlannerTasksScreen
            refreshKey={refreshKey}
            onChanged={changed}
            onCreateTask={() => setSheet({ type: 'task', mode: 'create' })}
            onEditTask={(id) => setSheet({ type: 'task', mode: 'edit', id })}
            onShowToast={(msg) => {
              setToast(msg);
              setTimeout(() => setToast(null), 2200);
            }}
          />
        ) : null}

{activeTab === 'calendar' ? (
          <PlannerCalendarScreen
            refreshKey={refreshKey}
            onChanged={changed}
            onCreateEvent={(initialDate) => setSheet({ type: 'event', mode: 'create', initialDate })}
            onEditEvent={(eventId, context) =>
              setSheet(
                context?.isGeneratedRecurringOccurrence
                  ? {
                      type: 'event',
                      mode: 'edit',
                      id: eventId,
                      baseEventId: context.baseEventId,
                      occurrenceId: context.occurrenceId,
                      occurrenceStartsAt: context.occurrenceStartsAt,
                      occurrenceEndsAt: context.occurrenceEndsAt,
                      isGeneratedRecurringOccurrence: true,
                    }
                  : { type: 'event', mode: 'edit', id: eventId },
              )
            }
            onEditTask={(id) => setSheet({ type: 'task', mode: 'edit', id })}
            onCreateTask={(initialDueDate) => setSheet({ type: 'task', mode: 'create', initialDueDate })}
            onShowToast={(msg) => {
              setToast(msg);
              setTimeout(() => setToast(null), 2200);
            }}
          />
        ) : null}

        {activeTab === 'goals' ? (
          <PlannerGoalsScreen
            refreshKey={refreshKey}
            onChanged={changed}
            onShowToast={(msg) => {
              setToast(msg);
              setTimeout(() => setToast(null), 2200);
            }}
          />
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(sheet)} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable
          style={S.sheetBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            setSheet(null);
          }}
        >
          <Pressable style={S.sheetPanel} onPress={(e) => e.stopPropagation()}>
            <View style={S.sheetHandleContainer}>
              <View style={S.sheetHandle} />
              <TouchableOpacity
                style={S.sheetCloseButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setSheet(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppText variant="micro" tone="tertiary" weight="700">Cerrar</AppText>
              </TouchableOpacity>
            </View>
            {sheet?.type === 'task' ? (
              <TaskForm
                mode={sheet.mode}
                taskId={sheet.id}
                initialDueDate={sheet.initialDueDate}
                embedded
                onClose={() => setSheet(null)}
                onSaved={completeSheetMutation}
              />
            ) : null}
            {sheet?.type === 'event' ? (
              <EventForm
                mode={sheet.mode}
                eventId={sheet.id}
                initialDate={sheet.initialDate}
                embedded
                onClose={() => setSheet(null)}
                onSaved={completeSheetMutation}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
