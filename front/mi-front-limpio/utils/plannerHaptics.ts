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

export type PlannerHapticCategory =
  | 'selection'
  | 'action'
  | 'success'
  | 'warning'
  | 'error';

/** Per-category debounce window (ms). */
const HAPTIC_DEBOUNCE_MS = 120;

const lastEmittedByCategory: Record<PlannerHapticCategory, number> = {
  selection: 0,
  action: 0,
  success: 0,
  warning: 0,
  error: 0,
};

function emit(category: PlannerHapticCategory, run: () => Promise<void>): void {
  const now = Date.now();
  if (now - lastEmittedByCategory[category] < HAPTIC_DEBOUNCE_MS) return;
  lastEmittedByCategory[category] = now;
  void run().catch(() => {
    // Haptics are optional feedback; unsupported devices continue silently.
  });
}

export function selectionHaptic(): void {
  emit('selection', () => Haptics.selectionAsync());
}

export function actionHaptic(): void {
  emit('action', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function successHaptic(): void {
  emit('success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningHaptic(): void {
  emit('warning', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function errorHaptic(): void {
  emit('error', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
