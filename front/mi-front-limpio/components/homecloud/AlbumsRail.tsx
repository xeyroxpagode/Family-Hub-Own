import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { ALBUMS_EMPTY_BODY, ALBUMS_RAIL_TITLE } from '../../services/homecloud/homecloudAlbumScope';
import { solveAlbumsRailPhase, type AlbumsRailState } from '../../services/homecloud/homecloudAlbumsPagination';
import type { HomeCloudAlbum } from '../../services/homecloud/homecloudTypes';
import { AppButton, AppText, ErrorState, Skeleton } from '../ui';
import { AlbumTile } from './AlbumTile';

/**
 * HomeCloud MO-A2 — Albums rail. HC2-C: the five honest states of §23.
 *
 * Albums live INSIDE Memories: this rail is part of the `ListHeaderComponent` of
 * the Memories SectionList, never a third HomeCloud tab and never a synthetic
 * Timeline section. The Timeline grouping architecture is untouched, so the rail
 * can only appear above it, never inside it.
 *
 * The state is RESOLVED, not re-derived here. `solveAlbumsRailPhase` is the single
 * decision, and it is what makes the reported defect impossible to reintroduce by
 * hand: the whole BUG B report was one `loading` boolean standing in for four
 * different situations, so a failed read could be rendered as a permanent pair of
 * grey blocks.
 *
 *   loading     -> a skeleton, and ONLY while a real first answer is pending
 *   error       -> ErrorState + retry, never an empty household in disguise
 *   ready-empty -> honest explanation + creation CTA (organize only)
 *   ready-data  -> the horizontal rail of Album tiles
 *   refreshing  -> the SAME tiles, kept on screen, no skeleton
 *
 * The component is pure presentation: every read decision belongs to the Albums
 * rail controller and every mutation to the Memories subtree.
 */
export function AlbumsRail({
  albums,
  state,
  canOrganize,
  accessToken,
  onOpenAlbum,
  onAlbumActions,
  onCreateAlbum,
  onOpenFavorites,
  onRetry,
}: {
  albums: readonly HomeCloudAlbum[];
  /** HC2-C: the controller's own state, so the phase is resolved in ONE place. */
  state: AlbumsRailState;
  /** `homecloud.organize`. The ONLY capability that unlocks Album actions. */
  canOrganize: boolean;
  accessToken: string | null;
  onOpenAlbum: (album: HomeCloudAlbum) => void;
  onAlbumActions: (album: HomeCloudAlbum) => void;
  onCreateAlbum: () => void;
  onOpenFavorites: () => void;
  onRetry: () => void;
}) {
  const phase = solveAlbumsRailPhase(state);

  // A read that has failed with nothing on screen is an ERROR state, never an
  // empty household.
  if (phase === 'error') {
    return (
      <View style={styles.container}>
        <Header />
        <ErrorState
          title="No pudimos cargar tus álbumes"
          description={state.error ?? ''}
          retryLabel="Reintentar"
          onRetry={onRetry}
          style={styles.error}
        />
      </View>
    );
  }

  // The skeleton appears ONLY here, and `solveAlbumsRailPhase` can only answer
  // `loading` while there is genuinely no answer yet.
  if (phase === 'loading') {
    return (
      <View style={styles.container}>
        <Header />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          <Skeleton variant="card" height={124} style={styles.skeletonTile} />
          <Skeleton variant="card" height={124} style={styles.skeletonTile} />
        </ScrollView>
      </View>
    );
  }

  if (phase === 'ready-empty') {
    return (
      <View style={styles.container}>
        <Header />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          <FavoritesTile onPress={onOpenFavorites} />
          {canOrganize ? <CreateAlbumTile onPress={onCreateAlbum} /> : null}
        </ScrollView>
        <AppText variant="caption" tone="secondary">{ALBUMS_EMPTY_BODY}</AppText>
      </View>
    );
  }

  // `ready-data` and `refreshing` render the SAME tiles on purpose: a re-read
  // preserves the already-valid Albums, so a refresh is never a skeleton flash.
  return (
    <View style={styles.container}>
      <Header />
      {state.error !== null ? (
        <AppText variant="caption" tone="danger">
          {state.error}
        </AppText>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        <FavoritesTile onPress={onOpenFavorites} />
        {albums.map((album) => (
          <AlbumTile
            key={album.id}
            album={album}
            accessToken={accessToken}
            canOrganize={canOrganize}
            onPress={() => onOpenAlbum(album)}
            onMore={() => onAlbumActions(album)}
          />
        ))}
        {canOrganize ? <CreateAlbumTile onPress={onCreateAlbum} /> : null}
      </ScrollView>
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <AppText variant="bodySmall" weight="800" style={styles.headerTitle}>
        {ALBUMS_RAIL_TITLE}
      </AppText>
    </View>
  );
}

function FavoritesTile({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.tile}>
      <AppButton variant="secondary" onPress={onPress} style={styles.visual} accessibilityLabel="Abrir Favoritos">
        <HomePlusIcon name="star" size={32} color={colors.warning.base} />
      </AppButton>
      <AppText variant="bodySmall" weight="700" numberOfLines={2}>Favoritos</AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>Colección</AppText>
    </View>
  );
}

function CreateAlbumTile({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.tile}>
      <AppButton variant="secondary" onPress={onPress} style={[styles.visual, styles.createVisual]} accessibilityLabel="Nuevo álbum">
        <HomePlusIcon name="add" size={34} color={colors.brand} />
      </AppButton>
      <AppText variant="bodySmall" weight="700" numberOfLines={2}>Nuevo álbum</AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>Crear</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3], paddingBottom: spacing[2] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerTitle: { flex: 1 },
  rail: { gap: spacing[3], paddingRight: spacing[4] },
  tile: { width: 132, gap: spacing[1], position: 'relative' },
  visual: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 0,
  },
  createVisual: {
    borderStyle: 'dashed',
    backgroundColor: colors.background.alt,
  },
  skeletonTile: { width: 132, height: 124, borderRadius: radius.lg },
  error: { marginTop: spacing[2] },
});
