'use strict';

// Haptics are feedback, not behaviour under test: every entry point resolves
// immediately so no test has to await a native call.

module.exports = {
  selectionAsync: async () => {},
  impactAsync: async () => {},
  notificationAsync: async () => {},
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
};