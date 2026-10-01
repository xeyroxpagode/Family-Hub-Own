/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import type { FinanceContextType, FinanceContextViewState, FinanceActiveHousehold } from '../../services/finance/financeContext';
import {
  settleCreditCardPaymentDue,
  type PaymentDueDto,
  formatDueDateHuman,
  formatExpectedAmount,
} from '../../services/finance/financePayments';
import { type FinanceAccountDto } from '../../services/finance/financeAccounts';
import { useEligibleAccounts } from '../../services/finance/financeAccountEligibility';
import { compareDecimalStrings } from '../../services/finance/accountDisplay';
import { formatFinanceAmount } from '../../services/finance/financeDisplay';
import {
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from '../../services/finance/moneyInputValue';
import {
  ActionSheet,
  AppText,
  DatePickerSheet,
  formatHumanDate,
} from '../ui';
import {
  FinanceErrorState,
  FinanceFormFooter,
  FinanceInlineChoice,
  FinanceListRow,
  FinanceSelectionRow,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';
import { todayDateOnly } from '../../services/finance/financeDate';
import { MoneyInput } from './MoneyInput';
import { AccountSelector } from './AccountSelector';

type PayAmountChoice = 'full' | 'other';

type PayCreditCardSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  contextState: FinanceContextViewState;
  activeHousehold: FinanceActiveHousehold;
  payment: PaymentDueDto | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function PayCreditCardSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  contextState,
  activeHousehold,
  payment,
  onRequestClose,
  onSuccess,
}: PayCreditCardSheetProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [destinationAmountText, setDestinationAmountText] = useState('');
  const [destinationAmount, setDestinationAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [payChoice, setPayChoice] = useState<PayAmountChoice>('full');
  const [date, setDate] = useState(todayDateOnly);
  const [activePicker, setActivePicker] = useState<'date' | 'sourceAccount' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountSelectorVisible, setAccountSelectorVisible] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const isCrossCurrency = payment?.targetCreditCard && payment.currency !== payment.targetCreditCard.currency;
  const destinationCurrencyCode = payment?.targetCreditCard?.currency ?? payment?.currency ?? 'ARS';
  const sourceCurrencyCode = payment?.currency ?? 'ARS';

  const expectedAmountText = useMemo(
    () => formatExpectedAmount(payment?.expectedAmountKnown ?? true, payment?.expectedAmount ?? null, destinationCurrencyCode),
    [payment?.expectedAmountKnown, payment?.expectedAmount, destinationCurrencyCode],
  );
  const paidSoFar = payment?.paidSoFar ?? '0';
  const remainingAmount = payment?.remaining ?? (payment?.expectedAmountKnown ? payment.expectedAmount ?? '0' : null);
  const remainingAmountText = remainingAmount
    ? formatFinanceAmount(remainingAmount, destinationCurrencyCode, { sign: 'none' })
    : 'A confirmar';
  const paidSoFarText = formatFinanceAmount(paidSoFar, destinationCurrencyCode, { sign: 'none' });
  const hasProgress = payment?.kind === 'CREDIT_CARD' && (payment.isPartiallyPaid || compareDecimalStrings(paidSoFar, '0') > 0);

  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';

  const eligibleSourceAccounts = useEligibleAccounts({
    accessToken,
    enabled: visible && !!payment,
    operation: 'transfer-source',
    contextType,
    transactionCurrency: sourceCurrencyCode,
    activeHousehold,
  });

  const selectedSourceAccount = useMemo(
    () => eligibleSourceAccounts.accounts.find((account) => account.id === selectedAccountId) ?? null,
    [eligibleSourceAccounts.accounts, selectedAccountId],
  );

  useEffect(() => {
    if (!visible || !payment) return;
    const paymentCurrency = payment.currency;
    const cardCurrency = payment.targetCreditCard?.currency ?? paymentCurrency;
    const knownAmount = payment.remaining ?? (payment.expectedAmountKnown && payment.expectedAmount ? payment.expectedAmount : '');
    setAmountText(knownAmount);
    setAmount(parseMoneyInputText(knownAmount, paymentCurrency as MoneyInputCurrencyCode));
    setDestinationAmountText(knownAmount);
    setDestinationAmount(parseMoneyInputText(knownAmount, cardCurrency as MoneyInputCurrencyCode));
    setPayChoice('full');
    setDate(todayDateOnly());
    setSelectedAccountId(null);
    setSubmitError(null);
  }, [visible, payment]);

  const applyFullChoice = (knownAmount: string) => {
    setAmountText(knownAmount);
    setAmount(parseMoneyInputText(knownAmount, sourceCurrencyCode as MoneyInputCurrencyCode));
    setDestinationAmountText(knownAmount);
    setDestinationAmount(parseMoneyInputText(knownAmount, destinationCurrencyCode as MoneyInputCurrencyCode));
  };

  const handlePayChoiceChange = (next: PayAmountChoice) => {
    setPayChoice(next);
    if (next === 'full' && remainingAmount) {
      applyFullChoice(remainingAmount);
    }
    setSubmitError(null);
  };

  const resetDraft = () => {
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setDestinationAmountText('');
    setDestinationAmount(parseMoneyInputText('', 'ARS'));
    setDate(todayDateOnly());
    setSelectedAccountId(null);
    setSubmitError(null);
    setSubmitting(false);
    setActivePicker(null);
    setAccountSelectorVisible(false);
  };

  const close = () => {
    if (submitting) return;
    resetDraft();
    onRequestClose();
  };

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
    setSubmitError(null);
  };

  const handleDestinationAmountChange = (next: MoneyInputParseResult) => {
    setDestinationAmountText(next.inputText);
    setDestinationAmount(next);
    setSubmitError(null);
  };

  const handleCurrencyChange = (nextCurrency: MoneyInputCurrencyCode) => {
    setAmount(parseMoneyInputText(amountText, nextCurrency));
    setSubmitError(null);
  };

  const handleOpenAccountSelector = () => {
    setAccountSelectorVisible(true);
  };

  const handleSelectAccount = (account: FinanceAccountDto | null) => {
    setSelectedAccountId(account?.id ?? null);
    setAccountSelectorVisible(false);
  };

  const settlementAmount = isCrossCurrency ? destinationAmount.technicalValue?.amount ?? null : amount.technicalValue?.amount ?? null;
  const exceedsRemaining = Boolean(
    remainingAmount &&
    settlementAmount &&
    compareDecimalStrings(settlementAmount, remainingAmount) > 0,
  );
  const canSubmit = Boolean(accessToken) && !contextUnavailable && !submitting && amount.isValid && (!isCrossCurrency || destinationAmount.isValid) && Boolean(selectedAccountId) && !exceedsRemaining;

  const submit = async () => {
    if (!canSubmit || !payment) return;
    Keyboard.dismiss();
    setSubmitError(null);

    if (!accessToken) {
      setSubmitError('Tu sesión no está disponible. Volvé a iniciar sesión.');
      return;
    }
    if (contextUnavailable) {
      setSubmitError('El contexto financiero cambió o no está disponible. Cerralo y volvé a abrirlo.');
      return;
    }
    if (!amount.technicalValue) {
      setSubmitError('Ingresá un monto mayor que cero.');
      return;
    }
    if (isCrossCurrency && !destinationAmount.technicalValue) {
      setSubmitError('Ingresá el monto que recibe la tarjeta.');
      return;
    }
    if (!selectedAccountId) {
      setSubmitError('Seleccioná la cuenta de origen para pagar la tarjeta.');
      return;
    }
    if (exceedsRemaining) {
      setSubmitError('El monto no puede superar lo que resta pagar.');
      return;
    }

    const payload = {
      sourceAmount: amount.technicalValue.amount,
      actualDate: date,
      sourceAccountId: selectedAccountId,
      ...(isCrossCurrency && destinationAmount.technicalValue ? { destinationAmount: destinationAmount.technicalValue.amount } : {}),
    };

    setSubmitting(true);
    try {
      await settleCreditCardPaymentDue(accessToken, contextType, payment.id, payload);
      resetDraft();
      onRequestClose();
      onSuccess();
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos pagar la tarjeta. Intenta de nuevo.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <FinanceFormFooter
      primaryTitle={payment?.isPartiallyPaid ? 'Pagar restante' : 'Pagar'}
      onPrimary={submit}
      onCancel={close}
      primaryDisabled={!canSubmit}
      loading={submitting}
      divided={false}
    />
  );

  if (!visible || !payment) return null;

  const fullAmountLabel = remainingAmount
    ? formatFinanceAmount(remainingAmount, destinationCurrencyCode, { sign: 'none' })
    : 'A confirmar';

  return (
    <ActionSheet
      visible={visible}
      title={payment.isPartiallyPaid
        ? `Pagar restante de ${payment.targetCreditCard?.name ?? 'tarjeta'}`
        : `Pagar ${payment.targetCreditCard?.name ?? 'tarjeta'}`}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={submitting}
      size={FINANCE_SHEET_SIZE_POLICY.MEDIUM_FORM}
      footer={footer}
    >
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.form}
      >
        <View style={styles.fieldGroup}>
          <AppText variant="body" weight="800" style={styles.paymentTitle}>
            {payment.title}
          </AppText>
          <View style={styles.expectedAmountRow}>
            <AppText variant="caption" tone="secondary">
              Resumen a pagar:
            </AppText>
            <AppText variant="body" weight="800" tone={payment.expectedAmountKnown ? 'primary' : 'secondary'}>
              {expectedAmountText}
            </AppText>
          </View>
          {hasProgress ? (
            <View style={styles.progressBox}>
              <View style={styles.progressRow}>
                <AppText variant="caption" tone="secondary" weight="700">Pagado</AppText>
                <AppText variant="bodySmall" weight="800" tone="success">{paidSoFarText}</AppText>
              </View>
              <View style={styles.progressRow}>
                <AppText variant="caption" tone="secondary" weight="700">Restante</AppText>
                <AppText variant="bodySmall" weight="800">{remainingAmountText}</AppText>
              </View>
            </View>
          ) : null}
          <View style={styles.dueRow}>
            <AppText variant="caption" tone="secondary">
              Vence
            </AppText>
            <AppText variant="bodySmall" weight={payment.overdue ? '800' : '600'} tone={payment.overdue ? 'danger' : 'secondary'}>
              {formatDueDateHuman(payment.dueDate, payment.overdue)}
            </AppText>
          </View>
        </View>

        <FinanceInlineChoice
          label="Monto a pagar"
          value={payChoice}
          options={[
            { value: 'full', label: 'Pago completo' },
            { value: 'other', label: 'Otro monto' },
          ]}
          onChange={handlePayChoiceChange}
          testID="pay-credit-card-amount-choice"
        />

        <FinanceSelectionRow
          label="Desde"
          value={selectedSourceAccount ? `${selectedSourceAccount.name} · ${selectedSourceAccount.currency}` : 'Seleccionar cuenta'}
          onPress={handleOpenAccountSelector}
          disabled={submitting || eligibleSourceAccounts.loading}
          accessibilityLabel="Elegir cuenta de origen para el pago"
        />
        {eligibleSourceAccounts.error ? (
          <AppText variant="caption" tone="warning">{eligibleSourceAccounts.error}</AppText>
        ) : null}
        {eligibleSourceAccounts.loading && !selectedSourceAccount ? (
          <AppText variant="caption" tone="tertiary">Cargando cuentas disponibles...</AppText>
        ) : null}
        {eligibleSourceAccounts.accounts.length === 0 && !eligibleSourceAccounts.loading ? (
          <AppText variant="caption" tone="warning">No tenés cuentas disponibles para pagar esta tarjeta.</AppText>
        ) : null}

        {payChoice === 'full' ? (
          <FinanceListRow
            title={isCrossCurrency ? 'Llega a la tarjeta' : 'Monto'}
            value={fullAmountLabel}
            divider={false}
            testID="pay-credit-card-full-amount"
          />
        ) : (
          isCrossCurrency ? null : (
            <MoneyInput
              value={amountText}
              currency={sourceCurrencyCode as MoneyInputCurrencyCode}
              onValueChange={handleAmountChange}
              onCurrencyChange={handleCurrencyChange}
              availableCurrencies={[sourceCurrencyCode as MoneyInputCurrencyCode]}
              label="Monto a pagar"
              helperText="No puede superar lo que resta pagar."
              disabled={submitting}
              errorText={amount.status === 'invalid' ? 'Revisá el monto.' : exceedsRemaining ? 'El monto no puede superar lo que resta pagar.' : undefined}
            />
          )
        )}

        {isCrossCurrency ? (
          <View style={styles.fieldGroup}>
            <MoneyInput
              value={amountText}
              currency={sourceCurrencyCode as MoneyInputCurrencyCode}
              onValueChange={handleAmountChange}
              onCurrencyChange={handleCurrencyChange}
              availableCurrencies={[sourceCurrencyCode as MoneyInputCurrencyCode]}
              label="Sale"
              helperText="Monto que se debita de la cuenta de origen. No calculamos tipo de cambio."
              disabled={submitting}
              errorText={amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
            />
            {payChoice === 'other' ? (
              <MoneyInput
                value={destinationAmountText}
                currency={destinationCurrencyCode as MoneyInputCurrencyCode}
                onValueChange={handleDestinationAmountChange}
                onCurrencyChange={() => undefined}
                availableCurrencies={[destinationCurrencyCode as MoneyInputCurrencyCode]}
                label="Llega"
                helperText="Monto que recibe la tarjeta. No puede superar lo que resta pagar."
                disabled={submitting}
                errorText={destinationAmount.status === 'invalid' ? 'Revisá el monto.' : exceedsRemaining ? 'El monto no puede superar lo que resta pagar.' : undefined}
              />
            ) : null}
          </View>
        ) : null}

        <FinanceSelectionRow
          label="Fecha"
          value={formatHumanDate(date)}
          onPress={() => setActivePicker('date')}
          disabled={submitting}
          accessibilityLabel={`Fecha de pago ${formatHumanDate(date)}`}
        />

        {submitError ? (
          <FinanceErrorState level="form" message={submitError} />
        ) : null}
      </KeyboardAwareScrollView>

      <DatePickerSheet
        visible={activePicker === 'date'}
        value={date}
        onClose={() => setActivePicker(null)}
        onConfirm={(nextDate) => { setDate(nextDate > todayDateOnly() ? todayDateOnly() : nextDate); setActivePicker(null); }}
      />

      <AccountSelector
        visible={accountSelectorVisible}
        title="Cuenta de origen"
        subtitle="Cuenta desde la que se paga la tarjeta"
        accounts={eligibleSourceAccounts.accounts}
        loading={eligibleSourceAccounts.loading}
        error={eligibleSourceAccounts.error}
        selectedAccountId={selectedAccountId}
        allowNone={false}
        activeHousehold={activeHousehold}
        disabled={submitting}
        operationHint="transfer-source"
        onRequestClose={() => setAccountSelectorVisible(false)}
        onSelect={handleSelectAccount}
      />
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    form: {
      gap: spacing[4],
      paddingBottom: spacing[4],
    },
    fieldGroup: {
      gap: spacing[2],
    },
    paymentTitle: {
      marginBottom: spacing[1],
    },
    expectedAmountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    dueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    progressBox: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      backgroundColor: colors.surface.soft,
      padding: spacing[3],
      gap: spacing[1],
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing[3],
    },
  });
}
