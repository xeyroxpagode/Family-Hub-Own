import { OPERATION_KINDS, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';

const encodeQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  return search.toString();
};

export type FinanceSpendingLimitScopeType = 'OVERALL' | 'CATEGORY';
export type FinanceSpendingLimitPeriodType = 'MONTHLY' | 'YEARLY';
export type FinanceSpendingLimitRecurrenceType = 'ONE_OFF' | 'RECURRING';
export type FinanceSpendingLimitStatus = 'ACTIVE' | 'CANCELLED';
export type FinanceSpendingLimitSourceKind = 'VERSION' | 'EXCEPTION';
export type FinanceSpendingLimitProgressStatus = 'UNDER' | 'AT' | 'OVER';

export type FinanceSpendingLimitDto = {
  id: string;
  scopeType: FinanceSpendingLimitScopeType;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  periodType: FinanceSpendingLimitPeriodType;
  period: string;
  recurrenceType: FinanceSpendingLimitRecurrenceType;
  amount: string;
  sourceKind: FinanceSpendingLimitSourceKind;
  sourceId: string;
};

export type ListFinanceSpendingLimitsResponse = {
  periodType: FinanceSpendingLimitPeriodType;
  period: string;
  currency: string;
  limits: FinanceSpendingLimitDto[];
};

export type FinanceSpendingLimitProgressDto = {
  id: string;
  scopeType: FinanceSpendingLimitScopeType;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  periodType: FinanceSpendingLimitPeriodType;
  period: string;
  recurrenceType: FinanceSpendingLimitRecurrenceType;
  amount: string;
  spent: string;
  remaining: string;
  percentUsed: string;
  status: FinanceSpendingLimitProgressStatus;
  overBy: string;
  sourceKind: FinanceSpendingLimitSourceKind;
  sourceId: string;
  currency: string;
};

export type FinanceSpendingLimitProgressResponse = {
  contextType: FinanceContextType;
  currency: string;
  periodType: FinanceSpendingLimitPeriodType;
  period: string;
  limits: FinanceSpendingLimitProgressDto[];
};

type FinanceReadOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  currency: string;
  periodType?: FinanceSpendingLimitPeriodType;
  period?: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const listFinanceSpendingLimits = ({
  accessToken,
  contextType,
  currency,
  periodType = 'MONTHLY',
  period,
  signal,
  contextScope,
}: FinanceReadOptions) =>
  requestJson<ListFinanceSpendingLimitsResponse>(
    `/api/finance/spending-limits?${encodeQuery({ contextType, currency, periodType, period: period ?? '' })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const getFinanceSpendingLimitProgress = ({
  accessToken,
  contextType,
  currency,
  periodType = 'MONTHLY',
  period,
  signal,
  contextScope,
}: FinanceReadOptions) =>
  requestJson<FinanceSpendingLimitProgressResponse>(
    `/api/finance/spending-limits/progress?${encodeQuery({ contextType, currency, periodType, period: period ?? '' })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );