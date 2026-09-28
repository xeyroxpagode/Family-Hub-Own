const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const intake = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const picker = read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts');
const service = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const durable = read('front/mi-front-limpio/services/homecloud/homecloudDurableArtifact.ts');
const review = read('front/mi-front-limpio/services/homecloud/MemoryMediaReview.tsx');
const recorder = read('front/mi-front-limpio/services/homecloud/MemoryAudioRecorder.tsx');
const camera = read('front/mi-front-limpio/services/homecloud/MemoryCameraSurface.tsx');
const engine = read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');
const written = read('front/mi-front-limpio/services/homecloud/homecloudWrittenMemoryService.ts');
const app = read('front/mi-front-limpio/app.json');
const config = read('front/mi-front-limpio/app.config.js');
const pkg = JSON.parse(read('front/mi-front-limpio/package.json'));
let pass = 0;
function test(name, fn) { fn(); pass += 1; console.log(`  PASS: ${name}`); }
console.log('\n=== HOMECLOUD MEMORIES STAGE A CORE CREATION ===\n');

test('menu: unified in-app capture', () => assert.match(intake, /title="Capturar momento"/));
test('menu: old split capture actions removed', () => { assert.doesNotMatch(intake, /title="Sacar foto"/); assert.doesNotMatch(intake, /title="Grabar video"/); });
test('menu: combined import entry', () => assert.match(intake, /title="Elegir foto\/video\/audio"/));
test('menu: audio recorder', () => assert.match(intake, /title="Grabar audio"/));
test('menu: written', () => assert.match(intake, /title="Escribir un recuerdo"/));
test('combined import uses honest sub-sheet', () => assert.match(intake, /'Fotos y videos'[\s\S]*title="Audio"/));
test('gallery is single selection image/video', () => assert.match(picker, /mediaTypes: \['images', 'videos'\][\s\S]*allowsMultipleSelection: false/));
test('camera image uses in-app CameraView', () => assert.match(camera, /<CameraView/));
test('camera permission is just-in-time', () => assert.match(camera, /useCameraPermissions\(\)/));
test('captured media gets exact event time', () => assert.match(camera, /capturedAt = new Date\(\)\.toISOString\(\)/));
test('gallery metadata stays semantic', () => assert.match(picker, /deriveMediaCaptureMetadata/));
test('audio import uses audio picker', () => assert.match(picker, /getDocumentAsync\(\{ type: 'audio\/\*'/));
test('audio import date is unknown', () => assert.match(picker, /capture: unknownMediaCaptureMetadata\(\), source: 'audio-import'/));
test('audio MIME is validated', () => assert.match(picker, /startsWith\('audio\/'\)/));
test('recording uses expo-audio', () => assert.match(recorder, /useAudioRecorder\(RecordingPresets\.HIGH_QUALITY\)/));
test('recording permission is just-in-time', () => assert.match(recorder, /requestRecordingPermissionsAsync\(\)/));
test('recording timer comes from recorder state', () => assert.match(recorder, /recorderState\.durationMillis/));
test('recording capture time is real start time', () => assert.match(recorder, /capturedAtRef\.current = new Date\(\)\.toISOString\(\)/));
test('recorder native stop is a mount-scoped path', () => { assert.match(recorder, /if \(recorder\.isRecording\)/); assert.match(recorder, /await recorder\.stop\(\)/); });
test('recorder is never read after the hook released it', () => assert.doesNotMatch(recorder, /subscription\.remove\(\);\s*void stopAndDiscard\(\)/));
test('recorded temp is removed after durable copy', () => assert.match(picker, /deleteAsync\(uri, \{ idempotent: true \}\)/));
test('image review never decodes original directly', () => assert.match(review, /manipulateAsync\(draft\.artifact\.localUri/));
test('image preview is a separate bounded representation', () => assert.match(review, /resize: \{ width: 1600 \}/));
test('image review has loading state', () => assert.match(review, /Preparando vista previa/));
test('image review has recoverable error', () => assert.match(review, /No pudimos mostrar la vista previa[\s\S]*onRetry/));
test('image review records load lifecycle', () => assert.match(review, /onLoadStart[\s\S]*onLoad[\s\S]*onError/));
test('video review is real and paused', () => assert.match(review, /useVideoPlayer[\s\S]*instance\.pause\(\)[\s\S]*<VideoView/));
test('video review has native playback controls', () => assert.match(review, /<VideoView[\s\S]*nativeControls/));
test('audio review is real', () => assert.match(review, /useAudioPlayer\(uri/));
test('audio review uses real duration', () => assert.match(review, /status\.duration/));
test('binary review never renders displayName', () => assert.doesNotMatch(intake.slice(intake.indexOf("visible={sheet === 'binary'}"), intake.indexOf("visible={sheet === 'written'}")), /displayName/));
test('durable copied size is authoritative', () => assert.match(durable, /sizeBytes: info\.size/));
test('zero-byte artifacts fail before job creation', () => assert.match(durable, /info\.size <= 0[\s\S]*InvalidDurableArtifactError/));
test('copy failure is typed and recoverable', () => assert.match(durable, /class InvalidDurableArtifactError extends Error/));
test('all binary sources enter one service method', () => assert.match(intake, /service\.createBinaryMemory\(binaryDraft/));
test('service uses only shared upload engine', () => assert.match(service, /createUploadEngine/));
test('no source-specific upload engine exists', () => assert.doesNotMatch(intake + picker + service, /CameraUploadService|AudioUploadEngine|VideoUploadEngine|GalleryUploadEngine/));
test('register/upload/verify/finalize instrumentation exists', () => ['register_start','register_end','upload_start','upload_end','verify_start','verify_end','finalize_start','finalize_end'].forEach((event) => assert.ok(engine.includes(`'${event}'`), event)));
test('diagnostics never receive secrets', () => assert.doesNotMatch(intake + picker + service + engine, /memoryDevTrace\([^\n]*(accessToken|signedUploadUrl|exif:)/i));
test('after createJob the sheet cannot delete the original', () => assert.match(intake, /if \(!service\.hasActiveJob\(\)\) discardDraftArtifact/));
test('before createJob cancel removes its durable draft', () => assert.match(intake, /discardMemoryMedia\(draft\.artifact\)/));
test('attempt ownership protects late picker resolves', () => assert.match(intake, /pickerAttemptRef\.current !== attempt/));
test('written remains register/finalize', () => assert.ok(written.includes('/api/homecloud/register') && written.includes('/finalize')));
test('written never creates an UploadJob or binary', () => assert.doesNotMatch(written, /UploadJob|mimeType|sizeBytes|localUri/));
test('camera permission config is present', () => assert.match(app, /cameraPermission/));
test('microphone permission config is enabled', () => assert.doesNotMatch(app, /"microphonePermission": false/));
test('expo runtime plugins are configured', () => assert.ok(config.includes('expo-video') && config.includes('expo-audio')));
test('official media dependencies are SDK-pinned', () => { assert.equal(pkg.dependencies['expo-video'], '~57.0.5'); assert.equal(pkg.dependencies['expo-audio'], '~57.0.5'); assert.equal(pkg.dependencies['expo-image-manipulator'], '~57.0.20'); });
test('forbidden media dependencies remain absent', () => ['expo-media-library','ffmpeg','video-thumbnails'].forEach((name) => assert.equal(pkg.dependencies[name], undefined)));
test('no fake media UX exists', () => assert.doesNotMatch(intake + picker + review + recorder, /simulateUpload|fake waveform|fake poster|placeholder.*media/i));
test('engine keeps stable job recovery path', () => assert.match(service, /recoverUploadJobs/));

// ── HOMECLOUD_MEMORIES_STAGE_A1_2_CONFIRMED_BLOCKERS_RECOVERY ──────────────
// Single-owner contract for every SharedObject-backed native handle.
test('RC2 video player is released only by useVideoPlayer', () => {
  assert.doesNotMatch(review, /subscription\.remove\(\); player\.pause\(\)/);
  assert.doesNotMatch(review, /player\.release\(\)/);
  assert.match(review, /subscription\.remove\(\);/);
  assert.match(review, /instance\.pause\(\)/);
});
test('RC2 video listener is removed idempotently and stops feeding state', () => {
  const cleanup = review.slice(review.indexOf('function VideoPlayerInstance'), review.indexOf('function AudioReview'));
  assert.match(cleanup, /let active = true;/);
  assert.match(cleanup, /subscription\.remove\(\);/);
  assert.match(cleanup, /active = false;/);
  assert.match(review, /const applyStatus = \(\{ status, error \}[\s\S]*?if \(!active\) return;/);
});
test('RC2 retry builds a fresh player with no stale reference', () => assert.match(review, /key=\{`\$\{uri\}:\$\{retry\}`\}/));
test('RC3 audio player is released only by useAudioPlayer', () => {
  assert.doesNotMatch(review, /player\.pause\(\); trace\(attempt, 'player_cleanup', \{ kind: 'audio'/);
  assert.doesNotMatch(review, /return \(\) => \{ player\./);
  assert.match(review, /player_cleanup', \{ kind: 'audio', reason: 'hook_owned_release'/);
});
test('RC3 recorder URI is read while the recorder is still valid', () => {
  assert.match(recorder, /const stopped = recorder\.getStatus\(\);[\s\S]*const uri = recorder\.uri \?\? stopped\.url;[\s\S]*pendingUriRef\.current = uri;/);
});
test('RC3 recorder ownership ends before the handoff', () => {
  assert.match(recorder, /pendingUriRef\.current = null; recordedRef\.current = true;[\s\S]*onReady\(draft, attempt\)/);
  assert.match(recorder, /recorderOwnership: 'released_by_useAudioRecorder'/);
});
test('RC3 closing the recorder sheet is routed through the mounted recorder', () => {
  assert.match(recorder, /abandonRef\(\{ abandon: \(\) => \{ cancelRef\.current\(\); \} \}\)/);
  assert.match(intake, /abandonRef=\{setRecorderHandle\}/);
  assert.match(intake, /const handle = recorderHandleRef\.current;[\s\S]*handle\.abandon\(\);/);
});
test('RC3 audio import and audio record share one Review primitive', () => {
  assert.match(review, /const kind = draft\.artifact\.mimeType\.startsWith\('image\/'\)[\s\S]*<AudioReview uri=\{draft\.artifact\.localUri\}/);
  assert.match(review, /review_kind', \{ kind, source: draft\.source/);
});

// Success semantics: persistence result is final, local cleanup cannot rewrite it.
test('SUCCESS finalize is reported before any local teardown', () => {
  const effect = intake.slice(intake.indexOf("state.status !== 'completed'"), intake.indexOf('const active = ['));
  const reported = effect.indexOf('onComplete?.(state.contentId)');
  const cleared = effect.indexOf("clearBinaryDraft('completed')");
  assert.ok(reported >= 0 && cleared > reported, 'onComplete must run before draft cleanup');
});
test('SUCCESS completed path never reports a failure', () => assert.doesNotMatch(intake.slice(intake.indexOf("state.status !== 'completed'"), intake.indexOf('const active = [')), /emitState|service\.retry|setWrittenError/));
test('SUCCESS local media cleanup is best effort and never throws into the flow', () => assert.match(intake, /discardMemoryMedia\(draft\.artifact\)\)\s*\n\s*\.catch\(\(\) => \{/));

// Every draft teardown names its CAUSE.
test('DIAG draft_clear always carries a reason', () => {
  assert.match(intake, /clearBinaryDraft = useCallback\(\(reason: BinaryDraftClearReason\)/);
  assert.match(intake, /memoryDevTrace\('draft_clear', \{ reason,/);
  ['completed', 'review_close', 'focus_lost', 'rerecord'].forEach((r) => assert.ok(intake.includes(`clearBinaryDraft('${r}')`), r));
});
test('DIAG required cleanup traces exist', () => ['review_close_requested', 'draft_clear', 'intake_unmount', 'focus_lost', 'completed_cleanup', 'service_recreated'].forEach((event) => assert.ok(intake.includes(`'${event}'`), event)));
test('DIAG media review teardown distinguishes unmount from preview reset', () => assert.match(review, /review_unmount', \{ kind: 'image', reason: unmountedRef\.current \? 'unmount' : 'preview_reset' \}/));
test('DIAG video/audio teardown names its cause', () => {
  assert.match(review, /player_cleanup', \{ kind: 'video', reason: 'listener_removed'/);
  assert.match(review, /review_unmount', \{ kind: 'video', reason: 'unmount'/);
  assert.match(review, /review_unmount', \{ kind: 'audio', reason: 'unmount'/);
});
test('DIAG no binary draft clear without a reason', () => assert.doesNotMatch(intake, /clearBinaryDraft\(\)/));

console.log(`\nHOMECLOUD_MEMORIES_STAGE_A_CORE_CREATION_TESTS pass=${pass} fail=0`);
