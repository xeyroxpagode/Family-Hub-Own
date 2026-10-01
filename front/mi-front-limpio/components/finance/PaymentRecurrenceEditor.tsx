import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { ApiError } from '../../services/api';
import type { FinanceContextType, FinanceActiveHousehold } from '../../services/finance/financeContext';
import {
  editPaymentSeries,
  type PaymentSeriesDto,
  type RecurrenceUnit,
  RECURRENCE_UNITS,
  PAYMENT_KINDS,
  type PaymentKind,
  formatRecurrenceSummary,
} from '../../services/finance/financePayments';
import {
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
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
import { todayDateOnly } from '../../services/finance/financeDate';

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

type PaymentRecurrenceEditorProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  activeHousehold: FinanceActiveHousehold;
  series: PaymentSeriesDto | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function PaymentRecurrenceEditor({
  visible,
  accessToken,
  contextType,
  contextLabel,
  activeHousehold,
  series,
  onRequestClose,
  onSuccess,
}: PaymentRecurrenceEditorProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [expectedAmountKnown, setExpectedAmountKnown] = useState(true);
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>({
    isValid: false,
    technicalValue: null,
    displayText: '',
    inputText: '',
    status: 'empty',
    currency: 'ARS',
    canonicalAmount: null,
    isEmpty: true,
  });
  const [currency, setCurrency] = useState<MoneyInputCurrencyCode>('ARS');
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [recurrencePresetIndex, setRecurrencePresetIndex] = useState(0);
  const [customRecurrenceUnit, setCustomRecurrenceUnit] = useState<RecurrenceUnit>(RECURRENCE_UNITS.MONTH);
  const [customRecurrenceCount, setCustomRecurrenceCount] = useState(1);
  const [recurrenceAnchorDate, setRecurrenceAnchorDate] = useState(todayDateOnly());
  const [activePicker, setActivePicker] = useState<'anchor' | 'category' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const seriesRef = useRef(series);

  useEffect(() => {
    seriesRef.current = series;
  }, [series]);

  const parseAmount = (text: string, curr: string): MoneyInputParseResult => {
    const parsed = parseMoneyInputText(text, curr as MoneyInputCurrencyCode);
    setAmount(parsed);
    return parsed;
  };

  useEffect(() => {
    if (!visible || !series) return;
    setTitle(series.title);
    setExpectedAmountKnown(series.defaultExpectedAmountKnown);
    setAmountText(series.defaultExpectedAmountKnown && series.defaultExpectedAmount ? series.defaultExpectedAmount : '');
    setCurrency(series.currency);
    parseAmount(series.defaultExpectedAmountKnown && series.defaultExpectedAmount ? series.defaultExpectedAmount : '', series.currency);
    setSelectedCategoryId(series.defaultCategoryId ?? null);

    const presetIndex = RECURRENCE_PRESETS.findIndex(
      (p) => p.value?.unit === series.recurrenceIntervalUnit && p.value?.count === series.recurrenceIntervalCount,
    );
    if (presetIndex >= 0) {
      setRecurrencePresetIndex(presetIndex);
    } else {
      setRecurrencePresetIndex(RECURRENCE_PRESETS.length - 1);
      setCustomRecurrenceUnit(series.recurrenceIntervalUnit);
      setCustomRecurrenceCount(series.recurrenceIntervalCount);
    }
    setRecurrenceAnchorDate(series.recurrenceAnchorDate);
    setSubmitError(null);
  }, [visible, series]);

  useEffect(() => {
    if (!visible || !series || !accessToken) return;
    let cancelled = false;
    setCategoriesLoading(true);
    listFinanceExpenseCategories(accessToken, contextType)
      .then((payload) => {
        if (cancelled) return;
        const selectable = payload.categories.filter((c) => c.type === 'expense' && c.selectable);
        setCategories(selectable);
        if (series.defaultCategoryId && !selectable.find((c) => c.id === series.defaultCategoryId)) {
          setSelectedCategoryId(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCategoriesError('No pudimos cargar categorías.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken, contextType, series?.id, visible]);

  const close = () => {
    if (submitting) return;
    onRequestClose();
  };

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
    setSubmitError(null);
  };

  const canSubmit = series && accessToken && !submitting && title.trim().length > 0 && (expectedAmountKnown ? amount.isValid : true);

  const submit = async () => {
    if (!canSubmit || !series || !accessToken) return;
    Keyboard.dismiss();
    setSubmitError(null);

    const preset = RECURRENCE_PRESETS[recurrencePresetIndex];
    const recurrenceUnit = preset?.value?.unit ?? customRecurrenceUnit;
    const recurrenceCount = preset?.value?.count ?? customRecurrenceCount;

    const payload = {
      title: title.trim(),
      defaultExpectedAmountKnown: expectedAmountKnown,
      defaultExpectedAmount: expectedAmountKnown ? amount.technicalValue!.amount : null,
      defaultCategoryId: selectedCategoryId ?? undefined,
      clearDefaultCategory: !selectedCategoryId,
      recurrenceIntervalUnit: recurrenceUnit,
      recurrenceIntervalCount: recurrenceCount,
      recurrenceAnchorDate: recurrenceAnchorDate,
    };

    setSubmitting(true);
    try {
      await editPaymentSeries(accessToken, contextType, series.id, payload);
      onSuccess();
      close();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No pudimos actualizar la recurrencia.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const recurrenceSummary = useMemo(() => {
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
  }, [recurrencePresetIndex, customRecurrenceUnit, customRecurrenceCount]);

  const footer = (
    <View style={styles.footer}>
      <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
      <AppButton title="Guardar cambios" onPress={submit} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
    </View>
  );

  if (!visible) return null;

  return (
    <ActionSheet
      visible={visible}
      title="Editar recurrencia"
      subtitle={`Afecta pagos futuros. ${series?.currentDue ? `Próximo: ${formatHumanDate(series.currentDue.dueDate)}` : ''}`}
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
              label="Título"
              value={title}
              onChangeText={(text: string) => { setTitle(text); setSubmitError(null); }}
              placeholder="Internet, Alquiler..."
              editable={!submitting}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="secondary" weight="700" style={styles.kindLabel}>
              Tipo: {series?.kind === PAYMENT_KINDS.NORMAL ? 'Normal' : 'Tarjeta de crédito'}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              El tipo de pago no se puede cambiar.
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <MoneyInput
              value={amountText}
              currency={currency}
              onValueChange={handleAmountChange}
              onCurrencyChange={() => {}}
              availableCurrencies={DEFAULT_MONEY_INPUT_CURRENCY_OPTIONS}
              label="Monto esperado por defecto"
              helperText={expectedAmountKnown ? 'Magnitud positiva para cada ocurrencia futura.' : 'El monto se confirmará al registrar cada pago.'}
              disabled={submitting || !expectedAmountKnown}
              errorText={expectedAmountKnown && amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
            />
          </View>

          <View style={styles.fieldGroup}>
            <InteractivePressable
              onPress={() => { setExpectedAmountKnown(!expectedAmountKnown); setSubmitError(null); }}
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

          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Categoría por defecto"
              value={categories.find((c) => c.id === selectedCategoryId)?.label ?? 'Sin categoría'}
              onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
              disabled={submitting || categoriesLoading}
              accessibilityLabel="Elegir categoría por defecto"
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

          <View style={styles.fieldGroup}>
            <AppText variant="caption" tone="secondary" weight="700" style={styles.recurrenceLabel}>
              Frecuencia
            </AppText>
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
                onPress={() => setActivePicker('anchor')}
                disabled={submitting}
                accessibilityLabel={`Fecha base de repetición ${formatHumanDate(recurrenceAnchorDate)}`}
              />
            </View>
          </View>

          <View style={styles.summary}>
            <AppText variant="caption" tone="secondary" weight="700">Resumen de la recurrencia</AppText>
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700">{title || 'Sin título'}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700" tone={expectedAmountKnown ? 'primary' : 'secondary'}>
                {expectedAmountKnown ? (amount.technicalValue ? `${amount.displayText} ${currency}` : 'Monto requerido') : 'A confirmar'} por ocurrencia
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700" tone="primary">{recurrenceSummary}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText variant="bodySmall" weight="700" tone="secondary">Fecha base: {formatHumanDate(recurrenceAnchorDate)}</AppText>
            </View>
            {series?.currentDue && (
              <View style={styles.summaryRow}>
                <AppText variant="bodySmall" weight="700" tone="tertiary">
                  Próximo pago actual: {formatHumanDate(series.currentDue.dueDate)} · {series.currentDue.expectedAmountKnown ? series.currentDue.expectedAmount : 'A confirmar'} {series.currentDue.currency}
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.note}>
            <HomePlusIcon name="information-circle-outline" size={16} color={colors.text.tertiary} />
            <AppText variant="caption" tone="tertiary">
              Los cambios afectan solo pagos futuros. Los pagos ya pagados o cancelados no se modifican.
            </AppText>
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
          visible={activePicker === 'anchor'}
          value={recurrenceAnchorDate}
          onClose={() => setActivePicker(null)}
          onConfirm={(nextDate) => { setRecurrenceAnchorDate(nextDate); setActivePicker(null); }}
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
    kindLabel: {
      marginBottom: spacing[1],
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
    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      padding: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: colors.surface.soft,
      borderWidth: 1,
      borderColor: colors.border.subtle,
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
