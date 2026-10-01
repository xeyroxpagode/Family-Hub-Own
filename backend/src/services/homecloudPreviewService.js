'use strict';

/**
 * HomeCloud STAGE 4B.1 — Preview Foundation (best-effort).
 *
 * Authority: Memories V2 preview_storage_path + HC-1E storage access.
 *
 * THE ORIGINAL IS THE AUTHORITY. A preview is derived, regenerable and
 * replaceable. Therefore:
 *
 *   - PREVIEW NEVER BLOCKS FINALIZE. This module never throws: every outcome
 *     is a typed `reason`, and the caller keeps the content active with
 *     preview_storage_path = NULL.
 *   - There is no rollback path from a preview failure to the content.
 *   - No queue, no worker, no cron, no second upload engine. The only writer
 *     of preview_storage_path in this slice is this module, and it derives
 *     the canonical path from the content identity (never from the client).
 *
 * Per-kind reality (deliberately asymmetric — no fake preview is ever made):
 *
 *   image/*   -> real thumbnail, generated with the runtime image codec.
 *   video/*   -> NOT GENERATED. A poster frame needs a video decoder
 *                (ffmpeg/ffprobe) that this repository does not depend on.
 *                preview_storage_path stays NULL; this is a reported REAL GAP,
 *                not something to fake with a still image or a placeholder.
 *   audio/*   -> NOT GENERATED. Audio has no visual preview. Timeline renders
 *                a generic audio representation from the DTO instead. No
 *                waveform is ever fabricated.
 *   written   -> NEVER ATTEMPTED. A Written Memory has no binary; the DB
 *                (homecloud_contents_written_purity_check) forbids it from
 *                ever holding a preview_storage_path.
 *
 * Idempotency: the canonical preview path is derived from
 * {household_id}/{content_id}/preview, the upload uses upsert, and the
 * preview_storage_path write is guarded on the column still being NULL.
 * A repeated attempt is therefore a typed no-op: it can never duplicate,
 * overwrite or corrupt an existing preview, and it never touches the
 * original.
 */

const { supabaseAdmin } = require('../config/supabase');
const {
  getHomeCloudBucket,
  getHomeCloudOriginalPath,
  getHomeCloudPreviewPath,
} = require('../lib/homecloudStoragePaths');

const ORIGINAL_BUCKET = getHomeCloudBucket('original');
const PREVIEW_BUCKET = getHomeCloudBucket('preview');

/** Timeline/grid thumbnail geometry. Derived data, replaceable at will. */
const PREVIEW_MAX_EDGE = 480;
const PREVIEW_JPEG_QUALITY = 78;
const PREVIEW_CONTENT_TYPE = 'image/jpeg';

/**
 * Typed outcomes. Every non-generated result uses one of these, so a caller
 * can always explain WHY there is no preview.
 */
const PREVIEW_OUTCOME = Object.freeze({
  GENERATED: 'generated',
  NOT_A_MEMORY: 'not_a_memory',
  NOT_ACTIVE: 'content_not_active',
  WRITTEN_NO_BINARY: 'written_no_binary',
  AUDIO_NO_VISUAL_PREVIEW: 'audio_no_visual_preview',
  VIDEO_POSTER_UNSUPPORTED: 'video_poster_unsupported',
  UNSUPPORTED_MIME: 'unsupported_mime',
  PREVIEW_ALREADY_EXISTS: 'preview_already_exists',
  ORIGINAL_PATH_MISSING: 'original_path_missing',
  ORIGINAL_PATH_MISMATCH: 'original_path_mismatch',
  ORIGINAL_DOWNLOAD_FAILED: 'original_download_failed',
  TRANSFORMER_UNAVAILABLE: 'image_transformer_unavailable',
  TRANSFORM_FAILED: 'transform_failed',
  PREVIEW_UPLOAD_FAILED: 'preview_upload_failed',
  PREVIEW_PERSIST_FAILED: 'preview_persist_failed',
  BACKEND_UNAVAILABLE: 'backend_unavailable',
});

const CONTENT_FIELDS =
  'id, household_id, role, mime_type, written_text, original_storage_path, preview_storage_path, lifecycle';

/**
 * Default image transformer: the image codec the backend already uses for
 * avatars (backend/src/lib/sharp.js). It is an OPTIONAL runtime capability —
 * when it is not installed, no preview is generated and the content stays
 * active. That degradation is the designed behavior, not a hidden failure.
 *
 * JPEG output on purpose: it is the format every supported sharp build emits
 * and every client decodes, and the bucket is private + signed, so there is no
 * content-sniffing surface to optimise away.
 */
function defaultImageTransformer() {
  const { loadSharp } = require('../lib/sharp');
  const sharp = loadSharp();
  return async (input) => {
    const { data, info } = await sharp(input, { animated: false })
      .rotate()
      .resize({
        width: PREVIEW_MAX_EDGE,
        height: PREVIEW_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: PREVIEW_JPEG_QUALITY })
      .toBuffer({ resolveWithObject: true });
    // An empty output is a failure, never a valid preview.
    if (!data || data.length === 0) {
      throw new Error('empty_preview_output');
    }
    if (info.format !== 'jpeg') {
      throw new Error(`unexpected_preview_format:${info.format}`);
    }
    return { body: data, contentType: PREVIEW_CONTENT_TYPE };
  };
}

/** Read a Storage download payload as a Buffer across Blob implementations. */
async function toBuffer(payload) {
  if (payload === null || payload === undefined) {
    throw new Error('empty_download');
  }
  if (Buffer.isBuffer(payload)) return payload;
  if (typeof payload.arrayBuffer === 'function') {
    return Buffer.from(await payload.arrayBuffer());
  }
  if (typeof payload.buffer === 'function') {
    return Buffer.from(await payload.buffer());
  }
  throw new Error('unsupported_download_payload');
}

/**
 * Per-kind preview policy. Pure, no IO, never throws.
 *
 * This is the ONLY place that decides which Memory kind gets a derived
 * binary, so "never fabricate a preview" is a single enforceable decision.
 *
 * @param {Object} content homecloud_contents row
 * @returns {{eligible: boolean, reason: string}}
 */
function resolvePreviewKindPolicy(content) {
  if (!content || content.role !== 'memory') {
    return { eligible: false, reason: PREVIEW_OUTCOME.NOT_A_MEMORY };
  }
  if (content.lifecycle !== 'active') {
    return { eligible: false, reason: PREVIEW_OUTCOME.NOT_ACTIVE };
  }
  if (content.written_text !== null && content.written_text !== undefined) {
    return { eligible: false, reason: PREVIEW_OUTCOME.WRITTEN_NO_BINARY };
  }
  const mimeType = typeof content.mime_type === 'string' ? content.mime_type : '';
  if (mimeType.startsWith('audio/')) {
    return { eligible: false, reason: PREVIEW_OUTCOME.AUDIO_NO_VISUAL_PREVIEW };
  }
  if (mimeType.startsWith('video/')) {
    return { eligible: false, reason: PREVIEW_OUTCOME.VIDEO_POSTER_UNSUPPORTED };
  }
  if (!mimeType.startsWith('image/')) {
    return { eligible: false, reason: PREVIEW_OUTCOME.UNSUPPORTED_MIME };
  }
  return { eligible: true, reason: PREVIEW_OUTCOME.GENERATED };
}

/**
 * Full generation plan: per-kind policy + idempotency + canonical path guards.
 * Pure, no IO, never throws.
 */
function resolvePreviewPlan(content) {
  const policy = resolvePreviewKindPolicy(content);
  if (!policy.eligible) return policy;
  if (content.preview_storage_path) {
    return { eligible: false, reason: PREVIEW_OUTCOME.PREVIEW_ALREADY_EXISTS };
  }
  if (!content.original_storage_path) {
    return { eligible: false, reason: PREVIEW_OUTCOME.ORIGINAL_PATH_MISSING };
  }
  if (content.original_storage_path !== getHomeCloudOriginalPath(content.household_id, content.id)) {
    return { eligible: false, reason: PREVIEW_OUTCOME.ORIGINAL_PATH_MISMATCH };
  }
  return policy;
}

/**
 * Best-effort preview generation for ONE content.
 *
 * NEVER throws. Resolves to
 *   { contentId, generated, reason, previewStoragePath }
 *
 * @param {Object} params
 * @param {string} params.contentId
 * @param {Object} [params.client]      storage/DB client (defaults to supabaseAdmin)
 * @param {Function} [params.transform] injected image transformer
 *   `(input: Buffer) => Promise<{ body: Buffer, contentType: string }>`
 * @returns {Promise<{contentId: string, generated: boolean, reason: string, previewStoragePath: (string|null)}>}
 */
async function generateHomeCloudPreview({ contentId, client, transform }) {
  const db = client ?? supabaseAdmin;
  const skip = (reason) => ({
    contentId,
    generated: false,
    reason,
    previewStoragePath: null,
  });

  if (!db) return skip(PREVIEW_OUTCOME.BACKEND_UNAVAILABLE);

  let content;
  try {
    const { data, error } = await db
      .from('homecloud_contents')
      .select(CONTENT_FIELDS)
      .eq('id', contentId)
      .maybeSingle();
    if (error || !data) return skip(PREVIEW_OUTCOME.NOT_ACTIVE);
    content = data;
  } catch {
    return skip(PREVIEW_OUTCOME.NOT_ACTIVE);
  }

  const plan = resolvePreviewPlan(content);
  if (!plan.eligible) {
    return {
      contentId,
      generated: false,
      reason: plan.reason,
      previewStoragePath: content.preview_storage_path ?? null,
    };
  }

  let imageTransformer;
  try {
    imageTransformer = transform ?? defaultImageTransformer();
  } catch {
    return skip(PREVIEW_OUTCOME.TRANSFORMER_UNAVAILABLE);
  }
  if (typeof imageTransformer !== 'function') {
    return skip(PREVIEW_OUTCOME.TRANSFORMER_UNAVAILABLE);
  }

  let input;
  try {
    const { data: original, error: downloadError } = await db.storage
      .from(ORIGINAL_BUCKET)
      .download(content.original_storage_path);
    if (downloadError || !original) return skip(PREVIEW_OUTCOME.ORIGINAL_DOWNLOAD_FAILED);
    input = await toBuffer(original);
  } catch {
    return skip(PREVIEW_OUTCOME.ORIGINAL_DOWNLOAD_FAILED);
  }

  let derived;
  try {
    derived = await imageTransformer(input);
  } catch {
    return skip(PREVIEW_OUTCOME.TRANSFORM_FAILED);
  }
  if (!derived?.body) return skip(PREVIEW_OUTCOME.TRANSFORM_FAILED);

  // Canonical, identity-derived path. The client never chooses it.
  const previewPath = getHomeCloudPreviewPath(content.household_id, content.id);
  try {
    const { error: uploadError } = await db.storage
      .from(PREVIEW_BUCKET)
      .upload(previewPath, derived.body, {
        contentType: derived.contentType ?? PREVIEW_CONTENT_TYPE,
        upsert: true,
      });
    if (uploadError) return skip(PREVIEW_OUTCOME.PREVIEW_UPLOAD_FAILED);
  } catch {
    return skip(PREVIEW_OUTCOME.PREVIEW_UPLOAD_FAILED);
  }

  try {
    // Guarded write: the column must still be NULL, so a concurrent attempt is
    // never silently overwritten and a retry is a no-op.
    const { data: persisted, error: persistError } = await db
      .from('homecloud_contents')
      .update({ preview_storage_path: previewPath })
      .eq('id', content.id)
      .eq('household_id', content.household_id)
      .eq('lifecycle', 'active')
      .is('preview_storage_path', null)
      .select('id, preview_storage_path')
      .maybeSingle();
    if (persistError) return skip(PREVIEW_OUTCOME.PREVIEW_PERSIST_FAILED);
    if (!persisted) {
      return {
        contentId,
        generated: false,
        reason: PREVIEW_OUTCOME.PREVIEW_ALREADY_EXISTS,
        previewStoragePath: content.preview_storage_path ?? null,
      };
    }
    return {
      contentId,
      generated: true,
      reason: PREVIEW_OUTCOME.GENERATED,
      previewStoragePath: persisted.preview_storage_path ?? previewPath,
    };
  } catch {
    return skip(PREVIEW_OUTCOME.PREVIEW_PERSIST_FAILED);
  }
}

/**
 * Call site used by finalize: guarantees that not even an unexpected bug in
 * this module can escape into the finalize response.
 */
async function attemptHomeCloudPreview(contentId) {
  try {
    return await generateHomeCloudPreview({ contentId });
  } catch (error) {
    return {
      contentId,
      generated: false,
      reason: 'preview_unexpected_error',
      previewStoragePath: null,
      error: error?.message ?? String(error),
    };
  }
}

module.exports = {
  generateHomeCloudPreview,
  attemptHomeCloudPreview,
  resolvePreviewPlan,
  resolvePreviewKindPolicy,
  defaultImageTransformer,
  PREVIEW_OUTCOME,
  PREVIEW_BUCKET,
  ORIGINAL_BUCKET,
  PREVIEW_MAX_EDGE,
  PREVIEW_CONTENT_TYPE,
};
