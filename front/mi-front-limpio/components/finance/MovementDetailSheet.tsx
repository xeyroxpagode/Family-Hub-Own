import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing } from '../../constants/theme';
import { ApiError, generateMutationId, createIdempotencyKey } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceMovementDto, FinanceTransactionDetailDto } from '../../services/finance/financeMovements';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  ActionSheet,
  AppButton,
  AppText,
  InteractivePressable,
} from '../ui';
import { CorrectionFormSheet } from './CorrectionFormSheet';
import { CorrectionReviewSheet } from './CorrectionReviewSheet';

type SheetTitleConfig = {
  title: string;
  subtitle: string;
};

type MovementDetailSheetProps = {
  visible: boolean;
  movement: FinanceMovementDto | null;
  contextType: FinanceContextType;
  contextLabel: string;
  accessToken: string | null;
  personId: string | null;
  householdId: string | null;
  onRequestClose: () => void;
  onTrashSuccess: () => void;
  onCorrectionSuccess: () => void;
};

type DetailFlowStep =
  | 'detail'
  | 'recovery'
  | 'confirmTrash'
  | 'correctionForm'
  | 'correctionReview';

function getSheetTitleConfig(step: DetailFlowStep, contextLabel: string, detailLoading: boolean): SheetTitleConfig {
  switch (step) {
    case 'detail':
      return { title: 'Detalle del movimiento', subtitle: `Finanzas de ${contextLabel}` };
    case 'recovery':
      return { title: '¿Qué ocurrió?', subtitle: `Finanzas de ${contextLabel}` };
    case 'confirmTrash':
      return { title: '¿Enviar a Papelera?', subtitle: `Finanzas de ${contextLabel}` };
    case 'correctionForm':
      return { title: detailLoading ? 'Cargando...' : 'Corregir movimiento', subtitle: `Finanzas de ${contextLabel}` };
    case 'correctionReview':
      return { title: 'Revisá la corrección', subtitle: `Finanzas de ${contextLabel}` };
    default:
      return { title: 'Detalle del movimiento', subtitle: `Finanzas de ${contextLabel}` };
  }
}

export function MovementDetailSheet({
  visible,
  movement,
  contextType,
  contextLabel,
  accessToken,
  personId,
  householdId,
  onRequestClose,
  onTrashSuccess,
  onCorrectionSuccess,
}: MovementDetailSheetProps) {
  const [step, setStep] = useState<DetailFlowStep>('detail');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trashMutationId, setTrashMutationId] = useState<string | null>(null);
  const [trashIdempotencyKey, setTrashIdempotencyKey] = useState<string | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<FinanceTransactionDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [correctedValues, setCorrectedValues] = useState<{
    amount: string;
    currency: string;
    transactionDate: string;
    description: string | null;
    notes: string | null;
    categoryId: string | null;
    categoryLabel: string | null;
    accountId: string | null;
    accountName: string | null;
    accountCurrency: string | null;
  } | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep('detail');
      setError(null);
      setSubmitting(false);
      setTrashMutationId(null);
      setTrashIdempotencyKey(null);
      setDetailTransaction(null);
      setDetailLoading(false);
      setCorrectedValues(null);
    }
  }, [visible]);

  useEffect(() => {
    if (step === 'confirmTrash' && !trashMutationId) {
      setTrashMutationId(generateMutationId());
      setTrashIdempotencyKey(createIdempotencyKey('finance.transaction.trash'));
    }
    if (step !== 'confirmTrash') {
      setTrashMutationId(null);
      setTrashIdempotencyKey(null);
    }
  }, [step, trashMutationId]);

  const close = () => {
    if (submitting) return;
    if (step !== 'detail') {
      setStep('detail');
      setError(null);
      setCorrectedValues(null);
      return;
    }
    onRequestClose();
  };

  const handleAlgoEstaMal = () => {
    setStep('recovery');
  };

  const handleLoAnoteMal = async () => {
    if (!movement || !accessToken) return;

    setDetailLoading(true);
    setError(null);

    try {
      const { getFinanceTransactionDetail } = await import('../../services/finance/financeMovements');
      const response = await getFinanceTransactionDetail({
        accessToken,
        contextType,
        transactionId: movement.id,
      });
      setDetailTransaction(response.transaction);
      setStep('correctionForm');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No pudimos cargar el detalle del movimiento.');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleNuncaOcurrio = () => {
    setStep('confirmTrash');
  };

  const handleConfirmTrash = async () => {
    if (!movement || !accessToken || !personId || submitting || !trashMutationId || !trashIdempotencyKey) return;

    setSubmitting(true);
    setError(null);

    try {
      const { trashFinanceTransaction } = await import('../../services/finance/financeMovements');
      await trashFinanceTransaction({
        accessToken,
        contextType,
        personId,
        householdId,
        transactionId: movement.id,
        mutationId: trashMutationId,
        idempotencyKey: trashIdempotencyKey,
      });
      onTrashSuccess();
      close();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'finance_transaction_dependent_on_transfer') {
          setError('Este movimiento es una comisión generada por una Transferencia y no se puede enviar a Papelera por separado.');
        } else {
          setError(err.message);
        }
      } else {
        setError('No pudimos enviar el movimiento a Papelera. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrectionFormSubmit = (values: typeof correctedValues) => {
    setCorrectedValues(values);
    setStep('correctionReview');
  };

  const handleCorrectionReviewConfirm = () => {
    onCorrectionSuccess();
  };

  const handleCorrectionReviewBack = () => {
    setStep('correctionForm');
  };

  if (!visible || !movement) return null;

  const isExpense = movement.transactionType === 'expense';
  const titleConfig = getSheetTitleConfig(step, contextLabel, detailLoading);

  const correctionFormFooter = step === 'correctionForm' && detailTransaction ? (
    <View style={styles.footer}>
      <AppButton
        variant="ghost"
        title="Cancelar"
        onPress={() => setStep('recovery')}
        disabled={submitting}
        style={styles.footerButton}
      />
      <AppButton
        title="Continuar"
        onPress={() => {
          // The CorrectionFormSheet handles its own submit via onSuccess callback
          // This button is just for UI consistency; the form's own footer handles submission
        }}
        disabled={true}
        style={styles.footerButton}
      />
    </View>
  ) : null;

  const correctionReviewFooter = step === 'correctionReview' && detailTransaction && correctedValues ? (
    <View style={styles.footer}>
      <AppButton
        variant="ghost"
        title="Volver"
        onPress={handleCorrectionReviewBack}
        disabled={submitting}
        style={styles.footerButton}
      />
      <AppButton
        variant="primary"
        title="Guardar corrección"
        onPress={handleCorrectionReviewConfirm}
        loading={submitting}
        disabled={submitting}
        style={styles.footerButton}
      />
    </View>
  ) : null;

  const confirmTrashFooter = step === 'confirmTrash' ? (
    <View style={styles.footer}>
      <AppButton
        variant="ghost"
        title="Cancelar"
        onPress={() => setStep('recovery')}
        disabled={submitting}
        style={styles.footerButton}
      />
      <AppButton
        variant="danger"
        title="Enviar a Papelera"
        onPress={handleConfirmTrash}
        loading={submitting}
        disabled={submitting}
        style={styles.footerButton}
      />
    </View>
  ) : null;

  const footer = correctionFormFooter ?? correctionReviewFooter ?? confirmTrashFooter ?? null;

  return (
    <ActionSheet
      visible={visible}
      title={titleConfig.title}
      subtitle={titleConfig.subtitle}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={footer}
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

            <View style={styles.divider} />

            <InteractivePressable
              onPress={handleAlgoEstaMal}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.recoveryEntry}
              accessibilityRole="button"
              accessibilityLabel="Algo está mal"
            >
              <HomePlusIcon name="alert-circle-outline" size={20} color={colors.warning.strong} />
              <AppText variant="body" weight="800" style={{ flex: 1 }}>
                Algo está mal
              </AppText>
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
          </View>
        )}

        {step === 'recovery' && (
          <View style={styles.recoveryView}>
            <AppText variant="body" style={styles.recoveryTitle}>
              ¿Qué ocurrió?
            </AppText>
            <InteractivePressable
              onPress={handleLoAnoteMal}
              disabled={submitting || detailLoading}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.recoveryOption}
              accessibilityRole="button"
              accessibilityLabel="Lo anoté mal"
            >
              <HomePlusIcon name="pencil-outline" size={20} color={colors.terracotta[700]} />
              <AppText variant="body" weight="800" style={{ flex: 1 }}>
                Lo anoté mal
              </AppText>
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
            <AppText variant="caption" tone="tertiary" style={styles.recoveryHint}>
              El movimiento ocurrió, pero alguno de sus datos no es correcto.
            </AppText>
            <InteractivePressable
              onPress={handleNuncaOcurrio}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.recoveryOption}
              accessibilityRole="button"
              accessibilityLabel="Nunca ocurrió"
            >
              <HomePlusIcon name="trash-outline" size={20} color={colors.danger.strong} />
              <AppText variant="body" weight="800" style={{ flex: 1 }}>
                Nunca ocurrió
              </AppText>
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
            <AppText variant="caption" tone="tertiary" style={styles.recoveryHint}>
              El movimiento dejará de afectar tus finanzas y podrás recuperarlo más adelante.
            </AppText>
          </View>
        )}

        {step === 'confirmTrash' && (
          <View style={styles.confirmView}>
            <AppText variant="body" style={styles.confirmTitle}>
              ¿Enviar a Papelera?
            </AppText>
            <AppText variant="bodySmall" tone="secondary" style={styles.confirmMessage}>
              Este movimiento dejará de afectar tus finanzas y podrás recuperarlo más adelante.
            </AppText>

            {error ? (
              <View style={styles.errorBox}>
                <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
                <AppText variant="bodySmall" tone="danger" style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}
          </View>
        )}

        {step === 'correctionForm' && detailTransaction && (
          <CorrectionFormSheet
            visible={true}
            accessToken={accessToken}
            contextType={contextType}
            contextLabel={contextLabel}
            personId={personId}
            householdId={householdId}
            initialTransaction={{
              id: detailTransaction.id,
              transactionType: detailTransaction.transactionType,
              amount: detailTransaction.amount,
              currency: detailTransaction.currency,
              transactionDate: detailTransaction.transactionDate,
              description: detailTransaction.description,
              notes: detailTransaction.notes,
              categoryId: detailTransaction.categoryId,
              categoryLabelSnapshot: detailTransaction.categoryLabelSnapshot,
              accountId: detailTransaction.accountId,
              accountName: detailTransaction.accountName,
              accountCurrency: detailTransaction.accountCurrency,
            }}
            onRequestClose={close}
            onSuccess={handleCorrectionFormSubmit}
            onCancel={() => setStep('recovery')}
            mode="nested"
          />
        )}

        {step === 'correctionReview' && detailTransaction && correctedValues && (
          <CorrectionReviewSheet
            visible={true}
            accessToken={accessToken}
            contextType={contextType}
            contextLabel={contextLabel}
            personId={personId}
            householdId={householdId}
            originalTransaction={detailTransaction}
            correctedValues={correctedValues}
            onRequestClose={close}
            onSuccess={handleCorrectionReviewConfirm}
            onBack={handleCorrectionReviewBack}
            mode="nested"
          />
        )}

        {step === 'correctionForm' && !detailTransaction && detailLoading && (
          <View style={styles.loadingView}>
            <HomePlusIcon name="refresh-outline" size={32} color={colors.terracotta[700]} />
            <AppText variant="body" weight="800" style={styles.loadingTitle}>
              Cargando detalle del movimiento
            </AppText>
            <AppText variant="bodySmall" tone="secondary" style={styles.loadingMessage}>
              Por favor espera mientras obtenemos la información.
            </AppText>
          </View>
        )}

        {step === 'correctionForm' && !detailTransaction && !detailLoading && error && (
          <View style={styles.errorView}>
            <HomePlusIcon name="alert-circle-outline" size={32} color={colors.danger.strong} />
            <AppText variant="body" weight="800" style={styles.errorTitle}>
              No pudimos cargar el detalle
            </AppText>
            <AppText variant="bodySmall" tone="secondary" style={styles.errorMessage}>
              {error}
            </AppText>
            <View style={[styles.errorButton, { marginTop: spacing[3] }]}>
              <AppButton
                title="Reintentar"
                onPress={handleLoAnoteMal}
                style={styles.errorButtonInner}
              />
            </View>
            <View style={[styles.errorButton, { marginTop: spacing[2] }]}>
              <AppButton
                variant="ghost"
                title="Volver"
                onPress={() => setStep('recovery')}
                style={styles.errorButtonInner}
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
  recoveryEntry: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning.base,
    backgroundColor: colors.warning.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  recoveryView: {
    gap: spacing[3],
  },
  recoveryTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  recoveryOption: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger.base,
    backgroundColor: colors.danger.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  recoveryHint: {
    textAlign: 'center',
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
  loadingView: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  loadingTitle: {
    textAlign: 'center',
  },
  loadingMessage: {
    textAlign: 'center',
  },
  errorView: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    width: '100%',
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
  },
  errorButton: {
    width: '100%',
  },
  errorButtonInner: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
    width: '100%',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  footerButton: {
    flex: 1,
  },
});