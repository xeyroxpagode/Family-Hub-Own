import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { AppButton, AppCard, AppInput, AppScreen, AppText, EmptyState, ErrorState } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../supabase';
import {
  addInventoryQuantity,
  approveInventoryRestockRequest,
  consumeInventoryQuantity,
  createInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
  listInventoryRestockRequests,
  listInventoryTemplates,
  markInventoryItemOutOfStock,
  rejectInventoryRestockRequest,
  updateInventoryItem,
  type InventoryCategoryKey,
  type InventoryItem,
  type InventoryRestockRequest,
  type InventoryTemplate,
} from '../../services/inventory';
import { ApiError } from '../../services/api';

type FormState = {
  template_id: string | null;
  name: string;
  emoji: string;
  category_key: InventoryCategoryKey;
  quantity: string;
  low_stock_threshold: string;
};

const CATEGORIES: Array<{ key: InventoryCategoryKey; label: string; emoji: string }> = [
  { key: 'kitchen', label: 'Cocina', emoji: '🍚' },
  { key: 'bathroom', label: 'Baño', emoji: '🧴' },
  { key: 'cleaning', label: 'Limpieza', emoji: '🧼' },
  { key: 'tools', label: 'Herramientas', emoji: '🔧' },
  { key: 'medication', label: 'Medicamentos', emoji: '💊' },
  { key: 'pets', label: 'Mascotas', emoji: '🐾' },
  { key: 'general', label: 'General', emoji: '📦' },
];

const FILTER_CATEGORIES: Array<{ key: InventoryCategoryKey | 'all'; label: string; emoji: string }> = [
  { key: 'all', label: 'Todos', emoji: '✨' },
  ...CATEGORIES,
];

const EMPTY_FORM: FormState = {
  template_id: null,
  name: '',
  emoji: '📦',
  category_key: 'general',
  quantity: '1',
  low_stock_threshold: '1',
};

const formatQuantity = (value: number | string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0';
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(1);
};

const getItemStatus = (item: InventoryItem): 'out' | 'low' | 'ok' => {
  if (Number(item.quantity) <= 0) return 'out';
  if (Number(item.quantity) <= Number(item.low_stock_threshold)) return 'low';
  return 'ok';
};

const statusCopy = {
  out: { label: 'Sin stock', variant: 'danger' as const },
  low: { label: 'Stock bajo', variant: 'warning' as const },
  ok: { label: 'En stock', variant: 'success' as const },
};

const getCategoryEmoji = (categoryKey: InventoryCategoryKey) =>
  CATEGORIES.find((entry) => entry.key === categoryKey)?.emoji ?? EMPTY_FORM.emoji;

function InventoryItemCard({
  item,
  busy,
  onAdd,
  onConsume,
  onOutOfStock,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  busy: boolean;
  onAdd: () => void;
  onConsume: () => void;
  onOutOfStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = getItemStatus(item);
  const copy = statusCopy[status];

  return (
    <AppCard variant="default" padding="default" style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIdentity}>
          <View style={styles.itemEmoji}>
            <Text style={styles.itemEmojiText}>{item.emoji || '📦'}</Text>
          </View>
          <View style={styles.itemText}>
            <AppText variant="body" weight="700">{item.name}</AppText>
            <AppText variant="caption" tone="tertiary">
              Umbral bajo: {formatQuantity(item.low_stock_threshold)}
            </AppText>
          </View>
        </View>
        <View style={[styles.statusBadge, styles[`${copy.variant}Badge`]]}>
          <AppText variant="micro" weight="700" tone={copy.variant === 'danger' ? 'danger' : 'secondary'}>
            {copy.label}
          </AppText>
        </View>
      </View>

      <View style={styles.quantityRow}>
        <View>
          <AppText variant="title2">{formatQuantity(item.quantity)}</AppText>
          <AppText variant="caption" tone="tertiary">unidades disponibles</AppText>
        </View>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onConsume}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Restar una unidad de ${item.name}`}
          >
            <HomePlusIcon name="remove" size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onAdd}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Sumar una unidad a ${item.name}`}
          >
            <HomePlusIcon name="add" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemSecondaryActions}>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onOutOfStock}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Marcar ${item.name} sin stock`}
        >
          <HomePlusIcon name="remove-circle-outline" size={18} color={colors.danger.base} />
          <AppText variant="caption" tone="danger" weight="700">Sin stock</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onEdit}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${item.name}`}
        >
          <HomePlusIcon name="create-outline" size={18} color={colors.terracotta[600]} />
          <AppText variant="caption" weight="700">Editar</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onDelete}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.name}`}
        >
          <HomePlusIcon name="trash-outline" size={18} color={colors.danger.base} />
          <AppText variant="caption" tone="danger" weight="700">Eliminar</AppText>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
}

function RestockRequestsSection({
  pendingRequests,
  canApprove,
  busyRequestId,
  onApprove,
  onReject,
}: {
  pendingRequests: InventoryRestockRequest[];
  canApprove: boolean;
  busyRequestId: string | null;
  onApprove: (request: InventoryRestockRequest) => void;
  onReject: (request: InventoryRestockRequest) => void;
}) {
  if (pendingRequests.length === 0) return null;

  return (
    <View style={styles.restockSection}>
      <View style={styles.sectionTitleRow}>
        <HomePlusIcon name="cart-outline" size={18} color={colors.text.secondary} />
        <AppText variant="title3">Reposiciones pendientes</AppText>
      </View>
      {pendingRequests.map((request) => (
        <View key={request.id} style={styles.restockRow}>
          <View style={styles.restockCopy}>
            <AppText variant="bodySmall" weight="700">{request.suggested_title}</AppText>
            <AppText variant="caption" tone="tertiary">
              {request.suggested_description || 'Reposicion creada desde Inventario.'}
            </AppText>
          </View>
          {canApprove ? (
            <View style={styles.restockActions}>
              <TouchableOpacity
                style={styles.restockApprove}
                onPress={() => onApprove(request)}
                disabled={busyRequestId === request.id}
                accessibilityRole="button"
                accessibilityLabel={`Enviar ${request.suggested_title} al Calendario`}
              >
                <HomePlusIcon name="arrow-forward" size={16} color={colors.success.strong} />
                <AppText variant="caption" weight="700">Enviar</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.restockDismiss}
                onPress={() => onReject(request)}
                disabled={busyRequestId === request.id}
                accessibilityRole="button"
                accessibilityLabel={`Descartar reposicion ${request.suggested_title}`}
              >
                <HomePlusIcon name="close" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function QuickAddSection({
  templates,
  categoryLabel,
  onSelect,
}: {
  templates: InventoryTemplate[];
  categoryLabel: string;
  onSelect: (template: InventoryTemplate) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <View style={styles.templatesSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <HomePlusIcon name="sparkles" size={18} color={colors.terracotta[600]} />
          <View>
            <AppText variant="title3">Agregar rapido</AppText>
            <AppText variant="caption" tone="tertiary">{categoryLabel}</AppText>
          </View>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateChip}
            onPress={() => onSelect(template)}
            accessibilityRole="button"
            accessibilityLabel={`Agregar ${template.name}`}
          >
            <Text style={styles.templateEmoji}>{template.emoji || '📦'}</Text>
            <AppText variant="caption" weight="700">{template.name}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export const InventarioScreen = () => {
  const { session } = useAuth();
  const { currentHousehold, currentRole } = useHousehold();
  const insets = useSafeAreaInsets();
  const accessToken = session?.access_token ?? null;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
  const [pendingRequests, setPendingRequests] = useState<InventoryRestockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<InventoryCategoryKey | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const canApproveRestock = currentRole === 'coordinador' || currentRole === 'adulto';
  const activeCategory = useMemo(
    () => FILTER_CATEGORIES.find((entry) => entry.key === category) ?? FILTER_CATEGORIES[0],
    [category],
  );

  const visibleTemplates = useMemo(
    () => category === 'all' ? [] : templates.filter((template) => template.category_key === category).slice(0, 8),
    [category, templates],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = normalizedSearch.length > 0 || category === 'all' || item.category_key === category;
      const matchesSearch = !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [category, items, search]);

  const refresh = useCallback(async (showLoader = true) => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    setError(null);

    try {
      const [templatesResponse, itemsResponse, requestsResponse] = await Promise.all([
        listInventoryTemplates(accessToken),
        listInventoryItems(accessToken),
        listInventoryRestockRequests(accessToken, 'pending'),
      ]);

      setTemplates(templatesResponse.templates);
      setItems(itemsResponse.items);
      setPendingRequests(requestsResponse.requests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar Inventario.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!currentHousehold?.id) return undefined;

    const channel = supabase
      .channel(`inventory-${currentHousehold.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `household_id=eq.${currentHousehold.id}`,
        },
        () => void refresh(false),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_restock_requests',
          filter: `household_id=eq.${currentHousehold.id}`,
        },
        () => void refresh(false),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentHousehold?.id, refresh]);

  const openCreate = () => {
    const categoryKey = category === 'all' ? 'general' : category;
    setEditingItem(null);
    setForm({ ...EMPTY_FORM, category_key: categoryKey, emoji: getCategoryEmoji(categoryKey) });
    setModalVisible(true);
  };

  const openTemplate = (template: InventoryTemplate) => {
    setEditingItem(null);
    setForm({
      template_id: template.id,
      name: template.name,
      emoji: template.emoji || EMPTY_FORM.emoji,
      category_key: template.category_key,
      quantity: formatQuantity(template.default_quantity),
      low_stock_threshold: formatQuantity(template.default_low_stock_threshold),
    });
    setModalVisible(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      template_id: item.template_id,
      name: item.name,
      emoji: item.emoji || '📦',
      category_key: item.category_key,
      quantity: formatQuantity(item.quantity),
      low_stock_threshold: formatQuantity(item.low_stock_threshold),
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!accessToken) return;

    const quantity = Number(form.quantity.replace(',', '.'));
    const threshold = Number(form.low_stock_threshold.replace(',', '.'));

    if (!form.name.trim()) {
      Alert.alert('Falta nombre', 'Agrega un nombre para el item.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(threshold) || threshold < 0) {
      Alert.alert('Cantidad invalida', 'Usa cantidades mayores o iguales a 0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        template_id: form.template_id,
        name: form.name.trim(),
        emoji: form.emoji.trim() || null,
        category_key: form.category_key,
        quantity,
        low_stock_threshold: threshold,
      };

      if (editingItem) {
        await updateInventoryItem(accessToken, editingItem.id, payload);
      } else {
        await createInventoryItem(accessToken, payload);
      }

      closeModal();
      await refresh(false);
    } catch (err) {
      Alert.alert('No pudimos guardar', err instanceof ApiError ? err.message : 'Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const mutateItem = async (item: InventoryItem, action: () => Promise<unknown>) => {
    setBusyItemId(item.id);
    try {
      await action();
      await refresh(false);
    } catch (err) {
      Alert.alert('No pudimos actualizar', err instanceof ApiError ? err.message : 'Intenta nuevamente.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDelete = (item: InventoryItem) => {
    if (!accessToken) return;

    Alert.alert('Eliminar item', `Eliminar ${item.name} del inventario?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => void mutateItem(item, () => deleteInventoryItem(accessToken, item.id)),
      },
    ]);
  };

  const handleMarkOutOfStock = (item: InventoryItem) => {
    if (!accessToken) return;

    Alert.alert('Marcar sin stock', `Vas a dejar ${item.name} en 0 unidades.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Marcar sin stock',
        style: 'destructive',
        onPress: () => void mutateItem(item, () => markInventoryItemOutOfStock(accessToken, item.id)),
      },
    ]);
  };

  const handleApproveRequest = async (request: InventoryRestockRequest) => {
    if (!accessToken) return;

    setBusyRequestId(request.id);
    try {
      await approveInventoryRestockRequest(accessToken, request.id);
      await refresh(false);
      Alert.alert('Tarea creada', 'La reposicion fue enviada al Calendario.');
    } catch (err) {
      Alert.alert('No pudimos enviar', err instanceof ApiError ? err.message : 'Intenta nuevamente.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleRejectRequest = async (request: InventoryRestockRequest) => {
    if (!accessToken) return;

    setBusyRequestId(request.id);
    try {
      await rejectInventoryRestockRequest(accessToken, request.id);
      await refresh(false);
    } catch (err) {
      Alert.alert('No pudimos descartar', err instanceof ApiError ? err.message : 'Intenta nuevamente.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    void refresh(false);
  };

  return (
    <>
      <AppScreen
        scroll
        bottomInset="tab"
        background="base"
        scrollProps={{
          refreshControl: (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.terracotta[500]} />
          ),
        }}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText variant="title1">Inventario</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {currentHousehold?.nombre ?? 'Hogar activo'}
            </AppText>
          </View>
          <AppButton
            variant="icon"
            onPress={openCreate}
            accessibilityLabel="Agregar item"
          >
            <HomePlusIcon name="add" size={22} color={colors.terracotta[600]} />
          </AppButton>
        </View>

        <AppInput
          label="Buscar en inventario"
          variant="search"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar en todo el inventario"
          containerStyle={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {FILTER_CATEGORIES.map((entry) => (
            <TouchableOpacity
              key={entry.key}
              style={[styles.categoryChip, category === entry.key && styles.categoryChipActive]}
              onPress={() => setCategory(entry.key)}
              accessibilityRole="button"
            >
              <Text style={styles.categoryEmoji}>{entry.emoji}</Text>
              <AppText
                variant="caption"
                weight="700"
                tone={category === entry.key ? 'inverse' : 'secondary'}
              >
                {entry.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.terracotta[500]} />
            <AppText variant="bodySmall" tone="secondary">Cargando inventario...</AppText>
          </View>
        ) : error ? (
          <ErrorState description={error} onRetry={() => void refresh()} style={styles.stateBlock} />
        ) : filteredItems.length === 0 ? (
          <>
            <QuickAddSection templates={visibleTemplates} categoryLabel={activeCategory.label} onSelect={openTemplate} />
            <EmptyState
              title={search ? 'No encontramos items' : category === 'all' ? 'Todavia no hay items' : `No hay items en ${activeCategory.label}`}
              description={search ? 'Prueba con otro nombre o cambia de categoria.' : visibleTemplates.length > 0 ? 'Elige una sugerencia o agrega un producto nuevo.' : 'Agrega un producto para empezar a controlar su stock.'}
              actionLabel="Agregar item"
              onAction={openCreate}
              style={styles.stateBlock}
            />
          </>
        ) : (
          <View style={styles.itemsSection}>
            <View style={styles.itemsSectionHeader}>
              <AppText variant="title3">{search ? 'Resultados' : activeCategory.label}</AppText>
              <AppText variant="caption" tone="secondary" weight="700">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </AppText>
            </View>
            <View style={styles.itemsList}>
              {filteredItems.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  busy={busyItemId === item.id}
                  onAdd={() => accessToken && void mutateItem(item, () => addInventoryQuantity(accessToken, item.id, 1))}
                  onConsume={() => accessToken && void mutateItem(item, () => consumeInventoryQuantity(accessToken, item.id, 1))}
                  onOutOfStock={() => handleMarkOutOfStock(item)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </View>
          </View>
        )}

        {!loading && !error && filteredItems.length > 0 ? (
          <QuickAddSection templates={visibleTemplates} categoryLabel={activeCategory.label} onSelect={openTemplate} />
        ) : null}

        {!loading && !error ? (
          <RestockRequestsSection
            pendingRequests={pendingRequests}
            canApprove={canApproveRestock}
            busyRequestId={busyRequestId}
            onApprove={(request) => void handleApproveRequest(request)}
            onReject={(request) => void handleRejectRequest(request)}
          />
        ) : null}
      </AppScreen>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(spacing[5], insets.bottom) }]}>
            <View style={styles.modalHeader}>
              <View>
                <AppText variant="title2">{editingItem ? 'Editar item' : 'Nuevo item'}</AppText>
                <AppText variant="caption" tone="secondary">
                  Cantidad simple, sin unidades avanzadas
                </AppText>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={closeModal} accessibilityRole="button">
                <HomePlusIcon name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              enableOnAndroid
              extraScrollHeight={Platform.OS === 'ios' ? spacing[3] : spacing[2]}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <AppInput
                label="Nombre"
                value={form.name}
                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                placeholder="Leche"
              />
              <View style={styles.formRow}>
                <AppInput
                  label="Emoji"
                  value={form.emoji}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, emoji: value }))}
                  placeholder="🥛"
                  containerStyle={styles.emojiInput}
                />
                <AppInput
                  label="Cantidad"
                  value={form.quantity}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, quantity: value }))}
                  keyboardType="decimal-pad"
                  containerStyle={{ flex: 1 }}
                />
              </View>
              <AppInput
                label="Umbral bajo stock"
                value={form.low_stock_threshold}
                onChangeText={(value) => setForm((prev) => ({ ...prev, low_stock_threshold: value }))}
                keyboardType="decimal-pad"
                helperText="Cuando la cantidad llega a este valor, se genera alerta."
              />

              <AppText variant="caption" tone="secondary" weight="700" style={styles.formLabel}>
                Categoria
              </AppText>
              <View style={styles.categoryWrap}>
                {CATEGORIES.map((entry) => (
                  <TouchableOpacity
                    key={entry.key}
                    style={[styles.categoryChip, form.category_key === entry.key && styles.categoryChipActive]}
                    onPress={() => setForm((prev) => ({ ...prev, category_key: entry.key }))}
                    accessibilityRole="button"
                  >
                    <Text style={styles.categoryEmoji}>{entry.emoji}</Text>
                    <AppText
                      variant="caption"
                      weight="700"
                      tone={form.category_key === entry.key ? 'inverse' : 'secondary'}
                    >
                      {entry.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </KeyboardAwareScrollView>

            <View style={styles.modalActions}>
              <AppButton title="Cancelar" variant="ghost" onPress={closeModal} disabled={saving} style={{ flex: 1 }} />
              <AppButton title={editingItem ? 'Guardar' : 'Crear'} onPress={() => void handleSave()} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  sectionHeader: {
    marginBottom: spacing[3],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchInput: {
    marginBottom: spacing[3],
  },
  chipsScroll: {
    marginBottom: spacing[4],
  },
  categoryChip: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    marginRight: spacing[2],
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  categoryChipActive: {
    backgroundColor: colors.terracotta[500],
    borderColor: colors.terracotta[500],
  },
  categoryEmoji: {
    fontSize: 15,
  },
  templatesSection: {
    marginBottom: spacing[4],
  },
  templateScroll: {
    marginHorizontal: -spacing[1],
  },
  templateChip: {
    width: 96,
    minHeight: 86,
    marginHorizontal: spacing[1],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  templateEmoji: {
    fontSize: 28,
  },
  loadingBlock: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  stateBlock: {
    marginTop: spacing[2],
  },
  itemsList: {
    gap: spacing[3],
    paddingBottom: spacing[6],
  },
  itemsSection: {
    gap: spacing[3],
  },
  itemsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restockSection: {
    marginTop: spacing[2],
    paddingTop: spacing[5],
    paddingBottom: spacing[6],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  restockRow: {
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  restockCopy: {
    gap: spacing[1],
  },
  restockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  restockApprove: {
    minHeight: 44,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.success.soft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  restockDismiss: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  itemCard: {
    marginBottom: spacing[1],
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  itemIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  itemEmoji: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.background.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmojiText: {
    fontSize: 26,
  },
  itemText: {
    flex: 1,
    gap: spacing[1],
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderWidth: 1,
  },
  dangerBadge: {
    backgroundColor: colors.danger.soft,
    borderColor: colors.danger.base,
  },
  warningBadge: {
    backgroundColor: colors.warning.soft,
    borderColor: colors.warning.base,
  },
  successBadge: {
    backgroundColor: colors.success.soft,
    borderColor: colors.success.base,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSecondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  secondaryAction: {
    minHeight: 44,
    paddingHorizontal: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.surface.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[4],
  },
  modalScrollContent: {
    paddingBottom: spacing[6],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  emojiInput: {
    width: 96,
  },
  formLabel: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingBottom: spacing[4],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
});
