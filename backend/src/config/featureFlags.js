'use strict';

const { createFeatureFlagRegistry } = require('../lib/featureFlagRegistry');
const { PLANNER_FEATURE_FLAGS } = require('../constants/plannerFeatureFlags');

const featureFlagRegistry = createFeatureFlagRegistry();

// Composition root: domains register policy in the reusable Core mechanism.
featureFlagRegistry.register(PLANNER_FEATURE_FLAGS);

module.exports = { featureFlagRegistry };
