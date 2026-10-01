const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const intake = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const camera = read('front/mi-front-limpio/services/homecloud/MemoryCameraSurface.tsx');
const attempt = read('front/mi-front-limpio/services/homecloud/homecloudMemoryAttempt.ts');
const picker = read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts');
const review = read('front/mi-front-limpio/services/homecloud/MemoryMediaReview.tsx');
const recorder = read('front/mi-front-limpio/services/homecloud/MemoryAudioRecorder.tsx');
const service = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const engine = read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');
const written = read('front/mi-front-limpio/services/homecloud/homecloudWrittenMemoryService.ts');
const scanner = read('front/mi-front-limpio/screens/HomeCloudScannerScreen.tsx');
const app = read('front/mi-front-limpio/app.json');
const config = read('front/mi-front-limpio/app.config.js');
const artifactMime = read('front/mi-front-limpio/services/homecloud/homecloudArtifactMime.ts');
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`  PASS: ${name}`); }
console.log('\n=== HOMECLOUD MEMORIES STAGE A1 CAPTURE RECOVERY ===\n');

test('1 Capturar momento exists', () => assert.match(intake, /title="Capturar momento"/));
test('2 Sacar foto menu removed', () => assert.doesNotMatch(intake, /title="Sacar foto"/));
test('3 Grabar video menu removed', () => assert.doesNotMatch(intake, /title="Grabar video"/));
test('4 Camera opens in HomePlus', () => assert.match(intake, /<MemoryCameraSurface/));
test('5 default Foto', () => assert.match(camera, /useState<CameraMode>\('picture'\)/));
test('6 Foto Video changes mode', () => assert.match(camera, /value: 'picture', label: 'Foto'[\s\S]*value: 'video', label: 'Video'/));
test('7 photo capture', () => assert.match(camera, /takePictureAsync/));
test('8 video record', () => assert.match(camera, /recordAsync\(\)/));
test('9 video stop', () => assert.match(camera, /stopRecording\(\)/));
test('10 front back', () => assert.match(camera, /value === 'back' \? 'front' : 'back'/));
test('11 close cleanup', () => assert.match(camera, /cleanup', \{ reason: 'close'/));
test('12 background cleanup', () => assert.match(camera, /AppState\.addEventListener[\s\S]*stopNativeRecording/));
test('13 permission denied', () => assert.match(camera, /!permission\.granted/));
test('14 settings path', () => assert.match(camera, /Linking\.openSettings/));
test('15 repeat photo', () => assert.match(camera, /title="Repetir"/));
test('16 repeat video', () => assert.match(camera, /const retake/));
test('17 use photo', () => assert.match(camera, /'Usar foto'/));
test('18 use video', () => assert.match(camera, /'Usar video'/));
test('19 attempt token', () => assert.match(attempt, /id: `a\$\{nextAttemptId\+\+\}`/));
test('20 stale result ignored', () => assert.match(camera, /operationRef\.current !== operation \|\| !ownsAttempt\(attempt\)/));
test('21 unmount invalidates', () => assert.match(camera, /mountedRef\.current = false; invalidateOperation\(\)/));
test('22 close invalidates', () => assert.match(intake, /closeCamera[\s\S]*attemptAuthorityRef\.current\.invalidate\(\)/));
test('23 cleanup idempotent', () => assert.match(camera, /deleteAsync\(uri, \{ idempotent: true \}\)/));
test('24 disposal blocks updates', () => assert.match(attempt, /!this\.disposed && this\.current\?\.id === attempt\.id/));
test('25 gallery image remains', () => assert.match(picker, /launchImageLibraryAsync/));
test('26 gallery video artifact', () => assert.match(picker, /mediaTypes: \['images', 'videos'\]/));
test('27 video player mount', () => assert.match(review, /useVideoPlayer\(\{ uri \}/));
test('28 video player ready', () => assert.match(review, /status === 'readyToPlay'/));
test('29 video player error', () => assert.match(review, /status === 'error'/));
test('30 video cleanup', () => assert.match(review, /player_cleanup/));
test('31 video retry', () => assert.match(review, /No pudimos cargar este video[\s\S]*onRetry/));
test('32 audio permission', () => assert.match(recorder, /requestRecordingPermissionsAsync/));
test('33 audio prepare', () => assert.match(recorder, /prepareToRecordAsync/));
test('34 audio record', () => assert.match(recorder, /recorder\.record\(\)/));
test('35 real audio timer', () => assert.match(recorder, /recorderState\.durationMillis/));
test('36 audio stop', () => assert.match(recorder, /await recorder\.stop\(\)/));
test('37 real URI', () => assert.match(recorder, /recorder\.uri \?\? stopped\.url/));
test('38 durable audio copy', () => assert.match(recorder, /persistRecordedAudio/));
test('39 playback transition', () => assert.match(recorder, /allowsRecording: false/));
test('40 audio player', () => assert.match(review, /useAudioPlayer\(uri/));
test('41 rerecord', () => assert.match(intake, /title="Volver a grabar"/));
test('42 recorder cleanup', () => assert.match(recorder, /stopAndDiscard/));
test('43 audio import durable', () => assert.match(picker, /getDocumentAsync[\s\S]*copyArtifactToDurableWorkspace/));
test('44 shared audio review', () => assert.match(review, /: <AudioReview/));
test('45 written remains', () => assert.ok(intake.includes('createWrittenMemory') && written.includes('/api/homecloud/register')));
test('46 media exit localized', () => assert.match(review, /MediaErrorBoundary/));
test('47 camera cancel navigation safe', () => assert.match(camera, /return \(\) => \{[\s\S]*stopNativeRecording/));
test('48 video close navigation safe', () => { assert.match(review, /subscription\.remove\(\)/); assert.doesNotMatch(review, /subscription\.remove\(\); player\.pause\(\)/); });
test('49 audio close navigation safe', () => { assert.match(recorder, /subscription\.remove\(\)/); assert.doesNotMatch(recorder, /subscription\.remove\(\); void stopAndDiscard\(\)/); });
test('50 one shared upload engine', () => { assert.match(service, /createUploadEngine/); assert.ok(['register_start', 'upload_start', 'verify_start', 'finalize_start'].every((e) => engine.includes(e))); assert.doesNotMatch(camera + picker + recorder, /createUploadEngine/); });

// ── HOMECLOUD_MEMORIES_STAGE_A1_2_CONFIRMED_BLOCKERS_RECOVERY ──────────────
// CAMERA VIDEO READY GATE (Foto → Video recovered readiness, then one record).
test('51 camera readiness is recovered by an explicit remount', () => {
  assert.match(camera, /const \[surfaceSession, setSurfaceSession\] = useState\(0\)/);
  assert.match(camera, /const remountSurface = useCallback\(\(\) => \{ setReady\(false\); setSurfaceSession\(\(value\) => value \+ 1\); \}, \[\]\)/);
  assert.match(camera, /<CameraView key=\{`\$\{mode\}:\$\{facing\}:\$\{surfaceSession\}`\}/);
});
test('52 mode switch drops and remounts readiness', () => assert.match(camera, /setMode\(next\); remountSurface\(\); setError\(null\)/));
test('53 facing switch drops and remounts readiness', () => assert.match(camera, /setFacing\(\(value\) => value === 'back' \? 'front' : 'back'\); remountSurface\(\);/));
test('54 retake and mount-error retry remount the surface', () => {
  assert.match(camera, /const retake = [^\n]*remountSurface\(\); setPhase\('ready'\)/);
  assert.match(camera, /onPress=\{\(\) => \{ setError\(null\); remountSurface\(\); setPhase\('ready'\); \}\}/);
});
test('55 remount preserves facing, attempt, permissions and AppState', () => {
  const remountCallers = ['switchMode', 'retake', 'onPress={() => { setFacing'];
  assert.ok(remountCallers.every((c) => camera.includes(c)));
  assert.ok(!/remountSurface[^;]*setFacing\(/.test(camera), 'remount must not reset facing');
  assert.ok(!/remountSurface[^;]*beginAttempt/.test(camera), 'remount must not restart the attempt');
  assert.match(camera, /const \[permission, requestPermission, getPermission\] = useCameraPermissions\(\)/);
  assert.match(camera, /const \[appActive, setAppActive\] = useState\(AppState\.currentState === 'active'\)/);
});
test('56 readiness is never forced, timed or bypassed', () => {
  assert.doesNotMatch(camera, /setReady\(true\)[^;]*;?\s*(?:\/\/)?\s*(setTimeout|await)/);
  assert.ok(camera.includes('onCameraReady={() => { setReady(true);'), 'ready=true only from onCameraReady');
  assert.equal((camera.match(/setReady\(true\)/g) ?? []).length, 1);
});
test('57 record gate trace is complete', () => {
  assert.match(camera, /'camera_video record_gate'/);
  ['ready,', 'active:', 'focused:', 'appActive,', 'cameraPermission:', 'microphonePermission:', 'recording,', 'stopping,', 'refReady:', 'disabled:'].forEach((field) => assert.ok(camera.includes(field), field));
});
test('58 record button is disabled exactly by the gate', () => {
  assert.match(camera, /disabled: !ready \|\| phase === 'capturing' \|\| stopping \|\| phase === 'error'/);
  assert.match(camera, /<AppButton variant="icon" disabled=\{recordGate\.disabled\}/);
});
test('59 recordAsync is reachable exactly once per press sequence', () => {
  assert.match(camera, /const recordStartLockRef = useRef\(false\)/);
  assert.match(camera, /phase !== 'ready' \|\| recordStartLockRef\.current\)/);
  assert.match(camera, /recordStartLockRef\.current = true;/);
  assert.match(camera, /finally \{ recordStartLockRef\.current = false; \}/);
  assert.equal((camera.match(/recordAsync\(\)/g) ?? []).length, 1);
});
test('60 stop is requested exactly once per recording', () => {
  assert.match(camera, /const stopRequestLockRef = useRef\(false\)/);
  assert.match(camera, /if \(phase !== 'recording' \|\| stopRequestLockRef\.current\) return;/);
  assert.match(camera, /stopRequestLockRef\.current = false; setElapsed\(0\); setPhase\('recording'\)/);
});
test('61 refused record presses are still traced', () => assert.match(camera, /if \(mode === 'video'\) memoryAttemptTrace\(attemptRef\.current, 'camera_video record_gate', \{ \.\.\.recordGate, decision: 'refused' \}\)/));
test('62 HomeCloud photo capture requests maximum processed quality and EXIF', () => {
  assert.match(camera, /value: 'picture', label: 'Foto'/);
  assert.match(camera, /mode === 'picture' \? void takePhoto\(\) : void startVideo\(\)/);
  assert.match(camera, /takePictureAsync\(\{ quality: 1, exif: true \}\)/);
});
test('63 close during a mode change stays safe', () => {
  assert.match(camera, /const close = useCallback\(\(\) => \{ invalidateOperation\(\); stopNativeRecording\(\)/);
  assert.match(camera, /mountedRef\.current = false; invalidateOperation\(\); stopNativeRecording\(\); subscription\.remove\(\)/);
  assert.match(camera, /key=\{`\$\{mode\}:\$\{facing\}:\$\{surfaceSession\}`\} ref=\{cameraRef\}/);
});

assert.match(scanner, /CameraView/);
test('64 scanner requests quality=1 and does not require EXIF', () => {
  assert.match(scanner, /takePictureAsync\(\{ quality: 1 \}\)/);
  assert.doesNotMatch(scanner, /takePictureAsync\(\{ quality: 1, exif: true \}\)/);
});
test('65 camera artifact MIME is derived from URI/header evidence, never assumed JPEG', () => {
  assert.match(picker, /resolveCapturedArtifactFormat/);
  assert.doesNotMatch(picker, /input\.kind === 'image' \? 'image\/jpeg'/);
  assert.match(artifactMime, /position: 0,[\s\S]*length: 32/);
  assert.match(artifactMime, /No pudimos determinar de forma segura/);
});
test('66 canonical camera artifact is copied without an image transform', () => {
  assert.match(picker, /copyArtifactToDurableWorkspace/);
  assert.doesNotMatch(picker, /manipulateAsync|ImageManipulator|compress:|resize:/);
});
assert.match(app, /cameraPermission[\s\S]*microphonePermission/);
assert.ok(config.includes('expo-audio') && config.includes('expo-video'));
assert.doesNotMatch(picker, /launchCameraAsync/);
console.log(`\nHOMECLOUD_MEMORIES_STAGE_A1_CAPTURE_RECOVERY_TESTS pass=${passed} fail=0`);
