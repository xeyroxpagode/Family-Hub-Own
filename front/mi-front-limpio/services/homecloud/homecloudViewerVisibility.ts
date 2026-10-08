/**
 * HC2-C ST-4 — ONE-WAY viewer-open visibility seam.
 *
 * The Viewer session stays OWNED by `HomeCloudMemoriesView`. This module is NOT a
 * second state authority: it only mirrors the boolean "is a Viewer open" so the
 * global chrome (AppTopBar, the Archivos|Recuerdos selector, the floating
 * navbar) can actually UNMOUNT while the Viewer is open. While the Viewer is
 * closed the mirror is `false`, so every surface behaves exactly as before.
 */
let viewerOpen = false;
const listeners = new Set<() => void>();

export function publishMemoryViewerOpen(next: boolean): void {
  if (viewerOpen === next) return;
  viewerOpen = next;
  for (const listener of listeners) listener();
}

export function isMemoryViewerOpen(): boolean {
  return viewerOpen;
}

export function subscribeMemoryViewerOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
