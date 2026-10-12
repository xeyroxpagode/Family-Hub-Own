'use strict';

/**
 * HomeCloud Office Viewer V1 — controlador HTTP (OFFICE-3).
 *
 *   POST   /content/:contentId/office-session  (autenticado, homecloud.view)
 *   DELETE /office-session/:sessionId          (autenticado, homecloud.view)
 *   GET    /office/:sessionId/document         (bearer de sesión, SIN auth de
 *           usuario: la descarga la hace el DocServer server-to-server)
 *
 * La ruta de descarga vive ANTES del middleware de auth en el router: su
 * única credencial es el download token scoped a la sesión. La sesión misma
 * se creó bajo household + capability, así que el aislamiento se preserva.
 */

const crypto = require('node:crypto');
const { supabaseAdmin } = require('../config/supabase');
const { createHttpError, sendApiError } = require('../lib/httpErrors');
const { getHomeCloudBucket } = require('../lib/homecloudStoragePaths');
const {
  createOfficeViewingSession,
  revokeOfficeViewingSession,
  defaultOfficeSessionStore,
  getMaxDocumentBytes,
  STORAGE_SIGNED_URL_TTL_S,
} = require('../services/homecloudOfficeViewerService');

/** Content-Types canónicos por fileType (OFFICE-3: las tres familias Office V1). */
const OFFICE_CONTENT_TYPES = new Map([
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['doc', 'application/msword'],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['xls', 'application/vnd.ms-excel'],
  ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['ppt', 'application/vnd.ms-powerpoint'],
]);

const createOfficeSession = async (req, res) => {
  try {
    const { contentId } = req.params;
    if (!contentId) throw createHttpError(400, 'contentId es obligatorio.', 'homecloud_missing_content_id');
    const result = await createOfficeViewingSession(req, contentId);
    return res.status(201).json(result);
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

const revokeOfficeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) throw createHttpError(400, 'sessionId es obligatorio.', 'office_missing_session_id');
    await revokeOfficeViewingSession(req, sessionId);
    return res.status(204).end();
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

/**
 * Entrega autorizada del documento al DocServer (proxy server-side).
 *
 * Defensas:
 *   - sesión vigente + download token con comparación timing-safe;
 *   - el row se relee (household de la sesión, role=file, lifecycle=active);
 *   - signed URL de Storage de 60 s creada server-side, nunca expuesta;
 *   - Content-Type restringido a los seis formatos Office V1,
 *     Content-Length acotado;
 *   - streaming con aborto si el origen excede el cap (origen no confiable);
 *   - `Cache-Control: no-store`.
 */
const serveOfficeDocument = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const session = sessionId ? defaultOfficeSessionStore.get(sessionId) : null;
    if (!session || !token) {
      throw createHttpError(404, 'Sesión de visualización no válida.', 'office_session_invalid');
    }
    const a = Buffer.from(token);
    const b = Buffer.from(session.downloadToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw createHttpError(404, 'Sesión de visualización no válida.', 'office_session_invalid');
    }

    if (!supabaseAdmin) {
      throw createHttpError(500, 'Backend no configurado.', 'backend_unavailable');
    }

    const { data: row, error } = await supabaseAdmin
      .from('homecloud_contents')
      .select('id, household_id, role, display_name, size_bytes, original_storage_path, lifecycle')
      .eq('id', session.contentId)
      .eq('household_id', session.householdId)
      .eq('role', 'file')
      .eq('lifecycle', 'active')
      .maybeSingle();
    if (error) throw createHttpError(500, error.message, 'office_content_lookup_failed');
    if (!row || !row.original_storage_path) {
      throw createHttpError(404, 'Sesión de visualización no válida.', 'office_session_invalid');
    }

    const maxBytes = getMaxDocumentBytes();
    if (typeof row.size_bytes === 'number' && row.size_bytes > maxBytes) {
      throw createHttpError(413, 'El archivo es demasiado grande para la vista previa.', 'file_too_large_to_preview');
    }

    const bucket = getHomeCloudBucket('original');
    const { data: signed, error: signedError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(row.original_storage_path, STORAGE_SIGNED_URL_TTL_S);
    if (signedError || !signed?.signedUrl) {
      throw createHttpError(500, 'No se pudo preparar el documento.', 'storage_signed_url_failed');
    }

    const upstream = await fetch(signed.signedUrl);
    if (!upstream.ok || !upstream.body) {
      throw createHttpError(502, 'No se pudo obtener el documento.', 'office_document_fetch_failed');
    }

    const contentType = OFFICE_CONTENT_TYPES.get(session.fileType) ?? 'application/octet-stream';
    res.status(200);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="document.${session.fileType}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    // El Content-Length declarado por Storage no es confiable: se re-acota
    // durante el stream y se aborta si excede el cap.
    let bytes = 0;
    try {
      for await (const chunk of upstream.body) {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          if (typeof upstream.body.cancel === 'function') await upstream.body.cancel().catch(() => {});
          if (!res.headersSent || !res.writableEnded) {
            try { res.destroy(); } catch { /* best-effort */ }
          }
          return;
        }
        if (!res.write(chunk)) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
      res.end();
    } catch {
      try { res.destroy(); } catch { /* best-effort */ }
    }
  } catch (error) {
    return sendApiError(res, error, req);
  }
};

module.exports = {
  createOfficeSession,
  revokeOfficeSession,
  serveOfficeDocument,
};
