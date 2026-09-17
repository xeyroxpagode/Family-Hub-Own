import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppCard, AppText, ErrorState, Skeleton } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors } from '../../constants/theme';
import { ApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  listTrash,
  type TrashItem,
  type TrashFilterType,
} from '../../services/plannerTrash';
import {
  enqueuePlannerEventRestore,
  enqueuePlannerTaskRestore,
  enqueuePlannerGoalRestore,
  enqueuePlannerMilestoneRestore,
} from '../../services/planner/reliability';
import { plannerStyles as S } from './plannerShared';

type FilterTab = { key: TrashFilterType; label: string };

const FILTER_TABS: FilterTab[] = [
  { key: 'all', label: 'Todos' },
  { key: 'tasks', label: 'Tareas' },
  { key: 'events', label: 'Eventos' },
  { key: 'goals', label: 'Metas' },
];

const TYPE_LABELS: Record<string, string> = {
  task: 'Tarea',
  event: 'Evento',
  goal: 'Meta',
  milestone: 'Hito',
};

const TYPE_ICONS: Record<string, string> = {
  task: 'checkbox',
  event: 'calendar',
  goal: 'flag',
  milestone: 'checkbox-outline',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  awaiting_verification: 'En verificación',
  verified: 'Verificada',
  cancelled: 'Cancelada',
  scheduled: 'Programado',
  active: 'Activa',
  closed: 'Cerrada',
  achieved: 'Logrado',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function PlannerTrashScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const [filter, setFilter] = useState<TrashFilterType>('all');
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreToast, setRestoreToast] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!accessToken) return;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const data = await listTrash(accessToken, { type: filter });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar la papelera.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleRestore = async (item: TrashItem) => {
    if (!accessToken) return;

    setRestoringId(item.id);
    try {
      switch (item.type) {
        case 'task':
          await enqueuePlannerTaskRestore(item.id, item.version);
          break;
        case 'event':
          await enqueuePlannerEventRestore(item.id, item.version);
          break;
        case 'goal':
          await enqueuePlannerGoalRestore(item.id, item.version);
          break;
        case 'milestone':
          if (!item.parent) {
            Alert.alert(
              'Papelera',
              'No pudimos restaurar este hito porque falta la meta asociada. Actualizá la papelera y volvé a intentar.',
            );
            await load(true);
            return;
          }
          await enqueuePlannerMilestoneRestore(item.parent.id, item.id, item.version);
          break;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      const typeMessage =
        item.type === 'task' ? 'Tarea restaurada.' :
        item.type === 'event' ? 'Evento restaurado.' :
        item.type === 'goal' ? 'Meta restaurada.' :
        item.type === 'milestone' ? 'Hito restaurado.' :
        'Elemento restaurado.';
      setRestoreToast(typeMessage);
      setTimeout(() => setRestoreToast(null), 3000);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'version_conflict') {
        Alert.alert('Papelera', 'No pudimos restaurar la meta porque cambió recientemente. Actualizá y probá de nuevo.');
        await load(true);
      } else if (err instanceof ApiError && err.code === 'goal_not_found') {
        Alert.alert('Papelera', 'No encontramos esta meta. Actualizá la papelera y volvé a intentar.');
        await load(true);
      } else {
        Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo restaurar.');
      }
    } finally {
      setRestoringId(null);
    }
  };

  const renderItem = ({ item }: { item: TrashItem }) => {
    const isRestoring = restoringId === item.id;
    const typeLabel = TYPE_LABELS[item.type] ?? item.type;
    const typeIcon = TYPE_ICONS[item.type] ?? 'ellipse';
    const statusLabel = STATUS_LABELS[item.status] ?? item.status;
    const isGoal = item.type === 'goal';

    return (
      <AppCard key={item.id} padding="default" style={[S.card, { opacity: isRestoring ? 0.5 : 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isGoal ? colors.terracotta[100] : colors.surface.soft,
          }}>
            <HomePlusIcon
              name={typeIcon as any}
              size={18}
              color={isGoal ? colors.terracotta[700] : colors.text.tertiary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="700" numberOfLines={1}>{item.title}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={[S.badge, { backgroundColor: isGoal ? colors.terracotta[50] : colors.surface.soft }]}>
                <AppText variant="micro" weight="700" style={S.badgeText}>{typeLabel}</AppText>
              </View>
              <View style={[S.badge, { backgroundColor: colors.surface.soft }]}>
                <AppText variant="micro" weight="700" style={S.badgeText}>{statusLabel}</AppText>
              </View>
            </View>
            {item.parent ? (
              <AppText variant="micro" tone="tertiary" style={{ marginTop: 4 }}>
                {`En meta: ${item.parent.title}`}
                {item.restore_requires_parent ? ' (restaurá la meta primero)' : ''}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <AppText variant="micro" tone="tertiary">
                Movida {formatDate(item.trashed_at)}
              </AppText>
              {item.trashed_by_display_name ? (
                <>
                  <AppText variant="micro" tone="tertiary">por</AppText>
                  <AppText variant="micro" tone="secondary" weight="700">
                    {item.trashed_by_display_name}
                  </AppText>
                </>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={{
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: colors.terracotta[500],
              opacity: isRestoring ? 0.5 : 1,
            }}
            disabled={isRestoring || item.restore_requires_parent}
            onPress={() => handleRestore(item)}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <AppText variant="micro" weight="700" style={{ color: colors.text.inverse }}>
                Restaurar
              </AppText>
            )}
          </TouchableOpacity>
        </View>
        {item.restore_requires_parent ? (
          <AppText variant="micro" tone="tertiary" style={{ marginTop: 8, marginLeft: 44 }}>
            Primero restaurá la meta padre para poder recuperar este hito.
          </AppText>
        ) : null}
      </AppCard>
    );
  };

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, gap: 10 }}>
        <TouchableOpacity
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.soft,
            borderWidth: 1,
            borderColor: colors.border.default,
          }}
          onPress={() => navigation.goBack()}
        >
          <HomePlusIcon name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="title1">Papelera</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Acá encontrás lo que moviste a papelera. Podés restaurarlo.
          </AppText>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(t) => t.key}
          contentContainerStyle={S.filterScroll}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[
                S.filterChip,
                filter === tab.key && S.filterChipActive,
              ]}
              onPress={() => setFilter(tab.key)}
            >
              <AppText
                variant="micro"
                weight="700"
                style={[
                  S.filterChipText,
                  filter === tab.key && S.filterChipTextActive,
                ]}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.terracotta[600]} />
        </View>
      ) : error ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={[S.content, { paddingTop: 12 }]}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
          ListEmptyComponent={
            <View style={S.emptyBox}>
              <HomePlusIcon name="trash-outline" size={48} color={colors.text.tertiary} />
              <AppText variant="title1" style={S.emptyTitle}>Papelera vacía</AppText>
              <AppText variant="body" style={S.emptyText}>
                Las metas y los hitos eliminados aparecerán aquí.
              </AppText>
            </View>
          }
        />
      )}
      {restoreToast ? (
        <View style={S.toastBox}>
          <HomePlusIcon name="checkmark-circle" size={18} color={colors.success.strong} />
          <AppText variant="bodySmall" tone="success" weight="700" style={{ flex: 1 }}>{restoreToast}</AppText>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
