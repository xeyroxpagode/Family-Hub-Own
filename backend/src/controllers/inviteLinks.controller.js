const { createSupabaseForToken } = require('../config/supabase')
const { createHttpError } = require('../lib/httpErrors')

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MEMBERSHIP_ROLES = new Set(['coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest'])

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const requireToken = (value) => {
  const token = normalizeString(value)

  if (!token) {
    throw createHttpError(400, 'token es obligatorio.', 'invite_link/token_required')
  }

  return token
}

const requireMembershipRole = (value) => {
  const role = normalizeString(value)

  if (!MEMBERSHIP_ROLES.has(role)) {
    throw createHttpError(400, 'role invalido.', 'membership/invalid_role')
  }

  return role
}

const requireUuidParam = (value, name) => {
  const normalized = normalizeString(value)

  if (!UUID_PATTERN.test(normalized)) {
    throw createHttpError(400, `${name} invalido.`, `${name}/invalid`)
  }

  return normalized
}

const mapInviteLinkRpcError = (error, fallbackCode) => {
  const message = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase()

  if (error?.code === '28000' || message.includes('not_authenticated')) {
    return createHttpError(401, 'No autenticado.', 'auth/unauthorized')
  }

  if (message.includes('person_not_found')) {
    return createHttpError(409, 'No existe people para el usuario autenticado.', 'auth/person_not_found')
  }

  if (error?.code === '42501' || message.includes('not_household_coordinator')) {
    return createHttpError(403, 'Solo un coordinator activo puede administrar solicitudes.', 'household/not_coordinator')
  }

  if (message.includes('invite_link_not_found')) {
    return createHttpError(404, 'Invite link no encontrado.', 'invite_link/not_found')
  }

  if (message.includes('invite_link_already_revoked')) {
    return createHttpError(409, 'Invite link ya revocado.', 'invite_link/already_revoked')
  }

  if (message.includes('invite_link_invalid_or_expired')) {
    return createHttpError(410, 'Invite link invalido o expirado.', 'invite_link/invalid_or_expired')
  }

  if (message.includes('membership_not_found')) {
    return createHttpError(404, 'Solicitud no encontrada.', 'membership/not_found')
  }

  if (message.includes('membership_not_pending')) {
    return createHttpError(409, 'La solicitud ya no esta pending.', 'membership/not_pending')
  }

  if (message.includes('invalid_membership_role')) {
    return createHttpError(400, 'role invalido.', 'membership/invalid_role')
  }

  if (message.includes('invite_token_collision_retry_exhausted')) {
    return createHttpError(500, 'No se pudo crear el invite link.', 'invite_link/create_failed')
  }

  if (error?.code === '22023' || message.includes('household_limit_reached')) {
    return createHttpError(409, 'No puedes ser miembro de mas de 5 hogares activos o pendientes.', 'household/limit_reached')
  }

  return createHttpError(500, 'No se pudo procesar el invite link.', fallbackCode)
}

const extractInviteLink = (data) => {
  if (!data?.invite_link) {
    throw createHttpError(500, 'La RPC no devolvio invite_link.', 'invite_link/invalid_rpc_response')
  }

  return data.invite_link
}

const extractJoinRequest = (data) => {
  const result = normalizeString(data?.result)
  const membership = data?.membership

  if (!result || !membership) {
    throw createHttpError(500, 'La RPC no devolvio membership.', 'invite_link/invalid_rpc_response')
  }

  if (!['pending_created', 'pending_existing'].includes(result)) {
    throw createHttpError(409, 'La persona ya tiene una membership no pending en este hogar.', 'membership/not_pending')
  }

  if (membership.status !== 'pending' || membership.role !== null) {
    throw createHttpError(500, 'La RPC devolvio una membership incompatible con pending.', 'invite_link/invalid_rpc_response')
  }

  return {
    result,
    membership,
  }
}

const ensurePendingMembershipInHousehold = async ({ client, householdId, membershipId }) => {
  const { data, error } = await client
    .from('household_members')
    .select('id, household_id, status')
    .eq('id', membershipId)
    .eq('household_id', householdId)
    .maybeSingle()

  if (error) {
    throw mapInviteLinkRpcError(error, 'membership/lookup_failed')
  }

  if (!data) {
    throw createHttpError(404, 'Solicitud no encontrada.', 'membership/not_found')
  }

  if (data.status !== 'pending') {
    throw createHttpError(409, 'La solicitud ya no esta pending.', 'membership/not_pending')
  }
}

const createInviteLink = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const scopedClient = createSupabaseForToken(req.accessToken)
    const { data, error } = await scopedClient.rpc('create_household_invite_link', {
      p_household_id: householdId,
    })

    if (error) {
      throw mapInviteLinkRpcError(error, 'invite_link/create_failed')
    }

    return res.status(201).json({
      invite_link: extractInviteLink(data),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo procesar el invite link.' : error.message,
      code: statusCode >= 500 ? 'invite_link/failed' : error.code,
    })
  }
}

const revokeInviteLink = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    requireUuidParam(req.params?.household_id, 'household_id')
    const inviteLinkId = requireUuidParam(req.params?.invite_link_id, 'invite_link_id')
    const scopedClient = createSupabaseForToken(req.accessToken)
    const { data, error } = await scopedClient.rpc('revoke_household_invite_link', {
      p_invite_link_id: inviteLinkId,
    })

    if (error) {
      throw mapInviteLinkRpcError(error, 'invite_link/revoke_failed')
    }

    return res.status(200).json({
      invite_link: extractInviteLink(data),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo procesar el invite link.' : error.message,
      code: statusCode >= 500 ? 'invite_link/failed' : error.code,
    })
  }
}

const joinInviteLink = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const token = requireToken(req.body?.token)
    const scopedClient = createSupabaseForToken(req.accessToken)
    const { data, error } = await scopedClient.rpc('join_household_by_invite_token', {
      p_token: token,
    })

    if (error) {
      throw mapInviteLinkRpcError(error, 'invite_link/join_failed')
    }

    return res.status(200).json({
      join_request: extractJoinRequest(data),
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo procesar el invite link.' : error.message,
      code: statusCode >= 500 ? 'invite_link/failed' : error.code,
    })
  }
}

const listJoinRequests = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const scopedClient = createSupabaseForToken(req.accessToken)
    const { data, error } = await scopedClient
      .from('household_members')
      .select(
        'id, household_id, person_id, role, status, joined_at, left_at, household_onboarding_status, household_onboarding_completed_at, created_at, updated_at',
      )
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      throw mapInviteLinkRpcError(error, 'join_requests/list_failed')
    }

    return res.status(200).json({
      join_requests: data ?? [],
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo procesar la solicitud.' : error.message,
      code: statusCode >= 500 ? 'join_requests/failed' : error.code,
    })
  }
}

const approveJoinRequest = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const membershipId = requireUuidParam(req.params?.membership_id, 'membership_id')
    const role = requireMembershipRole(req.body?.role)
    const scopedClient = createSupabaseForToken(req.accessToken)

    await ensurePendingMembershipInHousehold({ client: scopedClient, householdId, membershipId })

    const { data, error } = await scopedClient.rpc('approve_household_member', {
      p_membership_id: membershipId,
      p_role: role,
    })

    if (error) {
      throw mapInviteLinkRpcError(error, 'join_requests/approve_failed')
    }

    return res.status(200).json({
      membership: data?.membership,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo procesar la solicitud.' : error.message,
      code: statusCode >= 500 ? 'join_requests/failed' : error.code,
    })
  }
}

const rejectJoinRequest = async (req, res) => {
  try {
    if (!req.user?.id || !req.accessToken) {
      throw createHttpError(401, 'No autenticado.', 'auth/unauthorized')
    }

    const householdId = requireUuidParam(req.params?.household_id, 'household_id')
    const membershipId = requireUuidParam(req.params?.membership_id, 'membership_id')
    const scopedClient = createSupabaseForToken(req.accessToken)

    await ensurePendingMembershipInHousehold({ client: scopedClient, householdId, membershipId })

    const { data, error } = await scopedClient.rpc('reject_household_member', {
      p_membership_id: membershipId,
    })

    if (error) {
      throw mapInviteLinkRpcError(error, 'join_requests/reject_failed')
    }

    return res.status(200).json({
      membership: data?.membership,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: statusCode >= 500 ? 'No se pudo procesar la solicitud.' : error.message,
      code: statusCode >= 500 ? 'join_requests/failed' : error.code,
    })
  }
}

module.exports = {
  approveJoinRequest,
  createInviteLink,
  joinInviteLink,
  listJoinRequests,
  rejectJoinRequest,
  revokeInviteLink,
}
