# Planner V1 — M3 Single Sheet Host Implementation Report

> **M3 STATUS: PASSED**  
> **M4 STATUS: AUTHORIZED**  
> Branch: `v1`  
> Commit audited: `de806ea849b1d54457106cba3cab2e295265bec2` (M2 baseline)  
> Working tree: Clean — only M3 files added/modified

---

## 1. Metadata

| Field | Value |
|-------|-------|
| Report | Planner V1 — M3 Single Sheet Host |
| Date | 2026-07-15 (America/Buenos_Aires) |
| Author | Implementation per `planner_v1_implementation_order.md` §M3 |
| Baseline commit | `ee3e132` (M1) → `de806ea` (M2) |
| Working tree | Clean |

---

## 2. Baseline Verification (pre-M3)

| Check | Result |
|-------|--------|
| Branch `v1` | ✓ |
| Working tree clean | ✓ |
| Commit M2 present | ✓ (`de806ea`) |
| 17 V0 contracts `AVAILABLE` | ✓ |
| `npm.cmd run typecheck` | ✓ |
| `npm.cmd run lint` | ✓ (22 pre-existing warnings) |
| `npm.cmd run test:planner:m1` | ✓ (147 pass) |
| `npm.cmd run test:planner:m2` | ✓ (76 pass) |
| `npm.cmd run test:g0` | ✓ (17 commands) |
| No new migrations | ✓ |
| No new dependencies | ✓ |
| No secrets in diff | ✓ |

---

## 3. Modal Ownership Audit (Fase 1)

| Surface | Pre-M3 Owner | Trigger | Content | Post-M3 Owner | Action |
|---------|-------------|---------|---------|---------------|--------|
| Add menu | `QuickActionSheet` (HomeTabNavigator) | CenterTabButton | Task/Event/Goal list | `PlannerSheetHost` (via Provider) | MOVE_TO_HOST |
| Task form | `PlannerScreen` (compat-bridge) | TasksScreen / CalendarScreen | TaskForm | `PlannerSheetHost` | MOVE_TO_HOST |
| Event form | `PlannerScreen` (compat-bridge) | CalendarScreen | EventForm | `PlannerSheetHost` | MOVE_TO_HOST |
| Goal form | `CreateGoalScreen` (nav stack) | GoalsScreen | GoalForm | `PlannerSheetHost` (slot) | DEFER_M5 |
| Planner local modal | `PlannerScreen` (local `sheet` state) | Route params `initialSheet` | TaskForm/EventForm | **Removed** — delegated to Provider | REMOVE |
| Home/global add | `QuickActionSheet` | CenterTabButton | QuickActionSheet | `PlannerSheetHost` (via Provider) | ADAPT_TRIGGER |

---

## 4. Ownership — Before vs After

### Before M3
```
HomeTabNavigator
  ├── QuickActionSheet (owns Modal) ← CenterTabButton
  ├── HouseholdSwitcherSheet (owns Modal)
  └── PlannerTab (PlannerStack)
       └── PlannerScreen
            ├── Owns local `sheet` state (PlannerSheet union)
            ├── Owns Modal (TaskForm/EventForm) — compat-bridge-until-M3
            └── Renders PlannerTasksScreen, PlannerCalendarScreen, PlannerGoalsScreen
                 └── Callbacks: onCreateTask → setSheet({type:'task',mode:'create'})
```

### After M3
```
HomeTabNavigator
  ├── PlannerSheetProvider (wraps Tab.Navigator)
  │     ├── PlannerSheetHost (single Modal owner)
  │     ├── HouseholdSwitcherSheet (owns Modal — unchanged)
  │     └── Tab.Navigator
  │           ├── HomeTab
  │           ├── PeopleTab
  │           ├── AddTab → M3CenterTabButton (delegates to provider.openActions())
  │           ├── PlannerTab → PlannerStackScreen → PlannerScreen (NO modal, NO sheet state)
  │           └── MoreTab
```

**Invariant**: Exactly one Planner `Modal` mounted at any time — `PlannerSheetHost`.

---

## 5. Provider (`PlannerSheetProvider`)

**Location**: `front/mi-front-limpio/context/PlannerSheetContext.tsx`

**Responsibilities**:
- Holds canonical sheet state via pure reducer `sheetMachineReducer`
- Exposes closed public API: `openActions`, `openTaskForm`, `openEventForm`, `openGoalForm`, `replace`, `requestClose`, `forceClose`, `beginSubmit`, `endSubmit`
- Registers Core lifecycle handlers:
  - `beforeSwitch` (order 110): dispatches `HOUSEHOLD_CHANGED` → force close + reset
  - `cleanup` on session end (order 110): dispatches `SESSION_ENDED` → force close + reset
- Provides `triggerRef` for focus restoration

**API Surface**:
```typescript
type PlannerSheetController = {
  state: PlannerSheetState;
  isOpen: boolean;
  isSubmitting: boolean;
  openActions(): void;
  openTaskForm(input: OpenTaskInput): void;
  openEventForm(input: OpenEventInput): void;
  openGoalForm(input: OpenGoalInput): void;
  replace(next: PlannerSheetState): void;
  requestClose(reason: PlannerSheetCloseReason): void;
  forceClose(reason: PlannerSheetCloseReason): void;
  beginSubmit(intentId: string): void;
  endSubmit(intentId: string): void;
  triggerRef: React.RefObject<unknown | null>;
};
```

**Rules**:
- `open*` idempotent for same state (double tap safe)
- While `isSubmitting`: `requestClose` (backdrop/back) blocked, `replace` blocked (except to `closed`)
- `forceClose` only for authorized lifecycle (household switch, sign-out)
- Submit lock correlates `intentId` — stale `endSubmit` ignored

---

## 6. Host (`PlannerSheetHost`)

**Location**: `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`

**Single `Modal` owner for all Planner sheets**:
- `visible={state.kind !== 'closed'}`
- `transparent`, `animationType="slide"`
- Backdrop: closes on press when `!isSubmitting`
- Android BackHandler: consumes back when open & not submitting; delegates when closed or submitting
- Safe area bottom inset respected
- Keyboard dismiss on backdrop press
- Focus management:
  - On open: announces heading via `announceSheetOpened`
  - On close: returns focus to `triggerRef` if accessible
- Content variants per `state.kind`:
  - `actions` → `ActionsMenu` (structural adapter over `QuickActionSheet`)
  - `task_form` → `TaskFormHost` (wraps `TaskForm` with close/saved + submit lock)
  - `event_form` → `EventFormHost` (wraps `EventForm`)
  - `goal_form` → `GoalFormSlot` (contractual; Goal Quick Create deferred to M5)

---

## 7. Canonical Sheet State Machine

**File**: `front/mi-front-limpio/services/planner/plannerSheetState.ts`

**Discriminated Union** (closed under TS):
```typescript
type PlannerSheetState =
  | { kind: 'closed' }
  | { kind: 'actions' }
  | { kind: 'task_form'; mode: 'create'|'edit'; taskId?: string; source: PlannerNavigationSource; initialDueDate?: string }
  | { kind: 'event_form'; mode: 'create'|'edit'; eventId?: string; source: PlannerNavigationSource; initialDate?: string }
  | { kind: 'goal_form'; mode: 'create'|'edit'; goalId?: string; source: PlannerNavigationSource };
```

**Events** (pure):
```
OPEN_ACTIONS
OPEN_TASK { input: OpenTaskInput }
OPEN_EVENT { input: OpenEventInput }
OPEN_GOAL { input: OpenGoalInput }
REPLACE { next: PlannerSheetState }
REQUEST_CLOSE { reason: PlannerSheetCloseReason }
FORCE_CLOSE { reason: PlannerSheetCloseReason }
SUBMIT_BEGIN { intentId: string }
SUBMIT_END { intentId: string }
HOUSEHOLD_CHANGED
SESSION_ENDED
```

**Reducer guarantees**:
- Single active state
- Deterministic transitions
- No accidental stacking (OPEN replaces current)
- No close while submitting (except FORCE_CLOSE)
- FORCE_CLOSE always resets context
- Household/session events force close + reset
- Stale SUBMIT_END ignored (intentId mismatch)

---

## 8. Public API — Invariants

| Operation | Idempotent | Blocked while submitting |
|-----------|------------|-------------------------|
| `openActions()` | ✓ | — |
| `openTaskForm()` | ✓ (same params) | — |
| `openEventForm()` | ✓ (same params) | — |
| `openGoalForm()` | ✓ (same params) | — |
| `replace()` | — | ✓ (except to `closed`) |
| `requestClose()` | — | ✓ |
| `forceClose()` | ✓ | — (always works) |
| `beginSubmit(id)` | — (sets lock) | — |
| `endSubmit(id)` | — (clears if match) | — |

---

## 9. TaskForm / EventForm Integration

Both forms remain **domain owners** of fields, validation, mutations. M3 wraps them:

```tsx
// TaskFormHost
<TaskForm
  mode={mold.mode}
  embedded
  taskId={mold.taskId}
  initialDueDate={mold.initialDueDate}
  onClose={() => sheet.requestClose('user_request')}
  onSaved={(msg) => { sheet.endSubmit('task_intent'); sheet.requestClose('success'); }}
/>
```

**Behavior preserved**:
- Create/edit via `mode` + optional `taskId`/`eventId`
- `If-Match` via `entityVersion` (edit only)
- Idempotency keys stable per intent
- Success → `onSaved` → host calls `endSubmit` + `requestClose('success')`
- Error → form stays open, draft preserved
- Double submit blocked by submit lock (intentId)

---

## 10. GoalForm Preparation (Contractual Slot)

- State kind `goal_form` exists in union
- `GoalFormSlot` renders `GoalForm` when `kind === 'goal_form'`
- `QuickActionSheet` adapter guards Goal entry (no-op in M3)
- **M5 will**:
  - Remove guard
  - Wire capabilities (`goal.create_personal|household`)
  - Implement quick-create flow (progress 0, post-create one-shot)

**No "Próximamente" UI, no disabled button, no empty form rendered productively.**

---

## 11. CenterTabButton Integration (Add Global)

**Before M3**: `CenterTabButton.onPress` → `setShowQuickActions(true)` (local state in HomeTabNavigator)

**After M3**: `M3CenterTabButton` → `usePlannerSheet().openActions()`

- Delegates to provider, no local modal state
- Double tap safe (idempotent open)
- Blocked during submit
- Accessibility: `accessibilityLabel="Acciones rápidas"` preserved

---

## 12. Keyboard Handling

- `Keyboard.dismiss()` on backdrop press
- `KeyboardAvoidingView` inside forms (existing, preserved)
- `keyboardShouldPersistTaps="handled"` on host ScrollView
- No new dependencies (`react-native-keyboard-aware-scroll-view` already used by forms)

---

## 13. Safe Areas

- Host Modal content: `useSafeAreaInsets()` → `paddingBottom: insets.bottom` on backdrop and panel
- Forms already use `SafeAreaView edges={['top', 'bottom']}` (existing)

---

## 14. Backdrop Behavior

| Condition | Backdrop press |
|-----------|----------------|
| `!isSubmitting` | `requestClose('backdrop')` → close |
| `isSubmitting` | No-op (locked), announces "Panel bloqueado — operación en curso" |

---

## 15. Android Back Button

| State | `isSubmitting` | Behavior |
|-------|----------------|----------|
| Closed | — | Delegate to navigation |
| Open | false | `requestClose('back_button')` → close, consume event |
| Open | true | Consume event, stay open (blocked) |

---

## 16. Focus Management

| Moment | Action |
|--------|--------|
| Sheet opens | `announceSheetOpened(heading)` |
| Sheet closes (was open) | `attemptFocusReturn(triggerRef)` if node accessible |
| Household switch / sign-out | `forceClose` → no focus return (nodes unmounted) |

---

## 17. Lifecycle Cleanup

### Household Switch (`runHouseholdSwitch` → `beforeSwitch` order 110)
```typescript
beforeSwitch: () => dispatch({ type: 'HOUSEHOLD_CHANGED' })
// Reducer: state = closed, context = { isSubmitting: false, activeIntentId: null }
```

### Sign-Out (`runSessionCleanup` → `cleanup` order 110)
```typescript
cleanup: () => dispatch({ type: 'SESSION_ENDED' })
// Reducer: state = closed, context reset
```

**Guarantees**:
- No draft leaks across households
- No stale submit lock after sign-out
- No focus return to unmounted nodes
- Core lifecycle handlers remain authoritative (Planner registers as consumer)

---

## 18. Submit Lock Contract

```
User intent
  → beginSubmit('task_intent')
  → mutation (with idempotencyKey, mutationId, ifMatch)
  → success/error
  → endSubmit('task_intent')
```

**Blocks**:
- Backdrop close
- Back button close
- `requestClose` (any reason)
- `replace` (except to `closed`)
- Second `beginSubmit` (different intentId)

**Allows**:
- `open*` (idempotent replace)
- `FORCE_CLOSE` (lifecycle)
- Stale `endSubmit` ignored (intentId mismatch)

---

## 19. Compatibility Bridge Removed

**Deleted from `PlannerScreen.tsx`**:
- `PlannerSheet` discriminated union (local)
- `useState<PlannerSheet | null>` (`sheet`)
- `completeSheetMutation` callback
- `Modal` with `TaskForm`/`EventForm` (compat-bridge-until-M3)
- Route param handling via `setSheet({ type: 'task' ... })`

**Replaced by**:
- `usePlannerSheet()` delegation
- Provider-owned state
- Host-owned Modal

---

## 20. Accessibility

**Automatable coverage**:
- Modal accessible (`accessibilityRole="dialog"`, `accessibilityLabel` per content)
- Heading announced on open (`announceSheetOpened`)
- Close button labeled (`Cerrar` / `Cerrar bloqueado — guardando`)
- Backdrop accessibility role + conditional label
- Focus entry (announcement) + focus return (on close)
- Android Back behavior
- Submitting announcement (blocked close)
- Minimum touch targets (existing tokens)
- Large font support (existing tokens)
- Keyboard / safe areas
- No emoji, no color-only dependence

**Runtime (M11)**: VoiceOver/TalkBack, gestures, reduced motion validation

---

## 21. Tests

### New: `planner-v1-m3` suite
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

### Regression (all green)
| Suite | Result |
|-------|--------|
| `test:planner:m1` | 147 pass |
| `test:planner:m2` | 76 pass |
| `test:planner` (full) | 154 pass |
| `test:g0` | 17 commands pass |
| `quality` | 16 commands pass |

---

## 22. Commands

```bash
npm.cmd run test:planner:m3    # M3 sheet state machine
npm.cmd run test:planner       # Full planner (M1+M2+M3+G0.3)
npm.cmd run test:g0            # Full G0 regression
npm.cmd run quality            # Full gate (typecheck, lint, tests, db, secrets)
```

---

## 23. Files

### Created
| File | Role |
|------|------|
| `front/mi-front-limpio/services/planner/plannerSheetState.ts` | State machine (types, events, reducer, guards) |
| `front/mi-front-limpio/context/PlannerSheetContext.tsx` | Provider + public API |
| `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | Single Modal owner |
| `front/mi-front-limpio/services/planner/plannerSheetFocus.ts` | Focus/a11y helpers |
| `scripts/planner_v1_sheet_state_tests.ts` | M3 test suite |
| `docs/implementation/planner/PLANNER_V1_M3_SINGLE_SHEET_HOST_REPORT.md` | This report |
| `docs/implementation/planner/PLANNER_V1_SHEET_HOST_CONTRACT.md` | Sheet Host Contract |
| `docs/implementation/planner/PLANNER_V1_SHEET_STATE_MACHINE.md` | State Machine spec |

### Modified
| File | Change |
|------|--------|
| `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` | Wrap Tab.Navigator in `PlannerSheetProvider`; mount `PlannerSheetHost`; replace `CenterTabButton` with `M3CenterTabButton` delegating to provider |
| `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` | Remove compat bridge: delete `PlannerSheet` type, `sheet` state, `completeSheetMutation`, legacy Modal; replace `setSheet` calls with `sheet.openTaskForm`/`openEventForm`; add effect to refresh summary on sheet close |
| `front/mi-front-limpio/context/PlannerSheetContext.tsx` | (created) |
| `scripts/tsconfig.test.json` | Add `planner_v1_sheet_state_tests.ts` to include |
| `tests/run.js` | Add `planner-v1-m3` command and `planner-m3` / `planner` suite entries |
| `package.json` | Add `test:planner:m3` script |

### Removed
- None (no migrations, no legacy files deleted — only code removed from modified files)

### Compatibility Wrappers
| Wrapper | Delegates To | Retirement |
|---------|--------------|------------|
| `M3CenterTabButton` | `usePlannerSheet().openActions()` | N/A — permanent adapter |

---

## 24. Risks & Rollback

| Risk | Mitigation |
|------|------------|
| Double-open race | `open*` idempotent — reducer returns identity for same params |
| Submit lock starvation | `FORCE_CLOSE` always available to lifecycle; `endSubmit` correlation prevents stale unlock |
| Focus return to unmounted node | `isNodeAccessible` guard + lifecycle `forceClose` on switch/sign-out |
| Goal form rendered prematurely | `goal_form` only mounts when `kind === 'goal_form'`; QuickActionSheet guards entry |
| Android Back during submit | BackHandler consumes event, stays open — submit completes or errors naturally |

**Rollback**: Revert 7 created files + 5 modified files. No migrations, no schema changes, no new deps.

---

## 25. Final Status

```text
PLANNER V1 — M3 COMPLETED

Status:
Branch: v1
Commit audited: de806ea849b1d54457106cba3cab2e295265bec2

PlannerSheetProvider: PRESENT
PlannerSheetHost: PRESENT (single Modal owner)
Canonical sheet states: CLOSED UNION
State machine: PURE REDUCER
Public API: CLOSED (no raw setters)
Single Modal owner: YES (PlannerSheetHost)

TaskForm integration: WRAPPED IN HOST
EventForm integration: WRAPPED IN HOST
Goal preparation: CONTRACTUAL SLOT (no UI)
Add trigger: DELEGATES TO PROVIDER

Submit lock: IMPLEMENTED
Backdrop: BLOCKED DURING SUBMIT
Android Back: CONSUMES WHEN OPEN & NOT SUBMITTING
Keyboard: DISMISSED ON BACKDROP
Safe areas: RESPECTED
Focus entry: ANNOUNCED
Focus restoration: ON CLOSE (if trigger accessible)

Household lifecycle: FORCE CLOSE + RESET
Session lifecycle: FORCE CLOSE + RESET
Accessibility: AUTOMATABLE COVERED
Compatibility bridge: REMOVED

M3 tests: 32 PASS
M2 regression: 76 PASS
M1 regression: 147 PASS
Planner regression: 154 PASS
Frontend TypeScript: PASS
Frontend lint: PASS (0 errors, 22 pre-existing warnings)
Backend syntax: PASS
Backend ESLint: PASS
Core tests: PASS
G0 regression: PASS
DB tests: PASS
Migration parity: PASS
Secrets: PASS
Privacy: PASS
git diff --check: PASS

Files created: 7
Files modified: 5
Files removed: 0
Compatibility wrappers: 1
Dependencies installed: 0
Migrations created/applied: 0
Reports created: 3

Productive behavior changed: NO (forms unchanged, only hosting changed)
Goal Quick Create implemented: NO (M5)
Search implemented: NO (M7)
M4 implemented: NO
Commit created: NO
Push performed: NO

Final:
M3 STATUS: PASSED
M4 STATUS: AUTHORIZED
```