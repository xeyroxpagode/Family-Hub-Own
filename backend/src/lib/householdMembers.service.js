const { createHttpError } = require('./httpErrors')
const { FINAL_ROLES } = require('../constants/householdConstants')

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const createSupabaseHttpError = (statusCode, message, code, supabaseError) => {
  const error = createHttpError(statusCode, message, code)

  if (supabaseError) {
    error.supabaseError = {
      code: supabaseError.code,
      message: supabaseError.message,
      details: supabaseError.details,
      hint: supabaseError.hint,
      status: supabaseError.status,
    }
  }

  return error
}

const requireUuidParam = (value, name) => {
  const normalized = normalizeString(value)

  if (!UUID_PATTERN.test(normalized)) {
    throw createHttpError(400, `${name} invalido.`, `${name}/invalid`)
  }

  return normalized
}

const getAuthenticatedPerson = async (client, authUserId) => {
  if (!authUserId) {
    throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
  }

  const { data, error } = await client
    .from('people')
    .select('id, auth_user_id, display_name, first_name, last_name, avatar_url, phone, date_of_birth, gender, default_language, personal_settings, active_household_id, app_onboarding_status, app_onboarding_completed_at, created_at, updated_at')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) {
    throw createSupabaseHttpError(500, error.message, 'person_lookup_failed', error)
  }

  return data
}

const getActiveMembership = async (client, personId, householdId) => {
  const { data, error } = await client
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .eq('person_id', personId)
    .maybeSingle()

  if (error) {
    throw createSupabaseHttpError(500, error.message, 'membership_lookup_failed', error)
  }

  return data || null
}

const requireActiveMembership = async (client, personId, householdId) => {
  const membership = await getActiveMembership(client, personId, householdId)

  if (!membership) {
    throw createHttpError(404, 'No perteneces a este hogar.', 'membership/not_found')
  }

  if (membership.status !== 'active') {
    throw createHttpError(403, 'Tu membresia no esta activa.', 'membership/not_active')
  }

  return membership
}

const requireCoordinator = async (client, personId, householdId) => {
  const membership = await requireActiveMembership(client, personId, householdId)

  if (membership.role !== 'coordinator') {
    throw createHttpError(403, 'Solo un coordinator puede realizar esta accion.', 'household/not_coordinator')
  }

  return membership
}

const assertValidHouseholdRole = (role) => {
  const normalized = normalizeString(role)

  if (!normalized || !FINAL_ROLES.includes(normalized)) {
    throw createHttpError(400, `role invalido. Debe ser uno de: ${FINAL_ROLES.join(', ')}`, 'membership/invalid_role')
  }

  return normalized
}

const assertCanModifyMemberRole = async (client, modifierMembership, targetMembership) => {
  if (modifierMembership.role !== 'coordinator') {
    throw createHttpError(403, 'Solo un coordinator puede cambiar roles.', 'household/not_coordinator')
  }

  if (targetMembership.status !== 'active') {
    throw createHttpError(409, 'No se puede cambiar el rol de un miembro que no esta activo.', 'membership/not_active')
  }
}

const ensureHouseholdKeepsCoordinator = async (client, householdId, targetMembershipId, newRole) => {
  if (newRole === 'coordinator') {
    return
  }

  const { data: targetMembership, error: targetError } = await client
    .from('household_members')
    .select('role, status')
    .eq('id', targetMembershipId)
    .maybeSingle()

  if (targetError) {
    throw createSupabaseHttpError(500, targetError.message, 'membership_lookup_failed', targetError)
  }

  if (targetMembership.role !== 'coordinator') {
    return
  }

  const { data: coordinators, error: coordsError } = await client
    .from('household_members')
    .select('id, role, status')
    .eq('household_id', householdId)
    .eq('role', 'coordinator')
    .eq('status', 'active')

  if (coordsError) {
    throw createSupabaseHttpError(500, coordsError.message, 'coordinators_lookup_failed', coordsError)
  }

  const activeCoordinators = (coordinators || []).filter((c) => c.id !== targetMembershipId)

  if (activeCoordinators.length === 0) {
    throw createHttpError(
      409,
      'No se puede dejar el hogar sin coordinator. Asigna otro coordinator primero.',
      'household/last_coordinator',
    )
  }
}

const mapMemberPublic = (row) => {
  if (!row) return null

  return {
    membership_id: row.id,
    person_id: row.person_id,
    display_name: row.display_name,
    first_name: row.first_name,
    last_name: row.last_name,
    avatar_url: row.avatar_url,
    phone: row.phone,
    date_of_birth: row.date_of_birth,
    role: row.role,
    status: row.status,
    joined_at: row.joined_at,
    created_at: row.created_at,
  }
}

const mapMemberPublicWithHousehold = (row) => {
  if (!row) return null

  return {
    membership_id: row.id,
    household_id: row.household_id,
    person_id: row.person_id,
    display_name: row.display_name,
    first_name: row.first_name,
    last_name: row.last_name,
    avatar_url: row.avatar_url,
    phone: row.phone,
    date_of_birth: row.date_of_birth,
    role: row.role,
    status: row.status,
    joined_at: row.joined_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const mapRoleRequest = (row) => {
  if (!row) return null

  return {
    id: row.id,
    household_id: row.household_id,
    membership_id: row.membership_id,
    requested_by_member_id: row.requested_by_member_id,
    current_role: row.from_role,
    requested_role: row.requested_role,
    reason: row.reason,
    status: row.status,
    reviewed_by_member_id: row.reviewed_by_member_id,
    reviewed_at: row.reviewed_at,
    resolution_note: row.resolution_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const ROLE_ORDER = {
  coordinator: 0,
  adult: 1,
  senior: 2,
  adolescent: 3,
  child: 4,
  guest: 5,
}

const sortMembersByRole = (members) => {
  return [...members].sort((a, b) => {
    const roleA = ROLE_ORDER[a.role ?? 'guest'] ?? 6
    const roleB = ROLE_ORDER[b.role ?? 'guest'] ?? 6

    if (roleA !== roleB) {
      return roleA - roleB
    }

    return (a.display_name || '').localeCompare(b.display_name || '')
  })
}

const isLastCoordinator = async (client, householdId, targetMembershipId) => {
  const { data: coordinators, error } = await client
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('role', 'coordinator')
    .eq('status', 'active')

  if (error) {
    throw createSupabaseHttpError(500, error.message, 'coordinators_lookup_failed', error)
  }

  const activeCoordinators = (coordinators || []).filter((c) => c.id !== targetMembershipId)
  return activeCoordinators.length === 0
}

const getRolePermissions = (role) => ({
  can_manage_members: role === 'coordinator',
  can_invite: role === 'coordinator',
  can_review_join_requests: role === 'coordinator',
  can_change_roles: role === 'coordinator',
  can_request_role_change: FINAL_ROLES.includes(role),
})

module.exports = {
  UUID_PATTERN,
  normalizeString,
  requireUuidParam,
  getAuthenticatedPerson,
  getActiveMembership,
  requireActiveMembership,
  requireCoordinator,
  assertValidHouseholdRole,
  assertCanModifyMemberRole,
  ensureHouseholdKeepsCoordinator,
  mapMemberPublic,
  mapMemberPublicWithHousehold,
  mapRoleRequest,
  sortMembersByRole,
  isLastCoordinator,
  getRolePermissions,
}
