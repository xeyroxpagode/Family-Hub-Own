# PLANNER V1 — M5 GOAL QUICK CREATE REPORT

## Metadata

- **Milestone**: M5
- **Status**: PASSED
- **Branch**: v1
- **Commit audited**: f1d90a4 (M4)
- **Date**: 2026-07-16
- **Preceding**: M4 (Quick Actions Task & Event)
- **Following**: M6 (AUTHORIZED)

## Baseline

- V0 CONTRACT GATE: PASSED
- V1 STATUS: IMPLEMENTATION READY
- M1 STATUS: PASSED (Navigation & Transport)
- M2 STATUS: PASSED (Shell & Global States)
- M3 STATUS: PASSED (Single Sheet Host)
- M4 STATUS: PASSED (Quick Actions Task & Event)
- Working tree pre-M5: clean

## Audit Summary

| Concern | Estado pre-M5 | Accion M5 |
|---------|-------------|-----------|
| Goal action visibility | `implemented=false` | `implemented=true` |
| Goal quick fields | All fields visible | Quick fields: title, category, visibility, Guardar |
| Category default | `'home'` in GoalForm | KEEP (verified) |
| Visibility default | `'household'` in GoalForm | KEEP (verified) |
| Current value | Sent in payload | Strip from quick-create; backend defaults to 0 |
| Advanced fields | Always collapsed | KEEP (progressive disclosure exists) |
| Mutation intent | Local ref (`goalCreateKeyRef`) | ADAPT to `createMutationId` prop |
| Success result | `onSaved(message: string)` | ADAPT to typed `onSaved` in host |
| Cache invalidation | `markPlannerChanged()` | CENTRALIZE to `plannerCache.executeInvalidation` |
| Navigation | `nav.navigate('GoalDetail', { goalId })` | ADAPT to `openGoalDetail` with `justCreated: true` |
| Post-create actions | Not implemented | CREATE in GoalDetailScreen |
| Errors | `toFriendlyGoalError()` | COMPLETE to use host-level error callback |
| Telemetry | Task/Event only | COMPLETE to include `'goal'` |

## Goal Action

- Catalog entry `create_goal` activated: `implemented = true`
- Capability guard: `canCreateAnyGoal` (goal.create_personal OR goal.create_household)
- Deny-safe: no rows appear while capabilities load; no action if denied
- Order: Task → Event → Goal (fixed)
- Invite excluded

## Capabilities

- `goal.create_household` enables household visibility
- `goal.create_personal` enables personal visibility
- Default `household`; fallback to `personal` when household denied
- No action shown when neither capability granted
- Backend re-validates

## Quick Fields

Initial visible fields (quick-create mode via embedded sheet):
1. Titulo (obligatorio)
2. Categoria (default: `home`)
3. Visibilidad (default: `household`)
4. Guardar

## Defaults

```text
category = 'home'
visibility = 'household'
current_value = 0 (backend default)
```

- `current_value` stripped from quick-create payload
- Backend forces `current_value = 0` on create
- Defaults consumed from single typed authority (`GoalForm`)

## Advanced Fields (Progressive Disclosure)

Collapsed by default:
- "Como queres avanzar" (Progress mode: steps/tasks/numeric/boolean/none)
- "Fechas" (Date presets: none/week/month/year/custom)

- Toggle accessible (`accessibilityState.expanded`)
- Values preserved on expand/collapse
- No reset, no requests, no silent default changes

## Mutation Intent

- `createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.goals' })`
- Produces stable `mutationId` + `idempotencyKey`
- `operationKind = CREATE_IDEMPOTENT`
- No `If-Match` on create
- Retry preserves intent identity (clone)
- Double submit blocked by sheet `isSubmitting` lock
- Draft change does not invalidate intent (intent is host-scoped, created once)

## Idempotency

- Server deduplicates via `Idempotency-Key` header
- `X-Mutation-Id` header sent for correlation
- Same intent reused across retries
- New intent generates fresh IDs

## Submit Lifecycle

```text
Guardar
→ validateAndBuildPayload (strip current_value for quick-create)
→ onSubmitBegin(mutationId) → sheet.beginSubmit(mutationId)
→ createGoal(accessToken, payload, { idempotencyKey, mutationId })
→ success: plannerCache.executeInvalidation, telemetry, onSaved
→ error: draft preserved, sheet stays open
→ onSubmitEnd(mutationId) → sheet.endSubmit(mutationId)
```

## Errors

- `classifyPlannerError` classification
- Validation: near field (title empty, invalid category/visibility)
- Forbidden (403): capability invalidation
- Timeout: retryable
- Offline: retryable
- Server: retryable
- Abort: silent (never surfaced)
- Error preserves draft
- Sheet stays open
- No stack, no JSON raw

## Cache Invalidation

After Goal create:
```text
plannerKeys.goals.all(scope)
plannerKeys.goals.list(scope)
plannerKeys.summary(scope)
```

- Directed invalidation via `plannerCache.executeInvalidation({ kind: 'goal', action: 'create' }, scope)`
- No Tasks, no Events, no other household
- No invalidate all, no timestamps, no global refetch

## Navigation

Post-create navigation via `openGoalDetail`:
```text
entityId: goal.id
source: 'quick_action'
returnTo: 'planner'
justCreated: true
```

- Host handles navigation in `onSaved` callback via `GoalFormHost`
- Success stale (household changed) → no navigation
- Sign-out → no navigation

## justCreated One-Shot

- Ephemeral route param, consumed once in GoalDetailScreen
- Shows post-create prompt exactly once
- `Ahora no` consumes the signal
- Not persisted in AsyncStorage
- Not reappeared on refresh/back
- Stripped after consumption (`stripEphemeralParams`)

## Post-Create Actions

Mode-specific one-shot actions:
- **steps**: "Agregar primer paso" → scrolls to milestone input
- **tasks**: "Crear primera tarea" → navigates to CreateTask
- **numeric**: "Registrar primer avance" → opens progress edit inline
- **boolean**: "Abrir meta"
- **none**: "Agregar nota o tarea"

Plus always-available: "Ahora no"

- One presentation per goal
- No modal duplication
- No automatic mutation
- Each action checks capability
- Error of action does not delete the created Goal

## Lifecycle

- Household switch → force close, clear intent, clear lock, ignore stale success
- Sign-out → same cleanup, no errors, no navigation, no telemetry
- Core lifecycle integration (order 110)

## Telemetry

Extended events:
- `planner_quick_action_selected` with `action_type: 'goal'`
- `planner_quick_action_submit_succeeded` with `action_type: 'goal'`
- `planner_quick_action_submit_failed` with `action_type: 'goal'`

No PII: no title, description, category, names, target value, unit, dates, IDs, household, payload, stack, tokens

## Accessibility

- Action row "Crear meta": label, role, pressed, disabled, busy
- Form fields: labels, errors
- Advanced disclosure: expanded/collapsed state
- Submit button: disabled + loading state
- Post-create actions: accessible targets
- Focus management via sheet host
- Text contrast consistent with design tokens
- Touch targets >= 44pt

## Compatibility

- Single Goal form owner: `GoalFormHost` (replaced `GoalFormSlot`)
- Single Goal create service authority: `plannerGoals.createGoal`
- Single mutation intent authority: `plannerSubmitAdapter.createGoalIntent`
- GoalForm props extended (backward compatible)
- `plannerGoals.createGoal` extended with `mutationId` option (backward compatible)
- Telemetry types extended (backward compatible)

Removed:
- `implemented=false` for Goal
- `GoalFormSlot` placeholder
- String-only `onSaved` contract in host
- Legacy `markPlannerChanged` in host-level Goal flow

## Tests

### M5 Test File: `scripts/planner_v1_goal_quick_create_tests.ts`

**Results**: 95 pass, 0 fail

Coverage:
- Catalog (6 tests): 3 actions, order, implemented, Invite absent, no 4th action, physical capabilities
- Defaults (5 tests): category home, visibility household, current_value 0, personal fallback, no-action deny-safe
- Mutation intent (4 tests): mutationId + idempotencyKey, no If-Match, retry preserves IDs, stable across retries
- Cache (4 tests): Goal invalidation (goals.all, goals.list, summary), no Tasks, no Events, scoped per household
- Navigation (5 tests): justCreated, source/returnTo, justCreated one-shot (stripEphemeralParams), valid UUID, stale success
- Lifecycle (6 tests): household switch, sign-out, stale completion, cleanup lock, cleanup intent, force close
- Telemetry (3 tests): action_type goal, no forbidden props, no PII
- Form (2 tests): source preserved, mode create default
- Regression (4 tests): catalog keys, state machine, invalidation contract, cache keys

### M4 Regression

M4 tests updated to reflect M5 activation:
- 143 pass, 0 fail
- Goal `implemented=true` verified
- Telemetry includes `'goal'` action type
- Regression test verifies Goal IN implemented list (3 entries)

### M1-M3 Regression

- M1: Navigation tests pass
- M2: Shell state tests pass (76/76)
- M3: Sheet state tests pass (32/32)
- G0.3: Cache/context contracts pass (46/46)

## Commands

```bash
npm run test:planner:m5    # M5 isolated (95 tests)
npm run test:planner       # All Planner (M2+M3+M4+M5+G0.3)
npm run quality            # Full quality suite
```

## Files

Created:
- `scripts/planner_v1_goal_quick_create_tests.ts`

Modified:
- `front/mi-front-limpio/services/planner/plannerQuickActions.ts` (implemented=true)
- `front/mi-front-limpio/services/planner/plannerSubmitAdapter.ts` (createGoalIntent, executeGoalCreateSubmit, GoalCreateSuccess)
- `front/mi-front-limpio/services/plannerGoals.ts` (mutationId option)
- `front/mi-front-limpio/services/planner/plannerQuickActionsTelemetry.ts` (goal action type)
- `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` (GoalFormHost)
- `front/mi-front-limpio/components/planner/QuickActionsMenu.tsx` (goal telemetry)
- `front/mi-front-limpio/screens/planner/GoalForm.tsx` (new props, strip current_value)
- `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` (justCreated, post-create prompt)
- `scripts/planner_v1_quick_actions_tests.ts` (M5 state assertions)
- `scripts/tsconfig.test.json` (new test file)
- `tests/run.js` (M5 runner + suites)
- `package.json` (test:planner:m5 script)

Removed: none (GoalFormSlot replaced, not removed)

## Risks

- None identified. No backend changes needed. No migrations. No new dependencies.

## Rollback

Revert `implemented` to `false` in catalog; replace `GoalFormHost` with `GoalFormSlot`; strip Goal from telemetry type. All other changes are additive.

## Final State

M5 STATUS: PASSED
M6 STATUS: AUTHORIZED