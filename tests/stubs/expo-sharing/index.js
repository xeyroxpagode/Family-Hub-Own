'use strict';

/**
 * Node stub for `expo-sharing`.
 *
 * Only the import-time surface the HomeCloud download/export modules touch, so the
 * REAL Viewer can be mounted in plain Node without a device.
 *
 * `shareAsync` records the hand-off instead of opening a native sheet. It resolves
 * when the "sheet" is dismissed and reports NOTHING about what the member chose -
 * which is exactly what the real primitive does, and why no caller may claim a
 * completed save. Tests assert on `__testOnly.handoffs`.
 */

const handoffs = [];

exports.isAvailableAsync = async function isAvailableAsync() {
  return true;
};

exports.shareAsync = async function shareAsync(uri, options) {
  handoffs.push({ uri, options: options ?? null });
};

exports.__testOnly = {
  handoffs,
  reset() {
    handoffs.length = 0;
  },
};