/**
 * ST-5 — favorites actions contract.
 *
 * Star toggle + batch favorites: optimistic with rollback, rapid-request guard,
 * mixed-state semantics, honest partial failure with retry, and the persisted
 * field is exactly `favorite` (never `is_favorite`).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const viewer = read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
const favoritesModule = read('front/mi-front-limpio/services/homecloud/homecloudMemoryFavorites.ts');
const readService = read('front/mi-front-limpio/services/homecloud/homecloudReadService.ts');
const types = read('front/mi-front-limpio/services/homecloud/homecloudTypes.ts');
const migration = read('supabase/migrations/20261007000000_homecloud_memories_favorite_v1.sql');

let failed = 0;
async function check(label, fn) {
  try { await fn(); console.log(`PASS: ${label}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${label}\n  ${error.message}`); }
}

(async () => {
  console.log('\n=== ST5 FAVORITES ACTIONS ===');

  await check('the persisted field is exactly `favorite`, never is_favorite', () => {
    assert.doesNotMatch(screen, /is_favorite/);
    assert.doesNotMatch(viewer, /is_favorite/);
    assert.doesNotMatch(favoritesModule, /is_favorite/);
    assert.ok(!migration.includes('is_favorite'));
    assert.match(types, /readonly favorite: boolean;/);
  });

  await check('the star reflects backend favorite and toggles through the existing ST-3 PATCH', () => {
    assert.match(screen, /updateMemory\(token, contentId, \{ favorite: !current \}\)/);
    assert.match(readService, /readonly favorite\?: boolean;/);
    assert.match(readService, /Requires homecloud\.organize server-side/);
  });

  await check('the star toggles immediately (optimistic) and rolls back on failure', () => {
    const i = screen.indexOf('const toggleFavorite = useCallback');
    const window = screen.slice(i, i + 1200);
    assert.match(window, /setFavoriteEverywhere\(contentId, !current\)/);
    assert.match(window, /\.catch\(\(\) => \{/);
    assert.match(window, /setFavoriteEverywhere\(contentId, current\)/);
  });

  await check('rapid contradictory requests are prevented by a pending guard', () => {
    const i = screen.indexOf('const toggleFavorite = useCallback');
    const window = screen.slice(i, i + 1200);
    assert.match(window, /pendingFavoriteIdsRef\.current\.has\(contentId\)/);
    assert.match(window, /pendingFavoriteIdsRef\.current\.add\(contentId\)/);
    assert.match(window, /pendingFavoriteIdsRef\.current\.delete\(contentId\)/);
  });

  await check('the Viewer stays open and the caller intact after a favorite toggle', () => {
    const i = screen.indexOf('const toggleFavorite = useCallback');
    const window = screen.slice(i, i + 1200);
    assert.doesNotMatch(window, /setViewer\(null\)/);
    assert.doesNotMatch(window, /setInfoContentId/);
  });

  await check('the exact frozen feedback copy is used', () => {
    assert.ok(screen.includes("'Agregado a favoritos'"));
    assert.ok(screen.includes("'Quitado de favoritos'"));
    assert.ok(screen.includes("'No se pudo actualizar favorito.'"));
  });

  await check('batch favorites respect mixed-state semantics via favoriteTargetsFor', () => {
    assert.match(screen, /favoriteTargetsFor\(direction, selected\)/);
    assert.match(favoritesModule, /direction === 'mark' \? memory\.favorite !== true : memory\.favorite === true/);
  });

  await check('partial favorite failures keep ONLY the failed ids selected, so retry is the retry', () => {
    const i = screen.indexOf('const runSelectionFavorites = useCallback');
    const window = screen.slice(i, i + 3000);
    assert.match(window, /selectedIds: new Set\(outcome\.failures\.map/);
    assert.match(window, /setSelectionFailure/);
  });

  await check('failed favorites roll back their optimistic state', () => {
    const i = screen.indexOf('const runSelectionFavorites = useCallback');
    const window = screen.slice(i, i + 3000);
    assert.match(window, /for \(const failure of outcome\.failures\) setFavoriteEverywhere\(failure\.contentId, direction !== 'mark'\)/);
  });

  await check('selection favorites require homecloud.organize (authority-gated, not role-gated)', () => {
    const i = screen.indexOf('const selectionActionItems = useMemo');
    const window = screen.slice(i, i + 2200);
    assert.match(window, /capabilities: capabilities\.descriptor/);
    const share = read('front/mi-front-limpio/services/homecloud/homecloudMemoryActions.ts');
    assert.match(share, /if \(organize && input\.surface === 'selection'\)/);
  });

  await check('the favorite star is rendered only when organize is granted', () => {
    assert.match(viewer, /canOrganize && onToggleFavorite \?/);
    const i = screen.indexOf('<MemoryViewer\n');
    assert.ok(i !== -1, 'the Viewer JSX invocation must exist');
    const window = screen.slice(i, i + 900);
    assert.match(window, /canOrganize=\{canOrganize && !\(viewer\.source\.kind === 'collection' && viewer\.source\.collection\.kind === 'trash'\)\}/);
    assert.match(window, /onToggleFavorite=\{\(\) => toggleFavorite\(viewer\.activeContentId\)\}/);
  });

  await check('favorites are HOUSEHOLD_SHARED: no per-member model is introduced', () => {
    assert.doesNotMatch(favoritesModule, /member|person/i);
    assert.doesNotMatch(types, /favoriteByMember/);
    assert.match(types, /HOUSEHOLD_SHARED favorite/);
  });

  await check('P3 implements Favorites as the first smart collection tile in the Albums rail', () => {
    const rail = read('front/mi-front-limpio/components/homecloud/AlbumsRail.tsx');
    assert.match(rail, /<FavoritesTile onPress=\{onOpenFavorites\} \/>[\s\S]*albums\.map/);
    assert.match(rail, />Favoritos</);
    assert.match(screen, /openFavorites/);
  });

  console.log(`\nST5_FAVORITE_ACTIONS_RESULT fail=${failed}`);
  if (failed > 0) process.exitCode = 1;
})().catch((error) => { console.error('ST5 favorite action tests crashed:', error); process.exitCode = 1; });
