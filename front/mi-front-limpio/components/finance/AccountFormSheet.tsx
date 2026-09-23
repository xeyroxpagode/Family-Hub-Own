import React, { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ApiError } from '../../services/api';
import {
  createFinanceAccount,
  FINANCE_ACCOUNT_TYPES,
  type CreateFinanceAccountResponse,
  type FinanceAccountDto,
  type FinanceAccountType,
} from '../../services/finance/financeAccounts';
import { DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS, parseMoneyInputText, type MoneyInputCurrencyCode, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import { toCanonicalSignedAccountBalance } from '../../services/finance/accountDisplay';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  ActionSheet,
  AppText,
  AppInput,
} from '../ui';
import { MoneyInput } from './MoneyInput';
import {
  FinanceErrorState,
  FinanceFormFooter,
  FinanceInlineChoice,
  FinanceSegmented,
  FinanceSelectionRow,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';

const SUPPORTED_CURRENCIES = DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS;

const todayLocalDateOnly = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const DAY_TEXT_RE = /^\d{1,2}$/;

function parseDayText(text: string): number | null {
  const trimmed = text.trim();
  if (!DAY_TEXT_RE.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1 || value > 31) return null;
  return value;
}

const STARTING_DRAFT = {
  accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT as FinanceAccountType,
  currency: 'ARS' as MoneyInputCurrencyCode,
};

export type AccountFormSheetProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  initialAccountType?: FinanceAccountType;
  onRequestClose: () => void;
  onSuccess: (account: FinanceAccountDto) => void;
};

export function AccountFormSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  initialAccountType,
  onRequestClose,
  onSuccess,
}: AccountFormSheetProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const startingAccountType = initialAccountType ?? STARTING_DRAFT.accountType;
  const startingAmountText = '0';
  const [accountType, setAccountType] = useState<FinanceAccountType>(startingAccountType);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>(STARTING_DRAFT.currency);
  const [currencyExpanded, setCurrencyExpanded] = useState(false);
  const [amountText, setAmountText] = useState(startingAmountText);
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText(startingAmountText, STARTING_DRAFT.currency));
  const [closingDayText, setClosingDayText] = useState('');
  const [dueDayText, setDueDayText] = useState('');
  const [closingDayTouched, setClosingDayTouched] = useState(false);
  const [dueDayTouched, setDueDayTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCreditCard = accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD;
  const balanceLabel = isCreditCard ? 'Deuda actual' : 'Saldo actual';
  const canonicalInitialAmount = amount.technicalValue?.amount
    ?? (amount.status === 'zero' ? amount.canonicalAmount : null)
    ?? (!amountText.trim() ? '0' : null);
  const closingDay = parseDayText(closingDayText);
  const dueDay = parseDayText(dueDayText);
  const closingDayInvalid = isCreditCard && closingDay === null;
  const dueDayInvalid = isCreditCard && dueDay === null;
  const closingDayError = closingDayInvalid && (closingDayTouched || submitAttempted)
    ? 'Ingresá un día de cierre entre 1 y 31.'
    : undefined;
  const dueDayError = dueDayInvalid && (dueDayTouched || submitAttempted)
    ? 'Ingresá un día de vencimiento entre 1 y 31.'
    : undefined;
  const canSubmitEdit =
    Boolean(accessToken) && !submitting && name.trim().length > 0 &&
    canonicalInitialAmount !== null;

  const resetDraft = () => {
    setAccountType(startingAccountType);
    setName('');
    setCurrency(STARTING_DRAFT.currency);
    setAmountText(startingAmountText);
    setAmount(parseMoneyInputText(startingAmountText, STARTING_DRAFT.currency));
    setClosingDayText('');
    setDueDayText('');
    setClosingDayTouched(false);
    setDueDayTouched(false);
    setSubmitAttempted(false);
    setCurrencyExpanded(false);
    setSubmitError(null);
    setSubmitting(false);
  };

  const closeIfAllowed = () => {
    if (submitting) return;
    resetDraft();
    onRequestClose();
  };

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
    setSubmitError(null);
  };

  const chooseAccountType = (nextType: FinanceAccountType) => {
    setAccountType(nextType);
    setAmountText('0');
    setAmount(parseMoneyInputText('0', currency));
    setClosingDayText('');
    setDueDayText('');
    setClosingDayTouched(false);
    setDueDayTouched(false);
    setSubmitAttempted(false);
    setSubmitError(null);
  };

  const chooseCurrency = (nextCurrency: MoneyInputCurrencyCode) => {
    setCurrency(nextCurrency);
    setAmountText('');
    setAmount(parseMoneyInputText('', nextCurrency));
    setCurrencyExpanded(false);
    setSubmitError(null);
  };

  const submit = async () => {
    if (submitting) return;
    Keyboard.dismiss();
    setSubmitAttempted(true);
    setSubmitError(null);

    if (!accessToken) {
      setSubmitError('Tu sesion no esta disponible. Volve a iniciar sesion.');
      return;
    }

    const draftName = name.trim();
    if (!draftName) {
      setSubmitError('Ingresa un nombre para la cuenta.');
      return;
    }

    if (canonicalInitialAmount === null) {
      setSubmitError('Ingresa un saldo valido, incluso si es cero.');
      return;
    }

    if (closingDayInvalid || dueDayInvalid) {
      setSubmitError(closingDayInvalid ? 'Ingresá un día de cierre entre 1 y 31.' : 'Ingresá un día de vencimiento entre 1 y 31.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: draftName,
        currency,
        accountType,
        contextType,
        initialBalance: {
          amount: toCanonicalSignedAccountBalance(canonicalInitialAmount, accountType),
          effectiveDate: todayLocalDateOnly(),
        },
        ...(isCreditCard ? { closingDay, dueDay } : {}),
      };
      const response: CreateFinanceAccountResponse = await createFinanceAccount(accessToken, payload);
      const created = response.account;
      resetDraft();
      onRequestClose();
      onSuccess(created);
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos crear la cuenta. Intenta de nuevo.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <FinanceFormFooter
      primaryTitle={isCreditCard ? 'Crear tarjeta' : 'Crear cuenta'}
      onPrimary={() => void submit()}
      onCancel={closeIfAllowed}
      primaryDisabled={!canSubmitEdit}
      loading={submitting}
      divided={false}
    />
  );

  const body = (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={40}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.form}
    >
      <View style={styles.accountTypeField}>
        <AppText variant="caption" tone="secondary" weight="700">Tipo</AppText>
        <FinanceSegmented
          variant="standard"
          distribution="equal"
          value={accountType}
          options={[
            { value: FINANCE_ACCOUNT_TYPES.ACCOUNT, label: 'Cuenta' },
            { value: FINANCE_ACCOUNT_TYPES.CREDIT_CARD, label: 'Tarjeta de crédito' },
          ]}
          onChange={chooseAccountType}
        />
      </View>

      <AppInput
        label="Nombre"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setSubmitError(null);
        }}
        placeholder="Mercado Pago, Brubank, Ahorros USD"
        editable={!submitting}
        returnKeyType="done"
      />

      <View>
        <FinanceSelectionRow
          label="Moneda"
          value={currency}
          onPress={() => setCurrencyExpanded((current) => !current)}
          disabled={submitting}
        />
        {currencyExpanded ? (
          <FinanceInlineChoice
            value={currency}
            options={SUPPORTED_CURRENCIES.map((candidate) => ({ value: candidate, label: candidate }))}
            onChange={chooseCurrency}
          />
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <MoneyInput
          value={amountText}
          currency={currency}
          onValueChange={handleAmountChange}
          onCurrencyChange={chooseCurrency}
          availableCurrencies={[currency]}
          disabled={submitting}
          label={balanceLabel}
          testID="account-create-amount"
          allowZero
          allowNegative={false}
          errorText={amount.status === 'invalid' ? 'Revisa el monto.' : undefined}
          helperText={isCreditCard ? 'Deuda registrada hoy. Cero es válido.' : 'Saldo de hoy. Cero es válido.'}
        />
      </View>

      {isCreditCard ? (
        <View style={styles.dayFieldsRow}>
          <View style={styles.dayField}>
            <AppInput
              label="Día de cierre"
              value={closingDayText}
              onChangeText={(text) => { setClosingDayText(text); setSubmitError(null); }}
              onBlur={() => setClosingDayTouched(true)}
              placeholder="28"
              editable={!submitting}
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="done"
              errorText={closingDayError}
              accessibilityLabel="Día de cierre"
            />
          </View>
          <View style={styles.dayField}>
            <AppInput
              label="Día de vencimiento"
              value={dueDayText}
              onChangeText={(text) => { setDueDayText(text); setSubmitError(null); }}
              onBlur={() => setDueDayTouched(true)}
              placeholder="8"
              editable={!submitting}
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="done"
              errorText={dueDayError}
              accessibilityLabel="Día de vencimiento"
            />
          </View>
        </View>
      ) : null}

      {submitError ? (
        <FinanceErrorState level="form" message={submitError} />
      ) : null}
    </KeyboardAwareScrollView>
  );

  return (
    <ActionSheet
      visible={visible}
      title={isCreditCard ? 'Nueva tarjeta' : 'Nueva cuenta'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={closeIfAllowed}
      closeDisabled={submitting}
      size={FINANCE_SHEET_SIZE_POLICY.MEDIUM_FORM}
      footer={footer}
    >
      {body}
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { spacing } = theme;

  return StyleSheet.create({
  form: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  accountTypeField: {
    gap: spacing[2],
  },
  dayFieldsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dayField: {
    flex: 1,
    minWidth: 0,
  },
  });
}
