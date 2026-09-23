import { requestJson } from '../api';
import { plannerCache } from '../planner/plannerCache';
import { plannerKeys } from '../planner/plannerKeys';
import type { HomeCloudContent, HomeCloudFolder, HomeCloudAlbum, HomeCloudAlbumItem, HomeCloudAccessVariant, HomeCloudAccessResult } from './homecloudTypes';

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
 * - private content access (contentId + variant)
 *
 * Uses existing plannerCache/plannerKeys infrastructure.
 * Does NOT create screens or parallel cache framework.
 * Does NOT implement Files/Memories-specific read models.
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