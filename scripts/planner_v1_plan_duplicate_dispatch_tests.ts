import assert from 'node:assert/strict';

import { createPlanWriteSingleFlightGate } from '../front/mi-front-limpio/services/planner/planWriteSingleFlight';
import {
  createPlannerMutationIntent,
  createPlannerVersionedMutationIntent,
} from '../front/mi-front-limpio/services/planner/plannerMutationIntent';

let passed = 0;

function ok(name: string, value: unknown): void {
  assert.ok(value, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function equal<T>(name: string, actual: T, expected: T): void {
  assert.equal(actual, expected, name);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('\n=== Planner V1 PLAN-DUP-01 duplicate dispatch tests ===');

{
  const gate = createPlanWriteSingleFlightGate();
  const intent = createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.plan' });
  ok('Plan Create single dispatch acquires once', gate.acquire(intent.mutationId));
  equal('Plan Create double tap in-flight is blocked', gate.acquire(intent.mutationId), false);
  equal('Plan Create different mutation while in-flight is blocked', gate.acquire('mut-other'), false);
  equal('Plan Create current identity remains first intent', gate.current(), intent.mutationId);
}

{
  const gate = createPlanWriteSingleFlightGate();
  const intent = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: 'planner.plan.structure',
    entityVersion: 3,
  });
  ok('Plan Structure single dispatch acquires once', gate.acquire(intent.mutationId));
  equal('Plan Structure stale terminal does not release active intent', gate.release('stale-mutation'), false);
  equal('Plan Structure remains in-flight after stale callback', gate.current(), intent.mutationId);
  ok('Plan Structure matching terminal releases once', gate.release(intent.mutationId));
  equal('Plan Structure duplicate terminal is ignored', gate.release(intent.mutationId), false);
}

{
  const gate = createPlanWriteSingleFlightGate();
  const first = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: 'planner.plan.plan',
    entityVersion: 1,
  });
  ok('Plan Activate single dispatch acquires once', gate.acquire(first.mutationId));
  ok('Plan Activate terminal invalidation releases matching identity', gate.release(first.mutationId));
  const second = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: 'planner.plan.plan',
    entityVersion: 1,
  });
  ok('Plan Activate new intent after terminal is allowed', gate.acquire(second.mutationId));
  ok('Plan Activate new terminal releases second identity', gate.release(second.mutationId));
  ok('Plan Activate post-terminal identity is new', first.mutationId !== second.mutationId);
}

console.log(`\nPlanner V1 PLAN-DUP-01 tests: ${passed} passed, 0 failed`);
