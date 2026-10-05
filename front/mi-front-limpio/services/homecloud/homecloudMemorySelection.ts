/**
 * HomeCloud MO-A3 — Memory SELECTION SESSION (pure, framework free).
 *
 * A Memory is an ENTITY. Recuerdos is the canonical library. Albums and type
 * collections are VIEWS over the same `contentId` identities, never copies. This
 * module is therefore the single place where "which Memories are selected" is
 * decided, and it holds exactly one rule:
 *
 *   IDENTITY IS `contentId` AND NOTHING ELSE.
 *
 * Never a row index, never an array index, never a preview URL and never an
 * Album membership id. Two surfaces showing the same Memory therefore agree
 * without any synchronization mechanism: they both ask `selectedIds.has(id)`.
 *
 * ONE SESSION, FOUR PRODUCTIVE ENTRY POINTS
 * ------------------------------------------
 *   A. Album (populated) -> "Agregar recuerdos" -> purpose addToAlbum(current)
 *   B. Album (empty)     -> "Agregar recuerdos" -> the SAME flow
 *   C. Timeline normal   -> long press        -> purpose generic
 *   D. Album detail      -> long press        -> purpose removeFromAlbum(current)
 *
 * There is NO global context, NO Redux/store and NO new app-wide provider: the
 * owner is `HomeCloudMemoriesView` and the session is an immutable value it
 * holds in React state. Lookups are O(1) through `Set.has`, and every
 * transition returns a NEW `Set` identity so React can compare by reference.
 *
 * ALREADY-MEMBER TRUTH
 * --------------------
 * With `purpose.kind === 'addToAlbum'`, a Memory that already belongs to the
 * destination Album is EXCLUDED: it stays visible, it is rendered as a status
 * ("Ya está en el álbum"), it cannot be toggled, it is never counted in the
 * pending selection and it is NEVER submitted. Backend idempotency is
 * defense-in-depth, not the mechanism that makes the UI honest. Re-deriving the
 * exclusions also PRUNES anything already selected, so a retry after a partial
 * success can never resubmit a membership that now exists.
 *
 * WHY PURE
 * --------
 * Every transition worth preventing here (a no-op toggle, a prune on
 * re-derivation, an already-member rejection, a household reset, a cross-source
 * identity) is a value transition, so all of them are directly testable without
 * a React renderer.
 */

/** Frozen copy: the count line of the selection header. */
export function memorySelectionCountLabel(count: number): string {
  if (!Number.isInteger(count) || count <= 0) return '0 seleccionados';
  if (count === 1) return '1 seleccionado';
  return `${count} seleccionados`;
}

/**
 * The confirmation copy of the `✓` affordance.
 *
 * It always states the EXACT pending count — `"Confirmar, N seleccionados"` —
 * so a screen reader user knows what is about to happen before committing.
 */
export function memorySelectionConfirmLabel(count: number): string {
  if (!Number.isInteger(count) || count <= 0) return 'Confirmar, 0 seleccionados';
  if (count === 1) return 'Confirmar, 1 seleccionado';
  return `Confirmar, ${count} seleccionados`;
}

/**
 * `Quitar 1 del álbum` / `Quitar N del álbum`.
 *
 * The frozen copy lives in the Album-scope module, which already owns every
 * sentence that is part of the Album contract; it is re-exported here so the
 * selection surface has one import for its own copy and there is exactly ONE
 * definition. The verb is `Quitar` and the object is `del álbum`: a MEMBERSHIP
 * change. It is never `Eliminar`, `Borrar`, `Papelera`, `Trash`, `Purge` nor
 * `Quitar de HomeCloud`, because none of those is what happens — the Memory, its
 * bytes and every other Album membership survive untouched.
 */
export { albumRemoveSelectionLabel as memorySelectionRemoveLabel } from './homecloudAlbumScope';

/** `Agregar a {album}` — the destination line of the selection header. */
export function memorySelectionAddLabel(albumName: string | null): string {
  return albumName === null ? 'Agregar a álbum' : `Agregar a ${albumName}`;
}

/**
 * The accessible name of the contextual action affordance.
 *
 * HC2-C replaced the `✓` confirm with an actions affordance available from the
 * first frame of the selection, so the name has to state the exact scope of what
 * is about to be opened — including the honest zero case, where there is nothing
 * to act on.
 */
export function memorySelectionActionsLabel(count: number): string {
  if (!Number.isInteger(count) || count <= 0) return 'Acciones, 0 seleccionados';
  return `Acciones, ${count} ${count === 1 ? 'seleccionado' : 'seleccionados'}`;
}

export type MemorySelectionMode = 'normal' | 'selecting';

/**
 * WHY THE OPERATION IS DATA
 * -------------------------
 * The operation is part of the session because it decides the only two things
 * that differ between the entry points: which mutation an action performs and
 * which destination Album it names. It is data, not a callback, so a household
 * reset or a scope change can drop it without any pending work surviving.
 */
export type MemorySelectionPurpose =
  | { readonly kind: 'generic' }
  | { readonly kind: 'addToAlbum'; readonly albumId: string }
  | { readonly kind: 'removeFromAlbum'; readonly albumId: string };

/**
 * WHICH Memories are on screen is NOT part of the session.
 *
 * HC2-C removed `MemorySelectionSource` from this module. The old session carried
 * `library | collectionsRoot | collection`, which is what made selection a
 * NAVIGATION destination: entering it revealed a `Recuerdos | Colecciones`
 * switch, and choosing `Colecciones` swapped the whole screen body for a second
 * parallel `ScrollView` with its own offset, its own back control and its own
 * title.
 *
 * The product truth is that selection is CONTEXTUAL STATE INSIDE THE CURRENT
 * SURFACE: the grid does not move, the offset is preserved, the root information
 * architecture does not change, and the Album/collection context is preserved.
 * That can only be true if the session has no opinion about which surface it is
 * on. Which collection is open is SCREEN state (`activeCollectionId`), owned by
 * the screen, exactly like `openAlbumId`.
 */
export interface MemorySelectionState {
  readonly mode: MemorySelectionMode;
  readonly purpose: MemorySelectionPurpose | null;
  /**
   * Pending selection, by `contentId`. ALWAYS a fresh immutable `Set`: a
   * transition that changes nothing returns the very same instance so React can
   * skip the re-render.
   */
  readonly selectedIds: ReadonlySet<string>;
  /**
   * Ids that may not be selected in this operation (already a member of the
   * destination Album). They are never counted and never submitted.
   */
  readonly excludedIds: ReadonlySet<string>;
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

export const MEMORY_SELECTION_INITIAL: MemorySelectionState = {
  mode: 'normal',
  purpose: null,
  selectedIds: EMPTY_SET,
  excludedIds: EMPTY_SET,
};

/** A brand new, independent session. Never shares a mutable Set. */
export function createMemorySelectionSession(): MemorySelectionState {
  return {
    mode: 'normal',
    purpose: null,
    selectedIds: new Set<string>(),
    excludedIds: new Set<string>(),
  };
}

export interface EnterMemorySelectionRequest {
  readonly purpose: MemorySelectionPurpose;
  /** The first Memory of a long press. Excluded ids are never taken. */
  readonly initialContentIds?: readonly string[];
  /** Already-in-destination ids, derived from the read model's `albumIds`. */
  readonly excludedIds?: Iterable<string>;
}

function toSet(values: Iterable<string> | undefined): ReadonlySet<string> {
  return values === undefined ? new Set<string>() : new Set(values);
}

/**
 * Enter selection mode.
 *
 * The session is ALWAYS rebuilt from scratch: entering selection is a new
 * operation, so an id left over from a previous one can never leak into it.
 */
export function enterMemorySelection(
  state: MemorySelectionState,
  request: EnterMemorySelectionRequest,
): MemorySelectionState {
  const excludedIds = toSet(request.excludedIds);
  const selectedIds = new Set<string>();
  for (const contentId of request.initialContentIds ?? []) {
    if (excludedIds.has(contentId)) continue;
    selectedIds.add(contentId);
  }
  return {
    mode: 'selecting',
    purpose: request.purpose,
    selectedIds,
    excludedIds,
  };
}

/** Is this operation active right now? */
export function isMemorySelecting(state: MemorySelectionState): boolean {
  return state.mode === 'selecting' && state.purpose !== null;
}

/**
 * Add or remove ONE Memory from the pending selection.
 *
 * An excluded id is a NO-OP returning the identical state: an already-in-
 * destination Memory is neither selectable nor countable.
 */
export function toggleMemorySelection(
  state: MemorySelectionState,
  contentId: string,
): MemorySelectionState {
  if (!isMemorySelecting(state)) return state;
  if (typeof contentId !== 'string' || contentId.length === 0) return state;
  if (state.excludedIds.has(contentId)) return state;
  const selectedIds = new Set(state.selectedIds);
  if (selectedIds.has(contentId)) selectedIds.delete(contentId);
  else selectedIds.add(contentId);
  return { ...state, selectedIds };
}

/**
 * Add or remove MANY Memories, returning the resulting state.
 *
 * Batching matters: a drag crosses several cells per pointer event, and one
 * state write per pointer event keeps the row re-renders bounded. Ids already
 * visited are skipped, so the caller can pass a whole crossed range.
 */
export function toggleMemorySelectionMany(
  state: MemorySelectionState,
  contentIds: Iterable<string>,
  mode: 'select' | 'deselect',
): MemorySelectionState {
  if (!isMemorySelecting(state)) return state;
  const selectedIds = new Set(state.selectedIds);
  let changed = false;
  for (const contentId of contentIds) {
    if (state.excludedIds.has(contentId)) continue;
    if (mode === 'select') {
      if (selectedIds.has(contentId)) continue;
      selectedIds.add(contentId);
    } else {
      if (!selectedIds.has(contentId)) continue;
      selectedIds.delete(contentId);
    }
    changed = true;
  }
  if (!changed) return state;
  return { ...state, selectedIds };
}

/** Empty the pending selection and KEEP the operation open. */
export function clearMemorySelection(state: MemorySelectionState): MemorySelectionState {
  if (!isMemorySelecting(state)) return state;
  if (state.selectedIds.size === 0) return state;
  return { ...state, selectedIds: new Set<string>() };
}

/**
 * Re-derive the exclusions from the CURRENT read model.
 *
 * Called when the loaded pages reveal more already-members, after a partial
 * mutation success and after a refetch. Anything already selected that became a
 * member is PRUNED, so the pending selection can only ever contain Memories
 * whose membership does not exist yet.
 */
export function setMemorySelectionExclusions(
  state: MemorySelectionState,
  excludedIds: Iterable<string>,
): MemorySelectionState {
  if (!isMemorySelecting(state)) return state;
  const next = toSet(excludedIds);
  if (next.size === state.excludedIds.size) {
    let identical = true;
    for (const id of next) {
      if (!state.excludedIds.has(id)) {
        identical = false;
        break;
      }
    }
    if (identical) return state;
  }
  let pruned = false;
  const selectedIds = new Set(state.selectedIds);
  for (const id of selectedIds) {
    if (next.has(id)) {
      selectedIds.delete(id);
      pruned = true;
    }
  }
  return pruned ? { ...state, selectedIds, excludedIds: next } : { ...state, excludedIds: next };
}

/** Is this Memory selectable right now? Drives the per-card affordance. */
export function isMemorySelectable(state: MemorySelectionState, contentId: string): boolean {
  return isMemorySelecting(state) && !state.excludedIds.has(contentId);
}

export function isMemorySelected(state: MemorySelectionState, contentId: string): boolean {
  return state.selectedIds.has(contentId);
}

/**
 * CANCEL: drop the whole operation.
 *
 * Nothing is mutated and the caller keeps the exact surface it was on: the Album
 * it came from, the collection it came from, and the Timeline scroll offset.
 * There is no `source` to restore any more, precisely because the session never
 * owned one. This is the `X` affordance.
 */
export function cancelMemorySelection(state: MemorySelectionState): MemorySelectionState {
  if (state.mode === 'normal' && state.purpose === null && state.selectedIds.size === 0) {
    return state;
  }
  return {
    mode: 'normal',
    purpose: null,
    selectedIds: new Set<string>(),
    excludedIds: new Set<string>(),
  };
}

export interface MemorySelectionResult {
  readonly purpose: MemorySelectionPurpose;
  /** Pending ids, in selection order. Never includes an excluded id. */
  readonly contentIds: readonly string[];
}

/**
 * CONFIRM: read the operation out of the session.
 *
 * It performs NO mutation. Ids are filtered against the exclusions one last
 * time, so a confirm can never submit a membership that already exists.
 */
export function confirmMemorySelection(state: MemorySelectionState): MemorySelectionResult | null {
  if (!isMemorySelecting(state) || state.purpose === null) return null;
  const contentIds: string[] = [];
  for (const contentId of state.selectedIds) {
    if (state.excludedIds.has(contentId)) continue;
    contentIds.push(contentId);
  }
  return { purpose: state.purpose, contentIds };
}

/** Is any action available? Zero selectable Memories is always disabled. */
export function canConfirmMemorySelection(state: MemorySelectionState): boolean {
  if (!isMemorySelecting(state)) return false;
  for (const contentId of state.selectedIds) {
    if (!state.excludedIds.has(contentId)) return true;
  }
  return false;
}

/**
 * RESET SCOPE (household switch / sign-out).
 *
 * Drops mode, purpose and every id. Which surface was open is NOT part of this:
 * the screen resets its own `activeCollectionId` / `openAlbumId` in the same
 * scope effect, so nothing at all from the previous household can render in the
 * next one.
 */
export function resetMemorySelectionScope(): MemorySelectionState {
  return createMemorySelectionSession();
}