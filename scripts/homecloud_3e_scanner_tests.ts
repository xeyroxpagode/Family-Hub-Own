/**
 * HomeCloud HC-3E — Document Scanner pure-logic tests (compiled).
 *
 * Covers capture-model semantics, filename normalization, PDF HTML ordering
 * and folder destination propagation. No camera automation: native Expo
 * modules are never imported here.
 *
 * Run via `node scripts/compiled/scripts/homecloud_3e_scanner_tests.js`.
 */

import {
  appendPage,
  buildScanPdfHtml,
  buildScannerArtifact,
  buildScannerIntakeContext,
  canCreatePdf,
  defaultScanFileName,
  deletePage,
  normalizeScanFileName,
  replacePage,
  SCANNER_INTAKE_SOURCE,
  SCANNER_PDF_MIME_TYPE,
  type ScannerPage,
} from '../front/mi-front-limpio/services/homecloud/homecloudScanner';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

const page = (id: string): ScannerPage => ({ id, uri: `file:///tmp/${id}.jpg`, width: 1000, height: 1400 });
const now = new Date(2026, 8, 25, 13, 30); // 25-09-2026

console.log('\n=== HC-3E SCANNER PURE LOGIC TESTS ===\n');

// --- page order ---
const pages = [page('a'), page('b'), page('c')];
record(JSON.stringify(appendPage([], pages[0]).map((p) => p.id)) === '["a"]', 'append starts order');
record(JSON.stringify(appendPage(appendPage([pages[0]], pages[1]), pages[2]).map((p) => p.id)) === '["a","b","c"]', 'append preserves capture order');
record(appendPage(pages, page('d')).map((p) => p.id).join(',') === 'a,b,c,d', 'adding page appends at the end');

// --- retake replaces the SAME index ---
const retaken = replacePage(pages, 'b', { id: 'b2', uri: 'file:///tmp/b2.jpg' });
record(retaken.map((p) => p.id).join(',') === 'a,b2,c', 'retake keeps page position');
record(retaken[1].uri === 'file:///tmp/b2.jpg', 'retake swaps the capture uri');
record(retaken[0].uri === pages[0].uri && retaken[2].uri === pages[2].uri, 'retake leaves other pages untouched');
record(pages[1].id === 'b', 'retake does not mutate the input list');

// --- delete ---
record(deletePage(pages, 'b').map((p) => p.id).join(',') === 'a,c', 'delete removes the page, keeps order');
record(deletePage([pages[0]], 'a').length === 0, 'deleting the final page returns the empty state');
record(deletePage(pages, 'missing').length === 3, 'delete of unknown id is a no-op');

// --- zero pages rejected ---
record(canCreatePdf([]) === false, 'cannot create PDF with 0 pages');
record(canCreatePdf([pages[0]]) === true, 'can create PDF with 1 page');
let threwOnEmpty = false;
try { buildScanPdfHtml([]); } catch { threwOnEmpty = true; }
record(threwOnEmpty, 'PDF HTML generation rejects 0 pages');

// --- filename normalization ---
record(normalizeScanFileName('  factura luz  ', now) === 'factura luz.pdf', 'trims whitespace and appends .pdf');
record(normalizeScanFileName('factura.pdf', now) === 'factura.pdf', 'keeps a single existing .pdf');
record(normalizeScanFileName('factura.pdf.pdf', now) === 'factura.pdf', 'never duplicates .pdf.pdf');
record(normalizeScanFileName('factura.PDF', now) === 'factura.pdf', 'extension matching is case-insensitive');
record(normalizeScanFileName('factura.pdf .pdf', now) === 'factura.pdf', 'strips repeated extension with spacing');
record(normalizeScanFileName('', now) === 'Escaneo - 25-09-2026.pdf', 'empty name falls back to the suggestion');
record(normalizeScanFileName('   ', now) === 'Escaneo - 25-09-2026.pdf', 'whitespace-only name falls back to the suggestion');
record(normalizeScanFileName('.pdf', now) === 'Escaneo - 25-09-2026.pdf', 'extension-only name falls back to the suggestion');
record(normalizeScanFileName(normalizeScanFileName('Factura Final.pdf.pdf', now), now) === 'Factura Final.pdf', 'normalization is idempotent');
record(defaultScanFileName(now) === 'Escaneo - 25-09-2026.pdf', 'default suggestion is Escaneo - DD-MM-YYYY.pdf');

// --- PDF HTML ---
const html = buildScanPdfHtml([
  { base64: 'QUJD', width: 100, height: 200 },
  { base64: 'REVG', width: 200, height: 100 },
  { base64: 'R0hJ' },
]);
record(html.indexOf('data:image/jpeg;base64,QUJD') < html.indexOf('data:image/jpeg;base64,REVG') && html.indexOf('data:image/jpeg;base64,REVG') < html.indexOf('data:image/jpeg;base64,R0hJ'), 'PDF HTML keeps pages in capture order');
record((html.match(/data:image\/jpeg;base64,/g) ?? []).length === 3, 'one embedded image per scanned page');
record((html.match(/page-break-after: always/g) ?? []).length === 1 && html.includes('page-break-after: auto'), 'forced page break between pages except the last one');
record(html.includes('object-fit: contain'), 'aspect ratio preserved (no cropping)');
record(html.includes('background: #ffffff'), 'white page background');
record(!/homeplus|familyhub|escaneo de|<header|<footer/i.test(html), 'no branding, headers or footers in the document');
record(!html.includes('25-09-2026') && !html.includes('2026'), 'no timestamps printed onto the document');

// --- artifact contract (shared upload intake shape) ---
const artifact = buildScannerArtifact({ localUri: 'file:///tmp/scan.pdf', sizeBytes: 12345, displayName: 'Escaneo.pdf.pdf' });
record(artifact.mimeType === SCANNER_PDF_MIME_TYPE && artifact.mimeType === 'application/pdf', 'artifact mimeType is application/pdf');
record(artifact.extension === 'pdf', 'artifact extension is pdf');
record(artifact.displayName === 'Escaneo.pdf', 'artifact displayName is normalized');
record(artifact.sizeBytes === 12345 && artifact.localUri === 'file:///tmp/scan.pdf', 'artifact keeps uri and size');

// --- folder destination propagation (Root vs Folder) ---
const rootCtx = buildScannerIntakeContext(null);
record(rootCtx.role === 'file', 'scanner produces a File (role=file)');
record(rootCtx.initialFolderId === null, 'launched from Root -> folderId null');
record(rootCtx.intakeSource === SCANNER_INTAKE_SOURCE && SCANNER_INTAKE_SOURCE === 'files:scanner', 'provenance tag without schema expansion');
record(buildScannerIntakeContext('folder-9').initialFolderId === 'folder-9', 'launched from Folder X -> folderId X');

console.log(`\nHC3E_SCANNER_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) { process.exitCode = 1; console.error('HC3E_SCANNER_TESTS=FAIL'); }
else { console.log('HC3E_SCANNER_TESTS=PASS'); }
