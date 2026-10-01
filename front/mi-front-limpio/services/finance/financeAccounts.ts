import { OPERATION_KINDS, createIdempotencyKey, generateMutationId, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';

export const FINANCE_ACCOUNT_TYPES = {
  ACCOUNT: 'ACCOUNT',
  CREDIT_CARD: 'CREDIT_CARD',
} as const;
export type FinanceAccountType = typeof FINANCE_ACCOUNT_TYPES[keyof typeof FINANCE_ACCOUNT_TYPES];

export const FINANCE_ACCOUNT_BALANCE_STATES = {
  UNKNOWN: 'UNKNOWN',
  KNOWN: 'KNOWN',
} as const;
export type FinanceAccountBalanceState = typeof FINANCE_ACCOUNT_BALANCE_STATES[keyof typeof FINANCE_ACCOUNT_BALANCE_STATES];

export const FINANCE_ACCOUNT_STATUSES = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type FinanceAccountStatus = typeof FINANCE_ACCOUNT_STATUSES[keyof typeof FINANCE_ACCOUNT_STATUSES];

export type FinanceAccountDto = {
  id: string;
  financialContextType: FinanceContextType;
  ownerPersonId: string | null;
  householdId: string | null;
  name: string;
  currency: string;
  accountType: FinanceAccountType;
  balanceState: FinanceAccountBalanceState;
  currentBalance: string | null;
  closingDay: number | null;
  dueDay: number | null;
  status: FinanceAccountStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListFinanceAccountsResponse = {
  accounts: FinanceAccountDto[];
};

export type GetFinanceAccountResponse = {
  account: FinanceAccountDto;
};

export type UpdateFinanceAccountPayload = {
  name: string;
  contextType: FinanceContextType;
  closingDay?: number | null;
  dueDay?: number | null;
};

export type UpdateFinanceAccountResponse = {
  account: FinanceAccountDto;
  outcome: 'noop' | 'updated';
};

export type InitialBalancePayload = {
  amount: string;
  effectiveDate: string;
};

export type CreateFinanceAccountPayload = {
  name: string;
  currency: string;
  accountType: FinanceAccountType;
  contextType: FinanceContextType;
  initialBalance?: InitialBalancePayload;
  closingDay?: number | null;
  dueDay?: number | null;
};

export type CreateFinanceAccountResponse = {
  account: FinanceAccountDto;
};

export type CreateBalanceAnchorPayload = {
  amount: string;
  effectiveDate: string;
  contextType: FinanceContextType;
};

export type CreateBalanceAnchorResponse = {
  account: FinanceAccountDto;
  outcome: 'anchored';
};

export type CorrectBalancePayload = {
  correctedBalance: string;
  effectiveDate: string;
  contextType: FinanceContextType;
  mutationId?: string;
  idempotencyKey?: string;
};

export type CorrectBalanceResponse = {
  account: FinanceAccountDto;
  outcome: 'corrected';
};

export type LifecycleAccountResponse = {
  account: FinanceAccountDto;
  outcome: 'noop' | 'archived' | 'unarchived';
};

export type FinanceAccountActivityDto = {
  id: string;
  effectType: 'expense' | 'income' | 'transfer' | 'refund';
  effectRole: 'PRIMARY' | 'TRANSFER_SOURCE' | 'TRANSFER_DESTINATION' | 'REFUND';
  effectAmount: string;
  currency: string;
  date: string;
  description: string | null;
  categoryLabelSnapshot: string | null;
  title: string;
  operationTag: 'expense' | 'income' | 'transfer' | 'refund';
  transactionId: string | null;
  transferId: string | null;
  refundEventId: string | null;
  createdAt: string;
};

export type GetFinanceAccountActivityResponse = {
  account: FinanceAccountDto;
  activity: FinanceAccountActivityDto[];
};

export type CreditCardInstallmentDto = {
  ordinal: number;
  amount: string;
  cycleCloseDate: string | null;
  cycleDueDate: string | null;
};

export type CreditCardInstallmentPlanDto = {
  id: string;
  expenseRootTransactionId: string;
  installmentCount: number;
  totalAmount: string;
  currency: string;
  closingDaySnapshot: number | null;
  dueDaySnapshot: number | null;
  purchaseTitle: string | null;
  purchaseDate: string | null;
  futureInstallmentCount: number;
  futureAmount: string;
  installments: CreditCardInstallmentDto[];
  futureInstallments: CreditCardInstallmentDto[];
  createdAt: string;
  updatedAt: string;
};

export type ListCreditCardInstallmentPlansResponse = {
  plans: CreditCardInstallmentPlanDto[];
};

const encodeQuery = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  }
  return search.toString();
};

type ListAccountsOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  includeArchived?: boolean;
  status?: FinanceAccountStatus;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const listFinanceAccounts = ({
  accessToken,
  contextType,
  includeArchived,
  status,
  signal,
  contextScope,
}: ListAccountsOptions) =>
  requestJson<ListFinanceAccountsResponse>(
    `/api/finance/accounts?${encodeQuery({
      contextType,
      includeArchived: includeArchived ? 'true' : undefined,
      status,
    })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const getFinanceAccount = (
  accessToken: string,
  accountId: string,
  contextType: FinanceContextType,
) =>
  requestJson<GetFinanceAccountResponse>(
    `/api/finance/accounts/${accountId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const createFinanceAccount = (
  accessToken: string,
  payload: CreateFinanceAccountPayload,
) =>
  requestJson<CreateFinanceAccountResponse>('/api/finance/accounts', {
    method: 'POST',
    accessToken,
    body: payload,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
  });

export const updateFinanceAccount = (
  accessToken: string,
  accountId: string,
  payload: UpdateFinanceAccountPayload,
) =>
  requestJson<UpdateFinanceAccountResponse>(`/api/finance/accounts/${accountId}`, {
    method: 'PATCH',
    accessToken,
    body: payload,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
  });

export const createFinanceAccountBalanceAnchor = (
  accessToken: string,
  accountId: string,
  payload: CreateBalanceAnchorPayload,
) =>
  requestJson<CreateBalanceAnchorResponse>(`/api/finance/accounts/${accountId}/balance-anchor`, {
    method: 'POST',
    accessToken,
    body: payload,
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
  });

export const correctFinanceAccountBalance = (
  accessToken: string,
  accountId: string,
  payload: CorrectBalancePayload,
) => {
  const mutationId = payload.mutationId ?? generateMutationId();
  const idempotencyKey = payload.idempotencyKey ?? createIdempotencyKey('finance.account.balance.correct');

  return requestJson<CorrectBalanceResponse>(`/api/finance/accounts/${accountId}/balance-correction`, {
    method: 'POST',
    accessToken,
    body: {
      ...payload,
      mutationId,
      idempotencyKey,
    },
    mutationId,
    idempotencyKey,
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
  });
};

export const archiveFinanceAccount = (
  accessToken: string,
  accountId: string,
  contextType: FinanceContextType,
) =>
  requestJson<LifecycleAccountResponse>(`/api/finance/accounts/${accountId}/archive`, {
    method: 'POST',
    accessToken,
    body: { contextType },
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
  });

export const unarchiveFinanceAccount = (
  accessToken: string,
  accountId: string,
  contextType: FinanceContextType,
) =>
  requestJson<LifecycleAccountResponse>(`/api/finance/accounts/${accountId}/unarchive`, {
    method: 'POST',
    accessToken,
    body: { contextType },
    operationKind: OPERATION_KINDS.NON_VERSIONED_MUTATION,
  });

export const getFinanceAccountActivity = (
  accessToken: string,
  accountId: string,
  contextType: FinanceContextType,
  options: { limit?: number; signal?: AbortSignal | null; contextScope?: string | null } = {},
) =>
  requestJson<GetFinanceAccountActivityResponse>(
    `/api/finance/accounts/${accountId}/activity?${encodeQuery({
      contextType,
      limit: options.limit ? String(options.limit) : undefined,
    })}`,
    {
      accessToken,
      signal: options.signal ?? null,
      contextScope: options.contextScope ?? null,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const listCreditCardInstallmentPlans = (
  accessToken: string,
  accountId: string,
  contextType: FinanceContextType,
  options: { limit?: number; signal?: AbortSignal | null; contextScope?: string | null } = {},
) =>
  requestJson<ListCreditCardInstallmentPlansResponse>(
    `/api/finance/accounts/${accountId}/installments?${encodeQuery({
      contextType,
      limit: options.limit ? String(options.limit) : undefined,
    })}`,
    {
      accessToken,
      signal: options.signal ?? null,
      contextScope: options.contextScope ?? null,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );
