#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { createClient } = require('@supabase/supabase-js');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({ required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] });
requireLocalUrl('SUPABASE_URL');

const SIZE_BYTES = 60 * 1024 * 1024;
const runId = crypto.randomUUID();
const storagePath = `slice01-qa/${runId}/original`;
const sourcePath = path.join(os.tmpdir(), `homecloud-slice01-${runId}.bin`);
const downloadPath = path.join(os.tmpdir(), `homecloud-slice01-${runId}.download`);
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function digest(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('error', reject).on('data', (chunk) => hash.update(chunk)).on('end', () => resolve(hash.digest('hex')));
  });
}

async function main() {
  console.log('\n=== HOMECLOUD SLICE 01 STORAGE RUNTIME ===\n');
  let passed = 0;
  try {
    // Sparse fixture creation avoids a 60 MiB JavaScript allocation.
    await fsp.writeFile(sourcePath, '');
    await fsp.truncate(sourcePath, SIZE_BYTES);
    const upload = await client.storage.from('homecloud-originals').createSignedUploadUrl(storagePath);
    if (upload.error || !upload.data?.signedUrl) throw upload.error ?? new Error('signed upload URL missing');
    const put = await fetch(upload.data.signedUrl, {
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream', 'x-upsert': 'false' },
      body: Readable.toWeb(fs.createReadStream(sourcePath)),
      duplex: 'half',
    });
    if (!put.ok) throw new Error(`60 MiB PUT failed: ${put.status}`);
    passed += 1;

    const access = await client.storage.from('homecloud-originals').createSignedUrl(storagePath, 60);
    if (access.error || !access.data?.signedUrl) throw access.error ?? new Error('signed download URL missing');
    const get = await fetch(access.data.signedUrl);
    if (!get.ok || !get.body) throw new Error(`60 MiB GET failed: ${get.status}`);
    await pipeline(Readable.fromWeb(get.body), fs.createWriteStream(downloadPath, { flags: 'wx' }));

    const [source, downloaded, sourceDigest, downloadedDigest] = await Promise.all([
      fsp.stat(sourcePath), fsp.stat(downloadPath), digest(sourcePath), digest(downloadPath),
    ]);
    if (source.size !== SIZE_BYTES || downloaded.size !== source.size) {
      throw new Error('size mismatch after download');
    }
    passed += 1;
    if (sourceDigest !== downloadedDigest) {
      throw new Error('size or digest mismatch after download');
    }
    passed += 1;
    console.log(`HOMECLOUD_SLICE01_60MIB_PASS pass=${passed} bytes=${source.size} digest_match=true`);
  } finally {
    await client.storage.from('homecloud-originals').remove([storagePath]).catch(() => {});
    await Promise.all([fsp.rm(sourcePath, { force: true }), fsp.rm(downloadPath, { force: true })]);
  }
}

main().catch((error) => {
  console.error(`HOMECLOUD_SLICE01_STORAGE_RUNTIME_FAIL ${error.message}`);
  process.exitCode = 1;
});
