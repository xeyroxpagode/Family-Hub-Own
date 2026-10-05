/**
 * HomeCloud Files - Stage 2 / Phase 3 - VIEWER V1, FILE CLASSIFICATION.
 *
 * ONE canonical classification layer. Every surface that needs to know "what kind
 * of thing is this File" asks here, so the rules live in one place instead of
 * being scattered as `if (.pdf)` / `if (.jpg)` / `if (.docx)` across components
 * that would then drift apart.
 *
 * TRUST ORDER. The declared MIME is preferred when it is specific enough to be
 * believed, and the extension is the fallback for a generic or missing one. Both
 * are normalized, because a stored `application/octet-stream` is what an unknown
 * upload looks like and must not silently become an "unsupported" verdict when
 * the name says otherwise.
 *
 * This module is pure and framework-free: no React, no transport, no filesystem.
 * That is what makes the whole matrix testable without a device.
 */

/** The semantic families the Viewer routes on. */
export type HomeCloudViewerKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'csv'
  | 'markdown'
  | 'office_document'
  | 'office_sheet'
  | 'office_presentation'
  | 'unsupported';

export interface HomeCloudViewerClassification {
  readonly kind: HomeCloudViewerKind;
  /** The extension used to reach the verdict, lowercase, without the dot. */
  readonly extension: string;
  /** Whether the verdict came from the declared MIME or from the filename. */
  readonly source: 'mime' | 'extension';
  /**
   * Whether rendering INLINE would involve active web content.
   *
   * SVG is the reason this field exists. An SVG is an XML document that may carry
   * scripts, external references and CSS. Rather than pretend it is a harmless
   * picture, the Viewer refuses to render it inline and treats it as unsafe, which
   * is the honest and safe behaviour on both platforms.
   */
  readonly activeWebContent: boolean;
}

/** A conservative byte cap for text-family previews. Never the whole file. */
export const VIEWER_TEXT_PREVIEW_BYTE_CAP = 512 * 1024;

const TEXTUAL_MIME_PREFIXES = ['text/'];
const TEXTUAL_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'application/javascript',
  'application/typescript',
  'application/x-sh',
]);

/** Extensions that are text-family even when the MIME is generic or absent. */
const TEXTUAL_EXTENSIONS = new Set([
  'txt', 'text', 'log', 'md', 'markdown', 'mdown', 'mkd', 'csv', 'tsv',
  'json', 'jsonl', 'yaml', 'yml', 'xml', 'ini', 'conf', 'cfg', 'env', 'sql',
  'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h',
  'cpp', 'hpp', 'cs', 'php', 'sh', 'bash', 'zsh', 'toml', 'properties', 'gitignore',
]);

/**
 * DANGEROUS / ACTIVE WEB CONTENT.
 *
 * Anything that a renderer would execute is refused inline rather than sanitized
 * and shown. Sanitizing SVG or HTML properly is a security project of its own,
 * and getting it wrong renders a user's private document as active content.
 */
const ACTIVE_WEB_EXTENSIONS = new Set(['svg', 'svgz', 'html', 'htm', 'xhtml', 'xht', 'shtml', 'mhtml', 'xml', 'xsl', 'xslt']);
const ACTIVE_WEB_MIME_PREFIXES = ['text/html', 'application/xhtml'];
const ACTIVE_WEB_MIME_TYPES = new Set([
  'image/svg+xml',
  'application/xhtml+xml',
  'application/xml',
  'text/xml',
  'application/xslt+xml',
]);

const OFFICE_DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'odt', 'rtf', 'docm', 'dot', 'dotx']);
const OFFICE_SHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'ods', 'xlsm', 'xlsb', 'csv.tsv', 'numbers']);
const OFFICE_PRESENTATION_EXTENSIONS = new Set(['ppt', 'pptx', 'odp', 'pptm', 'pps', 'ppsx', 'key']);

const MIME_TO_KIND: Record<string, HomeCloudViewerKind> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'text/markdown': 'markdown',
  'text/x-markdown': 'markdown',
  'application/msword': 'office_document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'office_document',
  'application/vnd.oasis.opendocument.text': 'office_document',
  'application/rtf': 'office_document',
  'application/vnd.ms-excel': 'office_sheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'office_sheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'office_sheet',
  'application/vnd.ms-powerpoint': 'office_presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'office_presentation',
  'application/vnd.oasis.opendocument.presentation': 'office_presentation',
  'application/vnd.apple.pages': 'office_document',
  'application/vnd.apple.numbers': 'office_sheet',
  'application/vnd.apple.keynote': 'office_presentation',
};

/** Lowercased extension without the dot, or '' when there is none. */
export function viewerExtensionOf(fileName: string): string {
  const trimmed = fileName.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0 || dot === trimmed.length - 1) return '';
  return trimmed.slice(dot + 1).toLowerCase();
}

/** Lowercased MIME without parameters, e.g. `text/plain; charset=utf-8`. */
function normalizeMime(mimeType: string | null | undefined): string {
  if (typeof mimeType !== 'string') return '';
  return mimeType.split(';')[0].trim().toLowerCase();
}

function kindFromMime(mime: string): HomeCloudViewerKind | null {
  if (MIME_TO_KIND[mime]) return MIME_TO_KIND[mime];
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (TEXTUAL_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    if (mime === 'text/csv') return 'csv';
    if (mime === 'text/tab-separated-values') return 'csv';
    if (mime === 'text/markdown' || mime === 'text/x-markdown') return 'markdown';
    return 'text';
  }
  if (TEXTUAL_MIME_TYPES.has(mime)) return 'text';
  return null;
}

function kindFromExtension(extension: string): HomeCloudViewerKind | null {
  if (extension === 'pdf') return 'pdf';
  if (extension === 'csv' || extension === 'tsv') return 'csv';
  if (TEXTUAL_EXTENSIONS.has(extension)) {
    return extension === 'md' || extension === 'markdown' || extension === 'mdown' || extension === 'mkd'
      ? 'markdown'
      : 'text';
  }
  // An image extension is only trusted when the MIME was generic or absent, which
  // is exactly the case this fallback exists for.
  if (/^(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif|tiff?)$/.test(extension)) return 'image';
  if (/^(mp4|m4v|mov|webm|mkv|3gp|avi)$/.test(extension)) return 'video';
  if (/^(mp3|m4a|aac|wav|ogg|oga|opus|flac|aiff?)$/.test(extension)) return 'audio';
  if (OFFICE_DOCUMENT_EXTENSIONS.has(extension)) return 'office_document';
  if (OFFICE_SHEET_EXTENSIONS.has(extension)) return 'office_sheet';
  if (OFFICE_PRESENTATION_EXTENSIONS.has(extension)) return 'office_presentation';
  return null;
}

function isActiveWebContent(mime: string, extension: string): boolean {
  if (ACTIVE_WEB_MIME_TYPES.has(mime)) return true;
  if (ACTIVE_WEB_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) return true;
  return ACTIVE_WEB_EXTENSIONS.has(extension);
}

/** MIMEs that carry no information and must not decide anything. */
const GENERIC_MIMES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/unknown',
  'application/force-download',
  'application/download',
]);

/**
 * Classify ONE File for the Viewer.
 *
 * An SVG, an HTML document or an XSLT is `unsupported` with `activeWebContent:
 * true`, never "image" or "text": rendering it inline would execute a document
 * the member uploaded, and the Viewer has no sandboxed renderer to do that
 * safely. It still gets a useful screen and the available actions.
 */
export function classifyHomeCloudViewerFile(file: {
  readonly fileName: string;
  readonly mimeType?: string | null;
}): HomeCloudViewerClassification {
  const extension = viewerExtensionOf(file.fileName);
  const mime = normalizeMime(file.mimeType);
  const activeWebContent = isActiveWebContent(mime, extension);

  if (activeWebContent) {
    return { kind: 'unsupported', extension, source: 'mime', activeWebContent: true };
  }

  if (!GENERIC_MIMES.has(mime)) {
    const fromMime = kindFromMime(mime);
    if (fromMime) return { kind: fromMime, extension, source: 'mime', activeWebContent: false };
  }

  const fromExtension = kindFromExtension(extension);
  if (fromExtension) return { kind: fromExtension, extension, source: 'extension', activeWebContent: false };

  return { kind: 'unsupported', extension, source: GENERIC_MIMES.has(mime) ? 'mime' : 'extension', activeWebContent: false };
}

/** True when the Viewer can render this family INLINE, without staging bytes. */
export function isInlineRenderableFamily(kind: HomeCloudViewerKind): boolean {
  return kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'text' || kind === 'csv' || kind === 'markdown';
}

/**
 * True when the Viewer needs the exact original bytes staged to the cache before
 * it can show anything.
 *
 * Text-family files are read by a bounded local read rather than staged, so they
 * are deliberately NOT listed here.
 */
export function needsStagedOriginalForPreview(kind: HomeCloudViewerKind): boolean {
  return kind === 'pdf' || kind === 'office_document' || kind === 'office_sheet' || kind === 'office_presentation';
}

/** The honest one-line reason a family cannot be shown inline. */
export function viewerUnsupportedReason(classification: HomeCloudViewerClassification): string {
  if (classification.activeWebContent) {
    return 'Este archivo es un documento web activo y no lo mostramos en línea por seguridad.';
  }
  return 'No podemos previsualizar este formato.';
}