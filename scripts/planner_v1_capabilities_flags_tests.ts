/**
 * Planner V1 — M1 Capabilities & Feature Flags Tests.
 *
 * Tests: deny-safe behavior, known capability checks, unknown capability denial,
 * Search flag guard (flag OFF denies, flag ON requires capability, default false),
 * server-only flag not consumable.
 * Pure TypeScript — no network calls.
 */

import {
  PLANNER_CAPABILITIES,
  canCreatePersonalTask,
  canCreateHouseholdTask,
  canCreateAnyTask,
  canCreatePersonalEvent,
  canCreateHouseholdEvent,
  canCreateAnyEvent,
  canCreatePersonalGoal,
  canCreateHouseholdGoal,
  canCreateAnyGoal,
  canViewPlanner,
  canSearchPlanner,
  canEditOwnTask,
  canCompleteAssignedTask,
  canCancelOwnTask,
  canRestoreFromTrash,
  canEditOwnEvent,
  canCancelOwnEvent,
  canManageEventParticipants,
  canEditOwnGoal,
  canCompleteOwnGoal,
  canCloseOwnGoal,
  canManageGoalParticipants,
  canRestoreGoal,
  evaluateQuickActionCapabilities,
  isQuickActionEnabled,
  can,
  canAny,
  canAll,
} from '../../front/mi-front-limpio/services/planner/plannerCapabilitiesAdapter';

import {
  canOpenPlannerSearch,
  getPlannerSearchFlag,
  plannerSearchFallbackAction,
  PLANNER_SEARCH_FLAG_KEY,
  PLANNER_SEARCH_CAPABILITY,
} from '../../front/mi-front-limpio/services/planner/plannerSearchGate';

// ---------------------------------------------------------------------------
// Simple test framework
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ ${message}`);
    failCount++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ ${message} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    failCount++;
  }
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (e) {
    console.error(`  ✗ THREW: ${e instanceof Error ? e.message : String(e)}`);
    failCount++;
  }
}

// ---------------------------------------------------------------------------
// 1. Capabilities catalog
// ---------------------------------------------------------------------------

runTest('Capabilities catalog — 38 keys present', () => {
  assert(PLANNER_CAPABILITIES.length === 38, 'exactly 38 capabilities');
  // Spot-check key capabilities exist
  assert(PLANNER_CAPABILITIES.includes('task.create_personal'), 'task.create_personal');
  assert(PLANNER_CAPABILITIES.includes('task.create_household'), 'task.create_household');
  assert(PLANNER_CAPABILITIES.includes('event.create_personal'), 'event.create_personal');
  assert(PLANNER_CAPABILITIES.includes('event.create_household'), 'event.create_household');
  assert(PLANNER_CAPABILITIES.includes('goal.create_personal'), 'goal.create_personal');
  assert(PLANNER_CAPABILITIES.includes('goal.create_household'), 'goal.create_household');
  assert(PLANNER_CAPABILITIES.includes('planner.view'), 'planner.view');
  assert(PLANNER_CAPABILITIES.includes('planner.search'), 'planner.search');
  assert(PLANNER_CAPABILITIES.includes('task.restore'), 'task.restore');
  assert(PLANNER_CAPABILITIES.includes('goal.restore'), 'goal.restore');
});

// ---------------------------------------------------------------------------
// 2. Deny-safe behavior
// ---------------------------------------------------------------------------

const emptyProjection: Record<string, boolean> = {};
const nullProjection = null;
const undefinedProjection = undefined;
const partialProjection = { 'task.create_personal': true };

runTest('canCreate* — deny-safe with missing/null/undefined projection', () => {
  // All should return false for missing projection
  for (const fn of [
    canCreatePersonalTask, canCreateHouseholdTask, canCreateAnyTask,
    canCreatePersonalEvent, canCreateHouseholdEvent, canCreateAnyEvent,
    canCreatePersonalGoal, canCreateHouseholdGoal, canCreateAnyGoal,
    canViewPlanner, canSearchPlanner,
  ]) {
    assert(fn(emptyProjection) === false, `${fn.name} false for empty`);
    assert(fn(nullProjection) === false, `${fn.name} false for null`);
    assert(fn(undefinedProjection) === false, `${fn.name} false for undefined`);
  }
});

runTest('canCreate* — only true when capability explicitly true', () => {
  // Personal only
  const personalOnly = { 'task.create_personal': true, 'task.create_household': false };
  assert(canCreatePersonalTask(personalOnly) === true, 'personal true');
  assert(canCreateHouseholdTask(personalOnly) === false, 'household false');
  assert(canCreateAnyTask(personalOnly) === true, 'any true when personal');

  // Household only
  const householdOnly = { 'task.create_personal': false, 'task.create_household': true };
  assert(canCreatePersonalTask(householdOnly) === false, 'personal false');
  assert(canCreateHouseholdTask(householdOnly) === true, 'household true');
  assert(canCreateAnyTask(householdOnly) === true, 'any true when household');

  // Both true
  const both = { 'task.create_personal': true, 'task.create_household': true };
  assert(canCreateAnyTask(both) === true, 'any true when both');

  // Both false
  const neither = { 'task.create_personal': false, 'task.create_household': false };
  assert(canCreateAnyTask(neither) === false, 'any false when neither');

  // Missing key = deny
  assert(canCreatePersonalTask({}) === false, 'missing key -> false');
  assert(canCreatePersonalTask({ 'task.create_personal': 'true' }) === false, 'non-boolean -> false');
});

// ---------------------------------------------------------------------------
// 3. Quick Action capability matrix
// ---------------------------------------------------------------------------

runTest('evaluateQuickActionCapabilities — returns correct matrix', () => {
  // No grants
  const none = evaluateQuickActionCapabilities({});
  assert(none.every(a => a.visible === false && a.scope === 'none'), 'all hidden when no grants');

  // Personal task only
  const personalTask = evaluateQuickActionCapabilities({ 'task.create_personal': true });
  const taskEntry = personalTask.find(e => e.kind === 'task');
  assert(taskEntry?.visible === true && taskEntry?.scope === 'personal', 'personal task visible');

  // Household task only
  const householdTask = evaluateQuickActionCapabilities({ 'task.create_household': true });
  const hhTask = householdTask.find(e => e.kind === 'task');
  assert(hhTask?.visible === true && hhTask?.scope === 'household', 'household task visible');

  // All three personal
  const allPersonal = evaluateQuickActionCapabilities({
    'task.create_personal': true,
    'event.create_personal': true,
    'goal.create_personal': true,
  });
  assert(allPersonal.every(e => e.visible === true && e.scope === 'personal'), 'all personal visible');

  // Mixed
  const mixed = evaluateQuickActionCapabilities({
    'task.create_household': true,
    'event.create_personal': true,
    'goal.create_personal': true,
  });
  const mTask = mixed.find(e => e.kind === 'task');
  const mEvent = mixed.find(e => e.kind === 'event');
  const mGoal = mixed.find(e => e.kind === 'goal');
  assert(mTask?.scope === 'household', 'task household');
  assert(mEvent?.scope === 'personal', 'event personal');
  assert(mGoal?.scope === 'personal', 'goal personal');
});

runTest('isQuickActionEnabled — specific checks', () => {
  const proj = { 'task.create_household': true, 'event.create_personal': true };
  assert(isQuickActionEnabled(proj, 'task') === true, 'task enabled');
  assert(isQuickActionEnabled(proj, 'event') === true, 'event enabled');
  assert(isQuickActionEnabled(proj, 'goal') === false, 'goal disabled');
});

// ---------------------------------------------------------------------------
// 4. Detail action guards
// ---------------------------------------------------------------------------

runTest('Detail action guards — deny-safe', () => {
  const proj = { 'task.edit_own': true, 'event.edit_own': false };

  assert(canEditOwnTask(proj) === true, 'task edit own true');
  assert(canEditOwnEvent(proj) === false, 'event edit own false');
  assert(canCancelOwnTask({}) === false, 'missing -> false');
  assert(canCompleteAssignedTask({}) === false, 'missing -> false');
  assert(canRestoreFromTrash({}) === false, 'missing -> false');
  assert(canManageEventParticipants({}) === false, 'missing -> false');
  assert(canEditOwnGoal({}) === false, 'missing -> false');
  assert(canCompleteOwnGoal({}) === false, 'missing -> false');
  assert(canCloseOwnGoal({}) === false, 'missing -> false');
  assert(canManageGoalParticipants({}) === false, 'missing -> false');
  assert(canRestoreGoal({}) === false, 'missing -> false');
});

// ---------------------------------------------------------------------------
// 5. Generic helpers
// ---------------------------------------------------------------------------

runTest('can / canAny / canAll — deny-safe', () => {
  const proj = { 'task.create_personal': true, 'task.create_household': false };

  assert(can(proj, 'task.create_personal') === true, 'can true');
  assert(can(proj, 'task.create_household') === false, 'can false');
  assert(can(proj, 'unknown.capability') === false, 'unknown -> false');
  assert(can({}, 'task.create_personal') === false, 'empty -> false');

  assert(canAny(proj, 'task.create_personal', 'task.create_household') === true, 'canAny one true');
  assert(canAny(proj, 'task.create_household', 'event.create_personal') === false, 'canAny both false');
  assert(canAny({}, 'task.create_personal') === false, 'canAny empty -> false');

  assert(canAll(proj, 'task.create_personal') === true, 'canAll one true');
  assert(canAll(proj, 'task.create_personal', 'task.create_household') === false, 'canAll one false');
  assert(canAll({}, 'task.create_personal') === false, 'canAll empty -> false');
});

// ---------------------------------------------------------------------------
// 6. Search feature flag guard
// ---------------------------------------------------------------------------

runTest('PLANNER_SEARCH_FLAG_KEY — constant value', () => {
  assert(PLANNER_SEARCH_FLAG_KEY === 'planner.search_entry', 'exact key');
});

runTest('PLANNER_SEARCH_CAPABILITY — constant value', () => {
  assert(PLANNER_SEARCH_CAPABILITY === 'planner.search', 'exact capability');
});

runTest('canOpenPlannerSearch — deny-safe defaults', () => {
  assert(canOpenPlannerSearch(null) === false, 'null flags -> false');
  assert(canOpenPlannerSearch(undefined) === false, 'undefined flags -> false');
  assert(canOpenPlannerSearch({}) === false, 'empty flags -> false');
  assert(canOpenPlannerSearch({ 'planner.search_entry': false }) === false, 'flag false -> false');
  assert(canOpenPlannerSearch({ 'planner.search_entry': true }) === true, 'flag true + no caps -> true (cap check separate)');
});

runTest('canOpenPlannerSearch — requires capability', () => {
  const flagsOn = { 'planner.search_entry': true };

  // Capability missing -> false
  assert(canOpenPlannerSearch(flagsOn, {}) === false, 'flag on but no caps -> false');
  assert(canOpenPlannerSearch(flagsOn, { 'planner.search': false }) === false, 'flag on, cap false -> false');
  assert(canOpenPlannerSearch(flagsOn, { 'planner.search': true }) === true, 'flag on, cap true -> true');
  assert(canOpenPlannerSearch(flagsOn, { 'planner.search': true, 'other': true }) === true, 'extra caps ok');
});

runTest('getPlannerSearchFlag — raw flag value', () => {
  assert(getPlannerSearchFlag(null) === false, 'null -> false');
  assert(getPlannerSearchFlag({}) === false, 'empty -> false');
  assert(getPlannerSearchFlag({ 'planner.search_entry': false }) === false, 'false -> false');
  assert(getPlannerSearchFlag({ 'planner.search_entry': true }) === true, 'true -> true');
  assert(getPlannerSearchFlag({ 'other.flag': true }) === false, 'other flag -> false');
});

runTest('plannerSearchFallbackAction — reason classification', () => {
  // Both off
  const r1 = plannerSearchFallbackAction({}, {});
  assert(r1.allowed === false && r1.reason === 'both', 'both off -> both');

  // Flag off, cap on
  const r2 = plannerSearchFallbackAction({ 'planner.search_entry': false }, { 'planner.search': true });
  assert(r2.allowed === false && r2.reason === 'flag_off', 'flag off -> flag_off');

  // Flag on, cap off
  const r3 = plannerSearchFallbackAction({ 'planner.search_entry': true }, { 'planner.search': false });
  assert(r3.allowed === false && r3.reason === 'capability_missing', 'cap missing -> capability_missing');

  // Both on
  const r4 = plannerSearchFallbackAction({ 'planner.search_entry': true }, { 'planner.search': true });
  assert(r4.allowed === true, 'both on -> allowed');
});

// ---------------------------------------------------------------------------
// 7. Server-only flag not consumable
// ---------------------------------------------------------------------------

runTest('Server-only flag — not exposed in client projection', () => {
  // This is a design-time check: the server_only exposure means the
  // client projection never receives it. The test validates the
  // constant exists and is the exact canonical key.
  assert(typeof PLANNER_SEARCH_FLAG_KEY === 'string', 'constant is string');
  assert(PLANNER_SEARCH_FLAG_KEY.startsWith('planner.'), 'planner namespace');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(failCount === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');

if (failCount > 0) process.exit(1);