# Planner V1 — Integration Queue

**Purpose:** Centralize every cross-lane dependency without blocking unrelated work.
**Owner:** Integration Coordinator
**Status:** ACTIVE — opened by Integration on 2026-07-22
**Rule:** A domain lane does not solve a cross-domain conflict by editing another lane's implementation.

---

## 1. Status values

```text
DRAFT
OPEN
ACKNOWLEDGED
CONTRACT_READY
IMPLEMENTING
READY_FOR_INTEGRATION
INTEGRATED
BLOCKED
REJECTED
SUPERSEDED
```

Priority:

```text
P0 — blocks safe integration or security
P1 — blocks a lane milestone
P2 — required before release candidate
P3 — improvement / later coordination
```

---

## 2. Integration Request template

```text
IR ID:
TITLE:
REQUESTER LANE:
OWNER LANE:
INTEGRATOR:
PRIORITY:
STATUS:

PROBLEM:
REQUIRED CONTRACT:
FILES/SURFACES AFFECTED:
MIGRATION IMPACT:
API/DTO IMPACT:
CAPABILITY IMPACT:
COMPATIBILITY IMPACT:
TESTS REQUIRED:
BLOCKS:
DOES NOT BLOCK:
TARGET BASE:
DECISION:
HANDOFF COMMIT:
INTEGRATION RESULT:
```

---

## 3. Initial queue

### Activation snapshot

```text
M11_1A_BASE_COMMIT             fb4efc81b1debf5932580ef2e16cedf4afb6bb45
v1                             fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-integration         fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-tasks-m11-1b        fb4efc81b1debf5932580ef2e16cedf4afb6bb45 (dirty M11.1B)
planner-v1-events              fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-plans               fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-presets-drafts      fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-reliability         fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-qa                  fb4efc81b1debf5932580ef2e16cedf4afb6bb45
```

Execution capacity is four local Codex sessions total. Worktrees do not imply
that all lanes run simultaneously. There is one shared local Supabase instance;
DB-heavy commands are serialized by
`C:\Users\thega\Desktop\HomePlus-worktrees\.planner-supabase-lock.json`.

### IR-SHARED-001 — Record canonical mutation transport

| Field | Value |
|---|---|
| Requester | Integration |
| Owner | Integration |
| Priority | P0 |
| Status | OPEN |
| Need | Record the exact current header/body mechanism for expected version, operation ID and idempotency |
| Blocks | Events/Plans mutation API freeze |
| Does not block | Domain modeling and read DTOs |
| Acceptance | One mechanism reused by every lane; contract tests added |

### IR-SHARED-002 — Freeze common error envelope

| Field | Value |
|---|---|
| Requester | Integration |
| Owner | Integration |
| Priority | P0 |
| Status | OPEN |
| Need | Record exact API error shape and shared codes from current backend |
| Blocks | Public API prompts for Events/Plans |
| Acceptance | No duplicate error formats |

### IR-TASK-001 — Publish M11.1B Task V1 contract

| Field | Value |
|---|---|
| Requester | Integration |
| Owner | Tasks |
| Priority | P1 |
| Status | READY_FOR_AUDIT |
| Need | Independently audit the implemented but uncommitted Task assignment/fulfillment DTO, routes, errors and operations |
| Blocks | Plans Task adapters, Preset Task schema, Attention Task events |
| Does not block | Event domain foundation |
| Acceptance | Audited M11.1B handoff |

### IR-TASK-ROUTE-001 — Integrate shared Planner route edit

| Field | Value |
|---|---|
| Requester | Tasks |
| Owner | Integration |
| Priority | P1 |
| Status | OPEN |
| Need | Review and integrate the M11.1B route registrations currently present as an uncommitted Tasks edit to `backend/src/routes/planner.js` |
| Blocks | M11.1B integration commit, not the independent Tasks audit |
| Acceptance | Route diff matches the audited Task V1 contract; directed route/contract tests pass; shared-file ownership restored |

### IR-EVENT-001 — Event domain contract

| Field | Value |
|---|---|
| Requester | Integration |
| Owner | Events |
| Priority | P1 |
| Status | DRAFT |
| Need | Lifecycle, participant, RSVP, attendance, location and recurrence DTO/API |
| Blocks | Plan final Event adapter, Event Presets, combined Calendar |
| Acceptance | Event foundation audit PASS |

### IR-PLAN-001 — Task controller adapter

| Field | Value |
|---|---|
| Requester | Plans |
| Owner | Tasks + Integration |
| Priority | P1 |
| Status | DRAFT |
| Need | Versioned/idempotent link, inherited pause/resume and terminal-state adapter |
| Blocks | Plan controller |
| Does not block | Plan graph, Milestone and Measurement model |

### IR-PLAN-002 — Event controller adapter

| Field | Value |
|---|---|
| Requester | Plans |
| Owner | Events + Integration |
| Priority | P1 |
| Status | DRAFT |
| Need | Versioned/idempotent link, inherited state and final Event relation |
| Blocks | Plan controller |
| Does not block | Plan graph |

### IR-CALENDAR-001 — Combined temporal projection

| Field | Value |
|---|---|
| Requester | Events |
| Owner | Integration |
| Priority | P1 |
| Status | DRAFT |
| Need | One Calendar projection for dated Tasks and Events with numeric day count |
| Blocks | Calendar V1 |
| Acceptance | No duplicated entities; V0 compatibility preserved |

### IR-HOME-001 — Planner Home summary V1

| Field | Value |
|---|---|
| Requester | Integration |
| Owner | Integration |
| Priority | P2 |
| Status | DRAFT |
| Need | Consume Task/Event/Plan summary projections without domain coupling |
| Blocks | Final Home integration |
| Does not block | Domain implementation |

### IR-PRESET-001 — Template schemas

| Field | Value |
|---|---|
| Requester | Presets/Drafts |
| Owner | Tasks + Events + Plans |
| Priority | P1 |
| Status | DRAFT |
| Need | Stable reusable fields and prohibited execution fields for each entity |
| Blocks | Preset persistence and library |
| Does not block | Draft base infrastructure |

### IR-DRAFT-001 — Domain Draft payloads

| Field | Value |
|---|---|
| Requester | Presets/Drafts |
| Owner | Tasks + Events + Plans |
| Priority | P1 |
| Status | DRAFT |
| Need | Minimum meaningful-content rules, validation and activation adapters |
| Blocks | Synced Drafts |
| Does not block | Local autosave framework |

### IR-REL-001 — Common operation descriptor

| Field | Value |
|---|---|
| Requester | Reliability |
| Owner | Integration + domain lanes |
| Priority | P1 |
| Status | DRAFT |
| Need | Queue-safe operation descriptor, dependency and retry classification |
| Blocks | Offline queue |
| Does not block | Conflict taxonomy and local-state scaffolding |

### IR-REL-002 — Conflict policies per domain

| Field | Value |
|---|---|
| Requester | Reliability |
| Owner | Tasks + Events + Plans + Presets |
| Priority | P1 |
| Status | DRAFT |
| Need | Safe auto-merge fields, operational fields and terminal conflicts |
| Blocks | Conflict engine |
| Does not block | Realtime invalidation scaffolding |

### IR-ATTN-001 — Planner attention event registry

| Field | Value |
|---|---|
| Requester | Reliability |
| Owner | Integration |
| Priority | P2 |
| Status | DRAFT |
| Need | Domain events mapped to Attention, Activity, push, badge and widgets independently |
| Blocks | Attention Center integration |
| Does not block | Domain audits |

### IR-SEARCH-001 — Search document contract

| Field | Value |
|---|---|
| Requester | Reliability |
| Owner | Integration + domain lanes |
| Priority | P2 |
| Status | DRAFT |
| Need | Search document per entity, privacy/scope and deep-link target |
| Blocks | Global search final integration |
| Does not block | Domain work |

---

## 4. Integration board

| Lane | State | Current milestone | Current blocker | Next handoff |
|---|---|---|---|---|
| Tasks | ACTIVE | M11.1B implementation complete; audit pending | Independent audit and shared route handoff | Audited Task V1 contract |
| Integration | ACTIVE | Coordination activated | None | Review Integration Requests |
| Events | READY | Event foundation | None; shared mutation/error contract active | Event foundation contract |
| Plans | READY | Plan graph foundation | Task/Event adapters are a later precondition | Graph foundation contract |
| Presets/Drafts | READY_WITH_PRECONDITION | Contract preparation | Stable template schemas from Tasks/Events/Plans | Draft/base prompt |
| Reliability | READY_WITH_PRECONDITION | Contract preparation | Common operation descriptor and domain conflict policies | Foundation prompt |
| QA | READY | Test matrix and independent audit | First lane handoff for execution | Tasks/Events audit |

---

## 5. Merge queue

A lane enters the merge queue only after:

```text
[ ] implementation report complete
[ ] independent audit PASS
[ ] lane commit created
[ ] worktree clean
[ ] base and dependency commits recorded
[ ] Integration Requests updated
[ ] migration ledger updated
[ ] no remote deploy
```

Merge order is decided by Integration based on dependencies, not completion time alone.

---

## 6. Conflict protocol

When cherry-pick/merge conflicts occur:

1. stop;
2. record conflicting files;
3. identify file owner;
4. do not auto-accept “ours” or “theirs” globally;
5. resolve against Shared Contracts and Functional Freeze;
6. run directed tests;
7. update Integration Request;
8. run integration gate.

---

## 7. Current immediate actions

While M11.1B runs:

```text
1. prepare these coordination documents
2. do not manipulate branches/worktrees yet
3. prepare Integration Coordinator prompt
4. prepare Events prompt after shared-contract verification
5. prepare Plans graph prompt
6. prepare QA audit templates
```

After M11.1B returns:

```text
1. verify whether Phase 1/2 branch creation succeeded
2. record M11_1A_BASE_COMMIT
3. inspect M11.1B worktree status
4. activate Integration
5. create remaining worktrees
6. open Events and Plans first
```
