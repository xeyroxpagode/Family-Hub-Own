/**
 * Shared motion system — Premium UX vocabulary.
 *
 * The numeric authority lives in the single shared `MOTION` token object
 * (`constants/theme.ts` → `MOTION.premium`). This module only exposes the
 * EASING curves and the small helpers that the UI primitives need, so the app
 * never grows a second, parallel motion theme.
 *
 * Contract source: `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md`
 * §6 MOTION CONTRACT and §7 REDUCED MOTION.
 */
import { Easing } from 'react-native';

import { MOTION } from './theme';

/** Duration tokens of the Premium UX system, in milliseconds. */
export const PREMIUM_MOTION = MOTION.premium;

/**
 * The three curves of the contract.
 * - `standardOut` for entrances.
 * - `standardInOut` for state transitions that go both ways.
 * - `direct` for finger-driven tracking (linear, no easing lag).
 */
export const MOTION_CURVES = {
  standardOut: Easing.out(Easing.cubic),
  standardInOut: Easing.inOut(Easing.cubic),
  direct: Easing.linear,
} as const;

export type MotionCurve = keyof typeof MOTION_CURVES;

/**
 * Resolve a duration under Reduced Motion.
 *
 * Reduced Motion keeps the transition alive but short (contract target
 * ~90-130 ms). `0` is never returned implicitly: a fade to a different
 * opacity still needs a frame to be perceived as a fade.
 */
export function resolveMotionDuration(reducedMotion: boolean, durationMs: number): number {
  if (!reducedMotion) return durationMs;
  return Math.min(durationMs, PREMIUM_MOTION.reduced);
}

/** Resolve a curve by name, with a safe fallback. */
export function resolveMotionCurve(curve: MotionCurve) {
  return MOTION_CURVES[curve] ?? MOTION_CURVES.standardOut;
}
