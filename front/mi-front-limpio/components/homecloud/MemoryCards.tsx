import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import type { HomeCloudMemoryListItem } from '../../services/homecloud/homecloudTypes';
import {
  memoryPrimaryText,
  memorySemanticLabel,
} from '../../services/homecloud/homecloudMemoriesTimeline';
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
 /**
 * HC2-C BUG D — NO PERMANENT REMOVE AFFORDANCE ON ANY CARD.
 *
 * `albumScopeAction` / `AlbumScopeRemove` / `MemoryAlbumScopeAction` are gone
 * from this file entirely. A destructive control painted on EVERY card of an
 * Album is chrome the user can trigger by accident, and the wrapper it lived in
 * painted a white SQUARE behind a circular button, so the four corners showed.
 * Removing the affordance removes both problems at once; "fixing the radius"
 * would have kept the destructive chrome and only hidden the artifact.
 *
 * A Memory inside an Album now renders EXACTLY like a Memory anywhere else.
 * Removing a membership is contextual: selection -> `Quitar del álbum`, which
 * deletes the Memory↔Album link and nothing else. The Memory survives, there is
 * no Trash and no binary delete.
 *
 * `MemoryCard` remains what it always was underneath: a non-interactive,
 * non-navigational product renderer with no selection, no Album mutation and no
 * Viewer knowledge.
 */
export function MemoryCard({
  memory,
  accessToken,
}: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
}) {
  switch (memory.kind) {
    case 'image':
      return <MemoryImageTile memory={memory} accessToken={accessToken} />;
    case 'video':
      return <MemoryVideoTile memory={memory} />;
    case 'audio':
      return <MemoryAudioTile memory={memory} />;
    case 'written':
      return <MemoryWrittenTile memory={memory} />;
  }
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
}: {
  memory: HomeCloudMemoryListItem;
  accessToken: string | null;
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
    </View>
  );
}

function MemoryVideoTile({
  memory,
}: {
  memory: HomeCloudMemoryListItem;
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
    </View>
  );
}

function MemoryAudioTile({
  memory,
}: {
  memory: HomeCloudMemoryListItem;
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
    </View>
  );
}

function MemoryWrittenTile({
  memory,
}: {
  memory: HomeCloudMemoryListItem;
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
});
