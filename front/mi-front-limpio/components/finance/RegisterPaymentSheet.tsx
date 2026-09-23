/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import type { FinanceContextType, FinanceContextViewState, FinanceActiveHousehold } from '../../services/finance/financeContext';
import {
  registerPayment,
  type PaymentDueDto,
  formatExpectedAmount,
  PAYMENT_KINDS,
} from '../../services/finance/financePayments';
import {
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
} from '../../services/finance/financeMovements';
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
  AppText,
  DatePickerSheet,
  formatHumanDate,
} from '../ui';
import {
  FinanceErrorState,
  FinanceFormFooter,
  FinanceSelectionRow,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';
import { todayDateOnly } from '../../services/finance/financeDate';
import { MoneyInput } from './MoneyInput';
import { AccountSelector } from './AccountSelector';
import { CategorySelectorSheet } from './CategorySelectorSheet';

type RegisterPaymentSheetProps = {
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

export function RegisterPaymentSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  contextState,
  activeHousehold,
  payment,
  onRequestClose,
  onSuccess,
}: RegisterPaymentSheetProps) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [date, setDate] = useState(todayDateOnly);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'date' | 'category' | 'account' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountSelectorVisible, setAccountSelectorVisible] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const isNormal = payment?.kind === PAYMENT_KINDS.NORMAL;
  const expectedAmountText = useMemo(
    () => formatExpectedAmount(payment?.expectedAmountKnown ?? true, payment?.expectedAmount ?? null, payment?.currency),
    [payment?.expectedAmountKnown, payment?.expectedAmount, payment?.currency],
  );
  const paymentCurrency = payment?.currency ?? 'ARS';

  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';

  const eligibleAccounts = useEligibleAccounts({
    accessToken,
    enabled: visible && isNormal,
    operation: 'expense',
    contextType,
    transactionCurrency: paymentCurrency,
    activeHousehold,
  });

  const selectedAccount = useMemo(
    () => eligibleAccounts.accounts.find((account) => account.id === selectedAccountId) ?? null,
    [eligibleAccounts.accounts, selectedAccountId],
  );

  useEffect(() => {
    if (!visible || !payment) return;
    setAmountText(payment.expectedAmountKnown && payment.expectedAmount ? payment.expectedAmount : '');
    setAmount(parseMoneyInputText(payment.expectedAmountKnown && payment.expectedAmount ? payment.expectedAmount : '', paymentCurrency));
    setCurrency(paymentCurrency as MoneyInputCurrencyCode);
    setDate(todayDateOnly());
    setSelectedCategoryId(payment.categoryId ?? null);
    setSelectedAccountId(null);
    setSubmitError(null);
  }, [visible, payment, paymentCurrency]);

  useEffect(() => {
    if (!visible || !payment || !isNormal || !accessToken || contextUnavailable) {
      setCategories([]);
      setSelectedCategoryId(null);
      setCategoriesError(null);
      setCategoriesLoading(false);
      return;
    }

    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);

    listFinanceExpenseCategories(accessToken, contextType)
      .then((payload) => {
        if (cancelled) return;
        const selectableCategories = payload.categories.filter(
          (category) => category.type === 'expense' && category.selectable,
        );
        setCategories(selectableCategories);
        if (payment.categoryId && !selectableCategories.find((c) => c.id === payment.categoryId)) {
          setSelectedCategoryId(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setSelectedCategoryId(null);
        setCategoriesError('No pudimos cargar las categorías. Podés registrar sin categoría.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, contextUnavailable, payment?.id, payment?.categoryId, visible, isNormal]);

  const resetDraft = () => {
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setCurrency('ARS');
    setDate(todayDateOnly());
    setSelectedCategoryId(null);
    setSelectedAccountId(null);
    setCategories([]);
    setCategoriesError(null);
    setActivePicker(null);
    setSubmitError(null);
    setSubmitting(false);
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

  const canSubmit = Boolean(accessToken) && !contextUnavailable && !submitting && isNormal && amount.isValid;

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

    const payload = {
      actualAmount: amount.technicalValue.amount,
      actualDate: date,
      ...(isNormal && selectedCategoryId ? { actualCategoryId: selectedCategoryId } : {}),
      ...(isNormal && selectedAccountId ? { actualAccountId: selectedAccountId } : {}),
    };

    setSubmitting(true);
    try {
      await registerPayment(accessToken, contextType, payment.id, payment.kind, payload);
      resetDraft();
      onRequestClose();
      onSuccess();
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos registrar el pago. Intenta de nuevo.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <FinanceFormFooter
      primaryTitle="Registrar"
      onPrimary={submit}
      onCancel={close}
      primaryDisabled={!canSubmit}
      loading={submitting}
      divided={false}
    />
  );

  if (!visible || !payment) return null;

  return (
    <ActionSheet
      visible={visible}
      title="Registrar pago"
      subtitle={payment.title}
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
              Esperado:
            </AppText>
            <AppText variant="body" weight="800" tone={payment.expectedAmountKnown ? 'primary' : 'secondary'}>
              {expectedAmountText}
            </AppText>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <MoneyInput
            value={amountText}
            currency={currency}
            onValueChange={handleAmountChange}
            onCurrencyChange={handleCurrencyChange}
            availableCurrencies={DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS}
            label="Monto pagado"
            helperText="Podés ajustar el monto respecto al esperado."
            disabled={submitting}
            errorText={amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
          />
        </View>

        <FinanceSelectionRow
          label="Fecha"
          value={formatHumanDate(date)}
          onPress={() => setActivePicker('date')}
          disabled={submitting}
          accessibilityLabel={`Fecha de pago ${formatHumanDate(date)}`}
        />

        {isNormal && (
          <>
            <View style={styles.fieldGroup}>
              {categoriesError ? (
                <AppText variant="caption" tone="warning">{categoriesError}</AppText>
              ) : categoriesLoading ? (
                <AppText variant="caption" tone="tertiary">Cargando categorías</AppText>
              ) : null}
              <FinanceSelectionRow
                label="Categoría"
                value={categories.find((c) => c.id === selectedCategoryId)?.label ?? 'Sin categoría'}
                onPress={() => setActivePicker('category')}
                disabled={submitting || categoriesLoading}
                accessibilityLabel="Elegir categoría del gasto real"
              />
            </View>

            <View style={styles.fieldGroup}>
              <FinanceSelectionRow
                label="Cuenta"
                value={selectedAccount ? `${selectedAccount.name} · ${selectedAccount.currency}` : 'Sin cuenta'}
                onPress={handleOpenAccountSelector}
                disabled={submitting || eligibleAccounts.loading}
                accessibilityLabel="Elegir cuenta para el gasto"
              />
              {eligibleAccounts.error ? (
                <AppText variant="caption" tone="warning">{eligibleAccounts.error}</AppText>
              ) : null}
            </View>
          </>
        )}

        {!isNormal && (
          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="secondary">
              Usá Pagar tarjeta para abonar este resumen.
            </AppText>
          </View>
        )}

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
          title="Cuenta del gasto"
          subtitle="Opcional"
          accounts={eligibleAccounts.accounts}
          loading={eligibleAccounts.loading}
          error={eligibleAccounts.error}
          selectedAccountId={selectedAccountId}
          allowNone
          noneLabel="Sin cuenta"
          activeHousehold={activeHousehold}
          disabled={submitting}
          operationHint="expense"
          onRequestClose={() => setAccountSelectorVisible(false)}
          onSelect={handleSelectAccount}
        />

        {isNormal ? (
          <CategorySelectorSheet
            visible={activePicker === 'category'}
            accessToken={accessToken}
            contextType={contextType}
            mode="expense"
            selectedCategoryId={selectedCategoryId}
            onSelect={(category) => {
              setSelectedCategoryId(category?.id ?? null);
              if (category && !categories.some((candidate) => candidate.id === category.id)) {
                setCategories((current) => [...current, category]);
              }
              setActivePicker(null);
            }}
            onRequestClose={() => setActivePicker(null)}
          />
        ) : null}
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
    paymentTitle: {
      marginBottom: spacing[1],
    },
    expectedAmountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
  });
}
