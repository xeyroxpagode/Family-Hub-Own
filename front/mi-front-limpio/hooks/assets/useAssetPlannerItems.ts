import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  assetsCache,
  assetsKeys,
  listAssetPlannerItems,
  type AssetPlannerItemDto,
} from '../../services/assets';

/**
 * HOMePLUS Assets — S7-05: hook del read model "Próximo".
 *
 * Reglas:
 * - Cache household-scoped (la key incluye householdId en el índice 2).
 * - Protección contra respuestas obsoletas (requestSeq).
 * - Revalidación FORZADA al volver a la pantalla (el usuario puede haber
 *   editado/completado/cancelado el item en Planner).
 * - Sin request storm: el primer focus NO dispara una segunda request (la
 *   hace el efecto de montaje) y la caché evita el refetch mientras sea
 *   fresca.
 * - Sin invalidación global: la revalidación es dirigida al activo.
 */

export const ASSET_PLANNER_ITEMS_DEFAULT_LIMIT = 3;
export const ASSET_PLANNER_ITEMS_MAX_LIMIT = 20;

export type AssetPlannerItemsState = {
  items: AssetPlannerItemDto[];
  total: number;
  limit: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** "Ver todos (N)": expande IN PLACE, sin navegar a Planner. */
  showAll: boolean;
  setShowAll: (value: boolean) => void;
};

type CachedResponse = {
  items: AssetPlannerItemDto[];
  total: number;
  limit: number;
};

export function useAssetPlannerItems(
  accessToken: string | null,
  householdId: string | null,
  assetId: string | null,
  options?: { enabled?: boolean },
): AssetPlannerItemsState {
  const enabled = options?.enabled !== false;
  const [items, setItems] = useState<AssetPlannerItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(ASSET_PLANNER_ITEMS_DEFAULT_LIMIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const requestSeq = useRef(0);
  const didFocus = useRef(false);

  const effectiveLimit = showAll ? ASSET_PLANNER_ITEMS_MAX_LIMIT : ASSET_PLANNER_ITEMS_DEFAULT_LIMIT;

  const runFetch = useCallback(
    async (requestedLimit: number) => {
      if (!accessToken || !householdId || !assetId || !enabled) return;
      const sequence = (requestSeq.current += 1);
      setLoading(true);
      try {
        const response = await listAssetPlannerItems(accessToken, assetId, { limit: requestedLimit }, {
          contextScope: `assets-planner-items:${householdId}`,
        });
        if (sequence !== requestSeq.current) return;
        setItems(response.items ?? []);
        setTotal(response.total ?? 0);
        setLimit(response.limit ?? requestedLimit);
        setError(null);
        assetsCache.set(
          assetsKeys.plannerItems({ householdId }, assetId),
          {
            items: response.items ?? [],
            total: response.total ?? 0,
            limit: response.limit ?? requestedLimit,
          } satisfies CachedResponse,
        );
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        setError(
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos cargar lo que tenés programado.',
        );
      } finally {
        if (sequence === requestSeq.current) setLoading(false);
      }
    },
    [accessToken, assetId, enabled, householdId],
  );

  // Montaje / cambio de contexto: usa la caché si sirve para el límite pedido.
  useEffect(() => {
    requestSeq.current += 1;
    setShowAll(false);
    if (!accessToken || !householdId || !assetId || !enabled) {
      setItems([]);
      setTotal(0);
      setError(null);
      setLoading(false);
      return;
    }
    const cached = assetsCache.get<CachedResponse>(assetsKeys.plannerItems({ householdId }, assetId));
    if (cached && cached.limit >= ASSET_PLANNER_ITEMS_DEFAULT_LIMIT) {
      setItems(cached.items ?? []);
      setTotal(cached.total ?? 0);
      setLimit(ASSET_PLANNER_ITEMS_DEFAULT_LIMIT);
      setError(null);
      setLoading(false);
      // Si la caché no alcanza el límite máximo, el efecto de "Ver todos"
      // (que depende de showAll) dispara el refetch correspondiente.
      return;
    }
    void runFetch(ASSET_PLANNER_ITEMS_DEFAULT_LIMIT);
  }, [accessToken, assetId, enabled, householdId, runFetch]);

  // "Ver todos": expande IN PLACE con el límite máximo.
  useEffect(() => {
    if (!showAll) return;
    if (limit >= ASSET_PLANNER_ITEMS_MAX_LIMIT && items.length >= Math.min(total, ASSET_PLANNER_ITEMS_MAX_LIMIT)) {
      return;
    }
    void runFetch(ASSET_PLANNER_ITEMS_MAX_LIMIT);
  }, [items.length, limit, runFetch, showAll, total]);

  // Cambio de Household: se descartan las respuestas en vuelo y se purga el
  // scope anterior para que no haya fuga entre households.
  const previousHousehold = useRef<string | null>(householdId);
  useEffect(() => {
    if (previousHousehold.current === householdId) return;
    const stale = previousHousehold.current;
    previousHousehold.current = householdId;
    requestSeq.current += 1;
    if (stale) assetsCache.invalidateHousehold({ householdId: stale });
  }, [householdId]);

  // Revalidación FORZADA al volver a la pantalla. El primer focus no dispara
  // una segunda request: la delega el efecto de montaje.
  useFocusEffect(
    useCallback(() => {
      if (!didFocus.current) {
        didFocus.current = true;
        return;
      }
      if (!accessToken || !householdId || !assetId || !enabled) return;
      assetsCache.invalidate(assetsKeys.plannerItems({ householdId }, assetId));
      void runFetch(effectiveLimit);
    }, [accessToken, assetId, effectiveLimit, enabled, householdId, runFetch]),
  );

  const reload = useCallback(() => void runFetch(effectiveLimit), [effectiveLimit, runFetch]);

  return {
    items,
    total,
    limit,
    loading,
    error,
    reload,
    showAll,
    setShowAll,
  };
}
