# HOMePLUS Planner P2.1 — Responsibilities implementation report

Date: 2026-09-16  
Branch: `mvp/finance-planner-integration`  
Worktree: `C:\Users\thega\hpw\mvp-finance-planner`

## 1. CURRENT donors reused

- Canonical `planner_tasks`, assignment configs, assignees and fulfillments.
- Existing Task V0/V1 mutation and audit paths for completion, verification, claim/release and assignment replacement.
- Existing Planner request context, capability checks, idempotency headers and routing conventions.
- Frozen P1 components: `AppScreen`, `AppText`, `AppButton`, `ActionSheet`, `AppInput`, `FormActionRow`, `FilterChip`, `Row`, `EmptyState`, `ErrorState`, `Skeleton`, `Toggle`, `InteractivePressable`, `HomePlusIcon`, and `useAppTheme`.
- Existing Planner stack and Task Detail.

No Task recurrence engine, RRULE UI, new Planner tab, card family, or P2.2 Task-list redesign was introduced.

## 2. DB schema

- `planner_responsibilities`: household rule, lifecycle, assignment kind, normalized schedule, stable Task defaults, next sequence, adjustment reason and version.
- `planner_responsibility_members`: fixed/rotation members with authoritative order.
- `planner_responsibility_occurrences`: immutable Task link, sequence, scheduled local date, rotation slot and resolution.
- `planner_tasks.responsibility_id` and `responsibility_occurrence_sequence`: immutable origin projection.
- RLS scopes every table to active household membership.

## 3. Migration

`supabase/migrations/20260916000001_planner_responsibilities_p2_1.sql` is additive and later than the inspected migrations. It includes constraints, indexes, RLS, version trigger and the atomic materialization RPC. It was parsed/executed inside a local PostgreSQL transaction and rolled back successfully. It was not applied permanently because the existing local migration history diverges (remote-only `20260910000000..5`, local-only earlier P1 migrations); no reset or migration-history rewrite was attempted.

## 4. Responsibility contract

A Responsibility owns only the persistent WHAT/WHO/WHEN rule and stable future-Task defaults. Status, fulfillment, claim, evidence, correction, verification and actual runtime assignee remain canonical Task state.

## 5. ONE LIVE OCCURRENCE

A partial unique index allows at most one unresolved occurrence per Responsibility. Materialization locks the Responsibility row, checks for a live ledger row and creates one Task/ledger entry atomically. An overdue Task stays live; no next-day duplicate is created.

## 6. Schedule model

Supported normalized families: `daily`, `weekdays`, `interval`, `monthly`, and `after_completion`. The frontend exposes only Spanish family language. No RRULE is stored or displayed.

## 7. Calendar-based recurrence

Calendar schedules search strictly after the advancement date while preserving the original anchor. Daily, N-day, N-week, weekday sets and monthly day are supported. Missed slots are not materialized.

## 8. Completion-based recurrence

`after_completion` advances from the final Task resolution date. Days, weeks and months are supported.

## 9. Fixed assignment

One eligible member becomes the canonical members/shared-once Task assignment.

## 10. Fixed group assignment

Multiple eligible members are projected into canonical Task assignees with `shared_once`; no `each_person` behavior was added.

## 11. Rotation algorithm

Rotation uses ordered currently eligible members and the immutable occurrence sequence. The saved `rotation_slot_member_id` records the slot even when the concrete Task is replaced. Removed members are skipped; sequence never rolls back.

## 12. Claimable

Claimable generates canonical `assignment_kind=anyone`; existing Me encargo/Devolver flow remains the owner.

## 13. Unassigned

Unassigned generates canonical `legacy_unassigned` with no assignees, distinct from `anyone`.

## 14. Idempotency

DB uniqueness covers Responsibility+sequence, Responsibility+occurrence key, Task origin and one unresolved occurrence. The atomic RPC catches duplicate races. Frontend mutation keys are also sent using existing Planner transport conventions.

## 15. Materialization triggers

Materialization runs on:

- Responsibilities list/detail/create/update/resume reads or mutations;
- Tasks list reads (normal Planner entry);
- legacy Task complete/verify;
- every V1 Task fulfillment mutation, including complete/verify/correction/resubmit/reopen (only resolved states advance).

No cron/job infrastructure was introduced.

## 16. Pause/resume

Pause changes only the rule lifecycle. The current Task survives. Resume computes one current/future valid slot without backfill. Confirmation copy states that the current Task remains and no new Tasks are created while paused.

## 17. Archive/trash

Archive/trash stop future generation. Generated Tasks and origin ledger rows survive through `ON DELETE RESTRICT`. Unarchive/restore return the rule to active behavior without backfill.

## 18. Edit-from-next-occurrence semantics

PATCH changes only Responsibility configuration. The current Task is never patched. Edit UI says: “Los cambios se aplican desde la próxima tarea.”

## 19. Temporary replacement

“Cambiar responsable esta vez” calls the canonical Task assignment mutation for the current Task. Responsibility members/order and saved rotation slot are unchanged; the existing Task audit path records the assignment mutation.

## 20. Member eligibility

Every materialization loads active household members. Removed rotation members are skipped. Invalid fixed configuration blocks generation rather than selecting another person.

## 21. Requires-adjustment states

- Fixed invalid/missing: `Elegí un nuevo responsable.`
- Rotation with fewer than two active configured members: `La rotación necesita al menos 2 integrantes.`

The root groups these under `REQUIEREN AJUSTE` and shows the concrete reason.

## 22. Task origin linkage

Generated Tasks contain `responsibility_id`, monotonic `responsibility_occurrence_sequence`, generic Planner origin fields and a unique origin index. Task Detail shows a subtle Responsibility row linking back to Responsibility Detail. Responsibility Detail links the current/history rows to Task Detail.

## 23. Screens

- Tasks root: one flat Responsibilities entry after the utility toolbar.
- Responsibilities Root: quiet Active/Paused/Archived selector, flat rows and adjustment grouping.
- Create/Edit: primary WHAT/WHO/WHEN path, assignment/schedule sheets and collapsed details.
- Detail: recurring-rule summary, current Task link, configuration, recent projected Task history and lifecycle actions.

All styling uses P1 semantic runtime tokens; no Planner-local palette or Responsibility-specific component family was added.

## 24. Actual API routes

- `GET /api/planner/responsibilities`
- `POST /api/planner/responsibilities`
- `GET /api/planner/responsibilities/:id`
- `PATCH /api/planner/responsibilities/:id`
- `POST /api/planner/responsibilities/:id/pause`
- `POST /api/planner/responsibilities/:id/resume`
- `POST /api/planner/responsibilities/:id/archive`
- `POST /api/planner/responsibilities/:id/unarchive`
- `POST /api/planner/responsibilities/:id/trash`
- `POST /api/planner/responsibilities/:id/restore`
- `POST /api/planner/responsibilities/:id/current-task/replace-assignee`

## 25. Tests

`tests/planner_responsibilities_p2_1.test.js` contains R1–R30 focused cases. Results: 30/30 PASS.

Also passed:

- `npx tsc --noEmit --pretty false`
- `node --check` for all modified/new backend modules and seed
- `node tests/planner_e11_focal.test.js` (19/19)
- `node tests/planner_plans_v1_lifecycle_pure.test.js`
- PostgreSQL transactional parse/execution probe for the migration
- `git diff --check` (only pre-existing line-ending warnings)

## 26. Seed

The existing idempotent local QA seed now cleans/recreates the P2.1 tables and defines the requested living set: fixed, fixed group, rotation, claimable, unassigned, completion-based, paused and requires-adjustment. Current Tasks are materialized on the first authenticated Tasks/Responsibilities read. The seed was not run because the migration was not permanently applied for the migration-history reason above.

## 27. Android runtime

An Android emulator is connected and the installed HomePlus app is running, but its active Metro server points to `C:\Users\thega\Desktop\HomePlus`, not this worktree. The P2.1 migration/seed were not permanently applied. Therefore no P2.1 Android flow was claimed as verified.

## 28. Light/Dark

All new surfaces consume `useAppTheme` semantic tokens and P1 donors. Static TypeScript verification passed. Device Light/Dark visual verification remains pending with Android runtime.

## 29. Remaining P2.2 work

Only the explicitly deferred Task Territory polish remains: Task row hierarchy/density, filters, final Task Detail/Form polish and any decision about showing origin in list rows. P2.1 did not start that work.

## Reopen semantics

If occurrence A resolves and B is generated, reopening A does not clear A's ledger resolution, delete B, decrement sequence, or roll rotation backward. A is a historical exception and B remains the current occurrence.

## Verdict

| Area | Verdict |
|---|---|
| DOMAIN | PASS |
| ONE LIVE OCCURRENCE | PASS |
| FIXED | PASS |
| FIXED GROUP | PASS |
| ROTATION | PASS |
| CLAIMABLE | PASS |
| UNASSIGNED | PASS |
| DAILY | PASS |
| WEEKDAYS | PASS |
| INTERVAL | PASS |
| MONTHLY | PASS |
| COMPLETION-BASED | PASS |
| NO BACKLOG | PASS |
| VERIFICATION ADVANCEMENT | PASS |
| MATERIALIZATION | PASS |
| IDEMPOTENCY | PASS |
| PAUSE/RESUME | PASS |
| ARCHIVE/TRASH | PASS |
| EDIT SEMANTICS | PASS |
| TEMP REPLACEMENT | PASS |
| MEMBER ELIGIBILITY | PASS |
| REQUIRES ADJUSTMENT | PASS |
| TASK ORIGIN | PASS |
| ROOT UX | PASS |
| CREATE/EDIT UX | PASS |
| DETAIL UX | PASS |
| LIGHT | PENDING — Android visual QA not run |
| DARK | PENDING — Android visual QA not run |
| STATIC TESTS | PASS |
| ANDROID RUNTIME | PENDING — active runtime is another checkout |
| P2.1 OVERALL | PENDING — implementation/static evidence pass; Android runtime is required for overall PASS |

