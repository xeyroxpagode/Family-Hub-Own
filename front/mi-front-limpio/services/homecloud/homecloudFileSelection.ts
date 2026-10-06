/**
 * HomeCloud Files — SELECTION MODEL (Core basic operations, slice 1).
 *
 * Selection is a VIEW concern and never a persisted one. It belongs to the
 * browser context that created it, and it is discarded the moment that context
 * stops being the question on screen — folder change, query change, sort change
 * or household change — or the moment the member leaves selection mode. There is
 * no cross-folder selection, no persisted selection and no folder selection.
 *
 * It is deliberately framework-free so the surface and its tests exercise THIS
 * logic rather than a re-implementation of it.
 *
 * The product decision this encodes: a plain tap on a File is RESERVED for the
 * Viewer, so it is never a selection gesture. Selection is ENTERED by a long
 * press or by the explicit "Seleccionar" control, and only while the mode is
 * active does a tap toggle.
 */
export interface FileSelection {
  /**
   * Selection mode is active. While it is, a tap on a File toggles it instead of
   * staying unassigned.
   */
  readonly mode: boolean;
  /**
   * The selected File ids. Every transition publishes a FRESH `Set`, so the
   * identity of this object IS the state change the surface renders from.
   */
  readonly ids: ReadonlySet<string>;
}

export const emptyFileSelection = (): FileSelection => ({ mode: false, ids: new Set<string>() });

/** Enter selection mode, keeping any ids that are still there. */
export function enterFileSelection(previous: FileSelection): FileSelection {
  if (previous.mode) return previous;
  return { mode: true, ids: new Set(previous.ids) };
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
  return { mode: true, ids };
}

export function deselectFile(previous: FileSelection, fileId: string): FileSelection {
  if (!previous.ids.has(fileId)) return previous;
  const ids = new Set(previous.ids);
  ids.delete(fileId);
  return { mode: previous.mode, ids };
}

/** The one thing a tap does while selection mode is active. */
export const toggleFileSelection = (previous: FileSelection, fileId: string): FileSelection =>
  (previous.ids.has(fileId) ? deselectFile(previous, fileId) : selectFile(previous, fileId));

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

/** Drop every id but keep the mode, so the surface can restate its own empty bar. */
export function clearSelectedFiles(previous: FileSelection): FileSelection {
  if (previous.ids.size === 0) return previous;
  return { mode: previous.mode, ids: new Set<string>() };
}

/**
 * Reconciliation for selection: keep only the ids that are STILL in the visible
 * context.
 *
 * This is what makes a bulk move honest. Files that left the folder being viewed
 * are gone from the new rows, so their ids stop existing here and the count and
 * the bulk target can never name a File that is not on screen. A `loadMore`
 * widens the visible context, so it prunes nothing.
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
  return dropped ? { mode: previous.mode, ids: kept } : previous;
}

export const fileSelectionCount = (selection: FileSelection): number => selection.ids.size;

export const isFileSelected = (selection: FileSelection, fileId: string): boolean => selection.ids.has(fileId);

/** Insertion-ordered, so N selected Files are moved in the order they were chosen. */
export const selectedFileIds = (selection: FileSelection): string[] => [...selection.ids];

/** The count the surface states out loud, in singular and plural. */
export const fileSelectionSummary = (selection: FileSelection): string => {
  const count = selection.ids.size;
  return count === 1 ? '1 seleccionado' : `${count} seleccionados`;
};
