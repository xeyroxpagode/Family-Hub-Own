import React, { useState, useEffect } from 'react';
import { View, Keyboard } from 'react-native';

import {
  AppText,
  ActionSheet,
} from '../ui';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import {
  allocateFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';
import { parseMoneyInputText, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import { MoneyInput } from './MoneyInput';
import {
  FinanceDetailMetaRow,
  FinanceFormFooter,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';

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
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', currency));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
      setError(null);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
  };

  const validate = () => {
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

    const canonical = amount.technicalValue?.amount ?? amount.canonicalAmount;
    if (!canonical) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-allocate-${pool.id}-${mutationId}`;
      const payload = { poolId: pool.id, amount: canonical, currency };
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
        amount: canonical,
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
      size={FINANCE_SHEET_SIZE_POLICY.SHORT_FORM}
    >
      <View style={{ gap: financeSpacing.formFieldGap, paddingBottom: financeSpacing.contentActionGap }}>
        <FinanceDetailMetaRow
          label="Sin asignar disponible"
          value={formatFinanceAmount(unassignedKnown, currency, { sign: 'net' })}
        />

        <MoneyInput
          value={amountText}
          currency={currency}
          onValueChange={handleAmountChange}
          onCurrencyChange={() => undefined}
          availableCurrencies={[currency]}
          label="Monto a agregar"
          errorText={error ?? undefined}
          disabled={submitting}
        />

        <AppText variant="caption" tone="tertiary" align="center">
          El dinero sale de &quot;Sin asignar&quot; y entra a este pozo. No afecta tus cuentas bancarias.
        </AppText>

        <FinanceFormFooter
          onCancel={onRequestClose}
          primaryTitle="Agregar"
          onPrimary={handleSubmit}
          primaryDisabled={!amount.isValid}
          loading={submitting}
        />
      </View>
    </ActionSheet>
  );
}
