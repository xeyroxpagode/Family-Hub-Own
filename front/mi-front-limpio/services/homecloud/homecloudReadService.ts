import { requestJson } from '../api';
import { plannerCache } from '../planner/plannerCache';
import { plannerKeys } from '../planner/plannerKeys';
import type {
  HomeCloudContent,
  HomeCloudFolder,
  HomeCloudAlbum,
  HomeCloudAlbumItem,
  HomeCloudAlbumMembership,
  HomeCloudAccessVariant,
  HomeCloudAccessResult,
  HomeCloudMemoriesQuery,
  HomeCloudMemoriesPage,
} from './homecloudTypes';

/**
 * HomeCloud HC-1F — Frontend Read Services.
 *
 * Authority: HC-1F Product Truth.
 *
 * Minimal reusable frontend services/adapters for:
 * - get content by ID
 * - list folders
 * - get folder by ID
 * - list albums
 * - get album by ID
 * - album membership primitive
 * - album organization mutations (MO-A1 contract, no UI)
 * - list Memories (STAGE 4B.1 read model, incl. the Album presentation mode)
 * - private content access (contentId + variant)
 *
 * Uses existing plannerCache/plannerKeys infrastructure.
 * Does NOT create screens or parallel cache framework.
 */

export interface HomeCloudScope {
  readonly householdId: string;
}

export interface HomeCloudCapabilityScope {
  readonly accountId: string;
  readonly householdId: string;
  readonly membershipId: string;
}

/** Cache key factory for HomeCloud (mirrors plannerKeys patterns). */
const homecloudKeys = {
  content: {
    detail: (scope: HomeCloudScope, contentId: string) =>
      ['homecloud', 'content', scope.householdId, 'detail', contentId] as const,
  },
  folders: {
    all: (scope: HomeCloudScope) =>
      ['homecloud', 'folders', scope.householdId, 'all'] as const,
    detail: (scope: HomeCloudScope, folderId: string) =>
      ['homecloud', 'folders', scope.householdId, 'detail', folderId] as const,
  },
  albums: {
    all: (scope: HomeCloudScope) =>
      ['homecloud', 'albums', scope.householdId, 'all'] as const,
    detail: (scope: HomeCloudScope, albumId: string) =>
      ['homecloud', 'albums', scope.householdId, 'detail', albumId] as const,
    items: (scope: HomeCloudScope, albumId: string) =>
      ['homecloud', 'albums', scope.householdId, 'items', albumId] as const,
  },
} as const;

/** TTL configuration (ms) — aligned with planner stale config. */
const STALE_CONFIG = {
  content: 30_000,
  folders: 30_000,
  albums: 30_000,
  items: 30_000,
} as const;

// --- Content ---

/** Fetch content by ID (protected, household-scoped, active-only). */
export async function fetchHomeCloudContent(
  accessToken: string,
  contentId: string,
): Promise<HomeCloudContent> {
  const resp = await requestJson<{ content: HomeCloudContent }>(
    `/api/homecloud/content/${contentId}`,
    { accessToken, operationKind: 'READ_ONLY' },
  );
  return resp.content;
}

/** Cached content fetch (stale-while-revalidate). */
export async function fetchHomeCloudContentCached(
  accessToken: string,
  scope: HomeCloudScope,
  contentId: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudContent> {
  const key = homecloudKeys.content.detail(scope, contentId);
  const contextToken = plannerCache.captureContextToken();

  const cached = plannerCache.get<HomeCloudContent>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  plannerCache.setPending(key, contextToken);

  try {
    const resp = await requestJson<{ content: HomeCloudContent }>(
      `/api/homecloud/content/${contentId}`,
      { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
    );
    plannerCache.setForContext(key, resp.content, contextToken);
    return resp.content;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    plannerCache.setError(key, error instanceof Error ? error : new Error(String(error)), contextToken);
    throw error;
  }
}

// --- Folders ---

/** Fetch all folders for household (protected). */
export async function fetchHomeCloudFolders(
  accessToken: string,
): Promise<HomeCloudFolder[]> {
  const resp = await requestJson<{ folders: HomeCloudFolder[] }>(
    '/api/homecloud/folders',
    { accessToken, operationKind: 'READ_ONLY' },
  );
  return resp.folders;
}

/** Cached folders list fetch. */
export async function fetchHomeCloudFoldersCached(
  accessToken: string,
  scope: HomeCloudScope,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudFolder[]> {
  const key = homecloudKeys.folders.all(scope);
  const contextToken = plannerCache.captureContextToken();

  const cached = plannerCache.get<HomeCloudFolder[]>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  plannerCache.setPending(key, contextToken);

  try {
    const resp = await requestJson<{ folders: HomeCloudFolder[] }>(
      '/api/homecloud/folders',
      { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
    );
    plannerCache.setForContext(key, resp.folders, contextToken);
    return resp.folders;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    plannerCache.setError(key, error instanceof Error ? error : new Error(String(error)), contextToken);
    throw error;
  }
}

/** Fetch folder by ID (protected, household-scoped). */
export async function fetchHomeCloudFolderById(
  accessToken: string,
  folderId: string,
): Promise<HomeCloudFolder> {
  const resp = await requestJson<{ folder: HomeCloudFolder }>(
    `/api/homecloud/folders/${folderId}`,
    { accessToken, operationKind: 'READ_ONLY' },
  );
  return resp.folder;
}

/** Cached folder detail fetch. */
export async function fetchHomeCloudFolderByIdCached(
  accessToken: string,
  scope: HomeCloudScope,
  folderId: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudFolder> {
  const key = homecloudKeys.folders.detail(scope, folderId);
  const contextToken = plannerCache.captureContextToken();

  const cached = plannerCache.get<HomeCloudFolder>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  plannerCache.setPending(key, contextToken);

  try {
    const resp = await requestJson<{ folder: HomeCloudFolder }>(
      `/api/homecloud/folders/${folderId}`,
      { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
    );
    plannerCache.setForContext(key, resp.folder, contextToken);
    return resp.folder;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    plannerCache.setError(key, error instanceof Error ? error : new Error(String(error)), contextToken);
    throw error;
  }
}

// --- Albums ---

/** Fetch all active albums for household (protected). */
export async function fetchHomeCloudAlbums(
  accessToken: string,
): Promise<HomeCloudAlbum[]> {
  const resp = await requestJson<{ albums: HomeCloudAlbum[] }>(
    '/api/homecloud/albums',
    { accessToken, operationKind: 'READ_ONLY' },
  );
  return resp.albums;
}

/** Cached albums list fetch. */
export async function fetchHomeCloudAlbumsCached(
  accessToken: string,
  scope: HomeCloudScope,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudAlbum[]> {
  const key = homecloudKeys.albums.all(scope);
  const contextToken = plannerCache.captureContextToken();

  const cached = plannerCache.get<HomeCloudAlbum[]>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  plannerCache.setPending(key, contextToken);

  try {
    const resp = await requestJson<{ albums: HomeCloudAlbum[] }>(
      '/api/homecloud/albums',
      { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
    );
    plannerCache.setForContext(key, resp.albums, contextToken);
    return resp.albums;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    plannerCache.setError(key, error instanceof Error ? error : new Error(String(error)), contextToken);
    throw error;
  }
}

/** Fetch active album by ID (protected, household-scoped). */
export async function fetchHomeCloudAlbumById(
  accessToken: string,
  albumId: string,
): Promise<HomeCloudAlbum> {
  const resp = await requestJson<{ album: HomeCloudAlbum }>(
    `/api/homecloud/albums/${albumId}`,
    { accessToken, operationKind: 'READ_ONLY' },
  );
  return resp.album;
}

/** Cached album detail fetch. */
export async function fetchHomeCloudAlbumByIdCached(
  accessToken: string,
  scope: HomeCloudScope,
  albumId: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudAlbum> {
  const key = homecloudKeys.albums.detail(scope, albumId);
  const contextToken = plannerCache.captureContextToken();

  const cached = plannerCache.get<HomeCloudAlbum>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  plannerCache.setPending(key, contextToken);

  try {
    const resp = await requestJson<{ album: HomeCloudAlbum }>(
      `/api/homecloud/albums/${albumId}`,
      { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
    );
    plannerCache.setForContext(key, resp.album, contextToken);
    return resp.album;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    plannerCache.setError(key, error instanceof Error ? error : new Error(String(error)), contextToken);
    throw error;
  }
}

// --- Album Items Primitive ---

/** Fetch album items with active content (protected, household-scoped). */
export async function fetchHomeCloudAlbumItems(
  accessToken: string,
  albumId: string,
): Promise<HomeCloudAlbumItem[]> {
  const resp = await requestJson<{ items: HomeCloudAlbumItem[] }>(
    `/api/homecloud/albums/${albumId}/items`,
    { accessToken, operationKind: 'READ_ONLY' },
  );
  return resp.items;
}

/** Cached album items fetch. */
export async function fetchHomeCloudAlbumItemsCached(
  accessToken: string,
  scope: HomeCloudScope,
  albumId: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudAlbumItem[]> {
  const key = homecloudKeys.albums.items(scope, albumId);
  const contextToken = plannerCache.captureContextToken();

  const cached = plannerCache.get<HomeCloudAlbumItem[]>(key);
  if (cached && plannerCache.isFresh(key)) {
    return cached;
  }

  plannerCache.setPending(key, contextToken);

  try {
    const resp = await requestJson<{ items: HomeCloudAlbumItem[] }>(
      `/api/homecloud/albums/${albumId}/items`,
      { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
    );
    plannerCache.setForContext(key, resp.items, contextToken);
    return resp.items;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    plannerCache.setError(key, error instanceof Error ? error : new Error(String(error)), contextToken);
    throw error;
  }
}

// --- Album organization mutations (MO-A1 client contract) ---

/**
 * Album organization mutations (MO-A1).
 *
 * Contract only: NO screen, route, tile or selection UI is built here.
 *
 * Semantics the backend guarantees and this layer must not re-derive:
 *   - create / rename / delete require `homecloud.organize`;
 *   - deleteAlbum is a HARD delete of the organization only. It removes the
 *     Album and its memberships and never deletes, trashes or alters a Memory;
 *   - addMemoryToAlbum inserts one membership row and never creates a second
 *     Memory; repeating it is idempotent success;
 *   - removeMemoryFromAlbum removes one membership row only, and the Memory
 *     survives.
 *
 * Household identity is never sent: the server derives it from the
 * authenticated context.
 *
 * After a successful mutation the household read state is invalidated through
 * the EXISTING `invalidateHomeCloudHousehold`. This is deliberately not a new
 * cache architecture, not an event bus and not optimistic UI: the owner
 * refetches and presents the result.
 */

async function invalidateAlbumReads(scope?: HomeCloudScope): Promise<void> {
  if (scope) invalidateHomeCloudHousehold(scope);
}

/** Create an active Album in the authenticated household. */
export async function createAlbum(
  accessToken: string,
  name: string,
  scope?: HomeCloudScope,
): Promise<HomeCloudAlbum> {
  const resp = await requestJson<{ album: HomeCloudAlbum }>(
    '/api/homecloud/albums',
    { method: 'POST', accessToken, body: { name } },
  );
  await invalidateAlbumReads(scope);
  return resp.album;
}

/** Rename an Album of the authenticated household. */
export async function renameAlbum(
  accessToken: string,
  albumId: string,
  name: string,
  scope?: HomeCloudScope,
): Promise<HomeCloudAlbum> {
  const resp = await requestJson<{ album: HomeCloudAlbum }>(
    `/api/homecloud/albums/${albumId}`,
    { method: 'PATCH', accessToken, body: { name } },
  );
  await invalidateAlbumReads(scope);
  return resp.album;
}

/** Delete an Album (the organization only). Answers 204. */
export async function deleteAlbum(
  accessToken: string,
  albumId: string,
  scope?: HomeCloudScope,
): Promise<void> {
  await requestJson<void>(`/api/homecloud/albums/${albumId}`, { method: 'DELETE', accessToken });
  await invalidateAlbumReads(scope);
}

/** Add an EXISTING Memory to an Album. Idempotent for an existing membership. */
export async function addMemoryToAlbum(
  accessToken: string,
  albumId: string,
  contentId: string,
  scope?: HomeCloudScope,
): Promise<HomeCloudAlbumMembership> {
  const resp = await requestJson<{ membership: HomeCloudAlbumMembership }>(
    `/api/homecloud/albums/${albumId}/items`,
    { method: 'POST', accessToken, body: { contentId } },
  );
  await invalidateAlbumReads(scope);
  return resp.membership;
}

/** Remove one Memory from one Album. The Memory survives. Answers 204. */
export async function removeMemoryFromAlbum(
  accessToken: string,
  albumId: string,
  contentId: string,
  scope?: HomeCloudScope,
): Promise<void> {
  await requestJson<void>(
    `/api/homecloud/albums/${albumId}/items/${contentId}`,
    { method: 'DELETE', accessToken },
  );
  await invalidateAlbumReads(scope);
}

// --- Memories read model (STAGE 4B.1) ---

/**
 * Build the Memories query string. Only defined filters are sent, so the
 * server keeps its own defaults for the rest.
 */
function memoriesQueryString(query?: HomeCloudMemoriesQuery): string {
  const params = new URLSearchParams();
  if (query?.limit !== undefined) params.set('limit', String(query.limit));
  if (query?.offset !== undefined) params.set('offset', String(query.offset));
  if (query?.year !== undefined) params.set('year', String(query.year));
  if (query?.albumId !== undefined) params.set('albumId', query.albumId);
  if (query?.query !== undefined) params.set('query', query.query);
  if (query?.kind !== undefined) params.set('kind', query.kind);
  if (query?.order !== undefined) params.set('order', query.order);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

/**
 * List active Memories for the current household (protected).
 *
 * The single read primitive a future Memories Root / Timeline needs: canonical
 * server order, stable limit/offset pagination, derived kind and album
 * memberships included in the response. No screen is built here.
 *
 * Presentation order is explicit: the default `timeline` mode is newest ->
 * oldest, and `{ albumId, order: 'album' }` returns the Album presentation
 * order oldest -> newest from the SAME read model. Both are total orders, so
 * pagination never duplicates or skips.
 *
 * Preview access is NOT included: a card reads `hasPreview` and, only when
 * true, asks fetchHomeCloudContentAccess(contentId, 'preview') for a bounded
 * signed URL. A missing preview answers with the typed 'preview_unavailable'
 * result instead of an error.
 */
export async function listMemories(
  accessToken: string,
  query?: HomeCloudMemoriesQuery,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudMemoriesPage> {
  return requestJson<HomeCloudMemoriesPage>(
    `/api/homecloud/memories${memoriesQueryString(query)}`,
    { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
  );
}

// --- Private Binary Access ---

/**
 * Request private content access (original or preview).
 * Frontend ONLY supplies contentId + variant.
 * NEVER supplies bucket or path.
 * Does NOT persist signed access durably.
 * Does NOT include access URLs in normal read caches.
 */
export async function fetchHomeCloudContentAccess(
  accessToken: string,
  contentId: string,
  variant: HomeCloudAccessVariant,
  options?: { ttl?: number; signal?: AbortSignal; timeoutMs?: number },
): Promise<HomeCloudAccessResult> {
  const params = new URLSearchParams({ variant });
  if (options?.ttl) params.set('ttl', String(options.ttl));

  const resp = await requestJson<HomeCloudAccessResult>(
    `/api/homecloud/content/${contentId}/access?${params.toString()}`,
    { accessToken, signal: options?.signal, timeoutMs: options?.timeoutMs, operationKind: 'READ_ONLY' },
  );
  return resp;
}

// --- Cache invalidation helpers ---

/** Invalidate all HomeCloud keys for a household (e.g., on household switch). */
export function invalidateHomeCloudHousehold(scope: HomeCloudScope): number {
  let count = 0;
  for (const entry of plannerCache.dump()) {
    if (entry.key[0] === 'homecloud' && entry.key[2] === scope.householdId) {
      if (plannerCache.invalidate(entry.key)) count += 1;
    }
  }
  return count;
}