# PLANNER PHASE 0 - STRESS TEST CATALOG

STATUS: `PHASE_0B_STRESS_TESTED — PRODUCT_MODEL_PROPOSED — NOT FROZEN`

This catalog is the required input for Phase 0B. A proposed feature is not considered useful just because it succeeds in one favorable case. It should demonstrate value across multiple scenarios and should survive product, DB, runtime, privacy, reliability, and retention pressure.

## Evaluation Rules

| Rule | Meaning |
|---|---|
| No single-example proof | One good example does not justify a product surface |
| V1 usefulness must be tested | V1 is authority for daily flow and fluency, not for final architecture |
| Current contracts must be tested | Current is authority for scopes, reliability, idempotency, safety, and modern backend contracts |
| Link metadata must earn its place | Importance and effect metadata must prove usefulness across Plan/Task/Event scenarios |
| Manual condition must earn its place | It must show cases that cannot be expressed cleanly as milestone, requirement, task, or measurement |
| Retention is not always hard delete | Trash, archive, cancelled, evidence, drafts, and activity may need different rules |

## Scenario Matrix

### 1. Limpieza semanal familiar

| Field | Definition |
|---|---|
| Persona | Adult coordinator with two household members |
| Context | Weekly household routine with repeated tasks and accountability |
| Objective | Create and run a practical weekly cleaning flow |
| Ideal journey | Use preset or quick create, assign tasks, see weekly event if needed, complete tasks, verify selected tasks, see activity |
| Entities | Task, Event optional, Preset, Activity, Attention |
| States | pending, completed, awaiting_verification, verified, recurrence scheduled |
| Edge cases | One member unavailable, duplicate tap on complete, task cancelled mid-week |
| Dangerous failure | Duplicate completions or missing verification item |
| Technical evidence required | Task fulfillment idempotency, assignment modes, Attention verification action, Activity row |
| Decisions tested | Presets usefulness, recurring routine, verification, cancelled retention |

### 2. Preparar un cumpleanos

| Field | Definition |
|---|---|
| Persona | Parent planning a family birthday |
| Context | Multi-step preparation with deadline and event day |
| Objective | Plan event, tasks, milestones, and final celebration event |
| Ideal journey | Create Plan from preset, add tasks, link final Event, add intermediate milestone, track readiness |
| Entities | Plan, Task, Event, Milestone, Preset |
| States | draft Plan, active Plan, scheduled Event, pending/completed tasks |
| Edge cases | Event date changes, task secondary/contextual, final Event cancelled |
| Dangerous failure | Plan completion based on wrong final Event or missing Event link |
| Technical evidence required | Plan-Event link, final event binding, Plan lifecycle readiness |
| Decisions tested | Event link effect, final event, Plan preset structure, forms |

### 3. Organizar una mudanza

| Field | Definition |
|---|---|
| Persona | Household coordinator |
| Context | Large effort with deadlines, blockers, many tasks, appointments |
| Objective | Keep the move organized without losing operational details |
| Ideal journey | Create Plan, add milestones, requirements, tasks, events, blockers, archive after move |
| Entities | Plan, Milestone, Requirement, Task, Event, Archive, Activity |
| States | draft, active, paused, completed/closed, archived |
| Edge cases | Moving date changes, blocker unresolved, Plan paused, service appointment cancelled |
| Dangerous failure | Requirement hierarchy hides urgent work or completion skips blockers |
| Technical evidence required | Requirement readiness, archive capability, Plan lifecycle mutation reliability |
| Decisions tested | Requirements UX, Archive, Task/Event effect metadata |

### 4. Ahorrar para una compra

| Field | Definition |
|---|---|
| Persona | Adult saving for a household purchase |
| Context | Numeric target with recurring updates |
| Objective | Track amount saved toward target |
| Ideal journey | Create Plan with Measurement, update current value, see progress label, complete when reached |
| Entities | Plan, Measurement, Measurement history, Activity |
| States | draft, active, measurement reached, completed |
| Edge cases | Correction to wrong value, supporting task exists, target date missed |
| Dangerous failure | Fake percentage or lost measurement history |
| Technical evidence required | Measurement record operation, history, indicator projection |
| Decisions tested | Measurement role, no universal percentage, target date semantics |

### 5. Mantenimiento de un auto

| Field | Definition |
|---|---|
| Persona | Adult responsible for car maintenance |
| Context | Scheduled appointment plus tasks and documents |
| Objective | Ensure service appointment and preparation tasks happen |
| Ideal journey | Plan with Event appointment, prep tasks, optional evidence receipt, archive after completion |
| Entities | Plan, Event, Task, Evidence candidate, Archive |
| States | scheduled, completed, archived |
| Edge cases | Appointment rescheduled, receipt photo needed, task skipped |
| Dangerous failure | Event only gives context but accidentally blocks Plan completion |
| Technical evidence required | Event link effect metadata, evidence artifact model, archive behavior |
| Decisions tested | Context vs blocking Event, evidence, Archive |

### 6. Turno medico

| Field | Definition |
|---|---|
| Persona | Adult managing personal health event |
| Context | Personal event with optional prep task and privacy |
| Objective | Keep appointment private when personal, household-visible when shared |
| Ideal journey | Create personal Event, optional reminder Task, avoid household Activity leak |
| Entities | Event, Task, Activity, Search, Attention |
| States | scheduled, cancelled/reactivated, RSVP maybe not relevant |
| Edge cases | Personal scope in household shell, cancellation, recurrence none |
| Dangerous failure | Personal health Event leaks to household Search/Activity/Home |
| Technical evidence required | Event personal RLS, global surface privacy context |
| Decisions tested | Personal vs household, Activity privacy, forms |

### 7. Tarea verificable con imagen

| Field | Definition |
|---|---|
| Persona | Child completes task, adult verifies |
| Context | Task requires evidence photo |
| Objective | Submit evidence and get approved or correction requested |
| Ideal journey | Complete Task with image, Attention prompts verifier, approve or correction, resubmit |
| Entities | Task, Fulfillment, Evidence, Attention, Activity |
| States | pending, awaiting_verification, verified, correction_requested |
| Edge cases | Same person tries verify, image upload offline, correction note needed |
| Dangerous failure | Self-verification allowed or evidence orphaned |
| Technical evidence required | Storage bucket/table/RLS, self-verification guard, retention |
| Decisions tested | Evidence model, Attention actions, offline/reconnect |

### 8. Evento recurrente con una ocurrencia modificada

| Field | Definition |
|---|---|
| Persona | Parent managing weekly class |
| Context | Weekly recurring Event with one changed occurrence |
| Objective | Move one occurrence without breaking the series |
| Ideal journey | Edit this occurrence only, preserve series and calendar projection |
| Entities | Event, Event series, Occurrence override |
| States | active series, scheduled occurrence, modified occurrence |
| Edge cases | Timezone change, all-day vs timed, duplicate override |
| Dangerous failure | Whole series moves when only one occurrence was intended |
| Technical evidence required | `series_id`, `occurrence_key`, edit scope mutation runtime |
| Decisions tested | Recurrence scope, instance identity, Calendar |

### 9. Plan con Tasks principales y secundarias

| Field | Definition |
|---|---|
| Persona | Household coordinator |
| Context | Plan includes essential and helpful tasks |
| Objective | Distinguish must-do from supporting tasks |
| Ideal journey | Link principal tasks as blocking/contributing, secondary tasks as supporting/context |
| Entities | Plan, Task, Plan-Task link metadata |
| States | task pending/completed/cancelled, Plan active |
| Edge cases | Supporting task cancelled, principal task verified late |
| Dangerous failure | Secondary task blocks Plan completion unexpectedly |
| Technical evidence required | Link classification/effect metadata and progress rules |
| Decisions tested | Principal/secundario, effect metadata, progress |

### 10. Plan con Events de contexto, intermedio y final

| Field | Definition |
|---|---|
| Persona | Adult planning a multi-date effort |
| Context | Some Events are context, one is milestone-like, one finalizes Plan |
| Objective | Represent different Event effects correctly |
| Ideal journey | Add context Event, intermediate Event, final Event with distinct effects |
| Entities | Plan, Event, Plan-Event link metadata |
| States | scheduled, cancelled, active Plan |
| Edge cases | Final Event cancelled, intermediate Event rescheduled |
| Dangerous failure | All Events treated as blockers or all treated as context |
| Technical evidence required | Link effect metadata, finalization binding, recurrence occurrence identity |
| Decisions tested | Event link current, final event, effect metadata |

### 11. Plan con milestones

| Field | Definition |
|---|---|
| Persona | Planner user |
| Context | Goal-like Plan with clear outcomes |
| Objective | Add/edit/order/complete/reopen milestones |
| Ideal journey | Create draft Plan, add milestones, activate, complete/reopen milestone from Detail |
| Entities | Plan, Milestone |
| States | draft, active, pending/completed milestone |
| Edge cases | Duplicate save, version conflict, milestone trash/restore |
| Dangerous failure | P2A editor saves duplicate changesets |
| Technical evidence required | Structure changeset reliability, milestone lifecycle mutation |
| Decisions tested | Milestone role, P2A scope, Plan lifecycle |

### 12. Plan con measurement

| Field | Definition |
|---|---|
| Persona | Adult tracking numeric progress |
| Context | Measurement-only Plan such as savings, weight, pages read |
| Objective | Determine whether measurement is useful outside legacy percentage |
| Ideal journey | Add measurement, record value changes, reach target, show label |
| Entities | Plan, Measurement, Measurement history |
| States | active, reached/not reached |
| Edge cases | Operator lte/eq, correction, unit change |
| Dangerous failure | Misleading percent or no audit of value changes |
| Technical evidence required | Measurement history and indicator correctness |
| Decisions tested | Measurement role, progress, forms |

### 13. Plan con requirement bloqueante

| Field | Definition |
|---|---|
| Persona | Coordinator |
| Context | Plan cannot activate/complete until a prerequisite is satisfied |
| Objective | Test necessary blockers and confirmation flows |
| Ideal journey | Add requirement, see activation/completion blocker, satisfy or confirm unresolved where allowed |
| Entities | Plan, Requirement, Milestone/Measurement/Manual Condition |
| States | draft, active, blocked, completed |
| Edge cases | Requirement alone without useful structure, external unbound requirement |
| Dangerous failure | Plan activates with unresolved necessary external requirement |
| Technical evidence required | Activation matrix, completion readiness, backend errors |
| Decisions tested | Requirement role, completion UX, activation |

### 14. Salir de Task y guardar Draft

| Field | Definition |
|---|---|
| Persona | User interrupted during creation |
| Context | Dirty task form before submit |
| Objective | Preserve work without creating a Task |
| Ideal journey | Dirty-leave prompt, save draft, recover later |
| Entities | Draft, Task payload |
| States | live draft, recovered, discarded |
| Edge cases | Offline, duplicate autosave, household changed |
| Dangerous failure | Task created accidentally or draft visible to household |
| Technical evidence required | Autosave, owner-only RLS, route recovery |
| Decisions tested | Draft entry, autosave/manual save, privacy |

### 15. Crear Task existiendo Draft previo

| Field | Definition |
|---|---|
| Persona | User taps New Task while compatible draft exists |
| Context | Prior unfinished Task draft |
| Objective | Choose continue draft or create new |
| Ideal journey | Surface compatible draft choice without blocking fast create unnecessarily |
| Entities | Draft, Task form |
| States | draft continued, new draft created, old draft retained/discarded |
| Edge cases | Multiple drafts, expired draft candidate, source preset draft |
| Dangerous failure | Wrong draft overwritten |
| Technical evidence required | `client_draft_key`, list/recover endpoints, UI choice behavior |
| Decisions tested | Draft entry UX, multiple drafts, TTL |

### 16. Aplicar Preset HomePlus

| Field | Definition |
|---|---|
| Persona | New user |
| Context | Uses built-in template |
| Objective | Apply preset safely without modifying original |
| Ideal journey | Choose HomePlus preset, preview, apply or create draft, original remains immutable |
| Entities | Preset, Revision, Draft or target entity |
| States | published revision, prepared payload, created entity/draft |
| Edge cases | User wants edit built-in, missing permission, duplicate tap apply |
| Dangerous failure | HomePlus preset becomes mutable or trashed |
| Technical evidence required | `source='homeplus'` mutability rejection, prepare endpoint, idempotency |
| Decisions tested | HomePlus presets, review-before-create, direct apply |

### 17. Crear Preset personal

| Field | Definition |
|---|---|
| Persona | User saving repeated setup |
| Context | Converts useful Task/Event/Plan configuration into personal preset |
| Objective | Reuse without exposing to household |
| Ideal journey | Create personal preset, edit revisions, apply later |
| Entities | Preset, Revision, Draft, Task/Event/Plan payload |
| States | published, draft revision, superseded |
| Edge cases | Version conflict, structural fingerprint noop, household switch |
| Dangerous failure | Personal preset visible/editable by household |
| Technical evidence required | Preset RLS/source shape and frontend library filters |
| Decisions tested | Personal presets, editing, duplication |

### 18. Aplicar Preset de Plan con varias entidades

| Field | Definition |
|---|---|
| Persona | Coordinator |
| Context | Plan preset creates Plan, Tasks, Events, milestones |
| Objective | Determine if multi-entity generation is product-worthy and technically safe |
| Ideal journey | Preview generated structure/entities, apply atomically or stage as draft |
| Entities | Plan, Tasks, Events, Milestones, Preset, Draft |
| States | draft Plan, created linked entities, rollback/partial failure |
| Edge cases | Some tasks fail permission, event recurrence, duplicate replay |
| Dangerous failure | Partial generation leaves orphan Tasks/Events |
| Technical evidence required | Atomicity model, idempotency, rollback/repair strategy |
| Decisions tested | Preset generation, Plan links, Reliability |

### 19. Cancelar Task vinculada a Plan

| Field | Definition |
|---|---|
| Persona | Assignee or coordinator |
| Context | Linked Task no longer needed |
| Objective | Determine impact on Plan progress/readiness |
| Ideal journey | Cancel task, Plan updates contribution/blocker state according to link effect |
| Entities | Task, Plan, Link, Activity |
| States | task cancelled/reactivated, Plan active |
| Edge cases | Cancel principal vs secondary task, task had verification pending |
| Dangerous failure | Cancelled task counts as completed or blocks forever |
| Technical evidence required | Link metadata and progress rules |
| Decisions tested | Task link, cancelled retention, progress |

### 20. Archivar Plan con Tasks/Eventos relacionados

| Field | Definition |
|---|---|
| Persona | Coordinator finishing a Plan |
| Context | Plan completed/closed with related active/inactive Tasks/Events |
| Objective | Preserve history without hiding active related work incorrectly |
| Ideal journey | Archive terminal Plan, related items remain discoverable in their domains as appropriate |
| Entities | Plan, Task, Event, Archive, Search, Activity |
| States | completed/closed, archived, active related entities |
| Edge cases | Active future Event, pending task, shared Task in another Plan |
| Dangerous failure | Archive cascades unexpectedly or breaks links |
| Technical evidence required | Archive constraints, link ownership, Search/archive filtering |
| Decisions tested | Archive semantics, links, retention |

### 21. Enviar Task a Trash y restaurarla

| Field | Definition |
|---|---|
| Persona | User accidentally trashes Task |
| Context | Recoverable deletion |
| Objective | Restore without duplicate or lost state |
| Ideal journey | Trash task, hidden from active list, visible in Trash, restore via Reliability |
| Entities | Task, Trash, Activity, Plan link optional |
| States | trashed, restored, cancelled optional |
| Edge cases | Version conflict, duplicate restore tap, linked Plan |
| Dangerous failure | Task restored but link/progress not refreshed |
| Technical evidence required | Trash route, restore adapter, invalidation |
| Decisions tested | Trash retention, link restore behavior |

### 22. Expiracion de Draft

| Field | Definition |
|---|---|
| Persona | User returns after 30+ days |
| Context | Old unfinished draft |
| Objective | Decide if and how live drafts expire |
| Ideal journey | Warn before expiry, cleanup expired, do not surprise-delete active recent work |
| Entities | Draft |
| States | live, nearing expiry, expired, trashed/discarded |
| Edge cases | Offline device autosaves old draft, source preset deleted |
| Dangerous failure | Draft silently disappears without recovery or stale draft persists forever |
| Technical evidence required | `expires_at`/TTL job or explicit no-TTL decision |
| Decisions tested | Draft TTL, cleanup, offline |

### 23. Expiracion de Trash

| Field | Definition |
|---|---|
| Persona | User tries restore old trashed item |
| Context | Trash retention window expired |
| Objective | Define restore window and purge behavior per entity |
| Ideal journey | Items show expiry, restore blocked after expiry, hard delete respects references |
| Entities | Task, Event, Plan, Draft, Preset, Evidence |
| States | trashed, retention expired, hard deleted |
| Edge cases | Recurring event, linked Plan, Activity references |
| Dangerous failure | Hard delete breaks history or leaves sensitive data forever |
| Technical evidence required | Retention columns/jobs and blocking reference checks |
| Decisions tested | Trash TTL, hard delete, historical preservation |

### 24. Activity Detail

| Field | Definition |
|---|---|
| Persona | Household member reviewing history |
| Context | Wants to understand what changed |
| Objective | Show activity details and related entity actions distinctly |
| Ideal journey | Open Activity row, see actor/time/entity/from/to/metadata, tap Open entity separately |
| Entities | Activity, Task/Event/Plan |
| States | activity row, detail read |
| Edge cases | Entity trashed/archived/deleted, personal item privacy |
| Dangerous failure | Activity row leaks private data or navigates to wrong root |
| Technical evidence required | Activity detail route/DTO and privacy projection |
| Decisions tested | Activity Detail, navigation, privacy |

### 25. Attention verification

| Field | Definition |
|---|---|
| Persona | Adult verifier |
| Context | Task awaiting verification |
| Objective | Attention item lets user verify or open details with distinct actions |
| Ideal journey | Tap Verify from Attention, confirm, item resolves; tap Open goes to Task Detail |
| Entities | Attention, Task, Fulfillment |
| States | awaiting_verification, verified, correction_requested |
| Edge cases | Self-verification, stale item, permission lost |
| Dangerous failure | Verify and Open do same thing or item remains stale after verify |
| Technical evidence required | Attention action contract and invalidation |
| Decisions tested | Attention actions, verification UX |

### 26. Personal vs household

| Field | Definition |
|---|---|
| Persona | User with personal and household content |
| Context | Same app shell shows mixed scope |
| Objective | Prevent privacy leaks and wrong household operations |
| Ideal journey | Personal Plan/Event/Draft visible only to owner; household content role-gated |
| Entities | Plan, Event, Draft, Preset, Search, Attention, Activity |
| States | personal, household, household switched |
| Edge cases | Coordinator tries view another person's personal draft, search after switch |
| Dangerous failure | Personal content appears in household Home/Search/Activity |
| Technical evidence required | RLS, frontend access context, cache invalidation on household switch |
| Decisions tested | Privacy, scopes, navigation |

### 27. Offline y reconnect

| Field | Definition |
|---|---|
| Persona | Mobile user |
| Context | Starts work offline or network drops mid-mutation |
| Objective | Preserve local intent and reconcile safely |
| Ideal journey | Queue or preserve draft, reconnect, replay idempotently, show uncertain states |
| Entities | Task, Event, Plan, Draft, Reliability operation |
| States | offline draft, in-flight, uncertain, confirmed/replay |
| Edge cases | Duplicate tap offline, version conflict after reconnect |
| Dangerous failure | Duplicate entities or silent data loss |
| Technical evidence required | Reliability runtime, idempotency keys, draft autosave offline policy |
| Decisions tested | Reliability, Drafts, offline support |

### 28. Duplicate tap/replay

| Field | Definition |
|---|---|
| Persona | Any mobile user |
| Context | Taps create/save/activate twice |
| Objective | One backend effect only |
| Ideal journey | Single-flight blocks duplicate, replay returns same result |
| Entities | Task, Event, Plan, Structure changeset, Preset/Draft |
| States | in-flight, replay, noop, confirmed |
| Edge cases | Terminal stale callback releases wrong gate |
| Dangerous failure | Duplicate Plan/Task/Event or double lifecycle mutation |
| Technical evidence required | REC-0A trace, reliability tests, idempotency records |
| Decisions tested | Reliability, form submit model |

### 29. Migracion Goal legacy

| Field | Definition |
|---|---|
| Persona | Existing V1 user |
| Context | Has legacy Goals with tasks and progress |
| Objective | Preserve daily usefulness while moving to Current Plan root |
| Ideal journey | Legacy Goal appears, maps to Plan or opens legacy detail safely, tasks remain linked/migrated |
| Entities | planner_goals, planner_plans, legacy link, tasks.goal_id |
| States | active/completed/closed/trashed |
| Edge cases | Goal without Plan mapping, personal visibility, duplicate titles |
| Dangerous failure | Home opens Plan Detail with Goal ID and shows “Plan no encontrado” |
| Technical evidence required | Legacy mapping migration, route resolver, Home projection changes |
| Decisions tested | Root Plan, Goal retirement, Home legacy projection |

### 30. Home mostrando una entidad legacy

| Field | Definition |
|---|---|
| Persona | Existing V1 user opening Home |
| Context | Home Summary still emits legacy Goal |
| Objective | Decide what Home should show and how navigation should resolve |
| Ideal journey | Home card never navigates to invalid Current detail; label/copy reflects actual entity |
| Entities | Home Summary, Goal, Plan, Navigation |
| States | legacy active Goal, mapped Plan, unmapped Goal |
| Edge cases | Search shows Current Plan while Home shows Goal, Trash has both roots |
| Dangerous failure | Broken deep link or duplicate root confusion |
| Technical evidence required | Home Summary source, route params, Plan/Goal detail routing |
| Decisions tested | Home legacy projection, Goal Detail routing, Plan Detail routing |

## Cross-Scenario Decision Coverage

| Decision | Scenarios |
|---|---|
| Root Plan / Goal migration | 2, 3, 9, 20, 29, 30 |
| Task link metadata | 1, 3, 9, 19, 20 |
| Event link metadata | 2, 5, 8, 10, 20 |
| Final event | 2, 10 |
| Milestones | 2, 3, 11 |
| Measurements | 4, 12 |
| Requirements | 3, 13 |
| Manual conditions | 3, 13; must add more if kept |
| Evidence | 5, 7, 25 |
| Presets | 1, 2, 16, 17, 18 |
| Drafts | 14, 15, 18, 22, 27 |
| Recurrence | 1, 8, 10, 23 |
| Attention | 7, 24, 25 |
| Activity Detail | 1, 3, 7, 24 |
| Archive/Trash/Retention | 20, 21, 22, 23 |
| Privacy | 6, 17, 24, 26 |
| Reliability | 18, 27, 28 |

## Phase 0B Added Scenarios

These scenarios were added during Phase 0B because several product decisions needed more pressure than the original catalog provided.

### 31. Reforma de una habitacion

| Field | Definition |
|---|---|
| Persona | Household coordinator managing renovation work |
| Context | Physical project with phases, budget, materials, and optional contractor appointments |
| Objective | Finish the room without confusing budget, milestones, tasks, and approvals |
| Ideal journey | Create Plan, add milestones for phases, tasks for work, measurement for budget, requirements for approvals/materials |
| Entities | Plan, Milestone, Task, Measurement, Requirement, Event |
| States | draft, active, blocked, paused optional, completed/closed, archived |
| Edge cases | Budget exceeded, material unavailable, contractor no-show, room usable before all optional tasks finish |
| Dangerous failure | Weighted progress hides a critical unfinished requirement |
| Technical evidence required | Measurement history, requirement completion blockers, Plan lifecycle confirmations |
| Decisions tested | Measurement vs Milestone, Requirement role, hybrid progress, close vs complete |

### 32. Viaje familiar

| Field | Definition |
|---|---|
| Persona | Parent coordinating trip |
| Context | Travel dates, bookings, documents, packing, and post-trip cleanup |
| Objective | Keep commitments and preparation visible without turning every date into a blocker |
| Ideal journey | Plan from preset, final/travel Events, required documents, packing Tasks, milestone for booking complete |
| Entities | Plan, Event, Task, Requirement, Milestone, Preset, Activity |
| States | draft, active, ready to travel, completed, archived |
| Edge cases | Passport missing, flight moved, optional packing task cancelled, trip cancelled |
| Dangerous failure | Final Event cancelled and Plan still appears ready/completed |
| Technical evidence required | Event link effect, final event binding, recurrence/occurrence-safe navigation when applicable |
| Decisions tested | Event effect metadata, final Event, Plan preset Draft blueprint, cancelled/closed semantics |

### 33. Proyecto escolar

| Field | Definition |
|---|---|
| Persona | Student or parent helping student |
| Context | Deliverable with deadline, phases, review, and optional evidence/submission |
| Objective | Track sections and final submission without requiring complex setup |
| Ideal journey | Create Plan quickly, add milestones for research/draft/final, tasks for actions, event deadline |
| Entities | Plan, Milestone, Task, Event, Evidence candidate |
| States | draft, active, awaiting review optional, completed |
| Edge cases | Teacher deadline changes, task awaiting verification, milestone reopened after correction |
| Dangerous failure | Task in review counts as completed and Plan closes too early |
| Technical evidence required | Verification state contribution, milestone reopen, Event date update |
| Decisions tested | Task verification in progress, Milestone lifecycle, progress summary |

### 34. Organizacion de documentos

| Field | Definition |
|---|---|
| Persona | Adult organizing personal/household documents |
| Context | Privacy-sensitive sorting, scanning, and storage |
| Objective | Complete important categories without leaking personal documents |
| Ideal journey | Plan with tasks or milestones, optional measurement for document count, personal scope when needed |
| Entities | Plan, Task, Milestone, Measurement, Activity |
| States | active, completed, closed if abandoned |
| Edge cases | Personal documents in household shell, missing document, trashed scan task restored |
| Dangerous failure | Activity or Search leaks private document names |
| Technical evidence required | Scope/RLS, Activity redaction, Trash restore with links |
| Decisions tested | Privacy, Activity Detail, Task vs Plan boundary, retention |

### 35. Compra importante

| Field | Definition |
|---|---|
| Persona | Household decision maker |
| Context | Research, budget, approvals, vendor appointment, final purchase |
| Objective | Avoid buying before budget/approval and preserve decision history |
| Ideal journey | Plan with budget measurement, requirements for approval, tasks for research, optional Event for appointment |
| Entities | Plan, Measurement, Requirement, Task, Event, Activity |
| States | draft, active, blocked, completed/closed |
| Edge cases | Purchase cancelled, budget exceeded, approval removed, vendor Event rescheduled |
| Dangerous failure | Supporting research Task completion marks Plan ready while budget blocker remains |
| Technical evidence required | Requirement blocker projection, measurement target operator, Plan close reason |
| Decisions tested | Requirement role, Measurement role, closed vs completed, hybrid progress |

### 36. Cuidado recurrente de mascota

| Field | Definition |
|---|---|
| Persona | Household member responsible for pet care |
| Context | Recurring care tasks, vet events, medicine tracking, optional weight measurement |
| Objective | Keep routine visible without treating the Plan as permanently incomplete |
| Ideal journey | Preset creates recurring tasks/events and optional measurement; Plan stays active while care plan exists |
| Entities | Task, Event, Measurement, Plan, Preset, Attention |
| States | active routine, current occurrence pending/completed, paused optional, closed when care plan ends |
| Edge cases | Missed dose, vet Event cancelled, medicine measurement reaches zero, household member unavailable |
| Dangerous failure | Universal Plan percentage is meaningless for ongoing recurrence |
| Technical evidence required | Recurrence series/occurrence handling, Attention for missed/correction items, Measurement history |
| Decisions tested | Recurring Plan semantics, Event recurrence, Measurement, Attention |

## Phase 0B Stress Test Matrix

| ID | Scenario | Flow tested | Proposal | Result | Friction | Ambiguity | Risk | Simplification | Decisions affected | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Limpieza semanal familiar | Routine tasks, assignments, verification | Task-first recurring routine with optional Plan | `PASS_WITH_SIMPLIFICATION` | Low if preset/inline | Whether weekly Plan closes | Duplicate completion, stale verification | Keep Task preset fastest; Plan only for coordinated routine | Presets, verification, recurrence, cancelled | Use Task/Plan preset depending complexity |
| 2 | Preparar un cumpleanos | Plan with final Event and Tasks | Plan Draft blueprint | `PASS` | Medium | Final Event vs date target | Event cancellation completing Plan incorrectly | Event effect defaults | Plan preset, Event link, progress | Plan preset creates Draft with final Event |
| 3 | Organizar una mudanza | Complex blockers, milestones, events | Mixed Plan graph | `PASS` | Medium-high but justified | Requirement hierarchy depth | Blockers hidden in tree | Flat blockers first | Requirement, archive, lifecycle | Use milestones + requirements + tasks/events |
| 4 | Ahorrar para una compra | Numeric tracking | Measurement-primary Plan | `PASS` | Low | Whether supporting tasks matter | Fake percent/history loss | Measurement card primary | Measurement, progress | Measurement can be primary |
| 5 | Mantenimiento de un auto | Appointment plus prep/evidence | Event + Tasks with evidence candidate | `PASS` | Low-medium | Context vs blocker Event | Appointment accidentally blocks | Default existing Event as context | Event link, evidence, archive | Event effect must be explicit when blocking/final |
| 6 | Turno medico | Privacy-sensitive personal Event | Personal Event with optional Task | `CONDITIONAL_PASS` | Low | Household shell scope | Privacy leak | Scope label and redacted Activity | Privacy, forms, Activity | Personal remains owner-only across surfaces |
| 7 | Tarea verificable con imagen | Evidence/review/correction | Evidence per completion attempt | `NEEDS_DB_VALIDATION` | Medium | Upload vs review state | Orphan evidence/self-verify | Clear upload/review labels | Evidence, Attention | Do not ship image verification without storage/RLS |
| 8 | Evento recurrente modificado | Occurrence edit | Series/occurrence scopes | `NEEDS_RUNTIME_VALIDATION` | Medium | This occurrence vs series | Whole series changed accidentally | Scope picker copy | Recurrence | Preserve Current recurrence contract |
| 9 | Plan con Tasks principales/secundarias | Importance/effect | Two-dimensional link | `NEEDS_DB_VALIDATION` | Medium | Principal vs blocking | Secondary blocks unexpectedly | Defaults hide effect unless needed | Links, progress | Importance visible, effect smart/advanced |
| 10 | Plan con Events contexto/intermedio/final | Event effects | Effect metadata | `NEEDS_DB_VALIDATION` | Medium | Date/checkpoint/final | All Events treated same | Defaults by entry point | Event links, final Event | Separate context/date/final/block effects |
| 11 | Plan con milestones | Milestone editor/lifecycle | Milestones as phases | `PASS` | Low-medium | Manual vs automatic | Duplicate changeset | Use manual default | Milestone role | Milestone is primary phase signal |
| 12 | Plan con measurement | Numeric target | Measurement history and target reached | `PASS` | Low | Unit/operator changes | Misleading percent | Clear unit labels | Measurement, progress | Measurement can activate/complete after human action |
| 13 | Plan con requirement bloqueante | Activation/completion blockers | Requirement as blocker | `PASS_WITH_SIMPLIFICATION` | Medium | Requirement vs Task | Requirement-only Plan useless | Show blockers only when meaningful | Requirement, lifecycle | Requirement is condition, not catch-all link |
| 14 | Salir de Task y guardar Draft | Dirty leave | Owner-only Draft | `PASS` | Low | Draft vs Task | Accidental productive create | Sheet/banner recovery | Drafts, offline | Autosave + explicit discard |
| 15 | Crear Task existiendo Draft | Compatible draft selection | Contextual chooser | `PASS` | Low | Multiple drafts | Wrong draft overwritten | Continue/new/discard choices | Draft entry, TTL | Do not block when no compatible Draft |
| 16 | Aplicar Preset HomePlus | Built-in preset | Immutable prepare/apply | `PASS` | Low | Edit original? | Mutating HomePlus preset | Save copy as mine | HomePlus presets | Original remains immutable |
| 17 | Crear Preset personal | Save repeated setup | Personal editable preset | `PASS` | Medium | Household visibility | Personal leak | Source labels | Presets, privacy | Personal preset owner-only |
| 18 | Aplicar Plan Preset multi-entidad | Multi-entity generation | Plan Draft blueprint | `NEEDS_DB_VALIDATION` | Medium-high | Productive vs draft | Partial orphan entities | Preview Draft first | Presets, links, Reliability | No immediate apply until atomicity proven |
| 19 | Cancelar Task vinculada a Plan | Link/progress update | Cancel excludes and asks for blockers | `NEEDS_DB_VALIDATION` | Medium | Cancel = done? | Blocks forever/counts done | Confirm for principal/blocking | Task lifecycle, links | Cancelled never counts completed |
| 20 | Archivar Plan con linked items | Terminal archive | Archive Plan only | `PASS_WITH_SIMPLIFICATION` | Low | Linked active items | Cascading archive unexpectedly | Confirmation for active recurrence | Archive, links | Archive does not cascade to Tasks/Events |
| 21 | Trash Task and restore | Recoverable delete | Trash excludes/restores | `PASS` | Low | Cancelled vs trashed | Restore without Plan refresh | Recompute on restore | Trash, links | Trash first, hard delete later by policy |
| 22 | Draft expiration | TTL | 30-day live TTL renewed on edit | `NEEDS_DB_VALIDATION` | Low | Silent expiry | Lost work or stale buildup | 7-day warning | Drafts, retention | Approve 30 days with warning |
| 23 | Trash expiration | Recoverable window | Per-domain Trash TTL | `NEEDS_DB_VALIDATION` | Medium | Entity-specific purge | Broken references | Block purge when referenced | Trash, retention | Domain-specific purge rules |
| 24 | Activity Detail | Explain history | Dedicated detail | `PASS` | Low | Detail vs entity open | Privacy leak | Redacted DTO | Activity, privacy | Activity Detail is separate surface |
| 25 | Attention verification | Action queue | Verify distinct from Open | `NEEDS_RUNTIME_VALIDATION` | Low | Same action handler | Item stale after verify | Primary/secondary actions | Attention, verification | Verify opens action flow; Open navigates |
| 26 | Personal vs household | Scope isolation | Owner/household projections | `CONDITIONAL_PASS` | Low | Shell context | Private leak | Scope labels/cache reset | Privacy | Validate RLS and cache invalidation |
| 27 | Offline/reconnect | Draft/replay | Preserve intent with Reliability | `NEEDS_RUNTIME_VALIDATION` | Medium | Pending upload vs submitted | Duplicate/lost writes | Explicit pending states | Reliability, Drafts, evidence | Offline Draft first; replay idempotently |
| 28 | Duplicate tap/replay | Single-flight | One backend effect | `NEEDS_RUNTIME_VALIDATION` | Low | Stale terminal | Duplicate entities | Disable + operation identity | Reliability | Keep REC-0A validation before implementation |
| 29 | Migracion Goal legacy | Existing V1 Goal | One Plan root target | `NEEDS_DB_VALIDATION` | Medium | Goal vs Plan | Broken Home navigation | Temporary resolver | Migration, root | Auto/guided migration with fallback resolver |
| 30 | Home legacy entity | Home navigation | Resolve Goal before Plan Detail | `NEEDS_DB_VALIDATION` | Low | Search vs Home mismatch | Plan no encontrado | Route resolver | Home, navigation | Home never passes raw Goal ID to Plan Detail |
| 31 | Reforma habitacion | Physical project | Milestones + budget + blockers | `PASS` | Medium | Budget vs progress | Critical blocker hidden | Hybrid progress | Measurement, Requirement | Use measurement for budget only |
| 32 | Viaje familiar | Travel preparation | Plan Draft with Events/Requirements | `PASS` | Medium | Event role | Cancelled trip not closed | Final Event confirmation | Event link, Preset | Plan preset Draft, final event effect |
| 33 | Proyecto escolar | Deadline deliverable | Milestones + Tasks + Event | `PASS` | Low-medium | Review state | Pending review counted done | Verification rule | Task lifecycle, Milestone | Review blocks essential contribution |
| 34 | Organizacion documentos | Privacy sorting | Task/Milestone Plan | `CONDITIONAL_PASS` | Low | Personal vs household | Activity leak | Personal scope labels | Privacy, Activity | Redacted Activity Detail required |
| 35 | Compra importante | Budget/approval/purchase | Measurement + Requirement + Tasks | `PASS` | Medium | Research vs blocker | Buy before approval | Requirement blocker | Requirement, Measurement | Budget/approval can block close/complete |
| 36 | Cuidado mascota recurrente | Ongoing routine | Recurring Tasks/Events + optional Plan | `PASS_WITH_SIMPLIFICATION` | Low with preset | Completion of ongoing Plan | Meaningless percent | Routine status/next item | Recurrence, progress | Keep Plan active until care plan ends |

## Phase 0B Catalog Recommendations

| Topic | Recommendation | Rejected |
|---|---|---|
| Plan model | Mixed root with sections and lifecycle | One progress mode |
| Progress | Hybrid qualitative + primary count + separate indicators | Universal or weighted percentage |
| Links | Importance + effect per Plan link | `goal_id` or untyped external requirement as complete answer |
| Manual Condition | Internal/migration-only by default | Visible default editor |
| Presets | Inline/prefill for Task/Event, Draft blueprint for Plan | Immediate Plan creation |
| Drafts | Contextual recovery + 30-day TTL | Always-blocking modal or no TTL |
| Verification | Evidence per completion attempt | Mutable Task evidence field |
| Attention | Primary action distinct from Open | Navigation-only queue |
| Activity | Dedicated privacy-safe detail | Raw metadata/direct navigation only |
| Retention | Domain-specific rules | Same TTL/hard delete for all domains |
