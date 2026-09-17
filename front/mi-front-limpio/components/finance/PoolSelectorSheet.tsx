import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import {
  ActionSheet,
  AppButton,
  AppText,
  EmptyState,
  InteractivePressable,
  Skeleton,
} from '../ui';
import type { FinancePoolDto } from '../../services/finance/financePools';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';

export type PoolSelectorSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  pools: FinancePoolDto[];
  loading?: boolean;
  error?: string | null;
  selectedPoolId: string | null;
  allowNone: boolean;
  noneLabel?: string;
  disabled?: boolean;
  onRequestClose: () => void;
  onSelect: (pool: FinancePoolDto | null) => void;
};

const DEFAULT_NONE_LABEL = 'Sin pozo';

export function PoolSelectorSheet({
  visible,
  title,
  subtitle,
  pools,
  loading = false,
  error = null,
  selectedPoolId,
  allowNone,
  noneLabel = DEFAULT_NONE_LABEL,
  disabled = false,
  onRequestClose,
  onSelect,
}: PoolSelectorSheetProps) {
  const sortedPools = useMemo(
    () => [...pools].sort((a, b) => a.name.localeCompare(b.name)),
    [pools],
  );

  const handleChoose = (pool: FinancePoolDto | null) => {
    if (disabled) return;
    onSelect(pool);
  };

  const footer = (
    <View style={styles.footer}>
      <AppButton
        title="Cancelar"
        variant="ghost"
        onPress={onRequestClose}
        disabled={disabled}
        style={styles.footerButton}
      />
    </View>
  );

  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={onRequestClose}
      closeDisabled={disabled}
      footer={footer}
    >
      <View style={styles.sheetBody}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={16} />
            <Skeleton width="80%" height={16} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <HomePlusIcon name="alert-circle-outline" size={28} color={colors.danger.strong} />
            <AppText variant="body" tone="danger" style={styles.errorText}>
              {error}
            </AppText>
          </View>
        ) : sortedPools.length === 0 ? (
          <EmptyState
            title="Sin pozos disponibles"
            description="No hay pozos activos para este contexto y moneda."
            illustration={<HomePlusIcon name="archive-outline" size={30} color={colors.text.tertiary} />}
          />
        ) : (
          <View style={styles.list} accessibilityLabel="Lista de pozos">
            {allowNone ? (
              <InteractivePressable
                onPress={() => handleChoose(null)}
                disabled={disabled}
                haptic="light"
                pressScale={motion.scale.card}
                style={[styles.poolOption, selectedPoolId === null && styles.poolOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedPoolId === null }}
                accessibilityLabel={noneLabel}
              >
                <HomePlusIcon
                  name={selectedPoolId === null ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedPoolId === null ? colors.terracotta[700] : colors.text.tertiary}
                />
                <AppText variant="body" weight="800">{noneLabel}</AppText>
              </InteractivePressable>
            ) : null}
            {sortedPools.map((pool) => {
              const selected = pool.id === selectedPoolId;
              const isNegative = pool.balance.startsWith('-');
              return (
                <InteractivePressable
                  key={pool.id}
                  onPress={() => handleChoose(pool)}
                  disabled={disabled}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={[styles.poolOption, selected && styles.poolOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${pool.name}, saldo ${formatFinanceAmount(pool.balance, pool.currency, { sign: 'none' })}`}
                >
                  <HomePlusIcon
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.terracotta[700] : colors.text.tertiary}
                  />
                  <View style={[styles.poolInfo, { flex: 1, minWidth: 0 }]}>
                    <AppText variant="body" weight="800" numberOfLines={1} style={styles.poolName}>
                      {pool.name}
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      tone={isNegative ? 'danger' : 'secondary'}
                      weight={isNegative ? '700' : '400'}
                      numberOfLines={1}
                    >
{formatFinanceAmount(pool.balance, pool.currency, { sign: isNegative ? 'none' : 'none' })}
                    </AppText>
                  </View>
                  {isNegative && (
                    <AppText variant="caption" tone="warning" style={styles.negativeHint}>
                      Te excediste de lo reservado
                    </AppText>
                  )}
                </InteractivePressable>
              );
            })}
          </View>
        )}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1,
    paddingBottom: spacing[4],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    gap: spacing[2],
  },
  errorText: {
    textAlign: 'center',
  },
  list: {
    gap: spacing[1],
  },
  poolOption: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  poolOptionSelected: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[300],
  },
  poolInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    minWidth: 0,
  },
  poolName: {
    flex: 1,
    minWidth: 0,
  },
  negativeHint: {
    marginLeft: spacing[2],
  },
  footer: {
    flexDirection: 'row',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerButton: {
    flex: 1,
  },
});