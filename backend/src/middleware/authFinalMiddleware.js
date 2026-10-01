const { getAuthenticatedUser, getBearerToken } = require('../lib/auth.service')

const authFinalMiddleware = async (req, res, next) => {
  try {
    const token = getBearerToken(req)
    req.user = await getAuthenticatedUser(token)
    req.accessToken = token
    next()
  } catch (error) {
    return res.status(error.statusCode ?? 401).json({
      error: error.message ?? 'Token invalido o expirado.',
      ...(error.code ? { code: error.code } : {}),
    })
  }
}

module.exports = authFinalMiddleware
