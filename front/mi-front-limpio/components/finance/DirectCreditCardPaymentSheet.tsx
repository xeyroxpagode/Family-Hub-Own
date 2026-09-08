import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import type { FinanceActiveHousehold, FinanceContextType, FinanceContextViewState } from '../../services/finance/financeContext';
import type { FinanceAccountDto } from '../../services/finance/financeAccounts';
import { getAccountBalancePresentation, formatAccountPresentationAmount } from '../../services/finance/accountDisplay';
import { useEligibleAccounts } from '../../services/finance/financeAccountEligibility';
import { createFinanceTransfer, buildTransferPayloadSignature, useStableTransferMutationIdentity } from '../../services/finance/financeTransfers';
import { parseMoneyInputText, type MoneyInputCurrencyCode, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import { ActionSheet, AppButton, AppText, DatePickerSheet, FormActionRow, formatHumanDate } from '../ui';
import { todayDateOnly } from '../../services/finance/financeDate';
import { MoneyInput } from './MoneyInput';
import { AccountSelector } from './AccountSelector';

type Props = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  contextState: FinanceContextViewState;
  activeHousehold: FinanceActiveHousehold;
  card: FinanceAccountDto | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function DirectCreditCardPaymentSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  contextState,
  activeHousehold,
  card,
  onRequestClose,
  onSuccess,
}: Props) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const [cardAmountText, setCardAmountText] = useState('');
  const [cardAmount, setCardAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [sourceAmountText, setSourceAmountText] = useState('');
  const [sourceAmount, setSourceAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [date, setDate] = useState(todayDateOnly);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [accountSelectorVisible, setAccountSelectorVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cardCurrency = (card?.currency ?? 'ARS') as MoneyInputCurrencyCode;
  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';
  const accountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && Boolean(card),
    operation: 'transfer-source',
    contextType,
    transactionCurrency: null,
    activeHousehold,
  });
  const selectedSourceAccount = useMemo(
    () => accountsState.accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accountsState.accounts, selectedAccountId],
  );
  const isCrossCurrency = Boolean(selectedSourceAccount && card && selectedSourceAccount.currency !== card.currency);
  const effectiveSourceAmount = isCrossCurrency ? sourceAmount : cardAmount;
  const effectiveSourceAmountText = isCrossCurrency ? sourceAmountText : cardAmountText;
  const transferSignature = buildTransferPayloadSignature({
    sourceAccount: selectedSourceAccount?.id ?? '',
    destinationAccount: card?.id ?? '',
    sourceAmount: effectiveSourceAmount.technicalValue?.amount ?? '',
    destinationAmount: cardAmount.technicalValue?.amount ?? '',
    commissionAmount: '',
    date,
  });
  const transferIdentity = useStableTransferMutationIdentity(transferSignature);

  const currentDebtLabel = useMemo(() => {
    if (!card) return null;
    const presentation = getAccountBalancePresentation(card);
    if (presentation.isUnknown) return presentation.unknownLabel;
    if (presentation.isDebt) return `${card.currency} ${formatAccountPresentationAmount(presentation)}`;
    if (presentation.isCreditEdgePositive) return `Saldo a favor ${card.currency} ${formatAccountPresentationAmount(presentation)}`;
    return 'Sin deuda actual';
  }, [card]);

  useEffect(() => {
    if (!visible || !card) return;
    const presentation = getAccountBalancePresentation(card);
    const prefill = !presentation.isUnknown && presentation.isDebt && presentation.displayAmount
      ? presentation.displayAmount
      : '';
    setCardAmountText(prefill);
    setCardAmount(parseMoneyInputText(prefill, card.currency as MoneyInputCurrencyCode));
    setSourceAmountText('');
    setSourceAmount(parseMoneyInputText('', 'ARS'));
    setSelectedAccountId(null);
    setDate(todayDateOnly());
    setSubmitError(null);
    setSubmitting(false);
  }, [visible, card]);

  const close = () => {
    if (submitting) return;
    onRequestClose();
  };

  const canSubmit = Boolean(accessToken)
    && !contextUnavailable
    && !submitting
    && Boolean(card)
    && Boolean(selectedSourceAccount)
    && cardAmount.isValid
    && effectiveSourceAmount.isValid;

  const submit = async () => {
    if (!canSubmit || !accessToken || !card || !selectedSourceAccount || !cardAmount.technicalValue || !effectiveSourceAmount.technicalValue) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createFinanceTransfer(accessToken, {
        sourceAccount: selectedSourceAccount.id,
        destinationAccount: card.id,
        sourceAmount: effectiveSourceAmount.technicalValue.amount,
        destinationAmount: cardAmount.technicalValue.amount,
        date,
        description: `Pago ${card.name}`,
        notes: null,
        commissionAmount: null,
        contextType,
      }, transferIdentity);
      onRequestClose();
      onSuccess();
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos pagar la tarjeta. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !card) return null;

  return (
    <ActionSheet
      visible={visible}
      title={`Pagar ${card.name}`}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={submitting}
      footer={(
        <View style={styles.footer}>
          <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
          <AppButton title="Pagar tarjeta" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
        </View>
      )}
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
          <View style={styles.summaryBox}>
            <AppText variant="caption" tone="secondary" weight="700">Deuda actual registrada</AppText>
            <AppText variant="title3" weight="800">{currentDebtLabel}</AppText>
          </View>

          <FormActionRow
            label="Desde"
            value={selectedSourceAccount ? `${selectedSourceAccount.name} · ${selectedSourceAccount.currency}` : 'Seleccionar cuenta'}
            onPress={() => setAccountSelectorVisible(true)}
            disabled={submitting || accountsState.loading}
            accessibilityLabel="Elegir cuenta desde la que se paga la tarjeta"
          />

          <MoneyInput
            value={cardAmountText}
            currency={cardCurrency}
            onValueChange={(next) => { setCardAmountText(next.inputText); setCardAmount(next); setSubmitError(null); }}
            onCurrencyChange={() => undefined}
            availableCurrencies={[cardCurrency]}
            label="Monto para la tarjeta"
            helperText="Podés pagar parcial, total o de más."
            disabled={submitting}
            errorText={cardAmount.status === 'invalid' ? 'Revisá el monto.' : undefined}
          />

          {isCrossCurrency && selectedSourceAccount ? (
            <MoneyInput
              value={sourceAmountText}
              currency={selectedSourceAccount.currency as MoneyInputCurrencyCode}
              onValueChange={(next) => { setSourceAmountText(next.inputText); setSourceAmount(next); setSubmitError(null); }}
              onCurrencyChange={() => undefined}
              availableCurrencies={[selectedSourceAccount.currency as MoneyInputCurrencyCode]}
              label="Monto que sale"
              helperText="No calculamos tipo de cambio. Ingresá lo que debitó tu cuenta."
              disabled={submitting}
              errorText={sourceAmount.status === 'invalid' ? 'Revisá el monto.' : undefined}
            />
          ) : null}

          <FormActionRow
            label="Fecha"
            value={formatHumanDate(date)}
            onPress={() => setDatePickerVisible(true)}
            disabled={submitting}
            accessibilityLabel={`Fecha de pago ${formatHumanDate(date)}`}
          />

          {accountsState.error ? <AppText variant="caption" tone="warning">{accountsState.error}</AppText> : null}
          {accountsState.accounts.length === 0 && !accountsState.loading ? (
            <AppText variant="caption" tone="warning">No tenés cuentas disponibles para pagar esta tarjeta.</AppText>
          ) : null}

          {submitError ? (
            <View style={styles.errorBox}>
              <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
              <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
            </View>
          ) : null}
        </KeyboardAwareScrollView>

        <DatePickerSheet
          visible={datePickerVisible}
          value={date}
          onClose={() => setDatePickerVisible(false)}
          onConfirm={(nextDate) => { setDate(nextDate > todayDateOnly() ? todayDateOnly() : nextDate); setDatePickerVisible(false); }}
        />

        <AccountSelector
          visible={accountSelectorVisible}
          title="Cuenta de origen"
          subtitle="Cuenta desde la que se paga la tarjeta"
          accounts={accountsState.accounts.filter((account) => account.id !== card.id)}
          loading={accountsState.loading}
          error={accountsState.error}
          selectedAccountId={selectedAccountId}
          allowNone={false}
          activeHousehold={activeHousehold}
          disabled={submitting}
          operationHint="transfer-source"
          onRequestClose={() => setAccountSelectorVisible(false)}
          onSelect={(account) => {
            setSelectedAccountId(account?.id ?? null);
            setSourceAmountText('');
            setSourceAmount(parseMoneyInputText('', (account?.currency ?? 'ARS') as MoneyInputCurrencyCode));
            setSubmitError(null);
            setAccountSelectorVisible(false);
          }}
        />
      </View>
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;

  return StyleSheet.create({
    sheetBody: {
      flex: 1,
      position: 'relative',
    },
    form: {
      gap: spacing[4],
      paddingBottom: spacing[4],
    },
    summaryBox: {
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      backgroundColor: colors.surface.card,
      padding: spacing[4],
      gap: spacing[1],
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
}
