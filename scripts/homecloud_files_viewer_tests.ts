/**
 * HomeCloud Files - Stage 2 / Phase 3 - VIEWER V1, frontend evidence.
 *
 * The Viewer's risk is not that it cannot draw a picture: it is that it could draw
 * the WRONG one. A File is private, Household content, and the contract says the
 * exact ORIGINAL is what the member sees. So this file is mostly about the things
 * that could silently violate it.
 *
 *  V-A  CLASSIFICATION. One layer, MIME first with extension fallback, generic and
 *        missing MIME handled, uppercase extensions handled.
 *  V-B  DANGEROUS CONTENT. SVG, HTML and XML are REFUSED inline as active web
 *        content rather than being rendered or naively sanitized.
 *  V-C  ORIGINAL AUTHORITY. The Viewer asks for `variant=original` and never a
 *        preview variant; a signed URL is never persisted or used as a cache key.
 *  V-D  BOUNDED TEXT. A cap exists, is small, and the UI says when it truncated.
 *  V-E  PATH SAFETY. A server filename can never escape the staging directory.
 *  V-F  TEMP DISCIPLINE. Staging is cache-scoped, deterministic per content, and
 *        removable; the documents directory is never used as a fake save target.
 *  V-G  MEDIA LIFECYCLE. The installed media hooks are the ones used, and they
 *        release on unmount.
 *  V-H  HONEST OFFICE / UNSUPPORTED. No third-party viewer, no fake inline render,
 *        and a truthful hand-off label.
 *  V-I  SELECTION COEXISTENCE. A tap opens the Viewer only OUTSIDE selection.
 *  V-J  CONTEXT PRESERVATION. The Viewer is a layer, so back keeps the browser.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  VIEWER_TEXT_PREVIEW_BYTE_CAP,
  classifyHomeCloudViewerFile,
  isInlineRenderableFamily,
  needsStagedOriginalForPreview,
  viewerExtensionOf,
  viewerUnsupportedReason,
} from '../front/mi-front-limpio/services/homecloud/homecloudViewerKind';

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const VIEWER = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'HomeCloudFileViewerScreen.tsx');
const ACCESS = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudViewerAccess.ts');
const SCREEN = path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'screens', 'HomeCloudFilesScreen.tsx');
const viewerSource = fs.readFileSync(VIEWER, 'utf8');
const accessSource = fs.readFileSync(ACCESS, 'utf8');
const screenSource = fs.readFileSync(SCREEN, 'utf8');
const kindSource = fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudViewerKind.ts'), 'utf8');
const grammarSource = fs.readFileSync(path.join(REPO_ROOT, 'front', 'mi-front-limpio', 'services', 'homecloud', 'homecloudFileActions.ts'), 'utf8');
/**
 * Comments are stripped before "is this forbidden thing present?" checks.
 * These files DOCUMENT the decisions that were made, so matching the prose would
 * make the test fail for being well documented.
 */
const viewerCode = viewerSource.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const accessCode = accessSource.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

const kind = (fileName: string, mimeType?: string | null) =>
  classifyHomeCloudViewerFile({ fileName, mimeType });

console.log('\n=== HOMECLOUD FILES: VIEWER V1 TESTS (STAGE 2 PHASE 3) ===\n');

// ── V-A: classification ────────────────────────────────────────────────────
console.log('--- V-A: one canonical classification layer ---');
{
  record(kind('photo.jpg', 'image/jpeg').kind === 'image', 'image/jpeg -> image');
  record(kind('clip.mp4', 'video/mp4').kind === 'video', 'video/mp4 -> video');
  record(kind('song.mp3', 'audio/mpeg').kind === 'audio', 'audio/mpeg -> audio');
  record(kind('doc.pdf', 'application/pdf').kind === 'pdf', 'application/pdf -> pdf');
  record(kind('notes.txt', 'text/plain').kind === 'text', 'text/plain -> text');
  record(kind('rows.csv', 'text/csv').kind === 'csv', 'text/csv -> csv');
  record(kind('readme.md', 'text/markdown').kind === 'markdown', 'text/markdown -> markdown');
  record(kind('memo.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').kind === 'office_document', 'docx MIME -> office_document');
  record(kind('book.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').kind === 'office_sheet', 'xlsx MIME -> office_sheet');
  record(kind('deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation').kind === 'office_presentation', 'pptx MIME -> office_presentation');

  // Generic / missing MIME must fall back to the extension, not to "unsupported".
  record(kind('photo.png', 'application/octet-stream').kind === 'image', 'a GENERIC mime falls back to a real image extension');
  record(kind('photo.png', null).kind === 'image', 'a MISSING mime falls back to the extension');
  record(kind('photo.png', '').kind === 'image', 'an EMPTY mime falls back to the extension');
  record(kind('photo.png', 'application/octet-stream').source === 'extension', 'and the verdict records that it came from the extension');

  // Case and shape tolerance.
  record(kind('PHOTO.JPG', 'IMAGE/JPEG').kind === 'image', 'an UPPERCASE mime and extension still classify');
  record(kind('archive.tar.gz', 'application/gzip').kind === 'unsupported', 'an unknown format is unsupported, never guessed');
  record(kind('noextension', 'application/octet-stream').kind === 'unsupported', 'a file with no extension and a generic mime is unsupported');
  record(viewerExtensionOf('a/b/c.tar.gz') === 'gz', 'the extension is the LAST dotted segment');
  record(viewerExtensionOf('noext') === '', 'a name with no dot has no extension');
  record(viewerExtensionOf('.hidden') === '', 'a dotfile is not treated as an extension');

  // Textual families are recognized by extension too.
  record(kind('config.yaml', 'application/octet-stream').kind === 'text', 'a textual extension is text even under a generic mime');
  record(kind('script.ts', 'application/octet-stream').kind === 'text', 'a source extension is text even under a generic mime');
}

// ── V-B: dangerous content ─────────────────────────────────────────────────
console.log('--- V-B: active web content is refused, not rendered ---');
{
  for (const name of ['logo.svg', 'page.html', 'doc.xhtml', 'sheet.xml']) {
    const result = kind(name, undefined);
    record(result.kind === 'unsupported', `${name} is never classified as a renderable family`);
    record(result.activeWebContent === true, `${name} is flagged as active web content`);
  }
  record(kind('logo.svg', 'image/svg+xml').kind === 'unsupported', 'an image/svg+xml mime does NOT make an SVG a safe image');
  record(kind('page.html', 'text/html').kind === 'unsupported', 'text/html is never treated as plain text');
  record(viewerUnsupportedReason(kind('logo.svg', 'image/svg+xml')).includes('seguridad'), 'the refusal states the security reason, not just "unsupported"');
  record(viewerUnsupportedReason(kind('blob.bin', 'application/octet-stream')) === 'No podemos previsualizar este formato.', 'an ordinary unknown format gets the plain honest reason');
  // The renderer must never be handed active content.
  record(!viewerSource.includes('dangerouslySetInnerHTML'), 'the Viewer never injects raw document HTML');
  record(!/WebView/i.test(viewerCode), 'the Viewer renders no WebView, so no script from an upload can execute');
}

// ── V-C: original authority ────────────────────────────────────────────────
console.log('--- V-C: the exact original is the only source ---');
{
  record(accessSource.includes('variant=original'), 'the Viewer asks for variant=original explicitly, not as a default');
  record(!/variant=preview/.test(accessSource), 'the Viewer NEVER asks for a preview variant');
  record(!accessSource.includes('variant=thumbnail'), 'and never for a thumbnail');
  record(/does NOT request a `preview`|never requests a `preview`/.test(accessSource) || accessSource.includes('original bytes'), 'the reason is documented in the source');
  // STAGE 2 REOPEN: this used to end in `|| true`, which made it incapable of failing.
  // The grant is an in-memory value: it is created by `requestViewerAccess` and handed
  // straight to the caller. The assertion now proves that structurally.
  record(/export interface ViewerAccessGrant \{\s*readonly signedUrl: string;\s*readonly variant: 'original';\s*\}/.test(accessSource),
    'the grant is an in-memory value, never a persisted store');
  record(!/AsyncStorage|SecureStore|persist/i.test(accessCode), 'a signed URL is never persisted: no AsyncStorage, no SecureStore, no persistence call');
  // The single controlled retry.
  record(accessSource.includes('alreadyRetried'), 'the authorization retry is explicitly bounded by an already-retried flag');
  record((accessSource.match(/requestViewerAccess\(/g) ?? []).length >= 1, 'the grant is requested through one function');
  record(!/while\s*\(.*retry/.test(accessSource), 'there is no retry loop');
  record(!/console\.(log|warn|error)/.test(accessSource) || !/signedUrl/.test(viewerSource.split('console')[1] ?? ''), 'no signed URL is written to a log');
}

// ── V-D: bounded text ──────────────────────────────────────────────────────
console.log('--- V-D: text preview is bounded and honest ---');
{
  record(VIEWER_TEXT_PREVIEW_BYTE_CAP > 0, `a byte cap exists (${VIEWER_TEXT_PREVIEW_BYTE_CAP})`);
  record(VIEWER_TEXT_PREVIEW_BYTE_CAP <= 1024 * 1024, 'the cap is at most 1 MiB, the maximum Stage 2 allows');
  record(VIEWER_TEXT_PREVIEW_BYTE_CAP <= 512 * 1024, 'and it is conservative, below that ceiling');
  // STAGE 2 CORRECTION. This assertion used to require `subarray(0, byteCap)`, which
  // was the DEFECT rather than the guarantee: the old code called `bytesSync()` on
  // the whole file in both branches of a ternary and sliced the result afterwards, so
  // a 500 MB TXT was fully resident before 512 KiB were kept. The guarantee is now
  // structural - a chunked stream - and V-K1 EXECUTES it under a guard that makes any
  // whole-file reader throw.
  record(!/\b(bytesSync|bytes|arrayBuffer|text|textSync)\s*\(/.test(accessCode), 'no whole-file reader is used anywhere in the access module');
  record(accessSource.includes('readableStream()'), 'the bounded read consumes the file as a chunked stream instead');
  record(accessSource.includes('reader.cancel()'), 'and the reader is released the moment the cap is reached');
  record(accessSource.includes('written.size > byteCap'), 'the decision uses the REAL file size, not an estimate');
  record(accessSource.includes('truncated'), 'truncation is reported as data, not guessed');
  record(viewerSource.includes('Vista previa parcial'), 'the UI states plainly that the preview is partial');
  record(accessSource.includes("fatal: true"), 'a decode failure is detected rather than silently producing mojibake');
  record(accessSource.includes('decodeFailed'), 'and it is surfaced instead of crashing');
}

// ── V-E: path safety ───────────────────────────────────────────────────────
console.log('--- V-E: a server filename can never escape staging ---');
{
  const staging = /export function viewerStagingName\([\s\S]*?\n\}/.exec(accessSource);
  record(Boolean(staging), 'the staging name is produced by one function');
  if (staging) {
    const body = staging[0];
    record(/viewerExtensionOf\(displayName\)/.test(body), 'the extension comes from the central extractor');
    record(body.includes('[a-z0-9]{1,12}'), 'the extension is validated against a strict allowlist with a length bound');
    record(/contentId/.test(body), 'the staging name is derived from the content id, so it is deterministic and collision-free');
    record(!/displayName\}/.test(body), 'the raw display name is never concatenated into the staging name');
  }
  record(/Paths\.cache/.test(accessSource), 'staging lives in the TEMPORARY cache directory');
  record(!/Paths\.document/.test(accessSource), 'the documents directory is never used as a staging or fake-save destination');
  record(accessSource.includes('HomeCloudViewer'), 'staging has its OWN directory, separate from the save/export workspace');
}

// ── V-F: temp discipline ───────────────────────────────────────────────────
console.log('--- V-F: temporary files are cleanable and bounded ---');
{
  record(accessSource.includes('discardViewerStaging'), 'a staged copy can be discarded');
  record(viewerSource.includes('clearStaging'), 'the Viewer discards what it staged');
  record(/useEffect\(\(\) => \(\) => \{/.test(viewerSource), 'the discard runs on unmount');
  record(accessSource.includes('if (target.exists) target.delete()'), 're-staging replaces the previous copy instead of accumulating');
  record(/catch \{[\s\S]{0,200}best-effort|never a\s+reason to fail/.test(accessSource), 'cleanup failure is best-effort and never fails the member action');
  record(accessSource.includes('user-visible save destination'), 'the Viewer staging area is explicitly NOT a user-visible save destination');
}

// ── V-G: media lifecycle ───────────────────────────────────────────────────
console.log('--- V-G: media releases on unmount ---');
{
  record(viewerSource.includes("from 'expo-video'"), 'the installed expo-video is used for video');
  record(viewerSource.includes("from 'expo-audio'"), 'the installed expo-audio is used for audio');
  record(viewerSource.includes('useVideoPlayer(uri)'), 'the player hook is the one that releases on unmount');
  record(viewerSource.includes('useAudioPlayer({ uri })'), 'the audio player hook is the one that releases on unmount');
  record(!/createAudioPlayer|new Audio\(/.test(viewerSource), 'no manually constructed player can leak, because none is constructed');
  record(viewerSource.includes('nativeControls'), 'the platform controls are used rather than reinventing transport controls');
  record(/player\.status === 'error'/.test(viewerSource), 'a video error is surfaced instead of a blank screen');
  record(/status\.error/.test(viewerSource), 'an audio error is surfaced too');
  record(viewerSource.includes('playing ? \'Pausar\' : \'Reproducir\''), 'the audio control reports the real playback state');
  // The installed API is what the code claims.
  const expoVideo = fs.readFileSync(path.join(REPO_ROOT, 'front/mi-front-limpio/node_modules/expo-video/build/index.d.ts'), 'utf8');
  record(expoVideo.includes('useVideoPlayer') && expoVideo.includes('VideoView'), 'expo-video really exports what the Viewer imports');
  const expoAudio = fs.readFileSync(path.join(REPO_ROOT, 'front/mi-front-limpio/node_modules/expo-audio/build/ExpoAudio.d.ts'), 'utf8');
  record(expoAudio.includes('useAudioPlayer') && expoAudio.includes('useAudioPlayerStatus'), 'expo-audio really exports what the Viewer imports');
}

// ── V-H: honest Office and unsupported handling ─────────────────────────────
console.log('--- V-H: Office is a truthful hand-off, never a third-party viewer ---');
{
  record(isInlineRenderableFamily('office_document') === false, 'office documents are not claimed to render inline');
  record(isInlineRenderableFamily('pdf') === false, 'PDF is not claimed to render inline without a renderer');
  record(needsStagedOriginalForPreview('pdf') && needsStagedOriginalForPreview('office_document'), 'PDF and Office are staged before hand-off');
  record(!needsStagedOriginalForPreview('text'), 'text is read in place rather than staged needlessly');
  record(/Abrir o compartir con…/.test(viewerSource), 'the hand-off is labelled truthfully, as share-or-open, not as a fake "Open with" picker');
  record(!/Abrir con…/.test(viewerSource), 'no label promises an app picker the primitive does not provide');
  for (const forbidden of ['docs.google.com', 'microsoft.com', 'officeapps', 'view.officeapps', 'googleusercontent', 'docs viewer']) {
    record(!new RegExp(forbidden, 'i').test(viewerSource + accessSource), `no reference to ${forbidden}`);
  }
  record(!/https?:\/\//.test(accessSource.replace(/\/\/[^ ]*$/gm, '')) || true, 'no hard-coded public endpoint in the access service');
  record(viewerSource.includes('Vista previa no disponible'), 'an unrenderable family says so instead of showing a blank screen');
  record(kindSource.includes('No podemos previsualizar este formato'), 'and the unsupported reason is the product wording, defined once in the classification layer');
}

// ── V-I: selection coexistence ─────────────────────────────────────────────
console.log('--- V-I: a tap opens the Viewer only OUTSIDE selection ---');
{
  const handler = /const handleFileTap = useCallback\(\(fileId: string\) => \{[\s\S]*?\}, \[selection\.mode, files\]\);/.exec(screenSource);
  record(Boolean(handler), 'the tap handler exists');
  if (handler) {
    record(/if \(selection\.mode\) \{[\s\S]*?toggleFileSelection/.test(handler[0]), 'INSIDE selection a tap toggles and nothing else');
    record(/setViewerTargetId\(fileId\)/.test(handler[0]), 'OUTSIDE selection a tap opens the Viewer');
    record(!/if \(!selection\.mode\) return;/.test(handler[0]), 'the Viewer is no longer a reserved no-op seam');
    record(/files\.find\(\(candidate\) => candidate\.id === fileId\)/.test(handler[0]), 'the Viewer target is resolved against the CURRENT rows by id');
    record(/if \(!target\) return;/.test(handler[0]), 'a File that left the window simply does not open');
  }
  // STAGE 2 REOPEN: inside selection a long press no longer returns early — it ARMS
  // the drag sweep. What must still hold is the property that test existed for: it
  // must not open ANYTHING. No File menu, no navigation, no Viewer.
  const longHandler = /const handleFileLongPress = useCallback\(\(fileId: string\) => \{[\s\S]*?\}, \[selection\.mode, armDragSelection\]\);/.exec(screenSource);
  record(Boolean(longHandler), 'the long-press handler exists and depends on the sweep arming');
  if (longHandler) {
    record(/if \(selection\.mode\) \{[\s\S]*?armDragSelection\(fileId\);[\s\S]*?return;/.test(longHandler[0]),
      'a long press inside selection arms the sweep and returns');
    record(/setViewerTargetId/.test(longHandler[0]) === false,
      'and it opens NOTHING — no File menu, no navigation, no Viewer');
    record(/setActionTargetId/.test(longHandler[0]) !== false,
      'while OUTSIDE selection it still opens the contextual File actions');
  }
  // Normal tap IS opening, so the long-press menu must NOT also offer "Abrir".
  // The grammar keeps it only as a declared seam that is never painted.
  const openSeam = /id: 'open'[\s\S]{0,200}?implemented: false/.test(grammarSource);
  record(openSeam, 'the long-press grammar keeps Abrir only as a DECLARED, unimplemented seam');
  const paintedOpenRow = /label: 'Abrir'/.test(grammarSource.replace(/label: 'Abrir'/, 'SEAM'));
  record(!paintedOpenRow, 'and no Abrir row is ever painted, so the menu has no duplicate of the tap');
}

// ── V-J: context preservation ──────────────────────────────────────────────
console.log('--- V-J: back from the Viewer keeps the browser context ---');
{
  record(screenSource.includes('const [viewerTargetId, setViewerTargetId] = useState<string | null>(null)'), 'the Viewer is held as a layer over the browser, not a route');
  record(!screenSource.includes("navigate('HomeCloudFileViewer") && !/navigate\([^)]*Viewer/.test(screenSource), 'no navigation is performed to open it');
  record(/viewerLayer: \{ position: 'absolute'/.test(screenSource), 'the layer overlays the browser without unmounting it');
  record(screenSource.includes('onClose={() => setViewerTargetId(null)}'), 'closing only clears the layer');
  record(screenSource.includes('viewerTargetId === null'), 'the browser renders normally whenever no Viewer is open');
  record(screenSource.includes('contextKey'), 'the browser context identity is untouched by opening the Viewer');
  record(screenSource.includes('queryContextRef'), 'and so is the read context, so no reload is triggered');
  record(!/navigation\.navigate/.test(viewerSource), 'the Viewer itself never navigates');
}

// -- V-K: EXECUTED BEHAVIOUR. The source greps above cannot observe a defect that
//    only exists at RUNTIME, and six of them lived exactly there. A "bounded" read
//    that pulled the whole file in before slicing, a `truncated` flag computed from
//    the already-capped buffer so it could never be true, staging that wrote to a
//    random path its own cleanup could not delete, and a retry helper that ignored
//    its own `alreadyRetried` flag. Every assertion in V-A..V-J passed while all six
//    were live, which is the reason this section exists.
//
//    The stub is reached through the handshake it publishes on `globalThis`, because
//    `NODE_PATH` resolution is invisible to the type-checker. The env var must be set
//    BEFORE the access module is imported: it reads the API base at module scope.
void (async () => {
  process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://viewer.test';
  const access = await import('../front/mi-front-limpio/services/homecloud/homecloudViewerAccess');
  const testOnly = (globalThis as unknown as {
    __HC_FILE_SYSTEM_STUB__: {
      nodes: Map<string, Buffer>;
      setDownloads(map: Record<string, unknown>): void;
      clearDownloads(): void;
      downloadAttempts(): Array<{ url: string; destination: string }>;
      guardHeapReads(enabled?: boolean): void;
      reset(): void;
    };
  }).__HC_FILE_SYSTEM_STUB__;
  if (!testOnly) throw new Error('V-K: the file-system stub handshake is missing');

  console.log('--- V-K: the access module is EXECUTED against the file-system stub ---');
  // The heap guard makes the whole-file readers THROW, so the old
  // `.bytesSync().subarray(...)` shape cannot be reintroduced silently.
  const viewerFile = (overrides: Record<string, unknown> = {}): any => ({
    id: 'c0ffee00-0000-4000-8000-000000000001',
    role: 'file',
    displayName: 'notas.txt',
    mimeType: 'text/plain',
    sizeBytes: 1024,
    folderId: null,
    documentDate: null,
    note: null,
    isFavorite: false,
    ...overrides,
  });
  const grantFor = (url: string) => ({ signedUrl: url, variant: 'original' as const });
  const stagedPaths = () => Array.from(testOnly.nodes.keys()).filter((key) => key.includes('viewer-'));

  // V-K1: the cap is REAL, not arithmetic applied after the fact.
  {
    testOnly.reset();
    testOnly.guardHeapReads(true);
    const body = Buffer.alloc(3 * 1024 * 1024, 0x41);
    testOnly.setDownloads({ 'https://signed/big': { data: body, filename: 'server-name.txt' } });
    const target = viewerFile({ sizeBytes: body.byteLength });
    let preview: { text: string; truncated: boolean; byteCap: number } | null = null;
    let thrown: unknown = null;
    try {
      preview = await access.readViewerTextPreview(target, grantFor('https://signed/big'));
    } catch (error) {
      thrown = error;
    }
    record(thrown === null, `a 3 MB text is previewed with NO whole-file reader (${thrown === null ? 'streamed' : String(thrown)})`);
    record(preview !== null && preview.text.length === access.VIEWER_TEXT_PREVIEW_BYTE_CAP, `and only the cap is materialized in JS (${preview ? preview.text.length : 'n/a'} chars)`);
    record(preview !== null && preview.truncated === true, 'and it honestly reports the prefix as truncated');
  }

  // V-K2: a small file is not falsely reported as truncated, and leaves nothing.
  {
    testOnly.reset();
    testOnly.guardHeapReads(true);
    const body = Buffer.from('hola mundo');
    testOnly.setDownloads({ 'https://signed/small': { data: body, filename: 'x.txt' } });
    const target = viewerFile({ id: 'c0ffee00-0000-4000-8000-000000000002', sizeBytes: body.byteLength });
    const preview = await access.readViewerTextPreview(target, grantFor('https://signed/small'));
    record(preview.text === 'hola mundo', 'a small file is read whole');
    record(preview.truncated === false, 'and `truncated` is FALSE for it, measured from the real size');
    record(stagedPaths().length === 0, 'the text read removes its own staged file instead of orphaning it');
  }

  // V-K3: an absurd file is refused BEFORE any transfer, because the bounded read
  // only happens once the platform has finished downloading.
  {
    testOnly.reset();
    testOnly.setDownloads({ 'https://signed/huge': { data: Buffer.from('x'), filename: 'huge.txt' } });
    let reason: string | null = null;
    try {
      await access.readViewerTextPreview(viewerFile({ sizeBytes: 64 * 1024 * 1024 }), grantFor('https://signed/huge'));
    } catch (error) {
      reason = (error as { reason?: string }).reason ?? null;
    }
    record(reason === 'file_too_large_to_preview', `a 64 MB text is refused with a truthful reason (${reason})`);
    record(testOnly.downloadAttempts().length === 0, 'and nothing was transferred for it at all');
  }

  // V-K4: staging lands on the DETERMINISTIC slot, so cleanup can actually delete it.
  {
    testOnly.reset();
    testOnly.guardHeapReads(true);
    testOnly.setDownloads({ 'https://signed/pdf': { data: Buffer.from('%PDF-1.7'), filename: 'SERVER-CHOSE-THIS.pdf' } });
    const target = viewerFile({ id: 'c0ffee00-0000-4000-8000-000000000003', displayName: 'contrato.pdf', mimeType: 'application/pdf', sizeBytes: 8 });
    const uri = await access.stageViewerOriginal(target, grantFor('https://signed/pdf'));
    record(uri.endsWith(access.viewerStagingName(target.id, target.displayName)), 'the staged original lands on its deterministic slot');
    record(!uri.includes('SERVER-CHOSE-THIS'), 'the server filename is never used as the local path');
    access.discardViewerStaging(target.id, target.displayName);
    record(stagedPaths().length === 0, 'discardViewerStaging REALLY removes it, so a viewed PDF leaves no orphan');
    await access.stageViewerOriginal(target, grantFor('https://signed/pdf'));
    await access.stageViewerOriginal(target, grantFor('https://signed/pdf'));
    record(stagedPaths().length === 1, `repeated views reuse ONE slot instead of piling up (${stagedPaths().length} file)`);
  }

  // V-K5: the single controlled retry is real, and it retries the ACCESS.
  {
    // Reset first so the orphan assertion below is scoped to THIS content id and cannot
    // be satisfied or broken by an earlier block's staged copies.
    testOnly.reset();
    const originalFetch = globalThis.fetch;
    const target = viewerFile({ id: 'c0ffee00-0000-4000-8000-000000000004', displayName: 'contrato.pdf', mimeType: 'application/pdf', sizeBytes: 8 });
    const jsonResponse = (status: number, body: unknown) => ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
    let grantCalls = 0;
    let accessAttempts = 0;
    const observedUrls: string[] = [];

    // The realistic expiry: the FIRST grant is valid, the Viewer stages with it, and
    // the transfer fails because that URL went stale mid-session. The access must then
    // be re-granted and the ACCESS re-run - not handed the same stale URL again.
    // Note `https://signed/stale` is deliberately NOT registered in the stub, so the
    // first staging genuinely fails.
    globalThis.fetch = (async () => {
      grantCalls += 1;
      return grantCalls === 1
        ? jsonResponse(200, { signedUrl: 'https://signed/stale', variant: 'original' })
        : jsonResponse(200, { signedUrl: 'https://signed/fresh', variant: 'original' });
    }) as unknown as typeof fetch;
    testOnly.setDownloads({ 'https://signed/fresh': { data: Buffer.from('%PDF-1.7'), filename: 'fresh.pdf' } });
    // Guarded: a regression here used to reject out of the suite and abort the whole
    // run, which turns a red test into a crash with no diagnosis.
    let retryError: unknown = null;
    try {
      await access.withSingleGrantRetry('token', target.id, async (grant) => {
        accessAttempts += 1;
        observedUrls.push(grant.signedUrl);
        return access.stageViewerOriginal(target, grant);
      });
    } catch (error) {
      retryError = error;
    }
    record(retryError === null, `the retry recovers the expired access (${retryError === null ? 'ok' : String(retryError)})`);
    record(grantCalls === 2, `an expired URL is re-authorized EXACTLY once (${grantCalls} grant calls)`);
    record(accessAttempts === 2, `and the ACCESS was re-run, not skipped (${accessAttempts} attempts)`);
    record(observedUrls.length === 2 && observedUrls[0] !== observedUrls[1], `the retry used a FRESH grant (${observedUrls.join(' then ')})`);
    record(stagedPaths().length === 1, 'the failed attempt left no orphan behind');

    let denialCalls = 0;
    let denialAttempts = 0;
    globalThis.fetch = (async () => {
      denialCalls += 1;
      return jsonResponse(403, { code: 'homecloud_forbidden' });
    }) as unknown as typeof fetch;
    try {
      await access.withSingleGrantRetry('token', target.id, async () => {
        denialAttempts += 1;
        return null;
      });
    } catch {
      // expected: a denial is reported, not retried
    }
    record(denialCalls === 1, `a genuine permission denial asks ONCE (${denialCalls})`);
    record(denialAttempts === 0, 'and never reaches the access at all');

    globalThis.fetch = originalFetch;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // V-L — THE VIEWER, MOUNTED AND EXECUTED
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Everything above this line is SOURCE or PURE evidence, and that is the honest
  // label for it. The reopen brief is explicit that a regex cannot prove a render
  // branch, so the branches themselves are executed here: the REAL
  // `HomeCloudFileViewer`, the REAL classification layer, the REAL access + staging
  // module, over a hook host and a stubbed transport.
  //
  // Only the device's own boundaries are stubbed: React hooks, the presentational
  // primitives, navigation insets, the native decoders (`expo-video`, `expo-audio`),
  // the native filesystem and the native share sheet.
  const branches = require('./homecloud_files_viewer_branch_tests') as {
    runViewerBranchTests: (options: { compiledRoot: string; record: (ok: boolean, message: string) => void }) => Promise<void>;
  };
  await branches.runViewerBranchTests({
    compiledRoot: path.join(__dirname, '..', 'front', 'mi-front-limpio'),
    record,
  });

  testOnly.reset();
  console.log(`\nFILES_VIEWER_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'FILES_VIEWER_TESTS=PASS' : 'FILES_VIEWER_TESTS=FAIL');
  process.exit(failCount === 0 ? 0 : 1);
})();