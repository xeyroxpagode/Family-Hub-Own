/**
 * Planner V1 — M1 Error Adapter Tests.
 *
 * Pure TypeScript tests for error classification and version/concurrency adapter.
 * Run: compile with `tsc -p scripts/tsconfig.test.json` then
 * `node scripts/compiled/scripts/planner_v1_error_tests.js`
 */

import {
  classifyPlannerError,
  isPlannerAbort,
  isRetryable,
  isVersionConflict,
  extractEntityVersion,
  parseEntityVersionForIfMatch,
  extractConflictVersions,
  getPlannerErrorRequestId,
  type PlannerErrorClass,
  type PlannerError,
} from '../front/mi-front-limpio/services/planner/plannerErrorAdapter';
import { ApiError, AbortError } from '../front/mi-front-limpio/services/api';

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
// 1. Abort/timeout classification
// ---------------------------------------------------------------------------

runTest('AbortError — isPlannerAbort detects AbortError', () => {
  const err = new AbortError('/api/planner/tasks', new AbortSignal());
  assert(isPlannerAbort(err), 'detects AbortError');
  assert(classifyPlannerError(err).class === 'abort', 'classifies as abort');
});

runTest('AbortError — DOM AbortError detected', () => {
  // Simulate DOM AbortError
  const err = new DOMException('Aborted', 'AbortError');
  assert(isPlannerAbort(err), 'detects DOM AbortError');
  assert(classifyPlannerError(err).class === 'abort', 'classifies as abort');
});

runTest('Timeout — not classified as abort unless AbortError', () => {
  // A timeout would throw AbortError from requestControl
  // Non-AbortError timeouts don't reach classifyPlannerError
  // (they become AbortError in requestJson)
});

// ---------------------------------------------------------------------------
// 2. ApiError classification
// ---------------------------------------------------------------------------

function makeApiError(status: number, code: string | null, details?: unknown, requestId?: string): ApiError {
  return new ApiError('test message', status, code, 'debug', requestId ?? null, details ?? null);
}

runTest('ApiError 400/422 — validation class', () => {
  const err400 = makeApiError(400, 'invalid_expected_version');
  const classified = classifyPlannerError(err400);
  assert(classified.class === 'validation', '400 -> validation');
  assert(classified.isRetryable === false, 'validation not retryable');

  const err422 = makeApiError(422, 'expected_version_required');
  assert(classifyPlannerError(err422).class === 'validation', '422 -> validation');
});

runTest('ApiError 401 — forbidden class', () => {
  const err = makeApiError(401, 'not_authenticated');
  assert(classifyPlannerError(err).class === 'forbidden', '401 -> forbidden');
});

runTest('ApiError 403 — forbidden class', () => {
  const err = makeApiError(403, 'rls_violation');
  assert(classifyPlannerError(err).class === 'forbidden', '403 -> forbidden');
});

runTest('ApiError 404 — not_found class', () => {
  const err = makeApiError(404, 'task_not_found');
  assert(classifyPlannerError(err).class === 'not_found', '404 -> not_found');
});

runTest('ApiError 409 — conflict class', () => {
  const err = makeApiError(409, 'idempotency_key_conflict');
  assert(classifyPlannerError(err).class === 'conflict', '409 -> conflict');
});

runTest('ApiError 412 — conflict class (version_conflict_v2)', () => {
  const err = makeApiError(412, 'version_conflict_v2', { current: 7, expected: 5 });
  const classified = classifyPlannerError(err);
  assert(classified.class === 'conflict', '412 -> conflict');
  assert(classified.code === 'version_conflict_v2', 'code preserved');
  assert(classified.isRetryable === false, 'conflict not retryable');
});

runTest('ApiError 429 — server class (retryable)', () => {
  const err = makeApiError(429, 'rate_limited');
  const classified = classifyPlannerError(err);
  assert(classified.class === 'server', '429 -> server');
  assert(classified.isRetryable === true, 'server retryable');
});

runTest('ApiError 500+ — server class (retryable, redacted)', () => {
  const err500 = makeApiError(500, 'internal_error');
  const classified500 = classifyPlannerError(err500);
  assert(classified500.class === 'server', '500 -> server');
  assert(classified500.isRetryable === true, 'server retryable');

  const err503 = makeApiError(503, 'service_unavailable');
  assert(classifyPlannerError(err503).class === 'server', '503 -> server');
});

runTest('Unknown error — offline detection for TypeError', () => {
  const networkErr = new TypeError('Failed to fetch');
  const classified = classifyPlannerError(networkErr);
  assert(classified.class === 'offline', 'TypeError -> offline');
  assert(classified.isRetryable === true, 'offline retryable');
});

// ---------------------------------------------------------------------------
// 3. Retryable predicate
// ---------------------------------------------------------------------------

runTest('isRetryable — correct for each class', () => {
  assert(isRetryable('server') === true, 'server retryable');
  assert(isRetryable('offline') === true, 'offline retryable');
  assert(isRetryable('abort') === true, 'abort retryable');
  assert(isRetryable('validation') === false, 'validation not retryable');
  assert(isRetryable('forbidden') === false, 'forbidden not retryable');
  assert(isRetryable('not_found') === false, 'not_found not retryable');
  assert(isRetryable('conflict') === false, 'conflict not retryable');
  assert(isRetryable('unknown') === false, 'unknown not retryable');
});

// ---------------------------------------------------------------------------
// 4. Version & concurrency
// ---------------------------------------------------------------------------

runTest('extractEntityVersion — from response object', () => {
  const resp1 = { id: '1', version: 5, title: 'Task' };
  assertEqual(extractEntityVersion(resp1), 5, 'extracts numeric version');

  const resp2 = { version: '7' }; // string should be ignored
  assertEqual(extractEntityVersion(resp2), undefined, 'string version -> undefined');

  const resp3 = { id: '1' };
  assertEqual(extractEntityVersion(resp3), undefined, 'missing version -> undefined');

  assertEqual(extractEntityVersion(null), undefined, 'null -> undefined');
  assertEqual(extractEntityVersion(undefined), undefined, 'undefined -> undefined');
});

runTest('parseEntityVersionForIfMatch — valid inputs', () => {
  assertEqual(parseEntityVersionForIfMatch(5), '5', 'number -> string');
  assertEqual(parseEntityVersionForIfMatch('7'), '7', 'string preserved');
  assertEqual(parseEntityVersionForIfMatch(1), '1', 'version 1');
});

runTest('parseEntityVersionForIfMatch — invalid inputs', () => {
  assertEqual(parseEntityVersionForIfMatch(0), undefined, '0 -> undefined');
  assertEqual(parseEntityVersionForIfMatch(-1), undefined, 'negative -> undefined');
  assertEqual(parseEntityVersionForIfMatch('0'), undefined, 'string "0" -> undefined');
  assertEqual(parseEntityVersionForIfMatch('abc'), undefined, 'non-numeric string -> undefined');
  assertEqual(parseEntityVersionForIfMatch(''), undefined, 'empty string -> undefined');
  assertEqual(parseEntityVersionForIfMatch(null), undefined, 'null -> undefined');
  assertEqual(parseEntityVersionForIfMatch(undefined), undefined, 'undefined -> undefined');
});

runTest('extractConflictVersions — from 412 details', () => {
  const plannerError = {
    original: new ApiError('conflict', 412, 'version_conflict_v2', undefined, 'req-123', { current: 8, expected: 5 }),
    class: 'conflict' as PlannerErrorClass,
    code: 'version_conflict_v2',
    requestId: 'req-123',
    isRetryable: false,
  } as PlannerError;

  const versions = extractConflictVersions(plannerError);
  assertEqual(versions, { current: 8, expected: 5 }, 'extracts current/expected');
});

runTest('extractConflictVersions — missing details returns null', () => {
  const plannerError = {
    original: new ApiError('conflict', 412, 'version_conflict_v2', undefined, 'req-123', null),
    class: 'conflict' as PlannerErrorClass,
    code: 'version_conflict_v2',
    requestId: 'req-123',
    isRetryable: false,
  } as PlannerError;

  const versions = extractConflictVersions(plannerError);
  assertEqual(versions, { current: null, expected: null }, 'null details -> nulls');
});

runTest('isVersionConflict — true for version_conflict_v2', () => {
  const err = {
    original: new ApiError('conflict', 412, 'version_conflict_v2'),
    class: 'conflict' as PlannerErrorClass,
    code: 'version_conflict_v2',
    requestId: 'req-1',
    isRetryable: false,
  } as PlannerError;
  assert(isVersionConflict(err), 'version_conflict_v2 -> true');
});

runTest('isVersionConflict — false for other conflict codes', () => {
  const err = {
    original: new ApiError('conflict', 409, 'idempotency_key_conflict'),
    class: 'conflict' as PlannerErrorClass,
    code: 'idempotency_key_conflict',
    requestId: 'req-1',
    isRetryable: false,
  } as PlannerError;
  assert(!isVersionConflict(err), 'other conflict code -> false');
});

// ---------------------------------------------------------------------------
// 5. Request ID extraction
// ---------------------------------------------------------------------------

runTest('getPlannerErrorRequestId — from classified error', () => {
  const apiErr = new ApiError('msg', 404, 'not_found', undefined, 'req-abc-123');
  const classified = classifyPlannerError(apiErr);

  assertEqual(getPlannerErrorRequestId(classified), 'req-abc-123', 'extracts requestId from classified');
});

runTest('getPlannerErrorRequestId — falls back to original ApiError', () => {
  const apiErr = new ApiError('msg', 500, 'internal', undefined, 'req-fallback');
  const classified = classifyPlannerError(apiErr);
  assertEqual(getPlannerErrorRequestId(classified), 'req-fallback', 'falls back to original');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(failCount === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');

if (failCount > 0) process.exit(1);