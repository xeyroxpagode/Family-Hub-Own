import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing } from '../../constants/theme';
import { ApiError, generateMutationId, createIdempotencyKey } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceTrashMovementDto } from '../../services/finance/financeMovements';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  ActionSheet,
  AppButton,
  AppText,
  InteractivePressable,
} from '../ui';

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
      setRestoreIdempotencyKey(createIdempotencyKey('finance.transaction.restore'));
    }
    if (step !== 'confirm') {
      setRestoreMutationId(null);
      setRestoreIdempotencyKey(null);
    }
  }, [step, restoreMutationId]);

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

  const isExpense = movement.transactionType === 'expense';

  return (
    <ActionSheet
      visible={visible}
      title="Detalle del movimiento"
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
    >
      <View style={styles.content}>
        {step === 'detail' && (
          <View style={styles.detailView}>
            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700">
                Tipo
              </AppText>
              <AppText variant="body" weight="800">
                {isExpense ? 'Gasto' : 'Ingreso'}
              </AppText>
            </View>

            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700">
                Monto
              </AppText>
              <AppText variant="title2" weight="800" tone={isExpense ? 'danger' : 'success'}>
                {formatFinanceAmount(movement.amount, movement.currency, {
                  sign: 'transaction',
                  transactionType: movement.transactionType,
                })}
              </AppText>
            </View>

            {movement.description ? (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Descripción
                </AppText>
                <AppText variant="body" numberOfLines={2}>{movement.description}</AppText>
              </View>
            ) : null}

            {movement.categoryLabelSnapshot ? (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Categoría
                </AppText>
                <AppText variant="body" numberOfLines={1}>{movement.categoryLabelSnapshot}</AppText>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <AppText variant="caption" tone="secondary" weight="700">
                Fecha
              </AppText>
              <AppText variant="body" numberOfLines={1}>
                {new Date(movement.transactionDate).toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </AppText>
            </View>

            {movement.trashedAt && (
              <View style={styles.detailRow}>
                <AppText variant="caption" tone="secondary" weight="700">
                  Enviado a Papelera
                </AppText>
                <AppText variant="body" numberOfLines={1}>
                  {new Date(movement.trashedAt).toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </AppText>
              </View>
            )}

            <View style={styles.divider} />

            <InteractivePressable
              onPress={handleRestore}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.restoreEntry}
              accessibilityRole="button"
              accessibilityLabel="Restaurar movimiento"
            >
              <HomePlusIcon name="refresh-outline" size={20} color={colors.success.strong} />
              <AppText variant="body" weight="800" style={{ flex: 1 }}>
                Restaurar movimiento
              </AppText>
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
          </View>
        )}

        {step === 'confirm' && (
          <View style={styles.confirmView}>
            <AppText variant="body" style={styles.confirmTitle}>
              ¿Restaurar movimiento?
            </AppText>
            <AppText variant="bodySmall" tone="secondary" style={styles.confirmMessage}>
              El movimiento volverá a afectar tus finanzas.
            </AppText>

            {error ? (
              <View style={styles.errorBox}>
                <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
                <AppText variant="bodySmall" tone="danger" style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}

            <View style={styles.confirmActions}>
              <AppButton
                variant="ghost"
                title="Cancelar"
                onPress={() => setStep('detail')}
                disabled={submitting}
                style={styles.confirmButton}
              />
              <AppButton
                variant="primary"
                title="Restaurar"
                onPress={handleConfirmRestore}
                loading={submitting}
                disabled={submitting}
                style={styles.confirmButton}
              />
            </View>
          </View>
        )}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[2],
  },
  detailView: {
    gap: spacing[3],
  },
  detailRow: {
    gap: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing[1],
  },
  restoreEntry: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success.base,
    backgroundColor: colors.success.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  confirmView: {
    gap: spacing[3],
    alignItems: 'center',
  },
  confirmTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  confirmMessage: {
    textAlign: 'center',
    marginTop: spacing[1],
  },
  errorBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-start',
    width: '100%',
  },
  errorText: {
    flex: 1,
    minWidth: 0,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing[2],
    width: '100%',
    marginTop: spacing[2],
  },
  confirmButton: {
    flex: 1,
  },
});