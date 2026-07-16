/**
 * Planner V1 — M6 Tab Preferences (single authority).
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M6):
 * - Typed contract for Planner tab preferences scoped by accountId + householdId.
 * - Single storage adapter (AsyncStorage) with deny-safe fallback.
 * - Versioned storage key that isolates accounts and households.
 * - Pure validators/parsers that never throw toward the UI.
 * - Injectable fake storage for tests.
 *
 * Binding rules:
 * - Canonical tab keys: `'tasks' | 'calendar' | 'goals'`. Default: `'tasks'`.
 * - Preferences belong to one account and one household; no cross-contamination.
 * - Invalid/corrupt values silently fall back to `tasks`.
 * - Storage failure never blocks Planner.
 * - No aliases, no timestamps as refresh signals, no global shared key.
 *
 * Out of scope for M6:
 * - Backend sync, migration tables, endpoints, Search, Home Summary, M7.
 */

import { isPlannerTabKey, type PlannerTabKey } from '../navigation/plannerNavigationContract';

// ---------------------------------------------------------------------------
// 1. Typed preferences payload
// ---------------------------------------------------------------------------

export type PlannerPreferences = {
  /** Schema version for forward compatibility. */
  version: 1;
  /** Canonical tab key persisted for this account+household scope. */
  activeTab: PlannerTabKey;
};

export const DEFAULT_PREFERENCES: PlannerPreferences = Object.freeze({
  version: 1 as const,
  activeTab: 'tasks' as const,
});

// ---------------------------------------------------------------------------
// 2. Pure validators / parsers (deny-safe — never throw toward UI)
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the raw payload parses to a valid PlannerPreferences.
 * Invalid JSON, unknown versions, missing/unknown tab values all return `false`.
 * Unknown properties are silently ignored.
 */
export function parsePlannerPreferences(raw: unknown): PlannerPreferences | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  // Version must be exactly 1. Unknown versions are not migrated automatically.
  if (obj.version !== 1) return null;

  // activeTab must be a canonical key. Aliases (task, events, goal) are rejected.
  if (!isPlannerTabKey(obj.activeTab)) return null;

  return { version: 1, activeTab: obj.activeTab };
}

/** Serializes PlannerPreferences to a stable JSON string. */
export function serializePlannerPreferences(prefs: PlannerPreferences): string {
  // Only persist the canonical fields; never leak unexpected properties.
  return JSON.stringify({ version: prefs.version, activeTab: prefs.activeTab });
}

// ---------------------------------------------------------------------------
// 3. Versioned storage key builder
// ---------------------------------------------------------------------------

const STORAGE_KEY_SCOPE = '@homeplus/planner/preferences/v1';

/**
 * Builds the versioned, account-and-household-scoped storage key.
 * Both IDs are mandatory. No email, display name, token, or household name.
 */
function buildStorageKey(accountId: string, householdId: string): string {
  if (!accountId || !householdId) {
    // Not throwing — callers should guard; if a bug reaches here we return
    // a key that will never match a real scope so load falls back safely.
    return `${STORAGE_KEY_SCOPE}/missing/missing`;
  }
  return `${STORAGE_KEY_SCOPE}/${accountId}/${householdId}`;
}

// ---------------------------------------------------------------------------
// 4. Injectable storage provider abstraction
// ---------------------------------------------------------------------------

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const liveStorage: AsyncStorageLike = {
  getItem: (key) => {
    // Lazy require so the module loads in Node test environments where the
    // RN AsyncStorage package is not resolvable. The first call resolves the
    // module; subsequent calls reuse the cached require result.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.getItem(key);
  },
  setItem: (key, value) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.removeItem(key);
  },
};

// ---------------------------------------------------------------------------
// 5. Single preferences store adapter
// ---------------------------------------------------------------------------

export type PlannerPreferencesStore = {
  /**
   * Load persisted preferences for the given account+household.
   * Never throws — returns DEFAULT_PREFERENCES on any failure.
   */
  load(accountId: string, householdId: string): Promise<PlannerPreferences>;

  /**
   * Persist preferences for the given account+household.
   * Silently swallows storage errors — UI must not be blocked.
   */
  save(
    accountId: string,
    householdId: string,
    preferences: PlannerPreferences,
  ): Promise<void>;

  /** Remove persisted preferences for the given scope (e.g. data cleanup). */
  remove(accountId: string, householdId: string): Promise<void>;
};

function createPlannerPreferencesStore(
  storage: AsyncStorageLike = liveStorage,
): PlannerPreferencesStore {
  async function load(accountId: string, householdId: string): Promise<PlannerPreferences> {
    const key = buildStorageKey(accountId, householdId);
    try {
      const raw = await storage.getItem(key);
      if (raw === null) return DEFAULT_PREFERENCES;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Corrupt JSON — fallback silently.
        return DEFAULT_PREFERENCES;
      }

      const prefs = parsePlannerPreferences(parsed);
      return prefs ?? DEFAULT_PREFERENCES;
    } catch {
      // AsyncStorage failure — fallback silently.
      return DEFAULT_PREFERENCES;
    }
  }

  async function save(
    accountId: string,
    householdId: string,
    preferences: PlannerPreferences,
  ): Promise<void> {
    const key = buildStorageKey(accountId, householdId);
    const serialized = serializePlannerPreferences(preferences);
    try {
      await storage.setItem(key, serialized);
    } catch {
      // Storage write failure — ignore. UI already reflects the selection.
    }
  }

  async function remove(accountId: string, householdId: string): Promise<void> {
    const key = buildStorageKey(accountId, householdId);
    try {
      await storage.removeItem(key);
    } catch {
      // Best-effort removal.
    }
  }

  return { load, save, remove };
}

/** Canonical singleton store. Tests can inject a fake via `createPlannerPreferencesStore`. */
export const plannerPreferencesStore = createPlannerPreferencesStore();

/**
 * Test-only factory for injecting fake storage.
 * Exported deliberately for the M6 test suite.
 */
export { createPlannerPreferencesStore as __testCreatePlannerPreferencesStore };

/**
 * Test-only storage key inspection.
 */
export { buildStorageKey as __testBuildStorageKey };