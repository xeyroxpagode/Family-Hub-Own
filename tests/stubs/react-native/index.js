'use strict';

exports.Platform = {
  OS: 'web',
  select(values) {
    return values.web ?? values.default;
  },
};

// The app lifecycle primitive. It is deliberately inert: a node host has no
// foreground to return to, so it reports `active` and never emits a change.
exports.AppState = {
  currentState: 'active',
  addEventListener() {
    return { remove() {} };
  },
};