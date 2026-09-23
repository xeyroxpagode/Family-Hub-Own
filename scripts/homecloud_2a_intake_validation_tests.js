#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-2A — Register input validation unit tests.
 *
 * Pure tests of homecloudIntakeValidation.validateRegisterPayload + MIME rules.
 * No DB required.
 */

const {
  validateRegisterPayload,
  isMemoryMediaMime,
} = require('../backend/src/lib/homecloudIntakeValidation');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return true;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
  return false;
}

function expectThrow(fn, code) {
  try {
    fn();
    return null;
  } catch (e) {
    return e.code === code ? e : { code: e.code, statusCode: e.statusCode };
  }
}

console.log('\n=== HC-2A REGISTER VALIDATION TESTS ===\n');

// --- valid FILE ---
{
  const r = validateRegisterPayload({
    role: 'file', displayName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: 1024, extension: 'pdf',
  });
  record(r.role === 'file' && r.displayName === 'report.pdf' && r.sizeBytes === 1024, 'valid FILE accepted');
  record(r.capturePrecision === 'unknown' && r.capturedAt === null, 'FILE normalized capture unknown');
}

// --- valid memory image/video/audio ---
for (const mime of ['image/jpeg', 'video/mp4', 'audio/mpeg']) {
  const r = validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: mime, sizeBytes: 1 });
  record(r.role === 'memory' && r.mimeType === mime, `valid memory ${mime} accepted`);
}

// --- MIME rule ---
record(isMemoryMediaMime('image/png') === true, 'isMemoryMediaMime true for image');
record(isMemoryMediaMime('audio/ogg') === true, 'isMemoryMediaMime true for audio');
record(isMemoryMediaMime('application/pdf') === false, 'isMemoryMediaMime false for pdf');

// --- invalid role ---
record(expectThrow(() => validateRegisterPayload({ role: 'random', displayName: 'x', mimeType: 'a/b', sizeBytes: 1 }), 'homecloud_invalid_role')?.code === 'homecloud_invalid_role', 'invalid role rejected');

// --- invalid memory generic mime rejected at service (validated separately) ---
record(isMemoryMediaMime('application/pdf') === false, 'memory pdf would fail MIME rule');

// --- negative size ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: -1 }), 'homecloud_invalid_size')?.code === 'homecloud_invalid_size', 'negative size rejected');

// --- non-integer size ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: 1.5 }), 'homecloud_invalid_size')?.code === 'homecloud_invalid_size', 'non-integer size rejected');

// --- zero size valid (DB allows >= 0) ---
{
  const r = validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: 0 });
  record(r.sizeBytes === 0, 'zero size accepted (>= 0 semantics)');
}

// --- missing displayName ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', mimeType: 'a/b', sizeBytes: 1 }), 'homecloud_missing_display_name')?.code === 'homecloud_missing_display_name', 'missing displayName rejected');

// --- missing mimeType ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', sizeBytes: 1 }), 'homecloud_missing_mime_type')?.code === 'homecloud_missing_mime_type', 'missing mimeType rejected');

// --- client cannot choose lifecycle ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: 1, lifecycle: 'active' }), 'homecloud_forbidden_register_field')?.code === 'homecloud_forbidden_register_field', 'lifecycle supplied by client rejected');

// --- client cannot choose uploaded_at ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: 1, uploaded_at: new Date().toISOString() }), 'homecloud_forbidden_register_field')?.code === 'homecloud_forbidden_register_field', 'uploaded_at supplied by client rejected');

// --- client cannot choose household_id ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: 1, household_id: 'some-uuid' }), 'homecloud_forbidden_register_field')?.code === 'homecloud_forbidden_register_field', 'household_id supplied by client rejected');

// --- client cannot choose storage path ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: 1, original_storage_path: 'evil/path' }), 'homecloud_forbidden_register_field')?.code === 'homecloud_forbidden_register_field', 'original_storage_path supplied by client rejected');

// --- memory with document metadata forbidden ---
record(expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, note: 'nope' }), 'homecloud_memory_doc_meta_forbidden')?.code === 'homecloud_memory_doc_meta_forbidden', 'memory with note rejected');

// --- file with caption tolerated through service? (DB forbids caption on file) ---
// validateRegisterPayload ignores caption for file (not read). Verify no crash:
{
  const r = validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'a/b', sizeBytes: 1, caption: 'x' });
  record(r.role === 'file' && r.caption === null, 'file caption not propagated (DB enforces file.no_caption)');
}

// --- memory capture precision mismatch ---
record(expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturedAt: null, capturePrecision: 'exact' }), 'homecloud_capture_precision_mismatch')?.code === 'homecloud_capture_precision_mismatch', 'memory exact with null capturedAt rejected');

// --- memory invalid precision ---
record(expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturedAt: new Date().toISOString(), capturePrecision: 'random' }), 'homecloud_invalid_capture_precision')?.code === 'homecloud_invalid_capture_precision', 'memory invalid precision rejected');

// --- memory valid exact ---
{
  const r = validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturedAt: new Date().toISOString(), capturePrecision: 'exact' });
  record(r.capturePrecision === 'exact' && r.capturedAt !== null, 'memory exact accepted');
}

console.log(`\nHC2A_REGISTER_VALIDATION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC2A_REGISTER_VALIDATION_TESTS=FAIL');
} else {
  console.log('HC2A_REGISTER_VALIDATION_TESTS=PASS');
}