'use strict';

/**
 * HomeCloud STAGE 4A.2 — Intake Foundation Service.
 *
 * Authority: Memories V2 approved contract + HC-1A..HC-1G frozen foundations.
 *
 * Canonical upload/intake lifecycle for ALL HomeCloud intake flows
 * (Files, binary Memories, Written Memories, Shared Capture). One reusable
 * engine, no generic Upload product screen.
 *
 *  register   -> create semantic STAGING row         (homecloud.contribute)
 *  upload     -> single-object signed upload auth    (homecloud.contribute)
 *  verify     -> server confirms original exists      (privileged)
 *  finalize   -> staging -> active                    (homecloud.contribute)
 *
 * BINARY content (File, image/video/audio Memory) keeps the exact HC-2A
 * Shared Upload Engine flow: register -> upload -> verify -> finalize with
 * uploaded_at set at finalize.
 *
 * WRITTEN Memory (writtenText) has NO bytes: register -> finalize directly.
 * No UploadJob, no signed upload, no Storage verify. uploaded_at stays NULL
 * forever because binary custody never happened.
 *
 * The client NEVER chooses bucket, path, household, lifecycle, uploaded_at.
 * Authorization originates server-side from: authenticated member + canonical
 * Household + homecloud.contribute + known staging content of same Household.
 */

const { supabaseAdmin } = require('../config/supabase');
const { getHomeCloudContext } = require('./homecloud.context.service');
const { resolveHomeCloudCapabilities, assertHomeCloudCapability } = require('../lib/homecloudCapabilities');
const { getHomeCloudOriginalPath, getHomeCloudBucket } = require('../lib/homecloudStoragePaths');
const { mapContentRowToDto } = require('../lib/homecloudMappers');
const { validateRegisterPayload, isMemoryMediaMime } = require('../lib/homecloudIntakeValidation');
const { createHttpError } = require('../lib/httpErrors');
const { sanitizeCorrelationId } = require('../lib/mutationContracts');
const { attemptHomeCloudPreview } = require('./homecloudPreviewService');
const { assertHomeCloudAcceptedSize } = require('../lib/homecloudSizePolicy');

const ORIGINAL_BUCKET = getHomeCloudBucket('original');

// Supabase signed upload URLs are currently valid for 2 hours.
const DEFAULT_UPLOAD_URL_TTL = 7200;

/**
 * Resolve capabilities for a context and assert homecloud.contribute.
 * Throws 403 if not granted.
 */
async function requireHomeCloudContribute(context) {
  const capabilities = resolveHomeCloudCapabilities({
    role: context.membership.role,
    membershipStatus: context.membership.status,
    household: context.household,
  });
  assertHomeCloudCapability(capabilities, 'homecloud.contribute');
  return capabilities;
}

/**
 * Resolve and validate an explicit initial Album destination for a NEW Memory.
 *
 * The initial Album is part of CONTRIBUTION intent (homecloud.contribute), NOT
 * homecloud.organize: a contribute-only user may choose an existing Album as the
 * initial destination of a new Memory. The Album must:
 *   - exist
 *   - be active (valid lifecycle for contribution)
 *   - belong to the SAME Household as the intake
 *
 * Cross-Household, nonexistent, and trashed Albums are DENIED. An explicitly
 * invalid Album is NEVER silently reinterpreted as "root Memories".
 *
 * @param {object} context resolved HomeCloud context
 * @param {string|null} initialAlbumId client-supplied initial Album id
 * @returns {Promise<object|null>} validated album row, or null if no album intent
 */
async function resolveInitialAlbum(context, initialAlbumId) {
  if (!initialAlbumId) return null;

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
  }

  const { data: album, error: albumErr } = await supabaseAdmin
    .from('homecloud_albums')
    .select('id, household_id, lifecycle')
    .eq('id', initialAlbumId)
    .maybeSingle();

  if (albumErr) {
    throw createHttpError(500, albumErr.message, 'homecloud_album_lookup_failed');
  }
  if (!album) {
    throw createHttpError(404, 'Álbum no encontrado.', 'homecloud_album_not_found');
  }
  if (album.household_id !== context.householdId) {
    throw createHttpError(403, 'El álbum no pertenece a este hogar.', 'homecloud_album_cross_household');
  }
  if (album.lifecycle !== 'active') {
    throw createHttpError(409, 'El álbum no está disponible.', 'homecloud_album_not_active');
  }

  return album;
}

/**
 * Enforce that a REPLAY of the same intakeRequestId cannot silently mutate the
 * first accepted Album membership.
 *
 * Contribution intent is stable: the first accepted Album membership (or its
 * absence, i.e. root) is authoritative. A replay requesting a DIFFERENT Album
 * returns an explicit conflict rather than turning register replay into organize.
 *
 * @param {object} context resolved HomeCloud context
 * @param {string} contentId existing content row id
 * @param {string|null} requestedAlbumId album requested on this replay (may be null)
 */
async function ensureReplayAlbumConsistency(context, contentId, requestedAlbumId) {
  if (!requestedAlbumId) return;

  const { data: items, error: itemsErr } = await supabaseAdmin
    .from('homecloud_album_items')
    .select('album_id')
    .eq('content_id', contentId);

  if (itemsErr) {
    throw createHttpError(500, itemsErr.message, 'homecloud_album_membership_lookup_failed');
  }

  const albumIds = (items ?? []).map((item) => item.album_id);
  if (albumIds.includes(requestedAlbumId)) return;

  throw createHttpError(
    409,
    'El recuerdo ya fue guardado con un destino diferente.',
    'homecloud_intake_album_conflict',
  );
}

/**
 * REGISTER — create a semantic STAGING row.
 *
 * Requires homecloud.contribute. Household resolved server-side, never trusted
 * from client. lifecycle always 'staging', uploaded_at always NULL.
 *
 * BINARY content: storage path is the canonical {household_id}/{content_id}/original.
 * WRITTEN Memory: identified by a present writtenText; no binary metadata and
 * NO storage path are generated (there are no bytes to custody).
 *
 * Idempotent by client-supplied intakeRequestId (unique per Household).
 */
async function registerHomeCloudContent(req, payload) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudContribute(context);

  const normalized = validateRegisterPayload(payload);
  const isWritten = normalized.writtenText !== null;

  // Authoritative pre-transfer guard: rejection creates neither a staging row
  // nor an upload authorization.
  if (!isWritten) assertHomeCloudAcceptedSize(normalized.sizeBytes);

  // Binary Memories keep the frozen media families. Written Memories carry
  // their content in writtenText (no MIME at all).
  if (!isWritten && normalized.role === 'memory' && !isMemoryMediaMime(normalized.mimeType)) {
    throw createHttpError(
      400,
      'Un recuerdo debe ser image/*, video/* o audio/*.',
      'homecloud_memory_mime_invalid',
      { mimeType: normalized.mimeType },
    );
  }

  // folderId validation for file role
  if (normalized.role === 'file' && normalized.folderId) {
    if (!supabaseAdmin) {
      throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
    }
    const { data: folder, error: folderErr } = await supabaseAdmin
      .from('homecloud_folders')
      .select('id, household_id')
      .eq('id', normalized.folderId)
      .maybeSingle();
    if (folderErr) {
      throw createHttpError(500, folderErr.message, 'homecloud_folder_lookup_failed');
    }
    if (!folder) {
      throw createHttpError(404, 'Carpeta no encontrada.', 'homecloud_folder_not_found');
    }
    if (folder.household_id !== context.householdId) {
      throw createHttpError(403, 'La carpeta no pertenece a este hogar.', 'homecloud_folder_cross_household');
    }
  }

  // Resolve + validate initial Album intent BEFORE creating anything, so an
  // explicitly invalid Album is denied up-front and never silently falls back
  // to root Memories.
  const initialAlbum = await resolveInitialAlbum(context, normalized.initialAlbumId);

  let intakeRequestId = null;
  if (payload?.intakeRequestId !== undefined && payload?.intakeRequestId !== null) {
    intakeRequestId = sanitizeCorrelationId(payload.intakeRequestId);
    if (!intakeRequestId) {
      throw createHttpError(400, 'intakeRequestId inválido.', 'homecloud_invalid_intake_request_id');
    }
  }

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
  }

  // Idempotent replay guard: if a row already exists for this Household +
  // intakeRequestId (when provided), return it instead of creating a duplicate.
  // A conflicting Album intent on replay is an explicit conflict, never a
  // silent membership mutation.
  if (intakeRequestId) {
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('homecloud_contents')
      .select('*')
      .eq('household_id', context.householdId)
      .eq('intake_request_id', intakeRequestId)
      .maybeSingle();

    if (existingErr) {
      throw createHttpError(500, existingErr.message, 'homecloud_register_lookup_failed');
    }
    if (existing) {
      await ensureReplayAlbumConsistency(context, existing.id, normalized.initialAlbumId);
      return mapContentRowToDto(existing);
    }
  }

  let contentId;
  // Gather insert atomically via RPC-free two-step: insert a placeholder path is
  // not possible because path depends on generated id. Instead, insert with a
  // temporary unique path then rewrite? No — we generate id client-side via
  // pgcrypto default only on insert. To build the canonical path we must know
  // the id BEFORE insert. Use a two-phase: insert a row with a provisional
  // unique path, then update path to canonical. Cleaner: pre-generate a UUID
  // here and build the canonical path directly.
  const { randomUUID } = require('crypto');
  contentId = randomUUID();
  const originalPath = isWritten
    ? null
    : getHomeCloudOriginalPath(context.householdId, contentId);

  let insertPayload;
  if (isWritten) {
    // WRITTEN Memory: no binary metadata, no storage path, no uploaded_at
    // custody. lifecycle starts at 'staging' like the canonical creation path.
    insertPayload = {
      id: contentId,
      household_id: context.householdId,
      role: 'memory',
      written_text: normalized.writtenText,
      uploaded_at: null,
      lifecycle: 'staging',
      intake_request_id: intakeRequestId,
      hidden_from_resurfacing: normalized.hiddenFromResurfacing,
      caption: null,
      captured_at: normalized.capturedAt,
      captured_year: normalized.capturedYear,
      captured_month: normalized.capturedMonth,
      capture_precision: normalized.capturePrecision,
    };
  } else {
    insertPayload = {
      id: contentId,
      household_id: context.householdId,
      role: normalized.role,
      display_name: normalized.displayName,
      mime_type: normalized.mimeType,
      extension: normalized.extension,
      size_bytes: normalized.sizeBytes,
      original_storage_path: originalPath,
      uploaded_at: null,
      lifecycle: 'staging',
      folder_id: normalized.folderId ?? null,
      intake_request_id: intakeRequestId,
      hidden_from_resurfacing: normalized.hiddenFromResurfacing,
    };
  }

  if (normalized.role === 'file') {
    insertPayload.document_date = normalized.documentDate;
    insertPayload.note = normalized.note;
  } else if (!isWritten) {
    insertPayload.caption = normalized.caption;
    insertPayload.captured_at = normalized.capturedAt;
    insertPayload.captured_year = normalized.capturedYear;
    insertPayload.captured_month = normalized.capturedMonth;
    insertPayload.capture_precision = normalized.capturePrecision;
  }

  const { data: created, error: insertErr } = await supabaseAdmin
    .from('homecloud_contents')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertErr) {
    // Unique violation on intake_request_id -> concurrent duplicate; re-read.
    if (insertErr.code === '23505' && intakeRequestId) {
      const { data: dup } = await supabaseAdmin
        .from('homecloud_contents')
        .select('*')
        .eq('household_id', context.householdId)
        .eq('intake_request_id', intakeRequestId)
        .maybeSingle();
      if (dup) {
        await ensureReplayAlbumConsistency(context, dup.id, normalized.initialAlbumId);
        return mapContentRowToDto(dup);
      }
    }
    throw createHttpError(500, insertErr.message, 'homecloud_register_failed');
  }

  // Establish initial Album membership as part of CONTRIBUTION semantics.
  // Only for NEW Memory with explicit initialAlbumId. The DB trigger already
  // enforces memory-only + same-household invariants; this path never requires
  // homecloud.organize.
  if (initialAlbum) {
    const { error: membershipErr } = await supabaseAdmin
      .from('homecloud_album_items')
      .insert({
        album_id: initialAlbum.id,
        content_id: created.id,
        added_by_member_id: context.membershipId,
      });

    if (membershipErr) {
      // Preserve contribution intent: never allow a Memory to silently become
      // root after an explicit Album selection. Compensate by removing the
      // just-created staging row so the whole contribution fails consistently
      // (no DB transaction available; compensating delete is the smallest
      // recoverable consistent contract).
      await supabaseAdmin
        .from('homecloud_contents')
        .delete()
        .eq('id', created.id)
        .catch(() => {});
      throw createHttpError(500, membershipErr.message, 'homecloud_album_membership_failed');
    }
  }

  return mapContentRowToDto(created);
}

/**
 * UPLOAD AUTHORIZATION — issue a single-object signed upload URL for the
 * canonical original path of a KNOWN staging content of the SAME Household.
 *
 * The client receives authorization for exactly one intended staging object.
 * No broad path/bucket power. BINARY content only: a Written Memory has no
 * bytes and is denied with a typed domain error.
 */
async function authorizeHomeCloudOriginalUpload(req, contentId) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudContribute(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
  }

  const { data: content, error: contentErr } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, household_id, lifecycle, original_storage_path, size_bytes, written_text')
    .eq('id', contentId)
    .maybeSingle();

  if (contentErr) {
    throw createHttpError(500, contentErr.message, 'homecloud_upload_lookup_failed');
  }
  if (!content || content.household_id !== context.householdId) {
    throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
  }
  if (content.lifecycle !== 'staging') {
    throw createHttpError(409, 'El contenido ya no está en estado de ingesta.', 'homecloud_not_staging');
  }
  if (content.written_text !== null) {
    throw createHttpError(
      409,
      'Un recuerdo escrito no tiene binario que cargar.',
      'homecloud_content_has_no_binary',
    );
  }

  const canonicalPath = getHomeCloudOriginalPath(content.household_id, contentId);
  if (content.original_storage_path !== canonicalPath) {
    throw createHttpError(500, 'Ruta de almacenamiento canónica inconsistente.', 'homecloud_storage_path_mismatch');
  }

  const { data: signed, error: signedErr } = await supabaseAdmin
    .storage
    .from(ORIGINAL_BUCKET)
    .createSignedUploadUrl(canonicalPath);

  if (signedErr || !signed?.signedUrl) {
    throw createHttpError(500, `No se pudo autorizar la carga: ${signedErr?.message ?? 'unknown'}`, 'homecloud_upload_authorization_failed');
  }

  return {
    signedUploadUrl: signed.signedUrl,
    bucket: ORIGINAL_BUCKET,
    path: canonicalPath,
    expiresIn: DEFAULT_UPLOAD_URL_TTL,
    contentId,
  };
}

/**
 * VERIFY — confirm the original object exists at the canonical path (and size
 * matches when reported). Does NOT finalize.
 *
 * A Written Memory has no binary to verify. The answer is idempotent and
 * state-independent: there is nothing to check, so the operation reports
 * `verified: true, skipped: 'no_binary'`. The Shared Upload Engine never
 * calls this for Written content because Written never enters an UploadJob.
 */
async function verifyHomeCloudOriginal(req, contentId) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudContribute(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
  }

  const { data: content, error: contentErr } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, household_id, lifecycle, original_storage_path, size_bytes, written_text')
    .eq('id', contentId)
    .maybeSingle();

  if (contentErr) {
    throw createHttpError(500, contentErr.message, 'homecloud_verify_lookup_failed');
  }
  if (!content || content.household_id !== context.householdId) {
    throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
  }
  if (content.written_text !== null) {
    return { verified: true, skipped: 'no_binary', contentId };
  }
  if (content.lifecycle !== 'staging') {
    throw createHttpError(409, 'El contenido ya no está en estado de ingesta.', 'homecloud_not_staging');
  }

  // List the {household}/{content} folder to stat the "original" object.
  const folderPath = `${content.household_id}/${contentId}`;
  const { data: listing, error: listErr } = await supabaseAdmin
    .storage
    .from(ORIGINAL_BUCKET)
    .list(folderPath, { limit: 10 });

  if (listErr) {
    throw createHttpError(500, listErr.message, 'homecloud_verify_list_failed');
  }

  const original = (listing ?? []).find((entry) => entry.name === 'original');

  if (!original) {
    return { verified: false, code: 'original_missing', contentId };
  }

  // Size check only when the reported storage metadata is trustworthy.
  const reportedSize = original?.metadata?.size;
  const sizeVerified = typeof reportedSize === 'number'
    ? reportedSize === Number(content.size_bytes)
    : null;

  if (sizeVerified === false) {
    return { verified: false, code: 'original_size_mismatch', contentId, expectedSize: content.size_bytes, actualSize: reportedSize };
  }

  return { verified: true, contentId, size: reportedSize ?? null };
}

/**
 * STAGE 4B.1 — run the best-effort preview attempt for an ACTIVE row and
 * return the row to report back.
 *
 * Guarantees, in order:
 *   1. Only a binary MEMORY is even considered. A File and a Written Memory
 *      are never previewed.
 *   2. The attempt can never throw into finalize.
 *   3. When nothing was generated, the already-loaded row is returned as-is
 *      (hasPreview stays truthful: false).
 *   4. When a preview WAS generated, the row is re-read so hasPreview in the
 *      response reflects reality.
 *
 * @param {Object|null} activeRow freshly loaded homecloud_contents row
 * @returns {Promise<Object|null>} row to map into the finalize DTO
 */
async function runPreviewAfterActive(activeRow) {
  if (!activeRow || activeRow.role !== 'memory') return activeRow;
  if (activeRow.written_text !== null && activeRow.written_text !== undefined) return activeRow;

  const outcome = await attemptHomeCloudPreview(activeRow.id);
  if (!outcome.generated) return activeRow;

  const { data: refreshed } = await supabaseAdmin
    .from('homecloud_contents')
    .select('*')
    .eq('id', activeRow.id)
    .maybeSingle();
  return refreshed ?? activeRow;
}

/**
 * FINALIZE — idempotent staging -> active transition.
 *
 * BINARY content: verifies the original exists (never trusts a client claim),
 * then sets uploaded_at to now() strictly at canonical finalize.
 *
 * WRITTEN Memory: NO Storage verify (there are no bytes). The DB purity
 * constraints already guarantee written_text exists and every binary field is
 * NULL, so finalize only flips lifecycle to active. uploaded_at REMAINS NULL
 * because binary custody never happened.
 *
 * STAGE 4B.1 — PREVIEW FOUNDATION (best-effort, AFTER the content is active):
 *   content active -> preview generation attempt -> persist preview_storage_path
 * The lifecycle transition is already committed before the attempt starts, so
 * a preview failure can NEVER roll finalize back: the content simply stays
 * active with preview_storage_path = NULL and the original remains the
 * authority. Files and Written Memories are never previewed.
 *
 * Safe replay: if already active, return success without touching uploaded_at.
 * A replay re-attempts the (idempotent) preview, which is also the recovery
 * path when the image codec was unavailable on the first attempt.
 */
async function finalizeHomeCloudContent(req, contentId) {
  const context = await getHomeCloudContext(req);
  await requireHomeCloudContribute(context);

  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
  }

  const { data: content, error: contentErr } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, household_id, lifecycle, original_storage_path, uploaded_at, written_text')
    .eq('id', contentId)
    .maybeSingle();

  if (contentErr) {
    throw createHttpError(500, contentErr.message, 'homecloud_finalize_lookup_failed');
  }
  if (!content || content.household_id !== context.householdId) {
    throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
  }

  // Idempotent: already active -> success (no duplicate, no re-timestamp).
  if (content.lifecycle === 'active') {
    const { data: activeRow } = await supabaseAdmin
      .from('homecloud_contents')
      .select('*')
      .eq('id', contentId)
      .single();
    // Replay is also the preview retry path: the attempt is idempotent and can
    // never fail the replay.
    const retried = await runPreviewAfterActive(activeRow);
    return mapContentRowToDto(retried ?? activeRow);
  }

  if (content.lifecycle !== 'staging') {
    throw createHttpError(409, 'El contenido no puede finalizarse desde su estado actual.', 'homecloud_not_staging');
  }

  if (content.written_text !== null) {
    // Written Memory: no bytes were ever taken into custody. The DB
    // (homecloud_contents_written_purity_check) guarantees uploaded_at and
    // original_storage_path are NULL, so only the lifecycle flips and
    // uploaded_at stays NULL forever.
    const { data: writtenFinalized, error: writtenUpdateErr } = await supabaseAdmin
      .from('homecloud_contents')
      .update({ lifecycle: 'active' })
      .eq('id', contentId)
      .eq('household_id', context.householdId)
      .eq('lifecycle', 'staging')
      .select('*')
      .maybeSingle();

    if (writtenUpdateErr) {
      throw createHttpError(500, writtenUpdateErr.message, 'homecloud_finalize_failed');
    }

    if (!writtenFinalized) {
      // A concurrent finalize won the race; reload.
      const { data: winner } = await supabaseAdmin
        .from('homecloud_contents')
        .select('*')
        .eq('id', contentId)
        .single();
      return mapContentRowToDto(winner);
    }

    return mapContentRowToDto(writtenFinalized);
  }

  // Verify original exists before finalize (never trust client claim).
  const verification = await verifyHomeCloudOriginal(req, contentId);
  if (!verification.verified) {
    throw createHttpError(
      409,
      'El original no pudo verificarse; el contenido permanece en ingesta.',
      'homecloud_verify_failed',
      { code: verification.code ?? 'original_missing' },
    );
  }

  const now = new Date().toISOString();
  // Guarded UPDATE: only transition staging -> active atomically; a concurrent
  // finalize cannot double-finalize because the WHERE filters lifecycle.
  const { data: finalized, error: updateErr } = await supabaseAdmin
    .from('homecloud_contents')
    .update({ lifecycle: 'active', uploaded_at: now })
    .eq('id', contentId)
    .eq('household_id', context.householdId)
    .eq('lifecycle', 'staging')
    .select('*')
    .maybeSingle();

  if (updateErr) {
    throw createHttpError(500, updateErr.message, 'homecloud_finalize_failed');
  }

  if (!finalized) {
    // A concurrent finalize won the race; reload.
    const { data: winner } = await supabaseAdmin
      .from('homecloud_contents')
      .select('*')
      .eq('id', contentId)
      .single();
    return mapContentRowToDto(await runPreviewAfterActive(winner));
  }

  // Content is ALREADY active and committed at this point. The preview attempt
  // below is strictly best-effort: any failure leaves the Memory active with
  // preview_storage_path = NULL and never rolls finalize back.
  return mapContentRowToDto(await runPreviewAfterActive(finalized));
}

module.exports = {
  registerHomeCloudContent,
  authorizeHomeCloudOriginalUpload,
  verifyHomeCloudOriginal,
  finalizeHomeCloudContent,
  requireHomeCloudContribute,
  DEFAULT_UPLOAD_URL_TTL,
};
