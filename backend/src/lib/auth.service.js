const {
  createSupabaseForToken,
  hasSupabaseAdmin,
  supabaseAdmin,
  supabaseAuth,
} = require('../config/supabase')
const { createHttpError } = require('./httpErrors')
const { isSupabaseTimeout, createSupabaseTimeoutError } = require('./supabaseErrors')

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice('Bearer '.length).trim()
}

const validateRegisterInput = ({ email, password, display_name: displayName }) => {
  if (!normalizeString(email)) {
    throw createHttpError(400, 'email es obligatorio.', 'email_required')
  }

  if (!password) {
    throw createHttpError(400, 'password es obligatorio.', 'password_required')
  }

  if (String(password).length < 8) {
    throw createHttpError(422, 'password debe tener al menos 8 caracteres.', 'password_too_short')
  }

  if (!normalizeString(displayName)) {
    throw createHttpError(422, 'display_name es obligatorio.', 'display_name_required')
  }
}

const validateLoginInput = ({ email, password }) => {
  if (!normalizeString(email)) {
    throw createHttpError(400, 'email es obligatorio.', 'email_required')
  }

  if (!password) {
    throw createHttpError(400, 'password es obligatorio.', 'password_required')
  }
}

const getAuthenticatedUser = async (accessToken) => {
  if (!accessToken) {
    throw createHttpError(401, 'Token requerido.', 'token_required')
  }

  const { data, error } = await supabaseAuth.auth.getUser(accessToken)

  if (isSupabaseTimeout(error)) {
    throw createSupabaseTimeoutError()
  }

  if (error || !data.user) {
    throw createHttpError(401, 'Token invalido o expirado.', 'token_invalid')
  }

  return data.user
}

const getPersonByAuthUserId = async (client, authUserId) => {
  const { data, error } = await client
    .from('people')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) {
    throw createHttpError(500, error.message, 'person_lookup_failed')
  }

  return data
}

const createPersonForUser = async ({ user, session, displayName }) => {
  const payload = {
    auth_user_id: user.id,
    display_name: normalizeString(displayName) || user.email || 'HomePlus user',
    default_language: 'es-419',
  }

  const hasSessionClient = Boolean(session?.access_token)
  const client = supabaseAdmin ?? (hasSessionClient ? createSupabaseForToken(session.access_token) : null)

  if (!client) {
    throw createHttpError(
      500,
      'No se pudo crear people: falta SUPABASE_SERVICE_ROLE_KEY y Supabase no devolvio session.',
      'admin_client_required',
    )
  }

  const existingPerson = await getPersonByAuthUserId(client, user.id)

  if (existingPerson) {
    return existingPerson
  }

  const { data, error } = await client.from('people').insert(payload).select('*').single()

  if (error) {
    if (error.code === '23505') {
      const person = await getPersonByAuthUserId(client, user.id)

      if (person) {
        return person
      }
    }

    if (!supabaseAdmin && hasSessionClient && error.code === '42501') {
      const { data: rpcData, error: rpcError } = await client
        .rpc('create_person_for_current_user', { p_display_name: payload.display_name })

      if (!rpcError && rpcData) {
        return rpcData
      }

      if (rpcError?.code === 'PGRST202') {
        throw createHttpError(
          500,
          'Falta aplicar la migracion Supabase 202607080002_create_person_for_current_user_rpc.sql en la base configurada.',
          'person_create_rpc_missing',
        )
      }

      throw createHttpError(500, rpcError?.message ?? error.message, 'person_create_failed')
    }

    throw createHttpError(500, error.message, 'person_create_failed')
  }

  return data
}

const deleteAuthUserIfPossible = async (userId) => {
  if (!userId || !hasSupabaseAdmin) {
    return false
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

  return !error
}

module.exports = {
  createPersonForUser,
  deleteAuthUserIfPossible,
  getAuthenticatedUser,
  getBearerToken,
  getPersonByAuthUserId,
  normalizeString,
  validateLoginInput,
  validateRegisterInput,
}
