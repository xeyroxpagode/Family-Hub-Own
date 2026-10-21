/**
 * Planner semantic haptics — Figma V1.1 §51 (frozen contract).
 *
 * Five categories, no more, no renames:
 * - selection: choosing a value (menu option, filter, day, toggle)
 * - action: a mutation with consequence (take, complete, create, resend)
 * - success: resolution of someone else's cycle (verify, restore)
 * - warning: destructive confirmation or discarding unsaved work
 * - error: a consequential mutation failed
 *
 * Non-negotiable rules:
 * - a haptic NEVER replaces visual feedback;
 * - navigation, overlay open/close, scroll, ordinary taps and back never vibrate;
 * - per-category debounce of 120 ms (five rapid taps on one menu = one
 *   `selection`; five separate completions = five `action`).
 *
 * Prototype patterns/durations are PROTOTYPE MECHANIC ONLY: here each category
 * maps to the closest native Expo Haptics primitive.
 */

import * as Haptics from 'expo-haptics';

import { hapticAction, hapticIntent } from './haptics';

export type PlannerHapticCategory =
  | 'selection'
  | 'action'
  | 'success'
  | 'warning'
  | 'error';

/**
 * Planner categories delegate to the shared semantic haptic contract
 * (`utils/haptics.ts`). The Planner vocabulary and its frozen meanings are
 * preserved; only the emission point moved to the shared authority.
 */
export function selectionHaptic(): void {
  hapticIntent('selection');
}

export function actionHaptic(): void {
  hapticAction();
}

export function successHaptic(): void {
  hapticIntent('success');
}

export function warningHaptic(): void {
  hapticIntent('warning');
}

export function errorHaptic(): void {
  hapticIntent('error');
}
