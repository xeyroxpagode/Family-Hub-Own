import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionSheet, AppButton, AppText } from '../../components/ui';
import { spacing } from '../../constants/theme';
import {
  fileMoveDestinations,
  MAX_DESTINATION_INDENT_DEPTH,
  ROOT_DESTINATION_FOLDER_ID,
  ROOT_DESTINATION_LABEL,
  type FileMoveDestination,
} from './homecloudMoveDestinations';
import type { HomeCloudFolder } from './homecloudTypes';

/**
 * HomeCloud Files - THE MOVE DESTINATION PICKER.
 *
 * The SHEET. The grammar it renders lives in `homecloudMoveDestinations`, which
 * is a pure module with no React and no transport, so the destination contract can
 * be proven without a device or a renderer.
 *
 * One File's Move, a bulk Move and a Folder's Move all come through here, so a
 * move can never offer a destination the other move would not.
 */
export { ROOT_DESTINATION_FOLDER_ID, ROOT_DESTINATION_LABEL };
export type { FileMoveDestination };

export interface FileMoveDestinationPickerProps {
  visible: boolean;
  title: string;
  folders: readonly HomeCloudFolder[];
  currentFolderId: string | null | undefined;
  /** Stage 2 Phase 1: for a FOLDER move, this folder and its descendants. */
  excludeFolderIds?: ReadonlySet<string>;
  /** Explains the promotion contract so a delete never implies data loss. */
  footnote?: string;
  busy?: boolean;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

export function FileMoveDestinationPicker({
  visible,
  title,
  folders,
  currentFolderId,
  excludeFolderIds,
  footnote,
  busy = false,
  onSelect,
  onClose,
}: FileMoveDestinationPickerProps) {
  const destinations = fileMoveDestinations(folders, currentFolderId, excludeFolderIds);
  return (
    <ActionSheet visible={visible} title={title} onRequestClose={onClose} size="content">
      <View style={styles.list}>
        {destinations.map((destination) => {
          const key = destination.folderId ?? 'root';
          // The indent is capped so a deep hierarchy stays usable on a phone: past
          // the cap the row stops shifting, and the accessibility label - which
          // always carries the FULL path - is what actually disambiguates it.
          const indent = Math.min(destination.depth, MAX_DESTINATION_INDENT_DEPTH) * spacing[3];
          return (
            <View key={key} style={{ marginLeft: indent }}>
              <AppButton
                title={destination.label}
                variant={destination.isCurrent ? 'primary' : 'secondary'}
                disabled={busy}
                style={styles.destination}
                accessibilityLabel={
                  destination.path
                    ? `${destination.isCurrent ? `${destination.label}, carpeta actual` : `Mover a ${destination.path}`}`
                    : `${destination.isCurrent ? 'Archivos, carpeta actual' : 'Mover a Archivos'}`
                }
                onPress={() => onSelect(destination.folderId)}
              />
            </View>
          );
        })}
      </View>
      {footnote ? <View style={styles.footnote}><AppText variant="caption" tone="secondary">{footnote}</AppText></View> : null}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[2], paddingBottom: spacing[2] },
  destination: { alignItems: 'flex-start' },
  footnote: { paddingTop: spacing[3] },
});
