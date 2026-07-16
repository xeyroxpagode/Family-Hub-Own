# PLANNER V1 — M4 QUICK ACTIONS TASK EVENT REPORT

## 1. Metadata

| Field             | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| Milestone         | M4 — Quick Actions for Task and Event                              |
| Branch            | v1                                                                 |
| Commit audited    | c983376a0771e76abe84106a4f1c600be229cd41 (M3 baseline)              |
| Date              | 2026-07-15                                                         |
| Author            | opencode                                                           |
| Status            | PASSED                                                             |
| Previous milestone| M3 — PASSED                                                        |
| Next milestone    | M5 — AUTHORIZED                                                    |

## 2. Baseline

```
Branch: v1
Working tree: clean at start

M1 STATUS: PASSED
M2 STATUS: PASSED
M3 STATUS: PASSED
M4 STATUS: AUTHORIZED → PASSED
```

## 3. Auditoría

| Concern            | Estado actual (pre-M4)           | Autoridad                          | Acción M4      |
|--------------------|----------------------------------|------------------------------------|----------------|
| Actions menu       | Placeholder (`ActionsMenu` M3)   | `PlannerSheetHost.tsx`              | COMPLETE       |
| Task visibility    | Not wired to capabilities         | `plannerCapabilitiesAdapter`       | COMPLETE       |
| Event visibility   | Not wired to capabilities         | `plannerCapabilitiesAdapter`       | COMPLETE       |
| Goal slot          | Structural slot from M3          | `plannerSheetState.ts`              | DEFER_M5       |
| Task submit        | Raw idempotencyKey, no mutationId| `plannerTasks.ts`                   | ADAPT          |
| Event submit       | Raw idempotencyKey, no mutationId| `plannerEvents.ts`                  | ADAPT          |
| Mutation intent    | Exists (M1) but bypassed by forms| `plannerMutationIntent.ts`         | CENTRALIZE     |
| Error presentation | Alert.alert in forms             | `plannerErrorAdapter.ts`           | KEEP           |
| Invalidation       | Exists but not called from forms | `plannerCache.ts`                   | COMPLETE       |
| Telemetry          | Backend only, no Quick Action events | `plannerTelemetryEvents.js`     | COMPLETE       |
| Accessibility      | Partial (M3 announceSheetOpened) | `plannerSheetFocus.ts`             | ADAPT          |

## 4. Modelo de acciones

Canonical catalog created in `plannerQuickActions.ts`:

```ts
type PlannerQuickActionKey = 'create_task' | 'create_event' | 'create_goal';
type PlannerQuickActionDefinition = {
  key, label, accessibilityLabel, description,
  iconName, iconBackgroundColor, iconColor,
  requiredCapabilityGuard, destination, implemented
};
```

## 5. Orden final

1. Crear tarea (create_task → task_form) — implemented
2. Crear evento (create_event → event_form) — implemented
3. Crear meta (create_goal → goal_form) — NOT implemented (M5)

## 6. Diseño visual

- Title: "Crear"
- Each row: circular icon + label + description + chevron
- Pressed state: opacity 0.86, border color change
- Disabled state: opacity 0.58
- Loading state: row disabled during submit
- Min touch target: 56px
- No emojis, no gradients, no nested cards

## 7. Capabilities

- Local deny-safe guards in `plannerQuickActions.ts` (no `api.ts` runtime dependency).
- `canCreateAnyTask`: `task.create_personal` OR `task.create_household`
- `canCreateAnyEvent`: `event.create_personal` OR `event.create_household`
- `canCreateAnyGoal`: `goal.create_personal` OR `goal.create_household`
- Null/undefined projection → all hidden.
- Goal hidden via `implemented: false` regardless of capability.

## 8. Task flow

- Open: `sheet.openTaskForm({ source: 'quick_action' })` → state machine → `task_form`
- `TaskFormHost` creates `PlannerMutationIntent` (stable mutationId + idempotencyKey)
- Form receives `createMutationId` prop → passes to `createPlannerTask` as `mutationId`
- Submit: `onSubmitBegin` → `sheet.beginSubmit` → HTTP POST → `onSaved` → invalidation + close

## 9. Event flow

- Same pattern as Task, using `EventFormHost` and `createEventIntent()`.
- `EventForm` receives `createMutationId` → passes to `createPlannerEvent` as `mutationId`

## 10. Mutation intent

- `createTaskIntent()` / `createEventIntent()` create stable intent when form opens.
- `mutationId` sent as `X-Mutation-Id` header (auto by `requestJson`).
- `idempotencyKey` sent as `Idempotency-Key` header.
- Retry reuses same intent (no new IDs).

## 11. Idempotencia

- `Idempotency-Key` header on all create calls.
- Server deduplicates identical keys with same payload.
- Form regenerates key on success (new intent for next create).
- Retry preserves key (same intent).

## 12. Errors

- Error classified via `classifyPlannerError` (from M1).
- Abort errors: silent (no user message).
- Validation (400/422): form stays open, draft preserved.
- Forbidden (403): may invalidate capabilities directed.
- Server (5xx)/offline: retryable with same intent.
- Conflict (409/412): not retryable (preserved for edit flow).
- No stack traces, no raw JSON, no UUID as primary copy.

## 13. Invalidation graph

```
Task create:
  planner.tasks.all → invalidated
  planner.tasks.list → invalidated
  planner.summary → invalidated
  (planner.events, planner.goals NOT touched)

Event create:
  planner.events.all → invalidated
  planner.events.list → invalidated
  planner.summary → invalidated
  (planner.tasks, planner.goals NOT touched)
```

## 14. Lifecycle

- Household switch: `HOUSEHOLD_CHANGED` → force close, reset submit, abort pending.
- Sign-out: `SESSION_ENDED` → force close, reset submit, clear session.
- Stale success/error ignored (state machine guards via intentId).
- No cross-household cache contamination.

## 15. Telemetría

Backend catalog updated (`plannerTelemetryEvents.js`):
- `planner_quick_actions_opened` — menu visible
- `planner_quick_action_selected` — action tapped
- `planner_quick_action_submit_succeeded` — create success
- `planner_quick_action_submit_failed` — create error

Frontend adapter: `plannerQuickActionsTelemetry.ts` (fire-and-forget, privacy-safe).

No PII emitted. No Goal telemetry in M4.

## 16. Accesibilidad

- Sheet title announced on open (`announceSheetOpened`).
- Each action row: `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState`.
- Icon decorative (`accessibilityElementsHidden`).
- Close button: labeled, disabled state announced.
- Submit progress: `accessibilityState.busy`.
- Full VoiceOver/TalkBack runtime deferred to M11.

## 17. Compatibilidad

- `QuickActionSheet.tsx` (old standalone Modal) still exists but is no longer used by the host.
- `M3CenterTabButton` retained as wrapper (delegates to provider, no state).
- `GoalFormSlot` retained structurally (M5 activates).
- No local Modal in PlannerScreen for Task/Event forms.

## 18. Tests

M4 test suite: `scripts/planner_v1_quick_actions_tests.ts`
- Catalog: 3 keys, order, invite absent, no emojis, destinations
- Visibility: deny-safe, hidden/enabled/disabled, goal deferred
- Mutation intent: contract invariants, no If-Match, stable retry
- Sheet state: submit lock, double-submit blocked, transitions, lifecycle
- Telemetry: event names, action_type enum, no PII
- Regression: Goal not implemented, Invite excluded, Search excluded

Total: 142 tests, 0 failures.

## 19. Comandos

```bash
npm run test:planner:m4   # M4 tests only
npm run test:planner      # All planner tests (G0.3 + M2 + M3 + M4)
npm run quality           # Full quality suite
```

## 20. Archivos

### Created

- `front/mi-front-limpio/services/planner/plannerQuickActions.ts`
- `front/mi-front-limpio/services/planner/plannerSubmitAdapter.ts`
- `front/mi-front-limpio/services/planner/plannerQuickActionsTelemetry.ts`
- `front/mi-front-limpio/components/planner/QuickActionsMenu.tsx`
- `scripts/planner_v1_quick_actions_tests.ts`
- `docs/implementation/planner/PLANNER_V1_M4_QUICK_ACTIONS_TASK_EVENT_REPORT.md`
- `docs/implementation/planner/PLANNER_V1_QUICK_ACTIONS_CONTRACT.md`
- `docs/implementation/planner/PLANNER_V1_TASK_EVENT_CREATE_FLOW_CONTRACT.md`

### Modified

- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` (M4 final design + lifecycle)
- `front/mi-front-limpio/screens/planner/TaskForm.tsx` (mutationId + onSubmitBegin/End)
- `front/mi-front-limpio/screens/planner/EventForm.tsx` (mutationId + onSubmitBegin/End)
- `front/mi-front-limpio/services/plannerTasks.ts` (mutationId option)
- `front/mi-front-limpio/services/plannerEvents.ts` (mutationId option)
- `front/mi-front-limpio/context/PlannerSheetContext.tsx` (fixed .js extension)
- `backend/src/constants/plannerTelemetryEvents.js` (4 new events)
- `tests/run.js` (planner-m4 suite)
- `scripts/tsconfig.test.json` (include M4 test)
- `package.json` (test:planner:m4 script)

### Removed

- None (QuickActionSheet.tsx retained but unused by host; cleanup deferred)

## 21. Riesgos

- `QuickActionSheet.tsx` still exists as dead code (low risk; can be removed in M5).
- Frontend telemetry endpoint (`/api/telemetry/event`) may not exist on backend yet; adapter silently drops events (fire-and-forget).
- `plannerSubmitAdapter.ts` functions are defined but the actual HTTP calls still happen inside the forms (adapter provides intent factory only in M4).

## 22. Rollback

Revert all M4 file changes. M3 baseline remains intact. No migrations, no schema changes.

## 23. Estado final

```
M4 STATUS: PASSED
M5 STATUS: AUTHORIZED
```
