#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-1E — Preview Optional Contract Test.
 *
 * Encodes the frozen Product Truth:
 * PREVIEW FAILURE DOES NOT INVALIDATE CANONICAL CONTENT.
 *
 * Valid states:
 * - lifecycle = active
 * - uploaded_at != NULL
 * - preview_storage_path = NULL
 *
 * And private-read helper:
 * - original variant -> resolves normally
 * - preview variant -> returns preview_unavailable (no fake signed URL)
 */

// Set required env vars for backend config BEFORE requiring backend modules.
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');
loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
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
  console.log('\n=== HC-1E PREVIEW OPTIONAL CONTRACT TESTS ===\n');
  console.log(`Target Supabase: ${SUPABASE_URL}\n`);

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Setup: Create test household, member, content ---
  let householdId, memberId, contentIdActiveNoPreview, contentIdActiveWithPreview, authUserId;
  let personId;

  try {
    // Create auth user
    const runId = Date.now();
    const { data: authUser } = await serviceClient.auth.admin.createUser({
      email: `previewtest-${runId}@test.local`, password: 'dummy123', email_confirm: true, user_metadata: {}
    });
    authUserId = authUser.user.id;

    // Create person
    const { data: person } = await serviceClient.from('people').insert({ display_name: 'Preview Tester', auth_user_id: authUserId }).select().single();
    personId = person.id;

    // Create household
    const { data: hh } = await serviceClient.from('households').insert({ name: 'Preview Test', slug: 'preview-test-' + runId, created_by_person_id: personId }).select().single();
    householdId = hh.id;

    // Create membership
    const now = new Date().toISOString();
    const { data: mem } = await serviceClient.from('household_members').insert({ household_id: householdId, person_id: personId, role: 'adult', status: 'active', joined_at: now }).select().single();
    memberId = mem.id;

    // Upload test file to storage
    const testFile = Buffer.from('test content for preview optional');
    await serviceClient.storage.from('homecloud-originals').upload(`${householdId}/nopreview/original`, testFile, { contentType: 'text/plain', upsert: true });
    await serviceClient.storage.from('homecloud-originals').upload(`${householdId}/withpreview/original`, testFile, { contentType: 'image/jpeg', upsert: true });
    await serviceClient.storage.from('homecloud-previews').upload(`${householdId}/withpreview/preview`, testFile, { contentType: 'image/jpeg', upsert: true });

    // Content 1: ACTIVE, uploaded_at set, NO preview (preview_storage_path = NULL)
    const { data: c1 } = await serviceClient.from('homecloud_contents').insert({
      household_id: householdId, role: 'file', display_name: 'NoPreview.txt', mime_type: 'text/plain', size_bytes: testFile.length,
      original_storage_path: `${householdId}/nopreview/original`, uploaded_by_member_id: memberId, lifecycle: 'active', uploaded_at: now
    }).select().single();
    contentIdActiveNoPreview = c1.id;

    // Content 2: ACTIVE, uploaded_at set, WITH preview
    const { data: c2 } = await serviceClient.from('homecloud_contents').insert({
      household_id: householdId, role: 'memory', display_name: 'WithPreview.jpg', mime_type: 'image/jpeg', size_bytes: testFile.length,
      original_storage_path: `${householdId}/withpreview/original`, preview_storage_path: `${householdId}/withpreview/preview`,
      uploaded_by_member_id: memberId, lifecycle: 'active', uploaded_at: now, captured_at: now, captured_year: new Date(now).getUTCFullYear(), captured_month: new Date(now).getUTCMonth() + 1, capture_precision: 'exact'
    }).select().single();
    contentIdActiveWithPreview = c2.id;

    console.log('Setup complete');
  } catch (e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
  }

  // Load the service
  const { createHomeCloudContentAccess, checkHomeCloudPreviewAvailability } = require('../backend/src/services/homecloudStorageAccess');

  // Helper to create auth context
  function createAuthContext(role = 'adult', membershipStatus = 'active', householdOverride = {}) {
    const effectiveHouseholdId = householdOverride.id || householdId;
    return {
      householdId: effectiveHouseholdId,
      membership: { id: memberId, role, status: membershipStatus },
      household: { id: effectiveHouseholdId, config: householdOverride.config || {} },
      capabilities: require('../backend/src/lib/homecloudCapabilities').resolveHomeCloudCapabilities({
        role, membershipStatus, household: { id: effectiveHouseholdId, config: householdOverride.config || {} },
      }),
    };
  }

  const authContext = createAuthContext('adult');

  console.log('\n=== HC-1E PREVIEW OPTIONAL CONTRACT TESTS ===\n');

  // --- Contract: ACTIVE + uploaded_at + NULL preview is VALID ---
  console.log('\n--- Validating ACTIVE + uploaded_at + NULL preview state ---');

  // Verify DB state
  const { data: contentNoPreview } = await serviceClient
    .from('homecloud_contents')
    .select('lifecycle, uploaded_at, preview_storage_path')
    .eq('id', contentIdActiveNoPreview)
    .single();

  record(
    contentNoPreview.lifecycle === 'active',
    'content lifecycle = active',
  );
  record(
    contentNoPreview.uploaded_at !== null,
    'content uploaded_at != NULL',
  );
  record(
    contentNoPreview.preview_storage_path === null,
    'content preview_storage_path = NULL',
  );

  // --- Contract: original variant resolves normally ---
  console.log('\n--- Original variant access ---');
  const originalResult = await createHomeCloudContentAccess({
    authContext,
    contentId: contentIdActiveNoPreview,
    variant: 'original',
  });
  record(
    originalResult.signedUrl && originalResult.bucket === 'homecloud-originals',
    'original variant -> signed URL created',
  );

  // --- Contract: preview variant returns preview_unavailable (no fake URL) ---
  console.log('\n--- Preview variant access (NULL preview) ---');
  const previewResult = await createHomeCloudContentAccess({
    authContext,
    contentId: contentIdActiveNoPreview,
    variant: 'preview',
  });
  record(
    previewResult.code === 'preview_unavailable' && !previewResult.signedUrl,
    'NULL preview -> preview_unavailable (no fake signed URL)',
  );
  record(
    previewResult.message && previewResult.message.includes('vista previa'),
    'preview_unavailable includes Spanish message',
  );

  // --- Contract: checkHomeCloudPreviewAvailability ---
  console.log('\n--- checkHomeCloudPreviewAvailability ---');
  const availNoPreview = await checkHomeCloudPreviewAvailability({ authContext, contentId: contentIdActiveNoPreview });
  record(
    availNoPreview.hasPreview === false && availNoPreview.previewPath === null,
    'checkHomeCloudPreviewAvailability: no preview -> hasPreview=false',
  );

  const availWithPreview = await checkHomeCloudPreviewAvailability({ authContext, contentId: contentIdActiveWithPreview });
  record(
    availWithPreview.hasPreview === true && availWithPreview.previewPath !== null,
    'checkHomeCloudPreviewAvailability: with preview -> hasPreview=true',
  );

  // --- Contract: WITH preview works normally ---
  console.log('\n--- With preview (control) ---');
  const withPreviewResult = await createHomeCloudContentAccess({
    authContext,
    contentId: contentIdActiveWithPreview,
    variant: 'preview',
  });
  record(
    withPreviewResult.signedUrl && withPreviewResult.bucket === 'homecloud-previews',
    'with preview -> signed URL created',
  );

  // --- Cleanup ---
  console.log('\n--- Cleanup ---');
  await serviceClient.storage.from('homecloud-originals').remove([`${householdId}/nopreview/original`, `${householdId}/withpreview/original`]);
  await serviceClient.storage.from('homecloud-previews').remove([`${householdId}/withpreview/preview`]);
  await serviceClient.from('homecloud_contents').delete().eq('id', contentIdActiveNoPreview);
  await serviceClient.from('homecloud_contents').delete().eq('id', contentIdActiveWithPreview);
  await serviceClient.from('household_members').delete().eq('id', memberId);
  await serviceClient.from('people').delete().eq('id', personId);
  await serviceClient.from('households').delete().eq('id', householdId);
  await serviceClient.auth.admin.deleteUser(authUserId);
  console.log('Cleanup complete');

  // --- Summary ---
  console.log(`\nHC1E_PREVIEW_OPTIONAL_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC1E_PREVIEW_OPTIONAL_TESTS=FAIL');
  } else {
    console.log('HC1E_PREVIEW_OPTIONAL_TESTS=PASS');
  }
}

runTests().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
