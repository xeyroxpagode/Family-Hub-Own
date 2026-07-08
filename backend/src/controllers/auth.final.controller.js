const { createSupabaseForToken, supabaseAuth } = require('../config/supabase')
const {
  createPersonForUser,
  deleteAuthUserIfPossible,
  getAuthenticatedUser,
  getBearerToken,
  normalizeString,
  validateLoginInput,
  validateRegisterInput,
} = require('../lib/auth.service')
const { createHttpError, sendError } = require('../lib/httpErrors')
const { buildMe } = require('../lib/me.service')
const { isSupabaseTimeout, createSupabaseTimeoutError } = require('../lib/supabaseErrors')

const register = async (req, res) => {
  let createdUserId = null

  try {
    validateRegisterInput(req.body)

    const email = normalizeString(req.body.email)
    const password = String(req.body.password)
    const displayName = normalizeString(req.body.display_name)

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })

    if (error) {
      throw createHttpError(400, error.message, 'auth_register_failed')
    }

    if (!data.user) {
      throw createHttpError(500, 'Supabase no devolvio user al registrar.', 'auth_user_missing')
    }

    createdUserId = data.user.id

    const person = await createPersonForUser({
      user: data.user,
      session: data.session,
      displayName,
    })

    return res.status(201).json({
      user: data.user,
      person,
      session: data.session,
      requires_email_confirmation: !data.session,
    })
  } catch (error) {
    if (createdUserId && error.code === 'person_create_failed') {
      const rollbackSucceeded = await deleteAuthUserIfPossible(createdUserId)

      if (!rollbackSucceeded) {
        error.message = `${error.message}. No se pudo hacer rollback del auth user; revisar SUPABASE_SERVICE_ROLE_KEY.`
      }
    }

    return sendError(res, error, 'Error inesperado al registrar usuario.')
  }
}

const login = async (req, res) => {
  try {
    validateLoginInput(req.body)

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: normalizeString(req.body.email),
      password: String(req.body.password),
    })

    if (isSupabaseTimeout(error)) {
      throw createSupabaseTimeoutError()
    }

    if (error) {
      throw createHttpError(401, error.message, 'auth_login_failed')
    }

    if (!data.user || !data.session?.access_token) {
      throw createHttpError(500, 'Supabase no devolvio una sesion valida.', 'auth_session_missing')
    }

    await createPersonForUser({
      user: data.user,
      session: data.session,
      displayName: data.user.user_metadata?.display_name ?? data.user.email,
    })

    const authMe = await buildMe({
      user: data.user,
      accessToken: data.session.access_token,
    })

    return res.status(200).json({
      user: data.user,
      person: authMe.person,
      session: data.session,
      me: authMe,
    })
  } catch (error) {
    return sendError(res, error, 'Error inesperado al iniciar sesion.')
  }
}

const me = async (req, res) => {
  try {
    const accessToken = getBearerToken(req)
    const user = req.user ?? (await getAuthenticatedUser(accessToken))
    const payload = await buildMe({ user, accessToken })

    return res.status(200).json(payload)
  } catch (error) {
    return sendError(res, error, 'Error inesperado al obtener la sesion actual.')
  }
}

const refresh = async (req, res) => {
  try {
    const refreshToken = normalizeString(req.body?.refresh_token)

    if (!refreshToken) {
      throw createHttpError(400, 'refresh_token es obligatorio.', 'refresh_token_required')
    }

    const { data, error } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error) {
      throw createHttpError(401, error.message, 'auth_refresh_failed')
    }

    return res.status(200).json({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    return sendError(res, error, 'Error inesperado al refrescar sesion.')
  }
}

const logout = async (req, res) => {
  const accessToken = getBearerToken(req)

  if (!accessToken) {
    return res.status(200).json({ success: true })
  }

  const scopedClient = createSupabaseForToken(accessToken)
  await scopedClient.auth.signOut()

  return res.status(200).json({ success: true })
}

module.exports = {
  login,
  logout,
  me,
  refresh,
  register,
}
