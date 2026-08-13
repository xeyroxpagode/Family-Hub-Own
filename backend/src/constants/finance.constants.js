'use strict';

/**
 * Financial Context V1.1 canonical types.
 *
 * Financial Context is the only Finance concept that resolves to one of two
 * scopes for the authenticated Person:
 *
 *   PERSONAL  -> belongs to the current Person; does NOT depend on an active
 *                global Household; survives any household switch.
 *   HOUSEHOLD -> belongs exclusively to public.people.active_household_id for
 *                the current Person, requiring an active household membership.
 *
 * Canonical string values are lowercase and deliberately aligned with the
 * existing repo-wide `scopeType` convention ('personal' | 'household') already
 * used by planner.context.service and planner.events.v1.context.service, so
 * Finance does not introduce a parallel vocabulary. The Finance-specific alias
 * is the minimal domain contract required by 1B; it MUST NOT become a generic
 * scope framework and MUST NOT replace any existing authority.
 */
const FINANCE_CONTEXT_TYPES = Object.freeze({
  PERSONAL: 'personal',
  HOUSEHOLD: 'household',
});

const FINANCE_CONTEXT_TYPE_VALUES = Object.freeze(Object.values(FINANCE_CONTEXT_TYPES));

const FINANCE_SOURCE_TYPES = Object.freeze({
  NONE: 'none',
  PERSONAL: 'personal',
  HOUSEHOLD: 'household',
});

const FINANCE_SOURCE_TYPE_VALUES = Object.freeze(Object.values(FINANCE_SOURCE_TYPES));

const FINANCE_SOURCE_CONTEXT_RELATIONSHIPS = Object.freeze({
  NO_TRACKED_SOURCE: 'no_tracked_source',
  SAME_PERSONAL_CONTEXT: 'same_personal_context',
  SAME_HOUSEHOLD_CONTEXT: 'same_household_context',
  PERSONAL_FUNDED_HOUSEHOLD: 'personal_funded_household',
});

const FINANCE_FUNDING_RELATIONSHIPS = Object.freeze({
  NONE: 'none',
  PERSONAL_FUNDED: 'personal_funded',
  HOUSEHOLD_FUNDED: 'household_funded',
});

function isValidFinanceContextType(value) {
  return (
    typeof value === 'string' &&
    FINANCE_CONTEXT_TYPE_VALUES.includes(value)
  );
}

function isValidFinanceSourceType(value) {
  return (
    typeof value === 'string' &&
    FINANCE_SOURCE_TYPE_VALUES.includes(value)
  );
}

module.exports = {
  FINANCE_CONTEXT_TYPES,
  FINANCE_CONTEXT_TYPE_VALUES,
  FINANCE_SOURCE_TYPES,
  FINANCE_SOURCE_TYPE_VALUES,
  FINANCE_SOURCE_CONTEXT_RELATIONSHIPS,
  FINANCE_FUNDING_RELATIONSHIPS,
  isValidFinanceContextType,
  isValidFinanceSourceType,
};
