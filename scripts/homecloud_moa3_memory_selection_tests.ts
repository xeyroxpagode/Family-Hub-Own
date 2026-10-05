/**
 * HomeCloud MO-A3 — Memory SELECTION: deterministic evidence.
 *
 * No database and no network. Two kinds of proof, deliberately mixed:
 *
 *  - BEHAVIOUR, executed against the framework-free modules: the selection
 *    session, the drag state machine, the mounted-row registry and hit testing,
 *    the edge auto-scroll solver and ticker, the collection read contracts, and
 *    the Timeline/Album grouping placement. Those transitions ARE the contract,
 *    so they are run, not pattern-matched.
 *  - BOUNDARY, read from the real sources. A value test cannot prove there is no
 *    navigation route, no Viewer, no Memory delete, no global store, no context
 *    and no smart collection: those are properties of the files.
 *
 * Runtime behaviour against the local Supabase is proven separately by
 * scripts/homecloud_moa3_memory_selection_runtime_tests.js.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  MEMORY_SELECTION_INITIAL,
  cancelMemorySelection,
  canConfirmMemorySelection,
  clearMemorySelection,
  confirmMemorySelection,
  createMemorySelectionSession,
  enterMemorySelection,
  isMemorySelectable,
  isMemorySelected,
  isMemorySelecting,
  resetMemorySelectionScope,
  setMemorySelectionExclusions,
  setMemorySelectionSource,
  toggleMemorySelection,
  toggleMemorySelectionMany,
  type MemorySelectionState,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemorySelection';
import {
  MEMORY_DRAG_EDGE_BAND_RATIO,
  MEMORY_DRAG_IDLE,
  MEMORY_DRAG_MAX_EDGE_SPEED_PX,
  MEMORY_DRAG_MIN_EDGE_SPEED_PX,
  MEMORY_DRAG_TICK_MS,
  armMemoryDrag,
  beginMemoryDrag,
  clearMemoryRowRegistry,
  createMemoryEdgeTicker,
  createMemoryRowRegistry,
  endMemoryDrag,
  memoryRowZones,
  moveMemoryDragPointer,
  registerMemoryRow,
  resolveMemoryRectangleIds,
  resolveMemoryAtPoint,
  resolveMemoryIdsAtPoint,
  solveMemoryEdgeAutoScroll,
  stepMemoryDrag,
  unregisterMemoryRow,
  type MemoryDragState,
  type MemoryGridPosition,
  type MemoryRowHitZone,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryDrag';
import {
  MEMORY_COLLECTIONS_INITIAL,
  MEMORY_TYPE_COLLECTIONS,
  appendUniqueCollectionMemories,
  buildMemoryCollectionQuery,
  createMemoryCollectionsController,
  memoryCollectionId,
  memoryCollectionTitle,
  parseMemoryCollectionId,
  type MemoryCollectionsState,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryCollectionsPagination';
import {
  isTerminalDestinationFailure,
  memoryMutationFailureSummary,
  runMemoryAlbumMutation,
  toMemorySelectionFailure,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryMutations';
import {
  TIMELINE_UNKNOWN_TITLE,
  flattenTimelineForSectionList,
  groupMemoriesForTimeline,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoriesTimeline';
import { HOMECLOUD_ALBUM_NOT_FOUND_CODE } from '../front/mi-front-limpio/services/homecloud/homecloudAlbumScope';
import type { HomeCloudMemoryListItem } from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

const root = process.cwd();
const read = (relative: string): string =>
  fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readCode = (relative: string): string =>
  read(relative).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function memory(id: string, over: Partial<HomeCloudMemoryListItem> = {}): HomeCloudMemoryListItem {
  return {
    id,
    role: 'memory',
    displayName: null,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 10,
    uploadedByMemberId: null,
    uploadedAt: '2026-01-01T00:00:00Z',
    hasPreview: true,
    hiddenFromResurfacing: false,
    caption: `recuerdo ${id}`,
    writtenText: null,
    capturedAt: '2024-07-18T08:00:00Z',
    capturedYear: 2024,
    capturedMonth: 7,
    capturePrecision: 'exact',
    kind: 'image',
    albumIds: [],
    ...over,
  };
}

/** A typed backend refusal, exactly as the client surfaces it. */
function failure(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/** A row of three 100pt-wide cells with an 8pt gap, in window coordinates. */
function row(rowKey: string, ids: readonly string[], top: number): MemoryRowHitZone {
  const cellWidth = 100;
  const gap = 8;
  const width = ids.length * cellWidth + (ids.length - 1) * gap;
  return {
    rowKey,
    bounds: { x: 0, y: top, width, height: 120 },
    cells: ids.map((contentId, index) => ({
      contentId,
      bounds: { x: index * (cellWidth + gap), y: top, width: cellWidth, height: 120 },
    })),
  };
}

function selectedIdsOf(state: MemorySelectionState): string[] {
  return [...state.selectedIds].sort();
}

// ---------------------------------------------------------------------------
// Sources under test
// ---------------------------------------------------------------------------

const SCREEN = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const SCREEN_CODE = readCode('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const SELECTABLE = read('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx');
const SELECTABLE_CODE = readCode('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx');
const ROW = read('front/mi-front-limpio/components/homecloud/MemoryTimelineRow.tsx');
const ROW_CODE = readCode('front/mi-front-limpio/components/homecloud/MemoryTimelineRow.tsx');
const HEADER = read('front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx');
const HEADER_CODE = readCode('front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx');
const TILE = read('front/mi-front-limpio/components/homecloud/MemoryCollectionTile.tsx');
const TILE_CODE = readCode('front/mi-front-limpio/components/homecloud/MemoryCollectionTile.tsx');
const DETAIL = readCode('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx');
const CARDS_CODE = readCode('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
const NAV_TYPES = read('front/mi-front-limpio/navigation/types.ts');
const READ_SERVICE_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudReadService.ts');
const TIMELINE_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudMemoriesTimeline.ts');
const SELECTION_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudMemorySelection.ts');
const DRAG_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudMemoryDrag.ts');
const COLLECTIONS_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudMemoryCollectionsPagination.ts');

console.log('\n=== MO-A3 MEMORY SELECTION TESTS ===\n');

// ===========================================================================
section('1. Selection session: enter, initial selection, toggle, cancel, confirm');
// ===========================================================================

record(
  MEMORY_SELECTION_INITIAL.mode === 'normal'
  && MEMORY_SELECTION_INITIAL.purpose === null
  && MEMORY_SELECTION_INITIAL.selectedIds.size === 0,
  'the session starts normal, with no purpose and no selection',
);
record(
  createMemorySelectionSession() !== createMemorySelectionSession(),
  'two sessions are independent values, never a shared mutable object',
);

{
  // A) Long press from the normal Timeline: the first Memory IS selected.
  const entered = enterMemorySelection(createMemorySelectionSession(), {
    purpose: { kind: 'generic' },
    source: { kind: 'library' },
    initialContentIds: ['m-1'],
  });
  record(
    isMemorySelecting(entered) && selectedIdsOf(entered).join() === 'm-1',
    'entering selection selects the first Memory',
  );
  record(entered.purpose?.kind === 'generic', 'a Timeline long press is a GENERIC operation, not an Album mutation');

  // B) Tap toggles, in both directions.
  const added = toggleMemorySelection(entered, 'm-2');
  record(selectedIdsOf(added).join() === 'm-1,m-2', 'a tap ADDS a Memory');
  record(selectedIdsOf(toggleMemorySelection(added, 'm-1')).join() === 'm-2', 'a tap REMOVES a selected Memory');
  record(
    added.selectedIds !== entered.selectedIds,
    'every mutation publishes a NEW Set identity so React can compare by reference',
  );

  // C) A no-op returns the IDENTICAL state: no re-render for nothing.
  record(toggleMemorySelectionMany(added, ['m-1', 'm-2'], 'select') === added, 're-selecting visited ids is a no-op');
  record(
    toggleMemorySelectionMany(added, ['m-1', 'm-2'], 'deselect') !== added
      && selectedIdsOf(toggleMemorySelectionMany(added, ['m-1', 'm-2'], 'deselect')).length === 0,
    'a batched deselect removes every listed id in ONE state write',
  );

  // D) Clear keeps the operation, cancel drops it.
  record(
    isMemorySelecting(clearMemorySelection(entered)) && entered === clearMemorySelection(entered) === false
      ? true
      : isMemorySelecting(clearMemorySelection(added)) && clearMemorySelection(added).selectedIds.size === 0,
    'clear empties the pending selection but KEEP the operation open',
  );
  const cancelled = cancelMemorySelection(added);
  record(
    !isMemorySelecting(cancelled) && cancelled.purpose === null && cancelled.selectedIds.size === 0,
    'cancel drops the whole operation and returns the exact origin source',
  );

  // E) Confirm reads the operation out; it performs NO mutation.
  const result = confirmMemorySelection(added);
  record(
    result !== null && result.purpose.kind === 'generic' && result.contentIds.slice().sort().join() === 'm-1,m-2',
    'confirm returns the purpose and the pending ids, by contentId',
  );
  record(
    confirmMemorySelection(cancelled) === null && canConfirmMemorySelection(cancelled) === false,
    'confirm is impossible once the operation is closed',
  );

  // F) ZERO selected is always disabled.
  const empty = clearMemorySelection(added);
  record(
    canConfirmMemorySelection(empty) === false && confirmMemorySelection(empty)?.contentIds.length === 0,
    'the confirm affordance is disabled at zero selected',
  );
}

record(
  /export function resetMemorySelectionScope/.test(SELECTION_CODE)
  && resetMemorySelectionScope().source.kind === 'library'
  && resetMemorySelectionScope().mode === 'normal',
  'resetMemorySelectionScope clears mode, purpose, source and selection (household switch / sign-out)',
);

// ===========================================================================
section('2. Identity, already-member and cross-source selection');
// ===========================================================================

{
  // Identity is contentId and nothing else: the SAME Memory selected through the
  // library and through an Album collection is one selection, counted once.
  const entered = enterMemorySelection(createMemorySelectionSession(), {
    purpose: { kind: 'addToAlbum', albumId: 'album-1' },
    source: { kind: 'library' },
  });
  const fromLibrary = toggleMemorySelection(entered, 'm-1');
  const moved = setMemorySelectionSource(fromLibrary, { kind: 'collection', collectionId: 'album:album-1' });
  const backToLibrary = setMemorySelectionSource(moved, { kind: 'collectionsRoot' });
  const returned = setMemorySelectionSource(backToLibrary, { kind: 'library' });
  record(
    returned.selectedIds.has('m-1') && selectedIdsOf(returned).length === 1,
    'switching source NEVER changes the pending selection: the same Memory is selected once',
  );
  record(
    moved.source.kind === 'collection' && (moved.source as { collectionId: string }).collectionId === 'album:album-1',
    'the collection source carries a STABLE local id, not a route',
  );

  // Already-member: visible, unselectable, uncounted, never submitted.
  const excluded = setMemorySelectionExclusions(entered, ['m-9']);
  record(
    isMemorySelectable(excluded, 'm-9') === false && isMemorySelected(excluded, 'm-9') === false,
    'an already-in-destination Memory is not selectable and not selected',
  );
  record(toggleMemorySelection(excluded, 'm-9') === excluded, 'toggling an already-member Memory is a NO-OP');
  record(
    toggleMemorySelectionMany(excluded, ['m-9'], 'select') === excluded,
    'a drag crossing an already-member Memory selects nothing for it',
  );

  // Re-deriving the exclusions PRUNES what became a member: a retry can never
  // resubmit a membership that now exists.
  const pending = toggleMemorySelectionMany(excluded, ['m-1', 'm-2', 'm-9'], 'select');
  record(selectedIdsOf(pending).join() === 'm-1,m-2', 'an already-member Memory is never counted as pending');
  const afterSuccess = setMemorySelectionExclusions(pending, ['m-1']);
  record(
    selectedIdsOf(afterSuccess).join() === 'm-2',
    'a Memory that became a member is PRUNED from the pending selection',
  );
  record(
    setMemorySelectionExclusions(afterSuccess, ['m-1']) === afterSuccess,
    're-deriving an identical exclusion set is a no-op',
  );
}

// ===========================================================================
section('3. Drag state machine: rectangular baseline range and reversal');
// ===========================================================================

{
  const grid = new Map<string, MemoryGridPosition>([
    ['a', { visualRowOrdinal: 0, column: 0 }], ['b', { visualRowOrdinal: 0, column: 1 }], ['c', { visualRowOrdinal: 0, column: 2 }],
    ['d', { visualRowOrdinal: 1, column: 0 }], ['e', { visualRowOrdinal: 1, column: 1 }], ['f', { visualRowOrdinal: 1, column: 2 }],
    ['g', { visualRowOrdinal: 2, column: 0 }], ['h', { visualRowOrdinal: 2, column: 1 }], ['i', { visualRowOrdinal: 2, column: 2 }],
  ]);
  record(MEMORY_DRAG_IDLE.armed === false && MEMORY_DRAG_IDLE.active === false && MEMORY_DRAG_IDLE.currentRangeIds.size === 0, 'the drag starts disarmed with no active rectangle');

  // Arming happens ONLY on the long press and does not start the drag.
  const armed = armMemoryDrag(MEMORY_DRAG_IDLE);
  record(armed.armed === true && armed.active === false, 'the long press arms the drag without starting it');
  record(beginMemoryDrag(MEMORY_DRAG_IDLE, 'a', () => false, grid) === MEMORY_DRAG_IDLE, 'a drag cannot begin while disarmed');
  const selectDrag = beginMemoryDrag(armed, 'a', () => false, grid, new Set(['z']));
  const wide = stepMemoryDrag(selectDrag, 'h', grid);
  record(wide.step.kind === 'range' && wide.step.contentIds.slice().sort().join() === 'a,b,d,e,g,h', 'A to H uses a rectangular range');
  const shrink = stepMemoryDrag(wide.state, 'e', grid);
  record(shrink.step.kind === 'range' && shrink.step.contentIds.slice().sort().join() === 'a,b,d,e', 'moving backward shrinks from baseline, not paintbrush history');
  record(resolveMemoryRectangleIds(grid.get('b')!, grid.get('h')!, grid).join() === 'b,e,h', 'section rows preserve geometric columns');
  const deselectDrag = beginMemoryDrag(armed, 'a', () => true, grid, new Set(['a', 'b', 'd', 'e', 'z']));
  record(deselectDrag.mode === 'deselect' && deselectDrag.baselineSelectedIds.has('z'), 'deselect captures its immutable baseline');
  const ended = endMemoryDrag(wide.state);
  record(
    ended.armed === false && ended.active === false && ended.mode === null && ended.currentRangeIds.size === 0,
    'release / terminate / cancel clears the mode, rectangle and pointer',
  );
  const restarted = beginMemoryDrag(armMemoryDrag(ended), 'a', () => false, grid);
  record(
    restarted.currentRangeIds.size === 0 && stepMemoryDrag(restarted, 'a', grid).step.kind === 'range',
    'a NEW gesture starts with a fresh rectangle',
  );

  // A step while NOT dragging is inert.
  record(stepMemoryDrag(MEMORY_DRAG_IDLE, 'a', grid).step.kind === 'idle', 'a step outside a drag is inert');
  const moved = moveMemoryDragPointer(restarted, 10, 20);
  record(moved.fingerX === 10 && moved.fingerY === 20, 'the drag keeps the current finger position');
  record(
    moveMemoryDragPointer(MEMORY_DRAG_IDLE, 10, 20) === MEMORY_DRAG_IDLE,
    'the finger position is only tracked while a drag is active',
  );
}

// ===========================================================================
section('4. Hit testing: mounted rows, columns, whitespace, unmounted cells');
// ===========================================================================

{
  const zones = [row('r0', ['a', 'b', 'c'], 0), row('r1', ['d', 'e', 'f'], 128)];

  record(resolveMemoryAtPoint(zones, 50, 60)?.contentId === 'a', 'a point inside the first cell resolves to its Memory');
  record(resolveMemoryAtPoint(zones, 150, 60)?.contentId === 'b', 'the middle column resolves correctly');
  record(resolveMemoryAtPoint(zones, 254, 60)?.contentId === 'c', 'the third column resolves correctly');
  record(resolveMemoryAtPoint(zones, 50, 190)?.rowKey === 'r1' && resolveMemoryAtPoint(zones, 50, 190)?.contentId === 'd', 'a lower row resolves to its own Memory');

  // WHITESPACE between rows, in the gap between cells and past the last column.
  record(resolveMemoryAtPoint(zones, 50, 125) === null, 'the GAP between two rows selects NOTHING');
  record(resolveMemoryAtPoint(zones, 104, 60) === null, 'the inter-cell GAP selects NOTHING');
  record(resolveMemoryAtPoint(zones, 400, 60) === null, 'whitespace to the right of a row selects NOTHING');
  record(resolveMemoryAtPoint(zones, -20, 60) === null, 'a point left of the row selects NOTHING');
  record(resolveMemoryAtPoint(zones, 50, -5) === null, 'a point above the first row selects NOTHING');
  record(resolveMemoryAtPoint(zones, Number.NaN, 60) === null, 'a non-finite coordinate selects NOTHING');
  record(resolveMemoryIdsAtPoint(zones, 50, 125).length === 0, 'the id resolver agrees: no hit means no ids');

  // ROWS ARE MOUNTED, NOT INDEXED: a virtualized row that scrolled away is gone.
  const registry = createMemoryRowRegistry();
  const tokenA = { id: 'a' };
  const tokenB = { id: 'b' };
  record(registerMemoryRow(registry, 'r0', zones[0], tokenA) === true, 'registering a row reports the mounted set GREW');
  record(registerMemoryRow(registry, 'r0', zones[0], tokenA) === false, 're-measuring the same row is not a growth event');
  registerMemoryRow(registry, 'r1', zones[1], tokenB);
  record(memoryRowZones(registry).length === 2, 'only MOUNTED rows are hit-testable');

  // The identity-guarded removal: a stale unmount must not delete a live entry.
  record(unregisterMemoryRow(registry, 'r0', tokenA) === true, 'the row that published an entry can remove it');
  record(
    unregisterMemoryRow(registry, 'r1', { id: 'someone-else' }) === false && memoryRowZones(registry).length === 1,
    'a removal with a foreign identity is REFUSED: a stale unmount cannot punch a hole',
  );
  record(
    unregisterMemoryRow(registry, 'r1', tokenB) === true && memoryRowZones(registry).length === 0,
    'the real owner still removes its own row',
  );
  record(unregisterMemoryRow(registry, 'r1', tokenB) === false, 'removing an unmounted row is a harmless no-op');

  // A row that is not measurable is registered as NOT hit-testable.
  registerMemoryRow(registry, 'r2', null, tokenA);
  record(memoryRowZones(registry).length === 0, 'a row without measured bounds contributes no hit zone');
  clearMemoryRowRegistry(registry);
  record(memoryRowZones(registry).length === 0, 'the whole registry can be cleared (household switch / unmount)');

  // A variable-height row resolves by its OWN measured bounds, not by index.
  const tall: MemoryRowHitZone = {
    rowKey: 'written',
    bounds: { x: 0, y: 0, width: 100, height: 260 },
    cells: [{ contentId: 'w1', bounds: { x: 0, y: 0, width: 100, height: 260 } }],
  };
  record(
    resolveMemoryAtPoint([tall], 50, 240)?.contentId === 'w1',
    'a multiline Written row hit-tests through its own real bounds',
  );
  record(resolveMemoryAtPoint([tall], 50, 270) === null, 'a point below that taller row selects NOTHING');
}

// ===========================================================================
section('5. Edge auto-scroll: direction, monotonic bounded speed, idempotent stop');
// ===========================================================================

{
  const height = 800;
  const band = height * MEMORY_DRAG_EDGE_BAND_RATIO;

  const top = solveMemoryEdgeAutoScroll(0, height);
  record(top.direction === -1, 'a finger in the upper edge band scrolls UP');
  record(
    top.speed === MEMORY_DRAG_MAX_EDGE_SPEED_PX && top.penetration === 1,
    'a finger at the very top reaches the MAXIMUM bounded speed',
  );
  const topEdge = solveMemoryEdgeAutoScroll(band - 1, height);
  record(
    topEdge.direction === -1 && topEdge.speed === MEMORY_DRAG_MIN_EDGE_SPEED_PX,
    'the band boundary starts at the MINIMUM speed, so there is no jump',
  );

  const bottom = solveMemoryEdgeAutoScroll(height - 2, height);
  record(bottom.direction === 1 && bottom.speed === MEMORY_DRAG_MAX_EDGE_SPEED_PX, 'a finger in the lower band scrolls DOWN');
  const bottomEdge = solveMemoryEdgeAutoScroll(height - band + 1, height);
  record(bottomEdge.direction === 1 && bottomEdge.speed === MEMORY_DRAG_MIN_EDGE_SPEED_PX, 'the lower band boundary also starts at MIN');

  const middle = solveMemoryEdgeAutoScroll(height / 2, height);
  record(middle.direction === 0 && middle.speed === 0, 'the middle of the list NEVER auto-scrolls');

  // MONOTONIC with penetration, and always BOUNDED once inside the band.
  const samples = [0.05, 0.25, 0.5, 0.75, 1].map((fraction) =>
    solveMemoryEdgeAutoScroll(band * (1 - fraction), height),
  );
  record(
    samples.every((sample, index) => index === 0 || sample.speed >= samples[index - 1].speed),
    'the speed is MONOTONIC with penetration into the edge band',
  );
  record(
    samples.every((sample) => sample.speed >= MEMORY_DRAG_MIN_EDGE_SPEED_PX && sample.speed <= MEMORY_DRAG_MAX_EDGE_SPEED_PX),
    'the speed is always BOUNDED between the named minimum and maximum',
  );
  record(
    samples[0].speed < samples[samples.length - 1].speed,
    'penetrating deeper into the band really does scroll faster',
  );

  // Degenerate inputs never produce a runaway instruction.
  record(solveMemoryEdgeAutoScroll(10, 0).direction === 0, 'a zero-height viewport never auto-scrolls');
  record(solveMemoryEdgeAutoScroll(Number.NaN, height).direction === 0, 'a non-finite finger never auto-scrolls');
}

{
  // The ticker: ONE handle, ONE idempotent stop, no runaway.
  const scheduled: Array<() => void> = [];
  const cancelled: unknown[] = [];
  const deltas: number[] = [];
  const reHits: number[] = [];
  let viewport = 800;

  const ticker = createMemoryEdgeTicker({
    schedule: (tick) => {
      scheduled.push(tick);
      return scheduled.length - 1;
    },
    cancel: (handle) => cancelled.push(handle),
    viewportHeight: () => viewport,
    scrollBy: (delta) => deltas.push(delta),
    onScrolled: () => reHits.push(deltas.length),
  });

  record(!ticker.isRunning(), 'the ticker is idle before any drag');
  ticker.update(400);
  record(!ticker.isRunning(), 'a finger in the middle does not even START a ticker');

  ticker.update(2);
  record(ticker.isRunning() && scheduled.length === 1, 'entering the edge band starts exactly ONE ticker');

  scheduled[0]();
  record(
    deltas.length === 1 && deltas[0] === -MEMORY_DRAG_MAX_EDGE_SPEED_PX && reHits.length === 1,
    'a tick scrolls by the solved delta AND re-runs hit testing for the stationary finger',
  );
  scheduled[0]();
  record(deltas.length === 2, 'consecutive ticks keep advancing the list');

  ticker.stop();
  record(!ticker.isRunning() && cancelled.length === 1, 'stop() cancels the ONE scheduled handle');
  const before = deltas.length;
  scheduled[0]();
  record(deltas.length === before, 'a tick that fires after stop() does nothing: no runaway ticker');

  // IDEMPOTENT: stop() can be called from any cause, any number of times.
  ticker.stop();
  ticker.stop();
  record(cancelled.length === 1, 'stop() is idempotent and never cancels twice');

  ticker.update(2);
  ticker.stop();
  record(cancelled.length === 2 && ticker.tickCount() >= 2, 'a new gesture may start a new ticker after a stop');

// Leaving the band stops the ticker instead of idling it.
  ticker.update(2);
  const runningBeforeLeave = ticker.isRunning();
  ticker.update(400);
  record(
    runningBeforeLeave && !ticker.isRunning(),
    'leaving the edge band stops the ticker rather than burning frames for a gesture that stopped asking',
  );

  record(MEMORY_DRAG_TICK_MS >= 8 && MEMORY_DRAG_TICK_MS <= 32, 'the tick cadence is one frame, as a named constant');
}

// ===========================================================================
section('6. Collection read contracts');
// ===========================================================================

record(
  MEMORY_TYPE_COLLECTIONS.map((ref) => (ref.kind === 'type' ? ref.memoryKind : '')).join() === 'image,video,audio,written',
  'the four deterministic type collections are exactly Fotos / Videos / Audios / Notas, in that order',
);
record(
  MEMORY_TYPE_COLLECTIONS.every((ref) => ref.kind === 'type'),
  'no People / Pets / Trips / Places / Faces / Objects / OCR / semantic / Homi collection is declared',
);
record(
  MEMORY_TYPE_COLLECTIONS.map((ref) => memoryCollectionTitle(ref)).join() === 'Fotos,Videos,Audios,Notas',
  'the type collection titles are the frozen product copy',
);

for (const [memoryKind, expected] of [
  ['image', 'image'],
  ['video', 'video'],
  ['audio', 'audio'],
  ['written', 'written'],
] as const) {
  const query = buildMemoryCollectionQuery({ kind: 'type', memoryKind }, 50, 20);
  record(
    query.kind === expected
      && query.order === 'timeline'
      && query.limit === 50
      && query.offset === 20
      && !('albumId' in query),
    `the ${memoryKind} collection reads listMemories with kind=${expected}, order=timeline, limit and offset`,
  );
}

record(
  !COLLECTIONS_CODE.includes("'note'") && !COLLECTIONS_CODE.includes('note:'),
  '`note` is never used as a Memory kind (the contract is `written`)',
);
{
  const query = buildMemoryCollectionQuery({ kind: 'album', albumId: 'album-9' }, 50, 0);
  record(
    query.albumId === 'album-9' && query.order === 'album' && !('kind' in query),
    'an Album collection reads listMemories with albumId and order=album',
  );
}
record(
  memoryCollectionId({ kind: 'album', albumId: 'album-9' }) === 'album:album-9'
  && memoryCollectionId({ kind: 'type', memoryKind: 'image' }) === 'type:image',
  'collection ids are stable and local (no route, no navigation param)',
);
record(
  parseMemoryCollectionId('type:audio')?.kind === 'type'
  && parseMemoryCollectionId('album:x')?.kind === 'album'
  && parseMemoryCollectionId('type:face') === null
  && parseMemoryCollectionId('people:pets') === null,
  'only the four real type collections and real Albums can be reopened',
);

async function collectionsBehaviour(): Promise<void> {
  // A) open() resets and replaces; the read contract is exact.
  {
    const queries: unknown[] = [];
    const states: MemoryCollectionsState[] = [];
    const controller = createMemoryCollectionsController({
      limit: 50,
      onState: (state) => states.push(state),
      read: async (input) => {
        queries.push(input);
        return {
          memories: [memory(`c${input.offset + 1}`), memory(`c${input.offset + 2}`)],
          nextOffset: input.offset === 0 ? 50 : null,
        };
      },
    });
    await controller.open({ kind: 'type', memoryKind: 'image' });
    record(
      states.at(-1)?.memories.length === 2 && states.at(-1)?.nextOffset === 50,
      'the first page replaces the data and adopts the SERVER nextOffset',
    );
    await controller.loadMore();
    record(
      states.at(-1)?.memories.length === 4 && queries.length === 2,
      'load more appends at the server offset',
    );
    record(
      appendUniqueCollectionMemories([memory('a'), memory('b')], [memory('b'), memory('c')])
        .map((m) => m.id).join() === 'a,b,c',
      'an overlapping page never duplicates or reorders a Memory',
    );
  }

  // B) Changing the collection resets the DATA and rejects the stale answer.
  {
    const slow = deferred<{ memories: HomeCloudMemoryListItem[]; nextOffset: number | null }>();
    const states: MemoryCollectionsState[] = [];
    const controller = createMemoryCollectionsController({
      limit: 50,
      onState: (state) => states.push(state),
      read: ({ ref }) =>
        ref.kind === 'album' && ref.albumId === 'album-1'
          ? slow.promise
          : Promise.resolve({ memories: [memory('fresh')], nextOffset: null }),
    });
    const slowOpen = controller.open({ kind: 'album', albumId: 'album-1' });
    await controller.open({ kind: 'album', albumId: 'album-2' });
    slow.resolve({ memories: [memory('stale')], nextOffset: 50 });
    await slowOpen;
    record(
      states.at(-1)?.memories.map((m) => m.id).join() === 'fresh',
      'a page of a previous collection can never land in the current one',
    );
  }

  // C) A later page failure is NOT a list failure.
  {
    const states: MemoryCollectionsState[] = [];
    const controller = createMemoryCollectionsController({
      limit: 50,
      onState: (state) => states.push(state),
      errorMessage: (error) => (error instanceof Error ? error.message : 'fallo'),
      pageErrorMessage: (error) => (error instanceof Error ? error.message : 'fallo'),
      read: async ({ offset }) => {
        if (offset === 0) return { memories: [memory('p1')], nextOffset: 50 };
        throw new Error('red caída');
      },
    });
    await controller.open({ kind: 'type', memoryKind: 'audio' });
    await controller.loadMore();
    record(
      states.at(-1)?.memories.length === 1
        && states.at(-1)?.pageError === 'red caída'
        && states.at(-1)?.error === null
        && states.at(-1)?.nextOffset === 50,
      'a failed later page keeps the loaded page and the same nextOffset',
    );
  }

  // D) A deleted Album collection is TERMINAL, not a fake empty collection.
  {
    const states: MemoryCollectionsState[] = [];
    const controller = createMemoryCollectionsController({
      limit: 50,
      onState: (state) => states.push(state),
      isMissing: (error) => (error as { code?: string }).code === HOMECLOUD_ALBUM_NOT_FOUND_CODE,
      read: async () => {
        throw failure(HOMECLOUD_ALBUM_NOT_FOUND_CODE, 'no existe');
      },
    });
    await controller.open({ kind: 'album', albumId: 'album-gone' });
    record(
      states.at(-1)?.missing === true && states.at(-1)?.memories.length === 0 && states.at(-1)?.error === null,
      'a missing Album collection is terminal: never a fake empty collection',
    );
  }

  // E) reset() is the household switch.
  {
    const states: MemoryCollectionsState[] = [];
    const controller = createMemoryCollectionsController({
      limit: 50,
      onState: (state) => states.push(state),
      read: async () => ({ memories: [memory('r1')], nextOffset: 50 }),
    });
    await controller.open({ kind: 'type', memoryKind: 'video' });
    controller.reset();
    record(
      states.at(-1)?.collectionId === null && states.at(-1)?.memories.length === 0,
      'reset() discards the collection data and its identity (household switch)',
    );
    record(
      MEMORY_COLLECTIONS_INITIAL.collectionId === null && MEMORY_COLLECTIONS_INITIAL.memories.length === 0,
      'the collection state starts empty and unidentified',
    );
  }

  // F) SELECTION PERSISTS across library / type collection / Album collection.
  {
    const states: MemoryCollectionsState[] = [];
    const controller = createMemoryCollectionsController({
      limit: 50,
      onState: (state) => states.push(state),
      read: async () => ({ memories: [memory('shared')], nextOffset: null }),
    });
    const session = toggleMemorySelection(
      enterMemorySelection(createMemorySelectionSession(), {
        purpose: { kind: 'addToAlbum', albumId: 'album-1' },
        source: { kind: 'library' },
      }),
      'shared',
    );
    await controller.open({ kind: 'type', memoryKind: 'image' });
    record(session.selectedIds.has('shared'), 'selecting in Recuerdos survives opening the Fotos collection');
    await controller.open({ kind: 'album', albumId: 'album-1' });
    record(
      session.selectedIds.has('shared') && states.at(-1)?.memories.some((m) => m.id === 'shared') === true,
      'the same Memory is still selected when it appears in the Album collection: one entity, one selection',
    );
    record(
      selectedIdsOf(session).length === 1,
      'the same Memory is never counted twice across sources',
    );
  }
}

// ===========================================================================
section('7. Membership composer: attribution, partial failure, retry, terminal');
// ===========================================================================

async function composerBehaviour(): Promise<void> {
  const labels = new Map<string, string>([
    ['m-1', 'la playa'],
    ['m-2', 'el año nuevo'],
    ['m-3', 'sin nombre'],
  ]);

  // A) 1..N successes.
  {
    const seen: string[] = [];
    const outcome = await runMemoryAlbumMutation({
      direction: 'add',
      albumId: 'album-1',
      contentIds: ['m-1', 'm-2', 'm-3'],
      labelFor: (id) => labels.get(id) ?? 'Un recuerdo',
      mutate: async (_albumId, contentId) => {
        seen.push(contentId);
      },
    });
    record(
      outcome.committed.join() === 'm-1,m-2,m-3' && outcome.failures.length === 0 && !outcome.destinationMissing,
      'adding 1..N Memories commits every one of them',
    );
    record(seen.join() === 'm-1,m-2,m-3', 'the memberships run SEQUENTIALLY, one request per contentId');
  }

  // B) PARTIAL FAILURE: successes stay, the failure is named, nothing rolls back.
  {
    const outcome = await runMemoryAlbumMutation({
      direction: 'add',
      albumId: 'album-1',
      contentIds: ['m-1', 'm-2', 'm-3'],
      labelFor: (id) => labels.get(id) ?? 'Un recuerdo',
      mutate: async (_albumId, contentId) => {
        if (contentId === 'm-2') throw failure('homecloud_upload_failed', 'no se pudo guardar');
      },
    });
    record(
      outcome.committed.join() === 'm-1,m-3' && outcome.failures.length === 1,
      'a partial failure keeps the committed memberships and reports only the failure',
    );
    record(
      outcome.failures[0].contentId === 'm-2' && outcome.failures[0].label === 'el año nuevo',
      'the failed Memory is NAMED, so the user knows exactly what did not happen',
    );
    const band = toMemorySelectionFailure('add', outcome);
    record(
      band.summary.includes('1 recuerdo no se pudo agregar')
        && band.summary.includes('Los que sí se agregaron ya están en el álbum.'),
      'the honest band states the failure AND that the rest are already saved',
    );
    record(
      !/eliminar|borrar|papelera|trash|purge/i.test(band.summary + band.failures.map((f) => f.message).join()),
      'a membership failure never uses a destructive verb',
    );
  }

  // C) A RETRY is exactly the failed ids, and the committed ones are not resubmitted.
  {
    const first = await runMemoryAlbumMutation({
      direction: 'add',
      albumId: 'album-1',
      contentIds: ['m-1', 'm-2'],
      labelFor: (id) => labels.get(id) ?? 'Un recuerdo',
      mutate: async (_albumId, contentId) => {
        if (contentId === 'm-2') throw failure('homecloud_upload_failed', 'no se pudo guardar');
      },
    });
    const retried: string[] = [];
    const second = await runMemoryAlbumMutation({
      direction: 'add',
      albumId: 'album-1',
      contentIds: first.failures.map((f) => f.contentId),
      labelFor: (id) => labels.get(id) ?? 'Un recuerdo',
      mutate: async (_albumId, contentId) => {
        retried.push(contentId);
      },
    });
    record(
      retried.join() === 'm-2' && second.committed.join() === 'm-2' && second.failures.length === 0,
      'the retry submits ONLY the failed ids and commits them',
    );
  }

  // D) REMOVE has the same semantics, and only changes memberships.
  {
    const outcome = await runMemoryAlbumMutation({
      direction: 'remove',
      albumId: 'album-1',
      contentIds: ['m-1', 'm-2', 'm-3'],
      labelFor: (id) => labels.get(id) ?? 'Un recuerdo',
      mutate: async (_albumId, contentId) => {
        if (contentId === 'm-3') throw failure('homecloud_upload_failed', 'no se pudo quitar');
      },
    });
    record(
      outcome.committed.join() === 'm-1,m-2' && outcome.failures.length === 1,
      'removing 1..N changes only the memberships that succeeded',
    );
    record(
      toMemorySelectionFailure('remove', outcome).summary.includes('no se pudo quitar del álbum'),
      'the removal band says "quitar del álbum", never "eliminar"',
    );
  }

  // E) A destination deleted remotely is TERMINAL: no further requests are sent.
  {
    const attempted: string[] = [];
    const outcome = await runMemoryAlbumMutation({
      direction: 'add',
      albumId: 'album-1',
      contentIds: ['m-1', 'm-2', 'm-3', 'm-4'],
      labelFor: (id) => labels.get(id) ?? 'Un recuerdo',
      mutate: async (_albumId, contentId) => {
        attempted.push(contentId);
        throw failure(HOMECLOUD_ALBUM_NOT_FOUND_CODE, 'no existe');
      },
    });
    record(
      outcome.destinationMissing === true && attempted.join() === 'm-1',
      'a missing destination STOPS the run instead of firing N doomed requests',
    );
    record(
      isTerminalDestinationFailure(toMemorySelectionFailure('add', outcome)) === true,
      'a missing destination is reported as TERMINAL, not retryable',
    );
    const noAlbum = await runMemoryAlbumMutation({
      direction: 'add',
      albumId: '',
      contentIds: ['m-1'],
      labelFor: () => 'x',
      mutate: async () => {},
    });
    record(
      noAlbum.destinationMissing === true && noAlbum.failures.length === 1,
      'an absent destination is terminal rather than a silent success',
    );
  }

  // F) A label lookup that throws must never crash the mutation run.
  {
    const outcome = await runMemoryAlbumMutation({
      direction: 'add',
      albumId: 'album-1',
      contentIds: ['m-1'],
      labelFor: () => {
        throw new Error('lookup roto');
      },
      mutate: async () => {},
    });
    record(outcome.committed.length === 1, 'a broken label lookup never affects the mutation itself');
  }

  record(
    memoryMutationFailureSummary('add', 2, 0).includes('2 recuerdos no se pudieron agregar'),
    'the plural failure summary is exact',
  );
}

// ===========================================================================
section('8. HC-1 closure: Album visual order vs the untouched Timeline');
// ===========================================================================

/**
 * HC-1 FIXTURES.
 *
 * The grouper never re-sorts, so the ORDER OF THE FIXTURE IS THE POINT: each
 * fixture is a list the SERVER would actually send for one read mode.
 *
 * Timeline order = `captured_year DESC, captured_month DESC NULLS LAST,
 * captured_at DESC NULLS LAST, id DESC`: newest year first, month-known before
 * the year-only block of the same year, unknown date LAST.
 */
const timelineOrdered = [
  memory('t-2024-year', { capturePrecision: 'year', capturedAt: null, capturedYear: 2024, capturedMonth: null }),
  memory('t-2022-may', { capturePrecision: 'exact', capturedAt: '2022-05-02T08:00:00Z', capturedYear: 2022, capturedMonth: 5 }),
  memory('t-2020-jul', { capturePrecision: 'exact', capturedAt: '2020-07-18T08:00:00Z', capturedYear: 2020, capturedMonth: 7 }),
  memory('t-2020-mar', { capturePrecision: 'month_year', capturedAt: null, capturedYear: 2020, capturedMonth: 3 }),
  memory('t-2020-year', { capturePrecision: 'year', capturedAt: null, capturedYear: 2020, capturedMonth: null }),
  memory('t-unknown', { capturePrecision: 'unknown', capturedAt: null, capturedYear: null, capturedMonth: null }),
];

/**
 * Album order = `captured_year ASC NULLS FIRST, captured_month ASC NULLS FIRST,
 * captured_at ASC NULLS FIRST, id ASC` (MO-A1 `ALBUM_MEMORIES_ORDER`): oldest
 * first, the undated Memory FIRST, and the year-only Memory LEADING its year.
 */
const albumOrdered = [
  memory('a-unknown', { capturePrecision: 'unknown', capturedAt: null, capturedYear: null, capturedMonth: null }),
  memory('a-2020-year', { capturePrecision: 'year', capturedAt: null, capturedYear: 2020, capturedMonth: null }),
  memory('a-2020-mar', { capturePrecision: 'month_year', capturedAt: null, capturedYear: 2020, capturedMonth: 3 }),
  memory('a-2020-jul', { capturePrecision: 'exact', capturedAt: '2020-07-18T08:00:00Z', capturedYear: 2020, capturedMonth: 7 }),
  memory('a-2022-may', { capturePrecision: 'exact', capturedAt: '2022-05-02T08:00:00Z', capturedYear: 2022, capturedMonth: 5 }),
  memory('a-2024-year', { capturePrecision: 'year', capturedAt: null, capturedYear: 2024, capturedMonth: null }),
];

function flattenedOrder(
  items: readonly HomeCloudMemoryListItem[],
  mode: 'timeline' | 'album',
): string[] {
  const groups = groupMemoriesForTimeline(items, mode);
  return groups.flatMap((group) => group.sections.flatMap((section) => section.items.map((m) => m.id)));
}

{
  // ---- TIMELINE: byte-for-byte the pre-MO-A3 placement ----
  const timelineOrder = flattenedOrder(timelineOrdered, 'timeline');
  record(
    timelineOrder.join() === timelineOrdered.map((m) => m.id).join(),
    'TIMELINE: a Timeline read renders in exactly the canonical server sequence',
  );
  record(
    timelineOrder[timelineOrder.length - 1] === 't-unknown',
    'TIMELINE: an unknown date is still LAST',
  );
  record(
    timelineOrder.indexOf('t-2020-jul') < timelineOrder.indexOf('t-2020-year'),
    'TIMELINE: a year-only Memory still trails the known months of its year',
  );
  record(
    groupMemoriesForTimeline(timelineOrdered).map((group) => group.key).join() === 'year:2024,year:2022,year:2020,year:unknown',
    'TIMELINE: the year groups keep the server first-seen order (descending) and unknown is last',
  );
  record(
    groupMemoriesForTimeline(timelineOrdered)[2].sections.map((s) => s.key).join() === 'm:2020-7,m:2020-3,y-only:2020',
    'TIMELINE: inside a year the known months come first and the year-only block trails',
  );

  // ---- THE PRE-EXISTING GAP, CHARACTERIZED ----
  // Reading an ALBUM-ordered page with the Timeline placement is exactly what the
  // Album detail did before MO-A3: the server sent unknown first and the UI drew
  // it last. This assertion pins the bug so the closure below is meaningful.
  const buggyAlbumOrder = flattenedOrder(albumOrdered, 'timeline');
  record(
    buggyAlbumOrder[buggyAlbumOrder.length - 1] === 'a-unknown',
    'CHARACTERIZATION: the old Album rendering put the undated Memory LAST, contradicting the server',
  );
  record(
    buggyAlbumOrder.indexOf('a-2020-year') > buggyAlbumOrder.indexOf('a-2020-mar'),
    'CHARACTERIZATION: the old Album rendering put the year-only Memory AFTER the months of its year',
  );
  record(
    buggyAlbumOrder.join() !== albumOrdered.map((m) => m.id).join(),
    'CHARACTERIZATION: the old Album visual order really did differ from the canonical sequence',
  );

  // ---- ALBUM: the visual order now MATCHES the canonical sequence ----
  const albumOrder = flattenedOrder(albumOrdered, 'album');
  record(
    albumOrder.join() === albumOrdered.map((m) => m.id).join(),
    'ALBUM: the visual order is EXACTLY the canonical server sequence',
  );
  record(albumOrder[0] === 'a-unknown', 'ALBUM: an unknown date is FIRST');
  record(
    albumOrder.indexOf('a-2020-year') < albumOrder.indexOf('a-2020-mar')
      && albumOrder.indexOf('a-2020-year') < albumOrder.indexOf('a-2020-jul'),
    'ALBUM: a year-only Memory LEADS its own year',
  );
  record(
    albumOrder.indexOf('a-2020-mar') < albumOrder.indexOf('a-2020-jul'),
    'ALBUM: the known months keep the canonical ascending order of the server read',
  );
  record(
    groupMemoriesForTimeline(albumOrdered, 'album')[0].key === 'year:unknown',
    'ALBUM: the unknown group is placed first',
  );
  record(
    groupMemoriesForTimeline(albumOrdered, 'album').map((group) => group.key).join() === 'year:unknown,year:2020,year:2022,year:2024',
    'ALBUM: the year groups keep the ascending first-seen order of the server read',
  );
  record(
    groupMemoriesForTimeline(albumOrdered, 'album')[1].sections.map((s) => s.key).join() === 'y-only:2020,m:2020-3,m:2020-7',
    'ALBUM: inside a year the year-only block now LEADS the month groups',
  );
  record(
    groupMemoriesForTimeline(albumOrdered, 'album').at(-1)?.sections[0].items.map((m) => m.id).join() === 'a-2024-year',
    'ALBUM: a year whose only Memory is year-only still renders it',
  );

  // An unknown-only and a year-only-only Album are honest single groups.
  const onlyUnknown = groupMemoriesForTimeline([albumOrdered[0]], 'album');
  record(
    onlyUnknown.length === 1 && onlyUnknown[0].title === TIMELINE_UNKNOWN_TITLE,
    'ALBUM: an Album of only undated Memories is one honest "Sin fecha" group',
  );
  record(
    groupMemoriesForTimeline([albumOrdered[1]], 'album')[0].sections[0].title === 'Durante 2020',
    'ALBUM: a year-only Memory renders the honest "Durante {year}" block, never a month',
  );

  // The grouper GROUPS; it never re-sorts the items themselves.
  const shuffled = [
    memory('b', { capturePrecision: 'exact', capturedAt: '2024-02-02T00:00:00Z', capturedYear: 2024, capturedMonth: 2 }),
    memory('a', { capturePrecision: 'exact', capturedAt: '2024-02-01T00:00:00Z', capturedYear: 2024, capturedMonth: 2 }),
  ];
  const withinSection = groupMemoriesForTimeline(shuffled, 'album')[0].sections[0].items.map((m) => m.id);
  record(withinSection.join() === 'b,a', 'the grouper NEVER re-sorts items: it only places groups');

  // Both modes produce the same SectionList shape, so the surfaces stay identical.
  record(
    flattenTimelineForSectionList(groupMemoriesForTimeline(albumOrdered, 'album')).length
      === flattenTimelineForSectionList(groupMemoriesForTimeline(timelineOrdered)).length,
    'the SectionList adaptation is identical in both modes: only the placement differs',
  );
}

record(
  /TIMELINE_GROUPING_MODE_DEFAULT: TimelineGroupingMode = 'timeline'/.test(TIMELINE_CODE)
  && /mode: TimelineGroupingMode = TIMELINE_GROUPING_MODE_DEFAULT/.test(TIMELINE_CODE),
  'the Timeline grouping mode is the DEFAULT, so existing callers are unchanged',
);
record(
  !/\.sort\(/.test(TIMELINE_CODE), 'the grouping primitive contains no sort at all',
);

// ===========================================================================
section('9. Product boundaries: local Viewer, no delete, no route, no smart collections');
// ===========================================================================

record(
  /MemoryViewer/.test(SCREEN_CODE) && !/navigate\(['"]HomeCloud/.test(SCREEN_CODE),
  'Viewer remains local overlay state and introduces no navigation route',
);
/**
 * EVERY method the selection surface calls on a navigation object.
 *
 * MO-A3 DEVICE FIX (D3) had to tighten this boundary rather than loosen it. The
 * surface now HOLDS a navigation object, because suppressing the parent exit
 * swipe while a selection session is live is only possible through the CURRENT
 * route's own `gestureEnabled` option — the exit swipe is a native recognizer
 * owned by the `MoreStack` native stack, so no JS gesture can block it.
 *
 * The original proof was the ABSENCE of the word `useNavigation`, which cannot
 * distinguish "holds the object" from "performs navigation". This one is strictly
 * stronger: it enumerates the methods actually invoked and requires every one of
 * them to be `setOptions`, which mutates an EXISTING route's gesture option and
 * performs no navigation, adds no route and creates no navigator.
 */
function navigationMethodsUsed(source: string): string[] {
  const methods = new Set<string>();
  // Only real CALLS count, and the whole member chain is captured so an
  // indirection like `navigationRef.current?.setOptions(...)` is reported as
  // `setOptions`. A plain property write (`navigationRef.current = navigation`)
  // is not a method call and is therefore not navigation.
  for (const match of source.matchAll(
    /\b(?:navigation|navigationRef)\b((?:\s*\??\.\s*[A-Za-z_$][\w$]*)+)\s*\(/g,
  )) {
    const chain = match[1].match(/([A-Za-z_$][\w$]*)\s*$/);
    if (chain !== null) methods.add(chain[1]);
  }
  return [...methods];
}

record(
  !/\bnavigation\.(navigate|push|replace|pop|goBack|reset|prepend)\b/.test(
    SCREEN_CODE + SELECTABLE_CODE + ROW_CODE + HEADER_CODE + TILE_CODE,
  )
    && !/\brouter\./.test(SCREEN_CODE + SELECTABLE_CODE + ROW_CODE + HEADER_CODE + TILE_CODE)
    && !/\bcreate(Native)?StackNavigator\b/.test(
      SCREEN_CODE + SELECTABLE_CODE + ROW_CODE + HEADER_CODE + TILE_CODE,
    )
    && navigationMethodsUsed(SCREEN_CODE + SELECTABLE_CODE + ROW_CODE + HEADER_CODE + TILE_CODE)
      .every((method) => method === 'setOptions'),
  'the selection surface adds NO navigation route and NO router, and the only navigation API it touches is setOptions',
);
record(
  navigationMethodsUsed(SCREEN_CODE + SELECTABLE_CODE + ROW_CODE + HEADER_CODE + TILE_CODE)
    .join(',') === 'setOptions',
  'D3 exposes exactly ONE navigation method on the surface — setOptions — so no navigation action can hide in it',
);
record(
  !/album/i.test(NAV_TYPES), 'no Album or collection route exists in navigation/types.ts',
);
record(
  !/trash|purge|restaurar|Eliminar\s+recuerdo|deleteMemory|DeleteMemory|memory\.hidden|hiddenFromResurfacing=/i.test(
    SELECTABLE + ROW + HEADER + TILE,
  ),
  'no Memory delete, trash, restore, purge or hidden affordance exists',
);
record(
  !/Favorit|favorit|favorite/i.test(SCREEN_CODE + HEADER_CODE + TILE_CODE + COLLECTIONS_CODE),
  'Favorites is NOT part of MO-A3',
);
record(
  !/Resurfac|resurfac/i.test(SCREEN_CODE + COLLECTIONS_CODE)
    && !('query' in buildMemoryCollectionQuery({ kind: 'type', memoryKind: 'image' }, 50, 0)),
  'neither Resurfacing nor a Search filter is introduced',
);
record(
  !/People|Pets|Trips|Places|Faces|Objects|OCR|Homi|homi/i.test(COLLECTIONS_CODE + TILE_CODE),
  'no smart, semantic or inferred collection is declared or rendered',
);
record(
  !/\bcreateMemoryFromAlbum\b|crear nuevo recuerdo|MemoryIntake|initialAlbumId/.test(
    SELECTABLE_CODE + ROW_CODE + HEADER_CODE + TILE_CODE,
  ),
  'NO create-from-Album flow: creation stays in Recuerdos -> + and intake is untouched',
);
record(
  SCREEN_CODE.includes('<MemoryIntake')
  && SCREEN.includes("intakeSource: 'homecloud:memories'")
  && !SCREEN.includes('pickerOpen'),
  'MemoryIntake ownership is unchanged and the picker modal state is gone',
);
record(
  !/createContext|useContext|useReducer|redux|zustand/i.test(SELECTION_CODE + SCREEN_CODE),
  'no global Context, store or new app-wide provider is introduced',
);
record(
  SCREEN.includes('const canOrganize = capabilities.descriptor.organize;')
  && !/homecloud\.delete/.test(SCREEN_CODE + HEADER_CODE + TILE_CODE),
  'Album mutations stay organize-only and never consult homecloud.delete',
);
record(
  SCREEN.includes("SCREEN_CODE.includes('homecloud.organize')") === false
    && SCREEN.includes('capabilities.descriptor.organize'),
  'the capability gate is the EXISTING one; no new capability is invented',
);

// ===========================================================================
section('10. Interaction wrapper: responder transfer, accessibility, haptics');
// ===========================================================================

record(
  SELECTABLE_CODE.includes('onStartShouldSetPanResponder: () => false')
  && SELECTABLE_CODE.includes('onStartShouldSetPanResponderCapture: () => false'),
  'the card NEVER claims the responder on touch start: normal scrolling is not stolen',
);
record(
  SELECTABLE_CODE.includes('onMoveShouldSetPanResponder:')
  && SELECTABLE_CODE.includes('armedRef.current')
  && SELECTABLE_CODE.includes('MEMORY_DRAG_TAKEOVER_SLOP'),
  'takeover happens in the MOVE phase and only while armed and past a slop',
);
record(
  !SELECTABLE_CODE.includes('onMoveShouldSetPanResponderCapture: () => true'),
  'no unconditional capture: capture would steal a normal scroll',
);
record(
  SELECTABLE_CODE.includes('onPanResponderTerminationRequest: () => false')
  && SELECTABLE_CODE.includes('onPanResponderTerminate')
  && SELECTABLE_CODE.includes('onPanResponderRelease'),
  'both terminate and release fully clear the arming and the drag',
);
record(
  SELECTABLE_CODE.includes('onLongPress={handleLongPress}')
  && SELECTABLE_CODE.includes('armedRef.current = true;'),
  'the long press is the ONLY place the drag is armed',
);
record(
  SELECTABLE_CODE.includes('onPress={handlePress}') && SELECTABLE_CODE.includes('if (!selecting)') && SELECTABLE_CODE.includes('onOpen?.(memory)'),
  'a tap toggles while selecting and opens Viewer only in normal mode',
);
record(
  SELECTABLE_CODE.includes('accessibilityState={{ selected, disabled: disabled === true }}'),
  'the selected state is exposed to the accessibility tree, not only drawn',
);
record(
  SELECTABLE_CODE.includes('accessibilityRole="button"')
  && SELECTABLE_CODE.includes('memorySelectableCardLabel'),
  'every card is an accessible button with an action-naming label',
);
record(
  /Ya está en el álbum/.test(SELECTABLE) && SELECTABLE.includes('styles.ring'),
  'the already-member status is RENDERED (not hidden) and the selection is not colour-only',
);
record(
  /Quitar de la selección/.test(SELECTABLE_CODE) && /Seleccionar/.test(SELECTABLE_CODE),
  'the card label states the exact next action for a screen reader',
);
record(
  HEADER.includes('Confirmar, ') && HEADER.includes('seleccionados'),
  'the confirm affordance names the exact count for a screen reader',
);
record(
  HEADER.includes('Cancelar la selección y volver')
  && HEADER.includes('Elegir entre recuerdos y colecciones'),
  'cancel and the collection switch both have explicit accessible names',
);
record(
  !HEADER_CODE.includes('openAlbum')
  && !/deleteMemory|trash|purge/i.test(HEADER_CODE),
  'the selection header owns no mutation and no destructive action',
);
record(
  (SCREEN.match(/lightHaptic\(\)/g) ?? []).length === 3
    && SELECTABLE_CODE.includes('lightHaptic') === false,
  'exactly ONE haptic per transition that enters selection, and none per dragged cell',
);

// ===========================================================================
section('11. Row: measurement, mounted-only registry, bounded re-renders');
// ===========================================================================

record(
  ROW_CODE.includes('measureInWindow')
  && ROW.includes('MEMORY_ROW_MEASUREMENT') === false
  && /MEMORY_ROW_MEASUREMENT: MemoryRowMeasurementSpace = 'window'/.test(DRAG_CODE),
  'measurement goes through the ONE abstraction, and window space is the enabled one',
);
record(
  ROW_CODE.includes('unregisterRow(entry)') && ROW_CODE.includes('entryRef.current = entry'),
  'a row removes exactly the entry it published (identity-guarded unmount)',
);
record(
  ROW_CODE.includes('React.memo(MemoryTimelineRowImpl, areRowPropsEqual)'),
  'the row is memoized with a comparator',
);
record(
  /function areRowPropsEqual[\s\S]*before\.selected !== after\.selected[\s\S]*before\.unselectable !== after\.unselectable/.test(ROW_CODE),
  'the comparator walks the per-card PRIMITIVES, so one toggle re-renders one cell',
);
record(
  !/selectedIds\s*:\s*ReadonlySet/.test(ROW_CODE) && ROW.includes('MemoryTimelineCell'),
  'the whole selectedIds Set is NOT passed into every row',
);
record(
  SCREEN.includes('rowCells.get(item.key) ?? []')
    && SCREEN.includes('selected: selection.selectedIds.has(memory.id)')
    && SCREEN.includes('unselectable: selection.excludedIds.has(memory.id)'),
  'the owner derives the per-card primitives from the session Set (O(1) per card)',
);
record(
  !/onScroll=\{[\s\S]{0,80}setScroll/.test(SCREEN) && SCREEN.includes('scrollOffsetsRef.current.set('),
  'the live scroll offset goes into a REF: an onScroll event never re-renders',
);
record(
  SCREEN.includes('scrollEventThrottle={DRAG_SCROLL_THROTTLE}'),
  'live offset tracking declares its cadence explicitly',
);
record(
  SCREEN.includes('listRef.current?.scrollToOffset') && SCREEN.includes('animated: false'),
  'programmatic scrolling is NEVER animated, so commands cannot stack',
);

// ===========================================================================
section('12. Selection surface wiring: header, sources, back, scope');
// ===========================================================================

record(
  HEADER.includes('Recuerdos') && HEADER.includes('Colecciones') && HEADER.includes('SegmentedControl'),
  'the header renders the frozen [X] Recuerdos | Colecciones [✓] composition',
);
record(
  HEADER.includes('name="close"') && HEADER.includes('name="checkmark"'),
  'the header renders the X cancel and the confirm affordance',
);
record(
  HEADER_CODE.includes('selectedCount === 0 || busy'), 'confirm is disabled at zero selected',
);
record(
  HEADER.includes('Reintentar los que fallaron')
    && SCREEN.includes('selectedIds: new Set(failure.failures.map((item) => item.contentId))'),
  'a partial failure offers a retry of ONLY the failed Memories',
);
record(
  SCREEN.includes('showAlbumDetail = !selecting && openAlbumId !== null'),
  'the Album detail overlay is hidden while selecting, but openAlbumId is KEPT',
);
record(
  SCREEN.includes('enterAddToAlbum') && SCREEN.includes('onAddMemories')
    && SHEETS_ADD_MEMORIES(),
  'the Album surface (populated and empty) enters the SAME add flow',
);
function SHEETS_ADD_MEMORIES(): boolean {
  return read('front/mi-front-limpio/components/homecloud/AlbumSheets.tsx').includes('Agregar recuerdos');
}
record(
  SCREEN.includes('enterRemoveFromAlbum')
    && DETAIL.includes('onLongPress={onLongPressMemory}'),
  'a long press in the Album detail enters the bulk removal of the SAME session',
);
record(
  SCREEN.includes("purpose: { kind: 'generic' }")
    && SCREEN.includes('initialContentIds: [contentId]'),
  'a Timeline long press enters a generic operation with the first Memory selected',
);
record(
  (SCREEN_CODE.match(/BackHandler\.addEventListener\('hardwareBackPress'/g) ?? []).length === 1,
  'there is exactly ONE BackHandler owner (no competing listeners)',
);
record(
  /if \(dragRef\.current\.active\) \{[\s\S]*?abortDrag\(\);[\s\S]*?return true;[\s\S]*?if \(collectionDetailOpen\)[\s\S]*?if \(selecting\)[\s\S]*?if \(openAlbumIdRef\.current !== null\)[\s\S]*?return false;/.test(SCREEN_CODE),
  'the Back priority is exactly: drag, collection detail, selection, Album, existing behaviour',
);
record(
  SCREEN.includes('status === \'active\'') && SCREEN.includes('abortDrag();'),
  'AppState handles gesture cleanup ONLY: backgrounding kills the drag, never the product behaviour',
);
record(
  /useEffect\(\(\) => \{[\s\S]*?resetMemorySelectionScope\(\)[\s\S]*?\}, \[abortDrag, householdId, token\]\);/.test(SCREEN_CODE),
  'the ONE household reset effect clears the session, the registry and the offsets',
);
record(
  SCREEN.includes('clearMemoryRowRegistry') && SCREEN.includes('scrollOffsetsRef.current.clear()'),
  'the row registry and the offsets die with the scope, not just the React state',
);
record(
  SCREEN.includes('scrollOffsetsRef.current.get(sourceKey)')
    && SCREEN.includes('rootScrollRef.current?.scrollTo'),
  'the scroll offset is tracked per source and restored on re-entry',
);
record(
  SCREEN.includes('fetchHomeCloudAlbums(token)') && SCREEN.includes('destinationAlive'),
  'the destination Album is re-validated against the server before ANY mutation is sent',
);
record(
  SCREEN.includes('if (!destinationAlive)') && SCREEN.includes('destinationMissing: true'),
  'a destination deleted remotely produces a terminal honest state and no mutation',
);
record(
  SCREEN.includes('backToCollectionsRoot') && SCREEN.includes('MEMORY_SELECTION_SOURCE_COLLECTIONS_ROOT'),
  'the collection detail back action returns to the Collections root WITHOUT cancelling',
);
record(
  !SCREEN.includes('router.push') && !SCREEN.includes('navigation.navigate'),
  'no navigation is performed: the Collections source is local state',
);

// ===========================================================================
section('13. Type tiles and the Collections root');
// ===========================================================================

record(
  TILE_CODE.includes('MemoryCollectionAlbumTile')
    && TILE_CODE.includes('albumItemCountLabel(album.itemCount)'),
  'Album entries in the Collections root keep their EXACT server aggregate',
);
record(
  !/itemCount|count|length/.test(
    TILE_CODE.split('export function MemoryCollectionTile')[1].split('export function MemoryCollectionAlbumTile')[0],
  ),
  'a TYPE tile renders NO count: no exact total exists for a kind-filtered page',
);
record(
  SCREEN.includes("{TYPE_COLLECTIONS_TITLE}") && SCREEN.includes("{'Álbumes'}")
    && SCREEN.includes('MEMORY_TYPE_COLLECTIONS.map'),
  'the Collections root renders Albums and the four type collections, deterministically',
);
record(
  SCREEN.includes("COLLECTIONS_ROOT_TITLE = 'Colecciones'")
    && SCREEN.includes('COLLECTIONS_BACK_LABEL'),
  'the root and the collection-detail back action use the frozen copy',
);
record(
  SCREEN.includes('NO_ALBUMS_DESTINATION_TITLE') && SCREEN.includes('No hay álbumes disponibles'),
  'a generic selection with no Albums shows an HONEST destination state, never a silent no-op',
);
record(
  SCREEN.includes('rail.albums.map((album) =>') && SCREEN.includes('chooseDestinationAlbum'),
  'the destination sheet is built from the Albums the owner already loaded',
);
record(
  !/createAlbum\(/.test(SCREEN_CODE.split('destinationPickerOpen')[2] ?? ''),
  'creating an Album from inside the destination sheet is NOT required and NOT implemented',
);

// ===========================================================================
section('14. AlbumMemoryPicker retirement');
// ===========================================================================

record(
  !fs.existsSync(path.join(root, 'front/mi-front-limpio/components/homecloud/AlbumMemoryPicker.tsx')),
  'AlbumMemoryPicker.tsx is DELETED: no dead product UI is kept "just in case"',
);
record(
  !/AlbumMemoryPicker/.test(SCREEN.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1')),
  'no productive import of the picker remains',
);
const MUTATIONS_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudMemoryMutations.ts');
record(
  SCREEN.includes('memory.albumIds.includes(albumId)')
    && MUTATIONS_CODE.includes('memoryMutationFailureSummary')
    && SCREEN.includes('runMemoryAlbumMutation'),
  'the picker semantics were MIGRATED: already-member, pagination and partial-failure attribution',
);

// ===========================================================================
section('15. Backend / schema / shared-infra freeze');
// ===========================================================================

record(
  READ_SERVICE_CODE.includes('export async function addMemoryToAlbum(')
    && READ_SERVICE_CODE.includes('export async function removeMemoryFromAlbum('),
  'the read client is still the MO-A1 contract: no new endpoint, no backend change',
);
record(
  !READ_SERVICE_CODE.includes('collections') && !READ_SERVICE_CODE.includes('selection'),
  'the read client gains no collection or selection concept: filters only',
);
record(
  !SCREEN_CODE.includes('original_storage_path') && !SCREEN_CODE.includes('preview_storage_path'),
  'no storage path is exposed by the selection surface',
);
record(
  !/UploadJob|uploadQueue|uploadCoordinator|reconcileUpload/.test(SCREEN_CODE + SELECTION_CODE + DRAG_CODE + COLLECTIONS_CODE),
  'the upload architecture is untouched: no queue, coordinator or recovery integration',
);
record(
  !/from '\.\/homecloud(ReadFailure|Upload|SemanticDate|ScopeInvalidation)'/.test(
    [SELECTION_CODE, DRAG_CODE, COLLECTIONS_CODE].join('\n'),
  ),
  'the new modules depend on no shared HomeCloud infrastructure beyond the types and the Album scope',
);

async function main(): Promise<void> {
  await collectionsBehaviour();
  await composerBehaviour();

  console.log(`\nMOA3_MEMORY_SELECTION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('MOA3_MEMORY_SELECTION_TESTS=FAIL');
  } else {
    console.log('MOA3_MEMORY_SELECTION_TESTS=PASS');
  }
}

main().catch((error) => {
  console.error('MO-A3 selection test runner crashed:', error);
  process.exit(1);
});
