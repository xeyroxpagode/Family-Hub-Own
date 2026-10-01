const { createClient } = require('@supabase/supabase-js')

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  return value.trim().replace(/^['"]+|['"]+$/g, '')
}

const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL)
const supabaseAnonKey = normalizeEnvValue(process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY)
const supabaseServiceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las llaves de Supabase en el archivo .env')
}

const baseClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
}

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, baseClientOptions)
const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, baseClientOptions)
  : null

const createSupabaseForToken = (accessToken) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    ...baseClientOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

module.exports = {
  supabase: supabaseAuth,
  supabaseAuth,
  supabaseAdmin,
  createSupabaseForToken,
  hasSupabaseAdmin: Boolean(supabaseAdmin),
}
