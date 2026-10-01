#!/usr/bin/env node
'use strict';

/**
 * HomeCloud STAGE 4A.2 — Written Memory runtime intake tests.
 *
 * Target: local Supabase only. Exercises the REAL backend services with REAL
 * Supabase Auth JWTs:
 *   - homecloudIntakeService (register/upload/verify/finalize)
 *   - homecloudReadService (getContentById)
 *   - homecloudStorageAccess (createHomeCloudContentAccess)
 *
 * Proves:
 *   - BINARY register/upload/verify/finalize pipeline is UNCHANGED
 *   - WRITTEN register -> staging -> finalize with uploaded_at NULL forever
 *   - Written idempotency (intakeRequestId), initialAlbumId, replay conflict
 *   - Written + binary operations are typed domain errors (never 500)
 *   - invalid album is denied up-front and leaves no staging row
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
const { createHomeCloudContentAccess } = require('../backend/src/services/homecloudStorageAccess');
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

async function expectReject(promiseFactory, expectedCode, message) {
  try {
    await promiseFactory();
  } catch (e) {
    const ok = e && e.code === expectedCode;
    record(ok, `${message} (${(e && e.code) || 'no_code'}${ok ? '' : `, expected ${expectedCode}`})`);
    return e;
  }
  record(false, `${message} (expected rejection ${expectedCode}, got success)`);
  return null;
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hc4a2-${label}-${runId}@test.local`;
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
    requestId: `req-hc4a2-${suffix}`,
    mutationId: `mut-hc4a2-${suffix}`,
  };
}

async function run() {
  console.log('\n=== HC-4A2 WRITTEN RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const runId = Date.now();
  const cleanup = { authUsers: [], contentIds: [], originalPaths: [], albumIds: [], membershipIds: [], personIds: [], householdIds: [] };

  try {
    const adult = await createAuthUser(runId, 'adult');
    const other = await createAuthUser(runId, 'other');
    cleanup.authUsers.push(adult.userId, other.userId);

    const { data: adultPerson, error: adultPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC4A2 Adult', auth_user_id: adult.userId })
      .select('*')
      .single();
    if (adultPersonErr) throw adultPersonErr;
    const { data: otherPerson, error: otherPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC4A2 Other', auth_user_id: other.userId })
      .select('*')
      .single();
    if (otherPersonErr) throw otherPersonErr;
    cleanup.personIds.push(adultPerson.id, otherPerson.id);

    const { data: householdA, error: hhAErr } = await serviceClient
      .from('households')
      .insert({ name: 'HC4A2 Household A', slug: `hc4a2-a-${runId}`, created_by_person_id: adultPerson.id })
      .select('*')
      .single();
    if (hhAErr) throw hhAErr;
    const { data: householdB, error: hhBErr } = await serviceClient
      .from('households')
      .insert({ name: 'HC4A2 Household B', slug: `hc4a2-b-${runId}`, created_by_person_id: otherPerson.id })
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
    const { data: otherMember, error: otherMemberErr } = await serviceClient
      .from('household_members')
      .insert({ household_id: householdB.id, person_id: otherPerson.id, role: 'adult', status: 'active', joined_at: nowIso })
      .select('*')
      .single();
    if (otherMemberErr) throw otherMemberErr;
    cleanup.membershipIds.push(adultMember.id, otherMember.id);

    const { error: activeAErr } = await serviceClient
      .from('people')
      .update({ active_household_id: householdA.id })
      .eq('id', adultPerson.id);
    if (activeAErr) throw activeAErr;
    const { error: activeBErr } = await serviceClient
      .from('people')
      .update({ active_household_id: householdB.id })
      .eq('id', otherPerson.id);
    if (activeBErr) throw activeBErr;

    const reqAdult = reqFor(adult, 'adult');
    const reqOther = reqFor(other, 'other');

    // ---------------------------------------------------------------
    // 1. BINARY compatibility: register -> upload -> verify -> finalize
    //    (Shared Upload Engine path is UNCHANGED)
    // ---------------------------------------------------------------
    const binFile = await registerHomeCloudContent(reqAdult, {
      role: 'file',
      displayName: 'bin-runtime.txt',
      mimeType: 'text/plain',
      sizeBytes: 5,
      extension: 'txt',
      intakeRequestId: `hc4a2-bin-file-${runId}`,
    });
    cleanup.contentIds.push(binFile.id);
    record(binFile.role === 'file' && binFile.mimeType === 'text/plain', 'binary file register unchanged (DTO fields present)');

    const uploadAuth = await authorizeHomeCloudOriginalUpload(reqAdult, binFile.id);
    record(uploadAuth.path === getHomeCloudOriginalPath(householdA.id, binFile.id), 'binary upload authorization scoped to canonical path');
    const put = await fetch(uploadAuth.signedUploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain', 'x-upsert': 'false' },
      body: Buffer.from('hello'),
    });
    record(put.ok, `signed upload URL accepts intended original (${put.status})`);

    const binVerified = await verifyHomeCloudOriginal(reqAdult, binFile.id);
    record(binVerified.verified === true, 'binary verify after upload still works');

    const binFinal = await finalizeHomeCloudContent(reqAdult, binFile.id);
    const { data: binRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', binFile.id).single();
    record(binRow.lifecycle === 'active' && binRow.uploaded_at !== null, 'binary finalize still sets uploaded_at');
    record(binFinal.uploadedAt !== null, 'binary finalize DTO exposes uploadedAt');
    const binReplay = await finalizeHomeCloudContent(reqAdult, binFile.id);
    record(binReplay.id === binFile.id, 'binary finalize replay idempotent');

    // Binary memory with exact date derives UTC components (new DB contract).
    const binMem = await registerHomeCloudContent(reqAdult, {
      role: 'memory',
      displayName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 10,
      capturedAt: '2020-04-15T10:30:00Z',
      capturePrecision: 'exact',
      intakeRequestId: `hc4a2-bin-mem-${runId}`,
    });
    cleanup.contentIds.push(binMem.id);
    const { data: binMemRow } = await serviceClient.from('homecloud_contents').select('captured_year, captured_month, capture_precision').eq('id', binMem.id).single();
    record(binMemRow.captured_year === 2020 && binMemRow.captured_month === 4 && binMemRow.capture_precision === 'exact',
      'binary memory exact date persists coherent UTC captured_year/captured_month');

    // ---------------------------------------------------------------
    // 2. WRITTEN register: staging row with NO binary metadata
    // ---------------------------------------------------------------
    const writtenText = 'Recuerdo escrito del verano en la playa con la familia.';
    const written = await registerHomeCloudContent(reqAdult, {
      role: 'memory',
      writtenText,
      intakeRequestId: `hc4a2-written-${runId}`,
    });
    cleanup.contentIds.push(written.id);
    record(written.role === 'memory' && written.writtenText === writtenText, 'written register returns memory DTO with writtenText');
    record(written.displayName === null && written.mimeType === null && written.sizeBytes === null, 'written register DTO binary fields are null');
    record(written.uploadedAt === null && written.hasPreview === false, 'written register DTO has no custody/preview');
    record(written.capturePrecision === 'unknown' && written.capturedAt === null, 'written register defaults semantic date to unknown');

    const { data: writtenRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', written.id).single();
    record(writtenRow.lifecycle === 'staging', 'written register creates lifecycle=staging');
    record(writtenRow.uploaded_at === null, 'written register keeps uploaded_at NULL');
    record(
      writtenRow.display_name === null && writtenRow.mime_type === null
      && writtenRow.size_bytes === null && writtenRow.original_storage_path === null,
      'written register stores NO binary metadata');
    record(
      writtenRow.caption === null && writtenRow.folder_id === null
      && writtenRow.document_date === null && writtenRow.note === null,
      'written register stores NO caption/folder/document metadata');
    record(writtenRow.hidden_from_resurfacing === false, 'written register defaults hidden_from_resurfacing=false');

    // ---------------------------------------------------------------
    // 3. Written idempotency (intakeRequestId replay)
    // ---------------------------------------------------------------
    const writtenReplay = await registerHomeCloudContent(reqAdult, {
      role: 'memory',
      writtenText: 'Texto distinto en replay',
      intakeRequestId: `hc4a2-written-${runId}`,
    });
    record(writtenReplay.id === written.id && writtenReplay.writtenText === writtenText,
      'written register replay with same intakeRequestId is idempotent (original text preserved)');

    // ---------------------------------------------------------------
    // 4. Written with initialAlbumId creates the N:M membership
    // ---------------------------------------------------------------
    const { data: album, error: albumErr } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdA.id, name: `Álbum 4A2 ${runId}`, created_by_member_id: adultMember.id })
      .select('*')
      .single();
    if (albumErr) throw albumErr;
    cleanup.albumIds.push(album.id);

    const writtenAlbum = await registerHomeCloudContent(reqAdult, {
      role: 'memory',
      writtenText: 'Recuerdo con álbum inicial.',
      initialAlbumId: album.id,
      intakeRequestId: `hc4a2-written-album-${runId}`,
    });
    cleanup.contentIds.push(writtenAlbum.id);
    const { data: membership } = await serviceClient
      .from('homecloud_album_items')
      .select('album_id, content_id')
      .eq('content_id', writtenAlbum.id)
      .maybeSingle();
    record(membership && membership.album_id === album.id, 'written register with initialAlbumId creates album membership');

    // Replay with the SAME album is consistent (no conflict, no mutation).
    const sameAlbumReplay = await registerHomeCloudContent(reqAdult, {
      role: 'memory',
      writtenText: 'Texto distinto en replay',
      initialAlbumId: album.id,
      intakeRequestId: `hc4a2-written-album-${runId}`,
    });
    record(sameAlbumReplay.id === writtenAlbum.id, 'written replay with same album intent is consistent');

    // Replay with a DIFFERENT album is an explicit conflict (never silent mutation).
    const { data: otherAlbum, error: otherAlbumErr } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdA.id, name: `Otro Álbum ${runId}` })
      .select('*')
      .single();
    if (otherAlbumErr) throw otherAlbumErr;
    cleanup.albumIds.push(otherAlbum.id);
    await expectReject(
      () => registerHomeCloudContent(reqAdult, {
        role: 'memory',
        writtenText: 'x',
        initialAlbumId: otherAlbum.id,
        intakeRequestId: `hc4a2-written-album-${runId}`,
      }),
      'homecloud_intake_album_conflict',
      'written replay with different album intent conflicts',
    );

    // ---------------------------------------------------------------
    // 5. Invalid album is denied up-front and leaves NO staging row
    // ---------------------------------------------------------------
    const missingAlbumId = randomUUID();
    await expectReject(
      () => registerHomeCloudContent(reqAdult, {
        role: 'memory',
        writtenText: 'Recuerdo con álbum inexistente.',
        initialAlbumId: missingAlbumId,
        intakeRequestId: `hc4a2-written-badalbum-${runId}`,
      }),
      'homecloud_album_not_found',
      'written register with nonexistent album denied up-front',
    );
    const { data: orphanRow } = await serviceClient
      .from('homecloud_contents')
      .select('id')
      .eq('intake_request_id', `hc4a2-written-badalbum-${runId}`)
      .maybeSingle();
    record(orphanRow === null, 'invalid album leaves NO staging row (consistency preserved)');

    // Cross-household album is denied too (album from Household B, actor in A).
    const { data: albumB, error: albumBErr } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdB.id, name: `Álbum B ${runId}` })
      .select('*')
      .single();
    if (albumBErr) throw albumBErr;
    cleanup.albumIds.push(albumB.id);
    await expectReject(
      () => registerHomeCloudContent(reqAdult, {
        role: 'memory',
        writtenText: 'Recuerdo con álbum ajeno.',
        initialAlbumId: albumB.id,
        intakeRequestId: `hc4a2-written-crossalbum-${runId}`,
      }),
      'homecloud_album_cross_household',
      'written register with cross-household album denied',
    );
    const { data: crossOrphanRow } = await serviceClient
      .from('homecloud_contents')
      .select('id')
      .eq('intake_request_id', `hc4a2-written-crossalbum-${runId}`)
      .maybeSingle();
    record(crossOrphanRow === null, 'cross-household album leaves NO staging row');

    // ---------------------------------------------------------------
    // 6. Typed rejections for degenerate written registers
    // ---------------------------------------------------------------
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'file', writtenText: 'archivo escrito' }),
      'homecloud_written_file_forbidden',
      'register file + writtenText rejected',
    );
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', writtenText: 'x', mimeType: 'text/plain' }),
      'homecloud_written_binary_field_forbidden',
      'register written + mimeType rejected',
    );
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', writtenText: 'x', sizeBytes: 3 }),
      'homecloud_written_binary_field_forbidden',
      'register written + sizeBytes rejected',
    );
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', writtenText: 'x', displayName: 'nota.txt' }),
      'homecloud_written_binary_field_forbidden',
      'register written + displayName rejected',
    );
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', writtenText: 'x', caption: 'resumen' }),
      'homecloud_written_caption_forbidden',
      'register written + caption rejected',
    );

    // ---------------------------------------------------------------
    // 7. upload/verify on Written: typed domain semantics
    // ---------------------------------------------------------------
    await expectReject(
      () => authorizeHomeCloudOriginalUpload(reqAdult, written.id),
      'homecloud_content_has_no_binary',
      'upload authorization on Written denied with typed 409 domain error',
    );
    const writtenVerify = await verifyHomeCloudOriginal(reqAdult, written.id);
    record(writtenVerify.verified === true && writtenVerify.skipped === 'no_binary',
      'verify on Written returns idempotent skipped=no_binary');

    // ---------------------------------------------------------------
    // 8. finalize Written: staging -> active, uploaded_at REMAINS NULL
    // ---------------------------------------------------------------
    const writtenFinal = await finalizeHomeCloudContent(reqAdult, written.id);
    record(writtenFinal.role === 'memory' && writtenFinal.lifecycle === undefined, 'finalize Written returns canonical content DTO');
    const { data: writtenFinalRow } = await serviceClient.from('homecloud_contents').select('*').eq('id', written.id).single();
    record(writtenFinalRow.lifecycle === 'active', 'finalize Written sets lifecycle=active');
    record(writtenFinalRow.uploaded_at === null, 'finalized Written keeps uploaded_at NULL (no binary custody ever)');

    // Idempotent replay: still active, uploaded_at still NULL.
    const writtenFinalReplay = await finalizeHomeCloudContent(reqAdult, written.id);
    const { data: writtenReplayRow } = await serviceClient.from('homecloud_contents').select('lifecycle, uploaded_at').eq('id', written.id).single();
    record(writtenFinalReplay.id === written.id && writtenReplayRow.lifecycle === 'active' && writtenReplayRow.uploaded_at === null,
      'finalize Written replay is idempotent and preserves uploaded_at NULL');

    // verify after finalize stays the skipped response (state-independent).
    const writtenVerifyAfter = await verifyHomeCloudOriginal(reqAdult, written.id);
    record(writtenVerifyAfter.verified === true && writtenVerifyAfter.skipped === 'no_binary',
      'verify on finalized Written stays skipped=no_binary');

    // Written active is visible through the normal read (safe DTO).
    const visibleWritten = await getContentById(reqAdult, written.id);
    record(visibleWritten.writtenText === writtenText && visibleWritten.mimeType === null && visibleWritten.uploadedAt === null,
      'active Written Memory visible through normal read with safe DTO');

    // ---------------------------------------------------------------
    // 9. access: original denied typed, preview unavailable (never 500)
    // ---------------------------------------------------------------
    const accessContext = { householdId: householdA.id, capabilities: { 'homecloud.view': true } };
    await expectReject(
      () => createHomeCloudContentAccess({ authContext: accessContext, contentId: written.id, variant: 'original' }),
      'homecloud_content_has_no_binary',
      'access original on Written returns typed 409 domain error (not 500)',
    );
    const previewAccess = await createHomeCloudContentAccess({ authContext: accessContext, contentId: written.id, variant: 'preview' });
    record(previewAccess.code === 'preview_unavailable', 'access preview on Written returns canonical preview_unavailable');

    // Binary access unchanged: original access works for active binary content.
    const binAccess = await createHomeCloudContentAccess({ authContext: accessContext, contentId: binFile.id, variant: 'original' });
    record(typeof binAccess.signedUrl === 'string', 'access original on active binary content still issues signed URL');

    // ---------------------------------------------------------------
    // 10. Cross-household denial for Written
    // ---------------------------------------------------------------
    await expectReject(
      () => finalizeHomeCloudContent(reqOther, written.id),
      'homecloud_content_not_found',
      'cross-Household finalize on Written denied',
    );
    await expectReject(
      () => getContentById(reqOther, written.id),
      'homecloud_content_not_found',
      'cross-Household read on Written denied',
    );
    // intakeRequestId is scoped per-Household: household B may legally use the
    // same identifier for its own row (no cross-household collision).
    const otherHouseholdWritten = await registerHomeCloudContent(reqOther, {
      role: 'memory',
      writtenText: 'Escrito desde otro hogar.',
      intakeRequestId: `hc4a2-written-${runId}`,
    });
    cleanup.contentIds.push(otherHouseholdWritten.id);
    record(otherHouseholdWritten.id !== written.id, 'same intakeRequestId in another household creates its own row');

    // ---------------------------------------------------------------
    // 11. Written with semantic partial date + hidden flag
    // ---------------------------------------------------------------
    const writtenDated = await registerHomeCloudContent(reqAdult, {
      role: 'memory',
      writtenText: 'Recuerdo de 1995.',
      capturePrecision: 'year',
      capturedYear: 1995,
      hiddenFromResurfacing: true,
      intakeRequestId: `hc4a2-written-dated-${runId}`,
    });
    cleanup.contentIds.push(writtenDated.id);
    const { data: datedRow } = await serviceClient.from('homecloud_contents')
      .select('capture_precision, captured_year, captured_month, captured_at, hidden_from_resurfacing')
      .eq('id', writtenDated.id)
      .single();
    record(datedRow.capture_precision === 'year' && datedRow.captured_year === 1995
      && datedRow.captured_month === null && datedRow.captured_at === null,
      'written register with year precision persists partial date honestly (no fake timestamp)');
    record(datedRow.hidden_from_resurfacing === true, 'written register persists hidden_from_resurfacing=true');
    const datedFinal = await finalizeHomeCloudContent(reqAdult, writtenDated.id);
    record(datedFinal.id === writtenDated.id, 'finalize on dated Written succeeds');
  } finally {
    if (cleanup.contentIds.length > 0) {
      await serviceClient.from('homecloud_contents').delete().in('id', cleanup.contentIds);
    }
    if (cleanup.membershipIds.length > 0) {
      await serviceClient.from('household_members').delete().in('id', cleanup.membershipIds);
    }
    if (cleanup.personIds.length > 0) {
      // people.active_household_id has no ON DELETE action: clear it BEFORE
      // deleting households or the household delete fails (silently, since
      // supabase-js returns the error instead of throwing).
      await serviceClient.from('people').update({ active_household_id: null }).in('id', cleanup.personIds);
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

  console.log(`\nHC4A2_WRITTEN_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC4A2_WRITTEN_RUNTIME_TESTS=FAIL');
  } else {
    console.log('HC4A2_WRITTEN_RUNTIME_TESTS=PASS');
  }
}

run().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
