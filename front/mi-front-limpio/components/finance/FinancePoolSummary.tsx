import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton, AppText, Skeleton } from '../../components/ui';
import { useAppTheme } from '../../context/AppThemeContext';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinancePoolSummaryResponse } from '../../services/finance/financePools';
import { FinanceSection } from './ui';

export function FinancePoolSummary({
  summary,
  loading,
  error,
  onRetry,
  onOrganize,
}: {
  summary: FinancePoolSummaryResponse | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onOrganize?: () => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  if (loading && !summary) {
    return (
      <View style={styles.loadingBlock}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={40} />
        <Skeleton width="60%" height={12} />
      </View>
    );
  }

  if (error && !summary) {
    return (
      <View style={[styles.sectionShell, styles.warningState]}>
        <AppText variant="body" weight="800" tone="warning">
          No pudimos cargar tus pozos
        </AppText>
        <AppText variant="caption" tone="secondary" style={styles.errorText}>
          {error}
        </AppText>
        {onRetry ? (
          <AppButton
            title="Reintentar"
            variant="secondary"
            size="sm"
            onPress={onRetry}
            style={styles.retryButton}
          />
        ) : null}
      </View>
    );
  }

  if (!summary) return null;

  const {
    knownOrganizableNet,
    unassignedKnown,
    currency,
    poolNetPosition,
  } = summary;

  // Stage 7B.1 — "Tu dinero" as a Resumen FinanceSection with the shared
  // value-row rhythm (same grammar as "Este mes").
  return (
    <FinanceSection
      title="Tu dinero"
      actionLabel={onOrganize ? 'Organizar' : undefined}
      onAction={onOrganize}
      actionAccessibilityLabel="Organizar dinero"
    >
      <View style={styles.moneyOverview}>
        <MoneyRow
          label="Disponible"
          value={formatFinanceAmount(knownOrganizableNet, currency, { sign: 'net' })}
        />
        <MoneyRow
          label="Organizado"
          value={formatFinanceAmount(poolNetPosition, currency, { sign: 'net' })}
        />
        <MoneyRow
          label="Sin organizar"
          value={formatFinanceAmount(unassignedKnown, currency, { sign: 'net' })}
          showDivider={false}
        />
      </View>
    </FinanceSection>
  );
}

function MoneyRow({
  label,
  value,
  showDivider = true,
}: {
  label: string;
  value: string;
  showDivider?: boolean;
}) {
  const styles = createStyles(useAppTheme());

  return (
    <View style={[styles.moneyRow, showDivider && styles.moneyRowDivider]}>
      <AppText variant="bodySmall" tone="secondary" weight="600" numberOfLines={1} ellipsizeMode="tail">
        {label}
      </AppText>
      <AppText
        variant="title3"
        weight="800"
        style={styles.moneyAmount}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {value}
      </AppText>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    sectionShell: {
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
    loadingBlock: {
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
    warningState: {
      borderRadius: radius.lg,
      backgroundColor: colors.warning.soft,
      padding: spacing[3],
    },
    moneyOverview: {
      gap: 0,
    },
    moneyRow: {
      minHeight: 52,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
    moneyRowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
    },
    moneyAmount: {
      flexShrink: 1,
      maxWidth: '66%',
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    errorText: {
      marginTop: spacing[2],
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: spacing[3],
    },
  });
}
