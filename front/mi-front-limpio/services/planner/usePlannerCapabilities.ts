import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { ApiError } from '../api';
import {
  fetchPlannerCapabilities,
  hasCapability,
  type PlannerCapability,
  type PlannerCapabilitiesProjection,
} from '../plannerCapabilities';
import { plannerCache } from './plannerCache';
import { plannerKeys, type CapabilityScope } from './plannerKeys';

/**
 * HOMePLUS Assets — S7-08: proyección de capabilities de Planner.
 *
 * Espejo de useAssetsCapabilities: el backend es la autoridad, la UI sólo
 * decide qué mostrar o deshabilitar. El backend vuelve a verificar cada
 * mutación.
 *
 * FAIL-CLOSED: mientras la proyección no llegó, NINGÚN control de escritura
 * queda habilitado (ni Tarea ni Evento). Es preferible una pantalla de sólo
 * lectura a un control que el servidor va a rechazar.
 *
 * Refresco: cambio de Household, foco de la pantalla (el permiso puede
 * haber cambiado en la sesión) y después de un 401/403.
 */

export type PlannerCapabilitiesScope = {
  accountId: string | null;
  householdId: string | null;
  membershipId: string | null;
};

export type PlannerCapabilitiesState = {
  /** null mientras la proyección todavía no llegó. */
  capabilities: PlannerCapabilitiesProjection | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Fail-closed: `true` sólo si la proyección cargó y concede la capability. */
  can: (capability: PlannerCapability) => boolean;
};

type MembershipLike = {
  id: string;
  household_id: string;
  status: string;
};

/**
 * Resuelve el scope de capabilities a partir del contexto de sesión.
 * La membership activa del Household activo es la que el backend usa.
 */
export const resolvePlannerCapabilityScope = (input: {
  accountId: string | null;
  householdId: string | null;
  memberships: readonly MembershipLike[] | null | undefined;
}): PlannerCapabilitiesScope => {
  const membership = (input.memberships ?? []).find(
    (item) => item.household_id === input.householdId && item.status === 'active',
  );
  return {
    accountId: input.accountId,
    householdId: input.householdId,
    membershipId: membership?.id ?? null,
  };
};

const EMPTY_PROJECTION = (): PlannerCapabilitiesProjection =>
  ({} as PlannerCapabilitiesProjection);

export function usePlannerCapabilities(
  accessToken: string | null,
  scope: PlannerCapabilitiesScope,
  options?: { refreshOnFocus?: boolean },
): PlannerCapabilitiesState {
  const refreshOnFocus = options?.refreshOnFocus !== false;
  const [capabilities, setCapabilities] = useState<PlannerCapabilitiesProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const { accountId, householdId, membershipId } = scope;
  const cacheScope: CapabilityScope | null = useMemo(
    () => (accountId && householdId && membershipId
      ? { accountId, householdId, membershipId }
      : null),
    [accountId, householdId, membershipId],
  );

  const runFetch = useCallback(
    async (refresh: boolean) => {
      if (!accessToken || !householdId) return;
      const sequence = (requestSeq.current += 1);
      setLoading(true);
      try {
        const projection = await fetchPlannerCapabilities(accessToken);
        if (sequence !== requestSeq.current) return;
        setCapabilities(projection);
        setError(null);
        if (cacheScope) {
          plannerCache.set(plannerKeys.capabilities(cacheScope), projection);
        }
      } catch (caught) {
        if (sequence !== requestSeq.current) return;
        const message =
          caught && typeof caught === 'object' && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'No pudimos verificar tus permisos en Planner.';
        setError(message);
        // 401/403: sin proyección utilizable. Fail-closed.
        if (caught instanceof ApiError && (caught.status === 401 || caught.status === 403)) {
          setCapabilities(EMPTY_PROJECTION());
          if (cacheScope) {
            plannerCache.invalidate(plannerKeys.capabilities(cacheScope));
          }
        }
      } finally {
        if (sequence === requestSeq.current) setLoading(false);
      }
    },
    [accessToken, cacheScope, householdId],
  );

  // Cambio de Household / de scope: se purga lo anterior (fail-closed).
  useEffect(() => {
    requestSeq.current += 1;
    if (!accessToken || !householdId) {
      setCapabilities(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (cacheScope) {
      const cached = plannerCache.get<PlannerCapabilitiesProjection>(plannerKeys.capabilities(cacheScope));
      if (cached) {
        setCapabilities(cached);
        setLoading(false);
        setError(null);
        // Stale-while-revalidate: un permiso puede cambiar en cualquier momento.
        if (!plannerCache.isFresh(plannerKeys.capabilities(cacheScope))) void runFetch(false);
        return;
      }
    }
    setCapabilities(null);
    void runFetch(false);
  }, [accessToken, cacheScope, householdId, runFetch]);

  // Foco de la pantalla: el permiso pudo cambiar mientras el usuario estaba
  // en otro lado (o el household pudo cambiar).
  useFocusEffect(
    useCallback(() => {
      if (!refreshOnFocus) return;
      if (!accessToken || !householdId) return;
      void runFetch(false);
    }, [accessToken, householdId, refreshOnFocus, runFetch]),
  );

  const reload = useCallback(() => void runFetch(true), [runFetch]);

  const can = useCallback(
    (capability: PlannerCapability) => {
      if (!capabilities) return false;
      return hasCapability(capabilities, capability);
    },
    [capabilities],
  );

  return { capabilities, loading, error, reload, can };
}
