/**
 * Time wheel pure helpers (Phase 1 — Slice 1.2).
 *
 * The minute wheel snaps to the 5-minute grid, but a committed value that is
 * off-grid (e.g. 09:03 coming from a materialized series) must be represented
 * honestly on open instead of being silently rounded: the wheel inserts the
 * exact minute into its values so the visual selection matches the draft, and
 * the first real interaction returns to the grid.
 */

export const MINUTE_WHEEL_STEP = 5;
export const MINUTE_WHEEL_GRID = Array.from({ length: 60 / MINUTE_WHEEL_STEP }, (_, index) => index * MINUTE_WHEEL_STEP);

export function buildMinuteWheelValues(committedMinute: number | null | undefined): number[] {
  const valid = Number.isInteger(committedMinute)
    && committedMinute !== null
    && committedMinute !== undefined
    && committedMinute >= 0
    && committedMinute < 60;
  if (!valid) return [...MINUTE_WHEEL_GRID];
  const minute = committedMinute as number;
  if (minute % MINUTE_WHEEL_STEP === 0) return [...MINUTE_WHEEL_GRID];
  return [...MINUTE_WHEEL_GRID, minute].sort((a, b) => a - b);
}
