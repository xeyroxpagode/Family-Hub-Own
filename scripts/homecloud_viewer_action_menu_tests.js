/**
 * ST-5 — the Viewer action menu contract.
 *
 * Structural evidence that the `...` control exists in the Viewer top chrome,
 * that it opens the SAME single ActionSheet host (never a second Modal), and
 * that the available actions come from the ONE authority.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const viewer = read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
const screen = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const actionSheet = read('front/mi-front-limpio/components/ui/ActionSheet.tsx');

let failed = 0;
async function check(label, fn) {
  try { await fn(); console.log(`PASS: ${label}`); }
  catch (error) { failed += 1; console.error(`FAIL: ${label}\n  ${error.message}`); }
}

(async () => {
  console.log('\n=== ST5 VIEWER ACTION MENU ===');

  await check('the Viewer top chrome exposes the ... control with an explicit accessibility label', () => {
    assert.match(viewer, /ellipsis-horizontal/);
    assert.match(viewer, /Acciones del recuerdo/);
    assert.match(viewer, /onOpenActions/);
  });

  await check('the ... control preserves the caller: it is a prop callback, not navigation', () => {
    assert.match(viewer, /onOpenActions\?: \(contentId: string\) => void/);
    assert.doesNotMatch(viewer, /useNavigation|navigation\.navigate/);
  });

  await check('the star is the only favorite affordance in the Viewer chrome', () => {
    assert.match(viewer, /'star' : 'star-outline'/);
    assert.match(viewer, /Agregar a favoritos/);
    assert.match(viewer, /Quitar de favoritos/);
  });

  await check('the star is gated by canOrganize AND a toggle callback (homecloud.organize, §26.2)', () => {
    assert.match(viewer, /canOrganize && onToggleFavorite/);
  });

  await check('the top chrome keeps the ≥44x44 hit target on every new control', () => {
    assert.match(viewer, /closeTarget/);
    assert.match(actionSheet, /Modal/);
  });

  await check('the Viewer menu rides the SAME single ActionSheet host: exactly one <ActionSheet> in the screen', () => {
    assert.equal((screen.match(/<ActionSheet/g) ?? []).length, 1);
    assert.match(screen, /visible=\{selectionSheetOpen \|\| viewerActionsContentId !== null\}/);
  });

  await check('no second Modal host was introduced by ST-5', () => {
    assert.doesNotMatch(viewer, /<Modal/);
    assert.equal((screen.match(/<Modal/g) ?? []).length, 0);
  });

  await check('Viewer actions are computed by the ONE authority with surface viewer', () => {
    assert.match(screen, /surface: 'viewer'/);
    assert.match(screen, /caller: viewer\?\.source\.kind === 'album' \? 'album' : 'root'/);
  });

  await check('Agregar a un álbum from the Viewer enters the SAME destination picker (N:M preserved)', () => {
    const i = screen.indexOf("action.id === 'addToAlbum'");
    const window = screen.slice(i, i + 700);
    assert.match(window, /enterMemorySelection/);
    assert.match(window, /setDestinationPickerOpen\(true\)/);
    assert.doesNotMatch(window, /createAlbum/);
  });

  await check('Quitar del álbum from the Viewer uses the existing removal authority, never the Memory', () => {
    const i = screen.indexOf("else if (action.id === 'removeFromAlbum')");
    assert.ok(i !== -1, 'the viewer menu handler must dispatch removeFromAlbum');
    const window = screen.slice(i, i + 400);
    assert.match(window, /removeSingleFromAlbum/);
    const removal = read('front/mi-front-limpio/services/homecloud/homecloudMemoryAlbumRemoval.ts');
    assert.match(removal, /removeMemoryFromAlbum/);
    assert.match(removal, /ONLY the Memory.*Album membership is removed/s);
  });

  await check('Información del recuerdo stays reachable from the Viewer menu', () => {
    const i = screen.indexOf("action.id === 'info'");
    const window = screen.slice(i, i + 300);
    assert.match(window, /setInfoContentId/);
  });

  await check('the Viewer menu offers NO favorite action: the star owns favorites in the Viewer', () => {
    const i = screen.indexOf('viewerActionsContentId !== null ? (');
    const window = screen.slice(i, i + 3000);
    assert.doesNotMatch(window, /Marcar como favorito/);
    assert.doesNotMatch(window, /Quitar de favoritos/);
  });

  await check('no future action is exposed prematurely', () => {
    assert.doesNotMatch(screen, /Mover a papelera/);
    assert.doesNotMatch(screen, /No mostrar este recuerdo/);
    assert.doesNotMatch(viewer, /Mover a papelera/);
    assert.doesNotMatch(viewer, /No mostrar este recuerdo/);
  });

  await check('the signed URL is never shared directly: Viewer share goes through the memories share adapter', () => {
    const i = screen.indexOf("action.id === 'share'");
    const window = screen.slice(i, i + 300);
    assert.match(window, /shareMemories/);
    assert.doesNotMatch(window, /signedUrl/);
  });

  console.log(`\nST5_VIEWER_ACTION_MENU_RESULT fail=${failed}`);
  if (failed > 0) process.exitCode = 1;
})().catch((error) => { console.error('ST5 viewer action menu tests crashed:', error); process.exitCode = 1; });
