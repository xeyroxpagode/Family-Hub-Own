import React, { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import type { MemoryCollectionsState } from '../../services/homecloud/homecloudMemoryCollectionsPagination';
import {
  flattenTimelineForSectionList,
  groupMemoriesForTimeline,
} from '../../services/homecloud/homecloudMemoriesTimeline';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { AppButton, AppText, ErrorState, Skeleton } from '../ui';
import { MemorySelectableCard } from './MemorySelectableCard';

/**
 * HC2-C C1 — the AUTOMATIC COLLECTION detail: the SAME nested overlay an Album is.
 *
 * WHY THIS EXISTS INSTEAD OF A BODY SWAP
 * --------------------------------------
 * Before HC2-C, opening `Fotos` / `Videos` / `Audios` / `Notas` was only
 * reachable through a `Colecciones` screen that itself existed only while a
 * selection was active, and choosing it REPLACED the whole screen body. That made
 * the automatic collections a second information architecture layered on top of
 * the root.
 *
 * The root is now ONE vertical scroll — `Álbumes → Tipos → Timeline` — and an
 * automatic collection opens as a nested overlay above it, exactly like the
 * Album detail already does. The Timeline under it stays mounted, so its loaded
 * pages, its grouped dataset and its scroll offset all survive Back. No route,
 * no router, no `navigation/types.ts` change, and no second read owner: the
 * dataset is the ONE `collectionsController` the screen already had.
 *
 * WHY IT IS A COMPONENT AND NOT INLINE JSX
 * ----------------------------------------
 * It is the exact structural mirror of `AlbumDetailView` — same overlay, same
 * header grammar, same loading/empty/error contract, same `SectionList`
 * configuration, same `MemorySelectableCard` interaction. Writing it a second
 * time inline in the screen would have been the duplication, not this file.
 *
 * THE READ CONTRACT IS UNCHANGED
 * ------------------------------
 * A type collection is the existing Memories read model filtered by `kind` in
 * Timeline order, read by the existing controller. No new endpoint, no new
 * filter, no client re-sort.
 */

const COLLECTION_COLUMNS = 3;

/** Stable no-op seams: this view never owns a selection interaction itself. */
const noop = (..._args: unknown[]) => {};

export function MemoryCollectionDetailView({
  title,
  state,
  accessToken,
  selecting,
  onBack,
  onRefresh,
  onLoadMore,
  onToggle,
  onOpenMemory,
  onLongPressMemory,
}: {
  /** The collection's own name (Fotos / Videos / Audios / Notas, or an Album). */
  title: string;
  state: MemoryCollectionsState;
  accessToken: string | null;
  selecting: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onToggle: (contentId: string) => void;
  onOpenMemory: (memory: HomeCloudMemoryListItem) => void;
  onLongPressMemory: (contentId: string) => void;
}) {
  /**
   * A type collection is read with `order: 'timeline'` and keeps the DEFAULT
   * Timeline placement, byte for byte; an Album collection was read with
   * `order: 'album'` and asks for the `album` placement. The grouper never
   * re-sorts either way.
   */
  const groupingMode = state.collectionId?.startsWith('album:') === true ? 'album' : 'timeline';
  const sections = useMemo(
    () => flattenTimelineForSectionList(groupMemoriesForTimeline(state.memories, groupingMode), COLLECTION_COLUMNS),
    [groupingMode, state.memories],
  );

  // TERMINAL: the Album behind this collection no longer exists. There is nothing
  // to retry and nothing to empty out.
  if (state.missing) {
    return (
      <View style={styles.screen} accessibilityViewIsModal>
        <Header title={title} onBack={onBack} />
        <View style={styles.center}>
          <AppText variant="title3" weight="800" align="center">
            {'Este álbum ya no está disponible'}
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            {'Puede que otro miembro lo haya eliminado. Los recuerdos no cambian.'}
          </AppText>
          <AppButton title="Volver a los recuerdos" variant="secondary" onPress={onBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen} accessibilityViewIsModal>
      <Header title={title} onBack={onBack} />
      {state.loading && state.memories.length === 0 ? (
        <View style={styles.body}>
          <Skeleton variant="card" height={128} />
          <Skeleton variant="card" height={128} />
          <Skeleton variant="card" height={128} />
        </View>
      ) : state.error !== null && state.memories.length === 0 ? (
        <View style={styles.center}>
          <ErrorState
            title="No pudimos cargar esta colección"
            description={state.error}
            retryLabel="Reintentar"
            onRetry={onRefresh}
          />
        </View>
      ) : state.memories.length === 0 ? (
        /* An EMPTY collection is honestly distinct from "cargando": no skeleton,
           no retry, just the truth. */
        <View style={styles.center}>
          <HomePlusIcon name="albums-outline" size={36} color={colors.text.tertiary} />
          <AppText variant="body" tone="secondary" align="center">
            {'Esta colección todavía no tiene recuerdos.'}
          </AppText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} />
          }
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
                <MemorySelectableCard
                  key={memory.id}
                  memory={memory}
                  accessToken={accessToken}
                  selecting={selecting}
                  selected={false}
                  unselectable={false}
                  onToggle={selecting ? onToggle : noop}
                  onOpen={onOpenMemory}
                  onLongPress={onLongPressMemory}
                  onDragArm={noop}
                  onDragMove={noop}
                  onDragEnd={noop}
                />
              ))}
              {Array.from({ length: COLLECTION_COLUMNS - item.items.length }).map((_, index) => (
                <View key={`spacer-${index}`} style={styles.rowSpacer} />
              ))}
            </View>
          )}
          ListFooterComponent={
            state.nextOffset !== null || state.pageError !== null ? (
              <View style={styles.footer}>
                {state.pageError !== null ? (
                  <View style={styles.pageError}>
                    <AppText variant="caption" tone="danger" align="center">
                      {state.pageError}
                    </AppText>
                    <AppButton
                      title="Reintentar"
                      size="sm"
                      variant="secondary"
                      onPress={onLoadMore}
                      accessibilityLabel="Reintentar cargar más recuerdos de la colección"
                    />
                  </View>
                ) : null}
                {state.nextOffset !== null ? (
                  <AppButton
                    title={state.loadingMore ? 'Cargando…' : 'Mostrar más recuerdos'}
                    variant="secondary"
                    disabled={state.loadingMore}
                    onPress={onLoadMore}
                  />
                ) : null}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <AppButton variant="icon" size="sm" onPress={onBack} accessibilityLabel="Volver a los recuerdos">
        <HomePlusIcon name="arrow-back" size={21} color={colors.text.primary} />
      </AppButton>
      <AppText variant="title3" weight="800" style={styles.headerTitle} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  headerTitle: { flex: 1 },
  /** Balances the back control so the title stays optically centred. */
  headerSpacer: { width: 36 },
  body: { paddingHorizontal: spacing[5], gap: spacing[3] },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  sectionHeader: { paddingTop: spacing[3], paddingBottom: spacing[2], gap: 2 },
  row: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  rowSpacer: { flex: 1 },
  footer: { paddingVertical: spacing[4], alignItems: 'center', gap: spacing[3] },
  pageError: { alignItems: 'center', gap: spacing[2] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
});