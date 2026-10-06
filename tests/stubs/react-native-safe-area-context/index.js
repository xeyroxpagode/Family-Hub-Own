'use strict';

/**
 * `react-native-safe-area-context` — the app's safe-area source.
 *
 * Every suite that mounts a surface needing system bars reads through this stub, which
 * reports a zero-inset device. A suite that cares about notches installs its OWN insets
 * so the claim is made against a known geometry rather than against "no notch", which
 * would pass for the wrong reason.
 */
module.exports = {
  SafeAreaProvider: 'SafeAreaProvider',
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  initialWindowMetrics: { insets: { top: 0, bottom: 0, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } },
  SafeAreaInsetsContext: { Provider: 'SafeAreaInsetsContext', Consumer: 'SafeAreaInsetsContext' },
};
