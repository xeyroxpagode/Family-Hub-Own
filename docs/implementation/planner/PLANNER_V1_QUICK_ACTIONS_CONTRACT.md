# Planner V1 — M4 Quick Actions Contract

> **Authority**: Single source of truth for the Planner Quick Actions catalog,
> visibility rules, destination mapping, and ownership.
>
> **Status**: BINDING — M4 PASSED
>
> **Scope**: Applies to all Planner V1 surfaces that render or trigger Quick Actions.

## 1. Catalog

The Planner Quick Actions catalog contains exactly three actions, in fixed order:

| # | Key            | Label          | Destination   | Implemented (M4) |
|---|----------------|----------------|---------------|------------------|
| 1 | `create_task`  | Crear tarea    | `task_form`   | YES              |
| 2 | `create_event` | Crear evento   | `event_form`  | YES              |
| 3 | `create_goal`  | Crear meta     | `goal_form`   | NO (deferred M5) |

Authority: `plannerQuickActions` in
`front/mi-front-limpio/services/planner/plannerQuickActions.ts`.

## 2. Permanent exclusions

- **Invite** is permanently excluded from Quick Actions. Invite belongs to
  Household/People domain and must never appear in the Planner catalog.
- **Search** is not a Quick Action. It is a separate entry point (M7).
- **No mock actions**, no "Coming soon", no empty rows.

## 3. Labels

- Labels are visible strings in Spanish (es-AR).
- No emojis in labels, descriptions, or accessibility labels.
- Label is always visible (does not depend on icon alone).
- Each action has: `label`, `accessibilityLabel`, `description`.

## 4. Iconography

- Icons come from the HomePlus icon set (`HomePlusIcon`).
- No emojis as icons.
- Icon is inside a circular surface with consistent theming.
- Icon is decorative (hidden from screen reader); label is the accessible text.

## 5. States

Each action has a derived state based on capabilities and submit lock:

| State     | Condition                                           |
|-----------|-----------------------------------------------------|
| `hidden`  | Capability denied, capability unknown, or action not implemented (Goal in M4). |
| `enabled` | Capability granted, host available, no submit active. |
| `disabled`| Visible but temporarily blocked (submit in progress). |
| `loading` | Submit or transition in progress for this action. |

**Deny-safe**: null/undefined projection → all actions `hidden`.

## 6. Capabilities

Each action maps to real Planner capabilities (physical names, no aliases):

| Action        | Capability check                                    |
|---------------|-----------------------------------------------------|
| `create_task` | `task.create_personal` OR `task.create_household`   |
| `create_event`| `event.create_personal` OR `event.create_household` |
| `create_goal` | `goal.create_personal` OR `goal.create_household`   |

- Roles do NOT replace capabilities.
- Backend is the final authority.
- Unknown/missing capability → deny.

## 7. Ownership

| Concern                       | Owner                                   |
|-------------------------------|-----------------------------------------|
| Catalog definitions           | `plannerQuickActions.ts`                |
| Menu visual rendering         | `QuickActionsMenu.tsx`                  |
| Sheet host integration        | `PlannerSheetHost.tsx`                  |
| Capability evaluation         | Local guards in `plannerQuickActions.ts`|
| State machine transitions     | `plannerSheetState.ts` (M3)             |
| Mutation intent               | `plannerMutationIntent.ts` (M1)         |
| Submit lifecycle adapter      | `plannerSubmitAdapter.ts`               |
| Directed cache invalidation   | `plannerCache.ts` via `plannerKeys.ts`  |

## 8. Transitions

```
actions → OPEN_TASK  → task_form (source: 'quick_action')
actions → OPEN_EVENT → event_form (source: 'quick_action')
task_form → REQUEST_CLOSE → closed
event_form → REQUEST_CLOSE → closed
task_form → REQUEST_CLOSE('success') → closed
event_form → REQUEST_CLOSE('success') → closed
```

Rule: form close goes to `closed`, NOT back to `actions`.

## 9. Goal — Deferred to M5

- The catalog entry for `create_goal` exists with `implemented: false`.
- `getVisible()` and `getImplemented()` exclude it.
- The `goal_form` sheet state is accepted by the host (structural slot from M3).
- No Goal telemetry is emitted during M4.
- M5 will activate Goal Quick Create.

## 10. Prohibitions

- No `invalidateAll` or global timestamp.
- No `If-Match` on create operations.
- No household ID as authority in payload.
- No capabilities in payload.
- No callbacks stored in catalog definitions.
- No second Modal (single host only).
- No local `showTaskForm`/`showEventForm` state outside the provider.
