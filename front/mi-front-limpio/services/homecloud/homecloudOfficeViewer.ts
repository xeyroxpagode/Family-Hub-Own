import { requestJson } from '../api';

/**
 * HomeCloud Office Viewer V1 — cliente (OFFICE-1: DOCX/DOC, read-only).
 *
 * El frontend NUNCA construye URLs de Storage ni del DocServer por su
 * cuenta: pide una sesión autorizada al backend y recibe la configuración
 * ONLYOFFICE ya firmada. La URL pública del DocServer llega POR SESIÓN
 * (el operador la apunta al túnel HTTPS temporal); nada se hardcodea aquí.
 *
 * Expo Go: solo `react-native-webview` (ya instalado). Sin módulos nativos.
 * Sin logs del token ni de la config firmada.
 */

/** OFFICE-1: solo Word. El resto llega en OFFICE-3. */
const OFFICE_VIEWER_SUPPORTED_EXTENSIONS = new Set(['docx', 'doc']);

export function officeViewerExtensionOf(fileName: string): string {
  const trimmed = fileName.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0 || dot === trimmed.length - 1) return '';
  return trimmed.slice(dot + 1).toLowerCase();
}

export function isOfficeViewerSupported(file: { readonly fileName: string }): boolean {
  return OFFICE_VIEWER_SUPPORTED_EXTENSIONS.has(officeViewerExtensionOf(file.fileName));
}

export interface OfficeViewingSession {
  readonly sessionId: string;
  readonly contentId: string;
  readonly expiresAt: string;
  readonly documentServerUrl: string;
  readonly config: Record<string, unknown>;
  readonly token: string;
}

export const createOfficeViewingSession = (accessToken: string, contentId: string) =>
  requestJson<OfficeViewingSession>(`/api/homecloud/content/${contentId}/office-session`, {
    method: 'POST',
    accessToken,
    body: {},
  });

/** Cancelación best-effort: el cierre nunca falla por no poder avisar. */
export const cancelOfficeViewingSession = (accessToken: string, sessionId: string) =>
  requestJson<void>(`/api/homecloud/office-session/${sessionId}`, {
    method: 'DELETE',
    accessToken,
  }).catch(() => undefined);

/* ------------------------------------------------------------------ */
/* Puente WebView <-> React Native (versionado, mínimo).                */
/* ------------------------------------------------------------------ */

export const OFFICE_BRIDGE_PROTOCOL_VERSION = 1;

export type OfficeViewerToRnMessage =
  | { readonly v: number; readonly type: 'DOCUMENT_READY' }
  | { readonly v: number; readonly type: 'APP_READY' }
  | { readonly v: number; readonly type: 'LOAD_ERROR'; readonly message: string };

/**
 * Códigos de diagnóstico acotados y sanitizados (OFFICE-2). El puente nunca
 * transporta config, JWT, URLs firmadas ni contenido: solo estas etiquetas
 * más un detalle recortado del motor (`editor-error:<detalle>`).
 */
export type OfficeViewerLoadErrorCode =
  | 'api-missing'
  | 'api-load-failed'
  | 'config-invalid'
  | 'init-failed'
  | 'editor-error';

export function parseOfficeViewerMessage(data: unknown): OfficeViewerToRnMessage | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data) as { v?: unknown; type?: unknown; message?: unknown };
    if (parsed.v !== OFFICE_BRIDGE_PROTOCOL_VERSION) return null;
    if (parsed.type === 'DOCUMENT_READY') return { v: 1, type: 'DOCUMENT_READY' };
    if (parsed.type === 'APP_READY') return { v: 1, type: 'APP_READY' };
    if (parsed.type === 'LOAD_ERROR') {
      return {
        v: 1,
        type: 'LOAD_ERROR',
        message: typeof parsed.message === 'string' ? parsed.message.slice(0, 300) : 'unknown',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * HTML mínimo del visor Office.
 *
 * El TIPO de visor no se decide aquí: viaja firmado en la config de la
 * sesión (OFFICE-2: `type: "embedded"` + `mode: "view"`, el visor compacto
 * de documento, no el editor de escritorio).
 *
 * `apiJsUrl` DEBE venir de la sesión del backend (documentServerUrl +
 * `/web-apps/apps/api/documents/api.js`). Se rechaza cualquier esquema que
 * no sea http/https. La config se inyecta como JSON (con `<` escapado para
 * no romper el `<script>`); el JWT viaja dentro de la config como define la
 * API de ONLYOFFICE y es de corta vida scoped a la sesión.
 */
export function buildOfficeViewerHtml(options: {
  readonly apiJsUrl: string;
  readonly config: Record<string, unknown>;
  readonly token: string;
}): string {
  const { apiJsUrl, config, token } = options;
  let apiOrigin: string;
  try {
    const parsed = new URL(apiJsUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('unsupported-protocol');
    }
    apiOrigin = parsed.origin;
  } catch {
    throw new Error('URL del servidor de documentos inválida.');
  }
  const safeConfig = JSON.stringify({ ...config, token }).replace(/</g, '\\u003c');
  const safeApiJs = apiJsUrl.replace(/"/g, '%22');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
html, body { margin: 0; padding: 0; height: 100%; background: #fff; }
#placeholder { width: 100%; height: 100%; }
#fallback { display: none; font-family: system-ui, sans-serif; padding: 24px; color: #444; }
</style>
<script src="${safeApiJs}" onerror="window.__officeApiLoadFailed=true"></script>
</head>
<body>
<div id="placeholder"></div>
<div id="fallback">No se pudo cargar el editor.</div>
<script>
(function () {
  function sanitizeDetail(value) {
    return String(value).replace(/[<>"']/g, '').slice(0, 80);
  }
  function post(type, extra) {
    try {
      var payload = { v: ${OFFICE_BRIDGE_PROTOCOL_VERSION}, type: type };
      if (extra && extra.message) payload.message = String(extra.message).slice(0, 300);
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch (e) { /* best-effort */ }
  }
  function fail(code, detail) {
    document.getElementById('fallback').style.display = 'block';
    post('LOAD_ERROR', { message: detail ? code + ':' + sanitizeDetail(detail) : code });
  }
  if (window.__officeApiLoadFailed) {
    fail('api-load-failed');
    return;
  }
  if (typeof DocsAPI === 'undefined' || !DocsAPI.DocEditor) {
    fail('api-missing');
    return;
  }
  var config;
  try {
    config = ${safeConfig};
  } catch (e) {
    fail('config-invalid');
    return;
  }
  config.width = '100%';
  config.height = '100%';
  config.events = config.events || {};
  var prevReady = config.events.onDocumentReady;
  var prevError = config.events.onError;
  var prevAppReady = config.events.onAppReady;
  // onAppReady = el editor arrancó (marco creado, config aceptada). No es
  // éxito todavía: el documento puede seguir fallando en descarga/conversión
  // (OFFICE-2: esa es exactamente la etapa que fallaba en silencio).
  config.events.onAppReady = function (event) {
    try { if (typeof prevAppReady === 'function') prevAppReady(event); } catch (e) {}
    post('APP_READY');
  };
  config.events.onDocumentReady = function (event) {
    try { if (typeof prevReady === 'function') prevReady(event); } catch (e) {}
    post('DOCUMENT_READY');
  };
  config.events.onError = function (event) {
    try { if (typeof prevError === 'function') prevError(event); } catch (e) {}
    var message = event && event.data ? String(event.data) : 'editor-error';
    fail('editor-error', message);
  };
  try {
    new DocsAPI.DocEditor('placeholder', config);
  } catch (e) {
    fail('init-failed', e && e.message ? e.message : '');
  }
})();
</script>
</body>
</html>`;
}

/** Cota de carga del editor: un visor que nunca responde es un fallo honesto. */
export const OFFICE_VIEWER_LOAD_TIMEOUT_MS = 60000;

/** Origen permitido para la navegación del WebView: solo el DocServer. */
export function officeViewerAllowedOrigin(documentServerUrl: string): string | null {
  try {
    return new URL(documentServerUrl).origin;
  } catch {
    return null;
  }
}
