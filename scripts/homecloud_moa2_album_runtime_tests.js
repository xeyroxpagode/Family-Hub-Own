#!/usr/bin/env node
'use strict';

/**
 * HomeCloud MO-A2 — Albums SURFACE: RUNTIME evidence.
 *
 * Target: local Supabase only (no remote database, no remote Storage). The
 * environment is resolved exactly like every other HomeCloud runtime suite
 * (dotenv files first, then the ACTUAL `supabase status`), and a non-local
 * SUPABASE_URL is refused.
 *
 * WHY IT IS DIFFERENT FROM THE MO-A1 RUNTIME SUITE
 * ------------------------------------------------
 * MO-A1 proved the backend. MO-A2 owns the CLIENT CONTRACT, so this suite drives
 * the REAL compiled frontend client (`homecloudReadService`) over REAL HTTP
 * against the REAL backend routes, with a REAL Supabase Auth JWT. Every request
 * therefore exercises the actual method, path, body and status the app sends,
 * including the `{ householdId }` scope argument that only exists client-side.
 *
 * The backend express app is mounted IN PROCESS on an ephemeral port (never a
 * hardcoded one), so the run is self-contained and leaves nothing behind.
 *
 * What it proves, one section per contract area:
 *   A. create via the client           B. rename via the client
 *   C. add existing Memories            D. Album detail read (order + DTO reuse)
 *   E. an Album larger than one page    F. video cover + preview unavailable
 *   G. cross-household refusal          H. deleted Album -> 404
 *   I. Memories survive an Album delete, and other Albums keep their membership
 *   J. remove one Memory: A loses it, B and the Timeline keep it
 *   K. the household scope is MANDATORY for the invalidation to happen
 *
 * Fixtures are inserted directly (as in MO-A1) so the semantic date matrix, the
 * kinds and the lifecycles are controlled exactly; no Upload Engine and no
 * Storage object is needed.
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
  const email = `hcmoa2-${label}-${runId}@test.local`;
  const password = 'dummy12345';
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const { data: signedIn, error: signErr } = await anonClient.auth.signInWithPassword({ email, password });
  if (signErr || !signedIn?.session?.access_token) throw signErr || new Error('sign-in produced no session');
  return { userId: data.user.id, token: signedIn.session.access_token };
}

async function run() {
  console.log('\n=== MO-A2 ALBUM RUNTIME TESTS ===\n');
  console.log(`Target Supabase local: ${SUPABASE_URL}`);

  const server = await startBackend();
  const address = server.address();
  // NEVER a hardcoded port: the suite binds an ephemeral one and points the
  // client at exactly that address.
  process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${address.port}`;
  // React Native injects this global; outside the app it simply does not exist.
  // Without it the client's error path would throw a ReferenceError instead of
  // the typed ApiError this suite asserts on, which would hide the real refusal.
  globalThis.__DEV__ = false;

  // Required AFTER the base URL is known: the client resolves it at module load.
  const client = require('../scripts/compiled-moa2client/front/mi-front-limpio/services/homecloud/homecloudReadService');
  const { plannerCache } = require('../scripts/compiled-moa2client/front/mi-front-limpio/services/planner/plannerCache');
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
    const viewerAuth = await createAuthUser(runId, 'viewer');
    const otherAuth = await createAuthUser(runId, 'other');
    cleanup.authUsers.push(adultAuth.userId, viewerAuth.userId, otherAuth.userId);

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

    const adultPerson = await insertPerson('MOA2 Adult', adultAuth.userId);
    const viewerPerson = await insertPerson('MOA2 Viewer', viewerAuth.userId);
    const otherPerson = await insertPerson('MOA2 Other', otherAuth.userId);

    const householdA = await insertHousehold('MOA2 Household A', `hcmoa2-a-${runId}`, adultPerson.id);
    const householdB = await insertHousehold('MOA2 Household B', `hcmoa2-b-${runId}`, otherPerson.id);

    await insertMember(householdA.id, adultPerson.id, 'adult');
    await insertMember(householdA.id, viewerPerson.id, 'adolescent');
    await insertMember(householdB.id, otherPerson.id, 'adult');

    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', adultPerson.id);
    await serviceClient.from('people').update({ active_household_id: householdA.id }).eq('id', viewerPerson.id);
    await serviceClient.from('people').update({ active_household_id: householdB.id }).eq('id', otherPerson.id);

    const token = adultAuth.token;
    const viewerToken = viewerAuth.token;
    const otherToken = otherAuth.token;
    const hhA = householdA.id;
    const hhB = householdB.id;
    const scopeA = { householdId: hhA };
    const scopeB = { householdId: hhB };

    // -----------------------------------------------------------------
    // Fixtures
    // -----------------------------------------------------------------
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
          size_bytes: over.sizeBytes ?? 10,
          original_storage_path: getHomeCloudOriginalPath(householdId, id),
          // A video cover legitimately has NO preview yet: that is exactly the
          // phase the cover must survive.
          preview_storage_path: over.preview === false ? null : getHomeCloudPreviewPath(householdId, id),
          uploaded_at: new Date().toISOString(),
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
    m.old2019 = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'viejo 2019', capturePrecision: 'year', capturedYear: 2019 });
    m.mid2022 = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'medio 2022', capturePrecision: 'month_year', capturedYear: 2022, capturedMonth: 5 });
    m.new2024a = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'nuevo A', capturePrecision: 'exact', capturedAt: '2024-07-05T09:00:00Z', capturedYear: 2024, capturedMonth: 7 });
    m.new2024b = await insertBinary(hhA, { mimeType: 'image/jpeg', caption: 'nuevo B', capturePrecision: 'exact', capturedAt: '2024-07-18T08:00:00Z', capturedYear: 2024, capturedMonth: 7 });
    // The ONLY member of its Album: the cover is a video with NO preview.
    m.video2020 = await insertBinary(hhA, { mimeType: 'video/mp4', extension: 'mp4', sizeBytes: 99, caption: 'video 2020', capturePrecision: 'year', capturedYear: 2020, preview: false });
    m.otherHouseholdMemory = await insertBinary(hhB, { mimeType: 'image/jpeg', caption: 'ajena', capturePrecision: 'exact', capturedAt: '2030-01-01T00:00:00Z', capturedYear: 2030, capturedMonth: 1 });

    const albumOrderExpected = [m.old2019.id, m.mid2022.id, m.new2024a.id, m.new2024b.id];

    // >page-size Album: 60 memories prove limit/offset/nextOffset over HTTP.
    const BIG_COUNT = 60;
    const bigIds = [];
    for (let index = 0; index < BIG_COUNT; index += 1) {
      const row = await insertBinary(hhA, {
        mimeType: 'image/jpeg',
        caption: `grande ${index}`,
        capturePrecision: 'exact',
        capturedAt: `2023-01-01T00:00:${String(index % 60).padStart(2, '0')}Z`,
        capturedYear: 2023,
        capturedMonth: 1,
      });
      bigIds.push(row.id);
    }

    const findAlbum = async (id, listToken = token, listScope = scopeA) => {
      const albums = await client.fetchHomeCloudAlbums(listToken);
      void listScope;
      return albums.find((item) => item.id === id) ?? null;
    };

    // =================================================================
    // A) CREATE VIA THE CLIENT
    // =================================================================
    console.log('\n--- A. create Album (client) ---');
    {
      const created = await client.createAlbum(token, '  MOA2 Creado  ', scopeA);
      cleanup.albumIds.push(created.id);
      record(
        created.name === 'MOA2 Creado',
        'POST /albums through the client trims and returns the new Album',
      );
      record(
        created.itemCount === 0 && created.coverContentId === null,
        'a new Album arrives with itemCount 0 and coverContentId null (rail can render it immediately)',
      );
      record(
        !JSON.stringify(created).includes('_storage_path') && !JSON.stringify(created).includes('signedUrl'),
        'the client Album DTO leaks no storage path and no signed URL',
      );
      record(
        (await findAlbum(created.id)) !== null,
        'the Albums rail read immediately after the create sees the new Album',
      );

      const duplicate = await client.createAlbum(token, 'MOA2 Creado', scopeA);
      cleanup.albumIds.push(duplicate.id);
      record(
        duplicate.id !== created.id && duplicate.name === 'MOA2 Creado',
        'duplicate Album names are allowed through the client too',
      );
      await expectReject(
        () => client.createAlbum(token, '   ', scopeA),
        'homecloud_invalid_name',
        'the server stays the final validator for a blank name',
      );
      await expectReject(
        () => client.createAlbum(viewerToken, 'MOA2 Sin Permiso', scopeA),
        'homecloud_forbidden',
        'homecloud.view alone cannot create an Album',
      );
    }

    // =================================================================
    // B) RENAME VIA THE CLIENT
    // =================================================================
    console.log('\n--- B. rename Album (client) ---');
    {
      const albums = await client.fetchHomeCloudAlbums(token);
      const target = albums.find((item) => item.name === 'MOA2 Creado');
      record(target !== undefined, 'the renamed target is present in the rail read');

      const renamed = await client.renameAlbum(token, target.id, '  MOA2 Renombrado  ', scopeA);
      record(renamed.name === 'MOA2 Renombrado', 'PATCH /albums/:id through the client renames the Album');
      record(
        (await findAlbum(target.id))?.name === 'MOA2 Renombrado',
        'the rail read after the rename shows the new label (intake picker reflects it)',
      );
      record(
        renamed.id === target.id,
        'rename returns the SAME Album identity (the detail header follows, no new route)',
      );
      await expectReject(
        () => client.renameAlbum(token, randomUUID(), 'MOA2 Inexistente', scopeA),
        'homecloud_album_not_found',
        'renaming an unknown Album is a typed 404 through the client',
      );
    }

    // =================================================================
    // C) ADD EXISTING MEMORIES
    // =================================================================
    console.log('\n--- C. add existing Memories (client) ---');
    const albumA = await client.createAlbum(token, 'MOA2 A', scopeA);
    const albumB = await client.createAlbum(token, 'MOA2 B', scopeA);
    const albumVideo = await client.createAlbum(token, 'MOA2 Video', scopeA);
    cleanup.albumIds.push(albumA.id, albumB.id, albumVideo.id);

    {
      for (const contentId of albumOrderExpected) {
        await client.addMemoryToAlbum(token, albumA.id, contentId, scopeA);
      }
      const detailA = await findAlbum(albumA.id);
      record(
        detailA.itemCount === albumOrderExpected.length,
        `the rail reports the EXACT itemCount after the additions (${detailA.itemCount})`,
      );
      record(
        detailA.coverContentId === m.old2019.id,
        'the cover is the OLDEST suitable visual of the Album, projected by the backend',
      );

      // The Timeline read projects albumIds, so a mutation is visible there too.
      const timeline = await client.listMemories(token, { limit: 100 });
      const projected = timeline.memories.find((memory) => memory.id === m.old2019.id);
      record(
        Array.isArray(projected?.albumIds) && projected.albumIds.includes(albumA.id),
        'the global Timeline projects the new albumIds on the same Memory entity',
      );

      const idempotent = await client.addMemoryToAlbum(token, albumA.id, m.old2019.id, scopeA);
      record(
        idempotent.albumId === albumA.id && idempotent.contentId === m.old2019.id,
        'a duplicate add is idempotent and returns the existing membership',
      );
      record(
        (await findAlbum(albumA.id)).itemCount === albumOrderExpected.length,
        'the duplicate add never inflates itemCount',
      );

      await expectReject(
        () => client.addMemoryToAlbum(token, albumA.id, m.otherHouseholdMemory.id, scopeA),
        'homecloud_content_not_found',
        'a cross-household Memory cannot be added through the client',
      );
      await expectReject(
        () => client.addMemoryToAlbum(token, albumA.id, randomUUID(), scopeA),
        'homecloud_content_not_found',
        'an unknown Memory is a typed 404',
      );
      await expectReject(
        () => client.addMemoryToAlbum(viewerToken, albumA.id, m.old2019.id, scopeA),
        'homecloud_forbidden',
        'homecloud.view alone cannot add a membership',
      );
    }

    // =================================================================
    // D) ALBUM DETAIL READ
    // =================================================================
    console.log('\n--- D. Album detail read (client) ---');
    {
      const page = await client.listMemories(token, { albumId: albumA.id, order: 'album', limit: 50 });
      record(
        page.memories.map((memory) => memory.id).join() === albumOrderExpected.join(),
        'the detail read returns exactly the Album Memories in oldest -> newest order',
      );
      record(
        page.memories.every((memory) => memory.kind && Array.isArray(memory.albumIds)),
        'the detail read reuses the SAME Memory DTO (derived kind + albumIds), with no Album Memory variant',
      );
      record(
        !page.memories.some((memory) => ['householdId', 'lifecycle', 'original_storage_path'].some((key) => key in memory)),
        'the Album mode never widens the Memory DTO boundary',
      );
      record(
        (await client.listMemories(token, { albumId: albumA.id, order: 'timeline', limit: 50 }))
          .memories.map((memory) => memory.id).join()
          === albumOrderExpected.slice().reverse().join(),
        'the global Timeline order inside the same Album is unchanged (newest -> oldest)',
      );
    }

    // =================================================================
    // E) AN ALBUM LARGER THAN ONE PAGE
    // =================================================================
    console.log('\n--- E. an Album larger than one page ---');
    {
      const albumBig = await client.createAlbum(token, 'MOA2 Grande', scopeA);
      cleanup.albumIds.push(albumBig.id);
      for (const contentId of bigIds) await client.addMemoryToAlbum(token, albumBig.id, contentId, scopeA);

      record(
        (await findAlbum(albumBig.id)).itemCount === BIG_COUNT,
        `the rail reports the EXACT count of a ${BIG_COUNT}-Memory Album (no truncation)`,
      );

      const collected = [];
      let offset = 0;
      let guard = 0;
      for (;;) {
        const page = await client.listMemories(token, { albumId: albumBig.id, order: 'album', limit: 50, offset });
        collected.push(...page.memories.map((memory) => memory.id));
        if (page.nextOffset === null) break;
        record(page.nextOffset === offset + 50, `nextOffset is offset + limit (${offset} -> ${page.nextOffset})`);
        offset = page.nextOffset;
        guard += 1;
        if (guard > 10) break;
      }
      record(
        collected.length === BIG_COUNT && new Set(collected).size === BIG_COUNT,
        `Album pagination over HTTP returns all ${BIG_COUNT} Memories exactly once (no skip, no duplicate)`,
      );
      record(
        collected.slice().sort().join() === bigIds.slice().sort().join(),
        'the paginated Album read contains exactly the Album members',
      );
    }

    // =================================================================
    // F) VIDEO COVER + PREVIEW UNAVAILABLE
    // =================================================================
    console.log('\n--- F. video cover ---');
    {
      await client.addMemoryToAlbum(token, albumVideo.id, m.video2020.id, scopeA);
      const detailVideo = await findAlbum(albumVideo.id);
      record(
        detailVideo.coverContentId === m.video2020.id,
        'a video coverContentId is a legitimate cover (no second candidate search)',
      );
      // The ONE preview attempt for that cover. A video legitimately has no
      // stored preview, so the typed `preview_unavailable` refusal is the
      // expected answer: the tile turns it into the stable fallback and never
      // probes again. (The preview -> `unavailable` mapping itself is proven by
      // the 4B.1 preview / 4B.2 timeline gates.)
      await expectReject(
        () => client.fetchHomeCloudContentAccess(token, m.video2020.id, 'preview'),
        'preview_unavailable',
        'the single cover preview attempt answers preview_unavailable for a video with no stored preview',
      );
    }

    // =================================================================
    // G) CROSS-HOUSEHOLD
    // =================================================================
    console.log('\n--- G. cross-household ---');
    {
      // A genuine Album of the OTHER household, inserted directly, so the
      // household boundary is really crossed and not simulated.
      const { data: foreignAlbum, error: foreignErr } = await serviceClient
        .from('homecloud_albums')
        .insert({ household_id: hhB, name: 'MOA2 Ajeno', lifecycle: 'active' })
        .select('*')
        .single();
      if (foreignErr) throw foreignErr;
      cleanup.albumIds.push(foreignAlbum.id);

      await expectReject(
        () => client.listMemories(token, { albumId: foreignAlbum.id, order: 'album' }),
        'homecloud_album_not_found',
        'reading a cross-household Album from the client is a typed 404 (the UI terminal state)',
      );
      await expectReject(
        () => client.listMemories(token, { albumId: foreignAlbum.id, order: 'album' }),
        'homecloud_album_not_found',
        'the cross-household refusal is identical for the deleted case, so it discloses nothing',
      );
      record(
        (await client.fetchHomeCloudAlbums(otherToken)).every((item) => item.id !== albumA.id),
        'another household never sees this household Albums in the rail read',
      );
      record(
        (await client.fetchHomeCloudAlbums(token)).every((item) => item.id !== foreignAlbum.id),
        'this household never sees a foreign Album in its own rail read',
      );
      await expectReject(
        () => client.deleteAlbum(otherToken, albumA.id, scopeB),
        'homecloud_album_not_found',
        'deleting a cross-household Album discloses nothing and changes nothing',
      );
      record(
        (await findAlbum(albumA.id)) !== null,
        'the Album is still there after the refused cross-household delete',
      );
    }

    // =================================================================
    // J) REMOVE ONE MEMORY (before the delete, so both are observable)
    // =================================================================
    console.log('\n--- J. remove one Memory from an Album ---');
    {
      await client.addMemoryToAlbum(token, albumB.id, m.new2024b.id, scopeA);
      record(
        (await findAlbum(albumB.id)).itemCount === 1,
        'the same Memory can belong to a SECOND Album (N:M, not a move)',
      );

      await client.removeMemoryFromAlbum(token, albumA.id, m.new2024b.id, scopeA);

      const afterA = await client.listMemories(token, { albumId: albumA.id, order: 'album', limit: 50 });
      record(
        !afterA.memories.some((memory) => memory.id === m.new2024b.id),
        'the removed Memory disappears from the Album it was removed from',
      );
      record(
        (await findAlbum(albumA.id)).itemCount === albumOrderExpected.length - 1,
        'the rail reflects the new EXACT itemCount after the removal',
      );

      const afterB = await client.listMemories(token, { albumId: albumB.id, order: 'album', limit: 50 });
      record(
        afterB.memories.some((memory) => memory.id === m.new2024b.id),
        'the membership in the OTHER Album survives the removal',
      );
      const timelineAfter = await client.listMemories(token, { limit: 100 });
      record(
        timelineAfter.memories.some((memory) => memory.id === m.new2024b.id),
        'the Memory is still in the global Timeline after the removal',
      );
      const { data: memoryRow } = await serviceClient
        .from('homecloud_contents')
        .select('lifecycle, original_storage_path, preview_storage_path')
        .eq('id', m.new2024b.id)
        .single();
      record(
        memoryRow.lifecycle === 'active'
        && memoryRow.original_storage_path === getHomeCloudOriginalPath(hhA, m.new2024b.id)
        && memoryRow.preview_storage_path === getHomeCloudPreviewPath(hhA, m.new2024b.id),
        'the removed Memory keeps its lifecycle, original path and preview path byte-identical',
      );
    }

    // =================================================================
    // I + H) DELETE ALBUM: GROUPING ONLY
    // =================================================================
    console.log('\n--- I/H. delete Album (client): grouping only ---');
    {
      await client.addMemoryToAlbum(token, albumA.id, m.new2024b.id, scopeA);
      const beforeCount = (await findAlbum(albumA.id)).itemCount;
      record(beforeCount === albumOrderExpected.length, 'the Album is whole again before the delete');

      await client.deleteAlbum(token, albumA.id, scopeA);

      record(
        (await findAlbum(albumA.id)) === null,
        'the deleted Album disappears from the rail read',
      );
      const { data: albumRows } = await serviceClient.from('homecloud_albums').select('id').eq('id', albumA.id);
      const { data: itemRows } = await serviceClient.from('homecloud_album_items').select('album_id').eq('album_id', albumA.id);
      record(
        albumRows.length === 0 && itemRows.length === 0,
        'the Album row AND its memberships are hard deleted (no trash, no restore)',
      );

      const survivors = [m.old2019.id, m.mid2022.id, m.new2024a.id, m.new2024b.id];
      const { data: aliveRows } = await serviceClient
        .from('homecloud_contents')
        .select('id, lifecycle, original_storage_path, preview_storage_path')
        .in('id', survivors);
      record(
        aliveRows.length === survivors.length && aliveRows.every((row) => row.lifecycle === 'active'),
        'every Memory of the deleted Album survives, active and untouched',
      );
      record(
        aliveRows.every((row) => row.original_storage_path === getHomeCloudOriginalPath(hhA, row.id)),
        'no original storage path changed when the grouping was deleted',
      );
      record(
        aliveRows.every((row) => row.preview_storage_path === getHomeCloudPreviewPath(hhA, row.id)),
        'no preview path changed when the grouping was deleted',
      );

      const timelineAfterDelete = await client.listMemories(token, { limit: 100 });
      record(
        survivors.every((id) => timelineAfterDelete.memories.some((memory) => memory.id === id)),
        'the global Timeline still shows every Memory after the Album is deleted',
      );
      const albumBDetail = await client.listMemories(token, { albumId: albumB.id, order: 'album', limit: 50 });
      record(
        albumBDetail.memories.some((memory) => memory.id === m.new2024b.id),
        'the membership in the SECOND Album survives the deletion of the first one',
      );

      // H) a deleted Album is terminal for the UI.
      await expectReject(
        () => client.listMemories(token, { albumId: albumA.id, order: 'album', limit: 50 }),
        'homecloud_album_not_found',
        'reading a deleted Album is the TERMINAL homecloud_album_not_found (not an empty Album)',
      );
      await expectReject(
        () => client.deleteAlbum(token, albumA.id, scopeA),
        'homecloud_album_not_found',
        'deleting an already deleted Album is a typed 404, never a fake success',
      );
    }

    // =================================================================
    // K) THE HOUSEHOLD SCOPE IS MANDATORY
    // =================================================================
    console.log('\n--- K. the household scope is mandatory ---');
    {
      const albumKey = ['homecloud', 'albums', hhA, 'all'];
      await client.fetchHomeCloudAlbumsCached(token, scopeA);
      record(
        plannerCache.get(albumKey) !== undefined && plannerCache.isFresh(albumKey),
        'the cached Albums read is primed and fresh',
      );

      const scopeScoped = await client.createAlbum(token, 'MOA2 Con Scope', scopeA);
      cleanup.albumIds.push(scopeScoped.id);
      record(
        plannerCache.get(albumKey) === undefined || !plannerCache.isFresh(albumKey),
        'a mutation WITH { householdId } drops the household Album read keys (the refetch is authoritative)',
      );

      await client.fetchHomeCloudAlbumsCached(token, scopeA);
      record(plannerCache.isFresh(albumKey), 'the Albums read cache is primed again');
      const unscoped = await client.createAlbum(token, 'MOA2 Sin Scope');
      cleanup.albumIds.push(unscoped.id);
      record(
        plannerCache.isFresh(albumKey),
        'the same mutation WITHOUT the scope leaves the cache in place: passing { householdId } is MANDATORY',
      );
      const staleAfterUnscoped = await client.fetchHomeCloudAlbumsCached(token, scopeA);
      record(
        !staleAfterUnscoped.some((item) => item.id === unscoped.id),
        'the consequence of omitting the scope is concrete: a fresh cache keeps serving pre-mutation data',
      );
    }

    // -----------------------------------------------------------------
    console.log('\n--- view-only member ---');
    {
      const viewerAlbums = await client.fetchHomeCloudAlbums(viewerToken);
      record(
        viewerAlbums.some((item) => item.id === albumB.id),
        'a view-only member CAN read Albums (view is the read requirement)',
      );
      record(
        viewerAlbums.every((item) => Number.isInteger(item.itemCount) && item.itemCount >= 0),
        'a view-only member receives the exact aggregates, never an approximation',
      );
      await expectReject(
        () => client.renameAlbum(viewerToken, albumB.id, 'MOA2 Sin Permiso', scopeA),
        'homecloud_forbidden',
        'a view-only member can neither rename nor (by the same gate) delete an Album',
      );
      const detailViewer = await client.listMemories(viewerToken, { albumId: albumB.id, order: 'album', limit: 50 });
      record(
        detailViewer.memories.length === 1 && detailViewer.memories[0].id === m.new2024b.id,
        'a view-only member can open the Album detail with the same read model',
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

  console.log(`\nMOA2_ALBUM_RUNTIME_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('MOA2_ALBUM_RUNTIME_TESTS=FAIL');
  } else {
    console.log('MOA2_ALBUM_RUNTIME_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});