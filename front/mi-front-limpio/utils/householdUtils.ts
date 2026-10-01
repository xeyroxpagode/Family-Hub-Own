import type { UserHousehold } from '../services/api';

export function normalizeUserHouseholds(
  rawHouseholds: UserHousehold[],
  activeHouseholdId?: string | null
): UserHousehold[] {
  const map = new Map<string, UserHousehold>();

  for (const h of rawHouseholds) {
    const id = h.household_id;
    if (!id) continue;

    const existing = map.get(id);
    if (!existing) {
      map.set(id, { ...h });
      continue;
    }

    const hStatus = h.status?.toLowerCase() ?? '';
    const existingStatus = existing.status?.toLowerCase() ?? '';

    if (hStatus === 'active' && existingStatus !== 'active') {
      map.set(id, { ...h });
      continue;
    }

    if (hStatus === 'active' && existingStatus === 'active') {
      const hHasName = Boolean(h.household_name?.trim());
      const existingHasName = Boolean(existing.household_name?.trim());
      if (hHasName && !existingHasName) {
        map.set(id, { ...h });
        continue;
      }
    }

    if (id === activeHouseholdId && existing.household_id !== activeHouseholdId) {
      map.set(id, { ...h });
      continue;
    }
  }

  return Array.from(map.values());
}

export function getActiveHouseholdItem(
  households: UserHousehold[],
  activeHouseholdId?: string | null
): UserHousehold | null {
  if (!activeHouseholdId) return null;
  return households.find(h => h.household_id === activeHouseholdId) ?? null;
}

export function getOtherActiveHouseholds(
  households: UserHousehold[],
  activeHouseholdId?: string | null
): UserHousehold[] {
  return households.filter(h => h.status === 'active' && h.household_id !== activeHouseholdId);
}

export function getPendingHouseholds(households: UserHousehold[]): UserHousehold[] {
  return households.filter(h => h.status === 'pending');
}

export function countActiveAndPendingHouseholds(households: UserHousehold[]): {
  active: number;
  pending: number;
  total: number;
} {
  const active = households.filter(h => h.status === 'active').length;
  const pending = households.filter(h => h.status === 'pending').length;
  return { active, pending, total: active + pending };
}

export function getHouseholdCountByStatus(households: UserHousehold[]): {
  active: number;
  pending: number;
  total: number;
} {
  return countActiveAndPendingHouseholds(households);
}