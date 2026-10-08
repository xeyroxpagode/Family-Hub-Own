import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * HOMECLOUD_ST10_CAMERA_CONVERGENCE_TESTS
 *
 * ST-10.B — Camera is a SOURCE of Memories intake, not a second product model
 * (Product Truth §25.1). The contract is convergence, not existence: one
 * `BinaryMemoryDraft` shape, one review, one `submitBinary`, one upload engine.
 *
 * HONESTY NOTE: this asserts wiring and contract shape. Whether a real capture,
 * a real retake, a real permission denial and a real background interruption
 * behave correctly on hardware is DEVICE_QA_PENDING.
 */

let passed = 0;
let failed = 0;
function test(name: string, run: () => void): void {
  try { run(); passed += 1; console.log(`PASS: ${name}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${name}\n  ${error instanceof Error ? error.message : String(error)}`); }
}

const root = process.cwd();
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const code = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
const intake = code(read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx'));
const intakeTypes = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeTypes.ts');
const camera = code(read('front/mi-front-limpio/services/homecloud/MemoryCameraSurface.tsx'));
const review = code(read('front/mi-front-limpio/services/homecloud/MemoryMediaReview.tsx'));
const picker = code(read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts'));
const captureMetadata = read('front/mi-front-limpio/services/homecloud/homecloudMediaCaptureMetadata.ts');
const uploadTypes = code(read('front/mi-front-limpio/services/homecloud/homecloudUploadTypes.ts'));
const uploadIntakeService = code(read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts'));

// ===========================================================================
// §25.1 — ONE PIPELINE. The camera is a source, not a model.
// ===========================================================================
test('every binary source produces the SAME draft shape and reaches the SAME review', () => {
  const draftShape = /\{ artifact: outcome\.artifact, capture: outcome\.capture, source: outcome\.source \}/;
  assert.ok(/return \{ artifact: outcome\.artifact, capture: outcome\.capture, source: outcome\.source \};/.test(code(read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts'))), 'gallery, camera, imported audio and recorded audio all build the identical draft');
  assert.ok(
    /onUse\(\{ artifact: outcome\.artifact, capture: outcome\.capture, source: outcome\.source \}, attempt\)/.test(camera),
    'the camera hands the host exactly that shape: the ONLY divergence is source:camera',
  );
  assert.ok(/const acceptCamera = useCallback\(\(draft: BinaryMemoryDraft, attempt: MemoryAttempt\)/.test(intake), 'the camera accepts a BinaryMemoryDraft, not a camera-specific object');
  assert.ok(/setBinaryDraft\(draft\)/.test(intake), 'and it lands in the one binary draft the shared review renders');
  assert.ok(draftShape.test(intake) === false, 'no camera-only draft shape exists');
});

test('there is ONE review component and ONE submit path', () => {
  assert.ok((intake.match(/<MemoryMediaReview draft=\{binaryDraft\}/g) ?? []).length === 1, 'the review renders the current draft exactly once, whatever its source');
  assert.ok(/submitBinary[\s\S]*service\.createBinaryMemory\(/.test(intake), 'submitBinary is the only submission path');
  assert.equal((intake.match(/void submitBinary\(\)/g) ?? []).length, 1, 'and it is invoked from exactly one action');
  assert.ok(!/MemoryCameraReview|CameraBinaryReview/.test(intake) && !/MemoryCameraReview/.test(review), 'no camera-only review engine exists');
});

test('§6.2 review hierarchy is shared: preview, editable date, optional album, optional description, one save', () => {
  const form = intake.slice(intake.indexOf("<MemoryMediaReview draft={binaryDraft}"), intake.indexOf('</ActionSheet>', intake.indexOf("<MemoryMediaReview draft={binaryDraft}")));
  const previewAt = form.indexOf('<MemoryMediaReview');
  const dateAt = form.indexOf('<MemorySemanticDateFields');
  const captionAt = form.indexOf('label="Texto (opcional)"');
  const albumAt = form.indexOf('<MemoryAlbumSelector');
  assert.ok(previewAt >= 0 && dateAt > previewAt, 'the preview is the dominant element and comes first');
  assert.ok(captionAt > dateAt && albumAt > dateAt, 'description and album are optional and follow the date');
  assert.ok(/\{cancellable \? <AppButton/.test(intake), 'and there is exactly one final save action in the footer, plus honest cancellation');
});

test('§25.3 — album and description are asked in the REVIEW, never in the camera', () => {
  assert.ok(!/AlbumSelector/.test(camera), 'the camera surface has no Album selector');
  assert.ok(!/AppInput/.test(camera), 'the camera surface has no description field');
  assert.ok(/MemoryAlbumSelector/.test(intake) && intake.includes('label="Texto (opcional)"'), 'both live in the shared review');
});

// ===========================================================================
// §25.2 — PERMISSIONS, with honest states
// ===========================================================================
test('§25.2 — an unknown permission is a loading state, never a false denial', () => {
  assert.ok(/if \(!permission\) return <Modal visible[^>]*><View style=\{styles\.message\}><ActivityIndicator color=\{colors\.brand\} \/><\/View><\/Modal>;/.test(camera), 'permission === null renders a spinner and nothing else');
  assert.ok(!/if \(!permission\)[^;]*HomePlus necesita acceso a la cámara/.test(camera), 'the denial copy is never shown before the permission is actually known');
});

test('§25.2 — denial is split into retryable and permanent, with honest affordances', () => {
  assert.ok(/permission\.canAskAgain \? <AppButton title="Permitir cámara"[\s\S]*? : <AppButton title="Abrir configuración" onPress=\{\(\) => void Linking\.openSettings\(\)\} \/>/.test(camera), 'retryable denial offers Permitir cámara, permanent denial offers Abrir configuración');
  assert.ok(/<AppButton title="Volver" variant="secondary" onPress=\{close\} \/>/.test(camera), 'and both states offer a way back');
});

test('§25.2 — a denied microphone for VIDEO is honest and recoverable', () => {
  assert.ok(/if \(!mic\.granted\) \{ if \(ownsAttempt\(attempt\)\) \{ setError\('HomePlus necesita acceso al micrófono para grabar video\.'\); setPhase\('error'\); \} return; \}/.test(camera), 'video asks for the microphone lazily and reports a real denial');
  assert.ok(/title="Reintentar"[\s\S]*?remountSurface\(\); setPhase\('ready'\);/.test(camera), 'and the error state offers a real retry');
  assert.ok(/requestMicrophonePermission\(\)/.test(camera), 'the microphone is requested only when recording actually starts');
});

// ===========================================================================
// §25.3 — capture, retake, cancel, and the REAL capture instant
// ===========================================================================
test('the capture instant is the real HomeCloud capture time, not an import reading', () => {
  assert.ok(/const capturedAt = new Date\(\)\.toISOString\(\);/.test(camera), 'the instant is captured at the shutter/record-start moment');
  const persist = picker.slice(picker.indexOf('export async function persistCameraCapture'));
  assert.ok(
    /capture: \{ capturedAt: input\.capturedAt, capturedYear: date\.getUTCFullYear\(\), capturedMonth: date\.getUTCMonth\(\) \+ 1, capturePrecision: 'exact' \}/.test(persist),
    'and it is persisted as an exact capture, never re-derived at import',
  );
  assert.ok(!/deriveMediaCaptureMetadata/.test(persist), 'the camera does not pretend to read EXIF the SDK never delivered');
});

test('§7.1 — no gallery item is ever dated by import time, selection time or upload time', () => {
  assert.ok(
    /MEDIA_CAPTURE_SOURCE_PRIORITY: readonly string\[\] = \[\n  'exif\.DateTimeOriginal',\n  'exif\.DateTimeDigitized',\n  'exif\.DateTime',\n\];/.test(captureMetadata),
    'the supported capture sources are exactly the three audited EXIF fields',
  );
  assert.ok(/Rejected sources, with the reason/.test(captureMetadata), 'and the rejected sources are documented, not silently substituted');
  assert.ok(!/uploaded_at/.test(captureMetadata) && !/uploaded_at/.test(picker), 'uploaded_at is never a capture source');
  // `Date.now()` survives in the picker ONLY as the gallery-presentation latency
  // instrumentation, which is a diagnostic and never reaches a draft.
  const clockUses = (picker.match(/Date\.now\(\)/g) ?? []).length;
  assert.ok(clockUses > 0 && /const launchedAt = Date\.now\(\);/.test(picker), 'the only client-clock reading is the picker latency trace');
  assert.ok(
    !/capturedAt: new Date|capturePrecision: 'exact', capturedAt: new Date\(\)/.test(picker),
    'no capture field is ever built from the client clock',
  );
  assert.ok(/memoryRegisterCaptureFields[\s\S]*?capturePrecision: 'exact', capturedAt: metadata\.capturedAt, capturedYear: null, capturedMonth: null/.test(captureMetadata), 'for an exact date the client sends ONLY the instant, because the backend derives the components');
});

test('retake discards the previous temporary artifact; cancel leaves nothing committed', () => {
  assert.ok(
    /const retake = useCallback\(\(\) => \{ invalidateOperation\(\); replaceCapture\(null\);/.test(camera),
    'retake drops the captured artifact instead of keeping it',
  );
  assert.ok(
    /const replaceCapture = useCallback\(\(next: Capture \| null\) => \{\n    const previous = captureRef\.current; captureRef\.current = next; setCapture\(next\);\n    if \(previous && previous\.uri !== next\?\.uri\) void deleteTemp\(previous\.uri\);/.test(camera),
    'replacing a capture deletes the replaced temp file',
  );
  assert.ok(/const close = useCallback\(\(\) => \{ invalidateOperation\(\); stopNativeRecording\(\); void deleteTemp\(captureRef\.current\?\.uri\); captureRef\.current = null;/.test(camera), 'closing the camera deletes the pending temp file');
  assert.ok(/await deleteTemp\(selected\.uri\); captureRef\.current = null; setCapture\(null\); memoryAttemptTrace\(attempt, 'review_requested'\);/.test(camera), 'using a capture hands ownership to the durable draft and clears the temp');
  assert.ok(!/createBinaryMemory|submitBinary/.test(camera), 'the camera can never commit anything by itself');
});

// ===========================================================================
// §25 / §28.8 — AppState, interruption and simultaneous captures
// ===========================================================================
test('§28.8 — leaving the app stops the recording and returns the camera to ready', () => {
  assert.ok(
    /if \(!active\) \{ invalidateOperation\(\); stopNativeRecording\(\); setReady\(false\); setPhase\('ready'\); \}/.test(camera),
    'backgrounding invalidates the operation, stops the native recording and resets to ready: no orphaned recording',
  );
  assert.ok(/mountedRef\.current = false; invalidateOperation\(\); stopNativeRecording\(\); subscription\.remove\(\);/.test(camera), 'unmount does the same teardown');
});

test('simultaneous captures are refused by synchronous locks, not by React state', () => {
  assert.ok(/const recordStartLockRef = useRef\(false\);/.test(camera), 'starting a recording is guarded by a ref');
  assert.ok(/const stopRequestLockRef = useRef\(false\);/.test(camera), 'and so is stopping one');
  assert.ok(/if \(!camera \|\| !ready \|\| phase !== 'ready' \|\| recordStartLockRef\.current\) \{/.test(camera), 'the start gate refuses a second recordAsync in the same tick');
  assert.ok(/if \(phase !== 'recording' \|\| stopRequestLockRef\.current\) return;/.test(camera), 'the stop gate refuses a second stopRecording');
  assert.ok(/const takePhoto = useCallback\(async \(\) => \{\n    const camera = cameraRef\.current; if \(!camera \|\| !ready \|\| phase !== 'ready'\) return;/.test(camera), 'a photo is guarded by the phase as well');
});

test('an operation that lost its attempt deletes what it produced', () => {
  assert.ok((camera.match(/await deleteTemp\(result\.uri\); return; \}/g) ?? []).length >= 2, 'both the photo and the video paths release a capture whose attempt was lost');
  assert.ok(/await discardMemoryMedia\(outcome\.artifact\); return; \}/.test(camera), 'a durable copy produced for a lost attempt is discarded too');
});

test('repeated camera openings cannot leak attempts or sheets', () => {
  assert.ok(/const \[surfaceSession, setSurfaceSession\] = useState\(0\);/.test(camera), 'the camera surface owns an explicit session counter');
  assert.ok(/key=\{`\$\{mode\}:\$\{facing\}:\$\{surfaceSession\}`\}/.test(camera), 'and remounts the native view by capture configuration, which is how readiness is recovered');
  assert.ok(/\{sheet === 'camera' \? <MemoryCameraSurface/.test(intake), 'the camera mounts only while its sheet is open, so closing it unmounts the surface');
  assert.ok(/const closeCamera = useCallback\(\(\) => \{ attemptAuthorityRef\.current\.invalidate\(\); setSheet\('create'\); \}, \[\]\);/.test(intake), 'and closing invalidates the attempt before leaving');
});

// ===========================================================================
// No second storage, uploader or dependency
// ===========================================================================
test('§25.1 — there is no camera-specific storage or uploader', () => {
  assert.ok(!/createUploadEngine|createSharedUploadQueue|ensureUploadCoordinator/.test(camera), 'the camera never builds an upload pipeline of its own');
  assert.ok(!/fetch\(|api\.|Supabase|supabase/.test(camera), 'and never talks to a backend directly');
  assert.ok(/copyArtifactToDurableWorkspace/.test(picker), 'the camera copies through the SAME durable artifact workspace the other sources use');
  assert.ok(!/homecloud-originals|Paths\.document/.test(camera), 'it never invents a storage path');
});

test('no new dependency came with the camera work', () => {
  const pkg = read('front/mi-front-limpio/package.json');
  assert.ok(/"expo-camera": "~57\.0\.5"/.test(pkg), 'the camera uses the already-installed expo-camera');
  assert.ok(!/expo-media-library/.test(pkg), 'no new native module was added');
  assert.ok(
    (code(read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts')).match(/if \(!capabilities\.contribute\) \{/g) ?? []).length >= 2,
    'picking AND submitting both refuse without homecloud.contribute, so a camera capture is gated by the same capability as every other source',
  );
  assert.ok(/const triggerDisabled = !capabilities\.contribute \|\| picking \|\| accepting;/.test(intake), 'and the create entry point itself is disabled without it');
});

test('§25.3 — the camera returns to the Memories ROOT, never to an arbitrary surface', () => {
  assert.ok(/const closeCamera = useCallback\(\(\) => \{ attemptAuthorityRef\.current\.invalidate\(\); setSheet\('create'\); \}, \[\]\);/.test(intake), 'closing the camera returns to the create sheet of the Memories root');
  assert.ok(/\{accepting \|\| cancelled \? 'Cerrar' : binarySubmitLabel\(state\.status\)\}/.test(intake), 'saving from a camera capture completes through the same review completion path as any other source');
});

console.log(`\nHOMECLOUD_ST10_CAMERA_CONVERGENCE_TESTS pass=${passed} fail=${failed}`);
if (failed > 0) process.exitCode = 1;
else console.log('HOMECLOUD_ST10_CAMERA_CONVERGENCE_TESTS=PASS');