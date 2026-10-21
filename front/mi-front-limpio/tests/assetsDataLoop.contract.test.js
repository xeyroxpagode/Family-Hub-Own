/**
 * Assets P0 hotfix — regresión del loop de lectura (Maximum update depth +
 * request storm tras 403 en GET /api/assets).
 *
 * Causa raíz: `useAssetsList` recibía el objeto `filters` inline (nueva
 * referencia por render del caller). `runFetch` lo tenía en su array de
 * dependencias, por lo que se recreaba en cada render y el effect de carga
 * re-disparaba el fetch infinitamente (también tras un 403 definitivo).
 *
 * Este test de contrato asegura los invariantes que eliminan el loop:
 *   1. `runFetch` depende de `filterKey` (string estable), NUNCA de la
 *      referencia `filters`.
 *   2. El cuerpo de `runFetch` lee los filtros vía `filtersRef.current`.
 *   3. `filtersRef` se sincroniza con un effect (sin escribir en render).
 *   4. El effect de carga depende de [accessToken, cacheKey, householdId,
 *      runFetch] — sin `filters`.
 *   5. Sin retries automáticos: no hay setInterval/timers de reintento en el
 *      hook, y un 403 clasifica como `forbidden` con retryAllowed === false.
 *
 * Estilo: contract test standalone (mismo patrón que experienceMode.contract).
 */
/* eslint-disable no-undef -- script CommonJS: __dirname disponible en runtime node */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

// api.ts consulta el global __DEV__ (Runtime de React Native); no existe en node.
if (typeof globalThis.__DEV__ === 'undefined') globalThis.__DEV__ = false;

const hookSource = fs.readFileSync(
  path.join(__dirname, '..', 'hooks', 'assets', 'useAssetsData.ts'),
  'utf8',
);

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (error) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
    process.exitCode = 1;
  }
}

console.log('Assets P0 hotfix — regresión loop de lectura\n');

const RUN_FETCH_DEPS = '[accessToken, filterKey, householdId, scope]';
runTest('runFetch depende de filterKey, no de la referencia filters', () => {
  const withDeps = hookSource.split('const runFetch = useCallback(')[1] ?? null;
  assert.ok(withDeps, 'runFetch useCallback encontrado');
  assert.ok(
    withDeps.includes(RUN_FETCH_DEPS),
    `las dependencias de runFetch deben ser exactamente ${RUN_FETCH_DEPS}`,
  );
  assert.ok(
    !/\[\s*accessToken\s*,\s*filterKey\s*,\s*filters\s*,/.test(withDeps) &&
      !/\[\s*accessToken\s*,\s*filters\s*,/.test(withDeps),
    'runFetch no debe depender de la referencia filters',
  );
});

runTest('el cuerpo de runFetch lee filtros vía filtersRef.current', () => {
  const body = hookSource.split('const runFetch = useCallback(')[1].split('}, [')[0];
  assert.ok(body.includes('filtersRef.current'), 'listAssets debe recibir filtersRef.current');
  assert.ok(
    !/\(filters \?\? \{\}\)/.test(body),
    'el cuerpo no debe usar el cierre filters directamente',
  );
});

runTest('filtersRef se sincroniza por effect (sin escribir refs en render)', () => {
  assert.ok(/const filtersRef = useRef<[^>]+>\(filters\)/.test(hookSource), 'filtersRef declarado');
  assert.ok(
    /useEffect\(\(\) => \{\s*filtersRef\.current = filters;\s*\}, \[filters\]\)/.test(hookSource),
    'sincronización de filtersRef en useEffect con deps [filters]',
  );
});

runTest('el effect de carga no incluye filters en sus dependencias', () => {
  const effect = hookSource.split('useEffect(() => {\n    if (!accessToken || !householdId) {')[1] ?? null;
  assert.ok(effect, 'effect de carga encontrado');
  const deps = effect.split('// cacheKey cambia')[1] ?? effect.split('}, [')[1];
  assert.ok(deps, 'deps del effect encontradas');
  assert.match(deps, /\[accessToken, cacheKey, householdId, runFetch\]/);
});

runTest('sin retries automáticos en el hook (no setInterval/timers de reintento)', () => {
  assert.ok(!hookSource.includes('setInterval'), 'no setInterval');
  assert.ok(!/retry/i.test(hookSource.split('export function useAssetsList')[1].split('export type AssetDetailState')[0]), 'useAssetsList no contiene lógica de retry');
});

runTest('403 clasifica como forbidden con retryAllowed=false', () => {
  // errors.ts -> api.ts importa react-native; se intercepta para node (no hay runtime RN acá).
  const Module = require('node:module');
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'react-native') return { Platform: { OS: 'android' } };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const { toAssetsFailure } = require(path.join(__dirname, '..', 'services', 'assets', 'errors.ts'));
    const { ApiError } = require(path.join(__dirname, '..', 'services', 'api.ts'));
  const failure = toAssetsFailure(
    new ApiError('No tenés permiso para realizar esta acción en Assets.', 403, 'assets_forbidden', null, null, {
      capability: 'assets.view',
    }),
  );
  assert.equal(failure.kind, 'forbidden');
  assert.equal(failure.retryAllowed, false);
  assert.equal(failure.retryWithSameKeyAllowed, false);
  } finally {
    Module._load = originalLoad;
  }
});

console.log('\n--- Summary ---');
console.log('Loop regression contract completed.');
