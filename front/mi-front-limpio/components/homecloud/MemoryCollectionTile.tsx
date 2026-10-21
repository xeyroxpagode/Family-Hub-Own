import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import type { MemoryTypeCollectionRef } from '../../services/homecloud/homecloudMemoryCollectionsPagination';

/**
 * HC2-C C1 — the `Tipos` SECTION of the Memories root.
 *
 * THE ROW THAT MAKES THE AUTOMATIC COLLECTIONS REACHABLE
 * -------------------------------------------------------
 * `Fotos`, `Videos`, `Audios` and `Notas` used to be reachable only through a
 * `Colecciones` screen that itself existed only while a selection was active.
 * There was no route to them in NORMAL mode at all. This row is that route, and
 * it lives in the root header, permanently, in BOTH normal and selection mode.
 *
 * WHY IT IS WRITTEN OUT HERE AND NOT DERIVED
 * ------------------------------------------
 * Because the ORDER and the IDENTITY of the four collections are product, not
 * data: they are always these four, always in this order, always /HomeCloud
 * generated, always filtered by `kind` in Timeline order. Deriving the set from
 * whatever happens to be loaded would make the section's contents depend on a
 * read that may not have happened yet.
 *
 * NO COUNTS, ON PURPOSE
 * ---------------------
 * `listMemories` answers a kind-filtered PAGE and never an exact total, so any
 * number here would be either the length of the loaded page or an invented
 * approximation. Neither is a truth, so none is shown and no backend work is
 * added to fabricate one. The Album aggregate, which really does exist, stays
 * verbatim on `AlbumTile`.
 *
 * NO SKELETON, EVER
 * -----------------
 * These are four fixed tiles, not a read. They are available from the first
 * frame, including while the Timeline or the Albums rail is still loading.
 */

/** The existing HomePlus/Ionicon vocabulary, so a type reads as its kind. */
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

/**
 * The whole `Tipos` section: a frozen header plus a horizontal rail of the four
 * automatic collections. Rendered inside the root's composed header, so it is
 * above the Timeline and never inside it.
 */
export function MemoryTypesSection({
  collections,
  onOpenCollection,
}: {
  /** Only the `type` refs, in their frozen product order. */
  collections: readonly MemoryTypeCollectionRef[];
  /** Receives the `memoryKind`, so the caller never has to map ids back. */
  onOpenCollection: (memoryKind: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="bodySmall" weight="800" style={styles.headerTitle}>
          {'Tipos'}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {collections.map((ref) => (
          <MemoryCollectionTile
            key={ref.memoryKind}
            title={TYPE_TITLES[ref.memoryKind] ?? 'Colección'}
            memoryKind={ref.memoryKind}
            onPress={() => onOpenCollection(ref.memoryKind)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** The frozen product titles. Not derived, never localised at runtime. */
const TYPE_TITLES: Readonly<Record<string, string>> = {
  image: 'Fotos',
  video: 'Videos',
  audio: 'Audios',
  written: 'Notas',
};

const styles = StyleSheet.create({
  section: { gap: spacing[3], paddingBottom: spacing[2] },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerTitle: { flex: 1 },
  rail: { gap: spacing[3], paddingRight: spacing[4] },
  tile: { width: 104, gap: spacing[1] },
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
});