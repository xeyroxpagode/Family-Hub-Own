/**
 * HomeCloud HC-2A — Durable UploadJob runtime tests (compiled).
 *
 * Exercises the pure state machine + serialization + ownership guards + store.
 * Run via `node scripts/compiled/scripts/homecloud_2a_upload_job_runtime_tests.js`.
 */

import {
  createUploadJob,
  canTransition,
  transition,
  guardOwnership,
  serializeUploadJob,
  deserializeUploadJob,
  isRestorableJob,
  recoverEntryPoint,
} from '../front/mi-front-limpio/services/homecloud/homecloudUploadJob';
import { createInMemoryUploadJobStore } from '../front/mi-front-limpio/storage/homecloudUploadJobStorage';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); }
  else { failCount += 1; console.error(`  FAIL: ${message}`); }
}

const artifact = {
  localUri: 'file:///tmp/photo.jpg',
  displayName: 'photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 4096,
  extension: 'jpg',
};

console.log('\n=== HC-2A UPLOAD JOB RUNTIME TESTS ===\n');

// --- creation binds household + role ---
const job = createUploadJob('hhh-1', { role: 'memory', intakeSource: 'memories:picker' }, artifact);
record(job.householdId === 'hhh-1', 'job bound to household at creation');
record(job.role === 'memory', 'job role set by caller intent');
record(job.state === 'pending', 'initial state is pending');
record(typeof job.id === 'string' && job.id.length > 0, 'stable local id generated');
record(typeof job.intakeRequestId === 'string' && job.intakeRequestId.length > 0, 'register idempotency id generated');
record(job.contentId === null, 'contentId null before register');
record(job.artifact.localUri === 'file:///tmp/photo.jpg', 'artifact identity preserved');

// --- forward lifecycle legality ---
record(canTransition('pending', 'registering') === true, 'pending -> registering legal');
record(canTransition('registering', 'registered') === true, 'registering -> registered legal');
record(canTransition('registered', 'uploading') === true, 'registered -> uploading legal');
record(canTransition('uploading', 'verifying') === true, 'uploading -> verifying legal');
record(canTransition('verifying', 'finalizing') === true, 'verifying -> finalizing legal');
record(canTransition('finalizing', 'completed') === true, 'finalizing -> completed legal');
record(canTransition('pending', 'registered') === false, 'pending -> registered illegal (skip)');
record(canTransition('completed', 'uploading') === false, 'completed is terminal');

// --- failure + recovery ---
record(canTransition('registering', 'failed') === true, 'registering -> failed legal');
record(canTransition('failed', 'uploading') === true, 'failed -> uploading recovery legal');
record(canTransition('failed', 'registering') === true, 'failed -> registering recovery legal');

// --- cancellation ---
record(canTransition('uploading', 'cancelled') === true, 'uploading -> cancelled legal');
record(canTransition('finalizing', 'cancelled') === false, 'finalizing cannot be cancelled');

// --- illegal transition throws ---
let threw = false;
try { transition(job, 'registered'); } catch { threw = true; }
record(threw, 'illegal transition (pending -> registered) throws');

// --- full lifecycle ---
let j = transition(job, 'registering');
j = transition(j, 'registered', { contentId: 'ccc-1' });
record(j.contentId === 'ccc-1', 'contentId set on register success');
j = transition(j, 'uploading');
j = transition(j, 'verifying');
j = transition(j, 'finalizing');
j = transition(j, 'completed');
record(j.state === 'completed', 'full lifecycle reaches completed');
record(j.contentId === 'ccc-1', 'contentId immutable across lifecycle');

// --- contentId cannot be silently retargeted ---
record(guardOwnership(j, { householdId: 'other' }) !== null, 'guard blocks household switch');
record(guardOwnership(j, { role: 'file' }) !== null, 'guard blocks role change');
record(guardOwnership(j, { contentId: 'ccc-2' }) !== null, 'guard blocks contentId retarget');
record(guardOwnership(j, { householdId: 'hhh-1' }) === null, 'guard allows same household');

// --- serialization round-trip preserves identity ---
const json = serializeUploadJob(j);
const restored = deserializeUploadJob(json);
record(restored !== null, 'job deserializes from JSON');
record(restored!.id === j.id, 'id survives serialization');
record(restored!.householdId === 'hhh-1', 'household survives serialization');
record(restored!.role === 'memory', 'role survives serialization');
record(restored!.contentId === 'ccc-1', 'contentId survives serialization');
record(restored!.artifact.localUri === 'file:///tmp/photo.jpg', 'artifact survives serialization');
record(restored!.state === 'completed', 'state survives serialization');
record(isRestorableJob(restored) === true, 'restored job passes validity check');
record(deserializeUploadJob('not json') === null, 'malformed json returns null');
record(isRestorableJob(null) === false, 'null is not restorable');

// --- recover entry point ---
const midUpload = createUploadJob('hhh-1', { role: 'file', intakeSource: 'files:picker' }, { ...artifact, localUri: 'file:///x.pdf' });
let mid = transition(midUpload, 'registering');
mid = transition(mid, 'registered', { contentId: 'ccc-9' });
mid = transition(mid, 'uploading');
record(recoverEntryPoint(mid) === 'uploading', 'recover mid-upload resumes at uploading');
const failedAfterR = transition(mid, 'failed');
record(recoverEntryPoint(failedAfterR) === 'verifying', 'recover failed-with-contentId resumes at verifying');

// --- store persistence ---
const store = createInMemoryUploadJobStore();
store.put(j);
record(store.get(j.id)?.state === 'completed', 'store persists and restores job');
record(store.all().length === 1, 'store lists persisted jobs');
record(store.byHousehold('hhh-1').length === 1, 'store isolates by household');
record(store.byHousehold('other').length === 0, 'store does not leak across households');
store.remove(j.id);
record(store.get(j.id) === null, 'store removes job');

console.log(`\nHC2A_UPLOAD_JOB_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  console.error('HC2A_UPLOAD_JOB_RUNTIME_TESTS=FAIL');
  process.exitCode = 1;
} else {
  console.log('HC2A_UPLOAD_JOB_RUNTIME_TESTS=PASS');
}

export {};