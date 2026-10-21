/**
 * HomeCloud Files — LIFECYCLE V1 client service (Trash / Restore / Purge).
 *
 * The transport mirrors the backend contract exactly:
 *
 *   GET    /api/homecloud/files/trash            -> one Papelera page
 *   POST   /api/homecloud/content/:id/trash      -> reversible, idempotent
 *   POST   /api/homecloud/content/:id/restore    -> reversible, idempotent
 *   POST   /api/homecloud/content/:id/purge      -> IRREVERSIBLE, confirm-only
 *
 * AUTHORITY stays server-side end to end: the household, the person and the
 * capability (homecloud.delete) are resolved from the access token, so no
 * request here can name a household, a member or a lifecycle value. The client
 * states INTENT only.
 *
 * PURGE is the one irreversible action in Files V1, so its request body is
 * assembled HERE, in one place, with `confirm: true` always set — there is no
 * call shape in this module that could issue a confirmation-less purge. The
 * destructive confirmation UI lives in the surface; the contract lives here.
 */

import { requestJson } from '../api';
import type { HomeCloudFilesTrashPage, HomeCloudPurgeResponse, HomeCloudTrashedFile } from './homecloudTypes';

/** The backend clamps limit to 1..100 (default 100) — the browser's page size. */
export const FILES_TRASH_MAX_LIMIT = 100;

export type FilesTrashResponse = { trash: HomeCloudFilesTrashPage };

/** One page of the household Papelera. `offset` continues a `nextOffset`. */
export const fetchHomeCloudFilesTrash = (accessToken: string, options: { limit?: number; offset?: number } = {}) => {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString();
  return requestJson<FilesTrashResponse>(`/api/homecloud/files/trash${query ? `?${query}` : ''}`, { accessToken });
};

/** Send one File to the Papelera. Reversible (Restore) and idempotent. */
export const trashHomeCloudFile = (accessToken: string, contentId: string) =>
  requestJson<{ file: { id: string } }>(`/api/homecloud/content/${contentId}/trash`, { method: 'POST', accessToken });

/** Restore one File from the Papelera. Idempotent; refused while purging. */
export const restoreHomeCloudFile = (accessToken: string, contentId: string) =>
  requestJson<{ file: { id: string } }>(`/api/homecloud/content/${contentId}/restore`, { method: 'POST', accessToken });

/**
 * PURGE one File permanently and irreversibly.
 *
 * The only request shape this module can produce carries `confirm: true`; the
 * backend refuses anything else before any state changes. The answer carries
 * ids and the durable operation status only — physical removal is
 * asynchronous server work and is never claimed here.
 */
export const purgeHomeCloudFile = (accessToken: string, contentId: string) =>
  requestJson<{ purge: HomeCloudPurgeResponse }>(`/api/homecloud/content/${contentId}/purge`, {
    method: 'POST',
    accessToken,
    body: { confirm: true },
  });

export type { HomeCloudTrashedFile, HomeCloudFilesTrashPage, HomeCloudPurgeResponse };
