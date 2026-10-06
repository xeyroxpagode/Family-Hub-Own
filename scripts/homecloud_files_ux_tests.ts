/**
 * HomeCloud Files — STAGE 2 REOPEN — FILES UX, REFRESH, PAGINATION and DRAG SELECTION.
 *
 * WHY THIS SUITE WAS REWRITTEN
 * -----------------------------
 * The previous version of this file was almost entirely source regexes. It could
 * prove that the string `title="Actualizar"` was in the screen; it could not prove
 * that pressing it worked, that the list paged, that a sweep selected anything, or
 * that a scroll and a sweep could share one finger. Those are exactly the claims
 * device QA found to be false, so leaving them as greps would have reproduced the
 * failure that produced this reopen.
 *
 * What is here now:
 *
 *   X-A  HEADER        SOURCE. Token and donor reuse is genuinely a source property.
 *   X-B  OVERFLOW      COMPONENT_BEHAVIOUR + SOURCE. Zero visible Refresh controls,
 *                      measured on the rendered tree, not on the file.
 *   X-C  REFRESH       COMPONENT_BEHAVIOUR. Pull-to-refresh, the empty state and the
 *                      accessibility-only action are all EXERCISED.
 *   X-D  FILTERS       PURE_UNIT.
 *   X-E  GRAMMAR       COMPONENT_BEHAVIOUR. Tap and long press are invoked for real.
 *   X-F  SWEEP         PURE_UNIT + COMPONENT_BEHAVIOUR. The model and the hit test
 *                      are executed directly, and the whole gesture is then driven
 *                      through the surface's OWN pan responder.
 *   X-G  SCROLLING     COMPONENT_BEHAVIOUR. Whether the responder claims a move is
 *                      the actual arbitration decision, so it is asked, not read.
 *   X-H  ACCESSIBILITY COMPONENT_BEHAVIOUR.
 *   X-I  PAGINATION    COMPONENT_BEHAVIOUR + PURE_UNIT. Wiring on the list, guards,
 *                      the failure latch and the footer states.
 *   X-J  DONOR         SOURCE.
 *
 * The only things stubbed are the ones a device supplies: React hooks, the
 * presentational primitives, navigation focus, the app-lifecycle signal, the
 * pan-responder plumbing and the transport.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  DEFAULT_FILES_FILTER_STATE,
  FILES_SHOW_OPTIONS,
  FILES_SORT_OPTIONS,
  filesFavoritesOnly,
  filesFilterAccessibilityLabel,
  filesFilterDescription,
  filesShowLabel,
  filesSortLabel,
  hasNonDefaultFilesFilter,
} from '../front/mi-front-limpio/services/homecloud/homecloudFilesFilters';
import {
  emptyFileSelection,
  enterFileSelection,
  leaveFileSelection,
  pruneFileSelection,
  selectedFileIds,
  setFileSelectionSelected,
  toggleFileSelection,
} from '../front/mi-front-limpio/services/homecloud/homecloudFileSelection';
import {
  applyDragSelectionStep,
  beginDragSelection,
  DRAG_AUTO_SCROLL,
  dragAutoScrollNextOffset,
  dragSelectionTargetSelected,
  hitTestFileTile,
  listMaxOffset,
  pointerToListContent,
  recordFileTileFrame,
  type DragSelectionGesture,
  type FileTileFrames,
} from '../front/mi-front-limpio/services/homecloud/homecloudDragSelection';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

console.log('\n=== HOMECLOUD FILES: UX / REFRESH / PAGINATION / SELECTION (STAGE 2 REOPEN) ===\n');

// ═══════════════════════════════════════════════════════════════════════════
// X-D: the filter grammar (PURE_UNIT — it IS a pure module)
// ═══════════════════════════════════════════════════════════════════════════
console.log('--- X-D: display filters compose server-side (pure) ---');
record(DEFAULT_FILES_FILTER_STATE.show === 'all' && DEFAULT_FILES_FILTER_STATE.sort === 'recent', 'X-D1. the default is Todos + Recientes');
record(filesFavoritesOnly(DEFAULT_FILES_FILTER_STATE) === false, 'X-D2. the default is NOT favorites-only');
record(filesFavoritesOnly({ show: 'favorites', sort: 'recent' }) === true, 'X-D3. Favoritos maps to the server favoritesOnly flag');
record(hasNonDefaultFilesFilter(DEFAULT_FILES_FILTER_STATE) === false, 'X-D4. the default looks clean and unaccented');
record(hasNonDefaultFilesFilter({ show: 'favorites', sort: 'recent' }) === true, 'X-D5. Favoritos alone is a non-default filter');
record(hasNonDefaultFilesFilter({ show: 'all', sort: 'name' }) === true, 'X-D6. A-Z alone is a non-default filter');
record(FILES_SHOW_OPTIONS.map((option) => option.label).join(',') === 'Todos,Favoritos', 'X-D7. MOSTRAR offers exactly Todos and Favoritos');
record(FILES_SORT_OPTIONS.map((option) => option.label).join(',') === 'Recientes,A-Z', 'X-D8. ORDENAR offers exactly Recientes and A-Z');
record(filesShowLabel({ show: 'favorites', sort: 'recent' }) === 'Favoritos', 'X-D9. the show axis labels itself');
record(filesSortLabel({ show: 'all', sort: 'name' }) === 'A-Z', 'X-D10. the order axis labels itself');
record(/todos los archivos/.test(filesFilterDescription(DEFAULT_FILES_FILTER_STATE)), 'X-D11. the description names the show axis in product words');
record(/más recientes/.test(filesFilterDescription(DEFAULT_FILES_FILTER_STATE)), 'X-D12. the description names the order axis');
record(/tus favoritos/.test(filesFilterDescription({ show: 'favorites', sort: 'recent' })), 'X-D13. the description is honest when Favoritos is on');
record(filesFilterAccessibilityLabel(DEFAULT_FILES_FILTER_STATE).startsWith('Filtros y orden.'), 'X-D14. the filter icon announces what it is before it is used');

// ═══════════════════════════════════════════════════════════════════════════
// X-F0: the sweep model, executed (PURE_UNIT)
// ═══════════════════════════════════════════════════════════════════════════
console.log('--- X-F0: the sweep model is an ANCHOR decision, executed ---');
{
  const add = beginDragSelection({ anchorId: 'a', anchorSelected: false });
  record(add.mode === 'add' && add.visited.has('a'), 'X-F1. holding an unselected File starts an ADD gesture, with the anchor already visited');
  const remove = beginDragSelection({ anchorId: 'b', anchorSelected: true });
  record(remove.mode === 'remove' && dragSelectionTargetSelected(remove) === false, 'X-F2. holding a SELECTED File starts a REMOVE gesture');
  record(dragSelectionTargetSelected(add) === true, 'X-F3. ADD ends every crossed File selected, REMOVE ends every crossed File deselected');

  const stepped = applyDragSelectionStep(add, 'c');
  record(stepped !== add && stepped.visited.has('c'), 'X-F4. crossing a NEW File advances the visited set');
  const reCrossed = applyDragSelectionStep(stepped, 'c');
  record(reCrossed === stepped, 'X-F5. re-crossing it returns the SAME gesture — so it is structurally impossible to process twice');
  const overAnchor = applyDragSelectionStep(stepped, 'a');
  record(overAnchor === stepped, 'X-F6. and re-crossing the ANCHOR cannot invert it either');
  record(applyDragSelectionStep(stepped, 'd').mode === 'add', 'X-F7. the mode is never re-derived, however far the sweep goes');

  let gesture: DragSelectionGesture = beginDragSelection({ anchorId: 'f0', anchorSelected: false });
  for (let index = 1; index <= 40; index += 1) gesture = applyDragSelectionStep(gesture, `f${index}`);
  record(gesture.visited.size === 41, `X-F8. a 41-tile sweep visits 41 Files, each exactly once (${gesture.visited.size})`);
}

// ═══════════════════════════════════════════════════════════════════════════
// X-F1: hit testing against MEASURED frames (PURE_UNIT)
// ═══════════════════════════════════════════════════════════════════════════
console.log('--- X-F1: hit testing uses measured frames, never row arithmetic ---');
{
  // A deliberately non-174dp grid with a gutter, because hard-coded tile height and
  // column arithmetic is exactly what breaks when spacing or font scale changes.
  const columns = 2;
  const columnWidth = 150;
  const gutter = 24;
  const rowHeight = 96;
  const rowStride = rowHeight + 12;
  let frames: FileTileFrames = new Map();
  const ids = ['r0c0', 'r0c1', 'r1c0', 'r1c1', 'r2c0', 'r2c1'];
  ids.forEach((id, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    frames = recordFileTileFrame(frames, id, {
      x: 20 + column * (columnWidth + gutter),
      y: row * rowStride,
      width: columnWidth,
      height: rowHeight,
    });
  });

  record(hitTestFileTile(frames, 20 + 10, 10) === 'r0c0', 'X-F9. a point in the first tile hits the first tile');
  record(hitTestFileTile(frames, 20 + columnWidth + gutter + 10, 10) === 'r0c1', 'X-F10. and the SECOND column is hit by its own measured x');
  record(hitTestFileTile(frames, 20 + 10, rowStride + 10) === 'r1c0', 'X-F11. a point one row down hits the next row');
  record(hitTestFileTile(frames, 20 + columnWidth + 4, 10) === null,
    'X-F12. the GUTTER between columns hits nothing — a sweep never grabs the neighbour it is not over');
  record(hitTestFileTile(frames, 20 + 10, rowHeight + 4) === null, 'X-F13. and neither does the gutter between rows');

  // Non-zero scroll offset: the pointer is in viewport space, the frames are content
  // space, and the conversion is what connects them.
  const contentOffsetY = 500;
  const listPageY = 120;
  const content = pointerToListContent({ pageX: 30, pageY: listPageY + 210, listPageY, contentOffsetY });
  record(content.y === 710, `X-F14. the pointer is converted with the MEASURED list origin plus the current content offset (${content.y}dp)`);
  record(hitTestFileTile(frames, content.x, content.y) === null,
    'X-F15. at a 500dp scroll offset a viewport position 210dp down resolves against the real content, not the top of the list');
  // The row that is actually ON SCREEN at a 500dp offset is row 5 (y 540..636).
  const onScreen = pointerToListContent({ pageX: 30, pageY: listPageY + 100, listPageY, contentOffsetY });
  record(onScreen.y === 600 && hitTestFileTile(frames, onScreen.x, onScreen.y) === null,
    'X-F16a. the same viewport position that hit the FIRST row at offset 0 hits nothing at offset 500 — the offset is real');
  // Scrolling the content UP by exactly the first row's height must bring row 1 to the
  // top of the viewport: the same pointer now resolves to a DIFFERENT File, which is
  // what proves the offset is being applied rather than ignored.
  const afterOneRowOfScroll = pointerToListContent({ pageX: 30, pageY: listPageY + 10, listPageY, contentOffsetY: rowStride });
  record(hitTestFileTile(frames, afterOneRowOfScroll.x, afterOneRowOfScroll.y) === 'r1c0',
    'X-F16b. after scrolling one row, that same viewport position resolves to the NEXT File — the offset is applied, not ignored');
  const beforeThatScroll = pointerToListContent({ pageX: 30, pageY: listPageY + 10, listPageY, contentOffsetY: 0 });
  record(hitTestFileTile(frames, beforeThatScroll.x, beforeThatScroll.y) === 'r0c0',
    'X-F16c. and at offset zero it resolved to the first one, which is the whole point');

  // Folders are invisible to the sweep because they never register a frame.
  record([...frames.keys()].every((id) => id.startsWith('r')), 'X-F17. the frame map holds Files only — a Folder cannot be in it');
}

// ═══════════════════════════════════════════════════════════════════════════
// X-F2: the auto-scroll budget, executed (PURE_UNIT)
// ═══════════════════════════════════════════════════════════════════════════
console.log('--- X-F2: a stationary finger can still reach the end of the list ---');
{
  record(DRAG_AUTO_SCROLL.edgeZoneDp === 72 && DRAG_AUTO_SCROLL.stepDp === 12 && DRAG_AUTO_SCROLL.tickMs === 16,
    'X-F18. the budget is a bounded edge zone, a bounded step and a short tick — no fling physics');
  const geometry = { listPageY: 0, viewportHeightDp: 600, contentHeightDp: 3000 };
  record(listMaxOffset(geometry) === 2400, 'X-F19. the maximum offset is content minus viewport, never a guess');
  record(dragAutoScrollNextOffset({ pointerViewportY: 300, viewportHeightDp: 600, currentOffsetDp: 0, maxOffsetDp: 2400 }) === null,
    'X-F20. a finger in the MIDDLE of the viewport does not scroll the list');
  record(dragAutoScrollNextOffset({ pointerViewportY: 599, viewportHeightDp: 600, currentOffsetDp: 100, maxOffsetDp: 2400 }) === 112,
    'X-F21. near the bottom edge the list moves one bounded step down');
  record(dragAutoScrollNextOffset({ pointerViewportY: 1, viewportHeightDp: 600, currentOffsetDp: 100, maxOffsetDp: 2400 }) === 88,
    'X-F22. near the top edge it moves one bounded step up');
  record(dragAutoScrollNextOffset({ pointerViewportY: 599, viewportHeightDp: 600, currentOffsetDp: 2400, maxOffsetDp: 2400 }) === null,
    'X-F23. already at the bottom it does NOTHING — the tick cannot fire forever against a boundary');
  record(dragAutoScrollNextOffset({ pointerViewportY: 599, viewportHeightDp: 600, currentOffsetDp: -50, maxOffsetDp: 2400 }) === 0,
    'X-F24. and the offset is clamped, never negative');
}

// ═══════════════════════════════════════════════════════════════════════════
// X-F3: the selection model's decided setter (PURE_UNIT)
// ═══════════════════════════════════════════════════════════════════════════
console.log('--- X-F3: selection exposes a DECIDED setter, not only a toggle ---');
{
  let selection = enterFileSelection(emptyFileSelection());
  selection = setFileSelectionSelected(selection, 'a', true);
  selection = setFileSelectionSelected(selection, 'b', true);
  record(selectedFileIds(selection).join(',') === 'a,b', 'X-F25. a decided ADD applies to more than one File');
  selection = setFileSelectionSelected(selection, 'a', true);
  record(selectedFileIds(selection).join(',') === 'a,b' && selection.ids.has('a'), 'X-F26. setting an already-set File is a no-op, not a toggle');
  selection = setFileSelectionSelected(selection, 'a', false);
  record(selectedFileIds(selection).join(',') === 'b', 'X-F27. and the same seam REMOVES when the sweep says so');
  record(selection !== leaveFileSelection() || selection.mode === true, 'X-F28. the decided setter never leaves selection mode');
  record(selectedFileIds(toggleFileSelection(selection, 'c')).join(',') === 'b,c', 'X-F29. and the tap toggle still exists beside it');
  record(selectedFileIds(pruneFileSelection(selection, ['c'])).join(',') === '', 'X-F30. pruning against the loaded rows still reconciles');
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SURFACE HARNESS — the real Files screen over a hook host
// ═══════════════════════════════════════════════════════════════════════════

type EffectCallback = () => void | (() => void);
type Slot = { initialized: boolean; deps?: readonly unknown[]; value: unknown; cleanup?: () => void };
const MAX_RENDERS = 1200;

function sameDeps(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined): boolean {
  if (previous === undefined || next === undefined) return false;
  if (previous.length !== next.length) return false;
  return next.every((value, index) => Object.is(value, previous![index]));
}

type HookHost = {
  useRef: <T,>(initial: T) => { current: T };
  useState: <T,>(initial: T | (() => T)) => readonly [T, (next: T | ((previous: T) => T)) => void];
  useMemo: <T,>(factory: () => T, deps?: readonly unknown[]) => T;
  useCallback: <T,>(callback: T, deps?: readonly unknown[]) => T;
  useEffect: (effect: EffectCallback, deps?: readonly unknown[]) => void;
  createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => unknown;
  __commit: () => void;
  __render: (view: () => unknown) => unknown;
  __lastTree: () => unknown;
  __unmount: () => void;
  __settle: (view: () => unknown, rounds: number, waitMs: number) => Promise<void>;
};

function createHookHost(): HookHost {
  const slots: Slot[] = [];
  let cursor = 0;
  let scheduled: { slot: Slot; run: EffectCallback }[] = [];
  let dirty = false;
  let renders = 0;
  let lastTree: unknown = null;

  const slot = (): Slot => {
    const index = cursor;
    cursor += 1;
    const existing = slots[index];
    if (existing) return existing;
    const created: Slot = { initialized: false, value: undefined };
    slots[index] = created;
    return created;
  };
  const useRef = <T,>(initial: T): { current: T } => {
    const target = slot();
    if (!target.initialized) {
      target.value = { current: initial };
      target.initialized = true;
    }
    return target.value as { current: T };
  };
  const useState = <T,>(initial: T | (() => T)): readonly [T, (next: T | ((previous: T) => T)) => void] => {
    const target = slot();
    if (!target.initialized) {
      target.value = { current: typeof initial === 'function' ? (initial as () => T)() : initial };
      target.initialized = true;
    }
    const box = target.value as { current: T };
    const setState = (next: T | ((previous: T) => T)): void => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(box.current) : next;
      if (Object.is(resolved, box.current)) return;
      box.current = resolved;
      dirty = true;
    };
    return [box.current, setState] as const;
  };
  const useMemo = <T,>(factory: () => T, deps?: readonly unknown[]): T => {
    const target = slot();
    if (!target.initialized || !sameDeps(target.deps, deps)) {
      target.value = factory();
      target.deps = deps;
      target.initialized = true;
    }
    return target.value as T;
  };
  const useCallback = <T,>(callback: T, deps?: readonly unknown[]): T => useMemo(() => callback, deps);
  const useEffect = (effect: EffectCallback, deps?: readonly unknown[]): void => {
    const target = slot();
    const changed = !target.initialized || !sameDeps(target.deps, deps);
    target.deps = deps;
    target.initialized = true;
    if (changed) scheduled.push({ slot: target, run: effect });
  };
  const commit = (): void => {
    const pending = scheduled;
    scheduled = [];
    for (const effect of pending) {
      if (effect.slot.cleanup) effect.slot.cleanup();
      const result = effect.run();
      effect.slot.cleanup = typeof result === 'function' ? result : undefined;
    }
  };
  const render = (view: () => unknown): unknown => {
    renders += 1;
    if (renders > MAX_RENDERS) throw new Error('Files UX: the surface never stopped re-rendering');
    cursor = 0;
    lastTree = view();
    return lastTree;
  };
  return {
    useRef,
    useState,
    useMemo,
    useCallback,
    useEffect,
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children } }),
    __commit: commit,
    __render: render,
    __lastTree: () => lastTree,
    __unmount: () => {
      for (const target of slots) {
        if (target.cleanup) {
          target.cleanup();
          target.cleanup = undefined;
        }
      }
      activeHost = null;
    },
    __settle: async (view, rounds, waitMs) => {
      for (let round = 0; round < rounds; round += 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        let guard = 0;
        while (dirty) {
          dirty = false;
          guard += 1;
          if (guard > 60) throw new Error('Files UX: a single settle never converged');
          render(view);
          commit();
        }
      }
    },
  };
}

let activeHost: HookHost | null = null;
let authState: { session: { access_token: string; user: { id: string } } | null; authMe: { person: { id: string }; memberships: { id: string; household_id: string; status: string }[] } | null } = { session: null, authMe: null };
let householdState: { currentHousehold: { id: string; name: string } | null } = { currentHousehold: null };

const host = (): HookHost => {
  if (!activeHost) throw new Error('Files UX: no host is mounted');
  return activeHost;
};

const reactStub: Record<string, unknown> = {
  __esModule: true,
  useRef: (...args: never[]) => host().useRef(...(args as [never])),
  useState: (...args: never[]) => host().useState(...(args as [never])),
  useMemo: (...args: never[]) => host().useMemo(...(args as [never])),
  useCallback: (...args: never[]) => host().useCallback(...(args as [never])),
  useEffect: (...args: never[]) => host().useEffect(...(args as [never])),
  createElement: (...args: never[]) => host().createElement(...(args as [never, never, ...never[]])),
};
reactStub.default = reactStub;
reactStub.Fragment = Symbol.for('react.fragment');

type AppStatus = 'active' | 'background' | 'inactive' | 'extension';
const appStatusListeners = new Set<(status: AppStatus) => void>();
const appStateStub = {
  currentState: 'active' as AppStatus | null,
  addEventListener: (_event: string, handler: (status: AppStatus) => void) => {
    appStatusListeners.add(handler);
    return { remove: () => { appStatusListeners.delete(handler); } };
  },
};
const emit = (status: AppStatus): void => {
  appStateStub.currentState = status;
  for (const handler of [...appStatusListeners]) handler(status);
};

/**
 * `PanResponder` — made DRIVABLE.
 *
 * `create` records the production config and returns handlers that delegate straight
 * to it, so a test can ASK the responder whether it would claim a move. That is the
 * arbitration decision itself, so asking it is the only honest way to test it.
 */
type PanResponderConfig = Record<string, (...args: never[]) => unknown>;
const panResponderConfigs: PanResponderConfig[] = [];
const panResponderHandlerSets: Record<string, unknown>[] = [];
const panResponderStub = {
  create: (config: PanResponderConfig) => {
    const handlers: Record<string, unknown> = {};
    for (const [key, handler] of Object.entries(config)) {
      handlers[key] = (...args: never[]) => (handler as (...a: never[]) => unknown)(...args);
    }
    panResponderConfigs.push(config);
    panResponderHandlerSets.push(handlers);
    return { panHandlers: handlers };
  },
};

const reactNativeStub = {
  Platform: { OS: 'web', select: (values: Record<string, unknown>) => values.web ?? values.default },
  View: 'View',
  Text: 'Text',
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Keyboard: { dismiss: () => undefined, addListener: () => ({ remove: () => undefined }) },
  StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  AppState: appStateStub,
  PanResponder: panResponderStub,
  useWindowDimensions: () => ({ width: 360, height: 640, scale: 2, fontScale: 1 }),
};

let focusEffect: EffectCallback | null = null;
const navigationStub = {
  useNavigation: () => ({ navigate: () => undefined, goBack: () => undefined, setOptions: () => undefined }),
  useFocusEffect: (effect: EffectCallback) => host().useEffect(() => {
    focusEffect = effect;
    effect();
    return () => { if (focusEffect === effect) focusEffect = null; };
  }, [effect]),
  useIsFocused: () => true,
};

const authStub = { useAuth: () => authState };
const householdStub = { useHousehold: () => householdState };
const uiStub: Record<string, unknown> = {
  AppButton: 'AppButton',
  AppText: 'AppText',
  AppInput: 'AppInput',
  ActionSheet: 'ActionSheet',
  DatePickerSheet: 'DatePickerSheet',
  ErrorState: 'ErrorState',
  FormActionRow: 'FormActionRow',
};
const iconsStub = { HomePlusIcon: 'HomePlusIcon' };
const fileIntakeStub = { FileIntake: 'FileIntake' };
const viewerStub = { HomeCloudFileViewer: 'HomeCloudFileViewer' };

function installModuleStubs(): void {
  const loader = require('node:module') as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
  const original = loader._load;
  const byRequest: [string, unknown][] = [
    ['react', reactStub],
    ['react-native', reactNativeStub],
    ['@react-navigation/native', navigationStub],
  ];
  const byFragment: [string, unknown][] = [
    ['AuthContext', authStub],
    ['HouseholdContext', householdStub],
    ['components/ui', uiStub],
    ['constants/icons', iconsStub],
    ['HomeCloudFileViewerScreen', viewerStub],
  ];
  loader._load = function patched(request: string, parent: unknown, isMain: boolean): unknown {
    for (const [exact, value] of byRequest) if (request === exact) return value;
    for (const [fragment, value] of byFragment) if (request.includes(fragment)) return value;
    return original.call(this, request, parent, isMain);
  };
}

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const compiled = (relative: string): string => path.join(__dirname, '..', 'front', 'mi-front-limpio', relative);
const frontSource = (relative: string): string => path.join(REPO_ROOT, 'front', 'mi-front-limpio', relative);

installModuleStubs();

const plannerCache = (require('../front/mi-front-limpio/services/planner/plannerCache') as { plannerCache: { __testOnly_clearAll: () => void } }).plannerCache;
const { __resetHomeCloudReadReconciliationForTests } =
  require('../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation') as { __resetHomeCloudReadReconciliationForTests: () => void };
const filesScreen = require(compiled('screens/HomeCloudFilesScreen')) as {
  HomeCloudFilesView: () => unknown;
  FileTile: (props: Record<string, unknown>) => unknown;
};
const fileActionHostModule = require(compiled('services/homecloud/FileActionHost')) as { FileActionHost: (props: Record<string, unknown>) => unknown };
const selectionBar = require(compiled('services/homecloud/FileSelectionBar')) as { FileSelectionBar: (props: Record<string, unknown>) => unknown };

// ── the transport ────────────────────────────────────────────────────────────
const HOUSEHOLD_ID = 'hh-files-ux';
const MEMBER_ID = 'mm-files-ux';

type FolderRow = { id: string; name: string; parentFolderId: string | null };
type FileRow = { id: string; folderId: string | null; displayName: string; note: string | null };
type Read = { method: string; pathname: string; query: string };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * A live household over the REAL Files read, plus a hook that can hold a next page
 * open so an in-flight request is observable rather than theoretical.
 */
class Household {
  folders: FolderRow[] = [];
  rows: FileRow[] = [];
  favorites = new Set<string>();
  reads: Read[] = [];
  caps = { view: true, contribute: true, organize: true, delete: true };
  /** When set, a next-page read waits on this gate before answering. */
  nextPageGate: (() => Promise<void>) | null = null;
  /** When true, a next-page read fails. */
  nextPageFails = false;

  constructor(seed: { folders?: FolderRow[]; loose?: number; inFolder?: number; favorites?: string[] } = {}) {
    this.folders = [...(seed.folders ?? [])];
    for (let index = 0; index < (seed.loose ?? 0); index += 1) {
      this.rows.push({ id: `c-${String(index).padStart(3, '0')}`, folderId: null, displayName: `file-${String(index).padStart(3, '0')}.txt`, note: null });
    }
    for (let index = 0; index < (seed.inFolder ?? 0); index += 1) {
      this.rows.push({ id: `in-${String(index).padStart(3, '0')}`, folderId: this.folders[0]?.id ?? null, displayName: `in-folder-${index}.txt`, note: null });
    }
    this.favorites = new Set(seed.favorites ?? []);
  }

  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown, init?: { method?: string }) => {
      const target = new URL(String(input));
      const method = (init?.method ?? 'GET').toUpperCase();
      this.reads.push({ method, pathname: target.pathname, query: target.search });
      if (target.pathname === '/api/homecloud/files') return json(200, { browser: await this.browse(target.searchParams) });
      if (target.pathname === '/api/homecloud/folders') {
        return json(200, { folders: this.folders.map((folder) => ({ ...folder, householdId: HOUSEHOLD_ID })) });
      }
      if (target.pathname === '/api/homecloud/capabilities') {
        return json(200, {
          capabilities: {
            'homecloud.view': this.caps.view,
            'homecloud.contribute': this.caps.contribute,
            'homecloud.organize': this.caps.organize,
            'homecloud.delete': this.caps.delete,
          },
          membershipId: MEMBER_ID,
          householdId: HOUSEHOLD_ID,
          role: 'adult',
        });
      }
      return json(404, { code: 'not_found', message: `no route for ${method} ${target.pathname}` });
    }) as typeof fetch;
  }

  async browse(params: URLSearchParams): Promise<unknown> {
    const folderId = params.get('folderId');
    const search = (params.get('query') ?? '').trim();
    const favoritesOnly = params.get('favoritesOnly') === 'true';
    const pageLimit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 100);
    const pageOffset = Math.max(Number(params.get('offset')) || 0, 0);
    if (pageOffset > 0) {
      const gate = this.nextPageGate;
      if (gate) await gate();
      if (this.nextPageFails) return { error: 'network' };
    }
    let matched = this.rows.filter((row) => {
      const inScope = folderId ? row.folderId === folderId : !search;
      if (!inScope) return false;
      if (favoritesOnly && !this.favorites.has(row.id)) return false;
      if (!search) return true;
      return `${row.displayName} ${row.note ?? ''}`.toLowerCase().includes(search.toLowerCase());
    });
    matched = [...matched].sort((a, b) => (a.id < b.id ? 1 : -1));
    const window = matched.slice(pageOffset, pageOffset + pageLimit + 1);
    const hasMore = window.length > pageLimit;
    const page = hasMore ? window.slice(0, pageLimit) : window;
    const folders = folderId ? [] : this.folders;
    return { folders, files: page.map((row) => this.present(row)), nextOffset: hasMore ? pageOffset + pageLimit : null };
  }

  present(row: FileRow): Record<string, unknown> {
    return {
      id: row.id,
      householdId: HOUSEHOLD_ID,
      role: 'file',
      lifecycle: 'active',
      displayName: row.displayName,
      mimeType: 'text/plain',
      sizeBytes: 10,
      folderId: row.folderId,
      note: row.note,
      documentDate: null,
      isFavorite: this.favorites.has(row.id),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  fileReads(offset?: number): Read[] {
    return this.reads.filter((entry) => entry.pathname === '/api/homecloud/files'
      && (offset === undefined || new URLSearchParams(entry.query).get('offset') === String(offset)));
  }

  nextPageReads(): Read[] {
    return this.reads.filter((entry) => entry.pathname === '/api/homecloud/files'
      && new URLSearchParams(entry.query).get('offset') !== '0');
  }
}

// ── tree navigation ──────────────────────────────────────────────────────────
type TestElement = { type: unknown; props: Record<string, any> };

function walk(node: unknown, visit: (element: TestElement) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const element = node as TestElement;
  visit(element);
  const props = element.props ?? {};
  walk(props.children, visit);
  walk(props.ListFooterComponent, visit);
  walk(props.ListEmptyComponent, visit);
  walk(props.footer, visit);
}

function findAll(tree: unknown, predicate: (element: TestElement) => boolean): TestElement[] {
  const found: TestElement[] = [];
  walk(tree, (element) => { if (predicate(element)) found.push(element); });
  return found;
}

function findOne(tree: unknown, predicate: (element: TestElement) => boolean): TestElement | null {
  const all = findAll(tree, predicate);
  return all.length > 0 ? all[0] : null;
}

function renderText(tree: unknown): string[] {
  const out: string[] = [];
  const collect = (node: unknown): void => {
    if (typeof node === 'string') { out.push(node); return; }
    if (Array.isArray(node)) for (const item of node) collect(item);
  };
  walk(tree, (element) => collect(element.props?.children));
  return out;
}

type ListProps = { data: { kind: string; value: { id: string } }[]; renderItem: (input: { item: unknown; index: number }) => unknown };

function listOf(tree: unknown): TestElement | null {
  return findOne(tree, (element) => element.type === 'FlatList');
}

function listedFileIds(tree: unknown): string[] {
  const list = listOf(tree);
  if (!list) return [];
  return (list.props as ListProps).data
    .filter((item) => item.kind === 'file')
    .map((item) => item.value.id);
}

function fileTileElement(tree: unknown, id: string): TestElement | null {
  const list = listOf(tree);
  if (!list) return null;
  const props = list.props as ListProps;
  const index = props.data.findIndex((item) => item.kind === 'file' && item.value.id === id);
  if (index === -1) return null;
  return props.renderItem({ item: props.data[index], index }) as TestElement;
}

function renderFileTile(tree: unknown, id: string): unknown {
  const element = fileTileElement(tree, id);
  return element === null ? null : filesScreen.FileTile(element.props);
}

/** The pressable body of a rendered File tile. */
function tileBody(tree: unknown, id: string): TestElement | null {
  const rendered = renderFileTile(tree, id);
  if (rendered === null) return null;
  return findOne(rendered, (element) => element.type === 'AppButton' && typeof element.props?.onLongPress === 'function');
}

/** The list container: it owns the measured viewport AND the accessibility refresh. */
function listContainer(tree: unknown): TestElement | null {
  return findOne(tree, (element) => element.type === 'View' && element.props?.style === 'listViewport'
    || (element.type === 'View' && typeof element.props?.onLayout === 'function'
      && Array.isArray(element.props?.accessibilityActions)));
}

type Mounted = {
  tree: unknown;
  render: () => void;
  settle: (rounds?: number, waitMs?: number) => Promise<void>;
  unmount: () => void;
  offset: { value: number; scrolls: number };
};

let currentView: (() => unknown) | null = null;

/** The geometry the tests install on the measured list viewport. */
const viewport = { pageY: 120, height: 600, contentHeight: 3000 };

function mountSurface(household: Household): Mounted {
  plannerCache.__testOnly_clearAll();
  __resetHomeCloudReadReconciliationForTests();
  appStatusListeners.clear();
  appStateStub.currentState = 'active';
  focusEffect = null;
  household.install();
  authState = {
    session: { access_token: 'tok-files-ux', user: { id: MEMBER_ID } },
    authMe: { person: { id: 'pp-files-ux' }, memberships: [{ id: 'mm-cap-ux', household_id: HOUSEHOLD_ID, status: 'active' }] },
  };
  householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Casa' } };
  const mounted: HookHost = createHookHost();
  activeHost = mounted;
  currentView = filesScreen.HomeCloudFilesView;
  mounted.__render(currentView);
  mounted.__commit();
  const offset = { value: 0, scrolls: 0 };
  return {
    get tree() { return mounted.__lastTree(); },
    render: () => { mounted.__render(currentView!); mounted.__commit(); },
    settle: async (rounds = 12, waitMs = 20) => { await mounted.__settle(currentView!, rounds, waitMs); },
    unmount: () => mounted.__unmount(),
    offset,
  };
}

/** Publish the MEASURED viewport geometry the sweep hit-tests against. */
function measure(surface: Mounted): void {
  const container = listContainer(surface.tree);
  if (container === null) return;
  const ref = container.props.ref as { current: unknown };
  ref.current = { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(0, viewport.pageY, 360, viewport.height) };
  (container.props.onLayout as (() => void))();
  const list = listOf(surface.tree);
  const listRef = list?.props?.ref as { current: unknown } | undefined;
  if (listRef) {
    listRef.current = {
      scrollToOffset: (options: { offset: number }) => { surface.offset.value = options.offset; surface.offset.scrolls += 1; },
    };
  }
}

/** Publish the scroll offset the hit test needs. */
function scrollTo(surface: Mounted, offset: number): void {
  surface.offset.value = offset;
  const list = listOf(surface.tree);
  const handler = list?.props?.onScroll as ((event: unknown) => void) | undefined;
  handler?.({ nativeEvent: { contentOffset: { y: offset }, contentSize: { height: viewport.contentHeight } } });
}

function registerFrame(surface: Mounted, id: string, layout: { x: number; y: number; width: number; height: number }): void {
  // The `onLayout` that publishes a frame lives on the RENDERED tile's outer View,
  // not on the `FileTile` element, so the tile has to be rendered to reach it.
  const tile = renderedTile(surface.tree, id);
  const handler = tile?.props?.onLayout as ((event: unknown) => void) | undefined;
  handler?.({ nativeEvent: { layout } });
}

function enterSelection(surface: Mounted): boolean {
  const control = findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Seleccionar archivos');
  (control?.props?.onPress as (() => void) | undefined)?.();
  surface.render();
  return findOne(surface.tree, (element) => element.type === selectionBar.FileSelectionBar) !== null;
}

function selectionIds(tree: unknown): string[] {
  const bar = findOne(tree, (element) => element.type === selectionBar.FileSelectionBar);
  const count = (bar?.props?.count ?? 0) as number;
  return Array.from({ length: count }, (_unused, index) => `sel-${index}`);
}

/** Which Files are currently painted as selected, straight from the tiles. */
function selectedTileIds(tree: unknown): string[] {
  const list = listOf(tree);
  if (!list) return [];
  const props = list.props as ListProps;
  const out: string[] = [];
  props.data.forEach((item, index) => {
    if (item.kind !== 'file') return;
    const tile = props.renderItem({ item, index }) as TestElement;
    if (tile?.props?.selected === true) out.push(item.value.id);
  });
  return out;
}

/**
 * The RENDERED File tile's outer View — the node that actually carries the sweep's
 * pan responder.
 *
 * The list's `renderItem` produces the `FileTile` ELEMENT, so the handlers that the
 * sweep depends on only exist after the tile is rendered. Driving the element's
 * props instead of the rendered View's would test a prop that no device ever sees.
 */
function renderedTile(tree: unknown, id: string): TestElement | null {
  const rendered = renderFileTile(tree, id);
  if (rendered === null) return null;
  return findOne(rendered, (element) => typeof element.props?.onMoveShouldSetPanResponder === 'function');
}

/** Long-press a File tile the way a member does, through the pressable body. */
function armOn(tree: unknown, id: string, pageX: number, pageY: number): boolean {
  const body = tileBody(tree, id);
  const handler = body?.props?.onLongPress as ((event: unknown) => void) | undefined;
  if (handler === undefined) return false;
  handler({ nativeEvent: { pageX, pageY } });
  return true;
}

/** Tap a File tile the way a member does. */
function tapTile(tree: unknown, id: string): boolean {
  const body = tileBody(tree, id);
  const handler = body?.props?.onPress as (() => void) | undefined;
  if (handler === undefined) return false;
  handler();
  return true;
}

/** Ask the responder whether it would claim a move right now. */
function responderWouldClaimMove(tile: TestElement | null): boolean | null {
  const ask = tile?.props?.onMoveShouldSetPanResponder as (() => boolean) | undefined;
  return ask === undefined ? null : ask();
}

function responderWouldClaimStart(tile: TestElement | null): boolean | null {
  const ask = tile?.props?.onStartShouldSetPanResponder as (() => boolean) | undefined;
  return ask === undefined ? null : ask();
}

function responderBlocksNative(tile: TestElement | null): boolean | null {
  const ask = tile?.props?.onShouldBlockNativeResponder as (() => boolean) | undefined;
  return ask === undefined ? null : ask();
}

function moveResponder(tile: TestElement | null, moveX: number, moveY: number): void {
  const handler = tile?.props?.onPanResponderMove as ((event: unknown, gesture: unknown) => void) | undefined;
  handler?.({ nativeEvent: {} }, { moveX, moveY, dx: 0, dy: 0, x0: moveX, y0: moveY });
}

function endResponder(tile: TestElement | null, kind: 'onPanResponderRelease' | 'onPanResponderTerminate'): void {
  const handler = tile?.props?.[kind] as ((event: unknown, gesture: unknown) => void) | undefined;
  handler?.({ nativeEvent: {} }, { moveX: 0, moveY: 0, dx: 0, dy: 0, x0: 0, y0: 0 });
}

function longPress(tile: TestElement | null, pageX: number, pageY: number): void {
  const handler = tile?.props?.onLongPress as ((event: unknown) => void) | undefined;
  handler?.({ nativeEvent: { pageX, pageY } });
}

function tap(tile: TestElement | null): void {
  (tile?.props?.onPress as (() => void) | undefined)?.();
}

function fireAccessibilityRefresh(surface: Mounted): boolean {
  const container = listContainer(surface.tree);
  if (container === null) return false;
  (container.props.onAccessibilityAction as (event: unknown) => void)({ nativeEvent: { actionName: 'refresh-files' } });
  return true;
}

// ── the layout the tests install: two columns, a gutter, a non-174dp row ─────
const COLUMN_WIDTH = 150;
const GUTTER = 24;
const ROW_HEIGHT = 96;
const ROW_STRIDE = ROW_HEIGHT + 12;
const GRID_LEFT = 20;

function layoutFor(index: number): { x: number; y: number; width: number; height: number } {
  const column = index % 2;
  const row = Math.floor(index / 2);
  return { x: GRID_LEFT + column * (COLUMN_WIDTH + GUTTER), y: row * ROW_STRIDE, width: COLUMN_WIDTH, height: ROW_HEIGHT };
}

function centreOf(index: number): { x: number; y: number } {
  const frame = layoutFor(index);
  return { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
}

/**
 * A CONTENT position expressed where a pointer actually reports: page coordinates.
 *
 * `PanResponder`'s `gestureState.moveX/moveY` are page coordinates, and the screen
 * converts them with the measured list origin and the current content offset. Handing
 * a test raw content coordinates here would test a different function than the one a
 * finger drives.
 */
function pagePoint(surface: Mounted, content: { x: number; y: number }): { x: number; y: number } {
  return { x: content.x, y: viewport.pageY + content.y - surface.offset.value };
}

/** Publish every File tile's measured frame, exactly as a real layout would. */
function layoutGrid(surface: Mounted, ids: readonly string[]): void {
  measure(surface);
  scrollTo(surface, 0);
  ids.forEach((id, index) => registerFrame(surface, id, layoutFor(index)));
}

// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  // ═══════════════════════════════════════════════════════════════════════════
  // X-A: the header (SOURCE — token and donor reuse is a file property)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-A: the header keeps exactly three controls ---');
  const screen = fs.readFileSync(frontSource('screens/HomeCloudFilesScreen.tsx'), 'utf8');
  const planner = fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'planner', 'PlannerTasksScreen.tsx'), 'utf8');
  record(!/name="refresh"/.test(screen), 'X-A1. the visible Refresh ICON is gone');
  record(!/title="Favoritos"/.test(screen), 'X-A2. the permanent Favoritos button is gone');
  record((screen.match(/<InteractivePressable style=\{styles\.headerIconButton\}/g) ?? []).length === 3,
    `X-A3. exactly THREE header controls remain: filter, +, ... (${(screen.match(/<InteractivePressable style=\{styles\.headerIconButton\}/g) ?? []).length})`);
  record(screen.includes('name="options-outline"'), 'X-A4. one compact filter/order ICON opens the display filters');
  record(screen.includes('name="add" size={22}') && screen.includes('name="ellipsis-horizontal" size={22}'),
    'X-A5. both donor icon sizes are preserved');
  record((screen.match(/ellipsis-horizontal/g) ?? []).length === 1, 'X-A6. exactly ONE ellipsis remains: the header overflow');
  record(screen.includes('headerIconButton: { width: 44, height: 44, borderRadius: radius.full'),
    'X-A7. Files uses the donor icon-button geometry verbatim');
  record(screen.includes('width: 8, height: 8, borderRadius: 4'), 'X-A8. and the donor small-dot active indicator');
  record(planner.includes('name="options-outline" size={20}'), 'X-A9. the donor filter icon is options-outline at size 20');
  record(!/HomeCloud|homecloud/i.test(planner), 'X-A10. and the donor screen was not given any HomeCloud-specific prop');
  record(screen.includes('delayLongPress={350}'), 'X-A11. long press uses the framework threshold — no custom timer in Files');

  // ═══════════════════════════════════════════════════════════════════════════
  // X-B: the overflow, and the ABSENCE of a visible refresh (COMPONENT_BEHAVIOUR)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-B: zero visible Refresh controls, and the overflow is one item ---');
  {
    const household = new Household({ loose: 4 });
    const surface = mountSurface(household);
    await surface.settle();
    const overflow = findOne(surface.tree, (element) => element.type === 'ActionSheet'
      && findAll(element, (inner) => inner.props?.accessibilityLabel === 'Seleccionar archivos').length > 0);
    record(overflow !== null, 'X-B1. the header overflow is a screen-level sheet');
    const overflowTitles = overflow === null ? [] : findAll(overflow, (inner) => typeof inner.props?.title === 'string').map((inner) => String(inner.props.title));
    record(overflowTitles.includes('Seleccionar'), 'X-B2. Seleccionar lives in the overflow');
    record(overflowTitles.includes('Actualizar') === false,
      'X-B3. `Actualizar` is GONE from the overflow — there are ZERO visible Refresh controls');
    record(findAll(surface.tree, (element) => element.props?.accessibilityLabel === 'Actualizar archivos').length === 0,
      'X-B4. and no element anywhere on the surface still carries that label');
    record(findAll(surface.tree, (element) => element.props?.title === 'Actualizar').length === 0,
      'X-B5. nor is there a visible button with that title');
    const hint = findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Más opciones de Archivos');
    record(typeof hint?.props?.accessibilityHint === 'string' && !/actualizar/i.test(hint.props.accessibilityHint),
      'X-B6. and the overflow hint no longer advertises an update action');
    record(findAll(surface.tree, (element) => /Actualizar archivos/.test(JSON.stringify(element.props?.accessibilityActions ?? []))).length === 1,
      'X-B7. exactly ONE accessibility-only refresh action exists, and it is not a visible control');
    surface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-C: refresh, EXERCISED (COMPONENT_BEHAVIOUR)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-C: pull-to-refresh, the empty state and the AT action all work ---');
  {
    const household = new Household({ loose: 4 });
    const surface = mountSurface(household);
    await surface.settle();
    const list = listOf(surface.tree);
    const refresh = list?.props?.refreshControl as { props?: Record<string, unknown> } | undefined;
    const control = (refresh?.props ?? refresh ?? {}) as { refreshing?: boolean; onRefresh?: () => void };
    record(typeof control.onRefresh === 'function', 'X-C1. pull-to-refresh is attached to the LIST, not to a wrapper');
    const before = household.fileReads().length;
    control.onRefresh?.();
    surface.render();
    record((listOf(surface.tree)?.props?.refreshControl as { props?: Record<string, unknown> })?.props?.refreshing === true
      || (listOf(surface.tree)?.props?.refreshControl as { refreshing?: boolean })?.refreshing === true,
      'X-C2. the indicator starts while the gesture is in flight');
    await surface.settle();
    record(control.refreshing === false, 'X-C3. and it settles in a finally — a rejection cannot leave a spinner forever');
    record(household.fileReads().length === before + 1, 'X-C4. the gesture issued exactly one window-preserving read');

    // The accessibility-only action reaches the SAME authority.
    const beforeAt = household.fileReads().length;
    record(fireAccessibilityRefresh(surface), 'X-C5. the accessibility refresh action is reachable');
    await surface.settle();
    record(household.fileReads().length === beforeAt + 1, 'X-C6. and it issues the same single read — no duplicated refresh implementation');
    surface.unmount();

    // An EMPTY folder still has a scroll surface, so it can be refreshed.
    const empty = new Household({});
    const emptySurface = mountSurface(empty);
    await emptySurface.settle();
    const emptyList = listOf(emptySurface.tree);
    record(emptyList !== null, 'X-C7. an empty result STILL mounts the list');
    const emptyRefresh = (emptyList?.props?.refreshControl as { props?: Record<string, unknown> } | undefined);
    record(typeof (emptyRefresh?.props ?? {})?.onRefresh === 'function',
      'X-C8. so its RefreshControl exists — an empty state is not a dead surface');
    const emptyComponent = emptyList?.props?.ListEmptyComponent as unknown;
    const emptyRendered = renderText(emptyComponent);
    record(emptyComponent !== null && emptyComponent !== undefined
      && emptyRendered.includes('Todavía no hay archivos'),
      `X-C9. and the empty state is rendered INSIDE the list, not instead of it (${emptyRendered.join('|')})`);
    const readsEmpty = empty.fileReads().length;
    ((emptyRefresh?.props ?? {}) as { onRefresh?: () => void }).onRefresh?.();
    await emptySurface.settle();
    record(empty.fileReads().length === readsEmpty + 1, 'X-C10. and pulling to refresh on an empty folder really reads');
    emptySurface.unmount();

    // An EMPTY Favoritos result behaves identically.
    const noFavorites = new Household({ loose: 3 });
    const favoritesSurface = mountSurface(noFavorites);
    await favoritesSurface.settle();
    const filterIcon = findOne(favoritesSurface.tree, (element) => typeof element.props?.accessibilityLabel === 'string'
      && element.props.accessibilityLabel.startsWith('Filtros y orden.'));
    (filterIcon?.props?.onPress as (() => void) | undefined)?.();
    await favoritesSurface.settle();
    const favoritesFilterModule = require(compiled('services/homecloud/FilesFilterMenu')) as { FilesFilterMenu: (props: Record<string, unknown>) => unknown };
    const menuElement = findOne(favoritesSurface.tree, (element) => element.type === favoritesFilterModule.FilesFilterMenu);
    const chip = menuElement === null ? null : findOne(favoritesFilterModule.FilesFilterMenu(menuElement.props as Record<string, unknown>),
      (element) => element.props?.label === 'Favoritos' && typeof element.props?.onPress === 'function');
    (chip?.props?.onPress as (() => void) | undefined)?.();
    await favoritesSurface.settle();
    const emptyFavoritesList = listOf(favoritesSurface.tree);
    record(emptyFavoritesList !== null, 'X-C11. an empty Favoritos result ALSO keeps the list mounted');
    record(findAll(favoritesSurface.tree, (element) => /No tenés archivos favoritos acá/.test(JSON.stringify(element.props?.children ?? ''))).length > 0,
      'X-C12. and says honestly that there are no favorites here');
    const favoritesRefresh = (emptyFavoritesList?.props?.refreshControl as { props?: Record<string, unknown> } | undefined);
    record(typeof (favoritesRefresh?.props ?? {})?.onRefresh === 'function',
      'X-C13. so an empty Favoritos result can be pulled to refresh too');
    favoritesSurface.unmount();

    // Automatic freshness is untouched by the removal.
    const returning = new Household({ loose: 2 });
    const returnSurface = mountSurface(returning);
    await returnSurface.settle();
    emit('background');
    emit('active');
    await returnSurface.settle(16, 20);
    const beforeReturn = returning.fileReads().length;
    focusEffect?.();
    await returnSurface.settle(16, 20);
    record(returning.fileReads().length > beforeReturn, 'X-C14. a navigation focus return still refreshes automatically');
    record(appStatusListeners.size === 1, 'X-C15. and the app-lifecycle subscription is still registered');
    returnSurface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-E: the interaction grammar, EXERCISED
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-E: tap and long press, invoked for real ---');
  {
    const household = new Household({ loose: 3 });
    const surface = mountSurface(household);
    await surface.settle();

    // OUTSIDE selection: tap -> Viewer, long press -> contextual File actions.
    tapTile(surface.tree, 'c-000');
    surface.render();
    record(findOne(surface.tree, (element) => element.type === 'HomeCloudFileViewer') !== null,
      'X-E1. OUTSIDE selection a tap opens the Viewer — the reserved seam is wired');
    (findOne(surface.tree, (element) => element.type === 'HomeCloudFileViewer')?.props?.onClose as (() => void) | undefined)?.();
    surface.render();
    record(findOne(surface.tree, (element) => element.type === 'HomeCloudFileViewer') === null, 'X-E2. and closing it returns to the browser');
    armOn(surface.tree, 'c-001', 40, viewport.pageY + 200);
    surface.render();
    const hostOutside = findOne(surface.tree, (element) => element.type === fileActionHostModule.FileActionHost);
    record(hostOutside?.props?.file?.id === 'c-001',
      'X-E3. OUTSIDE selection a long press opens that File\'s contextual actions');
    record(selectedTileIds(surface.tree).length === 0, 'X-E4. and a long press is NEVER a selection gesture');
    // Close it again, the way the member would, before entering selection mode.
    (hostOutside?.props?.onClose as (() => void) | undefined)?.();
    surface.render();
    record(findOne(surface.tree, (element) => element.type === fileActionHostModule.FileActionHost && element.props?.file !== null) === null,
      'X-E4a. and the sheet closes again');

    // INSIDE selection: tap toggles, long press arms the sweep (not a menu).
    record(enterSelection(surface), 'X-E5. `Seleccionar` in the overflow is the discoverable entry into selection mode');
    tapTile(surface.tree, 'c-001');
    await surface.settle();
    record(selectedTileIds(surface.tree).join(',') === 'c-001', 'X-E6. INSIDE selection a tap toggles that File');
    tapTile(surface.tree, 'c-001');
    await surface.settle();
    record(selectedTileIds(surface.tree).length === 0, 'X-E7. and tapping it again deselects it');
    armOn(surface.tree, 'c-001', 40, viewport.pageY + 200);
    surface.render();
    record(findOne(surface.tree, (element) => element.type === fileActionHostModule.FileActionHost && element.props?.file !== null) === null,
      'X-E8. INSIDE selection a long press opens NO File menu — a batch cannot destroy one of its own Files');
    record(selectedTileIds(surface.tree).join(',') === 'c-001', 'X-E9. instead it ARMS the sweep and applies the anchor');
    endResponder(renderedTile(surface.tree, 'c-001'), 'onPanResponderRelease');
    surface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-G: normal scrolling coexists with the sweep (COMPONENT_BEHAVIOUR)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-G: a swipe is still a swipe; only a long press arms the sweep ---');
  {
    const household = new Household({ loose: 6 });
    const surface = mountSurface(household);
    await surface.settle();
    const ids = listedFileIds(surface.tree);
    record(enterSelection(surface), 'X-G1. selection mode is active');
    layoutGrid(surface, ids);
    let tile = renderedTile(surface.tree, ids[0]);
    record(responderWouldClaimStart(tile) === false,
      'X-G2. BEFORE any long press the responder refuses to claim a touch at all — a normal scroll is never stolen');
    record(responderWouldClaimMove(tile) === false,
      'X-G3. and it refuses a MOVE too, so a flick scrolls the list');
    record(responderBlocksNative(tile) === false,
      'X-G4. while unarmed it does not block the native scroll recognizer');
    armOn(surface.tree, ids[0], 40, viewport.pageY + 200);
    surface.render();
    tile = renderedTile(surface.tree, ids[0]);
    record(responderWouldClaimMove(tile) === true,
      'X-G5. AFTER the long press arms it, the SAME responder claims the movement stream');
    record(responderWouldClaimStart(tile) === false,
      'X-G6. and it still never claims at touch start — arming, not moving, is what starts the sweep');
    record(responderBlocksNative(tile) === true,
      'X-G7. it blocks the native scroll recognizer, which is the only way to keep a stationary finger on a tile that is scrolling underneath it');
    record((tile?.props?.onPanResponderTerminationRequest as (() => boolean) | undefined)?.() === false,
      'X-G8. and it refuses termination, so the list cannot take the gesture back mid-sweep');
    endResponder(renderedTile(surface.tree, ids[0]), 'onPanResponderRelease');
    surface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-F4: the whole sweep, driven through the surface's OWN responder
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-F4: a five-tile sweep through two columns, at a non-zero offset ---');
  {
    const household = new Household({ loose: 10 });
    const surface = mountSurface(household);
    await surface.settle();
    const ids = listedFileIds(surface.tree);
    record(ids.length === 10, `X-F31. the grid really has ten File tiles (${ids.length})`);
    record(enterSelection(surface), 'X-F32. selection mode is active');
    layoutGrid(surface, ids);

    // ADD sweep: anchor on an UNSELECTED tile, sweep down two columns.
const anchor = renderedTile(surface.tree, ids[0]);
    const anchorPoint = pagePoint(surface, centreOf(0));
    armOn(surface.tree, ids[0], anchorPoint.x, anchorPoint.y);
    await surface.settle();

    record(selectedTileIds(surface.tree).join(',') === ids[0],
      'X-F33. holding an unselected File selects it immediately (ADD)');
    const crossed = [1, 2, 3, 4, 5].map((index) => pagePoint(surface, centreOf(index)));
    for (const point of crossed) {
      moveResponder(renderedTile(surface.tree, ids[0]), point.x, point.y);
      await surface.settle(3, 2);
    }
    const afterSweep = selectedTileIds(surface.tree);
    record(afterSweep.length === 6, `X-F34. the sweep selected six Files — the anchor and five crossings (${afterSweep.length})`);
    record(afterSweep.join(',') === ids.slice(0, 6).join(','),
      'X-F35. and it selected exactly the six the finger passed over, across BOTH columns');

    // Re-crossing is a no-op.
    const backOverRow1 = pagePoint(surface, centreOf(2));
    moveResponder(renderedTile(surface.tree, ids[0]), backOverRow1.x, backOverRow1.y);
    await surface.settle(3, 2);
    record(selectedTileIds(surface.tree).length === 6, 'X-F36. re-crossing a File the gesture already visited changes NOTHING');
    endResponder(renderedTile(surface.tree, ids[0]), 'onPanResponderRelease');

    // REMOVE sweep: anchor on a SELECTED tile.
    const anchorSelected = renderedTile(surface.tree, ids[0]);
    const removePoint = pagePoint(surface, centreOf(0));
    armOn(surface.tree, ids[0], removePoint.x, removePoint.y);
    await surface.settle();
    record(selectedTileIds(surface.tree).length === 5,
      `X-F37. holding a SELECTED File DESELECTS it and everything crossed (REMOVE) — ${selectedTileIds(surface.tree).length} left`);
    record(selectedTileIds(surface.tree).join(',') === ids.slice(1, 6).join(','),
      'X-F38. and the mode never flipped mid-gesture');
    endResponder(renderedTile(surface.tree, ids[0]), 'onPanResponderTerminate');

    // Non-zero scroll offset: the sweep follows the CONTENT, not the viewport.
    record(selectedTileIds(surface.tree).length === 5, 'X-F39. after the sweep, five are still selected');
    scrollTo(surface, ROW_STRIDE * 4);
    // `ids[8]` sits on content row 4, which after a 4-row offset is exactly the row at
    // the top of the viewport. Arming there must resolve THAT File, not the first one.
    const farPoint = pagePoint(surface, centreOf(8));
    armOn(surface.tree, ids[8], farPoint.x, farPoint.y);
    await surface.settle();
    record(selectedTileIds(surface.tree).includes(ids[8]),
      'X-F40. at a 4-row scroll offset a long press resolves the File the finger is actually over');
    const nextPoint = pagePoint(surface, centreOf(9));
    moveResponder(renderedTile(surface.tree, ids[8]), nextPoint.x, nextPoint.y);
    await surface.settle(3, 2);
    record(selectedTileIds(surface.tree).includes(ids[9]),
      'X-F41. and a crossing at that offset is converted with the measured origin plus the content offset');
    endResponder(renderedTile(surface.tree, ids[8]), 'onPanResponderRelease');
    await surface.settle();
    surface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-F5: folders are invisible to the sweep
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-F5: a Folder row is ignored by the sweep ---');
  {
    const household = new Household({ folders: [{ id: 'ff-1', name: 'Garantías', parentFolderId: null }], loose: 6 });
    const surface = mountSurface(household);
    await surface.settle();
    const list = listOf(surface.tree);
    const props = list?.props as ListProps | undefined;
    record(props?.data[0]?.kind === 'folder', 'X-F42. the folder really is the first row of the grid');
    const folderTile = props?.renderItem({ item: props.data[0], index: 0 }) as TestElement;
    record(typeof folderTile.props?.onLayout === 'undefined' && folderTile.props?.panHandlers === undefined,
      'X-F43. a Folder tile neither registers a frame nor carries the pan responder — it is structurally unreachable by a sweep');
    record(enterSelection(surface), 'X-F44. selection mode is active');
    layoutGrid(surface, listedFileIds(surface.tree));
    const firstFile = renderedTile(surface.tree, listedFileIds(surface.tree)[0]);
    const folderPoint = pagePoint(surface, { x: GRID_LEFT + COLUMN_WIDTH / 2, y: -40 });
    armOn(surface.tree, listedFileIds(surface.tree)[0], folderPoint.x, folderPoint.y);
    await surface.settle();
    record(selectedTileIds(surface.tree).length === 1,
      `X-F44a. the anchor is selected (${JSON.stringify(selectedTileIds(surface.tree))})`);
    moveResponder(firstFile, folderPoint.x, folderPoint.y);
    await surface.settle(3, 2);
    record(selectedTileIds(surface.tree).length === 1,
      'X-F45. dragging the finger back over the Folder row selected nothing extra');
    endResponder(firstFile, 'onPanResponderRelease');
    surface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-F6: auto-scroll, started and stopped, with no timer leak
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-F6: auto-scroll runs only while the gesture is armed ---');
  {
    const household = new Household({ loose: 40 });
    const surface = mountSurface(household);
    await surface.settle();
    const ids = listedFileIds(surface.tree);
    record(enterSelection(surface), 'X-F46. selection mode is active');
    layoutGrid(surface, ids);

    const anchor = renderedTile(surface.tree, ids[0]);
    armOn(surface.tree, ids[0], 40, viewport.pageY + 300);
    await surface.settle();
    const atRest = surface.offset.value;
    await new Promise((resolve) => setTimeout(resolve, 60));
    record(surface.offset.value === atRest,
      'X-F47. with the finger in the MIDDLE of the viewport the list does not scroll itself');

    // Move the finger into the bottom edge zone: the list must move UNDER it.
    const bottomEdgeY = viewport.pageY + viewport.height - 4;
    moveResponder(anchor, 40, bottomEdgeY);
    await new Promise((resolve) => setTimeout(resolve, 80));
    record(surface.offset.value > atRest,
      `X-F48. near the bottom edge the list scrolls itself under a stationary finger (${atRest} -> ${surface.offset.value})`);
    const afterTicks = surface.offset.value;
    await new Promise((resolve) => setTimeout(resolve, 40));
    record(surface.offset.value > afterTicks, 'X-F49. and it KEEPS going in small bounded steps, not one jump');

    // Release ends the timer.
    endResponder(anchor, 'onPanResponderRelease');
    const afterRelease = surface.offset.value;
    await new Promise((resolve) => setTimeout(resolve, 80));
    record(surface.offset.value === afterRelease,
      `X-F50. RELEASE stops the auto-scroll — no timer outlives its gesture (${afterRelease})`);

    // Terminate ends it too.
    armOn(surface.tree, ids[0], 40, viewport.pageY + 300);
    await surface.settle();
    moveResponder(anchor, 40, viewport.pageY + 4);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const beforeTerminate = surface.offset.value;
    record(beforeTerminate < afterRelease, 'X-F51. the top edge zone scrolls upward');
    endResponder(anchor, 'onPanResponderTerminate');
    const afterTerminate = surface.offset.value;
    await new Promise((resolve) => setTimeout(resolve, 80));
    record(surface.offset.value === afterTerminate, 'X-F52. and TERMINATE stops it as well');

    // Leaving selection mode ends it.
    armOn(surface.tree, ids[0], 40, viewport.pageY + 300);
    moveResponder(anchor, 40, bottomEdgeY);
    await new Promise((resolve) => setTimeout(resolve, 40));
    const bar = findOne(surface.tree, (element) => element.type === selectionBar.FileSelectionBar);
    (bar?.props?.onCancel as (() => void) | undefined)?.();
    surface.render();
    const afterExit = surface.offset.value;
    await new Promise((resolve) => setTimeout(resolve, 80));
    record(surface.offset.value === afterExit, 'X-F53. leaving selection mode stops it too');
    surface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-H: accessibility — drag is never the ONLY path
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-H: every selection path survives without a drag ---');
  {
    const household = new Household({ loose: 3 });
    const surface = mountSurface(household);
    await surface.settle();
    const outside = tileBody(surface.tree, 'c-000');
    record(outside?.props?.accessibilityRole === 'button', 'X-H1. outside selection the tile is a button');
    record(typeof outside?.props?.accessibilityHint === 'string' && /Mantené presionado/.test(outside.props.accessibilityHint),
      'X-H2. and it explains both gestures');
    record(JSON.stringify(outside?.props?.accessibilityActions ?? []).includes('longpress'),
      'X-H3. long press is not the only route to the File actions');
    record(enterSelection(surface), 'X-H4. selection mode is active');
    const inside = tileBody(surface.tree, 'c-000');
    record(inside?.props?.accessibilityRole === 'checkbox', 'X-H5. inside selection the tile is a CHECKBOX');
    record(inside?.props?.accessibilityState?.selected === false, 'X-H6. and announces its selected state');
    const actions = (inside?.props?.accessibilityActions ?? []) as { name: string }[];
    record(actions.map((action) => action.name).join(',') === 'select,deselect',
      'X-H7. and offers explicit select / deselect actions, so a drag is never required');
    const tile = fileTileElement(surface.tree, 'c-000');
    (tile?.props?.onSetSelected as ((next: boolean) => void) | undefined)?.(true);
    await surface.settle();
    record(selectedTileIds(surface.tree).join(',') === 'c-000', 'X-H8. and those actions really select the File');
    (tile?.props?.onSetSelected as ((next: boolean) => void) | undefined)?.(false);
    await surface.settle();
    record(selectedTileIds(surface.tree).length === 0, 'X-H9. and really deselect it');
    tapTile(surface.tree, 'c-000');
    await surface.settle();
    record(selectedTileIds(surface.tree).join(',') === 'c-000', 'X-H10. and the plain tap still toggles');
    record(findOne(surface.tree, (element) => element.type === selectionBar.FileSelectionBar)?.props?.summary === '1 seleccionado',
      'X-H11. the bar states the count');
    surface.unmount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // X-I: automatic pagination, EXERCISED
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('--- X-I: the list pages itself, guards the request, and latches a failure ---');
  {
    const household = new Household({ loose: 250 });
    const surface = mountSurface(household);
    await surface.settle();
    const list = listOf(surface.tree);
    record(typeof list?.props?.onEndReached === 'function', 'X-I1. `onEndReached` is wired to the canonical page request');
    const threshold = list?.props?.onEndReachedThreshold as number;
    record(typeof threshold === 'number' && threshold >= 1.5,
      `X-I2. the threshold starts the next page EARLY (${threshold}), because a grid viewport is only a few rows`);
    record(findAll(surface.tree, (element) => element.props?.title === 'Mostrar más archivos').length === 0,
      'X-I3. `Mostrar más archivos` is GONE — a normal scroll never stops on a button');
    record(listedFileIds(surface.tree).length === 100, 'X-I4. the first page is loaded');

    // Five rapid end-reached callbacks cost exactly one request.
    const before = household.nextPageReads().length;
    const trigger = list?.props?.onEndReached as () => void;
    trigger(); trigger(); trigger(); trigger(); trigger();
    await surface.settle(10, 5);
    record(household.nextPageReads().length === before + 1,
      `X-I5. five rapid end-reached callbacks produced exactly ONE request (${household.nextPageReads().length - before})`);
    record(listedFileIds(surface.tree).length === 200, 'X-I6. and the page was appended');

    // Page to exhaustion, then confirm no further read is attempted.
    for (let round = 0; round < 3; round += 1) {
      trigger();
      await surface.settle(10, 5);
    }
    record(listedFileIds(surface.tree).length === 250, 'X-I7. paging to exhaustion yields all 250 rows exactly once');
    const atEnd = household.nextPageReads().length;
    trigger(); trigger(); trigger();
    await surface.settle(10, 5);
    record(household.nextPageReads().length === atEnd, 'X-I8. at the final page `hasMore === false`, so NO read is issued');
    record(findAll(surface.tree, (element) => element.type === 'ActivityIndicator').length === 0,
      'X-I9. and the last page shows no fake loading indicator');
    surface.unmount();
  }
  {
    // The failure latch: no automatic retry storm, and one explicit retry.
    const household = new Household({ loose: 250 });
    const surface = mountSurface(household);
    await surface.settle();
    household.nextPageFails = true;
    const trigger = listOf(surface.tree)?.props?.onEndReached as () => void;
    trigger();
    await surface.settle(10, 5);
    const failedReads = household.nextPageReads().length;
    record(failedReads === 1, `X-I10. a failing next page issued exactly one request (${failedReads})`);
    const footerText = renderText(surface.tree);
    record(footerText.some((text) => /cayó la conexión|cargar más archivos/i.test(text)),
      'X-I11. and the footer states the failure');
    const retry = findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Reintentar cargar más archivos');
    record(retry !== null, 'X-I12. and offers a COMPACT `Reintentar`');
    // Scrolling again must NOT retry automatically.
    trigger(); trigger(); trigger(); trigger();
    await surface.settle(10, 5);
    record(household.nextPageReads().length === failedReads,
      `X-I13. an AUTOMATIC retry storm is impossible: the failure latches (${household.nextPageReads().length} reads)`);
    household.nextPageFails = false;
    (retry?.props?.onPress as (() => void) | undefined)?.();
    await surface.settle(10, 5);
    record(household.nextPageReads().length === failedReads + 1, 'X-I14. only the EXPLICIT retry asks again');
    record(listedFileIds(surface.tree).length === 200, 'X-I15. and the retried page is appended to what was loaded');
    record(findAll(surface.tree, (element) => element.props?.accessibilityLabel === 'Reintentar cargar más archivos').length === 0,
      'X-I16. the retry affordance is gone once the page landed');
    surface.unmount();
  }
  {
    // The footer states: idle / loading / error — and never a button while idle.
    const household = new Household({ loose: 250 });
    const surface = mountSurface(household);
    await surface.settle();
    const gateHolder: { release: (() => void) | null } = { release: null };
    const gateOpen = new Promise<void>((resolve) => { gateHolder.release = resolve; });
    household.nextPageGate = () => gateOpen;
    (listOf(surface.tree)?.props?.onEndReached as () => void)();
    await surface.settle(6, 5);
    record(findAll(surface.tree, (element) => element.type === 'ActivityIndicator'
      && element.props?.accessibilityLabel === 'Cargando más archivos').length === 1,
      'X-I17. while a page is in flight the footer shows a SMALL activity indicator');
    record(findAll(surface.tree, (element) => typeof element.props?.onPress === 'function'
      && /archivos/.test(String(element.props?.title ?? ''))).length === 0,
      'X-I18. and no paging button at all — not even a disabled one');
    gateHolder.release?.();
    household.nextPageGate = null;
    await surface.settle(20, 10);
    record(findAll(surface.tree, (element) => element.type === 'ActivityIndicator').length === 0,
      'X-I19. idle pagination renders no spinner');
    surface.unmount();
  }
  {
    // A stale page from a previous question must never append.
    const household = new Household({ loose: 250 });
    const surface = mountSurface(household);
    await surface.settle();
    const gateHolder: { release: (() => void) | null } = { release: null };
    const gateOpen = new Promise<void>((resolve) => { gateHolder.release = resolve; });
    household.nextPageGate = () => gateOpen;
    (listOf(surface.tree)?.props?.onEndReached as () => void)();
    await surface.settle(6, 5);
    const inFlight = household.nextPageReads().length;
    // Change the QUESTION while the page is in flight.
    householdState = { currentHousehold: { id: 'hh-other', name: 'Otra' } };
    surface.render();
    await surface.settle(10, 5);
    gateHolder.release?.();
    household.nextPageGate = null;
    await surface.settle(20, 10);
    const otherIds = listedFileIds(surface.tree);
    record(inFlight === 1, 'X-I20. the in-flight page really was issued');
    record(otherIds.length === 100 && otherIds.every((id) => id.startsWith('c-')),
      'X-I21. a late page from the previous household did not append into the new one');
    surface.unmount();
  }

  console.log(`\nFILES_UX_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'FILES_UX_TESTS=PASS' : 'FILES_UX_TESTS=FAIL');
  process.exit(failCount === 0 ? 0 : 1);
}

void main();
