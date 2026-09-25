import { createUploadEngine, createFetchArtifactReader, createExpoFileSystemUploadTransport } from './homecloudUploadEngine';
import { createAsyncStorageUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { fetchHomeCloudFoldersCached } from './homecloudReadService';
import { copyArtifactToDurableWorkspace } from './homecloudDurableArtifact';
import type { FileIntakeConfig, FileIntakeState, FileIntakeDestination } from './homecloudFileIntakeTypes';
import type { UploadJob, UploadLocalArtifact } from './homecloudUploadTypes';

export function createFileIntakeService(config: FileIntakeConfig) {
  const { householdId, accessToken, capabilities, initialFolderId, initialFolderName } = config;

  const store = createAsyncStorageUploadJobStore();
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
   */
  async function submitArtifact(artifact: UploadLocalArtifact): Promise<void> {
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
      emitState({
        status: mapEngineStateToIntakeState(completedJob),
        contentId: completedJob.contentId ?? undefined,
        folderId: selectedFolderId,
        folderName: selectedFolderName,
      });
    } catch (error) {
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
    if (!currentJob) return;
    emitState({ status: 'preparing', error: undefined });
    try {
      const completedJob = await engine.run(currentJob.id);
      emitState({
        status: mapEngineStateToIntakeState(completedJob),
        contentId: completedJob.contentId ?? undefined,
        error: undefined,
      });
    } catch (error) {
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
    return currentJob !== null;
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
  };
}
