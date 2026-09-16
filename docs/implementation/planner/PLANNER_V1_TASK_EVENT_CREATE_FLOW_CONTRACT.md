# Planner V1 — Task/Event Create Flow Contract

> **Authority**: Single source of truth for the Task and Event create flow
> from Quick Actions, including mutation intent, idempotency, error handling,
> cache invalidation, and lifecycle.
>
> **Status**: BINDING — M4 PASSED
>
> **Scope**: Applies to Task and Event create operations initiated from
> Quick Actions in Planner V1.

## 1. Open

```
User taps "Crear tarea" / "Crear evento"
→ QuickActionsMenu calls sheet.openTaskForm({ source: 'quick_action' })
                            / sheet.openEventForm({ source: 'quick_action' })
→ State machine transitions: actions → task_form / event_form
→ PlannerSheetHost renders TaskFormHost / EventFormHost
→ FormHost creates PlannerMutationIntent (stable for this session)
```

- Source is always `'quick_action'` when initiated from Quick Actions.
- FormHost creates the mutation intent once when the form opens (create mode).
- The intent's `mutationId` is passed to the form as `createMutationId`.

## 2. Draft

- Form fields are owned by the form component.
- Draft is preserved in form state until success or explicit close.
- Error does NOT clear draft.
- Household switch or sign-out closes the sheet (draft is discarded).

## 3. Submit

```
User presses "Guardar"
→ Form calls onSubmitBegin(mutationId)
→ FormHost calls sheet.beginSubmit(intentId)
→ State machine sets isSubmitting=true, activeIntentId=intentId
→ Form calls createPlannerTask/createPlannerEvent with:
    - Idempotency-Key (from intent, stable across retries)
    - X-Mutation-Id (from intent, stable across retries)
    - NO If-Match (create operation)
    - operationKind: CREATE_IDEMPOTENT
→ Service sends POST to /api/planner/tasks or /api/planner/events
```

### Headers sent

| Header            | Present on create | Source                  |
|-------------------|-------------------|-------------------------|
| `Idempotency-Key` | YES (required)   | `intent.idempotencyKey` |
| `X-Mutation-Id`   | YES (auto by `requestJson`) | `intent.mutationId`     |
| `If-Match`        | NO                | —                       |
| `X-Request-Id`    | YES (auto)       | `generateRequestId()`   |

## 4. Success

```
200/201 response
→ Form calls onSaved(message)
→ FormHost:
    1. plannerCache.executeInvalidation({ kind: 'task'|'event', action: 'create' }, scope)
    2. plannerQuickActionsTelemetry.submitSucceeded(actionType, accessToken)
    3. sheet.endSubmit('task_intent'|'event_intent')
    4. sheet.requestClose('success')
→ State machine: isSubmitting=false, state → closed
```

- Single close (no double close).
- Directed invalidation only (task lists + summary for task; event lists + summary for event).
- No `invalidateAll`.
- No automatic navigation to Detail in M4.

## 5. Error

```
Error thrown
→ Form catch block:
    1. Form calls onSubmitEnd(mutationId) → FormHost calls sheet.endSubmit
    2. Form keeps draft (no clear)
    3. Form displays error (Alert or inline)
→ State machine: isSubmitting=false, state stays open (form_form)
```

- Error preserves draft.
- Sheet stays open.
- `PlannerError` classification determines retryability.
- Abort errors are silent (no user-visible error).
- 403 may trigger directed capability invalidation.
- 5xx/offline allow explicit retry with SAME intent.

## 6. Retry

```
User presses "Guardar" again (after error)
→ Form reuses same mutationId and idempotencyKey
→ Server deduplicates via Idempotency-Key
→ If same intent: single logical mutation
```

- Retry preserves identity (mutationId + idempotencyKey).
- `clonePlannerMutationIntent` preserves all fields.
- No new intent for the same user action.

## 7. Abort

```
Household switch / unmount / timeout
→ AbortSignal fires
→ requestJson throws AbortError
→ isPlannerAbort(error) === true
→ Error is silent (no user-visible message)
→ No late callback
→ No success toast
```

## 8. Cache invalidation

### Task create

| Key invalidated         | Reason                          |
|-------------------------|---------------------------------|
| `planner.tasks.*`       | New task in lists               |
| `planner.summary`       | Summary counts updated          |
| `planner.trash`         | NOT invalidated (no trash change) |
| `planner.events.*`      | NOT invalidated (no dependency) |
| `planner.goals.*`       | NOT invalidated (no dependency) |

### Event create

| Key invalidated         | Reason                          |
|-------------------------|---------------------------------|
| `planner.events.*`      | New event in lists              |
| `planner.summary`       | Summary counts updated          |
| `planner.calendar`      | Invalidated by `executeInvalidation` when action is 'override' |
| `planner.tasks.*`       | NOT invalidated (no dependency) |
| `planner.goals.*`       | NOT invalidated (no dependency) |

## 9. Lifecycle

### Household switch

```
HOUSEHOLD_CHANGED event
→ State machine: FORCE_CLOSE → closed, isSubmitting=false, activeIntentId=null
→ No late success/error processed
→ No cross-household cache reconciliation
→ plannerCache.cleanupHouseholdSwitch aborts pending requests
```

### Sign-out

```
SESSION_ENDED event
→ State machine: FORCE_CLOSE → closed, isSubmitting=false, activeIntentId=null
→ No error displayed
→ plannerCache.cleanupSignOut clears session
```

## 10. Telemetry

| Event                                  | When emitted         | Properties                          |
|----------------------------------------|----------------------|-------------------------------------|
| `planner_quick_actions_opened`         | Menu becomes visible | `source`                            |
| `planner_quick_action_selected`        | User taps an action  | `action_type: task\|event`, `source`|
| `planner_quick_action_submit_succeeded`| Create success       | `action_type: task\|event`, `source`|
| `planner_quick_action_submit_failed`   | Create error         | `action_type`, `source`, `error_code`|

- No PII (no title, description, location, names, IDs, payload, draft, stack, token).
- Goal telemetry not emitted in M4.
- No event per render.

## 11. Double submit prevention

- `SUBMIT_BEGIN` is ignored if already submitting (state machine guard).
- `REQUEST_CLOSE` is blocked while submitting.
- `REPLACE` is blocked while submitting.
- Form's `saving` state disables the submit button.
- Multiple taps on "Guardar" produce a single logical mutation.
