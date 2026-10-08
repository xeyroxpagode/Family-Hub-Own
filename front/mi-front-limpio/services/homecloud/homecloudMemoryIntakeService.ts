import { createUploadEngine, createExpoFileSystemUploadTransport } from './homecloudUploadEngine';
import { getSharedUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { createSharedUploadQueue } from './homecloudUploadQueue';
import { ensureHomeCloudUploadRuntime } from './homecloudUploadRuntime';
import { ensureUploadCoordinator } from './homecloudUploadCoordinator';
import { cleanupTerminalJobArtifact, sweepOrphanDurableWorkspaces } from './homecloudDurableArtifact';
import { fetchHomeCloudAlbumsCached } from './homecloudReadService';
import type { BinaryMemoryDraft, BinaryMemoryMetadata, MemoryBatchAcceptedItem, MemoryBatchJobState, MemoryBatchSubmissionItem, MemoryIntakeConfig, MemoryIntakeState, MemoryIntakeDestination } from './homecloudMemoryIntakeTypes';
import type { UploadJob, UploadLocalArtifact } from './homecloudUploadTypes';
import type { MemoryPickerOutcome } from './homecloudMemoryPicker';
import { memoryAttemptTrace, memoryDevTrace } from './homecloudMemoryDiagnostics';
import type { MemoryAttempt } from './homecloudMemoryAttempt';
import { homeCloudUploadErrorMessage } from './homecloudUploadError';
import type { MediaCaptureMetadata } from './homecloudMediaCaptureMetadata';

/** The gallery batch result, as this service consumes it. */
export type MemoryBatchSeed = { artifact: UploadLocalArtifact; capture: MediaCaptureMetadata; source: 'gallery' };

/**
 * HomeCloud HC-2C â€” Memory Intake service.
 *
 * Reuses the HC-2A Shared Upload Engine (picker-agnostic). The picker adapter
 * produces a neutral UploadLocalArtifact; this service owns Memory semantics:
 * role = 'memory', optional caption, reliable capture metadata (never a fake
 * date), and optional initial Album destination under homecloud.contribute.
 */
export function createMemoryIntakeService(config: MemoryIntakeConfig) {
  const { householdId, accessToken, getAccessToken = () => accessToken, capabilities, initialAlbumId, initialAlbumName } = config;

  // Shared process-wide store: every intake surface observes the same durable
  // jobs, so a remount never loses the active job.
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

  // ONE shared queue authority for HomeCloud binaries (Files + Memories).
  // The shared queue is the only mutable execution authority.
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
   * PRESENTATION OWNERSHIP.
   *
   * EXECUTION is global (one household coordinator runs Memory and File jobs
   * FIFO). PRESENTATION is local: this adapter projects state, error and
   * progress ONLY for the job this Review accepted (`acceptedJobId`). It never
   * reads "the first memory job in the queue", "the latest failed job" or any
   * other household job, so a stale failed job from an older attempt can never
   * paint its error over the Review of a job that is still uploading.
   */
  let acceptedJobId: string | null = null;
  let acceptedDraftKey: string | null = null;
  let acceptanceInFlight: { key: string; promise: Promise<string | null> } | null = null;
  let selectedAlbumId: string | null = initialAlbumId ?? null;
  let selectedAlbumName: string | null = initialAlbumName ?? null;
  let availableAlbums: MemoryIntakeDestination[] = [];
  // Destinations are re-readable, NOT loaded once and forgotten. The previous
  // one-shot flag made the picker offer Albums that had been renamed or deleted
  // elsewhere, and it could never recover without a remount.
  let destinationsInFlight: Promise<void> | null = null;
  let picking = false;
  let pickerGeneration = 0;
  let stateListeners: Set<(state: MemoryIntakeState) => void> = new Set();

  const baseState: MemoryIntakeState = { status: 'idle' };
  let currentState: MemoryIntakeState = baseState;

  function emitState(partial: Partial<MemoryIntakeState>) {
    currentState = { ...currentState, ...partial };
    stateListeners.forEach((listener) => listener(currentState));
  }

  /** The accepted job's latest durable snapshot, or null when none is bound. */
  function acceptedJob(): UploadJob | null {
    if (acceptedJobId === null) return null;
    const snapshot = queue.getCurrentJob();
    // The coordinator snapshot is preferred only when it IS this job.
    if (snapshot && snapshot.id === acceptedJobId) return snapshot;
    return queue.getQueue().find((job) => job.id === acceptedJobId) ?? store.get(acceptedJobId);
  }

  /** Drop every transient flag left behind by a previous attempt. */
  function resetTransientState(): void {
    emitState({ error: undefined, contentId: undefined, invalidAlbum: false, permissionDenied: false, canAskAgain: undefined });
  }



/**
   * Reload the Album destinations through the EXISTING cached read.
   *
   * This is a re-runnable seam, not a one-shot load:
   *  - it is safe to call on every sheet open, so the picker always reflects the
   *    Albums that exist NOW;
   *  - concurrent calls share ONE in-flight read instead of racing two answers
   *    over the same list;
   *  - the read is the SAME `fetchHomeCloudAlbumsCached` the surface already
   *    used. No second Albums fetcher is introduced here, and this module owns NO
   *    Album management: it can neither create, rename nor delete an Album.
   *
   * Album MUTATIONS elsewhere invalidate the household Album read keys, so once
   * they have run this reload is guaranteed to miss the cache and re-read.
   */
  async function reloadDestinations(): Promise<void> {
    if (destinationsInFlight) return destinationsInFlight;
    const run = (async () => {
      try {
        const token = getAccessToken();
        if (!token) throw new Error('no access token');
        const albums = await fetchHomeCloudAlbumsCached(token, { householdId });
        availableAlbums = [
          { id: 'root', name: 'Recuerdos', isCurrent: selectedAlbumId === null },
          ...albums.map((a) => ({ id: a.id, name: a.name, isCurrent: a.id === selectedAlbumId })),
        ];
        // An inherited Album context that no longer resolves is SURFACED, never
        // silently retargeted to root and never silently kept as if it existed.
        if (selectedAlbumId && !albums.some((a) => a.id === selectedAlbumId)) {
          emitState({ invalidAlbum: true });
        } else if (selectedAlbumId) {
          emitState({ albumName: albums.find((a) => a.id === selectedAlbumId)?.name ?? selectedAlbumName, invalidAlbum: false });
        }
      } catch {
        // An empty Album list must NEVER block Memory creation: "Sin álbum"
        // stays valid, so the only destination offered is the root one.
        availableAlbums = [{ id: 'root', name: 'Recuerdos', isCurrent: selectedAlbumId === null }];
      } finally {
        destinationsInFlight = null;
      }
    })();
    destinationsInFlight = run;
    return run;
  }

  function mapEngineStateToIntakeState(job: UploadJob): MemoryIntakeState['status'] {
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

  /**
   * Launch the native gallery and return the draft, WITHOUT uploading.
   *
   * Reset contract for this function:
   * - a new attempt clears the previous error/contentId first, so a failed
   *   attempt can never leak its message into the next Review;
   * - the `picking` guard is released in `finally` on EVERY exit path
   *   (cancel, failure, success, unexpected throw), so it can never be
   *   orphaned;
   * - re-entrancy is refused instead of queueing a second native picker, so a
   *   double tap can never open two pickers.
   */
  async function pickMemory(attempt?: MemoryAttempt, owns: (attempt: MemoryAttempt) => boolean = () => true): Promise<BinaryMemoryDraft | null> {
    return runSourcePicker(async () => {
      const { pickMemoryMedia } = await import('./homecloudMemoryPicker');
      return pickMemoryMedia(attempt);
    }, attempt, owns);
  }

  /** The oldest memory job still in the queue. NEVER used to project state. */
  function firstMemoryQueueJob(): UploadJob | null {
    return queue.getQueue().find((job) => job.role === 'memory') ?? null;
  }

  function syncQueueState(): void {
    const job = acceptedJob();
    if (!job) return;
    emitState({ status: mapEngineStateToIntakeState(job), contentId: job.contentId ?? undefined, error: job.error?.message });
  }


  async function pickAudio(attempt?: MemoryAttempt, owns: (attempt: MemoryAttempt) => boolean = () => true): Promise<BinaryMemoryDraft | null> {
    return runSourcePicker(async () => {
      const { pickAudioMemory } = await import('./homecloudMemoryPicker');
      return pickAudioMemory(attempt);
    }, attempt, owns);
  }

  /**
   * ST-10.D — the MULTI-SELECTION gallery picker.
   *
   * It shares the single item's guard lifecycle verbatim (`picking`, the
   * generation counter, the attempt ownership check and the capability gate), so
   * a double tap cannot open two native pickers and a late resolve cannot
   * overwrite a newer selection. What differs is only the result: N independent
   * seeds instead of one draft.
   */
  async function pickMemoryBatch(attempt?: MemoryAttempt, owns: (attempt: MemoryAttempt) => boolean = () => true): Promise<MemoryBatchSeed[] | null> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar recuerdos.' });
      return null;
    }
    if (picking) return null;
    picking = true;
    const generation = ++pickerGeneration;
    resetTransientState();
    emitState({ status: 'picking' });
    try {
      const { pickMemoryMediaBatch } = await import('./homecloudMemoryPicker');
      const outcome = await pickMemoryMediaBatch(attempt);
      if (attempt && !owns(attempt)) return null;
      if (outcome.success === false && outcome.cancelled === true) {
        emitState({ status: 'idle', error: undefined });
        return null;
      }
      if (outcome.success === false) {
        emitState({ status: 'failed', error: outcome.error, permissionDenied: outcome.permissionDenied, canAskAgain: outcome.canAskAgain });
        return null;
      }
      emitState({ status: 'idle', error: undefined });
      return outcome.seeds;
    } catch (error) {
      if (attempt && !owns(attempt)) return null;
      emitState({ status: 'failed', error: error instanceof Error ? error.message : 'No pudimos seleccionar la foto o el video.' });
      return null;
    } finally {
      if (pickerGeneration === generation) picking = false;
    }
  }

  async function runSourcePicker(pick: () => Promise<MemoryPickerOutcome>, attempt?: MemoryAttempt, owns: (attempt: MemoryAttempt) => boolean = () => true): Promise<BinaryMemoryDraft | null> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar recuerdos.' });
      return null;
    }

    if (picking) return null;
    picking = true;
    const generation = ++pickerGeneration;
    resetTransientState();
    emitState({ status: 'picking' });

    try {
      const outcome = await pick();
      if (attempt && !owns(attempt)) return null;

      if (outcome.success === false && outcome.cancelled === true) {
        emitState({ status: 'idle', error: undefined });
        return null;
      }

      if (outcome.success === false) {
        emitState({ status: 'failed', error: outcome.error, permissionDenied: outcome.permissionDenied, canAskAgain: outcome.canAskAgain });
        return null;
      }

      emitState({ status: 'idle', error: undefined });
      return { artifact: outcome.artifact, capture: outcome.capture, source: outcome.source };
    } catch (error) {
      if (attempt && !owns(attempt)) return null;
      emitState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'No pudimos seleccionar la foto o el video.',
      });
      return null;
    } finally {
      if (pickerGeneration === generation) picking = false;
    }
  }


  function createBinaryMemory(draft: BinaryMemoryDraft, metadata: BinaryMemoryMetadata, attempt?: MemoryAttempt): Promise<string | null> {
    const key = attempt?.id ?? draft.artifact.localUri;
    if (acceptedDraftKey === key && acceptedJobId) return Promise.resolve(acceptedJobId);
    if (acceptanceInFlight?.key === key) return acceptanceInFlight.promise;
    const promise = createBinaryMemoryInner(draft, metadata, attempt).then((jobId) => {
      if (jobId) acceptedDraftKey = key;
      return jobId;
    }).finally(() => { if (acceptanceInFlight?.promise === promise) acceptanceInFlight = null; });
    acceptanceInFlight = { key, promise };
    return promise;
  }

  async function createBinaryMemoryInner(draft: BinaryMemoryDraft, metadata: BinaryMemoryMetadata, attempt?: MemoryAttempt): Promise<string | null> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar recuerdos.' });
      return null;
    }
    // T1 shared-queue contract: EVERY submit creates and persists its own
    // job. A second submit while one is active queues behind it â€” it is
    // never dropped. The picker already staged the artifact durable.
    let job: UploadJob;
    try {
      job = await queue.enqueue(
        {
          role: 'memory',
          intakeSource: config.intakeSource ?? 'memories:picker',
          initialAlbumId: metadata.initialAlbumId,
          caption: metadata.caption,
          capturedAt: metadata.capturedAt,
          capturedYear: metadata.capturedYear,
          capturedMonth: metadata.capturedMonth,
          capturePrecision: metadata.capturePrecision,
        },
        draft.artifact,
      );
    } catch (error) {
      emitState({
        status: 'failed',
        error: homeCloudUploadErrorMessage(error, 'No pudimos guardar este recuerdo.'),
        albumId: metadata.initialAlbumId,
        albumName: availableAlbums.find((album) => album.id === metadata.initialAlbumId)?.name ?? null,
      });
      return null;
    }

    if (attempt) memoryAttemptTrace(attempt, 'job_created', { jobId: job.id });
    memoryDevTrace('createJob', { source: draft.source, jobId: job.id });

    // PRESENTATION BINDING: from this point the Review projects ONLY this job.
    acceptedJobId = job.id;

    const latest = store.get(job.id) ?? job;
    emitState({
      status: mapEngineStateToIntakeState(latest),
      contentId: latest.contentId ?? undefined,
      error: latest.error?.message,
      albumId: metadata.initialAlbumId,
      albumName: availableAlbums.find((album) => album.id === metadata.initialAlbumId)?.name ?? null,
    });
    return job.id;
  }

  function selectDestination(albumId: string | null, albumName: string | null): void {
    selectedAlbumId = albumId;
    selectedAlbumName = albumId === 'root' ? null : albumName;
    availableAlbums = availableAlbums.map((d) => ({ ...d, isCurrent: d.id === (albumId ?? 'root') }));
    emitState({ albumId: selectedAlbumId, albumName: selectedAlbumName, invalidAlbum: false });
  }

  async function retry(): Promise<void> {
    // Retry is bound to the accepted job ONLY. There is deliberately no
    // "most recent memory job in the household" fallback: that fallback is what
    // let a Review re-run a job the user never accepted.
    const job = acceptedJob();
    if (!job) return;
    emitState({ status: 'preparing', error: undefined });
    try {
      await coordinator.retry(job.id);
      const completedJob = store.get(job.id) ?? job;
      emitState({
        status: mapEngineStateToIntakeState(completedJob),
        contentId: completedJob.contentId ?? undefined,
        error: undefined,
      });
    } catch (error) {
      emitState({
        status: 'failed',
        error: homeCloudUploadErrorMessage(error, 'No pudimos guardar este recuerdo.'),
      });
    }
  }

  function cancel(): void {
    // Cancel targets the accepted job; the queue fallback exists only so the
    // surface can still stop a pending memory job it created in this session.
    const job = acceptedJob() ?? firstMemoryQueueJob();
    if (job) {
      // Single-job cancel: neighbors keep progressing via the queue pump.
      void queue.cancelJob(job.id).then((cancelled) => {
        if (cancelled) emitState({ status: 'cancelled' });
      });
    }
  }

  /**
   * CLOSE contract: leave the surface ready to open again. Releases the picker
   * guard (so a native presentation that never settled can never brick Create)
   * and drops every transient flag AND the job binding, so the next Review
   * starts from a clean owner.
   */
  function dismiss(): void {
    pickerGeneration += 1;
    picking = false;
    acceptedJobId = null;
    acceptedDraftKey = null;
    resetTransientState();
    emitState({ status: 'idle' });
  }


  function subscribe(listener: (state: MemoryIntakeState) => void): () => void {
    stateListeners.add(listener);
    listener(currentState);
    const unsubscribeQueue = queue.subscribe(syncQueueState);
    return () => { stateListeners.delete(listener); unsubscribeQueue(); };
  }

  function getAvailableDestinations(): MemoryIntakeDestination[] {
    return availableAlbums;
  }

  function getInitialAlbum(): { albumId: string | null; albumName: string | null } {
    return { albumId: selectedAlbumId, albumName: selectedAlbumName };
  }

  function hasAlbumContext(): boolean {
    return initialAlbumId != null;
  }

  /**
   * Canonical shared recovery entry point for memory intake. Ensures the ONE
   * process-wide upload runtime (startup hydrate + sweep + reconnect owner)
   * and resumes interrupted memory jobs for this Household. Safe to call on
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
      void coordinator.requestPump('memory_mount');
    } catch {
      // Recovery is best-effort; explicit retry of the same job remains.
    }
  }

  /**
   * ST-10.E — ONE USER ACTION, N AUTHORIZED JOBS.
   *
   * This is a COORDINATION SURFACE, not a new pipeline. Every item goes through
   * the exact same `queue.enqueue(..., role: 'memory')` the single-item path
   * already uses, so it inherits the shared engine's register → authorize →
   * upload → verify → finalize chain, its per-job `intakeRequestId` idempotency
   * and its durable recovery. Nothing here forks, wraps or replaces the upload
   * engine, and no bulk endpoint is invented.
   *
   * The result is deliberately NOT transactional. Each item is reported with the
   * real state of its own job, because N independent uploads cannot be undone
   * together and pretending otherwise would be a lie about the user's data.
   */
  let acceptedBatchKey: string | null = null;
  let batchJobIds: string[] = [];

  async function createBinaryMemories(items: readonly MemoryBatchSubmissionItem[], batchKey: string): Promise<MemoryBatchAcceptedItem[]> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar recuerdos.' });
      return [];
    }
    // DOUBLE-SUBMIT GUARD, synchronous and authoritative: a second press of the
    // same batch returns the SAME job ids instead of enqueueing them twice.
    if (acceptedBatchKey === batchKey && batchJobIds.length > 0) {
      return batchAcceptedItems(batchJobIds);
    }
    if (items.length === 0) return [];
    acceptedBatchKey = batchKey;
    const accepted: MemoryBatchAcceptedItem[] = [];
    for (const item of items) {
      try {
        const job = await queue.enqueue(
          {
            role: 'memory',
            intakeSource: config.intakeSource ?? 'memories:picker',
            initialAlbumId: item.metadata.initialAlbumId,
            caption: item.metadata.caption,
            capturedAt: item.metadata.capturedAt,
            capturedYear: item.metadata.capturedYear,
            capturedMonth: item.metadata.capturedMonth,
            capturePrecision: item.metadata.capturePrecision,
          },
          item.draft.artifact,
        );
        batchJobIds.push(job.id);
        accepted.push({ draftId: item.draftId, jobId: job.id });
      } catch (error) {
        // A refused enqueue is an HONEST per-item failure, never a silent skip.
        accepted.push({ draftId: item.draftId, jobId: null, error: homeCloudUploadErrorMessage(error, 'No pudimos guardar este recuerdo.') });
      }
    }
    // PRESENTATION BINDING: the batch's accepted jobs are what the summary
    // projects, never "the latest memory job in the household".
    emitState({ status: batchAggregateStatus() });
    return accepted;
  }

  function batchAcceptedItems(jobIds: readonly string[]): MemoryBatchAcceptedItem[] {
    return jobIds.map((jobId) => ({ draftId: jobId, jobId }));
  }

  /**
   * The REAL state of every job this batch created, read from the durable store
   * rather than from any optimistic local flag. The vocabulary is the engine's
   * own (`UploadJobState`), never an invented batch lifecycle.
   */
  function batchJobStates(jobIds: readonly string[]): MemoryBatchJobState[] {
    return jobIds.map((jobId) => {
      const job = store.get(jobId);
      return {
        jobId,
        displayName: job?.artifact.displayName ?? 'recuerdo',
        state: job?.state ?? 'failed',
        contentId: job?.contentId ?? null,
        retryable: job?.error?.retryable === true,
        error: job?.error?.message ?? null,
      };
    });
  }

  function batchAggregateStatus(): MemoryIntakeState['status'] {
    const states = batchJobStates(batchJobIds);
    if (states.length === 0) return 'idle';
    if (states.every((job) => job.state === 'completed')) return 'completed';
    if (states.some((job) => job.state === 'failed')) return 'failed';
    if (states.some((job) => job.state === 'cancelled')) return 'cancelled';
    if (states.some((job) => job.state === 'finalizing' || job.state === 'verifying')) return 'finalizing';
    if (states.some((job) => job.state === 'uploading' || job.state === 'registered')) return 'uploading';
    return 'preparing';
  }

  /**
   * FAILED-ONLY RETRY. Only the ids passed in are retried, so an item that
   * already reached `completed` is never re-uploaded and never re-registered.
   * Each retry reuses the same coordinator path the global activity band uses,
   * which is idempotent per job.
   */
  async function retryBatchJobs(jobIds: readonly string[]): Promise<void> {
    resetTransientState();
    for (const jobId of jobIds) await coordinator.retry(jobId);
    emitState({ status: batchAggregateStatus() });
  }

  /**
   * CANCEL A SUBSET. Only the ids passed in are cancelled. Items already
   * `completed` are refused by the coordinator, so this can never claim a
   * finalized Memory was undone.
   */
  async function cancelBatchJobs(jobIds: readonly string[]): Promise<number> {
    let cancelled = 0;
    for (const jobId of jobIds) {
      const result = await queue.cancelJob(jobId);
      if (result) cancelled += 1;
    }
    emitState({ status: batchAggregateStatus() });
    return cancelled;
  }

  function dismissBatch(): void {
    acceptedBatchKey = null;
    batchJobIds = [];
  }

  function canShowDestinationSelector(): boolean {
    // Root + at least one Album, and no inherited Album context (context already
    // resolved intent â†’ don't ask again).
    return availableAlbums.length > 1 && !hasAlbumContext();
  }

  /**
   * "Is there a job THIS Review owns?" â€” never "does the household have any
   * job?". Answering the household question made an unsubmitted draft look
   * protected by a foreign job and let a foreign failure decide this UI.
   */
  function hasActiveJob(): boolean {
    const job = acceptedJob();
    return job !== null && job.state !== 'completed' && job.state !== 'cancelled';
  }

  return {
    pickMemory,
    pickMemoryBatch,
    pickAudio,
    createBinaryMemory,
    createBinaryMemories,
    batchJobStates,
    retryBatchJobs,
    cancelBatchJobs,
    dismissBatch,
    selectDestination,
    retry,
    cancel,
    dismiss,
    subscribe,
    getAvailableDestinations,
    getInitialAlbum,
    canShowDestinationSelector,
    hasAlbumContext,
    /**
     * Re-read the Album destinations. Neutral by design: this service owns no
     * Album management, so it never names a create/rename/delete operation.
     */
    reloadDestinations,
    recover,
    hasActiveJob,
    /** The job this surface is bound to (null before the first submit). */
    getAcceptedJobId: () => acceptedJobId,
    /** The job ids this batch created, in submission order. */
    getBatchJobIds: () => [...batchJobIds],
    /** Compat projection over the shared queue (never separate authority). */
    getCurrentJob: () => queue.getCurrentJob(),
  };
}
