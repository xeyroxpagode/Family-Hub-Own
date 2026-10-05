#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getHomeCloudMaxUploadBytes, assertHomeCloudAcceptedSize } = require('../backend/src/lib/homecloudSizePolicy');
const { normalizeHomeCloudSignedUrlTtl } = require('../backend/src/lib/homecloudAccessTtl');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
let passed = 0;
function test(name, fn) { fn(); passed += 1; console.log(`  PASS: ${name}`); }
function errorCode(fn) { try { fn(); } catch (error) { return error.code; } return null; }

console.log('\n=== HOMECLOUD SLICE 01 INTEGRITY TESTS ===\n');

const config = read('supabase/config.toml');
const migration = read('supabase/migrations/20260929000000_homecloud_storage_size_floor_v1.sql');
const intake = read('backend/src/services/homecloudIntakeService.js');
const ttlController = read('backend/src/controllers/homecloud.storage.controller.js');
const fileService = read('front/mi-front-limpio/services/homecloud/homecloudFileIntakeService.ts');
const memoryService = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const uploadEngine = read('front/mi-front-limpio/services/homecloud/homecloudUploadEngine.ts');
const download = read('front/mi-front-limpio/services/homecloud/homecloudDownloadService.ts');
const filesScreen = read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx');

test('local Storage global ceiling is 5 GiB', () => assert.match(config, /file_size_limit = "5GiB"/));
test('forward migration removes HomeCloud bucket 50 MiB walls', () => {
  assert.match(migration, /set file_size_limit = null/);
  assert.match(migration, /homecloud-originals/);
  assert.match(migration, /homecloud-previews/);
});
test('application policy is deployment-configured', () => assert.equal(getHomeCloudMaxUploadBytes({ HOMECLOUD_MAX_UPLOAD_BYTES: '5368709120' }), 5368709120));
test('configuredLimit + 1 returns typed file_too_large before upload authorization', () => {
  assert.equal(errorCode(() => assertHomeCloudAcceptedSize(101, { HOMECLOUD_MAX_UPLOAD_BYTES: '100' })), 'file_too_large');
  assert.match(intake, /assertHomeCloudAcceptedSize\(normalized\.sizeBytes\)/);
  assert.ok(intake.indexOf('assertHomeCloudAcceptedSize(normalized.sizeBytes)') < intake.indexOf('createSignedUploadUrl'));
});
test('valid size remains accepted by the deployment policy', () => assert.equal(assertHomeCloudAcceptedSize(100, { HOMECLOUD_MAX_UPLOAD_BYTES: '100' }), 100));
test('invalid access TTL values are typed failures', () => {
  ['abc', '0', '-1', '', Infinity, NaN].forEach((value) => assert.equal(errorCode(() => normalizeHomeCloudSignedUrlTtl(value)), 'homecloud_invalid_ttl'));
  assert.equal(normalizeHomeCloudSignedUrlTtl('3600'), 3600);
  assert.match(ttlController, /normalizeHomeCloudSignedUrlTtl\(ttl\)/);
});
test('both intake services pass a live token getter to the shared engine', () => {
  assert.match(fileService, /getAccessToken,\n\s*getHouseholdId/);
  assert.match(memoryService, /getAccessToken,\n\s*getHouseholdId/);
  assert.match(uploadEngine, /const token = getAccessToken\(\)/);
});
test('download uses a native filesystem task, never a whole-object JS buffer', () => {
  assert.match(download, /File\.createDownloadTask/);
  assert.match(download, /await task\.downloadAsync\(\)/);
  assert.doesNotMatch(download, /arrayBuffer\(|base64|readAsStringAsync|fetch\(access\.signedUrl/);
  // Files Core closure: the signed original is STAGED (internal temporary copy)
  // and handed to the native export/share UI. An app-private copy the member
  // cannot find is not a save, so the old "Descargar keeps a local copy" wording
  // and the conjoined save-and-share intent are gone.
  assert.match(filesScreen, /stageHomeCloudOriginal/);
  // T1 server authority: the signed URL is used verbatim, never rewritten.
  assert.doesNotMatch(download, /normalizeSignedStorageUrlForRuntime/);
  assert.match(download, /access\.signedUrl/);
  assert.match(download, /Sharing\.shareAsync\(copy\.uri/);
  assert.doesNotMatch(filesScreen, /Descargar y compartir original/);
  assert.doesNotMatch(filesScreen, /Guardado como/);
});
test('oversize product error is explicit to the user', () => assert.match(read('front/mi-front-limpio/services/homecloud/homecloudUploadError.ts'), /supera el tamaño máximo permitido/));

console.log(`\nHOMECLOUD_SLICE01_INTEGRITY_RESULT pass=${passed} fail=0`);
