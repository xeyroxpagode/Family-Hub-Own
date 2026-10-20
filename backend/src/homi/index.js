'use strict';

/**
 * HomePlus Homi Tool Layer — public foundation surface.
 *
 * This slice exposes the Tool Contract v1 primitives, the Tool Registry
 * constructor, the authoritative Homi context boundary and the factory of
 * the production default tool registry.
 *
 * The generic registry factory stays empty on purpose: it is the neutral
 * constructor of the foundation. The production business catalog lives in
 * the default registry module and is reached through its own factory.
 */

const toolContract = require('./toolContract');
const toolRegistry = require('./toolRegistry');
const contextContract = require('./contextContract');
const contextResolver = require('./contextResolver');
const defaultRegistry = require('./defaultRegistry');

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
  createDefaultHomiToolRegistry: defaultRegistry.createDefaultHomiToolRegistry,
  HOMI_CONTEXT_FIELDS: contextContract.HOMI_CONTEXT_FIELDS,
  HOMI_CLAIM_FIELDS: contextContract.HOMI_CLAIM_FIELDS,
  HOMI_AUTH_CONTEXT_INVALID: contextContract.HOMI_AUTH_CONTEXT_INVALID,
  HOMI_CONTEXT_UNAVAILABLE: contextContract.HOMI_CONTEXT_UNAVAILABLE,
  HOMI_CONTEXT_MISMATCH: contextContract.HOMI_CONTEXT_MISMATCH,
  HOMI_CLAIM_INVALID: contextContract.HOMI_CLAIM_INVALID,
  HomiContextError: contextContract.HomiContextError,
  validateHomiIdentityClaims: contextContract.validateHomiIdentityClaims,
  createHomiContextResolver: contextResolver.createHomiContextResolver,
  createHomiExecutionContextResolver: contextResolver.createHomiExecutionContextResolver,
  defaultResolveHomePlusContext: contextResolver.defaultResolveHomePlusContext,
  resolveHomiContext: contextResolver.resolveHomiContext,
  resolveHomiExecutionContext: contextResolver.resolveHomiExecutionContext,
};
