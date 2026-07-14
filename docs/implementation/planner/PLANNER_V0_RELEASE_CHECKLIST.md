# Planner V0 Release Checklist

> Final gate for merging V0.11 (QA / migration / rollback hardening) into main.
> Branch: `integrate/inventario-planner-20260708-1634`
> Target: `main`
> Date: 2026-07-14

---

## Pre-merge

- [ ] **Working tree clean** except known ignored files (`.idea/`, `supabase/snippets/`, `docs/polish-final/`, `geni_implementation_audit.js`)
- [ ] **All Planner migrations apply from empty DB**
  - `supabase db reset` completes without errors
  - All 15 planner migrations applied in order
- [ ] **Schema checks pass**
  - `PLANNER_V0_SCHEMA_CHECKS.sql` executed in Supabase Studio → all checks PASS
  - Tables exist: `planner_tasks`, `planner_events`, `planner_goals`, `planner_goal_milestones`, `planner_idempotency_keys`, `planner_activity_log`
  - Key columns present (version, *_by_member_id, trashed_at, cancelled_*, priority, status constraints)
  - RLS enabled on all 6 tables
  - Version triggers attached
  - Partial untrashed indexes exist
- [ ] **Backend syntax check passes**
  - `node --check index.js`
  - `node --check src/routes/planner.js`
  - `node --check src/services/planner.tasks.service.js`
  - `node --check src/services/planner.events.service.js`
  - `node --check src/services/planner.goals.service.js`
  - `node --check src/services/planner.trash.service.js`
  - `node --check src/services/planner.activity.service.js`
  - `node --check src/controllers/planner.tasks.controller.js`
  - `node --check src/controllers/planner.events.controller.js`
  - `node --check src/controllers/planner.goals.controller.js`
  - `node --check src/controllers/planner.trash.controller.js`
  - `node --check src/controllers/planner.activity.controller.js`
  - `node --check src/lib/plannerObservability.js`
- [ ] **Frontend TypeScript passes**
  - `npx.cmd tsc --noEmit` in `front/mi-front-limpio` → 0 errors
- [ ] **Runtime QA runbook executed** (see `PLANNER_V0_QA_RUNBOOK.md`)
  - Backend smoke QA: all 7 endpoints return 200
  - Functional QA: tasks, events, goals, milestones, trash, activity log scenarios pass
  - Cache/refresh: Planner GETs return 200 (not 304), views refresh after mutations
  - Copy audit: all required labels present, no forbidden terms
- [ ] **Planner GETs return 200, not 304**
  - `Cache-Control: no-store, no-cache, must-revalidate, private` present on all `/api/planner` GET responses
  - Verified via curl/DevTools Network tab
- [ ] **No tokens/secrets logged**
  - `plannerObservabilityMiddleware` redacts `authorization`, `cookie`, `idempotency-key` headers
  - No JWT, service role key, or DB passwords in logs
- [ ] **No Archive / Permanent delete / Empty trash UI**
  - Grep frontend for: `Archivar`, `Eliminar definitivamente`, `Vaciar papelera`, `Permanent` → 0 matches in planner screens
- [ ] **No "Objetivo" copy in Planner**
  - Grep for `Objetivo` in `front/mi-front-limpio/screens/planner/**` → 0 matches
  - Only `Meta`/`Metas` used
- [ ] **Activity log table receives rows**
  - After each mutation type (create/update/complete/verify/cancel/reactivate/trash/restore/close/reopen), a row appears in `planner_activity_log` with correct `entity_type`, `action`, `previous_state`, `next_state`
- [ ] **Trash / Restore / Cancel / Reactivate distinctions verified**
  - Trashed item: `trashed_at` set, excluded from normal lists, appears in `/trash`, `Restaurar` clears `trashed_at`
  - Cancelled item: `status='cancelled'`, `cancelled_from_status` set, `trashed_at` NULL, `Reactivar` restores previous status
  - Restore cancelled from Trash → stays cancelled, requires separate Reactivar
  - Reactivate on trashed → 409 `task_in_trash` / `event_in_trash`
- [ ] **V0 docs updated**
  - `PLANNER_V0_CONTRACT.md` has V0.11 section
  - `PLANNER_V0_GAP_REPORT.md` marks V0.11 as implemented
  - `PLANNER_V0_MIGRATION_AUDIT.md` created
  - `PLANNER_V0_SCHEMA_CHECKS.sql` created
  - `PLANNER_V0_QA_RUNBOOK.md` created
  - This checklist created

---

## Post-merge

- [ ] **Tag or record commit hash** (e.g., `git tag planner-v0.11` or note SHA in release notes)
- [ ] **Run smoke QA after pulling fresh on main**
  - `git checkout main && git pull`
  - `supabase db reset` (local) or verify cloud migrations
  - Backend smoke + 2 functional happy paths
- [ ] **Verify Supabase cloud migration plan before remote apply**
  - Review migration order and dependencies
  - Confirm no destructive operations in pending migrations
  - Schedule maintenance window if needed
- [ ] **Record known limitations** (from gap report watchlist)
  - GoalDetail Home navigation (watchlist)
  - Activity timeline UI (post-V0)
  - `cancelEvent` non-idempotent re-cancel (V0.2-2)
  - Events RLS → 500 (V0.2-1)
  - `awaiting_verification` copy alignment (V0.2-7)

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Backend Lead | | | [ ] |
| Frontend Lead | | | [ ] |
| QA | | | [ ] |
| Release Manager | | | [ ] |

---

*V0.11 is the final hardening release for the Planner V0 technical layer. No new runtime behavior is introduced. All items above must be green before merge.*