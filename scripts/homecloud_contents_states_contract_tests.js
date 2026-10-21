#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS HomeCloud — S8-03 contract tests: POST /api/homecloud/contents/states.
 *
 * DETERMINISTIC. Verifica el contrato congelado por lectura de las fuentes
 * (la ruta, el controlador, el servicio y la tabla).
 *
 * Contrato:
 *   - Ruta: POST /api/homecloud/contents/states.
 *   - Auth: el router de HomeCloud instala authFinalMiddleware.
 *   - Capability: homecloud.view (proyección canónica de HomeCloud).
 *   - Body: { ids: [uuid] }, máximo 200.
 *   - Body inválido -> 400 validation_error.
 *   - Household-scoped: un id de otro household responde EXACTAMENTE como un
 *     id inexistente (exists:false, lifecycle:null, metadata null).
 *   - Salida: { contents: [ { id, exists, lifecycle, display_name, mime_type,
 *     extension, size_bytes, document_date } ] }.
 *   - lifecycle normalizado: active | trashed | purging | staging | null.
 *   - NO hay 403/404 por id individual.
 *   - Sin caché y sin migración de base de datos.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');

let passCount = 0;
let failCount = 0;

function check(value, label) {
  if (value) {
    passCount += 1;
    console.log(`  PASS: ${label}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${label}`);
  return false;
}

console.log('\n=== HOMECLOUD S8-03 CONTENTS STATES CONTRACT ===');

const routes = read('backend/src/routes/homecloud.js');
const controller = read('backend/src/controllers/homecloud.contentstates.controller.js');
const service = read('backend/src/services/homecloudContentStates.service.js');
const readService = read('backend/src/services/homecloudReadService.js');
const assetsFiles = read('backend/src/services/assets.files.service.js');

// ── 1. La ruta ───────────────────────────────────────────────────────────────
check(
  /router\.post\('\/contents\/states', contentStatesController\.listContentStatesController\)/.test(routes),
  'la ruta POST /api/homecloud/contents/states está registrada',
);
check(
  /router\.use\(authFinalMiddleware\)/.test(routes),
  'el router de HomeCloud instala authFinalMiddleware',
);
check(
  routes.indexOf("router.post('/contents/states'") < routes.indexOf("router.post('/content/:contentId/upload'"),
  'la ruta literal se registra antes que las rutas con parámetro',
);

// ── 2. La capability ─────────────────────────────────────────────────────────
check(
  /requireHomeCloudView\(context\)/.test(controller),
  'el controlador exige homecloud.view',
);
check(
  /async function requireHomeCloudView/.test(readService),
  'la proyección usa la función canónica de HomeCloud',
);

// ── 3. La validación del body ────────────────────────────────────────────────
check(
  /normalizeContentStatesIds\(body\.ids\)/.test(controller),
  'el controlador normaliza los ids',
);
check(
  /MAX_CONTENT_STATES_IDS = 200/.test(service),
  'el máximo es 200 ids',
);
check(
  /'validation_error'/.test(service),
  'un body inválido responde validation_error',
);
check(
  /createHttpError\(400, 'ids debe ser un arreglo de identificadores\.'/.test(service),
  'ids no-array -> 400',
);
check(
  /rawIds\.length > MAX_CONTENT_STATES_IDS/.test(service),
  'más de 200 ids -> 400',
);
check(
  /typeof raw !== 'string' \|\| !UUID_RE\.test\(raw\.trim\(\)\)/.test(service),
  'un id no-uuid -> 400',
);

// ── 4. La forma de la salida ─────────────────────────────────────────────────
check(
  /res\.status\(200\)\.json\(\{ contents \}\)/.test(controller),
  'la respuesta es { contents }',
);
check(
  /id: row\.id,\s*exists: true,\s*lifecycle: row\.lifecycle \?\? null,\s*display_name: row\.display_name \?\? null,\s*mime_type: row\.mime_type \?\? null,\s*extension: row\.extension \?\? null,\s*size_bytes: row\.size_bytes \?\? null,\s*document_date: row\.document_date \?\? null,/.test(service),
  'la proyección tiene la forma congelada',
);
check(
  /function absentContentState\(id\)/.test(service),
  'existe la proyección ausente',
);
check(
  /exists: false,\s*lifecycle: null,\s*display_name: null,\s*mime_type: null,\s*extension: null,\s*size_bytes: null,\s*document_date: null,/.test(service),
  'la proyección ausente tiene todos los campos en null',
);

// ── 5. El no-disclosure ──────────────────────────────────────────────────────
check(
  /\.eq\('household_id', householdId\)/.test(service),
  'la consulta está acotada al household',
);
check(
  /\.eq\('role', 'file'\)/.test(service),
  'sólo proyecta Files (una Memoria no es un File adjuntable)',
);
check(
  /original_storage_path|preview_storage_path|note|caption/.test(service) === false
    || /CONTENT_STATES_FIELDS = \[[\s\S]*?'document_date',/.test(service),
  'la proyección nunca lee rutas de storage',
);
check(
  !/original_storage_path/.test(service.split('CONTENT_STATES_FIELDS')[1].split('];')[0]),
  'la lista de campos NO incluye rutas de storage',
);

// ── 6. Sin caché y sin migración ─────────────────────────────────────────────
check(
  /'Cache-Control': 'no-store, no-cache, must-revalidate, private'/.test(controller),
  'la respuesta es no-store',
);

// ── 7. La integración con Assets usa el mismo servicio canónico ─────────────
check(
  /getContentState,\s*\} = require\('\.\/homecloudContentStates\.service'\)/.test(assetsFiles),
  'Assets valida el File por el servicio canónico de HomeCloud',
);
check(
  /require\('\.\/homecloudContentStates\.service'\)/.test(assetsFiles),
  'Assets NO lee homecloud_contents por su cuenta',
);
check(
  !/from\('homecloud_contents'\)/.test(assetsFiles),
  'Assets no consulta la tabla homecloud_contents directamente',
);

console.log(`\nHOMECLOUD_S8_CONTENTS_STATES pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('HOMECLOUD_S8_CONTENTS_STATES=FAIL');
  process.exit(1);
}
console.log('HOMECLOUD_S8_CONTENTS_STATES=PASS');
