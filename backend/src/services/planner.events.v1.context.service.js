'use strict';

const { createSupabaseForToken } = require('../config/supabase');
const { createHttpError } = require('../lib/httpErrors');

/**
 * Event V1 context does not require an active household for reads of personal
 * Events. Household identity is optional context; SQL remains authoritative
 * for every household mutation and all personal ownership checks.
 */
async function getEventV1Context(req) {
  if (!req.user?.id || !req.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated');
  }

  const client = createSupabaseForToken(req.accessToken);
  const { data: person, error: personError } = await client
    .from('people')
    .select('*')
    .eq('auth_user_id', req.user.id)
    .maybeSingle();

  if (personError) throw createHttpError(500, personError.message, 'internal_error');
  if (!person) throw createHttpError(403, 'No existe person para el usuario autenticado.', 'person_not_found');

  let household = null;
  let membership = null;
  if (person.active_household_id) {
    const [{ data: householdRow, error: householdError }, { data: membershipRow, error: membershipError }] =
      await Promise.all([
        client.from('households').select('*').eq('id', person.active_household_id).maybeSingle(),
        client.from('household_members').select('*')
          .eq('household_id', person.active_household_id)
          .eq('person_id', person.id)
          .eq('status', 'active')
          .maybeSingle(),
      ]);
    if (householdError || membershipError) {
      throw createHttpError(500, householdError?.message ?? membershipError.message, 'internal_error');
    }
    household = householdRow;
    membership = membershipRow;
  }

  return {
    client,
    accountId: req.user.id,
    personId: person.id,
    person,
    household,
    membership,
    householdId: household?.id ?? null,
    membershipId: membership?.id ?? null,
    role: membership?.role ?? null,
  };
}

async function getEventV1HouseholdMutationContext(context, householdId) {
  if (!householdId) {
    throw createHttpError(422, 'El household es obligatorio para esta operación.', 'household_required');
  }

  const [{ data: household, error: householdError }, { data: membership, error: membershipError }] =
    await Promise.all([
      context.client.from('households').select('*').eq('id', householdId).maybeSingle(),
      context.client.from('household_members').select('*')
        .eq('household_id', householdId)
        .eq('person_id', context.personId)
        .eq('status', 'active')
        .maybeSingle(),
    ]);

  if (householdError || membershipError) {
    throw createHttpError(500, 'Error interno.', 'internal_error');
  }
  if (!household || !membership) {
    throw createHttpError(403, 'No tenés acceso activo al household.', 'member_not_active');
  }

  return {
    ...context,
    household,
    membership,
    householdId: household.id,
    membershipId: membership.id,
    role: membership.role,
  };
}

module.exports = { getEventV1Context, getEventV1HouseholdMutationContext };
