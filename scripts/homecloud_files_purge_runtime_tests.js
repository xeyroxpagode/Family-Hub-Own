#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 PURGE against the REAL local stack.
 *
 * LOCAL_RUNTIME_REQUIRED, and destructive ONLY to disposable fixtures this
 * script creates under its own run-scoped households. No real user file is
 * ever touched: every byte uploaded here belongs to a throwaway household,
 * person and content created by this run and deleted in the `finally`.
 *
 * This is the seam where the purge contract meets physics. What only this
 * suite can prove:
 *
 *   PHYSICAL     the original AND preview bytes are really GONE from Storage
 *                after the worker completes (proven by listing the object's
 *                own folder, not by trusting the remove() response);
 *   CASCades     the purged content row takes its Favorites with it, and the
 *                DURABLE OPERATION RECORD SURVIVES the row's deletion;
 *   IRREVERSIBLE restore and a repeated purge are typed refusals AFTER the
 *                purge completes, and /content/:id/access never grants again;
 *   FULL CHAIN   real JWT -> real context -> real capability matrix -> real
 *                service -> real PostgREST -> real Storage API, no stubs;
 *   RECOVERY     a crashed worker's expired lease is reclaimed and finished by
 *                a recovery pass of the same worker (restart recovery);
 *   FAULT        a corrupted snapshot is a PERMANENT refusal that deletes
 *                NOTHING (fault injection against the real database);
 *   CONCURRENCY  two simultaneous purge commands produce exactly ONE durable
 *                operation on the real database.
 *
 * Environment is resolved from `supabase status -o env` (the local stack's
 * own truth, so a stack on non-default ports is found) and MUST be loopback.
 */

const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { repositoryRoot } = require('../tests/helpers/process');

function loadLocalStackEnvironment() {
  const result = spawnSync('supabase', ['status', '-o', 'env'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  if (result.status !== 0 || !result.stdout) {
    throw new Error('RUNTIME_REQUIRED: local Supabase stack is not running (supabase status failed)');
  }
  const dotenv = require('../backend/node_modules/dotenv');
  const parsed = dotenv.parse(result.stdout);
  const url = process.env.SUPABASE_URL && new URL(process.env.SUPABASE_URL).hostname === '127.0.0.1'
    ? process.env.SUPABASE_URL
    : parsed.API_URL;
  const serviceKey = parsed.SERVICE_ROLE_KEY || parsed.SECRET_KEY;
  const anonKey = parsed.ANON_KEY || parsed.PUBLISHABLE_KEY;
  if (!url || !serviceKey || !anonKey) {
    throw new Error('RUNTIME_REQUIRED: local stack did not report API_URL / keys');
  }
  const hostname = new URL(url).hostname;
  if (!['127.0.0.1', 'localhost'].includes(hostname)) {
    throw new Error(`ENVIRONMENT_FAILURE: refusing non-local Supabase target (${hostname})`);
  }
  // The backend config reads these at require time; only local values are set.
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_ANON_KEY = anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  return { url, serviceKey, anonKey };
}

let stack;
try {
  stack = loadLocalStackEnvironment();
} catch (error) {
  if (/RUNTIME_REQUIRED/.test(String(error?.message))) {
    // The canonical LOCAL_RUNTIME_REQUIRED degradation: reported as SKIPPED
    // when the stack is absent, never as a failure and never as a fake PASS.
    console.log('SKIPPED (LOCAL_RUNTIME_REQUIRED): local Supabase stack is not running.');
    console.log('RESULT: skipped');
    process.exit(0);
  }
  throw error;
}

// Loaded AFTER the environment: the backend config reads it at require time.
const lifecycleService = require('../backend/src/services/homecloudLifecycle.service');
const workerService = require('../backend/src/services/homecloudPurgeWorker.service');
const storageAccess = require('../backend/src/services/homecloudStorageAccess');

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

async function expectReject(promiseFactory, expectedCode, message) {
  try {
    await promiseFactory();
    record(false, `${message} (expected rejection ${expectedCode}, got success)`);
    return null;
  } catch (e) {
    const ok = e && e.code === expectedCode;
    record(ok, `${message} (${(e && e.code) || 'no_code'}${ok ? '' : `, expected ${expectedCode}`})`);
    return e;
  }
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(stack.url, stack.serviceKey, clientOptions);
const anonClient = createClient(stack.url, stack.anonKey, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hcpurge-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, email, token: signedIn.session.access_token };
}

function reqFor(authUser) {
  return { user: { id: authUser.userId }, accessToken: authUser.token };
}

async function uploadBytes(bucket, storagePath, body) {
  const { error } = await serviceClient.storage.from(bucket).upload(storagePath, Buffer.from(body, 'utf8'), {
    contentType: 'text/plain',
    upsert: true,
  });
  if (error) throw error;
}

async function listObjects(bucket, folder) {
  const { data, error } = await serviceClient.storage.from(bucket).list(folder, { limit: 100 });
  if (error) throw error;
  return (data ?? []).map((entry) => entry.name);
}

async function makeTrashedFile({ householdId, memberId, displayName, withPreview }) {
  const id = randomUUID();
  const { error } = await serviceClient.from('homecloud_contents').insert({
    id,
    household_id: householdId,
    role: 'file',
    display_name: displayName,
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 24,
    original_storage_path: `${householdId}/${id}/original`,
    preview_storage_path: withPreview ? `${householdId}/${id}/preview` : null,
    lifecycle: 'active',
    uploaded_at: new Date().toISOString(),
    uploaded_by_member_id: memberId,
  });
  if (error) throw error;
  await uploadBytes('homecloud-originals', `${householdId}/${id}/original`, 'original-fixture-bytes');
  if (withPreview) await uploadBytes('homecloud-previews', `${householdId}/${id}/preview`, 'preview-fixture-bytes');
  return id;
}

async function purgeOpRow(operationId) {
  const { data, error } = await serviceClient.from('homecloud_purge_operations').select('*').eq('id', operationId).maybeSingle();
  if (error) throw error;
  return data;
}

async function contentRow(contentId) {
  const { data, error } = await serviceClient.from('homecloud_contents').select('*').eq('id', contentId).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The endpoint's opportunistic kick is fire-and-forget BY CONTRACT (the
 * durable record is the authority, and `npm run purge:process` recovers), so a
 * caller cannot await it. The test waits for the operation to reach a terminal
 * state exactly the way an operator would: by observing the durable record.
 */
async function waitForOperation(operationId, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await purgeOpRow(operationId);
    if (row && (row.status === 'succeeded' || row.status === 'failed')) return row;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return purgeOpRow(operationId);
}

async function run() {
  console.log('\n=== HOMECLOUD FILES: LIFECYCLE V1 PURGE RUNTIME TESTS (real stack, disposable fixtures) ===\n');
  console.log(`Target Supabase local: ${stack.url}`);

  // The lifecycle migration must be applied to the stack under test.
  {
    const { error } = await serviceClient.from('homecloud_purge_operations').select('id').limit(0);
    if (error) {
      console.error(`FATAL: homecloud_purge_operations is not readable: ${error.message}`);
      console.error('Apply supabase/migrations/20261007000000_homecloud_files_lifecycle_v1.sql to the local stack first.');
      process.exit(1);
    }
  }

  const runId = Date.now();
  const cleanup = { authUsers: [], personIds: [], householdIds: [], contentIds: [], operationIds: [], storagePrefixes: [] };

  async function removeStoragePrefix(prefix) {
    for (const bucket of ['homecloud-originals', 'homecloud-previews']) {
      const entries = await listObjects(bucket, prefix);
      for (const name of entries) {
        await serviceClient.storage.from(bucket).remove([`${prefix}/${name}`]).catch(() => {});
      }
    }
  }

  try {
    // ── Fixture: HH-A (coordinator) + HH-B (adult), real auth, real members ──
    const adultA = await createAuthUser(runId, 'adultA');
    const adultB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(adultA.userId, adultB.userId);

    const { data: personA, error: personAErr } = await serviceClient.from('people')
      .insert({ display_name: `HCPURGE A ${runId}`, auth_user_id: adultA.userId }).select('*').single();
    if (personAErr) throw personAErr;
    const { data: personB, error: personBErr } = await serviceClient.from('people')
      .insert({ display_name: `HCPURGE B ${runId}`, auth_user_id: adultB.userId }).select('*').single();
    if (personBErr) throw personBErr;
    cleanup.personIds.push(personA.id, personB.id);

    const { data: householdA, error: hhAErr } = await serviceClient.from('households')
      .insert({ name: `HCPURGE A ${runId}`, slug: `hcpurge-a-${runId}`, created_by_person_id: personA.id }).select('*').single();
    if (hhAErr) throw hhAErr;
    const { data: householdB, error: hhBErr } = await serviceClient.from('households')
      .insert({ name: `HCPURGE B ${runId}`, slug: `hcpurge-b-${runId}`, created_by_person_id: personB.id }).select('*').single();
    if (hhBErr) throw hhBErr;
    cleanup.householdIds.push(householdA.id, householdB.id);
    cleanup.storagePrefixes.push(householdA.id, householdB.id);

    const nowIso = new Date().toISOString();
    const { data: memberA, error: memberAErr } = await serviceClient.from('household_members')
      .insert({ household_id: householdA.id, person_id: personA.id, role: 'coordinator', status: 'active', joined_at: nowIso }).select('*').single();
    if (memberAErr) throw memberAErr;
    const { error: memberBErr } = await serviceClient.from('household_members')
      .insert({ household_id: householdB.id, person_id: personB.id, role: 'adult', status: 'active', joined_at: nowIso });
    if (memberBErr) throw memberBErr;

    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', personA.id);
    await serviceClient.from('people').update({ active_household_id: householdB.id }).eq('id', personB.id);

    const reqA = reqFor(adultA);
    const reqB = reqFor(adultB);
    record(true, `R0. disposable fixture created (households ${householdA.id.slice(0, 8)}/${householdB.id.slice(0, 8)})`);

    // ── R1: Trash -> access 404 -> restore -> favorite preserved ─────────────
    console.log('\n--- R1: trash blocks grants, restore keeps the favorite ---');
    const file1 = await makeTrashedFile({ householdId: householdA.id, memberId: memberA.id, displayName: `poliza-${runId}.txt`, withPreview: true });
    cleanup.contentIds.push(file1);
    await serviceClient.from('homecloud_file_favorites')
      .insert({ household_id: householdA.id, person_id: personA.id, content_id: file1 });

    const accessContext = { householdId: householdA.id, capabilities: { 'homecloud.view': true } };
    const beforeTrash = await storageAccess.createHomeCloudContentAccess({ authContext: accessContext, contentId: file1, variant: 'original' });
    record(typeof beforeTrash.signedUrl === 'string' && beforeTrash.signedUrl.length > 0, 'R1.1. BEFORE trash, /access issues a bounded signed URL');

    const trashedDto = await lifecycleService.trashFileContent(reqA, file1);
    record(trashedDto.role === 'file', 'R1.2. trash through the REAL chain answers the File DTO');
    await expectReject(
      () => storageAccess.createHomeCloudContentAccess({ authContext: accessContext, contentId: file1, variant: 'original' }),
      'homecloud_content_not_found',
      'R1.3. AFTER trash, /content/:id/access answers 404 (new grants are blocked)',
    );

    await lifecycleService.restoreFileContent(reqA, file1);
    const { count: favoriteAfterRestore } = await serviceClient.from('homecloud_file_favorites')
      .select('id', { count: 'exact' }).eq('content_id', file1);
    record(favoriteAfterRestore === 1, 'R1.4. restore through the real chain preserves the Favorite');
    await lifecycleService.trashFileContent(reqA, file1);

    // ── R2: PURGE happy path — physical bytes proven gone ────────────────────
    console.log('\n--- R2: confirmed purge removes the physical bytes ---');
    await expectReject(() => lifecycleService.purgeFileContent(reqA, file1, undefined), 'homecloud_purge_confirmation_required', 'R2.1. a confirmation-less purge is refused BEFORE any state change');
    const purgeAnswer = await lifecycleService.purgeFileContent(reqA, file1, true);
    cleanup.operationIds.push(purgeAnswer.operationId);
    record(typeof purgeAnswer.operationId === 'string' && purgeAnswer.status === 'pending', 'R2.2. the endpoint answers ids + status only');
    record(!Object.keys(purgeAnswer).some((key) => /path|bucket|member/i.test(key)), 'R2.3. the answer never carries snapshot internals');

    // The opportunistic kick is fire-and-forget (the durable record is the
    // authority; `npm run purge:process` is the recovery path). Wait for the
    // terminal state the way an operator observes it, then also prove that a
    // fresh worker batch is a harmless no-op when nothing is pending.
    const settledOp = await waitForOperation(purgeAnswer.operationId);
    if (settledOp && settledOp.status !== 'succeeded') {
      console.error(`  (debug) op ${purgeAnswer.operationId} -> ${settledOp.status} code=${settledOp.last_error_code}`);
    }
    const idlePass = await workerService.processPurgeBatch({ workerId: `runtime-idle-${runId}` });
    record(idlePass.claimed === 0, 'R2.4a. a worker pass with nothing pending claims nothing (safe to run anytime)');
    const opRow = settledOp;
    record(opRow && opRow.status === 'succeeded' && opRow.completed_at !== null, 'R2.4. the durable operation is SUCCEEDED');
    const originalsLeft = await listObjects('homecloud-originals', `${householdA.id}/${file1}`);
    const previewsLeft = await listObjects('homecloud-previews', `${householdA.id}/${file1}`);
    record(originalsLeft.length === 0, 'R2.5. PHYSICAL BYTE DELETION PROVEN: the original object is gone from Storage');
    record(previewsLeft.length === 0, 'R2.6. and the preview object is gone too');
    record(await contentRow(file1) === null, 'R2.7. the content row is deleted');
    const { count: favoritesAfterPurge } = await serviceClient.from('homecloud_file_favorites')
      .select('id', { count: 'exact' }).eq('content_id', file1);
    record(favoritesAfterPurge === 0, 'R2.8. the Favorite cascaded away with the row');
    record((await purgeOpRow(purgeAnswer.operationId)) !== null, 'R2.9. the durable operation record SURVIVED the row deletion');

    // ── R3: irreversible — restore and repeated purge are typed refusals ───
    console.log('\n--- R3: the completed purge is irreversible ---');
    await expectReject(() => lifecycleService.restoreFileContent(reqA, file1), 'homecloud_content_not_found', 'R3.1. restore after purge is the same 404 as an unknown id');
    await expectReject(() => lifecycleService.purgeFileContent(reqA, file1, true), 'homecloud_content_not_found', 'R3.2. a repeated purge command on the purged id is refused');
    await expectReject(
      () => storageAccess.createHomeCloudContentAccess({ authContext: accessContext, contentId: file1, variant: 'original' }),
      'homecloud_content_not_found',
      'R3.3. /content/:id/access can never grant the purged content again',
    );

    // ── R4: cross-household authorization ───────────────────────────────────
    console.log('\n--- R4: cross-household isolation through the real chain ---');
    const fileB = await makeTrashedFile({ householdId: householdB.id, memberId: null, displayName: `ajeno-${runId}.txt`, withPreview: false });
    cleanup.contentIds.push(fileB);
    await lifecycleService.trashFileContent(reqB, fileB);
    await expectReject(() => lifecycleService.purgeFileContent(reqA, fileB, true), 'homecloud_content_not_found', 'R4.1. household A cannot purge household B\'s trashed File (404, not 403)');
    const bAnswer = await lifecycleService.purgeFileContent(reqB, fileB, true);
    cleanup.operationIds.push(bAnswer.operationId);
    record((await waitForOperation(bAnswer.operationId)).status === 'succeeded', 'R4.2. household B purges its own File normally');
    record((await listObjects('homecloud-originals', `${householdB.id}/${fileB}`)).length === 0, 'R4.3. and its bytes are gone');

    // ── R5: crash recovery — expired lease reclaimed and finished ───────────
    console.log('\n--- R5: worker crash recovery (restart proof) ---');
    const file5 = await makeTrashedFile({ householdId: householdA.id, memberId: memberA.id, displayName: `crash-${runId}.txt`, withPreview: false });
    cleanup.contentIds.push(file5);
    await lifecycleService.trashFileContent(reqA, file5);
    // The durable record must exist BEFORE the crash: a purge that never
    // started has nothing to recover.
    const { data: started5 } = await serviceClient.rpc('homecloud_start_purge', {
      p_household_id: householdA.id,
      p_content_id: file5,
      p_requested_by_member_id: memberA.id,
    });
    cleanup.operationIds.push(started5[0].id);
    const { data: claimed } = await serviceClient.rpc('homecloud_claim_purge_operations', {
      p_worker_id: `crashed-worker-${runId}`,
      p_batch_size: 10,
      p_lease_seconds: 900,
    });
    record(Array.isArray(claimed) && claimed.some((op) => op.content_id === file5), 'R5.1. the soon-to-crash worker CLAIMED the operation (bytes still present)');
    record((await listObjects('homecloud-originals', `${householdA.id}/${file5}`)).length === 1, 'R5.2. the crash left the bytes physically intact (nothing was processed)');
    // Simulate the crash: the lease lapses.
    const { error: leaseError } = await serviceClient.from('homecloud_purge_operations')
      .update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('content_id', file5);
    if (leaseError) throw leaseError;
    // The recovery pass is the same worker entry point `npm run purge:process` runs.
    const recovery = await workerService.processPurgeBatch({ workerId: `recovery-${runId}` });
    const recoveredOp = recovery.results.find((r) => r.id === claimed.find((op) => op.content_id === file5)?.id);
    record(recoveredOp && recoveredOp.status === 'succeeded', 'R5.3. the RECOVERY pass reclaimed the expired lease and COMPLETED the purge');
    record((await listObjects('homecloud-originals', `${householdA.id}/${file5}`)).length === 0, 'R5.4. the bytes are gone after recovery (a restart finished the work)');
    record(await contentRow(file5) === null, 'R5.5. and the content row too');

    // ── R6: fault injection — corrupted snapshot deletes NOTHING ─────────────
    console.log('\n--- R6: corrupted snapshot is permanent and destroys nothing ---');
    const file6 = await makeTrashedFile({ householdId: householdA.id, memberId: memberA.id, displayName: `fault-${runId}.txt`, withPreview: false });
    const file6Victim = await makeTrashedFile({ householdId: householdA.id, memberId: memberA.id, displayName: `victim-${runId}.txt`, withPreview: false });
    cleanup.contentIds.push(file6, file6Victim);
    await lifecycleService.trashFileContent(reqA, file6);
    await lifecycleService.trashFileContent(reqA, file6Victim);
    const { data: op6rows } = await serviceClient.rpc('homecloud_start_purge', {
      p_household_id: householdA.id,
      p_content_id: file6,
      p_requested_by_member_id: memberA.id,
    });
    cleanup.operationIds.push(op6rows[0].id);
    // Corrupt the durable snapshot: point it at ANOTHER content's bytes.
    const { error: corruptError } = await serviceClient.from('homecloud_purge_operations')
      .update({ original_path: `${householdA.id}/${file6Victim}/original` })
      .eq('id', op6rows[0].id);
    if (corruptError) throw corruptError;
    const faultResult = await workerService.processPurgeBatch({ workerId: `fault-${runId}` });
    const faultOp = faultResult.results.find((r) => r.id === op6rows[0].id);
    record(faultOp && faultOp.status === 'failed' && faultOp.errorCode === 'purge_snapshot_invalid', 'R6.1. the worker PERMANENTLY refused the corrupted snapshot');
    record((await listObjects('homecloud-originals', `${householdA.id}/${file6Victim}`)).length === 1, 'R6.2. the VICTIM\'s bytes were NOT deleted (ownership re-parse held)');
    record((await listObjects('homecloud-originals', `${householdA.id}/${file6}`)).length === 1, 'R6.3. and the corrupted operation\'s own bytes were not touched either');
    const faultOpRow = await purgeOpRow(op6rows[0].id);
    record(faultOpRow.status === 'failed' && faultOpRow.completed_at !== null, 'R6.4. the permanent failure is durably recorded for inspection');

    // ── R7: concurrent purge commands produce exactly ONE operation ──────────
    console.log('\n--- R7: concurrent purge commands on the real database ---');
    const file7 = await makeTrashedFile({ householdId: householdA.id, memberId: memberA.id, displayName: `race-${runId}.txt`, withPreview: false });
    cleanup.contentIds.push(file7);
    await lifecycleService.trashFileContent(reqA, file7);
    const race = await Promise.allSettled([
      serviceClient.rpc('homecloud_start_purge', { p_household_id: householdA.id, p_content_id: file7, p_requested_by_member_id: memberA.id }),
      serviceClient.rpc('homecloud_start_purge', { p_household_id: householdA.id, p_content_id: file7, p_requested_by_member_id: memberA.id }),
    ]);
    const fulfilled = race.filter((r) => r.status === 'fulfilled' && Array.isArray(r.value?.data) && r.value.data.length > 0);
    const refused = race.filter((r) => r.status === 'rejected' || String(r.value?.error?.message ?? '').includes('homecloud_content_purging'));
    record(fulfilled.length === 1, `R7.1. exactly ONE concurrent start_purge won (${fulfilled.length} succeeded)`);
    record(refused.length === 1, `R7.2. the other was refused with homecloud_content_purging (${refused.length})`);
    if (fulfilled.length === 1) cleanup.operationIds.push(fulfilled[0].value.data[0].id);
    const { count: opsFor7 } = await serviceClient.from('homecloud_purge_operations')
      .select('id', { count: 'exact' }).eq('content_id', file7);
    record(opsFor7 === 1, 'R7.3. exactly ONE durable operation exists for the raced content');
    await workerService.processPurgeBatch({ workerId: `race-${runId}` });
    record((await contentRow(file7)) === null, 'R7.4. the raced purge still completed normally');

    // ── R8: the trash listing reflects the lifecycle through the real chain ──
    console.log('\n--- R8: the Papelera listing through the real chain ---');
    const file8a = await makeTrashedFile({ householdId: householdA.id, memberId: memberA.id, displayName: `papelera-a-${runId}.txt`, withPreview: false });
    const file8b = await makeTrashedFile({ householdId: householdA.id, memberId: memberA.id, displayName: `papelera-b-${runId}.txt`, withPreview: false });
    cleanup.contentIds.push(file8a, file8b);
    await lifecycleService.trashFileContent(reqA, file8a);
    await lifecycleService.trashFileContent(reqA, file8b);
    const trash = await lifecycleService.listTrashedFiles(reqA, {});
    record(trash.files.some((f) => f.id === file8a) && trash.files.some((f) => f.id === file8b), 'R8.1. both trashed Files are listed');
    record(trash.files.every((f) => f.trashedAt !== null), 'R8.2. each row carries its trash timestamp');
    const trashForB = await lifecycleService.listTrashedFiles(reqB, {});
    record(!trashForB.files.some((f) => f.id === file8a), 'R8.3. household B\'s Papelera never shows household A\'s Files');
    const purgingInTrash = trash.files.some((f) => f.id === file7);
    record(purgingInTrash === false, 'R8.4. purging/purged rows are absent from the Papelera');

    console.log(`\nPURGE_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'PURGE_RUNTIME_TESTS=PASS' : 'PURGE_RUNTIME_TESTS=FAIL');
    return failCount === 0;
  } finally {
    // ONLY this run's fixtures are removed: its households (cascade), its
    // leftover bytes, its durable operation records, its people and auth
    // users. Nothing else is touched.
    try {
      for (const prefix of cleanup.storagePrefixes) await removeStoragePrefix(prefix);
      if (cleanup.operationIds.length) {
        await serviceClient.from('homecloud_purge_operations').delete().in('id', cleanup.operationIds);
      }
      await serviceClient.from('homecloud_purge_operations').delete().in('household_id', cleanup.householdIds);
      for (const householdId of cleanup.householdIds) {
        await serviceClient.from('households').delete().eq('id', householdId);
      }
      for (const personId of cleanup.personIds) {
        await serviceClient.from('people').delete().eq('id', personId);
      }
      for (const userId of cleanup.authUsers) {
        await serviceClient.auth.admin.deleteUser(userId).catch(() => {});
      }
      console.log('Cleaned up only this run\'s disposable fixtures.');
    } catch (error) {
      console.error(`CLEANUP_WARNING: ${error?.message ?? error}`);
    }
  }
}

run().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((error) => {
  console.error('PURGE_RUNTIME_TESTS=ERROR');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
