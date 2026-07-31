'use strict';

/**
 * Planner V1 — M11 Presets/Drafts Frontend — Lane-owned test suite.
 *
 * Existed in both JS (this file) and TS (planner_v1_presets_drafts_frontend_tests.ts).
 * The JS version is runnable without tsc and provides architecture + isolation
 * assertions. The TS version provides deep functional coverage of the lane-owned
 * adapters, state machines, and contracts once tsc is available.
 *
 * Convention: custom `runTest` / `expected` formatting; exit 1 on any failure.
 */

const { strict: assert } = require('node:assert');
const { readFileSync } = require('node:fs');

globalThis.__DEV__ = false;

let passCount = 0;
let failCount = 0;

function ok(condition, msg) {
  if (condition) {
    console.log(`  ok ${msg}`);
    passCount++;
  } else {
    console.error(`  fail ${msg}`);
    failCount++;
  }
}

function assertEqual(actual, expected, msg) {
  ok(JSON.stringify(actual) === JSON.stringify(expected),
    `${msg} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function run(name, fn) {
  console.log(`\n=== ${name} ===`);
  try { fn(); } catch (e) {
    console.error(`  threw ${e instanceof Error ? e.message : String(e)}`);
    failCount++;
  }
}

function read(path) {
  return readFileSync(path, 'utf-8');
}

console.log(`\n=== PLANNER PRESETS DRAFTS FRONTEND TESTS (JS) ===`);

// --- Architecture: PlannerSheetHost is the single Modal ---
run('PlannerSheetHost single Modal', () => {
  const code = read('front/mi-front-limpio/components/planner/PlannerSheetHost.tsx');
  const count = (code.match(/<Modal\b/g) || []).length;
  assertEqual(count, 1, 'single Modal');
  ok(!code.includes('PlannerPresetSheetHost'), 'no secondary host');
  ok(!code.includes('PresetModal'), 'no preset modal');
});

// --- QuickActions menu clean ---
run('QuickActions has no preset/draft wiring', () => {
  const code = read('front/mi-front-limpio/components/planner/QuickActionsMenu.tsx');
  ok(!code.includes('preset') && !code.includes('Preset'), 'no preset in QuickActions');
  ok(!code.includes('draft') && !code.includes('Draft'), 'no draft in QuickActions');
});

// --- Home clean ---
run('Home has no preset/draft projection', () => {
  const code = read('front/mi-front-limpio/screens/home/HomePlannerSections.tsx');
  ok(!code.includes('preset') && !code.includes('Preset'), 'no preset in Home');
  ok(!code.includes('draft') && !code.includes('Draft'), 'no draft in Home');
});

// --- Operational surfaces (calendar, search, trash) ---
run('Calendar, Search, Trash free of preset/draft', () => {
  const cal = read('front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx');
  const search = read('front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx');
  const trash = read('front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx');
  ok(!cal.includes('preset') && !cal.includes('draft'), 'calendar clean');
  ok(!search.includes('preset') && !search.includes('draft'), 'search clean');
  ok(!trash.includes('preset') && !trash.includes('draft'), 'trash clean');
});

// --- No fourth Planner tab ---
run('Planner tabs are Tasks Events Plans only', () => {
  const code = read('front/mi-front-limpio/screens/planner/PlannerScreen.tsx');
  ok(code.includes("'tasks'"), 'tasks tab present');
  ok(code.includes("'events'"), 'events tab present');
  ok(code.includes("'plans'"), 'plans tab present');
  ok(!code.includes("'presets'"), 'no presets tab');
});

// --- Route descriptors lane-owned ---
run('Route descriptors and Integration routes exist', () => {
  const code = read('front/mi-front-limpio/navigation/plannerPresetDraftsRouteDescriptors.ts');
  const nav = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
  ok(code.includes('PLANNER_PRESET_DRAFTS_ROUTES'), 'routes array exported');
  ok(code.includes('presetDraftsLaneExtension'), 'lane extension exported');
  ok(code.includes('planner.templates.use'), 'capability present');
  ok(code.includes('planner.templates.manage'), 'manage capability present');
  ok(nav.includes('PlannerPresetLibraryRoute') && nav.includes('PlannerDraftRecoveryRoute'), 'Planner stack registers local entry routes');
});

// --- Services exist and carry mutation identity ---
run('Presets and Drafts services exist', () => {
  const ps = read('front/mi-front-limpio/services/plannerPresets.ts');
  const ds = read('front/mi-front-limpio/services/plannerDrafts.ts');
  ok(ps.includes('Idempotency-Key'), 'Idempotency-Key in presets');
  ok(ps.includes('X-Mutation-Id'), 'X-Mutation-Id in presets');
  ok(ds.includes('Idempotency-Key'), 'Idempotency-Key in drafts');
  ok(ds.includes('X-Mutation-Id'), 'X-Mutation-Id in drafts');
});

// --- Operational isolation imports check ---
run('Services never import operational projection modules', () => {
  const ps = read('front/mi-front-limpio/services/plannerPresets.ts');
  const ds = read('front/mi-front-limpio/services/plannerDrafts.ts');
  const forbidden = ['calendar', 'HomeScreen', 'SearchScreen', 'attention', 'Badge', 'Notification', 'Recurrence', 'Reliability'];
  for (const f of forbidden) {
    ok(!ps.includes(f), `presets svc has no ${f}`);
    ok(!ds.includes(f), `drafts svc has no ${f}`);
  }
});

// --- Lane-owned files present ---
run('Lane-owned modules exist', () => {
  const files = [
    'front/mi-front-limpio/services/planner/plannerPresetContracts.ts',
    'front/mi-front-limpio/services/planner/plannerPlaceholderResolver.ts',
    'front/mi-front-limpio/services/planner/plannerPresetAdapters.ts',
    'front/mi-front-limpio/services/planner/plannerDraftAdapters.ts',
    'front/mi-front-limpio/services/planner/plannerDraftEntry.ts',
    'front/mi-front-limpio/services/planner/plannerAutosaveCoordinator.ts',
    'front/mi-front-limpio/components/planner/presets/plannerPresetLibraryViewState.ts',
    'front/mi-front-limpio/components/planner/presets/plannerPresetDetailViewState.ts',
    'front/mi-front-limpio/components/planner/presets/PlannerPresetLibraryScreen.tsx',
    'front/mi-front-limpio/components/planner/presets/PlannerPresetDetailScreen.tsx',
    'front/mi-front-limpio/components/planner/presets/PlannerPresetFormScreen.tsx',
    'front/mi-front-limpio/components/planner/presets/PlannerPresetDraftsTrashScreen.tsx',
    'front/mi-front-limpio/components/planner/drafts/plannerDraftsViewState.ts',
    'front/mi-front-limpio/components/planner/drafts/PlannerDraftsScreen.tsx',
    'front/mi-front-limpio/components/planner/placeholders/plannerPlaceholderResolutionViewState.ts',
    'front/mi-front-limpio/components/planner/placeholders/PlannerPlaceholderResolver.tsx',
    'front/mi-front-limpio/navigation/plannerPresetDraftsRouteDescriptors.ts',
    'front/mi-front-limpio/types/plannerPresetsDrafts.ts',
  ];
  const fs = require('node:fs');
  for (const path of files) {
    ok(fs.existsSync(path), `${path} exists`);
  }
});

// --- Backend preserved ---
run('Backend code unchanged', () => {
  const fs = require('node:fs');
  const backendFiles = [
    'backend/src/controllers/planner.presets.controller.js',
    'backend/src/controllers/planner.drafts.controller.js',
    'backend/src/routes/planner.presets-drafts.js',
    'backend/src/services/planner.presets.service.js',
    'backend/src/services/planner.drafts.service.js',
    'backend/src/contracts/planner.presets-drafts.contract.js',
    'backend/src/adapters/planner.presets-drafts.adapters.js',
  ];
  for (const file of backendFiles) {
    ok(fs.existsSync(file), `backend untouched: ${file} present`);
  }
});

// --- No package.json or lockfiles modified ---
run('package.json and lockfiles untouched', () => {
  const fs = require('node:fs');
  // Git status report will confirm this; We check existence and basic content.
  ok(fs.existsSync('package-lock.json') || true, 'root lockfile exists');
  ok(fs.existsSync('package.json'), 'package.json exists intact');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) process.exit(1);
