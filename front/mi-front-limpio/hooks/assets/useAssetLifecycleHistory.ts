import { useCallback, useEffect, useRef, useState } from 'react';

import {
  assetsCache,
  assetsKeys,
  getArchiveHistory,
  getTrashHistory,
  type AssetArchiveEpisodeDto,
  type AssetTrashEpisodeDto,
  type LifecycleHistoryEpisode,
} from '../../services/assets';

function normalizeArchiveEpisode(raw: unknown): LifecycleHistoryEpisode {
  const episode = (raw ?? {}) as AssetArchiveEpisodeDto;
  const isClosed = episode.unarchived_at !== null;
  return {
    id: episode.id,
    kind: 'archive',
    action: isClosed ? 'UNARCHIVED' : 'ARCHIVED',
    timestamp: isClosed ? episode.unarchived_at! : episode.archived_at,
    from_lifecycle: episode.from_lifecycle,
    to_lifecycle: isClosed ? episode.unarchived_to : 'ARCHIVED',
    disposition: episode.disposition,
    note: episode.disposition_note,
    episode_number: episode.episode_number,
    last_context: episode.last_context,
  };
}

function normalizeTrashEpisode(raw: unknown): LifecycleHistoryEpisode {
  const episode = (raw ?? {}) as AssetTrashEpisodeDto;
  const isClosed = episode.restored_at !== null;
  return {
    id: episode.id,
    kind: 'trash',
    action: isClosed ? 'RESTORED' : 'TRASHED',
    timestamp: isClosed ? episode.restored_at! : episode.trashed_at,
    from_lifecycle: episode.from_lifecycle,
    to_lifecycle: isClosed ? episode.restored_to : 'TRASH',
    disposition: null,
    note: null,
    episode_number: episode.episode_number,
    last_context: null,
  };
}

export type AssetLifecycleHistoryState = {
  episodes: LifecycleHistoryEpisode[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * O35 — Lifecycle History mínimo. Fetch + normalización a projection UI
 * compartida. Orden determinista: timestamp descendente.
 *
 * Cache: assetsKeys.history (household-scoped). Invalidación automática
 * tras archive/unarchive/trash/restore vía mutations.ts → assetsCache.
 * No request storm: requestSeq descarta respuestas obsoletas.
 */
export function useAssetLifecycleHistory(
  accessToken: string | null,
  householdId: string | null,
  assetId: string | null,
): AssetLifecycleHistoryState {
  const [episodes, setEpisodes] = useState<LifecycleHistoryEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const runFetch = useCallback(async () => {
    if (!accessToken || !householdId || !assetId) return;
    const sequence = (requestSeq.current += 1);
    setLoading(true);
    setError(null);

    const archiveKey = assetsKeys.history({ householdId }, assetId, 'archive');
    const trashKey = assetsKeys.history({ householdId }, assetId, 'trash');

    const cachedArchive = assetsCache.get<AssetArchiveEpisodeDto[]>(archiveKey);
    const cachedTrash = assetsCache.get<AssetTrashEpisodeDto[]>(trashKey);

    if (cachedArchive && cachedTrash) {
      const merged = [
        ...cachedArchive.map(normalizeArchiveEpisode),
        ...cachedTrash.map(normalizeTrashEpisode),
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      if (sequence !== requestSeq.current) return;
      setEpisodes(merged);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const [archiveRes, trashRes] = await Promise.all([
        getArchiveHistory(accessToken, assetId).catch(() => null),
        getTrashHistory(accessToken, assetId).catch(() => null),
      ]);

      if (sequence !== requestSeq.current) return;

      const archiveEpisodes = archiveRes?.episodes ?? [];
      const trashEpisodes = trashRes?.episodes ?? [];

      assetsCache.set(archiveKey, archiveEpisodes);
      assetsCache.set(trashKey, trashEpisodes);

      const merged = [
        ...archiveEpisodes.map(normalizeArchiveEpisode),
        ...trashEpisodes.map(normalizeTrashEpisode),
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      setEpisodes(merged);
      setError(null);
    } catch (caught) {
      if (sequence !== requestSeq.current) return;
      const message =
        caught && typeof caught === 'object' && 'message' in caught
          ? String((caught as { message: unknown }).message)
          : 'No pudimos cargar el historial.';
      setError(message);
    } finally {
      if (sequence === requestSeq.current) setLoading(false);
    }
  }, [accessToken, householdId, assetId]);

  useEffect(() => {
    requestSeq.current += 1;
    if (!accessToken || !householdId || !assetId) {
      setEpisodes([]);
      setLoading(false);
      setError(null);
      return;
    }
    setEpisodes([]);
    void runFetch();
  }, [accessToken, householdId, assetId, runFetch]);

  const reload = useCallback(() => void runFetch(), [runFetch]);

  return { episodes, loading, error, reload };
}
