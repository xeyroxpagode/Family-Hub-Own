import { OPERATION_KINDS, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';
import { generateMutationId, createIdempotencyKey } from '../api';

const encodeQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  return search.toString();
};

export type FinancePoolDto = {
  id: string;
  financialContextType: FinanceContextType;
  ownerPersonId: string | null;
  householdId: string | null;
  currency: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  balance: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ListFinancePoolsResponse = {
  currency: string;
  status: string;
  pools: FinancePoolDto[];
};

// Raw backend response shape
type RawFinancePoolSummaryResponse = {
  currency: string;
  knownOrganizable: {
    currency: string;
    knownAccountBalanceTotal: string;
    knownCreditCardLiabilityTotal: string;
    knownOrganizableNet: string;
    poolNetPosition: string;
    unassignedKnown: string;
    allocationCoverageDeficit: string;
    coverageComplete: boolean;
    unknownAccountCount: number;
    unknownCreditCardCount: number;
    knownAccountCount: number;
  };
  pools: FinancePoolDto[] | null;
};

// Normalized frontend DTO
export type FinancePoolSummaryResponse = {
  currency: string;
  knownOrganizableNet: string;
  poolNetPosition: string;
  unassignedKnown: string;
  allocationCoverageDeficit: string;
  coverageComplete: boolean;
  unknownAccountCount: number;
  unknownCreditCardCount: number;
  knownAccountCount: number;
  pools: FinancePoolDto[];
};

export type FinancePoolOperationDto = {
  id: string;
  operationType: 'ALLOCATE' | 'RELEASE' | 'TRANSFER';
  amount: string;
  currency: string;
  sourcePoolId: string | null;
  destinationPoolId: string | null;
  createdAt: string;
};

export type CreatePoolRequest = {
  name: string;
  currency: string;
  contextType: FinanceContextType;
};

export type CreatePoolResponse = {
  pool: FinancePoolDto;
  outcome: 'created' | 'replay';
};

export type RenamePoolRequest = {
  poolId: string;
  name: string;
  contextType: FinanceContextType;
};

export type RenamePoolResponse = {
  pool: FinancePoolDto;
  outcome: string;
};

export type ArchivePoolRequest = {
  poolId: string;
  contextType: FinanceContextType;
};

export type ArchivePoolResponse = {
  pool: FinancePoolDto;
  outcome: string;
};

export type AllocatePoolRequest = {
  poolId: string;
  amount: string;
  currency: string;
  contextType: FinanceContextType;
};

export type AllocatePoolResponse = {
  operation: FinancePoolOperationDto;
  poolBalance: string;
  outcome: 'created' | 'replay';
};

export type ReleasePoolRequest = {
  poolId: string;
  amount: string;
  currency: string;
  contextType: FinanceContextType;
};

export type ReleasePoolResponse = {
  operation: FinancePoolOperationDto;
  poolBalance: string;
  outcome: 'created' | 'replay';
};

export type TransferPoolRequest = {
  sourcePoolId: string;
  destinationPoolId: string;
  amount: string;
  currency: string;
  contextType: FinanceContextType;
};

export type TransferPoolResponse = {
  operation: FinancePoolOperationDto;
  sourcePoolBalance: string;
  destinationPoolBalance: string;
  outcome: 'created' | 'replay';
};

type FinanceReadOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  currency: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

type FinanceMutationOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  currency: string;
  mutationId: string;
  idempotencyKey: string;
  payloadHash: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

function normalizePoolSummary(raw: RawFinancePoolSummaryResponse): FinancePoolSummaryResponse {
  const ko = raw.knownOrganizable;
  return {
    currency: raw.currency,
    knownOrganizableNet: ko.knownOrganizableNet,
    poolNetPosition: ko.poolNetPosition,
    unassignedKnown: ko.unassignedKnown,
    allocationCoverageDeficit: ko.allocationCoverageDeficit,
    coverageComplete: ko.coverageComplete,
    unknownAccountCount: ko.unknownAccountCount,
    unknownCreditCardCount: ko.unknownCreditCardCount,
    knownAccountCount: ko.knownAccountCount,
    pools: raw.pools ?? [],
  };
}

export const listFinancePools = ({
  accessToken,
  contextType,
  currency,
  signal,
  contextScope,
}: FinanceReadOptions) =>
  requestJson<ListFinancePoolsResponse>(
    `/api/finance/pools?${encodeQuery({ contextType, currency })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const getFinancePoolSummary = ({
  accessToken,
  contextType,
  currency,
  signal,
  contextScope,
}: FinanceReadOptions) =>
  requestJson<RawFinancePoolSummaryResponse>(
    `/api/finance/pools/summary?${encodeQuery({ contextType, currency })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  ).then(normalizePoolSummary);

// Mutation helpers
function buildMutationOptions(
  accessToken: string,
  contextType: FinanceContextType,
  currency: string,
  mutationId: string,
  idempotencyKey: string,
  payloadHash: string,
  signal?: AbortSignal | null,
  contextScope?: string | null,
): FinanceMutationOptions {
  return {
    accessToken,
    contextType,
    currency,
    mutationId,
    idempotencyKey,
    payloadHash,
    signal,
    contextScope,
  };
}

// CREATE POOL
export const createFinancePool = ({
  accessToken,
  contextType,
  currency,
  name,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
  contextScope,
}: FinanceMutationOptions & { name: string }) =>
  requestJson<CreatePoolResponse>(
    '/api/finance/pools',
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { name, currency, contextType, mutationId, idempotencyKey, payloadHash },
    },
  );

// RENAME POOL
export const renameFinancePool = ({
  accessToken,
  contextType,
  currency,
  poolId,
  name,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
  contextScope,
}: FinanceMutationOptions & { poolId: string; name: string }) =>
  requestJson<RenamePoolResponse>(
    `/api/finance/pools/${poolId}/rename`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { name, contextType, mutationId, idempotencyKey, payloadHash },
    },
  );

// ARCHIVE POOL
export const archiveFinancePool = ({
  accessToken,
  contextType,
  currency,
  poolId,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
  contextScope,
}: FinanceMutationOptions & { poolId: string }) =>
  requestJson<ArchivePoolResponse>(
    `/api/finance/pools/${poolId}/archive`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { contextType, mutationId, idempotencyKey, payloadHash },
    },
  );

// ALLOCATE POOL (unassigned -> pool)
export const allocateFinancePool = ({
  accessToken,
  contextType,
  currency,
  poolId,
  amount,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
  contextScope,
}: FinanceMutationOptions & { poolId: string; amount: string }) =>
  requestJson<AllocatePoolResponse>(
    `/api/finance/pools/${poolId}/allocate`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { poolId, amount, currency, contextType, mutationId, idempotencyKey, payloadHash },
    },
  );

// RELEASE POOL (pool -> unassigned)
export const releaseFinancePool = ({
  accessToken,
  contextType,
  currency,
  poolId,
  amount,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
  contextScope,
}: FinanceMutationOptions & { poolId: string; amount: string }) =>
  requestJson<ReleasePoolResponse>(
    `/api/finance/pools/${poolId}/release`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { poolId, amount, currency, contextType, mutationId, idempotencyKey, payloadHash },
    },
  );

// TRANSFER POOL (pool -> pool)
export const transferFinancePool = ({
  accessToken,
  contextType,
  currency,
  sourcePoolId,
  destinationPoolId,
  amount,
  mutationId,
  idempotencyKey,
  payloadHash,
  signal,
  contextScope,
}: FinanceMutationOptions & { sourcePoolId: string; destinationPoolId: string; amount: string }) =>
  requestJson<TransferPoolResponse>(
    `/api/finance/pools/transfer`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: { sourcePoolId, destinationPoolId, amount, currency, contextType, mutationId, idempotencyKey, payloadHash },
    },
  );

export { normalizePoolSummary };

// Frontend client methods for Expense-Pool integration
export type AssignExpenseToPoolRequest = {
  expenseRootTransactionId: string;
  poolId: string;
  contextType: FinanceContextType;
  currency: string;
  mutationId: string;
  idempotencyKey: string;
  payloadHash: string;
};

export type AssignExpenseToPoolResponse = {
  expenseRootTransactionId: string;
  poolId: string;
  outcome: 'created' | 'replay' | 'assigned';
};

export type UnassignExpensePoolRequest = {
  expenseRootTransactionId: string;
  contextType: FinanceContextType;
  currency: string;
  mutationId: string;
  idempotencyKey: string;
  payloadHash: string;
};

export type UnassignExpensePoolResponse = {
  expenseRootTransactionId: string;
  poolId: string | null;
  outcome: 'unassigned' | 'replay';
};

export type FinanceExpensePoolAssignmentDto = {
  poolId: string;
  poolName: string;
  currency: string;
  status: 'ACTIVE' | 'ARCHIVED';
};

export type FinanceExpensePoolAssignmentResponse = {
  rootTransactionId: string;
  assignment: FinanceExpensePoolAssignmentDto | null;
};

export const getExpensePoolAssignmentClient = ({
  accessToken,
  contextType,
  rootTransactionId,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  rootTransactionId: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}) =>
  requestJson<FinanceExpensePoolAssignmentResponse>(
    `/api/finance/pools/expense-assignment/${rootTransactionId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

function canonicalizePoolMutationValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizePoolMutationValue(item));
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    Object.keys(value as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        sorted[key] = canonicalizePoolMutationValue((value as Record<string, unknown>)[key]);
      });
    return sorted;
  }
  return value;
}

async function buildFrontendPayloadHash(operation: string, financeContext: {
  contextType: FinanceContextType;
  personId: string | null;
  householdId: string | null;
}, targetId: string | null, payload: unknown, mutationId: string): Promise<string> {
  const Crypto = await import('expo-crypto');
  
  const scopeId = financeContext.contextType === 'personal' ? financeContext.personId : financeContext.householdId;
  
  const canonical = canonicalizePoolMutationValue({
    operation: operation ?? '',
    scope_type: financeContext.contextType ?? '',
    scope_id: scopeId ?? null,
    target_id: targetId ?? null,
    payload: payload ?? null,
    expected_version: null,
    mutation_id: mutationId ?? '',
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

export const assignExpenseToPoolClient = async ({
  accessToken,
  contextType,
  currency,
  expenseRootTransactionId,
  poolId,
  personId,
  householdId,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  currency: string;
  expenseRootTransactionId: string;
  poolId: string;
  personId: string | null;
  householdId: string | null;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}): Promise<AssignExpenseToPoolResponse> => {
  const mutationId = generateMutationId();
  const idempotencyKey = createIdempotencyKey('finance.pool.expense.assign');
  const payload = { expenseRootTransactionId, poolId };
  const payloadHash = await buildFrontendPayloadHash(
    'finance.pool.expense.assign',
    { contextType, personId, householdId },
    expenseRootTransactionId,
    payload,
    mutationId
  );

  return requestJson<AssignExpenseToPoolResponse>(
    '/api/finance/pools/expense-assignment',
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: {
        expenseRootTransactionId,
        poolId,
        contextType,
        currency,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
    },
  );
};

export const unassignExpensePoolClient = async ({
  accessToken,
  contextType,
  currency,
  expenseRootTransactionId,
  personId,
  householdId,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  currency: string;
  expenseRootTransactionId: string;
  personId: string | null;
  householdId: string | null;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}): Promise<UnassignExpensePoolResponse> => {
  const mutationId = generateMutationId();
  const idempotencyKey = createIdempotencyKey('finance.pool.expense.unassign');
  const payload = { expenseRootTransactionId };
  const payloadHash = await buildFrontendPayloadHash(
    'finance.pool.expense.unassign',
    { contextType, personId, householdId },
    expenseRootTransactionId,
    payload,
    mutationId
  );

  return requestJson<UnassignExpensePoolResponse>(
    '/api/finance/pools/expense-assignment/unassign',
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: {
        expenseRootTransactionId,
        contextType,
        currency,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
    },
  );
};

// Income Pool distribution types
export type DistributeIncomeToPoolsRequest = {
  incomeRootTransactionId: string;
  currency: string;
  allocations: Array<{ poolId: string; amount: string }>;
  contextType: FinanceContextType;
  mutationId: string;
  idempotencyKey: string;
  payloadHash: string;
};

export type DistributeIncomeToPoolsResponse = {
  operationId: string;
  incomeRootTransactionId: string;
  amount: string;
  outcome: 'created' | 'replay';
};

export type FinanceIncomePoolDistributionDto = {
  poolId: string;
  poolName: string;
  amount: string;
  currency: string;
};

export type FinanceIncomePoolDistributionResponse = {
  incomeRootTransactionId: string;
  distributions: FinanceIncomePoolDistributionDto[];
};

export const distributeIncomeToPoolsClient = async ({
  accessToken,
  contextType,
  currency,
  incomeRootTransactionId,
  allocations,
  personId,
  householdId,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  currency: string;
  incomeRootTransactionId: string;
  allocations: Array<{ poolId: string; amount: string }>;
  personId: string | null;
  householdId: string | null;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}): Promise<DistributeIncomeToPoolsResponse> => {
  const mutationId = generateMutationId();
  const idempotencyKey = createIdempotencyKey('finance.pool.income.distribute');
  const payload = { incomeRootTransactionId, currency, allocations };
  const payloadHash = await buildFrontendPayloadHash(
    'finance.pool.income.distribute',
    { contextType, personId, householdId },
    incomeRootTransactionId,
    payload,
    mutationId
  );

  return requestJson<DistributeIncomeToPoolsResponse>(
    '/api/finance/pools/income-distributions',
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: {
        incomeRootTransactionId,
        currency,
        allocations,
        contextType,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
    },
  );
};

export const getIncomePoolDistributionClient = ({
  accessToken,
  contextType,
  incomeRootTransactionId,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  incomeRootTransactionId: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}) =>
  requestJson<FinanceIncomePoolDistributionResponse>(
    `/api/finance/pools/income-distributions/${incomeRootTransactionId}?${encodeQuery({ contextType })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

// Category → Pool Suggested Default (Stage 6E.4)
export type FinanceCategoryPoolDefaultDto = {
  id: string;
  categoryId: string;
  financialContextType: FinanceContextType;
  ownerPersonId: string | null;
  householdId: string | null;
  currency: string;
  poolId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetCategoryPoolDefaultResponse = {
  categoryId: string;
  poolId: string | null;
  poolName: string | null;
  poolStatus: string | null;
  currency: string;
};

export type UpsertCategoryPoolDefaultRequest = {
  categoryId: string;
  currency: string;
  poolId: string | null;
  contextType: FinanceContextType;
  mutationId: string;
  idempotencyKey: string;
  payloadHash: string;
};

export type UpsertCategoryPoolDefaultResponse = {
  default: FinanceCategoryPoolDefaultDto;
  outcome: 'upserted' | 'replay';
};

export type ClearCategoryPoolDefaultRequest = {
  categoryId: string;
  currency: string;
  contextType: FinanceContextType;
  mutationId: string;
  idempotencyKey: string;
  payloadHash: string;
};

export type ClearCategoryPoolDefaultResponse = {
  default: FinanceCategoryPoolDefaultDto;
  outcome: 'cleared' | 'noop' | 'replay';
};

export const getCategoryPoolDefaultClient = ({
  accessToken,
  contextType,
  categoryId,
  currency,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  categoryId: string;
  currency: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}) =>
  requestJson<GetCategoryPoolDefaultResponse>(
    `/api/finance/categories/pool-default?${encodeQuery({ contextType, categoryId, currency })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );

export const upsertCategoryPoolDefaultClient = async ({
  accessToken,
  contextType,
  categoryId,
  currency,
  poolId,
  personId,
  householdId,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  categoryId: string;
  currency: string;
  poolId: string | null;
  personId: string | null;
  householdId: string | null;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}): Promise<UpsertCategoryPoolDefaultResponse> => {
  const mutationId = generateMutationId();
  const idempotencyKey = createIdempotencyKey('finance.category_pool_default.upsert');
  const payload = { categoryId, currency, poolId };
  const payloadHash = await buildFrontendPayloadHash(
    'finance.category_pool_default.upsert',
    { contextType, personId, householdId },
    categoryId,
    payload,
    mutationId,
  );

  return requestJson<UpsertCategoryPoolDefaultResponse>(
    '/api/finance/categories/pool-default',
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: {
        categoryId,
        currency,
        poolId,
        contextType,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
    },
  );
};

export const clearCategoryPoolDefaultClient = async ({
  accessToken,
  contextType,
  categoryId,
  currency,
  personId,
  householdId,
  signal,
  contextScope,
}: {
  accessToken: string;
  contextType: FinanceContextType;
  categoryId: string;
  currency: string;
  personId: string | null;
  householdId: string | null;
  signal?: AbortSignal | null;
  contextScope?: string | null;
}): Promise<ClearCategoryPoolDefaultResponse> => {
  const mutationId = generateMutationId();
  const idempotencyKey = createIdempotencyKey('finance.category_pool_default.clear');
  const payload = { categoryId, currency };
  const payloadHash = await buildFrontendPayloadHash(
    'finance.category_pool_default.clear',
    { contextType, personId, householdId },
    categoryId,
    payload,
    mutationId,
  );

  return requestJson<ClearCategoryPoolDefaultResponse>(
    '/api/finance/categories/pool-default/clear',
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      method: 'POST',
      mutationId,
      idempotencyKey,
      body: {
        categoryId,
        currency,
        contextType,
        mutationId,
        idempotencyKey,
        payloadHash,
      },
    },
  );
};
