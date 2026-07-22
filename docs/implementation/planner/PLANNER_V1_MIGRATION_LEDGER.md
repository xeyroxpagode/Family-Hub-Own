# Planner V1 — Migration Ledger

**Purpose:** Reserve migration namespaces and prevent parallel collisions.
**Status:** ACTIVE — activated by Integration on 2026-07-22.
**Important:** Numeric ranges are coordination reservations, not wall-clock claims.

---

## 1. Rules

1. Every migration has one owner lane.
2. A lane uses only its reserved range.
3. A committed migration is immutable.
4. A migration not yet committed may be corrected only by its owner while no other lane depends on it.
5. Cross-domain schema changes belong to Integration.
6. No lane deploys to remote Supabase.
7. Every migration must reproduce from a clean local database.
8. Every migration report includes rollback concept and data/backfill risks.
9. Integration serializes all DB resets on the single shared Supabase instance.
10. Before remote rollout: drift, history, data counts, backfill report, backup and staging gate are mandatory.

---

## 2. Baseline

| Migration | Owner | State | Notes |
|---|---|---|---|
| `20260722010000_m11_1a_task_fulfillment_foundation.sql` | Tasks | APPROVED / IMMUTABLE BASELINE | Commit `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`; final independent audit PASS; must not be edited |
| `20260722020000_m11_1b_task_fulfillment_operations.sql` | Tasks | IMPLEMENTED / UNCOMMITTED / AUDIT PENDING | Present only in dirty Tasks worktree; report says implementation complete; not approved and not integrated |

---

## 3. Reserved ranges

| Range | Owner | Intended scope |
|---|---|---|
| `20260722020000–20260722029999` | Tasks | Assignment, fulfillment, evidence and Task recurrence |
| `20260722030000–20260722039999` | Events | Event domain, participants, location, attendance and recurrence |
| `20260722040000–20260722049999` | Plans | Plan graph, Milestones, Measurements, requirements and controller |
| `20260722050000–20260722059999` | Presets/Drafts | Presets, placeholders, Draft persistence and isolation |
| `20260722060000–20260722069999` | Reliability | Queue, conflicts, reconciliation, attention/search support |
| `20260722070000–20260722079999` | QA-only fixtures | Test-only migrations only when unavoidable; never production schema by default |
| `20260722090000–20260722099999` | Integration | Cross-domain FKs, global projections and compatibility bridges |

No lane may use another range.

Repository scan at activation found no duplicate 14-digit migration IDs in the
approved Integration baseline. The uncommitted M11.1B ID `20260722020000` is
inside the Tasks reservation and does not collide with a baseline migration.

---

## 4. Migration registration template

| Field | Value |
|---|---|
| Migration ID | |
| Filename | |
| Owner lane | |
| Base commit | |
| Depends on | |
| Tables/functions affected | |
| Backfill | |
| RLS/capabilities | |
| Idempotency/concurrency impact | |
| V0 compatibility impact | |
| Test command | |
| Cleanup verified | |
| Rollback concept | |
| Audit status | |
| Commit | |
| Integration status | |
| Remote status | NOT INSPECTED / NOT DEPLOYED |

---

## 5. Cross-domain migration rule

Examples that belong to Integration:

```text
Task ↔ controlling Plan
Event ↔ controlling Plan
Plan whole-structure Trash/restore
combined Calendar projection
global attention/search projection
shared audit/event registry
```

A domain lane publishes the requirement through an Integration Request. It does not directly edit another lane's tables.

---

## 6. Single local Supabase scheduler

Only one DB-heavy owner may hold the local Supabase window.

Operational record (outside Git):

```text
C:\Users\thega\Desktop\HomePlus-worktrees\.planner-supabase-lock.json
```

The lock starts `FREE`. One DB-heavy lane may own it at a time; the owner must
release it only after cleanup is verified. Integration and QA may inspect the
record. No lane may reset local Supabase while another lane owns the lock. This
JSON file coordinates local work and is not a security lock; it must never
contain secrets.

States:

```text
FREE
RESERVED_TASKS
RESERVED_EVENTS
RESERVED_PLANS
RESERVED_PRESETS
RESERVED_RELIABILITY
RESERVED_INTEGRATION
RESERVED_QA
```

Reservation record:

| Field | Value |
|---|---|
| Owner | |
| Start | |
| Expected duration | |
| Required command | |
| Expected final state | CLEAN |
| Released | |
| Cleanup verified by | |

While reserved, other lanes may run only non-DB work.

---

## 7. Remote rollout gate

No migration may be deployed remotely until Integration + QA record:

```text
[ ] remote project identity verified
[ ] remote migration history inspected
[ ] drift report produced
[ ] backup/snapshot available
[ ] legacy counts recorded
[ ] ambiguous rows recorded
[ ] backfill report has zero blockers
[ ] staging or disposable-copy rehearsal passed
[ ] rollback procedure tested conceptually
[ ] smoke tests prepared
[ ] human approval received
```

---

## 8. Current ledger

| ID | Owner | Status | Dependency | Audit |
|---|---|---|---|---|
| `20260722010000` | Tasks | APPROVED / IMMUTABLE BASE | Functional freeze; base commit `fb4efc81b1debf5932580ef2e16cedf4afb6bb45` | M11.1A R2 final audit PASS |
| `20260722020000` | Tasks | IMPLEMENTED / UNCOMMITTED | `20260722010000`; Tasks worktree only | Independent audit pending |

Integration adds entries before activating Events, Plans, Presets or Reliability.
