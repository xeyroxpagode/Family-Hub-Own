#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const rail = read('front/mi-front-limpio/components/homecloud/AlbumsRail.tsx');
const collections = read('front/mi-front-limpio/services/homecloud/homecloudMemoryCollectionsPagination.ts');
const readService = read('front/mi-front-limpio/services/homecloud/homecloudReadService.ts');
const backendRead = read('backend/src/services/homecloudReadService.js');
const actions = read('front/mi-front-limpio/services/homecloud/homecloudMemoryActions.ts');

let failed = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`PASS: ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL: ${label}\n  ${error.message}`);
  }
}

console.log('\n=== HOMECLOUD P3 ORGANIZATION + REDISCOVERY ===');

check('P3.0 removes stale activeTab gating from global chrome hiding', () => {
  const nav = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  assert.match(nav, /const chromeHidden = viewerOpen;/);
  assert.doesNotMatch(nav, /viewerOpen && activeTab === 'MoreTab'/);
});

check('Trash uses server lifecycle contracts and real Undo restore', () => {
  assert.match(readService, /trashMemory[\s\S]*\/trash/);
  assert.match(readService, /restoreMemory[\s\S]*\/restore/);
  assert.match(readService, /purgeMemory[\s\S]*method: 'DELETE'/);
  assert.match(readService, /purgeAllMemories[\s\S]*\/memories\/purge-all/);
  assert.match(screen, /onUndo: \(\) => \{ void restoreIds\(contentIds\); \}/);
  assert.match(screen, /Alert\.alert\(\s*'Eliminar definitivamente'/);
  assert.match(screen, /Alert\.alert\(\s*'Vaciar papelera'/);
});

check('Trash read mode is explicit and active reads still default active', () => {
  assert.match(backendRead, /function normalizeMemoryLifecycle[\s\S]*return 'active'/);
  assert.match(backendRead, /lifecycle !== 'active' && lifecycle !== 'trashed'/);
  assert.match(collections, /kind: 'trash'/);
  assert.match(collections, /lifecycle: 'trashed'/);
});

check('Album creation lives as a final rail tile and header + Nuevo is gone', () => {
  assert.match(rail, /<FavoritesTile onPress=\{onOpenFavorites\} \/>[\s\S]*albums\.map[\s\S]*<CreateAlbumTile onPress=\{onCreateAlbum\} \/>/);
  assert.doesNotMatch(rail, />\+ Nuevo</);
  assert.match(rail, />Nuevo álbum</);
});

check('Selection destination can create an album and attach the original selection', () => {
  assert.match(screen, /setCreateAlbumForSelection\(true\)/);
  assert.match(screen, /const album = await createAlbum\(token, name, scope\)/);
  assert.match(screen, /await addMemoryToAlbum\(token, album\.id, contentId, scope\)/);
  assert.match(screen, /cancelMemorySelection/);
});

check('Favorites is a smart collection, not a normal album', () => {
  assert.match(rail, /function FavoritesTile/);
  assert.match(collections, /kind: 'favorites'/);
  assert.match(collections, /favorite: true/);
  assert.match(collections, /memoryCollectionTitle[\s\S]*Favoritos/);
  assert.doesNotMatch(screen, /Agregar.*Favoritos/);
});

check('Resurfacing is exact-only, active, not hidden, and hide persists through PATCH', () => {
  assert.match(collections, /kind: 'resurfacing'/);
  assert.match(collections, /resurfacing: true/);
  assert.match(backendRead, /\.eq\('capture_precision', 'exact'\)[\s\S]*\.eq\('hidden_from_resurfacing', false\)/);
  assert.match(screen, /capturePrecision !== 'exact'/);
  assert.match(screen, /hiddenFromResurfacing/);
  assert.match(screen, /updateMemory\(token, contentId, \{ hiddenFromResurfacing: true \}/);
  assert.match(actions, /hideFromResurfacing/);
});

if (failed > 0) {
  console.error(`\nHOMECLOUD_P3_ORGANIZATION_REDISCOVERY=FAIL fail=${failed}`);
  process.exit(1);
}

console.log('\nHOMECLOUD_P3_ORGANIZATION_REDISCOVERY=PASS');
