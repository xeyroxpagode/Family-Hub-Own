# Planner V0 QA Runbook

> Final verification checklist for Planner V0.11 (QA / migration / rollback hardening).
> Branch: `integrate/inventario-planner-20260708-1634`
> Date: 2026-07-14

This runbook covers environment setup, smoke tests, functional QA, copy verification, and known watchlist items. It does NOT cover visual polish, new UI, Archive, Permanent delete, Empty trash, Auto purge, Global trash, Bulk actions, Advanced realtime, Advanced offline, or frontend activity timeline — all explicitly out of scope for V0.

---

## 1. Environment Setup

### Backend
- Node.js version per `backend/package.json` engines
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set
- `JWT_SECRET` configured
- Local Supabase running: `supabase start` (or use cloud project with `supabase link`)

### Frontend
- Expo SDK per `front/mi-front-limpio/package.json`
- `EXPO_PUBLIC_API_URL` pointing to backend (e.g., `http://localhost:3000` or cloud URL)
- Android emulator or dev client running

### Database
- Migrations applied: `supabase db reset` (local) or verified on cloud
- Seed data: at least one household with 2+ members for verification/assignee flows

---

## 2. Commands

```bash
# Repo state
git status --short

# Supabase
supabase status
supabase db reset           # local: clean slate migration apply

# Backend syntax/type checks
cd backend
node --check index.js
node --check src/routes/planner.js
node --check src/services/planner.tasks.service.js
node --check src/services/planner.events.service.js
node --check src/services/planner.goals.service.js
node --check src/services/planner.trash.service.js
node --check src/services/planner.activity.service.js
node --check src/controllers/planner.tasks.controller.js
node --check src/controllers/planner.events.controller.js
node --check src/controllers/planner.goals.controller.js
node --check src/controllers/planner.trash.controller.js
node --check src/controllers/planner.activity.controller.js
node --check src/lib/plannerObservability.js

# Frontend type check
cd ../front/mi-front-limpio
npx.cmd tsc --noEmit

# Expo restart with cache clear
npx expo start -c

# Schema checks (manual in Supabase Studio or via CLI if supported)
# supabase db query -f docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql
```

---

## 3. Backend Smoke QA

All endpoints require `Authorization: Bearer <jwt>`.

| Endpoint | Method | Expected | Notes |
|----------|--------|----------|-------|
| `/api/auth/me` | GET | 200 | Validates auth context |
| `/api/planner/summary` | GET | 200 | Aggregated counts |
| `/api/planner/tasks` | GET | 200 | Default excludes cancelled |
| `/api/planner/events` | GET | 200 | Default range now..+30d |
| `/api/planner/goals` | GET | 200 | Excludes trashed/deleted |
| `/api/planner/trash` | GET | 200 | `Cache-Control: no-store` |
| `/api/planner/activity` | GET | 200 | Household-scoped audit rows |

**Verification:**
- All GETs return **200** (not 304) — `Cache-Control: no-store` present
- Response shapes match `PLANNER_V0_CONTRACT.md` section 11
- No tokens/secrets in response bodies or logs

---

## 4. Planner Functional QA

### 4.1 Tasks
| Step | Action | Endpoint | Expected |
|------|--------|----------|----------|
| 1 | Create task | POST `/api/planner/tasks` | 201, status `pending`, version 1 |
| 2 | List tasks | GET `/api/planner/tasks` | Task appears in `pending` |
| 3 | Complete task | POST `/api/planner/tasks/:id/complete` | 200, status `completed` or `awaiting_verification` |
| 4 | View "Hechas" | GET `/api/planner/tasks?status=completed` (or filter) | Completed tasks visible |
| 4b | If `requires_verification=true` | GET `?status=awaiting_verification` | Shows in "En verificación" |
| 5 | Cancel task | DELETE `/api/planner/tasks/:id` + `{reason}` | 200, status `cancelled`, `cancelled_from_status` set |
| 6 | View "Canceladas" | GET `/api/planner/tasks?include_cancelled=true` | Cancelled task appears |
| 7 | Reactivate task | POST `/api/planner/tasks/:id/reactivate` | 200, status restored to `cancelled_from_status` (or `pending`) |
| 8 | Move to Papelera | POST `/api/planner/tasks/:id/trash` | 200, `trashed_at` set, excluded from normal lists |
| 9 | Restore from Papelera | POST `/api/planner/tasks/:id/restore` | 200, `trashed_at` cleared, status unchanged (cancelled stays cancelled) |
| 10 | Version conflict | Send stale `If-Match` on update | 409 `version_conflict` |

**Verify:** Reactivate on trashed task → 409 `task_in_trash`. Restore cancelled task → remains cancelled. Reactivate after restore → works.

### 4.2 Events
| Step | Action | Endpoint | Expected |
|------|--------|----------|----------|
| 1 | Create event | POST `/api/planner/events` | 201, status `scheduled` |
| 2 | Cancel event | DELETE `/api/planner/events/:id` + `{reason}` | 200, status `cancelled` |
| 3 | View "Cancelados" | GET `/api/planner/events?include_cancelled=true` | Cancelled event appears |
| 4 | Reactivate event | POST `/api/planner/events/:id/reactivate` | 200, status `scheduled` |
| 5 | Move to Papelera | POST `/api/planner/events/:id/trash` | 200, `trashed_at` set |
| 6 | Restore event | POST `/api/planner/events/:id/restore` | 200, `trashed_at` cleared, status preserved |
| 7 | Verify cancelled NOT in Papelera unless trashed | GET `/api/planner/trash?type=events` | Cancelled-only events absent; only trashed events appear |

### 4.3 Goals (Metas)
| Step | Action | Endpoint | Expected |
|------|--------|----------|----------|
| 1 | Create meta | POST `/api/planner/goals` | 201, status `active`, `progress_mode=steps` default |
| 2 | Complete/Lograr | POST `/api/planner/goals/:id/complete` | 200, status `completed`, progress 100% |
| 3 | Reopen | POST `/api/planner/goals/:id/reopen` | 200, status `active`, progress recalculated |
| 4 | Close/Cerrar | POST `/api/planner/goals/:id/close` + `{closed_reason}` | 200, status `closed`, progress 0% |
| 5 | Reopen closed | POST `/api/planner/goals/:id/reopen` | 200, status `active` |
| 6 | Move to Papelera | POST `/api/planner/goals/:id/trash` (or DELETE) | 200, `trashed_at` set |
| 7 | Restore | POST `/api/planner/goals/:id/restore` | 200, `trashed_at` & `deleted_at` cleared |
| 8 | Verify GoalDetail navigation | Frontend: open GoalDetail, mutate, go back | Does NOT navigate to Home unexpectedly |

### 4.4 Milestones (Hitos)
| Step | Action | Endpoint | Expected |
|------|--------|----------|----------|
| 1 | Create hito | POST `/api/planner/goals/:goalId/milestones` | 201, `achieved=false` |
| 2 | Mark achieved | PATCH `/api/planner/goals/:goalId/milestones/:id` + `{achieved:true}` | 200, `achieved=true`, `achieved_at` set |
| 3 | Mark unachieved | PATCH + `{achieved:false}` | 200, `achieved=false`, `achieved_at` cleared |
| 4 | Trash hito | POST `/api/planner/goals/:goalId/milestones/:id/trash` | 200, `trashed_at` set |
| 5 | Restore hito | POST `/api/planner/goals/:goalId/milestones/:id/restore` | 200, `trashed_at` & `deleted_at` cleared |
| 6 | Parent-goal-in-trash behavior | Trash parent goal, then list trash | Milestones with trashed parent are hidden (`restore_requires_parent=true`); restore parent first |

### 4.5 Trash (Papelera)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Trash one of each type (task, event, goal, milestone) | All appear in `GET /api/planner/trash?type=all` |
| 2 | Filter by type | `?type=tasks`, `?type=events`, `?type=goals` return correct subsets |
| 3 | Restore each | Restore preserves operational status (cancelled stays cancelled, completed stays completed) |
| 4 | Restore cancelled task/event from Trash | Item restored, status remains `cancelled`; requires separate Reactivar |

### 4.6 Activity Log
| Step | Action | Expected |
|------|--------|----------|
| 1 | Create task | `GET /api/planner/activity` returns `task.created` row |
| 2 | Complete task | `task.completed` row with `previous_state`/`next_state` |
| 3 | Cancel task | `task.cancelled` with `cancelled_from_status` in metadata |
| 4 | Trash/restore goal | `goal.trashed`, `goal.restored` rows |
| 5 | Verify scoping | Only household's rows returned; no cross-household leakage |

### 4.7 Cache / Refresh
| Check | Method | Expected |
|-------|--------|----------|
| Planner GETs return 200 not 304 | Any GET `/api/planner/*` | `Cache-Control: no-store, no-cache, must-revalidate, private` |
| Views refresh after mutation | Frontend: mutate → navigate back | List shows new state without pull-to-refresh |
| No stale cancelled/completed/trashed rows | List endpoints after mutations | Filtering respects `trashed_at IS NULL`, status filters work |

---

## 5. Expected Visible Copy (Spanish)

| Context | Key | Required Label |
|---------|-----|----------------|
| Entity | Goal | **Meta** / **Metas** |
| Entity | Milestone | **Hito** / **Hitos** |
| Screen | Trash | **Papelera** |
| Action (Trash only) | Restore | **Restaurar** |
| Action (Cancelled) | Reactivate task | **Reactivar tarea** |
| Action (Cancelled) | Reactivate event | **Reactivar evento** |
| Tab/Filter | Completed tasks | **Hechas** |
| Status | Awaiting verification | **En verificación** |
| Tab/Filter | Cancelled tasks | **Canceladas** |
| Tab/Filter | Cancelled events | **Cancelados** |
| Status | Scheduled event | **Programado** |
| Status | Cancelled event | **Cancelado** |
| Action | Complete task | **Completar** |
| Action | Verify task | **Verificar** |
| Action | Cancel task | **Cancelar tarea** |
| Action | Move to trash (task/event/goal/hito) | **Mover a la papelera** |
| Action | Close goal | **Cerrar meta** |
| Action | Reopen goal | **Reabrir meta** |
| Action | Achieve goal | **Marcar lograda** |

**Forbidden in V0 UI:**
- *Eliminar definitivamente*, *Vaciar papelera*, *Archivar*, *Objetivo/Objetivos*

---

## 6. Known Watchlist

| Item | Status | Notes |
|------|--------|-------|
| GoalDetail navigation to Home on back | Watchlist (not reproduced in V0.10) | Defensive `routeFromGoal`/`routeReturnToGoalId` in place; monitor |
| Activity timeline visible UI | Post-V0 | Backend endpoint exists (`GET /api/planner/activity`), frontend not implemented |
| Archive / Permanent delete / Empty trash | Out of scope V0 | Must not appear in UI or API |
| `cancelEvent` not idempotent on re-cancel | Documented in gap report (V0.2-2) | Overwrites `cancelled_at`; idempotency key mitigates same-request |
| Events RLS errors surface as 500 | Documented (V0.2-1) | `planner.events.service.js` missing RLS detection |
| `awaiting_verification` copy: "Por verificar" vs "En verificación" | V0.2-7 | Contract says "En verificación"; frontend uses "Por verificar" |

---

## 7. Sign-off

- [ ] All smoke QA endpoints return 200 with correct shapes
- [ ] All functional QA scenarios pass
- [ ] Copy audit: no forbidden terms, all required labels present
- [ ] Cache headers: no 304 on Planner GETs
- [ ] Activity log rows created for each mutation type
- [ ] Version conflict (409) reproducible and handled
- [ ] Trash/restore/cancel/reactivate distinctions verified
- [ ] No tokens/secrets in logs or responses

---

*End of V0 QA Runbook. Post-V0 features (Archive, Permanent delete, Bulk actions, etc.) are tracked separately and must not be implemented under V0.x.*