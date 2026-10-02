/**
 * HomeCloud W1-C — Scanner acceptance boundary policy.
 *
 * WHY A POLICY MODULE
 * -------------------
 * The Scanner used to navigate back on `completed`, which made the user wait for
 * upload + verify + finalize before the screen closed. The frozen lifecycle says
 * the opposite: AFTER DURABLE ACCEPTANCE the UI is no longer the owner, so the
 * Scanner must detach at acceptance and let the household coordinator finish the
 * work.
 *
 * Those rules are easy to state and easy to break silently (one refactor and the
 * screen is waiting on `completed` again), so they live here as a pure,
 * renderer-free policy that the screen obeys and the tests assert directly. The
 * screen keeps every native concern (camera, PDF, sheets); only the DECISION of
 * when to leave lives here.
 *
 * THE RULES
 * ---------
 * 1. Acceptance is the boundary, and it is one-shot. The intake service sets its
 *    accepted job id only AFTER the UploadJob is durably persisted, and leaves it
 *    null for every earlier failure, so `acceptedJobId === null` is the honest
 *    "nothing was accepted" answer — never a timeout, a status string or the
 *    start of the upload.
 * 2. Before acceptance the Scanner OWNS the draft: it stays open, the local pages
 *    and the generated PDF survive, the error is shown and a retry is possible.
 *    There is no navigation on this path at all.
 * 3. After acceptance the Scanner OWNS NOTHING durable: only redundant local
 *    state is cleaned. The durable workspace copy and the UploadJob belong to
 *    the engine and the coordinator, and detaching must never cancel or abort
 *    them — a post-acceptance failure is a GLOBAL state (HomeCloudUploadActivity
 *    / recovery), and the Scanner is never reopened for it.
 */

/** What the Scanner must do once `submitArtifact` has settled. */
export type ScannerAcceptanceOutcome =
  /** Durable acceptance happened: detach now; the coordinator takes over. */
  | { readonly kind: 'detach' }
  /**
   * Nothing was durably accepted: stay exactly as it is. The service has already
   * projected the error, and the local draft plus the retry are still valid.
   */
  | { readonly kind: 'stay'; readonly reason: 'not_accepted' };

/**
 * Decide the post-submit outcome from the REAL accepted signal.
 *
 * `alreadyAccepted` makes the boundary one-shot: a second observation of the
 * same job (a re-entrant call, a late continuation) must not navigate twice.
 */
export function scannerAcceptanceOutcome(input: {
  readonly acceptedJobId: string | null;
  readonly alreadyAccepted: boolean;
}): ScannerAcceptanceOutcome {
  if (input.alreadyAccepted) return { kind: 'stay', reason: 'not_accepted' };
  if (!input.acceptedJobId) return { kind: 'stay', reason: 'not_accepted' };
  return { kind: 'detach' };
}

/**
 * Re-entrancy guard for the "Guardar escaneo" action.
 *
 * React state cannot do this job: two taps inside a single frame both read a
 * stale `generating === false` from the closure, and each one would create its
 * own UploadJob. A ref flips synchronously, so a second tap is refused before
 * any await.
 */
export function createScannerSubmitGuard(): { tryBegin(): boolean; end(): void } {
  let inFlight = false;
  return {
    tryBegin() {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    end() {
      inFlight = false;
    },
  };
}

/** What detaching is allowed to delete. Nothing durable is ever in this list. */
export type ScannerCleanupPlan = {
  /** Temporary camera captures: redundant once the workspace copy exists. */
  readonly deleteTempCaptureUris: readonly string[];
  /** The generated source PDF: redundant once the workspace copy exists. */
  readonly deleteGeneratedPdfUri: string | null;
  /** The durable workspace copy is NEVER deleted by the surface. */
  readonly preservesDurableArtifact: true;
  /** Detaching NEVER cancels or aborts the accepted job. */
  readonly cancelsJob: false;
};

/**
 * The cleanup a detaching Scanner may perform.
 *
 * It is deliberately a PLAN rather than an action, so the two prohibitions can
 * be asserted as data: a detached Scanner has no reachable handle to the durable
 * artifact or to `cancel`, and the job's lifecycle stays entirely with the
 * engine, the coordinator and global recovery.
 */
export function planScannerCleanupAfterAcceptance(input: {
  readonly captureUris: readonly string[];
  readonly generatedPdfUri: string | null;
}): ScannerCleanupPlan {
  return {
    deleteTempCaptureUris: [...input.captureUris],
    deleteGeneratedPdfUri: input.generatedPdfUri,
    preservesDurableArtifact: true,
    cancelsJob: false,
  };
}
