# Planner V1 — M11 Functional Freeze

**Project:** HomePlus  
**Module:** Planner  
**Milestone:** M11 — Functional / UX Freeze  
**Status:** **FROZEN**  
**Human approval:** **APPROVED**  
**Freeze date:** 2026-07-22  
**Canonical authority:** This document  
**Document version:** 1.2 — canonical filename and complete Preset creation contract  
**Implementation status:** **NOT YET AUTHORIZED.** Any future implementation may proceed only through separately approved technical submilestones

---

## 1. Document authority

This file is the canonical functional authority for Planner V1.

It consolidates the approved product decisions for:

- Packages A, B, C, D and E;
- Gates G1 through G7;
- lifecycle and transition matrices;
- phone and tablet surface matrices;
- notification, widget and activity rules;
- reliability, synchronization and conflict rules;
- the final contradiction audit;
- the nine final consolidations;
- accepted exclusions, risks and implementation boundaries.

A person reading only this document must be able to understand what Planner V1 is expected to do, how its entities relate, which states and behaviors are mandatory, what is explicitly excluded, and what cannot be silently simplified during implementation.

### 1.1 Authority hierarchy

When implementation artifacts, older proposals or partial documents differ from this file, the following order applies:

1. this canonical functional freeze;
2. an approved change request that explicitly updates this file;
3. the Final Decision Registry;
4. the UX/UI Freeze Contract;
5. the approved Approval Packet;
6. older proposals, research, audits and implementation plans.

The technical audit describes the current repository and its gaps. It does not reduce or reinterpret the product defined here.

### 1.2 Change rule

No functional decision in this document may be changed, removed, weakened or reinterpreted during implementation without:

- a documented contradiction or product reason;
- impact analysis;
- affected entities, surfaces and migrations;
- risk assessment;
- explicit human approval;
- Registry update;
- Freeze Contract update;
- a new version of this canonical document.

A technical limitation is not authorization to silently simplify the product.

---

## 2. Product purpose

Planner organizes domestic life at three levels:

```text
Tareas
→ concrete execution

Eventos
→ temporal coordination

Planes
→ strategic organization across multiple steps
```

Planner is not a generic productivity system. It is a household organization system that helps people understand:

- what must be done;
- when something happens;
- who is involved;
- what can be handled by anyone;
- what requires individual responsibility;
- what larger objective those actions support;
- what currently blocks progress;
- what deserves attention now.

The product competes against forgetting and household disorganization, not against other applications for screen time.

---

## 3. Frozen scope

Planner V1 includes the following functional areas.

### 3.1 Core entities

- Tasks;
- Task assignments;
- Task fulfillment obligations;
- verification and correction;
- evidence attached to concrete fulfillment;
- Events;
- Event participants;
- RSVP;
- attendance;
- Plans;
- Milestones;
- Measurements;
- manual conditions;
- completion requirements;
- recurrence series;
- Presets;
- Drafts;
- Trash and restore;
- Plan Archive;
- operational Activity.

### 3.2 Core product capabilities

- personal and household scope;
- adaptive creation from presets or manual forms;
- Task, Event and Plan Details;
- date, optional time and no-date Tasks;
- scheduled and all-day Events;
- calendar recurrence;
- Task recurrence after completion;
- one occurrence / this and following / whole series editing where valid;
- structured Event location;
- one controlling Plan per Task or Event;
- Plan pause, resume, complete, close, reopen, archive, trash and restore;
- multiple measurements per Plan;
- hierarchical completion requirements;
- personal, household and HomePlus Presets;
- atomic compound creation and Plan operations;
- attention center;
- push policy;
- badges;
- widgets;
- daily summaries;
- backend-authoritative shared state;
- local immediate state;
- optimistic actions;
- offline drafts and pending operations;
- versioning, idempotency and conflict handling;
- phone and tablet adaptation;
- accessibility.

### 3.3 Cross-module boundaries

Planner may consume context from other HomePlus modules, but must remain functional without them.

Examples:

- Household provides capabilities and membership context.
- Presence may later provide location signals.
- Inventory may later provide stock or resource context.
- Vehicles or Assets may later provide maintenance or mileage context.
- Geni may later build Plan proposals using the same domain operations.

Planner owns organization. Other modules may contribute context; they do not become mandatory dependencies for Planner V1.

Context from other modules appears where it is useful. Planner does not create a generic catch-all section called `Conexiones`.

---

## 4. Product architecture

The visible Planner root has exactly three primary perspectives:

```text
Planner
├── Tareas
├── Eventos
└── Planes
```

### 4.1 Meaning of each perspective

**Tareas** are concrete actions and obligations.

**Eventos** are scheduled moments, commitments and coordination.

**Planes** organize larger objectives that may combine milestones, tasks, events, measurements and conditions.

### 4.2 One identity, multiple useful views

A Task or Event exists once even when it appears in multiple surfaces.

Example:

```text
Task linked to a Plan
→ appears in Plan Detail
→ appears in Tasks while operational
→ appears in Calendar when dated
→ appears in Home when relevant
→ appears in search results
→ may appear in widgets
```

These are projections of one entity, not duplicates.

### 4.3 Global capabilities

Quick Actions and global search belong to HomePlus, not only to Planner.

Quick Actions contain only:

- icon;
- title.

The three Planner actions are:

```text
Crear tarea
Crear evento
Crear plan
```

They do not include subtitles, chevrons, metadata or explanatory text. The entire tile is tappable.

Global search can find:

- Tasks;
- Events;
- Plans;
- visible Drafts;
- Presets;
- people;
- settings;
- nested actions and routes;
- future modules.

Its ranking and interpretation must consider:

- spelling mistakes;
- synonyms;
- current context;
- frequency and recency;
- permissions;
- personal scope;
- active household.

Before Geni exists, global search remains productively implementable through a registry/index, keywords, aliases and deterministic ranking.

Search indexes confirmed state. Personal Drafts may appear only to their owner. Trash is excluded by default and appears only through an explicit Trash context.

Planner does not create a redundant internal copy of the global search.

---

## 5. Canonical entities and relations

### 5.1 Task

A Task represents one concrete action.

A Task may be:

- independent;
- directly controlled by one Plan;
- inside one Milestone belonging to that same Plan.

A Task may belong to:

```text
0 or 1 controlling Plan
0 or 1 Milestone of that same Plan
```

A Task cannot belong to multiple controlling Plans.

### 5.2 Task Assignment

Task Assignment describes who may or must act.

Valid assignment models:

```text
Cualquiera
Una persona
Varias personas
```

For multiple concrete people:

```text
Una vez entre todos
Cada persona
```

There is no final active-state product option called `Sin asignar`.

### 5.3 Task Fulfillment

Task Fulfillment represents a concrete obligation and its real completion state.

Assignment and fulfillment are separate from the Task definition.

Examples:

```text
Cualquiera
→ one shared fulfillment obligation

One person
→ one individual fulfillment obligation

Several people · Una vez entre todos
→ one shared fulfillment obligation

Several people · Cada persona
→ one fulfillment obligation per person
```

Evidence, comments, completion actors and verification belong to the concrete fulfillment, not to the Task in the abstract.

### 5.4 Evidence

Evidence is associated with one concrete fulfillment.

It may contain:

- photo;
- comment;
- upload state;
- confirmed storage reference;
- review context.

Required evidence must be confirmed before the fulfillment enters verification.

### 5.5 Event

An Event represents a scheduled or all-day commitment.

An Event may be:

- independent;
- controlled by one Plan;
- the final Event of that same Plan.

An Event cannot belong to multiple controlling Plans.

### 5.6 Event Participant

Event Participant represents one person’s relation to an Event.

It stores two independent concepts:

```text
RSVP
→ intention before the Event

Attendance
→ what actually happened
```

### 5.7 Plan

A Plan is a strategic container for an objective that requires organization across several elements.

A Plan may combine:

- one main objective;
- Milestones;
- Tasks;
- Events;
- Measurements;
- manual conditions;
- completion requirements;
- participants;
- contextual relationships with other modules.

A Plan does not use one exclusive progress mode.

### 5.8 Milestone

A Milestone represents a stage inside one Plan.

A Milestone:

- always belongs to one Plan;
- may contain Tasks of that same Plan;
- may complete automatically from defined requirements;
- may complete manually when it represents a human judgment.

### 5.9 Measurement

A Measurement tracks one quantity relevant to a Plan.

Examples:

```text
$420.000 de $800.000
72 de 100 cajas
91.100 km
```

A Plan may contain multiple Measurements.

A Measurement may be:

- required for completion;
- supporting only.

It may have:

- current value;
- target;
- unit;
- history;
- corrections.

### 5.10 Requirement

A Requirement determines what is necessary to complete a Plan.

A linked Plan element may be:

```text
Necessary
Supporting / optional
```

Requirements are hierarchical, not a flat list.

Example:

```text
Plan
└── Required Milestone
    ├── Required Task
    └── Required Task
```

The Plan evaluates the Milestone. The Milestone evaluates its Tasks. The same Tasks are not counted again at the Plan level.

### 5.11 Preset

A Preset is a reusable snapshot for a Task, Event or Plan.

A Preset is independent of the executions created from it.

### 5.12 Recurrence Series

A Recurrence Series defines how Task or Event instances are generated.

The series and its instances keep separate identities.

### 5.13 Activity Entry

An Activity Entry records a confirmed human-level operational or social event.

It does not record every technical save, keystroke, navigation event or synchronization detail.

---

## 6. Ownership and scope

### 6.1 Personal Task and Event

A personal Task or Event belongs to a person.

It:

- remains available when the active household changes;
- is private by default;
- uses the owner as the initial visible responsibility when applicable;
- does not generate household Activity;
- does not appear in shared household widgets;
- does not expose `Cualquiera` when only the owner can act.

### 6.2 Household Task and Event

A household Task or Event belongs to one household.

It:

- appears only in that household context;
- uses eligible members and capabilities from that household;
- may use `Cualquiera`;
- may generate household Activity when the change has real operational or social value.

### 6.3 Personal Plan

A personal Plan belongs to a person.

It:

- remains available when the active household changes;
- is private by default;
- does not generate household Activity;
- does not appear in shared widgets;
- uses the owner as the default visible responsibility;
- may still use a household Preset without becoming public.

### 6.4 Household Plan

A household Plan belongs to one household.

It:

- appears only in that household context;
- uses that household’s members and capabilities;
- may generate household Activity;
- may use `Cualquiera`;
- may own household Presets.

### 6.5 Draft privacy

A Draft is private to its creator by default, even when its intended execution scope is household.

Selecting `Familia` during creation defines the future execution scope. It does not automatically publish the Draft.

A future explicit action may allow selected people to collaborate on a Draft without activating it.

### 6.6 Plan controller

When a Task or Event belongs to a Plan, the Plan controls its operational availability.

The relationship is not decorative.

The Plan controls:

- inherited pause;
- inherited terminal state;
- whole-structure trash;
- restore;
- reactivation of still-pending work on reopen.

Linking an existing Task or Event to a Plan must explain that the Plan will control those operations.

---

## 7. State model

Every entity separates three concepts:

```text
1. Own lifecycle
2. Fulfillment or progress
3. Inherited operational state
```

Example:

```text
Task: Comprar pintura

Own lifecycle
→ Active

Fulfillment
→ Pending

Controlling Plan
→ Paused

Effective behavior
→ Pending but not operational
```

The inherited state never destroys the own state.

### 7.1 Global precedence

When several conditions coexist, HomePlus interprets them in this order:

1. Trash;
2. own terminal result;
3. inherited Plan state;
4. fulfillment state;
5. normal temporal state.

A verified Task inside a paused Plan remains verified.  
A pending Task inside a paused Plan becomes non-operational.  
A cancelled Task inside an active Plan remains cancelled.

### 7.2 Frozen lifecycle transitions

#### Task

```text
Draft → Create → Active
Active → Cancel → Cancelled
Cancelled → Reactivate → Active
Any recoverable state → Trash → Trash
Trash → Restore → previous state
```

Task completion and verification transitions belong to Task Fulfillment, not to the Task lifecycle.

#### Event

```text
Draft → Create → Scheduled
Scheduled → Cancel → Cancelled
Cancelled → Reactivate → Scheduled
Any recoverable state → Trash → Trash
Trash → Restore → previous state
```

Past is derived from time and is not a lifecycle transition.

#### Plan

```text
Draft → Activate → Active
Active → Pause → Paused
Paused → Resume → Active
Active or Paused → Complete → Completed
Active or Paused → Close without completion → Closed
Completed or Closed → Reopen → Active
Completed or Closed → Archive → same terminal state + archived_at
Archived → Unarchive → same terminal state
Archived → Reopen → Active and unarchived
Any recoverable state → Trash → Trash
Trash → Restore → previous state
```

#### Milestone

```text
Pending
Completed
Trash
```

A Milestone inherits operational availability from its Plan.

#### Measurement

```text
Active
Target reached — derived
Trash
```

`Target reached` is derived and does not complete the Plan automatically.

#### Recurrence Series

```text
Active
Paused
Finalized
Trash
```

Finalizing a series preserves historical instances and stops future generation. A series controlled by a paused Plan may be operationally paused without destroying its own state.

#### Preset

```text
Active
Revision Draft
Trash
```

A Revision Draft does not replace the active Preset until explicitly confirmed.

### 7.3 Trash retention

Tasks, Events, Plans, Milestones, Measurements, Drafts and Presets remain recoverable for 30 days after entering Trash.

Planner V1 does not expose immediate manual permanent deletion.

The technical retention mechanism may be implemented later, but it must preserve the frozen 30-day recoverability contract.


---

## 8. Task contract

### 8.1 Task lifecycle

Task own lifecycle:

```text
Borrador
Activa
Cancelada
Papelera
```

Fulfillment is not stored as the Task lifecycle.

#### Cancel vs Trash

```text
Cancelar
→ the Task is no longer expected to be done
→ preserves history
→ can be reactivated

Papelera
→ the Task was removed from Planner
→ recoverable for 30 days
```

A cancelled Task:

- does not appear among pending Tasks;
- does not generate reminders;
- preserves date, assignment and history;
- remains available through history or filters.

### 8.2 Assignment contract

Valid visible models:

```text
Cualquiera
One person
Several people
```

For several people:

```text
Una vez entre todos
→ default

Cada persona
→ explicit choice
```

#### Defaults

Household context:

```text
Cualquiera
```

Personal context:

```text
Plan owner / personal owner
```

There is no final active product state called `Sin asignar`.

Changing assignees is a normal edit. HomePlus warns only when the change affects obligations that already contain recorded completion, verification or correction history. Existing history is preserved.

Near-simultaneous completion is handled idempotently and silently. It must not create duplicate completion records.

#### Cualquiera

`Cualquiera` means:

- every eligible household member may take responsibility;
- one shared completion resolves the Task;
- HomePlus records who completed it;
- a person may use `Me encargo`;
- once someone takes responsibility, collective reminders are cancelled and the Task becomes personal to that person.

### 8.3 Fulfillment states

Each fulfillment may be:

```text
Pendiente
Completada
Esperando verificación
Corrección solicitada
Verificada
```

Valid transitions:

```text
Pendiente
→ Complete without verification
→ Completada

Pendiente
→ Submit for verification
→ Esperando verificación

Esperando verificación
→ Verify
→ Verificada

Esperando verificación
→ Request correction
→ Corrección solicitada

Corrección solicitada
→ Resubmit
→ Esperando verificación

Completada
→ Revert
→ Pendiente

Verificada
→ Reopen
→ Pendiente
```

Revert and reopen preserve prior history.

### 8.4 Aggregated Task result

The Task derives a human summary from its fulfillments:

```text
No obligations finished
→ Pending

Some obligations finished
→ Partially completed

All finished, no verification
→ Completed

Some waiting for review
→ Waiting for verification

Any correction requested
→ Requires correction

All required reviews complete
→ Verified
```

The list does not expose the technical state graph. It shows only relevant exceptional context.

Example:

```text
Leer el reglamento
Hoy · 2 de 3 completaron
```

### 8.5 Verification

Verification follows the fulfillment granularity.

- shared completion → one verification;
- each-person completion → individual verification.

A verifier may:

- verify;
- request correction.

Requesting correction:

- preserves the previous completion record;
- reopens only the affected fulfillment;
- may include a comment;
- does not use punitive language.

### 8.6 Evidence

Evidence belongs to the concrete fulfillment.

Flow:

```text
Choose or take image
→ preserve local secure copy
→ compress
→ upload
→ confirm storage reference
→ record completion
→ submit for verification
```

When evidence is required, the fulfillment cannot become `Esperando verificación` before the upload is confirmed.

If upload fails:

```text
No pudimos enviar la evidencia.

Reintentar
Cambiar imagen
```

No verification may point to a non-existent file.

### 8.7 Temporal contract

A Task may have:

- date;
- optional time;
- no date.

The field is presented as:

```text
Vence
```

No artificial 23:59 deadline is added to date-only Tasks.

#### Contextual date defaults

- created from Today → Today;
- created from a calendar date → selected date;
- created from Plan Detail → no date unless context makes one clear;
- created from global Quick Action → Today;
- `Sin fecha` remains valid.

### 8.8 Task recurrence

Tasks support:

- fixed calendar recurrence;
- recurrence after confirmed completion.

After-completion recurrence creates the next Task exactly once.

Retries must never generate duplicate next Tasks.

When a controlling Plan is paused:

- existing instances preserve dates;
- missed instances are not generated retroactively;
- the next future valid occurrence resumes from the active rule.

### 8.9 Task list

Normal row:

```text
Comprar comida
Hoy · Gabriel
```

Rules:

- no permanent overflow;
- no long press;
- no description;
- no universal percentage;
- no multiple status chips;
- zero chips in normal states;
- exceptional state only when useful.

Tap:

```text
Task Detail
```

Swipe left:

```text
Complete
```

- partial swipe reveals;
- full swipe completes after threshold and release;
- Undo appears.

Swipe right:

```text
Cancelar
Papelera
```

Both require tap and confirmation. No destructive full swipe.

Every swipe action has an accessible alternative.

### 8.10 Task Detail

Task Detail is the default destination, not Edit.

It may allow frequent actions directly:

- Complete;
- Me encargo;
- add evidence;
- verify;
- request correction;
- reopen;
- reactivate;
- change date;
- change assignment.

Secondary management includes:

- Edit details;
- Cancel;
- Reactivate;
- Trash;
- unlink from Plan;
- history.

### 8.11 Task creation

Task creation uses one adaptive surface:

```text
Preset cards
+
always-visible expandable “Nueva tarea”
```

Selecting a Preset:

- visually hides the manual form;
- preserves the manual Draft silently;
- does not create immediately;
- can be deselected by tapping the selected Preset again.

Holding a Preset opens Preset Detail.

The last card is:

```text
Ver todos
```

Manual Task fields shown at the primary level:

- title;
- due date/time;
- assignees;
- completion mode;
- recurrence;
- verification;
- Save as Preset;
- More options.

More options may contain:

- long description;
- category;
- priority;
- Plan;
- Milestone;
- evidence configuration;
- secondary settings.

### 8.12 Task Drafts

Meaningful Task content may be saved as a Draft.

Task Drafts:

- are private by default;
- do not appear in Home;
- do not notify;
- do not enter operational Calendar;
- do not generate recurrence;
- appear at the end of Tasks only when they exist.

Before a form is persisted:

```text
Guardar borrador
Descartar cambios
Seguir editando
```

Once a persistent Draft exists:

```text
Continuar editando
Enviar a Papelera
```

`Descartar cambios` and `Enviar a Papelera` are not the same operation.

---

## 9. Event contract

### 9.1 Event lifecycle

```text
Borrador
Programado
Cancelado
Papelera
```

Temporal condition is derived:

```text
Próximo
En curso
Pasado
```

`Pasado` is not a separate administrative lifecycle state.

### 9.2 Scheduling

An Event may be:

- scheduled with start and end or duration;
- all-day.

Timed Events store:

- real instant;
- time zone.

All-day Events preserve semantic local dates and must not shift day because of UTC conversion.

#### Creation defaults

- the creator is initially selected as a participant;
- recurrence defaults to `No se repite`;
- attendance is disabled unless the Event or selected Preset requires it.

### 9.3 Recurrence

Events support calendar recurrence.

Editing options:

```text
Solo este evento
Este y los siguientes
Toda la serie
```

`Este y los siguientes` appears only when the series can be split safely.

Splitting a series:

- preserves previous history;
- preserves exceptions;
- creates no duplicate occurrences;
- is atomic and idempotent.

Cancelling one occurrence does not cancel the entire series.

### 9.4 Location

The form asks:

```text
¿Dónde?

En casa
Otro lugar
```

#### En casa

`En casa` is a semantic household location.

Agenda presentation:

```text
⌂ En casa
```

It does not repeat a full address when unnecessary.

#### Otro lugar

One unified location experience may provide:

- place search;
- manual address;
- current location.

These are internal options in one flow, not three competing primary actions.

#### Event Detail location

Event Detail uses one Location Card containing the relevant place, address and map context.

The entire card opens Maps.

The interface does not duplicate:

- separate address;
- map;
- extra button;
- textual link.

### 9.5 Participants and RSVP

Each participant has RSVP:

```text
Pendiente
Asiste
No asiste
Tal vez
```

RSVP describes intention before the Event.

### 9.6 Attendance

Attendance is enabled only when relevant to the Event or Preset.

Attendance states:

```text
Sin registrar
Presente
Ausente
Justificada
```

Attendance describes what actually occurred.

Changing RSVP never overwrites attendance, and changing attendance never overwrites RSVP.

### 9.7 Event and Plan

An Event may be linked to one Plan.

An Event may be marked as the final Event of that same Plan.

Ordinary linked Events default to supporting.  
A final Event defaults to necessary.

### 9.8 Event list and Detail

Tap opens Event Detail.

Event Detail may contain:

- when;
- location;
- participants;
- RSVP;
- attendance when enabled;
- recurrence;
- linked Plan;
- history.

Frequent actions are available without entering the full Edit form.

### 9.9 Event creation

One adaptive surface:

```text
Preset cards
+
always-visible expandable “Nuevo evento”
```

Primary manual fields:

- title;
- when;
- location;
- participants;
- recurrence;
- Save as Preset;
- More options.

Participants, concrete recurrence and concrete location belong to the Event instance and are not stored in a quick Event Preset.

### 9.10 Calendar month

The monthly calendar uses one numeric badge per day.

Rules:

```text
0 → hidden
1–9 → number
more than 9 → 9+
```

The count includes temporally relevant Tasks and Events.

It does not use multiple dots.

Semantic color:

```text
calendarActivity
→ strong terracotta
```

Accessibility example:

```text
18 de julio, 3 elementos.
```

---

## 10. Plan contract

### 10.1 Visible concept

The visible tab and product language use:

```text
Planes
```

A legacy technical entity may remain temporarily named Goal during migration, but the final product concept is Plan.

### 10.2 Capabilities

Personal and household Plans have the same structural capabilities:

- objective;
- Milestones;
- Tasks;
- Events;
- final Event;
- optional target date;
- participants;
- Measurements;
- manual conditions;
- contextual links.

The difference is ownership, privacy, collaboration and capabilities—not a reduced feature set.

### 10.3 Plan lifecycle

```text
Borrador
Activo
En pausa
Completado
Cerrado
Papelera
```

`Archivado` is an orthogonal organizational property:

```text
archived_at
```

Archive applies only to:

- completed Plans;
- closed Plans.

Active, paused and Draft Plans cannot be archived.

### 10.4 Plan creation

Manual Plan creation is intentionally minimal:

```text
Nuevo plan

¿Qué querés lograr?

Alcance
Personal / Familia

Finaliza
Fecha / Evento / Sin fecha

Crear plan
```

This creates a Draft container.

It does not initially ask for:

- universal progress mode;
- percentage;
- every Milestone;
- every Task;
- multiple measurements;
- Save as Preset.

After creation, Plan Detail becomes the construction surface.

### 10.5 Create a Plan from a complete Preset

Selecting a complete Plan Preset does not create a Plan immediately.

HomePlus must first show:

- a compact summary of the proposed structure;
- the typed variables that still need contextual values;
- the number of Milestones, Tasks, Events and Measurements;
- the proposed relative dates and finalization rule;
- an optional `Revisar estructura` action.

Before final confirmation, the person may:

- resolve typed placeholders;
- include or exclude proposed elements;
- edit relative dates;
- review assignments and participants;
- review necessary/supporting flags;
- review or choose the final Event;
- inspect the complete resulting structure.

The person must then choose explicitly between:

```text
Crear plan
Guardar como borrador
Cancelar
```

The final confirmation creates the complete Plan and its selected structure atomically:

```text
all selected elements are created
or
nothing is created
```

A failed or interrupted compound creation must never leave a partial Plan,
orphaned Tasks, orphaned Events, incomplete Milestones or partially applied
relationships.

Selecting the Preset alone is never sufficient confirmation.

`Revisar estructura` is optional as a separate navigation action, but the
structure summary and final explicit confirmation are mandatory.

If the resulting structure satisfies activation requirements, `Crear plan`
may activate it according to the confirmed choice. Otherwise it remains a
Draft. `Guardar como borrador` always creates an operationally isolated Draft.

### 10.6 Add to Plan

From Plan Detail:

```text
Agregar al plan

Tarea
Hito
Evento
Medición
Desde un preset
```

A Task may belong directly to the Plan or to one Milestone inside that Plan.

Applying a composed Preset to an existing Plan:

- does not replace the Plan objective;
- does not replace scope;
- does not replace finalization;
- does not delete existing content by default;
- shows a structure summary;
- allows review;
- adds selected elements atomically;
- detects duplicates;
- preserves imported internal relationships.

When applied to an active Plan, it is one grouped operation and produces at most one notification summary.

### 10.7 Plan Detail

Phone:

```text
dedicated full screen
```

Tablet:

```text
master-detail
```

Plan Detail prioritizes:

1. current blocker;
2. next commitment;
3. current Milestone;
4. relevant actions;
5. primary Measurement;
6. access to complete structure.

It does not behave as a dashboard that exposes every section at once.

Example:

```text
Reformar el baño

Bloqueo
Faltan $380.000 para comprar el mueble

Próximo
Visita del plomero · viernes

Hito actual
Resolver instalaciones

Acciones
3 pendientes

Ahorro
$420.000 de $800.000
```

### 10.8 Plan editing

Editing is mixed and contextual.

Frequent properties may be edited directly.

Full operations:

```text
Editar detalles
Editar estructura
```

`Editar estructura` contains:

- objective;
- Milestones;
- Tasks;
- Events;
- Measurements;
- finalization.

It uses autosave.

Phone organizes one manageable section at a time.

Tablet may use navigation on one side and an editor on the other.

### 10.9 Required vs supporting

Each linked element may be:

```text
Necessary
Supporting / optional
```

Defaults:

- Milestone created inside a Plan → necessary;
- Task created inside a Plan → necessary;
- ordinary Event → supporting;
- final Event → necessary;
- Measurement with target → necessary.

These defaults may be edited.

### 10.10 No universal percentage

Planner must not generate one artificial percentage by combining incompatible concepts such as:

- Tasks;
- Events;
- Milestones;
- Measurements;
- manual conditions.

Plan Detail shows real indicators separately.

Examples:

- 3 of 4 Milestones completed;
- $420.000 of $800.000;
- Event final pending;
- current blocker;
- next action.

### 10.11 Activation

A Plan can activate when it has:

- valid objective;
- valid scope;
- consistent relationships;
- at least one real criterion or useful structure;
- valid required entities.

Activation is atomic:

```text
all structure activates
or
everything remains Draft
```

Children of a Draft Plan:

- do not appear in Tasks;
- do not appear in Events;
- do not appear as independent Drafts;
- do not appear in Home;
- do not notify;
- do not generate recurrence;
- are visible only inside that Plan.

### 10.12 Pause and resume

Pausing a Plan pauses:

- Tasks;
- Events;
- Milestones;
- recurrence;
- reminders;
- automatic Measurements.

Own states are preserved.

Example:

```text
Task own state
→ Pending

Plan
→ Paused

Effective Task state
→ Pending, paused by Plan
```

Resume:

- keeps original dates;
- does not automatically replan;
- does not generate missed recurrences retroactively;
- resumes from the next valid future occurrence.

### 10.13 Plan completion

Completion means:

```text
The objective was achieved.
```

When all necessary requirements are satisfied, HomePlus proposes:

```text
Todo lo necesario está listo.

¿Querés completar el Plan?
```

The Plan is never auto-completed.

The human may choose:

```text
Completar Plan
Seguir abierto
```

A person with the required capability may also complete a Plan while some requirements remain pending, but only through a distinct explicit confirmation that clearly states the unresolved requirements and the operational consequences.

Completing:

- ends all remaining operational children;
- preserves own states;
- preserves progress and history;
- may create restrained recognition;
- does not delete unfinished child history.

### 10.14 Close without completion

Close means:

```text
The Plan ended without declaring the objective achieved.
```

Close:

- is distinct from completion;
- stops the structure;
- preserves progress;
- preserves history;
- may include an optional note;
- uses a neutral tone;
- may later reopen.

### 10.15 Reopen

A completed or closed Plan may reopen.

Reopen:

- preserves history;
- preserves completed work;
- preserves Measurements;
- reactivates still-pending elements;
- keeps original dates;
- does not reset progress;
- automatically removes archive state when needed.

### 10.16 Archive

Archive is only for completed or closed Plans.

Archive:

- hides the Plan from normal historical views;
- does not change child operational state;
- can be reversed;
- is not Trash.

Tasks and Events do not receive a separate Archive in V1.

Completed and cancelled Tasks remain accessible through history and filters.

Past Events remain accessible through Calendar and history.

### 10.17 Plan Trash and restore

Moving a Plan to Trash includes the complete structure:

- Plan;
- Milestones;
- Tasks;
- Events;
- Measurements;
- series;
- relationships;
- history;
- evidence.

The Plan is restored as one unit.

While the Plan remains in Trash, its children cannot be restored independently.

Restore:

- returns the Plan to its previous state;
- restores its structure;
- preserves previous assignments, recurrence, evidence, history and archive property;
- may mark invalid secondary relationships for review;
- must not fail the whole restore only because a secondary relation no longer exists.

### 10.18 Removing a required child

When removing a supporting element:

```text
ordinary confirmation
```

When removing a necessary element:

```text
“Comprar el mueble” es necesario
para completar este Plan.

Al eliminarlo, dejará de ser
un requisito activo.
```

If removing the element causes remaining requirements to become satisfied, HomePlus does not present this as normal achievement.

It shows:

```text
El Plan ahora cumple sus requisitos
porque se eliminó un elemento necesario.

Revisar finalización
```

Completion still requires explicit human confirmation.

### 10.19 Milestone completion

A Milestone may be automatic or manual.

#### Automatic Milestone

When it has defined requirements:

```text
all required children complete
→ Milestone completes
```

If a required child reopens:

```text
automatic Milestone
→ returns to Pending
```

#### Manual Milestone

When it represents a human judgment:

```text
Mark Milestone complete
```

A manually completed Milestone does not reopen automatically because of unrelated supporting changes.

### 10.20 Measurements

A Measurement may be:

```text
Active
Target reached — derived
Trash
```

`Target reached` is derived from the value and target rule.

Reaching a target:

- updates Plan Detail;
- may satisfy one requirement;
- may cause HomePlus to propose completion;
- never auto-completes the Plan.

Corrections preserve history.

---

## 11. Preset contract

### 11.1 Sources

```text
HomePlus
Personal
Household
```

### 11.2 Types

```text
Task Preset
Event Preset
Plan Preset
```

### 11.3 Scope independence

Preset scope and execution scope are independent.

A household Preset may create a personal execution.  
A personal Preset may create a household execution when capabilities allow.

### 11.4 Task Preset content

A Task Preset may store:

- stable identity;
- title;
- instructions;
- category;
- icon or visual identity.

It does not store:

- concrete date;
- concrete time;
- assignees;
- completion records;
- verification results;
- evidence;
- state;
- progress;
- recurrence.

### 11.5 Event Preset content

An Event Preset may store:

- stable identity;
- title;
- category;
- suggested duration.

It does not store:

- concrete date or time;
- participants;
- recurrence;
- concrete location;
- RSVP;
- attendance;
- state.

### 11.6 Plan Preset content

A Plan Preset may store:

- objective template;
- Milestones;
- Tasks;
- Events;
- Measurements;
- internal relationships;
- order;
- necessary/supporting flags;
- relative temporal rules;
- finalization structure;
- typed placeholders.

It never stores:

- absolute dates;
- current people;
- assignees;
- progress;
- completion records;
- RSVP;
- attendance;
- evidence;
- current Measurement values;
- current Inventory state;
- history.

### 11.7 Typed placeholders

V1 allows typed placeholders such as:

- Person;
- Date;
- Place;
- Quantity and unit;
- Duration;
- Budget;
- Participants;
- Area;
- Resource.

Arbitrary untyped variables are outside V1.

### 11.8 Preset creation

Task and Event forms may contain:

```text
Guardar como preset
```

If an equivalent Preset already exists, the only conflict actions are:

```text
Actualizar
Cancelar
```

There is no duplicate `Guardar como nuevo` path for an equivalent structure.

Equivalence detection is structural, not title-only.

An execution may offer `Actualizar preset de origen` only when:

- the execution actually differs from its source Preset;
- the person has permission;
- the update is explicit;
- the affected future structure is summarized before confirmation.

Plan creation does not offer Save as Preset at the initial empty-container step.

After a Plan contains reusable structure, HomePlus may show one contextual suggestion:

```text
Esta estructura puede reutilizarse.
Guardar como preset
```

If dismissed, it does not nag again. The action remains available in administration.

### 11.9 Preset snapshot

A Plan Preset saves structure, not current execution state.

Personal Plan defaults to a personal Preset.  
Household Plan defaults to a household Preset, subject to Household capabilities.

### 11.10 Preset library

The library is reached through:

```text
Ver todos
```

or global search:

```text
Administrar presets
```

It supports:

- type filters: Tasks, Events, Plans;
- origin filters: All, Personal, Household, HomePlus;
- search;
- fixed;
- recent;
- all;
- Trash.

### 11.11 Preset cards

Quick Preset cards show only:

- icon;
- name.

Interaction:

- tap → select;
- second tap on selected Preset → deselect;
- hold → Preset Detail;
- last card → Ver todos.

Ranking:

1. fixed;
2. contextually relevant;
3. recent;
4. frequent;
5. household;
6. HomePlus;
7. Ver todos.

Cards do not reorder during the active session.

### 11.12 Preset permissions and lifecycle

HomePlus Presets:

```text
Use
Duplicate
```

Personal or household Presets may allow:

```text
Use
Edit
Duplicate
Delete
```

according to Household capabilities.

Preset lifecycle:

```text
Active
Revision Draft
Trash
```

Edits affect future uses only.

Existing executions never change because a Preset changes.

Deleted Presets remain recoverable for 30 days and do not affect existing executions.

---

## 12. Draft contract

Drafts exist for:

- Tasks;
- Events;
- Plans.

### 12.1 Meaningful content

A Draft is created only after meaningful content exists.

Empty or default-only forms do not create persistent Drafts.

Unexpected interruption preserves meaningful local work.

### 12.2 Operational isolation

Drafts:

- do not appear in active views;
- do not appear in Home;
- do not appear in operational Calendar;
- do not notify;
- do not create recurrence;
- do not affect active assignments;
- do not count toward actionable badges.

This isolation must exist in domain queries, not only as a visual filter.

### 12.3 Draft placement

Independent Drafts appear at the end of their root list only when they exist:

```text
Tareas
…
Borradores
```

```text
Eventos
…
Borradores
```

```text
Planes
…
Borradores
```

Children of a Plan Draft do not appear independently in Task or Event Draft sections.

### 12.4 Draft synchronization

Once confirmed online, Drafts may synchronize across devices.

Offline:

- they remain local;
- they may be pending synchronization;
- they must not disappear silently.

### 12.5 Draft deletion

A persistent Draft is sent to Trash and remains recoverable for 30 days.

It is not ambiguously “discarded”.

---

## 13. Surfaces and responsive behavior

### 13.1 Planner root

```text
Planner

Tareas     Eventos     Planes
```

Planner initially opens in Tasks.

Changing tabs preserves relevant filters and scroll state.

No fourth root tab exists for Presets, Trash or Archive.

### 13.2 Phone surfaces

- Task Detail → expandable bottom sheet;
- Event Detail → expandable bottom sheet;
- Plan Detail → full screen;
- Task/Event creation → adaptive sheet;
- minimal Plan creation → sheet;
- Task/Event edit → full-height sheet content;
- Plan structure edit → full screen;
- Preset library → full screen;
- Trash → full screen;
- Plan Archive → full screen;
- conflict review → focused sheet.

Sheets may expand for the keyboard or more information.

Sheets do not stack repeatedly. A deep action replaces the current sheet content or navigates to a full screen when necessary.

### 13.3 Tablet surfaces

Tablet uses master-detail where useful:

- Tasks → list + Task Detail;
- Events → calendar/list + Event Detail;
- Plans → list + Plan Detail;
- Presets → library + Preset Detail;
- Trash → list + restore detail.

Task/Event creation may use a side panel or centered modal.

Plan structure editing uses the larger main area.

Tablet gains space and simultaneity, not exclusive product capabilities.

### 13.4 Detail before Edit

For every entity:

```text
Tap
→ Detail

Edit
→ secondary action
```

This applies consistently to Tasks, Events and Plans.

### 13.5 Task temporal views

Tasks support:

```text
Día
Semana
Mes
```

These are views, not technical filters.

Contextual filters may include:

- All;
- Mine;
- Anyone;
- Waiting for verification;
- Plan;
- category.

Filters live in the current Task context rather than a permanent row of many chips.

### 13.6 Calendar behavior

Selecting a day:

- selects the date;
- updates Agenda;
- preserves monthly context;
- does not automatically open a new screen.

### 13.7 Empty states

Empty states are specific, truthful and actionable.

Examples:

```text
No hay tareas pendientes.

Creá una tarea para organizar
lo próximo en casa.
```

```text
Nada pendiente para hoy.

La próxima tarea es mañana.
```

```text
No hay eventos este día.
```

```text
Todavía no hay Planes.

Usalos para organizar algo
que requiere varios pasos.
```

Empty Draft sections do not appear.

### 13.8 Loading and errors

Initial loading uses skeletons matching the real structure.

Existing data remains visible during refresh.

Partial errors appear near the affected entity.

Offline message:

```text
Sin conexión
3 cambios pendientes
```

HomePlus must not imply that work was lost.

### 13.9 Deep links

Deep links open the current correct entity context:

- Task notification → Task Detail;
- Event update → Event Detail;
- verification → evidence and review;
- Plan completion → Plan summary;
- widget → represented entity;
- search → deep destination.

If the entity changed, HomePlus shows the current state rather than applying an obsolete action.

---

## 14. Attention system

### 14.1 Principle

HomePlus competes against forgetting and disorganization, not for screen time.

Every push must answer:

- why this person;
- why now;
- what changed;
- what action is possible.

Planner uses four attention levels:

```text
Ambient
Summary
Active
Time-sensitive
```

`Critical` is not used by Planner V1.

Notifications must never use vague copy such as `Tenés una actualización` when the specific reason and available action can be stated.

### 14.2 Independent surfaces

A confirmed Planner change independently evaluates:

1. app state;
2. widget state;
3. Attention item;
4. Activity;
5. push;
6. badge.

One surface does not automatically substitute another.

### 14.3 Attention Center

```text
Atención
├── Para vos
└── Actividad
```

`Para vos` contains:

```text
Requiere respuesta
Próximo
Disponible en casa
```

#### Requiere respuesta

Examples:

- verification;
- correction;
- RSVP;
- conflict;
- invalid assignment;
- evidence upload problem.

#### Próximo

Examples:

- own Task near due threshold;
- Event starting soon;
- individual obligation requiring attention;
- relevant change not yet handled.

#### Disponible en casa

Examples:

- ordinary Tasks assigned to `Cualquiera`;
- opportunities to use `Me encargo`.

This section does not increase the badge by default.

### 14.4 Activity

Activity records humanly meaningful confirmed events:

- someone completed a Task;
- someone verified fulfillment;
- a Plan activated;
- the household completed a Plan.

Activity does not include:

- autosave;
- description edits;
- filter changes;
- Preset browsing;
- synchronization noise.

Activity never increments the actionable badge.

### 14.5 Badge

The badge counts unresolved actionable matters for that person.

It does not count:

- total notifications;
- all pending Tasks;
- all future Events;
- ordinary `Cualquiera` Tasks;
- Drafts;
- Activity;
- items merely viewed.

One unresolved matter counts once even if it appears in several surfaces.

`Próximo` does not automatically mean badge.

Temporal items count only after crossing a real attention threshold.

### 14.6 Cualquiera notification policy

Ordinary `Cualquiera` Task:

```text
visible in app
visible in widget
visible in Attention
included in relevant summary
no immediate mass push
```

A `Cualquiera` Task may create push when there is a real signal:

- concrete time;
- near deadline;
- explicit reminder;
- `Avisar ahora`;
- urgent change to an already communicated responsibility.

High priority alone:

- raises ranking in Home;
- raises ranking in widgets;
- highlights in Attention;
- may move earlier in summary;
- does not create collective push by itself.

### 14.7 Task notification rules

Direct assignees receive relevant assignment and temporal notifications.

`Cada persona` reminders are individual.

Completion normally does not push everyone unless it:

- requires verification;
- unblocks someone;
- completes a Plan;
- materially changes another person’s responsibility.

Evidence upload failures appear as actionable technical matters, not repeated external push spam.

### 14.8 Event notification rules

Notify affected participants for:

- being added;
- meaningful date or time change;
- meaningful location change;
- cancellation;
- RSVP request;
- reminder;
- attendance registration when they are responsible.

Do not push for:

- cosmetic changes;
- category;
- description-only changes;
- reordering.

Recurring series changes create one summarized notification, not one notification per future occurrence.

### 14.9 Plan notification rules

Plan activation creates one personalized summary.

Example:

```text
Se activó “Preparar el cumpleaños”.

Para vos:
2 tareas
1 evento
4 disponibles para cualquiera
```

A compound Plan never produces one push per child.

Structural changes are grouped by:

- Plan;
- recipient;
- time window;
- actual effect.

Plan completion may use restrained emotional attraction because it reflects real work:

- brief animation;
- haptic;
- Activity highlight;
- recognition of contributions.

No rankings, family competition or streak pressure.

Personal private Plans do not create household Activity.

### 14.10 Daily summaries

Morning summary is on by default only when useful.

It is personal and may contain:

- own obligations;
- Events where the person participates;
- relevant `Cualquiera` Tasks;
- changes affecting the day.

An empty summary is not sent.

Night summary is optional and off by default.

Its language avoids blame or guilt.

### 14.11 Quiet hours

HomePlus respects:

- operating-system notification settings;
- focus modes;
- personal HomePlus quiet hours.

During quiet hours, ordinary activity and summaries are deferred.

Time-sensitive delivery may continue only when:

- an Event begins soon;
- a nearby Event changed or was cancelled;
- a responsibility has a real time;
- the person enabled that category.

Planner V1 does not use critical alerts.

### 14.12 Direct actions

Safe direct actions may include:

- Complete;
- Me encargo;
- Postpone;
- RSVP;
- Verify;
- Open details.

Maximum:

```text
one primary action
+
one secondary action
```

Complex operations open the correct app context.

### 14.13 Widget independence

Invariant:

```text
Widget installed / present / size / count / configuration
≠ change to notification policy
```

Widgets do not prove that content was seen.

Only a real widget action changes entity state.

### 14.14 Widgets

Small:

```text
Next
```

Medium:

```text
Today at home
```

Large:

```text
family organization by person or context
```

Quick action widget:

```text
Nueva tarea
Nuevo evento
Nuevo plan
```

If a Task requires evidence, a widget completion action opens the correct evidence flow rather than falsely completing it.

Personal private Plans do not appear in shared widgets.

### 14.15 Privacy

Lock screen content is personally configurable.

Reduced mode may show:

```text
1 evento próximo
```

instead of details.

Do not expose directly:

- evidence images;
- sensitive correction comments;
- medical notes;
- private personal Plan details;
- private locations;
- unnecessary information about minors.


### 14.16 Attention quality metrics

Attention is evaluated through utility, not engagement volume.

Useful metrics include:

- actionable matters resolved;
- reduction in forgotten responsibilities;
- timely RSVP;
- timely verification;
- push dismissals;
- muted categories;
- stale or duplicate notifications;
- resolution from push or widget;
- ratio between interruptions and useful actions.

Planner must not optimize for:

- number of pushes;
- app opens;
- session duration;
- time spent.

---

## 15. Reliability contract

### 15.1 Source of truth

```text
Backend
→ authoritative shared truth

Local database
→ immediate UI truth
→ cache
→ Drafts
→ pending operations
```

The UI reads local state.

Synchronization reconciles with the backend.

Realtime is transport and acceleration, not the authoritative ledger.

### 15.2 Save models

#### Instant actions

Use optimistic UI when the action is small and reversible:

- complete;
- Me encargo;
- verify;
- RSVP;
- attendance;
- archive;
- simple date or assignment changes.

Feedback is immediate.

If failure occurs:

- revert;
- explain;
- allow retry.

#### Simple Task/Event forms

- local editing while open;
- explicit Create or Save;
- meaningful close protection;
- unexpected interruption preserves a Draft.

#### Complex structures

Plan Drafts, structure editing and compound Preset reviews use autosave.

Save state is shown only when useful:

- Saving;
- Offline;
- Pending;
- Error.

Permanent `Saved` noise is avoided.

### 15.3 Draft synchronization

Confirmed Drafts synchronize across devices.

Offline Drafts remain local and pending sync.

No Draft disappears silently.

### 15.4 Atomic operations

The backend must provide atomic transactions for:

- compound Plan creation;
- Plan activation;
- Plan pause;
- Plan completion;
- Plan close;
- Plan trash;
- Plan restore;
- applying a compound Preset;
- recurrence series split.

All occur or none occur.

The frontend does not coordinate many independent requests as final authority.

### 15.5 Idempotency

Every significant mutation has a client operation identifier.

Retries must produce the same result and never duplicate effects.

This applies to:

- create;
- apply Preset;
- complete;
- verify;
- attendance;
- activate;
- pause;
- restore;
- recurrence generation.

### 15.6 Offline scope

Guaranteed offline after previous synchronization:

- essential current data;
- recent data;
- near-term schedule;
- Drafts;
- recent Presets;
- open or pinned Plans.

Not guaranteed:

- entire old history;
- complete Trash;
- very large libraries;
- structures never opened.

Safe small operations may be queued.

Critical compound household operations may be prepared offline but wait for online confirmation.

Examples:

- activating a household Plan;
- applying a compound Preset to an active Plan;
- restoring a Plan;
- complex series edit;
- permission-sensitive household Preset;
- final completion requiring evidence confirmation.

### 15.7 Offline queue

Queued operations preserve:

- operation ID;
- entity;
- base version;
- local time;
- dependencies;
- household or personal scope.

Dependency order is respected.

Failures are preserved and surfaced.

No operation is silently discarded.

### 15.8 Versioning and conflicts

Each entity has a version, normally hidden.

Conflict strategy:

#### Different fields

Auto-merge where safe.

#### Same harmless metadata

Use latest confirmed state when safe and preserve local content when loss is possible.

#### Same operational field

Require field-level human choice.

#### Structural changes

Require explicit review.

#### Terminal actions

Never silently merge.

There is no universal last-write-wins policy.

### 15.9 Specific conflict rules

Delete vs edit:

- do not auto-restore;
- preserve local content temporarily;
- allow copy or discard.

Plan completes or closes during edit:

- preserve the local proposal/change set;
- do not silently add an active child;
- do not silently reopen the Plan.

Plan pauses while a Task is being added:

- save the Task;
- inherit the paused state.

Permission loss during editing:

- unauthorized changes do not apply;
- local text is preserved for copy or discard.

### 15.10 Realtime

Supabase/Postgres changes update the local replica quickly.

After reconnect, HomePlus reconciles with backend state.

The system does not rely only on received realtime events.

Realtime changes are applied silently when they do not invalidate the current interaction.

When a remote change invalidates the current screen or edit:

- HomePlus shows the confirmed current state;
- stale editing is disabled;
- local unsaved work is preserved for review, copy or discard.

Presence indicators are limited to complex Plan structure editing.

Routine forms do not need collaborative presence UI.

### 15.11 Evidence ordering

Required evidence ordering is invariant:

```text
local secure file
→ compress
→ upload
→ confirm reference
→ record completion
→ waiting for verification
```

A required-evidence fulfillment cannot enter verification before the file is confirmed.

### 15.12 Recurrence exactly once

Series definition and instances are separate.

`This and following` splits the series without duplication.

After-completion recurrence creates exactly one next instance after confirmed completion.

### 15.13 Trash and restore

Whole Plan structures move and restore atomically.

Restore core structure even when secondary relationships need review.

Preserve:

- previous state;
- history;
- assignment;
- recurrence;
- evidence;
- archive property.

### 15.14 Time zones

Timed Events store instant and zone.

All-day Events and date-only Tasks store semantic local dates.

They must not move to another day because of UTC conversion.

### 15.15 History

History records confirmed human-level actions:

- who;
- what;
- when;
- previous state;
- result.

Autosaves are consolidated.

UI noise is excluded.

---

## 16. Permissions boundary

Planner consumes capabilities such as:

- view;
- create;
- edit;
- assign;
- verify;
- close;
- restore;
- manage Presets.

Household defines the final capability matrix by role or person.

Planner does not permanently encode an independent rigid role matrix.

Frontend capability checks are presentation only and never replace security.

Backend and RLS must agree.

The actor is always derived from authenticated identity and validated context.

The backend must not trust authoritative person, member or actor IDs sent by the client.

---

## 17. Accessibility contract

Accessibility is part of the functional freeze.

### 17.1 Rows

A Task may announce:

```text
Comprar comida.
Vence hoy.
Asignada a Gabriel.
Pendiente.
```

### 17.2 Calendar

A date may announce:

```text
18 de julio.
3 elementos.
```

### 17.3 Gestures

Every swipe action has an accessible alternative.

### 17.4 Color

No state depends only on color.

### 17.5 Layout

- sufficient touch targets;
- enlarged text support;
- adaptive layout;
- sheets capable of growing;
- controlled truncation;
- phone and tablet coverage;
- reduced-motion behavior.

---

## 18. Global invariants

The following are mandatory.

```text
One entity
→ one identity
```

```text
Task or Event
→ maximum one controlling Plan
```

```text
Active new Task
→ valid assignment configuration
```

```text
Cualquiera
→ does not require one concrete member
```

```text
Each person
→ one fulfillment per concrete person
```

```text
Shared once
→ one shared fulfillment
```

```text
Cancelled
→ Task lifecycle
→ not an active fulfillment state
```

```text
Task under Milestone
→ same Plan
```

```text
Final Event
→ same Plan
```

```text
Plan Draft
→ no operational children published
```

```text
Child of Plan Draft
→ visible only inside that Plan
```

```text
Paused Plan
→ no operational children
→ own child states preserved
```

```text
Completed or closed Plan
→ no active children
```

```text
Plan personal
→ belongs to person
→ independent of active household
→ private by default
```

```text
Household Draft
→ private until explicitly shared or activated
```

```text
High priority
→ no collective push by itself
```

```text
Próximo
→ no automatic badge
```

```text
Activity
→ never increments actionable badge
```

```text
Widget presence
→ never changes notification policy
```

```text
Draft
→ never produces operational notification
```

```text
Preset edit
→ never changes existing executions
```

```text
Deleted Preset
→ never deletes existing executions
```

```text
Required evidence
→ confirmed file before verification
```

```text
Repeated operation
→ never duplicates effect
```

```text
Compound operation
→ atomic
```

```text
Requirements
→ hierarchical
→ no double counting
```

```text
Removing required element
→ explain impact
→ never simulate ordinary completion
```

```text
Persistent Draft deletion
→ Trash
→ not ambiguous discard
```

```text
Backend
→ authoritative shared state
```

```text
Local database
→ immediate UI state and pending work
```

```text
Actor identity
→ derived from authentication
```

---

## 19. Explicit V1 exclusions

The following are not part of this functional freeze:

- Geni automatically generating complete Plans;
- intelligent automatic replanning after resume;
- collaborative editing equivalent to Google Docs;
- immediate manual permanent deletion;
- critical alerts;
- family productivity rankings;
- mandatory streaks;
- guilt-based engagement;
- mandatory integrations with Inventory, Presence, Vehicles or Assets;
- Live Activities as a required Planner V1 surface;
- final role-by-role permission matrix inside Planner;
- universal progress percentage;
- Tasks or Events belonging to several controlling Plans;
- arbitrary untyped Preset variables;
- desktop Planner;
- automatic Plan completion;
- automatic publication of household Drafts.

---

## 20. Accepted risks and dependencies

The freeze accepts the following implementation risks:

- large domain expansion from Planner V0;
- legacy data migrations;
- compatibility projections during transition;
- security alignment between backend, RLS and Household;
- offline and conflict complexity;
- evidence privacy and storage;
- recurrence and time-zone correctness;
- native dependency decisions for notifications, location and widgets;
- phone and tablet QA scope;
- need for staged vertical slices;
- remote schema drift verification;
- potential temporary compatibility fields that are not final product behavior.

These risks do not reduce the functional target.

---

## 21. Technical implementation boundary

This document defines the final functional result.

The technical audit defines the current repository and its gaps.

Implementation may proceed through additive, compatible submilestones.

A submilestone may temporarily preserve legacy fields or projections when necessary for safety.

Temporary compatibility must not become the final product contract.

Implementation must not:

- silently rename a legacy concept without implementing the frozen behavior;
- present a technical workaround as a product decision;
- omit a required capability because it is difficult;
- make incomplete compound operations appear successful;
- bypass RLS through trusted client-supplied actor IDs;
- implement only visual changes while leaving the domain contradictory.

Every implementation submilestone requires:

- explicit scope;
- allowlisted files;
- migration strategy;
- Definition of Done;
- tests;
- exclusions;
- review before the next submilestone.

---

## 22. Traceability summary

### 22.1 Package A

Frozen:

- Quick Actions icon + title only;
- minimal Task rows;
- Detail before Edit;
- swipe completion and contextual destructive actions;
- structured Event location;
- composable Plan tracking;
- chip reduction;
- contextual Task filters;
- numeric calendar badge;
- phone and tablet adaptation.

### 22.2 Package B

Frozen:

- adaptive creation;
- Preset carousel and library;
- Task/Event manual forms;
- visible Planes concept;
- personal and household Plans;
- minimal Plan creation;
- Plan creation from complete Preset;
- Plan Detail;
- Drafts;
- lifecycle;
- assignment and collaboration;
- verification and evidence;
- Event participation and attendance;
- reliability protections.

### 22.3 Package C

Frozen:

- domain model;
- relationships;
- ownership;
- controlling Plan;
- layered states;
- lifecycle;
- completion graph;
- Trash and restore;
- recurrence.

### 22.4 Package D

Frozen:

- navigation;
- phone and tablet surfaces;
- Detail-first interaction;
- list and Calendar patterns;
- creation;
- Presets;
- Drafts;
- Archive;
- Trash;
- accessibility.

### 22.5 Package E

Frozen:

- attention system;
- push policy;
- widgets;
- privacy;
- quiet hours;
- backend/local truth;
- save models;
- offline;
- idempotency;
- atomicity;
- conflicts;
- realtime;
- evidence ordering;
- permissions boundary.

### 22.6 Gates

```text
G1 — Temporal semantics
G2 — Assignment, fulfillment, verification and evidence
G3 — Composable Plan model
G4 — Lifecycle
G5 — Attention, notifications and widgets
G6 — Presets and reusable memory
G7 — Reliability, offline, conflicts and source of truth
```

All are approved and frozen.

---

## 23. Change control

Every functional change request must include:

- Change ID;
- requester;
- reason;
- current frozen behavior;
- proposed behavior;
- user impact;
- domain impact;
- data migration impact;
- API impact;
- frontend impact;
- notification/widget impact;
- offline/conflict impact;
- risk;
- tests;
- affected documents;
- explicit human approval.

After approval:

1. update this canonical document;
2. update Final Decision Registry;
3. update Freeze Contract;
4. update relevant implementation plan;
5. record version and date.

No implementation may treat an unapproved proposal as a frozen decision.

---

## 24. Freeze signature

```text
PLANNER V1 FUNCTIONAL FREEZE
STATUS: FROZEN
HUMAN APPROVAL: APPROVED
MILESTONE: M11
FREEZE DATE: 2026-07-22
CANONICAL AUTHORITY: PLANNER_V1_M11_FUNCTIONAL_FREEZE.md
IMPLEMENTATION: NOT YET AUTHORIZED — FUTURE WORK ONLY THROUGH APPROVED SUBMILESTONES
```
