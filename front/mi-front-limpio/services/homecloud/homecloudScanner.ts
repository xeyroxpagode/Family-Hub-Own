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
import {
  buildImageProcessingPlan,
  orientedSize,
  type Rect,
  type RotationSteps,
} from './homecloudScannerGeometry';

export type { Rect, RotationSteps } from './homecloudScannerGeometry';

/**
 * Edit parameters applied to the ORIGINAL capture. Always reversible: the
 * original file is never mutated, so resetting is just dropping these.
 *
 * `cropRect` is normalized (0..1) against the ORIENTED image, which is the one
 * canonical selection authority shared by the overlay, the handles and the
 * image processing plan. See `homecloudScannerGeometry`.
 *
 * B1 is rectangular by contract, not by accident: four independent corners
 * would need a perspective transform and a polygon rasterizer, and pretending a
 * quad is a rectangle produces wrong crops. B2 adds quadrilaterals as a
 * separate, explicitly-typed model.
 */
export interface ScannerPageEdit {
  readonly cropRect: Rect;
  readonly rotationSteps: RotationSteps;
}

/** Temporary local capture. Never persisted to backend as HomeCloud content. */
export interface ScannerPage {
  readonly id: string;
  /** Original, unmodified capture URI. Never mutated during editing. */
  readonly originalUri: string;
  /**
   * Current processed image URI: the result of applying `edit` to `originalUri`.
   * Null while no edit has been confirmed. Once set, the SCANNER owns it and
   * must delete it on replace/reset/delete/discard.
   */
  readonly processedUri: string | null;
  readonly width?: number;
  readonly height?: number;
  /** Edit parameters. Null means no edits applied. */
  readonly edit: ScannerPageEdit | null;
}

/**
 * What the editor hands back to the Scanner. Serializable: it travels as a
 * navigation param, so it must survive JSON.
 */
export interface ScannerPageEditOutcome {
  readonly pageId: string;
  readonly edit: ScannerPageEdit;
  readonly processedUri: string;
}

export const SCANNER_PDF_MIME_TYPE = 'application/pdf';
export const SCANNER_PDF_EXTENSION = 'pdf';

/** Informational provenance tag; no schema expansion required. */
export const SCANNER_INTAKE_SOURCE = 'files:scanner';

// ---------------------------------------------------------------------------
// Page list operations (pure; capture order is the source of truth)
// ---------------------------------------------------------------------------

/** Create a ScannerPage from a fresh capture. */
export function createScannerPage(id: string, uri: string, width?: number, height?: number): ScannerPage {
  return {
    id,
    originalUri: uri,
    processedUri: null,
    width,
    height,
    edit: null,
  };
}

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

/**
 * Adopt a confirmed editor outcome: apply the canonical edit parameters and
 * take ownership of the freshly generated processed file. The caller is
 * responsible for deleting the page's PREVIOUS processedUri first — this
 * function is pure and never touches the filesystem.
 *
 * Unknown pageId is a no-op, so a late outcome for a deleted page can never
 * resurrect it.
 */
export function adoptPageEditOutcome(
  pages: readonly ScannerPage[],
  outcome: ScannerPageEditOutcome,
): ScannerPage[] {
  return pages.map((page) =>
    page.id === outcome.pageId
      ? { ...page, edit: outcome.edit, processedUri: outcome.processedUri }
      : page,
  );
}

/**
 * Reset a page's edits (back to original). The caller deletes the page's
 * processedUri BEFORE calling this; the function itself stays pure.
 */
export function resetPageEdit(pages: readonly ScannerPage[], pageId: string): ScannerPage[] {
  return pages.map((page) =>
    page.id === pageId ? { ...page, edit: null, processedUri: null } : page,
  );
}

/** Get the effective URI for a page (processed if edited, otherwise original). */
export function getPageEffectiveUri(page: ScannerPage): string {
  return page.processedUri ?? page.originalUri;
}

/**
 * Effective dimensions for a page: what the PDF (and any preview) actually
 * embeds. With an edit, this is the RESULT of the exact same processing plan
 * the editor runs — crop size after rotation — so the PDF page aspect always
 * matches the generated image. One geometry authority for editor and PDF.
 */
export function getPageEffectiveDimensions(page: ScannerPage): { width: number; height: number } | null {
  if (!page.width || !page.height) return null;
  const source = { width: page.width, height: page.height };
  if (!page.edit) return source;
  const plan = buildImageProcessingPlan(source, page.edit.cropRect, page.edit.rotationSteps);
  return plan.status === 'ok' ? plan.resultSize : orientedSize(source, page.edit.rotationSteps);
}

/**
 * PDF cache key: content identity of the whole scan. It is built from the
 * EFFECTIVE image per page, so any adoption, retake, reset, deletion or reorder
 * changes the key and the previously generated PDF is never reused. Same
 * content + same name -> same key (cache hit).
 */
export function buildScanPdfCacheKey(pages: readonly ScannerPage[], name: string): string {
  return `${pages.map((page) => `${page.id}:${getPageEffectiveUri(page)}`).join('|')}#${name}`;
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
