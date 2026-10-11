#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'purge-storage-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'purge-storage-service';

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const service = require('../backend/src/services/homecloudLifecycleService');
const lifecycleSource = read('backend/src/services/homecloudLifecycleService.js');

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

async function check(message, fn) {
  try {
    await fn();
    record(true, message);
  } catch (error) {
    record(false, `${message} :: ${error.message}`);
  }
}

async function main() {
console.log('\n=== HOMECLOUD PURGE STORAGE HONESTY TESTS ===\n');

await check('binary purge targets original first and preview second using existing bucket authority', async () => {
  const calls = [];
  const storage = {
    from(bucket) {
      return {
        async remove(paths) {
          calls.push({ bucket, paths });
          return { data: paths.map((name) => ({ name })), error: null };
        },
      };
    },
  };
  await service.deleteMemoryStorageArtifacts({
    written_text: null,
    original_storage_path: 'hh/cc/original',
    preview_storage_path: 'hh/cc/preview',
  }, storage);
  assert.deepEqual(calls, [
    { bucket: 'homecloud-originals', paths: ['hh/cc/original'] },
    { bucket: 'homecloud-previews', paths: ['hh/cc/preview'] },
  ]);
});

await check('missing original is accepted so retry can continue to preview and DB deletion', async () => {
  const calls = [];
  const storage = {
    from(bucket) {
      return {
        async remove(paths) {
          calls.push(bucket);
          if (bucket === 'homecloud-originals') {
            return { data: [], error: { statusCode: 404, message: 'not found' } };
          }
          return { data: paths.map((name) => ({ name })), error: null };
        },
      };
    },
  };
  const result = await service.deleteMemoryStorageArtifacts({
    written_text: null,
    original_storage_path: 'hh/cc/original',
    preview_storage_path: 'hh/cc/preview',
  }, storage);
  assert.equal(result.original.skipped, 'already_missing');
  assert.equal(result.preview.deleted, true);
  assert.deepEqual(calls, ['homecloud-originals', 'homecloud-previews']);
});

await check('preview failure fails the whole purge before DB deletion is attempted', async () => {
  const storage = {
    from(bucket) {
      return {
        async remove(paths) {
          if (bucket === 'homecloud-previews') {
            return { data: null, error: { statusCode: 503, code: 'storage_down', message: 'preview down' } };
          }
          return { data: paths.map((name) => ({ name })), error: null };
        },
      };
    },
  };
  await assert.rejects(
    () => service.deleteMemoryStorageArtifacts({
      written_text: null,
      original_storage_path: 'hh/cc/original',
      preview_storage_path: 'hh/cc/preview',
    }, storage),
    (error) => error.statusCode === 503 && error.code === 'homecloud_storage_delete_failed',
  );
});

await check('purge source orders storage cleanup before DB delete in code', async () => {
  const body = lifecycleSource.match(/async function purgeTrashedMemoryById[\s\S]*?async function purgeMemory/)?.[0] ?? '';
  const storageIndex = body.indexOf('deleteMemoryStorageArtifacts(target)');
  const dbDeleteIndex = body.indexOf(".delete()");
  assert.ok(storageIndex >= 0);
  assert.ok(dbDeleteIndex > storageIndex);
});

await check('purge-all reports partial failure and never total success on failed items', async () => {
  const body = lifecycleSource.match(/async function purgeAllTrashedMemories[\s\S]*?module\.exports/)?.[0] ?? '';
  assert.match(body, /failed: failures\.length/);
  assert.match(body, /failures\.push\(/);
  assert.match(read('backend/src/controllers/homecloud.lifecycle.controller.js'), /const status = result\.failed > 0 \? 207 : 200/);
});

console.log(`\nHOMECLOUD_PURGE_STORAGE_HONESTY_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('HOMECLOUD_PURGE_STORAGE_HONESTY_TESTS=FAIL');
} else {
  console.log('HOMECLOUD_PURGE_STORAGE_HONESTY_TESTS=PASS');
}
}

main().catch((error) => {
  console.error('HOMECLOUD_PURGE_STORAGE_HONESTY_TESTS=CRASH', error);
  process.exit(1);
});
