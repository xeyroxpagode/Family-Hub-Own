/**
 * Planner V1 — Phase 1 date/time primitives tests (Slice 1.2).
 *
 * Covers the pure logic that makes the pickers temporally correct:
 * - civil date helpers must use the LOCAL calendar, never UTC (the off-by-one
 *   regression was `new Date().toISOString().slice(0, 10)` for "today");
 * - the minute wheel keeps an off-grid committed minute honest instead of
 *   silently rounding it.
 *
 * Run via `node tests/run.js planner-datetime-primitives`.
 */

import {
  civilDateToYMD,
  todayYMD,
  parseCivilYMD,
  isSameCivilDate,
} from '../front/mi-front-limpio/utils/civilDate';
import { buildMinuteWheelValues, MINUTE_WHEEL_GRID } from '../front/mi-front-limpio/utils/timeWheel';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  FAIL ${name}: ${e.message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// --- Civil date helpers ---

test('civilDateToYMD reads LOCAL calendar fields, not UTC', () => {
  // A local civil date at 23:30 — `toISOString()` would shift this to the
  // next day in UTC-3. The local-field implementation must return the same
  // civil date in ANY environment timezone.
  assertEqual(civilDateToYMD(new Date(2026, 9, 8, 23, 30)), '2026-10-08', 'late-evening civil date');
  assertEqual(civilDateToYMD(new Date(2026, 0, 1, 0, 0)), '2026-01-01', 'year boundary');
  assertEqual(civilDateToYMD(new Date(2027, 1, 28, 12, 0)), '2027-02-28', 'leap-year february');
  assertEqual(civilDateToYMD(new Date(2028, 1, 29, 12, 0)), '2028-02-29', 'leap day 2028');
});

test('todayYMD matches the local calendar today', () => {
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assertEqual(todayYMD(), expected, 'local civil today');
});

test('parseCivilYMD validates ranges', () => {
  assertEqual(parseCivilYMD('2026-10-08'), { year: 2026, month: 10, day: 8 }, 'valid');
  assertTrue(parseCivilYMD('2026-13-08') === null, 'month 13 invalid');
  assertTrue(parseCivilYMD('2026-00-08') === null, 'month 0 invalid');
  assertTrue(parseCivilYMD('2026-10-32') === null, 'day 32 invalid');
  assertTrue(parseCivilYMD('2026-10-00') === null, 'day 0 invalid');
  assertTrue(parseCivilYMD('') === null, 'empty invalid');
  assertTrue(parseCivilYMD('08-10-2026') === null, 'non-YMD format invalid');
});

test('isSameCivilDate compares by calendar value', () => {
  assertTrue(isSameCivilDate('2026-10-08', '2026-10-08'), 'same date');
  assertTrue(!isSameCivilDate('2026-10-08', '2026-10-09'), 'different day');
  assertTrue(!isSameCivilDate('2026-10-08', ''), 'invalid never equal');
  assertTrue(!isSameCivilDate('', ''), 'two invalids never equal');
});

// --- Minute wheel ---

test('grid minute stays on the plain 5-minute grid', () => {
  assertEqual(buildMinuteWheelValues(0), MINUTE_WHEEL_GRID, 'minute 0');
  assertEqual(buildMinuteWheelValues(55), MINUTE_WHEEL_GRID, 'minute 55');
});

test('off-grid committed minute is inserted honestly, sorted', () => {
  const values = buildMinuteWheelValues(3);
  assertEqual(values[0], 0, 'starts at 0');
  assertEqual(values.indexOf(3), 1, '03 sits between 00 and 05');
  assertEqual(values.length, 13, '12 grid values + the exact one');
  const values59 = buildMinuteWheelValues(59);
  assertEqual(values59[values59.length - 1], 59, '59 sits at the end');
});

test('invalid or missing minute falls back to the grid', () => {
  assertEqual(buildMinuteWheelValues(null), MINUTE_WHEEL_GRID, 'null');
  assertEqual(buildMinuteWheelValues(undefined), MINUTE_WHEEL_GRID, 'undefined');
  assertEqual(buildMinuteWheelValues(Number.NaN), MINUTE_WHEEL_GRID, 'NaN');
  assertEqual(buildMinuteWheelValues(60), MINUTE_WHEEL_GRID, 'out of range high');
  assertEqual(buildMinuteWheelValues(-1), MINUTE_WHEEL_GRID, 'out of range low');
});

test('returned arrays are fresh copies (mutation-safe)', () => {
  const first = buildMinuteWheelValues(0);
  first.push(99);
  const second = buildMinuteWheelValues(0);
  assertTrue(!second.includes(99), 'grid constant is not shared mutable state');
});

// --- summary ---

console.log(`\nplanner_v1_datetime_primitives_tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
