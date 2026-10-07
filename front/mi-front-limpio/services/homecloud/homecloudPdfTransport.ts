/**
 * HomeCloud Files - Stage 2 Slice C Expo-Go correction - PDF BYTE TRANSPORT.
 *
 * Carries the STAGED pdf (the same deterministic `HomeCloudViewer` cache slot
 * the grant architecture already produced - no second cache, no second
 * download) into the WebView over the versioned chunk protocol.
 *
 * MEMORY CONTRACT. The file is consumed as a STREAM and encoded to base64
 * incrementally (3-byte carry, see `createBase64StreamEncoder`), so peak JS
 * heap is bounded by one reader chunk plus the accumulated base64 string, which
 * itself is refused above `INLINE_PDF_PREVIEW_MAX_BYTES`. The transfer is
 * aborted the moment the running total passes the ceiling - even if the stated
 * size lied - so a hostile or stale size can never cause unbounded growth.
 *
 * The module takes its filesystem as a parameter (a minimal structural subset
 * of `expo-file-system`'s `File`), which is what makes the ceiling EXECUTABLE
 * in the suite instead of merely declared.
 */

import { INLINE_PDF_PREVIEW_MAX_BYTES, PDF_BRIDGE_CHUNK_BYTES, pdfInlineEligibility } from './homecloudPdfPolicy';
import { createBase64StreamEncoder } from './homecloudPdfBridge';

export class PdfTooLargeError extends Error {
  constructor(readonly byteLength: number) {
    super(`PDF exceeds the inline preview ceiling (${byteLength} bytes)`);
    this.name = 'PdfTooLargeError';
  }
}

export class PdfEmptyError extends Error {
  constructor() {
    super('PDF staging is empty or missing');
    this.name = 'PdfEmptyError';
  }
}

/** Structural subset of expo-file-system's File used by the transport. */
export interface PdfStagedFile {
  readonly size: number | null | undefined;
  readableStream(): ReadableStream<Uint8Array>;
}

export interface PdfTransportPayload {
  readonly byteLength: number;
  /** Base64 chunks, each at most ~4/3 * PDF_BRIDGE_CHUNK_BYTES chars. */
  readonly chunks: string[];
}

const BASE64_CHUNK_CHARS = Math.ceil((PDF_BRIDGE_CHUNK_BYTES * 4) / 3);

/**
 * Reads the staged PDF into bounded base64 chunks.
 *
 * - refuses empty/missing files without touching the stream;
 * - refuses files above the ceiling BEFORE reading (fast path on real size);
 * - aborts mid-stream if the running total passes the ceiling anyway;
 * - releases the reader when done or on abort;
 * - returns chunks that reassemble (concatenated, base64-decoded) to EXACTLY
 *   the staged bytes - asserted byte-for-byte by the suite on fixtures.
 */
export async function readStagedPdfForBridge(staged: PdfStagedFile): Promise<PdfTransportPayload> {
  const stated = typeof staged.size === 'number' ? staged.size : null;
  const gate = pdfInlineEligibility(stated);
  if (!gate.eligible && gate.reason === 'empty_or_missing') throw new PdfEmptyError();
  if (!gate.eligible && gate.reason === 'too_large') throw new PdfTooLargeError(stated ?? -1);

  const encoder = createBase64StreamEncoder();
  const parts: string[] = [];
  let current = '';
  let total = 0;
  const reader = staged.readableStream().getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      // The size on disk is authoritative, but a file that GREW between the
      // gate and the read must still not blow the heap: abort mid-stream.
      if (total > INLINE_PDF_PREVIEW_MAX_BYTES) {
        throw new PdfTooLargeError(total);
      }
      const emitted = encoder.push(value);
      if (emitted) {
        current += emitted;
        while (current.length >= BASE64_CHUNK_CHARS) {
          parts.push(current.slice(0, BASE64_CHUNK_CHARS));
          current = current.slice(BASE64_CHUNK_CHARS);
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const tail = encoder.flush();
  if (tail) current += tail;
  if (current.length > 0) parts.push(current);
  if (total === 0) throw new PdfEmptyError();
  return { byteLength: total, chunks: parts };
}
