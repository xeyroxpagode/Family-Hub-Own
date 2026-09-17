const { createHttpError } = require('../lib/httpErrors')

const STALE_AFTER_MINUTES = 10
const HISTORY_RETENTION_DAYS = 3
const MAX_ACTIVE_PLACES = 10
const SHARE_MODES = new Set(['off', 'foreground', 'background'])
const FOREGROUND_MIN_INTERVAL_MS = 15 * 1000
const FOREGROUND_MIN_DISTANCE_METERS = 15
const BACKGROUND_MIN_INTERVAL_MS = 60 * 1000
const BACKGROUND_MIN_DISTANCE_METERS = 75

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const validateCoordinates = ({ latitude, longitude, accuracyMeters }) => {
  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
    throw createHttpError(400, 'Latitud invalida.', 'invalid_location')
  }
  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
    throw createHttpError(400, 'Longitud invalida.', 'invalid_location')
  }
  if (accuracyMeters !== null && (!isFiniteNumber(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 10000)) {
    throw createHttpError(400, 'Precision GPS invalida.', 'invalid_location')
  }
}

const normalizeDeviceRecordedAt = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw createHttpError(400, 'Fecha de ubicacion invalida.', 'invalid_location_timestamp')
  const now = Date.now()
  if (parsed.getTime() > now + 5 * 60 * 1000 || parsed.getTime() < now - 7 * 24 * 60 * 60 * 1000) {
    throw createHttpError(400, 'La fecha de ubicacion esta fuera del rango permitido.', 'invalid_location_timestamp')
  }
  return parsed.toISOString()
}

const normalizeSharingMode = (payload = {}) => {
  if (payload.sharing_mode !== undefined) {
    if (typeof payload.sharing_mode !== 'string' || !SHARE_MODES.has(payload.sharing_mode)) {
      throw createHttpError(400, 'Modo de compartir invalido.', 'invalid_sharing_mode')
    }
    return payload.sharing_mode
  }
  // Compatibilidad con el cliente anterior: los clientes nuevos envian sharing_mode.
  return payload.sharing_enabled === false ? 'off' : 'foreground'
}

const distanceMeters = (from, to) => {
  if (!from || !to) return Number.POSITIVE_INFINITY
  const radians = (value) => (value * Math.PI) / 180
  const earthRadius = 6371000
  const latDelta = radians(to.latitude - from.latitude)
  const longDelta = radians(to.longitude - from.longitude)
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longDelta / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const isStale = (updatedAt) => !updatedAt || Date.now() - new Date(updatedAt).getTime() > STALE_AFTER_MINUTES * 60 * 1000

const getCurrentLocation = async (context) => {
  const { data, error } = await context.client
    .from('presence_member_locations')
    .select('id, sharing_enabled, sharing_mode, history_enabled, latitude, longitude, accuracy_meters, recorded_at, updated_at')
    .eq('membership_id', context.membershipId)
    .maybeSingle()
  if (error) throw createHttpError(500, error.message, 'presence_location_lookup_failed')
  return data
}

const purgeExpiredSamples = async (context) => {
  // A scheduled production job invokes the same database function; calling it
  // here also guarantees cleanup during normal active use.
  await context.client.rpc('purge_expired_location_samples')
}

const shouldPublish = ({ previous, next, mode, now }) => {
  if (!previous?.sharing_enabled || !isFiniteNumber(previous.latitude) || !isFiniteNumber(previous.longitude)) return true
  const elapsed = Math.max(0, now - new Date(previous.updated_at).getTime())
  const moved = distanceMeters(previous, next)
  const minInterval = mode === 'background' ? BACKGROUND_MIN_INTERVAL_MS : FOREGROUND_MIN_INTERVAL_MS
  const minDistance = mode === 'background' ? BACKGROUND_MIN_DISTANCE_METERS : FOREGROUND_MIN_DISTANCE_METERS
  return elapsed >= minInterval || moved >= minDistance
}

const getMembership = async (context, membershipId) => {
  const { data, error } = await context.client
    .from('household_people_public')
    .select('membership_id, household_id, person_id, display_name, avatar_url, role, status')
    .eq('household_id', context.householdId)
    .eq('membership_id', membershipId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw createHttpError(500, error.message, 'presence_members_lookup_failed')
  if (!data) throw createHttpError(404, 'Integrante no encontrado en el hogar activo.', 'presence_member_not_found')
  return data
}

const toLocationDto = (location) => {
  if (!location || !location.sharing_enabled || !isFiniteNumber(location.latitude) || !isFiniteNumber(location.longitude)) return null
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy_meters: location.accuracy_meters,
    recorded_at: location.recorded_at,
    updated_at: location.updated_at,
  }
}

const listLocations = async (context) => {
  const [{ data: members, error: membersError }, { data: locations, error: locationsError }] = await Promise.all([
    context.client.from('household_people_public').select('person_id, household_id, membership_id, display_name, avatar_url, role, status').eq('household_id', context.householdId).eq('status', 'active'),
    context.client.from('presence_member_locations').select('id, household_id, membership_id, person_id, sharing_enabled, sharing_mode, history_enabled, latitude, longitude, accuracy_meters, recorded_at, updated_at').eq('household_id', context.householdId),
  ])
  if (membersError) throw createHttpError(500, membersError.message, 'presence_members_lookup_failed')
  if (locationsError) throw createHttpError(500, locationsError.message, 'presence_locations_lookup_failed')

  const locationsByMembership = new Map((locations ?? []).map((location) => [location.membership_id, location]))
  return {
    household_id: context.householdId,
    stale_after_minutes: STALE_AFTER_MINUTES,
    members: (members ?? []).map((member) => {
      const location = locationsByMembership.get(member.membership_id) ?? null
      const isSelf = member.person_id === context.personId
      const coordinate = toLocationDto(location)
      const isActivelySharing = Boolean(location?.sharing_enabled)
      return {
        person_id: member.person_id,
        membership_id: member.membership_id,
        display_name: member.display_name,
        avatar_url: member.avatar_url,
        role: member.role,
        is_self: isSelf,
        sharing_enabled: isActivelySharing,
        // A viewer that is not authorized does not receive a row and cannot infer
        // the owner's selected mode.
        sharing_mode: isSelf ? (location?.sharing_mode ?? 'off') : null,
        history_enabled: isSelf ? Boolean(location?.history_enabled) : false,
        status: !location
          ? (isSelf ? 'sharing_disabled' : 'unavailable')
          : !isActivelySharing
            ? 'sharing_disabled'
            : coordinate && !isStale(location.updated_at)
              ? 'live'
              : coordinate ? 'stale' : 'unavailable',
        location: coordinate,
      }
    }),
  }
}

const recordLocationSample = async (context, record) => {
  if (!record.history_enabled) return
  const { error } = await context.client.from('location_samples').insert({
    membership_id: context.membershipId,
    household_id: context.householdId,
    latitude: record.latitude,
    longitude: record.longitude,
    accuracy_meters: record.accuracy_meters,
    device_recorded_at: record.recorded_at,
    // received_at and expires_at are database defaults, never device input.
  })
  if (error) throw createHttpError(500, error.message, 'presence_history_write_failed')
}

const upsertMyLocation = async (context, payload = {}) => {
  const sharingMode = normalizeSharingMode(payload)
  const previous = await getCurrentLocation(context)
  if (sharingMode === 'off') {
    const { data, error } = await context.client
      .from('presence_member_locations')
      .upsert({ household_id: context.householdId, membership_id: context.membershipId, person_id: context.personId, sharing_mode: 'off', history_enabled: false }, { onConflict: 'membership_id' })
      .select('id, household_id, membership_id, person_id, sharing_enabled, sharing_mode, history_enabled, latitude, longitude, accuracy_meters, recorded_at, updated_at')
      .single()
    if (error) throw createHttpError(500, error.message, 'presence_location_upsert_failed')
    await purgeExpiredSamples(context)
    return { location: data, skipped: false }
  }

  const record = {
    household_id: context.householdId,
    membership_id: context.membershipId,
    person_id: context.personId,
    sharing_mode: sharingMode,
    history_enabled: payload.history_enabled === undefined ? Boolean(previous?.history_enabled) : payload.history_enabled === true,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy_meters: payload.accuracy_meters ?? null,
    device_recorded_at: normalizeDeviceRecordedAt(payload.recorded_at),
  }
  validateCoordinates({ latitude: record.latitude, longitude: record.longitude, accuracyMeters: record.accuracy_meters })
  const now = Date.now()
  if (previous && previous.sharing_mode === sharingMode && !shouldPublish({ previous, next: record, mode: sharingMode, now })) {
    return { location: previous, skipped: true }
  }

  const { device_recorded_at: _deviceRecordedAt, ...dbRecord } = record
  const { data, error } = await context.client
    .from('presence_member_locations')
    .upsert({ ...dbRecord, recorded_at: record.device_recorded_at ?? new Date(now).toISOString() }, { onConflict: 'membership_id' })
    .select('id, household_id, membership_id, person_id, sharing_enabled, sharing_mode, history_enabled, latitude, longitude, accuracy_meters, recorded_at, updated_at')
    .single()
  if (error) throw createHttpError(500, error.message, 'presence_location_upsert_failed')
  await recordLocationSample(context, data)
  await purgeExpiredSamples(context)
  return { location: data, skipped: false }
}

const listLocationHistory = async (context, membershipId) => {
  await getMembership(context, membershipId)
  const { data, error } = await context.client
    .from('location_samples')
    .select('id, membership_id, latitude, longitude, accuracy_meters, device_recorded_at, received_at')
    .eq('household_id', context.householdId)
    .eq('membership_id', membershipId)
    .gt('expires_at', new Date().toISOString())
    .order('received_at', { ascending: false })
    .limit(500)
  if (error) throw createHttpError(403, 'No tenes permiso para ver este historial.', 'presence_history_forbidden')
  return { membership_id: membershipId, retention_days: HISTORY_RETENTION_DAYS, samples: data ?? [] }
}

const listPlaces = async (context) => {
  const { data, error } = await context.client.from('places')
    .select('id, household_id, created_by_membership_id, name, latitude, longitude, radius_meters, active, created_at, updated_at')
    .eq('household_id', context.householdId).order('name', { ascending: true })
  if (error) throw createHttpError(500, error.message, 'places_lookup_failed')
  return { household_id: context.householdId, places: data ?? [] }
}

const savePlace = async (context, payload = {}) => {
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  if (!name || name.length > 80) throw createHttpError(400, 'Nombre de lugar invalido.', 'invalid_place')
  validateCoordinates({ latitude: payload.latitude, longitude: payload.longitude, accuracyMeters: null })
  if (!Number.isInteger(payload.radius_meters) || payload.radius_meters < 25 || payload.radius_meters > 2000) {
    throw createHttpError(400, 'Radio de lugar invalido.', 'invalid_place')
  }
  if (!payload.id) {
    const { count, error: countError } = await context.client.from('places').select('id', { count: 'exact', head: true }).eq('household_id', context.householdId).eq('active', true)
    if (countError) throw createHttpError(500, countError.message, 'places_lookup_failed')
    if ((count ?? 0) >= MAX_ACTIVE_PLACES) throw createHttpError(409, 'Este hogar ya alcanzo el maximo de 10 lugares activos.', 'places_limit_reached')
  }
  const record = { household_id: context.householdId, name, latitude: payload.latitude, longitude: payload.longitude, radius_meters: payload.radius_meters, active: payload.active !== false }
  const query = payload.id
    ? context.client.from('places').update(record).eq('id', payload.id).eq('household_id', context.householdId)
    : context.client.from('places').insert({ ...record, created_by_membership_id: context.membershipId })
  const { data, error } = await query.select('id, household_id, created_by_membership_id, name, latitude, longitude, radius_meters, active, created_at, updated_at').single()
  if (error) throw createHttpError(403, error.message, 'place_save_failed')
  return { place: data }
}

module.exports = {
  listLocations,
  upsertMyLocation,
  listLocationHistory,
  listPlaces,
  savePlace,
  STALE_AFTER_MINUTES,
  HISTORY_RETENTION_DAYS,
  FOREGROUND_MIN_INTERVAL_MS,
  BACKGROUND_MIN_INTERVAL_MS,
}


