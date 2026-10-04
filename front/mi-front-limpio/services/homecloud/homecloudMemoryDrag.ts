/**
 * HomeCloud MO-A3 — Memory SELECTION DRAG (pure, framework free).
 *
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------
 * Drag-select is the one interaction in MO-A3 that cannot be proven by reading a
 * component: whether a Memory changes ONCE per continuous drag, whether the
 * finger crossing a gap selects nothing, whether the edge ticker can run away.
 * Those are all STATE decisions, so they live here with no React and no React
 * Native, and the RN wrapper only adapts touch events into this machine.
 *
 * THE RESPONDER TRANSFER, STATED HONESTLY
 * ---------------------------------------
 * The touch starts BEFORE the long press arms the drag. `onStartShouldSet*` is
 * therefore never re-run after arming, and this module does not pretend
 * otherwise: arming is a boolean the wrapper owns, and takeover happens in the
 * MOVE phase through `onMoveShouldSetPanResponder`. Normal scrolling is never
 * stolen, because the takeover predicate is false until the long press fires.
 *
 * VISITED-ONCE SEMANTICS
 * ----------------------
 * A drag visits a Set of ids. The FIRST time the finger crosses an id, the
 * machine applies the gesture mode (select | deselect) and records the visit.
 * Every later crossing of that same id — including the finger coming BACK over
 * it — is a no-op. So a Memory changes at most ONCE per continuous gesture and
 * a diagonal drag back over the origin cell cannot undo or re-apply it. A NEW
 * gesture resets the visited set.
 *
 * HIT TESTING IS A REGISTRY, NEVER AN INDEX
 * -----------------------------------------
 * Timeline rows have variable height and the SectionList virtualizes them, so
 * there is no honest way to derive "the cell under the finger" from an array
 * position. The owner registers ONLY MOUNTED rows, each with its own measured
 * bounds and the `contentId`s it renders; unmounting removes the entry. A
 * virtualized cell therefore cannot leave a stale hit zone behind.
 */

/** Gesture direction of one continuous drag, decided by its FIRST cell. */
export type MemoryDragMode = 'select' | 'deselect';

/**
 * A mounted row of Memories.
 *
 * `bounds` and the per-card `cells` bounds are expected in ONE coordinate space
 * — whatever the measurement abstraction of the owner resolves in (see
 * `MEMORY_ROW_MEASUREMENT`). The resolver is space-agnostic: it only ever
 * compares coordinates with coordinates.
 */
export interface MemoryRowHitZone {
  readonly rowKey: string;
  readonly bounds: MemoryRect;
  /** One entry per rendered Memory, in render order. */
  readonly cells: readonly MemoryCellHitZone[];
}

export interface MemoryRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MemoryCellHitZone {
  readonly contentId: string;
  readonly bounds: MemoryRect;
}

/**
 * The ONE measurement abstraction.
 *
 * `window` is the default because it is unambiguous under SectionList
 * virtualization: window coordinates need no scroll-offset correction and no
 * ancestor assumption, so a registry entry cannot silently drift while the list
 * scrolls. `layout` exists behind the same seam (row bounds relative to a stable
 * ancestor + the live scroll offset) and is NOT enabled until real device
 * evidence proves its coordinate space is consistent for every mounted row.
 *
 * The selection/drag architecture does NOT change between them: both produce
 * registry entries in the resolver's coordinate space.
 */
export type MemoryRowMeasurementSpace = 'window' | 'layout';

export const MEMORY_ROW_MEASUREMENT: MemoryRowMeasurementSpace = 'window';

/** True when the point is inside the rect (edges are inclusive on x, exclusive bottom). */
export function rectContains(rect: MemoryRect, x: number, y: number): boolean {
  return (
    Number.isFinite(x)
    && Number.isFinite(y)
    && x >= rect.x
    && x <= rect.x + rect.width
    && y >= rect.y
    && y < rect.y + rect.height
  );
}

export interface MemoryHitResolution {
  readonly rowKey: string;
  readonly contentId: string;
}

/**
 * Resolve one finger position to a Memory.
 *
 * Returns `null` for whitespace, a gap, a trailing spacer, a section header or a
 * position with no mounted row under it: those select NOTHING.
 *
 * The per-card bounds are AUTHORITATIVE when they exist. That matters: the row
 * lays its cells out with an explicit gap, so a point in the 8pt between two
 * cells is not inside any cell and must not be attributed to the nearest one by
 * arithmetic. The equal-column fallback therefore only applies to a row whose
 * cells were never measured individually at all — never to a gap of a measured
 * row.
 */
export function resolveMemoryAtPoint(
  zones: readonly MemoryRowHitZone[],
  x: number,
  y: number,
): MemoryHitResolution | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  let row: MemoryRowHitZone | null = null;
  // Later registrations are painted on top, so the LAST containing row wins.
  for (const zone of zones) {
    if (rectContains(zone.bounds, x, y)) row = zone;
  }
  if (row === null) return null;

  const measured = row.cells.filter(
    (cell) => cell.bounds.width > 0 && cell.bounds.height > 0,
  );
  if (measured.length > 0) {
    for (const cell of measured) {
      if (rectContains(cell.bounds, x, y)) return { rowKey: row.rowKey, contentId: cell.contentId };
    }
    // Inside a measured row but outside every cell: a gap or a trailing spacer.
    return null;
  }

  if (row.cells.length === 0) return null;
  const relative = x - row.bounds.x;
  if (relative < 0 || relative > row.bounds.width) return null;
  const columnWidth = row.bounds.width / row.cells.length;
  const index = Math.floor(relative / columnWidth);
  if (index < 0 || index >= row.cells.length) return null;
  const contentId = row.cells[index]?.contentId;
  return contentId === undefined ? null : { rowKey: row.rowKey, contentId };
}

/** The ids a finger position crosses, i.e. everything currently under it. */
export function resolveMemoryIdsAtPoint(
  zones: readonly MemoryRowHitZone[],
  x: number,
  y: number,
): readonly string[] {
  const hit = resolveMemoryAtPoint(zones, x, y);
  return hit === null ? [] : [hit.contentId];
}

// ===========================================================================
// THE MOUNTED-ROW REGISTRY
// ===========================================================================

/**
 * One registered row plus the IDENTITY TOKEN that produced it.
 *
 * The token is the exact object the row handed over. Removal is guarded by it
 * on purpose: when the selection surface changes, the outgoing list's passive
 * cleanup can run AFTER the incoming list already registered a row with the same
 * key, and an unguarded delete would silently punch a hole in the hit test.
 */
export interface MemoryRowRegistration {
  readonly zone: MemoryRowHitZone;
  readonly token: object;
}

export type MemoryRowRegistry = Map<string, MemoryRowRegistration>;

/** Mounted rows only. Nothing is ever kept for a row that is not on screen. */
export function createMemoryRowRegistry(): MemoryRowRegistry {
  return new Map<string, MemoryRowRegistration>();
}

/**
 * Publish (or refresh) one row.
 *
 * Returns true when the row was NOT already registered, i.e. when the mounted
 * set GREW. That is the one moment the owner should re-evaluate an in-flight
 * drag: a row that just mounted may be under a stationary finger.
 */
export function registerMemoryRow(
  registry: MemoryRowRegistry,
  rowKey: string,
  zone: MemoryRowHitZone | null,
  token: object,
): boolean {
  const existed = registry.has(rowKey);
  if (zone === null) {
    registry.delete(rowKey);
    return !existed;
  }
  registry.set(rowKey, { zone, token });
  return !existed;
}

/** Remove a row, but ONLY the exact registration it published. */
export function unregisterMemoryRow(registry: MemoryRowRegistry, rowKey: string, token: object): boolean {
  const current = registry.get(rowKey);
  if (current === undefined) return false;
  if (current.token !== token) return false;
  registry.delete(rowKey);
  return true;
}

/** The zones the resolver may hit-test. Mounted rows only. */
export function memoryRowZones(registry: MemoryRowRegistry): MemoryRowHitZone[] {
  const zones: MemoryRowHitZone[] = [];
  registry.forEach((registration) => zones.push(registration.zone));
  return zones;
}

/** Drop every row. Household switch, sign-out and unmount all funnel here. */
export function clearMemoryRowRegistry(registry: MemoryRowRegistry): void {
  registry.clear();
}

export type MemoryDragState = {
  /** False until the long press arms the drag. */
  readonly armed: boolean;
  readonly active: boolean;
  readonly mode: MemoryDragMode | null;
  readonly visitedIds: ReadonlySet<string>;
  /** The last position the finger was seen at, kept for re-hit-testing. */
  readonly fingerX: number | null;
  readonly fingerY: number | null;
};

export const MEMORY_DRAG_IDLE: MemoryDragState = {
  armed: false,
  active: false,
  mode: null,
  visitedIds: new Set<string>(),
  fingerX: null,
  fingerY: null,
};

/**
 * ARM: the long press fired.
 *
 * This is the ONLY place `armed` becomes true, and it deliberately does not
 * start the drag: the finger still has to MOVE before the responder is
 * negotiated, which is what keeps a normal scroll intact.
 */
export function armMemoryDrag(state: MemoryDragState): MemoryDragState {
  if (state.active) return state;
  if (state.armed) return state;
  return { ...state, armed: true };
}

/**
 * BEGIN: the responder was granted, so the drag owns the pointer.
 *
 * The mode comes from the FIRST cell only. A drag that starts on an unselected
 * Memory selects everything it crosses; a drag that starts on a selected Memory
 * deselects everything it crosses. Mixing them per cell would make the same
 * gesture mean different things in different places.
 */
export function beginMemoryDrag(
  state: MemoryDragState,
  startContentId: string,
  isSelected: (contentId: string) => boolean,
): MemoryDragState {
  if (!state.armed || typeof startContentId !== 'string' || startContentId.length === 0) return state;
  const mode: MemoryDragMode = isSelected(startContentId) ? 'deselect' : 'select';
  // A fresh gesture ALWAYS starts with a fresh visited set.
  return {
    armed: true,
    active: true,
    mode,
    visitedIds: new Set<string>(),
    fingerX: null,
    fingerY: null,
  };
}

export type MemoryDragStep =
  | { readonly kind: 'idle' }
  | { readonly kind: 'applied'; readonly mode: MemoryDragMode; readonly contentIds: readonly string[] };

/**
 * ONE MOVE.
 *
 * The ids crossed since the previous move are resolved by the caller (which owns
 * the registry and the coordinate space) and applied here. Ids already visited
 * in THIS gesture are dropped, which is what makes a reversal a no-op.
 */
export function stepMemoryDrag(
  state: MemoryDragState,
  crossedContentIds: Iterable<string>,
): { readonly state: MemoryDragState; readonly step: MemoryDragStep } {
  if (!state.active || state.mode === null) return { state, step: { kind: 'idle' } };
  const visitedIds = new Set(state.visitedIds);
  const fresh: string[] = [];
  for (const contentId of crossedContentIds) {
    if (visitedIds.has(contentId)) continue;
    visitedIds.add(contentId);
    fresh.push(contentId);
  }
  if (fresh.length === 0) {
    // No state write for an empty move: the visited set did not change.
    return { state, step: { kind: 'idle' } };
  }
  return {
    state: { ...state, visitedIds },
    step: { kind: 'applied', mode: state.mode, contentIds: fresh },
  };
}

/** Record the current finger position. Does NOT change the selection. */
export function moveMemoryDragPointer(
  state: MemoryDragState,
  x: number,
  y: number,
): MemoryDragState {
  if (!state.active) return state;
  return { ...state, fingerX: x, fingerY: y };
}

/**
 * END: release, terminate, cancel or unmount.
 *
 * There is exactly ONE way out and it clears everything: the mode, the visited
 * set and the pointer. The arming flag is intentionally dropped too, so a
 * second gesture has to press and hold again instead of silently becoming a
 * drag.
 */
export function endMemoryDrag(state: MemoryDragState): MemoryDragState {
  return {
    armed: false,
    active: false,
    mode: null,
    visitedIds: new Set<string>(),
    fingerX: null,
    fingerY: null,
  };
}

// ===========================================================================
// EDGE AUTO-SCROLL
// ===========================================================================

/**
 * Named constants, no inline magic numbers.
 *
 * `EDGE_BAND_RATIO` is a fraction of the scrollable viewport height reserved at
 * each end. A finger inside the band scrolls; a finger in the middle does not.
 */
export const MEMORY_DRAG_EDGE_BAND_RATIO = 0.18;
/** px per tick at the very edge of the band. */
export const MEMORY_DRAG_MIN_EDGE_SPEED_PX = 6;
/** Hard upper bound: a drag can never fling the list. */
export const MEMORY_DRAG_MAX_EDGE_SPEED_PX = 28;
/** One tick ≈ one frame. Programmatic scrolling is always `animated: false`. */
export const MEMORY_DRAG_TICK_MS = 16;

export type MemoryEdgeAutoScroll = {
  /** -1 up, +1 down, 0 neutral (no auto-scroll at all). */
  readonly direction: -1 | 0 | 1;
  /** px to advance on this tick. Always 0 when direction is 0. */
  readonly speed: number;
  /** 0..1 how deep into the edge band the finger is, for tests and debugging. */
  readonly penetration: number;
};

/**
 * Where a finger sits relative to the viewport edges.
 *
 * The speed is MONOTONIC with penetration and always BOUNDED: 0 in the middle,
 * growing linearly to `MAX` at the very edge, and `MIN` at the band boundary so
 * the transition from "not auto-scrolling" to "auto-scrolling" is smooth rather
 * than a jump.
 */
export function solveMemoryEdgeAutoScroll(
  fingerY: number,
  viewportHeight: number,
  bandRatio: number = MEMORY_DRAG_EDGE_BAND_RATIO,
): MemoryEdgeAutoScroll {
  const neutral = { direction: 0 as const, speed: 0, penetration: 0 };
  if (!Number.isFinite(fingerY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return neutral;
  const ratio = Number.isFinite(bandRatio) && bandRatio > 0 && bandRatio < 0.5 ? bandRatio : MEMORY_DRAG_EDGE_BAND_RATIO;
  const band = viewportHeight * ratio;
  if (band <= 0) return neutral;

  if (fingerY < band) {
    // Upper edge band: dragging the finger UP scrolls the content UP.
    const penetration = Math.min(1, Math.max(0, (band - fingerY) / band));
    return { direction: -1, speed: scaleEdgeSpeed(penetration), penetration };
  }
  const lowerStart = viewportHeight - band;
  if (fingerY > lowerStart) {
    const penetration = Math.min(1, Math.max(0, (fingerY - lowerStart) / band));
    return { direction: 1, speed: scaleEdgeSpeed(penetration), penetration };
  }
  return neutral;
}

function scaleEdgeSpeed(penetration: number): number {
  const clamped = Math.min(1, Math.max(0, penetration));
  const span = MEMORY_DRAG_MAX_EDGE_SPEED_PX - MEMORY_DRAG_MIN_EDGE_SPEED_PX;
  return Math.round(MEMORY_DRAG_MIN_EDGE_SPEED_PX + span * clamped);
}

export interface EdgeAutoScrollSchedule {
  /** `(tick, ms) => handle`. Injected so the tests drive a fake clock. */
  readonly schedule: (tick: () => void, ms: number) => unknown;
  readonly cancel: (handle: unknown) => void;
}

export interface MemoryEdgeTicker {
  /** Idempotent. Safe from release, terminate, cancel, confirm and unmount. */
  readonly stop: () => void;
  readonly isRunning: () => boolean;
  /** Feed the current finger position; direction/speed are derived here. */
  readonly update: (fingerY: number) => void;
  /** Ticks emitted since the last `stop()`. Diagnostic only. */
  readonly tickCount: () => number;
}

export type MemoryEdgeTickerOptions = EdgeAutoScrollSchedule & {
  readonly viewportHeight: () => number;
  /** Advance the list by `direction * speed`. Never animated. */
  readonly scrollBy: (deltaPx: number) => void;
  /**
   * Re-run hit testing after a programmatic scroll, because newly revealed rows
   * may now be under a stationary finger.
   */
  readonly onScrolled?: (deltaPx: number) => void;
};

/**
 * THE CENTRAL AUTO-SCROLL DRIVER.
 *
 * A runaway ticker is a blocking correctness bug, so the whole surface is one
 * handle plus ONE idempotent `stop()`. `stop()` is safe to call any number of
 * times, from any cause: finger release, gesture terminate, cancel, confirm,
 * unmount, household switch, sign-out, AppState background and destination
 * invalidation all funnel through it.
 */
export function createMemoryEdgeTicker(options: MemoryEdgeTickerOptions): MemoryEdgeTicker {
  let handle: unknown = null;
  let ticks = 0;
  let lastDirection: -1 | 0 | 1 = 0;
  let lastSpeed = 0;
  // The tick closure is stable, so re-entering it is impossible.
  const tick = () => {
    if (lastDirection === 0 || lastSpeed === 0) return;
    const delta = lastDirection * lastSpeed;
    ticks += 1;
    options.scrollBy(delta);
    options.onScrolled?.(delta);
  };

  const stop = () => {
    if (handle !== null) {
      options.cancel(handle);
      handle = null;
    }
    lastDirection = 0;
    lastSpeed = 0;
  };

  const ensureRunning = () => {
    if (handle !== null) return;
    handle = options.schedule(tick, MEMORY_DRAG_TICK_MS);
  };

  return {
    stop,
    isRunning: () => handle !== null,
    tickCount: () => ticks,
    update(fingerY) {
      const solved = solveMemoryEdgeAutoScroll(fingerY, options.viewportHeight());
      lastDirection = solved.direction;
      lastSpeed = solved.speed;
      if (solved.direction === 0) {
        // The finger left the band: the ticker stops instead of idling, so it
        // can never keep burning frames for a gesture that is not asking for it.
        stop();
        return;
      }
      ensureRunning();
    },
  };
}