'use strict';

/**
 * HomePlus Homi Tool Layer — deterministic in-process Tool Registry.
 *
 * Pure foundation module. The registry only stores validated, canonical tool
 * definitions. It never executes a tool, it owns no handler map, and it has no
 * dependency on any HTTP framework, data layer or business service.
 */

const {
  HomiToolError,
  HOMI_TOOL_DEFINITION_INVALID,
  normalizeToolDefinition,
} = require('./toolContract');

const HOMI_TOOL_DUPLICATE = 'HOMI_TOOL_DUPLICATE';

class HomiToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  /**
   * Validate, normalize and store a tool definition.
   *
   * @param {unknown} definition candidate tool definition
   * @returns {object} the canonical stored definition
   * @throws {HomiToolError} HOMI_TOOL_DEFINITION_INVALID / HOMI_TOOL_DUPLICATE
   */
  register(definition) {
    const normalized = normalizeToolDefinition(definition);

    if (this._tools.has(normalized.id)) {
      throw new HomiToolError(
        HOMI_TOOL_DUPLICATE,
        `Homi tool already registered: ${normalized.id}`,
        { toolId: normalized.id }
      );
    }

    this._tools.set(normalized.id, normalized);
    return normalized;
  }

  /**
   * @param {unknown} toolId canonical tool id
   * @returns {object|null} the canonical definition or null when unknown
   */
  get(toolId) {
    if (typeof toolId !== 'string') return null;
    const found = this._tools.get(toolId);
    return found === undefined ? null : found;
  }

  /**
   * @param {unknown} toolId canonical tool id
   * @returns {boolean} whether the tool id is registered
   */
  has(toolId) {
    if (typeof toolId !== 'string') return false;
    return this._tools.has(toolId);
  }

  /**
   * @returns {object[]} canonical definitions sorted lexicographically by id
   */
  list() {
    return Array.from(this._tools.values()).sort((left, right) => {
      if (left.id < right.id) return -1;
      if (left.id > right.id) return 1;
      return 0;
    });
  }

  /**
   * @returns {number} exact registry count
   */
  get size() {
    return this._tools.size;
  }
}

/**
 * @returns {HomiToolRegistry} a new empty registry
 */
function createHomiToolRegistry() {
  return new HomiToolRegistry();
}

module.exports = {
  HOMI_TOOL_DUPLICATE,
  HOMI_TOOL_DEFINITION_INVALID,
  HomiToolError,
  HomiToolRegistry,
  createHomiToolRegistry,
};
