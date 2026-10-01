const { createHttpError } = require('../lib/httpErrors')

const STALE_AFTER_MINUTES = 10
const SHARING_MODES = new Set(['off', 'foreground', 'background'])

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const debugPresence = (event, detail) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Presence QA] ${event}`, detail)
  }
}

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

const normalizeRecordedAt = (value) => {
  if (!value) return new Date().toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, 'Fecha de ubicacion invalida.', 'invalid_location_timestamp')
  }

  const maxFutureMs = Date.now() + 5 * 60 * 1000
  if (parsed.getTime() > maxFutureMs) {
    throw createHttpError(400, 'La ubicacion tiene una fecha futura invalida.', 'invalid_location_timestamp')
  }

  return parsed.toISOString()
}

const normalizeSharingMode = (payload = {}) => {
  if (payload.sharing_enabled === false) return 'off'

  // `sharing_enabled` is derived in the database from this field. Older
  // mobile bundles did not send it, so foreground is the safe default while
  // those clients update.
  const sharingMode = payload.sharing_mode ?? 'foreground'
  if (!SHARING_MODES.has(sharingMode) || sharingMode === 'off') {
    throw createHttpError(400, 'Modo de ubicación compartida inválido.', 'invalid_location_sharing_mode')
  }

  return sharingMode
}

const isStale = (recordedAt) => {
  if (!recordedAt) return true
  return Date.now() - new Date(recordedAt).getTime() > STALE_AFTER_MINUTES * 60 * 1000
}

const listLocations = async (context) => {
  const { data: members, error: membersError } = await context.client
    .from('household_people_public')
    .select('person_id, household_id, membership_id, display_name, avatar_url, role, status')
    .eq('household_id', context.householdId)
    .eq('status', 'active')

  if (membersError) {
    throw createHttpError(500, membersError.message, 'presence_members_lookup_failed')
  }

  const { data: locations, error: locationsError } = await context.client
    .from('presence_member_locations')
    .select('id, household_id, membership_id, person_id, sharing_enabled, latitude, longitude, accuracy_meters, recorded_at, updated_at')
    .eq('household_id', context.householdId)

  if (locationsError) {
    throw createHttpError(500, locationsError.message, 'presence_locations_lookup_failed')
  }

  debugPresence('locations.loaded', {
    householdId: context.householdId,
    currentMembershipId: context.membershipId,
    activeMembers: members?.length ?? 0,
    locationRows: locations?.length ?? 0,
    sharedLocationRows: locations?.filter((location) => location.sharing_enabled).length ?? 0,
  })

  const locationsByMembership = new Map((locations ?? []).map((location) => [location.membership_id, location]))

  return {
    household_id: context.householdId,
    stale_after_minutes: STALE_AFTER_MINUTES,
    members: (members ?? []).map((member) => {
      const location = locationsByMembership.get(member.membership_id) ?? null
      const hasCoordinates = Boolean(
        location
          && location.sharing_enabled
          && isFiniteNumber(location.latitude)
          && isFiniteNumber(location.longitude),
      )

      return {
        person_id: member.person_id,
        membership_id: member.membership_id,
        display_name: member.display_name,
        avatar_url: member.avatar_url,
        role: member.role,
        is_self: member.person_id === context.personId,
        sharing_enabled: Boolean(location?.sharing_enabled),
        presence_updated_at: location?.updated_at ?? null,
        status: !location?.sharing_enabled
          ? 'sharing_disabled'
          : hasCoordinates && !isStale(location.recorded_at)
            ? 'live'
            : hasCoordinates
              ? 'stale'
              : 'unavailable',
        location: hasCoordinates ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy_meters: location.accuracy_meters,
          recorded_at: location.recorded_at,
          updated_at: location.updated_at,
        } : null,
      }
    }),
  }
}

const upsertMyLocation = async (context, payload = {}) => {
  const sharingMode = normalizeSharingMode(payload)
  const sharingEnabled = sharingMode !== 'off'

  const baseRecord = {
    household_id: context.householdId,
    membership_id: context.membershipId,
    person_id: context.personId,
    sharing_enabled: sharingEnabled,
    sharing_mode: sharingMode,
  }

  const record = sharingEnabled ? {
    ...baseRecord,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy_meters: payload.accuracy_meters ?? null,
    recorded_at: normalizeRecordedAt(payload.recorded_at),
  } : {
    ...baseRecord,
    latitude: null,
    longitude: null,
    accuracy_meters: null,
    recorded_at: null,
  }

  if (sharingEnabled) {
    validateCoordinates({
      latitude: record.latitude,
      longitude: record.longitude,
      accuracyMeters: record.accuracy_meters,
    })
  }

  const { data, error } = await context.client
    .from('presence_member_locations')
    .upsert(record, { onConflict: 'membership_id' })
    .select('id, household_id, membership_id, person_id, sharing_enabled, sharing_mode, latitude, longitude, accuracy_meters, recorded_at, updated_at')
    .single()

  if (error) {
    throw createHttpError(500, error.message, 'presence_location_upsert_failed')
  }

  debugPresence('location.upserted', {
    authUserId: context.accountId,
    householdId: context.householdId,
    membershipId: context.membershipId,
    sharingEnabled: data.sharing_enabled,
    sharingMode: data.sharing_mode,
  })

  return { location: data }
}

module.exports = {
  listLocations,
  upsertMyLocation,
  STALE_AFTER_MINUTES,
}
