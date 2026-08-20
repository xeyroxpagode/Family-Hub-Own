import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
} from '../../services/finance/financeMovements';
import { useEligibleAccounts } from '../../services/finance/financeAccountEligibility';
import {
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
import { MoneyInput } from './MoneyInput';
import { AccountSelector } from './AccountSelector';

type CorrectionFormSheetMode = 'standalone' | 'nested';

type CorrectionFormSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  personId: string | null;
  householdId: string | null;
  initialTransaction: {
    id: string;
    transactionType: 'expense' | 'income';
    amount: string;
    currency: string;
    transactionDate: string;
    description: string | null;
    notes: string | null;
    categoryId: string | null;
    categoryLabelSnapshot: string | null;
    accountId: string | null;
    accountName: string | null;
    accountCurrency: string | null;
  } | null;
  onRequestClose: () => void;
  onSuccess: (values: {
    amount: string;
    currency: string;
    transactionDate: string;
    description: string | null;
    notes: string | null;
    categoryId: string | null;
    categoryLabel: string | null;
    accountId: string | null;
    accountName: string | null;
    accountCurrency: string | null;
  }) => void;
  onCancel: () => void;
  mode?: CorrectionFormSheetMode;
};

type ActivePicker =
  | 'date'
  | 'category'
  | 'account'
  | null;

const isExpense = (type: 'expense' | 'income') => type === 'expense';

export function CorrectionFormSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  personId,
  householdId,
  initialTransaction,
  onRequestClose,
  onSuccess,
  onCancel,
  mode = 'standalone',
}: CorrectionFormSheetProps) {
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctionMutationId, setCorrectionMutationId] = useState<string | null>(null);
  const [correctionIdempotencyKey, setCorrectionIdempotencyKey] = useState<string | null>(null);

  const [expenseAccountId, setExpenseAccountId] = useState<string | null>(null);
  const [incomeAccountId, setIncomeAccountId] = useState<string | null>(null);

  const expenseAccountPickerVisible = activePicker === 'account' && isExpense(initialTransaction?.transactionType ?? 'expense');
  const incomeAccountPickerVisible = activePicker === 'account' && !isExpense(initialTransaction?.transactionType ?? 'expense');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const expenseAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && isExpense(initialTransaction?.transactionType ?? 'expense'),
    operation: 'expense',
    contextType,
    transactionCurrency: currency,
    activeHousehold: householdId ? { id: householdId, name: contextLabel } : null,
  });

  const incomeAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && !isExpense(initialTransaction?.transactionType ?? 'expense'),
    operation: 'income',
    contextType,
    transactionCurrency: currency,
    activeHousehold: householdId ? { id: householdId, name: contextLabel } : null,
  });

  const selectedExpenseAccount = useMemo(
    () => expenseAccountsState.accounts.find((account) => account.id === expenseAccountId) ?? null,
    [expenseAccountId, expenseAccountsState.accounts],
  );
  const selectedIncomeAccount = useMemo(
    () => incomeAccountsState.accounts.find((account) => account.id === incomeAccountId) ?? null,
    [incomeAccountId, incomeAccountsState.accounts],
  );

  useEffect(() => {
    if (!visible || !initialTransaction) return;

    setAmountText(initialTransaction.amount);
    setAmount(parseMoneyInputText(initialTransaction.amount, initialTransaction.currency));
    setCurrency(initialTransaction.currency as MoneyInputCurrencyCode);
    setDescription(initialTransaction.description ?? '');
    setNotes(initialTransaction.notes ?? '');
    setDate(initialTransaction.transactionDate);
    setSelectedCategoryId(initialTransaction.categoryId);
    if (isExpense(initialTransaction.transactionType)) {
      setExpenseAccountId(initialTransaction.accountId);
    } else {
      setIncomeAccountId(initialTransaction.accountId);
    }
    setSubmitError(null);
    setSubmitting(false);
    setCorrectionMutationId(null);
    setCorrectionIdempotencyKey(null);
    setNotesExpanded(false);
  }, [visible, initialTransaction]);

  useEffect(() => {
    if (!visible || !isExpense(initialTransaction?.transactionType ?? 'expense') || !accessToken) {
      setCategories([]);
      setSelectedCategoryId(initialTransaction?.categoryId ?? null);
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
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setSelectedCategoryId(null);
        setCategoriesError('No pudimos cargar las categorias. Podes corregir sin categoria.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, initialTransaction?.transactionType, initialTransaction?.categoryId, visible]);

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

  const handleCancel = () => {
    onCancel();
  };

  const canSubmit = Boolean(accessToken) && amount.isValid;

  const hasChanges = useMemo(() => {
    if (!initialTransaction) return false;
    const currentAccountId = isExpense(initialTransaction.transactionType) ? expenseAccountId : incomeAccountId;
    return (
      amount.technicalValue?.amount !== initialTransaction.amount ||
      currency !== initialTransaction.currency ||
      date !== initialTransaction.transactionDate ||
      description.trim() !== (initialTransaction.description ?? '').trim() ||
      notes.trim() !== (initialTransaction.notes ?? '').trim() ||
      selectedCategoryId !== initialTransaction.categoryId ||
      currentAccountId !== initialTransaction.accountId
    );
  }, [
    initialTransaction,
    amount.technicalValue?.amount,
    currency,
    date,
    description,
    notes,
    selectedCategoryId,
    expenseAccountId,
    incomeAccountId,
  ]);

  const submit = () => {
    if (!canSubmit || !hasChanges || !initialTransaction) return;
    Keyboard.dismiss();
    setSubmitError(null);

    const currentAccountId = isExpense(initialTransaction.transactionType) ? expenseAccountId : incomeAccountId;
    const selectedAccount = isExpense(initialTransaction.transactionType) ? selectedExpenseAccount : selectedIncomeAccount;

    onSuccess({
      amount: amount.technicalValue?.amount ?? initialTransaction.amount,
      currency,
      transactionDate: date,
      description: description.trim() || null,
      notes: notes.trim() || null,
      categoryId: selectedCategoryId,
      categoryLabel: selectedCategory?.label ?? null,
      accountId: currentAccountId,
      accountName: selectedAccount?.name ?? null,
      accountCurrency: selectedAccount?.currency ?? null,
    });
  };

  if (!visible || !initialTransaction) return null;

  const transactionType = initialTransaction.transactionType;

  const footer = (
    <View style={styles.footer}>
      <AppButton
        variant="ghost"
        title="Cancelar"
        onPress={handleCancel}
        style={styles.footerButton}
      />
      <AppButton
        title="Continuar"
        onPress={submit}
        disabled={!canSubmit || !hasChanges}
        style={styles.footerButton}
      />
    </View>
  );

  const formContent = (
    <View style={styles.sheetBody}>
      <KeyboardAwareScrollView
        enableOnAndroid
        extraScrollHeight={40}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.form}
      >
        <View style={styles.typeBadge}>
          <AppText variant="caption" tone="secondary" weight="700">
            Tipo
          </AppText>
          <AppText variant="body" weight="800">
            {transactionType === 'expense' ? 'Gasto' : 'Ingreso'}
          </AppText>
        </View>

        <View style={styles.contextBadge}>
          <AppText variant="caption" tone="secondary" weight="700">
            Contexto financiero
          </AppText>
          <AppText variant="body" weight="800" numberOfLines={1}>
            {contextLabel}
          </AppText>
        </View>

        <MoneyInput
          value={amountText}
          currency={currency}
          onValueChange={handleAmountChange}
          onCurrencyChange={handleCurrencyChange}
          availableCurrencies={['ARS', 'USD', 'EUR']}
          disabled={false}
          errorText={amount.status === 'invalid' ? 'Revisa el monto.' : undefined}
          helperText="Magnitud positiva, sin convertir monedas."
        />

        <AppInput
          label="Descripcion (opcional)"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            setSubmitError(null);
          }}
          placeholder={transactionType === 'expense' ? 'Supermercado, farmacia, alquiler' : 'Sueldo, venta, reintegro'}
          editable={true}
          returnKeyType="done"
        />

        {transactionType === 'expense' ? (
          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Categoria"
              value={selectedCategory?.label ?? 'Sin categoria'}
              onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
              disabled={categoriesLoading}
              accessibilityLabel="Elegir categoria de gasto"
            />
            {categoriesError ? (
              <AppText variant="caption" tone="warning">
                {categoriesError}
              </AppText>
            ) : categoriesLoading ? (
              <AppText variant="caption" tone="tertiary">
                Cargando categorias
              </AppText>
            ) : null}
            {activePicker === 'category' ? (
              <View style={styles.categoryPicker} accessibilityLabel="Categorias de gasto">
                <InteractivePressable
                  onPress={() => {
                    setSelectedCategoryId(null);
                    setActivePicker(null);
                  }}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={[styles.categoryOption, selectedCategoryId === null && styles.categoryOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedCategoryId === null }}
                  accessibilityLabel="Sin categoria"
                >
                  <HomePlusIcon
                    name={selectedCategoryId === null ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedCategoryId === null ? colors.terracotta[700] : colors.text.tertiary}
                  />
                  <AppText variant="bodySmall" weight="800">
                    Sin categoria
                  </AppText>
                </InteractivePressable>
                {categories.map((category) => {
                  const selected = category.id === selectedCategoryId;
                  return (
                    <InteractivePressable
                      key={category.id}
                      onPress={() => {
                        setSelectedCategoryId(category.id);
                        setActivePicker(null);
                      }}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={category.label}
                    >
                      <HomePlusIcon
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? colors.terracotta[700] : colors.text.tertiary}
                      />
                      <AppText variant="bodySmall" weight="800" numberOfLines={1} style={styles.categoryLabel}>
                        {category.label}
                      </AppText>
                    </InteractivePressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {(transactionType === 'expense' || transactionType === 'income') ? (
          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Cuenta"
              value={
                (transactionType === 'expense' ? selectedExpenseAccount : selectedIncomeAccount)
                  ? `${(transactionType === 'expense' ? selectedExpenseAccount : selectedIncomeAccount)!.name} · ${(transactionType === 'expense' ? selectedExpenseAccount : selectedIncomeAccount)!.currency}`
                  : 'Sin cuenta'
              }
              onPress={() => setActivePicker('account')}
              disabled={transactionType === 'expense' ? expenseAccountsState.loading : incomeAccountsState.loading}
              accessibilityLabel={`Elegir cuenta para ${transactionType === 'expense' ? 'gasto' : 'ingreso'}`}
            />
            {(transactionType === 'expense' ? expenseAccountsState.error : incomeAccountsState.error) ? (
              <AppText variant="caption" tone="warning">
                {(transactionType === 'expense' ? expenseAccountsState.error : incomeAccountsState.error)!}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <FormActionRow
          label="Fecha"
          value={formatHumanDate(date)}
          onPress={() => setActivePicker('date')}
          disabled={false}
          accessibilityLabel={`Fecha ${formatHumanDate(date)}`}
        />

        <View style={styles.fieldGroup}>
          <InteractivePressable
            onPress={() => setNotesExpanded((current) => !current)}
            disabled={false}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.moreDetails}
            accessibilityRole="button"
            accessibilityState={{ expanded: notesExpanded }}
            accessibilityLabel="Mas detalles"
          >
            <AppText variant="bodySmall" weight="800">
              Mas detalles
            </AppText>
            <HomePlusIcon
              name={notesExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={18}
              color={colors.text.tertiary}
            />
          </InteractivePressable>
          {notesExpanded ? (
            <AppInput
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Detalle privado del movimiento"
              variant="multiline"
              editable={true}
              multiline
            />
          ) : null}
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
        onConfirm={(nextDate) => {
          setDate(nextDate);
          setActivePicker(null);
        }}
      />

      <AccountSelector
        visible={expenseAccountPickerVisible}
        title="Cuenta del gasto"
        subtitle="Opcional"
        accounts={expenseAccountsState.accounts}
        loading={expenseAccountsState.loading}
        error={expenseAccountsState.error}
        selectedAccountId={expenseAccountId}
        allowNone
        activeHousehold={householdId ? { id: householdId, name: contextLabel } : null}
        disabled={false}
        operationHint="expense"
        onRequestClose={() => setActivePicker(null)}
        onSelect={(account) => {
          setExpenseAccountId(account?.id ?? null);
          setActivePicker(null);
        }}
      />

      <AccountSelector
        visible={incomeAccountPickerVisible}
        title="Cuenta del ingreso"
        subtitle="Opcional"
        accounts={incomeAccountsState.accounts}
        loading={incomeAccountsState.loading}
        error={incomeAccountsState.error}
        selectedAccountId={incomeAccountId}
        allowNone
        activeHousehold={householdId ? { id: householdId, name: contextLabel } : null}
        disabled={false}
        operationHint="income"
        onRequestClose={() => setActivePicker(null)}
        onSelect={(account) => {
          setIncomeAccountId(account?.id ?? null);
          setActivePicker(null);
        }}
      />
    </View>
  );

  if (mode === 'nested') {
    return formContent;
  }

  return (
    <ActionSheet
      visible={visible}
      title="Corregir movimiento"
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={handleCancel}
      closeDisabled={false}
      size="content"
      footer={footer}
    >
      {formContent}
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
  typeBadge: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contextBadge: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.sage[50],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldGroup: {
    gap: spacing[2],
  },
  categoryPicker: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing[2],
    gap: spacing[1],
  },
  categoryOption: {
    minHeight: 44,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  categoryOptionSelected: {
    backgroundColor: colors.terracotta[50],
  },
  categoryLabel: {
    flex: 1,
    minWidth: 0,
  },
  moreDetails: {
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.soft,
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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