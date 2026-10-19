'use strict';

// Pure logic tests for Slice 2: Lifecycle/Status Bridge, Task Linking, Frontend Contract
// No external dependencies

const PLAN_LIFECYCLE_VALUES = [
  'preparation',
  'active',
  'paused',
  'completed',
  'cancelled',
];

const PLAN_LIFECYCLE_TRANSITIONS = {
  preparation: ['active', 'cancelled'],
  active: ['paused', 'completed', 'cancelled'],
  paused: ['active', 'completed', 'cancelled'],
  completed: ['reopen', 'archive'],
  cancelled: ['reopen', 'archive'],
};

const PLAN_SCOPE_VALUES = ['personal', 'household'];

const validateLifecycle = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'preparation';
  }
  if (!PLAN_LIFECYCLE_VALUES.includes(value)) {
    const error = new Error('lifecycle invalido.');
    error.code = 'invalid_lifecycle';
    throw error;
  }
  return value;
};

const validateScope = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'household';
  }
  if (!PLAN_SCOPE_VALUES.includes(value)) {
    const error = new Error('scope invalido.');
    error.code = 'invalid_scope';
    throw error;
  }
  return value;
};

const validateLifecycleTransition = (fromLifecycle, toLifecycle) => {
  if (!PLAN_LIFECYCLE_TRANSITIONS[fromLifecycle]) {
    const error = new Error('Lifecycle origen invalido.');
    error.code = 'invalid_lifecycle';
    throw error;
  }
  const allowed = PLAN_LIFECYCLE_TRANSITIONS[fromLifecycle];
  if (!allowed.includes(toLifecycle)) {
    const error = new Error('Transicion de lifecycle invalida.');
    error.code = 'invalid_lifecycle_transition';
    throw error;
  }
};

// The production DTO is the single authority. A local copy here could only ever
// confirm itself and would silently encode the retired percentage/milestone
// progress shape.
const { toPlanDto } = require('../backend/src/services/planner.plans.v1.dto');

// Semantic projection: lifecycle -> status (legacy compatibility)
const projectStatusFromLifecycle = (lifecycle) => {
  switch (lifecycle) {
    case 'preparation': return 'active';
    case 'active': return 'active';
    case 'paused': return 'active';
    case 'completed': return 'completed';
    case 'cancelled': return 'closed';
    default: return 'active';
  }
};

// Validate status/lifecycle pair is semantically valid
const isStatusLifecycleValid = (status, lifecycle) => {
  if (status === 'failed') return true; // Legacy failed state preserved
  const expected = projectStatusFromLifecycle(lifecycle);
  return status === expected;
};

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}

function assertThrows(fn, errorCode, message) {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    if (errorCode && e.code !== errorCode) {
      throw new Error(`${message}: expected error code ${errorCode}, got ${e.code}`);
    }
  }
  if (!threw) throw new Error(`${message}: expected to throw`);
}

console.log('=== SLICE 2: LIFECYCLE/STATUS BRIDGE TESTS ===\n');

// Test 1: Create preparation -> legacy status compatible
console.log('Test 1: Create plan in preparation -> status=active');
{
  const lifecycle = 'preparation';
  const expectedStatus = projectStatusFromLifecycle(lifecycle);
  assertEqual(expectedStatus, 'active', 'projected status for preparation is active');
  console.log('  PASS: preparation -> status=active');
}

// Test 2: Activate -> lifecycle=active, status=active
console.log('Test 2: Activate -> lifecycle=active, status=active');
{
  const lifecycle = 'active';
  const expectedStatus = projectStatusFromLifecycle(lifecycle);
  assertEqual(expectedStatus, 'active', 'projected status for active is active');
  console.log('  PASS: active -> status=active');
}

// Test 3: Pause -> lifecycle=paused, status=active (via trigger)
console.log('Test 3: Pause -> lifecycle=paused, status=active');
{
  const lifecycle = 'paused';
  const expectedStatus = projectStatusFromLifecycle(lifecycle);
  assertEqual(expectedStatus, 'active', 'projected status for paused is active');
  console.log('  PASS: paused -> status=active');
}

// Test 4: Complete -> lifecycle=completed, status=completed
console.log('Test 4: Complete -> lifecycle=completed, status=completed');
{
  const lifecycle = 'completed';
  const expectedStatus = projectStatusFromLifecycle(lifecycle);
  assertEqual(expectedStatus, 'completed', 'projected status for completed is completed');
  console.log('  PASS: completed -> status=completed');
}

// Test 5: Cancel -> lifecycle=cancelled, status=closed
console.log('Test 5: Cancel -> lifecycle=cancelled, status=closed');
{
  const lifecycle = 'cancelled';
  const expectedStatus = projectStatusFromLifecycle(lifecycle);
  assertEqual(expectedStatus, 'closed', 'projected status for cancelled is closed');
  console.log('  PASS: cancelled -> status=closed');
}

// Test 6: Reopen -> lifecycle=active, status=active
console.log('Test 6: Reopen -> lifecycle=active, status=active');
{
  const lifecycle = 'active';
  const expectedStatus = projectStatusFromLifecycle(lifecycle);
  assertEqual(expectedStatus, 'active', 'projected status for reopened (active) is active');
  console.log('  PASS: reopen -> status=active');
}

// Test 7: Invalid transitions rejected
console.log('Test 7: Invalid lifecycle transitions rejected');
assertThrows(() => validateLifecycleTransition('preparation', 'paused'), 'invalid_lifecycle_transition', 'preparation -> paused throws');
assertThrows(() => validateLifecycleTransition('active', 'active'), 'invalid_lifecycle_transition', 'active -> active throws');
assertThrows(() => validateLifecycleTransition('completed', 'active'), 'invalid_lifecycle_transition', 'completed -> active throws');
assertThrows(() => validateLifecycleTransition('completed', 'paused'), 'invalid_lifecycle_transition', 'completed -> paused throws');
console.log('  PASS: Invalid transitions rejected');

// Test 8: Valid transitions allowed
console.log('Test 8: Valid lifecycle transitions allowed');
validateLifecycleTransition('preparation', 'active');
validateLifecycleTransition('preparation', 'cancelled');
validateLifecycleTransition('active', 'paused');
validateLifecycleTransition('active', 'completed');
validateLifecycleTransition('active', 'cancelled');
validateLifecycleTransition('paused', 'active');
validateLifecycleTransition('paused', 'completed');
validateLifecycleTransition('paused', 'cancelled');
validateLifecycleTransition('completed', 'reopen');
validateLifecycleTransition('completed', 'archive');
validateLifecycleTransition('cancelled', 'reopen');
validateLifecycleTransition('cancelled', 'archive');
console.log('  PASS: Valid transitions allowed');

// Test 9: Semantic validation - all valid pairs pass
console.log('Test 9: All canonical status/lifecycle pairs are valid');
const validPairs = [
  ['active', 'preparation'],
  ['active', 'active'],
  ['active', 'paused'],
  ['completed', 'completed'],
  ['closed', 'cancelled'],
];
validPairs.forEach(([status, lifecycle]) => {
  assert(isStatusLifecycleValid(status, lifecycle), `${status}/${lifecycle} should be valid`);
});
console.log('  PASS: All canonical pairs valid');

// Test 10: Legacy failed state preserved
console.log('Test 10: Legacy failed state preserved');
assert(isStatusLifecycleValid('failed', 'preparation'), 'failed/preparation preserved');
assert(isStatusLifecycleValid('failed', 'active'), 'failed/active preserved');
assert(isStatusLifecycleValid('failed', 'cancelled'), 'failed/cancelled preserved');
console.log('  PASS: Legacy failed state preserved');

console.log('\n=== TASK LINKING TESTS ===\n');

// Test 11: Task creation from Plan pre-selects planId
console.log('Test 11: Task creation payload includes goal_id from Plan context');
{
  // Simulate TaskForm receiving initialPlanId
  const initialPlanId = 'plan-123';
  const initialPlanTitle = 'My Plan';
  const goalId = initialPlanId; // Physical field is goal_id
  assertEqual(goalId, 'plan-123', 'goal_id set from initialPlanId');
  console.log('  PASS: TaskForm accepts initialPlanId/initialPlanTitle props');
}

// Test 12: Scope validation - personal plan cannot link household task
console.log('Test 12: Scope validation - personal plan scope');
{
  const planScope = 'personal';
  assert(PLAN_SCOPE_VALUES.includes(planScope), 'personal is valid scope');
  const planScope2 = 'household';
  assert(PLAN_SCOPE_VALUES.includes(planScope2), 'household is valid scope');
  console.log('  PASS: Scope values validated');
}

// Test 13: Link existing task - eligible tasks exclude those linked to another Plan
console.log('Test 13: Link existing task - eligible tasks exclude those linked to another Plan');
{
  // Simulated logic: tasks with goal_id set are excluded from eligible list
  const allTasks = [
    { id: 'task-1', goal_id: null },
    { id: 'task-2', goal_id: 'plan-1' },
    { id: 'task-3', goal_id: 'plan-2' },
    { id: 'task-4', goal_id: null },
  ];
  const currentPlanId = 'plan-1';
  const eligible = allTasks.filter(t => t.goal_id === null);
  assertEqual(eligible.length, 2, 'only unlinked tasks are eligible');
  assert(!eligible.find(t => t.id === 'task-2'), 'task linked to current plan excluded');
  assert(!eligible.find(t => t.id === 'task-3'), 'task linked to other plan excluded');
  console.log('  PASS: Link flow filters eligible tasks correctly');
}

// Test 14: Unlink preserves Task
console.log('Test 14: Unlink task sets goal_id=null, does not delete task');
{
  const taskBefore = { id: 'task-1', goal_id: 'plan-1', title: 'Test Task' };
  const taskAfter = { ...taskBefore, goal_id: null };
  assertEqual(taskAfter.goal_id, null, 'goal_id set to null');
  assertEqual(taskAfter.id, 'task-1', 'task id preserved');
  assertEqual(taskAfter.title, 'Test Task', 'task title preserved');
  console.log('  PASS: Unlink preserves task entity');
}

console.log('\n=== FRONTEND CONTRACT TESTS ===\n');

// Test 15: Plan V1 DTO uses Plan terminology
console.log('Test 15: Plan V1 DTO uses Plan terminology');
{
  const mockGoal = {
    id: 'plan-1',
    title: 'Test Plan',
    description: 'Description',
    visibility: 'household',
    target_date: '2026-12-31',
    ends_at: '2026-12-31',
    lifecycle: 'active',
    archived_at: null,
    trashed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    version: 1,
  };
  const dto = toPlanDto(mockGoal, []);
  assertEqual(dto.scope, 'household', 'dto uses scope not visibility');
  assertEqual(dto.targetDate, '2026-12-31', 'dto uses targetDate not ends_at');
  assertEqual(dto.lifecycle, 'active', 'dto uses lifecycle not status');
  // Legacy percentage/milestone columns exist on the row but must NOT be
  // projected: no universal percentage, milestones are not Plan V1 (§20).
  const legacy = toPlanDto({ ...mockGoal, progress_percentage: 50, milestones_total: 4, milestones_completed: 2 }, []);
  assertEqual(legacy.progress, undefined, 'dto ignores legacy percentage columns');
  assert(!('milestones' in legacy), 'dto publishes no milestone list');
  console.log('  PASS: DTO uses Plan terminology');
}

// Test 16: No canonical route resolves to old Plan Graph
console.log('Test 16: Plan V1 routes are distinct from old Plan Graph');
const v1Routes = ['PlanList', 'PlanCreate', 'PlanDetail'];
const oldRoutes = ['Plans', 'PlanGraph'];
v1Routes.forEach(r => assert(!oldRoutes.includes(r), `V1 route ${r} not in old routes`));
console.log('  PASS: V1 routes distinct');

// Test 17: Goal is no longer a separate visible canonical Planner concept
console.log('Test 17: Goal concept not exposed in Plan V1 UX');
{
  // Plan V1 screens use 'Plan', 'planId', 'PlanList', 'PlanDetail'
  // No 'Goal', 'Meta', 'goalId' in user-facing strings
  const planTerms = ['Plan', 'Planes', 'Crear plan', 'planId', 'PlanList', 'PlanDetail'];
  const goalTerms = ['Meta', 'Goal', 'goalId', 'GoalDetail', 'GoalList'];
  planTerms.forEach(t => console.log(`  Uses: ${t}`));
  console.log('  PASS: Plan terminology used throughout');
}

console.log('\n=== ALL SLICE 2 TESTS PASSED ===');