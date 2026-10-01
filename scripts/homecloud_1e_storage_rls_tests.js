#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1E — Storage RLS / Direct Client Bypass Tests.
 *
 * Tests that direct client (anon) cannot access homecloud storage buckets,
 * while service role (backend) can.
 */

const { createClient } = require('@supabase/supabase-js');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function runTests() {
  console.log('\n=== HC-1E STORAGE RLS / DIRECT CLIENT BYPASS TESTS ===\n');
  console.log(`Target Supabase: ${SUPABASE_URL}\n`);

  // Create clients
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const testFile = Buffer.from('test content for homecloud storage');

  // --- Test 1: anon cannot list homecloud-originals ---
  console.log('\n--- Testing anon access to homecloud-originals (should be denied) ---');
  const { data: listOrigAnon, error: listOrigAnonErr } = await anonClient
    .storage
    .from('homecloud-originals')
    .list('', { limit: 10 });
  record(
    listOrigAnon === null || listOrigAnon.length === 0,
    'anon list homecloud-originals returns empty/denied',
  );
  if (listOrigAnonErr) {
    console.log(`    (Error: ${listOrigAnonErr.message})`);
  }

  // --- Test 2: anon cannot list homecloud-previews ---
  const { data: listPrevAnon, error: listPrevAnonErr } = await anonClient
    .storage
    .from('homecloud-previews')
    .list('', { limit: 10 });
  record(
    listPrevAnon === null || listPrevAnon.length === 0,
    'anon list homecloud-previews returns empty/denied',
  );
  if (listPrevAnonErr) {
    console.log(`    (Error: ${listPrevAnonErr.message})`);
  }

  // --- Test 3: anon cannot upload to homecloud-originals ---
  console.log('\n--- Testing anon upload to homecloud-originals (should be denied) ---');
  const { error: uploadOrigAnonErr } = await anonClient
    .storage
    .from('homecloud-originals')
    .upload('test/original.txt', testFile, { contentType: 'text/plain' });
  record(
    uploadOrigAnonErr !== null,
    'anon upload homecloud-originals denied',
  );
  if (uploadOrigAnonErr) {
    console.log(`    (Error: ${uploadOrigAnonErr.message})`);
  }

  // --- Test 4: anon cannot upload to homecloud-previews ---
  const { error: uploadPrevAnonErr } = await anonClient
    .storage
    .from('homecloud-previews')
    .upload('test/preview.txt', testFile, { contentType: 'text/plain' });
  record(
    uploadPrevAnonErr !== null,
    'anon upload homecloud-previews denied',
  );
  if (uploadPrevAnonErr) {
    console.log(`    (Error: ${uploadPrevAnonErr.message})`);
  }

  // --- Test 5: anon cannot download from homecloud-originals ---
  console.log('\n--- Testing anon download from homecloud-originals (should be denied) ---');
  const { error: downloadOrigAnonErr } = await anonClient
    .storage
    .from('homecloud-originals')
    .download('test/original.txt');
  record(
    downloadOrigAnonErr !== null,
    'anon download homecloud-originals denied',
  );
  if (downloadOrigAnonErr) {
    console.log(`    (Error: ${downloadOrigAnonErr.message})`);
  }

  // --- Test 6: service role CAN upload to homecloud-originals ---
  console.log('\n--- Testing service role access (should work) ---');
  const { data: svcUploadOrig, error: svcUploadOrigErr } = await serviceClient
    .storage
    .from('homecloud-originals')
    .upload('test/service_original.txt', testFile, { contentType: 'text/plain', upsert: true });
  record(
    svcUploadOrigErr === null && svcUploadOrig !== null,
    'service role upload homecloud-originals works',
  );
  if (svcUploadOrigErr) {
    console.log(`    (Error: ${svcUploadOrigErr.message})`);
  }

  // --- Test 7: service role CAN list homecloud-originals ---
  const { data: svcListOrig, error: svcListOrigErr } = await serviceClient
    .storage
    .from('homecloud-originals')
    .list('test', { limit: 10 });
  record(
    svcListOrigErr === null && svcListOrig !== null && svcListOrig.length >= 1,
    'service role list homecloud-originals works',
  );
  if (svcListOrigErr) {
    console.log(`    (Error: ${svcListOrigErr.message})`);
  }

  // --- Test 8: service role CAN download from homecloud-originals ---
  const { data: svcDownloadOrig, error: svcDownloadOrigErr } = await serviceClient
    .storage
    .from('homecloud-originals')
    .download('test/service_original.txt');
  record(
    svcDownloadOrigErr === null && svcDownloadOrig !== null,
    'service role download homecloud-originals works',
  );
  if (svcDownloadOrigErr) {
    console.log(`    (Error: ${svcDownloadOrigErr.message})`);
  }

  // --- Test 9: service role CAN upload to homecloud-previews ---
  const { data: svcUploadPrev, error: svcUploadPrevErr } = await serviceClient
    .storage
    .from('homecloud-previews')
    .upload('test/service_preview.txt', testFile, { contentType: 'text/plain', upsert: true });
  record(
    svcUploadPrevErr === null && svcUploadPrev !== null,
    'service role upload homecloud-previews works',
  );
  if (svcUploadPrevErr) {
    console.log(`    (Error: ${svcUploadPrevErr.message})`);
  }

  // --- Test 10: service role CAN create signed URL ---
  console.log('\n--- Testing service role signed URL creation ---');
  const { data: signedUrlData, error: signedUrlErr } = await serviceClient
    .storage
    .from('homecloud-originals')
    .createSignedUrl('test/service_original.txt', 60);
  record(
    signedUrlErr === null && signedUrlData?.signedUrl,
    'service role createSignedUrl homecloud-originals works',
  );
  if (signedUrlErr) {
    console.log(`    (Error: ${signedUrlErr.message})`);
  }

  // --- Cleanup ---
  console.log('\n--- Cleanup ---');
  await serviceClient.storage.from('homecloud-originals').remove(['test/service_original.txt', 'test/original.txt']);
  await serviceClient.storage.from('homecloud-previews').remove(['test/service_preview.txt', 'test/preview.txt']);
  console.log('Cleanup complete');

  // --- Summary ---
  console.log(`\nHC1E_STORAGE_RLS_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC1E_STORAGE_RLS_TESTS=FAIL');
  } else {
    console.log('HC1E_STORAGE_RLS_TESTS=PASS');
  }
}

runTests().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
