#!/usr/bin/env node
'use strict';

/**
 * HOMECLOUD S0 — Gallery intake contract (format honesty + shared path + submit).
 *
 * The contract under test (survives T2/TUS):
 *   "a gallery image and a gallery video are staged into the SAME neutral
 *    durable artifact, describe themselves HONESTLY, and are saved through the
 *    SAME shared intake engine and the SAME single Save entry".
 *
 * What this file deliberately does NOT assert (it belongs to the presentation
 * contract, frozen in homecloud_s0_modal_host_contract_tests.js):
 *   source|binary Modal hosting, onDismiss, timers, native presentation order.
 *
 * What is deliberately NOT the contract:
 *   "gallery video calls uploadAsync / PUT" — transport is not frozen (TUS-safe).
 *
 * Static + backend-runtime checks, no DB, no device.
 */

const fs = require('fs');
const path = require('path');
const {
  validateRegisterPayload,
  isMemoryMediaMime,
} = require('../backend/src/lib/homecloudIntakeValidation');
const { assertHomeCloudAcceptedSize } = require('../backend/src/lib/homecloudSizePolicy');

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const intake = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const service = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const picker = read('front/mi-front-limpio/services/homecloud/homecloudMemoryPicker.ts');
const artifactMime = read('front/mi-front-limpio/services/homecloud/homecloudArtifactMime.ts');
const durable = read('front/mi-front-limpio/services/homecloud/homecloudDurableArtifact.ts');
const engine = read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');
const review = read('front/mi-front-limpio/services/homecloud/MemoryMediaReview.tsx');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
  } else {
    failCount += 1;
    console.error(`  FAIL: ${message}`);
  }
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

console.log('\n=== HOMECLOUD S0 GALLERY INTAKE CONTRACT TESTS ===\n');

// ===========================================================================
// A. FORMAT HONESTY — a gallery video is labelled as what its bytes are.
// ===========================================================================

record(picker.includes("'video/mp4'") && picker.includes("'video/quicktime'"), 'picker MIME map covers mp4 + quicktime');
record(picker.includes("'video/x-m4v'") && picker.includes("'video/3gpp'") && picker.includes("'video/3gpp2'"), 'picker MIME map covers m4v/3gp/3g2 (real gallery video families)');
record(picker.includes("'video/mov'") && picker.includes("'video/x-quicktime'"), 'picker MIME map normalises the alternative quicktime spellings');
record(artifactMime.includes('ftypqt') && artifactMime.includes('ftyp3gp') && artifactMime.includes('ftyp3g2') && artifactMime.includes('ftypM4V'), 'magic table names MOV/3GP/3G2/M4V brands instead of collapsing every ftyp to mp4');
record(artifactMime.includes("brand.startsWith('ftyp')") && artifactMime.includes('EXTENSION_FORMATS.mp4'), 'an unnamed ftyp brand still falls back to mp4 (unchanged behaviour)');
record(picker.includes('probeGalleryVideoFormat'), 'gallery video path probes the honest format from the bytes');
record(/if \(mimeType\.startsWith\('video\/'\)\)/.test(picker), 'the honest probe applies to video only (image path untouched)');
record(artifactMime.includes('position: 0') && artifactMime.includes('length: 32'), 'the probe reads a bounded 32-byte header only');
record(/catch \{\s*return null;\s*\}/.test(artifactMime), 'the probe is fail-open: an unreadable header never blocks a valid video');

// ===========================================================================
// B. SHARED ARTIFACT / INTAKE PATH — one neutral artifact, one engine.
// ===========================================================================

record(picker.includes('UploadLocalArtifact'), 'gallery picker produces the neutral UploadLocalArtifact');
record(picker.includes('copyArtifactToDurableWorkspace'), 'gallery stages into the durable workspace (stable file://)');
record(picker.includes('persistCameraCapture'), 'camera stages into the same durable workspace');
record(durable.includes('copyAsync'), 'durable staging uses a native copy (no JS RAM load)');
record(!durable.includes('arrayBuffer()') && !durable.includes('readAsStringAsync'), 'durable staging never reads file bytes into JS');
record(service.includes('createUploadEngine'), 'memory intake uses the shared upload engine');
record(!/function createUploadEngine|class .*UploadEngine/.test(stripComments(service).replace('createUploadEngine(', '')), 'memory intake defines no second engine/state machine');
record(!/function createUploadEngine|class .*UploadEngine/.test(stripComments(picker)), 'picker defines no second uploader/state machine');
record(!picker.includes('uploadAsync') && !picker.includes('signedUploadUrl') && !picker.includes('arrayBuffer()'), 'picker never uploads directly and never loads bytes (engine owns transport)');
record(service.includes('uploadTransport') && engine.includes('uploadTransport'), 'the engine takes an injected transport (TUS-safe; no transport impl frozen here)');
record(engine.includes('BINARY_CONTENT'), 'the engine streams file:// natively (no JS RAM load)');

// No transcoding / no recompression of the original: bytes stay byte-for-byte.
record(!picker.includes('manipulateAsync') && !picker.includes('VideoExportPreset'), 'picker never manipulates/transcodes the original');
record(!/ffmpeg|transcod|re-?encod|compress.*video/i.test(stripComments(picker)), 'picker contains no transcode/recompress path');

// The backend accepts the real families, with no video-specific backend rule.
record(isMemoryMediaMime('video/mp4') === true, 'backend MIME policy accepts video/mp4');
record(isMemoryMediaMime('video/quicktime') === true, 'backend MIME policy accepts video/quicktime (iOS MOV)');
record(isMemoryMediaMime('image/jpeg') === true, 'backend MIME policy still accepts image/jpeg');
record(isMemoryMediaMime('application/pdf') === false, 'backend MIME policy still rejects non-media for memories');
{
  const mov = validateRegisterPayload({ role: 'memory', displayName: 'clip.mov', mimeType: 'video/quicktime', sizeBytes: 8, extension: 'mov' });
  record(mov.mimeType === 'video/quicktime' && mov.extension === 'mov', 'register accepts a gallery MOV memory payload');
}
{
  const mp4 = validateRegisterPayload({ role: 'memory', displayName: 'clip.mp4', mimeType: 'video/mp4', sizeBytes: 8, extension: 'mp4' });
  record(mp4.mimeType === 'video/mp4', 'register accepts a gallery MP4 memory payload');
}

// Size: the historic 50/60 MiB wall stays closed.
record(assertHomeCloudAcceptedSize(8 * 1024 * 1024, { HOMECLOUD_MAX_UPLOAD_BYTES: '5368709120' }) === 5368709120, 'small video passes the 5 GiB deployment policy');
record(assertHomeCloudAcceptedSize(70 * 1024 * 1024, { HOMECLOUD_MAX_UPLOAD_BYTES: '5368709120' }) === 5368709120, '>60 MiB video passes (no historic wall)');
{
  let code = null;
  try {
    assertHomeCloudAcceptedSize(5368709121, { HOMECLOUD_MAX_UPLOAD_BYTES: '5368709120' });
  } catch (e) {
    code = e.code;
  }
  record(code === 'file_too_large', 'over-limit is still rejected with file_too_large');
}

// ===========================================================================
// E. SAVE -> SHARED SUBMIT — one Review, one Guardar, one submit entry.
// ===========================================================================

record(picker.includes("'images'") && picker.includes("'videos'"), 'the picker requests images + videos from ONE presentation');
record(/asset\.type === 'image'/.test(picker) && /asset\.type === 'video'/.test(picker), 'the picker falls back by asset type for both kinds');
record(review.includes('MemoryVideoPreview') && review.includes('VideoView'), 'the Review renders video through the shared VideoView preview');
record(review.includes('pointerEvents="none"') && review.includes('fullscreenOptions={{ enable: false }}'), 'the video overlay keeps touch routing correct and does not hijack fullscreen');

// One binary Review surface with one Guardar footer.
record((intake.match(/const submitBinary = useCallback/g) ?? []).length === 1, 'exactly ONE submitBinary shared entry');
record((intake.match(/service\.createBinaryMemory\(/g) ?? []).length === 1, 'submitBinary is the single createBinaryMemory call site');
record(intake.includes("binarySubmitLabel(state.status)"), 'the Guardar footer lives in the binary Review content');
// T1 reconciliation: the single creation entry is now the shared queue
// (`queue.enqueue` owns the one `createUploadJob`); the "once via shared
// infrastructure" intent is unchanged, only the authority moved Files+Memories
// onto one queue. Exactly ONE submit entry still exists.
// RETARGET (ST-10.E): batch intake enqueues N jobs, so the count is no longer
// 1. The frozen intent is "every job is created through the SHARED queue", so
// the assertion is that there is no other creation path at all.
record((service.match(/queue\.enqueue\(/g) ?? []).length >= 1, 'the service creates every job via the shared queue');
record(!/createUploadJob\(/.test(service), 'no job is created outside the shared queue');
record(!/engine\.createJob\(/.test(service), 'no parallel engine-direct creation path bypasses the queue');
record(service.includes("memoryAttemptTrace(attempt, 'job_created'"), 'job_created stays traced on the same attempt');

// REVIEW_READY is source-agnostic: a durable draft plus no in-flight submit and
// no invalid date, nothing else. It is deliberately NOT keyed on source, kind
// or MIME, so no source can end up with a Save button the others lack.
{
  const code = stripComments(intake);
  record(code.includes('const saveDisabled = !binaryDraft || active || accepting'), 'Save enable is ONE source-agnostic saveDisabled (draft + no active/accepting submit)');
  record(code.includes('disabled={saveDisabled}') || code.includes('disabled={cancelled ? false : saveDisabled}'), 'the Review footer is driven by saveDisabled');
  // Slice the FOOTER PROP REGION ONLY, from `footer={(` to the `)}` that closes
// it. A wider window would reach the Review body and flag its legitimate
  // audio-only affordance instead of the Save gate.
  const sheetStart = code.indexOf('visible={sheet === \'binary\'}');
  const footerStart = code.indexOf('footer={(', sheetStart);
  // The footer prop ends at the `)}` that is immediately followed by the
  // element's closing `>`. Matching on the line break is what keeps an inner
  // `)}` (a title expression, a style) from ending the slice early.
  const footerTail = code.slice(footerStart).search(/\)\}\r?\n\s*>/);
  const footerValue = footerStart > 0 && footerTail >= 0 ? code.slice(footerStart, footerStart + footerTail) : '';
  record(footerStart > 0 && footerValue.includes('saveDisabled'), 'the binary footer prop carries the source-agnostic gate');
  record(!/source ===|kind ===|mimeType/.test(footerValue), 'Save enable has no source/kind/mime branch');
}

// The submit guard is the same guard for every source.
{
  const code = stripComments(intake);
  const submitBody = code.slice(code.indexOf('const submitBinary = useCallback'), code.indexOf('}, [active, binaryAlbumId'));
  // T1: the guard grew a synchronous per-review acceptance latch
  // (acceptedDraftRef) because two presses in the same tick both see
  // `active === false`. React state cannot protect that window, so repeated
  // Save used to create several jobs for ONE draft. The guard must still be
  // source-agnostic (no source/kind/mime branch below proves that) and must
  // still refuse when there is no draft or a submit is already active.
  record(
    /if \(!binaryDraft \|\| active \|\| !draftKey \|\| acceptedDraftRef\.current === draftKey \|\| !acceptanceLifecycleRef\.current\.begin\(draftKey\)\)/.test(submitBody),
    'the submit guard refuses no draft, active submit and an already-accepted draft',
  );
  record(
    submitBody.includes('acceptedDraftRef.current = draftKey;'),
    'the accepted-draft latch is set synchronously in the same tick (no double job from a double Save)',
  );
  record(!/source ===|kind ===/.test(submitBody), 'the submit path has no source/kind branch (a kind never decides whether a memory saves)');
  record(!/mediaReady|playerReady|media_not_ready|mediaReadyRef/.test(submitBody), 'no media readiness gate blocks submit (player readiness is observability, not a guard)');
  record(!/setTimeout|setInterval|requestAnimationFrame/.test(submitBody), 'the submit path uses no timer or polling');
  record(!/router\.(push|replace)|navigation\.(navigate|goBack)/.test(submitBody), 'the submit path uses no navigation escape');
}

// Guardar stays an explicit user action; a failed save retries the same job.
record((stripComments(intake).match(/submitBinary\(\)/g) ?? []).length === 1, 'submitBinary is reachable from exactly ONE explicit Guardar press (no auto-submit)');
record(!/useEffect\([\s\S]{0,400}submitBinary/.test(stripComments(intake)), 'no effect auto-submits the draft');
// RETARGET (ST-10.C): after a cancellation the primary action becomes Close
// instead of a re-save, because the durable job is terminal and re-submitting
// the same draft could only create a duplicate job.
record(stripComments(intake).includes('void submitBinary(); }') && /onPress=\{\(\) => \{ if \(cancelled\)/.test(stripComments(intake)), 'a pre-acceptance failure retries the same draft through the same footer');

// No gallery+video special case anywhere in the flow.
{
  const combined = stripComments(intake + '\n' + service + '\n' + picker);
  record(!/specialUploader|videoUploader|galleryVideoSubmit|submitGalleryVideo/.test(combined), 'no alternative video uploader or submit callback exists');
}

// ===========================================================================
// STRUCTURAL OBSERVABILITY (allow-listed scalars, low frequency)
// ===========================================================================
{
  const engineTraces = (engine.match(/memoryDevTrace\('(?:register_start|upload_start|upload_end|verify_end)'[^)]*\)/g) || []).join('\n');
  record(engine.includes("memoryDevTrace('register_start'") && engine.includes("memoryDevTrace('upload_start'"), 'the engine traces the register and upload phases once per job');
  record(engine.includes('memoryArtifactTraceFields'), 'register/upload trace the same artifact identity, built in one place');
  record(/upload_end[^\n]*ok: false/.test(engine) && /verify_end[^\n]*verified: false/.test(engine), 'a failed upload/verify is reported, not only a successful one');
  record(!/accessToken|signedUploadUrl|householdId|arrayBuffer|localUri|stagedBasename/.test(engineTraces), 'engine traces carry no tokens/URLs/household IDs/paths/bytes');
  record(picker.includes("memoryDevTrace('video_format_probe'"), 'the picker traces the honest video probe (DEV-gated)');
  const pickerTraces = (picker.match(/memoryDevTrace\('video_format_probe'[^)]*\)/g) || []).join('\n');
  record(!/accessToken|signedUploadUrl|householdId|arrayBuffer|localUri\s*:/.test(pickerTraces), 'the probe trace carries no tokens/URLs/household IDs/paths');
}

console.log(`\nHOMECLOUD_S0_GALLERY_INTAKE_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('HOMECLOUD_S0_GALLERY_INTAKE_CONTRACT_TESTS=FAIL');
  process.exitCode = 1;
} else {
  console.log('HOMECLOUD_S0_GALLERY_INTAKE_CONTRACT_TESTS=PASS');
}
