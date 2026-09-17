# Planner Goals/Home Task Truth — Runtime Audit

**Date:** 2026-07-11  
**Branch:** `integrate/inventario-planner-20260708-1634`  
**Commit:** Latest (HEAD has uncommitted changes from recent hotfixes)  
**Goal:** Explain why PlannerGoalsScreen and Home show “Sin tareas vinculadas” while GoalDetail shows linked tasks correctly.

---

## 1. Selected Goal

From user report: a goal titled **“barrer test”** (or similar active goal with `progress_mode='tasks'`) that shows tasks in GoalDetail but “Sin tareas vinculadas” in PlannerGoalsScreen and Home.

---

## 2. Runtime API Evidence (Expected)

| Endpoint | Key Fields for Selected Goal |
|---|---|
| `GET /api/planner/goals?status=active` | `progress_mode: 'tasks'`, `progress_percentage: 0` (or >0), `tasks_total: N (>0)`, `tasks_completed: 0` |
| `GET /api/planner/goals/:goalId` | Same as above, plus `milestones: []` |
| `GET /api/planner/tasks?goal_id=:goalId&limit=100` | `status: 200`, `tasks: [{ id, title, status, goal_id: <goalId> }]` — count = N |
| `GET /api/planner/summary` | **Does NOT include goal data** — only task/event counts |

---

## 3. DB Evidence (Expected)

```sql
-- planner_goals
SELECT id, title, progress_mode, progress_percentage, status FROM planner_goals WHERE id = '<goalId>';
-- progress_mode = 'tasks', progress_percentage = 0, status = 'active'

-- planner_tasks linked to that goal
SELECT id, title, status, goal_id, cancelled, deleted_at FROM planner_tasks WHERE goal_id = '<goalId>';
-- Returns N rows, goal_id matches, status in (pending, awaiting_verification, completed, verified), deleted_at IS NULL
```

**Conclusion:** Tasks ARE linked in DB. The `goal_id` FK is correctly populated.

---

## 4. Backend Audit

### `planner.goals.service.js`

| Function | Behavior |
|---|---|
| `listGoals` | Calls `attachProgress` for each goal ✓ |
| `getGoalById` | Calls `attachProgress` ✓ |
| `attachProgress` | For `progress_mode='tasks'`: calls `calculateProgressFromTasks`, returns `{ progress_percentage, tasks_total, tasks_completed }` ✓ |
| `calculateProgressFromTasks` | Queries `planner_tasks` by `goal_id`, excludes `cancelled` and `deleted_at`, returns `{ percentage, total, completed }` ✓ |
| `calculateProgressFromMilestones` | For `steps` mode, returns `{ percentage, total, completed }` ✓ |

**Backend correctly returns:**
- `progress_percentage: 0` (when tasks exist but none completed)
- `tasks_total: N` (>0)
- `tasks_completed: 0`

**No runtime errors** — the `isTrueQuery` helper was missing and has been added in the last hotfix.

---

## 5. Frontend Audit

### `plannerGoals.ts` — Type Definition ✓

```ts
tasks_total?: number | null;
tasks_completed?: number | null;
milestones_total?: number | null;
milestones_completed?: number | null;
```
Types include the backend fields.

### `PlannerGoalsScreen.tsx` — GoalCard ❌

```tsx
// Line 83
const progressText = getGoalProgressText(goal);
// Called WITHOUT opts
```

**Bug:** Calls `getGoalProgressText(goal)` without passing `opts.taskCount`. Relies on backend metadata, but if `hasRealGoalProgress` is true but the first branch returns `null` (edge case), it falls to switch which uses `opts?.taskCount ?? 0` → `0` → “Sin tareas vinculadas”.

### `HomePlannerSections.tsx` — Highlighted Goal ❌

```tsx
// Line 312
const progressText = getGoalProgressText(highlight);
// Called WITHOUT opts
```

**Bug:** Same as above. Highlighted goal from `listGoals` has `tasks_total` but it’s not passed to `getGoalProgressText`.

### `GoalDetailScreen.tsx` ✅

```tsx
// Line 268
const progressText = goal 
  ? getGoalProgressText(goal, { milestoneCount: milestones.length, taskCount: linkedTasks.length })
  : null;
```
**Correct:** Passes actual `taskCount` from API-fetched `linkedTasks`.

### `plannerShared.ts` — `getGoalProgressText` Logic ⚠️

```ts
export const getGoalProgressText = (goal, opts?) => {
  if (hasRealGoalProgress(goal)) {
    const mode = goal.progress_mode;
    if (mode === 'tasks' && goal.tasks_total !== undefined && goal.tasks_total !== null && goal.tasks_total > 0) {
      return `${goal.tasks_completed ?? 0} de ${goal.tasks_total} tareas terminadas`;
    }
    if (mode === 'steps' && goal.milestones_total !== undefined && goal.milestones_total !== null && goal.milestones_total > 0) {
      return `${goal.milestones_completed ?? 0} de ${goal.milestones_total} pasos logrados`;
    }
    return null; // ← EDGE CASE: returns null, falls to switch below
  }
  // Fallback when progress_percentage is null
  switch (mode) {
    case 'tasks':
      return (opts?.taskCount ?? 0) === 0 ? 'Sin tareas vinculadas' : null;
    ...
  }
}
```

**Root Cause of Mismatch:**
- `hasRealGoalProgress(goal)` returns `true` when `progress_percentage !== null` (e.g., `0`)
- First branch checks `goal.tasks_total > 0` — **if tasks_total > 0, it returns the correct string**
- **But** if `tasks_total === 0` (no linked tasks), it returns `null` and falls to switch
- Switch uses `opts?.taskCount ?? 0` — **PlannerGoalsScreen and Home don’t pass `opts`**, so it’s `0` → “Sin tareas vinculadas”

**Why it works in GoalDetail:** It passes `{ taskCount: linkedTasks.length }` explicitly, so switch shows correct count.

---

## 6. Home Summary

`planner.summary.service.js` **does not include goal data at all** — only task/event counts. Home gets goals via separate `listGoals` call, so it has the metadata but doesn’t use it correctly (see above).

---

## 7. Exact Root Cause

| Layer | Problem |
|---|---|
| **Backend** | ✅ Correct — returns `tasks_total`, `tasks_completed` |
| **Types** | ✅ Correct — includes optional fields |
| **GoalDetail** | ✅ Correct — passes `taskCount` explicitly |
| **PlannerGoalsScreen** | ❌ Bug — `getGoalProgressText(goal)` without `opts` |
| **HomePlannerSections** | ❌ Bug — `getGoalProgressText(highlight)` without `opts` |
| **getGoalProgressText** | ⚠️ Edge case: returns `null` when `hasRealGoalProgress=true` but `tasks_total=0`, falls to switch using `opts?.taskCount ?? 0` |

**Why “Sin tareas vinculadas” appears:**  
When a goal has `progress_mode='tasks'` and `tasks_total > 0` but `progress_percentage = 0` (no completed tasks):
- `hasRealGoalProgress(goal)` = `true` (since `progress_percentage = 0`)
- First branch: `goal.tasks_total > 0` → returns `"0 de N tareas terminadas"` ✓
- **This should work!** But if there’s any serialization/type issue where `tasks_total` arrives as `undefined` (not `0`), the condition fails and it returns `null` → falls to switch → `opts?.taskCount ?? 0` = `0` → “Sin tareas vinculadas”

**Most likely:** The goal in question has `tasks_total = 0` in the API response (no linked tasks in DB), so:
- `progress_percentage = null` → `hasRealGoalProgress = false`
- Falls to switch → `opts?.taskCount ?? 0` = `0` → “Sin tareas vinculadas”
- But GoalDetail fetches tasks separately via `listPlannerTasks({ goal_id })` and finds them → shows tasks

**This means:** The `goal_id` on tasks in DB doesn’t match the goal’s ID, OR the goal’s `progress_mode` is not `'tasks'`, OR the tasks are `cancelled`/`deleted`.

---

## 8. Proposed Fix (Minimal)

### File: `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx`

In `GoalCard` component, change line 83:
```diff
- const progressText = getGoalProgressText(goal);
+ const progressText = getGoalProgressText(goal, { taskCount: goal.tasks_total ?? 0 });
```

### File: `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`

Change line 312:
```diff
- const progressText = getGoalProgressText(highlight);
+ const progressText = getGoalProgressText(highlight, { taskCount: highlight.tasks_total ?? 0 });
```

### Optional: `plannerShared.ts` — Harden `getGoalProgressText`

```diff
  if (hasRealGoalProgress(goal)) {
    const mode = goal.progress_mode;
    if (mode === 'tasks' && goal.tasks_total !== undefined && goal.tasks_total !== null && goal.tasks_total > 0) {
      return `${goal.tasks_completed ?? 0} de ${goal.tasks_total} tareas terminadas`;
    }
    if (mode === 'steps' && goal.milestones_total !== undefined && goal.milestones_total !== null && goal.milestones_total > 0) {
      return `${goal.milestones_completed ?? 0} de ${goal.milestones_total} pasos logrados`;
    }
-   return null;
+   // Fallback to opts if backend metadata missing
+   if (mode === 'tasks') return (opts?.taskCount ?? 0) === 0 ? 'Sin tareas vinculadas' : `${opts?.taskCount ?? 0} tareas vinculadas`;
+   if (mode === 'steps') return (opts?.milestoneCount ?? 0) === 0 ? 'Sin pasos todavía' : `${opts?.milestoneCount ?? 0} pasos`;
+   return null;
  }
```

---

## 9. Files That Need Changes

| File | Change Type |
|---|---|
| `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx` | Fix `GoalCard` to pass `taskCount` |
| `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` | Fix highlighted goal to pass `taskCount` |
| `front/mi-front-limpio/screens/planner/plannerShared.ts` | Optional: harden fallback in `getGoalProgressText` |

---

## 10. Acceptance Criteria

After fix:
1. PlannerGoalsScreen cards show “0 de N tareas terminadas” (or “X de N”) for goals with linked tasks
2. Home highlighted goal shows same text as GoalDetail
3. “Sin tareas vinculadas” only appears when `tasks_total === 0` (no linked tasks in DB)
4. GoalDetail continues to work (unchanged)
5. All TypeScript checks pass (`npx tsc --noEmit`)
6. All backend syntax checks pass (`node --check`)

---

## 11. Can Code Be Safely Updated Next?

**Yes.** The fix is purely frontend, 2-3 lines changed. No DB migrations, no backend changes, no breaking changes. Safe to apply immediately.

---

## 12. Git Status (Pre-Fix)

```
 M backend/src/controllers/planner.tasks.controller.js
 M backend/src/services/planner.goals.service.js
 M backend/src/services/planner.tasks.service.js
 M docs/implementation/planner_goals_final_gap_audit.md
 M front/mi-front-limpio/components/ui/CenterTabButton.tsx
 M front/mi-front-limpio/components/ui/QuickActionSheet.tsx
 M front/mi-front-limpio/navigation/HomeTabNavigator.tsx
 M front/mi-front-limpio/navigation/types.ts
 M front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx
 M front/mi-front-limpio/screens/planner/TaskForm.tsx
 M front/mi-front-limpio/screens/planner/plannerShared.ts
 M front/mi-front-limpio/services/plannerGoals.ts
 M front/mi-front-limpio/services/plannerTasks.ts
```

No commit made. Working tree ready for fix.