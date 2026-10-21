/**
 * Shared bottom-sheet detent model — pure, React-free.
 *
 * Everything the interactive sheet needs to decide — which detents exist, where
 * a released drag lands, how far the sheet may travel past its limits, whether
 * a release is a dismissal, and which detent the keyboard forces — is resolved
 * here so the decisions are unit-testable without a renderer.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §4.
 *
 * Geometry convention: a detent is the HEIGHT of the sheet measured from the
 * bottom of the viewport, in pixels. `near-full` is derived from the safe area,
 * never hardcoded.
 */

/** The three presets of the single canonical sheet primitive. */
export type SheetDetentPreset = 'compact' | 'standard' | 'flow';

/** Fraction of the viewport used by each preset, before the near-full detent. */
export const SHEET_DETENT_FRACTIONS: Record<SheetDetentPreset, readonly number[]> = {
  // natural/min ~30-35%, medium ~55-60%
  compact: [0.32, 0.58],
  // ~45-50%, ~70-75%, optional near-full
  standard: [0.48, 0.72],
  // ~70-75%, near-full
  flow: [0.74],
};

/** Separation kept between the near-full detent and the safe-area top. */
export const NEAR_FULL_TOP_GAP = 12;

/** Rubber-band resistance constant (iOS-like). */
export const RUBBER_BAND_COEFFICIENT = 0.55;

/**
 * Minimum usable height of the sheet viewport when the keyboard is open.
 * Below this the sheet is promoted to a larger detent instead of collapsing.
 */
export const KEYBOARD_MIN_USABLE_HEIGHT = 240;

/**
 * Velocity (px/ms) that decides the detent on its own when the finger stops.
 */
export const DETENT_SETTLE_VELOCITY = 0.25;

/**
 * Build the detent heights for a preset.
 *
 * `nearFull` is `viewport - safeAreaTop - NEAR_FULL_TOP_GAP`: the sheet never
 * invades the unsafe top area.
 */
export function resolveSheetDetents(
  preset: SheetDetentPreset,
  viewportHeight: number,
  safeAreaTop: number,
): number[] {
  const fractions = SHEET_DETENT_FRACTIONS[preset] ?? SHEET_DETENT_FRACTIONS.standard;
  const nearFull = Math.max(0, viewportHeight - safeAreaTop - NEAR_FULL_TOP_GAP);
  const heights = fractions.map((fraction) => Math.round(viewportHeight * fraction));
  if (preset === 'standard' || preset === 'flow') heights.push(Math.round(nearFull));
  return [...new Set(heights)].sort((a, b) => a - b);
}

/**
 * Select the resting detent after a released drag.
 *
 * Position AND direction AND velocity decide: a fast flick travels to the
 * neighbouring detent even if the finger barely moved, while a slow release
 * settles on the closest detent.
 */
export function resolveSettledDetentIndex(input: {
  readonly detents: readonly number[];
  readonly currentHeight: number;
  /** Gesture velocity in px/ms. Negative is upward (bigger sheet). */
  readonly velocity?: number;
}): number {
  const { detents, currentHeight, velocity = 0 } = input;
  if (detents.length === 0) return 0;
  if (detents.length === 1) return 0;

  const velocityThreshold = DETENT_SETTLE_VELOCITY;
  if (Math.abs(velocity) >= velocityThreshold) {
    const goingUp = velocity < 0;
    const index = closestDetentIndex(detents, currentHeight);
    if (goingUp) return Math.min(detents.length - 1, index + 1);
    return Math.max(0, index - 1);
  }

  return closestDetentIndex(detents, currentHeight);
}

/** Index of the detent whose height is closest to `height`. */
export function closestDetentIndex(detents: readonly number[], height: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  detents.forEach((detent, index) => {
    const distance = Math.abs(detent - height);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/**
 * Rubber-band resistance for a travel that goes past a limit.
 *
 * The resistance grows with the overflow, so the sheet never feels free at
 * the edge, and the caller can clamp the result to the unsafe area.
 */
export function applyRubberBand(overflow: number, dimension: number): number {
  if (overflow === 0) return 0;
  const sign = overflow < 0 ? -1 : 1;
  const magnitude = Math.abs(overflow);
  const resisted =
    (magnitude * dimension * RUBBER_BAND_COEFFICIENT) /
    (dimension + RUBBER_BAND_COEFFICIENT * magnitude);
  return sign * resisted;
}

/**
 * Resolve a released drag that went BELOW the smallest detent.
 *
 * A dismissal needs the sheet to travel past the minimum detent by a
 * meaningful distance, or a fast flick. Otherwise the sheet snaps back.
 */
export function resolveDismissIntent(input: {
  readonly detents: readonly number[];
  readonly currentHeight: number;
  /** Downward travel in px. */
  readonly travel: number;
  /** Release velocity in px/ms. Positive is downward. */
  readonly velocity: number;
  readonly minTravelRatio?: number;
  readonly minTravelPx?: number;
  readonly velocityThreshold?: number;
}): 'dismiss' | 'snap-back' {
  const {
    detents,
    currentHeight,
    travel,
    velocity,
    minTravelRatio = 0.22,
    minTravelPx = 88,
    velocityThreshold = 0.55,
  } = input;
  const minimum = detents.length > 0 ? Math.min(...detents) : 0;
  if (currentHeight > minimum) return 'snap-back';
  if (travel <= 0) return 'snap-back';

  const distanceThreshold = Math.max(minTravelPx, minimum * minTravelRatio);
  if (travel >= distanceThreshold) return 'dismiss';
  if (travel >= 24 && velocity >= velocityThreshold) return 'dismiss';
  return 'snap-back';
}

/**
 * Detent the sheet must occupy while the keyboard is open.
 *
 * The top anchor of the sheet must stay stable, so the keyboard does NOT move
 * the sheet: it shrinks the usable viewport. When that viewport would become
 * unusable, the sheet is PROMOTED to the next detent.
 */
export function resolveKeyboardDetentIndex(input: {
  readonly detents: readonly number[];
  readonly currentIndex: number;
  readonly keyboardInset: number;
  readonly minUsableHeight?: number;
}): number {
  const { detents, currentIndex, keyboardInset, minUsableHeight = KEYBOARD_MIN_USABLE_HEIGHT } = input;
  if (keyboardInset <= 0 || detents.length === 0) return currentIndex;
  let index = Math.min(Math.max(0, currentIndex), detents.length - 1);
  while (index < detents.length - 1 && detents[index] - keyboardInset < minUsableHeight) {
    index += 1;
  }
  return index;
}

/** Usable height of the sheet viewport once the keyboard is taken into account. */
export function resolveUsableViewportHeight(
  detentHeight: number,
  keyboardInset: number,
): number {
  return Math.max(0, detentHeight - keyboardInset);
}
