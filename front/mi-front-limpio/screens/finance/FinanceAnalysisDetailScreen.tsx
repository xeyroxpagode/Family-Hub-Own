import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import {
  AppScreen,
  AppCard,
  AppText,
  AppButton,
  Skeleton,
  ErrorState,
  EmptyState,
  InteractivePressable,
} from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { AbortError, ApiError } from '../../services/api';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import {
  FINANCE_CONTEXT_TYPES,
  type FinanceContextType,
} from '../../services/finance/financeContext';
import {
  getFinanceAnalysis,
  type FinanceAnalysisResponse,
  type FinanceAnalysisPeriodType,
} from '../../services/finance/financeAnalysis';
import { shiftFinanceMonth, formatFinancePeriodLabel, financeMonthFromLocalDate } from '../../services/finance/financePeriod';
import { FinanceAnalysisHighlights } from '../../components/finance/FinanceAnalysisHighlights';

type FinanceAnalysisDetailRouteParams = {
  contextType: FinanceContextType;
  currency: string;
  periodType: FinanceAnalysisPeriodType;
  period: string;
};

type FinanceAnalysisDetailScreenRouteProp = RouteProp<import('../../navigation/types').MoreStackParamList, 'FinanceAnalysisDetail'>;

function safeFinanceReadError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No pudimos cargar el análisis. Intenta de nuevo.';
}

function formatPercent(value: string | null): string {
  if (!value) return '—';
  const num = Number(value);
  if (!isFinite(num)) return '—';
  return `${num.toFixed(1)}%`;
}

function CategoryBreakdownRow({
  label,
  amount,
  currency,
  percent,
  tone = 'danger',
}: {
  label: string;
  amount: string;
  currency: string;
  percent: string;
  tone?: 'danger' | 'success';
}) {
  const barWidth = Math.min(Math.max(Number(percent.replace('%', '')), 0), 100);
  return (
    <View style={styles.categoryRow}>
      <View style={[styles.categoryLeft, { flex: 1, minWidth: 0 }]}>
        <AppText variant="body" weight="700" numberOfLines={1} style={styles.categoryLabel}>
          {label}
        </AppText>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${barWidth}%`, backgroundColor: tone === 'danger' ? colors.danger.strong : colors.success.strong },
            ]}
          />
        </View>
      </View>
      <View style={[styles.categoryRight, { flexShrink: 0, marginLeft: spacing[3] }]}>
        <AppText variant="body" tone={tone} weight="800" numberOfLines={1} style={styles.categoryAmount}>
          {formatFinanceAmount(amount, currency, { sign: 'none' })}
        </AppText>
        <AppText variant="caption" tone="tertiary" numberOfLines={1} style={styles.categoryPercent}>
          {percent}
        </AppText>
      </View>
    </View>
  );
}

function IncomeCategoryRow({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: string;
  currency: string;
}) {
  return (
    <View style={styles.incomeCategoryRow}>
      <View style={[styles.categoryLeft, { flex: 1, minWidth: 0 }]}>
        <AppText variant="body" weight="700" numberOfLines={1} style={styles.categoryLabel}>
          {label}
        </AppText>
      </View>
      <AppText variant="body" tone="success" weight="800" numberOfLines={1} style={styles.categoryAmount}>
        {formatFinanceAmount(amount, currency, { sign: 'none' })}
      </AppText>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  currency,
  tone = 'primary',
  sign: signMode = 'none',
}: {
  label: string;
  value: string;
  currency: string;
  tone?: 'primary' | 'danger' | 'success';
  sign?: 'none' | 'net';
}) {
  return (
    <View style={styles.summaryCard}>
      <AppText variant="caption" tone="secondary" weight="700">
        {label}
      </AppText>
      <AppText variant="title2" tone={tone} weight="800" numberOfLines={1}>
        {formatFinanceAmount(value, currency, { sign: signMode })}
      </AppText>
    </View>
  );
}

export function FinanceAnalysisDetailScreen() {
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

  const activeHousehold = currentHousehold ? { id: currentHousehold.id, name: currentHousehold.nombre } : null;
  const contextLabel = contextType === FINANCE_CONTEXT_TYPES.PERSONAL ? 'Personal' : activeHousehold?.name ?? 'Hogar';
  const periodLabel = periodType === 'MONTHLY' ? formatFinancePeriodLabel(period) : period;

  const readReady = Boolean(session?.access_token) && !householdLoading && (
    (contextType === FINANCE_CONTEXT_TYPES.PERSONAL) || (contextType === FINANCE_CONTEXT_TYPES.HOUSEHOLD && activeHousehold)
  );

  const fetchAnalysis = React.useCallback(async (signal?: AbortSignal, isRefresh = false) => {
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
    React.useCallback(() => {
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

  const switchPeriodType = () => {
    if (periodType === 'MONTHLY') {
      const year = period.split('-')[0];
      navigation.navigate('FinanceAnalysisDetail', {
        contextType,
        currency,
        periodType: 'YEARLY',
        period: year,
      });
    } else {
      const currentMonth = financeMonthFromLocalDate();
      navigation.navigate('FinanceAnalysisDetail', {
        contextType,
        currency,
        periodType: 'MONTHLY',
        period: currentMonth,
      });
    }
  };

  if (loading && !analysis) {
    return (
      <AppScreen style={styles.screen} background="base">
        <View style={styles.header}>
          <InteractivePressable
            onPress={() => navigation.goBack()}
            haptic="light"
            pressScale={motion.scale.icon}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </InteractivePressable>
          <AppText variant="title1" style={styles.headerTitle}>
            Análisis
          </AppText>
          <View style={{ width: touchTargets.normal }} />
        </View>
        <ScrollView contentContainerStyle={styles.loadingContent}>
          <Skeleton style={styles.skeletonCard} width="100%" height={200} />
          <Skeleton style={styles.skeletonCard} width="100%" height={300} />
          <Skeleton style={styles.skeletonCard} width="100%" height={200} />
        </ScrollView>
      </AppScreen>
    );
  }

  if (error && !analysis) {
    return (
      <AppScreen style={styles.screen} background="base">
        <View style={styles.header}>
          <InteractivePressable
            onPress={() => navigation.goBack()}
            haptic="light"
            pressScale={motion.scale.icon}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </InteractivePressable>
          <AppText variant="title1" style={styles.headerTitle}>
            Análisis
          </AppText>
          <View style={{ width: touchTargets.normal }} />
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
          <InteractivePressable
            onPress={() => navigation.goBack()}
            haptic="light"
            pressScale={motion.scale.icon}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </InteractivePressable>
          <AppText variant="title1" style={styles.headerTitle}>
            Análisis
          </AppText>
          <View style={{ width: touchTargets.normal }} />
        </View>
        <EmptyState
          title="Sin datos de análisis"
          description="No hay información disponible para este período."
          illustration={<HomePlusIcon name="pie-chart-outline" size={30} color={colors.terracotta[600]} />}
          style={styles.emptyContainer}
        />
      </AppScreen>
    );
  }

  const { totals, categoryExpenses, categoryIncome, rankings } = analysis;
  const hasExpense = categoryExpenses.length > 0;
  const hasIncome = categoryIncome.length > 0;

  const netExpense = totals.netExpense;
  const income = totals.income;
  const netResult = totals.netResult;
  const grossExpense = totals.grossExpense;
  const refundedAmount = totals.refundedAmount;

  const netExpenseTone = isZeroDecimalString(netResult) ? 'primary' : netResult.startsWith('-') ? 'danger' : 'success';

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
        <InteractivePressable
          onPress={() => navigation.goBack()}
          haptic="light"
          pressScale={motion.scale.icon}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </InteractivePressable>
        <AppText variant="title1" style={styles.headerTitle}>
          Análisis
        </AppText>
        <View style={{ width: touchTargets.normal }} />
      </View>

      <View style={styles.contextBar}>
        <View style={styles.contextInfo}>
          <AppText variant="caption" tone="secondary" weight="700">
            {contextLabel} · {currency}
          </AppText>
        </View>
        <View style={styles.periodControl}>
          <InteractivePressable
            onPress={() => movePeriod('previous')}
            haptic="light"
            pressScale={motion.scale.icon}
            style={styles.periodButton}
            accessibilityRole="button"
            accessibilityLabel={periodType === 'MONTHLY' ? 'Mes anterior' : 'Año anterior'}
            disabled={!readReady}
          >
            <HomePlusIcon name="chevron-back-outline" size={20} color={readReady ? colors.text.secondary : colors.text.tertiary} />
          </InteractivePressable>
          <AppText variant="bodySmall" weight="800" style={styles.periodLabel} numberOfLines={1}>
            {periodLabel}
          </AppText>
          <InteractivePressable
            onPress={() => movePeriod('next')}
            haptic="light"
            pressScale={motion.scale.icon}
            style={styles.periodButton}
            accessibilityRole="button"
            accessibilityLabel={periodType === 'MONTHLY' ? 'Mes siguiente' : 'Año siguiente'}
            disabled={!readReady}
          >
            <HomePlusIcon name="chevron-forward-outline" size={20} color={readReady ? colors.text.secondary : colors.text.tertiary} />
          </InteractivePressable>
        </View>
        <InteractivePressable
          onPress={switchPeriodType}
          haptic="light"
          pressScale={motion.scale.card}
          style={styles.periodTypeButton}
          accessibilityRole="button"
          accessibilityLabel={periodType === 'MONTHLY' ? 'Cambiar a vista anual' : 'Cambiar a vista mensual'}
          disabled={!readReady}
        >
          <AppText variant="caption" weight="800" tone={readReady ? 'primary' : 'tertiary'}>
            {periodType === 'MONTHLY' ? 'Anual' : 'Mensual'}
          </AppText>
        </InteractivePressable>
      </View>

      <AppCard variant="quiet" padding="generous" style={styles.summarySection}>
        <View style={styles.summaryCards}>
          <SummaryCard
            label="Ingresó"
            value={income}
            currency={currency}
            tone="success"
          />
          <SummaryCard
            label="Gastaste"
            value={netExpense}
            currency={currency}
            tone="danger"
          />
          <SummaryCard
            label="Neto"
            value={netResult}
            currency={currency}
            tone={netExpenseTone}
            sign="net"
          />
        </View>

        {!isZeroDecimalString(grossExpense) && !isZeroDecimalString(refundedAmount) && Number(refundedAmount) > 0 && (
          <View style={styles.refundNote}>
            <AppText variant="caption" tone="info" weight="700">
              Gasto bruto: {formatFinanceAmount(grossExpense, currency, { sign: 'none' })} · Devoluciones: {formatFinanceAmount(refundedAmount, currency, { sign: 'none' })}
            </AppText>
          </View>
        )}
      </AppCard>

      {hasExpense ? (
        <AppCard variant="quiet" padding="generous" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AppText variant="title3" weight="800">
              Gasto por categoría
            </AppText>
          </View>
          <View style={styles.categoryList}>
            {categoryExpenses
              .filter((cat) => !isZeroDecimalString(cat.netExpense) && Number(cat.netExpense) > 0)
              .map((cat) => (
                <CategoryBreakdownRow
                  key={cat.categoryId ?? cat.label}
                  label={cat.label}
                  amount={cat.netExpense}
                  currency={currency}
                  percent={cat.shareOfNetExpense ? `${Number(cat.shareOfNetExpense).toFixed(1)}%` : '—'}
                  tone="danger"
                />
              ))}
          </View>
          {categoryExpenses.filter((cat) => !isZeroDecimalString(cat.netExpense) && Number(cat.netExpense) > 0).length === 0 && (
            <AppText variant="body" tone="secondary" style={styles.emptyCategoryText}>
              Todavía no hay gastos en este período.
            </AppText>
          )}
        </AppCard>
      ) : (
        <AppCard variant="quiet" padding="generous" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AppText variant="title3" weight="800">
              Gasto por categoría
            </AppText>
          </View>
          <AppText variant="body" tone="secondary" style={styles.emptyCategoryText}>
            Todavía no hay gastos en este período.
          </AppText>
        </AppCard>
      )}

      {hasIncome && (
        <AppCard variant="quiet" padding="generous" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AppText variant="title3" weight="800">
              Ingresos
            </AppText>
          </View>
          <View style={styles.incomeCategoryList}>
            {categoryIncome
              .filter((cat) => !isZeroDecimalString(cat.income) && Number(cat.income) > 0)
              .map((cat) => (
                <IncomeCategoryRow
                  key={cat.categoryId ?? cat.label}
                  label={cat.label}
                  amount={cat.income}
                  currency={currency}
                />
              ))}
          </View>
          {categoryIncome.filter((cat) => !isZeroDecimalString(cat.income) && Number(cat.income) > 0).length === 0 && (
            <AppText variant="body" tone="secondary" style={styles.emptyCategoryText}>
              Sin ingresos categorizados en este período.
            </AppText>
          )}
        </AppCard>
      )}

      <FinanceAnalysisHighlights
        analysis={analysis}
        currency={currency}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  contextInfo: {
    flex: 1,
  },
  periodControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  periodButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabel: {
    minWidth: 100,
    textAlign: 'center',
  },
  periodTypeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  summarySection: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  summaryCards: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  summaryCard: {
    flex: 1,
    gap: 2,
  },
  refundNote: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  sectionCard: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
  },
  sectionHeader: {
    marginBottom: spacing[3],
  },
  categoryList: {
    gap: spacing[3],
  },
  incomeCategoryList: {
    gap: spacing[2],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  incomeCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  categoryLeft: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  categoryRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 1,
  },
  categoryLabel: {
    flex: 1,
  },
  categoryAmount: {
    textAlign: 'right',
  },
  categoryPercent: {
    textAlign: 'right',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface.muted,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyCategoryText: {
    textAlign: 'center',
    paddingVertical: spacing[2],
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
  emptyContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
  },
});