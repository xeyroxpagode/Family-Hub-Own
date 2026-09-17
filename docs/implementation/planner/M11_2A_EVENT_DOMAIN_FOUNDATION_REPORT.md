# Planner V1 — M11.2A Event Domain Foundation Report

**Current status:** CORRECTION BLOCKED (the original pre-audit status and evidence remain below for traceability)

**Base commit:** `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`

**Branch:** `planner-v1-events`

**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\events`

**Owner:** Events lane

**Remote state:** NOT INSPECTED / NOT DEPLOYED

**Git state:** uncommitted by instruction; no commit or push created

## 1. Preconditions

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` read completely from the Events baseline.
- Shared Contracts, Ownership Matrix, Migration Ledger and Integration Queue read completely from the Integration worktree because those read-only coordination documents are not present in the Events baseline.
- Shared Contracts status: `ACTIVE`.
- Events lane state: `READY`.
- Activation reference, branch and worktree matched `fb4efc81…`, `planner-v1-events` and the path above.
- Worktree started clean and no Git operation was active.
- Events migration range `20260722030000–20260722039999` was confirmed reserved.
- Shared Supabase lock was `FREE` and was acquired as `RESERVED_EVENTS` / owner `EVENTS` before the first DB reset.

## 2. Scope completed

The lane adds an Event V1 foundation without visible UI or shared-route changes:

- explicit `personal | household` scope;
- personal privacy by `owner_person_id`, independent from the active-household selector after creation;
- household membership and approved capability enforcement;
- lifecycle `draft | scheduled | cancelled | trash`;
- derived `upcoming | in_progress | past` temporal condition;
- timed scheduling with instant, end/duration and IANA time zone;
- all-day scheduling with semantic `date` values and no DTO UTC conversion;
- structured `home | other` location;
- separate participant records;
- independent RSVP and attendance state;
- attendance gating through `attendance_required`;
- creator as initial participant;
- separate recurrence series and stable concrete occurrence identity;
- edit scopes `this_occurrence | this_and_following | whole_series`;
- safe-only exposure and atomic execution of `this_and_following`;
- occurrence-versus-series cancellation;
- optimistic versions, canonical mutation headers, atomic idempotency and exactly-once audit;
- personal/household RLS, direct-RLS checks and SECURITY DEFINER search paths;
- additive V0 column and service compatibility.

## 3. Explicit exclusions preserved

- no visible Event UI;
- no combined Calendar V1 implementation;
- no Home or navigation changes;
- no Task, Plan, Preset or shared capability-registry changes;
- no Plan FK, controller relation or final-Event relation;
- no shared Planner route registry edit;
- no remote migration or deployment.

## 4. Files added

- `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql`
- `backend/src/controllers/planner.events.v1.controller.js`
- `backend/src/services/planner.events.v1.context.service.js`
- `backend/src/services/planner.events.v1.service.js`
- `front/mi-front-limpio/services/plannerEventsV1.ts`
- `scripts/planner_m11_2a_event_contract_tests.js`
- `scripts/planner_m11_2a_event_database_tests.js`
- `scripts/planner_m11_2a_event_test_runner.js`
- `docs/implementation/planner/M11_2A_EVENT_DOMAIN_FOUNDATION_REPORT.md`

No pre-existing Event V0 implementation file was modified.

## 5. Migration

### Registration

| Field | Value |
|---|---|
| Migration ID | `20260722030000` |
| Filename | `20260722030000_m11_2a_event_domain_foundation.sql` |
| Owner lane | Events |
| Base commit | `fb4efc81b1debf5932580ef2e16cedf4afb6bb45` |
| Depends on | M11.1A base and existing Core audit/idempotency contracts |
| Backfill | V0 events receive household scope, canonical schedule/location, creator participant and recurrence identity |
| RLS/capabilities | Existing Event capability names only; no registry addition |
| V0 compatibility | Existing columns, constraints, DTOs, services and routes preserved |
| Remote status | NOT INSPECTED / NOT DEPLOYED |

### Main objects

- additive canonical columns on `planner_events`;
- `planner_event_series`;
- `planner_event_participants`;
- Event-specific capability parity helpers consuming existing capability names;
- scope-aware Event, series and participant RLS;
- normalization and relational-validation triggers;
- `planner_event_v1_dto(uuid)`;
- `create_planner_event_v1(...)`;
- `mutate_planner_event_v1(...)`;
- `mutate_planner_event_participant_v1(...)`;
- `planner_m11_2a_backfill_report()`;
- Events-only partial uniqueness indexes on the approved `audit_events` ledger.

### Compatibility strategy

`planner_events` remains the single Event identity. V0 fields remain available:

- `status` remains `scheduled | cancelled`;
- `starts_at`, `ends_at`, `all_day`, `location_name`, `recurrence` remain readable;
- V0 inserts receive safe V1 defaults through the normalization trigger;
- all-day V1 dates are authoritative in `start_date/end_date`; legacy timestamps are compatibility projections only;
- V0 recurring bases/overrides are backfilled into a series without replacing their Event ids.

### Rollback concept

Before remote rollout, Integration must take the required backup and verify no V1 writers are active. Logical rollback is to stop V1 routes first, then remove V1 RPCs/policies/triggers, restore the prior V0 Event RLS policies, drop participant/series tables and indexes, and finally drop additive columns. Data created only through V1 (personal scope, participants, series definitions and semantic all-day fields) must be exported or projected to V0 before destructive rollback. No remote rollback was attempted.

## 6. API and DTO contract

Published controller/service handlers (not yet registered in the Integration-owned router):

- list/get Event V1;
- create Event V1;
- generic versioned Event mutation with edit scope;
- participant add, RSVP and attendance mutation.

The common mutation contract is reused:

- `X-Mutation-Id` required;
- `Idempotency-Key` required;
- `If-Match` / `expected_version` required for existing aggregate mutations;
- canonical request hash;
- result `{ data, outcome, version, operationId, auditEventId? }`;
- canonical error envelope through `sendApiError`.

The Event V1 DTO includes identity/version/scope/lifecycle, derived temporal condition, normalized scheduling, structured location, series/occurrence identity, participants, independent RSVP/attendance, attendance requirement and available actions/edit scopes.

## 7. Security and consistency

- actor account/person/member identities come from `auth.uid()`, `current_person_id()` and `current_household_member_id()`;
- no client actor identifier is authoritative;
- personal Event visibility is owner-only;
- household visibility/mutation requires active membership and existing Event capabilities;
- cross-household participant membership is rejected by a relational trigger;
- direct RLS and RPC checks share the same visibility/mutation helpers;
- SECURITY DEFINER functions use `pg_catalog, public` search paths and qualified `extensions.digest`;
- advisory transaction locks serialize equivalent concurrent mutations;
- the approved append-only `audit_events` ledger provides mutation/idempotency uniqueness and audit correlation;
- replay/no-op does not duplicate Event state or audit;
- RSVP changes never write attendance, and attendance changes never write RSVP.

## 8. Test evidence

### Full self-contained lane gate

```powershell
node scripts\planner_m11_2a_event_test_runner.js
```

Result: PASS.

- Event V1 contract suite: **58 assertions PASS**.
- Full clean Supabase reconstruction: PASS.
- Event V1 database/RLS suite: **63 assertions PASS**.
- Final clean Supabase reconstruction in `finally`: PASS.
- Post-reset clean/backfill gate: **6 assertions PASS**.
- Fixture cleanup: PASS.

The DB suite covers personal/household ownership, same/other household, inactive membership, timed/all-day values, structured location, creator/default participant, participant membership, RSVP/attendance independence and gating, recurrence identity, occurrence edit, safe series split, occurrence/series cancellation, stale versions, replay, concurrent equivalent creates, direct RLS, audit exactly once, cleanup and V0 insert compatibility.

### Existing V0 projection regression

```powershell
node scripts\planner_v1_m8_tests.js
```

Result: **115 assertions PASS / 0 fail**.

### Syntax gates

```powershell
node --check backend\src\services\planner.events.v1.context.service.js
node --check backend\src\services\planner.events.v1.service.js
node --check backend\src\controllers\planner.events.v1.controller.js
node --check scripts\planner_m11_2a_event_database_tests.js
node --check scripts\planner_m11_2a_event_contract_tests.js
node --check scripts\planner_m11_2a_event_test_runner.js
```

Result: PASS.

```powershell
tsc --noEmit --noCheck --target ES2020 --module NodeNext --moduleResolution NodeNext front\mi-front-limpio\services\plannerEventsV1.ts
```

Result: PASS. Full project typecheck was not used because this worktree has no installed `node_modules`; no dependency installation or lockfile modification was performed.

## 9. Integration Requests

### IR-EVENT-ROUTE-001 — Register Event V1 routes

- **Owner:** Integration
- **Priority:** P1
- **Need:** Register the published Event V1 controller in `backend/src/routes/planner.js` under additive `/api/planner/v1/events` routes.
- **Why Event lane did not edit it:** the shared Planner route registry is Integration-owned.
- **Acceptance:** route contract tests cover list/get/create/Event mutation/participant mutation; V0 routes remain unchanged.

### IR-EVENT-HOME-LOCATION-001 — Resolve semantic `home` location

- **Owner:** Integration + Household
- **Priority:** P2
- **Need:** Publish the normalized Household authority that resolves `location.type = home` to an address/place projection.
- **Current contract:** Events store only the stable semantic `home` type and an empty payload; no address source is hardcoded.
- **Acceptance:** resolution respects household privacy and does not mutate Event identity.

### IR-PLAN-002 — Event controller adapter and final Event relation

- **Owner:** Events + Plans + Integration
- **Priority:** P1
- **Need:** Define versioned/idempotent `linkEventToPlan`, `unlinkEventFromPlan`, inherited-state adapter and same-Plan final Event relation.
- **Current contract:** no cross-domain FK or Plan table mutation exists in M11.2A.
- **Acceptance:** maximum one controlling Plan, same-Plan final Event, atomic controller behavior and V0 compatibility.

### IR-CALENDAR-001 — Combined temporal projection

- **Owner:** Integration
- **Priority:** P1
- **Need:** Consume Event V1 timed/all-day projections with Tasks in one Calendar without duplicating entity identities.
- **Current contract:** Event DTO publishes normalized scheduling only; no Calendar file was modified.

### IR-EVENT-PERSONAL-AUDIT-001 — Remove personal compatibility audit anchor

- **Owner:** Integration / Core
- **Priority:** P2
- **Need:** Evolve the shared audit/idempotency ownership envelope to represent personal aggregates without a non-null household anchor.
- **Current foundation:** personal authorization and DTO ownership are person-only and survive active-household switches, but the existing `audit_events.household_id NOT NULL` contract requires retaining the creation household as a non-authoritative compatibility/audit anchor.
- **Acceptance:** personal Event creation can remain auditable even for an account with no household, without weakening the shared audit ledger or introducing a competing idempotency mechanism.

## 10. Known risks

- Public HTTP reachability waits on `IR-EVENT-ROUTE-001`; controller/service/DTO and RPC contracts are published and tested independently.
- The personal audit anchor is intentionally not used for authorization and should be normalized by `IR-EVENT-PERSONAL-AUDIT-001` before final V1 release.
- Whole-series schedule shifting is deliberately not inferred from one occurrence in this foundation; recurrence rule and non-temporal shared fields are supported, while final advanced scheduling UX belongs to the later Event slice.
- `home` address resolution waits on a normalized Household authority.

## 11. Handoff

- Migration reproduces from zero.
- Backfill report has zero blockers.
- RLS/direct SQL behavior is tested.
- Concurrent equivalent mutation behavior is tested.
- Audit is exactly once for effective operations.
- V0 Event files/routes/DTOs are untouched and directed V0 regression passes.
- Local DB is clean after the final reset and cleanup verification.
- Shared Supabase lock may be released by Events after final Git/status inspection.
- Ready for independent QA audit and Integration review.

## 12. M11.2A R1 Correction

This section supersedes the original readiness claim without deleting the historical implementation evidence above.

### Verdict

`VERDICT: CORRECTION BLOCKED`

The Events-owned correction is not ready for reauditoria because three required outcomes depend on shared surfaces that this lane is forbidden to modify:

- personal Event idempotency/audit cannot use the canonical contract without a non-null household and active member;
- revoking authenticated `INSERT` and `UPDATE` on `planner_events` would break the unchanged V0 Event services, which still write that table through the authenticated PostgREST client;
- the shared idempotency reservation flow returns a raw uniqueness failure under a concurrent first reservation and leaves failed 4xx mutations permanently `in_flight` because it has no abort/release operation.

### Findings corrected in Events-owned surfaces

- AUD-03: temporal series edits now apply explicit timed/all-day deltas, preserve duration/relative offsets, split atomically and no longer report success after stripping scheduling.
- AUD-04: `trashed_from_lifecycle` preserves and restores `draft`, `scheduled` or `cancelled`; invalid single-occurrence lifecycle transitions are rejected and canonical noops do not audit.
- AUD-05: timed shapes require a real PostgreSQL IANA zone and exactly one of end/duration; strict ranges and a closed recurrence-rule shape are enforced.
- AUD-07: the normalization trigger provides an idempotent V0 recurrence bridge for post-migration insert and recurrence changes while preserving Event identity.
- AUD-08: UUIDs are validated before SQL and SQLSTATE mapping uses stable safe messages; stale errors include sanitized `{ current, expected }`.
- AUD-10: `other` location is allowlisted, bounded to 2048 bytes and validates strings/coordinate ranges; `home` remains semantic with an empty payload.
- AUD-06 partial: Event-specific audit-backed idempotency indexes/replay storage were removed and household mutations now consume the shared adapter.
- AUD-02 partial: direct series and participant writes plus Event deletes are revoked. Event insert/update remain blocked by V0 compatibility ownership.
- AUD-09 partial: static smoke assertions are reported separately from behavioral mapper and DB/RLS assertions; missing mandatory cases remain a blocker rather than being claimed as covered.

### Files changed by R1

- `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql`
- `backend/src/controllers/planner.events.v1.controller.js`
- `backend/src/services/planner.events.v1.context.service.js`
- `backend/src/services/planner.events.v1.service.js`
- `front/mi-front-limpio/services/plannerEventsV1.ts`
- `scripts/planner_m11_2a_event_contract_tests.js`
- `scripts/planner_m11_2a_event_database_tests.js`
- `docs/implementation/planner/M11_2A_EVENT_DOMAIN_FOUNDATION_REPORT.md`
- `docs/implementation/planner/M11_2A_R1_CORRECTION_REPORT.md`

The audit report was not modified. No V0 Event source, shared router, capability registry, shared idempotency helper, coordination document, package file or lockfile was modified.

### Actual R1 test results

- clean local reconstruction: PASS;
- JavaScript syntax: PASS for the three V1 backend files and three M11.2A scripts;
- static/non-DB suite: PASS, 70 static plus 7 behavioral mapper/envelope assertions;
- database/RLS suite: behavioral checks pass through recurrence, lifecycle, scheduling validation, V0 bridge and cleanup, then intentionally reports the remaining AUD-01/AUD-02/AUD-06 blockers;
- V0 M8 regression: PASS, 115/115;
- TypeScript CLI: unavailable in PATH and no local compiler exists; no dependency was installed;
- fixture cleanup after the DB suite: PASS.

The final clean reset, post-reset backfill report and Events lock release are recorded in the R1 correction report. After Events released the lock cleanly, Plans acquired it; the final observed shared state is therefore `RESERVED_PLANS`.

### Integration Requests

- existing: `IR-EVENT-ROUTE-001`, `IR-EVENT-HOME-LOCATION-001`, `IR-PLAN-002`, `IR-CALENDAR-001`, `IR-EVENT-PERSONAL-AUDIT-001`;
- proposed: `PROPOSED IR-EVENT-PERSONAL-IDEMP-001` for a canonical person-scoped idempotency/audit ownership envelope;
- proposed: `PROPOSED IR-EVENT-V0-MUTATION-001` for an Integration-owned V0 mutation bridge that permits revoking direct authenticated Event table writes;
- proposed: `PROPOSED IR-EVENT-IDEMP-RECOVERY-001` for atomic concurrent reservation and an approved abort/recovery path for failed canonical mutations.

No Integration Queue or other shared coordination document was edited.

### Remote and Git state

Remote Supabase was not accessed. No commit, push, merge or deployment was created.
