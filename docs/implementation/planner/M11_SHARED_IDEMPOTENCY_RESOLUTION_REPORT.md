# Planner V1 - M11 Shared Idempotency Resolution Report

**Milestone:** M11.INT-01 - Shared Idempotency and Mutation Authority Resolution
**Date:** 2026-07-22
**Mode:** Defensive technical diagnosis and contract resolution
**Implementation status:** Not implemented by this milestone
**Authority:** Functional Freeze, then approved Shared Contracts, then observed implementation/audit evidence

## 1. Preflight and Git state

```text
branch: planner-v1-integration
HEAD: 26e29f9684aaaea032b2ce051ac6d297081ceb8e
expected HEAD: 26e29f9684aaaea032b2ce051ac6d297081ceb8e
common domain base: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
merge/rebase/cherry-pick: none
initial Integration status:
  ?? docs/implementation/planner/PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md
```

The initial untracked file is an Integration-owned activation report. It was
read as existing coordination evidence and preserved. No production code,
domain migration, test, Functional Freeze, branch, ref, or other worktree was
modified. No reset, stash, force operation, rebase, cherry-pick, commit, push,
merge, deploy, or remote Supabase access occurred.

## 2. Evidence read

Read completely:

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`;
- `PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`;
- `PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md`;
- `PLANNER_V1_MIGRATION_LEDGER.md`;
- `PLANNER_V1_INTEGRATION_QUEUE.md`;
- `PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md`;
- Tasks `M11_1B_R1_CORRECTION_REPORT.md` and
  `M11_1B_R1_FINAL_AUDIT.md`;
- Events `M11_2A_EVENT_FOUNDATION_AUDIT.md` and
  `M11_2A_R1_CORRECTION_REPORT.md`.

Read-only implementation inspection covered the shared mutation and
idempotency helpers, Planner context, the original idempotency migration, Task
controllers/services/routes/RPCs/tests, Event V0/V1 controllers/services,
Event RLS/grants/RPCs/migration/tests, and the `audit_events` authority.

The decisive observed defects are:

1. authenticated callers can reserve and complete a generic idempotency row,
   then replay a forged response with no domain effect or audit;
2. the existing identity requires `household_id` and `actor_member_id`, so a
   personal operation cannot exist without a fake household/member;
3. first-reservation `SELECT` followed by `INSERT` races into raw `23505`;
4. reservation, domain mutation, audit, and response completion are separate
   transactions, permitting stranded `in_flight` rows and lost completion;
5. direct Event and legacy mutation paths can bypass version, capability,
   idempotency, and exactly-once audit controls;
6. Tasks and Events attempted different recovery mechanisms, including an
   audit-ledger replay path, which would create divergent shared authorities.

## 3. Consolidated root cause

The root cause is a split authority boundary. The current generic reservation
RPC is both client-callable and independent from the domain transaction. It
cannot prove that a stored response came from an authorized domain effect, and
its household/member-only key shape confuses operation identity with household
authorization.

The canonical correction is one operation-specific, authenticated mutation RPC
per public mutation. That RPC must derive actor and scope, validate authority,
atomically arbitrate the idempotency key through Integration-owned private SQL
helpers, apply the domain effect, append audit, and persist the replay result in
one database transaction. `audit_events` remains audit evidence; it is not an
idempotency store.

## 4. Canonical actor and scope model

### Authenticated actor

The canonical actor binding is:

```text
actor_account_id = auth.uid()
actor_person_id  = public.current_person_id()
```

Both values are stored. `actor_person_id` is the durable idempotency owner;
`actor_account_id` proves the current authenticated binding. A client-supplied
account, person, member, or owner ID is never authority.

### Personal scope

```text
scope_type = personal
scope_id   = actor_person_id
owner_person_id = actor_person_id
household_id = null
actor_membership_id = null
```

Personal create/edit requires an authenticated person and ownership. It must
not consult active household selection, household membership, or a household
capability. Any future account-level personal capability is additive and must
not be implemented by borrowing household authority.

### Household scope

```text
scope_type = household
scope_id   = target household_id
actor_membership_id = public.current_household_member_id(scope_id)
```

The RPC requires a current active membership, `planner.view`, and the exact
operation capability for the target household. Membership is current
authorization and audit attribution; it is not part of the durable
idempotency identity because memberships can be replaced.

## 5. Canonical idempotency identity

Every row binds these dimensions:

| Dimension | Contract |
|---|---|
| Scope | `scope_type` plus `scope_id`; personal uses the actor person, household uses the household |
| Actor | validated `actor_account_id` plus durable `actor_person_id` |
| Operation | stable specific operation name, for example `planner.events.v1.create`; operation class is also recorded |
| Idempotency key | normalized `Idempotency-Key`, 1-128 safe characters |
| Mutation ID | normalized `X-Mutation-Id`, stable across every retry |
| Payload hash | SHA-256 of canonical operation, scope, target IDs, normalized payload, and expected version |

The uniqueness identity is:

```text
(actor_person_id, scope_type, scope_id, operation, idempotency_key)
```

The row must also bind one `mutation_id`. Reusing the same key with another
mutation ID, or the same mutation ID with another key/operation/payload, is
`409 idempotency_conflict`. The payload hash is compared, not trusted: the
operation RPC recomputes it from its canonical arguments. JavaScript and SQL
canonicalization require parity tests.

Personal and household operations therefore share one mechanism without
inventing a household for personal data.

## 6. Reservation state machine

Canonical persisted states are:

```text
in_flight       short lease; normally transaction-local in the V2 path
completed       stable 2xx result, including noop
failed_stable   supported deterministic 4xx/412 result
abandoned       expired legacy/incomplete lease with no confirmed effect
```

Transitions:

| Situation | Required transition/result |
|---|---|
| First reservation | authorized RPC inserts `in_flight` with server-generated lease token |
| Same key/payload during execution | contender waits on the unique row; after winner commits it replays; a bounded wait may return `idempotency_in_flight` with `Retry-After` |
| Same key/payload after completion | return stored status/body as `replay`; no mutation/audit |
| Same key/different payload or mutation binding | `409 idempotency_conflict`; never replace the row |
| Abandoned in-flight | after lease expiry, reconcile a durable effect or atomically claim a new lease |
| Failed business operation | persist only an allowlisted safe deterministic result as `failed_stable` |
| Stable 4xx/412 | store safe envelope and one failed audit after authority; replay it |
| Internal 5xx | never persist as stable; rollback domain/audit/completion and permit retry |
| Lost HTTP response after DB success | row, domain effect, and audit are already committed; retry replays |
| Completion persistence failure | same transaction rolls back domain effect and audit; retry may execute |
| Retry after timeout | same identity follows replay, bounded in-flight, or lease recovery rules |

No new V2 operation may commit an `in_flight` row independently from the
operation transaction. Lease recovery exists for rollout/legacy uncertainty,
not as the normal completion design.

## 7. Concurrent reservation decision

The private reservation helper must use an atomic insert/arbitration pattern,
not `SELECT` then `INSERT`:

```text
INSERT ... ON CONFLICT DO NOTHING
then SELECT ... FOR UPDATE
```

The unique identity above serializes contenders. A contender waits for the
winning transaction; if the winner commits, it observes `completed` or
`failed_stable`; if the winner rolls back, it becomes the reserver. Raw
SQLSTATE `23505` is never a public outcome. Bounded lock/statement timeouts map
only to safe `409 idempotency_in_flight` plus `Retry-After`, never an incorrect
500.

## 8. Recovery and poisoning protection

Ordering for a new request is mandatory:

```text
transport/header syntax
-> auth.uid/current_person_id
-> canonical scope and target visibility
-> payload shape/UUID validation
-> planner.view and exact action authority
-> atomic idempotency arbitration/replay
-> expected-version check
-> lifecycle/business checks
-> noop decision
-> mutation + audit + completion
```

Replay revalidates current authentication, target visibility, and operation
authority before returning stored data. It does not reapply expected-version
or business transitions.

Consequences:

- an invalid or unauthorized request never reserves a key;
- a client cannot call a generic completion RPC or write the idempotency table;
- a client cannot permanently occupy a key: new leases are short and
  server-owned, and expired rows are reconciled or reclaimed;
- payload mismatch never changes or extends the existing reservation;
- noop is considered only after authority and expected-version checks;
- stable post-authorization business failures are replayable;
- an internal failure is retryable and never becomes a cached 500.

For pre-V2 committed `in_flight` rows, the rollout migration sets a bounded
lease. Recovery first checks domain-specific durable mutation/audit evidence.
If one effect is proven, it reconstructs and completes the canonical response;
if no effect is proven after expiry, it marks `abandoned` and permits one new
lease. Ambiguous evidence fails closed for manual/Integration review; it does
not rerun blindly.

## 9. Stable failure and lost-response policy

Persistable failures are an explicit allowlist of deterministic,
post-authorization domain outcomes, including canonical version conflict,
invalid transition, and stable ownership/business conflicts. Missing/invalid
transport fields, malformed UUID/payload, unauthenticated, forbidden,
not-visible, rate-limit, timeout, dependency, and internal errors are not
persisted in the idempotency table.

The operation RPC returns typed outcomes rather than raising for a persistable
business failure so it can append a `result=failed` audit and store the safe
response in the same transaction. Unexpected SQL exceptions roll back.

## 10. V0 compatibility strategy

V0 HTTP routes and DTOs remain unchanged. Their internal mutation services do
not remain direct-table writers.

Delivery sequence:

1. add the V2 shared schema/private helpers and personal audit scope
   additively; keep legacy surfaces temporarily;
2. add operation-specific atomic RPCs for every live V0 and V1 Task/Event
   create/edit/lifecycle/participant/fulfillment mutation;
3. switch V0 services behind their existing controllers/routes to those RPCs;
4. prove V0 response, status, capability, version, idempotency, audit, and
   recurrence compatibility;
5. revoke authenticated direct INSERT/UPDATE/DELETE and generic
   reserve/complete access;
6. retain old columns/signatures only as a measured compatibility bridge, then
   retire them in a later approved milestone.

The lockdown migration must not run before the backend bridge is deployed and
verified. Conversely, Tasks/Events are not integration-ready while the unsafe
compatibility window remains open.

## 11. Direct mutation, RLS, RPC, grant, and search-path strategy

Final public database surface:

- authenticated users may SELECT only rows allowed by personal/household RLS;
- authenticated users may EXECUTE operation-specific mutation RPCs;
- authenticated users may not INSERT/UPDATE/DELETE canonical Task/Event,
  participant, recurrence, fulfillment, audit, or idempotency tables directly;
- `reserve_planner_idempotency_key` and
  `complete_planner_idempotency_key` lose PUBLIC/anon/authenticated EXECUTE;
- private V2 helpers lose PUBLIC/anon/authenticated EXECUTE and are callable
  only from reviewed SECURITY DEFINER operation RPCs;
- service-role table rights remain maintenance-only, not the ordinary HTTP
  mutation path.

Every SECURITY DEFINER function uses fixed `search_path = pg_catalog, public`,
schema-qualifies sensitive functions, derives actor identity, validates
payload/scope, and locks the canonical aggregate before version/noop/mutation.
Direct RPC invocation is supported only because the RPC itself enforces the
complete contract; backend checks are defense in depth.

## 12. Audit exactly-once semantics

`audit_events` remains append-only evidence and never serves as the replay
store.

| Outcome | Audit rule |
|---|---|
| Effective mutation | exactly one `result=succeeded` row in the mutation transaction |
| Replay | zero additional rows |
| Noop | zero effective-operation rows; idempotency result records noop |
| Stable failed operation | exactly one `result=failed` row after authorization; never projected as Activity |
| Recovered lost response | zero additional rows; replay the original audit-linked result |
| Concurrent retry | loser adds zero rows |

Personal audit requires additive shared schema support:

```text
household_id = null
actor_membership_id = null
actor_person_id = current_person_id()
scope_type = personal
scope_id = actor_person_id
```

Household audit records household, current membership, person, and account.
Failed authorization may go to security telemetry, not a poisoned
idempotency/audit operation row. Activity continues to consume only successful
human-level events.

## 13. Canonical error contract

All public errors use:

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

Canonical shared codes for this boundary:

| HTTP | Code | Meaning |
|---:|---|---|
| 409 | `idempotency_conflict` | same identity reused with another payload/mutation binding |
| 409 | `idempotency_in_flight` | bounded concurrent/legacy lease still active |
| 412 | `version_conflict_v2` | safe `{ current, expected }` only |
| 422 | `mutation_id_required` | missing mutation ID |
| 422 | `idempotency_key_required` | missing key |
| 422 | `expected_version_required` | missing version for an existing entity |
| 400 | `invalid_expected_version` | malformed version |
| 500 | `internal_error` | fixed `Error interno.`, no details |

`idempotency_key_conflict` and public `version_conflict` are deprecated
synonyms. Bridge mappers may recognize them internally, but all new public
responses and tests use `idempotency_conflict` and `version_conflict_v2`. Raw
SQLSTATE, constraint names, SQL messages, hints, stack traces, and internal
diagnostics never reach clients.

## 14. File ownership map

### Integration-owned

```text
backend/src/lib/plannerIdempotencyAdapter.js
backend/src/lib/mutationContracts.js
backend/src/lib/plannerMutationContracts.js
backend/src/lib/httpErrors.js
backend/src/services/planner.context.service.js (shared context composition)
backend/src/routes/planner.js
shared idempotency/audit migration(s) in Integration range
shared helper and error contract tests
global integration/concurrency/security tests
the four coordination documents updated by this resolution
```

### Tasks-owned

Task controllers/services/frontend DTOs, Task operation RPCs in the Tasks
range, and Task behavioral/concurrency tests. Tasks must remove its local
shared-adapter delta from the handoff and consume the single Integration
implementation. `IR-TASK-ROUTE-001` remains an Integration route handoff.

### Events-owned

Event V0/V1 controllers/services/frontend DTOs, Event operation RPCs and V0
bridge logic in the Events range, plus Event behavioral/concurrency tests.
Events must not add a competing audit-backed replay mechanism.
`IR-EVENT-ROUTE-001` remains an Integration route handoff.

No temporary production-file ownership transfer is required. Cross-domain
audit/idempotency schema changes remain Integration-owned.

## 15. Migration strategy and reservation

Reserve Integration subrange `20260722090000-20260722090019`:

```text
20260722090000  shared mutation authority foundation
20260722090010  shared mutation authority lockdown (deploy only after bridge gate)
```

Foundation migration, additive:

- extend `planner_idempotency_keys` with actor account/person, scope type/id,
  mutation ID, explicit state, lease token/expiry, and completion metadata;
- backfill existing rows as household scope without rewriting immutable
  historical migrations;
- add the V2 unique identities and private atomic helpers;
- extend `audit_events` with nullable household support, actor person, and
  explicit scope checks/indexes;
- preserve old columns/signatures until consumption moves.

Lockdown migration, staged:

- revoke old generic RPC and direct table mutation grants;
- remove permissive mutation policies that no longer have grants;
- retain SELECT RLS and operation-specific RPC EXECUTE;
- verify no backend call site still uses the old mutation authority.

Tasks and Events own their operation-specific RPC changes in their existing
reserved ranges and declare a dependency on `20260722090000`. Clean reset,
backfill counts, grant catalog, and rollback concepts are mandatory before
`20260722090010` is eligible.

## 16. Integration Request decisions

| Request | Decision/status |
|---|---|
| `IR-SHARED-IDEMP-003` | New P0 parent; `CONTRACT_READY`; owns V2 actor/scope identity, atomic reservation, recovery, audit scope, lockdown, and global matrix |
| `IR-TASK-IDEMP-001` | `SUPERSEDED` as a separate solution; linked to parent; Tasks consumes Integration helper and keeps Task RPC changes |
| `IR-EVENT-PERSONAL-IDEMP-001` | `SUPERSEDED` by parent personal scope model |
| `IR-EVENT-V0-MUTATION-001` | `CONTRACT_READY` child; exact staged V0 bridge/lockdown defined |
| `IR-EVENT-IDEMP-RECOVERY-001` | `SUPERSEDED` by parent atomic concurrency/recovery model |
| `IR-EVENT-PERSONAL-AUDIT-001` | `SUPERSEDED` by parent personal audit schema |
| `IR-TASK-ROUTE-001` | remains `OPEN`; integrate only after shared correction and independent Task PASS |
| `IR-EVENT-ROUTE-001` | `OPEN`; register only after Event correction and independent PASS |

`CONTRACT_READY` means the decision, affected surfaces, compatibility impact,
and tests are concrete. It does not mean implementation or lane integration is
complete.

## 17. Complete behavioral test matrix

Every DB suite uses isolated fixtures, `finally` cleanup, explicit cleanup
assertions, and a deliberate cleanup-failure path. Regex/source checks are
smoke evidence only.

| # | Class | Behavioral test and required result |
|---:|---|---|
| 1 | SHARED / CONCURRENCY | Two simultaneous first reservations, same key/payload: one effect/audit; other waits then replays; no `23505`/500 |
| 2 | SHARED / CONCURRENCY | Simultaneous same key, different payload: one accepted; loser gets safe `idempotency_conflict`; no second effect |
| 3 | FAST / SHARED | Retry after success returns stored status/body and `outcome=replay`; versions/audit/children unchanged |
| 4 | SHARED / FAILURE-PATH | Supported deterministic 4xx/412 is stored once and replayed exactly; one failed audit where applicable |
| 5 | INTEGRATION / FAILURE-PATH | Drop HTTP response after committed mutation; retry replays the committed effect and original audit |
| 6 | SHARED / FAILURE-PATH | Inject completion persistence failure; whole mutation/audit transaction rolls back; retry safely executes once |
| 7 | SHARED / FAILURE-PATH | Seed expired legacy `in_flight`: reconcile proven effect or reclaim no-effect lease; ambiguous evidence fails closed |
| 8 | SECURITY / SHARED | Authenticated client attempts reserve/complete/table write/forged body: denied; cannot create replay or permanent key occupation |
| 9 | EVENTS / SECURITY | Personal create/edit with authenticated person and no household/membership succeeds privately and audits person scope |
| 10 | TASKS+EVENTS / SECURITY | Household mutation with inactive/wrong membership is denied before reservation; zero effect/key/audit |
| 11 | SECURITY / SHARED | Direct operation-specific RPC enforces actor, payload hash, capability, version, idempotency, and audit exactly as backend |
| 12 | SECURITY / INTEGRATION | Direct table INSERT/UPDATE/DELETE as authenticated is denied for canonical mutation tables |
| 13 | TASKS+EVENTS / INTEGRATION | Every V0 create/edit/lifecycle route keeps HTTP/DTO behavior while using atomic RPCs; recurrence compatibility remains valid |
| 14 | TASKS+EVENTS / SECURITY | Capability denial occurs before reservation; zero noop/replay/effect/audit |
| 15 | TASKS+EVENTS / SHARED | Authorized stale version stores/replays `412 version_conflict_v2`; no mutation; one failed audit |
| 16 | TASKS+EVENTS / SHARED | Equivalent request with current version returns/stores noop only after capability/version; zero effective audit |
| 17 | SHARED / INTEGRATION | Effective mutation has one success audit; replay/noop/concurrent retry add zero; stable failure has one failed audit |
| 18 | TASKS+EVENTS / CONCURRENCY | Retried/concurrent recurrence, fulfillment, participant operations create no duplicate next occurrence/fulfillment/participant |
| 19 | FAST / SECURITY | All failures use safe envelope/canonical codes; fuzzed SQLSTATE/constraint/message/stack never appears publicly |
| 20 | FAILURE-PATH / INTEGRATION | Normal and deliberately failing runners remove users, people, memberships, entities, audits, idempotency rows and leases; zero fixtures verified |

Gate grouping:

```text
FAST: 3, 19 plus syntax/canonical-hash parity
SHARED: 1-8, 11, 15-17, 19
TASKS: 10, 13-18 for Task operations
EVENTS: 9-18 for Event/participant/recurrence operations
INTEGRATION: 5, 12, 13, 17, 20 and full route/grant catalog
FAILURE-PATH: 4-7, 20
CONCURRENCY: 1, 2, 18
SECURITY: 8-12, 14, 19
```

## 18. Delivery sequence

1. Integration implements and audits `20260722090000`, shared private helpers,
   canonical adapter/error/context changes, and SHARED tests.
2. Tasks rebases no branch and copies no helper; it consumes the Integration
   commit by the approved integration mechanism, updates Task RPCs to the atomic
   contract, removes the local adapter ownership violation, and reruns its full
   audit.
3. Events consumes the same Integration commit, enables real personal scope,
   converts V0/V1 mutation paths, removes the household audit anchor and any
   competing replay logic, then completes its matrix and independent audit.
4. Integration owns both route registrations and runs combined V0/V1/security
   tests.
5. Only after call-site and DB catalog proof, Integration applies the lockdown
   change represented by `20260722090010` and reruns the complete matrix.
6. QA independently verifies clean reconstruction, concurrency, failure paths,
   cleanup, grants, RLS, and no raw errors before any commit/merge/deploy gate.

## 19. Risks and unresolved questions

Contract blockers are resolved. Implementation risks remain:

- operation-specific RPC conversion is broad and must not create a partial V0
  lockdown;
- canonical JSON parity between JavaScript and PostgreSQL needs executable
  vectors;
- old `in_flight` rows can be ambiguous and require fail-closed reporting;
- nullable household audit changes affect shared indexes/helpers/outbox callers
  and need a repository-wide compatibility scan;
- lock/statement timeout tuning needs behavioral concurrency evidence;
- remote schema/history/data drift is unknown and must be inspected only in a
  separately authorized rollout milestone.

No unresolved product decision prevents implementation. Numeric lease duration
and retention may be selected during implementation only within these bounds:
lease must be short and renewable only by the owning transaction/token;
completed retention must cover the supported offline retry window; neither may
weaken the state transitions above.

## 20. Exact next implementation prompt boundaries

### Integration implementation prompt

Allowed: shared helper/schema foundation, personal audit scope, common
adapter/context/error files, shared tests, and coordination documents. Required:
atomic helper, private grants, canonical identities, hash parity, legacy-row
recovery, clean reset, and SHARED matrix. Forbidden: domain behavior rewrite,
route integration, lockdown before bridge proof, commit/push/deploy/remote.

### Tasks consumption prompt

Allowed: Tasks-owned controllers/services/RPC migration/tests and handoff
report. Required: consume Integration helper, remove local shared-helper delta,
atomic Task mutation/audit/completion, full Task/V0/concurrency audit. Forbidden:
shared helper/routes/Events files, competing copy, commit before independent
PASS.

### Events consumption prompt

Allowed: Events-owned V0/V1 controllers/services/RPC migration/tests and
reports. Required: real person-only scope, V0 bridge, direct-write removal
readiness, atomic Event/participant/recurrence paths, full Event matrix.
Forbidden: fake household, audit-backed replay store, shared helper/router,
commit before independent PASS.

### Integration lockdown/route prompt

Allowed only after both domain PASS results: Integration route registry,
lockdown migration, global tests, queue/ledger updates. Required: call-site and
catalog proof, V0 compatibility, direct-table denial, old generic RPC denial,
cleanup. Forbidden: deploy, remote access, or claiming M11 implementation
complete without QA and human gates.

## 21. Supabase state

```text
lock path: C:\Users\thega\Desktop\HomePlus-worktrees\.planner-supabase-lock.json
observed state: FREE
reserved by this milestone: NO
local reset/query/mutation: NO
remote accessed: NO
remote state: UNKNOWN / NOT INSPECTED
```

## 22. Git status and diff summary

Final status after validation:

```text
 M docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md
 M docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md
 M docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md
 M docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md
?? docs/implementation/planner/M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md
?? docs/implementation/planner/PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md
```

The activation report was pre-existing and remains unmodified. The final
tracked coordination diff is four files, 275 insertions and 32 deletions; this
new report is untracked and therefore is not included in `git diff --stat`.
`git diff --check` exits 0. No production code, migration, or test changed.

## 23. Verdict meaning

The shared contract is concrete enough to implement without allowing Tasks and
Events to create competing helpers. This verdict approves the resolution
contract only. It does not approve either domain implementation, the lockdown
migration, a commit, integration, or deployment.

## 24. Terminal verdict

```text
M11_SHARED_IDEMPOTENCY_CONTRACT_READY
```
