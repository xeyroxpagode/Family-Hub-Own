import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * HOMECLOUD_ST10_INTAKE_DEBT_TESTS
 *
 * ST-10.C — the authorized V1 intake debts: CAM-08, CAM-09, INTAKE-10,
 * PERF-08 and AUD-07, plus the WRIT-07 chrome-stability gate.
 *
 * HONESTY NOTE: source-shape and behaviour-of-pure-contract only. Physical
 * capture, real uploads and real permissions stay DEVICE_QA_PENDING.
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
const intakeService = code(read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts'));
const picker = code(read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts'));
const recorder = code(read('front/mi-front-limpio/services/homecloud/MemoryAudioRecorder.tsx'));
const camera = code(read('front/mi-front-limpio/services/homecloud/MemoryCameraSurface.tsx'));
const review = code(read('front/mi-front-limpio/services/homecloud/MemoryMediaReview.tsx'));
const audioPage = code(read('front/mi-front-limpio/components/homecloud/MemoryAudioPage.tsx'));

// ===========================================================================
// CAM-09 — the camera reloads its Album destinations, exactly like every other
// intake entry point.
// ===========================================================================
test('CAM-09: openCamera reloads destinations before opening the camera', () => {
  assert.ok(
    /const openCamera = useCallback\(\(\) => \{ reloadDestinations\(\); setSheet\('camera'\); \}, \[reloadDestinations\]\);/.test(intake),
    'the camera entry re-reads the Album list through the SAME seam the other entry points use',
  );
  assert.ok(
    intake.includes("reloadDestinations();\n    setSheet('create');") && intake.includes("reloadDestinations();\n    setSheet('written');"),
    'the create sheet and the written form still reload too: the camera was the only one that did not',
  );
});

// ===========================================================================
// CAM-08 — the audio handoff is a real, rendered, understandable surface
// ===========================================================================
test('CAM-08: the handoff sheet RENDERS a component, it is not a bare state', () => {
  assert.ok(
    /<ActionSheet visible=\{sheet === 'audio-handoff'\}[\s\S]*?<MemoryAudioHandoff onReady=\{commitPendingAudio\} \/>[\s\S]*?<\/ActionSheet>/.test(intake),
    'audio-handoff renders a real surface instead of an unrendered sheet state',
  );
  assert.ok(/function MemoryAudioHandoff\(\{ onReady \}: \{ onReady: \(\) => void \}\)/.test(intake), 'the handoff surface is a component');
  assert.ok(/<ActivityIndicator color=\{colors\.brand\} \/>/.test(intake.slice(intake.indexOf('function MemoryAudioHandoff'))), 'it shows honest progress, not a blank frame');
  assert.ok(intake.includes('Abriendo la grabación para revisarla'), 'and it explains itself in words');
});

test('CAM-08: the handoff commits exactly once, from its own mount', () => {
  const component = intake.slice(intake.indexOf('function MemoryAudioHandoff'), intake.indexOf('function MemoryAlbumSelector'));
  assert.ok(/useEffect\(\(\) => \{ onReadyRef\.current\(\); \}, \[\]\);/.test(component), 'the commit runs once on mount of the handoff surface');
  assert.ok(/onReadyRef\.current = onReady;/.test(component), 'the latest callback is read through a ref, so a changed identity cannot re-run the commit');
  assert.ok(
    /const pending = pendingAudioDraftRef\.current;\n    if \(!pending\) return;/.test(intake),
    'the commit consumes the pending draft from a ref, so a re-run is a no-op rather than a second commit',
  );
  // The previous shape — an effect on `sheet` writing two states in one tick —
  // must be gone, because it was the fragility being closed.
  assert.ok(!/if \(sheet !== 'audio-handoff' \|\| !pendingAudioDraft\) return;/.test(intake), 'the state-driven double-setState transition is gone');
  assert.ok(!/setPendingAudioDraft\(null\); setSheet\('binary'\);/.test(intake), 'no single tick writes two sheet states any more');
});

test('CAM-08: a pending recording is released on close and on focus loss', () => {
  assert.ok(
    /const pending = pendingAudioDraftRef\.current;\n    if \(pending\) \{ pendingAudioDraftRef\.current = null; discardDraftArtifact\(pending\.draft\); \}/.test(intake),
    'closing the flow while a recording is in handoff releases its durable copy',
  );
  assert.ok(
    (intake.match(/discardDraftArtifact\(pending\.draft\)/g) ?? []).length >= 3,
    'every abandonment boundary (lost attempt, close, focus loss) releases the artifact',
  );
  assert.ok(!/setPendingAudioDraft/.test(intake), 'the pending recording is a ref, so the handoff commit can never read a stale render');
});

// ===========================================================================
// INTAKE-10 — the measured duration is neither persisted nor published
// ===========================================================================
test('INTAKE-10: no durationMillis survives anywhere in the intake contract', () => {
  assert.ok(!/durationMillis/.test(intakeTypes.split('INTAKE-10')[0] ?? ''), 'BinaryMemoryDraft carries no duration');
  assert.ok(!/durationMillis/.test(picker), 'the picker never produces a duration on a draft');
  assert.ok(!/outcome\.durationMillis/.test(intakeService), 'the intake service never forwards a duration');
  assert.ok(
    !/durationMillis/.test(read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeTypes.ts').split('type BinaryMemoryDraft')[1]?.split('}')[0] ?? ''),
    'the draft type itself has no duration field',
  );
  assert.ok(!/durationMillis/.test(review), 'the review never reads one, so none could ever be displayed');
  assert.ok(
    /type Capture = \{ uri: string; kind: 'image' \| 'video'; capturedAt: string \}/.test(read('front/mi-front-limpio/services/homecloud/MemoryCameraSurface.tsx')),
    'a camera capture carries only the bytes and the real capture instant',
  );
  assert.ok(
    /onUse\(\{ artifact: outcome\.artifact, capture: outcome\.capture, source: outcome\.source \}, attempt\)/.test(camera),
    'the camera hands the shared review exactly the shared draft shape, with no extra field',
  );
});

test('INTAKE-10: no duration column exists and none is invented', () => {
  const validation = read('backend/src/lib/homecloudIntakeValidation.js');
  assert.ok(!/duration_ms/.test(validation), 'the register contract still has no duration_ms field');
  const engine = code(read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts'));
  assert.ok(!/durationMillis/.test(engine), 'the upload engine never carried one either');
});

test('INTAKE-10: the recorder keeps a LOCAL measurement only for the empty-recording guard', () => {
  assert.ok(/recorderState\.durationMillis/.test(recorder), 'the visible recording timer still reads real recorder state');
  assert.ok(/recordedMillis <= 0\) throw new Error\('empty recording'\)/.test(recorder), 'the measurement still rejects an empty recording');
  assert.ok(/persistRecordedAudio\(uri, capturedAtRef\.current, attempt\)/.test(recorder), 'and it is no longer handed to the durable intake seam');
});

test('INTAKE-10: the duration the user sees is derived at playback, not stored', () => {
  assert.ok(/status\.duration/.test(audioPage), 'the Audio Viewer derives the real duration from the file itself');
});

// ===========================================================================
// PERF-08 — cancellation is reachable from the intake surface
// ===========================================================================
test('PERF-08: the intake review exposes the existing cancel authority', () => {
  assert.ok(/service\.cancel\(\)/.test(intake), 'the review reaches the service cancel that already existed and was unreachable');
  assert.ok(
    /const cancellable = service\.hasActiveJob\(\) && !cancelled;/.test(intake),
    'the affordance is bound to THIS review\'s own durable job, never to "any household job"',
  );
  assert.ok(/\{cancellable \? <AppButton title=\{binaryCancelLabel\(state\.status\)\}/.test(intake), 'it is rendered in the review footer');
  assert.ok(intake.includes('Cancelar la subida de este recuerdo'), 'the control carries an explicit accessibility label');
});

test('PERF-08: cancel never claims a finalized upload was undone', () => {
  assert.ok(
    /function binaryCancelLabel[\s\S]*?if \(status === 'verifying' \|\| status === 'finalizing'\) return 'Cancelar el envío';/.test(intake),
    'the copy names the state it would actually stop',
  );
  const cancelled = intake.slice(intake.indexOf('const cancelled = state.status'), intake.indexOf('const cancellable'));
  assert.ok(cancelled.length > 0, 'the cancelled state is a first-class concept in the review');
  const coordinator = code(read('front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator.ts'));
  assert.ok(
    /try \{ cancelled = transition\(job, 'cancelled'\); \} catch \{ return deps\.store\.get\(jobId\); \}\n      await persist\(deps\.store, cancelled\);/.test(coordinator),
    'the shared coordinator really persists the terminal cancelled state, so a cancel is a fact and not a UI impression',
  );
  assert.ok(
    /async cancel\(jobId\) \{\n      const job = deps\.store\.get\(jobId\);\n      if \(!job \|\| job\.householdId !== deps\.householdId \|\| job\.state === 'completed' \|\| job\.state === 'cancelled'\) return null;/.test(coordinator),
    'and cancelling an already-finished job is refused rather than faked',
  );
});

test('PERF-08: after a cancellation the review stops offering Save (no duplicate job)', () => {
  assert.ok(/const saveDisabled = !binaryDraft \|\| active \|\| accepting \|\| cancelled/.test(intake), 'Save is disabled once the job is cancelled');
  assert.ok(/if \(status === 'cancelled'\) return 'Cerrar';/.test(intake), 'the primary action becomes Close, not a re-save');
  assert.ok(intake.includes('No se guardó este recuerdo'), 'and the surface says plainly that nothing was saved');
  // The coordinator refuses to retry a cancelled job, so a re-save could only
  // ever create a second job for the same intent.
  const coordinator = code(read('front/mi-front-limpio/services/homecloud/homecloudUploadCoordinator.ts'));
  assert.ok(
    /async retry\(jobId\) \{\n      const job = deps\.store\.get\(jobId\);\n      if \(!job \|\| job\.householdId !== deps\.householdId \|\| job\.state === 'completed' \|\| job\.state === 'cancelled'\) return;/.test(coordinator),
    'the shared retry path genuinely refuses a cancelled job',
  );
});

// ===========================================================================
// AUD-07 — the audio session is FORCED and honestly named
// ===========================================================================
test('AUD-07: nothing in the app claims a prior audio mode was restored', () => {
  assert.ok(!/returnToPlaybackMode/.test(recorder), 'the misleading "return to" name is gone');
  assert.ok(/const forcePlaybackAudioMode = useCallback/.test(recorder), 'the operation is named for what it does: force');
  assert.ok(/audio_session_forced', \{ mode: 'playback', restored: false \}/.test(recorder), 'the trace states explicitly that nothing was restored');
  assert.ok(intakeTypes.includes('AUDIO_SESSION_RESTORE_BLOCKER') === false, 'the blocker is reported, not coded around');
});

test('AUD-07: the installed expo-audio exposes no way to read the prior mode', () => {
  const pkg = read('front/mi-front-limpio/package.json');
  const version = /"expo-audio":\s*"([^"]+)"/.exec(pkg)?.[1] ?? '';
  assert.ok(version.length > 0, `expo-audio is a declared dependency (${version})`);
  const types = path.join(root, 'front/mi-front-limpio/node_modules/expo-audio/build/ExpoAudio.d.ts');
  if (fs.existsSync(types)) {
    const source = fs.readFileSync(types, 'utf8');
    assert.ok(/export declare function setAudioModeAsync/.test(source), 'setAudioModeAsync is the only audio-mode API declared');
    assert.ok(!/getAudioModeAsync/.test(source), 'there is NO getAudioModeAsync: the prior mode cannot be read, so it cannot be restored');
  }
  assert.ok(!/getAudioModeAsync\(/.test(recorder), 'and the recorder does not pretend otherwise');
});

test('AUD-07: recording still releases the microphone and never asks for background audio', () => {
  assert.ok(/setAudioModeAsync\(\{ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false \}\)/.test(recorder), 'the forced playback mode releases the microphone and keeps background playback out');
  assert.ok(/setAudioModeAsync\(\{ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false \}\)/.test(recorder), 'recording mode is still established before prepareToRecordAsync');
  assert.ok(!/shouldPlayInBackground: true/.test(recorder), 'background playback is never requested');
});

// ===========================================================================
// WRIT-07 — written-page scrolling must not toggle the Viewer chrome
// ===========================================================================
test('WRIT-07: the written page gates its chrome toggle on "no user drag"', () => {
  const viewer = code(read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx'));
  const written = viewer.slice(viewer.indexOf('function WrittenPage'), viewer.indexOf('function MediaPlaceholder'));
  assert.ok(!/onTouchEnd=\{onTap\}/.test(written), 'the raw touch-end binding that fired on every scroll is gone');
  assert.ok(/onScrollBeginDrag/.test(written), 'a real user drag over the text is recorded');
});

// ===========================================================================
// Freeze: no backend, no schema and no dependency changed
// ===========================================================================
test('no backend, migration or dependency change came with these debts', () => {
  const pkg = read('front/mi-front-limpio/package.json');
  assert.ok(!/expo-media-library|react-native-gesture-handler|react-native-reanimated/.test(pkg), 'no new dependency was introduced');
  const validation = read('backend/src/lib/homecloudIntakeValidation.js');
  assert.ok(!/duration_ms/.test(validation), 'no duration column was added');
});

console.log(`\nHOMECLOUD_ST10_INTAKE_DEBT_TESTS pass=${passed} fail=${failed}`);
if (failed > 0) process.exitCode = 1;
else console.log('HOMECLOUD_ST10_INTAKE_DEBT_TESTS=PASS');