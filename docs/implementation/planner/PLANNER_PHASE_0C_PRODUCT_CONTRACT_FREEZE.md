# PLANNER PHASE 0C - PRODUCT CONTRACT FREEZE

STATUS: `PHASE_0C_PRODUCT_CONTRACT_FROZEN - TECHNICAL_VALIDATION_PENDING`

RESULT: `PLANNER_PHASE_0C_PRODUCT_CONTRACT_FROZEN`

Phase 0C freezes what Planner must do as a product. It does not freeze how the DB, backend, Storage, RLS, jobs, replay, migration, cache, or runtime implementation will support it. Those validations belong to Phase 0D.

## 1. Refs And Safety

| Item | Value |
|---|---|
| Active worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\plans-reconciliation` |
| Branch | `planner-v1-plans-reconciliation` |
| Initial HEAD | `87e4063` |
| V1 reference worktree | `C:\Users\thega\Desktop\HomePlus-worktrees\reference-v1` |
| V1 ref | `f093bffaa7a7db6db7fc1b0072ba90352325a90a` |

Safety commands executed before writing:

```text
git branch --show-current -> planner-v1-plans-reconciliation
git rev-parse --short HEAD -> 87e4063
 M front/mi-front-limpio/components/planner/PlannerSheetHost.tsx
?? front/mi-front-limpio/services/planner/planCompositionTrace.ts
```

Preexisting dirty state preserved and not modified:

| Path | State | Classification |
|---|---|---|
| `front/mi-front-limpio/components/planner/PlannerSheetHost.tsx` | `M` | REC-0A instrumentation |
| `front/mi-front-limpio/services/planner/planCompositionTrace.ts` | `??` | REC-0A instrumentation helper |

Mandatory documents read before this report:

| Source |
|---|
| `docs/implementation/planner/PLANNER_PHASE_0A_EVIDENCE_AND_DECISION_MAP.md` |
| `docs/implementation/planner/PLANNER_PHASE_0B_PRODUCT_STRESS_TEST_RESULTS.md` |
| `docs/implementation/planner/PLANNER_PHASE_0_STRESS_TEST_CATALOG.md` |
| `docs/implementation/planner/PLANNER_FINAL_PRODUCT_AND_EXECUTION_BLUEPRINT.md` |
| `docs/implementation/planner/PLANNER_V1_FIRST_PORT_MANIFEST.md` |

Consulted supporting documents:

| Source |
|---|
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_RECONCILIATION_AUDIT.md` |
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P1_DOMAIN_CONTRACT_REPORT.md` |
| `docs/implementation/planner/PLANNER_V1_PLAN_STRUCTURE_P2A_MILESTONE_EDITOR_REPORT.md` |

No production code, backend, migrations, tests, scripts, Supabase files, or V1 reference files were changed.

## 2. Authority Of Decisions

Decision authority used in Phase 0C:

| Priority | Source |
|---|---|
| 1 | Explicit user decisions in the Phase 0C prompt |
| 2 | Previously documented runtime/manual evidence |
| 3 | Direct code and DB evidence |
| 4 | Phase 0B stress test report |
| 5 | Phase 0A evidence report |
| 6 | Historical documents |
| 7 | Declarative tests or reports |

When Phase 0C freezes a product behavior that still needs implementation support, the product decision is `PRODUCT_FROZEN` and the implementation is `OPEN_TECHNICAL_VALIDATION`. Technical uncertainty does not downgrade the product contract back into a recommendation.

## 3. Decisions Inherited From 0A And 0B

| Topic | Phase 0A/0B input | Phase 0C result |
|---|---|---|
| Plan root | Current `planner_plans` is canonical but legacy Goals remain productive | `PRODUCT_FROZEN`: Plan is the only future visible root |
| V1 baseline | V1 preserves useful daily flow | `PRODUCT_FROZEN`: recover fluency without keeping legacy Goal as product root |
| Reliability | Current mutation identity, idempotency, replay, single-flight are mandatory | `PRODUCT_FROZEN`; mechanics remain `OPEN_TECHNICAL_VALIDATION` where incomplete |
| Mixed Plan model | Stress tests passed mixed Plans | `PRODUCT_FROZEN`: Plan combines Tasks, Events, Milestones, Measurements, Requirements |
| Progress | Hybrid model recommended | `PRODUCT_FROZEN`: qualitative summary, main count, separate indicators, Measurement-only percentages |
| Manual Condition | Redundant in stress tests | `PRODUCT_FROZEN`: not part of canonical visible product |
| Presets | Inline/prefill for Task/Event, reviewable Plan blueprint | `PRODUCT_FROZEN` |
| Drafts | Owner-only, recoverable, 30-day TTL recommended | `PRODUCT_FROZEN` |
| Evidence | Evidence per completion attempt recommended | `PRODUCT_FROZEN`; tables/storage remain `OPEN_TECHNICAL_VALIDATION` |
| Attention | Action queue, primary action distinct from Open | `PRODUCT_FROZEN` |
| Activity Detail | Dedicated redacted detail recommended | `PRODUCT_FROZEN` |
| Retention | Domain-specific policies recommended | `PRODUCT_FROZEN` with 0C windows specified |

## 4. Explicit User Decisions After 0B

| Topic | Frozen decision |
|---|---|
| Plan root | Plan is the only future root of organized objectives inside Planner |
| Goal | Goal is a productive legacy root that must converge into Plan |
| Draft terms | Creation Draft and Plan En preparación are separate concepts and must not share visible label `Borrador` |
| Plan Preset flow | Preset preview creates no productive entities; confirmation creates Plan En preparación; activation materializes prepared Tasks/Events |
| Activation | A Plan can activate with at least one useful primary Task, Event, Milestone, or Measurement, and no pending activation Requirements |
| Manual Condition | Remove from canonical product; legacy maps to Milestone or Requirement |
| Importance | Two levels only: Principal and De apoyo |
| Requirements | Mandatory only; states Pendiente, Satisfecho, Anulado; annulment is audited |
| Plan links | Task/Event each belongs to zero or one Plan at most; no many-to-many |
| Link blockers | No `blocks_activation` or `blocks_completion` effects on links; blockers come from Principal items and Requirements |
| Progress | Deterministic hybrid progress; AI may explain/suggest/summarize, not decide |
| Completion | Human action, never automatic |
| Lifecycle | Plan states are En preparación, Activo, Pausado, Completado, Cerrado; projections are separate |
| Pause | Requires impact review for active Tasks, Events, and recurrences |
| Archive | Terminal Plan visibility flag; active Plan uses Cerrar y archivar |
| Recurrent Plan | Represents ongoing routine; no new Plan per cycle and no automatic Active/Completed alternation |
| Final Event | Past does not mean resolved; authorized actor confirms occurrence outcome |
| Task lifecycle | Human labels frozen with verification and correction behavior |
| Event lifecycle | No universal Realizado state |
| Draft TTL | 30 days from last edit; warning about 7 days before expiry |
| Requirements UI | Flat simple first experience; complete hierarchy UI is `DEFERRED_POST_MVP` |
| Scope editing | Product behavior frozen; RLS/cache implementation remains 0D |

## 5. Canonical Model

`PRODUCT_FROZEN`

Plan is the only future visible root for organized objectives inside Planner. Goal is a legacy productive root and must converge into Plan. The final product must not permanently expose Goal and Plan as parallel products, duplicate forms, duplicate details, duplicate progress models, duplicate routes, duplicate Trashes, or duplicate Home/Search projections.

A Plan can combine:

| Entity | Product role |
|---|---|
| Task | Executable action |
| Event | Temporal commitment or context |
| Milestone | Phase or outcome reached |
| Measurement | Numeric target with history |
| Requirement | External or prerequisite condition for activation/completion |

A Plan has no single mandatory progress mode. A Plan can be simple or complex, including a Plan with one useful action. The product must not block small Plans, warn that they are too small, auto-convert them to Tasks, or require a minimum element count beyond the activation gate. Future AI may suggest simplification but is not part of deterministic behavior.

## 6. Entities

| Entity | Product contract | Status |
|---|---|---|
| Plan | Canonical organized objective root | `PRODUCT_FROZEN` |
| Goal | Legacy root to migrate/resolve into Plan | `PRODUCT_FROZEN`, implementation `OPEN_TECHNICAL_VALIDATION` |
| Task | Action assignable/completable/verifiable/cancellable/restorable | `PRODUCT_FROZEN` |
| Event | Scheduled commitment/context with recurrence, RSVP, attendance concepts | `PRODUCT_FROZEN` |
| Milestone | Significant result/phase reached; can be principal/supporting | `PRODUCT_FROZEN` |
| Measurement | Numeric current-vs-target tracker with unit/operator/history | `PRODUCT_FROZEN` |
| Requirement | Mandatory condition for activation or completion | `PRODUCT_FROZEN` |
| Preset | Reusable Task/Event/Plan configuration source | `PRODUCT_FROZEN` |
| Draft | Owner-only non-productive saved creation form payload | `PRODUCT_FROZEN` |
| Evidence | Completion-attempt proof, initially images plus optional comment | `PRODUCT_FROZEN`, implementation `OPEN_TECHNICAL_VALIDATION` |
| Attention item | Action queue item with primary/secondary actions | `PRODUCT_FROZEN` |
| Activity row/detail | Audit/history projection and read-only detail | `PRODUCT_FROZEN` |

Manual Condition is not canonical. Legacy Manual Condition cases migrate or represent as Milestone when they mean an achieved checkpoint, or Requirement when they mean an external mandatory condition.

## 7. Relationships

### Plan-Task

`PRODUCT_FROZEN`

A Task belongs to zero Plans or one Plan at most. No many-to-many cardinality is approved.

| Dimension | Values |
|---|---|
| Importance | Principal, De apoyo |
| Function | Contribuye, Contexto |

Allowed combinations:

| Combination | Result |
|---|---|
| Principal + Contribuye | Valid and required for completion readiness |
| De apoyo + Contribuye | Valid and not required |
| De apoyo + Contexto | Valid |
| Principal + Contexto | Invalid |

Removing a link removes only the relationship. It does not delete, trash, cancel, or archive the Task.

### Plan-Event

`PRODUCT_FROZEN`

An Event belongs to zero Plans or one Plan at most. No many-to-many cardinality is approved.

| Dimension | Values |
|---|---|
| Importance | Principal, De apoyo |
| Function | Contribuye, Contexto, Define fecha, Evento final |

Rules:

| Rule | Result |
|---|---|
| Contexto | Requires De apoyo |
| Evento final | Requires Principal |
| Contribuye | Can be Principal or De apoyo |
| Define fecha | Can be Principal or De apoyo |
| Past Event | Not automatically resolved |

Removing a link removes only the relationship. It does not delete, trash, cancel, or archive the Event.

### Personal Entity Linked To Household Plan

`PRODUCT_FROZEN`

Linking a personal entity to a household Plan is blocked by default. The user must explicitly share the entity if allowed. The product must not silently change scope or leak personal data.

## 8. Progress

`PRODUCT_FROZEN`

Planner uses deterministic hybrid Plan progress.

| Layer | Contract |
|---|---|
| Qualitative summary | Recién iniciado, Avanzando, Bloqueado, En riesgo, Cerca de completarse, Listo para completar |
| Main count | `N de M elementos principales resueltos` when principal elements exist |
| Separate indicators | Tasks, Events, Milestones, Measurements, Requirements |
| Requirements | Show pending, satisfied, annulled separately |
| Percentage | Only for Measurements with current value, target, clear unit, and understandable operation |

Resolved principal count includes:

| Element | Counts when |
|---|---|
| Task principal | Completed, or verified when verification is required |
| Event principal | Resolved according to its Plan function |
| Milestone principal | Completed |
| Measurement principal | Target reached |

It does not count pending, in-review, unconfirmed, unreached, cancelled, or trashed elements. Requirement annulment resolves a gate but does not count as achieved progress.

AI may explain, suggest, and summarize. AI must not silently modify what counts, invent progress, or replace deterministic rules.

## 9. Lifecycles

### Plan

`PRODUCT_FROZEN`

| State | Meaning |
|---|---|
| En preparación | Real Plan exists but is not running |
| Activo | Plan is executing |
| Pausado | Plan is temporarily waiting |
| Completado | Lo logramos |
| Cerrado | Stopped, abandoned, replaced, impossible, duplicate, or no longer needed |

Projections: Bloqueado, En riesgo, Listo para completar. Orthogonal states: Archived, Trash.

Completion is human-only and generates Activity. Closing requires structured reason, optional comment, resolution of active entities, and Activity. Completed and Closed must not be merged.

### Task

`PRODUCT_FROZEN`

Human labels: Pendiente, Asignada, Tomada, Hecha, En revisión, Verificada, Corrección pedida, En revisión nuevamente, Cancelada, Reactivada, En Trash, Restaurada.

A Task without verification is resolved when completed. A Task with verification is resolved only when verified. A Task in review, cancelled, or trashed is not resolved for Plan completion. A cancelled principal Task leaves the Plan unresolved until it is reactivated, replaced, changed to De apoyo, or unlinked.

### Event

`PRODUCT_FROZEN`

Events use scheduled/cancelled/past/reactivated where applicable plus series, occurrence, RSVP, and attendance concepts. There is no universal Event state `Realizado`. Past is not fulfilled. RSVP is not fulfillment. Attendance does not automatically satisfy the Plan. Series and occurrence remain distinct, with visible edit scopes: Esta ocurrencia, Esta y las siguientes, Toda la serie.

## 10. Presets

`PRODUCT_FROZEN`

| Class | Contract |
|---|---|
| HomePlus | Immutable, not editable, not deletable, not archivable; can be copied with Guardar como mi preset |
| Personal | Owner-only, editable, revisioned, recoverable through Trash |
| Familiar | Permission-visible, authorized use, authorized edit, revision history |

Plan Preset flow:

```text
Elegir Preset de Plan
-> preview editable sin crear entidades
-> confirmar Crear Plan
-> Plan real En preparación
-> Tasks/Events preparados no productivos dentro del Plan
-> Activar
-> resumen final completo
-> materializar Tasks/Events preparados
-> Plan Activo
```

Task/Event Presets integrate inline in their forms. Immediate creation is only allowed for trivial cases where all required data is already resolved. Event Presets always require date/time confirmation where relevant. Plan Presets always use preview before creation and do not create productive Tasks/Events until activation.

## 11. Drafts

`PRODUCT_FROZEN`

Creation Draft means: form not confirmed, no productive entity, owner-only, autosaved, recoverable, multiple allowed, expires, no family Activity, no productive Search, no Planner entity.

Plan En preparación means: real Plan exists, technical draft lifecycle, visible copy `En preparación`, does not expire automatically, not yet executing, editable objective and structure, may contain prepared elements.

The same visible term must not be used for both concepts.

Draft rules:

| Rule | Contract |
|---|---|
| Multiple Drafts | Allowed per domain; never overwritten automatically |
| Recovery sheet | Continuar Draft, Ver otros Drafts, Crear nuevo |
| Central recovery | Secondary screen grouped by Tasks, Events, Plans; not a main Planner tab |
| TTL | 30 days from last edit; edit renews TTL |
| Warning | About 7 days before expiry |
| Expiry | No family Activity; private owner notice allowed |
| Exit with meaningful content | Seguir editando, Conservar como Draft, Descartar |
| Autosave | Technical autosave allowed; does not create productive entity |

Draft attachments remain `OPEN_TECHNICAL_VALIDATION`.

## 12. Forms

`PRODUCT_FROZEN`

Planner uses mobile-first contextual quick forms with progressive disclosure and advanced options. No universal long form and no mandatory wizard for simple flows.

| Form | Minimum | Context can prefill | Advanced |
|---|---|---|---|
| Task | Title | assignee, date, Plan, importance, preset, recurrence, verification | description, priority, category, dates, recurrence, verification, evidence requirement, Plan link, scope |
| Event | Title and date/time or all-day | selected date, Plan, preset, location, participants | end, timezone, recurrence, participants, scope, Event role inside Plan |
| Blank Plan | Title and Personal/Familiar | context | description, category, target date |
| Plan from Preset | Preview before create | preset structure | editable preview fields |

Blank Plan creation creates Plan En preparación and opens Plan Detail/editor. Plan from Preset previews first and creates no productive Tasks/Events until activation.

## 13. Verification And Evidence

`PRODUCT_FROZEN`

Evidence can be required by an authorized Task creator, Preset, Plan, Requirement/policy relationship, or authorized household policy.

First version supports one or more images and optional comment. Video, audio, and generic documents are not included initially unless a future explicit product decision adds them.

Evidence belongs to completion attempts, not to the Task as one mutable field. Each attempt preserves images, comment, actor, timestamp, upload state, review result, and correction. Correction creates a new attempt and never silently replaces previous evidence.

Offline behavior: completion and files can be Pending de envío; the Task does not become En revisión until upload is confirmed and never appears Verificada before review. Upload failure creates private Attention for the actor. Self-verification is prohibited and copy explains another person must verify.

Task Review is accessible from Attention, Planner, Tasks, En revisión filters, and Task Detail for authorized actors. Review Sheet shows images, comment, attempt history when allowed, approve, request correction, correction comment, and open Task. Verificar and Abrir are distinct actions; blind one-tap approval from Attention is not allowed.

## 14. Attention

`PRODUCT_FROZEN`

Attention is a queue of actions. Each item defines reason, responsible actor, priority, primary action, secondary action, destination, result, and invalidation.

Examples: Verificar Task, Corregir Task, Responder Event, Resolver Plan bloqueado, Evidence upload fallido, Draft próximo a expirar privately, sync conflict.

The primary action attempts to resolve the problem. Abrir navigates to the entity. After resolution, the item disappears or updates, and Activity is generated when applicable.

## 15. Activity

`PRODUCT_FROZEN`

Activity row opens Activity Detail. Activity Detail shows what happened, who, when, household/scope visible, entity, related Plan, previous state, next state, redacted metadata, evidence only with permission, and separate buttons to open entities. It must not include general editing controls.

Important changes are individual. Repetitive minor changes can be grouped with Ver más. Draft expiration does not generate family Activity.

## 16. Archive, Trash, Retention

### Cancelled

`PRODUCT_FROZEN`

Cancelled Task/Event hides from active views, appears in Canceladas for 30 days, can be reactivated during that period, preserves history, and does not count completed. Before 30 days, private warning is shown. After 30 days, it moves automatically to Trash, stays there 7 days, then purges permanently.

### Manual Trash

`PRODUCT_FROZEN`

Task, Event, Plan, or Personal Preset manually sent to Trash remains 30 days, can be restored, then purges.

### Purge

`PRODUCT_FROZEN`, implementation `OPEN_TECHNICAL_VALIDATION`

After purge, the entity disappears, cannot restore, does not appear in Search or Planner, has no Detail, and has no valid navigation. Desired product is full hard delete when references allow. Minimal technical tombstone is allowed only for integrity/Activity and may contain only technical ID, type, deleted_at, permanently_deleted. It must not preserve title, description, files, evidence, personal data, assignees, or private content. Activity can show `Se eliminó una tarea` without navigation or sensitive metadata.

### Archive

`PRODUCT_FROZEN`

Task and Event do not use Archive as principal lifecycle. Plan Completed or Closed can be archived. Archive does not expire, does not delete, does not change lifecycle truth, and does not cascade to Tasks/Events. Active Plan cannot remain Active inside Archive; action is Cerrar y archivar.

## 17. Legacy Migration

`PRODUCT_FROZEN`, implementation `OPEN_TECHNICAL_VALIDATION`

Final product has one visible entity: Plan; one final route: PlanDetail; one list; one Detail; one Home projection; one Search; one Trash; one progress model.

Goal to Plan migration is automatic when mapping is unequivocal and guided only for conflicts. The product must not require manual review of every Goal, convert only on open as the primary strategy, or keep Goal and Plan visible in parallel.

Migration preserves title, description, compatible category, semantically equivalent dates, scope, Tasks, verification, cancelled/history, lifecycle, Activity by permission, and Trash where applicable. Legacy percentage is not preserved as universal percentage; it becomes separate indicators and interpretable principal progress.

## 18. Navigation

`PRODUCT_FROZEN`, implementation `OPEN_TECHNICAL_VALIDATION`

During transition, a resolver receives an ID, determines Goal or Plan, opens a valid destination, uses mapping when present, and prevents Plan not found. Final route is PlanDetail. GoalDetail must be retired gradually as a physical ambiguous name and must not permanently represent Plans.

Home and Search must never send a legacy Goal ID into Current Plan Detail without resolution.

## 19. Privacy

`PRODUCT_FROZEN`, implementation `OPEN_TECHNICAL_VALIDATION`

Personal data is owner-only unless explicitly shared. Scope can be edited after creation when the actor has permission, consequences are shown, members/assignees/links/Activity/cache/visibility are resolved, and no silent scope change occurs. Linking a personal entity into a household Plan is blocked unless sharing is explicit.

RLS and cache invalidation are Phase 0D validations.

## 20. Permissions

Conceptual actors:

| Actor | Meaning |
|---|---|
| Owner | Owns personal entity or created resource |
| Assignee | Person responsible for Task work |
| Verifier | Person authorized to review Task completion |
| Plan actor autorizado | Person authorized to mutate Plan lifecycle/structure |
| Household role autorizado | Household role with permission for shared operations |
| Event participant | Participant able to RSVP/respond where applicable |
| Viewer | Read-only actor |

Permission contract:

| Action | Required actor type |
|---|---|
| Activar Plan | Plan actor autorizado |
| Pausar Plan | Plan actor autorizado |
| Completar Plan | Plan actor autorizado |
| Cerrar Plan | Plan actor autorizado |
| Reabrir Plan | Plan actor autorizado |
| Archivar Plan | Plan actor autorizado |
| Change Principal/De apoyo | Plan actor autorizado; confirmation when active |
| Anular Requirement | Authorized actor; mandatory reason |
| Share personal entity | Owner plus required household permission |
| Verify Task | Verifier, never same actor when self-verification is prohibited |
| Request correction | Verifier |
| Edit household Preset | Household role autorizado |
| Restore from Trash | Owner or authorized household role |
| Future manual purge | Owner or authorized household role with explicit destructive permission |

No RLS policy names are defined in 0C.

## 21. Screen Contracts

All surfaces are `PRODUCT_FROZEN` at functional level, not pixel-perfect design. Each must define purpose, entry, visible data, primary/secondary actions, empty/loading/offline/error/permission denied/entity missing/uncertain mutation states, success destination, Draft relation, Preset relation, and Reliability relation.

| Surface | Functional contract |
|---|---|
| Planner Home/List | Entry to active Tasks, Events, Plans, Attention, Search, Trash/Archive shortcuts; no Goal root |
| Tasks list | Filter active, assigned, review, done, cancelled; create Task; open detail/review |
| Task Detail | Show lifecycle, assignment, Plan link, verification/evidence attempts, history, cancel/trash/reactivate actions |
| Task Quick Form | Minimal title-first creation with contextual defaults and Draft/Preset support |
| Task Full/Advanced Form | Expanded fields, recurrence, verification/evidence requirement, Plan link, scope |
| Task Review Sheet | Dedicated verification/correction surface; not blind Attention approval |
| Events/Calendar | Calendar/list with recurrence, occurrence edit scopes, RSVP/attendance where applicable |
| Event Detail | Schedule, recurrence, participants, Plan role, cancel/reactivate/edit actions |
| Event Quick Form | Title + date/time or all-day, contextual defaults, Preset/Draft support |
| Event Advanced Form | Timezone, recurrence, participants, scope, Plan role |
| Plans list | Lists Plans only; filters lifecycle/projections/archive; no Goal list |
| Plan Creation Preview | Editable preset preview; no productive entity before confirmation |
| Plan Detail | Objective, lifecycle, projections, structure, principal count, indicators, Requirements, linked/prepared items, actions |
| Plan Structure Editor | Add/edit/remove/reorder Tasks, Events, Milestones, Measurements, Requirements in preparation and active states as permitted |
| Plan Activation Review | Final summary; confirms responsible actors, dates, recurrence, scope, entities; materializes prepared Tasks/Events |
| Plan Pause Resolution | Shows active Tasks, Events, recurrences; default stop with Plan; user can keep active individually |
| Plan Completion Review | Shows readiness, remaining supporting items, conflicts, human confirmation |
| Close and Archive flow | Structured close reason, active entity resolution, archive flag if chosen |
| Preset inline selector | Contextual suggestions and chip `Usando preset`; change/remove |
| Preset Library | Secondary exploration/admin surface for HomePlus, personal, household presets |
| Draft recovery sheet | Continue Draft, View other Drafts, Create new |
| Draft central recovery | Secondary grouped recovery by Tasks, Events, Plans |
| Attention list | Action queue with primary action and Open separated |
| Activity list | Chronological feed; row opens Activity Detail |
| Activity Detail | Read-only redacted audit detail with separate entity buttons |
| Trash | Restore or allow retention expiry; no active duplicate copy |
| Archive | Terminal Plan preservation; no active Plan in archive |
| Legacy Goal Resolver | Transitional safe resolver for Goal/Plan IDs and mapping |

## 22. Copy

Canonical visible Spanish copy:

| Concept | Copy |
|---|---|
| Preparation | En preparación |
| Active | Activo |
| Paused | Pausado |
| Completed | Completado |
| Closed | Cerrado |
| Blocked | Bloqueado |
| At risk | En riesgo |
| Ready to complete | Listo para completar |
| Principal | Principal |
| Supporting | De apoyo |
| Requirement pending | Requirement pendiente |
| Requirement satisfied | Requirement satisfecho |
| Requirement annulled | Requirement anulado |
| Pending upload | Pendiente de envío |
| In review | En revisión |
| Correction requested | Corrección pedida |
| Cancelled | Cancelada |
| In Trash | En Trash |
| Close and archive | Cerrar y archivar |
| Continue Draft | Continuar Draft |
| Create new | Crear nuevo |
| Activate Plan | Activar Plan |
| Pause Plan | Pausar Plan |
| Complete Plan | Completar Plan |
| Close Plan | Cerrar Plan |
| Reopen Plan | Reabrir Plan |
| Annul Requirement | Anular Requirement |
| Final Event occurred | Evento final ocurrido |
| Final Event did not occur | Evento final no ocurrido |

Technical terms such as DTO, graph, mutation, fulfillment, lifecycle, requirement hierarchy, tombstone, idempotency, and replay must not be shown to normal users.

## 23. Transition Matrices

### Contract Matrix

| Domain | Creation | Draft | Initial state | Activation | Principal/De apoyo | Completion | Cancellation | Reopen | Archive | Trash | Retention | Activity | Attention | Offline |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Task | Quick/contextual | Creation Draft | Pendiente | N/A | Via Plan link | Hecha or Verificada | Cancelada | Reactivada | No main archive | Manual/auto | Cancelled 30d, auto Trash 7d, manual Trash 30d | Yes | Review/correction/upload | Pending/uncertain; upload gated |
| Event | Quick/calendar/contextual | Creation Draft | Scheduled | N/A | Via Plan link | Resolved by Plan-specific rule | Cancelled | Reactivated where allowed | No main archive | Manual/auto | Cancelled 30d, auto Trash 7d, manual Trash 30d | Yes | RSVP/final/action cases | Pending/uncertain recurrence edits |
| Plan | Blank or Preset preview | Creation Draft before create; En preparación after create | En preparación | Human Activar Plan | Structure/link chip | Human Completar Plan | Use Cerrado, not Cancelled | Reabrir Plan | Terminal only | Manual | Manual Trash 30d; Archive no expiry | Yes | Blocked/review required | Pending/uncertain until confirmed |
| Milestone | Plan structure | Plan preparation only | Pending | Can make Plan activatable | Yes | Completed counts | Remove/replace, not main cancellation | Reopen milestone | Through Plan | Technical validation | Technical validation | Yes | Blocker/progress | Structure replay validation |
| Measurement | Plan structure | Plan preparation only | Not reached/current | Can make Plan activatable | Yes | Target reached counts | Remove/replace, not main cancellation | Correct/update history | Through Plan | Technical validation | Technical validation | Yes | At-risk/blocker projection | Value replay validation |
| Requirement | Plan structure | Plan preparation only | Pendiente | Blocks activation when pending | N/A | Satisfied/annulled gate | Annul, not cancel | Reset/reopen validation | Through Plan | Technical validation | Technical validation | Yes, especially annul | Blocker item | Gate replay validation |
| Preset | HomePlus/personal/family | Preset revision draft only | Published/revision | N/A | N/A | N/A | N/A | Restore allowed trash/revision | No HomePlus archive | Personal Trash | Personal Trash 30d | Use/edit events where relevant | N/A | Prepare/apply replay validation |
| Draft | Autosave/explicit keep | Itself | Live | N/A | N/A | Confirm creates entity or continue | Discard/expire | Continue before expiry | No | Not product Trash | 30d from last edit | No family Activity | Private expiry warning | Local/offline recovery |
| Evidence | Completion attempt | Draft attachment validation | Pending upload | N/A | N/A | Review outcome | Purged by policy | Correction creates new attempt | No | With owning entity policy | Technical validation | Redacted | Upload failed | Upload queue pending |

### Plan Allowed

| Transition | Allowed |
|---|---|
| En preparación -> Activo | Yes, activation gate passes |
| Activo -> Pausado | Yes, with impact review when active entities exist |
| Pausado -> Activo | Yes |
| Activo/Pausado -> Completado | Yes, completion gate passes and human confirms |
| Activo/Pausado -> Cerrado | Yes, reason and active entity resolution required |
| Completado/Cerrado -> Activo | Yes through Reabrir Plan |
| Completado/Cerrado -> Archived | Yes |
| Activo -> Cerrado + Archived | Yes through Cerrar y archivar |
| Allowed state -> Trash | Yes with permission |
| Trash -> previous state | Yes before retention expiry |
| Trash expired -> permanently deleted | Yes |

### Plan Prohibited

| Transition | Reason |
|---|---|
| Empty Plan -> Activo | No useful primary element |
| Pending activation Requirement -> Activo | Gate blocked |
| Automatic completion | Completion is human-only |
| Active -> Archived without Closed | Active Plan cannot remain active in Archive |
| Final Event past -> Plan completed | Past is not confirmation |

### Task Allowed

| Transition | Allowed |
|---|---|
| Pending -> Completed | Yes |
| Pending -> Cancelled | Yes |
| Completed requiring verification -> En revisión | Yes after evidence/upload submission |
| En revisión -> Verificada | Yes by authorized verifier |
| En revisión -> Corrección pedida | Yes by authorized verifier |
| Corrección pedida -> En revisión nuevamente | Yes on resubmission |
| Cancelada -> Reactivada | Yes during cancellation window |
| Cancelada 30d -> Trash | Automatic |
| Trash -> Restaurada | Yes before expiry |
| Trash expired -> permanently deleted | Yes |

### Task Prohibited

| Transition | Reason |
|---|---|
| En revisión -> resolved Plan contribution | Review is not verified |
| Cancelada -> completed contribution | Cancelled is not done |
| Self-verification | Prohibited |
| Principal -> De apoyo in active Plan without confirmation | Requires confirmation and Activity |

### Event Allowed

| Transition | Allowed |
|---|---|
| Scheduled -> Cancelled | Yes |
| Cancelled -> Reactivated | Yes where domain allows |
| Series active -> paused | Yes |
| Series paused -> active | Yes |
| Occurrence override | Yes without destroying series |
| Cancelled 30d -> Trash | Automatic |
| Trash expired -> permanently deleted | Yes |

### Event Prohibited

| Transition | Reason |
|---|---|
| Past -> fulfilled automatically | Past is not realization |
| RSVP -> Event fulfilled | RSVP is participant response |
| Attendance -> Plan satisfied automatically | Plan satisfaction needs function-specific rule |
| Occurrence edit -> whole series mutation silently | Scope must be explicit |

## 24. Product Definition Of Done

Final implementation is done only when these product truths hold:

| Area | Required truth |
|---|---|
| Root | One visible Plan root; Goal not visible as final product |
| Task creation | Quick Task creation remains fast and contextual |
| Event creation | Contextual Event creation supports calendar/date patterns |
| Plan creation | Preview/preparation exists; Plan Preset creates no productive Tasks/Events before activation |
| Activation | Single product intention; prepared Tasks/Events materialize on activation |
| Progress | Hybrid deterministic progress replaces legacy universal percentage |
| Importance | Principal/De apoyo applies to Tasks, Events, Milestones, Measurements |
| Requirements | Activation/completion gates with satisfy/annul flows |
| Milestones | Add/edit/complete/reopen/order works as Plan structure |
| Measurements | Numeric target/history/indicator works |
| Verification | Task verification and self-verification prohibition work |
| Evidence | Images per completion attempt with upload/review/correction/offline states |
| Recurrence | Event series/occurrence scopes and Plan relationship are safe |
| Presets | HomePlus/personal/family rules and inline selectors work |
| Drafts | Multiple owner-only Drafts, recovery, TTL, warning, discard work |
| Attention | Action queue resolves or updates items |
| Activity Detail | Redacted read-only details and separate open actions work |
| Completed/Closed | Meanings and transitions remain separate |
| Pause | Active entity impact resolution works |
| Archive | Terminal Plan archive only; no cascade |
| Cancelled/Trash | Retention windows and restore/purge behavior work |
| Migration | Goal data converges into Plan without duplicate visible roots |
| Home/Search | Consistent Plan projection and safe resolver |
| Privacy | Personal/household scope isolation across surfaces |
| Offline | Queued/uncertain states are explicit; no duplicate or silent data loss |
| Errors | Loading, offline, permission, missing, uncertain states are visible |
| Accessibility | Actions do not depend on hidden gestures or color-only meaning |
| Reliability | Single-flight, idempotency, replay, duplicate-submit prevention hold |
| Android runtime | End-to-end acceptance passes on Android runtime |

This DoD is a future implementation gate. Phase 0C does not declare it implemented.

## 25. Open Technical Validation For 0D

`OPEN_TECHNICAL_VALIDATION`

0D must validate at least:

| Topic |
|---|
| Representation of prepared Tasks/Events |
| Atomic activation as technical operation |
| Plan-Task link |
| Plan-Event link |
| Zero-or-one Task/Event Plan cardinality |
| Principal/De apoyo constraints |
| Requirement activation/completion gate |
| Audited Requirement annulment |
| Manual Condition elimination/migration |
| Progress projections |
| Final Event resolution |
| Task/Event recurrence relationship |
| Plan pause orchestration |
| Plan preset atomicity |
| Draft live TTL |
| Draft attachments |
| Evidence attempt tables |
| Storage and thumbnails |
| Upload queue |
| RLS |
| Retention |
| Cancelled 30 days |
| Automatic Trash 7 days |
| Manual Trash 30 days |
| Cleanup jobs |
| Hard delete |
| Tombstones |
| Activity Detail DTO |
| Attention handlers |
| Goal migration |
| Bridge |
| `task.goal_id` migration |
| Home resolver |
| Search consistency |
| Route renaming |
| Cache invalidation |
| Offline replay |
| Idempotency |
| REC-0A duplicate execution |

## 26. Rejected Alternatives

| Alternative | Reason |
|---|---|
| Goal and Plan permanent parallel products | Duplicates roots, routes, progress, Search, Home, Trash |
| Manual Condition visible entity | Redundant with Milestone/Requirement/Task/Measurement |
| Universal percentage | Misleading across heterogeneous entities |
| Weighted progress | Overconfigured and false precision |
| AI as progress authority | Non-deterministic and unsafe |
| Plan Preset immediate productive creation without preview | Unsafe multi-entity generation |
| Productive Tasks/Events before activation from Plan Preset | Breaks preparation semantics |
| Many-to-many Plan-Task | Rejected cardinality |
| Many-to-many Plan-Event | Rejected cardinality |
| Link blockers duplicated with Requirements | Confuses source of obligation |
| Optional Requirement | Contradicts Requirement meaning |
| Past Event equals fulfilled Event | False assumption |
| Final Event auto-completes Plan | Completion is human-only |
| Universal long form | Slows simple flows |
| Mandatory Preset Library path | Unnecessary friction |
| Single Draft per domain | Would overwrite user work |
| Archive active Plan without Closed | Hides active truth |
| Cascading Archive | Hides unrelated active entities |
| Immediate hard delete of Cancelled | Unsafe recovery/history |
| Cancelled and Trash as synonyms | Different lifecycle meanings |
| Purge that breaks Activity/references | Unsafe history/integrity |
| GoalDetail as final Plan route | Keeps legacy ambiguity |
| Draft as family/productive entity | Violates Draft privacy and non-productivity |

## 27. Deferred Items

| Item | Status |
|---|---|
| Full hierarchical Requirements UI | `DEFERRED_POST_MVP` |

The technical ability to represent hierarchy is not removed by 0C. Only the full hierarchy UI is deferred; simple flat Requirements remain MVP contract.

## 28. Contradictions Resolved

| Contradiction | Resolution |
|---|---|
| Creation Draft vs Plan En preparación | Separate concepts; no shared visible Borrador label |
| Manual Condition vs Milestone | Manual Condition removed from canonical product; Milestone for achieved checkpoint |
| Requirement vs Principal/De apoyo | Requirements are mandatory gates; Principal/De apoyo applies to actionable/progress elements |
| Link blockers vs Requirement blockers | No link blocker effects; obligations come from Principal items and Requirements |
| Goal vs Plan | Plan is future root; Goal migrates/resolves |
| Past Event vs resolved Event | Past is not resolved; confirmation needed when Plan depends on it |
| Completed vs Closed | Completed means achieved; Closed means stopped/not achieved |
| Closed vs Archive | Closed is lifecycle; Archive is visibility/preservation |
| Cancelled vs Trash | Cancelled is reversible domain state before automatic Trash; Trash is deletion recovery |
| Manual Trash 30d vs auto-Trash 7d | Manual Trash keeps 30d; Cancelled auto-moves to Trash after 30d and stays there 7d |
| Activity vs purged entity | Activity may keep redacted event without navigation or sensitive metadata |
| Preset preview vs productive creation | Preview creates no productive entities |
| Prepared Task/Event vs productive entity | Prepared items are Plan-local until activation materializes them |
| Active Plan archive | Use Cerrar y archivar; active does not remain active in Archive |
| Legacy universal percentage vs hybrid progress | Legacy percent becomes interpretable indicators, not universal percent |
| Task/Event one Plan vs many-to-many | Zero-or-one Plan cardinality frozen |
| Recurrent Plan vs completed cycle | Routine Plan stays Active; occurrences complete independently |
| Draft expiration vs real Plan | Draft expires; Plan En preparación does not automatically expire |

## 29. Final Verdict

Product contract status:

```text
PHASE_0C_PRODUCT_CONTRACT_FROZEN - TECHNICAL_VALIDATION_PENDING
```

Phase 0C freezes product behavior, UX functional contracts, lifecycle meanings, progress rules, forms, surfaces, permissions, copy, transitions, retention policy, migration target, and rejected alternatives.

Phase 0 is not fully frozen. Implementation remains blocked until Phase 0D validates technical feasibility and defines DB/backend/runtime/storage/RLS/reliability mechanics.
