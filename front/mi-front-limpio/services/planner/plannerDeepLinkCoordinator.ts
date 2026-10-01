/**
 * Planner V1 — M10 Deep Link Coordinator (single runtime authority).
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M10):
 * - Single owner for receiving Planner deep-link URLs, parsing them into
 *   PlannerDeepLinkIntent, deduplicating, waiting for readiness gates
 *   (navigation, auth, household, capabilities), and navigating exactly once.
 * - One-shot consumption: consumed intents are removed; never re-execute.
 * - Generation-guarded: invalidates intents when context changes.
 * - Cleans up on sign-out and account switch.
 *
 * Binding rules:
 * - Does NOT replace React Navigation.
 * - Does NOT create a parallel router.
 * - Does NOT persist URLs or entity payloads.
 * - Does NOT load full entities (detail screens do that).
 * - Does NOT replace HouseholdContext or AuthContext.
 * - Does NOT accept householdId from URL as authority.
 * - Does NOT implement Search productiva.
 *
 * Architecture:
 *   URL received → parse → dedupe → validate → normalize
 *   → resolve session → resolve active household → resolve capabilities
 *   → navigate once → mark consumed → remove intent
 */

/**
 * Module-level active coordinator reference. Set by PlannerDeepLinkProvider
 * on mount and cleared on unmount. This allows PlannerScreen to relay
 * capabilities without prop drilling or context overhead.
 */
let activeCoordinator: PlannerDeepLinkCoordinator | null = null;
export function setActiveDeepLinkCoordinator(coordinator: PlannerDeepLinkCoordinator | null): void {
  activeCoordinator = coordinator;
}
export function getActiveDeepLinkCoordinator(): PlannerDeepLinkCoordinator | null {
  return activeCoordinator;
}

import type { PlannerNavigation } from '../../navigation/plannerNavigationHelpers';
import type { PlannerDeepLinkIntent, DeepLinkFingerprint, DeepLinkResolutionResult, DeepLinkIntentState, DeepLinkRejectionReason, DeepLinkResolutionContext } from './plannerDeepLinkTypes';
import {
  createDeepLinkFingerprint,
  isSameDeepLinkFingerprint,
  isEntityDetailIntent,
  extractDetailEntityId,
  normalizePlannerDeepLinkIntent,
} from './plannerDeepLinkTypes';
import { parsePlannerDeepLink, validatePlannerDeepLinkIntent, configureDeepLinkPrefixes, type DeepLinkParseResult } from './plannerDeepLinkParser';
import { type PlannerSearchAccess, resolvePlannerSearchAccess, isPlannerSearchAvailable } from './plannerSearchAccess';
import { type PlannerContextIdentity, isPlannerContextCurrent, nullPlannerContextIdentity } from './plannerContextIdentity';
import { type HomePlusFeatureFlags } from '../core/featureFlagStore';
import { isPlannerTabKey, normalizePlannerNavigationSource, type PlannerNavigationSource, type PlannerTabKey } from '../../navigation/plannerNavigationContract';

// ---------------------------------------------------------------------------
// 1. Coordinator type
// ---------------------------------------------------------------------------

/**
 * The single Planner deep-link coordinator. Created when the app is ready,
 * destroyed on sign-out.
 *
 * Responsibilities:
 * - `receiveUrl(urlString, source)`: parse → dedupe → enqueue → resolve when ready.
 * - `setNavigationReady(navigation)`: inject navigation reference for resolution.
 * - `setCapabilities(projection, ready)`: inject capability projection.
 * - `setFlags(projection, loading)`: inject feature flag projection.
 * - `setContextIdentity(identity)`: inject current Planner context.
 * - `dispose()`: cleanup all pending intents (sign-out, account switch).
 */
export type PlannerDeepLinkCoordinator = {
  /** Receive a raw URL from Linking event or notification adapter. */
  receiveUrl(urlString: string, source?: PlannerNavigationSource): DeepLinkResolutionResult;
  /** Directly enqueue an already-parsed intent (e.g. from notification adapter). */
  receiveIntent(intent: PlannerDeepLinkIntent): DeepLinkResolutionResult;
  /** Set the navigation reference — gates marked ready when non-null. */
  setNavigationReady(navigation: PlannerNavigation | null): void;
  /** Set the current Planner context identity. Null on sign-out. */
  setContextIdentity(identity: PlannerContextIdentity | null): void;
  /** Set capability projection for gate evaluation. */
  setCapabilities(capabilities: Record<string, boolean> | null | undefined, ready: boolean): void;
  /** Set feature flag projection. */
  setFlags(flags: Record<string, boolean> | null | undefined, loading: boolean): void;
  /** Set the session/authMe readiness state. */
  setAuthReady(ready: boolean): void;
  /** Set the household readiness state. */
  setHouseholdReady(ready: boolean): void;
  /** Dispose and clear all pending/remaining intents. */
  dispose(): void;
  /** Persist a deferred intent for continuation after login/onboarding. */
  persistPendingIntent(): PlannerDeepLinkIntent | null;
  /** Load the persisted deferred intent (called after login completes). */
  loadDeferredIntent(): PlannerDeepLinkIntent | null;
};

// ---------------------------------------------------------------------------
// 2. Internal state tracking
// ---------------------------------------------------------------------------

type IntentEntry = {
  intent: PlannerDeepLinkIntent;
  state: DeepLinkIntentState;
  fingerprint: DeepLinkFingerprint;
  /** Context captured when the intent was enqueued. */
  capturedContext: DeepLinkResolutionContext | null;
};

// ---------------------------------------------------------------------------
// 3. Factory
// ---------------------------------------------------------------------------

/**
 * Creates a PlannerDeepLinkCoordinator.
 *
 * @param options.prefixes — allowed URL prefixes (from physical linking config).
 * @param options.dedupWindowMs — time window for dedup fingerprint matching (default 2000ms).
 */
export function createPlannerDeepLinkCoordinator(options?: {
  prefixes?: string[];
  hosts?: string[];
  dedupWindowMs?: number;
}): PlannerDeepLinkCoordinator {
  if (options?.prefixes) {
    configureDeepLinkPrefixes(options.prefixes, options.hosts);
  }

  const DEDUP_WINDOW_MS = options?.dedupWindowMs ?? 2000;
  let disposed = false;
  let navigation: PlannerNavigation | null = null;
  let contextIdentity: PlannerContextIdentity | null = null;
  let capabilities: Record<string, boolean> | null | undefined = null;
  let capabilitiesReady = false;
  let flags: HomePlusFeatureFlags | null | undefined = null;
  let flagsLoading = true;
  let authReady = false;
  let householdReady = false;
  let deferredIntent: PlannerDeepLinkIntent | null = null;

  /** Active intents tracked for dedup (not consumed yet). */
  const intentEntries: IntentEntry[] = [];

  /** Recently consumed fingerprints with timestamp for dedup. */
  const recentFingerprints: Array<{ fingerprint: DeepLinkFingerprint; consumedAt: number }> = [];

  // -------------------------------------------------------------------------
  // 3.1 Dedup check
  // -------------------------------------------------------------------------
  function checkDedup(fingerprint: DeepLinkFingerprint): boolean {
    const now = Date.now();

    // Check active entries (not yet consumed).
    for (const entry of intentEntries) {
      if (isSameDeepLinkFingerprint(entry.fingerprint, fingerprint)) {
        return true; // Duplicate active intent.
      }
    }

    // Check recently consumed fingerprints within window.
    // Cleanup expired entries while checking.
    let i = recentFingerprints.length;
    while (i--) {
      const rec = recentFingerprints[i];
      if (now - rec.consumedAt > DEDUP_WINDOW_MS) {
        recentFingerprints.splice(i, 1);
        continue;
      }
      if (isSameDeepLinkFingerprint(rec.fingerprint, fingerprint)) {
        return true; // Duplicate within window.
      }
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // 3.2 Readiness check
  // -------------------------------------------------------------------------
  function checkReadiness(intent: PlannerDeepLinkIntent): DeepLinkResolutionResult {
    // Navigation must be available.
    if (!navigation) {
      return { outcome: 'deferred', intent };
    }

    // Auth must be resolved.
    if (!authReady) {
      return { outcome: 'deferred', intent };
    }

    // Context must be resolved.
    if (!contextIdentity) {
      // If auth is ready but no context, household might not be resolved yet.
      if (!householdReady) {
        return { outcome: 'deferred', intent };
      }
      if (!authReady) {
        return { outcome: 'rejected', reason: 'auth_required', intent };
      }
      return { outcome: 'deferred', intent };
    }

    // Household must be ready (implied by context identity).
    if (!householdReady) {
      return { outcome: 'deferred', intent };
    }

    // If capabilities/flags are loading and intention is Search, defer.
    if (intent.kind === 'planner_search') {
      if (flagsLoading || !capabilitiesReady) {
        return { outcome: 'deferred', intent };
      }

      // Check Search gate.
      const access = resolvePlannerSearchAccess({
        flags,
        flagsLoading,
        capabilities,
        capabilitiesReady,
      });

      if (!isPlannerSearchAvailable(access)) {
        if (access.kind === 'disabled') {
          return { outcome: 'rejected', reason: 'feature_disabled', intent };
        }
        return { outcome: 'rejected', reason: 'forbidden', intent };
      }
    }

    // For entity detail intents, detail screen resolves access from backend;
    // the coordinator only navigates to the screen.
    return { outcome: 'navigated', intent };
  }

  // -------------------------------------------------------------------------
  // 3.3 Execution (navigation)
  // -------------------------------------------------------------------------
  function executeNavigation(intent: PlannerDeepLinkIntent): DeepLinkResolutionResult {
    if (!navigation) {
      return { outcome: 'rejected', reason: 'navigation_unavailable', intent };
    }

    switch (intent.kind) {
      case 'planner_root': {
        const source = normalizePlannerNavigationSource(intent.source);
        const tab = intent.initialTab && isPlannerTabKey(intent.initialTab)
          ? intent.initialTab as PlannerTabKey
          : undefined;

        navigation.navigate('PlannerTab', {
          screen: 'PlannerHome',
          params: { initialTab: tab, source },
        });
        return { outcome: 'navigated', intent };
      }

      case 'task_detail': {
        if (!intent.entityId) return { outcome: 'rejected', reason: 'invalid_entity_id', intent };
        navigation.navigate('PlannerTab', {
          screen: 'TaskDetail',
          params: { entityId: intent.entityId, source: intent.source, returnTo: 'previous' },
        });
        return { outcome: 'navigated', intent };
      }

      case 'event_detail': {
        if (!intent.entityId) return { outcome: 'rejected', reason: 'invalid_entity_id', intent };
        navigation.navigate('PlannerTab', {
          screen: 'EventDetail',
          params: { entityId: intent.entityId, source: intent.source, returnTo: 'previous' },
        });
        return { outcome: 'navigated', intent };
      }

      case 'goal_detail': {
        if (!intent.entityId) return { outcome: 'rejected', reason: 'invalid_entity_id', intent };
        navigation.navigate('PlannerTab', {
          screen: 'GoalDetail',
          params: { entityId: intent.entityId, source: intent.source, returnTo: 'previous' },
        });
        return { outcome: 'navigated', intent };
      }

      case 'planner_search': {
        navigation.navigate('PlannerTab', {
          screen: 'PlannerSearch',
          params: { source: intent.source, returnTo: 'planner' },
        });
        return { outcome: 'navigated', intent };
      }

      default:
        return { outcome: 'rejected', reason: 'unsupported_route', intent };
    }
  }

  // -------------------------------------------------------------------------
  // 3.4 Intent lifecycle management
  // -------------------------------------------------------------------------
  function enqueueIntent(intent: PlannerDeepLinkIntent): DeepLinkResolutionResult {
    // Normalize.
    const normalized = normalizePlannerDeepLinkIntent(intent);

    // Validate.
    const validation = validatePlannerDeepLinkIntent(normalized);
    if (!validation.ok) {
      return { outcome: 'rejected', reason: validation.reason as DeepLinkRejectionReason, intent: normalized };
    }

    // Dedup check.
    const fingerprint = createDeepLinkFingerprint(normalized);
    if (checkDedup(fingerprint)) {
      return { outcome: 'duplicate', fingerprint };
    }

    // Create entry.
    const entry: IntentEntry = {
      intent: normalized,
      state: 'waiting',
      fingerprint,
      capturedContext: contextIdentity
        ? {
            accountIdentityId: contextIdentity.authIdentityId,
            householdId: contextIdentity.householdId,
            generation: contextIdentity.generation,
          }
        : null,
    };
    intentEntries.push(entry);

    // Attempt resolution immediately.
    return resolveIntent(entry);
  }

  function resolveIntent(entry: IntentEntry): DeepLinkResolutionResult {
    if (entry.state !== 'waiting') {
      return { outcome: 'rejected', reason: 'unknown', intent: entry.intent };
    }

    // Check readiness.
    const readiness = checkReadiness(entry.intent);
    if (readiness.outcome === 'deferred') {
      return readiness; // Still waiting — will retry when ready.
    }
    if (readiness.outcome === 'rejected') {
      // Discard.
      removeEntry(entry);
      return readiness;
    }

    // Mark resolving.
    entry.state = 'resolving';

    // Execute navigation.
    const result = executeNavigation(entry.intent);

    // Mark consumed or discarded.
    if (result.outcome === 'navigated') {
      entry.state = 'consumed';
      // Record fingerprint for dedup window.
      recentFingerprints.push({ fingerprint: entry.fingerprint, consumedAt: Date.now() });
      removeEntry(entry);
    } else {
      entry.state = 'discarded';
      removeEntry(entry);
    }

    return result;
  }

  function removeEntry(entry: IntentEntry): void {
    const idx = intentEntries.indexOf(entry);
    if (idx >= 0) {
      intentEntries.splice(idx, 1);
    }
  }

  function retryAllPending(): DeepLinkResolutionResult[] {
    const results: DeepLinkResolutionResult[] = [];

    // Context validity check: only resolve if context matches.
    for (const entry of intentEntries) {
      if (entry.state !== 'waiting') continue;

      // If context changed (generation mismatch, account or household changed),
      // discard the intent.
      if (entry.capturedContext && contextIdentity) {
        const ctx = entry.capturedContext;
        if (
          ctx.accountIdentityId !== contextIdentity.authIdentityId ||
          ctx.householdId !== contextIdentity.householdId ||
          ctx.generation !== contextIdentity.generation
        ) {
          entry.state = 'discarded';
          results.push({ outcome: 'rejected', reason: 'generation_changed', intent: entry.intent });
          removeEntry(entry);
          continue;
        }
      }

      const result = resolveIntent(entry);
      if (result.outcome === 'navigated' || result.outcome === 'rejected') {
        removeEntry(entry);
        results.push(result);
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // 3.5 Public API
  // -------------------------------------------------------------------------
  const coordinator: PlannerDeepLinkCoordinator = {
    receiveUrl(urlString, source?) {
      if (disposed) return { outcome: 'rejected', reason: 'session_cleared' };

      const parseResult = parsePlannerDeepLink(urlString, source);
      if (!parseResult.ok) {
        return { outcome: 'rejected', reason: parseResult.reason as DeepLinkRejectionReason };
      }

      return this.receiveIntent(parseResult.intent);
    },

    receiveIntent(intent) {
      if (disposed) return { outcome: 'rejected', reason: 'session_cleared' };

      // Check readiness for immediate path.
      if (!authReady) {
        // Persist intent for post-login continuation.
        deferredIntent = intent;
        return { outcome: 'deferred', intent };
      }

      return enqueueIntent(intent);
    },

    setNavigationReady(nav) {
      navigation = nav;
      if (nav && authReady && householdReady && contextIdentity) {
        retryAllPending();
      }
    },

    setContextIdentity(identity) {
      const prev = contextIdentity;
      contextIdentity = identity;

      if (identity) {
        // Context just became available — retry pending.
        retryAllPending();

        // If there was a deferred intent, try to consume it now.
        if (deferredIntent) {
          const deferred = deferredIntent;
          deferredIntent = null;
          this.receiveIntent(deferred);
        }
      } else {
        // Context cleared (sign-out). Discard everything.
        deferredIntent = null;
        for (const entry of intentEntries) {
          entry.state = 'discarded';
        }
        intentEntries.length = 0;
      }
    },

    setCapabilities(caps, ready) {
      capabilities = caps;
      capabilitiesReady = ready;
      if (ready) retryAllPending();
    },

    setFlags(flg, loading) {
      flags = flg ?? {};
      flagsLoading = loading;
      if (!loading) retryAllPending();
    },

    setAuthReady(ready) {
      authReady = ready;
      if (ready) retryAllPending();
    },

    setHouseholdReady(ready) {
      householdReady = ready;
      if (ready) retryAllPending();
    },

    persistPendingIntent() {
      return deferredIntent;
    },

    loadDeferredIntent() {
      const deferred = deferredIntent;
      deferredIntent = null;
      return deferred;
    },

    dispose() {
      disposed = true;
      deferredIntent = null;
      for (const entry of intentEntries) {
        entry.state = 'discarded';
      }
      intentEntries.length = 0;
      recentFingerprints.length = 0;
      navigation = null;
      contextIdentity = null;
    },
  };

  return coordinator;
}