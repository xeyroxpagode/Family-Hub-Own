export type HomeCloudScannerSavedEvent = { contentId: string; folderId: string | null };
const listeners = new Set<(event: HomeCloudScannerSavedEvent) => void>();

export function publishHomeCloudScannerSaved(event: HomeCloudScannerSavedEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function subscribeHomeCloudScannerSaved(listener: (event: HomeCloudScannerSavedEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
