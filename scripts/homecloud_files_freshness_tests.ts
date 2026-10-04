/**
 * HomeCloud Files — CORE CLOSURE: FRESHNESS SLICE.
 *
 * The Files list was coherent about the DATA it held and silent about WHEN it
 * last asked. Every read it performed was answered by something the member had
 * done — mount, focus, the refresh control, a local mutation, a search — so a
 * member who left the app and came back to an ALREADY FOCUSED Files screen kept
 * looking at a list nobody had re-read, and the canonical File action/info host
 * could keep describing a File with the object it captured when it opened.
 *
 * What is proven here, on the REAL screen and the REAL transport:
 *
 *  A. FOREGROUND. `background -> active` and `inactive -> active` each cost
 *     EXACTLY ONE read, through the EXISTING window-preserving refresh. The first
 *     mount is not a return, focus arriving together with foreground is ONE read,
 *     a torn-down surface cannot read, and the manual control still works.
 *
 *  B. THE WINDOW SURVIVES. A 300-row loaded window stays a 300-row window across
 *     a foreground refresh (re-read in the same page-sized windows, never
 *     collapsed to page one), and folder, query and sort are the SAME question
 *     before and after.
 *
 *  C. THE SEGMENT. HomeCloud toggles `display: none` instead of unmounting, so
 *     returning from Memories creates no navigation focus: a hidden -> visible
 *     transition is a boundary, through the SAME funnel, so it is one read and
 *     never a second one beside a foreground event.
 *
 *  D. HOUSEHOLD SCOPE. An answer for the household being left can never land in
 *     the new household's list, and the first return after the switch reads the
 *     household that is actually current.
 *
 *  E. CURRENT FILE METADATA. The canonical host is fed an ID and resolved against
 *     the CURRENT rows, so a rename / note / move / date performed by another
 *     member reaches an OPEN Info sheet without closing it, a draft in progress is
 *     never discarded, and a File that is no longer among the loaded rows closes
 *     the host instead of offering to edit an object that is gone.
 *
 *  F. BOUNDARIES. No polling, no realtime, no new cache and no new read
 *     controller were introduced, and the window-preserving refresh is still THE
 *     primitive a return uses.
 *
 * NOTHING HomeCloud-owned is faked. The host supplies only what a device supplies:
 * React hooks, the presentational primitives, the app lifecycle, a navigation
 * object and the native transfer primitives.
 */

import * as path from 'node:path';

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

const MAX_RENDERS = 1200;

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
    if (renders > MAX_RENDERS) throw new Error('Files freshness: the surface never stopped re-rendering');
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
          if (guard > 60) throw new Error('Files freshness: a single settle never converged');
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

const hostModules = (): FullHost => {
  if (!activeHost) throw new Error('Files freshness: no host is mounted');
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
};
reactStub.default = reactStub;
reactStub.Fragment = Symbol.for('react.fragment');

type AppStatus = 'active' | 'background' | 'inactive' | 'extension';

/**
 * The app lifecycle, as a device reports it: a CURRENT status a surface may read
 * when it mounts, and a change event that only fires on an actual transition.
 * `currentState` tracks the last reported status, which is what a surface that
 * mounts mid-background would read.
 */
const appStatusListeners = new Set<(status: AppStatus) => void>();
const appStateStub = {
  currentState: 'active' as AppStatus | null,
  addEventListener: (_event: string, handler: (status: AppStatus) => void) => {
    appStatusListeners.add(handler);
    return { remove: () => { appStatusListeners.delete(handler); } };
  },
};

/** What a lifecycle transition looks like to every mounted surface. */
function emit(status: AppStatus): void {
  appStateStub.currentState = status;
  for (const handler of [...appStatusListeners]) handler(status);
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
  AppState: appStateStub,
};

let focusEffect: EffectCallback | null = null;
const navigationStub = {
  useNavigation: () => ({ navigate: () => undefined, goBack: () => undefined, setOptions: () => undefined }),
  useFocusEffect: (effect: EffectCallback) => hostModules().useEffect(() => {
    focusEffect = effect;
    effect();
    return () => { if (focusEffect === effect) focusEffect = null; };
  }, [effect]),
  useIsFocused: () => true,
};

const authStub = { useAuth: () => authState };
const householdStub = { useHousehold: () => householdState };
const uiStub = {
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
const downloadStub = {
  downloadHomeCloudOriginal: async () => ({ localUri: 'file:///stub', name: 'x', sizeBytes: 1, mimeType: 'text/plain' }),
  shareHomeCloudDownloadedFile: async () => undefined,
  HomeCloudDownloadError: class HomeCloudDownloadError extends Error {},
};
const nativeFileSystem = {
  documentDirectory: 'file:///freshness-docs/',
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
const frontSource = (relative: string): string => path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio', relative);

const { plannerCache } = require('../front/mi-front-limpio/services/planner/plannerCache');
const { __resetHomeCloudReadReconciliationForTests } =
  require('../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation');
const actionHost = require(compiled('services/homecloud/FileActionHost')) as {
  FileActionHost: (props: Record<string, unknown>) => unknown;
};
const destinationPicker = require(compiled('services/homecloud/FileMoveDestinationPicker')) as {
  FileMoveDestinationPicker: (props: Record<string, unknown>) => unknown;
};
const filesScreen = require(compiled('screens/HomeCloudFilesScreen')) as {
  HomeCloudFilesView: (props?: Record<string, unknown>) => unknown;
  FileTile: (props: Record<string, unknown>) => unknown;
};

// ── transport: the REAL backend contracts, over several households ───────────

const MEMBER_ID = 'mm-freshness';

type Folder = { id: string; name: string };
type Row = { id: string; folderId: string | null; displayName: string; note: string | null; documentDate: string | null };
type FilesRead = { householdId: string; folderId: string | null; query: string; sort: string; limit: number; offset: number };
type Held = { promise: Promise<void>; release: () => void };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * A household over the EXISTING Files endpoints, with the S4-iii has-more probe.
 *
 * The token NAMES the household, exactly as the server resolves it from the
 * session, so switching household is a token change and a late answer is
 * observable arriving for the household that was left.
 */
class Household {
  folders: Folder[] = [];
  rows: Row[] = [];
  readonly filesReads: FilesRead[] = [];
  /** A files read that has been issued but not yet answered. */
  held: Held | null = null;

  constructor(readonly id: string, seed: { folders?: Folder[]; rows?: Row[] } = {}) {
    this.folders = [...(seed.folders ?? [])];
    this.rows = (seed.rows ?? []).map((row) => ({ ...row }));
  }

  /** Exactly what another member's client would have done while we were away. */
  rename(id: string, displayName: string, patch: { note?: string | null; folderId?: string | null; documentDate?: string | null } = {}): void {
    const row = this.rows.find((entry) => entry.id === id);
    if (!row) throw new Error(`no such File ${id}`);
    row.displayName = displayName;
    if ('note' in patch) row.note = patch.note ?? null;
    if ('folderId' in patch) row.folderId = patch.folderId ?? null;
    if ('documentDate' in patch) row.documentDate = patch.documentDate ?? null;
  }

  /** Mirrors backend `browseFiles` AFTER the S4-iii has-more probe. */
  browse(params: URLSearchParams): unknown {
    const folderId = params.get('folderId');
    const search = (params.get('query') ?? '').trim();
    const sort = params.get('sort') ?? 'recent';
    const limit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 100);
    const offset = Math.max(Number(params.get('offset')) || 0, 0);
    let matched = this.rows.filter((row) => {
      const inScope = folderId ? row.folderId === folderId : (!search ? row.folderId === null : true);
      if (!inScope) return false;
      if (!search) return true;
      return `${row.displayName} ${row.note ?? ''}`.toLowerCase().includes(search.toLowerCase());
    });
    matched = sort === 'name'
      ? [...matched].sort((a, b) => (a.displayName < b.displayName ? -1 : 1))
      : [...matched].sort((a, b) => (a.id < b.id ? 1 : -1));
    const window = matched.slice(offset, offset + limit + 1);
    const hasMore = window.length > limit;
    const page = hasMore ? window.slice(0, limit) : window;
    const folders = folderId ? [] : this.folders.filter((folder) => !search || folder.name.toLowerCase().includes(search.toLowerCase()));
    return { folders, files: page.map((row) => this.present(row)), nextOffset: hasMore ? offset + limit : null };
  }

  present(row: Row): Record<string, unknown> {
    return {
      id: row.id,
      householdId: this.id,
      role: 'file',
      lifecycle: 'active',
      displayName: row.displayName,
      mimeType: 'text/plain',
      sizeBytes: 10,
      folderId: row.folderId,
      note: row.note,
      documentDate: row.documentDate,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }
}

/** Several households behind ONE transport, routed by the token, as the server does. */
class World {
  readonly households = new Map<string, Household>();

  add(household: Household): Household {
    this.households.set(household.id, household);
    return household;
  }

  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown, init?: { method?: string; body?: unknown; headers?: Record<string, string> }) => {
      const target = new URL(String(input));
      const method = (init?.method ?? 'GET').toUpperCase();
      const token = String(init?.headers?.Authorization ?? '').replace(/^Bearer\s+/i, '').replace(/^tok:/, '');
      const household = this.households.get(token);
      if (!household) return json(401, { code: 'unauthorized', message: 'Sesión inválida.' });

      if (target.pathname === '/api/homecloud/files') {
        household.filesReads.push({
          householdId: household.id,
          folderId: target.searchParams.get('folderId'),
          query: target.searchParams.get('query') ?? '',
          sort: target.searchParams.get('sort') ?? 'recent',
          limit: Number(target.searchParams.get('limit') ?? '100'),
          offset: Number(target.searchParams.get('offset') ?? '0'),
        });
        // A HELD read is one the network has not answered yet. It is the only way
        // to observe what a late answer does, which is the whole point of D.
        const held = household.held;
        if (held) {
          household.held = null;
          await held.promise;
        }
        return json(200, { browser: household.browse(new URLSearchParams(target.search)) });
      }
      if (target.pathname === '/api/homecloud/folders') {
        return json(200, { folders: household.folders.map((folder) => ({ ...folder, householdId: household.id })) });
      }
      if (target.pathname === '/api/homecloud/capabilities') {
        return json(200, {
          capabilities: { 'homecloud.view': true, 'homecloud.contribute': true, 'homecloud.organize': true, 'homecloud.delete': true },
          membershipId: MEMBER_ID,
          householdId: household.id,
          role: 'adult',
        });
      }
      const contentMatch = /^\/api\/homecloud\/content\/(.+)\/file$/.exec(target.pathname);
      if (contentMatch && method === 'PATCH') {
        const body = (typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : {});
        const row = household.rows.find((entry) => entry.id === contentMatch[1]);
        if (!row) return json(404, { code: 'homecloud_content_not_found', message: 'Archivo no encontrado.' });
        if ('folderId' in body) row.folderId = (body.folderId as string | null) ?? null;
        return json(200, { file: { ...household.present(row), role: 'file', lifecycle: 'active' } });
      }
      return json(404, { code: 'not_found', message: `no route for ${method} ${target.pathname}` });
    }) as typeof fetch;
  }
}

/** Hold the NEXT files read of a household, so a late answer can be observed. */
function holdNextFilesRead(household: Household): Held {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  const held: Held = { promise, release };
  household.held = held;
  return held;
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

/** Every string leaf, so what the member can actually read is what is asserted. */
function renderText(tree: unknown): string[] {
  const out: string[] = [];
  walk(tree, (element) => {
    const children = element.props?.children;
    if (typeof children === 'string') out.push(children);
    if (Array.isArray(children)) for (const child of children) if (typeof child === 'string') out.push(child);
  });
  return out;
}

type ListProps = { data: { kind: string; value: { id: string } }[]; renderItem: (input: { item: unknown; index: number }) => unknown };

const listOf = (tree: unknown): TestElement | null => findOne(tree, (element) => element.type === 'FlatList');

function listedFileIds(tree: unknown): string[] {
  const list = listOf(tree);
  if (!list) return [];
  const data = (list.props as ListProps).data ?? [];
  return data.filter((item) => item.kind === 'file').map((item) => item.value.id);
}

/** What the REAL `FileTile` says about one File. */
function tileText(tree: unknown, id: string): string[] {
  const list = listOf(tree);
  if (!list) return [];
  const props = list.props as ListProps;
  const index = (props.data ?? []).findIndex((item) => item.kind === 'file' && item.value.id === id);
  if (index === -1) return [];
  const tile = props.renderItem({ item: props.data[index], index }) as TestElement;
  return renderText(filesScreen.FileTile(tile.props as Record<string, unknown>));
}

const actionHostElement = (tree: unknown): TestElement | null =>
  findOne(tree, (element) => element.type === actionHost.FileActionHost);

const pickerElement = (tree: unknown): TestElement | null =>
  findOne(tree, (element) => element.type === destinationPicker.FileMoveDestinationPicker);

function pressByLabel(tree: unknown, accessibilityLabel: string): boolean {
  const control = findOne(tree, (element) => element.props?.accessibilityLabel === accessibilityLabel);
  if (typeof control?.props.onPress !== 'function') return false;
  control.props.onPress();
  return true;
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
  const index = (props.data ?? []).findIndex((item) => item.kind === 'folder' && item.value.id === folderId);
  if (index === -1) return false;
  const tile = props.renderItem({ item: props.data[index], index }) as TestElement;
  if (typeof tile?.props?.onPress !== 'function') return false;
  tile.props.onPress();
  return true;
}

/** The sort control is the only labelled-by-title button in the title row. */
function pressSortToggle(tree: unknown): boolean {
  const control = findOne(tree, (element) => typeof element.props?.onPress === 'function'
    && element.props?.title && element.props?.accessibilityLabel === undefined);
  if (typeof control?.props.onPress !== 'function') return false;
  control.props.onPress();
  return true;
}

function pressLoadMore(tree: unknown): boolean {
  const control = findOne(tree, (element) => element.props?.title === 'Mostrar más archivos');
  if (typeof control?.props.onPress !== 'function') return false;
  control.props.onPress();
  return true;
}

const openTileActions = (tree: unknown, id: string): boolean => {
  const list = listOf(tree);
  if (!list) return false;
  const props = list.props as ListProps;
  const index = (props.data ?? []).findIndex((item) => item.kind === 'file' && item.value.id === id);
  if (index === -1) return false;
  const tile = props.renderItem({ item: props.data[index], index }) as TestElement;
  if (typeof tile?.props?.onMore !== 'function') return false;
  tile.props.onMore();
  return true;
};

// ── the surface, mounted ─────────────────────────────────────────────────────

type Mounted = {
  tree: unknown;
  render: () => void;
  settle: (rounds?: number, waitMs?: number) => Promise<void>;
  unmount: () => void;
  /** The ONE prop the shell passes: whether this pane is the visible one. */
  props: { visible: boolean };
};

const HOUSEHOLD_A = 'hh-a';

function mountSurface(world: World, household: Household, options: { visible?: boolean } = {}): Mounted {
  plannerCache.__testOnly_clearAll();
  __resetHomeCloudReadReconciliationForTests();
  appStatusListeners.clear();
  focusEffect = null;
  appStateStub.currentState = 'active';
  world.install();
  authState = { session: { access_token: `tok:${household.id}`, user: { id: MEMBER_ID } } };
  householdState = { currentHousehold: { id: household.id, name: 'Casa' } };
  const host: FullHost = createHookHost();
  activeHost = host;
  const props = { visible: options.visible ?? true };
  const view = () => filesScreen.HomeCloudFilesView(props);
  const surface: Mounted = {
    get tree() { return host.__lastTree(); },
    render: () => { activeHost = host; host.__render(view); host.__commit(); },
    settle: async (rounds = 14, waitMs = 15) => { activeHost = host; await host.__settle(view, rounds, waitMs); },
    unmount: () => host.__unmount(),
    props,
  };
  surface.render();
  return surface;
}

/** Re-point the session at another household, exactly as the shell would. */
function switchHousehold(surface: Mounted, household: Household): void {
  authState = { session: { access_token: `tok:${household.id}`, user: { id: MEMBER_ID } } };
  householdState = { currentHousehold: { id: household.id, name: household.id } };
  surface.render();
}

// ── the canonical action host, on its OWN hook host ──────────────────────────

type MountedActionHost = {
  tree: () => unknown;
  render: (next: Record<string, unknown>) => unknown;
  press: (title: string) => boolean;
  type: (label: string, value: string) => boolean;
  field: (label: string) => TestElement | null;
  unmount: () => void;
};

function hostProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    file: null,
    folders: [],
    permissions: { view: true, organize: true, delete: true },
    saving: false,
    downloadFeedback: null,
    onClose: () => undefined,
    onSave: () => undefined,
    onMoveRequest: () => undefined,
    onDownload: () => undefined,
    onShare: () => undefined,
    ...overrides,
  };
}

function mountActionHost(initial: Record<string, unknown>): MountedActionHost {
  const host: FullHost = createHookHost();
  let props = initial;
  const view = () => actionHost.FileActionHost(props);
  // Effects publish the File's CURRENT metadata into the host's own state, so the
  // tree is read after an effect pass, never before it.
  const cycle = (rounds = 4): unknown => {
    const previous = activeHost;
    activeHost = host;
    try {
      for (let round = 0; round < rounds; round += 1) { host.__render(view); host.__commit(); }
      return host.__lastTree();
    } finally {
      activeHost = previous;
    }
  };
  cycle();
  return {
    tree: () => host.__lastTree(),
    render: (next) => { props = next; return cycle(); },
    press: (title) => {
      const control = findOne(host.__lastTree(), (element) => element.props?.title === title && typeof element.props?.onPress === 'function');
      if (!control) return false;
      control.props.onPress();
      cycle(3);
      return true;
    },
    type: (label, value) => {
      const input = findOne(host.__lastTree(), (element) => element.props?.label === label && typeof element.props?.onChangeText === 'function');
      if (!input) return false;
      input.props.onChangeText(value);
      cycle(3);
      return true;
    },
    field: (label) => findOne(host.__lastTree(), (element) => element.props?.label === label),
    unmount: () => host.__unmount(),
  };
}

// ── fixtures ─────────────────────────────────────────────────────────────────

const looseRows = (householdId: string, count: number, folderId: string | null = null): Row[] =>
  Array.from({ length: count }, (_unused, index) => ({
    id: `${householdId}-c-${String(index).padStart(3, '0')}`,
    folderId,
    displayName: `file-${String(index).padStart(3, '0')}.txt`,
    note: null,
    documentDate: null,
  }));

// ═══════════════════════════════════════════════════════════════════════════
// A — THE APP COMING BACK TO THE FOREGROUND
// ═══════════════════════════════════════════════════════════════════════════

async function testForegroundIsABoundary(): Promise<void> {
  console.log('\n=== A1: background -> active costs exactly ONE refresh ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 4) }));
  const surface = mountSurface(world, household);
  await surface.settle();

  const afterMount = household.filesReads.length;
  record(afterMount === 1, 'A1.1. mounting the Files surface reads once — the initial window');

  emit('background');
  await surface.settle();
  record(household.filesReads.length === afterMount, 'A1.2. going to the background is not a return and reads nothing');

  emit('active');
  await surface.settle();
  record(household.filesReads.length === afterMount + 1, 'A1.3. coming back reads exactly once');
  record(household.filesReads[afterMount]?.offset === 0, 'A1.4. and it re-reads the same window from offset 0');
  record(listedFileIds(surface.tree).length === 4, 'A1.5. the refreshed window is the CURRENT one');

  emit('active');
  await surface.settle();
  record(household.filesReads.length === afterMount + 1, 'A1.6. active -> active is not a return at all');
  surface.unmount();
}

async function testInactiveIsAReturn(): Promise<void> {
  console.log('\n=== A2: inactive -> active costs exactly ONE refresh ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 3) }));
  const surface = mountSurface(world, household);
  await surface.settle();
  const afterMount = household.filesReads.length;

  emit('inactive');
  await surface.settle();
  record(household.filesReads.length === afterMount, 'A2.1. going inactive reads nothing');

  emit('active');
  await surface.settle();
  record(household.filesReads.length === afterMount + 1, 'A2.2. returning from inactive reads exactly once');

  // The iOS shape is background -> inactive -> active: three events, ONE return.
  emit('background');
  emit('inactive');
  emit('active');
  await surface.settle();
  record(household.filesReads.length === afterMount + 2, 'A2.3. background -> inactive -> active is ONE return, not two reads');
  surface.unmount();
}

async function testNoDuplicateOnMount(): Promise<void> {
  console.log('\n=== A3: the first mount is not a return ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 3) }));
  const surface = mountSurface(world, household);
  await surface.settle();

  record(household.filesReads.length === 1, 'A3.1. a surface that mounts in the foreground reads once and stops');
  record(appStatusListeners.size === 1, 'A3.2. exactly one app-lifecycle subscription is open');
  record(appStateStub.currentState === 'active', 'A3.3. the platform status it mounted in is the one recorded');

  // A platform that replays the status on subscription must not invent a return.
  appStatusListeners.forEach((handler) => handler('active'));
  await surface.settle();
  record(household.filesReads.length === 1, 'A3.4. a replayed status right after mounting reads nothing');
  surface.unmount();
}

async function testFocusAndForegroundAreOneReturn(): Promise<void> {
  console.log('\n=== A4: focus and foreground arriving together are ONE return ===');
  for (const order of ['focus-first', 'foreground-first'] as const) {
    const world = new World();
    const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 3) }));
    const surface = mountSurface(world, household);
    await surface.settle();
    const before = household.filesReads.length;

    if (order === 'focus-first') {
      focusEffect?.();
      emit('background');
      emit('active');
    } else {
      emit('background');
      emit('active');
      focusEffect?.();
    }
    await surface.settle();
    record(household.filesReads.length === before + 1, `A4.1. (${order}) two signals of one return cost ONE read`);
    record(listedFileIds(surface.tree).length === 3, `A4.2. (${order}) and the list is coherent afterwards`);
    surface.unmount();
  }
}

async function testUnmountRemovesTheListener(): Promise<void> {
  console.log('\n=== A5: a torn-down surface cannot read ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 3) }));
  const surface = mountSurface(world, household);
  await surface.settle();
  const before = household.filesReads.length;

  surface.unmount();
  record(appStatusListeners.size === 0, 'A5.1. unmounting removes the app-lifecycle subscription');

  emit('background');
  emit('active');
  await new Promise((resolve) => setTimeout(resolve, 30));
  record(household.filesReads.length === before, 'A5.2. and a return after unmount reads nothing at all');
}

async function testExplicitRefreshStillWorks(): Promise<void> {
  console.log('\n=== A6: the explicit refresh control is unchanged ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 3) }));
  const surface = mountSurface(world, household);
  await surface.settle();
  const before = household.filesReads.length;

  household.rename(`${HOUSEHOLD_A}-c-000`, 'renamed-by-hand.txt');
  record(pressByLabel(surface.tree, 'Actualizar archivos'), 'A6.1. the manual control is reachable');
  await surface.settle();
  record(household.filesReads.length === before + 1, 'A6.2. and it reads exactly once');
  record(tileText(surface.tree, `${HOUSEHOLD_A}-c-000`).includes('renamed-by-hand.txt'),
    'A6.3. and the list now shows the renamed File');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// B — THE LOADED WINDOW SURVIVES A RETURN
// ═══════════════════════════════════════════════════════════════════════════

async function testLoadedWindowSurvives(): Promise<void> {
  console.log('\n=== B1: a 300-row window is still a 300-row window after a return ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 300) }));
  const surface = mountSurface(world, household);
  await surface.settle();

  record(listedFileIds(surface.tree).length === 100, 'B1.1. the first window is one server page');

  for (const expected of [200, 300]) {
    record(pressLoadMore(surface.tree), `B1.2. another page is offered at ${expected - 100} rows`);
    await surface.settle();
  }
  record(listedFileIds(surface.tree).length === 300, 'B1.3. three pages are loaded');

  const beforeReturn = household.filesReads.length;
  emit('background');
  emit('active');
  await surface.settle();

  const afterReturn = household.filesReads.slice(beforeReturn);
  record(listedFileIds(surface.tree).length === 300, 'B1.4. the 300-row window survives the return — it did not collapse to page one');
  record(afterReturn.length === 3, 'B1.5. the window was RE-READ, in the page-sized windows it was loaded in');
  record(afterReturn.map((read) => read.offset).join(',') === '0,100,200', 'B1.6. from offset 0, in the same 100-row windows');
  record(afterReturn.every((read) => read.limit === 100), 'B1.7. never as one request the backend would clamp to 100');
  surface.unmount();
}

async function testContextSurvivesTheReturn(): Promise<void> {
  console.log('\n=== B2: folder, query and sort are the SAME question after a return ===');
  const world = new World();
  const household = world.add(new Household('hh-ctx', {
    folders: [{ id: 'ff-viajes', name: 'Viajes' }],
    rows: [
      { id: 'hh-ctx-root-0', folderId: null, displayName: 'sueldo.txt', note: null, documentDate: null },
      { id: 'hh-ctx-in-0', folderId: 'ff-viajes', displayName: 'pasaporte.pdf', note: 'viaje', documentDate: null },
      { id: 'hh-ctx-in-1', folderId: 'ff-viajes', displayName: 'billete.pdf', note: null, documentDate: null },
    ],
  }));
  const surface = mountSurface(world, household);
  await surface.settle();

  record(pressFolder(surface.tree, 'ff-viajes'), 'B2.1. a folder is entered');
  await surface.settle();
  record(pressSortToggle(surface.tree), 'B2.2. the sort is toggled');
  await surface.settle();
  record(typeSearch(surface.tree, 'pasaporte'), 'B2.3. a query is typed');
  await surface.settle(24, 20);

  const beforeReturn = household.filesReads.length;
  const contextBefore = household.filesReads[beforeReturn - 1];
  const rowsBefore = listedFileIds(surface.tree);
  record(rowsBefore.join(',') === 'hh-ctx-in-0', 'B2.4. the context shows exactly what it matched');

  emit('background');
  emit('active');
  await surface.settle();

  const contextAfter = household.filesReads[household.filesReads.length - 1];
  record(household.filesReads.length === beforeReturn + 1, 'B2.5. the return cost exactly one read');
  record(contextAfter.folderId === 'ff-viajes', 'B2.6. the folder survived');
  record(contextAfter.query === 'pasaporte', 'B2.7. the query survived');
  record(contextAfter.sort === contextBefore.sort && contextBefore.sort === 'name', 'B2.8. the sort survived');
  record(contextAfter.offset === 0, 'B2.9. re-read from offset 0, as the same question');
  record(listedFileIds(surface.tree).join(',') === rowsBefore.join(','), 'B2.10. and the list is unchanged');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// C — THE FILES TAB BECOMING VISIBLE AGAIN
// ═══════════════════════════════════════════════════════════════════════════

async function testSegmentVisibility(): Promise<void> {
  console.log('\n=== C1: coming back to the Files tab is a freshness boundary ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 3) }));
  const surface = mountSurface(world, household);
  await surface.settle();
  const afterMount = household.filesReads.length;
  record(afterMount === 1, 'C1.1. mounting on the Files tab reads once and stops');

  surface.props.visible = false;
  surface.render();
  await surface.settle();
  record(household.filesReads.length === afterMount, 'C1.2. HIDING the pane (Memories takes the segment) reads nothing');

  household.rename(`${HOUSEHOLD_A}-c-000`, 'renamed-while-away.txt');
  surface.props.visible = true;
  surface.render();
  await surface.settle();
  record(household.filesReads.length === afterMount + 1, 'C1.3. coming back to Files reads exactly once');
  record(tileText(surface.tree, `${HOUSEHOLD_A}-c-000`).includes('renamed-while-away.txt'),
    'C1.4. and the rename made while the pane was hidden is now on screen');

  const midway = household.filesReads.length;
  surface.props.visible = false;
  surface.render();
  await surface.settle();
  surface.props.visible = true;
  surface.render();
  await surface.settle();
  record(household.filesReads.length === midway + 1, 'C1.5. and every later return to the tab is one read too');
  surface.unmount();
}

async function testSegmentAndForegroundTogether(): Promise<void> {
  console.log('\n=== C2: a tab return and a foreground event together are ONE read ===');
  const world = new World();
  const household = world.add(new Household(HOUSEHOLD_A, { rows: looseRows(HOUSEHOLD_A, 3) }));
  const surface = mountSurface(world, household);
  await surface.settle();

  // The app comes back while the member is on Memories and comes back to Files.
  let before = household.filesReads.length;
  emit('background');
  surface.props.visible = false;
  surface.render();
  await surface.settle();
  emit('active');
  surface.props.visible = true;
  surface.render();
  await surface.settle();
  record(household.filesReads.length === before + 1, 'C2.1. returning to the app AND to the Files tab is ONE read');

  // The same return, seen from the other side of the turn.
  before = household.filesReads.length;
  surface.props.visible = false;
  surface.render();
  await surface.settle();
  emit('background');
  surface.props.visible = true;
  surface.render();
  emit('active');
  await surface.settle();
  record(household.filesReads.length === before + 1, 'C2.2. and in the other order it is still ONE read');
  record(listedFileIds(surface.tree).length === 3, 'C2.3. with a coherent list afterwards');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// D — HOUSEHOLD SCOPE
// ═══════════════════════════════════════════════════════════════════════════

async function testHouseholdSwitchCannotBeStale(): Promise<void> {
  console.log('\n=== D: a return can never read the household that was left ===');
  const world = new World();
  const first = world.add(new Household('hh-one', { rows: looseRows('hh-one', 3) }));
  const second = world.add(new Household('hh-two', { rows: looseRows('hh-two', 2) }));
  const surface = mountSurface(world, first);
  await surface.settle();
  record(listedFileIds(surface.tree).length === 3, 'D1.1. the first household is listed');

  // A return whose answer the network has not produced yet.
  const held = holdNextFilesRead(first);
  emit('background');
  emit('active');
  await surface.settle();
  record(first.filesReads.length === 2, 'D1.2. the return issued its read');
  record(listedFileIds(surface.tree).length === 3, 'D1.3. and the window already on screen stays there, unanswered');

  // The member switches household before that answer arrives.
  switchHousehold(surface, second);
  await surface.settle();
  held.release();
  await surface.settle(24, 20);

  const rows = listedFileIds(surface.tree);
  record(rows.every((id) => id.startsWith('hh-two')), 'D1.4. the late answer for the household being left never lands');
  record(!rows.some((id) => id.startsWith('hh-one')), 'D1.5. not one row of it is visible');

  const beforeReturn = second.filesReads.length;
  emit('background');
  emit('active');
  await surface.settle();
  record(second.filesReads.length === beforeReturn + 1, 'D1.6. the first return AFTER the switch reads the household that is current');
  record(listedFileIds(surface.tree).length === 2, 'D1.7. and its rows are the new household\'s');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// E — CURRENT FILE METADATA IN THE CANONICAL ACTION/INFO HOST
// ═══════════════════════════════════════════════════════════════════════════

async function testActionHostReceivesTheCurrentFile(): Promise<void> {
  console.log('\n=== E1: the canonical host is fed by ID and resolved against CURRENT rows ===');
  const world = new World();
  const household = world.add(new Household('hh-meta', {
    folders: [{ id: 'ff-tramite', name: 'Tramite' }],
    rows: [
      { id: 'hh-meta-f-001', folderId: null, displayName: 'factura-001.txt', note: null, documentDate: null },
      { id: 'hh-meta-f-002', folderId: null, displayName: 'factura-002.txt', note: null, documentDate: null },
    ],
  }));
  const surface = mountSurface(world, household);
  await surface.settle();

  // A root query searches EVERY file, so a File filed into a folder stays in this
  // context: that is what lets the folder itself be observed going stale.
  record(typeSearch(surface.tree, 'factura'), 'E1.1. a root query is typed');
  await surface.settle(24, 20);
  record(listedFileIds(surface.tree).length === 2, 'E1.2. both Files are in this context');

  record(openTileActions(surface.tree, 'hh-meta-f-001'), 'E1.3. the overflow opens the canonical host');
  surface.render();
  record(actionHostElement(surface.tree)?.props?.file?.displayName === 'factura-001.txt',
    'E1.4. the host is handed the File as it was read');

  // Another member renames it, notes it, dates it and files it — all at once.
  household.rename('hh-meta-f-001', 'factura-001-corregida.pdf', {
    note: 'firmado en enero', documentDate: '2026-02-03', folderId: 'ff-tramite',
  });

  emit('background');
  emit('active');
  await surface.settle();

  const current = actionHostElement(surface.tree);
  record(current?.props?.file !== null, 'E1.5. the host is still open — it was never closed and reopened');
  record(current?.props?.file?.id === 'hh-meta-f-001', 'E1.6. on the same File');
  record(current?.props?.file?.displayName === 'factura-001-corregida.pdf', 'E1.7. with the CURRENT name, not the captured one');
  record(current?.props?.file?.note === 'firmado en enero', 'E1.8. and the CURRENT note');
  record(current?.props?.file?.documentDate === '2026-02-03', 'E1.9. and the CURRENT date');
  record(current?.props?.file?.folderId === 'ff-tramite', 'E1.10. and the CURRENT folder');

  // The ONE destination picker reads the same current object, not a captured one.
  current?.props.onMoveRequest();
  surface.render();
  record(pickerElement(surface.tree)?.props?.currentFolderId === 'ff-tramite',
    'E1.11. the shared move picker marks the destination the CURRENT row says');
  surface.unmount();
}

async function testOpenInfoSheetShowsCurrentMetadata(): Promise<void> {
  console.log('\n=== E2: an OPEN Info sheet becomes current, and a draft is never lost ===');
  const file = {
    id: 'c-1', householdId: 'hh-e2', role: 'file', lifecycle: 'active',
    displayName: 'antes.txt', mimeType: 'text/plain', sizeBytes: 10,
    folderId: null, note: 'nota vieja', documentDate: null,
  };
  const host = mountActionHost(hostProps({ file }));

  record(findOne(host.tree(), (element) => element.props?.title === 'Información') !== null,
    'E2.1. the canonical host opens on the action list');
  record(host.press('Información'), 'E2.2. the Info view is reachable from it');
  record(host.field('Nombre')?.props?.value === 'antes.txt', 'E2.3. the sheet shows the File\'s own name');
  record(host.field('Nota')?.props?.value === 'nota vieja', 'E2.4. and its own note');
  record(host.field('Fecha del documento') !== null, 'E2.5. with the document date row too');

  // Another member renames and re-notes it: the sheet stays open and follows.
  const current = { ...file, displayName: 'despues.pdf', note: 'nota nueva' };
  host.render(hostProps({ file: current }));
  record(host.field('Nombre')?.props?.value === 'despues.pdf', 'E2.6. the shown name became CURRENT without closing the sheet');
  record(host.field('Nota')?.props?.value === 'nota nueva', 'E2.7. and so did the note');
  record(host.field('Fecha del documento') !== null, 'E2.8. and the sheet is still the Info view of the same File');

  // Now the member types, and a refresh lands: the draft outranks the refresh.
  record(host.type('Nombre', 'borrador-en-curso.txt'), 'E2.9. the member edits the name');
  record(host.field('Nombre')?.props?.value === 'borrador-en-curso.txt', 'E2.10. and the field shows their own edit');

  host.render(hostProps({ file: { ...current, displayName: 'otro-miembro.pdf', note: 'nota de otro' } }));
  record(host.field('Nombre')?.props?.value === 'borrador-en-curso.txt', 'E2.11. a refresh mid-draft never silently discards what was typed');
  record(host.field('Nota')?.props?.value === 'nota de otro', 'E2.12. while the field the member did not touch still follows the File');
  host.unmount();
}

async function testHostClosesWhenTheFileLeaves(): Promise<void> {
  console.log('\n=== E3: a File that is no longer among the loaded rows closes the host ===');
  const world = new World();
  const household = world.add(new Household('hh-leave', {
    rows: [
      { id: 'hh-leave-a', folderId: null, displayName: 'alfa.txt', note: null, documentDate: null },
      { id: 'hh-leave-b', folderId: null, displayName: 'beta.txt', note: null, documentDate: null },
    ],
  }));
  const surface = mountSurface(world, household);
  await surface.settle();

  record(openTileActions(surface.tree, 'hh-leave-a'), 'E3.1. the host is opened for one File');
  surface.render();
  record(actionHostElement(surface.tree)?.props?.file?.id === 'hh-leave-a', 'E3.2. and it holds that File');

  // Another member files it into a folder: at root it has left this context.
  household.rename('hh-leave-a', 'alfa.txt', { folderId: 'ff-otro' });
  household.folders.push({ id: 'ff-otro', name: 'Otro' });
  emit('background');
  emit('active');
  await surface.settle();

  record(listedFileIds(surface.tree).join(',') === 'hh-leave-b', 'E3.3. the current context no longer holds that File');
  record(actionHostElement(surface.tree)?.props?.file === null, 'E3.4. so the host closed instead of editing a File that is not here');

  // And it does not spring back open on the next render.
  surface.render();
  await surface.settle();
  record(actionHostElement(surface.tree)?.props?.file === null, 'E3.5. and it stays closed');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// F — BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════

function testBoundaries(): void {
  console.log('\n=== F: nothing new was introduced to make this work ===');
  const fs = require('node:fs') as { readFileSync: (file: string, encoding: 'utf8') => string };
  const screen = fs.readFileSync(frontSource('screens/HomeCloudFilesScreen.tsx'), 'utf8');
  const shell = fs.readFileSync(frontSource('screens/HomeCloudScreen.tsx'), 'utf8');
  const pagination = fs.readFileSync(frontSource('services/homecloud/homecloudFilesPagination.ts'), 'utf8');

  record(!/setInterval\(/.test(screen), 'F1. no polling: the Files surface has no interval');
  record((screen.match(/setTimeout\(/g) || []).length === 1, 'F2. and exactly one timer — the pre-existing search debounce, not a repeat');
  record(!/supabase|createClient|\.channel\(|postgres_changes/i.test(screen), 'F3. no realtime subscription of any kind');
  record(!/new Map\(|CACHE_TTL|_cache\b/i.test(screen), 'F4. no new list cache was introduced');
  record(/await controllerRef\.current!\.refreshPreservingWindow\(\)/.test(screen), 'F5. a return goes through the EXISTING window-preserving refresh');
  record((screen.match(/createFilesPagination\(/g) || []).length === 1, 'F6. still exactly ONE read controller on the surface');
  record(/AppState\.addEventListener\('change'/.test(screen), "F7. the lifecycle signal is the platform's own AppState");
  record(/subscription\.remove\(\)/.test(screen), 'F8. and it is removed on teardown');
  record(/<HomeCloudFilesView visible=\{section === 'files'\} \/>/.test(shell), 'F9. the shell signals visibility with ONE prop — no shell redesign');
  record(/display: 'none'/.test(shell), 'F10. and both panes are still mounted, exactly as before');
  record(/refreshPreservingWindow/.test(pagination), 'F11. the window-preserving primitive is untouched and still the refresh path');
}

// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('=== HOMECLOUD FILES FRESHNESS TESTS ===');

  await testForegroundIsABoundary();
  await testInactiveIsAReturn();
  await testNoDuplicateOnMount();
  await testFocusAndForegroundAreOneReturn();
  await testUnmountRemovesTheListener();
  await testExplicitRefreshStillWorks();
  await testLoadedWindowSurvives();
  await testContextSurvivesTheReturn();
  await testSegmentVisibility();
  await testSegmentAndForegroundTogether();
  await testHouseholdSwitchCannotBeStale();
  await testActionHostReceivesTheCurrentFile();
  await testOpenInfoSheetShowsCurrentMetadata();
  await testHostClosesWhenTheFileLeaves();
  testBoundaries();

  console.log(`\nHOMECLOUD_FILES_FRESHNESS_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
}

void main();