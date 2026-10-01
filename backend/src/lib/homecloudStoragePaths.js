'use strict';

/**
 * HomeCloud V1 — Canonical Storage Path Contract.
 *
 * Authority: HC-1E Product Truth.
 *
 * HomeCloud owns ONLY the canonical path format. The path is:
 *   {household_id}/{content_id}/original   -> homecloud-originals
 *   {household_id}/{content_id}/preview    -> homecloud-previews
 *
 * The path MUST NOT contain:
 * - display_name, filename, extension
 * - role (file|memory)
 * - folder_id, album_id
 * - member_id, user_id
 * - lifecycle, date
 * - any semantic metadata
 *
 * The path is stable across: rename, folder move, album membership,
 * FILE↔MEMORY, trash, restore.
 */

/**
 * Validate and normalize a UUID string.
 * Throws if not a valid UUID v4 format.
 */
function assertValidUuid(value, label) {
  if (!value || typeof value !== 'string') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  // UUID v4 regex (loose validation, enough for our use)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new TypeError(`${label} must be a valid UUID: ${value}`);
  }
}

/**
 * Get the canonical original storage path for a content item.
 *
 * @param {string} householdId  UUID of the household
 * @param {string} contentId    UUID of the homecloud_contents row
 * @returns {string}            Path: {householdId}/{contentId}/original
 */
function getHomeCloudOriginalPath(householdId, contentId) {
  assertValidUuid(householdId, 'householdId');
  assertValidUuid(contentId, 'contentId');
  return `${householdId}/${contentId}/original`;
}

/**
 * Get the canonical preview storage path for a content item.
 *
 * @param {string} householdId  UUID of the household
 * @param {string} contentId    UUID of the homecloud_contents row
 * @returns {string}            Path: {householdId}/{contentId}/preview
 */
function getHomeCloudPreviewPath(householdId, contentId) {
  assertValidUuid(householdId, 'householdId');
  assertValidUuid(contentId, 'contentId');
  return `${householdId}/${contentId}/preview`;
}

/**
 * Get the bucket name for a given variant.
 *
 * @param {'original'|'preview'} variant
 * @returns {string}
 */
function getHomeCloudBucket(variant) {
  if (variant === 'original') return 'homecloud-originals';
  if (variant === 'preview') return 'homecloud-previews';
  throw new Error(`Unknown storage variant: ${variant}`);
}

/**
 * Parse a canonical HomeCloud storage path back into its components.
 * Used only for internal validation/debugging — the canonical source
 * of truth is the database (homecloud_contents.original_storage_path
 * and preview_storage_path).
 *
 * @param {string} path  Path like "hhh-.../ccc-.../original"
 * @returns {{householdId:string, contentId:string, variant:'original'|'preview'} | null}
 */
function parseHomeCloudPath(path) {
  if (!path || typeof path !== 'string') return null;
  const parts = path.split('/');
  if (parts.length !== 3) return null;
  const [householdId, contentId, variant] = parts;
  if (variant !== 'original' && variant !== 'preview') return null;
  try {
    assertValidUuid(householdId, 'householdId');
    assertValidUuid(contentId, 'contentId');
  } catch {
    return null;
  }
  return { householdId, contentId, variant };
}

module.exports = {
  getHomeCloudOriginalPath,
  getHomeCloudPreviewPath,
  getHomeCloudBucket,
  parseHomeCloudPath,
  assertValidUuid,
};