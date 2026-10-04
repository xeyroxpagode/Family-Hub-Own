import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { ALBUMS_EMPTY_BODY, ALBUMS_EMPTY_TITLE, ALBUMS_RAIL_TITLE } from '../../services/homecloud/homecloudAlbumScope';
import type { HomeCloudAlbum } from '../../services/homecloud/homecloudTypes';
import { AppButton, AppText, ErrorState, Skeleton } from '../ui';
import { AlbumTile } from './AlbumTile';

/**
 * HomeCloud MO-A2 — Albums rail.
 *
 * Albums live INSIDE Memories: this rail is the `ListHeaderComponent` of the
 * Memories SectionList, never a third HomeCloud tab and never a synthetic
 * Timeline section. The Timeline grouping architecture is untouched, so the rail
 * can only appear above it, never inside it.
 *
 * States, all honest:
 *  - loading        -> the existing Skeleton card grammar
 *  - read failure   -> ErrorState + retry (an access problem is never "no Albums")
 *  - 0 Albums       -> a small, actionable area when organize is granted;
 *                      nothing at all when it is not (no mutation advertised,
 *                      and no permission denial dressed as an empty household)
 *  - N Albums       -> a horizontal rail of Album tiles
 *
 * The component is pure presentation: every read decision belongs to the Albums
 * rail controller and every mutation to the Memories subtree.
 */
export function AlbumsRail({
  albums,
  loading,
  error,
  canOrganize,
  accessToken,
  onOpenAlbum,
  onAlbumActions,
  onCreateAlbum,
  onRetry,
}: {
  albums: readonly HomeCloudAlbum[];
  loading: boolean;
  error: string | null;
  /** `homecloud.organize`. The ONLY capability that unlocks Album actions. */
  canOrganize: boolean;
  accessToken: string | null;
  onOpenAlbum: (album: HomeCloudAlbum) => void;
  onAlbumActions: (album: HomeCloudAlbum) => void;
  onCreateAlbum: () => void;
  onRetry: () => void;
}) {
  // A read that has failed with nothing on screen is an ERROR state, never an
  // empty household.
  if (error !== null && albums.length === 0) {
    return (
      <View style={styles.container}>
        <Header canOrganize={canOrganize} onCreateAlbum={onCreateAlbum} />
        <ErrorState
          title="No pudimos cargar tus álbumes"
          description={error}
          retryLabel="Reintentar"
          onRetry={onRetry}
          style={styles.error}
        />
      </View>
    );
  }

  if (loading) {
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

  if (albums.length === 0) {
    // Without organize there is no action to offer, so an Albums area would be
    // a dead end. It stays hidden rather than pretending this home has no
    // Albums: the server already answered, this member simply may not organize.
    if (!canOrganize) return null;
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
          <AppButton title="Nuevo álbum" size="sm" variant="secondary" onPress={onCreateAlbum} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header canOrganize={canOrganize} onCreateAlbum={onCreateAlbum} />
      {error !== null ? (
        <AppText variant="caption" tone="danger">
          {error}
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