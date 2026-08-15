import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ApiError } from '../../services/api';
import {
  createFinanceAccountBalanceAnchor,
  correctFinanceAccountBalance,
  type FinanceAccountDto,
} from '../../services/finance/financeAccounts';
import { parseMoneyInputText, type MoneyInputCurrencyCode, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import {
  compareDecimalStrings,
  subtractDecimalStrings,
  getAccountBalancePresentation,
  formatCanonicalAmountForDisplay,
  toCanonicalSignedAccountBalance,
} from '../../services/finance/accountDisplay';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  ActionSheet,
  AppButton,
  AppText,
  FormActionRow,
  formatHumanDate,
} from '../ui';
import { MoneyInput } from './MoneyInput';

const todayLocalDateOnly = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function formatAmountDisplay(amount: string, currency: string): string {
  return `${currency} ${formatCanonicalAmountForDisplay(amount)}`;
}

/**
 * Canonical signed adapter for a CREDIT_CARD balance input.
 *
 * Product contract (Stage 3H §5/§6/handoff): backend canonical Account
 * Balance is signed; CREDIT_CARD debt is represented as a NEGATIVE signed
 * balance. The user enters a positive debt magnitude in the UI ("Deuda
 * actual 70000"); the frontend adapter MUST submit canonical "-70000" to
 * the backend, never "70000", "-7" or "7".
 *
 * For a regular ACCOUNT this helper is a no-op (the user-facing positive
 * balance is the canonical positive balance).
 */
type CommonProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  account: FinanceAccountDto | null;
  onRequestClose: () => void;
  onSuccess: (account: FinanceAccountDto) => void;
};

export type BalanceAnchorSheetProps = CommonProps;

export function BalanceAnchorSheet({
  visible,
  accessToken,
  contextType,
  account,
  onRequestClose,
  onSuccess,
}: BalanceAnchorSheetProps) {
  const [amountText, setAmountText] = useState('');
  const lastCurrencyRef = React.useRef<MoneyInputCurrencyCode>(account?.currency ?? 'ARS');
  if (account?.currency) lastCurrencyRef.current = account.currency;
  const currency = lastCurrencyRef.current;
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const balanceLabel = account?.accountType === 'CREDIT_CARD' ? 'Deuda actual' : 'Saldo actual';
  const canonicalAmount = amount.technicalValue?.amount ?? (amount.status === 'zero' ? amount.canonicalAmount : null);
  const canSubmit = Boolean(accessToken) && Boolean(account) && canonicalAmount !== null && !submitting;

  useEffect(() => {
    if (!visible) {
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [visible, currency]);

  const close = () => {
    if (submitting) return;
    setAmountText('');
    setAmount(parseMoneyInputText('', currency));
    setSubmitError(null);
    onRequestClose();
  };

  const submit = async () => {
    if (submitting || !accessToken || !account || canonicalAmount === null) return;
    Keyboard.dismiss();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const response = await createFinanceAccountBalanceAnchor(accessToken, account.id, {
        amount: toCanonicalSignedAccountBalance(canonicalAmount, account.accountType),
        effectiveDate: todayLocalDateOnly(),
        contextType,
      });
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
      onRequestClose();
      onSuccess(response.account);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos establecer el saldo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionSheet
      visible={visible}
      title="Establecer saldo"
      subtitle={`Se aplica a ${account?.name ?? 'la cuenta'}`}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={(
        <View style={styles.footer}>
          <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
          <AppButton title="Establecer" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
        </View>
      )}
    >
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.form}
      >
        <AppText variant="caption" tone="tertiary">
          La cuenta está en estado Unknown. Ingresá el {balanceLabel.toLowerCase()} real de hoy para anclarla.
        </AppText>

        <MoneyInput
          value={amountText}
          currency={currency}
          onValueChange={(next) => { setAmountText(next.inputText); setAmount(next); setSubmitError(null); }}
          onCurrencyChange={() => undefined}
          availableCurrencies={[currency]}
          label={balanceLabel}
          helperText="Magnitud positiva, sin signo."
          disabled={submitting}
          errorText={amount.status === 'invalid' ? 'Revisa el monto.' : undefined}
        />

        <FormActionRow
          label="Fecha"
          value={formatHumanDate(todayLocalDateOnly())}
          onPress={() => undefined}
          disabled
          accessibilityLabel="Fecha del anchor (hoy)"
        />

        {submitError ? (
          <View style={styles.errorBox}>
            <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
            <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </ActionSheet>
  );
}

export type BalanceCorrectionSheetProps = CommonProps;

export function BalanceCorrectionSheet({
  visible,
  accessToken,
  contextType,
  account,
  onRequestClose,
  onSuccess,
}: BalanceCorrectionSheetProps) {
  const [amountText, setAmountText] = useState('');
  const lastCurrencyRef = React.useRef<MoneyInputCurrencyCode>(account?.currency ?? 'ARS');
  if (account?.currency) lastCurrencyRef.current = account.currency;
  const currency = lastCurrencyRef.current;
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const presentation = account ? getAccountBalancePresentation(account) : null;
  const homePlusAmount = presentation?.displayAmount ?? '0';
  const homePlusDisplay = presentation && presentation.displayAmount !== null
    ? formatAmountDisplay(presentation.displayAmount, currency)
    : '';
  const canonicalAmount = amount.technicalValue?.amount ?? (amount.status === 'zero' ? amount.canonicalAmount : null);
  const realAmount = canonicalAmount ?? '';
  const difference = computeDifference(homePlusAmount, realAmount);
  const isCreditCard = account?.accountType === 'CREDIT_CARD';
  const balanceLabel = isCreditCard ? 'Deuda real' : 'Saldo real';
  const canSubmit = Boolean(accessToken) && Boolean(account) && canonicalAmount !== null && !submitting;

  useEffect(() => {
    if (!visible) {
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [visible, currency]);

  const close = () => {
    if (submitting) return;
    setAmountText('');
    setAmount(parseMoneyInputText('', currency));
    setSubmitError(null);
    onRequestClose();
  };

  const submit = async () => {
    if (submitting || !accessToken || !account || canonicalAmount === null) return;
    Keyboard.dismiss();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const response = await correctFinanceAccountBalance(accessToken, account.id, {
        correctedBalance: toCanonicalSignedAccountBalance(canonicalAmount, account.accountType),
        effectiveDate: todayLocalDateOnly(),
        contextType,
      });
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
      onRequestClose();
      onSuccess(response.account);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos corregir el saldo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionSheet
      visible={visible}
      title="Corregir saldo"
      subtitle={`Se aplica a ${account?.name ?? 'la cuenta'}`}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={(
        <View style={styles.footer}>
          <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
          <AppButton title="Corregir" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
        </View>
      )}
    >
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.form}
      >
        <AppText variant="caption" tone="tertiary">
          Esta corrección no se contará como gasto ni ingreso. Solo ajustamos el saldo para que coincida con la realidad.
        </AppText>

        <View style={styles.row}>
          <AppText variant="caption" tone="secondary" weight="700">
            {isCreditCard ? 'Deuda en HomePlus' : 'Saldo en HomePlus'}
          </AppText>
          <AppText variant="body" weight="800">{homePlusDisplay}</AppText>
        </View>

        <MoneyInput
          value={amountText}
          currency={currency}
          onValueChange={(next) => { setAmountText(next.inputText); setAmount(next); setSubmitError(null); }}
          onCurrencyChange={() => undefined}
          availableCurrencies={[currency]}
          label={balanceLabel}
          helperText="Magnitud positiva, sin signo."
          disabled={submitting}
          errorText={amount.status === 'invalid' ? 'Revisa el monto.' : undefined}
        />

        {canonicalAmount !== null && presentation ? (
          <View style={styles.row}>
            <AppText variant="caption" tone="secondary" weight="700">Diferencia</AppText>
            <AppText
              variant="body"
              weight="800"
              tone={difference.startsWith('+') ? 'success' : difference.startsWith('-') ? 'danger' : 'primary'}
            >
              {formatAmountDisplay(difference.replace(/^[+-]/, '') || '0', currency)}
            </AppText>
          </View>
        ) : null}

        <FormActionRow
          label="Fecha"
          value={formatHumanDate(todayLocalDateOnly())}
          onPress={() => undefined}
          disabled
          accessibilityLabel="Fecha de la correccion (hoy)"
        />

        {submitError ? (
          <View style={styles.errorBox}>
            <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
            <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </ActionSheet>
  );
}

function computeDifference(homePlusAmount: string, realAmount: string): string {
  if (!homePlusAmount || !realAmount) return '';
  try {
    const comparison = compareDecimalStrings(homePlusAmount, realAmount);
    if (comparison === 0) return '0';
    if (comparison < 0) return `+${subtractDecimalStrings(realAmount, homePlusAmount)}`;
    return `-${subtractDecimalStrings(homePlusAmount, realAmount)}`;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  form: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  row: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
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
