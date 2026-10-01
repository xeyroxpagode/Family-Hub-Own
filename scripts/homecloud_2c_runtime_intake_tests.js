#!/usr/bin/env node
'use strict';

/**
 * HomeCloud HC-2C — Memory Intake runtime tests against local Supabase.
 *
 * Exercises the real backend register service with initial Album contribution
 * semantics:
 *   - same-Household active Album -> membership established exactly once
 *   - no Album -> zero memberships (healthy root Memory)
 *   - cross-Household Album -> denied
 *   - nonexistent Album -> denied
 *   - FILE + Album -> denied
 *   - idempotent replay (same Album) -> safe, no duplicate membership
 *   - conflicting replay (different Album) -> explicit conflict, no mutation
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

const { registerHomeCloudContent } = require('../backend/src/services/homecloudIntakeService');

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
  const email = `hc2c-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, email, password, token: signedIn.session.access_token };
}

function reqFor(authUser, suffix) {
  return {
    user: { id: authUser.userId },
    accessToken: authUser.token,
    requestId: `req-hc2c-${suffix}`,
    mutationId: `mut-hc2c-${suffix}`,
  };
}

async function countAlbumItems(albumId) {
  const { data } = await serviceClient.from('homecloud_album_items').select('album_id, content_id').eq('album_id', albumId);
  return (data ?? []).length;
}

async function countContentMemberships(contentId) {
  const { data } = await serviceClient.from('homecloud_album_items').select('album_id, content_id').eq('content_id', contentId);
  return (data ?? []).length;
}

async function run() {
  console.log('\n=== HC-2C MEMORY INTAKE RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const runId = Date.now();
  const cleanup = { authUsers: [], contentIds: [], albumIds: [], membershipIds: [], personIds: [], householdIds: [] };

  try {
    const adult = await createAuthUser(runId, 'adult');
    cleanup.authUsers.push(adult.userId);

    const { data: adultPerson, error: adultPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC2C Adult', auth_user_id: adult.userId })
      .select('*')
      .single();
    if (adultPersonErr) throw adultPersonErr;
    cleanup.personIds.push(adultPerson.id);

    const { data: householdA, error: hhAErr } = await serviceClient
      .from('households')
      .insert({ name: 'HC2C Household A', slug: `hc2c-a-${runId}`, created_by_person_id: adultPerson.id })
      .select('*')
      .single();
    if (hhAErr) throw hhAErr;
    const { data: householdB, error: hhBErr } = await serviceClient
      .from('households')
      .insert({ name: 'HC2C Household B', slug: `hc2c-b-${runId}`, created_by_person_id: adultPerson.id })
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
    cleanup.membershipIds.push(adultMember.id);

    const { error: activeHouseholdErr } = await serviceClient
      .from('people')
      .update({ active_household_id: householdA.id })
      .eq('id', adultPerson.id);
    if (activeHouseholdErr) throw activeHouseholdErr;

    const reqAdult = reqFor(adult, 'adult');

    // Albums: one active in household A, one active in household B, one trashed in A.
    const { data: albumA, error: albumAErr } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdA.id, name: 'Viaje a Cordoba', created_by_member_id: adultMember.id })
      .select('*')
      .single();
    if (albumAErr) throw albumAErr;
    cleanup.albumIds.push(albumA.id);

    const { data: albumA2, error: albumA2Err } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdA.id, name: 'Cumple de mama', created_by_member_id: adultMember.id })
      .select('*')
      .single();
    if (albumA2Err) throw albumA2Err;
    cleanup.albumIds.push(albumA2.id);

const { data: albumB, error: albumBErr } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdB.id, name: 'Album de la casa B' })
      .select('*')
      .single();
    if (albumBErr) throw albumBErr;
    cleanup.albumIds.push(albumB.id);

    const { data: albumTrashed, error: albumTrashedErr } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdA.id, name: 'Album borrado', created_by_member_id: adultMember.id, lifecycle: 'trashed', trashed_at: nowIso })
      .select('*')
      .single();
    if (albumTrashedErr) throw albumTrashedErr;
    cleanup.albumIds.push(albumTrashed.id);

    // 1) MEMORY + same-Household active Album -> membership established once.
    const memA = await registerHomeCloudContent(reqAdult, {
      role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1200, extension: 'jpg',
      intakeRequestId: `hc2c-memA-${runId}`, initialAlbumId: albumA.id,
    });
    cleanup.contentIds.push(memA.id);
    record(memA.role === 'memory', 'memory registers as memory role');
    record(await countAlbumItems(albumA.id) === 1, 'initial Album membership established exactly once');
    record(await countContentMemberships(memA.id) === 1, 'memory has exactly one Album membership');

    // 2) MEMORY without Album -> zero memberships (healthy root Memory).
    const memRoot = await registerHomeCloudContent(reqAdult, {
      role: 'memory', displayName: 'video.mp4', mimeType: 'video/mp4', sizeBytes: 9000, extension: 'mp4',
      intakeRequestId: `hc2c-memRoot-${runId}`,
    });
    cleanup.contentIds.push(memRoot.id);
    record(await countContentMemberships(memRoot.id) === 0, 'memory without Album has zero memberships');

    // 3) cross-Household Album denied.
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', displayName: 'x.jpg', mimeType: 'image/jpeg', sizeBytes: 1, intakeRequestId: `hc2c-xhh-${runId}`, initialAlbumId: albumB.id }),
      'homecloud_album_cross_household',
      'cross-Household Album denied',
    );

    // 4) nonexistent Album denied.
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', displayName: 'x.jpg', mimeType: 'image/jpeg', sizeBytes: 1, intakeRequestId: `hc2c-nofound-${runId}`, initialAlbumId: randomUUID() }),
      'homecloud_album_not_found',
      'nonexistent Album denied',
    );

    // 5) trashed Album denied (not a valid contribution target).
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', displayName: 'x.jpg', mimeType: 'image/jpeg', sizeBytes: 1, intakeRequestId: `hc2c-trashed-${runId}`, initialAlbumId: albumTrashed.id }),
      'homecloud_album_not_active',
      'trashed Album denied as contribution target',
    );

    // 6) FILE + Album denied (validation).
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'file', displayName: 'x.txt', mimeType: 'text/plain', sizeBytes: 1, intakeRequestId: `hc2c-filealbum-${runId}`, initialAlbumId: albumA.id }),
      'homecloud_file_album_forbidden',
      'FILE + Album denied',
    );

    // 7) idempotent replay (same Album) -> same content, no duplicate membership.
    const memAReplay = await registerHomeCloudContent(reqAdult, {
      role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1200, extension: 'jpg',
      intakeRequestId: `hc2c-memA-${runId}`, initialAlbumId: albumA.id,
    });
    record(memAReplay.id === memA.id, 'same-intent replay returns same content');
    record(await countAlbumItems(albumA.id) === 1, 'same-intent replay does not duplicate membership');

    // 8) conflicting replay (different Album) -> explicit conflict, no mutation.
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', displayName: 'foto.jpg', mimeType: 'image/jpeg', sizeBytes: 1200, extension: 'jpg', intakeRequestId: `hc2c-memA-${runId}`, initialAlbumId: albumA2.id }),
      'homecloud_intake_album_conflict',
      'conflicting Album replay returns conflict',
    );
    record(await countAlbumItems(albumA.id) === 1 && await countAlbumItems(albumA2.id) === 0, 'conflicting replay did not mutate memberships');

    // 9) root-first then Album replay -> conflict (no silent organize).
    await expectReject(
      () => registerHomeCloudContent(reqAdult, { role: 'memory', displayName: 'video.mp4', mimeType: 'video/mp4', sizeBytes: 9000, extension: 'mp4', intakeRequestId: `hc2c-memRoot-${runId}`, initialAlbumId: albumA.id }),
      'homecloud_intake_album_conflict',
      'root-first contribution cannot be replayed into an Album',
    );
  } finally {
    if (cleanup.contentIds.length > 0) {
      await serviceClient.from('homecloud_contents').delete().in('id', cleanup.contentIds);
    }
    if (cleanup.albumIds.length > 0) {
      await serviceClient.from('homecloud_albums').delete().in('id', cleanup.albumIds);
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

  console.log(`\nHC2C_RUNTIME_INTAKE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC2C_RUNTIME_INTAKE_TESTS=FAIL');
  } else {
    console.log('HC2C_RUNTIME_INTAKE_TESTS=PASS');
  }
}

run().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
