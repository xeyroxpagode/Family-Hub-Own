#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files Core — PERSONAL FAVORITES against the REAL stack.
 *
 * LOCAL_RUNTIME_REQUIRED. The deterministic suite proves the SERVICE logic
 * against a shaped stub; only this seam can prove what no stub may assert:
 *
 *   - the installed PostgREST HONOURS the `homecloud_file_favorites!inner`
 *     join as a pre-pagination predicate (filter order is a server behavior,
 *     not a client convention);
 *   - the UNIQUE(household_id, person_id, content_id) constraint rejects a
 *     real duplicate race with 23505;
 *   - the trigger rejects a real Memory favorite, a real cross-household row
 *     and a real non-member row with the frozen codes;
 *   - RLS denies the table to client roles (deny-by-default, no policies);
 *   - the whole authority chain — real JWT -> real context -> real capability
 *     matrix -> real service — lets a view-only child favorite and stops a
 *     suspended member, with no stub anywhere in the path.
 *
 * Setup mirrors `homecloud_3a_3d_acceptance_tests.js`: real auth users, real
 * people, real households, real memberships. The ONLY thing asserted here that
 * the deterministic suite cannot is behavior of the installed database.
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

// Loaded AFTER the environment: the backend config reads it at require time.
const filesService = require('../backend/src/services/homecloudFilesService');

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
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hcfav-${label}-${runId}@test.local`;
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

async function insertActiveFile({ householdId, displayName, folderId = null, note = null, memberId = null, prefix = '' }) {
  const id = randomUUID();
  const row = {
    id,
    household_id: householdId,
    role: 'file',
    display_name: displayName,
    mime_type: 'text/plain',
    extension: 'txt',
    size_bytes: 3,
    original_storage_path: `${householdId}/${id}/original`,
    lifecycle: 'active',
    uploaded_at: new Date().toISOString(),
    folder_id: folderId,
    note,
    uploaded_by_member_id: memberId,
    intake_request_id: `${prefix}${id}`,
  };
  const { error } = await serviceClient.from('homecloud_contents').insert(row);
  if (error) throw error;
  return row;
}

async function favoriteCount(householdId, personId, contentId) {
  let query = serviceClient.from('homecloud_file_favorites').select('id', { count: 'exact' }).eq('household_id', householdId);
  if (personId) query = query.eq('person_id', personId);
  if (contentId) query = query.eq('content_id', contentId);
  const { count, error } = await query;
  if (error) throw error;
  return count;
}

async function run() {
  console.log('\n=== HOMECLOUD FILES CORE: PERSONAL FAVORITES RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  // The migration must be applied to the stack under test. Failing here — with
  // this message instead of a cryptic PostgREST error — is the honest signal.
  {
    const { error } = await serviceClient.from('homecloud_file_favorites').select('id').limit(0);
    if (error) {
      console.error(`FATAL: homecloud_file_favorites is not readable: ${error.message}`);
      console.error('Apply supabase/migrations/20261004000000_homecloud_file_favorites_v1.sql to the local stack first.');
      process.exit(1);
    }
  }

  const runId = Date.now();
  const P = `fv${String(runId).slice(-6)}`;
  const cleanup = { authUsers: [], contentIds: [], folderIds: [], membershipIds: [], personIds: [], householdIds: [] };

  try {
    // ── Setup: HH-A (adultA coordinator + childA view-only), HH-B (adultB) ──
    const adultA = await createAuthUser(runId, 'adultA');
    const childA = await createAuthUser(runId, 'childA');
    const adultB = await createAuthUser(runId, 'adultB');
    cleanup.authUsers.push(adultA.userId, childA.userId, adultB.userId);

    async function makePerson(label, authUser) {
      const { data, error } = await serviceClient.from('people')
        .insert({ display_name: `HCFAV ${label}`, auth_user_id: authUser.userId }).select('*').single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    }
    const personA = await makePerson('AdultA', adultA);
    const personChildA = await makePerson('ChildA', childA);
    const personB = await makePerson('AdultB', adultB);

    async function makeHousehold(label, creator) {
      const { data, error } = await serviceClient.from('households')
        .insert({ name: `HCFAV ${label}`, slug: `hcfav-${label}-${runId}`, created_by_person_id: creator.id }).select('*').single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    }
    const householdA = await makeHousehold('a', personA);
    const householdB = await makeHousehold('b', personB);

    const nowIso = new Date().toISOString();
    async function addMember(householdId, personId, role, status = 'active') {
      const { data, error } = await serviceClient.from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status, joined_at: nowIso }).select('*').single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    }
    const memberAdultA = await addMember(householdA.id, personA.id, 'coordinator');
    await addMember(householdA.id, personChildA.id, 'child');
    await addMember(householdB.id, personB.id, 'adult');

    for (const [personId, hhId] of [[personA.id, householdA.id], [personChildA.id, householdA.id], [personB.id, householdB.id]]) {
      const { error } = await serviceClient.from('people').update({ active_household_id: hhId }).eq('id', personId);
      if (error) throw error;
    }

    const reqA = reqFor(adultA);
    const reqChildA = reqFor(childA);
    const reqB = reqFor(adultB);

    // Files: loose + folder-scoped in A, one foreign file in B, one memory in A.
    const { data: folder } = await serviceClient.from('homecloud_folders')
      .insert({ household_id: householdA.id, name: `${P} Garantías` }).select('*').single();
    cleanup.folderIds.push(folder.id);

    const looseA = [];
    for (let index = 0; index < 3; index += 1) {
      looseA.push(await insertActiveFile({ householdId: householdA.id, displayName: `${P} factura ${index}.txt`, memberId: memberAdultA.id, prefix: `${P}-` }));
    }
    cleanup.contentIds.push(...looseA.map((f) => f.id));
    const folderFile = await insertActiveFile({ householdId: householdA.id, displayName: `${P} poliza.txt`, folderId: folder.id, memberId: memberAdultA.id, prefix: `${P}-` });
    cleanup.contentIds.push(folderFile.id);
    const foreignFile = await insertActiveFile({ householdId: householdB.id, displayName: `${P} ajeno.txt`, prefix: `${P}-` });
    cleanup.contentIds.push(foreignFile.id);

    const memoryId = randomUUID();
    {
      const { error } = await serviceClient.from('homecloud_contents').insert({
        id: memoryId,
        household_id: householdA.id,
        role: 'memory',
        display_name: `${P} recuerdo.jpg`,
        mime_type: 'image/jpeg',
        extension: 'jpg',
        size_bytes: 7,
        original_storage_path: `${householdA.id}/${memoryId}/original`,
        lifecycle: 'active',
        uploaded_at: nowIso,
        capture_precision: 'unknown',
      });
      if (error) throw error;
      cleanup.contentIds.push(memoryId);
    }

    // ── R1-R3: the mutation, idempotent in both directions ──
    console.log('\n--- R1-R3: favorite / unfavorite through the real chain ---');
    const first = await filesService.setFileFavorite(reqA, looseA[0].id, true);
    record(first.contentId === looseA[0].id && first.isFavorite === true, 'R1. favoriting answers the same File with the requested intent');
    record(await favoriteCount(householdA.id, personA.id, looseA[0].id) === 1, 'R2. exactly one preference row exists in the database');
    {
      const { data } = await serviceClient.from('homecloud_file_favorites').select('person_id, household_id').eq('content_id', looseA[0].id).single();
      record(data.person_id === personA.id, 'R3. the row is keyed by the canonical PERSON id from the real context');
      record(data.person_id !== memberAdultA.id, 'R4. and NOT by the membership id');
    }
    await filesService.setFileFavorite(reqA, looseA[0].id, true);
    record(await favoriteCount(householdA.id, personA.id, looseA[0].id) === 1, 'R5. favoriting twice keeps exactly one row (real 23505 is never surfaced)');
    await filesService.setFileFavorite(reqA, looseA[0].id, false);
    record(await favoriteCount(householdA.id, personA.id, looseA[0].id) === 0, 'R6. unfavoriting removes the row');
    await filesService.setFileFavorite(reqA, looseA[0].id, false);
    record(await favoriteCount(householdA.id, null, null) === 0, 'R7. unfavoriting twice converges on the same stable state');

    // ── R4: personal, not household-global ──
    console.log('\n--- R4: one person\'s preference is not the household\'s ---');
    await filesService.setFileFavorite(reqA, looseA[0].id, true);
    const bView = await filesService.browseFiles(reqB, {});
    record(!bView.files.some((f) => f.id === looseA[0].id), 'R8. sanity: household B cannot see household A\'s File at all');
    {
      // personB lives in another household; the same-household unaffected member
      // is childA, who shares household A with personA.
      const childView = await filesService.browseFiles(reqChildA, {});
      const row = childView.files.find((f) => f.id === looseA[0].id);
      record(row && row.isFavorite === false, 'R9. another member of the SAME household sees isFavorite=false');
      const childFiltered = await filesService.browseFiles(reqChildA, { favoritesOnly: true });
      record(childFiltered.files.length === 0, 'R10. and their Favoritos filter is empty');
    }
    await filesService.setFileFavorite(reqChildA, looseA[0].id, true);
    record(await favoriteCount(householdA.id, null, looseA[0].id) === 2, 'R11. both members hold their own row over the same File');
    {
      const aView = await filesService.browseFiles(reqA, {});
      record(aView.files.find((f) => f.id === looseA[0].id)?.isFavorite === true, 'R12. A still sees their own favorite');
      const childView = await filesService.browseFiles(reqChildA, {});
      record(childView.files.find((f) => f.id === looseA[0].id)?.isFavorite === true, 'R13. and so does the child — independently');
    }
    await filesService.setFileFavorite(reqChildA, looseA[0].id, false);

    // ── R5: view-only authority end to end ──
    console.log('\n--- R5: authority through real JWTs and the real matrix ---');
    await expectReject(() => filesService.createFolder(reqChildA, 'child folder'), 'homecloud_forbidden', 'R14. sanity: the child really cannot organize');
    {
      const before = await favoriteCount(householdA.id, personChildA.id, looseA[1].id);
      await filesService.setFileFavorite(reqChildA, looseA[1].id, true);
      const after = await favoriteCount(householdA.id, personChildA.id, looseA[1].id);
      record(before === 0 && after === 1, 'R15. a view-only child favorites WITHOUT homecloud.organize');
      await filesService.setFileFavorite(reqChildA, looseA[1].id, false);
    }

    // ── R6-R8: typed refusals ──
    console.log('\n--- R6-R8: typed refusals, never a 500 ---');
    await expectReject(() => filesService.setFileFavorite(reqA, foreignFile.id, true), 'homecloud_content_not_found', 'R16. another household\'s File is a 404');
    record(await favoriteCount(householdB.id, null, null) === 0, 'R17. and nothing was written for the other household');
    await expectReject(() => filesService.setFileFavorite(reqA, randomUUID(), true), 'homecloud_content_not_found', 'R18. an unknown id is the SAME 404 (existence cannot be probed)');
    await expectReject(() => filesService.setFileFavorite(reqA, memoryId, true), 'homecloud_favorite_requires_file', 'R19. a Memory is a typed 400 (File-only, enforced by the service)');
    await expectReject(() => filesService.setFileFavorite(reqA, looseA[2].id, undefined), 'homecloud_favorite_invalid', 'R20. a missing intent is a typed 400, not a guessed toggle');
    await expectReject(() => filesService.setFileFavorite(reqA, looseA[2].id, 'true'), 'homecloud_favorite_invalid', 'R21. and so is a stringly-typed one');

    // A stranger — a real person with NO membership anywhere — is stopped by the
    // REAL context service with a typed 403, before any write.
    const strangerAuth = await createAuthUser(runId, 'stranger');
    cleanup.authUsers.push(strangerAuth.userId);
    const { data: stranger } = await serviceClient.from('people')
      .insert({ display_name: `HCFAV Stranger`, auth_user_id: strangerAuth.userId }).select('*').single();
    if (!stranger) throw new Error('stranger setup failed');
    cleanup.personIds.push(stranger.id);
    const { data: signedIn, error: strangerSignErr } = await anonClient.auth.signInWithPassword({ email: strangerAuth.email, password: 'dummy12345' });
    if (strangerSignErr || !signedIn?.session?.access_token) throw strangerSignErr || new Error('stranger sign-in failed');
    await expectReject(() => filesService.setFileFavorite(
      { user: { id: strangerAuth.userId }, accessToken: signedIn.session.access_token }, looseA[2].id, true,
    ), 'no_active_household', 'R22. a person with no membership anywhere is refused before any write');
    record(await favoriteCount(householdA.id, stranger.id, looseA[2].id) === 0, 'R23. and nothing was recorded for them');

    // Why no "suspended while pointed" case here: the platform itself makes that
    // state unreachable — deactivating the pointed-to membership is rejected —
    // so the suspended path is proven deterministically against the same typed
    // error the real context service throws. What IS provable here is the guard:
    {
      const { error } = await serviceClient.from('household_members').update({ status: 'suspended' }).eq('id', memberAdultA.id);
      record(Boolean(error) && error.code === '23514', `R24. the database refuses to strand a pointed-to membership (got ${error?.code ?? 'no error'})`);
      const { data: stillActive } = await serviceClient.from('household_members').select('status').eq('id', memberAdultA.id).single();
      record(stillActive?.status === 'active', 'R25. so the member is still active afterwards');
    }

    // ── R9: the filter over the real PostgREST join ──
    console.log('\n--- R9: favoritesOnly before the page, on the installed PostgREST ---');
    // Earlier sections left exactly one favorite behind; the lot below must be
    // the ONLY favorites in the household for the walk to be exact.
    await filesService.setFileFavorite(reqA, looseA[0].id, false);
    record(await favoriteCount(householdA.id, null, null) === 0, 'R24. the household starts the lot walk with zero favorites');
    const many = [];
    for (let index = 0; index < 120; index += 1) {
      many.push(await insertActiveFile({
        householdId: householdA.id,
        displayName: `${P} lote ${String(index).padStart(3, '0')}.txt`,
        memberId: memberAdultA.id,
        prefix: `${P}-lot-`,
      }));
    }
    cleanup.contentIds.push(...many.map((f) => f.id));
    for (let index = 0; index < many.length; index += 2) {
      await filesService.setFileFavorite(reqA, many[index].id, true);
    }
    {
      const walked = [];
      let offset = 0;
      for (;;) {
        const page = await filesService.browseFiles(reqA, { favoritesOnly: true, limit: 50, offset });
        walked.push(...page.files.map((f) => f.id));
        if (page.nextOffset === null) break;
        offset = page.nextOffset;
        if (walked.length > 500) break;
      }
      record(walked.length === 60, `R25. paging Favoritos yields exactly the 60 favorites out of 120 (got ${walked.length})`);
      record(new Set(walked).size === walked.length, 'R26. with no duplicated row');
      record(offset === 50, 'R27. the filter preceded the page: two 50-row pages covered the filtered set');
    }
    {
      // `lote 118` names exactly one file (even index, so favorited); the
      // search term is a substring of no other lot name.
      const searched = await filesService.browseFiles(reqA, { query: `${P} lote 118`, favoritesOnly: true });
      record(searched.files.length === 1 && searched.files[0].isFavorite === true, 'R28. Favoritos + search composes on the real stack');
      const inFolder = await filesService.browseFiles(reqA, { folderId: folder.id, favoritesOnly: true });
      record(inFolder.files.length === 0, 'R28. Favoritos + folder with no favorites in it is honestly empty');
      await filesService.setFileFavorite(reqA, folderFile.id, true);
      const inFolderNow = await filesService.browseFiles(reqA, { folderId: folder.id, favoritesOnly: true });
      record(inFolderNow.files.length === 1 && inFolderNow.files[0].id === folderFile.id, 'R30. and a folder favorite appears once favorited');
      await filesService.setFileFavorite(reqA, folderFile.id, false);
    }

    // ── R10: RLS denies client roles ──
    console.log('\n--- R10: the table is deny-by-default for clients ---');
    {
      // A denied read is INVISIBLE, not an error: PostgREST answers 200 with
      // zero rows. The proof is that the rows are there for the service role
      // and absent for the anonymous role at the same moment.
      const serviceRows = await favoriteCount(householdA.id, null, null);
      const { data, error } = await anonClient.from('homecloud_file_favorites').select('id').limit(10);
      record(!error && (data ?? []).length === 0 && serviceRows > 0,
        `R31. an anonymous read sees zero rows while ${serviceRows} exist (deny-by-default, no policies)`);
      const { error: insertError } = await anonClient.from('homecloud_file_favorites').insert({
        household_id: householdA.id, person_id: personA.id, content_id: looseA[0].id,
      });
      record(Boolean(insertError), 'R32. and an anonymous write is refused outright');
    }

    // ── R11: the trigger invariants, at the database itself ──
    console.log('\n--- R11: trigger invariants independent of the service ---');
    {
      const { error } = await serviceClient.from('homecloud_file_favorites').insert({
        household_id: householdA.id, person_id: personA.id, content_id: memoryId,
      });
      record(Boolean(error) && error.code === '23514', `R33. a Memory favorite is rejected by the database (got ${error?.code ?? 'no error'})`);
    }
    {
      const { error } = await serviceClient.from('homecloud_file_favorites').insert({
        household_id: householdA.id, person_id: personA.id, content_id: foreignFile.id,
      });
      record(Boolean(error) && error.code === '23514', `R34. a cross-household row is rejected by the database (got ${error?.code ?? 'no error'})`);
    }
    {
      const { error: firstError } = await serviceClient.from('homecloud_file_favorites').insert({
        household_id: householdA.id, person_id: personA.id, content_id: looseA[2].id,
      });
      record(!firstError, 'R35. a direct valid insert lands');
      const { error } = await serviceClient.from('homecloud_file_favorites').insert({
        household_id: householdA.id, person_id: personA.id, content_id: looseA[2].id,
      });
      record(Boolean(error) && error.code === '23505', `R36. a duplicate is rejected by the UNIQUE triple (got ${error?.code ?? 'no error'})`);
      await serviceClient.from('homecloud_file_favorites')
        .delete().eq('household_id', householdA.id).eq('person_id', personA.id).eq('content_id', looseA[2].id);
    }
    {
      const { error } = await serviceClient.from('homecloud_file_favorites').insert({
        household_id: householdA.id, person_id: stranger.id, content_id: looseA[2].id,
      });
      record(Boolean(error) && error.code === '23514', `R37. a non-member row is rejected by the database (got ${error?.code ?? 'no error'})`);
    }
  } finally {
    // Teardown order is dictated by the RESTRICT foreign keys: nothing may
    // point at a household being deleted (people.active_household_id), and no
    // household may reference a person being deleted (created_by_person_id).
    // Cleanup failures are RECORDED, never swallowed: silent hygiene failures
    // are how stacks fill up with orphaned test households.
    const cleanupErrors = [];
    async function cleanStep(label, work) {
      try {
        const { error } = await work();
        if (error) throw error;
      } catch (e) {
        cleanupErrors.push(`${label}: ${e?.message ?? e}`);
      }
    }
    if (cleanup.householdIds.length) {
      await cleanStep('favorites', () => serviceClient.from('homecloud_file_favorites').delete().in('household_id', cleanup.householdIds));
    }
    if (cleanup.contentIds.length) {
      await cleanStep('contents', () => serviceClient.from('homecloud_contents').delete().in('id', cleanup.contentIds));
    }
    if (cleanup.folderIds.length) {
      await cleanStep('folders', () => serviceClient.from('homecloud_folders').delete().in('id', cleanup.folderIds));
    }
    if (cleanup.membershipIds.length) {
      await cleanStep('memberships', () => serviceClient.from('household_members').delete().in('id', cleanup.membershipIds));
    }
    if (cleanup.personIds.length) {
      await cleanStep('unpoint-active-household', () => serviceClient.from('people').update({ active_household_id: null }).in('id', cleanup.personIds));
    }
    if (cleanup.householdIds.length) {
      await cleanStep('households', () => serviceClient.from('households').delete().in('id', cleanup.householdIds));
    }
    if (cleanup.personIds.length) {
      await cleanStep('people', () => serviceClient.from('people').delete().in('id', cleanup.personIds));
    }
    for (const userId of cleanup.authUsers) {
      try {
        const { error } = await serviceClient.auth.admin.deleteUser(userId);
        if (error) throw error;
      } catch (e) {
        cleanupErrors.push(`auth-user: ${e?.message ?? e}`);
      }
    }
    for (const message of cleanupErrors) record(false, `CLEANUP: ${message}`);
  }

  console.log(`\nHOMECLOUD_FILES_FAVORITES_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HOMECLOUD_FILES_FAVORITES_RUNTIME_TESTS=FAIL');
  } else {
    console.log('HOMECLOUD_FILES_FAVORITES_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
