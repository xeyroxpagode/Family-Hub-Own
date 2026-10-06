/**
 * HomeCloud Files — DRAG SELECTION (the model, the hit test and the auto-scroll).
 *
 * WHY A MODULE AND NOT A RENDER
 * -----------------------------
 * Three separate decisions decide whether a long-press sweep feels right, and
 * none of them is a matter of styling:
 *
 *   1. WHAT MODE the gesture is in. The mode is read ONCE, from the anchor's
 *      selection state when the finger went down, and never again. Inferring it
 *      per crossed tile would turn the sweep into a toggle chain, so sweeping
 *      back over the anchor would silently un-select everything it had just
 *      selected.
 *   2. WHICH File the finger is over. That is a geometry question against
 *      MEASURED tile frames in list-content coordinates. Deriving it from the
 *      `174 dp` tile height, the column index or row arithmetic would break the
 *      moment layout, font scale or spacing changed -- and it would be wrong at
 *      every non-zero scroll offset, which is precisely where a sweep matters.
 *   3. WHEN the list scrolls itself. A sweep is unusable past the last visible
 *      row, so the list has to move under a stationary finger, in small bounded
 *      steps, and it has to stop the instant the gesture does.
 *
 * All three are pure and framework-free here, so they are directly testable
 * without a device. The screen owns the responder, the timers and the measured
 * frames; it never re-implements any of the rules.
 *
 * THE PRODUCT CONTRACT, stated once:
 *
 *   hold an UNSELECTED File   -> mode ADD     -> it and every crossed File become selected
 *   hold a SELECTED File      -> mode REMOVE  -> it and every crossed File become deselected
 *   re-cross a File           -> no-op        (each File is processed AT MOST ONCE per gesture)
 *   cross a Folder            -> ignored      (Folders are not selectable, by design)
 *   release / cancel / leave  -> the gesture, its visited set and any auto-scroll all end
 */

/** The two things a sweep can mean. Decided once, at the anchor. */
export type DragSelectionMode = 'add' | 'remove';

export interface DragSelectionGesture {
  /** The File the finger went down on. Never changes. */
  readonly anchorId: string;
  /** Fixed for the whole gesture. Never re-derived. */
  readonly mode: DragSelectionMode;
  /** Every File this gesture already processed, the anchor included. */
  readonly visited: ReadonlySet<string>;
}

/**
 * Begin a gesture from the File under the held pointer.
 *
 * The mode comes from the anchor's CURRENT selection state: holding something
 * unselected means "I am adding a run of Files", holding something already
 * selected means "I am removing a run of Files". That is the whole difference
 * from a generic per-tile toggle, and it is why the anchor's state is sampled
 * exactly once.
 */
export function beginDragSelection(input: { readonly anchorId: string; readonly anchorSelected: boolean }): DragSelectionGesture {
  const visited = new Set<string>([input.anchorId]);
  return {
    anchorId: input.anchorId,
    mode: input.anchorSelected ? 'remove' : 'add',
    visited,
  };
}

/** The selection state every File crossed by this gesture must end up in. */
export const dragSelectionTargetSelected = (gesture: DragSelectionGesture): boolean => gesture.mode === 'add';

/**
 * Fold one crossed File into the gesture.
 *
 * Returns the SAME gesture object when the File was already visited, which is
 * what makes "at most once" a structural property rather than a convention: a
 * re-cross cannot even reach the selection, so it cannot toggle twice. The
 * caller gets a fresh `visited` set only on the transition.
 */
export function applyDragSelectionStep(gesture: DragSelectionGesture, fileId: string): DragSelectionGesture {
  if (gesture.visited.has(fileId)) return gesture;
  const visited = new Set(gesture.visited);
  visited.add(fileId);
  return { ...gesture, visited };
}

// ═══════════════════════════════════════════════════════════════════════════
// MEASURED HIT TESTING — list-content coordinates, never row arithmetic
// ═══════════════════════════════════════════════════════════════════════════

/** A measured tile, in list-content coordinates. */
export interface TileFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type FileTileFrames = ReadonlyMap<string, TileFrame>;

/**
 * Record one MEASURED File tile frame.
 *
 * Only File tiles are ever registered, which is why a Folder can never be swept:
 * a Folder has no entry here, so a hit test can never return one. The map is
 * copied rather than mutated so a frame map is a value, and a stale frame map can
 * never be half-updated from a layout callback.
 */
export function recordFileTileFrame(frames: FileTileFrames, fileId: string, frame: TileFrame): FileTileFrames {
  const next = new Map(frames);
  next.set(fileId, frame);
  return next;
}

/**
 * Convert a pointer position into list-content coordinates.
 *
 * `pageY - listPageY + contentOffsetY` is the whole conversion: the list's own
 * frame puts the viewport in page space, and the content offset lifts the content
 * that is scrolled out of the viewport. Both are MEASURED, so this stays correct
 * at any scroll offset, with any number of columns, inside any folder and at any
 * screen size.
 */
export function pointerToListContent(input: {
  readonly pageX: number;
  readonly pageY: number;
  readonly listPageY: number;
  readonly contentOffsetY: number;
}): { readonly x: number; readonly y: number } {
  return { x: input.pageX, y: input.pageY - input.listPageY + input.contentOffsetY };
}

/**
 * Which File tile is under this content point, if any?
 *
 * Frames are measured, so a gap between tiles — the `spacing` gutter, or the space
 * a partially scrolled row leaves at the edge — returns `null` instead of
 * selecting the nearest neighbour. A sweep that silently grabs the wrong File is
 * worse than a sweep that briefly selects nothing.
 */
export function hitTestFileTile(frames: FileTileFrames, x: number, y: number): string | null {
  for (const [fileId, frame] of frames) {
    if (x >= frame.x && x < frame.x + frame.width && y >= frame.y && y < frame.y + frame.height) return fileId;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-SCROLL — a stationary finger must be able to reach the rest of the list
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The gesture's auto-scroll budget.
 *
 * Small bounded steps on a short tick, deliberately NOT fling physics: a sweep
 * must place Files under a finger that is not moving, and momentum would carry
 * past the File the member is aiming at. `tickMs` is the smallest interval that
 * still produces a visible scroll on a 60 Hz surface without starving the UI
 * thread.
 */
export const DRAG_AUTO_SCROLL = {
  /** How close to a viewport edge the finger has to be. */
  edgeZoneDp: 72,
  /** How far the list moves per tick. */
  stepDp: 12,
  tickMs: 16,
} as const;

/**
 * The next scroll offset for an armed pointer, or `null` for "do not scroll".
 *
 * Returns `null` when the finger is in the middle of the viewport, when it is in
 * an edge zone but the list is already at that end, or when the clamped offset
 * would not move at all. That last case is what makes stopping safe: once the top
 * of the list is reached while sweeping upward, the tick does nothing instead of
 * firing forever against a boundary.
 */
export function dragAutoScrollNextOffset(input: {
  /** The pointer's Y inside the LIST viewport, in dp. */
  readonly pointerViewportY: number;
  readonly viewportHeightDp: number;
  readonly currentOffsetDp: number;
  /** `max(0, contentHeight - viewportHeight)`. */
  readonly maxOffsetDp: number;
  readonly edgeZoneDp?: number;
  readonly stepDp?: number;
}): number | null {
  const zone = input.edgeZoneDp ?? DRAG_AUTO_SCROLL.edgeZoneDp;
  const step = input.stepDp ?? DRAG_AUTO_SCROLL.stepDp;
  let direction = 0;
  if (input.pointerViewportY <= zone) direction = -1;
  else if (input.pointerViewportY >= input.viewportHeightDp - zone) direction = 1;
  if (direction === 0) return null;
  const upperBound = Math.max(0, input.maxOffsetDp);
  const lowerBound = 0;
  const desired = input.currentOffsetDp + direction * step;
  const clamped = Math.min(upperBound, Math.max(lowerBound, desired));
  if (clamped === input.currentOffsetDp) return null;
  return clamped;
}

/** The measured geometry the auto-scroll needs. Kept here so the shape is testable. */
export interface ListViewportGeometry {
  /** Where the list's top edge is in PAGE coordinates. */
  readonly listPageY: number;
  readonly viewportHeightDp: number;
  readonly contentHeightDp: number;
}

export const listMaxOffset = (geometry: ListViewportGeometry): number =>
  Math.max(0, geometry.contentHeightDp - geometry.viewportHeightDp);
