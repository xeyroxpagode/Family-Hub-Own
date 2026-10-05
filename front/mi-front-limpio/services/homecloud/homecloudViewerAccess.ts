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
  | 'file_too_large_to_preview'
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
  file_too_large_to_preview: 'Este archivo es demasiado grande para una vista previa aquí. Abrilo con otra app.',
  external_open_unavailable: 'No hay ninguna app disponible para abrir este archivo.',
};

/**
 * How much of the original the platform is even ASKED to transfer for an inline
 * text preview.
 *
 * `VIEWER_TEXT_PREVIEW_BYTE_CAP` bounds what enters JS memory. This second bound
 * bounds what is pulled over the wire and written to the cache at all, because the
 * bounded read still happens AFTER the platform finished the transfer. Without it a
 * multi-gigabyte `.txt` would fill the device cache just to show 512 KiB of it. It is
 * set well above the preview cap so ordinary documents are never refused.
 */
export const VIEWER_TEXT_TRANSFER_BYTE_LIMIT = 8 * 1024 * 1024;

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
 * Would a fresh grant plausibly fix this failure?
 *
 * A signed URL expires on a timer, so an access that failed because the URL was
 * stale or already revoked CAN succeed with a new one. A real permission denial
 * cannot: retrying it would just re-ask for something the member is not allowed to
 * see, so those failures are reported immediately.
 */
export function isRetriableViewerGrantFailure(error: unknown): boolean {
  if (!(error instanceof ViewerAccessError)) return false;
  return error.reason === 'no_longer_available' || error.reason === 'preview_failed';
}

/**
 * Run an access that needs a grant, re-authorizing AT MOST ONCE.
 *
 * The retry wraps the ACCESS, not the grant request. Re-requesting a URL and then
 * reusing the same stale bytes would not retry anything, which is precisely the bug
 * this replaced: the previous helper accepted an `alreadyRetried` flag, ignored it
 * and returned the same grant from both branches, so no retry ever happened while
 * the docstring claimed one did.
 *
 * It is deliberately not a loop. A second failure propagates, and a denied member is
 * never re-asked.
 */
export async function withSingleGrantRetry<T>(
  accessToken: string,
  contentId: string,
  attempt: (grant: ViewerAccessGrant) => Promise<T>,
): Promise<T> {
  try {
    return await attempt(await requestViewerAccess(accessToken, contentId));
  } catch (error) {
    if (!isRetriableViewerGrantFailure(error)) throw error;
    return attempt(await requestViewerAccess(accessToken, contentId));
  }
}

async function ensureStagingDirectory(): Promise<Directory> {
  const directory = new Directory(Paths.cache, 'HomeCloudViewer');
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/** The one deterministic cache slot for a content id. Never a server-derived path. */
async function viewerStagingTarget(contentId: string, displayName: string): Promise<File> {
  const directory = await ensureStagingDirectory();
  return new File(directory, viewerStagingName(contentId, displayName));
}

/**
 * Transfer the authorized original into the deterministic cache slot.
 *
 * The destination is a `File`, not the directory. Handing `downloadFileAsync` a
 * directory makes the platform NAME the file from the response headers, so the bytes
 * land on a random path that `discardViewerStaging` - which deletes the
 * deterministic name - can never remove. The result was a permanent cache orphan on
 * every PDF and Office view. `idempotent` lets a repeat view overwrite its own slot
 * instead of colliding with it.
 */
async function downloadIntoStaging(target: File, signedUrl: string): Promise<File> {
  return File.downloadFileAsync(signedUrl, target, { idempotent: true });
}

/**
 * Stage the EXACT original bytes into the temporary cache.
 *
 * Used only by families that need a real local file to be handed to the platform
 * (PDF and Office). Returns the local URI, which is handed to the system share /
 * export UI and nowhere else.
 */
export async function stageViewerOriginal(file: HomeCloudFile, grant: ViewerAccessGrant): Promise<string> {
  const target = await viewerStagingTarget(file.id, file.displayName);
  let written: File;
  try {
    // The transfer is the platform's, from the authorized URL, straight to the cache.
    // The bytes are never read into JS memory, so a large video or PDF cannot exhaust
    // the heap.
    written = await downloadIntoStaging(target, grant.signedUrl);
  } catch (error) {
    // A transfer failure is reported as the SAME typed reason the text path uses.
    // Letting the raw platform error escape meant the surface showed a generic
    // message and the controlled retry could not recognise an expired grant.
    void error;
    try {
      if (target.exists) target.delete();
    } catch {
      // Best-effort.
    }
    throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
  }
  if (!written.exists || written.size === 0) {
    if (written.exists) written.delete();
    throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
  }
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
 * Read at most `byteCap` bytes of a staged file WITHOUT putting the whole file in
 * JS memory.
 *
 * This is the property the previous implementation only pretended to have: it called
 * `bytesSync()` - the whole file, unconditionally, in both branches of a ternary -
 * and sliced afterwards, so a 500 MB TXT was fully resident before 512 KiB were kept.
 *
 * The fix is structural rather than arithmetic. The file is consumed through
 * `readableStream()` chunk by chunk, the reader is cancelled the moment the cap is
 * reached, and only the accumulated prefix - at most `byteCap` bytes - is ever
 * materialized as one buffer. Peak heap is therefore bounded by the cap regardless of
 * how large the file is.
 */
async function readBoundedPrefix(file: File, byteCap: number): Promise<Uint8Array> {
  const reader = file.readableStream().getReader();
  const chunks: Uint8Array[] = [];
  let collected = 0;
  try {
    while (collected < byteCap) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      const remaining = byteCap - collected;
      if (value.byteLength <= remaining) {
        chunks.push(value);
        collected += value.byteLength;
      } else {
        chunks.push(value.subarray(0, remaining));
        collected += remaining;
      }
    }
  } finally {
    // Releasing the reader is what actually stops the transfer early.
    await reader.cancel().catch(() => undefined);
  }
  const prefix = new Uint8Array(collected);
  let offset = 0;
  for (const chunk of chunks) {
    prefix.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return prefix;
}

/**
 * Read a BOUNDED prefix of a text-family file and decode it as UTF-8.
 *
 * The cap is the safety property, not an optimization: an arbitrarily large TXT must
 * never be pulled into JS memory. The exact original bytes are read from the staged
 * copy, and the caller is told plainly - from the real file size - whether it is
 * looking at the whole file or only a prefix.
 */
export async function readViewerTextPreview(file: HomeCloudFile, grant: ViewerAccessGrant): Promise<ViewerTextPreview> {
  const byteCap = VIEWER_TEXT_PREVIEW_BYTE_CAP;
  // The bounded read happens after the transfer, so an absurd file is refused up
  // front rather than staged in full. An UNKNOWN size is still read, because the
  // stream cap keeps memory safe either way.
  if (typeof file.sizeBytes === 'number' && file.sizeBytes > VIEWER_TEXT_TRANSFER_BYTE_LIMIT) {
    throw new ViewerAccessError('file_too_large_to_preview', VIEWER_FAILURE_MESSAGE.file_too_large_to_preview);
  }
  const target = await viewerStagingTarget(file.id, file.displayName);
  try {
    const written = await downloadIntoStaging(target, grant.signedUrl);
    if (!written.exists || written.size === 0) {
      throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
    }
    // `truncated` is derived from the REAL size, measured BEFORE slicing. Deriving it
    // from the already-capped buffer made it permanently false, so the surface could
    // never tell a member it was showing a prefix.
    const truncated = written.size > byteCap;
    const bytes = await readBoundedPrefix(written, byteCap);
    return decodeBoundedText(bytes, byteCap, truncated);
  } catch (error) {
    if (error instanceof ViewerAccessError) throw error;
    throw new ViewerAccessError('preview_failed', VIEWER_FAILURE_MESSAGE.preview_failed);
  } finally {
    // The text read staged a real file, so it removes it. Leaving it behind is the
    // same orphan the hand-off path had.
    try {
      if (target.exists) target.delete();
    } catch {
      // Best-effort, exactly like discardViewerStaging.
    }
  }
}

function decodeBoundedText(bytes: Uint8Array, byteCap: number, truncated: boolean): ViewerTextPreview {
  let text: string;
  let decodeFailed = false;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // A decode failure is NOT a crash and NOT a lie: it is reported as a decoding
    // problem so the surface can say the file is not plain UTF-8 text.
    decodeFailed = true;
    text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
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