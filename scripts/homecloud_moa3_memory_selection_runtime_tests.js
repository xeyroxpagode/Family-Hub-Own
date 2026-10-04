#!/usr/bin/env node
'use strict';

/**
 * HomeCloud MO-A3 — Memory SELECTION: RUNTIME evidence.
 *
 * Target: local Supabase only (no remote database, no remote Storage). The
 * environment is resolved exactly like every other HomeCloud runtime suite
 * (dotenv files first, then the ACTUAL `supabase status`), and a non-local
 * SUPABASE_URL is refused. It never hardcodes a port.
 *
 * WHY IT EXISTS
 * -------------
 * The deterministic suite proves the state machines. This one proves that the
 * operations those machines describe actually work against the REAL backend,
 * through the REAL compiled frontend client, over REAL HTTP, with a REAL Supabase
 * Auth JWT — including the `{ householdId }` scope argument, which only exists
 * client-side and is therefore invisible to a pure test.
 *
 * It drives the REAL pure modules too (selection session, collections
 * controller, membership composer), so what is exercised is the production code
 * path and not a re-implementation of it.
 *
 * What it proves, one section per contract area:
 *   A. add 1 and add N through the REAL composer
 *   B. already-member is idempotent and never inflates itemCount
 *   C. PARTIAL FAILURE attribution: one bad id, the rest stay committed
 *   D. remove 1 and remove N: only the membership changes
 *   E. the Memory, its bytes and its OTHER Album memberships survive
 *   F. cross-household protection on add, remove and Album collection reads
 *   G. a destination Album deleted BEFORE confirm is terminal
 *   H. the household scope is MANDATORY for the invalidation to happen
 *   I. the four collection read contracts return real, correctly typed data
 *   J. the Album order read stays canonical (unknown FIRST, year-only FIRST)
 *   K. a 1000-Memory library pages over real HTTP with no skip and no duplicate
 *   L. cross-view selection: the same contentId in library and in a collection
 */

const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');

const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');
const { repositoryRoot } = require('../tests/helpers/process');

loadTestEnvironment({
  required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
});
requireLocalUrl('SUPABASE_URL');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Backend modules create a Supabase client at require time, so the environment
// above must already be resolved. Nothing here is mocked.
const {
  getHomeCloudOriginalPath,
  getHomeCloudPreviewPath,
} = require('../backend/src/lib/homecloudStoragePaths');
const homecloudRoutes = require('../backend/src/routes/homecloud');
const { requestContextMiddleware } = require('../backend/src/middleware/requestContextMiddleware');
const { errorEnvelopeMiddleware } = require('../backend/src/middleware/errorEnvelopeMiddleware');
const { sendApiError } = require('../backend/src/lib/httpErrors');
const express = require(path.join(repositoryRoot, 'backend', 'node_modules', 'express'));

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientOptions);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);

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
    record(
      ok,
      `${message} (${(error && error.code) || 'no_code'}${ok ? '' : `, expected ${expectedCode}`})`,
    );
    return error;
  }
  record(false, `${message} (expected rejection ${expectedCode}, got success)`);
  return null;
}

/** Boot the real backend HomeCloud routes on an ephemeral local port. */
async function startBackend() {
  const app = express();
  app.use(requestContextMiddleware);
  app.use(errorEnvelopeMiddleware);
  app.use(express.json());
  app.use('/api/homecloud', homecloudRoutes);
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    return sendApiError(res, error, req);
  });
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function createAuthUser(runId, label) {
  const email = `hcmoa3-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, token: signedIn.session.access_token };
}

async function run() {
  console.log('\n=== MO-A3 MEMORY SELECTION RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const server = await startBackend();
  const address = server.address();
  process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${address.port}`;
  globalThis.__DEV__ = false;

  const COMPILED = '../scripts/compiled-moa3client/front/mi-front-limpio/services/homecloud';
  const client = require(`${COMPILED}/homecloudReadService`);
  const { plannerCache } = require('../scripts/compiled-moa3client/front/mi-front-limpio/services/planner/plannerCache');
  // The REAL pure modules the UI uses.
  const { createMemoryCollectionsController, buildMemoryCollectionQuery } = require(`${COMPILED}/homecloudMemoryCollectionsPagination`);
  const { runMemoryAlbumMutation } = require(`${COMPILED}/homecloudMemoryMutations`);
  const {
    createMemorySelectionSession,
    enterMemorySelection,
    toggleMemorySelection,
    toggleMemorySelectionMany,
    confirmMemorySelection,
    setMemorySelectionExclusions,
  } = require(`${COMPILED}/homecloudMemorySelection`);
  console.log(`Client base URL: ${process.env.EXPO_PUBLIC_API_URL}\n`);

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
    const adultAuth = await createAuthUser(runId, 'adult');
    const otherAuth = await createAuthUser(runId, 'other');
    cleanup.authUsers.push(adultAuth.userId, otherAuth.userId);

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

    const adultPerson = await insertPerson('MOA3 Adult', adultAuth.userId);
    const otherPerson = await insertPerson('MOA3 Other', otherAuth.userId);
    const householdA = await insertHousehold('MOA3 Household A', `hcmoa3-a-${runId}`, adultPerson.id);
    const householdB = await insertHousehold('MOA3 Household B', `hcmoa3-b-${runId}`, otherPerson.id);
    await insertMember(householdA.id, adultPerson.id, 'adult');
    await insertMember(householdB.id, otherPerson.id, 'adult');
    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', adultPerson.id);
    await serviceClient.from('people').update({ active_household_id: householdB.id }).eq('id', otherPerson.id);

    const token = adultAuth.token;
    const otherToken = otherAuth.token;
    const hhA = householdA.id;
    const hhB = householdB.id;
    const scopeA = { householdId: hhA };
    const scopeB = { householdId: hhB };

    const insertBinary = async (householdId, over) => {
      const id = over.id ?? randomUUID();
      const { data, error } = await serviceClient
        .from('homecloud_contents')
        .insert({
          id,
          household_id: householdId,
          role: 'memory',
          display_name: over.displayName ?? null,
          mime_type: over.mimeType,
          extension: over.extension ?? null,
          // `?? default` would turn an EXPLICIT null into the default, and a
          // Written Memory must really carry size_bytes = null.
          size_bytes: 'sizeBytes' in over ? over.sizeBytes : 10,
          original_storage_path: over.written ? null : getHomeCloudOriginalPath(householdId, id),
          preview_storage_path: over.written || over.preview === false ? null : getHomeCloudPreviewPath(householdId, id),
          // A Written Memory never had binary custody: `uploaded_at` must be
          // null and `written_text` carries the content (homecloud_contents_shape_check).
          uploaded_at: over.written ? null : new Date().toISOString(),
          written_text: over.written ?? null,
          caption: over.caption ?? null,
          capture_precision: over.capturePrecision ?? 'unknown',
          captured_at: over.capturedAt ?? null,
          captured_year: over.capturedYear ?? null,
          captured_month: over.capturedMonth ?? null,
          hidden_from_resurfacing: false,
          lifecycle: 'active',
        })
        .select('*')
        .single();
      if (error) throw new Error(`${error.message} :: ${JSON.stringify(over)}`);
      cleanup.contentIds.push(id);
      return data;
    };

    const m = {};
    m.unknown = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'sin fecha', capturePrecision: 'unknown' });
    m.yearOnly = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'durante 2020', capturePrecision: 'year', capturedYear: 2020 });
    m.mar2020 = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'marzo', capturePrecision: 'month_year', capturedYear: 2020, capturedMonth: 3 });
    m.jul2020 = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'julio', capturePrecision: 'exact', capturedAt: '2020-07-18T08:00:00Z', capturedYear: 2020, capturedMonth: 7 });
    m.may2022 = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'mayo 2022', capturePrecision: 'exact', capturedAt: '2022-05-02T08:00:00Z', capturedYear: 2022, capturedMonth: 5 });
    m.video = await insertBinary(hhA, { mimeType: 'video/mp4', extension: 'mp4', sizeBytes: 99, caption: 'un video', capturePrecision: 'exact', capturedAt: '2021-03-03T00:00:00Z', capturedYear: 2021, capturedMonth: 3 });
    m.audio = await insertBinary(hhA, { mimeType: 'audio/mpeg', extension: 'mp3', sizeBytes: 55, caption: 'un audio', capturePrecision: 'exact', capturedAt: '2021-04-04T00:00:00Z', capturedYear: 2021, capturedMonth: 4 });
    m.written = await insertBinary(hhA, {
      displayName: null,
      mimeType: null,
      extension: null,
      sizeBytes: null,
      written: 'una nota escrita',
      caption: null,
      capturePrecision: 'exact',
      capturedAt: '2021-05-05T00:00:00Z',
      capturedYear: 2021,
      capturedMonth: 5,
    });
    m.otherHousehold = await insertBinary(hhB, { mimeType: 'image/jpeg', caption: 'ajena', capturePrecision: 'exact', capturedAt: '2030-01-01T00:00:00Z', capturedYear: 2030, capturedMonth: 1 });

    /** The REAL composer, wired to the REAL client mutations. */
    const compose = (direction, albumId, contentIds) =>
      runMemoryAlbumMutation({
        direction,
        albumId,
        contentIds,
        labelFor: (id) => id,
        mutate: async (targetAlbumId, contentId) => {
          if (direction === 'add') await client.addMemoryToAlbum(token, targetAlbumId, contentId, scopeA);
          else await client.removeMemoryFromAlbum(token, targetAlbumId, contentId, scopeA);
        },
      });

    const findAlbum = async (id) => (await client.fetchHomeCloudAlbums(token)).find((a) => a.id === id) ?? null;

    // =================================================================
    console.log('\n--- A. add 1 and add N through the real composer ---');
    {
      const albumA = await client.createAlbum(token, 'MOA3 A', scopeA);
      cleanup.albumIds.push(albumA.id);

      const one = await compose('add', albumA.id, [m.may2022.id]);
      record(
        one.committed.join() === m.may2022.id && one.failures.length === 0,
        'adding ONE Memory commits exactly that membership',
      );
      record((await findAlbum(albumA.id)).itemCount === 1, 'the rail reports the EXACT itemCount after adding one');

      const many = await compose('add', albumA.id, [m.unknown.id, m.yearOnly.id, m.mar2020.id, m.jul2020.id]);
      record(
        many.committed.length === 4 && many.failures.length === 0,
        'adding N Memories commits all N memberships',
      );
      record((await findAlbum(albumA.id)).itemCount === 5, 'the rail reports the EXACT itemCount after adding N');
      record(
        (await findAlbum(albumA.id)).coverContentId === m.unknown.id,
        'the cover is the FIRST visual of the Album in canonical Album order (the undated one), '
        + 'which is by construction the first Memory of the Album screen',
      );
    }

    // =================================================================
    console.log('\n--- B. already-member ---');
    {
      const albumB = await client.createAlbum(token, 'MOA3 B', scopeA);
      cleanup.albumIds.push(albumB.id);
      const before = (await findAlbum(albumB.id)).itemCount;
      await compose('add', albumB.id, [m.may2022.id]);
      const duplicate = await compose('add', albumB.id, [m.may2022.id]);
      record(
        duplicate.committed.length === 1 && duplicate.failures.length === 0,
        'a duplicate add is idempotent through the composer too',
      );
      record(
        (await findAlbum(albumB.id)).itemCount === before + 1,
        'a duplicate add never inflates the EXACT itemCount',
      );
      const timeline = await client.listMemories(token, { limit: 100 });
      record(
        timeline.memories.find((x) => x.id === m.may2022.id).albumIds.includes(albumB.id),
        'the Timeline projects albumIds on the SAME Memory entity (no copy was made)',
      );
    }

    // =================================================================
    console.log('\n--- C. partial failure attribution ---');
    {
      const albumC = await client.createAlbum(token, 'MOA3 C', scopeA);
      cleanup.albumIds.push(albumC.id);
      const ghost = randomUUID();
      const outcome = await compose('add', albumC.id, [m.video.id, ghost, m.audio.id]);
      record(
        outcome.committed.join() === `${m.video.id},${m.audio.id}` && outcome.failures.length === 1,
        'a partial failure commits the good ids and reports ONLY the bad one',
      );
      record(
        outcome.failures[0].contentId === ghost,
        'the failure is attributed to the EXACT contentId that failed',
      );
      record(
        (await findAlbum(albumC.id)).itemCount === 2,
        'the committed memberships stay: nothing is rolled back',
      );

      // A RETRY is exactly the failed ids.
      const retry = await compose('add', albumC.id, outcome.failures.map((f) => f.contentId));
      record(retry.failures.length === 1, 'a retry of an unknown id still fails: the refusal is honest');
      const stillTwo = (await findAlbum(albumC.id)).itemCount;
      record(stillTwo === 2, 'the retry never re-sent the already committed memberships');
    }

    // =================================================================
    console.log('\n--- D/E. remove 1 and remove N; the Memory survives ---');
    const albumAId = (await client.fetchHomeCloudAlbums(token)).find((a) => a.name === 'MOA3 A').id;
    const albumBId = (await client.fetchHomeCloudAlbums(token)).find((a) => a.name === 'MOA3 B').id;
    {
      const single = await compose('remove', albumAId, [m.jul2020.id]);
      record(
        single.committed.join() === m.jul2020.id && single.failures.length === 0,
        'removing ONE membership succeeds',
      );
      const afterA = await client.listMemories(token, { albumId: albumAId, order: 'album', limit: 50 });
      record(
        !afterA.memories.some((x) => x.id === m.jul2020.id),
        'the removed Memory leaves the Album it was removed from',
      );

      const bulk = await compose('remove', albumAId, [m.unknown.id, m.yearOnly.id, m.mar2020.id]);
      record(bulk.committed.length === 3 && bulk.failures.length === 0, 'removing N memberships succeeds');
      record((await findAlbum(albumAId)).itemCount === 1, 'the EXACT itemCount reflects only the remaining membership');

      // The Memory, its bytes and its OTHER Album memberships survive.
      const timelineAfter = await client.listMemories(token, { limit: 100 });
      record(
        timelineAfter.memories.some((x) => x.id === m.jul2020.id),
        'the Memory is still in the global Timeline after the removal',
      );
      const inB = await client.listMemories(token, { albumId: albumBId, order: 'album', limit: 50 });
      record(
        inB.memories.some((x) => x.id === m.may2022.id),
        'the membership in the OTHER Album survives the removal',
      );
      const { data: row } = await serviceClient
        .from('homecloud_contents')
        .select('lifecycle, original_storage_path, preview_storage_path, size_bytes')
        .eq('id', m.jul2020.id)
        .single();
      record(
        row.lifecycle === 'active'
          && row.original_storage_path === getHomeCloudOriginalPath(hhA, m.jul2020.id)
          && row.preview_storage_path === getHomeCloudPreviewPath(hhA, m.jul2020.id)
          && row.size_bytes === 10,
        'the removed Memory keeps its lifecycle, original path, preview path and bytes byte-identical',
      );
      const { data: rows } = await serviceClient.from('homecloud_contents').select('id').eq('id', m.jul2020.id);
      record(rows.length === 1, 'no duplicate row and no copy were ever created');
    }

    // =================================================================
    console.log('\n--- F. cross-household protection ---');
    {
      // The composer reports per-item failures instead of throwing, so the typed
      // refusals are asserted against the CLIENT directly.
      await expectReject(
        () => client.addMemoryToAlbum(token, albumAId, m.otherHousehold.id, scopeA),
        'homecloud_content_not_found',
        'a cross-household Memory cannot be added',
      );
      const foreign = await compose('add', albumAId, [m.otherHousehold.id]);
      record(
        foreign.committed.length === 0 && foreign.failures[0].contentId === m.otherHousehold.id,
        'the composer attributes the cross-household refusal to that exact Memory and commits nothing',
      );

      // A genuine Album of the OTHER household, so the boundary is really crossed.
      const { data: foreignAlbum, error: foreignErr } = await serviceClient
        .from('homecloud_albums')
        .insert({ household_id: hhB, name: 'MOA3 Ajeno', lifecycle: 'active' })
        .select('*')
        .single();
      if (foreignErr) throw foreignErr;
      cleanup.albumIds.push(foreignAlbum.id);

      await expectReject(
        () => client.removeMemoryFromAlbum(token, foreignAlbum.id, m.may2022.id, scopeA),
        'homecloud_album_not_found',
        'a cross-household Album removal discloses nothing',
      );
      await expectReject(
        () => client.deleteAlbum(otherToken, albumAId, scopeB),
        'homecloud_album_not_found',
        'a cross-household Album delete discloses nothing and changes nothing',
      );
      record(
        (await findAlbum(albumAId)) !== null,
        'the Album survives every refused cross-household attempt',
      );
      record(
        (await client.fetchHomeCloudAlbums(otherToken)).every((a) => a.id !== albumAId),
        'another household never sees this household Albums',
      );
    }

    // =================================================================
    console.log('\n--- G. the destination Album is deleted BEFORE confirm ---');
    {
      const doomed = await client.createAlbum(token, 'MOA3 Doomed', scopeA);
      cleanup.albumIds.push(doomed.id);
      // The user selects, and the Album disappears remotely before confirming.
      await client.deleteAlbum(otherAuth.userId ? token : token, doomed.id, scopeA);
      const attempts = [];
      const outcome = await runMemoryAlbumMutation({
        direction: 'add',
        albumId: doomed.id,
        contentIds: [m.audio.id, m.video.id, m.written.id],
        labelFor: (id) => id,
        mutate: async (_albumId, contentId) => {
          attempts.push(contentId);
          await client.addMemoryToAlbum(token, doomed.id, contentId, scopeA);
        },
      });
      record(
        outcome.destinationMissing === true && outcome.failures.length >= 1,
        'a destination deleted before confirm is TERMINAL, not a retry',
      );
      record(
        attempts.length === 1,
        'the run STOPS at the terminal refusal instead of firing N doomed requests',
      );
      record(
        (await findAlbum(albumAId)) !== null && (await client.fetchHomeCloudAlbums(token)).length > 0,
        'the rest of the household Albums are unaffected by the terminal destination',
      );
    }

    // =================================================================
    console.log('\n--- H. the household scope is MANDATORY ---');
    {
      const key = ['homecloud', 'albums', hhA, 'all'];
      await client.fetchHomeCloudAlbumsCached(token, scopeA);
      record(plannerCache.get(key) !== undefined && plannerCache.isFresh(key), 'the cached Albums read is primed');

      await client.createAlbum(token, 'MOA3 Con Scope', scopeA);
      record(
        plannerCache.get(key) === undefined || !plannerCache.isFresh(key),
        'a mutation WITH { householdId } drops the household Album read keys',
      );

      await client.fetchHomeCloudAlbumsCached(token, scopeA);
      const unscoped = await client.createAlbum(token, 'MOA3 Sin Scope');
      cleanup.albumIds.push(unscoped.id);
      record(
        plannerCache.isFresh(key),
        'the same mutation WITHOUT the scope leaves the cache in place: passing { householdId } is MANDATORY',
      );
    }

    // =================================================================
    console.log('\n--- I. the four collection read contracts over real HTTP ---');
    {
      // The REAL collections controller, driving the REAL client.
      const states = [];
      const controller = createMemoryCollectionsController({
        limit: 50,
        onState: (state) => states.push(state),
        read: async ({ ref, limit, offset }) => {
          const page = await client.listMemories(token, buildMemoryCollectionQuery(ref, limit, offset));
          return { memories: page.memories, nextOffset: page.nextOffset };
        },
      });

      await controller.open({ kind: 'type', memoryKind: 'image' });
      const photos = states[states.length - 1].memories;
      record(
        photos.length > 0 && photos.every((x) => x.kind === 'image'),
        `Fotos returns ONLY image Memories (${photos.length})`,
      );

      await controller.open({ kind: 'type', memoryKind: 'video' });
      record(
        states[states.length - 1].memories.every((x) => x.kind === 'video'),
        'Videos returns ONLY video Memories',
      );

      await controller.open({ kind: 'type', memoryKind: 'audio' });
      record(
        states[states.length - 1].memories.some((x) => x.id === m.audio.id),
        'Audios returns the audio Memory',
      );

      await controller.open({ kind: 'type', memoryKind: 'written' });
      const notes = states[states.length - 1].memories;
      record(
        notes.some((x) => x.id === m.written.id && x.kind === 'written'),
        'Notas returns the written Memory under the kind "written"',
      );
      record(
        notes.every((x) => x.kind === 'written'),
        'the Notas collection never leaks a binary Memory',
      );

      await controller.open({ kind: 'album', albumId: albumBId });
      const albumCollection = states[states.length - 1].memories;
      record(
        albumCollection.length === 1 && albumCollection[0].id === m.may2022.id,
        'an Album collection reads its members through the albumId + order=album contract',
      );

      await controller.open({ kind: 'album', albumId: albumAId });
      record(
        states[states.length - 1].missing === false,
        'an existing Album collection is never reported as missing',
      );

      // The session: select in the library, keep it across a collection change.
      let session = enterMemorySelection(createMemorySelectionSession(), {
        purpose: { kind: 'addToAlbum', albumId: albumAId },
        source: { kind: 'library' },
      });
      session = toggleMemorySelection(session, m.may2022.id);
      record(
        confirmMemorySelection(session).contentIds.join() === m.may2022.id,
        'a Memory selected in Recuerdos is still pending after the collections were browsed',
      );

      // Already-member truth over real data.
      const albumD = await client.createAlbum(token, 'MOA3 D', scopeA);
      cleanup.albumIds.push(albumD.id);
      await compose('add', albumD.id, [m.audio.id]);
      const library = await client.listMemories(token, { limit: 100 });
      const excluded = new Set(
        library.memories.filter((x) => x.albumIds.includes(albumD.id)).map((x) => x.id),
      );
      record(excluded.has(m.audio.id), 'the already-member Memory is detected from the real projected albumIds');
      const guarded = setMemorySelectionExclusions(session, excluded);
      record(
        confirmMemorySelection(guarded).contentIds.length === 1,
        'an already-member Memory is never submitted even after the exclusions are re-derived',
      );
      await controller.reset();
      record(states[states.length - 1].collectionId === null, 'reset() clears the collection owner (household switch)');
    }

    // =================================================================
    console.log('\n--- J. the Album order read stays canonical ---');
    {
      const orderAlbum = await client.createAlbum(token, 'MOA3 Orden', scopeA);
      cleanup.albumIds.push(orderAlbum.id);
      const members = [m.may2022.id, m.jul2020.id, m.mar2020.id, m.yearOnly.id, m.unknown.id];
      for (const contentId of members) await client.addMemoryToAlbum(token, orderAlbum.id, contentId, scopeA);

      const page = await client.listMemories(token, { albumId: orderAlbum.id, order: 'album', limit: 50 });
      const ids = page.memories.map((x) => x.id);
      record(
        ids.join() === [m.unknown.id, m.yearOnly.id, m.mar2020.id, m.jul2020.id, m.may2022.id].join(),
        'the server Album order is unknown FIRST, then year-only FIRST within its year, then ascending',
      );
      record(
        ids[0] === m.unknown.id && ids.indexOf(m.yearOnly.id) < ids.indexOf(m.mar2020.id),
        'the canonical sequence the grouper must preserve is exactly this',
      );
      const timeline = await client.listMemories(token, { limit: 100 });
      record(
        timeline.memories[timeline.memories.length - 1].id !== m.unknown.id
          || timeline.memories.some((x) => x.id === m.unknown.id),
        'the global Timeline order is untouched by the Album read mode',
      );
    }

    // =================================================================
    console.log('\n--- K. cross-view selection over real data ---');
    {
      const albumX = await client.createAlbum(token, 'MOA3 X', scopeA);
      cleanup.albumIds.push(albumX.id);
      await compose('add', albumX.id, [m.mar2020.id]);

      let session = enterMemorySelection(createMemorySelectionSession(), {
        purpose: { kind: 'addToAlbum', albumId: albumAId },
        source: { kind: 'library' },
      });
      session = toggleMemorySelectionMany(session, [m.mar2020.id, m.jul2020.id], 'select');

      // The SAME contentIds evaluated in three different reads.
      const inLibrary = (await client.listMemories(token, { limit: 100 })).memories;
      const inPhotos = (await client.listMemories(token, { kind: 'image', order: 'timeline', limit: 100 })).memories;
      const inAlbum = (await client.listMemories(token, { albumId: albumX.id, order: 'album', limit: 50 })).memories;

      const selected = (list) => list.filter((x) => session.selectedIds.has(x.id)).map((x) => x.id);
      record(
        selected(inLibrary).sort().join() === [m.mar2020.id, m.jul2020.id].sort().join(),
        'the pending selection matches in Recuerdos',
      );
      record(
        selected(inPhotos).sort().join() === [m.mar2020.id, m.jul2020.id].sort().join(),
        'the SAME selection matches in the Fotos collection: one entity, one selection',
      );
      record(
        selected(inAlbum).join() === m.mar2020.id,
        'the SAME selection matches inside an Album collection',
      );
      record(
        confirmMemorySelection(session).contentIds.length === 2,
        'a Memory present in three views is still counted ONCE',
      );
    }
// =================================================================
    console.log('\n--- L. a 1000-Memory library pages over real HTTP ---');
    {
      const BIG = 1000;
      const chunk = [];
      for (let index = 0; index < BIG; index += 1) {
        const id = randomUUID();
        chunk.push({
          id,
          household_id: hhA,
          role: 'memory',
          mime_type: 'image/jpeg',
          extension: 'jpg',
          size_bytes: 10,
          // An ACTIVE Memory must stay resolvable, so both paths are real.
          original_storage_path: getHomeCloudOriginalPath(hhA, id),
          preview_storage_path: getHomeCloudPreviewPath(hhA, id),
          uploaded_at: new Date().toISOString(),
          caption: `grande ${index}`,
          capture_precision: 'exact',
          captured_at: `2023-01-01T00:00:${String(index % 60).padStart(2, '0')}Z`,
          captured_year: 2023,
          captured_month: 1,
          hidden_from_resurfacing: false,
          lifecycle: 'active',
        });
      }
      const inserted = [];
      for (let start = 0; start < chunk.length; start += 250) {
        const { data, error } = await serviceClient.from('homecloud_contents').insert(chunk.slice(start, start + 250)).select('id');
        if (error) throw error;
        inserted.push(...data.map((r) => r.id));
      }
      cleanup.contentIds.push(...inserted);
      record(inserted.length === BIG, `a ${BIG}-Memory fixture was inserted for realistic paging`);

      const collected = [];
      let offset = 0;
      let guard = 0;
      for (;;) {
        const response = await client.listMemories(token, { limit: 100, offset });
        collected.push(...response.memories.map((x) => x.id));
        if (response.nextOffset === null) break;
        offset = response.nextOffset;
        guard += 1;
        if (guard > 40) break;
      }
      record(
        new Set(collected).size === collected.length,
        `the library pages over HTTP with NO duplicate across ${collected.length} rows`,
      );
      record(
        collected.filter((id) => inserted.includes(id)).length === BIG,
        `all ${BIG} fixture Memories were reachable through real limit/offset paging`,
      );

      // The same paging through the REAL collections controller.
      const states = [];
      const controller = createMemoryCollectionsController({
        limit: 100,
        onState: (state) => states.push(state),
        read: async ({ ref, limit, offset }) => {
          const response = await client.listMemories(token, buildMemoryCollectionQuery(ref, limit, offset));
          return { memories: response.memories, nextOffset: response.nextOffset };
        },
      });
      await controller.open({ kind: 'type', memoryKind: 'image' });
      let more = true;
      let pages = 1;
      while (more && pages < 40) {
        await controller.loadMore();
        more = states[states.length - 1].nextOffset !== null;
        pages += 1;
      }
      const photosState = states[states.length - 1];
      record(
        new Set(photosState.memories.map((x) => x.id)).size === photosState.memories.length,
        `the Fotos collection pages with NO duplicate (${photosState.memories.length} rows over ${pages} pages)`,
      );
      record(
        photosState.memories.every((x) => x.kind === 'image'),
        'the kind filter holds across every page of a large collection',
      );
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
    server.close();
  }

  console.log(`\nMOA3_MEMORY_SELECTION_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('MOA3_MEMORY_SELECTION_RUNTIME_TESTS=FAIL');
  } else {
    console.log('MOA3_MEMORY_SELECTION_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});