'use strict';

/**
 * HomeCloud V1 — Private Binary Access Foundation.
 *
 * Authority: HC-1E Product Truth + HC-1D capability engine.
 *
 * Canonical flow:
 *   client -> backend HomeCloud
 *     -> resolve membership (HC-1D context)
 *     -> require homecloud.view capability
 *     -> load homecloud_contents row (privileged backend DB)
 *     -> verify household match
 *     -> verify lifecycle allows access
 *     -> resolve bucket + path from DB columns
 *     -> create bounded signed URL
 *     -> return safe access info
 *
 * Client NEVER supplies bucket or path.
 * Signed URLs are bounded, not persisted, re-issued on demand.
 */

const { supabaseAdmin } = require('../config/supabase');
const { createHttpError } = require('../lib/httpErrors');
const { getHomeCloudBucket } = require('../lib/homecloudStoragePaths');

// Default signed URL TTL (seconds). Configurable via env or future config system.
// 1 hour default — runtime can override via options.
const DEFAULT_SIGNED_URL_TTL = Number(process.env.HOMECLOUD_SIGNED_URL_TTL ?? 3600);

/**
 * Result of a successful content access resolution.
 * @typedef {Object} ContentAccessResult
 * @property {string} signedUrl
 * @property {string} bucket
 * @property {string} path
 * @property {number} expiresIn
 * @property {string} variant
 * @property {string} contentId
 */

/**
 * Result when preview is not available.
 * @typedef {Object} PreviewUnavailableResult
 * @property {'preview_unavailable'} code
 * @property {string} message
 */

/**
 * Create a private signed access URL for HomeCloud content.
 *
 * @param {Object} params
 * @param {Object} params.authContext     Result from getHomeCloudContext (contains householdId, membership, etc.)
 * @param {string} params.contentId       UUID of homecloud_contents row
 * @param {'original'|'preview'} params.variant  Which binary variant to access
 * @param {Object} [params.options]
 * @param {number} [params.options.ttl]   Signed URL TTL in seconds (default: 3600)
 * @returns {Promise<ContentAccessResult|PreviewUnavailableResult>}
 */
async function createHomeCloudContentAccess({ authContext, contentId, variant, options = {} }) {
  // 1. Validate variant
  if (variant !== 'original' && variant !== 'preview') {
    throw createHttpError(400, `Variante de almacenamiento inválida: ${variant}`, 'homecloud_invalid_variant');
  }

  // 2. Require homecloud.view capability (already enforced by HC-1D middleware,
  //    but defense-in-depth: re-assert here)
  const { hasHomeCloudCapability } = require('../lib/homecloudCapabilities');
  if (!hasHomeCloudCapability(authContext.capabilities, 'homecloud.view')) {
    throw createHttpError(403, 'No tenés permiso para ver contenido en HomeCloud.', 'homecloud_forbidden', {
      capability: 'homecloud.view',
    });
  }

  // 3. Load canonical content row via privileged backend (service role)
  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured (missing service role)', 'storage_backend_unavailable');
  }

  const { data: content, error: contentErr } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, household_id, role, mime_type, size_bytes, original_storage_path, preview_storage_path, lifecycle, uploaded_at')
    .eq('id', contentId)
    .single();

  if (contentErr) {
    if (contentErr.code === 'PGRST116') {
      throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
    }
    throw createHttpError(500, contentErr.message, 'storage_content_lookup_failed');
  }

  // 4. Verify content belongs to the resolved household (household isolation)
  if (content.household_id !== authContext.householdId) {
    throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
  }

  // 5. Enforce lifecycle access boundary (HC-1E)
  //    Normal HomeCloud view should target finalized content only.
  //    Staging content must NOT be accessible through normal view flows.
  if (content.lifecycle !== 'active') {
    throw createHttpError(404, 'Contenido no encontrado.', 'homecloud_content_not_found');
  }

  // 6. Resolve bucket and path
  const bucket = getHomeCloudBucket(variant);
  let storagePath;

  if (variant === 'original') {
    // Original is required for ACTIVE content (uploaded_at != null)
    if (!content.original_storage_path) {
      throw createHttpError(500, 'Original storage path missing for active content', 'storage_path_missing');
    }
    storagePath = content.original_storage_path;
  } else {
    // Preview is optional/regenerable
    if (!content.preview_storage_path) {
      // Return canonical "preview unavailable" result instead of inventing a path
      return {
        code: 'preview_unavailable',
        message: 'No hay vista previa disponible para este contenido.',
        contentId,
        variant,
      };
    }
    storagePath = content.preview_storage_path;
  }

  // 7. Create bounded signed URL
  const ttl = options.ttl ?? DEFAULT_SIGNED_URL_TTL;
  const { data: signedUrlData, error: signedUrlErr } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUrl(storagePath, ttl);

  if (signedUrlErr || !signedUrlData?.signedUrl) {
    throw createHttpError(500, `No se pudo generar URL de acceso: ${signedUrlErr?.message ?? 'unknown'}`, 'storage_signed_url_failed');
  }

  // 8. Return only safe access information (no internal paths, no bucket exposure)
  return {
    signedUrl: signedUrlData.signedUrl,
    bucket,                    // internal bucket name (for client debugging only)
    path: storagePath,         // canonical path (stable, no secrets)
    expiresIn: ttl,
    variant,
    contentId,
  };
}

/**
 * Check if a content item has a preview available (without generating signed URL).
 *
 * @param {Object} params
 * @param {Object} params.authContext
 * @param {string} params.contentId
 * @returns {Promise<{hasPreview: boolean, previewPath: string|null}>}
 */
async function checkHomeCloudPreviewAvailability({ authContext, contentId }) {
  if (!supabaseAdmin) {
    throw createHttpError(500, 'Backend storage access not configured', 'storage_backend_unavailable');
  }

  const { data: content, error } = await supabaseAdmin
    .from('homecloud_contents')
    .select('id, household_id, preview_storage_path, lifecycle')
    .eq('id', contentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return { hasPreview: false, previewPath: null };
    throw createHttpError(500, error.message, 'storage_preview_check_failed');
  }

  if (content.household_id !== authContext.householdId || content.lifecycle !== 'active') {
    return { hasPreview: false, previewPath: null };
  }

  return {
    hasPreview: Boolean(content.preview_storage_path),
    previewPath: content.preview_storage_path ?? null,
  };
}

module.exports = {
  createHomeCloudContentAccess,
  checkHomeCloudPreviewAvailability,
  DEFAULT_SIGNED_URL_TTL,
};