/**
 * HomeCloud ST-5 — Memories share adapter (scoped to Memories).
 *
 * Reuses the SAME access authority as the Viewer (`fetchHomeCloudContentAccess`
 * via `homecloudMemoryOriginal`) but downloads to a BOUNDED share-temp
 * directory under the cache — never to Documents, never into the user's
 * Files. `homecloudDownloadService` stays the Files contract untouched.
 *
 * SHARE TEMP lifecycle (strictly scoped):
 *  - success: the share temp file is deleted after the OS sheet resolves.
 *  - failure / unavailable: deleted before the honest error propagates.
 *  - background of the app: the whole SHARE TEMP directory is swept.
 *  - restart recovery: sweeping again on module init removes leftovers.
 *
 * Never touched: UploadJob staging, HomeCloud originals cache, user Files,
 * the shared recovery coordinator.
 */

import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppState } from 'react-native';
import { runtimeTrace } from '../runtimeTrace';
import { fetchHomeCloudContentAccess } from './homecloudReadService';
import type { HomeCloudMemoryListItem } from './homecloudTypes';

const SHARE_TEMP_DIR_NAME = 'HomeCloudShareTemp';

function shareTempDirectory(): Directory {
  return new Directory(Paths.cache, SHARE_TEMP_DIR_NAME);
}

function safeName(memory: HomeCloudMemoryListItem): string {
  const base = (memory.displayName ?? memory.id).replace(/[\\/:*?"<>|]/g, '_').trim();
  const extension = memory.extension ? `.${memory.extension}` : '';
  return `${base}${extension}` || `memory-${memory.id}`;
}

/** Delete every SHARE TEMP file. Never touches Documents/originals/Files. */
export function sweepShareTempFiles(): void {
  try {
    const directory = shareTempDirectory();
    if (directory.exists) directory.delete();
  } catch {
    // Best-effort: a missing cache dir is not an error worth surfacing.
  }
}

/** Call once at app scope so a crash leaves no stale share temp files. */
export function installShareTempLifecycle(): () => void {
  sweepShareTempFiles();
  const subscription = AppState.addEventListener('change', (next) => {
    if (next !== 'active') sweepShareTempFiles();
  });
  return () => subscription.remove();
}

/**
 * Authorized original → temporary local file → OS-native single share.
 * The signed URL is never exposed to the share target; the temp file is
 * always cleaned afterwards, on success or failure.
 */
export async function shareMemoryBinary(
  accessToken: string,
  memory: HomeCloudMemoryListItem,
): Promise<void> {
  const access = await fetchHomeCloudContentAccess(accessToken, memory.id, 'original');
  if (!('signedUrl' in access) || typeof access.signedUrl !== 'string' || access.signedUrl.length === 0) {
    throw new Error('share_original_unavailable');
  }
  const directory = shareTempDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, safeName(memory));
  const task = File.createDownloadTask(access.signedUrl, destination, { sessionType: 'foreground' });
  try {
    const local = await task.downloadAsync();
    if (!local) throw new Error('share_download_paused');
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('share_unavailable');
    }
    await Sharing.shareAsync(local.uri, {
      dialogTitle: 'Compartir',
      mimeType: memory.mimeType ?? undefined,
    });
  } finally {
    try { task.release(); } catch { /* terminal ownership best-effort */ }
    try { if (destination.exists) destination.delete(); } catch { /* leak-free by retry on sweep */ }
    runtimeTrace('share_temp_cleanup', { hadDestination: true });
  }
}
