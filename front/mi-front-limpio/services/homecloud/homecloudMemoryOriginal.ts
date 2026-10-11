import { fetchHomeCloudContentAccess } from './homecloudReadService';

type OriginalEntry = { readonly url: string; readonly expiresAt: number };
const originals = new Map<string, OriginalEntry>();
const originalRequests = new Map<string, Promise<string>>();
const MARGIN_MS = 30_000;
const MAX_ORIGINAL_CACHE_ENTRIES = 20;

/** Viewer-only, non-persistent access to canonical binary bytes. */
export async function getMemoryOriginalUrl(
  accessToken: string,
  contentId: string,
  options?: { signal?: AbortSignal; timeoutMs?: number; forceRefresh?: boolean },
): Promise<string> {
  const existing = options?.forceRefresh ? null : originals.get(contentId);
  if (existing && existing.expiresAt - Date.now() > MARGIN_MS) return existing.url;
  originals.delete(contentId);

  const pending = options?.forceRefresh ? null : originalRequests.get(contentId);
  if (pending) return pending;

  const request = fetchHomeCloudContentAccess(accessToken, contentId, 'original', {
    signal: options?.signal,
    timeoutMs: options?.timeoutMs ?? 15000,
  }).then((result) => {
    if (!('signedUrl' in result) || typeof result.signedUrl !== 'string') throw new Error('original_unavailable');
    const seconds = typeof result.expiresIn === 'number' && result.expiresIn > 0 ? result.expiresIn : 300;
    originals.set(contentId, { url: result.signedUrl, expiresAt: Date.now() + seconds * 1000 });
    trimOriginalCache();
    return result.signedUrl;
  }).finally(() => {
    originalRequests.delete(contentId);
  });
  originalRequests.set(contentId, request);
  return request;
}

function trimOriginalCache(): void {
  while (originals.size > MAX_ORIGINAL_CACHE_ENTRIES) {
    const oldest = originals.keys().next().value;
    if (typeof oldest !== 'string') return;
    originals.delete(oldest);
  }
}

export function evictMemoryOriginalUrl(contentId: string): void {
  originals.delete(contentId);
}

export function clearMemoryOriginalCache(): void {
  originals.clear();
  originalRequests.clear();
}
