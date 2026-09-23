import React, { useMemo } from 'react';
import { View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  ActionSheet,
  AppButton,
  AppText,
  Skeleton,
} from '../ui';
import type { FinancePoolDto } from '../../services/finance/financePools';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import {
  FinanceEmptyState,
  FinanceErrorState,
  FinanceGroupedSurface,
  FinanceListRow,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';

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
  const theme = useAppTheme();
  const { colors } = theme;
  const sortedPools = useMemo(
    () => [...pools].sort((a, b) => a.name.localeCompare(b.name)),
    [pools],
  );

  const handleChoose = (pool: FinancePoolDto | null) => {
    if (disabled) return;
    onSelect(pool);
  };

  const footer = (
    <View style={{ flexDirection: 'row', gap: financeSpacing.footerGap }}>
      <View style={{ flex: 1 }}>
        <AppButton
          title="Cancelar"
          variant="ghost"
          onPress={onRequestClose}
          disabled={disabled}
        />
      </View>
    </View>
  );

  const renderRadioIcon = (selected: boolean) => (
    <HomePlusIcon
      name={selected ? 'radio-button-on' : 'radio-button-off'}
      size={20}
      color={selected ? colors.terracotta[700] : colors.text.tertiary}
    />
  );

  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={onRequestClose}
      closeDisabled={disabled}
      size={FINANCE_SHEET_SIZE_POLICY.PICKER_CATALOG}
      footer={footer}
    >
      <View style={{ flex: 1, minHeight: 0, paddingBottom: financeSpacing.contentActionGap }}>
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: financeSpacing.sectionGap, gap: financeSpacing.titleContentGap }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={16} />
            <Skeleton width="80%" height={16} />
          </View>
        ) : error ? (
          <FinanceErrorState level="full" message={error} />
        ) : sortedPools.length === 0 && !allowNone ? (
          <FinanceEmptyState
            level="section"
            title="Sin pozos disponibles"
            description="No hay pozos activos para este contexto y moneda."
            icon={<HomePlusIcon name="archive-outline" size={20} color={colors.text.tertiary} />}
          />
        ) : (
          <FinanceGroupedSurface>
            {allowNone ? (
              <FinanceListRow
                title={noneLabel}
                icon={renderRadioIcon(selectedPoolId === null)}
                onPress={() => handleChoose(null)}
                disabled={disabled}
                accessibilityLabel={`${noneLabel}${selectedPoolId === null ? ', seleccionado' : ''}`}
              />
            ) : null}
            {sortedPools.map((pool, index) => {
              const selected = pool.id === selectedPoolId;
              const isNegative = pool.balance.startsWith('-');
              const isLast = index === sortedPools.length - 1;
              return (
                <FinanceListRow
                  key={pool.id}
                  title={pool.name}
                  subtitle={isNegative ? 'Te excediste de lo reservado' : undefined}
                  value={formatFinanceAmount(pool.balance, pool.currency, { sign: 'none' })}
                  valueTone={isNegative ? 'danger' : 'secondary'}
                  icon={renderRadioIcon(selected)}
                  onPress={() => handleChoose(pool)}
                  disabled={disabled}
                  divider={!isLast}
                  accessibilityLabel={`${pool.name}, saldo ${formatFinanceAmount(pool.balance, pool.currency, { sign: 'none' })}${selected ? ', seleccionado' : ''}`}
                />
              );
            })}
          </FinanceGroupedSurface>
        )}
        {sortedPools.length === 0 && allowNone ? (
          <AppText variant="caption" tone="tertiary" align="center" style={{ paddingTop: financeSpacing.titleContentGap }}>
            No hay pozos activos para este contexto y moneda.
          </AppText>
        ) : null}
      </View>
    </ActionSheet>
  );
}
