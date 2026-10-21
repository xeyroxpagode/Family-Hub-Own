/**
 * HOMePLUS Assets — S7-05 contract test: cliente, hook y caché de "Próximo".
 *
 * Test de contrato standalone (DETERMINISTIC), mismo patrón que
 * assetsDataLoop.contract.test.js: se transpila el TypeScript necesario y se
 * verifica el contrato SIN renderizar.
 *
 * Contratos verificados:
 *   - La key de plannerItems es ['assets','plannerItems', householdId, assetId]:
 *     el householdId queda en el índice 2 (convención de Assets).
 *   - classifyAssetsKey reconoce 'plannerItems'.
 *   - El TTL de plannerItems es 30 s.
 *   - El cliente usa el endpoint correcto y NO genera claves de idempotencia.
 *   - El create invalida plannerItems + detail del activo (invalidación
 *     dirigida, sin invalidación global).
 *   - El hook se protege con requestSeq y revalida al volver a la pantalla.
 */

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

if (typeof globalThis.__DEV__ === 'undefined') globalThis.__DEV__ = false;

const FRONT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(FRONT, relative), 'utf8');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passCount += 1;
  } catch (error) {
    console.error(`  FAIL: ${name}: ${error?.message ?? error}`);
    failCount += 1;
  }
}

// ── La key canónica ─────────────────────────────────────────────────────────

const { assetsKeys, classifyAssetsKey, assetsHouseholdOf } = require(
  path.join(FRONT, 'services', 'assets', 'assetsKeys.ts'),
);

runTest('assetsKeys.plannerItems tiene la forma congelada', () => {
  const key = assetsKeys.plannerItems({ householdId: 'hh-1' }, 'asset-1');
  assert.deepEqual(key, ['assets', 'plannerItems', 'hh-1', 'asset-1']);
});

runTest('el householdId queda en el índice 2', () => {
  const key = assetsKeys.plannerItems({ householdId: 'hh-1' }, 'asset-1');
  assert.equal(key[2], 'hh-1');
  assert.equal(assetsHouseholdOf(key), 'hh-1');
});

runTest('classifyAssetsKey reconoce plannerItems', () => {
  assert.equal(classifyAssetsKey(assetsKeys.plannerItems({ householdId: 'hh-1' }, 'a-1')), 'plannerItems');
  assert.equal(classifyAssetsKey(['assets', 'assets', 'hh-1', 'detail', 'a-1']), 'assets');
  assert.equal(classifyAssetsKey(['otro', 'plannerItems', 'hh-1']), null);
});

runTest('dos households nunca comparten la key de plannerItems', () => {
  const a = assetsKeys.plannerItems({ householdId: 'hh-1' }, 'a-1');
  const b = assetsKeys.plannerItems({ householdId: 'hh-2' }, 'a-1');
  assert.notDeepEqual(a, b);
});

// ── El TTL ──────────────────────────────────────────────────────────────────

const cacheSource = read('services/assets/assetsCache.ts');

runTest('el TTL de plannerItems es de 30 segundos', () => {
  assert.match(cacheSource, /plannerItems:\s*30_000/);
});

runTest('la caché sigue usando el household como scope', () => {
  assert.match(cacheSource, /scopeForKey:\s*\(key\)\s*=>\s*assetsHouseholdOf\(key\)/);
});

// ── El cliente ──────────────────────────────────────────────────────────────

const clientSource = read('services/assets/plannerItems.ts');

runTest('el cliente pega al endpoint de planner-items del activo', () => {
  assert.match(clientSource, /\/api\/assets\/\$\{assetId\}\/planner-items/);
});

runTest('el cliente expone las tres funciones congeladas', () => {
  assert.match(clientSource, /export const listAssetPlannerItems/);
  assert.match(clientSource, /export const createAssetPlannerTask/);
  assert.match(clientSource, /export const createAssetPlannerEvent/);
});

runTest('el cliente NUNCA genera una clave de idempotencia nueva', () => {
  assert.doesNotMatch(clientSource, /createIdempotencyKey/);
  assert.doesNotMatch(clientSource, /generateMutationId/);
  assert.match(clientSource, /idempotentOptions\(accessToken, intent,/, 'transporta la identidad del caller');
  const clientModule = read('services/assets/client.ts');
  assert.match(clientModule, /idempotencyKey: intent\.idempotencyKey/, 'la cabecera usa la del caller');
  assert.match(clientModule, /mutationId: intent\.mutationId/, 'el mutation id usa el del caller');
});

runTest('el cliente invalida plannerItems + detail del activo (invalidación dirigida)', () => {
  assert.match(clientSource, /assetsKeys\.plannerItems\(scope, assetId\)/);
  assert.match(clientSource, /assetsKeys\.detail\(scope, assetId\)/);
  assert.doesNotMatch(clientSource, /invalidateHousehold/, 'no hay invalidación global');
});

runTest('el cliente no puede inyectar origin_*', () => {
  const payload = clientSource.slice(clientSource.indexOf('export const createAssetPlannerTask'));
  assert.doesNotMatch(payload, /origin_module/, 'el cliente no manda origin_module');
  assert.doesNotMatch(payload, /origin_entity_id/, 'el cliente no manda origin_entity_id');
});

runTest('el create reconcilia antes de dejar reintentar', () => {
  assert.match(clientSource, /unknown_outcome/, 'clasifica el outcome desconocido');
  assert.match(clientSource, /invalidateAssetPlannerItems\(householdId, assetId\);/, 'invalida antes de reconciliar');
  assert.match(clientSource, /listAssetPlannerItems\(accessToken, assetId, \{ limit: 20 \}\)/, 'relee el read model');
  assert.match(clientSource, /status: 'reconciled'/, 'si el item existe, no reintenta');
  assert.match(clientSource, /status: 'unknown'/, 'si no existe, deja el reintento con la misma clave');
});

// ── El hook ─────────────────────────────────────────────────────────────────

const hookSource = read('hooks/assets/useAssetPlannerItems.ts');

runTest('el hook se protege con requestSeq', () => {
  assert.match(hookSource, /const requestSeq = useRef\(0\);/);
  assert.match(hookSource, /if \(sequence !== requestSeq\.current\) return;/);
});

runTest('el hook revalida al volver a la pantalla (foco)', () => {
  assert.match(hookSource, /useFocusEffect\(/);
});

runTest('el hook usa la caché household-scoped', () => {
  assert.match(hookSource, /assetsKeys\.plannerItems\(\{ householdId \}, assetId\)/);
});

runTest('el hook no dispara una storm: el primer focus no refetchea', () => {
  assert.match(hookSource, /didFocus\.current/, 'el primer focus se salta');
});

runTest('el hook expande "Ver todos" in place con el límite máximo', () => {
  assert.match(hookSource, /ASSET_PLANNER_ITEMS_DEFAULT_LIMIT = 3/);
  assert.match(hookSource, /ASSET_PLANNER_ITEMS_MAX_LIMIT = 20/);
  assert.match(hookSource, /setShowAll/, 'expande sin navegar');
});

console.log(`\nASSETS_S7_PLANNER_ITEMS_CONTRACT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.log('ASSETS_S7_PLANNER_ITEMS_CONTRACT=FAIL');
  process.exit(1);
}
console.log('ASSETS_S7_PLANNER_ITEMS_CONTRACT=PASS');
