import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  ActionSheet,
  InteractivePressable,
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
  const styles = createStyles(theme);
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
        size="content"
      >
        <View style={styles.content}>
          <View style={styles.identity}>
            <AppText variant="caption" tone="secondary" weight="800">
              {currency}
            </AppText>
          </View>

          <View style={styles.balancePreview}>
            <AppText variant="caption" tone="secondary" weight="700">Saldo actual</AppText>
            <AppText
              variant="title1"
              weight="800"
              tone={isBalanceZero ? 'primary' : isBalanceNegative ? 'danger' : 'success'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {formatFinanceAmount(pool.balance, currency, { sign: isBalanceNegative ? 'net' : 'none' })}
            </AppText>
            <AppText variant="caption" tone="secondary">
              organizado
            </AppText>
          </View>

          <AppButton
            title="Agregar dinero"
            onPress={handleAllocatePress}
            leftSlot={<HomePlusIcon name="add" size={18} color={colors.text.inverse} />}
          />

          <View style={styles.section}>
            <AppText variant="caption" tone="secondary" weight="800">ACTIVIDAD RECIENTE</AppText>
            <AppCard variant="quiet" padding="default">
              <View style={styles.infoRow}>
                <AppText variant="bodySmall" tone="secondary" weight="700">
                  Las operaciones recientes del pozo se reflejan al volver a Organización.
                </AppText>
              </View>
            </AppCard>
          </View>

          <View style={styles.section}>
            <AppText variant="caption" tone="secondary" weight="800">ACCIONES</AppText>
            <AppCard variant="quiet" padding="default">
              <PoolActionRow
                icon="arrow-up-circle-outline"
                label="Liberar dinero"
                detail={canRelease ? 'Pozo a sin asignar' : 'No hay saldo positivo para liberar'}
                onPress={handleReleasePress}
                disabled={!canRelease}
              />
              <PoolActionRow
                icon="swap-horizontal-outline"
                label="Mover dinero"
                detail={canTransfer ? 'Entre pozos' : 'No hay otros pozos activos'}
                onPress={handleTransferPress}
                disabled={!canTransfer}
                withDivider
              />
              <PoolActionRow
                icon="pencil-outline"
                label="Renombrar"
                detail="Cambiar nombre del pozo"
                onPress={handleRenamePress}
                withDivider
              />
              <PoolActionRow
                icon="link-outline"
                label="Pozo sugerido por categoría"
                detail="Configurar sugerencia para nuevos gastos"
                onPress={handleCategoryDefaultPress}
                withDivider
              />
              <PoolActionRow
                icon="archive-outline"
                label="Archivar pozo"
                detail="El historial se conserva"
                onPress={handleArchivePress}
                danger
                withDivider
              />
            </AppCard>
          </View>
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

function PoolActionRow({
  icon,
  label,
  detail,
  onPress,
  disabled = false,
  danger = false,
  withDivider = false,
}: {
  icon: React.ComponentProps<typeof HomePlusIcon>['name'];
  label: string;
  detail: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  withDivider?: boolean;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      pressScale={motion.scale.card}
      style={[styles.actionRow, withDivider && styles.actionRowDivider, danger && styles.actionRowDanger, disabled && styles.actionRowDisabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      <HomePlusIcon name={icon} size={20} color={disabled ? colors.text.tertiary : danger ? colors.danger.strong : colors.text.secondary} />
      <View style={styles.actionCopy}>
        <AppText variant="bodySmall" weight="800" tone={disabled ? 'tertiary' : danger ? 'danger' : 'primary'}>
          {label}
        </AppText>
        <AppText variant="caption" tone={disabled ? 'tertiary' : 'secondary'} numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      {!disabled ? <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} /> : null}
    </InteractivePressable>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[4],
  },
  identity: {
    alignSelf: 'flex-start',
  },
  balancePreview: {
    alignItems: 'flex-start',
    gap: spacing[1],
  },
  section: {
    gap: spacing[2],
  },
  infoRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  actionRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  actionRowDanger: {
    backgroundColor: colors.danger.soft,
    marginHorizontal: -spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  actionRowDisabled: {
    opacity: 0.64,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  });
}
