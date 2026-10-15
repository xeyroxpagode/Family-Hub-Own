'use strict';

// Resolves the Planner runtime suites' module graph onto real React plus the
// renderer-compatible mocks in this folder.
//
// The repository's default `tests/stubs` React is deliberately inert (hooks
// have no state semantics), so it cannot express "does the menu actually mount
// and respond". These suites therefore install their own resolution: `react` and
// `react-test-renderer` come from the app's real node_modules, while only the
// native surface is mocked. Application modules under test are NOT mocked.

const path = require('path');
const fs = require('fs');

/**
 * Locate the repository root from wherever this module was compiled to.
 * The runtime suites are emitted to `scripts/compiled-planner-runtime/scripts/
 * planner_runtime_mocks/`, so the frontend workspace is four levels up; when
 * running from source (`scripts/planner_runtime_mocks/`) it is two.
 */
function resolveRepositoryRoot(): string {
  let dir = __dirname;
  for (let depth = 0; depth < 10; depth++) {
    if (fs.existsSync(path.join(dir, 'front', 'mi-front-limpio', 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error('unable to locate repository root from ' + __dirname);
}

const REPOSITORY_ROOT = resolveRepositoryRoot();

const MOCKS = {
  'react-native': path.join(__dirname, 'reactNativeMock.js'),
  'expo-haptics': path.join(__dirname, 'expoHapticsMock.js'),
  '@expo/vector-icons': path.join(__dirname, 'vectorIconsMock.js'),
  '@react-native-async-storage/async-storage': path.join(__dirname, 'asyncStorageMock.js'),
  'expo-status-bar': path.join(__dirname, 'expoStatusBarMock.js'),
  'react-native-safe-area-context': path.join(__dirname, 'safeAreaContextMock.js'),
};

// Mocked so a runtime suite can mount a component that reaches for a browser or
// native-only global. Never a component under test.
const GLOBAL_STUBS = {
  fetch: async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => '',
  }),
};

export function installPlannerRuntimeMocks(options?: { env?: Record<string, string> }) {
  const Module = require('module');
  const frontendPackageJson = path.join(REPOSITORY_ROOT, 'front', 'mi-front-limpio', 'package.json');
  // Resolve `react` / `react-test-renderer` exactly as the app does, from the
  // frontend workspace, so the runtime under test is the real one.
  const frontendRequire = Module.createRequire(frontendPackageJson);

  // `react` and `react-test-renderer` must resolve to the REAL runtime, so the
  // inert repository React stub has to be shadowed explicitly.
  const shadowed: Record<string, string> = {
    react: frontendRequire.resolve('react'),
    'react-test-renderer': frontendRequire.resolve('react-test-renderer'),
  };

  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function patchedResolve(request, ...rest) {
    const parentFilename = rest[0] && rest[0].filename;
    // Only intercept requires issued from compiled output. Running from
    // TypeScript source (ts-node style) must not be redirected.
    const fromCompiled =
      typeof parentFilename === 'string' && parentFilename.includes('compiled');

    if (fromCompiled && shadowed[request]) {
      return shadowed[request];
    }
    if (fromCompiled && MOCKS[request]) {
      return MOCKS[request];
    }
    return originalResolve.call(this, request, ...rest);
  };

  for (const [key, value] of Object.entries(GLOBAL_STUBS)) {
    if (globalThis[key] === undefined) {
      (globalThis as any)[key] = value;
    }
  }

  if (options && options.env) {
    for (const [key, value] of Object.entries(options.env)) {
      (process.env as Record<string, string | undefined>)[key] = value;
    }
  }

  // react-test-renderer requires this flag before `act()` may be used.
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return function uninstall() {
    Module._resolveFilename = originalResolve;
  };
}

export const FRONTEND_NODE_MODULES = path.join(REPOSITORY_ROOT, 'front', 'mi-front-limpio', 'node_modules');
