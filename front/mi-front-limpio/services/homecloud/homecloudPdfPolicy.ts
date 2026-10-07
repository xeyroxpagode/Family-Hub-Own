/**
 * HomeCloud Files - Stage 2 Slice C Expo-Go correction - PDF SIZE POLICY.
 *
 * Pure and framework-free, so the ceiling is unit-testable without a device.
 *
 * WHY A CEILING EXISTS. The Expo-Go-compatible transport carries the staged PDF
 * from the native filesystem into the WebView as chunked base64 (see
 * `homecloudPdfTransport.ts`): unlike the old native renderer, which read from a
 * file descriptor and never entered the JS heap, every byte DOES pass through
 * JS memory here, twice (React Native + the WebView), plus the base64 expansion
 * and whatever pdf.js retains while rendering. An unbounded bridge would restore
 * Expo Go compatibility while allowing arbitrary memory growth, which is exactly
 * what this policy forbids.
 *
 * WHY 8 MiB. It is deliberately conservative and deliberately NOT a new number:
 * it matches the already-accepted `VIEWER_TEXT_TRANSFER_BYTE_LIMIT` (8 MiB) that
 * bounds what the Viewer pulls over the wire for text. Worst case for an 8 MiB
 * document, all transient:
 *   8.0 MiB raw bytes + ~10.7 MiB base64 string + ~10.7 MiB reassembled in the
 *   WebView + 8 MiB decoded + a few rendered canvases (~2 MiB each at 2x DPR for
 *   the visible window) ~= 40-45 MiB peak, ~20 MiB steady.
 * That fits comfortably even on old iPhones with 2 GiB of RAM, while covering
 * the realistic HomePlus corpus (statements, contracts, scans are overwhelmingly
 * < 5 MiB). It is marked V1-conservative: raise it only with physical profiling
 * evidence, never by arithmetic optimism.
 *
 * ABOVE THE CEILING the Viewer MUST NOT attempt the transfer. It shows a
 * polished, intentional "too large" state and offers the existing safe
 * Open/Share handoff - the same pattern Office files already use.
 */

/** Inline PDF rendering is attempted only at or below this size. V1-conservative. */
export const INLINE_PDF_PREVIEW_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Raw PDF bytes carried per bridge chunk BEFORE base64 encoding.
 * 256 KiB raw -> ~342 KiB of base64 per message: small enough that no single
 * `postMessage` approaches WebView string limits, large enough that an 8 MiB
 * document needs only ~32 round trips.
 */
export const PDF_BRIDGE_CHUNK_BYTES = 256 * 1024;

/** How long the shell waits for the WebView renderer to report READY. */
export const PDF_VIEWER_READY_TIMEOUT_MS = 15_000;

/** How long the shell waits for a document to load after the bytes were sent. */
export const PDF_VIEWER_LOAD_TIMEOUT_MS = 30_000;

export type PdfInlineEligibility =
  | { readonly eligible: true }
  | { readonly eligible: false; readonly reason: 'too_large' | 'empty_or_missing' };

/**
 * The single gate between "stage" and "render inline". `sizeBytes` is the REAL
 * staged size, never the server-declared metadata: metadata can be stale or a
 * lie, the file on disk cannot.
 */
export function pdfInlineEligibility(sizeBytes: number | null | undefined): PdfInlineEligibility {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { eligible: false, reason: 'empty_or_missing' };
  }
  if (sizeBytes > INLINE_PDF_PREVIEW_MAX_BYTES) {
    return { eligible: false, reason: 'too_large' };
  }
  return { eligible: true };
}

/** Engine failure codes the WebView renderer can report (never raw exceptions). */
export type PdfEngineFailureCode = 'password' | 'corrupt' | 'unsupported';

/** Maps a pdf.js failure name to the intentional product code. Also unit-tested. */
export function mapPdfEngineErrorName(errorName: string | null | undefined): PdfEngineFailureCode {
  if (errorName === 'PasswordException') return 'password';
  if (errorName === 'InvalidPDFException' || errorName === 'MissingPDFException') return 'corrupt';
  return 'unsupported';
}

export const VIEWER_PDF_TOO_LARGE_TITLE = 'Este PDF es muy grande para mostrarlo aquí';

export const VIEWER_PDF_TOO_LARGE_MESSAGE =
  'Lo descargamos bien, pero es demasiado grande para una vista previa en el teléfono. Podés abrirlo o compartirlo con otra app.';

export const VIEWER_PDF_PASSWORD_TITLE = 'Este PDF está protegido';

export const VIEWER_PDF_PASSWORD_MESSAGE =
  'Necesita una contraseña para abrirse y el visor no la pide por seguridad. Podés abrirlo con otra app.';
