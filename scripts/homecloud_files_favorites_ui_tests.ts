/**
 * HomeCloud Files Core — PERSONAL FAVORITES + SAVE/DOWNLOAD, frontend evidence.
 *
 * It drives the REAL `HomeCloudFilesView`, the REAL `FileActionHost`, the REAL
 * grammar, the REAL pagination controller and the REAL `homecloudDownloadService`
 * over a hook host and a stubbed transport. What stands in for a device is only
 * what a device supplies: React hooks, the presentational primitives, navigation
 * focus, the app-lifecycle signal, and the native file/sharing primitives.
 *
 *  U-A  GRAMMAR. `favorite` is implemented and stateful: the label names the
 *       intent the tap performs. Only `open` and `trash` remain seams, and a
 *       seam is never rendered. `Guardar una copia`, `Compartir` and the
 *       Favorite need only `view`.
 *  U-B  HOST. The canonical host renders the Favorite row from the CURRENT
 *       File, in both states, and dispatches the resolved intent.
 *  U-C  FILTER. The `Favoritos` toggle asks the SERVER (`favoritesOnly=true`);
 *       it composes with folder and search, persists across folder navigation
 *       and across a refresh / foreground return, and resets on a household
 *       switch. It is never a client-side filter.
 *  U-D  MUTATION. Tapping the Favorite row sends the one canonical mutation and
 *       corrects the presentation when the server answers; a refusal corrects
 *       nothing and is stated. Different Files receive their own current state.
 *  U-E  SIGNAL. A favorite tile carries one small marker and says so in its
 *       accessibility label; nothing else changes.
 *  U-F  SAVE/EXPORT. The REAL download module: the signed original is obtained
 *       verbatim, the exact bytes are staged in the temporary cache area, and
 *       the native export/share primitive is invoked. Guardar una copia and
 *       Compartir are separate intents with separate hand-offs and separate
 *       honest failures. Cancellation is quiet. No success is ever claimed for
 *       what the OS does after its own UI closes.
 *  U-G  INTENTS. The screen keeps the two transfer intents separate in source:
 *       save stages and exports, share stages and shares, and neither presents
 *       an internal path as a destination.
 *  U-H  REGRESSION. Multi-select entry and the canonical host survive the tile
 *       and grammar changes untouched.
 *
 * NOTHING HomeCloud-owned is faked beyond the transport boundary. The download
 * service is driven for real in U-F (its native layer is the stubbed device);
 * everywhere else it is a spy, because those blocks assert the screen, not the
 * transfer.
 */

import * as path from 'node:path';

import type {
  HomeCloudFileAction,
  HomeCloudFileActionDefinition,
  HomeCloudFileActionPermissions,
  HomeCloudFileActionState,
} from '../front/mi-front-limpio/services/homecloud/homecloudFileActions';
import type { FilesBrowserPage } from '../front/mi-front-limpio/services/homecloud/homecloudFilesPagination';

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
    if (renders > MAX_RENDERS) throw new Error('Files favorites UI: the surface never stopped re-rendering');
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
          if (guard > 60) throw new Error('Files favorites UI: a single settle never converged');
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
  if (!activeHost) throw new Error('Files favorites UI: no host is mounted');
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

/** Spies for the transfer intents, used everywhere except U-F (which drives the real module). */
const stageCalls: { contentId: string }[] = [];
const exportCalls: { uri: string }[] = [];
const shareSpyCalls: { uri: string }[] = [];
class SpyDownloadError extends Error {
  readonly stage: string;
  readonly code: string;
  constructor(stage: string, code: string, message: string) {
    super(message);
    this.name = 'HomeCloudDownloadError';
    this.stage = stage;
    this.code = code;
  }
}
const downloadSpyStub = {
  stageHomeCloudOriginal: async (_token: string, content: { id: string; displayName: string; mimeType: string }) => {
    stageCalls.push({ contentId: content.id });
    return { uri: `file:///cache/HomeCloud/${content.displayName}`, name: content.displayName, sizeBytes: 10, mimeType: content.mimeType };
  },
  exportHomeCloudStagedCopy: async (copy: { uri: string }) => { exportCalls.push({ uri: copy.uri }); },
  shareHomeCloudDownloadedFile: async (copy: { uri: string }) => { shareSpyCalls.push({ uri: copy.uri }); },
  HomeCloudDownloadError: SpyDownloadError,
};

const nativeFileSystem = {
  documentDirectory: 'file:///favorites-docs/',
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

// ── the native layer for U-F: the REAL download module over a stubbed device ──

type NativeDownload = { uri: string; destinationUri?: string; options?: unknown };
const nativeCalls: { downloads: NativeDownload[]; createdDirs: string[]; releases: number; shares: { uri: string; options?: unknown }[] } = {
  downloads: [],
  createdDirs: [],
  releases: 0,
  shares: [],
};
let nativeSharingAvailable = true;
let nativeShareBehaviour: 'resolve' | 'reject' = 'resolve';
let nativeLocalFile: { uri: string; name: string; exists: boolean; size: number | null } | null = null;
let apiAccessResponse: { signedUrl: string; contentId: string; variant: 'original' } | null = null;
const apiCalls: { path: string }[] = [];

/** Join URI parts the way the native Directory/File constructors do: exactly one
 *  separator between parts, and the `file://` scheme is never collapsed. */
function joinUris(parts: unknown[]): string {
  const strings = parts.map((part) => (typeof part === 'object' && part !== null && 'uri' in part
    ? String((part as { uri: unknown }).uri)
    : String(part)));
  return strings.map((text, index) => (index === 0 ? text.replace(/\/+$/, '') : text.replace(/^\/+|\/+$/g, ''))).join('/');
}
class FakeDirectory {
  readonly uri: string;
  constructor(...uris: unknown[]) {
    this.uri = joinUris(uris);
  }
  create(): void {
    nativeCalls.createdDirs.push(this.uri);
  }
}
class FakeFile {
  readonly uri: string;
  readonly name: string;
  constructor(...uris: unknown[]) {
    const joined = joinUris(uris);
    this.uri = joined;
    this.name = joined.split('/').pop() ?? 'file';
  }
  static createDownloadTask(url: string, destination: unknown, options?: unknown): unknown {
    const destinationUri = typeof destination === 'object' && destination !== null && 'uri' in destination
      ? String((destination as { uri: unknown }).uri)
      : String(destination);
    nativeCalls.downloads.push({ uri: url, destinationUri, options });
    return {
      downloadAsync: async () => nativeLocalFile,
      release: () => { nativeCalls.releases += 1; },
    };
  }
}
const newFileSystemStub = {
  Directory: FakeDirectory,
  File: FakeFile,
  Paths: {
    cache: new FakeDirectory('file:///cache/'),
    document: new FakeDirectory('file:///document/'),
  },
};
const sharingStub = {
  isAvailableAsync: async () => nativeSharingAvailable,
  shareAsync: async (uri: string, options?: unknown) => {
    nativeCalls.shares.push({ uri, options });
    if (nativeShareBehaviour === 'reject') throw new Error('the sheet failed');
  },
};
const downloadApiStub = {
  requestJson: async (requestPath: string) => {
    apiCalls.push({ path: requestPath });
    if (!apiAccessResponse) throw new Error('no access fixture installed');
    return apiAccessResponse;
  },
};

/**
 * U-F loads the REAL download module past the spy rule above. The spy was
 * already handed to the screen under the same resolved filename, so the cache
 * entry is dropped first: the two instances never meet.
 */
let useRealDownloadService = false;

function installModuleStubs(): void {
  const loader = require('node:module') as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
  const original = loader._load;
  const byRequest: [string, unknown][] = [
    ['react', reactStub],
    ['react-native', reactNativeStub],
    ['@react-navigation/native', navigationStub],
    ['expo-file-system/legacy', nativeFileSystem],
    ['expo-file-system', newFileSystemStub],
    ['expo-sharing', sharingStub],
    ['expo-document-picker', { getDocumentAsync: async () => ({ canceled: true, assets: null }) }],
  ];
  const byFragment: [string, unknown][] = [
    ['AuthContext', authStub],
    ['HouseholdContext', householdStub],
    ['components/ui', uiStub],
    ['constants/icons', iconsStub],
    ['homecloudDownloadService', downloadSpyStub],
  ];
  loader._load = function patched(request: string, parent: unknown, isMain: boolean): unknown {
    for (const [exact, value] of byRequest) if (request === exact) return value;
    // U-F drives the REAL download module: it alone gets the stubbed transport,
    // decided by WHO is asking, so the screen keeps talking to the real backend.
    if (request === '../api') {
      const filename = typeof parent === 'object' && parent !== null
        ? String((parent as { filename?: unknown }).filename ?? '')
        : '';
      if (filename.endsWith('homecloudDownloadService.js')) return downloadApiStub;
    }
    for (const [fragment, value] of byFragment) {
      // U-F loads the REAL download module past this rule (see the flag there).
      if (useRealDownloadService && fragment === 'homecloudDownloadService') continue;
      if (request.includes(fragment)) return value;
    }
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
const grammar = require(compiled('services/homecloud/homecloudFileActions')) as {
  HOMECLOUD_FILE_ACTION_GRAMMAR: HomeCloudFileActionDefinition[];
  HOMECLOUD_FILE_ACTION_SEAMS: string[];
  resolveFileActions: (permissions: HomeCloudFileActionPermissions, state?: HomeCloudFileActionState) => HomeCloudFileAction[];
};
const pagination = require(compiled('services/homecloud/homecloudFilesPagination')) as {
  createFilesPagination: (options: {
    read: (input: { limit: number; offset: number }) => Promise<FilesBrowserPage>;
    limit: number;
    onState: (state: unknown) => void;
    contextKey?: () => string;
  }) => { load: () => Promise<void>; patchFile: (contentId: string, changes: { isFavorite?: boolean }) => void; getState: () => { files: { id: string; isFavorite: boolean }[] } };
  patchLoadedFile: (files: readonly { id: string; isFavorite: boolean }[], contentId: string, changes: { isFavorite?: boolean }) => { id: string; isFavorite: boolean }[];
};
const filesFilterMenuModule = require(compiled('services/homecloud/FilesFilterMenu')) as {
  FilesFilterMenu: (props: Record<string, unknown>) => unknown;
};
const actionHost = require(compiled('services/homecloud/FileActionHost')) as {
  FileActionHost: (props: Record<string, unknown>) => unknown;
};
const filesScreen = require(compiled('screens/HomeCloudFilesScreen')) as {
  HomeCloudFilesView: () => unknown;
  FileTile: (props: Record<string, unknown>) => unknown;
};
const selectionBar = require(compiled('services/homecloud/FileSelectionBar')) as {
  FileSelectionBar: (props: Record<string, unknown>) => unknown;
};

// ── transport: the backend contracts for Files, Favorites included ────────────

const HOUSEHOLD_ID = 'hh-favorites-ui';
const MEMBER_ID = 'mm-favorites-ui';

type Folder = { id: string; name: string };
type Row = { id: string; folderId: string | null; displayName: string; note: string | null };
type Request = { method: string; pathname: string; query: string; body: unknown };
type Refusal = { status: number; code: string; message: string };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function envelope(status: number, refusal: Refusal): Response {
  return json(status, { error: { code: refusal.code, message: refusal.message } });
}

/**
 * A live household over the Files read + the one Favorite mutation.
 *
 * `favorites` is the CALLER's own preference set: `browse` filters by it
 * server-side when `favoritesOnly=true` (before sort and before the page) and
 * projects `isFavorite` per row, exactly like the production read.
 */
class Household {
  folders: Folder[] = [];
  rows: Row[] = [];
  favorites = new Set<string>();
  readonly requests: Request[] = [];
  caps = { view: true, contribute: true, organize: true, delete: true };
  favoriteRefusal: Refusal | null = null;

  constructor(seed: { folders?: Folder[]; loose?: number; favorites?: string[] } = {}) {
    this.folders = [...(seed.folders ?? [])];
    for (let index = 0; index < (seed.loose ?? 0); index += 1) {
      this.rows.push({
        id: `c-${String(index).padStart(3, '0')}`,
        folderId: null,
        displayName: `file-${String(index).padStart(3, '0')}.txt`,
        note: null,
      });
    }
    this.favorites = new Set(seed.favorites ?? []);
  }

  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown, init?: { method?: string; body?: unknown }) => {
      const target = new URL(String(input));
      const method = (init?.method ?? 'GET').toUpperCase();
      let body: unknown = null;
      if (typeof init?.body === 'string') {
        try { body = JSON.parse(init.body) as unknown; } catch { body = init.body; }
      }
      this.requests.push({ method, pathname: target.pathname, query: target.search, body });

      if (target.pathname === '/api/homecloud/files') return json(200, { browser: this.browse(target.searchParams) });
      if (target.pathname === '/api/homecloud/folders') {
        return json(200, { folders: this.folders.map((folder) => ({ ...folder, householdId: HOUSEHOLD_ID })) });
      }
      const favoriteMatch = /^\/api\/homecloud\/content\/(.+)\/favorite$/.exec(target.pathname);
      if (favoriteMatch && method === 'PATCH') return this.favorite(favoriteMatch[1], (body ?? {}) as { isFavorite?: unknown });
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

  /** Mirrors backend `setFileFavorite`: intent only, server-owned identity. */
  private favorite(contentId: string, body: { isFavorite?: unknown }): Response {
    if (this.favoriteRefusal) return envelope(this.favoriteRefusal.status, this.favoriteRefusal);
    if (typeof body.isFavorite !== 'boolean') {
      return envelope(400, { status: 400, code: 'homecloud_favorite_invalid', message: 'Indicá si querés agregar o quitar el archivo de favoritos.' });
    }
    if (!this.rows.some((row) => row.id === contentId)) {
      return envelope(404, { status: 404, code: 'homecloud_content_not_found', message: 'Archivo no encontrado.' });
    }
    if (body.isFavorite) this.favorites.add(contentId);
    else this.favorites.delete(contentId);
    return json(200, { favorite: { contentId, isFavorite: body.isFavorite } });
  }

  /** Mirrors backend `browseFiles`: folder + search + favoritesOnly + sort + page. */
  browse(params: URLSearchParams): unknown {
    const folderId = params.get('folderId');
    const search = (params.get('query') ?? '').trim();
    const sort = params.get('sort') ?? 'recent';
    const favoritesOnly = params.get('favoritesOnly') === 'true';
    const pageLimit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 100);
    const pageOffset = Math.max(Number(params.get('offset')) || 0, 0);
    let matched = this.rows.filter((row) => {
      const inScope = folderId ? row.folderId === folderId : (!search ? row.folderId === null : true);
      if (!inScope) return false;
      // The filter is a predicate on the CALLER's own set, applied here — before
      // sort and before the page — never on an already-taken page.
      if (favoritesOnly && !this.favorites.has(row.id)) return false;
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
      isFavorite: this.favorites.has(row.id),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  fileReads(): Request[] {
    return this.requests.filter((entry) => entry.method === 'GET' && entry.pathname === '/api/homecloud/files');
  }

  favoriteReadsWithParam(): Request[] {
    return this.fileReads().filter((entry) => new URLSearchParams(entry.query).get('favoritesOnly') === 'true');
  }

  favoriteCalls(): Request[] {
    return this.requests.filter((entry) => entry.method === 'PATCH' && /^\/api\/homecloud\/content\/.+\/favorite$/.test(entry.pathname));
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

/** Every string leaf. */
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

/** The REAL `FileTile` rendered, so its own accessibility output is what is asserted. */
function renderFileTile(tree: unknown, id: string): unknown {
  const element = fileTileElement(tree, id);
  return element ? filesScreen.FileTile(element.props) : null;
}

/** The pressable body of a rendered File tile. */
function tileBody(tree: unknown, id: string): TestElement | null {
  const rendered = renderFileTile(tree, id);
  return rendered ? findOne(rendered, (element) => element.type === 'AppButton' && typeof element.props.onLongPress === 'function') : null;
}

/** The overflow entry point of a rendered File tile. */
/**
 * Open a File's contextual actions the way a member now does: a LONG PRESS.
 *
 * STAGE 2 (Phase 2) SUPERSESSION. This pressed the per-File overflow ellipsis,
 * which Stage 2 removed in favour of the long-press gesture. `onMore` is kept as a
 * fallback so the helper keeps describing "open this File's actions".
 */
function openTileActions(tree: unknown, id: string): boolean {
    const tile = fileTileElement(tree, id);
    const gesture = tile?.props?.onLongPress ?? tile?.props?.onMore;
    if (typeof gesture !== 'function') return false;
    (gesture as () => void)();
    return true;
  }

function actionHostElement(tree: unknown): TestElement | null {
  return findOne(tree, (element) => element.type === actionHost.FileActionHost);
}

/** The host is always mounted but decides its own visibility: like the Move flow
 *  in the selection suite, the live element carries the production callbacks and
 *  a detached render of those same props is where a row is pressed. Pressing the
 *  rendered row runs the REAL `run()` dispatch, so the grammar-to-handler path
 *  is what is exercised, not a direct callback call. */
function pressHostFavorite(tree: unknown, title: string): boolean {
  const host = actionHostElement(tree);
  if (!host || !host.props?.file) return false;
  const rendered = actionHost.FileActionHost({ ...(host.props as Record<string, unknown>) });
  const button = findOne(rendered, (element) => element.type === 'AppButton' && element.props?.title === title && typeof element.props?.onPress === 'function');
  if (!button) return false;
  button.props.onPress();
  return true;
}

/**
 * Turn the Favoritos MODE on or off through the ONE compact filter icon.
 *
 * STAGE 2 (Phase 2) SUPERSESSION. This pressed the permanent `Favoritos` button.
 * Stage 2 merged that button into the filter menu's MOSTRAR group, so the mode is
 * now chosen there. Everything this suite proves about the mode is UNCHANGED and
 * still proven here: it is a server-side filter, it composes with the folder
 * context, it survives navigation, a refresh and a foreground return, and it
 * resets on a household switch.
 */
async function pressFavoritesToggle(surface: { tree: unknown; settle: (rounds?: number, waitMs?: number) => Promise<void> }, show: 'all' | 'favorites'): Promise<boolean> {
    const filterIcon = findOne(surface.tree, (element) => typeof element.props?.accessibilityLabel === 'string'
      && element.props.accessibilityLabel.startsWith('Filtros y orden.')
      && typeof element.props?.onPress === 'function');
    if (!filterIcon) return false;
    filterIcon.props.onPress();
    await surface.settle();
    // This host records elements but does not execute function components, so the
    // menu's options are reached by rendering the component with the props the
    // SCREEN gave it.
    const menuElement = findOne(surface.tree, (element) => element.type === filesFilterMenuModule.FilesFilterMenu);
    if (!menuElement) return false;
    const rendered = filesFilterMenuModule.FilesFilterMenu(menuElement.props as Record<string, unknown>);
    const chip = findOne(rendered, (element) => element.props?.label === (show === 'favorites' ? 'Favoritos' : 'Todos')
      && typeof element.props?.onPress === 'function');
    if (!chip) return false;
    chip.props.onPress();
    return true;
  }

/** The manual refresh control: a same-context re-read, never a first-page reset. */
function pressRefreshControl(tree: unknown): boolean {
  const control = findOne(tree, (element) => element.props?.accessibilityLabel === 'Actualizar archivos');
  if (typeof control?.props.onPress !== 'function') return false;
  control.props.onPress();
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
  appStatusListeners.clear();
  appStateStub.currentState = 'active';
  focusEffect = null;
  stageCalls.length = 0;
  exportCalls.length = 0;
  shareSpyCalls.length = 0;
  household.install();
  authState = { session: { access_token: 'tok-favorites', user: { id: MEMBER_ID } } };
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

function switchHousehold(surface: Mounted, id: string): void {
  householdState = { currentHousehold: { id, name: id === HOUSEHOLD_ID ? 'Casa' : 'Otra' } };
  surface.render();
}

// ═══════════════════════════════════════════════════════════════════════════
// U-A — THE FAVORITE GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════

function testFavoriteGrammar(): void {
  console.log('\n=== U-A: the Favorite is implemented, stateful, and view-gated ===');

  const implemented = grammar.resolveFileActions({ view: true, organize: true, delete: true });
  record(implemented.map((action) => action.id).join(',') === 'info,rename,move,download,share,favorite',
    'U-A1. the grammar is Información, Renombrar, Mover, Guardar una copia, Compartir, Favorito');
  record(implemented.map((action) => action.label).join(',') === 'Información,Renombrar,Mover,Guardar una copia,Compartir,Agregar a favoritos',
    'U-A2. with the canonical labels: the unfavorited state names the intent to ADD');
  record(grammar.HOMECLOUD_FILE_ACTION_SEAMS.join(',') === 'open,trash',
    'U-A3. only Abrir and Mover a la papelera remain DECLARED extension seams');
  record(!implemented.some((action) => ['open', 'trash'].includes(action.id)),
    'U-A4. and no seam is offered while it has no backend — no fake disabled row');

  const favorited = grammar.resolveFileActions({ view: true, organize: true, delete: true }, { isFavorite: true });
  record(favorited.find((action) => action.id === 'favorite')?.label === 'Quitar de favoritos',
    'U-A5. the SAME row names the opposite intent on a File that already is one');
  const unfavorited = grammar.resolveFileActions({ view: true, organize: true, delete: true }, { isFavorite: false });
  record(unfavorited.find((action) => action.id === 'favorite')?.label === 'Agregar a favoritos',
    'U-A6. and the decided "not favorite" state keeps the add intent');
  const definition = grammar.HOMECLOUD_FILE_ACTION_GRAMMAR.find((action: HomeCloudFileActionDefinition) => action.id === 'favorite');
  record(definition?.stateKey === 'isFavorite' && definition?.activeLabel === 'Quitar de favoritos',
    'U-A7. the two-state naming is DECLARED in the grammar, not special-cased in a render');

  const denied = grammar.resolveFileActions({ view: true, organize: false, delete: false });
  record(denied.find((action) => action.id === 'favorite')?.available === true,
    'U-A8. the Favorite needs only homecloud.view — a viewer who may not organize still favorites');
  record(denied.find((action) => action.id === 'download')?.available === true,
    'U-A9. Guardar una copia needs only homecloud.view too');
  record(denied.find((action) => action.id === 'rename')?.available === false,
    'U-A10. while organization stays organize-gated');
  record(favorited.length === unfavorited.length && favorited.length === implemented.length,
    'U-A11. the state renames the row; it never decides whether the row is offered');

  const blind = grammar.resolveFileActions({ view: false, organize: false, delete: false });
  record(blind.find((action) => action.id === 'favorite')?.available === false,
    'U-A12. without view the Favorite is present but disabled — DENY-SAFE and never silent');
}

// ═══════════════════════════════════════════════════════════════════════════
// U-B — THE HOST RENDERS AND DISPATCHES THE FAVORITE
// ═══════════════════════════════════════════════════════════════════════════

async function testFavoriteHost(): Promise<void> {
  console.log('\n=== U-B: the canonical host owns the Favorite row ===');

  // Detached renders borrow the hook host, so a scratch surface stands in for
  // the mount while the host is asserted in isolation (the selection suite's
  // own C-block does the same for the same reason).
  const scratch = mountSurface(new Household({ loose: 1 }));
  await scratch.settle();

  const base = {
    folders: [],
    permissions: { view: true, organize: false, delete: false },
    saving: false,
    downloadFeedback: null,
    onClose: () => undefined,
    onSave: () => undefined,
    onMoveRequest: () => undefined,
    onFavorite: () => undefined,
    onDownload: () => undefined,
    onShare: () => undefined,
  };
  const plain = { id: 'x', displayName: 'x.txt', mimeType: 'text/plain', folderId: null, note: null, documentDate: null, isFavorite: false };
  const loved = { ...plain, isFavorite: true };

  const renderedPlain = actionHost.FileActionHost({ ...base, file: plain });
  record(findAll(renderedPlain, (element) => element.type === 'AppButton' && element.props?.title === 'Agregar a favoritos').length === 1,
    'U-B1. an unfavorited File offers exactly one "Agregar a favoritos" row');
  const renderedLoved = actionHost.FileActionHost({ ...base, file: loved });
  record(findAll(renderedLoved, (element) => element.type === 'AppButton' && element.props?.title === 'Quitar de favoritos').length === 1,
    'U-B2. a favorite File offers exactly one "Quitar de favoritos" row');
  record(findAll(renderedPlain, (element) => element.type === 'AppButton' && /^(Abrir|Mover a la papelera)$/.test(element.props?.title ?? '')).length === 0,
    'U-B3. no seam row is painted beside it');

  let dispatched: boolean | null = null;
  const wired = actionHost.FileActionHost({ ...base, file: plain, onFavorite: (next: boolean) => { dispatched = next; } });
  const addButton = findOne(wired, (element) => element.type === 'AppButton' && element.props?.title === 'Agregar a favoritos');
  addButton?.props.onPress();
  record(dispatched === true, 'U-B4. tapping it dispatches the ADD intent the label promised');

  dispatched = null;
  const wiredLoved = actionHost.FileActionHost({ ...base, file: loved, onFavorite: (next: boolean) => { dispatched = next; } });
  const removeButton = findOne(wiredLoved, (element) => element.type === 'AppButton' && element.props?.title === 'Quitar de favoritos');
  removeButton?.props.onPress();
  record(dispatched === false, 'U-B5. and tapping the other label dispatches the REMOVE intent');

  const closed = actionHost.FileActionHost({ ...base, file: null });
  record(closed === null, 'U-B6. without a File the host still renders nothing at all');
  scratch.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// U-C — THE FAVORITOS FILTER IS ASKED OF THE SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function testFavoritesFilter(): Promise<void> {
  console.log('\n=== U-C: Favoritos is a server filter mode, never a client filter ===');

  const household = new Household({ loose: 4, favorites: ['c-000', 'c-002'] });
  const surface = mountSurface(household);
  await surface.settle();

  record(listedFileIds(surface.tree).join(',') === 'c-003,c-002,c-001,c-000',
    'U-C1. the unfiltered list shows every File with its own order');
  record(household.favoriteReadsWithParam().length === 0, 'U-C2. and no read asked for favorites yet');

// STAGE 2 (Phase 2) SUPERSESSION. Stage 1 asserted a permanent `Favoritos`
   // button sitting in the title row and read that button's own label. Stage 2
   // removed the button and merged the mode into the compact filter icon, so there
   // is no such button any more. What is protected here is the SAME thing Stage 1
   // protected: the control is reachable, it is ANNOUNCED with the state currently
   // in effect, and it is announced honestly both before and after the mode is on.
   // The assertions are made against the control that now owns it, and they are
   // not weaker.
   const filterControlLabel = () => String(findOne(surface.tree, (element) => typeof element.props?.accessibilityLabel === 'string'
     && element.props.accessibilityLabel.startsWith('Filtros y orden.'))?.props?.accessibilityLabel ?? '');
   record(filterControlLabel().length > 0, 'U-C3. the display filter control that owns Favoritos is reachable');
   record(filterControlLabel().includes('todos los archivos'), 'U-C4. and it announces the state in effect right now (no favorites yet)');
  record(await pressFavoritesToggle(surface, 'favorites'), 'U-C5. Favoritos is chosen in the filter menu');
  await surface.settle();

  record(household.favoriteReadsWithParam().length >= 1, 'U-C6. the NEXT read carries favoritesOnly=true to the server');
  record(household.fileReads().slice(-1).every((entry) => new URLSearchParams(entry.query).get('favoritesOnly') === 'true'),
    'U-C7. the current context really is the filtered one');
  record(listedFileIds(surface.tree).join(',') === 'c-002,c-000',
    'U-C8. so the member sees only their own favorites, in the server\'s order');
record(filterControlLabel().includes('solo tus favoritos'), 'U-C9. and the control now announces that the mode is on, so leaving it is discoverable');

  record(await pressFavoritesToggle(surface, 'all'), 'U-C10. and it is chosen again to leave the mode');
  await surface.settle();
  record(household.fileReads().slice(-1).every((entry) => new URLSearchParams(entry.query).get('favoritesOnly') !== 'true'),
    'U-C11. leaving the mode asks the unfiltered question again');
  record(listedFileIds(surface.tree).length === 4, 'U-C12. and every File is back');

  // The mode persists across folder navigation, like sort — unlike the query.
  const navigating = new Household({ folders: [{ id: 'ff-garantias', name: 'Garantías' }], loose: 2, favorites: ['c-000'] });
  navigating.rows.push({ id: 'in-ff-garantias-0', folderId: 'ff-garantias', displayName: 'garantia.txt', note: null });
  navigating.favorites.add('in-ff-garantias-0');
  const navSurface = mountSurface(navigating);
  await navSurface.settle();
  record(await pressFavoritesToggle(navSurface, 'favorites'), 'U-C13. Favoritos is turned on at the root');
  await navSurface.settle();
  record(listedFileIds(navSurface.tree).join(',') === 'c-000', 'U-C14. the root shows the favorite loose File');
  record(pressFolder(navSurface.tree, 'ff-garantias'), 'U-C15. the member steps into Garantías');
  await navSurface.settle();
  record(navigating.fileReads().slice(-1).every((entry) => {
    const params = new URLSearchParams(entry.query);
    return params.get('favoritesOnly') === 'true' && params.get('folderId') === 'ff-garantias';
  }), 'U-C16. the folder read KEEPS favoritesOnly: the mode survives navigation');
  record(listedFileIds(navSurface.tree).join(',') === 'in-ff-garantias-0',
    'U-C17. and it shows the member\'s favorites inside that folder');

  // The mode survives a same-context refresh: it is part of the question.
  record(pressRefreshControl(navSurface.tree), 'U-C18. the member refreshes inside the filtered folder');
  await navSurface.settle();
  record(navigating.fileReads().slice(-1).every((entry) => new URLSearchParams(entry.query).get('favoritesOnly') === 'true'),
    'U-C19. the refresh re-asks the SAME filtered question');
  record(listedFileIds(navSurface.tree).join(',') === 'in-ff-garantias-0', 'U-C20. and the rows are still the filtered ones');

  // …and a foreground return, which is the same funnel.
  emit('background');
  emit('active');
  await navSurface.settle(16, 20);
  record(navigating.fileReads().slice(-1).every((entry) => new URLSearchParams(entry.query).get('favoritesOnly') === 'true'),
    'U-C21. returning from the background re-reads with the filter intact');
  focusEffect?.();
  await navSurface.settle(16, 20);
  record(navigating.fileReads().slice(-1).every((entry) => new URLSearchParams(entry.query).get('favoritesOnly') === 'true'),
    'U-C22. and so does a navigation focus return');

  // A household switch leaves the mode behind: it belongs to the old context.
  switchHousehold(navSurface, 'hh-other');
  await navSurface.settle();
  record(navigating.fileReads().slice(-1).every((entry) => new URLSearchParams(entry.query).get('favoritesOnly') !== 'true'),
    'U-C23. switching households resets the mode — a new household starts unfiltered');
  navSurface.unmount();
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// U-D — THE MUTATION CORRECTS THE PRESENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function testPatchPrimitive(): Promise<void> {
  console.log('\n=== U-D0: the loaded window can be corrected without a re-read ===');

  const rows = [
    { id: 'a', isFavorite: false },
    { id: 'b', isFavorite: true },
  ];
  const patched = pagination.patchLoadedFile(rows, 'a', { isFavorite: true });
  record(patched[0].isFavorite === true && patched[1].isFavorite === true,
    'U-D0.1. patching one row rewrites exactly that row');
  record(rows[0].isFavorite === false, 'U-D0.2. and it never mutates the loaded rows in place');
  record(pagination.patchLoadedFile(rows, 'missing', { isFavorite: true }) === rows,
    'U-D0.3. an unknown id invents nothing — it is a no-op');

  let reads = 0;
  let latest: { files: { id: string; isFavorite: boolean }[] } = { files: [] };
  const controller = pagination.createFilesPagination({
    limit: 100,
    onState: (state) => { latest = state as { files: { id: string; isFavorite: boolean }[] }; },
    read: async (): Promise<FilesBrowserPage> => {
      reads += 1;
      return { folders: [], files: [{ id: 'a', isFavorite: false } as never], nextOffset: null };
    },
  });
  await controller.load();
  controller.patchFile('a', { isFavorite: true });
  record(latest.files[0]?.isFavorite === true, 'U-D0.4. the controller publishes the corrected row');
  record(reads === 1, 'U-D0.5. without issuing a second read');
}

async function testFavoriteMutationOnSurface(): Promise<void> {
  console.log('\n=== U-D: tapping the Favorite row mutates and reconciles ===');

  const household = new Household({ loose: 3, favorites: ['c-001'] });
  household.caps = { view: true, contribute: true, organize: false, delete: false };
  const surface = mountSurface(household);
  await surface.settle();

  // The viewer without organize still gets the Favorite row.
  record(openTileActions(surface.tree, 'c-000'), 'U-D1. the overflow opens the host for an unfavorited File');
  surface.render();
  record(pressHostFavorite(surface.tree, 'Agregar a favoritos'), 'U-D2. the host offers the ADD intent');
  await surface.settle(24, 10);

  const calls = household.favoriteCalls();
  record(calls.length === 1, 'U-D3. exactly ONE canonical mutation was sent');
  record(calls[0]?.pathname === '/api/homecloud/content/c-000/favorite'
    && (calls[0]?.body as { isFavorite?: unknown })?.isFavorite === true,
    'U-D4. to the File the member acted on, carrying ONLY the intent');
  const body = tileBody(surface.tree, 'c-000');
  record(typeof body?.props?.accessibilityLabel === 'string' && body.props.accessibilityLabel.includes(', favorito'),
    'U-D5. and the tile now says it is one of the member\'s favorites');
  record(pressHostFavorite(surface.tree, 'Quitar de favoritos'), 'U-D6. the open host already names the opposite intent');
  await surface.settle(24, 10);
  const second = household.favoriteCalls();
  record(second.length === 2 && (second[1]?.body as { isFavorite?: unknown })?.isFavorite === false,
    'U-D7. tapping it sends the REMOVE intent for the same File');
  await surface.settle(24, 10);
  const unbefriended = tileBody(surface.tree, 'c-000');
  record(typeof unbefriended?.props?.accessibilityLabel === 'string' && !unbefriended.props.accessibilityLabel.includes('favorito'),
    'U-D8. and the tile stops saying so');

  // A different File receives its own current state, not the previous File's.
  record(openTileActions(surface.tree, 'c-001'), 'U-D9. the host opens for a DIFFERENT File');
  surface.render();
  record(actionHostElement(surface.tree)?.props?.file?.isFavorite === true,
    'U-D10. and it is handed THAT File\'s current favorite state');
  record(pressHostFavorite(surface.tree, 'Quitar de favoritos'), 'U-D11. so it offers the remove intent there');
  await surface.settle(24, 10);
  record(household.favoriteCalls().length === 3, 'U-D12. and the mutation names the new File');

  // A refusal corrects nothing and is stated.
  household.favoriteRefusal = { status: 403, code: 'homecloud_forbidden', message: 'No tenés permiso para realizar esta acción en HomeCloud.' };
  record(openTileActions(surface.tree, 'c-002'), 'U-D13. the host opens for a third File');
  surface.render();
  record(pressHostFavorite(surface.tree, 'Agregar a favoritos'), 'U-D14. the member tries to favorite it');
  await surface.settle(24, 10);
  record(household.favorites.has('c-002') === false, 'U-D15. the server refused, so the preference was never recorded');
  record(renderText(surface.tree).some((text) => /permiso/i.test(text)),
    'U-D16. and the refusal itself is stated on the surface instead of a painted favorite');
  household.favoriteRefusal = null;
  record(pressRefreshControl(surface.tree), 'U-D17. a re-read is triggered after the refusal');
  await surface.settle(24, 10);
  const reconciled = tileBody(surface.tree, 'c-002');
  record(typeof reconciled?.props?.accessibilityLabel === 'string' && !reconciled.props.accessibilityLabel.includes('favorito'),
    'U-D18. the tile still says nothing it was not granted');
  surface.unmount();

  // Inside the filtered mode, unfavoriting reconciles through the re-read: the
  // row legitimately leaves the set instead of being patched into it.
  const filtered = new Household({ loose: 2, favorites: ['c-000'] });
  const filteredSurface = mountSurface(filtered);
  await filteredSurface.settle();
  record(await pressFavoritesToggle(filteredSurface, 'favorites'), 'U-D19. Favoritos is on');
  await filteredSurface.settle();
  record(listedFileIds(filteredSurface.tree).join(',') === 'c-000', 'U-D20. showing the one favorite');
  record(openTileActions(filteredSurface.tree, 'c-000'), 'U-D21. the host opens');
  filteredSurface.render();
  record(pressHostFavorite(filteredSurface.tree, 'Quitar de favoritos'), 'U-D22. the member removes it');
  await filteredSurface.settle(24, 10);
  record(listedFileIds(filteredSurface.tree).length === 0, 'U-D23. the row leaves the filtered set on reconcile');
  record(renderText(filteredSurface.tree).some((text) => /favoritos/i.test(text)),
    'U-D24. and the empty filtered state says what it is');
  filteredSurface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// U-E — THE SIGNAL
// ═══════════════════════════════════════════════════════════════════════════

async function testFavoriteSignal(): Promise<void> {
  console.log('\n=== U-E: one small marker, and the label says so ===');

  const household = new Household({ loose: 2, favorites: ['c-000'] });
  const surface = mountSurface(household);
  await surface.settle();

  const loved = renderFileTile(surface.tree, 'c-000');
  const hearts = findAll(loved, (element) => element.type === 'HomePlusIcon' && element.props?.name === 'heart');
  record(hearts.length === 1, 'U-E1. a favorite tile carries exactly one small heart marker');
  record(findOne(loved, (element) => element.type === 'View' && element.props?.accessible === false && findAll(element, (inner) => inner.type === 'HomePlusIcon' && inner.props?.name === 'heart').length === 1) !== null,
    'U-E2. and the marker is decorative for assistive technology — the label speaks, not the icon');
  const lovedBody = tileBody(surface.tree, 'c-000');
  record(typeof lovedBody?.props?.accessibilityLabel === 'string' && lovedBody.props.accessibilityLabel.includes(', favorito'),
    'U-E3. the tile label states the favorite status');

  const plain = renderFileTile(surface.tree, 'c-001');
  record(findAll(plain, (element) => element.type === 'HomePlusIcon' && element.props?.name === 'heart').length === 0,
    'U-E4. an unfavorited tile paints no marker at all');
  const plainBody = tileBody(surface.tree, 'c-001');
  record(typeof plainBody?.props?.accessibilityLabel === 'string' && !plainBody.props.accessibilityLabel.includes('favorito'),
    'U-E5. and its label claims nothing');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// U-F — SAVE / DOWNLOAD AGAINST THE REAL MODULE
// ═══════════════════════════════════════════════════════════════════════════

function resetNative(): void {
  nativeCalls.downloads = [];
  nativeCalls.createdDirs = [];
  nativeCalls.releases = 0;
  nativeCalls.shares = [];
  apiCalls.length = 0;
  nativeSharingAvailable = true;
  nativeShareBehaviour = 'resolve';
  nativeLocalFile = null;
  apiAccessResponse = null;
}

function installAccessFixture(name: string): void {
  apiAccessResponse = { signedUrl: `https://storage.local/signed/${name}?token=abc`, contentId: 'c-save', variant: 'original' };
  nativeLocalFile = { uri: `file:///cache/HomeCloud/${name}`, name, exists: true, size: 42 };
}

async function testSaveExportModule(): Promise<void> {
  console.log('\n=== U-F: the real transfer module stages, hands off, and never claims ===');

  // The REAL module, loaded past the screen's spy (see useRealDownloadService):
  // nothing here is re-implemented, so every assertion below is about
  // production behavior over a stubbed device.
  useRealDownloadService = true;
  const servicePath = compiled('services/homecloud/homecloudDownloadService');
  delete (require as unknown as { cache: Record<string, unknown> }).cache[require.resolve(servicePath)];
  const download = require(servicePath) as {
    stageHomeCloudOriginal: (token: string, content: { id: string; displayName: string; mimeType: string }) => Promise<{ uri: string; name: string; sizeBytes: number; mimeType: string }>;
    exportHomeCloudStagedCopy: (copy: { uri: string; name: string; sizeBytes: number; mimeType: string }) => Promise<void>;
    shareHomeCloudDownloadedFile: (copy: { uri: string; name: string; sizeBytes: number; mimeType: string }) => Promise<void>;
    HomeCloudDownloadError: new (stage: string, code: string, message: string) => Error & { stage: string; code: string };
  };
  useRealDownloadService = false;
  const content = { id: 'c-save', displayName: 'contrato.pdf', mimeType: 'application/pdf' };

  resetNative();
  installAccessFixture('contrato.pdf');
  const staged = await download.stageHomeCloudOriginal('tok', content);
  record(apiCalls.length === 1 && apiCalls[0]?.path.includes('/api/homecloud/content/c-save/access?variant=original'),
    'U-F1. staging asks the server for the SIGNED ORIGINAL, nothing else');
  record(nativeCalls.downloads.length === 1 && nativeCalls.downloads[0]?.uri === apiAccessResponse?.signedUrl,
    'U-F2. and the signed URL reaches the native transfer VERBATIM');
  record((nativeCalls.downloads[0]?.destinationUri ?? '').startsWith('file:///cache/'),
    'U-F3. staged into the TEMPORARY cache area — never into a place that looks like a saved library');
  record(!(nativeCalls.downloads[0]?.destinationUri ?? '').startsWith('file:///document/'),
    'U-F4. and specifically NOT into app-private Documents');
  record(nativeCalls.releases === 1, 'U-F5. native ownership is released after the terminal transfer');
  record(staged.uri === nativeLocalFile?.uri && staged.sizeBytes === 42 && staged.mimeType === 'application/pdf',
    'U-F6. the staged copy carries the validated bytes and the File\'s own type');

  const source = require('node:fs').readFileSync(frontSource('services/homecloud/homecloudDownloadService.ts'), 'utf8') as string;
  record(source.includes('File.createDownloadTask'), 'U-F7. the transfer stays a native file-to-file download');
  record(!/arrayBuffer\(|base64\(|\.text\(\)|readAsStringAsync/.test(source),
    'U-F8. with no whole-file JS heap fallback: the original bytes are never transcoded');
  record(!/Guardado como|Archivo descargado|Guardado en Archivos|Descargado/.test(source),
    'U-F9. and no wording in the module can present staging as a completed save');

  // GUARDAR UNA COPIA — the hand-off the OS owns from here.
  resetNative();
  installAccessFixture('contrato.pdf');
  const copy = await download.stageHomeCloudOriginal('tok', content);
  await download.exportHomeCloudStagedCopy(copy);
  record(nativeCalls.shares.length === 1 && nativeCalls.shares[0]?.uri === copy.uri,
    'U-F10. Guardar una copia opens the NATIVE system export UI with the staged original');
  record((nativeCalls.shares[0]?.options as { dialogTitle?: string })?.dialogTitle === 'Guardar una copia de contrato.pdf',
    'U-F11. framed as saving a copy — the iOS sheet is where Guardar en Archivos lives');
  record(!/Guardado en Archivos/.test(JSON.stringify(nativeCalls.shares)),
    'U-F12. while NOTHING records a destination or a result: the OS owns both');

  resetNative();
  installAccessFixture('contrato.pdf');
  const copy2 = await download.stageHomeCloudOriginal('tok', content);
  nativeShareBehaviour = 'reject';
  let exportFailure: { stage: string; code: string } | null = null;
  try {
    await download.exportHomeCloudStagedCopy(copy2);
  } catch (error) {
    exportFailure = error as { stage: string; code: string };
  }
  record(exportFailure?.stage === 'export' && exportFailure?.code === 'download_export_failed',
    'U-F13. a failed export hand-off is a TYPED export failure, not a save and not a silence');

  nativeSharingAvailable = false;
  let unavailable: { code: string } | null = null;
  try {
    await download.exportHomeCloudStagedCopy(copy2);
  } catch (error) {
    unavailable = error as { code: string };
  }
  record(unavailable?.code === 'download_export_unavailable',
    'U-F14. an unavailable export surface is named as such');

  // COMPARTIR — a separate intent over the same staged bytes.
  resetNative();
  installAccessFixture('contrato.pdf');
  const copy3 = await download.stageHomeCloudOriginal('tok', content);
  await download.shareHomeCloudDownloadedFile(copy3);
  record(nativeCalls.shares.length === 1 && nativeCalls.shares[0]?.uri === copy3.uri,
    'U-F15. Compartir hands the same staged original to the share sheet');
  record((nativeCalls.shares[0]?.options as { dialogTitle?: string; mimeType?: string })?.dialogTitle === 'Compartir contrato.pdf'
    && (nativeCalls.shares[0]?.options as { mimeType?: string })?.mimeType === 'application/pdf',
    'U-F16. framed as sending, with the File\'s own type for the target app');
  record((nativeCalls.shares[0]?.options as { dialogTitle?: string })?.dialogTitle !== 'Guardar una copia de contrato.pdf',
    'U-F17. and the two intents never share a framing');

  nativeShareBehaviour = 'reject';
  let shareFailure: { stage: string; code: string; message: string } | null = null;
  try {
    await download.shareHomeCloudDownloadedFile(copy3);
  } catch (error) {
    shareFailure = error as { stage: string; code: string; message: string };
  }
  record(shareFailure?.stage === 'share' && shareFailure?.code === 'download_share_failed'
    && !/Guardado|Descargado/i.test(shareFailure?.message ?? ''),
    'U-F18. a failed share is a typed share failure with no save wording anywhere near it');

  // Staging failures are preparation failures: the member is told the copy was
  // never ready, never that a save failed.
  resetNative();
  apiAccessResponse = { signedUrl: '', contentId: 'c-save', variant: 'original' };
  nativeLocalFile = { uri: 'file:///cache/HomeCloud/contrato.pdf', name: 'contrato.pdf', exists: true, size: 42 };
  let accessFailure: { stage: string } | null = null;
  try {
    await download.stageHomeCloudOriginal('tok', content);
  } catch (error) {
    accessFailure = error as { stage: string };
  }
  record(accessFailure?.stage === 'access', 'U-F19. a bad access answer fails at the access stage');

  resetNative();
  installAccessFixture('contrato.pdf');
  nativeLocalFile = { uri: 'file:///cache/HomeCloud/contrato.pdf', name: 'contrato.pdf', exists: false, size: 42 };
  let validationFailure: { stage: string; message: string } | null = null;
  try {
    await download.stageHomeCloudOriginal('tok', content);
  } catch (error) {
    validationFailure = error as { stage: string; message: string };
  }
  record(validationFailure?.stage === 'validation' && !/Guardado|Descargado/i.test(validationFailure?.message ?? ''),
    'U-F20. an invalid staged copy fails validation with preparation wording');

  // Dismissing the sheet is quiet: the primitive resolves and nothing claims.
  resetNative();
  installAccessFixture('contrato.pdf');
  const copy4 = await download.stageHomeCloudOriginal('tok', content);
  let dismissal: unknown = 'threw';
  try {
    dismissal = await download.exportHomeCloudStagedCopy(copy4);
  } catch { dismissal = 'threw'; }
  record(dismissal === undefined, 'U-F21. a dismissed sheet resolves quietly — cancellation is neither an error nor a success');
}

// ═══════════════════════════════════════════════════════════════════════════
// U-G — THE TWO INTENTS STAY SEPARATE ON THE SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function testTransferIntents(): void {
  console.log('\n=== U-G: Guardar una copia and Compartir are separate intents in source ===');

  const source = require('node:fs').readFileSync(frontSource('screens/HomeCloudFilesScreen.tsx'), 'utf8') as string;
  record(!source.includes('Descargar y compartir'), 'U-G1. the conjoined save-and-share intent is gone');
  const saveBody = source.slice(source.indexOf('const saveCopyOfFile'), source.indexOf('const shareFile'));
  const shareBody = source.slice(source.indexOf('const shareFile'), source.indexOf('const canAdd'));
  record(saveBody.includes('stageHomeCloudOriginal') && saveBody.includes('exportHomeCloudStagedCopy')
    && !saveBody.includes('shareHomeCloudDownloadedFile'),
    'U-G2. Guardar una copia stages the original and opens the native export UI — never the share path');
  record(shareBody.includes('stageHomeCloudOriginal') && shareBody.includes('shareHomeCloudDownloadedFile')
    && !shareBody.includes('exportHomeCloudStagedCopy'),
    'U-G3. Compartir stages the same original and opens the share sheet — never the export path');
  record(!source.includes('Guardado como') && !source.includes('Archivo descargado') && !source.includes('Descargando'),
    'U-G4. no wording presents an internal copy as a completed download');
  record(!source.includes('Guardado en Archivos'),
    'U-G5. and nothing claims the Files-app persistence only the OS can perform');
  record(saveBody.includes('Elegí "Guardar en Archivos" en el menú del sistema.'),
    'U-G6. the save hand-off states the choice the member must make instead');
}

// ═══════════════════════════════════════════════════════════════════════════
// U-H — REGRESSION: SELECTION AND THE HOST SURVIVE
// ═══════════════════════════════════════════════════════════════════════════

async function testRegressionSmoke(): Promise<void> {
  console.log('\n=== U-H: selection entry and the canonical host are untouched ===');

  const household = new Household({ loose: 2, favorites: ['c-000'] });
  const surface = mountSurface(household);
  await surface.settle();

// STAGE 2 (Phase 2) SUPERSESSION. Stage 1 used a long press to ENTER selection.
   // Stage 2 supersedes that outright: a long press now opens the contextual File
   // actions, and selection is entered only from the header overflow. The behavior
   // this block exists to protect - that the Favorite signal survives a Host
   // remount - is now proven through the surviving entry.
   const tile = fileTileElement(surface.tree, 'c-001');
   record(typeof tile?.props?.onLongPress === 'function', 'U-H1. a long press is available on the tile');
   const selectControl = findOne(surface.tree, (element) => element.props?.accessibilityLabel === 'Seleccionar archivos');
   (selectControl?.props?.onPress as (() => void) | undefined)?.();
   surface.render();
  const bar = findOne(surface.tree, (element) => element.type === selectionBar.FileSelectionBar);
  record(bar !== null, 'U-H2. and the selection bar appears');

  record(findAll(surface.tree, (element) => element.type === actionHost.FileActionHost).length === 1,
    'U-H3. exactly ONE canonical action host still serves a File');
  record(typeof actionHostElement(surface.tree)?.props?.onFavorite === 'function',
    'U-H4. and it now carries the Favorite dispatch beside the existing ones');
  surface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  testFavoriteGrammar();
  await testFavoriteHost();
  await testFavoritesFilter();
  await testPatchPrimitive();
  await testFavoriteMutationOnSurface();
  await testFavoriteSignal();
  await testSaveExportModule();
  testTransferIntents();
  await testRegressionSmoke();

  console.log(`\nHOMECLOUD_FILES_FAVORITES_UI_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
}

void main();
