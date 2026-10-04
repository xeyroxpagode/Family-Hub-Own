import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionSheet, AppButton, AppInput, AppText, DatePickerSheet, FormActionRow } from '../../components/ui';
import { spacing } from '../../constants/theme';
import {
  resolveFileActions,
  type HomeCloudFileActionId,
  type HomeCloudFileActionPermissions,
} from './homecloudFileActions';
import type { updateHomeCloudFile } from './homecloudFilesService';
import type { HomeCloudFile, HomeCloudFolder } from './homecloudTypes';
import { ROOT_DESTINATION_LABEL } from './FileMoveDestinationPicker';

/** Exactly the fields `PATCH /api/homecloud/content/:contentId/file` accepts. */
export type FilePatch = Parameters<typeof updateHomeCloudFile>[2];

export interface FileTransferFeedback {
  readonly tone: 'secondary' | 'danger' | 'success';
  readonly message: string;
}

export interface FileActionHostProps {
  file: HomeCloudFile | null;
  /** The household folder catalogue — the ONLY source that can answer a move. */
  folders: readonly HomeCloudFolder[];
  permissions: HomeCloudFileActionPermissions;
  saving: boolean;
  /**
   * The outcome of the last Descargar / Compartir attempt. One feedback channel
   * because both intents perform the same signed transfer; they differ in what
   * they do with the local copy, not in how they obtain it.
   */
  downloadFeedback: FileTransferFeedback | null;
  onClose: () => void;
  onSave: (patch: FilePatch) => void;
  /** Ask the surface to open THE shared move destination picker for this File. */
  onMoveRequest: () => void;
  onDownload: () => void;
  onShare: () => void;
}

type HostView = 'actions' | 'info';

/**
 * HomeCloud Files — THE CANONICAL FILE ACTION HOST.
 *
 * One ActionSheet-based host owns the action grammar for a File: it renders what
 * `resolveFileActions` returns, in canonical order, capability-gated, and every
 * control carries a meaningful accessibility label. There is no second menu that
 * can perform a File operation, so "rename this file" has exactly one home.
 *
 * The Move destination picker is NOT here: it is owned by the surface so a single
 * File's Move and a bulk Move can share one destination grammar. This host asks
 * for it through `onMoveRequest`.
 */
export function FileActionHost({
  file,
  folders,
  permissions,
  saving,
  downloadFeedback,
  onClose,
  onSave,
  onMoveRequest,
  onDownload,
  onShare,
}: FileActionHostProps) {
  const [view, setView] = useState<HostView>('actions');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [datePicker, setDatePicker] = useState(false);

  // A different File is a different subject: the host reopens on the action list
  // with that File's own metadata, never with the previous File's draft.
  useEffect(() => {
    setView('actions');
    setName(file?.displayName ?? '');
    setNote(file?.note ?? '');
  }, [file?.id]);

  if (!file) return null;

  const actions = resolveFileActions(permissions);
  const currentFolderLabel = folders.find((folder) => folder.id === file.folderId)?.name ?? ROOT_DESTINATION_LABEL;
  const showInfo = view === 'info';

  const run = (id: HomeCloudFileActionId): void => {
    switch (id) {
      case 'info':
      case 'rename':
        setView('info');
        return;
      case 'move':
        onMoveRequest();
        return;
      case 'download':
        onDownload();
        return;
      case 'share':
        onShare();
        return;
      default:
        // A seam (`favorite`, `open`, `trash`) can never reach here: the grammar
        // filters unimplemented actions out before the host renders them.
        return;
    }
  };

  return (
    <>
      <ActionSheet
        visible
        title={showInfo ? 'Información del archivo' : file.displayName}
        onRequestClose={onClose}
        size="content"
        footer={showInfo ? (
          <View style={styles.list}>
            <AppButton
              title="Guardar cambios"
              disabled={!permissions.organize || saving}
              onPress={() => onSave({ displayName: name, note })}
              accessibilityLabel={`Guardar cambios de ${file.displayName}`}
            />
          </View>
        ) : null}
      >
        {showInfo ? (
          <View style={styles.list}>
            <AppInput label="Nombre" value={name} onChangeText={setName} editable={permissions.organize} />
            <AppInput label="Nota" value={note} onChangeText={setNote} editable={permissions.organize} multiline />
            <FormActionRow
              label="Carpeta"
              value={currentFolderLabel}
              disabled={!permissions.organize}
              onPress={onMoveRequest}
            />
            <FormActionRow
              label="Fecha del documento"
              value={file.documentDate ?? 'Agregar fecha'}
              disabled={!permissions.organize}
              onPress={() => setDatePicker(true)}
            />
          </View>
        ) : (
          <View style={styles.list}>
            <AppText variant="caption" tone="secondary">{currentFolderLabel}</AppText>
            {actions.map((action) => (
              <AppButton
                key={action.id}
                title={action.label}
                variant={action.intent === 'danger' ? 'danger' : action.intent}
                disabled={!action.available || saving}
                accessibilityLabel={`${action.label} ${file.displayName}`}
                onPress={() => run(action.id)}
              />
            ))}
            {downloadFeedback ? (
              <AppText variant="bodySmall" tone={downloadFeedback.tone}>{downloadFeedback.message}</AppText>
            ) : null}
          </View>
        )}
      </ActionSheet>
      <DatePickerSheet
        visible={datePicker}
        value={file.documentDate ?? new Date().toISOString().slice(0, 10)}
        onClose={() => setDatePicker(false)}
        onConfirm={(documentDate) => {
          setDatePicker(false);
          onSave({ documentDate });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[3], paddingBottom: spacing[2] },
});
