'use strict';

const PLANNER_FEATURE_FLAGS = Object.freeze([
  Object.freeze({
    key: 'planner.search_entry',
    description: 'Controls the future Planner Search entry point without exposing Search functionality.',
    owner: 'planner',
    defaultValue: false,
    exposure: 'client_visible',
    expiresAt: null,
  }),
]);

module.exports = { PLANNER_FEATURE_FLAGS };
