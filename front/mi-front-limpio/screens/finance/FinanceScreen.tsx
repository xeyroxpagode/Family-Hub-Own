import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import { MovementDetailSheet, NewMovementSheet, TransactionCorrectionSheet, NewPaymentSheet, RegisterPaymentSheet, PaymentDetailSheet, PaymentsList, EditPaymentDueSheet, PayCreditCardSheet, TransferDetailSheet } from '../../components/finance';
import { FinancePoolSummary, FinanceSpendingLimitSummary, FinanceAnalysisHighlights } from '../../components/finance';
import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
  ActionSheet,
  EmptyState,
  ErrorState,
  InteractivePressable,
  Skeleton,
  UndoToast,
} from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
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
  financeSelectorOptions,
  selectFinanceContext,
  selectFinanceTab,
  type FinanceContextType,
  type FinanceTabKey,
} from '../../services/finance/financeContext';
import {
  getFinanceSummary,
  getFinanceTransactionDetail,
  getFinanceTransferDetail,
  listFinanceMovements,
  type FinanceTransactionDetailDto,
  type FinanceTransferDetailDto,
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

type TransactionMovementDto = Extract<FinanceUnifiedMovementDto, { kind: 'EXPENSE' | 'INCOME' }>;

const TAB_EMPTY_COPY: Record<FinanceTabKey, { title: string; description: string; icon: React.ComponentProps<typeof HomePlusIcon>['name'] }> = {
  resumen: {
    title: 'Sin informacion financiera todavia',
    description: 'Este espacio se va a completar cuando existan gastos, ingresos y saldos reales.',
    icon: 'pie-chart-outline',
  },
  movimientos: {
    title: 'Sin movimientos registrados',
    description: 'Cuando registres gastos o ingresos reales, la lectura de esta vista se activa en su etapa propia.',
    icon: 'swap-vertical-outline',
  },
  pagos: {
    title: 'Sin pagos configurados',
    description: 'Agregá pagos esperados para ver vencimientos, registrar pagos y mantener el historial.',
    icon: 'card-outline',
  },
};

const selectorLayoutAnimation = {
  duration: motion.normal,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

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

function safeFinanceReadError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No pudimos cargar Finanzas. Intenta de nuevo.';
}

export function FinanceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MoreStackParamList, 'Finance'>>();
  const entryParams = useMemo(() => parseFinanceEntryParams(route.params), [route.params]);
  const { session, authMe } = useAuth();
  const { currentHousehold, loading, reloading, householdError } = useHousehold();
  const [selectedContext, setSelectedContext] = useState<FinanceContextType>(entryParams.contextType ?? FINANCE_CONTEXT_TYPES.PERSONAL);
  const [selectedTab, setSelectedTab] = useState<FinanceTabKey>(entryParams.initialTab ?? 'resumen');
  const [selectorExpanded, setSelectorExpanded] = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [newMovementVisible, setNewMovementVisible] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => financeMonthFromLocalDate());
const [selectedMovement, setSelectedMovement] = useState<TransactionMovementDto | null>(null);
  const [movementDetailVisible, setMovementDetailVisible] = useState(false);
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
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Payment sheets state
  const [newPaymentVisible, setNewPaymentVisible] = useState(false);
  const [registerPaymentVisible, setRegisterPaymentVisible] = useState(false);
  const [payCreditCardVisible, setPayCreditCardVisible] = useState(false);
  const [paymentDetailVisible, setPaymentDetailVisible] = useState(false);
  const [editPaymentDueVisible, setEditPaymentDueVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDueDto | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(entryParams.paymentDueId ?? null);
  const [paymentDetailRefreshNonce, setPaymentDetailRefreshNonce] = useState(0);

  const allowVisibleBackExit = useRef(false);
  const readKeyRef = useRef<string | null>(null);
  const paymentEntryKeyRef = useRef<string | null>(null);
  const detailPrefetchRef = useRef<TransactionCorrectionDetailPrefetch | null>(null);
  const [detailPrefetchSnapshot, setDetailPrefetchSnapshot] = useState<TransactionCorrectionDetailPrefetch | null>(null);

  const openAccounts = () => {
    setOverflowVisible(false);
    navigation.navigate('FinanceAccounts', {
      contextType: selectedContext,
    });
  };

  const openPapelera = () => {
    setOverflowVisible(false);
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
  const selectorOptions = useMemo(() => financeSelectorOptions(activeHousehold), [activeHousehold]);
  const contextLabel = financeContextLabel(selectedContext, activeHousehold, contextLoading);
  const viewState = financeContextViewState(selectedContext, activeHousehold, contextLoading);
  const readReady = Boolean(session?.access_token) && (
    viewState === 'personal_ready' || viewState === 'household_ready'
  );
  const readScopeKey = `${selectedContext}:${selectedContext === FINANCE_CONTEXT_TYPES.HOUSEHOLD ? activeHousehold?.id ?? 'none' : 'personal'}:${selectedPeriod}`;
  const visibleReadState = readState.key === readScopeKey ? readState : EMPTY_READ_STATE;
  const summaryCurrencies = visibleReadState.summary?.currencies ?? EMPTY_SUMMARY_CURRENCIES;
  const selectedSummaryBucket = summaryCurrencies.find((bucket) => bucket.currency === selectedSummaryCurrency) ?? null;

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

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
    const unsubscribe = navigation.addListener?.('beforeRemove', (event: { preventDefault: () => void }) => {
      if (allowVisibleBackExit.current) {
        allowVisibleBackExit.current = false;
        return;
      }
      if (!selectorExpanded) return;
      event.preventDefault();
      LayoutAnimation.configureNext(selectorLayoutAnimation);
      setSelectorExpanded(false);
    });

    return unsubscribe;
  }, [navigation, selectorExpanded]);

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
    setSpendingLimitProgress([]);
    setSpendingLimitProgressLoading(true);
    setSpendingLimitProgressError(null);
    setAnalysis(null);
    setAnalysisLoading(true);
    setAnalysisError(null);

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
        setAnalysisLoading(false);
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
        setAnalysisError(safeFinanceReadError(error));
        setAnalysisLoading(false);
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

  const animateSelectorLayout = () => {
    LayoutAnimation.configureNext(selectorLayoutAnimation);
  };

  const expandSelector = () => {
    animateSelectorLayout();
    setSelectorExpanded(true);
  };

  const collapseSelector = () => {
    animateSelectorLayout();
    setSelectorExpanded(false);
  };

  const toggleSelector = () => {
    if (selectorExpanded) {
      collapseSelector();
      return;
    }
    expandSelector();
  };

  const handleVisibleBack = () => {
    allowVisibleBackExit.current = true;
    navigation.goBack();
  };

  const chooseContext = (nextContext: FinanceContextType) => {
    animateSelectorLayout();
    setSelectedContext((current) => selectFinanceContext(current, nextContext));
    setSelectorExpanded(false);
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
    setTransferDetailVisible(true);
    setTransferDetailRefreshNonce((current) => current + 1);
  };

  const handleTransferDetailClose = () => {
    setTransferDetailVisible(false);
    setSelectedTransferId(null);
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
    handleMovementDetailClose();
  };

  const handleCorrectionSuccess = () => {
    setSuccessFeedback('Movimiento corregido.');
    setReadRefreshNonce((current) => current + 1);
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
  };

  const handlePaymentRegisterSuccess = () => {
    setSuccessFeedback('Pago registrado');
    setReadRefreshNonce((current) => current + 1);
    setPaymentDetailRefreshNonce((current) => current + 1);
    setSelectedPayment(null);
  };

  const handlePaymentRefresh = () => {
    setReadRefreshNonce((current) => current + 1);
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

  const handleEditPayment = (payment: PaymentDueDto) => {
    setSelectedPayment(payment);
    setEditPaymentDueVisible(true);
  };

  const movementsReady = selectedTab === 'movimientos' &&
    (viewState === 'personal_ready' || viewState === 'household_ready');
  const summaryReady = selectedTab === 'resumen' &&
    (viewState === 'personal_ready' || viewState === 'household_ready');

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
          <Pressable
            onPress={handleVisibleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver a Mas"
            hitSlop={8}
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </Pressable>
        ) : null}
        <View style={styles.headerText}>
          <AppText variant="title1" accessibilityRole="header">
            Finanzas
          </AppText>
        </View>
        <InteractivePressable
          onPress={() => setOverflowVisible(true)}
          haptic="light"
          pressScale={motion.scale.icon}
          style={styles.overflowButton}
          accessibilityRole="button"
          accessibilityLabel="Mas opciones"
          hitSlop={8}
        >
          <HomePlusIcon name="ellipsis-horizontal" size={22} color={colors.text.primary} />
        </InteractivePressable>
      </View>

      <View style={styles.selectorArea}>
        <View style={styles.contextCard}>
          <InteractivePressable
            onPress={toggleSelector}
            disabled={contextLoading}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.contextHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: selectorExpanded }}
            accessibilityLabel={`Finanzas de ${contextLabel}`}
            accessibilityHint="Cambia entre finanzas personales y el hogar activo"
          >
            <View style={styles.contextIcon}>
              <HomePlusIcon
                name={selectedContext === FINANCE_CONTEXT_TYPES.PERSONAL ? 'person-outline' : 'home-outline'}
                size={20}
                color={colors.terracotta[700]}
              />
            </View>
            <View style={styles.contextCopy}>
              <AppText variant="caption" tone="secondary">
                Finanzas de
              </AppText>
              <AppText variant="body" weight="800" numberOfLines={1}>
                {contextLabel}
              </AppText>
            </View>
            <HomePlusIcon
              name={selectorExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={colors.text.tertiary}
            />
          </InteractivePressable>

          {selectorExpanded ? (
            <View style={styles.expandedArea}>
              <View style={styles.contextDivider} />
              <View style={styles.contextOptions}>
                {selectorOptions.map((option) => {
                  const selected = option.contextType === selectedContext && (
                    option.contextType === FINANCE_CONTEXT_TYPES.PERSONAL || activeHousehold !== null
                  );
                  return (
                    <InteractivePressable
                      key={option.contextType}
                      onPress={() => chooseContext(option.contextType)}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={styles.contextOption}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option.label}
                    >
                      <HomePlusIcon
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selected ? colors.terracotta[700] : colors.text.tertiary}
                      />
                      <AppText variant="bodySmall" weight="800" style={styles.contextOptionLabel} numberOfLines={1}>
                        {option.label}
                      </AppText>
                    </InteractivePressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {contextLoading ? (
          <View style={styles.loadingRow}>
            <Skeleton width={120} height={12} />
            <AppText variant="caption" tone="tertiary">
              Actualizando Current
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {FINANCE_TABS.map((tab) => {
          const selected = tab === selectedTab;
          return (
            <InteractivePressable
              key={tab}
              onPress={() => setSelectedTab((current) => selectFinanceTab(current, tab))}
              haptic="light"
              pressScale={motion.scale.tab}
              style={[styles.tab, selected && styles.tabSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={FINANCE_TAB_LABELS[tab]}
            >
              <AppText
                variant="bodySmall"
                weight="800"
                tone={selected ? 'inverse' : 'secondary'}
                numberOfLines={1}
              >
                {FINANCE_TAB_LABELS[tab]}
              </AppText>
            </InteractivePressable>
          );
        })}
      </View>

      {householdError ? (
        <ErrorState title="No pudimos actualizar Current" description={householdError} />
      ) : null}

      {movementsReady ? (
        <View style={styles.movementsHeader}>
          <View style={styles.movementsHeaderCopy}>
            <AppText variant="title3" weight="800">
              Movimientos
            </AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {contextLabel}
            </AppText>
          </View>
          <AppButton
            variant="icon"
            onPress={() => setNewMovementVisible(true)}
            accessibilityLabel="Nuevo movimiento"
            haptic="medium"
          >
            <HomePlusIcon name="add" size={24} color={colors.terracotta[700]} />
          </AppButton>
        </View>
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
        <>
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
          <FinanceAnalysisHighlights
            analysis={analysis}
            currency={selectedSummaryCurrency ?? 'ARS'}
          />
        </>
      ) : null}

      {movementsReady ? (
        <FinanceMovementsSurface
          period={selectedPeriod}
          loading={visibleReadState.loading}
          error={visibleReadState.error}
          movements={visibleReadState.movements?.movements ?? []}
          onRetry={retryReads}
          onMovePeriod={movePeriod}
          onMovementPress={handleMovementPress}
        />
      ) : null}

      {selectedTab === 'pagos' && (viewState === 'personal_ready' || viewState === 'household_ready') ? (
        <PaymentsList
          accessToken={session?.access_token ?? null}
          contextType={selectedContext}
          contextLabel={contextLabel}
          activeHousehold={activeHousehold}
          onCreatePayment={() => setNewPaymentVisible(true)}
          onPaymentPress={handlePaymentPress}
          onRefresh={handlePaymentRefresh}
        />
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
        onRequestClose={handleTransferDetailClose}
      />

      <TransactionCorrectionSheet
        key={`${correctionTransactionId ?? 'none'}:${detailPrefetchSnapshot?.detail ? 'prefetched' : 'fallback'}`}
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
        onRefresh={handlePaymentRefresh}
      />

      <ActionSheet
        visible={overflowVisible}
        title="Finanzas"
        onRequestClose={() => setOverflowVisible(false)}
        size="content"
      >
        <View style={styles.overflowContent}>
          <InteractivePressable
            onPress={openAccounts}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.overflowItem}
            accessibilityRole="button"
            accessibilityLabel="Abrir Cuentas"
          >
            <HomePlusIcon name="wallet" size={22} color={colors.terracotta[600]} />
            <AppText variant="body" weight="800">Cuentas</AppText>
            <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
          </InteractivePressable>
          <InteractivePressable
            onPress={openPapelera}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.overflowItem}
            accessibilityRole="button"
            accessibilityLabel="Abrir Papelera"
          >
            <HomePlusIcon name="trash-outline" size={22} color={colors.danger.strong} />
            <AppText variant="body" weight="800">Papelera</AppText>
            <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
          </InteractivePressable>
          <AppText variant="caption" tone="tertiary" style={styles.overflowHint}>
            Categorías llegarán en su etapa propia.
          </AppText>
        </View>
      </ActionSheet>

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
    <View style={styles.periodControl}>
      <InteractivePressable
        onPress={() => onMovePeriod('previous')}
        haptic="light"
        pressScale={motion.scale.icon}
        style={styles.periodButton}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
      >
        <HomePlusIcon name="chevron-back-outline" size={20} color={colors.text.secondary} />
      </InteractivePressable>
      <AppText variant="bodySmall" weight="800" style={styles.periodLabel} numberOfLines={1}>
        {formatFinancePeriodLabel(period)}
      </AppText>
      <InteractivePressable
        onPress={() => onMovePeriod('next')}
        haptic="light"
        pressScale={motion.scale.icon}
        style={styles.periodButton}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
      >
        <HomePlusIcon name="chevron-forward-outline" size={20} color={colors.text.secondary} />
      </InteractivePressable>
    </View>
  );
}

function FinanceSurfaceLoading() {
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

  const netExpenseComparison = analysis?.comparison?.netExpense;
  const incomeComparison = analysis?.comparison?.income;
  const summaryExpense = analysis?.totals?.netExpense ?? selectedBucket?.expense ?? '0';
  const summaryIncome = analysis?.totals?.income ?? selectedBucket?.income ?? '0';
  const summaryNet = analysis?.totals?.netResult ?? selectedBucket?.net ?? '0';

  return (
    <AppCard variant="quiet" padding="generous">
      <View style={styles.surfaceStack}>
        <FinancePeriodControl period={period} onMovePeriod={onMovePeriod} />
        <View style={styles.surfaceTitleRow}>
          <AppText variant="caption" tone="secondary" weight="800">
            {isCurrentFinanceMonth(period) ? 'ESTE MES' : 'MES SELECCIONADO'}
          </AppText>
          {loading ? <Skeleton width={64} height={12} /> : null}
        </View>

        {currencies.length === 0 || !selectedBucket ? (
          <EmptyState
            title="Sin actividad financiera"
            description="No hay gastos ni ingresos registrados para este periodo."
            illustration={<HomePlusIcon name="pie-chart-outline" size={30} color={colors.terracotta[600]} />}
          />
        ) : (
          <View style={styles.summaryStack}>
            {currencies.length > 1 ? (
              <View style={styles.currencySelector} accessibilityRole="tablist">
                {currencies.map((bucket) => {
                  const selected = bucket.currency === selectedCurrency;
                  return (
                    <InteractivePressable
                      key={bucket.currency}
                      onPress={() => onSelectCurrency(bucket.currency)}
                      haptic="light"
                      pressScale={motion.scale.tab}
                      style={[styles.currencyOption, selected && styles.currencyOptionSelected]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Resumen ${bucket.currency}`}
                    >
                      <AppText variant="caption" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                        {bucket.currency}
                      </AppText>
                    </InteractivePressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.summaryRows}>
              <SummaryMetric
                label="Gastamos"
                value={formatFinanceAmount(summaryExpense, selectedBucket.currency)}
                secondary={netExpenseComparison && netExpenseComparison.comparisonKind !== 'NONE'
                  ? netExpenseComparison.comparisonKind === 'NEW'
                    ? 'Nuevo este mes'
                    : netExpenseComparison.comparisonKind === 'PERCENT'
                    ? `${netExpenseComparison.percentChange ? (Number(netExpenseComparison.percentChange) > 0 ? '+' : '') + Number(netExpenseComparison.percentChange).toFixed(0) + '%' : ''} vs mes anterior`
                    : 'Sin cambios vs mes anterior'
                  : undefined}
                secondaryTone={netExpenseComparison && netExpenseComparison.comparisonKind === 'PERCENT' && Number(netExpenseComparison.percentChange ?? 0) > 0 ? 'danger' : 'secondary'}
              />
              <SummaryMetric
                label="Ingresó"
                value={formatFinanceAmount(summaryIncome, selectedBucket.currency)}
                secondary={incomeComparison && incomeComparison.comparisonKind !== 'NONE'
                  ? incomeComparison.comparisonKind === 'NEW'
                    ? 'Nuevo este mes'
                    : incomeComparison.comparisonKind === 'PERCENT'
                    ? `${incomeComparison.percentChange ? (Number(incomeComparison.percentChange) > 0 ? '+' : '') + Number(incomeComparison.percentChange).toFixed(0) + '%' : ''} vs mes anterior`
                    : 'Sin cambios vs mes anterior'
                  : undefined}
                secondaryTone={incomeComparison && incomeComparison.comparisonKind === 'PERCENT' && Number(incomeComparison.percentChange ?? 0) > 0 ? 'success' : 'secondary'}
              />
              <SummaryMetric
                label="Neto"
                value={formatFinanceAmount(summaryNet, selectedBucket.currency, { sign: 'net' })}
                tone={isZeroDecimalString(summaryNet) ? 'primary' : summaryNet.startsWith('-') ? 'danger' : 'success'}
              />
            </View>
            {selectedBucket && analysis && (
              <InteractivePressable
                onPress={() => navigation.navigate('FinanceAnalysisDetail', {
                  contextType,
                  currency: selectedBucket.currency,
                  periodType: 'MONTHLY',
                  period,
                })}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.analysisEntryButton}
                accessibilityRole="button"
                accessibilityLabel="Ver análisis detallado"
              >
                <HomePlusIcon name="analytics-outline" size={18} color={colors.terracotta[600]} />
                <AppText variant="bodySmall" weight="800" tone="brand">
                  Ver análisis
                </AppText>
                <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
              </InteractivePressable>
            )}
          </View>
        )}
      </View>
    </AppCard>
  );
}

function SummaryMetric({
  label,
  value,
  tone = 'primary',
  secondary,
  secondaryTone = 'secondary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'danger' | 'success';
  secondary?: string;
  secondaryTone?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
}) {
  return (
    <View style={styles.summaryMetric}>
      <AppText variant="caption" tone="secondary" weight="700">
        {label}
      </AppText>
      <AppText variant="title3" tone={tone} weight="800" numberOfLines={1}>
        {value}
      </AppText>
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
  onRetry,
  onMovePeriod,
  onMovementPress,
}: {
  period: string;
  loading: boolean;
  error: string | null;
  movements: FinanceUnifiedMovementDto[];
  onRetry: () => void;
  onMovePeriod: (direction: 'previous' | 'next') => void;
  onMovementPress?: (movement: FinanceUnifiedMovementDto) => void;
}) {
  if (loading && movements.length === 0) return <FinanceSurfaceLoading />;
  if (error && movements.length === 0) {
    return (
      <ErrorState
        title="No pudimos cargar movimientos"
        description={error}
        onRetry={onRetry}
      />
    );
  }

  const groups = groupMovementsByTransactionDate(movements);

  return (
    <View style={styles.surfaceStack}>
      <FinancePeriodControl period={period} onMovePeriod={onMovePeriod} />
      {loading ? <Skeleton width="38%" height={12} /> : null}
      {groups.length === 0 ? (
        <AppCard variant="quiet" padding="generous">
          <EmptyState
            title="Sin movimientos en este periodo"
            description="No hay gastos, ingresos ni transferencias registrados para este mes."
            illustration={<HomePlusIcon name="swap-vertical-outline" size={30} color={colors.terracotta[600]} />}
          />
        </AppCard>
      ) : (
        <View style={styles.movementGroups}>
          {groups.map((group) => (
            <View key={group.date} style={styles.movementGroup}>
              <AppText variant="caption" tone="secondary" weight="800">
                {formatFinanceDateGroupLabel(group.date)}
              </AppText>
              <AppCard variant="quiet" padding="default" style={styles.movementListCard}>
                {group.movements.map((movement) => {
                  if (movement.kind === 'EXPENSE') {
                    const hasRefund = !isZeroDecimalString(movement.totalRefunded);
                    return (
                      <InteractivePressable
                        key={`${movement.kind}:${movement.id}`}
                        onPress={() => onMovementPress?.(movement)}
                        haptic="light"
                        pressScale={motion.scale.card}
                        style={styles.movementRow}
                        accessibilityRole="button"
                        accessibilityLabel={financeMovementTitle('expense', movement.description)}
                      >
                        <View style={[styles.movementIcon, styles.movementExpenseIcon]}>
                          <HomePlusIcon name="arrow-down-outline" size={18} color={colors.danger.base} />
                        </View>
                        <View style={styles.movementCopy}>
                          <AppText variant="body" weight="800" numberOfLines={1}>
                            {financeMovementTitle('expense', movement.description)}
                          </AppText>
                          {movement.categoryLabel ? (
                            <AppText variant="caption" tone="secondary" numberOfLines={1}>
                              {movement.categoryLabel}
                            </AppText>
                          ) : null}
                          {hasRefund ? (
                            <AppText variant="caption" tone="success" weight="800" numberOfLines={1}>
                              Devuelto {formatFinanceAmount(movement.totalRefunded, movement.currency, { sign: 'none' })} · Neto {formatFinanceAmount(movement.netAmount, movement.currency, { sign: 'none' })}
                            </AppText>
                          ) : null}
                        </View>
                        <AppText
                          variant="bodySmall"
                          tone="danger"
                          weight="800"
                          style={styles.movementAmount}
                          numberOfLines={1}
                        >
                          {formatFinanceAmount(movement.amount, movement.currency, {
                            sign: 'transaction',
                            transactionType: 'expense',
                          })}
                        </AppText>
                      </InteractivePressable>
                    );
                  }
                  if (movement.kind === 'INCOME') {
                    return (
                      <InteractivePressable
                        key={`${movement.kind}:${movement.id}`}
                        onPress={() => onMovementPress?.(movement)}
                        haptic="light"
                        pressScale={motion.scale.card}
                        style={styles.movementRow}
                        accessibilityRole="button"
                        accessibilityLabel={financeMovementTitle('income', movement.description)}
                      >
                        <View style={[styles.movementIcon, styles.movementIncomeIcon]}>
                          <HomePlusIcon name="arrow-up-outline" size={18} color={colors.success.base} />
                        </View>
                        <View style={styles.movementCopy}>
                          <AppText variant="body" weight="800" numberOfLines={1}>
                            {financeMovementTitle('income', movement.description)}
                          </AppText>
                          {movement.categoryLabel ? (
                            <AppText variant="caption" tone="secondary" numberOfLines={1}>
                              {movement.categoryLabel}
                            </AppText>
                          ) : null}
                        </View>
                        <AppText
                          variant="bodySmall"
                          tone="success"
                          weight="800"
                          style={styles.movementAmount}
                          numberOfLines={1}
                        >
                          {formatFinanceAmount(movement.amount, movement.currency, {
                            sign: 'transaction',
                            transactionType: 'income',
                          })}
                        </AppText>
                      </InteractivePressable>
                    );
                  }
if (movement.kind === 'TRANSFER') {
                    const title = financeTransferTitle(movement);
                    const isCrossCurrency = movement.sourceCurrency !== movement.destinationCurrency;
                    const amountLabel = isCrossCurrency
                      ? `${formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' })} → ${formatFinanceAmount(movement.destinationAmount, movement.destinationCurrency, { sign: 'none' })}`
                      : formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' });
                    return (
                      <InteractivePressable
                        key={`${movement.kind}:${movement.id}`}
                        onPress={() => onMovementPress?.(movement)}
                        haptic="light"
                        pressScale={motion.scale.card}
                        style={styles.movementRow}
                        accessibilityRole="button"
                        accessibilityLabel={`${title}, ${movement.sourceAccount.name} a ${movement.destinationAccount.name}`}
                      >
                        <View style={[styles.movementIcon, styles.movementTransferIcon]}>
                          <HomePlusIcon name="swap-horizontal-outline" size={18} color={colors.info.base} />
                        </View>
                        <View style={styles.movementCopy}>
                          <AppText variant="body" weight="800" numberOfLines={1}>
                            {title}
                          </AppText>
                          <AppText variant="caption" tone="secondary" numberOfLines={1}>
                            {movement.sourceAccount.name} → {movement.destinationAccount.name}
                          </AppText>
                          {movement.description?.trim() ? (
                            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                              {movement.description.trim()}
                            </AppText>
                          ) : null}
                        </View>
                        <AppText
                          variant="bodySmall"
                          tone="primary"
                          weight="800"
                          style={styles.movementAmount}
                          numberOfLines={2}
                        >
                          {amountLabel}
                        </AppText>
                      </InteractivePressable>
                    );
                  }
                  return null;
                })}
              </AppCard>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  backButton: {
    width: touchTargets.normal,
    height: touchTargets.normal,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  overflowButton: {
    width: touchTargets.normal,
    height: touchTargets.normal,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  overflowContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  overflowItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  overflowHint: {
    marginTop: spacing[1],
    marginHorizontal: spacing[1],
  },
  headerText: {
    flex: 1,
    gap: spacing[1],
  },
  selectorArea: {
    gap: spacing[2],
  },
  contextCard: {
    minHeight: 64,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
  },
  contextHeader: {
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
  },
  expandedArea: {
    overflow: 'hidden',
  },
  contextDivider: {
    height: 1,
    marginHorizontal: spacing[4],
    backgroundColor: colors.border.subtle,
  },
  contextOptions: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  contextOption: {
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextOptionLabel: {
    flex: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  movementsHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  movementsHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  tabs: {
    minHeight: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.muted,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  tabSelected: {
    backgroundColor: colors.terracotta[600],
  },
  loadingBlock: {
    gap: spacing[3],
  },
  periodControl: {
    minHeight: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
  },
  periodButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabel: {
    flex: 1,
    textAlign: 'center',
    minWidth: 0,
  },
  surfaceStack: {
    gap: spacing[4],
  },
  surfaceTitleRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  summaryStack: {
    gap: spacing[3],
  },
  currencySelector: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.muted,
    flexDirection: 'row',
    padding: spacing[1],
    gap: spacing[1],
  },
  currencyOption: {
    minHeight: 28,
    minWidth: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  currencyOptionSelected: {
    backgroundColor: colors.terracotta[600],
  },
  summaryRows: {
    gap: spacing[2],
  },
  summaryMetric: {
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  analysisEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  movementGroups: {
    gap: spacing[4],
  },
  movementGroup: {
    gap: spacing[2],
  },
  movementListCard: {
    gap: 0,
  },
  movementRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  movementIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  movementExpenseIcon: {
    backgroundColor: colors.danger.soft,
  },
  movementIncomeIcon: {
    backgroundColor: colors.success.soft,
  },
  movementTransferIcon: {
    backgroundColor: colors.info.soft,
  },
  movementCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  movementAmount: {
    maxWidth: '42%',
    textAlign: 'right',
  },
});
