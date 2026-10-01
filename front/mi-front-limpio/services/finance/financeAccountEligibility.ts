import { useCallback, useEffect, useRef, useState } from 'react';

import { AbortError, ApiError } from '../api';
import {
  FINANCE_ACCOUNT_BALANCE_STATES,
  FINANCE_ACCOUNT_STATUSES,
  FINANCE_ACCOUNT_TYPES,
  listFinanceAccounts,
  type FinanceAccountDto,
} from './financeAccounts';
import type { FinanceActiveHousehold, FinanceContextType } from './financeContext';

export type AccountOperation = 'expense' | 'income' | 'transfer-source' | 'transfer-destination';

export type EligibleAccountsState = {
  loading: boolean;
  error: string | null;
  accounts: FinanceAccountDto[];
  refresh: () => void;
};

export type AccountSelectorGroup = {
  key: string;
  contextLabel: string;
  accounts: FinanceAccountDto[];
};

const GROUP_LABELS: Record<FinanceContextType, string> = {
  personal: 'Personal',
  household: 'Hogar',
};

/**
 * Filter fetched Accounts by operation eligibility rules (Stages 3H §§21-25,
 * (3) Privacy tests H30-H41, H69-H72).
 *
 * Currency match is enforced when `transactionCurrency` is provided; for the
 * AccountSelector we filter incompatible Accounts rather than silently
 * mutating financial truth.
 *
 * Type rules:
 *   - expense            -> ACCOUNT + CREDIT_CARD
 *   - income             -> ACCOUNT only (CREDIT_CARD denied, H41)
 *   - transfer-source    -> ACCOUNT only (CREDIT_CARD denied, H46)
 *   - transfer-destination -> ACCOUNT + CREDIT_CARD (H47)
 *
 * Context rules:
 *   - PERSONAL Expense   -> own Personal only
 *   - HOUSEHOLD Expense   -> active Household + own Personal (Personal may
 *                            fund Household, H35/H69)
 *   - PERSONAL Income     -> own Personal ACCOUNT only (H39)
 *   - HOUSEHOLD Income    -> active Household ACCOUNT only (H40)
 *   - transfer-*           -> own Personal + active Household (never other
 *                            Household memberships, H71)
 */
export function filterEligibleAccounts(
  accounts: FinanceAccountDto[],
  operation: AccountOperation,
  options: {
    contextType: FinanceContextType;
    transactionCurrency: string | null;
    activeHousehold: FinanceActiveHousehold;
  },
): FinanceAccountDto[] {
  const result: FinanceAccountDto[] = [];
  const seen = new Set<string>();

  for (const account of accounts) {
    if (account.status !== FINANCE_ACCOUNT_STATUSES.ACTIVE) {
      continue;
    }

    if (options.transactionCurrency && account.currency !== options.transactionCurrency) {
      continue;
    }

    const accountTypeAllowed =
      operation === 'income'
        ? account.accountType === FINANCE_ACCOUNT_TYPES.ACCOUNT
        : operation === 'transfer-source'
          ? account.accountType === FINANCE_ACCOUNT_TYPES.ACCOUNT
          : account.accountType === FINANCE_ACCOUNT_TYPES.ACCOUNT
            || account.accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD;

    if (!accountTypeAllowed) {
      continue;
    }

    if (
      operation === 'transfer-source' ||
      (operation === 'expense' && account.accountType === FINANCE_ACCOUNT_TYPES.ACCOUNT)
    ) {
      const negative = account.currentBalance !== null &&
        account.currentBalance.startsWith('-') &&
        /[1-9]/.test(account.currentBalance.slice(1).replace('.', ''));
      if (account.balanceState !== FINANCE_ACCOUNT_BALANCE_STATES.KNOWN || negative) {
        continue;
      }
    }

    const relationships = computeRelationships(account, options);
    if (!relationships.allowedForOperation(operation, options.contextType)) {
      continue;
    }

    if (seen.has(account.id)) continue;
    seen.add(account.id);
    result.push(account);
  }

  return result;
}

function computeRelationships(
  account: FinanceAccountDto,
  options: { activeHousehold: FinanceActiveHousehold },
) {
  const isActiveHouseholdAccount =
    account.financialContextType === 'household'
    && account.ownerPersonId === null
    && options.activeHousehold?.id
      ? account.householdId === options.activeHousehold.id
      : false;
  const isOwnPersonalAccount =
    account.financialContextType === 'personal'
    && account.householdId === null;

  return {
    isActiveHouseholdAccount,
    isOwnPersonalAccount,
    allowedForOperation(
      operation: AccountOperation,
      contextType: FinanceContextType,
    ): boolean {
      switch (operation) {
        case 'expense':
          if (contextType === 'personal') return isOwnPersonalAccount;
          return isActiveHouseholdAccount || isOwnPersonalAccount;
        case 'income':
          if (contextType === 'personal') return isOwnPersonalAccount;
          return isActiveHouseholdAccount;
        case 'transfer-source':
        case 'transfer-destination':
          return isActiveHouseholdAccount || isOwnPersonalAccount;
        default:
          return false;
      }
    },
  };
}

export function groupAccountsByContext(
  accounts: FinanceAccountDto[],
  activeHousehold: FinanceActiveHousehold,
): AccountSelectorGroup[] {
  const groups: AccountSelectorGroup[] = [];
  const byKey = new Map<string, AccountSelectorGroup>();

  for (const account of accounts) {
    const key = account.financialContextType === 'personal'
      ? 'personal'
      : `household:${account.householdId ?? '?'}`;
    let group = byKey.get(key);
    if (!group) {
      const label = account.financialContextType === 'personal'
        ? 'Personal'
        : (activeHousehold?.name ?? GROUP_LABELS.household);
      group = { key, contextLabel: label, accounts: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.accounts.push(account);
  }

  groups.sort((a, b) => (a.key === 'personal' ? -1 : b.key === 'personal' ? 1 : a.contextLabel.localeCompare(b.contextLabel)));
  return groups;
}

function buildFetchPlan(
  contextType: FinanceContextType,
  operation: AccountOperation,
): FinanceContextType[] {
  switch (operation) {
    case 'expense':
      return contextType === 'household' ? ['personal', 'household'] : ['personal'];
    case 'income':
      return contextType === 'household' ? ['household'] : ['personal'];
    case 'transfer-source':
    case 'transfer-destination':
      return ['personal', 'household'];
    default:
      return [contextType];
  }
}

/**
 * Fetch-only hook for eligible Accounts. The parent decides when to refresh
 * (operation change, Finance context change, currency change). The hook
 * performs ONE active-Account fetch per Finance Context needed; household fetch
 * is silently skipped when there is no active Household (truthful empty list).
 *
 * Privacy: each fetch reuses backend `resolveFinanceContext` + canonical RLS;
 * the hook NEVER bypasses backend authority and NEVER reads other Household
 * memberships (H72). Other members cannot receive this user's Personal
 * Accounts through this data path because the backend `finance_accounts` RLS
 * scopes Personal Accounts to `owner_person_id = current_person_id()`.
 */
export function useEligibleAccounts(args: {
  accessToken: string | null | undefined;
  enabled: boolean;
  operation: AccountOperation;
  contextType: FinanceContextType;
  transactionCurrency: string | null;
  activeHousehold: FinanceActiveHousehold;
}): EligibleAccountsState {
  const { accessToken, enabled, operation, contextType, transactionCurrency, activeHousehold } = args;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<FinanceAccountDto[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const requestIdRef = useRef(0);

  const refresh = useCallback(() => setRefreshNonce((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setLoading((current) => (current ? false : current));
      setError((current) => (current === null ? current : null));
      setAccounts((current) => (current.length === 0 ? current : []));
      return;
    }

    const fetchPlan = buildFetchPlan(contextType, operation);
    const householdUnavailable = contextType === 'household' && !activeHousehold?.id;
    const effectivePlan = householdUnavailable && fetchPlan.includes('household')
      ? fetchPlan.filter((type) => type !== 'household')
      : fetchPlan;

    const myRequestId = ++requestIdRef.current;
    const controllers = effectivePlan.map(() => new AbortController());

    setLoading(true);
    setError(null);

    Promise.all(
      effectivePlan.map((planContext, index) =>
        listFinanceAccounts({
          accessToken,
          contextType: planContext,
          signal: controllers[index].signal,
          contextScope: `finance-account-selector:${operation}:${planContext}:${refreshNonce}`,
        }).then((response) => response.accounts).catch((err) => {
          if (err instanceof AbortError || (err instanceof Error && err.name === 'AbortError')) {
            return null;
          }
          throw err;
        }),
      ),
    )
      .then((results) => {
        if (requestIdRef.current !== myRequestId) return;
        const merged: FinanceAccountDto[] = [];
        for (const list of results) {
          if (!list) continue;
          for (const account of list) {
            if (!merged.some((existing) => existing.id === account.id)) {
              merged.push(account);
            }
          }
        }
        const filtered = filterEligibleAccounts(merged, operation, {
          contextType,
          transactionCurrency,
          activeHousehold,
        });
        setAccounts(filtered);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (requestIdRef.current !== myRequestId) return;
        if (err instanceof AbortError || (err instanceof Error && err.name === 'AbortError')) return;
        const message = err instanceof ApiError ? err.message : 'No pudimos cargar las cuentas.';
        setError(message);
        setAccounts([]);
        setLoading(false);
      });

    return () => {
      for (const controller of controllers) {
        controller.abort();
      }
    };
  }, [accessToken, enabled, operation, contextType, transactionCurrency, activeHousehold, refreshNonce]);

  return { loading, error, accounts, refresh };
}
