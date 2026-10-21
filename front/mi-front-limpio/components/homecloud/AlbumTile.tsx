import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { colors, MOTION, radius, spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { HomePlusIcon } from '../../constants/icons';
import { albumItemCountLabel } from '../../services/homecloud/homecloudAlbumScope';
import type { HomeCloudAlbum } from '../../services/homecloud/homecloudTypes';
import { AppText } from '../ui/AppText';
import { AppButton } from '../ui/AppButton';
import { Skeleton } from '../ui/Skeleton';
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
 * Stable fallback for "this Album genuinely has no cover to show".
 *
 * `unavailable`, `error` and a null `coverContentId` all resolve to this SAME
 * visual on purpose: an honest gap should look like a gap, not flicker through
 * several invented states. What it must NOT be is the loading state — that was
 * BUG B's second face, and it is what made a resolving cover indistinguishable
 * from a permanently blank tile.
 */
function AlbumCoverFallback({ label }: { label: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.cover, styles.fallbackVisual]}
    >
      <HomePlusIcon name="albums" size={30} color={colors.text.tertiary} />
    </View>
  );
}

function AlbumCoverError({ label }: { label: string }) {
  return (
    <View accessibilityRole="image" accessibilityLabel={`${label}. No se pudo cargar`} style={[styles.cover, styles.errorVisual]}>
      <HomePlusIcon name="warning-outline" size={24} color={colors.danger.base} />
      <AppText variant="micro" tone="danger" align="center">No se pudo cargar</AppText>
    </View>
  );
}

/**
 * HC2-C §23.7 / C3 — A DISTINGUISHABLE COVER LOADING STATE.
 *
 * While the preview is genuinely in flight the tile shows a quiet shimmer block,
 * which is what "we are still working on this" looks like everywhere else in the
 * app. It is announced as a loading image, so a screen reader is told the
 * difference between "arriving" and "there is nothing here".
 *
 * The moment the answer is `unavailable`, or the image itself errors, the
 * fallback replaces it — and STAYS replaced. There is no path back to a
 * skeleton-looking tile, which is the specific defect that was reported.
 */
function AlbumCoverLoading({ label }: { label: string }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${label}. Cargando`}
      accessibilityState={{ busy: true }}
      style={[styles.cover, styles.loadingVisual]}
    >
      <Skeleton variant="card" style={styles.loadingBlock} />
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
  const reducedMotion = useReducedMotion();
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setImageFailed(false);
    imageOpacity.setValue(0);
  }, [contentId, imageOpacity]);

  if (preview.phase === 'ready') {
    if (imageFailed) return <AlbumCoverError label={label} />;
    return (
      <Animated.Image
        source={{ uri: preview.url }}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
        onLoad={() => Animated.timing(imageOpacity, { toValue: 1, duration: reducedMotion ? 0 : MOTION.fast, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()}
        accessibilityRole="image"
        accessibilityLabel={label}
        style={[styles.cover, { opacity: imageOpacity }]}
      />
    );
  }

  // `idle` and `loading` are the only phases that mean "still resolving". An
  // `error` is not loading: it is a failure that already has its honest answer.
  if (preview.phase === 'idle' || preview.phase === 'loading') {
    return <AlbumCoverLoading label={label} />;
  }
  return preview.phase === 'error' ? <AlbumCoverError label={label} /> : <AlbumCoverFallback label={label} />;
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
  onMore: (event?: GestureResponderEvent) => void;
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
          <HomePlusIcon name="ellipsis-horizontal" size={19} color="#FFFFFF" />
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
    /**
     * HC-POL-008 — `AppButton` brings its own `paddingVertical` /
     * `paddingHorizontal` on the axis keys, and a lone `padding: 0` does not
     * deterministically beat them on device: the cover stayed inset inside the
     * square with the card surface showing around it. Declaring the SAME axis
     * keys the base style uses overwrites them where the outcome is defined.
     */
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  /**
   * The button owns the square geometry. Every cover state is its child, so it
   * must fill that already-measured box instead of relying on image intrinsic
   * dimensions. Reusing `visual` here made a ready image render at its own
   * tiny measured size in the centre of an otherwise correct tile.
   */
  cover: {
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    borderRadius: radius.lg,
  },
  fallbackVisual: {
    backgroundColor: colors.background.alt,
  },
  errorVisual: { backgroundColor: colors.danger.soft, gap: spacing[1], paddingHorizontal: spacing[2] },
  /**
   * HC2-C: the cover's LOADING surface. It is deliberately a hair different from
   * `fallbackVisual` (transparent over the card) so a resolving cover never
   * renders as the same flat grey block as an Album that has no cover at all.
   */
  loadingVisual: {
    backgroundColor: 'transparent',
  },
  /** Fills the tile: `Skeleton` needs a real box, the parent is `aspectRatio`. */
  loadingBlock: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
    borderWidth: 0,
  },
  more: {
    position: 'absolute',
    right: spacing[1],
    top: spacing[1],
    zIndex: 2,
    minWidth: 44,
    minHeight: 44,
    backgroundColor: 'rgba(20,18,16,0.72)',
    borderColor: 'rgba(255,255,255,0.72)',
  },
});
