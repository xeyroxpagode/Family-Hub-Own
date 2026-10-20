'use strict';

/**
 * HomePlus Homi Tool Layer — executable tool bindings (T07-S4).
 *
 * The tool registry of T07-S1/S3 is metadata only: it stores validated tool
 * definitions and it never executes anything. This module owns the separate
 * executable side of the layer: a plain map of tool id to handler.
 *
 * The two concerns stay separate on purpose:
 *   - a tool definition never carries a handler, an executor, a service or a
 *     route;
 *   - a binding never invents a tool definition.
 *
 * The invariant of this slice is:
 *
 *     registered READ tools == executable bindings
 *
 * @see toolExecutor.js for the execution order that consumes a binding.
 */

const { createPlannerReadHandlers } = require('./tools/plannerReadHandlers');

const HOMI_TOOL_BINDING_MISSING = 'HOMI_TOOL_BINDING_MISSING';

/**
 * Stable internal error type for a missing executable binding.
 */
class HomiBindingError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'HomiBindingError';
    this.code = code;
    this.details = Object.freeze({ ...(details || {}) });
  }
}

/**
 * Build a frozen binding map.
 *
 * @param {object} handlers the map of tool id to handler
 * @returns {object} the frozen binding map
 */
function createToolBindings(handlers) {
  if (!handlers || typeof handlers !== 'object' || Array.isArray(handlers)) {
    throw new TypeError('Tool bindings must be a plain object of tool id to handler.');
  }

  const bindings = {};

  for (const toolId of Object.keys(handlers)) {
    if (typeof handlers[toolId] !== 'function') {
      throw new TypeError(`The binding of "${toolId}" must be a function.`);
    }
    bindings[toolId] = handlers[toolId];
  }

  return Object.freeze(bindings);
}

/**
 * The production binding map of this slice.
 *
 * It holds exactly one handler for each one of the eight registered Planner
 * READ tools.
 */
const TOOL_BINDINGS = createToolBindings(createPlannerReadHandlers());

/**
 * @param {unknown} toolId the canonical tool id
 * @returns {Function|null} the bound handler or null when there is none
 */
function getToolBinding(toolId) {
  if (typeof toolId !== 'string') return null;

  const handler = TOOL_BINDINGS[toolId];
  return typeof handler === 'function' ? handler : null;
}

/**
 * @returns {string[]} every bound tool id, sorted
 */
function listBoundToolIds() {
  return Object.keys(TOOL_BINDINGS).sort();
}

/**
 * Resolve a binding or fail with the canonical internal code.
 *
 * @param {unknown} toolId the canonical tool id
 * @returns {Function} the bound handler
 * @throws {HomiBindingError} HOMI_TOOL_BINDING_MISSING
 */
function requireToolBinding(toolId) {
  const handler = getToolBinding(toolId);

  if (!handler) {
    throw new HomiBindingError(
      HOMI_TOOL_BINDING_MISSING,
      'The requested tool has no executable binding.',
      { toolId: typeof toolId === 'string' ? toolId : null }
    );
  }

  return handler;
}

module.exports = {
  HOMI_TOOL_BINDING_MISSING,
  HomiBindingError,
  TOOL_BINDINGS,
  createToolBindings,
  getToolBinding,
  listBoundToolIds,
  requireToolBinding,
};
