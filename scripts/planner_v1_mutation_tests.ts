/**
 * Planner V1 — M1 Mutation Intent Tests.
 *
 * Pure TypeScript tests for the mutation intent contract.
 * Run: compile with `tsc -p scripts/tsconfig.test.json` then
 * `node scripts/compiled/scripts/planner_v1_mutation_tests.js`
 */

import {
  createPlannerMutationIntent,
  createPlannerVersionedMutationIntent,
  clonePlannerMutationIntent,
  activeMutationIntent,
  toRequestJsonOptions,
  toPlannerReadOptions,
  type PlannerMutationIntent,
  type PlannerTransportOptions,
} from '../front/mi-front-limpio/services/planner/plannerMutationIntent';

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
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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
// 1. Create intent
// ---------------------------------------------------------------------------

runTest('Create intent — stable mutationId + idempotencyKey', () => {
  const intent1 = createPlannerMutationIntent({ kind: 'create', entityKind: 'task' });
  const intent2 = createPlannerMutationIntent({ kind: 'create', entityKind: 'task' });

  assert(typeof intent1.mutationId === 'string' && intent1.mutationId.length > 0, 'mutationId present');
  assert(typeof intent1.idempotencyKey === 'string' && intent1.idempotencyKey.length > 0, 'idempotencyKey present');
  assert(intent1.operationKind === 'CREATE_IDEMPOTENT', 'operationKind CREATE_IDEMPOTENT');
  assert(intent1.ifMatch === undefined, 'no ifMatch for create');

  // Different intents get different IDs
  assert(intent1.mutationId !== intent2.mutationId, 'different mutationId per intent');
  assert(intent1.idempotencyKey !== intent2.idempotencyKey, 'different idempotencyKey per intent');
});

runTest('Create intent — entityKind encoded in idempotencyKey', () => {
  const taskIntent = createPlannerMutationIntent({ kind: 'create', entityKind: 'task' });
  const eventIntent = createPlannerMutationIntent({ kind: 'create', entityKind: 'event' });
  const goalIntent = createPlannerMutationIntent({ kind: 'create', entityKind: 'goal' });

  assert(taskIntent.idempotencyKey?.includes('task') ?? false, 'task in key');
  assert(eventIntent.idempotencyKey?.includes('event') ?? false, 'event in key');
  assert(goalIntent.idempotencyKey?.includes('goal') ?? false, 'goal in key');
});

// ---------------------------------------------------------------------------
// 2. Versioned mutation intent
// ---------------------------------------------------------------------------

runTest('Versioned intent — mutationId + idempotencyKey + ifMatch', () => {
  const intent = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: 'task',
    entityVersion: 5,
  });

  assert(typeof intent.mutationId === 'string', 'mutationId present');
  assert(typeof intent.idempotencyKey === 'string', 'idempotencyKey present');
  assert(intent.ifMatch === '5', 'ifMatch stringified version');
  assert(intent.operationKind === 'VERSIONED_MUTATION', 'operationKind VERSIONED_MUTATION');
});

runTest('Versioned intent — numeric version stringified', () => {
  const intent = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: 'goal',
    entityVersion: 12,
  });
  assert(intent.ifMatch === '12', 'numeric version stringified');
});

runTest('Versioned intent — string version preserved', () => {
  const intent = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: 'event',
    entityVersion: '7',
  });
  assert(intent.ifMatch === '7', 'string version preserved');
});

// ---------------------------------------------------------------------------
// 3. Clone for retry — preserves identity
// ---------------------------------------------------------------------------

runTest('Clone intent — preserves mutationId and idempotencyKey', () => {
  const original = createPlannerMutationIntent({ kind: 'create', entityKind: 'task' });
  const cloned = clonePlannerMutationIntent(original);

  assert(cloned.mutationId === original.mutationId, 'mutationId preserved');
  assert(cloned.idempotencyKey === original.idempotencyKey, 'idempotencyKey preserved');
  assert(cloned.ifMatch === original.ifMatch, 'ifMatch preserved');
  assert(cloned.operationKind === original.operationKind, 'operationKind preserved');
});

runTest('Clone versioned intent — preserves ifMatch', () => {
  const original = createPlannerVersionedMutationIntent({
    kind: 'versioned',
    entityKind: 'goal',
    entityVersion: 9,
  });
  const cloned = clonePlannerMutationIntent(original);

  assert(cloned.ifMatch === '9', 'ifMatch preserved on clone');
});

// ---------------------------------------------------------------------------
// 4. Active intent extraction
// ---------------------------------------------------------------------------

runTest('activeMutationIntent — returns keys when intent present', () => {
  const intent: PlannerMutationIntent = {
    mutationId: 'mut_123',
    idempotencyKey: 'idem_abc',
    ifMatch: '5',
    operationKind: 'VERSIONED_MUTATION',
  };

  const active = activeMutationIntent(intent);
  assert(active !== null, 'not null');
  assertEqual(active, {
    mutationId: 'mut_123',
    idempotencyKey: 'idem_abc',
    ifMatch: '5',
  }, 'returns correct shape');
});

runTest('activeMutationIntent — returns null when intent null', () => {
  const active = activeMutationIntent(null);
  assert(active === null, 'returns null');
});

runTest('activeMutationIntent — omits undefined fields', () => {
  const intent: PlannerMutationIntent = {
    mutationId: 'mut_456',
    operationKind: 'CREATE_IDEMPOTENT',
  };
  const active = activeMutationIntent(intent);
  assert(active !== null, 'not null');
  if (active) {
    assert(!('idempotencyKey' in active) || active.idempotencyKey === undefined, 'idempotencyKey omitted when undefined');
    assert(!('ifMatch' in active) || active.ifMatch === undefined, 'ifMatch omitted when undefined');
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(failCount === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');

if (failCount > 0) process.exit(1);