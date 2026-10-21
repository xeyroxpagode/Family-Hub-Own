import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let initialized = false;
let reducedMotion = false;
const listeners = new Set<() => void>();

function publish(enabled: boolean): void {
  if (enabled === reducedMotion) return;
  reducedMotion = enabled;
  listeners.forEach((listener) => listener());
}

function ensureReducedMotionSubscription(): void {
  if (initialized) return;
  initialized = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(publish);
  AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
}

/** One native listener, exposed as a dynamic app-wide external store. */
export function useReducedMotion(): boolean {
  ensureReducedMotionSubscription();
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => reducedMotion,
    () => false,
  );
}
