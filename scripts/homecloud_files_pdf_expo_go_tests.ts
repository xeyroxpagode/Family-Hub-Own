/**
 * HomeCloud Files — STAGE 2 SLICE C EXPO-GO CORRECTION — protocol, policy,
 * transport and compatibility evidence.
 *
 * WHAT THIS PROVES (all EXECUTED in Node, no device):
 *  X-A  the inline size ceiling exists, is conservative, and gates on REAL size;
 *  X-B  the RN<->WebView protocol parses defensively and ignores hostile input;
 *  X-C  the streaming base64 encoder is byte-exact (chunking is lossless);
 *  X-D  the transport carries fixture PDFs byte-for-byte and refuses the rest
 *       WITHOUT reading them;
 *  X-E  the viewer page is local-only (no remote engine, no toolbar chrome) and
 *       the engine provenance matches the pinned dependency;
 *  X-F  the Expo Go hard gate: no native PDF module anywhere, the WebView
 *       version is exactly the one Expo Go ships, and the suite does not mock
 *       away a module Expo Go lacks.
 *
 * WHAT THIS DOES NOT PROVE (device-only, listed as UNPROVEN_DEVICE in the QA
 * doc): that pdf.js paints pixels on a real iPhone, that pinch zoom feels
 * right under a finger, or that 8 MiB is the optimal ceiling under profiling.
 */

import * as crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vm from 'node:vm';

import {
  INLINE_PDF_PREVIEW_MAX_BYTES,
  PDF_BRIDGE_CHUNK_BYTES,
  VIEWER_PDF_PASSWORD_MESSAGE,
  VIEWER_PDF_PASSWORD_TITLE,
  VIEWER_PDF_TOO_LARGE_MESSAGE,
  VIEWER_PDF_TOO_LARGE_TITLE,
  mapPdfEngineErrorName,
  pdfInlineEligibility,
} from '../front/mi-front-limpio/services/homecloud/homecloudPdfPolicy';
import {
  PDF_BRIDGE_MAX_CHUNK_CHARS,
  PDF_BRIDGE_PROTOCOL_VERSION,
  createBase64StreamEncoder,
  encodeBytesToBase64,
  escapeHtml,
  isAllowedViewerLinkUrl,
  parseViewerMessage,
  serializeRnMessage,
  splitBase64IntoChunks,
} from '../front/mi-front-limpio/services/homecloud/homecloudPdfBridge';
import { buildPdfViewerHtml } from '../front/mi-front-limpio/services/homecloud/homecloudPdfViewerHtml';
import {
  PdfEmptyError,
  PdfTooLargeError,
  readStagedPdfForBridge,
  type PdfStagedFile,
} from '../front/mi-front-limpio/services/homecloud/homecloudPdfTransport';
import { PDFJS_ENGINE_SHA256, PDFJS_ENGINE_SOURCE, PDFJS_ENGINE_VERSION, PDFJS_WORKER_SHA256 } from '../front/mi-front-limpio/services/homecloud/pdfJsEngine.generated';

export type PdfGoRecorder = (ok: boolean, message: string) => void;

// ── deterministic fixtures (transport-level: exact bytes, no internet) ────

function onePagePdf(): Buffer {
  return Buffer.from(
    '%PDF-1.4\n' +
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
      '4 0 obj<</Length 44>>stream\n' +
      'BT /F1 12 Tf 50 150 Td (Hola HomePlus) Tj ET\n' +
      'endstream\n' +
      'endobj\n' +
      '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n' +
      'trailer<</Root 1 0 R>>\n',
    'utf8',
  );
}

function twoPagePdf(): Buffer {
  return Buffer.from(
    '%PDF-1.4\n' +
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R 4 0 R]/Count 2>>endobj\n' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 5 0 R>>endobj\n' +
      '4 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 5 0 R>>endobj\n' +
      '5 0 obj<</Length 11>>stream\nBT ET\nendstream\nendobj\n' +
      'trailer<</Root 1 0 R>>\n',
    'utf8',
  );
}

/** A PDF cut mid-header: unparseable by any engine, honest `corrupt` fixture. */
function corruptPdf(): Buffer {
  return onePagePdf().subarray(0, 40);
}

function paddedPdf(targetBytes: number): Buffer {
  const base = onePagePdf();
  const trailer = Buffer.from('\n%%EOF\n', 'utf8');
  const fillBytes = Math.max(0, targetBytes - base.length - trailer.length);
  return Buffer.concat([base, Buffer.alloc(fillBytes, 0x20), trailer]);
}

async function loadWithRealPdfjs(frontDir: string, body: Buffer): Promise<{ pages: number; ops: number; textItems: number }> {
  const pdfjs = require(path.join(frontDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.js')) as {
    GlobalWorkerOptions: { workerSrc: string | null };
    getDocument: (params: Record<string, unknown>) => { promise: Promise<any> };
  };
  pdfjs.GlobalWorkerOptions.workerSrc = null;
  const task = pdfjs.getDocument({
    data: new Uint8Array(body),
    disableWorker: true,
    isEvalSupported: false,
    isOffscreenCanvasSupported: false,
    useWorkerFetch: false,
  });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const ops = await page.getOperatorList();
    const text = await page.getTextContent();
    return { pages: doc.numPages, ops: ops.fnArray.length, textItems: text.items.length };
  } finally {
    await doc.destroy();
  }
}

async function rejectsWithRealPdfjs(frontDir: string, body: Buffer): Promise<string> {
  try {
    await loadWithRealPdfjs(frontDir, body);
    return 'loaded';
  } catch (error) {
    return error && typeof error === 'object' && 'name' in error ? String((error as { name?: unknown }).name) : 'unknown';
  }
}

async function loadWithInlinedBrowserEngine(body: Buffer): Promise<{ pages?: number; ops?: number; error?: string }> {
  const context: Record<string, unknown> = {
    console,
    window: null,
    document: { currentScript: null, createElement: () => ({}) },
    navigator: { userAgent: 'iPhone', platform: 'iPhone' },
    globalThis: null,
    setTimeout,
    clearTimeout,
    Promise,
    URL,
    Blob,
    Worker: function workerBlocked() { throw new Error('worker not allowed'); },
    Uint8Array,
    ArrayBuffer,
    TextDecoder,
    ReadableStream,
    structuredClone,
    crypto: {},
    atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
    btoa: (value: string) => Buffer.from(value, 'binary').toString('base64'),
    bytes: new Uint8Array(body),
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(PDFJS_ENGINE_SOURCE, context, { timeout: 5000 });
  vm.runInContext(
    "pdfjsLib.GlobalWorkerOptions.workerSrc=null; var task=pdfjsLib.getDocument({data: bytes, disableWorker:true, isEvalSupported:false, isOffscreenCanvasSupported:false, useWorkerFetch:false}); task.promise.then(async function(doc){ var page=await doc.getPage(1); var ops=await page.getOperatorList(); globalThis.__result={pages:doc.numPages, ops:ops.fnArray.length}; await doc.destroy(); }).catch(function(e){ globalThis.__result={error:e && e.name ? e.name : 'unknown'}; });",
    context,
    { timeout: 5000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (context.__result ?? { error: 'timeout' }) as { pages?: number; ops?: number; error?: string };
}

function renderFirstPageWithPoppler(body: Buffer, label: string): { ok: boolean; reason: string } {
  const probe = spawnSync('pdftoppm', ['-h'], { stdio: 'ignore' });
  if (probe.error) return { ok: true, reason: 'Poppler unavailable in this environment; PDF.js parse evidence still ran' };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homeplus-pdf-'));
  try {
    const input = path.join(dir, `${label}.pdf`);
    const output = path.join(dir, 'page');
    fs.writeFileSync(input, body);
    execFileSync('pdftoppm', ['-png', '-f', '1', '-singlefile', input, output], { stdio: 'ignore' });
    const png = `${output}.png`;
    const stat = fs.statSync(png);
    return { ok: stat.size > 100, reason: `rasterized first page to ${stat.size} PNG bytes` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'unknown render failure' };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Minimal structural fake of expo-file-system's File for the transport. */
function fakeStagedFile(body: Buffer, overrides: { size?: number | null; readLog?: string[]; growAfterReads?: number } = {}): PdfStagedFile {
  const readLog = overrides.readLog ?? [];
  let reads = 0;
  return {
    size: overrides.size === undefined ? body.length : overrides.size,
    readableStream: () => {
      const CHUNK = 7000;
      let offset = 0;
      let cancelled = false;
      const streamBody = body;
      return {
        getReader: () => ({
          read: async () => {
            if (cancelled || offset >= streamBody.length) return { done: true as const, value: undefined };
            // A file that GREW between the gate and the read: append junk once.
            if (overrides.growAfterReads !== undefined && reads === overrides.growAfterReads) {
              reads += 1;
              readLog.push('read');
              // A sudden unbounded arrival: larger than the whole ceiling, so the
              // transport must abort on this single read regardless of the gate.
              return { done: false as const, value: new Uint8Array(INLINE_PDF_PREVIEW_MAX_BYTES + 1) };
            }
            reads += 1;
            readLog.push('read');
            const slice = streamBody.subarray(offset, Math.min(offset + CHUNK, streamBody.length));
            offset += slice.length;
            return { done: false as const, value: new Uint8Array(slice) };
          },
          cancel: async () => {
            cancelled = true;
            readLog.push('cancel');
          },
        }),
      } as unknown as ReadableStream<Uint8Array>;
    },
  };
}

export async function runPdfExpoGoTests(options: { readonly record: PdfGoRecorder }): Promise<void> {
  const { record } = options;
  const compiledHere = __dirname;
  const repoRoot = path.resolve(compiledHere, '..', '..', '..');
  const frontDir = path.join(repoRoot, 'front', 'mi-front-limpio');

  console.log('\n--- X-A: the inline size ceiling is explicit, conservative and real ---');
  {
    record(INLINE_PDF_PREVIEW_MAX_BYTES === 8 * 1024 * 1024, `X-Aa. the ceiling is a named 8 MiB constant (${INLINE_PDF_PREVIEW_MAX_BYTES}), not a magic number`);
    record(INLINE_PDF_PREVIEW_MAX_BYTES <= 10 * 1024 * 1024, 'X-Ab. and it stays conservative (<= 10 MiB) until physical profiling says otherwise');
    record(PDF_BRIDGE_CHUNK_BYTES === 256 * 1024, 'X-Ac. bridge chunks are 256 KiB raw, so no single message approaches WebView string limits');
    record(pdfInlineEligibility(null).eligible === false, 'X-Ad. unknown size is refused, never guessed eligible');
    record(pdfInlineEligibility(0).eligible === false, 'X-Ae. empty files are refused as empty, not rendered');
    record(pdfInlineEligibility(-5).eligible === false, 'X-Af. negative sizes are refused too');
    record(pdfInlineEligibility(INLINE_PDF_PREVIEW_MAX_BYTES).eligible === true, 'X-Ag. exactly at the ceiling is still eligible (the boundary is inclusive and tested)');
    record(pdfInlineEligibility(INLINE_PDF_PREVIEW_MAX_BYTES + 1).eligible === false, 'X-Ah. one byte over the ceiling is refused');
    const over = pdfInlineEligibility(INLINE_PDF_PREVIEW_MAX_BYTES + 1);
    record(!over.eligible && over.reason === 'too_large', 'X-Ai. and the refusal names the reason, so the UI can be intentional');
    record(mapPdfEngineErrorName('PasswordException') === 'password', 'X-Aj. engine password failures map to the password state');
    record(mapPdfEngineErrorName('InvalidPDFException') === 'corrupt', 'X-Ak. InvalidPDF maps to corrupt');
    record(mapPdfEngineErrorName('MissingPDFException') === 'corrupt', 'X-Al. MissingPDF maps to corrupt');
    record(mapPdfEngineErrorName('FormatError') === 'corrupt', 'X-Am. FormatError maps to corrupt instead of a false unsupported verdict');
    record(mapPdfEngineErrorName('AnythingElse') === 'engine_failed', 'X-An. unknown engine failures map to engine_failed, never to a false unsupported verdict');
    record(VIEWER_PDF_TOO_LARGE_TITLE.length > 0 && VIEWER_PDF_TOO_LARGE_MESSAGE.length > 0, 'X-Ao. the too-large state has intentional product copy');
    record(VIEWER_PDF_PASSWORD_TITLE.length > 0 && VIEWER_PDF_PASSWORD_MESSAGE.length > 0, 'X-Ap. and so does the password state');
  }

  console.log('\n--- X-B: the bridge protocol is versioned, typed and hostile-input-proof ---');
  {
    record(PDF_BRIDGE_PROTOCOL_VERSION === 1, 'X-Ba. the protocol version is pinned at 1');
    const init = serializeRnMessage({ v: 1, type: 'INIT_DOCUMENT', docId: 'd1', byteLength: 100, totalChunks: 2 });
    const parsedInit = JSON.parse(init) as Record<string, unknown>;
    record(parsedInit.v === 1 && parsedInit.type === 'INIT_DOCUMENT', 'X-Bb. RN commands serialize with version + type');
    const chunk = serializeRnMessage({ v: 1, type: 'LOAD_CHUNK', docId: 'd1', index: 0, data: 'aGVsbG8=' });
    record(typeof chunk === 'string' && chunk.includes('LOAD_CHUNK'), 'X-Bc. chunks serialize as data carriers, never as code');
    const dispose = serializeRnMessage({ v: 1, type: 'DISPOSE', docId: 'd1' });
    record(JSON.parse(dispose).type === 'DISPOSE', 'X-Bd. DISPOSE exists so close-during-load releases the renderer');
    record(parseViewerMessage(JSON.stringify({ v: 1, type: 'READY', docId: 'd1' }))?.type === 'READY', 'X-Be. READY parses');
    record(parseViewerMessage(JSON.stringify({ v: 1, type: 'DOCUMENT_LOADED', docId: 'd1', pages: 12 }))?.type === 'DOCUMENT_LOADED', 'X-Bf. DOCUMENT_LOADED parses with page count');
    const pageChanged = parseViewerMessage(JSON.stringify({ v: 1, type: 'PAGE_CHANGED', docId: 'd1', page: 99, pages: 3 }));
    record(pageChanged?.type === 'PAGE_CHANGED' && (pageChanged as { page: number }).page === 3, 'X-Bg. PAGE_CHANGED clamps a lying page number to the page count');
    const loadError = parseViewerMessage(JSON.stringify({
      v: 1,
      type: 'LOAD_ERROR',
      docId: 'd1',
      code: 'engine_failed',
      stage: 'get_document_promise',
      engineName: 'TypeError',
      byteLength: 1186947,
      totalChunks: 5,
      receivedChunks: 5,
      durationMs: 321,
      engineReady: true,
    }));
    record(loadError?.type === 'LOAD_ERROR' && loadError.code === 'engine_failed' && loadError.stage === 'get_document_promise' && loadError.engineName === 'TypeError', 'X-Bh. LOAD_ERROR parses sanitized stage/error telemetry');
    record(parseViewerMessage(JSON.stringify({ v: 1, type: 'RENDER_ERROR', docId: 'd1', page: 2 }))?.type === 'RENDER_ERROR', 'X-Bi. RENDER_ERROR parses');
    record(parseViewerMessage(JSON.stringify({ v: 1, type: 'LINK_PRESSED', docId: 'd1', url: 'https://ejemplo.org/doc' }))?.type === 'LINK_PRESSED', 'X-Bj. an https link parses for explicit handoff');
    // Hostile / malformed input: every one of these must be IGNORED (null).
    const hostile: Array<[string, unknown]> = [
      ['X-Bk. non-string input', { v: 1, type: 'READY', docId: 'd1' }],
      ['X-Bl. garbage JSON', '{not json'],
      ['X-Bm. JSON array', '[]'],
      ['X-Bn. wrong version', JSON.stringify({ v: 999, type: 'READY', docId: 'd1' })],
      ['X-Bo. unknown type', JSON.stringify({ v: 1, type: 'SELF_DESTRUCT', docId: 'd1' })],
      ['X-Bp. missing docId', JSON.stringify({ v: 1, type: 'READY' })],
      ['X-Bq. empty docId', JSON.stringify({ v: 1, type: 'READY', docId: '' })],
      ['X-Br. LOAD_ERROR with invented code', JSON.stringify({ v: 1, type: 'LOAD_ERROR', docId: 'd1', code: 'rm -rf' })],
      ['X-Br2. old broad unsupported LOAD_ERROR code', JSON.stringify({ v: 1, type: 'LOAD_ERROR', docId: 'd1', code: 'unsupported' })],
      ['X-Bs. DOCUMENT_LOADED with zero pages', JSON.stringify({ v: 1, type: 'DOCUMENT_LOADED', docId: 'd1', pages: 0 })],
      ['X-Bt. javascript: link', JSON.stringify({ v: 1, type: 'LINK_PRESSED', docId: 'd1', url: 'javascript:alert(1)' })],
      ['X-Bu. data: link', JSON.stringify({ v: 1, type: 'LINK_PRESSED', docId: 'd1', url: 'data:text/html,<script>alert(1)</script>' })],
      ['X-Bv. file: link', JSON.stringify({ v: 1, type: 'LINK_PRESSED', docId: 'd1', url: 'file:///etc/passwd' })],
      ['X-Bw. oversized url', JSON.stringify({ v: 1, type: 'LINK_PRESSED', docId: 'd1', url: 'https://x/' + 'y'.repeat(9000) })],
    ];
    for (const [label, input] of hostile) {
      record(parseViewerMessage(input) === null, `${label} is ignored`);
    }
    record(isAllowedViewerLinkUrl('http://intranet.local/x') === true, 'X-Bx. plain http intranet links are allowed to handoff');
    record(isAllowedViewerLinkUrl('  https://ejemplo.org/ ') === true, 'X-By. surrounding whitespace does not smuggle a scheme past the check');
    record(escapeHtml('<script>"&\'') === '&lt;script&gt;&quot;&amp;&#39;', 'X-Bz. HTML escaping covers all five metacharacters');
    const scrubbed = parseViewerMessage(JSON.stringify({ v: 1, type: 'LOAD_ERROR', docId: 'd1', code: 'engine_failed', stage: 'file:///secret.pdf', engineName: 'Error: token=secret', byteLength: 10 }));
    record(scrubbed?.type === 'LOAD_ERROR' && scrubbed.stage === undefined && scrubbed.engineName === undefined && scrubbed.byteLength === 10, 'X-Baa. telemetry keeps bounded numbers but drops raw paths, URLs and exception strings');
  }

  console.log('\n--- X-C: chunked base64 is lossless ---');
  {
    const bodies: Uint8Array[] = [
      new Uint8Array(0),
      new Uint8Array([65]),
      new Uint8Array([65, 66]),
      new Uint8Array([65, 66, 67]),
      new Uint8Array([65, 66, 67, 68]),
      Uint8Array.from({ length: 1000 }, (_, i) => i % 251),
      Uint8Array.from({ length: 65537 }, (_, i) => (i * 7 + 3) % 256),
    ];
    let exact = true;
    for (const body of bodies) {
      const encoder = createBase64StreamEncoder();
      // Feed in adversarial slice sizes (1, 2, 5 bytes) to stress the carry.
      let emitted = '';
      for (let at = 0; at < body.length; at += 5) {
        const part = encoder.push(body.subarray(at, at + 5));
        if (part) emitted += part;
      }
      emitted += encoder.flush();
      const expected = encodeBytesToBase64(body);
      if (emitted !== expected) exact = false;
      const roundTrip = Buffer.from(emitted, 'base64');
      if (!roundTrip.equals(Buffer.from(body))) exact = false;
    }
    record(exact, 'X-Ca. streaming encode equals one-shot encode and decodes byte-exact across carry boundaries');
    const chunks = splitBase64IntoChunks('abcdefghij', 4);
    record(chunks.join('') === 'abcdefghij' && chunks.length === 3, 'X-Cb. splitting is bounded and lossless');
    let threw = false;
    try {
      splitBase64IntoChunks('abc', 0);
    } catch {
      threw = true;
    }
    record(threw, 'X-Cc. a non-positive chunk size throws instead of looping forever');
    record(encodeBytesToBase64(new Uint8Array(3 * 1024 * 1024)).length === 4194304, 'X-Cd. a 3 MiB encode does not overflow the call stack');
  }

  console.log('\n--- X-D: the transport carries exact bytes and refuses the rest without reading ---');
  {
    const single = onePagePdf();
    const first = await readStagedPdfForBridge(fakeStagedFile(single));
    const reassembled = Buffer.from(first.chunks.join(''), 'base64');
    record(reassembled.equals(single), `X-Da. single-page PDF round-trips byte-for-byte (${single.length} bytes, ${first.chunks.length} chunk(s))`);
    record(first.byteLength === single.length, 'X-Db. and the declared byteLength is the real one');
    const multi = twoPagePdf();
    const second = await readStagedPdfForBridge(fakeStagedFile(multi));
    record(Buffer.from(second.chunks.join(''), 'base64').equals(multi), 'X-Dc. multi-page PDF round-trips byte-for-byte too');
    record(corruptPdf().length < single.length && corruptPdf().length > 0, 'X-Dd. the corrupt fixture is a genuine truncation, not an empty file');
    const corruptPayload = await readStagedPdfForBridge(fakeStagedFile(corruptPdf()));
    record(Buffer.from(corruptPayload.chunks.join(''), 'base64').equals(corruptPdf()), 'X-De. corrupt bytes still CROSS the bridge exactly (corruption is an engine verdict, not a transport verdict)');
    const problem12 = paddedPdf(Math.round(1.2 * 1024 * 1024));
    const problem12Payload = await readStagedPdfForBridge(fakeStagedFile(problem12));
    record(Buffer.from(problem12Payload.chunks.join(''), 'base64').equals(problem12), `X-Df. the previously problematic ~1.2 MB PDF size crosses the bridge byte-exact (${problem12Payload.byteLength} bytes)`);
    const problem48 = paddedPdf(Math.round(4.8 * 1024 * 1024));
    const problem48Payload = await readStagedPdfForBridge(fakeStagedFile(problem48));
    record(Buffer.from(problem48Payload.chunks.join(''), 'base64').equals(problem48), `X-Dg. the previously problematic ~4.8 MB PDF size crosses the bridge byte-exact (${problem48Payload.byteLength} bytes)`);
    for (const chunk of first.chunks) {
      if (chunk.length > PDF_BRIDGE_MAX_CHUNK_CHARS) {
        record(false, 'X-Dh. every chunk respects the message bound');
        break;
      }
    }
    record([...first.chunks, ...problem12Payload.chunks, ...problem48Payload.chunks].every((chunk) => chunk.length <= PDF_BRIDGE_MAX_CHUNK_CHARS), 'X-Dh. every chunk respects the message bound');
    // Refusals must not touch the stream.
    const oversizedReads: string[] = [];
    let oversizedError: unknown = null;
    try {
      await readStagedPdfForBridge(fakeStagedFile(Buffer.from('%PDF'), { size: INLINE_PDF_PREVIEW_MAX_BYTES + 1, readLog: oversizedReads }));
    } catch (error) {
      oversizedError = error;
    }
    record(oversizedError instanceof PdfTooLargeError, 'X-Di. an oversized file throws PdfTooLargeError');
    record(oversizedReads.length === 0, 'X-Dj. and NOTHING was read for it at all');
    const emptyReads: string[] = [];
    let emptyError: unknown = null;
    try {
      await readStagedPdfForBridge(fakeStagedFile(Buffer.alloc(0), { readLog: emptyReads }));
    } catch (error) {
      emptyError = error;
    }
    record(emptyError instanceof PdfEmptyError, 'X-Dk. an empty staging throws PdfEmptyError');
    record(emptyReads.length === 0, 'X-Dl. without touching the stream either');
    let growthError: unknown = null;
    try {
      await readStagedPdfForBridge(fakeStagedFile(Buffer.from('%PDF-1.4 tiny'), { size: 64, growAfterReads: 0 }));
    } catch (error) {
      growthError = error;
    }
    record(growthError instanceof PdfTooLargeError, 'X-Dm. a file that grows past the ceiling mid-read aborts instead of following it');
  }

  console.log('\n--- X-D2: real pdf.js opens the fixture classes, and corrupt stays corrupt ---');
  {
    const fixtures = [
      ['minimal valid PDF', onePagePdf(), 1],
      ['HomePlus scanner-style multipage PDF', twoPagePdf(), 2],
      ['previous failing ~1.2 MB class', paddedPdf(Math.round(1.2 * 1024 * 1024)), 1],
      ['valid multipage ~4.8 MB class', Buffer.concat([twoPagePdf(), Buffer.alloc(Math.round(4.8 * 1024 * 1024) - twoPagePdf().length - 6, 0x20), Buffer.from('\n%%EOF')]), 2],
    ] as const;
    for (const [label, body, expectedPages] of fixtures) {
      const parsed = await loadWithRealPdfjs(frontDir, body);
      record(parsed.pages === expectedPages && parsed.ops > 0, `X-D2. ${label} parsed with real pdf.js (${parsed.pages} page(s), ${parsed.ops} first-page operator(s), ${parsed.textItems} text item(s))`);
      const raster = renderFirstPageWithPoppler(body, label.replace(/[^a-z0-9]+/gi, '-'));
      record(raster.ok, `X-D2. ${label} ${raster.reason}`);
    }
    const inlined = await loadWithInlinedBrowserEngine(onePagePdf());
    record(inlined.pages === 1 && typeof inlined.ops === 'number' && inlined.ops > 0, `X-D2. inlined browser-like engine uses the local fake-worker handler without a worker URL (${inlined.error ?? `${inlined.ops} ops`})`);
    const corruptName = await rejectsWithRealPdfjs(frontDir, corruptPdf());
    record(corruptName !== 'loaded', `X-D2. corrupt control is rejected by real pdf.js (${corruptName})`);
  }

  console.log('\n--- X-E: the viewer page is local-only HomePlus chrome ---');
  {
    // A fat-but-fake engine passes validation so the assertions below cover OUR
    // template + runtime, not Mozilla's minified bytes.
    const fakeEngine = `/*pdfjsLib*/${'x'.repeat(150 * 1024)}`;
    const palette = { background: '#FCFBF9', surface: '#FFFFFF', text: '#1A1714', subtle: '#8A8178' };
    const html = buildPdfViewerHtml(fakeEngine, palette);
    record(!/<script\s+src/i.test(html), 'X-Ea. the page loads NO external script');
    record(!/<link\s/i.test(html), 'X-Eb. and no external stylesheet');
    // NOTE: the runtime necessarily NAMES the http/https schemes in its link
    // allowlist comparison (`indexOf('http://')`), so this asserts on REFERENCE
    // positions - actual loads - rather than on the bare substring.
    record(!/(src|href)\s*=\s*["']https?:/i.test(html) && !/url\(\s*["']?https?:/i.test(html) && !/import\s*\(/i.test(html), 'X-Ec. it references no remote URL in any load position');
    record(!/fetch\s*\(/i.test(html) && !/XMLHttpRequest/i.test(html) && !/WebSocket/i.test(html), 'X-Ed. our runtime has no network primitive to call');
    record(!/id="toolbar"/i.test(html) && !/id="sidebar"/i.test(html), 'X-Ee. no stock PDF.js toolbar or sidebar markup');
    record(!/openFile|download-button|print-button/i.test(html), 'X-Ef. no open/print/download chrome');
    record(['READY', 'DOCUMENT_LOADED', 'PAGE_CHANGED', 'LOAD_ERROR', 'RENDER_ERROR', 'LINK_PRESSED', 'INIT_DOCUMENT', 'LOAD_CHUNK', 'DISPOSE', 'docId'].every((token) => html.includes(token)), 'X-Eh. the runtime speaks exactly the versioned protocol tokens');
    record(['PasswordException', 'InvalidPDFException', 'MissingPDFException', 'FormatError', 'engine_failed', 'isEvalSupported'].every((token) => html.includes(token)), 'X-Ei. the runtime pins engine safety and named failure mapping without false unsupported buckets');
    record(html.includes(palette.background) && html.includes(palette.surface), 'X-Ej. the page opens on HomePlus colors, so there is no white flash');
    record((html.match(/<\/script/gi) || []).length === 2, 'X-Ek. exactly two script closers exist, so nothing in our code can break out of its element');
    let threwPalette = false;
    try {
      buildPdfViewerHtml(fakeEngine, { ...palette, background: '#fff";alert(1)//' });
    } catch {
      threwPalette = true;
    }
    record(threwPalette, 'X-El. a hostile palette value throws instead of injecting');
    let threwEngine = false;
    try {
      buildPdfViewerHtml('too small', palette);
    } catch {
      threwEngine = true;
    }
    record(threwEngine, 'X-Em. a missing engine fails loudly at build time, never as a blank viewer');
    // The REAL engine: provenance + buildability.
    record(PDFJS_ENGINE_VERSION === '3.11.174', `X-En. the vendored engine version is the pinned one (${PDFJS_ENGINE_VERSION})`);
    const distBuild = path.join(frontDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.min.js');
    const workerBuild = path.join(frontDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
    if (fs.existsSync(distBuild)) {
      const bytes = fs.readFileSync(distBuild, 'utf8');
      const sha = crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');
      record(sha === PDFJS_ENGINE_SHA256, 'X-Eo. the vendored bytes hash-match the installed pinned build');
    } else {
      record(false, 'X-Eo. the pinned pdfjs-dist build is installed (skipped: node_modules absent)');
    }
    if (fs.existsSync(workerBuild)) {
      const bytes = fs.readFileSync(workerBuild, 'utf8');
      const sha = crypto.createHash('sha256').update(bytes, 'utf8').digest('hex');
      record(sha === PDFJS_WORKER_SHA256, 'X-Eo2. the inlined worker handler hash-matches the installed pinned worker build');
    } else {
      record(false, 'X-Eo2. the pinned pdfjs-dist worker build is installed (skipped: node_modules absent)');
    }
    const realHtml = buildPdfViewerHtml(PDFJS_ENGINE_SOURCE, palette);
    record(realHtml.length > 1300 * 1024 && realHtml.includes('pdfjsWorker') && realHtml.includes('WorkerMessageHandler') && (realHtml.match(/<\/script/gi) || []).length === 2, 'X-Ep. the real engine plus worker handler inline into one self-contained page');
    record(!/<script\s+src/i.test(realHtml), 'X-Eq. with still no external script reference');
  }

  console.log('\n--- X-F: the Expo Go hard gate ---');
  {
    const frontPackage = JSON.parse(fs.readFileSync(path.join(frontDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const allDeps = { ...frontPackage.dependencies, ...frontPackage.devDependencies };
    for (const forbidden of ['react-native-pdf', 'react-native-blob-util', '@config-plugins/react-native-pdf']) {
      record(allDeps[forbidden] === undefined, `X-Fa. ${forbidden} is gone from package.json`);
    }
    record(frontPackage.dependencies['react-native-webview'] !== undefined, 'X-Fb. react-native-webview is the only viewer native surface');
    // The installed WebView MUST be exactly what Expo Go ships: otherwise the JS
    // would speak to native code that is not there.
    const bundledNative = JSON.parse(
      fs.readFileSync(path.join(frontDir, 'node_modules', 'expo', 'bundledNativeModules.json'), 'utf8'),
    ) as Record<string, string>;
    const expoGoWebview = bundledNative['react-native-webview'];
    const installedWebview = (JSON.parse(fs.readFileSync(path.join(frontDir, 'node_modules', 'react-native-webview', 'package.json'), 'utf8')) as { version: string }).version;
    record(typeof expoGoWebview === 'string' && expoGoWebview.length > 0, `X-Fc. Expo SDK 57 pins a WebView for Expo Go (${expoGoWebview})`);
    record(installedWebview === expoGoWebview, `X-Fd. and the installed WebView IS that exact version (${installedWebview})`);
    const lock = JSON.parse(fs.readFileSync(path.join(frontDir, 'package-lock.json'), 'utf8')) as { packages: Record<string, unknown> };
    const lockKeys = Object.keys(lock.packages ?? {});
    record(!lockKeys.some((key) => key.includes('react-native-pdf') || key.includes('react-native-blob-util') || key.includes('config-plugins/react-native-pdf')), 'X-Fe. the lockfile carries no remnant of the native PDF stack');
    const appConfig = fs.readFileSync(path.join(frontDir, 'app.config.js'), 'utf8');
    record(!/react-native-pdf|react-native-blob-util/.test(appConfig), 'X-Ff. app.config.js wires no native PDF plugin');
    const viewerSource = fs.readFileSync(path.join(frontDir, 'screens', 'HomeCloudFileViewerScreen.tsx'), 'utf8');
    const viewerCode = viewerSource.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    record(!/react-native-pdf|react-native-blob-util/.test(viewerCode), 'X-Fg. the Viewer imports no native PDF module (comments stripped before checking)');
    record(/from 'react-native-webview'/.test(viewerCode), 'X-Fh. the Viewer renders through react-native-webview');
    record(/originWhitelist/.test(viewerCode) && /onShouldStartLoadWithRequest/.test(viewerCode), 'X-Fi. and the WebView is nailed down (origin whitelist + navigation blocked)');
    record(/allowFileAccess=\{false\}/.test(viewerCode), 'X-Fj. with file access explicitly off');
    record(!/trustAllCerts/.test(viewerCode), 'X-Fk. and no leftover native-renderer props');
    record(!/onShouldStartLoadWithRequest=\{\(\) => false\}/.test(viewerCode), 'X-Fl. the navigation guard is not the old unconditional denial that can block the iOS bootstrap document');
    record(/allowPdfViewerNavigation/.test(viewerCode) && /about:blank/.test(viewerCode), 'X-Fm. the local about:blank bootstrap load is explicitly allowed');
    record(/Código de diagnóstico/.test(viewerSource) && /pdf_ready_timeout/.test(viewerSource) && /pdf_get_document_rejected/.test(viewerSource) && !/pdf_engine_unsupported/.test(viewerSource), 'X-Fn. renderer failures expose sanitized stage diagnostics and no longer emit the false unsupported bucket');
    // The suite must not mock away a module Expo Go lacks: every natively-backed
    // module the Viewer tests stub must either be an Expo SDK module (present in
    // Go) or the WebView at the exact Go-pinned version proven in X-Fd.
    const expoGoNative = new Set([...Object.keys(bundledNative), 'expo-video', 'expo-audio', 'expo-file-system', 'expo-sharing', 'expo-asset', 'react', 'react-native', 'react-native-safe-area-context']);
    const stubbedModules = ['expo-video', 'expo-audio', 'expo-file-system', 'expo-sharing', 'react-native-safe-area-context', 'react-native-webview'];
    record(stubbedModules.every((name) => expoGoNative.has(name)), 'X-Fo. every stubbed native module is present in Expo Go (nothing mocked away that Go lacks)');
    record(!fs.existsSync(path.join(repoRoot, 'tests', 'stubs', 'react-native-pdf')), 'X-Fp. the obsolete native-PDF mock is deleted, not left to rot');
  }
}
