#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('../front/mi-front-limpio/node_modules/typescript');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const previousTs = Module._extensions['.ts'];
Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

try {
  const model = require(path.join(root, 'front/mi-front-limpio/components/ui/segmentedControlModel.ts'));
  assert.deepEqual(model.getSelectedRuns([]), []);
  assert.deepEqual(model.getSelectedRuns([false, false, false]), []);
  assert.deepEqual(model.getSelectedRuns([true, false, false]), [{ start: 0, end: 0 }]);
  assert.deepEqual(model.getSelectedRuns([true, true, false]), [{ start: 0, end: 1 }]);
  assert.deepEqual(model.getSelectedRuns([false, true, true]), [{ start: 1, end: 2 }]);
  assert.deepEqual(model.getSelectedRuns([true, false, true]), [{ start: 0, end: 0 }, { start: 2, end: 2 }]);
  assert.deepEqual(model.getSelectedRuns([true, true, true]), [{ start: 0, end: 2 }]);
  assert.deepEqual(model.toggleSegmentValue(['expense'], 'income'), ['expense', 'income']);
  assert.deepEqual(model.toggleSegmentValue(['expense', 'income'], 'expense'), ['income']);
  assert.deepEqual(model.toggleSegmentValue(['expense', 'transfer'], 'income'), ['expense', 'transfer', 'income']);

  const core = read('front/mi-front-limpio/components/ui/SegmentedControl.tsx');
  assert.match(core, /selectionMode.*multiple/s);
  assert.match(core, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(core, /option\.icon/);
  assert.match(core, /onLayout/);
  assert.match(core, /Animated\.timing\(left/);
  assert.match(core, /Animated\.timing\(width/);
  assert.match(core, /colors\.surface\.card/);
  assert.doesNotMatch(core, /#[0-9a-f]{3,8}/i);

  const family = read('front/mi-front-limpio/components/family/FamilyViewSegmentedControl.tsx');
  const planner = read('front/mi-front-limpio/screens/planner/PlannerScreen.tsx');
  const calendar = read('front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx');
  const finance = read('front/mi-front-limpio/screens/finance/FinanceScreen.tsx');
  assert.match(family, /SegmentedControl/);
  assert.match(planner, /SegmentedControl/);
  assert.match(calendar, /value=\{createMode\}/);
  assert.match(calendar, /selectionMode="multiple"/);
  assert.match(finance, /SegmentedControl/);
  assert.match(finance, /selectionMode="multiple"/);
  assert.doesNotMatch(read('front/mi-front-limpio/components/finance/ui/index.ts'), /FinanceSegmented/);

  const rootScreen = read('front/mi-front-limpio/screens/HomeCloudScreen.tsx');
  const files = read('front/mi-front-limpio/screens/HomeCloudFilesScreen.tsx');
  const memories = read('front/mi-front-limpio/screens/HomeCloudMemoriesScreen.tsx');
  const navigator = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  const types = read('front/mi-front-limpio/navigation/types.ts');
  assert.match(rootScreen, /HomeCloudFilesView/);
  assert.match(rootScreen, /HomeCloudMemoriesView/);
  assert.match(rootScreen, /setSection/);
  assert.match(rootScreen, /Animated\.View/);
  assert.match(rootScreen, /pointerEvents=\{section === 'files' \? 'auto' : 'none'\}/);
  assert.match(rootScreen, /pointerEvents=\{section === 'memories' \? 'auto' : 'none'\}/);
  assert.match(rootScreen, /MOTION\.tabCrossFade/);
  assert.doesNotMatch(rootScreen, /display: 'none'/);
  assert.doesNotMatch(files, /navigate\(['"]HomeCloudMemories/);
  assert.doesNotMatch(memories, /navigate\(['"]HomeCloudFiles/);
  assert.match(navigator, /name="HomeCloud"/);
  assert.doesNotMatch(navigator, /name="HomeCloudMemories"/);
  assert.doesNotMatch(types, /HomeCloudMemories:/);
  assert.match(files, /fetchFilesBrowser/);
  assert.match(memories, /listMemories/);
  assert.doesNotMatch(memories, /const\s+MEMORIES\s*=\s*\[/);

  // ── Files selection: the CURRENT contract, not the one the Stage-3 freeze had.
  //
  // STAGE 2 (Phase 2) SUPERSESSION, recorded explicitly. Stage 1 stated: "Selection
  // is ENTERED by a long press or by the explicit, labelled 'Seleccionar' control".
  // Stage 2 removes the long-press entry outright, because long press now owns the
  // contextual File actions. The remaining guarantees are unchanged and still
  // asserted here:
  //   - a File tap stays RESERVED for the Viewer and is never a selection gesture;
  //   - selection is entered ONLY through the labelled "Seleccionar" control, so
  //     nobody has to know a hidden gesture;
  //   - only while the mode is active does a tap toggle;
  //   - a long press inside selection opens NOTHING;
  //   - selection stays scoped to one context and is pruned on reconciliation.
  // STAGE 2 (Phase 3): the tap is no longer a reserved no-op seam - it OPENS the
  // Viewer. The guarantee Stage 1 protected is unchanged and still asserted: a tap
  // OUTSIDE selection never selects anything, and inside selection it only toggles.
  // STAGE 2 REOPEN: a long press inside selection no longer RETURNS EARLY — it arms the
  // drag-selection sweep. The guarantee this assertion existed for is unchanged and is
  // now asserted as what it actually is: it opens NOTHING (no File menu, no navigation,
  // no Viewer) and hands the gesture to the sweep instead.
  assert.doesNotMatch(files, /beginSelectionAt/);
  assert.doesNotMatch(files, /beginFileSelectionAt/);
  assert.match(
    files,
    /const handleFileLongPress = useCallback[\s\S]*?if \(selection\.mode\) \{[\s\S]*?armDragSelection\(fileId\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?setActionTargetId\(fileId\);/,
  );
  assert.doesNotMatch(
    files,
    /const handleFileLongPress[\s\S]{0,400}?setViewerTargetId/,
    'a long press must never open the Viewer',
  );
  assert.match(files, /const handleFileTap = useCallback[\s\S]*?if \(selection\.mode\) \{[\s\S]*?toggleFileSelection[\s\S]*?return;[\s\S]*?setViewerTargetId\(fileId\);/);
  assert.doesNotMatch(files, /if \(!selection\.mode\) return;\s*\n\s*\/\/ Outside selection the tap is the Viewer/);
  assert.match(files, /accessibilityLabel="Seleccionar archivos"/);
  assert.match(files, /previous\.mode \? toggleFileSelection\(previous, fileId\) : previous/);
  assert.match(files, /selectionScope/);
  assert.match(files, /pruneFileSelection\(previous, files\.map\(\(file\) => file\.id\)\)/);
  // Selection has exactly ONE entry point, and the overflow withdraws it while the
  // mode is active, so there is never a second way in.
  assert.equal((files.match(/enterSelectionMode\(\)/g) || []).length, 1);
  assert.match(files, /\{!selection\.mode \? <AppButton title="Seleccionar"/);

  // ONE canonical action host, ONE shared move destination picker: no second menu
  // can perform a File operation, and a move has a single destination grammar.
  assert.equal((files.match(/<FileActionHost /g) || []).length, 1);
  assert.equal((files.match(/<FileMoveDestinationPicker /g) || []).length, 1);
  assert.doesNotMatch(files, /Descargar y compartir/);

  // Files Core closure: the old "Favorites are out of V1" exclusion is
  // SUPERSEDED for Files. The Favorite seam is implemented — personal,
  // per-person, view-gated, with the row naming the intent the tap performs —
  // and only Abrir and Papelera remain declared-but-unimplemented seams.
  const grammar = read('front/mi-front-limpio/services/homecloud/homecloudFileActions.ts');
  assert.match(grammar, /HOMECLOUD_FILE_ACTION_SEAMS/);
  assert.match(grammar, /\.filter\(\(action\) => action\.implemented\)/);
  assert.match(grammar, /\{ id: 'favorite', label: 'Agregar a favoritos'/);
  assert.match(grammar, /stateKey: 'isFavorite'/);
  assert.match(grammar, /activeLabel: 'Quitar de favoritos'/);
  assert.equal((grammar.match(/implemented: false/g) || []).length, 1);
  assert.match(grammar, /\{ id: 'open', label: 'Abrir'/);
  assert.match(grammar, /\{ id: 'trash', label: 'Mover a la papelera'/);
// The Favoritos retrieval is a SERVER filter mode, never a client filter: the
   // read carries it as part of the question, so pagination, search and folder
   // scope cannot be corrupted by removing rows from an already-taken page.
   //
   // STAGE 2 (Phase 2): `favoritesOnly` is now DERIVED from the single filter
   // state rather than held in its own `useState`, because the mode and the order
   // moved behind one compact control. What is protected here is unchanged and is
   // asserted behaviourally: the mode is still a parameter of the READ, it is still
   // computed by the canonical helper, and the client still never filters locally.
   assert.doesNotMatch(files, /const \[favoritesOnly, setFavoritesOnly\]/);
   assert.match(files, /const favoritesOnly = filesFavoritesOnly\(filterState\)/);
   assert.match(files, /filesFavoritesOnly/);
   assert.match(files, /favoritesOnly: context\.favoritesOnly/);
   assert.match(files, /queryContextRef = useRef\(\{ token, folderId: folder\?\.id \?\? null, query, sort, favoritesOnly, contextKey \}\)/);
   // The server-side encoding of the mode lives in the read client, and it is
   // asserted there; what matters here is that the mode travels with EVERY read of
   // the current context rather than being applied once at a call site.
   const filesReadClient = read('front/mi-front-limpio/services/homecloud/homecloudFilesService.ts');
   assert.match(filesReadClient, /if \(options\.favoritesOnly\) params\.set\('favoritesOnly', 'true'\)/);
  assert.match(files, /favoritesOnly: context\.favoritesOnly/);
  const filesClient = read('front/mi-front-limpio/services/homecloud/homecloudFilesService.ts');
  assert.match(filesClient, /params\.set\('favoritesOnly', 'true'\)/);
  assert.doesNotMatch(files, /papelera|trash/i);
  assert.doesNotMatch(files, /navigate\(['"]Viewer|HomeCloudViewer/);

  // Bulk Move is N of the EXISTING single-file mutation, with one reconciliation.
  const bulk = read('front/mi-front-limpio/services/homecloud/homecloudBulkMove.ts');
  // The orchestrator is transport-free: it is handed the EXISTING mutation and
  // only classifies its typed errors, so it can never grow a second endpoint.
  assert.match(bulk, /import \{ ApiError \} from '\.\.\/api'/);
  assert.doesNotMatch(bulk, /requestJson|fetch\(|XMLHttpRequest|axios/);
  assert.match(bulk, /await input\.moveFile\(contentId, \{ folderId: input\.destinationFolderId \}\)/);
  const moveBody = files.slice(files.indexOf('const moveSelectedFiles'), files.indexOf('const moveSelectedFiles') + 1400);
  assert.match(moveBody, /updateHomeCloudFile/);
  assert.match(moveBody, /await refresh\(\)/);
  assert.equal((moveBody.match(/await refresh\(\)/g) || []).length, 1);
  assert.doesNotMatch(moveBody, /controllerRef\.current!\.load\(\)/);

  console.log('Selection system + HomeCloud single-surface contracts: PASS');
} finally {
  Module._extensions['.ts'] = previousTs;
}
