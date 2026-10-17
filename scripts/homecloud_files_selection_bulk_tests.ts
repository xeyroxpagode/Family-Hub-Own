/**
 * HomeCloud Files — CORE BASIC OPERATIONS, SLICE 1
 * (canonical file actions, multi-select, bulk move).
 *
 * What was still unproven — and unimplemented — was the small mobile V1 model a
 * member needs to actually organise a folder: pick more than one File, and move
 * them somewhere else in one intent. This file closes that at the seams that
 * decide it.
 *
 *  A. SELECTION MODEL. `homecloudFileSelection` is the real module: entering,
 *     one, many, deselect, clear, and pruning against a re-read. `loadMore`
 *     widening the context prunes nothing, which is the survival guarantee.
 *
 *  B. SELECTION ON THE REAL SURFACE. The real `HomeCloudFilesView` over a hook
 *     host and a real transport. Long press enters selection; a tap OUTSIDE
 *     selection mode changes nothing at all (the tap stays reserved for the
 *     Viewer); a tap INSIDE it toggles; the selected state is real and is
 *     exposed as `checkbox` + `selected`. Scope clearing is observed on folder,
 *     query, sort and household changes, and pruning on a same-context re-read.
 *
 *  C. CANONICAL ACTIONS. The real grammar module and the real host: the
 *     implemented actions, the one declared seam that is never rendered, and
 *     exactly ONE destination picker instance that both Move intents use.
 *     (LIFECYCLE V1 turned the `trash` seam into a real action.)
 *
 *  D. BULK MOVE. The real screen, the real `updateHomeCloudFile`, one
 *     `PATCH /api/homecloud/content/:contentId/file` per selected File. N
 *     selected produces exactly N mutations, all to the same destination,
 *     carrying only `folderId`. Partial failure is aggregated honestly, the
 *     successes are never rolled back, and the batch reconciles EXACTLY ONCE.
 *
 * NOTHING HomeCloud-owned is faked. The host supplies only what a device
 * supplies: React hooks, the presentational primitives, a navigation object and
 * the native transfer primitives.
 */

import * as path from 'node:path';

import type { FileSelection } from '../front/mi-front-limpio/services/homecloud/homecloudFileSelection';
import type { BulkMoveResult } from '../front/mi-front-limpio/services/homecloud/homecloudBulkMove';
import type {
  HomeCloudFileAction,
  HomeCloudFileActionDefinition,
  HomeCloudFileActionPermissions,
} from '../front/mi-front-limpio/services/homecloud/homecloudFileActions';

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

// ── the hook host: React for ONE mounted component ───────────────────────────

type EffectCallback = () => void | (() => void);

type Slot = { initialized: boolean; deps?: readonly unknown[]; value: unknown; cleanup?: () => void };

const MAX_RENDERS = 900;

function sameDeps(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined): boolean {
  if (previous === undefined || next === undefined) return false;
  if (previous.length !== next.length) return false;
  return previous.every((value, index) => Object.is(value, next[index]));
}

type HookHost = {
  useRef: <T>(initial: T) => { current: T };
  useState: <T>(initial: T | (() => T)) => readonly [T, (next: T | ((previous: T) => T)) => void];
  useMemo: <T>(factory: () => T, deps?: readonly unknown[]) => T;
  useCallback: <T>(callback: T, deps?: readonly unknown[]) => T;
  useEffect: (effect: EffectCallback, deps?: readonly unknown[]) => void;
  createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => unknown;
};

type HostInternals = {
  __commit: () => void;
  __render: (view: () => unknown) => unknown;
  __lastTree: () => unknown;
  __unmount: () => void;
  __settle: (view: () => unknown, rounds: number, waitMs: number) => Promise<void>;
};

type FullHost = HookHost & HostInternals;

function createHookHost(): FullHost {
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
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(box.current) : next;
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
    if (renders > MAX_RENDERS) throw new Error('Files slice 1: the surface never stopped re-rendering');
    cursor = 0;
    lastTree = view();
    return lastTree;
  };

  const host = {
    useRef,
    useState,
    useMemo,
    useCallback,
    useEffect,
    createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => ({
      type,
      props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children },
    }),
    Fragment: Symbol.for('react.fragment'),
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
    __settle: async (view: () => unknown, rounds: number, waitMs: number) => {
      for (let round = 0; round < rounds; round += 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        let guard = 0;
        while (dirty) {
          dirty = false;
          guard += 1;
          if (guard > 60) throw new Error('Files slice 1: a single settle never converged');
          render(view);
          commit();
        }
      }
    },
  };
  return host as FullHost;
}

// ── what a device would provide ──────────────────────────────────────────────

let activeHost: FullHost | null = null;
let authState: { session: { access_token: string; user: { id: string } } | null } = { session: null };
let householdState: { currentHousehold: { id: string; name: string } | null } = { currentHousehold: null };

let navigations: unknown[][] = [];
let downloadCalls: { contentId: string; displayName: string }[] = [];
let shareCalls: string[] = [];

const hostModules = (): FullHost => {
  if (!activeHost) throw new Error('Files slice 1: no host is mounted');
  return activeHost;
};

const reactStub: Record<string, unknown> = {
  __esModule: true,
  useRef: (...args: unknown[]) => hostModules().useRef(...(args as [never])),
  useState: (...args: unknown[]) => hostModules().useState(...(args as [never])),
  useMemo: (...args: unknown[]) => hostModules().useMemo(...(args as [never])),
  useCallback: (...args: unknown[]) => hostModules().useCallback(...(args as [never])),
  useEffect: (...args: unknown[]) => hostModules().useEffect(...(args as [never])),
  createElement: (...args: unknown[]) => hostModules().createElement(...(args as [never, never, ...never[]])),
  // The shared reduced-motion hook (used by the HC-POL motion surfaces) is built
  // on `useSyncExternalStore`, so the stub has to expose it too.
  useSyncExternalStore: (
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => unknown,
  ) => {
    const [value, setValue] = hostModules().useState(getSnapshot as () => never);
    hostModules().useEffect(() => subscribe(() => setValue(getSnapshot as () => never)), []);
    return value;
  },
};
reactStub.default = reactStub;
reactStub.Fragment = Symbol.for('react.fragment');

/**
 * `PanResponder` — the drag-selection seam, made DRIVABLE.
 *
 * `create` records the production config and returns handlers that delegate straight
 * to it, so a test can invoke the REAL callbacks — including the ones that decide
 * whether the responder claims a move stream at all — instead of only inspecting
 * them.
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

/** The most recently created responder's config + handlers. */
function latestPanResponder(): { config: PanResponderConfig; handlers: Record<string, unknown> } {
  const index = panResponderConfigs.length - 1;
  if (index < 0) throw new Error('no PanResponder was created');
  return { config: panResponderConfigs[index], handlers: panResponderHandlerSets[index] };
}
const reactNativeStub = {
  Platform: { OS: 'web', select: (values: Record<string, unknown>) => values.web ?? values.default },
  View: 'View',
  Text: 'Text',
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Keyboard: { dismiss: () => undefined },
  StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  PanResponder: panResponderStub,
  // The Files surface subscribes to app foreground as a freshness boundary, so
  // the device primitive is part of what this host must provide. It is inert
  // here: no test in this file drives it.
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  // The viewer layer's box (HC-POL-012/057) is the window, so the screen reads
  // the window dimensions at tap time.
  useWindowDimensions: () => ({ width: 360, height: 640, scale: 2, fontScale: 1 }),
  // The animation clock the HC-POL motion surfaces need. Deterministic: every
  // animation settles on its target in one step. `Animated.View` keeps its own
  // tag so assertions about a plain `View` never count animated wrappers.
  Animated: {
    createAnimatedComponent: (component: unknown) => component,
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    Value: class AnimatedValueStub {
      private current: number;
      constructor(initial: number) { this.current = initial; }
      setValue(next: number): void { this.current = next; }
      /**
       * RN parity: `AnimatedInterpolation.js::checkValidRanges` throws while it
       * BUILDS a config whose ranges disagree — so an incompatible pair kills a
       * screen during RENDER, not during a gesture. A stub that returned `this`
       * for any config is exactly what let that defect reach iOS, so the
       * invariant is enforced here, on the real mount path.
       */
      interpolate(config?: { inputRange?: readonly number[]; outputRange?: readonly number[] }): this {
        const inputRange = config?.inputRange;
        const outputRange = config?.outputRange;
        if (inputRange && outputRange && inputRange.length !== outputRange.length) {
          throw new Error(`Invariant Violation: inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must have the same length`);
        }
        return this;
      }
      addListener(): string { return 'listener'; }
      removeListener(): void { }
      stopAnimation(callback?: (value: number) => void): void { callback?.(this.current); }
    },
    timing: (value: { setValue(next: number): void }, config: { toValue: number }) => ({
      start: (callback?: () => void) => { value.setValue(config.toValue); callback?.(); },
      stop: () => undefined,
    }),
    spring: (value: { setValue(next: number): void }, config: { toValue: number }) => ({
      start: (callback?: () => void) => { value.setValue(config.toValue); callback?.(); },
      stop: () => undefined,
    }),
    sequence: (steps: { start(callback?: () => void): void }[]) => ({
      start: (callback?: () => void) => { for (const step of steps) step.start(); callback?.(); },
      stop: () => undefined,
    }),
    parallel: (steps: { start(callback?: () => void): void }[]) => ({
      start: (callback?: () => void) => { for (const step of steps) step.start(); callback?.(); },
      stop: () => undefined,
    }),
  },
  Easing: {
    linear: (value: number) => value,
    ease: (value: number) => value,
    quad: (value: number) => value,
    cubic: (value: number) => value,
    in: () => (value: number) => value,
    out: () => (value: number) => value,
    inOut: () => (value: number) => value,
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: async () => false,
    addEventListener: () => ({ remove: () => undefined }),
  },
};

const navigationStub = {
  useNavigation: () => ({
    navigate: (...args: unknown[]) => { navigations.push(args); },
    goBack: () => undefined,
    setOptions: () => undefined,
  }),
  useFocusEffect: (effect: EffectCallback) => hostModules().useEffect(() => { effect(); }, [effect]),
  useIsFocused: () => true,
};

const authStub = { useAuth: () => authState };
const householdStub = { useHousehold: () => householdState };
const uiStub = {
  AppButton: 'AppButton',
  AppText: 'AppText',
  AppInput: 'AppInput',
  ActionSheet: 'ActionSheet',
  AdaptiveActionMenu: 'AdaptiveActionMenu',
  AdaptiveMenuRow: 'AdaptiveMenuRow',
  AdaptiveMenuSeparator: 'AdaptiveMenuSeparator',
  DatePickerSheet: 'DatePickerSheet',
  ErrorState: 'ErrorState',
  FormActionRow: 'FormActionRow',
  menuAnchorFromEvent: () => null,
  // The header controls are InteractivePressables; leaving this out of the stub made the
  // component resolve to undefined and every header control mount with no type.
  InteractivePressable: 'InteractivePressable',
};
const iconsStub = { HomePlusIcon: 'HomePlusIcon' };
const fileIntakeStub = { FileIntake: 'FileIntake' };

/** The signed-transfer primitives, standing in as native. Kept in step with the
 *  production module surface: staging plus the two separate native hand-offs. */
const downloadStub = {
  downloadHomeCloudOriginal: async (_token: string, content: { id: string; displayName: string; mimeType: string }) => {
    downloadCalls.push({ contentId: content.id, displayName: content.displayName });
    return {
      localUri: `file:///slice1/${content.displayName}`,
      name: content.displayName,
      sizeBytes: 10,
      mimeType: content.mimeType,
    };
  },
  stageHomeCloudOriginal: async (_token: string, content: { id: string; displayName: string; mimeType: string }) => {
    downloadCalls.push({ contentId: content.id, displayName: content.displayName });
    return {
      uri: `file:///slice1/${content.displayName}`,
      name: content.displayName,
      sizeBytes: 10,
      mimeType: content.mimeType,
    };
  },
  exportHomeCloudStagedCopy: async (_copy: { uri: string }) => undefined,
  shareHomeCloudDownloadedFile: async (file: { uri: string }) => { shareCalls.push(file.uri); },
  HomeCloudDownloadError: class HomeCloudDownloadError extends Error {},
};

const nativeFileSystem = {
  documentDirectory: 'file:///slice1-docs/',
  FileSystemUploadType: { BINARY_CONTENT: 1, UPLOAD_AS_FILES: 0 },
  FileSystemSessionType: { BACKGROUND: 0, FOREGROUND: 1 },
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: async (uri: string) => ({ exists: true, size: 128, modificationTime: 0, isDirectory: uri.endsWith('/'), uri }),
  makeDirectoryAsync: async () => undefined,
  copyAsync: async () => undefined,
  moveAsync: async () => undefined,
  deleteAsync: async () => undefined,
  readDirectoryAsync: async () => [],
  readAsStringAsync: async () => '',
  writeAsStringAsync: async () => undefined,
  createUploadTask: () => ({
    uploadAsync: async () => ({ status: 200, body: '', headers: {}, mimeType: null }),
    cancelAsync: async () => undefined,
  }),
};

function installModuleStubs(): void {
  const loader = require('node:module') as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
  const original = loader._load;
  const byRequest: [string, unknown][] = [
    ['react', reactStub],
    ['react-native', reactNativeStub],
    ['react-native-safe-area-context', {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      SafeAreaProvider: 'SafeAreaProvider',
      SafeAreaView: 'SafeAreaView',
    }],
    ['@react-navigation/native', navigationStub],
    ['expo-file-system/legacy', nativeFileSystem],
    ['expo-document-picker', { getDocumentAsync: async () => ({ canceled: true, assets: null }) }],
  ];
  const byFragment: [string, unknown][] = [
    ['AuthContext', authStub],
    ['HouseholdContext', householdStub],
    ['components/ui', uiStub],
    ['constants/icons', iconsStub],
    ['homecloudDownloadService', downloadStub],
  ];
  loader._load = function patched(request: string, parent: unknown, isMain: boolean): unknown {
    for (const [exact, value] of byRequest) if (request === exact) return value;
    for (const [fragment, value] of byFragment) if (request.includes(fragment)) return value;
    return original.call(this, request, parent, isMain);
  };
}

installModuleStubs();

const compiled = (relative: string): string => path.join(__dirname, '..', 'front', 'mi-front-limpio', relative);
/** The frontend SOURCE, three levels up out of the compiled scripts directory. */
const frontSource = (relative: string): string => path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio', relative);

const { plannerCache } = require('../front/mi-front-limpio/services/planner/plannerCache');
const { __resetHomeCloudReadReconciliationForTests } =
  require('../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation');
const { ApiError } = require('../front/mi-front-limpio/services/api') as {
  ApiError: new (message: string, status: number, code?: string) => Error;
};
const selectionModel = require(compiled('services/homecloud/homecloudFileSelection')) as {
  emptyFileSelection: () => FileSelection;
  enterFileSelection: (previous: FileSelection) => FileSelection;
  leaveFileSelection: () => FileSelection;
  selectFile: (previous: FileSelection, id: string) => FileSelection;
  deselectFile: (previous: FileSelection, id: string) => FileSelection;
  toggleFileSelection: (previous: FileSelection, id: string) => FileSelection;
  beginFileSelectionAt: (previous: FileSelection, id: string) => FileSelection;
  selectFolder: (previous: FileSelection, id: string) => FileSelection;
  deselectFolder: (previous: FileSelection, id: string) => FileSelection;
  toggleFolderSelection: (previous: FileSelection, id: string) => FileSelection;
  beginFolderSelectionAt: (previous: FileSelection, id: string) => FileSelection;
  toggleEntitySelection: (previous: FileSelection, entity: { type: 'file' | 'folder'; id: string }) => FileSelection;
  setEntitySelectionSelected: (previous: FileSelection, entity: { type: 'file' | 'folder'; id: string }, selected: boolean) => FileSelection;
  beginEntitySelectionAt: (previous: FileSelection, entity: { type: 'file' | 'folder'; id: string }) => FileSelection;
  clearSelectedFiles: (previous: FileSelection) => FileSelection;
  pruneFileSelection: (previous: FileSelection, visible: Iterable<string>) => FileSelection;
  pruneEntitySelection: (previous: FileSelection, validFiles: Iterable<string>, validFolders: Iterable<string>) => FileSelection;
  fileSelectionCount: (value: FileSelection) => number;
  isFileSelected: (value: FileSelection, id: string) => boolean;
  isFolderSelected: (value: FileSelection, id: string) => boolean;
  isEntitySelected: (value: FileSelection, entity: { type: 'file' | 'folder'; id: string }) => boolean;
  selectedFileIds: (value: FileSelection) => string[];
  selectedFolderIds: (value: FileSelection) => string[];
  selectionEntities: (value: FileSelection) => { type: 'file' | 'folder'; id: string }[];
  selectionHasFolders: (value: FileSelection) => boolean;
  fileSelectionSummary: (value: FileSelection) => string;
};
const dragSelection = require(compiled('services/homecloud/homecloudDragSelection')) as {
  beginDragSelection: (input: { anchorId: string; anchorSelected: boolean }) => { anchorId: string; mode: 'add' | 'remove'; visited: ReadonlySet<string> };
  applyDragSelectionStep: (gesture: { anchorId: string; mode: 'add' | 'remove'; visited: ReadonlySet<string> }, id: string) => { anchorId: string; mode: 'add' | 'remove'; visited: ReadonlySet<string> };
  dragSelectionTargetSelected: (gesture: { mode: 'add' | 'remove' }) => boolean;
  dragEntityKey: (kind: 'file' | 'folder', id: string) => string;
  parseDragEntityKey: (key: string) => { type: 'file' | 'folder'; id: string } | null;
  hitTestFileTile: (frames: ReadonlyMap<string, { x: number; y: number; width: number; height: number }>, x: number, y: number) => string | null;
  recordEntityTileFrame: (frames: ReadonlyMap<string, { x: number; y: number; width: number; height: number }>, key: string, frame: { x: number; y: number; width: number; height: number }) => ReadonlyMap<string, { x: number; y: number; width: number; height: number }>;
};
const gridGeometry = require(compiled('services/homecloud/homecloudFilesGridGeometry')) as {
  filesGridGeometry: (viewportWidth: number) => { paddingLeft: number; paddingRight: number; columnGap: number; columns: number; cellWidth: number };
};
const scannerGeometry = require(compiled('services/homecloud/homecloudScannerGeometry')) as {
  handleScreenSpaceScale: (zoomScale: number) => number;
  clampScale: (scale: number) => number;
};
const menuLayout = require(compiled('services/homecloud/adaptiveActionMenuLayout')) as {
  resolveAdaptiveMenuLayout: (input: {
    anchor: { x: number; y: number; width: number; height: number } | null;
    viewportWidth: number; viewportHeight: number; safeTop: number; safeBottom: number;
    keyboardHeight: number; menuWidth: number; menuHeight: number; fontScale: number; itemCount: number;
  }) => { presentation: 'sheet' } | { presentation: 'popover'; left: number; top: number; originX: number; originY: number };
};
const bulkMove = require(compiled('services/homecloud/homecloudBulkMove')) as {
  bulkMoveFiles: (input: {
    contentIds: readonly string[];
    destinationFolderId: string | null;
    moveFile: (id: string, changes: { folderId: string | null }) => Promise<unknown>;
  }) => Promise<BulkMoveResult>;
  bulkMoveFeedback: (result: BulkMoveResult, unit?: 'archivos' | 'elementos') => { tone: string; message: string };
  bulkMoveInFlight: (count: number, unit?: 'archivos' | 'elementos') => { tone: string; message: string };
};
const grammar = require(compiled('services/homecloud/homecloudFileActions')) as {
  HOMECLOUD_FILE_ACTION_GRAMMAR: HomeCloudFileActionDefinition[];
  HOMECLOUD_FILE_ACTION_SEAMS: string[];
  resolveFileActions: (permissions: HomeCloudFileActionPermissions) => HomeCloudFileAction[];
};
// Stage 2 Phase 1: the destination GRAMMAR moved into its own pure module, because
// the contract ("what destinations exist, in what order, which one is current") is
// not a rendering concern. The sheet still owns nothing but presentation. These
// assertions keep testing the same grammar, from its canonical home.
const destinationSheet = require(compiled('services/homecloud/FileMoveDestinationPicker')) as {
  FileMoveDestinationPicker: (props: Record<string, unknown>) => unknown;
};
const filesFilterMenuModule = require(compiled('services/homecloud/FilesFilterMenu')) as {
  FilesFilterMenu: (props: Record<string, unknown>) => unknown;
};
const destinationGrammar = require(compiled('services/homecloud/homecloudMoveDestinations')) as {
  ROOT_DESTINATION_FOLDER_ID: string | null;
  ROOT_DESTINATION_LABEL: string;
  fileMoveDestinations: (
    folders: { id: string; name: string; parentFolderId?: string | null }[],
    currentFolderId: string | null | undefined,
  ) => { folderId: string | null; label: string; path: string | null; depth: number; isCurrent: boolean }[];
};
const actionHost = require(compiled('services/homecloud/FileActionHost')) as {
  FileActionHost: (props: Record<string, unknown>) => unknown;
};
const filesScreen = require(compiled('screens/HomeCloudFilesScreen')) as {
  HomeCloudFilesView: () => unknown;
  FileTile: (props: Record<string, unknown>) => unknown;
};

// ── transport: the REAL backend contracts for Files ─────────────────────────

const HOUSEHOLD_ID = 'hh-slice1';
const MEMBER_ID = 'mm-slice1';

type Folder = { id: string; name: string; parentFolderId?: string | null };
type Row = { id: string; folderId: string | null; displayName: string; note: string | null };
type Request = { method: string; pathname: string; body: unknown };
type Refusal = { status: number; code: string };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * A live household over the EXISTING Files endpoints.
 *
 * `refuseContent`, `destinationRefusal` and `capabilityRefusal` are the typed
 * backend refusals the real service raises, and `onMoveCall` lets a scenario
 * change the household BETWEEN two mutations of the SAME batch — which is exactly
 * what "deleted mid-operation" and "revoked mid-operation" mean.
 */
class Household {
  folders: Folder[] = [];
  rows: Row[] = [];
  readonly requests: Request[] = [];
  refuseContent = new Map<string, Refusal>();
  destinationRefusal: Refusal | null = null;
  capabilityRefusal: Refusal | null = null;
  onMoveCall: ((index: number) => void) | null = null;
  organize = { view: true, contribute: true, organize: true, delete: true };

  constructor(seed: { folders?: Folder[]; loose?: number; inFolder?: Record<string, number> } = {}) {
    this.folders = [...(seed.folders ?? [])].map((folder) => ({ parentFolderId: null, ...folder }));
    for (let index = 0; index < (seed.loose ?? 0); index += 1) {
      this.rows.push({
        id: `c-${String(index).padStart(3, '0')}`,
        folderId: null,
        displayName: `file-${String(index).padStart(3, '0')}.txt`,
        note: null,
      });
    }
    for (const [folderId, count] of Object.entries(seed.inFolder ?? {})) {
      for (let index = 0; index < count; index += 1) {
        this.rows.push({ id: `in-${folderId}-${index}`, folderId, displayName: `in-${folderId}-${index}.txt`, note: null });
      }
    }
  }

  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown, init?: { method?: string; body?: unknown }) => {
      const target = new URL(String(input));
      const method = (init?.method ?? 'GET').toUpperCase();
      let body: unknown = null;
      if (typeof init?.body === 'string') {
        try { body = JSON.parse(init.body) as unknown; } catch { body = init.body; }
      }
      this.requests.push({ method, pathname: target.pathname, body });

      if (target.pathname === '/api/homecloud/files') return json(200, { browser: this.browse(target.searchParams) });
      if (target.pathname === '/api/homecloud/folders') {
        return json(200, { folders: this.folders.map((folder) => ({ ...folder, householdId: HOUSEHOLD_ID })) });
      }
      // THE EXISTING single-file Move endpoint. There is no bulk sibling.
      const contentMatch = /^\/api\/homecloud\/content\/(.+)\/file$/.exec(target.pathname);
      if (contentMatch && method === 'PATCH') return this.move(contentMatch[1], (body ?? {}) as { folderId?: string | null });
      // THE EXISTING single-folder Move endpoint. Files and folders move through
      // their own canonical contracts; the batch is N of these, never a bulk one.
      const folderMoveMatch = /^\/api\/homecloud\/folders\/(.+)\/move$/.exec(target.pathname);
      if (folderMoveMatch && method === 'POST') return this.moveFolder(folderMoveMatch[1], (body ?? {}) as { parentFolderId?: string | null });
      if (target.pathname === '/api/homecloud/capabilities') {
        return json(200, {
          capabilities: {
            'homecloud.view': this.organize.view,
            'homecloud.contribute': this.organize.contribute,
            'homecloud.organize': this.organize.organize,
            'homecloud.delete': this.organize.delete,
          },
          membershipId: MEMBER_ID,
          householdId: HOUSEHOLD_ID,
          role: 'adult',
        });
      }
      return json(404, { code: 'not_found', message: `no route for ${method} ${target.pathname}` });
    }) as typeof fetch;
  }

  /** Mirrors backend `updateFile`: capability first, then the folder, then the row. */
  private move(contentId: string, patch: { folderId?: string | null }): Response {
    const index = this.moveCalls.length - 1;
    if (this.capabilityRefusal) {
      return json(this.capabilityRefusal.status, { code: this.capabilityRefusal.code, message: 'Permiso denegado.' });
    }
    if (this.destinationRefusal && typeof patch.folderId === 'string') {
      return json(this.destinationRefusal.status, { code: this.destinationRefusal.code, message: 'La carpeta no existe.' });
    }
    const refusal = this.refuseContent.get(contentId);
    if (refusal) return json(refusal.status, { code: refusal.code, message: 'No encontrado.' });
    if (!Object.prototype.hasOwnProperty.call(patch, 'folderId')) {
      return json(400, { code: 'homecloud_no_file_changes', message: 'No hay cambios para guardar.' });
    }
    const row = this.rows.find((entry) => entry.id === contentId);
    if (!row) return json(404, { code: 'homecloud_content_not_found', message: 'Archivo no encontrado.' });
    row.folderId = patch.folderId ?? null;
    this.onMoveCall?.(index);
    return json(200, { file: { ...this.present(row), householdId: HOUSEHOLD_ID, role: 'file', lifecycle: 'active' } });
  }

  /** Mirrors the backend folder move: capability first, then the cycle check, then the row. */
  private moveFolder(folderId: string, patch: { parentFolderId?: string | null }): Response {
    if (!this.organize.organize) {
      return json(403, { code: 'homecloud_forbidden', message: 'Permiso denegado.' });
    }
    const folder = this.folders.find((entry) => entry.id === folderId);
    if (!folder) return json(404, { code: 'homecloud_folder_not_found', message: 'Carpeta no encontrada.' });
    const destination = patch.parentFolderId ?? null;
    if (destination === folderId) return json(409, { code: 'homecloud_folder_cycle', message: 'No se puede mover a sí misma.' });
    let cursor: string | null | undefined = destination;
    while (cursor) {
      if (cursor === folderId) return json(409, { code: 'homecloud_folder_cycle', message: 'No se puede mover dentro de un descendiente.' });
      cursor = this.folders.find((entry) => entry.id === cursor)?.parentFolderId;
    }
    if (destination !== null && !this.folders.some((entry) => entry.id === destination)) {
      return json(404, { code: 'homecloud_folder_not_found', message: 'La carpeta de destino ya no existe.' });
    }
    folder.parentFolderId = destination;
    return json(200, { folder: { ...folder, householdId: HOUSEHOLD_ID } });
  }

  /** Mirrors backend `browseFiles` AFTER the S4-iii has-more probe. */
  browse(params: URLSearchParams): unknown {
    const folderId = params.get('folderId');
    const search = (params.get('query') ?? '').trim();
    const sort = params.get('sort') ?? 'recent';
    const pageLimit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 100);
    const pageOffset = Math.max(Number(params.get('offset')) || 0, 0);
    let matched = this.rows.filter((row) => {
      const inScope = folderId ? row.folderId === folderId : (!search ? row.folderId === null : true);
      if (!inScope) return false;
      if (!search) return true;
      return `${row.displayName} ${row.note ?? ''}`.toLowerCase().includes(search.toLowerCase());
    });
    matched = sort === 'name'
      ? [...matched].sort((a, b) => (a.displayName < b.displayName ? -1 : 1))
      : [...matched].sort((a, b) => (a.id < b.id ? 1 : -1));
    const window = matched.slice(pageOffset, pageOffset + pageLimit + 1);
    const hasMore = window.length > pageLimit;
    const page = hasMore ? window.slice(0, pageLimit) : window;
    const folders = folderId ? [] : this.folders.filter((folder) => !search || folder.name.toLowerCase().includes(search.toLowerCase()));
    return { folders, files: page.map((row) => this.present(row)), nextOffset: hasMore ? pageOffset + pageLimit : null };
  }

  private present(row: Row): Record<string, unknown> {
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
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  get moveCalls(): Request[] {
    return this.requests.filter((entry) => entry.method === 'PATCH' && /^\/api\/homecloud\/content\/.+\/file$/.test(entry.pathname));
  }

  get folderMoveCalls(): Request[] {
    return this.requests.filter((entry) => entry.method === 'POST' && /^\/api\/homecloud\/folders\/.+\/move$/.test(entry.pathname));
  }

  fileReads(): Request[] {
    return this.requests.filter((entry) => entry.method === 'GET' && entry.pathname === '/api/homecloud/files');
  }

  /** Every request path that is not one the surface already used before this slice. */
  unknownPaths(): string[] {
    const known = new Set(['/api/homecloud/files', '/api/homecloud/folders', '/api/homecloud/capabilities']);
    return [...new Set(this.requests
      .map((entry) => entry.pathname)
      .filter((pathname) => !known.has(pathname) && !/^\/api\/homecloud\/content\/.+\/file$/.test(pathname) && !/^\/api\/homecloud\/folders\/.+\/move$/.test(pathname)))];
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
  // The empty state lives INSIDE the list now (STAGE 2 reopen), so a walker has to
  // descend into it exactly like the footer.
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

/** Every string leaf, flattening label arrays. */
function renderText(tree: unknown): string[] {
  const out: string[] = [];
  const collect = (node: unknown): void => {
    if (typeof node === 'string') { out.push(node); return; }
    if (Array.isArray(node)) { for (const item of node) collect(item); }
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
    .map((item) => `${item.kind}:${item.value.id}`)
    .filter((id) => id.startsWith('file:'))
    .map((id) => id.slice('file:'.length));
}

/** The element `renderItem` produced for one File — the props the tile was given. */
function fileTileElement(tree: unknown, id: string): TestElement | null {
  const list = listOf(tree);
  if (!list) return null;
  const props = list.props as ListProps;
  const index = props.data.findIndex((item) => item.kind === 'file' && item.value.id === id);
  if (index === -1) return null;
  return props.renderItem({ item: props.data[index], index }) as TestElement;
}

/** The element `renderItem` produced for one Folder — the props the tile was given. */
function folderTileElement(tree: unknown, id: string): TestElement | null {
  const list = listOf(tree);
  if (!list) return null;
  const props = list.props as ListProps;
  const index = props.data.findIndex((item) => item.kind === 'folder' && item.value.id === id);
  if (index === -1) return null;
  return props.renderItem({ item: props.data[index], index }) as TestElement;
}

const longPressFolder = (tree: unknown, id: string): boolean => {
  const tile = folderTileElement(tree, id);
  if (typeof tile?.props?.onLongPress !== 'function') return false;
  tile.props.onLongPress();
  return true;
};

const setFolderSelected = (tree: unknown, id: string, selected: boolean): boolean => {
  const tile = folderTileElement(tree, id);
  if (typeof tile?.props?.onSetSelected !== 'function') return false;
  tile.props.onSetSelected(selected);
  return true;
};

/** The REAL `FileTile` rendered, so its own accessibility output is what is asserted. */
function renderFileTile(tree: unknown, id: string): unknown {
  const element = fileTileElement(tree, id);
  return element ? filesScreen.FileTile(element.props) : null;
}

/** The pressable body of a rendered File tile. */
function tileBody(tree: unknown, id: string): TestElement | null {
  const rendered = renderFileTile(tree, id);
  return rendered ? findOne(rendered, (element) => (element.type === 'AppButton' || element.type === 'InteractivePressable')
    && typeof element.props.onLongPress === 'function') : null;
}

/** The overflow entry point of a rendered File tile. */
function tileOverflow(tree: unknown, id: string): TestElement | null {
  const rendered = renderFileTile(tree, id);
  return rendered
    ? findOne(rendered, (element) => element.type === 'AppButton' && typeof element.props.accessibilityLabel === 'string'
      && element.props.accessibilityLabel.startsWith('Acciones de'))
    : null;
}

function selectionBarElement(tree: unknown): TestElement | null {
  return findOne(tree, (element) => element.props?.accessibilityLabel === 'Salir de la selección');
}

function renderSelectionBar(tree: unknown): unknown {
  return selectionBarElement(tree) ? tree : null;
}

function selectionSummary(tree: unknown): string {
  if (!selectionBarElement(tree)) return '';
  return renderText(tree).find((text) => /^\d+ seleccionados?$/.test(text)) ?? '';
}

const bulkMenuElement = (tree: unknown): TestElement | null =>
  findOne(tree, (element) => element.type === 'AdaptiveActionMenu'
    && element.props?.visible === true
    && /^\d+ seleccionados?$/.test(String(element.props?.title ?? '')));

function openBulkMenu(surface: Mounted): TestElement | null {
  const trigger = findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Acciones para los elementos seleccionados');
  if (typeof trigger?.props?.onPress !== 'function') return null;
  trigger.props.onPress();
  surface.render();
  return bulkMenuElement(surface.tree);
}

function pressBulkMove(surface: Mounted): boolean {
  const menu = openBulkMenu(surface);
  const move = findOne(menu, (element) => element.props?.title === 'Mover');
  if (typeof move?.props?.onPress !== 'function') return false;
  move.props.onPress();
  surface.render();
  return true;
}

const pickerElements = (tree: unknown): TestElement[] =>
  findAll(tree, (element) => element.type === destinationSheet.FileMoveDestinationPicker);

const pickerElement = (tree: unknown): TestElement | null => pickerElements(tree)[0] ?? null;

const actionHostElement = (tree: unknown): TestElement | null =>
  findOne(tree, (element) => element.type === actionHost.FileActionHost);

/** The stated outcome of a finished batch, read from the transient toast overlay. */
function toastText(tree: unknown): string {
  const toast = findOne(tree, (element) => typeof element.type === 'function' && element.type.name === 'FileTransientToast');
  const value = (toast?.props as { value?: { message?: string } } | undefined)?.value;
  return typeof value?.message === 'string' ? value.message : '';
}

/** Legacy name kept for the call sites: the outcome is transient, never a banner row. */
function bannerText(tree: unknown): string {
  return toastText(tree);
}

function typeSearch(tree: unknown, text: string): boolean {
  const input = findOne(tree, (element) => element.props?.variant === 'search' && typeof element.props?.onChangeText === 'function');
  if (!input) return false;
  input.props.onChangeText(text);
  return true;
}

function pressFolder(tree: unknown, folderId: string): boolean {
  const list = listOf(tree);
  if (!list) return false;
  const props = list.props as ListProps;
  const index = props.data.findIndex((item) => item.kind === 'folder' && item.value.id === folderId);
  if (index === -1) return false;
  const tile = props.renderItem({ item: props.data[index], index }) as TestElement;
  if (typeof tile?.props?.onPress !== 'function') return false;
  tile.props.onPress();
  return true;
}



/**
 * The manual refresh path that still EXISTS: a same-context re-read, never a
 * first-page reset.
 *
 * STAGE 2 REOPEN: the visible `Actualizar` button is gone — the product truth is
 * ZERO visible Refresh controls. It is replaced by a custom ACCESSIBILITY action on
 * the list container, which reaches the SAME window-preserving authority. This fires
 * that action, and B33 asserts the visible button really is gone.
 */
function pressRefreshControl(tree: unknown): boolean {
  const container = findOne(tree, (element) => Array.isArray(element.props?.accessibilityActions)
    && element.props.accessibilityActions.some((action: { name?: string }) => action.name === 'refresh-files')
    && typeof element.props?.onAccessibilityAction === 'function');
  if (!container) return false;
  (container.props.onAccessibilityAction as (event: unknown) => void)({ nativeEvent: { actionName: 'refresh-files' } });
  return true;
}

/**
 * Choose an order through the ONE compact filter icon.
 *
 * STAGE 2 (Phase 2) SUPERSESSION. The order used to be a permanent titled button
 * found as the only titled sibling of the refresh control in the title row; Stage 2
 * removed the refresh control and moved both order and Favoritos behind one filter
 * icon, so that sibling is gone. The behavior proven by the caller is unchanged:
 * changing the order clears the selection, because the order is part of the
 * browser context the selection belongs to.
 */
async function chooseSortThroughFilterMenu(surface: Mounted, orderLabel: string): Promise<boolean> {
  const filterIcon = findOne(surface.tree, (element) => typeof element.props?.accessibilityLabel === 'string'
    && element.props.accessibilityLabel.startsWith('Filtros y orden.')
    && typeof element.props?.onPress === 'function');
  if (filterIcon) {
    filterIcon.props.onPress();
    await surface.settle();
  }
  // This host records elements but does not execute function components, so the
  // menu's options are reached by rendering the component with the props the SCREEN
  // gave it - the same technique this suite already uses for the File action host.
  const menuElement = findOne(surface.tree, (element) => element.type === filesFilterMenuModule.FilesFilterMenu);
  if (!menuElement) return false;
  const rendered = filesFilterMenuModule.FilesFilterMenu(menuElement.props as Record<string, unknown>);
  const chip = findOne(rendered, (element) => element.props?.label === orderLabel
    && typeof element.props?.onPress === 'function');
  if (!chip) return false;
  chip.props.onPress();
  return true;
}

/** The discoverable entry: the labelled "Seleccionar" row of the header overflow. */
function pressSelectControl(tree: unknown): boolean {
  const control = findOne(tree, (element) => element.props?.accessibilityLabel === 'Seleccionar elementos');
  if (typeof control?.props.onPress !== 'function') return false;
  control.props.onPress();
  return true;
}

const selectByLongPress = (tree: unknown, id: string): boolean => {
  const tile = fileTileElement(tree, id);
  if (typeof tile?.props?.onLongPress !== 'function') return false;
  tile.props.onLongPress();
  return true;
};

const tapFile = (tree: unknown, id: string): boolean => {
  const tile = fileTileElement(tree, id);
  if (typeof tile?.props?.onPress !== 'function') return false;
  tile.props.onPress();
  return true;
};

/**
 * Open a File's contextual actions the way a member now does: a LONG PRESS.
 *
 * STAGE 2 (Phase 2) SUPERSESSION. This pressed the per-File overflow ellipsis,
 * which Stage 2 removed. `onMore` is kept as a fallback so the helper keeps
 * describing "open this File's actions" rather than one particular control.
 */
const openTileActions = (tree: unknown, id: string): boolean => {
    const tile = fileTileElement(tree, id);
    const gesture = tile?.props?.onMenu ?? tile?.props?.onLongPress ?? tile?.props?.onMore;
    if (typeof gesture !== 'function') return false;
    (gesture as () => void)();
    return true;
  };

type Mounted = {
  tree: unknown;
  render: () => void;
  settle: (rounds?: number, waitMs?: number) => Promise<void>;
  unmount: () => void;
};

let currentView: (() => unknown) | null = null;

function mountSurface(household: Household): Mounted {
  plannerCache.__testOnly_clearAll();
  __resetHomeCloudReadReconciliationForTests();
  navigations = [];
  downloadCalls = [];
  shareCalls = [];
  household.install();
  authState = { session: { access_token: 'tok-slice1', user: { id: MEMBER_ID } } };
  householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Casa' } };
  const host: FullHost = createHookHost();
  activeHost = host;
  currentView = filesScreen.HomeCloudFilesView;
  host.__render(currentView);
  host.__commit();
  return {
    get tree() { return host.__lastTree(); },
    render: () => { host.__render(currentView!); host.__commit(); },
    settle: async (rounds = 12, waitMs = 20) => { await host.__settle(currentView!, rounds, waitMs); },
    unmount: () => host.__unmount(),
  };
}

/**
 * Enter selection mode and pick `ids`, through the production gestures only.
 *
 * PATCH 1B SUPERSESSION. Long press is selection again (one threshold, never
 * a menu): the entry here stays the discoverable header overflow
 * `Seleccionar`, and each File is then selected by tapping it. The resulting
 * MODEL is identical, which is what every caller asserts.
 */
function selectFiles(surface: Mounted, ids: readonly string[]): void {
  if (ids.length === 0) return;
  if (!selectionBarElement(surface.tree)) {
    pressSelectControl(surface.tree);
    surface.render();
  }
  for (const id of ids) {
    tapFile(surface.tree, id);
    surface.render();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// A — THE SELECTION MODEL (production state logic)
// ═══════════════════════════════════════════════════════════════════════════

function testSelectionModel(): void {
  console.log('\n=== A: the selection model IS the production state logic ===');
  const model = selectionModel;

  const empty = model.emptyFileSelection();
  record(empty.mode === false && empty.ids.size === 0, 'A1. selection starts empty and OUT of selection mode');

  const entered = model.enterFileSelection(empty);
  record(entered.mode === true, 'A2. the explicit entry turns the mode on');
  record(model.enterFileSelection(entered) === entered, 'A3. entering twice publishes no new state');

  const one = model.beginFileSelectionAt(empty, 'c-000');
  record(one.mode === true && model.isFileSelected(one, 'c-000'), 'A4. a long press enters the mode AND selects that File');

  const many = model.selectFile(model.selectFile(one, 'c-001'), 'c-002');
  record(model.fileSelectionCount(many) === 3, 'A5. selecting many accumulates');
  record(model.selectedFileIds(many).join(',') === 'c-000,c-001,c-002', 'A6. in the order they were chosen');

  const deselected = model.toggleFileSelection(many, 'c-001');
  record(model.fileSelectionCount(deselected) === 2 && !model.isFileSelected(deselected, 'c-001'), 'A7. a tap toggles one File off');
  record(model.isFileSelected(model.toggleFileSelection(deselected, 'c-001'), 'c-001'), 'A8. the same tap toggles it back on');
  record(model.selectFile(many, 'c-002') === many, 'A9. re-selecting an already selected File changes nothing');

  const cleared = model.clearSelectedFiles(many);
  record(cleared.mode === true && cleared.ids.size === 0, 'A10. clearing keeps the mode so the surface can restate an empty bar');
  record(model.clearSelectedFiles(cleared) === cleared, 'A11. and clearing an empty selection changes nothing');
  const left = model.leaveFileSelection();
  record(left.mode === false && left.ids.size === 0, 'A12. leaving selection mode clears it');

  // loadMore widens the visible context, so it must prune nothing.
  record(model.pruneFileSelection(many, ['c-000', 'c-001', 'c-002', 'c-003', 'c-004']).ids.size === 3,
    'A13. a loadMore (more rows visible) prunes nothing — selection SURVIVES paging');
  record(model.pruneFileSelection(many, ['c-000', 'c-001', 'c-002']) === many,
    'A14. and an unchanged context does not even publish a new state');

  // Reconciliation after a re-read: ids that are gone are stale.
  const pruned = model.pruneFileSelection(many, ['c-000', 'c-002']);
  record(model.fileSelectionCount(pruned) === 2 && !model.isFileSelected(pruned, 'c-001'), 'A15. a re-read PRUNES an id that is no longer visible');
  record(model.pruneFileSelection(many, []).ids.size === 0, 'A16. and a context that lost everything leaves no stale id');
  const emptyAgain = model.emptyFileSelection();
  record(model.pruneFileSelection(emptyAgain, ['c-000']) === emptyAgain, 'A17. pruning an empty selection is a no-op');

  record(model.fileSelectionSummary(model.selectFile(empty, 'c-000')) === '1 seleccionado', 'A18. the stated count is singular for one');
  record(model.fileSelectionSummary(many) === '3 seleccionados', 'A19. and plural for many');

  // PATCH 1B — folders are selectable and coexist with files.
  const withFolder = model.beginFolderSelectionAt(empty, 'ff-viajes');
  record(withFolder.mode === true && model.isFolderSelected(withFolder, 'ff-viajes'), 'A20. a folder long press enters the mode AND selects that folder');
  record(!model.isFileSelected(withFolder, 'ff-viajes'), 'A21. a folder id is never mistaken for a file id');
  const mixed = model.selectFile(withFolder, 'c-000');
  record(model.fileSelectionCount(mixed) === 2, 'A22. files and folders coexist in one selection');
  record(model.selectionHasFolders(mixed) === true && model.selectionHasFolders(many) === false, 'A23. folder presence is explicit for the bulk menu');
  record(model.fileSelectionSummary(mixed) === '2 seleccionados', 'A24. mixed copy stays neutral, never "N archivos"');
  record(model.selectionEntities(mixed).map((entry) => `${entry.type}:${entry.id}`).join(',') === 'file:c-000,folder:ff-viajes',
    'A25. entities carry their type for folder-aware operations');
  record(model.selectedFileIds(mixed).join(',') === 'c-000' && model.selectedFolderIds(mixed).join(',') === 'ff-viajes',
    'A26. file-only and folder-only projections stay separate');
  const toggledFolder = model.toggleFolderSelection(mixed, 'ff-viajes');
  record(!model.isFolderSelected(toggledFolder, 'ff-viajes') && model.isFileSelected(toggledFolder, 'c-000'),
    'A27. toggling a folder leaves sibling files untouched');
  const toggledEntity = model.toggleEntitySelection(toggledFolder, { type: 'folder', id: 'ff-otras' });
  record(model.isFolderSelected(toggledEntity, 'ff-otras'), 'A28. entity toggle works for either kind');
  const painted = model.setEntitySelectionSelected(toggledEntity, { type: 'file', id: 'c-001' }, true);
  record(model.isFileSelected(painted, 'c-001'), 'A29. drag paint sets a decided state per entity');
  const prunedEntities = model.pruneEntitySelection(painted, ['c-000', 'c-001'], ['ff-otras']);
  record(prunedEntities === painted, 'A30. pruning with all identities valid publishes no new state');
  const prunedGone = model.pruneEntitySelection(painted, ['c-000'], []);
  record(model.fileSelectionCount(prunedGone) === 1 && model.isFileSelected(prunedGone, 'c-000'),
    'A31. pruning drops only proven-invalid identities, preserving survivor types');
}

// ═══════════════════════════════════════════════════════════════════════════
// B — SELECTION ON THE REAL SURFACE
// ═══════════════════════════════════════════════════════════════════════════

async function testSelectionGestures(): Promise<void> {
  console.log('\n=== B1: long press enters, the reserved tap does nothing, a mode tap toggles ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 5 });
  const surface = mountSurface(household);
  await surface.settle();

  record(listedFileIds(surface.tree).length === 5, 'B1. the surface shows its loose files');
  record(selectionBarElement(surface.tree) === null, 'B2. there is NO selection bar outside selection mode');

  // Outside selection mode a tap opens the viewer without entering selection.
  const readsBefore = household.fileReads().length;
  record(tapFile(surface.tree, 'c-000'), 'B3. the File body is pressable');
  surface.render();
  await surface.settle();
  record(selectionBarElement(surface.tree) === null, 'B4. a plain tap does NOT enter selection mode');
  record(navigations.length === 0, 'B5. the in-screen viewer opens without navigation');
  record(listedFileIds(surface.tree).length === 5, 'B6. opening the viewer does not replace the browser dataset');
  record(!renderText(surface.tree).some((text) => /seleccionad/i.test(text)), 'B7. nothing on screen claims a selection happened');

  // The discoverable entry.
  record(pressSelectControl(surface.tree), 'B8. an explicit "Seleccionar" control is reachable — the gesture is not hidden');
  surface.render();
  record(selectionBarElement(surface.tree) !== null, 'B9. and it enters selection mode');
  record(findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Más opciones de Archivos') === null,
    'B10. the normal overflow is withdrawn while selection is active');
  surface.render();

// STAGE 2 (Phase 2) SUPERSESSION. Stage 1 continued here: "Long press on a File
    // also enters, and selects the pressed File". Long press NO LONGER enters
    // selection - it opens the contextual File actions - and selection is entered
    // only from the header overflow. The model asserted below is therefore reached
    // by the gesture that now owns it: a TAP inside selection mode toggles the
    // File. What is proven is identical (the count the bar states comes from the
    // model); only the producing gesture changed, and the superseded gesture is
    // asserted to be inert a few lines below.
    record(tapFile(surface.tree, 'c-001'), 'B11. a tap inside selection mode is reachable');
    surface.render();
    record(selectionSummary(surface.tree) === '1 seleccionado', 'B12. the bar states the count the model holds');

  record(findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Salir de la selección') !== null,
    'B13. the header offers X to leave selection');
  record(findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Acciones para los elementos seleccionados') !== null,
    'B14. the header offers the bulk overflow');
  record(findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Agregar') === null,
    'B15. + is hidden during selection');
  record(!renderText(surface.tree).includes('Organizar'), 'B16. Organizar is hidden during selection');
  record(findOne(surface.tree, (element) => element.type === 'FileSelectionBar') === null,
    'B17. the removed bottom FileSelectionBar is never painted');

  // A tap INSIDE selection mode toggles.
  record(tapFile(surface.tree, 'c-002'), 'B18. a tap inside selection mode is reachable');
  surface.render();
  record(selectionSummary(surface.tree) === '2 seleccionados', 'B19. and it toggles that File on');
  record(tapFile(surface.tree, 'c-002'), 'B20. the same tap toggles it off again');
  surface.render();
  record(selectionSummary(surface.tree) === '1 seleccionado', 'B21. so the count is honest both ways');

  // The selected visual state and the accessibility contract, on the REAL tile.
  const body = tileBody(surface.tree, 'c-001');
  record(body?.props?.accessibilityRole === 'checkbox', 'B22. in selection mode a File is exposed as a checkbox');
  record(body?.props?.accessibilityState?.selected === true, 'B23. and its own selected state is exposed');
  record(tileBody(surface.tree, 'c-002')?.props?.accessibilityState?.selected === false, 'B24. an unselected File says so');
  record(String(body?.props?.accessibilityLabel ?? '').includes('seleccionado'), 'B25. the label states the selection state too');
  record(findAll(renderFileTile(surface.tree, 'c-001'), (element) => element.props?.name === 'checkmark').length === 1,
    'B26. the selected File shows a real selected visual state');
  record(findAll(renderFileTile(surface.tree, 'c-002'), (element) => element.props?.name === 'checkmark').length === 0,
    'B27. and an unselected File does not');

// STAGE 2 (Phase 2) SUPERSESSION, and this one REVERSES the Stage 1 expectation.
    // Stage 1 asserted "normal File action access is preserved, even inside
    // selection mode", via the per-File overflow ellipsis. Stage 2 removed that
    // ellipsis AND forbade the File menu during a multi-select, so inside
    // selection there is deliberately NO route to the contextual actions - a member
    // batching Files must not be able to move or delete one by long-pressing it.
    const bodyInsideSelection = tileBody(surface.tree, 'c-001');
    const actionsInsideSelection = (bodyInsideSelection?.props?.accessibilityActions ?? []) as { name: string; label: string }[];
    // STAGE 2 REOPEN: drag-selection added explicit `select` / `deselect`
    // accessibility actions, and they are REQUIRED — drag is an enhancement and must
    // never be the only way to select a File. What must still be absent inside a
    // multi-select is the CONTEXTUAL File menu: a member batching Files must not be
    // able to move or delete one of them from the tile.
    record(actionsInsideSelection.every((action) => action.name !== 'longpress'),
      'B28. inside selection the tile offers NO contextual File-menu action');
    record(actionsInsideSelection.map((action) => action.name).join(',') === 'select,deselect',
      'B28a. but it DOES offer explicit select / deselect actions, so drag is never the only path');
    // The host is ALWAYS mounted - it decides its own visibility - so "the menu did
    // not open" means the host holds NO resolved target, not that it is absent.
    record(selectByLongPress(surface.tree, 'c-001') && actionHostElement(surface.tree)?.props?.file == null,
      'B29. a long press inside selection does NOT open the canonical actions');
    surface.render();
    record(actionHostElement(surface.tree)?.props?.file == null, 'B29b. the File action host stays closed for the whole selection');

  // Leaving selection mode.
  selectionBarElement(surface.tree)?.props.onPress();
  surface.render();
  record(selectionBarElement(surface.tree) === null, 'B31. leaving selection mode removes the bar and the selection');
  record(tileBody(surface.tree, 'c-001')?.props?.accessibilityRole === 'button', 'B32. and a File is a plain control again outside selection mode');
  record(tileBody(surface.tree, 'c-001')?.props?.accessibilityState?.selected === undefined, 'B33. with no stale selected state left behind');
  surface.unmount();
}

async function testSelectionScope(): Promise<void> {
  console.log('\n=== B2: selection belongs to Files across folder, order, query and view ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 4, inFolder: { 'ff-viajes': 2 } });
  const surface = mountSurface(household);
  await surface.settle();

  selectFiles(surface, ['c-000', 'c-001']);
  record(selectionSummary(surface.tree) === '2 seleccionados', 'B34. two Files are selected');

  // A same-context re-read that keeps every row must keep the selection.
  const readsBefore = household.fileReads().length;
  record(pressRefreshControl(surface.tree), 'B35. a same-context refresh is reachable');
  await surface.settle();
  record(household.fileReads().length > readsBefore, 'B36. it really re-read the context');
  record(selectionSummary(surface.tree) === '2 seleccionados', 'B37. a reconciliation that keeps the rows keeps the selection');

  // Folder navigation preserves the selected identities and exposes the folder
  // back control alongside X · N · overflow.
  record(pressFolder(surface.tree, 'ff-viajes'), 'B38. a folder tile is reachable');
  await surface.settle();
  record(selectionSummary(surface.tree) === '2 seleccionados', 'B39. a FOLDER change preserves the root selection');
  record(findOne(surface.tree, (element) => String(element.props?.accessibilityLabel ?? '').startsWith('Volver a')) !== null,
    'B39a. folder selection header is ‹ · X · N · ⋯');

  // Add two identities from the folder: count is total, not visible-only.
  selectFiles(surface, ['in-ff-viajes-0', 'in-ff-viajes-1']);
  record(selectionSummary(surface.tree) === '4 seleccionados', 'B40. cross-folder selection reports the total count');
  record(await chooseSortThroughFilterMenu(surface, 'A–Z'), 'B41. the sort control is reachable through the filter menu');
  await surface.settle();
  record(selectionSummary(surface.tree) === '4 seleccionados', 'B42. a SORT change preserves selected identities');

  // Query and renderer changes preserve the same four identities.
  record(typeSearch(surface.tree, 'in-ff-viajes'), 'B44. the search field is reachable');
  await surface.settle();
  record(selectionSummary(surface.tree) === '4 seleccionados', 'B45. a QUERY change preserves selected identities');
  const filterIcon = findOne(surface.tree, (element) => String(element.props?.accessibilityLabel ?? '').startsWith('Filtros y orden.'));
  filterIcon?.props.onPress();
  surface.render();
  const menuElement = findOne(surface.tree, (element) => element.type === filesFilterMenuModule.FilesFilterMenu);
  const renderedMenu = menuElement ? filesFilterMenuModule.FilesFilterMenu(menuElement.props as Record<string, unknown>) : null;
  findOne(renderedMenu, (element) => element.props?.label === 'Lista')?.props.onPress();
  await surface.settle();
  record(selectionSummary(surface.tree) === '4 seleccionados', 'B45a. Grid/List switch preserves selected identities');

  // HOUSEHOLD CHANGE clears.
  record(typeSearch(surface.tree, ''), 'B46. the query can be emptied');
  await surface.settle();
  record(selectionSummary(surface.tree) === '4 seleccionados', 'B47. selection remains active before household change');
  new Household({ loose: 2 }).install();
  householdState = { currentHousehold: { id: 'hh-other', name: 'Otra' } };
  surface.render();
  await surface.settle();
  record(selectionBarElement(surface.tree) === null, 'B48. a HOUSEHOLD change clears the selection — selection never crosses households');
  surface.unmount();

  // Absence from one visible read is not proof of invalidity: the identity may be
  // selected in another folder and therefore must not be silently pruned.
  const vanishing = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 4 });
  const pruneSurface = mountSurface(vanishing);
  await pruneSurface.settle();
  selectFiles(pruneSurface, ['c-000', 'c-001', 'c-002']);
  record(selectionSummary(pruneSurface.tree) === '3 seleccionados', 'B49. three Files are selected');
  // The File leaves the visible context while the member is not looking.
  vanishing.rows = vanishing.rows.filter((row) => row.id !== 'c-001');
  record(pressRefreshControl(pruneSurface.tree), 'B50. a re-read is triggered');
  await pruneSurface.settle();
  record(listedFileIds(pruneSurface.tree).length === 3, 'B51. the new context really has one row fewer');
  record(selectionSummary(pruneSurface.tree) === '3 seleccionados', 'B52. a visible-window refresh does not prune an off-view identity');
  pruneSurface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// C — THE CANONICAL FILE ACTION HOST
// ═══════════════════════════════════════════════════════════════════════════

function testActionGrammar(): void {
  console.log('\n=== C1: the canonical File action grammar ===');

  const implemented = grammar.resolveFileActions({ view: true, organize: true, delete: true });
  record(implemented.map((action) => action.id).join(',') === 'info,rename,move,download,share,favorite,trash',
    'C1. the grammar is exactly Información, Renombrar, Mover, Guardar una copia, Compartir, Favorito, Mover a la papelera');
  record(implemented.map((action) => action.label).join(',') === 'Información,Renombrar,Mover,Guardar una copia,Compartir,Agregar a favoritos,Mover a la papelera',
    'C2. with the canonical labels, in canonical order');
  record(grammar.HOMECLOUD_FILE_ACTION_SEAMS.join(',') === 'open',
    'C3. only Abrir remains a DECLARED extension seam (LIFECYCLE V1 made `Mover a la papelera` real)');
  record(!implemented.some((action) => action.id === 'open'),
    'C4. and no seam is offered while it has no backend — no fake disabled row');
  record(grammar.HOMECLOUD_FILE_ACTION_GRAMMAR.length === implemented.length + grammar.HOMECLOUD_FILE_ACTION_SEAMS.length,
    'C5. the seams live in the same ordered vocabulary, so adding one is a declaration plus a handler');

  const denied = grammar.resolveFileActions({ view: true, organize: false, delete: false });
  record(denied.find((action) => action.id === 'rename')?.available === false, 'C6. Renombrar is gated by homecloud.organize');
  record(denied.find((action) => action.id === 'move')?.available === false, 'C7. Mover is gated by homecloud.organize');
  record(denied.find((action) => action.id === 'download')?.available === true, 'C8. Guardar una copia only needs homecloud.view');
  record(denied.length === implemented.length, 'C9. a denied action stays declared — it is not silently dropped');

  // Guardar una copia and Compartir are two intents over one staged transfer.
  // The screen's own source is where that distinction lives, so it is asserted
  // where it lives. (Files Core closure: the old "Descargar keeps a local copy"
  // contract is superseded — an app-private copy the member cannot find is not
  // a save, so the save intent opens the native export UI instead.)
  const source = require('node:fs').readFileSync(frontSource('screens/HomeCloudFilesScreen.tsx'), 'utf8') as string;
  record(!source.includes('Descargar y compartir'), 'C10. the conjoined "Descargar y compartir original" intent is gone');
  const downloadBody = source.slice(source.indexOf('const saveCopyOfFile'), source.indexOf('const shareFile'));
  const shareBody = source.slice(source.indexOf('const shareFile'), source.indexOf('const canAdd'));
  record(downloadBody.includes('stageHomeCloudOriginal') && downloadBody.includes('exportHomeCloudStagedCopy') && !downloadBody.includes('shareHomeCloudDownloadedFile'),
    'C11. Guardar una copia stages the original and opens the native export UI, never the share path');
  record(shareBody.includes('stageHomeCloudOriginal') && shareBody.includes('shareHomeCloudDownloadedFile') && !shareBody.includes('exportHomeCloudStagedCopy'),
    'C12. Compartir stages the same original and hands it to the share sheet, never the export path');
  record(!source.includes('Guardado como'), 'C13. and no wording presents an internal copy as a completed save');
}

async function testCanonicalHostOnTheSurface(): Promise<void> {
  console.log('\n=== C2: one canonical action host, one destination picker ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 3 });
  const surface = mountSurface(household);
  await surface.settle();

  record(findAll(surface.tree, (element) => element.type === actionHost.FileActionHost).length === 1,
    'C14. exactly ONE canonical action host serves a File');
  record(pickerElements(surface.tree).length === 1,
    'C15. and exactly ONE destination picker instance exists for both Move intents');
  const host = actionHostElement(surface.tree);
  record(Array.isArray(host?.props?.folders) && host.props.folders.some((folder: { name: string }) => folder.name === 'Viajes'),
    'C16. the host is handed the household folder catalogue');
  record('downloadFeedback' in (host?.props ?? {}), 'C17. the host owns the transfer feedback channel');
  record(host?.props?.file === null, 'C18. and it is closed until a File asks for it');

  // The host renders ONLY the implemented grammar, capability-gated.
  const renderedHost = actionHost.FileActionHost({ ...(host?.props ?? {}), file: { id: 'x', displayName: 'x.txt', mimeType: 'text/plain', folderId: null, note: null, documentDate: null, isFavorite: false } });
  const hostRows = renderText(renderedHost);
  for (const label of ['Información', 'Renombrar', 'Mover', 'Guardar una copia', 'Compartir', 'Agregar a favoritos', 'Mover a la papelera']) {
    record(findAll(renderedHost, (element) => element.props?.title === label).length === 1, `C19. the host offers ${label} exactly once`);
  }
  record(!hostRows.some((text) => /^Abrir$/.test(text)), 'C20. and paints no row for the remaining declared seam (`Abrir`)');
  record(hostRows.includes('Archivos'), 'C21. the current destination is stated without offering a second picker');
  const deniedHost = actionHost.FileActionHost({ ...(host?.props ?? {}), permissions: { view: true, organize: false, delete: false }, file: { id: 'x', displayName: 'x.txt', mimeType: 'text/plain', folderId: null, note: null, documentDate: null, isFavorite: false } });
  record(findOne(deniedHost, (element) => element.props?.title === 'Mover')?.props?.disabled === true,
    'C22. a denied action is present but disabled — DENY-SAFE and never silent');
  record(findOne(deniedHost, (element) => element.props?.title === 'Guardar una copia')?.props?.disabled === false,
    'C23. and an allowed action is not collateral damage of the denial');

  // A single File's Move and the selection's Move both resolve through ONE picker.
  record(openTileActions(surface.tree, 'c-000'), 'C24. the overflow opens the canonical host');
  surface.render();
  actionHostElement(surface.tree)?.props.onMoveRequest();
  surface.render();
  const forFile = pickerElement(surface.tree);
  record(forFile?.props?.visible === true, 'C25. a single File\'s Move opens the shared picker');
  record(forFile?.props?.title === 'Mover a', 'C26. titled as the single-file Move');

  const beforeFileMove = household.moveCalls.length;
  forFile?.props.onSelect('ff-viajes');
  await surface.settle(30, 10);
  record(household.moveCalls.length === beforeFileMove + 1, 'C27. a single File\'s Move is ONE existing mutation');
  const lastMove = household.moveCalls[household.moveCalls.length - 1];
  record((lastMove.body as { folderId: string }).folderId === 'ff-viajes', 'C28. and it moved to the chosen destination');
  record(actionHostElement(surface.tree)?.props?.file === null, 'C29. the host closed after the mutation');

  selectFiles(surface, ['c-001', 'c-002']);
  record(pressBulkMove(surface), 'C30. the selection bulk menu exposes Move');
  const forBulk = pickerElement(surface.tree);
  record(forBulk?.props?.visible === true, 'C30a. the selection\'s Move opens the SAME picker');
  record(forBulk?.props?.title === 'Mover 2 archivos', 'C31. titled for the batch it is about to act on');
  record(forBulk?.props?.folders === forFile?.props?.folders, 'C32. and both read the same destination catalogue');
  forBulk?.props.onClose();
  surface.render();
  record(pickerElement(surface.tree)?.props?.visible === false, 'C33. closing the picker moves nothing');
  record(household.moveCalls.length === beforeFileMove + 1, 'C34. and really moved nothing');

  // The destination vocabulary itself.
  const folders = [{ id: 'ff-viajes', name: 'Viajes' }, { id: 'ff-recetas', name: 'Recetas' }];
  const destinations = destinationGrammar.fileMoveDestinations(folders, null);
  record(destinationGrammar.ROOT_DESTINATION_FOLDER_ID === null, 'C35. root is expressed as null, exactly as the backend stores it');
  record(destinations[0].label === destinationGrammar.ROOT_DESTINATION_LABEL, 'C36. and it is offered as "Archivos"');
  record(destinations.map((entry) => entry.label).join(',') === 'Archivos,Viajes,Recetas', 'C37. every household folder is offered too');
  record(destinationGrammar.fileMoveDestinations(folders, undefined).every((entry) => !entry.isCurrent),
    'C38. a mixed selection marks NO destination as current rather than lying about root');
  record(destinationGrammar.fileMoveDestinations(folders, 'ff-viajes').filter((entry) => entry.isCurrent).length === 1,
    'C39. and a selection that does share one folder marks exactly that one');

  // The rendered picker states each destination with a meaningful label.
  const renderedPicker = destinationSheet.FileMoveDestinationPicker({
    visible: true, title: 'Mover a', folders, currentFolderId: null, busy: false, onSelect: () => undefined, onClose: () => undefined,
  });
  record(findAll(renderedPicker, (element) => element.props?.title === 'Archivos').length === 1, 'C40. the picker lists root');
  record(findAll(renderedPicker, (element) => element.props?.title === 'Recetas').length === 1, 'C41. and every folder');
  record(findOne(renderedPicker, (element) => element.props?.title === 'Recetas')?.props?.accessibilityLabel === 'Mover a Recetas',
    'C42. every destination says where it moves to');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// D — BULK MOVE
// ═══════════════════════════════════════════════════════════════════════════

/** Run one bulk Move through the real surface: gestures → bar → shared picker. */
async function runBulkMove(
  surface: Mounted,
  ids: readonly string[],
  destinationFolderId: string | null,
): Promise<void> {
  selectFiles(surface, ids);
  surface.render();
  pressBulkMove(surface);
  record(pickerElement(surface.tree)?.props?.visible === true, `the shared picker is open for ${ids.length} selected Files`);
  pickerElement(surface.tree)?.props.onSelect(destinationFolderId);
  await surface.settle(80, 10);
}

async function testBulkMoveHappyPath(): Promise<void> {
  console.log('\n=== D1: all succeed, to a folder and to root, one reconciliation ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 3 });
  const surface = mountSurface(household);
  await surface.settle();

  const ids = ['c-000', 'c-001', 'c-002'];
  const readsBefore = household.fileReads().length;
  await runBulkMove(surface, ids, 'ff-viajes');

  const calls = household.moveCalls;
  record(household.unknownPaths().length === 0,
    'D1a. no request went outside the existing Files endpoints — no bulk or transaction endpoint was invented');
  record(calls.length === 3, 'D1b. three selected produced exactly three mutations');
  record(calls.every((call) => call.method === 'PATCH' && /^\/api\/homecloud\/content\/.+\/file$/.test(call.pathname)),
    'D1c. every one is the EXISTING PATCH /api/homecloud/content/:contentId/file');
  record(calls.every((call) => call.body !== null && Object.keys(call.body as object).join(',') === 'folderId'),
    'D1d. each mutation carries ONLY folderId');
  record(calls.every((call) => (call.body as { folderId: string }).folderId === 'ff-viajes'),
    'D1e. and all of them target the SAME chosen destination');
  record(calls.map((call) => call.pathname.split('/')[4]).join(',') === ids.join(','),
    'D1f. each one addressed its own content id, once');
  record(household.rows.filter((row) => row.folderId === 'ff-viajes').length === 3, 'D1g. all three Files really moved');
  record(household.fileReads().length > readsBefore, 'D1h. the batch reconciled after all mutations');
  record(listedFileIds(surface.tree).length === 0, 'D1i. the moved Files left the folder being viewed');
  record(selectionBarElement(surface.tree) === null, 'D1j. so the selection pruned to nothing and the mode ended — no stale id');
  record(bannerText(surface.tree) === '3 archivos movidos.', 'D1k. the outcome is stated honestly');
  surface.unmount();

  // Root as the destination: `folderId` must be sent as null, not omitted.
  const toRoot = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 2, inFolder: { 'ff-viajes': 2 } });
  const rootSurface = mountSurface(toRoot);
  await rootSurface.settle();
  record(pressFolder(rootSurface.tree, 'ff-viajes'), 'D1l. a folder is entered');
  await rootSurface.settle();
  await runBulkMove(rootSurface, ['in-ff-viajes-0', 'in-ff-viajes-1'], null);
  const rootBodies = toRoot.moveCalls.map((call) => call.body) as { folderId: string | null }[];
  record(rootBodies.length === 2 && rootBodies.every((body) => Object.prototype.hasOwnProperty.call(body, 'folderId') && body.folderId === null),
    'D1m. Root sends folderId: null explicitly — the key is present, not dropped');
  record(toRoot.rows.filter((row) => row.folderId === null).length === 4, 'D1n. both Files really went to root');
  rootSurface.unmount();
}

async function testBulkMovePartialFailure(): Promise<void> {
  console.log('\n=== D2: 7 succeed / 1 fails, and nothing is rolled back ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 8 });
  const surface = mountSurface(household);
  await surface.settle();

  household.refuseContent.set('c-003', { status: 404, code: 'homecloud_content_not_found' });
  const readsBefore = household.fileReads().length;
  await runBulkMove(surface, ['c-000', 'c-001', 'c-002', 'c-003', 'c-004', 'c-005', 'c-006', 'c-007'], 'ff-viajes');

  record(household.moveCalls.length === 8, 'D2a. eight selected produced eight mutations — the failed one is not retried');
  record(household.rows.filter((row) => row.folderId === 'ff-viajes').length === 7, 'D2b. seven really moved');
  record(household.rows.filter((row) => row.folderId === 'ff-viajes').length === 7,
    'and the seven successes were NOT rolled back because a sibling failed');
  record(household.rows.find((row) => row.id === 'c-003')?.folderId === null, 'D2c. the one that failed stayed exactly where it was');
  record(household.fileReads().length > readsBefore, 'D2d. the partial batch reconciled after all mutations');
  record(bannerText(surface.tree) === '7 movidos · 1 no se pudo mover.', 'D2e. the aggregate states BOTH halves honestly');
  const remaining = listedFileIds(surface.tree);
  record(remaining.length === 1 && remaining[0] === 'c-003', 'D2f. and the failed File is still visible in the context');
  record(selectionSummary(surface.tree) === '1 seleccionado',
    'D2g. the selection reconciled against the new context: only the survivor is still selected');
  surface.unmount();
}

async function testBulkMoveAllFail(): Promise<void> {
  console.log('\n=== D3: all fail, and the whole batch is reported as a failure ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 4 });
  const surface = mountSurface(household);
  await surface.settle();

  household.capabilityRefusal = { status: 403, code: 'homecloud_forbidden' };
  const readsBefore = household.fileReads().length;
  await runBulkMove(surface, ['c-000', 'c-001', 'c-002', 'c-003'], 'ff-viajes');

  record(household.moveCalls.length === 4, 'D3a. every selected File was attempted once');
  record(household.rows.every((row) => row.folderId === null), 'D3b. and not one of them moved');
  record(household.fileReads().length > readsBefore, 'the failed batch reconciled after all attempts');
  record(bannerText(surface.tree) === '4 archivos no se pudieron mover.', 'D3c. a wholly failed batch is never reported as a success');
  record(selectionSummary(surface.tree) === '4 seleccionados', 'and the selection is left intact so it can be retried');
  record(listedFileIds(surface.tree).length === 4, 'the context still shows every File');
  surface.unmount();
}

async function testBulkMoveDestinationGoneMidFlight(): Promise<void> {
  console.log('\n=== D4: the destination folder is deleted mid-operation ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 6 });
  const surface = mountSurface(household);
  await surface.settle();

  // The first mutation lands; the folder is then deleted by someone else, so every
  // later mutation of the SAME batch is refused by the folder check.
  household.onMoveCall = (index) => {
    if (index === 0) {
      household.folders = household.folders.filter((folder) => folder.id !== 'ff-viajes');
      household.destinationRefusal = { status: 404, code: 'homecloud_folder_not_found' };
    }
  };
  const readsBefore = household.fileReads().length;
  await runBulkMove(surface, ['c-000', 'c-001', 'c-002', 'c-003', 'c-004', 'c-005'], 'ff-viajes');

  record(household.moveCalls.length === 6, 'D4a. all six were attempted — the batch does not stop at the first refusal');
  record(household.rows.filter((row) => row.folderId === 'ff-viajes').length === 1, 'exactly the one that landed before the deletion moved');
  record(household.rows.filter((row) => row.folderId === null).length === 5, 'the other five stayed put');
  record(household.fileReads().length > readsBefore, 'the destination-deletion batch reconciled after all attempts');
  record(bannerText(surface.tree) === '1 movido · 5 no se pudieron mover.', 'D4b. the aggregate is honest about both halves');
  record(listedFileIds(surface.tree).length === 5, 'and every File that did not move is still visible');
  surface.unmount();
}

async function testBulkMoveCapabilityRevokedMidFlight(): Promise<void> {
  console.log('\n=== D5: the organize capability is revoked mid-operation ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 5 });
  const surface = mountSurface(household);
  await surface.settle();

  household.onMoveCall = (index) => {
    if (index === 1) household.capabilityRefusal = { status: 403, code: 'homecloud_forbidden' };
  };
  const readsBefore = household.fileReads().length;
  await runBulkMove(surface, ['c-000', 'c-001', 'c-002', 'c-003', 'c-004'], 'ff-viajes');

  record(household.moveCalls.length === 5, 'D5a. all five were attempted');
  record(household.rows.filter((row) => row.folderId === 'ff-viajes').length === 2, 'the two that landed before the revocation moved');
  record(household.rows.filter((row) => row.folderId === null).length === 3, 'the three refusals stayed put');
  record(household.fileReads().length > readsBefore, 'the permission-loss batch reconciled after all attempts');
  record(bannerText(surface.tree) === '2 movidos · 3 no se pudieron mover.', 'D5b. a revoked capability is an honest per-item failure');
  record(listedFileIds(surface.tree).length === 3, 'and every refused File is still visible to the member');
  surface.unmount();
}

async function testBulkMoveModelDirectly(): Promise<void> {
  console.log('\n=== D6: the bulk-move orchestrator, against the REAL typed error ===');

  const seen: { id: string; body: unknown }[] = [];
  const result = await bulkMove.bulkMoveFiles({
    contentIds: ['a', 'b', 'c'],
    destinationFolderId: 'ff-x',
    moveFile: async (id, changes) => { seen.push({ id, body: changes }); },
  });
  record(seen.length === 3 && seen.every((entry) => (entry.body as { folderId: string }).folderId === 'ff-x'),
    'D6a. one mutation per File, all to the same destination, carrying only folderId');
  record(result.movedIds.join(',') === 'a,b,c' && result.failures.length === 0, 'and every outcome is recorded as a move');

  const deduped = await bulkMove.bulkMoveFiles({
    contentIds: ['a', 'a', 'b'],
    destinationFolderId: null,
    moveFile: async () => undefined,
  });
  record(deduped.movedIds.length === 2, 'D6b. a repeated id can never issue more than one mutation');

  const partial = await bulkMove.bulkMoveFiles({
    contentIds: ['a', 'b'],
    destinationFolderId: null,
    moveFile: async (id) => {
      if (id === 'b') throw new ApiError('Permiso denegado.', 403, 'homecloud_forbidden');
    },
  });
  record(partial.movedIds.join(',') === 'a' && partial.failures.length === 1, 'D6c. a refusal fails only its own File');
  record(partial.failures[0].contentId === 'b' && partial.failures[0].status === 403 && partial.failures[0].code === 'homecloud_forbidden',
    'and the failure names the File, the status and the backend code');
  record(partial.failures[0].message === 'Ya no podés organizar estos archivos.', 'a revoked capability is reported in the member\'s terms');
  record(bulkMove.bulkMoveFeedback(partial).message === '1 movido · 1 no se pudo mover.', 'D6d. the aggregate copy states both halves');

  const goneFolder = await bulkMove.bulkMoveFiles({
    contentIds: ['a'],
    destinationFolderId: 'ff-gone',
    moveFile: async () => { throw new ApiError('La carpeta no existe.', 404, 'homecloud_folder_not_found'); },
  });
  record(goneFolder.failures[0].message === 'La carpeta de destino ya no existe.', 'a destination deleted mid-flight is named as such');

  record(bulkMove.bulkMoveFeedback({ destinationFolderId: null, movedIds: ['a'], failures: [] }).message === '1 archivo movido.',
    'a wholly successful batch reads as a success');
  record(bulkMove.bulkMoveFeedback({ destinationFolderId: null, movedIds: [], failures: [{ contentId: 'a', code: 'x', status: 500, message: 'y' }] }).message === '1 archivo no se pudo mover.',
    'and a wholly failed batch never reads as a success');
  record(bulkMove.bulkMoveInFlight(3).message === 'Moviendo 3 archivos…', 'the batch states what it is doing while it runs');
}

function testAppButtonAccessibilityComposition(): void {
  console.log('\n=== D7: a caller can add its own state without erasing disabled/busy ===');

  const source = require('node:fs').readFileSync(frontSource('components/ui/AppButton.tsx'), 'utf8') as string;
  const signature = source.slice(source.indexOf('export function AppButton'), source.indexOf('}: AppButtonProps'));
  record(signature.includes('accessibilityState'), 'AppButton destructures the caller accessibilityState, so it can no longer arrive through the prop spread');
  record(/accessibilityState=\{\{\s*\.\.\.accessibilityState,\s*disabled: isDisabled,\s*busy: loading\s*\}\}/.test(source),
    'and COMPOSES it with its own disabled and busy instead of letting a caller replace them');
}

// ═══════════════════════════════════════════════════════════════════════════
// E — PATCH 1B DEVICE-QA CORRECTIONS (final interaction closure)
// ═══════════════════════════════════════════════════════════════════════════

function testDragEntityKeys(): void {
  console.log('\n=== E1: one drag stroke paints files AND folders, each identity once ===');
  const drag = dragSelection;

  record(drag.dragEntityKey('file', 'c-1') === 'file:c-1' && drag.dragEntityKey('folder', 'f-1') === 'folder:f-1',
    'E1a. entity keys are typed, so a folder id can never collide with a file id');
  const parsed = drag.parseDragEntityKey('folder:f-1');
  record(parsed !== null && parsed.type === 'folder' && parsed.id === 'f-1', 'E1b. keys parse back into typed entities');
  record(drag.parseDragEntityKey('c-1') === null, 'E1c. a bare id is not a valid entity key');

  const add = drag.beginDragSelection({ anchorId: drag.dragEntityKey('file', 'c-1'), anchorSelected: false });
  const step1 = drag.applyDragSelectionStep(add, drag.dragEntityKey('folder', 'f-1'));
  record(drag.dragSelectionTargetSelected(step1) === true, 'E1d. an ADD stroke paints folders selected too');
  record(drag.applyDragSelectionStep(step1, drag.dragEntityKey('folder', 'f-1')) === step1,
    'E1e. re-crossing the same identity is a structural no-op, never a second toggle');
  const remove = drag.beginDragSelection({ anchorId: drag.dragEntityKey('folder', 'f-1'), anchorSelected: true });
  record(drag.dragSelectionTargetSelected(remove) === false, 'E1f. a stroke from a selected folder is REMOVE');

  const frames = drag.recordEntityTileFrame(
    drag.recordEntityTileFrame(new Map(), drag.dragEntityKey('file', 'c-1'), { x: 0, y: 0, width: 100, height: 100 }),
    drag.dragEntityKey('folder', 'f-1'), { x: 0, y: 120, width: 100, height: 100 },
  );
  record(drag.hitTestFileTile(frames, 50, 150) === drag.dragEntityKey('folder', 'f-1'),
    'E1g. hit testing resolves measured folder frames from real bounds');
  record(drag.hitTestFileTile(frames, 50, 110) === null, 'E1h. gaps between tiles select nothing, never a neighbour');
}

function testGridGeometryInvariant(): void {
  console.log('\n=== E2: root and folder grids share identical static geometry ===');
  const root = gridGeometry.filesGridGeometry(390);
  const folder = gridGeometry.filesGridGeometry(390);
  record(root.paddingLeft === folder.paddingLeft && root.paddingRight === folder.paddingRight
    && root.columnGap === folder.columnGap && root.cellWidth === folder.cellWidth,
    'E2a. identical viewport width produces identical insets, gaps and card width');
  record(root.cellWidth > 0 && root.columns === 2, 'E2b. a standard phone width yields a usable two-column grid');
  record(gridGeometry.filesGridGeometry(390).cellWidth === gridGeometry.filesGridGeometry(390).cellWidth,
    'E2c. geometry is a pure function of width — no folder, animation or header input exists');
  const source = require('node:fs').readFileSync(frontSource('screens/HomeCloudFilesScreen.tsx'), 'utf8') as string;
  record(source.includes('filesGridGeometry(windowDimensions.width)'),
    'E2d. the surface consumes the single geometry authority for root AND folder');
}

function testScannerHandleScale(): void {
  console.log('\n=== E3: corner handles stay constant in screen space ===');
  const scale = scannerGeometry.handleScreenSpaceScale;
  record(scale(1) === 1, 'E3a. zoom 1 keeps the designed handle size');
  record(scale(2) === 0.5, 'E3b. zoom 2 counter-scales to one half');
  record(scale(4) === 0.25, 'E3c. zoom 4 counter-scales to one quarter');
  record(Math.abs(scale(3) * 3 - 1) < 1e-9, 'E3d. visual size × zoom stays constant in screen space');
}

function testPopoverAnchorContract(): void {
  console.log('\n=== E4: short menus are trigger-anchored popovers, sheets only on real constraint ===');
  const viewport = { viewportWidth: 390, viewportHeight: 844, safeTop: 47, safeBottom: 34, keyboardHeight: 0, menuWidth: 280, fontScale: 1 };
  const fileMenu = menuLayout.resolveAdaptiveMenuLayout({
    ...viewport, anchor: { x: 340, y: 200, width: 44, height: 44 }, menuHeight: 420, itemCount: 7,
  });
  record(fileMenu.presentation === 'popover', 'E4a. the 7-row file catalog is a popover on a normal portrait iPhone, never a sheet');
  if (fileMenu.presentation === 'popover') {
    record(Math.abs((fileMenu.left + 280) - (340 + 44)) <= 13,
      'E4b. a right-side trigger aligns the popover right edge to the trigger');
    record(fileMenu.originY <= 12, 'E4c. the scale/fade origin is the trigger corner, so the menu grows from the control');
  }
  record(menuLayout.resolveAdaptiveMenuLayout({ ...viewport, anchor: null, menuHeight: 200, itemCount: 2 }).presentation === 'sheet',
    'E4d. a missing anchor still falls back to a sheet');
  record(menuLayout.resolveAdaptiveMenuLayout({
    ...viewport, anchor: { x: 340, y: 200, width: 44, height: 44 }, menuHeight: 1200, itemCount: 7,
  }).presentation === 'sheet', 'E4e. a menu taller than the usable height still falls back to a sheet');
}

function testMixedFeedbackCopy(): void {
  console.log('\n=== E5: mixed move feedback never claims moved folders are files ===');
  record(bulkMove.bulkMoveFeedback({ destinationFolderId: 'f', movedIds: ['a', 'b'], failures: [] }, 'elementos').message === '2 elementos movidos.',
    'E5a. a mixed/file-folder batch reports elementos');
  record(bulkMove.bulkMoveFeedback({ destinationFolderId: 'f', movedIds: ['a', 'b'], failures: [] }).message === '2 archivos movidos.',
    'E5b. a file-only batch keeps the historical archivos copy');
  record(bulkMove.bulkMoveFeedback({ destinationFolderId: 'f', movedIds: ['a'], failures: [] }, 'elementos').message === '1 elemento movido.',
    'E5c. singular mixed copy is neutral too');
}

function testPatch1BSourceContracts(): void {
  console.log('\n=== E6: Patch 1B structural contracts in the surface source ===');
  const source = require('node:fs').readFileSync(frontSource('screens/HomeCloudFilesScreen.tsx'), 'utf8') as string;

  const titleRow = source.slice(source.indexOf('PATCH 1B final normal header'), source.indexOf('PATCH 1B final normal header') + 2600);
  const ellipsisPos = titleRow.indexOf('ellipsis-horizontal');
  const filterPos = titleRow.indexOf('options-outline');
  const addPos = titleRow.indexOf("accessibilityLabel=\"Agregar\"");
  record(ellipsisPos !== -1 && filterPos !== -1 && addPos !== -1 && ellipsisPos < filterPos && filterPos < addPos,
    'E6a. normal header order is exactly ⋯ · FILTER · + with + rightmost');
  record(!titleRow.includes('>Organizar<'), 'E6b. no textual Organizar remains in the contextual row');
  record(titleRow.includes("accessibilityLabel={filesFilterAccessibilityLabel(filterState)}"),
    'E6c. the filter icon keeps the Organizar accessibility label');

  const longPressBody = source.slice(source.indexOf('long press is SELECTION, never a menu'), source.indexOf('const leaveSelectionMode'));
  record(longPressBody.includes('beginFileSelectionAt') && longPressBody.includes('armDragSelection'),
    'E6d. long press enters selection and arms the stroke');
  record(!longPressBody.includes('setActionTargetId') && !longPressBody.includes('setTimeout'),
    'E6e. no long-press path opens the action menu and no second threshold timer exists');

  record(source.includes('scrollEnabled={!selectionStrokeActive}'),
    'E6f. list scrolling is suppressed only while a selection stroke owns the pointer');
  record(source.includes('onRefresh={refreshFromAnyPath} enabled={!selectionStrokeActive}'),
    'E6g. pull-to-refresh cannot arm while a selection stroke owns the pointer');
  record(source.includes('onMoveShouldSetPanResponder: () => dragGestureRef.current !== null'),
    'E6h. movement before the threshold never arms selection — it stays scroll');

  record(source.includes('<FileTransientToast') && !source.includes('{transientFeedback ? <View style={styles.banner}>'),
    'E6i. bulk success is a floating transient toast, never a persistent browser row');

  // PATCH 1C — the native picker is IMPERATIVE. Files never mounts FileIntake
  // (no autoPick side effect, no second upload surface); the launch happens
  // only from the + menu's ACTUAL dismissal-complete signal, and the launch
  // guard returns to IDLE on every terminal path (no mount-remount tricks,
  // no timers).
  record(!source.includes('<FileIntake') && !source.includes('autoPick'),
    'E6j. Files never mounts FileIntake UI — no autoPick side effect, no second upload surface');
  record(source.includes('onDidDismiss={handleAddMenuDidDismiss}') && source.includes('onPress={requestFilePickerLaunch}'),
    'E6j2. Elegir archivo REQUESTS dismissal; the picker launches only from the menu\'s real onDidDismiss lifecycle');
  record(source.includes('createFileIntakeService({') && source.includes("pickerLaunchRef.current = 'IDLE'"),
    'E6j3. the launcher reuses the intake domain imperatively and releases the guard to IDLE on every terminal path');
  record(!source.includes('scrollToIndex({ index, animated: false'),
    'E6k. Grid/List restore never calls the throwing scrollToIndex on a fresh remount');

  record(source.includes('moveHomeCloudFolder(token, entity.id, destinationFolderId)'),
    'E6l. mixed move reuses the canonical folder move contract per entity');

  const hostSource = require('node:fs').readFileSync(frontSource('services/homecloud/FileActionHost.tsx'), 'utf8') as string;
  const hostCatalog = hostSource.slice(hostSource.indexOf('const actionContent'), hostSource.indexOf('showInfo ? <ActionSheet'));
  record(hostCatalog.includes('<AdaptiveMenuRow') && !hostCatalog.includes('<AppButton'),
    'E6m. the file catalog renders compact popover rows, not large card-buttons');
}

async function testLongPressSelectionOnSurface(): Promise<void> {
  console.log('\n=== E7: long press selects on the real surface, pointer owned by the stroke ===');

  const household = new Household({ folders: [{ id: 'ff-a', name: 'A' }, { id: 'ff-b', name: 'B' }], loose: 2 });
  const surface = mountSurface(household);
  await surface.settle();

  record(selectByLongPress(surface.tree, 'c-000'), 'E7a. a file long press is reachable');
  surface.render();
  record(selectionBarElement(surface.tree) !== null, 'E7b. long press ENTERS selection mode');
  record(selectionSummary(surface.tree) === '1 seleccionado', 'E7c. and the origin file is selected');
  record(actionHostElement(surface.tree)?.props?.file == null, 'E7d. long press NEVER opens the action menu');

  record(longPressFolder(surface.tree, 'ff-a'), 'E7e. a folder long press is reachable');
  surface.render();
  record(selectionSummary(surface.tree) === '2 seleccionados', 'E7f. long press folder selects it alongside the file');

  const list = listOf(surface.tree);
  record((list?.props as { scrollEnabled?: boolean } | undefined)?.scrollEnabled === false,
    'E7g. while the stroke is armed the list does not scroll itself');
  // The RefreshControl rides on the list's props (not in the walked children),
  // so it is read from the FlatList element itself.
  const refreshControl = (list?.props as { refreshControl?: { props?: { enabled?: boolean } } } | undefined)?.refreshControl;
  record(refreshControl?.props?.enabled === false,
    'E7h. and pull-to-refresh cannot arm for that stroke');

  // Folder affordance toggles; folder body navigates without clearing.
  record(setFolderSelected(surface.tree, 'ff-a', false), 'E7i. the folder check affordance is reachable');
  surface.render();
  record(selectionSummary(surface.tree) === '1 seleccionado', 'E7j. and it toggles only the folder');
  record(pressFolder(surface.tree, 'ff-b'), 'E7k. the folder body still navigates');
  await surface.settle();
  record(selectionSummary(surface.tree) === '1 seleccionado', 'E7l. navigation preserves the cross-folder selection');
  record(findOne(surface.tree, (element) => String(element.props?.accessibilityLabel ?? '').startsWith('Volver a')) !== null,
    'E7m. the folder selection header keeps ‹ alongside X');

  selectionBarElement(surface.tree)?.props.onPress();
  surface.render();
  record(selectionBarElement(surface.tree) === null, 'E7n. X exits and clears');
  record((listOf(surface.tree)?.props as { scrollEnabled?: boolean } | undefined)?.scrollEnabled !== false,
    'E7o. normal scrolling returns the moment the stroke ends');
  surface.unmount();
}

async function testMixedBulkMoveOnSurface(): Promise<void> {
  console.log('\n=== E8: mixed file+folder bulk move through the real surface ===');

  const household = new Household({ folders: [{ id: 'ff-a', name: 'A' }, { id: 'ff-b', name: 'B' }], loose: 2 });
  const surface = mountSurface(household);
  await surface.settle();

  record(selectByLongPress(surface.tree, 'c-000'), 'E8a. a file is long-pressed into selection');
  surface.render();
  record(longPressFolder(surface.tree, 'ff-a'), 'E8b. a folder joins the same selection');
  surface.render();
  record(selectionSummary(surface.tree) === '2 seleccionados', 'E8c. files and folders coexist in one Files selection');

  const trigger = findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Acciones para los elementos seleccionados');
  record(typeof trigger?.props?.onPress === 'function', 'E8d. the selection overflow is reachable');
  trigger?.props.onPress();
  surface.render();
  const menu = bulkMenuElement(surface.tree);
  record(menu !== null, 'E8e. the bulk popover opens');
  record(findOne(menu, (element) => element.props?.title === 'Mover') !== null, 'E8f. a folder-bearing set still offers Mover');
  record(findOne(menu, (element) => element.props?.title === 'Agregar a favoritos') === null,
    'E8g. but no invented folder Favorite');
  record(findOne(menu, (element) => element.props?.title === 'Mover a la papelera') === null,
    'E8h. and no folder Papelera — the menu is the intersection of valid operations');
  record(findOne(menu, (element) => element.props?.title === 'Compartir') === null,
    'E8h2. and no Share over a mixed set');

  const fileMovesBefore = household.moveCalls.length;
  const folderMovesBefore = household.folderMoveCalls.length;
  findOne(menu, (element) => element.props?.title === 'Mover')?.props.onPress();
  surface.render();
  record(pickerElement(surface.tree)?.props?.visible === true, 'E8i. Mover opens the shared destination picker');
  record(pickerElement(surface.tree)?.props?.title === 'Mover 2 elementos', 'E8j. titled neutrally for the mixed batch');
  pickerElement(surface.tree)?.props.onSelect('ff-b');
  await surface.settle(80, 10);

  record(household.moveCalls.length === fileMovesBefore + 1, 'E8k. the file moved through its canonical file mutation');
  record(household.folderMoveCalls.length === folderMovesBefore + 1, 'E8l. the folder moved through its canonical folder mutation');
  record(household.unknownPaths().length === 0, 'E8m. no bulk endpoint was invented for the mixed batch');
  record(toastText(surface.tree) === '2 elementos movidos.', 'E8n. total mixed success reports elementos, transiently');
  record(selectionBarElement(surface.tree) === null, 'E8o. total success leaves selection');
  record(renderText(surface.tree).filter((text) => text === '2 elementos movidos.').length <= 1
    && findOne(surface.tree, (element) => typeof element.type === 'function' && element.type.name === 'FileTransientToast') !== null,
    'E8p. the feedback is the floating overlay, not a browser row');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  testSelectionModel();
  await testSelectionGestures();
  await testSelectionScope();
  testActionGrammar();
  await testCanonicalHostOnTheSurface();
  await testBulkMoveHappyPath();
  await testBulkMovePartialFailure();
  await testBulkMoveAllFail();
  await testBulkMoveDestinationGoneMidFlight();
  await testBulkMoveCapabilityRevokedMidFlight();
  await testBulkMoveModelDirectly();
  testAppButtonAccessibilityComposition();
  testDragEntityKeys();
  testGridGeometryInvariant();
  testScannerHandleScale();
  testPopoverAnchorContract();
  testMixedFeedbackCopy();
  testPatch1BSourceContracts();
  await testLongPressSelectionOnSurface();
  await testMixedBulkMoveOnSurface();

  console.log(`\nHOMECLOUD_FILES_SLICE1_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
}

void main();
