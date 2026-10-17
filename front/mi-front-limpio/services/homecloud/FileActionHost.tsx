import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActionSheet, AdaptiveActionMenu, AdaptiveMenuRow, AdaptiveMenuSeparator, AppButton, AppInput, AppText, InteractivePressable, type MenuAnchor } from '../../components/ui';
import { HomePlusIcon } from '../../constants/icons';
import { colors, motion, spacing } from '../../constants/theme';
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
  anchor?: MenuAnchor | null;
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

type HostView = 'actions' | 'info' | 'rename';

/**
 * HC-POL-024 — ONE information row, with the hierarchy metadata needs.
 *
 * Metadata is dense, so the label and the value must not compete: the label is a
 * quiet 12-13 pt caption and the value is the 15-17 pt answer, stacked with the
 * gap the contract names. The chevron is the EDITABLE indicator and it exists
 * only on a row that can actually be changed — a read-only fact is never dressed
 * up as a control, which is what "no false affordance" means here.
 */
function FileInfoRow({
  label,
  value,
  onPress,
  disabled = false,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const copy = (
    <View style={styles.rowCopy}>
      <AppText variant="caption" tone="secondary" weight="700" style={styles.rowLabel}>{label}</AppText>
      <AppText variant="body" numberOfLines={2} style={styles.rowValue}>{value}</AppText>
    </View>
  );
  if (!onPress) {
    return <View style={styles.row}>{copy}</View>;
  }
  return (
    <InteractivePressable
      style={styles.row}
      onPress={() => { onPress(); }}
      disabled={disabled}
      haptic="light"
      pressScale={motion.scale.card}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      {copy}
      <HomePlusIcon name="chevron-forward-outline" size={18} color={disabled ? colors.text.tertiary : colors.text.secondary} />
    </InteractivePressable>
  );
}

/**
 * HomeCloud Files — THE CANONICAL FILE ACTION HOST.
 *
 * PATCH 1B — the short command catalog is a trigger-anchored COMPACT POPOVER
 * (one 44 pt row per command), never a modal sheet of large card-buttons.
 * Only secondary work becomes a sheet: Información and Renombrar replace the
 * popover in the same commit (one host, one visible surface — menu and sheet
 * never coexist, no overlapping backdrop, no stale button), and Mover hands
 * off to the surface's shared destination picker. It renders what
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
  anchor = null,
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
  // Which fields the member has actually typed into. Until they do, what a field
  // shows is the File's CURRENT state and not a snapshot — and it is per field,
  // because a name being edited has nothing to say about a note that is not.
  const [draft, setDraft] = useState({ name: false, note: false });
  // What the CURRENT File says about each field. Reading them here is what lets
  // each field follow the File on its own, without re-publishing when an
  // unrelated part of the File changed.
  const currentName = file?.displayName ?? '';

  // A different File is a different subject: the host reopens on the action list
  // with that File's own metadata, never with the previous File's draft.
  useEffect(() => {
    setView('actions');
    setName(file?.displayName ?? '');
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

  if (!file) return null;

  // The Favorite label and its intent are resolved from the CURRENT File, so a
  // mutation that already landed re-renders this row instead of leaving it
  // describing the state before it.
  const actions = resolveFileActions(permissions, { isFavorite: file.isFavorite === true });
  const currentFolderLabel = folders.find((folder) => folder.id === file.folderId)?.name ?? ROOT_DESTINATION_LABEL;
  const showInfo = view === 'info';
  const showRename = view === 'rename';

  const run = (id: HomeCloudFileActionId): void => {
    // One row, one guard. A row that is already busy does not re-dispatch: a
    // double tap on a slow connection used to send two identical PATCHes.
    if (id === 'favorite' ? favoriteBusy : id === 'trash' ? trashBusy : saving) return;
    switch (id) {
      case 'info':
        setView('info');
        return;
      case 'rename':
        setView('rename');
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

  const actionContent = (
    <>
      <AppText variant="caption" tone="secondary">{currentFolderLabel}</AppText>
      {actions.map((action) => (
        <React.Fragment key={action.id}>
        {(action.id === 'download' || action.id === 'trash') ? <AdaptiveMenuSeparator /> : null}
        <AdaptiveMenuRow
          title={action.label}
          variant={action.intent === 'danger' ? 'danger' : action.intent === 'primary' ? 'primary' : 'neutral'}
          disabled={!action.available || (action.id === 'favorite' ? favoriteBusy : action.id === 'trash' ? trashBusy : saving)}
          busy={(action.id === 'favorite' && favoriteBusy) || (action.id === 'trash' && trashBusy)}
          accessibilityLabel={`${action.label} ${file.displayName}`}
          onPress={() => run(action.id)}
        /></React.Fragment>
      ))}
      {actionError ? <AppText variant="bodySmall" tone="danger" accessibilityRole="alert" accessibilityLabel={`Error: ${actionError}`} testID="file-action-error">{actionError}</AppText> : null}
      {downloadFeedback ? <AppText variant="bodySmall" tone={downloadFeedback.tone}>{downloadFeedback.message}</AppText> : null}
    </>
  );

  return (
    <>
      {showInfo ? <ActionSheet
        visible
        title="Información del archivo"
        onRequestClose={onClose}
        size="scrollable-content"
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {/* HC-POL-024 — TYPE FIRST, then the name, then where it lives and the
              domain metadata. The type line is the same honest data the Viewer
              shows: the real mime type and the real size, never an invented kind. */}
          <AppText variant="caption" tone="secondary" accessibilityLabel={`Tipo: ${file.mimeType ?? 'desconocido'}`}>
            {[file.mimeType, file.sizeBytes ? `${Math.max(1, Math.round(file.sizeBytes / 1024))} KB` : null].filter(Boolean).join(' · ')}
          </AppText>
          <FileInfoRow label="Nombre" value={file.displayName} />
          <FileInfoRow label="Carpeta" value={currentFolderLabel} />
          {file.documentDate ? <FileInfoRow label="Fecha del documento" value={file.documentDate} /> : null}
          {file.note ? <FileInfoRow label="Nota" value={file.note} /> : null}
        </ScrollView>
      </ActionSheet> : showRename ? <ActionSheet visible title="Renombrar" onRequestClose={onClose} size="content" footer={<AppButton title="Guardar" disabled={!permissions.organize || saving || !name.trim()} onPress={() => onSave({ displayName: name.trim() })} accessibilityLabel={`Guardar nombre de ${file.displayName}`} />}><AppInput label="Nombre" value={name} onChangeText={(next) => { setDraft((previous) => ({ ...previous, name: true })); setName(next); }} autoFocus /></ActionSheet> : <AdaptiveActionMenu visible title={file.displayName} anchor={anchor} itemCount={actions.length} onRequestClose={onClose}><View style={styles.list}>{actionContent}</View></AdaptiveActionMenu>}
    </>
  );
}

const styles = StyleSheet.create({
  // `flexShrink: 1` is what lets the scroll container take the ActionSheet's
  // bounded content box instead of growing past it; without it the ScrollView
  // would measure its full content and clip the overflow it exists to expose.
  scroll: { flexShrink: 1 },
  list: { gap: spacing[3], paddingBottom: spacing[2] },
  separator: { height: 1, backgroundColor: colors.border.default },
  /** HC-POL-024 — the row is >=52 pt so a metadata sheet is thumb-reachable. */
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
  },
  rowCopy: { flex: 1, gap: spacing[1] },
  rowLabel: { letterSpacing: 0.4 },
  rowValue: { color: colors.text.primary },
});
