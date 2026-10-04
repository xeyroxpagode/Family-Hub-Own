import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionSheet, AppButton } from '../../components/ui';
import { spacing } from '../../constants/theme';
import type { HomeCloudFolder } from './homecloudTypes';

/**
 * HomeCloud Files — THE MOVE DESTINATION PICKER.
 *
 * There is exactly ONE destination grammar for a move. A single File's Move and a
 * bulk Move both come through this component and both send `onSelect(folderId)`
 * with `folderId === null` for root. Nothing else in Files enumerates
 * destinations, so a move can never offer a folder the other move would not.
 *
 * `folderId === null` is the real root destination and is how the backend stores
 * it; it is not a synthetic id invented by this picker.
 */
export const ROOT_DESTINATION_FOLDER_ID = null;
export const ROOT_DESTINATION_LABEL = 'Archivos';

export interface FileMoveDestination {
  readonly folderId: string | null;
  readonly label: string;
  readonly isCurrent: boolean;
}

/**
 * Root first, then the household's flat folders, in catalogue order.
 *
 * `undefined` means "no destination is current" — a bulk selection whose Files do
 * not all share one folder has no current destination, and marking root as
 * current would be a lie.
 */
export function fileMoveDestinations(
  folders: readonly HomeCloudFolder[],
  currentFolderId: string | null | undefined,
): FileMoveDestination[] {
  const isCurrent = (folderId: string | null): boolean => currentFolderId !== undefined && folderId === currentFolderId;
  return [
    { folderId: ROOT_DESTINATION_FOLDER_ID, label: ROOT_DESTINATION_LABEL, isCurrent: isCurrent(ROOT_DESTINATION_FOLDER_ID) },
    ...folders.map((folder) => ({
      folderId: folder.id,
      label: folder.name,
      isCurrent: isCurrent(folder.id),
    })),
  ];
}

export interface FileMoveDestinationPickerProps {
  visible: boolean;
  title: string;
  folders: readonly HomeCloudFolder[];
  currentFolderId: string | null | undefined;
  busy?: boolean;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

export function FileMoveDestinationPicker({
  visible,
  title,
  folders,
  currentFolderId,
  busy = false,
  onSelect,
  onClose,
}: FileMoveDestinationPickerProps) {
  const destinations = fileMoveDestinations(folders, currentFolderId);
  return (
    <ActionSheet visible={visible} title={title} onRequestClose={onClose} size="content">
      <View style={styles.list}>
        {destinations.map((destination) => {
          const key = destination.folderId ?? 'root';
          return (
            <AppButton
              key={key}
              title={destination.label}
              variant={destination.isCurrent ? 'primary' : 'secondary'}
              disabled={busy}
              accessibilityLabel={
                destination.isCurrent ? `${destination.label}, carpeta actual` : `Mover a ${destination.label}`
              }
              onPress={() => onSelect(destination.folderId)}
            />
          );
        })}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[3], paddingBottom: spacing[2] },
});
