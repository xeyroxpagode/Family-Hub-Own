import { createUploadEngine, createFetchArtifactReader, createExpoFileSystemUploadTransport } from './homecloudUploadEngine';
import { getSharedUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { AUTO_RECOVERABLE_STATES, listRecoverableJobs, recoverUploadJobs } from './homecloudUploadRecovery';
import { fetchHomeCloudFoldersCached } from './homecloudReadService';
import { copyArtifactToDurableWorkspace } from './homecloudDurableArtifact';
import type { FileIntakeConfig, FileIntakeState, FileIntakeDestination } from './homecloudFileIntakeTypes';
import type { UploadJob, UploadLocalArtifact } from './homecloudUploadTypes';

export function createFileIntakeService(config: FileIntakeConfig) {
  const { householdId, accessToken, capabilities, initialFolderId, initialFolderName } = config;

  // Shared process-wide store: every intake surface (Files, Scanner, dev)
  // observes the same durable jobs, so a remount never loses the active job
  // and retry resumes it instead of registering a duplicate.
  const store = getSharedUploadJobStore();
  const reader = createFetchArtifactReader();
  const uploadTransport = createExpoFileSystemUploadTransport();

  const engine = createUploadEngine({
    store,
    readArtifact: reader,
    uploadTransport,
    getAccessToken: () => accessToken,
    getHouseholdId: () => householdId,
  });

  let currentJob: UploadJob | null = null;
  let selectedFolderId: string | null = initialFolderId ?? null;
  let selectedFolderName: string | null = initialFolderName ?? null;
  let availableFolders: FileIntakeDestination[] = [];
  let foldersLoaded = false;
  let stateListeners: Set<(state: FileIntakeState) => void> = new Set();

  const baseState: FileIntakeState = {
    status: 'idle',
  };

  function emitState(partial: Partial<FileIntakeState>) {
    const newState = { ...baseState, ...partial };
    stateListeners.forEach((listener) => listener(newState));
  }

  async function loadFolders(): Promise<void> {
    if (foldersLoaded) return;
    try {
      const folders = await fetchHomeCloudFoldersCached(accessToken, { householdId });
      availableFolders = [
        { id: 'root', name: 'Archivos', isCurrent: selectedFolderId === null },
        ...folders.map((f) => ({ id: f.id, name: f.name, isCurrent: f.id === selectedFolderId })),
      ];
      foldersLoaded = true;
    } catch {
      availableFolders = [{ id: 'root', name: 'Archivos', isCurrent: selectedFolderId === null }];
      foldersLoaded = true;
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

    emitState({ status: 'picking' });

    const { pickFile: pickFileImpl } = await import('./homecloudFilePicker');
    const outcome = await pickFileImpl();

    if (outcome.success === false && outcome.cancelled === true) {
      emitState({ status: 'cancelled' });
      return;
    }

    if (outcome.success === false) {
      emitState({ status: 'failed', error: outcome.error });
      return;
    }

    await submitArtifact(outcome.artifact);
  }

  /**
   * Capture-source agnostic handoff: any intake adapter (document picker,
   * scanner, ...) can submit a local artifact and reuse the same durable
   * workspace copy, UploadJob lifecycle and retry semantics.
   *
   * If this service instance already owns a job that is still moving forward,
   * the SAME job is resumed (no new register/content_id). A genuinely new
   * artifact after a terminal/failed job starts a new job; the failed record
   * stays in the store for explicit retry and later cleanup.
   */
  async function submitArtifact(artifact: UploadLocalArtifact): Promise<void> {
    if (currentJob && AUTO_RECOVERABLE_STATES.has(currentJob.state)) {
      const stored = store.get(currentJob.id) ?? currentJob;
      currentJob = stored;
      emitState({ status: 'preparing', folderId: selectedFolderId, folderName: selectedFolderName });
      try {
        const completedJob = await engine.run(stored.id);
        currentJob = completedJob;
        emitState({
          status: mapEngineStateToIntakeState(completedJob),
          contentId: completedJob.contentId ?? undefined,
          folderId: selectedFolderId,
          folderName: selectedFolderName,
        });
      } catch (error) {
        const latest = store.get(stored.id);
        if (latest) currentJob = latest;
        emitState({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Error al subir el archivo.',
          folderId: selectedFolderId,
          folderName: selectedFolderName,
        });
      }
      return;
    }

    let durableArtifact: UploadLocalArtifact;
    try {
      // Idempotent: artifacts already inside the durable workspace pass through.
      durableArtifact = await copyArtifactToDurableWorkspace(artifact);
    } catch (error) {
      emitState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Error al preparar el archivo.',
        folderId: selectedFolderId,
        folderName: selectedFolderName,
      });
      return;
    }

    const job = engine.createJob(
      {
        role: 'file',
        intakeSource: config.intakeSource ?? 'files:picker',
        initialFolderId: selectedFolderId,
      },
      durableArtifact
    );

    currentJob = job;

    emitState({
      status: 'preparing',
      folderId: selectedFolderId,
      folderName: selectedFolderName,
    });

    try {
      const completedJob = await engine.run(job.id);
      currentJob = completedJob;
      emitState({
        status: mapEngineStateToIntakeState(completedJob),
        contentId: completedJob.contentId ?? undefined,
        folderId: selectedFolderId,
        folderName: selectedFolderName,
      });
    } catch (error) {
      const latest = store.get(job.id);
      if (latest) currentJob = latest;
      emitState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Error al subir el archivo.',
        folderId: selectedFolderId,
        folderName: selectedFolderName,
      });
    }
  }

  function selectDestination(folderId: string | null, folderName: string | null): void {
    selectedFolderId = folderId;
    selectedFolderName = folderId === 'root' ? null : folderName;
    availableFolders = availableFolders.map((f) => ({ ...f, isCurrent: f.id === (folderId ?? 'root') }));
    emitState({ folderId: selectedFolderId, folderName: selectedFolderName });
  }

  async function retry(): Promise<void> {
    let job = currentJob;
    if (!job) {
      // Service instance recreated after remount: fall back to the most
      // recent retryable job in the shared store (same Household + role),
      // so retry resumes the SAME job instead of forcing a new upload.
      const candidates = store
        .all()
        .filter((j) => j.householdId === householdId && j.role === 'file' && j.state !== 'completed' && j.state !== 'cancelled')
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
        error: error instanceof Error ? error.message : 'Error al reintentar.',
      });
    }
  }

  function cancel(): void {
    if (currentJob) {
      engine.cancel(currentJob.id);
      emitState({ status: 'cancelled' });
    }
  }

  function dismiss(): void {
    currentJob = null;
    emitState({ status: 'idle', error: undefined, contentId: undefined });
  }

  function subscribe(listener: (state: FileIntakeState) => void): () => void {
    stateListeners.add(listener);
    listener(baseState);
    return () => stateListeners.delete(listener);
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

  function hasActiveJob(): boolean {
    if (currentJob && currentJob.state !== 'completed' && currentJob.state !== 'cancelled') return true;
    // Remount-safe: the in-memory handle may be gone while the durable job
    // still exists in the shared store.
    return listRecoverableJobs(store, householdId, 'file').length > 0
      || store.all().some((j) => j.householdId === householdId && j.role === 'file' && j.state === 'failed');
  }

  /**
   * Canonical shared recovery entry point for file intake. Hydrates the
   * durable store and resumes interrupted file jobs for this Household.
   * Safe to call on every mount; no-ops when nothing is recoverable.
   */
  async function recover(): Promise<void> {
    if (!householdId || !accessToken) return;
    try {
      await recoverUploadJobs({
        store,
        householdId,
        role: 'file',
        run: (jobId) => engine.run(jobId),
        onJob: (job) => {
          currentJob = job;
          emitState({
            status: mapEngineStateToIntakeState(job),
            contentId: job.contentId ?? undefined,
            error: job.error?.message,
            folderId: selectedFolderId,
            folderName: selectedFolderName,
          });
        },
      });
    } catch {
      // Recovery is best-effort; explicit retry of the same job remains.
    }
  }

  return {
    pickFile,
    submitArtifact,
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
  };
}
