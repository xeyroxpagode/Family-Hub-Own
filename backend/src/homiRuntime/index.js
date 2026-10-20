'use strict';

/**
 * HomePlus Homi Tool Layer — executable runtime surface (T07-S4).
 *
 * This facade exposes the executable side of the Homi Tool Layer. The
 * metadata side (tool contract, tool registry and the production tool
 * definitions) stays in `backend/src/homi/`, which is metadata only.
 *
 * The separation is deliberate:
 *   - `backend/src/homi/`             metadata and context boundary;
 *   - `backend/src/homiRuntime/`      validation, binding, execution;
 *   - `backend/src/controllers|route` the HTTP transport.
 */

const argumentValidator = require('./argumentValidator');
const toolBindings = require('./toolBindings');
const toolExecutor = require('./toolExecutor');
const observability = require('./observability');
const plannerReadHandlers = require('./tools/plannerReadHandlers');

module.exports = {
  HOMI_TOOL_ARGUMENT_INVALID: argumentValidator.HOMI_TOOL_ARGUMENT_INVALID,
  HomiArgumentError: argumentValidator.HomiArgumentError,
  validateToolArguments: argumentValidator.validateToolArguments,
  HOMI_TOOL_BINDING_MISSING: toolBindings.HOMI_TOOL_BINDING_MISSING,
  HomiBindingError: toolBindings.HomiBindingError,
  TOOL_BINDINGS: toolBindings.TOOL_BINDINGS,
  createToolBindings: toolBindings.createToolBindings,
  getToolBinding: toolBindings.getToolBinding,
  listBoundToolIds: toolBindings.listBoundToolIds,
  requireToolBinding: toolBindings.requireToolBinding,
  HOMI_TOOL_NOT_FOUND: toolExecutor.HOMI_TOOL_NOT_FOUND,
  HOMI_TOOL_NOT_READ: toolExecutor.HOMI_TOOL_NOT_READ,
  HOMI_TOOL_EXECUTION_FAILED: toolExecutor.HOMI_TOOL_EXECUTION_FAILED,
  HOMI_ERROR_STATUS: toolExecutor.HOMI_ERROR_STATUS,
  HomiToolExecutionError: toolExecutor.HomiToolExecutionError,
  createHomiToolExecutor: toolExecutor.createHomiToolExecutor,
  executeHomiTool: toolExecutor.executeHomiTool,
  HOMI_TOOL_STARTED: observability.HOMI_TOOL_STARTED,
  HOMI_TOOL_SUCCEEDED: observability.HOMI_TOOL_SUCCEEDED,
  HOMI_TOOL_FAILED: observability.HOMI_TOOL_FAILED,
  createHomiObservability: observability.createHomiObservability,
  homiObservability: observability.homiObservability,
  createPlannerReadHandlers: plannerReadHandlers.createPlannerReadHandlers,
};
