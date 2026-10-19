export type NativeUploadProgress = { bytesSent: number; totalBytes: number };

function runtimeStorageOrigin(): string | null {
  const raw = process.env.EXPO_PUBLIC_HOMECLOUD_STORAGE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
  if (!raw) return null;
  try { return new URL(raw).origin; } catch { return null; }
}

function runtimeSignedUrl(signedUrl: string): string {
  const runtimeOrigin = runtimeStorageOrigin();
  if (!runtimeOrigin) return signedUrl;
  try {
    const parsed = new URL(signedUrl);
    if (!['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname.toLowerCase())) return signedUrl;
    const authorityStart = signedUrl.indexOf('://') + 3;
    const boundary = signedUrl.slice(authorityStart).search(/[/?#]/);
    return `${runtimeOrigin}${boundary < 0 ? '' : signedUrl.slice(authorityStart + boundary)}`;
  } catch { return signedUrl; }
}

/** Native streaming PUT with real byte counters and attempt-scoped cancellation. */
export async function uploadSignedLocalArtifact(params: {
  signedUploadUrl: string;
  localUri: string;
  mimeType: string;
  signal: AbortSignal;
  onProgress: (progress: NativeUploadProgress) => void;
}): Promise<{ status: number; ok: boolean }> {
  const FileSystem = await import('expo-file-system/legacy');
  let task: ReturnType<typeof FileSystem.createUploadTask> | null = null;
  let cancelling = false;
  const cancel = () => {
    if (!task || cancelling) return;
    cancelling = true;
    void task.cancelAsync().catch(() => undefined);
  };
  params.signal.addEventListener('abort', cancel, { once: true });
  task = FileSystem.createUploadTask(runtimeSignedUrl(params.signedUploadUrl), params.localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
    headers: { 'content-type': params.mimeType || 'application/octet-stream', 'x-upsert': 'false' },
  }, ({ totalBytesSent, totalBytesExpectedToSend }) => {
    if (!params.signal.aborted) params.onProgress({ bytesSent: totalBytesSent, totalBytes: totalBytesExpectedToSend });
  });
  if (params.signal.aborted) cancel();
  try {
    const response = await task.uploadAsync();
    if (!response) throw new Error(params.signal.aborted ? 'upload_cancelled' : 'upload_no_response');
    return { status: response.status, ok: response.status >= 200 && response.status < 300 };
  } finally {
    params.signal.removeEventListener('abort', cancel);
  }
}
