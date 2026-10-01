# PLANNER V1 — GOAL POST-CREATE CONTRACT

## Purpose

Defines the binding contract for the one-shot post-create prompt rendered in 
GoalDetailScreen after creating a goal via Quick Actions.

## `justCreated` Signal

- Route param `justCreated: true` passed from `openGoalDetail`
- Ephemeral: consumed once, never reappears
- Not persisted in AsyncStorage or any durable store
- Not derived from timestamps
- Stripped after consumption (`stripEphemeralParams`)
- Does not trigger a second mutation
- Does not re-open the sheet

## Consumption

- `GoalDetailScreen` reads `route.params.justCreated`
- On first focus when `justCreated === true` → show post-create prompt
- Internal state `postCreateActionTaken` guards against re-show
- `stripEphemeralParams` removes it from params after first render

## Actions (by progress mode)

| Mode | Action label | Behavior |
|------|-------------|----------|
| steps | "Agregar primer paso" | Dismiss prompt; scroll to milestone input |
| tasks | "Crear primera tarea" | Navigate to CreateTask with goalId, goalTitle |
| numeric | "Registrar primer avance" | Open progress edit inline |
| boolean | "Abrir meta" | Dismiss prompt (no sub-action) |
| none | "Agregar nota o tarea" | Dismiss prompt (informational) |

All modes also show: **"Ahora no"** (dismiss prompt, consume signal)

## Capability Guards

- Each action verifies relevant capability before allowing:
  - Milestone create: `goal.edit_own`
  - Task create: `task.create_household` or `task.create_personal`
  - Progress update: `goal.edit_own`

## One-Shot Guarantees

- Single presentation per goal creation
- Refresh does NOT re-show
- Back button/GoBack does NOT re-show
- Household switch clears pending one-shot
- `Ahora no` definitively consumes the state
- No modal duplication
- No blocking of GoalDetail normal UX
- No automatic mutation execution (user must tap)

## Dismissal

- Any action tap → dismiss prompt
- "Ahora no" → dismiss prompt
- After dismissal, normal GoalDetail UX resumes
- Error in post-create action does not delete the created Goal

## Lifecycle

- Household switch: clear one-shot pending state
- Sign-out: clear one-shot pending state
- These clearings happen via normal React state reset on navigation change

## Telemetry

- No post-create-specific telemetry events defined
- If action triggers a mutation (milestone create, task create, progress update), 
  that mutation's own telemetry applies
- No PII in any telemetry

## Prohibitions

Never:
- Trigger a second mutation automatically
- Re-show after dismissal
- Block GoalDetail normal navigation
- Persist to AsyncStorage
- Survive household switch
- Survive sign-out
- Include callback or transient function in params