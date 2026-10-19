'use strict';

// Test stub for `expo-haptics`.
//
// Haptics are optional UI feedback in HOMePLUS (`utils/haptics.ts` swallows
// every failure), so the compiled Planner suites only need the module to
// resolve at import time. This stub mirrors the real API surface with inert
// no-ops.

exports.ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Rigid: 'rigid',
  Soft: 'soft',
};

exports.NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

const noop = async () => {};

exports.impactAsync = noop;
exports.impactAsyncWithOptions = noop;
exports.notificationAsync = noop;
exports.notificationAsyncWithOptions = noop;
exports.selectionAsync = noop;
exports.impactAsyncByPattern = noop;
