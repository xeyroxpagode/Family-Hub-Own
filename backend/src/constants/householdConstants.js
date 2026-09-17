const FINAL_ROLES = Object.freeze(['coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest'])
const MEMBER_STATUSES = Object.freeze(['pending', 'active', 'suspended', 'finalized'])
const ROLE_REQUEST_STATUSES = Object.freeze(['pending', 'approved', 'rejected', 'canceled'])
const MAX_HOUSEHOLD_MEMBERSHIPS = 5
const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'
const DEFAULT_LANGUAGE = 'es-419'

module.exports = {
  FINAL_ROLES,
  MEMBER_STATUSES,
  ROLE_REQUEST_STATUSES,
  MAX_HOUSEHOLD_MEMBERSHIPS,
  DEFAULT_TIMEZONE,
  DEFAULT_LANGUAGE,
}