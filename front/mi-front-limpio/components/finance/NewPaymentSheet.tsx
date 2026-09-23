/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import type { FinanceActiveHousehold, FinanceContextType, FinanceContextViewState } from '../../services/finance/financeContext';
import {
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
} from '../../services/finance/financeMovements';
import {
  createOneOffPaymentDue,
  createPaymentSeries,
  PAYMENT_KINDS,
  RECURRENCE_UNITS,
  type CreateOneOffPaymentDuePayload,
  type CreatePaymentSeriesPayload,
  type RecurrenceUnit,
} from '../../services/finance/financePayments';
import {
  DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS,
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from '../../services/finance/moneyInputValue';
import {
  ActionSheet,
  AppInput,
  AppText,
  DatePickerSheet,
  InteractivePressable,
  formatHumanDate,
} from '../ui';
import {
  FinanceDisclosureRow,
  FinanceErrorState,
  FinanceFormFooter,
  FinanceInlineChoice,
  FinanceSelectionRow,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';
import { MoneyInput } from './MoneyInput';
import { CategorySelectorSheet } from './CategorySelectorSheet';

type NewPaymentSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  contextState: FinanceContextViewState;
  activeHousehold: FinanceActiveHousehold;
  onRequestClose: () => void;
  onSuccess: () => void;
};

const todayDateOnly = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

type RecurrenceChoice = 'none' | 'week' | 'month' | 'year';

const RECURRENCE_CHOICES: { key: RecurrenceChoice; label: string; value: { unit: RecurrenceUnit; count: number } | null }[] = [
  { key: 'none', label: 'No', value: null },
  { key: 'week', label: 'Semanal', value: { unit: RECURRENCE_UNITS.WEEK, count: 1 } },
  { key: 'month', label: 'Mensual', value: { unit: RECURRENCE_UNITS.MONTH, count: 1 } },
  { key: 'year', label: 'Anual', value: { unit: RECURRENCE_UNITS.YEAR, count: 1 } },
];

export function NewPaymentSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  contextState,
  onRequestClose,
  onSuccess,
}: NewPaymentSheetProps) {
  const theme = useAppTheme();
  const { motion } = theme;
  const styles = createStyles(theme);
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [expectedAmountKnown, setExpectedAmountKnown] = useState(true);
  const [date, setDate] = useState(todayDateOnly);
  const [recurrenceChoice, setRecurrenceChoice] = useState<RecurrenceChoice>('none');
  const [recurrenceAnchorDate, setRecurrenceAnchorDate] = useState(todayDateOnly);
  const [description, setDescription] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'date' | 'recurrenceAnchor' | 'category' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const contextKeyRef = useRef(`${contextType}:${contextLabel}`);

  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const recurrenceSelected = RECURRENCE_CHOICES.find((choice) => choice.key === recurrenceChoice) ?? RECURRENCE_CHOICES[0];
  const recurrenceEnabled = Boolean(recurrenceSelected.value);

  function resetDraft() {
    const today = todayDateOnly();
    setTitle('');
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setCurrency('ARS');
    setExpectedAmountKnown(true);
    setDate(today);
    setRecurrenceChoice('none');
    setRecurrenceAnchorDate(today);
    setDescription('');
    setDetailsOpen(false);
    setSelectedCategoryId(null);
    setActivePicker(null);
    setSubmitError(null);
    setSubmitting(false);
  }

  useEffect(() => {
    if (!visible) return;
    const today = todayDateOnly();
    setDate(today);
    setRecurrenceAnchorDate(today);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const nextKey = `${contextType}:${contextLabel}`;
    if (contextKeyRef.current !== nextKey) {
      contextKeyRef.current = nextKey;
      resetDraft();
    }
  }, [contextLabel, contextType, visible]);

  useEffect(() => {
    if (!visible || !accessToken || contextUnavailable) {
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
        setCategoriesError('No pudimos cargar las categorías. Podés crear el pago sin categoría.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, contextUnavailable, visible]);

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

  const toggleUnknownAmount = () => {
    const nextKnown = !expectedAmountKnown;
    setExpectedAmountKnown(nextKnown);
    if (!nextKnown) {
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
    }
    setSubmitError(null);
  };

  const canSubmit = Boolean(accessToken)
    && !contextUnavailable
    && !submitting
    && title.trim().length > 0
    && (expectedAmountKnown ? amount.isValid : true);

  const submit = async () => {
    if (!canSubmit) return;
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
    if (expectedAmountKnown && !amount.technicalValue) {
      setSubmitError('Ingresá un monto mayor que cero.');
      return;
    }

    const payloadAmount = expectedAmountKnown ? amount.technicalValue!.amount : null;
    const basePayload = {
      kind: PAYMENT_KINDS.NORMAL,
      title: title.trim(),
      currency,
      expectedAmountKnown,
      expectedAmount: payloadAmount,
      dueDate: date,
      ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
    };

    setSubmitting(true);
    try {
      if (recurrenceEnabled && recurrenceSelected.value) {
        const seriesPayload: CreatePaymentSeriesPayload = {
          kind: PAYMENT_KINDS.NORMAL,
          title: title.trim(),
          currency,
          defaultExpectedAmountKnown: expectedAmountKnown,
          defaultExpectedAmount: payloadAmount,
          defaultCategoryId: selectedCategoryId,
          recurrenceIntervalUnit: recurrenceSelected.value.unit,
          recurrenceIntervalCount: recurrenceSelected.value.count,
          recurrenceAnchorDate,
        };
        await createPaymentSeries(accessToken, contextType, seriesPayload);
      } else {
        const duePayload: CreateOneOffPaymentDuePayload = basePayload;
        await createOneOffPaymentDue(accessToken, contextType, duePayload);
      }
      resetDraft();
      onRequestClose();
      onSuccess();
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'No pudimos crear el pago. Intentá de nuevo.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <FinanceFormFooter
      primaryTitle="Crear pago"
      onPrimary={submit}
      onCancel={close}
      primaryDisabled={!canSubmit}
      loading={submitting}
      divided={false}
    />
  );

  return (
    <ActionSheet
      visible={visible}
      title="Nuevo pago"
      subtitle={`Finanzas de ${contextLabel}`}
      onRequestClose={close}
      closeDisabled={submitting}
      size={FINANCE_SHEET_SIZE_POLICY.LONG_FORM}
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
          <AppInput
            label="Nombre"
            value={title}
            onChangeText={(text) => { setTitle(text); setSubmitError(null); }}
            placeholder="Internet"
            editable={!submitting}
            returnKeyType="next"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.fieldHeaderRow}>
            <AppText variant="caption" tone="secondary" weight="700">
              Monto
            </AppText>
            <InteractivePressable
              onPress={toggleUnknownAmount}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.contextAction}
              accessibilityRole="switch"
              accessibilityState={{ checked: !expectedAmountKnown }}
              accessibilityLabel={expectedAmountKnown ? 'Monto por definir' : 'Definir monto'}
            >
              <AppText variant="caption" tone="brand" weight="800">
                {expectedAmountKnown ? 'Por definir' : 'Definir monto'}
              </AppText>
            </InteractivePressable>
          </View>
          {expectedAmountKnown ? (
            <MoneyInput
              value={amountText}
              currency={currency}
              onValueChange={handleAmountChange}
              onCurrencyChange={handleCurrencyChange}
              availableCurrencies={DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS}
              disabled={submitting}
              errorText={amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
            />
          ) : (
            <View style={styles.undefinedAmount}>
              <AppText variant="bodySmall" weight="800">
                Monto por definir
              </AppText>
              <AppText variant="caption" tone="secondary">
                Lo definís cuando registres el pago.
              </AppText>
            </View>
          )}
        </View>

        <FinanceSelectionRow
          label="Vence"
          value={formatHumanDate(date)}
          onPress={() => setActivePicker('date')}
          disabled={submitting}
          accessibilityLabel={`Fecha de vencimiento ${formatHumanDate(date)}`}
        />

        <View style={styles.fieldGroup}>
          <FinanceInlineChoice
            label="Se repite"
            value={recurrenceChoice}
            options={RECURRENCE_CHOICES.map(({ key, label }) => ({ value: key, label }))}
            onChange={(next) => { setRecurrenceChoice(next); setSubmitError(null); }}
            testID="new-payment-recurrence-choice"
          />
          {recurrenceEnabled ? (
            <FinanceSelectionRow
              label="Comienza el"
              value={formatHumanDate(recurrenceAnchorDate)}
              onPress={() => setActivePicker('recurrenceAnchor')}
              disabled={submitting}
              accessibilityLabel={`Fecha de inicio ${formatHumanDate(recurrenceAnchorDate)}`}
            />
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          {categoriesError ? (
            <AppText variant="caption" tone="warning">{categoriesError}</AppText>
          ) : categoriesLoading ? (
            <AppText variant="caption" tone="tertiary">Cargando categorías</AppText>
          ) : null}
          <FinanceSelectionRow
            label="Categoría"
            value={selectedCategory?.label ?? 'Sin categoría'}
            onPress={() => setActivePicker('category')}
            disabled={submitting}
            accessibilityLabel={`Categoría ${selectedCategory?.label ?? 'Sin categoría'}`}
          />
        </View>

        <FinanceDisclosureRow
          label="Más detalles"
          expanded={detailsOpen}
          onToggle={() => setDetailsOpen((current) => !current)}
          disabled={submitting}
        >
          <AppInput
            label="Nota"
            value={description}
            onChangeText={(text) => { setDescription(text); setSubmitError(null); }}
            placeholder="Detalle opcional"
            editable={!submitting}
            returnKeyType="done"
          />
        </FinanceDisclosureRow>

        {submitError ? (
          <FinanceErrorState level="form" message={submitError} />
        ) : null}
      </KeyboardAwareScrollView>

      <DatePickerSheet
        visible={activePicker === 'date'}
        value={date}
        onClose={() => setActivePicker(null)}
        onConfirm={(nextDate) => { setDate(nextDate); setRecurrenceAnchorDate(nextDate); setActivePicker(null); }}
      />

      <DatePickerSheet
        visible={activePicker === 'recurrenceAnchor'}
        value={recurrenceAnchorDate}
        onClose={() => setActivePicker(null)}
        onConfirm={(nextDate) => { setRecurrenceAnchorDate(nextDate); setActivePicker(null); }}
      />

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
    fieldHeaderRow: {
      minHeight: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
    },
    contextAction: {
      minHeight: 32,
      justifyContent: 'center',
      paddingHorizontal: spacing[1],
    },
    undefinedAmount: {
      minHeight: 54,
      borderRadius: radius.lg,
      backgroundColor: colors.surface.muted,
      justifyContent: 'center',
      gap: spacing[1],
      paddingHorizontal: spacing[3],
    },
  });
}
