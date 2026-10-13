/**
 * HomeCloud Files — LIFECYCLE V1 PAPELERA UI (deterministic, compiled).
 *
 * Drives the REAL compiled frontend: the action grammar, the canonical
 * FileActionHost, the real trash client service, the real Papelera screen and
 * the real Files surface, over a hook host and a transport that mirrors the
 * backend lifecycle contracts exactly (including the purge confirmation
 * refusal). NOTHING HomeCloud-owned is faked; the host supplies only what a
 * device supplies.
 *
 * The load-bearing product claims proved here:
 *
 *   A. GRAMMAR   `Mover a la papelera` is real: implemented, danger, gated by
 *                `delete`; `Abrir` is the only remaining seam.
 *   B. HOST      the trash row renders when granted, is disabled when the
 *                member lacks `delete`, dispatches onTrash, and its own busy
 *                state never freezes the other rows.
 *   C. SERVICE   the client speaks the exact backend contract: trash/restore
 *                POSTs, the Papelera GET, and a purge that can ONLY ever be
 *                sent with confirm: true.
 *   D. PAPELERA  loading skeleton, honest error + Reintentar, the empty state,
 *                rows, the detail sheet, Restore (no confirmation dialog: it
 *                IS the recovery), the TWO-VIEW destructive confirmation for
 *                Purge (no purge request before the explicit confirm), inline
 *                action refusals, capability boundary, pull-to-refresh and
 *                has-more pagination.
 *   E. FILES     the overflow offers the Papelera ONLY with homecloud.delete,
 *                navigates to it, and trashing a File from the action sheet
 *                issues the POST and reconciles through the SAME window-
 *                preserving read, with selection and pagination untouched.
 */

import * as path from 'node:path';

import type {
  HomeCloudFileAction,
  HomeCloudFileActionDefinition,
  HomeCloudFileActionPermissions,
} from '../front/mi-front-limpio/services/homecloud/homecloudFileActions';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

// The transport stub is a fetch override; the API client still needs its base
// URL env, exactly like every compiled suite that drives requestJson.
process.env.EXPO_PUBLIC_API_URL = 'http://hh-trash.test';

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
    if (renders > MAX_RENDERS) throw new Error('Trash UI: the surface never stopped re-rendering');
    cursor = 0;
    lastTree = view();
    return lastTree;
  };

  const host: FullHost = {
    useRef,
    useState,
    useMemo,
    useCallback,
    useEffect,
    createElement: (type, props, ...children) => ({
      type,
      props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children },
    }),
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
          if (guard > 80) throw new Error('Trash UI: a single settle never converged');
          render(view);
          commit();
        }
      }
    },
  };
  return host;
}

// ── what a device would provide ──────────────────────────────────────────────

let activeHost: FullHost | null = null;
let authState: { session: { access_token: string; user: { id: string } } | null } = { session: null };
let householdState: { currentHousehold: { id: string; name: string } | null } = { currentHousehold: null };
let navigations: unknown[][] = [];

const hostModules = (): FullHost => {
  if (!activeHost) throw new Error('Trash UI: no host is mounted');
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

const panResponderStub = {
  create: (config: Record<string, (...args: never[]) => unknown>) => {
    const handlers: Record<string, unknown> = {};
    for (const [key, handler] of Object.entries(config)) {
      handlers[key] = (...args: never[]) => (handler as (...a: never[]) => unknown)(...args);
    }
    return { panHandlers: handlers };
  },
};

const reactNativeStub = {
  Platform: { OS: 'web', select: (values: Record<string, unknown>) => values.web ?? values.default },
  View: 'View',
  Text: 'Text',
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  RefreshControl: 'RefreshControl',
  Pressable: 'Pressable',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Keyboard: { dismiss: () => undefined },
  StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  PanResponder: panResponderStub,
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
  DatePickerSheet: 'DatePickerSheet',
  ErrorState: 'ErrorState',
  EmptyState: 'EmptyState',
  Skeleton: 'Skeleton',
  FormActionRow: 'FormActionRow',
  InteractivePressable: 'InteractivePressable',
};
const iconsStub = { HomePlusIcon: 'HomePlusIcon' };
const downloadStub = {
  downloadHomeCloudOriginal: async () => ({ localUri: 'file:///x', name: 'x', sizeBytes: 1, mimeType: 'text/plain' }),
  stageHomeCloudOriginal: async (_t: string, content: { id: string; displayName: string; mimeType: string }) => ({ uri: `file:///x/${content.displayName}`, name: content.displayName, sizeBytes: 1, mimeType: content.mimeType }),
  exportHomeCloudStagedCopy: async () => undefined,
  shareHomeCloudDownloadedFile: async () => undefined,
  HomeCloudDownloadError: class HomeCloudDownloadError extends Error {},
};

const nativeFileSystem = {
  documentDirectory: 'file:///trash-docs/',
  FileSystemUploadType: { BINARY_CONTENT: 1, UPLOAD_AS_FILES: 0 },
  FileSystemSessionType: { BACKGROUND: 0, FOREGROUND: 1 },
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: async () => ({ exists: true, size: 128, modificationTime: 0, isDirectory: false, uri: 'file:///x' }),
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
  // The repo's canonical native stubs (tests/stubs): the compiled Files screen
  // transitively pulls the File Viewer, whose native deps a device-less run
  // cannot have. Same stubs every compiled suite that mounts these surfaces
  // is expected to read through.
  const byRequest: [string, unknown][] = [
    ['react', reactStub],
    ['react-native', reactNativeStub],
    ['@react-navigation/native', navigationStub],
    ['expo-file-system/legacy', nativeFileSystem],
    ['expo-document-picker', { getDocumentAsync: async () => ({ canceled: true, assets: null }) }],
    ['react-native-safe-area-context', require('../../../tests/stubs/react-native-safe-area-context')],
    ['expo-audio', require('../../../tests/stubs/expo-audio')],
    ['expo-file-system', require('../../../tests/stubs/expo-file-system')],
    ['expo-video', require('../../../tests/stubs/expo-video')],
    ['react-native-webview', require('../../../tests/stubs/react-native-webview')],
    ['expo-sharing', require('../../../tests/stubs/expo-sharing')],
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

const { plannerCache } = require('../front/mi-front-limpio/services/planner/plannerCache') as {
  plannerCache: { __testOnly_clearAll: () => void };
};
const { __resetHomeCloudReadReconciliationForTests } =
  require('../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation') as {
    __resetHomeCloudReadReconciliationForTests: () => void;
  };

const grammar = require(compiled('services/homecloud/homecloudFileActions')) as {
  HOMECLOUD_FILE_ACTION_GRAMMAR: HomeCloudFileActionDefinition[];
  HOMECLOUD_FILE_ACTION_SEAMS: string[];
  FILE_ACTION_RENDERED_ROW_COUNT: number;
  resolveFileActions: (permissions: HomeCloudFileActionPermissions) => HomeCloudFileAction[];
};
const actionHost = require(compiled('services/homecloud/FileActionHost')) as {
  FileActionHost: (props: Record<string, unknown>) => unknown;
};
const trashService = require(compiled('services/homecloud/homecloudTrashService')) as {
  fetchHomeCloudFilesTrash: (token: string, options: { limit?: number; offset?: number }) => Promise<unknown>;
  trashHomeCloudFile: (token: string, contentId: string) => Promise<unknown>;
  restoreHomeCloudFile: (token: string, contentId: string) => Promise<unknown>;
  purgeHomeCloudFile: (token: string, contentId: string) => Promise<unknown>;
  FILES_TRASH_MAX_LIMIT: number;
};
const trashScreen = require(compiled('screens/HomeCloudFilesTrashScreen')) as {
  HomeCloudFilesTrashScreen: () => unknown;
};
const filesScreen = require(compiled('screens/HomeCloudFilesScreen')) as {
  HomeCloudFilesView: (props: Record<string, unknown>) => unknown;
  FileTile: (props: Record<string, unknown>) => unknown;
};

// ── transport: the REAL backend lifecycle contracts ─────────────────────────

const HOUSEHOLD_ID = 'hh-trash';
const MEMBER_ID = 'mm-trash';

type Request = { method: string; pathname: string; body: unknown };
type Refusal = { status: number; code: string; message?: string };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

type TrashRow = {
  id: string;
  displayName: string;
  folderId: string | null;
  trashedAt: string;
  purging?: boolean;
};

/**
 * A household over the EXISTING Files endpoints plus the lifecycle endpoints.
 * The purge route MIRRORS the backend: a body without `confirm: true` is
 * refused with `homecloud_purge_confirmation_required` BEFORE any state
 * change — so the test can prove the UI never even tries a confirmation-less
 * purge, and that the transport would refuse one if it did.
 */
class Household {
  active: { id: string; displayName: string; folderId: string | null }[] = [];
  trashed: TrashRow[] = [];
  readonly requests: Request[] = [];
  capabilities = { view: true, contribute: true, organize: true, delete: true };
  trashRefusals = new Map<string, Refusal>();
  trashReadError: string | null = null;

  constructor(seed: { loose?: number; trashed?: number } = {}) {
    for (let index = 0; index < (seed.loose ?? 0); index += 1) {
      this.active.push({ id: `c-${index}`, displayName: `file-${index}.txt`, folderId: null });
    }
    for (let index = 0; index < (seed.trashed ?? 0); index += 1) {
      this.trashed.push({
        id: `t-${index}`,
        displayName: `papelera-${index}.txt`,
        folderId: null,
        trashedAt: `2026-10-0${(index % 9) + 1}T10:00:00.000Z`,
      });
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

      if (target.pathname === '/api/homecloud/capabilities') {
        return json(200, {
          capabilities: {
            'homecloud.view': this.capabilities.view,
            'homecloud.contribute': this.capabilities.contribute,
            'homecloud.organize': this.capabilities.organize,
            'homecloud.delete': this.capabilities.delete,
          },
          membershipId: MEMBER_ID,
          householdId: HOUSEHOLD_ID,
          role: 'adult',
        });
      }
      if (target.pathname === '/api/homecloud/folders') {
        return json(200, { folders: [] });
      }
      if (target.pathname === '/api/homecloud/files') {
        return json(200, { browser: this.browse(target.searchParams) });
      }
      if (target.pathname === '/api/homecloud/files/trash' && method === 'GET') {
        if (this.trashReadError) return json(500, { error: 'Error interno.', code: 'internal_error' });
        return json(200, { trash: this.trashPage(target.searchParams) });
      }
      const lifecycle = /^\/api\/homecloud\/content\/([^/]+)\/(trash|restore|purge)$/.exec(target.pathname);
      if (lifecycle && method === 'POST') {
        const [, contentId, action] = lifecycle;
        const refusal = this.trashRefusals.get(`${action}:${contentId}`);
        if (refusal) return json(refusal.status, { error: refusal.message ?? 'No disponible.', code: refusal.code });
        if (action === 'trash') {
          const index = this.active.findIndex((row) => row.id === contentId);
          if (index === -1) return json(404, { error: 'Contenido no encontrado.', code: 'homecloud_content_not_found' });
          const [row] = this.active.splice(index, 1);
          this.trashed.unshift({ id: row.id, displayName: row.displayName, folderId: row.folderId, trashedAt: new Date().toISOString() });
          return json(200, { file: { id: row.id } });
        }
        if (action === 'restore') {
          const index = this.trashed.findIndex((row) => row.id === contentId);
          if (index === -1) return json(404, { error: 'Contenido no encontrado.', code: 'homecloud_content_not_found' });
          const [row] = this.trashed.splice(index, 1);
          this.active.unshift({ id: row.id, displayName: row.displayName, folderId: row.folderId });
          return json(200, { file: { id: row.id } });
        }
        // PURGE: the backend confirmation contract, mirrored exactly.
        if ((body as { confirm?: unknown } | null)?.confirm !== true) {
          return json(400, { error: 'La eliminación definitiva requiere confirmación explícita.', code: 'homecloud_purge_confirmation_required' });
        }
        const index = this.trashed.findIndex((row) => row.id === contentId);
        if (index === -1) return json(404, { error: 'Contenido no encontrado.', code: 'homecloud_content_not_found' });
        this.trashed.splice(index, 1);
        return json(200, { purge: { contentId, operationId: `op-${contentId}`, status: 'pending' } });
      }
      return json(404, { code: 'not_found', message: `no route for ${method} ${target.pathname}` });
    }) as typeof fetch;
  }

  browse(params: URLSearchParams): unknown {
    const pageLimit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 100);
    const pageOffset = Math.max(Number(params.get('offset')) || 0, 0);
    const matched = [...this.active].sort((a, b) => (a.id < b.id ? 1 : -1));
    const window = matched.slice(pageOffset, pageOffset + pageLimit + 1);
    const hasMore = window.length > pageLimit;
    const page = hasMore ? window.slice(0, pageLimit) : window;
    return {
      folders: [],
      files: page.map((row) => ({ ...this.present(row), isFavorite: false })),
      nextOffset: hasMore ? pageOffset + pageLimit : null,
    };
  }

  trashPage(params: URLSearchParams): unknown {
    const pageLimit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 100);
    const pageOffset = Math.max(Number(params.get('offset')) || 0, 0);
    const matched = this.trashed.filter((row) => !row.purging);
    const window = matched.slice(pageOffset, pageOffset + pageLimit + 1);
    const hasMore = window.length > pageLimit;
    const page = hasMore ? window.slice(0, pageLimit) : window;
    return {
      files: page.map((row) => ({
        id: row.id,
        householdId: HOUSEHOLD_ID,
        role: 'file',
        displayName: row.displayName,
        mimeType: 'text/plain',
        sizeBytes: 10,
        folderId: row.folderId,
        documentDate: null,
        note: null,
        isFavorite: false,
        hasPreview: false,
        uploadedAt: '2026-01-01T00:00:00.000Z',
        trashedAt: row.trashedAt,
        trashedByMemberId: MEMBER_ID,
      })),
      nextOffset: hasMore ? pageOffset + pageLimit : null,
    };
  }

  present(row: { id: string; displayName: string; folderId: string | null }): Record<string, unknown> {
    return {
      id: row.id,
      householdId: HOUSEHOLD_ID,
      role: 'file',
      displayName: row.displayName,
      mimeType: 'text/plain',
      sizeBytes: 10,
      folderId: row.folderId,
      note: null,
      documentDate: null,
      hasPreview: false,
      uploadedAt: '2026-01-01T00:00:00.000Z',
    };
  }

  reads(pathname: string): Request[] {
    return this.requests.filter((entry) => entry.pathname === pathname);
  }

  lifecycleCalls(action: string): Request[] {
    return this.requests.filter((entry) => entry.method === 'POST' && entry.pathname.endsWith(`/${action}`));
  }
}

// ── tree helpers ──────────────────────────────────────────────────────────────

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
    if (Array.isArray(node)) { for (const item of node) collect(item); }
  };
  walk(tree, (element) => collect(element.props?.children));
  return out;
}

function buttonByTitle(tree: unknown, title: string): TestElement | null {
  return findOne(tree, (element) => element.type === 'AppButton' && element.props?.title === title);
}

type ListProps = { data: { id: string; displayName?: string }[]; renderItem: (input: { item: unknown; index: number }) => unknown };

function listOf(tree: unknown): TestElement | null {
  return findOne(tree, (element) => element.type === 'FlatList');
}

function listedTrashIds(tree: unknown): string[] {
  const list = listOf(tree);
  if (!list) return [];
  return (list.props as ListProps).data.map((item) => item.id);
}

/**
 * A FlatList renders its rows LAZILY through `renderItem`, so a tree walker
 * never sees them. Materializing each row through the REAL renderItem is what
 * lets the assertions run against what the surface would actually paint —
 * the same rule the slice-1 suite applies to File tiles.
 */
function renderedTrashRows(tree: unknown): TestElement[] {
  const list = listOf(tree);
  if (!list) return [];
  const props = list.props as { data: unknown[]; renderItem: (input: { item: unknown; index: number }) => unknown };
  return props.data.map((item, index) => props.renderItem({ item, index }) as TestElement);
}

/** The pressable body of one materialized Papelera row. */
function trashRowBody(row: TestElement): TestElement {
  if (row.type === 'InteractivePressable' && typeof row.props?.onPress === 'function') return row;
  const inner = findOne(row, (element) => element.type === 'InteractivePressable' && typeof element.props?.onPress === 'function');
  if (!inner) throw new Error('the Papelera row has no pressable body');
  return inner;
}

/**
 * The pressable body of one File tile of the FILES browser: materialize the
 * lazy renderItem output, render it through the REAL `FileTile`, then take
 * its long-pressable AppButton — the exact chain the slice-1 suite uses.
 */
function filesTileBody(tree: unknown, fileId: string): TestElement {
  const list = findOne(tree, (element) => element.type === 'FlatList');
  if (!list) throw new Error('the Files surface has no list');
  const props = list.props as { data: { kind: string; value: { id: string } }[]; renderItem: (input: { item: unknown; index: number }) => unknown };
  const index = props.data.findIndex((item) => item.kind === 'file' && item.value.id === fileId);
  if (index === -1) throw new Error(`the Files surface has no tile for ${fileId}`);
  const tileElement = props.renderItem({ item: props.data[index], index }) as TestElement;
  const rendered = filesScreen.FileTile(tileElement.props) as unknown;
  const body = findOne(rendered, (element) => element.type === 'AppButton' && typeof element.props?.onLongPress === 'function');
  if (!body) throw new Error('the File tile has no long-pressable body');
  return body;
}

/** Mount helper: one host, one view function, settled tree accessor. */
type Mounted = {
  tree: () => unknown;
  render: () => void;
  settle: (rounds?: number) => Promise<void>;
  unmount: () => void;
  press: (element: TestElement) => void;
};

function mount(view: () => unknown): Mounted {
  activeHost = createHookHost();
  const host = activeHost;
  host.__render(view);
  host.__commit();
  return {
    tree: () => host.__lastTree(),
    render: () => { host.__render(view); host.__commit(); },
    settle: (rounds = 4) => host.__settle(view, rounds, 10),
    unmount: () => host.__unmount(),
    press: (element: TestElement) => {
      const handler = element.props?.onPress;
      if (typeof handler !== 'function') throw new Error('the pressed element has no onPress');
      handler();
    },
  };
}

function resetWorld(): void {
  plannerCache.__testOnly_clearAll();
  __resetHomeCloudReadReconciliationForTests();
  navigations = [];
}

// ── the suite ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n=== HOMECLOUD FILES: LIFECYCLE V1 PAPELERA UI (deterministic) ===\n');

  // ── A. GRAMMAR ────────────────────────────────────────────────────────────
  console.log('--- A. the canonical action grammar ---');
  const trashAction = grammar.HOMECLOUD_FILE_ACTION_GRAMMAR.find((action) => action.id === 'trash');
  record(trashAction !== undefined, 'A1. `trash` is declared in the canonical grammar');
  record(trashAction?.implemented === true, 'A2. `trash` is IMPLEMENTED (no longer a seam)');
  record(trashAction?.requires === 'delete', 'A3. `trash` requires homecloud.delete');
  record(trashAction?.intent === 'danger', 'A4. `trash` is the grammar\'s danger row');
  const granted = grammar.resolveFileActions({ view: true, organize: true, delete: true });
  const denied = grammar.resolveFileActions({ view: true, organize: true, delete: false });
  const grantedTrash = granted.find((action) => action.id === 'trash');
  const deniedTrash = denied.find((action) => action.id === 'trash');
  record(grantedTrash?.available === true, 'A5. a member with delete gets the trash row AVAILABLE');
  record(deniedTrash?.available === false, 'A6. a member without delete gets the row DISABLED, never hidden (deny-safe)');
  record(grammar.HOMECLOUD_FILE_ACTION_SEAMS.join(',') === 'open', 'A7. `Abrir` is the only remaining seam');
  record(grammar.FILE_ACTION_RENDERED_ROW_COUNT === 7, 'A8. the grammar renders SEVEN rows now');

  // ── B. HOST ────────────────────────────────────────────────────────────────
  console.log('\n--- B. the canonical FileActionHost ---');
  {
    activeHost = createHookHost();
    const file = { id: 'c-1', displayName: 'poliza.txt', mimeType: 'text/plain', folderId: null, note: null, documentDate: null, isFavorite: false };
    const host = activeHost;
    let trashCalls = 0;
    const view = () => actionHost.FileActionHost({
      file,
      folders: [],
      permissions: { view: true, organize: true, delete: true },
      saving: false,
      trashBusy: false,
      actionError: null,
      downloadFeedback: null,
      onClose: () => undefined,
      onSave: () => undefined,
      onMoveRequest: () => undefined,
      onFavorite: () => undefined,
      onTrash: () => { trashCalls += 1; },
      onDownload: () => undefined,
      onShare: () => undefined,
    });
    let tree = host.__render(view);
    host.__commit();
    const trashButton = findOne(tree, (element) => element.type === 'AppButton' && element.props?.title === 'Mover a la papelera');
    record(trashButton !== null, 'B1. the host renders `Mover a la papelera`');
    record(trashButton?.props?.variant === 'danger', 'B2. the trash row is the DANGER variant');
    if (trashButton) (trashButton.props.onPress as () => void)();
    record(trashCalls === 1, 'B3. pressing the row dispatches onTrash exactly once');
    tree = host.__lastTree();

    // trashBusy must busy ONLY its own row: every other row stays enabled.
    let busyTree = host.__render(() => actionHost.FileActionHost({
      file,
      folders: [],
      permissions: { view: true, organize: true, delete: true },
      saving: false,
      trashBusy: true,
      actionError: null,
      downloadFeedback: null,
      onClose: () => undefined,
      onSave: () => undefined,
      onMoveRequest: () => undefined,
      onFavorite: () => undefined,
      onTrash: () => { trashCalls += 1; },
      onDownload: () => undefined,
      onShare: () => undefined,
    }));
    host.__commit();
    const busyTrash = findOne(busyTree, (element) => element.type === 'AppButton' && element.props?.title === 'Mover a la papelera');
    const favoriteWhileTrashBusy = findOne(busyTree, (element) => element.type === 'AppButton' && element.props?.title === 'Agregar a favoritos');
    record(busyTrash?.props?.disabled === true && busyTrash?.props?.loading === true, 'B4. trashBusy disables and loads ONLY the trash row');
    record(favoriteWhileTrashBusy?.props?.disabled === false, 'B5. the Favorite row is NOT frozen by a trash in flight');
    host.__unmount();
  }

  // ── C. SERVICE ─────────────────────────────────────────────────────────────
  console.log('\n--- C. the trash client service speaks the backend contract ---');
  {
    const household = new Household({ loose: 1, trashed: 2 });
    household.install();
    await trashService.fetchHomeCloudFilesTrash('token', { limit: 100, offset: 0 });
    await trashService.trashHomeCloudFile('token', 'c-0');
    await trashService.restoreHomeCloudFile('token', 't-0');
    await trashService.purgeHomeCloudFile('token', 't-1');
    const trashRead = household.reads('/api/homecloud/files/trash');
    record(trashRead.length === 1 && trashRead[0].method === 'GET', 'C1. the Papelera listing is ONE GET of /files/trash');
    const trashPost = household.lifecycleCalls('trash');
    record(trashPost.length === 1 && trashPost[0].pathname === '/api/homecloud/content/c-0/trash', 'C2. trash POSTs /content/:id/trash');
    const restorePost = household.lifecycleCalls('restore');
    record(restorePost.length === 1 && restorePost[0].pathname === '/api/homecloud/content/t-0/restore', 'C3. restore POSTs /content/:id/restore');
    const purgePost = household.lifecycleCalls('purge');
    record(purgePost.length === 1 && purgePost[0].pathname === '/api/homecloud/content/t-1/purge', 'C4. purge POSTs /content/:id/purge');
    record((purgePost[0].body as { confirm?: boolean })?.confirm === true, 'C4b. and the purge body carried confirm: true');
    record(trashService.FILES_TRASH_MAX_LIMIT === 100, 'C5. the client page size is the backend maximum (100)');
  }

  // ── D. THE PAPELERA SCREEN ────────────────────────────────────────────────
  console.log('\n--- D. the Papelera surface ---');
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      // useHomeCloudCapabilities resolves the capability scope from the
      // authenticated member, so the stub must provide what the app gets from
      // /api/auth/me: the person and the active membership.
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const household = new Household({ trashed: 3 });
    household.install();

    const surface = mount(() => trashScreen.HomeCloudFilesTrashScreen());
    await surface.settle();
    let tree = surface.tree();
    let listed = listedTrashIds(tree);
    record(listed.length === 3, `D1. the Papelera lists the three trashed Files (got ${listed.length})`);
    const rowTexts = renderedTrashRows(tree).map((row) => renderText(row).join(' ')).join(' ');
    record(rowTexts.includes('En papelera desde'), 'D2. each row states WHEN it was trashed');

    // The detail sheet: Restore needs NO confirmation (it is the recovery).
    const rows = renderedTrashRows(tree).map((row) => trashRowBody(row));
    surface.press(rows[0]);
    await surface.settle();
    tree = surface.tree();
    let sheet = findOne(tree, (element) => element.type === 'ActionSheet');
    record(sheet !== null, 'D3. tapping a row opens the detail sheet');
    record(sheet?.props?.title === 'papelera-0.txt', 'D4. the sheet is about the tapped File');
    const restoreButton = buttonByTitle(tree, 'Restaurar');
    const purgeEntry = buttonByTitle(tree, 'Eliminar definitivamente');
    record(restoreButton !== null, 'D5. Restore is offered directly, with NO confirmation dialog (it IS the recovery)');
    record(purgeEntry !== null, 'D6. Purge is offered from the detail view');

    // RESTORE: one POST, then the re-read removes the row.
    const restoreRequestsBefore = household.lifecycleCalls('restore').length;
    surface.press(restoreButton!);
    await surface.settle(6);
    record(household.lifecycleCalls('restore').length === restoreRequestsBefore + 1, 'D7. Restore issued exactly ONE POST /restore');
    record(household.reads('/api/homecloud/files/trash').length >= 2, 'D8. the surface re-read the Papelera after restoring');
    tree = surface.tree();
    listed = listedTrashIds(tree);
    record(!listed.includes('t-0'), 'D9. the restored File is gone from the listing');

    // PURGE: the destructive confirmation is a second view, and NO purge
    // request exists before the explicit confirm.
    const rowsAfterRestore = renderedTrashRows(surface.tree()).map((row) => trashRowBody(row));
    surface.press(rowsAfterRestore[0]);
    await surface.settle();
    tree = surface.tree();
    const purgeEntryAfter = buttonByTitle(tree, 'Eliminar definitivamente');
    const purgeRequestsBefore = household.lifecycleCalls('purge').length;
    surface.press(purgeEntryAfter!);
    await surface.settle();
    tree = surface.tree();
    const confirmTexts = renderText(tree).join(' ');
    record(confirmTexts.includes('para siempre'), 'D10. the confirm view states the deletion is PARA SIEMPRE');
    record(confirmTexts.includes('No se puede deshacer'), 'D11. the confirm view states it CANNOT be undone');
    record(household.lifecycleCalls('purge').length === purgeRequestsBefore, 'D12. NO purge request was issued from the detail view');
    const confirmPurge = findAll(tree, (element) => element.type === 'AppButton' && element.props?.title === 'Eliminar definitivamente')[0];
    const cancelPurge = buttonByTitle(tree, 'Cancelar');
    record(confirmPurge?.props?.variant === 'danger', 'D13. the confirming button is the danger one');
    surface.press(cancelPurge!);
    await surface.settle();
    record(household.lifecycleCalls('purge').length === purgeRequestsBefore, 'D14. CANCEL keeps the File: still no purge request');
    // Reopen and confirm for real.
    const rowsAgain = renderedTrashRows(surface.tree()).map((row) => trashRowBody(row));
    surface.press(rowsAgain[0]);
    await surface.settle();
    surface.press(buttonByTitle(surface.tree(), 'Eliminar definitivamente')!);
    await surface.settle();
    surface.press(findAll(surface.tree(), (element) => element.type === 'AppButton' && element.props?.title === 'Eliminar definitivamente')[0]);
    await surface.settle(6);
    record(household.lifecycleCalls('purge').length === purgeRequestsBefore + 1, 'D15. the CONFIRMED purge issued exactly ONE POST /purge');
    const purgedBody = household.lifecycleCalls('purge')[0].body as { confirm?: boolean };
    record(purgedBody?.confirm === true, 'D16. the confirmed purge carried confirm: true');
    const listedAfterPurge = listedTrashIds(surface.tree());
    const remainingName = household.trashed.map((row) => row.id);
    record(listedAfterPurge.every((id) => remainingName.includes(id)), 'D17. the purged File is gone from the listing and the others remain');

    surface.unmount();
  }

  // D-2: the refused action is stated INSIDE the sheet, never a dead list.
  console.log('\n--- D-2: a refused action is inline, the list survives ---');
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const household = new Household({ trashed: 2 });
    household.trashRefusals.set('restore:t-0', { status: 409, code: 'homecloud_content_purging', message: 'El archivo se está eliminando definitivamente.' });
    household.install();
    const surface = mount(() => trashScreen.HomeCloudFilesTrashScreen());
    await surface.settle();
    const rows = renderedTrashRows(surface.tree()).map((row) => trashRowBody(row));
    surface.press(rows[0]);
    await surface.settle();
    surface.press(buttonByTitle(surface.tree(), 'Restaurar')!);
    await surface.settle(6);
    const texts = renderText(surface.tree()).join(' ');
    record(texts.includes('eliminando definitivamente'), 'D18. the typed refusal is stated INSIDE the sheet');
    record(listedTrashIds(surface.tree()).length === 2, 'D19. the refused action did NOT take the list down');
    surface.unmount();
  }

  // D-3: empty state, error + retry, capability boundary.
  console.log('\n--- D-3: empty, error and capability states ---');
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const emptyHousehold = new Household({ trashed: 0 });
    emptyHousehold.install();
    const surface = mount(() => trashScreen.HomeCloudFilesTrashScreen());
    await surface.settle();
    const emptyState = findOne(surface.tree(), (element) => element.type === 'EmptyState');
    record(emptyState?.props?.title === 'Papelera vacía', 'D20. the EMPTY state names itself and explains what belongs there');
    record(String(emptyState?.props?.description ?? '').includes('papelera'), 'D20b. and explains what belongs there');
    surface.unmount();
  }
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const failingHousehold = new Household({ trashed: 2 });
    failingHousehold.trashReadError = 'yes';
    failingHousehold.install();
    const surface = mount(() => trashScreen.HomeCloudFilesTrashScreen());
    await surface.settle();
    const errorState = findOne(surface.tree(), (element) => element.type === 'ErrorState');
    record(errorState?.props?.title === 'No pudimos cargar la papelera', 'D21. a failed read becomes an ERROR CARD');
    record(typeof errorState?.props?.onRetry === 'function' && errorState?.props?.retryLabel === 'Reintentar', 'D22. the error card offers Reintentar');
    failingHousehold.trashReadError = null;
    (errorState!.props.onRetry as () => void)();
    await surface.settle(6);
    record(listedTrashIds(surface.tree()).length === 2, 'D23. Reintentar really re-reads and the rows appear');
    surface.unmount();
  }
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const deniedHousehold = new Household({ trashed: 5 });
    deniedHousehold.capabilities = { view: true, contribute: true, organize: true, delete: false };
    deniedHousehold.install();
    const surface = mount(() => trashScreen.HomeCloudFilesTrashScreen());
    await surface.settle();
    const deniedEmpty = findOne(surface.tree(), (element) => element.type === 'EmptyState');
    record(deniedEmpty?.props?.title === 'No tenés permiso para gestionar la papelera', 'D24. the CAPABILITY BOUNDARY is stated when delete is missing');
    record(deniedHousehold.reads('/api/homecloud/files/trash').length === 0, 'D25. and NO listing request was issued against a capability the server would refuse');
    surface.unmount();
  }

  // ── E. THE FILES SURFACE INTEGRATION ─────────────────────────────────────
  console.log('\n--- E. the Files surface integration ---');
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const household = new Household({ loose: 2 });
    household.install();
    const surface = mount(() => filesScreen.HomeCloudFilesView({ visible: true }));
    await surface.settle(6);

    // The overflow offers the Papelera only with homecloud.delete.
    let overflow = findAll(surface.tree(), (element) => element.type === 'InteractivePressable' && element.props?.accessibilityLabel === 'Más opciones de Archivos')[0];
    surface.press(overflow);
    await surface.settle();
    let papeleraEntry = buttonByTitle(surface.tree(), 'Papelera');
    record(papeleraEntry !== null, 'E1. the Files overflow offers the Papelera to a member WITH delete');
    surface.press(papeleraEntry!);
    await surface.settle();
    record(navigations.some((args) => args[0] === 'HomeCloudFilesTrash'), 'E2. and navigates to the Papelera screen');
    surface.unmount();
  }
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const household = new Household({ loose: 2 });
    household.capabilities = { view: true, contribute: true, organize: true, delete: false };
    household.install();
    const surface = mount(() => filesScreen.HomeCloudFilesView({ visible: true }));
    await surface.settle(6);
    const overflow = findAll(surface.tree(), (element) => element.type === 'InteractivePressable' && element.props?.accessibilityLabel === 'Más opciones de Archivos')[0];
    surface.press(overflow);
    await surface.settle();
    record(buttonByTitle(surface.tree(), 'Papelera') === null, 'E3. the Papelera is NOT offered to a member without delete');
    surface.unmount();
  }
  resetWorld();
  {
    authState = {
      session: { access_token: 'token', user: { id: 'auth-user' } },
      authMe: {
        person: { id: 'person-1' },
        memberships: [{ id: MEMBER_ID, household_id: HOUSEHOLD_ID, status: 'active' }],
      },
    } as typeof authState;
    householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Hogar' } };
    const household = new Household({ loose: 2 });
    household.install();
    const surface = mount(() => filesScreen.HomeCloudFilesView({ visible: true }));
    await surface.settle(6);

    // Long press -> action sheet -> Mover a la papelera -> POST + re-read.
    // The host is a FUNCTION COMPONENT: the tree holds its element, and its
    // rendered output is materialized by invoking it — exactly like section B.
    const tile = filesTileBody(surface.tree(), 'c-1');
    (tile.props.onLongPress as () => void)();
    surface.render();
    const hostElement = findAll(surface.tree(), (element) => typeof element.type === 'function' && element.type.name === 'FileActionHost')[0];
    const hostOutput = actionHost.FileActionHost(hostElement.props);
    const trashRow = buttonByTitle(hostOutput, 'Mover a la papelera');
    record(trashRow !== null, 'E4. the File action sheet offers `Mover a la papelera`');
    const readsBefore = household.reads('/api/homecloud/files').length;
    (trashRow!.props.onPress as () => void)();
    await surface.settle(6);
    const trashPosts = household.lifecycleCalls('trash');
    record(trashPosts.length === 1 && trashPosts[0].pathname === '/api/homecloud/content/c-1/trash', 'E5. trashing issued exactly ONE POST /trash for the long-pressed File');
    record(household.reads('/api/homecloud/files').length === readsBefore + 1, 'E6. the surface reconciled through ONE window-preserving re-read');
    const listedFiles = (() => {
      const list = listOf(surface.tree());
      if (!list) return [];
      return (list.props as { data: { kind: string; value: { id: string } }[] }).data
        .filter((item) => item.kind === 'file')
        .map((item) => item.value.id);
    })();
    record(!listedFiles.includes('c-1'), 'E7. the trashed File left the browser listing');
    record(listedFiles.length === 1, 'E8. the other File is still there (no collateral removal)');
    surface.unmount();
  }

  console.log(`\nTRASH_UI_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'TRASH_UI_TESTS=PASS' : 'TRASH_UI_TESTS=FAIL');
  if (failCount > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error('TRASH_UI_TESTS=ERROR');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
