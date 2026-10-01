# Planner V1 — M11.2A R1 Event Domain Foundation Correction Report

## 1. Verdict

```text
VERDICT: CORRECTION BLOCKED
```

Events-owned defects were corrected where possible, but M11.2A cannot be declared ready for independent reauditoria. AUD-01, AUD-02, AUD-06 and the mandatory-completeness portion of AUD-09 still require Integration/Core or V0-owned contract changes that this lane is explicitly forbidden to make.

No commit, push, merge, deployment or remote Supabase access occurred.

## 2. Preconditions

- Branch: `planner-v1-events`.
- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\events`.
- Base/HEAD: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`.
- Initial inventory: the expected nine implementation files plus the auditor-owned audit report.
- No merge, rebase, cherry-pick or revert operation was active.
- Shared Contracts status: `ACTIVE`.
- Events migration range: `20260722030000–20260722039999`.
- Migration used: `20260722030000_m11_2a_event_domain_foundation.sql`.
- Shared lock was initially owned by Tasks, later became `FREE`, was acquired as `RESERVED_EVENTS`, and was released only after final clean reconstruction and backfill verification. Plans subsequently acquired it; final observed state is `RESERVED_PLANS` / owner `Plans`.

## 3. Audited findings addressed

### M11.2A-AUD-01

Problem: personal mutations must be independent of household, but the canonical idempotency and audit ownership contracts require a non-null household/member.

Correction: personal reads no longer require an active household in backend context. Personal mutations fail closed with stable `personal_idempotency_contract_unavailable`; no artificial/current/previous household is used.

Files: Event V1 context/controller/service and migration.

Tests: a person without household/membership is probed behaviorally.

Result: **BLOCKED**. The probe confirms personal create cannot meet the freeze using the current shared contract. `PROPOSED IR-EVENT-PERSONAL-IDEMP-001` is required.

### M11.2A-AUD-02

Problem: direct table mutations bypass expected version, action capability, idempotency and audit.

Correction: authenticated insert/update/delete were revoked for series and participants; Event delete was revoked; participant RSVP and attendance remain separate RPC actions.

Files: Events migration and DB suite.

Tests: direct Event insert/update/delete and direct participant insert probes; RPC RSVP/attendance probes.

Result: **BLOCKED**. Event insert/update remain granted because unchanged V0 services use authenticated direct PostgREST writes. Revoking them inside this lane breaks V0. `PROPOSED IR-EVENT-V0-MUTATION-001` is required.

### M11.2A-AUD-03

Problem: split collapsed future schedules to one absolute value and whole-series silently ignored scheduling.

Correction: `this_and_following` and `whole_series` now calculate timed instant deltas or all-day semantic date deltas, preserve duration, reject schedule-type/duration changes, and remain within one RPC transaction. Unsafe first-occurrence split remains hidden/rejected.

Files: Events migration and DB suite.

Tests: occurrence edit, all-day temporal split, relative date preservation, distinct new series, prior series preservation, replay and exactly-one split audit passed.

Result: corrected for the implemented paths. Full timed/concurrent split matrix still belongs to the incomplete AUD-09 gate.

### M11.2A-AUD-04

Problem: trash lost the prior lifecycle and invalid transitions were accepted.

Correction: `trashed_from_lifecycle` stores the explicit V1 state; restore consumes it. Draft/scheduled/cancelled/trash guards and canonical noops were added for single-occurrence actions.

Files: Events migration and DB suite.

Tests: draft trash/restore and cancelled trash/restore passed; stale versions remain rejected.

Result: corrected in Events-owned code.

### M11.2A-AUD-05

Problem: free-form zones, contradictory timed shapes and open recurrence rules.

Correction: PostgreSQL `pg_timezone_names` validates IANA zones; timed schedules require exactly one end representation and strict positive ranges; recurrence uses an allowlisted shape/frequency/interval/end condition.

Files: Events migration and DB suite.

Tests: invalid IANA, equal end and end-plus-duration probes passed as safe SQLSTATE `22023`; semantic multi-day all-day dates passed.

Result: corrected for exercised cases.

### M11.2A-AUD-06

Problem: Events used `audit_events` as a competing idempotency store.

Correction: Event-specific audit uniqueness/replay objects were removed. Household HTTP mutations consume the canonical shared adapter and `planner_idempotency_keys`; replay revalidates Event/household access before returning stored data.

Files: controller/service/migration/DB suite.

Tests: same key/same payload replay, same key/different payload conflict, lost-response recovery and exactly-once audit passed.

Result: **BLOCKED**. Concurrent first reservation returns raw `23505` instead of `in_flight`, failed 4xx mutations leave response-status `0` reservations, and personal scope has no canonical owner envelope. These are shared-helper/SQL defects outside Events ownership. `PROPOSED IR-EVENT-IDEMP-RECOVERY-001` and `PROPOSED IR-EVENT-PERSONAL-IDEMP-001` are required.

### M11.2A-AUD-07

Problem: V0 recurring writes after migration lacked V1 series/occurrence identity.

Correction: the Event normalization trigger bridges V0 recurring insert, none-to-recurring, supported recurrence change and recurring-to-none without changing Event identity or creating human audit.

Files: Events migration and DB suite.

Tests: post-migration V0 recurring insert and none-to-recurring update produced series/occurrence identity; backfill report finished with zero blockers.

Result: corrected for exercised V0 paths.

### M11.2A-AUD-08

Problem: invalid UUID and constraint messages were unstable/leaky; stale details were missing.

Correction: controller UUID validation and safe SQLSTATE mapping were added. Stale errors expose only numeric `{ current, expected }`; 5xx remains sanitized.

Files: controller/service/frontend DTO/contract suite.

Tests: seven non-DB behavioral mapper/envelope assertions passed.

Result: corrected in Events-owned code.

### M11.2A-AUD-09

Problem: source-string checks were presented as behavioral proof and mandatory coverage was incomplete.

Correction: results now distinguish 70 static smoke assertions from 7 non-DB behavioral assertions. The DB suite uses canonical household reservation/completion, exercises direct-write probes, lifecycle, temporal split, validation, V0 bridge, replay and cleanup, and reports known blockers instead of converting them into passes.

Files: contract suite, DB suite and reports.

Tests: runner executed from clean reconstruction and always performed final reset/backfill verification.

Result: **BLOCKED**. The full required matrix cannot pass while AUD-01/AUD-02/AUD-06 remain, and timed/concurrent mutation coverage is not complete.

### M11.2A-AUD-10

Problem: open-ended `other` location payload.

Correction: allowed keys, value types, string lengths, coordinate ranges and 2048-byte payload limit are frozen in SQL and TypeScript. `home` remains `{}`.

Files: migration and frontend DTO.

Tests: schema smoke assertions passed; DB constraints are part of clean reconstruction.

Result: corrected within Events ownership.

## 4. Security and RLS corrections

- Actor account/person/member remain derived from auth context.
- Cross-household and inactive-member reads were rejected in DB probes.
- Series and participant direct writes are privilege-revoked.
- Event direct delete is privilege-revoked.
- Event direct insert/update remain a confirmed P0/P1 blocker because the shared V0 mutation surface still depends on them.
- SECURITY DEFINER functions use `pg_catalog, public` search paths.

## 5. Recurrence corrections

- Separate series and concrete occurrence identity are preserved.
- Split creates a new series and moves only the boundary/following rows.
- Timed and all-day transformations use distinct delta semantics.
- Duration/type-changing temporal series patches fail atomically.
- Whole-series scheduling is applied rather than discarded.
- V0 recurrence changes are bridged by the normalization trigger.

## 6. Personal ownership corrections

Personal read context is person-based and does not require active household selection. Mutation support intentionally fails closed because neither `planner_idempotency_keys` nor `audit_events` can represent the required person-only ownership envelope without a household. No fake anchor or competing store was introduced.

## 7. Lifecycle corrections

The explicit prior lifecycle is persisted during trash. Restore of draft and cancelled fixtures passed. Invalid update/cancel/reactivate/restore states are guarded for occurrence mutations; equivalent schedule/cancel/trash actions return canonical noops without audit.

## 8. Time and recurrence validation

IANA lookup, strict end/duration exclusivity, positive duration bounds, all-day semantic date ranges, closed recurrence keys and bounded recurrence interval/count are enforced in the migration.

## 9. Idempotency and audit corrections

`audit_events` now represents effective mutations only; it is no longer the Event replay ledger. Household paths use the canonical reserve/complete flow. Exactly-one audit was observed for create and split replay. Shared concurrency and abort/recovery defects remain blocking and were not patched locally.

## 10. V0 compatibility corrections

No V0 source was modified. V0 insert and recurrence-update probes passed, Event IDs were preserved, and M8 regression remained 115/115. The need to keep direct authenticated Event insert/update is the reason AUD-02 cannot be closed by Events alone.

## 11. API and error corrections

UUIDs are rejected before RPC. Public errors use stable codes/messages, SQL identifiers are not copied, stale errors return 412 `version_conflict_v2` with sanitized details, and the frontend publishes the canonical error shape.

## 12. Test coverage additions

- static smoke and behavioral results are separately counted;
- canonical replay and conflicting payload;
- direct Event/participant mutation probes;
- invalid IANA/equal end/end-plus-duration;
- all-day temporal split and offset preservation;
- draft/cancelled trash-restore;
- V0 recurrence insert/update bridge;
- concurrent reservation and stranded-reservation blocker probes;
- cleanup in `finally` and post-reset zero-fixture/backfill checks.

## 13. Files modified

Only the authorized Event V1 migration, controller/context/service, frontend DTO/service, three M11.2A scripts and two implementation reports are in the working inventory. The independent audit report remains unmodified.

## 14. Commands executed

```text
git branch --show-current
git rev-parse HEAD
git status --short / --porcelain=v2
git diff --check
git diff --name-status <base>
git ls-files --others --exclude-standard
node --check (3 Event V1 backend files and 3 M11.2A scripts)
node scripts/planner_m11_2a_event_contract_tests.js
node scripts/planner_m11_2a_event_database_tests.js
node scripts/planner_m11_2a_event_test_runner.js
node scripts/planner_v1_m8_tests.js
supabase db reset --local --no-seed --yes (under Events lock, including runner resets)
```

## 15. Test results

- JavaScript syntax: PASS.
- Contract suite: PASS, 70 static assertions + 7 non-DB behavioral assertions.
- Clean migration reconstruction: PASS.
- DB/RLS suite: BLOCKED after broad behavioral passes; it reported direct Event insert/update, personal create, concurrent reservation and failed-reservation recovery defects.
- V0 M8: PASS, 115/115.
- TypeScript compiler: unavailable; no global or local `tsc` found and no dependency was installed.
- Full runner: expected FAIL/BLOCKED because the primary DB suite found required blockers.
- Final runner cleanup: PASS, reset completed, six clean assertions passed.

## 16. Supabase reconstruction and cleanup

The local database was reconstructed from zero with the corrected migration. After the blocked primary DB suite, the runner's unconditional cleanup reset completed. Post-reset verification found zero M11.2A fixtures and zero blockers for all five non-total backfill counters. Events then released its lock to `FREE`; Plans acquired it immediately afterward. Final observed shared lock state is `RESERVED_PLANS`, so Events performed no further DB command. Remote Supabase was not accessed.

## 17. Integration Requests

Existing requests retained:

- `IR-EVENT-ROUTE-001`
- `IR-EVENT-HOME-LOCATION-001`
- `IR-PLAN-002`
- `IR-CALENDAR-001`
- `IR-EVENT-PERSONAL-AUDIT-001`

Proposed requests (not written to the Integration Queue):

- `PROPOSED IR-EVENT-PERSONAL-IDEMP-001`: add a canonical person-scoped idempotency/audit envelope without household/member authority.
- `PROPOSED IR-EVENT-V0-MUTATION-001`: migrate V0 Event writes to an approved Integration/V0 RPC bridge so direct authenticated table insert/update can be revoked.
- `PROPOSED IR-EVENT-IDEMP-RECOVERY-001`: make first reservation concurrency-safe and add an approved abort/recovery operation for failed canonical mutations.

## 18. Remaining risks

- AUD-01/AUD-02/AUD-06 remain release-blocking, not residual risks.
- AUD-09 mandatory coverage remains incomplete until those contracts are resolved and all concurrency/temporal probes can pass.
- Independent defensive reauditoria is still pending.
- Remote Supabase is unknown/not accessed.
- Shared route registration, semantic home resolution, Event/Plan adapter and combined Calendar remain deferred to their existing Integration Requests.
- TypeScript compiler was unavailable.

## 19. Required next action

Control General and Integration must resolve `PROPOSED IR-EVENT-PERSONAL-IDEMP-001`, `PROPOSED IR-EVENT-V0-MUTATION-001` and `PROPOSED IR-EVENT-IDEMP-RECOVERY-001`. Then resume M11.2A R1, close AUD-01/AUD-02/AUD-06/AUD-09, rerun the complete DB/RLS/concurrency matrix, clean reconstruction and independent defensive reauditoria.
