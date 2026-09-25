/**
 * HomeCloud HC-3E — Document Scanner pure logic.
 *
 * The scanner is NOT a new entity and NOT a separate upload system: it is one
 * more CREATE source for a HomeCloud File. Captured pages are temporary local
 * assets; the only HomeCloud output is ONE File with mimeType application/pdf,
 * handed to the shared Upload Engine as a regular UploadLocalArtifact.
 *
 * This module is intentionally free of Expo/native imports so page-list
 * semantics, filename normalization and PDF HTML can be unit-tested in Node.
 */

import type { UploadIntakeContext, UploadLocalArtifact } from './homecloudUploadTypes';

/** Temporary local capture. Never persisted to backend as HomeCloud content. */
export interface ScannerPage {
  readonly id: string;
  readonly uri: string;
  readonly width?: number;
  readonly height?: number;
}

export const SCANNER_PDF_MIME_TYPE = 'application/pdf';
export const SCANNER_PDF_EXTENSION = 'pdf';

/** Informational provenance tag; no schema expansion required. */
export const SCANNER_INTAKE_SOURCE = 'files:scanner';

// ---------------------------------------------------------------------------
// Page list operations (pure; capture order is the source of truth)
// ---------------------------------------------------------------------------

/** Append a captured page. Adding always appends. */
export function appendPage(pages: readonly ScannerPage[], page: ScannerPage): ScannerPage[] {
  return [...pages, page];
}

/** Delete a page by id. Deleting the final page returns the empty state. */
export function deletePage(pages: readonly ScannerPage[], pageId: string): ScannerPage[] {
  return pages.filter((page) => page.id !== pageId);
}

/** Retake: replace the page with the same id at the SAME position. */
export function replacePage(
  pages: readonly ScannerPage[],
  pageId: string,
  next: ScannerPage,
): ScannerPage[] {
  return pages.map((page) => (page.id === pageId ? next : page));
}

/** A PDF can only be created from at least one captured page. */
export function canCreatePdf(pages: readonly ScannerPage[]): boolean {
  return pages.length > 0;
}

// ---------------------------------------------------------------------------
// File name
// ---------------------------------------------------------------------------

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/** Default suggestion: `Escaneo - DD-MM-YYYY.pdf`. */
export function defaultScanFileName(now: Date = new Date()): string {
  return `Escaneo - ${pad2(now.getDate())}-${pad2(now.getMonth() + 1)}-${now.getFullYear()}.pdf`;
}

/**
 * Normalize the editable scan file name:
 * - trim whitespace
 * - non-empty (empty/whitespace falls back to the default suggestion)
 * - ensure the `.pdf` extension exactly once (case-insensitive, no `.pdf.pdf`)
 * Idempotent: normalize(normalize(x)) === normalize(x).
 */
export function normalizeScanFileName(raw: string, now: Date = new Date()): string {
  let base = raw.trim();
  // Strip every trailing ".pdf" (any casing, optional preceding whitespace).
  for (;;) {
    const next = base.replace(/\.pdf\s*$/i, '').trim();
    if (next === base) break;
    base = next;
  }
  if (!base) return defaultScanFileName(now);
  return `${base}.pdf`;
}

// ---------------------------------------------------------------------------
// PDF HTML (one scanned image per PDF page)
// ---------------------------------------------------------------------------

export interface ScanPdfPageInput {
  /** Base64-encoded JPEG capture (no data: prefix). */
  readonly base64: string;
  readonly width?: number;
  readonly height?: number;
}

/**
 * Deterministic print HTML: one captured image per PDF page, portrait, white
 * background, aspect ratio preserved (contain), centered, forced page break
 * between pages. No branding, headers, footers or timestamps.
 *
 * base64 embed is deliberate: local file:// URIs inside generated HTML are
 * unreliable on iOS; data URIs render consistently on iOS and Android.
 */
export function buildScanPdfHtml(pages: readonly ScanPdfPageInput[]): string {
  if (pages.length === 0) {
    throw new Error('scanner_pdf_requires_pages');
  }
  const sections = pages
    .map(
      (page, index) =>
        `  <section class="page"${index === pages.length - 1 ? ' data-last="true"' : ''}><img src="data:image/jpeg;base64,${page.base64}" /></section>`,
    )
    .join('\n');
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<style>',
    '  @page { margin: 0; }',
    '  html, body { margin: 0; padding: 0; background: #ffffff; }',
    '  .page { page-break-after: always; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; }',
    '  .page[data-last="true"] { page-break-after: auto; }',
    '  .page img { display: block; max-width: 100%; max-height: 100vh; object-fit: contain; }',
    '</style>',
    '</head>',
    '<body>',
    sections,
    '</body>',
    '</html>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Handoff contracts (shared Upload Engine input shapes)
// ---------------------------------------------------------------------------

/**
 * Transform the generated PDF into the same intake input shape produced by
 * ordinary file selection. The engine stays picker/capture agnostic.
 */
export function buildScannerArtifact(input: {
  readonly localUri: string;
  readonly sizeBytes: number;
  readonly displayName: string;
}): UploadLocalArtifact {
  return {
    localUri: input.localUri,
    displayName: normalizeScanFileName(input.displayName),
    mimeType: SCANNER_PDF_MIME_TYPE,
    sizeBytes: input.sizeBytes,
    extension: SCANNER_PDF_EXTENSION,
  };
}

/**
 * Folder destination semantics: launched from Root → folderId null; launched
 * from Folder X → folderId X. No scanner-specific folder behavior.
 */
export function buildScannerIntakeContext(folderId: string | null): UploadIntakeContext {
  return {
    role: 'file',
    intakeSource: SCANNER_INTAKE_SOURCE,
    initialFolderId: folderId ?? null,
  };
}
