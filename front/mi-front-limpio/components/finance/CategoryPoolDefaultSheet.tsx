/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppText,
  ActionSheet,
} from '../ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  listFinanceExpenseCategories,
  type FinanceCategoryDto,
} from '../../services/finance/financeMovements';
import {
  getCategoryPoolDefaultClient,
  upsertCategoryPoolDefaultClient,
  clearCategoryPoolDefaultClient,
  type FinancePoolDto,
} from '../../services/finance/financePools';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  FinanceDetailSection,
  FinanceErrorState,
  FinanceGroupedSurface,
  FinanceListRow,
  FinanceSelectionRow,
  FinanceSemanticSurface,
  FINANCE_SHEET_SIZE_POLICY,
  financeSpacing,
} from './ui';

type CategoryPoolDefaultSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  pool: FinancePoolDto | null;
  pools: FinancePoolDto[];
  onRequestClose: () => void;
  onSuccess: () => void;
};

export function CategoryPoolDefaultSheet({
  visible,
  accessToken,
  contextType,
  contextLabel,
  currency,
  pool,
  pools,
  onRequestClose,
  onSuccess,
}: CategoryPoolDefaultSheetProps) {
  const { colors } = useAppTheme();
  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [currentDefault, setCurrentDefault] = useState<{ categoryId: string; poolId: string | null; poolName: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'category' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedCategoryId(null);
    setCurrentDefault(null);
    setError(null);
    setActivePicker(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || !accessToken) return;

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
        setCategoriesError('No pudimos cargar las categorias.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, visible]);

  useEffect(() => {
    if (!visible || !accessToken || !selectedCategoryId) {
      setCurrentDefault(null);
      return;
    }

    let cancelled = false;
    getCategoryPoolDefaultClient({
      accessToken,
      contextType,
      categoryId: selectedCategoryId,
      currency,
      contextScope: `finance-category-pool-default:${contextType}:${selectedCategoryId}:${currency}`,
    })
      .then((next) => {
        if (cancelled) return;
        setCurrentDefault({
          categoryId: next.categoryId,
          poolId: next.poolId,
          poolName: next.poolName,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentDefault({
          categoryId: selectedCategoryId,
          poolId: null,
          poolName: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, currency, selectedCategoryId, visible]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setActivePicker(null);
  };

  const handleSetDefault = async () => {
    if (!selectedCategoryId || !accessToken || !pool || saving) return;

    setSaving(true);
    setError(null);

    try {
      await upsertCategoryPoolDefaultClient({
        accessToken,
        contextType,
        categoryId: selectedCategoryId,
        currency,
        poolId: pool.id,
        personId: contextType === 'personal' ? pool.ownerPersonId : null,
        householdId: contextType === 'household' ? pool.householdId : null,
        contextScope: `finance-category-pool-default-upsert:${contextType}:${selectedCategoryId}:${currency}`,
      });
      onSuccess();
      setCurrentDefault({ categoryId: selectedCategoryId, poolId: pool.id, poolName: pool.name });
    } catch (err: any) {
      setError(err?.message ?? 'No pudimos guardar la sugerencia.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearDefault = async () => {
    if (!selectedCategoryId || !accessToken || saving) return;

    setSaving(true);
    setError(null);

    try {
      await clearCategoryPoolDefaultClient({
        accessToken,
        contextType,
        categoryId: selectedCategoryId,
        currency,
        personId: contextType === 'personal' ? pool?.ownerPersonId ?? null : null,
        householdId: contextType === 'household' ? pool?.householdId ?? null : null,
        contextScope: `finance-category-pool-default-clear:${contextType}:${selectedCategoryId}:${currency}`,
      });
      onSuccess();
      setCurrentDefault({ categoryId: selectedCategoryId, poolId: null, poolName: null });
    } catch (err: any) {
      setError(err?.message ?? 'No pudimos limpiar la sugerencia.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !pool) return null;

  const currentCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const hasDefault = currentDefault?.poolId !== null;
  const currentPoolId = currentDefault?.poolId;
  const isCurrentPool = currentPoolId === pool.id;

  const renderRadioIcon = (selected: boolean) => (
    <HomePlusIcon
      name={selected ? 'radio-button-on' : 'radio-button-off'}
      size={20}
      color={selected ? colors.terracotta[700] : colors.text.tertiary}
    />
  );

  return (
    <ActionSheet
      visible={visible}
      title="Pozo sugerido por categoria"
      subtitle={`Configura que categorias sugieran ${pool.name}`}
      onRequestClose={onRequestClose}
      size={FINANCE_SHEET_SIZE_POLICY.MEDIUM_FORM}
    >
      <View style={{ gap: financeSpacing.formFieldGap, paddingBottom: financeSpacing.contentActionGap }}>
        <FinanceSemanticSurface tone="info">
          <View style={{ flexDirection: 'row', gap: financeSpacing.titleContentGap, alignItems: 'flex-start' }}>
            <HomePlusIcon name="information-circle-outline" size={18} color={colors.info.text} />
            <AppText variant="caption" tone="secondary" style={{ flex: 1, minWidth: 0 }}>
              Cuando se crea un gasto nuevo con la categoria elegida, se preseleccionara este pozo.
              El usuario puede cambiarlo o elegir Sin pozo.
            </AppText>
          </View>
        </FinanceSemanticSurface>

        <View style={{ gap: financeSpacing.contentActionGap }}>
          <FinanceSelectionRow
            label="Categoría"
            value={currentCategory?.label}
            placeholder="Elegir categoria"
            onPress={() => setActivePicker((current) => current === 'category' ? null : 'category')}
            disabled={categoriesLoading || saving}
            accessibilityLabel="Elegir categoria para configurar sugerencia"
          />
          {categoriesError ? (
            <AppText variant="caption" tone="warning">{categoriesError}</AppText>
          ) : categoriesLoading ? (
            <AppText variant="caption" tone="tertiary">Cargando categorias</AppText>
          ) : null}
        </View>

        {activePicker === 'category' && (
          <FinanceGroupedSurface>
            <FinanceListRow
              title="Sin categoría"
              icon={renderRadioIcon(selectedCategoryId === null)}
              onPress={() => handleCategorySelect(null)}
              disabled={saving}
              accessibilityLabel="Sin categoría"
            />
            {categories.map((category, index) => {
              const selected = category.id === selectedCategoryId;
              const isLast = index === categories.length - 1;
              return (
                <FinanceListRow
                  key={category.id}
                  title={category.label}
                  titleNumberOfLines={2}
                  icon={renderRadioIcon(selected)}
                  onPress={() => handleCategorySelect(category.id)}
                  disabled={saving}
                  divider={!isLast}
                  accessibilityLabel={category.label}
                />
              );
            })}
          </FinanceGroupedSurface>
        )}

        {selectedCategoryId && (
          <FinanceDetailSection title="Estado actual">
            <FinanceGroupedSurface>
              {hasDefault ? (
                <FinanceListRow
                  title={`Sugerencia activa: ${currentDefault?.poolName ?? 'Desconocido'}`}
                  titleNumberOfLines={2}
                  subtitle={isCurrentPool ? 'Este pozo' : 'Otro pozo'}
                  divider={false}
                />
              ) : (
                <FinanceListRow
                  title="Sin sugerencia configurada"
                  divider={false}
                />
              )}
            </FinanceGroupedSurface>
            {!hasDefault && (
              <AppButton
                title="Sugerir este pozo"
                onPress={handleSetDefault}
                disabled={saving}
              />
            )}
            {hasDefault && !isCurrentPool && (
              <AppButton
                title="Usar este pozo"
                variant="secondary"
                onPress={handleSetDefault}
                disabled={saving}
              />
            )}
            {hasDefault && isCurrentPool && (
              <AppButton
                title="Quitar sugerencia"
                variant="ghost"
                onPress={handleClearDefault}
                disabled={saving}
              />
            )}
          </FinanceDetailSection>
        )}

        {error && (
          <FinanceErrorState level="form" message={error} />
        )}
      </View>
    </ActionSheet>
  );
}
