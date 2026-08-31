import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { ApiError } from '../../services/api';
import type { FinanceContextType, FinanceContextViewState, FinanceActiveHousehold } from '../../services/finance/financeContext';
import {
  registerCreditCardPayment,
  type PaymentDueDto,
  PAYMENT_KINDS,
  formatExpectedAmount,
} from '../../services/finance/financePayments';
import { type FinanceAccountDto } from '../../services/finance/financeAccounts';
import { useEligibleAccounts } from '../../services/finance/financeAccountEligibility';
import {
  DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS,
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from '../../services/finance/moneyInputValue';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
  DatePickerSheet,
  FormActionRow,
  InteractivePressable,
  formatHumanDate,
} from '../ui';
import { todayDateOnly } from '../../services/finance/financeDate';
import { MoneyInput } from './MoneyInput';
import { AccountSelector } from './AccountSelector';

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
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [destinationAmountText, setDestinationAmountText] = useState('');
  const [destinationAmount, setDestinationAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [destinationCurrency, setDestinationCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [date, setDate] = useState(todayDateOnly);
  const [activePicker, setActivePicker] = useState<'date' | 'sourceAccount' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountSelectorVisible, setAccountSelectorVisible] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const contextKeyRef = useRef(`${contextType}:${payment?.id}`);

  const isCrossCurrency = payment?.targetCreditCard && payment.currency !== payment.targetCreditCard.currency;
  const destinationCurrencyCode = payment?.targetCreditCard?.currency ?? payment?.currency ?? 'ARS';
  const sourceCurrencyCode = payment?.currency ?? 'ARS';

  const expectedAmountText = useMemo(
    () => formatExpectedAmount(payment?.expectedAmountKnown ?? true, payment?.expectedAmount ?? null, destinationCurrencyCode),
    [payment?.expectedAmountKnown, payment?.expectedAmount, destinationCurrencyCode],
  );

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
    const knownAmount = payment.expectedAmountKnown && payment.expectedAmount ? payment.expectedAmount : '';
    setAmountText(knownAmount);
    setAmount(parseMoneyInputText(knownAmount, paymentCurrency as MoneyInputCurrencyCode));
    setCurrency(paymentCurrency as MoneyInputCurrencyCode);
    setDestinationAmountText(knownAmount);
    setDestinationAmount(parseMoneyInputText(knownAmount, cardCurrency as MoneyInputCurrencyCode));
    setDestinationCurrency(cardCurrency as MoneyInputCurrencyCode);
    setDate(todayDateOnly());
    setSelectedAccountId(null);
    setSubmitError(null);
  }, [visible, payment]);

  const resetDraft = () => {
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setCurrency('ARS');
    setDestinationAmountText('');
    setDestinationAmount(parseMoneyInputText('', 'ARS'));
    setDestinationCurrency('ARS');
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
    setCurrency(nextCurrency);
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

  const canSubmit = Boolean(accessToken) && !contextUnavailable && !submitting && amount.isValid && (!isCrossCurrency || destinationAmount.isValid) && Boolean(selectedAccountId);

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

    const payload = {
      actualAmount: amount.technicalValue.amount,
      actualDate: date,
      sourceAccountId: selectedAccountId,
      ...(isCrossCurrency && destinationAmount.technicalValue ? { destinationAmount: destinationAmount.technicalValue.amount } : {}),
    };

    setSubmitting(true);
    try {
      await registerCreditCardPayment(accessToken, contextType, payment.id, payload);
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
    <View style={styles.footer}>
      <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
      <AppButton title="Pagar tarjeta" onPress={submit} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
    </View>
  );

  if (!visible || !payment) return null;

  return (
    <ActionSheet
      visible={visible}
      title="Pagar tarjeta"
      subtitle={payment.title}
      onRequestClose={close}
      closeDisabled={submitting}
      footer={footer}
    >
      <View style={styles.sheetBody}>
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
                Esperado:
              </AppText>
              <AppText variant="body" weight="800" tone={payment.expectedAmountKnown ? 'primary' : 'secondary'}>
                {expectedAmountText}
              </AppText>
            </View>
            {payment.paymentSeriesId && (
              <AppText variant="caption" tone="secondary" style={styles.recurrenceHint}>
                Parte de una serie recurrente
              </AppText>
            )}
            <View style={styles.destinationCardRow}>
              <AppText variant="caption" tone="secondary" weight="700">
                Pagar a
              </AppText>
              <AppText variant="body" weight="800" tone="primary">
                {payment.targetCreditCard?.name ?? 'Tarjeta de crédito'}
              </AppText>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="secondary" weight="700" style={styles.amountSectionLabel}>
              Monto a acreditar en la tarjeta
            </AppText>
            <MoneyInput
              value={destinationAmountText}
              currency={destinationCurrencyCode as MoneyInputCurrencyCode}
              onValueChange={handleDestinationAmountChange}
              onCurrencyChange={() => undefined}
              availableCurrencies={[destinationCurrencyCode as MoneyInputCurrencyCode]}
              label={isCrossCurrency ? `Monto en ${destinationCurrencyCode}` : 'Monto'}
              helperText={isCrossCurrency ? 'Monto que recibirá la tarjeta en su moneda' : 'Magnitud positiva.'}
              disabled={submitting}
              errorText={destinationAmount.status === 'invalid' ? 'Revisá el monto.' : undefined}
            />
          </View>

          {isCrossCurrency && (
            <View style={styles.fieldGroup}>
              <AppText variant="caption" tone="secondary" weight="700" style={styles.amountSectionLabel}>
                Monto que sale de la cuenta de origen
              </AppText>
              <MoneyInput
                value={amountText}
                currency={sourceCurrencyCode as MoneyInputCurrencyCode}
                onValueChange={handleAmountChange}
                onCurrencyChange={handleCurrencyChange}
                availableCurrencies={[sourceCurrencyCode as MoneyInputCurrencyCode]}
                label={`Monto en ${sourceCurrencyCode}`}
                helperText='Monto que se debitará de la cuenta de origen en su moneda'
                disabled={submitting}
                errorText={amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
              />
            </View>
          )}

          {!isCrossCurrency && (
            <View style={styles.fieldGroup}>
              <MoneyInput
                value={amountText}
                currency={sourceCurrencyCode as MoneyInputCurrencyCode}
                onValueChange={handleAmountChange}
                onCurrencyChange={handleCurrencyChange}
                availableCurrencies={[sourceCurrencyCode as MoneyInputCurrencyCode]}
                label="Monto a pagar"
                helperText='Magnitud positiva. Podés ajustar respecto al esperado.'
                disabled={submitting}
                errorText={amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Fecha"
              value={formatHumanDate(date)}
              onPress={() => setActivePicker('date')}
              disabled={submitting}
              accessibilityLabel={`Fecha de pago ${formatHumanDate(date)}`}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Pagar desde"
              value={selectedSourceAccount ? `${selectedSourceAccount.name} · ${selectedSourceAccount.currency}` : 'Seleccionar cuenta'}
              onPress={handleOpenAccountSelector}
              disabled={submitting || eligibleSourceAccounts.loading}
              accessibilityLabel="Elegir cuenta de origen para el pago"
            />
            {eligibleSourceAccounts.error && (
              <AppText variant="caption" tone="warning">{eligibleSourceAccounts.error}</AppText>
            )}
            {eligibleSourceAccounts.loading && !selectedSourceAccount && (
              <AppText variant="caption" tone="tertiary">Cargando cuentas disponibles...</AppText>
            )}
            {eligibleSourceAccounts.accounts.length === 0 && !eligibleSourceAccounts.loading && (
              <AppText variant="caption" tone="warning">No tenés cuentas disponibles para pagar esta tarjeta.</AppText>
            )}
          </View>

          {submitError ? (
            <View style={styles.errorBox}>
              <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
              <AppText variant="bodySmall" tone="danger" style={styles.errorText}>
                {submitError}
              </AppText>
            </View>
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
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1,
    position: 'relative',
  },
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
  recurrenceHint: {
    marginTop: spacing[1],
  },
  destinationCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  amountSectionLabel: {
    marginBottom: spacing[1],
  },
  errorBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  errorText: {
    flex: 1,
    minWidth: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  footerButton: {
    flex: 1,
  },
});