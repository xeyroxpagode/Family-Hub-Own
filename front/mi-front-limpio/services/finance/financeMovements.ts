import { OPERATION_KINDS, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';

export type FinanceTransactionKind = 'expense' | 'income';

export type FinanceCategoryDto = {
  id: string;
  kind: string;
  type: FinanceTransactionKind;
  nativeKey: string | null;
  label: string;
  contextType: FinanceContextType | null;
  selectable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListFinanceCategoriesResponse = {
  categories: FinanceCategoryDto[];
};

export type FinanceTransactionDto = {
  id: string;
  type: FinanceTransactionKind;
  amount: number;
  currency: string;
  financialContextType: FinanceContextType;
  ownerPersonId: string | null;
  householdId: string | null;
  date: string;
  description: string | null;
  notes: string | null;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateFinanceTransactionPayload = {
  amount: string;
  currency: string;
  contextType: FinanceContextType;
  date: string;
  description?: string;
  category?: string;
  notes?: string;
};

export type CreateFinanceTransactionResponse = {
  transaction: FinanceTransactionDto;
};

export type FinanceMovementDto = {
  id: string;
  transactionType: FinanceTransactionKind;
  amount: string;
  currency: string;
  transactionDate: string;
  description: string | null;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListFinanceMovementsResponse = {
  period: string;
  contextType: FinanceContextType;
  movements: FinanceMovementDto[];
};

export type FinanceSummaryCurrencyDto = {
  currency: string;
  expense: string;
  income: string;
  net: string;
};

export type GetFinanceSummaryResponse = {
  period: string;
  contextType: FinanceContextType;
  currencies: FinanceSummaryCurrencyDto[];
};

const encodeQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  return search.toString();
};

export const listFinanceExpenseCategories = (
  accessToken: string,
  contextType: FinanceContextType,
) =>
  requestJson<ListFinanceCategoriesResponse>(
    `/api/finance/categories?${encodeQuery({ contextType, type: 'expense' })}`,
    {
      accessToken,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

const createFinanceTransaction = (
  path: '/api/finance/expenses' | '/api/finance/incomes',
  accessToken: string,
  payload: CreateFinanceTransactionPayload,
) =>
  requestJson<CreateFinanceTransactionResponse>(path, {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: payload,
  });

export const createFinanceExpense = (
  accessToken: string,
  payload: CreateFinanceTransactionPayload,
) => createFinanceTransaction('/api/finance/expenses', accessToken, payload);

export const createFinanceIncome = (
  accessToken: string,
  payload: CreateFinanceTransactionPayload,
) => createFinanceTransaction('/api/finance/incomes', accessToken, payload);

type FinanceReadOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  period: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const listFinanceMovements = ({
  accessToken,
  contextType,
  period,
  signal,
  contextScope,
}: FinanceReadOptions) =>
  requestJson<ListFinanceMovementsResponse>(
    `/api/finance/movements?${encodeQuery({ contextType, period })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const getFinanceSummary = ({
  accessToken,
  contextType,
  period,
  signal,
  contextScope,
}: FinanceReadOptions) =>
  requestJson<GetFinanceSummaryResponse>(
    `/api/finance/summary?${encodeQuery({ contextType, period })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );
