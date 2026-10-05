import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { ALBUMS_EMPTY_BODY, ALBUMS_EMPTY_TITLE, ALBUMS_RAIL_TITLE } from '../../services/homecloud/homecloudAlbumScope';
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
  onRetry: () => void;
}) {
  const phase = solveAlbumsRailPhase(state);

  // A read that has failed with nothing on screen is an ERROR state, never an
  // empty household.
  if (phase === 'error') {
    return (
      <View style={styles.container}>
        <Header canOrganize={canOrganize} onCreateAlbum={onCreateAlbum} />
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
        <Header canOrganize={canOrganize} onCreateAlbum={onCreateAlbum} />
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
        <Header canOrganize={canOrganize} onCreateAlbum={onCreateAlbum} />
        <View style={styles.empty}>
          <HomePlusIcon name="albums-outline" size={30} color={colors.text.tertiary} />
          <AppText variant="bodySmall" weight="700">
            {ALBUMS_EMPTY_TITLE}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {ALBUMS_EMPTY_BODY}
          </AppText>
          {canOrganize ? <AppButton title="Crear álbum" size="sm" variant="secondary" onPress={onCreateAlbum} /> : null}
        </View>
      </View>
    );
  }

  // `ready-data` and `refreshing` render the SAME tiles on purpose: a re-read
  // preserves the already-valid Albums, so a refresh is never a skeleton flash.
  return (
    <View style={styles.container}>
      <Header canOrganize={canOrganize} onCreateAlbum={onCreateAlbum} />
      {state.error !== null ? (
        <AppText variant="caption" tone="danger">
          {state.error}
        </AppText>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
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
      </ScrollView>
    </View>
  );
}

function Header({ canOrganize, onCreateAlbum }: { canOrganize: boolean; onCreateAlbum: () => void }) {
  return (
    <View style={styles.header}>
      <AppText variant="bodySmall" weight="800" style={styles.headerTitle}>
        {ALBUMS_RAIL_TITLE}
      </AppText>
      {canOrganize ? (
        <AppButton
          variant="icon"
          size="sm"
          onPress={onCreateAlbum}
          accessibilityLabel="Nuevo álbum"
        >
          <HomePlusIcon name="add" size={22} color={colors.brand} />
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[3], paddingBottom: spacing[2] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerTitle: { flex: 1 },
  rail: { gap: spacing[3], paddingRight: spacing[4] },
  skeletonTile: { width: 132, height: 124, borderRadius: radius.lg },
  empty: { gap: spacing[2], alignItems: 'flex-start' },
  error: { marginTop: spacing[2] },
});
