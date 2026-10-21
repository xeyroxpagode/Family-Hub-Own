/**
 * HC-3E B1 — FINAL REVIEW FLOW regression tests: Capture → Editor → Confirm →
 * Review.
 *
 * WHY THIS SUITE EXISTS
 * ---------------------
 * Physical iOS QA passed the editor foundations (open, handles, pinch, rotation)
 * but FAILED the flow: after confirming an edit, HomePlus returned to the
 * CAMERA instead of the Scanner review screen. The root cause was navigation:
 * `navigate({ name: 'HomeCloudScanner', merge: true })` fired from the editor
 * does NOT reuse the Scanner living below in the stack. The installed
 * StackRouter (@react-navigation/routers 7.5.5, StackRouter.js NAVIGATE case)
 * only reuses a route when the target name IS the current route, when
 * `payload.pop` is set, or when a `getId` matches — otherwise it PUSHES a fresh
 * route with a new key. A fresh HomeCloudScanner mounts in `phase='camera'`
 * with zero pages, adopts the outcome against an EMPTY page list (no-op) and
 * buries the real session below the editor.
 *
 * The previous B1 suite proved the session reducer, the serializable contract
 * and the addListener contract — but never the actual StackRouter route-matching
 * semantics, which is where the defect lived.
 *
 * WHAT IS ACTUALLY EXERCISED HERE
 * -------------------------------
 *   RF-A  ROUTER   The REAL installed StackRouter + CommonActions: the defect
 *                  reproduction (merge without pop pushes a fresh scanner) and
 *                  the repaired navigation (merge + pop truncates back to the
 *                  SAME route key with merged params).
 *   RF-B  EDITOR   The REAL compiled ScannerImageEditorScreen over a hook
 *                  host: rotate + a REAL handle drag through the REAL gesture
 *                  machine, apply → real processing plan → preview, confirm →
 *                  navigation payload, cancel ownership, re-edit from the
 *                  preserved original with saved parameters.
 *   RF-C  SCANNER  The REAL compiled HomeCloudScannerScreen: capture → editor → review,
 *                  add page, editor push, outcome adoption through the REAL
 *                  router result, phase/pages/selectedId preservation, no auto
 *                  camera/PDF/upload, cancel preserves the previous processed
 *                  image, two separately edited pages, and one user-driven PDF
 *                  that references BOTH effective processed images.
 *
 * Only what a device supplies is stubbed: React hooks, presentational
 * primitives, navigation focus, the native modules (camera, manipulator,
 * print, filesystem) and the transport. Everything HomeCloud-owned — the
 * session reducer, the gesture machine, the geometry authority, the page
 * model, the PDF HTML, the intake service — is the real compiled code.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

import {
  adoptPageEditOutcome,
  createScannerPage,
  getPageEffectiveUri,
  type ScannerPage,
  type ScannerPageEditOutcome,
} from '../front/mi-front-limpio/services/homecloud/homecloudScanner';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

// The real backend client needs its base URL exactly like every compiled suite.
process.env.EXPO_PUBLIC_API_URL = 'http://hh-b1.test';

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

// ── the hook host: React for mounted components ─────────────────────────────

type EffectCallback = () => void | (() => void);
type Slot = { initialized: boolean; deps?: readonly unknown[]; value: unknown; cleanup?: () => void };

const MAX_RENDERS = 4000;

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
  __markDirty: () => void;
  __commit: () => void;
  __render: (view: () => unknown) => unknown;
  __lastTree: () => unknown;
  __unmount: () => void;
  __settle: (view: () => unknown, rounds: number, waitMs: number) => Promise<void>;
};

type TestElement = { type: unknown; props: Record<string, any> };

/** Ref targets by stub element type: what a device wires into `ref` natively. */
const refTargets = new Map<unknown, unknown>();

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
    if (renders > MAX_RENDERS) throw new Error('B1 review flow: the surface never stopped re-rendering');
    cursor = 0;
    lastTree = view();
    return lastTree;
  };

  const host: HookHost = {
    useRef,
    useState,
    useMemo,
    useCallback,
    useEffect,
    createElement: (type, props, ...children) => {
      if (type === 'WebView') lastWebViewProps = props as Record<string, unknown>;
      const element = {
        type,
        props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children },
      };
      // What React does natively for `ref`: hand the device object over. The
      // scanner's `cameraRef` receives the takePictureAsync-capable camera.
      const ref = (props as { ref?: { current: unknown } } | null)?.ref;
      if (ref && typeof ref === 'object' && 'current' in ref) {
        const device = refTargets.get(type);
        if (device !== undefined) ref.current = device;
      }
      return element;
    },
    __markDirty: () => { dirty = true; },
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
    },
    __settle: async (view: () => unknown, rounds: number, waitMs: number) => {
      for (let round = 0; round < rounds; round += 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        let guard = 0;
        while (dirty) {
          dirty = false;
          guard += 1;
          if (guard > 200) throw new Error('B1 review flow: a single settle never converged');
          render(view);
          commit();
        }
      }
    },
  };
  return host;
}

// ── what a device would provide ──────────────────────────────────────────────

let activeHost: HookHost | null = null;

const hostModules = (): HookHost => {
  if (!activeHost) throw new Error('B1 review flow: no host is mounted');
  return activeHost;
};

const reactStub: Record<string, unknown> = {
  __esModule: true,
  useRef: (...args: unknown[]) => hostModules().useRef(...(args as [never])),
  useState: (...args: unknown[]) => hostModules().useState(...(args as [never])),
  useMemo: (...args: unknown[]) => hostModules().useMemo(...(args as [never, never[]])),
  useCallback: (...args: unknown[]) => hostModules().useCallback(...(args as [never, never[]])),
  useEffect: (...args: unknown[]) => hostModules().useEffect(...(args as [never, never[]])),
  createElement: (...args: unknown[]) => hostModules().createElement(...(args as [never, never, ...never[]])),
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
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  View: 'View',
  Text: 'Text',
  Image: {
    getSize: (uri: string, success: (w: number, h: number) => void, failure: () => void) => {
      if (String(uri).includes('broken')) failure();
      else success(1200, 1800);
    },
  },
  FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator',
  PanResponder: panResponderStub,
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
  Linking: { openSettings: async () => undefined },
  StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
};

// Navigation double: per-route params + a recorded navigation, faithful to the
// v7 addListener contract (an UNSUBSCRIBE FUNCTION, never .remove()).
let routeParams: Record<string, unknown> | undefined = undefined;
/** The Scanner route's own params — restored every time its host reactivates. */
let scannerRouteParams: Record<string, unknown> = { ...{ folderId: null, folderName: 'Archivos', capabilities: null } };
const navigations: unknown[][] = [];
const goBacks: unknown[] = [];
const setParamsCalls: Record<string, unknown>[] = [];
const beforeRemoveListeners: { type: string; callback: (event: unknown) => void }[] = [];

const navigationDouble = {
  navigate: (...args: unknown[]) => { navigations.push(args); },
  goBack: () => { goBacks.push(null); },
  dispatch: () => undefined,
  setOptions: () => undefined,
  setParams: (patch: Record<string, unknown>) => {
    setParamsCalls.push(patch);
    const wasScannerRoute = routeParams === scannerRouteParams;
    routeParams = { ...(routeParams ?? {}), ...patch };
    if (wasScannerRoute) scannerRouteParams = routeParams;
    hostModules().__markDirty();
  },
  addListener: (type: string, callback: (event: unknown) => void) => {
    const entry = { type, callback };
    beforeRemoveListeners.push(entry);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const index = beforeRemoveListeners.indexOf(entry);
      if (index >= 0) beforeRemoveListeners.splice(index, 1);
    };
  },
};

const navigationStub = {
  useNavigation: () => navigationDouble,
  useRoute: () => ({ key: 'route-live', name: 'route-live', params: routeParams }),
  useFocusEffect: (effect: EffectCallback) => hostModules().useEffect(() => { effect(); }, [effect]),
  useIsFocused: () => true,
};

// Contexts: a signed-in member of a household (the scanner needs both).
const authState = { session: { access_token: 'tok-b1' } };
const householdState = { currentHousehold: { id: 'hh-b1', name: 'Hogar B1' } };

const uiStub = {
  AppButton: 'AppButton',
  AppText: 'AppText',
  AppInput: 'AppInput',
  ActionSheet: 'ActionSheet',
  floatingNavigationMetrics: { mainRegularHeight: 64 },
};
const iconsStub = { HomePlusIcon: 'HomePlusIcon' };

// Camera: permission granted + a takePictureAsync device behind the ref.
let captureCounter = 0;
const cameraDevice = {
  takePictureAsync: async () => {
    captureCounter += 1;
    const uri = `file:///tmp/capture_${captureCounter}.jpg`;
    fsFiles.add(uri);
    return { uri, width: 1200, height: 1800 };
  },
};
refTargets.set('CameraView', cameraDevice);
const cameraStub = {
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true, canAskAgain: true }, async () => ({ granted: true }), async () => ({ granted: true })],
};

// Manipulator: records the REAL plan actions and mints a real temp file.
let manipCounter = 0;
const manipCalls: { uri: string; actions: unknown[] }[] = [];
const manipulatorStub = {
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: async (uri: string, actions: unknown[]) => {
    manipCalls.push({ uri, actions });
    manipCounter += 1;
    const out = `file:///tmp/processed_${manipCounter}.jpg`;
    fsFiles.add(out);
    return { uri: out, width: 600, height: 800 };
  },
};

let perspectiveCounter = 0;
const perspectiveCalls: { job: any }[] = [];
const webViewDevice = {
  postMessage: (raw: string) => {
    const job = JSON.parse(raw);
    perspectiveCalls.push({ job });
    perspectiveCounter += 1;
    const out = `file:///cache/homecloud-scanner-perspective-${job.id}.jpg`;
    fsFiles.add(out);
    setTimeout(() => {
      const onMessage = lastWebViewProps?.onMessage as ((event: { nativeEvent: { data: string } }) => void) | undefined;
      onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            type: 'result',
            id: job.id,
            width: job.outputSize.width,
            height: job.outputSize.height,
            base64: `processed::${perspectiveCounter}`,
          }),
        },
      });
    }, 0);
  },
};
let lastWebViewProps: Record<string, unknown> | null = null;
const webViewStub = {
  __esModule: true,
  WebView: 'WebView',
  default: 'WebView',
};
refTargets.set('WebView', webViewDevice);

// Print: records the generated HTML, returns a PDF the FS stub can stat.
const printCalls: string[] = [];
const printStub = {
  printToFileAsync: async ({ html }: { html: string }) => {
    printCalls.push(html);
    return { uri: 'file:///scanpdf/out.pdf' };
  },
};

// Legacy FileSystem: a recording virtual store over the temp files.
const fsFiles = new Set<string>();
const fsCalls: { op: string; uri: string }[] = [];
const GENERATED_PDF = 'file:///scanpdf/out.pdf';
const legacyFileSystemStub = {
  documentDirectory: 'file:///docs/',
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: async (uri: string) => ({
    exists: fsFiles.has(uri) || uri === GENERATED_PDF,
    size: 2048,
    isDirectory: false,
    uri,
    modificationTime: 0,
  }),
  readAsStringAsync: async (uri: string) => {
    fsCalls.push({ op: 'read', uri });
    return `base64::${uri}`;
  },
  writeAsStringAsync: async (uri: string) => {
    fsCalls.push({ op: 'write', uri });
    fsFiles.add(uri);
  },
  makeDirectoryAsync: async () => undefined,
  // The durable workspace copy FAILS deterministically: submitArtifact stops
  // BEFORE any network, projecting 'failed' through the real intake service
  // (the same failure class the W1-C suite injects with copyFails).
  copyAsync: async () => { throw new Error('copy unavailable'); },
  moveAsync: async () => undefined,
  deleteAsync: async (uri: string) => {
    fsCalls.push({ op: 'delete', uri });
    fsFiles.delete(uri);
  },
  readDirectoryAsync: async () => [],
};

const asyncStorageStub = {
  __esModule: true,
  default: (() => {
    const data = new Map<string, string>();
    return {
      getItem: async (key: string) => data.get(key) ?? null,
      setItem: async (key: string, value: string) => { data.set(key, value); },
      removeItem: async (key: string) => { data.delete(key); },
      getAllKeys: async () => [...data.keys()],
    };
  })(),
};

const hapticsExpoStub = {
  impactAsync: async () => undefined,
  notificationAsync: async () => undefined,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
};

function installModuleStubs(): void {
  const loader = require('node:module') as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
  const original = loader._load;
  const byRequest: [string, unknown][] = [
    ['react', reactStub],
    ['react-native', reactNativeStub],
    ['@react-navigation/native', navigationStub],
    ['expo-camera', cameraStub],
    ['expo-print', printStub],
    ['expo-image-manipulator', manipulatorStub],
    ['expo-file-system/legacy', legacyFileSystemStub],
    ['expo-haptics', hapticsExpoStub],
    ['@react-native-async-storage/async-storage', asyncStorageStub],
    ['react-native-safe-area-context', require('../../../tests/stubs/react-native-safe-area-context')],
    ['react-native-webview', webViewStub],
    ['react-native-svg', require('../../../tests/stubs/react-native-svg')],
  ];
  const byFragment: [string, unknown][] = [
    ['AuthContext', { useAuth: () => authState }],
    ['HouseholdContext', { useHousehold: () => householdState }],
    ['components/ui', uiStub],
    ['constants/icons', iconsStub],
  ];
  loader._load = function patched(request: string, parent: unknown, isMain: boolean): unknown {
    for (const [exact, value] of byRequest) if (request === exact) return value;
    for (const [fragment, value] of byFragment) if (request.includes(fragment)) return value;
    return original.call(this, request, parent, isMain);
  };
}

installModuleStubs();

// The transport: the REAL requestJson path over a recorded fetch. The register
// route exists but is never expected to be reached by this suite (the durable
// copy fails first); folders/capabilities answer like the real backend.
const fetchCalls: { method: string; pathname: string }[] = [];
(globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown, init?: { method?: string }) => {
  const target = new URL(String(input));
  fetchCalls.push({ method: (init?.method ?? 'GET').toUpperCase(), pathname: target.pathname });
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  if (target.pathname === '/api/homecloud/capabilities') {
    return json(200, { capabilities: { 'homecloud.view': true, 'homecloud.contribute': true, 'homecloud.organize': true, 'homecloud.delete': true }, membershipId: 'mm-b1', householdId: 'hh-b1', role: 'adult' });
  }
  if (target.pathname === '/api/homecloud/folders') return json(200, { folders: [] });
  if (target.pathname === '/api/homecloud/register') return json(500, { code: 'server_error', message: 'register down' });
  return json(404, { code: 'not_found', message: `no route for ${target.pathname}` });
}) as typeof fetch;

// ── the REAL navigation libraries (installed, unmodified) ───────────────────

const frontRequire = createRequire(path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio', 'package.json'));
const { CommonActions } = frontRequire('@react-navigation/core') as {
  CommonActions: { navigate: (options: Record<string, unknown>) => { type: string; payload: Record<string, unknown> } };
};
const { StackRouter } = frontRequire('@react-navigation/routers') as {
  StackRouter: (options: Record<string, never>) => {
    getStateForAction: (state: unknown, action: unknown, options: unknown) => any;
  };
};
const routersVersion = (frontRequire('@react-navigation/routers/package.json') as { version: string }).version;
const coreVersion = (frontRequire('@react-navigation/core/package.json') as { version: string }).version;
const router = StackRouter({});

const ROUTE_NAMES = ['MoreHome', 'HomeCloud', 'HomeCloudScanner', 'ScannerImageEditor'];
const ROUTER_OPTIONS = { routeNames: ROUTE_NAMES, routeParamList: {}, routeGetIdList: {} };

type Route = { key: string; name: string; params?: Record<string, unknown> };
type StackState = {
  stale: boolean;
  type: 'stack';
  key: string;
  index: number;
  routeNames: string[];
  preloadedRoutes: Route[];
  routes: Route[];
};

function stackState(routes: Route[]): StackState {
  return {
    stale: false,
    type: 'stack',
    key: 'stack-more',
    index: routes.length - 1,
    routeNames: ROUTE_NAMES,
    preloadedRoutes: [],
    routes,
  };
}

// ── compiled REAL surfaces and authorities ───────────────────────────────────

const compiled = (relative: string): string => path.join(__dirname, '..', 'front', 'mi-front-limpio', relative);

const scannerScreen = require(compiled('screens/HomeCloudScannerScreen')) as {
  HomeCloudScannerScreen: () => unknown;
};
const editorScreen = require(compiled('screens/ScannerImageEditorScreen')) as {
  ScannerImageEditorScreen: () => unknown;
};
const geometry = require(compiled('services/homecloud/homecloudScannerGeometry')) as {
  CANVAS_PADDING: number;
  FULL_CROP_RECT: { x: number; y: number; width: number; height: number };
  computeBoxRect: (viewport: { width: number; height: number }, oriented: { width: number; height: number }, padding: number) => { x: number; y: number; width: number; height: number };
  orientedSize: (source: { width: number; height: number }, steps: number) => { width: number; height: number };
};
const uploadStorage = require(compiled('storage/homecloudUploadJobStorage')) as {
  __setSharedUploadJobStoreForTests: (store: unknown) => void;
};
const reconciliation = require(compiled('services/homecloud/homecloudReadReconciliation')) as {
  __resetHomeCloudReadReconciliationForTests: () => void;
};

function readSource(relative: string): string {
  return fs.readFileSync(path.join(__dirname, '..', '..', '..', 'front', 'mi-front-limpio', relative), 'utf8');
}

// ── tree helpers ─────────────────────────────────────────────────────────────

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

function buttonByLabel(tree: unknown, label: string): TestElement | null {
  return findOne(tree, (element) => element.type === 'AppButton' && element.props?.accessibilityLabel === label);
}

function buttonByTitle(tree: unknown, title: string): TestElement | null {
  return findOne(tree, (element) => element.type === 'AppButton' && element.props?.title === title);
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

function thumbRows(tree: unknown): TestElement[] {
  const list = findOne(tree, (element) => element.type === 'FlatList');
  if (!list) return [];
  const props = list.props as { data: unknown[]; renderItem: (input: { item: unknown; index: number }) => unknown };
  return props.data.map((item, index) => props.renderItem({ item, index }) as TestElement);
}

function previewImage(tree: unknown): TestElement | null {
  // PATCH 1C (H) — the large preview is View → ScannerPageImage (the ONE
  // canonical display resolver). The hook host does not expand function
  // components, so the preview is located by its component element (the
  // thumbnail copies carry an empty label) and its display URI resolved
  // through the SAME canonical policy the component consumes
  // (`getPageEffectiveUri`).
  const resolverElement = findOne(tree, (element) => typeof element.type === 'function'
    && (element.type as { name?: string }).name === 'ScannerPageImage'
    && element.props?.accessibilityLabel === 'Vista previa de la página seleccionada');
  if (resolverElement === null) return null;
  const page = resolverElement.props?.page as ScannerPage;
  return { type: 'Image', props: { source: { uri: getPageEffectiveUri(page) } } };
}

function thumbImages(tree: unknown): string[] {
  return thumbRows(tree).map((row) => {
    // PATCH 1C — the thumbnail strip consumes the SAME canonical resolver
    // component as the large preview.
    const resolverElement = findOne(row, (element) => typeof element.type === 'function'
      && (element.type as { name?: string }).name === 'ScannerPageImage');
    const page = resolverElement?.props?.page as ScannerPage | undefined;
    return page ? getPageEffectiveUri(page) : '';
  });
}

function pageData(tree: unknown): ScannerPage[] {
  const list = findOne(tree, (element) => element.type === 'FlatList');
  if (!list) return [];
  return (list.props as { data: ScannerPage[] }).data;
}

type Mounted = {
  activate: () => void;
  tree: () => unknown;
  render: () => void;
  settle: (rounds?: number) => Promise<void>;
  press: (element: TestElement) => void;
  unmount: () => void;
};

/**
 * One host per mounted surface. `onActivate` restores the route params that
 * belong to THIS surface before any render — exactly what separate stack
 * routes have in the real navigator.
 */
function mountView(view: () => unknown, onActivate?: () => void): Mounted {
  const host = createHookHost();
  const activate = (): void => {
    if (onActivate) onActivate();
    activeHost = host;
  };
  activate();
  host.__render(view);
  host.__commit();
  return {
    activate,
    tree: () => { activate(); return host.__lastTree(); },
    render: () => { activate(); host.__render(view); host.__commit(); },
    settle: async (rounds = 40) => { activate(); await host.__settle(view, rounds, 10); },
    press: (element: TestElement) => {
      if (element.props?.disabled === true) throw new Error('B1 review flow: pressed a disabled button');
      const handler = element.props?.onPress;
      if (typeof handler !== 'function') throw new Error('B1 review flow: the pressed element has no onPress');
      handler();
    },
    unmount: () => { activate(); host.__unmount(); },
  };
}

const deletesOf = (uri: string): number => fsCalls.filter((call) => call.op === 'delete' && call.uri === uri).length;
const readsOf = (): string[] => fsCalls.filter((call) => call.op === 'read').map((call) => call.uri);
const registerCalls = (): number => fetchCalls.filter((call) => call.pathname === '/api/homecloud/register').length;

// ── the suite ────────────────────────────────────────────────────────────────

const CAPS = { view: true, contribute: true, organize: true, delete: true, anyWrite: true };

function freshWorld(): void {
  uploadStorage.__setSharedUploadJobStoreForTests(null);
  reconciliation.__resetHomeCloudReadReconciliationForTests();
  navigations.length = 0;
  goBacks.length = 0;
  setParamsCalls.length = 0;
  beforeRemoveListeners.length = 0;
  perspectiveCalls.length = 0;
  perspectiveCalls.length = 0;
  printCalls.length = 0;
  fsCalls.length = 0;
  fetchCalls.length = 0;
  captureCounter = 0;
  manipCounter = 0;
  perspectiveCounter = 0;
  lastWebViewProps = null;
  routeParams = undefined;
}

async function main(): Promise<void> {
console.log('\n=== HC-3E SCANNER B1 FINAL FLOW (CAPTURE → EDITOR → CONFIRM → REVIEW) ===\n');
  console.log(`  real router: @react-navigation/routers@${routersVersion} / core@${coreVersion}`);
  record(routersVersion.startsWith('7.') && coreVersion.startsWith('7.'), 'RF0.1. the real React Navigation 7 router is the one under test');

  // ═════════════════════════════════════════════════════════════════════════
  // RF-A: the REAL StackRouter semantics — defect reproduction and repair
  // ═════════════════════════════════════════════════════════════════════════
  console.log('\n--- RF-A: the real StackRouter decides reuse vs push ---');
  {
    const liveScannerKey = 'HomeCloudScanner-S1';
    const editing = stackState([
      { key: 'MoreHome-M', name: 'MoreHome' },
      { key: 'HomeCloud-H', name: 'HomeCloud' },
      { key: liveScannerKey, name: 'HomeCloudScanner', params: { folderId: null, folderName: 'Archivos', capabilities: CAPS } },
      { key: 'ScannerImageEditor-E1', name: 'ScannerImageEditor', params: { page: { id: 'scan_1' } } },
    ]);

    // The B1 defect: merge WITHOUT pop. The router cannot match a non-current
    // route by name alone, so it PUSHES a fresh HomeCloudScanner.
    const defectAction = CommonActions.navigate({
      name: 'HomeCloudScanner',
      params: { scannerEditOutcome: { pageId: 'scan_1', edit: {}, processedUri: 'file:///tmp/p1.jpg' } },
      merge: true,
    });
    const defectState = router.getStateForAction(editing, defectAction, ROUTER_OPTIONS);
    record(defectState.routes.length === 5, 'RF-A1. merge WITHOUT pop PUSHES a new route (the physical B1 defect: a second scanner mounts)');
    record(defectState.routes[4].key !== liveScannerKey && defectState.routes[4].name === 'HomeCloudScanner',
      'RF-A2. the pushed scanner has a FRESH key, so it remounts in camera phase with zero pages');
    record(defectState.routes.some((route: Route) => route.key === liveScannerKey), 'RF-A3. the live review session is buried below the editor (the user cannot reach it)');

    // The repair: merge + pop. The router finds the scanner by name and
    // truncates the stack down to it, merging the outcome param.
    const repairAction = CommonActions.navigate({
      name: 'HomeCloudScanner',
      params: { scannerEditOutcome: { pageId: 'scan_1', edit: {}, processedUri: 'file:///tmp/p1.jpg' } },
      merge: true,
      pop: true,
    });
    const repairedState = router.getStateForAction(editing, repairAction, ROUTER_OPTIONS);
    record(repairedState.routes.length === 3, 'RF-A4. merge + pop truncates back to the scanner (the editor is popped off)');
    record(repairedState.routes[2].key === liveScannerKey, 'RF-A5. the SAME route key is reused — NO remount, NO duplicate scanner, session state survives');
    record(!repairedState.routes.some((route: Route) => route.name === 'ScannerImageEditor'), 'RF-A6. the editor route is gone from the stack');
    const mergedParams = repairedState.routes[2].params as Record<string, unknown>;
    record(mergedParams.scannerEditOutcome !== undefined && mergedParams.folderName === 'Archivos',
      'RF-A7. the outcome param is MERGED onto the existing params (folder context preserved)');
  }

  // ═════════════════════════════════════════════════════════════════════════
  // RF-B: the REAL editor — one Confirmar action, cancel, re-edit
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n--- RF-B: the real editor screen over the real session/gesture/geometry code ---');

  freshWorld();

  // A page exactly as the scanner pushes it: original 1200x1800, no edit yet.
  const pageOne: ScannerPage = createScannerPage('scan_p1', 'file:///tmp/capture_1.jpg', 1200, 1800);
  fsFiles.add('file:///tmp/capture_1.jpg');

  // ── RF-B1: rotate + REAL handle drag → Confirmar processes and returns ──
  let editorPage = pageOne;
  const editorA = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: editorPage }; });
  await editorA.settle();

  const rotateButton = buttonByTitle(editorA.tree(), 'Rotar');
  record(rotateButton !== null, 'RF-B1a. the editor renders the rotate action');
  if (rotateButton) editorA.press(rotateButton);
  await editorA.settle();

  // Canvas layout, then drive the REAL gesture machine: grab the topLeft
  // handle and drag it inward — the exact crop gesture a finger performs.
  const canvas = findOne(editorA.tree(), (element) => element.type === 'View' && element.props?.accessibilityLabel === 'Área de edición de la página');
  record(canvas !== null && typeof canvas?.props?.onLayout === 'function', 'RF-B1b. the editor canvas is mounted with its layout handler');
  (canvas!.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width: 390, height: 520 } } });
  await editorA.settle();

  const oriented = geometry.orientedSize({ width: 1200, height: 1800 }, 1);
  const box = geometry.computeBoxRect({ width: 390, height: 520 }, oriented, geometry.CANVAS_PADDING);
  const grantEvent = (canvasX: number, canvasY: number) => ({
    nativeEvent: {
      identifier: 't1',
      pageX: 1000 + canvasX,
      pageY: 1000 + canvasY,
      locationX: canvasX,
      locationY: canvasY,
      touches: [{ identifier: 't1', pageX: 1000 + canvasX, pageY: 1000 + canvasY }],
    },
  });
  const dragTargetX = box.x + 60;
  const dragTargetY = box.y + 40;
  (canvas!.props.onPanResponderGrant as (event: unknown) => void)(grantEvent(box.x, box.y));
  (canvas!.props.onPanResponderMove as (event: unknown) => void)(grantEvent(dragTargetX, dragTargetY));
  (canvas!.props.onPanResponderRelease as () => void)();
  await editorA.settle();

  record(buttonByLabel(editorA.tree(), 'Aplicar recorte y rotación') === null,
    'RF-B1c. the deprecated duplicate Apply action is absent');
  const confirmButton = buttonByLabel(editorA.tree(), 'Confirmar edición');
  record(confirmButton !== null && confirmButton?.props?.disabled !== true,
    'RF-B1d. Confirmar is the single primary completion action');
  const navigationsBefore = navigations.length;
  if (confirmButton) editorA.press(confirmButton);
  await editorA.settle();

  record(perspectiveCalls.length === 1, 'RF-B1e. Confirmar runs the perspective engine exactly once');
  const perspectiveA = perspectiveCalls[0]?.job;
  record(readsOf().includes('file:///tmp/capture_1.jpg'), 'RF-B1f. processing always starts from the preserved ORIGINAL capture');
  record(perspectiveA?.rotationSteps === 1, 'RF-B1g. the plan carries the applied 90° rotation to the oriented canvas');
  const sourcePoints = (perspectiveA?.sourcePoints ?? []) as { x: number; y: number }[];
  record(
    sourcePoints[0]?.x > 0
      && sourcePoints[0]?.y > 0
      && perspectiveA?.outputSize?.width > 0
      && perspectiveA?.outputSize?.height > 0,
    'RF-B1h. the plan carries the REAL dragged quad, validated against post-rotation pixels',
  );

  // ── RF-B2: Confirmar hands the result off as a serializable outcome ──
  record(navigations.length === navigationsBefore + 1, 'RF-B2a. confirm navigates exactly once');
  const handOff = navigations[navigations.length - 1]?.[0] as {
    name?: string;
    params?: { scannerEditOutcome?: ScannerPageEditOutcome };
    merge?: boolean;
    pop?: boolean;
  };
  record(handOff?.name === 'HomeCloudScanner', 'RF-B2b. the hand-off targets the Scanner');
  record(handOff?.merge === true, 'RF-B2c. the hand-off MERGES params');
  record(handOff?.pop === true, 'RF-B2d. the hand-off carries pop:true');
  const outcomeOne = handOff?.params?.scannerEditOutcome;
  record(outcomeOne?.pageId === 'scan_p1', 'RF-B2e. the outcome names the edited page');
  record(outcomeOne?.processedUri !== undefined && String(outcomeOne.processedUri).startsWith('file:///cache/homecloud-scanner-perspective-'),
    'RF-B2f. the outcome carries the REAL processed file');
  record(outcomeOne?.edit?.rotationSteps === 1, 'RF-B2g. the outcome carries the canonical edit');

  editorA.unmount();
  record(deletesOf(String(outcomeOne?.processedUri)) === 0, 'RF-B2i. unmount after adoption deletes NOTHING (the Scanner owns the processed file now)');

  // ── RF-B3: re-edit starts from the ORIGINAL with the saved parameters ──
  const editedSnapshot: ScannerPage = {
    ...pageOne,
    edit: outcomeOne?.edit ?? null,
    processedUri: String(outcomeOne?.processedUri),
  };
  perspectiveCalls.length = 0;
  editorPage = editedSnapshot;
  const editorB = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: editorPage }; });
  await editorB.settle();

  record(buttonByLabel(editorB.tree(), 'Aplicar recorte y rotación') === null,
    'RF-B3a. re-editing still exposes no duplicate Apply action');
  const confirmAgain = buttonByLabel(editorB.tree(), 'Confirmar edición');
  if (confirmAgain) editorB.press(confirmAgain);
  await editorB.settle();
  record(
    perspectiveCalls.length === 1 && readsOf().filter((uri) => uri === 'file:///tmp/capture_1.jpg').length >= 2,
    'RF-B3b. re-edit regenerates from the preserved ORIGINAL, never from the previous processed file',
  );
  record(perspectiveCalls[0]?.job?.rotationSteps === 1, 'RF-B3c. the saved canonical parameters (rotation) drive the regeneration');

  editorB.unmount();

  // ── RF-B4: cancel preserves the previous processed image ──
  editorPage = editedSnapshot;
  const editorCancel = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: editorPage }; });
  await editorCancel.settle();
  const previousProcessed = String(outcomeOne?.processedUri);
  const writesBeforeCancel = fsCalls.filter((call) => call.op === 'write').length;
  const cancelButton = buttonByLabel(editorCancel.tree(), 'Cancelar edición');
  record(cancelButton !== null, 'RF-B4a. cancel is offered');
  if (cancelButton) editorCancel.press(cancelButton);
  await editorCancel.settle();
  record(goBacks.length === 1, 'RF-B4b. cancel pops back to the Scanner');
  editorCancel.unmount();
  record(fsCalls.filter((call) => call.op === 'write').length === writesBeforeCancel,
    'RF-B4c. cancel creates no unconfirmed processed artifact');
  record(deletesOf(previousProcessed) === 0, 'RF-B4d. cancel NEVER deletes the Scanner-owned processed image (the previous edit survives)');
  record(deletesOf('file:///tmp/capture_1.jpg') === 0, 'RF-B4e. cancel never deletes the original capture');

  // ═════════════════════════════════════════════════════════════════════════
  // RF-C: the REAL scanner — capture → review → edit → confirm → review
  // ═══════════════════════════════════════════════════════════════════════
  console.log('\n--- RF-C: the real scanner screen: the full review session ---');

  freshWorld();
  scannerRouteParams = { folderId: null, folderName: 'Archivos', capabilities: CAPS };

  const scanner = mountView(
    () => scannerScreen.HomeCloudScannerScreen(),
    () => { routeParams = scannerRouteParams; },
  );
  await scanner.settle();

  const cameraFirst = findOne(scanner.tree(), (element) => element.type === 'CameraView');
  record(cameraFirst !== null, 'RF-C1a. the scanner opens in the CAMERA phase');
  (cameraFirst!.props.onCameraReady as () => void)();
  await scanner.settle();

  const shutter = buttonByLabel(scanner.tree(), 'Capturar página');
  record(shutter !== null && shutter?.props?.disabled !== true, 'RF-C1b. the shutter is armed once the camera is ready');
  const navigationBeforeCapture = navigations.length;
  if (shutter) scanner.press(shutter);
  await scanner.settle();

  const firstEditorPush = navigations[navigations.length - 1];
  const firstCapturedPage = (firstEditorPush?.[1] as { page?: ScannerPage } | undefined)?.page;
  record(navigations.length === navigationBeforeCapture + 1
    && firstEditorPush?.[0] === 'ScannerImageEditor'
    && firstCapturedPage?.originalUri === 'file:///tmp/capture_1.jpg',
  'RF-C2a. capture automatically opens the newly captured page editor');
  let captureEditorPage = firstCapturedPage as ScannerPage;
  const firstCaptureEditor = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: captureEditorPage }; });
  await firstCaptureEditor.settle();
  const firstCaptureConfirm = buttonByLabel(firstCaptureEditor.tree(), 'Confirmar edición');
  record(firstCaptureConfirm !== null, 'RF-C2b. the mandatory editor offers Confirmar');
  if (firstCaptureConfirm) firstCaptureEditor.press(firstCaptureConfirm);
  await firstCaptureEditor.settle();
  const firstCaptureHandOff = navigations[navigations.length - 1]?.[0] as {
    params?: { scannerEditOutcome?: ScannerPageEditOutcome }; pop?: boolean;
  };
  record(firstCaptureHandOff?.pop === true && firstCaptureHandOff?.params?.scannerEditOutcome?.pageId === firstCapturedPage?.id,
    'RF-C2c. Confirmar returns the captured page to the existing scanner session');
  firstCaptureEditor.unmount();
  scannerRouteParams = { ...scannerRouteParams, scannerEditOutcome: firstCaptureHandOff?.params?.scannerEditOutcome };
  scanner.render();
  await scanner.settle();

  let previewEl = previewImage(scanner.tree());
  record(previewEl !== null, 'RF-C2d. after Confirmar the scanner lands on Review');
  record(renderText(scanner.tree()).includes('1 página'), 'RF-C2e. the review header counts one page');

  // Add a second page.
  const addPage = buttonByTitle(scanner.tree(), '+ Página');
  record(addPage !== null, 'RF-C3a. the review phase offers Add Page');
  if (addPage) scanner.press(addPage);
  await scanner.settle();
  const cameraAgain = findOne(scanner.tree(), (element) => element.type === 'CameraView');
  record(cameraAgain !== null, 'RF-C3b. Add Page returns to the camera phase on demand');
  (cameraAgain!.props.onCameraReady as () => void)();
  await scanner.settle();
  const shutterAgain = buttonByLabel(scanner.tree(), 'Capturar página');
  if (shutterAgain) scanner.press(shutterAgain);
  await scanner.settle();

  const secondEditorPush = navigations[navigations.length - 1];
  const secondCapturedPage = (secondEditorPush?.[1] as { page?: ScannerPage } | undefined)?.page;
  record(secondEditorPush?.[0] === 'ScannerImageEditor' && secondCapturedPage?.originalUri === 'file:///tmp/capture_2.jpg',
    'RF-C3c. + Página follows camera → editor for the second capture');
  captureEditorPage = secondCapturedPage as ScannerPage;
  const secondCaptureEditor = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: captureEditorPage }; });
  await secondCaptureEditor.settle();
  const secondCaptureConfirm = buttonByLabel(secondCaptureEditor.tree(), 'Confirmar edición');
  if (secondCaptureConfirm) secondCaptureEditor.press(secondCaptureConfirm);
  await secondCaptureEditor.settle();
  const secondCaptureHandOff = navigations[navigations.length - 1]?.[0] as {
    params?: { scannerEditOutcome?: ScannerPageEditOutcome };
  };
  secondCaptureEditor.unmount();
  scannerRouteParams = { ...scannerRouteParams, scannerEditOutcome: secondCaptureHandOff?.params?.scannerEditOutcome };
  scanner.render();
  await scanner.settle();

  let pages = pageData(scanner.tree());
  record(pages.length === 2, 'RF-C4a. two captured pages are preserved in order');
  const [pageA, pageB] = pages;
  const initialPageBProcessed = pageB.processedUri;
  record(pageA.originalUri === 'file:///tmp/capture_1.jpg' && pageB.originalUri === 'file:///tmp/capture_2.jpg',
    'RF-C4b. both page identities survive (originals kept, ids stable)');

  // PATCH 1C (J) — tapping an existing thumbnail SELECTS the page (large
  // preview + visible actions follow `selectedId`) and NEVER opens the
  // editor. The visible `Editar` action is the single editor door.
  const rows = thumbRows(scanner.tree());
  record(rows.length === 2, 'RF-C5a. the thumbnail strip lists both pages');
  const navigationsBeforePush = navigations.length;
  scanner.press(rows[0]);
  await scanner.settle();
  previewEl = previewImage(scanner.tree());
  record((previewEl?.props?.source as { uri: string })?.uri === getPageEffectiveUri(pageA),
    'RF-C5b. selecting a thumbnail focuses that page');
  record(navigations.length === navigationsBeforePush,
    'RF-C6a. PATCH 1C: a thumbnail tap only SELECTS — it never pushes the editor');
  record(
    buttonByTitle(scanner.tree(), 'Repetir') !== null
      && buttonByTitle(scanner.tree(), 'Editar') !== null
      && buttonByTitle(scanner.tree(), 'Eliminar') !== null,
    'RF-C6a2. the selected page\'s actions are VISIBLE (Repetir · Editar · Eliminar), not hidden in ⋯',
  );
  const editButton = buttonByLabel(scanner.tree(), 'Editar la página seleccionada');
  record(editButton !== null, 'RF-C6a3. the visible Editar action is offered for the selected page');
  if (editButton) scanner.press(editButton);
  await scanner.settle();
  record(navigations.length === navigationsBeforePush + 1, 'RF-C6b. Editar pushes the editor exactly once');
  const pushedPage = (navigations[navigations.length - 1]?.[1] as { page?: ScannerPage } | undefined)?.page;
  record(pushedPage?.id === pageA.id && pushedPage?.originalUri === 'file:///tmp/capture_1.jpg',
    'RF-C6c. the editor receives the selected page snapshot');

  // Run the REAL editor flow on the pushed snapshot: rotate + crop + apply +
  // confirm — the exact interaction sequence the physical QA performed.
  perspectiveCalls.length = 0;
  let editorLivePage = pushedPage as ScannerPage;
  const editorC = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: editorLivePage }; });
  await editorC.settle();

  const rotateC = buttonByTitle(editorC.tree(), 'Rotar');
  if (rotateC) editorC.press(rotateC);
  await editorC.settle();
  const canvasC = findOne(editorC.tree(), (element) => element.type === 'View' && element.props?.accessibilityLabel === 'Área de edición de la página');
  (canvasC!.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width: 390, height: 520 } } });
  await editorC.settle();
  (canvasC!.props.onPanResponderGrant as (event: unknown) => void)(grantEvent(box.x, box.y));
  (canvasC!.props.onPanResponderMove as (event: unknown) => void)(grantEvent(dragTargetX, dragTargetY));
  (canvasC!.props.onPanResponderRelease as () => void)();
  await editorC.settle();
  const confirmC = buttonByLabel(editorC.tree(), 'Confirmar edición');
  if (confirmC) editorC.press(confirmC);
  await editorC.settle();

  const handOffC = navigations[navigations.length - 1]?.[0] as {
    name?: string; params?: { scannerEditOutcome?: ScannerPageEditOutcome }; merge?: boolean; pop?: boolean;
  };
  record(handOffC?.pop === true, 'RF-C7a. the editor confirm still carries pop:true against the real scanner session');
  const outcomeC = handOffC?.params?.scannerEditOutcome;
  record(outcomeC?.pageId === pageA.id && outcomeC?.processedUri !== undefined, 'RF-C7b. the outcome targets the selected page with a real processed file');
  editorC.unmount();

  // Feed the editor's REAL payload through the REAL router against the REAL
  // stack, then hand the merged params to the still-mounted scanner.
  const poppedC = router.getStateForAction(
    stackState([
      { key: 'MoreHome-M', name: 'MoreHome' },
      { key: 'HomeCloud-H', name: 'HomeCloud' },
      { key: 'HomeCloudScanner-S1', name: 'HomeCloudScanner', params: scannerRouteParams },
      { key: 'ScannerImageEditor-E1', name: 'ScannerImageEditor', params: { page: pushedPage } },
    ]),
    CommonActions.navigate(handOffC as Record<string, unknown>),
    ROUTER_OPTIONS,
  );
  record(poppedC.routes.length === 3 && poppedC.routes[2].key === 'HomeCloudScanner-S1',
    'RF-C8a. the real router pops the editor and reuses the SAME scanner route key (no remount)');

  const setParamsBefore = setParamsCalls.length;
  scannerRouteParams = poppedC.routes[2].params as Record<string, unknown>;
  scanner.render();
  await scanner.settle();

  previewEl = previewImage(scanner.tree());
  record((previewEl?.props?.source as { uri: string })?.uri === outcomeC?.processedUri,
    'RF-C9a. the confirmed processed image is displayed in the preview (Review, not camera)');
  record(findOne(scanner.tree(), (element) => element.type === 'CameraView') === null,
    'RF-C9b. confirming does NOT restart the camera phase');
  pages = pageData(scanner.tree());
  record(pages.length === 2 && pages[0].id === pageA.id && pages[1].id === pageB.id,
    'RF-C9c. confirmation preserves BOTH captured pages and their identities');
  record(pages[0].processedUri === outcomeC?.processedUri && pages[1].processedUri === initialPageBProcessed,
    'RF-C9d. only the edited page adopted the processed image (independent edits)');
  record(pages[0].edit?.rotationSteps === 1, 'RF-C9e. the canonical edit parameters were adopted');
  record(thumbImages(scanner.tree())[0] === outcomeC?.processedUri, 'RF-C9f. the thumbnail shows the corrected image');
  record(setParamsCalls.length === setParamsBefore + 1 && setParamsCalls[setParamsCalls.length - 1]?.scannerEditOutcome === undefined,
    'RF-C9g. the outcome param is consumed one-shot and cleared (no stale re-adoption)');
  record(printCalls.length === 0, 'RF-C9h. confirming does NOT generate a PDF');
  record(registerCalls() === 0, 'RF-C9i. confirming does NOT upload anything');
  record(goBacks.length === 0, 'RF-C9j. confirming does NOT navigate away (the review session continues)');
  // PATCH 1C (I) — the page-action ⋯ is GONE: Repetir/Editar/Eliminar and the
  // reorder controls are visible directly on the review surface.
  record(
    buttonByTitle(scanner.tree(), '+ Página') !== null
      && buttonByTitle(scanner.tree(), 'Repetir') !== null
      && buttonByTitle(scanner.tree(), 'Eliminar') !== null
      && buttonByTitle(scanner.tree(), 'Guardar PDF') !== null,
    'RF-C9k. review keeps Add, VISIBLE page actions and Save PDF after confirmation',
  );
  record(
    buttonByLabel(scanner.tree(), 'Acciones de la página') === null,
    'RF-C9k2. PATCH 1C: no page-action ⋯ overflow remains (everyday actions are visible)',
  );

  // ── RF-C9m: HC-POL-022 — the multipage review NEVER edits pages globally ──
  //
  // Perspective, rotation and crop belong to ONE page, in that page's own
  // editor. A review surface that offered them globally would let a single tap
  // modify every confirmed page at once, which is exactly the accident this
  // contract exists to make impossible.
  record(
    buttonByTitle(scanner.tree(), 'Corregir perspectiva') === null
      && buttonByTitle(scanner.tree(), 'Rotar') === null
      && buttonByTitle(scanner.tree(), 'Rotar 90°') === null
      && buttonByTitle(scanner.tree(), 'Recortar') === null,
    'RF-C9m. the multipage review offers NO global perspective, rotation or crop',
  );
  // The page-SET actions it does offer: add, reorder (both directions), save.
  // PATCH 1C (I): the one-step reorder row is VISIBLE when N > 1.
  record(
    buttonByTitle(scanner.tree(), '← Mover antes') !== null
      && buttonByTitle(scanner.tree(), 'Mover después →') !== null,
    'RF-C9n. the multipage review offers the VISIBLE one-step reorder actions (HC-POL-022)',
  );

  // ── RF-C9p: reorder is a real, bounded, discrete step ──
  // The selected page at this point is the confirmed one (pageA, first).
  const moveLater = buttonByTitle(scanner.tree(), 'Mover después →');
  const moveEarlier = buttonByTitle(scanner.tree(), '← Mover antes');
  if (moveLater && moveEarlier) {
    scanner.press(moveLater);
    await scanner.settle();
    let reordered = pageData(scanner.tree());
    record(reordered.length === 2 && reordered[0].id === pageB.id && reordered[1].id === pageA.id,
      'RF-C9p. one step moves the selected page later (the order really changes)');
    record(buttonByTitle(scanner.tree(), 'Mover después →')?.props?.disabled === true,
      'RF-C9q. the later step disables itself at the end of the list');
    const moveEarlierAfter = buttonByTitle(scanner.tree(), '← Mover antes');
    if (moveEarlierAfter) {
      scanner.press(moveEarlierAfter);
      await scanner.settle();
      const restored = pageData(scanner.tree());
      record(restored.length === 2 && restored[0].id === pageA.id && restored[1].id === pageB.id,
        'RF-C9r. one step back restores the order (each step is discrete and visible)');
    } else {
      record(false, 'RF-C9r. one step back restores the order (each step is discrete and visible)');
    }
  } else {
    record(false, 'RF-C9p. reorder actions are present and driven');
  }

  // ── RF-C10: re-edit and reconfirm the same page ──
  perspectiveCalls.length = 0;
  const reEdit = buttonByLabel(scanner.tree(), 'Editar la página seleccionada');
  if (reEdit) scanner.press(reEdit);
  await scanner.settle();
  const reSnapshot = (navigations[navigations.length - 1]?.[1] as { page?: ScannerPage } | undefined)?.page;
  record(reSnapshot?.processedUri === outcomeC?.processedUri && reSnapshot?.edit?.rotationSteps === 1,
    'RF-C10a. re-edit receives the saved canonical parameters and the current processed file');
  editorLivePage = reSnapshot as ScannerPage;
  const editorD = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: editorLivePage }; });
  await editorD.settle();
  const confirmD = buttonByLabel(editorD.tree(), 'Confirmar edición');
  if (confirmD) editorD.press(confirmD);
  await editorD.settle();
  const handOffD = navigations[navigations.length - 1]?.[0] as {
    params?: { scannerEditOutcome?: ScannerPageEditOutcome }; pop?: boolean;
  };
  const outcomeD = handOffD?.params?.scannerEditOutcome;
  record(perspectiveCalls.length === 1 && readsOf().includes('file:///tmp/capture_1.jpg'),
    'RF-C10b. re-edit applies to the ORIGINAL with the saved parameters');
  record(outcomeD?.processedUri !== undefined && outcomeD?.processedUri !== outcomeC?.processedUri,
    'RF-C10c. reconfirm hands off a freshly regenerated processed file');
  editorD.unmount();

  const poppedD = router.getStateForAction(
    stackState([
      { key: 'MoreHome-M', name: 'MoreHome' },
      { key: 'HomeCloud-H', name: 'HomeCloud' },
      { key: 'HomeCloudScanner-S1', name: 'HomeCloudScanner', params: scannerRouteParams },
      { key: 'ScannerImageEditor-E2', name: 'ScannerImageEditor', params: { page: reSnapshot } },
    ]),
    CommonActions.navigate(handOffD as Record<string, unknown>),
    ROUTER_OPTIONS,
  );
  scannerRouteParams = poppedD.routes[2].params as Record<string, unknown>;
  scanner.render();
  await scanner.settle();

  record(deletesOf(String(outcomeC?.processedUri)) === 1, 'RF-C10d. reconfirm replaced the previous processed file (deleted exactly once, Scanner-owned)');
  previewEl = previewImage(scanner.tree());
  record((previewEl?.props?.source as { uri: string })?.uri === outcomeD?.processedUri, 'RF-C10e. the preview shows the re-confirmed image');
  pages = pageData(scanner.tree());
  record(pages.length === 2 && pages[1].processedUri === initialPageBProcessed, 'RF-C10f. the second page is still untouched');

  // ── RF-C11: cancel preserves the previous processed image (live session) ──
  perspectiveCalls.length = 0;
  const cancelEdit = buttonByLabel(scanner.tree(), 'Editar la página seleccionada');
  if (cancelEdit) scanner.press(cancelEdit);
  await scanner.settle();
  const cancelSnapshot = (navigations[navigations.length - 1]?.[1] as { page?: ScannerPage } | undefined)?.page;
  editorLivePage = cancelSnapshot as ScannerPage;
  const editorE = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: editorLivePage }; });
  await editorE.settle();
  const writesBeforeCancelE = fsCalls.filter((call) => call.op === 'write').length;
  const cancelE = buttonByLabel(editorE.tree(), 'Cancelar edición');
  if (cancelE) editorE.press(cancelE);
  await editorE.settle();
  editorE.unmount();
  record(goBacks.length === 1, 'RF-C11a. cancel pops the editor back to the review session');
  record(fsCalls.filter((call) => call.op === 'write').length === writesBeforeCancelE,
    'RF-C11b. cancellation creates no unconfirmed processed artifact');
  record(deletesOf(String(outcomeD?.processedUri)) === 0, 'RF-C11c. the confirmed processed image survives the cancelled edit');

  scanner.render();
  await scanner.settle();
  previewEl = previewImage(scanner.tree());
  record((previewEl?.props?.source as { uri: string })?.uri === outcomeD?.processedUri,
    'RF-C11d. after cancel, review still shows the last CONFIRMED image (no lost state)');

  // ── RF-C12: two separately edited pages ──
  // PATCH 1C (J): the thumbnail SELECTS page B; the visible Editar pushes its
  // editor with the selected snapshot.
  const rowsB = thumbRows(scanner.tree());
  scanner.press(rowsB[1]);
  await scanner.settle();
  const editPageB = buttonByLabel(scanner.tree(), 'Editar la página seleccionada');
  if (editPageB) scanner.press(editPageB);
  await scanner.settle();
  previewEl = previewImage(scanner.tree());
  record((previewEl?.props?.source as { uri: string })?.uri === getPageEffectiveUri(pageB),
    'RF-C12a. the second page is selectable with its own confirmed capture');
  perspectiveCalls.length = 0;
  const snapshotB = (navigations[navigations.length - 1]?.[1] as { page?: ScannerPage } | undefined)?.page;
  editorLivePage = snapshotB as ScannerPage;
  const editorF = mountView(() => editorScreen.ScannerImageEditorScreen(), () => { routeParams = { page: editorLivePage }; });
  await editorF.settle();
  const rotateF = buttonByTitle(editorF.tree(), 'Rotar');
  if (rotateF) editorF.press(rotateF);
  await editorF.settle();
  const confirmF = buttonByLabel(editorF.tree(), 'Confirmar edición');
  if (confirmF) editorF.press(confirmF);
  await editorF.settle();
  const handOffF = navigations[navigations.length - 1]?.[0] as {
    params?: { scannerEditOutcome?: ScannerPageEditOutcome }; pop?: boolean;
  };
  const outcomeF = handOffF?.params?.scannerEditOutcome;
  editorF.unmount();
  record(outcomeF?.pageId === pageB.id, 'RF-C12b. the second page is edited independently (its own outcome)');

  const poppedF = router.getStateForAction(
    stackState([
      { key: 'MoreHome-M', name: 'MoreHome' },
      { key: 'HomeCloud-H', name: 'HomeCloud' },
      { key: 'HomeCloudScanner-S1', name: 'HomeCloudScanner', params: scannerRouteParams },
      { key: 'ScannerImageEditor-E3', name: 'ScannerImageEditor', params: { page: snapshotB } },
    ]),
    CommonActions.navigate(handOffF as Record<string, unknown>),
    ROUTER_OPTIONS,
  );
  scannerRouteParams = poppedF.routes[2].params as Record<string, unknown>;
  scanner.render();
  await scanner.settle();

  pages = pageData(scanner.tree());
  record(pages.length === 2
    && pages[0].processedUri === outcomeD?.processedUri
    && pages[1].processedUri === outcomeF?.processedUri,
    'RF-C12c. BOTH pages now carry their own confirmed processed images');
  record(getPageEffectiveUri(pages[0]) === outcomeD?.processedUri && getPageEffectiveUri(pages[1]) === outcomeF?.processedUri,
    'RF-C12d. the effective image of each page is its processed file');
  record(printCalls.length === 0 && registerCalls() === 0, 'RF-C12e. still no PDF and no upload — everything so far was user-driven review only');

  // ── RF-C13: one user-driven PDF that references BOTH effective URIs ──
  const createPdf = buttonByTitle(scanner.tree(), 'Guardar PDF');
  record(createPdf !== null && createPdf?.props?.disabled !== true, 'RF-C13a. Guardar PDF is enabled with two pages');
  if (createPdf) scanner.press(createPdf);
  await scanner.settle();
  const sheet = findOne(scanner.tree(), (element) => element.type === 'ActionSheet' && element.props?.visible === true);
  record(sheet !== null, 'RF-C13b. the save sheet opens on request');
  const footer = sheet?.props?.footer as TestElement | undefined;
  record(footer?.props?.title === 'Guardar escaneo' && typeof footer?.props?.onPress === 'function', 'RF-C13c. the sheet offers the explicit Guardar action');
  if (footer) scanner.press(footer);
  await scanner.settle(80);

  const readUris = readsOf();
  const pdfReadUris = readUris.slice(-2);
  record(pdfReadUris.length === 2 && pdfReadUris[0] === outcomeD?.processedUri && pdfReadUris[1] === outcomeF?.processedUri,
    'RF-C13d. the PDF embeds BOTH effective processed images, in page order, never the originals');
  record(printCalls.length === 1, 'RF-C13e. exactly one PDF was generated (user-driven, after both edits)');
  const html = printCalls[0] ?? '';
  record(html.includes(`base64::${outcomeD?.processedUri}`) && html.includes(`base64::${outcomeF?.processedUri}`),
    'RF-C13f. the generated HTML carries both effective images');
  record(goBacks.length === 1, 'RF-C13g. the failing submit keeps the Scanner open (goBack count unchanged — retry is possible)');

  // ── RF-C14: structural guards against re-introducing the defect ──
  const editorSource = readSource('screens/ScannerImageEditorScreen.tsx');
  record(/pop:\s*true/.test(editorSource), 'RF-C14a. the editor hand-off keeps pop:true (source guard)');
  const scannerSource = readSource('screens/HomeCloudScannerScreen.tsx');
  const allPushes = (scannerSource.match(/\bnavigate\(/g) ?? []).length;
  const editorPushes = (scannerSource.match(/navigate\('ScannerImageEditor'/g) ?? []).length;
  record(allPushes === editorPushes && editorPushes === 2,
    'RF-C14b. both capture and page tap navigate only to the one canonical editor route');

  // ── RF-C15: adoption semantics on the pure page model (no-op for ghosts) ──
  {
    const ghost = adoptPageEditOutcome(pages, { pageId: 'ghost', edit: { cropRect: geometry.FULL_CROP_RECT, rotationSteps: 0 }, processedUri: 'file:///tmp/x.jpg' });
    record(ghost.every((page) => page.id !== 'ghost'), 'RF-C15a. a late outcome for an unknown page is a no-op (no resurrection)');
  }

  // ── RF-C16: PATCH 1C (J) — a thumbnail tap only SELECTS its page ──
  //
  // Placed last on purpose: the selection changes which page the preview and
  // the visible actions address, and no assertion after this one depends on
  // it. The editor is reached ONLY through the visible `Editar` action.
  {
    const finalRows = thumbRows(scanner.tree());
    const navigationsBeforeThumb = navigations.length;
    if (finalRows.length >= 2) {
      scanner.press(finalRows[1]);
      await scanner.settle();
      record(navigations.length === navigationsBeforeThumb,
        'RF-C16a. PATCH 1C: tapping a thumbnail SELECTS the page — it never opens the editor',
      );
      const livePages = pageData(scanner.tree());
      const liveB = livePages.find((page) => page.id === pageB.id);
      record(liveB !== undefined
        && (previewImage(scanner.tree())?.props?.source as { uri?: string })?.uri === (liveB ? getPageEffectiveUri(liveB) : null),
        'RF-C16b. the review preview follows the tapped (selected) page');
      const editSelected = buttonByLabel(scanner.tree(), 'Editar la página seleccionada');
      record(editSelected !== null
        && (editSelected?.props?.accessibilityLabel as string | undefined) === 'Editar la página seleccionada',
        'RF-C16c. Editar addresses the selected page through the one editor route');
    } else {
      record(false, 'RF-C16a. tapping a thumbnail selects THAT page (HC-POL-022)');
    }
  }

  scanner.unmount();

  console.log(`\nSCANNER_B1_REVIEW_FLOW_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('SCANNER_B1_REVIEW_FLOW_TESTS=FAIL');
  } else {
    console.log('SCANNER_B1_REVIEW_FLOW_TESTS=PASS');
  }
}

void main();
