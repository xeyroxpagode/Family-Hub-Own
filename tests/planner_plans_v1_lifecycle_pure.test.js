'use strict';

// Pure logic tests for Plan V1 lifecycle - no external dependencies

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

const toPlanDto = (goal, milestones) => {
  const progress = goal.progress_percentage ?? null;
  const tasksTotal = goal.tasks_total ?? null;
  const tasksCompleted = goal.tasks_completed ?? null;
  const tasksPending = goal.tasks_pending ?? null;
  const milestonesTotal = goal.milestones_total ?? (milestones?.length ?? 0);
  const milestonesCompleted = goal.milestones_completed ?? (milestones?.filter(m => m.achieved).length ?? 0);

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    scope: goal.visibility,
    targetDate: goal.target_date ?? goal.ends_at,
    lifecycle: goal.lifecycle,
    archivedAt: goal.archived_at,
    trashedAt: goal.trashed_at,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    version: goal.version,
    progress: progress !== null ? {
      percentage: progress,
      tasks: tasksTotal !== null ? { total: tasksTotal, completed: tasksCompleted, pending: tasksPending } : undefined,
      milestones: milestonesTotal !== null ? { total: milestonesTotal, completed: milestonesCompleted } : undefined,
    } : undefined,
  };
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

console.log('Testing PLAN_LIFECYCLE_VALUES...');
assertEqual(PLAN_LIFECYCLE_VALUES.length, 5, 'lifecycle values count');
assertEqual(PLAN_LIFECYCLE_VALUES.includes('preparation'), true, 'has preparation');
assertEqual(PLAN_LIFECYCLE_VALUES.includes('active'), true, 'has active');
assertEqual(PLAN_LIFECYCLE_VALUES.includes('paused'), true, 'has paused');
assertEqual(PLAN_LIFECYCLE_VALUES.includes('completed'), true, 'has completed');
assertEqual(PLAN_LIFECYCLE_VALUES.includes('cancelled'), true, 'has cancelled');

console.log('Testing PLAN_LIFECYCLE_TRANSITIONS...');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.preparation.length, 2, 'preparation transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.preparation.includes('active'), true, 'preparation -> active');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.preparation.includes('cancelled'), true, 'preparation -> cancelled');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.length, 3, 'active transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.includes('paused'), true, 'active -> paused');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.includes('completed'), true, 'active -> completed');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.includes('cancelled'), true, 'active -> cancelled');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.length, 3, 'paused transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.includes('active'), true, 'paused -> active');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.includes('completed'), true, 'paused -> completed');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.includes('cancelled'), true, 'paused -> cancelled');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.completed.length, 2, 'completed transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.completed.includes('reopen'), true, 'completed -> reopen');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.completed.includes('archive'), true, 'completed -> archive');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.cancelled.length, 2, 'cancelled transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.cancelled.includes('reopen'), true, 'cancelled -> reopen');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.cancelled.includes('archive'), true, 'cancelled -> archive');

console.log('Testing PLAN_SCOPE_VALUES...');
assertEqual(PLAN_SCOPE_VALUES.length, 2, 'scope values count');
assertEqual(PLAN_SCOPE_VALUES.includes('personal'), true, 'has personal');
assertEqual(PLAN_SCOPE_VALUES.includes('household'), true, 'has household');

console.log('Testing validateLifecycle...');
assertEqual(validateLifecycle('preparation'), 'preparation', 'valid preparation');
assertEqual(validateLifecycle('active'), 'active', 'valid active');
assertEqual(validateLifecycle('paused'), 'paused', 'valid paused');
assertEqual(validateLifecycle('completed'), 'completed', 'valid completed');
assertEqual(validateLifecycle('cancelled'), 'cancelled', 'valid cancelled');
assertEqual(validateLifecycle(), 'preparation', 'default to preparation');
assertEqual(validateLifecycle(null), 'preparation', 'null defaults to preparation');
assertEqual(validateLifecycle(''), 'preparation', 'empty string defaults to preparation');
assertThrows(() => validateLifecycle('invalid'), 'invalid_lifecycle', 'invalid lifecycle throws');
assertThrows(() => validateLifecycle('draft'), 'invalid_lifecycle', 'draft not allowed');

console.log('Testing validateScope...');
assertEqual(validateScope('personal'), 'personal', 'valid personal');
assertEqual(validateScope('household'), 'household', 'valid household');
assertEqual(validateScope(), 'household', 'default to household');
assertEqual(validateScope(null), 'household', 'null defaults to household');
assertEqual(validateScope(''), 'household', 'empty string defaults to household');
assertThrows(() => validateScope('invalid'), 'invalid_scope', 'invalid scope throws');

console.log('Testing validateLifecycleTransition...');
assertThrows(() => validateLifecycleTransition('invalid', 'active'), 'invalid_lifecycle', 'invalid from throws');
assertThrows(() => validateLifecycleTransition('active', 'invalid'), 'invalid_lifecycle_transition', 'invalid to throws');
assertThrows(() => validateLifecycleTransition('active', 'active'), 'invalid_lifecycle_transition', 'same state throws');
assertThrows(() => validateLifecycleTransition('preparation', 'paused'), 'invalid_lifecycle_transition', 'preparation -> paused throws');
assertThrows(() => validateLifecycleTransition('completed', 'active'), 'invalid_lifecycle_transition', 'completed -> active throws');
assertThrows(() => validateLifecycleTransition('completed', 'paused'), 'invalid_lifecycle_transition', 'completed -> paused throws');

// Valid transitions
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

console.log('Testing toPlanDto...');
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
  progress_percentage: 50,
  tasks_total: 10,
  tasks_completed: 5,
  tasks_pending: 5,
  milestones_total: 4,
  milestones_completed: 2,
};

const dto = toPlanDto(mockGoal, []);
assertEqual(dto.id, 'plan-1', 'dto id');
assertEqual(dto.title, 'Test Plan', 'dto title');
assertEqual(dto.description, 'Description', 'dto description');
assertEqual(dto.scope, 'household', 'dto scope');
assertEqual(dto.targetDate, '2026-12-31', 'dto targetDate from target_date');
assertEqual(dto.lifecycle, 'active', 'dto lifecycle');
assertEqual(dto.archivedAt, null, 'dto archivedAt');
assertEqual(dto.trashedAt, null, 'dto trashedAt');
assertEqual(dto.version, 1, 'dto version');
assertEqual(dto.progress.percentage, 50, 'dto progress percentage');
assertEqual(dto.progress.tasks.total, 10, 'dto progress tasks total');
assertEqual(dto.progress.tasks.completed, 5, 'dto progress tasks completed');
assertEqual(dto.progress.tasks.pending, 5, 'dto progress tasks pending');
assertEqual(dto.progress.milestones.total, 4, 'dto progress milestones total');
assertEqual(dto.progress.milestones.completed, 2, 'dto progress milestones completed');

// Test with ends_at fallback
const mockGoal2 = {
  ...mockGoal,
  target_date: null,
  ends_at: '2026-06-30',
};
const dto2 = toPlanDto(mockGoal2, []);
assertEqual(dto2.targetDate, '2026-06-30', 'dto targetDate falls back to ends_at');

console.log('\nAll tests passed!');