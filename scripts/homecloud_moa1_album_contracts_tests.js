#!/usr/bin/env node
'use strict';

/**
 * HomeCloud MO-A1 — Album contract / backend / read model: DETERMINISTIC gate.
 *
 * No database and no network. It pins the parts of the MO-A Albums contract
 * that are pure contract, so a regression is caught before any runtime cost:
 *
 *   1. capability model (no invented capability, organize, delete NOT needed)
 *   2. Album DTO contract (exact itemCount, content-id cover, no storage leak)
 *   3. Album presentation order vs the untouched Timeline order
 *   4. cover suitability (visual only) and comparator totality
 *   5. mutation route surface (exactly five, legacy primitive preserved)
 *   6. schema freeze (no migration touches the Album schema)
 *   7. read-model boundaries (one Memory mapper, no AlbumMemory DTO)
 *   8. shared upload foundation decoupling + client contract without UI
 *
 * The runtime behaviour of the same contract (real mutations, exact counts,
 * covers, ordering, permissions) is proven by
 * scripts/homecloud_moa1_album_runtime_tests.js.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The backend modules create a Supabase client at require time. Placeholder
// credentials are enough: this gate performs NO query and NO network call.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'moa1-deterministic-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'moa1-deterministic-service';

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

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

function check(label, fn) {
  try {
    fn();
    record(true, label);
  } catch (error) {
    record(false, `${label} :: ${error.message}`);
  }
}

console.log('\n=== MO-A1 ALBUM CONTRACT DETERMINISTIC TESTS ===\n');

const {
  mapAlbumRowToDto,
  isAlbumCoverCandidate,
  HOME_CLOUD_ALBUM_COVER_KINDS,
} = require('../backend/src/lib/homecloudMappers');
const {
  HOMECLOUD_CAPABILITIES,
  resolveHomeCloudCapabilities,
  assertKnownHomeCloudCapability,
} = require('../backend/src/lib/homecloudCapabilities');
const {
  TIMELINE_MEMORIES_ORDER,
  ALBUM_MEMORIES_ORDER,
  MEMORIES_ORDER_MODES,
  compareMemoriesInAlbumOrder,
  ALBUM_AGGREGATE_PAGE_SIZE,
} = require('../backend/src/services/homecloudReadService');

const albumService = require('../backend/src/services/homecloudAlbumService');
const albumServiceSource = read('backend/src/services/homecloudAlbumService.js');
const readServiceSource = read('backend/src/services/homecloudReadService.js');
const routes = require('../backend/src/routes/homecloud.js');

// ===========================================================================
// 1) CAPABILITY MODEL
// ===========================================================================
console.log('--- 1. capability model ---');

check('the HomeCloud catalog still declares exactly the four V1 capabilities', () => {
  assert.deepEqual([...HOMECLOUD_CAPABILITIES], [
    'homecloud.view',
    'homecloud.contribute',
    'homecloud.organize',
    'homecloud.delete',
  ]);
});

check('no invented manage_albums capability exists', () => {
  assert.throws(
    () => assertKnownHomeCloudCapability('homecloud.manage_albums'),
    (error) => error.code === 'homecloud_unknown_capability' && error.statusCode === 400,
  );
  assert.ok(!HOMECLOUD_CAPABILITIES.includes('homecloud.manage_albums'));
});

const organizeGrant = resolveHomeCloudCapabilities({ role: 'senior', membershipStatus: 'active', household: null });
const viewOnlyGrant = resolveHomeCloudCapabilities({ role: 'adolescent', membershipStatus: 'active', household: null });

record(
  organizeGrant['homecloud.organize'] === true && organizeGrant['homecloud.delete'] === false,
  'a senior member has organize WITHOUT delete: deleting an Album grouping is not a delete capability',
);
record(
  viewOnlyGrant['homecloud.view'] === true
  && viewOnlyGrant['homecloud.organize'] === false
  && viewOnlyGrant['homecloud.delete'] === false,
  'a view-only member can read Albums but can neither organize nor delete',
);
record(
  !albumServiceSource.includes("'homecloud.delete'") && !albumServiceSource.includes('"homecloud.delete"'),
  'the Album mutation service never requires homecloud.delete',
);
record(
  !albumServiceSource.includes('homecloud.manage_albums'),
  'the Album mutation service never invents a local capability',
);
record(
  (albumServiceSource.match(/contextWithCapability\(req, 'homecloud\.organize'\)/g) ?? []).length === 5,
  'all five Album mutations enter through the single homecloud.organize gate',
);
record(
  !readServiceSource.includes('homecloud.organize')
  && !readServiceSource.includes('homecloud.delete'),
  'Album READS stay on homecloud.view and never escalate to a mutating capability',
);

// ===========================================================================
// 2) ALBUM DTO CONTRACT
// ===========================================================================
console.log('--- 2. Album DTO contract ---');

const albumRow = {
  id: 'album-1',
  household_id: 'household-1',
  name: 'Vacaciones',
  created_by_member_id: 'member-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const albumDto = mapAlbumRowToDto(albumRow, { itemCount: 4, coverContentId: 'content-9' });

check('the DTO carries exactly the approved Album shape', () => {
  assert.deepEqual(Object.keys(albumDto).sort(), [
    'coverContentId', 'createdAt', 'createdByMemberId', 'id', 'itemCount', 'name', 'updatedAt',
  ]);
});

record(albumDto.itemCount === 4, 'itemCount projects the EXACT aggregate');
record(albumDto.coverContentId === 'content-9', 'coverContentId projects a content id');
record(
  mapAlbumRowToDto(albumRow, { itemCount: 0, coverContentId: null }).itemCount === 0,
  'an empty Album reports itemCount 0',
);
record(
  mapAlbumRowToDto(albumRow, { itemCount: 0, coverContentId: null }).coverContentId === null,
  'an Album with no suitable visual Memory reports coverContentId null',
);
record(
  mapAlbumRowToDto(albumRow, { itemCount: 1234, coverContentId: null }).itemCount === 1234,
  'itemCount is not capped, clamped or rounded anywhere in the mapper',
);

for (const bad of [undefined, {}, { itemCount: null }, { itemCount: '4' }, { itemCount: 4.5 }, { itemCount: -1 }]) {
  let threw = false;
  try {
    mapAlbumRowToDto(albumRow, bad);
  } catch (error) {
    threw = error.message === 'homecloud_album_dto_requires_exact_item_count';
  }
  record(threw, `the DTO refuses a non-exact itemCount instead of shipping an approximation (${JSON.stringify(bad ?? null)})`);
}

const serializedAlbum = JSON.stringify(albumDto);
for (const forbidden of [
  'original_storage_path', 'preview_storage_path', 'bucket', 'signedUrl', 'signed_url',
  'coverUrl', 'cover_url', 'household_id', 'lifecycle', 'trashed_at', 'trashedByMemberId',
]) {
  record(!serializedAlbum.includes(forbidden), `the Album DTO never serializes ${forbidden}`);
}

// ===========================================================================
// 3) ORDER: ALBUM vs TIMELINE
// ===========================================================================
console.log('--- 3. Album presentation order vs Timeline order ---');

check('the Album order is the exact reverse of the Timeline order', () => {
  assert.equal(TIMELINE_MEMORIES_ORDER.length, ALBUM_MEMORIES_ORDER.length);
  TIMELINE_MEMORIES_ORDER.forEach((spec, index) => {
    const albumSpec = ALBUM_MEMORIES_ORDER[index];
    assert.equal(albumSpec.column, spec.column);
    assert.equal(albumSpec.ascending, !spec.ascending);
    // Every nullable key flips its NULLS placement. `id` is never null, so it
    // is deliberately null-placement-free in BOTH orders.
    if (spec.column === 'id') {
      assert.equal(albumSpec.nullsFirst, spec.nullsFirst);
    } else {
      assert.equal(albumSpec.nullsFirst, !spec.nullsFirst);
    }
  });
});

record(
  MEMORIES_ORDER_MODES.TIMELINE === 'timeline' && MEMORIES_ORDER_MODES.ALBUM === 'album',
  'the read model exposes an explicit timeline/album mode pair',
);
record(
  TIMELINE_MEMORIES_ORDER.every((spec) => spec.ascending === false),
  'the global Timeline stays newest -> oldest',
);
record(
  ALBUM_MEMORIES_ORDER.every((spec) => spec.ascending === true),
  'the Album presentation mode is oldest -> newest',
);
record(
  ALBUM_MEMORIES_ORDER[ALBUM_MEMORIES_ORDER.length - 1].column === 'id',
  'id remains the final tie-break of the Album order, so it stays a total order',
);
record(
  TIMELINE_MEMORIES_ORDER.every((spec) => !['uploaded_at', 'role', 'lifecycle'].includes(spec.column)),
  'neither order ever uses uploaded_at as a semantic date',
);

const orderMatrix = [
  { id: 'm-unknown-a', captured_year: null, captured_month: null, captured_at: null },
  { id: 'm-unknown-b', captured_year: null, captured_month: null, captured_at: null },
  { id: 'm-2024-year', captured_year: 2024, captured_month: null, captured_at: null },
  { id: 'm-2024-jul-late', captured_year: 2024, captured_month: 7, captured_at: '2024-07-18T20:00:00+00:00' },
  { id: 'm-2024-jul-early', captured_year: 2024, captured_month: 7, captured_at: '2024-07-18T08:00:00+00:00' },
  { id: 'm-2024-jan', captured_year: 2024, captured_month: 1, captured_at: null },
  { id: 'm-2026-exact', captured_year: 2026, captured_month: 3, captured_at: '2026-03-05T10:00:00+00:00' },
];

const albumSorted = orderMatrix.slice().sort(compareMemoriesInAlbumOrder);

check('Album order puts the oldest known date first and unknown dates last', () => {
  assert.deepEqual(albumSorted.map((row) => row.id), [
    'm-unknown-a',
    'm-unknown-b',
    'm-2024-year',
    'm-2024-jan',
    'm-2024-jul-early',
    'm-2024-jul-late',
    'm-2026-exact',
  ]);
});

check('the comparator is a strict total order (antisymmetric, transitive, never 0 for distinct ids)', () => {
  for (const a of orderMatrix) {
    assert.equal(Math.sign(compareMemoriesInAlbumOrder(a, a)), 0);
    for (const b of orderMatrix) {
      if (a.id === b.id) continue;
      assert.equal(
        Math.sign(compareMemoriesInAlbumOrder(a, b)),
        -Math.sign(compareMemoriesInAlbumOrder(b, a)),
        `antisymmetry failed for ${a.id}/${b.id}`,
      );
    }
  }
  for (const a of orderMatrix) {
    for (const b of orderMatrix) {
      for (const c of orderMatrix) {
        if (compareMemoriesInAlbumOrder(a, b) <= 0 && compareMemoriesInAlbumOrder(b, c) <= 0) {
          assert.ok(compareMemoriesInAlbumOrder(a, c) <= 0, `transitivity failed for ${a.id}/${b.id}/${c.id}`);
        }
      }
    }
  }
});

check('repeated sorts of the same rows are byte-identical (pagination stability)', () => {
  const first = orderMatrix.slice().sort(compareMemoriesInAlbumOrder).map((row) => row.id).join();
  const shuffled = orderMatrix.slice().reverse().sort(compareMemoriesInAlbumOrder).map((row) => row.id).join();
  assert.equal(first, shuffled);
});

check('a timezone offset difference never reorders two exact Memories', () => {
  const utc = { id: 'a', captured_year: 2024, captured_month: 7, captured_at: '2024-07-18T08:00:00+00:00' };
  const offset = { id: 'b', captured_year: 2024, captured_month: 7, captured_at: '2024-07-18T10:00:00+02:00' };
  assert.ok(compareMemoriesInAlbumOrder(utc, offset) < 0);
});

// ===========================================================================
// 4) COVER SUITABILITY
// ===========================================================================
console.log('--- 4. cover suitability ---');

check('only image and video Memories are cover candidates', () => {
  assert.deepEqual([...HOME_CLOUD_ALBUM_COVER_KINDS], ['image', 'video']);
  assert.equal(isAlbumCoverCandidate({ mime_type: 'image/jpeg', written_text: null }), true);
  assert.equal(isAlbumCoverCandidate({ mime_type: 'video/mp4', written_text: null }), true);
});

check('nonvisual Memories never become a cover and never throw', () => {
  assert.equal(isAlbumCoverCandidate({ mime_type: null, written_text: 'recuerdo escrito' }), false);
  assert.equal(isAlbumCoverCandidate({ mime_type: 'audio/mpeg', written_text: null }), false);
  assert.equal(isAlbumCoverCandidate({ mime_type: null, written_text: null }), false);
});

// ===========================================================================
// 5) ROUTE SURFACE
// ===========================================================================
console.log('--- 5. Album mutation route surface ---');

const routeTable = routes.stack
  .filter((layer) => layer.route)
  .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

const albumRoutes = routeTable.filter((entry) => entry.includes('/albums'));
record(
  albumRoutes.includes('GET /albums') && albumRoutes.includes('GET /albums/:albumId'),
  'Album reads are preserved',
);
record(
  albumRoutes.includes('GET /albums/:albumId/items'),
  'the legacy album items primitive is preserved untouched (not redesigned, not paginated, not replaced)',
);
record(
  albumRoutes.includes('POST /albums')
  && albumRoutes.includes('PATCH /albums/:albumId')
  && albumRoutes.includes('DELETE /albums/:albumId')
  && albumRoutes.includes('POST /albums/:albumId/items')
  && albumRoutes.includes('DELETE /albums/:albumId/items/:contentId'),
  'exactly the five approved Album mutation endpoints are registered',
);

const albumMutations = albumRoutes.filter((entry) => !entry.startsWith('GET'));
record(
  albumMutations.length === 5,
  `no other Album mutation endpoint exists in MO-A1 (found ${albumMutations.length})`,
);
record(
  !routeTable.some((entry) => entry.includes('/albums') && /favorit|hidden|restore|trash|purge/i.test(entry)),
  'no Album favourite, hidden, trash, restore or purge endpoint was introduced',
);

// ===========================================================================
// 6) SCHEMA FREEZE
// ===========================================================================
console.log('--- 6. schema freeze ---');

const migrationDir = path.join(root, 'supabase', 'migrations');
const albumMigration = '20260910000003_homecloud_albums_v1_1.sql';
const migrations = fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
const albumTouchingMigrations = migrations.filter(
  (name) => name !== albumMigration
    && /homecloud_albums|homecloud_album_items/.test(fs.readFileSync(path.join(migrationDir, name), 'utf8')),
);

record(albumTouchingMigrations.length === 0, 'no migration after the Albums foundation touches the Album schema');
record(
  migrations.every((name) => !/moa1/i.test(name)),
  'MO-A1 added no migration file',
);
for (const forbiddenColumn of ['cover_content_id', 'favorite', 'favourite', 'hidden ']) {
  record(
    !migrations.some((name) => new RegExp(`homecloud_albums[^\\n]*${forbiddenColumn.trim()}`, 'i')
      .test(fs.readFileSync(path.join(migrationDir, name), 'utf8'))),
    `no Album column named ${forbiddenColumn.trim()} exists in any migration`,
  );
}

// ===========================================================================
// 7) READ MODEL BOUNDARIES
// ===========================================================================
console.log('--- 7. read-model boundaries ---');

record(
  typeof albumService.createAlbum === 'function'
  && typeof albumService.renameAlbum === 'function'
  && typeof albumService.deleteAlbum === 'function'
  && typeof albumService.addMemoryToAlbum === 'function'
  && typeof albumService.removeMemoryFromAlbum === 'function',
  'the Album mutation service exposes exactly the five approved operations',
);
record(
  (readServiceSource.match(/mapMemoryRowToReadDto\(/g) ?? []).length === 1
  && !readServiceSource.includes('AlbumMemory'),
  'there is no second Memory mapper and no AlbumMemory DTO',
);
record(
  !readServiceSource.includes("from('homecloud_contents').delete")
  && !readServiceSource.includes("from('homecloud_contents').update"),
  'the read service never deletes or updates a Memory',
);
record(
  !albumServiceSource.includes("from('homecloud_contents').delete")
  && !albumServiceSource.includes("from('homecloud_contents').update")
  && !albumServiceSource.includes("from('homecloud_contents').insert"),
  'the Album mutation service never creates, updates or deletes a Memory row',
);
const albumServiceCode = albumServiceSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

record(
  !albumServiceCode.includes('storage')
  && !albumServiceCode.includes('createSignedUrl')
  && !albumServiceCode.includes('.remove(')
  && !albumServiceCode.includes('createSignedUploadUrl'),
  'the Album mutation service performs no storage or preview operation',
);
record(
  ALBUM_AGGREGATE_PAGE_SIZE > 0,
  'the membership aggregation pages explicitly instead of relying on an implicit row limit',
);
record(
  /range\(offset, offset \+ ALBUM_AGGREGATE_PAGE_SIZE - 1\)/.test(readServiceSource)
  && /offset \+= ALBUM_AGGREGATE_PAGE_SIZE/.test(readServiceSource),
  'the aggregation sweep advances explicitly until the source is exhausted, so counts cannot truncate',
);
record(
  readServiceSource.includes('homecloud_invalid_order')
  && readServiceSource.includes('El orden de álbum requiere albumId.')
  && /MEMORIES_ORDER_SPECS\[orderMode\]/.test(readServiceSource),
  'an unknown order, or Album order without an albumId, is a typed 400 instead of a silent reinterpretation',
);

// ===========================================================================
// 8) SHARED FOUNDATION + CLIENT CONTRACT
// ===========================================================================
console.log('--- 8. shared foundation decoupling and client contract ---');

const sharedUploadModules = fs.readdirSync(path.join(root, 'backend', 'src', 'services'))
  .filter((name) => /homecloud(IntakeService|Upload|Preview|Storage)/.test(name))
  .map((name) => fs.readFileSync(path.join(root, 'backend', 'src', 'services', name), 'utf8'))
  .join('\n');

record(
  !sharedUploadModules.includes('homecloudAlbumService') && !sharedUploadModules.includes('albumsController'),
  'no shared upload / intake / preview module depends on the Album service',
);
record(
  !albumServiceSource.includes('homecloudIntakeService')
  && !albumServiceSource.includes('createSignedUploadUrl')
  && !albumServiceSource.includes('finalizeContent'),
  'the Album service never reaches into the shared upload foundation',
);

const frontendReadService = read('front/mi-front-limpio/services/homecloud/homecloudReadService.ts');
const frontendTypes = read('front/mi-front-limpio/services/homecloud/homecloudTypes.ts');

for (const clientContract of ['createAlbum', 'renameAlbum', 'deleteAlbum', 'addMemoryToAlbum', 'removeMemoryFromAlbum']) {
  record(
    new RegExp(`export async function ${clientContract}\\(`).test(frontendReadService),
    `the client contract exports ${clientContract}()`,
  );
}
record(
  /params\.set\('order', query\.order\)/.test(frontendReadService),
  'the client contract can request the Album read ordering mode',
);
record(
  frontendTypes.includes('readonly itemCount: number;')
  && frontendTypes.includes('readonly coverContentId: string | null;')
  && frontendTypes.includes("export type HomeCloudMemoriesOrder = 'timeline' | 'album';"),
  'the client types carry the extended Album DTO and the explicit read order',
);
record(
  (frontendReadService.match(/invalidateHomeCloudHousehold\(/g) ?? []).length === 2,
  'Album mutations reuse the existing invalidateHomeCloudHousehold and nothing else',
);
record(
  !frontendReadService.includes('AlbumTile')
  && !frontendReadService.includes('AlbumScreen')
  && !frontendReadService.includes('navigation.')
  && !frontendReadService.includes('router.'),
  'the client contract stays a pure read/mutation client: no Album tile, no Album screen, no navigation, no router',
);

const homeCloudComponentDir = path.join(root, 'front', 'mi-front-limpio', 'components', 'homecloud');
const homeCloudScreenDir = path.join(root, 'front', 'mi-front-limpio', 'screens');
const uiFiles = [...fs.readdirSync(homeCloudComponentDir), ...fs.readdirSync(homeCloudScreenDir)];

/**
 * MO-A2 retarget (the guard this assertion used to be).
 *
 * It used to assert that NO Album UI file existed, because MO-A2 had not been
 * built. MO-A2 now OWNS the surface, so the invariant it must keep enforcing is
 * the real one: the Album surface exists ONLY in the approved components of the
 * Memories subtree, and it never leaks into the read client, the navigation
 * layer, the backend or the frozen shared infrastructure.
 *
 * MO-A3 retarget: `AlbumMemoryPicker.tsx` left this allow-list because MO-A3
 * replaced it with the Selection Surface and deleted the file. The allow-list
 * stays an allow-list on purpose: a new Album surface file must be added here
 * deliberately, so the boundary cannot silently widen.
 */
const APPROVED_ALBUM_UI_FILES = [
  'AlbumTile.tsx',
  'AlbumsRail.tsx',
  'AlbumSheets.tsx',
  'AlbumDetailView.tsx',
];

const APPROVED_ALBUM_SERVICE_FILES = [
'homecloudAlbumScope.ts',
     'homecloudAlbumsPagination.ts',
     'homecloudAlbumDetailPagination.ts',
     // HC2-C: the single-Memory membership removal operation. It is a plain async
     // function over the EXISTING `removeMemoryFromAlbum` service — no React, no
     // hook, no store, no new transport — so it satisfies the same
     // framework-free contract as the rest. It was extracted from the screen only
     // because BUG D removed its last UI caller; the Membership contract itself is
     // unchanged and Run B reconnects it to the single-Memory Viewer action.
     'homecloudMemoryAlbumRemoval.ts',
   ];

const albumUiFiles = uiFiles.filter((name) => /album/i.test(name));
record(
  albumUiFiles.length > 0,
  'the Album surface exists (MO-A2 owns the UI, not MO-A1)',
);
record(
  albumUiFiles.every((name) => APPROVED_ALBUM_UI_FILES.includes(name)),
  `every Album UI file is one of the approved Memories-subtree components (${albumUiFiles.join(', ') || 'none'})`,
);
record(
  !albumUiFiles.some((name) => {
    const file = path.join(root, 'front', 'mi-front-limpio', 'components', 'homecloud', name);
    return fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes('navigation.');
  }),
  'no Album component introduces navigation',
);

const homeCloudServiceDir = path.join(root, 'front', 'mi-front-limpio', 'services', 'homecloud');
const albumServiceFiles = fs.readdirSync(homeCloudServiceDir).filter((name) => /album/i.test(name));
record(
  albumServiceFiles.every((name) => APPROVED_ALBUM_SERVICE_FILES.includes(name)),
  `every Album service module is an approved framework-free helper/controller (${albumServiceFiles.join(', ') || 'none'})`,
);
record(
  !albumServiceFiles.some((name) => name.endsWith('.tsx')),
  'the Albums service layer stays framework free: no React module is added under services/homecloud',
);

const albumUiSources = APPROVED_ALBUM_UI_FILES.map((name) => ({
  name,
  source: read(`front/mi-front-limpio/components/homecloud/${name}`),
}));
const albumUiCode = albumUiSources.map(({ source }) => source.replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');

record(
  !/from '\.\.\/\.\.\/services\/(planner|api)|plannerCache|requestJson/.test(albumUiCode),
  'no Album UI component reaches into plannerCache or requestJson directly: reads go through the existing client contract',
);
record(
  !albumUiCode.includes('homecloudReadReconciliation'),
  'the Album surface extends no shared reconciliation module',
);
record(
  !albumUiCode.includes('homecloud.delete') && !albumUiCode.includes('homecloud.manage_albums'),
  'no Album UI component references homecloud.delete or invents manage_albums',
);
record(
  !/fetchHomeCloudAlbumItems/.test(albumUiCode)
  && !/fetchHomeCloudAlbumItems/.test(read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx')),
  'the Album detail never consumes the legacy GET /albums/:albumId/items primitive',
);

const navTypes = read('front/mi-front-limpio/navigation/types.ts');
record(
  !/album/i.test(navTypes) && !/album/i.test(read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx')),
  'no Album navigation route or param was introduced (Album detail is nested state)',
);

// ---------------------------------------------------------------------------
console.log(`\nMOA1_ALBUM_CONTRACT_RESULT pass=${passCount} fail=${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
  console.error('MOA1_ALBUM_CONTRACT_TESTS=FAIL');
} else {
  console.log('MOA1_ALBUM_CONTRACT_TESTS=PASS');
}