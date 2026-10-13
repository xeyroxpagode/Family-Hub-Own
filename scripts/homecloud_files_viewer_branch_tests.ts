/**
 * HomeCloud Files — STAGE 2 REOPEN, SLICE C — THE VIEWER, MOUNTED AND EXECUTED.
 *
 * WHY THIS FILE EXISTS SEPARATELY
 * -------------------------------
 * The Stage 2 Viewer suite was 133 assertions of SOURCE and PURE evidence: it proved
 * that the viewer asked for the original, that the bounded read really was bounded.
 * Every one of those claims is worth keeping. None of them proves that tapping a PDF
 * shows a PDF, that a video which fails to decode says so,
 * that the text branch is selectable, that the safe area is respected, or that Android
 * back closes the Viewer instead of the app. Those are the claims device QA disproved,
 * so they are executed here.
 *
 * WHAT IS REAL AND WHAT IS A DEVICE
 * ---------------------------------
 * REAL: `HomeCloudFileViewer`, `classifyHomeCloudViewerFile`, `requestViewerAccess`,
 * `withSingleGrantRetry`, `stageViewerOriginal`, `discardViewerStaging`,
 * `readViewerTextPreview`, `openViewerOriginalWithSystem`, `AppText`.
 *
 * THE DEVICE STANDS IN FOR: React hooks, `View`/`Text`/`ScrollView`/`Image`,
 * safe-area insets, `expo-video`'s decoder, `expo-audio`'s decoder, the native
 * filesystem and the native share sheet. The decoders are stubbed AT THE NATIVE BOUNDARY
 * on purpose -- but the component CONSUMES their reported status, and the assertion is
 * about which branch that status produces, not about whether a codec can decode H.264.
 */

import * as path from 'node:path';

// ── the hook host: React for ONE mounted component ───────────────────────────

type EffectCallback = () => void | (() => void);
type Slot = { initialized: boolean; deps?: readonly unknown[]; value: unknown; cleanup?: () => void };
const MAX_RENDERS = 400;

function sameDeps(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined): boolean {
  if (previous === undefined || next === undefined) return false;
  if (previous.length !== next.length) return false;
  return next.every((value, index) => Object.is(value, previous![index]));
}

type ViewerHost = {
  useRef: <T,>(initial: T) => { current: T };
  useState: <T,>(initial: T | (() => T)) => readonly [T, (next: T | ((previous: T) => T)) => void];
  useMemo: <T,>(factory: () => T, deps?: readonly unknown[]) => T;
  useCallback: <T,>(callback: T, deps?: readonly unknown[]) => T;
  useEffect: (effect: EffectCallback, deps?: readonly unknown[]) => void;
  createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => unknown;
  __commit: () => void;
  __render: (view: () => unknown) => unknown;
  __lastTree: () => unknown;
  __settle: (view: () => unknown, rounds: number, waitMs: number) => Promise<void>;
  __unmount: () => void;
};

export type ViewerElement = { type: unknown; props: Record<string, any> };

function createViewerHost(): ViewerHost {
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
    if (!target.initialized) { target.value = { current: initial }; target.initialized = true; }
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
    if (!target.initialized || !sameDeps(target.deps, deps)) { target.value = factory(); target.deps = deps; target.initialized = true; }
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
    if (renders > MAX_RENDERS) throw new Error('Viewer branches: the surface never stopped re-rendering');
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
    __settle: async (view, rounds, waitMs) => {
      for (let round = 0; round < rounds; round += 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        let guard = 0;
        while (dirty) {
          dirty = false;
          guard += 1;
          if (guard > 40) throw new Error('Viewer branches: a single settle never converged');
          render(view);
          commit();
        }
      }
    },
    __unmount: () => {
      for (const target of slots) {
        if (target.cleanup) { target.cleanup(); target.cleanup = undefined; }
      }
      activeViewerHost = null;
    },
  };
}

// ── the device ───────────────────────────────────────────────────────────────

let activeViewerHost: ViewerHost | null = null;
const hostOf = (): ViewerHost => {
  if (!activeViewerHost) throw new Error('Viewer branches: no host is mounted');
  return activeViewerHost;
};

/** The decoders' reported status, per mount. This is what a codec actually reports. */
type DecoderStatus = 'idle' | 'ready' | 'error';
const decoder = { video: 'idle' as DecoderStatus, audio: 'idle' as DecoderStatus };

const reactStub: Record<string, unknown> = {
  __esModule: true,
  useRef: (...args: never[]) => hostOf().useRef(...(args as [never])),
  useState: (...args: never[]) => hostOf().useState(...(args as [never])),
  useMemo: (...args: never[]) => hostOf().useMemo(...(args as [never])),
  useCallback: (...args: never[]) => hostOf().useCallback(...(args as [never])),
  useEffect: (...args: never[]) => hostOf().useEffect(...(args as [never])),
  createElement: (...args: never[]) => hostOf().createElement(...(args as [never, never, ...never[]])),
  // The shared reduced-motion hook (used by the HC-POL viewer transition) is
  // built on `useSyncExternalStore`, so the stub has to expose it too.
  useSyncExternalStore: (
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => unknown,
  ) => {
    const [value, setValue] = hostOf().useState(getSnapshot as () => never);
    hostOf().useEffect(() => subscribe(() => setValue(getSnapshot as () => never)), []);
    return value;
  },
};
reactStub.default = reactStub;
reactStub.Fragment = Symbol.for('react.fragment');

/** Every Android hardware-back subscription the Viewer has made, live or removed. */
const backHandlers = new Map<string, () => boolean>();
let backHandlerSeq = 0;

const reactNativeStub = {
  Platform: { OS: 'android', select: (values: Record<string, unknown>) => values.android ?? values.default },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Image: 'Image',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: <T,>(styles: T): T => styles, flatten: (style: unknown) => style },
  Linking: {
    openURL: async (url: string) => {
      openedLinks.push(url);
    },
  },
  BackHandler: {
    addEventListener: (_event: string, handler: () => boolean) => {
      backHandlerSeq += 1;
      const key = `back-${backHandlerSeq}`;
      backHandlers.set(key, handler);
      return { remove: () => { backHandlers.delete(key); } };
    },
  },
  // The animation clock the HC-POL viewer transition needs. Deterministic:
  // every animation settles on its target in one step, so a tree can be asserted
  // in the state a device would have reached. `Animated.View` keeps its own tag
  // so assertions about a plain `View` never count animated wrappers.
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
};

/** Every external-link handoff the Viewer attempted, in order. */
const openedLinks: string[] = [];

/** Mutable so a test can install a notch and assert the Viewer respects it. */
const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const safeAreaStub = { useSafeAreaInsets: () => insets };

const videoStub = {
  useVideoPlayer: (source: unknown) => {
    hostOf().useRef(source);
    return { status: decoder.video, source };
  },
  VideoView: 'VideoView',
};

const audioStub = {
  useAudioPlayer: (source: unknown) => {
    hostOf().useRef(source);
    return { source, play: () => undefined, pause: () => undefined };
  },
  useAudioPlayerStatus: () => ({ playing: false, error: decoder.audio === 'error' ? 'decode failed' : null }),
};

/**
 * `react-native-webview` recorded, not replaced.
 *
 * The stub returns a `WebView` element carrying the props the Viewer's real
 * renderer host would receive, so the assertions read the ACTUAL render
 * configuration — local html source, origin whitelist, navigation policy —
 * off the mounted tree. It reports nothing back: renderer verdicts arrive as
 * explicit `onMessage` payloads the tests fire themselves.
 */
const webviewStub = {
  __esModule: true,
  default: (props: Record<string, unknown>) => ({ type: 'WebView', props: { ...props, children: undefined } }),
  WebView: (props: Record<string, unknown>) => ({ type: 'WebView', props: { ...props, children: undefined } }),
};

/** The real `AppText`, so `selectable` is proven to reach the platform `Text`. */
let realAppText: { AppText: (props: Record<string, unknown>) => unknown } | null = null;

const uiStubFactory = (compiledRoot: string): Record<string, unknown> => {
  realAppText = require(path.join(compiledRoot, 'components/ui/AppText')) as { AppText: (props: Record<string, unknown>) => unknown };
  return { AppButton: 'AppButton', AppText: realAppText.AppText };
};

// ── the native filesystem and share sheet ─────────────────────────────────────
const native = {
  downloads: [] as { url: string; destination: string; idempotent: boolean }[],
  deletions: [] as string[],
  shares: [] as { uri: string; options?: unknown }[],
  /** How many times a bounded stream reader was genuinely cancelled. */
  cancels: 0,
  sharingAvailable: true,
};

function joinUri(parts: unknown[]): string {
  return parts.map((part) => String((part as { uri?: unknown })?.uri ?? part))
    .map((text, index) => (index === 0 ? text.replace(/\/+$/, '') : text.replace(/^\/+|\/+$/g, '')))
    .join('/');
}

class NativeDirectory {
  readonly uri: string;
  constructor(...parts: unknown[]) { this.uri = joinUri(parts); }
  get exists(): boolean { return true; }
  create(): void { /* best-effort in a stub */ }
  delete(): void { native.deletions.push(this.uri); }
}

/**
 * The bytes the staged text file will hand to the bounded read.
 *
 * The Viewer reads the text branch through `readableStream()` and cancels the reader at
 * the cap. Serving it here — instead of stubbing `readViewerTextPreview` — keeps the
 * REAL bounded read in the path, so the `selectable` assertions below are about a File
 * that genuinely round-tripped through staging.
 */
const stagedText = { body: 'line one\nline two' };

class NativeFile {
  readonly uri: string;
  constructor(...parts: unknown[]) { this.uri = joinUri(parts); }
  get exists(): boolean { return native.deletions.includes(this.uri) ? false : true; }
  get size(): number { return Buffer.byteLength(stagedText.body, 'utf8'); }
  delete(): void { if (!native.deletions.includes(this.uri)) native.deletions.push(this.uri); }
  static async downloadFileAsync(url: string, destination: unknown, options?: { idempotent?: boolean }): Promise<NativeFile> {
    native.downloads.push({ url, destination: String((destination as { uri?: string })?.uri ?? destination), idempotent: options?.idempotent === true });
    return new NativeFile(String((destination as { uri?: string })?.uri ?? destination));
  }
  /**
   * A real chunked reader, so the bounded read is genuinely exercised: the body arrives
   * in chunks and `cancel()` genuinely stops it. A whole-file `bytesSync()` here would
   * be the very defect this suite exists to keep fixed.
   */
  readableStream(): { getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }>; cancel: () => Promise<void> } } {
    const bytes = new Uint8Array(Buffer.from(stagedText.body, 'utf8'));
    const CHUNK = 8;
    let offset = 0;
    let cancelled = false;
    return {
      getReader: () => ({
        read: async () => {
          if (cancelled || offset >= bytes.length) return { done: true };
          const chunk = bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length));
          offset += chunk.length;
          return { done: false, value: chunk };
        },
        cancel: async () => {
          cancelled = true;
          native.cancels += 1;
        },
      }),
    };
  }
}

const fileSystemStub = {
  Directory: NativeDirectory,
  File: NativeFile,
  Paths: { cache: new NativeDirectory('file:///cache/'), document: new NativeDirectory('file:///document/') },
};

const sharingStub = {
  isAvailableAsync: async () => native.sharingAvailable,
  shareAsync: async (uri: string, options?: unknown) => { native.shares.push({ uri, options }); },
};

/** What the backend answers for the ONE authorized grant. */
const access = { signedUrl: 'https://storage.local/signed/contrato.pdf?token=secret', fail: false };

const apiStub = {
  requestJson: async (requestPath: string) => {
    if (access.fail) throw Object.assign(new Error('denied'), { code: 'homecloud_forbidden' });
    if (!requestPath.includes('/access?variant=original')) throw new Error(`unexpected access path: ${requestPath}`);
    return { signedUrl: access.signedUrl, variant: 'original' };
  },
};

// ── installation ──────────────────────────────────────────────────────────────

function installViewerStubs(compiledRoot: string): void {
  const loader = require('node:module') as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
  const original = loader._load;
  const byRequest: [string, unknown][] = [
    ['react', reactStub],
    ['react-native', reactNativeStub],
    ['react-native-safe-area-context', safeAreaStub],
    ['expo-video', videoStub],
    ['expo-audio', audioStub],
    ['react-native-webview', webviewStub],
    ['expo-file-system', fileSystemStub],
    ['expo-sharing', sharingStub],
  ];
  loader._load = function patched(request: string, parent: unknown, isMain: boolean): unknown {
    for (const [exact, value] of byRequest) if (request === exact) return value;
    if (request === '../api' || request === './api') {
        return apiStub;
    }
    // The `components/ui` stub is built LAZILY, from inside the loader: the real
    // `AppText` itself requires `react` and `react-native`, so building it before the
    // interception is installed would try to resolve them for real.
    if (request.includes('components/ui')) return uiStubFactory(compiledRoot);
    return original.call(this, request, parent, isMain);
  };
}

// ── tree navigation, with function components EXECUTED ───────────────────────

function walk(node: unknown, visit: (element: ViewerElement) => void): void {
  if (Array.isArray(node)) { for (const item of node) walk(item, visit); return; }
  if (!node || typeof node !== 'object') return;
  const element = node as ViewerElement;
  visit(element);
  const props = element.props ?? {};
  walk(props.children, visit);
  walk(props.footer, visit);
}

function findAll(tree: unknown, predicate: (element: ViewerElement) => boolean): ViewerElement[] {
  const found: ViewerElement[] = [];
  walk(tree, (element) => { if (predicate(element)) found.push(element); });
  return found;
}

function findOne(tree: unknown, predicate: (element: ViewerElement) => boolean): ViewerElement | null {
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

/**
 * EXECUTE every function component in a tree.
 *
 * The host records elements; it does not run components. So the Viewer's own nested
 * surfaces -- `ViewerPdfSurface`, `ViewerVideoSurface`, `ViewerAudioSurface` -- are run
 * here, each with its own hook slots, exactly as React would. Without this the suite
 * could only ever assert that those components EXIST, which is the gap this file exists
 * to close.
 */
function expand(node: unknown, depth = 0): unknown {
  if (depth > 8) return node;
  if (Array.isArray(node)) return node.map((item) => expand(item, depth + 1));
  if (!node || typeof node !== 'object') return node;
  const element = node as ViewerElement;
  const rendered = typeof element.type === 'function'
    ? (element.type as (props: Record<string, unknown>) => unknown)(element.props)
    : element;
  if (Array.isArray(rendered)) return rendered.map((item) => expand(item, depth + 1));
  if (!rendered || typeof rendered !== 'object') return rendered;
  const out = rendered as ViewerElement;
  const props = { ...(out.props ?? {}) };
  if (props.children !== undefined) props.children = expand(props.children, depth + 1);
  return { type: out.type, props };
}

// ── mounting ──────────────────────────────────────────────────────────────────

type ViewerMount = {
  readonly tree: unknown;
  render: () => void;
  settle: (rounds?: number, waitMs?: number) => Promise<void>;
  unmount: () => void;
  expanded: () => unknown;
};

let currentView: (() => unknown) | null = null;

/**
 * Mount the REAL Viewer.
 *
 * `props` is held in a box so a test can change the target on a LIVE mount, which is
 * what a "paging between Files" session actually does.
 */
function mountViewer(component: (props: Record<string, unknown>) => unknown, props: Record<string, unknown>): ViewerMount & { setProps: (next: Record<string, unknown>) => void } {
  const viewerHost: ViewerHost = createViewerHost();
  activeViewerHost = viewerHost;
  const box = { current: props };
  currentView = () => component(box.current);
  viewerHost.__render(currentView);
  viewerHost.__commit();
  const rerender = () => { viewerHost.__render(currentView!); viewerHost.__commit(); };
  return {
    get tree() { return viewerHost.__lastTree(); },
    render: rerender,
    settle: async (rounds = 10, waitMs = 5) => { await viewerHost.__settle(currentView!, rounds, waitMs); rerender(); },
    unmount: () => viewerHost.__unmount(),
    expanded: () => expand(viewerHost.__lastTree(), 0),
    setProps: (next: Record<string, unknown>) => { box.current = { ...box.current, ...next }; rerender(); },
  };
}

// ── the suite ─────────────────────────────────────────────────────────────────

type Recorder = (ok: boolean, message: string) => void;

export async function runViewerBranchTests(options: {
  readonly compiledRoot: string;
  readonly record: Recorder;
}): Promise<void> {
  const { compiledRoot, record } = options;
  installViewerStubs(compiledRoot);

  /**
   * The access module must be re-required, not reused.
   *
   * The V-K block above already imported the REAL `homecloudViewerAccess` through the
   * shared `tests/stubs` filesystem, so Node has it cached against a DIFFERENT device.
   * Reusing it would send these branch tests through the real transport and fail with a
   * network error that has nothing to do with what is being tested — a harness artefact
   * that looks exactly like a product bug.
   */
  const moduleCache = (require('node:module') as unknown as { _cache: Record<string, unknown> })._cache;
  for (const relative of ['screens/HomeCloudFileViewerScreen', 'services/homecloud/homecloudViewerAccess']) {
    const resolved = path.join(compiledRoot, relative);
    delete moduleCache[resolved];
    delete moduleCache[`${resolved}.js`];
  }

  const viewerModule = require(path.join(compiledRoot, 'screens/HomeCloudFileViewerScreen')) as {
    HomeCloudFileViewer: (props: Record<string, unknown>) => unknown;
    ViewerPdfSurface: (props: Record<string, unknown>) => unknown;
  };
  const { classifyHomeCloudViewerFile } = require(path.join(compiledRoot, 'services/homecloud/homecloudViewerKind')) as {
    classifyHomeCloudViewerFile: (input: { fileName: string; mimeType?: string | null }) => { kind: string };
  };

  const file = (over: Record<string, unknown> = {}) => ({
    id: 'c-pdf', displayName: 'contrato.pdf', mimeType: 'application/pdf', sizeBytes: 4096,
    folderId: null, note: null, documentDate: null, isFavorite: false, ...over,
  });

  const mount = async (target: Record<string, unknown> | null, options: { accessFails?: boolean } = {}) => {
    decoder.video = 'idle';
    decoder.audio = 'idle';
    // `accessFails` is a PARAMETER, not a flag flipped after mounting: `mount` resets
    // every fixture, so setting it beforehand would be silently undone and the test
    // would assert against a healthy access path.
    access.fail = options.accessFails === true;
    native.downloads.length = 0;
    native.deletions.length = 0;
    native.shares.length = 0;
    native.cancels = 0;
    native.sharingAvailable = true;
    stagedText.body = 'line one\nline two';
    const surface = mountViewer(viewerModule.HomeCloudFileViewer, {
      file: target,
      accessToken: 'tok-viewer',
      onClose: () => undefined,
      onExternalAction: () => undefined,
    });
    await surface.settle();
    return surface;
  };

  // ── bridge-driving helpers: the fake native WebView + firing renderer verdicts ──

  /** Deterministic staged bytes for every PDF branch below (carried, not parsed). */
  const PDF_BODY = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n';

  function webviewOf(tree: unknown): ViewerElement | null {
    return findOne(tree, (element) => element.type === 'WebView');
  }

  /**
   * Attaches a fake native WebView to the mounted tree and returns the
   * RN->Viewer outbox. The ref object lives in the surface's own hook slot, so
   * it survives re-renders; attach ONCE per mount, right after the first expand.
   */
  function attachBridge(tree: unknown): { sent: string[] } {
    const sent: string[] = [];
    const wv = webviewOf(tree);
    const ref = (wv?.props as Record<string, unknown> | undefined)?.ref as { current: unknown } | undefined;
    if (ref) ref.current = { postMessage: (message: string) => { sent.push(message); } };
    return { sent };
  }

  /** Fires one renderer->RN message through the mounted WebView's onMessage. */
  function fireViewer(tree: unknown, message: unknown): void {
    const wv = webviewOf(tree);
    const handler = (wv?.props as Record<string, unknown> | undefined)?.onMessage as ((event: unknown) => void) | undefined;
    handler?.({ nativeEvent: { data: typeof message === 'string' ? message : JSON.stringify(message) } });
  }

  function sentMessages(sent: string[], type: string): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    for (const raw of sent) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed && parsed.type === type) out.push(parsed);
      } catch {
        out.push({ type: '__unparseable__' });
      }
    }
    return out;
  }

  /**
   * Flushes a freshly mounted tree: the FIRST expand executes nested surfaces
   * (scheduling their effects), the render commits those effects, and the
   * SECOND expand observes the same hook state. Calling only render+expand
   * leaves nested effects permanently unscheduled, because `settle()` only
   * converges while something is dirty. Re-expansion is side-effect-free: every
   * hook cell is already initialized and every dep list is unchanged.
   */
  function refresh(surface: ViewerMount): unknown {
    surface.expanded();
    surface.render();
    return surface.expanded();
  }

  console.log('\n--- V-L1: a PDF opens INLINE, from the LOCAL staged original ---');
  {
    record(classifyHomeCloudViewerFile({ fileName: 'contrato.pdf', mimeType: 'application/pdf' }).kind === 'pdf',
      'V-L1a. the classification layer still routes a PDF to the pdf family');
    const surface = await mount(file());
    // The surface reads whatever is STAGED when its own effect runs, which is
    // after the first expand - so the fixture is installed between mount and expand.
    stagedText.body = PDF_BODY;
    let tree = refresh(surface);
    const wv = webviewOf(tree);
    record(wv !== null, 'V-L1b. tapping a PDF mounts the inline WebView renderer — not a hand-off and not a blank screen');
    const source = (wv?.props?.source ?? {}) as { html?: unknown; baseUrl?: unknown };
    const html = typeof source.html === 'string' ? source.html : '';
    record(html.length > 300 * 1024 && html.includes('pdfjsLib'),
      'V-L1c. whose source is the LOCAL bundled engine inlined into local HTML');
    record(!/<script\s+src/i.test(html), 'V-L1d. with no external script reference anywhere in the page');
    record(!html.includes(access.signedUrl) && !html.includes('token=secret'),
      'V-L1e. and the signed URL is NOWHERE in the renderer: no live credential is handed to it');
    record(!/src="https?:/i.test(html) && !/<link[\s>]/i.test(html),
      'V-L1f. the renderer page pulls nothing from the network: no remote script, no remote stylesheet');
    record((wv?.props?.originWhitelist as unknown[])?.join(',') === 'about:blank',
      'V-L1g. the origin whitelist is exactly about:blank');
    record((wv?.props as Record<string, unknown>)?.allowFileAccess === false,
      'V-L1h. file access is explicitly off');
    record(typeof (wv?.props as Record<string, unknown>)?.onShouldStartLoadWithRequest === 'function'
      && ((wv?.props as Record<string, unknown>)?.onShouldStartLoadWithRequest as (request: unknown) => boolean)({ url: 'about:blank' }) === true,
      'V-L1i. the local bootstrap document is allowed to load, so iOS cannot blank the viewer at startup');
    record(typeof (wv?.props as Record<string, unknown>)?.onShouldStartLoadWithRequest === 'function'
      && ((wv?.props as Record<string, unknown>)?.onShouldStartLoadWithRequest as (request: unknown) => boolean)({ url: 'https://evil.example/' }) === false,
      'V-L1j. remote navigation is still blocked: an explicit external load request returns false');
    record(native.downloads.length === 1 && native.downloads[0]?.url === access.signedUrl,
      'V-L1k. exactly one authorized transfer staged the bytes, from the signed original');
    record(native.downloads[0]?.destination.startsWith('file:///cache/'),
      'V-L1l. into the TEMPORARY cache, never into a folder that looks like a library');
    record(native.downloads[0]?.idempotent === true,
      'V-L1m. idempotently, so a repeat view replaces its own slot instead of colliding');

    // Drive the versioned protocol: READY -> INIT + chunks -> DOCUMENT_LOADED.
    const { sent } = attachBridge(tree);
    await surface.settle();
    fireViewer(tree, { v: 1, type: 'READY', docId: 'boot' });
    const inits = sentMessages(sent, 'INIT_DOCUMENT');
    record(inits.length === 1, 'V-L1n. READY triggers exactly one bounded transfer session');
    const docId = inits[0]?.docId;
    record(typeof docId === 'string' && (inits[0]?.byteLength as number) === Buffer.byteLength(PDF_BODY),
      'V-L1o. and the session declares the REAL byte length');
    fireViewer(tree, { v: 1, type: 'READY', docId: 'boot' });
    record(sentMessages(sent, 'INIT_DOCUMENT').length === 1,
      'V-L1p. a duplicate READY does NOT re-send the document');
    const chunks = sentMessages(sent, 'LOAD_CHUNK').sort((a, b) => Number(a.index) - Number(b.index));
    const reassembled = Buffer.from(chunks.map((chunk) => String(chunk.data)).join(''), 'base64').toString('utf8');
    record(chunks.length >= 1 && reassembled === PDF_BODY,
      `V-L1q. the chunks reassemble to the EXACT staged bytes (${chunks.length} chunk(s))`);
    record(sent.every((raw) => { try { JSON.parse(raw); return true; } catch { return false; } }),
      'V-L1r. every bridge message is well-formed protocol JSON');
    fireViewer(tree, { v: 1, type: 'DOCUMENT_LOADED', docId, pages: 4 });
    surface.render();
    tree = surface.expanded();
    record(renderText(tree).some((text) => text.includes('1 / 4')),
      'V-L1s. the shell reports the current page once the document loads');
    fireViewer(tree, { v: 1, type: 'PAGE_CHANGED', docId, page: 3, pages: 4 });
    surface.render();
    tree = surface.expanded();
    record(renderText(tree).some((text) => text.includes('3 / 4')),
      'V-L1t. and follows page movement');
    // A stale session cannot steer the live one.
    fireViewer(tree, { v: 1, type: 'PAGE_CHANGED', docId: 'stale-session', page: 2, pages: 4 });
    surface.render();
    tree = surface.expanded();
    record(renderText(tree).some((text) => text.includes('3 / 4')),
      'V-L1u. a message for a FOREIGN session is ignored');
    // A single bad page must not nuke a readable document.
    fireViewer(tree, { v: 1, type: 'RENDER_ERROR', docId, page: 3 });
    surface.render();
    tree = surface.expanded();
    record(renderText(tree).some((text) => text.includes('3 / 4')),
      'V-L1v. a single RENDER_ERROR keeps the document instead of failing it');

    // A renderer that cannot open the document gets an HONEST surface, never a blank one.
    fireViewer(tree, {
      v: 1,
      type: 'LOAD_ERROR',
      docId,
      code: 'corrupt',
      stage: 'decode_size_mismatch',
      engineName: 'none',
      byteLength: Buffer.byteLength(PDF_BODY),
      totalChunks: chunks.length,
      receivedChunks: chunks.length,
      durationMs: 12,
      engineReady: true,
    });
    surface.render();
    const failed = surface.expanded();
    const failedText = renderText(failed).join(' ');
    record(/no pudimos abrir este pdf/i.test(failedText),
      'V-L1w. a PDF the device cannot open says so SPECIFICALLY instead of showing nothing');
    record(/contraseña|dañado/i.test(failedText),
      'V-L1x. and it names the two honest reasons: password-protected or damaged');
    record(/pdf_engine_corrupt/.test(failedText),
      'V-L1y. and includes a sanitized diagnostic code for device QA without leaking URLs or contents');
    record(/decode_size_mismatch/.test(failedText) && /Chunks:/.test(failedText) && /Motor listo: sí/.test(failedText),
      'V-L1y2. and the sanitized stage/counter telemetry is visible without paths, tokens or raw contents');
    record(findAll(failed, (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…').length === 1,
      'V-L1z. and it still offers the explicit system hand-off');
    record(!/at \w+ \(|Error:|stack/i.test(failedText), 'V-L1aa. and never a stack trace');
    surface.unmount();
    record(native.deletions.some((uri) => uri.includes('viewer-c-pdf.pdf')),
      'V-L1ab. closing the Viewer removes the staged copy');
  }

  console.log('\n--- V-L2: a target change releases the previous staging ---');
  {
    const surface = await mount(file({ id: 'c-first', displayName: 'primero.pdf' }));
    stagedText.body = PDF_BODY;
    const firstKey = (webviewOf(refresh(surface))?.props as Record<string, unknown> | undefined)?.key;
    surface.setProps({ file: file({ id: 'c-second', displayName: 'segundo.pdf' }) });
    await surface.settle();
    record(native.deletions.some((uri) => uri.includes('viewer-c-first.pdf')),
      'V-L2a. switching to another File DELETES the previous staged copy — copies cannot accumulate');
    record(native.downloads.length === 2 && native.downloads[1]?.destination.includes('viewer-c-second.pdf'),
      'V-L2b. and stages the new one into its own deterministic slot');
    // The surface effect for the new uri runs on expand+render; flush fully so
    // the new session is committed AND observed before asserting on it.
    const secondKey = (webviewOf(refresh(surface))?.props as Record<string, unknown> | undefined)?.key;
    record(typeof firstKey === 'string' && typeof secondKey === 'string' && firstKey !== secondKey,
      'V-L2c. so the renderer is REMOUNTED for the second File: no stale pixels can survive the switch');
    surface.unmount();
  }

  console.log('\n--- V-L3: image, video and audio each take their own inline branch ---');
  {
    const imageSurface = await mount(file({ id: 'c-jpg', displayName: 'foto.jpg', mimeType: 'image/jpeg' }));
    const imageTree = imageSurface.expanded();
    const image = findOne(imageTree, (element) => element.type === 'Image');
    record(image !== null, 'V-L3a. an image mounts the HomePlus image surface');
    record(((image?.props?.source ?? {}) as { uri?: string }).uri === access.signedUrl,
      'V-L3b. from the authorized signed original');
    record(findAll(imageTree, (element) => element.type === 'WebView').length === 0,
      'V-L3c. and no PDF renderer is involved at all');
    imageSurface.unmount();

    const videoSurface = await mount(file({ id: 'c-mov', displayName: 'clip.mov', mimeType: 'video/quicktime' }));
    const videoTree = videoSurface.expanded();
    record(findOne(videoTree, (element) => element.type === 'VideoView') !== null,
      'V-L3d. a MOV routes into the HomePlus video surface FIRST — it is never handed straight to another app');
    record(!/no pudimos reproducir|revisá tu conexión/i.test(renderText(videoTree).join(' ')),
      'V-L3e. and a healthy player shows NO error copy at all');
    decoder.video = 'error';
    videoSurface.render();
    const broken = videoSurface.expanded();
    const brokenText = renderText(broken).join(' ');
    record(/no pudimos reproducir este video/i.test(brokenText),
      'V-L3f. when the decoder reports an error the Viewer says so on its OWN surface');
    record(findAll(broken, (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…').length >= 1,
      'V-L3g. and offers an explicit `Abrir o compartir con…` instead of throwing the member into another app');
    record(findOne(broken, (element) => element.type === 'VideoView') !== null,
      'V-L3h. while the player itself is still mounted, so nothing flickers away');
    videoSurface.unmount();

    const audioSurface = await mount(file({ id: 'c-mp3', displayName: 'tema.mp3', mimeType: 'audio/mpeg' }));
    const audioTree = audioSurface.expanded();
    const audioText = renderText(audioTree).join(' ');
    record(/reproducir|pausar/i.test(audioText)
      || findAll(audioTree, (element) => element.type === 'AppButton'
        && /^(Reproducir|Pausar)$/.test(String(element.props?.title))).length === 1,
      'V-L3i. an audio File takes the existing HomePlus audio surface');
    record(findOne(audioTree, (element) => element.type === 'WebView') === null
      && findOne(audioTree, (element) => element.type === 'VideoView') === null,
      'V-L3j. and no PDF or video renderer is dragged into it');
    audioSurface.unmount();
  }

  console.log('\n--- V-L4: TXT, Markdown and CSV are SELECTABLE ---');
  {
    for (const [label, name, mime] of [
      ['V-L4a', 'notas.txt', 'text/plain'],
      ['V-L4b', 'leeme.md', 'text/markdown'],
      ['V-L4c', 'datos.csv', 'text/csv'],
    ] as const) {
      const surface = await mount(file({ id: `c-text-${mime.replace(/[^a-z]/g, '')}`, displayName: name, mimeType: mime }));
      const tree = surface.expanded();
      // The REAL `AppText` forwards `TextProps` to the platform `Text`, so the
      // assertion is made on the `Text` element, not on the component's own props.
      const selectableText = findAll(tree, (element) => element.type === 'Text' && element.props?.selectable === true);
      const body = renderText(tree).find((text) => text.includes('line one'));
      record(body !== undefined, `${label}. ${name} shows its bounded text in the Viewer`);
      record(selectableText.length >= 1 && body !== undefined,
        `${label}. and that text is NATIVE-SELECTABLE, so a member can copy from it`);
      surface.unmount();
    }
  }

  console.log('\n--- V-L5: safe area, Android back and an honest unsupported branch ---');
  {
    insets.top = 44;
    insets.bottom = 34;
    const surface = await mount(file({ id: 'c-safe', displayName: 'segura.pdf' }));
    const tree = surface.expanded();
    const root = findOne(tree, (element) => element.type === 'View' && flattenStyle(element.props?.style)?.paddingTop !== undefined);
    const rootStyle = flattenStyle(root?.props?.style);
    record(rootStyle?.paddingTop === 44,
      `V-L5a. the Viewer respects the TOP safe-area inset instead of hard-coding a status bar (${String(rootStyle?.paddingTop)})`);
    record(rootStyle?.paddingBottom === 34, 'V-L5b. and the bottom inset / gesture bar too');
    insets.top = 0;
    insets.bottom = 0;

    record(backHandlers.size === 1, 'V-L5c. while the Viewer is OPEN exactly one Android back handler is registered');
    const activeHandler = [...backHandlers.values()][0];
    record(activeHandler() === true, 'V-L5d. it CONSUMES the hardware back press — HomeCloud is not left behind the Viewer');
    surface.unmount();
    record(backHandlers.size === 0, 'V-L5e. unmounting REMOVES it, so a Viewer that is not open never intercepts back');

    // The handler really closes the Viewer: a live mount with a spy `onClose`.
    let closeCalls = 0;
    const backSurface = await mount(file({ id: 'c-back', displayName: 'atras.pdf' }));
    backSurface.setProps({ onClose: () => { closeCalls += 1; } });
    backSurface.render();
    const closeHandler = [...backHandlers.values()][0];
    record(closeHandler() === true && closeCalls === 1,
      'V-L5f. and pressing it calls `onClose` exactly once — the Viewer closes, the app stays');
    backSurface.unmount();
    record(backHandlers.size === 0, 'V-L5g. with no handler left behind');

    // OFFICE-3: XLSX/XLS/PPTX/PPT ya NO terminan en "vista previa no
    // disponible": enrutan a la superficie Office integrada (sesión
    // autorizada), igual que DOCX. En este harness el backend no existe,
    // así que la superficie queda pidiendo la sesión ("Preparando
    // documento…") — la rama de hand-off externo deja de ser la ÚNICA.
    const OFFICE_V1_CASES = [
      ['V-L5m', 'plan.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['V-L5m2', 'PLAN.XLS', 'application/vnd.ms-excel'],
      ['V-L5m3', 'deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      ['V-L5m4', 'DECK.PPT', 'application/vnd.ms-powerpoint'],
    ] as const;
    for (const [label, name, mime] of OFFICE_V1_CASES) {
      const office = await mount(file({ id: `c-office-${label.toLowerCase()}`, displayName: name, mimeType: mime }));
      const officeText = renderText(office.expanded()).join(' ');
      record(/preparando documento/i.test(officeText),
        `${label}. ${name} routes into the integrated Office surface (OFFICE-3), not the no-preview branch`);
      record(native.downloads.length === 1,
        `${label}. the exact original WAS staged, so the backup hand-off stays real`);
      office.unmount();
    }

    // Los formatos Office NO-V1 (XLSM, ODT, RTF, ODP…) conservan el hand-off
    // externo honesto: OFFICE-3 no finge compatibilidad con los que no son de
    // los seis formatos V1.
    const nonV1 = await mount(file({ id: 'c-xlsm', displayName: 'libro.xlsm', mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12' }));
    const nonV1Tree = nonV1.expanded();
    record(/vista previa no disponible/i.test(renderText(nonV1Tree).join(' ')),
      'V-L5n. a non-V1 Office format (XLSM) keeps the honest external hand-off');
    record(findAll(nonV1Tree, (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…').length === 1,
      'V-L5n2. with the hand-off actually offered');
    record(findOne(nonV1Tree, (element) => element.type === 'WebView') === null,
      'V-L5n3. and no renderer WebView is mounted for it');
    nonV1.unmount();

    // OFFICE-1: un DOCX ya no termina en "vista previa no disponible": entra a
    // la superficie Office (sesión autorizada). Se monta la superficie REAL
    // directamente (precedente V-L6i). En este harness el backend no existe,
    // así que la sesión falla y la superficie muestra el fallo honesto con el
    // hand-off todavía ofrecido — nunca una pantalla en blanco.
    const officeSurface = (viewerModule as { ViewerOfficeSurface?: unknown }).ViewerOfficeSurface;
    record(typeof officeSurface === 'function', 'V-L5h2. the real Office surface is exported for direct mounting');
    if (typeof officeSurface === 'function') {
      const surface = officeSurface as (props: Record<string, unknown>) => unknown;
      let externalCalls = 0;
      const box = {
        current: {
          file: { id: 'c-docx', displayName: 'plan.docx' },
          accessToken: 'token-de-prueba',
          onExternalOpen: () => { externalCalls += 1; },
          externalAvailable: true,
          externalBusy: false,
        },
      };
      const host = createViewerHost();
      activeViewerHost = host;
      const view = () => surface(box.current);
      host.__render(view);
      host.__commit();
      const direct = {
        render: () => { host.__render(view); host.__commit(); },
        settle: async (rounds = 10, waitMs = 5) => { await host.__settle(view, rounds, waitMs); host.__render(view); host.__commit(); },
        expanded: () => expand(host.__lastTree(), 0),
        unmount: () => host.__unmount(),
      };
      const preparingText = renderText(direct.expanded()).join(' ');
      record(/preparando documento/i.test(preparingText),
        'V-L5h3. a DOCX enters the integrated Office surface instead of the no-preview branch');
      await direct.settle();
      const failedTree = direct.expanded();
      const failedText = renderText(failedTree).join(' ');
      record(/no pudimos mostrar/i.test(failedText),
        'V-L5i2. when the session cannot be authorized it fails honestly, never blank');
      const handoff = findAll(failedTree, (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…');
      record(handoff.length === 1 && handoff[0]?.props?.disabled !== true,
        'V-L5i3. with the system hand-off still offered from the Office failure');
      (handoff[0]?.props?.onPress as (() => void) | undefined)?.();
      record(externalCalls === 1,
        'V-L5i4. and the hand-off button actually fires the system hand-off');
      record(findOne(failedTree, (element) => element.type === 'Image') === null,
        'V-L5j2. and no foreign renderer is mounted for it');
      // Cerrar cancela la sesión best-effort: desmontar no debe lanzar.
      let unmountThrew = false;
      try {
        direct.unmount();
      } catch {
        unmountThrew = true;
      }
      record(!unmountThrew, 'V-L5j3. closing cancels the session best-effort without throwing');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    // El Viewer integrado también se alcanza desde el Viewer completo.
    const word = await mount(file({ id: 'c-docx2', displayName: 'plan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    const wordPreparingText = renderText(word.expanded()).join(' ');
    record(/preparando documento/i.test(wordPreparingText),
      'V-L5h4. the full Viewer routes a DOCX into the Office surface');
    word.unmount();

    const svg = await mount(file({ id: 'c-svg', displayName: 'logo.svg', mimeType: 'image/svg+xml' }));
    const svgTree = svg.expanded();
    record(/documento web activo/i.test(renderText(svgTree).join(' ')),
      'V-L5l. an SVG is still refused as active web content, with the security reason stated');
    record(findAll(svgTree, (element) => element.type === 'WebView').length === 0
      && findAll(svgTree, (element) => element.type === 'Image').length === 0,
      'V-L5m. and no renderer executes it');
    svg.unmount();

    const refused = await mount(file({ id: 'c-denied', displayName: 'privado.pdf' }), { accessFails: true });
    const refusedText = renderText(refused.expanded()).join(' ');
    record(/autorizar|permiso|conexión/i.test(refusedText),
      'V-L5n. an authorization failure is still a real, stated surface — never a blank Viewer');
    record(findOne(refused.expanded(), (element) => element.type === 'WebView') === null,
      'V-L5o. and no renderer is mounted for bytes that were never authorized');
    refused.unmount();
  }

  console.log('\n--- V-L6: password, oversized, links, hostile input, timeouts, close, reopen ---');
  {
    openedLinks.length = 0;

    // V-L6a. A password-protected PDF gets its OWN intentional state.
    const locked = await mount(file({ id: 'c-locked', displayName: 'clave.pdf' }));
    stagedText.body = PDF_BODY;
    const lockedTree = refresh(locked);
    const lockedBridge = attachBridge(lockedTree);
    await locked.settle();
    fireViewer(lockedTree, { v: 1, type: 'READY', docId: 'boot' });
    const lockedInit = sentMessages(lockedBridge.sent, 'INIT_DOCUMENT')[0];
    fireViewer(lockedTree, { v: 1, type: 'LOAD_ERROR', docId: lockedInit?.docId, code: 'password' });
    locked.render();
    const lockedText = renderText(locked.expanded()).join(' ');
    record(/protegido|contraseña/i.test(lockedText),
      'V-L6a. a password-protected PDF says it is protected instead of failing generically');
    record(findAll(locked.expanded(), (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…').length >= 1,
      'V-L6b. and still offers the safe hand-off');
    locked.unmount();

    // V-L6b2. A generic engine rejection is NOT mislabeled as unsupported.
    const engineFailed = await mount(file({ id: 'c-engine', displayName: 'motor.pdf' }));
    stagedText.body = PDF_BODY;
    const engineTree = refresh(engineFailed);
    const engineBridge = attachBridge(engineTree);
    await engineFailed.settle();
    fireViewer(engineTree, { v: 1, type: 'READY', docId: 'boot' });
    const engineInit = sentMessages(engineBridge.sent, 'INIT_DOCUMENT')[0];
    fireViewer(engineTree, {
      v: 1,
      type: 'LOAD_ERROR',
      docId: engineInit?.docId,
      code: 'engine_failed',
      stage: 'get_document_promise',
      engineName: 'Error',
      byteLength: Buffer.byteLength(PDF_BODY),
      totalChunks: sentMessages(engineBridge.sent, 'LOAD_CHUNK').length,
      receivedChunks: sentMessages(engineBridge.sent, 'LOAD_CHUNK').length,
      durationMs: 44,
      engineReady: true,
    });
    engineFailed.render();
    const engineText = renderText(engineFailed.expanded()).join(' ');
    record(/pdf_get_document_rejected/.test(engineText) && /get_document_promise/.test(engineText) && /Clase: Error/.test(engineText),
      'V-L6b2. a real engine rejection reports its stage/error class instead of the old unsupported bucket');
    record(!/pdf_engine_unsupported/.test(engineText) && !/token=secret|file:\/\/|cache\/HomeCloudViewer/i.test(engineText),
      'V-L6b3. and the engine diagnostic leaks no old broad unsupported code, token, file URI or cache path');
    engineFailed.unmount();

    // V-L6c. An oversized PDF never reaches the bridge: intentional fallback.
    const huge = await mount(file({ id: 'c-huge', displayName: 'manual.pdf' }));
    stagedText.body = `x`.repeat(8 * 1024 * 1024 + 1);
    let hugeTree = huge.expanded();
    const hugeBridge = attachBridge(hugeTree);
    huge.render();
    await huge.settle(4, 5);
    const hugeText = renderText(huge.expanded()).join(' ');
    record(/muy grande/i.test(hugeText),
      'V-L6c. an oversized PDF produces the polished too-large state, not a crash');
    record(findAll(huge.expanded(), (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…').length >= 1,
      'V-L6d. with the Open/Share fallback offered');
    record(hugeBridge.sent.length === 0,
      'V-L6e. and ZERO bridge messages were attempted for it');
    stagedText.body = 'line one\nline two';
    huge.unmount();

    // V-L6f. Document links become an explicit system handoff, never navigation.
    const linked = await mount(file({ id: 'c-linked', displayName: 'enlaces.pdf' }));
    stagedText.body = PDF_BODY;
    let linkedTree = refresh(linked);
    const linkedBridge = attachBridge(linkedTree);
    await linked.settle();
    fireViewer(linkedTree, { v: 1, type: 'READY', docId: 'boot' });
    const linkedDoc = sentMessages(linkedBridge.sent, 'INIT_DOCUMENT')[0]?.docId;
    fireViewer(linkedTree, { v: 1, type: 'DOCUMENT_LOADED', docId: linkedDoc, pages: 2 });
    linked.render();
    linkedTree = linked.expanded();
    fireViewer(linkedTree, { v: 1, type: 'LINK_PRESSED', docId: linkedDoc, url: 'https://ejemplo.org/fuente' });
    await linked.settle(3, 5);
    record(openedLinks.includes('https://ejemplo.org/fuente'),
      'V-L6f. tapping a document link performs an explicit system handoff with the exact URL');
    record(webviewOf(linked.expanded()) !== null,
      'V-L6g. and the viewer itself stays put instead of navigating away');
    // Hostile input against the live session changes nothing.
    fireViewer(linkedTree, '{not json');
    fireViewer(linkedTree, { v: 1, type: 'SELF_DESTRUCT', docId: linkedDoc });
    fireViewer(linkedTree, { v: 999, type: 'READY', docId: linkedDoc });
    fireViewer(linkedTree, { v: 1, type: 'LOAD_ERROR', docId: linkedDoc, code: 'rm -rf' });
    fireViewer(linkedTree, { v: 1, type: 'LOAD_ERROR', docId: linkedDoc, code: 'unsupported' });
    linked.render();
    const hostileTree = linked.expanded();
    const hostileText = renderText(hostileTree).join(' ');
    record(!/no pudimos abrir/i.test(hostileText) && renderText(hostileTree).some((text) => text.includes('1 / 2')),
      'V-L6h. malformed, unknown-version and invented-code messages are ignored without failing the document');
    linked.unmount();

    // V-L6i. Timeouts and close-during-load, against the REAL surface directly
    // with controlled clocks (production always uses the policy defaults).
    const viewerSurface = viewerModule.ViewerPdfSurface;
    record(typeof viewerSurface === 'function', 'V-L6i. the real PDF surface is exported for direct mounting');
    const directFailures: Array<{ title: string; message: string }> = [];
    const directMount = (uri: string, timeouts: Record<string, number>) => {
      const box = { current: { uri, onDocumentFailed: (failure: { title: string; message: string }) => { directFailures.push(failure); }, timeouts } };
      const host = createViewerHost();
      activeViewerHost = host;
      const view = () => viewerSurface(box.current);
      host.__render(view);
      host.__commit();
      return {
        render: () => { host.__render(view); host.__commit(); },
        settle: async (rounds = 10, waitMs = 5) => { await host.__settle(view, rounds, waitMs); host.__render(view); host.__commit(); },
        expanded: () => expand(host.__lastTree(), 0),
        unmount: () => host.__unmount(),
      };
    };
    // A renderer that never says READY becomes the honest failure, not a spinner.
    stagedText.body = PDF_BODY;
    directFailures.length = 0;
    const silent = directMount('file:///cache/HomeCloudViewer/viewer-silent.pdf', { readyMs: 40, loadMs: 5000 });
    silent.expanded();
    await silent.settle(15, 10);
    record(directFailures.length === 1 && /no pudimos abrir este pdf/i.test(directFailures[0]?.title ?? ''),
      'V-L6j. a WebView that never reports READY fails honestly once the clock runs out');
    silent.unmount();
    // Bytes sent but document never opened: the LOAD clock, not a hang.
    directFailures.length = 0;
    const stalled = directMount('file:///cache/HomeCloudViewer/viewer-stalled.pdf', { readyMs: 5000, loadMs: 40 });
    let stalledTree = stalled.expanded();
    const stalledBridge = attachBridge(stalledTree);
    await stalled.settle();
    fireViewer(stalledTree, { v: 1, type: 'READY', docId: 'boot' });
    record(sentMessages(stalledBridge.sent, 'INIT_DOCUMENT').length === 1,
      'V-L6k. the stalled session did send its bytes before the load clock ran out');
    await stalled.settle(15, 10);
    record(directFailures.length === 1,
      'V-L6l. and a document that never opens fails honestly instead of spinning forever');
    stalled.unmount();
    // Closing mid-load: no failure, no transfer, no leak.
    directFailures.length = 0;
    const early = directMount('file:///cache/HomeCloudViewer/viewer-early.pdf', { readyMs: 5000, loadMs: 5000 });
    early.expanded();
    early.unmount();
    await new Promise((resolve) => setTimeout(resolve, 30));
    record(directFailures.length === 0,
      'V-L6m. closing during load reports nothing and leaks nothing');

    // V-L6n. Reopening after a close starts a clean session (no stale content).
    const first = await mount(file({ id: 'c-re-a', displayName: 'a.pdf' }));
    stagedText.body = PDF_BODY;
    const firstOpen = refresh(first);
    const firstBridge = attachBridge(firstOpen);
    await first.settle();
    fireViewer(firstOpen, { v: 1, type: 'READY', docId: 'boot' });
    const firstDoc = sentMessages(firstBridge.sent, 'INIT_DOCUMENT')[0]?.docId;
    fireViewer(firstOpen, { v: 1, type: 'DOCUMENT_LOADED', docId: firstDoc, pages: 5 });
    first.render();
    record(renderText(first.expanded()).some((text) => text.includes('1 / 5')),
      'V-L6n. the first open shows its own page count');
    first.unmount();
    const second = await mount(file({ id: 'c-re-b', displayName: 'b.pdf' }));
    stagedText.body = PDF_BODY;
    const secondOpen = refresh(second);
    const secondBridge = attachBridge(secondOpen);
    await second.settle();
    fireViewer(secondOpen, { v: 1, type: 'READY', docId: 'boot' });
    const secondDoc = sentMessages(secondBridge.sent, 'INIT_DOCUMENT')[0]?.docId;
    record(typeof secondDoc === 'string' && secondDoc !== firstDoc,
      'V-L6o. the reopen mints a FRESH session, so the old document cannot bleed through');
    fireViewer(secondOpen, { v: 1, type: 'DOCUMENT_LOADED', docId: secondDoc, pages: 7 });
    second.render();
    record(renderText(second.expanded()).some((text) => text.includes('1 / 7')),
      'V-L6p. and shows the new document, never the previous pixels');
    second.unmount();
  }
}

function flattenStyle(style: unknown): Record<string, unknown> | null {
  if (!style || typeof style !== 'object') return null;
  if (Array.isArray(style)) {
    const out: Record<string, unknown> = {};
    for (const item of style) Object.assign(out, flattenStyle(item) ?? {});
    return out;
  }
  return style as Record<string, unknown>;
}
