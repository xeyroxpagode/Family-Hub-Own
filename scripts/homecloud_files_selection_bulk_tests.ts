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
 *  C. CANONICAL ACTIONS. The real grammar module and the real host: the five
 *     implemented actions, the three declared seams that are never rendered, and
 *     exactly ONE destination picker instance that both Move intents use.
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
};
reactStub.default = reactStub;
reactStub.Fragment = Symbol.for('react.fragment');

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
  // The Files surface subscribes to app foreground as a freshness boundary, so
  // the device primitive is part of what this host must provide. It is inert
  // here: no test in this file drives it.
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
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
  DatePickerSheet: 'DatePickerSheet',
  ErrorState: 'ErrorState',
  FormActionRow: 'FormActionRow',
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
  clearSelectedFiles: (previous: FileSelection) => FileSelection;
  pruneFileSelection: (previous: FileSelection, visible: Iterable<string>) => FileSelection;
  fileSelectionCount: (value: FileSelection) => number;
  isFileSelected: (value: FileSelection, id: string) => boolean;
  selectedFileIds: (value: FileSelection) => string[];
  fileSelectionSummary: (value: FileSelection) => string;
};
const bulkMove = require(compiled('services/homecloud/homecloudBulkMove')) as {
  bulkMoveFiles: (input: {
    contentIds: readonly string[];
    destinationFolderId: string | null;
    moveFile: (id: string, changes: { folderId: string | null }) => Promise<unknown>;
  }) => Promise<BulkMoveResult>;
  bulkMoveFeedback: (result: BulkMoveResult) => { tone: string; message: string };
  bulkMoveInFlight: (count: number) => { tone: string; message: string };
};
const grammar = require(compiled('services/homecloud/homecloudFileActions')) as {
  HOMECLOUD_FILE_ACTION_GRAMMAR: HomeCloudFileActionDefinition[];
  HOMECLOUD_FILE_ACTION_SEAMS: string[];
  resolveFileActions: (permissions: HomeCloudFileActionPermissions) => HomeCloudFileAction[];
};
const destinationPicker = require(compiled('services/homecloud/FileMoveDestinationPicker')) as {
  ROOT_DESTINATION_FOLDER_ID: string | null;
  ROOT_DESTINATION_LABEL: string;
  FileMoveDestinationPicker: (props: Record<string, unknown>) => unknown;
  fileMoveDestinations: (
    folders: { id: string; name: string }[],
    currentFolderId: string | null | undefined,
  ) => { folderId: string | null; label: string; isCurrent: boolean }[];
};
const selectionBar = require(compiled('services/homecloud/FileSelectionBar')) as {
  FileSelectionBar: (props: Record<string, unknown>) => unknown;
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

type Folder = { id: string; name: string };
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
    this.folders = [...(seed.folders ?? [])];
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

  fileReads(): Request[] {
    return this.requests.filter((entry) => entry.method === 'GET' && entry.pathname === '/api/homecloud/files');
  }

  /** Every request path that is not one the surface already used before this slice. */
  unknownPaths(): string[] {
    const known = new Set(['/api/homecloud/files', '/api/homecloud/folders', '/api/homecloud/capabilities']);
    return [...new Set(this.requests
      .map((entry) => entry.pathname)
      .filter((pathname) => !known.has(pathname) && !/^\/api\/homecloud\/content\/.+\/file$/.test(pathname)))];
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
function tileOverflow(tree: unknown, id: string): TestElement | null {
  const rendered = renderFileTile(tree, id);
  return rendered
    ? findOne(rendered, (element) => element.type === 'AppButton' && typeof element.props.accessibilityLabel === 'string'
      && element.props.accessibilityLabel.startsWith('Acciones de'))
    : null;
}

function selectionBarElement(tree: unknown): TestElement | null {
  return findOne(tree, (element) => element.type === selectionBar.FileSelectionBar);
}

function renderSelectionBar(tree: unknown): unknown {
  const element = selectionBarElement(tree);
  return element ? selectionBar.FileSelectionBar(element.props) : null;
}

function selectionSummary(tree: unknown): string {
  const bar = renderSelectionBar(tree);
  if (!bar) return '';
  return renderText(bar).find((text) => /seleccionado/.test(text)) ?? '';
}

const pickerElements = (tree: unknown): TestElement[] =>
  findAll(tree, (element) => element.type === destinationPicker.FileMoveDestinationPicker);

const pickerElement = (tree: unknown): TestElement | null => pickerElements(tree)[0] ?? null;

const actionHostElement = (tree: unknown): TestElement | null =>
  findOne(tree, (element) => element.type === actionHost.FileActionHost);

/** The stated outcome of a finished batch, read from the surface. */
function bannerText(tree: unknown): string {
  return renderText(tree).find((text) => /\d+ (movido|movidos|archivos? (movido|no))/i.test(text)) ?? '';
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

function pressSortToggle(tree: unknown): boolean {
  const control = findOne(tree, (element) => element.props?.title && element.props?.onPress && element.props?.accessibilityLabel === undefined);
  if (typeof control?.props.onPress !== 'function') return false;
  control.props.onPress();
  return true;
}

/** The manual refresh control: a same-context re-read, never a first-page reset. */
function pressRefreshControl(tree: unknown): boolean {
  const control = findOne(tree, (element) => element.props?.accessibilityLabel === 'Actualizar archivos');
  if (typeof control?.props.onPress !== 'function') return false;
  control.props.onPress();
  return true;
}

/** The discoverable entry: the labelled "Seleccionar" control in the title row. */
function pressSelectControl(tree: unknown): boolean {
  const control = findOne(tree, (element) => element.props?.accessibilityLabel === 'Seleccionar archivos');
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

const openTileActions = (tree: unknown, id: string): boolean => {
  const tile = fileTileElement(tree, id);
  if (typeof tile?.props?.onMore !== 'function') return false;
  tile.props.onMore();
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

/** Enter selection mode and pick `ids`, through the production gestures only. */
function selectFiles(surface: Mounted, ids: readonly string[]): void {
  selectByLongPress(surface.tree, ids[0]);
  surface.render();
  for (const id of ids.slice(1)) {
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

  // The reserved tap. Outside selection mode it must do NOTHING at all.
  const readsBefore = household.fileReads().length;
  record(tapFile(surface.tree, 'c-000'), 'B3. the File body is pressable');
  surface.render();
  await surface.settle();
  record(selectionBarElement(surface.tree) === null, 'B4. a plain tap does NOT enter selection mode');
  record(navigations.length === 0, 'B5. and does NOT navigate anywhere either (the Viewer is not implemented)');
  record(household.fileReads().length === readsBefore, 'B6. and it is not a read, a sort or a context change');
  record(!renderText(surface.tree).some((text) => /seleccionad/i.test(text)), 'B7. nothing on screen claims a selection happened');

  // The discoverable entry.
  record(pressSelectControl(surface.tree), 'B8. an explicit "Seleccionar" control is reachable — the gesture is not hidden');
  surface.render();
  record(selectionBarElement(surface.tree) !== null, 'B9. and it enters selection mode');
  record(pressSelectControl(surface.tree) === false, 'B10. the control is withdrawn while the mode is active (one bar, never two)');
  surface.render();

  // Long press on a File also enters, and selects the pressed File.
  record(selectByLongPress(surface.tree, 'c-001'), 'B11. a File long press is reachable');
  surface.render();
  record(selectionSummary(surface.tree) === '1 seleccionado', 'B12. the bar states the count the model holds');

  const bar = renderSelectionBar(surface.tree);
  record(findAll(bar, (element) => element.props?.title === 'Mover').length === 1, 'B13. and offers the ONE bulk action of this slice');
  record(findAll(bar, (element) => element.props?.title === 'Cancelar').length === 1, 'B14. plus a way out of selection mode');
  const moveButton = findOne(bar, (element) => element.props?.title === 'Mover');
  record(moveButton?.props?.accessibilityLabel === 'Mover 1 archivo seleccionado', 'B15. the bulk action says what it will act on');
  const cancelButton = findOne(bar, (element) => element.props?.title === 'Cancelar');
  record(cancelButton?.props?.accessibilityLabel === 'Salir de la selección', 'B16. and leaving is labelled, not just "Cancelar"');
  record(!renderText(bar).some((text) => /papelera/i.test(text)), 'B17. no Bulk Trash row is painted (Lifecycle is not implemented)');

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

  // Normal File action access is preserved, even inside selection mode.
  const overflow = tileOverflow(surface.tree, 'c-001');
  record(overflow?.props?.accessibilityLabel === 'Acciones de file-001.txt', 'B28. the overflow entry point has a meaningful accessibility label');
  record(openTileActions(surface.tree, 'c-001'), 'B29. the overflow still opens the canonical actions inside selection mode');
  surface.render();
  record(actionHostElement(surface.tree)?.props?.file?.id === 'c-001', 'B30. and it targets the pressed File, not the selection');

  // Leaving selection mode.
  findOne(renderSelectionBar(surface.tree), (element) => element.props?.title === 'Cancelar')?.props.onPress();
  surface.render();
  record(selectionBarElement(surface.tree) === null, 'B31. leaving selection mode removes the bar and the selection');
  record(tileBody(surface.tree, 'c-001')?.props?.accessibilityRole === 'button', 'B32. and a File is a plain control again outside selection mode');
  record(tileBody(surface.tree, 'c-001')?.props?.accessibilityState?.selected === undefined, 'B33. with no stale selected state left behind');
  surface.unmount();
}

async function testSelectionScope(): Promise<void> {
  console.log('\n=== B2: selection is scoped to the current browser context ===');

  const household = new Household({ folders: [{ id: 'ff-viajes', name: 'Viajes' }], loose: 4, inFolder: { 'ff-viajes': 2 } });
  const surface = mountSurface(household);
  await surface.settle();

  selectFiles(surface, ['c-000', 'c-001']);
  record(selectionSummary(surface.tree) === '2 seleccionados', 'B34. two Files are selected');

  // A same-context re-read that keeps every row must keep the selection.
  const readsBefore = household.fileReads().length;
  record(pressRefreshControl(surface.tree), 'B35. a same-context refresh is reachable');
  await surface.settle();
  record(household.fileReads().length === readsBefore + 1, 'B36. it really re-read the context');
  record(selectionSummary(surface.tree) === '2 seleccionados', 'B37. a reconciliation that keeps the rows keeps the selection');

  // FOLDER CHANGE clears. The scope effect runs after the commit that changed the
  // context, so the clearing is observed once the surface has settled.
  record(pressFolder(surface.tree, 'ff-viajes'), 'B38. a folder tile is reachable');
  await surface.settle();
  record(selectionBarElement(surface.tree) === null, 'B39. a FOLDER change clears the selection — no cross-folder selection');

  // SORT CHANGE clears.
  selectFiles(surface, ['in-ff-viajes-0', 'in-ff-viajes-1']);
  record(selectionSummary(surface.tree) === '2 seleccionados', 'B40. selected again inside the folder');
  record(pressSortToggle(surface.tree), 'B41. the sort control is reachable');
  await surface.settle();
  record(selectionBarElement(surface.tree) === null, 'B42. a SORT change clears the selection');

  // QUERY CHANGE clears.
  selectFiles(surface, ['in-ff-viajes-0']);
  record(selectionBarElement(surface.tree) !== null, 'B43. selected again');
  record(typeSearch(surface.tree, 'in-ff-viajes'), 'B44. the search field is reachable');
  await surface.settle();
  record(selectionBarElement(surface.tree) === null, 'B45. a QUERY change clears the selection');

  // HOUSEHOLD CHANGE clears.
  record(typeSearch(surface.tree, ''), 'B46. the query can be emptied');
  await surface.settle();
  selectFiles(surface, ['in-ff-viajes-0']);
  record(selectionBarElement(surface.tree) !== null, 'B47. selected once more');
  new Household({ loose: 2 }).install();
  householdState = { currentHousehold: { id: 'hh-other', name: 'Otra' } };
  surface.render();
  await surface.settle();
  record(selectionBarElement(surface.tree) === null, 'B48. a HOUSEHOLD change clears the selection — selection never crosses households');
  surface.unmount();

  // A PRUNE driven by the household: a selected File a re-read no longer shows
  // stops being selected.
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
  record(selectionSummary(pruneSurface.tree) === '2 seleccionados', 'B52. the vanished id was PRUNED, not left stale');
  pruneSurface.unmount();
}

// ═══════════════════════════════════════════════════════════════════════════
// C — THE CANONICAL FILE ACTION HOST
// ═══════════════════════════════════════════════════════════════════════════

function testActionGrammar(): void {
  console.log('\n=== C1: the canonical File action grammar ===');

  const implemented = grammar.resolveFileActions({ view: true, organize: true, delete: true });
  record(implemented.map((action) => action.id).join(',') === 'info,rename,move,download,share,favorite',
    'C1. the grammar is exactly Información, Renombrar, Mover, Guardar una copia, Compartir, Favorito');
  record(implemented.map((action) => action.label).join(',') === 'Información,Renombrar,Mover,Guardar una copia,Compartir,Agregar a favoritos',
    'C2. with the canonical labels, in canonical order');
  record(grammar.HOMECLOUD_FILE_ACTION_SEAMS.join(',') === 'open,trash',
    'C3. Abrir and Mover a la papelera are DECLARED extension seams');
  record(!implemented.some((action) => ['open', 'trash'].includes(action.id)),
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
  for (const label of ['Información', 'Renombrar', 'Mover', 'Guardar una copia', 'Compartir', 'Agregar a favoritos']) {
    record(findAll(renderedHost, (element) => element.props?.title === label).length === 1, `C19. the host offers ${label} exactly once`);
  }
  record(!hostRows.some((text) => /^(Abrir|Mover a la papelera)$/.test(text)), 'C20. and paints no row for a declared seam');
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
  selectionBarElement(surface.tree)?.props.onMove();
  surface.render();
  const forBulk = pickerElement(surface.tree);
  record(forBulk?.props?.visible === true, 'C30. the selection\'s Move opens the SAME picker');
  record(forBulk?.props?.title === 'Mover 2 archivos', 'C31. titled for the batch it is about to act on');
  record(forBulk?.props?.folders === forFile?.props?.folders, 'C32. and both read the same destination catalogue');
  forBulk?.props.onClose();
  surface.render();
  record(pickerElement(surface.tree)?.props?.visible === false, 'C33. closing the picker moves nothing');
  record(household.moveCalls.length === beforeFileMove + 1, 'C34. and really moved nothing');

  // The destination vocabulary itself.
  const folders = [{ id: 'ff-viajes', name: 'Viajes' }, { id: 'ff-recetas', name: 'Recetas' }];
  const destinations = destinationPicker.fileMoveDestinations(folders, null);
  record(destinationPicker.ROOT_DESTINATION_FOLDER_ID === null, 'C35. root is expressed as null, exactly as the backend stores it');
  record(destinations[0].label === destinationPicker.ROOT_DESTINATION_LABEL, 'C36. and it is offered as "Archivos"');
  record(destinations.map((entry) => entry.label).join(',') === 'Archivos,Viajes,Recetas', 'C37. every household folder is offered too');
  record(destinationPicker.fileMoveDestinations(folders, undefined).every((entry) => !entry.isCurrent),
    'C38. a mixed selection marks NO destination as current rather than lying about root');
  record(destinationPicker.fileMoveDestinations(folders, 'ff-viajes').filter((entry) => entry.isCurrent).length === 1,
    'C39. and a selection that does share one folder marks exactly that one');

  // The rendered picker states each destination with a meaningful label.
  const renderedPicker = destinationPicker.FileMoveDestinationPicker({
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
  selectionBarElement(surface.tree)?.props.onMove();
  surface.render();
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
  record(household.fileReads().length === readsBefore + 1, 'D1h. the batch reconciled EXACTLY ONCE, not once per PATCH');
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
  record(household.fileReads().length === readsBefore + 1, 'D2d. the batch still reconciled EXACTLY ONCE');
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
  record(household.fileReads().length === readsBefore + 1, 'the batch reconciled once, not four times');
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
  record(household.fileReads().length === readsBefore + 1, 'the batch reconciled EXACTLY ONCE');
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
  record(household.fileReads().length === readsBefore + 1, 'the batch reconciled EXACTLY ONCE');
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

  console.log(`\nHOMECLOUD_FILES_SLICE1_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) process.exit(1);
}

void main();
