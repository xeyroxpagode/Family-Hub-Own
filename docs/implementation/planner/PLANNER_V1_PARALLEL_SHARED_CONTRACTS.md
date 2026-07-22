# Planner V1 — Parallel Shared Contracts

**Project:** HomePlus
**Module:** Planner V1
**Purpose:** Technical coordination contract for parallel implementation
**Product authority:** `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
**Status:** ACTIVE — activated 2026-07-22 after exact common-base and repository-contract verification
**Does not redefine product:** This document only freezes shared technical conventions.

---

## 1. Authority and precedence

When documents differ, use this order:

1. `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`
2. approved change request that updates the freeze
3. this Shared Contracts document
4. lane-specific implementation contract
5. implementation report
6. proposals, research and historical documents

A lane may not reinterpret the functional freeze because of a local technical limitation.

---

## 2. Common Git baseline

All parallel branches originate from the same approved commit:

```text
M11_1A_BASE_COMMIT = fb4efc81b1debf5932580ef2e16cedf4afb6bb45
```

Verified activation references (2026-07-22):

```text
v1                         fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-integration     fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-tasks-m11-1b    fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-events          fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-plans           fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-presets-drafts  fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-reliability     fb4efc81b1debf5932580ef2e16cedf4afb6bb45
planner-v1-qa              fb4efc81b1debf5932580ef2e16cedf4afb6bb45
```

Required shared references:

```text
v1
planner-v1-integration
planner-v1-tasks-m11-1b
planner-v1-events
planner-v1-plans
planner-v1-presets-drafts
planner-v1-reliability
planner-v1-qa
```

Before a lane starts, Integration records:

- base commit hash;
- branch name;
- worktree path;
- lane owner;
- activation time;
- allowed migration range.

No lane may silently rebase, reset or move its base.

---

## 3. Canonical entity identity

Every entity has one stable identity across all projections.

```text
Task
Event
Plan
Milestone
Measurement
Preset
Draft
Recurrence Series
Activity Entry
```

Rules:

- one Task or Event may have at most one controlling Plan;
- a Task under a Milestone must belong to the same Plan;
- a final Event must belong to the same Plan;
- list, Calendar, Home, Detail, widgets and search show projections of the same entity;
- lanes must not create duplicate domain entities for presentation convenience.

Canonical IDs use the repository's existing UUID convention.

---

## 4. Scope and ownership model

Every Planner entity declares an explicit scope:

```text
personal
household
```

Common fields or equivalent canonical representation:

```text
owner_person_id       // personal scope
household_id          // household scope
created_by_person_id
created_by_member_id  // when a household actor exists
```

Rules:

- personal entities remain independent of the active household;
- household entities belong to exactly one household;
- authenticated actor identity is always derived from auth context;
- actor IDs supplied by clients are never authority;
- Tasks personales remain unsupported until their approved submilestone and must be rejected consistently, not emulated as household Tasks.

---

## 5. Version and concurrency envelope

All mutable domain entities use optimistic versioning.

Common mutation requirements:

```text
expectedVersion
operationId
payloadHash
```

Transport conventions:

- `X-Mutation-Id` is the stable operation/correlation ID. Backend parser: `requireMutationId(req)` in `backend/src/lib/mutationContracts.js`; response middleware echoes it;
- `Idempotency-Key` is the canonical idempotency key. Backend parser: `requireIdempotencyKey(req)`; persistence adapter: `hashIdempotencyRequest(...)` + `withIdempotency(...)` in `backend/src/lib/plannerIdempotencyAdapter.js`;
- the canonical request hash covers `method`, `operation`, sorted `params`, sorted `body` and `expected_version`;
- persistence uses `reserve_planner_idempotency_key` and `complete_planner_idempotency_key` over `planner_idempotency_keys`;
- `If-Match` is the canonical expected-version header for existing entities. `parseRequiredExpectedVersion(req)` accepts body field `expected_version` only as the existing compatibility fallback, and the header wins when both are present;
- missing expected version is `422 expected_version_required`; invalid version is `400 invalid_expected_version`; canonical stale detection is `412 version_conflict_v2` with sanitized `details: { current, expected }`;
- idempotency conflicts use the existing stable code `idempotency_key_conflict`; in-flight operations use `idempotency_in_flight`;
- no lane may introduce a second competing operation-ID or idempotency mechanism;
- new mutation-heavy lanes must use `OPERATION_KINDS.CREATE_IDEMPOTENT` or `OPERATION_KINDS.VERSIONED_MUTATION` through the existing mutation-contract helpers.

Results:

```text
same operation + same payload
→ replay / noop with the canonical current result

same operation + different payload
→ idempotency_conflict

stale non-equivalent mutation
→ version_conflict
```

A retry must not duplicate data, audit, recurrence, children or side effects.

---

## 6. Common mutation result

Mutations should return an equivalent structure:

```text
{
  data,
  outcome: "updated" | "created" | "noop" | "replay",
  version,
  operationId
}
```

A lane may extend `data`, but must not redefine the meaning of common outcomes.

---

## 7. Common error envelope

All Planner APIs use `buildApiErrorEnvelope` / `sendApiError` from
`backend/src/lib/httpErrors.js`, with normalization by
`backend/src/middleware/errorEnvelopeMiddleware.js`:

```json
{
  "error": {
    "code": "stable_machine_code",
    "message": "safe public message",
    "request_id": "request correlation or null",
    "details": {}
  }
}
```

`details` is optional and allowed only below 500. Responses at 500+ use the
public message `Error interno.`, omit details and retain diagnostics only in
server logs. `X-Request-Id` is the response correlation header.

Shared stable codes:

```text
forbidden
not_found
version_conflict
idempotency_conflict
invalid_transition
entity_not_operational
wrong_household
member_not_active
validation_error
```

Domain-specific codes may be added, but:

- use stable machine-readable codes;
- do not expose raw SQL errors;
- do not create synonyms for an existing shared code;
- document the owner lane and recovery behavior.

---

## 8. Lifecycle precedence

All lanes must preserve this precedence:

```text
1. Trash
2. own terminal lifecycle
3. inherited Plan state
4. fulfillment/progress
5. normal temporal state
```

A projection may simplify display, but cannot reverse this order.

Trash is recoverable for 30 days. Planner V1 does not expose immediate permanent deletion.

---

## 9. Plan-controller boundary

Plans do not mutate Task/Event tables through ad hoc direct updates.

Shared controller operations must be explicit, versioned, idempotent and atomic.

Required semantic adapters:

```text
linkTaskToPlan(...)
unlinkTaskFromPlan(...)
setTaskInheritedPlanState(...)
linkEventToPlan(...)
unlinkEventFromPlan(...)
setEventInheritedPlanState(...)
```

Exact function/RPC names are owned by Integration after Tasks, Events and Plans publish their contracts.

Rules:

- maximum one controlling Plan;
- Plan Draft children remain contained;
- Plan pause preserves child own state and stops operational behavior;
- Plan complete/close leaves no active child;
- Plan trash/restore operates on the whole structure atomically.

---

## 10. Assignment and fulfillment boundary

Task definition, assignment and fulfillment are separate.

Canonical assignment forms:

```text
anyone + shared_once
members + shared_once
members + each_person
legacy_unassigned + shared_once  // transitional only
```

Canonical fulfillment states:

```text
pending
completed
awaiting_verification
correction_requested
verified
```

Other lanes must consume the Tasks API/DTO. They must not infer fulfillment from legacy `planner_tasks.status` when a canonical V1 projection exists.

---

## 11. Event participation boundary

Event participation keeps two independent concepts:

```text
RSVP
Attendance
```

No lane may merge them into one status.

Events own:

- participants;
- recurrence series;
- location;
- RSVP;
- attendance.

Plans may reference Events but cannot redefine these concepts.

---

## 12. Preset and Draft boundary

Presets are reusable snapshots. Executions remain independent.

Drafts are private by default and operationally isolated.

Cross-lane rules:

- Presets consume published Task/Event/Plan template contracts;
- Presets do not write directly into domain tables;
- compound Plan Preset creation is reviewed and atomic;
- Draft children of a Plan Draft remain visible only inside that Plan;
- no Draft notifies, recurs, appears in Home or counts toward actionable badges.

---

## 13. Audit contract

Human-level confirmed operations use the approved `public.audit_events` table:

```text
occurred_at
household_id
actor_membership_id
actor_account_id
domain
action
aggregate_type
aggregate_id
result
request_id
mutation_id
metadata_version
metadata
```

The approved M11.1A RPCs are
`complete_planner_task_with_audit(...)` and
`verify_planner_task_fulfillment_with_audit(...)`; their current actions are
`task.completed` and `task.verified`. The older `planner_activity_log` remains
a V0 best-effort activity history and is not the exactly-once transactional
audit authority for new confirmed operations.

Rules:

- audits are exactly once per effective operation;
- replay/noop does not duplicate audit;
- autosave and technical synchronization noise are not Activity;
- each lane owns its event names;
- Integration maintains the global event registry.

Action naming convention:

```text
<entity>.<past_tense_action>
```

Compatibility with established M11.1A event names may be preserved and normalized through the registry rather than rewritten silently.

---

## 14. Capabilities contract

Household is the authority for capability overrides.

All effective decisions must align across:

```text
controller
service
SQL helper
RPC
RLS
```

Frontend capability checks are presentation only.

A lane may not add or rename a capability without an Integration Request and an Integration-owned registry update.

Every operational capability also requires `planner.view` unless the canonical contract explicitly says otherwise.

### 14.1 Canonical actor/person/member helpers

Reuse these exact baseline helpers; do not accept client actor IDs as authority:

```text
backend/src/services/planner.context.service.js
  getPlannerContext(req)
  -> accountId, personId, membershipId, householdId, person, membership, household, client

backend/src/lib/householdMembers.service.js
  getAuthenticatedPerson(client, authUserId)
  getActiveMembership(client, personId, householdId)
  requireActiveMembership(client, personId, householdId)

SQL
  auth.uid()
  public.current_person_id()
  public.current_household_member_id(household_id)
```

---

## 15. Time contract

Timed Event:

```text
instant + time zone
```

All-day Event and date-only Task:

```text
semantic local date
```

Rules:

- no UTC day shifting for all-day/date-only values;
- no artificial 23:59 for date-only Tasks;
- recurrence series and instances keep separate identities;
- after-completion Task recurrence generates the next instance exactly once.

---

## 16. Shared API and DTO conventions

Common entity DTO fields:

```text
id
version
scope
lifecycle
createdAt
updatedAt
availableActions
```

Rules:

- DTOs are additive during V1 migration;
- V0 DTOs remain stable until their planned retirement;
- `availableActions` never replaces backend authorization;
- timestamps use the existing repository serialization convention;
- clients never receive data from another household or private personal scope.

---

## 17. Shared integration surfaces

The following are Integration-owned even when a domain contributes data:

```text
Home Planner summary
combined Calendar projection
global navigation
global Quick Actions
global search registry
deep-link registry
attention aggregation
capability registry
cross-domain migrations
```

Domain lanes publish adapters and projections. They do not modify these surfaces directly without an approved Integration Request.

---

## 18. Test contract

Every lane must provide:

- real behavioral tests;
- RLS/security tests where applicable;
- idempotency and concurrency tests for mutations;
- self-contained fixtures;
- cleanup in `finally`;
- verification that cleanup succeeded;
- directed regression tests;
- contract tests for public APIs/DTOs;
- no reliance on regex as sole operational evidence.

Gate levels:

```text
FAST
LANE
INTEGRATION
FINAL
```

A lane report must list the exact commands and assertion counts.

---

## 19. Handoff contract

Every lane handoff includes:

1. base commit;
2. branch and worktree;
3. scope completed;
4. scope excluded;
5. files modified;
6. migrations;
7. APIs and DTOs;
8. shared contracts consumed;
9. new Integration Requests;
10. tests and exact results;
11. known risks;
12. remote state;
13. git status;
14. readiness for audit.

No handoff may use “complete” without this evidence.

---

## 20. Change control

Changing a shared contract requires:

- Integration Request ID;
- reason;
- affected lanes;
- compatibility impact;
- migration/API impact;
- tests;
- Integration approval;
- human approval when product behavior changes;
- updated document version.

A lane may continue on unaffected work while the request is pending.

---

## Activation checklist

This document becomes ACTIVE only after Integration confirms:

```text
[x] M11_1A_BASE_COMMIT recorded
[x] integration branch points to the base
[x] lane branches point to the base
[x] exact idempotency transport recorded
[x] exact shared error envelope recorded
[x] capability registry owner confirmed
[x] migration ranges reserved
[x] ownership matrix approved
[x] integration queue opened
```
