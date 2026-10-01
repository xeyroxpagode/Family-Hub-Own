import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton, AppText, Skeleton } from '../../components/ui';
import { useAppTheme } from '../../context/AppThemeContext';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import type { FinanceSpendingLimitProgressDto } from '../../services/finance/financeSpendingLimits';
import { FinanceSection, FinanceSemanticSurface } from './ui';

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

function getGeneralLimit(limits: FinanceSpendingLimitProgressDto[]): FinanceSpendingLimitProgressDto | null {
  return limits.find((l) => l.scopeType === 'OVERALL') ?? null;
}

function getCategoryLimits(limits: FinanceSpendingLimitProgressDto[]): FinanceSpendingLimitProgressDto[] {
  return limits.filter((l) => l.scopeType === 'CATEGORY');
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
  const { colors } = theme;
  const styles = createStyles(theme);

  if (loading && !progress) {
    return (
      <View style={styles.loadingBlock}>
        <Skeleton width="50%" height={14} />
        <Skeleton width="80%" height={50} />
        <Skeleton width="60%" height={12} />
      </View>
    );
  }

  if (error && !progress) {
    return (
      <View style={styles.warningState}>
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

  const allLimits = progress ?? [];
  const generalLimit = getGeneralLimit(allLimits);
  const categoryLimits = getCategoryLimits(allLimits);
  const sortedCategoryLimits = sortLimitsForDashboard(categoryLimits);
  const displayCategoryLimits = sortedCategoryLimits.slice(0, 2);
  const currency = generalLimit?.currency ?? displayCategoryLimits[0]?.currency ?? 'ARS';
  const hasAnyLimits = allLimits.length > 0;

  // Stage 7B.1 (P3) — "Límites de gasto" is a permanent Resumen section:
  // the title exists whether limits exist or not.
  if (!hasAnyLimits) {
    return (
      <FinanceSection
        title="Límites de gasto"
        actionLabel={onManage ? 'Administrar' : undefined}
        onAction={onManage}
        actionAccessibilityLabel="Administrar límites de gasto"
      >
        <View style={styles.emptyState}>
          <AppText variant="body" tone="secondary" style={styles.emptyText}>
            No definiste límites de gasto todavía.
          </AppText>
          <AppText variant="caption" tone="secondary" style={styles.emptySubtext}>
            Usalos para tener una referencia de cuánto querés gastar, sin bloquear tus movimientos.
          </AppText>
        </View>
      </FinanceSection>
    );
  }

  const generalTone = generalLimit?.status === 'OVER' ? 'danger' : generalLimit?.status === 'AT' ? 'warning' : 'neutral';

  return (
    <FinanceSection
      title="Límites de gasto"
      actionLabel={onManage ? 'Administrar' : undefined}
      onAction={onManage}
      actionAccessibilityLabel="Administrar límites de gasto"
    >
      {generalLimit && (
        <FinanceSemanticSurface tone={generalTone}>
          <View style={styles.generalProgress}>
            {generalLimit.status !== 'OVER' ? (
              <>
                <View style={styles.generalValues}>
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Gastaste
                    </AppText>
                    <AppText variant="title3" weight="800">
                      {formatFinanceAmount(generalLimit.spent, currency)}
                    </AppText>
                  </View>
                  <View style={styles.generalDivider} />
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      de
                    </AppText>
                    <AppText variant="title3" weight="800">
                      {formatFinanceAmount(generalLimit.amount, currency)}
                    </AppText>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(Number(generalLimit.percentUsed), 100)}%`, backgroundColor: generalLimit.status === 'AT' ? colors.warning.strong : colors.terracotta[600] },
                    ]}
                  />
                </View>
                <View style={styles.generalRemaining}>
                  <AppText variant="body" weight="700" tone={generalLimit.status === 'AT' ? 'warning' : 'success'}>
                    Te quedan {formatFinanceAmount(generalLimit.remaining, currency, { sign: 'none' })}
                  </AppText>
                </View>
              </>
            ) : (
              <>
                <View style={styles.generalValues}>
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Gastaste
                    </AppText>
                    <AppText variant="title3" weight="800" tone="danger">
                      {formatFinanceAmount(generalLimit.spent, currency)}
                    </AppText>
                  </View>
                  <View style={styles.generalDivider} />
                  <View style={styles.generalValue}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Límite
                    </AppText>
                    <AppText variant="title3" weight="800">
                      {formatFinanceAmount(generalLimit.amount, currency)}
                    </AppText>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: '100%', backgroundColor: colors.danger.strong },
                    ]}
                  />
                </View>
                <View style={styles.generalRemaining}>
                  <AppText variant="body" weight="700" tone="danger">
                    Superaste el límite por {formatFinanceAmount(generalLimit.overBy, currency, { sign: 'none' })}
                  </AppText>
                </View>
              </>
            )}
          </View>
        </FinanceSemanticSurface>
      )}

      {displayCategoryLimits.length > 0 && (
        <View style={styles.categorySection}>
          {displayCategoryLimits.map((limit) => (
            <LimitRow key={limit.id} limit={limit} currency={currency} />
          ))}
          {categoryLimits.length > 2 && (
            <AppText variant="caption" tone="tertiary" style={styles.moreText}>
              +{categoryLimits.length - 2} más
            </AppText>
          )}
        </View>
      )}
    </FinanceSection>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    loadingBlock: {
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
    warningState: {
      borderRadius: radius.lg,
      backgroundColor: colors.warning.soft,
      padding: spacing[3],
    },
    generalProgress: {
      gap: spacing[2],
    },
    generalValues: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: spacing[3],
    },
    generalValue: {
      flex: 1,
      alignItems: 'center',
      gap: spacing[1],
    },
    generalDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.border.subtle,
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
    generalRemaining: {
      paddingTop: spacing[1],
      textAlign: 'center',
    },
    categorySection: {
      gap: spacing[3],
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
    emptyState: {
      alignItems: 'center',
      gap: spacing[1],
      paddingVertical: spacing[3],
    },
    emptyText: {
      textAlign: 'center',
    },
    emptySubtext: {
      textAlign: 'center',
    },
    moreText: {
      textAlign: 'center',
      marginTop: spacing[1],
    },
  });
}
