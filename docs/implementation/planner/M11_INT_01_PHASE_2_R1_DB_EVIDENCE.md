# M11.INT-01 Phase 2 R1 DB Evidence

Date: 2026-07-23
QA Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\qa`
Target read-only: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
Database target: local `127.0.0.1:54322`
Remote Supabase: NOT ACCESSED
Lock: FREE (released by QA R1 Reaudit at 2026-07-23T23:30:00Z)
Final state: CLEAN

---

## Probe helper index

New probes created under `docs/implementation/planner/qa-evidence/`:
- `m11_int_01_phase2_r1_f02_f03_probe.js` — F02 hash vectors + F03 privilege matrix + DELETE behavioral
- `m11_int_01_phase2_r1_f02_bytea_probe.js` — F02 bytea cast diagnostic (unicode, escapes, quotes, newlines)
- `m11_int_01_phase2_r1_f04_probe.js` — F04 three-way recovery (9 ambiguous vectors)
- `m11_int_01_phase2_r1_f05_probe.js` — F05 exactly-once audit (effective, replay, concurrent, noop, failed, lost, rollback, dedup index, dedup concurrent)
- `m11_int_01_phase2_r1_f06_probe.js` — F06 legacy backfill (12 vectors: 2xx, 4xx, 5xx, null, expired)

Reused without modification:
- QA prior probe: `m11_int_01_phase2_probe.js` (catalog, hash-parity, zero-checks modes)
- QA catalog probe: `scripts/qa_m11_int_01_catalog_probe.js`

---

## Command 1: Clean reconstruction

COMMAND:
`supabase db reset --local --no-seed --yes --workdir "C:\Users\thega\Desktop\HomePlus-worktrees\integration"`

PURPOSE: Baseline DB state with all migrations applied.

EXIT CODE: 0

OBSERVED RESULT: All 35 migrations applied. `20260722090000` applied at position 35.
Backfill notice: `0 rows backfilled, 0 ambiguous/unresolvable, 0 in-flight skipped`.

COUNTS:
- migrations applied: 35
- `20260722090000` counted: 1
- idle transactions: 0

FINDING MAPPED: F01–F07 baseline; clean reconstruction

CLEANUP: Not required.

---

## Command 2: QA catalog probe — F03 repro

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_probe.js catalog`

PURPOSE: Reproduce the prior F03 failing catalog probe against R1-corrected database.

EXIT CODE: 0 (prior audit: 1 → FAIL)

OBSERVED RESULT: All assertions passed. V2 helpers SECURITY DEFINER, private.
`can_delete` = false for `authenticated` on `planner_idempotency_keys`.

COUNTS:
- migration total: 35
- target (20260722090000): 1
- helper rows: 5
- SECURITY DEFINER: 5/5
- private grant (PUBLIC/anon/authenticated EXECUTE false): 5/5
- search_path pg_catalog,public: 5/5
- V2 columns: 13
- legacy RPCs executable by authenticated: 2
- can_delete: false

FINDING MAPPED: F03 CLOSED evidence (DELETE revoked from authenticated)

CLEANUP: None.

---

## Command 3: QA hash parity probe — F02 repro original vector

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_probe.js hash-parity`

PURPOSE: Reproduce the prior F02 failing hash parity probe on the exact same input vector.

EXIT CODE: 0 (prior audit: 1 → FAIL)

OBSERVED RESULT:
```text
jsHash=a4ad15b2ae40941d50ee74a0c4a516b1e860b181751a4d7a4437e119e8f81509
sqlHash=a4ad15b2ae40941d50ee74a0c4a516b1e860b181751a4d7a4437e119e8f81509
```

COUNTS: hash parity matches: 1, mismatches: 0

FINDING MAPPED: F02 prior vector PASSES. Canonicalization aligned.

CLEANUP: None.

---

## Command 4: Standalone catalog probe

COMMAND:
`node scripts/qa_m11_int_01_catalog_probe.js`

PURPOSE: Secondary catalog confirmation.

EXIT CODE: 0

OBSERVED RESULT: 5 V2 helpers = SECURITY DEFINER, ACL = only postgres/service_role.
`20260722090000` count = 1. 0 idempotency rows, 0 audit rows.

FINDING MAPPED: F03, V2 helpers security

CLEANUP: None.

---

## Command 5: R1 canonical helpers catalog

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_r1_f02_f03_probe.js f02-helpers`

PURPOSE: Verify the three new R1 canonical text/JSON functions exist and are private.

EXIT CODE: 0

OBSERVED RESULT:
- `planner_canonical_jsonb_text_v2` — SECURITY DEFINER, search_path = pg_catalog,public, PUBLIC=NO, anon=NO, authenticated=NO
- `planner_canonical_request_text_v2` — SECURITY DEFINER, search_path = pg_catalog,public, PUBLIC=NO, anon=NO, authenticated=NO
- `planner_canonical_request_hash_v2` — SECURITY DEFINER, search_path = pg_catalog,public, PUBLIC=NO, anon=NO, authenticated=NO

COUNTS: 3 canonical helpers, all SECURITY DEFINER, all private to postgres/service_role

FINDING MAPPED: F02 static evidence (canonical infrastructure present)

CLEANUP: None.

---

## Command 6: F02 bytea cast diagnostic (unicode, escapes, quotes, newlines)

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_r1_f02_bytea_probe.js`

PURPOSE: Detect whether `planner_canonical_request_hash_v2` survives payloads
with non-trivial JSON scalar values (unicode, `\n` newlines, escaped quotes `"`,
backslashes, null-in-array). The function uses `encode(sha256(text::bytea), 'hex')`
which relies on PostgreSQL's `text::bytea` cast.

EXIT CODE: 0

OBSERVED RESULT:
- **ascii_payload** → canonical text OK, hash=`9da8181df3...` ✓
- **latin1_acute_á** → canonical text OK, hash=`0f35f1edf8...` ✓
- **spanish_ñ** → canonical text OK, hash=`2cd530bce5...` ✓
- **emoji_rocket** → canonical text OK, hash=`c1b7bbbb0d...` ✓
- **null_in_array** → canonical text OK, hash=`41f94410de...` ✓
- **backslash_string (`\\`)** → canonical text OK, hash=`9f9c7644fe...` ✓
- **escaped_quote_string (`a"b"c`)** → SQLSTATE **22P02** "invalid input syntax for type bytea" ✗
- **newline_string (`line\nbreak`)** → SQLSTATE **22P02** "invalid input syntax for type bytea" ✗

Root cause: PostgreSQL `text::bytea` does not safely encode arbitrary UTF-8 JSON
text. Characters like `"` (0x22) and `\n` (0x0A) are interpreted as octet-escape
prefix bytes instead of being converted to UTF-8 bytea. This breaks
`planner_canonical_request_hash_v2` for any payload containing these characters,
which are extremely common in real-world Planner payloads (e.g. rich text fields,
usernames with quotes, descriptions with newlines).

COUNTS: 5 PASS, 2 FAIL (each with SQLSTATE 22P02)

FINDING MAPPED: F02 NOT CLOSED — **new blocker M11-INT01-P2-R1-N2** (hash
parity fails on practical payloads with `"` or `\n` characters). This affects
reservation binding, replay detection, and completion.

CLEANUP: None.

---

## Command 7: F03 full privilege matrix + behavioral DELETE

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_r1_f02_f03_probe.js f03`

PURPOSE: Assert DELETE = false for PUBLIC, anon, authenticated on
`planner_idempotency_keys` and `audit_events`; perform real DELETE attempts
as authenticated and anon.

EXIT CODE: 0

OBSERVED RESULT:

Privilege matrix:

| Role | Table | SELECT | INSERT | UPDATE | DELETE | TRUNCATE |
|------|-------|--------|--------|--------|--------|----------|
| PUBLIC | planner_idempotency_keys | false | false | false | false | false |
| anon | planner_idempotency_keys | true | true | true | **false** ✓ | true |
| authenticated | planner_idempotency_keys | true | true | true | **false** ✓ | true |
| PUBLIC | audit_events | false | false | false | false | false |
| anon | audit_events | false | false | false | false | false |
| authenticated | audit_events | false | false | false | false | false |

Behavioral DELETE attempts:
- authenticated DELETE → SQLSTATE 42501 "permission denied", row preserved ✓
- anon DELETE → SQLSTATE 42501 "permission denied" ✓
- service_role cleanup DELETE → success ✓

FINDING MAPPED: **F03 CLOSED** (DELETE revoked from all client roles). **New
residual R1-N1**: `TRUNCATE` remains true for `authenticated` and `anon` on
`planner_idempotency_keys` (inherited from PUBLIC grant defaults not explicitly
revoked by R1's DELETE-only REVOKE). TRUNCATE is functionally equivalent to
mass DELETE and RLS cannot restrict it; this is a latent privilege risk.

CLEANUP: Service-role DELETE removed the seed row. Zero remaining.

---

## Command 8: F04 three-way recovery

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_r1_f04_probe.js`

PURPOSE: Behavioral evidence for F04 recovery classification: effect_proven,
no_effect_proven, and 9 ambiguous vectors.

EXIT CODE: 0

OBSERVED RESULT:

| Evidence class | Outcome | P0010 raised | State change |
|---|---|---|---|
| effect_proven=true | replay → completed | no | yes (→ completed) |
| no_effect_proven=true | abandoned | no | yes (→ abandoned) |
| null evidence | ambiguous | yes (P0010) | no |
| empty object `{}` | ambiguous | yes (P0010) | no |
| both absent | ambiguous | yes (P0010) | no |
| both false | ambiguous | yes (P0010) | no |
| both true | ambiguous | yes (P0010) | no |
| effect_proven=false only | ambiguous | yes (P0010) | no |
| no_effect_proven=false only | ambiguous | yes (P0010) | no |
| unknown flags only | ambiguous | yes (P0010) | no |

For each ambiguous vector: recovered_at unmodified ✓, recovery_evidence
unmodified ✓, lease_token preserved ✓, retry still P0010 ✓, no state change ✓.

After ambiguous, explicit effect_proven=true → reconstruct ✓.

FINDING MAPPED: F04 CLOSED

CLEANUP: Service-role DELETE of idempotency rows. audit_events append-only
(no delete possible; accumulated audit rows purged by final reset). No
other cleanup required for this probe.

---

## Command 9: F05 exactly-once audit

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_r1_f05_probe.js`

PURPOSE: Behavioral evidence for exactly-once audit enforcement across all
stages: effective, replay, concurrent, noop, failed stable, lost response,
failure before completion, index integrity, real concurrent dedup.

EXIT CODE: 0

OBSERVED RESULT:

| Stage | Expected | Observed | Match |
|---|---|---|---|
| Effective mutation (200) | 1 effect, 1 audit, completed | 1, 1, completed 201 | ✓ |
| Replay | 0 extra effect, 0 extra audit, same body | 0, 0, {id:"eff-1"} | ✓ |
| Concurrent same-key | loser P0009 rollback 0/0, winner 1/1 | losers P0009, 0/0, winner 1/1 | ✓ |
| Noop | 0 effect, 0 audit | 0, 0 | ✓ |
| Failed stable (412) | 1 audit, replay 412 no extra | 1, replay 412, count still 1 | ✓ |
| Lost response (commit + lost HTTP) | 1/1 committed, retry replay | 1/1, retry replay 201 | ✓ |
| Failure before completion (rollback) | 0 effect, 0 audit, in_flight | 0, 0, in_flight ✓ | ✓ |
| Audit dedup index | UNIQUE partial (mutation_id, domain, action, agg_type, agg_id) WHERE mutation_id IS NOT NULL | Indexdef confirms exact shape | ✓ |
| Real concurrent audit dedup | same ID, count=1 | same ID, count=1 | ✓ |
| Distinct legitimate audits | different mutation_ids → separate rows | count=2 | ✓ |
| Same mutation_id different action | allowed (separate row) per partial unique | separate IDs ✓ | ✓ |
| Direct duplicate insert bypass helper | 23505 unique_violation | 23505 ✓ | ✓ |

COUNTS: 0 unique violations on legitimate paths. Index exists once. Concurrent
loser P0009 rejects with 0 effect/audit.

FINDING MAPPED: F05 CLOSED

CLEANUP: Harness table drop (success). audit_events append-only remains
(handled by final reset).

---

## Command 10: F06 legacy backfill

COMMAND:
`node docs/implementation/planner/qa-evidence/m11_int_01_phase2_r1_f06_probe.js`

PURPOSE: Seed 12 legacy rows before 20260722090000, apply migration, verify
classification matches corrected documentation (5xx → abandoned, not failed_stable).

EXIT CODE: 0

OBSERVED RESULT:

| Legacy row | response_status | Expected (per corrected contract) | Observed key_state | Match |
|---|---|---|---|---|
| ok_200 | 200 | completed | completed | ✓ |
| ok_201 | 201 | completed | completed | ✓ |
| bad_400 | 400 | failed_stable | failed_stable | ✓ |
| conflict_409 | 409 | failed_stable | failed_stable | ✓ |
| precondition_412 | 412 | failed_stable | failed_stable | ✓ |
| unprocessable_422 | 422 | failed_stable | failed_stable | ✓ |
| rate_limit_429 | 429 | failed_stable | failed_stable | ✓ |
| server_500 | 500 | abandoned | abandoned | ✓ |
| bad_gw_502 | 502 | abandoned | abandoned | ✓ |
| unavail_503 | 503 | abandoned | abandoned | ✓ |
| null_status (0, expired -2h) | 0 | abandoned | abandoned | ✓ |
| expired_inflight (0, expired -2h) | 0 | abandoned | abandoned | ✓ |

Actor/account populated for all 12 ✓. Household scope correct for all 12 ✓.
No 5xx in replay-stable (completed/failed_stable).

COUNTS: total=12, completed=2, failed_stable=5, abandoned=5, in_flight=0,
mismatches=0, actor_backfilled=12, household_scope=12

FINDING MAPPED: F06 CLOSED

CLEANUP: Reset to bare state handled in a subsequent reset command.
Probe itself leaves data; supabase db reset removes all.

---

## Command 11: Migration list final

COMMAND:
`supabase migration list --local --workdir "C:\Users\thega\Desktop\HomePlus-worktrees\integration"`

PURPOSE: Verify 20260722090000 present exactly once after all probes.

EXIT CODE: 0

OBSERVED RESULT: Line `20260722090000 | 20260722090000 | 2026-07-22 09:00:00` present.

COUNTS: 20260722090000 = 1, 20260722090010 absent.

FINDING MAPPED: Clean reconstruction confirmed.

CLEANUP: None.

---

## Command 12: Database lint final

COMMAND:
`supabase db lint --local --level error --workdir "C:\Users\thega\Desktop\HomePlus-worktrees\integration"`

PURPOSE: Verify schema lint error-free after R1 corrections.

EXIT CODE: 0

OBSERVED RESULT: `Linting schema: extensions`, `Linting schema: public`. Zero
error-level findings emitted.

COUNTS: Error findings: 0.

FINDING MAPPED: Clean reconstruction; no drift.

CLEANUP: None.

---

## Command 13: Integration assert-global-clean

COMMAND:
`(from Integration worktree) node scripts/planner_m11_int_01_shared_database_tests.js --assert-global-clean`

PURPOSE: Verify Integration-level cleanup detection post-R1.

EXIT CODE: 0

OBSERVED RESULT:
- planner_idempotency_keys prefix rows: 0
- planner_idempotency_keys all rows: 0
- test harness tables: 0
- test harness functions: 0

COUNTS: assertions: 4, all PASS.

FINDING MAPPED: Cleanup sensitivity; Integration clean baseline.

CLEANUP: None.

---

## Command 14: QA zero checks final

COMMAND:
`(from QA worktree) node docs/implementation/planner/qa-evidence/m11_int_01_phase2_probe.js zero-checks`

PURPOSE: Verify zero residual QA fixtures, leases, temporary objects, tables,
functions, idle transactions.

EXIT CODE: 0

OBSERVED RESULT:
```json
{
  "qa_idempotency_rows": 0,
  "qa_leases": 0,
  "qa_tables": 0,
  "qa_functions": 0,
  "temp_relations": 0,
  "idle_transactions": 0
}
```

COUNTS: all zero.

FINDING MAPPED: Final zero checks PASS.

CLEANUP: None.

---

## Command 15: Integration contract tests (secondary evidence)

COMMAND:
`(from Integration worktree) node scripts/planner_m11_int_01_shared_contract_tests.js`

PURPOSE: Integrations contract tests as secondary evidence. Inspect
assertion counts and F07 coherence.

EXIT CODE: 0

OBSERVED RESULT: VERDICT: PASS, 76 assertions.
(Implementation Report claims 74 assertions — +2 discrepancy → F07.)

COUNTS: 76 assertions. ADAPTER-07 confirms `invokeAtomicPlannerMutationV2`
exists. ADAPTER-12 confirms `withIdempotencyV2` NOT exported. Hash vectors pass.

FINDING MAPPED: Secondary evidence for F01/F02/F07.

CLEANUP: No DB access.

---

## Command 16: Integration DB tests (secondary evidence)

COMMAND:
`(from Integration worktree) node scripts/planner_m11_int_01_shared_database_tests.js`

PURPOSE: Integration DB suite as secondary evidence. Run mainSuite. Inspect
R1 assertions and assertion count.

EXIT CODE: 0

OBSERVED RESULT: VERDICT: PASS, 93 assertions.
(Implementation Report claims 68 assertions — +25 discrepancy → F07.)

Key R1 assertions observed:
- SHARED-21-R1-01 through SHARED-21-R1-06: audit dedup (first insert, duplicate,
  concurrent — all PASS)
- SHARED-21-R1-REC-02 through SHARED-21-R1-REC-07: ambiguous recovery (null,
  empty, both false, both true → P0010; no_effect_proven → abandoned;
  row preserved — all PASS)
- SHARED-21-R1-F03-01 through SHARED-21-R1-F03-03: DELETE revoked for
  authenticated/anon, SELECT preserved

COUNTS: 93 assertions total. All PASS.

FINDING MAPPED: Secondary evidence for F03/F04/F05/F07.

CLEANUP: Harness table may remain; handled by final reset.

---

## Supabase final state

- Resets performed: 5+ (pre-probe, inter-probe, final cleanup)
- All migrations applied; 20260722090000 exactly once; 20260722090010 absent
- Final reset: `suppabase db reset --local --no-seed --yes`
- Lint: zero error findings
- Assert-clean: PASS
- Zero checks: PASS (qa_idempotency_rows=0, qa_leases=0, qa_tables=0,
  qa_functions=0, temp_relations=0, idle_transactions=0)
- Lock: FREE
- Remote: NOT ACCESSED