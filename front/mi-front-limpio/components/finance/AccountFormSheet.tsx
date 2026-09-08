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
import { HomePlusIcon } from '../../constants/icons';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
  InteractivePressable,
} from '../ui';
import { MoneyInput } from './MoneyInput';

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

type BalanceMode = 'unknown' | 'known';

const STARTING_DRAFT = {
  accountType: FINANCE_ACCOUNT_TYPES.ACCOUNT as FinanceAccountType,
  currency: 'ARS' as MoneyInputCurrencyCode,
  balanceMode: 'unknown' as BalanceMode,
};

export type AccountFormSheetProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  onRequestClose: () => void;
  onSuccess: (account: FinanceAccountDto) => void;
};

type Step = 'edit' | 'review';

export function AccountFormSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  onRequestClose,
  onSuccess,
}: AccountFormSheetProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [step, setStep] = useState<Step>('edit');
  const [accountType, setAccountType] = useState<FinanceAccountType>(STARTING_DRAFT.accountType);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>(STARTING_DRAFT.currency);
  const [currencyExpanded, setCurrencyExpanded] = useState(false);
  const [balanceMode, setBalanceMode] = useState<BalanceMode>(STARTING_DRAFT.balanceMode);
  const [amountText, setAmountText] = useState('0');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('0', STARTING_DRAFT.currency));
  const [closingDayText, setClosingDayText] = useState('');
  const [dueDayText, setDueDayText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCreditCard = accountType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD;
  const balanceLabel = isCreditCard ? 'Deuda actual' : 'Saldo actual';
  const canonicalInitialAmount = amount.technicalValue?.amount ?? (amount.status === 'zero' ? amount.canonicalAmount : null);
  const closingDay = parseDayText(closingDayText);
  const dueDay = parseDayText(dueDayText);
  const closingDayError = isCreditCard && closingDay === null ? 'Ingresá un día de cierre entre 1 y 31.' : undefined;
  const dueDayError = isCreditCard && dueDay === null ? 'Ingresá un día de vencimiento entre 1 y 31.' : undefined;
  const cardTimingComplete = !isCreditCard || (closingDay !== null && dueDay !== null);
  const requiresInitialAmount = isCreditCard || balanceMode === 'known';
  const canSubmitEdit =
    Boolean(accessToken) && !submitting && name.trim().length > 0 &&
    (!requiresInitialAmount || canonicalInitialAmount !== null) && cardTimingComplete;

  const resetDraft = () => {
    setStep('edit');
    setAccountType(STARTING_DRAFT.accountType);
    setName('');
    setCurrency(STARTING_DRAFT.currency);
    setBalanceMode(STARTING_DRAFT.balanceMode);
    setAmountText('0');
    setAmount(parseMoneyInputText('0', STARTING_DRAFT.currency));
    setClosingDayText('');
    setDueDayText('');
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
    const nextBalanceMode = nextType === FINANCE_ACCOUNT_TYPES.CREDIT_CARD ? 'known' : STARTING_DRAFT.balanceMode;
    const nextAmountText = nextBalanceMode === 'known' ? '0' : '';
    setBalanceMode(nextBalanceMode);
    setAmountText(nextAmountText);
    setAmount(parseMoneyInputText(nextAmountText, currency));
    setClosingDayText('');
    setDueDayText('');
    setSubmitError(null);
  };

  const chooseBalanceMode = (mode: BalanceMode) => {
    setBalanceMode(mode);
    if (mode === 'unknown') {
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
    } else if (!amountText.trim()) {
      setAmountText('0');
      setAmount(parseMoneyInputText('0', currency));
    }
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
    setSubmitError(null);

    if (!accessToken) {
      setSubmitError('Tu sesion no esta disponible. Volve a iniciar sesion.');
      return;
    }

    const draftName = name.trim();
    if (!draftName) {
      setSubmitError('Ingresa un nombre para la cuenta.');
      setStep('edit');
      return;
    }

    if (requiresInitialAmount && canonicalInitialAmount === null) {
      setSubmitError('Ingresa un saldo valido, incluso si es cero.');
      setStep('edit');
      return;
    }

    if (isCreditCard && (closingDay === null || dueDay === null)) {
      setSubmitError(closingDay === null ? 'Ingresá un día de cierre entre 1 y 31.' : 'Ingresá un día de vencimiento entre 1 y 31.');
      setStep('edit');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: draftName,
        currency,
        accountType,
        contextType,
        ...(requiresInitialAmount && canonicalInitialAmount !== null
          ? {
            initialBalance: {
              amount: toCanonicalSignedAccountBalance(canonicalInitialAmount, accountType),
              effectiveDate: todayLocalDateOnly(),
            },
          }
          : {}),
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
      setStep('edit');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <View style={styles.footer}>
      <AppButton
        title="Cancelar"
        variant="ghost"
        onPress={closeIfAllowed}
        disabled={submitting}
        style={styles.footerButton}
      />
      {step === 'edit' ? (
        <AppButton
          title={isCreditCard ? 'Crear tarjeta' : 'Crear cuenta'}
          onPress={() => void submit()}
          loading={submitting}
          disabled={!canSubmitEdit}
          style={styles.footerButton}
        />
      ) : (
        <AppButton
          title={isCreditCard ? 'Crear tarjeta' : 'Crear cuenta'}
          onPress={() => void submit()}
          loading={submitting}
          disabled={submitting}
          style={styles.footerButton}
        />
      )}
    </View>
  );

  const body = step === 'edit' ? (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={40}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.form}
    >
      <View style={styles.operationSelector} accessibilityRole="tablist">
        {([FINANCE_ACCOUNT_TYPES.ACCOUNT, FINANCE_ACCOUNT_TYPES.CREDIT_CARD] as const).map((candidate) => {
          const selected = candidate === accountType;
          return (
            <InteractivePressable
              key={candidate}
              onPress={() => chooseAccountType(candidate)}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.tab}
              style={[styles.operationOption, selected && styles.operationOptionSelected]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={candidate === FINANCE_ACCOUNT_TYPES.ACCOUNT ? 'Cuenta' : 'Tarjeta de credito'}
            >
              <AppText variant="bodySmall" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                {candidate === FINANCE_ACCOUNT_TYPES.ACCOUNT ? 'Cuenta' : 'Tarjeta de crédito'}
              </AppText>
            </InteractivePressable>
          );
        })}
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

      <View style={styles.fieldGroup}>
        <View style={styles.currencyHeader}>
          <AppText variant="caption" tone="secondary" weight="700">Moneda</AppText>
          <InteractivePressable
            onPress={() => setCurrencyExpanded((current) => !current)}
            disabled={submitting}
            haptic="light"
            pressScale={motion.scale.tab}
            style={styles.currencyButton}
            accessibilityRole="button"
            accessibilityState={{ expanded: currencyExpanded }}
            accessibilityLabel={`Moneda ${currency}`}
            accessibilityHint="Cambia la moneda de la cuenta"
          >
            <AppText variant="bodySmall" weight="800">{currency}</AppText>
            <HomePlusIcon name={currencyExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={colors.text.tertiary} />
          </InteractivePressable>
        </View>
        {currencyExpanded ? (
          <View style={styles.currencyOptions} accessibilityLabel="Seleccionar moneda">
            {SUPPORTED_CURRENCIES.map((candidate) => {
              const selected = candidate === currency;
              return (
                <InteractivePressable
                  key={candidate}
                  onPress={() => chooseCurrency(candidate)}
                  haptic="light"
                  pressScale={motion.scale.tab}
                  style={[styles.currencyOption, selected && styles.currencyOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={candidate}
                >
                  <AppText variant="bodySmall" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                    {candidate}
                  </AppText>
                </InteractivePressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        {!isCreditCard ? (
          <>
            <AppText variant="caption" tone="secondary" weight="700">{balanceLabel}</AppText>
            <View style={styles.balanceMode} accessibilityRole="radiogroup">
              <InteractivePressable
                onPress={() => chooseBalanceMode('unknown')}
                disabled={submitting}
                haptic="light"
                pressScale={motion.scale.card}
                style={[styles.balanceModeOption, balanceMode === 'unknown' && styles.balanceModeOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected: balanceMode === 'unknown' }}
                accessibilityLabel="Saldo no establecido"
              >
                <HomePlusIcon
                  name={balanceMode === 'unknown' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={balanceMode === 'unknown' ? colors.terracotta[700] : colors.text.tertiary}
                />
                <AppText variant="bodySmall" weight="800">No lo sé</AppText>
              </InteractivePressable>
              <InteractivePressable
                onPress={() => chooseBalanceMode('known')}
                disabled={submitting}
                haptic="light"
                pressScale={motion.scale.card}
                style={[styles.balanceModeOption, balanceMode === 'known' && styles.balanceModeOptionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected: balanceMode === 'known' }}
                accessibilityLabel={`Ingresar ${balanceLabel.toLowerCase()}`}
              >
                <HomePlusIcon
                  name={balanceMode === 'known' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={balanceMode === 'known' ? colors.terracotta[700] : colors.text.tertiary}
                />
                <AppText variant="bodySmall" weight="800">Ingresar saldo</AppText>
              </InteractivePressable>
            </View>
            {balanceMode === 'unknown' ? (
              <AppText variant="caption" tone="tertiary">
                Podés establecer el saldo después, cuando lo sepas.
              </AppText>
            ) : null}
          </>
        ) : null}

        {isCreditCard || balanceMode === 'known' ? (
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
        ) : null}
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

      <View style={styles.contextSummary}>
        <HomePlusIcon name={contextType === 'personal' ? 'person-outline' : 'home-outline'} size={18} color={colors.sage[700]} />
        <View style={styles.contextSummaryText}>
          <AppText variant="caption" tone="secondary" weight="700">Finanzas de</AppText>
          <AppText variant="bodySmall" weight="800" numberOfLines={1}>{contextLabel}</AppText>
        </View>
      </View>

      {submitError ? (
        <View style={styles.errorBox}>
          <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
          <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
        </View>
      ) : null}
    </KeyboardAwareScrollView>
  ) : (
    <View style={styles.review}>
      <View style={styles.reviewHeader}>
        <HomePlusIcon name="checkmark-circle-outline" size={24} color={colors.terracotta[700]} />
        <AppText variant="title3" weight="800">Vas a crear</AppText>
      </View>

      <View style={styles.reviewRow}>
        <AppText variant="caption" tone="secondary" weight="700">Tipo</AppText>
        <AppText variant="body" weight="800">
          {accountType === FINANCE_ACCOUNT_TYPES.ACCOUNT ? 'Cuenta' : 'Tarjeta de crédito'}
        </AppText>
      </View>
      <View style={styles.reviewRow}>
        <AppText variant="caption" tone="secondary" weight="700">Nombre</AppText>
        <AppText variant="body" weight="800">{name.trim()}</AppText>
      </View>
      <View style={styles.reviewRow}>
        <AppText variant="caption" tone="secondary" weight="700">Moneda</AppText>
        <AppText variant="body" weight="800">{currency}</AppText>
      </View>
<View style={styles.reviewRow}>
          <AppText variant="caption" tone="secondary" weight="700">{balanceLabel} (hoy)</AppText>
          <AppText variant="body" weight="800">
            {`${currency} ${amount.displayText}`}
          </AppText>
        </View>
        {isCreditCard ? (
          <View style={styles.reviewRow}>
            <AppText variant="caption" tone="secondary" weight="700">Cierre / Vencimiento</AppText>
            <AppText variant="body" weight="800">{`${closingDay ?? '—'} / ${dueDay ?? '—'}`}</AppText>
          </View>
        ) : null}
      <View style={styles.reviewRow}>
        <AppText variant="caption" tone="secondary" weight="700">Finanzas de</AppText>
        <AppText variant="body" weight="800">{contextLabel}</AppText>
      </View>

      {submitError ? (
        <View style={styles.errorBox}>
          <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
          <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
        </View>
      ) : null}
    </View>
  );

  return (
    <ActionSheet
      visible={visible}
      title={isCreditCard ? 'Nueva tarjeta' : 'Nueva cuenta'}
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={closeIfAllowed}
      closeDisabled={submitting}
      footer={footer}
    >
      {body}
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing, touchTargets } = theme;

  return StyleSheet.create({
  form: {
    gap: spacing[4],
    paddingBottom: spacing[4],
  },
  review: {
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  reviewRow: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  operationSelector: {
    minHeight: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.muted,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  operationOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  operationOptionSelected: {
    backgroundColor: colors.terracotta[600],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  balanceMode: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  balanceModeOption: {
    flex: 1,
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  balanceModeOptionSelected: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[300],
  },
  dayFieldsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  dayField: {
    flex: 1,
    minWidth: 0,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyButton: {
    minWidth: 86,
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  currencyOptions: {
    minHeight: touchTargets.normal,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[1],
    flexDirection: 'row',
    gap: spacing[1],
  },
  currencyOption: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  currencyOptionSelected: {
    backgroundColor: colors.terracotta[600],
  },
  contextSummary: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.sage[50],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  contextSummaryText: {
    flex: 1,
    minWidth: 0,
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
