'use strict';

/**
 * HomePlus Homi Tool Layer — authoritative context resolver.
 *
 * This module is the single boundary between the Homi Tool Layer and the
 * existing HomePlus identity authority. It resolves, deterministically:
 *
 *   authenticated auth user
 *        -> HomePlus person
 *        -> active household
 *        -> active household membership
 *        -> authoritative Homi actor/household context
 *
 * The caller never chooses the effective actor, household, membership or
 * role: those values are always derived from the canonical HomePlus context
 * resolved with the authenticated bearer token.
 *
 * The only permitted dependency is the existing canonical HomePlus context
 * authority. No client, credential, query builder or raw row is retained.
 */

const {
  HOMI_AUTH_CONTEXT_INVALID,
  HOMI_CONTEXT_UNAVAILABLE,
  HOMI_CONTEXT_MISMATCH,
  HOMI_CLAIM_INVALID,
  HomiContextError,
  createHomiContextError,
  isNonEmptyString,
  isPlainObject,
  validateAuthenticatedInput,
  normalizeHomiContext,
  validateHomiIdentityClaims,
} = require('./contextContract');

/**
 * Default dependency: the existing canonical HomePlus context authority.
 *
 * The module is required lazily so that loading the Homi foundation never
 * depends on runtime credential configuration.
 *
 * @param {{ user: object, accessToken: string }} input authenticated authority
 * @returns {Promise<object>} the canonical HomePlus context
 */
function defaultResolveHomePlusContext(input) {
  const canonicalAuthority = require('../services/planner.context.service');

  if (!canonicalAuthority || typeof canonicalAuthority.getPlannerContext !== 'function') {
    throw createHomiContextError(
      HOMI_CONTEXT_UNAVAILABLE,
      'The canonical HomePlus context authority is unavailable.',
      { reason: 'canonical_authority_missing' }
    );
  }

  return canonicalAuthority.getPlannerContext({
    user: input.user,
    accessToken: input.accessToken,
  });
}

/**
 * Read the first usable value among a list of canonical field names.
 *
 * @param {object} source canonical object
 * @param {string[]} names candidate field names, most specific first
 * @returns {string|null} the trimmed value or null
 */
function readCanonicalField(source, names) {
  if (!isPlainObject(source)) return null;

  for (const name of names) {
    const value = source[name];
    if (isNonEmptyString(value)) return value.trim();
  }

  return null;
}

/**
 * Map the canonical HomePlus context onto the normalized Homi context.
 *
 * The canonical baseline exposes the person id, the active household id, the
 * active membership id and the membership role both as flat fields and as
 * rows. The flat fields are authoritative; the rows are only used as a
 * consistency cross check.
 *
 * @param {object} canonical canonical HomePlus context
 * @param {string} authUserId authenticated auth user id
 * @returns {object} the frozen normalized Homi context
 * @throws {HomiContextError} HOMI_CONTEXT_UNAVAILABLE
 */
function buildHomiContext(canonical, authUserId) {
  const person = isPlainObject(canonical.person) ? canonical.person : null;
  const household = isPlainObject(canonical.household) ? canonical.household : null;
  const membership = isPlainObject(canonical.membership) ? canonical.membership : null;

  const actorId =
    readCanonicalField(canonical, ['personId']) ?? readCanonicalField(person, ['id']);
  const householdId =
    readCanonicalField(canonical, ['householdId']) ?? readCanonicalField(household, ['id']);
  const membershipId =
    readCanonicalField(canonical, ['membershipId']) ?? readCanonicalField(membership, ['id']);
  const role =
    readCanonicalField(canonical, ['role']) ?? readCanonicalField(membership, ['role']);

  const inconsistencies = [];

  if (
    person &&
    isNonEmptyString(person.id) &&
    isNonEmptyString(canonical.personId) &&
    person.id.trim() !== canonical.personId.trim()
  ) {
    inconsistencies.push('person');
  }

  if (
    household &&
    isNonEmptyString(household.id) &&
    isNonEmptyString(canonical.householdId) &&
    household.id.trim() !== canonical.householdId.trim()
  ) {
    inconsistencies.push('household');
  }

  if (
    membership &&
    isNonEmptyString(membership.id) &&
    isNonEmptyString(canonical.membershipId) &&
    membership.id.trim() !== canonical.membershipId.trim()
  ) {
    inconsistencies.push('membership');
  }

  const canonicalAccountId = readCanonicalField(canonical, ['accountId']);
  if (canonicalAccountId && canonicalAccountId !== authUserId) {
    inconsistencies.push('account');
  }

  if (inconsistencies.length > 0) {
    throw createHomiContextError(
      HOMI_CONTEXT_UNAVAILABLE,
      'The canonical HomePlus context is inconsistent.',
      { inconsistent: inconsistencies }
    );
  }

  const membershipStatus =
    readCanonicalField(canonical, ['membershipStatus']) ??
    readCanonicalField(membership, ['status']);

  if (membershipStatus && membershipStatus.toLowerCase() !== 'active') {
    throw createHomiContextError(
      HOMI_CONTEXT_UNAVAILABLE,
      'The canonical HomePlus context carries a non active membership.',
      { reason: 'membership_not_active' }
    );
  }

  return normalizeHomiContext({
    actorId,
    householdId,
    membershipId,
    authUserId,
    role,
  });
}

/**
 * Build a Homi context resolver bound to a canonical HomePlus context
 * dependency.
 *
 * @param {{ resolveHomePlusContext: Function }} options dependency injection
 * @returns {Function} `async (input) => normalized Homi context`
 */
function createHomiContextResolver(options) {
  const resolveHomePlusContext = isPlainObject(options) ? options.resolveHomePlusContext : null;

  if (typeof resolveHomePlusContext !== 'function') {
    throw createHomiContextError(
      HOMI_CONTEXT_UNAVAILABLE,
      'A canonical HomePlus context dependency is required.'
    );
  }

  return async function resolveHomiContext(input) {
    const { user, accessToken } = validateAuthenticatedInput(input);

    let canonical;
    try {
      canonical = await resolveHomePlusContext({ user, accessToken });
    } catch (error) {
      throw createHomiContextError(
        HOMI_CONTEXT_UNAVAILABLE,
        'The authoritative HomePlus context could not be resolved for the authenticated user.',
        { reason: 'homeplus_context_resolution_failed' },
        error
      );
    }

    if (!isPlainObject(canonical)) {
      throw createHomiContextError(
        HOMI_CONTEXT_UNAVAILABLE,
        'The canonical HomePlus context could not be resolved for the authenticated user.',
        { reason: 'canonical_context_invalid' }
      );
    }

    return buildHomiContext(canonical, user.id.trim());
  };
}

/**
 * Production resolver: bound to the existing canonical HomePlus context
 * authority.
 *
 * @param {{ user: object, accessToken: string }} input authenticated authority
 * @returns {Promise<object>} the frozen normalized Homi context
 */
const resolveHomiContext = createHomiContextResolver({
  resolveHomePlusContext: defaultResolveHomePlusContext,
});

module.exports = {
  HOMI_AUTH_CONTEXT_INVALID,
  HOMI_CONTEXT_UNAVAILABLE,
  HOMI_CONTEXT_MISMATCH,
  HOMI_CLAIM_INVALID,
  HomiContextError,
  createHomiContextError,
  createHomiContextResolver,
  defaultResolveHomePlusContext,
  resolveHomiContext,
  validateHomiIdentityClaims,
};
