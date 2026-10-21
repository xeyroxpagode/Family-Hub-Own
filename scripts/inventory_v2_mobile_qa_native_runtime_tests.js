'use strict';

/**
 * MOBILE QA BRIDGE — NATIVE RUNTIME EVIDENCE.
 *
 * The physical iOS crash was:
 *
 *   TypeError: undefined is not a function
 *   source: front/mi-front-limpio/screens/MoreScreen.tsx ~ line 70
 *   stack:  React.useEffect
 *
 * WHY IT CRASHED ONLY ON THE PHONE. React Native native defines `window` as an
 * ALIAS of the RN global object (react-native/Libraries/Core/setUpGlobals.js:
 * `global.window = global;`). The RN global has NO DOM EventTarget API, so
 * `window.addEventListener` is `undefined` and CALLING it throws exactly
 * "undefined is not a function". On the web the same expression is a real DOM
 * method, which is why browser QA never saw it.
 *
 * WHAT THIS FILE PROVES. It EXECUTES the real MoreScreen module (transpiled
 * with the app's own TypeScript) inside a host that reproduces the React
 * Native native global, and asserts that:
 *
 *   1. the screen renders on a native host (no throw);
 *   2. no browser-only API is touched on native (not even a defined one);
 *   3. the visible QA row exists on native and navigates to InventoryV2Preview;
 *   4. the web automation hook is installed on web only, and is cleaned up;
 *   5. the web automation hook does not exist in a production build.
 *
 * The UI components are inert stubs: the defect lives in MoreScreen's own
 * effect and JSX, so the screen module itself is the subject under test.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frontendRoot = path.join(root, 'front', 'mi-front-limpio');
const moreScreenPath = path.join(frontendRoot, 'screens', 'MoreScreen.tsx');

const QA_ROW_LABEL = 'Abrir Inventario V2 (QA / Desarrollo)';

/**
 * The theme is presentation only. It is stubbed so the harness never depends
 * on a stylesheet contract to prove a navigation contract.
 */
const THEME_STUB = {
  colors: {
    info: { base: '#0b6b8f', soft: '#e6f2f7' },
    terracotta: { 600: '#a4502f', 50: '#f7ece6' },
    sage: { 600: '#4f6b4a', 50: '#eaf0e8' },
    text: { tertiary: '#8a8a8a' },
    border: { subtle: '#e0e0e0' },
  },
  radius: { lg: 12 },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  typography: {},
  motion: {},
  shadows: {},
};

function loadTypeScript() {
  const tsPath = path.join(frontendRoot, 'node_modules', 'typescript');
  if (!fs.existsSync(tsPath)) {
    throw new Error(
      'the mobile QA runtime evidence needs the frontend dependencies installed (missing ' + tsPath + ')',
    );
  }
  return require(tsPath);
}

/**
 * Applies a global environment for the duration of `run` and restores the
 * previous values afterwards. The screen reads `globalThis` at effect time, so
 * the environment MUST be in place before the module renders.
 */
function withGlobalEnvironment(environment, run) {
  const previous = new Map();
  for (const key of Object.keys(environment)) {
    previous.set(key, Object.prototype.hasOwnProperty.call(globalThis, key) ? globalThis[key] : undefined);
    globalThis[key] = environment[key];
  }
  try {
    return run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

/**
 * React Native native: `window` is the RN global object itself, and the RN
 * global exposes NO DOM API. The browser methods are explicitly undefined so
 * the host does not depend on the node version's globals.
 */
function nativeEnvironment() {
  return {
    window: globalThis,
    addEventListener: undefined,
    removeEventListener: undefined,
    location: undefined,
  };
}

/**
 * A browser: `window` IS the global object and the global object carries the
 * DOM EventTarget API, exactly as in a real browser tab.
 */
function webEnvironment(listeners) {
  return {
    window: globalThis,
    addEventListener(type, listener) {
      listeners.push({ type, listener });
    },
    removeEventListener(type, listener) {
      const index = listeners.findIndex((entry) => entry.type === type && entry.listener === listener);
      if (index >= 0) listeners.splice(index, 1);
    },
    location: { hash: '' },
  };
}

function createHost(options) {
  const navigationCalls = [];
  const cleanups = [];

  const React = {
    createElement(type, props, ...children) {
      return {
        type,
        props: {
          ...(props || {}),
          children: children.length <= 1 ? children[0] : children,
        },
      };
    },
    Fragment: Symbol.for('react.fragment'),
    // The real React runs effects after mount. The harness runs them inline so
    // the effect body is EXECUTED, not merely compiled.
    useEffect(effect) {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
  };
  React.default = React;
  React.__esModule = true;

  const reactNative = {
    Platform: {
      OS: options.platform,
      select: (values) => (values[options.platform] !== undefined ? values[options.platform] : values.default),
    },
    StyleSheet: { create: (styles) => styles || {}, hairlineWidth: 1 },
    View: 'View',
  };

  const navigation = {
    navigate(screen, params) {
      navigationCalls.push({ screen, params });
    },
  };

  const requireImpl = (id) => {
    if (id === 'react') return React;
    if (id === 'react-native') return reactNative;
    if (id === '@react-navigation/native') return { useNavigation: () => navigation };
    if (id.endsWith('constants/theme')) return THEME_STUB;
    if (id.endsWith('constants/icons')) {
      return { HomePlusIcon: (props) => React.createElement('HomePlusIcon', props) };
    }
    // Every UI component of the screen is inert but keeps its props, so the
    // rendered tree can be inspected and pressed.
    return (props) => React.createElement(id, props);
  };

  const ts = loadTypeScript();
  const source = fs.readFileSync(moreScreenPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: moreScreenPath,
    reportDiagnostics: false,
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
  });
  const moduleObject = { exports: {} };
  const factory = new Function('exports', 'require', 'module', '__filename', '__dirname', '__DEV__', outputText);
  factory(
    moduleObject.exports,
    requireImpl,
    moduleObject,
    moreScreenPath,
    path.dirname(moreScreenPath),
    options.dev === true,
  );

  return {
    React,
    module: moduleObject.exports,
    navigationCalls,
    cleanups,
    runCleanups() {
      while (cleanups.length > 0) {
        const cleanup = cleanups.pop();
        cleanup();
      }
    },
  };
}

function renderMoreScreen(options) {
  const host = createHost(options);
  const tree = host.module.MoreScreen({});
  return { ...host, tree };
}

/** Depth-first search over the rendered tree. */
function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (node.props && predicate(node)) return node;
  return findElement(node.props ? node.props.children : undefined, predicate);
}

function findByAccessibilityLabel(tree, label) {
  return findElement(tree, (element) => element.props.accessibilityLabel === label);
}

test('MoreScreen renders on a React Native native host without crashing', () => {
  withGlobalEnvironment(nativeEnvironment(), () => {
    const { tree, navigationCalls } = renderMoreScreen({ platform: 'ios', dev: true });
    assert.ok(tree, 'the screen renders on native');
    assert.deepEqual(navigationCalls, [], 'rendering navigates nowhere');
    assert.equal(
      globalThis.__hpMoreDevNavigate,
      undefined,
      'the web automation hook is not installed on the native global',
    );
  });
});

test('MoreScreen renders on an Android host without crashing', () => {
  withGlobalEnvironment(nativeEnvironment(), () => {
    const { tree } = renderMoreScreen({ platform: 'android', dev: true });
    assert.ok(tree, 'the screen renders on Android');
  });
});

test('no browser-only API is called from the native useEffect', () => {
  const calls = [];
  const tripwire = {
    window: globalThis,
    addEventListener(type) {
      calls.push(`addEventListener:${type}`);
    },
    removeEventListener(type) {
      calls.push(`removeEventListener:${type}`);
    },
    location: { hash: '' },
  };
  withGlobalEnvironment(tripwire, () => {
    renderMoreScreen({ platform: 'ios', dev: true });
    assert.deepEqual(calls, [], 'no DOM listener is installed or removed on native');
    assert.equal(globalThis.__hpMoreDevNavigate, undefined, 'the native global stays clean');
  });
});

test('the visible QA row exists on native and opens InventoryV2Preview', () => {
  withGlobalEnvironment(nativeEnvironment(), () => {
    const { tree, navigationCalls } = renderMoreScreen({ platform: 'ios', dev: true });
    const row = findByAccessibilityLabel(tree, QA_ROW_LABEL);
    assert.ok(row, 'the QA / Desarrollo row is rendered on native');
    assert.equal(typeof row.props.onPress, 'function', 'the QA row is pressable');
    row.props.onPress();
    assert.deepEqual(
      navigationCalls.map((call) => call.screen),
      ['InventoryV2Preview'],
      'the QA row navigates to InventoryV2Preview',
    );
  });
});

test('the web automation hook is installed on web only, and is cleaned up', () => {
  const listeners = [];
  withGlobalEnvironment(webEnvironment(listeners), () => {
    const { navigationCalls, runCleanups } = renderMoreScreen({ platform: 'web', dev: true });
    assert.equal(
      typeof globalThis.__hpMoreDevNavigate,
      'function',
      'the web automation hook is installed on web',
    );
    globalThis.__hpMoreDevNavigate('InventoryV2Preview');
    assert.deepEqual(
      navigationCalls.map((call) => call.screen),
      ['InventoryV2Preview'],
      'the web automation hook navigates',
    );
    assert.ok(
      listeners.some((entry) => entry.type === 'hashchange'),
      'the web automation hook listens to the hash change',
    );
    runCleanups();
    assert.equal(globalThis.__hpMoreDevNavigate, undefined, 'the web automation hook is removed');
    assert.equal(
      listeners.filter((entry) => entry.type === 'hashchange').length,
      0,
      'the web automation hook removes its listener',
    );
  });
});

test('the web automation hook does not exist in a production build', () => {
  const listeners = [];
  withGlobalEnvironment(webEnvironment(listeners), () => {
    const { tree } = renderMoreScreen({ platform: 'web', dev: false });
    assert.equal(globalThis.__hpMoreDevNavigate, undefined, 'no hook in production');
    assert.equal(listeners.length, 0, 'no listener in production');
    assert.equal(
      findByAccessibilityLabel(tree, QA_ROW_LABEL),
      null,
      'the QA row is not rendered in production',
    );
  });
});
