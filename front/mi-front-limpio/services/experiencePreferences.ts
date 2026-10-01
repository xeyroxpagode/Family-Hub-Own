/**
 * Personal presentation preference. This deliberately lives outside the
 * household, role and permission models: it only chooses the app shell.
 */
export type ExperienceMode = 'standard' | 'simple';

export type ExperiencePreferences = {
  version: 1;
  mode: ExperienceMode;
  setupCompleted: boolean;
};

export const DEFAULT_EXPERIENCE_PREFERENCES: ExperiencePreferences = Object.freeze({
  version: 1,
  mode: 'standard',
  setupCompleted: false,
});

export type ExperienceStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

const STORAGE_PREFIX = '@homeplus/experience-preferences/v1';

function buildStorageKey(accountId: string): string {
  return `${STORAGE_PREFIX}/${accountId || 'missing'}`;
}

export function parseExperiencePreferences(raw: unknown): ExperiencePreferences | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.version !== 1 || (value.mode !== 'standard' && value.mode !== 'simple')) return null;
  if (typeof value.setupCompleted !== 'boolean') return null;
  return { version: 1, mode: value.mode, setupCompleted: value.setupCompleted };
}

const liveStorage: ExperienceStorageLike = {
  getItem: (key) => {
    // Lazy loading keeps Node-based contract checks independent of RN modules.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default.getItem(key);
  },
  setItem: (key, value) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default.setItem(key, value);
  },
};

export function createExperiencePreferencesStore(storage: ExperienceStorageLike = liveStorage) {
  return {
    async load(accountId: string): Promise<ExperiencePreferences> {
      if (!accountId) return DEFAULT_EXPERIENCE_PREFERENCES;
      try {
        const raw = await storage.getItem(buildStorageKey(accountId));
        if (!raw) return DEFAULT_EXPERIENCE_PREFERENCES;
        return parseExperiencePreferences(JSON.parse(raw)) ?? DEFAULT_EXPERIENCE_PREFERENCES;
      } catch {
        return DEFAULT_EXPERIENCE_PREFERENCES;
      }
    },
    async save(accountId: string, preferences: ExperiencePreferences): Promise<boolean> {
      if (!accountId) return false;
      try {
        await storage.setItem(buildStorageKey(accountId), JSON.stringify(preferences));
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const experiencePreferencesStore = createExperiencePreferencesStore();
export { buildStorageKey as __testBuildExperienceStorageKey };
