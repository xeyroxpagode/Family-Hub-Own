import { fetchHomeCloudContentAccess } from './homecloudReadService';

/**
 * HomeCloud STAGE 4B.2 — Memory preview access (ephemeral, in-memory only).
 *
 * Authority: Stage 4B.1 preview contract
 * (GET /api/homecloud/content/:id/access?variant=preview, typed
 * `preview_unavailable`).
 *
 * Rules:
 * - Signed URLs are fetched ON DEMAND (only when a card has hasPreview=true)
 *   and are NEVER persisted: no AsyncStorage, no read cache, no DTO field.
 * - One ephemeral Map holds live URLs keyed by contentId, bounded by the
 *   server `expiresIn`. Expired entries are dropped, never reused.
 * - `preview_unavailable` (and any 404-shaped typed answer) resolves to
 *   `{ status: 'unavailable' }`: the card shows its fallback, the Timeline
 *   never breaks.
 * - Network/auth errors THROW so the card can show an error fallback and the
 *   screen can retry. AbortSignal is forwarded when the caller provides one.
 * - No storage internals leak: only the signed URL string reaches the UI.
 */

export type MemoryPreviewState =
  | { readonly status: 'ready'; readonly url: string }
  | { readonly status: 'unavailable' };

interface PreviewCacheEntry {
  readonly url: string;
  readonly expiresAt: number;
}

/** Safety margin (ms) before the server expiry: never serve a dying URL. */
const PREVIEW_EXPIRY_MARGIN_MS = 30_000;

/** Fallback TTL (ms) when the server omits expiresIn. */
const PREVIEW_DEFAULT_TTL_MS = 5 * 60_000;

const previewUrlCache = new Map<string, PreviewCacheEntry>();

function nowMs(): number {
  return Date.now();
}

function cachedPreview(contentId: string): string | null {
  const entry = previewUrlCache.get(contentId);
  if (!entry) return null;
  if (entry.expiresAt - nowMs() <= PREVIEW_EXPIRY_MARGIN_MS) {
    previewUrlCache.delete(contentId);
    return null;
  }
  return entry.url;
}

function isPreviewUnavailablePayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return (value as { code?: unknown }).code === 'preview_unavailable';
}

/**
 * Resolve the ephemeral signed preview URL for one Memory.
 * Returns a cached live URL without any fetch when one exists (no duplicate
 * fetch per rerender: keep the promise/result at the call site, e.g. a hook
 * keyed by contentId).
 */
export async function getMemoryPreviewUrl(
  accessToken: string,
  contentId: string,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<MemoryPreviewState> {
  const cached = cachedPreview(contentId);
  if (cached) return { status: 'ready', url: cached };

  let result;
  try {
    result = await fetchHomeCloudContentAccess(accessToken, contentId, 'preview', {
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
    });
  } catch (error) {
    if (isPreviewUnavailablePayload(error)) return { status: 'unavailable' };
    throw error;
  }

  if (isPreviewUnavailablePayload(result)) return { status: 'unavailable' };
  if (!result || typeof result !== 'object' || typeof (result as { signedUrl?: unknown }).signedUrl !== 'string') {
    return { status: 'unavailable' };
  }

  const signedUrl = (result as { signedUrl: string }).signedUrl;
  const expiresIn = (result as { expiresIn?: unknown }).expiresIn;
  const ttlMs = typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0
    ? expiresIn * 1000
    : PREVIEW_DEFAULT_TTL_MS;
  previewUrlCache.set(contentId, { url: signedUrl, expiresAt: nowMs() + ttlMs });
  return { status: 'ready', url: signedUrl };
}

/** Drop every cached preview URL (e.g. household switch, sign out). */
export function clearMemoryPreviewCache(): void {
  previewUrlCache.clear();
}
