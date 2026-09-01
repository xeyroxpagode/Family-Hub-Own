import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  ActionSheet,
  FormActionRow,
  InteractivePressable,
} from '../ui';
import { colors, motion, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
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

  return (
    <ActionSheet
      visible={visible}
      title="Pozo sugerido por categoria"
      subtitle={`Configura que categorias sugieran ${pool.name}`}
      onRequestClose={onRequestClose}
    >
      <View style={styles.content}>
        <AppCard variant="quiet" padding="default" style={styles.infoCard}>
          <View style={styles.infoRow}>
            <HomePlusIcon name="information-circle-outline" size={18} color={colors.info.text} />
            <AppText variant="caption" tone="secondary">
              Cuando se crea un gasto nuevo con la categoria elegida, se preseleccionara este pozo.
              El usuario puede cambiarlo o elegir Sin pozo.
            </AppText>
          </View>
        </AppCard>

        <View style={styles.fieldGroup}>
          <FormActionRow
            label="Categoria"
            value={currentCategory?.label ?? 'Elegir categoria'}
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
          <View style={styles.categoryPicker} accessibilityLabel="Categorias de gasto">
            <InteractivePressable
              onPress={() => handleCategorySelect(null)}
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
              <AppText variant="bodySmall" weight="800">Sin categoria</AppText>
            </InteractivePressable>
            {categories.map((category) => {
              const selected = category.id === selectedCategoryId;
              return (
                <InteractivePressable
                  key={category.id}
                  onPress={() => handleCategorySelect(category.id)}
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

        {selectedCategoryId && (
          <View style={styles.currentState}>
            <AppText variant="caption" tone="secondary" weight="700">Estado actual</AppText>
            <View style={styles.currentStateCard}>
              {hasDefault ? (
                <View style={styles.currentStateRow}>
                  <View style={styles.currentStateInfo}>
                    <AppText variant="bodySmall" weight="700">
                      Sugerencia activa: {currentDefault?.poolName ?? 'Desconocido'}
                    </AppText>
                    <AppText variant="caption" tone="tertiary">
                      {isCurrentPool ? 'Este pozo' : 'Otro pozo'}
                    </AppText>
                  </View>
                  {!isCurrentPool && (
                    <AppButton
                      variant="secondary"
                      title={isCurrentPool ? 'Ya configurado' : 'Usar este pozo'}
                      onPress={handleSetDefault}
                      disabled={saving || isCurrentPool}
                      style={styles.actionButton}
                    />
                  )}
                  {isCurrentPool && (
                    <AppButton
                      variant="ghost"
                      title="Quitar sugerencia"
                      onPress={handleClearDefault}
                      disabled={saving}
                      style={styles.actionButton}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.currentStateRow}>
                  <View style={styles.currentStateInfo}>
                    <AppText variant="bodySmall" weight="700" tone="tertiary">Sin sugerencia configurada</AppText>
                  </View>
                  <AppButton
                    title="Sugerir este pozo"
                    onPress={handleSetDefault}
                    disabled={saving}
                    style={styles.actionButton}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <HomePlusIcon name="alert-circle-outline" size={18} color={colors.danger.strong} />
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
          </View>
        )}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  infoCard: {
    backgroundColor: colors.info.soft,
    borderColor: colors.info.text,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-start',
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
    maxHeight: 300,
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
  currentState: {
    gap: spacing[2],
  },
  currentStateCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing[3],
  },
  currentStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  currentStateInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing[0],
  },
  actionButton: {
    minWidth: 120,
  },
  errorBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.danger.soft,
    padding: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
});
