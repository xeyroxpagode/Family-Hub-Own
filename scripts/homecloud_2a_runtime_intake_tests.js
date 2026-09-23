#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-2A — Runtime intake tests against local Supabase.
 *
 * Exercises the real backend service with real Supabase Auth JWTs and local
 * Storage. No remote DB/Storage mutation. The test seeds via service_role,
 * signs in as real local users, then calls the HC-2A service functions with the
 * same request shape produced by authFinalMiddleware.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  registerHomeCloudContent,
  authorizeHomeCloudOriginalUpload,
  verifyHomeCloudOriginal,
  finalizeHomeCloudContent,
} = require('../backend/src/services/homecloudIntakeService');
const { getContentById } = require('../backend/src/services/homecloudReadService');
const { getHomeCloudOriginalPath } = require('../backend/src/lib/homecloudStoragePaths');

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

async function expectReject(fn, code, message) {
  try {
    await fn();
    record(false, message);
  } catch (e) {
    record(e.code === code, `${message} (${e.code || 'no_code'})`);
  }
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hc2a-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, email, password, token: signedIn.session.access_token };
}

function reqFor(authUser, suffix) {
  return {
    user: { id: authUser.userId },
    accessToken: authUser.token,
    requestId: `req-hc2a-${suffix}`,
    mutationId: `mut-hc2a-${suffix}`,
  };
}

async function run() {
  console.log('\n=== HC-2A RUNTIME INTAKE TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const runId = Date.now();
  const cleanup = { authUsers: [], contentIds: [], originalPaths: [], folderIds: [], albumIds: [], membershipIds: [], personIds: [], householdIds: [] };

  try {
    const adult = await createAuthUser(runId, 'adult');
    const child = await createAuthUser(runId, 'child');
    const noMember = await createAuthUser(runId, 'nomember');
    cleanup.authUsers.push(adult.userId, child.userId, noMember.userId);

    const { data: adultPerson, error: adultPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC2A Adult', auth_user_id: adult.userId })
      .select('*')
      .single();
    if (adultPersonErr) throw adultPersonErr;
    const { data: childPerson, error: childPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC2A Child', auth_user_id: child.userId })
      .select('*')
      .single();
    if (childPersonErr) throw childPersonErr;
    const { data: noMemberPerson, error: noMemberPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC2A No Member', auth_user_id: noMember.userId })
      .select('*')
      .single();
    if (noMemberPersonErr) throw noMemberPersonErr;
    cleanup.personIds.push(adultPerson.id, childPerson.id, noMemberPerson.id);

    const { data: householdA, error: hhAErr } = await serviceClient
      .from('households')
      .insert({ name: 'HC2A Household A', slug: `hc2a-a-${runId}`, created_by_person_id: adultPerson.id })
      .select('*')
      .single();
    if (hhAErr) throw hhAErr;
    const { data: householdB, error: hhBErr } = await serviceClient
      .from('households')
      .insert({ name: 'HC2A Household B', slug: `hc2a-b-${runId}`, created_by_person_id: adultPerson.id })
      .select('*')
      .single();
    if (hhBErr) throw hhBErr;
    cleanup.householdIds.push(householdA.id, householdB.id);

    const nowIso = new Date().toISOString();
    const { data: adultMember, error: adultMemberErr } = await serviceClient
      .from('household_members')
      .insert({ household_id: householdA.id, person_id: adultPerson.id, role: 'adult', status: 'active', joined_at: nowIso })
      .select('*')
      .single();
    if (adultMemberErr) throw adultMemberErr;
    const { data: childMember, error: childMemberErr } = await serviceClient
      .from('household_members')
      .insert({ household_id: householdA.id, person_id: childPerson.id, role: 'child', status: 'active', joined_at: nowIso })
      .select('*')
      .single();
    if (childMemberErr) throw childMemberErr;
    cleanup.membershipIds.push(adultMember.id, childMember.id);

    const { error: activeHouseholdErr } = await serviceClient
      .from('people')
      .update({ active_household_id: householdA.id })
      .in('id', [adultPerson.id, childPerson.id]);
    if (activeHouseholdErr) throw activeHouseholdErr;

    const reqAdult = reqFor(adult, 'adult');
    const reqChild = reqFor(child, 'child');
    const reqNoMember = reqFor(noMember, 'nomember');

    // REGISTER: valid FILE + staging invariant.
    const file = await registerHomeCloudContent(reqAdult, {
      role: 'file',
      displayName: 'runtime.txt',
      mimeType: 'text/plain',
      sizeBytes: 5,
      extension: 'txt',
      intakeRequestId: `hc2a-file-${runId}`,
    });
    cleanup.contentIds.push(file.id);
    record(file.role === 'file', 'valid FILE register returns file DTO');

    const { data: fileRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', file.id).single();
    cleanup.originalPaths.push(fileRow.original_storage_path);
    record(fileRow.household_id === householdA.id, 'register uses server-resolved active Household');
    record(fileRow.lifecycle === 'staging', 'register creates lifecycle=staging');
    record(fileRow.uploaded_at === null, 'register leaves uploaded_at=NULL');
    record(fileRow.original_storage_path === getHomeCloudOriginalPath(householdA.id, file.id), 'register stores canonical original path');

    const fileReplay = await registerHomeCloudContent(reqAdult, {
      role: 'file', displayName: 'runtime.txt', mimeType: 'text/plain', sizeBytes: 5, extension: 'txt', intakeRequestId: `hc2a-file-${runId}`,
    });
    record(fileReplay.id === file.id, 'register retry with same intakeRequestId is idempotent');

    // REGISTER: Memory image/video/audio accepted.
    for (const [label, mime] of [['image', 'image/jpeg'], ['video', 'video/mp4'], ['audio', 'audio/mpeg']]) {
      const memory = await registerHomeCloudContent(reqAdult, {
        role: 'memory', displayName: `memory-${label}`, mimeType: mime, sizeBytes: 1, intakeRequestId: `hc2a-${label}-${runId}`,
      });
      cleanup.contentIds.push(memory.id);
      const { data: row } = await serviceClient.from('homecloud_contents').select('*').eq('id', memory.id).single();
      cleanup.originalPaths.push(row.original_storage_path);
      record(memory.role === 'memory' && row.lifecycle === 'staging', `valid ${label} Memory registers as staging`);
    }

    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', displayName: 'pdf-memory', mimeType: 'application/pdf', sizeBytes: 1, intakeRequestId: `hc2a-badmem-${runId}` }),
      'homecloud_memory_mime_invalid',
      'Memory with unsupported MIME denied',
    );
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'file', displayName: 'bad', mimeType: 'text/plain', sizeBytes: 1, lifecycle: 'active' }),
      'homecloud_forbidden_register_field',
      'client-supplied lifecycle denied',
    );
    await expectReject(
      () => registerHomeCloudContent(reqChild, { role: 'file', displayName: 'child.txt', mimeType: 'text/plain', sizeBytes: 1, intakeRequestId: `hc2a-child-${runId}` }),
      'homecloud_forbidden',
      'member without homecloud.contribute denied',
    );
    await expectReject(
      () => registerHomeCloudContent(reqNoMember, { role: 'file', displayName: 'no.txt', mimeType: 'text/plain', sizeBytes: 1, intakeRequestId: `hc2a-nomem-${runId}` }),
      'no_active_household',
      'no HomeCloud household context denied',
    );

    // READ: staging hidden from normal HC-1F reads.
    await expectReject(() => getContentById(reqAdult, file.id), 'homecloud_content_not_found', 'staging content hidden from normal read');

    // VERIFY: missing original does not finalize.
    const missing = await verifyHomeCloudOriginal(reqAdult, file.id);
    record(missing.verified === false && missing.code === 'original_missing', 'missing original verification returns incomplete');
    await expectReject(() => finalizeHomeCloudContent(reqAdult, file.id), 'homecloud_verify_failed', 'finalize denied while original missing');

    // UPLOAD AUTHORIZATION: exact content path, not arbitrary path.
    const uploadAuth = await authorizeHomeCloudOriginalUpload(reqAdult, file.id);
    record(uploadAuth.path === fileRow.original_storage_path, 'upload authorization is scoped to canonical content path');
    record(uploadAuth.bucket === 'homecloud-originals', 'upload authorization uses canonical originals bucket');

    // Cross-Household content guessing denied.
    const bContentId = randomUUID();
    const bPath = getHomeCloudOriginalPath(householdB.id, bContentId);
    const { data: bContent, error: bContentErr } = await serviceClient
      .from('homecloud_contents')
      .insert({ id: bContentId, household_id: householdB.id, role: 'file', display_name: 'b.txt', mime_type: 'text/plain', size_bytes: 1, original_storage_path: bPath, lifecycle: 'staging' })
      .select('*')
      .single();
    if (bContentErr) throw bContentErr;
    cleanup.contentIds.push(bContent.id);
    cleanup.originalPaths.push(bPath);
    await expectReject(() => authorizeHomeCloudOriginalUpload(reqAdult, bContent.id), 'homecloud_content_not_found', 'Household A cannot authorize B staging upload');

    // Upload the registered original through the signed one-object URL.
    const put = await fetch(uploadAuth.signedUploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain', 'x-upsert': 'false' },
      body: Buffer.from('hello'),
    });
    record(put.ok, `signed upload URL accepts intended original (${put.status})`);

    const verified = await verifyHomeCloudOriginal(reqAdult, file.id);
    record(verified.verified === true, 'uploaded original verifies successfully');

    const finalized = await finalizeHomeCloudContent(reqAdult, file.id);
    record(finalized.id === file.id && finalized.role === 'file', 'finalize returns canonical content DTO');
    const { data: finalizedRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', file.id).single();
    record(finalizedRow.lifecycle === 'active', 'finalize sets lifecycle=active');
    record(finalizedRow.uploaded_at !== null, 'uploaded_at set at finalize time');
    record(finalizedRow.preview_storage_path === null, 'preview remains optional/null after finalize');

    const finalizedAgain = await finalizeHomeCloudContent(reqAdult, file.id);
    const { data: afterReplay } = await serviceClient.from('homecloud_contents').select('*').eq('id', file.id).single();
    record(finalizedAgain.id === file.id && afterReplay.uploaded_at === finalizedRow.uploaded_at, 'repeat finalize is idempotent and preserves uploaded_at');

    const visible = await getContentById(reqAdult, file.id);
    record(visible.id === file.id && visible.uploadedAt !== null, 'active content visible through normal read after finalize');
    await expectReject(() => authorizeHomeCloudOriginalUpload(reqAdult, file.id), 'homecloud_not_staging', 'active content cannot obtain replace-original authorization');

    // Direct client write remains denied by Storage RLS/policies.
    const direct = await anonClient.storage.from('homecloud-originals').upload(`evil/${runId}/original`, Buffer.from('bad'), { contentType: 'text/plain', upsert: false });
    record(Boolean(direct.error), 'direct unauthenticated Storage write denied');
  } finally {
    if (cleanup.originalPaths.length > 0) {
      await serviceClient.storage.from('homecloud-originals').remove(cleanup.originalPaths).catch(() => {});
    }
    if (cleanup.contentIds.length > 0) {
      await serviceClient.from('homecloud_contents').delete().in('id', cleanup.contentIds);
    }
    if (cleanup.membershipIds.length > 0) {
      await serviceClient.from('household_members').delete().in('id', cleanup.membershipIds);
    }
    if (cleanup.householdIds.length > 0) {
      await serviceClient.from('households').delete().in('id', cleanup.householdIds);
    }
    if (cleanup.personIds.length > 0) {
      await serviceClient.from('people').delete().in('id', cleanup.personIds);
    }
    for (const userId of cleanup.authUsers) {
      await serviceClient.auth.admin.deleteUser(userId).catch(() => {});
    }
  }

  console.log(`\nHC2A_RUNTIME_INTAKE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC2A_RUNTIME_INTAKE_TESTS=FAIL');
  } else {
    console.log('HC2A_RUNTIME_INTAKE_TESTS=PASS');
  }
}

run().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
