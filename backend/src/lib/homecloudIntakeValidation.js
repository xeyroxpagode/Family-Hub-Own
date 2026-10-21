'use strict';

/**
 * HomeCloud STAGE 4A.2 — Intake validation (register input).
 *
 * Authority: Memories V2 approved contract + frozen HomeCloud content model.
 *
 * Validates ONLY what a client is allowed to supply when registering a new
 * staging content row. The server owns everything else (household, lifecycle,
 * uploaded_at, storage paths, idempotency identity).
 *
 * role is caller-defined (file|memory). The engine does NOT decide role by
 * MIME. MIME never determines intent.
 *
 * TWO register modes:
 *   BINARY  : no writtenText. Requires displayName, mimeType, sizeBytes.
 *             Binary Memories must be image/*, video/* or audio/*.
 *   WRITTEN : identified by a present writtenText. Requires role='memory'
 *             and a non-blank text. Must NOT carry binary metadata
 *             (displayName/mimeType/sizeBytes/extension), caption, folder,
 *             or document metadata. Never generates a storage path.
 *
 * Semantic date contract (memory role, parity with DB constraints):
 *   unknown    -> no capturedAt, no capturedYear, no capturedMonth
 *   year       -> capturedYear only
 *   month_year -> capturedYear + capturedMonth
 *   exact      -> capturedAt required; capturedYear/capturedMonth are DERIVED
 *                 server-side from capturedAt in UTC (client never supplies
 *                 them, the DB enforces coherence).
 */

const { createHttpError } = require('./httpErrors');
const { normalizeDocumentDate } = require('./homecloudDocumentDate');

const VALID_ROLES = Object.freeze(['file', 'memory']);
const VALID_PRECISIONS = Object.freeze(['exact', 'month_year', 'year', 'unknown']);
const MIN_CAPTURED_YEAR = 1;
const MAX_CAPTURED_YEAR = 9999;
const MIN_CAPTURED_MONTH = 1;
const MAX_CAPTURED_MONTH = 12;

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

function isPresent(value) {
  return value !== undefined && value !== null;
}

/**
 * Normalize + validate the semantic date contract for a Memory.
 * Exact precision derives capturedYear/capturedMonth from capturedAt (UTC).
 */
function normalizeCaptureFields(body) {
  let capturedAt = null;
  let capturedYear = null;
  let capturedMonth = null;
  let capturePrecision = 'unknown';

  if (isNonEmptyString(body.capturePrecision)) {
    if (!VALID_PRECISIONS.includes(body.capturePrecision)) {
      throw createHttpError(400, 'capturePrecision inválido.', 'homecloud_invalid_capture_precision', { capturePrecision: body.capturePrecision });
    }
    capturePrecision = body.capturePrecision;
  } else if (isPresent(body.capturePrecision)) {
    throw createHttpError(400, 'capturePrecision inválido.', 'homecloud_invalid_capture_precision', { capturePrecision: null });
  }

  if (isPresent(body.capturedAt)) {
    if (typeof body.capturedAt !== 'string' || body.capturedAt.length === 0) {
      throw createHttpError(400, 'capturedAt inválido.', 'homecloud_invalid_captured_at');
    }
    const parsed = new Date(body.capturedAt);
    if (Number.isNaN(parsed.getTime())) {
      throw createHttpError(400, 'capturedAt inválido.', 'homecloud_invalid_captured_at');
    }
    capturedAt = body.capturedAt;
  }

  if (isPresent(body.capturedYear)) {
    if (!Number.isInteger(body.capturedYear) || body.capturedYear < MIN_CAPTURED_YEAR || body.capturedYear > MAX_CAPTURED_YEAR) {
      throw createHttpError(400, 'capturedYear debe ser un entero entre 1 y 9999.', 'homecloud_invalid_capture_component', { capturedYear: body.capturedYear });
    }
    capturedYear = body.capturedYear;
  }

  if (isPresent(body.capturedMonth)) {
    if (!Number.isInteger(body.capturedMonth) || body.capturedMonth < MIN_CAPTURED_MONTH || body.capturedMonth > MAX_CAPTURED_MONTH) {
      throw createHttpError(400, 'capturedMonth debe ser un entero entre 1 y 12.', 'homecloud_invalid_capture_component', { capturedMonth: body.capturedMonth });
    }
    capturedMonth = body.capturedMonth;
  }

  if (capturePrecision === 'unknown') {
    if (capturedAt !== null || capturedYear !== null || capturedMonth !== null) {
      throw createHttpError(400, 'Una fecha desconocida no admite componentes.', 'homecloud_capture_precision_mismatch');
    }
  } else if (capturePrecision === 'year') {
    if (capturedAt !== null || capturedMonth !== null || capturedYear === null) {
      throw createHttpError(400, 'precision "year" requiere sólo capturedYear.', 'homecloud_capture_precision_mismatch');
    }
  } else if (capturePrecision === 'month_year') {
    if (capturedAt !== null || capturedYear === null || capturedMonth === null) {
      throw createHttpError(400, 'precision "month_year" requiere capturedYear y capturedMonth.', 'homecloud_capture_precision_mismatch');
    }
  } else {
    // exact: capturedAt is required; components are DERIVED server-side in
    // UTC (DB enforces coherence). Client-supplied components are rejected so
    // no contradictory row can ever be attempted.
    if (capturedAt === null) {
      throw createHttpError(400, 'precision "exact" requiere capturedAt.', 'homecloud_capture_precision_mismatch');
    }
    if (capturedYear !== null || capturedMonth !== null) {
      throw createHttpError(400, 'capturedYear/capturedMonth se derivan del capturedAt exacto.', 'homecloud_capture_precision_mismatch');
    }
    const parsed = new Date(capturedAt);
    capturedYear = parsed.getUTCFullYear();
    capturedMonth = parsed.getUTCMonth() + 1;
    if (capturedYear < MIN_CAPTURED_YEAR || capturedYear > MAX_CAPTURED_YEAR) {
      throw createHttpError(400, 'capturedAt fuera de rango.', 'homecloud_invalid_captured_at');
    }
  }

  return { capturedAt, capturedYear, capturedMonth, capturePrecision };
}

/**
 * Validate and normalize a WRITTEN register payload (writtenText present).
 */
function validateWrittenRegisterPayload(body, role) {
  if (role !== 'memory') {
    throw createHttpError(400, 'Un recuerdo escrito debe ser memory.', 'homecloud_written_file_forbidden', { role });
  }
  if (typeof body.writtenText !== 'string' || body.writtenText.trim().length === 0) {
    throw createHttpError(400, 'writtenText debe ser un texto no vacío.', 'homecloud_invalid_written_text');
  }
  for (const field of ['displayName', 'mimeType', 'sizeBytes', 'extension']) {
    if (isPresent(body[field])) {
      throw createHttpError(400, `Un recuerdo escrito no admite "${field}".`, 'homecloud_written_binary_field_forbidden', { field });
    }
  }
  if (isPresent(body.caption)) {
    throw createHttpError(400, 'Un recuerdo escrito no admite caption; el texto es el contenido.', 'homecloud_written_caption_forbidden');
  }
  if (body.documentDate !== undefined || body.note !== undefined) {
    throw createHttpError(400, 'Un recuerdo no puede tener metadatos de documento.', 'homecloud_memory_doc_meta_forbidden');
  }

  return { writtenText: body.writtenText.trim() };
}

/**
 * Validate and normalize the client register payload (binary or written).
 *
 * @returns {{ role: 'file'|'memory', writtenText: string|null,
 *             displayName: string|null, mimeType: string|null,
 *             sizeBytes: number|null, extension: string|null,
 *             folderId: string|null, initialAlbumId: string|null,
 *             documentDate: string|null, note: string|null, caption: string|null,
 *             capturedAt: string|null, capturedYear: number|null,
 *             capturedMonth: number|null, capturePrecision: string,
 *             hiddenFromResurfacing: boolean }}
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

  const { role } = body;

  if (!VALID_ROLES.includes(role)) {
    throw createHttpError(400, 'role debe ser "file" o "memory".', 'homecloud_invalid_role', { role: role ?? null });
  }

  const isWritten = isPresent(body.writtenText);

  let writtenText = null;
  let displayName = null;
  let mimeType = null;
  let sizeBytes = null;
  let extension = null;
  let caption = null;

  if (isWritten) {
    const written = validateWrittenRegisterPayload(body, role);
    writtenText = written.writtenText;
  } else {
    if (!isNonEmptyString(body.displayName)) {
      throw createHttpError(400, 'displayName es obligatorio.', 'homecloud_missing_display_name');
    }
    if (!isNonEmptyString(body.mimeType)) {
      throw createHttpError(400, 'mimeType es obligatorio.', 'homecloud_missing_mime_type');
    }
    if (!isFiniteNonNegativeInteger(body.sizeBytes)) {
      throw createHttpError(400, 'sizeBytes debe ser un entero >= 0.', 'homecloud_invalid_size', { sizeBytes: body.sizeBytes ?? null });
    }
    displayName = body.displayName.trim();
    mimeType = body.mimeType.trim();
    sizeBytes = body.sizeBytes;
    extension = typeof body.extension === 'string' && body.extension.trim().length > 0
      ? body.extension.trim()
      : null;
  }

  let folderId = null;
  if (role === 'file' && typeof body.folderId === 'string' && body.folderId.trim().length > 0) {
    folderId = body.folderId.trim();
  } else if (role === 'memory' && isPresent(body.folderId)) {
    throw createHttpError(400, 'Un recuerdo no puede tener carpeta.', 'homecloud_memory_folder_forbidden');
  }

  // Initial Album destination (memory only). Optional: a Memory may belong to
  // zero Albums. A File can NEVER carry an initial Album intent.
  let initialAlbumId = null;
  if (role === 'memory') {
    if (typeof body.initialAlbumId === 'string' && body.initialAlbumId.trim().length > 0) {
      initialAlbumId = body.initialAlbumId.trim();
    } else if (isPresent(body.initialAlbumId)) {
      throw createHttpError(400, 'initialAlbumId inválido.', 'homecloud_invalid_album_id');
    }
  } else if (isPresent(body.initialAlbumId)) {
    throw createHttpError(400, 'Un archivo no puede tener álbum.', 'homecloud_file_album_forbidden');
  }

  // hidden_from_resurfacing: persisted Memory-model contract (future
  // Resurfacing stage). Files keep it false; Memories may set it at create.
  let hiddenFromResurfacing = false;
  if (isPresent(body.hiddenFromResurfacing)) {
    if (typeof body.hiddenFromResurfacing !== 'boolean') {
      throw createHttpError(400, 'hiddenFromResurfacing debe ser boolean.', 'homecloud_invalid_hidden_from_resurfacing');
    }
    hiddenFromResurfacing = body.hiddenFromResurfacing;
  }

  let documentDate = null;
  let note = null;
  let capture = { capturedAt: null, capturedYear: null, capturedMonth: null, capturePrecision: 'unknown' };

  if (role === 'file') {
    if (hiddenFromResurfacing) {
      throw createHttpError(400, 'hiddenFromResurfacing no aplica a archivos.', 'homecloud_invalid_hidden_from_resurfacing');
    }
    // documentDate shares the canonical Files contract with the metadata
    // update seam: absent/null are the canonical absence, a non-null value must
    // be a real YYYY-MM-DD calendar date, everything else is a typed 400.
    documentDate = normalizeDocumentDate(body.documentDate);
    note = typeof body.note === 'string' && body.note.length > 0 ? body.note : null;
  } else {
    // role === 'memory' (binary or written)
    if (body.documentDate !== undefined || body.note !== undefined) {
      throw createHttpError(400, 'Un recuerdo no puede tener metadatos de documento.', 'homecloud_memory_doc_meta_forbidden');
    }
    if (!isWritten) {
      caption = typeof body.caption === 'string' && body.caption.length > 0 ? body.caption : null;
    }
    capture = normalizeCaptureFields(body);
  }

  return {
    role,
    writtenText,
    displayName,
    mimeType,
    sizeBytes,
    extension,
    folderId,
    initialAlbumId,
    documentDate,
    note,
    caption,
    capturedAt: capture.capturedAt,
    capturedYear: capture.capturedYear,
    capturedMonth: capture.capturedMonth,
    capturePrecision: role === 'file' ? 'unknown' : capture.capturePrecision,
    hiddenFromResurfacing,
  };
}

// Fields a Memory PATCH may touch. Everything else is rejected outright,
// including server-owned identity/storage/lifecycle fields.
const MEMORY_PATCH_ALLOWED_FIELDS = Object.freeze([
  'capturedAt',
  'capturedYear',
  'capturedMonth',
  'capturePrecision',
  'caption',
  'hiddenFromResurfacing',
  'favorite',
]);

// Explicitly forbidden identity/storage fields, rejected with a typed code
// (mirrors the register register contract).
const FORBIDDEN_MEMORY_PATCH_FIELDS = Object.freeze([
  'lifecycle',
  'uploaded_at',
  'uploadedAt',
  'household_id',
  'householdId',
  'folder_id',
  'folderId',
  'uploaded_by_member_id',
  'uploadedByMemberId',
  'role',
  'mime_type',
  'mimeType',
  'size_bytes',
  'sizeBytes',
  'original_storage_path',
  'originalStoragePath',
  'preview_storage_path',
  'previewStoragePath',
  'written_text',
  'writtenText',
  'display_name',
  'displayName',
  'id',
]);

/**
 * Validate MEMORY MIME against the frozen media families (binary memories).
 */
function isMemoryMediaMime(mimeType) {
  if (typeof mimeType !== 'string') return false;
  const mime = mimeType.toLowerCase();
  return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/');
}

const CAPTURE_PATCH_KEYS = ['capturePrecision', 'capturedAt', 'capturedYear', 'capturedMonth'];

/**
 * Validate the Memory metadata PATCH payload (ST-3).
 *
 * Reuses normalizeCaptureFields for the date semantics, so the same
 * four-precision contract enforced at register is enforced on post-save
 * edits. A partial -> exact transition is only ever the user's explicit
 * complete selection: exact requires capturedAt and rejects any
 * client-supplied components, and there is no code path that invents a day.
 *
 * Returns only the fields the client actually sent (post-normalization),
 * so an absent field means "do not touch".
 */
function validateMemoryPatchPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createHttpError(400, 'Cuerpo de solicitud inválido.', 'homecloud_invalid_update_body');
  }

  for (const field of FORBIDDEN_MEMORY_PATCH_FIELDS) {
    if (body[field] !== undefined && body[field] !== null) {
      throw createHttpError(
        400,
        `El campo "${field}" no puede ser modificado.`,
        'homecloud_forbidden_update_field',
        { field },
      );
    }
  }

  for (const key of Object.keys(body)) {
    if (!MEMORY_PATCH_ALLOWED_FIELDS.includes(key)) {
      throw createHttpError(
        400,
        `Campo desconocido: "${key}".`,
        'homecloud_unknown_update_field',
        { field: key },
      );
    }
  }

  if (Object.keys(body).length === 0) {
    throw createHttpError(400, 'No hay campos para actualizar.', 'homecloud_empty_update');
  }

  const patch = {};

  const touchesCapture = CAPTURE_PATCH_KEYS.some((key) => body[key] !== undefined);
  if (touchesCapture) {
    // A date edit must supply a COMPLETE coherent tuple for the chosen
    // precision; normalizeCaptureFields enforces it (exact requires
    // capturedAt and derives, never merges, the components).
    const capture = normalizeCaptureFields({
      capturedAt: body.capturedAt,
      capturedYear: body.capturedYear,
      capturedMonth: body.capturedMonth,
      capturePrecision: body.capturePrecision,
    });
    patch.capturedAt = capture.capturedAt;
    patch.capturedYear = capture.capturedYear;
    patch.capturedMonth = capture.capturedMonth;
    patch.capturePrecision = capture.capturePrecision;
  }

  if (body.caption !== undefined) {
    if (body.caption !== null && typeof body.caption !== 'string') {
      throw createHttpError(400, 'caption debe ser texto o null.', 'homecloud_invalid_caption');
    }
    patch.caption = typeof body.caption === 'string' && body.caption.length > 0 ? body.caption : null;
  }

  if (body.hiddenFromResurfacing !== undefined) {
    if (typeof body.hiddenFromResurfacing !== 'boolean') {
      throw createHttpError(400, 'hiddenFromResurfacing debe ser boolean.', 'homecloud_invalid_hidden_from_resurfacing');
    }
    patch.hiddenFromResurfacing = body.hiddenFromResurfacing;
  }

  if (body.favorite !== undefined) {
    if (typeof body.favorite !== 'boolean') {
      throw createHttpError(400, 'favorite debe ser boolean.', 'homecloud_invalid_favorite');
    }
    patch.favorite = body.favorite;
  }

  return patch;
}

module.exports = {
  VALID_ROLES,
  VALID_PRECISIONS,
  FORBIDDEN_REGISTER_FIELDS,
  validateRegisterPayload,
  normalizeCaptureFields,
  isMemoryMediaMime,
  validateMemoryPatchPayload,
  MEMORY_PATCH_ALLOWED_FIELDS,
  FORBIDDEN_MEMORY_PATCH_FIELDS,
};
