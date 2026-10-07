/**
 * HomeCloud Files - Stage 2 Slice C Expo-Go correction - WEBVIEW BRIDGE PROTOCOL.
 *
 * The small explicit contract between React Native and the local PDF renderer
 * living inside the WebView. Pure and framework-free: every validator and every
 * byte helper here is executed by the automated suite without a device.
 *
 * SHAPE. Every message is a JSON object with a protocol version `v` and a `type`
 * discriminator, plus a `docId` session token. The token is what makes
 * close-during-load and reopen-different-document safe: a chunk for a document
 * that is no longer open is ignored by construction, on both sides.
 *
 * DEFENSE. The viewer side is reachable from document content in theory (a
 * hostile PDF could try to smuggle a string through), so the RN side parses
 * defensively: JSON shape is validated field by field, unknown types are
 * ignored, oversized payloads are rejected, and document bytes NEVER travel in
 * the same field as a command - chunks are `{ index, data }` under an explicit
 * INIT session, never inline executable content.
 */

export const PDF_BRIDGE_PROTOCOL_VERSION = 1;

/** Maximum base64 characters accepted in ONE chunk message (DoS bound). */
export const PDF_BRIDGE_MAX_CHUNK_CHARS = 512 * 1024;

/** Maximum characters accepted for an external link URL handoff. */
export const PDF_BRIDGE_MAX_URL_CHARS = 8 * 1024;

// ── React Native -> Viewer ────────────────────────────────────────────────

export type RnToPdfMessage =
  | {
      readonly v: 1;
      readonly type: 'INIT_DOCUMENT';
      readonly docId: string;
      readonly byteLength: number;
      readonly totalChunks: number;
    }
  | { readonly v: 1; readonly type: 'LOAD_CHUNK'; readonly docId: string; readonly index: number; readonly data: string }
  | { readonly v: 1; readonly type: 'DISPOSE'; readonly docId: string };

/** Serializes an RN->Viewer command. Document bytes travel ONLY in LOAD_CHUNK. */
export function serializeRnMessage(message: RnToPdfMessage): string {
  return JSON.stringify({ ...message, v: PDF_BRIDGE_PROTOCOL_VERSION });
}

// ── Viewer -> React Native ────────────────────────────────────────────────

export type ViewerToRnMessage =
  | { readonly v: 1; readonly type: 'READY'; readonly docId: string }
  | { readonly v: 1; readonly type: 'DOCUMENT_LOADED'; readonly docId: string; readonly pages: number }
  | { readonly v: 1; readonly type: 'PAGE_CHANGED'; readonly docId: string; readonly page: number; readonly pages: number }
  | {
      readonly v: 1;
      readonly type: 'LOAD_ERROR';
      readonly docId: string;
      readonly code: 'password' | 'corrupt' | 'unsupported';
    }
  | { readonly v: 1; readonly type: 'RENDER_ERROR'; readonly docId: string; readonly page: number }
  | { readonly v: 1; readonly type: 'LINK_PRESSED'; readonly docId: string; readonly url: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDocId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 128;
}

function isPageNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100_000;
}

/**
 * Parses ONE Viewer->RN message defensively. Returns `null` for anything that
 * is not a well-formed protocol message: malformed JSON, wrong version, unknown
 * type, missing docId, out-of-range numbers, oversized URLs. Callers ignore
 * `null` - never throw the member into an error state because a string was odd.
 */
export function parseViewerMessage(raw: unknown): ViewerToRnMessage | null {
  if (typeof raw !== 'string') return null;
  if (raw.length > PDF_BRIDGE_MAX_CHUNK_CHARS + 1024) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(decoded)) return null;
  if (decoded.v !== PDF_BRIDGE_PROTOCOL_VERSION) return null;
  if (!isDocId(decoded.docId)) return null;
  switch (decoded.type) {
    case 'READY':
      return { v: 1, type: 'READY', docId: decoded.docId };
    case 'DOCUMENT_LOADED':
      if (!isPageNumber(decoded.pages)) return null;
      return { v: 1, type: 'DOCUMENT_LOADED', docId: decoded.docId, pages: decoded.pages };
    case 'PAGE_CHANGED':
      if (!isPageNumber(decoded.page) || !isPageNumber(decoded.pages)) return null;
      return { v: 1, type: 'PAGE_CHANGED', docId: decoded.docId, page: decoded.pages < decoded.page ? decoded.pages : decoded.page, pages: decoded.pages };
    case 'LOAD_ERROR':
      if (decoded.code !== 'password' && decoded.code !== 'corrupt' && decoded.code !== 'unsupported') return null;
      return { v: 1, type: 'LOAD_ERROR', docId: decoded.docId, code: decoded.code };
    case 'RENDER_ERROR':
      if (!isPageNumber(decoded.page)) return null;
      return { v: 1, type: 'RENDER_ERROR', docId: decoded.docId, page: decoded.page };
    case 'LINK_PRESSED':
      if (typeof decoded.url !== 'string' || decoded.url.length < 1 || decoded.url.length > PDF_BRIDGE_MAX_URL_CHARS) return null;
      if (!isAllowedViewerLinkUrl(decoded.url)) return null;
      return { v: 1, type: 'LINK_PRESSED', docId: decoded.docId, url: decoded.url };
    default:
      return null;
  }
}

/**
 * Which URLs may leave the Viewer as an explicit system handoff.
 * Only http/https: no javascript:, data:, file:, blob: or custom schemes, which
 * a hostile document could otherwise smuggle through an annotation action.
 */
export function isAllowedViewerLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;
  // Leading/trailing whitespace is tolerated (trimmed away by callers that use
  // the URL); anything structural inside is not.
  if (/[\s<>"]/.test(trimmed)) return false;
  return true;
}

// ── byte helpers (base64 is the only alphabet postMessage speaks) ─────────

/**
 * Stack-safe bytes->base64. `btoa(String.fromCharCode(...bytes))` overflows the
 * argument list on large inputs; this encodes in 32 KiB slices instead. Pure.
 */
export function encodeBytesToBase64(bytes: Uint8Array): string {
  const SLICE = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += SLICE) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(offset, offset + SLICE)));
  }
  // `btoa` exists in React Native (Hermes), in browsers and in Node 16+.
  return btoa(binary);
}

/** Splits an encoded payload into bounded transport chunks. Pure. */
export function splitBase64IntoChunks(base64: string, chunkChars: number): string[] {
  if (!Number.isInteger(chunkChars) || chunkChars <= 0) throw new Error('splitBase64IntoChunks: chunkChars must be a positive integer');
  const out: string[] = [];
  for (let offset = 0; offset < base64.length; offset += chunkChars) {
    out.push(base64.slice(offset, offset + chunkChars));
  }
  return out;
}

/**
 * Streaming base64 encoder with the 3-byte carry handled.
 *
 * The transport reads the staged file as a STREAM (never the whole file at
 * once), so encoding must also stream: each `push()` emits only the complete
 * triplets, keeps 0-2 leftover bytes, and `flush()` emits the remainder with
 * its padding. The concatenation of all emitted parts equals
 * `encodeBytesToBase64(whole)` exactly - asserted by the suite.
 */
export function createBase64StreamEncoder(): {
  push: (bytes: Uint8Array) => string | null;
  flush: () => string;
} {
  let carry = new Uint8Array(0);
  const push = (bytes: Uint8Array): string | null => {
    const merged = new Uint8Array(carry.length + bytes.length);
    merged.set(carry, 0);
    merged.set(bytes, carry.length);
    const complete = merged.length - (merged.length % 3);
    carry = merged.slice(complete);
    if (complete === 0) return null;
    return encodeBytesToBase64(merged.slice(0, complete));
  };
  const flush = (): string => {
    const rest = carry;
    carry = new Uint8Array(0);
    if (rest.length === 0) return '';
    return encodeBytesToBase64(rest);
  };
  return { push, flush };
}

/**
 * Escapes a string for interpolation into an HTML attribute or text node.
 * The Viewer template interpolates NO user content by design; this exists so
 * that property holds even if a future change passes a filename through.
 */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
