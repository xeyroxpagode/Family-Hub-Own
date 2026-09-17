import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { AppCard, AppText } from '../../components/ui';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceAnalysisResponse } from '../../services/finance/financeAnalysis';

type HighlightRowProps = {
  icon: React.ComponentProps<typeof import('@expo/vector-icons').Ionicons>['name'];
  iconColor: string;
  label: string;
  value: string;
  secondary?: string;
  secondaryTone?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
};

function HighlightRow({ icon, iconColor, label, value, secondary, secondaryTone = 'secondary' }: HighlightRowProps) {
  return (
    <View style={styles.highlightRow}>
      <View style={styles.iconContainer}>
        <HomePlusIcon name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.highlightContent}>
        <AppText variant="caption" tone="secondary" weight="700">
          {label}
        </AppText>
        <AppText variant="body" weight="800" numberOfLines={1}>
          {value}
        </AppText>
        {secondary && (
          <AppText variant="caption" tone={secondaryTone} weight={secondaryTone !== 'secondary' ? '700' : '400'}>
            {secondary}
          </AppText>
        )}
      </View>
    </View>
  );
}

function formatPercentChange(percentChange: string | null): string {
  if (!percentChange) return '';
  const num = Number(percentChange);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(0)}%`;
}

export function FinanceAnalysisHighlights({
  analysis,
  currency,
}: {
  analysis: FinanceAnalysisResponse | null;
  currency: string;
}) {
  if (!analysis) return null;

  const { totals, comparison, rankings, spendingLimitProgress } = analysis;
  const highlights: Array<{ key: string; render: () => React.ReactElement }> = [];

  const netExpenseComparison = comparison.netExpense;
  const incomeComparison = comparison.income;

  if (netExpenseComparison.comparisonKind !== 'NONE') {
    const secondary =
      netExpenseComparison.comparisonKind === 'NEW'
        ? 'Nuevo este mes'
        : netExpenseComparison.comparisonKind === 'PERCENT'
        ? `${formatPercentChange(netExpenseComparison.percentChange)} vs mes anterior`
        : 'Sin cambios vs mes anterior';

    highlights.push({
      key: 'netExpense',
      render: () => (
        <HighlightRow
          icon="trending-down-outline"
          iconColor={colors.danger.strong}
          label="Gastamos"
          value={formatFinanceAmount(totals.netExpense, currency, { sign: 'net' })}
          secondary={secondary}
          secondaryTone={netExpenseComparison.comparisonKind === 'PERCENT' && Number(netExpenseComparison.percentChange ?? 0) > 0 ? 'danger' : 'secondary'}
        />
      ),
    });
  }

  if (incomeComparison.comparisonKind !== 'NONE') {
    const secondary =
      incomeComparison.comparisonKind === 'NEW'
        ? 'Nuevo este mes'
        : incomeComparison.comparisonKind === 'PERCENT'
        ? `${formatPercentChange(incomeComparison.percentChange)} vs mes anterior`
        : 'Sin cambios vs mes anterior';

    highlights.push({
      key: 'income',
      render: () => (
        <HighlightRow
          icon="trending-up-outline"
          iconColor={colors.success.strong}
          label="Ingresó"
          value={formatFinanceAmount(totals.income, currency, { sign: 'net' })}
          secondary={secondary}
          secondaryTone={incomeComparison.comparisonKind === 'PERCENT' && Number(incomeComparison.percentChange ?? 0) > 0 ? 'success' : 'secondary'}
        />
      ),
    });
  }

  if (rankings?.topExpenseCategories?.length > 0) {
    const top = rankings.topExpenseCategories[0];
    highlights.push({
      key: 'topExpense',
      render: () => (
        <HighlightRow
          icon="restaurant-outline"
          iconColor={colors.terracotta[600]}
          label="Mayor gasto"
          value={`${top.label} · ${formatFinanceAmount(top.netExpense, currency, { sign: 'none' })}`}
        />
      ),
    });
  }

  if (rankings?.largestCategoryIncrease) {
    const inc = rankings.largestCategoryIncrease;
    const percent = formatPercentChange(inc.percentChange);
    highlights.push({
      key: 'largestIncrease',
      render: () => (
        <HighlightRow
          icon="arrow-up-circle-outline"
          iconColor={colors.warning.strong}
          label="Mayor aumento"
          value={`${inc.label} · ${formatFinanceAmount(inc.currentNetExpense, currency, { sign: 'none' })}`}
          secondary={percent}
          secondaryTone="warning"
        />
      ),
    });
  }

  if (rankings?.largestCategoryDecrease) {
    const dec = rankings.largestCategoryDecrease;
    const percent = formatPercentChange(dec.percentChange);
    highlights.push({
      key: 'largestDecrease',
      render: () => (
        <HighlightRow
          icon="arrow-down-circle-outline"
          iconColor={colors.success.strong}
          label="Mayor baja"
          value={`${dec.label} · ${formatFinanceAmount(dec.currentNetExpense, currency, { sign: 'none' })}`}
          secondary={percent}
          secondaryTone="success"
        />
      ),
    });
  }

  const totalRefunded = Number(totals.totalRefunded ?? totals.refundedAmount ?? '0');
  if (totalRefunded > 0) {
    highlights.push({
      key: 'refunds',
      render: () => (
        <HighlightRow
          icon="refresh-outline"
          iconColor={colors.info.base}
          label="Devoluciones"
          value={formatFinanceAmount(totals.totalRefunded, currency, { sign: 'none' })}
          secondary="Recuperados este mes"
          secondaryTone="secondary"
        />
      ),
    });
  }

  if (highlights.length === 0) return null;

  return (
    <AppCard variant="quiet" padding="generous">
      <View style={styles.sectionHeader}>
        <AppText variant="title3" weight="800">
          Destacados
        </AppText>
      </View>
      <View style={styles.highlightsList}>
        {highlights.map((h) => (
          <React.Fragment key={h.key}>{h.render()}</React.Fragment>
        ))}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: spacing[3],
  },
  highlightsList: {
    gap: spacing[3],
  },
  highlightRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightContent: {
    flex: 1,
    gap: 2,
  },
});
