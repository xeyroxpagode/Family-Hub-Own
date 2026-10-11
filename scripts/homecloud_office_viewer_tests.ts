/**
 * HomeCloud Office Viewer V1 — OFFICE-1, evidencia determinística frontend.
 *
 * Contratos del cliente: qué formatos entran al visor integrado, qué HTML se
 * inyecta en el WebView (sin escape = XSS con el título del archivo), qué
 * mensajes del puente se aceptan y qué orígenes navega el WebView.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  OFFICE_BRIDGE_PROTOCOL_VERSION,
  buildOfficeViewerHtml,
  isOfficeViewerSupported,
  officeViewerAllowedOrigin,
  officeViewerExtensionOf,
  parseOfficeViewerMessage,
} from '../front/mi-front-limpio/services/homecloud/homecloudOfficeViewer';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const OFFICE_CLIENT = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudOfficeViewer.ts');
const VIEWER_SCREEN = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'HomeCloudFileViewerScreen.tsx');
const officeSource = fs.readFileSync(OFFICE_CLIENT, 'utf8');
const screenSource = fs.readFileSync(VIEWER_SCREEN, 'utf8');
const codeNoComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const officeCode = codeNoComments(officeSource);

let passCount = 0;
let failCount = 0;

function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passCount += 1;
  } else {
    failCount += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const minimalConfig = {
  document: { fileType: 'docx', key: 'office-c-s', title: 'a.docx', url: 'https://api/x', permissions: {} },
  documentType: 'word',
  editorConfig: { mode: 'view' },
};

// F-A. Elegibilidad OFFICE-1: solo docx/doc.
check('docx elegible', isOfficeViewerSupported({ fileName: 'informe.docx' }));
check('DOC mayúsculas elegible', isOfficeViewerSupported({ fileName: 'ACTA.DOC' }));
check('extensión con espacios', officeViewerExtensionOf('  a.docx  ') === 'docx');
for (const name of ['plan.xlsx', 'plan.xls', 'deck.pptx', 'deck.ppt', 'doc.pdf', 'foto.png', 'texto.odt', 'sin-extension']) {
  check(`${name} fuera del visor en OFFICE-1`, !isOfficeViewerSupported({ fileName: name }));
}

// F-B. HTML del editor: orígenes y escape.
const html = buildOfficeViewerHtml({
  apiJsUrl: 'https://docs.example.com/web-apps/apps/api/documents/api.js',
  config: minimalConfig,
  token: 'jwt-corto',
});
check('incluye api.js de la sesión', html.includes('https://docs.example.com/web-apps/apps/api/documents/api.js'));
check('usa DocsAPI.DocEditor', html.includes('DocsAPI.DocEditor'));
check('propaga DOCUMENT_READY', html.includes('DOCUMENT_READY'));
check('sin file:// en el html', !html.includes('file://'));
let rejected = false;
try {
  buildOfficeViewerHtml({ apiJsUrl: 'javascript:alert(1)', config: minimalConfig, token: 't' });
} catch {
  rejected = true;
}
check('rechaza esquema javascript:', rejected);
rejected = false;
try {
  buildOfficeViewerHtml({ apiJsUrl: 'nota-url', config: minimalConfig, token: 't' });
} catch {
  rejected = true;
}
check('rechaza URL inválida', rejected);

// Un título malicioso no puede romper el <script> que inyecta la config.
const evilHtml = buildOfficeViewerHtml({
  apiJsUrl: 'https://docs.example.com/web-apps/apps/api/documents/api.js',
  config: { ...minimalConfig, document: { ...minimalConfig.document, title: '</script><script>alert(1)</script>' } },
  token: 't',
});
check(
  'título con </script> neutralizado',
  !evilHtml.toLowerCase().includes('</script><script>'),
);

// F-B2. OFFICE-2: la config firmada viaja INTACTA al WebView. El tipo de
// visor (`type: "embedded"`: el visor compacto de documento, no el editor
// de escritorio) lo decide el backend dentro de la config firmada; el
// shell no lo inventa ni lo pierde en la inyección.
const embeddedHtml = buildOfficeViewerHtml({
  apiJsUrl: 'https://docs.example.com/web-apps/apps/api/documents/api.js',
  config: { ...minimalConfig, type: 'embedded' },
  token: 'jwt-embebido',
});
check('la config embedded viaja intacta al WebView', embeddedHtml.includes('"type":"embedded"'));
// OFFICE-2: el puente distingue arranque del editor (APP_READY/onAppReady) de
// documento listo, y la carga fallida del api.js tiene código propio.
check('el html cablea onAppReady', html.includes('onAppReady') && html.includes('APP_READY'));
check('el html detecta api.js no cargado', html.includes('api-load-failed'));

// F-C. Puente versionado.
check(
  'DOCUMENT_READY válido',
  parseOfficeViewerMessage(JSON.stringify({ v: OFFICE_BRIDGE_PROTOCOL_VERSION, type: 'DOCUMENT_READY' }))?.type === 'DOCUMENT_READY',
);
check(
  'APP_READY válido (el editor arrancó, el documento puede seguir en curso)',
  parseOfficeViewerMessage(JSON.stringify({ v: OFFICE_BRIDGE_PROTOCOL_VERSION, type: 'APP_READY' }))?.type === 'APP_READY',
);
check(
  'LOAD_ERROR válido con mensaje acotado',
  (parseOfficeViewerMessage(JSON.stringify({ v: OFFICE_BRIDGE_PROTOCOL_VERSION, type: 'LOAD_ERROR', message: 'x' })) as { message?: string } | null)?.message === 'x',
);
check(
  'LOAD_ERROR con código del motor',
  (parseOfficeViewerMessage(JSON.stringify({ v: OFFICE_BRIDGE_PROTOCOL_VERSION, type: 'LOAD_ERROR', message: 'editor-error:Download failed' })) as { message?: string } | null)?.message === 'editor-error:Download failed',
);
check('versión ajena se ignora', parseOfficeViewerMessage(JSON.stringify({ v: 999, type: 'DOCUMENT_READY' })) === null);
check('tipo desconocido se ignora', parseOfficeViewerMessage(JSON.stringify({ v: 1, type: 'EDIT_MADE' })) === null);
check('no-string se ignora', parseOfficeViewerMessage({ v: 1, type: 'DOCUMENT_READY' }) === null);
check('JSON roto se ignora', parseOfficeViewerMessage('{roto') === null);

// F-D. Origen permitido del WebView.
check('origen https', officeViewerAllowedOrigin('https://docs.example.com') === 'https://docs.example.com');
check('origen con path recortado', officeViewerAllowedOrigin('https://docs.example.com/xyz') === 'https://docs.example.com');
check('origen basura es null', officeViewerAllowedOrigin('nota-url') === null);

// F-E. Integración honesta: sin hostnames hardcodeados, sin token en logs,
// el PDF sigue intacto y el screen usa la superficie Office.
check('sin hostname temporal hardcodeado', !/trycloudflare|ngrok\.io|localhost:\d+/.test(officeCode));
check('sin console.log en el cliente office', !/console\.(log|info|debug)/.test(officeCode));
check('screen usa superficie Office', screenSource.includes('ViewerOfficeSurface'));
check('screen pide sesión autorizada', screenSource.includes('createOfficeViewingSession'));
check('screen cancela sesión al cerrar', screenSource.includes('cancelOfficeViewingSession'));
check('PDF intacto en el screen', screenSource.includes('pdfJsEngine.generated'));
// OFFICE-2: la superficie embebida llena el área del Viewer (contenedor
// propio `officeFill`, no un ScrollView con altura fija alrededor).
check('superficie office llena el área del visor', screenSource.includes('officeFill'));
// OFFICE-2: códigos de diagnóstico acotados en la superficie (etapa visible
// en el próximo QA físico, sin URLs ni tokens).
check('timeout distingue app lista de arranque fallido', screenSource.includes('office_timeout_app_ready') && screenSource.includes('office_timeout_no_app_ready'));
check('errores del WebView tienen código', screenSource.includes('office_webview_error') && screenSource.includes('office_webview_http_error'));
check('fallo de sesión tiene código', screenSource.includes('office_session_failed'));

console.log(`OFFICE VIEWER FRONTEND: ${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
