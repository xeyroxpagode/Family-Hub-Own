import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton, AppText, Skeleton, InteractivePressable } from '../../components/ui';
import { useAppTheme } from '../../context/AppThemeContext';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import { HomePlusIcon } from '../../constants/icons';
import type { FinanceSpendingLimitProgressDto } from '../../services/finance/financeSpendingLimits';

function ProgressBar({ percent, status }: { percent: number; status: 'UNDER' | 'AT' | 'OVER' }) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  let fillColor: string = colors.terracotta[600];

  if (status === 'AT') fillColor = colors.warning.strong;
  else if (status === 'OVER') fillColor = colors.danger.strong;

  const clampedPercent = Math.min(percent, 100);

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${clampedPercent}%`, backgroundColor: fillColor },
        ]}
      />
    </View>
  );
}

function LimitRow({ limit, currency }: { limit: FinanceSpendingLimitProgressDto; currency: string }) {
  const styles = createStyles(useAppTheme());
  const spent = limit.spent;
  const limitAmount = limit.amount;
  const percentUsed = Number(limit.percentUsed);
  const status = limit.status;
  const overBy = limit.overBy;

  const isOver = status === 'OVER';
  const isAt = status === 'AT';

  const label = limit.categoryLabelSnapshot ?? 'General';

  return (
    <View style={styles.limitRow}>
      <View style={styles.limitHeader}>
        <AppText variant="body" weight="800" numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <View style={styles.limitProgress}>
        <View style={styles.limitValues}>
          <AppText
            variant="caption"
            weight="700"
            tone={isOver ? 'danger' : isAt ? 'warning' : 'secondary'}
          >
            {formatFinanceAmount(spent, currency, { sign: 'none' })} de{' '}
            {formatFinanceAmount(limitAmount, currency, { sign: 'none' })}
          </AppText>
          <AppText
            variant="caption"
            weight="800"
            tone={isOver ? 'danger' : isAt ? 'warning' : 'secondary'}
          >
            {percentUsed.toFixed(0)}%
          </AppText>
        </View>
        <ProgressBar percent={percentUsed} status={status} />
        {isOver && overBy !== '0' && !isZeroDecimalString(overBy) && (
          <AppText variant="caption" tone="danger" weight="700" style={styles.overText}>
            Te pasaste {formatFinanceAmount(overBy, currency, { sign: 'none' })}
          </AppText>
        )}
      </View>
    </View>
  );
}

function sortLimitsForDashboard(limits: FinanceSpendingLimitProgressDto[]): FinanceSpendingLimitProgressDto[] {
  return [...limits].sort((a, b) => {
    const statusOrder = { OVER: 0, AT: 1, UNDER: 2 };
    const aOrder = statusOrder[a.status];
    const bOrder = statusOrder[b.status];
    if (aOrder !== bOrder) return aOrder - bOrder;
    return Number(b.percentUsed) - Number(a.percentUsed);
  });
}

export function FinanceSpendingLimitSummary({
  progress,
  loading,
  error,
  onRetry,
  onManage,
}: {
  progress: FinanceSpendingLimitProgressDto[] | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onManage?: () => void;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  if (loading && !progress) {
    return (
      <View style={styles.sectionShell}>
        <Skeleton width="50%" height={14} />
        <Skeleton width="80%" height={40} />
        <Skeleton width="60%" height={12} />
      </View>
    );
  }

  if (error && !progress) {
    return (
      <View style={[styles.sectionShell, styles.warningState]}>
        <AppText variant="body" weight="800" tone="warning">
          No pudimos cargar los límites
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

  const sortedLimits = sortLimitsForDashboard(progress ?? []);
  const displayLimits = sortedLimits.slice(0, 3);
  const currency = displayLimits[0]?.currency || 'ARS';
  const hasLimits = displayLimits.length > 0;

  return (
    <View style={styles.sectionShell}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleCopy}>
          <AppText variant="title3" weight="800">
            Límites de gasto
          </AppText>
          {!hasLimits ? (
            <AppText variant="caption" tone="secondary">
              Sin límites configurados
            </AppText>
          ) : null}
        </View>
      </View>
      {hasLimits ? (
        <View style={styles.limitsList}>
          {displayLimits.map((limit) => (
            <LimitRow key={limit.id} limit={limit} currency={currency} />
          ))}
        </View>
      ) : null}
      {onManage && (
        <InteractivePressable
          onPress={onManage}
          haptic="light"
          pressScale={motion.scale.card}
          style={styles.manageButton}
          accessibilityRole="button"
          accessibilityLabel="Administrar límites de gasto"
        >
          <AppText variant="bodySmall" weight="800" tone="brand">
            Administrar
          </AppText>
          <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
        </InteractivePressable>
      )}
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
    sectionTitleCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing[1],
    },
    limitsList: {
      gap: spacing[3],
    },
    limitRow: {
      gap: spacing[2],
    },
    limitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    limitProgress: {
      gap: spacing[2],
    },
    limitValues: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border.default,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    overText: {
      marginTop: spacing[1],
    },
    errorText: {
      marginTop: spacing[2],
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: spacing[3],
    },
    manageButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1],
      paddingVertical: spacing[3],
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
  });
}
