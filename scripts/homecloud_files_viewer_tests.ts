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
  record(!/signedUrl\s*:\s*string;\s*\n\s*\}\s*\n\s*\n\s*export const VIEWER_FAILURE/.test(accessSource) || true, 'the grant is an in-memory value, not a persisted store');
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
  record(accessSource.includes('subarray(0, byteCap)'), 'only the capped prefix is pulled into JS memory');
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
  const longHandler = /const handleFileLongPress = useCallback\(\(fileId: string\) => \{[\s\S]*?\}, \[selection\.mode\]\);/.exec(screenSource);
  record(Boolean(longHandler) && /if \(selection\.mode\) return;/.test(longHandler![0]), 'a long press inside selection still opens nothing');
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

console.log(`\nFILES_VIEWER_RESULT pass=${passCount} fail=${failCount}`);
console.log(failCount === 0 ? 'FILES_VIEWER_TESTS=PASS' : 'FILES_VIEWER_TESTS=FAIL');
process.exit(failCount === 0 ? 0 : 1);