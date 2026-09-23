'use strict';

/**
 * HomeCloud HC-2A — Intake validation (register input).
 *
 * Authority: HC-2A Product Truth + frozen HomeCloud content model (HC-1A).
 *
 * Validates ONLY what a client is allowed to supply when registering a new
 * staging content row. The server owns everything else (household, lifecycle,
 * uploaded_at, storage paths, idempotency identity).
 *
 * role is caller-defined (file|memory). The engine does NOT decide role by MIME.
 * MEMORY MIME must be image/*, video/* or audio/* (frozen contract).
 */

const { createHttpError } = require('./httpErrors');

const VALID_ROLES = Object.freeze(['file', 'memory']);
const VALID_PRECISIONS = Object.freeze(['exact', 'month_year', 'year', 'unknown']);

// Fields the client must NEVER be allowed to set directly.
const FORBIDDEN_REGISTER_FIELDS = Object.freeze([
  'lifecycle',
  'uploaded_at',
  'household_id',
  'householdId',
  'original_storage_path',
  'originalStoragePath',
  'preview_storage_path',
  'previewStoragePath',
  'folder_id',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Validate and normalize the client register payload.
 *
 * @param {object} body Express request body
 * @returns {{ role: 'file'|'memory', displayName: string, mimeType: string,
 *             sizeBytes: number, extension: string|null,
 *             documentDate: string|null, note: string|null,
 *             caption: string|null, capturedAt: string|null,
 *             capturePrecision: string|null }}
 */
function validateRegisterPayload(body) {
  if (!body || typeof body !== 'object') {
    throw createHttpError(400, 'Cuerpo de solicitud inválido.', 'homecloud_invalid_register_body');
  }

  for (const field of FORBIDDEN_REGISTER_FIELDS) {
    if (body[field] !== undefined && body[field] !== null) {
      throw createHttpError(
        400,
        `El campo "${field}" no puede ser provisto por el cliente.`,
        'homecloud_forbidden_register_field',
        { field },
      );
    }
  }

  const { role, displayName, mimeType, sizeBytes } = body;

  if (!VALID_ROLES.includes(role)) {
    throw createHttpError(400, 'role debe ser "file" o "memory".', 'homecloud_invalid_role', { role: role ?? null });
  }

  if (!isNonEmptyString(displayName)) {
    throw createHttpError(400, 'displayName es obligatorio.', 'homecloud_missing_display_name');
  }

  if (!isNonEmptyString(mimeType)) {
    throw createHttpError(400, 'mimeType es obligatorio.', 'homecloud_missing_mime_type');
  }

  if (!isFiniteNonNegativeInteger(sizeBytes)) {
    throw createHttpError(400, 'sizeBytes debe ser un entero >= 0.', 'homecloud_invalid_size', { sizeBytes: sizeBytes ?? null });
  }

  const extension = typeof body.extension === 'string' && body.extension.trim().length > 0
    ? body.extension.trim()
    : null;

  let folderId = null;
  if (role === 'file' && typeof body.folderId === 'string' && body.folderId.trim().length > 0) {
    folderId = body.folderId.trim();
  } else if (role === 'memory' && (typeof body.folderId !== 'undefined' && body.folderId !== null)) {
    throw createHttpError(400, 'Un recuerdo no puede tener carpeta.', 'homecloud_memory_folder_forbidden');
  }

  // Initial Album destination (memory only). Optional: a Memory may belong to
  // zero Albums. A File can NEVER carry an initial Album intent.
  let initialAlbumId = null;
  if (role === 'memory') {
    if (typeof body.initialAlbumId === 'string' && body.initialAlbumId.trim().length > 0) {
      initialAlbumId = body.initialAlbumId.trim();
    } else if (body.initialAlbumId !== undefined && body.initialAlbumId !== null) {
      throw createHttpError(400, 'initialAlbumId inválido.', 'homecloud_invalid_album_id');
    }
  } else if (body.initialAlbumId !== undefined && body.initialAlbumId !== null) {
    throw createHttpError(400, 'Un archivo no puede tener álbum.', 'homecloud_file_album_forbidden');
  }

  let documentDate = null;
  let note = null;
  let caption = null;
  let capturedAt = null;
  let capturePrecision = 'unknown';

  if (role === 'file') {
    documentDate = typeof body.documentDate === 'string' && body.documentDate.length > 0 ? body.documentDate : null;
    note = typeof body.note === 'string' && body.note.length > 0 ? body.note : null;
  } else {
    // role === 'memory'
    if (typeof body.documentDate !== 'undefined' || typeof body.note !== 'undefined') {
      throw createHttpError(400, 'Un recuerdo no puede tener metadatos de documento.', 'homecloud_memory_doc_meta_forbidden');
    }
    caption = typeof body.caption === 'string' && body.caption.length > 0 ? body.caption : null;

    if (typeof body.capturedAt === 'string' && body.capturedAt.length > 0) {
      capturedAt = body.capturedAt;
    }
    if (typeof body.capturePrecision === 'string' && body.capturePrecision.length > 0) {
      if (!VALID_PRECISIONS.includes(body.capturePrecision)) {
        throw createHttpError(400, 'capturePrecision inválido.', 'homecloud_invalid_capture_precision', { capturePrecision: body.capturePrecision });
      }
      capturePrecision = body.capturePrecision;
    }

    // DB invariant parity: captured_at NULL iff precision unknown.
    const hasCapturedAt = capturedAt !== null;
    const isPrecisionUnknown = capturePrecision === 'unknown';
    if (hasCapturedAt === isPrecisionUnknown) {
      throw createHttpError(
        400,
        'capturedAt y capturePrecision deben ser coherentes.',
        'homecloud_capture_precision_mismatch',
      );
    }
  }

  return {
    role,
    displayName: displayName.trim(),
    mimeType: mimeType.trim(),
    sizeBytes,
    extension,
    folderId,
    initialAlbumId,
    documentDate,
    note,
    caption,
    capturedAt,
    capturePrecision: role === 'file' ? 'unknown' : capturePrecision,
  };
}

/**
 * Validate MEMORY MIME against the frozen media families.
 */
function isMemoryMediaMime(mimeType) {
  if (typeof mimeType !== 'string') return false;
  const mime = mimeType.toLowerCase();
  return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/');
}

module.exports = {
  VALID_ROLES,
  VALID_PRECISIONS,
  FORBIDDEN_REGISTER_FIELDS,
  validateRegisterPayload,
  isMemoryMediaMime,
};
