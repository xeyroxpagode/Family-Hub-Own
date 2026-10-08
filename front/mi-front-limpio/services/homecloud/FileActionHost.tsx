import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
   * The Favorite mutation is in flight.
   *
   * PER ACTION ON PURPOSE. It used to ride on the shared `saving` flag, which also
   * covers the whole window-preserving reconciliation, so a single Favorite tap
   * froze the ENTIRE File action surface — including Renombrar and Cerrar — for as
   * long as the re-read took. On a slow phone that is a surface that appears
   * broken. Only the Favorite row is busy now.
   */
  favoriteBusy?: boolean;
  /**
   * The outcome of a REFUSED action, stated INSIDE this host.
   *
   * A refused Favorite must never take the Files list down with it: the screen's own
   * error channel REPLACES the list and its `Reintentar` re-reads page one, which is
   * how a refused Favorite used to collapse a loaded 300-row window to 100 and throw
   * the member out of the folder they were in. The member stays exactly where they
   * were and the refusal is said here, in the sheet they opened it from.
   */
  actionError?: string | null;
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
  /**
   * LIFECYCLE V1 — send this File to the household Papelera.
   *
   * Reversible by contract (Restore), so the danger row asks for NO dialog:
   * the Papelera is the recovery path, and a confirmation here would only
   * promise protection the product does not need while hiding the honest
   * reversal. The surface owns the mutation and the refresh.
   */
  onTrash: () => void;
  /**
   * The Papelera mutation is in flight. PER ACTION, like favoriteBusy: sending
   * one File to the Papelera must not freeze Renombrar or Cerrar, and no other
   * row must look busy because of it.
   */
  trashBusy?: boolean;
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
  favoriteBusy = false,
  trashBusy = false,
  actionError = null,
  downloadFeedback,
  onClose,
  onSave,
  onMoveRequest,
  onFavorite,
  onTrash,
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
    // One row, one guard. A row that is already busy does not re-dispatch: a
    // double tap on a slow connection used to send two identical PATCHes.
    if (id === 'favorite' ? favoriteBusy : id === 'trash' ? trashBusy : saving) return;
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
      case 'trash':
        onTrash();
        return;
      default:
        // A seam (`open`) can never reach here: the grammar filters
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
        // STAGE 2 REOPEN — REACHABILITY.
        //
        // This was `content`: a BOUNDED, NON-scrollable content box. Six action
        // rows plus a caption do not fit a short or notched sheet at a raised font
        // scale, so the LAST rows — the Favorite included — were clipped off the
        // bottom of the sheet and became unreachable, with no error and no disabled
        // control to explain it. `fileActionSheetLayoutPolicy` decides that
        // overflow from the real tokens; `scrollable-content` plus the scroll
        // container below is what makes the answer "reachable" instead of
        // "present in the tree but clipped away on a real device".
        size="scrollable-content"
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {showInfo ? (
            <>
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
            </>
          ) : (
            <>
              <AppText variant="caption" tone="secondary">{currentFolderLabel}</AppText>
              {actions.map((action) => (
                <AppButton
                  key={action.id}
                  title={action.label}
                  variant={action.intent === 'danger' ? 'danger' : action.intent}
                  // PER-ACTION BUSY. The Favorite is busy while ITS OWN mutation is
                  // in flight, the Papelera row while ITS OWN is, and the other rows
                  // are disabled only by a mutation they would actually conflict
                  // with. Neither busy flag ever makes Renombrar or Cerrar look dead.
                  disabled={!action.available || (action.id === 'favorite' ? favoriteBusy : action.id === 'trash' ? trashBusy : saving)}
                  loading={(action.id === 'favorite' && favoriteBusy) || (action.id === 'trash' && trashBusy)}
                  accessibilityLabel={`${action.label} ${file.displayName}`}
                  accessibilityState={{
                    busy: action.id === 'favorite' ? favoriteBusy : action.id === 'trash' ? trashBusy : saving,
                  }}
                  onPress={() => run(action.id)}
                />
              ))}
              {actionError ? (
                <AppText
                  variant="bodySmall"
                  tone="danger"
                  accessibilityRole="alert"
                  accessibilityLabel={`Error: ${actionError}`}
                  testID="file-action-error"
                >{actionError}</AppText>
              ) : null}
              {downloadFeedback ? (
                <AppText variant="bodySmall" tone={downloadFeedback.tone}>{downloadFeedback.message}</AppText>
              ) : null}
            </>
          )}
        </ScrollView>
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
  // `flexShrink: 1` is what lets the scroll container take the ActionSheet's
  // bounded content box instead of growing past it; without it the ScrollView
  // would measure its full content and clip the overflow it exists to expose.
  scroll: { flexShrink: 1 },
  list: { gap: spacing[3], paddingBottom: spacing[2] },
});
