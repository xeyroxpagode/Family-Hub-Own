import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  assetsCache,
  assetsKeys,
  fetchAssetsCapabilities,
  getAssetById,
  listAssetCare,
  listAssetRecords,
  listAssets,
  type AssetDto,
  type AssetListFilters,
  type AssetRecordDto,
  type AssetsCapabilityProjection,
  type ManualCareDto,
} from '../../services/assets';
import { ApiError } from '../../services/api';

const PAGE_LIMIT = 50;

export type AssetsCapabilitiesState = {
  /** null mientras la proyección todavía no llegó (o si el usuario no es miembro). */
  capabilities: AssetsCapabilityProjection | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const EMPTY_PROJECTION: AssetsCapabilityProjection = {
  'assets.view': false,
  'assets.contribute': false,
  'assets.manage': false,
};

/**
 * Proyección de capabilities del miembro activo (assets.view / contribute /
 * manage).
 *
 * El backend es la autoridad: la proyección se pide al servidor y se cachea
 * por Household. La UI la usa sólo para MOSTRAR o DESHABILITAR controles; el
 * backend vuelve a verificar cada mutación.
 *
 * Fail-closed: mientras la proyección no llegó, ninguna operación de
 * escritura queda habilitada (una pantalla de sólo lectura es preferible a
 * un control que el servidor va a rechazar).
 */
export function useAssetsCapabilities(
  accessToken: string | null,
  householdId: string | null,
): AssetsCapabilitiesState {
  const [capabilities, setCapabilities] = useState<AssetsCapabilityProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const runFetch = useCallback(
    async (refresh: boolean) => {
      if (!accessToken || !householdId) return;
      const sequence = (requestSeq.current += 1);
      if (refresh) setLoading(true);
      else setLoading(true);
      try {
        const response = await fetchAssetsCapabilities(accessToken, {
          contextScope: `assets-capabilities:${householdId}`,
        });
        if (sequence !== requestSeq.current) return;
        const projection = response.capabilities ?? EMPTY_PROJECTION;
        setCapabilities(projection);
        assetsCache.set(assetsKeys.capabilities({ householdId }), projection);
        setError(null);
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        const message =
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos verificar tus permisos.';
        setError(message);
        if (caught instanceof ApiError && (caught.status === 403 || caught.status === 401)) {
          setCapabilities(EMPTY_PROJECTION);
        }
      } finally {
        if (sequence === requestSeq.current) setLoading(false);
      }
    },
    [accessToken, householdId],
  );

  useEffect(() => {
    requestSeq.current += 1;
    if (!accessToken || !householdId) {
      setCapabilities(null);
      setLoading(false);
      setError(null);
      return;
    }
    const key = assetsKeys.capabilities({ householdId });
    const cached = assetsCache.get<AssetsCapabilityProjection>(key);
    if (cached) {
      setCapabilities(cached);
      setLoading(false);
      setError(null);
      // Stale-while-revalidate: si la proyección venció (un permiso puede
      // cambiar en cualquier momento), se refresca sin bloquear la UI.
      if (!assetsCache.isFresh(key)) void runFetch(false);
      return;
    }
    setCapabilities(null);
    void runFetch(false);
  }, [accessToken, householdId, runFetch]);

  const reload = useCallback(() => void runFetch(true), [runFetch]);

  // Reacción a invalidaciones: si la proyección se marca stale (permisos
  // cambiados en la sesión), se refresca; si llega fresca, se adopta.
  useEffect(() => {
    if (!accessToken || !householdId) return undefined;
    const key = assetsKeys.capabilities({ householdId });
    const unsubscribe = assetsCache.subscribe(() => {
      const entry = assetsCache.getEntry<AssetsCapabilityProjection>(key);
      if (!entry) return;
      if (entry.status === 'fresh') {
        setCapabilities(entry.data);
      } else if (entry.status === 'stale') {
        void runFetch(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [accessToken, householdId, runFetch]);

  return { capabilities, loading, error, reload };
}

export type AssetsListState = {
  assets: AssetDto[];
  /** Carga inicial (sin datos mostrados). */
  loading: boolean;
  /** Carga incremental (página siguiente). */
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  nextOffset: number | null;
  reload: () => void;
  loadMore: () => void;
};

type ListScope = NonNullable<AssetListFilters['scope']>;

/**
 * Lista Assets del Household con cache household-scoped, paginación real e
 * ignorancia de respuestas obsoletas (cambio de Household, búsqueda nueva,
 * scroll rápido). El servidor mantiene la paginación: `nextOffset` es
 * evidencia real (fila sonda), no un cálculo local.
 */
export function useAssetsList(
  accessToken: string | null,
  householdId: string | null,
  scope: ListScope,
  filters?: Omit<AssetListFilters, 'limit' | 'offset' | 'scope'>,
): AssetsListState {
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const requestSeq = useRef(0);

  const filterKey = useMemo(
    () => JSON.stringify({ ...(filters ?? {}) }),
    [filters],
  );

  const cacheKey = useMemo(
    () => ['assets', 'assets', householdId ?? '-', 'list', scope, filterKey],
    [filterKey, householdId, scope],
  );

  // Últimos filtros por ref: runFetch debe ser estable entre renders. El caller
  // pasa el objeto filters inline (nueva referencia por render); si runFetch
  // dependiera de esa referencia se recrearía en cada render y el effect de
  // carga dispararía un refetch infinito (request storm / Maximum update
  // depth). filterKey (string estable) es la dependencia real del fetch.
  const filtersRef = useRef<AssetListFilters | undefined>(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const runFetch = useCallback(
    async (options: { offset: number; append: boolean; refresh: boolean }) => {
      if (!accessToken || !householdId) return;
      const sequence = (requestSeq.current += 1);
      if (options.refresh) setRefreshing(true);
      if (options.offset === 0) {
        if (!options.refresh) setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await listAssets(
          accessToken,
          { scope, ...(filtersRef.current ?? {}), limit: PAGE_LIMIT, offset: options.offset },
          { contextScope: `assets-list:${householdId}` },
        );
        if (sequence !== requestSeq.current) return;
        setAssets((current) => {
          const merged = options.append ? [...current, ...response.assets] : response.assets;
          if (householdId) {
            assetsCache.set(
              ['assets', 'assets', householdId, 'list', scope, filterKey],
              { assets: merged, nextOffset: response.nextOffset },
            );
          }
          return merged;
        });
        setNextOffset(response.nextOffset);
        setError(null);
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        const message =
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos cargar tus activos.';
        setError(message);
      } finally {
        if (sequence === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, filterKey, householdId, scope],
  );

  useEffect(() => {
    if (!accessToken || !householdId) {
      setAssets([]);
      setLoading(false);
      setNextOffset(null);
      setError(null);
      return;
    }
    const cached = assetsCache.get<{ assets: AssetDto[]; nextOffset: number | null }>(cacheKey);
    if (cached) {
      setAssets(cached.assets);
      setNextOffset(cached.nextOffset);
      setError(null);
      setLoading(false);
      return;
    }
    setAssets([]);
    setNextOffset(null);
    void runFetch({ offset: 0, append: false, refresh: false });
    // cacheKey cambia junto a scope/filters/household; runFetch es estable.
  }, [accessToken, cacheKey, householdId, runFetch]);

  // Cambio de Household: purga preventiva + se descartan respuestas en vuelo.
  const previousHousehold = useRef<string | null>(householdId);
  useEffect(() => {
    if (previousHousehold.current === householdId) return;
    const stale = previousHousehold.current;
    previousHousehold.current = householdId;
    requestSeq.current += 1;
    if (stale) assetsCache.invalidateHousehold({ householdId: stale });
  }, [householdId]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || refreshing || nextOffset === null) return;
    void runFetch({ offset: nextOffset, append: true, refresh: false });
  }, [loadingMore, loading, refreshing, nextOffset, runFetch]);

  const reload = useCallback(() => {
    void runFetch({ offset: 0, append: false, refresh: true });
  }, [runFetch]);

  return { assets, loading, loadingMore, refreshing, error, nextOffset, reload, loadMore };
}

export type AssetDetailState = {
  asset: AssetDto | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  errorStatus: number | null;
  reload: () => void;
};

/** Un Asset concreto del Household activo. 404 tipado = no encontrado. */
export function useAssetDetail(
  accessToken: string | null,
  householdId: string | null,
  assetId: string | null,
): AssetDetailState {
  const [asset, setAsset] = useState<AssetDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const requestSeq = useRef(0);

  const runFetch = useCallback(
    async (refresh: boolean) => {
      if (!accessToken || !householdId || !assetId) return;
      const sequence = (requestSeq.current += 1);
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await getAssetById(accessToken, assetId, {
          contextScope: `assets-detail:${householdId}`,
        });
        if (sequence !== requestSeq.current) return;
        setAsset(response.asset);
        assetsCache.set(assetsKeys.detail({ householdId }, assetId), response.asset);
        setError(null);
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        const message =
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos cargar este activo.';
        const status =
          caught instanceof ApiError ? caught.status : null;
        setError(message);
        setErrorStatus(status);
      } finally {
        if (sequence === requestSeq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [accessToken, assetId, householdId],
  );

  useEffect(() => {
    requestSeq.current += 1;
    if (!accessToken || !householdId || !assetId) {
      setAsset(null);
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    const cached = assetsCache.get<AssetDto>(assetsKeys.detail({ householdId }, assetId));
    if (cached) {
      setAsset(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setAsset(null);
    void runFetch(false);
  }, [accessToken, assetId, householdId, runFetch]);

  const reload = useCallback(() => void runFetch(true), [runFetch]);

  return { asset, loading, refreshing, error, errorStatus, reload };
}

/** Debounce de búsqueda (180–250 ms) conservando respuesta inmediata visual. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ── Records / Care de un Asset ─────────────────────────────────────────────────

export type AssetRecordsState = {
  records: AssetRecordDto[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useAssetRecords(
  accessToken: string | null,
  householdId: string | null,
  assetId: string | null,
  recordScope: 'active' | 'removed' = 'active',
): AssetRecordsState {
  const [records, setRecords] = useState<AssetRecordDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const runFetch = useCallback(
    async (refresh: boolean) => {
      if (!accessToken || !householdId || !assetId) return;
      const sequence = (requestSeq.current += 1);
      if (!refresh) setLoading(true);
      try {
        const response = await listAssetRecords(accessToken, assetId, recordScope, {
          contextScope: `assets-records:${householdId}`,
        });
        if (sequence !== requestSeq.current) return;
        setRecords(response.records ?? []);
        assetsCache.set(assetsKeys.records({ householdId }, assetId, recordScope), response.records ?? []);
        setError(null);
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        setError(
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos cargar la información.',
        );
      } finally {
        if (sequence === requestSeq.current) setLoading(false);
      }
    },
    [accessToken, assetId, householdId, recordScope],
  );

  useEffect(() => {
    requestSeq.current += 1;
    if (!accessToken || !householdId || !assetId) {
      setRecords([]);
      setError(null);
      return;
    }
    const cached = assetsCache.get<AssetRecordDto[]>(
      assetsKeys.records({ householdId }, assetId, recordScope),
    );
    if (cached) {
      setRecords(cached);
      setError(null);
      return;
    }
    void runFetch(false);
  }, [accessToken, assetId, householdId, recordScope, runFetch]);

  const reload = useCallback(() => void runFetch(true), [runFetch]);
  return { records, loading, error, reload };
}

export type AssetCareState = {
  care: ManualCareDto[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useAssetCare(
  accessToken: string | null,
  householdId: string | null,
  assetId: string | null,
  careScope: 'active' | 'removed' = 'active',
): AssetCareState {
  const [care, setCare] = useState<ManualCareDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const runFetch = useCallback(
    async (refresh: boolean) => {
      if (!accessToken || !householdId || !assetId) return;
      const sequence = (requestSeq.current += 1);
      if (!refresh) setLoading(true);
      try {
        const response = await listAssetCare(accessToken, assetId, careScope, {
          contextScope: `assets-care:${householdId}`,
        });
        if (sequence !== requestSeq.current) return;
        setCare(response.care ?? []);
        assetsCache.set(assetsKeys.care({ householdId }, assetId, careScope), response.care ?? []);
        setError(null);
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        setError(
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos cargar el historial.',
        );
      } finally {
        if (sequence === requestSeq.current) setLoading(false);
      }
    },
    [accessToken, assetId, careScope, householdId],
  );

  useEffect(() => {
    requestSeq.current += 1;
    if (!accessToken || !householdId || !assetId) {
      setCare([]);
      setError(null);
      return;
    }
    const cached = assetsCache.get<ManualCareDto[]>(assetsKeys.care({ householdId }, assetId, careScope));
    if (cached) {
      setCare(cached);
      setError(null);
      return;
    }
    void runFetch(false);
  }, [accessToken, assetId, careScope, householdId, runFetch]);

  const reload = useCallback(() => void runFetch(true), [runFetch]);
  return { care, loading, error, reload };
}
