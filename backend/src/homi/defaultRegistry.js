'use strict';

/**
 * HomePlus Homi Tool Layer — production default tool registry (T07-S3).
 *
 * Pure metadata module. It builds a registry instance and loads the
 * canonical tool catalog into it. It imports no route, no controller, no
 * business operation module, no HTTP client and no database driver, and it
 * declares no execution, binding or dispatch entry point.
 *
 * The factory returns a fresh registry on every call: there is no global
 * mutable singleton, so two callers never share mutable state.
 */

const { HomiToolRegistry } = require('./toolRegistry');
const { PLANNER_READ_TOOL_DEFINITIONS } = require('./tools/plannerReadTools');

/**
 * Build the production Homi tool registry.
 *
 * The registry holds exactly the canonical production catalog of this slice
 * (eight READ-only Planner tools). Registration validates and canonicalizes
 * every definition, so the returned registry only ever exposes immutable
 * tool definitions.
 *
 * @returns {HomiToolRegistry} a new registry holding the production catalog
 */
function createDefaultHomiToolRegistry() {
  const registry = new HomiToolRegistry();

  for (const definition of PLANNER_READ_TOOL_DEFINITIONS) {
    registry.register(definition);
  }

  return registry;
}

module.exports = {
  createDefaultHomiToolRegistry,
};
