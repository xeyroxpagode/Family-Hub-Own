/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  createFinanceCategory,
  getFinanceCategoryPresentation,
  getQuickFinanceCategories,
  listFinanceCategories,
  FINANCE_CATEGORY_ICON_OPTIONS,
  type FinanceCategoryDto,
  type FinanceCategoryIconKey,
  type FinanceCategoryPresentation,
} from '../../services/finance/financeCategories';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  ActionSheet,
  AppButton,
  AppInput,
  AppText,
  InteractivePressable,
  Skeleton,
} from '../ui';
import { FinanceFormFooter, FINANCE_SHEET_SIZE_POLICY } from './ui';

type CategorySelectorMode = 'expense' | 'income';
type SelectorView = 'quick' | 'all' | 'create' | 'icon';

type CategorySelectorSheetProps = {
  visible: boolean;
  accessToken: string | null;
  contextType: FinanceContextType;
  mode: CategorySelectorMode;
  selectedCategoryId: string | null;
  onSelect: (category: FinanceCategoryDto | null) => void;
  onRequestClose: () => void;
  allowNone?: boolean;
  initialView?: Extract<SelectorView, 'quick' | 'all' | 'create'>;
};

const MAX_QUICK_CATEGORIES = 6;
const DEFAULT_ICON_KEY: FinanceCategoryIconKey = 'pricetag-outline';

function titleForView(view: SelectorView, mode: CategorySelectorMode) {
  if (view === 'all') return 'Todas las categorías';
  if (view === 'create') return `Nueva categoría de ${mode === 'expense' ? 'gasto' : 'ingreso'}`;
  if (view === 'icon') return 'Elegir icono';
  return 'Elegir categoría';
}

function contextLabel(contextType: FinanceContextType) {
  return contextType === 'personal' ? 'Personal' : 'Hogar';
}

function humanCreateError(error: any) {
  if (error?.code === 'invalid_finance_category_icon_key') return 'Elegí un icono válido.';
  if (error?.code === 'invalid_finance_category_label') return 'Escribí un nombre para la categoría.';
  if (error?.message?.toLowerCase?.().includes('duplicate') || error?.code === '23505') {
    return 'Ya existe una categoría con ese nombre.';
  }
  return 'No pudimos crear la categoría. Intentá de nuevo.';
}

export function CategorySelectorSheet({
  visible,
  accessToken,
  contextType,
  mode,
  selectedCategoryId,
  onSelect,
  onRequestClose,
  allowNone = true,
  initialView = 'quick',
}: CategorySelectorSheetProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  const [categories, setCategories] = useState<FinanceCategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<SelectorView>('quick');
  const [previousView, setPreviousView] = useState<SelectorView>('quick');
  const [searchQuery, setSearchQuery] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftIconKey, setDraftIconKey] = useState<FinanceCategoryIconKey>(DEFAULT_ICON_KEY);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !accessToken) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    listFinanceCategories(accessToken, contextType, mode)
      .then((payload) => {
        if (cancelled) return;
        setCategories(payload.categories);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setError('No pudimos cargar las categorías. Intentá de nuevo.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, contextType, mode, visible]);

  useEffect(() => {
    if (!visible) return;
    setView(initialView);
    setPreviousView(initialView === 'create' ? 'quick' : initialView);
    setSearchQuery('');
    setDraftLabel('');
    setDraftIconKey(DEFAULT_ICON_KEY);
    setCreateError(null);
    setSubmitting(false);
  }, [contextType, initialView, mode, visible]);

  const quickCategories = useMemo(
    () => getQuickFinanceCategories(categories, MAX_QUICK_CATEGORIES),
    [categories],
  );

  const visibleCategories = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('es-AR');
    const source = query
      ? categories.filter((category) => category.label.toLocaleLowerCase('es-AR').includes(query))
      : categories;
    return {
      custom: source.filter((category) => category.kind === 'custom'),
      native: source.filter((category) => category.kind === 'native'),
    };
  }, [categories, searchQuery]);

  const close = () => {
    setSubmitting(false);
    onRequestClose();
  };

  const selectCategory = (category: FinanceCategoryDto | null) => {
    onSelect(category);
    close();
  };

  const openCreate = (from: SelectorView) => {
    setPreviousView(from);
    setView('create');
    setDraftLabel('');
    setDraftIconKey(DEFAULT_ICON_KEY);
    setCreateError(null);
  };

  const goBack = () => {
    if (view === 'icon') {
      setView('create');
      return;
    }
    if (view === 'create') {
      setView(previousView);
      return;
    }
    if (view === 'all') {
      setView('quick');
      return;
    }
    close();
  };

  const createCategory = async () => {
    const label = draftLabel.trim();
    if (!accessToken || !label || submitting) return;

    setSubmitting(true);
    setCreateError(null);
    try {
      const response = await createFinanceCategory(accessToken, {
        contextType,
        type: mode,
        label,
        iconKey: draftIconKey,
      });
      setCategories((current) => [...current, response.category]);
      onSelect(response.category);
      close();
    } catch (err: any) {
      setCreateError(humanCreateError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  const selectedIcon = FINANCE_CATEGORY_ICON_OPTIONS.find((option) => option.key === draftIconKey);

  return (
    <ActionSheet
      visible={visible}
      title={titleForView(view, mode)}
      subtitle={contextLabel(contextType)}
      onRequestClose={goBack}
      closeDisabled={submitting}
      size={view === 'all' ? FINANCE_SHEET_SIZE_POLICY.PICKER_CATALOG : view === 'icon' ? 'scrollable-content' : FINANCE_SHEET_SIZE_POLICY.SHORT_FORM}
      footer={
        view === 'create' ? (
          <FinanceFormFooter
            primaryTitle="Crear categoría"
            onPrimary={createCategory}
            primaryDisabled={!draftLabel.trim() || submitting}
            loading={submitting}
            divided={false}
          />
        ) : null
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoiding}
      >
        {view !== 'quick' ? (
          <InteractivePressable
            onPress={goBack}
            haptic="light"
            pressScale={motion.scale.card}
            style={styles.backRow}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back-outline" size={18} color={colors.text.tertiary} />
            <AppText variant="bodySmall" weight="800" tone="secondary">
              Volver
            </AppText>
          </InteractivePressable>
        ) : null}

        {view === 'quick' ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {loading ? (
              <View style={styles.quickGrid}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} width="31%" height={96} />
                ))}
              </View>
            ) : error ? (
              <View style={styles.compactState}>
                <AppText variant="bodySmall" tone="warning" align="center">
                  {error}
                </AppText>
                <AppButton title="Reintentar" variant="secondary" size="sm" onPress={() => {
                  setError(null);
                  setLoading(true);
                  if (!accessToken) return;
                  listFinanceCategories(accessToken, contextType, mode)
                    .then((payload) => {
                      setCategories(payload.categories);
                      setLoading(false);
                    })
                    .catch(() => {
                      setError('No pudimos cargar las categorías. Intentá de nuevo.');
                      setLoading(false);
                    });
                }} />
              </View>
            ) : (
              <View style={styles.quickGrid}>
                {quickCategories.map((category) => (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    selected={category.id === selectedCategoryId}
                    onPress={() => selectCategory(category)}
                  />
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <SelectorAction
                icon="list-outline"
                label="Ver todas las categorías"
                onPress={() => setView('all')}
              />
              <SelectorAction
                icon="add-circle-outline"
                label="Nueva categoría"
                onPress={() => openCreate('quick')}
              />
              {allowNone ? (
                <SelectorAction
                  icon="remove-circle-outline"
                  label="Sin categoría"
                  onPress={() => selectCategory(null)}
                />
              ) : null}
            </View>
          </ScrollView>
        ) : null}

        {view === 'all' ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppInput
              label="Buscar"
              placeholder="Buscar categoría"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {allowNone ? (
              <CategoryRow
                iconKey="remove-circle-outline"
                label="Sin categoría"
                selected={selectedCategoryId === null}
                onPress={() => selectCategory(null)}
              />
            ) : null}
            <CategoryGroup
              title="Tus categorías"
              categories={visibleCategories.custom}
              selectedCategoryId={selectedCategoryId}
              emptyText="Todavía no creaste categorías propias."
              onSelect={selectCategory}
            />
            <CategoryGroup
              title="Del sistema"
              categories={visibleCategories.native}
              selectedCategoryId={selectedCategoryId}
              emptyText="No hay categorías del sistema para mostrar."
              onSelect={selectCategory}
            />
            <SelectorAction
              icon="add-circle-outline"
              label="Nueva categoría"
              onPress={() => openCreate('all')}
            />
          </ScrollView>
        ) : null}

        {view === 'create' ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppInput
              label="Nombre"
              placeholder={mode === 'expense' ? 'Mascotas' : 'Freelance'}
              value={draftLabel}
              onChangeText={(value) => {
                setDraftLabel(value);
                setCreateError(null);
              }}
              errorText={createError ?? undefined}
              autoFocus
              maxLength={42}
              returnKeyType="done"
              onSubmitEditing={createCategory}
            />
            <InteractivePressable
              onPress={() => setView('icon')}
              haptic="light"
              pressScale={motion.scale.card}
              style={styles.formRow}
              accessibilityRole="button"
              accessibilityLabel={`Icono ${selectedIcon?.label ?? 'categoría'}`}
            >
              <AppText variant="bodySmall" weight="700" style={styles.formRowLabel}>
                Icono
              </AppText>
              <HomePlusIcon name={draftIconKey} size={22} color={colors.terracotta[700]} />
              <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
            </InteractivePressable>
            <AppText variant="caption" tone="secondary">
              Se creará en {contextLabel(contextType)}.
            </AppText>
          </ScrollView>
        ) : null}

        {view === 'icon' ? (
          <ScrollView contentContainerStyle={styles.iconGrid} keyboardShouldPersistTaps="handled">
            {FINANCE_CATEGORY_ICON_OPTIONS.map((option) => {
              const selected = option.key === draftIconKey;
              return (
                <InteractivePressable
                  key={option.key}
                  onPress={() => {
                    setDraftIconKey(option.key);
                    setView('create');
                  }}
                  haptic="light"
                  pressScale={motion.scale.card}
                  style={[styles.iconTile, selected && styles.iconTileSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                >
                  <HomePlusIcon
                    name={option.key}
                    size={24}
                    color={selected ? colors.text.inverse : colors.text.secondary}
                  />
                </InteractivePressable>
              );
            })}
          </ScrollView>
        ) : null}
      </KeyboardAvoidingView>
    </ActionSheet>
  );
}

function CategoryTile({
  category,
  selected,
  onPress,
}: {
  category: FinanceCategoryDto;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const presentation = getFinanceCategoryPresentation(category);

  return (
    <InteractivePressable
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      style={[styles.quickTile, selected && styles.quickTileSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={category.label}
    >
      <HomePlusIcon
        name={presentation.iconKey}
        size={24}
        color={selected ? colors.text.inverse : toneColor(colors, presentation)}
      />
      <AppText
        variant="caption"
        weight="800"
        tone={selected ? 'inverse' : 'secondary'}
        numberOfLines={2}
        align="center"
        style={styles.quickLabel}
      >
        {category.label}
      </AppText>
    </InteractivePressable>
  );
}

function CategoryGroup({
  title,
  categories,
  selectedCategoryId,
  emptyText,
  onSelect,
}: {
  title: string;
  categories: FinanceCategoryDto[];
  selectedCategoryId: string | null;
  emptyText: string;
  onSelect: (category: FinanceCategoryDto) => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.group}>
      <AppText variant="caption" tone="secondary" weight="800">
        {title}
      </AppText>
      {categories.length === 0 ? (
        <AppText variant="bodySmall" tone="tertiary">
          {emptyText}
        </AppText>
      ) : (
        <View>
          {categories.map((category, index) => {
            const presentation = getFinanceCategoryPresentation(category);
            return (
              <View key={category.id}>
                <CategoryRow
                  iconKey={presentation.iconKey}
                  label={category.label}
                  selected={category.id === selectedCategoryId}
                  onPress={() => onSelect(category)}
                />
                {index < categories.length - 1 ? <View style={styles.insetDivider} /> : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function CategoryRow({
  iconKey,
  label,
  selected,
  onPress,
}: {
  iconKey: HomePlusIconName;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  return (
    <InteractivePressable
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      style={styles.categoryRow}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <HomePlusIcon
        name={selected ? 'checkmark-circle' : iconKey}
        size={22}
        color={selected ? colors.terracotta[700] : colors.text.tertiary}
        style={styles.rowIcon}
      />
      <AppText variant="body" weight={selected ? '800' : '500'} numberOfLines={2} style={styles.rowLabel}>
        {label}
      </AppText>
    </InteractivePressable>
  );
}

function SelectorAction({
  icon,
  label,
  onPress,
}: {
  icon: HomePlusIconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);

  return (
    <InteractivePressable
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      style={styles.actionRow}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <HomePlusIcon name={icon} size={19} color={colors.terracotta[700]} />
      <AppText variant="bodySmall" weight="800" tone="brand" style={styles.actionLabel}>
        {label}
      </AppText>
      <HomePlusIcon name="chevron-forward-outline" size={16} color={colors.text.tertiary} />
    </InteractivePressable>
  );
}

function toneColor(colors: ReturnType<typeof useAppTheme>['colors'], presentation: FinanceCategoryPresentation) {
  if (presentation.tone === 'terracotta') return colors.terracotta[600];
  if (presentation.tone === 'sage') return colors.sage[600];
  if (presentation.tone === 'sand') return colors.sand[600];
  if (presentation.tone === 'info') return colors.info.text;
  return colors.text.tertiary;
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing, touchTargets } = theme;

  return StyleSheet.create({
    keyboardAvoiding: {
      flexGrow: 0,
      flexShrink: 1,
    },
    content: {
      gap: spacing[4],
      paddingBottom: spacing[6],
    },
    backRow: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing[1],
      marginBottom: spacing[3],
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
    },
    quickTile: {
      width: '31%',
      minHeight: 96,
      borderRadius: radius.lg,
      backgroundColor: colors.surface.soft,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[2],
    },
    quickTileSelected: {
      backgroundColor: colors.terracotta[600],
    },
    quickLabel: {
      minHeight: 34,
    },
    actions: {
      gap: spacing[1],
    },
    actionRow: {
      minHeight: touchTargets.normal,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
    actionLabel: {
      flex: 1,
    },
    compactState: {
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[6],
    },
    group: {
      gap: spacing[2],
    },
    categoryRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[2],
    },
    rowIcon: {
      width: 28,
      textAlign: 'center',
    },
    rowLabel: {
      flex: 1,
      minWidth: 0,
    },
    insetDivider: {
      height: 1,
      backgroundColor: colors.border.subtle,
      marginLeft: 42,
    },
    formRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingVertical: spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    formRowLabel: {
      flex: 1,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing[2],
      paddingBottom: spacing[6],
    },
    iconTile: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.soft,
    },
    iconTileSelected: {
      backgroundColor: colors.terracotta[600],
    },
  });
}
