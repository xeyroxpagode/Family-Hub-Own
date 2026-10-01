# PLANNER PHASE 0B - PRODUCT STRESS TEST RESULTS

STATUS: `PHASE_0B_PRODUCT_MODEL_PROPOSED — NOT FROZEN`

RESULT: `PLANNER_PHASE_0B_PRODUCT_STRESS_TESTS_COMPLETE`

## 1. Refs And Safety

| Item | Value |
|---|---|
| Active worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation` |
| Branch | `planner-v1-plans-reconciliation` |
| Initial HEAD | `bb5dea3` |
| V1 reference worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\reference-v1` |
| V1 ref | `f093bffaa7a7db6db7fc1b0072ba90352325a90a` |

Initial safety commands executed:

```text
git branch --show-current -> planner-v1-plans-reconciliation
git rev-parse --short HEAD -> bb5dea3
git status --short ->
 M front/mi-front-limpio/components/planner/PlannerSheetHost.tsx
?? front/mi-front-limpio/services/planner/planCompositionTrace.ts
```

Preexisting dirty state preserved and not modified:

| Path | State | Classification |
|---|---|---|
| `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | `M` | REC-0A instrumentation |
| `front/mi-front-limpio/services/planner/planCompositionTrace.ts` | `??` | REC-0A instrumentation helper |

Mandatory documents read in full:

| Source |
|---|
| `docs/implementation/planner/PLANNER_PHASE_0A_EVIDENCE_AND_DECISION_MAP.md` |
| `docs/implementation/planner/PLANNER_PHASE_0_STRESS_TEST_CATALOG.md` |
| `docs/implementation/planner/PLANNER_FINAL_PRODUCT_AND_EXECUTION_BLUEPRINT.md` |
| `docs/implementation/planner/PLANNER_V1_FIRST_PORT_MANIFEST.md` |

Additional consulted sources:

| Source |
|---|
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md` |
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_REPORT.md` |
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md` |

No production code, backend, tests, migrations, Supabase files, V1 reference files, or REC-0A instrumentation were changed for this phase.

## 2. Evaluation Model

Each proposal was evaluated against these criteria:

| Criterion | Meaning |
|---|---|
| Daily utility | Solves recurring practical user work, not only a theoretical modeling case |
| Speed | Does not force unnecessary setup for common flows |
| Clarity | Can be explained without technical vocabulary |
| Decision load | Keeps required user choices low by default |
| Simple-case fit | Works for one-off household work |
| Complex-case fit | Scales to multi-step, multi-person, deadline-driven plans |
| Predictability | Same user action has the same visible result |
| Recoverability | Drafts, Trash, correction, reopen, and restore paths are understandable |
| Offline compatibility | Local intent can be preserved and replayed safely |
| Privacy/permissions | Personal and household scopes do not leak |
| Data integrity | Links and lifecycle cannot silently corrupt history |
| Reliability compatibility | Writes can use mutation identity, idempotency, replay, and single-flight |
| V1 migration | Existing useful Goal/Task behavior can be preserved without dual roots |
| Accessibility | Flow does not depend on hidden gestures or color-only meaning |
| Scalable simplicity | Advanced structure exists without forcing overconfiguration |

Classifications used:

| Result | Meaning |
|---|---|
| `PASS` | Useful, clear, and technically aligned |
| `PASS_WITH_SIMPLIFICATION` | Product survives only if simplified for default use |
| `CONDITIONAL_PASS` | Product direction is right but must be guarded by DB/runtime validation or permissions |
| `FAIL_REDUNDANT` | Duplicates a clearer entity |
| `FAIL_TOO_COMPLEX` | Adds more configuration than value |
| `FAIL_MISLEADING` | Produces incorrect user understanding |
| `FAIL_UNSAFE` | Risks privacy, data integrity, or replay correctness |
| `NEEDS_DB_VALIDATION` | Product decision is desirable but DB contract must be validated or extended |
| `NEEDS_RUNTIME_VALIDATION` | Product decision is desirable but frontend/runtime behavior must be proven |
| `NEEDS_USER_APPROVAL` | Product recommendation must be explicitly approved before freeze |

## 3. Plan Model Stress Test

### Scenario Results

| Scenario | Objective | Main entities | Secondary entities | Blockers | Next step | Completion signal | Lifecycle | Result |
|---|---|---|---|---|---|---|---|---|
| Weekly family cleaning | Keep recurring cleaning accountable | Tasks | Event, Preset, Activity, Verification | Person unavailable, task pending review | Next assigned cleaning task | Required tasks done or verified for the week | Active recurring routine, not closed weekly unless modeled as weekly Plan instance | `PASS_WITH_SIMPLIFICATION` |
| Birthday preparation | Prepare for celebration date | Plan, Tasks, final Event | Milestones, Preset | Final Event cancelled, key task unfinished | Buy/reserve/prepare next item | Event happened plus essentials done | Draft -> active -> completed -> archived | `PASS` |
| Move organization | Coordinate many steps and deadlines | Plan, Milestones, Requirements, Tasks, Events | Archive, Activity | Lease/booking/permit unresolved | Resolve top blocker | Move completed or Plan closed if abandoned | Draft -> active -> paused optional -> completed/closed -> archive | `PASS` |
| Saving for purchase | Track numeric target | Plan, Measurement | supporting Tasks, target date | Wrong value, target missed | Record current amount | Measurement target reached and user completes Plan | Draft -> active -> completed | `PASS` |
| Car maintenance | Prepare and attend service | Event, Tasks | Plan, evidence receipt | Appointment rescheduled, safety prep missing | Confirm appointment or prep task | Appointment attended and receipt kept | Active -> completed -> archived | `PASS` |
| Medical follow-up | Manage private appointment/treatment | Event, Tasks, Requirements | Measurement if recurring metric | Privacy leak, approval/result pending | Attend appointment or log result | Required follow-up done or treatment closed | Personal active -> completed/closed | `CONDITIONAL_PASS` for privacy validation |
| Room renovation | Finish physical project | Plan, Milestones, Tasks, Measurements | Requirements, Events | Budget/material approval | Complete next phase | Milestones done, budget acceptable, final review | Active -> paused optional -> completed/closed | `PASS` |
| Family trip | Prepare and execute travel | Plan, Events, Tasks, Requirements | Milestones, Preset | Tickets/passports unresolved | Book or prepare next required item | Trip happened and post-trip tasks done | Draft -> active -> completed -> archive | `PASS` |
| School project | Deliver assignment | Plan, Milestones, Tasks | Event deadline, Measurement pages/percent if external | Missing requirement, review pending | Finish next section | Submission complete | Active -> completed | `PASS` |
| Document organization | Sort and store documents | Tasks, Milestones | Measurement count, evidence optional | Missing document, privacy | Sort next batch | All critical categories done | Active -> completed or closed if abandoned | `PASS_WITH_SIMPLIFICATION` |
| Important purchase | Research and buy item | Plan, Requirements, Tasks, Measurement budget | Event appointment | Approval/budget not met | Compare/budget next action | Purchase made and supporting docs saved | Draft -> active -> completed | `PASS` |
| Recurring pet care | Keep recurring care reliable | Tasks, Events | Measurement weight/medicine count, Preset | Missed dose, vet appointment | Next care task/event | Routine remains active; individual occurrences complete | Active recurring, closed only when care plan ends | `PASS_WITH_SIMPLIFICATION` |

### Minimum Useful Combinations

| Question | Decision | Result |
|---|---|---|
| Can a Plan exist only with Tasks? | Yes as a product concept when it coordinates multiple actions toward one outcome, but Current activation still needs a structural node unless DB/link contract changes. | `NEEDS_DB_VALIDATION` |
| Can a Plan exist only with Events? | Yes for event-driven plans like birthday/trip/medical follow-up when at least one Event defines the commitment. Current needs a structural node or event requirement binding. | `NEEDS_DB_VALIDATION` |
| Can a Plan exist only with Milestones? | Yes. This is useful for phased outcomes and is already activatable in Current. | `PASS` |
| Can a Plan exist only with Measurement? | Yes. Savings, weight, budget, boxes, kilometers, and sessions validate it. | `PASS` |
| What combination makes it useful? | One clear objective plus at least one actionable signal: Task, Event, Milestone, Measurement, or Requirement-bound next step. | `PASS` |
| What combination allows activation today? | Current DB: one non-trashed Milestone, Measurement, or Manual Condition and no pending necessary external requirement. Product recommendation removes visible Manual Condition from default. | `PASS_WITH_SIMPLIFICATION` |
| What combination allows completion? | Human completion after blockers are resolved or explicitly overridden. Completed Tasks that require verification must be verified first when they are essential. | `CONDITIONAL_PASS` |
| What makes a Plan different from a Task list? | A Plan has an objective, lifecycle, blockers, phases, measurements, commitments, and a closure decision. A Task list is only executable actions. | `PASS` |
| When is a Plan too small? | If it has one action, no blocker, no date commitment, no numeric target, and no need for recovery/history beyond the Task, it should be a Task. | `PASS` |
| When is a Task too large? | If it needs multiple assignees, phases, blockers, external dates, recurring checkpoints, or a completion/closure decision, it should become a Plan. | `PASS` |

### User Orientation Rules

| Rule | User-facing copy |
|---|---|
| Use Task | "Es una acción concreta que alguien puede hacer." |
| Use Event | "Tiene día y hora, o representa un compromiso." |
| Use Plan | "Tiene un objetivo con varias partes, bloqueos o seguimiento." |
| Use Milestone | "Marca que una etapa importante ya se logró." |
| Use Measurement | "Querés registrar un número hasta llegar a una meta." |
| Use Requirement | "Algo tiene que cumplirse antes de empezar o cerrar." |

RECOMMENDATION: Plan is a flexible root combining execution, time, outcomes, measurements, and blockers. It must not force one progress mode.

WHY: The tested scenarios show that real household planning varies by shape. A savings Plan and a moving Plan are both valid but should not share a fake percentage formula.

REJECTED: A Goal-like root with one selected progress mode is rejected as `FAIL_MISLEADING`.

PROBLEM SOLVED: Planner can handle daily routines, deadline events, numeric targets, and complex projects without duplicating entities.

COST ADDED: The Detail surface needs clear sections and defaults, not a single simple progress bar.

DB/RUNTIME LEFT: Task-only and Event-only activation need DB validation because Current activation does not count bound external Task/Event links as useful structure yet.

## 4. Entity Roles

### Task

| Tested role | Decision | Result |
|---|---|---|
| Principal action | Counts toward Plan only through explicit link effect and verification rule | `PASS` |
| Supporting action | Visible but not required unless effect says it blocks | `PASS` |
| Blocks another thing | Should be represented as link effect or Requirement, not hidden inside Task status | `CONDITIONAL_PASS` |
| Requires verification | Contributes only after verified when essential | `PASS` |
| Recurrent | Belongs to Task domain; Plan can show current occurrence/series summary | `NEEDS_RUNTIME_VALIDATION` |
| Does not affect progress | Allowed as support/context | `PASS` |
| Belongs to more than one Plan | Allowed product-wise when link metadata is per Plan | `NEEDS_DB_VALIDATION` |
| Cancelled | Hidden from active work, not counted completed, can be reactivated | `PASS` |
| Archived | Task archive is not recommended as first-class; use completed/cancelled/trash/filter history | `FAIL_REDUNDANT` |
| Deleted | Use Trash first, not hard delete | `PASS` |

RECOMMENDATION: Task is an executable action. It is never a phase, target, approval, or numeric tracker.

WHY: It keeps daily use fast and lets Plan Detail show what can be done now.

SE RECHAZA: Treating every Plan requirement as a Task is `FAIL_TOO_COMPLEX` because approvals, budgets, final events, and measurements become fake actions.

QUÉ QUEDA PARA DB/RUNTIME: Durable Plan-Task link, cross-Plan cardinality, and automatic satisfaction must be validated in 0D.

### Event

| Role | Decision | Result |
|---|---|---|
| Context | Show in Plan but do not block | `PASS` |
| Commitment | Show as next commitment | `PASS` |
| Intermediate date | Link effect `checkpoint` or `defines_date` | `PASS_WITH_SIMPLIFICATION` |
| Checkpoint temporal | Prefer Event over Milestone if it has date/time | `PASS` |
| Main event | Can be central to Plan | `PASS` |
| Final event | Can enable ready-to-close, not auto-complete silently | `NEEDS_DB_VALIDATION` |
| Blocking event | Allowed when attendance/outcome is required | `CONDITIONAL_PASS` |
| Recurring occurrence | Link series by default; occurrence binding only when user chooses this occurrence | `NEEDS_DB_VALIDATION` |
| Event enabling close | Allowed as final event effect | `CONDITIONAL_PASS` |

RECOMMENDATION: Event is a time commitment. It can contextualize, checkpoint, define a final commitment, or block Plan completion based on link effect.

SE RECHAZA: Treating all Events as blockers is `FAIL_MISLEADING`. Treating all Events as context is also `FAIL_MISLEADING`.

### Milestone

| Role/capability | Decision | Result |
|---|---|---|
| Significant result | Primary role | `PASS` |
| Phase reached | Primary role | `PASS` |
| Checkpoint | Allowed when not date/time specific | `PASS` |
| Task grouper | Do not make it a folder by default; can display related Tasks later | `PASS_WITH_SIMPLIFICATION` |
| Automatic consequence | Supported when children Requirements are all satisfied | `CONDITIONAL_PASS` |
| Manual confirmation | Supported and understandable | `PASS` |
| Complete manually | Yes for manual milestones | `PASS` |
| Reopen | Yes, with Activity | `PASS` |
| Link Tasks/Events | Yes as related/contributing items, not hard ownership | `NEEDS_DB_VALIDATION` |
| Block Plan completion | Yes when necessary and pending | `PASS` |

RECOMMENDATION: Milestone is the best visible representation of meaningful progress in phased Plans.

SE RECHAZA: Making Milestones automatic-only is `FAIL_TOO_COMPLEX`; users need manual phase confirmation.

### Measurement

| Case | Decision | Result |
|---|---|---|
| Money saved | Primary Measurement with history | `PASS` |
| Boxes prepared | Measurement if count matters more than individual box Tasks | `PASS` |
| Weight | Personal Measurement, privacy-sensitive | `CONDITIONAL_PASS` |
| Sessions done | Measurement if exact count matters | `PASS` |
| Budget consumed | Measurement with `lte` target | `PASS` |
| Rooms finished | Prefer Milestones unless count itself is the target | `PASS_WITH_SIMPLIFICATION` |
| Kilometers | Measurement with history | `PASS` |
| External percentage | Measurement only if source is real and user understands it | `CONDITIONAL_PASS` |

Measurement adds more than Tasks/Milestones when the user needs a numeric current-vs-target value, corrections, and history. It becomes unnecessary when the user only needs a checklist.

RECOMMENDATION: Measurement can be the primary Plan progress signal and needs history. It can block completion when marked necessary and target is not reached.

SE RECHAZA: Using Measurement to recreate universal Plan percentage is `FAIL_MISLEADING`.

### Requirement

| Requirement type | Decision | Result |
|---|---|---|
| Condition before start | Blocks activation when necessary and unresolved | `PASS` |
| Approval | Requirement, not Task, unless the app actor can perform it | `PASS` |
| External dependency | Requirement with external reference when bindable | `NEEDS_DB_VALIDATION` |
| Final blocker | Blocks completion | `PASS` |
| Legal requirement | Requirement with explicit copy | `PASS` |
| Safety requirement | Requirement, may block completion even if supporting Tasks are done | `PASS` |
| Referenced Task/Event | Use Requirement only for semantic blocker; use Plan link for normal execution/context | `PASS_WITH_SIMPLIFICATION` |

RECOMMENDATION: Requirement is a blocker or condition. It should be visible only when it changes activation, completion, or readiness.

SE RECHAZA: Using external Requirement as the only semantic substitute for all Plan-Task/Event links is `FAIL_MISLEADING`.

### Manual Condition

Stress attempt:

| Candidate case | Better entity | Reason |
|---|---|---|
| "Confirmar que todo está listo" | Milestone | It is a meaningful phase/result |
| "Tengo permiso" | Requirement | It blocks start/finish and may be external |
| "Revisé la habitación" | Task or Milestone | It is either an action or a phase confirmation |
| "Objetivo sí/no" | Milestone | More understandable label and lifecycle |
| "Aprobado manualmente" | Requirement | Approval is a condition, not a standalone product surface |

No three everyday cases were found where Manual Condition is clearer than Milestone, Requirement, Task, or Measurement.

RECOMMENDATION: Do not expose Manual Condition as a visible product surface in the default Planner.

WHY: It duplicates clearer entities and requires explaining an abstract binary checkpoint.

SE RECHAZA: Visible `Manual Condition` editor is `FAIL_REDUNDANT` and `FAIL_TOO_COMPLEX`.

QUÉ PROBLEMA RESUELVE: Internally it may preserve Current activation compatibility or migrated boolean progress.

QUÉ COSTO AGREGA: If visible, it adds a fifth structure type that users cannot distinguish from Milestone/Requirement.

QUÉ QUEDA PARA DB/RUNTIME: Keep internally only if Current DB needs it for legacy boolean migration or activation compatibility. Product UI should label migrated cases as a simple Milestone or Requirement.

## 5. Progress Stress Test

### Alternatives

| Alternative | Result | Decision |
|---|---|---|
| A. No general percentage | `PASS` | Good base, but needs an at-a-glance summary |
| B. Main elements resolved | `PASS_WITH_SIMPLIFICATION` | Useful if defaults/presets mark primary items without forcing setup |
| C. Milestones as backbone | `PASS_WITH_SIMPLIFICATION` | Strong for phased Plans, weak for measurement-only and event-only Plans |
| D. Derived qualitative signals | `PASS` | Best for non-technical clarity and mixed entities |
| E. Weighted system | `FAIL_TOO_COMPLEX` | Requires configuration and creates misleading precision |
| F. Hybrid | `PASS` | Recommended model |

### Edge Case Results

| Edge case | Recommended behavior |
|---|---|
| 20 small Tasks and one critical Milestone | Show qualitative status plus "Milestone pending" and primary count, not 20/21 percent |
| One Measurement and many supporting Tasks | Measurement is primary; Tasks are support unless essential |
| Final Event pending while all else done | Show `ready except final event`; do not complete automatically |
| Blocking Requirement | Show blocked/needs requirement; do not bury in percentage |
| Verifiable Task in review | Show `awaiting verification`; it does not count as resolved if essential |
| Cancelled elements | Exclude from done counts; show in history/cancelled filter |
| Archived elements | Archive applies mainly to terminal Plans, not active progress elements |
| Trashed elements | Exclude from active progress; restore recomputes |
| Plan without enough structure | Show `needs structure before activation`, not 0% |
| Recurring Plan | Show current cycle/next occurrence and routine health, not final percent |

RECOMMENDATION: Use hybrid progress.

Product model:

| Layer | Rule |
|---|---|
| General summary | Qualitative: `recién iniciado`, `avanzando`, `bloqueado`, `cerca de completarse`, `listo para cerrar` |
| Main count | `N de M elementos principales resueltos` when primary elements exist |
| Specific indicators | Separate Tasks, Milestones, Measurements, Requirements, Events |
| Percent | Only for Measurements that naturally are percentages or numeric targets with clear unit |
| Completion | Human action gated by blockers and verification |

SE RECHAZA: Universal percentage and weighted progress are rejected as `FAIL_MISLEADING` and `FAIL_TOO_COMPLEX`.

QUÉ QUEDA PARA DB/RUNTIME: Link metadata must identify primary/supporting and effect. External Task/Event satisfaction must be validated.

## 6. Plan-Task And Plan-Event Links

### Importance

| Alternative | Result | Decision |
|---|---|---|
| principal / secundaria | `PASS` | Recommended user-facing labels |
| essential / support | `PASS_WITH_SIMPLIFICATION` | Good internal meaning but less natural in Spanish UI |
| contributes / context | `FAIL_MISLEADING` as importance | This is effect, not importance |
| no explicit classification | `FAIL_MISLEADING` | Breaks progress/readiness clarity |

### Effect

| Effect | Product role | Visibility |
|---|---|---|
| contributes | Counts as work toward Plan | Default for Tasks created from Plan |
| blocks activation | Prevents activation/start | Advanced, Requirement-like |
| blocks completion | Prevents completion until resolved | Advanced/visible when blocking |
| defines date | Sets target/checkpoint date | Event default when created from date context |
| final event | Enables ready-to-close around event | Advanced for Events |
| context | Visible related item, no progress/blocker effect | Default for existing external Events |
| no effect | Link note only; rarely visible | Advanced/remove recommendation |

### Tested Link Cases

| Case | Recommended handling |
|---|---|
| Task principal that does not block | Importance `principal`, effect `contributes` |
| Supporting safety Task that blocks | Importance `secundaria`, effect `blocks_completion`; copy explains safety blocker |
| Final Event | Importance `principal`, effect `final_event` |
| Context Event | Importance `secundaria`, effect `context` |
| Verifiable Task | Contribution waits for verified if linked as principal/blocking |
| Cancelled Task | Excluded; if blocking, Plan shows blocker resolved by cancellation decision or asks to replace/remove link |
| Recurrent Event | Link series by default; occurrence link only from occurrence edit/context |
| Task shared by two Plans | Same Task, separate link metadata per Plan |
| Event shared by two Plans | Same Event, separate link metadata per Plan |
| Removed from Plan but not Planner | Remove link only; Task/Event remains in its domain |
| Archived Plan with active elements | Archive Plan does not archive linked elements |
| Closed Plan with active recurrence | Confirm recurring linked Event/Task remains active outside closed Plan |

RECOMMENDATION: Use two link dimensions: `importance` and `effect`.

Defaults:

| Entry | Importance default | Effect default |
|---|---|---|
| Create Task from Plan | principal | contributes |
| Link existing Task | secundaria | contributes |
| Create Event from Plan with date | principal | defines_date |
| Link existing Event | secundaria | context |
| Mark final Event | principal | final_event + blocks completion until event is resolved or cancelled handling is confirmed |

Visible fields:

| Field | Default visibility |
|---|---|
| Importance | Visible as simple `Principal` / `De apoyo` when adding/linking |
| Effect | Hidden behind smart defaults; visible in advanced options or blocker/final-event flows |

Automatic rules:

| Rule | Behavior |
|---|---|
| Tasks created inside active Plan | Link automatically to that Plan |
| Events created from Plan date/final action | Link automatically with date/final effect |
| Removing link | Does not delete Task/Event |
| Trash Task/Event | Plan shows missing/trashed linked item and excludes from active progress |
| Cancel final Event | Ask whether to replace final Event, close Plan, or keep blocked |

Cases requiring confirmation:

| Case | Confirmation |
|---|---|
| Remove principal/blocking link | Confirm because progress/readiness changes |
| Cancel principal/blocking Task | Ask whether blocker is no longer needed or replacement is needed |
| Archive/close Plan with active recurring linked items | Confirm recurrence remains active outside Plan |
| Link personal item into household Plan | Block or require explicit share depending DB permission model |

QUÉ QUEDA PARA DB/RUNTIME: External Requirement alone is not enough unless extended to carry both dimensions and durable entity/occurrence binding. 0D must validate whether `planner_plan_requirements` can serve or whether a dedicated link table is needed.

## 7. Plan Lifecycle

| State/projection | Human meaning | Decision |
|---|---|---|
| Draft | "Todavía lo estoy armando." | Plan exists but is not running |
| Active | "Está en marcha." | Tasks/Events/structure can be added; recurrence continues in own domains |
| Paused | "Lo dejamos en espera." | Plan progress attention pauses, but existing scheduled Tasks/Events need confirmation |
| Completed | "Lo logramos." | Achieved; can archive; can reopen |
| Closed | "Lo cerramos sin seguirlo como logrado." | Abandoned, no longer relevant, superseded, or intentionally stopped |
| Blocked | Projection, not lifecycle | Derived from unresolved blockers |
| At risk | Projection, not lifecycle | Derived from dates/blockers/overdue essential items |
| Ready to complete | Projection/action prompt | Derived from resolved primary items and blockers |
| Archive | Visibility/preservation flag for terminal Plans | Not lifecycle |
| Trash | Recoverable deletion state | Orthogonal hidden state |

Draft decisions:

| Question | Decision |
|---|---|
| When exists | After base Plan create or Plan Preset draft generation |
| Minimum activation structure | Current: Milestone or Measurement, plus no unresolved necessary external Requirement. Product wants Task/Event-only activation after DB validation. |
| Preset-created Plan | Plan Preset should create a Draft, not immediate active Plan |
| Real Tasks/Events before activation | Allowed only if user confirms, because they become productive domain entities |

Active decisions:

| Question | Decision |
|---|---|
| Meaning | The Plan is being executed and appears in active Planner surfaces |
| Add elements | Tasks, Events, Milestones, Measurements, Requirements can be added if permitted |
| Recurrence | Recurrence belongs to Task/Event domains; Plan shows linked series/occurrences |

Paused decisions:

| Question | Decision |
|---|---|
| What pauses | Plan attention/progress urgency and optional generated future work |
| What does not pause | Existing scheduled Events/Tasks unless user chooses to pause/cancel them |
| Confirmation | Required when active future Tasks/Events exist |

Completed decisions:

| Question | Decision |
|---|---|
| Who completes | Authorized Plan actor, manually |
| Blockers | Necessary unresolved items block unless explicit override is allowed by backend and copy explains consequence |
| Pending Tasks | Ask: leave active, cancel, or keep as follow-up if principal/blocking |
| Recurrences | Ask whether linked recurrence continues outside completed Plan |
| Reopen | Yes, returns to active and clears archive |

Closed decisions:

| Question | Decision |
|---|---|
| Difference from Completed | Completed means achieved; Closed means stopped/no longer tracked |
| Use cases | Abandoned, replaced, no longer relevant, impossible, duplicate |
| Reason | Required short reason for close |
| Reopen | Yes if not trashed and permitted |
| Relation to Archive | Closed can be archived after terminal transition |

RECOMMENDATION: Keep Completed and Closed as separate states.

WHY: Users need to distinguish "lo terminamos" from "lo dejamos". Archive only hides preserved terminal items and cannot express achievement.

SE RECHAZA: Merging Completed and Closed is `FAIL_MISLEADING`.

## 8. Task Lifecycle

| Technical state/step | Human label | Actor sees | Verifier sees | Plan contribution |
|---|---|---|---|---|
| created/pending | Pendiente | "Por hacer" | N/A | Not resolved |
| assigned | Asignada | Assignee visible | N/A | Not resolved |
| claimed | Tomada | "La estoy haciendo" | N/A | Not resolved |
| reassigned | Reasignada | New assignee owns | N/A | Not resolved |
| completed no verification | Hecha | Done | N/A | Resolved if linked |
| completed with evidence | En revisión | Submitted | Needs verify/correct | Not resolved if verification required |
| verified | Verificada | Done | Approved | Resolved |
| correction_requested | Corrección pedida | Needs correction | Waiting resubmit | Not resolved |
| resubmitted | En revisión otra vez | Submitted again | Needs verify/correct | Not resolved |
| cancelled | Cancelada | Hidden from active by default | N/A | Excluded; blocker requires confirmation |
| reactivated | Reactivada | Back to pending | N/A | Not resolved |
| trashed | En papelera | Hidden | Hidden | Excluded |
| restored | Restaurada | Previous active state | Previous relevant state | Recomputed |

Evidence previous attempts must remain attached to the attempt unless retention/purge rules remove them. If the same person attempts verification, backend self-verification prohibition applies. If verifier does not respond, Attention remains and escalation/reminder is a product extension, not automatic approval.

Offline behavior: completion intent can be queued, but evidence upload may remain `pending upload`. The Task should show `Enviando evidencia` or `En revisión cuando se sincronice`, not falsely verified.

RECOMMENDATION: Task lifecycle should keep human labels and hide backend technical status names from normal users.

## 9. Event Lifecycle And Recurrence

| Case | Decision | Result |
|---|---|---|
| Unique Event | Scheduled/cancelled/past states are enough | `PASS` |
| All-day | Keep all-day shape with timezone-safe date | `PASS` |
| Participants/RSVP | RSVP is participant state, not Event completion | `PASS` |
| Cancellation | Cancelled Event remains historical and can be reactivated where allowed | `PASS` |
| Event realization | No default "done" button for every Event | `PASS_WITH_SIMPLIFICATION` |
| Past Event | Past does not automatically satisfy Plan unless effect says final/checkpoint and confirmation rule passes | `CONDITIONAL_PASS` |
| Recurrence | Series and occurrence remain distinct | `PASS` |
| Edit occurrence | Must expose this occurrence / this and following / whole series | `NEEDS_RUNTIME_VALIDATION` |
| Timezone | Current contract stays authority | `PASS` |
| Event linked to Plan | Link metadata determines effect | `NEEDS_DB_VALIDATION` |
| Final Event | Cancellation triggers Plan decision | `CONDITIONAL_PASS` |

RECOMMENDATION: Event does not need a universal `realizado` state. Attendance/RSVP are participant-specific, and Plan satisfaction is link-effect-specific.

WHY: A past event is not always a successful event. A cancelled final Event should not silently complete or fail a Plan.

## 10. Presets

### Preset Classes

| Class | Decision | Result |
|---|---|---|
| HomePlus | Immutable, not editable, not removable, not archivable | `DECIDED_BY_USER` |
| Personal | Owner-only, editable, revisioned, trashable with retention | `PASS` |
| Household | Household-visible, permission-gated, owned by household/source actor | `CONDITIONAL_PASS` |

### Application Models

| Model | Task Preset | Event Preset | Plan Preset | Result |
|---|---|---|---|---|
| Prefill form | Good for Tasks/Events with dynamic fields | Good for date/time/location | Weak for multi-entity Plans | `PASS` |
| Immediate creation | Good only for low-risk Tasks with enough defaults | Risky for Events because time/date matters | Unsafe for Plans | `CONDITIONAL_PASS` |
| Draft generated | Useful when review is needed | Useful for complex Event | Best default for Plan | `PASS` |
| Blueprint multi-entity | Too much for Task/Event | N/A | Strong for birthday/move/trip | `NEEDS_DB_VALIDATION` |
| Inline quick suggestions | Best speed for common Tasks/Events | Good from date/calendar context | Good as suggestion into Plan Draft | `PASS` |

### Scenario Results

| Preset case | Recommended flow |
|---|---|
| Take out trash | Inline Task suggestion, immediate create if assignee/due defaults are known |
| Clean bathroom | Inline Task preset -> prefilled form or immediate create if routine context known |
| Grocery shopping | Task or Plan depending list complexity; prefill, not immediate if items needed |
| Pay bill | Task preset requiring amount/due/service review |
| Medical appointment | Event preset prefill; user must choose date/time and privacy |
| Birthday | Plan preset creates Draft blueprint with final Event and suggested Tasks |
| Weekly cleaning | Plan or routine preset creates Draft/recurrent structure preview |
| Move | Plan preset must generate reviewable Draft; no immediate create |
| Car maintenance | Plan/Event preset based on entry; appointment date dynamic |

RECOMMENDATION BY TYPE:

| Type | Recommendation |
|---|---|
| Task Preset | Inline suggestions first. Immediate creation only for trivial low-risk presets with all required fields known; otherwise prefill quick form. |
| Event Preset | Prefill form from context. Never immediate unless date/time is already selected and user confirms. |
| Plan Preset | Generate reviewable Draft blueprint. Multi-entity generation requires preview and DB/Reliability validation before productive apply. |

SE RECHAZA: Forcing users through a preset library for common actions is `FAIL_TOO_COMPLEX`. Immediate Plan creation from preset is `FAIL_UNSAFE`.

QUÉ QUEDA PARA DB/RUNTIME: Multi-entity Plan preset atomicity, idempotency, rollback/repair, and link creation must be validated.

## 11. Drafts

### Entry Pattern Results

| Pattern | Result | Decision |
|---|---|---|
| Modal blocking always | `FAIL_TOO_COMPLEX` | Interrupts quick create too often |
| Sheet only when compatible Draft exists | `PASS` | Good default |
| Contextual banner | `PASS` | Good for returning to domain/detail |
| Central exclusive section | `FAIL_TOO_COMPLEX` | Drafts should not become a main product domain |
| Contextual + central | `PASS_WITH_SIMPLIFICATION` | Recommended: contextual first, central recovery secondary |

Draft rules:

| Question | Decision |
|---|---|
| When ask | When a compatible live Draft exists for the same entity type/context/preset |
| When not interrupt | No compatible Draft, trivial immediate action, or user already chose "new" |
| Continue | Opens draft payload in same form/sheet |
| Create new | Keeps old Draft unless user discards it |
| Multiple drafts | Show a short chooser with title, modified time, source preset |
| Autosave | On meaningful field changes, debounce, owner-only |
| Manual save | Optional "Guardar borrador" for explicit exit |
| Discard | Explicit destructive confirmation |
| Copy | "Tenés un borrador de tarea. ¿Querés seguirlo o crear una nueva?" |
| TTL renewal | Editing renews TTL |
| Warning | Warn around 7 days before expiration |
| Attachments | Temporary owner-only attachments expire with Draft unless converted to evidence/entity attachment |
| Offline | Local draft persists; sync when online; do not create productive entity silently |

TTL recommendation: 30 days for live Drafts, renewed on edit.

RECOMMENDATION: Use contextual sheet/banner plus a secondary "Borradores" recovery entry. Draft is owner-only, not Trash, not Archive, not Activity, and not a productive entity.

WHY: It protects interrupted work without making users manage drafts as a separate workload.

SE RECHAZA: No live TTL is `FAIL_TOO_COMPLEX` over time; hard silent deletion without warning is `FAIL_UNSAFE`.

QUÉ QUEDA PARA DB/RUNTIME: `expires_at`, cleanup job, offline merge behavior, and temporary attachment storage are DB/runtime validations.

## 12. Forms And Quick Creation

| Entry point | Minimum info | Advanced info | Recommended flow | Actions estimate | Result |
|---|---|---|---|---|---|
| Task Quick Actions | title | assignee, due, verification, recurrence, Plan link | quick form + advanced disclosure | 2-5 | `PASS` |
| Task from Planner | title | same as above | sheet quick form | 2-6 | `PASS` |
| Task from Plan | title | importance/effect, assignee, verification | contextual quick form, auto-link | 2-6 | `NEEDS_DB_VALIDATION` |
| Task from Preset | preset + dynamic fields | advanced overrides | inline preset -> prefill/immediate if safe | 1-5 | `PASS` |
| Task from Draft | choose draft | all saved fields | compatible draft sheet | 1-3 | `PASS` |
| Duplicate Task | title confirmation | due/assignee reset options | duplicate -> quick review | 2-4 | `CONDITIONAL_PASS` |
| Event Quick Actions | title, date/time | location, participants, recurrence, Plan link | sheet with date context | 3-7 | `PASS` |
| Event from Calendar date | title | end time, location, recurrence | create inline from selected date | 2-6 | `PASS` |
| Event from Plan | title/date | final/context effect, recurrence | contextual Event form | 3-8 | `NEEDS_DB_VALIDATION` |
| Event Preset | date/time dynamic | location/participants/repeat | prefill, not immediate by default | 2-6 | `PASS` |
| Plan blank | objective | scope, target date, description | create base -> Detail | 2-4 | `PASS_WITH_SIMPLIFICATION` |
| Plan from Preset | objective/context confirmation | generated Tasks/Events/Milestones | reviewable Draft blueprint | 3-8 | `NEEDS_DB_VALIDATION` |
| Plan Draft | choose draft | all saved fields | continue Draft | 1-3 | `PASS` |
| Duplicate Plan | new objective | copied structure/link choices | duplicate -> Draft review | 3-7 | `CONDITIONAL_PASS` |
| Migrated Goal | no creation | mapping review if conflict | auto/compat route to Plan | 0-2 | `NEEDS_DB_VALIDATION` |
| Plan from existing set | selected Tasks/Events | link effects | create base -> link review | 4-8 | `NEEDS_DB_VALIDATION` |

Form model decisions:

| Alternative | Decision |
|---|---|
| One long universal form | Rejected `FAIL_TOO_COMPLEX` |
| Quick form + advanced | Recommended default |
| Wizard | Only for complex Plan presets/migration review |
| Progressive disclosure | Recommended |
| Create base -> Detail | Recommended for Plan |
| Inline creation | Recommended for simple Tasks and Calendar Events |
| Sheets | Recommended mobile-first surface |

RECOMMENDATION: Do not impose one form. Use context-specific quick surfaces with advanced options.

## 13. Verification And Evidence

| Case | Decision |
|---|---|
| Single photo | Supported evidence attempt item |
| Multiple photos | Supported with per-attempt grouping |
| Optional evidence | Allowed when Task verification does not require proof |
| Mandatory evidence | Defined by Task, Preset, or Plan link/Requirement if permitted |
| Comment | Supported alongside evidence |
| Offline task | Completion can be saved locally; evidence upload pending |
| Slow upload | Task shows upload pending, not verified |
| Failed upload | Attention item `evidence_upload_failed` for actor |
| Different verifier | Required for verification when self-verification blocked |
| Self-verification | Blocked; copy explains another person must verify |
| Correction | Creates new attempt/resubmission; previous evidence retained by policy |
| Sensitive evidence | Owner/household permission + redaction/thumbnail rules |
| Task deletion/trash | Evidence remains recoverable during retention unless purged by policy |
| Expiration | Evidence retention must be explicit; no silent indefinite sensitive storage without policy |
| Activity | Activity references evidence event but redacts content unless permitted |

RECOMMENDATION: Evidence belongs to completion attempts, not directly to Task root.

WHY: Correction/resubmit requires preserving what was submitted each time.

SE RECHAZA: A single mutable image field on Task is `FAIL_UNSAFE`.

QUÉ QUEDA PARA DB/RUNTIME: Evidence table/bucket, RLS, thumbnails, upload queue, retention, download permissions, and Activity redaction require DB/runtime validation.

## 14. Attention

| Item | Reason | Priority | Actor | Primary action | Secondary action | Destination | Mutation/result |
|---|---|---|---|---|---|---|---|
| Verify Task | Task awaiting verification | High | Verifier | Verify / Request correction | Open Task | Verification panel or Task Detail | verify/correction removes or changes item |
| Respond Event | RSVP pending | Medium | Participant | Respond | Open Event | RSVP sheet or Event Detail | RSVP removes item |
| Correct Task | Correction requested | High | Assignee | Correct and resubmit | Open Task | Completion/evidence flow | resubmit changes item to verification |
| Resolve conflict | Reliability conflict | High | Actor who initiated | Review conflict | Open affected entity | Conflict resolution surface | resolve/retry/dismiss per operation |
| Plan blocked | Necessary blocker | High | Plan owner/coordinator | Resolve blocker | Open Plan | Blocker section | blocker resolution removes item |
| Draft expiring | Draft near TTL | Low | Draft owner | Continue Draft | Discard | Draft form | edit renews TTL, discard removes item |
| Trash expiring | Recoverable item near purge | Medium | Owner/coordinator | Restore | Open Trash | Trash item | restore removes item |
| Evidence upload failed | Upload did not complete | High | Submitter | Retry upload | Open Task | Evidence attempt | retry success moves to review |

RECOMMENDATION: Attention is an action queue, not just navigation.

WHY: `Verify` and `Open` must not execute the same handler. Primary action starts the smallest safe resolution flow; secondary action navigates.

SE RECHAZA: Attention cards with only `Open` are `FAIL_MISLEADING` for actionable blockers.

QUÉ QUEDA PARA DB/RUNTIME: Frontend action contract, invalidation, stale permission handling, and item disappearance must be validated.

## 15. Activity And Activity Detail

Activity Detail must show:

| Field | Rule |
|---|---|
| What happened | Human event title, not raw mutation name |
| Who | Actor name if permitted |
| When | Timestamp |
| Household | Household context when household-scoped |
| Entity | Task/Event/Plan/Milestone/etc. |
| Related Plan | Show if viewer can read Plan |
| Previous state | Only safe fields |
| New state | Only safe fields |
| Metadata | Redacted by permission and sensitivity |
| Evidence | Thumbnail/detail only if viewer can access evidence |
| Actions | Open entity separately from Activity Detail |

Grouping decisions:

| Activity | Grouping |
|---|---|
| Task created | Individual |
| Task reassigned | Individual if assignee changed; group rapid metadata edits |
| Task completed | Individual |
| Evidence sent | Individual under completion attempt; may group multiple photos |
| Task verified | Individual |
| Correction requested | Individual |
| Event created/modified | Group rapid edits within same save operation |
| Occurrence modified | Individual, identifies occurrence |
| Plan activated/closed | Individual |
| Milestone completed | Individual |
| Entity archived/trashed/restored | Individual |
| Preset used | Individual or grouped into created entity event |
| Draft expired | Low-priority owner-only Activity or no household Activity |

RECOMMENDATION: Add Activity Detail as its own surface.

WHY: Users need to understand what changed without being forced into edit/detail screens. Privacy requires a redacted DTO, not raw metadata.

SE RECHAZA: Direct navigation from Activity row without detail is `FAIL_MISLEADING` for changes like correction/evidence/occurrence edits.

QUÉ QUEDA PARA DB/RUNTIME: Unified Activity model for Current Plan graph and privacy-safe detail DTO require validation.

## 16. Cancelled, Archive, Trash, Retention

| Domain | Cancelled | Archive | Trash | Retention recommendation |
|---|---|---|---|---|
| Task | Reversible lifecycle; auto-hide from active | No first-class archive now | Recoverable deletion | Trash 30 days candidate; cancelled no hard TTL |
| Event | Reversible cancellation; calendar hidden/filtered | No first-class archive now | Recoverable deletion | Trash 30 days candidate, series exceptions preserved |
| Plan | Use Closed, not Cancelled | Terminal-only archive for completed/closed | Recoverable deletion | Archive no expiry; Trash 30 days candidate unless references block purge |
| Recurrence | Cancel occurrence or series | N/A | Trash series only with confirmation | Preserve exceptions/history until purge safe |
| Draft | Not cancelled | Not archive | Discard/expire, not Trash product surface | Live TTL 30 days, warning before expiry |
| Personal Preset | N/A | Archive not recommended; use trash/revisions | Trash recoverable | 30 days existing direction |
| Evidence | N/A | N/A | Purge according evidence retention | Sensitive retention must be explicit |
| Activity | Never cancelled | N/A | Not user-trashable | Retain audit with redaction; purge only by policy/legal model |

Definitions:

| Concept | Meaning |
|---|---|
| Cancelled | The thing was intentionally not done/not happening, but history matters |
| Completed | The thing was achieved |
| Closed | The Plan stopped being tracked without necessarily achieved |
| Archive | Hide completed/closed history from active views without expiry |
| Trash | Recoverable deletion before possible permanent purge |
| Draft expiration | Cleanup of non-productive owner-only work |

RECOMMENDATION: Do not use the same behavior for every domain.

WHY: Cancelled appointment, closed Plan, expired Draft, and trashed Task carry different user expectations and history requirements.

SE RECHAZA: TTL + hard delete for every cancelled item is `FAIL_UNSAFE`.

QUÉ QUEDA PARA DB/RUNTIME: Trash TTL/hard delete blockers, reference-preserving purge, evidence retention, and cleanup jobs require DB validation.

## 17. Legacy Migration Product Stress Test

Tested V1 Meta shape:

| Legacy feature | Expected user experience after migration |
|---|---|
| Objective/title | Same visible Plan objective |
| Description/category | Description preserved; category shown if mapped, otherwise honest fallback |
| Dates | Target date mapped only when semantic target date is clear |
| Personal/household | Same privacy expectation, mapped to Current scope |
| Linked Tasks | Same Tasks visible inside migrated Plan and Tasks list |
| Progress | Interpretable as separated indicators, not fake old percentage |
| Completed | Current completed Plan |
| Closed/failed | Current closed Plan with reason when possible |
| Cancelled Task | Still visible in cancelled/history; not counted |
| Verifiable Task | Verification state preserved as Task fulfillment |
| Home projection | Home must never route legacy Goal ID into Current Plan Detail without resolver |
| Activity | History visible where permission allows; legacy/current split resolved or redacted |
| Trash | No duplicate Goal/Plan Trash confusion |

Migration alternatives:

| Alternative | Result | Decision |
|---|---|---|
| Automatic migration | `CONDITIONAL_PASS` | Best final UX if DB migration is safe |
| Temporary compatibility route | `PASS_WITH_SIMPLIFICATION` | Needed to avoid broken Home while migration is pending |
| Convert on open | `CONDITIONAL_PASS` | Useful fallback but risky offline/replay |
| Admin tool only | `FAIL_TOO_COMPLEX` for normal users | Not enough for consumer migration |
| Double read Goal+Plan long-term | `FAIL_MISLEADING` | Keeps two roots visible |

RECOMMENDATION: Product target is automatic or guided one-time migration to Current Plan root, with a temporary route resolver/fallback that prevents broken navigation before full migration.

WHY: Existing V1 users must see the same useful work without duplicated Goal/Plan roots.

QUÉ QUEDA PARA DB/RUNTIME: Exact migration mechanics, bridge creation, task link migration, activity mapping, and Home/Search consistency are 0D validations.

## 18. Decision Register

| ID | Topic | Previous state | Alternatives | Stress tests | Recommended alternative | Rejected alternatives | Reason | UX effect | Technical effect | DB validation | Runtime validation | User approval | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0B-001 | Plan root | DECIDED_BY_USER direction | Plan vs Goal dual root | 2,3,29,30 | Plan remains root; migrate/resolve Goals | Dual visible roots | Avoid broken navigation and duplication | One product root | Goal bridge/migration | Yes | Yes | No | `DECIDED_BY_USER` |
| 0B-002 | Plan model | NEEDS_PRODUCT_STRESS_TEST | One mode vs mixed graph | 1-12 | Mixed entities with no single mode | One progress mode | Fits all scenarios | Clear sections | Requires link/progress projection | Partial | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-003 | Manual Condition | NEEDS_PRODUCT_STRESS_TEST | Visible/internal/remove | 3,13 plus manual stress | Internal only, not visible default | Visible editor | Redundant with clearer entities | Less confusion | May still support migration/internal activation | Yes | No | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-004 | Progress | NEEDS_PRODUCT_STRESS_TEST | A-F | all Plan scenarios | Hybrid qualitative + primary count + specific indicators | Universal/weighted percent | Avoids fake precision | Better comprehension | Needs projections | Yes for external links | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-005 | Task link | NEEDS_DB_VALIDATION | Single field/two fields/inferred | 1,3,9,19,20 | Importance + effect per link | `goal_id`, untyped external requirement | Same Task can play different roles | Clear add/link choices | Link metadata required | Yes | Yes | Yes | `NEEDS_DB_VALIDATION` |
| 0B-006 | Event link | NEEDS_DB_VALIDATION | context/final/block/date | 2,5,8,10,20 | Importance + effect, occurrence-aware | All events blockers/context | Correct final/context behavior | Clear event role | Event binding/occurrence needed | Yes | Yes | Yes | `NEEDS_DB_VALIDATION` |
| 0B-007 | Completed vs Closed | PROVISIONAL | merge/separate | 3,20,legacy | Keep separate | Merge | Achieved vs stopped differs | Human wording clear | Current already supports | No | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-008 | Task lifecycle labels | PARTIAL | technical vs human | 1,7,19,21 | Human labels with verification states | Raw backend statuses | Less confusion | Clear actor/verifier views | Existing states mostly fit | Evidence DB yes | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-009 | Event realized state | PRODUCT_DECISION_REQUIRED | universal done/no done/link-specific | 5,8,10 | No universal done; Plan effect-specific | Auto past=done | Past does not mean successful | Predictable calendar | Link satisfaction needed | Yes | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-010 | Presets | NEEDS_PRODUCT_STRESS_TEST | prefill/direct/draft/blueprint/inline | 1,2,16,18 | Task inline/prefill, Event prefill, Plan Draft blueprint | Direct Plan create | Saves taps safely | Faster creation | Multi-entity apply needs atomicity | Yes | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-011 | Draft entry | NEEDS_PRODUCT_STRESS_TEST | modal/sheet/banner/central/combo | 14,15,22,27 | Contextual sheet/banner + secondary recovery | Always modal, central-only | Preserves speed | Non-disruptive recovery | TTL/attachments needed | Yes | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-012 | Draft TTL | NEEDS_DB_VALIDATION | none/30/variable | 14,15,22 | 30 days renewed on edit, warning before expiry | No TTL, silent delete | Keeps drafts useful and bounded | Expected recovery | `expires_at` and job needed | Yes | Yes | Yes | `NEEDS_DB_VALIDATION` |
| 0B-013 | Forms | NEEDS_PRODUCT_STRESS_TEST | universal/quick/wizard/create-base | 1,2,14,16,27 | Context-specific quick + advanced; Plan create-base -> Detail | One long form | Faster daily flows | Lower decision load | Preset/draft integration needed | Partial | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-014 | Evidence | NEEDS_DB_VALIDATION | task field/attempt model | 5,7,25 | Evidence per completion attempt | Mutable Task image | Supports correction/history | Clear review flow | Evidence model/storage needed | Yes | Yes | Yes | `NEEDS_DB_VALIDATION` |
| 0B-015 | Attention actions | NEEDS_RUNTIME_VALIDATION | open-only/action-specific | 7,24,25 | Primary action distinct from Open | Same handler | Real action queue | Faster resolution | Action contract/invalidation | No | Yes | No | `NEEDS_RUNTIME_VALIDATION` |
| 0B-016 | Activity Detail | NEEDS_PRODUCT_STRESS_TEST | direct nav/detail | 7,24 | Dedicated detail with redaction | Direct nav only | Explains changes safely | Better history | Current/legacy activity unification | Yes | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-017 | Retention | NEEDS_PRODUCT_STRESS_TEST | same policy/domain policy | 20,21,22,23 | Per-domain policy | One TTL for all | Matches expectations | Safer recovery | TTL/purge blockers | Yes | Yes | Yes | `RECOMMENDED_FOR_APPROVAL` |
| 0B-018 | Legacy migration UX | NEEDS_PRODUCT_STRESS_TEST | auto/compat/open/admin/double-read | 29,30 | Auto/guided migration + temporary resolver | Long-term double root | Preserves V1 utility | No duplicate Goal/Plan | Migration design | Yes | Yes | Yes | `NEEDS_DB_VALIDATION` |

Already decided by user and preserved:

| Decision |
|---|
| Plan will be the future root |
| V1 is functional baseline |
| Current preserves Reliability/security |
| Progress must not be isolated by one mode |
| HomePlus original Presets are immutable |
| Draft is not Trash or Archive |
| Draft must expire |
| Verification can use images |
| Activity needs its own Detail |
| Attention action and Open are distinct |
| Recurrence distinguishes series and occurrence |
| Product Freeze precedes implementation |

Recommended for approval:

| Decision |
|---|
| Hybrid progress model |
| Two-dimensional Plan-Task/Event link metadata |
| Manual Condition not visible as default product surface |
| Completed and Closed remain separate |
| Task/Event/Plan creation uses context-specific flows |
| Plan Presets generate reviewable Draft blueprints |
| Draft TTL 30 days renewed on edit |
| Evidence belongs to completion attempts |
| Activity Detail has redacted metadata and separate navigation actions |
| Retention policy differs per domain |

Rejected:

| Alternative | Result |
|---|---|
| Universal Plan percentage | `FAIL_MISLEADING` |
| Weighted progress | `FAIL_TOO_COMPLEX` |
| One giant form for every entity | `FAIL_TOO_COMPLEX` |
| Visible Manual Condition editor | `FAIL_REDUNDANT` |
| Immediate Plan creation from preset | `FAIL_UNSAFE` |
| Long-term Goal/Plan double root | `FAIL_MISLEADING` |
| Treat every Event as blocking or contextual | `FAIL_MISLEADING` |
| Store evidence as one mutable Task field | `FAIL_UNSAFE` |

Needs DB validation:

| Topic |
|---|
| Task-only and Event-only Plan activation |
| Durable Plan-Task/Event link metadata |
| Cross-Plan Task/Event cardinality |
| Final Event binding and occurrence identity |
| External Task/Event satisfaction rules |
| Live Draft TTL and cleanup |
| Temporary Draft attachments |
| Evidence storage/RLS/retention |
| Activity Detail DTO and Current Plan graph activity unification |
| Trash TTL, purge blockers, reference preservation |
| Legacy Goal-to-Plan migration and Home route resolver |

Needs runtime validation:

| Topic |
|---|
| Attention primary action vs Open handlers |
| Recurrence edit scopes in UI |
| Archive/unarchive reachability |
| Draft dirty-leave and compatible draft chooser |
| Preset prepare/apply flows |
| Offline draft/evidence replay |
| Activity redaction and navigation |
| Home/Search/Attention cache invalidation after migration/scope switch |

Blocked:

| Blocker | Type |
|---|---|
| Evidence cannot ship end-to-end without DB/storage model | DB |
| Multi-entity Plan Preset cannot productively apply without atomic/replay-safe link generation | DB/Reliability |
| Legacy Home Goal route can still break until resolver/migration is implemented | Product/Runtime |
| Task/Event link semantics cannot be frozen until DB model is validated | DB |

Deferred:

| Topic | Reason |
|---|---|
| Scope editing after Plan creation | Needs separate privacy/permission decision |
| Snooze/dismiss Attention | Not required for core action queue |
| Full requirement hierarchy UI | Keep advanced until simpler blockers prove insufficient |
| Generic dependencies between all entities | Current does not model them and stress tests did not justify them |

## 19. Phase 0B Result

Final proposed product model:

| Area | Recommendation |
|---|---|
| Plan model | Flexible root with Tasks, Events, Milestones, Measurements, Requirements; no one progress mode |
| Progress | Hybrid qualitative summary + primary resolved count + specific indicators |
| Links | Importance + effect per Plan-Task/Event link |
| Manual Condition | Not visible by default; internal/migration-only unless DB proves unavoidable |
| Presets | Task inline/prefill, Event prefill, Plan Draft blueprint |
| Drafts | Contextual recovery, 30-day live TTL, owner-only |
| Verification/evidence | Evidence per completion attempt with upload/review/correction flow |
| Attention | Action queue with primary action distinct from Open |
| Activity | Detail surface with privacy-safe metadata |
| Retention | Domain-specific cancelled/archive/trash/draft/evidence rules |
| Legacy | Product target is one Current Plan root with safe Goal migration/resolver |

Blueprint status after this phase:

```text
PHASE_0_PRODUCT_MODEL_PROPOSED — NOT FROZEN
```

Next Phase 0 action:

```text
Phase 0C/0D technical validation of DB/runtime feasibility for approved 0B recommendations before Product Freeze or Phase 1 implementation.
```
