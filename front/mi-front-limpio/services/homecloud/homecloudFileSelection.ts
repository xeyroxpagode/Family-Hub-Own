/**
 * HomeCloud Files — SELECTION MODEL (Core basic operations, slice 1).
 *
 * Selection is a VIEW concern and never a persisted one. It belongs to Files
 * (not to one folder, one query or one renderer): folder navigation, search,
 * sort, Grid/List switches and loaded-window changes preserve every selected
 * identity. It is discarded the moment the household changes or the member
 * leaves selection mode.
 *
 * PATCH 1B — folders ARE selectable and coexist with files in one selection.
 * File ids and folder ids live in SEPARATE sets, so no consumer can mistake a
 * folder for a file: `ids` is files only, `folderIds` is folders only, and
 * `selectionEntities` is the typed union for operations that span both.
 *
 * It is deliberately framework-free so the surface and its tests exercise THIS
 * logic rather than a re-implementation of it.
 *
 * The product decision this encodes: a plain tap on a File opens the Viewer
 * and a plain tap on a Folder navigates, so neither is a selection gesture.
 * Selection is ENTERED by a long press (ONE threshold, selection only — never
 * a menu) or by the explicit "Seleccionar" control, and only while the mode is
 * active does a tap toggle.
 */
export type SelectedEntityType = 'file' | 'folder';

export interface SelectedEntity {
  readonly type: SelectedEntityType;
  readonly id: string;
}

export interface FileSelection {
  /**
   * Selection mode is active. While it is, a tap on a File toggles it instead of
   * staying unassigned.
   */
  readonly mode: boolean;
  /**
   * The selected FILE ids. Every transition publishes a FRESH `Set`, so the
   * identity of this object IS the state change the surface renders from.
   * Folder ids NEVER live here; see `folderIds`.
   */
  readonly ids: ReadonlySet<string>;
  /**
   * The selected FOLDER ids. Separate from `ids` on purpose: file-only
   * operations (favorite, share, trash-to-Papelera) must never receive a
   * folder id, and folder-aware operations read `selectionEntities`.
   */
  readonly folderIds: ReadonlySet<string>;
}

export const emptyFileSelection = (): FileSelection => ({ mode: false, ids: new Set<string>(), folderIds: new Set<string>() });

/** Enter selection mode, keeping any ids that are still there. */
export function enterFileSelection(previous: FileSelection): FileSelection {
  if (previous.mode) return previous;
  return { mode: true, ids: new Set(previous.ids), folderIds: new Set(previous.folderIds ?? []) };
}

/**
 * Leaving selection mode clears it: the count, the bulk target and the selection
 * visual state all stop existing at the same instant.
 */
export const leaveFileSelection = (): FileSelection => emptyFileSelection();

export function selectFile(previous: FileSelection, fileId: string): FileSelection {
  if (previous.ids.has(fileId)) return previous;
  const ids = new Set(previous.ids);
  ids.add(fileId);
  return { mode: true, ids, folderIds: previous.folderIds ?? new Set<string>() };
}

export function deselectFile(previous: FileSelection, fileId: string): FileSelection {
  if (!previous.ids.has(fileId)) return previous;
  const ids = new Set(previous.ids);
  ids.delete(fileId);
  return { mode: previous.mode, ids, folderIds: previous.folderIds ?? new Set<string>() };
}

/** The one thing a tap does while selection mode is active. */
export const toggleFileSelection = (previous: FileSelection, fileId: string): FileSelection =>
  (previous.ids.has(fileId) ? deselectFile(previous, fileId) : selectFile(previous, fileId));

export function selectFolder(previous: FileSelection, folderId: string): FileSelection {
  const current = previous.folderIds ?? new Set<string>();
  if (current.has(folderId)) return previous;
  const folderIds = new Set(current);
  folderIds.add(folderId);
  return { mode: true, ids: previous.ids, folderIds };
}

export function deselectFolder(previous: FileSelection, folderId: string): FileSelection {
  const current = previous.folderIds ?? new Set<string>();
  if (!current.has(folderId)) return previous;
  const folderIds = new Set(current);
  folderIds.delete(folderId);
  return { mode: previous.mode, ids: previous.ids, folderIds };
}

export const toggleFolderSelection = (previous: FileSelection, folderId: string): FileSelection =>
  ((previous.folderIds ?? new Set<string>()).has(folderId)
    ? deselectFolder(previous, folderId)
    : selectFolder(previous, folderId));

/** Toggle one entity of either type. Files and folders coexist in one selection. */
export function toggleEntitySelection(previous: FileSelection, entity: SelectedEntity): FileSelection {
  return entity.type === 'folder'
    ? toggleFolderSelection(previous, entity.id)
    : toggleFileSelection(previous, entity.id);
}

/** Put ONE entity of either type into a decided selection state (drag paint). */
export function setEntitySelectionSelected(previous: FileSelection, entity: SelectedEntity, selected: boolean): FileSelection {
  return entity.type === 'folder'
    ? (selected ? selectFolder(previous, entity.id) : deselectFolder(previous, entity.id))
    : setFileSelectionSelected(previous, entity.id, selected);
}

export const isFolderSelected = (selection: FileSelection, folderId: string): boolean =>
  (selection.folderIds ?? new Set<string>()).has(folderId);

export const isEntitySelected = (selection: FileSelection, entity: SelectedEntity): boolean =>
  entity.type === 'folder' ? isFolderSelected(selection, entity.id) : isFileSelected(selection, entity.id);

/**
 * Put ONE File into a decided selection state.
 *
 * This exists because the drag-selection sweep is not a toggle. A sweep reads its
 * mode once, from the anchor, and then every crossed File is set to that same
 * decided state — so calling `toggleFileSelection` per crossed tile would invert
 * the File the finger went down on and make the gesture mean whatever the last
 * crossed tile happened to be. The set mutation lives HERE so the sweep, the tap
 * and the future cannot each grow their own copy of it.
 *
 * A File already in the requested state is returned UNCHANGED (same object), so a
 * repeated set is a no-op rather than a new identity that would re-render the grid
 * for nothing.
 */
export function setFileSelectionSelected(previous: FileSelection, fileId: string, selected: boolean): FileSelection {
  return selected ? selectFile(previous, fileId) : deselectFile(previous, fileId);
}

/** A long press enters selection mode and selects the pressed File in one intent. */
export const beginFileSelectionAt = (previous: FileSelection, fileId: string): FileSelection =>
  selectFile(enterFileSelection(previous), fileId);

/** A long press on a Folder enters selection mode and selects it in one intent. */
export const beginFolderSelectionAt = (previous: FileSelection, folderId: string): FileSelection =>
  selectFolder(enterFileSelection(previous), folderId);

/** A long press on any entity enters selection mode and selects it in one intent. */
export const beginEntitySelectionAt = (previous: FileSelection, entity: SelectedEntity): FileSelection =>
  entity.type === 'folder' ? beginFolderSelectionAt(previous, entity.id) : beginFileSelectionAt(previous, entity.id);

/** Drop every id but keep the mode, so the surface can restate its own empty bar. */
export function clearSelectedFiles(previous: FileSelection): FileSelection {
  if (previous.ids.size === 0 && (previous.folderIds ?? new Set<string>()).size === 0) return previous;
  return { mode: previous.mode, ids: new Set<string>(), folderIds: new Set<string>() };
}

/**
 * Reconciliation for selection: keep only the ids that are STILL valid.
 *
 * Cross-folder selection is Files-wide by product decision, so navigation,
 * search, sort, Grid/List switches and window changes NEVER prune: only an
 * identity proven invalid (trashed, unshared, deleted) is dropped, and only
 * through this function with explicit evidence.
 */
export function pruneFileSelection(previous: FileSelection, visibleIds: Iterable<string>): FileSelection {
  if (previous.ids.size === 0) return previous;
  const visible = visibleIds instanceof Set ? visibleIds : new Set(visibleIds);
  let dropped = false;
  const kept = new Set<string>();
  for (const id of previous.ids) {
    if (visible.has(id)) kept.add(id);
    else dropped = true;
  }
  return dropped ? { mode: previous.mode, ids: kept, folderIds: previous.folderIds ?? new Set<string>() } : previous;
}

/** Drop entity identities proven invalid, preserving each survivor's type. */
export function pruneEntitySelection(
  previous: FileSelection,
  validFiles: Iterable<string>,
  validFolders: Iterable<string>,
): FileSelection {
  const validFileSet = validFiles instanceof Set ? validFiles : new Set(validFiles);
  const validFolderSet = validFolders instanceof Set ? validFolders : new Set(validFolders);
  let droppedFiles = false;
  let droppedFolders = false;
  const keptFiles = new Set<string>();
  for (const id of previous.ids) {
    if (validFileSet.has(id)) keptFiles.add(id);
    else droppedFiles = true;
  }
  const keptFolders = new Set<string>();
  for (const id of (previous.folderIds ?? new Set<string>())) {
    if (validFolderSet.has(id)) keptFolders.add(id);
    else droppedFolders = true;
  }
  if (!droppedFiles && !droppedFolders) return previous;
  return { mode: previous.mode, ids: keptFiles, folderIds: keptFolders };
}

export const fileSelectionCount = (selection: FileSelection): number =>
  selection.ids.size + (selection.folderIds ?? new Set<string>()).size;

export const isFileSelected = (selection: FileSelection, fileId: string): boolean => selection.ids.has(fileId);

/** Insertion-ordered, so N selected Files are moved in the order they were chosen. */
export const selectedFileIds = (selection: FileSelection): string[] => [...selection.ids];

/** Insertion-ordered selected folder ids. */
export const selectedFolderIds = (selection: FileSelection): string[] => [...(selection.folderIds ?? new Set<string>())];

/**
 * Every selected identity with its type, files first in insertion order, then
 * folders in insertion order. Bulk operations that span both kinds consume
 * THIS, never a bare id list.
 */
export const selectionEntities = (selection: FileSelection): SelectedEntity[] => [
  ...[...selection.ids].map((id): SelectedEntity => ({ type: 'file', id })),
  ...[...(selection.folderIds ?? new Set<string>())].map((id): SelectedEntity => ({ type: 'folder', id })),
];

/** True when the selection holds at least one folder (bulk menu must narrow). */
export const selectionHasFolders = (selection: FileSelection): boolean =>
  (selection.folderIds ?? new Set<string>()).size > 0;

/** The count the surface states out loud. Neutral by product decision: files and
 *  folders coexist, so the copy never claims `N archivos` for a mixed set. */
export const fileSelectionSummary = (selection: FileSelection): string => {
  const count = fileSelectionCount(selection);
  return count === 1 ? '1 seleccionado' : `${count} seleccionados`;
};
