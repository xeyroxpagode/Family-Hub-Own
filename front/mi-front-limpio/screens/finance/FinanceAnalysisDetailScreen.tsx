import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import {
  AppScreen,
  AppText,
  Skeleton,
  ErrorState,
} from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { AbortError, ApiError } from '../../services/api';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import {
  FINANCE_CONTEXT_TYPES,
} from '../../services/finance/financeContext';
import {
  getFinanceAnalysis,
  type FinanceAnalysisChangeDto,
  type FinanceAnalysisResponse,
} from '../../services/finance/financeAnalysis';
import { shiftFinanceMonth, formatFinancePeriodLabel } from '../../services/finance/financePeriod';
import {
  FinanceSegmented,
  FinanceIconAction,
  FinancePeriodNavigator,
  FinanceListRow,
  FinanceIconBox,
  FinanceSection,
  FinanceEmptyState,
  financeSpacing,
} from '../../components/finance/ui';

type AnalysisTab = 'expenses' | 'income' | 'evolution';

type FinanceAnalysisDetailScreenRouteProp = RouteProp<import('../../navigation/types').MoreStackParamList, 'FinanceAnalysisDetail'>;

function safeFinanceReadError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No pudimos cargar el análisis. Intenta de nuevo.';
}

function AnalysisCategoryRow({
  iconKey,
  iconColor,
  label,
  amountText,
  percentText,
  percentValue,
  barColor,
  divider,
}: {
  iconKey: string;
  iconColor: string;
  label: string;
  amountText: string;
  percentText: string;
  percentValue: number;
  barColor: string;
  divider: boolean;
}) {
  const theme = useAppTheme();
  const { colors, radius } = theme;
  const barWidth = Math.min(Math.max(percentValue, 0), 100);
  return (
    <FinanceListRow
      title={label}
      subtitle={percentText}
      icon={
        <FinanceIconBox>
          <HomePlusIcon name={iconKey as any} size={20} color={iconColor} />
        </FinanceIconBox>
      }
      divider={divider}
      value={
        <View style={{ alignItems: 'flex-end', flexShrink: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="bodySmall" weight="700" numberOfLines={1} ellipsizeMode="tail" style={{ textAlign: 'right' }}>
            {amountText}
          </AppText>
          <View
            style={{
              width: 72,
              height: 4,
              borderRadius: radius.sm,
              backgroundColor: colors.border.default,
              overflow: 'hidden',
            }}
          >
            <View style={{ width: `${barWidth}%`, height: '100%', borderRadius: radius.sm, backgroundColor: barColor }} />
          </View>
        </View>
      }
    />
  );
}

/** Sign-aware backend percent formatting. Never divides; trusts percentChange DTO. */
function formatSignedPercent(percentChange: string | null): string {
  if (percentChange == null) return '';
  const num = Number(percentChange);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(0)}%`;
}

function comparisonDeltaCopy(
  change: FinanceAnalysisChangeDto,
  currency: string,
  previousMonthLower: string,
): string {
  if (isZeroDecimalString(change.delta)) return 'Sin cambios';
  if (change.percentChange != null && !isZeroDecimalString(change.previous)) {
    const num = Number(change.percentChange);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}% vs mes anterior`;
  }
  return `${formatFinanceAmount(change.delta, currency, { sign: 'none' })} más que ${previousMonthLower}`;
}

function PeriodComparisonBlock({
  title,
  change,
  currency,
  period,
  previousPeriod,
  barColor,
  increaseTone,
  decreaseTone,
}: {
  title: string;
  change: FinanceAnalysisChangeDto;
  currency: string;
  period: string;
  previousPeriod: string;
  barColor: string;
  increaseTone: 'success' | 'danger';
  decreaseTone: 'success' | 'danger';
}) {
  const theme = useAppTheme();
  const { colors, radius } = theme;
  const styles = comparisonStyles(theme);

  const currentLabel = formatFinancePeriodLabel(period);
  const previousLabel = previousPeriod ? formatFinancePeriodLabel(previousPeriod) : 'Período anterior';
  const previousMonthLower = previousPeriod
    ? formatFinancePeriodLabel(previousPeriod).split(' ')[0]?.toLowerCase() || 'mes anterior'
    : 'mes anterior';

  const currentValue = Number(change.current);
  const previousValue = Number(change.previous);
  const maxValue = Math.max(currentValue, previousValue, 0);
  const currentWidth = maxValue > 0 ? (Math.max(currentValue, 0) / maxValue) * 100 : 0;
  const previousWidth = maxValue > 0 ? (Math.max(previousValue, 0) / maxValue) * 100 : 0;

  const deltaCopy = comparisonDeltaCopy(change, currency, previousMonthLower);
  const deltaTone = isZeroDecimalString(change.delta)
    ? 'secondary'
    : Number(change.delta) >= 0
      ? increaseTone
      : decreaseTone;

  return (
    <View style={styles.block}>
      <AppText variant="bodySmall" tone="secondary" weight="700">
        {title}
      </AppText>
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <AppText variant="caption" tone="secondary" weight="700" numberOfLines={1} style={styles.monthLabel}>
            {previousLabel}
          </AppText>
          <AppText variant="bodySmall" weight="700" numberOfLines={1} ellipsizeMode="tail" style={styles.rowAmount}>
            {formatFinanceAmount(change.previous, currency, { sign: 'none' })}
          </AppText>
        </View>
        <View style={[styles.track, { borderRadius: radius.sm, backgroundColor: colors.border.default }]}>
          <View style={{ width: `${previousWidth}%`, height: '100%', borderRadius: radius.sm, backgroundColor: barColor, opacity: 0.55 }} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <AppText variant="caption" tone="secondary" weight="700" numberOfLines={1} style={styles.monthLabel}>
            {currentLabel}
          </AppText>
          <AppText variant="bodySmall" weight="700" numberOfLines={1} ellipsizeMode="tail" style={styles.rowAmount}>
            {formatFinanceAmount(change.current, currency, { sign: 'none' })}
          </AppText>
        </View>
        <View style={[styles.track, { borderRadius: radius.sm, backgroundColor: colors.border.default }]}>
          <View style={{ width: `${currentWidth}%`, height: '100%', borderRadius: radius.sm, backgroundColor: barColor }} />
        </View>
      </View>
      <AppText variant="caption" tone={deltaTone} weight="700">
        {deltaCopy}
      </AppText>
    </View>
  );
}

function comparisonStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    block: {
      gap: financeSpacing.contentActionGap,
    },
    row: {
      gap: 4,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: theme.spacing[3],
    },
    monthLabel: {
      flex: 1,
    },
    rowAmount: {
      flexShrink: 1,
      textAlign: 'right',
    },
    track: {
      height: 6,
      overflow: 'hidden',
    },
  });
}

function getCategoryPresentation(label: string, colors: ReturnType<typeof useAppTheme>['colors']) {
  const slug = label
    .trim()
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const LABEL_PRESENTATION: Record<string, { iconKey: string; tone: string }> = {
    alimentacion: { iconKey: 'restaurant-outline', tone: 'terracotta' },
    vivienda: { iconKey: 'home-outline', tone: 'sand' },
    servicios_y_facturas: { iconKey: 'receipt-outline', tone: 'info' },
    transporte: { iconKey: 'car-outline', tone: 'info' },
    salud: { iconKey: 'medkit-outline', tone: 'sage' },
    educacion: { iconKey: 'school-outline', tone: 'sand' },
    compras: { iconKey: 'bag-outline', tone: 'terracotta' },
    ocio: { iconKey: 'ticket-outline', tone: 'terracotta' },
    suscripciones: { iconKey: 'repeat-outline', tone: 'info' },
    mascotas: { iconKey: 'paw-outline', tone: 'sand' },
    impuestos_y_tasas: { iconKey: 'document-text-outline', tone: 'sand' },
    comisiones_e_intereses: { iconKey: 'card-outline', tone: 'info' },
    sueldo: { iconKey: 'briefcase-outline', tone: 'sage' },
    trabajo_independiente: { iconKey: 'hammer-outline', tone: 'sage' },
    ventas: { iconKey: 'storefront-outline', tone: 'sage' },
    rendimientos: { iconKey: 'trending-up-outline', tone: 'sage' },
    sin_categoria: { iconKey: 'help-circle-outline', tone: 'neutral' },
    sin_categoría: { iconKey: 'help-circle-outline', tone: 'neutral' },
  };

  const matched = LABEL_PRESENTATION[slug];
  const iconKey = matched?.iconKey ?? 'pricetag-outline';
  const tone = matched?.tone ?? 'neutral';

  const getToneColor = (t: string) => {
    switch (t) {
      case 'terracotta': return colors.terracotta[600];
      case 'sage': return colors.sage[600];
      case 'sand': return colors.sand[600];
      case 'info': return colors.info.text;
      default: return colors.text.tertiary;
    }
  };

  return { iconKey, iconColor: getToneColor(tone) };
}

export function FinanceAnalysisDetailScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<FinanceAnalysisDetailScreenRouteProp>();
  const { session } = useAuth();
  const { currentHousehold, loading: householdLoading } = useHousehold();

  const params = route.params;
  const contextType = params.contextType;
  const currency = params.currency;
  const periodType = params.periodType;
  const period = params.period;

  const [analysis, setAnalysis] = useState<FinanceAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<AnalysisTab>('expenses');

  const activeHousehold = currentHousehold ? { id: currentHousehold.id, name: currentHousehold.nombre } : null;
  const contextLabel = contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? 'Personal' : activeHousehold?.name ?? 'Hogar';
  const periodLabel = periodType === 'MONTHLY' ? formatFinancePeriodLabel(period) : period;

  const readReady = Boolean(session?.access_token) && !householdLoading && (
    (contextType === FINANCE_CONTEXT_TYPES.PERSONAL) || (contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD && activeHousehold)
  );

  const fetchAnalysis = useCallback(async (signal?: AbortSignal, isRefresh = false) => {
    if (!readReady || !session?.access_token) return;
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await getFinanceAnalysis({
        accessToken: session.access_token,
        contextType,
        currency,
        periodType,
        period,
        signal,
        contextScope: `finance-analysis-detail:${contextType}:${currency}:${periodType}:${period}`,
      });
      if (!signal?.aborted) {
        setAnalysis(data);
      }
    } catch (err) {
      if (err instanceof AbortError || (err instanceof Error && err.name === 'AbortError')) return;
      setError(safeFinanceReadError(err));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [readReady, session?.access_token, contextType, currency, periodType, period]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAnalysis(controller.signal);
    return () => controller.abort();
  }, [fetchAnalysis]);

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      fetchAnalysis(controller.signal, true);
      return () => controller.abort();
    }, [fetchAnalysis])
  );

  const handleRefresh = () => {
    fetchAnalysis(undefined, true);
  };

  const movePeriod = (direction: 'previous' | 'next') => {
    if (periodType === 'MONTHLY') {
      const newPeriod = shiftFinanceMonth(period, direction);
      navigation.navigate('FinanceAnalysisDetail', {
        contextType,
        currency,
        periodType,
        period: newPeriod,
      });
    } else {
      const year = Number(period);
      if (Number.isInteger(year)) {
        const newPeriod = String(year + (direction === 'previous' ? -1 : 1));
        navigation.navigate('FinanceAnalysisDetail', {
          contextType,
          currency,
          periodType,
          period: newPeriod,
        });
      }
    }
  };

  const { totals, categoryExpenses, categoryIncome, comparison, rankings } = analysis ?? {
    totals: { netExpense: '0', income: '0', netResult: '0', grossExpense: '0', refundedAmount: '0', totalRefunded: '0' },
    categoryExpenses: [],
    categoryIncome: [],
    comparison: { previousPeriod: '', netExpense: { current: '0', previous: '0', delta: '0', percentChange: null, comparisonKind: 'NONE' }, income: { current: '0', previous: '0', delta: '0', percentChange: null, comparisonKind: 'NONE' }, netResult: { current: '0', previous: '0', delta: '0', percentChange: null, comparisonKind: 'NONE' } },
    rankings: { topExpenseCategories: [], largestCategoryIncrease: null, largestCategoryDecrease: null, newExpenseCategories: [] },
  };

  const netExpense = totals.netExpense;
  const income = totals.income;

  const filteredExpenses = useMemo(() =>
    categoryExpenses
      .filter((cat) => !isZeroDecimalString(cat.netExpense) && Number(cat.netExpense) > 0)
      .sort((a, b) => Number(b.netExpense) - Number(a.netExpense)),
    [categoryExpenses]
  );

  const filteredIncome = useMemo(() =>
    categoryIncome
      .filter((cat) => !isZeroDecimalString(cat.income) && Number(cat.income) > 0)
      .sort((a, b) => Number(b.income) - Number(a.income)),
    [categoryIncome]
  );

  const expenseRows = useMemo(() => {
    const total = Number(netExpense);
    return filteredExpenses.map((cat, index) => {
      const amount = Number(cat.netExpense);
      const percentValue = total > 0 ? (amount / total) * 100 : 0;
      const presentation = getCategoryPresentation(cat.label, colors);
      return {
        ...cat,
        ...presentation,
        percent: `${percentValue.toFixed(1)}%`,
        percentValue,
        isLast: index === filteredExpenses.length - 1,
      };
    });
  }, [filteredExpenses, netExpense, colors]);

  const incomeRows = useMemo(() => {
    const total = Number(income);
    return filteredIncome.map((cat, index) => {
      const amount = Number(cat.income);
      const percentValue = total > 0 ? (amount / total) * 100 : 0;
      const presentation = getCategoryPresentation(cat.label, colors);
      return {
        ...cat,
        ...presentation,
        percent: `${percentValue.toFixed(1)}%`,
        percentValue,
        isLast: index === filteredIncome.length - 1,
      };
    });
  }, [filteredIncome, income, colors]);

  if (loading && !analysis) {
    return (
      <AppScreen style={styles.screen} background="base">
        <View style={styles.header}>
          <FinanceIconAction
            onPress={() => navigation.goBack()}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </FinanceIconAction>
          <AppText variant="title1" style={styles.headerTitle}>
            Análisis
          </AppText>
          <View style={{ width: theme.touchTargets.normal }} />
        </View>
        <ScrollView contentContainerStyle={styles.loadingContent}>
          <Skeleton style={styles.skeletonCard} width="100%" height={120} />
          <Skeleton style={styles.skeletonCard} width="100%" height={200} />
          <Skeleton style={styles.skeletonCard} width="100%" height={120} />
        </ScrollView>
      </AppScreen>
    );
  }

  if (error && !analysis) {
    return (
      <AppScreen style={styles.screen} background="base">
        <View style={styles.header}>
          <FinanceIconAction
            onPress={() => navigation.goBack()}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </FinanceIconAction>
          <AppText variant="title1" style={styles.headerTitle}>
            Análisis
          </AppText>
          <View style={{ width: theme.touchTargets.normal }} />
        </View>
        <ErrorState
          title="No pudimos cargar el análisis"
          description={error}
          onRetry={handleRefresh}
          style={styles.errorContainer}
        />
      </AppScreen>
    );
  }

  if (!analysis) {
    return (
      <AppScreen style={styles.screen} background="base">
        <View style={styles.header}>
          <FinanceIconAction
            onPress={() => navigation.goBack()}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </FinanceIconAction>
          <AppText variant="title1" style={styles.headerTitle}>
            Análisis
          </AppText>
          <View style={{ width: theme.touchTargets.normal }} />
        </View>
        <FinanceEmptyState level="inline" description="No hay información disponible para este período." />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      style={styles.screen}
      background="base"
      scroll
      scrollProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.terracotta[600]]} />,
      }}
    >
      <View style={styles.header}>
        <FinanceIconAction
          onPress={() => navigation.goBack()}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </FinanceIconAction>
        <AppText variant="title1" style={styles.headerTitle}>
          Análisis
        </AppText>
        <View style={{ width: theme.touchTargets.normal }} />
      </View>

      <View style={styles.contextBlock}>
        <AppText variant="caption" tone="secondary" weight="700">
          {contextLabel} · {currency}
        </AppText>
        <FinancePeriodNavigator
          label={periodLabel}
          onPrevious={() => movePeriod('previous')}
          onNext={() => movePeriod('next')}
          previousAccessibilityLabel={periodType === 'MONTHLY' ? 'Mes anterior' : 'Año anterior'}
          nextAccessibilityLabel={periodType === 'MONTHLY' ? 'Mes siguiente' : 'Año siguiente'}
          disabled={!readReady}
        />
      </View>

      <FinanceSegmented<AnalysisTab>
        variant="standard"
        distribution="equal"
        value={selectedTab}
        onChange={setSelectedTab}
        options={[
          { value: 'expenses', label: 'Gastos' },
          { value: 'income', label: 'Ingresos' },
          { value: 'evolution', label: 'Evolución' },
        ]}
        style={styles.segmented}
      />

      {selectedTab === 'expenses' && (
        <View style={styles.content}>
          <View style={styles.totalRow}>
            <AppText variant="title3" weight="800" style={styles.totalLabel}>
              Gastos
            </AppText>
            <AppText variant="title2" tone="danger" weight="800" style={styles.totalAmount}>
              {formatFinanceAmount(netExpense, currency)}
            </AppText>
          </View>

          {expenseRows.length > 0 ? (
            <FinanceSection
              title="Por categoría"
              divided={false}
              contentStyle={styles.sectionContent}
            >
              <View>
                {expenseRows.map((row) => (
                  <AnalysisCategoryRow
                    key={row.categoryId ?? row.label}
                    iconKey={row.iconKey}
                    iconColor={row.iconColor}
                    label={row.label}
                    amountText={formatFinanceAmount(row.netExpense, currency, { sign: 'none' })}
                    percentText={row.percent}
                    percentValue={row.percentValue}
                    barColor={colors.terracotta[600]}
                    divider={!row.isLast}
                  />
                ))}
              </View>
              {rankings?.largestCategoryIncrease && (
                <AppText variant="caption" tone="secondary" weight="700">
                  Mayor aumento: {rankings.largestCategoryIncrease.label} ({formatSignedPercent(rankings.largestCategoryIncrease.percentChange)})
                </AppText>
              )}
              {rankings?.largestCategoryDecrease && (
                <AppText variant="caption" tone="secondary" weight="700">
                  Mayor baja: {rankings.largestCategoryDecrease.label} ({formatSignedPercent(rankings.largestCategoryDecrease.percentChange)})
                </AppText>
              )}
            </FinanceSection>
          ) : (
            <FinanceEmptyState level="inline" description="Todavía no hay gastos para este período." />
          )}
        </View>
      )}

      {selectedTab === 'income' && (
        <View style={styles.content}>
          <View style={styles.totalRow}>
            <AppText variant="title3" weight="800" style={styles.totalLabel}>
              Ingresos
            </AppText>
            <AppText variant="title2" tone="success" weight="800" style={styles.totalAmount}>
              {formatFinanceAmount(income, currency)}
            </AppText>
          </View>

          {incomeRows.length > 0 ? (
            <FinanceSection
              title="Por categoría"
              divided={false}
              contentStyle={styles.sectionContent}
            >
              <View>
                {incomeRows.map((row) => (
                  <AnalysisCategoryRow
                    key={row.categoryId ?? row.label}
                    iconKey={row.iconKey}
                    iconColor={row.iconColor}
                    label={row.label}
                    amountText={formatFinanceAmount(row.income, currency, { sign: 'none' })}
                    percentText={row.percent}
                    percentValue={row.percentValue}
                    barColor={colors.success.strong}
                    divider={!row.isLast}
                  />
                ))}
              </View>
            </FinanceSection>
          ) : (
            <FinanceEmptyState level="inline" description="Todavía no hay ingresos para este período." />
          )}
        </View>
      )}

      {selectedTab === 'evolution' && (
        <View style={styles.content}>
          {periodType === 'MONTHLY' ? (
            <FinanceSection
              title="Evolución"
              divided={false}
              contentStyle={styles.sectionContent}
            >
              <PeriodComparisonBlock
                title="Gastos"
                change={comparison.netExpense}
                currency={currency}
                period={period}
                previousPeriod={comparison.previousPeriod}
                barColor={colors.danger.strong}
                increaseTone="danger"
                decreaseTone="success"
              />
              <PeriodComparisonBlock
                title="Ingresos"
                change={comparison.income}
                currency={currency}
                period={period}
                previousPeriod={comparison.previousPeriod}
                barColor={colors.success.strong}
                increaseTone="success"
                decreaseTone="danger"
              />
            </FinanceSection>
          ) : (
            <FinanceEmptyState level="inline" description="La evolución está disponible solo en vista mensual." />
          )}
        </View>
      )}
    </AppScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[2],
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    contextBlock: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[1],
      gap: spacing[1],
    },
    segmented: {
      marginHorizontal: spacing[4],
      marginTop: spacing[3],
    },
    content: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[6],
      gap: financeSpacing.sectionGap,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing[3],
      paddingBottom: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    totalLabel: {
      flex: 1,
    },
    totalAmount: {
      flexShrink: 1,
      textAlign: 'right',
    },
    sectionContent: {
      gap: financeSpacing.titleContentGap,
    },
    loadingContent: {
      flexGrow: 1,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      gap: spacing[4],
    },
    skeletonCard: {
      borderRadius: radius.xl,
    },
    errorContainer: {
      flex: 1,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[6],
    },
  });
}
