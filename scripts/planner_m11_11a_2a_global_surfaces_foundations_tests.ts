import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import {
  GLOBAL_SURFACE_GATES_OFF,
  NAV_OWNERSHIP,
  SEARCH_CONTEXTS,
  SURFACE_EXCLUDED_INVENTORY,
  hasPlannerContextChanged,
  isOnlineOnlyDestructive,
  isSearchContextKind,
  isVisibleInPlannerContext,
} from '../front/mi-front-limpio/services/planner/globalSurfaceTypes';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const require = createRequire(import.meta.url);
const backendSurfaces = require('../backend/src/lib/plannerGlobalSurfaces.js');

let passCount = 0;
let failCount = 0;

function ok(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount += 1;
  } else {
    console.error(`  fail ${message}`);
    failCount += 1;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  console.log(`\n=== ${name} ===`);
  try {
    await fn();
  } catch (error) {
    console.error(`  threw ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    failCount += 1;
  }
}

void (async () => {
  await runTest('Privacy helper filters before ranking/counting/grouping', () => {
    const coordinator = { personId: 'person-coord', householdId: 'hh-1', membershipId: 'member-1', role: 'coordinator' };
    const owner = { personId: 'person-owner', householdId: 'hh-1', membershipId: 'member-2', role: 'adult' };
    ok(isVisibleInPlannerContext({ scopeKind: 'personal', ownerPersonId: 'person-owner', householdId: null }, owner), 'owner sees personal content');
    ok(!isVisibleInPlannerContext({ scopeKind: 'personal', ownerPersonId: 'person-owner', householdId: null }, coordinator), 'coordinator does not automatically see personal content');
    ok(isVisibleInPlannerContext({ scopeKind: 'household', ownerPersonId: 'person-owner', householdId: 'hh-1' }, coordinator), 'household content visible in active household');
    ok(!isVisibleInPlannerContext({ scopeKind: 'household', ownerPersonId: 'person-owner', householdId: 'hh-2' }, coordinator), 'other household content hidden');
  });

  await runTest('Household/person context changes invalidate frontend surface context', () => {
    const a = { personId: 'person-1', householdId: 'hh-1', membershipId: 'member-1', role: 'adult' };
    const same = { ...a };
    const switchedHousehold = { ...a, householdId: 'hh-2' };
    const switchedPerson = { ...a, personId: 'person-2' };
    assertEqual(hasPlannerContextChanged(a, same), false, 'same context is stable');
    assertEqual(hasPlannerContextChanged(a, switchedHousehold), true, 'household switch invalidates');
    assertEqual(hasPlannerContextChanged(a, switchedPerson), true, 'person switch invalidates');
    assertEqual(hasPlannerContextChanged(a, null), true, 'logout invalidates');
  });

  await runTest('Backend visibility mirrors frontend and stays authoritative', () => {
    const access = backendSurfaces.buildPlannerAccessContext({
      personId: 'person-1',
      householdId: 'hh-1',
      membershipId: 'member-1',
      role: 'coordinator',
    });
    ok(!backendSurfaces.isVisibleInPlannerContext({ scopeKind: 'personal', ownerPersonId: 'person-2', householdId: null }, access), 'backend blocks other personal content');
    ok(backendSurfaces.isVisibleInPlannerContext({ scopeKind: 'household', ownerPersonId: 'person-2', householdId: 'hh-1' }, access), 'backend allows active household content');
  });

  await runTest('Routes ownership is represented without visible dead controls', () => {
    assertEqual(NAV_OWNERSHIP.search.originComponent, 'QuickActionsMenu > Search bar', 'Search future origin is Quick Actions');
    ok(NAV_OWNERSHIP.search.supportsBack && NAV_OWNERSHIP.search.restoresFocus && NAV_OWNERSHIP.search.supportsKeyboard, 'Search transition exposes Back/focus/keyboard contract');
    ok(NAV_OWNERSHIP.attention.originComponent.includes('AppTopBar'), 'Attention ownership reserved to AppTopBar');
    ok(GLOBAL_SURFACE_GATES_OFF.search.enabled, 'Search gate is enabled once 11A.2B makes active Search productive');
    ok(GLOBAL_SURFACE_GATES_OFF.attention.enabled, 'Attention visible control is enabled after 11A.2C count/list implementation');
    const quick = read('front/mi-front-limpio/components/planner/QuickActionsMenu.tsx');
    const topBar = read('front/mi-front-limpio/components/ui/AppTopBar.tsx');
    const tabs = read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
    ok(/Buscar en HomePlus/.test(quick), 'Search bar is rendered inside Quick Actions after 11A.2B');
    ok(!/Search as tile|search tile/i.test(quick), 'Search is not rendered as a tile');
    ok(!/Buscar en HomePlus|planner search/i.test(topBar), 'Search is not mounted in AppTopBar');
    ok((tabs.match(/name="Add"|name='Add'/g) ?? []).length <= 1, 'Bottom navigation Add ownership not duplicated');
  });

  await runTest('Search contexts are explicit and do not silently mix active/archive/trash', () => {
    assertEqual(SEARCH_CONTEXTS, ['active', 'archived', 'trash'], 'explicit contexts');
    ok(isSearchContextKind('active'), 'active context recognized');
    ok(isSearchContextKind('archived'), 'archived context recognized');
    ok(isSearchContextKind('trash'), 'trash context recognized');
    ok(!isSearchContextKind('inventory'), 'inventory is not a Search context');
  });

  await runTest('Reliability corrections remove direct Home completion and restore bypasses', () => {
    const homeCompletion = read('front/mi-front-limpio/services/planner/homeTaskOneTapCompletion.ts');
    const trashScreen = read('front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx');
    const productiveMutations = read('front/mi-front-limpio/services/planner/reliability/productiveMutations.ts');
    ok(homeCompletion.includes('enqueuePlannerTaskComplete'), 'Home completion uses productive runtime');
    ok(!homeCompletion.includes('requestJson'), 'Home completion no longer uses direct HTTP');
    ok(!trashScreen.includes('restoreGoal(') && !trashScreen.includes('restoreGoalMilestone('), 'Trash screen no direct Goal/Milestone restore HTTP');
    ok(productiveMutations.includes('enqueuePlannerGoalRestore') && productiveMutations.includes('enqueuePlannerMilestoneRestore'), 'Goal/Milestone restore helpers exist');
  });

  await runTest('Permanent delete and Empty Trash are marked online-only and not queued', () => {
    const productiveMutations = read('front/mi-front-limpio/services/planner/reliability/productiveMutations.ts');
    ok(isOnlineOnlyDestructive('permanent_delete'), 'permanent delete marker exists');
    ok(isOnlineOnlyDestructive('empty_trash'), 'empty trash marker exists');
    ok(!productiveMutations.includes('permanent_delete') && !productiveMutations.includes('empty_trash'), 'no permanent destructive operation in queue helpers');
    ok(backendSurfaces.isOnlineOnlyDestructiveOperation('permanent_delete'), 'backend marker permanent delete');
    ok(backendSurfaces.isOnlineOnlyDestructiveOperation('empty_trash'), 'backend marker empty trash');
  });

  await runTest('Draft discard replaces Trash/Restore in UI and backend routes', () => {
    const draftsScreen = read('front/mi-front-limpio/components/planner/drafts/PlannerDraftsScreen.tsx');
    const draftService = read('front/mi-front-limpio/services/plannerDrafts.ts');
    const draftRoutes = read('backend/src/routes/planner.presets-drafts.js');
    const draftController = read('backend/src/controllers/planner.drafts.controller.js');
    ok(draftsScreen.includes('Descartar borrador'), 'UI uses Descartar borrador');
    ok(!draftsScreen.includes('Restaurar borrador') && !draftsScreen.includes('Papelera'), 'UI does not offer Draft Trash/Restore');
    ok(draftService.includes('/discard'), 'frontend service calls discard endpoint');
    ok(draftRoutes.includes('/drafts/:id/discard'), 'backend exposes discard endpoint');
    ok(draftController.includes('draft_trash_retired') && draftController.includes('draft_restore_retired'), 'legacy trash/restore routes are retired');
  });

  await runTest('Inventory remains excluded from all 11A Global Surfaces except Home exception', () => {
    assertEqual(SURFACE_EXCLUDED_INVENTORY, ['quick_actions', 'search', 'attention', 'activity', 'trash', 'archive'], 'frontend Inventory exclusion matrix');
    assertEqual(backendSurfaces.INVENTORY_EXCLUDED_FROM_GLOBAL_SURFACES, ['quick_actions', 'search', 'attention', 'activity', 'trash', 'archive'], 'backend Inventory exclusion matrix');
    const quickActions = read('front/mi-front-limpio/services/planner/plannerQuickActions.ts');
    const home = read('front/mi-front-limpio/screens/home/HomePlannerSections.tsx');
    ok(!/inventory/i.test(quickActions), 'Inventory absent from Quick Actions catalog');
    ok(/InventoryUrgencyCard|getInventoryAlerts/.test(home), 'Home Inventory exception preserved');
  });

  console.log(`\n11A.2A Global Surfaces foundations tests: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) process.exit(1);
})();
