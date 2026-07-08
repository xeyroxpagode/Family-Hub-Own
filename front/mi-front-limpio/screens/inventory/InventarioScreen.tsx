import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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

const EMPTY_FORM: FormState = {
  template_id: null,
  name: '',
  emoji: '🍚',
  category_key: 'kitchen',
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

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'warning' | 'danger' }) {
  const color = tone === 'danger' ? colors.danger.base : tone === 'warning' ? colors.warning.base : colors.sage[600];
  const backgroundColor = tone === 'danger' ? colors.danger.soft : tone === 'warning' ? colors.warning.soft : colors.sage[50];

  return (
    <View style={[styles.statCard, { backgroundColor }]}>
      <AppText variant="title3" style={{ color }}>{value}</AppText>
      <AppText variant="caption" tone="secondary" align="center">{label}</AppText>
    </View>
  );
}

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
        <AppText variant="title2">{formatQuantity(item.quantity)}</AppText>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.iconButton} onPress={onConsume} disabled={busy} accessibilityRole="button">
            <HomePlusIcon name="remove" size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onAdd} disabled={busy} accessibilityRole="button">
            <HomePlusIcon name="add" size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onOutOfStock} disabled={busy} accessibilityRole="button">
            <HomePlusIcon name="alert-circle" size={18} color={colors.danger.base} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onEdit} disabled={busy} accessibilityRole="button">
            <HomePlusIcon name="create-outline" size={18} color={colors.terracotta[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.deleteLink} onPress={onDelete} disabled={busy} accessibilityRole="button">
        <AppText variant="caption" tone="danger" weight="700">Eliminar</AppText>
      </TouchableOpacity>
    </AppCard>
  );
}

function InventoryAlertsCard({
  lowStockItems,
  outOfStockItems,
  pendingRequests,
  canApprove,
  busyRequestId,
  onApprove,
  onReject,
}: {
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
  pendingRequests: InventoryRestockRequest[];
  canApprove: boolean;
  busyRequestId: string | null;
  onApprove: (request: InventoryRestockRequest) => void;
  onReject: (request: InventoryRestockRequest) => void;
}) {
  if (lowStockItems.length === 0 && outOfStockItems.length === 0 && pendingRequests.length === 0) {
    return null;
  }

  return (
    <AppCard variant="warning" padding="default" highlighted style={styles.alertsCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <HomePlusIcon name="alert-circle" size={18} color={colors.warning.strong} />
          <AppText variant="title3" tone="warning">Atencion de stock</AppText>
        </View>
      </View>

      {outOfStockItems.slice(0, 3).map((item) => (
        <AppText key={`out-${item.id}`} variant="bodySmall" tone="secondary">
          Sin stock: {item.name}
        </AppText>
      ))}
      {lowStockItems.slice(0, 3).map((item) => (
        <AppText key={`low-${item.id}`} variant="bodySmall" tone="secondary">
          Stock bajo: {item.name} ({formatQuantity(item.quantity)})
        </AppText>
      ))}

      {pendingRequests.length > 0 ? (
        <View style={styles.requestsBlock}>
          <AppText variant="caption" tone="warning" weight="700">
            Reposiciones pendientes
          </AppText>
          {pendingRequests.slice(0, 3).map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" weight="700">{request.suggested_title}</AppText>
                <AppText variant="caption" tone="tertiary">
                  {request.suggested_description || 'Stock bajo detectado desde Inventario.'}
                </AppText>
              </View>
              {canApprove ? (
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.requestApprove}
                    onPress={() => onApprove(request)}
                    disabled={busyRequestId === request.id}
                    accessibilityRole="button"
                  >
                    <HomePlusIcon name="checkmark" size={16} color={colors.success.strong} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.requestReject}
                    onPress={() => onReject(request)}
                    disabled={busyRequestId === request.id}
                    accessibilityRole="button"
                  >
                    <HomePlusIcon name="close" size={16} color={colors.danger.strong} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </AppCard>
  );
}

export const InventarioScreen = () => {
  const { session } = useAuth();
  const { currentHousehold, currentRole } = useHousehold();
  const accessToken = session?.access_token ?? null;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
  const [pendingRequests, setPendingRequests] = useState<InventoryRestockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<InventoryCategoryKey>('kitchen');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const canApproveRestock = currentRole === 'coordinador' || currentRole === 'adulto';

  const lowStockItems = useMemo(
    () => items.filter((item) => getItemStatus(item) === 'low'),
    [items],
  );

  const outOfStockItems = useMemo(
    () => items.filter((item) => getItemStatus(item) === 'out'),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = item.category_key === category;
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
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openTemplate = (template: InventoryTemplate) => {
    setEditingItem(null);
    setForm({
      template_id: template.id,
      name: template.name,
      emoji: template.emoji || '🍚',
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

  const handleApproveRequest = async (request: InventoryRestockRequest) => {
    if (!accessToken) return;

    setBusyRequestId(request.id);
    try {
      await approveInventoryRestockRequest(accessToken, request.id);
      await refresh(false);
      Alert.alert('Tarea creada', 'La reposicion fue enviada al Planner.');
    } catch (err) {
      Alert.alert('No pudimos aprobar', err instanceof ApiError ? err.message : 'Intenta nuevamente.');
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
      Alert.alert('No pudimos rechazar', err instanceof ApiError ? err.message : 'Intenta nuevamente.');
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
              {currentHousehold?.nombre ?? 'Hogar activo'} · Cocina y alacena
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

        <View style={styles.statsRow}>
          <StatCard label="Items" value={items.length} tone="primary" />
          <StatCard label="Bajo stock" value={lowStockItems.length} tone="warning" />
          <StatCard label="Sin stock" value={outOfStockItems.length} tone="danger" />
        </View>

        <InventoryAlertsCard
          lowStockItems={lowStockItems}
          outOfStockItems={outOfStockItems}
          pendingRequests={pendingRequests}
          canApprove={canApproveRestock}
          busyRequestId={busyRequestId}
          onApprove={(request) => void handleApproveRequest(request)}
          onReject={(request) => void handleRejectRequest(request)}
        />

        <AppInput
          label="Buscar"
          variant="search"
          value={search}
          onChangeText={setSearch}
          placeholder="Harina, leche, arroz..."
          containerStyle={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {CATEGORIES.map((entry) => (
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

        <View style={styles.templatesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <HomePlusIcon name="sparkles" size={18} color={colors.terracotta[600]} />
              <AppText variant="title3">Agregar rapido</AppText>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
            {templates
              .filter((template) => template.category_key === 'kitchen')
              .map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateChip}
                  onPress={() => openTemplate(template)}
                  accessibilityRole="button"
                >
                  <Text style={styles.templateEmoji}>{template.emoji || '🍚'}</Text>
                  <AppText variant="caption" weight="700">{template.name}</AppText>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={colors.terracotta[500]} />
            <AppText variant="bodySmall" tone="secondary">Cargando inventario...</AppText>
          </View>
        ) : error ? (
          <ErrorState description={error} onRetry={() => void refresh()} style={styles.stateBlock} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="Todavia no hay items"
            description={search ? 'No encontramos items con ese filtro.' : 'Agrega productos de cocina para empezar a controlar stock.'}
            actionLabel="Agregar item"
            onAction={openCreate}
            style={styles.stateBlock}
          />
        ) : (
          <View style={styles.itemsList}>
            {filteredItems.map((item) => (
              <InventoryItemCard
                key={item.id}
                item={item}
                busy={busyItemId === item.id}
                onAdd={() => accessToken && void mutateItem(item, () => addInventoryQuantity(accessToken, item.id, 1))}
                onConsume={() => accessToken && void mutateItem(item, () => consumeInventoryQuantity(accessToken, item.id, 1))}
                onOutOfStock={() => accessToken && void mutateItem(item, () => markInventoryItemOutOfStock(accessToken, item.id))}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </View>
        )}
      </AppScreen>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            </ScrollView>

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
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: radius.lg,
    padding: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  alertsCard: {
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
  requestsBlock: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: spacing[2],
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  requestApprove: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.success.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestReject: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.danger.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    marginBottom: spacing[3],
  },
  chipsScroll: {
    marginBottom: spacing[4],
  },
  categoryChip: {
    minHeight: 38,
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
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLink: {
    alignSelf: 'flex-start',
    marginTop: spacing[3],
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
