const { createSupabaseForToken } = require('../config/supabase')
const { buildMe } = require('../lib/me.service')
const { getPersonByAuthUserId } = require('../lib/auth.service')
const {
  requireUuidParam,
  getAuthenticatedPerson,
  requireActiveMembership,
  assertValidHouseholdRole,
  mapMemberPublic,
  mapMemberPublicWithHousehold,
  mapRoleRequest,
  sortMembersByRole,
  getRolePermissions,
} = require('../lib/householdMembers.service')
const { MAX_HOUSEHOLD_MEMBERSHIPS } = require('../constants/householdConstants')

const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'
const DEFAULT_LANGUAGE = 'es-419'

const createHttpError = (statusCode, message, code) => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

const shouldDebugFamilyHub = () =>
  process.env.DEBUG_FAMILY_HUB === 'true' || process.env.NODE_ENV === 'development'

const serializeSupabaseError = (error) => ({
  status: error?.status,
  code: error?.code,
  message: error?.message,
  details: error?.details,
  hint: error?.hint,
})

const logFamilyHubDebug = (event, payload = {}) => {
  if (!shouldDebugFamilyHub()) return
  console.log(`[FamilyHub] ${event}`, payload)
}

const logFamilyHubQueryError = (query, error, extra = {}) => {
  if (!shouldDebugFamilyHub()) return
  console.error(`[FamilyHub] ${query} error`, {
    ...extra,
    supabase: serializeSupabaseError(error?.supabaseError ?? error),
  })
}

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const mapCreateHouseholdRpcError = (error) => {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`

  if (error?.code === '22023' || message.includes('household_name_required')) {
    return createHttpError(400, 'name es obligatorio.', 'household/invalid_name')
  }

  if (message.includes('person_not_found')) {
    return createHttpError(409, 'No existe people para el usuario autenticado.', 'auth/person_not_found')
  }

  if (error?.code === '28000' || message.includes('not_authenticated')) {
    return createHttpError(401, 'No autenticado.', 'auth/unauthorized')
  }

  if (error?.code === '23505' || message.includes('household_slug_conflict')) {
    return createHttpError(409, 'El slug del hogar ya existe.', 'household/slug_conflict')
  }

  if (error?.code === '22023' || message.includes('household_limit_reached')) {
    return createHttpError(409, 'No puedes ser miembro de mas de 5 hogares activos o pendientes.', 'household/limit_reached')
  }

  return createHttpError(500, 'No se pudo crear el hogar.', 'household/create_failed')
}

const mapFinalizeMemberRpcError = (error) => {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()

  if (error?.code === '28000' || message.includes('not_authenticated')) {
    return createHttpError(401, 'No autenticado.', 'auth/unauthorized')
  }

  if (message.includes('not_household_coordinator') || error?.code === '42501') {
    return createHttpError(403, 'Solo un coordinator activo puede quitar miembros.', 'household/not_coordinator')
  }

  if (message.includes('membership_not_found')) {
    return createHttpError(404, 'Miembro no encontrado.', 'membership/not_found')
  }

  if (message.includes('membership_not_active')) {
    return createHttpError(409, 'La membresia no esta activa.', 'membership/not_active')
  }

  if (message.includes('cannot_finalize_self')) {
    return createHttpError(400, 'No podes quitarte desde esta accion.', 'membership/cannot_finalize_self')
  }

  if (message.includes('cannot_finalize_last_coordinator')) {
    return createHttpError(409, 'No se puede quitar al ultimo coordinator del hogar.', 'membership/last_coordinator')
  }

  if (
    error?.code === 'PGRST202' ||
    message.includes('schema cache') ||
    message.includes('function') && message.includes('finalize_household_member')
  ) {
    return createHttpError(
      500,
      'RPC finalize_household_member no disponible en Supabase. Revisar migracion/schema cache.',
      'membership/finalize_rpc_unavailable',
    )
  }

  return createHttpError(500, 'No se pudo quitar el miembro.', 'membership/finalize_failed')
}

const mapHouseholdRoleRpcError = (error, fallbackCode) => {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()

  if (error?.code === '28000' || message.includes('not_authenticated')) {
    return createHttpError(401, 'No autenticado.', 'auth/unauthorized')
  }

  if (message.includes('person_not_found')) {
    return createHttpError(409, 'No existe people para el usuario autenticado.', 'auth/person_not_found')
  }

  if (message.includes('membership_not_found')) {
    return createHttpError(404, 'Miembro no encontrado.', 'membership/not_found')
  }

  if (message.includes('membership_not_active')) {
    return createHttpError(409, 'La membresia no esta activa.', 'membership/not_active')
  }

  if (message.includes('target_membership_not_active')) {
    return createHttpError(409, 'No se puede cambiar el rol de un miembro que no esta activo.', 'membership/not_active')
  }

  if (message.includes('not_role_request_owner')) {
    return createHttpError(403, 'Solo el solicitante puede cancelar esta solicitud.', 'role_request/not_owner')
  }

  if (message.includes('not_household_coordinator') || error?.code === '42501') {
    return createHttpError(403, 'Solo un coordinator activo puede administrar miembros.', 'household/not_coordinator')
  }

  if (message.includes('invalid_membership_role')) {
    return createHttpError(400, 'role invalido.', 'membership/invalid_role')
  }

  if (message.includes('same_membership_role')) {
    return createHttpError(409, 'El miembro ya tiene ese rol.', 'membership/same_role')
  }

  if (message.includes('cannot_leave_household_without_coordinator')) {
    return createHttpError(409, 'No se puede dejar el hogar sin coordinator.', 'household/last_coordinator')
  }

  if (message.includes('role_request_not_found')) {
    return createHttpError(404, 'Solicitud de cambio de rol no encontrada.', 'role_request/not_found')
  }

  if (message.includes('role_request_not_pending')) {
    return createHttpError(409, 'La solicitud ya no esta pending.', 'role_request/not_pending')
  }

  if (message.includes('pending_role_request_exists') || error?.code === '23505') {
    return createHttpError(409, 'Ya existe una solicitud pending para esta membership.', 'role_request/pending_exists')
  }

  if (
    error?.code === 'PGRST202' ||
    message.includes('schema cache') ||
    (message.includes('function') && message.includes('household_role'))
  ) {
    return createHttpError(
      500,
      'RPC de role requests no disponible en Supabase. Revisar migracion/schema cache.',
      'role_request/rpc_unavailable',
    )
  }

  return createHttpError(500, 'No se pudo procesar la solicitud de rol.', fallbackCode)
}

const createHousehold = async (req, res) => {
  try {
    const accessToken = req.accessToken
    const user = req.user
    const name = normalizeString(req.body?.name)
    const slug = normalizeString(req.body?.slug) || null
    const timezone = normalizeString(req.body?.timezone) || DEFAULT_TIMEZONE
    const defaultLanguage = normalizeString(req.body?.default_language) || DEFAULT_LANGUAGE
    const config = req.body?.config ?? {}

    if (!accessToken || !user?.id) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    if (!name) {
      throw createHttpError(400, 'name es obligatorio.', 'household/invalid_name')
    }

    if (!isPlainObject(config)) {
      throw createHttpError(400, 'config debe ser un objeto JSON.', 'household/invalid_config')
    }

    const scopedClient = createSupabaseForToken(accessToken)
    const { data, error } = await scopedClient.rpc('create_household', {
      p_name: name,
      p_slug: slug,
      p_timezone: timezone,
      p_default_language: defaultLanguage,
      p_config: config,
    })

    if (error) {
      throw mapCreateHouseholdRpcError(error)
    }

    if (!data?.household || !data?.membership || !data?.person) {
      throw createHttpError(500, 'No se pudo crear el hogar.', 'household/create_failed')
    }

    const me = await buildMe({ user, accessToken })

    return res.status(201).json({
      household: data.household,
      membership: data.membership,
      person: data.person,
      me,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo crear el hogar.' : error.message,
      code: statusCode >= 500 ? 'household/create_failed' : error.code,
    })
  }
}

const finalizeHouseholdMember = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const membershipId = requireUuidParam(req.params?.membership_id, 'membership_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    const { data, error } = await scopedClient.rpc('finalize_household_member', {
      p_household_id: householdId,
      p_membership_id: membershipId,
    })

    if (error) {
      console.error('[finalizeHouseholdMember] RPC error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw mapFinalizeMemberRpcError(error)
    }

    if (!data?.membership) {
      throw createHttpError(500, 'La RPC no devolvio membership.', 'membership/invalid_rpc_response')
    }

    return res.status(200).json({
      membership: data.membership,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo quitar el miembro.' : error.message,
      code: statusCode >= 500 ? 'membership/finalize_failed' : error.code,
    })
  }
}

const setActiveHousehold = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    const person = await getPersonByAuthUserId(scopedClient, req.user.id)

    if (!person) {
      throw createHttpError(409, 'No existe una persona para este usuario.', 'auth/person_not_found')
    }

    const { data: membershipData, error: membershipError } = await scopedClient
      .from('household_members')
      .select('id, role, status')
      .eq('household_id', householdId)
      .eq('person_id', person.id)
      .maybeSingle()

    if (membershipError) {
      throw createHttpError(500, membershipError.message, 'membership_lookup_failed')
    }

    if (!membershipData) {
      throw createHttpError(404, 'No perteneces a este hogar.', 'membership/not_found')
    }

    if (membershipData.status === 'pending') {
      throw createHttpError(409, 'Tu membresia esta pendiente de aprobacion.', 'membership/pending')
    }

    if (membershipData.status === 'suspended') {
      throw createHttpError(409, 'Tu acceso esta suspendido.', 'membership/suspended')
    }

    if (membershipData.status === 'finalized') {
      throw createHttpError(409, 'Tu membresia ya fue finalizada.', 'membership/finalized')
    }

    const { error: updateError } = await scopedClient
      .from('people')
      .update({ active_household_id: householdId, updated_at: new Date().toISOString() })
      .eq('id', person.id)

    if (updateError) {
      throw createHttpError(500, updateError.message, 'active_household_update_failed')
    }

    const me = await buildMe({ user: req.user, accessToken: req.accessToken })

    return res.status(200).json({
      person: me.person,
      active_household: me.active_household,
      active_membership: membershipData,
      me,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo cambiar el hogar activo.' : error.message,
      code: statusCode >= 500 ? 'household/set_active_failed' : error.code,
    })
  }
}

const createHouseholdInvitation = async (req, res) => {
  return res.status(410).json({
    error: 'legacy_invitation_flow_disabled',
    message: 'Legacy invitations flow is disabled. Use invite links flow.',
  })
}

const validateInvitation = async (req, res) => {
  return res.status(410).json({
    error: 'legacy_invitation_flow_disabled',
    message: 'Legacy invitations flow is disabled. Use invite links flow.',
  })
}

const getFamilyHub = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    logFamilyHubDebug('load params', {
      household_id: householdId,
      auth_user_id: req.user.id,
    })

    let person
    try {
      person = await getAuthenticatedPerson(scopedClient, req.user.id)
      logFamilyHubDebug('person resolved', {
        household_id: householdId,
        person_id: person?.id ?? null,
      })
    } catch (error) {
      logFamilyHubQueryError('people lookup', error, { household_id: householdId })
      throw error
    }

    if (!person) {
      throw createHttpError(409, 'No existe people para el usuario autenticado.', 'auth/person_not_found')
    }

    let membership
    try {
      membership = await requireActiveMembership(scopedClient, person.id, householdId)
      logFamilyHubDebug('membership resolved', {
        household_id: householdId,
        person_id: person.id,
        membership_id: membership?.id ?? null,
        role: membership?.role ?? null,
        status: membership?.status ?? null,
      })
    } catch (error) {
      logFamilyHubQueryError('membership lookup', error, {
        household_id: householdId,
        person_id: person.id,
      })
      throw error
    }

    if (membership.status !== 'active') {
      throw createHttpError(403, 'Solo miembros activos pueden acceder al family hub.', 'membership/not_active')
    }

    const { data: household, error: householdError } = await scopedClient
      .from('households')
      .select('id, name, slug, timezone, default_language, config, created_at, updated_at')
      .eq('id', householdId)
      .maybeSingle()

    if (householdError) {
      logFamilyHubQueryError('households lookup', householdError, { household_id: householdId })
      throw createHttpError(500, householdError.message, 'household_lookup_failed')
    }

    if (!household) {
      throw createHttpError(404, 'Hogar no encontrado.', 'household/not_found')
    }

    const { data: membersData, error: membersError } = await scopedClient
      .from('household_people_public')
      .select('membership_id, household_id, person_id, display_name, avatar_url, role, status, joined_at')
      .eq('household_id', householdId)
      .eq('status', 'active')

    if (membersError) {
      logFamilyHubQueryError('household_people_public active members lookup', membersError, {
        household_id: householdId,
      })
      throw createHttpError(500, membersError.message, 'members_lookup_failed')
    }

    const members = (membersData || []).map((member) =>
      mapMemberPublic({
        id: member.membership_id,
        household_id: member.household_id,
        person_id: member.person_id,
        display_name: member.display_name,
        avatar_url: member.avatar_url,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at,
      }),
    )

    const sortedMembers = sortMembersByRole(members)
    const membersByMembershipId = new Map(sortedMembers.map((member) => [member.membership_id, member]))

    const { data: joinRequestsData, error: requestsError } = membership.role === 'coordinator'
      ? await scopedClient
          .from('household_members')
          .select('id, household_id, person_id, created_at, status')
          .eq('household_id', householdId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
      : { data: [], error: null }

    if (requestsError) {
      logFamilyHubQueryError('household_members pending requests lookup', requestsError, {
        household_id: householdId,
      })
      throw createHttpError(500, requestsError.message, 'join_requests_lookup_failed')
    }

    const pendingMembershipIds = (joinRequestsData || []).map((request) => request.id)
    const { data: pendingPeopleData, error: pendingPeopleError } =
      pendingMembershipIds.length > 0
        ? await scopedClient
            .from('household_people_public')
            .select('membership_id, person_id, display_name, avatar_url')
            .eq('household_id', householdId)
            .in('membership_id', pendingMembershipIds)
        : { data: [], error: null }

    if (pendingPeopleError) {
      logFamilyHubQueryError('household_people_public pending members lookup', pendingPeopleError, {
        household_id: householdId,
      })
      throw createHttpError(500, pendingPeopleError.message, 'join_request_people_lookup_failed')
    }

    const pendingPeopleByMembershipId = new Map(
      (pendingPeopleData || []).map((member) => [member.membership_id, member]),
    )

    const joinRequests = (joinRequestsData || []).map((r) => ({
      membership_id: r.id,
      person_id: r.person_id,
      display_name: pendingPeopleByMembershipId.get(r.id)?.display_name ?? 'Miembro',
      avatar_url: pendingPeopleByMembershipId.get(r.id)?.avatar_url ?? null,
      requested_at: r.created_at,
      status: r.status,
    }))

    const { data: inviteLinksData, error: linksError } = membership.role === 'coordinator'
      ? await scopedClient
          .from('household_invite_links')
          .select('id, token, status, revoked_at, expires_at, created_at, updated_at')
          .eq('household_id', householdId)
      : { data: [], error: null }

    if (linksError) {
      logFamilyHubQueryError('household_invite_links lookup', linksError, {
        household_id: householdId,
      })
      throw createHttpError(500, linksError.message, 'invite_links_lookup_failed')
    }

    const inviteLinks = (inviteLinksData || []).map((link) => ({
      id: link.id,
      token: membership.role === 'coordinator' ? link.token : null,
      revoked_at: link.revoked_at,
      expires_at: link.expires_at,
      created_at: link.created_at,
      is_active: link.status === 'active' && !link.revoked_at,
    }))

    let roleRequestsQuery = scopedClient
      .from('household_role_change_requests')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'pending')

    if (membership.role !== 'coordinator') {
      roleRequestsQuery = roleRequestsQuery.eq('requested_by_member_id', membership.id)
    }

    const { data: roleRequestsData, error: roleRequestsError } = await roleRequestsQuery

    if (roleRequestsError) {
      logFamilyHubQueryError('household_role_change_requests lookup', roleRequestsError, {
        household_id: householdId,
      })
      throw createHttpError(500, roleRequestsError.message, 'role_requests_lookup_failed')
    }

    const roleRequests = (roleRequestsData || []).map((request) => {
      const targetMember = membersByMembershipId.get(request.membership_id) || null
      const requestedByMember = membersByMembershipId.get(request.requested_by_member_id) || null

      return {
        ...mapRoleRequest(request),
        display_name: targetMember?.display_name ?? 'Miembro',
        member: targetMember,
        requested_by_member: requestedByMember,
      }
    })

    const currentMemberInfo = {
      membership_id: membership.id,
      person_id: person.id,
      role: membership.role,
      status: membership.status,
      ...getRolePermissions(membership.role),
    }

    const family = {
      household: {
        id: household.id,
        name: household.name,
        slug: household.slug,
        timezone: household.timezone,
        default_language: household.default_language,
      },
      current_member: currentMemberInfo,
      members: sortedMembers,
      join_requests: joinRequests,
      invite_links: inviteLinks,
      role_requests: roleRequests,
      limits: {
        max_members: null,
        max_pending_requests: null,
        max_households_per_user: MAX_HOUSEHOLD_MEMBERSHIPS,
      },
    }

    logFamilyHubDebug('response ready', {
      household_id: householdId,
      members_count: family.members.length,
      join_requests_count: family.join_requests.length,
      invite_links_count: family.invite_links.length,
      role_requests_count: family.role_requests.length,
    })

    return res.status(200).json({
      family,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    logFamilyHubQueryError('handler failed', error, {
      household_id: req.params?.household_id,
      statusCode,
      code: error.code,
      message: error.message,
    })

    return res.status(statusCode).json({
      error: error.message || 'No se pudo obtener el family hub.',
      code: error.code || 'family_hub/failed',
    })
  }
}

const getMembersList = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    const person = await getAuthenticatedPerson(scopedClient, req.user.id)
    if (!person) {
      throw createHttpError(409, 'No existe people para el usuario autenticado.', 'auth/person_not_found')
    }

    await requireActiveMembership(scopedClient, person.id, householdId)

    const { data: membersData, error: membersError } = await scopedClient
      .from('household_people_public')
      .select('membership_id, household_id, person_id, display_name, avatar_url, role, status, joined_at')
      .eq('household_id', householdId)
      .eq('status', 'active')

    if (membersError) {
      throw createHttpError(500, membersError.message, 'members_lookup_failed')
    }

    const members = sortMembersByRole(
      (membersData || []).map((member) =>
        mapMemberPublic({
          id: member.membership_id,
          household_id: member.household_id,
          person_id: member.person_id,
          display_name: member.display_name,
          avatar_url: member.avatar_url,
          role: member.role,
          status: member.status,
          joined_at: member.joined_at,
        }),
      ),
    )

    return res.status(200).json({
      members,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo obtener la lista de miembros.' : error.message,
      code: statusCode >= 500 ? 'members_list/failed' : error.code,
    })
  }
}

const getMemberDetail = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const membershipId = requireUuidParam(req.params?.membership_id, 'membership_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    const person = await getAuthenticatedPerson(scopedClient, req.user.id)
    if (!person) {
      throw createHttpError(409, 'No existe people para el usuario autenticado.', 'auth/person_not_found')
    }

    await requireActiveMembership(scopedClient, person.id, householdId)

    const { data: targetMembership, error: targetError } = await scopedClient
      .from('household_people_public')
      .select('membership_id, household_id, person_id, display_name, avatar_url, role, status, joined_at')
      .eq('membership_id', membershipId)
      .eq('household_id', householdId)
      .maybeSingle()

    if (targetError) {
      throw createHttpError(500, targetError.message, 'member_lookup_failed')
    }

    if (!targetMembership) {
      throw createHttpError(404, 'Miembro no encontrado.', 'member/not_found')
    }

    const member = mapMemberPublic({
      id: targetMembership.membership_id,
      household_id: targetMembership.household_id,
      person_id: targetMembership.person_id,
      display_name: targetMembership.display_name,
      avatar_url: targetMembership.avatar_url,
      role: targetMembership.role,
      status: targetMembership.status,
      joined_at: targetMembership.joined_at,
    })

    return res.status(200).json({
      member,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo obtener el detalle del miembro.' : error.message,
      code: statusCode >= 500 ? 'member_detail/failed' : error.code,
    })
  }
}

const updateMemberRole = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const membershipId = requireUuidParam(req.params?.membership_id, 'membership_id')
    const newRole = assertValidHouseholdRole(req.body?.role)
    const scopedClient = createSupabaseForToken(req.accessToken)

    const { data, error } = await scopedClient.rpc('change_household_member_role', {
      p_household_id: householdId,
      p_membership_id: membershipId,
      p_role: newRole,
    })

    if (error) {
      throw mapHouseholdRoleRpcError(error, 'role_update/failed')
    }

    const updated = data?.membership
    if (!updated?.id) {
      throw createHttpError(500, 'La RPC no devolvio membership.', 'membership/invalid_rpc_response')
    }

    const { data: publicMember, error: publicMemberError } = await scopedClient
      .from('household_people_public')
      .select('membership_id, household_id, person_id, display_name, avatar_url, role, status, joined_at')
      .eq('membership_id', updated.id)
      .maybeSingle()

    if (publicMemberError) {
      throw createHttpError(500, publicMemberError.message, 'member_lookup_failed')
    }

    return res.status(200).json({
      member: mapMemberPublicWithHousehold({
        id: updated.id,
        household_id: updated.household_id,
        person_id: updated.person_id,
        display_name: publicMember?.display_name,
        avatar_url: publicMember?.avatar_url,
        role: updated.role,
        status: updated.status,
        joined_at: updated.joined_at,
        left_at: updated.left_at,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      }),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo cambiar el rol.' : error.message,
      code: statusCode >= 500 ? 'role_update/failed' : error.code,
    })
  }
}

const createRoleRequest = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const requestedRole = assertValidHouseholdRole(req.body?.requested_role)
    const reason = normalizeString(req.body?.reason) || null
    const scopedClient = createSupabaseForToken(req.accessToken)

    const { data, error } = await scopedClient.rpc('create_household_role_change_request', {
      p_household_id: householdId,
      p_requested_role: requestedRole,
      p_reason: reason,
    })

    if (error) {
      throw mapHouseholdRoleRpcError(error, 'role_request/create_failed')
    }

    if (!data?.role_request) {
      throw createHttpError(500, 'La RPC no devolvio role_request.', 'role_request/invalid_rpc_response')
    }

    return res.status(201).json({
      role_request: mapRoleRequest(data.role_request),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo crear la solicitud de rol.' : error.message,
      code: statusCode >= 500 ? 'role_request/create_failed' : error.code,
    })
  }
}

const listRoleRequests = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const status = normalizeString(req.query?.status) || 'pending'

    if (!['pending', 'all'].includes(status)) {
      throw createHttpError(400, 'status invalido. Debe ser pending o all.', 'role_request/invalid_status')
    }

    const scopedClient = createSupabaseForToken(req.accessToken)
    const person = await getAuthenticatedPerson(scopedClient, req.user.id)
    if (!person) {
      throw createHttpError(409, 'No existe people para el usuario autenticado.', 'auth/person_not_found')
    }

    const membership = await requireActiveMembership(scopedClient, person.id, householdId)
    let query = scopedClient
      .from('household_role_change_requests')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })

    if (status === 'pending') {
      query = query.eq('status', 'pending')
    }

    if (membership.role !== 'coordinator') {
      query = query.eq('requested_by_member_id', membership.id)
    }

    const { data, error } = await query

    if (error) {
      throw createHttpError(500, error.message, 'role_requests/list_failed')
    }

    return res.status(200).json({
      role_requests: (data || []).map(mapRoleRequest),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudieron obtener las solicitudes de rol.' : error.message,
      code: statusCode >= 500 ? 'role_requests/list_failed' : error.code,
    })
  }
}

const approveRoleRequest = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const requestId = requireUuidParam(req.params?.request_id, 'request_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    const { data, error } = await scopedClient.rpc('approve_household_role_change_request', {
      p_household_id: householdId,
      p_request_id: requestId,
    })

    if (error) {
      throw mapHouseholdRoleRpcError(error, 'role_request/approve_failed')
    }

    return res.status(200).json({
      role_request: mapRoleRequest(data?.role_request),
      membership: data?.membership || null,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo aprobar la solicitud de rol.' : error.message,
      code: statusCode >= 500 ? 'role_request/approve_failed' : error.code,
    })
  }
}

const rejectRoleRequest = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const requestId = requireUuidParam(req.params?.request_id, 'request_id')
    const resolutionNote = normalizeString(req.body?.resolution_note) || null
    const scopedClient = createSupabaseForToken(req.accessToken)

    const { data, error } = await scopedClient.rpc('reject_household_role_change_request', {
      p_household_id: householdId,
      p_request_id: requestId,
      p_resolution_note: resolutionNote,
    })

    if (error) {
      throw mapHouseholdRoleRpcError(error, 'role_request/reject_failed')
    }

    return res.status(200).json({
      role_request: mapRoleRequest(data?.role_request),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo rechazar la solicitud de rol.' : error.message,
      code: statusCode >= 500 ? 'role_request/reject_failed' : error.code,
    })
  }
}

const cancelRoleRequest = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const requestId = requireUuidParam(req.params?.request_id, 'request_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    const { data, error } = await scopedClient.rpc('cancel_household_role_change_request', {
      p_household_id: householdId,
      p_request_id: requestId,
    })

    if (error) {
      throw mapHouseholdRoleRpcError(error, 'role_request/cancel_failed')
    }

    return res.status(200).json({
      role_request: mapRoleRequest(data?.role_request),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo cancelar la solicitud de rol.' : error.message,
      code: statusCode >= 500 ? 'role_request/cancel_failed' : error.code,
    })
  }
}

module.exports = {
  createHousehold,
  createHouseholdInvitation,
  createRoleRequest,
  finalizeHouseholdMember,
  setActiveHousehold,
  validateInvitation,
  getFamilyHub,
  getMembersList,
  getMemberDetail,
  updateMemberRole,
  listRoleRequests,
  approveRoleRequest,
  rejectRoleRequest,
  cancelRoleRequest,
}
