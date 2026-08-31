import { useCallback, useEffect, useRef, useState } from 'react';

import { AbortError, ApiError } from '../api';
import { listFinancePools, type FinancePoolDto } from './financePools';
import type { FinanceActiveHousehold, FinanceContextType } from './financeContext';

export type PoolEligibilityState = {
  loading: boolean;
  error: string | null;
  pools: FinancePoolDto[];
  refresh: () => void;
};

/**
 * Filter fetched Pools by expense eligibility rules (Stage 6E.2).
 *
 * Eligibility rules for Expense -> Pool assignment:
 * - Pool must be ACTIVE
 * - Pool currency must match transaction currency
 * - Pool context must match transaction context (personal -> personal, household -> household)
 * - Archived pools excluded
 *
 * NOTE: Pool balance (including negative) does NOT affect eligibility.
 * Financial reality may drive pool negative - this is valid per product rules.
 */
export function filterEligiblePools(
  pools: FinancePoolDto[],
  options: {
    contextType: FinanceContextType;
    transactionCurrency: string;
    activeHousehold: FinanceActiveHousehold;
  },
): FinancePoolDto[] {
  const result: FinancePoolDto[] = [];

  for (const pool of pools) {
    if (pool.status !== 'ACTIVE') {
      continue;
    }

    if (pool.currency !== options.transactionCurrency) {
      continue;
    }

    const isActiveHouseholdPool =
      pool.financialContextType === 'household'
      && pool.ownerPersonId === null
      && options.activeHousehold?.id
        ? pool.householdId === options.activeHousehold.id
        : false;
    const isOwnPersonalPool =
      pool.financialContextType === 'personal'
      && pool.householdId === null;

    let allowed = false;
    if (options.contextType === 'personal') {
      allowed = isOwnPersonalPool;
    } else {
      allowed = isActiveHouseholdPool || isOwnPersonalPool;
    }

    if (!allowed) {
      continue;
    }

    result.push(pool);
  }

  return result;
}

export function useEligiblePools(args: {
  accessToken: string | null | undefined;
  enabled: boolean;
  contextType: FinanceContextType;
  transactionCurrency: string;
  activeHousehold: FinanceActiveHousehold;
}): PoolEligibilityState {
  const { accessToken, enabled, contextType, transactionCurrency, activeHousehold } = args;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<FinancePoolDto[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const requestIdRef = useRef(0);

  const refresh = useCallback(() => setRefreshNonce((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setLoading((current) => (current ? false : current));
      setError((current) => (current === null ? current : null));
      setPools((current) => (current.length === 0 ? current : []));
      return;
    }

    const myRequestId = ++requestIdRef.current;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    listFinancePools({
      accessToken,
      contextType,
      currency: transactionCurrency,
      signal: controller.signal,
      contextScope: `finance-pool-selector:expense:${contextType}:${refreshNonce}`,
    })
      .then((response) => {
        if (requestIdRef.current !== myRequestId) return;
        const filtered = filterEligiblePools(response.pools, {
          contextType,
          transactionCurrency,
          activeHousehold,
        });
        setPools(filtered);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (requestIdRef.current !== myRequestId) return;
        if (err instanceof AbortError || (err instanceof Error && err.name === 'AbortError')) return;
        const message = err instanceof ApiError ? err.message : 'No pudimos cargar los pozos.';
        setError(message);
        setPools([]);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [accessToken, enabled, contextType, transactionCurrency, activeHousehold, refreshNonce]);

  return { loading, error, pools, refresh };
}