import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  ActionSheet,
  AppInput,
  InteractivePressable,
} from '../ui';
import { colors, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  createFinanceSpendingLimit,
  editFinanceSpendingLimit,
  type CreateFinanceSpendingLimitInput,
  type EditFinanceSpendingLimitInput,
  type FinanceSpendingLimitScopeType,
  type FinanceSpendingLimitPeriodType,
  type FinanceSpendingLimitRecurrenceType,
} from '../../services/finance/financeSpendingLimits';
import { listFinanceExpenseCategories, type FinanceCategoryDto } from '../../services/finance/financeMovements';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import { generateMutationId } from '../../services/api';

type SpendingLimitSheetMode = 'create' | 'edit';

type SpendingLimitSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  mode: SpendingLimitSheetMode;
  basePeriod: string;
  initialScopeType?: FinanceSpendingLimitScopeType;
  initialPeriodType?: FinanceSpendingLimitPeriodType;
  initialData?: {
    id: string;
    scopeType: FinanceSpendingLimitScopeType;
    categoryId: string | null;
    periodType: FinanceSpendingLimitPeriodType;
    period: string;
    recurrenceType: FinanceSpendingLimitRecurrenceType;
    amount: string;
  } | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

const SCOPE_LABELS: Record<FinanceSpendingLimitScopeType, string> = {
  OVERALL: 'General',
  CATEGORY: 'Categoría',
};

const PERIOD_LABELS: Record<FinanceSpendingLimitPeriodType, string> = {
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
};

const RECURRENCE_LABELS: Record<FinanceSpendingLimitRecurrenceType, string> = {
  ONE_OFF: 'Una vez',
  RECURRING: 'Recurrente',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatPeriodHuman(periodType: FinanceSpendingLimitPeriodType, period: string): string {
  if (periodType === 'MONTHLY') {
    const [year, month] = period.split('-').map(Number);
    if (year && month && month >= 1 && month <= 12) {
      return `${MONTH_NAMES[month - 1]} ${year}`;
    }
    return period;
  }
  return period;
}

function parsePeriodHuman(periodType: FinanceSpendingLimitPeriodType, human: string): string {
  if (periodType === 'MONTHLY') {
    const parts = human.split(' ');
    if (parts.length === 2) {
      const monthName = parts[0];
      const year = parts[1];
      const monthIndex = MONTH_NAMES.indexOf(monthName);
      if (monthIndex >= 0) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      }
    }
    return human;
  }
  return human;
}

function deriveDefaultPeriod(basePeriod: string, periodType: FinanceSpendingLimitPeriodType): string {
  if (periodType === 'MONTHLY') {
    return basePeriod;
  }
  return basePeriod.slice(0, 4);
}

export function SpendingLimitSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  mode,
  basePeriod,
  initialScopeType,
  initialPeriodType,
  initialData,
  onRequestClose,
  onSuccess,
}: SpendingLimitSheetProps) {
  const [scopeType, setScopeType] = useState<FinanceSpendingLimitScopeType>('OVERALL');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<FinanceSpendingLimitPeriodType>('MONTHLY');
  const [period, setPeriod] = useState<string>('');
  const [periodDisplay, setPeriodDisplay] = useState<string>('');
  const [recurrenceType, setRecurrenceType] = useState<FinanceSpendingLimitRecurrenceType>('RECURRING');
  const [amount, setAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editScope, setEditScope] = useState<'ONE_OFF' | 'THIS_PERIOD' | 'THIS_AND_FOLLOWING'>('THIS_AND_FOLLOWING');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initialData) {
        setScopeType(initialData.scopeType);
        setCategoryId(initialData.categoryId);
        setPeriodType(initialData.periodType);
        setPeriod(initialData.period);
        setPeriodDisplay(formatPeriodHuman(initialData.periodType, initialData.period));
        setRecurrenceType(initialData.recurrenceType);
        setAmount(initialData.amount);
      } else {
        const effectiveScopeType = initialScopeType ?? 'OVERALL';
        const effectivePeriodType = initialPeriodType ?? 'MONTHLY';
        const defaultPeriod = deriveDefaultPeriod(basePeriod, effectivePeriodType);
        setScopeType(effectiveScopeType);
        setCategoryId(null);
        setPeriodType(effectivePeriodType);
        setPeriod(defaultPeriod);
        setPeriodDisplay(formatPeriodHuman(effectivePeriodType, defaultPeriod));
        setRecurrenceType('RECURRING');
        setAmount('');
      }
      setAmountError(null);
      setError(null);
      setSubmitting(false);
      setEditScope('THIS_AND_FOLLOWING');
      setCategoryPickerVisible(false);
    }
  }, [visible, mode, initialData, initialScopeType, initialPeriodType, basePeriod]);

  useEffect(() => {
    if (scopeType === 'CATEGORY' && categories.length === 0 && !categoriesLoading) {
      loadCategories();
    }
  }, [scopeType, contextType, accessToken]);

  useEffect(() => {
    if (scopeType === 'OVERALL') {
      setCategoryId(null);
    }
  }, [scopeType]);

  useEffect(() => {
    const defaultPeriod = deriveDefaultPeriod(basePeriod, periodType);
    if (period !== defaultPeriod) {
      setPeriod(defaultPeriod);
      setPeriodDisplay(formatPeriodHuman(periodType, defaultPeriod));
    }
  }, [periodType, basePeriod]);

  const loadCategories = async () => {
    if (!accessToken) return;
    setCategoriesLoading(true);
    try {
      const data = await listFinanceExpenseCategories(accessToken, contextType);
      setCategories(data.categories);
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validate = () => {
    if (!amount.trim()) {
      setAmountError('El monto es obligatorio');
      return false;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('El monto debe ser mayor que cero');
      return false;
    }
    if (scopeType === 'CATEGORY' && !categoryId) {
      setError('Debés seleccionar una categoría');
      return false;
    }
    setAmountError(null);
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !accessToken || submitting) return;

    const controller = new AbortController();
    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `spending-limit-${mode}-${mutationId}`;

      if (mode === 'create') {
        const payload: CreateFinanceSpendingLimitInput = {
          scopeType,
          categoryId: scopeType === 'CATEGORY' ? categoryId : null,
          periodType,
          period,
          recurrenceType,
          amount: amount.trim(),
          currency,
        };
        const payloadHash = await hashIdempotencyRequestV2({
          operation: 'finance.spendingLimit.create',
          scopeType: contextType,
          scopeId: contextType === 'personal' ? 'personal' : contextLabel,
          targetId: null,
          payload,
          expectedVersion: null,
          mutationId,
        });

        await createFinanceSpendingLimit({
          accessToken,
          contextType,
          input: payload,
          mutationId,
          idempotencyKey,
          payloadHash,
          signal: controller?.signal ?? null,
          contextScope: `spending-limit-create-${mutationId}`,
        });
      } else if (mode === 'edit' && initialData) {
        const isOneOff = initialData.recurrenceType === 'ONE_OFF';
        const effectiveEditScope = isOneOff ? 'ONE_OFF' : editScope;
        const payload: EditFinanceSpendingLimitInput = {
          id: initialData.id,
          period,
          editScope: effectiveEditScope,
          amount: amount.trim(),
        };
        const payloadHash = await hashIdempotencyRequestV2({
          operation: 'finance.spendingLimit.edit',
          scopeType: contextType,
          scopeId: contextType === 'personal' ? 'personal' : contextLabel,
          targetId: initialData.id,
          payload,
          expectedVersion: null,
          mutationId,
        });

        await editFinanceSpendingLimit({
          accessToken,
          contextType,
          input: payload,
          mutationId,
          idempotencyKey,
          payloadHash,
          signal: controller?.signal ?? null,
          contextScope: `spending-limit-edit-${mutationId}`,
        });
      }

      onSuccess();
    } catch (err: any) {
      if (err?.code === 'finance_spending_limit_slot_exists') {
        setError('Ya existe un límite efectivo para ese período.');
      } else if (err?.code === 'finance_spending_limit_past_period_forbidden') {
        setError('No se pueden modificar períodos completados.');
      } else if (err?.code === 'finance_spending_limit_category_deleted') {
        setError('La categoría ya no está disponible para nuevos límites.');
      } else if (err?.code === 'invalid_finance_spending_limit_amount') {
        setAmountError('El monto del límite debe ser mayor que cero.');
      } else {
        setError(err?.message ?? `No pudimos ${mode === 'create' ? 'crear' : 'editar'} el límite. Intenta de nuevo.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  const isEdit = mode === 'edit';
  const title = isEdit ? 'Editar límite' : 'Nuevo límite';
  const submitLabel = isEdit ? 'Guardar cambios' : 'Crear límite';
  const isOneOff = recurrenceType === 'ONE_OFF' || (isEdit && initialData?.recurrenceType === 'ONE_OFF');

  return (
    <ActionSheet
      visible={true}
      title={title}
      onRequestClose={onRequestClose}
      size="full"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <AppText variant="caption" tone="secondary" style={styles.hint}>
              {currency} · {PERIOD_LABELS[periodType]}
            </AppText>

            <AppCard variant="quiet" padding="default" style={styles.formCard}>
              <View style={styles.fieldGroup}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.fieldLabel}>
                  ¿Qué querés limitar?
                </AppText>
                <View style={styles.segmentedControl}>
                  {(['OVERALL', 'CATEGORY'] as FinanceSpendingLimitScopeType[]).map((type) => (
                    <InteractivePressable
                      key={type}
                      onPress={() => {
                        setScopeType(type);
                        if (type === 'OVERALL') {
                          setCategoryId(null);
                        }
                      }}
                      haptic="light"
                      pressScale={1}
                      style={[
                        styles.segmentButton,
                        scopeType === type && styles.segmentButtonSelected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: scopeType === type }}
                    >
                      <AppText variant="bodySmall" weight="800" tone={scopeType === type ? 'inverse' : 'secondary'}>
                        {SCOPE_LABELS[type]}
                      </AppText>
                    </InteractivePressable>
                  ))}
                </View>
              </View>

              {scopeType === 'CATEGORY' && (
                <View style={styles.fieldGroup}>
                  <AppText variant="caption" tone="secondary" weight="700" style={styles.fieldLabel}>
                    Categoría
                  </AppText>
                  <InteractivePressable
                    onPress={() => setCategoryPickerVisible(true)}
                    haptic="light"
                    pressScale={1}
                    style={styles.categoryRow}
                    accessibilityRole="button"
                    accessibilityLabel={`Categoría: ${categoryId ? categories.find(c => c.id === categoryId)?.label ?? 'Seleccionar' : 'Seleccionar'}`}
                  >
                    <AppText variant="body" weight="500" tone={categoryId ? 'primary' : 'tertiary'} style={styles.categoryRowText}>
                      {categoryId ? categories.find(c => c.id === categoryId)?.label ?? 'Categoría' : 'Seleccionar categoría'}
                    </AppText>
                    <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
                  </InteractivePressable>
                  {categoriesLoading && (
                    <AppText variant="caption" tone="tertiary">Cargando categorías...</AppText>
                  )}
                </View>
              )}

              <View style={styles.fieldGroup}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.fieldLabel}>
                  Repetición
                </AppText>
                <View style={styles.segmentedControl}>
                  {(['ONE_OFF', 'RECURRING'] as FinanceSpendingLimitRecurrenceType[]).map((type) => (
                    <InteractivePressable
                      key={type}
                      onPress={() => setRecurrenceType(type)}
                      haptic="light"
                      pressScale={1}
                      style={[
                        styles.segmentButton,
                        recurrenceType === type && styles.segmentButtonSelected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: recurrenceType === type }}
                    >
                      <AppText variant="bodySmall" weight="800" tone={recurrenceType === type ? 'inverse' : 'secondary'}>
                        {RECURRENCE_LABELS[type]}
                      </AppText>
                    </InteractivePressable>
                  ))}
                </View>
              </View>

              {recurrenceType === 'ONE_OFF' && (
                <AppText variant="caption" tone="tertiary" style={styles.oneOffHint}>
                  Solo para este período
                </AppText>
              )}

              <View style={styles.fieldGroup}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.fieldLabel}>
                  Comienza
                </AppText>
                <InteractivePressable
                  onPress={() => {}}
                  haptic="light"
                  pressScale={1}
                  style={styles.periodRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Período de inicio: ${periodDisplay}`}
                >
                  <AppText variant="body" weight="500" tone="primary" style={styles.periodRowText}>
                    {periodDisplay}
                  </AppText>
                  <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
                </InteractivePressable>
                <AppInput
                  label={periodType === 'MONTHLY' ? 'Mes (AAAA-MM)' : 'Año (AAAA)'}
                  placeholder={periodType === 'MONTHLY' ? '2026-09' : '2026'}
                  value={period}
                  onChangeText={(v) => {
                    const cleaned = v.replace(/[^0-9-]/g, '');
                    setPeriod(cleaned);
                    setPeriodDisplay(formatPeriodHuman(periodType, cleaned));
                  }}
                  errorText={period && !/^(\d{4}-\d{2}|\d{4})$/.test(period) ? 'Formato inválido' : undefined}
                  keyboardType="numbers-and-punctuation"
                  maxLength={periodType === 'MONTHLY' ? 7 : 4}
                  autoFocus={false}
                  inputStyle={styles.periodInput}
                />
              </View>

              {isEdit && !isOneOff && recurrenceType === 'RECURRING' && (
                <View style={styles.fieldGroup}>
                  <AppText variant="caption" tone="secondary" weight="700" style={styles.fieldLabel}>
                    Alcance de la edición
                  </AppText>
                  <View style={styles.segmentedControl}>
                    {(['THIS_PERIOD', 'THIS_AND_FOLLOWING'] as const).map((type) => (
                      <InteractivePressable
                        key={type}
                        onPress={() => setEditScope(type)}
                        haptic="light"
                        pressScale={1}
                        style={[
                          styles.segmentButton,
                          editScope === type && styles.segmentButtonSelected,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: editScope === type }}
                      >
                        <AppText variant="caption" weight="800" tone={editScope === type ? 'inverse' : 'secondary'}>
                          {type === 'THIS_PERIOD' ? 'Solo este período' : 'Este y siguientes'}
                        </AppText>
                      </InteractivePressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <AppText variant="caption" tone="secondary" weight="700" style={styles.fieldLabel}>
                  Monto del límite
                </AppText>
                <AppInput
                  label="Monto"
                  placeholder="0"
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(v.replace(/[^0-9.,]/g, '').replace(',', '.'));
                    setAmountError(null);
                  }}
                  errorText={amountError ?? undefined}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  autoFocus={!amount}
                />
              </View>
            </AppCard>

            {error && (
              <AppText variant="caption" tone="danger" style={styles.errorText}>
                {error}
              </AppText>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.stickyFooter}>
        <View style={styles.buttonRow}>
          <AppButton
            title="Cancelar"
            variant="secondary"
            onPress={onRequestClose}
            disabled={submitting}
            style={styles.cancelButton}
          />
          <AppButton
            title={submitLabel}
            onPress={handleSubmit}
            disabled={submitting || !amount.trim() || (scopeType === 'CATEGORY' && !categoryId)}
            style={styles.createButton}
          >
            {submitting && <HomePlusIcon name="refresh" size={20} color={colors.text.inverse} />}
          </AppButton>
        </View>
      </View>

      {categoryPickerVisible && (
        <ActionSheet
          visible={true}
          title="Seleccionar categoría"
          onRequestClose={() => setCategoryPickerVisible(false)}
          size="content"
        >
          <View style={styles.categoryPickerContent}>
            {categoriesLoading ? (
              <AppText variant="caption" tone="tertiary" style={styles.categoryPickerLoading}>Cargando...</AppText>
            ) : categories.length === 0 ? (
              <AppText variant="caption" tone="danger" style={styles.categoryPickerLoading}>No hay categorías de gasto disponibles</AppText>
            ) : (
              <View style={styles.categoryPickerGrid}>
                {categories.map((cat) => (
                  <InteractivePressable
                    key={cat.id}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setCategoryPickerVisible(false);
                    }}
                    haptic="light"
                    pressScale={1}
                    style={[
                      styles.categoryPickerButton,
                      categoryId === cat.id && styles.categoryPickerButtonSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: categoryId === cat.id }}
                  >
                    <AppText variant="body" weight={categoryId === cat.id ? '800' : '400'} tone={categoryId === cat.id ? 'inverse' : 'primary'}>
                      {cat.label}
                    </AppText>
                  </InteractivePressable>
                ))}
              </View>
            )}
          </View>
        </ActionSheet>
      )}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  hint: {
    color: colors.text.tertiary,
  },
  formCard: {
    gap: spacing[4],
  },
  fieldGroup: {
    gap: spacing[2],
  },
  fieldLabel: {
    marginBottom: spacing[1],
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  segmentButtonSelected: {
    backgroundColor: colors.terracotta[600],
    borderColor: colors.terracotta[600],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[3],
  },
  categoryRowText: {
    flex: 1,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
  },
  periodRowText: {
    flex: 1,
  },
  periodInput: {
    marginTop: spacing[1],
  },
  oneOffHint: {
    marginTop: spacing[1],
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: colors.background.base,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
  },
  categoryPickerContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  categoryPickerLoading: {
    textAlign: 'center',
    paddingVertical: spacing[4],
  },
  categoryPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  categoryPickerButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '45%',
  },
  categoryPickerButtonSelected: {
    backgroundColor: colors.terracotta[600],
    borderColor: colors.terracotta[600],
  },
});