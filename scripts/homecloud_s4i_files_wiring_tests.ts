/**
 * HomeCloud S4-i — the REAL Files read wiring: screen -> controller -> read.
 *
 * GAP-8 was that no evidence existed for the wiring that only the surface has:
 * `HomeCloudFilesScreen` composes a browser read out of its own state (token,
 * folder, query, sort) plus the controller's page window (limit, offset) and
 * hands it to `createFilesPagination`. Until now only the controller in
 * isolation was tested, over an injected read, so the part that can actually
 * drop `query`, `sort` or `folderId` — the composition itself — was untested.
 *
 * THIS DOES NOT COPY THAT COMPOSITION. The screen module is compiled and
 * executed as-is; the test only supplies what a device would supply:
 *
 *   - `react`: the hooks the screen calls, with mount/update semantics.
 *   - `react-native`: the presentational primitives as inert host types.
 *   - `@react-navigation/native`: a navigation object and a focus effect.
 *   - `AuthContext` / `HouseholdContext`: a signed-in member in a household.
 *   - `components/ui`, `constants/icons`, `FileIntake`, `homecloudDownloadService`:
 *     leaves that belong to intake/download, not to the Files read.
 *
 * Everything under test is the real thing: `HomeCloudFilesScreen`,
 * `createFilesPagination`, `fetchFilesBrowser`, `requestJson`, the cached
 * folder/capabilities reads and the read-reconciliation registry. The only
 * fake is the transport, which answers with the same contract the real backend
 * `browseFiles` implements (limit clamp, offset window, global root search,
 * `nextOffset` only on a full page).
 *
 * The host is deliberately NOT React Native and NOT React: it renders one
 * component and drives the affordances the surface itself renders. That is why
 * these assertions are limited to the READ contract (which request is emitted,
 * with which window, and what ends up in the list) and say nothing about
 * rendering, animation or native modules. Device behaviour stays QA.
 */

import * as path from 'node:path';
import { FILES_BROWSER_MAX_LIMIT } from '../front/mi-front-limpio/services/homecloud/homecloudFilesService';
import { plannerCache } from '../front/mi-front-limpio/services/planner/plannerCache';
import { __resetHomeCloudReadReconciliationForTests } from '../front/mi-front-limpio/services/homecloud/homecloudReadReconciliation';

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

// ── the host: hooks for one mounted component ────────────────────────────────

type EffectCallback = () => void | (() => void);

type Slot = {
  initialized: boolean;
  deps?: readonly unknown[];
  value: unknown;
  cleanup?: () => void;
};

type ScheduledEffect = { slot: Slot; run: EffectCallback };

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
  Fragment: symbol;
};

function createHookHost(): HookHost {
  const slots: Slot[] = [];
  let cursor = 0;
  let scheduled: ScheduledEffect[] = [];
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
    if (renders > MAX_RENDERS) throw new Error('S4-i: the Files surface never stopped re-rendering');
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
    createElement: (type, props, ...children) => ({
      type,
      props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children },
    }),
    Fragment: Symbol.for('react.fragment'),
    // Only the test uses these; they are part of the same closure as the hooks.
    ...({
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
            if (guard > 50) throw new Error('S4-i: a single settle never converged');
            render(view);
            commit();
          }
        }
      },
    } as Record<string, unknown>),
  } as HookHost;
}

// ── what a device would provide ──────────────────────────────────────────────

let activeHost: HookHost | null = null;
let authState: { session: { access_token: string; user: { id: string } } | null } = { session: null };
let householdState: { currentHousehold: { id: string; name: string } | null } = { currentHousehold: null };

const hostModules = (): HookHost => {
  if (!activeHost) throw new Error('S4-i: no host is mounted');
  return activeHost;
};

const reactStub: Record<string, unknown> = {
  __esModule: true,
  useRef: (...args: unknown[]) => (hostModules().useRef as (...a: unknown[]) => unknown)(...args),
  useState: (...args: unknown[]) => (hostModules().useState as (...a: unknown[]) => unknown)(...args),
  useMemo: (...args: unknown[]) => (hostModules().useMemo as (...a: unknown[]) => unknown)(...args),
  useCallback: (...args: unknown[]) => (hostModules().useCallback as (...a: unknown[]) => unknown)(...args),
  useEffect: (...args: unknown[]) => (hostModules().useEffect as (...a: unknown[]) => unknown)(...args),
  createElement: (...args: unknown[]) => (hostModules().createElement as (...a: unknown[]) => unknown)(...args),
  // The shared reduced-motion hook (used by the HC-POL motion surfaces) is built
  // on `useSyncExternalStore`, so the stub has to expose it too.
  useSyncExternalStore: (subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => unknown) => {
    const useState = hostModules().useState as (initial: unknown) => readonly [unknown, (next: unknown) => void];
    const useEffect = hostModules().useEffect as (effect: () => unknown, deps?: readonly unknown[]) => void;
    const [value, setValue] = useState((() => getSnapshot()));
    useEffect(() => subscribe(() => setValue(getSnapshot())), []);
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
 * whether the responder claims a move stream — instead of only inspecting them.
 *
 * It was missing here and the Files screen CRASHED on mount once a pan responder
 * existed, which is why it is stated rather than assumed: a device boundary that is
 * absent from a harness is a harness gap, not a product result.
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
  PanResponder: panResponderStub,
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
  // The Files surface subscribes to app foreground as a freshness boundary, so the
  // device primitive is part of what this host must provide. It is inert here:
  // no test in this file drives it.
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
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
      interpolate(): this { return this; }
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
  // The viewer layer's box (HC-POL-012/057) is the window.
  useWindowDimensions: () => ({ width: 360, height: 640, scale: 2, fontScale: 1 }),
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
};
const iconsStub = { HomePlusIcon: 'HomePlusIcon' };
const fileIntakeStub = { FileIntake: 'FileIntake' };
const downloadStub = {
  downloadHomeCloudOriginal: async () => ({ localUri: 'file:///stub' }),
  shareHomeCloudDownloadedFile: async () => undefined,
  HomeCloudDownloadError: class HomeCloudDownloadError extends Error {},
};

/**
 * Intercepts ONLY the leaves listed below. The screen's own read modules, the
 * controller, `api.ts` and the real hooks consumers stay untouched.
 */
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
    ['FileIntake', fileIntakeStub],
    ['homecloudDownloadService', downloadStub],
  ];
  loader._load = function patched(request: string, parent: unknown, isMain: boolean): unknown {
    for (const [fragment, value] of byRequest) if (request === fragment) return value;
    for (const [fragment, value] of byFragment) if (request.includes(fragment)) return value;
    return original.call(this, request, parent, isMain);
  };
}

installModuleStubs();

type FilesScreenModule = { HomeCloudFilesView: () => unknown };

const screenModule: FilesScreenModule = require(
    path.join(__dirname, '..', 'front', 'mi-front-limpio', 'screens', 'HomeCloudFilesScreen.js'),
  ) as FilesScreenModule;

/**
 * The real filter menu module, required from the SAME compiled tree the screen
 * was compiled into, so the element identity compared below is the very component
 * the screen rendered rather than a second copy of it.
 */
const filterMenuModule = require(
  path.join(__dirname, '..', 'front', 'mi-front-limpio', 'services', 'homecloud', 'FilesFilterMenu.js'),
) as { FilesFilterMenu: (props: Record<string, unknown>) => unknown };

// ── transport: the backend `browseFiles` contract ────────────────────────────

const HOUSEHOLD_ID = 'hh-files';
const MEMBER_ID = 'mm-files';
const ROOT_FOLDER = { id: 'ff-recetas', name: 'Recetas', householdId: HOUSEHOLD_ID };
const OTHER_FOLDER = { id: 'ff-viajes', name: 'Viajes', householdId: HOUSEHOLD_ID };
const MAX_LIMIT = 100;

type Row = { id: string; folderId: string | null; displayName: string; note: string | null };

/** 101 loose files (the >100 case) plus three inside a folder. */
function dataset(): { rows: Row[]; folders: typeof ROOT_FOLDER[] } {
  const rows: Row[] = Array.from({ length: 101 }, (_, index) => ({
    id: `c-${String(index).padStart(3, '0')}`,
    folderId: null,
    // file-000 is the oldest, so `recent` and `name` cannot agree by accident.
    displayName: `file-${String(index).padStart(3, '0')}.txt`,
    note: index === 7 ? 'factura de luz' : null,
  }));
  rows[42] = { ...rows[42], displayName: 'factura-042.pdf' };
  for (const index of [1, 2, 3]) {
    rows.push({ id: `c-f${index}`, folderId: ROOT_FOLDER.id, displayName: `receta-0${index}.txt`, note: null });
  }
  return { rows, folders: [ROOT_FOLDER, OTHER_FOLDER] };
}

type Recorded = { pathname: string; params: URLSearchParams };

class BrowserTransport {
  readonly reads: Recorded[] = [];
  private readonly store = dataset();

  install(): void {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (input: unknown) => {
      const target = new URL(String(input));
      if (target.pathname === '/api/homecloud/files') {
        const params = target.searchParams;
        this.reads.push({ pathname: target.pathname, params: new URLSearchParams(target.search) });
        return json(200, { browser: this.browse(params) });
      }
      if (target.pathname === '/api/homecloud/folders') {
        return json(200, { folders: this.store.folders });
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
      return json(404, { code: 'not_found', message: `no route for ${target.pathname}` });
    }) as typeof fetch;
  }

  /**
   * Mirrors backend/src/services/homecloudFilesService.js `browseFiles`
   * INCLUDING the S4-iii C2 has-more probe: the requested `limit` is the logical
   * page size, the read answers up to `limit + 1` rows, and `nextOffset` is
   * non-null only when that extra row really exists. An exact page boundary
   * (100 files) therefore answers a FULL page with `nextOffset: null`.
   */
  private browse(params: URLSearchParams): unknown {
    const folderId = params.get('folderId');
    const search = (params.get('query') ?? '').trim();
    const sort = params.get('sort') ?? 'recent';
    const pageLimit = Math.min(Math.max(Number(params.get('limit')) || MAX_LIMIT, 1), MAX_LIMIT);
    const pageOffset = Math.max(Number(params.get('offset')) || 0, 0);

    let matched = this.store.rows.filter((row) => {
      if (folderId) return row.folderId === folderId;
      // Root listing shows loose files only; root SEARCH is global.
      if (!search) return row.folderId === null;
      const haystack = `${row.displayName} ${row.note ?? ''}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
    matched = sort === 'name'
      ? [...matched].sort((a, b) => (a.displayName < b.displayName ? -1 : 1))
      : [...matched].sort((a, b) => (a.id < b.id ? 1 : -1));

    const window = matched.slice(pageOffset, pageOffset + pageLimit + 1);
    const hasMore = window.length > pageLimit;
    const page = hasMore ? window.slice(0, pageLimit) : window;
    const folders = folderId
      ? []
      : this.store.folders.filter((folder) => !search || folder.name.toLowerCase().includes(search.toLowerCase()));
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

  displayNameOf(id: string): string {
    return this.store.rows.find((row) => row.id === id)?.displayName ?? id;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// ── driving the surface the way a member does ────────────────────────────────

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
}

function findAll(tree: unknown, predicate: (element: TestElement) => boolean): TestElement[] {
  const found: TestElement[] = [];
  walk(tree, (element) => {
    if (predicate(element)) found.push(element);
  });
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
  if (!list) {
    const titles = findAll(tree, (element) => typeof element.props?.title === 'string')
      .map((element) => String(element.props.title));
    const types = [...new Set(findAll(tree, () => true).map((element) => String(element.type)))];
    const texts = findAll(tree, (element) => typeof element.props?.children === 'string')
      .map((element) => String(element.props.children));
    throw new Error(`S4-i: the surface is not rendering its file list (loading: ${types.includes('ActivityIndicator')}, types: ${types.join(',')}, titles: ${titles.join(' | ') || 'none'}, texts: ${texts.join(' | ') || 'none'})`);
  }
  return list;
}

function listedIds(tree: unknown): string[] {
  return (listOf(tree).props as ListProps).data.map((item) => `${item.kind}:${item.value.id}`);
}

function listedFileIds(tree: unknown): string[] {
  return listedIds(tree).filter((id) => id.startsWith('file:')).map((id) => id.slice('file:'.length));
}

/**
 * STAGE 2 REOPEN — the load-more affordance is GONE.
 *
 * Pagination became automatic, so a normal scroll must never stop on a button. The list
 * pages itself through `onEndReached`, which is exactly what a scroll reaches, so this
 * drives that instead. The 100/101 boundary assertions below are unchanged: what is
 * being proven is that reaching the 101st file costs a second read at the right offset,
 * not that a button exists.
 */
function pressLoadMore(tree: unknown): boolean {
  const trigger = listOf(tree)?.props?.onEndReached;
  if (typeof trigger !== 'function') return false;
  (trigger as () => void)();
  return true;
}

/** The paging affordance the member used to have to press. It must not exist. */
function hasLoadMoreCta(tree: unknown): boolean {
  const footer = listOf(tree)?.props?.ListFooterComponent;
  if (!footer) return false;
  return findAll(footer, (element) => element.props?.title === 'Mostrar más archivos').length > 0;
}

function typeSearch(tree: unknown, text: string): boolean {
  const input = findOne(tree, (element) => element.props?.variant === 'search' && typeof element.props?.onChangeText === 'function');
  if (!input) return false;
  input.props.onChangeText(text);
  return true;
}

/**
 * STAGE 2 (Phase 2) SUPERSESSION. The sort control was the titled button the
 * header owned, found next to the refresh control as the only titled sibling in
 * that row. Stage 2 removed the permanent refresh icon and moved BOTH sort and
 * the Favoritos mode behind ONE compact filter icon, so that sibling no longer
 * exists and the control is reached in two real steps: open the filter menu, then
 * choose the order.
 *
 * What is asserted did NOT weaken. The same four behaviors are still proven
 * end-to-end: the control is reachable, the chosen order is what the READ
 * receives, the new order starts a new window at offset 0, and exactly ONE read
 * is spent. Nothing here depends on what the control is called; it is found by
 * the filter icon's own accessibility label and the order chip's own label.
 */
async function chooseSortThroughFilterMenu(surface: { tree: unknown; settle: () => Promise<void> }, orderLabel: string): Promise<boolean> {
  const filterIcon = findOne(surface.tree, (element) => typeof element.props?.accessibilityLabel === 'string'
    && element.props.accessibilityLabel.startsWith('Filtros y orden.')
    && typeof element.props?.onPress === 'function');
  if (!filterIcon) return false;
  filterIcon.props.onPress();
  await surface.settle();

  // This host does not EXECUTE function components: it records the element the
  // screen created. The filter menu is one of those, so its own options are
  // reached by rendering the component with the props the SCREEN gave it - the
  // same technique this suite already uses for the canonical File action host.
  // Nothing is re-implemented and no callback is called blind: the chip found is
  // the real chip, and pressing it invokes the real handler the screen wired up.
  const menuElement = findOne(surface.tree, (element) => element.type === filterMenuModule.FilesFilterMenu);
  if (!menuElement) return false;
  const rendered = filterMenuModule.FilesFilterMenu(menuElement.props as Record<string, unknown>);
  const chip = findOne(rendered, (element) => element.props?.label === orderLabel
    && typeof element.props?.onPress === 'function');
  if (!chip) return false;
  chip.props.onPress();
  return true;
}

/** Enter a folder through the callback the list was given for that tile. */
function pressFolder(tree: unknown, folderId: string): boolean {
  const props = listOf(tree).props as ListProps;
  const index = props.data.findIndex((item) => item.kind === 'folder' && item.value.id === folderId);
  if (index === -1) return false;
  const tile = props.renderItem({ item: props.data[index], index }) as TestElement;
  if (typeof tile?.props?.onPress !== 'function') return false;
  tile.props.onPress();
  return true;
}

type Mounted = { tree: unknown; settle: () => Promise<void>; unmount: () => void };

function mountSurface(transport: BrowserTransport): Mounted {
  plannerCache.__testOnly_clearAll();
  __resetHomeCloudReadReconciliationForTests();
  transport.install();
  authState = { session: { access_token: 'tok-files-s4i', user: { id: MEMBER_ID } } };
  householdState = { currentHousehold: { id: HOUSEHOLD_ID, name: 'Casa' } };

  const host = createHookHost();
  activeHost = host;
  const view = screenModule.HomeCloudFilesView;
  const internals = host as unknown as {
    __render: (view: () => unknown) => unknown;
    __commit: () => void;
    __lastTree: () => unknown;
    __unmount: () => void;
    __settle: (view: () => unknown, rounds: number, waitMs: number) => Promise<void>;
  };
  internals.__render(view);
  internals.__commit();

  const settle = async (): Promise<void> => {
    await internals.__settle(view, 12, 30);
  };
  return {
    get tree() { return internals.__lastTree(); },
    settle,
    unmount: () => internals.__unmount(),
  };
}

// ── S4-i A: 101 files through the real surface ───────────────────────────────

async function testOverOneHundredFiles(): Promise<void> {
  console.log('\n=== S4-i A: the real surface reaches every file past the first page ===');
  const transport = new BrowserTransport();
  const surface = mountSurface(transport);
  await surface.settle();

  const firstPage = transport.fileReads()[0];
  record(!!firstPage, 'A1. mounting the surface issues a files read');
  record(firstPage?.params.get('limit') === String(MAX_LIMIT) && firstPage?.params.get('offset') === '0',
    'A2. that read asks for the backend page size at offset 0');
  record(transport.fileReads().every((read) => read.params.get('limit') === String(MAX_LIMIT)),
    'A3. the surface never asks for a page size of its own');
  record(transport.fileReads().every((read) => read.params.get('offset') !== null),
    'A4. every read carries an explicit offset, so no page is ever ambiguous');
  record(listedFileIds(surface.tree).length === MAX_LIMIT, 'A5. the first page holds 100 items with nothing truncated');

  const readsBeforeMore = transport.fileReads().length;
  record(hasLoadMoreCta(surface.tree) === false,
    'A6. a full page renders NO load-more affordance — the list pages itself');
  record(pressLoadMore(surface.tree), 'A6a. and the pagination trigger is wired and reachable');
  await surface.settle();

  const secondPage = transport.fileReads().filter((read) => read.params.get('offset') === String(MAX_LIMIT));
  record(transport.fileReads().length > readsBeforeMore, 'A7. reaching the rest costs another read');
  record(secondPage.length === 1, 'A8. the follow-up read starts exactly where the page ended');
  record(transport.fileReads().some((read) => read.params.get('offset') === '0') && secondPage.length >= 1,
    'A9. reaching 101 files took at least two page reads');

  const fileIds = listedFileIds(surface.tree);
  record(fileIds.length === 101, 'A10. all 101 files are listed, not 100');
  record(new Set(fileIds).size === fileIds.length, 'A11. and none of them is duplicated');
  record(listedIds(surface.tree).some((id) => id === `folder:${ROOT_FOLDER.id}`), 'A12. the root listing also carries its folders');
  surface.unmount();
}

// ── S4-i B/C/D: query, sort and folder reach the read ────────────────────────

async function testQueryReachesTheRead(): Promise<void> {
  console.log('\n=== S4-i B: the search box reaches the read ===');
  const transport = new BrowserTransport();
  const surface = mountSurface(transport);
  await surface.settle();

  record(typeSearch(surface.tree, 'factura'), 'B1. the search box is reachable');
  await surface.settle();

  const read = transport.lastFileRead();
  record(read?.params.get('query') === 'factura', 'B2. the typed query is the one sent to the read');
  record(read?.params.get('offset') === '0' && read?.params.get('limit') === String(MAX_LIMIT),
    'B3. a new search starts a new window at offset 0');
  const ids = listedIds(surface.tree).filter((id) => id.startsWith('file:'));
  record(ids.length === 2, 'B4. the list shows only what the read matched');
  record(ids.includes('file:c-007') && ids.includes('file:c-042'), 'B5. by name AND by note, as the backend matches');
  surface.unmount();
}

async function testSortReachesTheRead(): Promise<void> {
  console.log('\n=== S4-i C: the sort control reaches the read ===');
  const transport = new BrowserTransport();
  const surface = mountSurface(transport);
  await surface.settle();

  const newestFirst = listedFileIds(surface.tree)[0];
  record(transport.lastFileRead()?.params.get('sort') === 'recent', 'C1. the surface starts on the default sort');
  record(newestFirst === 'c-100', 'C2. and the list follows it (newest first, as the read ordered it)');

  record(await chooseSortThroughFilterMenu(surface, 'A-Z'), 'C3. the sort control is reachable through the filter menu');
  await surface.settle();

  const read = transport.lastFileRead();
  record(read?.params.get('sort') === 'name', 'C4. the new sort is the one sent to the read');
  record(read?.params.get('offset') === '0', 'C5. a new sort starts a new window instead of appending');
  const names = listedFileIds(surface.tree).map((id) => transport.displayNameOf(id));
  record(names.every((name, index) => index === 0 || names[index - 1].localeCompare(name) <= 0),
    'C6. and the list follows it (alphabetical, as the read ordered it)');
  // S4-iii B2: ONE intentional sort change costs EXACTLY ONE read. It used to
  // assert ">= 3", which is what the duplicate debounce + focus load produced.
  record(transport.fileReads().length === 2,
    'C7. and the sort cost exactly ONE read, not a debounce read plus a focus read');
  surface.unmount();
}

async function testFolderReachesTheRead(): Promise<void> {
  console.log('\n=== S4-i D: entering a folder reaches the read ===');
  const transport = new BrowserTransport();
  const surface = mountSurface(transport);
  await surface.settle();

  record(pressFolder(surface.tree, ROOT_FOLDER.id), 'D1. a folder tile is reachable');
  await surface.settle();

  const read = transport.lastFileRead();
  record(read?.params.get('folderId') === ROOT_FOLDER.id, 'D2. the folder is the one sent to the read');
  record(read?.params.get('offset') === '0' && read?.params.get('limit') === String(MAX_LIMIT),
    'D3. a folder opens its own window at offset 0');
  const ids = listedIds(surface.tree).filter((id) => id.startsWith('file:'));
  record(ids.length === 3 && ids.every((id) => id.startsWith('file:c-f')), 'D4. the list shows that folder alone');
  surface.unmount();
}

async function main(): Promise<void> {
  console.log('=== HOMECLOUD S4-i FILES READ WIRING TESTS ===');
  record(FILES_BROWSER_MAX_LIMIT === MAX_LIMIT, 'A0. the page size is the one the backend clamps to');

  await testOverOneHundredFiles();
  await testQueryReachesTheRead();
  await testSortReachesTheRead();
  await testFolderReachesTheRead();

  console.log(`\nHOMECLOUD_S4I_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    console.error('HOMECLOUD_S4I_TESTS=FAIL');
    process.exitCode = 1;
  } else {
    console.log('HOMECLOUD_S4I_TESTS=PASS');
  }
}

void main();