# Planner V1 — M11.2A Event Domain Foundation Independent Audit

## 1. Verdict

```text
VERDICT: FAIL
SEVERITY: P0
BRANCH: planner-v1-events
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\events
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
AUDITED STATE: nine uncommitted M11.2A implementation files at the stated base
COMMIT: none
REMOTE: not accessed
SUPABASE FINAL STATE: not modified or safely revalidated by this audit; DB-heavy gates were not run
LOCK FINAL STATE: RESERVED_TASKS / owner Tasks (not acquired or modified by QA)
```

The audit fails because the implementation contains two P0 findings and seven P1 findings. The occupied shared Supabase lock prevented clean reconstruction and independent DB probes, but it does not change the verdict to BLOCKED: the production SQL and API code already provide conclusive evidence of blocking defects.

## 2. Executive summary

Branch, base, migration range and file ownership inventory match the Events activation. The six JavaScript syntax gates pass, the delivered contract suite reports 58/58, and the existing M8 V0 projection suite reports 115/115. The contract suite is primarily source-text matching and does not establish runtime behavior.

The implementation is not ready for commit preparation. Direct authenticated table updates are granted and RLS-approved without the RPC's expected-version, action-capability, idempotency or exactly-once audit controls. Recurrence scheduling edits are also unsafe: `this_and_following` applies the same absolute schedule to every later occurrence, while `whole_series` silently removes the schedule patch and still updates versions/audit. Additional blocking issues affect personal creation without a household, lifecycle restore, IANA/time validation, the canonical idempotency mechanism, post-migration V0 recurring inserts, stable API errors and mandatory test coverage.

No production file was edited by the auditor. This report is the only repository write attributable to the audit.

## 3. Preconditions and Git state

- `git branch --show-current`: `planner-v1-events`.
- `git rev-parse HEAD`: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`.
- No `MERGE_HEAD`, `REBASE_HEAD`, `CHERRY_PICK_HEAD` or `REVERT_HEAD` exists.
- Initial `git diff --check`: exit 0.
- Initial tracked diff against base: empty.
- Initial untracked inventory: exactly the nine files declared by the implementation.
- Shared Contracts status is `ACTIVE`; Integration Queue marks Events `READY`.
- Events migration reservation is `20260722030000–20260722039999`.
- The shared Supabase lock was not free. It was `RESERVED_TASKS`, owner `Tasks`, branch `planner-v1-tasks-m11-1b`, purpose `M11.1B R1 correction`. QA did not overwrite it.

Authorities were read completely in precedence order. Shared coordination documents were read read-only from the Integration worktree, as authorized by the audit prompt.

## 4. Audited change inventory

Implementation files present before the audit:

```text
backend/src/controllers/planner.events.v1.controller.js
backend/src/services/planner.events.v1.context.service.js
backend/src/services/planner.events.v1.service.js
front/mi-front-limpio/services/plannerEventsV1.ts
supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql
scripts/planner_m11_2a_event_contract_tests.js
scripts/planner_m11_2a_event_database_tests.js
scripts/planner_m11_2a_event_test_runner.js
docs/implementation/planner/M11_2A_EVENT_DOMAIN_FOUNDATION_REPORT.md
```

Auditor-owned file:

```text
docs/implementation/planner/M11_2A_EVENT_FOUNDATION_AUDIT.md
```

No tracked file was modified. No duplicate 14-digit migration ID was found. The only new migration is `20260722030000`, inside the Events reservation. No Tasks, Plans, Presets, Calendar, Home, navigation, Quick Actions, capability registry, shared router, package manifest, lockfile, Supabase config or coordination document changed.

## 5. Authority and ownership compliance

The domain file paths are Events-owned. The absence of shared route registration is compliant and correctly belongs to Integration.

Ownership is nevertheless not fully compliant. The Events migration adds two uniqueness indexes directly to shared `public.audit_events` (`supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:731` and `:737`) to implement a second idempotency store. Shared Contracts require `planner_idempotency_keys`, and the Migration Ledger assigns shared audit/event-registry changes and cross-domain migrations to Integration. See M11.2A-AUD-06.

## 6. Migration and reconstruction audit

Static review confirms that `planner_events` remains the canonical Event identity and V0 columns are not dropped. New Event columns, series and participant tables are additive. The migration uses one transaction and creates referenced objects in a generally valid order.

Clean reconstruction, actual backfill execution and final blocker counts could not be independently rerun because the shared lock was occupied. The delivered runner was not executed. Therefore the implementation report's claims of a clean reset, 63 DB/RLS assertions and six post-reset assertions were not accepted as independent evidence.

Static migration failures remain independently conclusive:

- a future V0 recurring insert does not receive a series identity;
- direct authenticated updates bypass public mutation invariants;
- lifecycle restore loses the prior lifecycle in supported cases;
- schedule and recurrence validation are incomplete;
- recurrence scheduling scopes have unsafe behavior.

## 7. Event domain audit

### 7.1 Ownership and scope

The schema represents `personal` and `household` unambiguously, makes ownership immutable, hides the personal audit anchor from the DTO and restricts personal reads to `owner_person_id`. Static RLS supports personal reads after active-household changes.

Creation is not independent of household membership. `create_planner_event_v1` resolves or requires a household anchor, requires an active membership in that household, and requires `planner.view` plus `event.create_personal` even for personal scope (`supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:996-1011`). This contradicts the freeze and the audit's explicit no-household probe requirement. See M11.2A-AUD-01.

### 7.2 Lifecycle

The lifecycle enum is present, and temporal condition is derived. However transition enforcement and restore semantics fail:

- the normalization trigger rewrites `status` to `scheduled` for lifecycle `trash` (`:442-448`);
- restore derives the restored lifecycle from that rewritten `status` (`:1425-1429`), so a cancelled or draft Event restores as scheduled;
- RPC update has no lifecycle operational guard and can edit cancelled or trashed Events (`:1401-1404`);
- cancel is not restricted to scheduled Events.

See M11.2A-AUD-04.

### 7.3 Timed scheduling

Timed scheduling stores an instant and zone-shaped string, but the zone is only checked for non-empty text (`:1043-1048`, `:1166-1171`). There is no lookup against PostgreSQL time-zone authorities. Equal start/end is accepted, and both `endsAt` and `durationMinutes` may be supplied simultaneously. See M11.2A-AUD-05.

### 7.4 All-day scheduling

The V1 DTO returns `date` fields directly and does not convert them through UTC. Static shape and round-trip logic are directionally correct. Independent negative/positive-zone DB probes were blocked by the shared lock, so this gate is not independently complete.

The legacy compatibility timestamps are projected at UTC midnight. That projection remains a residual compatibility risk for V0 clients that render local instants, although V1 dates remain authoritative.

### 7.5 Location

`home` is semantic and stores an empty payload without hardcoding a Household address source. `other` requires an object with either display name or normalized address. However arbitrary additional keys and value types are accepted in SQL and TypeScript. See M11.2A-AUD-10.

### 7.6 Participants

Participants are separate, unique per Event/person, and the creator trigger inserts the creator once. Cross-household `member_id` shape is checked. The public direct-table policies are more permissive than the participant RPC: a viewer may self-insert, and a participant may update every mutable column on their row. See M11.2A-AUD-02.

### 7.7 RSVP and attendance

RSVP and attendance are separate columns, and the RPC changes them independently. Attendance gating exists in a trigger. Nevertheless direct RLS lets a participant update their own attendance when attendance is enabled, while the RPC requires participant-management authority (`:712-721` versus `:1589`). This violates authorization parity and exactly-once audit. See M11.2A-AUD-02.

### 7.8 Recurrence and occurrences

Series and occurrence identities are separate, the first occurrence has a stable key, and `this_and_following` is hidden at the first occurrence. The actual temporal mutation behavior is unsafe:

- split iterates all following occurrences and applies the same absolute scheduling object to each (`:1351-1359`);
- whole-series update explicitly removes `scheduling` before applying the patch (`:1381-1385`) but still performs row updates, version changes and an audit;
- recurrence `interval` and other rule shape are not validated;
- the delivered test fabricates later occurrences with privileged SQL rather than a public generation path (`scripts/planner_m11_2a_event_database_tests.js:363-379`).

See M11.2A-AUD-03 and M11.2A-AUD-09.

## 8. Security, capabilities and RLS

Positive static findings:

- RPC actor account/person/member values derive from `auth.uid()`, `current_person_id()` and `current_household_member_id()`;
- SECURITY DEFINER functions use `pg_catalog, public` search paths;
- `extensions.digest` is qualified;
- no dynamic SQL was found;
- personal SELECT privacy and household membership checks are present.

Blocking finding: authenticated users receive `UPDATE` on Events/series/participants, and broad RLS policies admit effective table mutations outside the RPC. These table writes do not require `If-Match`, mutation ID or idempotency key, do not perform action-specific capability checks, and do not append `audit_events`. Participant self-update also allows an RSVP-capable actor to write administrative attendance. This is a public RLS/RPC parity failure and an exactly-once audit bypass. See M11.2A-AUD-02.

No evidence of cross-household SELECT leakage or client-supplied actor authority was found statically. Independent DB spoofing and cross-household probes were not run because QA did not own the lock.

## 9. API, DTO and errors

The V1 controller requires `X-Mutation-Id`, `Idempotency-Key`, and `If-Match`/fallback for RPC mutations. The request hash includes method, operation, params, body and expected version. DTO and frontend names generally align.

Blocking API defects:

- invalid UUID SQLSTATE `22P02` maps to HTTP 500/internal error instead of a stable domain validation error;
- constraint SQLSTATEs `23514`/`23505` copy the raw database message into a public 400 message;
- stale version maps to 412 but omits canonical `{ current, expected }` details;
- Event idempotency bypasses the shared persistence adapter;
- public replay is resolved before entity/capability revalidation and may return a null DTO after access loss.

The non-DB error-mapper probe reproduced the first three results. See M11.2A-AUD-08.

## 10. Versioning, idempotency and concurrency

Row triggers increment versions, and RPC happy paths use expected versions. That is not sufficient because direct public table writes bypass expected-version and idempotency requirements.

The implementation does not use the frozen persistence contract (`reserve_planner_idempotency_key`, `complete_planner_idempotency_key`, `planner_idempotency_keys`). It instead treats `audit_events` plus new partial indexes as an idempotency store. This is the second competing mechanism explicitly prohibited by Shared Contracts. See M11.2A-AUD-06.

The delivered DB suite contains a real concurrent equivalent-create test, but no concurrent split, participant, RSVP, attendance or cancellation probe. The split test is sequential replay only. Independent concurrency execution was blocked by the Tasks lock.

## 11. Audit exactly-once

RPC effective paths append `public.audit_events`, and their replay lookup is designed not to append a second row. However direct RLS-approved effective updates append no audit at all. Therefore the global claim “audits are exactly once per effective operation” is false; the system supports zero-audit effective mutations. This is part of the P0 M11.2A-AUD-02.

The new audit uniqueness indexes are Events-limited by predicate, but they still repurpose a shared append-only audit table as a competing idempotency store and modify an Integration-owned shared surface.

## 12. V0 compatibility and backfill

No V0 Event source file changed. The hermetic M8 projection regression passes 115/115.

Post-migration V0 recurrence compatibility fails statically. The V0 service continues to insert `recurrence = daily|weekly|monthly` directly (`backend/src/services/planner.events.service.js:182-200`). The M11.2A series conversion is a one-time migration block (`supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:518-568`); the ongoing normalization/creator triggers do not create a series. A V0 recurring insert made after the migration therefore has `series_id = null`, and `planner_m11_2a_backfill_report()` reports it as a blocker (`:1659-1662`). See M11.2A-AUD-07.

Actual backfill execution from a clean base could not be independently rerun under the occupied lock.

## 13. Test quality review

The contract suite's 58 assertions are overwhelmingly `String.includes` checks (`scripts/planner_m11_2a_event_contract_tests.js:30-73`). They confirm tokens, not behavior. In particular, the assertion claiming RLS/RPC sharing merely checks that helper names occur in SQL (`:48-49`).

The DB suite is behavioral for the cases it covers, uses isolated UUID fixtures, performs cleanup in `finally`, checks direct SELECT RLS and tests a concurrent create. Its mandatory coverage is incomplete:

- no personal creation without an active household;
- no actor-ID spoofing input probe;
- no invalid IANA zone, equal end, or end-plus-duration contradiction;
- no invalid lifecycle transition or cancelled/draft restore;
- no direct Event UPDATE parity probe;
- no direct participant self-attendance/update parity probe;
- no same-key/different-payload conflict probe;
- no concurrent split/participant/RSVP/attendance/cancel probe;
- no noop audit probe;
- no invalid UUID API probe;
- no positive/negative-zone all-day DB round trip;
- no post-migration V0 recurring insert;
- no real V0 backfill fixture before migration;
- later recurrence occurrences are manually inserted with privileged SQL.

The report's “63 assertions PASS” was not rerun due lock ownership. The missing mandatory coverage is M11.2A-AUD-09.

## 14. Commands executed and results

```text
git branch --show-current                                      PASS: planner-v1-events
git rev-parse HEAD                                             PASS: expected base
git status --short / --porcelain=v2                            PASS: declared nine files only
git diff --check                                               PASS
git diff --name-status <base>                                  PASS: no tracked diff
git ls-files --others --exclude-standard                       PASS: declared inventory
Git operation ref checks                                      PASS: none active
migration ID duplicate scan                                   PASS: none

node --check (3 Event V1 backend files)                        PASS
node --check (3 M11.2A scripts)                                PASS
tsc --noEmit --noCheck ... plannerEventsV1.ts                  NOT RUN: tsc not found; no install allowed
node scripts/planner_m11_2a_event_contract_tests.js            PASS: 58 assertions
node scripts/planner_v1_m8_tests.js                            PASS: 115 pass / 0 fail
node inline mapEventV1DatabaseError probe                      FAIL behavior reproduced

read .planner-supabase-lock.json                               RESERVED_TASKS / Tasks
node scripts/planner_m11_2a_event_test_runner.js               NOT RUN: lock not owned by QA
independent Supabase probes                                    NOT RUN: lock not owned by QA
```

No Supabase reset, query or remote command was executed by this audit.

## 15. Independent probes

### Executed non-DB probe: error mapping

Input/output from exported `mapEventV1DatabaseError`:

```json
{"input":"22P02","status":500,"code":"internal_error","message":"invalid input syntax for type uuid: \"bad\"","details":null}
{"input":"23514","status":400,"code":"validation_error","message":"new row for relation \"planner_events\" violates check constraint \"planner_events_v1_schedule_shape_check\"","details":null}
{"input":"40001","status":412,"code":"version_conflict_v2","message":"La versión cambió. Actualizá y reintentá.","details":null}
```

This proves invalid UUID instability, raw SQL leakage on public 4xx mapping and missing stale-version details.

### Static path proofs

The following high-risk behaviors are direct consequences of unconditional branches/policies and do not depend on report claims:

1. personal create with no household reaches `a compatibility household anchor is required`;
2. participant self-update RLS permits an attendance column update when attendance is enabled;
3. direct Event/participant UPDATE never reaches RPC audit/idempotency code;
4. split schedule patch is reused unchanged for every later row;
5. whole-series schedule patch is removed before update;
6. cancelled/draft trash overwrites compatibility status and restore returns scheduled;
7. V0 recurring insert has no trigger that creates a series.

### DB probes not executed

All 17 requested DB-heavy probes, clean reconstruction, DB/RLS suite, backfill verification and cleanup verification were withheld because the lock belonged to Tasks. This is recorded as a gate limitation, not used to soften the conclusive FAIL.

## 16. Findings

### M11.2A-AUD-01

**Severity:** P1  
**Area:** Personal ownership / creation  
**Evidence:** `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:996-1011`, function `create_planner_event_v1`; implementation report `M11_2A_EVENT_DOMAIN_FOUNDATION_REPORT.md:234-245`.  
**Reproduction:** Authenticate a person whose `active_household_id` is null and call `create_planner_event_v1` with `scope=personal`. Static control flow reaches SQLSTATE 42501 at line 1002. If a household ID is supplied without active membership, lines 1004-1011 also reject it. DB execution was withheld due the Tasks lock.  
**Expected:** A personal Event is private and independent of active household; an authenticated person without household membership can create and audit it.  
**Actual:** Personal creation requires a household anchor, active membership, `planner.view` and `event.create_personal` in that household.  
**Impact:** Personal Event foundation contradicts a mandatory ownership invariant. The Integration Request cannot defer this requirement.  
**Required correction:** Provide a canonical personal audit/idempotency envelope that does not require household authority, then remove household membership/capability dependence from personal create while retaining person ownership and audit.

### M11.2A-AUD-02

**Severity:** P0  
**Area:** RLS / authorization / idempotency / audit exactly-once  
**Evidence:** `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:645-656`, policy `planner_events_update_v1_scope`; `:705-724`, participant policies/grants; `:1302-1307`, RPC action capability split; `:1589`, RPC attendance management check; `:1441-1454` and `:1609-1621`, RPC-only audit inserts.  
**Reproduction:** As an authenticated row owner/visible participant, issue direct PostgREST UPDATE instead of the RPC. The policies admit the update without expected version, mutation ID, idempotency key or audit insertion. A participant can update their own `attendance_status` when enabled because the participant UPDATE policy checks only `person_id`, while the RPC requires management authority. Static policy and grant evaluation is conclusive; DB execution was withheld due lock ownership.  
**Expected:** Direct Supabase, RPC and backend enforce the same action capability, expected version, idempotency and exactly-once audit requirements. Own RSVP authority must not grant administrative attendance authority.  
**Actual:** Direct table writes are more permissive and produce effective zero-audit mutations.  
**Impact:** Public RLS bypass of mutation security and false exactly-once audit. This meets the audit's P0 definition.  
**Required correction:** Remove unrestricted direct mutation paths or route them through field/action-sensitive, versioned, idempotent, audited database operations; make participant RSVP and attendance authorization distinct at RLS level.

### M11.2A-AUD-03

**Severity:** P0  
**Area:** Recurrence split / whole-series scheduling  
**Evidence:** `front/mi-front-limpio/services/plannerEventsV1.ts:107-123` permits scheduling in an Event patch for every edit scope; `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:1351-1359`, split loop; `:1381-1385`, whole-series loop; `:1181-1205`, unconditional row update.  
**Reproduction:** Submit `action=update`, `edit_scope=this_and_following` and one absolute scheduling patch at a non-first occurrence. The same dates/instants are written to every later occurrence. Submit the same patch with `whole_series`; `scheduling` is removed and each row is still updated/versioned while the requested temporal change is ignored.  
**Expected:** Safe split preserves recurrence offsets and applies a defined temporal transformation atomically, or rejects unsupported temporal edits without state/audit changes. Whole-series update must not report success for an ignored schedule.  
**Actual:** Split can collapse future schedules to one instant/date; whole-series can return audited/versioned success without applying the requested schedule.  
**Impact:** Temporal data corruption and false successful mutation. This meets the P0 definition.  
**Required correction:** Define and validate temporal edit semantics per scope, reject unsupported payloads, preserve offsets/identities, and add atomic concurrent probes for timed and all-day series.

### M11.2A-AUD-04

**Severity:** P1  
**Area:** Lifecycle / trash and restore  
**Evidence:** `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:383-402` and `:442-448`, function `normalize_planner_event_v1`; `:1401-1431`, function `mutate_planner_event_v1`.  
**Reproduction:** Trash a cancelled or draft Event, then restore it. The trash normalization rewrites `status` to scheduled; restore uses that status and returns lifecycle scheduled. Also call update on a trashed Event or cancel on a draft Event; no transition guard rejects it.  
**Expected:** Trash restores the exact previous lifecycle, draft/cancel transitions follow the frozen matrix, and trash is non-operational.  
**Actual:** Prior lifecycle is lost and invalid/operational mutations are admitted.  
**Impact:** Mandatory lifecycle semantics are incorrect.  
**Required correction:** Persist previous lifecycle explicitly, enforce the transition matrix in RPC and direct paths, and add restore/invalid-transition/noop audit tests.

### M11.2A-AUD-05

**Severity:** P1  
**Area:** Timed schedule and recurrence-rule validation  
**Evidence:** `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:86-104`, schedule constraint; `:1043-1048` create validation; `:1166-1171` patch validation; `:1056-1060` recurrence validation. No `pg_timezone_names` validation exists.  
**Reproduction:** Provide `timeZone="not/a-zone"`; provide equal `startsAt`/`endsAt`; provide both `endsAt` and `durationMinutes`; provide recurrence `interval=0`. Each passes the explicit validation shown (subject only to unrelated casts/constraints).  
**Expected:** IANA zone, strictly later end, exactly one of end or duration, positive and normalized recurrence rules.  
**Actual:** Non-empty zone text is accepted, equal end is accepted, contradictory end+duration is accepted, and interval is unvalidated.  
**Impact:** Invalid/ambiguous schedules and recurrence definitions can become canonical data.  
**Required correction:** Validate against PostgreSQL time-zone names, enforce exclusive end/duration and strict ordering, and fully validate recurrence-rule shape/ranges.

### M11.2A-AUD-06

**Severity:** P1  
**Area:** Shared idempotency contract / ownership  
**Evidence:** Shared Contracts lines 147 and 151 require `planner_idempotency_keys` and prohibit a second mechanism. Events migration `:731-745` creates `audit_events_event_mutation_uidx` and `audit_events_event_idempotency_uidx`; `:896-929` implements audit-ledger replay. No Events reference to `reserve_planner_idempotency_key`, `complete_planner_idempotency_key` or `planner_idempotency_keys` exists.  
**Reproduction:** Source scan of controller/service/migration returns only the two audit index references for persistence.  
**Expected:** Reuse the frozen shared idempotency reservation/completion mechanism and keep `audit_events` as the exactly-once human-operation ledger.  
**Actual:** Events introduces a competing audit-backed idempotency store and modifies a shared schema surface in a domain migration.  
**Impact:** Cross-lane incompatibility, divergent replay semantics and ownership violation.  
**Required correction:** Use the shared persistence adapter/RPC contract or obtain an approved shared-contract change implemented by Integration; remove audit-ledger idempotency coupling.

### M11.2A-AUD-07

**Severity:** P1  
**Area:** V0 compatibility / recurrence backfill  
**Evidence:** `backend/src/services/planner.events.service.js:182-200`, V0 create; Events migration `:518-568`, one-time recurrence backfill; `:581-602`, creator-only insert trigger; `:1659-1662`, backfill blocker.  
**Reproduction:** After the migration, create a V0 Event with `recurrence=weekly`. The V0 insert does not set V1 series fields, and no ongoing trigger creates them. The row matches `recurring_events_missing_series`.  
**Expected:** V0 inserts after migration receive safe V1 defaults and recurring identity without replacing Event IDs.  
**Actual:** Post-migration V0 recurring Events remain without series/occurrence identity and cause a blocker report.  
**Impact:** V0 compatibility and recurrence foundation are not preserved for continuing V0 traffic.  
**Required correction:** Add an idempotent compatibility bridge for V0 recurrence create/update and test it after migration and from clean backfill fixtures.

### M11.2A-AUD-08

**Severity:** P1  
**Area:** API error contract  
**Evidence:** `backend/src/services/planner.events.v1.service.js:5-15`, `mapEventV1DatabaseError`; executed non-DB mapper probe in section 15.  
**Reproduction:** Map SQLSTATE 22P02, 23514 and 40001 through the exported mapper. Results were respectively 500/internal, public raw constraint text, and 412 without details.  
**Expected:** Invalid UUID is a stable 4xx domain error; no raw SQL appears in public messages; stale response includes sanitized `{current, expected}`.  
**Actual:** The mapper violates all three requirements.  
**Impact:** Unstable client recovery and database implementation disclosure on 4xx responses.  
**Required correction:** Validate UUIDs before RPC, map database failures to fixed safe messages/codes, and attach canonical sanitized stale-version details.

### M11.2A-AUD-09

**Severity:** P1  
**Area:** Mandatory tests / evidence quality  
**Evidence:** `scripts/planner_m11_2a_event_contract_tests.js:30-73`; `scripts/planner_m11_2a_event_database_tests.js:263-285`, `:353-379`, `:404-416`, `:445-465`, `:467-483`; implementation report `M11_2A_EVENT_DOMAIN_FOUNDATION_REPORT.md:165-172`.  
**Reproduction:** Inspect assertion bodies and compare them with the audit prompt's mandatory matrix. Contract assertions are token searches; DB recurrence siblings are inserted with privileged SQL; only create concurrency is exercised; the cases listed in section 13 are absent.  
**Expected:** Self-contained behavioral coverage for every mandatory ownership, lifecycle, time-zone, RLS parity, idempotency, concurrency, audit, backfill and V0 case.  
**Actual:** Multiple mandatory cases are absent while the report presents broad coverage.  
**Impact:** Required failures were not detected, and the reported assertion totals overstate contract confidence.  
**Required correction:** Add independent behavioral tests for every missing case, including direct RLS writes, no-household personal create, temporal scopes, V0 recurring bridge and concurrent non-create mutations.

### M11.2A-AUD-10

**Severity:** P2  
**Area:** Structured `other` location payload  
**Evidence:** `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql:107-117`; `front/mi-front-limpio/services/plannerEventsV1.ts:15-17`.  
**Reproduction:** Include arbitrary additional keys/types alongside a non-empty display name. SQL and TypeScript accept them.  
**Expected:** A normalized, bounded place/address payload with stable allowed fields and types.  
**Actual:** The payload is open-ended.  
**Impact:** Moderate contract drift/privacy and integration risk, without a demonstrated current cross-household leak.  
**Required correction:** Freeze and validate an allowlisted payload schema, size and safe field types.

## 17. Integration Requests review

- `IR-EVENT-ROUTE-001`: valid cross-lane request. The shared router is Integration-owned; route absence is not a lane failure.
- `IR-EVENT-HOME-LOCATION-001`: valid P2 cross-lane request for semantic home resolution; current Event storage correctly avoids a hardcoded authority.
- `IR-PLAN-002`: confirmed in the Integration Queue and correctly deferred; no Plan FK or final-Event relation was added.
- `IR-CALENDAR-001`: confirmed in the Integration Queue and correctly deferred; no combined Calendar file changed.
- `IR-EVENT-PERSONAL-AUDIT-001`: the shared-envelope need is real, but it cannot justify shipping personal create with mandatory household membership. It remains a dependency and M11.2A-AUD-01 remains blocking.

No coordination document was modified.

## 18. Residual risks

- Remote Supabase is unknown and was not accessed.
- Local Supabase final contents were not independently verified because Tasks owned the lock.
- `tsc` was unavailable in PATH; dependencies were not installed.
- Integration route registration, semantic home resolution, Event/Plan adapter and combined Calendar projection remain pending.
- All-day legacy UTC-midnight projection needs explicit V0 client validation after blocking fixes.

## 19. Final gate matrix

| Gate | Result | Evidence |
|---|---|---|
| Git/base | PASS | Correct branch and exact base; no Git operation active |
| Ownership | FAIL | Events migration modifies shared audit/idempotency surface |
| Migration range | PASS | Only `20260722030000`; no duplicate ID |
| Clean reconstruction | BLOCKED | Lock owned by Tasks; not executed |
| Backfill | BLOCKED | Runtime report not executed; static V0 recurrence defect found |
| Personal ownership | FAIL | Personal creation requires household membership |
| Household security | FAIL | Direct RLS update is more permissive than RPC |
| All-day semantics | BLOCKED | Static DTO shape passes; required DB zone probes not executed |
| Participants | FAIL | Direct self-insert/update bypasses manager RPC contract |
| RSVP/attendance | FAIL | Direct self-update can write attendance; audit bypass |
| Recurrence/split | FAIL | Unsafe temporal split and false whole-series update |
| Versioning | FAIL | Direct public updates do not require expected version |
| Idempotency | FAIL | Competing audit-backed mechanism; direct mutations bypass it |
| Concurrency | BLOCKED | Independent DB probes not executed; delivered suite not rerun |
| Audit exactly-once | FAIL | Direct effective updates generate zero audit rows |
| DTO/API | FAIL | Error contract and temporal mutation semantics fail |
| V0 regression | PASS | Hermetic M8: 115/115; broader recurrence compatibility fails |
| Cleanup | BLOCKED | QA made no DB changes; final local state not revalidated |
| Lock release | BLOCKED | Lock belongs to Tasks; QA did not acquire or release it |

## 20. Required next action

Perform a targeted M11.2A correction for M11.2A-AUD-01 through M11.2A-AUD-09. Do not commit, integrate or deploy this lane yet. After correction, rerun the complete independent audit when QA can acquire the shared lock, including clean reconstruction, all mandatory DB/RLS probes, cleanup and final lock release.
