#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'lifecycle-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'lifecycle-service';

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

async function check(message, fn) {
  try {
    await fn();
    record(true, message);
  } catch (error) {
    record(false, `${message} :: ${error.message}`);
  }
}

async function main() {
console.log('\n=== HOMECLOUD LIFECYCLE BACKEND CONTRACT TESTS ===\n');

const routes = require('../backend/src/routes/homecloud');
const service = require('../backend/src/services/homecloudLifecycleService');
const lifecycleSource = read('backend/src/services/homecloudLifecycleService.js');
const routeSource = read('backend/src/routes/homecloud.js');
const readServiceSource = read('backend/src/services/homecloudReadService.js');
const albumServiceSource = read('backend/src/services/homecloudAlbumService.js');
const contentMigration = read('supabase/migrations/20260910000000_homecloud_canonical_content_v1_1.sql');
const albumMigration = read('supabase/migrations/20260910000003_homecloud_albums_v1_1.sql');

const routeTable = routes.stack
  .filter((layer) => layer.route)
  .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

await check('the four P1 lifecycle endpoints are registered exactly once', () => {
  assert.equal(routeTable.filter((entry) => entry === 'POST /memories/:contentId/trash').length, 1);
  assert.equal(routeTable.filter((entry) => entry === 'POST /memories/:contentId/restore').length, 1);
  assert.equal(routeTable.filter((entry) => entry === 'DELETE /memories/:contentId').length, 1);
  assert.equal(routeTable.filter((entry) => entry === 'POST /memories/purge-all').length, 1);
});

await check('trash and restore require homecloud.contribute, not delete or organize', () => {
  assert.match(lifecycleSource, /async function trashMemory[\s\S]*contextWithCapability\(req, 'homecloud\.contribute'\)/);
  assert.match(lifecycleSource, /async function restoreMemory[\s\S]*contextWithCapability\(req, 'homecloud\.contribute'\)/);
  const trashBody = lifecycleSource.match(/async function trashMemory[\s\S]*?async function restoreMemory/)?.[0] ?? '';
  const restoreBody = lifecycleSource.match(/async function restoreMemory[\s\S]*?async function purgeTrashedMemoryById/)?.[0] ?? '';
  assert.ok(!trashBody.includes('homecloud.delete'));
  assert.ok(!restoreBody.includes('homecloud.delete'));
  assert.ok(!trashBody.includes('homecloud.organize'));
  assert.ok(!restoreBody.includes('homecloud.organize'));
});

await check('purge and purge-all require the real homecloud.delete capability', () => {
  assert.match(lifecycleSource, /async function purgeMemory[\s\S]*contextWithCapability\(req, 'homecloud\.delete'\)/);
  assert.match(lifecycleSource, /async function purgeAllTrashedMemories[\s\S]*contextWithCapability\(req, 'homecloud\.delete'\)/);
  assert.ok(!lifecycleSource.includes("contextWithCapability(req, 'homecloud.organize')"));
});

await check('trash is a restrictive ACTIVE memory update scoped by id, household, role and lifecycle', () => {
  assert.match(lifecycleSource, /loadMemoryForLifecycle\(contentId, context\.householdId, 'active'\)/);
  assert.match(lifecycleSource, /\.update\(\{\s*lifecycle: 'trashed',\s*trashed_at: new Date\(\)\.toISOString\(\),\s*trashed_by_member_id: context\.membership\.id,/);
  assert.match(lifecycleSource, /\.eq\('id', target\.id\)[\s\S]*\.eq\('household_id', context\.householdId\)[\s\S]*\.eq\('role', 'memory'\)[\s\S]*\.eq\('lifecycle', 'active'\)/);
});

await check('restore is a restrictive TRASHED memory update that clears trash metadata', () => {
  assert.match(lifecycleSource, /loadMemoryForLifecycle\(contentId, context\.householdId, 'trashed'\)/);
  assert.match(lifecycleSource, /\.update\(\{\s*lifecycle: 'active',\s*trashed_at: null,\s*trashed_by_member_id: null,/);
  assert.match(lifecycleSource, /\.eq\('id', target\.id\)[\s\S]*\.eq\('household_id', context\.householdId\)[\s\S]*\.eq\('role', 'memory'\)[\s\S]*\.eq\('lifecycle', 'trashed'\)/);
});

await check('purge only loads TRASHED memories and deletes the DB row after storage cleanup', () => {
  const purgeBody = lifecycleSource.match(/async function purgeTrashedMemoryById[\s\S]*?async function purgeMemory/)?.[0] ?? '';
  assert.match(purgeBody, /loadMemoryForLifecycle\(contentId, context\.householdId, 'trashed'\)/);
  const storageIndex = purgeBody.indexOf('deleteMemoryStorageArtifacts(target)');
  const deleteIndex = purgeBody.indexOf(".from('homecloud_contents')");
  assert.ok(storageIndex >= 0 && deleteIndex > storageIndex);
  assert.match(purgeBody, /\.delete\(\)[\s\S]*\.eq\('id', target\.id\)[\s\S]*\.eq\('household_id', context\.householdId\)[\s\S]*\.eq\('role', 'memory'\)[\s\S]*\.eq\('lifecycle', 'trashed'\)/);
});

await check('purge-all reuses the single-memory purge primitive', () => {
  const body = lifecycleSource.match(/async function purgeAllTrashedMemories[\s\S]*?module\.exports/)?.[0] ?? '';
  assert.match(body, /purgeTrashedMemoryById\(context, contentId\)/);
  assert.ok(!body.includes(".from('homecloud_contents')\n    .delete()"));
});

await check('normal reads exclude trashed memories SQL-side', () => {
  assert.match(readServiceSource, /function applyMemoryFilters[\s\S]*\.eq\('lifecycle', 'active'\)/);
  assert.match(readServiceSource, /aggregateAlbums[\s\S]*\.eq\('homecloud_contents\.lifecycle', 'active'\)/);
  assert.match(readServiceSource, /assertMemoryAlbumFilter[\s\S]*\.eq\('lifecycle', 'active'\)/);
  assert.match(readServiceSource, /getContentById[\s\S]*\.eq\('lifecycle', 'active'\)/);
});

await check('trash preserves album memberships and purge removes them only through FK cascade', () => {
  assert.ok(!lifecycleSource.includes("from('homecloud_album_items').delete"));
  assert.ok(!lifecycleSource.includes("from('homecloud_album_items').insert"));
  assert.match(albumMigration, /content_id uuid not null references public\.homecloud_contents\(id\) on delete cascade/);
});

await check('lifecycle implementation does not weaken schema checks or shared upload/storage path infrastructure', () => {
  assert.match(contentMigration, /homecloud_contents_lifecycle_check[\s\S]*check \(lifecycle in \('staging', 'active', 'trashed'\)\)/);
  assert.match(contentMigration, /homecloud_contents_trash_consistency[\s\S]*check \(\(lifecycle = 'trashed'\) = \(trashed_at is not null\)\)/);
  assert.ok(!routeSource.includes('homecloudStoragePaths'));
  assert.ok(!lifecycleSource.includes('homecloudUploadEngine'));
  assert.ok(!lifecycleSource.includes('homecloudUploadCoordinator'));
  assert.ok(!lifecycleSource.includes('homecloudUploadRecovery'));
});

await check('storage helper treats missing expected objects as already clean', async () => {
  const calls = [];
  const storage = {
    from(bucket) {
      return {
        async remove(paths) {
          calls.push({ bucket, paths });
          return { data: [], error: { statusCode: 404, message: 'The resource was not found' } };
        },
      };
    },
  };
  const result = await service.deleteMemoryStorageArtifacts({
    written_text: null,
    original_storage_path: 'house/content/original',
    preview_storage_path: 'house/content/preview',
  }, storage);
  assert.equal(result.original.skipped, 'already_missing');
  assert.equal(result.preview.skipped, 'already_missing');
  assert.deepEqual(calls.map((call) => call.bucket), ['homecloud-originals', 'homecloud-previews']);
});

await check('written memory purge skips storage deletion', async () => {
  let called = false;
  const storage = {
    from() {
      called = true;
      return { remove: async () => ({ data: [], error: null }) };
    },
  };
  const result = await service.deleteMemoryStorageArtifacts({
    written_text: 'Nota familiar',
    original_storage_path: null,
    preview_storage_path: null,
  }, storage);
  assert.equal(called, false);
  assert.equal(result.original.skipped, 'written_memory');
});

await check('storage failures are honest retryable failures before DB deletion', async () => {
  const storage = {
    from(bucket) {
      return {
        async remove() {
          return { data: null, error: { statusCode: 500, code: 'boom', message: `${bucket} failed` } };
        },
      };
    },
  };
  await assert.rejects(
    () => service.deleteMemoryStorageArtifacts({
      written_text: null,
      original_storage_path: 'house/content/original',
      preview_storage_path: null,
    }, storage),
    (error) => error.statusCode === 503 && error.code === 'homecloud_storage_delete_failed',
  );
});

console.log(`\nHOMECLOUD_LIFECYCLE_BACKEND_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HOMECLOUD_LIFECYCLE_BACKEND_CONTRACT_TESTS=FAIL');
} else {
  console.log('HOMECLOUD_LIFECYCLE_BACKEND_CONTRACT_TESTS=PASS');
}
}

main().catch((error) => {
  console.error('HOMECLOUD_LIFECYCLE_BACKEND_CONTRACT_TESTS=CRASH', error);
  process.exit(1);
});
