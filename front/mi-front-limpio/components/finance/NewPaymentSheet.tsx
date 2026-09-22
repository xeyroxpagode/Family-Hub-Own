/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
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
  getFinanceCategoryPresentation,
  getQuickFinanceCategories,
} from '../../services/finance/financeCategories';
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

const RECURRENCE_PRESETS: { label: string; value: { unit: RecurrenceUnit; count: number } | null }[] = [
  { label: 'No', value: null },
  { label: 'Cada semana', value: { unit: RECURRENCE_UNITS.WEEK, count: 1 } },
  { label: 'Cada 2 semanas', value: { unit: RECURRENCE_UNITS.WEEK, count: 2 } },
  { label: 'Cada mes', value: { unit: RECURRENCE_UNITS.MONTH, count: 1 } },
  { label: 'Cada 2 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 2 } },
  { label: 'Cada 3 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 3 } },
  { label: 'Cada 6 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 6 } },
  { label: 'Cada año', value: { unit: RECURRENCE_UNITS.YEAR, count: 1 } },
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
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [expectedAmountKnown, setExpectedAmountKnown] = useState(true);
  const [date, setDate] = useState(todayDateOnly);
  const [recurrencePresetIndex, setRecurrencePresetIndex] = useState(0);
  const [recurrenceAnchorDate, setRecurrenceAnchorDate] = useState(todayDateOnly);
  const [description, setDescription] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [activePicker, setActivePicker] = useState<'date' | 'recurrenceAnchor' | 'recurrence' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const contextKeyRef = useRef(`${contextType}:${contextLabel}`);

  const contextUnavailable = contextState === 'loading' || contextState === 'household_unavailable';
  const quickCategories = useMemo(() => getQuickFinanceCategories(categories, 8), [categories]);
  const visibleCategories = showAllCategories ? categories : quickCategories;
  const recurrencePreset = RECURRENCE_PRESETS[recurrencePresetIndex];
  const recurrenceEnabled = Boolean(recurrencePreset?.value);
  const recurrenceLabel = recurrencePreset?.label ?? 'No';

  function resetDraft() {
    const today = todayDateOnly();
    setTitle('');
    setAmountText('');
    setAmount(parseMoneyInputText('', 'ARS'));
    setCurrency('ARS');
    setExpectedAmountKnown(true);
    setDate(today);
    setRecurrencePresetIndex(0);
    setRecurrenceAnchorDate(today);
    setDescription('');
    setDetailsOpen(false);
    setSelectedCategoryId(null);
    setShowAllCategories(false);
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
      if (recurrenceEnabled && recurrencePreset?.value) {
        const seriesPayload: CreatePaymentSeriesPayload = {
          kind: PAYMENT_KINDS.NORMAL,
          title: title.trim(),
          currency,
          defaultExpectedAmountKnown: expectedAmountKnown,
          defaultExpectedAmount: payloadAmount,
          defaultCategoryId: selectedCategoryId,
          recurrenceIntervalUnit: recurrencePreset.value.unit,
          recurrenceIntervalCount: recurrencePreset.value.count,
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
    <View style={styles.footer}>
      <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
      <AppButton title="Crear pago" onPress={submit} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
    </View>
  );

  return (
    <ActionSheet
      visible={visible}
      title="Nuevo pago"
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
            <AppInput
              label="Qué pagás"
              value={title}
              onChangeText={(text) => { setTitle(text); setSubmitError(null); }}
              placeholder="Internet"
              editable={!submitting}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <MoneyInput
              value={amountText}
              currency={currency}
              onValueChange={handleAmountChange}
              onCurrencyChange={handleCurrencyChange}
              availableCurrencies={DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS}
              label="Monto"
              helperText={expectedAmountKnown ? undefined : 'Lo definís cuando registres el pago.'}
              disabled={submitting || !expectedAmountKnown}
              errorText={expectedAmountKnown && amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
            />
            <InteractivePressable
              onPress={toggleUnknownAmount}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.inlineToggle}
              accessibilityRole="switch"
              accessibilityState={{ checked: !expectedAmountKnown }}
              accessibilityLabel="Monto por definir"
            >
              <HomePlusIcon
                name={!expectedAmountKnown ? 'checkbox-outline' : 'square-outline'}
                size={20}
                color={!expectedAmountKnown ? colors.terracotta[700] : colors.text.tertiary}
              />
              <AppText variant="bodySmall" weight="800">
                Monto por definir
              </AppText>
            </InteractivePressable>
          </View>

          <FormActionRow
            label="Vence"
            value={formatHumanDate(date)}
            onPress={() => setActivePicker('date')}
            disabled={submitting}
            accessibilityLabel={`Fecha de vencimiento ${formatHumanDate(date)}`}
          />

          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Se repite"
              value={recurrenceLabel}
              onPress={() => setActivePicker((current) => current === 'recurrence' ? null : 'recurrence')}
              disabled={submitting}
              accessibilityLabel={`Repetición ${recurrenceLabel}`}
            />
            {activePicker === 'recurrence' ? (
              <View style={styles.optionList}>
                {RECURRENCE_PRESETS.map((preset, index) => {
                  const selected = recurrencePresetIndex === index;
                  return (
                    <InteractivePressable
                      key={preset.label}
                      onPress={() => { setRecurrencePresetIndex(index); setActivePicker(null); setSubmitError(null); }}
                      disabled={submitting}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={styles.optionRow}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={preset.label}
                    >
                      <HomePlusIcon
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? colors.terracotta[700] : colors.text.tertiary}
                      />
                      <AppText variant="bodySmall" weight="800" style={styles.optionLabel}>
                        {preset.label}
                      </AppText>
                    </InteractivePressable>
                  );
                })}
              </View>
            ) : null}
            {recurrenceEnabled ? (
              <FormActionRow
                label="Fecha base"
                value={formatHumanDate(recurrenceAnchorDate)}
                onPress={() => setActivePicker('recurrenceAnchor')}
                disabled={submitting}
                accessibilityLabel={`Fecha base de repetición ${formatHumanDate(recurrenceAnchorDate)}`}
              />
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="secondary" weight="700">
              Categoría
            </AppText>
            {categoriesError ? (
              <AppText variant="caption" tone="warning">{categoriesError}</AppText>
            ) : categoriesLoading ? (
              <AppText variant="caption" tone="tertiary">Cargando categorías</AppText>
            ) : null}
            <View style={styles.categoryGrid}>
              <CategoryChoice
                label="Sin categoría"
                selected={selectedCategoryId === null}
                onPress={() => setSelectedCategoryId(null)}
              />
              {visibleCategories.map((category) => (
                <CategoryChoice
                  key={category.id}
                  category={category}
                  label={category.label}
                  selected={category.id === selectedCategoryId}
                  onPress={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </View>
            {categories.length > quickCategories.length ? (
              <InteractivePressable
                onPress={() => setShowAllCategories((current) => !current)}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.textAction}
                accessibilityRole="button"
                accessibilityLabel={showAllCategories ? 'Ver menos categorías' : 'Ver todas las categorías'}
              >
                <AppText variant="caption" tone="brand" weight="800">
                  {showAllCategories ? 'Ver menos' : 'Ver todas'}
                </AppText>
                <HomePlusIcon name="chevron-forward-outline" size={14} color={colors.text.tertiary} />
              </InteractivePressable>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <InteractivePressable
              onPress={() => setDetailsOpen((current) => !current)}
              disabled={submitting}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.disclosureRow}
              accessibilityRole="button"
              accessibilityState={{ expanded: detailsOpen }}
              accessibilityLabel="Más detalles"
            >
              <AppText variant="bodySmall" weight="800">
                Más detalles
              </AppText>
              <HomePlusIcon name={detailsOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.text.tertiary} />
            </InteractivePressable>
            {detailsOpen ? (
              <AppInput
                label="Nota"
                value={description}
                onChangeText={(text) => { setDescription(text); setSubmitError(null); }}
                placeholder="Detalle opcional"
                editable={!submitting}
                returnKeyType="done"
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
          onConfirm={(nextDate) => { setDate(nextDate); setRecurrenceAnchorDate(nextDate); setActivePicker(null); }}
        />

        <DatePickerSheet
          visible={activePicker === 'recurrenceAnchor'}
          value={recurrenceAnchorDate}
          onClose={() => setActivePicker(null)}
          onConfirm={(nextDate) => { setRecurrenceAnchorDate(nextDate); setActivePicker(null); }}
        />
      </View>
    </ActionSheet>
  );
}

function CategoryChoice({
  category,
  label,
  selected,
  onPress,
}: {
  category?: FinanceCategoryDto;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const presentation = getFinanceCategoryPresentation(category);
  const iconColor = selected ? colors.text.inverse : presentation.tone === 'terracotta' ? colors.terracotta[600] : presentation.tone === 'sage' ? colors.sage[600] : colors.text.tertiary;

  return (
    <InteractivePressable
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      style={[styles.categoryChoice, selected && styles.categoryChoiceSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <HomePlusIcon name={category ? presentation.iconKey : 'pricetag-outline'} size={17} color={iconColor} />
      <AppText variant="caption" weight="800" tone={selected ? 'inverse' : 'secondary'} numberOfLines={1} style={styles.categoryChoiceLabel}>
        {label}
      </AppText>
    </InteractivePressable>
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
    fieldGroup: {
      gap: spacing[2],
    },
    inlineToggle: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[1],
    },
    optionList: {
      gap: 0,
    },
    optionRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[1],
    },
    optionLabel: {
      flex: 1,
      minWidth: 0,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
    categoryChoice: {
      minHeight: 38,
      maxWidth: '48%',
      borderRadius: radius.lg,
      backgroundColor: colors.surface.muted,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      paddingHorizontal: spacing[3],
    },
    categoryChoiceSelected: {
      backgroundColor: colors.terracotta[600],
    },
    categoryChoiceLabel: {
      flexShrink: 1,
      minWidth: 0,
    },
    textAction: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[1],
    },
    disclosureRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
      paddingHorizontal: spacing[1],
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
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
