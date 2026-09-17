import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { ApiError } from '../../services/api';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  editPaymentDue,
  editPaymentSeries,
  PAYMENT_SERIES_STATUSES,
  RECURRENCE_UNITS,
  type PaymentDueDto,
  type RecurrenceUnit,
} from '../../services/finance/financePayments';
import { listFinanceExpenseCategories, type FinanceCategoryDto } from '../../services/finance/financeMovements';
import { parseMoneyInputText, type MoneyInputCurrencyCode, type MoneyInputParseResult } from '../../services/finance/moneyInputValue';
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

type EditScope = 'single' | 'series';

type RecurrencePreset = {
  label: string;
  value: { unit: RecurrenceUnit; count: number } | null;
};

const RECURRENCE_PRESETS: RecurrencePreset[] = [
  { label: 'Cada semana', value: { unit: RECURRENCE_UNITS.WEEK, count: 1 } },
  { label: 'Cada 2 semanas', value: { unit: RECURRENCE_UNITS.WEEK, count: 2 } },
  { label: 'Cada mes', value: { unit: RECURRENCE_UNITS.MONTH, count: 1 } },
  { label: 'Cada 2 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 2 } },
  { label: 'Cada 3 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 3 } },
  { label: 'Cada 6 meses', value: { unit: RECURRENCE_UNITS.MONTH, count: 6 } },
  { label: 'Cada año', value: { unit: RECURRENCE_UNITS.YEAR, count: 1 } },
  { label: 'Personalizado', value: null },
];

type EditPaymentDueSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  payment: PaymentDueDto | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function EditPaymentDueSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  payment,
  onRequestClose,
  onSuccess,
}: EditPaymentDueSheetProps) {
  const [editScope, setEditScope] = useState<EditScope>('single');
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', 'ARS'));
  const [expectedAmountKnown, setExpectedAmountKnown] = useState(true);
  const [date, setDate] = useState('');
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [recurrencePresetIndex, setRecurrencePresetIndex] = useState(0);
  const [customRecurrenceUnit, setCustomRecurrenceUnit] = useState<RecurrenceUnit>(RECURRENCE_UNITS.MONTH);
  const [customRecurrenceCount, setCustomRecurrenceCount] = useState(1);
  const [recurrenceAnchorDate, setRecurrenceAnchorDate] = useState('');
  const [activePicker, setActivePicker] = useState<'date' | 'anchor' | 'category' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeSeries = payment?.paymentSeries?.status === PAYMENT_SERIES_STATUSES.ACTIVE ? payment.paymentSeries : null;
  const isRecurring = Boolean(activeSeries);
  const currency = (editScope === 'series'
    ? activeSeries?.currency ?? payment?.currency ?? 'ARS'
    : payment?.currency ?? 'ARS') as MoneyInputCurrencyCode;

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    if (!visible || !payment) return;
    setEditScope('single');
    setSubmitError(null);
    setActivePicker(null);
  }, [payment?.id, visible]);

  useEffect(() => {
    if (!visible || !payment) return;

    if (editScope === 'series' && activeSeries) {
      setTitle(activeSeries.title);
      setExpectedAmountKnown(activeSeries.defaultExpectedAmountKnown);
      const nextAmount = activeSeries.defaultExpectedAmountKnown && activeSeries.defaultExpectedAmount ? activeSeries.defaultExpectedAmount : '';
      setAmountText(nextAmount);
      setAmount(parseMoneyInputText(nextAmount, activeSeries.currency as MoneyInputCurrencyCode));
      setSelectedCategoryId(activeSeries.defaultCategoryId ?? null);
      setDate(payment.dueDate);
      setRecurrenceAnchorDate(activeSeries.recurrenceAnchorDate);
      const presetIndex = RECURRENCE_PRESETS.findIndex(
        (preset) => preset.value?.unit === activeSeries.recurrenceIntervalUnit && preset.value?.count === activeSeries.recurrenceIntervalCount,
      );
      if (presetIndex >= 0) {
        setRecurrencePresetIndex(presetIndex);
      } else {
        setRecurrencePresetIndex(RECURRENCE_PRESETS.length - 1);
        setCustomRecurrenceUnit(activeSeries.recurrenceIntervalUnit);
        setCustomRecurrenceCount(activeSeries.recurrenceIntervalCount);
      }
      return;
    }

    setTitle(payment.title);
    setExpectedAmountKnown(payment.expectedAmountKnown);
    const nextAmount = payment.expectedAmountKnown && payment.expectedAmount ? payment.expectedAmount : '';
    setAmountText(nextAmount);
    setAmount(parseMoneyInputText(nextAmount, payment.currency as MoneyInputCurrencyCode));
    setDate(payment.dueDate);
    setSelectedCategoryId(payment.categoryId ?? null);
    if (activeSeries) {
      setRecurrenceAnchorDate(activeSeries.recurrenceAnchorDate);
    }
  }, [activeSeries, editScope, payment, visible]);

  useEffect(() => {
    if (!visible || !accessToken) return;
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);

    listFinanceExpenseCategories(accessToken, contextType)
      .then((payload) => {
        if (cancelled) return;
        setCategories(payload.categories.filter((category) => category.type === 'expense' && category.selectable));
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setCategoriesError('No pudimos cargar categorias. Podes guardar sin categoria.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, visible]);

  const close = () => {
    if (submitting) return;
    onRequestClose();
  };

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmountText(next.inputText);
    setAmount(next);
    setSubmitError(null);
  };

  const toggleKnown = () => {
    const nextKnown = !expectedAmountKnown;
    setExpectedAmountKnown(nextKnown);
    if (!nextKnown) {
      setAmountText('');
      setAmount(parseMoneyInputText('', currency));
    }
    setSubmitError(null);
  };

  const preset = RECURRENCE_PRESETS[recurrencePresetIndex];
  const recurrenceUnit = preset?.value?.unit ?? customRecurrenceUnit;
  const recurrenceCount = preset?.value?.count ?? customRecurrenceCount;
  const canSubmit = Boolean(accessToken) &&
    Boolean(payment) &&
    !submitting &&
    title.trim().length > 0 &&
    (expectedAmountKnown ? amount.isValid : true) &&
    (editScope === 'single' || (Boolean(activeSeries) && recurrenceCount >= 1 && Boolean(recurrenceAnchorDate)));

  const submit = async () => {
    if (!canSubmit || !accessToken || !payment) return;
    Keyboard.dismiss();
    setSubmitError(null);

    if (expectedAmountKnown && !amount.technicalValue) {
      setSubmitError('Ingresá un monto mayor que cero o marcá A confirmar.');
      return;
    }

    setSubmitting(true);
    try {
      if (editScope === 'series' && activeSeries) {
        await editPaymentSeries(accessToken, contextType, activeSeries.id, {
          title: title.trim(),
          defaultExpectedAmountKnown: expectedAmountKnown,
          defaultExpectedAmount: expectedAmountKnown ? amount.technicalValue!.amount : null,
          defaultCategoryId: selectedCategoryId ?? undefined,
          clearDefaultCategory: selectedCategoryId === null,
          recurrenceIntervalUnit: recurrenceUnit,
          recurrenceIntervalCount: recurrenceCount,
          recurrenceAnchorDate,
        });
      } else {
        await editPaymentDue(accessToken, contextType, payment.id, {
          title: title.trim(),
          expectedAmountKnown,
          expectedAmount: expectedAmountKnown ? amount.technicalValue!.amount : null,
          dueDate: date,
          categoryId: selectedCategoryId ?? undefined,
          clearCategory: selectedCategoryId === null,
        });
      }
      onSuccess();
      close();
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'No pudimos guardar los cambios.');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <View style={styles.footer}>
      <AppButton title="Cancelar" variant="ghost" onPress={close} disabled={submitting} style={styles.footerButton} />
      <AppButton title="Guardar" onPress={submit} loading={submitting} disabled={!canSubmit} style={styles.footerButton} />
    </View>
  );

  if (!visible || !payment) return null;

  return (
    <ActionSheet
      visible={visible}
      title="Editar"
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
          {isRecurring ? (
            <View style={styles.fieldGroup}>
              <AppText variant="caption" tone="secondary" weight="700">Aplicar cambios a</AppText>
              <View style={styles.scopeSelector} accessibilityRole="tablist">
                <ScopeOption
                  selected={editScope === 'single'}
                  label="Solo este pago"
                  onPress={() => { setEditScope('single'); setSubmitError(null); setActivePicker(null); }}
                  disabled={submitting}
                />
                <ScopeOption
                  selected={editScope === 'series'}
                  label="Este y los siguientes"
                  onPress={() => { setEditScope('series'); setSubmitError(null); setActivePicker(null); }}
                  disabled={submitting}
                />
              </View>
            </View>
          ) : null}

          <AppInput
            label="Nombre / título"
            value={title}
            onChangeText={(text) => { setTitle(text); setSubmitError(null); }}
            placeholder="Internet, Alquiler, Luz..."
            editable={!submitting}
            returnKeyType="next"
            autoCapitalize="words"
          />

          <MoneyInput
            value={amountText}
            currency={currency}
            onValueChange={handleAmountChange}
            onCurrencyChange={() => undefined}
            availableCurrencies={[currency]}
            label="Monto esperado"
            helperText={expectedAmountKnown ? 'Magnitud positiva.' : 'El monto se confirmará al registrar el pago.'}
            disabled={submitting || !expectedAmountKnown}
            errorText={expectedAmountKnown && amount.status === 'invalid' ? 'Revisá el monto.' : undefined}
          />

          <InteractivePressable
            onPress={toggleKnown}
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

          <View style={styles.fieldGroup}>
            <FormActionRow
              label="Categoría"
              value={selectedCategory?.label ?? 'Sin categoría'}
              onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
              disabled={submitting || categoriesLoading}
              accessibilityLabel="Elegir categoría de gasto"
            />
            {categoriesError ? <AppText variant="caption" tone="warning">{categoriesError}</AppText> : null}
            {activePicker === 'category' ? (
              <View style={styles.categoryPicker} accessibilityLabel="Categorías de gasto">
                <CategoryOption
                  selected={selectedCategoryId === null}
                  label="Sin categoría"
                  onPress={() => { setSelectedCategoryId(null); setActivePicker(null); }}
                />
                {categories.map((category) => (
                  <CategoryOption
                    key={category.id}
                    selected={category.id === selectedCategoryId}
                    label={category.label}
                    onPress={() => { setSelectedCategoryId(category.id); setActivePicker(null); }}
                  />
                ))}
              </View>
            ) : null}
          </View>

          {editScope === 'single' ? (
            <FormActionRow
              label="Vencimiento"
              value={formatHumanDate(date)}
              onPress={() => setActivePicker('date')}
              disabled={submitting}
              accessibilityLabel={`Fecha de vencimiento ${formatHumanDate(date)}`}
            />
          ) : (
            <View style={styles.fieldGroup}>
              <AppText variant="caption" tone="secondary" weight="700">Frecuencia</AppText>
              <View style={styles.recurrencePresets}>
                {RECURRENCE_PRESETS.map((recurrencePreset, index) => {
                  const selected = recurrencePresetIndex === index;
                  return (
                    <InteractivePressable
                      key={recurrencePreset.label}
                      onPress={() => { setRecurrencePresetIndex(index); setActivePicker(null); setSubmitError(null); }}
                      disabled={submitting}
                      haptic="light"
                      pressScale={motion.scale.card}
                      style={[styles.recurrencePreset, selected && styles.recurrencePresetSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={recurrencePreset.label}
                    >
                      <AppText variant="bodySmall" weight="800" tone={selected ? 'inverse' : 'secondary'}>
                        {recurrencePreset.label}
                      </AppText>
                    </InteractivePressable>
                  );
                })}
              </View>

              {recurrencePresetIndex === RECURRENCE_PRESETS.length - 1 ? (
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
                      label="Cantidad"
                      value={String(customRecurrenceCount)}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (!Number.isNaN(num) && num >= 1) setCustomRecurrenceCount(num);
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
              ) : null}

              <FormActionRow
                label="Fecha base"
                value={formatHumanDate(recurrenceAnchorDate)}
                onPress={() => setActivePicker('anchor')}
                disabled={submitting}
                accessibilityLabel={`Fecha base ${formatHumanDate(recurrenceAnchorDate)}`}
              />
            </View>
          )}

          {submitError ? (
            <View style={styles.errorBox}>
              <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
              <AppText variant="bodySmall" tone="danger" style={styles.errorText}>{submitError}</AppText>
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
          visible={activePicker === 'anchor'}
          value={recurrenceAnchorDate}
          onClose={() => setActivePicker(null)}
          onConfirm={(nextDate) => { setRecurrenceAnchorDate(nextDate); setActivePicker(null); }}
        />
      </View>
    </ActionSheet>
  );
}

function ScopeOption({ selected, label, onPress, disabled }: { selected: boolean; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <InteractivePressable
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      pressScale={motion.scale.tab}
      style={[styles.scopeOption, selected && styles.scopeOptionSelected]}
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      <AppText variant="caption" weight="800" tone={selected ? 'inverse' : 'secondary'} numberOfLines={1}>
        {label}
      </AppText>
    </InteractivePressable>
  );
}

function CategoryOption({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <InteractivePressable
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <HomePlusIcon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={selected ? colors.terracotta[700] : colors.text.tertiary}
      />
      <AppText variant="bodySmall" weight="800" numberOfLines={1} style={styles.categoryLabel}>{label}</AppText>
    </InteractivePressable>
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
  fieldGroup: {
    gap: spacing[2],
  },
  scopeSelector: {
    minHeight: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.muted,
    flexDirection: 'row',
    padding: spacing[1],
    gap: spacing[1],
  },
  scopeOption: {
    flex: 1,
    minHeight: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  scopeOptionSelected: {
    backgroundColor: colors.terracotta[600],
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
