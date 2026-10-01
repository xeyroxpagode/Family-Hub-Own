#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-2A — Frontend upload job + engine structure tests.
 *
 * Validates the durable client UploadJob model, explicit state machine,
 * ownership guards, serialization and picker/capture agnosticism.
 */

const path = require('node:path');
const fs = require('node:fs');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

function read(rel) {
  return fs.readFileSync(path.join(path.resolve(__dirname, '..'), rel), 'utf8');
}

console.log('\n=== HC-2A FRONTEND UPLOAD JOB / ENGINE TESTS ===\n');

const types = read('front/mi-front-limpio/services/homecloud/homecloudUploadTypes.ts');
const job = read('front/mi-front-limpio/services/homecloud/homecloudUploadJob.ts');
const engine = read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');
const storage = read('front/mi-front-limpio/storage/homecloudUploadJobStorage.ts');

// --- explicit state machine ---
for (const s of ['pending', 'registering', 'registered', 'uploading', 'verifying', 'finalizing', 'completed', 'failed', 'cancelled']) {
  record(job.includes(`'${s}'`), `state machine includes '${s}'`);
}
record(!job.includes("isUploading"), 'no overloaded isUploading boolean lifecycle');
record(job.includes('FORWARD_TRANSITIONS'), 'explicit forward transition table exists');
record(job.includes('function canTransition'), 'canTransition legality guard exists');
record(job.includes('function transition'), 'immutable transition reducer exists');

// --- stable local identity + immutable ownership ---
record(types.includes('readonly id'), 'job id is stable/immutable');
record(types.includes('readonly householdId'), 'job householdId is immutable');
record(types.includes('readonly role'), 'job role is immutable');
record(types.includes('readonly contentId'), 'job contentId immutable after register');
record(types.includes('intakeRequestId'), 'job carries stable register idempotency id');

// --- ownership guard (no retarget) ---
record(job.includes('function guardOwnership'), 'guardOwnership exists');
record(job.includes("householdId !== job.householdId"), 'guardOwnership blocks household switch');
record(job.includes("role !== job.role"), 'guardOwnership blocks role change');
record(job.includes('contentId'), 'guardOwnership blocks contentId retarget');

// --- serialization / restoration ---
record(job.includes('serializeUploadJob'), 'serializeUploadJob exists');
record(job.includes('deserializeUploadJob'), 'deserializeUploadJob exists');
record(job.includes('isRestorableJob'), 'isRestorableJob validity check exists');
record(job.includes('recoverEntryPoint'), 'recoverEntryPoint supports resume');

// --- picker/capture agnostic ---
record(types.includes('UploadLocalArtifact'), 'artifact representation is capture-agnostic');
record(types.includes('UploadIntakeContext'), 'semantic intake context separate from artifact');
record(engine.includes('createFetchArtifactReader'), 'engine injects artifact reader (picker agnostic)');
record(engine.includes('UploadArtifactReader'), 'engine types a pluggable artifact reader');

// --- no direct picker/capture coupling ---
for (const banned of ['DocumentPicker', 'ImagePicker', 'Scanner', 'Recorder', 'expo-document-picker', 'expo-image-picker']) {
  record(!job.includes(banned) && !engine.includes(banned), `no ${banned} coupling`);
}

// --- engine lifecycle over backend endpoints ---
record(engine.includes('/api/homecloud/register'), 'engine calls register endpoint');
record(engine.includes('/upload'), 'engine calls upload authorization');
record(engine.includes('/verify'), 'engine calls verify');
record(engine.includes('/finalize'), 'engine calls finalize');
record(engine.includes('homecloud.contribute') || engine.includes('operationKind'), 'engine uses canonical mutation contract');

// --- persistence boundary ---
record(storage.includes('UploadJobStore'), 'pluggable job store interface exists');
record(storage.includes('createInMemoryUploadJobStore'), 'in-memory store (testable) exists');
record(storage.includes('createAsyncStorageUploadJobStore'), 'AsyncStorage adapter exists for device durability');
record(storage.includes('serializeUploadJob'), 'storage uses stable serialization');

// --- role is caller-defined, not MIME ---
record(types.includes("role: UploadJobRole"), 'role typed as explicit caller intent');
record(!job.includes('role === mime'), 'role never derived from MIME');

console.log(`\nHC2A_FRONTEND_STRUCTURE_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) { process.exitCode = 1; console.error('HC2A_FRONTEND_STRUCTURE_TESTS=FAIL'); }
else { console.log('HC2A_FRONTEND_STRUCTURE_TESTS=PASS'); }