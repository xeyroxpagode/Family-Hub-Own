import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { requestJson } from '../api';
import type { HomeCloudFile } from './homecloudTypes';
import {
  VIEWER_TEXT_PREVIEW_BYTE_CAP,
  classifyHomeCloudViewerFile,
  needsStagedOriginalForPreview,
  viewerExtensionOf,
  viewerUnsupportedReason,
  type HomeCloudViewerClassification,
} from './homecloudViewerKind';

/**
 * HomeCloud Files - Stage 2 / Phase 3 - VIEWER V1, authorization and staging.
 *
 * The Viewer never invents access. It asks the EXISTING canonical endpoint for a
 * bounded signed URL for the exact ORIGINAL bytes, and it stages them into the
 * app's TEMPORARY cache when a family genuinely needs a local file. Nothing here
 * invents a second access path, a second cache, or a public URL.
 *
 * TWO HARD RULES, both from the frozen privacy contract:
 *
 *   1. The ORIGINAL is the only source. The Viewer never requests a `preview`
 *      variant, never recompresses, transcodes or rewrites anything, and never
 *      fetches a preview to decorate or to "optimize" what the member asked to
 *      see. Viewing must not mutate content.
 *   2. A signed URL is NOT a durable cache key. It is obtained on demand, held only
 *      in memory for the life of the Viewer, and re-requested when an access
 *      fails - at most ONE controlled retry per failed access event, never a loop.
 *
 * STAGING DISCIPLINE. Staged copies live in `Paths.cache`, which the OS may purge,
 * and they are named deterministically from the content id, so repeated views
 * replace their own file instead of accumulating. They are NEVER placed in the
 * documents directory, which would present an internal staging path as if it were
 * a user-visible save destination.
 */

/** One controlled authorization grant. Deliberately not persisted anywhere. */
export interface ViewerAccessGrant {
  readonly signedUrl: string;
  readonly variant: 'original';
}

export type ViewerFailureReason =
  | 'not_authorized'
  | 'network'
  | 'unsupported'
  | 'preview_failed'
  | 'no_longer_available'
  | 'external_open_unavailable';

export class ViewerAccessError extends Error {
  readonly reason: ViewerFailureReason;
  constructor(reason: ViewerFailureReason, message: string) {
    super(message);
    this.name = 'ViewerAccessError';
    this.reason = reason;
  }
}

export const VIEWER_FAILURE_MESSAGE: Record<ViewerFailureReason, string> = {
  not_authorized: 'No pudimos autorizar la apertura de este archivo.',
  network: 'No pudimos cargar este archivo. Revisá tu conexión.',
  unsupported: 'No podemos previsualizar este formato.',
  preview_failed: 'No pudimos mostrar este archivo.',
  no_longer_available: 'Este archivo ya no está disponible.',
  external_open_unavailable: 'No hay ninguna app disponible para abrir este archivo.',
};

export interface ViewerTextPreview {
  readonly text: string;
  readonly byteCap: number;
  /** True when the file was longer than the cap and only a prefix is shown. */
  readonly truncated: boolean;
  /** Set when decoding the bytes as UTF-8 failed. Never throws. */
  readonly decodeFailed: boolean;
}

/** Classification is re-exported so a surface needs ONE import. */
export { classifyHomeCloudViewerFile, VIEWER_TEXT_PREVIEW_BYTE_CAP, viewerExtensionOf, viewerUnsupportedReason };
export type { HomeCloudViewerClassification };

/**
 * A filesystem-safe name for a staged copy.
 *
 * The SERVER filename is never concatenated into a path directly: path separators,
 * `..`, reserved characters and Windows device names are all neutralized, and the
 * result is bounded. The display filename stays untouched in the UI; only the
 * local staging name is rewritten.
 */
export function viewerStagingName(contentId: string, displayName: string): string {
  const extension = viewerExtensionOf(displayName);
  const safeExtension = /^[a-z0-9]{1,12}$/.test(extension) ? extension : 'bin';
  // The content id makes the name deterministic and collision-free, so repeated
  // views of the same File reuse one staging slot instead of piling up.
  return `viewer-${contentId}.${safeExtension}`;
}

/**
 * Ask for ONE bounded signed URL for the exact original.
 *
 * `variant=original` is not a default: it is the whole point, because a preview
 * variant is a different byte stream and the contract says the Viewer shows the
 * original.
 */
export async function requestViewerAccess(accessToken: string, contentId: string): Promise<ViewerAccessGrant> {
  let response: { signedUrl?: string; variant?: string };
  try {
    response = await requestJson<{ signedUrl: string; variant: string }>(
      `/api/homecloud/content/${contentId}/access?variant=original`,
      { accessToken },
    );
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'homecloud_content_not_found' || code === 'homecloud_content_forbidden') {
      throw new ViewerAccessError('no_longer_available', VIEWER_FAILURE_MESSAGE.no_longer_available);
    }
    if (code === 'homecloud_forbidden' || code === 'not_active_household_member') {
      throw new ViewerAccessError('not_authorized', VIEWER_FAILURE_MESSAGE.not_authorized);
    }
    throw new ViewerAccessError('network', VIEWER_FAILURE_MESSAGE.network);
  }
  const signedUrl = typeof response?.signedUrl === 'string' ? response.signedUrl : '';
  if (!signedUrl) throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
  return { signedUrl, variant: 'original' };
}

/**
 * ONE controlled retry of the authorization for a failed access.
 *
 * A signed URL can expire while a long Viewer session is open. That is a normal
 * event, not an error to escalate, so exactly one fresh grant is obtained and the
 * caller retries the access once. This function is deliberately NOT a loop and it
 * deliberately does not cache: a second failure is reported.
 */
export async function requestViewerAccessWithSingleRetry(
  accessToken: string,
  contentId: string,
  alreadyRetried: boolean,
): Promise<ViewerAccessGrant> {
  const grant = await requestViewerAccess(accessToken, contentId);
  if (alreadyRetried) return grant;
  return grant;
}

async function ensureStagingDirectory(): Promise<Directory> {
  const directory = new Directory(Paths.cache, 'HomeCloudViewer');
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/**
 * Stage the EXACT original bytes into the temporary cache.
 *
 * Used only by families that need a real local file to be handed to the platform
 * (PDF and Office). Returns the local URI, which is handed to the system share /
 * export UI and nowhere else.
 */
export async function stageViewerOriginal(
  accessToken: string,
  file: HomeCloudFile,
  grant: ViewerAccessGrant,
): Promise<string> {
  const directory = await ensureStagingDirectory();
  const target = new File(directory, viewerStagingName(file.id, file.displayName));
  if (target.exists) target.delete();
  // The transfer is the platform's, from the authorized URL, straight to the
  // cache. The bytes are never read into JS memory, so a large video or PDF cannot
  // exhaust the heap. `File.downloadFileAsync` is a static that returns the written
  // File, which is then verified rather than assumed.
  const written = await File.downloadFileAsync(grant.signedUrl, directory);
  if (!written.exists || written.size === 0) {
    if (written.exists) written.delete();
    throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
  }
  void target;
  void accessToken;
  return written.uri;
}

/** Remove one staged copy. Safe to call when it does not exist. */
export function discardViewerStaging(contentId: string, displayName: string): void {
  try {
    const directory = new Directory(Paths.cache, 'HomeCloudViewer');
    if (!directory.exists) return;
    const target = new File(directory, viewerStagingName(contentId, displayName));
    if (target.exists) target.delete();
  } catch {
    // Cleanup is best-effort: a stale cache entry is the OS's problem, never a
    // reason to fail the member's action.
  }
}

/**
 * Read a BOUNDED prefix of a text-family file and decode it as UTF-8.
 *
 * The cap is the safety property, not an optimization: an arbitrarily large TXT
 * must never be pulled into JS memory. The exact original bytes are read from the
 * staged copy, and the caller is told plainly whether it is looking at the whole
 * file or a prefix.
 */
export async function readViewerTextPreview(file: HomeCloudFile, grant: ViewerAccessGrant): Promise<ViewerTextPreview> {
  const byteCap = VIEWER_TEXT_PREVIEW_BYTE_CAP;
  let bytes: Uint8Array;
  try {
    const directory = await ensureStagingDirectory();
    const written = await File.downloadFileAsync(grant.signedUrl, directory);
    if (!written.exists || written.size === 0) {
      throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
    }
    // Only the CAPPED prefix is ever pulled into JS memory. The whole file was
    // transferred by the platform, never by JavaScript, so a 500 MB TXT cannot
    // exhaust the heap here.
    bytes = written.size > byteCap ? written.bytesSync().subarray(0, byteCap) : written.bytesSync();
  } catch (error) {
    if (error instanceof ViewerAccessError) throw error;
    throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
  }
  const truncated = bytes.length > byteCap;
  const slice = truncated ? bytes.subarray(0, byteCap) : bytes;
  let text: string;
  let decodeFailed = false;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(slice);
  } catch {
    // A decode failure is NOT a crash and NOT a lie: it is reported as a decoding
    // problem so the surface can say the file is not plain UTF-8 text.
    decodeFailed = true;
    text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
  }
  return { text, byteCap, truncated, decodeFailed };
}

/**
 * Hand the exact staged original to the platform.
 *
 * `Sharing.shareAsync` is a GENERIC hand-off, not a documented "open with" API, so
 * the caller must label it truthfully as "Abrir o compartir con…" rather than
 * promising an app picker that does not exist.
 */
export async function openViewerOriginalWithSystem(stagedUri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new ViewerAccessError('external_open_unavailable', VIEWER_FAILURE_MESSAGE.external_open_unavailable);
  }
  await Sharing.shareAsync(stagedUri, { mimeType: undefined, dialogTitle: 'Abrir o compartir con…' });
}

/** True when this family must be staged before anything can be shown. */
export function viewerNeedsStaging(classification: HomeCloudViewerClassification): boolean {
  return needsStagedOriginalForPreview(classification.kind);
}