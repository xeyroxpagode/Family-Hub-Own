import type { FinanceContextType } from './financeContext';

export type FinanceTransactionDetailStatus = 'ACTIVE' | 'TRASHED' | 'SUPERSEDED';

export type FinanceTransactionDetailDto = {
  id: string;
  rootTransactionId: string;
  transferId: string | null;
  transactionType: 'expense' | 'income';
  amount: string;
  grossAmount: string;
  totalRefunded: string;
  netAmount: string;
  refundCount: number;
  refundEvents: FinanceRefundEventDto[];
  currency: string;
  financialContextType: FinanceContextType;
  ownerPersonId: string | null;
  householdId: string | null;
  transactionDate: string;
  description: string | null;
  notes: string | null;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  status: FinanceTransactionDetailStatus;
  trashedAt: string | null;
  correctedFromTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  accountId: string | null;
  accountName: string | null;
  accountCurrency: string | null;
  accountType: 'ACCOUNT' | 'CREDIT_CARD' | null;
  accountBalanceState: 'KNOWN' | 'UNKNOWN' | null;
};

export type FinanceRefundEventDto = {
  id: string;
  rootRefundEventId: string;
  correctedFromRefundEventId: string | null;
  amount: string;
  effectiveDate: string;
  status: 'ACTIVE' | 'SUPERSEDED';
  createdAt: string;
  updatedAt: string;
};

const DETAIL_TYPES = new Set(['expense', 'income']);
const DETAIL_STATUSES = new Set(['ACTIVE', 'TRASHED', 'SUPERSEDED']);
const CONTEXT_TYPES = new Set(['personal', 'household']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`Finance transaction detail field ${key} must be a string.`);
  }
  return value;
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`Finance transaction detail field ${key} must be a string or null.`);
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function readOptionalNumber(record: Record<string, unknown>, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readRefundEvents(value: unknown): FinanceRefundEventDto[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((event) => ({
    id: readString(event, 'id'),
    rootRefundEventId: readString(event, 'rootRefundEventId'),
    correctedFromRefundEventId: readNullableString(event, 'correctedFromRefundEventId'),
    amount: readString(event, 'amount'),
    effectiveDate: readString(event, 'effectiveDate'),
    status: readString(event, 'status') as 'ACTIVE' | 'SUPERSEDED',
    createdAt: readString(event, 'createdAt'),
    updatedAt: readString(event, 'updatedAt'),
  }));
}

function readTransactionType(record: Record<string, unknown>): 'expense' | 'income' {
  const value = readString(record, 'transactionType');
  if (!DETAIL_TYPES.has(value)) {
    throw new Error(`Finance transaction detail transactionType is not canonical: ${value}.`);
  }
  return value as 'expense' | 'income';
}

function readContextType(record: Record<string, unknown>): FinanceContextType {
  const value = readString(record, 'financialContextType');
  if (!CONTEXT_TYPES.has(value)) {
    throw new Error(`Finance transaction detail financialContextType is not canonical: ${value}.`);
  }
  return value as FinanceContextType;
}

function readStatus(record: Record<string, unknown>): FinanceTransactionDetailStatus {
  const value = readString(record, 'status');
  if (!DETAIL_STATUSES.has(value)) {
    throw new Error(`Finance transaction detail status is not canonical: ${value}.`);
  }
  return value as FinanceTransactionDetailStatus;
}

export function normalizeFinanceTransactionDetailPayload(payload: unknown): FinanceTransactionDetailDto {
  if (!isRecord(payload)) {
    throw new Error('Finance transaction detail response must be an object.');
  }

  return {
    id: readString(payload, 'id'),
    rootTransactionId: readOptionalString(payload, 'rootTransactionId', readString(payload, 'id')),
    transferId: readNullableString(payload, 'transferId'),
    transactionType: readTransactionType(payload),
    amount: readString(payload, 'amount'),
    grossAmount: readOptionalString(payload, 'grossAmount', readString(payload, 'amount')),
    totalRefunded: readOptionalString(payload, 'totalRefunded', '0'),
    netAmount: readOptionalString(payload, 'netAmount', readString(payload, 'amount')),
    refundCount: readOptionalNumber(payload, 'refundCount', 0),
    refundEvents: readRefundEvents(payload.refundEvents),
    currency: readString(payload, 'currency'),
    financialContextType: readContextType(payload),
    ownerPersonId: readNullableString(payload, 'ownerPersonId'),
    householdId: readNullableString(payload, 'householdId'),
    transactionDate: readString(payload, 'transactionDate'),
    description: readNullableString(payload, 'description'),
    notes: readNullableString(payload, 'notes'),
    categoryId: readNullableString(payload, 'categoryId'),
    categoryLabelSnapshot: readNullableString(payload, 'categoryLabelSnapshot'),
    status: readStatus(payload),
    trashedAt: readNullableString(payload, 'trashedAt'),
    correctedFromTransactionId: readNullableString(payload, 'correctedFromTransactionId'),
    createdAt: readString(payload, 'createdAt'),
    updatedAt: readString(payload, 'updatedAt'),
    accountId: readNullableString(payload, 'accountId'),
    accountName: readNullableString(payload, 'accountName'),
    accountCurrency: readNullableString(payload, 'accountCurrency'),
    accountType: readNullableString(payload, 'accountType') as 'ACCOUNT' | 'CREDIT_CARD' | null,
    accountBalanceState: readNullableString(payload, 'accountBalanceState') as 'KNOWN' | 'UNKNOWN' | null,
  };
}
