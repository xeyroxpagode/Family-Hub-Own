import { useEffect, useRef, useState } from 'react';

import { getMemoryPreviewUrl } from '../../services/homecloud/homecloudMemoryPreview';

export type MemoryPreviewLoadState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'loading' }
  | { readonly phase: 'ready'; readonly url: string }
  | { readonly phase: 'unavailable' }
  | { readonly phase: 'error' };

/**
 * HomeCloud STAGE 4B.2 — ephemeral preview URL hook for one image Memory.
 *
 * - Fetches ONLY when `enabled` (caller passes memory.hasPreview). A Memory
 *   without preview never triggers a network request.
 * - One fetch per contentId mount: StrictMode double-effects are deduped by
 *   the in-memory URL cache in `homecloudMemoryPreview` (the second call
 *   resolves from cache). Abort on unmount / contentId change.
 * - The signed URL is never stored outside the ephemeral cache: it lives in
 *   component state for the tile Image and dies with it.
 */
export function useMemoryPreviewUrl(
  accessToken: string | null,
  contentId: string,
  enabled: boolean,
): MemoryPreviewLoadState {
  const [state, setState] = useState<MemoryPreviewLoadState>({ phase: 'idle' });
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled || !accessToken) {
      setState({ phase: 'unavailable' });
      return;
    }
    const current = ++requestId.current;
    const controller = new AbortController();
    setState({ phase: 'loading' });
    void getMemoryPreviewUrl(accessToken, contentId, { signal: controller.signal })
      .then((result) => {
        if (current !== requestId.current || controller.signal.aborted) return;
        if (result.status === 'ready') setState({ phase: 'ready', url: result.url });
        else setState({ phase: 'unavailable' });
      })
      .catch((error: unknown) => {
        if (current !== requestId.current || controller.signal.aborted) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({ phase: 'error' });
      });
    return () => {
      controller.abort();
    };
  }, [accessToken, contentId, enabled]);

  return state;
}
