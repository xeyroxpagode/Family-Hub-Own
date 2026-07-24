'use strict';

/**
 * Planner compatibility adapter.
 *
 * Header validation is owned by HomePlus Core (`mutationContracts`). Planner
 * keeps only the endpoint policy choosing CREATE_IDEMPOTENT versus
 * VERSIONED_MUTATION. Remove this adapter once Planner controllers consume
 * `requireMutationContract` directly.
 */
const core = require('./mutationContracts');

const PLANNER_MUTATION_POLICIES = Object.freeze({
  create: core.OPERATION_POLICIES[core.OPERATION_KINDS.CREATE_IDEMPOTENT],
  existingEntity: core.OPERATION_POLICIES[core.OPERATION_KINDS.VERSIONED_MUTATION],
});

const V2_CANONICAL_ERROR_CODES = core.CANONICAL_ERROR_CODES;

module.exports = {
  ...core,
  PLANNER_MUTATION_POLICIES,
  V2_CANONICAL_ERROR_CODES,
  sanitizeMutationId: core.sanitizeCorrelationId,
  assertRequiredExpectedVersionMatches: core.assertExpectedVersionMatches,
};
