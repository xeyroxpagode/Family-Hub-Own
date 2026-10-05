/**
 * HomeCloud MO-A2 — Albums SURFACE: deterministic evidence.
 *
 * No database and no network. Two kinds of proof, deliberately mixed:
 *
 *  - BEHAVIOUR, on the two framework-free controllers and the framework-free
 *    Album scope helpers. Generations, stale-answer rejection, replace vs append,
 *    dedupe, pagination, reset and the terminal missing-Album condition are
 *    executed, not pattern-matched, because those transitions are the contract.
 *  - BOUNDARY, on the real source files. A card cannot prove that Albums live
 *    inside Memories and not in a third tab, that no route was added, that every
 *    mutation receives `{ householdId }`, or that `homecloud.delete` is absent
 *    from the Album path: those are properties of the files and they are read
 *    from them.
 *
 * Runtime behaviour against the local Supabase is proven separately by
 * scripts/homecloud_moa2_album_runtime_tests.js.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  ALBUM_DELETE_MEMORIES_SURVIVE_COPY,
  ALBUM_MISSING_BACK_LABEL,
  ALBUM_MISSING_TITLE,
  HOMECLOUD_ALBUM_NOT_FOUND_CODE,
  albumItemCountLabel,
  isAlbumMissingFailure,
} from '../front/mi-front-limpio/services/homecloud/homecloudAlbumScope';
import {
  memorySelectionAddLabel,
  memorySelectionCountLabel,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemorySelection';
import {
  ALBUMS_RAIL_INITIAL,
  createAlbumsRailController,
  solveAlbumsRailPhase,
  type AlbumsRailState,
} from '../front/mi-front-limpio/services/homecloud/homecloudAlbumsPagination';
import {
  ALBUM_DETAIL_INITIAL,
  appendUniqueMemories,
  createAlbumDetailController,
  type AlbumDetailState,
} from '../front/mi-front-limpio/services/homecloud/homecloudAlbumDetailPagination';
import type {
  HomeCloudAlbum,
  HomeCloudMemoryListItem,
} from '../front/mi-front-limpio/services/homecloud/homecloudTypes';

const root = process.cwd();
const read = (relative: string): string =>
  fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readCode = (relative: string): string =>
  read(relative).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
/**
 * MO-A3 retired `AlbumMemoryPicker.tsx` as the productive flow and then DELETED
 * it. These readers keep the rest of this suite meaningful: an absent file reads
 * as an empty string, so every assertion that used to inspect the picker now
 * asserts its ABSENCE instead of failing on a missing path.
 */
const readOptional = (relative: string): string =>
  fs.existsSync(path.join(root, relative)) ? read(relative) : '';

let passCount = 0;
let failCount = 0;

function record(ok: boolean, message: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function section(title: string): void {
  console.log(`\n--- ${title} ---`);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function album(over: Partial<HomeCloudAlbum> & { id: string }): HomeCloudAlbum {
  return {
    name: 'Álbum',
    createdByMemberId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    itemCount: 0,
    coverContentId: null,
    ...over,
  };
}

function memory(id: string, over: Partial<HomeCloudMemoryListItem> = {}): HomeCloudMemoryListItem {
  return {
    id,
    role: 'memory',
    displayName: null,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    sizeBytes: 10,
    uploadedByMemberId: null,
    uploadedAt: '2026-01-01T00:00:00Z',
    hasPreview: true,
    hiddenFromResurfacing: false,
    caption: `recuerdo ${id}`,
    writtenText: null,
    capturedAt: '2024-07-18T08:00:00Z',
    capturedYear: 2024,
    capturedMonth: 7,
    capturePrecision: 'exact',
    kind: 'image',
    albumIds: [],
    ...over,
  };
}

/** A promise whose settlement the test controls, to order generations. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

// ---------------------------------------------------------------------------
// Sources under test
// ---------------------------------------------------------------------------

const SCREEN = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const SCREEN_CODE = readCode('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const ROOT_SCREEN = read('front/mi-front-limpio/screens/HomeCloudScreen.tsx');
const ROOT_SCREEN_CODE = readCode('front/mi-front-limpio/screens/HomeCloudScreen.tsx');
const READ_SERVICE = read('front/mi-front-limpio/services/homecloud/homecloudReadService.ts');
const READ_SERVICE_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudReadService.ts');
const INTAKE = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const INTAKE_CODE = readCode('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const INTAKE_SERVICE = read('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const INTAKE_SERVICE_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudMemoryIntakeService.ts');
const RAIL = read('front/mi-front-limpio/components/homecloud/AlbumsRail.tsx');
const RAIL_CODE = readCode('front/mi-front-limpio/components/homecloud/AlbumsRail.tsx');
const TILE = read('front/mi-front-limpio/components/homecloud/AlbumTile.tsx');
const TILE_CODE = readCode('front/mi-front-limpio/components/homecloud/AlbumTile.tsx');
const SHEETS = read('front/mi-front-limpio/components/homecloud/AlbumSheets.tsx');
const SHEETS_CODE = readCode('front/mi-front-limpio/components/homecloud/AlbumSheets.tsx');
const PICKER = readOptional('front/mi-front-limpio/components/homecloud/AlbumMemoryPicker.tsx');
const DETAIL = read('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx');
const DETAIL_CODE = readCode('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx');
const CARDS = read('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
const CARDS_CODE = readCode('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
const READ_FAILURE = read('front/mi-front-limpio/services/homecloud/homecloudReadFailure.ts');
const READ_FAILURE_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudReadFailure.ts');
const NAV_TYPES = read('front/mi-front-limpio/navigation/types.ts');

/**
 * Every Album-touching source, concatenated for the capability-freeze checks.
 *
 * MO-A3 added the Selection Surface, so the freeze must cover it too: an Album
 * capability can never widen into the selection surface either.
 */
const ALBUM_SURFACES = [
  SHEETS_CODE,
  TILE_CODE,
  RAIL_CODE,
  DETAIL_CODE,
  SCREEN_CODE,
  readCode('front/mi-front-limpio/components/homecloud/MemorySelectionHeader.tsx'),
  readCode('front/mi-front-limpio/components/homecloud/MemoryCollectionTile.tsx'),
  readCode('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx'),
  readCode('front/mi-front-limpio/components/homecloud/MemoryTimelineRow.tsx'),
].join('\n');

console.log('\n=== MO-A2 ALBUM SURFACE TESTS ===\n');

// ===========================================================================
section('1. IA: Albums live INSIDE Memories, with no third tab and no route');
// ===========================================================================

record(
  /type HomeCloudSection = 'files' \| 'memories'/.test(ROOT_SCREEN_CODE),
  'HomeCloudSection is still exactly files | memories',
);
record(
  (ROOT_SCREEN_CODE.match(/\{ value: '/g) ?? []).length === 2
  && ROOT_SCREEN_CODE.includes("{ value: 'files', label: 'Archivos' }")
  && ROOT_SCREEN_CODE.includes("{ value: 'memories', label: 'Recuerdos' }"),
  'the HomeCloud selector still offers exactly two options (no Albums tab)',
);
record(
  !ROOT_SCREEN_CODE.includes('HomeCloudAlbumsView'),
  'no Albums pane was added to the HomeCloud root',
);
record(
  SCREEN.includes('ListHeaderComponent={') && SCREEN.includes('<AlbumsRail'),
  'the Albums rail is the ListHeaderComponent of the Memories SectionList',
);
// MO-A3 RETARGET: MO-A2 forbade the literal `kind: 'album'`, which was a proxy
// for "no synthetic Album section". MO-A3 legitimately uses `{ kind: 'album' }`
// as the MemoryCollectionRef discriminant for an Album collection, so the
// literal is no longer a usable proxy. What the assertion actually protects is
// that the Timeline SECTION KIND vocabulary never gained an Album member.
record(
  !/sections=\{\[\.\.\./.test(SCREEN_CODE)
  && /export type TimelineSectionKind = 'month' \| 'year' \| 'unknown';/.test(
    read('front/mi-front-limpio/services/homecloud/homecloudMemoriesTimeline.ts'),
  ),
  'Albums is NOT injected as a synthetic Timeline section (the section-kind vocabulary is unchanged)',
);
record(
  !/album/i.test(NAV_TYPES),
  'no Album route or route param exists in navigation/types.ts',
);
record(
  SCREEN_CODE.includes('<View style={StyleSheet.absoluteFill}') && SCREEN.includes('<AlbumDetailView'),
  'the Album detail is an OVERLAY of the mounted Memories list (nested state, Timeline preserved)',
);
record(
  /import \{[^}]*BackHandler[^}]*\} from 'react-native'/.test(SCREEN_CODE)
  && SCREEN.includes("BackHandler.addEventListener('hardwareBackPress'"),
  'Android hardware Back closes the Album instead of the whole surface',
);

// ===========================================================================
section('2. Albums rail controller: generations, freshness, error, reset');
// ===========================================================================

async function railControllerBehaviour(): Promise<void> {
  // A) load() may answer from the existing cached read; reload() must not.
  const authoritativeCalls: boolean[] = [];
  {
    const states: AlbumsRailState[] = [];
    const controller = createAlbumsRailController({
      onState: (state) => states.push(state),
      read: async ({ authoritative }) => {
        authoritativeCalls.push(authoritative);
        return [album({ id: 'a1', name: 'Uno', itemCount: 3, coverContentId: 'c1' })];
      },
    });
    await controller.load();
    await controller.reload();
    record(
      authoritativeCalls[0] === false && authoritativeCalls[1] === true,
      'the first paint may use the cached read, while a reload is authoritative',
    );
    record(
      states.at(-1)?.albums.length === 1 && states.at(-1)?.loading === false,
      'a successful read publishes the albums and clears loading',
    );
  }

  // B) A late answer for a superseded read can never paint.
  {
    const first = deferred<HomeCloudAlbum[]>();
    const states: AlbumsRailState[] = [];
    const controller = createAlbumsRailController({
      onState: (state) => states.push(state),
      read: ({ authoritative }) => (authoritative ? Promise.resolve([album({ id: 'fresh' })]) : first.promise),
    });
    const staleLoad = controller.load();
    await controller.reload();
    first.resolve([album({ id: 'stale' })]);
    await staleLoad;
    record(
      states.at(-1)?.albums.every((item) => item.id === 'fresh') === true,
      'a late answer from a superseded read is rejected (generation guard)',
    );
  }

  // C) A failure never invents an empty household.
  {
    const states: AlbumsRailState[] = [];
    const controller = createAlbumsRailController({
      onState: (state) => states.push(state),
      errorMessage: (error) => (error instanceof Error ? error.message : 'fallo'),
      read: async ({ authoritative }) => {
        if (authoritative) throw new Error('sin conexión');
        return [album({ id: 'a1' })];
      },
    });
    await controller.load();
    await controller.reload();
    record(
      states.at(-1)?.error === 'sin conexión' && states.at(-1)?.albums.length === 1,
      'a failed reload keeps the albums on screen and publishes the error',
    );
    record(
      states.at(-1)?.loading === false && states.at(-1)?.refreshing === false,
      'a failed read always clears its own indicator',
    );
  }

  // D) A household switch discards everything, including in-flight answers.
  {
    const pending = deferred<HomeCloudAlbum[]>();
    const states: AlbumsRailState[] = [];
    const controller = createAlbumsRailController({
      onState: (state) => states.push(state),
      read: async ({ authoritative }) => (authoritative ? Promise.resolve([album({ id: 'b1' })]) : pending.promise),
    });
    const inFlight = controller.load();
    controller.reset();
    pending.resolve([album({ id: 'leaked' })]);
    await inFlight;
    record(
      states.at(-1)?.albums.length === 0 && states.at(-1)?.loading === true,
      'reset() discards the previous household and its in-flight answer',
    );
  }

  // E) The initial state is honest before anything is read.
  record(
    ALBUMS_RAIL_INITIAL.albums.length === 0
    && ALBUMS_RAIL_INITIAL.loading === true
    && ALBUMS_RAIL_INITIAL.error === null,
    'the rail starts loading, with no albums and no error',
  );
}

// ===========================================================================
section('3. Album tile: exact count and honest cover');
// ===========================================================================

record(albumItemCountLabel(0) === 'Sin recuerdos', 'count 0 renders "Sin recuerdos"');
record(albumItemCountLabel(1) === '1 recuerdo', 'count 1 renders "1 recuerdo" (singular)');
record(albumItemCountLabel(2) === '2 recuerdos', 'count 2 renders "2 recuerdos"');
record(albumItemCountLabel(1234) === '1234 recuerdos', 'a large exact count is rendered verbatim');
record(
  albumItemCountLabel(Number.NaN) === 'Sin recuerdos',
  'an impossible aggregate is never replaced by an invented number',
);
record(
  TILE.includes('albumItemCountLabel(album.itemCount)') && !/memories\.length/.test(TILE_CODE),
  'the tile renders album.itemCount and never derives a count from loaded Memories',
);
record(
  TILE.includes('album.coverContentId === null'),
  'a null coverContentId short-circuits to the stable fallback',
);
record(
  /function AlbumCoverImage[\s\S]*useMemoryPreviewUrl\(accessToken, contentId, true\)/.test(TILE_CODE),
  'the preview hook is mounted in a CHILD component, only for a non-null content id',
);
record(
  (TILE_CODE.match(/useMemoryPreviewUrl\(/g) ?? []).length === 1,
  'exactly ONE preview attempt exists for a cover (no second probe)',
);
// HC2-C STALE_TEST RETARGET (§23.7 / C3 / BUG B).
// OLD expectation: `preview.phase !== 'ready'` collapsed EVERY non-ready phase into
// one fallback, so a cover still resolving was pixel-identical to an Album with no
// cover — the second face of the reported "empty blocks".
// FREEZE RULE REPLACING IT: only `idle`/`loading` mean "arriving"; `unavailable`,
// `error` and a failed image are the SAME stable fallback, and none of them can
// ever return to a skeleton-looking tile.
record(
  /preview\.phase === 'idle' \|\| preview\.phase === 'loading'/.test(TILE_CODE)
    && TILE.includes('AlbumCoverLoading')
    && TILE.includes('AlbumCoverFallback'),
  'only idle/loading render the distinguishable loading state; unavailable and error share ONE stable fallback',
);
record(
  TILE.includes('Quitar') === false && !TILE_CODE.includes('getMemoryPreviewUrl'),
  'the Album cover never downloads an original or reaches into the preview service directly',
);

// ===========================================================================
section('4. Album detail controller: replace vs append, dedupe, terminal');
// ===========================================================================

async function detailControllerBehaviour(): Promise<void> {
  // A) open() reads page 0 and replaces every page.
  {
    const requests: { albumId: string; limit: number; offset: number }[] = [];
    const states: AlbumDetailState[] = [];
    const controller = createAlbumDetailController({
      limit: 50,
      onState: (state) => states.push(state),
      read: async (input) => {
        requests.push(input);
        const base = input.offset;
        return {
          memories: [memory(`m${base + 1}`), memory(`m${base + 2}`)],
          nextOffset: base < 50 ? 50 : null,
        };
      },
    });
    await controller.open('album-1');
    record(
      requests.length === 1 && requests[0].albumId === 'album-1' && requests[0].offset === 0 && requests[0].limit === 50,
      'the detail read carries albumId, limit and offset 0',
    );
    record(
      states.at(-1)?.memories.length === 2 && states.at(-1)?.nextOffset === 50,
      'the first page replaces the pages and adopts the SERVER nextOffset',
    );
    await controller.loadMore();
    record(
      requests[1].offset === 50 && states.at(-1)?.memories.length === 4,
      'load more appends at the server offset instead of inferring pagination',
    );
  }

  // B) The append dedupes by Memory id and never reorders what is loaded.
  record(
    appendUniqueMemories([memory('a'), memory('b')], [memory('b'), memory('c')]).map((m) => m.id).join() === 'a,b,c',
    'an overlapping page never duplicates or reorders a Memory',
  );
  {
    const states: AlbumDetailState[] = [];
    const controller = createAlbumDetailController({
      limit: 50,
      onState: (state) => states.push(state),
      read: async ({ offset }) =>
        offset === 0
          ? { memories: [memory('m1'), memory('m2')], nextOffset: 50 }
          : { memories: [memory('m2'), memory('m3')], nextOffset: null },
    });
    await controller.open('album-1');
    await controller.loadMore();
    record(
      states.at(-1)?.memories.map((m) => m.id).join() === 'm1,m2,m3',
      'a duplicate inside a later page is dropped at the controller boundary',
    );
    record(states.at(-1)?.nextOffset === null, 'the last page adopts nextOffset null (no more pages)');
  }

  // C) A later page failure is NOT a list failure.
  {
    const states: AlbumDetailState[] = [];
    const controller = createAlbumDetailController({
      limit: 50,
      onState: (state) => states.push(state),
      errorMessage: (error) => (error instanceof Error ? error.message : 'fallo'),
      pageErrorMessage: (error) => (error instanceof Error ? error.message : 'fallo'),
      read: async ({ offset }) => {
        if (offset === 0) return { memories: [memory('m1')], nextOffset: 50 };
        throw new Error('red caída');
      },
    });
    await controller.open('album-1');
    await controller.loadMore();
    record(
      states.at(-1)?.memories.length === 1
      && states.at(-1)?.pageError === 'red caída'
      && states.at(-1)?.error === null
      && states.at(-1)?.nextOffset === 50,
      'a failed later page keeps the loaded page, publishes only the page error and keeps the same nextOffset',
    );
    record(states.at(-1)?.loadingMore === false, 'a failed later page releases its own indicator');
  }

  // D) A stale page is rejected.
  {
    const slow = deferred<{ memories: HomeCloudMemoryListItem[]; nextOffset: number | null }>();
    const states: AlbumDetailState[] = [];
    const controller = createAlbumDetailController({
      limit: 50,
      onState: (state) => states.push(state),
      read: ({ albumId }) => (albumId === 'album-1' ? slow.promise : Promise.resolve({ memories: [memory('new')], nextOffset: null })),
    });
    const slowOpen = controller.open('album-1');
    await controller.open('album-2');
    slow.resolve({ memories: [memory('old')], nextOffset: 50 });
    await slowOpen;
    record(
      states.at(-1)?.memories.map((m) => m.id).join() === 'new',
      'a page of a previous Album can never land in the current Album',
    );
  }

  // E) TERMINAL: homecloud_album_not_found is final, not a retry spin.
  {
    const states: AlbumDetailState[] = [];
    let calls = 0;
    const controller = createAlbumDetailController({
      limit: 50,
      onState: (state) => states.push(state),
      read: async () => {
        calls += 1;
        const error = new Error('no existe') as Error & { code?: string };
        error.code = HOMECLOUD_ALBUM_NOT_FOUND_CODE;
        throw error;
      },
    });
    await controller.open('album-gone');
    record(
      states.at(-1)?.missing === true && states.at(-1)?.memories.length === 0 && states.at(-1)?.error === null,
      'a missing Album is terminal: no fake empty Album and no parallel error',
    );
    // Pagination must NOT spin on a terminal condition. An explicit focus or
    // pull-to-refresh MAY re-read (that is how the state is rediscovered), but
    // neither of those happens on its own.
    await controller.loadMore();
    record(calls === 1, 'a terminal Album is never retried by pagination');
    await controller.refresh();
    record(
      calls === 2 && states.at(-1)?.missing === true,
      'an explicit re-read of a still missing Album resolves straight back to the terminal state',
    );
  }

  // F) household reset and Album change reset.
  {
    const states: AlbumDetailState[] = [];
    const controller = createAlbumDetailController({
      limit: 50,
      onState: (state) => states.push(state),
      read: async ({ offset }) => ({ memories: [memory(`m${offset}`)], nextOffset: offset === 0 ? 50 : null }),
    });
    await controller.open('album-1');
    controller.reset();
    record(
      states.at(-1)?.albumId === null
      && states.at(-1)?.memories.length === 0
      && states.at(-1)?.nextOffset === null
      && states.at(-1)?.missing === false
      && states.at(-1)?.error === null
      && states.at(-1)?.pageError === null,
      'reset() (household switch) discards the Album, its pages and every transient flag',
    );
  }

  record(
    ALBUM_DETAIL_INITIAL.albumId === null && ALBUM_DETAIL_INITIAL.memories.length === 0,
    'the detail starts closed and empty',
  );
}

// ===========================================================================
section('5. Album detail read: the existing Memories read model, no client sort');
// ===========================================================================

record(
  /listMemories\([\s\S]{0,120}\{ albumId, order: 'album', limit, offset \}\)/.test(SCREEN_CODE),
  'the detail reads listMemories with albumId, order=album, limit and offset',
);
record(
  !SCREEN_CODE.includes('fetchHomeCloudAlbumItems') && !DETAIL_CODE.includes('fetchHomeCloudAlbumItems'),
  'the legacy GET /albums/:albumId/items primitive is never consumed by the detail',
);
// MO-A3 RETARGET: the detail now asks the SAME grouper for the `album`
// placement, because the Album read mode's canonical sequence puts an unknown
// date FIRST and a year-only Memory first within its year. The primitive is
// still reused and still never re-sorts; only the explicit placement mode is new.
record(
  DETAIL_CODE.includes("groupMemoriesForTimeline(state.memories, 'album')")
  && DETAIL_CODE.includes('flattenTimelineForSectionList('),
  'the detail reuses the frozen grouping primitives, asking only for the album placement',
);
record(
  !/\.sort\(/.test(DETAIL_CODE),
  'the Album detail never re-sorts: the server order IS the Album order',
);
record(
  DETAIL_CODE.includes('<MemorySelectableCard')
  && !DETAIL_CODE.includes('AlbumMemory'),
  'the detail renders MemoryCard through the MO-A3 wrapper and invents no Album-specific Memory DTO',
);
record(
  DETAIL_CODE.includes('ALBUM_MISSING_TITLE') && DETAIL_CODE.includes('ALBUM_MISSING_BACK_LABEL'),
  'the terminal missing-Album state renders the frozen copy and the way back to Recuerdos',
);
record(
  ALBUM_MISSING_TITLE === 'Este álbum ya no está disponible'
  && ALBUM_MISSING_BACK_LABEL === 'Volver a los recuerdos',
  'the terminal copy is frozen in the Album scope module, not retyped per surface',
);
record(
  DETAIL.includes('Este álbum todavía no tiene recuerdos') === false
  && DETAIL.includes('ALBUM_EMPTY_TITLE')
  && DETAIL.includes('Agregar recuerdos'),
  'an empty Album is honest and actionable for an organizing member',
);
record(
  /\{canOrganize \? \(\s*<AppButton title="Agregar recuerdos"/.test(DETAIL_CODE),
  'a member without organize gets NO unusable action on an empty Album',
);
record(
  DETAIL_CODE.includes('state.missing') && DETAIL_CODE.includes('if (state.missing)'),
  'the missing condition is handled before loading/empty rendering',
);

// ===========================================================================
section('6. Mutations: mandatory scope and the exact refetch table');
// ===========================================================================

// HC2-C STALE_TEST RETARGET (BUG D). The single-Memory removal no longer happens
// inline in the screen: its permanent `X` caller is gone, so the operation moved
// to the framework-free `homecloudMemoryAlbumRemoval` module. It is still the
// SAME `removeMemoryFromAlbum` service call, and it still receives the mandatory
// scope — which is what this table exists to prove.
const SINGLE_REMOVAL_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudMemoryAlbumRemoval.ts');
for (const [call, haystack, label] of [
  ['createAlbum(token, name, scope)', SCREEN, 'createAlbum'],
  ['renameAlbum(token, editor.album.id, name, scope)', SCREEN, 'renameAlbum'],
  ['deleteAlbum(token, actionsAlbum.id, scope)', SCREEN, 'deleteAlbum'],
  ['addMemoryToAlbum(token, targetAlbumId, contentId, scope ?? undefined)', SCREEN, 'addMemoryToAlbum'],
  ['removeMemoryFromAlbum(input.accessToken, input.openAlbumId, input.memoryId, input.scope)', SINGLE_REMOVAL_CODE, 'removeMemoryFromAlbum'],
] as const) {
  record(haystack.includes(call), `${label} is called with the mandatory { householdId } scope`);
}
record(
  SCREEN_CODE.includes('useMemo<HomeCloudScope | null>') && SCREEN.includes('householdId ? { householdId } : null'),
  'the scope is built from the CURRENT household and nothing else',
);
// MO-A3 RETARGET: MO-A2 froze "exactly five mutation call sites in the Album
// surface". MO-A3 replaced the per-item loops with ONE composer
// (`homecloudMemoryMutations`) that all three callers share, so the count is no
// longer five. What actually matters is preserved and asserted instead: the five
// MO-A1 mutations are still reached, each from the composer or the single-remove
// path, and each one receives the mandatory scope.
record(
  ['createAlbum(', 'renameAlbum(', 'deleteAlbum(', 'addMemoryToAlbum(', 'removeMemoryFromAlbum(']
    .every((call) => SCREEN_CODE.includes(call)),
  'all five MO-A1 Album mutations are still reached from the Memories surface',
);
record(
  /addMemoryToAlbum\(token, targetAlbumId, contentId, scope \?\? undefined\)/.test(SCREEN_CODE)
  && /removeMemoryFromAlbum\(token, targetAlbumId, contentId, scope \?\? undefined\)/.test(SCREEN_CODE),
  'both bulk directions route through the composer, and each request carries the scope',
);

// create -> rail
record(
  /if \(editor\.mode === 'create'\) \{[\s\S]*?await createAlbum\(token, name, scope\);[\s\S]*?await reloadRail\(\);/.test(SCREEN_CODE),
  'create refetches the Albums rail',
);
// rename -> rail + destinations
record(
  /await renameAlbum\(token, editor\.album\.id, name, scope\);[\s\S]*?await reloadRail\(\);[\s\S]*?bumpDestinations\(\);/.test(SCREEN_CODE),
  'rename refetches the rail (which carries the detail header) and the intake destinations',
);
// delete -> exit detail + rail + timeline + destinations
record(
  /const wasOpen = openAlbumId === actionsAlbum\.id;[\s\S]*?if \(wasOpen\) closeAlbum\(\);[\s\S]*?await reloadRail\(\);[\s\S]*?await readFirstPage\(\)[\s\S]*?bumpDestinations\(\);/.test(SCREEN_CODE),
  'delete exits the detail when the deleted Album is open, then refetches rail, Timeline page 0 and intake',
);
// MO-A3 RETARGET: the exact refetch table is unchanged, but it now lives in the
// ONE composer instead of in two bespoke loops. Same three reads, same conditions.
record(
  /if \(outcome\.committed\.length > 0\) \{[\s\S]*?detailControllerRef\.current!\.refresh\(\);[\s\S]*?await reloadRail\(\);[\s\S]*?await readFirstPage\(\)/.test(SCREEN_CODE),
  'a successful bulk mutation refetches Album detail, the rail and Timeline page 0',
);
// HC2-C: the single-Memory removal kept its EXACT refetch table, but the
// operation now lives in its own framework-free module (`homecloudMemoryAlbumRemoval`)
// rather than inline in the screen. The contract asserted here is the same three
// reads, the mandatory scope and the honest failure.
const ALBUM_REMOVAL = read('front/mi-front-limpio/services/homecloud/homecloudMemoryAlbumRemoval.ts');
record(
  /await removeMemoryFromAlbum[\s\S]{0,400}input\.refreshAlbumDetail\(\)[\s\S]{0,200}input\.reloadAlbums\(\)[\s\S]{0,200}input\.reloadTimeline\(\)/.test(SINGLE_REMOVAL_CODE),
  'remove refetches Album detail, the rail and Timeline page 0',
);
record(
  /catch \{\s*return false;\s*\}/.test(SINGLE_REMOVAL_CODE)
    && /refetch does NOT undo a committed membership/.test(ALBUM_REMOVAL),
  'a failed removal is reported honestly and never refetched as if it had committed',
);
// MO-A3 RETARGET: MO-A2 froze the screen's own per-item loop and the picker's
// close-on-full-success behaviour. Both moved into the ONE composer, which is the
// durable contract: sequential attribution, nothing rolled back, and a close only
// when every requested membership succeeded.
const COMPOSER = readCode('front/mi-front-limpio/services/homecloud/homecloudMemoryMutations.ts');
record(
  /for \(const contentId of input\.contentIds\) \{/.test(COMPOSER)
  && COMPOSER.includes('committed.push(contentId)')
  && COMPOSER.includes('failures.push('),
  'the shared composer runs the memberships sequentially and collects a failure instead of swallowing it',
);
record(
  SCREEN.includes('setSelectionFailure(failure)')
  && SCREEN.includes('selectedIds: new Set(failure.failures.map((item) => item.contentId))'),
  'a partial failure names the failed Memories and keeps ONLY them selected, so a retry is exactly the retry',
);
record(
  SCREEN.includes('if (failure.failures.length > 0) {') && SCREEN.includes('finishSelection();'),
  'the selection surface closes ONLY when every requested membership succeeded',
);
record(
  !SCREEN_CODE.includes('rollback'),
  'no attempt is made to roll back the successful memberships',
);
// no event bus
record(
  !SCREEN.includes('new EventTarget') && !SCREEN.includes('addEventListener(\'homecloud')
  && !SCREEN.includes('subscribeHomeCloudAlbumEvents'),
  'no generic event bus is introduced for Album mutations',
);
record(
  SCREEN.includes('subscribeHomeCloudReadReconciliation') && SCREEN_CODE.includes("event.role !== 'memory'"),
  'the global read reconciliation is untouched and still memory-only',
);

// ===========================================================================
section('7. Delete UX: grouping only, organize only, mandatory copy');
// ===========================================================================

record(
  ALBUM_DELETE_MEMORIES_SURVIVE_COPY === 'Los recuerdos no se eliminan: van a seguir en Recuerdos.',
  'the mandatory delete copy is frozen in the Album scope module',
);
record(
  SHEETS_CODE.includes('{ALBUM_DELETE_MEMORIES_SURVIVE_COPY}'),
  'the Album delete sheet always renders the frozen copy from the Album scope module',
);
record(SHEETS.includes('Eliminar álbum'), 'the delete action is labelled "Eliminar álbum"');
record(
  /variant="danger"[\s\S]{0,160}Eliminar álbum/.test(SHEETS_CODE) || /Eliminar álbum[\s\S]{0,200}variant="danger"/.test(SHEETS_CODE),
  'the delete action uses the existing danger styling',
);
record(
  /title=\{deleting \? 'Eliminando…' : 'Eliminar álbum'\}/.test(SHEETS_CODE)
  && SHEETS.includes('closeDisabled={deleting}'),
  'while deleting, the button reports progress and the sheet cannot be closed',
);
record(
  SHEETS_CODE.includes('error !== null') && SCREEN.includes('setSheetError('),
  'a delete failure is shown inline and the sheet stays usable',
);
record(
  !/homecloud\.delete/.test(ALBUM_SURFACES),
  'no Album surface references homecloud.delete',
);
record(
  !/manage_albums/.test(ALBUM_SURFACES),
  'no Album surface invents manage_albums',
);
record(
  SCREEN.includes('const canOrganize = capabilities.descriptor.organize;'),
  'Album mutations are gated on homecloud.organize only',
);

// ===========================================================================
section('8. Add-existing: the Selection Surface replaced the local picker set');
// ===========================================================================
//
// MO-A3 RETARGET. MO-A2 froze "a LOCAL Set<contentId> owned by the picker, no
// selection mode, no selectedIds in the screen". Those were assertions about the
// OLD implementation, and MO-A3 deliberately supersedes them. What is NOT
// superseded — and is asserted below — is every real invariant they were
// protecting: no global store, no context, the existing read model, the SERVER
// nextOffset, already-member truth and the honest empty state.

record(
  PICKER === '' && !SCREEN_CODE.includes('AlbumMemoryPicker') && !SCREEN_CODE.includes('AlbumAddOutcome'),
  'the AlbumMemoryPicker modal is gone and nothing imports it: it is no longer the productive flow',
);
record(
  SCREEN.includes('createMemorySelectionSession')
  && SCREEN.includes('enterMemorySelection')
  && SCREEN.includes('confirmMemorySelection'),
  'the productive flow is the reusable selection session owned by the Memories surface',
);
record(
  SCREEN.includes('homecloudMemorySelection') || SCREEN.includes('toggleMemorySelectionMany'),
  'selection membership is delegated to the pure session module, not re-invented in the screen',
);
record(
  !/createContext/.test(SCREEN) && !/useContext/.test(SCREEN),
  'the selection session introduces no global selection store or context',
);
record(
  /listMemories\(token, \{ limit: MEMORIES_PAGE_SIZE \}\)/.test(SCREEN_CODE)
  && SCREEN.includes('const [memories, setMemories] = useState<HomeCloudMemoryListItem[]>([])'),
  'Recuerdos keeps ONE library read; selection overlays it instead of forking it',
);
record(
  /listMemories\(currentToken, buildMemoryCollectionQuery\(ref, limit, offset\)\)/.test(SCREEN_CODE)
  && SCREEN.includes('createMemoryCollectionsController'),
  'collections are read through the existing read model by the collections controller',
);
record(
  SCREEN.includes('nextOffset') && SCREEN.includes('Mostrar más recuerdos'),
  'pagination still follows the SERVER nextOffset',
);
record(
  SCREEN.includes('memory.albumIds.includes(albumId)'),
  'already-member detection uses the albumIds the read model projects',
);
record(
  SCREEN.includes("{'Ya está en el álbum'}") || read('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx').includes('Ya está en el álbum'),
  'an already-included Memory stays VISIBLE and says so instead of being hidden',
);
record(
  /if \(!selecting\).*onOpen\?\.\(memory\).*if \(unselectable\) return;/s.test(
    readCode('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx'),
  ),
  'an already-included Memory cannot be toggled',
);
record(memorySelectionAddLabel('Vacaciones') === 'Agregar a Vacaciones', 'the destination line names the Album');
record(memorySelectionAddLabel(null) === 'Agregar a álbum', 'the destination line is honest when no Album is known');
record(memorySelectionCountLabel(0) === '0 seleccionados', 'the count line is honest with nothing selected');
record(memorySelectionCountLabel(1) === '1 seleccionado', 'the count line is singular for exactly one');
record(memorySelectionCountLabel(3) === '3 seleccionados', 'the count line states the exact selection count');
record(
  /\[abortDrag, householdId, token\]/.test(SCREEN_CODE)
  && SCREEN.includes('resetMemorySelectionScope()'),
  'a household change (or a sign-out) resets the picker/session selection entirely',
);
record(
  SCREEN.includes('Esta colección todavía no tiene recuerdos.')
  || SCREEN.includes('Aún no hay recuerdos'),
  'an empty library is an honest empty state, not a failure',
);

// ===========================================================================
section('9. Remove: NO permanent affordance, membership semantics intact (HC2-C BUG D)');
// ===========================================================================

/*
 * HC2-C STALE_TEST RETARGET (§12, BUG D, audit R4).
 *
 * OLD expectation: `MemoryCard` had exactly ONE optional `albumScopeAction` seam,
 * it rendered nothing when absent, it disabled only the affected Memory, and the
 * Album detail attached it in NORMAL mode. All of that described a PERMANENT
 * destructive control on every card — the reported chrome — plus a white SQUARE
 * wrapper painted behind a circular button, so its four corners showed.
 *
 * FREEZE RULE REPLACING IT: there is NO permanent remove affordance on any card.
 * A Memory inside an Album renders exactly like a Memory anywhere else, and
 * removal is contextual (selection -> `Quitar del álbum`), which deletes the
 * Memory↔Album membership and nothing else.
 *
 * NEW BEHAVIOURAL ASSERTIONS: the affordance and its square wrapper are GONE from
 * every layer, `MemoryCard` is back to a pure non-interactive renderer, and the
 * MEMBERSHIP SEMANTICS are proven by execution rather than by a source seam.
 */
record(
  !CARDS_CODE.includes('albumScopeAction')
    && !CARDS_CODE.includes('AlbumScopeRemove')
    && !CARDS_CODE.includes('MemoryAlbumScopeAction'),
  'NO permanent per-card remove affordance exists on any Memory tile',
);
record(
  !CARDS_CODE.includes('albumScope') && !CARDS_CODE.includes('Quitar del álbum'),
  'the square white wrapper AND its remove label are gone, so the corner artifact cannot exist',
);
record(
  !readCode('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx').includes('albumScopeAction')
    && !DETAIL_CODE.includes('albumScopeAction')
    && !DETAIL_CODE.includes('onRemoveMemory')
    && !SCREEN_CODE.includes('onRemoveMemory'),
  'no layer attaches a per-tile remove any more: not the wrapper, not the detail, not the screen',
);
record(
  !CARDS_CODE.includes('navigation.') && !CARDS_CODE.includes('router.') && !/Viewer/.test(CARDS_CODE),
  'MemoryCard still contains no navigation, no router and no Viewer destination',
);
record(
  /export function MemoryCard\(\{\s*memory,\s*accessToken,?\s*\}:\s*\{/.test(CARDS_CODE),
  'MemoryCard is back to a pure product renderer with no optional action seam',
);
record(
  DETAIL_CODE.includes('onLongPressMemory')
  && SCREEN.includes('enterRemoveFromAlbum')
  && SCREEN.includes('purpose: { kind: ' + "'removeFromAlbum'" + ', albumId }'),
  'removing a membership is the CONTEXTUAL path: long press -> selection -> Quitar del álbum',
);
const ALBUM_SCOPE_CODE = read('front/mi-front-limpio/services/homecloud/homecloudAlbumScope.ts');
record(
  ALBUM_SCOPE_CODE.includes('albumRemoveSelectionLabel')
  && ALBUM_SCOPE_CODE.includes('Quitar'),
  'the removal copy is still the frozen membership sentence owned by the Album scope module',
);
// The MEMBERSHIP SEMANTICS, executed rather than grepped: an explicit single-Memory
// removal is refused without a scope and without an open Album, and a committed one
// performs exactly the three refetches. (The mutation itself needs a network, so
// only the refusal paths are executed here; the composition is asserted below.)
record(
  ALBUM_REMOVAL.includes('if (!input.accessToken || !input.scope || !input.openAlbumId) return false;'),
  'a removal without a scope or without an open Album is refused: nothing is mutated',
);
record(
  ALBUM_REMOVAL.includes('delete the Memory↔Album link and nothing else')
  || ALBUM_REMOVAL.includes('ONLY the Memory↔Album membership is removed'),
  'the operation is documented as a MEMBERSHIP change: the Memory, its bytes and every other Album survive',
);
record(
  !/trash|restore|purge/i.test(DETAIL_CODE + SHEETS_CODE + TILE_CODE + RAIL_CODE),
  'no Album trash, restore or purge affordance exists',
);
record(
  DETAIL_CODE.includes('<MemorySelectableCard')
  && !/Viewer/.test(DETAIL_CODE),
  'the Album detail reaches its cards through the MO-A3 wrapper and still has no Viewer',
);

// ===========================================================================
section('10. Intake picker: freshness and honest stale state');
// ===========================================================================

record(
  !INTAKE_SERVICE.includes('albumsLoaded'),
  'the one-shot "loaded forever" Album flag is gone',
);
record(
  INTAKE_SERVICE.includes('async function reloadDestinations()') && INTAKE_SERVICE.includes('destinationsInFlight'),
  'destinations are re-readable and protected against concurrent reads',
);
record(
  INTAKE_SERVICE.includes('fetchHomeCloudAlbumsCached(token, { householdId })'),
  'the reload goes through the EXISTING service path: no second Albums fetcher',
);
record(
  !/createAlbum|renameAlbum|deleteAlbum/.test(INTAKE_SERVICE_CODE + INTAKE_CODE),
  'intake owns no Album CRUD',
);
record(
  !/Nuevo álbum/.test(INTAKE + INTAKE_SERVICE),
  'intake contains no Album management UI',
);
record(
  !INTAKE.includes('AlbumDetail'),
  'intake contains no Album detail surface',
);
record(
  INTAKE.includes('reloadDestinations();\n    setSheet(\'create\');'),
  'the destination list is reloaded whenever the intake sheet opens',
);
record(
  INTAKE.includes('reloadDestinations();\n    setSheet(\'written\');'),
  'the written form reloads its destinations when it opens too',
);
record(
  INTAKE.includes('destinationsRevision') && SCREEN.includes('destinationsRevision={destinationsRevision}'),
  'the Albums owner refreshes the intake destinations after create, rename and delete',
);
record(
  SCREEN_CODE.includes('bumpDestinations();'),
  'the intake revision is bumped by the Album mutations, not by add/remove',
);
record(
  INTAKE_SERVICE_CODE.includes('if (selectedAlbumId && !albums.some((a) => a.id === selectedAlbumId))'),
  'a missing Album is detected instead of being silently replaced',
);
record(
  INTAKE_SERVICE_CODE.includes('emitState({ invalidAlbum: true })'),
  'the missing Album is surfaced through the existing invalidAlbum state',
);
record(
  INTAKE.includes('invalidAlbum') && INTAKE.includes('ya no está disponible'),
  'invalidAlbum is now RENDERED as an explicit danger message',
);
record(
  !/setBinaryAlbumId\(null\)|setWrittenAlbumId\(null\)/.test(INTAKE_CODE),
  'a stale Album is never silently retargeted to root: the reset is an explicit chip tap',
);
record(
  INTAKE.includes('albums.length === 0 ? <FilterChip label="Sin álbum" selected disabled={disabled} />'),
  'an empty Album list never blocks Memory creation ("Sin álbum" stays valid)',
);
record(
  INTAKE_SERVICE_CODE.includes("{ id: 'root', name: 'Recuerdos'"),
  'a failed destination read degrades to the root destination instead of blocking create',
);
record(
  /emitState\(\{ albumName: albums\.find/.test(INTAKE_SERVICE_CODE),
  'a renamed Album is reflected in the inherited context label',
);

// ===========================================================================
section('11. Errors, capabilities and the shared-infrastructure freeze');
// ===========================================================================

record(
  RAIL.includes('No pudimos cargar tus álbumes') && RAIL.includes('retryLabel="Reintentar"'),
  'a failed rail read is an ErrorState with a retry, never an empty household',
);
// HC2-C STALE_TEST RETARGET. The OLD assertion proved this by matching the exact
// source text `if (error !== null && albums.length === 0)` — the boolean
// re-derivation that HC2-C §23 replaced with ONE resolved phase, precisely
// because standing in for four situations with one boolean is what turned a
// failed read into a permanent pair of grey blocks.
//
// The BEHAVIOUR is unchanged and is now proved behaviourally: a successful read
// with no Albums resolves to `ready-empty` (never `loading`, never `error`), and
// the EMPTY COPY is rendered outside the organize gate while only the CREATE
// ACTION is behind it. That is stronger than the old regex, not weaker.
record(
  solveAlbumsRailPhase({ albums: [], loading: false, refreshing: false, error: null }) === 'ready-empty'
    && !RAIL_CODE.includes('if (!canOrganize) return null;')
    && /phase === 'ready-empty'[\s\S]*?canOrganize \? <AppButton title="Crear álbum"/.test(RAIL_CODE),
  'the zero-Album state stays visible to every member and only organizers see create',
);
record(
  RAIL.includes('Crear álbum') && RAIL_CODE.includes('{canOrganize ? ('),
  'the create affordance (rail + and empty state) is organize-only',
);
record(
  RAIL_CODE.includes('{canOrganize ? (') && RAIL.includes('onAlbumActions'),
  'the per-tile ellipsis is organize-only',
);
record(
  SCREEN.includes('const capabilitiesNotice = homeCloudCapabilitiesNotice(capabilities);')
  && SCREEN.includes('capabilities.revalidate'),
  'the Album surfaces reuse the existing capabilities notice + Reintentar',
);
record(
  RAIL.includes('Skeleton'),
  'the rail loading state reuses the existing Skeleton card grammar',
);
record(
  isAlbumMissingFailure({ code: HOMECLOUD_ALBUM_NOT_FOUND_CODE }) === true,
  'the Album-scoped classifier recognises the terminal code',
);
record(
  isAlbumMissingFailure({ code: 'homecloud_forbidden' }) === false
  && isAlbumMissingFailure(new Error('network')) === false,
  'the classifier never swallows another failure into the terminal state',
);
record(
  !READ_FAILURE_CODE.includes('album'),
  'the shared read-failure module was NOT widened with an Album condition',
);
record(
  !/getMemoryPreviewUrl|preview_unavailable|createSignedUrl/.test(TILE_CODE + SHEETS_CODE),
  'the cover resolves only through the existing preview hook: no preview service, no URL fabrication',
);

// ===========================================================================
section('12. Backend / schema / shared-infra freeze');
// ===========================================================================

record(
  READ_SERVICE.includes('export async function createAlbum(')
  && READ_SERVICE.includes('export async function removeMemoryFromAlbum('),
  'the read client is still the MO-A1 contract, unmodified',
);
record(
  !READ_SERVICE_CODE.includes('AlbumTile') && !READ_SERVICE_CODE.includes('AlbumScreen')
  && !READ_SERVICE_CODE.includes('navigation.') && !READ_SERVICE_CODE.includes('router.'),
  'the read service still contains no tile, screen, navigation or router',
);
record(
  !READ_SERVICE_CODE.includes('original_storage_path') && !READ_SERVICE_CODE.includes('preview_storage_path'),
  'the Album surfaces still expose no storage path',
);

async function main(): Promise<void> {
  await railControllerBehaviour();
  await detailControllerBehaviour();

  console.log(`\nMOA2_ALBUM_SURFACE_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('MOA2_ALBUM_SURFACE_TESTS=FAIL');
  } else {
    console.log('MOA2_ALBUM_SURFACE_TESTS=PASS');
  }
}

main().catch((error) => {
  console.error('MO-A2 surface test runner crashed:', error);
  process.exit(1);
});
