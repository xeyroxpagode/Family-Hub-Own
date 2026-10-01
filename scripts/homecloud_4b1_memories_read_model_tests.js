#!/usr/bin/env node
'use strict';

/**
 * HomeCloud STAGE 4B.1 — Memories read model tests.
 *
 * Target: local Supabase only. Exercises the REAL backend read service with a
 * REAL Supabase Auth JWT, against rows inserted directly in the DB so the
 * semantic date matrix (exact / month_year / year / unknown), every Memory kind
 * and every lifecycle can be controlled exactly.
 *
 * Covers:
 *   1. only active memories          12. unknown precision sorts last
 *   2. no Files                      13. stable pagination
 *   3. no staging                    14. year filter
 *   4. no trashed                    15. album filter
 *   5. image kind                    16. kind filter
 *   6. video kind                    17. caption query
 *   7. audio kind                    18. written_text query
 *   8. written kind                  19. display_name fallback query
 *   9. exact ordering                20. household isolation
 *  10. month_year ordering           21. albumIds correctness
 *  11. year ordering                 22. DTO never filters storage paths
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

const { listMemories } = require('../backend/src/services/homecloudReadService');
const {
  getHomeCloudPreviewPath,
  getHomeCloudOriginalPath,
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
  const email = `hc4b1-read-${label}-${runId}@test.local`;
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
    requestId: `req-hc4b1-read-${suffix}`,
    mutationId: `mut-hc4b1-read-${suffix}`,
  };
}

async function run() {
  console.log('\n=== HC-4B1 MEMORIES READ MODEL TESTS ===\n');
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
  const content = {};

  try {
    const adult = await createAuthUser(runId, 'adult');
    const other = await createAuthUser(runId, 'other');
    cleanup.authUsers.push(adult.userId, other.userId);

    const { data: adultPerson, error: adultPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC4B1 Adult', auth_user_id: adult.userId })
      .select('*')
      .single();
    if (adultPersonErr) throw adultPersonErr;
    const { data: otherPerson, error: otherPersonErr } = await serviceClient
      .from('people')
      .insert({ display_name: 'HC4B1 Other', auth_user_id: other.userId })
      .select('*')
      .single();
    if (otherPersonErr) throw otherPersonErr;
    cleanup.personIds.push(adultPerson.id, otherPerson.id);

    const { data: householdA } = await serviceClient
      .from('households')
      .insert({ name: 'HC4B1 Household A', slug: `hc4b1-read-a-${runId}`, created_by_person_id: adultPerson.id })
      .select('*')
      .single();
    const { data: householdB } = await serviceClient
      .from('households')
      .insert({ name: 'HC4B1 Household B', slug: `hc4b1-read-b-${runId}`, created_by_person_id: otherPerson.id })
      .select('*')
      .single();
    if (!householdA || !householdB) throw new Error('household bootstrap failed');
    cleanup.householdIds.push(householdA.id, householdB.id);

    const { data: adultMember } = await serviceClient
      .from('household_members')
      .insert({ household_id: householdA.id, person_id: adultPerson.id, role: 'adult', status: 'active', joined_at: new Date().toISOString() })
      .select('*')
      .single();
    const { data: otherMember } = await serviceClient
      .from('household_members')
      .insert({ household_id: householdB.id, person_id: otherPerson.id, role: 'adult', status: 'active', joined_at: new Date().toISOString() })
      .select('*')
      .single();
    if (!adultMember || !otherMember) throw new Error('membership bootstrap failed');
    cleanup.membershipIds.push(adultMember.id, otherMember.id);

    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', adultPerson.id);
    await serviceClient.from('people').update({ active_household_id: householdB.id }).eq('id', otherPerson.id);

    const reqAdult = reqFor(adult, 'adult');
    const reqOther = reqFor(other, 'other');

    // ---------------------------------------------------------------
    // Fixture helpers
    // ---------------------------------------------------------------
    const insertBinary = async (householdId, over) => {
      const id = randomUUID();
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
          preview_storage_path: over.previewPath ?? null,
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
      const id = randomUUID();
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

    const hhA = householdA.id;

    // --- semantic date matrix + kinds ---------------------------------
    content.exact2026 = await insertBinary(hhA, { displayName: 'exacto-2026.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2026-03-05T10:00:00Z', capturedYear: 2026, capturedMonth: 3, caption: 'Viaje a la playa', uploadedByMemberId: adultMember.id });
    content.exact2024 = await insertBinary(hhA, { displayName: 'exacto-2024.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2024-07-18T08:00:00Z', capturedYear: 2024, capturedMonth: 7, caption: 'Cumple en la playa' });
    content.exact2024b = await insertBinary(hhA, { displayName: 'exacto-2024b.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2024-07-18T20:00:00Z', capturedYear: 2024, capturedMonth: 7 });
    content.month2025 = await insertBinary(hhA, { displayName: 'mes-2025.png', mimeType: 'image/png', sizeBytes: 10, capturePrecision: 'month_year', capturedYear: 2025, capturedMonth: 11 });
    content.month2024 = await insertBinary(hhA, { displayName: 'mes-2024.png', mimeType: 'image/png', sizeBytes: 10, capturePrecision: 'month_year', capturedYear: 2024, capturedMonth: 11 });
    content.year2022 = await insertBinary(hhA, { displayName: 'anio-2022.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'year', capturedYear: 2022 });
    content.year2024 = await insertBinary(hhA, { displayName: 'anio-2024.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'year', capturedYear: 2024 });
    content.unknown1 = await insertBinary(hhA, { displayName: 'sin-fecha-1.jpg', mimeType: 'image/jpeg', sizeBytes: 10 });
    content.unknown2 = await insertWritten(hhA, { writtenText: 'Recuerdo sin fecha del jardín' });
    content.video = await insertBinary(hhA, { displayName: 'video-2023.mp4', mimeType: 'video/mp4', sizeBytes: 99, capturePrecision: 'year', capturedYear: 2023 });
    content.audio = await insertBinary(hhA, { displayName: 'audio-2021.m4a', mimeType: 'audio/mp4', sizeBytes: 55, capturePrecision: 'year', capturedYear: 2021, caption: 'Cancion de la playa' });
    content.written = await insertWritten(hhA, { writtenText: 'Recuerdo escrito de la playa en 1999', capturePrecision: 'year', capturedYear: 1999, hiddenFromResurfacing: true });
    content.withPreview = await insertBinary(hhA, { displayName: 'con-preview.jpg', mimeType: 'image/jpeg', sizeBytes: 10, previewPath: getHomeCloudPreviewPath(hhA, randomUUID()), capturePrecision: 'year', capturedYear: 2018 });

    // Fix the preview path of the fixture to its OWN canonical identity.
    {
      const ownPath = getHomeCloudPreviewPath(hhA, content.withPreview.id);
      const { error } = await serviceClient
        .from('homecloud_contents')
        .update({ preview_storage_path: ownPath })
        .eq('id', content.withPreview.id);
      if (error) throw error;
      content.withPreview.preview_storage_path = ownPath;
    }

    // --- rows that must NEVER appear ----------------------------------
    content.stagingMemory = await insertBinary(hhA, { displayName: 'staging.jpg', mimeType: 'image/jpeg', sizeBytes: 10, lifecycle: 'staging', uploadedAt: null, capturePrecision: 'year', capturedYear: 2030 });
    content.trashedMemory = await insertBinary(hhA, { displayName: 'trashed.jpg', mimeType: 'image/jpeg', sizeBytes: 10, lifecycle: 'trashed', capturePrecision: 'year', capturedYear: 2029 });
    content.activeFile = await insertBinary(hhA, { role: 'file', displayName: 'documento.pdf', mimeType: 'application/pdf', sizeBytes: 10 });
    content.imageFile = await insertBinary(hhA, { role: 'file', displayName: 'foto-de-archivos.jpg', mimeType: 'image/jpeg', sizeBytes: 10 });

    // --- Albums ------------------------------------------------------
    const { data: albumOne, error: albumOneErr } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: hhA, name: `Album 4B1 Uno ${runId}`, created_by_member_id: adultMember.id })
      .select('*')
      .single();
    if (albumOneErr) throw albumOneErr;
    const { data: albumTwo } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: hhA, name: `Album 4B1 Dos ${runId}` })
      .select('*')
      .single();
    cleanup.albumIds.push(albumOne.id, albumTwo.id);

    await serviceClient.from('homecloud_album_items').insert({ album_id: albumOne.id, content_id: content.exact2024.id });
    await serviceClient.from('homecloud_album_items').insert({ album_id: albumOne.id, content_id: content.written.id });
    await serviceClient.from('homecloud_album_items').insert({ album_id: albumTwo.id, content_id: content.written.id });

    const { data: albumTrashed } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: hhA, name: `Album 4B1 Papelera ${runId}`, lifecycle: 'trashed', trashed_at: new Date().toISOString() })
      .select('*')
      .single();
    cleanup.albumIds.push(albumTrashed.id);

    // --- other household ---------------------------------------------
    content.otherHousehold = await insertBinary(householdB.id, { displayName: 'ajeno.jpg', mimeType: 'image/jpeg', sizeBytes: 10, capturePrecision: 'exact', capturedAt: '2030-01-01T00:00:00Z', capturedYear: 2030, capturedMonth: 1, uploadedByMemberId: otherMember.id });
    const { data: otherAlbum } = await serviceClient
      .from('homecloud_albums')
      .insert({ household_id: householdB.id, name: `Album B 4B1 ${runId}` })
      .select('*')
      .single();
    cleanup.albumIds.push(otherAlbum.id);

    // ===============================================================
    // 1-4) visibility boundary: active only, no Files, no staging, no trashed
    // ===============================================================
    const all = await listMemories(reqAdult, { limit: 100 });
    const allIds = all.memories.map((m) => m.id);

    record(!allIds.includes(content.stagingMemory.id), 'read model never returns staging memories (3)');
    record(!allIds.includes(content.trashedMemory.id), 'read model never returns trashed memories (4)');
    record(!allIds.includes(content.activeFile.id) && !allIds.includes(content.imageFile.id), 'read model never returns Files, not even image/* ones (2)');
    record(
      all.memories.every((m) => m.role === 'memory'),
      'read model returns only role=memory rows (1)',
    );
    const expectedActiveA = [
      content.exact2026.id, content.exact2024.id, content.exact2024b.id,
      content.month2025.id, content.month2024.id,
      content.year2022.id, content.year2024.id,
      content.unknown1.id, content.unknown2.id,
      content.video.id, content.audio.id, content.written.id, content.withPreview.id,
    ];
    record(
      allIds.slice().sort().join() === expectedActiveA.slice().sort().join(),
      `read model returns exactly the active memories of the household (${allIds.length})`,
    );
    record(!allIds.includes(content.otherHousehold.id), 'read model never leaks another household memory (20)');

    const otherRead = await listMemories(reqOther, { limit: 100 });
    record(
      otherRead.memories.length === 1 && otherRead.memories[0].id === content.otherHousehold.id,
      'household B read model only sees its own memories (20)',
    );

    // ===============================================================
    // 5-8) derived kind
    // ===============================================================
    const byId = new Map(all.memories.map((m) => [m.id, m]));
    record(byId.get(content.exact2026.id).kind === 'image', 'derived kind image for image/* (5)');
    record(byId.get(content.video.id).kind === 'video', 'derived kind video for video/* (6)');
    record(byId.get(content.audio.id).kind === 'audio', 'derived kind audio for audio/* (7)');
    record(byId.get(content.written.id).kind === 'written', 'derived kind written for written_text (8)');
    record(
      byId.get(content.audio.id).mimeType === 'audio/mp4' && byId.get(content.written.id).mimeType === null,
      'derived kind never confuses role with MIME (a written Memory keeps mimeType null)',
    );
    record(
      ![...byId.values()].some((m) => m.kind === null || m.kind === undefined),
      'every read-model memory has a non-null derived kind',
    );

    // ===============================================================
    // 9-12) canonical order
    // ===============================================================
    const order = all.memories.map((m) => m.id);
    record(
      order[0] === content.exact2026.id && order[1] === content.month2025.id,
      'captured_year DESC puts the newest year first (9/11)',
    );
    const idxExact2026 = order.indexOf(content.exact2026.id);
    const idxExact2024b = order.indexOf(content.exact2024b.id);
    record(
      idxExact2026 < idxExact2024b,
      'captured_year DESC keeps a 2026 Memory before a 2024 one (11)',
    );
    const idxMonth2024 = order.indexOf(content.month2024.id);
    record(
      idxMonth2024 < idxExact2024b && idxExact2024b < order.indexOf(content.exact2024.id),
      'inside 2024, captured_month DESC puts month 11 before month 7 (10)',
    );
    record(
      order.indexOf(content.exact2024b.id) < order.indexOf(content.exact2024.id),
      'captured_at DESC orders two exact Memories inside the same month (9)',
    );
    const idxYear2024 = order.indexOf(content.year2024.id);
    const idxYear2022 = order.indexOf(content.year2022.id);
    record(
      order.indexOf(content.exact2024.id) < idxYear2024 && idxYear2024 < order.indexOf(content.year2022.id),
      'inside one year, a year-only Memory is the trailing group (10/11)',
    );
    record(idxYear2022 > idxYear2024, 'year precision Memories order by captured_year DESC (11)');
    const idxVideo = order.indexOf(content.video.id);
    const idxAudio = order.indexOf(content.audio.id);
    const idxWritten = order.indexOf(content.written.id);
    const idxPreview = order.indexOf(content.withPreview.id);
    record(
      idxYear2024 < idxVideo && idxVideo < order.indexOf(content.year2022.id)
      && order.indexOf(content.year2022.id) < idxAudio && idxAudio < idxPreview && idxPreview < idxWritten,
      'kinds are never a tiebreaker: image, video, audio and written share the same date order (9/10/11)',
    );

    const unknownIds = [content.unknown1.id, content.unknown2.id];
    const firstUnknownIndex = Math.min(...unknownIds.map((id) => order.indexOf(id)));
    record(
      firstUnknownIndex === order.length - unknownIds.length,
      'unknown precision Memories sort after every known date (12)',
    );
    record(
      order.slice(-unknownIds.length).sort().join() === unknownIds.slice().sort().join(),
      'the unknown group is contiguous at the end (12)',
    );
    const uploadOrder = all.memories.map((m) => m.uploadedAt ?? '');
    record(
      JSON.stringify(uploadOrder) !== JSON.stringify([...uploadOrder].sort().reverse()),
      'uploaded_at is not the ordering input (all fixtures share the same custody time)',
    );

    // ===============================================================
    // 13) stable pagination
    // ===============================================================
    const pageSize = 4;
    const pageOne = await listMemories(reqAdult, { limit: pageSize, offset: 0 });
    const pageTwo = await listMemories(reqAdult, { limit: pageSize, offset: pageSize });
    const pageThree = await listMemories(reqAdult, { limit: pageSize, offset: pageSize * 2 });
    const paged = [...pageOne.memories, ...pageTwo.memories, ...pageThree.memories].map((m) => m.id);
    record(
      paged.join() === order.slice(0, paged.length).join(),
      'paginated pages reproduce the single-page order exactly (13)',
    );
    record(
      new Set(paged).size === paged.length,
      'paginated pages never duplicate a Memory across pages (13)',
    );
    record(
      pageOne.nextOffset === pageSize && pageTwo.nextOffset === pageSize * 2,
      'nextOffset advances by the page size while a next page exists (13)',
    );
    const pageFour = await listMemories(reqAdult, { limit: pageSize, offset: pageSize * 3 });
    record(
      pageFour.nextOffset === null && pageFour.memories.length === all.memories.length - pageSize * 3,
      'the last partial page reports nextOffset = null (13)',
    );
    record(
      pageThree.nextOffset === pageSize * 3,
      'a full page that is not the last one still reports the next offset (13)',
    );

    // ===============================================================
    // 14-16) filters
    // ===============================================================
    const year2024 = await listMemories(reqAdult, { year: 2024, limit: 100 });
    const year2024Ids = year2024.memories.map((m) => m.id).sort();
    record(
      year2024Ids.join() === [content.exact2024.id, content.exact2024b.id, content.month2024.id, content.year2024.id].sort().join(),
      'year filter matches exact, month_year and year precision of that year (14)',
    );
    record(
      year2024.memories.every((m) => m.capturedYear === 2024),
      'year filter never returns a Memory from another year (14)',
    );
    record(
      !(await listMemories(reqAdult, { year: 2030, limit: 100 })).memories.length,
      'year filter does not match an unknown-date Memory (14)',
    );

    const albumOneRead = await listMemories(reqAdult, { albumId: albumOne.id, limit: 100 });
    record(
      albumOneRead.memories.map((m) => m.id).sort().join() === [content.exact2024.id, content.written.id].sort().join(),
      'album filter returns only that album memories (15)',
    );
    const albumTwoRead = await listMemories(reqAdult, { albumId: albumTwo.id, limit: 100 });
    record(
      albumTwoRead.memories.map((m) => m.id).join() === content.written.id,
      'a second album returns only its own membership (15)',
    );
    await expectReject(
      () => listMemories(reqAdult, { albumId: otherAlbum.id }),
      'homecloud_album_not_found',
      'cross-household album filter is denied (15/20)',
    );
    await expectReject(
      () => listMemories(reqAdult, { albumId: albumTrashed.id }),
      'homecloud_album_not_found',
      'trashed album filter is denied (15)',
    );

    const imageOnly = await listMemories(reqAdult, { kind: 'image', limit: 100 });
    record(
      imageOnly.memories.length > 0 && imageOnly.memories.every((m) => m.kind === 'image'),
      'kind=image filter returns only image memories (16)',
    );
    record(
      !imageOnly.memories.some((m) => m.id === content.imageFile.id),
      'kind=image never reaches a File (16)',
    );
    const videoOnly = await listMemories(reqAdult, { kind: 'video', limit: 100 });
    record(
      videoOnly.memories.length === 1 && videoOnly.memories[0].id === content.video.id,
      'kind=video filter returns only video memories (16)',
    );
    const audioOnly = await listMemories(reqAdult, { kind: 'audio', limit: 100 });
    record(
      audioOnly.memories.length === 1 && audioOnly.memories[0].id === content.audio.id,
      'kind=audio filter returns only audio memories (16)',
    );
    const writtenOnly = await listMemories(reqAdult, { kind: 'written', limit: 100 });
    record(
      writtenOnly.memories.length === 2
      && writtenOnly.memories.every((m) => m.kind === 'written' && m.writtenText),
      'kind=written filter returns only written memories (16)',
    );
    await expectReject(
      () => listMemories(reqAdult, { kind: 'photo' }),
      'homecloud_invalid_kind_filter',
      'unknown kind filter is a typed 400 (16)',
    );

    // ===============================================================
    // 17-19) textual query
    // ===============================================================
    const captionQuery = await listMemories(reqAdult, { query: 'playa', limit: 100 });
    const captionIds = captionQuery.memories.map((m) => m.id);
    record(
      captionIds.includes(content.exact2026.id)
      && captionIds.includes(content.exact2024.id)
      && captionIds.includes(content.audio.id)
      && captionIds.includes(content.written.id),
      'query matches caption, written_text and display_name fallback (17/18/19)',
    );
    record(
      !captionIds.includes(content.year2022.id),
      'query does not return unrelated memories (17)',
    );
    const captionOnly = await listMemories(reqAdult, { query: 'Cumple', limit: 100 });
    record(
      captionOnly.memories.length === 1 && captionOnly.memories[0].id === content.exact2024.id,
      'query matches caption exactly (17)',
    );
    const writtenOnlyQuery = await listMemories(reqAdult, { query: 'sin fecha del jard', limit: 100 });
    record(
      writtenOnlyQuery.memories.length === 1 && writtenOnlyQuery.memories[0].id === content.unknown2.id,
      'query matches written_text (18)',
    );
    const displayNameOnly = await listMemories(reqAdult, { query: 'video-2023', limit: 100 });
    record(
      displayNameOnly.memories.length === 1 && displayNameOnly.memories[0].id === content.video.id,
      'query falls back to display_name (19)',
    );
    record(
      (await listMemories(reqAdult, { query: 'PLAYA', limit: 100 })).memories.length === captionQuery.memories.length,
      'query is case-insensitive (17)',
    );
    record(
      (await listMemories(reqAdult, { query: '  la playa  ', limit: 100 })).memories.length === captionQuery.memories.length,
      'query trims its edges and matches a multi-word caption (17)',
    );
    record(
      (await listMemories(reqAdult, { query: 'la  playa', limit: 100 })).memories.length === 0,
      'query preserves internal spacing instead of collapsing it (17)',
    );
    record(
      (await listMemories(reqAdult, { query: 'x, y (z)', limit: 100 })).memories.length === 0,
      'query neutralizes PostgREST filter metacharacters (17)',
    );

    // ===============================================================
    // 21) albumIds projection
    // ===============================================================
    const writtenDto = byId.get(content.written.id);
    record(
      Array.isArray(writtenDto.albumIds) && writtenDto.albumIds.slice().sort().join()
      === [albumOne.id, albumTwo.id].sort().join(),
      'albumIds carries every membership of a Memory (21)',
    );
    record(
      Array.isArray(byId.get(content.exact2024.id).albumIds)
      && byId.get(content.exact2024.id).albumIds.join() === albumOne.id,
      'albumIds carries a single membership (21)',
    );
    record(
      Array.isArray(byId.get(content.exact2026.id).albumIds) && byId.get(content.exact2026.id).albumIds.length === 0,
      'a Memory with no membership gets an empty albumIds array (21)',
    );
    record(
      byId.get(content.exact2024.id).albumId === undefined && byId.get(content.exact2024.id).album === undefined,
      'the Memory DTO does not embed Album objects (21)',
    );

    // ===============================================================
    // 22) DTO boundary
    // ===============================================================
    const forbidden = [
      'original_storage_path', 'originalStoragePath', 'preview_storage_path', 'previewStoragePath',
      'bucket', 'signedUrl', 'signed_url', 'previewUrl', 'preview_url',
      'householdId', 'household_id', 'lifecycle', 'storageId', 'intakeRequestId', 'intake_request_id',
      'trashed_at', 'trashedAt', 'folder_id', 'folderId', 'document_date', 'documentDate', 'note',
    ];
    const offending = [];
    for (const memory of all.memories) {
      for (const key of Object.keys(memory)) {
        if (forbidden.includes(key)) offending.push(`${memory.id}.${key}`);
      }
      const serialized = JSON.stringify(memory);
      if (serialized.includes(getHomeCloudBucket('original'))) offending.push(`${memory.id}:bucket-name`);
      if (serialized.includes(getHomeCloudBucket('preview'))) offending.push(`${memory.id}:preview-bucket-name`);
      if (serialized.includes(hhA)) offending.push(`${memory.id}:household-id`);
    }
    record(offending.length === 0, `read-model DTO filters every storage/service internal (${offending.slice(0, 3).join(', ') || 'clean'}) (22)`);

    const previewDto = byId.get(content.withPreview.id);
    record(previewDto.hasPreview === true, 'hasPreview is true when a preview exists (22)');
    record(byId.get(content.audio.id).hasPreview === false, 'hasPreview is false when there is no preview (22)');
    record(
      byId.get(content.written.id).hasPreview === false && byId.get(content.written.id).uploadedAt === null,
      'a Written Memory keeps hasPreview false and uploadedAt null (22)',
    );
    record(
      byId.get(content.written.id).hiddenFromResurfacing === true
      && byId.get(content.exact2026.id).hiddenFromResurfacing === false,
      'hiddenFromResurfacing is projected as persisted (22)',
    );

    // ===============================================================
    // pagination + filter input normalization
    // ===============================================================
    record((await listMemories(reqAdult, { limit: 0 })).memories.length === 1, 'limit below the minimum clamps to 1 (13)');
    record(
      (await listMemories(reqAdult, { limit: 1000 })).memories.length === all.memories.length,
      'limit above the maximum clamps to the hard cap (13)',
    );
    await expectReject(() => listMemories(reqAdult, { limit: 'abc' }), 'homecloud_invalid_limit', 'non-integer limit is a typed 400');
    await expectReject(() => listMemories(reqAdult, { offset: -1 }), 'homecloud_invalid_offset', 'negative offset is a typed 400');
    await expectReject(() => listMemories(reqAdult, { offset: 1.5 }), 'homecloud_invalid_offset', 'fractional offset is a typed 400');
    await expectReject(() => listMemories(reqAdult, { year: 0 }), 'homecloud_invalid_year_filter', 'year=0 is a typed 400');
    await expectReject(() => listMemories(reqAdult, { year: 20244 }), 'homecloud_invalid_year_filter', 'out-of-range year is a typed 400');

    const beyondEnd = await listMemories(reqAdult, { limit: 10, offset: 999 });
    record(
      beyondEnd.memories.length === 0 && beyondEnd.nextOffset === null,
      'an offset past the end returns an empty last page (13)',
    );
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
  }

  console.log(`\nHC4B1_MEMORIES_READ_MODEL_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('HC4B1_MEMORIES_READ_MODEL_TESTS=FAIL');
  } else {
    console.log('HC4B1_MEMORIES_READ_MODEL_TESTS=PASS');
  }
}

run().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
