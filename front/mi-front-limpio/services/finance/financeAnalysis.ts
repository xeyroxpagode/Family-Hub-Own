import { OPERATION_KINDS, requestJson } from '../api';
import type { FinanceContextType } from './financeContext';

const encodeQuery = (params: Record<string, string>) => {
  const search = new URLSearchParams(params);
  return search.toString();
};

export type FinanceAnalysisPeriodType = 'MONTHLY' | 'YEARLY';

export type FinanceAnalysisTotalsDto = {
  grossExpense: string;
  refundedAmount: string;
  totalRefunded: string;
  netExpense: string;
  income: string;
  netResult: string;
};

export type FinanceAnalysisPreviousDto = {
  period: string;
  periodStart: string;
  periodEndExclusive: string;
  totals: FinanceAnalysisTotalsDto;
};

export type FinanceAnalysisComparisonDto = {
  previousPeriod: string;
  netExpense: FinanceAnalysisChangeDto;
  income: FinanceAnalysisChangeDto;
  netResult: FinanceAnalysisChangeDto;
};

export type FinanceAnalysisChangeDto = {
  current: string;
  previous: string;
  delta: string;
  percentChange: string | null;
  comparisonKind: 'NONE' | 'NEW' | 'UNCHANGED' | 'PERCENT';
};

export type FinanceCategoryExpenseDto = {
  categoryId: string | null;
  label: string;
  grossExpense: string;
  refundedAmount: string;
  netExpense: string;
  shareOfNetExpense: string | null;
};

export type FinanceCategoryIncomeDto = {
  categoryId: string | null;
  label: string;
  income: string;
};

export type FinanceAccountExpenseDto = {
  accountId: string | null;
  label: string;
  accountType: string | null;
  grossExpense: string;
  refundedAmount: string;
  netExpense: string;
};

export type FinanceAccountIncomeDto = {
  accountId: string | null;
  label: string;
  accountType: string | null;
  income: string;
};

export type FinanceRankingsDto = {
  topExpenseCategories: Array<{
    categoryId: string | null;
    label: string;
    netExpense: string;
  }>;
  largestCategoryIncrease: {
    categoryId: string | null;
    label: string;
    currentNetExpense: string;
    previousNetExpense: string;
    delta: string;
    comparisonKind: 'PERCENT';
    percentChange: string;
  } | null;
  largestCategoryDecrease: {
    categoryId: string | null;
    label: string;
    currentNetExpense: string;
    previousNetExpense: string;
    delta: string;
    comparisonKind: 'PERCENT';
    percentChange: string;
  } | null;
  newExpenseCategories: Array<{
    categoryId: string | null;
    label: string;
    currentNetExpense: string;
    previousNetExpense: string;
    delta: string;
    comparisonKind: 'NEW';
    percentChange: null;
  }>;
};

export type FinanceSpendingLimitProgressDto = {
  id: string;
  scopeType: 'OVERALL' | 'CATEGORY';
  categoryId: string | null;
  categoryLabelSnapshot: string | null;
  periodType: FinanceAnalysisPeriodType;
  period: string;
  recurrenceType: 'ONE_OFF' | 'RECURRING';
  amount: string;
  spent: string;
  remaining: string;
  percentUsed: string;
  status: 'UNDER' | 'AT' | 'OVER';
  overBy: string;
  sourceKind: 'VERSION' | 'EXCEPTION';
  sourceId: string;
};

export type FinanceAnalysisResponse = {
  contextType: FinanceContextType;
  currency: string;
  periodType: FinanceAnalysisPeriodType;
  period: string;
  periodStart: string;
  periodEndExclusive: string;
  totals: FinanceAnalysisTotalsDto;
  previous: FinanceAnalysisPreviousDto;
  comparison: FinanceAnalysisComparisonDto;
  categoryExpenses: FinanceCategoryExpenseDto[];
  categoryIncome: FinanceCategoryIncomeDto[];
  accountExpenses: FinanceAccountExpenseDto[];
  accountIncome: FinanceAccountIncomeDto[];
  rankings: FinanceRankingsDto;
  spendingLimitProgress: FinanceSpendingLimitProgressDto[];
};

type FinanceReadOptions = {
  accessToken: string;
  contextType: FinanceContextType;
  currency: string;
  periodType?: FinanceAnalysisPeriodType;
  period?: string;
  signal?: AbortSignal | null;
  contextScope?: string | null;
};

export const getFinanceAnalysis = ({
  accessToken,
  contextType,
  currency,
  periodType = 'MONTHLY',
  period,
  signal,
  contextScope,
}: FinanceReadOptions) =>
  requestJson<FinanceAnalysisResponse>(
    `/api/finance/analysis?${encodeQuery({ contextType, currency, periodType, period: period ?? '' })}`,
    {
      accessToken,
      signal,
      contextScope,
      operationKind: OPERATION_KINDS.READ_ONLY,
    },
  );