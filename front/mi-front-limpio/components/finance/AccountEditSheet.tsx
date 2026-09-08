import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ApiError } from '../../services/api';
import {
  correctFinanceAccountBalance,
  createFinanceAccountBalanceAnchor,
  updateFinanceAccount,
  type FinanceAccountDto,
} from '../../services/finance/financeAccounts';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  getAccountBalancePresentation,
  toCanonicalSignedAccountBalance,
} from '../../services/finance/accountDisplay';
import { parseMoneyInputText, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
import { useAppTheme } from '../../context/AppThemeContext';
import { HomePlusIcon } from '../../constants/icons';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
} from '../ui';
import { MoneyInput } from './MoneyInput';

const DAY_TEXT_RE = /^\d{1,2}$/;

function parseDayText(text: string): number | null {
  const trimmed = text.trim();
  if (!DAY_TEXT_RE.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1 || value > 31) return null;
  return value;
}

const todayLocalDateOnly = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export type AccountEditSheetProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  account: FinanceAccountDto | null;
  onRequestClose: () => void;
  onSuccess: (account: FinanceAccountDto) => void;
};

export function AccountEditSheet({
  visible,
  accessToken,
  contextType,
  account,
  onRequestClose,
  onSuccess,
}: AccountEditSheetProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = createStyles(theme);
  const [name, setName] = useState('');
  const [balanceText, setBalanceText] = useState('');
  const [balance, setBalance] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [closingDayText, setClosingDayText] = useState('');
  const [dueDayText, setDueDayText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCreditCard = account?.accountType === 'CREDIT_CARD';
  const presentation = account ? getAccountBalancePresentation(account) : null;
  const isUnknown = presentation?.isUnknown === true;
  const balanceLabel = isCreditCard ? 'Deuda actual' : 'Saldo actual';
  const currency = account?.currency ?? 'ARS';
  const closingDay = parseDayText(closingDayText);
  const dueDay = parseDayText(dueDayText);

  useEffect(() => {
    if (visible && account) {
      setName(account.name ?? '');
      const prefill = presentation && !presentation.isUnknown && presentation.displayAmount !== null && !presentation.displayAmount.startsWith('-')
        ? presentation.displayAmount
        : '';
      setBalanceText(prefill);
      setBalance(parseMoneyInputText(prefill, account.currency));
      setClosingDayText(isCreditCard && account.closingDay != null ? String(account.closingDay) : '');
      setDueDayText(isCreditCard && account.dueDay != null ? String(account.dueDay) : '');
      setSubmitError(null);
      setSubmitting(false);
    }
    if (!visible) {
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [visible, account, isCreditCard, presentation]);

  const closingDayError = isCreditCard && closingDay === null ? 'Ingresá un día de cierre entre 1 y 31.' : undefined;
  const dueDayError = isCreditCard && dueDay === null ? 'Ingresá un día de vencimiento entre 1 y 31.' : undefined;
  const cardTimingValid = !isCreditCard || (closingDay !== null && dueDay !== null);

  const enteredMagnitude = balance.technicalValue?.amount ?? (balance.status === 'zero' && balance.canonicalAmount !== null ? balance.canonicalAmount : null);
  const enteredCanonical = enteredMagnitude !== null && account
    ? toCanonicalSignedAccountBalance(enteredMagnitude, account.accountType)
    : null;

  const nameChanged = name.trim() !== (account?.name ?? '');
  const closingChanged = isCreditCard && closingDay !== (account?.closingDay ?? null);
  const dueChanged = isCreditCard && dueDay !== (account?.dueDay ?? null);
  const timingChanged = closingChanged || dueChanged;
  const balanceChanged = account
    ? (isUnknown ? enteredCanonical !== null : enteredCanonical !== null && enteredCanonical !== account.currentBalance)
    : false;

  const hasChange = nameChanged || timingChanged || balanceChanged;
  const canSubmit = Boolean(accessToken) && Boolean(account) && name.trim().length > 0 && cardTimingValid && hasChange && !submitting;

  const close = () => {
    if (submitting) return;
    setSubmitError(null);
    onRequestClose();
  };

  const submit = async () => {
    if (submitting || !accessToken || !account) return;
    Keyboard.dismiss();
    setSubmitError(null);
    setSubmitting(true);

    const metadataChanged = nameChanged || timingChanged;
    let resolvedAccount = account;
    try {
      if (metadataChanged) {
        const payload = {
          name: name.trim(),
          contextType,
          ...(isCreditCard ? { closingDay, dueDay } : {}),
        };
        const updated = await updateFinanceAccount(accessToken, account.id, payload);
        resolvedAccount = updated.account;
      }

      if (balanceChanged && enteredCanonical !== null) {
        if (isUnknown) {
          const anchored = await createFinanceAccountBalanceAnchor(accessToken, account.id, {
            amount: enteredCanonical,
            effectiveDate: todayLocalDateOnly(),
            contextType,
          });
          resolvedAccount = anchored.account;
        } else {
          const corrected = await correctFinanceAccountBalance(accessToken, account.id, {
            correctedBalance: enteredCanonical,
            effectiveDate: todayLocalDateOnly(),
            contextType,
          });
          resolvedAccount = corrected.account;
        }
      }

      onRequestClose();
      onSuccess(resolvedAccount);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos editar la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  const balanceHelperText = isCreditCard
    ? 'Usá este ajuste sólo si HomePlus no coincide con tu tarjeta real. Para registrar un pago, usá Pagar tarjeta.'
    : 'Usá este valor si HomePlus no coincide con el saldo real.';

  return (
    <ActionSheet
      visible={visible}
      title={isCreditCard ? 'Editar tarjeta' : 'Editar cuenta'}
      subtitle={account?.name}
      onRequestClose={close}
      closeDisabled={submitting}
      size="content"
      footer={(
        <View style={styles.footer}>
          <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
          <AppButton title="Guardar" onPress={() => void submit()} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
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
        <AppInput
          label="Nombre"
          value={name}
          onChangeText={(text) => { setName(text); setSubmitError(null); }}
          placeholder="Nombre de la cuenta"
          editable={!submitting}
          returnKeyType="done"
        />

        <View style={styles.fieldGroup}>
          <MoneyInput
            value={balanceText}
            currency={currency}
            onValueChange={(next) => { setBalanceText(next.inputText); setBalance(next); setSubmitError(null); }}
            onCurrencyChange={() => undefined}
            availableCurrencies={[currency]}
            label={isUnknown ? `Establecer ${balanceLabel.toLowerCase()}` : balanceLabel}
            helperText={balanceHelperText}
            disabled={submitting}
            allowZero
            allowNegative={false}
            errorText={balance.status === 'invalid' ? 'Revisa el monto.' : undefined}
          />
        </View>

        {isCreditCard ? (
          <View style={styles.dayFieldsRow}>
            <View style={styles.dayField}>
              <AppInput
                label="Día de cierre"
                value={closingDayText}
                onChangeText={(text) => { setClosingDayText(text); setSubmitError(null); }}
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

        <View style={styles.readonlyInfo}>
          <HomePlusIcon name="lock-closed-outline" size={16} color={colors.text.tertiary} />
          <AppText variant="caption" tone="tertiary">
            Tipo, moneda y contexto no se pueden cambiar después de crear la cuenta.
          </AppText>
        </View>

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
  dayFieldsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dayField: {
    flex: 1,
    minWidth: 0,
  },
  readonlyInfo: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
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
