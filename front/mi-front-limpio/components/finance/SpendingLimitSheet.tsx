/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { generateMutationId } from '../../services/api';
import type { FinanceContextType } from '../../services/finance/financeContext';
import { hashIdempotencyRequestV2 } from '../../services/finance/idempotency';
import {
  createFinanceSpendingLimit,
  editFinanceSpendingLimit,
  type CreateFinanceSpendingLimitInput,
  type EditFinanceSpendingLimitInput,
  type FinanceSpendingLimitPeriodType,
  type FinanceSpendingLimitRecurrenceType,
  type FinanceSpendingLimitScopeType,
} from '../../services/finance/financeSpendingLimits';
import {
  parseMoneyInputText,
  type MoneyInputCurrencyCode,
  type MoneyInputParseResult,
} from '../../services/finance/moneyInputValue';
import { ActionSheet, AppButton, AppText, InteractivePressable, SegmentedControl } from '../ui';
import {
  FinanceFormFooter,
  FinancePeriodNavigator,
  FinanceSelectionRow,
  FINANCE_SHEET_SIZE_POLICY,
} from './ui';
import { CreateFinanceCategorySheet } from './CreateFinanceCategorySheet';
import {
  getFinanceCategoryPresentation,
  listFinanceCategories,
  type FinanceCategoryDto,
} from '../../services/finance/financeCategories';
import { MoneyInput } from './MoneyInput';

type SpendingLimitSheetMode = 'create' | 'edit';
type SheetView = 'form' | 'period' | 'recurrence' | 'editScope';

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
    categoryLabelSnapshot: string | null;
    periodType: FinanceSpendingLimitPeriodType;
    period: string;
    recurrenceType: FinanceSpendingLimitRecurrenceType;
    amount: string;
  } | null;
  onRequestClose: () => void;
  onSuccess: () => void;
};

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function derivePeriod(basePeriod: string, periodType: FinanceSpendingLimitPeriodType) {
  if (periodType === 'YEARLY') return basePeriod.slice(0, 4);
  return /^\d{4}-\d{2}$/.test(basePeriod) ? basePeriod : `${basePeriod.slice(0, 4)}-01`;
}

function formatPeriod(periodType: FinanceSpendingLimitPeriodType, period: string) {
  if (periodType === 'YEARLY') return period.slice(0, 4);
  const [year, month] = period.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return 'Elegir mes';
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function formatPeriodRow(periodType: FinanceSpendingLimitPeriodType, period: string) {
  return `${periodType === 'MONTHLY' ? 'Mensual' : 'Anual'} · ${formatPeriod(periodType, period)}`;
}

function shiftPeriod(periodType: FinanceSpendingLimitPeriodType, period: string, direction: 'previous' | 'next') {
  const delta = direction === 'next' ? 1 : -1;
  if (periodType === 'YEARLY') {
    const year = Number(period.slice(0, 4));
    return String((Number.isFinite(year) ? year : new Date().getFullYear()) + delta);
  }
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function humanMutationError(error: any, scopeType: FinanceSpendingLimitScopeType, categoryLabel: string | null, periodType: FinanceSpendingLimitPeriodType, period: string, mode: SpendingLimitSheetMode) {
  const periodLabel = formatPeriod(periodType, period).toLocaleLowerCase('es-AR');
  if (error?.code === 'finance_spending_limit_slot_exists') {
    if (scopeType === 'OVERALL') return `Ya existe un límite general para ${periodLabel}.`;
    return `Ya existe un límite de ${categoryLabel ?? 'esa categoría'} para ${periodLabel}.`;
  }
  if (error?.code === 'finance_spending_limit_past_period_forbidden') return 'No se pueden modificar períodos completados.';
  if (error?.code === 'finance_spending_limit_category_deleted') return 'La categoría ya no está disponible para nuevos límites.';
  if (error?.code === 'invalid_finance_spending_limit_amount') return 'El monto del límite debe ser mayor que cero.';
  return `No pudimos ${mode === 'create' ? 'crear' : 'guardar'} el límite. Intentá de nuevo.`;
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
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  const [view, setView] = useState<SheetView>('form');
  const [scopeType, setScopeType] = useState<FinanceSpendingLimitScopeType>('OVERALL');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<FinanceSpendingLimitPeriodType>('MONTHLY');
  const [period, setPeriod] = useState(basePeriod);
  const [recurrenceType, setRecurrenceType] = useState<FinanceSpendingLimitRecurrenceType>('RECURRING');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<MoneyInputParseResult>(() => parseMoneyInputText('', currency as MoneyInputCurrencyCode));
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editScope, setEditScope] = useState<'ONE_OFF' | 'THIS_PERIOD' | 'THIS_AND_FOLLOWING'>('THIS_AND_FOLLOWING');
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [createCategoryVisible, setCreateCategoryVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const nextPeriodType = initialData?.periodType ?? initialPeriodType ?? 'MONTHLY';
    const nextPeriod = initialData?.period ?? derivePeriod(basePeriod, nextPeriodType);
    const nextAmount = initialData?.amount ?? '';
    setView('form');
    setScopeType(initialData?.scopeType ?? initialScopeType ?? 'OVERALL');
    setCategoryId(initialData?.categoryId ?? null);
    setCategoryLabel(initialData?.categoryLabelSnapshot ?? null);
    setPeriodType(nextPeriodType);
    setPeriod(nextPeriod);
    setRecurrenceType(initialData?.recurrenceType ?? 'RECURRING');
    setAmountText(nextAmount);
    setAmount(parseMoneyInputText(nextAmount, currency as MoneyInputCurrencyCode));
    setSubmitAttempted(false);
    setError(null);
    setSubmitting(false);
    setEditScope('THIS_AND_FOLLOWING');
    setCreateCategoryVisible(false);
  }, [basePeriod, currency, initialData, initialPeriodType, initialScopeType, visible]);

  useEffect(() => {
    if (!visible || !accessToken) return;
    let cancelled = false;
    setCategoriesLoading(true);
    listFinanceCategories(accessToken, contextType, 'expense')
      .then((payload) => { if (!cancelled) setCategories(payload.categories); })
      .catch(() => { if (!cancelled) setCategories([]); })
      .finally(() => { if (!cancelled) setCategoriesLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, contextType, visible]);

  const categoryColumns = useMemo(() => {
    const ordered = [
      ...categories.filter((category) => category.kind === 'custom' && category.selectable),
      ...categories.filter((category) => category.kind === 'native' && category.selectable),
    ];
    const items: (FinanceCategoryDto | 'create')[] = [...ordered, 'create'];
    return Array.from({ length: Math.ceil(items.length / 2) }, (_, index) => items.slice(index * 2, index * 2 + 2));
  }, [categories]);

  const title = view === 'period'
    ? 'Período'
    : view === 'recurrence'
      ? 'Se repite'
      : view === 'editScope'
        ? 'Aplicar cambio'
        : mode === 'edit'
          ? 'Editar límite'
          : 'Nuevo límite';

  const subtitle = view === 'form' ? `Finanzas de ${contextLabel}` : undefined;
  const isEdit = mode === 'edit';
  const isOneOff = initialData?.recurrenceType === 'ONE_OFF' || recurrenceType === 'ONE_OFF';
  const periodText = formatPeriod(periodType, period);
  const formComplete = amount.isValid && amount.canonicalAmount !== '0' && (scopeType === 'OVERALL' || Boolean(categoryId));

  const setScope = (next: FinanceSpendingLimitScopeType) => {
    setScopeType(next);
    setError(null);
    if (next === 'OVERALL') {
      setCategoryId(null);
      setCategoryLabel(null);
      return;
    }
  };

  const changePeriodType = (nextType: FinanceSpendingLimitPeriodType) => {
    setPeriodType(nextType);
    setPeriod((current) => derivePeriod(current, nextType));
  };

  const handleAmountChange = (next: MoneyInputParseResult) => {
    setAmount(next);
    setAmountText(next.inputText);
    setError(null);
  };

  const submit = async () => {
    setSubmitAttempted(true);
    if (!accessToken || submitting || !formComplete) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setError(null);

    try {
      const mutationId = generateMutationId();
      const idempotencyKey = `spending-limit-${mode}-${mutationId}`;
      const amountValue = amount.canonicalAmount ?? '';

      if (mode === 'create') {
        const payload: CreateFinanceSpendingLimitInput = {
          scopeType,
          categoryId: scopeType === 'CATEGORY' ? categoryId : null,
          periodType,
          period,
          recurrenceType,
          amount: amountValue,
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
          contextScope: `spending-limit-create-${mutationId}`,
        });
      } else if (initialData) {
        const payload: EditFinanceSpendingLimitInput = {
          id: initialData.id,
          period,
          editScope: initialData.recurrenceType === 'ONE_OFF' ? 'ONE_OFF' : editScope,
          amount: amountValue,
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
          contextScope: `spending-limit-edit-${mutationId}`,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(humanMutationError(err, scopeType, categoryLabel, periodType, period, mode));
    } finally {
      setSubmitting(false);
    }
  };

  const requestClose = () => {
    if (view !== 'form') {
      setView('form');
      return;
    }
    onRequestClose();
  };

  if (!visible) return null;

  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={requestClose}
      closeDisabled={submitting}
      size={FINANCE_SHEET_SIZE_POLICY.SHORT_FORM}
      footer={view === 'form' ? (
        <FinanceFormFooter
          primaryTitle={isEdit ? 'Guardar cambios' : 'Crear límite'}
          onPrimary={submit}
          primaryDisabled={!formComplete || submitting}
          loading={submitting}
          divided={false}
        />
      ) : null}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoiding}>
        {view !== 'form' ? (
          <InteractivePressable
            onPress={() => setView('form')}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.backRow}
            accessibilityRole="button"
            accessibilityLabel="Volver al límite"
          >
            <HomePlusIcon name="chevron-back-outline" size={18} color={colors.text.tertiary} />
            <AppText variant="bodySmall" weight="800" tone="secondary">Volver</AppText>
          </InteractivePressable>
        ) : null}

        {view === 'form' ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SegmentedControl
              size="compact"
              fullWidth
              value={scopeType}
              options={[
                { value: 'OVERALL', label: 'General', accessibilityLabel: 'General' },
                { value: 'CATEGORY', label: 'Categoría', accessibilityLabel: 'Categoría' },
              ]}
              onChange={setScope}
            />

            {scopeType === 'CATEGORY' ? <InlineCategoryGallery columns={categoryColumns} loading={categoriesLoading} selectedCategoryId={categoryId} onSelect={(category) => { setCategoryId(category.id); setCategoryLabel(category.label); setError(null); }} onCreate={() => setCreateCategoryVisible(true)} /> : null}

            <MoneyInput
              label="Monto"
              value={amountText}
              currency={currency as MoneyInputCurrencyCode}
              onValueChange={handleAmountChange}
              onCurrencyChange={() => {}}
              availableCurrencies={[currency as MoneyInputCurrencyCode]}
              forceValidation={submitAttempted}
            />

            <FinanceSelectionRow
              label="Período"
              value={formatPeriodRow(periodType, period)}
              onPress={() => setView('period')}
            />
            <FinanceSelectionRow
              label="Se repite"
              value={recurrenceType === 'RECURRING' ? 'Sí' : 'No'}
              onPress={() => setView('recurrence')}
            />
            {isEdit && !isOneOff ? (
              <FinanceSelectionRow
                label="Aplicar a"
                value={editScope === 'THIS_PERIOD' ? `Solo ${periodText.toLocaleLowerCase('es-AR')}` : `${periodText} y los próximos`}
                onPress={() => setView('editScope')}
              />
            ) : null}
            {error ? <AppText variant="bodySmall" tone="danger" align="center">{error}</AppText> : null}
          </ScrollView>
        ) : null}

        {view === 'period' ? (
          <View style={styles.content}>
            <SegmentedControl
              size="compact"
              fullWidth
              value={periodType}
              options={[
                { value: 'MONTHLY', label: 'Mensual', accessibilityLabel: 'Mensual' },
                { value: 'YEARLY', label: 'Anual', accessibilityLabel: 'Anual' },
              ]}
              onChange={changePeriodType}
            />
            <FinancePeriodNavigator
              label={formatPeriod(periodType, period)}
              onPrevious={() => setPeriod((current) => shiftPeriod(periodType, current, 'previous'))}
              onNext={() => setPeriod((current) => shiftPeriod(periodType, current, 'next'))}
              previousAccessibilityLabel={periodType === 'MONTHLY' ? 'Mes anterior' : 'Año anterior'}
              nextAccessibilityLabel={periodType === 'MONTHLY' ? 'Mes siguiente' : 'Año siguiente'}
            />
            <AppButton title="Usar este período" onPress={() => setView('form')} />
          </View>
        ) : null}

        {view === 'recurrence' ? (
          <ChoiceList
            choices={[
              { label: 'No', selected: recurrenceType === 'ONE_OFF', onPress: () => { setRecurrenceType('ONE_OFF'); setView('form'); } },
              { label: 'Sí', selected: recurrenceType === 'RECURRING', onPress: () => { setRecurrenceType('RECURRING'); setView('form'); } },
            ]}
          />
        ) : null}

        {view === 'editScope' ? (
          <ChoiceList
            choices={[
              { label: `Solo ${periodText.toLocaleLowerCase('es-AR')}`, selected: editScope === 'THIS_PERIOD', onPress: () => { setEditScope('THIS_PERIOD'); setView('form'); } },
              { label: `${periodText} y los próximos`, selected: editScope === 'THIS_AND_FOLLOWING', onPress: () => { setEditScope('THIS_AND_FOLLOWING'); setView('form'); } },
            ]}
          />
        ) : null}
      </KeyboardAvoidingView>

      <CreateFinanceCategorySheet
        visible={createCategoryVisible}
        accessToken={accessToken}
        contextType={contextType}
        mode="expense"
        onCreated={(category) => {
          setCategories((current) => [...current.filter((item) => item.id !== category.id), category]);
          setCategoryId(category.id);
          setCategoryLabel(category.label);
          setScopeType('CATEGORY');
          setCreateCategoryVisible(false);
        }}
        onRequestClose={() => setCreateCategoryVisible(false)}
      />
    </ActionSheet>
  );
}

function InlineCategoryGallery({ columns, loading, selectedCategoryId, onSelect, onCreate }: { columns: (FinanceCategoryDto | 'create')[][]; loading: boolean; selectedCategoryId: string | null; onSelect: (category: FinanceCategoryDto) => void; onCreate: () => void }) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  return <View style={styles.gallerySection}><AppText variant="bodySmall" weight="700">Categoría</AppText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery} directionalLockEnabled keyboardShouldPersistTaps="handled">{loading ? <AppText variant="caption" tone="secondary">Cargando categorías…</AppText> : columns.map((column, index) => <View key={`column-${index}`} style={styles.galleryColumn}>{column.map((item) => item === 'create' ? <InteractivePressable key="create" onPress={onCreate} haptic="light" pressScale={motion.scale.card} style={styles.categoryTile} accessibilityRole="button" accessibilityLabel="Nueva categoría"><HomePlusIcon name="add" size={22} color={colors.terracotta[700]} /><AppText variant="caption" weight="800" tone="brand" align="center" numberOfLines={2}>Nueva categoría</AppText></InteractivePressable> : <CategoryGalleryTile key={item.id} category={item} selected={item.id === selectedCategoryId} onPress={() => onSelect(item)} />)}</View>)}</ScrollView></View>;
}

function CategoryGalleryTile({ category, selected, onPress }: { category: FinanceCategoryDto; selected: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const presentation = getFinanceCategoryPresentation(category);
  return <InteractivePressable onPress={onPress} haptic="light" pressScale={motion.scale.card} style={[styles.categoryTile, selected && styles.categoryTileSelected]} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={category.label}><HomePlusIcon name={presentation.iconKey} size={22} color={selected ? colors.text.inverse : colors.terracotta[700]} /><AppText variant="caption" weight="800" tone={selected ? 'inverse' : 'primary'} align="center" numberOfLines={2}>{category.label}</AppText></InteractivePressable>;
}

function ChoiceList({ choices }: { choices: { label: string; selected: boolean; onPress: () => void }[] }) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  return (
    <View style={styles.content}>
      {choices.map((choice) => (
        <InteractivePressable key={choice.label} onPress={choice.onPress} haptic="light" pressScale={motion.scale.card} style={styles.choiceRow} accessibilityRole="radio" accessibilityState={{ selected: choice.selected }} accessibilityLabel={choice.label}>
          <HomePlusIcon name={choice.selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={choice.selected ? colors.terracotta[700] : colors.text.tertiary} />
          <AppText variant="body" weight={choice.selected ? '800' : '500'}>{choice.label}</AppText>
        </InteractivePressable>
      ))}
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;
  return StyleSheet.create({
    keyboardAvoiding: {
      flexGrow: 0,
      flexShrink: 1,
    },
    content: {
      gap: spacing[4],
      paddingBottom: spacing[6],
    },
    gallerySection: { gap: spacing[2] },
    gallery: { gap: spacing[2], paddingRight: spacing[5] },
    galleryColumn: { width: 88, gap: spacing[2] },
    categoryTile: { height: 78, borderRadius: radius.lg, backgroundColor: colors.surface.soft, alignItems: 'center', justifyContent: 'center', gap: spacing[1], paddingHorizontal: spacing[2] },
    categoryTileSelected: { backgroundColor: colors.terracotta[600] },
    backRow: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing[1],
      marginBottom: spacing[3],
    },
    choiceRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
  });
}
