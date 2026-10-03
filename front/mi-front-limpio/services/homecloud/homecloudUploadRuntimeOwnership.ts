/**
 * HomeCloud — S2-i COLD START RUNTIME OWNERSHIP (shared foundation).
 *
 * THE GAP THIS CLOSES
 * -------------------
 * `ensureHomeCloudUploadRuntime(...).start()` was only ever reached from
 * `recover()` inside the intake services, and those are only constructed by
 * `MemoryIntake` / `FileIntake` / `HomeCloudScannerScreen` — all of which live
 * BEHIND `HomeCloudMemoriesScreen` / `HomeCloudFilesScreen`. So the durable
 * contract "accepted job -> app killed -> app reopened -> recovery runs" held
 * only if the user happened to navigate back into HomeCloud. A cold start that
 * stayed on Home recovered nothing: no hydrate, no orphan sweep, no pump.
 *
 * This module owns the OPEN half of that contract for the authenticated shell.
 * The React owner (`HomeCloudUploadRuntimeOwner`) is a thin wrapper that feeds it
 * auth/household readiness and disposes the scope it is leaving; the readiness
 * classifier and the open routine are pure/IO-light so they can be exercised by
 * node without React, without an emulator and without any HomeCloud screen.
 *
 * WHY THE EXISTING `recover()` CALLS STAY
 * ---------------------------------------
 * Nothing here removes `service.recover()` from the intake surfaces. Every step is
 * already idempotent and single-flight: `UploadRuntimeHandle.start()` returns early
 * on its `started` guard, `ensureUploadCoordinator` re-`configure()`s an existing
 * coordinator instead of duplicating it, `requestPump` shares one in-flight promise,
 * and `recoverUploadJobs` is keyed by scope in a single-flight map. A second mount
 * therefore joins the existing pass instead of duplicating it.
 *
 * SCOPE RULES (no data loss, no cross-household pumping)
 * -----------------------------------------------------
 * - No access token          -> nothing is opened, and any held runtime is disposed.
 * - Auth still resolving     -> nothing is opened, and the held runtime is PRESERVED
 *                               so a transient `refetchMe` cannot tear down recovery.
 * - No active household      -> nothing is opened. HomeCloud uploads are always
 *                               household-scoped, so "no household" and "personal"
 *                               are the same answer here: there is nothing to pump.
 *                               A held runtime IS disposed, because a household the
 *                               user just left must not keep running jobs.
 * - Active household         -> open (or keep) the one runtime for that household.
 *
 * Maintenance runs after the recovery pass, never before: recovery owns every
 * mid-flight job first, and only then are terminal rows released. It is purely
 * local (store + workspace files), so it is also safe while offline — it can never
 * spend a retry, and it is guarded against concurrent passes by the caller's
 * single-flight start.
 */

import { createUploadEngine, createExpoFileSystemUploadTransport } from './homecloudUploadEngine';
import type { UploadJob, UploadLocalArtifact, UploadTransport } from './homecloudUploadTypes';
import { cleanupTerminalJobArtifact, sweepOrphanDurableWorkspaces } from './homecloudDurableArtifact';
import { ensureUploadCoordinator } from './homecloudUploadCoordinator';
import { ensureHomeCloudUploadRuntime } from './homecloudUploadRuntime';
import type { UploadRuntimeConnectivity } from './homecloudUploadRuntime';
import { pruneTerminalUploadJobs } from './homecloudUploadMaintenance';
import { getSharedUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import type { AsyncUploadJobStore, UploadJobStore } from '../../storage/homecloudUploadJobStorage';

// ── Readiness contract (pure) ───────────────────────────────────────────────

export type HomeCloudUploadScopeState =
  /** No access token: there is no authenticated session to act for. */
  | 'auth_unresolved'
  /** Auth is still resolving. Waiting is deny-safe; the held scope is preserved. */
  | 'auth_loading'
  /** Auth resolved but no active household. There is no household scope to pump. */
  | 'no_household'
  /** Fully resolved household scope. This is the only state that may open. */
  | 'household_active';

export type HomeCloudUploadReadinessInput = {
  readonly accessToken: string | null | undefined;
  readonly authMeLoading: boolean;
  readonly activeHouseholdId: string | null | undefined;
};

export type HomeCloudUploadReadiness = {
  readonly scopeState: HomeCloudUploadScopeState;
  /** True only when the scope is fully resolved and may be opened now. */
  readonly ready: boolean;
};

/**
 * Total, side-effect-free classification of the authenticated upload scope.
 *
 *   accessToken | authMeLoading | activeHouseholdId | scopeState
 *   ------------|---------------|-------------------|---------------------
 *   falsy       | any           | any               | 'auth_unresolved'
 *   truthy      | true          | any               | 'auth_loading'
 *   truthy      | false         | null/undefined    | 'no_household'
 *   truthy      | false         | id                | 'household_active'
 *
 * Note this contract does NOT need the `hasActiveMembership` distinguisher that
 * Planner reliability requires. That flag exists to tell "no household yet" apart
 * from "confirmed personal scope" because Planner has a real personal runtime to
 * open. HomeCloud uploads have no personal scope: both answers are "open nothing",
 * so the extra input would add complexity without changing a single decision.
 */
export function resolveHomeCloudUploadRuntimeReadiness(
  input: HomeCloudUploadReadinessInput,
): HomeCloudUploadReadiness {
  if (!input.accessToken) return { scopeState: 'auth_unresolved', ready: false };
  if (input.authMeLoading) return { scopeState: 'auth_loading', ready: false };
  if (!input.activeHouseholdId) return { scopeState: 'no_household', ready: false };
  return { scopeState: 'household_active', ready: true };
}

export type HomeCloudUploadOwnerAction =
  | 'keep'
  | 'open'
  | 'dispose_then_open'
  | 'wait'
  | 'dispose';

export type HomeCloudUploadOwnerActionInput = {
  readonly readiness: HomeCloudUploadReadiness;
  /** Household whose runtime is currently held by the owner (null if none). */
  readonly heldHouseholdId: string | null;
  /** Household that WOULD be opened when `readiness.ready` is true. */
  readonly nextHouseholdId: string | null;
};

/**
 * Reduce readiness + held scope into the owner's next action. Pure.
 *
 * - `auth_loading` is `wait`, never `dispose`: a transient `refetchMe` (Profile,
 *   HouseholdSwitcherSheet) must not destroy an in-progress recovery.
 * - `auth_unresolved` and `no_household` are terminal for the held scope: the
 *   session ended, or the user left the household, so the old runtime must stop.
 * - `keep` requires the SAME household, which is what makes `start` idempotent:
 *   re-rendering the owner, or a background household reload that resolves to the
 *   same id, never reopens anything.
 */
export function decideHomeCloudUploadOwnerAction(
  input: HomeCloudUploadOwnerActionInput,
): HomeCloudUploadOwnerAction {
  const { readiness, heldHouseholdId, nextHouseholdId } = input;
  if (!readiness.ready) {
    if (readiness.scopeState === 'auth_loading') return 'wait';
    return heldHouseholdId !== null ? 'dispose' : 'wait';
  }
  if (heldHouseholdId === null) return 'open';
  if (heldHouseholdId === nextHouseholdId) return 'keep';
  return 'dispose_then_open';
}

// ── Open (shared) ───────────────────────────────────────────────────────────

export type UploadSweepLike = (liveJobs: UploadJob[]) => Promise<unknown>;

export type HomeCloudUploadScopeOpenParams = {
  /** Canonical, server-resolved household. Never taken from a job. */
  readonly householdId: string;
  readonly accessToken: string;
  /** Test seam only: production always uses the native Expo transport. */
  readonly uploadTransport?: UploadTransport;
  /** Test seam only: production uses the process-wide durable singleton. */
  readonly store?: UploadJobStore | AsyncUploadJobStore;
  /** Test seam only: replaces the real workspace orphan sweep. */
  readonly sweepOrphans?: UploadSweepLike;
  /** Test seam only: replaces the real terminal artifact cleanup. */
  readonly cleanupTerminalArtifact?: (artifact: UploadLocalArtifact) => Promise<unknown>;
  /** Test seam only: injects a deterministic connectivity source. */
  readonly connectivity?: UploadRuntimeConnectivity;
  /** Observable diagnostics (mirrors the runtime's own `onEvent`). */
  readonly onEvent?: (event: string, detail?: Record<string, unknown>) => void;
  /** Set false to skip the post-recovery terminal pruning pass. */
  readonly runMaintenance?: boolean;
};

export type HomeCloudUploadScopeOpenResult = {
  readonly householdId: string;
  /** True when a runtime now exists for the scope (true even if already started). */
  readonly runtimeOpen: boolean;
  /** Number of recover passes actually issued by this call (0 or 1). */
  readonly recoverPasses: number;
  readonly prunedJobIds: readonly string[];
};

/**
 * Open (or re-open, idempotently) the ONE upload runtime for an authenticated
 * household scope: hydrate the durable store, sweep orphaned workspaces, run the
 * recovery pass, then release terminal rows. Safe to call repeatedly for the same
 * scope — every step is guarded — and never opens a second runtime for the same
 * household because `ensureHomeCloudUploadRuntime` is keyed by household.
 */
export async function openHomeCloudUploadRuntimeForScope(
  params: HomeCloudUploadScopeOpenParams,
): Promise<HomeCloudUploadScopeOpenResult> {
  const { householdId, accessToken } = params;
  const store = params.store ?? getSharedUploadJobStore();
  const cleanupTerminalArtifact = params.cleanupTerminalArtifact
    ?? ((artifact: UploadLocalArtifact) => cleanupTerminalJobArtifact(artifact));

  const engine = createUploadEngine({
    store,
    uploadTransport: params.uploadTransport ?? createExpoFileSystemUploadTransport(),
    getAccessToken: () => accessToken,
    getHouseholdId: () => householdId,
    cleanupDurableArtifact: async (artifact) => {
      await cleanupTerminalArtifact(artifact);
    },
  });

  const run = (jobId: string) => engine.run(jobId);
  // Re-`configure()`s the household coordinator with the FULL dependency set
  // (cancel + terminal cleanup). `recoverUploadJobs` also ensures a coordinator,
  // but without those two, so doing it here is what keeps cold-start completion
  // behaviour identical to an intake-mounted start.
  ensureUploadCoordinator({
    store,
    householdId,
    run,
    cancelActiveUpload: (jobId) => engine.cancelActiveUpload(jobId),
    cleanupTerminalArtifact,
  });

  const runtime = ensureHomeCloudUploadRuntime({
    store,
    householdId,
    run,
    sweepOrphans: params.sweepOrphans
      ?? (async (liveJobs) => { await sweepOrphanDurableWorkspaces(liveJobs); }),
    connectivity: params.connectivity,
    onEvent: params.onEvent,
  });

  // `start()` is guarded by its own `started` flag, so a repeated call is a no-op
  // and cannot issue a second recovery pass for the same scope.
  //
  // There is deliberately NO extra `requestPump` here. The runtime is the ONLY
  // pumping authority and it gates recovery on connectivity (`recoverPass` on
  // startup, `recoverPass('reconnect')` on the offline -> online edge). Pumping
  // from this owner would resurrect the very bug S2-i exists to fix: a doomed pass
  // over durable jobs on an offline cold start.
  await runtime.start();

  const maintenance = params.runMaintenance === false
    ? null
    : await pruneTerminalUploadJobs({ store, householdId, cleanupTerminalArtifact });

  return {
    householdId,
    runtimeOpen: true,
    recoverPasses: 1,
    prunedJobIds: maintenance?.prunedJobIds ?? [],
  };
}