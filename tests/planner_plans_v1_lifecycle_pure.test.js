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
  preparation: ['active', 'archive'],
  active: ['paused', 'completed', 'cancelled', 'archive'],
  paused: ['resume', 'completed', 'cancelled', 'archive'],
  completed: ['reopen', 'archive'],
  cancelled: ['reopen', 'archive'],
};

const PLAN_SCOPE_VALUES = ['household'];

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
    error.code = value === 'personal' ? 'personal_plans_not_supported' : 'invalid_scope';
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

// The production DTO IS the single authority for the Plan shape. Importing it
// (instead of re-declaring a copy here) is what makes these assertions able to
// fail when the contract changes; a local copy could only ever confirm itself.
const { toPlanDto: productionToPlanDto, getPlanAvailableActions: productionAvailableActions, PLAN_DTO_FIELDS } =
  require('../backend/src/services/planner.plans.v1.dto');

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
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.preparation.includes('cancelled'), false, 'preparation cannot cancel');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.length, 4, 'active transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.includes('paused'), true, 'active -> paused');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.includes('completed'), true, 'active -> completed');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.active.includes('cancelled'), true, 'active -> cancelled');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.length, 4, 'paused transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.includes('resume'), true, 'paused -> resume');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.includes('completed'), true, 'paused -> completed');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.paused.includes('cancelled'), true, 'paused -> cancelled');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.completed.length, 2, 'completed transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.completed.includes('reopen'), true, 'completed -> reopen');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.completed.includes('archive'), true, 'completed -> archive');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.cancelled.length, 2, 'cancelled transitions');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.cancelled.includes('reopen'), true, 'cancelled -> reopen');
assertEqual(PLAN_LIFECYCLE_TRANSITIONS.cancelled.includes('archive'), true, 'cancelled -> archive');

console.log('Testing PLAN_SCOPE_VALUES...');
assertEqual(PLAN_SCOPE_VALUES.length, 1, 'scope values count');
assertEqual(PLAN_SCOPE_VALUES.includes('personal'), false, 'personal Plans are unsupported');
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
assertThrows(() => validateScope('personal'), 'personal_plans_not_supported', 'personal Plans are rejected');
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
assertThrows(() => validateLifecycleTransition('preparation', 'cancelled'), 'invalid_lifecycle_transition', 'preparation -> cancelled throws');
validateLifecycleTransition('active', 'paused');
validateLifecycleTransition('active', 'completed');
validateLifecycleTransition('active', 'cancelled');
validateLifecycleTransition('paused', 'resume');
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

const dto = productionToPlanDto(mockGoal, []);
assertEqual(dto.id, 'plan-1', 'dto id');
assertEqual(dto.title, 'Test Plan', 'dto title');
assertEqual(dto.description, 'Description', 'dto description');
assertEqual(dto.scope, 'household', 'dto scope');
assertEqual(dto.targetDate, '2026-12-31', 'dto targetDate from target_date');
assertEqual(dto.lifecycle, 'active', 'dto lifecycle');
assertEqual(dto.archivedAt, null, 'dto archivedAt');
assertEqual(dto.trashedAt, null, 'dto trashedAt');
assertEqual(dto.version, 1, 'dto version');

// Frozen: NO universal percentage is a Plan V1 progress authority, and
// milestones are NOT Plan V1 components (§20). Readiness/progress come from
// the dedicated aggregate endpoint, never from this DTO.
assertEqual(dto.progress, undefined, 'dto publishes no legacy percentage/milestone progress');
assert(
  !('percentage' in (dto.progress ?? {})) && !('milestones' in (dto.progress ?? {})),
  'dto progress carries neither percentage nor milestones',
);
assert(
  !('milestones' in dto),
  'dto publishes no milestone list',
);
assert(
  Array.isArray(dto.availableActions) && dto.availableActions.includes('pause'),
  'dto projects availableActions (the single action authority)',
);
assert(
  Object.keys(dto).every((key) => PLAN_DTO_FIELDS.includes(key)),
  `dto projects only contract fields (got ${Object.keys(dto).join(',')})`,
);

// Test with ends_at fallback
const mockGoal2 = {
  ...mockGoal,
  target_date: null,
  ends_at: '2026-06-30',
};
const dto2 = productionToPlanDto(mockGoal2, []);
assertEqual(dto2.targetDate, '2026-06-30', 'dto targetDate falls back to ends_at');

// Archive is orthogonal to lifecycle and swaps archive ⇄ unarchive.
const archivedDto = productionToPlanDto({ ...mockGoal, archived_at: '2026-02-02T00:00:00.000Z' });
assert(archivedDto.availableActions.includes('unarchive'), 'archived Plan offers unarchive');
assert(!archivedDto.availableActions.includes('archive'), 'archived Plan does not offer archive');
assertEqual(archivedDto.lifecycle, 'active', 'archive preserves lifecycle');
// A trashed Plan is inert.
assertEqual(
  productionAvailableActions({ ...mockGoal, trashed_at: '2026-02-02T00:00:00.000Z' }).join(','),
  'restore',
  'trashed Plan offers restore only',
);

console.log('\nAll tests passed!');
