'use strict';

const { createSupabaseForToken } = require('../../config/supabase');
const { createHttpError } = require('../../lib/httpErrors');

function databaseError(error) {
  return createHttpError(500, error?.message || 'No se pudo resolver el household.', 'internal_error');
}

/** Canonical account -> person -> active household -> active membership authority. */
async function getHouseholdRequestContext(req, dependencies = {}) {
  if (!req?.user?.id || !req?.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated');
  }

  const client = (dependencies.createClient || createSupabaseForToken)(req.accessToken);
  const { data: person, error: personError } = await client
    .from('people').select('*').eq('auth_user_id', req.user.id).maybeSingle();
  if (personError) throw databaseError(personError);
  if (!person) throw createHttpError(403, 'No existe person para el usuario autenticado.', 'person_not_found');
  if (!person.active_household_id) {
    throw createHttpError(403, 'El usuario no tiene household activo.', 'no_active_household');
  }

  const householdId = person.active_household_id;
  const [householdResult, membershipResult] = await Promise.all([
    client.from('households').select('*').eq('id', householdId).maybeSingle(),
    client.from('household_members').select('*')
      .eq('household_id', householdId).eq('person_id', person.id).eq('status', 'active').maybeSingle(),
  ]);
  if (householdResult.error || membershipResult.error) {
    throw databaseError(householdResult.error || membershipResult.error);
  }
  if (!membershipResult.data) {
    throw createHttpError(403, 'El usuario no es miembro activo del household.', 'not_active_household_member');
  }
  if (!householdResult.data) {
    throw createHttpError(403, 'El usuario no tiene household activo.', 'no_active_household');
  }

  const membership = membershipResult.data;
  return {
    client,
    accountId: req.user.id,
    person,
    personId: person.id,
    household: householdResult.data,
    householdId,
    membership,
    membershipId: membership.id,
    role: membership.role,
    membershipStatus: membership.status,
  };
}

module.exports = { getHouseholdRequestContext };
