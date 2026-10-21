/**
 * HOMePLUS Assets — S8: the read hook of the attached Files.
 *
 * Caching (frozen):
 *   - the key is `assetsKeys.files(scope, ownerType, ownerId)`, so the
 *     householdId sits at index 2 and two households NEVER share a cache;
 *   - the TTL is 30 s (the `files` entry of the Assets stale config);
 *   - there is NO HomeCloud -> Assets event bus, so freshness comes from the
 *     TTL plus a FORCED revalidation when the surface regains focus.
 *
 * The read never fails the surrounding surface: a failing file section shows
 * a LOCAL ErrorBar and leaves the Asset/Record/Care usable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { ApiError } from '../../services/api';
import { assetsCache } from '../../services/assets/assetsCache';
import { assetsKeys } from '../../services/assets/assetsKeys';
import {
  listAssetFiles,
  type AssetFileOwnerType,
  type AssetFileRelation,
} from '../../services/assets/assetsFiles';

export type AssetFilesState = {
  files: AssetFileRelation[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  errorStatus: number | null;
  /** Re-read the list (bypasses the cache). */
  reload: () => void;
};

export function useAssetFiles(
  accessToken: string | null,
  householdId: string | null,
  ownerType: AssetFileOwnerType,
  ownerId: string | null,
): AssetFilesState {
  const [files, setFiles] = useState<AssetFileRelation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const requestSeq = useRef(0);

  const runFetch = useCallback(
    async (refresh: boolean) => {
      if (!accessToken || !householdId || !ownerId) return;
      const sequence = (requestSeq.current += 1);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await listAssetFiles(accessToken, ownerType, ownerId, {
          contextScope: `assets-files:${householdId}`,
        });
        if (sequence !== requestSeq.current) return;
        const rows = response.files ?? [];
        setFiles(rows);
        assetsCache.set(assetsKeys.files({ householdId }, ownerType, ownerId), rows);
        setError(null);
        setErrorStatus(null);
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        const message =
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos cargar los archivos.';
        setError(message);
        setErrorStatus(caught instanceof ApiError ? caught.status : null);
      } finally {
        if (sequence === requestSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, householdId, ownerId, ownerType],
  );

  useEffect(() => {
    requestSeq.current += 1;
    if (!accessToken || !householdId || !ownerId) {
      setFiles([]);
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    const cached = assetsCache.get<AssetFileRelation[]>(
      assetsKeys.files({ householdId }, ownerType, ownerId),
    );
    if (cached) {
      setFiles(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setFiles([]);
    void runFetch(false);
  }, [accessToken, householdId, ownerId, ownerType, runFetch]);

  // FOCUS revalidation: there is no HomeCloud -> Assets event bus, so the
  // TTL alone would keep a trashed/purged/restored File invisible for a
  // whole window. Re-entering the surface forces a real re-read.
  useFocusEffect(
    useCallback(() => {
      void runFetch(true);
    }, [runFetch]),
  );

  const reload = useCallback(() => void runFetch(true), [runFetch]);

  return { files, loading, refreshing, error, errorStatus, reload };
}
