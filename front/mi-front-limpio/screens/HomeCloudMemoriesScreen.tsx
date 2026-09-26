import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { AppButton, AppText, ErrorState, SegmentedControl, Skeleton } from '../components/ui';
import { MemoryCard } from '../components/homecloud/MemoryCards';
import { HomePlusIcon } from '../constants/icons';
import { colors, radius, spacing } from '../constants/theme';
import { listMemories } from '../services/homecloud/homecloudReadService';
import type { HomeCloudMemoryListItem } from '../services/homecloud/homecloudTypes';
import {
  flattenTimelineForSectionList,
  groupMemoriesForTimeline,
  type TimelineListSection,
} from '../services/homecloud/homecloudMemoriesTimeline';

const MEMORIES_PAGE_SIZE = 50;
const TIMELINE_COLUMNS = 3;

/**
 * HomeCloud STAGE 4B.2 — Memories Root (productive Timeline surface).
 *
 * Authority: Stage 4B.1 read model (`listMemories`: role=memory,
 * lifecycle=active, canonical Timeline order, stable pagination).
 *
 * - Real backend data only: no fixtures, no mocks, no local arrays.
 * - States: loading (skeletons) / empty / error+retry / success / refresh
 *   (pull-to-refresh, same pattern as the rest of the app). No polling.
 * - Grouping uses the semantic date only (never uploadedAt). Unknown dates
 *   render last as "Sin fecha" per the productive backend contract.
 * - Cards are non-interactive: there is no productive Viewer V2 yet, so no
 *   fake destination is wired (reported as deferred).
 * - No Create affordance is connected here: memory creation has no approved
 *   productive contract yet (reported as deferred for the next slice).
 */
export function HomeCloudMemoriesScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const token = session?.access_token ?? null;

  const [memories, setMemories] = useState<HomeCloudMemoryListItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    if (!token || !currentHousehold) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await listMemories(token, { limit: MEMORIES_PAGE_SIZE });
      setMemories([...page.memories]);
      setNextOffset(page.nextOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus recuerdos.');
    } finally {
      setLoading(false);
    }
  }, [token, currentHousehold?.id]);

  const refresh = useCallback(async () => {
    if (!token || !currentHousehold) return;
    setRefreshing(true);
    setError(null);
    try {
      const page = await listMemories(token, { limit: MEMORIES_PAGE_SIZE });
      setMemories([...page.memories]);
      setNextOffset(page.nextOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar tus recuerdos.');
    } finally {
      setRefreshing(false);
    }
  }, [token, currentHousehold?.id]);

  const loadMore = useCallback(async () => {
    if (!token || !currentHousehold || nextOffset === null || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await listMemories(token, { limit: MEMORIES_PAGE_SIZE, offset: nextOffset });
      setMemories((previous) => {
        const known = new Set(previous.map((memory) => memory.id));
        return [...previous, ...page.memories.filter((memory) => !known.has(memory.id))];
      });
      setNextOffset(page.nextOffset);
    } catch {
      // Pagination failure is non-fatal: the loaded Timeline stays and the
      // footer button remains available for another attempt.
    } finally {
      setLoadingMore(false);
    }
  }, [token, currentHousehold?.id, nextOffset, loadingMore, loading]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage]),
  );

  useEffect(() => {
    setMemories([]);
    setNextOffset(null);
    setError(null);
  }, [currentHousehold?.id]);

  const sections = useMemo<TimelineListSection[]>(
    () => flattenTimelineForSectionList(groupMemoriesForTimeline(memories), TIMELINE_COLUMNS),
    [memories],
  );

  const goFiles = useCallback(() => {
    navigation.navigate('HomeCloudFiles');
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <AppButton variant="icon" size="sm" onPress={() => navigation.goBack()} accessibilityLabel="Volver">
          <HomePlusIcon name="arrow-back" size={22} color={colors.text.primary} />
        </AppButton>
        <AppText variant="title2" weight="800" style={styles.headerTitle}>
          {'HomeCloud'}
        </AppText>
        <AppButton variant="icon" size="sm" onPress={() => void refresh()} accessibilityLabel="Actualizar">
          <HomePlusIcon name="refresh" size={21} color={colors.text.secondary} />
        </AppButton>
      </View>
      <SegmentedControl
        value="memories"
        options={[
          { value: 'files', label: 'Archivos' },
          { value: 'memories', label: 'Recuerdos' },
        ]}
        onChange={(value) => {
          if (value === 'files') goFiles();
        }}
        style={styles.segment}
      />
      <View style={styles.titleRow}>
        <AppText variant="title3" weight="800">
          {'Recuerdos'}
        </AppText>
      </View>
      {loading ? (
        <MemoriesLoadingSkeleton />
      ) : error && memories.length === 0 ? (
        <View style={styles.center}>
          <ErrorState
            title="No pudimos cargar tus recuerdos"
            description={error}
            retryLabel="Reintentar"
            onRetry={() => void loadFirstPage()}
          />
        </View>
      ) : memories.length === 0 ? (
        <View style={styles.center}>
          <HomePlusIcon name="image-outline" size={38} color={colors.text.tertiary} />
          <AppText variant="title3" weight="800" align="center">
            {'Aún no hay recuerdos'}
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            {'Las fotos, videos, audios y escritos que quieran conservar van a aparecer acá.'}
          </AppText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.yearTitle && section.yearTitle !== section.title ? (
                <AppText variant="title3" weight="800">
                  {section.yearTitle}
                </AppText>
              ) : null}
              <AppText variant="bodySmall" tone="secondary" weight="600">
                {section.yearTitle && section.yearTitle !== section.title ? section.title : section.yearTitle ?? section.title}
              </AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.items.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} accessToken={token} />
              ))}
              {Array.from({ length: TIMELINE_COLUMNS - item.items.length }).map((_, index) => (
                <View key={`spacer-${index}`} style={styles.rowSpacer} />
              ))}
            </View>
          )}
          ListFooterComponent={
            nextOffset !== null ? (
              <View style={styles.footer}>
                <AppButton
                  title={loadingMore ? 'Cargando…' : 'Mostrar más recuerdos'}
                  variant="secondary"
                  disabled={loadingMore}
                  onPress={() => void loadMore()}
                />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function MemoriesLoadingSkeleton() {
  return (
    <View style={styles.list}>
      <Skeleton variant="line" width="32%" height={22} />
      <View style={styles.skeletonRow}>
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
      </View>
      <Skeleton variant="line" width="44%" height={22} />
      <View style={styles.skeletonRow}>
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
        <Skeleton variant="card" height={128} style={styles.skeletonTile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  headerTitle: { flex: 1 },
  segment: { marginHorizontal: spacing[5], marginTop: spacing[2] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  sectionHeader: { paddingTop: spacing[3], paddingBottom: spacing[2], gap: 2 },
  row: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  rowSpacer: { flex: 1 },
  footer: { paddingVertical: spacing[4], alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
  skeletonRow: { flexDirection: 'row', gap: spacing[2], marginVertical: spacing[2] },
  skeletonTile: { flex: 1, borderRadius: radius.lg },
});
