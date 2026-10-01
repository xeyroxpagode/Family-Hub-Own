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

  console.log('Selection system + HomeCloud single-surface contracts: PASS');
} finally {
  Module._extensions['.ts'] = previousTs;
}
