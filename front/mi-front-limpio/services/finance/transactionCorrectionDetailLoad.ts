import { ApiError } from '../api';
import type { FinanceTransactionDetailDto } from './financeTransactionDetail';
import type { CorrectFinanceTransactionPayload } from './financeMovements';
import {
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from './moneyInputValue';

export type TransactionCorrectionOriginal = {
  id: string;
  transactionType: 'expense' | 'income';
  amount: string;
  currency: string;
  transactionDate: string;
  description: string | null;
  notes: string | null;
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  accountId: string | null;
  accountName: string | null;
  accountCurrency: string | null;
};

export type TransactionCorrectionDraft = {
  amountText: string;
  amount: MoneyInputParseResult;
  currency: MoneyInputCurrencyCode;
  description: string;
  notes: string;
  date: string;
  selectedCategoryId: string | null;
  expenseAccountId: string | null;
  incomeAccountId: string | null;
};

export type TransactionCorrectionCanonicalDraft = {
  amount: string | null;
  currency: MoneyInputCurrencyCode;
  transactionDate: string;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  notes: string;
};

export type TransactionCorrectionChangeField =
  | 'amount'
  | 'currency'
  | 'transactionDate'
  | 'description'
  | 'categoryId'
  | 'accountId'
  | 'notes';

export type TransactionCorrectionChange = {
  field: TransactionCorrectionChangeField;
  label: string;
  oldValue: string;
  newValue: string;
};

export type TransactionCorrectionSaveBlocker =
  | 'submitting'
  | 'missingMutationId'
  | 'missingIdempotencyKey'
  | 'missingOriginalTransaction'
  | 'missingCanonicalDraft'
  | 'missingAccessToken'
  | 'missingPersonId'
  | 'invalidAccountSelection';

export type TransactionCorrectionDetailLoadResult =
  | {
      step: 'form';
      error: null;
      original: TransactionCorrectionOriginal;
      draft: TransactionCorrectionDraft;
    }
  | {
      step: 'error';
      error: string;
      original: null;
      draft: null;
    };

export type TransactionCorrectionDetailPrefetch = {
  transactionId: string;
  contextType: string;
  detail: FinanceTransactionDetailDto | null;
  promise: Promise<FinanceTransactionDetailDto> | null;
  failed: boolean;
};

export function transactionCorrectionOriginalFromDetail(
  tx: FinanceTransactionDetailDto,
): TransactionCorrectionOriginal {
  return {
    id: tx.id,
    transactionType: tx.transactionType,
    amount: tx.amount,
    currency: tx.currency,
    transactionDate: tx.transactionDate,
    description: tx.description,
    notes: tx.notes,
    categoryId: tx.categoryId,
    categoryLabelSnapshot: tx.categoryLabelSnapshot,
    accountId: tx.accountId,
    accountName: tx.accountName,
    accountCurrency: tx.accountCurrency,
  };
}

export function transactionCorrectionDraftFromOriginal(
  original: TransactionCorrectionOriginal,
): TransactionCorrectionDraft {
  const currency = original.currency as MoneyInputCurrencyCode;
  return {
    amountText: original.amount,
    amount: parseMoneyInputText(original.amount, currency),
    currency,
    description: original.description ?? '',
    notes: original.notes ?? '',
    date: original.transactionDate,
    selectedCategoryId: original.categoryId,
    expenseAccountId: original.transactionType === 'expense' ? original.accountId : null,
    incomeAccountId: original.transactionType === 'income' ? original.accountId : null,
  };
}

export function normalizeCorrectionAmountForComparison(
  amountText: string | null | undefined,
  currency: string,
): string | null {
  if (amountText === null || amountText === undefined) return null;
  const parsed = parseMoneyInputText(amountText, currency as MoneyInputCurrencyCode);
  return parsed.technicalValue?.amount ?? parsed.canonicalAmount ?? amountText;
}

export function correctionAmountsEqual(
  left: string | null | undefined,
  right: string | null | undefined,
  currency: string,
): boolean {
  return normalizeCorrectionAmountForComparison(left, currency) === normalizeCorrectionAmountForComparison(right, currency);
}

function trimDraftText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function transactionCorrectionAccountIdFromDraft(
  original: TransactionCorrectionOriginal,
  draft: TransactionCorrectionDraft,
): string | null {
  return original.transactionType === 'expense' ? draft.expenseAccountId : draft.incomeAccountId;
}

export function transactionCorrectionCanonicalDraftFromDraft(
  original: TransactionCorrectionOriginal,
  draft: TransactionCorrectionDraft,
): TransactionCorrectionCanonicalDraft {
  return {
    amount: draft.amount.technicalValue?.amount ?? null,
    currency: draft.currency,
    transactionDate: draft.date,
    description: draft.description,
    categoryId: draft.selectedCategoryId,
    accountId: transactionCorrectionAccountIdFromDraft(original, draft),
    notes: draft.notes,
  };
}

export function transactionCorrectionCategoryReviewLabel(args: {
  original: TransactionCorrectionOriginal;
  selectedCategoryId: string | null;
  selectedCategoryLabel: string | null | undefined;
}): string {
  const { original, selectedCategoryId, selectedCategoryLabel } = args;
  if (selectedCategoryLabel) return selectedCategoryLabel;
  if (selectedCategoryId === original.categoryId) {
    return original.categoryLabelSnapshot ?? 'Sin categoria';
  }
  if (selectedCategoryId) return 'Categoria seleccionada';
  return 'Sin categoria';
}

export function transactionCorrectionAccountReviewLabel(args: {
  original: TransactionCorrectionOriginal;
  selectedAccountId: string | null;
  selectedAccountLabel: string | null | undefined;
}): string {
  const { original, selectedAccountId, selectedAccountLabel } = args;
  if (selectedAccountLabel) return selectedAccountLabel;
  if (selectedAccountId === original.accountId && original.accountName && original.accountCurrency) {
    return `${original.accountName} · ${original.accountCurrency}`;
  }
  if (selectedAccountId) return 'Cuenta seleccionada';
  return 'Sin cuenta';
}

export function getTransactionCorrectionSaveBlocker(args: {
  submitting: boolean;
  mutationId: string | null;
  idempotencyKey: string | null;
  original: TransactionCorrectionOriginal | null;
  draft: TransactionCorrectionCanonicalDraft | null;
  accessToken: string | null;
  personId: string | null;
  accountSelectionInvalid: boolean;
}): TransactionCorrectionSaveBlocker | null {
  if (args.submitting) return 'submitting';
  if (!args.mutationId) return 'missingMutationId';
  if (!args.idempotencyKey) return 'missingIdempotencyKey';
  if (!args.original) return 'missingOriginalTransaction';
  if (!args.draft) return 'missingCanonicalDraft';
  if (!args.accessToken) return 'missingAccessToken';
  if (!args.personId) return 'missingPersonId';
  if (args.accountSelectionInvalid) return 'invalidAccountSelection';
  return null;
}

export function isTransactionCorrectionAccountSelectionInvalid(args: {
  original: TransactionCorrectionOriginal | null;
  draft: TransactionCorrectionCanonicalDraft | null;
  selectedAccountExists: boolean;
  accountsLoading: boolean;
  accountsError: string | null;
}): boolean {
  const { original, draft, selectedAccountExists, accountsLoading, accountsError } = args;
  if (!original || !draft?.accountId) return false;

  const unchangedOriginalAccountSelected =
    draft.accountId === original.accountId &&
    draft.currency === original.currency;
  if (unchangedOriginalAccountSelected) return false;

  return !selectedAccountExists && !accountsLoading && !accountsError;
}

export function transactionCorrectionOriginalCategoryLabel(original: TransactionCorrectionOriginal): string {
  return original.categoryId && original.categoryLabelSnapshot
    ? original.categoryLabelSnapshot
    : 'Sin categoria';
}

export function transactionCorrectionOriginalAccountLabel(original: TransactionCorrectionOriginal): string {
  return original.accountId && original.accountName && original.accountCurrency
    ? `${original.accountName} · ${original.accountCurrency}`
    : 'Sin cuenta';
}

export function getTransactionCorrectionChanges(args: {
  original: TransactionCorrectionOriginal;
  draft: TransactionCorrectionCanonicalDraft;
  formatAmount: (amount: string, currency: string, transactionType: 'expense' | 'income') => string;
  formatDate: (date: string) => string;
  categoryLabel?: string | null;
  accountLabel?: string | null;
}): TransactionCorrectionChange[] {
  const { original, draft, formatAmount, formatDate, categoryLabel, accountLabel } = args;
  const changes: TransactionCorrectionChange[] = [];

  if (!correctionAmountsEqual(draft.amount, original.amount, original.currency)) {
    changes.push({
      field: 'amount',
      label: 'Monto',
      oldValue: formatAmount(original.amount, original.currency, original.transactionType),
      newValue: formatAmount(draft.amount ?? original.amount, draft.currency, original.transactionType),
    });
  }

  if (draft.currency !== original.currency) {
    changes.push({
      field: 'currency',
      label: 'Moneda',
      oldValue: original.currency,
      newValue: draft.currency,
    });
  }

  if (draft.transactionDate !== original.transactionDate) {
    changes.push({
      field: 'transactionDate',
      label: 'Fecha',
      oldValue: formatDate(original.transactionDate),
      newValue: formatDate(draft.transactionDate),
    });
  }

  const originalDescription = original.description ?? '';
  const draftDescription = trimDraftText(draft.description);
  if (originalDescription.trim() !== draftDescription) {
    changes.push({
      field: 'description',
      label: 'Descripcion',
      oldValue: originalDescription || '(vacio)',
      newValue: draftDescription || '(vacio)',
    });
  }

  if (original.categoryId !== draft.categoryId) {
    changes.push({
      field: 'categoryId',
      label: 'Categoria',
      oldValue: transactionCorrectionOriginalCategoryLabel(original),
      newValue: transactionCorrectionCategoryReviewLabel({
        original,
        selectedCategoryId: draft.categoryId,
        selectedCategoryLabel: categoryLabel,
      }),
    });
  }

  if (original.accountId !== draft.accountId) {
    changes.push({
      field: 'accountId',
      label: 'Cuenta',
      oldValue: transactionCorrectionOriginalAccountLabel(original),
      newValue: transactionCorrectionAccountReviewLabel({
        original,
        selectedAccountId: draft.accountId,
        selectedAccountLabel: accountLabel,
      }),
    });
  }

  const originalNotes = original.notes ?? '';
  const draftNotes = trimDraftText(draft.notes);
  if (originalNotes.trim() !== draftNotes) {
    changes.push({
      field: 'notes',
      label: 'Notas',
      oldValue: originalNotes || '(vacio)',
      newValue: draftNotes || '(vacio)',
    });
  }

  return changes;
}

export function buildTransactionCorrectionPayload(
  contextType: CorrectFinanceTransactionPayload['contextType'],
  original: TransactionCorrectionOriginal,
  draft: TransactionCorrectionCanonicalDraft,
): CorrectFinanceTransactionPayload {
  const description = trimDraftText(draft.description);
  const notes = trimDraftText(draft.notes);
  return {
    transactionId: original.id,
    contextType,
    amount: draft.amount ?? undefined,
    currency: draft.currency,
    transactionDate: draft.transactionDate,
    description: description || null,
    categoryId: draft.categoryId,
    accountId: draft.accountId,
    notes: notes || null,
    clearDescription: description === '' && original.description !== null,
    clearCategory: draft.categoryId === null && original.categoryId !== null,
    clearAccount: draft.accountId === null && original.accountId !== null,
    clearNotes: notes === '' && original.notes !== null,
  };
}

export function transactionCorrectionDetailErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No pudimos cargar el detalle del movimiento.';
}

export async function loadTransactionCorrectionDetail(args: {
  transactionId: string;
  contextType: string;
  prefetchedDetail: TransactionCorrectionDetailPrefetch | null | undefined;
  fetchDetail: () => Promise<FinanceTransactionDetailDto>;
}): Promise<FinanceTransactionDetailDto> {
  const { transactionId, contextType, prefetchedDetail, fetchDetail } = args;
  const matchingPrefetch =
    prefetchedDetail?.transactionId === transactionId &&
    prefetchedDetail.contextType === contextType
      ? prefetchedDetail
      : null;

  if (matchingPrefetch?.detail) {
    return matchingPrefetch.detail;
  }

  if (matchingPrefetch?.promise && !matchingPrefetch.failed) {
    try {
      return await matchingPrefetch.promise;
    } catch {
      return fetchDetail();
    }
  }

  return fetchDetail();
}

export async function resolveTransactionCorrectionDetailLoad(
  loadDetail: () => Promise<FinanceTransactionDetailDto>,
  initializeDraft: (original: TransactionCorrectionOriginal) => TransactionCorrectionDraft = transactionCorrectionDraftFromOriginal,
): Promise<TransactionCorrectionDetailLoadResult> {
  try {
    const detail = await loadDetail();
    const original = transactionCorrectionOriginalFromDetail(detail);
    const draft = initializeDraft(original);
    return { step: 'form', error: null, original, draft };
  } catch (error) {
    return {
      step: 'error',
      error: transactionCorrectionDetailErrorMessage(error),
      original: null,
      draft: null,
    };
  }
}
