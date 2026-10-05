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
import { ROOT_DESTINATION_LABEL } from './homecloudMoveDestinations';

/** Exactly the fields `PATCH /api/homecloud/content/:contentId/file` accepts. */
export type FilePatch = Parameters<typeof updateHomeCloudFile>[2];

export interface FileTransferFeedback {
  /**
   * `secondary` states a hand-off or an instruction; `danger` states a failure.
   *
   * There is deliberately NO success tone: neither Guardar una copia nor
   * Compartir can verify what the operating system did after its own UI closed,
   * so a success tone would be a claim this app cannot make. Its absence is the
   * guarantee.
   */
  readonly tone: 'secondary' | 'danger';
  readonly message: string;
}

export interface FileActionHostProps {
  file: HomeCloudFile | null;
  /** The household folder catalogue — the ONLY source that can answer a move. */
  folders: readonly HomeCloudFolder[];
  permissions: HomeCloudFileActionPermissions;
  saving: boolean;
  /**
   * The outcome of the last Guardar una copia / Compartir attempt. One feedback
   * channel because both intents perform the same signed transfer; they differ
   * in what they do with the staged copy and in what the member is told, not in
   * how they obtain it.
   */
  downloadFeedback: FileTransferFeedback | null;
  onClose: () => void;
  onSave: (patch: FilePatch) => void;
  /** Ask the surface to open THE shared move destination picker for this File. */
  onMoveRequest: () => void;
  /**
   * Ask the surface to make this File a personal favorite of the member, or to
   * stop being one. The host states the INTENT it resolved from the CURRENT
   * File; it never keeps its own copy of the preference.
   */
  onFavorite: (isFavorite: boolean) => void;
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
  onFavorite,
  onDownload,
  onShare,
}: FileActionHostProps) {
  const [view, setView] = useState<HostView>('actions');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [datePicker, setDatePicker] = useState(false);
  // Which fields the member has actually typed into. Until they do, what a field
  // shows is the File's CURRENT state and not a snapshot — and it is per field,
  // because a name being edited has nothing to say about a note that is not.
  const [draft, setDraft] = useState({ name: false, note: false });
  // What the CURRENT File says about each field. Reading them here is what lets
  // each field follow the File on its own, without re-publishing when an
  // unrelated part of the File changed.
  const currentName = file?.displayName ?? '';
  const currentNote = file?.note ?? '';

  // A different File is a different subject: the host reopens on the action list
  // with that File's own metadata, never with the previous File's draft.
  useEffect(() => {
    setView('actions');
    setName(file?.displayName ?? '');
    setNote(file?.note ?? '');
    setDraft({ name: false, note: false });
  }, [file?.id]);

  /**
   * FRESHNESS — the File this host describes is re-resolved from CURRENT rows
   * after every refresh, so it can change while the sheet stays open and its ID
   * stays the same (another member renamed it, moved it, re-dated it or noted it).
   * A field the member has not edited therefore FOLLOWS the current File instead
   * of keeping the copy it opened with, and nothing has to close and reopen. A
   * field being edited is never overwritten: typing outranks a background
   * refresh, because silently reverting what someone just wrote is worse than a
   * label that is one refresh behind.
   */
  useEffect(() => {
    if (!draft.name) setName(currentName);
  }, [currentName, draft.name]);
  useEffect(() => {
    if (!draft.note) setNote(currentNote);
  }, [currentNote, draft.note]);

  if (!file) return null;

  // The Favorite label and its intent are resolved from the CURRENT File, so a
  // mutation that already landed re-renders this row instead of leaving it
  // describing the state before it.
  const actions = resolveFileActions(permissions, { isFavorite: file.isFavorite === true });
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
      case 'favorite':
        onFavorite(!file.isFavorite);
        return;
      case 'download':
        onDownload();
        return;
      case 'share':
        onShare();
        return;
      default:
        // A seam (`open`, `trash`) can never reach here: the grammar filters
        // unimplemented actions out before the host renders them.
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
            <AppInput label="Nombre" value={name} onChangeText={(next) => { setDraft((previous) => ({ ...previous, name: true })); setName(next); }} editable={permissions.organize} />
            <AppInput label="Nota" value={note} onChangeText={(next) => { setDraft((previous) => ({ ...previous, note: true })); setNote(next); }} editable={permissions.organize} multiline />
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
