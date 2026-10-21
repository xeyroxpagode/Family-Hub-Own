import * as Haptics from 'expo-haptics';

const runHaptic = async (callback: () => Promise<void>) => {
  try {
    await callback();
  } catch {
    // Haptics are optional UI feedback. Unsupported devices should continue silently.
  }
};

export const lightHaptic = () =>
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const mediumHaptic = () =>
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

export const heavyHaptic = () =>
  runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

export const authSuccessHaptic = () =>
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const authErrorHaptic = () =>
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

export const successHaptic = authSuccessHaptic;
export const errorHaptic = authErrorHaptic;

/**
 * Shared semantic haptic contract.
 *
 * The app declares INTENT here, never a raw device call at the call site.
 * The frozen minimum vocabulary is:
 *
 *   none | selection | light | success | warning | error
 *
 * There is NO haptic by default for a normal button, Back, Search, opening a
 * sheet, scrolling or closing a sheet. Those surfaces simply do not declare an
 * intent.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §8.
 */
export type HapticIntent = 'none' | 'selection' | 'light' | 'success' | 'warning' | 'error';

/** Per-intent debounce window (ms). Five rapid selections are one buzz. */
const HAPTIC_DEBOUNCE_MS = 120;

const lastEmittedByKey = new Map<string, number>();

function emit(key: string, run: () => Promise<void>): void {
  const now = Date.now();
  const last = lastEmittedByKey.get(key) ?? 0;
  if (now - last < HAPTIC_DEBOUNCE_MS) return;
  lastEmittedByKey.set(key, now);
  void run().catch(() => {
    // Haptics are optional feedback; unsupported devices continue silently.
  });
}

/** Emit a haptic by semantic intent. `none` is a no-op by contract. */
export function hapticIntent(intent: HapticIntent): void {
  switch (intent) {
    case 'none':
      return;
    case 'selection':
      emit('selection', () => Haptics.selectionAsync());
      return;
    case 'light':
      emit('light', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      return;
    case 'success':
      emit('success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      return;
    case 'warning':
      emit('warning', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      return;
    case 'error':
      emit('error', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      return;
    default:
      return;
  }
}

/**
 * Medium impact for a mutation with consequences (Planner `action` category).
 * Kept separate from the frozen minimum vocabulary on purpose: `action` is a
 * Planner semantic, not an Inventory one.
 */
export function hapticAction(): void {
  emit('action', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}
