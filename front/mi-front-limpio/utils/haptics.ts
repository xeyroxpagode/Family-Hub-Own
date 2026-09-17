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

export const authSuccessHaptic = () =>
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const authErrorHaptic = () =>
  runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
