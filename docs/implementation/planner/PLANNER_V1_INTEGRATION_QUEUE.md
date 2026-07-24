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
| Status | SUPERSEDED by `IR-SHARED-IDEMP-003` |
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
| Status | CONTRACT_READY |
| Need | Record exact API error shape and shared codes from current backend |
| Blocks | Public API prompts for Events/Plans |
| Acceptance | No duplicate error formats |

### IR-SHARED-IDEMP-003 — Canonical Planner idempotency, reservation recovery and mutation authority

| Field | Value |
|---|---|
| Requester | Tasks + Events + Integration |
| Owner | Integration |
| Integrator | Integration |
| Priority | P0 |
| Status | R2C CORRECTION COMPLETE / READY FOR FRESH INDEPENDENT QA REAUDIT / DOMAIN CONSUMPTION BLOCKED |
| Problem | Generic authenticated reserve/complete permits forged replay; household/member-only identity blocks personal scope; concurrent first reserve leaks `23505`; split reservation/mutation/audit/completion strands state; direct writes bypass the contract |
| Required contract | Operation-specific authenticated RPC derives actor/scope and atomically reserves, mutates, audits, and completes through private shared helpers; personal identity is person-scoped; audit is not replay storage |
| Files/surfaces | Shared idempotency/mutation/error/context helpers; `planner_idempotency_keys`; `audit_events`; Task/Event operation RPC consumers; Planner router; global tests |
| Migration impact | Integration `20260722090000` additive foundation and gated `20260722090010` lockdown; domain RPC changes stay in domain ranges |
| API/DTO impact | Headers and V0 public routes/DTOs stay stable; canonical errors become `idempotency_conflict` and `version_conflict_v2` |
| Capability impact | Personal owner authority is independent of household; household requires active member + `planner.view` + action capability; authority precedes reservation |
| Compatibility impact | V0 internals move to atomic RPCs before direct writes/old generic RPCs are revoked; no silent V0 break |
| Tests required | Complete 20-case FAST/SHARED/TASKS/EVENTS/INTEGRATION/FAILURE-PATH/CONCURRENCY/SECURITY matrix in `M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md` |
| Blocks | Task R1 PASS/commit; Event R1 completion/PASS; route integration; mutation-authority lockdown |
| Does not block | Read-only/domain modeling work that does not create a competing mutation mechanism |
| Target base | Integration `26e29f9684aaaea032b2ce051ac6d297081ceb8e`; domain base `fb4efc81b1debf5932580ef2e16cedf4afb6bb45` |
| Decision | Phase 2 shared foundation candidate preserved after R2 scope drift; R2C array-object hash correction complete; awaiting fresh independent QA before any domain consumption |
| Phase 2 deliverables | `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql`; `backend/src/lib/plannerIdempotencyAdapter.js` (V2 frontier: `hashIdempotencyRequestV2`, `invokeAtomicPlannerMutationV2`, `callV2ReserveRpc`, `callV2CompleteRpc`, `mapV2RpcError`, `V2IdempotencyOutcome`; no `withIdempotencyV2` export); `backend/src/lib/mutationContracts.js` (`CANONICAL_ERROR_CODES`, `normalizeErrorCode`, conflict/in-flight factories); `backend/src/lib/plannerMutationContracts.js` (`V2_CANONICAL_ERROR_CODES` re-export); `backend/src/services/planner.context.service.js` (`getPersonalScopeContext`, `getHouseholdScopeContext`); `scripts/planner_m11_int_01_shared_{contract,database,test_runner}.js` |
| Phase 2 R2C validation | Contract: 95 assertions, exit 0; database suite: 325 assertions, exit 0; QA R2B probe all via read-only wrapper: 271 assertions, exit 0; QA R2B zero via read-only wrapper: 6 assertions, exit 0; cleanup sensitivity demonstrated; runner exit 0; `supabase migration list`: `20260722090000` applied exactly once, `20260722090010` absent; `supabase db lint --level error`: exit 0; no independent QA PASS implied |

### IR-TASK-IDEMP-001 — Consume canonical shared idempotency in Tasks

| Field | Value |
|---|---|
| Requester | Tasks |
| Owner | Integration parent + Tasks consumer |
| Priority | P0 |
| Status | SUPERSEDED by `IR-SHARED-IDEMP-003` as a separate solution |
| Decision | Do not integrate the Tasks-local shared adapter delta as canonical; Integration implements one helper and Tasks retains only Task RPC/controller/service consumption |
| Affected files | Integration shared helper files; Tasks-owned operation RPC/controller/service/tests |
| Compatibility | Task V0 routes/DTOs remain; all Task mutations move to the atomic boundary before lockdown |
| Tests | Task V0/V1 replay, poisoning, 4xx/412, lost response, completion rollback, concurrency, audit, direct-write denial |

### IR-EVENT-PERSONAL-IDEMP-001 — Person-scoped Event idempotency

| Field | Value |
|---|---|
| Requester | Events |
| Owner | Integration parent + Events consumer |
| Priority | P0 |
| Status | SUPERSEDED by `IR-SHARED-IDEMP-003` |
| Decision | Personal identity uses authenticated account/person and `scope_id=person_id`; no household/member/audit anchor |
| Affected files | Shared schema/helpers/audit scope plus Event V1 context/controller/RPC/tests |
| Compatibility | Personal reads stay person-owned; personal mutations become available only after atomic shared consumption passes |
| Tests | Personal create/edit with no household, cross-person denial, replay, audit, cleanup |

### IR-EVENT-V0-MUTATION-001 — Bridge V0 Event mutation authority

| Field | Value |
|---|---|
| Requester | Events |
| Owner | Events + Integration lockdown |
| Priority | P0 |
| Status | CONTRACT_READY |
| Decision | Keep V0 HTTP routes/DTOs, replace direct table writes with operation-specific atomic RPCs, then revoke authenticated Event INSERT/UPDATE/DELETE in the gated lockdown |
| Affected files | Event V0 controller/service and Events-range RPC migration; Integration lockdown migration |
| Compatibility | No route/DTO removal; recurrence and lifecycle bridges must pass before revocation |
| Tests | Every V0 create/edit/cancel/reactivate/trash/restore/override path; version/idempotency/audit; direct table denial after lockdown |

### IR-EVENT-IDEMP-RECOVERY-001 — Concurrent reservation and recovery

| Field | Value |
|---|---|
| Requester | Events |
| Owner | Integration |
| Priority | P0 |
| Status | SUPERSEDED by `IR-SHARED-IDEMP-003` |
| Decision | Atomic `INSERT ... ON CONFLICT DO NOTHING` plus locked arbitration inside the operation transaction; short legacy lease; reconcile effect or reclaim; ambiguous state fails closed |
| Affected files | Shared SQL helper/schema, adapter/outcome mapper, global concurrency/failure tests |
| Compatibility | Raw `23505` disappears; stable 4xx/412 replay; 5xx never cached |
| Tests | Simultaneous same/different payload, abandoned lease, lost response, completion rollback, timeout retry |

### IR-EVENT-PERSONAL-AUDIT-001 — Personal audit authority

| Field | Value |
|---|---|
| Requester | Events |
| Owner | Integration |
| Priority | P0 |
| Status | SUPERSEDED by `IR-SHARED-IDEMP-003` |
| Decision | Add actor person and scope columns; personal audit has null household/member and never produces household Activity |
| Affected files | Integration shared audit migration/helpers/registry; Event personal operation RPC/tests |
| Compatibility | Existing household audit rows are backfilled as household scope; append-only history is not rewritten |
| Tests | Personal audit exactly once, no household Activity, cross-person isolation, replay/noop/failed behavior |

### IR-TASK-001 — Publish M11.1B Task V1 contract

| Field | Value |
|---|---|
| Requester | Integration |
| Owner | Tasks |
| Priority | P1 |
| Status | BLOCKED |
| Need | Independently audit the implemented but uncommitted Task assignment/fulfillment DTO, routes, errors and operations |
| Blocks | Plans Task adapters, Preset Task schema, Attention Task events |
| Does not block | Event domain foundation |
| Acceptance | Audited M11.1B handoff |

M11.INT-01 update: the independent R1 audit failed on shared idempotency
poisoning. Tasks must consume `IR-SHARED-IDEMP-003` and obtain a new
independent PASS before this request can advance.

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

M11.INT-01 decision: remains `OPEN`. Route integration now also waits for
`IR-SHARED-IDEMP-003` implementation and a renewed independent Task PASS. The
shared adapter delta in the Tasks worktree is not part of this route handoff.

### IR-EVENT-ROUTE-001 — Integrate Event V1 routes

| Field | Value |
|---|---|
| Requester | Events |
| Owner | Integration |
| Priority | P1 |
| Status | OPEN |
| Need | Register audited Event V1 read/mutation handlers in the Integration-owned Planner router without changing V0 routes |
| Files/surfaces | `backend/src/routes/planner.js` and directed route tests |
| Compatibility impact | V0 Event routes remain unchanged; V1 routes are additive |
| Blocks | Event V1 public HTTP handoff, not Events-owned correction work |
| Acceptance | `IR-SHARED-IDEMP-003` consumed; Event independent audit PASS; V0/V1 route, auth, error, and idempotency tests pass |
| Decision | Do not register current blocked Event handlers yet |

### IR-EVENT-001 — Event domain contract

| Field | Value |
|---|---|
| Requester | Integration |
| Owner | Events |
| Priority | P1 |
| Status | BLOCKED |
| Need | Lifecycle, participant, RSVP, attendance, location and recurrence DTO/API |
| Blocks | Plan final Event adapter, Event Presets, combined Calendar |
| Acceptance | Event foundation audit PASS |

M11.INT-01 update: Event R1 remains blocked on the shared parent, V0 mutation
bridge, personal authority, and the complete behavioral matrix.

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
| Tasks | BLOCKED | M11.1B R1 implemented; independent audit FAIL | Shared idempotency poisoning plus shared route handoff | Consume `IR-SHARED-IDEMP-003`, correct, and reaudit |
| Integration | ACTIVE | M11.INT-01 Phase 2 R2C correction complete | Awaiting fresh independent QA PASS | Preserve foundation; no domain consumption, routes or lockdown until QA |
| Events | BLOCKED | M11.2A R1 domain corrections partial | Personal authority, V0 direct mutations, shared recovery, incomplete matrix | Consume shared foundation, finish correction, and reaudit |
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

```text
1. ✅ Phase 2 foundation audited and implemented (IR-SHARED-IDEMP-003 P2)
2. Tasks and Events consume the approvedIntegration `planner_v2_*` helpers
3. have Tasks and Events consume the same approved Integration helper
4. complete domain V0/V1 behavioral and concurrency matrices
5. obtain independent PASS for Tasks and Events
6. integrate shared routes only after those passes
7. apply the gated lockdown only after call-site, V0, grant and RLS proof
8. do not commit, merge, deploy or access remote Supabase as part of this resolution phase
```
