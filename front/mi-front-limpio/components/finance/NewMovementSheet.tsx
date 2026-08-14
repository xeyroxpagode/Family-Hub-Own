import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { ApiError } from '../../services/api';
import type { FinanceContextType, FinanceContextViewState } from '../../services/finance/financeContext';
import {
  createFinanceExpense,
  createFinanceIncome,
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
  type FinanceTransactionKind,
} from '../../services/finance/financeMovements';
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
import { MoneyInput } from './MoneyInput';

type NewMovementSheetProps = {
  visible: boolean;
  accessToken?: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  contextState: FinanceContextViewState;
  onRequestClose: () => void;
  onSuccess: (operation: FinanceTransactionKind) => void;
};

type ActivePicker = 'date' | 'category' | null;

const todayDateOnly = () => new Date().toISOString().slice(0, 10);

const isExpense = (operation: FinanceTransactionKind) => operation === 'expense';

export function NewMovementSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  contextState,
  onRequestClose,
  onSuccess,
}: NewMovementSheetProps) {
  const [operation, setOperation] = useState<FinanceTransactionKind>('expense');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [description, setDescription] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayDateOnly);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const contextKeyRef = useRef(`${contextType}:${contextLabel}`);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';
  const canSubmit = Boolean(accessToken) && !contextUnavailable && amount.isValid && !submitting;

  useEffect(() => {
    if (!visible) return;
    setDate(todayDateOnly());
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const nextKey = `${contextType}:${contextLabel}`;
    if (contextKeyRef.current !== nextKey) {
      contextKeyRef.current = nextKey;
      setSelectedCategoryId(null);
      setCategories([]);
      setCategoriesError(null);
      setSubmitError(null);
    }
  }, [contextLabel, contextType, visible]);

  useEffect(() => {
    if (!visible || !isExpense(operation) || !accessToken || contextUnavailable) {
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
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setSelectedCategoryId(null);
        setCategoriesError('No pudimos cargar las categorias. Podes registrar sin categoria.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, contextUnavailable, operation, visible]);

  const resetDraft = () => {
    setOperation('expense');
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setCurrency('ARS');
    setDescription('');
    setNotesExpanded(false);
    setNotes('');
    setDate(todayDateOnly());
    setCategories([]);
    setSelectedCategoryId(null);
    setCategoriesError(null);
    setActivePicker(null);
    setSubmitError(null);
    setSubmitting(false);
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

  const chooseOperation = (nextOperation: FinanceTransactionKind) => {
    setOperation(nextOperation);
    setSubmitError(null);
    setActivePicker(null);
    if (!isExpense(nextOperation)) {
      setSelectedCategoryId(null);
      setNotesExpanded(false);
      setNotes('');
    }
  };

  const submit = async () => {
    if (submitting) return;
    Keyboard.dismiss();
    setSubmitError(null);

    if (!accessToken) {
      setSubmitError('Tu sesion no esta disponible. Volve a iniciar sesion.');
      return;
    }
    if (contextUnavailable) {
      setSubmitError('El contexto financiero cambio o no esta disponible. Cerralo y volve a abrirlo.');
      return;
    }
    if (!amount.technicalValue) {
      setSubmitError('Ingresa un monto mayor que cero.');
      return;
    }

    const payload = {
      amount: amount.technicalValue.amount,
      currency,
      contextType,
      date,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(isExpense(operation) && selectedCategoryId ? { category: selectedCategoryId } : {}),
      ...(isExpense(operation) && notes.trim() ? { notes: notes.trim() } : {}),
    };

    const submittedOperation = operation;

    setSubmitting(true);
    try {
      if (isExpense(submittedOperation)) {
        await createFinanceExpense(accessToken, payload);
      } else {
        await createFinanceIncome(accessToken, payload);
      }
      resetDraft();
      onRequestClose();
      onSuccess(submittedOperation);
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos registrar el movimiento. Intenta de nuevo.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <View style={styles.footer}>
      <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
      <AppButton
        title={operation === 'expense' ? 'Registrar gasto' : 'Registrar ingreso'}
        onPress={() => void submit()}
        loading={submitting}
        disabled={!canSubmit}
        style={styles.footerButton}
      />
    </View>
  );

  return (
    <ActionSheet
      visible={visible}
      title="Nuevo movimiento"
      subtitle={`Finanzas de ${contextLabel}`}
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
          <View style={styles.operationSelector} accessibilityRole="tablist">
            {(['expense', 'income'] as const).map((candidate) => {
              const selected = candidate === operation;
              return (
                <InteractivePressable
                  key={candidate}
                  onPress={() => chooseOperation(candidate)}
                  disabled={submitting}
                  haptic="light"
                  pressScale={motion.scale.tab}
                  style={[styles.operationOption, selected && styles.operationOptionSelected]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={candidate === 'expense' ? 'Gasto' : 'Ingreso'}
                >
                  <AppText variant="bodySmall" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                    {candidate === 'expense' ? 'Gasto' : 'Ingreso'}
                  </AppText>
                </InteractivePressable>
              );
            })}
          </View>

          <MoneyInput
            value={amountText}
            currency={currency}
            onValueChange={handleAmountChange}
            onCurrencyChange={handleCurrencyChange}
            availableCurrencies={DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS}
            disabled={submitting}
            errorText={amount.status === 'invalid' ? 'Revisa el monto.' : undefined}
            helperText="Magnitud positiva, sin convertir monedas."
            testID="finance-new-movement-money-input"
          />

          <AppInput
            label={operation === 'expense' ? 'Descripcion (opcional)' : 'Descripcion (opcional)'}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setSubmitError(null);
            }}
            placeholder={operation === 'expense' ? 'Supermercado, farmacia, alquiler' : 'Sueldo, venta, reintegro'}
            editable={!submitting}
            returnKeyType="done"
          />

          {isExpense(operation) ? (
            <View style={styles.fieldGroup}>
              <FormActionRow
                label="Categoria"
                value={selectedCategory?.label ?? 'Sin categoria'}
                onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
                disabled={submitting || categoriesLoading}
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

          <View style={styles.contextSummary}>
            <HomePlusIcon
              name={contextType === 'personal' ? 'person-outline' : 'home-outline'}
              size={18}
              color={colors.sage[700]}
            />
            <View style={styles.contextSummaryText}>
              <AppText variant="caption" tone="secondary" weight="700">
                Contexto financiero
              </AppText>
              <AppText variant="bodySmall" weight="800" numberOfLines={1}>
                {contextLabel}
              </AppText>
            </View>
          </View>

          <FormActionRow
            label="Fecha"
            value={formatHumanDate(date)}
            onPress={() => setActivePicker('date')}
            disabled={submitting}
            accessibilityLabel={`Fecha ${formatHumanDate(date)}`}
          />

          {isExpense(operation) ? (
            <View style={styles.fieldGroup}>
              <InteractivePressable
                onPress={() => setNotesExpanded((current) => !current)}
                disabled={submitting}
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
                  placeholder="Detalle privado del gasto"
                  variant="multiline"
                  editable={!submitting}
                  multiline
                />
              ) : null}
            </View>
          ) : null}

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
