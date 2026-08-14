import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { NewMovementSheet } from '../../components/finance';
import {
  AppButton,
  AppCard,
  AppScreen,
  AppText,
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
import { AbortError, ApiError } from '../../services/api';
import { formatFinanceAmount, financeMovementTitle, isZeroDecimalString } from '../../services/finance/financeDisplay';
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
  listFinanceMovements,
  type FinanceMovementDto,
  type FinanceSummaryCurrencyDto,
  type GetFinanceSummaryResponse,
  type ListFinanceMovementsResponse,
} from '../../services/finance/financeMovements';
import {
  financeMonthFromLocalDate,
  formatFinanceDateGroupLabel,
  formatFinancePeriodLabel,
  isCurrentFinanceMonth,
  shiftFinanceMonth,
} from '../../services/finance/financePeriod';

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
    description: 'Los pagos esperados se integran en su etapa propia. Por ahora no hay obligaciones simuladas.',
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

function groupMovementsByTransactionDate(movements: FinanceMovementDto[]) {
  const groups: { date: string; movements: FinanceMovementDto[] }[] = [];
  const indexByDate = new Map<string, number>();

  movements.forEach((movement) => {
    const existingIndex = indexByDate.get(movement.transactionDate);
    if (existingIndex === undefined) {
      indexByDate.set(movement.transactionDate, groups.length);
      groups.push({ date: movement.transactionDate, movements: [movement] });
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
  const { session } = useAuth();
  const { currentHousehold, loading, reloading, householdError } = useHousehold();
  const [selectedContext, setSelectedContext] = useState<FinanceContextType>(FINANCE_CONTEXT_TYPES.PERSONAL);
  const [selectedTab, setSelectedTab] = useState<FinanceTabKey>('resumen');
  const [selectorExpanded, setSelectorExpanded] = useState(false);
  const [newMovementVisible, setNewMovementVisible] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(() => financeMonthFromLocalDate());
  const [selectedSummaryCurrency, setSelectedSummaryCurrency] = useState<string | null>(null);
  const [readRefreshNonce, setReadRefreshNonce] = useState(0);
  const [readState, setReadState] = useState<FinanceReadState>(EMPTY_READ_STATE);
  const allowVisibleBackExit = useRef(false);
  const readKeyRef = useRef<string | null>(null);

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

    const readOptions = {
      accessToken: session.access_token,
      contextType: selectedContext,
      period: selectedPeriod,
      signal: controller.signal,
      contextScope: `finance:${requestKey}`,
    };

    Promise.all([
      listFinanceMovements(readOptions),
      getFinanceSummary(readOptions),
    ])
      .then(([movements, summary]) => {
        if (readKeyRef.current !== requestKey) return;
        setReadState({
          key: requestKey,
          loading: false,
          error: null,
          movements,
          summary,
        });
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
      });

    return () => {
      controller.abort();
    };
  }, [readReady, readScopeKey, readRefreshNonce, selectedContext, selectedPeriod, session?.access_token]);

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

  const handleCreateSuccess = (operation: 'expense' | 'income') => {
    setSuccessFeedback(operation === 'expense' ? 'Gasto registrado' : 'Ingreso registrado');
    setReadRefreshNonce((current) => current + 1);
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
        />
      ) : null}

      {movementsReady ? (
        <FinanceMovementsSurface
          period={selectedPeriod}
          loading={visibleReadState.loading}
          error={visibleReadState.error}
          movements={visibleReadState.movements?.movements ?? []}
          onRetry={retryReads}
          onMovePeriod={movePeriod}
        />
      ) : null}

      {selectedTab === 'pagos' && (viewState === 'personal_ready' || viewState === 'household_ready') ? (
        <AppCard variant="quiet" padding="generous">
          <EmptyState
            title={TAB_EMPTY_COPY.pagos.title}
            description={TAB_EMPTY_COPY.pagos.description}
            illustration={<HomePlusIcon name={TAB_EMPTY_COPY.pagos.icon} size={30} color={colors.terracotta[600]} />}
          />
        </AppCard>
      ) : null}

      <NewMovementSheet
        visible={newMovementVisible}
        accessToken={session?.access_token}
        contextType={selectedContext}
        contextLabel={contextLabel}
        contextState={viewState}
        onRequestClose={() => setNewMovementVisible(false)}
        onSuccess={handleCreateSuccess}
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
              <SummaryMetric label="Gastamos" value={formatFinanceAmount(selectedBucket.expense, selectedBucket.currency)} />
              <SummaryMetric label="Ingresó" value={formatFinanceAmount(selectedBucket.income, selectedBucket.currency)} />
              <SummaryMetric
                label="Neto"
                value={formatFinanceAmount(selectedBucket.net, selectedBucket.currency, { sign: 'net' })}
                tone={isZeroDecimalString(selectedBucket.net) ? 'primary' : selectedBucket.net.startsWith('-') ? 'danger' : 'success'}
              />
            </View>
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
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'danger' | 'success';
}) {
  return (
    <View style={styles.summaryMetric}>
      <AppText variant="caption" tone="secondary" weight="700">
        {label}
      </AppText>
      <AppText variant="title3" tone={tone} weight="800" numberOfLines={1}>
        {value}
      </AppText>
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
}: {
  period: string;
  loading: boolean;
  error: string | null;
  movements: FinanceMovementDto[];
  onRetry: () => void;
  onMovePeriod: (direction: 'previous' | 'next') => void;
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
            description="No hay gastos ni ingresos registrados para este mes."
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
                {group.movements.map((movement) => (
                  <View key={movement.id} style={styles.movementRow}>
                    <View style={styles.movementCopy}>
                      <AppText variant="body" weight="800" numberOfLines={1}>
                        {financeMovementTitle(movement.transactionType, movement.description)}
                      </AppText>
                      {movement.categoryLabelSnapshot ? (
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                          {movement.categoryLabelSnapshot}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText
                      variant="bodySmall"
                      tone={movement.transactionType === 'expense' ? 'danger' : 'success'}
                      weight="800"
                      style={styles.movementAmount}
                      numberOfLines={1}
                    >
                      {formatFinanceAmount(movement.amount, movement.currency, {
                        sign: 'transaction',
                        transactionType: movement.transactionType,
                      })}
                    </AppText>
                  </View>
                ))}
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
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
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
