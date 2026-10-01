#!/usr/bin/env node
'use strict';

/**
 * HomeCloud STAGE 4A.2 — Written Memory register validation unit tests.
 *
 * Pure tests of validateRegisterPayload for the Memories V2 additions:
 *   - two register modes (BINARY preserved / WRITTEN identified by writtenText)
 *   - Written requires role='memory', rejects binary metadata, caption,
 *     folder and document metadata
 *   - semantic date matrix (unknown / year / month_year / exact with
 *     server-derived UTC components)
 *   - hiddenFromResurfacing boolean contract (memory-only)
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

function expectThrow(fn, code, message) {
  try {
    fn();
  } catch (e) {
    record(e.code === code, `${message} (${e.code || 'no_code'}${e.code === code ? '' : `, expected ${code}`})`);
    return e;
  }
  record(false, `${message} (expected ${code}, got success)`);
  return null;
}

const ALBUM_ID = '11111111-1111-4111-8111-111111111111';
const FOLDER_ID = '22222222-2222-4222-8222-222222222222';

console.log('\n=== HC-4A2 WRITTEN REGISTER VALIDATION TESTS ===\n');

// --- BINARY mode preserved: displayName/mimeType/sizeBytes still required ---
expectThrow(() => validateRegisterPayload({ role: 'file', mimeType: 'text/plain', sizeBytes: 1 }), 'homecloud_missing_display_name', 'binary register without displayName rejected');
expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', sizeBytes: 1 }), 'homecloud_missing_mime_type', 'binary register without mimeType rejected');
expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'text/plain' }), 'homecloud_invalid_size', 'binary register without sizeBytes rejected');

// --- BINARY memory with exact date derives UTC year/month server-side ---
{
  const at = '2020-04-15T10:30:00Z';
  const r = validateRegisterPayload({ role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1, capturedAt: at, capturePrecision: 'exact' });
  record(r.capturedAt === at && r.capturePrecision === 'exact', 'binary memory exact capture accepted');
  record(r.capturedYear === 2020 && r.capturedMonth === 4, 'binary memory exact derives UTC capturedYear/capturedMonth');
  record(r.writtenText === null, 'binary memory keeps writtenText null');
}

// --- BINARY memory partial dates (new: no fake capturedAt allowed) ---
{
  const r = validateRegisterPayload({ role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'year', capturedYear: 2019 });
  record(r.capturedYear === 2019 && r.capturedMonth === null && r.capturedAt === null, 'binary memory year precision uses capturedYear only');
}
{
  const r = validateRegisterPayload({ role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'month_year', capturedYear: 2019, capturedMonth: 7 });
  record(r.capturedYear === 2019 && r.capturedMonth === 7 && r.capturedAt === null, 'binary memory month_year precision uses year+month only');
}
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'year', capturedAt: '2019-01-01T00:00:00Z' }), 'homecloud_capture_precision_mismatch', 'year precision with fake capturedAt rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'month_year', capturedAt: '2019-06-01T00:00:00Z' }), 'homecloud_capture_precision_mismatch', 'month_year precision with capturedAt rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'unknown', capturedYear: 2019 }), 'homecloud_capture_precision_mismatch', 'unknown precision with capturedYear rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'year' }), 'homecloud_capture_precision_mismatch', 'year precision without capturedYear rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'month_year', capturedYear: 2019 }), 'homecloud_capture_precision_mismatch', 'month_year precision without capturedMonth rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'exact' }), 'homecloud_capture_precision_mismatch', 'exact precision without capturedAt rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturedAt: '2020-04-15T10:30:00Z', capturePrecision: 'exact', capturedYear: 2019 }), 'homecloud_capture_precision_mismatch', 'exact precision with client-supplied capturedYear rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'year', capturedYear: 0 }), 'homecloud_invalid_capture_component', 'capturedYear=0 rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'year', capturedYear: 10000 }), 'homecloud_invalid_capture_component', 'capturedYear=10000 rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'month_year', capturedYear: 2019, capturedMonth: 13 }), 'homecloud_invalid_capture_component', 'capturedMonth=13 rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', displayName: 'x', mimeType: 'image/jpeg', sizeBytes: 1, capturePrecision: 'exact', capturedAt: 'not-a-date' }), 'homecloud_invalid_captured_at', 'exact precision with unparseable capturedAt rejected');

// --- WRITTEN mode: happy path ---
{
  const r = validateRegisterPayload({ role: 'memory', writtenText: '  Recuerdo del verano en la playa.  ' });
  record(r.role === 'memory' && r.writtenText === 'Recuerdo del verano en la playa.', 'written register trims and accepts text');
  record(r.displayName === null && r.mimeType === null && r.sizeBytes === null && r.extension === null, 'written register normalizes binary fields to null');
  record(r.caption === null && r.folderId === null && r.documentDate === null && r.note === null, 'written register carries no caption/folder/doc metadata');
  record(r.capturePrecision === 'unknown' && r.capturedAt === null && r.capturedYear === null && r.capturedMonth === null, 'written register defaults semantic date to unknown');
  record(r.hiddenFromResurfacing === false, 'written register defaults hiddenFromResurfacing=false');
}

// --- WRITTEN with semantic dates ---
{
  const r = validateRegisterPayload({ role: 'memory', writtenText: 'Nota', capturePrecision: 'year', capturedYear: 1995 });
  record(r.capturePrecision === 'year' && r.capturedYear === 1995 && r.capturedAt === null, 'written register accepts year precision');
}
{
  const r = validateRegisterPayload({ role: 'memory', writtenText: 'Nota', capturePrecision: 'exact', capturedAt: '2001-09-10T12:00:00Z' });
  record(r.capturedYear === 2001 && r.capturedMonth === 9, 'written register derives UTC components for exact');
}

// --- WRITTEN with hiddenFromResurfacing ---
{
  const r = validateRegisterPayload({ role: 'memory', writtenText: 'Nota', hiddenFromResurfacing: true });
  record(r.hiddenFromResurfacing === true, 'written register accepts hiddenFromResurfacing=true');
}
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'Nota', hiddenFromResurfacing: 'yes' }), 'homecloud_invalid_hidden_from_resurfacing', 'non-boolean hiddenFromResurfacing rejected');
expectThrow(() => validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'text/plain', sizeBytes: 1, hiddenFromResurfacing: true }), 'homecloud_invalid_hidden_from_resurfacing', 'hiddenFromResurfacing=true rejected for file');
{
  const r = validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'text/plain', sizeBytes: 1 });
  record(r.hiddenFromResurfacing === false, 'binary file register keeps hiddenFromResurfacing=false');
}

// --- WRITTEN rejections ---
expectThrow(() => validateRegisterPayload({ role: 'file', writtenText: 'hola' }), 'homecloud_written_file_forbidden', 'written register with role=file rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: '   ' }), 'homecloud_invalid_written_text', 'blank writtenText rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: '' }), 'homecloud_invalid_written_text', 'empty writtenText rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', mimeType: 'text/plain' }), 'homecloud_written_binary_field_forbidden', 'written register with mimeType rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', sizeBytes: 5 }), 'homecloud_written_binary_field_forbidden', 'written register with sizeBytes rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', displayName: 'nota.txt' }), 'homecloud_written_binary_field_forbidden', 'written register with displayName rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', extension: 'txt' }), 'homecloud_written_binary_field_forbidden', 'written register with extension rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', caption: 'resumen' }), 'homecloud_written_caption_forbidden', 'written register with caption rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', folderId: FOLDER_ID }), 'homecloud_memory_folder_forbidden', 'written register with folderId rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', documentDate: '2020-01-01' }), 'homecloud_memory_doc_meta_forbidden', 'written register with documentDate rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', note: 'x' }), 'homecloud_memory_doc_meta_forbidden', 'written register with note rejected');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', lifecycle: 'active' }), 'homecloud_forbidden_register_field', 'written register cannot set lifecycle');
expectThrow(() => validateRegisterPayload({ role: 'memory', writtenText: 'hola', originalStoragePath: 'a/b' }), 'homecloud_forbidden_register_field', 'written register cannot set storage path');

// --- WRITTEN with initialAlbumId allowed ---
{
  const r = validateRegisterPayload({ role: 'memory', writtenText: 'hola', initialAlbumId: ALBUM_ID });
  record(r.initialAlbumId === ALBUM_ID, 'written register accepts initialAlbumId');
}
expectThrow(() => validateRegisterPayload({ role: 'file', writtenText: 'hola', initialAlbumId: ALBUM_ID }), 'homecloud_written_file_forbidden', 'written file with initialAlbumId rejected as written-file');

// --- writtenText=null falls back to BINARY mode (null = absent) ---
{
  const r = validateRegisterPayload({ role: 'file', displayName: 'x', mimeType: 'text/plain', sizeBytes: 1, writtenText: null });
  record(r.writtenText === null && r.displayName === 'x', 'null writtenText is treated as absent (binary mode)');
}

console.log(`\nHC4A2_WRITTEN_VALIDATION_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HC4A2_WRITTEN_VALIDATION_TESTS=FAIL');
} else {
  console.log('HC4A2_WRITTEN_VALIDATION_TESTS=PASS');
}
