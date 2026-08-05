# PLANNER FINAL PRODUCT AND EXECUTION BLUEPRINT

STATUS: `PHASE_0_DRAFT — NOT FROZEN`

This document is an initial Phase 0A skeleton. It records confirmed evidence, already-approved decisions, open questions, and links to audits. It does not freeze unresolved product decisions and must not be treated as a Phase 1 implementation plan.

## 1. Vision

Planner final product should recover the practical daily usefulness of V1 while keeping Current architecture as authority for safety, scopes, reliability, idempotency, permissions, and modern contracts.

Confirmed direction:

| Direction | Evidence |
|---|---|
| V1 is daily-flow authority | `PLANNER_V1_FIRST_PORT_MANIFEST.md` |
| Current is architecture authority | `PLANNER_V1_FIRST_PORT_MANIFEST.md` |
| Final product combines both | `PLANNER_PHASE_0A_EVIDENCE_AND_DECISION_MAP.md` |

Open questions:

| Question | Status |
|---|---|
| How aggressively legacy Goals should be migrated or retained during transition | NEEDS_PRODUCT_STRESS_TEST |
| Whether Plan creation remains minimal create-base or introduces richer guided presets/drafts | NEEDS_PRODUCT_STRESS_TEST |

## 2. Principles

| Principle | Status |
|---|---|
| Do not infer product completion from existing backend tables | DECIDED |
| Do not infer absence from legacy naming | DECIDED |
| Do not restore unsafe V1 contracts wholesale | DECIDED |
| No universal fake Plan percentage | PROVISIONAL/REJECTED unless explicitly re-approved |
| Reliability/idempotency are mandatory for writes | DECIDED |
| Personal data is owner-only unless explicitly shared | DECIDED |
| HomePlus original presets are immutable | DECIDED |

## 3. Glossary

| Term | Meaning | Status |
|---|---|---|
| Goal | Legacy root stored in `planner_goals`; still productive in Home and legacy routes | LEGACY_PRODUCTIVE |
| Plan | Current canonical root stored in `planner_plans` | CURRENT_AUTHORITY |
| Milestone | Plan-owned outcome node | CLEAR_PRODUCT_ROLE |
| Measurement | Plan-owned numeric target node with history | CLEAR_PRODUCT_ROLE, NEEDS_STRESS_TEST |
| Requirement | Necessary/supporting blocker or wrapper, including hierarchy | CLEAR_PRODUCT_ROLE, NEEDS_STRESS_TEST |
| Manual Condition | Binary human checkpoint | PRODUCT_DECISION_REQUIRED |
| Preset | Reusable template payload and revisions | BACKEND_EXISTS |
| Draft | Owner-only in-progress payload | BACKEND_EXISTS |
| Attention | Action queue for items requiring intervention | BACKEND_PARTIAL/FRONTEND_VALIDATION_PENDING |
| Activity | Chronological history/audit feed | LEGACY/CURRENT_SPLIT |

## 4. Tasks

Confirmed evidence:

| Area | Confirmed |
|---|---|
| DB | `planner_tasks` exists with status, priority, category, dates, verification, actor fields |
| Fulfillment | Assignment, complete, verify, correction, resubmit, revert, reopen exist |
| Self-verification | Prohibited by backend |
| Legacy Plan link | `planner_tasks.goal_id` points to `planner_goals`, not `planner_plans` |
| Evidence images | Missing |

Open questions:

| Question | Status |
|---|---|
| How Task links to Plan should be stored | NEEDS_DB_VALIDATION |
| Whether one Task can belong to multiple Plans | NEEDS_PRODUCT_STRESS_TEST |
| How cancelled linked Tasks affect Plan progress/readiness | NEEDS_PRODUCT_STRESS_TEST |
| Evidence artifact model for verification | NEEDS_DB_VALIDATION |

References:

| Source |
|---|
| `PLANNER_PHASE_0A_EVIDENCE_AND_DECISION_MAP.md#3-inventory-tasks` |
| `PLANNER_PHASE_0_STRESS_TEST_CATALOG.md` scenarios 1, 7, 9, 19, 21 |

## 5. Events

Confirmed evidence:

| Area | Confirmed |
|---|---|
| DB | Event V1 adds personal/household scope, lifecycle, all-day/timed scheduling, timezone, location payload |
| Recurrence | Series table, recurrence rule, occurrence identity, available edit scopes exist |
| Participants | RSVP and attendance tables exist |
| Calendar | Calendar endpoint exists |
| Plan link | Direct Plan FK is missing; external requirement is unbound |

Open questions:

| Question | Status |
|---|---|
| Does an Event contribute, contextualize, block, define date, or finalize a Plan? | NEEDS_PRODUCT_STRESS_TEST |
| Can a recurrent occurrence be linked to a Plan? | PRODUCT_DECISION_REQUIRED |
| How final Event binding should be stored | NEEDS_DB_VALIDATION |

References:

| Source |
|---|
| `PLANNER_PHASE_0A_EVIDENCE_AND_DECISION_MAP.md#4-inventory-events` |
| `PLANNER_PHASE_0_STRESS_TEST_CATALOG.md` scenarios 2, 5, 8, 10 |

## 6. Plans

Confirmed evidence:

| Area | Confirmed |
|---|---|
| Canonical root | `planner_plans` is Current root |
| Lifecycle | draft, active, paused, completed, closed; trash and terminal-only archive exist |
| Graph | Milestones, measurements, manual conditions, requirements exist |
| Activation | Useful structure required before activation |
| Legacy bridge | `planner_plan_legacy_goal_links` exists but is not automatic migration |

Open questions:

| Question | Status |
|---|---|
| How to resolve Home legacy Goal navigation | BLOCKED_FOR_PRODUCT_DECISION |
| Whether Plan Detail should support legacy fallback for unmapped Goals | NEEDS_PRODUCT_STRESS_TEST |
| Scope editing after create | DEFERRED |
| Confirmation model for unresolved completion | NEEDS_PRODUCT_STRESS_TEST |

References:

| Source |
|---|
| `PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md` |
| `PLANNER_V1_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_REPORT.md` |
| `PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md` |
| `PLANNER_PHASE_0A_EVIDENCE_AND_DECISION_MAP.md#5-inventory-goals-and-plans` |

## 7. Relationships

Confirmed evidence:

| Relationship | Evidence status |
|---|---|
| Task -> legacy Goal | Connected via `planner_tasks.goal_id` |
| Task -> Current Plan | Not durably bound; external requirement is unbound |
| Event -> Current Plan | Not durably bound; external requirement is unbound |
| Plan -> legacy Goal | Bridge table exists, explicit mapping only |

Open questions:

| Question | Status |
|---|---|
| Whether importance and effect are separate link fields | NEEDS_PRODUCT_STRESS_TEST |
| Whether link effect includes contributes/context/blocks activation/blocks completion/defines date/final event | NEEDS_PRODUCT_STRESS_TEST |
| Whether link has lifecycle, trash/archive behavior, activity rows | NEEDS_DB_VALIDATION |

## 8. Plan Structure

Confirmed evidence:

| Structure | Status |
|---|---|
| Milestones | DB and P2A editor partial foundation exist |
| Measurements | DB exists; no complete product UI |
| Manual conditions | DB exists; product role unproven |
| Requirements | DB exists; hierarchy and satisfaction functions exist; UX unscoped |
| External requirements | Exists but unbound in M11.3A |

Open questions:

| Question | Status |
|---|---|
| How much requirement hierarchy should be exposed | NEEDS_PRODUCT_STRESS_TEST |
| Whether manual conditions survive as product surface | NEEDS_PRODUCT_STRESS_TEST |
| Whether measurements should be first-class in recovered Detail | NEEDS_PRODUCT_STRESS_TEST |

## 9. Progress

Confirmed evidence:

| Progress form | Status |
|---|---|
| Milestone count | Exists |
| Measurement reached | Exists |
| Requirement satisfaction | Exists |
| Manual condition satisfaction | Exists |
| Universal percentage | Not present in Current indicators |
| Task/Event contribution | Not defined for Current Plan |

Open questions:

| Question | Status |
|---|---|
| Should any combined progress exist | NEEDS_PRODUCT_STRESS_TEST |
| How verified-required Tasks count | NEEDS_PRODUCT_STRESS_TEST |
| Whether target date lateness affects completion | PRODUCT_DECISION_REQUIRED |

## 10. Lifecycles

Confirmed evidence:

| Entity | Existing lifecycle evidence |
|---|---|
| Task | pending, completed, awaiting_verification, verified, cancelled, trashed |
| Task fulfillment | pending, completed, awaiting_verification, correction_requested, verified |
| Event | draft, scheduled, cancelled, trash; series active/paused/finalized/trash |
| Plan | draft, active, paused, completed, closed, archive/trash metadata |
| Preset | revision states draft/published/superseded; trash metadata |
| Draft | live/autosaved, trashed/restored/discarded |

Open questions:

| Question | Status |
|---|---|
| Cancelled auto-hide vs archive vs hard delete | NEEDS_PRODUCT_STRESS_TEST |
| Plan archive UX and capability reachability | NEEDS_RUNTIME_VALIDATION |
| Draft expiration lifecycle | NEEDS_DB_VALIDATION |

## 11. Presets

Confirmed decisions:

| Decision | Status |
|---|---|
| HomePlus original presets are not edited | DECIDED |
| HomePlus original presets are not deleted/trashed/archived | DECIDED |

Confirmed evidence:

| Area | Status |
|---|---|
| Tables/routes | Exist for presets, revisions, prepare, trash/restore |
| Entity types | task, event, plan |
| Sources | homeplus, personal, household |
| Personal/household mutability | Backend supports with permission checks |

Open questions:

| Question | Status |
|---|---|
| Direct apply vs review before create vs create draft | NEEDS_PRODUCT_STRESS_TEST |
| Multi-entity Plan preset generation | NEEDS_PRODUCT_STRESS_TEST and NEEDS_DB_VALIDATION |
| Inline suggestions in Quick Create | NEEDS_PRODUCT_STRESS_TEST |

## 12. Drafts

Confirmed evidence:

| Area | Status |
|---|---|
| Owner-only drafts | Exists |
| Entity types | task, event, plan |
| Autosave | Exists |
| Source preset linkage | Exists |
| Trash retention | 30 days when trashed |
| Live draft expiry | Missing |
| Temporary attachments | Missing |

Open questions:

| Question | Status |
|---|---|
| Entry UX when compatible Draft exists | NEEDS_PRODUCT_STRESS_TEST |
| Live TTL 30 days | NEEDS_DB_VALIDATION |
| Cleanup/hard delete job | NEEDS_DB_VALIDATION |
| Offline draft behavior | PRODUCT_DECISION_REQUIRED |

## 13. Forms

Confirmed evidence:

| Form path | Status |
|---|---|
| V1 Task/Event/Goal forms | Useful reference for fluency |
| Current Plan create-base | Safe but low utility until coherent Detail journey exists |
| Preset/Draft form integration | Partial |
| Plan structure editor | P2A milestone-only foundation partial |

Open questions:

| Question | Status |
|---|---|
| What is the final quick-create journey for Task/Event/Plan | NEEDS_PRODUCT_STRESS_TEST |
| Which fields are required at creation vs later | NEEDS_PRODUCT_STRESS_TEST |
| How selected date/Plan/context prefill should reduce friction | NEEDS_PRODUCT_STRESS_TEST |

## 14. Verification/Evidence

Confirmed evidence:

| Area | Status |
|---|---|
| Verification states | Exist |
| Correction/resubmit | Exists |
| Self-verification guard | Exists |
| Evidence image/storage | Missing |
| Evidence retention | Missing |

Open questions:

| Question | Status |
|---|---|
| Evidence table/bucket/RLS shape | NEEDS_DB_VALIDATION |
| Thumbnails/offline upload/temporary drafts | PRODUCT_DECISION_REQUIRED |
| Retention after Task trash/archive/activity | PRODUCT_DECISION_REQUIRED |

## 15. Attention

Confirmed evidence:

| Source | Status |
|---|---|
| Task awaiting verification | Backend source exists |
| Task correction requested | Backend source exists |
| Event RSVP required | Backend source exists |
| Plan blocker | Backend source exists |
| Plan review required | Backend source exists |

Open questions:

| Question | Status |
|---|---|
| Distinct action contract for Verify/Open/Resolve | NEEDS_RUNTIME_VALIDATION |
| Dismiss/snooze | PRODUCT_DECISION_REQUIRED |
| Badge clearing semantics | NEEDS_PRODUCT_STRESS_TEST |

## 16. Activity

Confirmed evidence:

| Area | Status |
|---|---|
| Legacy activity log | Exists for task/event/goal/milestone |
| Current Plan graph activity | Split into separate operation/audit paths |
| Activity endpoint | Exists |
| Activity Detail | Missing/not confirmed |

Open questions:

| Question | Status |
|---|---|
| Unified activity model vs legacy/current split | NEEDS_DB_VALIDATION |
| Activity Detail route and DTO | NEEDS_PRODUCT_STRESS_TEST |
| Personal privacy redaction | NEEDS_PRODUCT_STRESS_TEST |

## 17. Archive/Trash

Confirmed evidence:

| Area | Status |
|---|---|
| Task/Event/Goal trash | Exists, recoverable, no TTL confirmed |
| Plan trash | Exists in Current Plan graph |
| Plan archive | Terminal-only DB constraint exists |
| Preset/Draft trash | 30 day retention exists |
| Permanent delete / Empty Trash | Not implemented as productive surface |

Open questions:

| Question | Status |
|---|---|
| Trash TTL per entity | NEEDS_PRODUCT_STRESS_TEST |
| Hard delete blockers and historical preservation | NEEDS_DB_VALIDATION |
| Archive entry points and Search visibility | NEEDS_PRODUCT_STRESS_TEST |

## 18. Retention

Confirmed evidence:

| Retention area | Status |
|---|---|
| Draft trash | 30 days |
| Preset trash | 30 days |
| Task/Event/Goal trash | No TTL found |
| Plan archive/trash | No TTL found |
| Activity | No TTL found |
| Evidence | No model found |

Open questions:

| Question | Status |
|---|---|
| Should cancelled items auto-hide, auto-archive, expire, or persist historically | NEEDS_PRODUCT_STRESS_TEST |
| Should Draft live TTL be 30 days | NEEDS_DB_VALIDATION |
| How purge handles references | NEEDS_DB_VALIDATION |

## 19. Navigation

Confirmed evidence:

| Item | Status |
|---|---|
| Canonical semantic PlanDetail route maps to physical `GoalDetail` | Confirmed |
| Home passes legacy `goalId` to `GoalDetail` | Confirmed |
| Search uses Current `plan` destinations | Confirmed |
| Ambiguity between Goal/Plan routes | Confirmed |

Open questions:

| Question | Status |
|---|---|
| Route resolver for legacy Goal IDs | NEEDS_PRODUCT_STRESS_TEST |
| Whether separate GoalDetail and PlanDetail physical route names should be introduced | PRODUCT_DECISION_REQUIRED |
| Deep link behavior for unmapped legacy Goals | NEEDS_RUNTIME_VALIDATION |

## 20. Privacy

Confirmed evidence:

| Area | Status |
|---|---|
| Plan personal/household shape | Exists |
| Event personal/household shape | Exists |
| Draft owner-only | Exists |
| Preset source permissions | Exists |
| Legacy Goal personal visibility | Exists but household_id is still required |

Open questions:

| Question | Status |
|---|---|
| How legacy Goal personal visibility maps to Current Plan personal scope | NEEDS_DB_VALIDATION |
| How Activity redacts personal content | NEEDS_PRODUCT_STRESS_TEST |
| Cache invalidation on household switch | NEEDS_RUNTIME_VALIDATION |

## 21. Reliability

Confirmed evidence:

| Area | Status |
|---|---|
| PlannerMutationIntent | Current authority |
| Reliability runtime | Current authority |
| Idempotency and replay | Current authority |
| Single-flight | Required and partially implemented |
| REC-0A trace | Preexisting instrumentation must be preserved, not committed in docs-only batch |

Open questions:

| Question | Status |
|---|---|
| Duplicate lifecycle/adapter execution root cause | REC-0A/NEEDS_RUNTIME_VALIDATION |
| Multi-entity preset atomicity | NEEDS_DB_VALIDATION |
| Offline queue vs draft-only recovery | PRODUCT_DECISION_REQUIRED |

## 22. Legacy Migration

Confirmed evidence:

| Area | Status |
|---|---|
| Legacy Goals remain productive | Confirmed |
| Home still projects legacy Goal | Confirmed |
| Current Plan list reads `planner_plans` | Confirmed |
| Bridge table exists | Confirmed, explicit mapping only |
| Task `goal_id` points to legacy Goal | Confirmed |

Open questions:

| Question | Status |
|---|---|
| Migration strategy for existing Goals | NEEDS_DB_VALIDATION |
| UI fallback for unmapped Goals | NEEDS_PRODUCT_STRESS_TEST |
| Task link migration from `goal_id` to Plan link | NEEDS_DB_VALIDATION |

## 23. Stress Tests

Phase 0B must use:

| Catalog |
|---|
| `docs/implementation/planner/PLANNER_PHASE_0_STRESS_TEST_CATALOG.md` |

Minimum scenario groups:

| Group | Scenarios |
|---|---|
| Daily flow | 1, 6, 14, 15 |
| Plan complexity | 2, 3, 9, 10, 11, 12, 13 |
| Presets/Drafts | 16, 17, 18, 22 |
| Reliability | 27, 28 |
| Legacy split | 29, 30 |
| Retention | 20, 21, 23 |

## 24. Execution

Execution is not frozen in 0A.

Provisional sequencing constraints:

| Constraint | Status |
|---|---|
| Do not implement Phase 1 before 0B decisions | DECIDED |
| Do not modify production code in 0A | DECIDED |
| Do not migrate Goals until product/DB decision | DECIDED |
| Do not add evidence storage before evidence model decision | DECIDED |
| Keep Current Reliability for all writes | DECIDED |

Potential phases to define later:

| Phase | Status |
|---|---|
| 0B Product stress tests and decision register update | NEXT |
| 0C DB/backend validation for selected decisions | DEFERRED |
| 1+ Implementation lots | BLOCKED until 0B/0C |

## 25. Definition of Done

This Definition of Done is a draft checklist, not a frozen release gate.

Planner final product should eventually satisfy:

| Requirement | Status in 0A |
|---|---|
| Home never navigates legacy Goal IDs into Current Plan Detail without resolution | OPEN |
| Tasks can be created, assigned, completed, verified, corrected, cancelled, restored | PARTIAL/EXISTS |
| Events support practical recurrence and occurrence edits | BACKEND_EXISTS, RUNTIME_OPEN |
| Plans recover useful V1 daily flows while using Current Plan root | OPEN |
| Plan-Task/Event links have clear metadata for importance and effect | OPEN |
| Presets are useful and HomePlus originals immutable | PARTIAL |
| Drafts support dirty-leave, continuation, discard, TTL decision | PARTIAL |
| Evidence verification works end-to-end | OPEN |
| Attention actions are distinct and resolve correctly | OPEN |
| Activity Detail exists or is explicitly rejected | OPEN |
| Archive/Trash/Retention are explicit per entity | OPEN |
| Privacy/scopes are enforced across Home/Search/Attention/Activity | OPEN |
| Reliability prevents duplicate writes and supports replay | PARTIAL/CURRENT_AUTHORITY |
