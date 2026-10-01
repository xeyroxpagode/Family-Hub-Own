/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  AppButton,
  AppInput,
  AppScreen,
  AppText,
  ErrorState,
  InteractivePressable,
  Skeleton,
  UndoToast,
  ActionSheet,
  SegmentedControl,
} from '../ui';
import { useAppTheme } from '../../context/AppThemeContext';
import {
  FinanceEmptyState,
  FinanceFormFooter,
  FinanceIconAction,
  FinanceIconBox,
  FinanceListRow,
  FinanceSection,
  FINANCE_ACTION_ICON_SIZE,
} from './ui';
import { HomePlusIcon } from '../../constants/icons';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import type { FinanceContextType } from '../../services/finance/financeContext';
import {
  listFinanceCategories,
  updateFinanceCategory,
  deleteFinanceCategory,
  getFinanceCategoryPresentation,
  FINANCE_CATEGORY_ICON_OPTIONS,
  type FinanceCategoryDto,
  type FinanceCategoryIconKey,
} from '../../services/finance/financeCategories';
import type { MoreStackParamList } from '../../navigation/types';
import { CreateFinanceCategorySheet } from './CreateFinanceCategorySheet';

type FinanceCategoryManagementScreenProps = {
  accessToken: string | null;
  contextType: FinanceContextType;
  contextLabel: string;
  currency: string;
  onRequestClose: () => void;
};

type CategoryTypeFilter = 'expense' | 'income';

function FinanceCategoryManagementSurface({
  accessToken,
  contextType,
  contextLabel,
  currency,
  onRequestClose,
}: FinanceCategoryManagementScreenProps) {
  const theme = useAppTheme();
  const { colors, motion } = theme;
  const styles = createStyles(theme);
  const [categories, setCategories] = useState<FinanceCategoryDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryTypeFilter>('expense');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editMode, setEditMode] = useState<'form' | 'icon'>('form');
  const [editCategory, setEditCategory] = useState<FinanceCategoryDto | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<FinanceCategoryDto | null>(null);
  const [systemVisible, setSystemVisible] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setCategories(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    listFinanceCategories(accessToken, contextType, selectedType)
      .then((payload) => {
        setCategories(payload.categories);
        setLoading(false);
      })
      .catch(() => {
        setCategories([]);
        setError('No pudimos cargar las categorías. Intenta de nuevo.');
        setLoading(false);
      });
  }, [accessToken, contextType, selectedType, refreshNonce]);

  const nativeCategories = useMemo(() => {
    return (categories ?? []).filter((c) => c.kind === 'native');
  }, [categories]);

  const customCategories = useMemo(() => {
    return (categories ?? []).filter((c) => c.kind === 'custom' && c.selectable);
  }, [categories]);

  const handleCreateSuccess = () => {
    setCreateVisible(false);
    setSuccessFeedback('Categoría creada');
    setRefreshNonce((n) => n + 1);
  };

  const handleEditSuccess = () => {
    setEditVisible(false);
    setEditCategory(null);
    setSuccessFeedback('Categoría actualizada');
    setRefreshNonce((n) => n + 1);
  };

  const handleDeleteSuccess = () => {
    setDeleteConfirmVisible(false);
    setDeleteCategory(null);
    setSuccessFeedback('Categoría eliminada');
    setRefreshNonce((n) => n + 1);
  };

  const openCreateCategory = () => {
    setCreateVisible(true);
  };

  const openEditCategory = (category: FinanceCategoryDto) => {
    if (category.kind === 'native') return;
    setEditCategory(category);
    setEditMode('form');
    setEditVisible(true);
  };

  const openDeleteConfirm = (category: FinanceCategoryDto) => {
    if (category.kind === 'native') return;
    setDeleteCategory(category);
    setDeleteConfirmVisible(true);
  };

  const confirmEdit = async () => {
    if (!editCategory || !accessToken) return;

    try {
      await updateFinanceCategory(accessToken, editCategory.id, {
        contextType,
        label: editCategory.label,
        iconKey: editCategory.iconKey as FinanceCategoryIconKey | null,
      });
      handleEditSuccess();
    } catch (err: any) {
      console.error('Edit category error:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCategory || !accessToken) return;

    try {
      await deleteFinanceCategory(accessToken, deleteCategory.id, contextType);
      handleDeleteSuccess();
    } catch (err: any) {
      console.error('Delete category error:', err);
    }
  };

  const renderCategoryRow = (category: FinanceCategoryDto, index: number, isLast: boolean) => {
    const presentation = getFinanceCategoryPresentation(category);
    const isNative = category.kind === 'native';
    const isCustom = category.kind === 'custom';

    return (
      <FinanceListRow
        key={category.id}
        title={category.label}
        icon={
          <FinanceIconBox>
            <HomePlusIcon
              name={presentation.iconKey}
              size={FINANCE_ACTION_ICON_SIZE}
              color={getToneColor(colors, presentation.tone)}
            />
          </FinanceIconBox>
        }
        chevron={isCustom}
        onPress={isCustom ? () => openEditCategory(category) : undefined}
        disabled={isNative}
        divider={isCustom && !isLast}
        accessibilityLabel={`${category.label}${isNative ? ' (categoría del sistema)' : ''}`}
      />
    );
  };

  const getToneColor = (colors: any, tone: string) => {
    switch (tone) {
      case 'terracotta': return colors.terracotta[600];
      case 'sage': return colors.sage[600];
      case 'sand': return colors.sand[600];
      case 'info': return colors.info.text;
      default: return colors.text.tertiary;
    }
  };

  const selectedTypeLabel = selectedType === 'expense' ? 'Gastos' : 'Ingresos';

  if (loading && !categories) {
    return (
      <AppScreen
        scroll
        bottomInset="tab"
        background="base"
        safeAreaEdges={['right', 'bottom', 'left']}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <FinanceIconAction
            onPress={onRequestClose}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Volver a Límites"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </FinanceIconAction>
          <AppText variant="title1" weight="800">Categorías</AppText>
        </View>
        <View style={styles.loading}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="80%" height={40} />
        </View>
      </AppScreen>
    );
  }

  if (error && !categories) {
    return (
      <AppScreen
        scroll
        bottomInset="tab"
        background="base"
        safeAreaEdges={['right', 'bottom', 'left']}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <FinanceIconAction
            onPress={onRequestClose}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Volver a Límites"
          >
            <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
          </FinanceIconAction>
          <AppText variant="title1" weight="800">Categorías</AppText>
        </View>
        <ErrorState title="No pudimos cargar las categorías" description={error} onRetry={() => setRefreshNonce((n) => n + 1)} />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      bottomInset="tab"
      background="base"
      safeAreaEdges={['right', 'bottom', 'left']}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <FinanceIconAction
          onPress={onRequestClose}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="Volver a Límites"
        >
          <HomePlusIcon name="chevron-back-outline" size={22} color={colors.text.primary} />
        </FinanceIconAction>
        <AppText variant="title1" weight="800">Categorías</AppText>
        <AppButton
          variant="icon"
          onPress={openCreateCategory}
          accessibilityLabel={`Crear categoría de ${selectedTypeLabel.toLowerCase()}`}
          haptic="medium"
          style={styles.headerIconButton}
        >
          <HomePlusIcon name="add" size={24} color={colors.terracotta[700]} />
        </AppButton>
      </View>

      <SegmentedControl
        size="compact"
        fullWidth
        value={selectedType}
        options={[
          { value: 'expense', label: 'Gastos', accessibilityLabel: 'Gastos' },
          { value: 'income', label: 'Ingresos', accessibilityLabel: 'Ingresos' },
        ]}
        onChange={setSelectedType}
      />

      <AppText variant="caption" tone="secondary" weight="700">
        {contextLabel}
      </AppText>

      <FinanceSection title="Personalizadas">
        {customCategories.length > 0 ? (
          <>{customCategories.map((cat, i) => renderCategoryRow(cat, i, i === customCategories.length - 1))}</>
        ) : (
          <FinanceEmptyState
            level="inline"
            description={`No hay categorías personalizadas de ${selectedTypeLabel.toLowerCase()}.`}
          />
        )}
      </FinanceSection>

      <View style={styles.systemSection}>
        <InteractivePressable
          onPress={() => setSystemVisible((value) => !value)}
          haptic="light"
          pressScale={motion.scale.card}
          style={styles.systemSummaryRow}
          accessibilityRole="button"
          accessibilityState={{ expanded: systemVisible }}
          accessibilityLabel="Categorías del sistema"
        >
          <View style={styles.systemSummaryText}>
            <AppText variant="title3" weight="800">Categorías del sistema</AppText>
            <AppText variant="caption" tone="secondary">
              {nativeCategories.length} categorías
            </AppText>
          </View>
          <HomePlusIcon
            name={systemVisible ? 'chevron-up-outline' : 'chevron-forward-outline'}
            size={18}
            color={colors.text.tertiary}
          />
        </InteractivePressable>
        {systemVisible ? (
          <>{nativeCategories.map((cat, i) => renderCategoryRow(cat, i, i === nativeCategories.length - 1))}</>
        ) : null}
      </View>

      <CreateFinanceCategorySheet
        visible={createVisible}
        accessToken={accessToken}
        contextType={contextType}
        mode={selectedType}
        onCreated={() => handleCreateSuccess()}
        onRequestClose={() => setCreateVisible(false)}
      />

      <ActionSheet
        visible={editVisible}
        title={editMode === 'icon' ? 'Elegir icono' : 'Editar categoría'}
        onRequestClose={() => {
          if (editMode === 'icon') {
            setEditMode('form');
            return;
          }
          setEditVisible(false);
          setEditCategory(null);
        }}
        size="content"
      >
        {editMode === 'icon' ? (
          <View style={styles.iconGrid}>
            {FINANCE_CATEGORY_ICON_OPTIONS.map((option) => {
              const selected = editCategory?.iconKey === option.key;
              return (
                <InteractivePressable
                  key={option.key}
                  onPress={() => {
                    setEditCategory(editCategory ? { ...editCategory, iconKey: option.key } : null);
                    setEditMode('form');
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
          </View>
        ) : (
          <>
            <View style={styles.editContent}>
              <AppInput
                label="Nombre"
                placeholder="Nombre de la categoría"
                value={editCategory?.label ?? ''}
                onChangeText={(v) => setEditCategory(editCategory ? { ...editCategory, label: v } : null)}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={confirmEdit}
              />
              <InteractivePressable
                onPress={() => setEditMode('icon')}
                haptic="light"
                pressScale={motion.scale.card}
                style={styles.editIconRow}
                accessibilityRole="button"
                accessibilityLabel="Editar icono"
              >
                <AppText variant="bodySmall" weight="700" style={styles.editIconLabel}>
                  Icono
                </AppText>
                <HomePlusIcon
                  name={(editCategory?.iconKey as FinanceCategoryIconKey | null) ?? 'pricetag-outline'}
                  size={22}
                  color={colors.terracotta[700]}
                />
                <HomePlusIcon name="chevron-forward-outline" size={18} color={colors.text.tertiary} />
              </InteractivePressable>
              <AppText variant="caption" tone="secondary">
                {selectedType === 'expense' ? 'Gasto' : 'Ingreso'} · {contextType === 'personal' ? 'Personal' : 'Hogar'}
              </AppText>
            </View>
            <View style={styles.editFooter}>
              <AppButton
                title="Eliminar categoría"
                variant="danger"
                onPress={() => {
                  if (editCategory) openDeleteConfirm(editCategory);
                }}
              />
              <AppButton
                title="Guardar cambios"
                onPress={confirmEdit}
              />
            </View>
          </>
        )}
      </ActionSheet>

      <ActionSheet
        visible={deleteConfirmVisible}
        title="Eliminar categoría"
        onRequestClose={() => { setDeleteConfirmVisible(false); setDeleteCategory(null); }}
        size="content"
      >
        <View style={styles.deleteContent}>
          <AppText variant="body" style={styles.deleteMessage}>
            Los movimientos anteriores seguirán mostrando esta categoría.
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            Ya no podrá elegirse para nuevos movimientos. Si tiene límites recurrentes futuros asociados, dejarán de aplicarse.
          </AppText>
        </View>
        <FinanceFormFooter
          primaryTitle="Eliminar"
          destructive
          onPrimary={confirmDelete}
          onCancel={() => { setDeleteConfirmVisible(false); setDeleteCategory(null); }}
          cancelLabel="Cancelar"
          divided={false}
          style={styles.sheetFooter}
        />
      </ActionSheet>

      <UndoToast
        visible={Boolean(successFeedback)}
        message={successFeedback ?? ''}
        duration={2000}
        onDismiss={() => setSuccessFeedback(null)}
      />
    </AppScreen>
  );
}

export function FinanceCategoryManagementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MoreStackParamList, 'FinanceCategoryManagement'>>();
  const { session } = useAuth();
  const { currentHousehold, loading, reloading } = useHousehold();

  const contextType = route.params.contextType;
  const currency = route.params.currency;

  const activeHousehold = currentHousehold
    ? { id: currentHousehold.id, name: currentHousehold.nombre }
    : null;

  const contextLabel = contextType === 'personal'
    ? 'Personal'
    : loading || reloading
    ? 'Actualizando contexto'
    : activeHousehold?.name ?? 'Contexto no disponible';

  return (
    <FinanceCategoryManagementSurface
      accessToken={session?.access_token ?? null}
      contextType={contextType}
      contextLabel={contextLabel}
      currency={currency}
      onRequestClose={() => navigation.goBack()}
    />
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const { colors, radius, spacing } = theme;
  return StyleSheet.create({
  content: {
    gap: spacing[4],
    paddingBottom: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerIconButton: {
    marginLeft: 'auto',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  loading: {
    paddingVertical: spacing[4],
    gap: spacing[2],
    alignItems: 'center',
  },
  systemSection: {
    // Ritmo común: gap padre (16) + este margen = 28 hasta la sección anterior.
    marginTop: spacing[3],
    gap: spacing[2],
  },
  systemSummaryRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  systemSummaryText: {
    flex: 1,
    minWidth: 0,
  },
  editContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  deleteContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  deleteMessage: {},
  sheetFooter: {
    paddingHorizontal: spacing[4],
  },
  editIconRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  editIconLabel: {
    flex: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
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
  editFooter: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});
}
