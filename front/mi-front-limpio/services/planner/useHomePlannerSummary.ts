/**
 * Planner V1 — M9 Home Summary Hook.
 *
 * Single request-owner for Home Planner data. Mirrors the cache/state model
 * defined by Core/M2 and is consumed by `HomePlannerSections`. The hook does
 * NOT emit separate requests for Tasks/Events/Goals/Calendar — those are owned
 * by the Planner tab, not by Home.
 *
 * Binding rules (frozen by the M9 prompt §Fase 4–Fase 6):
 *   - ONE `GET /api/planner/summary` request per Home load (mount/focus/refresh).
 *   - Cache scoped by household (`plannerKeys.summary(householdId)`).
 *   - Dedupe mount+focus+plannerChangedAt via an in-flight AbortController.
 *   - Quick Actions M4/M5 already invalidate Summary via `plannerCache`; the
 *     subscription fires and Home reacts.
 *   - Refresh manual = invalidate the summary key + a new single request.
 *   - Household switch → cancel in-flight, seal generation, ignore late
 *     success/error, clear optimistic patches (handled by M7 lifecycle).
 *   - Abort never surfaces as error. Parse failures surface a recoverable error
 *     and conserve the previously-known-good cache.
 *
 * States (closed model):
 *   initial_loading → ready | empty | partial | recoverable_error | forbidden
 *   refreshing (composes with ready/empty/partial; preserves content)
 *   offline_stale / offline_empty (cache present; transport failed)
 *
 * Out of scope:
 *   - Backend selection/ranking (M8 authority).
 *   - Mutation UI (owned by the one-tap completion adapter).
 *   - Lifecycle registration (owned by M7/Core).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHomePlannerSummary } from '../plannerSummary';
import { plannerCache } from './plannerCache';
import { plannerKeys } from './plannerKeys';
import { classifyPlannerError, isPlannerAbort } from './plannerErrorAdapter';
import {
  isHomeSummaryFreshEnough,
  type HomeSummaryPartialErrorSection,
  type PlannerHomeSummaryV1,
} from './homeSummaryTypes';
import { homeSummaryTelemetry } from './homeSummaryTelemetry';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useAppRefresh } from '../../context/AppRefreshContext';
import { ApiError } from '../api';

// ---------------------------------------------------------------------------
// State model (closed)
// ---------------------------------------------------------------------------

export type HomeSummaryStatus =
  | 'initial_loading'
  | 'ready'
  | 'empty'
  | 'refreshing'
  | 'partial'
  | 'offline_stale'
  | 'offline_empty'
  | 'recoverable_error'
  | 'forbidden';

export type HomeSummaryState = {
  readonly status: HomeSummaryStatus;
  readonly summary: PlannerHomeSummaryV1 | null;
  readonly partialErrors: readonly { section: HomeSummaryPartialErrorSection; code: string }[];
  /** Stable error code for telemetry / messaging; null when not an error. */
  readonly errorCode: string | null;
  /** Whether a refresh is pending (manual or invalidation-driven). */
  readonly refreshing: boolean;
};

const INITIAL_STATE: HomeSummaryState = {
  status: 'initial_loading',
  summary: null,
  partialErrors: [],
  errorCode: null,
  refreshing: false,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseHomePlannerSummaryResult = {
  readonly state: HomeSummaryState;
  /** Directed refresh: invalidate summary key + new single request. */
  readonly refresh: () => Promise<void>;
  /**
   * Opt-in subscribe to cache invalidations so Home can re-fetch when Quick
   * Actions M4/M5 invalidate Summary. Returns an unsubscribe.
   */
};

export function useHomePlannerSummary(): UseHomePlannerSummaryResult {
  const { session, authMe } = useAuth();
  const { currentHousehold } = useHousehold();
  const { plannerChangedAt } = useAppRefresh();
  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;
  const actorMembershipId = useMemo(() => {
    const active = authMe?.memberships.find(
      (m) => m.household_id === householdId && m.status === 'active',
    );
    return active?.id ?? null;
  }, [authMe?.memberships, householdId]);

  const [state, setState] = useState<HomeSummaryState>(INITIAL_STATE);
  const inflight = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const lastLoadedHousehold = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      inflight.current?.abort();
      inflight.current = null;
    };
  }, []);

  // Core loader. Always ONE request, AbortController-protected.
  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (!accessToken || !householdId) return;
    // Cancel any in-flight request (mount vs focus vs plannerChanged vs refresh).
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const scope = { householdId };

    if (mode === 'initial') {
      setState((prev) =>
        prev.summary && prev.summary.household_id === householdId
          ? { ...prev, status: 'refreshing', refreshing: true, errorCode: null }
          : { ...INITIAL_STATE, status: 'initial_loading' },
      );
    } else {
      // Preserve content during refresh; mark refreshing.
      setState((prev) => ({ ...prev, status: 'refreshing', refreshing: true, errorCode: null }));
    }

    const startedAt = Date.now();
    const summaryKey = plannerKeys.summary(scope);
    // Stale-while-refresh: serve cached first, then refetch. The cache is
    // owned here; we only inspect it for SWR, never write blindly.
    const cached = plannerCache.get<PlannerHomeSummaryV1>(summaryKey);
    if (cached && mode === 'initial' && lastLoadedHousehold.current !== householdId) {
      // Show cached immediately while we refetch.
      setState({
        status: cached.tasks.length === 0 && cached.events.length === 0 && cached.goal === null
          ? 'empty'
          : cached.partial_errors.length > 0 ? 'partial' : 'ready',
        summary: cached,
        partialErrors: cached.partial_errors,
        errorCode: null,
        refreshing: true,
      });
    }

    const result = await getHomePlannerSummary({
      accessToken,
      signal: controller.signal,
    });
    if (inflight.current !== controller || !mountedRef.current) {
      // Late response (household switch, unmount, or superseded). Ignore
      // silently — do NOT surface error or roll back cache.
      return;
    }
    const elapsed = Date.now() - startedAt;
    inflight.current = null;
    lastLoadedHousehold.current = householdId;

    if (!result.ok) {
      if (result.kind === 'parse') {
        // Contract failure: keep cache if healthy, surface recoverable error
        // (do NOT render partially untrusted payload).
        const previous = plannerCache.get<PlannerHomeSummaryV1>(summaryKey);
        const cachedHealthy =
          previous && isHomeSummaryFreshEnough(previous, householdId) ? previous : null;
        if (!mountedRef.current) return;
        setState({
          status: cachedHealthy ? 'offline_stale' : 'recoverable_error',
          summary: cachedHealthy,
          partialErrors: cachedHealthy?.partial_errors ?? [],
          errorCode: 'summary_parse_failed',
          refreshing: false,
        });
        homeSummaryTelemetry.completionFailed('summary_parse_failed', accessToken);
        return;
      }
      // Transport failure: classify.
      const classified = classifyPlannerError(result.error);
      const status: ApiError | undefined =
        classified.original instanceof ApiError ? classified.original : undefined;
      if (isPlannerAbort(result.error)) {
        // Abort is silent.
        if (!mountedRef.current) return;
        setState((prev) => ({ ...prev, refreshing: false }));
        return;
      }
      if (classified.class === 'forbidden' || status?.status === 403) {
        if (!mountedRef.current) return;
        setState({
          status: 'forbidden',
          summary: null,
          partialErrors: [],
          errorCode: classified.code ?? 'planner_forbidden',
          refreshing: false,
        });
        homeSummaryTelemetry.completionFailed(classified.code ?? 'planner_forbidden', accessToken);
        return;
      }
      // Offline/server/timeout: keep cache (stale) when available.
      const previous = plannerCache.get<PlannerHomeSummaryV1>(summaryKey);
      const cachedHealthy =
        previous && isHomeSummaryFreshEnough(previous, householdId) ? previous : null;
      if (!mountedRef.current) return;
      setState({
        status: cachedHealthy
          ? cachedHealthy.tasks.length === 0 && cachedHealthy.events.length === 0 && cachedHealthy.goal === null
            ? 'offline_empty'
            : 'offline_stale'
          : (classified.class === 'offline' ? 'offline_empty' : 'recoverable_error'),
        summary: cachedHealthy,
        partialErrors: cachedHealthy?.partial_errors ?? [],
        errorCode: classified.code ?? 'summary_transport_failed',
        refreshing: false,
      });
      homeSummaryTelemetry.completionFailed(
        classified.code ?? 'summary_transport_failed',
        accessToken,
      );
      return;
    }

    const summary = result.summary;
    // Write cache scoped by current household + context token.
    plannerCache.setForContext(summaryKey, summary, plannerCache.captureContextToken());

    const isEmpty =
      summary.tasks.length === 0 &&
      summary.events.length === 0 &&
      summary.goal === null &&
      summary.partial_errors.length === 0;
    const status: HomeSummaryStatus = summary.partial_errors.length > 0
      ? 'partial'
      : isEmpty
        ? 'empty'
        : 'ready';
    if (!mountedRef.current) return;
    setState({
      status,
      summary,
      partialErrors: summary.partial_errors,
      errorCode: null,
      refreshing: false,
    });

    if (summary.partial_errors.length > 0) {
      homeSummaryTelemetry.partial(
        summary.partial_errors.map((e) => e.section) as ('tasks' | 'events' | 'goals')[],
        elapsed,
        accessToken,
      );
    } else {
      homeSummaryTelemetry.loaded(elapsed, false, accessToken);
    }
  }, [accessToken, householdId]);

  // Mount + household change: initial load.
  useEffect(() => {
    if (!accessToken || !householdId) return;
    // Re-trigger when household changes: drop previous summary.
    if (lastLoadedHousehold.current && lastLoadedHousehold.current !== householdId) {
      setState({ ...INITIAL_STATE });
    }
    void load('initial');
  }, [accessToken, householdId, load]);

  // Focus listener: re-load via single request when the Home tab regains focus,
  // but only if the cache is stale (per SWR contract).
  // We use the plannerChangedAt signal from Quick Actions M4/M5 already.

  // React to plannerChangedAt: Quick Actions M4/M5 invalidate Summary via
  // plannerCache; we observe the plannerChangedAt tick and re-fetch ONCE.
  useEffect(() => {
    if (!accessToken || !householdId) return;
    if (plannerChangedAt <= 0) return;
    // Planner mutation invalidation drove the cache. We re-fetch a single
    // Summary request now.
    void load('refresh');
  }, [plannerChangedAt, accessToken, householdId, load]);

  const refresh = useCallback(async () => {
    if (!householdId) return;
    // Directed invalidation: ONLY summary key for this household, never global.
    plannerCache.invalidate(plannerKeys.summary({ householdId }));
    await load('refresh');
  }, [householdId, load]);

  return { state, refresh };
}
