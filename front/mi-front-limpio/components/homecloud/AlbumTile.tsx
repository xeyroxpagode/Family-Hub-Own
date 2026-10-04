import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import { albumItemCountLabel } from '../../services/homecloud/homecloudAlbumScope';
import type { HomeCloudAlbum } from '../../services/homecloud/homecloudTypes';
import { AppText } from '../ui/AppText';
import { AppButton } from '../ui/AppButton';
import { useMemoryPreviewUrl } from './useMemoryPreviewUrl';

/**
 * HomeCloud MO-A2 — Album tile.
 *
 * Visual grammar is the EXISTING HomeCloud tile grammar (Files `FolderTile` /
 * `FileTile`): square visual surface, existing radius/border/surface tokens, a
 * name bounded to two lines and a secondary line underneath.
 *
 * Two hard rules live in this file:
 *
 * 1. `itemCount` is rendered VERBATIM. It is the exact server aggregate of
 *    active Memories. The tile never counts loaded Memories: a page length is a
 *    different, wrong number.
 * 2. The cover is a CONTENT ID, not a URL. `coverContentId` is resolved through
 *    the existing ephemeral preview path and nothing else — no second probe, no
 *    fabricated poster, no original download, no backend cover lookup.
 */

/**
 * Stable fallback for every "there is no cover image" phase.
 *
 * The fallback is deliberately the SAME visual for `unavailable`, `error` and a
 * null cover, so an honest gap always looks the same instead of flickering
 * through different invented states.
 */
function AlbumCoverFallback({ label }: { label: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.visual, styles.fallbackVisual]}
    >
      <HomePlusIcon name="albums" size={30} color={colors.text.tertiary} />
    </View>
  );
}

/**
 * The hook is mounted ONLY for a real content id.
 *
 * Splitting it out is what makes "never mount `useMemoryPreviewUrl` with an
 * invalid id" a structural property of this file instead of a condition that
 * could be forgotten.
 */
function AlbumCoverImage({
  accessToken,
  contentId,
  label,
}: {
  accessToken: string | null;
  contentId: string;
  label: string;
}) {
  // EXACTLY ONE preview attempt for this cover. A video cover legitimately has
  // no preview yet, so `preview_unavailable` is an expected answer and the
  // stable fallback is the honest result — never a second probe and never an
  // invented poster.
  const preview = useMemoryPreviewUrl(accessToken, contentId, true);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [contentId]);

  if (preview.phase !== 'ready' || imageFailed) {
    return <AlbumCoverFallback label={label} />;
  }

  return (
    <Image
      source={{ uri: preview.url }}
      resizeMode="cover"
      onError={() => setImageFailed(true)}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={styles.visual}
    />
  );
}

export function AlbumCover({
  album,
  accessToken,
}: {
  album: HomeCloudAlbum;
  accessToken: string | null;
}) {
  const label = `Portada del álbum ${album.name}`;
  if (album.coverContentId === null) {
    return <AlbumCoverFallback label={label} />;
  }
  return <AlbumCoverImage accessToken={accessToken} contentId={album.coverContentId} label={label} />;
}

export function AlbumTile({
  album,
  accessToken,
  canOrganize,
  onPress,
  onMore,
}: {
  album: HomeCloudAlbum;
  accessToken: string | null;
  /** Organize is the ONLY capability that unlocks Album actions. */
  canOrganize: boolean;
  onPress: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.tile}>
      {canOrganize ? (
        <AppButton
          variant="icon"
          size="sm"
          onPress={onMore}
          style={styles.more}
          accessibilityLabel={`Acciones del álbum ${album.name}`}
        >
          <HomePlusIcon name="ellipsis-horizontal" size={19} color={colors.text.secondary} />
        </AppButton>
      ) : null}
      <AppButton
        variant="secondary"
        onPress={onPress}
        style={styles.visual}
        accessibilityLabel={`Abrir el álbum ${album.name}`}
      >
        <AlbumCover album={album} accessToken={accessToken} />
      </AppButton>
      <AppText variant="bodySmall" weight="700" numberOfLines={2}>
        {album.name}
      </AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {albumItemCountLabel(album.itemCount)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 132,
    gap: spacing[1],
    position: 'relative',
  },
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
  fallbackVisual: {
    backgroundColor: colors.background.alt,
  },
  more: {
    position: 'absolute',
    right: spacing[1],
    top: spacing[1],
    zIndex: 2,
    backgroundColor: colors.surface.card,
  },
});