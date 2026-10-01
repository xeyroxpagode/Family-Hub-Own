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

export type FinanceSpendingLimitEditScope = 'ONE_OFF' | 'THIS_PERIOD' | 'THIS_AND_FOLLOWING';
export type FinanceSpendingLimitCancelScope = 'ONE_OFF' | 'THIS_PERIOD' | 'THIS_AND_FOLLOWING';

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

export type CreateFinanceSpendingLimitInput = {
  scopeType: FinanceSpendingLimitScopeType;
  categoryId: string | null;
  periodType: FinanceSpendingLimitPeriodType;
  period: string;
  recurrenceType: FinanceSpendingLimitRecurrenceType;
  amount: string;
  currency: string;
};

export type CreateFinanceSpendingLimitResponse = {
  outcome: 'completed' | 'replay';
  limit: {
    id: string;
    scopeType: FinanceSpendingLimitScopeType;
    categoryId: string | null;
    categoryLabelSnapshot: string | null;
    periodType: FinanceSpendingLimitPeriodType;
    period: string;
    recurrenceType: FinanceSpendingLimitRecurrenceType;
    amount: string;
  };
};

export type EditFinanceSpendingLimitInput = {
  id: string;
  period: string;
  editScope: FinanceSpendingLimitEditScope;
  amount: string;
};

export type EditFinanceSpendingLimitResponse = {
  outcome: 'completed' | 'replay';
  limit: {
    id: string;
    periodType: FinanceSpendingLimitPeriodType;
    period: string;
    editScope: FinanceSpendingLimitEditScope;
    amount: string;
  };
};

export type CancelFinanceSpendingLimitInput = {
  id: string;
  period: string;
  cancelScope: FinanceSpendingLimitCancelScope;
};

export type CancelFinanceSpendingLimitResponse = {
  outcome: 'completed' | 'replay';
  limit: {
    id: string;
    periodType: FinanceSpendingLimitPeriodType;
    period: string;
    cancelScope: FinanceSpendingLimitCancelScope;
    status: 'CANCELLED';
  };
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

type FinanceMutationOptions = {
  accessToken: string;
  contextType: FinanceContextType;
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

export const createFinanceSpendingLimit = ({
  accessToken,
  contextType,
  contextScope,
  input,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
}: FinanceMutationOptions & { input: CreateFinanceSpendingLimitInput; mutationId: string; idempotencyKey: string; payloadHash: string; signal?: AbortSignal | null }) =>
  requestJson<CreateFinanceSpendingLimitResponse>(
    '/api/finance/spending-limits',
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { ...input, mutationId, idempotencyKey, payloadHash },
    },
  );

export const editFinanceSpendingLimit = ({
  accessToken,
  contextType,
  contextScope,
  input,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
}: FinanceMutationOptions & { input: EditFinanceSpendingLimitInput; mutationId: string; idempotencyKey: string; payloadHash: string; signal?: AbortSignal | null }) =>
  requestJson<EditFinanceSpendingLimitResponse>(
    `/api/finance/spending-limits/${input.id}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'PATCH',
      mutationId,
      idempotencyKey,
      body: { ...input, mutationId, idempotencyKey, payloadHash },
    },
  );

export const cancelFinanceSpendingLimit = ({
  accessToken,
  contextType,
  contextScope,
  input,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
}: FinanceMutationOptions & { input: CancelFinanceSpendingLimitInput; mutationId: string; idempotencyKey: string; payloadHash: string; signal?: AbortSignal | null }) =>
  requestJson<CancelFinanceSpendingLimitResponse>(
    `/api/finance/spending-limits/${input.id}/cancel`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { ...input, mutationId, idempotencyKey, payloadHash },
    },
  );