const { supabase } = require('../config/supabase')
const { loadSharp } = require('../lib/sharp')

const AVATAR_BUCKET = 'avatars'
const AVATAR_MAX_BYTES = 500 * 1024
const NOTIFICATION_PREF_KEYS = ['feed', 'tareas', 'finanzas', 'gps', 'geni']

const createHttpError = (statusCode, message) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const parseNotificationPrefs = (rawValue) => {
  if (rawValue === undefined) {
    return undefined
  }

  let parsedValue

  try {
    parsedValue = JSON.parse(rawValue)
  } catch {
    throw createHttpError(400, 'notification_prefs debe ser un JSON valido.')
  }

  if (!isPlainObject(parsedValue)) {
    throw createHttpError(422, 'notification_prefs debe ser un objeto JSON.')
  }

  for (const key of Object.keys(parsedValue)) {
    if (!NOTIFICATION_PREF_KEYS.includes(key)) {
      throw createHttpError(422, `notification_prefs contiene una clave invalida: ${key}.`)
    }

    if (typeof parsedValue[key] !== 'boolean') {
      throw createHttpError(422, `notification_prefs.${key} debe ser boolean.`)
    }
  }

  return parsedValue
}

const compressAvatarBuffer = async (inputBuffer) => {
  const sharp = loadSharp()
  let quality = 80

  while (quality >= 30) {
    const outputBuffer = await sharp(inputBuffer).rotate().webp({ quality }).toBuffer()

    if (outputBuffer.length <= AVATAR_MAX_BYTES) {
      return outputBuffer
    }

    quality -= 10
  }

  throw createHttpError(
    422,
    'No se pudo comprimir el avatar por debajo de 500KB. Prueba con una imagen mas liviana.',
  )
}

const uploadAvatar = async (userId, file) => {
  const optimizedBuffer = await compressAvatarBuffer(file.buffer)
  const avatarPath = `${userId}/avatar.webp`

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(avatarPath, optimizedBuffer, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '3600',
  })

  if (uploadError) {
    throw createHttpError(500, `No se pudo subir el avatar: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath)

  return {
    avatarPath,
    avatarUrl: publicUrlData.publicUrl,
  }
}

const updateMe = async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Token invalido o expirado' })
    }

    const currentMetadata = isPlainObject(req.user.user_metadata) ? req.user.user_metadata : {}
    const currentPrefs = isPlainObject(currentMetadata.notification_prefs)
      ? currentMetadata.notification_prefs
      : {}

    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : undefined
    const notificationPrefsPatch = parseNotificationPrefs(req.body.notification_prefs)

    if (req.body.nombre !== undefined && !nombre) {
      throw createHttpError(422, 'nombre no puede estar vacio.')
    }

    let avatarPatch = null

    if (req.file) {
      avatarPatch = await uploadAvatar(userId, req.file)
    }

    if (nombre === undefined && notificationPrefsPatch === undefined && !avatarPatch) {
      return res.status(400).json({
        error: 'No hay campos para actualizar.',
      })
    }

    const mergedMetadata = {
      ...currentMetadata,
      ...(nombre !== undefined ? { nombre } : {}),
      ...(notificationPrefsPatch !== undefined
        ? {
            notification_prefs: {
              ...currentPrefs,
              ...notificationPrefsPatch,
            },
          }
        : {}),
      ...(avatarPatch
        ? {
            avatar_url: avatarPatch.avatarUrl,
            avatar_path: avatarPatch.avatarPath,
          }
        : {}),
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: mergedMetadata,
    })

    if (error || !data.user) {
      throw createHttpError(500, error?.message ?? 'No se pudo actualizar el usuario.')
    }

    return res.status(200).json({
      usuario: data.user,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return res.status(statusCode).json({
      error: error.message ?? 'Error inesperado al actualizar el perfil.',
    })
  }
}

module.exports = {
  updateMe,
}
