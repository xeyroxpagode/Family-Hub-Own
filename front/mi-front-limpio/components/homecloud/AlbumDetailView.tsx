import React, { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  ALBUM_EMPTY_TITLE,
  ALBUM_MISSING_BACK_LABEL,
  ALBUM_MISSING_TITLE,
} from '../../services/homecloud/homecloudAlbumScope';
import type { AlbumDetailState } from '../../services/homecloud/homecloudAlbumDetailPagination';
import {
  flattenTimelineForSectionList,
  groupMemoriesForTimeline,
} from '../../services/homecloud/homecloudMemoriesTimeline';
import type { HomeCloudAlbum, HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import { AppButton, AppText, ErrorState, Skeleton } from '../ui';
import { MemorySelectableCard } from './MemorySelectableCard';

/**
 * HomeCloud MO-A2 — Album detail.
 *
 * NESTED STATE, NOT A ROUTE. This component is rendered by the Memories subtree
 * while the global Timeline stays mounted underneath it, so Back restores the
 * Timeline with its loaded pages and its grouped dataset intact. No navigation
 * route, no router, no new screen and no `navigation/types.ts` change.
 *
 * The read is the EXISTING Memories read model in its Album presentation mode
 * (`albumId` + `order: 'album'`, oldest -> newest). This view never sorts: the
 * server order IS the Album order. It only asks the grouper for the matching
 * PLACEMENT (`album` mode), which is what makes an unknown date lead the Album and
 * a year-only Memory lead its year instead of contradicting the order the server
 * actually sent.
 *
 * MO-A3 — TWO PRODUCTIVE ACTIONS, ONE SESSION
 * -------------------------------------------
 *  - `onAddMemories` (the `...` sheet and the empty-Album CTA) opens the SELECTION
 *    SURFACE, not a modal picker: the retired AlbumMemoryPicker flow is gone.
 *  - `onLongPressMemory` enters the SAME selection session with
 *    `removeFromAlbum(currentAlbumId)`, which is how 1..N memberships are removed.
 *
 * `MemoryCard` is still reused exactly as the Timeline reuses it, through the
 * MO-A3 interaction wrapper. The ONE remaining contextual action is the per-tile
 * `Quitar del álbum`, it stays organize-only, and while the Selection Mode is
 * active it is NOT rendered: a competing tap target under a drag is a bug, not a
 * feature.
 */

const ALBUM_COLUMNS = 3;

/** Stable no-op seams: the detail never owns a selection interaction itself. */
const noop = (..._args: unknown[]) => {};

export function AlbumDetailView({
  album,
  state,
  accessToken,
  canOrganize,
  selecting,
  onBack,
  onOpenActions,
  onRefresh,
  onLoadMore,
  onAddMemories,
  selectedMemoryIds,
  excludedMemoryIds,
  onToggleMemory,
  onLongPressMemory,
  onOpenMemory,
}: {
  album: HomeCloudAlbum | null;
  state: AlbumDetailState;
  accessToken: string | null;
  canOrganize: boolean;
  /**
   * MO-A3: while the Selection Mode is active the grid offers exactly one
   * interaction per cell, so no per-tile action is rendered.
   */
  selecting: boolean;
  onBack: () => void;
  onOpenActions: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onAddMemories: () => void;
  selectedMemoryIds: ReadonlySet<string>;
  excludedMemoryIds: ReadonlySet<string>;
  onToggleMemory: (contentId: string) => void;
  /** MO-A3 entry D: a long press starts a bulk removal from THIS Album. */
  onLongPressMemory: (contentId: string) => void;
  onOpenMemory: (memory: HomeCloudMemoryListItem) => void;
}) {
  // The Album read used `order: 'album'`, so the grouper is asked for the
  // `album` placement: unknown FIRST, year-only FIRST within its year. The
  // Timeline grouping of the same primitive is untouched.
  const sections = useMemo(
    () => flattenTimelineForSectionList(groupMemoriesForTimeline(state.memories, 'album'), ALBUM_COLUMNS),
    [state.memories],
  );

  // TERMINAL: the Album was deleted (or is not accessible) while it was open.
  // There is nothing to retry and nothing to empty out: the honest state is the
  // way back to Recuerdos.
  if (state.missing) {
    return (
      <View style={styles.screen}>
        <Header
          title={album?.name ?? 'Álbum'}
          onBack={onBack}
          canOrganize={false}
          onOpenActions={onOpenActions}
        />
        <View style={styles.center}>
          <AppText variant="title3" weight="800" align="center">
            {ALBUM_MISSING_TITLE}
          </AppText>
          <AppText variant="body" tone="secondary" align="center">
            {'Puede que otro miembro lo haya eliminado. Los recuerdos no cambian.'}
          </AppText>
          <AppButton title={ALBUM_MISSING_BACK_LABEL} variant="secondary" onPress={onBack} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen} accessibilityViewIsModal>
      <Header
        title={album?.name ?? 'Álbum'}
        onBack={onBack}
        canOrganize={canOrganize}
        onOpenActions={onOpenActions}
      />
      {state.loading ? (
        <View style={styles.body}>
          <Skeleton variant="card" height={128} />
          <Skeleton variant="card" height={128} />
          <Skeleton variant="card" height={128} />
        </View>
      ) : state.error !== null && state.memories.length === 0 ? (
        <View style={styles.center}>
          <ErrorState
            title="No pudimos cargar este álbum"
            description={state.error}
            retryLabel="Reintentar"
            onRetry={onRefresh}
          />
        </View>
      ) : state.memories.length === 0 ? (
        <View style={styles.center}>
          <HomePlusIcon name="albums-outline" size={36} color={colors.text.tertiary} />
          <AppText variant="title3" weight="800" align="center">
            {ALBUM_EMPTY_TITLE}
          </AppText>
          {/* An empty Album is NOT a dead end when organize is granted. Without
              organize there is no action to offer, so none is rendered. */}
          {canOrganize ? (
            <AppButton title="Agregar recuerdos" variant="secondary" onPress={onAddMemories} />
          ) : null}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={selecting ? undefined : <RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} />}
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
                  selected={selectedMemoryIds.has(memory.id)}
                  unselectable={excludedMemoryIds.has(memory.id)}
                  /*
                   * HC2-C BUG D — THERE IS NO PER-TILE REMOVE AFFORDANCE.
                   *
                   * A permanent `X` on every card was destructive chrome the user
                   * could trigger by accident, and it painted a white SQUARE
                   * behind a circular button, leaving visible corners. Removing the
                   * affordance removes both problems at once; fixing the radius
                   * would have kept the destructive chrome.
                   *
                   * Removing a MEMBERSHIP is a contextual action instead: long
                   * press -> selection -> `Quitar del álbum`. That deletes the
                   * Memory↔Album link and nothing else.
                   */
                  onToggle={onToggleMemory}
                  onOpen={onOpenMemory}
                  onLongPress={onLongPressMemory}
                  onDragArm={noop}
                  onDragMove={noop}
                  onDragEnd={noop}
                />
              ))}
              {Array.from({ length: ALBUM_COLUMNS - item.items.length }).map((_, index) => (
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
                      accessibilityLabel="Reintentar cargar más recuerdos del álbum"
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

function Header({
  title,
  onBack,
  canOrganize,
  onOpenActions,
}: {
  title: string;
  onBack: () => void;
  canOrganize: boolean;
  onOpenActions: () => void;
}) {
  return (
    <View style={styles.header}>
      <AppButton variant="icon" size="sm" onPress={onBack} accessibilityLabel="Volver a los recuerdos">
        <HomePlusIcon name="arrow-back" size={21} color={colors.text.primary} />
      </AppButton>
      <AppText variant="title3" weight="800" style={styles.headerTitle} numberOfLines={1}>
        {title}
      </AppText>
      {canOrganize ? (
        <AppButton
          variant="icon"
          size="sm"
          onPress={onOpenActions}
          accessibilityLabel={`Acciones del álbum ${title}`}
        >
          <HomePlusIcon name="ellipsis-horizontal" size={19} color={colors.text.secondary} />
        </AppButton>
      ) : null}
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
  body: { paddingHorizontal: spacing[5], gap: spacing[3] },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
  sectionHeader: { paddingTop: spacing[3], paddingBottom: spacing[2], gap: 2 },
  row: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },
  rowSpacer: { flex: 1 },
  footer: { paddingVertical: spacing[4], alignItems: 'center', gap: spacing[3] },
  pageError: { alignItems: 'center', gap: spacing[2] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8], gap: spacing[3] },
});
