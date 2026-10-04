import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { albumItemCountLabel } from '../../services/homecloud/homecloudAlbumScope';
import type { HomeCloudAlbum } from '../../services/homecloud/homecloudTypes';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { AlbumCover } from './AlbumTile';

/**
 * HomeCloud MO-A3 — a COLLECTION tile of the Collections root.
 *
 * The visual grammar is the EXISTING HomeCloud tile grammar (`AlbumTile`):
 * square visual surface, existing radius/border/surface tokens, a bounded name
 * and a secondary line underneath.
 *
 * TWO KINDS, AND THE COUNT RULE IS A CONTRACT
 * -------------------------------------------
 *  - a TYPE collection (Fotos / Videos / Audios / Notas) carries NO count. This
 *    is not an omission: `listMemories` answers a kind-filtered PAGE and never an
 *    exact total, so any number here would be either the length of the loaded
 *    page or an invented approximation. Neither is a truth, so none is shown and
 *    no backend work is added to fabricate one.
 *  - an ALBUM keeps its EXACT `itemCount`, because that aggregate really does
 *    exist on the read model and is already rendered by `AlbumTile`.
 */

/** The existing HomePlus/Ionicon vocabulary, so a collection reads as its kind. */
const TYPE_COLLECTION_ICON: Readonly<Record<string, HomePlusIconName>> = {
  image: 'image-outline',
  video: 'videocam',
  audio: 'musical-notes',
  written: 'document-text-outline',
};

export function memoryCollectionIconName(memoryKind: string): HomePlusIconName {
  return TYPE_COLLECTION_ICON[memoryKind] ?? 'albums-outline';
}

export function MemoryCollectionTile({
  title,
  memoryKind,
  onPress,
}: {
  title: string;
  memoryKind: string;
  onPress: () => void;
}) {
  const icon = memoryCollectionIconName(memoryKind);
  return (
    <View style={styles.tile}>
      <AppButton
        variant="secondary"
        onPress={onPress}
        style={styles.visual}
        accessibilityLabel={`Abrir la colección ${title}`}
      >
        <HomePlusIcon name={icon} size={28} color={colors.text.tertiary} />
      </AppButton>
      <AppText variant="bodySmall" weight="700" numberOfLines={2}>
        {title}
      </AppText>
    </View>
  );
}

/** An Album entry of the Collections root, with its EXACT server aggregate. */
export function MemoryCollectionAlbumTile({
  album,
  accessToken,
  canOrganize,
  onPress,
  onMore,
}: {
  album: HomeCloudAlbum;
  accessToken: string | null;
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
    flex: 1,
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
  more: {
    position: 'absolute',
    right: spacing[1],
    top: spacing[1],
    zIndex: 2,
    backgroundColor: colors.surface.card,
  },
});