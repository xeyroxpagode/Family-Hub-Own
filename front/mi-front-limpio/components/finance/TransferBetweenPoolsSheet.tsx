import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  AppInput,
  ActionSheet,
  InteractivePressable,
} from '../ui';
import { colors, motion, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { isZeroDecimalString, isValidFinanceAmount } from '../../services/finance/financeDisplay';
import {
  transferFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';

type TransferBetweenPoolsSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  pools: FinancePoolDto[];
  preselectedSourceId?: string;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function TransferBetweenPoolsSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  pools,
  preselectedSourceId,
  onRequestClose,
  onSuccess,
}: TransferBetweenPoolsSheetProps) {
  const [sourcePoolId, setSourcePoolId] = useState<string>(preselectedSourceId ?? '');
  const [destinationPoolId, setDestinationPoolId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activePools = useMemo(() => pools.filter((p) => p.status === 'ACTIVE'), [pools]);

  useEffect(() => {
    if (visible) {
      if (preselectedSourceId && activePools.some((p) => p.id === preselectedSourceId)) {
        setSourcePoolId(preselectedSourceId);
      } else if (activePools.length > 0) {
        setSourcePoolId(activePools[0].id);
      }
      setDestinationPoolId('');
      setAmount('');
      setError(null);
      setSubmitting(false);
    }
  }, [visible, preselectedSourceId, activePools]);

  const sourcePool = activePools.find((p) => p.id === sourcePoolId);

  const sourceBalance = sourcePool?.balance ?? '0';
  const canSubmit = sourcePoolId && destinationPoolId && sourcePoolId !== destinationPoolId && amount.trim() && isValidFinanceAmount(amount.trim()) && Number(amount.trim()) > 0;

  const validate = () => {
    if (!sourcePoolId) {
      setError('Seleccioná el pozo de origen');
      return false;
    }
    if (!destinationPoolId) {
      setError('Seleccioná el pozo de destino');
      return false;
    }
    if (sourcePoolId === destinationPoolId) {
      setError('Origen y destino deben ser pozos distintos');
      return false;
    }
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
    const sourceNum = Number(sourceBalance);
    if (amountNum > sourceNum) {
      setError(`El pozo de origen no tiene suficiente saldo (${sourceBalance})`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !accessToken || submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-transfer-${sourcePoolId}-${destinationPoolId}-${mutationId}`;
      const payload = { sourcePoolId, destinationPoolId, amount: amount.trim(), currency };
      const payloadHash = await hashIdempotencyRequestV2({
        operation: 'finance.pool.transfer',
        scopeType: contextType,
        scopeId: contextType === 'personal' ? 'personal' : contextLabel,
        targetId: null,
        payload,
        expectedVersion: null,
        mutationId,
      });

      await transferFinancePool({
        accessToken,
        contextType,
        currency,
        sourcePoolId,
        destinationPoolId,
        amount: amount.trim(),
        mutationId,
        idempotencyKey,
        payloadHash,
      });

      onSuccess();
    } catch (err: any) {
      if (err?.code === 'finance_pool_insufficient_source_balance') {
        setError('Saldo insuficiente en el pozo de origen.');
      } else if (err?.code === 'finance_pool_source_archived') {
        setError('El pozo de origen está archivado.');
      } else if (err?.code === 'finance_pool_destination_archived') {
        setError('El pozo de destino está archivado.');
      } else if (err?.code === 'finance_pool_same_pool_transfer') {
        setError('Origen y destino deben ser pozos distintos.');
      } else {
        setError(err?.message ?? 'No pudimos mover entre pozos. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderPoolPicker = (label: string, selectedId: string, onSelect: (id: string) => void, excludeId?: string) => {
    const options = activePools.filter((p) => p.id !== excludeId);
    return (
      <View style={styles.pickerContainer}>
        <AppText variant="caption" tone="secondary" weight="700" style={styles.pickerLabel}>{label}</AppText>
        <AppCard variant="quiet" padding="default" style={styles.pickerCard}>
          {options.map((pool) => (
            <InteractivePressable
              key={pool.id}
              onPress={() => onSelect(pool.id)}
              haptic="light"
              pressScale={motion.scale.card}
              style={[
                styles.pickerOption,
                selectedId === pool.id && styles.pickerOptionSelected,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedId === pool.id }}
            >
              <View style={styles.pickerOptionContent}>
                <AppText variant="body" weight={selectedId === pool.id ? '800' : '600'} numberOfLines={1}>
                  {pool.name}
                </AppText>
                <AppText
                  variant="caption"
                  tone={isZeroDecimalString(pool.balance) ? 'primary' : pool.balance.startsWith('-') ? 'danger' : 'success'}
                  style={styles.pickerBalance}
                >
                  {pool.balance} {currency}
                </AppText>
              </View>
              {selectedId === pool.id && (
                <HomePlusIcon name="radio-button-on" size={20} color={colors.terracotta[700]} />
              )}
            </InteractivePressable>
          ))}
          {options.length === 0 && (
            <AppText variant="caption" tone="tertiary" style={styles.noOptions}>
              No hay otros pozos disponibles
            </AppText>
          )}
        </AppCard>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <ActionSheet
      visible={true}
      title="Mover entre pozos"
      onRequestClose={onRequestClose}
      size="content"
    >
      <View style={styles.content}>
        <AppText variant="caption" tone="secondary" style={styles.hint}>
          Moneda: {currency} · El dinero se mueve entre pozos, no afecta tus cuentas
        </AppText>

        {renderPoolPicker('Desde', sourcePoolId, setSourcePoolId, destinationPoolId)}

        {renderPoolPicker('Hacia', destinationPoolId, setDestinationPoolId, sourcePoolId)}

        <AppCard variant="quiet" padding="default" style={styles.formCard}>
          <AppInput
            label="Monto a mover"
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
          Transferencia interna entre pozos. No es una transferencia bancaria.
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
            title="Mover"
            onPress={handleSubmit}
            disabled={submitting || !canSubmit}
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
  hint: {
    textAlign: 'center',
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pickerContainer: {
    gap: spacing[1],
  },
  pickerLabel: {
    marginLeft: spacing[1],
  },
  pickerCard: {
    gap: 0,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  pickerOptionSelected: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[100],
  },
  pickerOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  pickerBalance: {
    fontSize: 12,
  },
  noOptions: {
    padding: spacing[3],
    textAlign: 'center',
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
