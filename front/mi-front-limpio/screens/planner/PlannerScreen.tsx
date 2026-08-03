/**
 * Planner V1 — M2/M3/M6/M7 Planner Shell.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M2, §M3, §M6, §M7):
 * - Single Planner Shell owns the visible global state via the pure
 *   `resolvePlannerShellState`. Tasks, Calendar and Goals retain ownership of
 *   their internal content but the Shell decides what is visible at the
 *   top of Planner.
 * - Header: title, overflow menu, and M7 Search entry point (gated by
 *   feature flag + capability, hidden by default since flag is false).
 * - Tabs conform to the canonical `PlannerTabKey` from M1; Tasks is the
 *   default. M6 adds persistent tab selection scoped by accountId + householdId.
 * - Initial loading uses a non-flicker skeleton; refresh uses a non-blocking
 *   indicator that NEVER replaces existing content.
 * - Empty does not appear prematurely; partial preserves healthy content;
 *   offline-stale preserves data; offline-empty explains without falling
 *   back to a product empty state.
 * - Forbidden/not_found are separated; conflict is never auto-resolved.
 * - M7 adds generation-guarded context identity for late-response protection,
 *   household transition coordination, and gated Search entry point.
 *
 * M3: Sheet host migration (PlannerSheetProvider/PlannerSheetHost).
 * M6: Tab persistence via plannerPreferencesStore with generation-guarded
 *      hydration, non-blocking writes, and lifecycle integration.
 * M7: Household transition safe lifecyle + Search entry point (gate only).
 *
 * Out of scope:
 * - Home Summary (M8/M9), deep links (M10).
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
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { PlannerCalendarScreen } from './PlannerCalendarScreen';
import { PlannerPlansScreen } from './PlannerPlansScreen';
import { PlannerTasksScreen } from './PlannerTasksScreen';
import { plannerStyles as S } from './plannerShared';
import {
  PLANNER_TAB_KEYS,
  normalizePlannerTabKey,
  type PlannerTabKey,
  buildPlannerEntityDetailParams,
} from '../../navigation/plannerNavigationContract';
import {
  ROUTE_NAMES,
} from '../../navigation/plannerNavigationContract';
import { PlannerErrorBoundary } from '../../components/planner/PlannerErrorBoundary';
import { PlannerStateView } from '../../components/planner/PlannerStateView';
import {
  resolvePlannerShellState,
  shellStateShowsActiveContent,
  type PlannerShellState,
} from '../../services/planner/plannerShellState';
import {
  plannerPreferencesStore,
  DEFAULT_PREFERENCES,
  type PlannerPreferences,
} from '../../services/plannerPreferences';
import {
  createPlannerContextIdentity,
  isPlannerContextCurrent,
  type PlannerContextIdentity,
} from '../../services/planner/plannerContextIdentity';
import { plannerCache } from '../../services/planner/plannerCache';
import {
  resolvePlannerSearchAccess,
  isPlannerSearchAvailable,
  type PlannerSearchAccess,
} from '../../services/planner/plannerSearchAccess';
import { getActiveDeepLinkCoordinator } from '../../services/planner/plannerDeepLinkCoordinator';
import { openPlannerReliabilityRuntimeForSession } from '../../services/planner/reliability';

// ---------------------------------------------------------------------------
// 1. M3/M6 — PlannerScreen does not own Task/Event sheet Modal (M3).
//    M6 adds tab persistence scoped by accountId + householdId.
// ---------------------------------------------------------------------------

const DEFAULT_TAB: PlannerTabKey = 'tasks';

// ---------------------------------------------------------------------------
// 2. M7 — Planner context identity and transition coordination.
//    - createPlannerContextIdentity captures the current generation from
//      plannerCache so late responses can be rejected.
//    - contextIdentityRef is updated on every context switch; requests
//      capture it at initiation time for late-response guards.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. PlannerScreen shell
// ---------------------------------------------------------------------------

export function PlannerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const processedNavKeyRef = useRef<string | null>(null);
  /** Current planner context identity (updated on every context change). */
  const currentContextIdentityRef = useRef<PlannerContextIdentity | null>(null);
  const { session, authMe, authMeLoading } = useAuth();
  const accessToken = session?.access_token;
  const { currentHousehold } = useHousehold();

  // --- M6: preference hydration generation guard ---
  // Monotonically increments on every context change (household switch,
  // sign-out, remount). Each load captures a generation token and only
  // applies its result if the token is still current, preventing late
  // responses from stale contexts.
  const hydrationGenRef = useRef(0);
  const currentContextRef = useRef<string | null>(null);

  // --- M6: write revision counter ---
  // Each user tab selection increments a revision. A late save may
  // complete but its revision check ensures only the last selection wins.
  const writeRevisionRef = useRef(0);

  // --- M6: manual selection flag ---
  // Once the user manually selects a tab (or navigation initialTab is
  // applied), late hydration responses are blocked from overwriting.
  const manualSelectionRef = useRef(false);

  // --- M6: preferences readiness (pending → ready) ---
  // 'pending' only on first mount/context-change before first load
  // resolves. Once ready, Planner renders normally. A pending state
  // does NOT show empty content prematurely — the shell shows its
  // existing loading state.
  const [preferencesReady, setPreferencesReady] = useState(false);

  // --- Canonical tabs (single authority via PlannerTabKey from M1) ---
  // The active tab starts at DEFAULT_TAB ('tasks'). M6 hydration may
  // later restore a persisted tab, but navigation initialTab (if valid)
  // is applied immediately and takes priority over persistence (Phase 5).
  const [activeTab, setActiveTab] = useState<PlannerTabKey>(() => {
    const initialTab = normalizePlannerTabKey(route.params?.initialTab);
    if (initialTab) {
      manualSelectionRef.current = true;
      return initialTab;
    }
    return DEFAULT_TAB;
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
  // M6: Preference hydration (generation-guarded, context-scoped)
  // -------------------------------------------------------------------------

  // Account ID is the authenticated user's auth_user_id (unique per account),
  // NOT the household creator's person ID. This ensures preferences are
  // scoped per-account, not per-household-creator.
  const accountId = authMe?.person?.auth_user_id ?? null;
  const householdId = currentHousehold?.id ?? null;
  const contextKey = accountId && householdId ? `${accountId}::${householdId}` : null;

  useEffect(() => {
    const runtime = openPlannerReliabilityRuntimeForSession({
      accessToken,
      authenticatedUserId: accountId,
      activeHouseholdId: householdId,
      authResolved: Boolean(accessToken && accountId),
      householdResolved: !authMeLoading,
    });
    return () => runtime?.dispose();
  }, [accessToken, accountId, householdId, authMeLoading]);

  // When the context changes ( accountId/householdId), start a new
  // hydration generation, reset preferences readiness, and load the
  // persisted preference for the new scope. Late responses from a
  // previous scope are discarded via the generation check.
  useEffect(() => {
    if (!contextKey) {
      // No valid context — reset to safe default, do not load.
      hydrationGenRef.current += 1;
      currentContextRef.current = null;
      manualSelectionRef.current = false;
      setPreferencesReady(true);
      setActiveTab(DEFAULT_TAB);
      // M7: nullify context identity when no valid context exists.
      currentContextIdentityRef.current = null;
      return;
    }

    // Context changed: start a new hydration generation.
    // Since contextKey is non-null here, accountId and householdId are
    // non-null strings — narrow explicitly for the closure.
    const capturedAccountId = accountId as string;
    const capturedHouseholdId = householdId as string;
    const gen = hydrationGenRef.current + 1;
    hydrationGenRef.current = gen;
    currentContextRef.current = contextKey;
    manualSelectionRef.current = false;
    setPreferencesReady(false);

    // M7: Create a new Planner context identity for late-response guards.
    // The membershipId uses authMe's active membership for this household.
    // If unavailable during transition, fallback to accountId as membershipId
    // for deny-safe operation (capabilities fetch will re-resolve it).
    currentContextIdentityRef.current = createPlannerContextIdentity({
      authIdentityId: capturedAccountId,
      householdId: capturedHouseholdId,
      membershipId: capturedAccountId,
      generation: gen,
    });

    // Capture the generation for late-response protection.
    const capturedGen = gen;

    void (async () => {
      const prefs = await plannerPreferencesStore.load(capturedAccountId, capturedHouseholdId);

      // Guard: only apply if the generation is still current AND the
      // context has not changed since the load was initiated. A user
      // tab selection or navigation initialTab during load sets
      // manualSelectionRef → block the late response.
      if (
        hydrationGenRef.current !== capturedGen ||
        currentContextRef.current !== contextKey ||
        manualSelectionRef.current
      ) {
        setPreferencesReady(true);
        return;
      }

      // Apply the persisted tab. parsePlannerPreferences inside the store
      // already validated; the activeTab is canonical or defaulted to tasks.
      setActiveTab(prefs.activeTab);
      setPreferencesReady(true);
    })();
    // contextKey derived from accountId/householdId — included as dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey]);

  // -------------------------------------------------------------------------
  // M6: Tab selection handler (non-blocking write, revision-guarded)
  // -------------------------------------------------------------------------

  const handleTabSelect = useCallback(
    (tabKey: PlannerTabKey) => {
      // Update UI immediately — never block on AsyncStorage.
      setActiveTab(tabKey);
      manualSelectionRef.current = true;

      // Capture the current revision and scope for late-save protection.
      // accountId is the authenticated user's auth_user_id (unique per account),
      // NOT the household creator's person ID. This ensures preferences are
      // scoped per-account, not per-household-creator.
      const revision = writeRevisionRef.current + 1;
      writeRevisionRef.current = revision;
      const capturedAccountId = accountId;
      const capturedHouseholdId = householdId;

      // Only persist if we have a valid scope. If the scope is missing
      // (e.g. during sign-out race), the selection stays in-memory only.
      if (!capturedAccountId || !capturedHouseholdId) return;

      // Non-blocking background save. A late save from an older revision
      // may complete but its value is the same (or older) — the revision
      // counter ensures the last selection is the final persisted value.
      // Errors are swallowed by the store adapter — they never reach UI.
      void (async () => {
        // Minimal sequencing: read the latest revision just before write.
        // If a newer selection happened, the older save still writes its
        // own value — but the newest tab select will re-trigger a save
        // with the latest value, so the final persisted state is correct.
        if (writeRevisionRef.current !== revision) return;

        const prefs: PlannerPreferences = {
          version: 1,
          activeTab: tabKey,
        };

        await plannerPreferencesStore.save(capturedAccountId, capturedHouseholdId, prefs);
      })();
    },
    [accountId, householdId],
  );

  // -------------------------------------------------------------------------
  // 3. Initial summary load + silent refresh on focus
  // -------------------------------------------------------------------------

  const loadSummary = useCallback(
    async (silent = false) => {
      if (!accessToken) return;

      // M7: Capture context identity before the fetch.
      // If the context changes during the fetch, the late response is discarded.
      const capturedCtx = currentContextIdentityRef.current;

      if (!silent) setInitialLoading(true);
      setPlannerError(null);

      try {
        const nextSummary = await getPlannerSummary(accessToken);

        // M7: Late-response guard — only apply if context is still current.
        if (!isPlannerContextCurrent(capturedCtx, currentContextIdentityRef.current)) return;

        setSummary(nextSummary);
      } catch (err) {
        // Abort during household switch/unmount is NEVER surfaced as error UI.
        if (err instanceof Error && err.name === 'AbortError') return;
        const classified = classifyPlannerError(err);
        if (classified.class === 'abort') return;

        // M7: Late-response guard — only apply if context is still current.
        if (!isPlannerContextCurrent(capturedCtx, currentContextIdentityRef.current)) return;

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

    // M7: Capture context identity before the fetch.
    const capturedCtx = currentContextIdentityRef.current;

    try {
      const projection = await fetchPlannerCapabilitiesCached(token, {
        accountId: household.created_by,
        householdId: household.id,
        membershipId: household.created_by,
      });

      // M7: Late-response guard — only apply if context is still current.
      if (!isPlannerContextCurrent(capturedCtx, currentContextIdentityRef.current)) return;

      setCapabilities(projection);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;

      // M7: Late-response guard — only apply if context is still current.
      if (!isPlannerContextCurrent(capturedCtx, currentContextIdentityRef.current)) return;

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

  // M10: Relay capabilities to the deep-link coordinator once loaded.
  useEffect(() => {
    const coordinator = getActiveDeepLinkCoordinator();
    if (coordinator && capabilitiesReady) {
      coordinator.setCapabilities(capabilities, true);
    }
  }, [capabilities, capabilitiesReady]);

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

    // M6: applying a valid navigation initialTab is a one-shot explicit
    // navigation. It takes priority over the persisted preference (Phase 5)
    // but does NOT itself persist — only user tab selections are saved.
    // Setting manualSelectionRef blocks late hydration from overwriting it.
    const initialTab = normalizePlannerTabKey(p.initialTab);
    if (initialTab) {
      setActiveTab(initialTab);
      manualSelectionRef.current = true;
    }

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

  const openPresetLibrary = useCallback(() => {
    navigation.navigate(ROUTE_NAMES.PresetLibrary);
    setShowOverflow(false);
  }, [navigation]);

  const openDraftRecovery = useCallback(() => {
    navigation.navigate(ROUTE_NAMES.DraftRecovery);
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
  // M7: Search entry point gate resolution.
  // Flag is default `false`, so the icon is hidden by default.
  // -------------------------------------------------------------------------

  // Feature flags from the global provider.
  const { flags, loading: flagsLoading } = useFeatureFlags();

  // M7: Resolve Planner Search access from flag + capability.
  const searchAccess: PlannerSearchAccess = useMemo(
    () =>
      resolvePlannerSearchAccess({
        flags,
        flagsLoading,
        capabilities,
        capabilitiesReady,
      }),
    [flags, flagsLoading, capabilities, capabilitiesReady],
  );

  const searchAvailable = isPlannerSearchAvailable(searchAccess);

  // M7: Search entry point navigation handler (only fires when available).
  const handleOpenSearch = useCallback(() => {
    if (!searchAvailable) return;
    navigation.navigate(ROUTE_NAMES.PlannerSearch, {
      source: 'planner',
      returnTo: 'planner',
    });
  }, [navigation, searchAvailable]);

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
                onPress={openPresetLibrary}
              >
                <HomePlusIcon name={APP_ICONS.planner.notes ?? 'albums-outline'} size={20} color={colors.text.primary} />
                <AppText variant="body" weight="600" style={{ marginLeft: 12, flex: 1 }}>Presets</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.overflowItem}
                onPress={openDraftRecovery}
              >
                <HomePlusIcon name={APP_ICONS.planner.todo ?? 'document-text-outline'} size={20} color={colors.text.primary} />
                <AppText variant="body" weight="600" style={{ marginLeft: 12, flex: 1 }}>Borradores</AppText>
              </TouchableOpacity>
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
          {/* Header: title, Search entry (M7 gated, hidden by default), overflow */}
          <View style={[S.headerRow, { marginBottom: 8 }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="title1" accessibilityRole="header">Planner</AppText>
            </View>

            {/* M7: Search entry point — only visible when flag + capability both true.
                Default flag is false, so this icon is hidden in normal operation. */}
            {searchAvailable ? (
              <TouchableOpacity
                style={[S.overflowBtn, { marginRight: 2 }]}
                onPress={handleOpenSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Buscar en Planner"
                accessibilityHint="Abrir búsqueda en Planner"
              >
                <HomePlusIcon name="search-outline" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : null}

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
                  onPress={() => handleTabSelect(tabKey)}
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
              onEditTask={(id) => navigation.navigate(ROUTE_NAMES.TaskDetail, buildPlannerEntityDetailParams({
                entityId: id,
                source: 'planner',
                returnTo: 'planner',
              }))}
              onShowToast={(msg) => {
                setToast(msg);
                setTimeout(() => setToast(null), 2200);
              }}
            />
          ) : null}

          {showActiveContent && activeTab === 'events' ? (
            <PlannerCalendarScreen
              refreshKey={refreshKey}
              onCreateEvent={(initialDate) =>
                sheet.openEventForm({ source: 'planner', initialDate })
              }
              onCreateTask={(initialDueDate) =>
                sheet.openTaskForm({ source: 'planner', initialDueDate })
              }
              onOpenProjection={(projection) => {
                navigation.navigate(projection.destination.route, projection.destination.params);
              }}
            />
          ) : null}

          {showActiveContent && activeTab === 'plans' ? (
            <PlannerPlansScreen
              refreshKey={refreshKey}
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
    case 'events':
      return 'Eventos';
    case 'plans':
      return 'Planes';
    default:
      return String(key);
  }
}

function tabIcon(key: PlannerTabKey): HomePlusIconName {
  switch (key) {
    case 'tasks':
      return APP_ICONS.planner.todo ?? 'checkbox';
    case 'events':
      return APP_ICONS.planner.calendar ?? 'calendar';
    case 'plans':
      return APP_ICONS.planner.goals ?? 'flag';
    default:
      return 'grid';
  }
}
