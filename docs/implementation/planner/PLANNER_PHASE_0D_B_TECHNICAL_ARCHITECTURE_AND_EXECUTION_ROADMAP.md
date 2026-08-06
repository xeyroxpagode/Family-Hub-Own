# PLANNER PHASE 0D-B - TECHNICAL ARCHITECTURE AND EXECUTION ROADMAP

STATUS: `PHASE_0D_TECHNICAL_ARCHITECTURE_AND_ROADMAP_FROZEN - PHASE_0_FREEZE_PENDING`

RESULT: `PLANNER_PHASE_0D_TECHNICAL_ARCHITECTURE_AND_ROADMAP_FROZEN`

Phase 0D-B freezes the technical target architecture and execution roadmap required to implement the Planner product contract frozen in Phase 0C. It is a docs-only freeze. It does not authorize implementation, SQL, endpoints, components, migrations, Supabase execution, or runtime changes.

Implementation remains blocked until the user approves Phase 0 Freeze.

## 1. Safety, Scope, And Authority

| Item | Value |
|---|---|
| Active worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation` |
| Expected branch | `planner-v1-plans-reconciliation` |
| Initial HEAD | `b04c4d1` |
| V1 reference worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\reference-v1` |
| V1 ref | `f093bffaa7a7db6db7fc1b0072ba90352325a90a` |

Safety commands executed before writing:

```text
git branch --show-current -> planner-v1-plans-reconciliation
git rev-parse --short HEAD -> b04c4d1
git status --short ->
 M front/mi-front-limpio/components/planner/PlannerSheetHost.tsx
?? front/mi-front-limpio/services/planner/planCompositionTrace.ts
git log --oneline -8 -> HEAD b04c4d1 docs(planner): map phase 0d technical reality
```

Preexisting dirty state preserved and not modified:

| Path | State | Classification |
|---|---|---|
| `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | `M` | REC-0A instrumentation |
| `front/mi-front-limpio/services/planner/planCompositionTrace.ts` | `??` | REC-0A instrumentation helper |

Allowed write scope for this lot:

| Path | Action |
|---|---|
| `docs/implementation/planner/PLANNER_PHASE_0D_B_TECHNICAL_ARCHITECTURE_AND_EXECUTION_ROADMAP.md` | Create |
| `docs/implementation/planner/PLANNER_FINAL_PRODUCT_AND_EXECUTION_BLUEPRINT.md` | Update |

No code, DB, migration, test, Supabase state, V1 reference, or REC-0A instrumentation file is changed by this lot.

Authority hierarchy used:

| Priority | Source |
|---|---|
| 1 | Product contract frozen in Phase 0C |
| 2 | Runtime/manual evidence |
| 3 | Real Current code, DB, DTOs, and contracts |
| 4 | Phase 0D-A technical reality map |
| 5 | Recent reports |
| 6 | Tests |
| 7 | V1 and historical documents |

Current limitations are gaps only. They do not redefine product decisions.

## 2. Sources Read And Evidence Classification

Mandatory sources read completely:

| Source | Classification |
|---|---|
| `PLANNER_PHASE_0C_PRODUCT_CONTRACT_FREEZE.md` | `PRODUCT_FROZEN` authority |
| `PLANNER_PHASE_0D_A_TECHNICAL_REALITY_AND_DECISION_MAP.md` | technical map authority |
| `PLANNER_FINAL_PRODUCT_AND_EXECUTION_BLUEPRINT.md` | active Blueprint before 0D-B |
| `PLANNER_V1_FIRST_PORT_MANIFEST.md` | V1-first recovery and Current infrastructure map |
| `PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md` | graph and lifecycle evidence |
| `PLANNER_V1_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_REPORT.md` | structure changeset and activation matrix evidence |
| `PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md` | milestone editor checkpoint evidence |

Selective verification performed read-only:

| Area | Evidence |
|---|---|
| Reliability | `PlannerMutationIntent`, Reliability runtime, productive adapters, durable queue, single-flight exist |
| Attention/Activity | Current services are projection foundations with string reasons/events and limited entity coverage |
| Presets/Drafts | `planner_presets`, `planner_preset_revisions`, `planner_drafts` exist; live Draft expiry field is missing |
| Evidence | dedicated completion-attempt/evidence tables do not exist |
| Storage | Planner evidence bucket/upload queue/thumbnails do not exist |
| Tombstones/purge | `planner_tombstones` and retention purge jobs do not exist |
| Links | only external requirements exist today for Task/Event references; dedicated link tables do not exist |
| Goal bridge | `planner_plan_legacy_goal_links` exists |
| REC-0A | PlanCompositionTrace and PlannerSheetHost instrumentation exist as preexisting dirty state |

## 3. Decision Register

| Decision | Status | Frozen technical result |
|---|---|---|
| Plan root | `PRODUCT_FROZEN` | `planner_plans` remains canonical root; Goal becomes migration legacy only |
| Goal legacy | `TECHNICAL_FROZEN` | Use mapping/bridge/resolver until read and UI cutover complete |
| Manual Condition | `PRODUCT_FROZEN` | Legacy rows migrate only to Milestone; not to Requirement |
| Requirement | `TECHNICAL_FROZEN` | Independent mandatory gate with satisfy/annul/reset audit |
| Plan-Task | `TECHNICAL_FROZEN` | Dedicated canonical link table, not `task.goal_id` and not Requirement ownership |
| Plan-Event | `TECHNICAL_FROZEN` | Dedicated canonical link table with series/occurrence binding and final-event outcome |
| Prepared items | `TECHNICAL_FROZEN` | Plan-owned prepared tables materialized only by activation |
| Activation | `TECHNICAL_FROZEN` | One backend transaction validates, materializes, links, activates, logs Activity, returns graph |
| Progress | `PRODUCT_FROZEN` | Hybrid deterministic projection; no universal percentage |
| Completion | `PRODUCT_FROZEN` | Human transition only; readiness is projection |
| Reliability | `TECHNICAL_FROZEN` | Current Planner Reliability runtime is the only write runtime |
| Storage/evidence | `TECHNICAL_FROZEN` | New attempt/evidence/storage/upload queue architecture required |
| Retention/purge | `TECHNICAL_FROZEN` | Domain jobs plus minimal tombstones only when references require them |
| REC-0A | `RUNTIME_VALIDATION_REMAINING` | First implementation mini-lot must gather trace evidence before fix |

## 4. Contradiction Map And Resolution

| Contradiction | Resolution frozen in 0D-B |
|---|---|
| Current external requirements can link the same Task/Event from multiple Plans | Dedicated link tables enforce zero-or-one Task/Event Plan membership |
| Current `task.goal_id` points to Goal | Legacy read bridge only; no new Plan writes use it |
| Current activation accepts Manual Condition | Legacy Manual Condition is backfilled/bridged to Milestone before canonical activation cutover |
| Current completion uses `confirm_unresolved` | Replaced by audited Requirement annulment; compatibility bridge accepts old payload only during write cutover and records annulment semantics |
| Prepared Tasks/Events do not exist | Add Plan-owned prepared tables hidden from productive surfaces |
| Evidence is product-frozen but no tables/storage exist | Add completion attempts, evidence items, bucket, signed access, upload queue, cleanup |
| Draft retention only exists for trashed drafts | Add live Draft expiry, warning, cleanup, and owner-private attention |
| Goal and Plan can remain visible in parallel | Migration plus resolver and UI cutover removes Goal as final visible root |
| REC-0A duplicate execution cause is unknown | Architecture order makes REC-0A evidence and fix a prerequisite for activation work |

## 5. Canonical Data Model

No SQL is defined in this document. Names below are target technical contracts.

### 5.1 `planner_plans`

| Dimension | Contract |
|---|---|
| Responsibility | Canonical objective root, lifecycle, scope, graph version, terminal flags |
| PK | `id` |
| FKs | owner person or household/member according to scope; legacy bridge through mapping table only |
| Ownership/scope | `personal` requires owner; `household` requires household and created member |
| Lifecycle | `draft`, `active`, `paused`, `completed`, `closed`; Trash and Archive are orthogonal metadata |
| Versioning | `version` is graph/lifecycle optimistic concurrency version |
| Timestamps | created, updated, activated, paused, completed, closed, archived, trashed, restored |
| Constraints | valid scope shape, terminal archive only, trashed mutation limits, close reason required for close |
| Indexes | owner/scope, household, lifecycle, archive, trash, updated, version |
| Audit | every lifecycle/structure mutation emits Activity with mutation identity |
| Archive | only Completed or Closed; Active uses Close and Archive |
| Trash | manual 30-day retention; restore to previous lifecycle when safe |
| RLS boundary | plan readable/mutable by owner or authorized household role; service-role migration/jobs scoped |

### 5.2 Milestones

| Dimension | Contract |
|---|---|
| Responsibility | Plan-owned achieved result, phase, checkpoint; migration target for Manual Condition |
| PK/FK | `id`; `plan_id` |
| Fields | title, description, importance, lifecycle, ordering, completion metadata, legacy source metadata |
| Importance | `principal` or `supporting` |
| Lifecycle | pending, completed; reopen returns to pending |
| Versioning | node version plus Plan graph version |
| Constraints | same Plan scope; non-empty title; unique active legacy source mapping |
| Indexes | plan/order, plan/importance/lifecycle, legacy source |
| Audit | create/update/reorder/complete/reopen/remove/backfill activity where visible |
| Archive/Trash | through Plan structure removal or Plan Trash; no independent product archive |
| RLS boundary | same Plan read/write boundary |

### 5.3 Measurements

| Dimension | Contract |
|---|---|
| Responsibility | Plan-owned numeric tracker with target and append-only value history |
| PK/FK | `id`; `plan_id`; history rows reference measurement |
| Fields | name, current value, target value, unit, operator, importance, ordering, reached projection |
| Operators | `gte`, `lte`, `eq` with deterministic comparison |
| Lifecycle | active while Plan structure node exists; corrected through history entry |
| Versioning | measurement version; history operation identity; Plan graph version |
| Constraints | unit required when numeric target exists; valid operator; history idempotent by operation |
| Indexes | plan/order, plan/importance, history by measurement/time |
| Audit | create/update/record/correct/remove emit Activity as allowed |
| Archive/Trash | no independent archive; structure removal is reversible only while Plan mutation history permits |
| RLS boundary | same Plan boundary; history follows measurement read permission |

### 5.4 Requirements

| Dimension | Contract |
|---|---|
| Responsibility | Mandatory gate for activation or completion; independent from progress entities |
| PK/FK | `id`; `plan_id`; optional parent for technical hierarchy |
| Fields | title, description, target transition, state, ordering, parent, satisfied/annulled metadata |
| States | `pending`, `satisfied`, `annulled` |
| Lifecycle | create, satisfy, annul, reset, remove; annulment requires reason |
| Versioning | node version plus Plan graph version; idempotent state transitions by mutation identity |
| Constraints | mandatory only; no supporting/principal; target in activation/completion; no cycles |
| Indexes | plan/target/state, plan/order, parent |
| Audit | satisfy/annul/reset/create/remove emit Activity; annulment includes actor/reason/timestamp |
| Archive/Trash | no independent archive; removed with Plan structure or purged with Plan |
| RLS boundary | Plan boundary; annul permission may be stricter than edit permission |

### 5.5 Plan-Task Links

Canonical table: `planner_plan_task_links`.

| Dimension | Contract |
|---|---|
| Responsibility | Exclusive membership relation from Task to zero-or-one Plan |
| PK/FKs | `id`; `plan_id`; `task_id` |
| Fields | importance, function, ordering, linked_by, created_at, updated_at, removed_at, version |
| Constraints | one active link per `task_id`; `principal + context` invalid; task not trashed at link creation |
| Indexes | unique active task, plan/order, plan/importance/function, task lookup |
| Audit | link, unlink, importance/function change, scope-share decision |
| Archive/Trash | deleting link never deletes Task; Plan Trash preserves link inactive for restore unless purged |
| RLS boundary | actor must read/mutate Plan and read/share Task; personal-to-household link requires explicit share |

### 5.6 Plan-Event Links

Canonical table: `planner_plan_event_links`.

| Dimension | Contract |
|---|---|
| Responsibility | Exclusive membership relation from Event series or occurrence to zero-or-one Plan |
| PK/FKs | `id`; `plan_id`; `event_id`; optional series/occurrence identity columns |
| Fields | importance, function, binding type, occurrence key, final outcome, ordering, version |
| Constraints | one active link per bound event identity; context requires supporting; final_event requires principal |
| Indexes | unique active event binding, plan/order, plan/function, event/occurrence lookup |
| Audit | link, unlink, outcome, reschedule, missed occurrence, scope-share decision |
| Archive/Trash | unlink never deletes Event; recurring series survives Plan archive unless explicit resolution chooses otherwise |
| RLS boundary | actor must read/mutate Plan and read/share Event; participants keep Event permissions only |

### 5.7 Prepared Tasks And Prepared Events

Canonical tables: `planner_plan_prepared_tasks`, `planner_plan_prepared_events`.

| Dimension | Contract |
|---|---|
| Responsibility | Plan-owned non-productive Task/Event payloads while Plan is En preparación |
| PK/FK | stable prepared `id`; `plan_id`; optional preset/draft source revision |
| Fields | payload schema/version, title/date/assignment/scope/verification/recurrence fields, ordering, importance, function |
| Lifecycle | active only while Plan is `draft`; materialized once during activation; then marked materialized with productive ID |
| Versioning | prepared item version plus Plan graph version; materialization mapping is idempotent |
| Constraints | hidden from Planner/Calendar/Search/Attention; recurrence not scheduled before activation |
| Indexes | plan/order, plan/materialization state, source preset revision |
| Audit | edit/reorder/remove in preparation; materialization Activity occurs on activation summary |
| Archive/Trash | Plan Trash hides prepared items; purge follows Plan |
| RLS boundary | same Plan mutation boundary; no productive Task/Event RLS until materialized |

### 5.8 Presets

| Dimension | Contract |
|---|---|
| Responsibility | Reusable HomePlus, Personal, or Familiar configuration and Plan blueprint source |
| PK/FKs | preset `id`; revisions reference preset; owner/household according to source |
| Fields | entity type, source, revision pointer, payload schema/version, structural fingerprint, trash retention |
| Lifecycle | HomePlus immutable; Personal/Familiar revisioned; Personal trash 30 days |
| Versioning | preset version plus immutable published revisions |
| Constraints | HomePlus cannot be edited/deleted; Plan preset preview creates no productive entity |
| Indexes | source/entity/owner/household, active revision, trash expiry |
| Audit | copy/edit/publish/trash/restore where visible and permitted |
| RLS boundary | HomePlus readable, Personal owner-only, Familiar by household role |

### 5.9 Creation Drafts

| Dimension | Contract |
|---|---|
| Responsibility | Owner-only non-productive autosaved form payload |
| PK/FKs | draft `id`; owner person; optional source preset/revision |
| Fields | client draft key, entity type, intended scope, payload, schema version, live expiry, warning marker |
| Lifecycle | live until 30 days after last edit; warning near 7 days before expiry; discard/expire/purge |
| Versioning | draft version; autosave idempotent by draft key and content fingerprint |
| Constraints | no productive Search, Planner, family Activity, or Archive; multiple drafts allowed |
| Indexes | owner/entity/updated, live expiry, warning due, trash expiry |
| Audit | no family Activity; private owner notice permitted |
| RLS boundary | owner-only; service-role cleanup scoped |

### 5.10 Completion Attempts And Evidence

| Dimension | Contract |
|---|---|
| Responsibility | Per-attempt Task completion evidence and review history |
| PK/FKs | attempt `id`; task `id`; evidence rows reference attempt; optional Plan relation via link at attempt time |
| Fields | actor, comment, upload state, review state, correction, resubmission pointer, timestamps |
| Evidence item fields | storage object key, content type, size, checksum, thumbnail key, upload identity, purge state |
| Lifecycle | pending upload, submitted, in review, verified, correction requested, failed upload, cancelled upload |
| Versioning | attempt version and upload identity; evidence upload retry is idempotent |
| Constraints | self-verification prohibited; Task does not enter review until required uploads confirmed |
| Indexes | task/time, reviewer queue, actor pending uploads, storage object lookup |
| Audit | submit/review/correction/resubmit/purge redacted in Activity |
| RLS boundary | actor, verifier, owner/household permission; signed Storage access only |

### 5.11 Attention, Activity, Legacy Mappings, Trash, Tombstones

| Structure | Contract |
|---|---|
| Attention | Derived queue with reason, responsible actor, priority, primary action, Open action, dedupe key, invalidation source |
| Activity | Append-only redacted event schema with actor, household/scope, entity, related Plan, before/after, navigation safety |
| Legacy mappings | `planner_plan_legacy_goal_links` plus migration batch ledger and conflict review rows |
| Trash | Domain metadata with retention window, restore payload, previous state, purge eligibility |
| Tombstones | Minimal technical table only when hard delete would break references; stores ID, type, deleted_at, permanently_deleted only |

## 6. Plan-Task Contract

Current reality: Tasks link to legacy Goals through `planner_tasks.goal_id` and Current Plan graph can reference tasks through external requirements. This violates zero-or-one final Plan membership and Requirement meaning when used as ownership.

Frozen architecture:

| Topic | Contract |
|---|---|
| Canonical relation | `planner_plan_task_links` |
| Cardinality | one active link per Task at most |
| Fields | `plan_id`, `task_id`, `importance`, `function`, `sort_order`, timestamps, actor, version |
| Values | `importance`: `principal`, `supporting`; `function`: `contributes`, `context` |
| Invalid combination | `principal + context` |
| Ownership | link owns Plan membership; Task remains Task domain entity |
| Removing link | never deletes, trashes, cancels, or archives Task |
| Requirements | never used as final Task ownership |
| Legacy bridge | `task.goal_id` read only until migrated |

DTO:

```text
PlannerPlanTaskLinkDto = {
  id, planId, taskId, importance, function, sortOrder,
  taskSummary, resolvedForPlan, countsForCompletion,
  version, createdAt, updatedAt
}
```

Mutations:

| Mutation | Contract |
|---|---|
| link existing Task | validates Plan, Task, scope sharing, zero-or-one uniqueness, version, permission |
| create Task from Plan | single product intention creates Task and link atomically or through dependency graph with backend idempotency |
| update link | changes importance/function/order with active-Plan confirmation when completion impact exists |
| unlink | removes relation only; emits Activity; progress recalculates |

Progress: principal contributing Tasks count when completed or verified according to Task verification rule. Supporting and context Tasks never block Plan completion.

Migration and cutover:

1. Expand dedicated link table and DTO behind read bridge.
2. Backfill from `task.goal_id` through Goal-Plan mapping.
3. Backfill eligible external task requirements into links.
4. Validate zero-or-one conflicts; route conflicts to guided review.
5. Stop new writes to `task.goal_id` and external requirement ownership.
6. Read Plan Task sections from canonical links.
7. Remove legacy ownership reads after validation.

## 7. Plan-Event Contract

Current reality: Events have no Plan FK. Current Plan graph can reference external event requirements and partial finalization metadata. There is no occurrence binding final contract.

Frozen architecture:

| Topic | Contract |
|---|---|
| Canonical relation | `planner_plan_event_links` |
| Cardinality | one active Plan membership per bound Event identity at most |
| Binding | series or occurrence; occurrence identity is stable and timezone-aware |
| Fields | `plan_id`, `event_id`, `importance`, `function`, `binding_type`, `occurrence_key`, `outcome`, ordering, timestamps, version |
| Functions | `contributes`, `context`, `defines_date`, `final_event` |
| Rules | context requires supporting; final_event requires principal; past is not resolved |
| Removing link | never deletes, trashes, cancels, or archives Event |

DTO:

```text
PlannerPlanEventLinkDto = {
  id, planId, eventId, bindingType, occurrenceKey,
  importance, function, outcome, eventSummary,
  resolvedForPlan, countsForCompletion, version
}
```

Recurrence: series links apply to future occurrences through Event recurrence rules. Occurrence links bind a single generated occurrence identity. Editing scope remains explicit: this occurrence, this and following, whole series.

Final Event: `final_event` link stores outcome `pending`, `occurred`, `not_occurred`, or `rescheduled`. Occurred resolves the Event for progress, not the Plan completion. Not occurred requires actor choice: replace final Event, keep unresolved, close Plan, or remove final-event link.

Migration and cutover follow the same expand/backfill/validate/write cutover/read cutover/removal sequence as Plan-Task.

## 8. Prepared Tasks And Prepared Events

Frozen representation: Plan-owned prepared tables, not productive Task/Event rows and not JSON-only blobs.

| Requirement | Frozen technical behavior |
|---|---|
| Exist only inside Plan En preparación | enforced by Plan lifecycle validation |
| Stable identity | prepared IDs generated at creation/import and kept through edits/reorder |
| Editable/orderable | Plan graph changesets include prepared item operations |
| Hidden from productive surfaces | no Planner Tasks, Calendar, Search, Attention, assignments, recurrence |
| Materialization | activation creates productive Task/Event rows and canonical links |
| Mapping | prepared ID maps to productive ID in activation result and replay ledger |
| Idempotency | materialization keyed by activation mutation ID + prepared ID |
| Replay | repeated activation request returns existing mapping and snapshot |
| Failure | transaction rollback means no Plan active and no productive partial rows |

Validation covers payload schema, scope, assignee/participant permission, date/time, recurrence, verification/evidence requirements, preset revision compatibility, and no duplicate prepared IDs.

Cleanup: prepared rows remain for audit mapping after activation while needed, but are not shown as editable. On Plan purge they hard-delete unless Activity requires redacted tombstone for the Plan only.

## 9. Plan Graph, DTOs, And Changesets

Frozen graph:

```text
PlannerPlanGraphDto = {
  plan,
  milestones,
  measurements,
  requirements,
  preparedTasks,
  preparedEvents,
  taskLinks,
  eventLinks,
  indicators,
  readiness,
  permissions,
  version
}
```

Graph operations are split:

| Category | Operations |
|---|---|
| Structural mutations | create/update/remove/reorder Milestone, Measurement, Requirement, Prepared Task, Prepared Event, link metadata |
| Lifecycle mutations | activate, pause, resume, complete, close, reopen, archive, unarchive, trash, restore |
| Productive entity mutations | Task/Event create/update/complete/verify/cancel/trash/restore and Event occurrence actions |

Changeset contract:

| Topic | Contract |
|---|---|
| Identity | mutation ID and payload hash from PlannerMutationIntent |
| Version | expected Plan version required for versioned graph writes |
| Stale conflict | normalized conflict response with current snapshot reference |
| Noop | no POST when local diff is empty; backend can return canonical noop for replay |
| Replay | same mutation ID and payload hash returns original canonical response |
| Response | always returns canonical graph snapshot for affected Plan |
| Local draft | screen-local and durable only when it is a Creation Draft; structure editor draft is not product Draft |
| Reconciliation | reload on focus and after terminal mutation; uncertain state keeps local edit buffer |

## 10. Atomic Activation

One backend transactional operation is frozen: `activate_plan_with_materialization` behind the conceptual lifecycle mutation `activate`.

Steps:

1. Validate authenticated actor.
2. Validate Plan scope and mutation permission.
3. Validate Plan lifecycle is `draft`, not trashed, expected version matches, and single-flight identity is accepted.
4. Validate at least one useful principal element among prepared Task, prepared Event, Milestone, Measurement.
5. Validate activation Requirements are satisfied or annulled.
6. Validate prepared Task/Event payloads and scope sharing.
7. Materialize Tasks idempotently.
8. Materialize Events idempotently, including recurrence definitions.
9. Create Plan-Task and Plan-Event links.
10. Create recurrence schedules for materialized recurring Events only after Event creation.
11. Change Plan lifecycle to `active` and increment version.
12. Generate Activity for activation and materialization counts.
13. Invalidate Plan/Home/Search/Attention caches.
14. Return canonical `PlannerPlanGraphDto` snapshot and materialization mapping.

Guarantees: no partial activation, no duplicate productive rows, replay-safe, idempotent, single-flight compatible, stale conflict protected, uncertain outcome recoverable by reload with mutation lookup.

Conceptual request:

```text
POST /api/planner/plans/:id/mutations
headers: X-Mutation-Id, Idempotency-Key, If-Match
body: { action: 'activate', expectedVersion, activationReviewHash }
```

Conceptual errors:

| Error | Meaning |
|---|---|
| `permission_denied` | actor cannot activate Plan |
| `stale_plan_version` | expected version does not match |
| `invalid_lifecycle` | Plan not in En preparación |
| `activation_gate_blocked` | no useful principal or pending activation Requirement |
| `prepared_payload_invalid` | prepared item cannot materialize |
| `scope_share_required` | personal entity would leak into household scope |
| `mutation_replay_mismatch` | same mutation ID with different payload hash |
| `uncertain_outcome` | client must reload/reconcile before retrying visible action |

## 11. Milestones, Measurements, Requirements

### Milestones

Schema includes title, description, importance, lifecycle, ordering, completion actor, completion timestamp, version, legacy source. Principal Milestones block completion until completed. Supporting Milestones do not block. Complete/reopen are versioned structure operations and emit Activity. Manual Condition backfill creates Milestones with legacy source metadata and matching completion state where available. Legacy manual condition rows are read only during bridge and physically retired in removal phase.

### Measurements

Schema includes name, current value, target, unit, operator, importance, ordering, version. History is append-only by mutation identity and stores previous/current values, actor, timestamp, correction flag. Reached calculation is deterministic from operator and numeric values. Corrections append compensating history rather than rewriting audit. Concurrent value records require expected measurement version or return stale conflict.

### Requirements

Schema includes target transition (`activation` or `completion`), state, title, description, ordering, optional technical parent, actor metadata. Requirements are mandatory only. Satisfy marks state `satisfied`. Annul marks state `annulled` and requires permission, reason, actor, timestamp, and Activity. Reset returns to `pending` and emits Activity. Technical hierarchy remains supported; MVP UI is flat. Attention derives Plan blocked items from pending Requirements. `confirm_unresolved` is not final contract and is removed after write cutover.

## 12. Plan Lifecycle State Machine

| Transition | Preconditions | Payload | Response | Idempotency/replay | Activity/Attention |
|---|---|---|---|---|---|
| draft -> active | activation gate passes | activation review hash | graph snapshot | same activation replays materialization mapping | activation Activity, unblock Attention |
| active -> paused | authorized actor, impact review | entity decisions | graph snapshot | same mutation replays | pause Activity, entity Attention updated |
| paused -> active | authorized actor | resume reason optional | graph snapshot | replay returns active snapshot | resume Activity |
| active/paused -> completed | all principal resolved, requirements satisfied/annulled, human confirmation | confirmation, supporting resolution choices | graph snapshot | replay returns completed snapshot | completion Activity, Attention cleared |
| active/paused -> closed | reason required, active entity resolution | reason, comment, entity decisions | graph snapshot | replay returns closed snapshot | close Activity |
| completed/closed -> active | authorized actor | reopen reason | graph snapshot | replay returns active snapshot | reopen Activity |
| completed/closed -> archived | terminal state | archive flag | graph snapshot | replay safe | archive Activity |
| active -> closed+archived | close gate | close reason plus archive | graph snapshot | replay safe | close/archive Activity |
| allowed state -> Trash | permission, retention metadata | trash operation | graph snapshot or list removal | replay safe | trash Activity |
| Trash -> previous state | before expiry, references safe | restore operation | graph snapshot | replay safe | restore Activity |

No automatic completion exists. No lifecycle mutation bypasses Planner Reliability. Frontend uncertain state always shows pending/reload affordance and does not declare success before canonical response or reconciliation.

## 13. Pause, Completion, Close, Archive

Pause orchestration: the review lists active Tasks, Events, and recurring series. Default is stop with Plan. Actor may keep selected entities active. Non-maintained punctual Tasks/Events are cancelled with reactivation available. Non-maintained recurring series are paused, not destroyed. Links remain unless actor explicitly unlinks. The operation is transactional when all entity resolutions are supported by backend; when a domain action has separate authority, the backend records dependency operations and returns a pending resolution snapshot, never a false complete pause.

Completion: all principal Tasks, Events, Milestones, and Measurements must be resolved; verification must be complete; completion Requirements must be satisfied or annulled; supporting items are reviewed but do not block. Completion is human and emits Activity.

Close: requires structured reason and optional comment. The actor resolves active entities: cancel, keep active, unlink, or replace when domain allows. Closing is not achievement.

Archive: only Completed or Closed Plans. Active uses Close and Archive. Archive never cascades to Tasks/Events and never deletes data.

## 14. Recurrence And Final Event

Plan recurrence means one ongoing Plan with cycle projection, not one Plan per cycle. Event recurrence remains in Event domain.

| Topic | Contract |
|---|---|
| Series | stable series identity in Event domain |
| Occurrence | stable occurrence key derived by Event recurrence engine and timezone |
| Current cycle | projection from linked recurring events/tasks and Plan metadata |
| Next occurrence | read projection, not Plan lifecycle transition |
| Cycle history | Activity/projection by occurrence outcomes, no new Plan rows |
| Pause/resume | Plan pause can pause linked series unless kept active |
| Missed occurrence | Attention item and Activity when relevant; does not auto-complete or auto-close Plan |
| Timezone | stored on Event/series and included in occurrence key semantics |
| Exceptions | Event domain owns exceptions; Plan link projection follows explicit edit scope |
| Offline | recurrence mutations queue through Reliability; uncertain projection reloads on focus |

Final Event binding is a `planner_plan_event_links` row with `function='final_event'` and `importance='principal'`. After scheduled time, authorized actor records occurred, not occurred, or reschedule. Occurred resolves the principal Event contribution only. Plan completion still requires human Plan completion.

## 15. Presets And Creation Drafts

### Presets

HomePlus presets are immutable and readable. Personal presets are owner-only, revisioned, copyable, trashable/restorable. Familiar presets are visible/use/edit by household permission and revisioned.

Plan Preset payload contains schema version, objective defaults, structure nodes, prepared Task/Event blueprints, validation fingerprint, and preview metadata. Preview creates no entities. Confirming creates Plan En preparación plus prepared items/structure. Applying the same confirmed mutation ID replays the same Plan/prepared IDs.

### Creation Drafts

Creation Drafts exist for Task/Event/Plan form payloads, owner-only, multiple, autosaved, schema-versioned, and separate from Plan En preparación. Live Drafts expire 30 days after last edit and warn about 7 days before expiry. Attachments in Drafts use temporary owner-private upload identity and purge if Draft expires/discards. Offline autosave uses local durable storage and reconciles with server by draft key/content fingerprint. Conflicts create owner-private recovery choices. Cleanup job expires live Drafts and purges expired payloads without family Activity.

## 16. Verification, Evidence, And Storage

Completion attempt table stores actor, task, Plan relation snapshot, comment, timestamps, upload state, review state, correction state, and resubmission pointer. Evidence item table stores one row per image with storage object key, thumbnail key, size, content type, checksum, upload identity, and purge metadata.

Storage strategy:

| Topic | Contract |
|---|---|
| Bucket | dedicated private Planner evidence bucket |
| Path | household/personal scope prefix, task ID, attempt ID, evidence ID |
| Ownership | metadata matches DB attempt and actor |
| Isolation | personal and household prefixes cannot cross-read |
| Access | short signed URLs through authorized backend only |
| Thumbnails | generated asynchronously with same permission boundary |
| Limits | first version images only, bounded count/size/content type |
| Cleanup | orphan detection by DB/storage reconciliation; purge follows owning entity policy |
| Offline | local upload queue with upload identity, retry/backoff, cancellation, failed-upload Attention |

No self-verification: verifier actor must differ from completion actor when policy prohibits self-review. Task cannot show En revisión until required files upload successfully.

## 17. Attention And Activity

Attention schema includes attention ID, dedupe key, reason enum, responsible actor, priority, privacy scope, primary action, secondary Open action, source entity, related Plan, invalidation keys, timestamps, and source version.

Reasons covered: verification, correction, Event response, Plan blocked, evidence upload failed, Draft expiry, sync conflict, final Event outcome pending, retention warning.

Resolution invalidates or updates item when source state changes. Realtime updates are privacy-filtered. Private Draft/evidence upload items are visible only to the responsible actor.

Activity schema includes event ID, event type, actor, household/scope, entity type/id, related Plan ID, mutation identity, before/after redacted payload, grouping keys, timestamps, and navigation target state. Activity Detail DTO returns read-only permission-filtered metadata, missing entity handling, purged entity generic copy, and separate buttons for accessible entities.

## 18. Cancelled, Trash, Retention, Purge

| Flow | Window | Result |
|---|---|---|
| Cancelled Task/Event | 30 days | hidden from active, reactivatable, warning before expiry |
| Auto-Trash after Cancelled | 7 days | recoverable Trash, then purge |
| Manual Trash Task/Event/Plan/Personal Preset | 30 days | restorable, then purge |
| Creation Draft live expiry | 30 days after last edit | private expiry, no family Activity |
| Archive | no expiry | terminal Plan visibility only |

Jobs: retention warning, cancelled-to-trash, trash-purge, draft-expiry, evidence-orphan cleanup, tombstone cleanup. Jobs run idempotently in batches, with row locks, retry ledger, and race handling. Restore near expiry cancels purge if the restore lock wins before hard delete starts. Search/cache removal occurs at Trash and purge invalidation points.

Hard delete criteria: entity has no required FK/history/Activity reference requiring stable identity and purge policy allows full removal. Tombstone criteria: a redacted Activity/navigation/migration reference requires stable identity after deletion. Tombstone stores only technical ID, type, deleted_at, permanently_deleted. It stores no title, description, files, evidence, people, private content, or assignees.

## 19. Goal To Plan Migration And Legacy Cutover

Migration phases:

1. Expand: add canonical Plan links, prepared items, requirement annulment, evidence, tombstones, Draft expiry, mapping ledger.
2. Bridge: resolver maps Goal/Plan IDs; `task.goal_id` and external requirements read through canonical projections.
3. Backfill: create Plan mappings, Plan-Task links, Milestones/Measurements, Trash metadata, Activity references.
4. Validate: counts, permissions, Search/Home parity, conflicts, zero-or-one uniqueness, legacy percentage mapping.
5. Write cutover: all new writes use Plan, canonical links, PlanDetail route, no new Goal ownership.
6. Read cutover: Home/Search/Activity resolve to Plan projections.
7. UI cutover: Goal root, GoalDetail product surfaces, Goal create/edit routes removed from visible Planner.
8. Legacy removal: retire legacy tables/columns/routes after validation windows and rollback checkpoints.

Preserve title, description, compatible category where a Plan field exists or migration metadata supports projection, semantically equivalent dates, scope, Tasks, verification, cancelled/history, lifecycle, Activity by permission, Trash. Legacy percentage is not preserved as universal percentage; it maps to Milestones/Measurements/indicators when interpretable.

Rollback: each phase has batch ledger, mapping table, idempotent replay, read bridge, and reversible write switch until removal. After removal, rollback is restore from backup plus mapping ledger, not mixed dual root UI.

## 20. Routes, Home, Search, Cache

Final route: PlanDetail receives Plan ID only. LegacyGoalResolver receives ambiguous legacy IDs during bridge and returns Plan destination, guided conflict, missing entity, or purged generic result. Home and Search never pass Goal ID directly to PlanDetail.

Home projection reads canonical Plan summary, linked Tasks/Events, Attention counts, lifecycle/projection, and Trash/Archive state. Search projection indexes Plan, Task, Event, and permitted Activity destinations with resolver metadata. Household switching clears personal/household caches and reloads permission-filtered projections. Activity navigation uses resolver and purged entity state.

Cache invalidation keys: Plan graph, Plan summary, Task list/detail, Event calendar/detail, Attention, Activity, Home, Search, Trash, Archive, Legacy resolver mapping.

## 21. Privacy, RLS, And Storage Boundaries

Rules are conceptual; policy SQL is not defined here.

| Entity | SELECT | INSERT/UPDATE | DELETE/Trash | Service role |
|---|---|---|---|---|
| Plan | owner or household viewer | Plan actor authorized | owner/authorized role | migration, cleanup |
| Task | owner/assignee/household permission | task actor authorized | domain permission | migration, retention |
| Event | participant/household permission | event actor authorized | domain permission | migration, retention |
| Milestone/Measurement/Requirement | Plan read | Plan mutate | Plan mutate | migration/backfill |
| Draft | owner only | owner only | owner only | expiry cleanup |
| Preset | by source/scope | owner or household role | owner/role; HomePlus never | seed/migration |
| Evidence | actor/verifier/authorized household | attempt actor/upload backend | policy-bound purge | orphan cleanup |
| Attention | responsible actor and permitted scope | derived only | derived invalidation | projection jobs |
| Activity | permission-filtered | backend only | no user delete; purge redaction | audit jobs |
| Tombstone | resolver/service only except generic missing copy | backend only | cleanup if safe | purge jobs |

Personal entity to household Plan sharing requires explicit owner action plus household permission. Scope changes require consequence review for members, assignees, links, Activity, caches, and visibility.

RLS tests cover positive/negative read, write denial, cross-household denial, personal leak prevention, service-role job scope, Storage signed access, and household switch cache invalidation.

## 22. Reliability And Offline

All writes use Current Reliability:

```text
PlannerMutationIntent -> X-Mutation-Id -> Idempotency-Key -> durable queue -> productive adapter -> endpoint/RPC -> canonical response -> observer sink
```

New mutation identities:

| Domain | Identity |
|---|---|
| Plan graph changeset | plan ID + expected version + payload hash + mutation ID |
| Activation | plan ID + expected version + activation review hash + mutation ID |
| Prepared materialization | activation mutation ID + prepared item ID |
| Requirement satisfy/annul/reset | requirement ID + expected version + action payload hash |
| Measurement record/correction | measurement ID + expected version + operation payload hash |
| Evidence upload | attempt ID + evidence ID + upload identity + checksum |
| Draft autosave | owner + client draft key + content fingerprint |
| Preset publish | preset ID + revision ID + payload fingerprint |
| Retention jobs | job run ID + entity ID + expected retention state |

Conflict normalization uses stale version, permission denied, validation blocked, replay mismatch, uncertain outcome, offline queued, and safe discard. Single-flight applies per product action. Offline pending states are visible and reload/reconciliation is mandatory after uncertain terminal states. No second write runtime is introduced.

## 23. REC-0A First Mini-Lot

`REC-0A` is the first implementation mini-lot and blocks new activation architecture work.

Required work:

1. Gather `[PlanCompositionTrace]` from existing instrumentation.
2. Gather `[PlanWriteTrace]` for handler, enqueue, adapter execution, request, POST, terminal callback.
3. Correlate lifecycle handler, mutation identity, durable operation, adapter, request, and POST.
4. Determine whether duplicated Activate uses shared or distinct mutation identity.
5. Locate duplication point before Reliability, inside adapter, inside request layer, or in component composition.
6. Fix only after evidence.
7. Validate one POST per Activate action on Android.

No root cause is declared by this document.

## 24. Backend Contracts

Conceptual endpoint/RPC contracts:

| Contract | Method/route | Request | Response | Reliability | Activity/invalidation |
|---|---|---|---|---|---|
| List Plans | GET `/api/planner/plans` | filters/scope | Plan summaries | read reconciliation | cache key Home/Search |
| Read Plan graph | GET `/api/planner/plans/:id` | Plan ID | `PlannerPlanGraphDto` | reload/reconcile | none |
| Create Plan | POST `/api/planner/plans` | base objective/scope or preset confirmation | Plan graph | create idempotency | Plan create Activity |
| Structure changeset | POST `/api/planner/plans/:id/structure` | expected version, ops | graph snapshot | versioned mutation | graph/Home/Search invalidation |
| Lifecycle mutation | POST `/api/planner/plans/:id/mutations` | action payload | graph snapshot | versioned mutation | lifecycle Activity |
| Requirement state | same Plan mutation boundary | satisfy/annul/reset | graph snapshot | versioned mutation | Requirement Activity/Attention |
| Measurement record | Plan graph mutation boundary | value/correction | graph snapshot | versioned mutation | Measurement Activity |
| Task link | Plan graph mutation boundary | link/update/unlink | graph snapshot | versioned mutation | Plan/Task Activity |
| Event link/outcome | Plan graph mutation boundary | link/update/outcome | graph snapshot | versioned mutation | Plan/Event Activity |
| Evidence attempt | Task endpoint/RPC | attempt/evidence metadata | attempt DTO | idempotent upload identity | Task/Attention/Activity |
| Preset revision | preset endpoint/RPC | revision payload | preset DTO | idempotent publish | preset Activity |
| Draft autosave | draft endpoint/RPC | draft payload | draft DTO | autosave identity | private notice only |

Every contract defines auth, permission, mutation identity, validation, conflict, noop, replay, errors, Activity, and invalidation before implementation starts.

## 25. Frontend Contracts

Frontend keeps DTOs, services, adapters, hooks, selectors, sheets/screens, pending/offline/stale/uncertain states, retry, focus reload, navigation, and permitted optimistic behavior separated.

| Area | Contract |
|---|---|
| DTOs | generated/adapted from backend canonical graph; no legacy Goal DTO in final Plan surfaces |
| Services | wrap endpoints; no direct fetch write outside Reliability |
| Adapters | build PlannerMutationIntent payloads and normalize responses/errors |
| Hooks/selectors | derive progress/readiness/attention; never decide completion |
| Sheets/screens | show loading/offline/error/permission/missing/uncertain states |
| Optimism | local disabled/pending UI allowed; productive success only after canonical response or replay confirmation |
| Navigation | PlanDetail receives Plan ID; resolver handles legacy IDs |
| Focus reload | required after terminal mutation, uncertain outcome, household switch, and Activity navigation |

## 26. Migration Matrix

| Legacy | Expand | Backfill | Bridge | Write cutover | Read cutover | Removal | Rollback |
|---|---|---|---|---|---|---|---|
| Goal | mapping ledger and Plan fields | create/match Plans | LegacyGoalResolver | no new Goal writes | Plan projection only | retire visible Goal | switch reads to legacy until removal |
| GoalDetail | PlanDetail route | map route params | resolver | writes to Plan | redirects to PlanDetail | remove product route | resolver fallback |
| `task.goal_id` | Plan-Task links | copy via mapping | compatibility read | stop writing goal_id | read canonical links | drop/ignore legacy link | restore bridge read |
| Manual Condition | Milestone source fields | create Milestones | read bridge | no new manual condition | read Milestones | retire manual condition | bridge from legacy table until drop |
| legacy percentage | Measurement/Milestone indicators | interpret values | show indicators | no percent writes | no universal percent reads | remove percent UI | read legacy label only during bridge |
| activation gate | new RPC validation | none | support old draft nodes | atomic activation | canonical readiness | remove manual condition gate | old lifecycle blocked behind feature switch |
| current Plan forms | prepared items | import preset payloads | detail/editor bridge | create prepared not productive | show graph | remove old form paths | switch to minimal create |
| Search/Home | resolver metadata | reindex | resolve IDs | emit Plan IDs | read Plan projection | remove Goal projection | re-enable legacy projection until read cutover |
| telemetry legacy | event mapping | batch labels | dual labels hidden | Plan labels only | Plan dashboards | remove Goal metrics | restore legacy metrics until removal |

## 27. Implementation Mini-Lots

Each mini-lot uses: reproduce -> cause -> minimal patch -> tests -> real app -> user validation -> commit.

| ID | Objective | Dependencies | Scope | Supabase/DB slot | Tests | Android gate | Rollback | Next |
|---|---|---|---|---|---|---|---|---|
| REC-0A | diagnose/fix duplicate Activate POST | none | instrumentation evidence and minimal fix | no DB | duplicate dispatch, Reliability | one POST per Activate | revert minimal code patch only | D1 |
| D1-SCHEMA-EXPAND | add canonical tables/contracts | REC-0A | links, prepared items, annulments, evidence, tombstones, draft expiry | DB slot 1 | schema/contract/RLS draft tests | migration boots app | down migration or feature switch | D2 |
| D2-RLS-STORAGE | define/enforce RLS and Storage boundaries | D1 | policies, bucket, signed access, service jobs | DB slot 2 | RLS/storage tests | denied access cases | disable bucket paths/policies by switch | D3 |
| D3-RELIABILITY-ADAPTERS | add mutation identities/adapters | D1 | graph/link/prepared/evidence/draft/preset writes | no DB | Reliability replay/conflict | queued/replay no duplicate | disable adapters | D4 |
| D4-PLAN-GRAPH-BACKEND | canonical graph DTO and changesets | D1-D3 | backend graph, prepared items, links | DB slot 3 if constraints adjust | contract/backend | read graph on Android | feature switch to old graph | D5 |
| D5-PREPARED-PRESETS | Plan Preset preview and prepared generation | D4 | preset payload, preview, Plan En preparación | no DB after D1 | preset/draft contract | preview creates no productive items | switch off Plan preset path | D6 |
| D6-ACTIVATION | atomic activation/materialization | D4-D5 | backend transaction and frontend review | DB slot 4 | atomic/replay/duplicate | activation creates one set | switch to old activation while no prepared items | D7 |
| D7-MILESTONE-MEASUREMENT-REQ | lifecycle and gate operations | D4-D6 | complete/reopen, value record, satisfy/annul/reset | no DB after D1 | unit/contract/backend | progress updates | hide new actions | D8 |
| D8-PLAN-TASK | Task link/create/progress | D4-D7 | Plan-Task links and UI | no DB after D1 | zero-or-one, invalid function | create/link Task once | disable link UI | D9 |
| D9-PLAN-EVENT | Event links/final event/recurrence binding | D4-D7 | Plan-Event links/outcomes | no DB after D1 | recurrence/final event | create/link Event once | disable link UI | D10 |
| D10-LIFECYCLE-FLOWS | pause/complete/close/archive orchestration | D6-D9 | reviews and entity decisions | no DB | lifecycle matrix | full lifecycle path | hide unsafe actions | D11 |
| D11-EVIDENCE | attempts/storage/upload/review | D2-D3 | evidence tables, bucket, queue, Attention | DB slot 5 if needed | evidence/self-verification | upload/review on Android | disable evidence requirement | D12 |
| D12-DRAFTS-PRESETS-RETENTION | live Draft TTL, warnings, preset trash | D2 | jobs and Attention | DB slot 6 | cleanup/draft TTL | expiry warning | disable jobs | D13 |
| D13-ATTENTION-ACTIVITY | full reason taxonomy and Detail DTO | D6-D12 | Attention/Activity projections | no DB unless event schema extend | redaction/invalidation | primary/Open actions | old projections | D14 |
| D14-GOAL-MIGRATION-BRIDGE | expand/backfill bridge | D1-D13 | Goal inventory, mapping, conflicts | DB slot 7 | migration | resolver opens Plan | stop batch and keep bridge | D15 |
| D15-WRITE-READ-UI-CUTOVER | Plan-only visible root | D14 | Home/Search/routes/UI | no DB | resolver/search/home | no Goal root | switch routes to bridge | D16 |
| D16-RETENTION-PURGE | purge/tombstones/jobs | D12-D15 | cancelled/trash/purge evidence cleanup | DB slot 8 | retention/purge | no purged navigation | pause jobs | D17 |
| D17-INTEGRATED-QA | integrated regression | D1-D16 | all surfaces | no DB | full matrix | full Android acceptance | fix or revert last lot | D18 |
| D18-LEGACY-REMOVAL | remove legacy bridge after validation | D17 + user approval | legacy Goal/manual condition reads | DB slot 9 | migration/removal | no legacy visible root | restore backup/bridge before destructive step | END |

Detailed mini-lot execution contract:

| ID | Areas affected | Backend/frontend | Reliability | Migration impact | Commit boundary | Definition of Done | Blockers |
|---|---|---|---|---|---|---|---|
| REC-0A | Plan lifecycle write path, instrumentation | frontend trace plus minimal code fix only if evidence proves point | preserve current runtime, prove one identity/action | none | trace evidence and minimal fix | Android one POST per Activate; duplicate suite pass | runtime trace unavailable |
| D1-SCHEMA-EXPAND | DB contracts, DTO placeholders | backend contracts prepared; no UI feature exposed | mutation identities named but not enabled | expand-only, reversible | schema migration and docs/tests | constraints represent frozen model | Supabase slot unavailable |
| D2-RLS-STORAGE | RLS, Storage, service jobs | backend policy/storage boundary; frontend signed URL consumer contract | write path still gated by adapters | security migration | RLS/storage migration | positive/negative RLS and signed access pass | policy leak or denied valid actor |
| D3-RELIABILITY-ADAPTERS | mutation adapters, queue, observer | frontend services/adapters; backend headers honored | required for every new write | none | adapters and tests | replay/noop/conflict normalized | any bypass of PlannerMutationIntent |
| D4-PLAN-GRAPH-BACKEND | graph DTO, changesets, validation | backend graph plus frontend DTO/service | versioned graph writes | reads new expand tables | graph backend contract | canonical snapshot returned for all writes | incompatible schema evidence |
| D5-PREPARED-PRESETS | Plan preset preview, prepared item generation | backend create-from-preset; frontend preview/preparation | idempotent create and prepared IDs | none after expand | preset/prepared feature boundary | preview creates no productive rows | preset revision mismatch |
| D6-ACTIVATION | activation transaction, materialization | backend transaction plus frontend review | activation mutation single-flight, replay mapping | productive rows created from prepared items | activation feature boundary | no partial activation, replay safe | REC-0A not resolved |
| D7-MILESTONE-MEASUREMENT-REQ | structure entity operations | backend graph ops plus frontend editors | versioned structure writes | Manual Condition bridge consumed | structure operations boundary | complete/reopen/record/annul/reset pass | graph conflict unresolved |
| D8-PLAN-TASK | Task links, Task create-from-Plan | backend link ops plus frontend Plan/Task UI | create/link action idempotent; no duplicate Task | `task.goal_id` backfill begins | Plan-Task boundary | zero-or-one enforced; progress updates | cross-scope share rule failing |
| D9-PLAN-EVENT | Event links, recurrence, Final Event | backend link/outcome ops plus frontend Plan/Event UI | occurrence/outcome writes replay safe | external event backfill begins | Plan-Event boundary | final outcome and recurrence scopes pass | stable occurrence identity failing |
| D10-LIFECYCLE-FLOWS | pause, completion, close, archive | backend orchestration plus frontend reviews | lifecycle writes versioned and single-flight | none | lifecycle flow boundary | full lifecycle matrix pass | entity resolution non-atomic without safe dependency |
| D11-EVIDENCE | attempts, evidence, Storage, upload queue | backend attempts/storage; frontend upload/review | upload identity and attempt replay | evidence tables populated | evidence boundary | no self-verification; failed upload Attention | Storage/RLS denial mismatch |
| D12-DRAFTS-PRESETS-RETENTION | Draft TTL, preset trash, warnings | backend jobs plus frontend recovery/notice | autosave supersedes safely | live draft expiry added | Draft/Preset retention boundary | 30-day TTL and 7-day warning pass | owner-only privacy failure |
| D13-ATTENTION-ACTIVITY | Attention taxonomy, Activity Detail | backend projections plus frontend detail/actions | invalidation tied to mutation terminal state | redacted references prepared | Attention/Activity boundary | primary/Open actions and redaction pass | Activity leaks purged metadata |
| D14-GOAL-MIGRATION-BRIDGE | Goal inventory, mapping, conflict review | backend migration/resolver plus frontend bridge | batch operations idempotent | main Goal backfill | migration bridge boundary | counts match; conflicts isolated | unresolved destructive mapping |
| D15-WRITE-READ-UI-CUTOVER | routes, Home, Search, UI root | backend resolver plus frontend Plan-only navigation | cache invalidation on resolver writes | write/read cutover | cutover boundary | no visible Goal root; safe deep links | Home/Search legacy ID leak |
| D16-RETENTION-PURGE | cancelled/trash/purge/tombstones | backend jobs plus frontend missing/purged states | job idempotency by entity/state | destructive purge begins only after gates | retention boundary | purge removes Search/detail; tombstone minimal | unsafe FK/reference discovered |
| D17-INTEGRATED-QA | all Planner domains | backend/frontend integrated | all writes through current runtime | validates migration effects | QA-only commit or fixes by focused follow-up | full matrix and Android acceptance pass | any P0/P1 regression |
| D18-LEGACY-REMOVAL | legacy Goal/manual condition cleanup | backend/frontend removal | no legacy write runtime remains | removal/destructive cleanup | legacy removal boundary | final root Plan only; rollback checkpoint documented | user approval missing |

Blockers: REC-0A evidence, Supabase migration slots, Android runtime access, user Phase 0 Freeze approval. No mini-lot is a mega-lot; each has a focused commit boundary.

## 28. Gates

| Gate | Evidence | Commands/runtime | PASS | BLOCKED | Continue authorization |
|---|---|---|---|---|---|
| Diagnostic | REC-0A traces | Android trace + duplicate dispatch tests | cause proven and one POST | duplicate cause unknown | REC-0A commit accepted |
| Schema | migrations reviewed | schema/contract tests | tables/constraints match contract | missing invariant | DB slot approved |
| DB/RLS | positive/negative RLS | DB/RLS suites | no cross-scope leak | denied valid or leaked invalid | security review pass |
| Backend contract | endpoint/RPC tests | backend contract suites | canonical responses/replay | non-idempotent write | backend gate pass |
| Reliability | replay/conflict tests | planner reliability suites | no duplicate, safe replay | bypassed runtime | reliability gate pass |
| Frontend | screen/service tests | frontend suites | states and navigation work | unsafe optimistic success | UI gate pass |
| Migration | dry-run/batch ledger | migration scripts/tests | counts and conflicts accounted | unmapped destructive case | migration gate pass |
| Integrated QA | end-to-end matrix | full tests | no P0/P1 regressions | broken core flow | QA pass |
| Android runtime | real device/emulator | manual acceptance | one POST/action, expected UI states | runtime mismatch | Android pass |
| Final cleanup | diff/audit | full regression and docs | no legacy visible root | unsafe removal | user approval |

## 29. Test Strategy

| Layer | Required coverage |
|---|---|
| Unit | DTO adapters, progress/readiness, importance/function validation, Draft TTL, tombstone criteria |
| Contract | Plan graph, backend request/response, error taxonomy, replay/noop/conflict |
| DB | zero-or-one links, constraints, activation transaction, migration batches, purge eligibility |
| RLS | Plan/Task/Event/Milestone/Measurement/Requirement/Draft/Preset/Evidence/Attention/Activity/Trash |
| Backend | activation, lifecycle, requirement annulment, evidence attempts, retention jobs |
| Frontend | screens/sheets pending/offline/stale/uncertain, resolver navigation, Attention primary/Open |
| Reliability | mutation ID, payload hash, X-Mutation-Id, Idempotency-Key, durable queue, replay, single-flight |
| Integration | prepared hidden, activation materialization, Home/Search/cache, Activity redaction |
| Migration | Goal, `task.goal_id`, Manual Condition, legacy percentage, Search/Home resolver |
| Cleanup | cancelled 30d, auto-Trash 7d, manual Trash 30d, hard delete/tombstone, evidence purge |
| Android runtime | REC-0A, one POST/action, offline retry, activation, pause, completion, evidence upload |

Mandatory cases: zero-or-one links, invalid importance/function, prepared items hidden, atomic activation, replay, duplicate prevention, Requirement gates, annulment audit, lifecycle, recurrence, Final Event, Draft TTL, Preset preview, Evidence, self-verification, Attention invalidation, Activity redaction, retention windows, purge, tombstones, Goal migration, Home/Search resolver, offline, REC-0A.

## 30. Observability

Events/traces contain no sensitive content.

| Event | Fields |
|---|---|
| mutation accepted | mutation ID, domain, action, plan ID hash, expected version |
| replay | mutation ID, replay outcome, original status |
| duplicate suppressed | operation key, domain, suppression point |
| conflict | entity type, expected/current version, action |
| uncertain | mutation ID, adapter stage, retry count |
| activation started/committed | plan ID hash, prepared counts, link counts, duration |
| materialization counts | prepared tasks/events, productive created/replayed |
| migration batches | batch ID, source count, success, conflicts, duration |
| cleanup | job, scanned, purged, tombstoned, skipped |
| evidence upload | attempt ID hash, upload identity, state, retry count |
| RLS denial | entity type, action, scope, policy reason class |
| resolver redirect | source type, mapped/unmapped/purged result |

## 31. Technical Freeze Summary

| Area | Status |
|---|---|
| Product contract | `PRODUCT_FROZEN` |
| Technical architecture | `TECHNICAL_FROZEN` |
| Data model | `TECHNICAL_FROZEN` |
| Roadmap | `TECHNICAL_FROZEN` |
| Implementation | `BLOCKED` until Phase 0 Freeze approval |
| Remaining runtime validations | REC-0A trace, Android acceptance, migration dry-runs, RLS/storage runtime, purge runtime |

No product decisions are reopened. No central architecture decisions are deferred to implementation. Remaining work is runtime validation, implementation, migration execution, QA, and user approval.

## 32. Final Verdict

```text
PLANNER_PHASE_0D_TECHNICAL_ARCHITECTURE_AND_ROADMAP_FROZEN
PHASE_0_FREEZE_PENDING
```

Phase 0D-B freezes the Planner technical architecture, canonical data model, backend/frontend contracts, migrations, Reliability/offline rules, RLS/Storage/retention design, implementation order, gates, tests, Android acceptance, rollback, and cutover roadmap.

Planner is not implemented. Phase 0 is not complete until the user approves Phase 0 Freeze.
