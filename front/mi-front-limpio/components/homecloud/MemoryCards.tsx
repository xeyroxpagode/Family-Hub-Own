import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import {
  memoryPrimaryText,
  memorySemanticLabel,
} from '../../services/homecloud/homecloudMemoriesTimeline';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { useMemoryPreviewUrl } from './useMemoryPreviewUrl';

/**
 * HomeCloud STAGE 4B.2 — Memory cards (one honest representation per kind).
 *
 * Authority: Stage 4B.1 read DTO + Figma composition (3-column grid, neutral
 * visual surfaces, per-kind identity).
 *
 * - image:   real thumbnail via ephemeral signed preview (variant=preview).
 *            Expired / failed / unavailable previews fall back to a neutral
 *            visual. Never the original, never a fabricated image.
 * - video:   NO poster is fabricated (backend has no video decoder). Neutral
 *            surface + play affordance + honest caption/date metadata. A
 *            future hasPreview=true video reuses the same generic contract.
 * - audio:   NO waveform is fabricated. Neutral surface + audio icon +
 *            caption/date. No playback in this slice.
 * - written: writtenText IS the content (visually truncated, canonically
 *            intact) + semantic date. Never a displayName, never a file.
 *
 * IDENTITY: the media IS the content and the caption is the only text that
 * belongs on the tile. The original filename (displayName) is technical
 * metadata and is never rendered here; a media Memory without caption falls
 * back to its honest semantic date ("12 ene 2024" / "Sin fecha").
 *
 * IDEMPOTENCE: cards are NON-INTERACTIVE by default. There is no productive
 * Viewer V2 destination yet, so a card never navigates, never opens a modal and
 * never pretends to be tappable.
 *
 * MO-A2 — THE ONE OPTIONAL ALBUM-SCOPE ACTION SEAM
 * ------------------------------------------------
 * `albumScopeAction` is the ONLY interaction a card can receive, and it exists
 * for exactly one situation: the card is rendered inside an Album detail and the
 * member may organize. It removes THIS Memory from THIS Album — a membership,
 * not the Memory. It is NEVER a Viewer destination, and it is never attached in
 * the Timeline, so Timeline rendering and behavior are unchanged when the prop is
 * absent (which is the Timeline case).
 */
export type MemoryAlbumScopeAction = {
  readonly onRemoveFromAlbum: () => void;
  /** Only THIS card's affordance is disabled while its mutation is in flight. */
  readonly removing: boolean;
};

export function MemoryCard({
  memory,
  accessToken,
  albumScopeAction,
}: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  albumScopeAction?: MemoryAlbumScopeAction;
}) {
  switch (memory.kind) {
    case 'image':
      return <MemoryImageTile memory={memory} accessToken={accessToken} albumScopeAction={albumScopeAction} />;
    case 'video':
      return <MemoryVideoTile memory={memory} albumScopeAction={albumScopeAction} />;
    case 'audio':
      return <MemoryAudioTile memory={memory} albumScopeAction={albumScopeAction} />;
    case 'written':
      return <MemoryWrittenTile memory={memory} albumScopeAction={albumScopeAction} />;
  }
}

/**
 * The Album-scope affordance, or nothing at all.
 *
 * Rendered only when the caller supplies the action, so the Timeline keeps
 * exactly the tree it had before MO-A2.
 */
function AlbumScopeRemove({
  action,
  label,
}: {
  action: MemoryAlbumScopeAction | undefined;
  label: string;
}) {
  if (!action) return null;
  return (
    <View style={styles.albumScope}>
      <AppButton
        variant="icon"
        size="sm"
        loading={action.removing}
        disabled={action.removing}
        onPress={action.onRemoveFromAlbum}
        accessibilityLabel={`Quitar del álbum ${label}`}
      >
        <HomePlusIcon name="close" size={16} color={colors.text.secondary} />
      </AppButton>
    </View>
  );
}

function TileCaption({ memory }: { memory: HomeCloudMemoryListItem }) {
  const primary = memoryPrimaryText(memory);
  const label = memorySemanticLabel(memory);
  if (primary.length > 0) {
    return (
      <AppText variant="bodySmall" weight="500" numberOfLines={1}>
        {primary}
      </AppText>
    );
  }
  return (
    <AppText variant="caption" tone="secondary" numberOfLines={1}>
      {label}
    </AppText>
  );
}

function tileAccessibilityLabel(memory: HomeCloudMemoryListItem, kindLabel: string): string {
  const primary = memoryPrimaryText(memory);
  const label = memorySemanticLabel(memory);
  const text = primary.length > 0 ? `${primary}. ${label}` : label;
  return `${kindLabel}: ${text}`;
}

function NeutralVisual({
  icon,
  label,
  backgroundColor,
  iconColor,
}: {
  icon: React.ComponentProps<typeof HomePlusIcon>['name'];
  label: string;
  backgroundColor: string;
  iconColor: string;
}) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.visual, { backgroundColor }]}
    >
      <HomePlusIcon name={icon} size={30} color={iconColor} />
    </View>
  );
}

function MemoryImageTile({
  memory,
  accessToken,
  albumScopeAction,
}: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
  albumScopeAction?: MemoryAlbumScopeAction;
}) {
  const label = tileAccessibilityLabel(memory, 'Foto');
  const preview = useMemoryPreviewUrl(accessToken, memory.id, memory.hasPreview);
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => {
    setImageFailed(false);
  }, [memory.id]);

  const showImage = preview.phase === 'ready' && !imageFailed;
  return (
    <View style={styles.tile}>
      {showImage ? (
        <Image
          source={{ uri: preview.phase === 'ready' ? preview.url : '' }}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessibilityRole="image"
          accessibilityLabel={label}
          style={styles.visual}
        />
      ) : (
        <NeutralVisual
          icon="image-outline"
          label={label}
          backgroundColor={colors.background.alt}
          iconColor={colors.text.tertiary}
        />
      )}
      <TileCaption memory={memory} />
      <AlbumScopeRemove action={albumScopeAction} label={label} />
    </View>
  );
}

function MemoryVideoTile({
  memory,
  albumScopeAction,
}: {
  memory: HomeCloudMemoryListItem;
  albumScopeAction?: MemoryAlbumScopeAction;
}) {
  const label = tileAccessibilityLabel(memory, 'Video');
  return (
    <View style={styles.tile}>
      <View style={[styles.visual, styles.videoVisual]}>
        <View accessibilityRole="image" accessibilityLabel={label} style={styles.videoIcon}>
          <HomePlusIcon name="videocam" size={30} color={colors.text.tertiary} />
        </View>
        <View style={styles.playBadge}>
          <HomePlusIcon name="play" size={12} color={colors.text.inverse} />
        </View>
      </View>
      <TileCaption memory={memory} />
      <AlbumScopeRemove action={albumScopeAction} label={label} />
    </View>
  );
}

function MemoryAudioTile({
  memory,
  albumScopeAction,
}: {
  memory: HomeCloudMemoryListItem;
  albumScopeAction?: MemoryAlbumScopeAction;
}) {
  const label = tileAccessibilityLabel(memory, 'Audio');
  return (
    <View style={styles.tile}>
      <NeutralVisual
        icon="musical-notes"
        label={label}
        backgroundColor={colors.brandSoft}
        iconColor={colors.brand}
      />
      <TileCaption memory={memory} />
      <AlbumScopeRemove action={albumScopeAction} label={label} />
    </View>
  );
}

function MemoryWrittenTile({
  memory,
  albumScopeAction,
}: {
  memory: HomeCloudMemoryListItem;
  albumScopeAction?: MemoryAlbumScopeAction;
}) {
  const text = memoryPrimaryText(memory);
  const label = memorySemanticLabel(memory);
  return (
    <View style={styles.tile}>
      <View style={[styles.visual, styles.writtenVisual]}>
        {text.length > 0 ? (
          <AppText variant="bodySmall" tone="secondary" numberOfLines={5} style={styles.writtenText}>
            {text}
          </AppText>
        ) : (
          <HomePlusIcon name="document-text-outline" size={30} color={colors.text.tertiary} />
        )}
      </View>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <AlbumScopeRemove action={albumScopeAction} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: spacing[1],
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
  },
  videoVisual: {
    backgroundColor: colors.background.alt,
  },
  videoIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    right: spacing[1],
    bottom: spacing[1],
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(26,24,22,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  writtenVisual: {
    backgroundColor: colors.surface.card,
    padding: spacing[2],
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  writtenText: {
    lineHeight: 17,
  },
  albumScope: {
    position: 'absolute',
    right: spacing[1],
    top: spacing[1],
    zIndex: 2,
    backgroundColor: colors.surface.card,
  },
});
