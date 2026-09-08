import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, typography } from '../../constants/theme';
import { AppButton, AppCard, AppText, InteractivePressable, Skeleton } from '../../components/ui';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import type { FinancePoolSummaryResponse } from '../../services/finance/financePools';

type PoolRowProps = {
  name: string;
  balance: string;
  currency: string;
};

function PoolRow({ name, balance, currency }: PoolRowProps) {
  const isNegative = balance.startsWith('-');
  const isZero = isZeroDecimalString(balance);

  return (
    <View style={styles.poolRow}>
      <AppText variant="body" weight="800" numberOfLines={1}>
        {name}
      </AppText>
      <View style={styles.poolAmountContainer}>
        <AppText
          variant="body"
          weight="800"
          tone={isZero ? 'primary' : isNegative ? 'danger' : 'success'}
          numberOfLines={1}
        >
          {formatFinanceAmount(balance, currency, { sign: isNegative ? 'net' : 'none' })}
        </AppText>
        {isNegative && (
          <AppText variant="caption" tone="danger" weight="700" style={styles.exceededLabel}>
            Te excediste de lo reservado
          </AppText>
        )}
      </View>
    </View>
  );
}

function UnknownCoverageNotice({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.coverageNotice}>
      <HomePlusIcon name="information-circle-outline" size={14} color={colors.warning.strong} />
      <AppText variant="caption" tone="secondary" style={styles.coverageText}>
        Hay {count} cuenta{count > 1 ? 's' : ''} con saldo sin establecer.
      </AppText>
    </View>
  );
}

function CoverageDeficitWarning({ deficit }: { deficit: string }) {
  if (deficit === '0' || isZeroDecimalString(deficit)) return null;
  return (
    <View style={styles.deficitWarning}>
      <HomePlusIcon name="alert-circle-outline" size={14} color={colors.warning.strong} />
      <AppText variant="caption" tone="secondary" style={styles.deficitText}>
        Tenés {formatFinanceAmount(deficit, '', { sign: 'none' })} organizados por encima del respaldo conocido.
      </AppText>
    </View>
  );
}

export function FinancePoolSummary({
  summary,
  loading,
  error,
  onRetry,
  onOrganize,
  onOpenAccounts,
}: {
  summary: FinancePoolSummaryResponse | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onOrganize?: () => void;
  onOpenAccounts?: () => void;
}) {
  if (loading && !summary) {
    return (
      <AppCard variant="quiet" padding="generous">
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={40} />
        <Skeleton width="60%" height={12} />
      </AppCard>
    );
  }

  if (error && !summary) {
    return (
      <AppCard variant="warning" padding="generous">
        <AppText variant="body" weight="800" tone="warning">
          No pudimos cargar tus pozos
        </AppText>
        <AppText variant="caption" tone="secondary" style={styles.errorText}>
          {error}
        </AppText>
      </AppCard>
    );
  }

  if (!summary) return null;

  const {
    knownOrganizableNet,
    unassignedKnown,
    allocationCoverageDeficit,
    unknownAccountCount,
    pools,
    currency,
  } = summary;

  const hasPools = pools.length > 0;

  return (
    <AppCard variant="quiet" padding="generous">
      <View style={styles.sectionHeader}>
        <AppText variant="title3" weight="800">
          Tu dinero
        </AppText>
        {onOrganize && (
          <AppButton
            title="Organizar"
            variant="secondary"
            size="sm"
            onPress={onOrganize}
            accessibilityLabel="Organizar pozos"
          />
        )}
      </View>

      <View style={styles.moneyOverview}>
        <View style={styles.moneyRow}>
          <AppText variant="caption" tone="secondary" weight="700">
            Disponible conocido
          </AppText>
          <AppText variant="title3" weight="800">
            {formatFinanceAmount(knownOrganizableNet, currency, { sign: 'net' })}
          </AppText>
        </View>
        <View style={styles.moneyRow}>
          <AppText variant="caption" tone="secondary" weight="700">
            Sin asignar
          </AppText>
          <AppText variant="title3" weight="800">
            {formatFinanceAmount(unassignedKnown, currency, { sign: 'net' })}
          </AppText>
        </View>

        <UnknownCoverageNotice count={unknownAccountCount} />
        <CoverageDeficitWarning deficit={allocationCoverageDeficit} />
      </View>

      {hasPools ? (
        <View style={styles.poolsList}>
          {pools
            .filter((p) => p.status === 'ACTIVE')
            .slice(0, 3)
            .map((pool) => (
              <PoolRow key={pool.id} name={pool.name} balance={pool.balance} currency={currency} />
            ))}
        </View>
      ) : (
        <View style={styles.emptyPools}>
          <HomePlusIcon name="wallet-outline" size={28} color={colors.terracotta[600]} />
          <AppText variant="body" weight="700" style={styles.emptyTitle}>
            Todavía no organizaste tu dinero en pozos.
          </AppText>
          {onOrganize && (
            <AppButton
              title="Crear pozo"
              variant="secondary"
              size="sm"
              onPress={onOrganize}
              style={styles.emptyCta}
            />
          )}
        </View>
      )}

      {onOpenAccounts && (
        <InteractivePressable
          onPress={onOpenAccounts}
          haptic="light"
          pressScale={motion.scale.tab}
          style={styles.accountsEntry}
          accessibilityRole="button"
          accessibilityLabel="Abrir Cuentas"
        >
          <HomePlusIcon name="wallet-outline" size={18} color={colors.terracotta[600]} />
          <AppText variant="body" weight="800">Cuentas</AppText>
          <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
        </InteractivePressable>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  moneyOverview: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poolsList: {
    gap: spacing[2],
  },
  poolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  poolAmountContainer: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  exceededLabel: {
    fontSize: typography.caption.fontSize,
  },
  coverageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.warning.soft,
  },
  coverageText: {
    flex: 1,
  },
  deficitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.warning.soft,
  },
  deficitText: {
    flex: 1,
  },
  emptyPools: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  emptyTitle: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
  emptyCta: {
    marginTop: spacing[2],
  },
  accountsEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 44,
    marginTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: spacing[3],
  },
  errorText: {
    marginTop: spacing[2],
  },
});
