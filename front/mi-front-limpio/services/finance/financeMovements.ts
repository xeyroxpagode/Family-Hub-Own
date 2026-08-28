import { OPERATION_KINDS, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';
import * as Crypto from 'expo-crypto';

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
  /**
   * Optional canonical Account受到影响 by this Expense/Income. Stage 3H keeps
   * Account association OPTIONAL: absence is a fully valid "Sin cuenta" state.
   * When present, backend resolveAccountForTransaction validates:
   *   - belongs to the resolved Finance Context
   *   - currency matches transaction currency
   *   - relationship (PERSONAL Expense: own Personal; HOUSEHOLD Expense:
   *     active Household + own Personal; INCOME: own Personal active Household
   *     ACCOUNT only, CREDIT_CARD excluded)
   *   - status=ACTIVE
   */
  account?: string;
};

export type CreateFinanceTransactionResponse = {
  transaction: FinanceTransactionDto;
};

export type FinanceMovementDto = {
  id: string;
  transactionType: FinanceTransactionKind;
  amount: string;
  currency: string;
  financialContextType: FinanceContextType;
  transactionDate: string;
  description: string | null;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
  accountId?: string | null;
  accountName?: string | null;
  accountCurrency?: string | null;
};

export type FinanceTrashMovementDto = {
  id: string;
  transactionType: FinanceTransactionKind;
  amount: string;
  currency: string;
  transactionDate: string;
  description: string | null;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  trashedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ListFinanceMovementsResponse = {
  period: string;
  contextType: FinanceContextType;
  movements: FinanceMovementDto[];
};

export type ListFinanceTrashResponse = {
  contextType: FinanceContextType;
  movements: FinanceTrashMovementDto[];
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

export type FinanceTransactionDetailDto = {
  id: string;
  transactionType: FinanceTransactionKind;
  amount: string;
  currency: string;
  financialContextType: FinanceContextType;
  ownerPersonId: string | null;
  householdId: string | null;
  transactionDate: string;
  description: string | null;
  notes: string | null;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  status: string;
  trashedAt: string | null;
  correctedFromTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  accountId: string | null;
  accountName: string | null;
  accountCurrency: string | null;
};

export type GetFinanceTransactionDetailResponse = {
  transaction: FinanceTransactionDetailDto;
};

export type CorrectFinanceTransactionPayload = {
  transactionId: string;
  contextType: FinanceContextType;
  amount?: string;
  currency?: string | null;
  transactionDate?: string;
  description?: string | null;
  categoryId?: string | null;
  accountId?: string | null;
  notes?: string | null;
  clearDescription?: boolean;
  clearCategory?: boolean;
  clearAccount?: boolean;
  clearNotes?: boolean;
};

export type CorrectFinanceTransactionResponse = {
  transaction: FinanceTransactionDetailDto;
  outcome: 'created' | 'replay';
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

type FinanceTrashOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const listFinanceTrash = ({
  accessToken,
  contextType,
  signal,
  contextScope,
}: FinanceTrashOptions) =>
  requestJson<ListFinanceTrashResponse>(
    `/api/finance/trash?${encodeQuery({ contextType })}`,
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

function canonicalizeV2Value(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeV2Value(item));
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    Object.keys(value as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = canonicalizeV2Value((value as Record<string, unknown>)[key]);
      });
    return sorted;
  }
  return value;
}

async function hashIdempotencyRequestV2(params: {
  operation: string;
  scopeType: string;
  scopeId: string | null;
  targetId: string | null;
  payload: unknown;
  expectedVersion: number | null;
  mutationId: string;
}): Promise<string> {
  const canonical = canonicalizeV2Value({
    operation: params.operation ?? '',
    scope_type: params.scopeType ?? '',
    scope_id: params.scopeId ?? null,
    target_id: params.targetId ?? null,
    payload: params.payload ?? null,
    expected_version: params.expectedVersion ?? null,
    mutation_id: params.mutationId ?? '',
  });

  const stripped = JSON.stringify(canonical, (_key, value) =>
    value === null ? undefined : value,
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(stripped);
  const hashBuffer = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type TrashFinanceTransactionPayload = {
  transactionId: string;
};

export type TrashFinanceTransactionResponse = {
  transaction: {
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
    status: string;
    trashedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type TrashFinanceTransactionOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  personId: string;
  householdId: string | null;
  transactionId: string;
  mutationId: string;
  idempotencyKey: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const trashFinanceTransaction = async ({
  accessToken,
  contextType,
  personId,
  householdId,
  transactionId,
  mutationId,
  idempotencyKey,
  signal,
  contextScope,
}: TrashFinanceTransactionOptions): Promise<TrashFinanceTransactionResponse> => {
  const payload: TrashFinanceTransactionPayload = { transactionId };
  const scopeId = contextType === 'personal' ? personId : householdId!;

  const payloadHash = await hashIdempotencyRequestV2({
    operation: 'finance.transaction.trash',
    scopeType: contextType,
    scopeId,
    targetId: transactionId,
    payload,
    expectedVersion: null,
    mutationId,
  });

  return requestJson<TrashFinanceTransactionResponse>(
    '/api/finance/transactions/trash',
    {
      method: 'POST',
      accessToken,
      operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
      body: {
        transactionId,
        contextType,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
      signal,
      contextScope,
    },
  );
};

export type RestoreFinanceTransactionPayload = {
  transactionId: string;
};

export type RestoreFinanceTransactionResponse = {
  transaction: {
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
    status: string;
    trashedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type RestoreFinanceTransactionOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  personId: string;
  householdId: string | null;
  transactionId: string;
  mutationId: string;
  idempotencyKey: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const restoreFinanceTransaction = async ({
  accessToken,
  contextType,
  personId,
  householdId,
  transactionId,
  mutationId,
  idempotencyKey,
  signal,
  contextScope,
}: RestoreFinanceTransactionOptions): Promise<RestoreFinanceTransactionResponse> => {
  const payload: RestoreFinanceTransactionPayload = { transactionId };
  const scopeId = contextType === 'personal' ? personId : householdId!;

  const payloadHash = await hashIdempotencyRequestV2({
    operation: 'finance.transaction.restore',
    scopeType: contextType,
    scopeId,
    targetId: transactionId,
    payload,
    expectedVersion: null,
    mutationId,
  });

  return requestJson<RestoreFinanceTransactionResponse>(
    '/api/finance/transactions/restore',
    {
      method: 'POST',
      accessToken,
      operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
      body: {
        transactionId,
        contextType,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
      signal,
      contextScope,
    },
  );
};

type GetFinanceTransactionDetailOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  transactionId: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const getFinanceTransactionDetail = ({
  accessToken,
  contextType,
  transactionId,
  signal,
  contextScope,
}: GetFinanceTransactionDetailOptions) =>
  requestJson<GetFinanceTransactionDetailResponse>(
    `/api/finance/transactions/${transactionId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

type CorrectFinanceTransactionOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  personId: string;
  householdId: string | null;
  transactionId: string;
  mutationId: string;
  idempotencyKey: string;
  amount?: string;
  currency?: string | null;
  transactionDate?: string;
  description?: string | null;
  categoryId?: string | null;
  accountId?: string | null;
  notes?: string | null;
  clearDescription?: boolean;
  clearCategory?: boolean;
  clearAccount?: boolean;
  clearNotes?: boolean;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const correctFinanceTransaction = async ({
  accessToken,
  contextType,
  personId,
  householdId,
  transactionId,
  mutationId,
  idempotencyKey,
  amount,
  currency,
  transactionDate,
  description,
  categoryId,
  accountId,
  notes,
  clearDescription,
  clearCategory,
  clearAccount,
  clearNotes,
  signal,
  contextScope,
}: CorrectFinanceTransactionOptions): Promise<CorrectFinanceTransactionResponse> => {
  const scopeId = contextType === 'personal' ? personId : householdId!;

  const payload: CorrectFinanceTransactionPayload = {
    transactionId,
    contextType,
    amount,
    currency,
    transactionDate,
    description,
    categoryId,
    accountId,
    notes,
    clearDescription,
    clearCategory,
    clearAccount,
    clearNotes,
  };

  const payloadHash = await hashIdempotencyRequestV2({
    operation: 'finance.transaction.correct',
    scopeType: contextType,
    scopeId,
    targetId: transactionId,
    payload,
    expectedVersion: null,
    mutationId,
  });

  return requestJson<CorrectFinanceTransactionResponse>(
    '/api/finance/transactions/correct',
    {
      method: 'POST',
      accessToken,
      operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
      body: {
        transactionId,
        contextType,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
      signal,
      contextScope,
    },
  );
};
