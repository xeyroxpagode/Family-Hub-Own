import { createUploadEngine, createFetchArtifactReader, createExpoFileSystemUploadTransport } from './homecloudUploadEngine';
import { getSharedUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { recoverUploadJobs } from './homecloudUploadRecovery';
import { fetchHomeCloudAlbumsCached } from './homecloudReadService';
import type { BinaryMemoryDraft, BinaryMemoryMetadata, MemoryIntakeConfig, MemoryIntakeState, MemoryIntakeDestination } from './homecloudMemoryIntakeTypes';
import type { UploadJob } from './homecloudUploadTypes';
import type { MemoryPickerOutcome } from './homecloudMemoryPicker';
import { memoryAttemptTrace, memoryDevTrace } from './homecloudMemoryDiagnostics';
import type { MemoryAttempt } from './homecloudMemoryAttempt';
import { homeCloudUploadErrorMessage } from './homecloudUploadError';

/**
 * HomeCloud HC-2C — Memory Intake service.
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
  const reader = createFetchArtifactReader();
  const uploadTransport = createExpoFileSystemUploadTransport();

  const engine = createUploadEngine({
    store,
    readArtifact: reader,
    uploadTransport,
    getAccessToken,
    getHouseholdId: () => householdId,
  });

  let currentJob: UploadJob | null = null;
  let selectedAlbumId: string | null = initialAlbumId ?? null;
  let selectedAlbumName: string | null = initialAlbumName ?? null;
  let availableAlbums: MemoryIntakeDestination[] = [];
  let albumsLoaded = false;
  let picking = false;
  let stateListeners: Set<(state: MemoryIntakeState) => void> = new Set();

  const baseState: MemoryIntakeState = { status: 'idle' };
  let currentState: MemoryIntakeState = baseState;

  function emitState(partial: Partial<MemoryIntakeState>) {
    currentState = { ...currentState, ...partial };
    stateListeners.forEach((listener) => listener(currentState));
  }

  /** Drop every transient flag left behind by a previous attempt. */
  function resetTransientState(): void {
    emitState({ error: undefined, contentId: undefined, invalidAlbum: false, permissionDenied: false, canAskAgain: undefined });
  }


  async function loadAlbums(): Promise<void> {
    if (albumsLoaded) return;
    try {
      const token = getAccessToken();
      if (!token) throw new Error('no access token');
      const albums = await fetchHomeCloudAlbumsCached(token, { householdId });
      availableAlbums = [
        { id: 'root', name: 'Recuerdos', isCurrent: selectedAlbumId === null },
        ...albums.map((a) => ({ id: a.id, name: a.name, isCurrent: a.id === selectedAlbumId })),
      ];
      // If the inherited Album context no longer resolves, surface it instead of
      // silently continuing as root Memories.
      if (selectedAlbumId && !albums.some((a) => a.id === selectedAlbumId)) {
        emitState({ invalidAlbum: true });
      }
      albumsLoaded = true;
    } catch {
      availableAlbums = [{ id: 'root', name: 'Recuerdos', isCurrent: selectedAlbumId === null }];
      albumsLoaded = true;
    }
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

  async function pickAudio(attempt?: MemoryAttempt, owns: (attempt: MemoryAttempt) => boolean = () => true): Promise<BinaryMemoryDraft | null> {
    return runSourcePicker(async () => {
      const { pickAudioMemory } = await import('./homecloudMemoryPicker');
      return pickAudioMemory(attempt);
    }, attempt, owns);
  }

  async function runSourcePicker(pick: () => Promise<MemoryPickerOutcome>, attempt?: MemoryAttempt, owns: (attempt: MemoryAttempt) => boolean = () => true): Promise<BinaryMemoryDraft | null> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar recuerdos.' });
      return null;
    }

    if (picking) return null;
    picking = true;
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
      return { artifact: outcome.artifact, capture: outcome.capture, source: outcome.source, durationMillis: outcome.durationMillis };
    } catch (error) {
      if (attempt && !owns(attempt)) return null;
      emitState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'No pudimos seleccionar la foto o el video.',
      });
      return null;
    } finally {
      picking = false;
    }
  }


  async function createBinaryMemory(draft: BinaryMemoryDraft, metadata: BinaryMemoryMetadata, attempt?: MemoryAttempt): Promise<void> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar recuerdos.' });
      return;
    }
    if (currentJob && !['completed', 'failed', 'cancelled'].includes(currentJob.state)) return;

    const job = engine.createJob(
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

    currentJob = job;
    if (attempt) memoryAttemptTrace(attempt, 'job_created', { jobId: job.id });
    memoryDevTrace('createJob', { source: draft.source, jobId: job.id });

    emitState({
      status: 'preparing',
      albumId: metadata.initialAlbumId,
      albumName: availableAlbums.find((album) => album.id === metadata.initialAlbumId)?.name ?? null,
    });

    try {
      const completedJob = await engine.run(job.id);
      currentJob = completedJob;
      emitState({
        status: mapEngineStateToIntakeState(completedJob),
        contentId: completedJob.contentId ?? undefined,
        albumId: metadata.initialAlbumId,
        albumName: availableAlbums.find((album) => album.id === metadata.initialAlbumId)?.name ?? null,
      });
    } catch (error) {
      const latest = store.get(job.id);
      if (latest) currentJob = latest;
      emitState({
        status: 'failed',
        error: homeCloudUploadErrorMessage(error, 'No pudimos guardar este recuerdo.'),
        albumId: metadata.initialAlbumId,
        albumName: availableAlbums.find((album) => album.id === metadata.initialAlbumId)?.name ?? null,
      });
    }
  }

  function selectDestination(albumId: string | null, albumName: string | null): void {
    selectedAlbumId = albumId;
    selectedAlbumName = albumId === 'root' ? null : albumName;
    availableAlbums = availableAlbums.map((d) => ({ ...d, isCurrent: d.id === (albumId ?? 'root') }));
    emitState({ albumId: selectedAlbumId, albumName: selectedAlbumName, invalidAlbum: false });
  }

  async function retry(): Promise<void> {
    let job = currentJob;
    if (!job) {
      // Service instance recreated after remount: resume the most recent
      // retryable memory job from the shared store instead of losing it.
      const candidates = store
        .all()
        .filter((j) => j.householdId === householdId && j.role === 'memory' && j.state !== 'completed' && j.state !== 'cancelled')
        .sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0));
      job = candidates[candidates.length - 1] ?? null;
      currentJob = job;
    }
    if (!job) return;
    emitState({ status: 'preparing', error: undefined });
    try {
      const completedJob = await engine.run(job.id);
      currentJob = completedJob;
      emitState({
        status: mapEngineStateToIntakeState(completedJob),
        contentId: completedJob.contentId ?? undefined,
        error: undefined,
      });
    } catch (error) {
      const latest = store.get(job.id);
      if (latest) currentJob = latest;
      emitState({
        status: 'failed',
        error: homeCloudUploadErrorMessage(error, 'No pudimos guardar este recuerdo.'),
      });
    }
  }

  function cancel(): void {
    if (currentJob) {
      engine.cancel(currentJob.id);
      emitState({ status: 'cancelled' });
    }
  }

  /**
   * CLOSE contract: leave the surface ready to open again. Releases the picker
   * guard (so a native presentation that never settled can never brick Create)
   * and drops every transient flag.
   */
  function dismiss(): void {
    picking = false;
    currentJob = null;
    resetTransientState();
    emitState({ status: 'idle' });
  }

  function subscribe(listener: (state: MemoryIntakeState) => void): () => void {
    stateListeners.add(listener);
    listener(currentState);
    return () => stateListeners.delete(listener);
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
   * Canonical shared recovery entry point for memory intake. Hydrates the
   * durable store and resumes interrupted memory jobs for this Household.
   * Safe to call on every mount; no-ops when nothing is recoverable.
   */
  async function recover(): Promise<void> {
    if (!householdId || !getAccessToken()) return;
    try {
      await recoverUploadJobs({
        store,
        householdId,
        role: 'memory',
        run: (jobId) => engine.run(jobId),
        onJob: (job) => {
          currentJob = job;
          emitState({
            status: mapEngineStateToIntakeState(job),
            contentId: job.contentId ?? undefined,
            error: job.error?.message,
            albumId: selectedAlbumId,
            albumName: selectedAlbumName,
          });
        },
      });
    } catch {
      // Recovery is best-effort; explicit retry of the same job remains.
    }
  }

  function canShowDestinationSelector(): boolean {
    // Root + at least one Album, and no inherited Album context (context already
    // resolved intent → don't ask again).
    return availableAlbums.length > 1 && !hasAlbumContext();
  }

  function hasActiveJob(): boolean {
    return currentJob !== null;
  }

  return {
    pickMemory,
    pickAudio,
    createBinaryMemory,
    selectDestination,
    retry,
    cancel,
    dismiss,
    subscribe,
    getAvailableDestinations,
    getInitialAlbum,
    canShowDestinationSelector,
    hasAlbumContext,
    loadAlbums,
    recover,
    hasActiveJob,
  };
}
