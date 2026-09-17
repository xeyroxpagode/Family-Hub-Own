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
import { isZeroDecimalString, isValidFinanceAmount } from '../../services/finance/financeDisplay';
import {
  releaseFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';

type ReleasePoolSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  pool: FinancePoolDto | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function ReleasePoolSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  pool,
  onRequestClose,
  onSuccess,
}: ReleasePoolSheetProps) {
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

  const isBalanceNegative = pool?.balance.startsWith('-');
  const isBalanceZero = pool ? isZeroDecimalString(pool.balance) : true;
  const maxReleasable = isBalanceNegative || isBalanceZero ? '0' : pool?.balance ?? '0';

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
    const maxNum = Number(maxReleasable);
    if (amountNum > maxNum) {
      setError(`No podés liberar más que el saldo positivo del pozo (${maxReleasable})`);
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
      const idempotencyKey = `pool-release-${pool.id}-${mutationId}`;
      const payload = { poolId: pool.id, amount: amount.trim(), currency };
      const payloadHash = await hashIdempotencyRequestV2({
        operation: 'finance.pool.release',
        scopeType: contextType,
        scopeId: contextType === 'personal' ? 'personal' : contextLabel,
        targetId: pool.id,
        payload,
        expectedVersion: null,
        mutationId,
      });

      await releaseFinancePool({
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
      if (err?.code === 'finance_pool_insufficient_balance') {
        setError('Saldo insuficiente en el pozo.');
      } else if (err?.code === 'finance_pool_archived') {
        setError('El pozo está archivado.');
      } else {
        setError(err?.message ?? 'No pudimos liberar del pozo. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !pool) return null;

  const canRelease = !isBalanceNegative && !isBalanceZero;

  return (
    <ActionSheet
      visible={true}
      title={`Liberar de ${pool.name}`}
      onRequestClose={onRequestClose}
      size="content"
    >
      <View style={styles.content}>
        <View style={styles.contextCard}>
          <AppText variant="caption" tone="secondary" weight="700">Saldo actual del pozo</AppText>
          <AppText
            variant="title3"
            weight="800"
            tone={isBalanceZero ? 'primary' : isBalanceNegative ? 'danger' : 'success'}
            style={styles.balanceAmount}
          >
            {pool.balance}
          </AppText>
        </View>

        {canRelease ? (
          <>
            <AppCard variant="quiet" padding="default" style={styles.formCard}>
              <AppInput
                label="Monto a liberar"
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
              El dinero vuelve a &quot;Sin asignar&quot;. No afecta tus cuentas bancarias.
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
                title="Liberar"
                onPress={handleSubmit}
                disabled={submitting || !amount.trim() || !isValidFinanceAmount(amount.trim()) || Number(amount.trim()) <= 0}
                style={styles.confirmButton}
              >
                {submitting && <HomePlusIcon name="refresh" size={20} color={colors.text.inverse} />}
              </AppButton>
            </View>
          </>
        ) : (
          <View style={styles.disabledState}>
            <HomePlusIcon name="alert-circle-outline" size={28} color={colors.text.tertiary} />
            <AppText variant="body" weight="700" tone="secondary" style={styles.disabledTitle}>
              No hay saldo positivo para liberar
            </AppText>
            <AppText variant="caption" tone="tertiary" style={styles.disabledDesc}>
              Este pozo tiene saldo {isBalanceZero ? 'cero' : 'negativo'}. Solo se puede liberar saldo positivo.
            </AppText>
            <AppButton
              title="Entendido"
              variant="secondary"
              onPress={onRequestClose}
              style={styles.understoodButton}
            />
          </View>
        )}
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
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  balanceAmount: {
    fontSize: 28,
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
  disabledState: {
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  disabledTitle: {
    textAlign: 'center',
  },
  disabledDesc: {
    textAlign: 'center',
    paddingHorizontal: spacing[2],
  },
  understoodButton: {
    alignSelf: 'center',
    minWidth: 160,
    marginTop: spacing[2],
  },
});
