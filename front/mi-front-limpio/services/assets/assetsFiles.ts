/**
 * HOMePLUS Assets — S8: Asset/Record/Care <-> HomeCloud File relations (API).
 *
 * Authority: S6 INTEGRATION FREEZE.
 *
 * The Assets domain owns the RELATION; HomeCloud owns the File. This client
 * therefore NEVER reads `homecloud_contents` and NEVER stores a copy of the
 * File payload: the backend projects the LIVE HomeCloud metadata inside every
 * relation it returns, and the frontend keeps only the `file_id` it needs.
 *
 * Endpoints (backend/src/routes/assets.js):
 *   GET  /api/assets/:assetId/files
 *   GET  /api/assets/records/:recordId/files
 *   GET  /api/assets/care/:careId/files
 *   POST /api/assets/files/link     (Idempotency-Key REQUIRED)
 *   POST /api/assets/files/unlink   (Idempotency-Key REQUIRED)
 */

import { OPERATION_KINDS, requestJson } from '../api';
import { assetsCache } from './assetsCache';
import { assetsKeys } from './assetsKeys';
import type { AssetsHouseholdScope } from './assetsKeys';
import type { AssetsRequestOptions, MutationCallOptions } from './client';

/** The three owner kinds of a File relation. */
export type AssetFileOwnerType = 'asset' | 'record' | 'care';

/**
 * The authoritative Assets file state set.
 *
 * `purging` is NOT collapsed into `trashed`: the frozen API plan and the
 * lifecycle matrix keep them apart.
 */
export type AssetFileState = 'available' | 'trashed' | 'purging' | 'missing';

/** The LIVE HomeCloud metadata projected by the backend at read time. */
export type AssetFileProjection = {
  id: string;
  display_name: string | null;
  mime_type: string | null;
  extension: string | null;
  size_bytes: number | null;
  document_date: string | null;
};

/** One attached File, as the backend projects it. */
export type AssetFileRelation = {
  relation_id: string;
  owner_type: AssetFileOwnerType;
  owner_id: string;
  file_id: string;
  state: AssetFileState;
  file: AssetFileProjection | null;
};

export type AssetFilesResponse = {
  files: AssetFileRelation[];
};

export type LinkAssetFileResponse = {
  relation: AssetFileRelation;
  duplicate: boolean;
};

export type UnlinkAssetFileResponse = {
  relation: AssetFileRelation | null;
  already_removed: boolean;
};

export type AssetFileLinkPayload = {
  owner_type: AssetFileOwnerType;
  owner_id: string;
  file_id: string;
};

const OWNER_PATHS: Record<AssetFileOwnerType, (ownerId: string) => string> = {
  asset: (ownerId) => `/api/assets/${ownerId}/files`,
  record: (ownerId) => `/api/assets/records/${ownerId}/files`,
  care: (ownerId) => `/api/assets/care/${ownerId}/files`,
};

const readOptions = (accessToken: string, options?: AssetsRequestOptions) => ({
  accessToken,
  operationKind: OPERATION_KINDS.READ_ONLY,
  signal: options?.signal,
  timeoutMs: options?.timeoutMs,
  contextScope: options?.contextScope,
});

/**
 * Read the Files attached to one owner.
 *
 * The read model projects the LIVE HomeCloud metadata, so a rename or a
 * lifecycle change in HomeCloud is visible here without touching the Assets
 * relation rows.
 */
export const listAssetFiles = (
  accessToken: string,
  ownerType: AssetFileOwnerType,
  ownerId: string,
  options?: AssetsRequestOptions,
): Promise<AssetFilesResponse> =>
  requestJson<AssetFilesResponse>(OWNER_PATHS[ownerType](ownerId), readOptions(accessToken, options));

/**
 * Attach an existing HomeCloud File to an owner.
 *
 * `Idempotency-Key` comes from the caller's intent and is NEVER regenerated:
 * the same key + the same payload replays the stored answer, and the same key
 * + a different payload is a 409 idempotency_conflict.
 */
export const linkAssetFile = (
  accessToken: string,
  payload: AssetFileLinkPayload,
  call: MutationCallOptions,
): Promise<LinkAssetFileResponse> =>
  requestJson<LinkAssetFileResponse>('/api/assets/files/link', {
    accessToken,
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    mutationId: call.intent.mutationId,
    idempotencyKey: call.intent.idempotencyKey,
    body: payload,
    signal: call.signal,
    timeoutMs: call.timeoutMs,
    contextScope: call.contextScope,
  });

/**
 * Detach a File from an owner (the RELATION only).
 *
 * The HomeCloud File is never deleted, trashed or purged by this call.
 */
export const unlinkAssetFile = (
  accessToken: string,
  payload: AssetFileLinkPayload,
  call: MutationCallOptions,
): Promise<UnlinkAssetFileResponse> =>
  requestJson<UnlinkAssetFileResponse>('/api/assets/files/unlink', {
    accessToken,
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    mutationId: call.intent.mutationId,
    idempotencyKey: call.intent.idempotencyKey,
    body: payload,
    signal: call.signal,
    timeoutMs: call.timeoutMs,
    contextScope: call.contextScope,
  });

/**
 * Build the HomeCloud File projection the REAL viewer consumes.
 *
 * Assets does NOT create a viewer and does NOT keep a second copy of the
 * File: it hands the live HomeCloud metadata to the existing HomeCloud
 * viewer, exactly as the HomeCloud Files screen does.
 *
 * Returns null when the File is not available (trashed, purging or missing):
 * the viewer is never opened for a File that cannot be read.
 */
export const toHomeCloudFileProjection = (
  relation: AssetFileRelation | null,
): import('../homecloud/homecloudTypes').HomeCloudFile | null => {
  const file = relation?.file;
  if (!relation || !file || relation.state !== 'available') return null;
  return {
    id: file.id,
    role: 'file',
    displayName: file.display_name ?? 'Archivo',
    mimeType: file.mime_type ?? 'application/octet-stream',
    extension: file.extension ?? null,
    sizeBytes: file.size_bytes ?? 0,
    uploadedByMemberId: null,
    uploadedAt: null,
    hasPreview: false,
    hiddenFromResurfacing: false,
    favorite: false,
    folderId: null,
    documentDate: file.document_date ?? null,
    note: null,
    isFavorite: false,
  };
};

/**
 * Invalidate the cached file list of ONE owner.
 *
 * Targeted: after a link/unlink of an Asset the Asset detail is invalidated
 * too (the detail key is the one the surface shows). There is never a global
 * invalidate and never a HomeCloud -> Assets push.
 */
export const invalidateAssetFiles = (
  scope: AssetsHouseholdScope,
  ownerType: AssetFileOwnerType,
  ownerId: string,
): number => {
  let count = 0;
  if (assetsCache.invalidate(assetsKeys.files(scope, ownerType, ownerId))) count += 1;
  if (ownerType === 'asset' && assetsCache.invalidate(assetsKeys.detail(scope, ownerId))) {
    count += 1;
  }
  return count;
};
