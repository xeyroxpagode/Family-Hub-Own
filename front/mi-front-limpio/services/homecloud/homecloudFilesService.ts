import { OPERATION_KINDS, requestJson } from '../api';
import type { HomeCloudFile, HomeCloudFileFavorite, HomeCloudFolder } from './homecloudTypes';

export type FileSort = 'recent' | 'name';
export type FilesBrowserResponse = { browser: { folders: HomeCloudFolder[]; files: HomeCloudFile[]; nextOffset: number | null } };

/**
 * W1-B — the browser read already paginates; the frontend now says so.
 *
 * `GET /api/homecloud/files` accepts `limit` (clamped server-side to 1..100,
 * default 100) and `offset` (>= 0), and answers `nextOffset` =
 * `offset + limit` while a full page came back, else `null` (the last page).
 * Those are the EXISTING backend parameters: this adds no cursor, no protocol
 * and no server change, it only stops the client from silently truncating at
 * the first 100 items.
 */
export const FILES_BROWSER_MAX_LIMIT = 100;

export const fetchFilesBrowser = (accessToken: string, options: { folderId?: string | null; query?: string; sort?: FileSort; limit?: number; offset?: number; favoritesOnly?: boolean } = {}) => {
  const params = new URLSearchParams();
  if (options.folderId) params.set('folderId', options.folderId);
  if (options.query?.trim()) params.set('query', options.query.trim());
  params.set('sort', options.sort ?? 'recent');
  // Files Core: `favoritesOnly` is a FILTER MODE, and it is filtered by the
  // SERVER before the page is taken — the client never removes rows from a page
  // it already received, which would corrupt pagination, has-more, search and
  // folder scope at once. It is a mode like `sort`, so it travels with every
  // read of the current context instead of being applied once at the call site.
  if (options.favoritesOnly) params.set('favoritesOnly', 'true');
  // Sent only when the caller actually pages. The household is NEVER supplied:
  // the server resolves it from the token.
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  return requestJson<FilesBrowserResponse>(`/api/homecloud/files?${params.toString()}`, { accessToken });
};

/**
 * Files Core — the ONE canonical personal-Favorite mutation.
 *
 * It states the INTENT and nothing else: the household and the person are
 * resolved server-side, so a client cannot favorite on someone else's behalf.
 * It is idempotent in both directions, so a retried tap converges on the same
 * state instead of toggling back.
 */
export const setHomeCloudFileFavorite = (accessToken: string, contentId: string, isFavorite: boolean) => requestJson<{ favorite: HomeCloudFileFavorite }>(`/api/homecloud/content/${contentId}/favorite`, { method: 'PATCH', accessToken, body: { isFavorite } });

/**
 * Stage 2 (Phase 1, nested hierarchy) - create a folder, optionally inside one.
 *
 * `parentFolderId` is the CURRENT folder when the member is inside one and `null`
 * at the root, which is the whole "Nueva carpeta inherits the open folder" rule
 * expressed as data. The server validates the parent: an unknown or
 * cross-household parent is refused there, so a stale client gains nothing by
 * guessing an id.
 *
 * The household and the creator are NEVER sent. They are resolved server-side, so
 * a client cannot create a folder in a household it is not part of nor take
 * credit for one it did not create.
 */
export const createHomeCloudFolder = (accessToken: string, name: string, parentFolderId: string | null = null) => requestJson<{ folder: HomeCloudFolder }>('/api/homecloud/folders', { method: 'POST', accessToken, body: { name, parentFolderId }, operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT });
export const renameHomeCloudFolder = (accessToken: string, folderId: string, name: string) => requestJson<{ folder: HomeCloudFolder }>(`/api/homecloud/folders/${folderId}`, { method: 'PATCH', accessToken, body: { name } });
/**
 * Stage 2 (Phase 1) - reparent a folder. `null` moves it to the root.
 *
 * A dedicated verb, not an extra field on the rename PATCH: "where does this
 * folder live" is not a display name, and folding both into one body would let a
 * rename accidentally relocate a whole subtree.
 */
export const moveHomeCloudFolder = (accessToken: string, folderId: string, parentFolderId: string | null) => requestJson<{ folder: HomeCloudFolder }>(`/api/homecloud/folders/${folderId}/move`, { method: 'POST', accessToken, body: { parentFolderId } });
export const deleteHomeCloudFolder = (accessToken: string, folderId: string) => requestJson<void>(`/api/homecloud/folders/${folderId}`, { method: 'DELETE', accessToken });
export const updateHomeCloudFile = (accessToken: string, contentId: string, changes: Partial<{ displayName: string; folderId: string | null; documentDate: string | null; note: string | null }>) => requestJson<{ file: HomeCloudFile }>(`/api/homecloud/content/${contentId}/file`, { method: 'PATCH', accessToken, body: changes });
