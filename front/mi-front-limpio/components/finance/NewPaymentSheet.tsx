import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import type { FinanceContextType, FinanceContextViewState, FinanceActiveHousehold } from '../../services/finance/financeContext';
import {
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
} from '../../services/finance/financeMovements';
import {
  createOneOffPaymentDue,
  createPaymentSeries,
  type CreateOneOffPaymentDuePayload,
  type CreatePaymentSeriesPayload,
  type RecurrenceUnit,
  PAYMENT_KINDS,
  RECURRENCE_UNITS,
  type PaymentKind,
} from '../../services/finance/financePayments';
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
import { AccountSelector } from './AccountSelector';
import { useEligibleAccounts, type EligibleAccountsState } from '../../services/finance/financeAccountEligibility';
import type { FinanceAccountDto } from '../../services/finance/financeAccounts';

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

const RECURRENCE_PRESETS: Array<{ label: string; value: { unit: RecurrenceUnit; count: number } | null }> = [
  { label: 'No se repite', value: null },
  { label: 'Cada semana', value: { unit: RECURRENCE_UNITS.WEEK, count: 1 } },
  { label: 'Cada 2 semanas', value: { unit: RECURRENCE_UNITS.WEEK, count: 2 } },
  { label: 'Cada mes', value: { unit: RECURRENCE_UNITS.MONTH, count: 1 } },
  { label: 'Cada 2 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 2 } },
  { label: 'Cada 3 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 3 } },
  { label: 'Cada 6 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 6 } },
  { label: 'Cada año', value: { unit: RECURRENCE_UNITS.YEAR, count: 1 } },
];

const KIND_OPTIONS = [
  { kind: PAYMENT_KINDS.NORMAL, label: 'Pago', description: 'Gasto o ingreso recurrente' },
  { kind: PAYMENT_KINDS.CREDIT_CARD, label: 'Tarjeta de crédito', description: 'Pago de tarjeta (transferencia)' },
] as const;

const NONE_AMOUNT = '';

export function NewPaymentSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  contextState,
  activeHousehold,
  onRequestClose,
  onSuccess,
}: NewPaymentSheetProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [kind, setKind] = useState<PaymentKind>(PAYMENT_KINDS.NORMAL);
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayDateOnly);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'date' | 'category' | 'recurrence' | 'targetCard' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const contextKeyRef = useRef(`${contextType}:${contextLabel}`);

  const [expectedAmountKnown, setExpectedAmountKnown] = useState(true);

  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrencePresetIndex, setRecurrencePresetIndex] = useState(0);
  const [customRecurrenceUnit, setCustomRecurrenceUnit] = useState<RecurrenceUnit>(RECURRENCE_UNITS.MONTH);
  const [customRecurrenceCount, setCustomRecurrenceCount] = useState(1);
  const [recurrenceAnchorDate, setRecurrenceAnchorDate] = useState(todayDateOnly);

  const [targetCardId, setTargetCardId] = useState<string | null>(null);
  const [targetCardSelectorVisible, setTargetCardSelectorVisible] = useState(false);

  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';

  const isCreditCard = kind === PAYMENT_KINDS.CREDIT_CARD;

  const eligibleTargetCards: EligibleAccountsState = useEligibleAccounts({
    accessToken,
    enabled: visible && isCreditCard,
    operation: 'transfer-destination',
    contextType,
    transactionCurrency: null,
    activeHousehold,
  });

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const targetCardLoading = eligibleTargetCards ? Boolean(eligibleTargetCards.loading) : false;

  const targetCard = useMemo(
    () => eligibleTargetCards.accounts.find((account) => account.id === targetCardId) ?? null,
    [eligibleTargetCards.accounts, targetCardId],
  );

  const effectiveCurrency = useMemo(() => {
    if (isCreditCard && targetCard) return targetCard.currency as MoneyInputCurrencyCode;
    return currency;
  }, [isCreditCard, targetCard, currency]);

  const recurrenceSummary = useMemo(() => {
    if (!recurrenceEnabled) return 'No se repite';
    const preset = RECURRENCE_PRESETS[recurrencePresetIndex];
    if (preset?.value) {
      const { unit, count } = preset.value;
      const unitLabels: Record<RecurrenceUnit, { singular: string; plural: string }> = {
        DAY: { singular: 'día', plural: 'días' },
        WEEK: { singular: 'semana', plural: 'semanas' },
        MONTH: { singular: 'mes', plural: 'meses' },
        YEAR: { singular: 'año', plural: 'años' },
      };
      const { singular, plural } = unitLabels[unit];
      return `Se repite cada ${count} ${count === 1 ? singular : plural}`;
    }
    const unitLabels: Record<RecurrenceUnit, { singular: string; plural: string }> = {
      DAY: { singular: 'día', plural: 'días' },
      WEEK: { singular: 'semana', plural: 'semanas' },
      MONTH: { singular: 'mes', plural: 'meses' },
      YEAR: { singular: 'año', plural: 'años' },
    };
    const { singular, plural } = unitLabels[customRecurrenceUnit];
    return `Se repite cada ${customRecurrenceCount} ${customRecurrenceCount === 1 ? singular : plural}`;
  }, [recurrenceEnabled, recurrencePresetIndex, customRecurrenceUnit, customRecurrenceCount]);

  useEffect(() => {
    if (!visible) return;
    setDate(todayDateOnly());
    setRecurrenceAnchorDate(todayDateOnly());
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const nextKey = `${contextType}:${contextLabel}`;
    if (contextKeyRef.current !== nextKey) {
      contextKeyRef.current = nextKey;
      setKind(PAYMENT_KINDS.NORMAL);
      setTitle('');
      setAmountText('');
      setAmount(parseMoneyInputText('', 'ARS'));
      setCurrency('ARS');
      setDescription('');
      setDate(todayDateOnly());
      setSelectedCategoryId(null);
      setCategories([]);
      setCategoriesError(null);
      setSubmitError(null);
      setExpectedAmountKnown(true);
      setRecurrenceEnabled(false);
      setRecurrencePresetIndex(0);
      setCustomRecurrenceUnit(RECURRENCE_UNITS.MONTH);
      setCustomRecurrenceCount(1);
      setRecurrenceAnchorDate(todayDateOnly());
      setTargetCardId(null);
      setTargetCardSelectorVisible(false);
    }
  }, [contextLabel, contextType, visible]);

  useEffect(() => {
    if (!visible || !accessToken || contextUnavailable || !isCreditCard) {
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
        setCategoriesError('No pudimos cargar las categorias. Podés registrar sin categoria.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, contextUnavailable, visible, isCreditCard]);

  useEffect(() => {
    if (isCreditCard && targetCard) {
      setCurrency(targetCard.currency as MoneyInputCurrencyCode);
      setAmount(parseMoneyInputText(amountText, targetCard.currency as MoneyInputCurrencyCode));
    }
  }, [targetCard, isCreditCard, amountText]);

  const resetDraft = () => {
    setKind(PAYMENT_KINDS.NORMAL);
    setTitle('');
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setCurrency('ARS');
    setDescription('');
    setDate(todayDateOnly());
    setSelectedCategoryId(null);
    setCategories([]);
    setCategoriesError(null);
    setActivePicker(null);
    setSubmitError(null);
    setSubmitting(false);
    setExpectedAmountKnown(true);
    setRecurrenceEnabled(false);
    setRecurrencePresetIndex(0);
    setCustomRecurrenceUnit(RECURRENCE_UNITS.MONTH);
    setCustomRecurrenceCount(1);
    setRecurrenceAnchorDate(todayDateOnly());
    setTargetCardId(null);
    setTargetCardSelectorVisible(false);
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
    if (isCreditCard && targetCard) return; // Currency is fixed by target card
    setCurrency(nextCurrency);
    setAmount(parseMoneyInputText(amountText, nextCurrency));
    setSubmitError(null);
  };

  const handleExpectedAmountKnownChange = (known: boolean) => {
    setExpectedAmountKnown(known);
    if (!known) {
      setAmountText('');
      setAmount(parseMoneyInputText('', effectiveCurrency));
    }
    setSubmitError(null);
  };

  const canSubmit = Boolean(accessToken) && !contextUnavailable && !submitting && title.trim().length > 0 && (expectedAmountKnown ? amount.isValid : true) && (!isCreditCard || Boolean(targetCardId));

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
    if (isCreditCard && !targetCardId) {
      setSubmitError('Seleccioná la tarjeta de crédito a pagar.');
      return;
    }

    const payloadCurrency = isCreditCard && targetCard ? targetCard.currency : currency;
    const payloadAmount = expectedAmountKnown ? amount.technicalValue!.amount : null;

    const basePayload = {
      kind,
      title: title.trim(),
      currency: payloadCurrency,
      expectedAmountKnown,
      expectedAmount: payloadAmount,
      dueDate: date,
      ...(isCreditCard ? { targetCreditCardAccountId: targetCardId } : { ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}) }),
    };

    setSubmitting(true);
    try {
      if (recurrenceEnabled) {
        const preset = RECURRENCE_PRESETS[recurrencePresetIndex];
        const recurrenceUnit = preset?.value?.unit ?? customRecurrenceUnit;
        const recurrenceCount = preset?.value?.count ?? customRecurrenceCount;

        const seriesPayload: CreatePaymentSeriesPayload = {
          ...basePayload,
          defaultExpectedAmountKnown: expectedAmountKnown,
          defaultExpectedAmount: payloadAmount,
          recurrenceIntervalUnit: recurrenceUnit,
          recurrenceIntervalCount: recurrenceCount,
          recurrenceAnchorDate: recurrenceAnchorDate,
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
        : 'No pudimos crear el pago. Intenta de nuevo.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <View style={styles.footer}>
      <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
      <AppButton
        title={recurrenceEnabled ? (isCreditCard ? 'Crear pago de tarjeta recurrente' : 'Crear pago recurrente') : (isCreditCard ? 'Crear pago de tarjeta' : 'Crear pago')}
        onPress={submit}
        loading={submitting}
        disabled={!canSubmit}
        style={styles.footerButton}
      />
    </View>
  );

  return (
    <ActionSheet
      visible={visible}
      title="Agregar pago"
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
          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="secondary" weight="700" style={styles.kindLabel}>
              Tipo
            </AppText>
            <View style={styles.kindOptions}>
              {KIND_OPTIONS.map((option) => (
                <InteractivePressable
                  key={option.kind}
                  onPress={() => { setKind(option.kind); setSubmitError(null); setActivePicker(null); }}
                  disabled={submitting}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={[
                    styles.kindOption,
                    kind === option.kind && styles.kindOptionSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: kind === option.kind }}
                  accessibilityLabel={option.label}
                >
                  <AppText variant="bodySmall" weight="800" tone={kind === option.kind ? 'inverse' : 'secondary'}>
                    {option.label}
                  </AppText>
                  <AppText variant="caption" tone={kind === option.kind ? 'inverse' : 'tertiary'} style={styles.kindDescription}>
                    {option.description}
                  </AppText>
                </InteractivePressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <AppInput
              label="Nombre / Título"
              value={title}
              onChangeText={(text) => { setTitle(text); setSubmitError(null); }}
              placeholder="Internet, Alquiler, Luz..."
              editable={!submitting}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

          {isCreditCard && (
            <View style={styles.fieldGroup}>
              <FormActionRow
                label="Tarjeta"
                value={targetCard ? targetCard.name : 'Seleccionar tarjeta'}
                onPress={() => setTargetCardSelectorVisible(true)}
                disabled={submitting || targetCardLoading}
                accessibilityLabel="Elegir tarjeta de crédito a pagar"
              />
              {eligibleTargetCards.error && (
                <AppText variant="caption" tone="warning">{eligibleTargetCards.error}</AppText>
              )}
              {eligibleTargetCards.loading && !targetCard && (
                <AppText variant="caption" tone="tertiary">Cargando tarjetas...</AppText>
              )}
              {eligibleTargetCards.accounts.length === 0 && !eligibleTargetCards.loading && (
                <AppText variant="caption" tone="warning">No tenés tarjetas de crédito disponibles en este contexto.</AppText>
              )}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <MoneyInput
              value={amountText}
              currency={effectiveCurrency}
              onValueChange={handleAmountChange}
              onCurrencyChange={handleCurrencyChange}
              availableCurrencies={isCreditCard && targetCard ? [targetCard.currency as MoneyInputCurrencyCode] : DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS}
              label="Monto esperado"
              helperText={expectedAmountKnown ? 'Magnitud positiva, sin convertir monedas.' : 'El monto se confirmará al registrar el pago.'}
              disabled={Boolean(submitting || !expectedAmountKnown || (isCreditCard && targetCard && targetCardLoading))}
              errorText={expectedAmountKnown && amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
            />
          </View>

          <View style={styles.fieldGroup}>
            <InteractivePressable
              onPress={() => handleExpectedAmountKnownChange(!expectedAmountKnown)}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={[styles.knownToggle, !expectedAmountKnown && styles.knownToggleActive]}
              accessibilityRole="switch"
              accessibilityState={{ checked: !expectedAmountKnown }}
              accessibilityLabel={expectedAmountKnown ? 'Cambiar a monto a confirmar' : 'Cambiar a monto conocido'}
            >
              <HomePlusIcon
                name={expectedAmountKnown ? 'checkmark-circle-outline' : 'radio-button-off'}
                size={20}
                color={expectedAmountKnown ? colors.terracotta[700] : colors.text.tertiary}
              />
              <AppText variant="bodySmall" weight="800" style={styles.knownToggleLabel}>
                {expectedAmountKnown ? 'Monto conocido' : 'A confirmar'}
              </AppText>
            </InteractivePressable>
          </View>

          {!isCreditCard && (
            <View style={styles.fieldGroup}>
              <AppInput
                label="Descripción (opcional)"
                value={description}
                onChangeText={(text) => { setDescription(text); setSubmitError(null); }}
                placeholder="Detalle adicional..."
                editable={!submitting}
                returnKeyType="done"
              />
            </View>
          )}

          {!isCreditCard && (
            <View style={styles.fieldGroup}>
              <FormActionRow
                label="Categoría"
                value={selectedCategory?.label ?? 'Sin categoría'}
                onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
                disabled={submitting || categoriesLoading}
                accessibilityLabel="Elegir categoría de gasto"
              />
              {categoriesError ? (
                <AppText variant="caption" tone="warning">{categoriesError}</AppText>
              ) : categoriesLoading ? (
                <AppText variant="caption" tone="tertiary">Cargando categorías</AppText>
              ) : null}
              {activePicker === 'category' && (
                <View style={styles.categoryPicker} accessibilityLabel="Categorías de gasto">
                  <InteractivePressable
                    onPress={() => { setSelectedCategoryId(null); setActivePicker(null); }}
                    haptic="light"
                    pressScale={motion.scale.card}
                    style={[styles.categoryOption, selectedCategoryId === null && styles.categoryOptionSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedCategoryId === null }}
                    accessibilityLabel="Sin categoría"
                  >
                    <HomePlusIcon
                      name={selectedCategoryId === null ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedCategoryId === null ? colors.terracotta[700] : colors.text.tertiary}
                    />
                    <AppText variant="bodySmall" weight="800">Sin categoría</AppText>
                  </InteractivePressable>
                  {categories.map((category) => {
                    const selected = category.id === selectedCategoryId;
                    return (
                      <InteractivePressable
                        key={category.id}
                        onPress={() => { setSelectedCategoryId(category.id); setActivePicker(null); }}
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
              )}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Vencimiento"
              value={formatHumanDate(date)}
              onPress={() => setActivePicker('date')}
              disabled={submitting}
              accessibilityLabel={`Fecha de vencimiento ${formatHumanDate(date)}`}
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="secondary" weight="700" style={styles.recurrenceLabel}>
              Repetición
            </AppText>
            <InteractivePressable
              onPress={() => { setRecurrenceEnabled(!recurrenceEnabled); setActivePicker(null); }}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={[styles.recurrenceToggle, recurrenceEnabled && styles.recurrenceToggleActive]}
              accessibilityRole="switch"
              accessibilityState={{ checked: recurrenceEnabled }}
              accessibilityLabel={recurrenceEnabled ? 'Desactivar repetición' : 'Activar repetición'}
            >
              <HomePlusIcon
                name={recurrenceEnabled ? 'repeat-outline' : 'repeat-outline'}
                size={20}
                color={recurrenceEnabled ? colors.terracotta[700] : colors.text.tertiary}
              />
              <AppText variant="bodySmall" weight="800" style={styles.recurrenceToggleLabel}>
                {recurrenceEnabled ? 'Se repite' : 'No se repite'}
              </AppText>
            </InteractivePressable>
          </View>

          {recurrenceEnabled && (
            <View style={styles.fieldGroup}>
              <AppText variant="caption" tone="secondary" weight="700">Frecuencia</AppText>
              <View style={styles.recurrencePresets}>
                {RECURRENCE_PRESETS.map((preset, index) => {
                  const selected = recurrencePresetIndex === index;
                  return (
                    <InteractivePressable
                      key={index}
                      onPress={() => { setRecurrencePresetIndex(index); setActivePicker(null); }}
                      disabled={submitting}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={[styles.recurrencePreset, selected && styles.recurrencePresetSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={preset.label}
                    >
                      <AppText variant="bodySmall" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                        {preset.label}
                      </AppText>
                    </InteractivePressable>
                  );
                })}
              </View>

              {recurrencePresetIndex === RECURRENCE_PRESETS.length - 1 && (
                <View style={styles.customRecurrence}>
                  <View style={styles.customUnitSelector}>
                    <AppText variant="caption" tone="secondary" weight="700">Unidad</AppText>
                    <View style={styles.customUnitOptions}>
                      {(Object.values(RECURRENCE_UNITS) as RecurrenceUnit[]).map((unit) => {
                        const selected = unit === customRecurrenceUnit;
                        const label = unit === 'DAY' ? 'Día' : unit === 'WEEK' ? 'Semana' : unit === 'MONTH' ? 'Mes' : 'Año';
                        return (
                          <InteractivePressable
                            key={unit}
                            onPress={() => { setCustomRecurrenceUnit(unit); setSubmitError(null); }}
                            disabled={submitting}
                            haptic="light"
                            pressScale={motion.scale.tab}
                            style={[styles.customUnitOption, selected && styles.customUnitOptionSelected]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            accessibilityLabel={label}
                          >
                            <AppText variant="caption" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                              {label}
                            </AppText>
                          </InteractivePressable>
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.customCountInput}>
                    <AppText variant="caption" tone="secondary" weight="700">Cada</AppText>
                    <AppInput
                      label="Cuenta"
                      value={String(customRecurrenceCount)}
                      onChangeText={(text: string) => {
                        const num = parseInt(text, 10);
                        if (!isNaN(num) && num >= 1) setCustomRecurrenceCount(num);
                        setSubmitError(null);
                      }}
                      placeholder="1"
                      editable={!submitting}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      inputStyle={styles.customCountInputField}
                    />
                    <AppText variant="caption" tone="secondary" weight="700">
                      {customRecurrenceUnit === 'DAY' ? 'día(s)' : customRecurrenceUnit === 'WEEK' ? 'semana(s)' : customRecurrenceUnit === 'MONTH' ? 'mes(es)' : 'año(s)'}
                    </AppText>
                  </View>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <FormActionRow
                  label="Fecha base"
                  value={formatHumanDate(recurrenceAnchorDate)}
                  onPress={() => setActivePicker('recurrence')}
                  disabled={submitting}
                  accessibilityLabel={`Fecha base de repetición ${formatHumanDate(recurrenceAnchorDate)}`}
                />
              </View>
            </View>
          )}

          <View style={styles.summary}>
            <AppText variant="caption" tone="secondary" weight="700">Resumen</AppText>
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700">{title || 'Sin título'}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700" tone={expectedAmountKnown ? 'primary' : 'secondary'}>
                {expectedAmountKnown ? (amount.technicalValue ? `${amount.displayText} ${effectiveCurrency}` : 'Monto requerido') : 'A confirmar'}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700" tone="secondary">Vence {formatHumanDate(date)}</AppText>
            </View>
            {isCreditCard && targetCard && (
              <View style={styles.summaryRow}>
                <AppText variant="bodySmall" weight="700" tone="secondary">Tarjeta: {targetCard.name}</AppText>
              </View>
            )}
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700" tone={recurrenceEnabled ? 'primary' : 'tertiary'}>{recurrenceSummary}</AppText>
            </View>
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
          onConfirm={(nextDate) => { setDate(nextDate); setActivePicker(null); }}
        />

        <DatePickerSheet
          visible={activePicker === 'recurrence'}
          value={recurrenceAnchorDate}
          onClose={() => setActivePicker(null)}
          onConfirm={(nextDate) => { setRecurrenceAnchorDate(nextDate); setActivePicker(null); }}
        />

        <AccountSelector
          visible={targetCardSelectorVisible}
          title="Tarjeta a pagar"
          subtitle="Solo tarjetas de crédito activas"
          accounts={eligibleTargetCards.accounts}
          loading={eligibleTargetCards.loading}
          error={eligibleTargetCards.error}
          selectedAccountId={targetCardId}
          allowNone={false}
          activeHousehold={activeHousehold}
          disabled={submitting}
          operationHint="transfer-destination"
          onRequestClose={() => setTargetCardSelectorVisible(false)}
          onSelect={(account) => { setTargetCardId(account?.id ?? null); setTargetCardSelectorVisible(false); }}
        />
      </View>
    </ActionSheet>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing, touchTargets } = theme;

  return StyleSheet.create({
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
  kindSelector: {
    gap: spacing[2],
  },
  kindLabel: {
    marginBottom: spacing[1],
  },
  kindOptions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  kindOption: {
    flex: 1,
    minHeight: 60,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  kindOptionSelected: {
    backgroundColor: colors.terracotta[600],
    borderColor: colors.terracotta[600],
  },
  kindDescription: {
    textAlign: 'center',
  },
  knownToggle: {
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[3],
  },
  knownToggleActive: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[300],
  },
  knownToggleLabel: {
    flex: 1,
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
  recurrenceLabel: {
    marginBottom: spacing[1],
  },
  recurrenceToggle: {
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[3],
  },
  recurrenceToggleActive: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[300],
  },
  recurrenceToggleLabel: {
    flex: 1,
  },
  recurrencePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  recurrencePreset: {
    minHeight: 36,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  recurrencePresetSelected: {
    backgroundColor: colors.terracotta[600],
    borderColor: colors.terracotta[600],
  },
  customRecurrence: {
    gap: spacing[3],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  customUnitSelector: {
    gap: spacing[2],
  },
  customUnitOptions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  customUnitOption: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUnitOptionSelected: {
    backgroundColor: colors.terracotta[600],
    borderColor: colors.terracotta[600],
  },
  customCountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  customCountInputField: {
    width: 80,
    minHeight: touchTargets.normal,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[3],
    textAlign: 'center',
  },
  summary: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.sage[50],
    padding: spacing[4],
    gap: spacing[2],
  },
  summaryRow: {
    minHeight: 20,
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
