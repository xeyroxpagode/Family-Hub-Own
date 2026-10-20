'use strict';

/**
 * HomePlus Homi Tool Layer — public foundation surface.
 *
 * This slice exposes the Tool Contract v1 primitives and the Tool Registry
 * constructor only. It intentionally registers no business tool: the
 * production registry starts empty.
 */

const toolContract = require('./toolContract');
const toolRegistry = require('./toolRegistry');

module.exports = {
  HOMI_TOOL_CONTRACT_VERSION: toolContract.HOMI_TOOL_CONTRACT_VERSION,
  TOOL_KINDS: toolContract.TOOL_KINDS,
  TOOL_RISK_FLAGS: toolContract.TOOL_RISK_FLAGS,
  TOOL_CONFIRMATION: toolContract.TOOL_CONFIRMATION,
  TOOL_DEFINITION_FIELDS: toolContract.TOOL_DEFINITION_FIELDS,
  TOOL_ID_PATTERN: toolContract.TOOL_ID_PATTERN,
  VERSION_PATTERN: toolContract.VERSION_PATTERN,
  MAX_DESCRIPTION_LENGTH: toolContract.MAX_DESCRIPTION_LENGTH,
  HOMI_TOOL_DEFINITION_INVALID: toolContract.HOMI_TOOL_DEFINITION_INVALID,
  HomiToolError: toolContract.HomiToolError,
  validateToolDefinition: toolContract.validateToolDefinition,
  normalizeToolDefinition: toolContract.normalizeToolDefinition,
  HOMI_TOOL_DUPLICATE: toolRegistry.HOMI_TOOL_DUPLICATE,
  HomiToolRegistry: toolRegistry.HomiToolRegistry,
  createHomiToolRegistry: toolRegistry.createHomiToolRegistry,
};
