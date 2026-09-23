import React, { useState, useEffect, useMemo } from 'react';
import { View, Keyboard } from 'react-native';

import {
  AppText,
  ActionSheet,
} from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import {
  transferFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';
import { parseMoneyInputText, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import { MoneyInput } from './MoneyInput';
import {
  FinanceFormFooter,
  FinanceGroupedSurface,
  FinanceListRow,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';

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
  const { colors } = useAppTheme();
  const [sourcePoolId, setSourcePoolId] = useState<string>(preselectedSourceId ?? '');
  const [destinationPoolId, setDestinationPoolId] = useState<string>('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', currency));
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
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
      setError(null);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, preselectedSourceId, activePools]);

  const sourcePool = activePools.find((p) => p.id === sourcePoolId);

  const sourceBalance = sourcePool?.balance ?? '0';
  const canSubmit = Boolean(sourcePoolId && destinationPoolId && sourcePoolId !== destinationPoolId && amount.isValid);

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
  };

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
    const canonical = amount.technicalValue?.amount ?? amount.canonicalAmount;
    if (!amountText.trim()) {
      setError('El monto es obligatorio');
      return false;
    }
    if (!canonical || amount.status === 'invalid') {
      setError('Ingresá un monto válido');
      return false;
    }
    const amountNum = Number(canonical);
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

    const canonical = amount.technicalValue?.amount ?? amount.canonicalAmount;
    if (!canonical) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-transfer-${sourcePoolId}-${destinationPoolId}-${mutationId}`;
      const payload = { sourcePoolId, destinationPoolId, amount: canonical, currency };
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
        amount: canonical,
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
      <FinanceGroupedSurface title={label}>
        {options.map((pool, index) => {
          const selected = selectedId === pool.id;
          const isNegative = pool.balance.startsWith('-');
          return (
            <FinanceListRow
              key={pool.id}
              title={pool.name}
              value={formatFinanceAmount(pool.balance, currency, { sign: 'none' })}
              valueTone={isZeroDecimalString(pool.balance) ? 'primary' : isNegative ? 'danger' : 'success'}
              icon={
                <HomePlusIcon
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? colors.terracotta[700] : colors.text.tertiary}
                />
              }
              onPress={() => onSelect(pool.id)}
              disabled={submitting}
              divider={index < options.length - 1}
              accessibilityLabel={`${label}: ${pool.name}, saldo ${formatFinanceAmount(pool.balance, currency, { sign: 'none' })}${selected ? ', seleccionado' : ''}`}
            />
          );
        })}
        {options.length === 0 && (
          <AppText variant="caption" tone="tertiary" align="center">
            No hay otros pozos disponibles
          </AppText>
        )}
      </FinanceGroupedSurface>
    );
  };

  if (!visible) return null;

  return (
    <ActionSheet
      visible={true}
      title="Mover entre pozos"
      onRequestClose={onRequestClose}
      size={FINANCE_SHEET_SIZE_POLICY.MEDIUM_FORM}
    >
      <View style={{ gap: financeSpacing.formFieldGap, paddingBottom: financeSpacing.contentActionGap }}>
        <AppText variant="caption" tone="secondary" align="center">
          Moneda: {currency} · El dinero se mueve entre pozos, no afecta tus cuentas
        </AppText>

        {renderPoolPicker('Desde', sourcePoolId, setSourcePoolId, destinationPoolId)}

        {renderPoolPicker('Hacia', destinationPoolId, setDestinationPoolId, sourcePoolId)}

        <MoneyInput
          value={amountText}
          currency={currency}
          onValueChange={handleAmountChange}
          onCurrencyChange={() => undefined}
          availableCurrencies={[currency]}
          label="Monto a mover"
          errorText={error ?? undefined}
          disabled={submitting}
        />

        <AppText variant="caption" tone="tertiary" align="center">
          Transferencia interna entre pozos. No es una transferencia bancaria.
        </AppText>

        <FinanceFormFooter
          onCancel={onRequestClose}
          primaryTitle="Mover"
          onPrimary={handleSubmit}
          primaryDisabled={!canSubmit}
          loading={submitting}
        />
      </View>
    </ActionSheet>
  );
}
