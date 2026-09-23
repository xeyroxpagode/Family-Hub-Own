import { createUploadEngine, createFetchArtifactReader, createExpoFileSystemUploadTransport } from './homecloudUploadEngine';
import { createAsyncStorageUploadJobStore } from '../../storage/homecloudUploadJobStorage';
import { fetchHomeCloudAlbumsCached } from './homecloudReadService';
import type { MemoryIntakeConfig, MemoryIntakeState, MemoryIntakeDestination } from './homecloudMemoryIntakeTypes';
import type { UploadJob } from './homecloudUploadTypes';

/**
 * HomeCloud HC-2C — Memory Intake service.
 *
 * Reuses the HC-2A Shared Upload Engine (picker-agnostic). The picker adapter
 * produces a neutral UploadLocalArtifact; this service owns Memory semantics:
 * role = 'memory', optional caption, reliable capture metadata (never a fake
 * date), and optional initial Album destination under homecloud.contribute.
 */
export function createMemoryIntakeService(config: MemoryIntakeConfig) {
  const { householdId, accessToken, capabilities, initialAlbumId, initialAlbumName } = config;

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
  let selectedAlbumId: string | null = initialAlbumId ?? null;
  let selectedAlbumName: string | null = initialAlbumName ?? null;
  let availableAlbums: MemoryIntakeDestination[] = [];
  let albumsLoaded = false;
  let stateListeners: Set<(state: MemoryIntakeState) => void> = new Set();

  const baseState: MemoryIntakeState = { status: 'idle' };

  function emitState(partial: Partial<MemoryIntakeState>) {
    const newState = { ...baseState, ...partial };
    stateListeners.forEach((listener) => listener(newState));
  }

  async function loadAlbums(): Promise<void> {
    if (albumsLoaded) return;
    try {
      const albums = await fetchHomeCloudAlbumsCached(accessToken, { householdId });
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

  async function pickMemory(): Promise<void> {
    if (!capabilities.contribute) {
      emitState({ status: 'failed', error: 'No tienes permiso para agregar recuerdos.' });
      return;
    }

    emitState({ status: 'picking' });

    const { pickMemoryMedia } = await import('./homecloudMemoryPicker');
    const outcome = await pickMemoryMedia();

    if (outcome.success === false && outcome.cancelled === true) {
      emitState({ status: 'cancelled' });
      return;
    }

    if (outcome.success === false) {
      emitState({ status: 'failed', error: outcome.error });
      return;
    }

    const { artifact, capturedAt, capturePrecision } = outcome;

    const job = engine.createJob(
      {
        role: 'memory',
        intakeSource: config.intakeSource ?? 'memories:picker',
        initialAlbumId: selectedAlbumId,
        caption: null,
        capturedAt,
        capturePrecision,
      },
      artifact,
    );

    currentJob = job;

    emitState({
      status: 'preparing',
      albumId: selectedAlbumId,
      albumName: selectedAlbumName,
    });

    try {
      const completedJob = await engine.run(job.id);
      emitState({
        status: mapEngineStateToIntakeState(completedJob),
        contentId: completedJob.contentId ?? undefined,
        albumId: selectedAlbumId,
        albumName: selectedAlbumName,
      });
    } catch (error) {
      emitState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'No pudimos guardar este recuerdo.',
        albumId: selectedAlbumId,
        albumName: selectedAlbumName,
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
        error: error instanceof Error ? error.message : 'No pudimos guardar este recuerdo.',
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
    emitState({ status: 'idle', error: undefined, contentId: undefined, invalidAlbum: false });
  }

  function subscribe(listener: (state: MemoryIntakeState) => void): () => void {
    stateListeners.add(listener);
    listener(baseState);
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

  function canShowDestinationSelector(): boolean {
    // Root + at least one Album, and no inherited Album context (context already
    // resolved intent → don't ask again).
    return availableAlbums.length > 1 && !hasAlbumContext();
  }

  return {
    pickMemory,
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
  };
}
