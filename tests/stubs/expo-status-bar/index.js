'use strict';

// Test stub for `expo-status-bar`.
//
// `StatusBar` is a presentation-only primitive; compiled Planner suites only need
// it to resolve at import time.

const StatusBar = () => null;
StatusBar.hidden = false;
StatusBar.setHidden = async () => {};
StatusBar.setStyle = async () => {};
StatusBar.setBackgroundColor = async () => {};
StatusBar.setBarStyle = async () => {};

module.exports = { StatusBar };
module.exports.default = { StatusBar };
