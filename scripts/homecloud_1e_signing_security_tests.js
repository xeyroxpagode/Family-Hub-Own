#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1E — Private Access Helper / Signing Security Tests.
 *
 * Tests the createHomeCloudContentAccess service with real Supabase.
 * Validates:
 * - Valid member with homecloud.view + same household + existing path -> signed URL
 * - Invalid: no membership, different household, no capability, unknown variant, staging, NULL preview
 * - NO public API accepting arbitrary bucket/path from client
 */

// Set required env vars for backend config BEFORE requiring backend modules.
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');
loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const { createClient } = require('@supabase/supabase-js');
const path = require('node:path');
const fs = require('node:fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
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

function readFile(rel) {
  return fs.readFileSync(path.join(path.resolve(__dirname, '..'), rel), 'utf8');
}

async function runTests() {
  console.log('\n=== HC-1E PRIVATE ACCESS / SIGNING SECURITY TESTS ===\n');
  console.log(`Target Supabase: ${SUPABASE_URL}\n`);

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Setup: Create test household, members, content via service role ---
  let householdId, memberIdViewer, memberIdContributor, contentIdFile, contentIdMemory, contentIdStaging, contentIdNoPreview;
  let authUserId1, authUserId2;
  let person1, person2;

  try {
    // Create auth users
    const runId = Date.now();
    const { data: authUser1 } = await serviceClient.auth.admin.createUser({
      email: `viewer-${runId}@test.local`, password: 'dummy123', email_confirm: true, user_metadata: {}
    });
    const { data: authUser2 } = await serviceClient.auth.admin.createUser({
      email: `contributor-${runId}@test.local`, password: 'dummy123', email_confirm: true, user_metadata: {}
    });
    authUserId1 = authUser1.user.id;
    authUserId2 = authUser2.user.id;

    // Create people
    const p1Result = await serviceClient.from('people').insert({ display_name: 'Viewer', auth_user_id: authUserId1 }).select().single();
    const p2Result = await serviceClient.from('people').insert({ display_name: 'Contributor', auth_user_id: authUserId2 }).select().single();
    person1 = p1Result.data;
    person2 = p2Result.data;

    // Create household
    const { data: hh } = await serviceClient.from('households').insert({ name: 'HC-1E Test', slug: 'hc1e-test-' + runId, created_by_person_id: person1.id }).select().single();
    householdId = hh.id;

    // Create memberships
    const now = new Date().toISOString();
    const { data: mem1 } = await serviceClient.from('household_members').insert({ household_id: householdId, person_id: person1.id, role: 'child', status: 'active', joined_at: now }).select().single();
    const { data: mem2 } = await serviceClient.from('household_members').insert({ household_id: householdId, person_id: person2.id, role: 'adult', status: 'active', joined_at: now }).select().single();
    memberIdViewer = mem1.id;
    memberIdContributor = mem2.id;

    // Seed content with original in storage (service role upload)
    const testFile = Buffer.from('test file content');
    await serviceClient.storage.from('homecloud-originals').upload(`${householdId}/file1/original`, testFile, { contentType: 'text/plain', upsert: true });
    await serviceClient.storage.from('homecloud-originals').upload(`${householdId}/file2/original`, testFile, { contentType: 'image/jpeg', upsert: true });
    await serviceClient.storage.from('homecloud-previews').upload(`${householdId}/file2/preview`, testFile, { contentType: 'image/jpeg', upsert: true });

    // File with original only
    const { data: fc1 } = await serviceClient.from('homecloud_contents').insert({
      household_id: householdId, role: 'file', display_name: 'Test Doc.pdf', mime_type: 'application/pdf', size_bytes: testFile.length,
      original_storage_path: `${householdId}/file1/original`, uploaded_by_member_id: memberIdContributor, lifecycle: 'active', uploaded_at: now
    }).select().single();
    contentIdFile = fc1.id;

    // Memory with original + preview
    const { data: mc1 } = await serviceClient.from('homecloud_contents').insert({
      household_id: householdId, role: 'memory', display_name: 'Photo.jpg', mime_type: 'image/jpeg', size_bytes: testFile.length,
      original_storage_path: `${householdId}/file2/original`, preview_storage_path: `${householdId}/file2/preview`,
      uploaded_by_member_id: memberIdContributor, lifecycle: 'active', uploaded_at: now, captured_at: now, capture_precision: 'exact'
    }).select().single();
    contentIdMemory = mc1.id;

    // Staging content (no uploaded_at)
    const { data: sc1 } = await serviceClient.from('homecloud_contents').insert({
      household_id: householdId, role: 'file', display_name: 'Staging.doc', mime_type: 'application/pdf', size_bytes: 0,
      original_storage_path: `${householdId}/staging/original`, uploaded_by_member_id: memberIdContributor, lifecycle: 'staging'
    }).select().single();
    contentIdStaging = sc1.id;

    // Active content with NULL preview
    const { data: np1 } = await serviceClient.from('homecloud_contents').insert({
      household_id: householdId, role: 'file', display_name: 'NoPreview.txt', mime_type: 'text/plain', size_bytes: 100,
      original_storage_path: `${householdId}/nopreview/original`, uploaded_by_member_id: memberIdContributor, lifecycle: 'active', uploaded_at: now
    }).select().single();
    contentIdNoPreview = np1.id;

    console.log('Setup complete');
  } catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
  }

  // Load the service (requires backend deps)
  const { createHomeCloudContentAccess } = require('../backend/src/services/homecloudStorageAccess');

  // Helper to create auth context like getHomeCloudContext
  function createAuthContext(role, membershipStatus = 'active', householdOverride = {}) {
    const effectiveHouseholdId = householdOverride.id || householdId;
    return {
      householdId: effectiveHouseholdId,
      membership: { id: role === 'child' ? memberIdViewer : memberIdContributor, role, status: membershipStatus },
      household: { id: effectiveHouseholdId, config: householdOverride.config || {} },
      capabilities: require('../backend/src/lib/homecloudCapabilities').resolveHomeCloudCapabilities({
        role, membershipStatus, household: { id: effectiveHouseholdId, config: householdOverride.config || {} },
      }),
    };
  }

  console.log('\n=== HC-1E PRIVATE ACCESS / SIGNING SECURITY TESTS ===\n');

  // --- VALID CASES ---

  console.log('\n--- VALID: member with homecloud.view + same household + existing path ---');

  // Test 1: viewer (child) can access original
  const viewerCtx = createAuthContext('child');
  const result1 = await createHomeCloudContentAccess({ authContext: viewerCtx, contentId: contentIdFile, variant: 'original' });
  record(
    result1.signedUrl && result1.bucket === 'homecloud-originals' && result1.variant === 'original',
    'viewer (child) gets signed URL for original',
  );

  // Test 2: contributor (adult) can access original
  const adultCtx = createAuthContext('adult');
  const result2 = await createHomeCloudContentAccess({ authContext: adultCtx, contentId: contentIdFile, variant: 'original' });
  record(
    result2.signedUrl && result2.bucket === 'homecloud-originals',
    'contributor (adult) gets signed URL for original',
  );

  // Test 3: adult can access preview when available
  const result3 = await createHomeCloudContentAccess({ authContext: adultCtx, contentId: contentIdMemory, variant: 'preview' });
  record(
    result3.signedUrl && result3.bucket === 'homecloud-previews' && result3.variant === 'preview',
    'adult gets signed URL for preview when available',
  );

  // Test 4: preview unavailable returns canonical result (not 404, not fake URL)
  const result4 = await createHomeCloudContentAccess({ authContext: adultCtx, contentId: contentIdNoPreview, variant: 'preview' });
  record(
    result4.code === 'preview_unavailable' && !result4.signedUrl,
    'NULL preview returns preview_unavailable (no fake URL)',
  );

  // --- INVALID CASES ---

  console.log('\n--- INVALID: access denied cases ---');

  // Test 5: different household (content not in household -> 404, not leak)
  const otherHouseholdCtx = createAuthContext('adult', 'active', { id: '11111111-1111-4111-8111-111111111111', config: {} });
  try {
    await createHomeCloudContentAccess({ authContext: otherHouseholdCtx, contentId: contentIdFile, variant: 'original' });
    record(false, 'different household should be denied');
  } catch (e) {
    record(e.statusCode === 404, 'different household -> 404 not found (no leak)');
  }

  // Test 6: member without homecloud.view (simulate via config override)
  // householdPermissions.js reads config.permissions[capability][role]
  const noViewHousehold = { config: { permissions: { 'homecloud.view': { adult: false } } } };
  const noViewCtx = createAuthContext('adult', 'active', { id: householdId, config: noViewHousehold.config });
  try {
    await createHomeCloudContentAccess({ authContext: noViewCtx, contentId: contentIdFile, variant: 'original' });
    record(false, 'no homecloud.view should be denied');
  } catch (e) {
    record(e.statusCode === 403 && e.code === 'homecloud_forbidden', 'no capability -> 403 homecloud_forbidden');
  }

  // Test 7: inactive membership (pending) -> capability resolution returns all false -> 403
  const pendingCtx = createAuthContext('adult', 'pending');
  try {
    await createHomeCloudContentAccess({ authContext: pendingCtx, contentId: contentIdFile, variant: 'original' });
    record(false, 'pending membership should be denied');
  } catch (e) {
    record(e.statusCode === 403 && e.code === 'homecloud_forbidden', 'pending membership -> 403 forbidden (no caps)');
  }

  // Test 8: unknown variant
  try {
    await createHomeCloudContentAccess({ authContext: adultCtx, contentId: contentIdFile, variant: 'thumbnail' });
    record(false, 'unknown variant should be denied');
  } catch (e) {
    record(e.statusCode === 400 && e.code === 'homecloud_invalid_variant', 'unknown variant -> 400');
  }

  // Test 9: staging content through normal view helper
  try {
    await createHomeCloudContentAccess({ authContext: adultCtx, contentId: contentIdStaging, variant: 'original' });
    record(false, 'staging content should be denied');
  } catch (e) {
    record(e.statusCode === 404, 'staging content -> 404');
  }

  // Test 10: non-existent contentId
  try {
    await createHomeCloudContentAccess({ authContext: adultCtx, contentId: '00000000-0000-4000-8000-000000000000', variant: 'original' });
    record(false, 'non-existent content should be denied');
  } catch (e) {
    record(e.statusCode === 404, 'non-existent content -> 404');
  }

  // Test 11: NO arbitrary bucket/path API exists (architectural test)
  // Verify the service function signature does NOT accept bucket/path from client
  const svcSource = readFile('backend/src/services/homecloudStorageAccess.js');
  // Check function signature only accepts (authContext, contentId, variant, options)
  // and does NOT have bucket/path as parameters
  record(
    !/createHomeCloudContentAccess\s*\(\s*\{\s*bucket/.test(svcSource),
    'service function does not accept bucket as parameter',
  );
  record(
    !/createHomeCloudContentAccess\s*\(\s*\{\s*path/.test(svcSource),
    'service function does not accept path as parameter',
  );
  // Verify bucket is resolved internally via getHomeCloudBucket
  record(
    svcSource.includes('getHomeCloudBucket(variant)'),
    'service resolves bucket internally via getHomeCloudBucket',
  );

  // --- Cleanup ---
  console.log('\n--- Cleanup ---');
  await serviceClient.storage.from('homecloud-originals').remove([
    `${householdId}/file1/original`, `${householdId}/file2/original`, `${householdId}/staging/original`, `${householdId}/nopreview/original`
  ]);
  await serviceClient.storage.from('homecloud-previews').remove([`${householdId}/file2/preview`]);
  await serviceClient.from('homecloud_contents').delete().eq('id', contentIdFile);
  await serviceClient.from('homecloud_contents').delete().eq('id', contentIdMemory);
  await serviceClient.from('homecloud_contents').delete().eq('id', contentIdStaging);
  await serviceClient.from('homecloud_contents').delete().eq('id', contentIdNoPreview);
  await serviceClient.from('household_members').delete().eq('id', memberIdViewer);
  await serviceClient.from('household_members').delete().eq('id', memberIdContributor);
  await serviceClient.from('people').delete().eq('id', person1.id);
  await serviceClient.from('people').delete().eq('id', person2.id);
  await serviceClient.from('households').delete().eq('id', householdId);
  await serviceClient.auth.admin.deleteUser(authUserId1);
  await serviceClient.auth.admin.deleteUser(authUserId2);
  console.log('Cleanup complete');

  // --- Summary ---
  console.log(`\nHC1E_SIGNING_SECURITY_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC1E_SIGNING_SECURITY_TESTS=FAIL');
  } else {
    console.log('HC1E_SIGNING_SECURITY_TESTS=PASS');
  }
}

runTests().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
