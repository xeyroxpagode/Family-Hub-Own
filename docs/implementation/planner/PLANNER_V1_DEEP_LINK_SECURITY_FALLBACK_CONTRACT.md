# Planner V1 — Deep Link Security & Fallback Contract

**Authority:** M10 Deep Links Runtime  
**Scope:** All Planner deep-link entry points (cold/warm start, notifications)  
**Binding:** This contract is enforced by parser, coordinator, and integration tests.

---

## 1. No Authorization by URL

> **A valid URL ≠ visible entity ≠ permitted action**

| Layer | Responsibility |
|-------|----------------|
| **Parser** | Syntax only — scheme, host, path, UUID, tab key. Never evaluates permissions. |
| **Coordinator** | Waits for `authReady` ∧ `householdReady` ∧ `capabilitiesReady`. Never navigates before. |
| **Detail Screen** | Fetches entity via `GET /api/planner/{tasks,events,goals}/:id` with Bearer token. Backend enforces RLS + capability. |
| **Backend** | `planner.view` capability required. RLS restricts to active household. 403/404 returned if denied. |

**No URL parameter grants access.** HouseholdId, entityId, source, returnTo are **context only** — never authority.

---

## 2. UUID Validation (Deny-Safe)

```typescript
// plannerNavigationContract.ts
const UUID_PATTERN = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\}?$/;

export function isValidPlannerEntityId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
```

**Accepted:** v1–v5, canonical or braced (`{...}`)  
**Rejected:** truncated, non-hex, empty, null, number, object, array, v6–v8, non-UUID strings

---

## 3. Household Isolation

| Rule | Enforcement |
|------|-------------|
| **No householdId in URL authority** | Parser rejects any `:householdId` segment; linking config has none |
| **Entity scoped to active household** | Backend RLS: `WHERE household_id = active_household_id` |
| **Entity in another household → 404** | Never 403 (would leak existence) |
| **No cross-household search** | Search gate uses active household capabilities only |
| **No global entity lookup** | Detail endpoints require active household context |

**Result:** Deep link to entity in household B while user is in household A → 404 (not_found), never reveals B exists.

---

## 4. Forbidden (403) Handling

| Trigger | Response |
|---------|----------|
| Capability `planner.view` missing | 403 → `planner_forbidden` |
| Entity capability denied (e.g., `task.complete_assigned`) | 403 on mutation; detail screen still loads if `planner.view` allowed |
| RLS violation | 403 → `rls_violation` (sanitized) |

**UI contract:**
- Screen renders "No tenes permiso para ver este contenido."
- Back button always available
- No retry loop, no cache of forbidden entity
- Capability refresh targeted (not global refetch)

---

## 5. Not Found (404) Handling

| Cause | Response |
|-------|----------|
| Entity deleted | 404 → `task_not_found` / `event_not_found` / `goal_not_found` |
| Entity in another household | 404 (never 403) |
| Invalid UUID caught by parser | Never reaches backend |

**UI contract:**
- Screen renders "El elemento ya no esta disponible."
- Back button → Planner root
- No silent redirect to different entity
- Cold start without history → Planner root fallback

---

## 6. Invalid Link Rejection

| Input | Parser Result |
|-------|---------------|
| `homeplus://planner/tasks/` | `unsupported_route` (missing entityId) |
| `homeplus://planner/tasks/not-a-uuid` | `invalid_entity_id` |
| `homeplus://planner/tasks/id/extra` | `unsupported_route` |
| `homeplus://planner/unknown` | `unsupported_route` |
| `homeplus://planner/search?q=test` | `invalid_url` (query rejected) |
| `https://evil.com/planner/tasks/id` | `invalid_url` (scheme rejected) |
| `homeplus://planner/tasks/%ZZ` | `invalid_url` (encoding error) |

**Never:** throw to UI, navigate anyway, partial match.

---

## 7. Search Disabled Gate

```typescript
// plannerSearchAccess.ts
resolvePlannerSearchAccess({ flags, flagsLoading, capabilities, capabilitiesReady })
  → { kind: 'loading' | 'disabled' | 'forbidden' | 'available' }
```

| State | Deep Link Behavior |
|-------|-------------------|
| `loading` | Defer until flags/caps ready |
| `disabled` (flag false) | Reject → `feature_disabled` |
| `forbidden` (cap false) | Reject → `forbidden` |
| `available` | Navigate to `PlannerSearchScreen` |

**Search screen** renders "unavailable" state (no backend). No query param accepted ever.

---

## 8. Notification Payload Allowlist

```typescript
// M11 stub — enforced by M10 parser
const ALLOWED_NOTIFICATION_KINDS = [
  'task_detail',
  'event_detail',
  'goal_detail',
  'planner_root',
  'planner_search',
] as const;
```

**Rejected:** arbitrary URL, `http(s)://`, unknown kind, householdId, query, token, callback.

---

## 9. Privacy (Telemetry)

| Emitted | Forbidden |
|---------|-----------|
| `target_type: 'task'|'event'|'goal'|'root'|'search'` | entityId, URL, query, title, description |
| `source: 'deep_link'|'notification'|'unknown'` | householdId, accountId, personId |
| `result: 'success'|'rejected'|'failed'` | actor, token, notification payload |
| `reason_code` (enum) | stack, backend body, raw error |
| `app_state: 'cold'|'warm'` | full entity, capabilities object |

**Validation:** `assertSafeStructuredData` on every event.

---

## 10. Fallback Rules (Exhaustive)

| Scenario | Fallback Destination |
|----------|---------------------|
| Cold start, no session | Auth stack → post-login continuation |
| Cold start, session, no household | Household selection → continuation |
| Cold start, session + household, gates fail | Planner root (tasks tab) |
| Warm start, duplicate fingerprint | Discard (no navigation) |
| Warm start, generation changed | Discard intent |
| Sign-out during resolution | Discard intent, clear queue |
| Account switch during resolution | Discard intent |
| Search gate disabled/forbidden | Planner root (tasks tab) |
| Entity 404/403 | Detail screen shows error + back to Planner root |
| No history on back | Planner root (tasks tab) |
| Parser rejects URL | Silent discard (no UI) |
| Coordinator disposed | All pending discarded |

**Never:** crash, white screen, infinite loop, Auth under detail, stale cache shown.

---

## 11. Prohibited Patterns (Enforced)

| Prohibition | Where Checked |
|-------------|---------------|
| HouseholdId as URL authority | Linking config (no `:householdId` segment) |
| Entity object in params | `isSerializablePlannerRouteParam` rejects non-primitives |
| Token in URL | Parser never extracts; AuthContext owns tokens |
| Search query in deep link | Parser rejects `q`, `query`, `search`, `term`, `find`, `keyword`, `text` |
| Bypass Search gate | Coordinator checks gate before navigate |
| Auto household switch | Never; 404 if entity not in active household |
| Skip onboarding/approval | AuthContext gates before Planner mounts |
| Persist URL with PII | Coordinator never persists; only in-memory fingerprint |
| Multiple coordinators | Single `PlannerDeepLinkProvider` at PlannerTab mount |
| M11 features in M10 | Notification adapter is stub; allowlist enforced |

---

## 12. Verification Matrix

| Contract | Test |
|----------|------|
| UUID validation | `planner_v1_navigation_tests.ts` — `isValidPlannerEntityId` |
| Parser deny-safe | `planner_v1_m10_tests.ts` — rejection cases |
| Household isolation | `planner_g0_3_cache_tests.ts` — A/B separation |
| Forbidden UI | `PlannerStateView` — `forbidden` state |
| Not found UI | `TaskDetailScreen` / `EventDetailScreen` error state |
| Search gate | `planner_v1_m7_tests.ts` — `resolvePlannerSearchAccess` |
| Back behavior | `resolvePlannerBackBehavior` unit tests |
| Dedupe | `createDeepLinkFingerprint` / `isSameDeepLinkFingerprint` |
| One-shot | `stripEphemeralParams` + coordinator state machine |
| Telemetry privacy | `test:secrets` + `planner_telemetry_events.js` allowlist |
| Cold/warm start | Runtime smoke + integration tests |