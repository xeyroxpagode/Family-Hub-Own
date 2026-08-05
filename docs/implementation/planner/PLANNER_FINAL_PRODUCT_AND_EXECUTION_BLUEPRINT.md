# PLANNER FINAL PRODUCT AND EXECUTION BLUEPRINT

STATUS: `PHASE_0_PRODUCT_MODEL_PROPOSED — NOT FROZEN`

This document records confirmed evidence, already-approved decisions, Phase 0B product recommendations, open technical validations, and deferred items. It does not freeze unresolved product decisions and must not be treated as a Phase 1 implementation plan.

## 0. Phase 0B Product Model Summary

Phase 0B executed product stress tests across daily, complex, extreme, migration, retention, draft, preset, verification, Attention, and Activity scenarios.

Authoritative result document:

| Source | Status |
|---|---|
| `docs/implementation/planner/PLANNER_PHASE_0B_PRODUCT_STRESS_TEST_RESULTS.md` | `PLANNER_PHASE_0B_PRODUCT_STRESS_TESTS_COMPLETE` |

### Confirmed Evidence

| Area | Evidence |
|---|---|
| Plan root | Current `planner_plans` is canonical root; legacy `planner_goals` remains productive and must be migrated/resolved safely |
| Reliability | Current mutation identity, idempotency, replay, and single-flight remain mandatory for writes |
| Plan graph | Current supports milestones, measurements, manual conditions, requirements, lifecycle, trash, archive metadata |
| Tasks | Task fulfillment, verification, correction, self-verification guard, cancellation, trash/restore exist; image evidence model is missing |
| Events | Event V1 supports scope, timezone, recurrence series/occurrence identity, participants, RSVP; Plan binding remains incomplete |
| Presets/Drafts | Backend tables/routes exist; HomePlus immutability exists; live Draft TTL and temporary attachments are missing |
| Attention | Backend sources exist; frontend action semantics need runtime validation |
| Activity | Legacy activity exists; Current Plan graph activity/detail is split/missing |
| Retention | Draft/Preset trash TTL exists; Task/Event/Goal/Plan trash TTL/hard purge policy is inconsistent or missing |

### Decided By User

| Decision |
|---|
| Plan will be the future root |
| V1 is the baseline for practical fluency |
| Current remains authority for Reliability, security, mutation identity, idempotency, replay, scopes, permissions, Plan graph, and canonical contracts |
| Progress must not be isolated by a single mode |
| HomePlus original Presets are immutable |
| Draft is not Trash or Archive |
| Draft must have expiration |
| Verification must be able to use images |
| Activity needs its own Detail |
| Attention primary action and Open are distinct actions |
| Recurrence distinguishes series and occurrence |
| Product Freeze precedes implementation |

### Recommended For Approval

| Topic | Recommendation |
|---|---|
| Plan model | Plan is a flexible root combining Tasks, Events, Milestones, Measurements, and Requirements; it is not a single-mode progress entity |
| Progress | Hybrid model: qualitative summary, primary resolved count, specific indicators, percentage only for natural Measurements |
| Task/Event links | Use two dimensions per Plan link: importance (`principal`/`de apoyo`) and effect (`contributes`, `context`, `blocks_activation`, `blocks_completion`, `defines_date`, `final_event`) |
| Manual Condition | Do not expose as a default visible product surface; keep internal/migration-only unless DB validation proves a visible need |
| Plan lifecycle | Keep Draft, Active, Paused, Completed, Closed; treat Blocked/At risk/Ready to complete as projections |
| Task lifecycle | Use human labels and make verification/correction explicit; verified-required Tasks count only when verified |
| Event lifecycle | Do not add a universal Event `realizado`; Plan contribution is link-effect-specific |
| Presets | Task presets inline/prefill, Event presets prefill, Plan presets produce reviewable Draft blueprints |
| Drafts | Contextual sheet/banner recovery plus secondary central recovery; 30-day live TTL renewed on edit |
| Forms | Context-specific quick forms with progressive advanced fields; Plan uses create-base -> Detail |
| Evidence | Evidence belongs to completion attempts, not a mutable Task root field |
| Attention | Primary action resolves the issue; Open navigates separately |
| Activity Detail | Dedicated privacy-safe detail surface with redacted metadata and separate navigation actions |
| Retention | Cancelled, Completed, Closed, Archive, Trash, Draft expiration, Evidence, and Activity use different domain rules |
| Legacy migration UX | Target one Current Plan root with automatic/guided Goal migration and temporary safe route resolver |

### Open Technical Validation

| Topic | Validation required |
|---|---|
| Task-only and Event-only Plan activation | DB validation: Current activation currently requires Milestone, Measurement, or Manual Condition |
| Plan-Task link | DB validation: durable binding, per-link importance/effect, cross-Plan cardinality, satisfaction from Task lifecycle |
| Plan-Event link | DB validation: durable binding, final Event FK/reference, recurrence occurrence identity |
| External Requirement use | DB validation: whether it can carry link semantics or dedicated link table is needed |
| Draft TTL | DB validation: live `expires_at`, cleanup job, warning projection |
| Draft attachments | DB/storage validation: temporary owner-only attachments |
| Evidence | DB/storage/RLS validation: attempts, files, thumbnails, upload queue, retention, downloads |
| Attention | Runtime validation: primary action vs Open handlers, stale item invalidation, permission loss |
| Activity | DB/runtime validation: Current Plan graph activity, Activity Detail DTO, redaction |
| Archive/Trash | DB/runtime validation: archive capability reachability, TTL, purge blockers, restore behavior |
| Legacy migration | DB/runtime validation: bridge creation, Home route resolver, task link migration, Search/Home consistency |
| Offline | Runtime validation: Draft/evidence/reliability replay and uncertain state copy |

### Deferred

| Topic | Reason |
|---|---|
| Scope editing after creation | Needs separate privacy and permission decision |
| Full requirement hierarchy UI | Not necessary for the default product model; flat blockers should ship first if approved |
| Generic dependency graph | Stress tests did not justify introducing dependencies beyond Requirements and link effects |
| Attention snooze/dismiss | Useful later but not required for the primary action queue contract |
| Universal weighted progress | Rejected for now; no deferred implementation without explicit future approval |

### Phase 0B Rejected Options

| Option | Classification | Reason |
|---|---|---|
| Universal Plan percentage | `FAIL_MISLEADING` | Combines incompatible units and hides blockers |
| Weighted progress | `FAIL_TOO_COMPLEX` | Requires configuration and creates false precision |
| Visible Manual Condition default editor | `FAIL_REDUNDANT` | Duplicates Milestone, Requirement, Task, and Measurement |
| One long universal create form | `FAIL_TOO_COMPLEX` | Slows daily actions and ignores context |
| Immediate Plan creation from Preset | `FAIL_UNSAFE` | Multi-entity generation can orphan data without preview/atomicity |
| Long-term visible Goal/Plan double root | `FAIL_MISLEADING` | Duplicates user objectives and breaks navigation semantics |
| Mutable single Task evidence field | `FAIL_UNSAFE` | Cannot preserve correction attempts/history safely |

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

Execution is not frozen after 0B.

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
| 0B Product stress tests and decision register update | COMPLETE |
| 0C/0D DB/backend/runtime validation for selected decisions | NEXT |
| Product Freeze | BLOCKED until technical validation and user approval |
| 1+ Implementation lots | BLOCKED until Product Freeze |

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
