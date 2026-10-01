'use strict';

const { createSupabaseForToken } = require('../config/supabase');
const { createHttpError } = require('../lib/httpErrors');
const {
  FINANCE_CONTEXT_TYPES,
  isValidFinanceContextType,
} = require('../constants/finance.constants');

/**
 * Financial Context V1.1 Authority.
 *
 * Resolves the server-side Financial Context for the authenticated Person.
 * Finance only understands two context types (see finance.constants.js):
 *
 *   PERSONAL  -> current Person, owner-only, no Household requirement.
 *   HOUSEHOLD -> the active global Household (public.people.active_household_id)
 *                of the authenticated Person, requiring an active membership.
 *
 * Non-negotiable Finance rules:
 *
 *   - Personal Finance does NOT require a Household and never reads the user's
 *     full membership list.
 *   - Finance never accepts caller-supplied ownership authority (personId,
 *     ownerPersonId, householdId, membershipId). Ownership derives server-side
 *     from the authenticated user and people.active_household_id only.
 *   - This resolver does NOT persist anything, does NOT create a second Household
 *     authority, and does NOT depend on Planner.
 *
 * The canonical authorities it reuses are:
 *
 *   AUTH:        backend/src/middleware/authFinalMiddleware.js (req.user,
 *                 req.accessToken).
 *   PERSON:      public.people (lookup by auth_user_id).
 *   HOUSEHOLD:   public.people.active_household_id
 *                 + public.households
 *                 + public.household_members (status='active').
 *   SQL RLS:    public.effective_uid(), public.current_person_id(),
 *                 public.is_self_person(...),
 *                 public.is_active_household_member(), etc. — not invoked here
 *                 directly; the resolver works on top of the same canonical
 *                 rows they rely on so RLS stays authoritative.
 *
 * Future Finance tables storing Personal-owned truth MUST reuse
 * public.current_person_id() / public.is_self_person(...). Future Finance tables
 * storing Household-owned truth MUST reuse public.is_active_household_member(...)
 * plus active Household ownership semantics where required. 1C intentionally
 * does not create Finance-specific RLS helpers or Finance schema.
 *
 * Returned shape (intentionally aligned to the existing repo-wide scope
 * vocabulary used by planner.context.service / planner.events.v1.context):
 *
 *   PERSONAL:
 *     {
 *       client, accountId, contextType: 'personal',
 *       personId, person,
 *       householdId: null, household: null,
 *       membershipId: null, membership: null,
 *     }
 *
 *   HOUSEHOLD:
 *     {
 *       client, accountId, contextType: 'household',
 *       personId, person,
 *       householdId, household, membershipId, membership,
 *     }
 *
 * Errors reuse the project's createHttpError semantics (no FinanceError system):
 *   401 not_authenticated
 *   400 invalid_finance_context_type / finance_*_id_forbidden
 *   403 person_not_found / no_active_household / not_active_household_member
 *   404 household_not_found
 *   500 internal_error
 */
async function resolveFinanceContext(req, contextType, options = {}) {
  if (!req.user?.id || !req.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated');
  }

  if (!isValidFinanceContextType(contextType)) {
    throw createHttpError(
      400,
      'Financial Context type invalido. Debe ser PERSONAL o HOUSEHOLD.',
      'invalid_finance_context_type',
    );
  }

  const forbiddenCallerAuthority = {
    personId: 'finance_person_id_forbidden',
    ownerPersonId: 'finance_owner_person_id_forbidden',
    householdId: 'finance_household_id_forbidden',
    membershipId: 'finance_membership_id_forbidden',
  };

  for (const [field, code] of Object.entries(forbiddenCallerAuthority)) {
    if (options[field] !== undefined && options[field] !== null) {
      throw createHttpError(
        400,
        `Finance no acepta ${field} arbitrario: la autoridad de ownership se deriva server-side del usuario autenticado.`,
        code,
      );
    }
  }

  const client = createSupabaseForToken(req.accessToken);

  const { data: person, error: personError } = await client
    .from('people')
    .select('*')
    .eq('auth_user_id', req.user.id)
    .maybeSingle();

  if (personError) {
    throw createHttpError(500, personError.message, 'internal_error');
  }

  if (!person) {
    throw createHttpError(
      403,
      'No existe person para el usuario autenticado.',
      'person_not_found',
    );
  }

  if (contextType === FINANCE_CONTEXT_TYPES.PERSONAL) {
    return {
      client,
      accountId: req.user.id,
      contextType: FINANCE_CONTEXT_TYPES.PERSONAL,
      personId: person.id,
      person,
      householdId: null,
      household: null,
      membershipId: null,
      membership: null,
    };
  }

  // HOUSEHOLD — only the active global household of the authenticated Person.
  if (!person.active_household_id) {
    throw createHttpError(
      403,
      'El usuario no tiene household activo.',
      'no_active_household',
    );
  }

  const [{ data: household, error: householdError }, { data: membership, error: membershipError }] =
    await Promise.all([
      client
        .from('households')
        .select('*')
        .eq('id', person.active_household_id)
        .maybeSingle(),
      client
        .from('household_members')
        .select('*')
        .eq('household_id', person.active_household_id)
        .eq('person_id', person.id)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

  if (householdError || membershipError) {
    throw createHttpError(
      500,
      householdError?.message ?? membershipError.message,
      'internal_error',
    );
  }

  if (!membership) {
    throw createHttpError(
      403,
      'El usuario no es miembro activo del household.',
      'not_active_household_member',
    );
  }

  if (!household) {
    throw createHttpError(
      403,
      'El usuario no tiene household activo.',
      'no_active_household',
    );
  }

  return {
    client,
    accountId: req.user.id,
    contextType: FINANCE_CONTEXT_TYPES.HOUSEHOLD,
    personId: person.id,
    person,
    householdId: household.id,
    household,
    membershipId: membership.id,
    membership,
  };
}

module.exports = {
  resolveFinanceContext,
  FINANCE_CONTEXT_TYPES,
};
