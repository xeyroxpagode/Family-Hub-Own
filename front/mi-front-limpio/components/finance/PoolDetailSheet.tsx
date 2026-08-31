import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  ActionSheet,
  InteractivePressable,
} from '../ui';
import { colors, motion, radius, spacing } from '../../constants/theme';
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
  const [allocateVisible, setAllocateVisible] = useState(false);
  const [releaseVisible, setReleaseVisible] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);

  React.useEffect(() => {
    if (visible) return;
    setAllocateVisible(false);
    setReleaseVisible(false);
    setRenameVisible(false);
    setArchiveVisible(false);
    setTransferVisible(false);
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

  const handleActionSheetClose = () => {
    setAllocateVisible(false);
    setReleaseVisible(false);
    setRenameVisible(false);
    setArchiveVisible(false);
    setTransferVisible(false);
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
  const nestedSheetVisible = allocateVisible || releaseVisible || renameVisible || archiveVisible || transferVisible;

  return (
    <>
      <ActionSheet
        visible={!nestedSheetVisible}
        title={pool.name}
        onRequestClose={handleActionSheetClose}
        size="content"
      >
        <View style={styles.actionContent}>
          <View style={styles.balancePreview}>
            <AppText variant="caption" tone="secondary" weight="700">Saldo actual</AppText>
            <AppText
              variant="title2"
              weight="800"
              tone={isBalanceZero ? 'primary' : isBalanceNegative ? 'danger' : 'success'}
            >
              {formatFinanceAmount(pool.balance, currency, { sign: isBalanceNegative ? 'net' : 'none' })}
            </AppText>
          </View>

          <InteractivePressable
            onPress={handleAllocatePress}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.actionItem}
            accessibilityRole="button"
          >
            <HomePlusIcon name="arrow-down-circle-outline" size={24} color={colors.terracotta[700]} />
            <AppText variant="body" weight="700">Agregar dinero</AppText>
            <AppText variant="caption" tone="secondary">Sin asignar → Pozo</AppText>
          </InteractivePressable>

          {canRelease && (
            <InteractivePressable
              onPress={handleReleasePress}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.actionItem}
              accessibilityRole="button"
            >
              <HomePlusIcon name="arrow-up-circle-outline" size={24} color={colors.success.strong} />
              <AppText variant="body" weight="700">Liberar dinero</AppText>
              <AppText variant="caption" tone="secondary">Pozo → Sin asignar</AppText>
            </InteractivePressable>
          )}

          {!canRelease && (
            <View style={styles.disabledAction}>
              <HomePlusIcon name="arrow-up-circle-outline" size={24} color={colors.text.tertiary} />
              <AppText variant="body" weight="700" tone="tertiary">Liberar dinero</AppText>
              <AppText variant="caption" tone="tertiary">No hay saldo positivo para liberar</AppText>
            </View>
          )}

          {canTransfer && (
            <InteractivePressable
              onPress={handleTransferPress}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.actionItem}
              accessibilityRole="button"
            >
              <HomePlusIcon name="swap-horizontal-outline" size={24} color={colors.info.text} />
              <AppText variant="body" weight="700">Mover dinero</AppText>
              <AppText variant="caption" tone="secondary">Pozo → Pozo</AppText>
            </InteractivePressable>
          )}

          {!canTransfer && (
            <View style={styles.disabledAction}>
              <HomePlusIcon name="swap-horizontal-outline" size={24} color={colors.text.tertiary} />
              <AppText variant="body" weight="700" tone="tertiary">Mover dinero</AppText>
              <AppText variant="caption" tone="tertiary">No hay otros pozos activos</AppText>
            </View>
          )}

          <InteractivePressable
            onPress={handleRenamePress}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.actionItem}
            accessibilityRole="button"
          >
            <HomePlusIcon name="pencil-outline" size={24} color={colors.text.secondary} />
            <AppText variant="body" weight="700">Renombrar</AppText>
            <AppText variant="caption" tone="secondary">Cambiar nombre del pozo</AppText>
          </InteractivePressable>

          <InteractivePressable
            onPress={handleArchivePress}
            haptic="light"
            pressScale={motion.scale.card}
            style={[styles.actionItem, styles.archiveAction]}
            accessibilityRole="button"
          >
            <HomePlusIcon name="archive-outline" size={24} color={colors.danger.strong} />
            <AppText variant="body" weight="700" tone="danger">Archivar pozo</AppText>
            <AppText variant="caption" tone="secondary">El historial se conserva</AppText>
          </InteractivePressable>
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
    </>
  );
}

const styles = StyleSheet.create({
  actionContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  balancePreview: {
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  disabledAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  archiveAction: {
    borderColor: colors.danger.soft,
    backgroundColor: colors.danger.soft,
  },
});
