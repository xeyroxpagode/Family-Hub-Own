import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { requestJson } from '../api';
import { runtimeTrace } from '../runtimeTrace';
import { InvalidDownloadedFileError, validateDownloadedFile } from './homecloudDownloadPolicy';
import type { HomeCloudFile } from './homecloudTypes';

type ContentAccessResponse = { signedUrl: string; contentId: string; variant: 'original' };
export type HomeCloudDownloadStage = 'access' | 'destination' | 'transfer' | 'validation' | 'share';

export interface HomeCloudLocalFile {
  readonly uri: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly mimeType: string;
}

export class HomeCloudDownloadError extends Error {
  constructor(
    readonly stage: HomeCloudDownloadStage,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HomeCloudDownloadError';
  }
}

function safeFileName(value: string): string {
  const name = value.replace(/[\\/:*?"<>|]/g, '_').trim();
  return name || 'homecloud-download';
}

function failure(stage: HomeCloudDownloadStage, error: unknown): HomeCloudDownloadError {
  if (error instanceof HomeCloudDownloadError) return error;
  if (error instanceof InvalidDownloadedFileError) {
    return new HomeCloudDownloadError('validation', error.code, error.message);
  }
  const code = stage === 'access'
    ? 'download_access_failed'
    : stage === 'share'
      ? 'download_share_failed'
      : `download_${stage}_failed`;
  const message = stage === 'share'
    ? 'No pudimos compartir este archivo.'
    : 'No pudimos descargar este archivo.';
  return new HomeCloudDownloadError(stage, code, message);
}

/** Native foreground file-to-file download; the original never enters JS memory. */
export async function downloadHomeCloudOriginal(accessToken: string, content: HomeCloudFile): Promise<HomeCloudLocalFile> {
  let stage: HomeCloudDownloadStage = 'access';
  let task: ReturnType<typeof File.createDownloadTask> | null = null;
  try {
    const access = await requestJson<ContentAccessResponse>(
      `/api/homecloud/content/${content.id}/access?variant=original`,
      { accessToken },
    );
    if (!access || typeof access.signedUrl !== 'string' || !access.signedUrl) {
      throw new HomeCloudDownloadError('access', 'download_access_invalid', 'No pudimos descargar este archivo.');
    }
    runtimeTrace('download_access_ok', { contentIdPresent: Boolean(access.contentId) });

    stage = 'destination';
    const directory = new Directory(Paths.document, 'HomeCloud');
    directory.create({ idempotent: true, intermediates: true });
    const destination = new File(directory, safeFileName(content.displayName));

    stage = 'transfer';
    // T1 server authority: the signed URL is used VERBATIM (scheme, host,
    // port, path and query byte-for-byte from the server). The client never
    // rewrites it. Reachability is an environment contract: backend
    // SUPABASE_URL must be device-reachable (Cloudflare/Supabase in the
    // current deployment already is — S0 device QA passed on it).
    task = File.createDownloadTask(
      access.signedUrl,
      destination,
      { sessionType: 'foreground' },
    );
    runtimeTrace('download_start');
    const localFile = await task.downloadAsync();
    if (!localFile) {
      throw new HomeCloudDownloadError('transfer', 'download_paused', 'No pudimos descargar este archivo.');
    }

    stage = 'validation';
    const validated = validateDownloadedFile(localFile);
    runtimeTrace('download_complete', { sizeBytes: validated.sizeBytes });
    return { ...validated, mimeType: content.mimeType };
  } catch (error) {
    const safeError = failure(stage, error);
    runtimeTrace('download_failed', { stage: safeError.stage, code: safeError.code });
    throw safeError;
  } finally {
    if (task) {
      try { task.release(); } catch { /* Native ownership is best-effort after terminal completion. */ }
    }
  }
}

export async function shareHomeCloudDownloadedFile(file: HomeCloudLocalFile): Promise<void> {
  try {
    if (!await Sharing.isAvailableAsync()) {
      throw new HomeCloudDownloadError('share', 'download_share_unavailable', 'No pudimos compartir este archivo.');
    }
    await Sharing.shareAsync(file.uri, {
      dialogTitle: `Compartir ${file.name}`,
      mimeType: file.mimeType,
    });
  } catch (error) {
    const safeError = failure('share', error);
    runtimeTrace('download_failed', { stage: safeError.stage, code: safeError.code });
    throw safeError;
  }
}
