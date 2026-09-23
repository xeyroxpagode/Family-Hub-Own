/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError, generateMutationId, createIdempotencyKey } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceTrashMovementDto } from '../../services/finance/financeMovements';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  ActionSheet,
  AppText,
} from '../ui';
import {
  FinanceDetailHeader,
  FinanceDetailMetaRow,
  FinanceErrorState,
  FinanceFormFooter,
  FinanceIconBox,
  FinanceListRow,
} from './ui';
import { getFinanceCategoryPresentationByLabel } from '../../services/finance/financeCategories';

type TrashMovementDetailSheetProps = {
  visible: boolean;
  movement: FinanceTrashMovementDto | null;
  contextType: FinanceContextType;
  contextLabel: string;
  accessToken: string | null;
  personId: string | null;
  householdId: string | null;
  onRequestClose: () => void;
  onRestoreSuccess: () => void;
};

type RestoreFlowStep = 'detail' | 'confirm';

export function TrashMovementDetailSheet({
  visible,
  movement,
  contextType,
  contextLabel,
  accessToken,
  personId,
  householdId,
  onRequestClose,
  onRestoreSuccess,
}: TrashMovementDetailSheetProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const [step, setStep] = useState<RestoreFlowStep>('detail');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreMutationId, setRestoreMutationId] = useState<string | null>(null);
  const [restoreIdempotencyKey, setRestoreIdempotencyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep('detail');
      setError(null);
      setSubmitting(false);
      setRestoreMutationId(null);
      setRestoreIdempotencyKey(null);
    }
  }, [visible]);

  useEffect(() => {
    if (step === 'confirm' && !restoreMutationId) {
      setRestoreMutationId(generateMutationId());
      setRestoreIdempotencyKey(createIdempotencyKey(
        movement?.kind === 'TRANSFER' ? 'finance.transfer.restore' : 'finance.transaction.restore',
      ));
    }
    if (step !== 'confirm') {
      setRestoreMutationId(null);
      setRestoreIdempotencyKey(null);
    }
  }, [movement?.kind, step, restoreMutationId]);

  const close = () => {
    if (submitting) return;
    if (step !== 'detail') {
      setStep('detail');
      setError(null);
      return;
    }
    onRequestClose();
  };

  const handleRestore = () => {
    setStep('confirm');
  };

  const handleConfirmRestore = async () => {
    if (!movement || !accessToken || !personId || submitting || !restoreMutationId || !restoreIdempotencyKey) return;

    setSubmitting(true);
    setError(null);

    try {
      if (movement.kind === 'TRANSFER') {
        const { restoreFinanceTransfer } = await import('../../services/finance/financeMovements');
        await restoreFinanceTransfer({
          accessToken,
          contextType,
          personId,
          householdId,
          transferId: movement.id,
        });
        onRestoreSuccess();
        close();
        return;
      }
      const { restoreFinanceTransaction } = await import('../../services/finance/financeMovements');
      await restoreFinanceTransaction({
        accessToken,
        contextType,
        personId,
        householdId,
        transactionId: movement.id,
        mutationId: restoreMutationId,
        idempotencyKey: restoreIdempotencyKey,
      });
      onRestoreSuccess();
      close();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'finance_transaction_dependent_on_transfer') {
          setError('No se puede restaurar una comisión generada por una Transferencia. La comisión pertenece a su Transferencia propietaria.');
        } else if (err.code === 'invalid_transaction_state_for_restore') {
          setError('La transacción no está en estado TRASHED.');
        } else if (err.code === 'finance_transaction_not_found') {
          setError('Transacción no encontrada.');
        } else if (err.code === 'idempotency_conflict') {
          setError('La operación ya fue procesada con otros datos.');
        } else if (err.code === 'idempotency_in_flight') {
          setError('La operación ya se está procesando. Reintentá en unos segundos.');
        } else {
          setError(err.message);
        }
      } else {
        setError('No pudimos restaurar el movimiento. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !movement) return null;

  const isTransfer = movement.kind === 'TRANSFER';
  if (isTransfer) {
    const isCrossCurrency = movement.sourceCurrency !== movement.destinationCurrency;
    const headerAmount = isCrossCurrency
      ? `${formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' })} → ${formatFinanceAmount(movement.destinationAmount, movement.destinationCurrency, { sign: 'none' })}`
      : formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' });
    return (
      <ActionSheet
        visible={visible}
        title={step === 'confirm' ? '¿Restaurar transferencia?' : 'Transferencia'}
        subtitle={`Finanzas de ${contextLabel}`}
        onRequestClose={close}
        closeDisabled={submitting}
        size="content"
        footer={step === 'confirm' ? (
          <FinanceFormFooter
            primaryTitle="Restaurar"
            onPrimary={handleConfirmRestore}
            onCancel={() => setStep('detail')}
            primaryDisabled={submitting}
            loading={submitting}
            divided={false}
          />
        ) : undefined}
      >
        <View style={styles.content}>
          {step === 'detail' ? (
            <View style={styles.detailView}>
              <FinanceDetailHeader
                title="Transferencia"
                subtitle={`${movement.sourceAccount.name} → ${movement.destinationAccount.name}`}
                amount={headerAmount}
                icon={<HomePlusIcon name="swap-horizontal-outline" size={18} color={colors.text.tertiary} />}
              />
              <FinanceDetailMetaRow label="Desde" value={movement.sourceAccount.name} />
              <FinanceDetailMetaRow label="Hacia" value={movement.destinationAccount.name} />
              {isCrossCurrency ? (
                <>
                  <FinanceDetailMetaRow label="Monto" value={formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' })} />
                  <FinanceDetailMetaRow label="Llega" value={formatFinanceAmount(movement.destinationAmount, movement.destinationCurrency, { sign: 'none' })} />
                </>
              ) : (
                <FinanceDetailMetaRow label="Monto" value={formatFinanceAmount(movement.sourceAmount, movement.sourceCurrency, { sign: 'none' })} />
              )}
              {movement.commission?.amount ? (
                <FinanceDetailMetaRow
                  label="Comisión"
                  value={formatFinanceAmount(movement.commission.amount, movement.commission.currency ?? movement.sourceCurrency, { sign: 'none' })}
                />
              ) : null}
              <FinanceDetailMetaRow
                label="Fecha"
                value={new Date(`${movement.date}T00:00:00`).toLocaleDateString('es-AR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              />
              {movement.description ? <FinanceDetailMetaRow label="Descripción" value={movement.description} /> : null}
              {movement.trashedAt ? (
                <FinanceDetailMetaRow label="Enviado a Papelera" value={new Date(movement.trashedAt).toLocaleString('es-AR')} />
              ) : null}
              <View style={styles.divider} />
              <FinanceListRow
                title="Restaurar transferencia"
                icon={<FinanceIconBox><HomePlusIcon name="refresh-outline" size={18} color={colors.success.strong} /></FinanceIconBox>}
                chevron
                divider={false}
                onPress={submitting ? undefined : handleRestore}
                disabled={submitting}
                accessibilityLabel="Restaurar transferencia"
              />
            </View>
          ) : (
            <View style={styles.confirmView}>
              <AppText variant="bodySmall" tone="secondary" style={styles.confirmMessage}>
                La transferencia volverá a afectar tus finanzas.
              </AppText>
              {error ? <FinanceErrorState level="form" message={error} /> : null}
            </View>
          )}
        </View>
      </ActionSheet>
    );
  }

  const isExpense = movement.transactionType === 'expense';
  const typeLabel = isExpense ? 'Gasto' : 'Ingreso';
  const categoryPresentation = getFinanceCategoryPresentationByLabel(movement.categoryLabelSnapshot);
  const categoryToneColor =
    categoryPresentation.tone === 'terracotta' ? colors.terracotta[600]
    : categoryPresentation.tone === 'sage' ? colors.sage[600]
    : categoryPresentation.tone === 'sand' ? colors.sand[600]
    : categoryPresentation.tone === 'info' ? colors.info.text
    : colors.text.tertiary;

  return (
    <ActionSheet
      visible={visible}
      title={step === 'confirm' ? '¿Restaurar movimiento?' : 'Detalle del movimiento'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={step === 'confirm' ? (
        <FinanceFormFooter
          primaryTitle="Restaurar"
          onPrimary={handleConfirmRestore}
          onCancel={() => setStep('detail')}
          primaryDisabled={submitting}
          loading={submitting}
          divided={false}
        />
      ) : undefined}
    >
      <View style={styles.content}>
        {step === 'detail' && (
          <View style={styles.detailView}>
            <FinanceDetailHeader
              title={typeLabel}
              subtitle={movement.categoryLabelSnapshot ?? undefined}
              amount={formatFinanceAmount(movement.amount, movement.currency, {
                sign: 'transaction',
                transactionType: movement.transactionType,
              })}
              amountTone={isExpense ? 'danger' : 'success'}
              icon={
                <HomePlusIcon
                  name={categoryPresentation.iconKey}
                  size={18}
                  color={categoryToneColor}
                />
              }
            />

            {movement.description ? (
              <FinanceDetailMetaRow label="Descripción" value={movement.description} />
            ) : null}

            {movement.categoryLabelSnapshot ? (
              <FinanceDetailMetaRow label="Categoría" value={movement.categoryLabelSnapshot} />
            ) : null}

            <FinanceDetailMetaRow
              label="Fecha"
              value={new Date(movement.transactionDate).toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            />

            {movement.trashedAt && (
              <FinanceDetailMetaRow
                label="Enviado a Papelera"
                value={new Date(movement.trashedAt).toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
            )}

            <View style={styles.divider} />

            <FinanceListRow
              title="Restaurar movimiento"
              icon={
                <FinanceIconBox>
                  <HomePlusIcon name="refresh-outline" size={18} color={colors.success.strong} />
                </FinanceIconBox>
              }
              chevron
              divider={false}
              onPress={submitting ? undefined : handleRestore}
              disabled={submitting}
              accessibilityLabel="Restaurar movimiento"
            />
          </View>
        )}

        {step === 'confirm' && (
          <View style={styles.confirmView}>
            <AppText variant="bodySmall" tone="secondary" style={styles.confirmMessage}>
              El movimiento volverá a afectar tus finanzas.
            </AppText>

            {error ? (
              <FinanceErrorState level="form" message={error} />
            ) : null}
          </View>
        )}
      </View>
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, spacing } = theme;

  return StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[2],
  },
  detailView: {
    gap: spacing[3],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[1],
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
