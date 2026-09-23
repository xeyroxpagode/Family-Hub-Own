import React, { useState } from 'react';
import { View } from 'react-native';

import {
  AppButton,
  ActionSheet,
} from '../ui';
import { useAppTheme } from '../../context/AppThemeContext';
import { HomePlusIcon } from '../../constants/icons';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import {
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { AllocatePoolSheet } from './AllocatePoolSheet';
import { ReleasePoolSheet } from './ReleasePoolSheet';
import { RenamePoolSheet } from './RenamePoolSheet';
import { ArchivePoolSheet } from './ArchivePoolSheet';
import { TransferBetweenPoolsSheet } from './TransferBetweenPoolsSheet';
import { CategoryPoolDefaultSheet } from './CategoryPoolDefaultSheet';
import {
  FINANCE_ACTION_ICON_SIZE,
  FinanceDetailHeader,
  FinanceDetailSection,
  FinanceGroupedSurface,
  FinanceIconBox,
  FinanceListRow,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';

type PoolDetailSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  pool: FinancePoolDto | null;
  pools: FinancePoolDto[];
  unassignedKnown: string;
  onRequestClose: () => void;
  onSuccess: () => void;
  onArchiveSuccess: () => void;
};

export function PoolDetailSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  pool,
  pools,
  unassignedKnown,
  onRequestClose,
  onSuccess,
  onArchiveSuccess,
}: PoolDetailSheetProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const [allocateVisible, setAllocateVisible] = useState(false);
  const [releaseVisible, setReleaseVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);
  const [categoryDefaultVisible, setCategoryDefaultVisible] = useState(false);

  React.useEffect(() => {
    if (visible) return;
    void Promise.resolve().then(() => {
      setAllocateVisible(false);
      setReleaseVisible(false);
      setRenameVisible(false);
      setArchiveVisible(false);
      setTransferVisible(false);
      setCategoryDefaultVisible(false);
    });
  }, [visible]);

  if (!visible || !pool) return null;

  const handleAllocatePress = () => {
    setAllocateVisible(true);
  };

  const handleReleasePress = () => {
    setReleaseVisible(true);
  };

  const handleRenamePress = () => {
    setRenameVisible(true);
  };

  const handleArchivePress = () => {
    setArchiveVisible(true);
  };

  const handleTransferPress = () => {
    setTransferVisible(true);
  };

  const handleCategoryDefaultPress = () => {
    setCategoryDefaultVisible(true);
  };

  const handleActionSheetClose = () => {
    setAllocateVisible(false);
    setReleaseVisible(false);
    setRenameVisible(false);
    setArchiveVisible(false);
    setTransferVisible(false);
    setCategoryDefaultVisible(false);
    onRequestClose();
  };

  const handleAllocateClose = () => {
    setAllocateVisible(false);
  };

  const handleReleaseClose = () => {
    setReleaseVisible(false);
  };

  const handleRenameClose = () => {
    setRenameVisible(false);
  };

  const handleArchiveClose = () => {
    setArchiveVisible(false);
  };

  const handleTransferClose = () => {
    setTransferVisible(false);
  };

  const handleCategoryDefaultClose = () => {
    setCategoryDefaultVisible(false);
  };

  const handleCategoryDefaultSuccess = () => {
    setCategoryDefaultVisible(false);
    onSuccess();
  };

  const handleAllocateSuccess = () => {
    setAllocateVisible(false);
    onSuccess();
  };

  const handleReleaseSuccess = () => {
    setReleaseVisible(false);
    onSuccess();
  };

  const handleRenameSuccess = () => {
    setRenameVisible(false);
    onSuccess();
  };

  const handleArchiveSuccess = () => {
    setArchiveVisible(false);
    onArchiveSuccess();
    onRequestClose();
  };

  const handleTransferSuccess = () => {
    setTransferVisible(false);
    onSuccess();
  };

  const isBalanceNegative = pool.balance.startsWith('-');
  const isBalanceZero = isZeroDecimalString(pool.balance);
  const canRelease = !isBalanceNegative && !isBalanceZero;
  const canTransfer = pools.filter((p) => p.status === 'ACTIVE' && p.id !== pool.id).length > 0;
  const nestedSheetVisible = allocateVisible || releaseVisible || renameVisible || archiveVisible || transferVisible || categoryDefaultVisible;

  return (
    <>
      <ActionSheet
        visible={!nestedSheetVisible}
        title={pool.name}
        subtitle={`Pozo · ${contextLabel}`}
        onRequestClose={handleActionSheetClose}
        size={FINANCE_SHEET_SIZE_POLICY.DETAIL}
      >
        <View style={{ gap: financeSpacing.sectionGap, paddingBottom: financeSpacing.contentActionGap }}>
          <FinanceDetailHeader
            title={pool.name}
            subtitle={`Pozo · ${contextLabel} · ${currency}`}
            amount={formatFinanceAmount(pool.balance, currency, { sign: isBalanceNegative ? 'net' : 'none' })}
            amountTone={isBalanceZero ? 'primary' : isBalanceNegative ? 'danger' : 'success'}
            supporting="Saldo actual"
            icon={
              <HomePlusIcon name="wallet-outline" size={FINANCE_ACTION_ICON_SIZE} color={colors.text.secondary} />
            }
          />

          <AppButton
            title="Agregar dinero"
            onPress={handleAllocatePress}
            leftSlot={<HomePlusIcon name="add" size={18} color={colors.text.inverse} />}
          />

          <FinanceGroupedSurface title="Acciones">
            <FinanceListRow
              title="Liberar dinero"
              subtitle={canRelease ? 'Pozo a sin asignar' : 'No hay saldo positivo para liberar'}
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="arrow-up-circle-outline" size={FINANCE_ACTION_ICON_SIZE} color={colors.text.secondary} />
                </FinanceIconBox>
              }
              chevron={canRelease}
              onPress={handleReleasePress}
              disabled={!canRelease}
            />
            <FinanceListRow
              title="Mover dinero"
              subtitle={canTransfer ? 'Entre pozos' : 'No hay otros pozos activos'}
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="swap-horizontal-outline" size={FINANCE_ACTION_ICON_SIZE} color={colors.text.secondary} />
                </FinanceIconBox>
              }
              chevron={canTransfer}
              onPress={handleTransferPress}
              disabled={!canTransfer}
            />
            <FinanceListRow
              title="Renombrar"
              subtitle="Cambiar nombre del pozo"
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="pencil-outline" size={FINANCE_ACTION_ICON_SIZE} color={colors.text.secondary} />
                </FinanceIconBox>
              }
              chevron
              onPress={handleRenamePress}
            />
            <FinanceListRow
              title="Pozo sugerido por categoría"
              subtitle="Configurar sugerencia para nuevos gastos"
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="link-outline" size={FINANCE_ACTION_ICON_SIZE} color={colors.text.secondary} />
                </FinanceIconBox>
              }
              chevron
              onPress={handleCategoryDefaultPress}
              divider={false}
            />
          </FinanceGroupedSurface>

          <FinanceDetailSection title="Ciclo de vida">
            <AppButton
              title="Archivar pozo"
              variant="danger"
              onPress={handleArchivePress}
              leftSlot={<HomePlusIcon name="archive-outline" size={18} color={colors.text.inverse} />}
            />
          </FinanceDetailSection>
        </View>
      </ActionSheet>

      <AllocatePoolSheet
        visible={allocateVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pool={pool}
        unassignedKnown={unassignedKnown}
        onRequestClose={handleAllocateClose}
        onSuccess={handleAllocateSuccess}
      />

      <ReleasePoolSheet
        visible={releaseVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pool={pool}
        onRequestClose={handleReleaseClose}
        onSuccess={handleReleaseSuccess}
      />

      <RenamePoolSheet
        visible={renameVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pool={pool}
        onRequestClose={handleRenameClose}
        onSuccess={handleRenameSuccess}
      />

      <ArchivePoolSheet
        visible={archiveVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pool={pool}
        onRequestClose={handleArchiveClose}
        onSuccess={handleArchiveSuccess}
      />

      <TransferBetweenPoolsSheet
        visible={transferVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pools={pools}
        preselectedSourceId={pool.id}
        onRequestClose={handleTransferClose}
        onSuccess={handleTransferSuccess}
      />

      <CategoryPoolDefaultSheet
        visible={categoryDefaultVisible}
        accessToken={accessToken}
        contextType={contextType}
        contextLabel={contextLabel}
        currency={currency}
        pool={pool}
        pools={pools}
        onRequestClose={handleCategoryDefaultClose}
        onSuccess={handleCategoryDefaultSuccess}
      />
    </>
  );
}
