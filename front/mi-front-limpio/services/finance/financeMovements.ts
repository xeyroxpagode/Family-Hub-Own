import { OPERATION_KINDS, createIdempotencyKey, generateMutationId, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';
import type { FinanceTransferDto } from './financeTransfers';
import { normalizeFinanceTransactionDetailPayload } from './financeTransactionDetail';
import type { FinanceRefundEventDto, FinanceTransactionDetailDto } from './financeTransactionDetail';
import * as Crypto from 'expo-crypto';

export type { FinanceTransactionDetailDto, FinanceTransactionDetailStatus } from './financeTransactionDetail';

export type FinanceTransferDetailDto = {
  id: string;
  date: string;
  description: string | null;
  notes: string | null;

  sourceAccount: {
    id: string;
    name: string;
    accountType: 'ACCOUNT' | 'CREDIT_CARD';
    currency: string;
  };

  destinationAccount: {
    id: string;
    name: string;
    accountType: 'ACCOUNT' | 'CREDIT_CARD';
    currency: string;
  };

  sourceAmount: string;
  sourceCurrency: string;

  destinationAmount: string;
  destinationCurrency: string;

  commission: {
    expenseRootTransactionId: string | null;
    amount: string | null;
    currency: string | null;
  } | null;

  createdAt: string;
};

export type FinanceTransactionKind = 'expense' | 'income';

export type FinanceMovementKind = 'EXPENSE' | 'INCOME' | 'TRANSFER';

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

export type CreateFinanceInstallmentExpensePayload = CreateFinanceTransactionPayload & {
  account: string;
  installmentCount: number;
};

export type CreateFinanceInstallmentExpenseResponse = {
  transactionId: string;
  rootTransactionId: string;
  installmentCount: number;
  totalAmount: string;
  currency: string;
  outcome: 'created' | 'replay';
};

export type FinanceMovementDto = {
  id: string;
  rootTransactionId: string;
  transferId: string | null;
  transactionType: FinanceTransactionKind;
  amount: string;
  grossAmount: string;
  totalRefunded: string;
  netAmount: string;
  refundCount: number;
  refundEvents: FinanceRefundEventDto[];
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

export type FinanceExpenseMovementDto = FinanceMovementDto & {
  kind: 'EXPENSE';
  transactionType: 'expense';
  date: string;
  categoryLabel: string | null;
};

export type FinanceIncomeMovementDto = FinanceMovementDto & {
  kind: 'INCOME';
  transactionType: 'income';
  date: string;
  categoryLabel: string | null;
};

export type FinanceTransferAccountDto = {
  id: string;
  name: string;
  accountType: 'ACCOUNT' | 'CREDIT_CARD';
  currency: string;
};

export type FinanceTransferCommissionDto = {
  expenseRootTransactionId: string;
  amount: string;
  currency: string;
};

export type FinanceTransferMovementDto = {
  kind: 'TRANSFER';
  id: string;
  date: string;
  description: string | null;
  notes: string | null;
  sourceAccount: FinanceTransferAccountDto;
  destinationAccount: FinanceTransferAccountDto;
  sourceAmount: string;
  sourceCurrency: string;
  destinationAmount: string;
  destinationCurrency: string;
  commission: FinanceTransferCommissionDto | null;
  createdAt: string;
};

export type FinanceUnifiedMovementDto =
  | FinanceExpenseMovementDto
  | FinanceIncomeMovementDto
  | FinanceTransferMovementDto;

export type ListFinanceMovementsResponse = {
  period: string;
  contextType: FinanceContextType;
  movements: FinanceUnifiedMovementDto[];
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

export type GetFinanceTransactionDetailResponse = FinanceTransactionDetailDto;

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

export type FinanceRefundMutationResponse = {
  refund: FinanceRefundEventDto;
  outcome: 'created' | 'replay';
};

export function assertCanonicalCorrectionSuccess(
  response: CorrectFinanceTransactionResponse,
): CorrectFinanceTransactionResponse {
  if (
    !response ||
    (response.outcome !== 'created' && response.outcome !== 'replay') ||
    !response.transaction?.id ||
    response.transaction.status !== 'ACTIVE'
  ) {
    throw new Error('Finance correction response was not canonical success.');
  }
  return response;
}

const encodeQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  return search.toString();
};

export const listFinanceCategories = (
  accessToken: string,
  contextType: FinanceContextType,
  type: FinanceTransactionKind,
) =>
  requestJson<ListFinanceCategoriesResponse>(
    `/api/finance/categories?${encodeQuery({ contextType, type })}`,
    {
      accessToken,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const listFinanceExpenseCategories = (
  accessToken: string,
  contextType: FinanceContextType,
) => listFinanceCategories(accessToken, contextType, 'expense');

export const listFinanceIncomeCategories = (
  accessToken: string,
  contextType: FinanceContextType,
) => listFinanceCategories(accessToken, contextType, 'income');

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

export const createFinanceInstallmentExpense = (
  accessToken: string,
  payload: CreateFinanceInstallmentExpensePayload,
) =>
  requestJson<CreateFinanceInstallmentExpenseResponse>('/api/finance/expenses/installment', {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    body: payload,
  });

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
  ).then((response) => ({
    ...response,
    movements: response.movements.map((movement) => mapBackendMovementToUnified(movement, response.contextType)),
  }));

function mapBackendMovementToUnified(movement: any, contextType: FinanceContextType): FinanceUnifiedMovementDto {
  const transactionType = movement.transactionType ?? movement.kind?.toLowerCase();
  if (transactionType === 'expense' || movement.kind === 'EXPENSE') {
    const date = movement.transactionDate ?? movement.date;
    const categoryLabel = movement.categoryLabelSnapshot ?? movement.categoryLabel ?? null;
    return {
      kind: 'EXPENSE',
      id: movement.id,
      rootTransactionId: movement.rootTransactionId ?? movement.id,
      transactionType: 'expense',
      amount: movement.amount,
      grossAmount: movement.grossAmount ?? movement.amount,
      totalRefunded: movement.totalRefunded ?? '0',
      netAmount: movement.netAmount ?? movement.amount,
      refundCount: movement.refundCount ?? 0,
      refundEvents: movement.refundEvents ?? [],
      currency: movement.currency,
      financialContextType: movement.financialContextType ?? contextType,
      transactionDate: date,
      date,
      description: movement.description,
      categoryId: movement.categoryId,
      categoryLabel,
      categoryLabelSnapshot: categoryLabel,
      transferId: movement.transferId ?? null,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt ?? movement.createdAt,
      accountId: movement.accountId ?? null,
      accountName: movement.accountName ?? null,
      accountCurrency: movement.accountCurrency ?? null,
    };
  }
  if (transactionType === 'income' || movement.kind === 'INCOME') {
    const date = movement.transactionDate ?? movement.date;
    const categoryLabel = movement.categoryLabelSnapshot ?? movement.categoryLabel ?? null;
    return {
      kind: 'INCOME',
      id: movement.id,
      rootTransactionId: movement.rootTransactionId ?? movement.id,
      transferId: movement.transferId ?? null,
      transactionType: 'income',
      amount: movement.amount,
      grossAmount: movement.grossAmount ?? movement.amount,
      totalRefunded: movement.totalRefunded ?? '0',
      netAmount: movement.netAmount ?? movement.amount,
      refundCount: movement.refundCount ?? 0,
      refundEvents: movement.refundEvents ?? [],
      currency: movement.currency,
      financialContextType: movement.financialContextType ?? contextType,
      transactionDate: date,
      date,
      description: movement.description,
      categoryId: movement.categoryId,
      categoryLabel,
      categoryLabelSnapshot: categoryLabel,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt ?? movement.createdAt,
      accountId: movement.accountId ?? null,
      accountName: movement.accountName ?? null,
      accountCurrency: movement.accountCurrency ?? null,
    };
  }
  if (transactionType === 'transfer' || movement.kind === 'TRANSFER') {
    const sourceAccount = movement.sourceAccount ?? {};
    const destinationAccount = movement.destinationAccount ?? {};
    return {
      kind: 'TRANSFER',
      id: movement.id,
      date: movement.date ?? movement.transactionDate,
      description: movement.description,
      notes: movement.notes ?? null,
      sourceAccount: {
        id: sourceAccount.id ?? movement.sourceAccountId,
        name: sourceAccount.name ?? movement.sourceAccountName,
        accountType: sourceAccount.accountType ?? movement.sourceAccountType,
        currency: sourceAccount.currency ?? movement.sourceCurrency,
      },
      destinationAccount: {
        id: destinationAccount.id ?? movement.destinationAccountId,
        name: destinationAccount.name ?? movement.destinationAccountName,
        accountType: destinationAccount.accountType ?? movement.destinationAccountType,
        currency: destinationAccount.currency ?? movement.destinationCurrency,
      },
      sourceAmount: movement.sourceAmount,
      sourceCurrency: movement.sourceCurrency,
      destinationAmount: movement.destinationAmount,
      destinationCurrency: movement.destinationCurrency,
      commission: movement.commission
        ? {
            expenseRootTransactionId: movement.commission.expenseRootTransactionId,
            amount: movement.commission.amount,
            currency: movement.commission.currency,
          }
        : null,
      createdAt: movement.createdAt,
    };
  }
  throw new Error(`Unknown movement kind: ${movement.kind ?? movement.transactionType}`);
}

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

export function canonicalizeV2Value(value: unknown): unknown {
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
}: GetFinanceTransactionDetailOptions): Promise<FinanceTransactionDetailDto> =>
  requestJson<unknown>(
    `/api/finance/transactions/${transactionId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  ).then(normalizeFinanceTransactionDetailPayload);

type GetFinanceTransferDetailOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  transferId: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const getFinanceTransferDetail = ({
  accessToken,
  contextType,
  transferId,
  signal,
  contextScope,
}: GetFinanceTransferDetailOptions): Promise<FinanceTransferDetailDto> =>
  requestJson<FinanceTransferDetailDto>(
    `/api/finance/transfers/${transferId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export type TransferLifecycleResponse = {
  transfer: FinanceTransferDto;
  outcome: 'replay' | 'trashed' | 'restored';
};

type TransferLifecycleOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  personId: string;
  householdId: string | null;
  transferId: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

async function transferLifecyclePayloadHash(
  operation: 'finance.transfer.trash' | 'finance.transfer.restore',
  contextType: FinanceContextType,
  personId: string,
  householdId: string | null,
  transferId: string,
  mutationId: string,
): Promise<string> {
  return hashIdempotencyRequestV2({
    operation,
    scopeType: contextType,
    scopeId: contextType === 'personal' ? personId : householdId,
    targetId: transferId,
    payload: { transferId },
    expectedVersion: null,
    mutationId,
  });
}

async function mutateTransferLifecycle(
  operation: 'finance.transfer.trash' | 'finance.transfer.restore',
  pathAction: 'trash' | 'restore',
  options: TransferLifecycleOptions,
): Promise<TransferLifecycleResponse> {
  const mutationId = generateMutationId();
  const idempotencyKey = createIdempotencyKey(operation);
  const payloadHash = await transferLifecyclePayloadHash(
    operation,
    options.contextType,
    options.personId,
    options.householdId,
    options.transferId,
    mutationId,
  );

  return requestJson<TransferLifecycleResponse>(
    `/api/finance/transfers/${options.transferId}/${pathAction}`,
    {
      method: 'POST',
      accessToken: options.accessToken,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      mutationId,
      idempotencyKey,
      body: {
        contextType: options.contextType,
        payloadHash,
      },
      signal: options.signal,
      contextScope: options.contextScope,
    },
  );
}

export const trashFinanceTransfer = (options: TransferLifecycleOptions) =>
  mutateTransferLifecycle('finance.transfer.trash', 'trash', options);

export const restoreFinanceTransfer = (options: TransferLifecycleOptions) =>
  mutateTransferLifecycle('finance.transfer.restore', 'restore', options);

type CreateFinanceRefundOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  personId: string;
  householdId: string | null;
  transactionId: string;
  amount: string;
  effectiveDate: string;
  mutationId: string;
  idempotencyKey: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const createFinanceRefund = async ({
  accessToken,
  contextType,
  personId,
  householdId,
  transactionId,
  amount,
  effectiveDate,
  mutationId,
  idempotencyKey,
  signal,
  contextScope,
}: CreateFinanceRefundOptions): Promise<FinanceRefundMutationResponse> => {
  const scopeId = contextType === 'personal' ? personId : householdId!;
  const payload = { transactionId, amount, effectiveDate };
  await hashIdempotencyRequestV2({
    operation: 'finance.refund.create',
    scopeType: contextType,
    scopeId,
    targetId: transactionId,
    payload,
    expectedVersion: null,
    mutationId,
  });

  return requestJson<FinanceRefundMutationResponse>('/api/finance/refunds', {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
    },
    signal,
    contextScope,
  });
};

type CorrectFinanceRefundOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  personId: string;
  householdId: string | null;
  refundEventId: string;
  amount: string;
  effectiveDate: string;
  mutationId: string;
  idempotencyKey: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const correctFinanceRefund = async ({
  accessToken,
  contextType,
  personId,
  householdId,
  refundEventId,
  amount,
  effectiveDate,
  mutationId,
  idempotencyKey,
  signal,
  contextScope,
}: CorrectFinanceRefundOptions): Promise<FinanceRefundMutationResponse> => {
  const scopeId = contextType === 'personal' ? personId : householdId!;
  const payload = { refundEventId, amount, effectiveDate };
  await hashIdempotencyRequestV2({
    operation: 'finance.refund.correct',
    scopeType: contextType,
    scopeId,
    targetId: refundEventId,
    payload,
    expectedVersion: null,
    mutationId,
  });

  return requestJson<FinanceRefundMutationResponse>('/api/finance/refunds/correct', {
    method: 'POST',
    accessToken,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
    body: {
      ...payload,
      contextType,
      mutationId,
      idempotencyKey,
    },
    signal,
    contextScope,
  });
};

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
        ...payload,
        transactionId,
        contextType,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
      signal,
      contextScope,
    },
  ).then(assertCanonicalCorrectionSuccess);
};
