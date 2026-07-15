# Planner V1 — M3 Sheet Host Contract

> **Authority**: Single source of truth for Planner sheet ownership, provider location, state machine, public API, and invariants.  
> **Version**: M3  
> **Status**: `PASSED`

---

## 1. Ownership

| Concern | Authority |
|---------|-----------|
| Sheet state (canonical) | `PlannerSheetProvider` → `sheetMachineReducer` |
| Modal rendering (single owner) | `PlannerSheetHost` |
| Form logic (fields, validation, mutations) | `TaskForm` / `EventForm` / `GoalForm` (unchanged) |
| Quick Actions design | `QuickActionSheet` (presentational; M4 wires capabilities) |
| Trigger (Add button) | `M3CenterTabButton` → `usePlannerSheet().openActions()` |
| Lifecycle cleanup | Provider registers Core handlers (order 110) |

**Rule**: Exactly ONE `Modal` from Planner domain mounted at any time — `PlannerSheetHost`.

---

## 2. Provider Location

**File**: `front/mi-front-limpio/context/PlannerSheetContext.tsx`

**Mount point**: `HomeTabNavigator` wraps `Tab.Navigator` with `<PlannerSheetProvider>`.

**Rationale**:
- Survives tab switches (PlannerTab ↔ HomeTab ↔ PeopleTab ↔ MoreTab)
- Scoped to Planner session (sign-out unmounts navigator → cleanup runs)
- Accessible to `CenterTabButton` (inside `tabBarButton`) and all Planner screens

**Not allowed**:
- Provider inside a screen that unmounts on tab change
- Multiple provider instances
- Provider outside HomePlus session (leaks across sign-out)

---

## 3. Host Location

**File**: `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx`

**Rendered**: Inside `PlannerSheetProvider`, as sibling to `Tab.Navigator`.

**Props**: None (consumes `usePlannerSheet()` internally).

**Single `Modal`**: `visible={state.kind !== 'closed'}`.

---

## 4. State Union (Canonical)

```typescript
type PlannerSheetState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'actions' }
  | {
      readonly kind: 'task_form';
      readonly mode: 'create' | 'edit';
      readonly taskId?: string;
      readonly source: PlannerNavigationSource;
      readonly initialDueDate?: string;
    }
  | {
      readonly kind: 'event_form';
      readonly mode: 'create' | 'edit';
      readonly eventId?: string;
      readonly source: PlannerNavigationSource;
      readonly initialDate?: string;
    }
  | {
      readonly kind: 'goal_form';
      readonly mode: 'create' | 'edit';
      readonly goalId?: string;
      readonly source: PlannerNavigationSource;
    };
```

**Invariants**:
- Exactly one `kind` active
- IDs only for `edit` mode (no full entities transported)
- No tokens, no household, no capabilities, no callbacks
- `goal_form` exists contractually; productive flow deferred to M5

---

## 5. Public API (`PlannerSheetController`)

```typescript
type PlannerSheetController = {
  readonly state: PlannerSheetState;
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;

  openActions(): void;
  openTaskForm(input: OpenTaskInput): void;
  openEventForm(input: OpenEventInput): void;
  openGoalForm(input: OpenGoalInput): void;

  replace(next: PlannerSheetState): void;
  requestClose(reason: PlannerSheetCloseReason): void;
  forceClose(reason: PlannerSheetCloseReason): void;

  beginSubmit(intentId: string): void;
  endSubmit(intentId: string): void;

  readonly triggerRef: React.RefObject<unknown | null>;
};
```

**Rules**:
- `open*` idempotent for identical params (double tap = no-op)
- `requestClose` / `replace` blocked while `isSubmitting`
- `forceClose` only for lifecycle (household switch, sign-out)
- Submit lock correlates `intentId` — stale `endSubmit` ignored
- No raw setters, no direct state mutation

---

## 6. Close Rules

| Reason | Trigger | Allowed while submitting? |
|--------|---------|---------------------------|
| `user_request` | Close button, `requestClose()` | ❌ blocked |
| `success` | Form `onSaved` → host | ✅ (via `forceClose` path) |
| `backdrop` | Backdrop press | ❌ blocked |
| `back_button` | Android Back | ❌ blocked |
| `force_close` | `forceClose()` only | ✅ always |
| `household_changed` | Lifecycle `HOUSEHOLD_CHANGED` | ✅ (forced) |
| `session_ended` | Lifecycle `SESSION_ENDED` | ✅ (forced) |

**Success flow**: Form `onSaved` → `sheet.endSubmit(id)` → `sheet.requestClose('success')` → host closes.

---

## 7. Submit Rules

```
User action
  → sheet.beginSubmit('task_intent')   // sets isSubmitting=true, activeIntentId
  → mutation (with idempotencyKey, mutationId, ifMatch)
  → success → sheet.endSubmit('task_intent') → sheet.requestClose('success')
  → error   → sheet.endSubmit('task_intent') → form stays open, draft preserved
```

**Blocking while submitting**:
- Backdrop close
- Back button close
- `requestClose()` (any reason)
- `replace()` (except to `closed`)
- Second `beginSubmit` (different intentId)

**Stale protection**: `endSubmit('stale')` does NOT unlock a newer intent.

---

## 8. Lifecycle Cleanup

### Household Switch (`runHouseholdSwitch` → `beforeSwitch` order 110)
```typescript
registerHouseholdLifecycle({
  name: 'planner.sheet-host',
  order: 110,
  beforeSwitch: () => dispatch({ type: 'HOUSEHOLD_CHANGED' }),
});
```
**Reducer**: `state = closed`, `context = { isSubmitting: false, activeIntentId: null }`

### Sign-Out (`runSessionCleanup` → `cleanup` order 110)
```typescript
registerSessionLifecycle({
  name: 'planner.sheet-host',
  order: 110,
  cleanup: () => dispatch({ type: 'SESSION_ENDED' }),
});
```
**Reducer**: `state = closed`, `context` reset.

**Guarantees**:
- No draft leaks across households
- No stale submit lock after sign-out
- No focus return to unmounted nodes
- Core lifecycle remains authoritative

---

## 9. Focus Management

| Moment | Action |
|--------|--------|
| Sheet opens | `announceSheetOpened(heading)` via `AccessibilityInfo` |
| Sheet closes (was open) | `attemptFocusReturn(triggerRef)` if node accessible |
| Household switch / sign-out | `forceClose` → **no** focus return (nodes unmounted) |

**Platform notes**:
- Web: `triggerRef.current.focus()` best-effort
- Native: OS restores focus naturally; ref preserved

---

## 10. Accessibility (Automatable)

| Requirement | Implementation |
|-------------|----------------|
| Modal `accessibilityRole="dialog"` | Host panel |
| Heading announced on open | `announceSheetOpened(heading)` |
| Close button labeled | `"Cerrar panel"` / `"Cerrar bloqueado — guardando"` |
| Backdrop labeled | `"Cerrar panel"` / `"Panel bloqueado — operación en curso"` |
| Focus entry | Host announces; forms focus first input |
| Focus return | `attemptFocusReturn(triggerRef)` |
| Android Back | Consumes when open & not submitting |
| Submitting state | Close button disabled, label reflects lock |
| Touch targets | ≥ 48dp via tokens |
| Large font | `AppText` variants + tokens |
| No emoji, no color-only | ✅ |

**Full VoiceOver/TalkBack runtime validation → M11**.

---

## 11. Prohibiciones (Enforced by Architecture)

| Prohibited | Reason |
|------------|--------|
| Second `Modal` for Planner sheets | Single owner (`PlannerSheetHost`) |
| Local sheet state in screens | Canonical state in Provider |
| `setSheet({ type: 'task' })` in PlannerScreen | Delegates to `openTaskForm()` |
| `QuickActionSheet` owning its own `Modal` | Structural adapter inside Host |
| Transporting full Task/Event/Goal in state | IDs only; forms fetch on mount |
| Storing callbacks in state | Pure state, no side effects |
| Storing tokens/household in state | Scoped by Provider lifecycle |
| `forceClose` from UI code | Only lifecycle handlers (order 110) |
| `beginSubmit` / `endSubmit` from forms directly | Host wrappers own submit lock |
| Modifying reducer outside `plannerSheetState.ts` | Pure, single authority |

---

## 12. M4 / M5 Extension Points

| Extension | M3 State | M4/M5 Action |
|-----------|----------|--------------|
| Quick Actions capabilities | `actions` kind exists | `evaluateQuickActionCapabilities` wires visibility |
| Goal Quick Create | `goal_form` kind exists | Remove guard, wire `goal.create_*` caps, progress 0, post-create |
| Search entry | Not in state | M7 adds `PlannerSearchScreen` route, flag gate |

No state machine changes required for M4/M5 — only new content variants and capability wiring.