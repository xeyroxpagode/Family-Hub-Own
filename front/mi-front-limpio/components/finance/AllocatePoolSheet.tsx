import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  AppInput,
  ActionSheet,
} from '../ui';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { formatFinanceAmount, isValidFinanceAmount } from '../../services/finance/financeDisplay';
import {
  allocateFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';

type AllocatePoolSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  pool: FinancePoolDto | null;
  unassignedKnown: string;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function AllocatePoolSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  pool,
  unassignedKnown,
  onRequestClose,
  onSuccess,
}: AllocatePoolSheetProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const validate = () => {
    const trimmed = amount.trim();
    if (!trimmed) {
      setError('El monto es obligatorio');
      return false;
    }
    if (!isValidFinanceAmount(trimmed)) {
      setError('Ingresá un monto válido');
      return false;
    }
    const amountNum = Number(trimmed);
    if (amountNum <= 0) {
      setError('El monto debe ser mayor a 0');
      return false;
    }
    // Frontend validation: cannot knowingly exceed displayed unassigned
    const unassignedNum = Number(unassignedKnown);
    if (unassignedNum > 0 && amountNum > unassignedNum) {
      setError(`No podés asignar más de lo que tenés sin asignar (${unassignedKnown})`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !accessToken || !pool || submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-allocate-${pool.id}-${mutationId}`;
      const payload = { poolId: pool.id, amount: amount.trim(), currency };
      const payloadHash = await hashIdempotencyRequestV2({
        operation: 'finance.pool.allocate',
        scopeType: contextType,
        scopeId: contextType === 'personal' ? 'personal' : contextLabel,
        targetId: pool.id,
        payload,
        expectedVersion: null,
        mutationId,
      });

      await allocateFinancePool({
        accessToken,
        contextType,
        currency,
        poolId: pool.id,
        amount: amount.trim(),
        mutationId,
        idempotencyKey,
        payloadHash,
      });

      onSuccess();
    } catch (err: any) {
      if (err?.code === 'finance_pool_insufficient_unassigned') {
        setError('Ya no tenés suficiente dinero sin asignar.');
      } else if (err?.code === 'finance_pool_archived') {
        setError('El pozo está archivado.');
      } else {
        setError(err?.message ?? 'No pudimos asignar al pozo. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !pool) return null;

  return (
    <ActionSheet
      visible={true}
      title={`Agregar a ${pool.name}`}
      onRequestClose={onRequestClose}
      size="content"
    >
      <View style={styles.content}>
        <View style={styles.contextCard}>
          <AppText variant="caption" tone="secondary" weight="700">Sin asignar disponible</AppText>
          <AppText variant="title3" weight="800" style={styles.unassignedAmount}>
            {formatFinanceAmount(unassignedKnown, currency, { sign: 'net' })}
          </AppText>
        </View>

        <AppCard variant="quiet" padding="default" style={styles.formCard}>
          <AppInput
            label="Monto a agregar"
            placeholder="0,00"
            value={amount}
            onChangeText={setAmount}
            errorText={error ?? undefined}
            keyboardType="decimal-pad"
            maxLength={18}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoFocus={true}
          />
        </AppCard>

        <AppText variant="caption" tone="tertiary" style={styles.note}>
          El dinero sale de &quot;Sin asignar&quot; y entra a este pozo. No afecta tus cuentas bancarias.
        </AppText>

        <View style={styles.buttonRow}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={onRequestClose}
            disabled={submitting}
            style={styles.cancelButton}
          />
          <AppButton
            title="Agregar"
            onPress={handleSubmit}
            disabled={submitting || !amount.trim() || !isValidFinanceAmount(amount.trim()) || Number(amount.trim()) <= 0}
            style={styles.confirmButton}
          >
            {submitting && <HomePlusIcon name="refresh" size={20} color={colors.text.inverse} />}
          </AppButton>
        </View>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  contextCard: {
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.terracotta[50],
    borderWidth: 1,
    borderColor: colors.terracotta[100],
  },
  unassignedAmount: {
    color: colors.terracotta[700],
  },
  formCard: {
    gap: spacing[3],
  },
  note: {
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});
