const { supabase, supabaseAdmin } = require('../config/supabase')
const { loadSharp } = require('../lib/sharp')
const { createPersonForUser, getPersonByAuthUserId } = require('../lib/auth.service')
const { createHttpError, sendError } = require('../lib/httpErrors')

const AVATAR_BUCKET = 'avatars'
const AVATAR_MAX_BYTES = 500 * 1024

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '')

const ensurePersonForRequest = async (req, client) => {
  const userId = req.user?.id

  if (!userId) {
    throw createHttpError(401, 'Token invalido o expirado.', 'unauthorized')
  }

  const existingPerson = await getPersonByAuthUserId(client, userId)
  if (existingPerson) return existingPerson

  return createPersonForUser({
    user: req.user,
    session: { access_token: req.accessToken },
    displayName: req.user?.user_metadata?.display_name ?? req.user?.user_metadata?.nombre ?? req.user?.email,
  })
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

  throw createHttpError(422, 'No se pudo comprimir el avatar por debajo de 500KB. Prueba con una imagen mas liviana.')
}

const uploadAvatar = async (personId, file) => {
  const optimizedBuffer = await compressAvatarBuffer(file.buffer)
  const avatarPath = `${personId}/avatar.webp`

  const client = supabaseAdmin || supabase

  const { error: uploadError } = await client.storage.from(AVATAR_BUCKET).upload(avatarPath, optimizedBuffer, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '3600',
  })

  if (uploadError) {
    throw createHttpError(500, `No se pudo subir el avatar: ${uploadError.message}`)
  }

  const { data: publicUrlData } = client.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath)

  return {
    avatarPath,
    avatarUrl: publicUrlData.publicUrl,
  }
}

const getMe = async (req, res) => {
  try {
    const client = supabaseAdmin || supabase
    const person = await ensurePersonForRequest(req, client)

    return res.status(200).json({
      person,
    })
  } catch (error) {
    return sendError(res, error, 'Error inesperado al obtener el perfil.')
  }
}

const updateMe = async (req, res) => {
  try {
    const client = supabaseAdmin || supabase
    const person = await ensurePersonForRequest(req, client)

    const displayName = normalizeString(req.body.display_name)
    const firstName = normalizeString(req.body.first_name) || null
    const lastName = normalizeString(req.body.last_name) || null
    const phone = normalizeString(req.body.phone) || null
    const dateOfBirth = req.body.date_of_birth || null

    if (req.body.display_name !== undefined && !displayName) {
      throw createHttpError(422, 'display_name no puede estar vacio.', 'display_name_required')
    }

    if (dateOfBirth !== null && dateOfBirth !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(dateOfBirth)) {
        throw createHttpError(422, 'date_of_birth debe estar en formato YYYY-MM-DD.', 'invalid_date_of_birth')
      }
    }

    if (displayName === '' && firstName === '' && lastName === '' && phone === '' && dateOfBirth === null) {
      return res.status(400).json({
        error: 'No hay campos para actualizar.',
      })
    }

    const updatePayload = {}

    if (req.body.display_name !== undefined) {
      updatePayload.display_name = displayName
    }

    if (req.body.first_name !== undefined) {
      updatePayload.first_name = firstName
    }

    if (req.body.last_name !== undefined) {
      updatePayload.last_name = lastName
    }

    if (req.body.phone !== undefined) {
      updatePayload.phone = phone
    }

    if (req.body.date_of_birth !== undefined) {
      updatePayload.date_of_birth = dateOfBirth === '' ? null : dateOfBirth
    }

    const { data, error } = await client
      .from('people')
      .update(updatePayload)
      .eq('id', person.id)
      .select('*')
      .single()

    if (error) {
      throw createHttpError(500, error.message, 'profile_update_failed')
    }

    return res.status(200).json({
      person: data,
    })
  } catch (error) {
    return sendError(res, error, 'Error inesperado al actualizar el perfil.')
  }
}

const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      throw createHttpError(400, 'No se recibio ningun archivo.', 'avatar_file_required')
    }

    const client = supabaseAdmin || supabase
    const person = await ensurePersonForRequest(req, client)

    const avatarResult = await uploadAvatar(person.id, req.file)

    const { data, error } = await client
      .from('people')
      .update({ avatar_url: avatarResult.avatarUrl })
      .eq('id', person.id)
      .select('*')
      .single()

    if (error) {
      throw createHttpError(500, error.message, 'avatar_update_failed')
    }

    return res.status(200).json({
      person: data,
      avatar_url: avatarResult.avatarUrl,
    })
  } catch (error) {
    return sendError(res, error, 'Error inesperado al actualizar el avatar.')
  }
}

const getMyHouseholds = async (req, res) => {
  try {
    const client = supabaseAdmin || supabase
    const person = await ensurePersonForRequest(req, client)

    const { data: memberships, error: membershipsError } = await client
      .from('household_members')
      .select('id, household_id, role, status, created_at')
      .eq('person_id', person.id)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })

    if (membershipsError) {
      throw createHttpError(500, membershipsError.message, 'memberships_lookup_failed')
    }

    const householdIds = memberships.map((m) => m.household_id)

    const { data: householdsData, error: householdsError } = await client
      .from('households')
      .select('id, name')
      .in('id', householdIds)

    if (householdsError) {
      throw createHttpError(500, householdsError.message, 'households_lookup_failed')
    }

    const householdMap = new Map(
      (householdsData ?? []).map((h) => [h.id, h.name]),
    )

    const households = memberships
      .filter((m) => householdMap.has(m.household_id))
      .map((m) => ({
        household_id: m.household_id,
        household_name: householdMap.get(m.household_id) ?? 'Hogar',
        role: m.role,
        status: m.status,
      }))

    return res.status(200).json({
      households,
    })
  } catch (error) {
    return sendError(res, error, 'Error inesperado al obtener los hogares.')
  }
}

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
  getMyHouseholds,
}
