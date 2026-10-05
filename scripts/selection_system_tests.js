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
  assert.match(rootScreen, /display: 'none'/);
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
  // A file tap stays RESERVED for the Viewer, so it is never a selection gesture.
  // Selection is ENTERED by a long press or by the explicit, labelled "Seleccionar"
  // control — nobody has to know a hidden gesture — and only while the mode is
  // active does a tap toggle.
  assert.match(files, /onLongPress=\{\(\) => beginSelectionAt\(item\.value\.id\)\}/);
  assert.match(files, /accessibilityLabel="Seleccionar archivos"/);
  assert.match(files, /previous\.mode \? toggleFileSelection\(previous, fileId\) : previous/);
  assert.match(files, /selectionScope/);
  assert.match(files, /pruneFileSelection\(previous, files\.map\(\(file\) => file\.id\)\)/);

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
  assert.equal((grammar.match(/implemented: false/g) || []).length, 2);
  assert.match(grammar, /\{ id: 'open', label: 'Abrir'/);
  assert.match(grammar, /\{ id: 'trash', label: 'Mover a la papelera'/);
  // The Favoritos retrieval is a SERVER filter mode, never a client filter: the
  // read carries it as part of the question, so pagination, search and folder
  // scope cannot be corrupted by removing rows from an already-taken page.
  assert.match(files, /const \[favoritesOnly, setFavoritesOnly\] = useState\(false\)/);
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
