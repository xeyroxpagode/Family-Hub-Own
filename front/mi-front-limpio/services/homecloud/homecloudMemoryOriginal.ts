import { fetchHomeCloudContentAccess } from './homecloudReadService';

type OriginalEntry = { readonly url: string; readonly expiresAt: number };
const originals = new Map<string, OriginalEntry>();
const MARGIN_MS = 30_000;

/** Viewer-only, non-persistent access to canonical binary bytes. */
export async function getMemoryOriginalUrl(
  accessToken: string,
  contentId: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<string> {
  const existing = originals.get(contentId);
  if (existing && existing.expiresAt - Date.now() > MARGIN_MS) return existing.url;
  originals.delete(contentId);
  const result = await fetchHomeCloudContentAccess(accessToken, contentId, 'original', {
    signal: options?.signal,
    timeoutMs: options?.timeoutMs ?? 15000,
  });
  if (!('signedUrl' in result) || typeof result.signedUrl !== 'string') throw new Error('original_unavailable');
  const seconds = typeof result.expiresIn === 'number' && result.expiresIn > 0 ? result.expiresIn : 300;
  originals.set(contentId, { url: result.signedUrl, expiresAt: Date.now() + seconds * 1000 });
  return result.signedUrl;
}

export function clearMemoryOriginalCache(): void { originals.clear(); }
