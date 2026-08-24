import type { AuthMe } from '../api';

export type HouseholdResolutionState =
  | { kind: 'active'; householdId: string }
  | { kind: 'auto_activate'; householdId: string }
  | { kind: 'select_required'; householdIds: string[] }
  | { kind: 'none' };

export function resolveActiveHouseholdState(authMe: AuthMe | null): HouseholdResolutionState {
  if (authMe?.active_household?.id) {
    return { kind: 'active', householdId: authMe.active_household.id };
  }

  const activeMemberships = (authMe?.memberships ?? [])
    .filter((membership) => membership.status === 'active' && Boolean(membership.household_id));

  const householdIds = [...new Set(activeMemberships.map((membership) => membership.household_id))];

  if (householdIds.length === 1) {
    return { kind: 'auto_activate', householdId: householdIds[0] };
  }

  if (householdIds.length > 1) {
    return { kind: 'select_required', householdIds };
  }

  return { kind: 'none' };
}
