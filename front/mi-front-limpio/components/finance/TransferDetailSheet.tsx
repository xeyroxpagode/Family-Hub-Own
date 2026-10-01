/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import { formatFinanceDateGroupLabel } from '../../services/finance/financePeriod';
import type { FinanceTransferDetailDto } from '../../services/finance/financeMovements';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  ActionSheet,
  AppText,
  Skeleton,
} from '../ui';
import {
  FinanceDetailHeader,
  FinanceDetailMetaRow,
  FinanceErrorState,
  FinanceFormFooter,
  FinanceIconBox,
  FinanceListRow,
  FinanceSemanticSurface,
} from './ui';

type TransferDetailSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  transferId: string | null;
  refreshNonce?: number;
  personId: string | null;
  householdId: string | null;
  onRequestClose: () => void;
  onTrashSuccess: () => void;
};

type TransferLifecycleStep = 'detail' | 'confirmTrash';

export function TransferDetailSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  transferId,
  refreshNonce = 0,
  personId,
  householdId,
  onRequestClose,
  onTrashSuccess,
}: TransferDetailSheetProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceTransferDetailDto | null>(null);
  const [lifecycleStep, setLifecycleStep] = useState<TransferLifecycleStep>('detail');
  const [trashSubmitting, setTrashSubmitting] = useState(false);
  const [trashError, setTrashError] = useState<string | null>(null);
  const transferIdRef = useRef(transferId);

  useEffect(() => {
    transferIdRef.current = transferId;
  }, [transferId]);

  const loadDetail = async () => {
    if (!accessToken || !transferIdRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const { getFinanceTransferDetail } = await import('../../services/finance/financeMovements');
      const next = await getFinanceTransferDetail({
        accessToken,
        contextType,
        transferId: transferIdRef.current,
      });
      setDetail(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos cargar la transferencia';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && transferId) {
      loadDetail();
    } else {
      setDetail(null);
      setLoading(true);
      setError(null);
      setLifecycleStep('detail');
      setTrashSubmitting(false);
      setTrashError(null);
    }
  }, [visible, transferId, accessToken, contextType, refreshNonce]);

  const close = () => {
    if (loading || trashSubmitting) return;
    if (lifecycleStep !== 'detail') {
      setLifecycleStep('detail');
      setTrashError(null);
      return;
    }
    onRequestClose();
  };

  const handleConfirmTrash = async () => {
    if (!accessToken || !personId || !transferIdRef.current || trashSubmitting) return;
    setTrashSubmitting(true);
    setTrashError(null);
    try {
      const { trashFinanceTransfer } = await import('../../services/finance/financeMovements');
      await trashFinanceTransfer({
        accessToken,
        contextType,
        personId,
        householdId,
        transferId: transferIdRef.current,
      });
      onTrashSuccess();
    } catch (err) {
      setTrashError(err instanceof ApiError ? err.message : 'No pudimos enviar la transferencia a Papelera. Intenta de nuevo.');
    } finally {
      setTrashSubmitting(false);
    }
  };

  const isCardPayment = detail?.destinationAccount.accountType === 'CREDIT_CARD';

  if (!visible) return null;

  const isCrossCurrency = detail !== null && detail.sourceCurrency !== detail.destinationCurrency;
  const headerAmount = detail
    ? (isCrossCurrency
      ? `${formatFinanceAmount(detail.sourceAmount, detail.sourceCurrency, { sign: 'none' })} → ${formatFinanceAmount(detail.destinationAmount, detail.destinationCurrency, { sign: 'none' })}`
      : formatFinanceAmount(detail.sourceAmount, detail.sourceCurrency, { sign: 'none' }))
    : undefined;
  const headerSubtitle = detail
    ? `${detail.sourceAccount.name} → ${detail.destinationAccount.name}`
    : undefined;

  return (
    <ActionSheet
      visible={visible}
      title={lifecycleStep === 'confirmTrash' ? '¿Enviar a Papelera?' : isCardPayment ? 'Pago de tarjeta' : 'Transferencia'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={loading || trashSubmitting}
      size="content"
      footer={lifecycleStep === 'confirmTrash' ? (
        <FinanceFormFooter
          primaryTitle="Enviar a Papelera"
          onPrimary={handleConfirmTrash}
          onCancel={close}
          primaryDisabled={trashSubmitting}
          loading={trashSubmitting}
          destructive
          divided={false}
        />
      ) : undefined}
    >
      <>
        {loading ? (
          <View style={styles.loading}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="40%" height={14} />
          </View>
        ) : error ? (
          <FinanceErrorState level="full" message={error} onRetry={loadDetail} />
        ) : detail && lifecycleStep === 'detail' ? (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <FinanceDetailHeader
              title={isCardPayment ? 'Pago de tarjeta' : 'Transferencia'}
              subtitle={headerSubtitle}
              amount={headerAmount}
              icon={
                <HomePlusIcon name="swap-horizontal-outline" size={18} color={colors.text.tertiary} />
              }
            />

            <FinanceDetailMetaRow
              label="Fecha"
              value={formatFinanceDateGroupLabel(detail.date)}
            />

            {detail.description ? (
              <FinanceDetailMetaRow label="Descripción" value={detail.description} />
            ) : null}

            {detail.notes ? (
              <FinanceDetailMetaRow label="Notas" value={detail.notes} />
            ) : null}

            <View style={styles.sectionDivider} />

            <AppText variant="caption" tone="secondary" weight="700">
              Desde
            </AppText>
            <FinanceListRow
              title={detail.sourceAccount.name}
              subtitle={detail.sourceAccount.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'}
              value={formatFinanceAmount(detail.sourceAmount, detail.sourceCurrency, { sign: 'none' })}
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="arrow-up-outline" size={18} color={colors.text.tertiary} />
                </FinanceIconBox>
              }
              divider={false}
            />

            <View style={styles.arrowRow}>
              <HomePlusIcon name="arrow-down-outline" size={20} color={colors.text.tertiary} />
            </View>

            <AppText variant="caption" tone="secondary" weight="700">
              Hacia
            </AppText>
            <FinanceListRow
              title={detail.destinationAccount.name}
              subtitle={detail.destinationAccount.accountType === 'CREDIT_CARD' ? 'Tarjeta de crédito' : 'Cuenta'}
              value={formatFinanceAmount(detail.destinationAmount, detail.destinationCurrency, { sign: 'none' })}
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="arrow-down-outline" size={18} color={colors.text.tertiary} />
                </FinanceIconBox>
              }
              divider={false}
            />

            {detail.commission && detail.commission.amount && (
              <FinanceSemanticSurface tone="warning" testID="finance-transfer-commission">
                <View style={styles.commissionRow}>
                  <View style={styles.commissionInfo}>
                    <AppText variant="caption" tone="secondary" weight="700">
                      Comisión
                    </AppText>
                  </View>
                  <AppText variant="body" weight="800" tone="danger">
                    {formatFinanceAmount(detail.commission.amount, detail.commission.currency ?? detail.sourceCurrency, { sign: 'none' })}
                  </AppText>
                </View>
              </FinanceSemanticSurface>
            )}

            <View style={styles.sectionDivider} />

            <FinanceListRow
              title="Enviar a Papelera"
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="trash-outline" size={18} color={colors.danger.strong} />
                </FinanceIconBox>
              }
              chevron
              divider={false}
              onPress={() => setLifecycleStep('confirmTrash')}
              accessibilityLabel="Enviar transferencia a Papelera"
            />
          </ScrollView>
        ) : detail ? (
          <View style={styles.confirmView}>
            <AppText variant="bodySmall" tone="secondary" style={styles.confirmMessage}>
              Esta transferencia dejará de afectar tus finanzas.
            </AppText>
            {trashError ? (
              <FinanceErrorState level="form" message={trashError} />
            ) : null}
          </View>
        ) : null}
      </>
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;

  return StyleSheet.create({
    loading: {
      padding: spacing[6],
      alignItems: 'center',
      gap: spacing[2],
    },
    content: {
      gap: spacing[3],
      paddingBottom: spacing[2],
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border.subtle,
      marginVertical: spacing[1],
    },
    arrowRow: {
      alignItems: 'center',
      paddingVertical: spacing[1],
    },
    commissionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
    },
    commissionInfo: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    confirmView: {
      gap: spacing[3],
      alignItems: 'center',
    },
    confirmMessage: {
      textAlign: 'center',
      marginTop: spacing[1],
    },
  });
}
