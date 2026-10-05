import { createUploadEngine, createExpoFileSystemUploadTransport } from './homecloudUploadEngine';
import { getSharedUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { createSharedUploadQueue } from './homecloudUploadQueue';
import { ensureHomeCloudUploadRuntime } from './homecloudUploadRuntime';
import { ensureUploadCoordinator, type ActiveUploadProgress } from './homecloudUploadCoordinator';
import { fetchHomeCloudFoldersCached } from './homecloudReadService';
import { copyArtifactToDurableWorkspace, cleanupTerminalJobArtifact, sweepOrphanDurableWorkspaces } from './homecloudDurableArtifact';
import type { FileIntakeConfig, FileIntakeState, FileIntakeDestination, FileIntakeItemState } from './homecloudFileIntakeTypes';
import type { UploadJob, UploadLocalArtifact } from './homecloudUploadTypes';
import { homeCloudUploadErrorMessage } from './homecloudUploadError';

type FilePickerOutcome =
  | { success: true; artifacts: UploadLocalArtifact[]; artifact?: never }
  | { success: true; artifact: UploadLocalArtifact; artifacts?: never }
  | { success: false; cancelled: true }
  | { success: false; cancelled: false; error: string };

/** Test seams keep picker-return lifecycle behaviour executable without a native picker. */
export type FileIntakeDependencies = {
  pickFile?: () => Promise<FilePickerOutcome>;
  copyToDurableWorkspace?: (artifact: UploadLocalArtifact) => Promise<UploadLocalArtifact>;
};

/** What a Files surface is allowed to show about ONE upload it owns. */
export type FilesOwnedUploadProgress = {
  readonly jobId: string;
  readonly displayName: string;
  readonly progress: number;
};

/**
 * S4-iii D — the Files-owned upload progress, as a pure binding rule.
 *
 * Execution is household-wide: one coordinator, one worker, and the only live
 * byte progress it knows about is `activeUpload` for whichever job is running.
 * Presentation is NOT household-wide: this surface may only present the job it
 * accepted (`acceptedJobId`).
 *
 * So the rule is an identity comparison, never a heuristic: the ephemeral native
 * progress belongs to this surface if and only if it is about the accepted job.
 * A Memory job, another Files job, or no accepted job at all yields `null` —
 * "something in this household is uploading" is never shown as "your file is
 * uploading". Exported so the attribution is asserted directly instead of only
 * through a rendered screen.
 */
export function filesOwnedUploadProgress(
  acceptedJobIds: string | readonly string[] | ReadonlySet<string> | null,
  activeUpload: ActiveUploadProgress | null,
): FilesOwnedUploadProgress | null {
  if (!acceptedJobIds || !activeUpload) return null;
  const owns = typeof acceptedJobIds === 'string'
    ? activeUpload.jobId === acceptedJobIds
    : 'has' in acceptedJobIds
      ? acceptedJobIds.has(activeUpload.jobId)
      : acceptedJobIds.includes(activeUpload.jobId);
  if (!owns) return null;
  return {
    jobId: activeUpload.jobId,
    displayName: activeUpload.displayName,
    progress: activeUpload.progress,
  };
}

export function createFileIntakeService(config: FileIntakeConfig, dependencies: FileIntakeDependencies = {}) {
  const { householdId, accessToken, getAccessToken = () => accessToken, capabilities, initialFolderId, initialFolderName } = config;

  // Shared process-wide store: every intake surface (Files, Scanner, dev)
  // observes the same durable jobs, so a remount never loses the active job
  // and retry resumes it instead of registering a duplicate.
  const store = getSharedUploadJobStore();
  const uploadTransport = createExpoFileSystemUploadTransport();

  const engine = createUploadEngine({
    store,
    uploadTransport,
    getAccessToken,
    getHouseholdId: () => householdId,
    cleanupDurableArtifact: async (artifact) => {
      await cleanupTerminalJobArtifact(artifact);
    },
  });

  // ONE shared queue authority for HomeCloud binaries (Files + Memories):
  // execution ownership (FIFO, single worker, household scope) lives in the
  // shared queue module. This service is a domain adapter (file semantics);
  // `currentJob` below is a COMPAT projection derived from the queue, never
  // a separate mutable authority.
  const queue = createSharedUploadQueue({
    store,
    householdId,
    run: (jobId) => engine.run(jobId),
    cancelActiveUpload: (jobId) => engine.cancelActiveUpload(jobId),
    cleanupTerminalArtifact: async (artifact) => {
      await cleanupTerminalJobArtifact(artifact);
    },
  });
  const coordinator = ensureUploadCoordinator({ store, householdId, run: (jobId) => engine.run(jobId), cancelActiveUpload: (jobId) => engine.cancelActiveUpload(jobId), cleanupTerminalArtifact: cleanupTerminalJobArtifact });

  /**
   * PRESENTATION OWNERSHIP (same contract as the Memory adapter).
   *
   * EXECUTION is global (one household coordinator). PRESENTATION is local:
   * only the job this surface accepted (`acceptedJobId`) may project state,
   * error or progress. No "first file job in the queue" and no "any job in the
   * household" fallback, so a stale terminal job can never surface its error
   * here and a foreign job can never make this surface look busy.
   */
  let acceptedJobIds: string[] = [];
  let currentJob: UploadJob | null = null;
  let selectedFolderId: string | null = initialFolderId ?? null;
  let selectedFolderName: string | null = initialFolderName ?? null;
  let availableFolders: FileIntakeDestination[] = [];
  let picking = false;
  let stateListeners: Set<(state: FileIntakeState) => void> = new Set();

  const baseState: FileIntakeState = {
    status: 'idle',
  };
  let currentState: FileIntakeState = baseState;

  function emitState(partial: Partial<FileIntakeState>) {
    currentState = { ...currentState, ...partial };
    stateListeners.forEach((listener) => listener(currentState));
  }

  function acceptedJobs(): UploadJob[] {
    return acceptedJobIds.map((id) => store.get(id)).filter((job): job is UploadJob => job !== null);
  }

  /** Legacy single-artifact projection used by Scanner: the most recently accepted job. */
  function acceptedJob(jobId?: string): UploadJob | null {
    const id = jobId ?? acceptedJobIds[acceptedJobIds.length - 1];
    return id ? store.get(id) : null;
  }

  function refreshCurrentJobProjection(): void {
    currentJob = acceptedJob();
  }

  function itemState(job: UploadJob): FileIntakeItemState {
    const active = coordinator.getSnapshot().activeUpload;
    return {
      jobId: job.id,
      displayName: job.artifact.displayName,
      status: mapEngineStateToIntakeState(job) as FileIntakeItemState['status'],
      progress: active?.jobId === job.id ? active.progress : null,
      error: job.error?.message,
      retryable: job.state === 'failed' && job.error?.retryable === true,
      contentId: job.contentId ?? undefined,
    };
  }

  function syncQueueState(): void {
    refreshCurrentJobProjection();
    const jobs = acceptedJobs();
    if (jobs.length === 0) return;
    const unsettled = jobs.find((job) => job.state !== 'completed' && job.state !== 'cancelled' && job.state !== 'failed');
    const failed = jobs.find((job) => job.state === 'failed');
    const aggregate = unsettled ?? failed ?? jobs.find((job) => job.state === 'completed') ?? jobs[0];
    const allCancelled = jobs.every((job) => job.state === 'cancelled');
    emitState({
      status: unsettled ? mapEngineStateToIntakeState(unsettled) : failed ? 'failed' : allCancelled ? 'cancelled' : 'completed',
      contentId: aggregate.contentId ?? undefined,
      error: failed?.error?.message,
      folderId: selectedFolderId,
      folderName: selectedFolderName,
      jobId: aggregate.id,
      progress: ownedProgress(aggregate.id)?.progress ?? null,
      items: jobs.map(itemState),
    });
  }

  /**
   * S4-iii D — progress for THIS surface's job only. The coordinator's
   * `activeUpload` is the household's live byte progress; it is presented here
   * only while it is about the accepted job (see `filesOwnedUploadProgress`).
   */
  function ownedProgress(jobId?: string): FilesOwnedUploadProgress | null {
    return filesOwnedUploadProgress(jobId ?? acceptedJobIds, coordinator.getSnapshot().activeUpload);
  }

  /**
   * S4-iii A — the destination catalogue.
   *
   * This is the SAME household-scoped cached read the Files browser uses, so a
   * folder mutation anywhere drops one shared cache key and both consumers are
   * fresh. It used to be a one-shot latch (`foldersLoaded`) taken at mount: a
   * folder created, renamed or deleted while this sheet stayed open left the
   * picker offering the old catalogue until the 30 s TTL expired. Re-reading on
   * demand is cheap precisely because the read is cached — one request per TTL
   * window, and a fresh one the moment a mutation invalidated it.
   */
  async function loadFolders(): Promise<void> {
    try {
      const token = getAccessToken();
      if (!token) throw new Error('no access token');
      const folders = await fetchHomeCloudFoldersCached(token, { householdId });
      availableFolders = [
        { id: 'root', name: 'Archivos', isCurrent: selectedFolderId === null },
        ...folders.map((f) => ({ id: f.id, name: f.name, isCurrent: f.id === selectedFolderId })),
      ];
    } catch {
      availableFolders = [{ id: 'root', name: 'Archivos', isCurrent: selectedFolderId === null }];
    }
  }

  function mapEngineStateToIntakeState(job: UploadJob): FileIntakeState['status'] {
    switch (job.state) {
      case 'pending':
      case 'registering':
        return 'preparing';
      case 'registered':
      case 'uploading':
        return 'uploading';
      case 'verifying':
        return 'verifying';
      case 'finalizing':
        return 'finalizing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'idle';
    }
  }

  async function pickFile(): Promise<void> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar archivos.' });
      return;
    }

    if (picking) return;
    picking = true;
    emitState({ status: 'picking' });
    try {
      const pickFileImpl = dependencies.pickFile ?? (await import('./homecloudFilePicker')).pickFile;
      const outcome = await pickFileImpl();
      if (outcome.success === false && outcome.cancelled === true) { emitState({ status: acceptedJobIds.length > 0 ? currentState.status : 'idle' }); return; }
      if (outcome.success === false) { emitState({ status: 'failed', error: outcome.error }); return; }
      await submitArtifacts('artifacts' in outcome && outcome.artifacts ? outcome.artifacts : [outcome.artifact]);
    } catch (error) {
      emitState({ status: 'failed', error: homeCloudUploadErrorMessage(error, 'Error al seleccionar archivo.') });
    } finally { picking = false; }
  }

  /**
   * Capture-source agnostic handoff: any intake adapter (document picker,
   * scanner, ...) can submit a local artifact and reuse the same durable
   * workspace copy, UploadJob lifecycle and retry semantics.
   *
   * T1 shared-queue contract: EVERY submit creates and persists its own job.
   * While job A is active, submit B persists B as pending — B never
   * disappears, never replaces A, never needs re-picking. The shared queue
   * advances FIFO when A terminates.
   */
  async function submitArtifact(artifact: UploadLocalArtifact): Promise<void> {
    await submitArtifacts([artifact]);
  }

  async function submitArtifacts(artifacts: readonly UploadLocalArtifact[]): Promise<void> {
    if (artifacts.length === 0) return;
    emitState({ status: 'preparing', folderId: selectedFolderId, folderName: selectedFolderName });
    let submissionError: string | undefined;
    for (const artifact of artifacts) {
      try {
        // Idempotent: artifacts already inside the durable workspace pass through.
        const durableArtifact = await (dependencies.copyToDurableWorkspace ?? copyArtifactToDurableWorkspace)(artifact);
        const job = await queue.enqueue(
          {
            role: 'file',
            intakeSource: config.intakeSource ?? 'files:picker',
            initialFolderId: selectedFolderId,
          },
          durableArtifact,
        );
        if (!acceptedJobIds.includes(job.id)) acceptedJobIds.push(job.id);
        currentJob = store.get(job.id) ?? job;
        syncQueueState();
      } catch (error) {
        submissionError = homeCloudUploadErrorMessage(error, 'Error al preparar el archivo.');
      }
    }
    if (acceptedJobIds.length > 0) syncQueueState();
    else if (submissionError) emitState({ status: 'failed', error: submissionError, folderId: selectedFolderId, folderName: selectedFolderName });
  }

  function selectDestination(folderId: string | null, folderName: string | null): void {
    selectedFolderId = folderId;
    selectedFolderName = folderId === 'root' ? null : folderName;
    availableFolders = availableFolders.map((f) => ({ ...f, isCurrent: f.id === (folderId ?? 'root') }));
    emitState({ folderId: selectedFolderId, folderName: selectedFolderName });
  }

  async function retry(jobId?: string): Promise<void> {
    // Bound to the accepted job only — no household-wide fallback, so a Retry
    // can never resume a job this surface never accepted.
    const job = acceptedJob(jobId);
    if (!job || job.state !== 'failed' || job.error?.retryable !== true) return;
    currentJob = job;
    emitState({ status: 'preparing', error: undefined });
    try {
      await coordinator.retry(job.id);
      const completedJob = store.get(job.id) ?? job;
      currentJob = completedJob;
      syncQueueState();
    } catch (error) {
      const latest = store.get(job.id);
      if (latest) currentJob = latest;
      syncQueueState();
    }
  }

  /**
   * S4-iii D — Cancel targets EXACTLY the job this surface owns.
   *
   * The old rule was `acceptedJob() ?? queue.getQueue().find(role === 'file')`.
   * That fallback made an explicit, user-initiated Cancel act on an ARBITRARY
   * job: the first file job in the household could be a job this surface never
   * accepted — including a neighbour running right now — so pressing Cancel on
   * "your" upload could destroy someone else's work. A cancel action with no
   * known target is not an action: it is a no-op.
   *
   * The canonical rule is therefore exactly:
   *   explicit target id -> cancel(target id)
   *   no target id       -> cancel nothing
   * Coordinator semantics are untouched: it still refuses a foreign job id and
   * still aborts the native transfer for the job it owns.
   */
  function cancel(jobId?: string): void {
    const targetId = jobId ?? acceptedJobIds[acceptedJobIds.length - 1];
    if (!targetId) return;
    // Single-job cancel: neighbors keep progressing via the queue pump.
    void queue.cancelJob(targetId).then((cancelled) => {
      refreshCurrentJobProjection();
      if (cancelled) syncQueueState();
    });
  }

  /**
   * CLOSE contract: leave the surface ready to open again. Releases the picker
   * guard (a native presentation that never settled must never brick
   * "Agregar archivo"), drops the transient flags and the job binding.
   */
  function dismiss(): void {
    picking = false;
    currentJob = null;
    acceptedJobIds = [];
    emitState({ status: 'idle', error: undefined, contentId: undefined, jobId: null, progress: null, items: [] });
  }

  function subscribe(listener: (state: FileIntakeState) => void): () => void {
    stateListeners.add(listener);
    listener(currentState);
    const unsubscribeQueue = queue.subscribe(syncQueueState);
    return () => { stateListeners.delete(listener); unsubscribeQueue(); };
  }

  function getAvailableDestinations(): FileIntakeDestination[] {
    return availableFolders;
  }

  function getInitialFolder(): { folderId: string | null; folderName: string | null } {
    return { folderId: selectedFolderId, folderName: selectedFolderName };
  }

  function canShowDestinationSelector(): boolean {
    return availableFolders.length > 1;
  }

  /**
   * "Is there a job THIS surface owns?" — never "does the household have any
   * job?". The household question made an unsubmitted draft look protected by
   * a foreign job and let a foreign terminal failure decide this UI.
   */
  function hasActiveJob(): boolean {
    refreshCurrentJobProjection();
    return acceptedJobs().some((job) => job.state !== 'completed' && job.state !== 'cancelled');
  }

  /**
   * Canonical shared recovery entry point for file intake. Ensures the ONE
   * process-wide upload runtime (startup hydrate + sweep + reconnect owner)
   * and resumes interrupted file jobs for this Household. Safe to call on
   * every mount; no-ops when nothing is recoverable.
   */
  async function recover(): Promise<void> {
    if (!householdId || !getAccessToken()) return;
    try {
      await ensureHomeCloudUploadRuntime({
        store,
        householdId,
        run: (jobId) => engine.run(jobId),
        sweepOrphans: async (liveJobs) => {
          await sweepOrphanDurableWorkspaces(liveJobs);
        },
      }).start();
      void coordinator.requestPump('file_mount');
    } catch {
      // Recovery is best-effort; explicit retry of the same job remains.
    }
  }

  return {
    pickFile,
    submitArtifact,
    submitArtifacts,
    selectDestination,
    retry,
    cancel,
    dismiss,
    subscribe,
    getAvailableDestinations,
    getInitialFolder,
    canShowDestinationSelector,
    loadFolders,
    hasActiveJob,
    recover,
    /** The job this surface is bound to (null before the first submit). */
    getAcceptedJobId: () => acceptedJobIds[acceptedJobIds.length - 1] ?? null,
    getAcceptedJobIds: () => [...acceptedJobIds],
    /**
     * S4-iii D — live progress of the accepted job, or null. Never another
     * surface's job and never a household-wide stand-in.
     */
    getOwnedProgress: ownedProgress,
    /** Compat projection over the shared queue (never separate authority). */
    getCurrentJob: () => queue.getCurrentJob(),
  };
}
