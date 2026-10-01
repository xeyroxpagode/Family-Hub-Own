import React, { useState, useEffect } from 'react';
import { View, Keyboard } from 'react-native';

import {
  AppText,
  ActionSheet,
} from '../ui';
import { formatFinanceAmount, isZeroDecimalString } from '../../services/finance/financeDisplay';
import {
  releaseFinancePool,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';
import { parseMoneyInputText, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import { MoneyInput } from './MoneyInput';
import {
  FinanceDetailMetaRow,
  FinanceEmptyState,
  FinanceFormFooter,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';

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
  const { colors } = useAppTheme();
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

  const isBalanceNegative = pool?.balance.startsWith('-');
  const isBalanceZero = pool ? isZeroDecimalString(pool.balance) : true;
  const maxReleasable = isBalanceNegative || isBalanceZero ? '0' : pool?.balance ?? '0';

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

    const canonical = amount.technicalValue?.amount ?? amount.canonicalAmount;
    if (!canonical) return;

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `pool-release-${pool.id}-${mutationId}`;
      const payload = { poolId: pool.id, amount: canonical, currency };
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
        amount: canonical,
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
      size={FINANCE_SHEET_SIZE_POLICY.SHORT_FORM}
    >
      <View style={{ gap: financeSpacing.formFieldGap, paddingBottom: financeSpacing.contentActionGap }}>
        <FinanceDetailMetaRow
          label="Saldo actual del pozo"
          value={formatFinanceAmount(pool.balance, currency, { sign: 'net' })}
          valueTone={isBalanceZero ? 'primary' : isBalanceNegative ? 'danger' : 'success'}
        />

        {canRelease ? (
          <>
            <MoneyInput
              value={amountText}
              currency={currency}
              onValueChange={handleAmountChange}
              onCurrencyChange={() => undefined}
              availableCurrencies={[currency]}
              label="Monto a liberar"
              errorText={error ?? undefined}
              disabled={submitting}
            />

            <AppText variant="caption" tone="tertiary" align="center">
              El dinero vuelve a &quot;Sin asignar&quot;. No afecta tus cuentas bancarias.
            </AppText>

            <FinanceFormFooter
              onCancel={onRequestClose}
              primaryTitle="Liberar"
              onPrimary={handleSubmit}
              primaryDisabled={!amount.isValid}
              loading={submitting}
            />
          </>
        ) : (
          <>
            <FinanceEmptyState
              level="section"
              title="No hay saldo positivo para liberar"
              description={`Este pozo tiene saldo ${isBalanceZero ? 'cero' : 'negativo'}. Solo se puede liberar saldo positivo.`}
              icon={<HomePlusIcon name="alert-circle-outline" size={20} color={colors.text.tertiary} />}
            />
            <FinanceFormFooter
              primaryTitle="Entendido"
              onPrimary={onRequestClose}
            />
          </>
        )}
      </View>
    </ActionSheet>
  );
}
