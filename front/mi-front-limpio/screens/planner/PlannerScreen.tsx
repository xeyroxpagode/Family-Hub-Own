/**
 * Planner V1 — M2 Planner Shell (M3 sheet host migration complete).
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M2 and §M3):
 * - Single Planner Shell owns the visible global state via the pure
 *   `resolvePlannerShellState`. Tasks, Calendar and Goals retain ownership of
 *   their internal content but the Shell decides what is visible at the
 *   top of Planner.
 * - Header is de-cluttered: title only, no slogan, no legacy stats, no Search,
 *   no disabled future buttons.
 * - Tabs conform to the canonical `PlannerTabKey` from M1; Tasks is the
 *   default; persistence belongs to M6.
 * - Initial loading uses a non-flicker skeleton; refresh uses a non-blocking
 *   indicator that NEVER replaces existing content.
 * - Empty does not appear prematurely; partial preserves healthy content;
 *   offline-stale preserves data; offline-empty explains without falling
 *   back to a product empty state.
 * - Forbidden/not_found are separated; conflict is NEVER auto-resolved via
 *   last-write-wins (M4/M5 finalize conflict UI inside forms).
 *
 * M3 changes (replacing the compat-bridge-until-M3 left by M2):
 * - Removed: local Modal of Task/Event forms (the legacy compat bridge).
 * - Removed: local `PlannerSheet` discriminated union as the source of truth.
 * - Added: `usePlannerSheet()` delegation — onCreateTask / onEditTask /
 *   onCreateEvent / onEditEvent now call `openTaskForm` / `openEventForm` on
 *   the canonical `PlannerSheetProvider`. The actual Modal is owned once by
 *   `PlannerSheetHost` mounted in `HomeTabNavigator`.
 * - The Shell still owns its `overflow` Modal (Papelera) — that is a Planner
 *   navigation menu, not a sheet over the planner create/edit forms, and is
 *   outside the M3 sheet host scope (it has no form content and no submit
 *   lifecycle). It stays unchanged.
 *
 * Out of scope for M2/M3:
 * - Search entry (M7).
 * - Quick Actions V1 (M4).
 * - Goal Quick Create (M5).
 * - Tab persistence (M6).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { AppText } from '../../components/ui';
import { APP_ICONS, HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors } from '../../constants/theme';
import { getPlannerSummary, type PlannerSummary } from '../../services/plannerSummary';
import {
  fetchPlannerCapabilitiesCached,
  type PlannerCapabilitiesProjection,
} from '../../services/plannerCapabilities';
import { classifyPlannerError, type PlannerError } from '../../services/planner/plannerErrorAdapter';
import { canViewPlanner } from '../../services/planner/plannerCapabilitiesAdapter';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { PlannerCalendarScreen } from './PlannerCalendarScreen';
import { PlannerGoalsScreen } from './PlannerGoalsScreen';
import { PlannerTasksScreen } from './PlannerTasksScreen';
import { plannerStyles as S } from './plannerShared';
import {
  PLANNER_TAB_KEYS,
  isPlannerTabKey,
  type PlannerTabKey,
} from '../../navigation/plannerNavigationContract';
import { PlannerErrorBoundary } from '../../components/planner/PlannerErrorBoundary';
import { PlannerStateView } from '../../components/planner/PlannerStateView';
import {
  resolvePlannerShellState,
  shellStateShowsActiveContent,
  type PlannerShellState,
} from '../../services/planner/plannerShellState';

// ---------------------------------------------------------------------------
// 1. M3 — PlannerScreen no longer owns the Task/Event sheet Modal. The only
//    local Modal retained is the overflow (Papelera) menu which is a Planner
//    navigation surface, not a sheet host form.
// ---------------------------------------------------------------------------

const DEFAULT_TAB: PlannerTabKey = 'tasks';

// ---------------------------------------------------------------------------
// 2. PlannerScreen shell
// ---------------------------------------------------------------------------

export function PlannerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const processedNavKeyRef = useRef<string | null>(null);
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const { currentHousehold } = useHousehold();

  // --- Canonical tabs (single authority via PlannerTabKey from M1) ---
  const [activeTab, setActiveTab] = useState<PlannerTabKey>(() => {
    const initialTab = route.params?.initialTab;
    return isPlannerTabKey(initialTab) ? initialTab : DEFAULT_TAB;
  });

  // --- Summary content (Shell-level cached data) ---
  const [summary, setSummary] = useState<PlannerSummary | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [plannerError, setPlannerError] = useState<PlannerError | null>(null);

  // --- Capabilities (deny-safe projection) ---
  const [capabilities, setCapabilities] = useState<PlannerCapabilitiesProjection | null>(null);
  const [capabilitiesReady, setCapabilitiesReady] = useState(false);

  // --- M3: sheet state migrated to PlannerSheetProvider ---
  // Local sheet state was removed in M3; `sheet` here is the provider
  // controller. Toasts remain Shell-owned for the create/edit one-shot.
  const [toast, setToast] = useState<string | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);

  // --- M3: planner sheet provider consumer (for create/edit open) ---
  const sheet = usePlannerSheet();

  // -------------------------------------------------------------------------
  // 3. Initial summary load + silent refresh on focus
  // -------------------------------------------------------------------------

  const loadSummary = useCallback(
    async (silent = false) => {
      if (!accessToken) return;

      if (!silent) setInitialLoading(true);
      setPlannerError(null);

      try {
        const nextSummary = await getPlannerSummary(accessToken);
        setSummary(nextSummary);
      } catch (err) {
        // Abort during household switch/unmount is NEVER surfaced as error UI.
        if (err instanceof Error && err.name === 'AbortError') return;
        const classified = classifyPlannerError(err);
        if (classified.class === 'abort') return;
        setPlannerError(classified);
      } finally {
        if (!silent) setInitialLoading(false);
      }
    },
    [accessToken],
  );

  const loadCapabilities = useCallback(async () => {
    const token = accessToken;
    const household = currentHousehold;
    if (!token || !household || !household.created_by) {
      setCapabilitiesReady(false);
      return;
    }
    try {
      const projection = await fetchPlannerCapabilitiesCached(token, {
        accountId: household.created_by,
        householdId: household.id,
        membershipId: household.created_by,
      });
      setCapabilities(projection);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Deny-safe: an error leaves projection null; `canViewPlanner` returns
      // `false` and the Shell renders the appropriate state.
      setCapabilities(null);
    } finally {
      setCapabilitiesReady(true);
    }
  }, [accessToken, currentHousehold]);

  useEffect(() => {
    void loadSummary();
    void loadCapabilities();
  }, [loadSummary, loadCapabilities]);

  // Pop route params on first mount (canonical tab from deep links etc).
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

    if (isPlannerTabKey(p.initialTab)) setActiveTab(p.initialTab);

    // M3: route param driven sheet open delegates to the provider rather than
    // the legacy local state. We don't re-fire if the sheet is already open.
    if (p.initialSheet === 'task') {
      sheet.openTaskForm({ source: 'planner' });
    } else if (p.initialSheet === 'event') {
      sheet.openEventForm({ source: 'planner' });
    }

    if (p.refreshKey) {
      setRefreshKey((value) => value + 1);
      void loadSummary(true);
    }

    navigation.setParams({
      initialTab: undefined,
      initialSheet: undefined,
      sheetKey: undefined,
      refreshKey: undefined,
    });
  }, [route.params?.initialTab, route.params?.initialSheet, route.params?.sheetKey, route.params?.refreshKey, loadSummary, navigation]);

  // Silent refresh when the screen regains focus (cross-screen changes).
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((value) => value + 1);
      void loadSummary(true);
    }, [loadSummary]),
  );

  // -------------------------------------------------------------------------
  // 4. Refresh — never replaces existing content; non-blocking indicator.
  // -------------------------------------------------------------------------

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((value) => value + 1);
    try {
      await loadSummary(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadSummary]);

  const changed = useCallback(() => {
    setRefreshKey((value) => value + 1);
    void loadSummary(true);
  }, [loadSummary]);

  // M3: when the planner sheet closes with reason 'success' (set by the host
  // after a Task/Event form saved), refresh the planner summary. We watch
  // `sheet.state` transitions from open to closed+success reason via a small
  // effect that diffs the previous state kind.
  const prevSheetKindRef = useRef(sheet.state.kind);
  useEffect(() => {
    const prev = prevSheetKindRef.current;
    const next = sheet.state.kind;
    if (prev !== 'closed' && next === 'closed') {
      // A sheet just closed — refresh the summary defensively. Real mutations
      // already invalidate cache via plannerCache; this keeps the Shell's
      // top-level numbers in sync without a global refetch.
      void loadSummary(true);
    }
    prevSheetKindRef.current = next;
  }, [sheet.state.kind, loadSummary]);

  const openTrash = useCallback(() => {
    navigation.navigate('PlannerTrash');
    setShowOverflow(false);
  }, [navigation]);

  // -------------------------------------------------------------------------
  // 5. Resolve canonical global state (single authority)
  // -------------------------------------------------------------------------

  const hasUsableContent = useMemo(() => {
    if (!summary) return false;
    return (
      summary.pending_tasks_count > 0 ||
      summary.today_tasks_count > 0 ||
      summary.overdue_tasks_count > 0 ||
      summary.awaiting_verification_count > 0 ||
      summary.upcoming_events_count > 0 ||
      (Array.isArray(summary.tasks_today) && summary.tasks_today.length > 0) ||
      (Array.isArray(summary.overdue_tasks) && summary.overdue_tasks.length > 0) ||
      (Array.isArray(summary.awaiting_verification_tasks) &&
        summary.awaiting_verification_tasks.length > 0) ||
      (Array.isArray(summary.upcoming_events) && summary.upcoming_events.length > 0)
    );
  }, [summary]);

  // Planner "empty" at the shell level means there is no summary error AND no
  // entities anywhere across tabs (per spec: shell empty only when truly no
  // usable Planner content — not when an individual tab is empty).
  const isEmpty = useMemo(() => {
    if (!summary) return true;
    return !hasUsableContent && summary.briefing_text?.length === 0;
  }, [summary, hasUsableContent]);

  const canView = useMemo(() => canViewPlanner(capabilities), [capabilities]);

  // Network reachability: cross-platform best-effort detection. We rely on
  // the existing `AppRefreshContext` not having reachability data, so the
  // Shell treats offline as derivable only from `ApiError` classification of
  // `plannerError`. That keeps the gate uniform across web/RN and avoids a
  // new net-info dependency.
  const isOffline = useMemo(() => {
    if (!plannerError) return false;
    return plannerError.class === 'offline';
  }, [plannerError]);

  const shellState: PlannerShellState = useMemo(
    () =>
      resolvePlannerShellState({
        authReady: Boolean(accessToken),
        householdReady: Boolean(currentHousehold),
        hasActiveHousehold: Boolean(currentHousehold),
        capabilitiesReady,
        canViewPlanner: canView,
        initialLoading,
        refreshing,
        hasUsableContent,
        isEmpty,
        isOffline,
        partialSections: undefined /* Per-tab failures flow defensively via tabs; not yet propagated to the Shell until M8 section-plane work */,
        error: plannerError,
      }),
    [
      accessToken,
      currentHousehold,
      capabilitiesReady,
      canView,
      initialLoading,
      refreshing,
      hasUsableContent,
      isEmpty,
      isOffline,
      plannerError,
    ],
  );

  const showActiveContent = shellStateShowsActiveContent(shellState);

  // -------------------------------------------------------------------------
  // 6. Render
  // -------------------------------------------------------------------------

  const handleRetry = useCallback(() => {
    void loadSummary();
    if (!capabilitiesReady) void loadCapabilities();
  }, [loadSummary, loadCapabilities, capabilitiesReady]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleGoBack = useCallback(() => {
    navigation.goBack?.();
  }, [navigation]);

  const handleOpenSettings = useCallback(() => {
    navigation.navigate('More');
  }, [navigation]);

  return (
    <PlannerErrorBoundary
      onExit={handleGoBack}
      exitLabel="Salir de Planner"
    >
      <SafeAreaView style={S.safe} edges={['top']}>
        <Modal
          visible={showOverflow}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOverflow(false)}
        >
          <Pressable
            style={S.overflowBackdrop}
            onPress={() => setShowOverflow(false)}
          >
            <Pressable style={S.overflowPanel} onPress={(e) => e.stopPropagation()}>
              <TouchableOpacity
                style={S.overflowItem}
                onPress={openTrash}
              >
                <HomePlusIcon name={APP_ICONS.planner.notes ?? 'trash-outline'} size={20} color={colors.text.primary} />
                <AppText variant="body" weight="600" style={{ marginLeft: 12, flex: 1 }}>Papelera</AppText>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <ScrollView
          style={S.scroll}
          contentContainerStyle={S.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {/* Header: title only — no slogan, no legacy stats, no Search */}
          <View style={[S.headerRow, { marginBottom: 8 }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="title1" accessibilityRole="header">Planner</AppText>
            </View>
            <TouchableOpacity
              style={S.overflowBtn}
              onPress={() => setShowOverflow(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Canonical tabs (single authority: PlannerTabKey from M1) */}
          <View
            style={S.topbarTabsContainer}
            accessibilityRole="tablist"
            importantForAccessibility="auto"
          >
            {PLANNER_TAB_KEYS.map((tabKey) => {
              const active = activeTab === tabKey;
              return (
                <TouchableOpacity
                  key={tabKey}
                  style={[S.topbarTab, active && S.topbarTabActive]}
                  onPress={() => setActiveTab(tabKey)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={tabLabel(tabKey)}
                >
                  <HomePlusIcon
                    name={tabIcon(tabKey)}
                    size={16}
                    color={active ? colors.terracotta[700] : colors.text.tertiary}
                  />
                  <AppText
                    variant="micro"
                    tone={active ? 'primary' : 'tertiary'}
                    weight={active ? '700' : '500'}
                    style={active ? S.topbarTabTextActive : S.topbarTabText}
                  >
                    {tabLabel(tabKey)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {toast ? (
            <View style={S.toastBox}>
              <HomePlusIcon name="checkmark-circle" size={18} color={colors.success.strong} />
              <AppText variant="bodySmall" tone="success" weight="700" style={{ flex: 1 }}>{toast}</AppText>
            </View>
          ) : null}

          {/* Shell-state chrome: full-screen state view when not active content */}
          {!showActiveContent ? (
            <PlannerStateView
              state={shellState}
              onRetry={handleRetry}
              onRefresh={handleRefresh}
              onGoBack={handleGoBack}
              onOpenSettings={handleOpenSettings}
            />
          ) : null}

          {/* Active tab content: rendered only when the shell allows it.
              `refreshing` over existing content keeps this subtree mounted. */}
          {showActiveContent && activeTab === 'tasks' ? (
            <PlannerTasksScreen
              refreshKey={refreshKey}
              onChanged={changed}
              onCreateTask={() => sheet.openTaskForm({ source: 'planner' })}
              onEditTask={(id) => sheet.openTaskForm({ mode: 'edit', taskId: id, source: 'planner' })}
              onShowToast={(msg) => {
                setToast(msg);
                setTimeout(() => setToast(null), 2200);
              }}
            />
          ) : null}

          {showActiveContent && activeTab === 'calendar' ? (
            <PlannerCalendarScreen
              refreshKey={refreshKey}
              onChanged={changed}
              onCreateEvent={(initialDate) =>
                sheet.openEventForm({ source: 'planner', initialDate })
              }
              onEditEvent={(eventId, context) =>
                sheet.openEventForm(
                  context?.isGeneratedRecurringOccurrence
                    ? {
                        mode: 'edit',
                        eventId,
                        source: 'planner',
                      }
                    : { mode: 'edit', eventId, source: 'planner' },
                )
              }
              onEditTask={(id) => sheet.openTaskForm({ mode: 'edit', taskId: id, source: 'planner' })}
              onCreateTask={(initialDueDate) =>
                sheet.openTaskForm({ source: 'planner', initialDueDate })
              }
              onShowToast={(msg) => {
                setToast(msg);
                setTimeout(() => setToast(null), 2200);
              }}
            />
          ) : null}

          {showActiveContent && activeTab === 'goals' ? (
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
      </SafeAreaView>
    </PlannerErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// 7. Tab metadata helpers
// ---------------------------------------------------------------------------

function tabLabel(key: PlannerTabKey): string {
  switch (key) {
    case 'tasks':
      return 'Tareas';
    case 'calendar':
      return 'Calendario';
    case 'goals':
      return 'Metas';
    default:
      return String(key);
  }
}

function tabIcon(key: PlannerTabKey): HomePlusIconName {
  switch (key) {
    case 'tasks':
      return APP_ICONS.planner.todo ?? 'checkbox';
    case 'calendar':
      return APP_ICONS.planner.calendar ?? 'calendar';
    case 'goals':
      return APP_ICONS.planner.goals ?? 'flag';
    default:
      return 'grid';
  }
}
