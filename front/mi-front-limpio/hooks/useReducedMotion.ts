import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let initialized = false;
let systemReducedMotion = false;
/**
 * DEV-ONLY override of the reduced-motion state.
 *
 * It exists so the QA harness can exercise the reduced-motion contract
 * without asking the tester to change the OS setting. It is `null` in
 * production, where the system value is the only authority.
 */
let devOverride: boolean | null = null;
const listeners = new Set<() => void>();

function currentValue(): boolean {
  return devOverride ?? systemReducedMotion;
}

function publish(): void {
  listeners.forEach((listener) => listener());
}

function ensureReducedMotionSubscription(): void {
  if (initialized) return;
  initialized = true;
  void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
    systemReducedMotion = enabled;
    publish();
  });
  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    systemReducedMotion = enabled;
    publish();
  });
}

/** One native listener, exposed as a dynamic app-wide external store. */
export function useReducedMotion(): boolean {
  ensureReducedMotionSubscription();
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => currentValue(),
    () => false,
  );
}

/**
 * Force the reduced-motion state. DEV-ONLY: it exists for the Premium UX QA
 * harness so the reduced-motion contract can be tested physically without
 * touching the device settings.
 */
export function setReducedMotionOverride(value: boolean | null): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  devOverride = value;
  publish();
}

/** Current reduced-motion state, honouring the DEV override. */
export function getReducedMotionOverride(): boolean | null {
  return devOverride;
}
