import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { ApiError, generateMutationId, createIdempotencyKey } from '../../services/api';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import type { FinanceTransactionDetailDto } from '../../services/finance/financeMovements';
import { correctFinanceTransaction } from '../../services/finance/financeMovements';
import {
  ActionSheet,
  AppButton,
  AppText,
} from '../ui';

type ChangeItem = {
  label: string;
  oldValue: string;
  newValue: string;
};

type CorrectionReviewSheetMode = 'standalone' | 'nested';

type CorrectionReviewSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: 'personal' | 'household';
  contextLabel: string;
  personId: string | null;
  householdId: string | null;
  originalTransaction: FinanceTransactionDetailDto | null;
  correctedValues: {
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
  } | null;
  onRequestClose: () => void;
  onSuccess: () => void;
  onBack: () => void;
  mode?: CorrectionReviewSheetMode;
};

function formatDateForDisplay(date: string): string {
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getAccountDisplay(accountId: string | null, accountName: string | null, accountCurrency: string | null): string {
  if (!accountId || !accountName || !accountCurrency) return 'Sin cuenta';
  return `${accountName} · ${accountCurrency}`;
}

function getCategoryDisplay(categoryId: string | null, categoryLabel: string | null): string {
  if (!categoryId || !categoryLabel) return 'Sin categoria';
  return categoryLabel;
}

export function CorrectionReviewSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  personId,
  householdId,
  originalTransaction,
  correctedValues,
  onRequestClose,
  onSuccess,
  onBack,
  mode = 'standalone',
}: CorrectionReviewSheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewMutationId, setReviewMutationId] = useState<string | null>(null);
  const [reviewIdempotencyKey, setReviewIdempotencyKey] = useState<string | null>(null);
  const prevCorrectedValuesRef = useRef<string | null>(null);

  // Generate mutationId and idempotencyKey when correctedValues change (new intent)
  useEffect(() => {
    if (correctedValues) {
      const currentHash = JSON.stringify(correctedValues);
      if (currentHash !== prevCorrectedValuesRef.current) {
        setReviewMutationId(generateMutationId());
        setReviewIdempotencyKey(createIdempotencyKey('finance.transaction.correct'));
        prevCorrectedValuesRef.current = currentHash;
      }
    } else {
      setReviewMutationId(null);
      setReviewIdempotencyKey(null);
      prevCorrectedValuesRef.current = null;
    }
  }, [correctedValues]);

  const changes = useMemo(() => {
    if (!originalTransaction || !correctedValues) return [];

    const items: ChangeItem[] = [];

    if (correctedValues.amount !== originalTransaction.amount) {
      items.push({
        label: 'Monto',
        oldValue: formatFinanceAmount(originalTransaction.amount, originalTransaction.currency, {
          sign: 'transaction',
          transactionType: originalTransaction.transactionType as 'expense' | 'income',
        }),
        newValue: formatFinanceAmount(correctedValues.amount, correctedValues.currency, {
          sign: 'transaction',
          transactionType: originalTransaction.transactionType as 'expense' | 'income',
        }),
      });
    }

    if (correctedValues.currency !== originalTransaction.currency) {
      items.push({
        label: 'Moneda',
        oldValue: originalTransaction.currency,
        newValue: correctedValues.currency,
      });
    }

    if (correctedValues.transactionDate !== originalTransaction.transactionDate) {
      items.push({
        label: 'Fecha',
        oldValue: formatDateForDisplay(originalTransaction.transactionDate),
        newValue: formatDateForDisplay(correctedValues.transactionDate),
      });
    }

    const oldDescription = originalTransaction.description ?? '';
    const newDescription = correctedValues.description ?? '';
    if (oldDescription !== newDescription) {
      items.push({
        label: 'Descripcion',
        oldValue: oldDescription || '(vacío)',
        newValue: newDescription || '(vacío)',
      });
    }

    const oldNotes = originalTransaction.notes ?? '';
    const newNotes = correctedValues.notes ?? '';
    if (oldNotes !== newNotes) {
      items.push({
        label: 'Notas',
        oldValue: oldNotes || '(vacío)',
        newValue: newNotes || '(vacío)',
      });
    }

    const oldCategory = getCategoryDisplay(originalTransaction.categoryId, originalTransaction.categoryLabelSnapshot);
    const newCategory = getCategoryDisplay(correctedValues.categoryId, correctedValues.categoryLabel);
    if (oldCategory !== newCategory) {
      items.push({
        label: 'Categoria',
        oldValue: oldCategory,
        newValue: newCategory,
      });
    }

    const oldAccount = getAccountDisplay(
      originalTransaction.accountId ?? null,
      null,
      null
    );
    const newAccount = getAccountDisplay(correctedValues.accountId, correctedValues.accountName, correctedValues.accountCurrency);
    if (oldAccount !== newAccount) {
      items.push({
        label: 'Cuenta',
        oldValue: oldAccount,
        newValue: newAccount,
      });
    }

    return items;
  }, [originalTransaction, correctedValues]);

  const close = () => {
    if (submitting) return;
    setReviewMutationId(null);
    setReviewIdempotencyKey(null);
    prevCorrectedValuesRef.current = null;
    onRequestClose();
  };

  const handleBack = () => {
    if (submitting) return;
    setReviewMutationId(null);
    setReviewIdempotencyKey(null);
    prevCorrectedValuesRef.current = null;
    onBack();
  };

  const handleConfirm = async () => {
    if (submitting || !reviewMutationId || !reviewIdempotencyKey || !originalTransaction || !correctedValues || !accessToken || !personId) return;

    setSubmitting(true);
    setError(null);

    try {
      await correctFinanceTransaction({
        accessToken,
        contextType,
        personId,
        householdId,
        transactionId: originalTransaction.id,
        mutationId: reviewMutationId,
        idempotencyKey: reviewIdempotencyKey,
        amount: correctedValues.amount,
        currency: correctedValues.currency,
        transactionDate: correctedValues.transactionDate,
        description: correctedValues.description,
        categoryId: correctedValues.categoryId,
        accountId: correctedValues.accountId,
        notes: correctedValues.notes,
        clearDescription: correctedValues.description === '' && originalTransaction.description !== null,
        clearCategory: correctedValues.categoryId === null && originalTransaction.categoryId !== null,
        clearAccount: correctedValues.accountId === null && originalTransaction.accountId !== null,
        clearNotes: correctedValues.notes === '' && originalTransaction.notes !== null,
      });
      onSuccess();
      close();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No pudimos corregir el movimiento. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !originalTransaction || !correctedValues) return null;

  const reviewContent = (
    <View style={styles.content}>
      {changes.length === 0 ? (
        <View style={styles.noChanges}>
          <HomePlusIcon name="checkmark-circle-outline" size={32} color={colors.success.strong} />
          <AppText variant="body" weight="800" style={styles.noChangesTitle}>
            Sin cambios
          </AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.noChangesMessage}>
            No hay diferencias para corregir.
          </AppText>
        </View>
      ) : (
        <>
          <AppText variant="body" style={styles.reviewTitle}>
            Se aplicarán los siguientes cambios:
          </AppText>
          <View style={styles.changesList}>
            {changes.map((change, index) => (
              <View key={index} style={styles.changeRow}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.changeLabel}>
                  {change.label}
                </AppText>
                <View style={styles.changeValues}>
                  <View style={styles.changeValueRow}>
                    <AppText variant="bodySmall" tone="tertiary" style={styles.changeFromLabel}>
                      Era
                    </AppText>
                    <AppText variant="bodySmall" weight="800" tone="secondary" numberOfLines={1} style={styles.changeOldValue}>
                      {change.oldValue}
                    </AppText>
                  </View>
                  <View style={styles.changeValueRow}>
                    <AppText variant="bodySmall" tone="tertiary" style={styles.changeToLabel}>
                      Será
                    </AppText>
                    <AppText variant="bodySmall" weight="800" tone="primary" numberOfLines={1} style={styles.changeNewValue}>
                      {change.newValue}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

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
          title="Volver"
          onPress={handleBack}
          disabled={submitting}
          style={styles.confirmButton}
        />
        <AppButton
          variant="primary"
          title="Guardar corrección"
          onPress={handleConfirm}
          loading={submitting}
          disabled={submitting || changes.length === 0}
          style={styles.confirmButton}
        />
      </View>
    </View>
  );

  if (mode === 'nested') {
    return reviewContent;
  }

  return (
    <ActionSheet
      visible={visible}
      title="Revisá la corrección"
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
    >
      {reviewContent}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[2],
  },
  noChanges: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  noChangesTitle: {
    textAlign: 'center',
  },
  noChangesMessage: {
    textAlign: 'center',
  },
  reviewTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  changesList: {
    gap: spacing[3],
  },
  changeRow: {
    gap: spacing[2],
  },
  changeLabel: {
    textAlign: 'center',
  },
  changeValues: {
    gap: spacing[1],
  },
  changeValueRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  changeFromLabel: {
    textAlign: 'right',
    minWidth: 40,
  },
  changeToLabel: {
    textAlign: 'right',
    minWidth: 40,
  },
  changeOldValue: {
    textDecorationLine: 'line-through',
    textAlign: 'left',
    flex: 1,
  },
  changeNewValue: {
    textAlign: 'left',
    flex: 1,
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