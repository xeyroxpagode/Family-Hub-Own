'use strict';

/**
 * HomeCloud Office Viewer V1 — OFFICE-1, evidencia determinística backend.
 *
 * Sin red, sin DB, sin Docker: solo lógica pura del servicio
 * (clasificación, read-only enforcement, JWT HS256, store con TTL).
 * La matriz de autorización HTTP y la expiración sobre la API real son
 * LOCAL_RUNTIME_REQUIRED y se validan contra el stack local en OFFICE-4.
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

// O-A. Clasificación: OFFICE-1 solo Word (DOCX/DOC).
check('docx soportado', classifyOfficeDocument({ fileName: 'informe.docx', mimeType: 'application/octet-stream' }).supported === true);
check('DOC mayúsculas soportado', classifyOfficeDocument({ fileName: 'ACTA.DOC', mimeType: null }).supported === true);
check('mime docx sin extensión útil', classifyOfficeDocument({ fileName: 'x.bin', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }).supported === true);
check('fileType docx', classifyOfficeDocument({ fileName: 'a.docx' }).fileType === 'docx');
check('fileType doc', classifyOfficeDocument({ fileName: 'a.doc' }).fileType === 'doc');
for (const name of ['plan.xlsx', 'plan.xls', 'deck.pptx', 'deck.ppt', 'doc.pdf', 'foto.png', 'texto.odt', 'nota.rtf', 'sin-extension']) {
  check(`${name} no soportado en OFFICE-1`, classifyOfficeDocument({ fileName: name }).supported === false);
}

// O-B. Read-only enforcement en la config.
const fakeSession = { id: 'sess-1', contentId: 'content-1', fileType: 'docx', title: 'informe.docx' };
const config = buildOfficeEditorConfig({ session: fakeSession, personId: 'person-1', documentUrl: 'https://x/api/doc' });
check('mode view', config.editorConfig.mode === 'view');
check('documentType word', config.documentType === 'word');
for (const perm of ['comment', 'copy', 'download', 'edit', 'print', 'review', 'chat']) {
  check(`permiso ${perm} deshabilitado`, config.document.permissions[perm] === false);
}
check('customization comments off', config.editorConfig.customization.comments === false);
check('customization chat off', config.editorConfig.customization.chat === false);
check('customization review off', config.editorConfig.customization.review === false);
check('sin callbackUrl (no write-back)', !('callbackUrl' in config.editorConfig) && !JSON.stringify(config).includes('callbackUrl'));
check('key único por sesión', config.document.key === 'office-content-1-sess-1');

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
