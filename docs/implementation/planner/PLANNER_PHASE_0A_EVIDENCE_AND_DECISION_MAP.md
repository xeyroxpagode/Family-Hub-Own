# PLANNER PHASE 0A - EVIDENCE AND DECISION MAP

STATUS: `PHASE_0A_EVIDENCE_REPORT`

RESULT: `PLANNER_PHASE_0A_EVIDENCE_AND_DECISION_MAP_COMPLETE`

## 1. Refs

| Item | Value |
|---|---|
| Active worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation` |
| Branch | `planner-v1-plans-reconciliation` |
| Initial HEAD | `7138805` |
| Current ref audited | `7138805` |
| V1 reference worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\reference-v1` |
| V1 ref | `f093bffaa7a7db6db7fc1b0072ba90352325a90a` |

Mandatory sources read in full before this report:

| Source | Evidence |
|---|---|
| V1-first manifest | `docs/implementation/planner/PLANNER_V1_FIRST_PORT_MANIFEST.md` |
| Plan structure reconciliation audit | `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md` |
| P1 domain contract | `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_REPORT.md` |
| P2A milestone editor report | `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md` |

Additional implementation reports consulted:

| Area | Source |
|---|---|
| Tasks | `docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md`, `docs/implementation/planner/M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md` |
| Events | `docs/implementation/planner/M11_2A_EVENT_DOMAIN_FOUNDATION_REPORT.md`, `docs/implementation/planner/M11_FRONTEND_EVENTS_REPORT.md` |
| Plans | `docs/implementation/planner/M11_3A_PLAN_GRAPH_FOUNDATION_REPORT.md`, `docs/implementation/planner/M11_FRONTEND_PLANS_REPORT.md` |
| Presets/Drafts | `docs/implementation/planner/M11_4A_PRESETS_DRAFTS_FOUNDATION_REPORT.md`, `docs/implementation/planner/M11_FRONTEND_PRESETS_DRAFTS_REPORT.md`, `docs/implementation/planner/M11_FRONTEND_PRESETS_DRAFTS_INTEGRATION_REPORT.md` |
| Reliability | `docs/implementation/planner/M11_7A_RELIABILITY_DURABLE_OPERATION_FOUNDATION_REPORT.md`, `docs/implementation/planner/M11_7B_RELIABILITY_FRONTEND_REPORT.md`, `docs/implementation/planner/M11_7C_RELIABILITY_INTEGRATION_REPORT.md` |
| Search | `docs/implementation/planner/M11_11A_2B_ACTIVE_SEARCH_REPORT.md`, `docs/implementation/planner/M11_11A_P1A_QUICK_ACTIONS_SEARCH_RESEARCH.md` |
| Attention/Activity | `docs/implementation/planner/M11_11A_2C_ATTENTION_ACTIVITY_REPORT.md`, `docs/implementation/planner/M11_11A_P1C_ATTENTION_ACTIVITY_RESEARCH.md` |
| Archive/Trash | `docs/implementation/planner/M11_11A_P1D_TRASH_ARCHIVE_RESEARCH.md` |
| Home | `docs/implementation/planner/M11_11A_P1B_HOME_RESEARCH.md` |
| Global surfaces | `docs/implementation/planner/M11_11A_0_GLOBAL_SURFACES_READINESS_AUDIT.md`, `docs/implementation/planner/M11_11A_1_GLOBAL_SURFACES_TECHNICAL_READINESS_AUDIT.md`, `docs/implementation/planner/M11_11A_2A_GLOBAL_SURFACES_FOUNDATIONS_REPORT.md` |

Direct code and DB evidence was preferred over documents whenever a contract could be validated in migrations, backend routes, backend services, frontend services, or screens.

## 2. Git State

Initial safety commands were executed in the active worktree:

```text
git branch --show-current -> planner-v1-plans-reconciliation
git rev-parse --short HEAD -> 7138805
```

Initial preexisting dirty state:

| Path | State | Classification |
|---|---|---|
| `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | `M` | REC-0A instrumentation: PlanCompositionTrace mounts/unmounts |
| `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` | `M` | REC-0A instrumentation: PlanCompositionTrace mounts/unmounts |
| `front/mi-front-limpio/screens/planner/PlannerPlanDetailScreen.tsx` | `M` | REC-0A instrumentation: PlanCompositionTrace and activate handler tracing |
| `front/mi-front-limpio/screens/planner/PlannerPlanStructureEditScreen.tsx` | `M` | REC-0A instrumentation: PlanCompositionTrace mounts/unmounts |
| `front/mi-front-limpio/services/planner/planCompositionTrace.ts` | `??` | REC-0A instrumentation helper |

Safety incident during continuation:

| Item | Outcome |
|---|---|
| Unexpected file | `front/mi-front-limpio/screens/planner/$null`, empty, untracked |
| User authorization | Delete the empty `$null` file and continue |
| Secondary unexpected state | 25 tracked planner screen files appeared deleted after deleting `$null` |
| User authorization | Restore only tracked deleted files under `front/mi-front-limpio/screens/planner/` built from `git diff --name-only --diff-filter=D` and `git diff --cached --name-only --diff-filter=D` |
| Restoration performed | 25 files restored with `git restore --source=HEAD --staged --worktree -- <path>` |
| Post-restore status | Only REC-0A instrumentation remained dirty |

No production code was intentionally modified for Phase 0A. This document is docs-only.

## 3. Inventory Tasks

### DB Model

| Capability | Evidence | Status |
|---|---|---|
| Base Planner task table | `supabase/migrations/202606230001_planner_mvp.sql:6-35` creates `public.planner_tasks` with title, description, status, priority, template key, category, due date/time, verification flags and actor fields | BACKEND_COMPLETE for V0 task row |
| Status values | `supabase/migrations/202606230001_planner_mvp.sql:37-47` permits `pending`, `completed`, `awaiting_verification`, `verified`, `cancelled` | BACKEND_COMPLETE |
| Priority values changed over time | Base table has `low`, `medium`, `high`, `critical` at `supabase/migrations/202606230001_planner_mvp.sql:49-58`; later service insert uses `normal` in `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:1048` | NEEDS_DB_VALIDATION for final normalized priority vocabulary |
| Legacy goal link | `supabase/migrations/202607080004_planner_goals.sql:115-120` adds `planner_tasks.goal_id uuid references public.planner_goals(id)` plus index | LEGACY_ONLY but still productive |
| Trash | `supabase/migrations/20260713003000_add_planner_trash_restore.sql:4-8` adds `trashed_at` and `trashed_by_member_id` | BACKEND_PARTIAL: recoverable trash without TTL |
| Cancellation metadata | `supabase/migrations/20260713004000_add_planner_cancellation_metadata.sql:4-9` adds cancellation fields | BACKEND_COMPLETE for reversible cancellation metadata |
| Fulfillment foundation | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:78-113` computes aggregate state from `planner_task_fulfillments` | BACKEND_COMPLETE for fulfillment aggregate |
| Assignment model | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:310-518` updates assignment configs, assignees, and fulfillments atomically | BACKEND_COMPLETE |

### Endpoints And Backend

Routes are present in `backend/src/routes/planner.js`:

| Endpoint | Evidence | Status |
|---|---|---|
| `GET /api/planner/tasks/:id` | `backend/src/routes/planner.js:64` | BACKEND_CONNECTED |
| `GET /api/planner/tasks` | `backend/src/routes/planner.js:65` | BACKEND_CONNECTED |
| `POST /api/planner/tasks` | `backend/src/routes/planner.js:66` | BACKEND_CONNECTED |
| `PATCH /api/planner/tasks/:id` | `backend/src/routes/planner.js:67` | BACKEND_CONNECTED |
| `DELETE /api/planner/tasks/:id` | `backend/src/routes/planner.js:68` | BACKEND_CONNECTED as cancel, not hard delete |
| `POST /api/planner/tasks/:id/trash` | `backend/src/routes/planner.js:69` | BACKEND_CONNECTED |
| `POST /api/planner/tasks/:id/restore` | `backend/src/routes/planner.js:70` | BACKEND_CONNECTED |
| `POST /api/planner/tasks/:id/reactivate` | `backend/src/routes/planner.js:71` | BACKEND_CONNECTED |
| `POST /api/planner/tasks/:id/complete` | `backend/src/routes/planner.js:72` | LEGACY/V0 compatibility connected |
| `POST /api/planner/tasks/:id/verify` | `backend/src/routes/planner.js:73` | LEGACY/V0 compatibility connected |
| `GET /api/planner/v1/tasks/:taskId/fulfillment` | `backend/src/routes/planner.js:54` | BACKEND_CONNECTED |
| `PUT /api/planner/v1/tasks/:taskId/assignment` | `backend/src/routes/planner.js:55` | BACKEND_CONNECTED |
| `POST /api/planner/v1/tasks/:taskId/claim` | `backend/src/routes/planner.js:56` | BACKEND_CONNECTED |
| fulfillment mutations | `backend/src/routes/planner.js:57-62` exposes complete, verify, request correction, resubmit, revert, reopen | BACKEND_COMPLETE |

### Creation And Edit

| Item | Evidence | Status |
|---|---|---|
| Create writes `goal_id` when present | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:1023-1033` validates the payload `goal_id` against `planner_goals`; `:1039-1062` inserts it | LEGACY_ONLY but productive |
| Create accepts title, description, priority, template key, category, due date/time, verification, assignment, origin fields | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:1039-1062` | BACKEND_COMPLETE |
| Task update path exists | `backend/src/routes/planner.js:67` plus `mutate_planner_task_v0` action list at `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:937-938` | BACKEND_CONNECTED |

### Completion, Verification, Correction

| Capability | Evidence | Status |
|---|---|---|
| Complete fulfillment | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:742-801` | BACKEND_COMPLETE |
| Verification required routes to awaiting verification | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:793` | BACKEND_COMPLETE |
| Verify | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:807-813` | BACKEND_COMPLETE |
| Request correction | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:814-821` | BACKEND_COMPLETE |
| Resubmit after correction | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:822-832` | BACKEND_COMPLETE |
| Revert/reopen | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:833-858` | BACKEND_COMPLETE |
| Self-verification prohibition | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:756-759` returns `self_verification_not_allowed` | BACKEND_COMPLETE |

### Plan Link

| Option | Evidence | Status |
|---|---|---|
| Legacy task-to-goal | `planner_tasks.goal_id` FK to `planner_goals` at `supabase/migrations/202607080004_planner_goals.sql:115-120` | LEGACY_ONLY but still connected |
| Current task-to-plan via external requirement | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:172-216` permits `subject_type='external'`, `external_kind in ('task','event')`; `:208-210` states external requirements are deliberately unbound in M11.3A and `external_entity_id` must be null | BACKEND_PARTIAL, not real Task binding |
| Current external requirement satisfaction | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:535-537` external Task/Event requirements remain unsatisfied in M11.3A | PRODUCT_DECISION_REQUIRED |

### Evidence And Attachments

No table, bucket, DTO, or upload service was found that connects Task fulfillment to an image/evidence artifact. Current Task verification is state/comment based, not attachment based. The flow `Task completed -> image/evidence -> in review -> other person verifies -> approve/correction` is BACKEND_PARTIAL for state and FRONTEND/BACKEND_MISSING for evidence artifacts.

### Frontend Current And V1

| Surface | Current evidence | V1 evidence | Status |
|---|---|---|---|
| Productive screens | `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`, `TaskDetailScreen.tsx`, `TaskForm.tsx` are tracked and restored after safety incident | Same filenames exist in V1 reference according to `PLANNER_V1_FIRST_PORT_MANIFEST.md:101-107` | V1_PARITY at screen level |
| Quick create | `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` imports task/event/plan form hosts and is under REC-0A instrumentation | V1 used `TaskForm.tsx` and Quick Actions, per `PLANNER_V1_FIRST_PORT_MANIFEST.md:112-118` | FRONTEND_CONNECTED, product flow needs review |
| Reliability | `PLANNER_V1_FIRST_PORT_MANIFEST.md:142-149` requires `PlannerMutationIntent`, productive mutations, Reliability runtime, single-flight | Current implementation has these files present | CURRENT authority preserved |

## 4. Inventory Events

### DB Model

| Capability | Evidence | Status |
|---|---|---|
| Base event table | `supabase/migrations/202606230001_planner_mvp.sql:97-119` creates `planner_events` with title, description, status, starts_at/ends_at, all_day, location_name, recurrence | BACKEND_COMPLETE for V0 row |
| Base recurrence enum | `supabase/migrations/202606230001_planner_mvp.sql:130-139` allows `none`, `daily`, `weekly`, `monthly` | LEGACY_PARTIAL |
| Occurrence override compatibility | `supabase/migrations/202606230005_planner_event_occurrence_overrides.sql:5-16` adds `parent_event_id`, `original_occurrence_start_at`, unique override index | BACKEND_PARTIAL |
| Event V1 ownership/scope | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:15-34` adds `scope`, `owner_person_id`, lifecycle, schedule fields, timezone, series identity | BACKEND_COMPLETE |
| Event V1 schedule checks | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:132-220` validates scope, lifecycle, all-day/timed shapes, timezone, location payload, occurrence identity | BACKEND_COMPLETE |
| Series table | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:227-261` creates `planner_event_series` with recurrence rule, starts_on/ends_on, split metadata, lifecycle | BACKEND_COMPLETE |
| Participants | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:292-310` creates `planner_event_participants` with RSVP and attendance | BACKEND_COMPLETE |
| RSVP values | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:304-308` allows `pending`, `attending`, `declined`, `maybe`; attendance supports `not_recorded`, `present`, `absent`, `excused` | BACKEND_COMPLETE |

### Endpoints And Backend

| Endpoint | Evidence | Status |
|---|---|---|
| Event V1 detail/list/create/mutate | `backend/src/routes/planner.js:75-79` exposes `/v1/events` and mutations | BACKEND_CONNECTED |
| Legacy event detail/list/create/update/cancel/trash/restore/reactivate/override | `backend/src/routes/planner.js:81-89` | BACKEND_CONNECTED as compatibility surface |
| Calendar projection | `backend/src/routes/planner.js:91` | BACKEND_CONNECTED |

### Recurrence

| Capability | Evidence | Status |
|---|---|---|
| Recurrence rule validation | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:48-81` validates `frequency`, `interval`, `untilDate`, `count` | BACKEND_COMPLETE |
| Frequencies | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:60-61` allows daily, weekly, monthly, yearly | BACKEND_COMPLETE |
| Timezone validation | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:36-46` validates against `pg_timezone_names` | BACKEND_COMPLETE |
| Instance identity | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:211-215` requires `series_id + occurrence_key` together | BACKEND_COMPLETE |
| Edit scopes exposed in DTO | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:1018-1028` returns `availableEditScopes` including `this_occurrence`, `this_and_following`, `whole_series` depending on safe split | BACKEND_COMPLETE |
| V0 compatibility bridge | `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:576-630` maps V0 recurrence/overrides into series/occurrence identity | BACKEND_PARTIAL compatibility |
| Frontend recurrence UI | Current screens exist (`EventForm.tsx`, `PlannerCalendarScreen.tsx`) but Phase 0A did not validate runtime behavior | NEEDS_RUNTIME_VALIDATION |
| Occurrence-level Plan link | No evidence of Plan external event binding to recurrence occurrence identity | PRODUCT_DECISION_REQUIRED |

### Plan Link

| Option | Evidence | Status |
|---|---|---|
| Direct Event FK to Plan | Plan graph migration says it creates no Task/Event FK at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:3-5` | BACKEND_MISSING |
| External event requirement | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:180-182` supports `external_kind='event'`; `:208-210` keeps it unbound | BACKEND_PARTIAL |
| Final event field | `planner_plans.finalization_kind` supports `event` at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:20-22,39-42` | BACKEND_PARTIAL: no FK/binding |

### Frontend And Calendar

| Surface | Evidence | Status |
|---|---|---|
| V1 calendar flow | `PLANNER_V1_FIRST_PORT_MANIFEST.md:119-136` lists `PlannerCalendarScreen.tsx`, `PlannerCalendarComponents.tsx`, `EventForm.tsx`, `plannerEvents.ts` as V1 sources | V1_PARITY source exists |
| Current event service | `front/mi-front-limpio/services/plannerEventsV1.ts`, `plannerEvents.ts`, `plannerCalendar.ts` exist in current tree | FRONTEND_CONNECTED, runtime not validated |

## 5. Inventory Goals And Plans

### Legacy Goals

| Capability | Evidence | Status |
|---|---|---|
| Goal root | `supabase/migrations/202607080004_planner_goals.sql:5-33` creates `planner_goals` | LEGACY_ONLY but productive |
| Goal fields | `supabase/migrations/202607080004_planner_goals.sql:9-31` includes title, description, visibility, category, progress fields, starts/ends, status, creator, completed/failed/deleted | LEGACY_PRODUCTIVE |
| Goal milestones | `supabase/migrations/202607080004_planner_goals.sql:80-95` creates `planner_goal_milestones` | LEGACY_PRODUCTIVE |
| Goal routes | `backend/src/routes/planner.js:94-111` exposes `/goals` CRUD, lifecycle, trash/restore, milestones | BACKEND_CONNECTED |
| Trash/restore | `supabase/migrations/20260713003000_add_planner_trash_restore.sql:14-23` adds trash fields to goals/milestones and `:128-341` adds RPCs | BACKEND_CONNECTED |

### Current Plans

| Capability | Evidence | Status |
|---|---|---|
| Canonical Plan root | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:13-57` creates `planner_plans` | CURRENT_AUTHORITY |
| Ownership | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:44-48` enforces personal vs household shape | CURRENT_AUTHORITY |
| Lifecycle | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:39-42` supports draft, active, paused, completed, closed and finalization kind | CURRENT_AUTHORITY |
| Archive | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:49-51` permits archive only completed/closed | BACKEND_COMPLETE, capability reachability needs validation |
| Trash | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:31-35,52-56` stores trash metadata | BACKEND_COMPLETE |
| Legacy mapping | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:250-257` creates `planner_plan_legacy_goal_links` | BACKEND_PARTIAL bridge only |
| Plan endpoints | `backend/src/routes/planner.js:47-52` exposes compatibility report, structure endpoint, graph detail, list, create/mutations | BACKEND_CONNECTED |
| Plan graph read/write RPCs | `PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md:145-155` lists graph endpoints/RPCs | BACKEND_CONNECTED |

### Structure Nodes

| Entity | Evidence | Classification |
|---|---|---|
| Milestone | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:59-92` | CLEAR_PRODUCT_ROLE |
| Measurement | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:94-140` | CLEAR_PRODUCT_ROLE but NEEDS_STRESS_TEST |
| Manual Condition | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:142-170` | PRODUCT_DECISION_REQUIRED; overlaps requirement/task/milestone in common cases |
| Requirement | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:172-216` | CLEAR_PRODUCT_ROLE for blockers/hierarchy, NEEDS_STRESS_TEST for UX exposure |
| Measurement history | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:122-140` | CLEAR_PRODUCT_ROLE for numeric targets |

## 6. Inventory Presets

| Capability | Evidence | Status |
|---|---|---|
| Tables | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:9-57` creates presets and revisions | BACKEND_COMPLETE |
| Supported entity types | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:11` supports task, event, plan | BACKEND_COMPLETE |
| Sources | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:12` supports homeplus, personal, household | BACKEND_COMPLETE |
| Scope shape | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:25-29` enforces source ownership | BACKEND_COMPLETE |
| Payload | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:41-45` stores adapter key, schema, version, JSON payload, structural fingerprint | BACKEND_COMPLETE |
| HomePlus immutability | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:188-206` rejects mutability for `source='homeplus'` | DECIDED |
| Trash TTL | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:513-560` sets 30 day retention on preset trash | BACKEND_COMPLETE |
| Restore expiry guard | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:562-609` rejects restore after retention expiry | BACKEND_COMPLETE |
| Routes | `backend/src/routes/planner.presets-drafts.js:9-20` exposes library, create, get, update, revisions, trash/restore, prepare | BACKEND_CONNECTED |
| Frontend | `front/mi-front-limpio/types/plannerPresetsDrafts.ts`, `services/plannerPresets.ts`, `components/planner/presets/*` exist | FRONTEND_PARTIAL; runtime/use in real create flows needs validation |

Preset gaps:

| Question | Current evidence result |
|---|---|
| Can Preset create structure? | Payload can store structure, but direct productive application into Plan/Task/Event creation was not runtime validated in 0A |
| Can include Task/Event templates inside Plan preset? | Payload envelope could represent it, but no confirmed productive multi-entity generator was found |
| Preview/confirmation | `GET /presets/:id/prepare` exists at `backend/src/routes/planner.presets-drafts.js:17`; frontend runtime needs validation |
| Quick Create inline suggestions | Not confirmed as connected |
| HomePlus original edit/delete/archive | Backend blocks mutability and trash because `planner_assert_preset_mutable` rejects homeplus |

## 7. Inventory Drafts

| Capability | Evidence | Status |
|---|---|---|
| Table | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:89-118` creates `planner_drafts` | BACKEND_COMPLETE |
| Entity types | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:92` supports task, event, plan | BACKEND_COMPLETE |
| Owner-only | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:226-228` RLS owner select only | BACKEND_COMPLETE |
| Intended scope | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:93-113` stores personal/household intent | BACKEND_COMPLETE |
| Preset origin | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:96-97` links source preset/revision | BACKEND_COMPLETE |
| Autosave | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:612-685` implements autosave create/update | BACKEND_COMPLETE |
| Last autosave timestamp | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:104` | BACKEND_COMPLETE |
| Trash TTL | `supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql:688-735` sets 30 day retention when trashed | BACKEND_COMPLETE for trash retention |
| Live draft TTL | No `expires_at` column for non-trashed drafts in `planner_drafts` | BACKEND_MISSING |
| Cleanup/hard delete | No purge job or hard delete route confirmed | BACKEND_MISSING |
| Temporary attachments | No evidence of draft attachment table/bucket | BACKEND_MISSING |
| Routes | `backend/src/routes/planner.presets-drafts.js:22-29` exposes recover, list, autosave, get, discard, trash, restore, prepare | BACKEND_CONNECTED |
| Frontend | `services/plannerDrafts.ts`, `services/planner/plannerAutosaveCoordinator.ts`, `components/planner/drafts/*` exist | FRONTEND_PARTIAL; contextual dirty-leave behavior needs runtime validation |

## 8. Split Legacy Goal Vs Plan Current

### Facts

| Question | Evidence | Answer |
|---|---|---|
| What data does Home read for “Meta en riesgo”? | `backend/src/services/planner.summary.service.js:10-13` states Home Summary projects Tasks, Events and 1 Goal; `:36-38` sets `GOAL_LIMIT=1` and eligible statuses active; `front/mi-front-limpio/screens/home/HomePlannerSections.tsx:288-340` renders `summary.goal` | Home reads legacy `planner_goals`, not Current `planner_plans` |
| Why does a V1-created Meta appear in Home? | Summary selects from `planner_goals` at `backend/src/services/planner.summary.service.js:372`; Goal creation route remains at `backend/src/routes/planner.js:94-95` | Because legacy Goals remain productive |
| Why does it not appear in Current Plans list? | Current Plan list endpoint is `/plans` at `backend/src/routes/planner.js:50`; Plan table is `planner_plans` at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:13-57`; legacy Goal table is separate | Different roots, no automatic bridge/migration |
| What ID does Home navigation send? | `front/mi-front-limpio/screens/home/HomePlannerSections.tsx:312-317` passes `params: { goalId: goal.id }` to `screen: 'GoalDetail'` | It sends legacy `planner_goals.id` |
| What endpoint does Detail use after navigation? | Current Plan detail uses canonical Plan graph service per `PLANNER_V1_FIRST_PORT_MANIFEST.md:95` and routes `/plans/:id` at `backend/src/routes/planner.js:49` | It attempts Current Plan graph lookup |
| Why “Plan no encontrado”? | `planner_goals.id` is not a `planner_plans.id`; bridge table `planner_plan_legacy_goal_links` exists but is only explicit mapping at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:250-257` | Legacy ID is routed into Current Plan Detail without mapping |
| Search projects what? | `backend/src/services/planner.search.service.js:245` queries `planner_plans`; `:12` uses entity types task/event/plan | Search is Current Plan, not legacy Goal |
| Attention projects what? | `backend/src/services/planner.attention.service.js:201-252` sources plan attention from `planner_plans` | Attention is Current Plan |
| Activity projects what? | `supabase/migrations/20260713005000_create_planner_activity_log.sql:18-20` allows task/event/goal/milestone only; `backend/src/services/planner.activity.service.js:136,181` reads `planner_activity_log` | Activity is legacy task/event/goal/milestone, not Current Plan graph |
| Are routes ambiguous? | `front/mi-front-limpio/navigation/plannerNavigationContract.ts:140-163` defines `PlanDetail: 'GoalDetail'`, `PlanCreate: 'CreateGoal'`, `PlanStructureEdit: 'EditGoal'`; legacy route names also include `GoalDetail` at `:201-211` | Yes, physical route names are legacy while semantic type is Plan |

### Factual Diagram

```text
planner_goals
-> /api/planner/goals routes
-> planner_goals.service.js
-> Home Summary goal projection
-> HomePlannerSections "Meta en riesgo"
-> planner_tasks.goal_id FK
-> Planner Trash legacy goal/milestone entries
-> legacy planner_activity_log entity_type='goal'/'milestone'

planner_plans
-> /api/planner/plans routes
-> planner.plans.service.js
-> Plan graph Current
-> Search plan results
-> Attention plan blockers/review required
-> Current Plan Detail/List/Structure editor
-> Plan Reliability/idempotency operations

planner_tasks.goal_id
-> FK to planner_goals only
-> validated by task create/update paths
-> used by legacy Goal Detail/Task list projections
-> cannot point to planner_plans
```

0B/0C alternatives to stress test:

| Alternative | Description | Status |
|---|---|---|
| Map Home legacy Goal to Plan via `planner_plan_legacy_goal_links` | Home/route resolver translates before opening Plan Detail | NEEDS_DB_VALIDATION |
| Keep legacy Goal Detail route for unmigrated Goals | Route `GoalDetail` loads legacy detail when params are `goalId` | NEEDS_PRODUCT_STRESS_TEST |
| Hide legacy Goals from Home until migrated | Prevent broken navigation but may hide useful V1 functionality | PRODUCT_DECISION_REQUIRED |
| Auto-create Plan bridge for legacy Goals | Migration/product operation creates `planner_plans` roots | NEEDS_DB_VALIDATION and migration design |

## 9. Real Entity Model

| Entity | Product role | Evidence | Classification |
|---|---|---|---|
| Task | Executable action with assignment, due dates, lifecycle, verification/correction | Task routes in `backend/src/routes/planner.js:54-73`; fulfillment operations in `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:629-899` | CLEAR_PRODUCT_ROLE |
| Event | Temporal commitment/context with schedule, recurrence, participants, RSVP | Event V1 migration `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:15-34,227-310` | CLEAR_PRODUCT_ROLE |
| Milestone | Outcome reached inside a Plan; can be manual/automatic | Plan graph migration `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:59-92` | CLEAR_PRODUCT_ROLE |
| Measurement | Numeric/current-vs-target indicator with history | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:94-140` | CLEAR_PRODUCT_ROLE, NEEDS_STRESS_TEST |
| Requirement | Necessary/supporting wrapper, hierarchy, activation/completion blocker | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:172-216,491-582` | CLEAR_PRODUCT_ROLE, NEEDS_STRESS_TEST |
| Manual Condition | Binary human checkpoint | `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:142-170` | PRODUCT_DECISION_REQUIRED; overlaps Task/Milestone/Requirement in many cases |

Manual Condition must not be preserved as a surface only because it exists. It needs stress tests where it cannot be modeled clearly as a Task, Requirement, Milestone, or Measurement.

## 10. Links

### Task Link Current

| Property | Evidence | Status |
|---|---|---|
| Legacy cardinality | `planner_tasks.goal_id` is one nullable FK to one `planner_goals` row at `supabase/migrations/202607080004_planner_goals.sql:115-120` | One Task -> zero/one legacy Goal |
| Current external requirement cardinality | Unique per `(plan_id, external_kind, external_reference_key)` at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:279-281`; no cross-plan uniqueness | Many Plans may reference same external key unless later constrained |
| Real entity binding | M11.3A shape requires `external_entity_id is null` at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:208-210` | BACKEND_MISSING for durable Task binding |
| Satisfaction | External requirements return false at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:535-537` | PRODUCT_DECISION_REQUIRED |
| Importance | `classification` supports necessary/supporting at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:183,197` | BACKEND_PARTIAL |
| Effect metadata | No separate effect column for contributes/context/block activation/block completion/defines date/final | BACKEND_MISSING |

### Event Link Current

| Property | Evidence | Status |
|---|---|---|
| Direct FK | Plan graph migration explicitly creates no Task/Event FK at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:3-5` | BACKEND_MISSING |
| External event | Same external requirement model supports event at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:180-182` | BACKEND_PARTIAL |
| Final event | `planner_plans.finalization_kind='event'` exists at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:20-22,39-42` | BACKEND_PARTIAL |
| Recurrence occurrence binding | Event has `series_id` and `occurrence_key`, but Plan external requirement lacks occurrence metadata | PRODUCT_DECISION_REQUIRED |

Importance and effect likely require metadata owned by the link, not by Task/Event root, because the same Task/Event can be principal in one Plan and contextual/supporting in another.

## 11. Forms

### Task Creation/Edit Paths

| Entry | Screens | Requests | Draft | Preset | Friction/defects |
|---|---|---|---|---|---|
| Quick Actions | `PlannerSheetHost.tsx` -> Task form host | `/api/planner/tasks` | Draft infra exists but contextual runtime needs validation | Preset infra exists; inline usage not confirmed | Needs draft selector when compatible draft exists |
| Planner Tasks | `PlannerTasksScreen.tsx` -> `TaskForm.tsx` | `/api/planner/tasks`, mutation wrappers | Partial | Partial | V1 flow useful; Current reliability must remain authority |
| From legacy Goal | V1 `TaskForm` accepted `goalId/fromGoal`; current create can still write `goal_id` | Creates Task with `goal_id` | Not validated | Not validated | Links to Goal, not Plan |
| From Current Plan | No confirmed productive create-and-link path | External requirement binding missing | Missing | Missing | Needs 0B/0C decision |
| Edit | `EditTaskScreen.tsx`/`TaskForm.tsx` | `PATCH /tasks/:id` or productive mutation | Partial | N/A | Assignment/fulfillment edits are separate V1 endpoints |

### Event Creation/Edit Paths

| Entry | Screens | Requests | Draft | Preset | Friction/defects |
|---|---|---|---|---|---|
| Quick Actions | `PlannerSheetHost.tsx` -> Event form host | `/api/planner/v1/events` or legacy `/events` | Partial | Partial | Runtime recurrence scope needs validation |
| Planner Calendar | `PlannerCalendarScreen.tsx`, `EventForm.tsx` | Event V1 mutations | Partial | Partial | Needs selected date/context carry-through validation |
| Calendar selected date | Calendar screen likely passes date context; not validated in runtime | Event create | Unknown | Unknown | NEEDS_RUNTIME_VALIDATION |
| From Current Plan | No confirmed productive create/link path | External requirement event binding missing | Missing | Missing | Final event semantics unresolved |
| Edit recurrence | Event V1 DTO exposes scopes | `/v1/events/:id/mutations` | Not validated | N/A | Scope UI/runtime not validated |

### Plan Creation/Edit Paths

| Entry | Screens | Requests | Draft | Preset | Friction/defects |
|---|---|---|---|---|---|
| Current create-base | `PlannerSheetHost.tsx`, Current Plan service | `POST /api/planner/plans` | Partial | Partial | Safe but low utility until Detail/structure journey is coherent |
| Legacy V1 Goal create | `CreateGoal` physical route; `/api/planner/goals` still exists | Creates `planner_goals` | Unknown | Unknown | Useful UX but wrong root |
| Structure edit | `PlannerPlanStructureEditScreen.tsx` | `POST /api/planner/plans/:id/structure` | Local editor draft only, not central Drafts | N/A | P2A supports milestones only |
| Plan root edit | `POST /api/planner/plans/:id/mutations` update | N/A | N/A | UI incomplete |
| Preset/Draft | Routes exist in presets/drafts router | prepare/apply not fully runtime validated | Exists | Exists | Needs 0B stress tests |

## 12. Recurrence

| Capability | Classification |
|---|---|
| Backend series model | BACKEND_COMPLETE |
| Backend recurrence rule validation | BACKEND_COMPLETE |
| Backend occurrence identity | BACKEND_COMPLETE |
| Backend this occurrence / whole series scopes | BACKEND_COMPLETE by DTO exposure |
| Backend this-and-following split | BACKEND_COMPLETE by `availableEditScopes`, NEEDS_RUNTIME_VALIDATION for mutation behavior |
| Cancel occurrence | BACKEND_PARTIAL; event mutations exist but specific runtime not validated |
| Cancel series | BACKEND_PARTIAL; series lifecycle exists, runtime not validated |
| Timezone | BACKEND_COMPLETE |
| Frontend recurrence UI | FRONTEND_PARTIAL |
| Plan/Event occurrence link | PRODUCT_DECISION_REQUIRED |

## 13. Evidence

| Item | Evidence | Status |
|---|---|---|
| Task completion state | `planner_task_fulfillments` transitions in `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:629-899` | BACKEND_COMPLETE |
| Verification state | Same migration, verify/request correction/resubmit/reopen | BACKEND_COMPLETE |
| Who can verify | `task.verify` capability checked at `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:751-755` | BACKEND_COMPLETE |
| Self-verification ban | `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql:756-759` | BACKEND_COMPLETE |
| Evidence image/table | No DB/storage artifact found tied to task fulfillment | BACKEND_MISSING |
| Attachments temporary for drafts | No draft attachment table/bucket found | BACKEND_MISSING |
| Retention for evidence | No evidence model found | PRODUCT_DECISION_REQUIRED |

Gap flow:

```text
Task completed -> state exists
image/evidence -> missing
in review -> awaiting_verification exists
another person verifies -> exists with self-verification guard
approve/correction -> exists as verify/request_correction/resubmit
```

## 14. Attention

Backend Attention sources:

| Reason | Evidence | Entity | Status |
|---|---|---|---|
| `task_awaiting_verification` | `backend/src/services/planner.attention.service.js:14-15,96-135` | Task | BACKEND_CONNECTED |
| `task_correction_requested` | `backend/src/services/planner.attention.service.js:15,184-186` | Task | BACKEND_CONNECTED |
| `event_rsvp_required` | `backend/src/services/planner.attention.service.js:16,265-302` | Event | BACKEND_CONNECTED |
| `plan_blocker` | `backend/src/services/planner.attention.service.js:17,201-221` | Current Plan | BACKEND_CONNECTED |
| `plan_review_required` | `backend/src/services/planner.attention.service.js:18,236-252` | Current Plan | BACKEND_CONNECTED |

Gaps:

| Gap | Status |
|---|---|
| Frontend action contract per item | NEEDS_RUNTIME_VALIDATION |
| Whether “Verificar” and “Abrir” execute distinct handlers | NEEDS_RUNTIME_VALIDATION |
| Result invalidates/removes attention item | NEEDS_RUNTIME_VALIDATION |
| Dismiss/snooze | PRODUCT_DECISION_REQUIRED |

## 15. Activity

| Item | Evidence | Status |
|---|---|---|
| Legacy activity table | `supabase/migrations/20260713005000_create_planner_activity_log.sql:5-16` | BACKEND_COMPLETE for legacy log |
| Entity types | `supabase/migrations/20260713005000_create_planner_activity_log.sql:18-20` allows `task`, `event`, `goal`, `milestone` only | LEGACY_ONLY |
| Actor/timestamp/entity/metadata | `supabase/migrations/20260713005000_create_planner_activity_log.sql:7-16` | BACKEND_COMPLETE |
| Activity route | `backend/src/routes/planner.js:40` | BACKEND_CONNECTED |
| Service reads legacy table | `backend/src/services/planner.activity.service.js:136,181` | BACKEND_CONNECTED |
| Current Plan graph activity | Plan graph writes use separate operation/audit paths; legacy activity table does not include `plan` | BACKEND_PARTIAL / SPLIT |
| Activity Detail | No dedicated Activity Detail route was confirmed in navigation contract | FRONTEND_MISSING |

Gap flow:

```text
Activity row -> Activity list exists
Activity Detail -> missing
Open related entity actions -> direct entity navigation only, needs product contract
```

## 16. Retention

| State | Visible where | Recoverable | Auto-hide | Auto-archive | TTL | Hard delete | Blocks purge | Decision pending |
|---|---|---|---|---|---|---|---|---|
| Task cancelled | Tasks/filters depending frontend | Reactivate route exists | Yes from active lists | Not implemented | None | None | Activity/history/Plan links | Cancelled retention |
| Event cancelled | Events/Calendar depending filters | Reactivate route exists | Yes from scheduled lists | Not implemented | None | None | Recurrence/participants/activity | Cancelled retention |
| Plan closed | Plan list/detail | Reopen exists | Depends filters | Archive possible only terminal | None | None | Structure/history/links | Archive semantics |
| Draft active | Draft screens/recover | Continue/discard | No auto-hide confirmed | N/A | No live TTL | No purge confirmed | Owner payload/preset source | Draft TTL 30 days candidate |
| Draft trashed | Draft trash | Restore within window | Trash surface | N/A | 30 days | No hard delete route confirmed | None known | Cleanup job |
| Trash item Task/Event/Goal legacy | Planner Trash | Restore routes | Hidden from active lists | N/A | None | No hard delete route confirmed | Activity/links/recurrence | Trash retention |
| Archived Plan | Plan archive/list filters | Unarchive | Hidden from active list | Manual | None | None | Activity/links/history | Archive policy |
| Preset archived | No archive; trash exists | Restore if trashed | N/A | No archive | Trash TTL 30 days | No hard delete route confirmed | Revisions/drafts | Preset archive absent |
| Evidence | No evidence model | N/A | N/A | N/A | N/A | N/A | N/A | Evidence product/DB |
| Activity record | Activity endpoint | No | No | N/A | None | None | Historical audit | Retention policy |

## 17. Gap Matrix

| Area | What exists | Connected | Gap |
|---|---|---|---|
| Tasks | Rich V0/V1 task + fulfillment backend | Yes | Plan link and evidence missing |
| Events | Strong Event V1 backend | Mostly | Frontend recurrence runtime and Plan final event binding need validation |
| Goals | Useful V1 legacy root | Yes | Conflicts with Current Plan root |
| Plans | Strong Current graph and reliability | Partially | Low utility UX, external links unbound, Home mismatch |
| Presets | Tables/routes/payloads/revisions | Partial | Real create flow application and multi-entity presets need stress test |
| Drafts | Tables/routes/autosave/recover | Partial | Dirty-leave UX, live TTL, cleanup, attachments missing |
| Search | Current task/event/plan active search | Connected | Legacy Goal compatibility unresolved |
| Attention | Current task/event/plan attention | Backend connected | Frontend actions need validation |
| Activity | Legacy activity table | Backend connected | Current Plan graph not in same model; no Activity Detail |
| Trash | Recoverable trash for many entities | Connected partially | TTL/hard delete semantics inconsistent |
| Archive | Plan terminal archive only | Partial | Capability/runtime reachability needs validation |
| Reliability | Current authority | Connected | REC-0A instrumentation tracks duplicate composition/lifecycle issues |

## 18. Decision Register

| Decision | State | Evidence / reason |
|---|---|---|
| Root Plan | PROVISIONAL | Current `planner_plans` is canonical, but legacy Goals still productive and Home-projected |
| Retirement of Goal | NEEDS_PRODUCT_STRESS_TEST | Goal remains useful and connected; cannot remove by name alone |
| Combined progress | NEEDS_PRODUCT_STRESS_TEST | No universal percentage; separate indicators exist |
| General percentage | REJECTED unless explicit future rule | `planner_plan_indicators` has separate counts at `supabase/migrations/20260722040000_m11_3a_plan_graph_foundation.sql:677-704` |
| Manual conditions | NEEDS_PRODUCT_STRESS_TEST | Backend exists; product role overlaps other entities |
| Task link | NEEDS_DB_VALIDATION | External requirement unbound; legacy `goal_id` points to Goals |
| Event link | NEEDS_DB_VALIDATION | External requirement unbound; final event lacks FK |
| Principal/supporting | PROVISIONAL | `classification` supports necessary/supporting, but principal/secondary semantics not fully named |
| Effect metadata | NEEDS_PRODUCT_STRESS_TEST | No current link metadata for contributes/context/block/date/final |
| Final event | NEEDS_DB_VALIDATION | `finalization_kind='event'` exists without binding |
| HomePlus presets | DECIDED | Not editable/trashable through mutable RPCs |
| Personal/household presets | PROVISIONAL | Backend mutable with scope/capability; UI stress needed |
| Draft entry | NEEDS_PRODUCT_STRESS_TEST | Direction says show compatible draft choice, UI not decided |
| Draft TTL | NEEDS_DB_VALIDATION | Trash TTL exists; live draft TTL missing |
| Cancelled retention | NEEDS_PRODUCT_STRESS_TEST | Reversible cancellation exists; no TTL/hard delete rule |
| Archive | NEEDS_RUNTIME_VALIDATION | Plan archive DB exists, capability may block |
| Trash | NEEDS_PRODUCT_STRESS_TEST | Recoverable trash exists; retention inconsistent |
| Evidence | NEEDS_DB_VALIDATION | Verification states exist; evidence artifact model absent |
| Activity Detail | NEEDS_PRODUCT_STRESS_TEST | No route confirmed |
| Attention actions | NEEDS_RUNTIME_VALIDATION | Backend sources exist; action handlers need validation |
| Recurrence scope | NEEDS_RUNTIME_VALIDATION | Backend exposes scopes; frontend/runtime not fully validated |
| Forms | NEEDS_PRODUCT_STRESS_TEST | V1 fluidity vs Current safety unresolved |
| Plan create | PROVISIONAL | Minimal create-base is Current direction, but utility journey incomplete |
| Plan completion | PROVISIONAL | Human transition with blockers exists; UX confirmations pending |

## 19. Blockers

| Blocker | Type | Impact |
|---|---|---|
| Home legacy Goal navigates to Current Plan detail using a Goal ID | PRODUCT/RUNTIME | Produces “Plan no encontrado” |
| External Task/Event requirements unbound in M11.3A | DB | Cannot model real Plan-Task/Event link yet |
| Evidence attachments missing | DB/PRODUCT | Verification with image cannot ship end-to-end |
| Draft live TTL missing | DB | 30-day draft expiration cannot be enforced yet |
| Activity model split | BACKEND | Current Plan graph actions are not in legacy `planner_activity_log` entity type set |
| REC-0A instrumentation dirty state | SAFETY | Must not be included in docs commit |
| Runtime validation not executed | RUNTIME | Frontend behavior for Attention, recurrence scopes, preset/draft flows remains unproven |

## 20. Inputs For 0B

0B should stress test product decisions before implementation:

| Input | Why |
|---|---|
| Legacy Goal migration/compatibility strategy | Home and V1 functionality still depend on Goals |
| Plan-Task and Plan-Event link model | Current external requirements are not sufficient alone |
| Link metadata | Importance and effect are separate product dimensions |
| Manual Condition role | Must prove value beyond Task/Milestone/Requirement/Measurement |
| Draft entry UX | Continue existing compatible draft vs create new must be tested |
| Preset application modes | Direct apply, duplicate, review, draft, multi-entity generation |
| Evidence artifact model | Verification with image needs DB/storage/RLS/retention design |
| Attention action contract | Buttons must call distinct handlers and resolve queue state |
| Activity Detail | Need row detail vs direct entity navigation decision |
| Retention policy | Cancelled, trash, draft, evidence, activity differ and need explicit rules |
