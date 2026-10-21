'use strict';

// Planner feature flags.
//
// `planner.search_entry` REMAINS REGISTERED because HomePlus Core owns the flag
// registry, the persisted `feature_flag_overrides` allowlist and the Core
// contract suites that assert this key; removing it would be a Core change, not
// a Planner one.
//
// What changed in this closure is the PRODUCT USE of the flag: Planner Search is
// a required V1 capability (backend route, canonical reader and a registered
// screen all exist), so gating its entry behind this off-by-default flag made a
// live feature UNREACHABLE, which frozen §41 classifies as not-PASS. The entry
// is therefore governed by the canonical `planner.search` capability alone; see
// front/mi-front-limpio/services/planner/plannerSearchAccess.ts.
//
// Existing unrelated flags elsewhere in the app remain untouched.
const PLANNER_FEATURE_FLAGS = Object.freeze([
  Object.freeze({
    key: 'planner.search_entry',
    description: 'Reserved Core flag key. Planner Search entry is no longer gated by it: Search is a required V1 capability and an off-by-default gate would make it unreachable (frozen §41).',
    owner: 'planner',
    defaultValue: false,
    exposure: 'client_visible',
    expiresAt: null,
  }),
]);

module.exports = { PLANNER_FEATURE_FLAGS };

module.exports = { PLANNER_FEATURE_FLAGS };
