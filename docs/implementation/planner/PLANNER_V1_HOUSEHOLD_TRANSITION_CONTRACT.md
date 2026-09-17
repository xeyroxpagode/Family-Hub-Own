# Planner V1 — Household Transition Contract (M7)

> **Authority**: `front/mi-front-limpio/services/planner/plannerContextIdentity.ts`,
> `plannerTransitionTypes.ts`, `plannerTransitionCoordinator.ts`,
> `PlannerScreen.tsx` (M7 integration), Core lifecycle registry.
>
> **Phase**: M7 — PASSED.

## 1. Context identity

```ts
type PlannerContextIdentity = {
  authIdentityId: string;  // auth_user_id (account identifier)
  householdId: string;     // active household
  membershipId: string;    // membership in this household
  generation: number;      // monotonic counter from plannerCache
};
```

Rules:
- No household name, no email, no display name, no `household.created_by`.
- `generation` is a number, not a timestamp.
- Comparison is explicit via `isSamePlannerContext` / `isPlannerContextCurrent`.
- No closures used as the sole identity check.
- Token never exposed in identity.

## 2. Generation

- `plannerCache.captureContextToken()` returns the current monotonic generation.
- `plannerCache.advanceGeneration()` increments it on household switch / sign-out.
- A previous generation never becomes current again.
- `PlannerContextIdentity.generation` mirrors the cache generation at the time of capture.

## 3. Ordering

Before activating the new household:
1. Mark previous context as `leaving` (conceptual).
2. Close Planner Sheet Host (`closeSheets()`) — also enforced by `planner.sheet-host` at lifecycle order 110 via `HOUSEHOLD_CHANGED`.
3. Clear submit locks and intents (`clearIntents()`).
4. Abort Planner requests — Core `core.requests` at order 10 calls `appRequestRegistry.cancelAll()`.
5. Seal previous generation — `planner.server-state` at order 100 calls `plannerCache.cleanupHouseholdSwitch` which advances generation and cancels scope.
6. Prevent new mutations (shell denies Quick Actions while `!capabilitiesReady`).

After activating the new household:
1. Create new `PlannerContextIdentity` with current cache generation.
2. Reset active tab in-memory to safe default (`tasks`).
3. Load M6 preferences for the new context (deny-safe).
4. Load capabilities for the new context (deny-safe → null on failure).
5. Enable requests for the new context (cache uses new household-scoped keys).
6. Load Planner content (summary, capabilities).
7. Show `ready` state.

## 4. Abort

- Each request can receive an `AbortSignal` (via `requestJson` options).
- `appRequestRegistry.cancelScope(householdId)` aborts all controllers for that household.
- `appRequestRegistry.cancelAll()` aborts all controllers globally (used by `core.requests`).
- `AbortError` is distinguished from functional errors and never surfaced as user-facing error.
- No automatic retry after abort.
- No result applied after abort.

## 5. Late guards

Every callback that writes state, cache, navigation, toast, telemetry, or consumes a one-shot MUST verify:

```ts
if (!isPlannerContextCurrent(capturedContext, currentContextIdentityRef.current)) return;
```

Applied in `PlannerScreen`:
- `loadSummary` success path.
- `loadSummary` error path (after abort check).
- `loadCapabilities` success path.
- `loadCapabilities` error path (after abort check).

## 6. Cache

- Keys are household-scoped via `plannerKeys.*` (every key includes `householdId`).
- `cleanupHouseholdSwitch` advances generation + cancels scope + clears old household entries.
- Policy: **retain sealed cache** (old data stays in memory but is invisible because `entry.generation !== currentGeneration`).
- No `invalidateAll`.
- Optimistic mutations from A's generation cannot reconcile in B (pending mutations are scope-filtered; reconciliation checks `pending.generation === generation`).

## 7. Preferences (M6 integration)

- `plannerPreferencesStore.load(accountId, householdId)` runs after the new context is active.
- M6's hydration generation guard discards late loads from A.
- A late save from A writes A's key (not B's) — no cross-contamination.
- Manual selection in B blocks late hydration from A (M6 `manualSelectionRef`).
- `initialTab` from navigation (M1) takes priority over persisted preference.

## 8. Mutations

During `leaving` or `loading`:
- Quick Actions do not open new mutations (shell denies while `!capabilitiesReady` or sheet is closed by `HOUSEHOLD_CHANGED`).
- Open forms are closed (sheet host lifecycle).
- Active submit is aborted or sealed (sheet host blocks close during submit; `HOUSEHOLD_CHANGED` force-closes).
- Late success is ignored (M7 identity guard).
- Late error is ignored (M7 identity guard).
- Intent is cleared (sheet host `forceClose` resets `activeIntentId`).
- Lock is cleared (sheet host `forceClose` resets `isSubmitting`).
- No navigation, no cache B update, no toast.

## 9. Session

- `core.requests` (order 10) cancels all requests on sign-out.
- `core.feature-flags` (order 20) clears all flag projections on sign-out.
- `planner.server-state` (order 100) clears the entire session cache + advances generation.
- `planner.sheet-host` (order 110) force-closes any sheet on sign-out.
- `PlannerScreen` nullifies `currentContextIdentityRef` when the context key becomes null.
- Durable preferences (M6) are preserved in AsyncStorage for re-login.

## 10. Error recovery

- If the new context fails to load (capabilities or preferences error), the coordinator returns `failed` with an `errorClass` (no raw Error).
- The shell shows a recoverable error state with retry targeting the new context.
- No fallback to the old household (the switch already activated server-side).

## Prohibitions

- No household name as identity.
- No email or display name as identity.
- No `household.created_by` as identity.
- No timestamp as generation.
- No closure-only identity check.
- No global AbortController that lives forever.
- No `invalidateAll`.
- No second active household authority.
- No reusing old capabilities in the new context.
- No reusing old Search gate in the new context.
- No global cleanup of other accounts on household switch.
- No duplicating Core lifecycle.