export type HomePlusFeatureFlags = Readonly<Record<string, boolean>>;

const projections = new Map<string, HomePlusFeatureFlags>();

function scopeKey(accountId: string, householdId: string | null) {
  return `${accountId}:${householdId ?? 'no-household'}`;
}

export const featureFlagStore = {
  get(accountId: string, householdId: string | null): HomePlusFeatureFlags {
    return projections.get(scopeKey(accountId, householdId)) ?? Object.freeze({});
  },
  set(accountId: string, householdId: string | null, flags: HomePlusFeatureFlags) {
    projections.set(scopeKey(accountId, householdId), flags);
  },
  clearHousehold(householdId: string | null) {
    if (!householdId) return;
    for (const key of projections.keys()) {
      if (key.endsWith(`:${householdId}`)) projections.delete(key);
    }
  },
  clearSession() { projections.clear(); },
};

export function isFeatureEnabled(flags: HomePlusFeatureFlags | null | undefined, key: string): boolean {
  return flags?.[key] === true;
}
