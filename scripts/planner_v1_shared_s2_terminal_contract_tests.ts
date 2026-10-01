/**
 * Planner V1 — Shared S2 Terminal Result Contract Tests.
 *
 * Pure assertions on the Shared terminal classification:
 *  - confirmed values (created/updated/noop/replay) classify as closing,
 *  - uncertain values (pending / retrying / timeout / offline / conflict /
 *    validation / manual_review / unknown) classify as non-closing,
 *  - classifier maps durable-record states to terminal classes deterministically,
 *  - sheetMayCloseForReliabilityOutcome only closes for matching intent +
 *    confirmed record.
 *
 * Run via: `npm run test:planner:s2-terminal`.
 */

import assert from 'node:assert/strict';
import {
  PLANNER_RELIABILITY_CONFIRMED_RESULT_VALUES,
  PLANNER_RELIABILITY_UNCERTAIN_RESULT_VALUES,
  isPlannerReliabilityConfirmedResult,
  isPlannerReliabilityUncertainResult,
  classifyPlannerReliabilityTerminalResultForRecord,
  isSubmittEndForActiveIntent,
  sheetMayCloseForReliabilityOutcome,
} from '../front/mi-front-limpio/services/planner/reliability/sheetTerminalContract.js';
import type { PlannerOperationRecord } from '../front/mi-front-limpio/services/planner/reliability/types.js';

function recordFixture(overrides: Partial<PlannerOperationRecord>): PlannerOperationRecord {
  return {
    descriptor: {
      operationType: 'create',
      localOperationId: 'l1',
      mutationId: 'm1',
      idempotencyKey: 'k1',
      requestHash: 'h1',
      domain: 'task',
      ownerPartition: { authenticatedUserId: 'u1' },
      scope: { kind: 'household', householdId: 'h1' },
      payload: {},
      dependencies: [],
      createdAt: new Date(0).toISOString(),
    },
    state: 'pending',
    attemptCount: 0,
    updatedAt: new Date(0).toISOString(),
    attempt: { requestMayHaveReachedServer: false },
    ...overrides,
  } as PlannerOperationRecord;
}

function run(): void {
  let passed = 0;
  let failed = 0;
  const t = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${(e as Error).message}`);
      failed++;
    }
  };

  t('confirmed values: classification returns true for all confirmed values', () => {
    for (const v of PLANNER_RELIABILITY_CONFIRMED_RESULT_VALUES) {
      assert.equal(isPlannerReliabilityConfirmedResult(v), true, `expected confirmed: ${v}`);
    }
  });

  t('uncertain values: classification returns true for all uncertain values', () => {
    for (const v of PLANNER_RELIABILITY_UNCERTAIN_RESULT_VALUES) {
      assert.equal(isPlannerReliabilityUncertainResult(v), true, `expected uncertain: ${v}`);
    }
  });

  t('mutual exclusivity: confirmed vs uncertain sets are disjoint', () => {
    const confirmed = new Set(PLANNER_RELIABILITY_CONFIRMED_RESULT_VALUES);
    for (const u of PLANNER_RELIABILITY_UNCERTAIN_RESULT_VALUES) {
      assert.ok(!confirmed.has(u as never), `${u} must not be in confirmed set`);
    }
  });

  t('classifier: confirmed+created outcome → created', () => {
    const r = recordFixture({ state: 'confirmed', attemptCount: 1, authoritativeResult: { outcome: 'created' } });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'created');
  });

  t('classifier: confirmed+updated outcome → updated', () => {
    const r = recordFixture({ state: 'confirmed', attemptCount: 1, authoritativeResult: { outcome: 'updated' }, descriptor: { ...recordFixture({}).descriptor, operationType: 'update' } });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'updated');
  });

  t('classifier: confirmed+noop outcome → noop', () => {
    const r = recordFixture({ state: 'confirmed', attemptCount: 1, authoritativeResult: { outcome: 'noop' } });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'noop');
  });

  t('classifier: confirmed+replay outcome → replay', () => {
    const r = recordFixture({ state: 'confirmed', attemptCount: 1, authoritativeResult: { outcome: 'replay' } });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'replay');
  });

  t('classifier: pending state → pending (sheet must stay open)', () => {
    const r = recordFixture({ state: 'pending' });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'pending');
    assert.equal(isPlannerReliabilityConfirmedResult(classifyPlannerReliabilityTerminalResultForRecord(r) as any), false);
  });

  t('classifier: in_flight state → pending (sheet must stay open)', () => {
    const r = recordFixture({ state: 'in_flight', attemptCount: 1, attempt: { requestMayHaveReachedServer: true } });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'pending');
  });

  t('classifier: retrying state → retrying (sheet must stay open)', () => {
    const r = recordFixture({ state: 'retrying', attemptCount: 1 });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'retrying');
  });

  t('classifier: uncertain state → manual_review (sheet must stay open)', () => {
    const r = recordFixture({ state: 'uncertain', attemptCount: 1, attempt: { requestMayHaveReachedServer: true } });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'manual_review');
  });

  t('classifier: conflicted+version_conflict → conflict_reviewable', () => {
    const r = recordFixture({
      state: 'conflicted',
      attemptCount: 1,
      conflict: { kind: 'version_conflict', stableCode: 'version_conflict' },
    });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'conflict_reviewable');
  });

  t('classifier: conflicted+idempotency_conflict → conflict_reviewable', () => {
    const r = recordFixture({
      state: 'conflicted',
      attemptCount: 1,
      conflict: { kind: 'idempotency_conflict', stableCode: 'idempotency_conflict' },
    });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'conflict_reviewable');
  });

  t('classifier: conflicted+validation_failed → validation', () => {
    const r = recordFixture({
      state: 'conflicted',
      attemptCount: 1,
      conflict: { kind: 'validation_failed', stableCode: 'validation_failed' },
    });
    assert.equal(classifyPlannerReliabilityTerminalResultForRecord(r), 'validation');
  });

  t('isSubmittEndForActiveIntent: same intent matches', () => {
    assert.equal(isSubmittEndForActiveIntent('m1', 'm1'), true);
    assert.equal(isSubmittEndForActiveIntent('m1', 'm2'), false);
    assert.equal(isSubmittEndForActiveIntent(null, 'm1'), false);
    assert.equal(isSubmittEndForActiveIntent('m1', null), false);
  });

  t('sheetMayCloseForReliabilityOutcome: confirmed + matching intent closes', () => {
    const r = recordFixture({ state: 'confirmed', attemptCount: 1, authoritativeResult: { outcome: 'created' } });
    assert.equal(
      sheetMayCloseForReliabilityOutcome({
        activeIntentId: 'm1',
        submitEndIntentId: 'm1',
        record: r,
        durableState: 'confirmed',
      }),
      true,
    );
  });

  t('sheetMayCloseForReliabilityOutcome: confirmed but stale intent NOT closes', () => {
    const r = recordFixture({ state: 'confirmed', attemptCount: 1, authoritativeResult: { outcome: 'created' } });
    assert.equal(
      sheetMayCloseForReliabilityOutcome({
        activeIntentId: 'm1',
        submitEndIntentId: 'stale',
        record: r,
        durableState: 'confirmed',
      }),
      false,
    );
  });

  t('sheetMayCloseForReliabilityOutcome: pending state NOT closes', () => {
    const r = recordFixture({ state: 'pending' });
    assert.equal(
      sheetMayCloseForReliabilityOutcome({
        activeIntentId: 'm1',
        submitEndIntentId: 'm1',
        record: r,
        durableState: 'pending',
      }),
      false,
    );
  });

  t('sheetMayCloseForReliabilityOutcome: uncertain state NOT closes', () => {
    const r = recordFixture({ state: 'uncertain', attemptCount: 1, attempt: { requestMayHaveReachedServer: true } });
    assert.equal(
      sheetMayCloseForReliabilityOutcome({
        activeIntentId: 'm1',
        submitEndIntentId: 'm1',
        record: r,
        durableState: 'uncertain',
      }),
      false,
    );
  });

  t('sheetMayCloseForReliabilityOutcome conflicted state NOT closes', () => {
    const r = recordFixture({
      state: 'conflicted',
      attemptCount: 1,
      conflict: { kind: 'version_conflict', stableCode: 'version_conflict' },
    });
    assert.equal(
      sheetMayCloseForReliabilityOutcome({
        activeIntentId: 'm1',
        submitEndIntentId: 'm1',
        record: r,
        durableState: 'conflicted',
      }),
      false,
    );
  });

  console.log(`\n=== Planner V1 Shared S2 Terminal Contract Tests: ${passed} pass, ${failed} fail ===`);
  if (failed > 0) process.exit(1);
}

run();
