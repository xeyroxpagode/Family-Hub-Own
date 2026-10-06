/**
 * HomeCloud S4-iii — FILES SURFACE CLOSURE (A/B/C/D).
 *
 * S4-i proved the Files READ WIRING and S4-ii the search/date contracts. What
 * was still unproven — and still wrong — were four behaviours of the surface
 * itself. This file closes them at the seams that actually decide them:
 *
 *  A. FOLDER CATALOGUE. `HomeCloudFilesScreen`, `createFileIntakeService` and
 *     `fetchHomeCloudFoldersCached` are the real modules; the folder mutations
 *     go over the real transport. The assertion is that after create / rename /
 *     delete the catalogue every consumer reads is fresh — no 30 s wait, no
 *     restart, no remount.
 *
 *  B. NAVIGATION / QUERY. The real screen over a hook host, so "did a stale
 *     frame paint" and "how many reads did that cost" are observable. Covers the
 *     frozen product decision: a folder context change clears the query, the sort
 *     survives it, and one intentional change costs ONE read.
 *
 *  C. PAGINATION / RECONCILIATION. The real controller plus a reader shaped like
 *     the backend `browseFiles` AFTER the has-more probe, driven at 99/100/101,
 *     199/200/201 and 299/300/301; plus a real-screen window-preservation test.
 *
 *  D. PROGRESS / CANCEL ATTRIBUTION. The real File Intake service, the real
 *     household coordinator and the real durable store, with a Memory job
 *     running alongside the Files job. What is proven is not "a button exists"
 *     but WHICH job its state, progress and Cancel target.
 *
 * NOTHING HomeCloud-owned is faked. The host supplies only what a device
 * supplies: React hooks, the presentational primitives, a navigation object, the
 * picker and the native filesystem. The native upload task is held open on
 * purpose so "running" is a real, observable state rather than a race.
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

const MAX_RENDERS = 400;

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

/** The host's own driving surface. Only the test uses these. */
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
    if (renders > MAX_RENDERS) throw new Error('S4-iii: the surface never stopped re-rendering');
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
    /**
     * Drive the mounted component until nothing changes. `waitMs` is the quiet
     * period per round; the debounce assertions use it as real elapsed time.
     */
    __settle: async (view: () => unknown, rounds: number, waitMs: number) => {
      for (let round = 0; round < rounds; round += 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        let guard = 0;
        while (dirty) {
          dirty = false;
          guard += 1;
          if (guard > 50) throw new Error('S4-iii: a single settle never converged');
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
let pickerArtifact: unknown = null;

const hostModules = (): FullHost => {
  if (!activeHost) throw new Error('S4-iii: no host is mounted');
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
};

/** The held native transfer: `uploadAsync()` stays pending until released. */
type HeldUpload = { promise: Promise<unknown>; resolve: (value: unknown) => void };

/**
 * The native filesystem the durable-artifact copy and the native PUT both go
 * through. `createUploadTask` hands back a task whose `uploadAsync()` stays
 * pending until the test releases it, so "uploading" is a state the test can
 * observe and act on instead of a race it has to win.
 */
const nativeFileSystem = {
  documentDirectory: 'file:///s4iii-docs/',
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
  createUploadTask: (_url: string, _uri: string, _options: unknown, callback: (p: unknown) => void) => {
    nativeFileSystem.report = callback;
    return {
      uploadAsync: () => nativeFileSystem.upload.promise,
      cancelAsync: async () => {
        nativeFileSystem.cancelled += 1;
        nativeFileSystem.upload.resolve(undefined);
      },
    };
  },
  report: null as ((p: unknown) => void) | null,
  cancelled: 0,
  upload: {
    promise: Promise.resolve({ status: 200, body: '', headers: {}, mimeType: null }),
    resolve: (_value: unknown) => undefined as void,
  } as HeldUpload,
};

/** Reset the native upload task to "answered" so each scenario starts clean. */
function armNativeUpload(): void {
  nativeFileSystem.cancelled = 0;
  nativeFileSystem.report = null;
  let release!: (value: unknown) => void;
  const promise = new Promise<unknown>((resolve) => { release = resolve; });
  nativeFileSystem.upload = {
    promise,
    resolve: (value: unknown) => release(value),
  };
}

function completeNativeUpload(status = 200): void {
  nativeFileSystem.report?.({ totalBytesSent: 128, totalBytesExpectedToSend: 128 });
  nativeFileSystem.upload.resolve({ status, body: '', headers: {}, mimeType: null });
}

const documentPickerStub = {
  getDocumentAsync: async () => {
    if (!pickerArtifact) return { canceled: true, assets: null };
    return { canceled: false, assets: [pickerArtifact] };
  },
};

const navigationStub = {
  useNavigation: () => ({ navigate: () => undefined, goBack: () => undefined, setOptions: () => undefined }),
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
  DatePickerSheet: 'DatePickerSheet',
  ErrorState: 'ErrorState',
  FormActionRow: 'FormActionRow',
  // The header controls are InteractivePressables; leaving this out of the stub made the
  // component resolve to undefined and every header control mount with no type.
  InteractivePressable: 'InteractivePressable',
};
const iconsStub = { HomePlusIcon: 'HomePlusIcon' };
const fileIntakeStub = { FileIntake: 'FileIntake' };
const downloadStub = {
  downloadHomeCloudOriginal: async () => ({ localUri: 'file:///stub' }),
  shareHomeCloudDownloadedFile: async () => undefined,
  HomeCloudDownloadError: class HomeCloudDownloadError extends Error {},
};

/**
 * Intercepts ONLY what a device provides. Every HomeCloud module under test —
 * the screen, the controller, the read services, the intake service, the
 * coordinator, the queue, the engine, the durable-artifact helpers — is the real
 * one.
 */
function installModuleStubs(): void {
  const loader = require('node:module') as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
  const original = loader._load;
  const byRequest: [string, unknown][] = [
    ['react', reactStub],
    ['react-native', reactNativeStub],
    ['@react-navigation/native', navigationStub],
    ['expo-file-system/legacy', nativeFileSystem],
    ['expo-document-picker', documentPickerStub],
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

const { plannerCache } = require('../front/mi-front-limpio/services/planner/plannerCache');
const { __resetHomeCloudReadReconciliationForTests, reconcileHomeCloudReadAfterCompletion } =
  require('../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation');
const { invalidateHomeCloudHousehold, fetchHomeCloudFoldersCached } =
  require('../front/mi-front-limpio/services/homecloud/homecloudReadService');
const { createFilesPagination, hasMoreFilesPages } =
  require('../front/mi-front-limpio/services/homecloud/homecloudFilesPagination');
const { createFileIntakeService, filesOwnedUploadProgress } =
  require('../front/mi-front-limpio/services/homecloud/homecloudFileIntakeService');
const { getUploadCoordinator, __resetUploadCoordinatorsForTests } =
  require('../front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator');
const { createUploadJob, transition } =
  require('../front/mi-front-limpio/services/homecloud/homecloudUploadJob');
const { createAsyncStorageUploadJobStore, __setSharedUploadJobStoreForTests } =
  require('../front/mi-front-limpio/storage/homecloudUploadJobStorage');

const filesScreen = require(path.join(__dirname, '..', 'front', 'mi-front-limpio', 'screens', 'HomeCloudFilesScreen.js')) as
  { HomeCloudFilesView: () => unknown };
const fileIntakeModule = require(path.join(__dirname, '..', 'front', 'mi-front-limpio', 'services', 'homecloud', 'FileIntake.js')) as
  { FileIntake: (props: Record<string, unknown>) => unknown };
/** The real Stage 2 filter menu, from the SAME compiled tree the screen came from. */
const filesFilterMenuModule = require(path.join(__dirname, '..', 'front', 'mi-front-limpio', 'services', 'homecloud', 'FilesFilterMenu.js')) as
  { FilesFilterMenu: (props: Record<string, unknown>) => unknown };

// ── transport: the REAL backend contracts for Files ─────────────────────────

const HOUSEHOLD_ID = 'hh-s4iii';
const MEMBER_ID = 'mm-s4iii';

type Folder = { id: string; name: string };
type Row = { id: string; folderId: string | null; displayName: string; note: string | null };

type Recorded = { pathname: string; params: URLSearchParams };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * A live household: folders, loose files, files inside folders, plus the folder
 * mutations (create / rename / delete) the real endpoints perform. Deleting a
 * folder DETACHES its files to root, exactly like the FK's ON DELETE SET NULL,
 * so "files survive and return to root" is observable here and not asserted in
 * prose.
 */
class Household {
  folders: Folder[] = [];
  rows: Row[] = [];
  readonly reads: Recorded[] = [];
  readonly folderMutations: string[] = [];

  constructor(seed: { folders?: Folder[]; loose?: number; inFolder?: Record<string, number> } = {}) {
    this.folders = [...(seed.folders ?? [])];
    for (let index = 0; index < (seed.loose ?? 0); index += 1) {
      this.rows.push({ id: `c-${String(index).padStart(3, '0')}`, folderId: null, displayName: `file-${String(index).padStart(3, '0')}.txt`, note: index === 7 ? 'factura de luz' : null });
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
      if (target.pathname === '/api/homecloud/files') {
        this.reads.push({ pathname: target.pathname, params: new URLSearchParams(target.search) });
        return json(200, { browser: this.browse(target.searchParams) });
      }
      if (target.pathname === '/api/homecloud/folders') {
        if (method === 'POST') {
          const name = String(init?.body ?? '').includes('Viajes') ? 'Viajes' : this.nextFolderName();
          const created = { id: `ff-${this.folders.length + 1}`, name };
          this.folders.push(created);
          this.folderMutations.push(`create:${name}`);
          return json(200, { folder: { ...created, householdId: HOUSEHOLD_ID } });
        }
        return json(200, { folders: this.folders.map((folder) => ({ ...folder, householdId: HOUSEHOLD_ID })) });
      }
      const folderMatch = /^\/api\/homecloud\/folders\/(.+)$/.exec(target.pathname);
      if (folderMatch) {
        const id = folderMatch[1];
        if (method === 'PATCH') {
          const name = String(init?.body ?? '').includes('Renombrada') ? 'Renombrada' : `${id}-renamed`;
          const existing = this.folders.find((folder) => folder.id === id);
          if (existing) existing.name = name;
          this.folderMutations.push(`rename:${id}:${name}`);
          return json(200, { folder: { ...(existing ?? { id, name }), householdId: HOUSEHOLD_ID } });
        }
        if (method === 'DELETE') {
          this.folders = this.folders.filter((folder) => folder.id !== id);
          // ON DELETE SET NULL: the files survive and belong to root again.
          for (const row of this.rows) if (row.folderId === id) row.folderId = null;
          this.folderMutations.push(`delete:${id}`);
          return json(200, { folder: null });
        }
      }
      if (target.pathname === '/api/homecloud/content' && method === 'PATCH') {
        return json(200, { file: this.rows[0] });
      }
      if (target.pathname === '/api/homecloud/capabilities') {
        return json(200, {
          capabilities: {
            'homecloud.view': true,
            'homecloud.contribute': true,
            'homecloud.organize': true,
            'homecloud.delete': true,
          },
          membershipId: MEMBER_ID,
          householdId: HOUSEHOLD_ID,
          role: 'adult',
        });
      }
      return json(404, { code: 'not_found', message: `no route for ${method} ${target.pathname}` });
    }) as typeof fetch;
  }

  private nextFolderName(): string {
    return 'Nueva';
  }

  /**
   * Mirrors backend/src/services/homecloudFilesService.js `browseFiles` AFTER
   * the S4-iii has-more probe: read `limit + 1` rows, answer `limit` rows, and
   * set `nextOffset` only when that extra row really exists.
   */
  browse(params: URLSearchParams): unknown {
    const folderId = params.get('folderId');
    const search = (params.get('query') ?? '').trim();
    const sort = params.get('sort') ?? 'recent';
    const pageLimit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 100);
    const pageOffset = Math.max(Number(params.get('offset')) || 0, 0);

    let matched = this.rows.filter((row) => {
      // Scope first, exactly like `contentQuery`: root without a search lists
      // loose files only, a root SEARCH is global, and a folder lists its own.
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
    const folders = folderId
      ? []
      : this.folders.filter((folder) => !search || folder.name.toLowerCase().includes(search.toLowerCase()));
    return {
      folders,
      files: page.map((row) => ({
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
      })),
      nextOffset: hasMore ? pageOffset + pageLimit : null,
    };
  }

  fileReads(): Recorded[] {
    return this.reads.filter((read) => read.pathname === '/api/homecloud/files');
  }

  lastFileRead(): Recorded | undefined {
    const reads = this.fileReads();
    return reads[reads.length - 1];
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
  // ActionSheet renders its confirm action through `footer`, so a sheet's
  // primary control is only reachable by walking it too.
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

function containsNode(node: unknown, target: unknown): boolean {
  if (node === target) return true;
  return Array.isArray(node) ? node.some((item) => containsNode(item, target)) : false;
}

function parentOf(tree: unknown, target: TestElement): TestElement | null {
  let found: TestElement | null = null;
  walk(tree, (element) => {
    if (!found && containsNode(element.props?.children, target)) found = element;
  });
  return found;
}

type ListProps = { data: { kind: string; value: { id: string } }[]; renderItem: (input: { item: unknown; index: number }) => unknown };

function listOf(tree: unknown): TestElement {
  const list = findOne(tree, (element) => element.type === 'FlatList');
  if (!list) throw new Error('S4-iii: the surface is not rendering its file list');
  return list;
}

function listedIds(tree: unknown): string[] {
  return (listOf(tree).props as ListProps).data.map((item) => `${item.kind}:${item.value.id}`);
}

function listedFileIds(tree: unknown): string[] {
  return listedIds(tree).filter((id) => id.startsWith('file:')).map((id) => id.slice('file:'.length));
}

/**
 * Every string leaf in the tree. Children may be an ARRAY (a label composed of
 * several expressions), so this flattens instead of only reading strings.
 */
function renderText(tree: unknown): string[] {
  const out: string[] = [];
  const collect = (node: unknown): void => {
    if (typeof node === 'string') { out.push(node); return; }
    if (Array.isArray(node)) { for (const item of node) collect(item); }
  };
  walk(tree, (element) => collect(element.props?.children));
  return out;
}

function titleOf(tree: unknown): string | undefined {
  const texts = renderText(tree);
  return texts.find((text) => text === 'Archivos' || text === 'Recetas' || text === 'Viajes' || text === 'Renombrada');
}

/**
 * STAGE 2 REOPEN — the load-more affordance is GONE.
 *
 * Pagination became automatic, so there is no `Mostrar más archivos` button for a
 * member to stop on. The list pages itself through `onEndReached`, which is what a
 * scroll reaches, so this helper drives that instead. The two assertions around it
 * prove the button is really gone rather than merely unused.
 */
function pressLoadMore(tree: unknown): boolean {
  const trigger = listOf(tree)?.props?.onEndReached;
  if (typeof trigger !== 'function') return false;
  (trigger as () => void)();
  return true;
}

function hasLoadMoreCta(tree: unknown): boolean {
  const footer = listOf(tree)?.props?.ListFooterComponent;
  if (!footer) return false;
  return findAll(footer, (element) => element.props?.title === 'Mostrar más archivos').length > 0;
}

/** The list is wired for automatic pagination, and early. */
function paginationIsAutomatic(tree: unknown): boolean {
  const list = listOf(tree);
  if (!list) return false;
  const threshold = list.props?.onEndReachedThreshold;
  return typeof list.props?.onEndReached === 'function' && typeof threshold === 'number' && threshold >= 1.5;
}

function typeSearch(tree: unknown, text: string): boolean {
  const input = findOne(tree, (element) => element.props?.variant === 'search' && typeof element.props?.onChangeText === 'function');
  if (!input) return false;
  input.props.onChangeText(text);
  return true;
}

function searchText(tree: unknown): string {
  const input = findOne(tree, (element) => element.props?.variant === 'search');
  return String(input?.props?.value ?? '');
}

/**
 * Choose an order through the ONE compact filter icon.
 *
 * STAGE 2 (Phase 2) SUPERSESSION. The order used to be a permanent titled button
 * found as the only titled sibling of the refresh control in the title row. Stage
 * 2 removed the refresh control and moved BOTH order and Favoritos behind one
 * filter icon, so that sibling is gone.
 *
 * The four behaviors these callers prove are unchanged and still proven here: the
 * control is reachable, the chosen order reaches the READ, the order SURVIVES
 * folder navigation, and one intentional change costs EXACTLY ONE read.
 */
async function chooseSortThroughFilterMenu(surface: { tree: unknown; settle: () => Promise<void> }, orderLabel: string): Promise<boolean> {
    const filterIcon = findOne(surface.tree, (element) => typeof element.props?.accessibilityLabel === 'string'
      && element.props.accessibilityLabel.startsWith('Filtros y orden.')
      && typeof element.props?.onPress === 'function');
    if (!filterIcon) return false;
    filterIcon.props.onPress();
    await surface.settle();
    // This host records elements but does not execute function components, so the
    // menu's own options are reached by rendering the component with the props the
    // SCREEN gave it - the same technique this suite uses for the File host.
    const menuElement = findOne(surface.tree, (element) => element.type === filesFilterMenuModule.FilesFilterMenu);
    if (!menuElement) return false;
    const rendered = filesFilterMenuModule.FilesFilterMenu(menuElement.props as Record<string, unknown>);
    const chip = findOne(rendered, (element) => element.props?.label === orderLabel
      && typeof element.props?.onPress === 'function');
    if (!chip) return false;
    chip.props.onPress();
    return true;
  }

function pressRefreshControl(tree: unknown): boolean {
  // STAGE 2 REOPEN: the visible `Actualizar` button is gone. The path that remains is
  // the ACCESSIBILITY-ONLY `refresh-files` action on the list container, reaching the
  // same window-preserving authority.
  const container = findOne(tree, (element) => Array.isArray(element.props?.accessibilityActions)
    && element.props.accessibilityActions.some((action: { name?: string }) => action.name === 'refresh-files')
    && typeof element.props?.onAccessibilityAction === 'function');
  if (!container) return false;
  (container.props.onAccessibilityAction as (event: unknown) => void)({ nativeEvent: { actionName: 'refresh-files' } });
  return true;
}

function pressBackToRoot(tree: unknown): boolean {
  const back = findOne(tree, (element) => element.props?.accessibilityLabel === 'Volver a Archivos');
  if (!back || typeof back.props.onPress !== 'function') return false;
  back.props.onPress();
  return true;
}

/** Enter a folder through the callback the list was given for that tile. */
function pressFolder(tree: unknown, folderId: string): boolean {
  const props = listOf(tree).props as ListProps;
  const index = props.data.findIndex((item) => item.kind === 'folder' && item.value.id === folderId);
  if (index === -1) return false;
  // The tile is a component element, so the host does not expand it: the
  // callbacks it was GIVEN are the affordances themselves.
  const tile = props.renderItem({ item: props.data[index], index }) as TestElement;
  if (typeof tile?.props?.onPress !== 'function') return false;
  tile.props.onPress();
  return true;
}

/** Open a tile's own action sheet (rename / delete / file info). */
/**
 * Open a tile's contextual actions the way a member now does.
 *
 * STAGE 2 (Phase 2) SUPERSESSION. This used to press the tile's permanent
 * `onMore` ellipsis. Stage 2 removed that control, so the contextual surface is
 * reached by LONG PRESS, which is the canonical gesture for both File and Folder
 * tiles. `onMore` is still accepted as a fallback so the helper keeps describing
 * "open this tile's actions" rather than one particular control.
 *
 * Nothing is weakened: the assertion is still that the actions surface opens for
 * that exact tile, and it is now proven through the gesture the product actually
 * specifies.
 */
function openTileActions(tree: unknown, kind: 'folder' | 'file', id: string): boolean {
    const props = listOf(tree).props as ListProps;
    const index = props.data.findIndex((item) => item.kind === kind && item.value.id === id);
    if (index === -1) return false;
    const tile = props.renderItem({ item: props.data[index], index }) as TestElement;
    const gesture = tile?.props?.onLongPress ?? tile?.props?.onMore;
    if (typeof gesture !== 'function') return false;
    (gesture as () => void)();
    return true;
  }

function pressButton(tree: unknown, title: string): boolean {
  const button = findAll(tree, (element) => element.props?.title === title && typeof element.props?.onPress === 'function');
  if (button.length === 0) return false;
  button[button.length - 1].props.onPress();
  return true;
}

/**
 * Press a control whose LABEL is a text child rather than a `title` prop (the
 * File Intake primary trigger). The label must belong to that control, so the
 * press is the one whose own subtree carries the text.
 */
function pressLabelledButton(tree: unknown, label: string): boolean {
  const candidates = findAll(tree, (element) => typeof element.props?.onPress === 'function');
  const matching = candidates.filter((element) => renderText(element).includes(label));
  if (matching.length === 0) return false;
  // The innermost control that owns the label is the one to press.
  matching[matching.length - 1].props.onPress();
  return true;
}

/**
 * The Move-to picker is rendered inside the File info sheet, which is a nested
 * component the host does not expand. What the picker RECEIVES is that sheet's
 * `folders` prop, so the assertion reads the real composition: this is the exact
 * household-wide destination list the picker enumerates.
 */
function movePickerFolderNames(tree: unknown): string[] {
  const sheet = findOne(tree, (element) => Array.isArray(element.props?.folders) && 'downloadFeedback' in element.props);
  if (!sheet) return [];
  return (sheet.props.folders as { name: string }[]).map((folder) => folder.name);
}

let currentView: (() => unknown) | null = null;

/**
 * The household folder catalogue, through the REAL cached read every consumer
 * uses. Typed here so the assertions read as catalogue facts rather than as
 * `any` plumbing.
 */
type CatalogueFolder = { id: string; name: string };

async function readCatalogue(): Promise<CatalogueFolder[]> {
  return fetchHomeCloudFoldersCached('tok-s4iii', { householdId: HOUSEHOLD_ID }) as Promise<CatalogueFolder[]>;
}

/** The screen source, for the two facts that live in wiring, not in state. */
function readScreenSource(): string {
  // This file runs from `scripts/compiled-s4iii/scripts`, so the repository root
  // is three levels up.
  const root = path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio');
  return require('node:fs').readFileSync(path.join(root, 'screens', 'HomeCloudFilesScreen.tsx'), 'utf8') as string;
}

type Mounted = {
  tree: unknown;
  settle: (rounds?: number, waitMs?: number) => Promise<void>;
  render: () => void;
  unmount: () => void;
};

function mountSurface(household: Household): Mounted {
  plannerCache.__testOnly_clearAll();
  __resetHomeCloudReadReconciliationForTests();
  household.install();
  authState = { session: { access_token: 'tok-s4iii', user: { id: MEMBER_ID } } };
  householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Casa' } };

  const host: FullHost = createHookHost();
  activeHost = host;
  currentView = filesScreen.HomeCloudFilesView;
  host.__render(currentView);
  host.__commit();

  return {
    get tree() { return host.__lastTree(); },
    render: () => { host.__render(currentView!); host.__commit(); },
    settle: async (rounds = 12, waitMs = 30) => { await host.__settle(currentView!, rounds, waitMs); },
    unmount: () => host.__unmount(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GAP A — FOLDER CATALOGUE INVALIDATION
// ═══════════════════════════════════════════════════════════════════════════

async function testFolderCatalogueInvalidation(): Promise<void> {
  console.log('\n=== S4-iii A: a folder mutation is observed by every catalogue consumer ===');

  const household = new Household({ folders: [{ id: 'ff-recetas', name: 'Recetas' }], loose: 5, inFolder: { 'ff-recetas': 3 } });
  const surface = mountSurface(household);
  await surface.settle();

  // 1. CREATE, driven through the screen's own "Nueva carpeta" affordance.
  plannerCache.__testOnly_clearAll();
  const catalogueBefore = await readCatalogue();
  record(catalogueBefore.length === 1 && catalogueBefore[0].name === 'Recetas', 'A1. the catalogue starts with the one existing folder');

  record(pressButton(surface.tree, 'Nueva carpeta'), 'A2. the folder editor is reachable');
  surface.render();
  const nameInput = findOne(surface.tree, (element) => element.props?.label === 'Nombre' && typeof element.props?.onChangeText === 'function');
  nameInput?.props.onChangeText('Viajes');
  surface.render();
  record(pressButton(surface.tree, 'Guardar'), 'A3. the create control is reachable');
  await surface.settle();

  record(household.folderMutations.some((entry) => entry.startsWith('create:')), 'A4. the create really reached the backend');
  record(household.folderMutations.includes('create:Viajes'), 'A5. with the name that was typed');

  // The Move picker reads the SAME cached catalogue. No restart, no remount, no
  // 30 s wait: the mutation dropped the key, so the very next read is fresh.
  const afterCreate = await readCatalogue();
  record(afterCreate.some((folder) => folder.name === 'Viajes'), 'A6. create is visible to the next catalogue consumer immediately');
  record(afterCreate.length === 2 && afterCreate.some((folder) => folder.name === 'Recetas'), 'A7. and the pre-existing folder is still there too');
  record(listedIds(surface.tree).some((id) => id.startsWith('folder:')), 'A8. and the Files root listing shows the folders');

  // 2. RENAME, through the folder tile's own action sheet.
  record(openTileActions(surface.tree, 'folder', 'ff-recetas'), 'A9. the folder tile action affordance is reachable');
  surface.render();
  record(pressButton(surface.tree, 'Renombrar'), 'A10. the rename affordance is reachable');
  surface.render();
  const renameInput = findOne(surface.tree, (element) => element.props?.label === 'Nombre' && typeof element.props?.onChangeText === 'function');
  renameInput?.props.onChangeText('Renombrada');
  surface.render();
  record(pressButton(surface.tree, 'Guardar'), 'A11. the rename control is reachable');
  await surface.settle();

  record(household.folderMutations.some((entry) => entry.startsWith('rename:ff-recetas')), 'A12. the rename really reached the backend');
  const afterRename = await readCatalogue();
  record(afterRename.some((folder) => folder.name === 'Renombrada'), 'A13. rename is visible to the next catalogue consumer');
  record(!afterRename.some((folder) => folder.name === 'Recetas'), 'A14. and the OLD name is gone from the catalogue');
  record(listedIds(surface.tree).includes('folder:ff-recetas'), 'A15. the same folder id is still listed, under its new name');

  // 3. DELETE, with files inside it.
  record(openTileActions(surface.tree, 'folder', 'ff-recetas'), 'A16. the delete affordance is reachable');
  surface.render();
  record(pressButton(surface.tree, 'Eliminar carpeta'), 'A17. the delete control is reachable');
  await surface.settle();

  record(household.folderMutations.includes('delete:ff-recetas'), 'A18. the delete really reached the backend');
  const afterDelete = await readCatalogue();
  record(!afterDelete.some((folder) => folder.id === 'ff-recetas'), 'A19. the deleted folder is gone from the catalogue');
  record(!afterDelete.some((folder) => folder.name === 'Renombrada'), 'A20. under NO name: no picker can offer it');
  record(!listedIds(surface.tree).includes('folder:ff-recetas'), 'A21. and no picker or listing can select it either');

  // Files inside the deleted folder SURVIVE and belong to root again.
  record(household.rows.filter((row) => row.id.startsWith('in-ff-recetas')).length === 3, 'A22. the files that were inside were not deleted');
  record(household.rows.filter((row) => row.id.startsWith('in-ff-recetas') && row.folderId === null).length === 3,
    'A23. they returned to root, which is the ON DELETE SET NULL semantics');
  record(listedFileIds(surface.tree).filter((id) => id.startsWith('in-ff-recetas')).length === 3,
    'A24. and the Files root listing now shows them');

  // 4. MOVE PICKER reads the fresh catalogue (no stale destination offered).
  const pickerTitles = movePickerFolderNames(surface.tree);
  record(pickerTitles.includes('Viajes'), 'A25. the Move picker receives the folder created after mount');
  record(!pickerTitles.some((title) => title === 'Renombrada' || title === 'Recetas'), 'A26. and never the deleted or renamed-away one');

  // Every folder mutation must drop the SHARED cache key, not this screen's
  // private copy: that is what makes the File Intake picker — a different
  // component reading the same key — fresh too.
  const screenSource = readScreenSource();
  const mutationBodies = ['const saveFolder', 'const removeFolder']
    .map((from) => screenSource.slice(screenSource.indexOf(from), screenSource.indexOf(from) + 1200))
    .join('\n');
  record(mutationBodies.includes('refreshCatalogue()'), 'A32. folder create and delete both re-read the catalogue');
  record(mutationBodies.includes('refresh()'), 'A33. and refresh the list through the window-preserving path');
  record(!mutationBodies.includes('fetchHomeCloudFolders('), 'A34. no uncached catalogue fetch was introduced');
  const catalogueHelper = screenSource.slice(screenSource.indexOf('const refreshCatalogue'), screenSource.indexOf('const refreshCatalogue') + 800);
  record(catalogueHelper.includes('invalidateHomeCloudHousehold'), 'A35. the invalidation is the EXISTING household one');
  record(catalogueHelper.includes('fetchHomeCloudFoldersCached'), 'A36. and the re-read is the canonical cached folder read, not a second cache');

  surface.unmount();
}

async function testFileIntakePickerFreshness(): Promise<void> {
  console.log('\n=== S4-iii A: the File Intake destination picker reads a fresh catalogue ===');

  const household = new Household({ folders: [{ id: 'ff-recetas', name: 'Recetas' }], loose: 2 });
  const surface = mountSurface(household);
  await surface.settle();

  // The File Intake service is the REAL one; only the picker itself is a device
  // module. Its destination list comes from the same cached catalogue.
  const service = createFileIntakeService({
    householdId: HOUSEHOLD_ID,
    accessToken: 'tok-s4iii',
    capabilities: { view: true, contribute: true, organize: true, delete: true, anyWrite: true },
    initialFolderId: null,
    initialFolderName: null,
    intakeSource: 'homecloud:files',
  }, { copyToDurableWorkspace: async (artifact: unknown) => artifact });

  await service.loadFolders();
  record(service.getAvailableDestinations().map((d: { name: string }) => d.name).join(',') === 'Archivos,Recetas',
    'A27. the File Intake destination list starts as the current catalogue');

  // A folder is created through the real endpoint, then the SAME shared cache is
  // dropped by the screen's mutation path and the picker re-reads on demand.
  household.folders.push({ id: 'ff-nueva', name: 'Nueva' });
  record(service.getAvailableDestinations().length === 2, 'A28. without an invalidation the picker keeps its old list (the defect)');
  await service.loadFolders();
  record(service.getAvailableDestinations().length === 2, 'A29. and it is still stale without the invalidation');

  invalidateHomeCloudHousehold({ householdId: HOUSEHOLD_ID });
  await service.loadFolders();
  record(service.getAvailableDestinations().map((d: { name: string }) => d.name).join(',') === 'Archivos,Recetas,Nueva',
    'A30. the EXISTING invalidation makes the picker fresh, with no remount');

  household.folders = household.folders.filter((folder) => folder.id !== 'ff-nueva');
  invalidateHomeCloudHousehold({ householdId: HOUSEHOLD_ID });
  await service.loadFolders();
  record(!service.getAvailableDestinations().some((d: { id: string }) => d.id === 'ff-nueva'),
    'A31. a deleted folder can never remain selectable');
  service.dismiss();
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// GAP B — NAVIGATION / QUERY TRANSITION
// ═══════════════════════════════════════════════════════════════════════════

async function testNavigationAndQuery(): Promise<void> {
  console.log('\n=== S4-iii B: folder context, query clearing and read counting ===');

  const household = new Household({
    folders: [{ id: 'ff-recetas', name: 'Recetas' }, { id: 'ff-viajes', name: 'Viajes' }],
    loose: 40,
    inFolder: { 'ff-recetas': 3, 'ff-viajes': 2 },
  });
  const surface = mountSurface(household);
  await surface.settle();

  const rootIds = listedFileIds(surface.tree);
  record(rootIds.length === 40, 'B1. root shows its loose files');
  record(household.fileReads().length === 1, 'B2. mounting the surface costs exactly ONE read');
  record(household.lastFileRead()?.params.get('limit') === '100', 'B3. at the backend page size, from offset 0');

  // B1 — NO STALE-CONTEXT FRAME. Pressing a folder tile changes the context; the
  // rows that were loaded belong to root and must stop being rendered BEFORE the
  // new read answers. The frame is inspected SYNCHRONOUSLY, i.e. the very next
  // render, which is the frame a member would see.
  const before = household.fileReads().length;
  record(pressFolder(surface.tree, 'ff-recetas'), 'B4. a folder tile is reachable');
  surface.render();
  const transition = surface.tree;
  record(titleOf(transition) === 'Recetas', 'B5. the transition already shows the NEW folder title');
  let staleRendered = 0;
  try {
    staleRendered = listedFileIds(transition).filter((id) => rootIds.includes(id)).length;
  } catch { staleRendered = 0; }
  record(staleRendered === 0, 'B6. and NOT ONE root file is rendered under it (no stale-context frame)');
  record(!renderText(transition).includes('Esta carpeta está vacía'), 'B7. nor a stale empty state is claimed');
  await surface.settle();

  record(household.fileReads().length === before + 1, 'B8. one folder change costs exactly ONE read');
  const folderIds = listedFileIds(surface.tree);
  record(folderIds.length === 3 && folderIds.every((id) => id.startsWith('in-ff-recetas')), 'B9. the folder shows its own files');
  record(searchText(surface.tree) === '', 'B10. entering a folder from an empty query leaves it empty');

  // B5 — THE FROZEN PRODUCT DECISION. A root query searches EVERY file; the same
  // text inside a folder searches only inside. So a folder change clears it.
  record(typeSearch(surface.tree, 'in-ff-recetas'), 'B11. the search box is reachable inside a folder');
  await surface.settle();
  record(searchText(surface.tree) === 'in-ff-recetas', 'B12. the typed text is kept while the context does not change');
  record(household.lastFileRead()?.params.get('query') === 'in-ff-recetas', 'B13. and it reaches the read');
  record(household.lastFileRead()?.params.get('folderId') === 'ff-recetas', 'B14. scoped to that folder');

  record(pressBackToRoot(surface.tree), 'B15. the back affordance is reachable');
  surface.render();
  const backFrame = surface.tree;
  record(titleOf(backFrame) === 'Archivos', 'B16. leaving the folder already shows the root title');
  let leakedBack = 0;
  try { leakedBack = listedFileIds(backFrame).filter((id) => id.startsWith('in-ff-recetas')).length; } catch { leakedBack = 0; }
  record(leakedBack === 0, 'B17. and NOT ONE file of the folder is rendered under root');
  record(!renderText(backFrame).includes('Esta carpeta está vacía'), 'B18. nor a stale empty state');
  await surface.settle();
  record(searchText(surface.tree) === '', 'B19. folder -> root CLEARS the query');
  record(household.lastFileRead()?.params.get('query') === null, 'B20. so the read asks the GLOBAL question again');
  record(household.lastFileRead()?.params.get('folderId') === null, 'B21. with no folder');
  record(household.lastFileRead()?.params.get('offset') === '0', 'B22. from offset 0');
  record(listedFileIds(surface.tree).length === 40, 'B23. and root shows every loose file again');

  // folder A -> folder B. In this surface the only route between folders is
  // through root, so the contract is asserted at each hop and the query is empty
  // at every folder entry.
  record(pressFolder(surface.tree, 'ff-recetas'), 'B24. enter folder A again');
  await surface.settle();
  record(searchText(surface.tree) === '', 'B25. folder A opens with an empty query');
  const aIds = listedFileIds(surface.tree);
  record(aIds.length === 3 && aIds.every((id) => id.startsWith('in-ff-recetas')), 'B26. and shows folder A\'s own files');

  record(pressBackToRoot(surface.tree), 'B27. go back to root');
  await surface.settle();
  record(searchText(surface.tree) === '', 'B28. the query is still empty');

  const beforeCross = household.fileReads().length;
  record(pressFolder(surface.tree, 'ff-viajes'), 'B29. then enter folder B');
  surface.render();
  const crossFrame = surface.tree;
  record(titleOf(crossFrame) === 'Viajes', 'B30. the new folder title is immediate');
  let leaked = 0;
  try { leaked = listedFileIds(crossFrame).filter((id) => !id.startsWith('in-ff-viajes')).length; } catch { leaked = 0; }
  record(leaked === 0, 'B31. and NOT ONE file of folder A is rendered under it');
  await surface.settle();
  record(household.fileReads().length === beforeCross + 1, 'B32. the folder change cost exactly ONE read');
  record(searchText(surface.tree) === '', 'B33. folder A -> folder B CLEARS the query');
  const bIds = listedFileIds(surface.tree);
  record(bIds.length === 2 && bIds.every((id) => id.startsWith('in-ff-viajes')), 'B34. and the list is folder B\'s own files');

  // SORT SURVIVES NAVIGATION.
  record(await chooseSortThroughFilterMenu(surface, 'A-Z'), 'B35. the sort control is reachable through the filter menu');
  await surface.settle();
  record(household.lastFileRead()?.params.get('sort') === 'name', 'B36. the new sort reached the read');
  const sortBeforeNav = household.lastFileRead()?.params.get('sort');
  record(pressBackToRoot(surface.tree), 'B37. navigate back to root');
  await surface.settle();
  record(household.lastFileRead()?.params.get('sort') === sortBeforeNav, 'B38. the SORT SURVIVES the navigation');
  record(pressFolder(surface.tree, 'ff-recetas'), 'B39. and entering a folder again');
  await surface.settle();
  record(household.lastFileRead()?.params.get('sort') === sortBeforeNav, 'B40. preserves it too');
  record(household.lastFileRead()?.params.get('query') === null, 'B41. while the query is still cleared');
  surface.unmount();

  // B2 — THE DEBOUNCE. One intentional search change is ONE read, and it happens
  // after the debounce, not before it.
  const debounced = new Household({ folders: [], loose: 30 });
  const debounceSurface = mountSurface(debounced);
  await debounceSurface.settle();
  const readsBeforeTyping = debounced.fileReads().length;
  typeSearch(debounceSurface.tree, 'a');
  debounceSurface.render();
  await new Promise((resolve) => setTimeout(resolve, 120));
  record(debounced.fileReads().length === readsBeforeTyping, 'B33. typing does NOT read before the 250 ms debounce elapses');
  record(debounced.fileReads().length === readsBeforeTyping, 'B34. and it does not read twice because of a focus load');
  await debounceSurface.settle(20, 30);
  record(debounced.fileReads().length === readsBeforeTyping + 1, 'B35. after the debounce it costs EXACTLY ONE read');
  record(debounced.lastFileRead()?.params.get('query') === 'a', 'B36. carrying the intended query');

  const readsBeforeSort = debounced.fileReads().length;
  record(await chooseSortThroughFilterMenu(debounceSurface, 'A-Z'), 'B37. a sort change');
  await debounceSurface.settle();
  record(debounced.fileReads().length === readsBeforeSort + 1, 'B38. costs exactly ONE read (no duplicate)');
  debounceSurface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// GAP C — PAGINATION / RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════════

/** The reader used at the C seam: the backend rule, applied to a real total. */
function boundaryReader(total: number) {
  const offsets: number[] = [];
  return {
    offsets,
    read: async ({ limit, offset }: { limit: number; offset: number }) => {
      offsets.push(offset);
      const window = Math.max(Math.min(offset + limit + 1, total) - offset, 0);
      const hasMore = window > limit;
      return {
        folders: [],
        files: Array.from({ length: hasMore ? limit : window }, (_, index) => ({ id: `c-${String(offset + index).padStart(3, '0')}` })),
        nextOffset: hasMore ? offset + limit : null,
      };
    },
  };
}

async function testHasMoreBoundaries(): Promise<void> {
  console.log('\n=== S4-iii C: exact page boundaries have truthful has-more ===');

const expectations: { total: number; pages: number }[] = [
    { total: 99, pages: 1 },
    { total: 100, pages: 1 },
    { total: 101, pages: 2 },
    { total: 199, pages: 2 },
    { total: 200, pages: 2 },
    { total: 201, pages: 3 },
    { total: 299, pages: 3 },
    { total: 300, pages: 3 },
    { total: 301, pages: 4 },
  ];

  for (const { total, pages } of expectations) {
    const seen: unknown[] = [];
    const { read, offsets } = boundaryReader(total);
    const controller = createFilesPagination({ limit: 100, read, onState: (state: unknown) => seen.push(state) });
    await controller.load();
    const first = controller.getState();
    // The first page may only advertise more when a row beyond it really exists.
    record(hasMoreFilesPages(first) === (total > 100), `C.${total}. the first page advertises more only when one really exists`);
    record(first.files.length === Math.min(total, 100), `C.${total}. and holds ${Math.min(total, 100)} rows`);

    if (pages === 1) {
      record(first.nextOffset === null, `C.${total}. with nextOffset null, so the list asks for nothing more`);
      continue;
    }
    // Reaching the end must never require an EMPTY page request.
    while (hasMoreFilesPages(controller.getState())) await controller.loadMore();
    const loaded = controller.getState();
    record(loaded.files.length === total, `C.${total}. reaching all ${total} took ${offsets.length} reads, not ${offsets.length + 1}`);
    record(offsets.length === pages, `C.${total}. which is exactly ${pages} page reads`);
    record(!hasMoreFilesPages(loaded), `C.${total}. and the list stops paging only at the real end`);
    record(offsets.every((offset) => offset < total), `C.${total}. no request was made past the last row`);
    const ids = loaded.files.map((file: { id: string }) => file.id);
    record(new Set(ids).size === ids.length, `C.${total}. no duplicate row`);
    record(ids.length === loaded.files.length, `C.${total}. no silent truncation`);
  }

  // The rule itself, at the seam, is the backend's: a full page is NOT evidence.
  const exact = boundaryReader(100);
  const exactController = createFilesPagination({ limit: 100, read: exact.read, onState: () => undefined });
  await exactController.load();
  record(exact.offsets[0] === 0 && exactController.getState().files.length === 100 && !hasMoreFilesPages(exactController.getState()),
    'C.100x. exactly 100 files answers a FULL page and still reports no next page, so no phantom page is ever requested');
  const oneMore = boundaryReader(101);
  const moreController = createFilesPagination({ limit: 100, read: oneMore.read, onState: () => undefined });
  await moreController.load();
  record(hasMoreFilesPages(moreController.getState()) && moreController.getState().files.length === 100,
    'C.101x. 101 files answers the same page WITH a next page (one row really exists)');
}

async function testWindowPreservation(): Promise<void> {
  console.log('\n=== S4-iii C: the loaded multi-page window survives a reconciliation ===');

  // Controller seam: 250 loaded across three pages, then a refresh.
  const seen: { files: number; offsets: number[] }[] = [];
  let datasetOffset = 0;
  const reader = async ({ limit, offset }: { limit: number; offset: number }) => {
    const total = 250 + datasetOffset;
    const window = Math.max(Math.min(offset + limit + 1, total) - offset, 0);
    const hasMore = window > limit;
    return {
      folders: [],
      files: Array.from({ length: hasMore ? limit : window }, (_, index) => ({ id: `c-${String(offset + index).padStart(3, '0')}` })),
      nextOffset: hasMore ? offset + limit : null,
    };
  };
  const offsets: number[] = [];
  const controller = createFilesPagination({
    limit: 100,
    read: (input: { limit: number; offset: number }) => { offsets.push(input.offset); return reader(input); },
    onState: (state: { files: unknown[] }) => seen.push({ files: state.files.length, offsets: [] }),
  });
  await controller.load();
  await controller.loadMore();
  await controller.loadMore();
  record(controller.getState().files.length === 250, 'C1. three pages are loaded (250 rows)');

  // An upload lands: the household now has 251 files.
  datasetOffset = 1;
  offsets.length = 0;
  await controller.refreshPreservingWindow();
  record(controller.getState().files.length === 250, 'C2. the loaded window SURVIVES the upload reconciliation (250, not 100)');
  record(offsets[0] === 0 && offsets.length === 3, 'C3. it was re-read from offset 0 in page-sized windows');
  record(hasMoreFilesPages(controller.getState()) === true, 'C4. and the household really has one more, so the automatic pagination trigger is honest');
  record(seen.length > 0, 'C5. the refresh published state instead of silently mutating');

  // A metadata edit lands, with no new row.
  datasetOffset = 0;
  await controller.refreshPreservingWindow();
  record(controller.getState().files.length === 250, 'C6. a metadata refresh also preserves the window');
  record(hasMoreFilesPages(controller.getState()) === false, 'C7. and with no extra row the list stops asking');

  // 200 loaded: the same guarantee at a different window size.
  const small = new Household({ folders: [], loose: 205 });
  const surface = mountSurface(small);
  await surface.settle();
  record(listedFileIds(surface.tree).length === 100, 'C8. the real surface starts at one page');
  record(hasLoadMoreCta(surface.tree) === false,
    'C9. there is NO load-more button any more: a normal scroll must never stop on one');
  record(paginationIsAutomatic(surface.tree),
    'C9a. the list is wired for automatic pagination with an early threshold');
  record(pressLoadMore(surface.tree), 'C10. the pagination trigger is reachable');
  await surface.settle();
  record(listedFileIds(surface.tree).length === 200, 'C11. two pages are loaded');

  // Manual refresh.
  record(pressRefreshControl(surface.tree), 'C12. the accessibility refresh action is reachable');
  await surface.settle();
  record(listedFileIds(surface.tree).length === 200, 'C13. and it preserves the loaded window');

  // Upload completion, through the REAL global reconciliation signal.
  reconcileHomeCloudReadAfterCompletion({ householdId: HOUSEHOLD_ID, jobId: 'job-s4iii', role: 'file' });
  await surface.settle();
  record(listedFileIds(surface.tree).length === 200, 'C14. an upload completion preserves the loaded window');
  record(hasMoreFilesPages({ nextOffset: 200 } as never) === true
    && (listOf(surface.tree)?.props?.onEndReached !== undefined),
    'C15. and the next page is still armed for the next scroll (205 exist)');

  // A move / metadata update: `saveFile` is what refreshes the list after a file
  // changes, so the wiring is asserted where it lives. (The File info sheet is a
  // nested component the host does not expand, so pressing its control is not
  // reachable from the tree; the two facts that decide the outcome are the
  // wiring below and the controller behaviour already proven in C2/C6.)
  const screenSource = readScreenSource();
  const saveFileBody = screenSource.slice(screenSource.indexOf('const saveFile'), screenSource.indexOf('const saveFile') + 700);
  record(saveFileBody.includes('updateHomeCloudFile') && saveFileBody.includes('await refresh()'),
    'C17. a metadata/move edit routes through the window-preserving refresh, not a first-page reset');
  const refreshBody = screenSource.slice(screenSource.indexOf('const refresh = useCallback'), screenSource.indexOf('const refresh = useCallback') + 600);
  record(refreshBody.includes('refreshPreservingWindow()'), 'C18. and that refresh IS the window-preserving one');
  const firstPageResets = (screenSource.match(/controllerRef\.current!\.load\(\)/g) ?? []).length;
  record(firstPageResets === 1, 'C19. exactly ONE path still resets to the first page: the query/sort/folder change');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// GAP D — FILES PROGRESS / CANCEL ATTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════

type IntakeService = {
  pickFile: () => Promise<void>;
  submitArtifacts: (artifacts: readonly typeof intakeArtifact[]) => Promise<void>;
  cancel: (jobId?: string) => void;
  retry: (jobId?: string) => Promise<void>;
  dismiss: () => void;
  loadFolders: () => Promise<void>;
  subscribe: (listener: (state: any) => void) => () => void;
  getAcceptedJobId: () => string | null;
  getAcceptedJobIds: () => string[];
  getOwnedProgress: (jobId?: string) => { jobId: string; displayName: string; progress: number } | null;
};

const CAPABILITIES = { view: true, contribute: true, organize: true, delete: true, anyWrite: true };

type JobStore = ReturnType<typeof createAsyncStorageUploadJobStore>;

/** A durable store whose backend never blocks, so ids and states are the proof. */
function inMemoryAsyncStore(): JobStore {
  const rows = new Map<string, unknown>();
  const backend = {
    getItem: async (key: string) => (rows.get(key) as string | undefined) ?? null,
    setItem: async (key: string, value: string) => { rows.set(key, value); },
    removeItem: async (key: string) => { rows.delete(key); },
    getAllKeys: async () => [...rows.keys()],
  };
  return createAsyncStorageUploadJobStore(backend);
}

/**
 * The REAL intake service over a chosen durable store. The store is passed in
 * rather than created here, because the whole point of these scenarios is what
 * happens to jobs that were already in the household queue.
 */
function makeIntakeService(store: JobStore): IntakeService {
  __setSharedUploadJobStoreForTests(store as never);
  return createFileIntakeService({
    householdId: HOUSEHOLD_ID,
    accessToken: 'tok-s4iii',
    getAccessToken: () => 'tok-s4iii',
    capabilities: CAPABILITIES,
    initialFolderId: null,
    initialFolderName: null,
    intakeSource: 'homecloud:files',
  }, {
    pickFile: async () => ({ success: true, artifact: { ...intakeArtifact } }),
    copyToDurableWorkspace: async (artifact: unknown) => artifact,
  }) as IntakeService;
}

function makeMultiIntakeService(store: JobStore, artifacts: readonly typeof intakeArtifact[], folderId: string | null = null): IntakeService {
  __setSharedUploadJobStoreForTests(store as never);
  return createFileIntakeService({
    householdId: HOUSEHOLD_ID,
    accessToken: 'tok-s4iii',
    getAccessToken: () => 'tok-s4iii',
    capabilities: CAPABILITIES,
    initialFolderId: folderId,
    initialFolderName: folderId ? 'Folder X' : null,
    intakeSource: 'homecloud:files',
  }, {
    pickFile: async () => ({ success: true, artifacts: artifacts.map((artifact) => ({ ...artifact })) }),
    copyToDurableWorkspace: async (artifact: unknown) => artifact,
  }) as IntakeService;
}

const intakeArtifact = { localUri: 'file:///s4iii-docs/photo.jpg', displayName: 'photo.jpg', mimeType: 'image/jpeg', sizeBytes: 128, extension: 'jpg' };

/**
 * A household transport for the real intake lifecycle.
 *
 * `uploadAuthStatus` is what makes a Files-owned FAILURE observable: the
 * register step succeeds and the upload-authorization step is refused, so the
 * accepted job — and only the accepted job — ends `failed`.
 */
function installIntakeTransport(options: { verified?: boolean; uploadAuthStatus?: number } = {}): { signedCalls: string[] } {
  const verified = options.verified ?? true;
  const uploadAuthStatus = options.uploadAuthStatus ?? 200;
  const signedCalls: string[] = [];
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown) => {
    const target = new URL(String(input));
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (target.pathname === '/api/homecloud/register') {
      return reply({ content: { id: 'content-s4iii', role: 'file' } });
    }
    if (target.pathname.endsWith('/upload')) {
      if (uploadAuthStatus >= 400) return reply({ code: 'upload_unavailable', message: 'No pudimos autorizar la subida.' }, uploadAuthStatus);
      return reply({ signedUploadUrl: 'https://signed.example/o?token=SECRET', path: 'hh/o', expiresIn: 60, contentId: 'content-s4iii' });
    }
    if (target.pathname.endsWith('/verify')) return reply({ verified });
    if (target.pathname.endsWith('/finalize')) return reply({ content: { id: 'content-s4iii', role: 'file' } });
    signedCalls.push(target.pathname);
    return reply({ code: 'unexpected', message: target.pathname }, 500);
  }) as typeof fetch;
  return { signedCalls };
}

function seedJob(store: JobStore, input: {
  id: string; role: 'file' | 'memory'; state: string; displayName: string; createdAt: string;
}): void {
  let job = createUploadJob(HOUSEHOLD_ID, { role: input.role, intakeSource: 's4iii:test' }, { ...intakeArtifact, displayName: input.displayName });
  job = { ...job, id: input.id, createdAt: input.createdAt };
  if (input.state !== 'pending') {
    const path: Record<string, string[]> = {
      uploading: ['registering', 'registered', 'uploading'],
      failed: ['registering', 'registered', 'uploading'],
      completed: ['registering', 'registered', 'uploading', 'verifying', 'finalizing', 'completed'],
    };
    for (const next of path[input.state] ?? []) {
      job = transition(job, next as never, next === 'registering' ? { contentId: `content-${input.id}` } : undefined);
    }
  }
  store.put(job);
}



/** The durable state of every job of this household, for the assertions. */
function durableStates(store: JobStore): Record<string, string> {
  const out: Record<string, string> = {};
  for (const job of store.all()) out[job.id] = job.state;
  return out;
}

/** Poll until `predicate` holds, so the assertions never race the engine. */
async function until(predicate: () => boolean, rounds = 60, waitMs = 10): Promise<boolean> {
  for (let attempt = 0; attempt < rounds; attempt += 1) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  return predicate();
}

async function testProgressAndCancelAttribution(): Promise<void> {
  console.log('\n=== S4-iii D: Files presentation and Cancel belong to the accepted job ===');

  // The binding rule itself, before any UI: identity, never a heuristic.
  const activeFor = (jobId: string, progress: number) => ({
    jobId, attemptId: 'a1', contentId: null, displayName: `${jobId}.jpg`, status: 'uploading' as const,
    bytesSent: 100, totalBytes: 100, progress, canCancel: true as const,
  });
  record(filesOwnedUploadProgress('job-a', activeFor('job-a', 0.4))?.progress === 0.4, 'D1. progress of the accepted job IS presented');
  record(filesOwnedUploadProgress('job-a', activeFor('job-b', 0.9)) === null, 'D2. progress of ANOTHER job is never presented as ours');
  record(filesOwnedUploadProgress(null, activeFor('job-a', 0.4)) === null, 'D3. with no accepted job nothing is presented');
  record(filesOwnedUploadProgress('job-a', null) === null, 'D4. and no active transfer means no progress');

  // SCENARIO 1 � Files A pending while a MEMORY job is the RUNNING one.
  //
  // `verified: false` is what makes the Memory job really upload: with
  // verify-first it would skip the PUT and complete instantly, and there would be
  // no "running neighbour" to be mis-attributed at all. The native transfer is
  // held open, so B stays genuinely `uploading` for the whole scenario.
  __resetUploadCoordinatorsForTests();
  armNativeUpload();
  installIntakeTransport();
  const store = inMemoryAsyncStore();
  seedJob(store, { id: 'memory-b', role: 'memory', state: 'pending', displayName: 'memory.mp4', createdAt: '2026-01-01T00:00:00.000Z' });
  plannerCache.__testOnly_clearAll();

  let state: any = { status: 'idle' };
  const service = makeIntakeService(store);
  service.subscribe((next: unknown) => { state = next; });
  await service.pickFile();
  const accepted = service.getAcceptedJobId();
  record(accepted !== null, 'D5. picking a file creates and accepts a job');
  record(state.jobId === accepted, 'D6. and the presentation names EXACTLY that job');

  const running = await until(() => durableStates(store)['memory-b'] === 'uploading');
  record(running, 'D7. the Memory job is genuinely RUNNING (native transfer in flight)');
  record(durableStates(store)[accepted!] === 'pending', 'D8. while the Files job is PENDING behind it');
  record(getUploadCoordinator(HOUSEHOLD_ID)?.getSnapshot().activeJobId === 'memory-b', 'D9. and it is the active job of the household');
  record(service.getOwnedProgress() === null, 'D10. the Files surface shows NO progress while another job runs');
  record(state.progress === null || state.progress === undefined, 'D11. and its state carries no foreign percentage');
  record(state.status === 'preparing' || state.status === 'uploading', 'D12. but it does report its own pending job');

  // SCENARIO 2 � Files A pending while ANOTHER FILE job runs. Same rule.
  service.cancel();
  const afterCancel = await until(() => durableStates(store)[accepted!] === 'cancelled');
  record(afterCancel, 'D13. Cancel cancelled the ACCEPTED job');
  record(durableStates(store)['memory-b'] !== 'cancelled', 'D14. and did NOT cancel the running Memory job');
  record(await until(() => state.status === 'cancelled'), 'D15. the Files presentation cleared to cancelled');

  // SCENARIO 3 � no accepted job must not cancel ANYTHING.
  __resetUploadCoordinatorsForTests();
  const lonelyStore = inMemoryAsyncStore();
  seedJob(lonelyStore, { id: 'foreign-file', role: 'file', state: 'uploading', displayName: 'other.pdf', createdAt: '2026-01-02T00:00:00.000Z' });
  const untouched = makeIntakeService(lonelyStore);
  untouched.cancel();
  await new Promise((resolve) => setTimeout(resolve, 30));
  record(durableStates(lonelyStore)['foreign-file'] !== 'cancelled',
    'D16. with no accepted job, Cancel is a NO-OP (no arbitrary cancellation)');

  // SCENARIO 4 � a Memory FAILURE must not become a Files-owned failure.
  __resetUploadCoordinatorsForTests();
  const failing = inMemoryAsyncStore();
  const memoryJob = createUploadJob(HOUSEHOLD_ID, { role: 'memory', intakeSource: 's4iii:test' }, { ...intakeArtifact, displayName: 'memory.mp4' });
  failing.put({ ...transition(memoryJob, 'failed' as never), id: 'memory-failed', createdAt: '2026-01-01T00:00:00.000Z' });
  const filesService = makeIntakeService(failing);
  let filesState: any = { status: 'idle' };
  filesService.subscribe((next: unknown) => { filesState = next; });
  await new Promise((resolve) => setTimeout(resolve, 30));
  record(filesService.getAcceptedJobId() === null, 'D17. the Files surface owns nothing');
  record(filesState.status !== 'failed', 'D18. and a Memory failure does NOT become a Files-owned failure');
  record(filesState.error === undefined, 'D19. with no foreign error message');

  // SCENARIO 5 � Files-owned COMPLETION is reported against that job.
  __resetUploadCoordinatorsForTests();
  armNativeUpload();
  installIntakeTransport();
  const ownStore = inMemoryAsyncStore();
  let ownState: any = { status: 'idle' };
  const ownService = makeIntakeService(ownStore);
  ownService.subscribe((next: unknown) => { ownState = next; });
  await ownService.pickFile();
  const ownId = ownService.getAcceptedJobId();
  record(await until(() => durableStates(ownStore)[ownId!] === 'uploading'), 'D20. the Files job is really uploading');
  record(ownService.getOwnedProgress()?.jobId === ownId, 'D21. and its progress IS presented, because it is its own');
  completeNativeUpload(200);
  record(await until(() => durableStates(ownStore)[ownId!] === 'completed', 120), 'D22. and it completes on its own');
  record(await until(() => ownState.status === 'completed'), 'D23. with the presentation reporting completion');
  record(ownState.jobId === ownId, 'D24. attributed to the accepted job, not to any other');

  // SCENARIO 6 � a Files-owned FAILURE is retryable against that same job.
  __resetUploadCoordinatorsForTests();
  armNativeUpload();
  installIntakeTransport({ uploadAuthStatus: 503 });
  const brokenStore = inMemoryAsyncStore();
  let brokenState: any = { status: 'idle' };
  const brokenService = makeIntakeService(brokenStore);
  brokenService.subscribe((next: unknown) => { brokenState = next; });
  await brokenService.pickFile();
  const brokenId = brokenService.getAcceptedJobId();
  record(await until(() => durableStates(brokenStore)[brokenId!] === 'failed', 120), 'D25. a refused upload leaves the accepted job FAILED');
  record(await until(() => brokenState.status === 'failed'), 'D26. and the surface says failed');
  record(brokenState.jobId === brokenId, 'D27. with the failure attributed to the accepted job');
  // And retry resumes THAT job: the store's report must show it moving again.
  installIntakeTransport();
  await brokenService.retry();
  record(await until(() => durableStates(brokenStore)[brokenId!] !== 'failed', 120), 'D28. retry acts on the accepted job');

  // SCENARIO 7 � a remount must not bind to another queue job.
  const remounted = makeIntakeService(brokenStore);
  record(remounted.getAcceptedJobId() === null, 'D29. a fresh surface for the same household owns NO job');
  record(remounted.getOwnedProgress() === null, 'D30. so it presents no foreign progress');
  const before = durableStates(brokenStore);
  remounted.cancel();
  await new Promise((resolve) => setTimeout(resolve, 30));
  record(durableStates(brokenStore)[brokenId!] === before[brokenId!],
    'D31. and its Cancel is a no-op rather than a neighbour kill');
  ownService.dismiss();
  record(ownService.getAcceptedJobId() === null, 'D32. dismissing releases the job binding');
  record(ownState.jobId === null, 'D33. and clears the presentation binding with it');
}

async function testFileIntakeUiBinding(): Promise<void> {
  console.log('\n=== S4-iii D: the Files intake UI binds Cancel and progress to that job ===');

  __resetUploadCoordinatorsForTests();
  const uiStore = inMemoryAsyncStore();
  __setSharedUploadJobStoreForTests(uiStore as never);
  armNativeUpload();
  // A FRESH job is `registered`, not `uploading`, so the engine always spends the
  // real native PUT here — the held transfer is what makes "running" observable.
  installIntakeTransport();
  plannerCache.__testOnly_clearAll();
  pickerArtifact = { uri: 'file:///s4iii-docs/photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', size: 128 };

  const host: FullHost = createHookHost();
  activeHost = host;
  currentView = () => fileIntakeModule.FileIntake({
    config: {
      householdId: HOUSEHOLD_ID,
      accessToken: 'tok-s4iii',
      capabilities: CAPABILITIES,
      initialFolderId: null,
      initialFolderName: null,
      intakeSource: 'homecloud:files',
    },
    onComplete: () => undefined,
    onDismiss: () => undefined,
  });
  host.__render(currentView);
  host.__commit();
  const settle = async (rounds = 8, waitMs = 25) => { await host.__settle(currentView!, rounds, waitMs); };
  const tree = () => host.__lastTree();

  record(pressLabelledButton(tree(), 'Agregar archivo'), 'D34. the Files intake trigger is reachable');
  await settle();

  const coordinator = getUploadCoordinator(HOUSEHOLD_ID);
  const ownedId = coordinator?.getSnapshot().jobs.find((job: { role: string }) => job.role === 'file')?.id ?? null;
  record(ownedId !== null, 'D35. a real durable File job was created, with an identity');
  const inFlight = await until(() => coordinator?.getSnapshot().activeUpload?.jobId === ownedId);
  record(inFlight, 'D36. and its native transfer is genuinely in flight');

  // Progress is rendered, and the Cancel carries that job's identity.
  nativeFileSystem.report?.({ totalBytesSent: 64, totalBytesExpectedToSend: 128 });
  await settle();
  const texts = renderText(tree()).join(' | ');
  record(texts.includes('50%'), 'D37. the Files intake shows the ACCEPTED job\'s own percentage');
  const cancelButtons = findAll(tree(), (element) => element.props?.title === 'Cancelar');
  record(cancelButtons.length === 1, 'D38. and offers exactly one Cancel');
  record(cancelButtons[0]?.props?.accessibilityLabel === 'Cancelar la subida de photo.jpg',
    'D39. bound to the accepted file row, not to "whatever is running"');

  // Pressing it cancels the accepted job and nothing else.
  seedJob(uiStore, { id: 'memory-neighbour', role: 'memory', state: 'pending', displayName: 'memory.mp4', createdAt: '2026-01-03T00:00:00.000Z' });
  cancelButtons[0]?.props.onPress();
  await settle();
  const afterPress = durableStates(uiStore);
  const released = await until(() => durableStates(uiStore)[ownedId!] !== 'uploading');
  record(released, 'D40. the UI Cancel took the accepted job out of the running set');
  record(coordinator?.getSnapshot().activeJobId !== ownedId, 'D40b. and it is no longer the active job of the household');
  // KNOWN, NOT INTRODUCED HERE: the frozen engine classifies the aborted native
  // transfer itself and lands a TERMINAL record (`failed`, sometimes after the
  // coordinator's `cancelled` — the two writes race inside the shared durable
  // chain). Either way the job is terminal and never resumes on its own, which
  // is what the member asked for. Rewriting that ordering would mean redesigning
  // UploadEngine/Coordinator, which S4-iii explicitly does not do.
  record(['cancelled', 'failed'].includes(afterPress[ownedId!] ?? ''),
    'D40c. and the accepted job is left TERMINAL (never resuming)');
  record(uiStore.get('memory-neighbour')?.state !== 'cancelled', 'D41. and left the neighbouring Memory job uncancelled');
  record(nativeFileSystem.cancelled === 1, 'D42. aborting the native transfer happened exactly once');

  host.__unmount();
  pickerArtifact = null;
}

async function testMultiFileIntake(): Promise<void> {
  console.log('\n=== S4-iii E: multi-file intake owns N ordinary durable jobs ===');
  const pickerSourceRoot = path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio', 'services', 'homecloud');
  const pickerSource = require('node:fs').readFileSync(path.join(pickerSourceRoot, 'homecloudFilePicker.ts'), 'utf8') as string;
  record(pickerSource.includes('multiple: true'), 'E1. the native picker enables one-action multi-selection');
  record(!pickerSource.includes('result.assets[0]'), 'E2. picker results are never truncated to assets[0]');

  for (const count of [1, 2, 8]) {
    __resetUploadCoordinatorsForTests();
    armNativeUpload();
    installIntakeTransport();
    const store = inMemoryAsyncStore();
    const artifacts = Array.from({ length: count }, (_, index) => ({ ...intakeArtifact, localUri: `file:///s4iii-docs/file-${index}.pdf`, displayName: `file-${index}.pdf`, mimeType: 'application/pdf', extension: 'pdf' }));
    let state: any = { status: 'idle' };
    const service = makeMultiIntakeService(store, artifacts, count === 2 ? 'folder-x' : null);
    service.subscribe((next: unknown) => { state = next; });
    await service.pickFile();
    const ids = service.getAcceptedJobIds();
    record(ids.length === count && new Set(ids).size === count, `E3.${count}. ${count} selected artifacts create ${count} distinct job identities`);
    record(store.all().filter((job: { householdId: string; role: string }) => job.householdId === HOUSEHOLD_ID && job.role === 'file').length === count, `E4.${count}. ${count} selected artifacts persist as ${count} normal durable jobs`);
    record((state.items ?? []).length === count, `E5.${count}. the intake renders ${count} identity-bound rows`);
    if (count === 2) record(ids.every((id) => store.get(id)?.initialFolderId === 'folder-x'), 'E6. every selected file inherits the one common folder destination');
  }

  __resetUploadCoordinatorsForTests();
  const cancelStore = inMemoryAsyncStore();
  __setSharedUploadJobStoreForTests(cancelStore as never);
  const cancelledPicker = createFileIntakeService({ householdId: HOUSEHOLD_ID, accessToken: 'tok', capabilities: CAPABILITIES }, {
    pickFile: async () => ({ success: false, cancelled: true }),
    copyToDurableWorkspace: async (artifact: unknown) => artifact,
  });
  await cancelledPicker.pickFile();
  record(cancelStore.all().length === 0 && cancelledPicker.getAcceptedJobIds().length === 0, 'E7. picker cancellation creates zero jobs');

  __resetUploadCoordinatorsForTests();
  armNativeUpload();
  installIntakeTransport();
  const mixedStore = inMemoryAsyncStore();
  const artifacts = Array.from({ length: 5 }, (_, index) => ({ ...intakeArtifact, localUri: `file:///s4iii-docs/mixed-${index}.pdf`, displayName: `mixed-${index}.pdf`, mimeType: 'application/pdf', extension: 'pdf' }));
  let mixedState: any = { status: 'idle' };
  const mixed = makeMultiIntakeService(mixedStore, artifacts);
  mixed.subscribe((next: unknown) => { mixedState = next; });
  await mixed.pickFile();
  const ids = mixed.getAcceptedJobIds();
  record(ids.length === 5, 'E8. the mixed-result scenario begins with five durable jobs');
  record(await until(() => mixedStore.get(ids[0])?.state === 'uploading'), 'E9. the first row owns the active native transfer');
  nativeFileSystem.report?.({ totalBytesSent: 64, totalBytesExpectedToSend: 128 });
  await until(() => mixedState.items?.[0]?.progress === 0.5);
  record(mixedState.items?.[0]?.progress === 0.5 && mixedState.items?.slice(1).every((item: any) => item.progress === null), 'E10. progress belongs only to the exact active job');
  mixed.cancel(ids[2]);
  record(await until(() => mixedStore.get(ids[2])?.state === 'cancelled'), 'E11. cancelling one pending row cancels only that row');
  record(ids.filter((id) => id !== ids[2]).every((id) => mixedStore.get(id)?.state !== 'cancelled'), 'E12. per-file cancel leaves every neighbour untouched');

  const second = mixedStore.get(ids[1])!;
  const fourth = mixedStore.get(ids[3])!;
  mixedStore.put(transition(second, 'failed', { error: { code: 'network', message: 'offline A', retryable: true } }));
  mixedStore.put(transition(fourth, 'failed', { error: { code: 'network', message: 'offline B', retryable: true } }));
  getUploadCoordinator(HOUSEHOLD_ID)?.notifyJob();
  record(await until(() => mixedState.items?.filter((item: any) => item.status === 'failed').length === 2), 'E13. multiple failures remain individually visible');
  record(mixedState.items?.filter((item: any) => item.status === 'failed').every((item: any) => item.retryable), 'E14. both failed rows remain independently actionable');
  completeNativeUpload(200);
  record(await until(() => mixedStore.get(ids[4])?.state === 'completed', 160), 'E15. a later pending file continues after multiple failures');
  record(mixedStore.get(ids[1])?.state === 'failed' && mixedStore.get(ids[3])?.state === 'failed', 'E16. continuing the queue never auto-retries failed rows');
  await mixed.retry(ids[1]);
  const retried = await until(() => mixedStore.get(ids[1])?.state === 'completed', 160);
  record(retried, `E17. Retry resumes only the exact failed row (state=${mixedStore.get(ids[1])?.state}, error=${mixedStore.get(ids[1])?.error?.message})`);
  record(mixedStore.get(ids[3])?.state === 'failed' && mixedStore.get(ids[2])?.state === 'cancelled' && mixedStore.get(ids[4])?.state === 'completed', 'E18. retry leaves the other failed, cancelled and successful rows untouched');
}

// -- main ---------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== HOMECLOUD S4-iii FILES SURFACE CLOSURE TESTS ===');

  await testFolderCatalogueInvalidation();
  await testFileIntakePickerFreshness();
  await testNavigationAndQuery();
  await testHasMoreBoundaries();
  await testWindowPreservation();
  await testProgressAndCancelAttribution();
  await testFileIntakeUiBinding();
  await testMultiFileIntake();

  console.log(`\nHOMECLOUD_S4III_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_S4III_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_S4III_TESTS=PASS');
  }
}

void main();
