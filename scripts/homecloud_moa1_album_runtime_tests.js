#!/usr/bin/env node
'use strict';

/**
 * HomeCloud MO-A1 — Album contract / backend / read model: RUNTIME evidence.
 *
 * Target: local Supabase only (no remote database, no remote Storage). It calls
 * the REAL backend services with a REAL Supabase Auth JWT against rows inserted
 * directly in the DB, so the semantic date matrix, every Memory kind and every
 * lifecycle can be controlled exactly. This mirrors the canonical HC-4B.1 read
 * model runtime harness.
 *
 * What it proves (one section per contract area):
 *   A. create   B. rename   C. delete Album (hard delete of the organization)
 *   D. add membership   E. remove membership   F. count
 *   G. cover    H. order (Album + Timeline regression)   I. permissions
 *
 * Environment is resolved exactly like every other HomeCloud runtime suite
 * (tests/helpers/environment: dotenv files first, then `supabase status`), and
 * the run REFUSES a non-local Supabase URL.
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
  createAlbum,
  renameAlbum,
  deleteAlbum,
  addMemoryToAlbum,
  removeMemoryFromAlbum,
} = require('../backend/src/services/homecloudAlbumService');
const { listAlbums, getAlbumById, listMemories } = require('../backend/src/services/homecloudReadService');
const {
  getHomeCloudOriginalPath,
  getHomeCloudPreviewPath,
  getHomeCloudBucket,
} = require('../backend/src/lib/homecloudStoragePaths');

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
  } catch (error) {
    const ok = error && error.code === expectedCode;
    record(ok, `${message} (${(error && error.code) || 'no_code'}${ok ? '' : `, expected ${expectedCode}`})`);
    return error;
  }
  record(false, `${message} (expected rejection ${expectedCode}, got success)`);
  return null;
}

/** Assert a rejection and also assert the exact HTTP status. */
async function expectStatus(promiseFactory, expectedCode, expectedStatus, message) {
  try {
    await promiseFactory();
  } catch (error) {
    const ok = error && error.code === expectedCode && error.statusCode === expectedStatus;
    record(
      ok,
      `${message} (${(error && error.code) || 'no_code'}/${(error && error.statusCode) || 'no_status'}${ok ? '' : `, expected ${expectedCode}/${expectedStatus}`})`,
    );
    return error;
  }
  record(false, `${message} (expected rejection ${expectedCode}, got success)`);
  return null;
}

/**
 * Storage traffic detector.
 *
 * "No storage deletion was invoked" is only real evidence if the detector can
 * actually SEE a storage request, so it is proven with a positive control
 * before it is used to assert the absence of storage traffic.
 *
 * It is installed BEFORE any Supabase client is constructed, because
 * supabase-js resolves `fetch` when the client is built.
 */
const storageCalls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, ...rest) => {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  if (url.includes('/storage/')) storageCalls.push(url);
  return originalFetch(input, ...rest);
};

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

async function createAuthUser(runId, label) {
  const email = `hcmoa1-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, token: signedIn.session.access_token };
}

function reqFor(authUser, suffix) {
  return {
    user: { id: authUser.userId },
    accessToken: authUser.token,
    requestId: `req-hcmoa1-${suffix}`,
    mutationId: `mut-hcmoa1-${suffix}`,
  };
}

async function run() {
  console.log('\n=== MO-A1 ALBUM RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const runId = Date.now();
  const cleanup = {
    authUsers: [],
    personIds: [],
    householdIds: [],
    membershipIds: [],
    contentIds: [],
    albumIds: [],
  };

  try {
    // ---------------------------------------------------------------
    // Households and members
    // ---------------------------------------------------------------
    const adultAuth = await createAuthUser(runId, 'adult');
    const seniorAuth = await createAuthUser(runId, 'senior');
    const viewerAuth = await createAuthUser(runId, 'viewer');
    const otherAuth = await createAuthUser(runId, 'other');
    cleanup.authUsers.push(adultAuth.userId, seniorAuth.userId, viewerAuth.userId, otherAuth.userId);

    const insertPerson = async (displayName, userId) => {
      const { data, error } = await serviceClient
        .from('people')
        .insert({ display_name: displayName, auth_user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.personIds.push(data.id);
      return data;
    };

    const adultPerson = await insertPerson('MOA1 Adult', adultAuth.userId);
    const seniorPerson = await insertPerson('MOA1 Senior', seniorAuth.userId);
    const viewerPerson = await insertPerson('MOA1 Viewer', viewerAuth.userId);
    const otherPerson = await insertPerson('MOA1 Other', otherAuth.userId);

    const insertHousehold = async (name, slug, creatorPersonId) => {
      const { data, error } = await serviceClient
        .from('households')
        .insert({ name, slug, created_by_person_id: creatorPersonId })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.householdIds.push(data.id);
      return data;
    };

    const householdA = await insertHousehold('MOA1 Household A', `hcmoa1-a-${runId}`, adultPerson.id);
    const householdB = await insertHousehold('MOA1 Household B', `hcmoa1-b-${runId}`, otherPerson.id);

    const insertMember = async (householdId, personId, role) => {
      const { data, error } = await serviceClient
        .from('household_members')
        .insert({ household_id: householdId, person_id: personId, role, status: 'active', joined_at: new Date().toISOString() })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.membershipIds.push(data.id);
      return data;
    };

    // adult: organize + delete. senior: organize WITHOUT delete.
    // viewer (adolescent): view ONLY, no organize and no delete.
    const adultMember = await insertMember(householdA.id, adultPerson.id, 'adult');
    const seniorMember = await insertMember(householdA.id, seniorPerson.id, 'senior');
    const viewerMember = await insertMember(householdA.id, viewerPerson.id, 'adolescent');
    const otherMember = await insertMember(householdB.id, otherPerson.id, 'adult');

    for (const person of [adultPerson, seniorPerson, viewerPerson]) {
      await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', person.id);
    }
    await serviceClient.from('people').update({ active_household_id: householdB.id }).eq('id', otherPerson.id);

    const reqAdult = reqFor(adultAuth, 'adult');
    const reqSenior = reqFor(seniorAuth, 'senior');
    const reqViewer = reqFor(viewerAuth, 'viewer');
    const reqOther = reqFor(otherAuth, 'other');

    const hhA = householdA.id;
    const hhB = householdB.id;

    // ---------------------------------------------------------------
    // Fixtures
    // ---------------------------------------------------------------
    const insertBinary = async (householdId, over) => {
      const id = over.id ?? randomUUID();
      const { data, error } = await serviceClient
        .from('homecloud_contents')
        .insert({
          id,
          household_id: householdId,
          role: over.role ?? 'memory',
          display_name: over.displayName ?? null,
          mime_type: over.mimeType ?? null,
          extension: over.extension ?? null,
          size_bytes: over.sizeBytes ?? null,
          original_storage_path: getHomeCloudOriginalPath(householdId, id),
          preview_storage_path: over.preview === false ? null : getHomeCloudPreviewPath(householdId, id),
          uploaded_by_member_id: over.uploadedByMemberId ?? null,
          uploaded_at: over.uploadedAt === undefined ? new Date().toISOString() : over.uploadedAt,
          caption: over.caption ?? null,
          capture_precision: over.capturePrecision ?? 'unknown',
          captured_at: over.capturedAt ?? null,
          captured_year: over.capturedYear ?? null,
          captured_month: over.capturedMonth ?? null,
          hidden_from_resurfacing: over.hiddenFromResurfacing ?? false,
          lifecycle: over.lifecycle ?? 'active',
          trashed_at: over.lifecycle === 'trashed' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (error) throw new Error(`${error.message} :: ${JSON.stringify(over)}`);
      cleanup.contentIds.push(id);
      return data;
    };

    const insertWritten = async (householdId, over) => {
      const id = over.id ?? randomUUID();
      const { data, error } = await serviceClient
        .from('homecloud_contents')
        .insert({
          id,
          household_id: householdId,
          role: 'memory',
          written_text: over.writtenText,
          uploaded_at: null,
          capture_precision: over.capturePrecision ?? 'unknown',
          captured_at: over.capturedAt ?? null,
          captured_year: over.capturedYear ?? null,
          captured_month: over.capturedMonth ?? null,
          hidden_from_resurfacing: false,
          lifecycle: over.lifecycle ?? 'active',
          trashed_at: over.lifecycle === 'trashed' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (error) throw new Error(`${error.message} :: ${JSON.stringify(over)}`);
      cleanup.contentIds.push(id);
      return data;
    };

    const m = {};
    // Semantic-date matrix used by the ordering and cover sections.
    m.image2024 = await insertBinary(hhA, { displayName: 'imagen-2024.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2024-07-18T08:00:00Z', capturedYear: 2024, capturedMonth: 7, caption: 'Playa 2024', uploadedByMemberId: adultMember.id });
    m.image2024b = await insertBinary(hhA, { displayName: 'imagen-2024b.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2024-07-18T20:00:00Z', capturedYear: 2024, capturedMonth: 7 });
    m.month2023 = await insertBinary(hhA, { displayName: 'mes-2023.png', mimeType: 'image/png', sizeBytes: 10, capturePrecision: 'month_year', capturedYear: 2023, capturedMonth: 11 });
    m.year2021 = await insertBinary(hhA, { displayName: 'anio-2021.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'year', capturedYear: 2021 });
    m.video2020 = await insertBinary(hhA, { displayName: 'video-2020.mp4', mimeType: 'video/mp4', sizeBytes: 99, capturePrecision: 'year', capturedYear: 2020 });
    m.audio2019 = await insertBinary(hhA, { displayName: 'audio-2019.m4a', mimeType: 'audio/mp4', sizeBytes: 55, capturePrecision: 'year', capturedYear: 2019, uploadedByMemberId: seniorMember.id });
    m.written2018 = await insertWritten(hhA, { writtenText: 'Recuerdo escrito de 2018', capturePrecision: 'year', capturedYear: 2018 });
    // Precision matrix inside ONE year, so the Album order has to keep the
    // frozen partial-date semantics: year-only (no month) leads the year, then
    // month_year (no captured_at) leads the exact Memories of that month.
    m.year2024a = await insertBinary(hhA, { displayName: 'anio-2024a.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'year', capturedYear: 2024 });
    m.month2024 = await insertBinary(hhA, { displayName: 'mes-2024.png', mimeType: 'image/png', sizeBytes: 10, capturePrecision: 'month_year', capturedYear: 2024, capturedMonth: 7 });
    m.exact2024early = await insertBinary(hhA, { displayName: 'exacto-2024 Temprano.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2024-07-05T09:00:00Z', capturedYear: 2024, capturedMonth: 7 });
    // The two unknown-date Memories carry FIXED ids so the id tie-break of the
    // Album order is deterministic instead of depending on random UUIDs.
    m.unknownImage = await insertBinary(hhA, { id: '00000000-0000-4000-8000-000000000002', displayName: 'sin-fecha.jpg', mimeType: 'image/jpeg', sizeBytes: 10 });
    m.unknownWritten = await insertWritten(hhA, { id: '00000000-0000-4000-8000-000000000001', writtenText: 'Recuerdo sin fecha' });
    // Never-visible rows.
    m.stagingImage = await insertBinary(hhA, { displayName: 'staging.jpg', mimeType: 'image/jpeg', sizeBytes: 10, lifecycle: 'staging', uploadedAt: null, capturePrecision: 'year', capturedYear: 2010 });
    m.trashedImage = await insertBinary(hhA, { displayName: 'trashed.jpg', mimeType: 'image/jpeg', sizeBytes: 10, lifecycle: 'trashed', capturePrecision: 'year', capturedYear: 2011 });
    m.activeFile = await insertBinary(hhA, { role: 'file', displayName: 'documento.pdf', mimeType: 'application/pdf', sizeBytes: 10 });
    m.imageFile = await insertBinary(hhA, { role: 'file', displayName: 'foto-archivo.jpg', mimeType: 'image/jpeg', sizeBytes: 10 });
    m.otherHouseholdMemory = await insertBinary(hhB, { displayName: 'ajena.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2030-01-01T00:00:00Z', capturedYear: 2030, capturedMonth: 1, uploadedByMemberId: otherMember.id });

    /**
     * The frozen Album presentation order (oldest -> newest) of the ordering
     * fixture set, written out by hand from the contract instead of recomputed
     * from the implementation, so the test cannot agree with a regression:
     *
     *   unknown dates (null year) -> id ascending
     *   2018 / 2019 / 2020 / 2021 (year precision)
     *   2023 month 11
     *   2024: year-only (no month) FIRST, then month 7: month_year (no
     *   captured_at) before the exact Memories, then by captured_at ascending.
     */
    const albumOrderExpected = [
      m.unknownWritten.id, m.unknownImage.id,
      m.written2018.id, m.audio2019.id, m.video2020.id, m.year2021.id, m.month2023.id,
      m.year2024a.id, m.month2024.id, m.exact2024early.id, m.image2024.id, m.image2024b.id,
    ];
    const timelineOrderExpected = albumOrderExpected.slice().reverse();

    // ---------------------------------------------------------------
    // Albums created directly so every lifecycle is reachable
    // ---------------------------------------------------------------
    const insertAlbum = async (over) => {
      const { data, error } = await serviceClient
        .from('homecloud_albums')
        .insert({
          household_id: over.householdId ?? hhA,
          name: over.name,
          created_by_member_id: over.createdByMemberId ?? adultMember.id,
          lifecycle: over.lifecycle ?? 'active',
          trashed_at: over.lifecycle === 'trashed' ? new Date().toISOString() : null,
        })
        .select('*')
        .single();
      if (error) throw error;
      cleanup.albumIds.push(data.id);
      return data;
    };

    const membership = (albumId, contentId) => serviceClient
      .from('homecloud_album_items')
      .insert({ album_id: albumId, content_id: contentId, added_by_member_id: adultMember.id });

    const albumEmpty = await insertAlbum({ name: 'MOA1 Vacío' });
    const albumOne = await insertAlbum({ name: 'MOA1 Uno' });
    const albumMany = await insertAlbum({ name: 'MOA1 Muchos' });
    const albumCover = await insertAlbum({ name: 'MOA1 Portada' });
    const albumOrder = await insertAlbum({ name: 'MOA1 Orden' });
    const albumNoVisual = await insertAlbum({ name: 'MOA1 Sin Visual' });
    const albumOtherSide = await insertAlbum({ name: 'MOA1 Otro Lado' });
    const albumDelete = await insertAlbum({ name: 'MOA1 Se Borra' });
    const albumTrashed = await insertAlbum({ name: 'MOA1 Papelera', lifecycle: 'trashed' });
    const crossAlbum = await insertAlbum({ householdId: hhB, name: 'MOA1 Ajeno', createdByMemberId: otherMember.id });

    await membership(albumOne.id, m.image2024.id);
    for (const id of [m.image2024.id, m.image2024b.id, m.month2023.id, m.year2021.id, m.video2020.id]) {
      await membership(albumMany.id, id);
    }
    // Cover album: an OLDER audio, an OLDER written Memory, a NEWER image, an
    // OLDER video, plus trashed and staging visuals that must never win.
    await membership(albumCover.id, m.audio2019.id);
    await membership(albumCover.id, m.written2018.id);
    await membership(albumCover.id, m.image2024.id);
    await membership(albumCover.id, m.video2020.id);
    await membership(albumCover.id, m.trashedImage.id);
    await membership(albumCover.id, m.stagingImage.id);
    for (const id of albumOrderExpected) {
      await membership(albumOrder.id, id);
    }
    await membership(albumNoVisual.id, m.audio2019.id);
    await membership(albumNoVisual.id, m.written2018.id);
    await membership(albumNoVisual.id, m.unknownWritten.id);
    // A staging and a trashed membership must be EXCLUDED from itemCount.
    await membership(albumMany.id, m.stagingImage.id);
    await membership(albumMany.id, m.trashedImage.id);

    // The same Memory also belongs to another Album: its membership must
    // survive any deletion in this Album.
    await membership(albumOtherSide.id, m.image2024.id);
    await membership(albumDelete.id, m.image2024.id);
    await membership(albumDelete.id, m.video2020.id);

    // A >1000 membership Album proves the count is exact, not truncated.
    const BIG_ALBUM_SIZE = 1100;
    const albumBig = await insertAlbum({ name: 'MOA1 Enorme' });
    {
      const ids = [];
      for (let index = 0; index < BIG_ALBUM_SIZE; index += 1) {
        const row = await insertBinary(hhA, {
          displayName: `enorme-${index}.jpg`,
          mimeType: 'image/jpeg',
          sizeBytes: 10,
          capturePrecision: 'year',
          capturedYear: 1990 + (index % 30),
        });
        ids.push(row.id);
      }
      for (let index = 0; index < ids.length; index += 400) {
        const { error } = await serviceClient
          .from('homecloud_album_items')
          .insert(ids.slice(index, index + 400).map((contentId) => ({
            album_id: albumBig.id,
            content_id: contentId,
            added_by_member_id: adultMember.id,
          })));
        if (error) throw error;
      }
    }

    const listAllAlbums = async () => {
      const albums = await listAlbums(reqAdult);
      return new Map(albums.map((album) => [album.id, album]));
    };

    // =================================================================
    // A) CREATE ALBUM
    // =================================================================
    console.log('\n--- A. create Album ---');

    const created = await createAlbum(reqAdult, { name: '  MOA1 Creado  ' });
    cleanup.albumIds.push(created.id);
    record(created.name === 'MOA1 Creado', 'create trims the name before persistence');
    record(created.itemCount === 0, 'a new Album reports itemCount 0');
    record(created.coverContentId === null, 'a new Album reports coverContentId null');
    record(
      created.createdByMemberId === adultMember.id,
      'created_by_member_id comes from the authenticated household membership',
    );
    record(
      typeof created.createdAt === 'string' && typeof created.updatedAt === 'string',
      'the created Album exposes createdAt and updatedAt',
    );
    {
      const { data: row } = await serviceClient
        .from('homecloud_albums')
        .select('household_id, lifecycle, created_by_member_id')
        .eq('id', created.id)
        .single();
      record(
        row.household_id === hhA && row.lifecycle === 'active' && row.created_by_member_id === adultMember.id,
        'the persisted Album belongs to the SERVER household and is active',
      );
    }

    const clientInjected = await createAlbum(reqAdult, {
      name: 'MOA1 Inyectado',
      householdId: hhB,
      createdByMemberId: otherMember.id,
      membershipId: otherMember.id,
    });
    cleanup.albumIds.push(clientInjected.id);
    {
      const { data: row } = await serviceClient
        .from('homecloud_albums')
        .select('household_id, created_by_member_id')
        .eq('id', clientInjected.id)
        .single();
      record(
        row.household_id === hhA && row.created_by_member_id === adultMember.id,
        'a client-supplied householdId/createdByMemberId is ignored entirely',
      );
    }

    await expectStatus(() => createAlbum(reqAdult, { name: '   ' }), 'homecloud_invalid_name', 400, 'a blank name is a typed 400');
    await expectStatus(() => createAlbum(reqAdult, { name: '' }), 'homecloud_invalid_name', 400, 'an empty name is a typed 400');
    await expectStatus(() => createAlbum(reqAdult, { name: 42 }), 'homecloud_invalid_name', 400, 'a non-string name is a typed 400');
    await expectStatus(() => createAlbum(reqAdult, {}), 'homecloud_invalid_name', 400, 'a missing name is a typed 400');

    const duplicateOne = await createAlbum(reqAdult, { name: 'MOA1 Duplicado' });
    const duplicateTwo = await createAlbum(reqAdult, { name: 'MOA1 Duplicado' });
    cleanup.albumIds.push(duplicateOne.id, duplicateTwo.id);
    record(
      duplicateOne.id !== duplicateTwo.id && duplicateOne.name === duplicateTwo.name,
      'duplicate Album names are allowed',
    );

    await expectStatus(
      () => createAlbum(reqViewer, { name: 'MOA1 Sin Permiso' }),
      'homecloud_forbidden',
      403,
      'homecloud.view alone cannot create an Album',
    );
    const createdBySenior = await createAlbum(reqSenior, { name: 'MOA1 Senior' });
    cleanup.albumIds.push(createdBySenior.id);
    record(
      createdBySenior.createdByMemberId === seniorMember.id,
      'homecloud.organize can create an Album',
    );

    // =================================================================
    // B) RENAME ALBUM
    // =================================================================
    console.log('\n--- B. rename Album ---');

    const renamed = await renameAlbum(reqAdult, created.id, { name: '  MOA1 Renombrado  ' });
    record(renamed.name === 'MOA1 Renombrado', 'rename trims the name before persistence');
    record(renamed.itemCount === 0 && renamed.coverContentId === null, 'rename keeps the exact aggregates');
    {
      const { data: row } = await serviceClient
        .from('homecloud_albums')
        .select('name, created_by_member_id')
        .eq('id', created.id)
        .single();
      record(
        row.name === 'MOA1 Renombrado' && row.created_by_member_id === adultMember.id,
        'rename changes only the name and never the creator',
      );
    }

    await expectStatus(() => renameAlbum(reqAdult, created.id, { name: '  ' }), 'homecloud_invalid_name', 400, 'rename rejects a blank name');
    const renamedToDuplicate = await renameAlbum(reqAdult, created.id, { name: 'MOA1 Duplicado' });
    record(renamedToDuplicate.name === 'MOA1 Duplicado', 'rename onto an existing name is allowed');

    await expectStatus(
      () => renameAlbum(reqAdult, randomUUID(), { name: 'MOA1 Inexistente' }),
      'homecloud_album_not_found',
      404,
      'renaming a nonexistent Album is a 404',
    );
    await expectStatus(
      () => renameAlbum(reqAdult, crossAlbum.id, { name: 'MOA1 Intruso' }),
      'homecloud_album_not_found',
      404,
      'renaming a cross-household Album is a 404 and discloses nothing',
    );
    await expectStatus(
      () => renameAlbum(reqAdult, albumTrashed.id, { name: 'MOA1 No Activo' }),
      'homecloud_album_not_found',
      404,
      'renaming a trashed Album is a 404',
    );
    await expectStatus(
      () => renameAlbum(reqViewer, created.id, { name: 'MOA1 Sin Permiso' }),
      'homecloud_forbidden',
      403,
      'homecloud.view alone cannot rename an Album',
    );

    // =================================================================
    // C) DELETE ALBUM
    // =================================================================
    console.log('\n--- C. delete Album ---');

    const MEMORY_SNAPSHOT_FIELDS = [
      'id', 'household_id', 'role', 'display_name', 'mime_type', 'extension', 'size_bytes',
      'original_storage_path', 'preview_storage_path', 'uploaded_by_member_id', 'uploaded_at',
      'caption', 'written_text', 'captured_at', 'captured_year', 'captured_month',
      'capture_precision', 'lifecycle', 'trashed_at',
    ].join(', ');

    const snapshotMemories = async (ids) => {
      const { data, error } = await serviceClient
        .from('homecloud_contents')
        .select(MEMORY_SNAPSHOT_FIELDS)
        .in('id', ids);
      if (error) throw error;
      return new Map((data ?? []).map((row) => [row.id, JSON.stringify(row)]));
    };

    const deleteTargets = [m.image2024.id, m.video2020.id];
    const before = await snapshotMemories(deleteTargets);

    // Positive control: prove the storage detector really observes a Storage
    // request, otherwise "no storage traffic" below would prove nothing.
    storageCalls.length = 0;
    await serviceClient.storage.from(getHomeCloudBucket('original')).list('', { limit: 1 });
    const detectorWorks = storageCalls.length > 0;
    record(detectorWorks, `the storage traffic detector observes real Storage calls (${storageCalls.length})`);

    storageCalls.length = 0;
    await deleteAlbum(reqAdult, albumDelete.id);

    record(
      detectorWorks && storageCalls.length === 0,
      `deleting an Album issued NO Storage request of any kind (${storageCalls.length})`,
    );

    {
      const { data: albumRows } = await serviceClient
        .from('homecloud_albums')
        .select('id, lifecycle, trashed_at, trashed_by_member_id')
        .eq('id', albumDelete.id);
      record(albumRows.length === 0, 'the Album row is hard deleted, not soft trashed');
    }
    {
      const { data: items } = await serviceClient
        .from('homecloud_album_items')
        .select('album_id')
        .eq('album_id', albumDelete.id);
      record(items.length === 0, 'the Album membership rows are gone through the FK cascade');
    }
    {
      const after = await snapshotMemories(deleteTargets);
      const unchanged = deleteTargets.every((id) => before.get(id) === after.get(id));
      record(unchanged, 'every Memory survives with byte-identical identity, storage and preview metadata');
      const row = JSON.parse(after.get(m.image2024.id));
      record(
        row.lifecycle === 'active' && row.original_storage_path === getHomeCloudOriginalPath(hhA, m.image2024.id)
        && row.preview_storage_path === getHomeCloudPreviewPath(hhA, m.image2024.id),
        'original storage path, preview path and lifecycle are untouched',
      );
    }
    {
      const { data: otherSide } = await serviceClient
        .from('homecloud_album_items')
        .select('album_id, content_id')
        .eq('album_id', albumOtherSide.id);
      record(
        otherSide.length === 1 && otherSide[0].content_id === m.image2024.id,
        'memberships of the same Memory in OTHER Albums survive',
      );
    }
    {
      const { data: timeline } = await serviceClient
        .from('homecloud_contents')
        .select('id, lifecycle')
        .eq('id', m.image2024.id)
        .single();
      record(
        timeline.id === m.image2024.id && timeline.lifecycle === 'active',
        'the global Timeline still sees the Memory after the Album is deleted',
      );
    }

    await expectStatus(
      () => deleteAlbum(reqAdult, albumDelete.id),
      'homecloud_album_not_found',
      404,
      'deleting an already deleted Album is a 404, never a fake success',
    );
    await expectStatus(
      () => deleteAlbum(reqAdult, randomUUID()),
      'homecloud_album_not_found',
      404,
      'deleting a nonexistent Album is a 404',
    );
    await expectStatus(
      () => deleteAlbum(reqAdult, crossAlbum.id),
      'homecloud_album_not_found',
      404,
      'deleting a cross-household Album is a 404 and discloses nothing',
    );
    await expectStatus(
      () => deleteAlbum(reqAdult, albumTrashed.id),
      'homecloud_album_not_found',
      404,
      'deleting a trashed Album is a 404',
    );
    await expectStatus(
      () => deleteAlbum(reqViewer, albumEmpty.id),
      'homecloud_forbidden',
      403,
      'homecloud.view alone cannot delete an Album',
    );
    {
      const { data: stillThere } = await serviceClient
        .from('homecloud_albums')
        .select('id')
        .eq('id', albumEmpty.id);
      record(stillThere.length === 1, 'a denied delete leaves the Album untouched');
    }

    // A senior has organize WITHOUT delete: Album deletion must succeed.
    const seniorAlbum = await insertAlbum({ name: 'MOA1 Borrado Por Senior', createdByMemberId: seniorMember.id });
    await membership(seniorAlbum.id, m.year2021.id);
    await deleteAlbum(reqSenior, seniorAlbum.id);
    {
      const { data: gone } = await serviceClient.from('homecloud_albums').select('id').eq('id', seniorAlbum.id);
      const { data: membershipGone } = await serviceClient
        .from('homecloud_album_items')
        .select('album_id')
        .eq('album_id', seniorAlbum.id);
      const { data: memoryAlive } = await serviceClient
        .from('homecloud_contents')
        .select('id, lifecycle')
        .eq('id', m.year2021.id)
        .single();
      record(
        gone.length === 0 && membershipGone.length === 0 && memoryAlive.lifecycle === 'active',
        'deleting an Album needs organize only, NOT homecloud.delete',
      );
    }

    // =================================================================
    // D) ADD MEMBERSHIP
    // =================================================================
    console.log('\n--- D. add existing Memory to an Album ---');

    const { count: contentsBeforeAdd } = await serviceClient
      .from('homecloud_contents')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', hhA);

    const added = await addMemoryToAlbum(reqAdult, albumOne.id, { contentId: m.video2020.id });
    record(
      added.albumId === albumOne.id && added.contentId === m.video2020.id,
      'adding an active Memory returns the created membership',
    );
    record(
      added.addedByMemberId === adultMember.id,
      'added_by_member_id comes from the authenticated household membership',
    );

    const duplicateAdd = await addMemoryToAlbum(reqAdult, albumOne.id, { contentId: m.video2020.id });
    record(
      duplicateAdd.addedAt === added.addedAt && duplicateAdd.addedByMemberId === added.addedByMemberId,
      'a second identical add is idempotent and returns the EXISTING relation',
    );
    {
      const { data: rows } = await serviceClient
        .from('homecloud_album_items')
        .select('*')
        .eq('album_id', albumOne.id)
        .eq('content_id', m.video2020.id);
      record(rows.length === 1, 'exactly one relation exists after the duplicate add');
    }
    {
      const { count: contentsAfterAdd } = await serviceClient
        .from('homecloud_contents')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', hhA);
      record(
        contentsAfterAdd === contentsBeforeAdd,
        `adding a membership never creates a Memory row (${contentsBeforeAdd} -> ${contentsAfterAdd})`,
      );
    }
    {
      const { data: row } = await serviceClient
        .from('homecloud_album_items')
        .select('added_by_member_id')
        .eq('album_id', albumOne.id)
        .eq('content_id', m.year2021.id)
        .maybeSingle();
      record(
        !row || row.added_by_member_id === adultMember.id,
        'an existing membership is never rewritten by a new add',
      );
    }
    const clientInjectedMember = await addMemoryToAlbum(reqAdult, albumOne.id, {
      contentId: m.year2021.id,
      addedByMemberId: otherMember.id,
    });
    record(
      clientInjectedMember.addedByMemberId === adultMember.id,
      'a client-supplied addedByMemberId is ignored entirely',
    );

    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, { contentId: m.imageFile.id }),
      'homecloud_album_member_not_memory',
      409,
      'a FILE cannot be added to an Album',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, { contentId: m.activeFile.id }),
      'homecloud_album_member_not_memory',
      409,
      'an image/* FILE is still a FILE and is rejected',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, { contentId: m.stagingImage.id }),
      'homecloud_album_member_not_active',
      409,
      'a staging Memory cannot be added to an Album',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, { contentId: m.trashedImage.id }),
      'homecloud_album_member_not_active',
      409,
      'a trashed Memory cannot be added to an Album',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumTrashed.id, { contentId: m.image2024.id }),
      'homecloud_album_not_found',
      404,
      'a trashed Album cannot receive a membership',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, randomUUID(), { contentId: m.image2024.id }),
      'homecloud_album_not_found',
      404,
      'a nonexistent Album is a 404',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, crossAlbum.id, { contentId: m.image2024.id }),
      'homecloud_album_not_found',
      404,
      'a cross-household Album is a 404 and discloses nothing',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, { contentId: m.otherHouseholdMemory.id }),
      'homecloud_content_not_found',
      404,
      'a cross-household Memory is a 404 and discloses nothing',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, { contentId: randomUUID() }),
      'homecloud_content_not_found',
      404,
      'a nonexistent Memory is a 404',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, { contentId: '  ' }),
      'homecloud_invalid_content_id',
      400,
      'a blank contentId is a typed 400',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqAdult, albumOne.id, {}),
      'homecloud_invalid_content_id',
      400,
      'a missing contentId is a typed 400',
    );
    await expectStatus(
      () => addMemoryToAlbum(reqViewer, albumOne.id, { contentId: m.month2023.id }),
      'homecloud_forbidden',
      403,
      'homecloud.view alone cannot add a membership',
    );
    {
      const { data: leaked } = await serviceClient
        .from('homecloud_album_items')
        .select('content_id')
        .eq('album_id', albumOne.id);
      record(
        !leaked.some((row) => row.content_id === m.imageFile.id)
        && !leaked.some((row) => row.content_id === m.stagingImage.id)
        && !leaked.some((row) => row.content_id === m.otherHouseholdMemory.id),
        'no denied add ever created a membership row',
      );
    }

    // =================================================================
    // E) REMOVE MEMBERSHIP
    // =================================================================
    console.log('\n--- E. remove Memory from an Album ---');

    const removeTarget = m.image2024b.id;
    await membership(albumMany.id, removeTarget);
    const beforeRemove = await snapshotMemories([removeTarget]);

    await removeMemoryFromAlbum(reqAdult, albumMany.id, removeTarget);
    {
      const { data: rows } = await serviceClient
        .from('homecloud_album_items')
        .select('*')
        .eq('album_id', albumMany.id)
        .eq('content_id', removeTarget);
      record(rows.length === 0, 'the matching membership is removed');
    }
    {
      const afterRemove = await snapshotMemories([removeTarget]);
      record(
        beforeRemove.get(removeTarget) === afterRemove.get(removeTarget),
        'the Memory survives a membership removal with identical metadata',
      );
    }
    {
      const { data: otherSide } = await serviceClient
        .from('homecloud_album_items')
        .select('content_id')
        .eq('album_id', albumOtherSide.id);
      record(
        otherSide.some((row) => row.content_id === m.image2024.id),
        'memberships of OTHER Albums survive a removal',
      );
    }
    {
      const { data: stillListed } = await serviceClient
        .from('homecloud_contents')
        .select('id, lifecycle')
        .eq('id', removeTarget)
        .single();
      record(
        stillListed.id === removeTarget && stillListed.lifecycle === 'active',
        'the global Timeline keeps the Memory after a removal',
      );
    }

    await removeMemoryFromAlbum(reqAdult, albumMany.id, removeTarget);
    record(true, 'removing an absent membership is an idempotent no-op');

    await expectStatus(
      () => removeMemoryFromAlbum(reqAdult, crossAlbum.id, removeTarget),
      'homecloud_album_not_found',
      404,
      'removing through a cross-household Album is a 404',
    );
    await expectStatus(
      () => removeMemoryFromAlbum(reqAdult, albumMany.id, m.otherHouseholdMemory.id),
      'homecloud_content_not_found',
      404,
      'removing a cross-household Memory is a 404',
    );
    await expectStatus(
      () => removeMemoryFromAlbum(reqAdult, albumMany.id, m.activeFile.id),
      'homecloud_album_member_not_memory',
      409,
      'removing a FILE membership is a typed 409',
    );
    await expectStatus(
      () => removeMemoryFromAlbum(reqAdult, albumTrashed.id, removeTarget),
      'homecloud_album_not_found',
      404,
      'removing from a trashed Album is a 404',
    );
    await expectStatus(
      () => removeMemoryFromAlbum(reqViewer, albumMany.id, removeTarget),
      'homecloud_forbidden',
      403,
      'homecloud.view alone cannot remove a membership',
    );

    // =================================================================
    // F) COUNT
    // =================================================================
    console.log('\n--- F. itemCount is exact ---');

    /**
     * Independent expected count, computed straight from the database with
     * EXPLICIT pagination (never relying on a single unbounded response, which
     * a PostgREST row cap could silently truncate).
     */
    const expectedActiveCount = async (albumId) => {
      let total = 0;
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await serviceClient
          .from('homecloud_album_items')
          .select('content_id, homecloud_contents!inner(role, lifecycle)', { count: 'exact' })
          .eq('album_id', albumId)
          .eq('homecloud_contents.role', 'memory')
          .eq('homecloud_contents.lifecycle', 'active')
          .order('content_id', { ascending: true })
          .range(offset, offset + 499);
        if (error) throw error;
        total += (data ?? []).length;
        if ((data ?? []).length < 500) return total;
      }
    };

    {
      const albums = await listAllAlbums();
      record(albums.get(albumEmpty.id).itemCount === 0, 'an empty Album counts 0');
      record(
        albums.get(albumOne.id).itemCount === (await expectedActiveCount(albumOne.id)),
        `a small Album counts exactly its active Memories (${albums.get(albumOne.id).itemCount})`,
      );
      record(
        albums.get(albumMany.id).itemCount === (await expectedActiveCount(albumMany.id)),
        `an N Album counts exactly its active Memories (${albums.get(albumMany.id).itemCount})`,
      );
      record(
        albums.get(albumCover.id).itemCount === (await expectedActiveCount(albumCover.id))
        && albums.get(albumCover.id).itemCount === 4,
        `staging and trashed memberships are excluded from itemCount (${albums.get(albumCover.id).itemCount})`,
      );
      record(
        albums.get(albumBig.id).itemCount === BIG_ALBUM_SIZE,
        `an Album with ${BIG_ALBUM_SIZE} memberships (>100 and >1000) counts EXACTLY (${albums.get(albumBig.id).itemCount})`,
      );
      record(
        albums.get(albumBig.id).itemCount === (await expectedActiveCount(albumBig.id)),
        'the >1000 count matches the independently paginated database total',
      );
      const detail = await getAlbumById(reqAdult, albumMany.id);
      record(
        detail.itemCount === albums.get(albumMany.id).itemCount,
        'the Album detail read agrees exactly with the list read',
      );
      const repeated = await listAllAlbums();
      record(
        repeated.get(albumMany.id).itemCount === albums.get(albumMany.id).itemCount
        && repeated.get(albumBig.id).itemCount === albums.get(albumBig.id).itemCount,
        'itemCount is stable across repeated reads',
      );
    }
    {
      const albums = await listAllAlbums();
      record(
        !albums.has(crossAlbum.id),
        'an Album of another household never appears in the list',
      );
      record(
        [...albums.values()].every((album) => Number.isInteger(album.itemCount) && album.itemCount >= 0),
        'every Album in the household list carries an integer itemCount >= 0',
      );
      record(
        [...albums.values()].every((album) => album.coverContentId === null || typeof album.coverContentId === 'string'),
        'every Album in the household list carries a string-or-null coverContentId',
      );
    }

    // =================================================================
    // G) COVER
    // =================================================================
    console.log('\n--- G. coverContentId ---');

    {
      const albums = await listAllAlbums();
      const cover = albums.get(albumCover.id);
      record(
        cover.coverContentId === m.video2020.id,
        'the OLDEST suitable active visual Memory becomes the cover',
      );
      record(
        cover.coverContentId !== m.audio2019.id && cover.coverContentId !== m.written2018.id,
        'an OLDER nonvisual Memory never becomes the cover',
      );
      record(
        cover.coverContentId !== m.image2024.id,
        'a NEWER visual Memory loses to an older visual one',
      );
      record(
        cover.coverContentId !== m.trashedImage.id && cover.coverContentId !== m.stagingImage.id,
        'a trashed or staging visual Memory never becomes the cover',
      );
      record(
        albums.get(albumNoVisual.id).coverContentId === null,
        'an Album with no suitable visual Memory reports coverContentId null',
      );
      record(
        albums.get(albumEmpty.id).coverContentId === null,
        'an empty Album reports coverContentId null',
      );
      const detail = await getAlbumById(reqAdult, albumCover.id);
      record(
        detail.coverContentId === cover.coverContentId,
        'the Album detail read agrees on the cover',
      );
    }
    {
      const forbidden = [
        getHomeCloudBucket('original'),
        getHomeCloudBucket('preview'),
        'storage_path', 'signed', 'token=', '/storage/',
      ];
      const offenders = [];
      for (const album of (await listAlbums(reqAdult))) {
        const serialized = JSON.stringify(album);
        for (const needle of forbidden) {
          if (serialized.includes(needle)) offenders.push(`${album.name}:${needle}`);
        }
        if (album.coverContentId !== null && !album.coverContentId.match(/^[0-9a-f-]{36}$/)) {
          offenders.push(`${album.name}:cover-not-a-uuid`);
        }
      }
      record(offenders.length === 0, `the Album DTO leaks no bucket, path or signed URL (${offenders.join(', ') || 'clean'})`);
    }

    // =================================================================
    // H) ORDER
    // =================================================================
    console.log('\n--- H. Album order and Timeline regression ---');

    const readWholeTimeline = async (req) => {
      const collected = [];
      for (let offset = 0; ; offset += 100) {
        const page = await listMemories(req, { limit: 100, offset });
        collected.push(...page.memories);
        if (page.nextOffset === null) return collected;
      }
    };

    const nameOf = new Map([
      [m.image2024.id, 'image2024'], [m.image2024b.id, 'image2024b'], [m.exact2024early.id, 'exact2024early'],
      [m.month2024.id, 'month2024'], [m.year2024a.id, 'year2024a'], [m.month2023.id, 'month2023'],
      [m.year2021.id, 'year2021'], [m.video2020.id, 'video2020'], [m.audio2019.id, 'audio2019'],
      [m.written2018.id, 'written2018'], [m.unknownImage.id, 'unknownImage'], [m.unknownWritten.id, 'unknownWritten'],
    ]);
    const nameOrder = (ids) => ids.map((id) => nameOf.get(id) ?? 'OTHER').join(',');

    const timelineAll = await readWholeTimeline(reqAdult);
    const timelineAllIds = timelineAll.map((memory) => memory.id);
    const inTimeline = (id) => timelineAllIds.includes(id);

    const albumRead = await listMemories(reqAdult, { albumId: albumOrder.id, order: 'album', limit: 100 });
    const albumIds = albumRead.memories.map((memory) => memory.id);

    record(
      albumIds.join() === albumOrderExpected.join(),
      `Album order is oldest -> newest and returns exactly the Album Memories [${nameOrder(albumIds)}]`,
    );
    record(
      albumOrderExpected.every((id) => inTimeline(id)),
      `the Timeline regression proof reads the WHOLE Timeline (${timelineAllIds.length} Memories), never a truncated page`,
    );
    {
      const timelineFiltered = timelineAllIds.filter((id) => albumOrderExpected.includes(id));
      record(
        timelineFiltered.join() === timelineOrderExpected.join(),
        `the global Timeline is still newest -> oldest [${nameOrder(timelineFiltered)}]`,
      );
    }
    record(
      albumIds[0] === m.unknownWritten.id,
      'unknown-date Memories lead the Album order (they are the oldest)',
    );
    record(
      albumIds.slice(-2).join() === [m.image2024.id, m.image2024b.id].join(),
      'the two newest exact Memories close the Album order behind the known dates',
    );
    record(
      albumIds.indexOf(m.written2018.id) < albumIds.indexOf(m.audio2019.id)
      && albumIds.indexOf(m.audio2019.id) < albumIds.indexOf(m.video2020.id),
      'Album order keeps the frozen partial-date precision semantics (oldest first)',
    );
    record(
      albumIds.indexOf(m.year2024a.id) < albumIds.indexOf(m.month2024.id)
      && albumIds.indexOf(m.month2024.id) < albumIds.indexOf(m.exact2024early.id),
      'inside one year a year-only Memory leads, then the month, then the exact Memories',
    );
    record(
      albumIds.indexOf(m.exact2024early.id) < albumIds.indexOf(m.image2024.id),
      'two exact Memories of one month order by captured_at ascending in Album order',
    );
    record(
      albumIds.indexOf(m.image2024b.id) > albumIds.indexOf(m.image2024.id),
      'two exact Memories in the same month keep a deterministic captured_at tie-break',
    );
    record(
      albumRead.memories.every((memory) => memory.role === 'memory' && inTimeline(memory.id)),
      'Album mode keeps the same Memory DTO, kind pipeline and household authority',
    );
    record(
      albumRead.memories.every((memory) => Array.isArray(memory.albumIds) && memory.albumIds.includes(albumOrder.id)),
      'Album mode still projects albumIds',
    );
    record(
      !albumRead.memories.some((memory) => ['householdId', 'lifecycle', 'original_storage_path']
        .some((key) => key in memory)),
      'Album mode never widens the Memory DTO boundary',
    );

    const explicitTimeline = await listMemories(reqAdult, { albumId: albumOrder.id, order: 'timeline', limit: 100 });
    record(
      explicitTimeline.memories.map((memory) => memory.id).join() === timelineOrderExpected.join(),
      `an explicit timeline order inside an Album is still newest -> oldest [${nameOrder(explicitTimeline.memories.map((memory) => memory.id))}]`,
    );
    record(
      (await listMemories(reqAdult, { order: 'timeline', limit: 100 })).memories.map((memory) => memory.id).join()
        === timelineAllIds.slice(0, 100).join(),
      'requesting the default order explicitly changes nothing',
    );

    {
      const pageSize = 3;
      const paged = [];
      let offset = 0;
      for (let guard = 0; guard < 10; guard += 1) {
        const page = await listMemories(reqAdult, { albumId: albumOrder.id, order: 'album', limit: pageSize, offset });
        paged.push(...page.memories.map((memory) => memory.id));
        if (page.nextOffset === null) break;
        offset = page.nextOffset;
      }
      record(
        paged.join() === albumIds.join(),
        `Album pagination reproduces the single-page order exactly, no skips [${nameOrder(paged)}]`,
      );
      record(new Set(paged).size === paged.length, 'Album pagination never duplicates a Memory');
    }

    await expectStatus(
      () => listMemories(reqAdult, { order: 'album' }),
      'homecloud_invalid_order',
      400,
      'Album order without an albumId is a typed 400, not a silent reinterpretation',
    );
    await expectStatus(
      () => listMemories(reqAdult, { order: 'sideways' }),
      'homecloud_invalid_order',
      400,
      'an unknown order mode is a typed 400',
    );
    await expectStatus(
      () => listMemories(reqAdult, { albumId: crossAlbum.id, order: 'album' }),
      'homecloud_album_not_found',
      404,
      'Album order on a cross-household Album is a 404',
    );
    {
      const otherTimeline = await listMemories(reqOther, { limit: 100 });
      record(
        otherTimeline.memories.length === 1 && otherTimeline.memories[0].id === m.otherHouseholdMemory.id,
        'the Timeline regression proof stays household-scoped',
      );
    }

    // =================================================================
    // I) PERMISSIONS
    // =================================================================
    console.log('\n--- I. permissions ---');

    {
      const viewerAlbums = await listAlbums(reqViewer);
      const viewerAlbum = viewerAlbums.find((album) => album.id === albumMany.id);
      record(
        Boolean(viewerAlbum) && Number.isInteger(viewerAlbum.itemCount),
        'a view-only member can READ Albums with their exact aggregates',
      );
      const viewerDetail = await getAlbumById(reqViewer, albumMany.id);
      record(
        viewerDetail.itemCount === viewerAlbum.itemCount
        && viewerDetail.coverContentId === viewerAlbum.coverContentId,
        'a view-only member can read the Album detail and sees the same aggregates',
      );
      record(
        !viewerAlbums.some((album) => album.id === crossAlbum.id),
        'a view-only member never sees an Album of another household',
      );
      await expectStatus(
        () => getAlbumById(reqViewer, crossAlbum.id),
        'homecloud_album_not_found',
        404,
        'a view-only member cannot read a cross-household Album',
      );
      await expectStatus(
        () => listMemories(reqViewer, { albumId: crossAlbum.id, order: 'album' }),
        'homecloud_album_not_found',
        404,
        'a view-only member cannot read a cross-household Album screen',
      );
    }

    {
      const seniorAlbum = await createAlbum(reqSenior, { name: 'MOA1 Permisos Senior' });
      cleanup.albumIds.push(seniorAlbum.id);
      const seniorMembership = await addMemoryToAlbum(reqSenior, seniorAlbum.id, { contentId: m.month2023.id });
      record(seniorMembership.albumId === seniorAlbum.id, 'homecloud.organize can add a membership');
      const seniorRename = await renameAlbum(reqSenior, seniorAlbum.id, { name: 'MOA1 Permisos Senior 2' });
      record(seniorRename.name === 'MOA1 Permisos Senior 2', 'homecloud.organize can rename');
      await renameAlbum(reqAdult, seniorAlbum.id, { name: 'MOA1 Permisos Junior' });
      await removeMemoryFromAlbum(reqSenior, seniorAlbum.id, m.month2023.id);
      {
        const { data: rows } = await serviceClient
          .from('homecloud_album_items')
          .select('content_id')
          .eq('album_id', seniorAlbum.id);
        record(rows.length === 0, 'homecloud.organize can remove a membership');
      }
      await deleteAlbum(reqSenior, seniorAlbum.id);
      {
        const { data: rows } = await serviceClient
          .from('homecloud_albums')
          .select('id')
          .eq('id', seniorAlbum.id);
        record(rows.length === 0, 'homecloud.organize can delete an Album without homecloud.delete');
      }
    }
  } finally {
    if (cleanup.contentIds.length > 0) {
      await serviceClient.from('homecloud_album_items').delete().in('content_id', cleanup.contentIds);
      await serviceClient.from('homecloud_contents').delete().in('id', cleanup.contentIds);
    }
    if (cleanup.albumIds.length > 0) {
      await serviceClient.from('homecloud_albums').delete().in('id', cleanup.albumIds);
    }
    if (cleanup.membershipIds.length > 0) {
      await serviceClient.from('household_members').delete().in('id', cleanup.membershipIds);
    }
    if (cleanup.personIds.length > 0) {
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
    globalThis.fetch = originalFetch;
  }

  console.log(`\nMOA1_ALBUM_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('MOA1_ALBUM_RUNTIME_TESTS=FAIL');
  } else {
    console.log('MOA1_ALBUM_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});