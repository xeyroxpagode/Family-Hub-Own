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
  albumAddSelectionLabel,
  albumItemCountLabel,
  isAlbumMissingFailure,
} from '../front/mi-front-limpio/services/homecloud/homecloudAlbumScope';
import {
  ALBUMS_RAIL_INITIAL,
  createAlbumsRailController,
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
const PICKER = read('front/mi-front-limpio/components/homecloud/AlbumMemoryPicker.tsx');
const PICKER_CODE = readCode('front/mi-front-limpio/components/homecloud/AlbumMemoryPicker.tsx');
const DETAIL = read('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx');
const DETAIL_CODE = readCode('front/mi-front-limpio/components/homecloud/AlbumDetailView.tsx');
const CARDS = read('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
const CARDS_CODE = readCode('front/mi-front-limpio/components/homecloud/MemoryCards.tsx');
const READ_FAILURE = read('front/mi-front-limpio/services/homecloud/homecloudReadFailure.ts');
const READ_FAILURE_CODE = readCode('front/mi-front-limpio/services/homecloud/homecloudReadFailure.ts');
const NAV_TYPES = read('front/mi-front-limpio/navigation/types.ts');

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
record(
  !/sections=\{\[\.\.\./.test(SCREEN_CODE) && !SCREEN_CODE.includes('kind: \'album\''),
  'Albums is NOT injected as a synthetic Timeline section',
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
record(
  TILE_CODE.includes("preview.phase !== 'ready'") && TILE.includes('AlbumCoverFallback'),
  'unavailable and error phases both render the SAME stable fallback',
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
record(
  DETAIL_CODE.includes('groupMemoriesForTimeline(state.memories)')
  && DETAIL_CODE.includes('flattenTimelineForSectionList('),
  'the detail reuses the frozen grouping primitives unmodified',
);
record(
  !/\.sort\(/.test(DETAIL_CODE),
  'the Album detail never re-sorts: the server order IS the Album order',
);
record(
  DETAIL_CODE.includes('<MemoryCard') && !DETAIL_CODE.includes('AlbumMemory'),
  'the detail reuses MemoryCard and invents no Album-specific Memory DTO',
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

for (const [call, label] of [
  ['createAlbum(token, name, scope)', 'createAlbum'],
  ['renameAlbum(token, editor.album.id, name, scope)', 'renameAlbum'],
  ['deleteAlbum(token, actionsAlbum.id, scope)', 'deleteAlbum'],
  ['addMemoryToAlbum(token, openAlbumId, contentId, scope)', 'addMemoryToAlbum'],
  ['removeMemoryFromAlbum(token, openAlbumId, memory.id, scope)', 'removeMemoryFromAlbum'],
] as const) {
  record(SCREEN.includes(call), `${label} is called with the mandatory { householdId } scope`);
}
record(
  SCREEN_CODE.includes('useMemo<HomeCloudScope | null>') && SCREEN.includes('householdId ? { householdId } : null'),
  'the scope is built from the CURRENT household and nothing else',
);
record(
  (SCREEN_CODE.match(/createAlbum\(|renameAlbum\(|deleteAlbum\(|addMemoryToAlbum\(|removeMemoryFromAlbum\(/g) ?? []).length === 5,
  'each of the five client mutations is called exactly once from the Album surface',
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
// add -> detail page 0 + rail + timeline
record(
  /if \(added\.length > 0\) \{[\s\S]*?detailControllerRef\.current!\.refresh\(\);[\s\S]*?await reloadRail\(\);[\s\S]*?await readFirstPage\(\)/.test(SCREEN_CODE),
  'a successful add refetches Album detail page 0, the rail and Timeline page 0',
);
// remove -> detail + rail + timeline
record(
  /await removeMemoryFromAlbum\(token, openAlbumId, memory\.id, scope\);[\s\S]*?detailControllerRef\.current!\.refresh\(\);[\s\S]*?await reloadRail\(\);[\s\S]*?await readFirstPage\(\)/.test(SCREEN_CODE),
  'remove refetches Album detail, the rail and Timeline page 0',
);
// partial failure honesty
record(
  /for \(const contentId of contentIds\) \{[\s\S]*?added\.push\(contentId\);[\s\S]*?failures\.push\(/m.test(SCREEN_CODE),
  'additions run sequentially and a failure is collected instead of swallowed',
);
record(
  PICKER.includes('outcome.failures.length === 0') && PICKER.includes('onClose()'),
  'the picker closes ONLY when every requested membership succeeded',
);
record(
  PICKER.includes('setFailures([...outcome.failures])')
  && PICKER.includes('Los que sí se agregaron ya están en el álbum.'),
  'a partial failure names the failed Memories and states that the rest are already saved',
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
  !/homecloud\.delete/.test(SHEETS_CODE + TILE_CODE + RAIL_CODE + DETAIL_CODE + PICKER_CODE + SCREEN_CODE),
  'no Album surface references homecloud.delete',
);
record(
  !/manage_albums/.test(SHEETS_CODE + TILE_CODE + RAIL_CODE + DETAIL_CODE + PICKER_CODE + SCREEN_CODE),
  'no Album surface invents manage_albums',
);
record(
  SCREEN.includes('const canOrganize = capabilities.descriptor.organize;'),
  'Album mutations are gated on homecloud.organize only',
);

// ===========================================================================
section('8. Add-existing picker: local selection only');
// ===========================================================================

record(
  PICKER.includes('useState<Set<string>>') && PICKER.includes('new Set()'),
  'the selection is a LOCAL Set<contentId> owned by the picker',
);
record(
  !PICKER.includes('createContext') && !PICKER.includes('useContext'),
  'the picker introduces no global selection store or context',
);
record(
  !SCREEN.includes('selectedIds') && !SCREEN.includes('selectionMode') && !SCREEN.includes('ActionBar'),
  'no Timeline-level selection mode, selectedIds store or shared action bar exists',
);
record(
  /listMemories\(accessToken, \{ order: 'timeline', limit: PICKER_PAGE_SIZE, offset: 0 \}\)/.test(PICKER_CODE),
  'the picker reads the existing Memories read model in Timeline order',
);
record(
  PICKER_CODE.includes('nextOffset') && PICKER.includes('Cargar más recuerdos'),
  'the picker paginates with the SERVER nextOffset',
);
record(
  PICKER_CODE.includes('memory.albumIds.includes(albumId)'),
  'already-member detection uses the albumIds the read model projects',
);
record(
  PICKER.includes('Ya está en el álbum') && PICKER_CODE.includes('if (alreadyMember) return;'),
  'an already-included Memory is marked and cannot be selected again',
);
record(albumAddSelectionLabel(0) === 'Agregar', 'the CTA is honest with nothing selected');
record(albumAddSelectionLabel(3) === 'Agregar (3)', 'the CTA states the exact selection count');
record(
  /\[albumId, householdId, loadFirstPage, resetSelection, visible\]/.test(PICKER_CODE)
  && PICKER_CODE.includes('generationRef.current += 1')
  && PICKER_CODE.includes('resetSelection();'),
  'a household or Album change resets the picker selection entirely',
);
record(
  PICKER.includes('Todavía no hay recuerdos'),
  'an empty library is an honest empty state, not a failure',
);

// ===========================================================================
section('9. Remove: single, current Album only, no Viewer');
// ===========================================================================

record(
  CARDS.includes('albumScopeAction?: MemoryAlbumScopeAction;'),
  'MemoryCard gained exactly ONE optional Album-scope seam',
);
record(CARDS.includes('if (!action) return null;'), 'the seam renders nothing when it is absent');
record(
  CARDS.includes('onPress={action.onRemoveFromAlbum}')
  && CARDS.includes('loading={action.removing}') && CARDS.includes('disabled={action.removing}'),
  'the affordance removes one membership and disables only its own action while in flight',
);
record(
  !CARDS_CODE.includes('navigation.') && !CARDS_CODE.includes('router.') && !/Viewer/.test(CARDS_CODE),
  'MemoryCard still contains no navigation, no router and no Viewer destination',
);
record(
  !SCREEN_CODE.match(/<MemoryCard[^>]*albumScopeAction/),
  'the Timeline MemoryCard call site never supplies the seam (Timeline behavior unchanged)',
);
record(
  DETAIL_CODE.includes('albumScopeAction='),
  'the seam is attached only inside the Album detail',
);
record(
  DETAIL_CODE.includes('removing: removingContentId === memory.id'),
  'only the affected Memory disables while its removal is in flight',
);
record(
  /catch \{[\s\S]{0,220}?setRemovingContentId\(null\);/.test(SCREEN_CODE),
  'a failed removal leaves the Memory rendered and releases the affordance',
);
record(
  !/trash|restore|purge/i.test(DETAIL_CODE + PICKER_CODE + SHEETS_CODE + TILE_CODE + RAIL_CODE),
  'no Album trash, restore or purge affordance exists',
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
record(
  RAIL_CODE.includes('if (error !== null && albums.length === 0)') && RAIL_CODE.includes('if (!canOrganize) return null;'),
  'the zero-Album state only advertises create for an organizing member',
);
record(
  RAIL.includes('Nuevo álbum') && RAIL_CODE.includes('{canOrganize ? ('),
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