'use strict';

/**
 * HomeCloud Office Viewer V1 — OFFICE-3 (DOCX/DOC/XLSX/XLS/PPTX/PPT, read-only).
 *
 * Sesiones autorizadas de visualización para documentos Office dentro de
 * HomeCloud Files. El frontend NUNCA habla con Supabase Storage ni con el
 * DocServer por su cuenta: pide una sesión al backend, que verifica
 * household + capability + lifecycle y responde una configuración ONLYOFFICE
 * firmada (JWT HS256) con edición deshabilitada de forma explícita.
 *
 * GARANTÍAS:
 *   - `type: 'embedded'` + `editorConfig.mode = 'view'`: visor embebido
 *     compacto (OFFICE-2), sin ribbons ni workspace de edición.
 *   - Sin `editorConfig.embedded.{shareUrl, embedUrl, saveUrl, fullscreenUrl}`:
 *     el DocServer no ofrece enlaces de compartir/embeber/descargar; el
 *     original se comparte desde HomePlus.
 *   - `editorConfig.mode = 'view'` y permisos edit/comment/review/chat OFF.
 *   - Sin `callbackUrl`: no existe write-back al original.
 *   - `document.key` único por sesión, nunca persistido.
 *   - La sesión expira (TTL) y es cancelable (DELETE).
 *   - El documento se entrega al DocServer por una URL con bearer scoped a
 *     la sesión (`GET /office/:sessionId/document?token=`), con proxy
 *     server-side desde Storage. Sin URLs públicas sin restricción.
 *   - Límite de tamaño y límite de sesiones en memoria (resource limits).
 *   - Sin logs sensibles: nunca se registra el JWT ni el download token.
 *
 * El JWT se firma con `node:crypto` (HS256 manual): el backend solo FIRMA,
 * la validación la hace el DocServer con el mismo secreto. Sin dependencias
 * nuevas.
 */

const crypto = require('node:crypto');
const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { createHttpError } = require('../lib/httpErrors');

const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_SESSIONS = 500;
const DOWNLOAD_TOKEN_BYTES = 32;
const STORAGE_SIGNED_URL_TTL_S = 60;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || !value.trim()) {
    throw createHttpError(500, 'Visor Office no configurado.', 'office_viewer_unavailable');
  }
  return value.trim();
}

function getMaxDocumentBytes(env = process.env) {
  const raw = env.ONLYOFFICE_VIEWER_MAX_BYTES;
  if (raw === undefined || raw === '') return 100 * 1024 * 1024;
  if (!/^\d+$/.test(raw)) throw new Error('ONLYOFFICE_VIEWER_MAX_BYTES debe ser un entero positivo en bytes');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('ONLYOFFICE_VIEWER_MAX_BYTES debe ser un entero positivo en bytes');
  }
  return value;
}

/**
 * OFFICE-3: los seis formatos Office V1, con el documentType de ONLYOFFICE
 * por familia (word | cell | slide). `fileType` SIEMPRE es la extensión
 * original genuina del archivo (el DocServer la necesita para elegir el
 * motor de parseo correcto, sobre todo para los binarios legacy 97-2003).
 */
const OFFICE_FILE_TYPES = new Map([
  ['docx', { fileType: 'docx', family: 'word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
  ['doc', { fileType: 'doc', family: 'word', mime: 'application/msword' }],
  ['xlsx', { fileType: 'xlsx', family: 'cell', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
  ['xls', { fileType: 'xls', family: 'cell', mime: 'application/vnd.ms-excel' }],
  ['pptx', { fileType: 'pptx', family: 'slide', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }],
  ['ppt', { fileType: 'ppt', family: 'slide', mime: 'application/vnd.ms-powerpoint' }],
]);

/** MIME Office -> clasificación, derivado de la tabla anterior. */
const OFFICE_MIME_TYPES = new Map(
  [...OFFICE_FILE_TYPES.values()].map((entry) => [entry.mime, entry]),
);

function extensionOf(fileName) {
  if (typeof fileName !== 'string') return '';
  const trimmed = fileName.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0 || dot === trimmed.length - 1) return '';
  return trimmed.slice(dot + 1).toLowerCase();
}

function normalizeMime(mimeType) {
  if (typeof mimeType !== 'string') return '';
  return mimeType.split(';')[0].trim().toLowerCase();
}

/**
 * Clasifica un archivo para el Office Viewer.
 * OFFICE-3: los seis formatos Office V1 (Word, Excel, PowerPoint, OOXML y
 * legacy binario). La extensión original prevalece cuando es conocida; el
 * MIME específico clasifica cuando la extensión no dice nada útil. El resto
 * es `unsupported` con un motivo honesto (no se finge compatibilidad).
 */
function classifyOfficeDocument({ fileName, mimeType }) {
  const extension = extensionOf(fileName);
  const mime = normalizeMime(mimeType);
  const match = OFFICE_FILE_TYPES.get(extension) ?? OFFICE_MIME_TYPES.get(mime) ?? null;
  if (!match) {
    return { supported: false, family: null, fileType: null, extension };
  }
  return { supported: true, family: match.family, fileType: match.fileType, extension };
}

/* ------------------------------------------------------------------ */
/* JWT HS256 manual (solo firma; verifica el DocServer).               */
/* ------------------------------------------------------------------ */

function base64UrlEncode(buffer) {
  return Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToBuffer(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

function signOfficeJwt(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${signature}`;
}

/** Verificación local usada por los tests determinísticos (el DocServer hace la suya). */
function verifyOfficeJwt(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = base64UrlEncode(crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(base64UrlDecodeToBuffer(body).toString('utf8'));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Store de sesiones en memoria (TTL + cancelación + límite).          */
/* ------------------------------------------------------------------ */

function createOfficeSessionStore({ now = () => Date.now(), ttlMs = SESSION_TTL_MS, maxSessions = MAX_SESSIONS } = {}) {
  /** @type {Map<string, object>} */
  const sessions = new Map();

  function pruneExpired() {
    const at = now();
    for (const [id, session] of sessions) {
      if (session.expiresAt <= at) sessions.delete(id);
    }
  }

  function create({ contentId, householdId, fileType, documentType, title }) {
    pruneExpired();
    if (sessions.size >= maxSessions) {
      // Evict la más antigua: límite de recursos, nunca crecimiento sin cota.
      const oldest = sessions.keys().next();
      if (!oldest.done) sessions.delete(oldest.value);
    }
    const id = crypto.randomUUID();
    const downloadToken = crypto.randomBytes(DOWNLOAD_TOKEN_BYTES).toString('hex');
    const at = now();
    const session = {
      id,
      contentId,
      householdId,
      fileType,
      documentType,
      title,
      downloadToken,
      createdAt: at,
      expiresAt: at + ttlMs,
    };
    sessions.set(id, session);
    return session;
  }

  function get(id) {
    const session = sessions.get(id) ?? null;
    if (!session) return null;
    if (session.expiresAt <= now()) {
      sessions.delete(id);
      return null;
    }
    return session;
  }

  function revoke(id) {
    return sessions.delete(id);
  }

  function size() {
    pruneExpired();
    return sessions.size;
  }

  return { create, get, revoke, size };
}

const defaultOfficeSessionStore = createOfficeSessionStore();

/* ------------------------------------------------------------------ */
/* Configuración ONLYOFFICE (read-only enforcement).                   */
/* ------------------------------------------------------------------ */

function buildOfficeEditorConfig({ session, personId, documentUrl }) {
  // OFFICE-2: visor EMBEBIDO (`type: "embedded"`), no el editor de escritorio.
  // El miembro toca un archivo y ve el CONTENIDO del documento (páginas,
  // zoom, navegación), sin ribbons, paneles ni workspace de edición.
  //
  // En `type: "embedded"` los enlaces de compartir/embeber/guardar solo
  // aparecen si se envían `editorConfig.embedded.{shareUrl, embedUrl,
  // saveUrl, fullscreenUrl}` (documentación oficial de ONLYOFFICE). No se
  // envía NINGUNA de esas URLs: compartir el original sigue siendo de
  // HomePlus (hand-off del Viewer), nunca un enlace del DocServer.
  //
  // OFFICE-3: `documentType` viaja por sesión (word | cell | slide) según la
  // familia del archivo; el DocServer monta el visor correspondiente
  // (documento, hoja de cálculo con pestañas, presentación con slides).
  const config = {
    document: {
      fileType: session.fileType,
      key: `office-${session.contentId}-${session.id}`,
      title: session.title,
      url: documentUrl,
      permissions: {
        comment: false,
        copy: false,
        download: false,
        edit: false,
        print: false,
        review: false,
        chat: false,
      },
    },
    documentType: session.documentType,
    type: 'embedded',
    editorConfig: {
      mode: 'view',
      lang: 'es',
      user: { id: personId },
      customization: {
        comments: false,
        chat: false,
        review: false,
        zoom: 100,
      },
    },
  };
  return config;
}

/* ------------------------------------------------------------------ */
/* Operaciones con autorización (household isolation).                 */
/* ------------------------------------------------------------------ */

async function contextWithViewCapability(req) {
  const context = await getHomeCloudContext(req);
  const capabilities = resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertHomeCloudCapability(capabilities, 'homecloud.view');
  if (!supabaseAdmin) throw createHttpError(500, 'Backend no configurado.', 'backend_unavailable');
  return context;
}

async function loadActiveFileInHousehold(contentId, householdId) {
  const { data, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, lifecycle')
    .eq('id', contentId)
    .eq('household_id', householdId)
    .eq('role', 'file')
    .eq('lifecycle', 'active')
    .maybeSingle();
  if (error) throw createHttpError(500, error.message, 'office_content_lookup_failed');
  // 404 idéntico para inexistente o de otro household: no revelar existencia.
  if (!data) throw createHttpError(404, 'Archivo no encontrado.', 'homecloud_content_not_found');
  return data;
}

/**
 * Base que el DocServer usa para descargar el documento (`GET
 * /api/homecloud/office/:sessionId/document`). Es la base del BACKEND vista
 * desde la red del contenedor, NUNCA la URL pública del DocServer.
 *
 * OFFICE-2 (evidencia física 2026-10-11): el fallback anterior a
 * `ONLYOFFICE_PUBLIC_URL` construía una ruta de backend sobre el host del
 * DocServer; el DocServer intentaba descargarse a sí mismo
 * (`http://127.0.0.1:8180/api/homecloud/...`, ECONNREFUSED x3 en
 * `documentserver/nginx.error.log`) y el backend jamás recibía la petición.
 * Por eso ahora es fail-fast: sin `ONLYOFFICE_INTERNAL_API_URL` la creación
 * de la sesión responde `office_viewer_unavailable` en vez de emitir una
 * URL de descarga que apunta al servidor equivocado.
 */
function documentBaseUrl(env = process.env) {
  const internal = typeof env.ONLYOFFICE_INTERNAL_API_URL === 'string' ? env.ONLYOFFICE_INTERNAL_API_URL.trim() : '';
  if (internal) return internal.replace(/\/+$/, '');
  throw createHttpError(500, 'Visor Office no configurado.', 'office_viewer_unavailable');
}

/**
 * POST /content/:contentId/office-session — crea una sesión read-only.
 * Responde la config firmada lista para `DocsAPI.DocEditor`.
 */
async function createOfficeViewingSession(req, contentId, { store = defaultOfficeSessionStore, env = process.env } = {}) {
  const context = await contextWithViewCapability(req);
  const secret = getRequiredEnv('ONLYOFFICE_JWT_SECRET');
  const publicUrl = getRequiredEnv('ONLYOFFICE_PUBLIC_URL').replace(/\/+$/, '');
  const row = await loadActiveFileInHousehold(contentId, context.householdId);

  const classification = classifyOfficeDocument({ fileName: row.display_name, mimeType: row.mime_type });
  if (!classification.supported) {
    throw createHttpError(400, 'Este formato aún no tiene vista previa integrada.', 'office_format_not_supported');
  }
  const maxBytes = getMaxDocumentBytes(env);
  if (typeof row.size_bytes === 'number' && row.size_bytes > maxBytes) {
    throw createHttpError(413, 'El archivo es demasiado grande para la vista previa.', 'file_too_large_to_preview');
  }
  if (!row.original_storage_path) {
    throw createHttpError(409, 'El contenido no tiene binario original.', 'homecloud_content_has_no_binary');
  }

  const session = store.create({
    contentId: row.id,
    householdId: context.householdId,
    fileType: classification.fileType,
    documentType: classification.family,
    title: row.display_name,
  });

  const documentUrl = `${documentBaseUrl(env)}/api/homecloud/office/${session.id}/document?token=${session.downloadToken}`;
  const config = buildOfficeEditorConfig({ session, personId: context.personId, documentUrl });
  const token = signOfficeJwt(config, secret);

  return {
    sessionId: session.id,
    contentId: row.id,
    expiresAt: new Date(session.expiresAt).toISOString(),
    documentServerUrl: publicUrl,
    config,
    token,
  };
}

/** DELETE — cancela una sesión (idempotente). */
async function revokeOfficeViewingSession(req, sessionId, { store = defaultOfficeSessionStore } = {}) {
  await contextWithViewCapability(req);
  store.revoke(sessionId);
  return { revoked: true };
}

module.exports = {
  SESSION_TTL_MS,
  STORAGE_SIGNED_URL_TTL_S,
  classifyOfficeDocument,
  signOfficeJwt,
  verifyOfficeJwt,
  createOfficeSessionStore,
  buildOfficeEditorConfig,
  createOfficeViewingSession,
  revokeOfficeViewingSession,
  getMaxDocumentBytes,
  defaultOfficeSessionStore,
  documentBaseUrl,
};
