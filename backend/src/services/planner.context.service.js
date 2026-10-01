const { createSupabaseForToken } = require('../config/supabase')
const { createHttpError } = require('../lib/httpErrors')

const getPlannerContext = async (req) => {
  if (!req.user?.id || !req.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated')
  }

  const client = createSupabaseForToken(req.accessToken)

  const { data: person, error: personError } = await client
    .from('people')
    .select('*')
    .eq('auth_user_id', req.user.id)
    .maybeSingle()

  if (personError) {
    throw createHttpError(500, personError.message, 'internal_error')
  }

  if (!person) {
    throw createHttpError(403, 'No existe person para el usuario autenticado.', 'person_not_found')
  }

  if (!person.active_household_id) {
    throw createHttpError(403, 'El usuario no tiene household activo.', 'no_active_household')
  }

  const { data: membership, error: membershipError } = await client
    .from('household_members')
    .select('*')
    .eq('household_id', person.active_household_id)
    .eq('person_id', person.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    throw createHttpError(500, membershipError.message, 'internal_error')
  }

  if (!membership) {
    throw createHttpError(403, 'El usuario no es miembro activo del household.', 'not_active_household_member')
  }

  const { data: household, error: householdError } = await client
    .from('households')
    .select('*')
    .eq('id', person.active_household_id)
    .maybeSingle()

  if (householdError) {
    throw createHttpError(500, householdError.message, 'internal_error')
  }

  if (!household) {
    throw createHttpError(403, 'El usuario no tiene household activo.', 'no_active_household')
  }

  return {
    client,
    accountId: req.user.id,
    person,
    household,
    membership,
    householdId: household.id,
    personId: person.id,
    membershipId: membership.id,
    role: membership.role,
    membershipStatus: membership.status,
  }
}

// ── V2 personal/household scope context (shared foundation) ──

const getPersonalScopeContext = async (req) => {
  if (!req.user?.id || !req.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated')
  }

  const client = createSupabaseForToken(req.accessToken)

  const { data: person, error: personError } = await client
    .from('people')
    .select('*')
    .eq('auth_user_id', req.user.id)
    .maybeSingle()

  if (personError) {
    throw createHttpError(500, personError.message, 'internal_error')
  }

  if (!person) {
    throw createHttpError(403, 'No existe person para el usuario autenticado.', 'person_not_found')
  }

  return {
    client,
    accountId: req.user.id,
    personId: person.id,
    person,
    scopeType: 'personal',
    scopeId: person.id,
    householdId: null,
    membershipId: null,
    membership: null,
    household: null,
  }
}

const getHouseholdScopeContext = async (req, householdId) => {
  if (!req.user?.id || !req.accessToken) {
    throw createHttpError(401, 'No autenticado.', 'not_authenticated')
  }

  if (!householdId) {
    throw createHttpError(400, 'householdId es obligatorio para contexto household.', 'invalid_scope')
  }

  const client = createSupabaseForToken(req.accessToken)

  const { data: person, error: personError } = await client
    .from('people')
    .select('*')
    .eq('auth_user_id', req.user.id)
    .maybeSingle()

  if (personError) {
    throw createHttpError(500, personError.message, 'internal_error')
  }

  if (!person) {
    throw createHttpError(403, 'No existe person para el usuario autenticado.', 'person_not_found')
  }

  const { data: membership, error: membershipError } = await client
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .eq('person_id', person.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    throw createHttpError(500, membershipError.message, 'internal_error')
  }

  if (!membership) {
    throw createHttpError(403, 'El usuario no es miembro activo del household indicado.', 'not_active_household_member')
  }

  const { data: household, error: householdError } = await client
    .from('households')
    .select('*')
    .eq('id', householdId)
    .maybeSingle()

  if (householdError) {
    throw createHttpError(500, householdError.message, 'internal_error')
  }

  if (!household) {
    throw createHttpError(404, 'Household no encontrado.', 'not_found')
  }

  return {
    client,
    accountId: req.user.id,
    personId: person.id,
    person,
    scopeType: 'household',
    scopeId: householdId,
    householdId,
    membershipId: membership.id,
    membership,
    household,
  }
}

module.exports = {
  getPlannerContext,
  getPersonalScopeContext,
  getHouseholdScopeContext,
}
