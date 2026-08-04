import {
  ACTIVATION_MATRIX,
  buildChangeset,
  buildRequirementTree,
  changesetHasOperations,
  changesetHasPlanVersion,
  childrenStable,
  countUnsatisfiedNecessaryTopLevel,
  deriveManualConditionIndicator,
  deriveMeasurementIndicator,
  deriveMilestoneIndicator,
  deriveRequirementIndicator,
  detectRequirementCycle,
  extractExternalReferences,
  mutationResultOutcome,
  operationsToBackendPayload,
  projectActivationReadiness,
  projectCompletionReadiness,
  toPlanStructureSnapshot,
  topLevelRequirements,
  validateChangeset,
  validatePlanScopeIsolation,
  validateRequirementsSamePlan,
  versionsMatch,
} from '../front/mi-front-limpio/services/planner/planStructureContract';
import type {
  PlanStructureOperation,
  PlanStructureSnapshot,
  PlannerPlanRequirement,
} from '../front/mi-front-limpio/types/PlannerPlan';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount += 1;
  } else {
    console.error(`  fail ${message}`);
    failCount += 1;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (error) {
    console.error(`  threw ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    failCount += 1;
  }
}

const planId = '11111111-1111-4111-8111-111111111111';
const milestoneId = '22222222-2222-4222-8222-222222222222';
const measurementId = '33333333-3333-4333-8333-333333333333';
const conditionId = '44444444-4444-4444-8444-444444444444';
const reqA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const reqB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reqC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const taskId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const rawGraph = {
  plan: {
    id: planId,
    version: 4,
    scope: 'personal',
    owner_person_id: 'person-1',
    household_id: null,
    objective: 'P1 contract',
    description: null,
    lifecycle: 'active',
    target_date: null,
    finalization_kind: 'none',
    archived_at: null,
    trashed_at: null,
    created_at: '2026-08-04T00:00:00Z',
    updated_at: '2026-08-04T00:00:00Z',
    availableActions: ['pause', 'complete'],
  },
  indicators: {
    milestone_count: 1,
    completed_milestone_count: 1,
    measurement_count: 1,
    reached_measurement_count: 1,
    necessary_requirement_count: 2,
    satisfied_necessary_requirement_count: 1,
    supporting_requirement_count: 1,
  },
  milestones: [{
    id: milestoneId,
    plan_id: planId,
    version: 2,
    title: 'Ship contract',
    description: null,
    completion_mode: 'manual',
    lifecycle: 'completed',
    classification: 'necessary',
    sort_order: 0,
  }],
  measurements: [{
    id: measurementId,
    plan_id: planId,
    version: 1,
    name: 'Coverage',
    current_value: 10,
    target_value: 10,
    unit: 'cases',
    target_operator: 'gte',
    targetReached: true,
    classification: 'supporting',
    sort_order: 0,
    history: [],
  }],
  manualConditions: [{
    id: conditionId,
    plan_id: planId,
    version: 1,
    label: 'Reviewed',
    is_satisfied: true,
    classification: 'necessary',
    sort_order: 1,
  }],
  requirements: [{
    id: reqA,
    plan_id: planId,
    parent_requirement_id: null,
    version: 1,
    classification: 'necessary',
    sort_order: 0,
    subject_type: 'milestone',
    milestone_id: milestoneId,
    satisfied: true,
  }, {
    id: reqB,
    plan_id: planId,
    parent_requirement_id: reqA,
    version: 1,
    classification: 'supporting',
    sort_order: 0,
    subject_type: 'external',
    external_kind: 'task',
    external_reference_key: taskId,
    external_entity_id: taskId,
    linked_entity: {
      entity_type: 'task',
      external_entity_id: taskId,
      plan_requirement_id: reqB,
      title: 'Linked task',
      lifecycle: 'pending',
      relation_kind: 'supporting',
      availability: 'available',
    },
    satisfied: false,
  }, {
    id: reqC,
    plan_id: planId,
    parent_requirement_id: null,
    version: 1,
    classification: 'necessary',
    sort_order: 1,
    subject_type: 'manual_condition',
    manual_condition_id: conditionId,
    satisfied: false,
  }],
  draftIsolation: {
    contained: true,
    operationalChildrenPublished: false,
    appearsInHome: false,
    notifies: false,
    recurs: false,
  },
};

const snapshot: PlanStructureSnapshot = toPlanStructureSnapshot(rawGraph);

runTest('backend DTO adapter keeps canonical Plan shape', () => {
  assert(snapshot.plan.id === planId, 'Plan id mapped');
  assert(snapshot.plan.version === 4, 'Plan version mapped as structure version');
  assert(snapshot.milestones[0].planId === planId, 'milestone plan_id mapped');
  assert(snapshot.measurements[0].targetValue === 10, 'measurement target mapped');
  assert(snapshot.manualConditions[0].isSatisfied, 'manual condition state mapped');
  assert(snapshot.requirements[1].subject.kind === 'external', 'external requirement preserved');
  assert(snapshot.requirements[1].subject.kind === 'external' && snapshot.requirements[1].subject.bindingState === 'bound', 'external binding state mapped');
});

runTest('changeset builder models only backend-backed operations', () => {
  const ops: readonly PlanStructureOperation[] = [{
    localId: 'op-1',
    entityType: 'requirement',
    operation: 'parent_change',
    entityId: reqB,
    expectedVersion: 1,
    payload: { parent_requirement_id: null, classification: 'supporting', sort_order: 2 },
  }];
  const changeset = buildChangeset(planId, 4, ops);
  const payload = operationsToBackendPayload(changeset.operations);
  assert(changesetHasOperations(changeset), 'changeset has stable operations');
  assert(changesetHasPlanVersion(changeset), 'expectedPlanVersion required');
  assert(validateChangeset(changeset).length === 0, 'changeset validates');
  assert(payload[0].action === 'update', 'parent change maps to backend update');
  assert(payload[0].parentRequirementId === null, 'parent change payload preserved');
});

runTest('changeset validation rejects missing version and self-parent', () => {
  const invalid = buildChangeset(planId, 0, [{
    localId: 'bad-parent',
    entityType: 'requirement',
    operation: 'parent_change',
    entityId: reqA,
    expectedVersion: 1,
    payload: { parent_requirement_id: reqA },
  }]);
  assert(validateChangeset(invalid).includes('expected_plan_version_required'), 'missing expectedPlanVersion rejected');
  assert(validateChangeset(invalid).includes('requirement_self_parent:bad-parent'), 'self-parent rejected');
});

runTest('requirement hierarchy validates parent and stable ordering', () => {
  const requirements = snapshot.requirements;
  assert(validateRequirementsSamePlan(requirements[1], reqA, requirements).length === 0, 'same-plan parent accepted');
  assert(detectRequirementCycle(reqA, reqB, requirements).includes('requirement_cycle_includes_self'), 'cycle rejected');
  assertEqual(topLevelRequirements(requirements).map((r) => r.id), [reqA, reqC], 'top-level order stable');
  assertEqual(childrenStable(requirements, reqA).map((r) => r.id), [reqB], 'children order stable');
  assert(buildRequirementTree(requirements).length === 2, 'hierarchy tree built');
  assert(countUnsatisfiedNecessaryTopLevel(requirements) === 1, 'necessary unsatisfied top-level counted');
});

runTest('activation readiness matches frontend projection contract', () => {
  assert(projectActivationReadiness(snapshot) === 'READY', 'valid structure is locally ready');
  const empty = { ...snapshot, milestones: [], measurements: [], manualConditions: [], requirements: [] };
  assert(projectActivationReadiness(empty) === 'NO_USEFUL_STRUCTURE', 'empty plan is not ready');
  const unbound = {
    ...snapshot,
    requirements: snapshot.requirements.map((r): PlannerPlanRequirement => r.id === reqB && r.subject.kind === 'external'
      ? { ...r, classification: 'necessary', subject: { ...r.subject, bindingState: 'unavailable', externalEntityId: null } }
      : r),
  };
  assert(projectActivationReadiness(unbound) === 'NECESSARY_REQUIREMENT_PENDING', 'unbound necessary external blocks local readiness');
  assert(ACTIVATION_MATRIX.length === 10, 'minimum activation matrix registered');
});

runTest('completion readiness respects human transition and confirm_unresolved', () => {
  const blocked = projectCompletionReadiness(snapshot);
  const confirmed = projectCompletionReadiness(snapshot, { confirmUnresolved: true });
  assert(!blocked.canComplete, 'pending necessary top-level blocks completion without confirmation');
  assert(blocked.blockers[0]?.kind === 'necessary_requirements_pending', 'completion blocker identifies requirement');
  assert(confirmed.canComplete, 'confirm_unresolved allows human completion projection');
  assert(!projectCompletionReadiness({ ...snapshot, plan: { ...snapshot.plan, lifecycle: 'draft' } }).canComplete, 'draft cannot complete');
  assert(!projectCompletionReadiness({ ...snapshot, plan: { ...snapshot.plan, lifecycle: 'completed' } }).canComplete, 'completed is noop/blocked');
});

runTest('scope isolation and opaque external references are explicit', () => {
  const invalidScope = validatePlanScopeIsolation(snapshot.plan, [{
    localId: 'scope-1',
    entityType: 'milestone',
    operation: 'add',
    entityId: null,
    expectedVersion: null,
    payload: { title: 'Wrong scope', plan_id: 'other-plan', household_id: 'house-1' },
  }]);
  assert(!invalidScope.valid, 'scope mutation rejected locally');
  assert(invalidScope.errors.includes('node_references_different_plan:scope-1'), 'cross-plan payload rejected');
  assert(invalidScope.errors.includes('personal_plan_household_reference:scope-1'), 'personal to household payload rejected');
  const refs = extractExternalReferences(snapshot);
  assertEqual(refs, [{ externalReferenceType: 'task', externalReferenceId: taskId, necessary: false, satisfied: false }], 'Task external shape remains opaque');
});

runTest('separate indicators avoid universal percentage', () => {
  assertEqual(deriveMilestoneIndicator(snapshot), { completed: 1, total: 1 }, 'milestone indicator');
  assertEqual(deriveMeasurementIndicator(snapshot), { total: 1, reached: 1 }, 'measurement indicator');
  assertEqual(deriveManualConditionIndicator(snapshot), { total: 1, satisfied: 1 }, 'manual condition indicator');
  assertEqual(deriveRequirementIndicator(snapshot), { total: 3, necessary: 2, satisfied: 1 }, 'requirement indicator');
  assert(!JSON.stringify(snapshot).toLowerCase().includes('percentage'), 'snapshot has no aggregate percentage');
});

runTest('version/noop/replay/stale conflict helpers are deterministic', () => {
  assert(versionsMatch(4, 4), 'expected version matches');
  assert(!versionsMatch(3, 4), 'stale expected version differs');
  assert(mutationResultOutcome({ outcome: 'noop', version: 4 }, 4) === 'noop', 'noop result preserved');
  assert(mutationResultOutcome({ outcome: 'replay', version: 4 }, 4) === 'replay', 'replay result preserved');
  assert(mutationResultOutcome({ version: 5 }, 4) === 'confirmed', 'single version increment confirms write');
  assert(mutationResultOutcome({ outcome: 'version_conflict', version: 4 }, 4) === 'version_conflict', 'stale conflict preserved');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) process.exit(1);
