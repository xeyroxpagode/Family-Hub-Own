const isSupabaseTimeout = (err) => {
  if (!err) return false

  if (err.name === 'ConnectTimeoutError') return true

  if (err.cause) {
    if (err.cause.code === 'UND_ERR_CONNECT_TIMEOUT') return true
    if (err.cause.name === 'ConnectTimeoutError') return true
  }

  if (err.message) {
    if (err.message.includes('UND_ERR_CONNECT_TIMEOUT')) return true
    if (err.message.includes('ConnectTimeoutError')) return true
    if (err.message.includes('fetch failed') && err.message.includes('supabase.co')) return true
  }

  return false
}

const createSupabaseTimeoutError = () => {
  const error = new Error('No pudimos conectar con el servicio de autenticacion. Probá de nuevo en unos segundos.')
  error.statusCode = 503
  error.code = 'supabase_unreachable'
  return error
}

module.exports = {
  createSupabaseTimeoutError,
  isSupabaseTimeout,
}