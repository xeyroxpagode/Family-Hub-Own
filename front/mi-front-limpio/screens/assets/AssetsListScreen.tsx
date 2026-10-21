import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import {
  useAssetsCapabilities,
  useAssetsList,
  useDebouncedValue,
} from '../../hooks/assets/useAssetsData';
import { canPerform } from '../../services/assets';
import { AppScreen } from '../../components/ui/AppScreen';
import { AppText } from '../../components/ui/AppText';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { AssetRow } from '../../components/assets/AssetRow';
import { AssetsSearchField } from '../../components/assets/AssetsSearchField';
import { AssetsFilterRail } from '../../components/assets/AssetsFilterRail';
import { AssetCreateSheet } from '../../components/assets/AssetCreateSheet';
import { ErrorBar } from '../../components/assets/ErrorBar';
import { HomePlusIcon } from '../../constants/icons';
import { colors, spacing } from '../../constants/theme';
import type { AssetProfileFilterKey } from '../../services/assets';

export type AssetsListScreenProps = {
  scope: 'normal' | 'archived' | 'trash';
  title: string;
  /** Root muestra subtítulo, búsqueda, filtros y accesos secundarios. */
  isRoot?: boolean;
};

const SKELETON_ROWS = 6;

function AssetsSkeleton() {
  return (
    <View style={{ padding: spacing[5], gap: spacing[2] }}>
      {[...Array(SKELETON_ROWS)].map((_, i) => (
        <Skeleton key={i} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

export function AssetsListScreen({ scope, title, isRoot = false }: AssetsListScreenProps) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const navigation = useNavigation<any>();

  const accessToken = session?.access_token ?? null;
  const householdId = currentHousehold?.id ?? null;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 200);
  const [filter, setFilter] = useState<AssetProfileFilterKey>('ALL');
  const [createSheet, setCreateSheet] = useState(false);

  const { assets, loading, loadingMore, refreshing, error, nextOffset, reload, loadMore } =
    useAssetsList(accessToken, householdId, scope, {
      profile: filter === 'ALL' ? undefined : filter,
      q: debouncedQuery || undefined,
    });

  // El backend es la autoridad; la proyección sólo decide qué se muestra.
  const { capabilities } = useAssetsCapabilities(accessToken, householdId);
  const canCreate = canPerform(capabilities, 'assets.create');

  const handleRowPress = useCallback(
    (assetId: string) => {
      navigation.navigate('AssetsDetail', { assetId });
    },
    [navigation],
  );

  const onEndReached = useCallback(() => {
    if (!loadingMore && nextOffset !== null) loadMore();
  }, [loadingMore, nextOffset, loadMore]);

  const isInitialLoading = loading && assets.length === 0;
  // Una búsqueda o un filtro sin resultados NO es "no hay activos": el
  // estado vacío honesto dice que no hay coincidencias (y no ofrece un CTA
  // de creación que no corresponde).
  const hasActiveFilter = debouncedQuery.trim().length > 0 || filter !== 'ALL';

  const emptyState = hasActiveFilter ? (
    <EmptyState
      title="Sin resultados"
      description={
        filter !== 'ALL' && debouncedQuery.trim().length > 0
          ? 'No hay activos que coincidan con esa búsqueda y ese filtro.'
          : filter !== 'ALL'
            ? 'No hay activos con ese tipo.'
            : 'No hay activos que coincidan con esa búsqueda.'
      }
    />
  ) : isRoot ? (
    <EmptyState
      title="Todavía no hay activos"
      description={
        canCreate
          ? 'Guardá lo que importa: objetos, vehículos, mascotas y propiedades.'
          : 'Cuando alguien de tu hogar cargue activos, los vas a ver acá.'
      }
      actionLabel={canCreate ? 'Crear el primero' : undefined}
      onAction={canCreate ? () => setCreateSheet(true) : undefined}
    />
  ) : scope === 'archived' ? (
    <EmptyState
      title="Sin activos archivados"
      description="Cuando archivés un activo, queda acá con toda su información."
    />
  ) : (
    <EmptyState
      title="Papelera vacía"
      description="Los activos que mandes a la papelera quedan acá y se pueden recuperar."
    />
  );

  const header = (
    <View>
      <View style={styles.headerBlock}>
        <View style={styles.headerTop}>
          <AppText variant="title2" weight="700" style={styles.title}>
            {title}
          </AppText>
          {isRoot && canCreate ? (
            <Pressable
              onPress={() => setCreateSheet(true)}
              accessibilityRole="button"
              accessibilityLabel="Crear activo"
              hitSlop={6}
              style={styles.iconBtn}
            >
              <HomePlusIcon name="add" size={22} color={colors.brand} />
            </Pressable>
          ) : null}
        </View>
        {isRoot ? (
          <AppText variant="bodySmall" tone="secondary">
            Objetos, vehículos, mascotas y propiedades importantes
          </AppText>
        ) : null}
      </View>

      {error && assets.length > 0 ? (
        <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[2] }}>
          <ErrorBar
            visible
            message="No pudimos actualizar tus activos."
            action={{ label: 'Reintentar', onPress: reload }}
          />
        </View>
      ) : null}

      {isRoot ? (
        <View style={{ paddingHorizontal: spacing[5], gap: spacing[3] }}>
          <AssetsSearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por nombre"
          />
          <AssetsFilterRail selected={filter} onSelect={setFilter} />
          <View style={styles.accessRow}>
            <Pressable
              onPress={() => navigation.navigate('AssetsArchived')}
              style={styles.accessBtn}
              accessibilityRole="button"
              accessibilityLabel="Ver activos archivados"
            >
              <AppText variant="bodySmall" weight="600" tone="secondary">
                Archivados
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('AssetsTrash')}
              style={styles.accessBtn}
              accessibilityRole="button"
              accessibilityLabel="Ver papelera de activos"
            >
              <AppText variant="bodySmall" weight="600" tone="secondary">
                Papelera
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <AppScreen padded={false} scroll={false} bottomInset="none">
      {isInitialLoading ? (
        <View style={{ flex: 1 }}>
          {header}
          <AssetsSkeleton />
        </View>
      ) : error && assets.length === 0 ? (
        <View style={{ flex: 1 }}>
          {header}
          <View style={{ paddingHorizontal: spacing[5] }}>
            <ErrorState title="No pudimos cargar los activos" description={error} onRetry={reload} />
          </View>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssetRow asset={item} onPress={() => handleRowPress(item.id)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<View style={{ paddingHorizontal: spacing[5] }}>{emptyState}</View>}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.brand} />
          }
          contentContainerStyle={{ paddingBottom: spacing[8] }}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <AppText variant="caption" tone="tertiary">
                  Cargando más…
                </AppText>
              </View>
            ) : null
          }
        />
      )}

      <AssetCreateSheet
        visible={createSheet}
        onRequestClose={() => setCreateSheet(false)}
        onCreated={(assetId) => {
          setCreateSheet(false);
          navigation.navigate('AssetsDetail', { assetId });
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 30 },
  headerBlock: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[3], gap: 4 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  accessRow: { flexDirection: 'row', gap: spacing[2] },
  accessBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    backgroundColor: colors.surface.soft,
  },
  skeletonRow: { minHeight: 64, borderRadius: 12 },
  footerLoading: { paddingVertical: spacing[4], alignItems: 'center' },
});

/** O01 Root — encontrar un activo. */
export function AssetsRootScreen() {
  return <AssetsListScreen scope="normal" title="Activos" isRoot />;
}

/** Archivados — pantalla secundaria con estados propios. */
export function AssetsArchivedScreen() {
  return <AssetsListScreen scope="archived" title="Archivados" />;
}

/** Papelera — recuperable, sin borrado físico. */
export function AssetsTrashScreen() {
  return <AssetsListScreen scope="trash" title="Papelera" />;
}
