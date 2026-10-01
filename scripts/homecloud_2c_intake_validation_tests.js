#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-2C — Memory Intake register validation unit tests.
 *
 * Pure tests of validateRegisterPayload for the HC-2C additions:
 *   - initialAlbumId is memory-only (File + Album denied)
 *   - caption / capturedAt / capturePrecision are memory-only
 *   - capture metadata coherence (NULL iff unknown)
 * No DB required.
 */

const { validateRegisterPayload } = require('../backend/src/lib/homecloudIntakeValidation');

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

const ALBUM_ID = '11111111-1111-4111-8111-111111111111';

console.log('\n=== HC-2C MEMORY INTAKE VALIDATION TESTS ===\n');

// --- memory with initialAlbumId accepted ---
{
  const r = validateRegisterPayload({ role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1, initialAlbumId: ALBUM_ID });
  record(r.initialAlbumId === ALBUM_ID, 'memory initialAlbumId accepted');
}

// --- memory without initialAlbumId -> null ---
{
  const r = validateRegisterPayload({ role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1 });
  record(r.initialAlbumId === null, 'memory without initialAlbumId normalizes to null');
}

// --- file + initialAlbumId denied ---
record(expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'text/plain', sizeBytes: 1, initialAlbumId: ALBUM_ID }), 'homecloud_file_album_forbidden')?.code === 'homecloud_file_album_forbidden', 'file + initialAlbumId rejected');

// --- memory + non-string initialAlbumId denied ---
record(expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, initialAlbumId: 42 }), 'homecloud_invalid_album_id')?.code === 'homecloud_invalid_album_id', 'memory + numeric initialAlbumId rejected');

// --- memory caption optional and preserved ---
{
  const r = validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, caption: 'Vacaciones' });
  record(r.caption === 'Vacaciones', 'memory caption preserved');
  record(r.capturedAt === null && r.capturePrecision === 'unknown', 'memory defaults capture unknown');
}

// --- memory capturedAt without precision -> coherent default must be explicit ---
// (capturedAt with precision unknown is a mismatch, so a bare capturedAt is invalid)
record(expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturedAt: new Date().toISOString() }), 'homecloud_capture_precision_mismatch')?.code === 'homecloud_capture_precision_mismatch', 'memory capturedAt without explicit precision rejected');

// --- memory exact capture accepted ---
{
  const at = new Date().toISOString();
  const r = validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturedAt: at, capturePrecision: 'exact' });
  record(r.capturedAt === at && r.capturePrecision === 'exact', 'memory exact capture accepted');
}

// --- no capturedAt synthesized from upload time: register never injects Date ---
{
  const r = validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'video/mp4', sizeBytes: 1 });
  record(r.capturedAt === null, 'memory register never synthesizes capturedAt from now()');
}

console.log(`\nHC2C_REGISTER_VALIDATION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC2C_REGISTER_VALIDATION_TESTS=FAIL');
} else {
  console.log('HC2C_REGISTER_VALIDATION_TESTS=PASS');
}