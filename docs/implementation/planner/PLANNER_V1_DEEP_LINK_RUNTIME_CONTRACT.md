# Planner V1 — Deep Link Runtime Contract (M10)

**Authority:** Single runtime owner: `PlannerDeepLinkCoordinator`  
**Phase:** M10 — PASSED  
**Implements:** `planner_v1_implementation_order.md` §M10

---

## 1. Prefixes & Schemes (Physical Config)

| Source | Value | Notes |
|--------|-------|-------|
| Custom scheme | `homeplus://` | From `Linking.createURL('/')` in development build |
| Development URL | `exp://...` | Expo Go — limited, custom scheme not active |
| Universal / App Links | **Not configured** | No domain, no `assetlinks.json`, no AASA |
| iOS URL Schemes | `homeplus` | Declared in `app.json` / `app.config.ts` |
| Android intent filters | `homeplus` scheme + `homeplus.com` host | Via Expo prebuild / EAS build |

**Effective allowlist (configured at runtime):**
```typescript
configureDeepLinkPrefixes(['homeplus://', 'homeplusapp://'], ['homeplus.com']);
```

---

## 2. Canonical Path Map

| Route | Path Pattern | Params | Screen |
|-------|--------------|--------|--------|
| Planner Root | `planner` | `initialTab?`, `source?` | `PlannerTab` → `PlannerHome` |
| Task Detail | `planner/tasks/:entityId` | `entityId` (UUID), `source?`, `returnTo?`, `justCreated?` | `TaskDetail` |
| Event Detail | `planner/events/:entityId` | `entityId` (UUID), `source?`, `returnTo?`, `justCreated?` | `EventDetail` |
| Goal Detail | `planner/goals/:entityId` | `entityId` (UUID), `source?`, `returnTo?`, `justCreated?` | `GoalDetail` |
| Planner Search | `planner/search` | `source?`, `returnTo?` | `PlannerSearch` (gated) |

**No other paths accepted.** Extra segments, missing entityId, unknown routes → `unsupported_route`.

---

## 3. Parameters (Serializable Only)

```typescript
// Planner Root
{ initialTab?: 'tasks'|'calendar'|'goals', source?: PlannerNavigationSource }

// Entity Detail (Task/Event/Goal)
{ entityId: string, source?: PlannerNavigationSource, returnTo?: PlannerReturnTarget, justCreated?: boolean }

// Search
{ source?: PlannerNavigationSource, returnTo?: PlannerReturnTarget }
```

**Rejected at parse time:**
- Non-UUID `entityId`
- Unknown `initialTab` values
- Search query params (`q`, `query`, `search`, etc.)
- Household ID, entity objects, tokens, callbacks

---

## 4. Parsing Rules (Deny-Safe)

1. **Scheme/host allowlist** — only configured prefixes/hosts accepted
2. **Path structure** — exact match to canonical paths above
3. **UUID validation** — RFC 4122 v1–v5, optional braces `{...}`
4. **Query params** — only `tab` (root) and `source` allowed; search queries explicitly rejected
5. **Encoding** — invalid percent-encoding → `invalid_url`
6. **Source inference** — `injectSource` (notification adapter) > query `source` > `'deep_link'` default
7. **Never throws** — returns `{ ok: false, reason }` for any invalid input

---

## 5. Readiness Gates (Execution Order)

Intent only navigates when **ALL** are true:

| Gate | Signal | Defer Behavior |
|------|--------|----------------|
| Navigation ready | `NavigationContainer` ref set | Queue intent |
| Auth resolved | `session` + `authMe` non-null | Queue intent |
| Household ready | `currentHousehold` non-null | Queue intent |
| Context identity | `PlannerContextIdentity` captured | Queue intent |
| Capabilities (Search) | `planner.view` + `planner.search` + flag `planner.search_entry` | Defer Search only |

**No navigation before gates pass.** No Home flash, no double navigation.

---

## 6. Cold Start Flow (App Closed)

```
App launch
  → NavigationContainer mounts
  → PlannerDeepLinkProvider mounts
  → Linking.getInitialURL() → receiveUrl()
  → parse → validate → normalize → enqueue
  → Auth restore (Supabase onAuthStateChange)
  → authMe load
  → HouseholdContext derives currentHousehold
  → PlannerContextIdentity created (generation from cache)
  → Coordinator gates satisfied
  → executeNavigation()
  → PlannerTab → PlannerHome (initialTab) OR TaskDetail/EventDetail/GoalDetail
```

**No Home screen flash.** Deep link target is first visible screen.

---

## 7. Warm Start Flow (App Open)

```
Linking event (url)
  → receiveUrl()
  → parse → validate → normalize
  → dedup check (fingerprint + 2s window)
  → if ready: navigate once
  → else: queue, retry on gate change
```

**Deduplication:** Same fingerprint within window → `duplicate` result, no second navigation.

---

## 8. No-Session Continuation

```
Deep link received
  → parse → enqueue (deferred: auth not ready)
  → AppNavigator shows AuthStack
  → User completes sign-in/sign-up
  → authMe + household resolved
  → Coordinator auto-retries deferred intent
  → navigate to target
```

**Onboarding cannot be skipped.** Intent only fires after `currentHousehold` non-null.

---

## 9. Onboarding / Incomplete Registration

If authenticated user lacks:
- Display name
- Active household
- Membership approval

Intent remains deferred until `currentHousehold` exists. **Never auto-switch household.**

---

## 10. Active Household Resolution

- **Never** accept `householdId` from URL
- Entity resolved server-side via RLS within `currentHousehold`
- Cross-household entity → 404/403 (safe)
- Generation guard: `capturedGeneration !== currentGeneration` → discard

---

## 11. Household Switch During Resolution

```
Intent A enqueued (gen=3)
  → User switches household
  → cache.advanceGeneration() → gen=4
  → Intent A retries
  → Handler sees gen mismatch (3 ≠ 4) → discards
  → No navigation, no error UI, no cache corruption
```

---

## 12. Entity Detail Screens (Task/Event/Goal)

| Screen | Fetch | AuthZ | States |
|--------|-------|-------|--------|
| TaskDetail | `GET /api/planner/tasks/:id` | `planner.view` | loading, not_found, forbidden, conflict, ready |
| EventDetail | `GET /api/planner/events/:id` | `planner.view` | loading, not_found, forbidden, ready |
| GoalDetail | `GET /api/planner/goals/:id` | `planner.view` | loading, not_found, forbidden, ready |

**Params transported:** `entityId`, `source`, `returnTo`, `justCreated` (one-shot).  
**Never:** full entity, householdId, capabilities, callbacks.

---

## 13. Planner Root & Tabs

```
homeplus://homeplus.com/planner?tab=calendar&source=home
  → PlannerTab → PlannerHome { initialTab: 'calendar', source: 'home' }
```

- `initialTab` validated against `PlannerTabKey` (`tasks`|`calendar`|`goals`)
- Invalid tab → ignored (defaults to persisted or `tasks`)
- M6 persistence: user selection wins over deep link after first interaction

---

## 14. Planner Search Gate

```
homeplus://homeplus.com/planner/search
  → Coordinator checks:
     1. flagsLoading || !capabilitiesReady → defer
     2. !flagOn → reject (feature_disabled)
     3. !capabilityOn → reject (forbidden)
     4. both true → navigate to PlannerSearchScreen
```

**Search screen** renders "unavailable" state (no backend search). No query param accepted.

---

## 15. Not Found / Forbidden

| Condition | Response |
|-----------|----------|
| Entity not in household | 404 → `not_found` → "El elemento ya no esta disponible." |
| Capability denied | 403 → `forbidden` → "No tenes permiso para ver este contenido." |
| Invalid UUID | Parse reject → `invalid_entity_id` |
| Search disabled | Gate reject → `feature_disabled` |

**Never:** redirect silently, reveal existence, search other households.

---

## 16. Back Stack (Deterministic)

Uses `resolvePlannerBackBehavior` (M1 contract):

| Entry Source | `returnTo` | History | Action |
|--------------|------------|---------|--------|
| Planner tab | `planner` | yes | `goBack()` |
| Planner tab | `planner` | no | `navigate('PlannerTab', { initialTab })` |
| Home/QuickAction | `home` | any | `navigate('PlannerTab', { initialTab })` |
| Deep link / cold | `previous`/absent | no | `navigate('PlannerTab', { initialTab })` |
| Any | `previous` | yes | `goBack()` |

Runtime `navigation.canGoBack()` checked at press time.

---

## 17. Deduplication

**Fingerprint:** `{ kind, entityId|null, source }` — no PII, no titles, no query.

| Scenario | Result |
|----------|--------|
| Same URL twice < 2s | `duplicate` — second discarded |
| Same URL after 2s | Allowed (explicit re-open) |
| Different entity | Separate navigation |
| Sign-out | Clears all fingerprints |
| Account switch | Clears all fingerprints |
| Household switch | Clears all fingerprints |

---

## 18. One-Shot Consumption

Intent lifecycle: `received` → `waiting` → `resolving` → `consumed` | `discarded`

- `consumed`: removed from queue, fingerprint recorded for dedup window
- `discarded`: timeout, auth fail, generation change, session clear
- Never re-executes on focus/refresh/remount

---

## 19. Notification Entry (Stub)

```typescript
// M11 will implement
notificationPayload → allowlist → PlannerDeepLinkIntent
```

Allowlist: `task_detail`, `event_detail`, `goal_detail`, `planner_root`, `planner_search`.  
Arbitrary URL from payload **rejected**.

---

## 20. Internal Navigation Convergence

| Origin | Mechanism | Contract |
|--------|-----------|----------|
| Deep link | `PlannerDeepLinkCoordinator` → `openEntityDetail` | M10 |
| Quick Action | `PlannerSheetContext` → `openTaskDetail` | M1/M4 |
| Home Summary | `openTaskDetail` / `openEventDetail` / `openGoalDetail` | M9/M1 |
| Notification | `useNotificationDeepLinkAdapter` (stub) | M11 |

**Single authority:** `plannerNavigationHelpers.ts` → `plannerNavigationContract.ts`

---

## 21. Telemetry (Privacy-Safe)

| Event | Props (allowlisted) |
|-------|---------------------|
| `planner_deep_link_received` | `target_type`, `source`, `app_state: 'cold'|'warm'` |
| `planner_deep_link_opened` | `target_type`, `source`, `result: 'success'`, `latency_bucket` |
| `planner_deep_link_rejected` | `target_type`, `source`, `result: 'rejected'`, `reason_code` |
| `planner_deep_link_failed` | `target_type`, `source`, `result: 'failed'`, `error_code` |

**Forbidden:** entityId, URL, query, title, householdId, accountId, actor, token, payload, stack.

---

## 22. Accessibility (Post-Nav)

- Detail heading = entity title (announced)
- Loading → "Cargando..." (polite)
- Not found / Forbidden → announced with retry action
- Back button: `accessibilityLabel="Volver a Planner"`
- Initial focus: title / first control
- No focus hijack during restore
- Large text / contrast / reduced motion / safe areas: design system defaults

---

## 23. Platform Behaviour

| Platform | Status | Notes |
|----------|--------|-------|
| Android (dev build) | ✅ Executed | `adb shell am start ...` / `npx uri-scheme` |
| iOS (static) | ✅ Validated | Scheme in config; Universal Links NOT configured |
| iOS (runtime) | ❌ Not executed | Requires macOS/device/EAS build |
| Web (Expo Web) | ✅ Works | Paths, refresh, session, back all work |

---

## 24. Error Taxonomy (User Messages)

| Code | Message |
|------|---------|
| `invalid_url` | "El enlace no es valido." |
| `unsupported_route` | "El enlace no es valido." |
| `invalid_entity_id` | "El enlace no es valido." |
| `auth_required` | "Inicia sesion para acceder a Planner." |
| `household_unresolved` | "Configura tu hogar antes de usar Planner." |
| `forbidden` | "No tenes permiso para ver este contenido." |
| `not_found` | "El elemento ya no esta disponible." |
| `feature_disabled` | "La busqueda no esta disponible en este momento." |
| `navigation_unavailable` | "No se pudo abrir el destino en este momento." |
| `timeout` / `abort` | "No se pudo abrir el destino en este momento." |
| `generation_changed` / `account_changed` / `session_cleared` | "El enlace se descarto por un cambio de contexto." |

---

## 25. Prohibitions (Enforced)

- ❌ Household ID in URL as authority
- ❌ Entity payload in route params
- ❌ Tokens / credentials in URL
- ❌ Search query in deep link
- ❌ Bypassing Search gate
- ❌ Auto-switch household
- ❌ Skip onboarding
- ❌ Persist sensitive URL fragments
- ❌ Parallel coordinators
- ❌ M11 features in M10