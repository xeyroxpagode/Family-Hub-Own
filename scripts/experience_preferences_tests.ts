/**
 * Experience Mode persistence contract: one account-scoped local preference,
 * strict parsing, no household/domain dependency, durable across re-login.
 */
import {
  DEFAULT_EXPERIENCE_PREFERENCES,
  __testBuildExperienceStorageKey,
  createExperiencePreferencesStore,
  parseExperiencePreferences,
  type ExperienceStorageLike,
} from '../front/mi-front-limpio/services/experiencePreferences';

let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed += 1; }
}

function fakeStorage(): ExperienceStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async getItem(key) { return data.get(key) ?? null; },
    async setItem(key, value) { data.set(key, value); },
  };
}

async function main() {
  assert(DEFAULT_EXPERIENCE_PREFERENCES.mode === 'standard', 'default remains Standard');
  assert(DEFAULT_EXPERIENCE_PREFERENCES.setupCompleted === false, 'missing preference requires selection');
  assert(parseExperiencePreferences({ version: 1, mode: 'simple', setupCompleted: true })?.mode === 'simple', 'valid Simple parses');
  assert(parseExperiencePreferences({ version: 1, mode: 'senior', setupCompleted: true }) === null, 'unknown mode is rejected');
  assert(parseExperiencePreferences({ version: 2, mode: 'standard', setupCompleted: true }) === null, 'future unknown schema is rejected safely');

  const storage = fakeStorage();
  const store = createExperiencePreferencesStore(storage);
  await store.save('account-a', { version: 1, mode: 'simple', setupCompleted: true });
  assert((await store.load('account-a')).mode === 'simple', 'Simple persists across rehydration');
  assert((await store.load('account-b')).setupCompleted === false, 'preference is isolated by account');
  await storage.setItem(__testBuildExperienceStorageKey('account-a'), '{bad json');
  assert((await store.load('account-a')).setupCompleted === false, 'corrupt data falls back to selector safely');
  assert(__testBuildExperienceStorageKey('account-a') !== __testBuildExperienceStorageKey('account-b'), 'storage keys are account scoped');

  const unavailableStorage: ExperienceStorageLike = {
    getItem: async () => null,
    setItem: async () => { throw new Error('storage unavailable'); },
  };
  assert(
    (await createExperiencePreferencesStore(unavailableStorage).save('account-a', { version: 1, mode: 'simple', setupCompleted: true })) === false,
    'storage failure is reported without throwing',
  );

  if (failed > 0) process.exitCode = 1;
}

void main();
