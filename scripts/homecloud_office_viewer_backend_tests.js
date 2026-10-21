'use strict';

/**
 * HomeCloud Office Viewer V1 — OFFICE-3, evidencia determinística backend.
 *
 * Sin red, sin DB, sin Docker: solo lógica pura del servicio
 * (clasificación de los seis formatos, read-only enforcement por familia,
 * JWT HS256, store con TTL).
 * La matriz de autorización HTTP y la expiración sobre la API real son
 * LOCAL_RUNTIME_REQUIRED y se validan contra el stack local en la suite
 * homecloud-office-viewer-integration.
 */

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:9999';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

const {
  SESSION_TTL_MS,
  classifyOfficeDocument,
  signOfficeJwt,
  verifyOfficeJwt,
  createOfficeSessionStore,
  buildOfficeEditorConfig,
  getMaxDocumentBytes,
  documentBaseUrl,
} = require('../backend/src/services/homecloudOfficeViewerService');

let passCount = 0;
let failCount = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passCount += 1;
  } else {
    failCount += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// O-A. Clasificación OFFICE-3: los seis formatos Office V1 con su familia
// (documentType de ONLYOFFICE) y su fileType genuino (extensión original).
const CLASSIFICATION_CASES = [
  ['informe.docx', 'application/octet-stream', 'word', 'docx'],
  ['ACTA.DOC', null, 'word', 'doc'],
  ['plan.xlsx', 'application/octet-stream', 'cell', 'xlsx'],
  ['PLAN.XLS', null, 'cell', 'xls'],
  ['deck.pptx', 'application/octet-stream', 'slide', 'pptx'],
  ['DECK.PPT', null, 'slide', 'ppt'],
];
for (const [name, mime, family, fileType] of CLASSIFICATION_CASES) {
  const result = classifyOfficeDocument({ fileName: name, mimeType: mime });
  check(`${name} soportado`, result.supported === true);
  check(`${name} familia ${family}`, result.family === family);
  check(`${name} fileType genuino ${fileType}`, result.fileType === fileType);
}
// Clasificación por MIME cuando la extensión no dice nada útil.
const MIME_CASES = [
  ['x.bin', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'word', 'docx'],
  ['x.bin', 'application/msword', 'word', 'doc'],
  ['x.bin', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'cell', 'xlsx'],
  ['x.bin', 'application/vnd.ms-excel', 'cell', 'xls'],
  ['x.bin', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'slide', 'pptx'],
  ['x.bin', 'application/vnd.ms-powerpoint', 'slide', 'ppt'],
];
for (const [name, mime, family, fileType] of MIME_CASES) {
  const result = classifyOfficeDocument({ fileName: name, mimeType: mime });
  check(`mime ${fileType} clasifica ${family}`, result.supported === true && result.family === family && result.fileType === fileType);
}
// Los formatos Office NO-V1 y las demás familias siguen sin soporte: no se
// finge compatibilidad (odt, rtf, docm, ods, xlsm, odp, pptm, pps, key…).
for (const name of ['doc.pdf', 'foto.png', 'texto.odt', 'nota.rtf', 'macro.docm', 'hoja.ods', 'libro.xlsm', 'pres.odp', 'macro.pptm', 'anim.ppsx', 'sin-extension']) {
  check(`${name} no soportado (formato no-V1)`, classifyOfficeDocument({ fileName: name }).supported === false);
}

// O-B. Read-only enforcement en la config, por familia (word | cell | slide).
const fakeSession = { id: 'sess-1', contentId: 'content-1', fileType: 'docx', documentType: 'word', title: 'informe.docx' };
const config = buildOfficeEditorConfig({ session: fakeSession, personId: 'person-1', documentUrl: 'https://x/api/doc' });
check('mode view', config.editorConfig.mode === 'view');
check('documentType word', config.documentType === 'word');
check('fileType genuino docx', config.document.fileType === 'docx');
// Contratos de hoja de cálculo (XLSX/XLS) y presentación (PPTX/PPT): el
// documentType por familia llega firmado en la config, con el fileType
// genuino del original.
const sheetSession = { id: 'sess-2', contentId: 'content-2', fileType: 'xls', documentType: 'cell', title: 'plan.xls' };
const sheetConfig = buildOfficeEditorConfig({ session: sheetSession, personId: 'person-1', documentUrl: 'https://x/api/doc' });
check('documentType cell para XLS', sheetConfig.documentType === 'cell' && sheetConfig.document.fileType === 'xls');
const slideSession = { id: 'sess-3', contentId: 'content-3', fileType: 'pptx', documentType: 'slide', title: 'deck.pptx' };
const slideConfig = buildOfficeEditorConfig({ session: slideSession, personId: 'person-1', documentUrl: 'https://x/api/doc' });
check('documentType slide para PPTX', slideConfig.documentType === 'slide' && slideConfig.document.fileType === 'pptx');
for (const perm of ['comment', 'copy', 'download', 'edit', 'print', 'review', 'chat']) {
  check(`permiso ${perm} deshabilitado`, config.document.permissions[perm] === false);
}
check('customization comments off', config.editorConfig.customization.comments === false);
check('customization chat off', config.editorConfig.customization.chat === false);
check('customization review off', config.editorConfig.customization.review === false);
check('sin callbackUrl (no write-back)', !('callbackUrl' in config.editorConfig) && !JSON.stringify(config).includes('callbackUrl'));
check('key único por sesión', config.document.key === 'office-content-1-sess-1');
// Read-only enforcement idéntico en las otras dos familias.
for (const [label, otherConfig] of [['cell', sheetConfig], ['slide', slideConfig]]) {
  check(`${label} mode view`, otherConfig.editorConfig.mode === 'view');
  check(`${label} type embedded`, otherConfig.type === 'embedded');
  for (const perm of ['comment', 'copy', 'download', 'edit', 'print', 'review', 'chat']) {
    check(`${label} permiso ${perm} deshabilitado`, otherConfig.document.permissions[perm] === false);
  }
  check(`${label} sin callbackUrl`, !JSON.stringify(otherConfig).includes('callbackUrl'));
}

// O-B2. OFFICE-2: visor EMBEBIDO, no el editor de escritorio. La config que
// viaja firmada debe pedir el visor compacto de documento y NO contener las
// URLs que expondrían enlaces de compartir/embeber/guardar por parte del
// DocServer (el original se comparte desde HomePlus).
check('type embedded (OFFICE-2)', config.type === 'embedded');
check('mode view persiste en embedded', config.editorConfig.mode === 'view');
check('sin sección editorConfig.embedded', !('embedded' in config.editorConfig));
check('sin URLs share/embed/save/fullscreen', !/(embedUrl|shareUrl|saveUrl|fullscreenUrl)/.test(JSON.stringify(config)));

// O-C. JWT HS256: roundtrip, tamper y secreto ajeno.
const secret = 'secreto-local-de-prueba-suficientemente-largo';
const token = signOfficeJwt(config, secret);
check('jwt verifica con el mismo secreto', JSON.stringify(verifyOfficeJwt(token, secret)) === JSON.stringify(config));
const tampered = `${token.slice(0, -2)}ab`;
check('jwt manipulado se rechaza', verifyOfficeJwt(tampered, secret) === null);
check('jwt con otro secreto se rechaza', verifyOfficeJwt(token, 'otro-secreto') === null);
check('jwt malformado se rechaza', verifyOfficeJwt('no-es-jwt', secret) === null);

// O-D. Store: vigencia, expiración, cancelación, límite.
let now = 1_000_000;
const store = createOfficeSessionStore({ now: () => now, ttlMs: SESSION_TTL_MS, maxSessions: 2 });
const s1 = store.create({ contentId: 'c1', householdId: 'h1', fileType: 'docx', title: 'a.docx' });
check('sesión visible al crear', store.get(s1.id)?.id === s1.id);
check('download token con entropía', typeof s1.downloadToken === 'string' && s1.downloadToken.length >= 32);
now += SESSION_TTL_MS + 1;
check('sesión expirada invisible', store.get(s1.id) === null);
const s2 = store.create({ contentId: 'c2', householdId: 'h1', fileType: 'doc', title: 'b.doc' });
check('revocar existe', store.revoke(s2.id) === true);
check('revocada invisible', store.get(s2.id) === null);
check('revocar inexistente es false', store.revoke('no-existe') === false);
now = 0;
const small = createOfficeSessionStore({ now: () => now, ttlMs: SESSION_TTL_MS, maxSessions: 2 });
const a = small.create({ contentId: 'c1', householdId: 'h1', fileType: 'docx', title: 'a' });
small.create({ contentId: 'c2', householdId: 'h1', fileType: 'docx', title: 'b' });
small.create({ contentId: 'c3', householdId: 'h1', fileType: 'docx', title: 'c' });
check('límite de sesiones expulsa la más antigua', small.get(a.id) === null && small.size() === 2);

// O-E. Cap de tamaño.
check('default 100MB', getMaxDocumentBytes({}) === 100 * 1024 * 1024);
check('override por env', getMaxDocumentBytes({ ONLYOFFICE_VIEWER_MAX_BYTES: '1024' }) === 1024);
let threw = false;
try {
  getMaxDocumentBytes({ ONLYOFFICE_VIEWER_MAX_BYTES: 'no-numérico' });
} catch {
  threw = true;
}
check('env inválido lanza', threw === true);

// O-F. Base de descarga OFFICE-2: es el BACKEND visto desde el contenedor,
// nunca la URL pública del DocServer. Sin INTERNAL hay fail-fast
// (office_viewer_unavailable) en vez de apuntar al servidor equivocado.
check('documentBaseUrl usa INTERNAL', documentBaseUrl({ ONLYOFFICE_INTERNAL_API_URL: 'http://host.docker.internal:3001/' }) === 'http://host.docker.internal:3001');
let noFallback = false;
try {
  documentBaseUrl({ ONLYOFFICE_PUBLIC_URL: 'https://docs.example.com' });
} catch (error) {
  noFallback = error?.code === 'office_viewer_unavailable';
}
check('documentBaseUrl sin INTERNAL falla con office_viewer_unavailable', noFallback);
let emptyFallback = false;
try {
  documentBaseUrl({});
} catch (error) {
  emptyFallback = error?.code === 'office_viewer_unavailable';
}
check('documentBaseUrl sin env falla con office_viewer_unavailable', emptyFallback);

console.log(`OFFICE VIEWER BACKEND: ${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
