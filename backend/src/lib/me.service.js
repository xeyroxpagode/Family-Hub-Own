const { createSupabaseForToken } = require('../config/supabase')
const { createHttpError } = require('./httpErrors')
const { getPersonByAuthUserId } = require('./auth.service')

const LIVE_STATUSES = new Set(['pending', 'active', 'suspended'])

const minimalMembership = (membership) => ({
  id: membership.id,
  household_id: membership.household_id,
  person_id: membership.person_id,
  role: membership.role,
  status: membership.status,
  joined_at: membership.joined_at,
  left_at: membership.left_at,
  household_onboarding_status: membership.household_onboarding_status,
  household_onboarding_completed_at: membership.household_onboarding_completed_at,
  created_at: membership.created_at,
  updated_at: membership.updated_at,
})

const resolveNavigation = ({ person, memberships, activeHousehold }) => {
  if (!person) {
    return {
      auth: 'authenticated',
      has_person: false,
      has_household: false,
      has_active_household: false,
      membership_state: 'none',
      next: 'create_person_profile',
    }
  }

  const liveMemberships = memberships.filter((membership) => LIVE_STATUSES.has(membership.status))
  const activeMemberships = memberships.filter((membership) => membership.status === 'active')
  const pendingMemberships = memberships.filter((membership) => membership.status === 'pending')
  const suspendedMemberships = memberships.filter((membership) => membership.status === 'suspended')
  const activeMembership = activeHousehold
    ? activeMemberships.find((membership) => membership.household_id === activeHousehold.id)
    : null

  if (activeHousehold && activeMembership) {
    return {
      auth: 'authenticated',
      has_person: true,
      has_household: true,
      has_active_household: true,
      membership_state: 'active',
      next:
        activeMembership.household_onboarding_status === 'completed'
          ? 'home'
          : 'household_onboarding',
    }
  }

  if (activeMemberships.length > 1) {
    return {
      auth: 'authenticated',
      has_person: true,
      has_household: true,
      has_active_household: false,
      membership_state: 'active',
      next: person.active_household_id ? 'repair_active_household' : 'select_household',
    }
  }

  if (activeMemberships.length === 1) {
    return {
      auth: 'authenticated',
      has_person: true,
      has_household: true,
      has_active_household: false,
      membership_state: 'active',
      next: person.active_household_id ? 'repair_active_household' : 'set_active_household',
    }
  }

  if (pendingMemberships.length > 0) {
    return {
      auth: 'authenticated',
      has_person: true,
      has_household: true,
      has_active_household: false,
      membership_state: 'pending',
      next: 'pending_approval',
    }
  }

  if (suspendedMemberships.length > 0) {
    return {
      auth: 'authenticated',
      has_person: true,
      has_household: true,
      has_active_household: false,
      membership_state: 'suspended',
      next: 'access_suspended',
    }
  }

  return {
    auth: 'authenticated',
    has_person: true,
    has_household: liveMemberships.length > 0,
    has_active_household: false,
    membership_state: 'none',
    next: 'create_or_join_household',
  }
}

const buildMe = async ({ user, accessToken }) => {
  const client = createSupabaseForToken(accessToken)
  const person = await getPersonByAuthUserId(client, user.id)

  if (!person) {
    return {
      user,
      person: null,
      memberships: [],
      active_household: null,
      navigation: resolveNavigation({ person: null, memberships: [], activeHousehold: null }),
    }
  }

  const { data: membershipsData, error: membershipsError } = await client
    .from('household_members')
    .select(
      'id, household_id, person_id, role, status, joined_at, left_at, household_onboarding_status, household_onboarding_completed_at, created_at, updated_at',
    )
    .eq('person_id', person.id)
    .order('created_at', { ascending: true })

  if (membershipsError) {
    throw createHttpError(500, membershipsError.message, 'memberships_lookup_failed')
  }

  const memberships = (membershipsData ?? []).map(minimalMembership)
  const activeMembershipIds = new Set(
    memberships
      .filter((membership) => membership.status === 'active')
      .map((membership) => membership.household_id),
  )

  let activeHousehold = null

  if (person.active_household_id && activeMembershipIds.has(person.active_household_id)) {
    const { data, error } = await client
      .from('households')
      .select('id, name, slug, timezone, default_language, config, created_by_person_id, created_at, updated_at')
      .eq('id', person.active_household_id)
      .maybeSingle()

    if (error) {
      throw createHttpError(500, error.message, 'active_household_lookup_failed')
    }

    activeHousehold = data
  }

  return {
    user,
    person,
    memberships,
    active_household: activeHousehold,
    navigation: resolveNavigation({ person, memberships, activeHousehold }),
  }
}

module.exports = {
  buildMe,
}
