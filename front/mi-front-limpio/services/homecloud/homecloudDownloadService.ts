import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { requestJson } from '../api';
import { runtimeTrace } from '../runtimeTrace';
import { InvalidDownloadedFileError, validateDownloadedFile } from './homecloudDownloadPolicy';
import type { HomeCloudFile } from './homecloudTypes';

type ContentAccessResponse = { signedUrl: string; contentId: string; variant: 'original' };

/**
 * Where a transfer stopped. `export` and `share` are SEPARATE stages because
 * they are separate intents: a failed hand-off to the save UI is not a failed
 * hand-off to the share UI, and the member is told which one did not happen.
 */
export type HomeCloudDownloadStage = 'access' | 'destination' | 'transfer' | 'validation' | 'export' | 'share';

/**
 * AN INTERNAL STAGING COPY — never the member's saved copy.
 *
 * It exists so a native file-to-file transfer has a local path to write and hand
 * to the system UI. It lives in the app's CACHE area, is never presented to the
 * member as a destination, and is not evidence that anything was saved: whether a
 * copy exists outside HomePlus is decided by the operating system after the
 * member acts on its own UI, which this app cannot observe.
 *
 * The bytes are the ORIGINAL bytes: the signed original is fetched natively and
 * file-to-file, with no transcoding and no recompression.
 */
export interface HomeCloudStagedCopy {
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

const FAILURE_MESSAGE: Record<HomeCloudDownloadStage, string> = {
  access: 'No pudimos preparar este archivo.',
  destination: 'No pudimos preparar este archivo.',
  transfer: 'No pudimos preparar este archivo.',
  validation: 'No pudimos preparar este archivo.',
  export: 'No pudimos abrir el menú para guardar el archivo.',
  share: 'No pudimos compartir este archivo.',
};

function failure(stage: HomeCloudDownloadStage, error: unknown): HomeCloudDownloadError {
  if (error instanceof HomeCloudDownloadError) return error;
  if (error instanceof InvalidDownloadedFileError) {
    return new HomeCloudDownloadError('validation', error.code, FAILURE_MESSAGE.validation);
  }
  const code = stage === 'access'
    ? 'download_access_failed'
    : stage === 'export'
      ? 'download_export_failed'
      : stage === 'share'
        ? 'download_share_failed'
        : `download_${stage}_failed`;
  return new HomeCloudDownloadError(stage, code, FAILURE_MESSAGE[stage]);
}

/**
 * Stage the ORIGINAL bytes locally, validated, for a native hand-off.
 *
 * This is a TRANSFER, not a destination: the returned copy is internal staging
 * and the caller must hand it to the operating system. Nothing here proves that
 * the member saved anything, and nothing here may be reported as a save.
 *
 * The staging area is the CACHE directory precisely because it is temporary:
 * app-private Documents would look like a saved library the member cannot find
 * from the Files app, which is exactly the false promise this closes.
 */
export async function stageHomeCloudOriginal(accessToken: string, content: HomeCloudFile): Promise<HomeCloudStagedCopy> {
  let stage: HomeCloudDownloadStage = 'access';
  let task: ReturnType<typeof File.createDownloadTask> | null = null;
  try {
    const access = await requestJson<ContentAccessResponse>(
      `/api/homecloud/content/${content.id}/access?variant=original`,
      { accessToken },
    );
    if (!access || typeof access.signedUrl !== 'string' || !access.signedUrl) {
      throw new HomeCloudDownloadError('access', 'download_access_invalid', FAILURE_MESSAGE.access);
    }
    runtimeTrace('download_access_ok', { contentIdPresent: Boolean(access.contentId) });

    stage = 'destination';
    const directory = new Directory(Paths.cache, 'HomeCloud');
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
      throw new HomeCloudDownloadError('transfer', 'download_paused', FAILURE_MESSAGE.transfer);
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

/**
 * GUARDAR UNA COPIA — hand the staged original to the NATIVE system export UI.
 *
 * This is the installed primitive that actually reaches **Guardar en Archivos**
 * on iOS: the system share/export sheet, which is where the operating system
 * offers "Save to Files" together with every other destination the device knows.
 * There is no installed primitive that opens a destination chooser with a
 * filename on iOS, and faking one would produce a picker that cannot save.
 *
 * WHAT IT DOES NOT DO, ON PURPOSE. It does not report a destination, and it does
 * not report a result. `Sharing.shareAsync` resolves when the sheet is dismissed
 * and cannot say whether the member chose "Guardar en Archivos", chose Mail,
 * chose WhatsApp or simply backed out — so the only honest thing to say is that
 * the system UI was opened and the destination is the member's to pick.
 * Cancellation is therefore not an error either: it is indistinguishable from
 * completion, and neither produces a success claim.
 */
export async function exportHomeCloudStagedCopy(copy: HomeCloudStagedCopy): Promise<void> {
  try {
    if (!await Sharing.isAvailableAsync()) {
      throw new HomeCloudDownloadError('export', 'download_export_unavailable', FAILURE_MESSAGE.export);
    }
    await Sharing.shareAsync(copy.uri, {
      dialogTitle: `Guardar una copia de ${copy.name}`,
      mimeType: copy.mimeType,
    });
    runtimeTrace('download_export_handoff_ok');
  } catch (error) {
    const safeError = failure('export', error);
    runtimeTrace('download_failed', { stage: safeError.stage, code: safeError.code });
    throw safeError;
  }
}

/**
 * COMPARTIR — send/export the staged original through another app.
 *
 * A distinct intent from Guardar una copia: Mail, AirDrop, WhatsApp and the rest
 * are destinations this app does not choose. The native primitive happens to be
 * the same system sheet, and that is fine — the two intents differ in what the
 * member is being asked to do and in what they are told afterwards, not in which
 * platform API opens.
 */
export async function shareHomeCloudDownloadedFile(copy: HomeCloudStagedCopy): Promise<void> {
  try {
    if (!await Sharing.isAvailableAsync()) {
      throw new HomeCloudDownloadError('share', 'download_share_unavailable', FAILURE_MESSAGE.share);
    }
    await Sharing.shareAsync(copy.uri, {
      dialogTitle: `Compartir ${copy.name}`,
      mimeType: copy.mimeType,
    });
    runtimeTrace('download_share_handoff_ok');
  } catch (error) {
    const safeError = failure('share', error);
    runtimeTrace('download_failed', { stage: safeError.stage, code: safeError.code });
    throw safeError;
  }
}
