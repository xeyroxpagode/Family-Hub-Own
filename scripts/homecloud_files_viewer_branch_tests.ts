/**
 * HomeCloud Files — STAGE 2 REOPEN, SLICE C — THE VIEWER, MOUNTED AND EXECUTED.
 *
 * WHY THIS FILE EXISTS SEPARATELY
 * -------------------------------
 * The Stage 2 Viewer suite was 133 assertions of SOURCE and PURE evidence: it proved
 * that `react-native-pdf` appeared in the file, that `pdf.js` did not, that the bounded
 * read really was bounded. Every one of those claims is worth keeping. None of them
 * proves that tapping a PDF shows a PDF, that a video which fails to decode says so,
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
  BackHandler: {
    addEventListener: (_event: string, handler: () => boolean) => {
      backHandlerSeq += 1;
      const key = `back-${backHandlerSeq}`;
      backHandlers.set(key, handler);
      return { remove: () => { backHandlers.delete(key); } };
    },
  },
};

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
 * `react-native-pdf` recorded, not replaced.
 *
 * The stub returns a `Pdf` element carrying the props the Viewer's real renderer would
 * receive, so the assertions read the ACTUAL render configuration — source URI, paging,
 * zoom, certificate policy — off the mounted tree.
 */
const pdfStub = {
  __esModule: true,
  default: (props: Record<string, unknown>) => ({ type: 'Pdf', props: { ...props, children: undefined } }),
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
    ['react-native-pdf', pdfStub],
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

  console.log('\n--- V-L1: a PDF opens INLINE, from the LOCAL staged original ---');
  {
    record(classifyHomeCloudViewerFile({ fileName: 'contrato.pdf', mimeType: 'application/pdf' }).kind === 'pdf',
      'V-L1a. the classification layer still routes a PDF to the pdf family');
    const surface = await mount(file());
    const tree = surface.expanded();
    const pdf = findOne(tree, (element) => element.type === 'Pdf');
    record(pdf !== null, 'V-L1b. tapping a PDF mounts the inline PDF surface — not a hand-off and not a blank screen');
    const source = (pdf?.props?.source ?? {}) as { uri?: string };
    record(typeof source.uri === 'string' && source.uri.startsWith('file://'),
      `V-L1c. and its source is the LOCAL staged file (${String(source.uri).slice(0, 40)})`);
    record(String(source.uri).includes('viewer-c-pdf.pdf'),
      'V-L1d. named deterministically from the content id, exactly like the text staging slot');
    record(source.uri !== access.signedUrl,
      'V-L1e. and it is NOT the signed URL, so no live credential is handed to a renderer');
    record(!/^https?:/i.test(String(source.uri)), 'V-L1f. the renderer is never given a remote document');
    const serialized = JSON.stringify(pdf?.props ?? {});
    record(!/cdn\.|unpkg|jsdelivr|googleapis|microsoft|docs\.google|drive\.google/i.test(serialized),
      'V-L1g. no CDN, Google or Microsoft host appears anywhere in the renderer props');
    record(pdf?.props?.enablePaging === true, 'V-L1h. native paging is on, so a multi-page document is navigable');
    record(pdf?.props?.enableDoubleTapZoom === true, 'V-L1i. native zoom is on');
    record(pdf?.props?.trustAllCerts === false, 'V-L1j. certificate trust is NOT disabled');
    record(native.downloads.length === 1 && native.downloads[0]?.url === access.signedUrl,
      'V-L1k. exactly one authorized transfer staged the bytes, from the signed original');
    record(native.downloads[0]?.destination.startsWith('file:///cache/'),
      'V-L1l. into the TEMPORARY cache, never into a folder that looks like a library');
    record(native.downloads[0]?.idempotent === true,
      'V-L1m. idempotently, so a repeat view replaces its own slot instead of colliding');

    // A renderer that cannot open the document gets an HONEST surface, never a blank one.
    (pdf?.props?.onError as (() => void) | undefined)?.();
    surface.render();
    const failed = surface.expanded();
    const failedText = renderText(failed).join(' ');
    record(/no pudimos abrir este pdf/i.test(failedText),
      'V-L1n. a PDF the device cannot open says so SPECIFICALLY instead of showing nothing');
    record(/contraseña|dañado/i.test(failedText),
      'V-L1o. and it names the two honest reasons: password-protected or damaged');
    record(findAll(failed, (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…').length === 1,
      'V-L1p. and it still offers the explicit system hand-off');
    record(!/at \w+ \(|Error:|stack/i.test(failedText), 'V-L1q. and never a stack trace');
    surface.unmount();
    record(native.deletions.some((uri) => uri.includes('viewer-c-pdf.pdf')),
      'V-L1r. closing the Viewer removes the staged copy');
  }

  console.log('\n--- V-L2: a target change releases the previous staging ---');
  {
    const surface = await mount(file({ id: 'c-first', displayName: 'primero.pdf' }));
    surface.setProps({ file: file({ id: 'c-second', displayName: 'segundo.pdf' }) });
    await surface.settle();
    record(native.deletions.some((uri) => uri.includes('viewer-c-first.pdf')),
      'V-L2a. switching to another File DELETES the previous staged copy — copies cannot accumulate');
    record(native.downloads.length === 2 && native.downloads[1]?.destination.includes('viewer-c-second.pdf'),
      'V-L2b. and stages the new one into its own deterministic slot');
    const tree = surface.expanded();
    const pdf = findOne(tree, (element) => element.type === 'Pdf');
    record(((pdf?.props?.source ?? {}) as { uri?: string }).uri?.includes('viewer-c-second.pdf') === true,
      'V-L2c. so the renderer is showing the SECOND File, with no trace of the first');
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
    record(findAll(imageTree, (element) => element.type === 'Pdf').length === 0,
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
    record(findOne(audioTree, (element) => element.type === 'Pdf') === null
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

    const office = await mount(file({ id: 'c-docx', displayName: 'plan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    const officeTree = office.expanded();
    const officeText = renderText(officeTree).join(' ');
    record(/vista previa no disponible/i.test(officeText), 'V-L5h. an Office document is an honest external hand-off');
    record(findAll(officeTree, (element) => element.type === 'AppButton' && element.props?.title === 'Abrir o compartir con…').length === 1,
      'V-L5i. with the hand-off actually offered');
    record(findOne(officeTree, (element) => element.type === 'Pdf') === null,
      'V-L5j. and no PDF renderer is mounted for it, because it is not a PDF');
    record(native.downloads.length === 1, 'V-L5k. and the exact original WAS staged, so the hand-off is real');
    office.unmount();

    const svg = await mount(file({ id: 'c-svg', displayName: 'logo.svg', mimeType: 'image/svg+xml' }));
    const svgTree = svg.expanded();
    record(/documento web activo/i.test(renderText(svgTree).join(' ')),
      'V-L5l. an SVG is still refused as active web content, with the security reason stated');
    record(findAll(svgTree, (element) => element.type === 'Pdf').length === 0
      && findAll(svgTree, (element) => element.type === 'Image').length === 0,
      'V-L5m. and no renderer executes it');
    svg.unmount();

    const refused = await mount(file({ id: 'c-denied', displayName: 'privado.pdf' }), { accessFails: true });
    const refusedText = renderText(refused.expanded()).join(' ');
    record(/autorizar|permiso|conexión/i.test(refusedText),
      'V-L5n. an authorization failure is still a real, stated surface — never a blank Viewer');
    record(findOne(refused.expanded(), (element) => element.type === 'Pdf') === null,
      'V-L5o. and no renderer is mounted for bytes that were never authorized');
    refused.unmount();
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
