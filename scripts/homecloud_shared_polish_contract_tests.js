const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
const check = (name, fn) => { fn(); console.log(`PASS: ${name}`); };

const v2 = read('docs/audit/unified/08_HOMECLOUD_PREMIUM_POLISH_MASTER_LIST_REVISADA_V2.md');
const truth = read('docs/homecloud/memories/HOMECLOUD_MEMORIES_FINAL_PRODUCT_TRUTH.md');
const reconciliation = read('docs/homecloud/HOMECLOUD_U0_ATLAS_COVERAGE_RECONCILIATION.md');
const theme = read('front/mi-front-limpio/constants/theme.ts');
const reduced = read('front/mi-front-limpio/hooks/useReducedMotion.ts');
const menu = read('front/mi-front-limpio/components/ui/AdaptiveActionMenu.tsx');
const layout = read('front/mi-front-limpio/services/homecloud/adaptiveActionMenuLayout.ts');
const shell = read('front/mi-front-limpio/screens/HomeCloudScreen.tsx');
const files = read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx');
const memories = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
const intake = read('front/mi-front-limpio/services/homecloud/MemoryIntake.tsx');
const album = read('front/mi-front-limpio/components/homecloud/AlbumTile.tsx');

check('the mandatory V2 has exactly HC-POL-001..062', () => {
  const ids = [...v2.matchAll(/^#### HC-POL-(\d{3}):/gm)].map((match) => Number(match[1]));
  assert.deepEqual(ids, Array.from({ length: 62 }, (_, index) => index + 1));
});
check('date amendment is authoritative, post-save and never uses upload time', () => {
  assert.match(truth, /Enmienda autoritativa 2026-10-12/);
  assert.match(truth, /no muestran DatePicker ni selector de/);
  assert.match(truth, /exclusivamente en `Informacion del recuerdo`/);
  assert.match(truth, /`uploaded_at` se conserva internamente/);
  assert.match(truth, /Recuerdos escritos conservan su flujo especifico/);
});
check('atlas arithmetic keeps 65 unique, 101 appearances and 62 targets distinct', () => {
  assert.match(reconciliation, /\*\*65 superficies canonicas unicas\*\*/);
  assert.match(reconciliation, /\*\*101 apariciones de cobertura\*\*/);
  assert.match(reconciliation, /\*\*62 targets HC-POL\*\*/);
  assert.match(reconciliation, /`001-003`/);
  assert.match(reconciliation, /`061-062`/);
});
check('shared motion and dynamic Reduce Motion policy exist', () => {
  assert.match(theme, /export const MOTION/);
  assert.match(theme, /tabCrossFade: 150/);
  assert.match(reduced, /isReduceMotionEnabled/);
  assert.match(reduced, /reduceMotionChanged/);
});
check('tab switch cross-fades mounted panes and removes inactive interaction', () => {
  assert.match(shell, /Animated\.timing\(paneProgress/);
  assert.match(shell, /MOTION\.tabCrossFade/);
  assert.match(shell, /pointerEvents=\{section === 'files' \? 'auto' : 'none'\}/);
  assert.doesNotMatch(shell, /display: 'none'/);
});
check('one adaptive menu owns anchor, safe-area, keyboard and sheet fallback', () => {
  assert.match(menu, /useSafeAreaInsets/);
  assert.match(menu, /keyboardDidShow/);
  assert.match(layout, /input\.menuHeight > availableHeight/);
  assert.match(layout, /viewportWidth <= 360 && input\.fontScale >= 1\.3/);
  assert.match(layout, /presentation: 'popover'/);
  assert.match(menu, /<ActionSheet visible=\{visible\}/);
});
check('Files and Memories route contextual menus through the shared adaptive host', () => {
  assert.match(files, /<AdaptiveActionMenu visible=\{!!folderActions\}/);
  assert.match(files, /<FileActionHost file=\{actionTarget\}/);
  assert.match(memories, /<AdaptiveActionMenu/);
  assert.match(memories, /anchor=\{destinationPickerOpen \? null : actionMenuAnchor\}/);
  assert.match(intake, /<AdaptiveActionMenu visible=\{sheet === 'create'\}/);
});
check('album covers distinguish loading, unavailable, ready and error with contrast', () => {
  assert.match(album, /function AlbumCoverLoading/);
  assert.match(album, /function AlbumCoverFallback/);
  assert.match(album, /function AlbumCoverError/);
  assert.match(album, /<Animated\.Image/);
  assert.match(album, /minWidth: 44/);
  assert.match(album, /rgba\(20,18,16,0\.72\)/);
});

console.log('HOMECLOUD_SHARED_POLISH_CONTRACT_TESTS=PASS');
