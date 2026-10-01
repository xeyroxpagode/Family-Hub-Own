# Planner V1 — Parallel Ownership Matrix

**Purpose:** Prevent two parallel lanes from owning the same implementation surface.
**Status:** ACTIVE - base and exact repository paths verified 2026-07-22; M11.INT-01 Phase 2 R2B Integration validation complete, fresh independent QA pending.
**Rule:** One production file has one owner at a time.

---

## 1. Lanes

| Lane | Branch | Primary responsibility |
|---|---|---|
| Integration | `planner-v1-integration` | Shared contracts, merges, global surfaces and global gates |
| Tasks | `planner-v1-tasks-m11-1b` | Task assignment, fulfillment, Task API and later Task UI |
| Events | `planner-v1-events` | Events, participants, RSVP, attendance, recurrence and Event UI |
| Plans | `planner-v1-plans` | Plans, Milestones, Measurements, requirements and controller |
| Presets/Drafts | `planner-v1-presets-drafts` | Presets, placeholders, Draft isolation, autosave and library |
| Reliability | `planner-v1-reliability` | Local state, queue, conflicts, realtime, attention and search infrastructure |
| QA | `planner-v1-qa` | Read-only audit, global test matrices, regression and chaos |

---

## 2. Ownership rules

1. A lane may modify only its owned files and new files inside its domain.
2. A shared file is Integration-owned.
3. A lane that needs a shared-file change creates an Integration Request.
4. QA does not modify production implementation.
5. Integration does not absorb whole domain implementations.
6. Ownership may be transferred only through an explicit queue entry.
7. Generated reports belong to the lane that produced them.
8. Freeze authorities are never lane-owned and remain read-only.

---

## 3. Logical ownership

| Surface | Owner | Other lanes may |
|---|---|---|
| Task assignment and fulfillment schema | Tasks | Consume published DTO/RPC |
| Task API/controller/service | Tasks | Request adapters |
| Task visible screens | Tasks | Integration may wire navigation |
| Event domain/schema/API | Events | Plans may reference published contract |
| Event visible screens | Events | Integration may wire navigation |
| Combined Calendar | Integration | Events/Tasks publish projections |
| Plan graph/controller/schema | Plans | Tasks/Events publish controller adapters |
| Plan visible screens | Plans | Integration may wire navigation |
| Preset schema/library/apply logic | Presets/Drafts | Domain lanes publish template schema |
| Draft persistence/isolation | Presets/Drafts | Domain lanes expose draft payload contract |
| Local operation queue | Reliability | All lanes publish operation descriptors |
| Conflict framework | Reliability | Domain lanes publish field/terminal rules |
| Realtime reconciliation framework | Reliability | Domain lanes publish invalidation rules |
| Attention aggregation | Reliability + Integration | Domain lanes publish attention events |
| Global search | Reliability + Integration | Domain lanes publish search documents |
| Global navigation and Quick Actions | Integration | Domains publish routes |
| Home Planner summary | Integration | Tasks/Events/Plans publish summary projections |
| Capability registry | Integration | Domains request additions |
| Cross-domain migration | Integration | Domains define required relation |
| Global regression and chaos | QA | Lanes provide fixtures and commands |
| Release migration gate | Integration + QA | Domains provide backfill reports |

---

## 4. Path ownership — verified baseline

The entries below distinguish verified existing files from lane-owned new files.
`backend/src/routes/planner.js` is a single shared route registry and is
Integration-owned even when a domain contributes controller handlers.

### Tasks

Owned patterns:

```text
backend/src/controllers/planner.tasks*
backend/src/services/planner.tasks*
front/mi-front-limpio/services/plannerTasks*
front/mi-front-limpio/types/*Task*
front/mi-front-limpio/screens/planner/*Task*
scripts/planner_m11_1b*
supabase/migrations/<Tasks reserved range>*
docs/implementation/planner/M11_1B*
```

Protected from Tasks:

```text
global navigation
Home Planner shared sections
combined Calendar implementation
Events
Plans
Presets
shared capability registry
shared migration ledger
```

### Events

Owned patterns:

```text
backend/src/controllers/planner.events*
backend/src/services/planner.events*
front/mi-front-limpio/services/plannerEvents*
front/mi-front-limpio/types/*Event*
front/mi-front-limpio/screens/planner/*Event*
event recurrence/location/participant tests
supabase/migrations/<Events reserved range>*
docs/implementation/planner/M11_2*
```

Calendar cross-domain files are Integration-owned unless explicitly delegated.

### Plans

Owned patterns:

```text
backend/src/controllers/planner.plans*
backend/src/services/planner.plans*
front/mi-front-limpio/services/plannerPlans*
front/mi-front-limpio/types/*Plan*
front/mi-front-limpio/screens/planner/*Plan*
plan/milestone/measurement tests
supabase/migrations/<Plans reserved range>*
docs/implementation/planner/M11_3*
```

Legacy Goal files may only be modified with an explicit migration/compatibility request.

### Presets/Drafts

Owned patterns:

```text
backend/src/controllers/planner.presets*
backend/src/services/planner.presets*
backend/src/controllers/planner.drafts*
backend/src/services/planner.drafts*
front/mi-front-limpio/services/plannerPresets*
front/mi-front-limpio/services/plannerDrafts*
front/mi-front-limpio/screens/planner/*Preset*
front/mi-front-limpio/screens/planner/*Draft*
supabase/migrations/<Presets reserved range>*
docs/implementation/planner/M11_4*
```

### Reliability

Owned patterns:

```text
planner local-state adapters
operation queue
conflict-resolution framework
realtime reconciliation
attention infrastructure
search index/registry infrastructure
deep-link infrastructure when delegated by Integration
supabase/migrations/<Reliability reserved range>*
docs/implementation/planner/M11_6*
docs/implementation/planner/M11_7*
```

Reliability may not change domain lifecycle semantics.

### Integration

Owned patterns:

```text
global Planner router/index
Home Planner shared sections
combined Calendar projections
global navigation
Quick Actions registry
capability registry
cross-domain adapters
cross-domain migrations
shared contracts
ownership matrix
migration ledger
integration queue
global integration tests
```

M11.INT-01 makes the following ownership explicit:

```text
backend/src/lib/plannerIdempotencyAdapter.js
backend/src/lib/mutationContracts.js
backend/src/lib/plannerMutationContracts.js
backend/src/lib/httpErrors.js
backend/src/services/planner.context.service.js  // shared context composition
Integration-range idempotency/audit scope migrations
private shared reservation/completion/recovery SQL helpers
shared hash-parity, poisoning, grant, concurrency and failure-path tests
```

Domain operation RPCs remain domain-owned and call the private shared helper.
Tasks and Events must consume one Integration implementation; neither may hand
off or retain a divergent copy of the shared adapter/helper.

### QA

Owned patterns:

```text
read-only audit reports
global regression scripts
chaos scripts
release checklists
test matrices
```

QA may create temporary fixtures in local environments but must clean them.

---

## 5. High-conflict files

The following verified files must not be edited by a domain lane without an approved request:

```text
package.json
package-lock.json
backend/package.json
backend/package-lock.json
front/mi-front-limpio/package.json
front/mi-front-limpio/package-lock.json
front/mi-front-limpio/app.json
backend/src/routes/planner.js
front/mi-front-limpio/navigation/AppNavigator.tsx
front/mi-front-limpio/navigation/HomeTabNavigator.tsx
front/mi-front-limpio/navigation/plannerNavigationContract.ts
front/mi-front-limpio/navigation/plannerNavigationHelpers.ts
front/mi-front-limpio/navigation/plannerSearchNavigation.ts
front/mi-front-limpio/navigation/types.ts
front/mi-front-limpio/screens/home/HomePlannerSections.tsx
backend/src/controllers/planner.calendar.controller.js
backend/src/services/planner.calendar.service.js
front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx
front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx
front/mi-front-limpio/services/plannerCalendar.ts
front/mi-front-limpio/components/planner/QuickActionsMenu.tsx
front/mi-front-limpio/components/ui/QuickActionSheet.tsx
front/mi-front-limpio/services/planner/plannerQuickActions.ts
backend/src/lib/plannerCapabilities.js
backend/src/lib/mutationContracts.js
backend/src/lib/plannerMutationContracts.js
backend/src/lib/plannerIdempotencyAdapter.js
backend/src/lib/httpErrors.js
backend/src/services/planner.context.service.js
supabase/config.toml
docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md
```

### 5.1 Active ownership conflict

M11.1B currently has an uncommitted edit to shared
`backend/src/routes/planner.js`. Tasks must not rewrite or discard it. The edit
requires Integration review through `IR-TASK-ROUTE-001` before the M11.1B
handoff can be integrated. This does not block Tasks from completing its
independent audit on its own branch.

Tasks also has a local change to
`backend/src/lib/plannerIdempotencyAdapter.js`. `IR-TASK-IDEMP-001` is
superseded as an independent implementation by `IR-SHARED-IDEMP-003`; the
shared-file delta must not be copied as the canonical fix. Integration owns the
single implementation, while Tasks keeps only Task-specific consumers/RPCs.

Events correctly kept its V1 route registration out of the shared router.
`IR-EVENT-ROUTE-001` remains an Integration-owned handoff after the Event lane
passes the shared correction and independent audit.

### 5.2 V0 compatibility ownership

Task and Event lanes own changes inside their existing V0/V1 domain
controllers, services, and operation RPC migrations. Integration owns the
shared foundation and final grant/RLS lockdown. No temporary production-file
ownership transfer is required. The lockdown cannot be integrated until both
domain owners prove their unchanged V0 routes/DTOs use the atomic RPC boundary.

---

## 6. Integration Request trigger

Create an Integration Request when a lane needs:

- a shared-file edit;
- a new capability;
- a cross-domain FK;
- a global route;
- a Home or Calendar projection;
- a deep link;
- a new shared error code;
- a common dependency;
- a cross-domain migration;
- a contract change.

---

## 7. Ownership transfer template

```text
TRANSFER ID:
FROM:
TO:
FILES:
REASON:
START COMMIT:
EXPECTED RETURN:
TEST OWNER:
INTEGRATION APPROVAL:
```

Temporary transfer expires after the approved task.

---

## 8. Initial activation order

```text
1. Tasks — already active
2. Integration — activate after current Tasks run finishes
3. Events — first new domain lane
4. Plans — second new domain lane
5. QA — active as soon as Events or Tasks delivers
6. Presets/Drafts — rotate into the fourth execution slot
7. Reliability — rotate after shared operation contracts stabilize
```
