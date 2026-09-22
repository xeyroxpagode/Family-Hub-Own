import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton, AppText, InteractivePressable, Skeleton } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinancePoolSummaryResponse } from '../../services/finance/financePools';

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
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  if (loading && !summary) {
    return (
      <View style={styles.sectionShell}>
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

  return (
    <View style={styles.sectionShell}>
      <View style={styles.sectionHeader}>
        <AppText variant="title3" weight="800">
          Tu dinero
        </AppText>
      </View>

      <View style={styles.moneyOverview}>
        <View style={styles.moneyRow}>
          <AppText variant="caption" tone="secondary" weight="700">
            Disponible
          </AppText>
          <AppText variant="title3" weight="800" style={styles.moneyAmount}>
            {formatFinanceAmount(knownOrganizableNet, currency, { sign: 'net' })}
          </AppText>
        </View>
        <View style={styles.moneyRow}>
          <AppText variant="caption" tone="secondary" weight="700">
            Organizado
          </AppText>
          <AppText variant="title3" weight="800" style={styles.moneyAmount}>
            {formatFinanceAmount(poolNetPosition, currency, { sign: 'net' })}
          </AppText>
        </View>
        <View style={styles.moneyRow}>
          <AppText variant="caption" tone="secondary" weight="700">
            Sin organizar
          </AppText>
          <AppText variant="title3" weight="800" style={styles.moneyAmount}>
            {formatFinanceAmount(unassignedKnown, currency, { sign: 'net' })}
          </AppText>
        </View>
      </View>
      {onOrganize ? (
        <InteractivePressable
          onPress={onOrganize}
          haptic="light"
          pressScale={motion.scale.card}
          style={styles.sectionAction}
          accessibilityRole="button"
          accessibilityLabel="Organizar dinero"
        >
          <AppText variant="bodySmall" weight="800" tone="brand">
            Organizar
          </AppText>
          <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
        </InteractivePressable>
      ) : null}
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
    warningState: {
      borderRadius: radius.lg,
      backgroundColor: colors.warning.soft,
      padding: spacing[3],
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing[3],
    },
    sectionAction: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1],
      paddingVertical: spacing[3],
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    moneyOverview: {
      gap: 0,
    },
    moneyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing[3],
      paddingVertical: spacing[2],
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
