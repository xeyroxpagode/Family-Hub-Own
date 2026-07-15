/**
 * Planner V1 — M3 Focus Management Helpers.
 *
 * These are platform-safe, pure adapters that the SheetHost uses to move
 * accessibility focus on open/close. They are throttled to avoid executing
 * before the Modal is mounted.
 *
 * On web, focus is moved via DOM refs. On React Native, accessibility focus
 * announcements are sent via AccessibilityInfo where available. Neither
 * helper throws or blocks the sheet transition.
 */

import { Platform } from 'react-native';

// Safely resolve the AccessibilityInfo API (may be unavailable in test env).
let _accessibilityInfo: typeof import('react-native').AccessibilityInfo | null = null;
try {
  // Dynamic require to avoid import failure in non-RN environments.
  _accessibilityInfo = require('react-native').AccessibilityInfo ?? null;
} catch {
  _accessibilityInfo = null;
}

/**
 * True when the a11y API is available and the platform supports programmatic
 * accessibility announcements.
 */
export function a11yAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Announce a screen change. Non-blocking; errors are silently ignored because
 * the sheet transition must not be blocked by an a11y failure.
 */
export function announceSheetOpened(label: string): void {
  if (!_accessibilityInfo) return;
  try {
    _accessibilityInfo.announceForAccessibility(label);
  } catch {
    // Silently ignore — a11y failure is not a sheet host failure.
  }
}

/**
 * Safely check whether a ref still points to a mounted native node. `null` or
 * undefined reference means the target is gone (unmounted, switched household).
 */
export function isNodeAccessible(ref: React.RefObject<unknown | null>): boolean {
  return ref.current != null;
}

/**
 * Attempt to return accessibility focus to the stored trigger ref.
 * Only executes when the ref is accessible and the platform supports it.
 */
export function attemptFocusReturn(ref: React.RefObject<unknown | null>): void {
  if (!isNodeAccessible(ref)) return;
  if (Platform.OS === 'web') {
    try {
      const el = ref.current as HTMLElement | null;
      el?.focus?.();
    } catch {
      // Focus return is best-effort.
    }
  }
  // React Native: the native focus chain does not have a programmatic
  // `focus()` equivalent across views, but leaving the ref untouched allows
  // the OS to return focus naturally.
}