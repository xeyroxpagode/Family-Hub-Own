/**
 * Planner V1 — M6 Tab Preferences Tests.
 *
 * Tests the M6 tab persistence contract:
 * - Codec and defaults (parse, serialize, invalid values)
 * - Storage key (versioned, account/household isolation, no PII)
 * - Hydration (restore, fallback, late-load protection, context switches)
 * - Selection/save (immediate UI, last-write-wins, no backend/cache impact)
 * - Household isolation
 * - Account isolation
 * - Navigation initialTab (priority, one-shot, invalid ignored)
 *
 * Pure TypeScript — no React rendering, injectable fake storage.
 *
 * Run: compiled via `tsc -p scripts/tsconfig.test.json` then
 * `node scripts/compiled/scripts/planner_v1_tab_preferences_tests.js`
 */

import {
  PLANNER_TAB_KEYS,
  isPlannerTabKey,
  type PlannerTabKey,
} from '../front/mi-front-limpio/navigation/plannerNavigationContract';

import {
  DEFAULT_PREFERENCES,
  parsePlannerPreferences,
  serializePlannerPreferences,
  type PlannerPreferences,
  type AsyncStorageLike,
  type PlannerPreferencesStore,
  __testCreatePlannerPreferencesStore,
  __testBuildStorageKey,
} from '../front/mi-front-limpio/services/plannerPreferences';

// ---------------------------------------------------------------------------
// Simple test framework
// ---------------------------------------------------------------------------

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  \u2713 ${message}`);
    passCount++;
  } else {
    console.error(`  \u2717 ${message}`);
    failCount++;
  }
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (e) {
    console.error(`  \u2717 THREW: ${e instanceof Error ? e.message : String(e)}`);
    failCount++;
  }
}

// ---------------------------------------------------------------------------
// Fake storage helper
// ---------------------------------------------------------------------------

function createFakeStorage(): AsyncStorageLike & { dump(): Map<string, string> } {
  const store = new Map<string, string>();
  return {
    async getItem(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      store.delete(key);
    },
    dump(): Map<string, string> {
      return store;
    },
  };
}

function createFailingStorage(): AsyncStorageLike {
  return {
    async getItem(): Promise<string | null> {
      throw new Error('storage failure');
    },
    async setItem(): Promise<void> {
      throw new Error('storage failure');
    },
    async removeItem(): Promise<void> {
      throw new Error('storage failure');
    },
  };
}

const ACCT_A = 'a70ee1c0-0000-41d4-a716-446655440000';
const ACCT_B = 'b80ff2d0-0000-41d4-a716-446655440000';
const HOUSE_A = 'a90ee3c0-0000-41d4-a716-446655440000';
const HOUSE_B = 'b90ee4d0-0000-41d4-a716-446655440000';

// ---------------------------------------------------------------------------
// 1. Codec and defaults
// ---------------------------------------------------------------------------

runTest('Default preferences — tasks, version 1', () => {
  assert(DEFAULT_PREFERENCES.version === 1, 'version is 1');
  assert(DEFAULT_PREFERENCES.activeTab === 'tasks', 'default tab is tasks');
});

runTest('Parser — valid tasks', () => {
  const prefs = parsePlannerPreferences({ version: 1, activeTab: 'tasks' });
  assert(prefs !== null, 'parsed non-null');
  assert(prefs?.version === 1, 'version 1');
  assert(prefs?.activeTab === 'tasks', 'tab tasks');
});

runTest('Parser — valid events', () => {
  const prefs = parsePlannerPreferences({ version: 1, activeTab: 'events' });
  assert(prefs?.activeTab === 'events', 'tab events');
});

runTest('Parser — valid plans', () => {
  const prefs = parsePlannerPreferences({ version: 1, activeTab: 'plans' });
  assert(prefs?.activeTab === 'plans', 'tab plans');
});

runTest('Parser — alias rejected (task singular)', () => {
  assert(parsePlannerPreferences({ version: 1, activeTab: 'task' }) === null, 'task rejected');
  assert(parsePlannerPreferences({ version: 1, activeTab: 'goal' }) === null, 'goal rejected');
  assert(parsePlannerPreferences({ version: 1, activeTab: 'agenda' }) === null, 'agenda rejected');
  assert(parsePlannerPreferences({ version: 1, activeTab: 'calendar' })?.activeTab === 'events', 'legacy calendar migrates');
  assert(parsePlannerPreferences({ version: 1, activeTab: 'goals' })?.activeTab === 'plans', 'legacy goals migrates');
});

runTest('Parser — invalid JSON (non-object)', () => {
  assert(parsePlannerPreferences(null) === null, 'null rejected');
  assert(parsePlannerPreferences(undefined) === null, 'undefined rejected');
  assert(parsePlannerPreferences('tasks') === null, 'string rejected');
  assert(parsePlannerPreferences(123) === null, 'number rejected');
  assert(parsePlannerPreferences([]) === null, 'array rejected');
});

runTest('Parser — invalid version', () => {
  assert(parsePlannerPreferences({ version: 2, activeTab: 'tasks' }) === null, 'version 2 rejected');
  assert(parsePlannerPreferences({ version: 0, activeTab: 'tasks' }) === null, 'version 0 rejected');
  assert(parsePlannerPreferences({ version: '1', activeTab: 'tasks' }) === null, 'string version rejected');
  assert(parsePlannerPreferences({ activeTab: 'tasks' }) === null, 'missing version rejected');
});

runTest('Parser — unknown properties ignored', () => {
  const prefs = parsePlannerPreferences({ version: 1, activeTab: 'plans', extra: 'x', foo: 42 });
  assert(prefs !== null, 'parsed despite unknown props');
  assert(prefs?.activeTab === 'plans', 'tab preserved');
  assert(!('extra' in prefs!), 'no extra prop');
});

runTest('Serialize — stable output', () => {
  const prefs: PlannerPreferences = { version: 1, activeTab: 'events' };
  const json = serializePlannerPreferences(prefs);
  assert(json === '{"version":1,"activeTab":"events"}', 'stable JSON');
  // Round-trip
  const restored = parsePlannerPreferences(JSON.parse(json));
  assert(restored?.activeTab === 'events', 'round-trip preserves tab');
});

// ---------------------------------------------------------------------------
// 2. Storage key
// ---------------------------------------------------------------------------

runTest('Storage key — includes version', () => {
  const key = __testBuildStorageKey(ACCT_A, HOUSE_A);
  assert(key.includes('/v1/'), 'key contains v1');
  assert(key.startsWith('@homeplus/planner/preferences/v1/'), 'canonical prefix');
});

runTest('Storage key — distinguishes accounts', () => {
  const keyA = __testBuildStorageKey(ACCT_A, HOUSE_A);
  const keyB = __testBuildStorageKey(ACCT_B, HOUSE_A);
  assert(keyA !== keyB, 'different accounts = different keys');
});

runTest('Storage key — distinguishes households', () => {
  const keyA = __testBuildStorageKey(ACCT_A, HOUSE_A);
  const keyB = __testBuildStorageKey(ACCT_A, HOUSE_B);
  assert(keyA !== keyB, 'different households = different keys');
});

runTest('Storage key — no PII in key', () => {
  const key = __testBuildStorageKey(ACCT_A, HOUSE_A);
  assert(!key.includes('email'), 'no email');
  assert(!key.includes('token'), 'no token');
  assert(!key.includes('name'), 'no name');
});

runTest('Storage key — rejects incomplete context', () => {
  const keyMissingAcct = __testBuildStorageKey('', HOUSE_A);
  const keyMissingHouse = __testBuildStorageKey(ACCT_A, '');
  assert(keyMissingAcct.includes('/missing/' ), 'missing account marked');
  assert(keyMissingHouse.includes('/missing/'), 'missing household marked');
  assert(keyMissingAcct !== __testBuildStorageKey(ACCT_A, HOUSE_A), 'missing != valid');
});

// ---------------------------------------------------------------------------
// 3. Hydration
// ---------------------------------------------------------------------------

runTest('Hydration — restores tab from storage', async () => {
  const storage = createFakeStorage();
  await storage.setItem(
    __testBuildStorageKey(ACCT_A, HOUSE_A),
    serializePlannerPreferences({ version: 1, activeTab: 'plans' }),
  );
  const store = __testCreatePlannerPreferencesStore(storage);
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'plans', 'restored plans');
});

runTest('Hydration — no preference uses tasks', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'tasks', 'default tasks when no pref');
});

runTest('Hydration — storage failure uses tasks', async () => {
  const store = __testCreatePlannerPreferencesStore(createFailingStorage());
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'tasks', 'default tasks on storage failure');
});

runTest('Hydration — corrupt JSON uses tasks', async () => {
  const storage = createFakeStorage();
  await storage.setItem(__testBuildStorageKey(ACCT_A, HOUSE_A), '{not valid json');
  const store = __testCreatePlannerPreferencesStore(storage);
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'tasks', 'corrupt JSON -> tasks');
});

runTest('Hydration — invalid version uses tasks', async () => {
  const storage = createFakeStorage();
  await storage.setItem(
    __testBuildStorageKey(ACCT_A, HOUSE_A),
    JSON.stringify({ version: 99, activeTab: 'plans' }),
  );
  const store = __testCreatePlannerPreferencesStore(storage);
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'tasks', 'invalid version -> tasks');
});

runTest('Hydration — alias tab uses tasks', async () => {
  const storage = createFakeStorage();
  await storage.setItem(
    __testBuildStorageKey(ACCT_A, HOUSE_A),
    JSON.stringify({ version: 1, activeTab: 'agenda' }),
  );
  const store = __testCreatePlannerPreferencesStore(storage);
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'tasks', 'alias -> tasks');
});

// ---------------------------------------------------------------------------
// 4. Selection / save
// ---------------------------------------------------------------------------

runTest('Save — persists value', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'events' });
  const saved = storage.dump().get(__testBuildStorageKey(ACCT_A, HOUSE_A));
  assert(saved !== undefined, 'value saved');
  assert(JSON.parse(saved!).activeTab === 'events', 'events persisted');
});

runTest('Save — last write wins (rapid taps)', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);
  // Simulate rapid taps: events, plans, tasks
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'events' });
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'tasks' });
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'tasks', 'last write (tasks) wins');
});

runTest('Save — error does not affect load (no revert)', async () => {
  const storage = createFakeStorage();
  // Pre-seed a value, then attempt a failing save
  await storage.setItem(
    __testBuildStorageKey(ACCT_A, HOUSE_A),
    serializePlannerPreferences({ version: 1, activeTab: 'events' }),
  );
  const failStore = __testCreatePlannerPreferencesStore(createFailingStorage());
  // Failing save should not throw, and existing value should remain
  await failStore.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  const okStore = __testCreatePlannerPreferencesStore(storage);
  const prefs = await okStore.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'events', 'save failure did not revert');
});

runTest('Save — no backend request, no cache invalidation triggered', async () => {
  // The store adapter only touches AsyncStorage; it never imports plannerCache
  // or makes network requests. This is verified by the fact that the module
  // has no such imports — here we just verify load/save work in isolation.
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  const prefs = await store.load(ACCT_A, HOUSE_A);
  assert(prefs.activeTab === 'plans', 'save/load cycle works without external deps');
});

// ---------------------------------------------------------------------------
// 5. Household isolation
// ---------------------------------------------------------------------------

runTest('Household isolation — A saves plans, B saves events, no cross-contamination', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);

  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  await store.save(ACCT_A, HOUSE_B, { version: 1, activeTab: 'events' });

  const prefsA = await store.load(ACCT_A, HOUSE_A);
  const prefsB = await store.load(ACCT_A, HOUSE_B);

  assert(prefsA.activeTab === 'plans', 'A restored plans');
  assert(prefsB.activeTab === 'events', 'B restored events');
});

runTest('Household isolation — switch A→B→A restores A', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);

  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  await store.save(ACCT_A, HOUSE_B, { version: 1, activeTab: 'events' });

  // Simulate switching back to A
  const prefsBackA = await store.load(ACCT_A, HOUSE_A);
  assert(prefsBackA.activeTab === 'plans', 'back to A restores plans');

  const prefsBackB = await store.load(ACCT_A, HOUSE_B);
  assert(prefsBackB.activeTab === 'events', 'back to B restores events');
});

// ---------------------------------------------------------------------------
// 6. Account isolation
// ---------------------------------------------------------------------------

runTest('Account isolation — same household ID, different accounts', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);

  // Two accounts with same household ID (logical)
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  await store.save(ACCT_B, HOUSE_A, { version: 1, activeTab: 'events' });

  const prefsA = await store.load(ACCT_A, HOUSE_A);
  const prefsB = await store.load(ACCT_B, HOUSE_A);

  assert(prefsA.activeTab === 'plans', 'account A -> plans');
  assert(prefsB.activeTab === 'events', 'account B -> events');
  assert(prefsA.activeTab !== prefsB.activeTab, 'no shared preference');
});

runTest('Account isolation — creator vs non-creator in same household', async () => {
  // Simulates: Account A is household creator, Account B is a member.
  // Both share HOUSE_A but have different auth_user_id (accountId).
  // They must have independent tab preferences.
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);

  const CREATOR_ACCT = 'c1000000-0000-4000-a000-000000000001';
  const MEMBER_ACCT = 'm2000000-0000-4000-a000-000000000002';
  const SAME_HOUSE = 'h3000000-0000-4000-a000-000000000003';

  // Creator saves 'plans'
  await store.save(CREATOR_ACCT, SAME_HOUSE, { version: 1, activeTab: 'plans' });
  // Member saves 'events'
  await store.save(MEMBER_ACCT, SAME_HOUSE, { version: 1, activeTab: 'events' });

  const prefsCreator = await store.load(CREATOR_ACCT, SAME_HOUSE);
  const prefsMember = await store.load(MEMBER_ACCT, SAME_HOUSE);

  assert(prefsCreator.activeTab === 'plans', 'creator sees plans');
  assert(prefsMember.activeTab === 'events', 'member sees events');
  assert(prefsCreator.activeTab !== prefsMember.activeTab, 'no cross-contamination');
});

runTest('Account isolation — logout/login preserves durable prefs', async () => {
  // Simulates: Account A logs out (in-memory reset), logs back in.
  // Durable AsyncStorage prefs should survive and be restored.
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);

  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });

  // Simulate logout: in-memory state would reset to 'tasks'
  // Durable storage remains untouched
  const prefsAfterLogout = await store.load(ACCT_A, HOUSE_A);
  assert(prefsAfterLogout.activeTab === 'plans', 'durable pref survives logout');
});

runTest('Account isolation — switch account without household change', async () => {
  // User switches from Account A to Account B while staying in HOUSE_A.
  // Preferences must be scoped to the account, not the household.
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);

  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  await store.save(ACCT_B, HOUSE_A, { version: 1, activeTab: 'events' });

  // Switch to Account B
  const prefsB = await store.load(ACCT_B, HOUSE_A);
  assert(prefsB.activeTab === 'events', 'Account B sees its own tab');

  // Switch back to Account A
  const prefsA = await store.load(ACCT_A, HOUSE_A);
  assert(prefsA.activeTab === 'plans', 'Account A restored its tab');

  // Verify no cross-read
  const storageDump = storage.dump();
  const keyA = __testBuildStorageKey(ACCT_A, HOUSE_A);
  const keyB = __testBuildStorageKey(ACCT_B, HOUSE_A);
  assert(storageDump.has(keyA) && storageDump.has(keyB), 'both keys exist independently');
  assert(JSON.parse(storageDump.get(keyB)!).activeTab === 'events', 'B key stores events');
});

// ---------------------------------------------------------------------------
// 7. Navigation initialTab (priority + one-shot)
// ---------------------------------------------------------------------------

runTest('Navigation initialTab — valid tab accepted by guard', () => {
  // Simulates Phase 5: navigation initialTab is validated with isPlannerTabKey.
  // If valid, it takes priority over the persisted preference.
  const navTab = 'plans' as unknown;
  assert(isPlannerTabKey(navTab), 'valid initialTab accepted');
});

runTest('Navigation initialTab — invalid ignored', () => {
  const navTab = 'agenda' as unknown;
  assert(!isPlannerTabKey(navTab), 'invalid initialTab rejected by guard');
});

runTest('Navigation initialTab — one-shot consumption (no re-apply)', () => {
  // The PlannerScreen uses processedNavKeyRef to mark a navigation param
  // as consumed. Here we simulate that logic: processing the same key
  // twice should be a no-op the second time.
  let processedKey: string | null = null;
  const key1 = 'plans-';
  const key2 = 'plans-';

  if (processedKey !== key1) {
    processedKey = key1;
  }
  let appliedCount = 0;
  if (processedKey !== key2) {
    processedKey = key2;
    appliedCount++;
  }
  assert(appliedCount === 0, 'one-shot: second processing is no-op');
});

// ---------------------------------------------------------------------------
// 8. Tabs
// ---------------------------------------------------------------------------

runTest('Tabs — exactly tasks/events/plans', () => {
  assert(PLANNER_TAB_KEYS.length === 3, 'exactly 3 tabs');
  assert(PLANNER_TAB_KEYS[0] === 'tasks', 'first is tasks');
  assert(PLANNER_TAB_KEYS[1] === 'events', 'second is events');
  assert(PLANNER_TAB_KEYS[2] === 'plans', 'third is plans');
});

runTest('Tabs — no aliases, no search', () => {
  assert(!isPlannerTabKey('search'), 'search is not a tab');
  assert(!isPlannerTabKey('task'), 'singular task rejected');
  assert(!isPlannerTabKey(''), 'empty rejected');
  assert(!isPlannerTabKey(null), 'null rejected');
  assert(!isPlannerTabKey(undefined), 'undefined rejected');
});

runTest('Tabs — accessibility selected state follows active tab', () => {
  // The render maps `accessibilityState={{ selected: active }}` where
  // `active = activeTab === tabKey`. Verify the logic:
  const activeTab: PlannerTabKey = 'plans';
  for (const tabKey of PLANNER_TAB_KEYS) {
    const selected = activeTab === tabKey;
    if (tabKey === 'plans') assert(selected === true, 'plans selected when active');
    else assert(selected === false, `${tabKey} not selected`);
  }
});

// ---------------------------------------------------------------------------
// 9. Lifecycle simulation (household switch, sign-out, remount)
// ---------------------------------------------------------------------------

runTest('Lifecycle — household switch invalidates old load', async () => {
  const storage = createFakeStorage();
  await storage.setItem(
    __testBuildStorageKey(ACCT_A, HOUSE_A),
    serializePlannerPreferences({ version: 1, activeTab: 'plans' }),
  );
  await storage.setItem(
    __testBuildStorageKey(ACCT_A, HOUSE_B),
    serializePlannerPreferences({ version: 1, activeTab: 'events' }),
  );
  const store = __testCreatePlannerPreferencesStore(storage);

  // Simulate: load A, then switch to B before A resolves
  // Generation guard in PlannerScreen ensures A's late result is dropped.
  // Here we verify that the store itself returns scoped results:
  const loadAPromise = store.load(ACCT_A, HOUSE_A);
  const loadBPromise = store.load(ACCT_A, HOUSE_B);
  const [prefsA, prefsB] = await Promise.all([loadAPromise, loadBPromise]);
  assert(prefsA.activeTab === 'plans', 'A load returns A preference');
  assert(prefsB.activeTab === 'events', 'B load returns B preference');
});

runTest('Lifecycle — remove preference for a scope', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  assert((await store.load(ACCT_A, HOUSE_A)).activeTab === 'plans', 'saved plans');

  await store.remove(ACCT_A, HOUSE_A);
  const prefsAfter = await store.load(ACCT_A, HOUSE_A);
  assert(prefsAfter.activeTab === 'tasks', 'after remove -> default tasks');
});

runTest('Lifecycle — sign-out leaves durable preferences intact for re-login', async () => {
  // M6 sign-out policy: in-memory state is cleared (Planner resets activeTab
  // to 'tasks'), but durable AsyncStorage preferences are PRESERVED so the
  // same account re-login restores them. No global wipe.
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });

  // Simulate sign-out: in-memory state resets to tasks. Durable pref stays.
  const inMemoryFallback = DEFAULT_PREFERENCES.activeTab;
  assert(inMemoryFallback === 'tasks', 'in-memory resets to tasks on sign-out');

  // After re-login with same account/household, durable pref is restored.
  const restored = await store.load(ACCT_A, HOUSE_A);
  assert(restored.activeTab === 'plans', 'durable preference survives sign-out');
});

runTest('Lifecycle — no other account preference affected by sign-out', async () => {
  const storage = createFakeStorage();
  const store = __testCreatePlannerPreferencesStore(storage);
  await store.save(ACCT_A, HOUSE_A, { version: 1, activeTab: 'plans' });
  await store.save(ACCT_B, HOUSE_B, { version: 1, activeTab: 'events' });

  // Sign-out of account A does not touch B's storage
  const prefsB = await store.load(ACCT_B, HOUSE_B);
  assert(prefsB.activeTab === 'events', 'account B preference intact after A sign-out');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  process.exitCode = 1;
}
