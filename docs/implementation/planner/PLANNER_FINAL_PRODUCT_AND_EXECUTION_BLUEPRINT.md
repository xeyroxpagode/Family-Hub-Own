# PLANNER FINAL PRODUCT AND EXECUTION BLUEPRINT

STATUS: `PHASE_0D_TECHNICAL_ARCHITECTURE_AND_ROADMAP_FROZEN - PHASE_0_FREEZE_PENDING`

This Blueprint is the frozen Planner product and technical execution contract after Phase 0D-B. It defines what the product must do, which UX behaviors are canonical, which lifecycle/progress/retention/permission rules are frozen, and which technical architecture, migrations, endpoints, Storage, RLS, jobs, backfills, replay mechanics, and implementation order are frozen for execution.

Implementation remains blocked until the user approves Phase 0 Freeze.

## 0. Product Freeze Summary

| Area | Contract status |
|---|---|
| Product behavior | `PRODUCT_FROZEN` |
| UX functional contract | `PRODUCT_FROZEN` |
| Lifecycles | `PRODUCT_FROZEN` |
| Progress rules | `PRODUCT_FROZEN` |
| Forms and surfaces | `PRODUCT_FROZEN` |
| Copy | `PRODUCT_FROZEN` |
| Permissions | `PRODUCT_FROZEN` at conceptual actor level |
| Technical architecture | `TECHNICAL_FROZEN` |
| Phase 0 overall | `PHASE_0_FREEZE_PENDING` |
| Implementation | Blocked until user approval |

Authoritative Phase 0C report:

| Source | Result |
|---|---|
| `docs/implementation/planner/PLANNER_PHASE_0C_PRODUCT_CONTRACT_FREEZE.md` | `PLANNER_PHASE_0C_PRODUCT_CONTRACT_FROZEN` |

Authoritative Phase 0D-B report:

| Source | Result |
|---|---|
| `docs/implementation/planner/PLANNER_PHASE_0D_B_TECHNICAL_ARCHITECTURE_AND_EXECUTION_ROADMAP.md` | `PLANNER_PHASE_0D_TECHNICAL_ARCHITECTURE_AND_ROADMAP_FROZEN` |

Decision hierarchy used:

| Priority | Source |
|---|---|
| 1 | Explicit user decisions in Phase 0C |
| 2 | Runtime/manual evidence documented before 0C |
| 3 | Direct code and DB evidence |
| 4 | Phase 0B stress tests |
| 5 | Phase 0A evidence |
| 6 | Historical documents |
| 7 | Declarative tests/reports |

## 1. Vision

Planner combines V1 practical fluency with Current safety contracts. The final product has one visible organized-objective root: Plan. Legacy Goal remains a productive historical root only until migration/resolution converges it into Plan.

The final Planner must not permanently expose:

| Forbidden duplicate | Final contract |
|---|---|
| Goal and Plan as visible parallel products | One Plan root |
| Two equivalent create forms | One Plan creation model |
| Two Details for objectives | One PlanDetail |
| Two progress models | Hybrid deterministic Plan progress |
| Two user-visible routes | Final PlanDetail route |
| Two Trashes for objectives | One Plan Trash projection |
| Goal Home vs Plan Search split | One consistent Plan projection |

## 2. Canonical Product Model

`PRODUCT_FROZEN`

A Plan can combine Tasks, Events, Milestones, Measurements, and Requirements. It can be simple or complex, and no universal progress mode is required. Users may create a Plan with a single useful action. The product must not show a deterministic warning that a Plan is too small, auto-convert it to a Task, force extra elements, or require a minimum count beyond activation readiness.

Future AI may suggest simpler structure, explain status, or summarize context. AI is not authority for progress, completion, hidden mutation, or what counts.

## 3. Glossary

| Term | Product meaning | Status |
|---|---|---|
| Plan | Canonical root for organized objectives | `PRODUCT_FROZEN` |
| Goal | Legacy productive root that must migrate/resolve into Plan | `PRODUCT_FROZEN`, `TECHNICAL_FROZEN` migration roadmap |
| Creation Draft | Owner-only, non-productive saved form payload | `PRODUCT_FROZEN` |
| Plan En preparación | Real Plan already created, not executing yet | `PRODUCT_FROZEN` |
| Task | Executable action | `PRODUCT_FROZEN` |
| Event | Time commitment/context with schedule/recurrence concepts | `PRODUCT_FROZEN` |
| Milestone | Achieved phase/result | `PRODUCT_FROZEN` |
| Measurement | Numeric current-vs-target tracker | `PRODUCT_FROZEN` |
| Requirement | Mandatory external/prerequisite condition for activation or completion | `PRODUCT_FROZEN` |
| Manual Condition | Legacy/technical concept only; no canonical visible surface | Legacy/migration only, no final product contract |
| Preset | Reusable configuration/template | `PRODUCT_FROZEN` |
| Evidence | Completion-attempt proof | `PRODUCT_FROZEN`, `TECHNICAL_FROZEN` architecture |
| Attention | Action queue | `PRODUCT_FROZEN` |
| Activity Detail | Redacted read-only detail for an Activity row | `PRODUCT_FROZEN` |

The visible word `Borrador` must not be used for both Creation Draft and Plan En preparación. They are separate concepts.

## 4. Entities

| Entity | Product contract |
|---|---|
| Plan | Owns objective, structure, lifecycle, progress projection, activation/completion/close/pause/archive actions |
| Task | Can be standalone or linked to zero/one Plan; completion may require verification/evidence |
| Event | Can be standalone or linked to zero/one Plan; past does not mean occurred/resolved |
| Milestone | Plan structure item representing a result or phase reached |
| Measurement | Plan structure item for numeric target/history |
| Requirement | Mandatory gate for activation or completion; pending blocks relevant transition |
| Preset | HomePlus/personal/family reusable payload with source-specific mutability |
| Draft | Owner-only creation payload with TTL and recovery |
| Evidence | One or more images plus optional comment per completion attempt in first version |
| Attention item | Actionable item with primary resolution action and secondary Open action |
| Activity row/detail | Audit/history projection, with permission-safe detail |

Manual Condition is not an entity users can add, select, chip, configure, or use as a progress mode. Legacy Manual Condition data migrates to Milestone. Milestone is the single canonical representation of an achieved checkpoint or phase reached. Requirement remains an independent canonical entity for external or prerequisite mandatory conditions, and is not the migration target for Manual Condition.

## 5. Creation Draft And Plan Preparation

### Creation Draft

`PRODUCT_FROZEN`

Means: form not confirmed, no productive entity created, owner-only, autosaved, recoverable, multiple allowed, expires, no family Activity, no productive Search, no Planner entity.

### Plan En preparación

`PRODUCT_FROZEN`

Means: real Plan exists, technical draft lifecycle, visible copy `En preparación`, not executing, no automatic expiration, objective and structure remain editable, may contain prepared elements.

## 6. Plan Presets And Prepared Elements

`PRODUCT_FROZEN`

Frozen flow:

```text
Elegir Preset de Plan
-> preview editable sin crear entidades
-> revisar objetivo, Tasks, Events, Milestones, Measurements, Requirements
-> Crear Plan
-> Plan real En preparación
-> persistir estructura
-> Tasks/Events preparados no productivos dentro del Plan
-> editar/agregar/quitar/reordenar preparación
-> Activar
-> resumen final completo
-> confirmar responsables, fechas, recurrencias, scope, entidades
-> materializar todo lo incluido
-> Plan Activo
```

Before `Crear Plan`: no productive Plan, Tasks, or Events exist. After `Crear Plan`: Plan En preparación exists, Milestones/Measurements/Requirements are structure, prepared Tasks/Events appear only inside the Plan, and prepared Tasks/Events do not appear in Planner Tasks, Calendar, productive Attention, active assignments, or recurrences. Activation materializes all remaining prepared Tasks/Events as one product intention. Phase 0D-B freezes activation as a single backend transactional operation with idempotent materialization.

## 7. Activation

`PRODUCT_FROZEN`

A Plan can activate when it contains at least one useful principal element: prepared Task, prepared Event, Milestone, or Measurement. A Plan cannot activate with pending activation Requirements. Requirements may be satisfied or annulled according to contract. Activation requires human confirmation. Empty Plans cannot activate.

The previous technical limitation requiring Milestone, Measurement, or Manual Condition is not final product behavior. Phase 0D-B resolves the target architecture: activation accepts useful principal prepared Tasks, prepared Events, Milestones, or Measurements and rejects pending activation Requirements.

## 8. Manual Condition

`PRODUCT_FROZEN`

Manual Condition is not part of the final canonical product. It must not exist as a visible section, form, advanced option, chip, action, selectable entity, or progress mode.

Legacy mapping:

| Legacy meaning | Final representation |
|---|---|
| Achieved result/checkpoint | Milestone |
| External or prerequisite mandatory condition | Requirement (independent canonical entity; not a Manual Condition migration target) |

Manual Condition migrates to Milestone only. Milestone is the single canonical representation of an achieved checkpoint or phase reached. Requirement remains an independent canonical entity for external or prerequisite mandatory conditions sourced from outside the Plan; it is not the migration target for Manual Condition legacy data.

Physical deletion/migration is frozen as staged backfill, read bridge, write cutover, read cutover, and legacy removal. Manual Condition legacy migrates only to Milestone.

## 9. Importance

`PRODUCT_FROZEN`

Two levels exist:

| Level | Meaning |
|---|---|
| Principal | Required for the Plan to become Listo para completar |
| De apoyo | Related/useful, does not block completion |

Applies to Tasks, Events, Milestones, and Measurements. Defaults:

| Element/action | Default |
|---|---|
| Task created from Plan | Principal |
| Task linked to Plan | De apoyo, editable |
| Event created as central commitment | Principal |
| Event linked as context | De apoyo |
| Milestone | Principal |
| Measurement central objective | Principal |

Users are not forced to choose before saving. The UI shows a modifiable chip with default applied.

## 10. Requirements

`PRODUCT_FROZEN`

Requirement is mandatory by definition. There is no optional Requirement, strict Requirement, nullable/anulable type, principal Requirement, or supporting Requirement.

| Applies to | Behavior |
|---|---|
| Activation | Pending blocks activation |
| Completion | Pending blocks completion |

States: Pendiente, Satisfecho, Anulado. Annulment is not satisfaction. Annulment requires authorized actor, mandatory reason, Activity, and record of who/when/why; then it stops blocking the relevant transition.

Avoid duplicate obligations:

| If the obligation is | Model as |
|---|---|
| Someone must do an action in Planner | Principal Task |
| A time commitment must occur | Principal Event |
| A phase/result must be reached | Principal Milestone |
| A value must be reached | Principal Measurement |
| External/prerequisite condition outside those entities | Requirement |

Do not create both a principal Task `Firmar contrato` and Requirement `Completar Task Firmar contrato`. Phase 0D-B freezes Requirements as independent mandatory gates and Plan-Task as a dedicated execution link.

## 11. Plan-Task And Plan-Event Links

`PRODUCT_FROZEN`

Cardinality: a Task can belong to zero or one Plan; an Event can belong to zero or one Plan. Many-to-many Plan-Task and many-to-many Plan-Event are rejected final contracts.

### Plan-Task

| Dimension | Values |
|---|---|
| Importance | Principal, De apoyo |
| Function | Contribuye, Contexto |

| Combination | Validity |
|---|---|
| Principal + Contribuye | Valid and required |
| De apoyo + Contribuye | Valid and not required |
| De apoyo + Contexto | Valid |
| Principal + Contexto | Invalid |

### Plan-Event

| Dimension | Values |
|---|---|
| Importance | Principal, De apoyo |
| Function | Contribuye, Contexto, Define fecha, Evento final |

| Rule | Contract |
|---|---|
| Contexto | Requires De apoyo |
| Evento final | Requires Principal |
| Contribuye | Principal or De apoyo |
| Define fecha | Principal or De apoyo |
| Past Event | Not automatically resolved |

The rejected technical-style link effects `blocks_activation` and `blocks_completion` are not final product contract. Obligation comes from Principal items and Requirements.

Removing a link removes only the relation. It does not delete, trash, cancel, or archive the Task/Event. Linking personal entity to household Plan is blocked by default and requires explicit share if permitted.

## 12. Progress

`PRODUCT_FROZEN`

Planner uses deterministic hybrid Plan progress:

| Layer | Values/rule |
|---|---|
| Qualitative projected summary | Recién iniciado, Avanzando, Bloqueado, En riesgo, Cerca de completarse, Listo para completar |
| Main count | `N de M elementos principales resueltos` |
| Indicators by type | Tasks, Events, Milestones, Measurements, Requirements |
| Requirements display | Pendientes, satisfechos, anulados |
| Percentage | Only for Measurements with current value, target, clear unit, understandable operation |

Counts as resolved: completed/verified principal Task according to verification rule, resolved principal Event according to function, completed principal Milestone, reached principal Measurement. Does not count pending, in review, unconfirmed, unreached, cancelled, or trashed elements. Requirement annulment resolves gate but does not count as achieved progress.

No universal percentage, no weighted average across entities, no configurable weights, and no AI-generated progress authority.

## 13. Completion

`PRODUCT_FROZEN`

A Plan is Listo para completar when:

| Gate | Required condition |
|---|---|
| Tasks | All principal Tasks resolved |
| Verifiable Tasks | All principal verifiable Tasks verified |
| Events | All principal Events resolved |
| Milestones | All principal Milestones completed |
| Measurements | All principal Measurements reached target |
| Requirements | All completion Requirements satisfied or annulled |
| Conflicts | No productive conflicts block transition |

Completion is always human, never automatic, requires authorized actor, and generates Activity. Supporting pending elements do not block completion; close/completion review may offer what to do with them.

## 14. Plan Lifecycle

`PRODUCT_FROZEN`

| State | Meaning |
|---|---|
| En preparación | Real Plan being assembled, not running |
| Activo | Executing |
| Pausado | Temporarily waiting |
| Completado | Lo logramos |
| Cerrado | Stopped, abandoned, replaced, unnecessary, impossible, duplicate, no longer meaningful |

Projections: Bloqueado, En riesgo, Listo para completar. Orthogonal states: Archived, Trash.

Completed can reopen or archive. Closed requires structured reason, optional comment, active entity resolution, and Activity. Quick close reasons: Ya no es necesario, Fue reemplazado, No puede realizarse, Duplicado, Otro. Completed and Closed must not merge.

## 15. Pause

`PRODUCT_FROZEN`

Pause flow:

```text
Pausar Plan
-> mostrar Tasks, Events, recurrencias activas
-> todos seleccionados por default para detenerse con el Plan
-> usuario marca cuáles mantener activas
-> resumen
-> confirmar
```

Default is stop with Plan. Task punctual not maintained is cancelled with possible reactivation. Event punctual not maintained is cancelled. Recurring series not maintained is paused, not destroyed. Maintained element continues active. Unlinking is separate. Pause does not remove links automatically. Copy must use the domain-accurate verb while making consequence clear.

## 16. Close And Archive

`PRODUCT_FROZEN`

Archive is a visibility/preservation condition for terminal Plans. It does not replace Completed or Closed, does not expire, and does not cascade to Tasks/Events.

Active Plan action is:

```text
Cerrar y archivar
-> elegir razón
-> resolver entidades activas
-> lifecycle Cerrado
-> archived true
```

Completed Plan can archive directly. Archiving a Plan must confirm what active related items continue. Active Plan cannot remain Active inside Archive.

## 17. Recurrent Plan

`PRODUCT_FROZEN`

A recurrent Plan represents an ongoing routine, such as `Mantener la casa limpia`. The Plan remains Activo, individual Task/Event occurrences complete, the Plan does not complete every cycle, and no new Plan is automatically created per cycle. It shows current cycle, next element, and routine state. It can pause or close when the routine ends.

## 18. Final Event

`PRODUCT_FROZEN`

An Event final is Principal, does not auto-complete the Plan, and is not resolved only because time passed. After scheduled time, authorized actor sees:

| Prompt | Options |
|---|---|
| ¿Este evento ocurrió como estaba previsto? | Sí, ocurrió; No ocurrió; Reprogramar |

If occurred, the Event final is resolved for the Plan and the Plan may become Listo para completar if nothing else blocks it. If cancelled, the user chooses: replace final Event, keep Plan unresolved, close Plan, or remove Event final from structure.

## 19. Task Lifecycle

`PRODUCT_FROZEN`

Human labels: Pendiente, Asignada, Tomada, Hecha, En revisión, Verificada, Corrección pedida, En revisión nuevamente, Cancelada, Reactivada, En Trash, Restaurada.

Rules: no-verification Task resolves when complete; verification Task resolves only when verified; in review does not count; cancelled does not count; cancelled principal Task leaves Plan unresolved until reactivated, replaced, changed to De apoyo, or unlinked. Changing principal to De apoyo inside active Plan requires confirmation and Activity.

## 20. Event Lifecycle

`PRODUCT_FROZEN`

No universal state `Realizado`. Event concepts: scheduled, cancelled, past, reactivated where applicable, series, occurrence, RSVP, attendance. Past is not occurred. RSVP is not fulfillment. Attendance does not automatically satisfy Plan. Series and occurrence remain distinct. Edit scopes visible: Esta ocurrencia, Esta y las siguientes, Toda la serie.

## 21. Presets

`PRODUCT_FROZEN`

| Class | Contract |
|---|---|
| HomePlus | Immutable; not editable, deletable, or archivable; can be copied as personal preset |
| Personal | Owner-only, editable, revisioned, Trash recoverable |
| Familiar | Visible/use/edit by permission, revision history |

Task form shows inline contextual suggestions near title. Choosing preset fills reusable fields, shows `Usando preset`, allows change/remove, and leaves dynamic fields editable. Event form shows contextual suggestions and always confirms date/time/timezone/scope/participants where applicable. Plan form shows En blanco, Seleccionar Preset, Presets recomendados; choosing preset opens editable preview. Preset Library remains secondary for exploration/admin.

## 22. Drafts

`PRODUCT_FROZEN`

Draft is owner-only, non-productive, no family Activity, no productive Search, no Archive, no real entity, and not Plan En preparación. Multiple Drafts per domain are allowed and never overwritten automatically.

When starting a new Task/Event/Plan and compatible Draft exists, show: Continuar Draft, Ver otros Drafts, Crear nuevo. Central Draft recovery is secondary, grouped by Tasks, Events, Plans, and is not a main Planner tab.

TTL: 30 days from last edit; edit renews TTL; warning about 7 days before expiry; expiry creates no family Activity and may create private owner notice. Exiting with meaningful content offers Seguir editando, Conservar como Draft, Descartar. Autosave does not create productive entity and does not replace explicit exit decision.

## 23. Forms

`PRODUCT_FROZEN`

Planner forms are mobile-first quick contextual forms with progressive disclosure. No universal long form and no mandatory wizard for simple flows.

| Form | Minimum | Optional/advanced |
|---|---|---|
| Task | Title | description, priority, category, dates, recurrence, verification, evidence requirement, Plan link, scope |
| Event | Title plus date/time or all-day | end, timezone, recurrence, participants, scope, Event role inside Plan |
| Blank Plan | Title plus Personal/Familiar | description, category, target date |
| Plan from Preset | Editable preview before create | generated Tasks, Events, Milestones, Measurements, Requirements |

Context may prefill fields for Task/Event/Plan. Blank Plan creates Plan En preparación and opens Detail/editor. Plan from Preset does not create productive Tasks/Events until activation.

## 24. Verification And Evidence

`PRODUCT_FROZEN`

Authorized sources can require evidence: Task creator, Preset, Plan, Requirement or policy relationship, authorized household policy.

First version: one or more images and optional comment. Evidence belongs to completion attempt. Each attempt preserves images, comment, actor, timestamp, upload state, review result, correction. Correction creates a new attempt. Offline completion/files stay Pendiente de envío until upload confirms; they do not enter En revisión or Verificada early. Failed upload creates private Attention. Self-verification is prohibited.

Review is accessible from Attention, Planner, Tasks, En revisión filter, and Task Detail when authorized. Review Sheet is dedicated and includes evidence, comment, attempt history when allowed, approve, request correction, correction comment, and open Task. Verificar and Abrir are not the same action; no blind one-tap approval from Attention.

## 25. Attention

`PRODUCT_FROZEN`

Attention is an action queue. Each item defines reason, responsible actor, priority, primary action, secondary action, destination, result, and invalidation. Examples include Verify Task, Correct Task, Respond Event, Resolve blocked Plan, Evidence upload failed, private Draft expiry warning, sync conflict. Primary action resolves; Abrir navigates. After resolution, item disappears or updates and Activity is generated where applicable.

## 26. Activity Detail

`PRODUCT_FROZEN`

Activity row opens Activity Detail. Detail shows what happened, who, when, visible household/scope, entity, related Plan, previous state, next state, redacted metadata, evidence only with permission, and separate entity open buttons. It does not include general editing controls. Important changes are individual; repetitive minor changes may group with Ver más. Draft expiry creates no family Activity.

## 27. Cancelled, Trash, Retention, Purge

`PRODUCT_FROZEN`, with purge mechanics `TECHNICAL_FROZEN`

| State/action | Retention contract |
|---|---|
| Cancelled Task/Event | Hidden from active views, visible in Canceladas for 30 days, reactivatable, private warning before window ends |
| Cancelled -> auto Trash | After 30 days, single transition to Trash |
| Auto Trash after Cancelled | Stays 7 days, then purge |
| Manual Trash Task/Event/Plan/Personal Preset | Stays 30 days, restorable, then purge |
| Draft live | Expires after 30 days from last edit |
| Plan Archive | No expiry |

Cancelled, History, and Trash are not three copies of the same thing. Manual Trash 30 days and cancellation auto-Trash 7 days are separate rules.

Purge product result: entity disappears, cannot restore, does not appear in Search/Planner, has no Detail, and no valid navigation. Desired behavior is full hard delete when references allow. Minimal technical tombstone may keep only technical ID, type, deleted_at, permanently_deleted. It must not keep title, description, files, evidence, personal data, responsible people, or private content. Activity can show generic text such as `Se eliminó una tarea` without navigation or sensitive metadata.

## 28. Archive

`PRODUCT_FROZEN`

Task and Event do not have Archive as main lifecycle. Plan Completed or Closed can be archived. Archive does not expire, delete, cascade, or alter lifecycle truth. Active Plan uses Cerrar y archivar and becomes Cerrado + archived true.

## 29. Goal To Plan Migration

`PRODUCT_FROZEN`, implementation roadmap `TECHNICAL_FROZEN`

Target: one visible Plan entity, one final PlanDetail route, one list, one Detail, one Home projection, one Search, one Trash, one progress model. Migration is automatic when unequivocal, guided only for conflicts, not manual for every Goal, not convert-only-on-open as primary strategy, and not long-term dual visible roots.

Preserve title, description, compatible category, semantically equivalent dates, scope, Tasks, verification, cancelled/history, lifecycle, Activity by permission, and Trash where applicable. Do not preserve legacy percentage as universal percentage; map to separate indicators and principal progress where interpretable.

## 30. Resolver And Routes

`PRODUCT_FROZEN`, implementation roadmap `TECHNICAL_FROZEN`

During transition, Legacy Goal resolver receives ID, determines Goal or Plan, opens valid destination, uses mapping when present, and avoids Plan not found. Final route is PlanDetail. GoalDetail is a legacy ambiguous physical name and must not permanently represent Plans.

Home and Search must use consistent Plan projection and safe resolution.

## 31. Scope And Privacy

`PRODUCT_FROZEN`, implementation roadmap `TECHNICAL_FROZEN`

Scope can edit after creation only when actor has permission, consequences are shown, members/assignees/links/Activity/cache/visibility are resolved, and scope does not change silently. Personal data must not leak to household through implicit links. Personal entity linked to household Plan is blocked unless explicitly shared.

## 32. Requirements UI

`PRODUCT_FROZEN`

First experience is simple: flat list, visible state, blocking reason, satisfy, annul with permission and reason. Full hierarchy UI is `DEFERRED_POST_MVP`; technical hierarchy capacity may remain but is not visible by default and must not block MVP.

## 33. Screen Contracts

`PRODUCT_FROZEN` functional level, not pixel-perfect design. Every surface must define purpose, entry, visible data, primary/secondary actions, empty/loading/offline/error/permission/entity-missing/uncertain states, success destination, Draft relation, Preset relation, Reliability relation.

| Surface | Contract |
|---|---|
| Planner Home/List | One Plan root projection, Tasks/Events/Plans overview, Attention/Search/Trash/Archive access |
| Tasks list | Filters including active/review/done/cancelled; quick create; open detail/review |
| Task Detail | Lifecycle, assignment, Plan link, verification/evidence attempts, Activity, cancel/reactivate/trash/restore |
| Task Quick Form | Title-first creation, contextual defaults, Draft/Preset integration |
| Task Full/Advanced Form | Advanced metadata, recurrence, verification/evidence, Plan link, scope |
| Task Review Sheet | Dedicated approve/correction/evidence review |
| Events/Calendar | Calendar/list with schedule, recurrence, occurrence scopes |
| Event Detail | Schedule, participants, RSVP/attendance concepts, Plan role, recurrence actions |
| Event Quick Form | Title + date/time/all-day with context and Draft/Preset support |
| Event Advanced Form | End/timezone/recurrence/participants/scope/Plan role |
| Plans list | Plan-only list with lifecycle/projection filters |
| Plan Creation Preview | Editable Preset preview without entity creation |
| Plan Detail | Objective, lifecycle, structure, progress, Requirements, prepared/linked elements, actions |
| Plan Structure Editor | Add/edit/remove/reorder structure and prepared/linked items |
| Plan Activation Review | Final summary and materialization confirmation |
| Plan Pause Resolution | Impact review for active Tasks/Events/recurrences |
| Plan Completion Review | Readiness and supporting item resolution |
| Close and Archive flow | Close reason, active entity resolution, archive flag |
| Preset inline selector | Contextual suggestions, `Usando preset`, change/remove |
| Preset Library | Secondary browse/admin surface |
| Draft recovery sheet | Continue/View others/Create new |
| Draft central recovery | Secondary grouped recovery |
| Attention list | Action queue with distinct primary/Open actions |
| Activity list | Feed; row opens Activity Detail |
| Activity Detail | Redacted read-only detail and entity open buttons |
| Trash | Restore within retention; purge after window |
| Archive | Terminal Plan preservation list |
| Legacy Goal Resolver | Transitional safe resolution for Goal/Plan IDs |

## 34. Canonical Copy

`PRODUCT_FROZEN`

| Concept | Copy |
|---|---|
| Preparation | En preparación |
| Active | Activo |
| Paused | Pausado |
| Completed | Completado |
| Closed | Cerrado |
| Blocked | Bloqueado |
| At risk | En riesgo |
| Ready | Listo para completar |
| Principal | Principal |
| Supporting | De apoyo |
| Requirement pending | Requirement pendiente |
| Requirement satisfied | Requirement satisfecho |
| Requirement annulled | Requirement anulado |
| Pending upload | Pendiente de envío |
| Review | En revisión |
| Correction | Corrección pedida |
| Cancelled | Cancelada |
| Trash | En Trash |
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

Do not expose technical terms to normal users: DTO, graph, mutation, fulfillment, lifecycle, requirement hierarchy, tombstone, idempotency, replay.

## 35. Permission Contract

`PRODUCT_FROZEN` at product actor level.

| Actor | Meaning |
|---|---|
| Owner | Owner of personal entity or resource |
| Assignee | Responsible Task actor |
| Verifier | Authorized reviewer |
| Plan actor autorizado | Authorized Plan lifecycle/structure actor |
| Household role autorizado | Authorized household role |
| Event participant | Event participant/RSVP actor |
| Viewer | Read-only actor |

| Action | Permission required |
|---|---|
| Activate/pause/complete/close/reopen/archive Plan | Plan actor autorizado |
| Change Principal/De apoyo | Plan actor autorizado; confirmation and Activity when active impact exists |
| Annul Requirement | Authorized actor plus mandatory reason |
| Share personal entity | Owner and required household permission |
| Verify Task | Verifier; no self-verification |
| Request correction | Verifier |
| Edit family Preset | Household role autorizado |
| Restore from Trash | Owner or authorized household role |
| Future manual purge | Explicit destructive permission |

0C does not define RLS policy names.

## 36. Contract Matrix

| Domain | Creation | Draft | Initial state | Activation | Principal/De apoyo | Completion | Cancellation | Reopen | Archive | Trash | Retention | Activity | Attention | Offline |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Task | Quick/contextual | Creation Draft | Pendiente | N/A | Via Plan link | Hecha or Verificada | Cancelada | Reactivada | No main archive | Manual/auto | Cancelled 30d, auto Trash 7d, manual Trash 30d | Yes | Review/correction/upload | Pending/uncertain; evidence upload gated |
| Event | Quick/calendar/contextual | Creation Draft | Scheduled | N/A | Via Plan link | Resolved only by Plan-specific rule | Cancelled | Reactivated where allowed | No main archive | Manual/auto | Cancelled 30d, auto Trash 7d, manual Trash 30d | Yes | RSVP/final/attention cases | Pending/uncertain recurrence edits |
| Plan | Blank or Preset preview | Creation Draft before create; En preparación after create | En preparación | Human Activar Plan | Structure/link chip | Human Completar Plan | Use Cerrado, not Cancelled | Reabrir Plan | Terminal only | Manual | Manual Trash 30d; Archive no expiry | Yes | Blocked/review required | Activation/completion uncertain until confirmed |
| Milestone | In Plan structure | Plan preparation only | Pending | Can make Plan activatable | Yes | Completed milestone counts | Remove/replace, not cancelled primary lifecycle | Reopen milestone | Through Plan only | Structure removal via Plan graph | Plan retention follows Plan | Yes | Blocker/progress | Structure write replay |
| Measurement | In Plan structure | Plan preparation only | Not reached/current | Can make Plan activatable | Yes | Target reached counts | Remove/replace, not cancelled primary lifecycle | Correct/update history | Through Plan only | Structure removal via Plan graph | Plan retention follows Plan | Yes | At-risk/blocker projections | Value write replay |
| Requirement | In Plan structure | Plan preparation only | Pendiente | Blocks if activation gate | Not applicable | Satisfied/annulled for gate | Annul, not cancel | Reset | Through Plan only | Structure removal via Plan graph | Plan retention follows Plan | Yes, especially annul | Blocker item | Gate replay/idempotency |
| Preset | HomePlus/personal/family | Preset revision draft, not Creation Draft | Published/revision state | N/A | N/A | N/A | N/A | Restore revision/trash as allowed | No archive for HomePlus/personal first version | Personal Trash | Personal Trash 30d | Use/applied/edit events where relevant | N/A | Prepare/apply replay |
| Draft | Autosave/explicit keep | Itself | Live | N/A | N/A | Confirm creates entity or continue | Discard/expire | Continue before expiry | No | Not product Trash | 30d from last edit | No family Activity | Private expiry warning | Local/offline recovery |
| Evidence | Completion attempt | Draft attachment validation follows owner-only Draft rules | Pending upload | N/A | N/A | Review outcome | Purged with policy | Correction creates new attempt | No | With owning entity policy | Owner entity retention | Redacted | Upload failed | Upload queue pending |

## 37. Transition Matrix

### Plan Allowed

| Transition | Contract |
|---|---|
| En preparación -> Activo | Activation gate and human confirmation |
| Activo -> Pausado | Impact review when active entities exist |
| Pausado -> Activo | Human resume |
| Activo/Pausado -> Completado | Completion gate and human confirmation |
| Activo/Pausado -> Cerrado | Reason and active entity resolution |
| Completado/Cerrado -> Activo | Reopen |
| Completado/Cerrado -> Archived | Archive terminal Plan |
| Activo -> Cerrado + Archived | Cerrar y archivar |
| Any permitted state -> Trash | With permission |
| Trash -> previous state | Before retention expiry |
| Trash expired -> permanently deleted | After retention |

### Plan Prohibited

| Transition | Reason |
|---|---|
| Empty Plan -> Activo | No useful principal element |
| Pending activation Requirement -> Activo | Gate blocked |
| Automatic completion | Human-only |
| Active -> Archived without Closed | Active cannot remain archived |
| Past final Event -> Completado | Event occurrence is not Plan completion |

### Task Allowed

| Transition | Contract |
|---|---|
| Pending -> Completed | Human/user completion |
| Pending -> Cancelled | Cancel action |
| Completed requiring verification -> En revisión | After upload/submission ready |
| En revisión -> Verificada | Authorized verifier |
| En revisión -> Corrección pedida | Authorized verifier |
| Corrección pedida -> En revisión nuevamente | Resubmission |
| Cancelada -> Reactivada | During window |
| Cancelada 30d -> Trash | Automatic |
| Trash -> Restaurada | Before retention expiry |
| Trash expired -> permanently deleted | After retention |

### Task Prohibited

| Transition | Reason |
|---|---|
| En revisión -> resolved Plan contribution | Verification pending |
| Cancelada -> completed contribution | Cancelled is not done |
| Self-verification | Prohibited |
| Principal -> De apoyo silently in active Plan | Confirmation and Activity required |

### Event Allowed

| Transition | Contract |
|---|---|
| Scheduled -> Cancelled | Cancel action |
| Cancelled -> Reactivated | Where domain allows |
| Series active -> paused | Pause series |
| Series paused -> active | Resume series |
| Occurrence override | Does not destroy series |
| Cancelled 30d -> Trash | Automatic |
| Trash expired -> permanently deleted | After retention |

### Event Prohibited

| Transition | Reason |
|---|---|
| Past -> fulfilled automatically | Past is not occurred |
| RSVP -> Event fulfilled | Participant response only |
| Attendance -> Plan satisfied automatically | Needs Plan-specific function resolution |
| Occurrence edit silently mutates whole series | Scope must be explicit |

## 38. Product Definition Of Done

This is a future implementation gate, not implemented by 0C.

| Area | Must be true at implementation end |
|---|---|
| Single root | Only Plan is visible final objective root; Goal not visible as product |
| Task creation | Quick contextual Task creation works |
| Event creation | Contextual/calendar Event creation works |
| Plan preparation | Preview and En preparación flows work |
| Activation | Prepared Tasks/Events materialize as one product intention |
| Progress | Hybrid deterministic progress works |
| Principal/support | Principal/De apoyo rules work |
| Requirements | Gates and annulment work |
| Milestones | Add/edit/order/complete/reopen work |
| Measurements | Targets/history/projections work |
| Prepared items | Tasks/Events are non-productive until activation |
| Verification/evidence | Completion attempts, upload, review, correction work |
| Recurrence | Series/occurrence scopes and Plan relationships work |
| Presets | Inline selectors, library, HomePlus/personal/family rules work |
| Drafts | Multiple owner-only Drafts, TTL, recovery, discard work |
| Attention | Primary actions resolve/update items |
| Activity Detail | Redacted detail and open buttons work |
| Completed/Closed | Separate meanings and transitions work |
| Pause | Impact resolution works |
| Archive | Terminal Plan archive only, no cascade |
| Cancelled/Trash | Retention, restore, purge work |
| Migration | Goals converge into Plans safely |
| Home/Search | Consistent resolver and projections |
| Privacy | Scope isolation across all surfaces |
| Offline | No duplicate writes; explicit pending/uncertain states |
| Errors | Loading/offline/error/permission/missing/uncertain states exist |
| Accessibility | Actions are explicit and not color/gesture-only |
| Single-flight | Duplicate submit prevention works |
| Android runtime | Acceptance passes on Android runtime |

## 39. Technical Architecture Freeze From Phase 0D-B

`TECHNICAL_FROZEN`

Phase 0D-B freezes the final technical architecture for prepared Tasks/Events, atomic activation, dedicated Plan-Task links, dedicated Plan-Event links, zero-or-one cardinality, Principal/De apoyo constraints, Requirement activation/completion gates, audited annulment, Manual Condition migration to Milestone, progress projections, Final Event resolution, Task/Event recurrence relationship, Plan pause orchestration, Plan preset atomicity, Draft live TTL, Draft attachments, evidence attempt tables, Storage, thumbnails, upload queue, RLS, retention, Cancelled 30 days, automatic Trash 7 days, manual Trash 30 days, cleanup jobs, hard delete, tombstones, Activity Detail DTO, Attention handlers, Goal migration, bridge, `task.goal_id` migration, Home resolver, Search consistency, route renaming, cache invalidation, offline replay, idempotency, and REC-0A runtime evidence sequencing.

Implementation is still blocked. Remaining work after this Blueprint is runtime validation, implementation, migration execution, QA, Android acceptance, and user approval of Phase 0 Freeze. No central architecture decision remains delegated to implementation.

### 39.1 Canonical Technical Decisions

| Area | Frozen decision |
|---|---|
| Plan root | `planner_plans` remains canonical; Goal becomes legacy bridge and migration source only |
| Plan-Task | dedicated canonical link with `plan_id`, `task_id`, `importance`, `function`, ordering, version, zero-or-one Task membership |
| Plan-Event | dedicated canonical link with series/occurrence binding, `importance`, `function`, Final Event outcome, zero-or-one Event binding |
| Prepared items | Plan-owned prepared Task/Event tables; hidden and non-productive until activation |
| Activation | one backend transaction validates, materializes, links, creates recurrence, activates Plan, logs Activity, returns graph |
| Requirements | mandatory gates only; states Pending/Satisfied/Annulled; annulment requires permission, reason, actor, timestamp, Activity |
| Manual Condition | legacy rows migrate only to Milestone; no final visible product surface |
| Evidence | completion attempts plus evidence rows, private Storage bucket, signed access, thumbnails, upload queue |
| Retention | Cancelled 30d, auto-Trash 7d, manual Trash 30d, hard delete when safe, minimal tombstone when references require |
| Reliability | Current PlannerMutationIntent, durable queue, idempotency, replay, single-flight, observer sink remain mandatory |
| REC-0A | first implementation mini-lot gathers runtime trace before any duplicate-dispatch fix |

### 39.2 Implementation Roadmap Reference

The total roadmap is authoritative in `PLANNER_PHASE_0D_B_TECHNICAL_ARCHITECTURE_AND_EXECUTION_ROADMAP.md` and starts with `REC-0A`, then proceeds through schema/RLS, Reliability adapters, graph backend, prepared items, atomic activation, lifecycle, Plan-Task, Plan-Event, evidence, drafts/presets, Attention/Activity, Goal migration, UI/read cutover, retention/purge, integrated QA, and legacy removal.

## 40. Deferred Post MVP

| Item | Status |
|---|---|
| Full hierarchical Requirements UI | `DEFERRED_POST_MVP` |

Technical hierarchy may remain; default MVP UI is flat/simple.

## 41. Rejected Alternatives

| Alternative | Classification |
|---|---|
| Goal and Plan permanent parallel products | Rejected |
| Manual Condition visible entity/surface | Rejected; legacy/migration only |
| Universal percentage | Rejected |
| Weighted progress | Rejected |
| AI as progress authority | Rejected |
| Plan Preset immediate productive creation without preview | Rejected |
| Productive Tasks/Events before Plan activation from preset | Rejected |
| Many-to-many Plan-Task | Rejected |
| Many-to-many Plan-Event | Rejected |
| Link blockers via `blocks_activation` or `blocks_completion` | Rejected; Requirements and Principal items own obligation |
| Optional Requirement | Rejected |
| Past Event equals fulfilled Event | Rejected |
| Final Event auto-completes Plan | Rejected |
| Universal long form | Rejected |
| Mandatory Preset Library path | Rejected |
| Single Draft per domain | Rejected |
| Active Plan archived without Closed | Rejected |
| Cascade Archive | Rejected |
| Immediate hard delete of Cancelled | Rejected |
| Cancelled and Trash as synonyms | Rejected |
| Purge that breaks Activity/references | Rejected |
| GoalDetail as final Plan route | Rejected; technical migration only |
| Draft as family/productive entity | Rejected |

The terms `Manual Condition`, `blocks_activation`, `blocks_completion`, `many-to-many`, `GoalDetail`, and `universal percentage` appear here only as legacy, rejected, or technical migration classifications; none is final product contract.

## 42. Contradictions Resolved

| Contradiction | Resolution |
|---|---|
| Draft form vs Plan En preparación | Separate concepts and copy |
| Manual Condition vs Milestone | Manual Condition removed; Milestone represents achieved checkpoint |
| Requirement vs Principal/De apoyo | Requirement is mandatory gate; Principal/De apoyo applies to progress elements |
| Link blockers vs Requirement blockers | No link blockers; obligation from Principal items and Requirements |
| Goal vs Plan | Plan final root; Goal migrates/resolves |
| Past Event vs Event resolved | Past is not resolved; confirmation required when Plan depends on Event |
| Completed vs Closed | Achieved vs stopped |
| Closed vs Archive | Lifecycle vs visibility/preservation |
| Cancelled vs Trash | Domain state vs recoverable deletion |
| Manual Trash 30d vs auto-Trash 7d | Separate manual deletion and cancelled retention flows |
| Activity vs purged entity | Activity keeps only redacted generic reference when needed |
| Preset preview vs product creation | Preview creates no entities |
| Prepared Task/Event vs productive entity | Prepared items are Plan-local until activation |
| Active Plan archive | Use Cerrar y archivar to Closed + archived |
| Legacy percentage vs hybrid progress | Legacy percent maps to indicators, not universal percentage |
| One Plan per Task/Event vs many-to-many | Zero-or-one cardinality frozen |
| Recurrent Plan vs completed cycle | Plan stays Active; occurrences complete |
| Draft expiry vs real Plan expiry | Draft expires; Plan En preparación does not auto-expire |
| External requirement links vs Plan-Task/Plan-Event ownership | Dedicated canonical links own Task/Event Plan membership; Requirements remain mandatory gates |
| `task.goal_id` vs Plan root | `task.goal_id` is legacy bridge only and is not a final Plan link |
| `confirm_unresolved` vs Requirement gates | Completion bypass is replaced by audited Requirement annulment |
| Evidence product contract vs missing Current tables | 0D-B freezes completion attempts, evidence rows, Storage, thumbnails, upload queue, and purge behavior |
| Purge vs Activity integrity | Hard delete is used when safe; minimal tombstone is used only when references require stable identity |

## 43. Execution Gate

No productive implementation may start from this Blueprint alone. Phase 0D-B freezes the technical architecture and roadmap, but Phase 0 Freeze still requires explicit user approval. Phase 1 remains blocked until that approval is granted.

## 44. Final Verdict

```text
PHASE_0D_TECHNICAL_ARCHITECTURE_AND_ROADMAP_FROZEN
PHASE_0_FREEZE_PENDING
```

Product is frozen. Technical architecture and roadmap are frozen. Implementation remains blocked until the user approves Phase 0 Freeze.
