/**
 * Planner V1 — M2 Canonical Shell State Model & Pure Resolver.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M2):
 * - Single typed authority for the visible global state of the Planner shell.
 * - Discriminated union closed under TypeScript (impossible states not
 *   representable).
 * - A pure resolver that consumes typed inputs (no React, no I/O, no side
 *   effects) and returns ONE `PlannerShellState`. The resolver never fires
 *   requests, never navigates, never mutates cache, and never inspects visual
 *   concerns.
 * - Deterministic priority ordering documented in §Priority.
 *
 * Binding rules:
 * - `refreshing` does NOT replace existing content.
 * - `offline_stale` (with previous data) is distinct from `offline_empty`.
 * - `partial` is not auto-promoted to a full error.
 * - `forbidden` and `not_found` are not collapsed together.
 * - `abort` is never surfaced as a functional error.
 * - `conflict` is classified, never resolved by last-write-wins.
 * - The resolver is holdable in scheduler tests and snapshot tests; it must be
 *   a pure function of its inputs.
 *
 * Out of scope for M2:
 * - Rendering of state chrome (handled by `PlannerStateView`).
 * - Form-level conflict UI (M4/M5).
 * - Telemetry emission (caller owns telemetry; resolver does not emit).
 */

import type { PlannerError, PlannerErrorClass } from './plannerErrorAdapter';
import type { PlannerTabKey } from '../../navigation/plannerNavigationContract';
// Re-export so consumers don't repeat the import path.
export type { PlannerErrorClass } from './plannerErrorAdapter';

// ---------------------------------------------------------------------------
// 1. Section keys (mirror `PlannerTabKey` for shell-level partial sections)
// ---------------------------------------------------------------------------

/**
 * Section keys used by partial shell state. Reuses `PlannerTabKey` so the
 * shell never invents pseudo-sections. The list is intentionally the same
 * three tabs exposed by the navigation contract — no search, no trash, no
 * capabilities as a section.
 */
export type PlannerSectionKey = PlannerTabKey;

export const PLANNER_SECTION_KEYS: readonly PlannerSectionKey[] = ['tasks', 'events', 'plans'] as const;

// ---------------------------------------------------------------------------
// 2. PlannerShellState — discriminated union (single authority)
// ---------------------------------------------------------------------------

/**
 * A classified error exposed to the Shell state. We never transport the raw
 * `Error` object toward UI; the classification, code, request id and the
 * retryable flag are the only values consumed by the Shell state.
 *
 * `requestId` is secondary/support info only and never the primary copy.
 */
export type PlannerShellErrorInfo = {
  readonly errorClass: PlannerErrorClass;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly isRetryable: boolean;
};

/**
 * Canonical Planner shell global state.
 *
 * States are mutually exclusive: exactly one `kind` is active at a time.
 * `refreshing` and `partial` deliberately keep existing content visible; they
 * are never full-screen replacements except when the resolver is in
 * `initial_loading` (which by definition has no prior content).
 */
export type PlannerShellState =
  | { readonly kind: 'initial_loading' }
  | { readonly kind: 'refreshing' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'partial'; readonly unavailableSections: readonly PlannerSectionKey[] }
  | { readonly kind: 'offline_stale' }
  | { readonly kind: 'offline_empty' }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'conflict'; readonly requestId: string | null }
  | { readonly kind: 'recoverable_error'; readonly error: PlannerShellErrorInfo }
  | { readonly kind: 'fatal_error'; readonly errorId: string };

// ---------------------------------------------------------------------------
// 3. PlannerShellInputs — typed inputs to the resolver
// ---------------------------------------------------------------------------

/**
 * Inputs to the pure resolver. These are the only signals the shell needs to
 * decide its global visible state. Sources:
 *  - Auth/Household readiness: from `useAuth` and `useHousehold`.
 *  - `canViewPlanner`: capability `planner.view` resolved via
 *    `plannerCapabilitiesAdapter.canViewPlanner`.
 *  - `initialLoading` / `refreshing`: from the shell summary loading state.
 *  - `hasUsableContent` / `isEmpty`: from summary presence/counters.
 *  - `isOffline`: from network reachability state.
 *  - `partialSections`: sections whose last fetch attempt failed while some
 *    content remains usable (currently informational only — set when at
 *    least one tab has data and at least one tab failed).
 *  - `error`: the classified planner error from the last summary attempt,
 *    or `null` when there is no active error.
 *
 * `authReady` includes the access token being available; `householdReady`
 * includes a non-null `currentHousehold`; `hasActiveHousehold` is the
 * membership/household active gate.
 */
export type PlannerShellInputs = {
  readonly authReady: boolean;
  readonly householdReady: boolean;
  readonly hasActiveHousehold: boolean;
  readonly capabilitiesReady: boolean;
  readonly canViewPlanner: boolean;
  readonly initialLoading: boolean;
  readonly refreshing: boolean;
  readonly hasUsableContent: boolean;
  readonly isEmpty: boolean;
  readonly isOffline: boolean;
  readonly partialSections?: readonly PlannerSectionKey[];
  readonly error?: PlannerError | null;
};

// ---------------------------------------------------------------------------
// 4. Pure helpers
// ---------------------------------------------------------------------------

/**
 * Convert a classified `PlannerError` into the safe shell error info shape.
 * The raw `original` error is intentionally dropped — shells never propagate
 * it toward UI components.
 *
 * `abort` errors MUST NOT be transported as recoverable errors; the resolver
 * treats abort as a non-input (the caller should not pass abort errors here,
 * and `toPlannerShellErrorInfo` returns `null` for abort, signaling "skip").
 */
export function toPlannerShellErrorInfo(
  error: PlannerError | null | undefined,
): PlannerShellErrorInfo | null {
  if (!error) return null;
  if (error.class === 'abort') return null;
  return {
    errorClass: error.class,
    code: error.code,
    requestId: error.requestId,
    isRetryable: error.isRetryable,
  };
}

/**
 * Generate a short, opaque, safe incident id used by the fatal/error boundary.
 * The id contains no PII, no stack, no household id — it is a structural
 * correlation token only. Format: `pln_<timestampMs>_<rand>`.
 */
export function generatePlannerIncidentId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `pln_${Date.now()}_${rand}`;
}

// ---------------------------------------------------------------------------
// 5. Pure resolver — deterministic priority ordering
// ---------------------------------------------------------------------------

/**
 * Resolve a single `PlannerShellState` from typed inputs.
 *
 * Priority order (deterministic; document any deviation here):
 *
 *   1. fatal_error signal — reserved for boundary halt; resolver itself never
 *      emits this from inputs. The `fatal_error` kind is produced by the
 *      `PlannerErrorBoundary`, not by this resolver. `resolver` may still emit
 *      it when the shell receives an explicit fatal flag (defensive).
 *
 *   2. Auth/household preparation — while auth/session/household are still
 *      resolving, the shell shows `initial_loading`. We do NOT emit
 *      forbidden/not_found here because we cannot classify yet.
 *
 *   3. Forbidden — capability `planner.view` explicitly denied after
 *      preparation completed. Forbidden wins over not_found / empty.
 *
 *   4. Initial loading — first summary fetch, no usable content yet.
 *
 *   5. Offline without data — offline AND no usable content.
 *
 *   6. Conflict / not_found / recoverable_error WITHOUT usable content —
 *      a blocking error where the shell has nothing to show. Conflict and
 *      not_found are distinct kinds; recoverable covers `server`/`timeout`/
 *      `validation`/`unknown`. Abort is ignored entirely.
 *
 *   7. Empty — online, prepared, no error, content is explicitly empty
 *      according to the consumer's definition (e.g. summary indicates zero
 *      entities AND zero filtered content).
 *
 *   8. Partial — some tab failed while others have usable content. The list
 *      of unavailable sections is stored on the state.
 *
 *   9. Offline with stale data — offline BUT we still have usable content.
 *
 *  10. Refreshing over existing content — online, an active refresh, content
 *      remains visible.
 *
 *  11. Ready — nominal state with usable content and no active error.
 *
 * Deviations from the spec concept list:
 *  - `not_found` is ordered above `recoverable_error` because a missing
 *    household/context is a hard gate when there is no usable content.
 *  - `conflict` is ordered above `recoverable_error` for the same reason,
 *    but it is never auto-resolved via LWW by the resolver — the caller is
 *    responsible for directed refetch.
 */
export function resolvePlannerShellState(
  inputs: PlannerShellInputs,
): PlannerShellState {
  const {
    authReady,
    householdReady,
    hasActiveHousehold,
    capabilitiesReady,
    canViewPlanner,
    initialLoading,
    refreshing,
    hasUsableContent,
    isEmpty,
    isOffline,
    partialSections,
    error,
  } = inputs;

  // 1. Auth/household preparation — surface initial_loading while nothing
  //    is ready yet. Avoid premature forbidden/not_found during transitions.
  if (!authReady || !householdReady || !hasActiveHousehold) {
    return { kind: 'initial_loading' };
  }

  // 2. Capabilities error/loading: while projection is still resolving we
  //    cannot decide view permission. Deny-safe: treat the transient state
  //    as initial_loading so we never flash forbidden during a cold start.
  if (!capabilitiesReady) {
    return { kind: 'initial_loading' };
  }

  // 3. Forbidden — `planner.view` explicitly denied. This is a hard gate and
  //    wins over content availability.
  if (!canViewPlanner) {
    return { kind: 'forbidden' };
  }

  // 4. Classify current error once (abort is ignored at this layer).
  const shellError = toPlannerShellErrorInfo(error);

  // 5. Initial loading — the first summary fetch is in flight and there is
  //    no usable content yet. Keep showing the skeleton.
  if (initialLoading && !hasUsableContent) {
    return { kind: 'initial_loading' };
  }

  // 6. Offline without usable data — offline AND no usable content.
  if (isOffline && !hasUsableContent) {
    return { kind: 'offline_empty' };
  }

  // 7. Blocking recoverable errors when the shell has no content to show.
  if (shellError && !hasUsableContent) {
    switch (shellError.errorClass) {
      case 'not_found':
        return { kind: 'not_found' };
      case 'conflict':
        return { kind: 'conflict', requestId: shellError.requestId };
      case 'forbidden':
        return { kind: 'forbidden' };
      default:
        // validation / server / timeout / offline / unknown — recoverable
        return { kind: 'recoverable_error', error: shellError };
    }
  }

  // 8. Empty — online, prepared, no blocking error, content explicitly empty.
  if (!isOffline && !shellError && isEmpty && !hasUsableContent) {
    return { kind: 'empty' };
  }

  // 9. Partial — at least one tab failed while others remain usable. We keep
  //    the usable content visible and surface the unavailable section keys.
  if (partialSections && partialSections.length > 0 && hasUsableContent) {
    return { kind: 'partial', unavailableSections: partialSections };
  }

  // 10. Offline with stale data — offline BUT we still have usable content.
  if (isOffline && hasUsableContent) {
    return { kind: 'offline_stale' };
  }

  // 11. Refreshing over existing content — content remains visible; the Shell
  //     orchestrates a non-blocking indicator around the active tab.
  if (refreshing && hasUsableContent) {
    return { kind: 'refreshing' };
  }

  // 12. Ready — nominal state with usable content and no active error.
  return { kind: 'ready' };
}

// ---------------------------------------------------------------------------
// 6. Guards consumers can use without importing the union directly
// ---------------------------------------------------------------------------

/**
 * True when the shell state implies the Shell is allowed to render active tab
 * content (i.e. there is something usable to show). Used by the Shell to
 * decide whether to mount the active tab body or the state chrome.
 *
 * `initial_loading`, empty, blocking errors and `fatal_error` return `false`.
 * `refreshing`, `partial`, `offline_stale` and `ready` return `true`.
 */
export function shellStateShowsActiveContent(state: PlannerShellState): boolean {
  switch (state.kind) {
    case 'initial_loading':
    case 'empty':
    case 'forbidden':
    case 'not_found':
    case 'conflict':
    case 'recoverable_error':
    case 'offline_empty':
    case 'fatal_error':
      return false;
    case 'refreshing':
    case 'partial':
    case 'offline_stale':
    case 'ready':
      return true;
    default:
      return false;
  }
}

/**
 * True when the shell state should render a state chrome (full-screen state
 * view) instead of the active tab content.
 */
export function shellStateRequiresChrome(state: PlannerShellState): boolean {
  return !shellStateShowsActiveContent(state);
}

/**
 * True when a full-screen skeleton is appropriate (initial loading or fatal).
 */
export function shellStateRequiresSkeleton(state: PlannerShellState): boolean {
  return state.kind === 'initial_loading' || state.kind === 'fatal_error';
}
