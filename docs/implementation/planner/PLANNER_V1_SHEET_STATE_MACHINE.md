# Planner V1 — M3 Sheet State Machine

> **Authority**: Pure reducer `sheetMachineReducer` in `plannerSheetState.ts`  
> **Version**: M3  
> **Status**: `PASSED`

---

## 1. States

```text
PlannerSheetState =
  | { kind: 'closed' }                              // no sheet visible
  | { kind: 'actions' }                             // Quick Actions menu
  | { kind: 'task_form';  mode: 'create'|'edit'; taskId?: string; source: PlannerNavigationSource; initialDueDate?: string }
  | { kind: 'event_form'; mode: 'create'|'edit'; eventId?: string; source: PlannerNavigationSource; initialDate?: string }
  | { kind: 'goal_form';  mode: 'create'|'edit'; goalId?: string; source: PlannerNavigationSource }
```

**Context (not state)**:
```text
SheetContext = { isSubmitting: boolean; activeIntentId: string | null }
```

---

## 2. Events

```text
PlannerSheetEvent =
  | { type: 'OPEN_ACTIONS' }
  | { type: 'OPEN_TASK';  input: OpenTaskInput }
  | { type: 'OPEN_EVENT'; input: OpenEventInput }
  | { type: 'OPEN_GOAL';  input: OpenGoalInput }
  | { type: 'REPLACE';    next: PlannerSheetState }
  | { type: 'REQUEST_CLOSE'; reason: PlannerSheetCloseReason }
  | { type: 'FORCE_CLOSE';   reason: PlannerSheetCloseReason }
  | { type: 'SUBMIT_BEGIN';  intentId: string }
  | { type: 'SUBMIT_END';    intentId: string }
  | { type: 'HOUSEHOLD_CHANGED' }
  | { type: 'SESSION_ENDED' }
```

---

## 3. Transition Table

| Current State | Event | Next State | Context Change | Notes |
|---------------|-------|------------|----------------|-------|
| *any* | `OPEN_ACTIONS` | `actions` | — | Idempotent if already `actions` |
| *any* | `OPEN_TASK` | `task_form` | — | Idempotent if same `mode`+`taskId` |
| *any* | `OPEN_EVENT` | `event_form` | — | Idempotent if same `mode`+`eventId` |
| *any* | `OPEN_GOAL` | `goal_form` | — | Idempotent if same `mode`+`goalId` |
| *any* (not submitting) | `REPLACE` | `next` | — | Silent swap, no animation |
| *any* (submitting) | `REPLACE` (≠ `closed`) | *unchanged* | — | Blocked |
| *any* (submitting) | `REPLACE` `closed` | `closed` | — | Allowed (force close path) |
| *any* (not submitting) | `REQUEST_CLOSE` | `closed` | — | User-requested |
| *any* (submitting) | `REQUEST_CLOSE` | *unchanged* | — | Blocked |
| *any* | `FORCE_CLOSE` | `closed` | `isSubmitting=false, activeIntentId=null` | Lifecycle only |
| *any* | `HOUSEHOLD_CHANGED` | `closed` | `isSubmitting=false, activeIntentId=null` | Core lifecycle |
| *any* | `SESSION_ENDED` | `closed` | `isSubmitting=false, activeIntentId=null` | Core lifecycle |
| *any* (not submitting) | `SUBMIT_BEGIN(id)` | *unchanged* | `isSubmitting=true, activeIntentId=id` | Lock |
| *any* (submitting, same id) | `SUBMIT_BEGIN(other)` | *unchanged* | — | Ignored |
| *any* (submitting, matching id) | `SUBMIT_END(id)` | *unchanged* | `isSubmitting=false, activeIntentId=null` | Unlock |
| *any* (submitting, stale id) | `SUBMIT_END(stale)` | *unchanged* | — | Ignored |

---

## 4. Invalid Transitions (compile-time prevented)

| From | Event | Why Invalid |
|------|-------|-------------|
| `closed` | `REQUEST_CLOSE` | No-op (already closed) |
| *any* (submitting) | `REQUEST_CLOSE` | Blocked — returns same state |
| *any* (submitting) | `REPLACE` (≠ `closed`) | Blocked — returns same state |
| *any* (submitting) | `SUBMIT_BEGIN` (different id) | Ignored — preserves original intent |
| *any* (not submitting) | `SUBMIT_END` | No-op — context unchanged |

---

## 5. Submit Correlation

```
User tap "Guardar"
  → beginSubmit('task_intent')  // isSubmitting=true, activeIntentId='task_intent'
  → createPlannerTask(...)      // network request
      → success
          → endSubmit('task_intent')  // isSubmitting=false, activeIntentId=null
          → requestClose('success') // → closed
      → error (non-abort)
          → endSubmit('task_intent')  // isSubmitting=false, activeIntentId=null
          → form stays open, draft intact
      → abort (household switch)
          → FORCE_CLOSE (lifecycle) // isSubmitting=false, activeIntentId=null
```

**Stale protection**: If `endSubmit('task_intent')` fires after a NEW `beginSubmit('task_intent_2')`, the stale call is ignored (`activeIntentId !== 'task_intent'`).

---

## 6. Lifecycle Cleanup

| Trigger | Event | Effect |
|---------|-------|--------|
| Household switch (before) | `HOUSEHOLD_CHANGED` | `closed`, lock reset |
| Sign-out (cleanup) | `SESSION_ENDED` | `closed`, lock reset |

**Order**: Provider registers at 110 (after `planner.server-state` at 100, before UI remounts).

---

## 7. Invariants

| # | Invariant | Enforcement |
|---|-----------|-------------|
| 1 | Exactly one `kind` active | Discriminated union |
| 2 | No simultaneous forms | Single `kind` — `task_form` OR `event_form` OR `goal_form` |
| 3 | No close while submitting | `REQUEST_CLOSE`/`REPLACE` blocked when `isSubmitting` |
| 4 | `FORCE_CLOSE` always works | Ignores `isSubmitting`, resets context |
| 5 | `open*` idempotent for same params | Early return in reducer |
| 6 | Stale `endSubmit` ignored | `activeIntentId` mismatch → no-op |
| 7 | Double `REQUEST_CLOSE` safe | Second call on `closed` → no-op |
| 8 | Lifecycle events reset context | `HOUSEHOLD_CHANGED` / `SESSION_ENDED` → `isSubmitting=false, activeIntentId=null` |
| 9 | Source always propagated | `Open*Input` requires `source: PlannerNavigationSource` |
| 10 | No full entities in state | Only IDs (`taskId`, `eventId`, `goalId`) |

---

## 8. TypeScript Encoding

```typescript
// State
export type PlannerSheetState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'actions' }
  | { readonly kind: 'task_form'; readonly mode: 'create' | 'edit'; readonly taskId?: string; readonly source: PlannerNavigationSource; readonly initialDueDate?: string }
  | { readonly kind: 'event_form'; readonly mode: 'create' | 'edit'; readonly eventId?: string; readonly source: PlannerNavigationSource; readonly initialDate?: string }
  | { readonly kind: 'goal_form'; readonly mode: 'create' | 'edit'; readonly goalId?: string; readonly source: PlannerNavigationSource };

// Context (held alongside state)
export type SheetContext = {
  readonly isSubmitting: boolean;
  readonly activeIntentId: string | null;
};

// Events
export type PlannerSheetEvent =
  | { readonly type: 'OPEN_ACTIONS' }
  | { readonly type: 'OPEN_TASK'; readonly input: OpenTaskInput }
  | { readonly type: 'OPEN_EVENT'; readonly input: OpenEventInput }
  | { readonly type: 'OPEN_GOAL'; readonly input: OpenGoalInput }
  | { readonly type: 'REPLACE'; readonly next: PlannerSheetState }
  | { readonly type: 'REQUEST_CLOSE'; readonly reason: PlannerSheetCloseReason }
  | { readonly type: 'FORCE_CLOSE'; readonly reason: PlannerSheetCloseReason }
  | { readonly type: 'SUBMIT_BEGIN'; readonly intentId: string }
  | { readonly type: 'SUBMIT_END'; readonly intentId: string }
  | { readonly type: 'HOUSEHOLD_CHANGED' }
  | { readonly type: 'SESSION_ENDED' };

// Reducer (pure)
export function sheetMachineReducer(
  state: PlannerSheetState,
  context: SheetContext,
  event: PlannerSheetEvent,
): { state: PlannerSheetState; isSubmitting: boolean; activeIntentId: string | null };
```

---

## 9. Test Coverage

**File**: `scripts/planner_v1_sheet_state_tests.ts`  
**Command**: `npm.cmd run test:planner:m3`  
**Results**: 32 pass / 0 fail

| Category | Tests |
|----------|-------|
| Initial state | 1 |
| OPEN_ACTIONS | 2 |
| OPEN_TASK | 4 |
| OPEN_EVENT | 3 |
| OPEN_GOAL | 2 |
| REPLACE | 3 |
| REQUEST_CLOSE | 2 |
| FORCE_CLOSE | 2 |
| HOUSEHOLD_CHANGED / SESSION_ENDED | 2 |
| SUBMIT lock | 4 |
| Double close / reopen safety | 2 |
| `isSheetClosed` guard | 2 |
| Source propagation | 3 |

All regressions (M1, M2, G0.3) remain green.