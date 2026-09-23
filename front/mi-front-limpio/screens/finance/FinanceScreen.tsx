import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  EditPaymentDueSheet,
  DirectCreditCardPaymentSheet,
  FinancePoolSummary,
  FinanceSpendingLimitSummary,
  MovementDetailSheet,
  NewMovementSheet,
  NewPaymentSheet,
  PaymentDetailSheet,
  PaymentsList,
  PayCreditCardSheet,
  RegisterPaymentSheet,
  TransactionCorrectionSheet,
  TransferDetailSheet,
} from '../../components/finance';
import {
  AppCard,
  AppScreen,
  AppText,
  EmptyState,
  ErrorState,
  Skeleton,
  UndoToast,
} from '../../components/ui';
import {
  FinancePeriodNavigator,
  FinanceIconAction,
  FinanceIconBox,
  FinanceListRow,
  FinanceSection,
  FinanceSegmented,
  FinanceSegmentedMulti,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceUtilityRow,
  financeSpacing,
  type FinanceSegmentedOption,
} from '../../components/finance/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/AppThemeContext';
import { useHousehold } from '../../context/HouseholdContext';
import { parseFinanceEntryParams } from '../../navigation/financeNavigation';
import type { MoreStackParamList } from '../../navigation/types';
import { AbortError, ApiError } from '../../services/api';
import { formatFinanceAmount, financeMovementTitle, financeTransferTitle, isZeroDecimalString } from '../../services/finance/financeDisplay';
import {
  FINANCE_CONTEXT_TYPES,
  FINANCE_TAB_LABELS,
  FINANCE_TABS,
  financeContextLabel,
  financeContextViewState,
  selectFinanceContext,
  selectFinanceTab,
  type FinanceContextType,
  type FinanceTabKey,
} from '../../services/finance/financeContext';
import {
  getFinanceSummary,
  getFinanceTransactionDetail,
  listFinanceMovements,
  type FinanceExpenseMovementDto,
  type FinanceTransactionDetailDto,
  type FinanceUnifiedMovementDto,
  type FinanceSummaryCurrencyDto,
  type GetFinanceSummaryResponse,
  type ListFinanceMovementsResponse,
} from '../../services/finance/financeMovements';
import type { TransactionCorrectionDetailPrefetch } from '../../services/finance/transactionCorrectionDetailLoad';
import {
  financeMonthFromLocalDate,
  formatFinanceDateGroupLabel,
  formatFinancePeriodLabel,
  isCurrentFinanceMonth,
  shiftFinanceMonth,
} from '../../services/finance/financePeriod';
import type { PaymentDueDto } from '../../services/finance/financePayments';
import type { FinanceAccountDto } from '../../services/finance/financeAccounts';
import {
  getFinancePoolSummary,
  type FinancePoolSummaryResponse,
} from '../../services/finance/financePools';
import {
  getFinanceSpendingLimitProgress,
  type FinanceSpendingLimitProgressDto,
} from '../../services/finance/financeSpendingLimits';
import {
  getFinanceAnalysis,
  type FinanceAnalysisResponse,
} from '../../services/finance/financeAnalysis';
import {
  getFinanceCategoryPresentationByLabel,
  type FinanceCategoryPresentation,
} from '../../services/finance/financeCategories';

type TransactionMovementDto = Extract<FinanceUnifiedMovementDto, { kind: 'EXPENSE' | 'INCOME' }>;
type FinanceReadState = {
  key: string | null;
  loading: boolean;
  error: string | null;
  movements: ListFinanceMovementsResponse | null;
  summary: GetFinanceSummaryResponse | null;
};

const EMPTY_READ_STATE: FinanceReadState = {
  key: null,
  loading: false,
  error: null,
  movements: null,
  summary: null,
};
const EMPTY_SUMMARY_CURRENCIES: FinanceSummaryCurrencyDto[] = [];

// Stage 7B.1 — Finance root authority: single segmented families for tabs + scope.
const FINANCE_TAB_OPTIONS: FinanceSegmentedOption<FinanceTabKey>[] = FINANCE_TABS.map((tab) => ({
  value: tab,
  label: FINANCE_TAB_LABELS[tab],
}));

const FINANCE_SCOPE_OPTIONS: FinanceSegmentedOption<FinanceContextType>[] = [
  { value: FINANCE_CONTEXT_TYPES.PERSONAL, label: 'Personal' },
  { value: FINANCE_CONTEXT_TYPES.HOUSEHOLD, label: 'Hogar' },
];

function groupMovementsByTransactionDate(movements: FinanceUnifiedMovementDto[]) {
  const groups: { date: string; movements: FinanceUnifiedMovementDto[] }[] = [];
  const indexByDate = new Map<string, number>();

  movements.forEach((movement) => {
    const existingIndex = indexByDate.get(movement.date);
    if (existingIndex === undefined) {
      indexByDate.set(movement.date, groups.length);
      groups.push({ date: movement.date, movements: [movement] });
      return;
    }
    groups[existingIndex].movements.push(movement);
  });

  return groups;
}

type MovementTypeFilterKey = 'expense' | 'income' | 'transfer';
type MovementFilterKey = MovementTypeFilterKey;

const MOVEMENT_FILTER_OPTIONS: FinanceSegmentedOption<MovementTypeFilterKey>[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'transfer', label: 'Transferencias' },
];

const ALL_MOVEMENT_TYPE_FILTERS: MovementTypeFilterKey[] = ['expense', 'income', 'transfer'];

function normalizeMovementFilters(filters: MovementTypeFilterKey[]): MovementTypeFilterKey[] {
  const unique = ALL_MOVEMENT_TYPE_FILTERS.filter((type) => filters.includes(type));
  return unique.length === 0 ? ALL_MOVEMENT_TYPE_FILTERS : unique;
}

function toggleMovementFilter(
  currentFilters: MovementTypeFilterKey[],
  nextFilter: MovementFilterKey,
): MovementTypeFilterKey[] {
  const current = normalizeMovementFilters(currentFilters);
  if (current.includes(nextFilter) && current.length === 1) return current;
  const next = current.includes(nextFilter)
    ? current.filter((type) => type !== nextFilter)
    : [...current, nextFilter];
  return normalizeMovementFilters(next);
}

function movementMatchesFilter(movement: FinanceUnifiedMovementDto, filters: MovementTypeFilterKey[]): boolean {
  const normalized = normalizeMovementFilters(filters);
  // Root-unit semantics (backend is primary authority): a dependent Transfer
  // commission never matches root Gastos/Ingresos filters on its own. It is
  // disclosed through its root Transfer only.
  if (movement.kind === 'EXPENSE' || movement.kind === 'INCOME') {
    if (movement.transferId) return false;
    if (normalized.length === ALL_MOVEMENT_TYPE_FILTERS.length) return true;
    if (movement.kind === 'EXPENSE') return normalized.includes('expense');
    return normalized.includes('income');
  }
  if (normalized.length === ALL_MOVEMENT_TYPE_FILTERS.length) return true;
  return normalized.includes('transfer');
}

function financeCategoryToneColor(colors: ReturnType<typeof useAppTheme>['colors'], presentation: FinanceCategoryPresentation) {
  if (presentation.tone === 'terracotta') return colors.terracotta[600];
  if (presentation.tone === 'sage') return colors.sage[600];
  if (presentation.tone === 'sand') return colors.sand[600];
  if (presentation.tone === 'info') return colors.info.text;
  return colors.text.tertiary;
}

function safeFinanceReadError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No pudimos cargar Finanzas. Intenta de nuevo.';
}

export function FinanceScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MoreStackParamList, 'Finance'>>();
  const entryParams = useMemo(() => parseFinanceEntryParams(route.params), [route.params]);
  const { session, authMe } = useAuth();
  const { currentHousehold, loading, reloading, householdError } = useHousehold();
  const [selectedContext, setSelectedContext] = useState<FinanceContextType>(entryParams.contextType ?? FINANCE_CONTEXT_TYPES.PERSONAL);
  const [selectedTab, setSelectedTab] = useState<FinanceTabKey>(entryParams.initialTab ?? 'resumen');
  const [newMovementVisible, setNewMovementVisible] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => financeMonthFromLocalDate());
const [selectedMovement, setSelectedMovement] = useState<TransactionMovementDto | null>(null);
  const [movementDetailVisible, setMovementDetailVisible] = useState(false);
  const [movementFilters, setMovementFilters] = useState<MovementTypeFilterKey[]>(ALL_MOVEMENT_TYPE_FILTERS);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [transferDetailVisible, setTransferDetailVisible] = useState(false);
  const [transferDetailRefreshNonce, setTransferDetailRefreshNonce] = useState(0);
  const [correctionTransactionId, setCorrectionTransactionId] = useState<string | null>(null);
  const [correctionVisible, setCorrectionVisible] = useState(false);
  const [selectedSummaryCurrency, setSelectedSummaryCurrency] = useState<string | null>(null);
  const [readRefreshNonce, setReadRefreshNonce] = useState(0);
  const [readState, setReadState] = useState<FinanceReadState>(EMPTY_READ_STATE);

  // Stage 6D: Dashboard read states
  const [poolSummary, setPoolSummary] = useState<FinancePoolSummaryResponse | null>(null);
  const [poolSummaryLoading, setPoolSummaryLoading] = useState(false);
  const [poolSummaryError, setPoolSummaryError] = useState<string | null>(null);

  const [spendingLimitProgress, setSpendingLimitProgress] = useState<FinanceSpendingLimitProgressDto[] | null>(null);
  const [spendingLimitProgressLoading, setSpendingLimitProgressLoading] = useState(false);
  const [spendingLimitProgressError, setSpendingLimitProgressError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<FinanceAnalysisResponse | null>(null);

  // Payment sheets state
  const [newPaymentVisible, setNewPaymentVisible] = useState(false);
  const [registerPaymentVisible, setRegisterPaymentVisible] = useState(false);
  const [payCreditCardVisible, setPayCreditCardVisible] = useState(false);
  const [paymentDetailVisible, setPaymentDetailVisible] = useState(false);
  const [editPaymentDueVisible, setEditPaymentDueVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDueDto | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(entryParams.paymentDueId ?? null);
  const [selectedDirectCard, setSelectedDirectCard] = useState<FinanceAccountDto | null>(null);
  const [directCardPaymentVisible, setDirectCardPaymentVisible] = useState(false);
  const [paymentDetailRefreshNonce, setPaymentDetailRefreshNonce] = useState(0);
  const [paymentsRefreshNonce, setPaymentsRefreshNonce] = useState(0);

  const allowVisibleBackExit = useRef(false);
  const readKeyRef = useRef<string | null>(null);
  const paymentEntryKeyRef = useRef<string | null>(null);
  const detailPrefetchRef = useRef<TransactionCorrectionDetailPrefetch | null>(null);
  const [detailPrefetchSnapshot, setDetailPrefetchSnapshot] = useState<TransactionCorrectionDetailPrefetch | null>(null);

  const openPapelera = () => {
    navigation.navigate('FinancePapelera', {
      contextType: selectedContext,
    });
  };

  const contextLoading = loading || reloading;
  const activeHousehold = useMemo(() => {
    if (!currentHousehold) return null;
    return {
      id: currentHousehold.id,
      name: currentHousehold.nombre,
    };
  }, [currentHousehold]);
  const contextLabel = financeContextLabel(selectedContext, activeHousehold, contextLoading);
  const viewState = financeContextViewState(selectedContext, activeHousehold, contextLoading);
  const readReady = Boolean(session?.access_token) && (
    viewState === 'personal_ready' || viewState === 'household_ready'
  );
  const readScopeKey = `${selectedContext}:${selectedContext === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? activeHousehold?.id ?? 'none' : 'personal'}:${selectedPeriod}`;
  const visibleReadState = readState.key === readScopeKey ? readState : EMPTY_READ_STATE;
  const summaryCurrencies = visibleReadState.summary?.currencies ?? EMPTY_SUMMARY_CURRENCIES;
  const selectedSummaryBucket = summaryCurrencies.find((bucket) => bucket.currency === selectedSummaryCurrency) ?? null;

  // A payment movement restored from Papelera re-settles its obligation
  // (PENDING -> PAID), but PaymentsList stays mounted while Papelera is open.
  // Refetch Pagos whenever this screen regains focus (skips the first focus:
  // the list already loads on mount).
  const paymentsFocusPrimedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!paymentsFocusPrimedRef.current) {
        paymentsFocusPrimedRef.current = true;
        return;
      }
      setPaymentsRefreshNonce((current) => current + 1);
    }, []),
  );

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    const entryContextType = entryParams.contextType;
    const entryInitialTab = entryParams.initialTab;
    const entryPaymentDueId = entryParams.paymentDueId;

    if (entryContextType) {
      setSelectedContext((current) => selectFinanceContext(current, entryContextType));
    }
    if (entryInitialTab) {
      setSelectedTab((current) => selectFinanceTab(current, entryInitialTab));
    }
    if (!entryPaymentDueId) return;

    const key = `${entryContextType ?? 'default'}:${entryPaymentDueId}`;
    if (paymentEntryKeyRef.current === key) return;
    paymentEntryKeyRef.current = key;
    setSelectedTab('pagos');
    setSelectedPayment(null);
    setSelectedPaymentId(entryPaymentDueId);
    setPaymentDetailVisible(true);
  }, [entryParams]);

  useEffect(() => {
    if (!readReady || !session?.access_token) {
      readKeyRef.current = null;
      setReadState(EMPTY_READ_STATE);
      return;
    }

    const requestKey = readScopeKey;
    const controller = new AbortController();
    readKeyRef.current = requestKey;
    setReadState((current) => ({
      key: requestKey,
      loading: true,
      error: null,
      movements: current.key === requestKey ? current.movements : null,
      summary: current.key === requestKey ? current.summary : null,
    }));

    // Stage 6D: Also trigger dashboard reads
    setPoolSummary(null);
    setPoolSummaryLoading(true);
    setPoolSummaryError(null);
    setSpendingLimitProgress(null);
    setSpendingLimitProgressLoading(true);
    setSpendingLimitProgressError(null);
    setAnalysis(null);

    const readOptions = {
      accessToken: session.access_token,
      contextType: selectedContext,
      period: selectedPeriod,
      signal: controller.signal,
      contextScope: `finance:${requestKey}`,
    };

    const currency = selectedSummaryCurrency ?? summaryCurrencies[0]?.currency ?? 'ARS';

    Promise.all([
      listFinanceMovements(readOptions),
      getFinanceSummary(readOptions),
      getFinancePoolSummary({ ...readOptions, currency }),
      getFinanceSpendingLimitProgress({ ...readOptions, currency, periodType: 'MONTHLY', period: selectedPeriod }),
      getFinanceAnalysis({ ...readOptions, currency, periodType: 'MONTHLY', period: selectedPeriod }),
    ])
      .then(([movements, summary, poolSummaryData, spendingLimitData, analysisData]) => {
        if (readKeyRef.current !== requestKey) return;
        setReadState({
          key: requestKey,
          loading: false,
          error: null,
          movements,
          summary,
        });
        setPoolSummary(poolSummaryData);
        setPoolSummaryLoading(false);
        setSpendingLimitProgress(spendingLimitData.limits);
        setSpendingLimitProgressLoading(false);
        setAnalysis(analysisData);
      })
      .catch((error) => {
        if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) return;
        if (readKeyRef.current !== requestKey) return;
        setReadState((current) => ({
          key: requestKey,
          loading: false,
          error: safeFinanceReadError(error),
          movements: current.key === requestKey ? current.movements : null,
          summary: current.key === requestKey ? current.summary : null,
        }));
        setPoolSummaryError(safeFinanceReadError(error));
        setPoolSummaryLoading(false);
        setSpendingLimitProgressError(safeFinanceReadError(error));
        setSpendingLimitProgressLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [readReady, readScopeKey, readRefreshNonce, selectedContext, selectedPeriod, selectedSummaryCurrency, session?.access_token]);

  useEffect(() => {
    const currencies = summaryCurrencies.map((bucket) => bucket.currency);
    setSelectedSummaryCurrency((current) => {
      if (currencies.length === 0) return null;
      if (current && currencies.includes(current)) return current;
      return currencies[0];
    });
  }, [summaryCurrencies]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleVisibleBack = () => {
    allowVisibleBackExit.current = true;
    navigation.goBack();
  };

  const chooseContext = (nextContext: FinanceContextType) => {
    setSelectedContext((current) => {
      if (current === nextContext) return current;
      return selectFinanceContext(current, nextContext);
    });
  };

  const movePeriod = (direction: 'previous' | 'next') => {
    setSelectedPeriod((current) => shiftFinanceMonth(current, direction));
  };

  const retryReads = () => {
    setReadRefreshNonce((current) => current + 1);
  };

  const clearDetailPrefetch = () => {
    detailPrefetchRef.current = null;
    setDetailPrefetchSnapshot(null);
  };

  const prefetchMovementDetail = (movement: FinanceUnifiedMovementDto) => {
    if (!session?.access_token) return;
    if (movement.kind === 'TRANSFER') return;

    const existing = detailPrefetchRef.current;
    if (
      existing?.transactionId === movement.id &&
      existing.contextType === selectedContext &&
      (existing.detail || existing.promise)
    ) {
      setDetailPrefetchSnapshot(existing);
      return;
    }

    const prefetch: TransactionCorrectionDetailPrefetch = {
      transactionId: movement.id,
      contextType: selectedContext,
      detail: null,
      promise: null,
      failed: false,
    };

    prefetch.promise = getFinanceTransactionDetail({
      accessToken: session.access_token,
      contextType: selectedContext,
      transactionId: movement.id,
      contextScope: `finance-transaction-detail-prefetch:${selectedContext}:${movement.id}`,
    })
      .then((detail: FinanceTransactionDetailDto) => {
        if (detailPrefetchRef.current === prefetch) {
          prefetch.detail = detail;
          prefetch.promise = null;
          setDetailPrefetchSnapshot({ ...prefetch });
        }
        return detail;
      })
      .catch((error) => {
        if (detailPrefetchRef.current === prefetch) {
          prefetch.failed = true;
          prefetch.promise = null;
          setDetailPrefetchSnapshot({ ...prefetch });
        }
        throw error;
      });
    void prefetch.promise.catch(() => undefined);

    detailPrefetchRef.current = prefetch;
    setDetailPrefetchSnapshot(prefetch);
  };

  const handleCreateSuccess = (operation: 'expense' | 'income' | 'transfer') => {
    setSuccessFeedback(
      operation === 'expense'
        ? 'Gasto registrado'
        : operation === 'income'
        ? 'Ingreso registrado'
        : 'Transferencia registrada',
    );
    setReadRefreshNonce((current) => current + 1);
    if (operation === 'transfer') {
      setTransferDetailRefreshNonce((current) => current + 1);
    }
  };

  const handleMovementPress = (movement: FinanceUnifiedMovementDto) => {
    if (movement.kind === 'TRANSFER') {
      handleTransferPress(movement);
      return;
    }
    setSelectedMovement(movement);
    setMovementDetailVisible(true);
    prefetchMovementDetail(movement);
  };

  const handleMovementDetailClose = () => {
    setMovementDetailVisible(false);
    setSelectedMovement(null);
    if (!correctionVisible) clearDetailPrefetch();
  };

  const handleTransferPress = (movement: FinanceUnifiedMovementDto) => {
    if (movement.kind !== 'TRANSFER') return;
    setSelectedTransferId(movement.id);
    setTransferDetailRefreshNonce((current) => current + 1);
    setTransferDetailVisible(true);
  };

  const handleTransferDetailClose = () => {
    setTransferDetailVisible(false);
    setSelectedTransferId(null);
  };

  const handleTransferTrashSuccess = () => {
    setSuccessFeedback('Transferencia enviada a Papelera.');
    setReadRefreshNonce((current) => current + 1);
    handleTransferDetailClose();
  };

  const handleCorrectionIntent = (transactionId: string) => {
    setCorrectionTransactionId(transactionId);
    setCorrectionVisible(true);
  };

  const handleCorrectionClose = () => {
    setCorrectionVisible(false);
    setCorrectionTransactionId(null);
    clearDetailPrefetch();
  };

  const handleTrashSuccess = () => {
    setSuccessFeedback('Movimiento enviado a Papelera.');
    setReadRefreshNonce((current) => current + 1);
    // A trashed movement can reopen its payment obligation (PAID -> PENDING),
    // so Pagos must refetch: the list stays mounted while other tabs are open.
    setPaymentsRefreshNonce((current) => current + 1);
    handleMovementDetailClose();
  };

  const handleCorrectionSuccess = () => {
    setSuccessFeedback('Movimiento corregido.');
    setReadRefreshNonce((current) => current + 1);
    setTransferDetailRefreshNonce((current) => current + 1);
    clearDetailPrefetch();
    handleCorrectionClose();
    handleMovementDetailClose();
  };

  const handleRefundSuccess = () => {
    setSuccessFeedback('Devolución guardada.');
    setReadRefreshNonce((current) => current + 1);
  };

  const handlePoolAssignmentSuccess = () => {
    setSuccessFeedback('Pozo actualizado.');
    setReadRefreshNonce((current) => current + 1);
  };

  const handlePaymentCreateSuccess = () => {
    setSuccessFeedback('Pago creado');
    setReadRefreshNonce((current) => current + 1);
    setPaymentsRefreshNonce((current) => current + 1);
  };

  const handlePaymentRegisterSuccess = () => {
    setSuccessFeedback('Pago registrado');
    setReadRefreshNonce((current) => current + 1);
    setPaymentsRefreshNonce((current) => current + 1);
    setPaymentDetailRefreshNonce((current) => current + 1);
    setSelectedPayment(null);
    setSelectedDirectCard(null);
  };

  const handlePaymentRefresh = () => {
    setReadRefreshNonce((current) => current + 1);
    setPaymentsRefreshNonce((current) => current + 1);
  };

  const handlePaymentPress = (payment: PaymentDueDto) => {
    setSelectedPayment(payment);
    setSelectedPaymentId(payment.id);
    setPaymentDetailVisible(true);
  };

  const handlePaymentDetailClose = () => {
    setPaymentDetailVisible(false);
    setSelectedPayment(null);
    setSelectedPaymentId(null);
  };

  const handleRegisterPayment = (payment: PaymentDueDto) => {
    setSelectedPayment(payment);
    setRegisterPaymentVisible(true);
  };

  const handleRegisterCreditCardPayment = (payment: PaymentDueDto) => {
    setSelectedPayment(payment);
    setPayCreditCardVisible(true);
  };

  const handleDirectCardPayment = (card: FinanceAccountDto) => {
    setSelectedDirectCard(card);
    setDirectCardPaymentVisible(true);
  };

  const handleEditPayment = (payment: PaymentDueDto) => {
    setSelectedPayment(payment);
    setEditPaymentDueVisible(true);
  };

  const buildPaymentExpenseMovement = (payment: PaymentDueDto): FinanceExpenseMovementDto | null => {
    const rootId = payment.expenseRootTransactionId;
    if (!rootId || !payment.actualAmount) return null;
    const transactionDate = payment.actualDate ?? payment.dueDate;
    return {
      kind: 'EXPENSE',
      id: rootId,
      rootTransactionId: rootId,
      transferId: null,
      transactionType: 'expense',
      amount: payment.actualAmount,
      grossAmount: payment.actualAmount,
      totalRefunded: '0',
      netAmount: payment.actualAmount,
      refundCount: 0,
      refundEvents: [],
      currency: payment.currency,
      financialContextType: payment.financialContextType,
      transactionDate,
      description: null,
      categoryId: payment.actualCategoryId ?? null,
      categoryLabelSnapshot: payment.actualCategory?.label ?? null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      date: transactionDate,
      categoryLabel: payment.actualCategory?.label ?? null,
      accountId: payment.actualAccountId ?? null,
      accountName: payment.actualAccount?.name ?? null,
      accountCurrency: payment.actualAccount?.currency ?? null,
    };
  };

  const handlePaymentOpenMovement = (payment: PaymentDueDto) => {
    if (payment.kind === 'CREDIT_CARD') {
      if (!payment.transferId) return;
      setSelectedTransferId(payment.transferId);
      setTransferDetailRefreshNonce((current) => current + 1);
      setTransferDetailVisible(true);
      handlePaymentDetailClose();
      return;
    }
    const movement = buildPaymentExpenseMovement(payment);
    if (!movement) return;
    setSelectedMovement(movement);
    setMovementDetailVisible(true);
    handlePaymentDetailClose();
  };

  const movementsReady = selectedTab === 'movimientos' &&
    (viewState === 'personal_ready' || viewState === 'household_ready');
  const summaryReady = selectedTab === 'resumen' &&
    (viewState === 'personal_ready' || viewState === 'household_ready');
  const paymentsReady = viewState === 'personal_ready' || viewState === 'household_ready';

  return (
    <AppScreen
      scroll
      bottomInset="tab"
      background="base"
      safeAreaEdges={['right', 'bottom', 'left']}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <FinanceIconAction
            onPress={handleVisibleBack}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Volver a Mas"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </FinanceIconAction>
        ) : null}
        <View style={styles.headerText}>
          <AppText variant="title1" accessibilityRole="header" numberOfLines={1}>
            Finanzas
          </AppText>
        </View>
        <View style={styles.scopeWrap}>
          <FinanceSegmented
            variant="compact"
            distribution="content"
            value={selectedContext}
            onChange={(next) => chooseContext(next)}
            options={FINANCE_SCOPE_OPTIONS.map((option) => ({
              ...option,
              disabled: contextLoading && option.value !== selectedContext,
            }))}
            testID="finance-scope-segmented"
          />
        </View>
      </View>

      {contextLoading ? (
        <View style={styles.loadingRow}>
          <Skeleton width={120} height={12} />
          <AppText variant="caption" tone="tertiary">
            Actualizando Current
          </AppText>
        </View>
      ) : null}

      <FinanceSegmented
        variant="standard"
        distribution="equal"
        value={selectedTab}
        onChange={(next) => setSelectedTab((current) => selectFinanceTab(current, next))}
        options={FINANCE_TAB_OPTIONS}
        testID="finance-tab-segmented"
      />

      {householdError ? (
        <ErrorState title="No pudimos actualizar Current" description={householdError} />
      ) : null}

      {viewState === 'loading' ? (
        <AppCard variant="quiet" padding="generous">
          <View style={styles.loadingBlock}>
            <Skeleton width="70%" height={18} />
            <Skeleton width="92%" height={14} />
            <Skeleton width="54%" height={14} />
          </View>
        </AppCard>
      ) : null}

      {viewState === 'household_unavailable' ? (
        <AppCard variant="warning" padding="generous">
          <EmptyState
            title="Contexto de hogar no disponible"
            description="Personal sigue disponible. Finanzas no elige ni cambia el hogar global."
            illustration={<HomePlusIcon name="shield-checkmark-outline" size={30} color={colors.warning.strong} />}
          />
        </AppCard>
      ) : null}

      {summaryReady ? (
        <View style={styles.resumenStack}>
          <FinanceSummarySurface
            period={selectedPeriod}
            loading={visibleReadState.loading}
            error={visibleReadState.error}
            currencies={summaryCurrencies}
            selectedCurrency={selectedSummaryCurrency}
            selectedBucket={selectedSummaryBucket}
            onSelectCurrency={setSelectedSummaryCurrency}
            onRetry={retryReads}
            onMovePeriod={movePeriod}
            analysis={analysis}
            navigation={navigation}
            contextType={selectedContext}
          />
          <FinancePoolSummary
            summary={poolSummary}
            loading={poolSummaryLoading}
            error={poolSummaryError}
            onRetry={retryReads}
            onOrganize={() => navigation.navigate('FinancePoolManagement', {
              contextType: selectedContext,
              currency: selectedSummaryCurrency ?? 'ARS',
            })}
          />
          <FinanceSpendingLimitSummary
            progress={spendingLimitProgress}
            loading={spendingLimitProgressLoading}
            error={spendingLimitProgressError}
            onRetry={retryReads}
            onManage={() => navigation.navigate('FinanceSpendingLimitsManagement', {
              contextType: selectedContext,
              currency: selectedSummaryCurrency ?? 'ARS',
              period: selectedPeriod,
            })}
          />
        </View>
      ) : null}

      {movementsReady ? (
<FinanceMovementsSurface
          period={selectedPeriod}
          loading={visibleReadState.loading}
          error={visibleReadState.error}
          movements={visibleReadState.movements?.movements ?? []}
          filters={movementFilters}
          onFilterChange={(filter) => setMovementFilters((current) => toggleMovementFilter(current, filter))}
          onRetry={retryReads}
          onMovePeriod={movePeriod}
          onMovementPress={handleMovementPress}
          onOpenTrash={openPapelera}
          onCreateMovement={() => setNewMovementVisible(true)}
        />
      ) : null}

      {paymentsReady ? (
        <View style={selectedTab === 'pagos' ? undefined : styles.hiddenTabSurface}>
          <PaymentsList
            accessToken={session?.access_token ?? null}
            contextType={selectedContext}
            contextLabel={contextLabel}
            activeHousehold={activeHousehold}
            onCreatePayment={() => setNewPaymentVisible(true)}
            onOpenTrash={openPapelera}
            onPaymentPress={handlePaymentPress}
            onCreditCardDuePress={handlePaymentPress}
            onDirectCardPayment={handleDirectCardPayment}
            onRefresh={handlePaymentRefresh}
            refreshNonce={paymentsRefreshNonce}
          />
        </View>
      ) : null}

      <NewMovementSheet
        visible={newMovementVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        contextState={viewState}
        activeHousehold={activeHousehold}
        personId={authMe?.person?.id ?? null}
        householdId={selectedContext === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? activeHousehold?.id ?? null : null}
        onRequestClose={() => setNewMovementVisible(false)}
        onSuccess={handleCreateSuccess}
      />

<MovementDetailSheet
        visible={movementDetailVisible}
        movement={selectedMovement}
        contextType={selectedContext}
        contextLabel={contextLabel}
        accessToken={session?.access_token ?? null}
        personId={authMe?.person?.id ?? null}
        householdId={selectedContext === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? activeHousehold?.id ?? null : null}
        activeHousehold={activeHousehold}
        onRequestClose={handleMovementDetailClose}
        onTrashSuccess={handleTrashSuccess}
        onCorrectionIntent={handleCorrectionIntent}
        onRefundSuccess={handleRefundSuccess}
        onPoolAssignmentSuccess={handlePoolAssignmentSuccess}
      />

      <TransferDetailSheet
        visible={transferDetailVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        transferId={selectedTransferId}
        refreshNonce={transferDetailRefreshNonce}
        personId={authMe?.person?.id ?? null}
        householdId={selectedContext === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? activeHousehold?.id ?? null : null}
        onRequestClose={handleTransferDetailClose}
        onTrashSuccess={handleTransferTrashSuccess}
      />

      <TransactionCorrectionSheet
        key={correctionTransactionId ?? 'none'}
        visible={correctionVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        personId={authMe?.person?.id ?? null}
        householdId={selectedContext === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? activeHousehold?.id ?? null : null}
        transactionId={correctionTransactionId ?? ''}
        prefetchedDetail={detailPrefetchSnapshot}
        onRequestClose={handleCorrectionClose}
        onSuccess={handleCorrectionSuccess}
      />

      <NewPaymentSheet
        visible={newPaymentVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        contextState={viewState}
        activeHousehold={activeHousehold}
        onRequestClose={() => setNewPaymentVisible(false)}
        onSuccess={handlePaymentCreateSuccess}
      />

      <RegisterPaymentSheet
        visible={registerPaymentVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        contextState={viewState}
        activeHousehold={activeHousehold}
        payment={selectedPayment}
        onRequestClose={() => setRegisterPaymentVisible(false)}
        onSuccess={handlePaymentRegisterSuccess}
      />

      <PayCreditCardSheet
        visible={payCreditCardVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        contextState={viewState}
        activeHousehold={activeHousehold}
        payment={selectedPayment}
        onRequestClose={() => setPayCreditCardVisible(false)}
        onSuccess={handlePaymentRegisterSuccess}
      />

      <DirectCreditCardPaymentSheet
        visible={directCardPaymentVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        contextState={viewState}
        activeHousehold={activeHousehold}
        card={selectedDirectCard}
        onRequestClose={() => { setDirectCardPaymentVisible(false); setSelectedDirectCard(null); }}
        onSuccess={handlePaymentRegisterSuccess}
      />

      <EditPaymentDueSheet
        visible={editPaymentDueVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        payment={selectedPayment}
        onRequestClose={() => setEditPaymentDueVisible(false)}
        onSuccess={handlePaymentRefresh}
      />

      <PaymentDetailSheet
        visible={paymentDetailVisible}
        accessToken={session?.access_token ?? null}
        contextType={selectedContext}
        contextLabel={contextLabel}
        paymentId={selectedPaymentId}
        refreshNonce={paymentDetailRefreshNonce}
        onRequestClose={handlePaymentDetailClose}
        onRegisterPayment={handleRegisterPayment}
        onRegisterCreditCardPayment={handleRegisterCreditCardPayment}
        onEditPayment={handleEditPayment}
        onOpenMovement={handlePaymentOpenMovement}
        onRefresh={handlePaymentRefresh}
      />

      <UndoToast
        visible={Boolean(successFeedback)}
        message={successFeedback ?? ''}
        duration={2000}
        onDismiss={() => setSuccessFeedback(null)}
      />
    </AppScreen>
  );
}

function FinancePeriodControl({
  period,
  onMovePeriod,
}: {
  period: string;
  onMovePeriod: (direction: 'previous' | 'next') => void;
}) {
  return (
    <FinancePeriodNavigator
      label={formatFinancePeriodLabel(period)}
      onPrevious={() => onMovePeriod('previous')}
      onNext={() => onMovePeriod('next')}
      previousAccessibilityLabel="Mes anterior"
      nextAccessibilityLabel="Mes siguiente"
    />
  );
}

function FinanceSurfaceLoading() {
  const styles = createStyles(useAppTheme());

  return (
    <AppCard variant="quiet" padding="generous">
      <View style={styles.loadingBlock}>
        <Skeleton width="42%" height={16} />
        <Skeleton width="76%" height={18} />
        <Skeleton width="58%" height={14} />
      </View>
    </AppCard>
  );
}

function FinanceSummarySurface({
  period,
  loading,
  error,
  currencies,
  selectedCurrency,
  selectedBucket,
  onSelectCurrency,
  onRetry,
  onMovePeriod,
  analysis,
  navigation,
  contextType,
}: {
  period: string;
  loading: boolean;
  error: string | null;
  currencies: FinanceSummaryCurrencyDto[];
  selectedCurrency: string | null;
  selectedBucket: FinanceSummaryCurrencyDto | null;
  onSelectCurrency: (currency: string) => void;
  onRetry: () => void;
  onMovePeriod: (direction: 'previous' | 'next') => void;
  analysis: FinanceAnalysisResponse | null;
  navigation: any;
  contextType: import('../../services/finance/financeContext').FinanceContextType;
}) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);

  if (loading && currencies.length === 0) return <FinanceSurfaceLoading />;
  if (error && currencies.length === 0) {
    return (
      <ErrorState
        title="No pudimos cargar el resumen"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  const summaryExpense = analysis?.totals?.netExpense ?? selectedBucket?.expense ?? '0';
  const summaryIncome = analysis?.totals?.income ?? selectedBucket?.income ?? '0';
  const summaryNet = analysis?.totals?.netResult ?? selectedBucket?.net ?? '0';
  const sectionTitle = isCurrentFinanceMonth(period) ? 'Este mes' : 'Mes seleccionado';
  const canOpenAnalysis = Boolean(selectedBucket && analysis);
  const openAnalysis = () => {
    if (!selectedBucket) return;
    navigation.navigate('FinanceAnalysisDetail', {
      contextType,
      currency: selectedBucket.currency,
      periodType: 'MONTHLY',
      period,
    });
  };

  // Stage 7B.1 — Resumen section grammar: utility row + flat section + action.
  return (
    <View style={styles.summarySurface}>
      <FinancePeriodControl period={period} onMovePeriod={onMovePeriod} />
      <FinanceSection
        title={sectionTitle}
        actionLabel={canOpenAnalysis ? 'Ver análisis' : undefined}
        onAction={canOpenAnalysis ? openAnalysis : undefined}
        actionAccessibilityLabel="Ver análisis detallado"
      >
        {currencies.length === 0 || !selectedBucket ? (
          <EmptyState
            title="Sin actividad financiera"
            description="No hay gastos ni ingresos registrados para este periodo."
            illustration={<HomePlusIcon name="pie-chart-outline" size={30} color={colors.terracotta[600]} />}
            style={styles.flatEmptyState}
          />
        ) : (
          <View style={styles.summaryStack}>
            {currencies.length > 1 ? (
              <FinanceSegmented
                variant="compact"
                value={selectedCurrency ?? currencies[0]?.currency ?? 'ARS'}
                onChange={onSelectCurrency}
                options={currencies.map((bucket) => ({
                  value: bucket.currency,
                  label: bucket.currency,
                  accessibilityLabel: `Resumen ${bucket.currency}`,
                }))}
                testID="finance-summary-currency"
              />
            ) : null}

            <View style={styles.summaryRows}>
              <SummaryMetric
                label="Ingresó"
                value={formatFinanceAmount(summaryIncome, selectedBucket.currency)}
                tone={isZeroDecimalString(summaryIncome) ? 'primary' : 'success'}
              />
              <SummaryMetric
                label="Gastamos"
                value={formatFinanceAmount(summaryExpense, selectedBucket.currency)}
                tone={isZeroDecimalString(summaryExpense) ? 'primary' : 'danger'}
              />
              <SummaryMetric
                label="Balance"
                value={formatFinanceAmount(summaryNet, selectedBucket.currency, { sign: 'net' })}
                tone={isZeroDecimalString(summaryNet) ? 'primary' : summaryNet.startsWith('-') ? 'danger' : 'success'}
                showDivider={false}
              />
            </View>
          </View>
        )}
      </FinanceSection>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone = 'primary',
  secondary,
  secondaryTone = 'secondary',
  showDivider = true,
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'danger' | 'success';
  secondary?: string;
  secondaryTone?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  showDivider?: boolean;
}) {
  const styles = createStyles(useAppTheme());

  // Stage 7B.1 — shared Resumen value-row rhythm on 7A row authority
  // (52 min-height, hairline divider, right-aligned tabular value).
  return (
    <View>
      <View style={[styles.summaryMetric, showDivider && styles.summaryMetricDivider]}>
        <AppText variant="bodySmall" tone="secondary" weight="600" numberOfLines={1} ellipsizeMode="tail">
          {label}
        </AppText>
        <AppText
          variant="title3"
          tone={tone}
          weight="800"
          style={styles.summaryMetricValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
        >
          {value}
        </AppText>
      </View>
      {secondary && (
        <AppText variant="caption" tone={secondaryTone} weight={secondaryTone !== 'secondary' ? '700' : '400'}>
          {secondary}
        </AppText>
      )}
    </View>
  );
}

function FinanceMovementsSurface({
  period,
  loading,
  error,
  movements,
  filters,
  onFilterChange,
  onRetry,
  onMovePeriod,
  onMovementPress,
  onOpenTrash,
  onCreateMovement,
}: {
  period: string;
  loading: boolean;
  error: string | null;
  movements: FinanceUnifiedMovementDto[];
  filters: MovementTypeFilterKey[];
  onFilterChange: (filter: MovementFilterKey) => void;
  onRetry: () => void;
  onMovePeriod: (direction: 'previous' | 'next') => void;
  onMovementPress?: (movement: FinanceUnifiedMovementDto) => void;
  onOpenTrash: () => void;
  onCreateMovement: () => void;
}) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const normalizedFilters = normalizeMovementFilters(filters);
  const allSelected = normalizedFilters.length === ALL_MOVEMENT_TYPE_FILTERS.length;
  const emptyDescription = allSelected
    ? 'Sin movimientos este mes'
    : 'No hay movimientos que coincidan con estos filtros';

  if (loading && movements.length === 0) return <FinanceSurfaceLoading />;
  if (error && movements.length === 0) {
    return (
      <FinanceErrorState
        level="full"
        message={error}
        onRetry={onRetry}
      />
    );
  }

const groups = groupMovementsByTransactionDate(
    movements.filter((movement) => movementMatchesFilter(movement, normalizedFilters)),
  );

  return (
    <View style={styles.surfaceStack}>
      <FinanceUtilityRow
        left={
          <FinanceIconAction
            onPress={onOpenTrash}
            accessibilityLabel="Abrir Papelera"
          >
            <HomePlusIcon name="trash-outline" size={20} color={colors.text.secondary} />
          </FinanceIconAction>
        }
        center={
          <FinancePeriodNavigator
            label={formatFinancePeriodLabel(period)}
            onPrevious={() => onMovePeriod('previous')}
            onNext={() => onMovePeriod('next')}
            previousAccessibilityLabel="Mes anterior"
            nextAccessibilityLabel="Mes siguiente"
            style={styles.movementPeriodNavigator}
          />
        }
        right={
          <FinanceIconAction
            onPress={onCreateMovement}
            accessibilityLabel="Nuevo movimiento"
          >
            <HomePlusIcon name="add" size={22} color={colors.text.secondary} />
          </FinanceIconAction>
        }
      />
      <FinanceSegmentedMulti
        variant="filter"
        distribution="equal"
        values={normalizedFilters}
        onToggle={onFilterChange}
        options={MOVEMENT_FILTER_OPTIONS}
        testID="finance-movement-filter"
      />
      {loading ? <Skeleton width="38%" height={12} /> : null}
      {groups.length === 0 ? (
        <FinanceEmptyState
          level="section"
          title={emptyDescription}
          description={allSelected ? 'Cuando registres gastos, ingresos o transferencias van a aparecer acá.' : 'Probá ajustar los tipos seleccionados.'}
          icon={<HomePlusIcon name="swap-horizontal-outline" size={20} color={colors.text.tertiary} />}
        />
      ) : (
        <View style={styles.movementGroups}>
          {groups.map((group) => (
            <View key={group.date} style={styles.movementGroup}>
              <AppText variant="caption" tone="secondary" weight="800">
                {formatFinanceDateGroupLabel(group.date)}
              </AppText>
              <View style={styles.movementRows}>
                {group.movements.map((movement, index) => (
                  <MovementRow
                    key={`${movement.kind}:${movement.id}`}
                    movement={movement}
                    isLast={index === group.movements.length - 1}
                    onMovementPress={onMovementPress}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function MovementRow({
  movement,
  isLast,
  onMovementPress,
}: {
  movement: FinanceUnifiedMovementDto;
  isLast: boolean;
  onMovementPress?: (movement: FinanceUnifiedMovementDto) => void;
}) {
  const theme = useAppTheme();
  const { colors } = theme;

  if (movement.kind === 'EXPENSE') {
    const hasRefund = !isZeroDecimalString(movement.totalRefunded);
    const presentation = getFinanceCategoryPresentationByLabel(movement.categoryLabel);
    const refundLine = hasRefund
      ? `Devuelto ${formatFinanceAmount(movement.totalRefunded, movement.currency, { sign: 'none' })} · Neto ${formatFinanceAmount(movement.netAmount, movement.currency, { sign: 'none' })}`
      : null;
    const subtitle = movement.categoryLabel
      ? (refundLine ? `${movement.categoryLabel} · ${refundLine}` : movement.categoryLabel)
      : refundLine;
    return (
      <FinanceListRow
        title={financeMovementTitle('expense', movement.description)}
        subtitle={subtitle ?? undefined}
        icon={
          <FinanceIconBox>
            <HomePlusIcon
              name={presentation.iconKey}
              size={18}
              color={financeCategoryToneColor(colors, presentation)}
            />
          </FinanceIconBox>
        }
        value={formatFinanceAmount(movement.amount, movement.currency, {
          sign: 'transaction',
          transactionType: 'expense',
        })}
        valueTone="danger"
        divider={!isLast}
        onPress={onMovementPress ? () => onMovementPress(movement) : undefined}
        accessibilityLabel={financeMovementTitle('expense', movement.description)}
      />
    );
  }

  if (movement.kind === 'INCOME') {
    const presentation = getFinanceCategoryPresentationByLabel(movement.categoryLabel);
    return (
      <FinanceListRow
        title={financeMovementTitle('income', movement.description)}
        subtitle={movement.categoryLabel ?? undefined}
        icon={
          <FinanceIconBox>
            <HomePlusIcon
              name={presentation.iconKey}
              size={18}
              color={financeCategoryToneColor(colors, presentation)}
            />
          </FinanceIconBox>
        }
        value={formatFinanceAmount(movement.amount, movement.currency, {
          sign: 'transaction',
          transactionType: 'income',
        })}
        valueTone="success"
        divider={!isLast}
        onPress={onMovementPress ? () => onMovementPress(movement) : undefined}
        accessibilityLabel={financeMovementTitle('income', movement.description)}
      />
    );
  }

  if (movement.kind === 'TRANSFER') {
    const title = financeTransferTitle(movement);
    const isCrossCurrency = movement.sourceCurrency !== movement.destinationCurrency;
    const amountLabel = isCrossCurrency
      ? `${formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' })} → ${formatFinanceAmount(movement.destinationAmount, movement.destinationCurrency, { sign: 'none' })}`
      : formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' });
    const routeLabel = `${movement.sourceAccount.name} → ${movement.destinationAccount.name}`;
    // ONE root row: the commission is concise supporting copy inside the same
    // row grammar, never a second card/row.
    const commissionLabel = movement.commission?.amount
      ? `Comisión ${formatFinanceAmount(movement.commission.amount, movement.commission.currency ?? movement.sourceCurrency, { sign: 'none' })}`
      : null;
    const subtitleParts = [routeLabel];
    if (movement.description?.trim()) subtitleParts.push(movement.description.trim());
    if (commissionLabel) subtitleParts.push(commissionLabel);
    const subtitle = subtitleParts.join(' · ');
    return (
      <FinanceListRow
        title={title}
        subtitle={subtitle}
        icon={
          <FinanceIconBox>
            <HomePlusIcon name="swap-horizontal-outline" size={18} color={colors.text.tertiary} />
          </FinanceIconBox>
        }
        value={amountLabel}
        valueTone="primary"
        divider={!isLast}
        onPress={onMovementPress ? () => onMovementPress(movement) : undefined}
        accessibilityLabel={`${title}, ${movement.sourceAccount.name} a ${movement.destinationAccount.name}`}
      />
    );
  }

  return null;
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;

  return StyleSheet.create({
    content: {
      gap: spacing[4],
    },
    hiddenTabSurface: {
      display: 'none',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    headerText: {
      flex: 1,
      minWidth: 64,
      gap: spacing[1],
    },
    scopeWrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[2],
    },
    resumenStack: {
      gap: financeSpacing.sectionGap,
    },
    loadingBlock: {
      gap: spacing[3],
    },
    surfaceStack: {
      gap: spacing[8],
    },
    summarySurface: {
      gap: financeSpacing.titleContentGap,
    },
    movementPeriodNavigator: {
      flex: 1,
    },
    summaryStack: {
      gap: spacing[3],
    },
    summaryRows: {
      gap: 0,
    },
    summaryMetric: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
    summaryMetricDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
    },
    summaryMetricValue: {
      flexShrink: 1,
      maxWidth: '68%',
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
movementGroups: {
      gap: spacing[4],
    },
    movementGroup: {
      gap: spacing[2],
    },
    movementRows: {
      gap: 0,
    },
    flatEmptyState: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[5],
    },
  });
}
