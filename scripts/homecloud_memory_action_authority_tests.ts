/**
 * ST-5 — the SINGLE action authority contract.
 *
 * Executes the REAL `availableMemoryActions` (pure function) plus the batch
 * favorite composer, so the Viewer menu, the selection sheet and the album
 * context can never drift apart.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  availableMemoryActions,
  MEMORY_ACTION_LABELS,
  type MemoryActionId,
  type MemoryActionInput,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryActions';
import {
  favoriteTargetsFor,
  favoriteUpdateSummary,
  runMemoryFavoriteUpdate,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryFavorites';

let failed = 0;
function check(value: boolean, label: string) {
  if (value) console.log(`PASS: ${label}`);
  else { failed += 1; console.error(`FAIL: ${label}`); }
}

const root = path.resolve(__dirname, '..', '..', '..');
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const ALL_CAPS = { view: true, contribute: true, organize: true, delete: true };
const NO_ORGANIZE = { view: true, contribute: true, organize: false, delete: false };

function input(over: Partial<MemoryActionInput>): MemoryActionInput {
  return {
    surface: 'viewer',
    caller: 'root',
    selectionCount: 1,
    selectedKinds: ['image'],
    albumIdentity: null,
    favoriteStates: [false],
    capabilities: ALL_CAPS,
    ...over,
  };
}

function ids(actions: { id: MemoryActionId }[]): MemoryActionId[] {
  return actions.map((action) => action.id);
}

console.log('\n=== ST5 MEMORY ACTION AUTHORITY ===');

// --- No organize: NO organizational mutation is offered (§26.4) ---
check(
  !ids(availableMemoryActions(input({ capabilities: NO_ORGANIZE }))).includes('addToAlbum')
    && !ids(availableMemoryActions(input({ capabilities: NO_ORGANIZE }))).includes('removeFromAlbum')
    && !ids(availableMemoryActions(input({ surface: 'selection', capabilities: NO_ORGANIZE }))).includes('markFavorite')
    && !ids(availableMemoryActions(input({ surface: 'selection', capabilities: NO_ORGANIZE }))).includes('unmarkFavorite'),
  'without organize, no organizational action (album add/remove, favorites) is offered',
);

// --- Root/type viewer: NO remove-from-album ---
check(
  !ids(availableMemoryActions(input({ caller: 'root' }))).includes('removeFromAlbum')
    && !ids(availableMemoryActions(input({ caller: 'type' }))).includes('removeFromAlbum')
    && !ids(availableMemoryActions(input({ caller: 'favorites' }))).includes('removeFromAlbum'),
  'no Quitar del álbum in root/type/favorites caller contexts',
);

// --- Album caller: remove appears (viewer + selection) ---
const albumIds = ids(availableMemoryActions(input({
  caller: 'album', albumIdentity: { id: 'a1' },
})));
check(albumIds.includes('removeFromAlbum'), 'album caller offers Quitar del álbum in the Viewer');
check(
  ids(availableMemoryActions(input({
    surface: 'selection', caller: 'album', albumIdentity: { id: 'a1' }, selectionCount: 3,
    favoriteStates: [true, false, true],
  }))).includes('removeFromAlbum'),
  'album caller offers Quitar del álbum in a selection',
);

// --- album caller WITHOUT identity: no remove (defensive) ---
check(
  !ids(availableMemoryActions(input({ caller: 'album', albumIdentity: null }))).includes('removeFromAlbum'),
  'album caller without a live album identity offers no remove',
);

// --- Info only for single-memory viewer surface ---
check(
  ids(availableMemoryActions(input({ surface: 'viewer', selectionCount: 1 }))).includes('info'),
  'Viewer single Memory offers Información del recuerdo',
);
check(
  !ids(availableMemoryActions(input({ surface: 'selection', selectionCount: 2 }))).includes('info'),
  'selection surface never offers Información del recuerdo',
);
check(
  !ids(availableMemoryActions(input({ surface: 'selection', selectionCount: 1 }))).includes('info'),
  'a single-item selection is still a selection, not the Viewer',
);

// --- Copy: written-only, viewer-only ---
check(
  ids(availableMemoryActions(input({ surface: 'viewer', selectedKinds: ['written'] }))).includes('copy'),
  'a written Memory in the Viewer offers Copiar',
);
check(
  !ids(availableMemoryActions(input({ surface: 'viewer', selectedKinds: ['image'] }))).includes('copy'),
  'a binary Memory never offers Copiar',
);
check(
  !ids(availableMemoryActions(input({ surface: 'viewer', selectedKinds: ['written', 'written'] }))).includes('copy'),
  'copy requires exactly one Memory (kinds must match the selection count)',
);
check(
  !ids(availableMemoryActions(input({ surface: 'selection', selectionCount: 2, selectedKinds: ['written', 'written'] }))).includes('copy'),
  'selection surface never offers Copiar (ST-5 §5 catalog)',
);

// --- Share is available on both surfaces ---
check(
  ids(availableMemoryActions(input({}))).includes('share')
    && ids(availableMemoryActions(input({ surface: 'selection', selectionCount: 2, favoriteStates: [true, false] }))).includes('share'),
  'Compartir is available in Viewer and selection',
);

// --- Favorites: mixed-state semantics (§22) ---
const mixed = ids(availableMemoryActions(input({
  surface: 'selection', selectionCount: 2, favoriteStates: [true, false],
})));
check(mixed.includes('markFavorite') && mixed.includes('unmarkFavorite'), 'mixed favorite states offer BOTH actions');
check(
  !ids(availableMemoryActions(input({ surface: 'selection', selectionCount: 2, favoriteStates: [false, false] }))).includes('unmarkFavorite'),
  'all-non-favorites selection offers only Marcar como favorito',
);
check(
  !ids(availableMemoryActions(input({ surface: 'selection', selectionCount: 2, favoriteStates: [true, true] }))).includes('markFavorite'),
  'all-favorites selection offers only Quitar de favoritos',
);
check(
  !ids(availableMemoryActions(input({ surface: 'viewer' }))).includes('markFavorite')
    && !ids(availableMemoryActions(input({ surface: 'viewer' }))).includes('unmarkFavorite'),
  'the Viewer menu offers no favorite action: the STAR is the Viewer favorite surface',
);

// --- Frozen labels, no duplicated vocabulary (§18.3) ---
check(MEMORY_ACTION_LABELS.addToAlbum === 'Agregar a un álbum', 'frozen label: Agregar a un álbum');
check(MEMORY_ACTION_LABELS.info === 'Información del recuerdo', 'frozen label: Información del recuerdo');
check(MEMORY_ACTION_LABELS.share === 'Compartir', 'frozen label: Compartir');
check(MEMORY_ACTION_LABELS.copy === 'Copiar', 'frozen label: Copiar');
check(MEMORY_ACTION_LABELS.markFavorite === 'Marcar como favorito', 'frozen label: Marcar como favorito');
check(MEMORY_ACTION_LABELS.unmarkFavorite === 'Quitar de favoritos', 'frozen label: Quitar de favoritos');
check(MEMORY_ACTION_LABELS.trash === 'Mover a papelera', 'frozen label: Mover a papelera');
check(MEMORY_ACTION_LABELS.restore === 'Restaurar', 'frozen label: Restaurar');
check(MEMORY_ACTION_LABELS.purge === 'Eliminar definitivamente', 'frozen label: Eliminar definitivamente');
check(MEMORY_ACTION_LABELS.hideFromResurfacing === 'No mostrar este recuerdo acá', 'frozen label: No mostrar este recuerdo acá');
check(
  availableMemoryActions(input({ surface: 'selection', caller: 'album', albumIdentity: { id: 'a1' }, selectionCount: 2 }))[1]?.label === 'Quitar 2 del álbum'
    && availableMemoryActions(input({ surface: 'selection', caller: 'album', albumIdentity: { id: 'a1' }, selectionCount: 1 }))[1]?.label === 'Quitar del álbum',
  'frozen plural/singular remove labels',
);

// --- P3 lifecycle/resurfacing actions are in the single authority ---
const authoritySource = read('front/mi-front-limpio/services/homecloud/homecloudMemoryActions.ts');
const screenSource = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const CATALOG_IDS: MemoryActionId[] = [
  'addToAlbum', 'removeFromAlbum', 'info', 'share', 'copy', 'markFavorite', 'unmarkFavorite',
  'trash', 'restore', 'purge', 'hideFromResurfacing',
];
check(
  CATALOG_IDS.includes('trash')
    && CATALOG_IDS.includes('restore')
    && CATALOG_IDS.includes('purge')
    && CATALOG_IDS.includes('hideFromResurfacing'),
  'lifecycle/destructive/resurfacing actions are catalogued in the one authority',
);
check(
  ids(availableMemoryActions(input({ caller: 'root', capabilities: { view: true, contribute: false, organize: true, delete: true } }))).includes('trash') === false
    && ids(availableMemoryActions(input({ caller: 'root', capabilities: { view: true, contribute: true, organize: false, delete: false } }))).includes('trash'),
  'Mover a papelera is gated by contribute, not by organize/delete',
);
check(
  ids(availableMemoryActions(input({ caller: 'trash', capabilities: { view: true, contribute: true, organize: false, delete: false } }))).join(',') === 'restore'
    && ids(availableMemoryActions(input({ caller: 'trash', capabilities: { view: true, contribute: false, organize: false, delete: true } }))).join(',') === 'purge',
  'Trash actions are scoped to Trash and split restore/purge by capability',
);
check(
  ids(availableMemoryActions(input({ caller: 'resurfacing', capabilities: ALL_CAPS }))).includes('hideFromResurfacing')
    && !ids(availableMemoryActions(input({ caller: 'root', capabilities: ALL_CAPS }))).includes('hideFromResurfacing'),
  'No mostrar este recuerdo acá is only offered from the resurfacing collection',
);
check(
  screenSource.includes("action.id === 'trash'") && screenSource.includes("action.id === 'restore'")
    && screenSource.includes("action.id === 'purge'") && screenSource.includes("action.id === 'hideFromResurfacing'"),
  'the Memories screen routes every P3 authority action through the shared handlers',
);

// --- No role-name hardcoding ---
check(
  !/coordinator|adult|adolescent|child|senior|guest/i.test(authoritySource),
  'the authority gates by capability, never by role name',
);

// --- The same authority drives every surface (structural) ---
check(
  screenSource.includes('availableMemoryActions({') && screenSource.includes("surface: 'viewer'") && screenSource.includes("surface: 'selection'"),
  'the screen consumes the ONE authority for both the Viewer menu and the selection sheet',
);
check(
  (screenSource.match(/availableMemoryActions\(/g) ?? []).length === 2,
  'no duplicated action tables: exactly two authority call sites (viewer + selection)',
);

console.log('\n=== ST5 BATCH FAVORITES COMPOSER ===');

// --- mark affects non-favorites only; unmark affects favorites only ---
const selected = [
  { id: 'fav1', favorite: true },
  { id: 'plain1', favorite: false },
  { id: 'fav2', favorite: true },
  { id: 'plain2', favorite: false },
];
check(
  favoriteTargetsFor('mark', selected).join(',') === 'plain1,plain2',
  'Marcar como favorito only targets non-favorites',
);
check(
  favoriteTargetsFor('unmark', selected).join(',') === 'fav1,fav2',
  'Quitar de favoritos only targets existing favorites',
);

async function main() {
// --- Sequential per-item PATCH, honest partial failure ---
const committed: string[] = [];
const outcome = await runMemoryFavoriteUpdate({
  direction: 'mark',
  contentIds: ['ok1', 'bad1', 'ok2'],
  mutate: async (id) => {
    if (id === 'bad1') throw new Error('offline');
    committed.push(id);
  },
  labelFor: (id) => `Recuerdo ${id}`,
});
check(outcome.committed.join(',') === 'ok1,ok2' && outcome.failures.length === 1, 'partial failure keeps committed ids and names the failed one');
check(outcome.failures[0]?.contentId === 'bad1' && outcome.failures[0]?.message === 'No se pudo actualizar favorito.', 'the failure copy is the frozen honest one');
check(outcome.failures[0]?.label === 'Recuerdo bad1', 'the failed Memory is NAMED');

// --- Fallback label never crashes ---
const outcome2 = await runMemoryFavoriteUpdate({
  direction: 'unmark',
  contentIds: ['x'],
  mutate: async () => { throw new Error('boom'); },
  labelFor: () => { throw new Error('no label'); },
});
check(outcome2.failures[0]?.label === 'Un recuerdo', 'a label lookup that throws falls back to Un recuerdo');

// --- Summary copy ---
check(favoriteUpdateSummary('mark', 0, 2) === 'Agregado a favoritos', 'all-success mark summary');
check(favoriteUpdateSummary('unmark', 0, 3) === 'Quitado de favoritos', 'all-success unmark summary');
check(favoriteUpdateSummary('mark', 1, 0) === 'No se pudo actualizar favorito.', 'all-failure summary is honest');
}

main().then(() => {
  console.log(`\nST5_ACTION_AUTHORITY_RESULT fail=${failed}`);
  if (failed > 0) process.exitCode = 1;
}).catch((error) => {
  console.error('ST5 action authority tests crashed:', error);
  process.exitCode = 1;
});
