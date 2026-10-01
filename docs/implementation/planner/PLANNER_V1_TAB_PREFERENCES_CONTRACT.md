# PLANNER V1 — TAB PREFERENCES CONTRACT

## 1. Canonical Tab Keys

| Key | Label (ES) | Icon | Order |
|-----|------------|------|-------|
| `tasks` | Tareas | `checkbox` | 1 |
| `calendar` | Calendario | `calendar` | 2 |
| `goals` | Metas | `flag` | 3 |

**Type**:
```ts
type PlannerTabKey = 'tasks' | 'calendar' | 'goals';
```

**Constants**:
```ts
const PLANNER_TAB_KEYS: readonly PlannerTabKey[] = ['tasks', 'calendar', 'goals'];
```

**Guard**:
```ts
function isPlannerTabKey(value: unknown): value is PlannerTabKey
```

---

## 2. Default Tab

- **Value**: `'tasks'`
- **Constant**: `DEFAULT_TAB: PlannerTabKey = 'tasks'`
- **Used when**: No valid persisted preference, no valid navigation `initialTab`, storage failure, corrupt data, invalid version, unknown tab key.

---

## 3. Scope

**Preference belongs to exactly one (account, household) pair.**

| Scope Element | Source | Notes |
|---------------|--------|-------|
| `accountId` | `authMe.person.auth_user_id` | UUID of authenticated Supabase account (unique per login) |
| `householdId` | `currentHousehold.id` | UUID of active household |

**Rules**:
- One account ≠ inherits another account's preference.
- One household ≠ inherits another household's preference.
- Same household ID under different accounts = separate preferences (creator vs member).
- Switching household restores **that household's** preference for the **current account**.
- Sign-out clears **in-memory** state; **durable** preference retained for next login.

---

## 4. Storage Key Format

```
@homeplus/planner/preferences/v1/{accountId}/{householdId}
```

| Segment | Value | Example |
|---------|-------|---------|
| Prefix | `@homeplus/planner/preferences/` | Fixed |
| Version | `v1` | Incremented for schema changes |
| Account | `{accountId}` | `a70ee1c0-0000-41d4-a716-446655440000` |
| Household | `{householdId}` | `a90ee3c0-0000-41d4-a716-446655440000` |

**Invalid/Incomplete Context**:
- Missing `accountId` or `householdId` → key becomes `@homeplus/planner/preferences/v1/missing/missing`
- This key never matches a real scope → loads default, never collides.

**Forbidden in Key**:
- Email, display name, person name
- Auth token, session token
- Household display name
- Array index, active tab index
- Timestamps

---

## 5. Payload Schema

```ts
type PlannerPreferences = {
  version: 1;
  activeTab: PlannerTabKey;
};
```

**Wire format (JSON)**:
```json
{
  "version": 1,
  "activeTab": "goals"
}
```

**Constraints**:
- `version` must be integer `1` (unknown → reject).
- `activeTab` must be canonical key (aliases rejected).
- Unknown properties ignored (forward-compatible).
- No extra fields (timestamps, sources, metadata).

---

## 6. Parser (Deny-Safe)

```ts
function parsePlannerPreferences(raw: unknown): PlannerPreferences | null
```

| Input | Result |
|-------|--------|
| `{ version: 1, activeTab: 'tasks' }` | ✅ Parsed |
| `{ version: 1, activeTab: 'calendar' }` | ✅ Parsed |
| `{ version: 1, activeTab: 'goals' }` | ✅ Parsed |
| `{ version: 2, ... }` | ❌ `null` (unknown version) |
| `{ version: '1', ... }` | ❌ `null` (type mismatch) |
| `{ activeTab: 'tasks' }` | ❌ `null` (missing version) |
| `{ version: 1, activeTab: 'task' }` | ❌ `null` (alias) |
| `{ version: 1, activeTab: 'search' }` | ❌ `null` (not a tab) |
| `null`, `undefined`, `[]`, `123`, `'string'` | ❌ `null` (non-object) |
| `{ version: 1, activeTab: 'goals', extra: 'x' }` | ✅ Parsed (extra ignored) |

**Never throws** — returns `null` on any invalid input.

---

## 7. Serializer

```ts
function serializePlannerPreferences(prefs: PlannerPreferences): string
```

- Output: `JSON.stringify({ version: prefs.version, activeTab: prefs.activeTab })`
- Stable ordering (version first, then activeTab).
- Round-trip: `parse(serialize(p)) === p` for valid `p`.

---

## 8. Storage Adapter

**Interface**:
```ts
type PlannerPreferencesStore = {
  load(accountId: string, householdId: string): Promise<PlannerPreferences>;
  save(accountId: string, householdId: string, prefs: PlannerPreferences): Promise<void>;
  remove(accountId: string, householdId: string): Promise<void>;
};
```

**Implementation**: `plannerPreferencesStore` (singleton) using `@react-native-async-storage/async-storage` (lazy-required).

**Behavior**:
| Method | Error Handling | Returns |
|--------|----------------|---------|
| `load` | Swallows all errors | `DEFAULT_PREFERENCES` on any failure |
| `save` | Swallows all errors | `void` (fire-and-forget) |
| `remove` | Swallows all errors | `void` |

**Test Injection**:
```ts
createPlannerPreferencesStore(fakeStorage: AsyncStorageLike): PlannerPreferencesStore
```

---

## 9. Save Policy

| Trigger | Persists? | Notes |
|---------|-----------|-------|
| User taps tab | ✅ Yes | Immediate UI, background save |
| Navigation `initialTab` | ❌ No | One-shot, not persisted |
| Hydration load | ❌ No | Read-only |
| Programmatic `setActiveTab` (not user) | ❌ No | Internal use only |
| Sign-out | ❌ No | In-memory reset only |

**Write Ordering**:
- Each user tap increments a **revision counter**.
- Save captures revision at call time.
- Only the **latest revision** completes its write (older ones early-return).
- Multiple rapid taps → last tap's value persisted.

**No Debounce** — revision counter provides natural sequencing.

---

## 10. Retention Policy

| Event | Durable Preference (AsyncStorage) | In-Memory State |
|-------|-----------------------------------|-----------------|
| User selects tab | Written (explicit) | Updated |
| Household switch | Unchanged (scoped to old HH) | Cleared → loads new HH's pref |
| Sign-out | **Preserved** | Reset to `tasks` |
| Sign-in (same account+HH) | **Read** | Restored from storage |
| Account switch (diff account) | Unchanged (scoped to old account) | Loads new account's pref |
| App uninstall | Cleared (OS) | N/A |
| Explicit `remove()` call | Deleted | N/A |

**Rationale**: Preference is UX convenience, not auth data. Retaining it avoids "reset to Tasks" on re-login.

---

## 11. Invalid Value Handling

| Invalid Case | Parser Result | Runtime Fallback | Persisted? |
|--------------|---------------|------------------|------------|
| Unknown version | `null` | `tasks` | No (read-only) |
| Corrupt JSON | `null` | `tasks` | No |
| Alias (`task`, `events`, `goal`) | `null` | `tasks` | No |
| Non-tab (`search`, `agenda`) | `null` | `tasks` | No |
| Missing `activeTab` | `null` | `tasks` | No |
| Wrong type (`version: "1"`) | `null` | `tasks` | No |

**Tab key validity ≠ Content permission**. A persisted `'goals'` tab key is valid even if user lacks `goal.create_*` capability. The tab renders; content empties per capability (M2/M4/M8).

---

## 12. Ownership

| Component | Owns |
|-----------|------|
| `PlannerScreen` | `activeTab` runtime state, hydration trigger, selection handler |
| `plannerPreferencesStore` | AsyncStorage read/write, key building, codec |
| `plannerNavigationContract` | `PlannerTabKey`, `isPlannerTabKey` (single authority) |
| Core Lifecycle | Context change signals (generation advance via `plannerCache`) |

**Single Sources of Truth**:
- Tab keys: `navigation/plannerNavigationContract.ts`
- Default tab: `plannerPreferences.ts` (`DEFAULT_PREFERENCES`)
- Storage key format: `plannerPreferences.ts` (`buildStorageKey`)
- Codec: `plannerPreferences.ts` (`parsePlannerPreferences`, `serializePlannerPreferences`)

---

## 13. Prohibitions

| Prohibited | Reason |
|------------|--------|
| Aliases (`'task'`, `'events'`, `'goal'`) as persisted values | Breaks parser, scope isolation |
| Global/shared key (`@homeplus/planner/last-tab`) | Cross-household contamination |
| Email/name/token in key | PII leak, scope instability |
| Timestamp as refresh signal | Clock skew, no invalidation semantics |
| Persisting `initialTab` | One-shot navigation ≠ user preference |
| Blocking UI on `save` | Latency, jank, failure surface |
| Throwing from parser/storage | Crashes Planner on corrupt local data |
| Multiple `activeTab` states | Source of truth ambiguity |
| Backend sync in M6 | Out of scope (M6 local-only) |

---

## 14. Compatibility

| Version | Compatible With | Notes |
|---------|-----------------|-------|
| v1 (current) | M1–M5, M6, M2 Shell, M3 Host | Baseline |
| v2 (future) | Requires explicit migrator; key becomes `/v2/` | Not automatic |

---

**This contract is binding for M6 and forward. Implementation in `front/mi-front-limpio/services/plannerPreferences.ts` and `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`.**