# M11.INT-01 Phase 2 R1 Independent Reaudit

Date: 2026-07-23
Milestone: M11.INT-01 Phase 2 R1
Reaudit of: Shared Mutation Authority Correction

---

## 1. Executive Status

This is the independent defensive reaudit by Global QA & Release of the
Integration lane's R1 correction for findings M11-INT01-P2-F01 through F07.

The prior QA audit (2026-07-23) issued `M11_INT_01_PHASE_2_AUDIT_FAIL` with
5 blocking findings (F01–F05) and 2 non-blocking (F06, F07).

Integration implemented R1 corrections and declared all seven findings CLOSED.

Following this reaudit, findings F01, F03, F04, F05, and F06 are CLOSED.
Finding F02 is NOT CLOSED due to a new reproduction of hash breakage on
practical JSON payloads containing `"` quotes or `\n` newlines (SQL `text::bytea`
cast failure → SQLSTATE 22P02). Finding F07 remains OPEN due to continued
material overstatements in the corrected Implementation Report.

**Verdict:** `M11_INT_01_PHASE_2_R1_REAUDIT_FAIL`

---

## 2. Authorization and Scope

Authorized exclusively by this reaudit instruction. Scope:
- F01 through F07 closure determination
- Regression detection (V0, migration, shared contracts)
- No domain consumption, no routes, no lockdown, no commit, no push.
- Target: Integration worktree read-only.
- Writing allowed only within QA worktree.

---

## 3. Authorities

| # | Authority | Precedence |
|---|-----------|------------|
| 1 | `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md` | Highest |
| 2 | Approved shared contracts | High |
| 3 | `M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md` | High |
| 4 | Real PostgreSQL catalog & SQL behavior | High (decisive) |
| 5 | Real Node.js adapter code | High (decisive) |
| 6 | Prior QA audit (`M11_INT_01_PHASE_2_INDEPENDENT_AUDIT.md`) | Medium |
| 7 | Prior QA DB evidence (`M11_INT_01_PHASE_2_DB_EVIDENCE.md`) | Medium |
| 8 | R1 Correction Report | Claim-to-verify |
| 9 | Corrected Implementation Report | Claim-to-verify |
| 10 | Integration suites (contract + DB) | Secondary-evidence-only |

---

## 4. Git and Worktree Snapshot

### QA (Auditor Lane)

```text
Worktree: C:/Users/thega/Desktop/HomePlus-worktrees/qa
Branch:   planner-v1-qa
HEAD:     fb4efc81b1debf5932580ef2e16cedf4afb6bb45
Status:   untracked: docs/implementation/planner/ (prior audit + qa-evidence probes),
          scripts/qa_m11_int_01_catalog_probe.js
Diff:     clean (no tracked modifications)
```

### Integration (Target Lane, Read-Only)

```text
Worktree: C:/Users/thega/Desktop/HomePlus-worktrees/integration
Branch:   planner-v1-integration
HEAD:     26e29f9684aaaea032b2ce051ac6d297081ceb8e
Base:     fb4efc81b1debf5932580ef2e16cedf4afb6bb45
```

Pre-reaudit snapshot (unchanged post-reaudit):
- 4 modified tracked files (backend code)
- 4 modified tracked files (coordination docs)
- 8 untracked Phase 2 files (reports, scripts, migration)
- No MERGE_HEAD, REBASE_HEAD, CHERRY_PICK_HEAD, REVERT_HEAD, BISECT_LOG
- No unmerged paths
- No `20260722090010`
- Integration not modified by QA (verified final `git status --short` identical)

---

## 5. Changed-File Inventory

### Tracked modified (8 files, +702/-36 lines)

| File | Lines changed |
|------|---------------|
| `backend/src/lib/mutationContracts.js` | +39 |
| `backend/src/lib/plannerIdempotencyAdapter.js` | +276 |
| `backend/src/lib/plannerMutationContracts.js` | +3 |
| `backend/src/services/planner.context.service.js` | +108 |
| `docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md` | +156/-xx |
| `docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md` | +15 |
| `docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md` | +37/-xx |
| `docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md` | +104/-xx |

### Untracked (8 files, Integration-owned)

- `docs/.../M11_INT_01_PHASE_2_R1_CORRECTION_REPORT.md` (created)
- `docs/.../M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md` (modified R1)
- `docs/.../M11_SHARED_IDEMPOTENCY_RESOLUTION_REPORT.md` (pre-existing)
- `docs/.../PLANNER_V1_PARALLEL_ACTIVATION_REPORT.md` (pre-existing)
- `scripts/planner_m11_int_01_shared_contract_tests.js` (modified R1)
- `scripts/planner_m11_int_01_shared_database_tests.js` (modified R1)
- `scripts/planner_m11_int_01_shared_test_runner.js` (modified R1)
- `supabase/migrations/20260722090000_m11_int_01_shared_mutation_authority_foundation.sql` (modified R1)

### Confirmed absent from change set

- Tasks, Events, Plans code tables: no changes ✓
- Presets/Drafts: no changes ✓
- Reliability: no changes ✓
- Frontend: no changes ✓
- Global routes: no changes ✓
- `backend/src/routes/planner.js`: no changes ✓
- `package.json`, lockfiles: no changes ✓
- Historical migrations (pre-20260722090000): no changes ✓
- Functional Freeze: no changes ✓
- Supabase config: no changes ✓
- QA worktree files: no changes ✓
- `20260722090010` (lockdown): absent ✓

---

## 6. Ownership Audit

All modified/created files reside in Integration-owned surfaces:
- `backend/src/lib/plannerIdempotencyAdapter.js` — Integration
- `backend/src/lib/mutationContracts.js` — Integration
- `backend/src/services/planner.context.service.js` — Integration
- `supabase/migrations/20260722090000` — Integration migration range
  (`20260722090000-20260722090019`)
- Coordination docs — Integration

No unauthorized surface modification detected. QA remained read-only
on Integration (final snapshot identical to pre-reaudit snapshot).

---

## 7. Finding-to-Correction Matrix

| ID | Severity | Declared Corrected Surface | Static Evidence | Behavioral Evidence Required | Reaudit Status |
|----|----------|---------------------------|-----------------|------------------------------|----------------|
| F01 | CRITICAL | `invokeAtomicPlannerMutationV2` replaces `withIdempotencyV2` | Single-RPC frontier, no mutationFn productiva, allowlist placeholder; adapter structurally atomic | Reserve/complete internal helpers still exist but NOT exported as productive frontier; no separate transactions | **CLOSED** |
| F02 | HIGH | Canonical JSON text builder + sorted compact JSON + R1 hash rewrite; claimed 10 vectors verify parity | QA prior vector PASSES (identical hashes). New helpers present, private. Canonical text matches JS byte-for-byte on 5 vectors. | **`"` and `\n` characters inside JSON payload values crash SQL `text::bytea` cast with 22P02** (see Command 6, DB Evidence). Common Planner content (usernames, descriptions, rich text) would break hash. JS produces valid hashes; SQL cannot. | **NOT CLOSED** (blocker R1-N2) |
| F03 | HIGH | `REVOKE DELETE ON planner_idempotency_keys FROM public, anon, authenticated` | Catalog: `can_delete=false`. Behavioral DELETE as authenticated → 42501, row preserved. Behavioral DELETE as anon → 42501. Audit_events: all DELETE=false. | SELECT/INSERT/UPDATE preserved. DELETE revoked behaviorally confirmed. | **CLOSED** — but TRUNCATE=true residual (R1-N1) |
| F04 | HIGH | Three-way: effect_proven→reconstruct, no_effect_proven→abandoned, ambiguous→P0010 | 9 ambiguous vectors (null, empty obj, both absent, both false, both true, false-only, unknown flags) → P0010 ✓, no state change ✓, retry stable ✓. effect_proven reconstruct ✓. no_effect_proven abandon ✓. | After ambiguous, explicit effect_proven reconstructs ✓. No ambiguous case reaches abandoned. | **CLOSED** |
| F05 | HIGH | Partial UNIQUE index on (mutation_id, domain, action, agg_type, agg_id) WHERE mutation_id IS NOT NULL; `planner_v2_append_audit` uses ON CONFLICT DO NOTHING | Index present exactly once. Helper uses ON CONFLICT. | Effective mutation = 1 effect + 1 audit. Replay = 0 extra. Concurrent losers P0009 rollback 0/0. Noop = 0/0. Failed stable = 1 audit. Lost response replay correct. Rollback before completion = 0/0 + in_flight. Real concurrent dedup → same ID, count=1. Direct 23505. | **CLOSED** |
| F06 | MEDIUM | Implementation Report corrected: "Legacy 5xx → abandoned" | Migration behavior unchanged (5xx→abandoned, 4xx→failed_stable, 2xx→completed). | 12 legacy vectors seeded (200,201,400,409,412,422,429,500,502,503,null_status,expired_inflight). Classification verified: 2→completed, 5→failed_stable, 5→abandoned, 0→in_flight. No 5xx replay-stable. | **CLOSED** |
| F07 | MEDIUM | Implementation Report revised — removed several overclaims | **Not corrected sufficiently**: report still lists `withIdempotencyV2` as export (line 201 — does not exist in code); `V2IdempotencyOutcome` described with properties `.effective`, `.replay_of`, `.recovered_from`, `.error`, `.audit_id` (lines 193-194 — none exist; real class has only static constants); fabricated canonical error codes `mutation_rejected`, `lease_expired`, `state_transition_invalid` listed (do not exist in code); assertion counts wrong (74 claimed → 76 real; 68 claimed → 93 real). File count in table inaccurate. | These are material discrepancies, not editorial. The Implementation Report is authoritative documentation and must describe real software accurately. | **NOT CLOSED** |

---

## 8. F01 — Atomic Frontier

### Correction Claimed

`withIdempotencyV2` (reserve RPC → mutationFn → complete RPC, 3 separate
transactions) replaced with `invokeAtomicPlannerMutationV2(context, options)`
which performs exactly one RPC call and requires the called RPC to derive
actor, authorize, arbitrate idempotency, mutate, audit, and persist replay
in a single PostgreSQL transaction.

### Static Evidence

**Adapter code** (`plannerIdempotencyAdapter.js:332-434`):
- `invokeAtomicPlannerMutationV2` exports correctly ✓
- `withIdempotencyV2` removed from exports ✓ (confirmed by contract test
  ADAPTER-12: "withIdempotencyV2 NOT exported as productive frontier")
- `callV2ReserveRpc` and `callV2CompleteRpc` remain as internal utilities,
  not exported separately as productive frontier (they are in exports but
  documented as private building blocks)
- `V2_RPC_ALLOWLIST` is an empty frozen array — placeholder, no production
  RPCs exist yet. This means `invokeAtomicPlannerMutationV2` without
  `rpcAdapter` throws 500 "no valid RPC target" ✓ (no premature activation)
- No mutationFn accepted; no separate reserve/mutate/complete paradigm
- Actor IDs derived from context (accountId, personId) not from request body ✓
- Scope validated before invocation ✓
- P0010, P0009, P0008 mapped to safe envelopes ✓

### Behavioral Evidence

The adapter frontier is structurally one RPC call. It does not execute
a reserve → callback → complete sequence. The Integration contract tests
(76 assertions) confirm `invokeAtomicPlannerMutationV2` exists and
`withIdempotencyV2` does not exist as an export.

### Regressions

None detected on F01 surface. Legacy V0 exports preserved.

### Status: CLOSED

Rationale: The non-atomic three-stage Node sequence (`withIdempotencyV2`)
has been removed. The replacement exposes `invokeAtomicPlannerMutationV2`,
a single-RPC frontier that delegates to an operation-specific SQL RPC.
The SQL building blocks (`callV2ReserveRpc`, `callV2CompleteRpc`) remain
as internal utilities, not productively exposed. The atomic frontier
design is correct; production activation waits for domain RPCs.


## 9. F02 — Hash Parity JS/SQL

### Correction Claimed

Created `planner_canonical_jsonb_text_v2` (recursive compact JSON, sorted keys,
null-stripping, identical output to JS `sortByKey` + `JSON.stringify`).
Created `planner_canonical_request_text_v2` to build canonical request text.
Rewrote `planner_canonical_request_hash_v2` to use `encode(sha256(text::bytea), 'hex')`.
Claimed 10 vectors tested including QA failing vector, all matching.

### Static Evidence

- Three canonical helper functions exist, SECURITY DEFINER, search_path =
  pg_catalog,public, not executable by PUBLIC/anon/authenticated ✓
- QA prior probe `hash-parity` mode EXIT=0 with identical hashes:
  `jsHash=a4ad15b2... sqlHash=a4ad15b2...` ✓
- Basic vectors (empty payload, null payload, nested keys, arrays, null-in-array,
  backslash escape) produce identical canonical text and matching hashes ✓
- Unicode (á, ñ, emoji) produce identical hashes ✓
- Null-stripping behavior matches JS replacer ✓

### Behavioral Evidence — Decisive

**Command 6 (DB Evidence) — bytea cast diagnostic:**
Payloads containing `"` (escaped quote) or `\n` (newline) inside JSON string
values cause `planner_canonical_request_hash_v2` to raise SQLSTATE **22P02**
"invalid input syntax for type bytea".

- `escaped_quote_string` → **22P02** ✗
- `newline_string` → **22P02** ✗

Root cause: The function uses `encode(sha256(text::bytea), 'hex')`.
PostgreSQL's `text::bytea` cast does not safely encode general UTF-8 text
for digest purposes. Characters like `"` (0x22) and `\n` (0x0A) are
interpreted as bytea escape sequences instead of being converted to their
UTF-8 byte representation.

JavaScript `hashIdempotencyRequestV2` computes valid SHA-256 hashes for
these same payloads. The SQL function cannot, producing a crash instead of
a hash. This breaks payload hash binding — a core dimension of idempotency
arbitration, replay detection, and completion.

Impact: Any Planner mutation payload containing:
- User-generated rich text with newlines
- Display names or descriptions with double-quote characters (`"`)
- Any JSON string with `\n`, `"`, or other bytea-sensitive bytes

...will cause the SQL hash function to fail. This breaks the entire
reservation→completion chain for those payloads because `payload_hash`
cannot be computed on the SQL side, making binding verification impossible.

### Status: NOT CLOSED

Rationale: The prior QA vector passes, but independent behavioral evidence
reveals a new, practical hash breakage on payloads containing `"` or `\n`.
The hash function must use `digest()` variants from pgcrypto that accept
`text` directly (`digest(text, 'sha256')` returns `bytea`; `encode(digest(...), 'hex')`
avoids the faulty `text::bytea` cast). Alternatively, use `sha256(convert_to(text, 'UTF8'))`
for explicit encoding. As delivered, F02 closure is incomplete.


## 10. F03 — DELETE Privileges

### Correction Claimed

Added `REVOKE DELETE ON TABLE public.planner_idempotency_keys FROM public,
anon, authenticated;` in migration PART J.

### Static Evidence

Catalog probe (prior QA probe, catalog mode) → `can_delete=false` for
authenticated on `planner_idempotency_keys`. All catalog probes EXIT=0.

### Behavioral Evidence — Decisive

**Command 7 (DB Evidence) — full privilege matrix:**
- `PUBLIC` DELETE on planner_idempotency_keys = false ✓
- `anon` DELETE on planner_idempotency_keys = false ✓
- `authenticated` DELETE on planner_idempotency_keys = false ✓
- `PUBLIC`/`anon`/`authenticated` DELETE on `audit_events` = false ✓
- Authenticated SELECT/INSERT/UPDATE preserved on planner_idempotency_keys ✓

**Real DELETE attempts:**
- `authenticated` DELETE → SQLSTATE 42501 "permission denied", row preserved ✓
- `anon` DELETE → SQLSTATE 42501 "permission denied" ✓
- No internal error leaked ✓
- `service_role` retains DELETE and cleanup succeeds ✓

### New Residual: R1-N1 (TRUNCATE Privilege Excess)

| Role | TRUNCATE on planner_idempotency_keys |
|------|--------------------------------------|
| PUBLIC | false |
| anon | **true** |
| authenticated | **true** |

`authenticated` retains TRUNCATE on `planner_idempotency_keys` (inherited
from PUBLIC's default `arwdDxt` grants at table creation). The R1 correction
only revoked DELETE; TRUNCATE, REFERENCES, and TRIGGER were not explicitly
revoked. TRUNCATE is logically equivalent to mass DELETE and cannot be
restricted by RLS policies. This is a latent privilege risk not covered
by F03's original scope, but noted as a residual for the lockdown migration
(`20260722090010`) to address.

### Status: CLOSED

Rationale: DELETE = false for all client roles, behaviorally confirmed
with real DELETE attempts that raise 42501. The F03 closure criteria are
met. TRUNCATE excess is filed separately (R1-N1, not blocking F03 closure).


## 11. V2 Helpers and SECURITY DEFINER

### Evidence

All 7 V2 helpers verified via catalog:
1. `planner_canonical_jsonb_text_v2` — SECURITY DEFINER, private ✓
2. `planner_canonical_request_text_v2` — SECURITY DEFINER, private ✓
3. `planner_canonical_request_hash_v2` — SECURITY DEFINER, private ✓
4. `planner_v2_reserve_idempotency` — SECURITY DEFINER, private ✓
5. `planner_v2_complete_idempotency` — SECURITY DEFINER, private ✓
6. `planner_v2_recover_idempotency` — SECURITY DEFINER, private ✓
7. `planner_v2_append_audit` — SECURITY DEFINER, private ✓

All have `search_path = pg_catalog, public`. All ACL entries show only
`postgres=X/postgres,service_role=X/postgres`. Invocation probes as
`authenticated` and `anon` confirmed permission denied ✓. Legacy RPCs
(`reserve_planner_idempotency_key`, `complete_planner_idempotency_key`)
remain executable by authenticated ✓ (transitional posture).

### Status: PASS (no standalone finding; evidence supports F01/F03/F04/F05)


## 12. F04 — Recovery Explicit

### Correction Claimed

Three-way classification: effect_proven → reconstruct to completed;
no_effect_proven → mark abandoned; ambiguous → fail closed with SQLSTATE
P0010, no state change, no reclaim permitted, row preserved. Node adapter
maps P0010 → 409 idempotency_conflict.

### Behavioral Evidence — Decisive

**Command 8 (DB Evidence):**

| Evidence | Outcome | P0010 | State change | lease preserved |
|---|---|---|---|---|
| effect_proven=true | replay → completed | no | →completed | n/a |
| no_effect_proven=true | abandoned | no | →abandoned | n/a |
| null | ambiguous | P0010 ✓ | no ✓ | ✓ |
| `{}` empty object | ambiguous | P0010 ✓ | no ✓ | ✓ |
| both absent | ambiguous | P0010 ✓ | no ✓ | ✓ |
| both false | ambiguous | P0010 ✓ | no ✓ | ✓ |
| both true | ambiguous | P0010 ✓ | no ✓ | ✓ |
| effect_proven=false only | ambiguous | P0010 ✓ | no ✓ | ✓ |
| no_effect_proven=false only | ambiguous | P0010 ✓ | no ✓ | ✓ |
| unknown flags only | ambiguous | P0010 ✓ | no ✓ | ✓ |

- Every ambiguous vector: recovered_at stays null ✓, recovery_evidence
  stays null ✓, lease_token preserved ✓, key_state stays in_flight ✓
- Retry after ambiguous: still P0010 ✓, still in_flight ✓
- After ambiguous, explicit effect_proven=true → reconstructs to completed ✓
- No ambiguous case reaches abandoned ✓
- No ambiguous case permits reclaim ✓
- No effect re-executed on ambiguous ✓
- No audit created on ambiguous ✓
- Neither effect_proven nor no_effect_proven path touches ambiguous ✓

Integration DB tests corroborate: SHARED-21-R1-REC-02 through REC-05
all raise P0010 with verified SQLSTATE. SHARED-21-R1-REC-06 confirms
no_effect_proven → abandoned.

### Status: CLOSED

Rationale: All three classified paths verified behaviorally. 9 distinct
ambiguous vectors produce P0010 fail-closed without state mutation.
After ambiguous, explicit evidence reconstructs. Contract satisfied.


## 13. F05 — Exactly-Once Audit

### Correction Claimed

Partial unique index `audit_events_mutation_identity_uidx` on
`(mutation_id, domain, action, aggregate_type, aggregate_id) WHERE mutation_id IS NOT NULL`.
`planner_v2_append_audit` uses `INSERT ... ON CONFLICT DO NOTHING`.
For non-null mutation_id, on-conflict fetches existing audit ID.
For null mutation_id (legacy), falls back to plain INSERT without dedup.

### Behavioral Evidence — Decisive

**Command 9 (DB Evidence):**

| Stage | Expected | Observed | Match |
|---|---|---|---|
| Effective mutation | 1 effect + 1 audit + completed | 1, 1, completed 201 | ✓ |
| Replay | 0 extra effect + 0 extra audit + same body | 0, 0, {id:"eff-1"} | ✓ |
| Concurrent same-key | losers P0009 rollback 0/0, winner 1/1 | both P0009, 0/0 committed, winner 1/1 | ✓ |
| Noop | 0 effect + 0 audit | 0, 0 | ✓ |
| Failed stable (412) | 1 audit + replay 412 + no extra audit | 1, replay 412, count still 1 | ✓ |
| Lost response (commit + lost HTTP) | 1/1 committed + retry replay | 1/1, retry replay 201 | ✓ |
| Failure before completion (rollback) | 0 effect + 0 audit + in_flight preserved | 0, 0, in_flight ✓ | ✓ |
| Audit dedup index | UNIQUE partial on (mutation_id, domain, action, agg_type, agg_id) WHERE mutation_id IS NOT NULL | Indexdef matches exactly | ✓ |
| Real concurrent audit dedup | same audit_id returned + count=1 | same ID ✓, count=1 ✓ | ✓ |
| Distinct legitimate audits | different mutation_ids allowed | count=2 ✓ | ✓ |
| Same mutation, different action | separate row allowed (legitimate) | separate IDs ✓ | ✓ |
| Direct duplicate insert bypass helper | 23505 unique_violation | 23505 ✓ | ✓ |

Integration DB tests corroborate:
- SHARED-21-R1-01 through R1-06: dedup first insert, duplicate, concurrent ✓
- SHARED-01 through SHARED-08: reservation, replay, completion ✓

### Status: CLOSED

Rationale: Partial unique index present exactly once with correct columns.
Helper idempotent via ON CONFLICT. Concurrent dedup verified (separate
connections, same ID, count=1). Direct insert blocked by unique index (23505).
Effective, replay, concurrent, noop, failed, lost, rollback all demonstrated.
Contract satisfied.


## 14. F06 — Legacy 5xx Backfill Documentation

### Correction Claimed

Updated Implementation Report: "Legacy 5xx → abandoned (5xx no es replay
estable; requiere politica segura de retry/recovery)". SQL migration behavior
remains unchanged (5xx → abandoned, 4xx → failed_stable, 2xx → completed).

### Behavioral Evidence — Decisive

**Command 10 (DB Evidence):**

12 legacy rows seeded at pre-20260722090000 state, migration applied,
backfill classification verified:

| Row | Status | Expected | Observed | Match |
|-----|--------|----------|----------|-------|
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
| null_status (0, expired) | 0 | abandoned | abandoned | ✓ |
| expired_inflight (0, expired) | 0 | abandoned | abandoned | ✓ |

Actor/account populated for all 12 ✓. Household scope correct for all 12 ✓.
No 5xx row classified as replay-stable (completed or failed_stable) ✓.

### Status: CLOSED

Rationale: Documentation corrected to describe actual behavior. Migration
classification verified against 12 representative vectors. 5xx = abandoned
consistently. Contract satisfied.


## 15. F07 — Documentation Coherence and Readiness

### Correction Claimed

Implementation Report updated: references QA audit findings, R1 corrections,
correct adapter shape (`invokeAtomicPlannerMutationV2`), three-way recovery,
exactly-once dedup index, DELETE revoked. Claims no longer assert clean
audit, parity verified, readiness for domain consumption, mutationFn
injected callback, or ambiguous recovery without P0010.

### Independent Evidence — Decisive

The corrected Implementation Report contains **6 material discrepancies**
between its written claims and the actual delivered software:

**1. Assertion count wrong (line 188):**
- Claims "74 assertions" for contract tests.
- Real: executed contract suite emits **76** assertions (EXIT=0, confirmed
  in QA secondary evidence run).
- Diff: +2.

**2. Assertion count wrong (line 212):**
- Claims "68 assertions, ejecutados dos veces (clean + con seed legacy)".
- Real: executed mainSuite emits **93** assertions in a single run.
- Diff: +25. The runner's "two runs" concept is structurally present but
  the second run (`--seed-legacy` mode) has different assertion count;
  the report conflates them.

**3. Fictional export listed (line 201-202):**
- Claims V2 exports include `withIdempotencyV2`.
- Real: adapter exports `hashIdempotencyRequestV2`, `invokeAtomicPlannerMutationV2`,
  `mapV2RpcError`, `V2IdempotencyOutcome`, `callV2ReserveRpc`, `callV2CompleteRpc`.
  `withIdempotencyV2` was **removed** in R1 and does not exist in the adapter.
  Contract test ADAPTER-12 confirms "withIdempotencyV2 NOT exported as
  productive frontier".

**4. Fictional class properties (lines 193-194):**
- Claims `V2IdempotencyOutcome` has `.effective`, `.replay_of`,
  `.recovered_from`, `.error`, `.audit_id`.
- Real: `V2IdempotencyOutcome` class at `plannerIdempotencyAdapter.js:310-318`
  defines only static constants: `RESERVED`, `REPLAY`, `NOOP`, `FAILED_STABLE`,
  `IN_FLIGHT`, `CONFLICT`, `ABANDONED`, `RECLAIMED`. None of the claimed
  properties exist.

**5. Fictional canonical error codes (lines 145-146):**
- Claims `CANONICAL_ERROR_CODES` includes `mutation_rejected`, `lease_expired`,
  `state_transition_invalid`.
- Real: `mutationContracts.js:146-155` defines exactly 8 canonical codes:
  `MUTATION_ID_REQUIRED`, `IDEMPOTENCY_KEY_REQUIRED`, `EXPECTED_VERSION_REQUIRED`,
  `INVALID_EXPECTED_VERSION`, `IDEMPOTENCY_CONFLICT`, `IDEMPOTENCY_IN_FLIGHT`,
  `VERSION_CONFLICT_V2`, `INTERNAL_ERROR`. The three claimed codes do not exist.

**6. File count in table inaccurate (line 274):**
- Claims "14 archivos listados arriba (12 modificados/creados + 2 docs pre-existentes)".
- Real inventory: 8 tracked modified + 8 untracked created = 16 files affected
  in the worktree. The "+2 docs pre-existentes" is ambiguous.

### Contractorially Required State

The permitted documentary state pre-QA verdict is:

```
IMPLEMENTATION CORRECTION COMPLETE
READY FOR INDEPENDENT REAUDIT
COMMIT: none
DOMAIN CONSUMPTION: not authorized
ROUTES: not authorized
LOCKDOWN: not authorized
REMOTE: not accessed
```

The Implementation Report satisfies the "COMMIT: none" and "domain consumption
not authorized" constraints. However, the material errors listed above
constitute "afirmaciones como atomic para una secuencia multi-RPC",
"ready for domain consumption antes de esta reauditoria" (implied by the
overconfidence of the corrected report's claims about hash parity and readness),
and "ready for domain consumption ..." through its inaccurate description of
exports and class properties. The report **continues to overstate readiness**
by describing capabilities that do not exist (`withIdempotencyV2` export,
outcome `.effective`, etc.) while presenting them as verified and present.

### Status: NOT CLOSED

Rationale: Six material discrepancies between reported documentation and
real code exports, class properties, error codes, assertion counts, and file
inventory. The Implementation Report is authoritative documentation that
should reflect the exact current state. It does not. F07 closure criteria
require "Sin afirmacion sobre readiness o que describan incorrectamente
el adapter." The adapter is described incorrectly in multiple substantive
ways. F07 remains open pending documentation correction.


## 16. V0 Compatibility Preserved

### Evidence

- Legacy RPCs (`reserve_planner_idempotency_key`, `complete_planner_idempotency_key`)
  remain executable by authenticated ✓
- Legacy table grants: SELECT, INSERT, UPDATE preserved for authenticated ✓
- Legacy V0 adapter exports preserved: `hashIdempotencyRequest`, `withIdempotency`,
  `parseIdempotencyKey`, `requireIdempotencyKey`, `mapRpcError` ✓
- Migration remains additive; no columns removed ✓
- `20260722090010` (lockdown) not created ✓
- No Tasks, Events, Plans tables modified ✓
- No routes modified ✓
- No DTOs modified ✓
- Clean reconstruction passes (all 35 migrations apply, 20260722090000 at
  position 35, no errors) ✓
- Legacy suites (`SHARED-11`, `SHARED-12`, `SHARED-19` in DB tests)
  continue executing ✓

### Status: V0 PASS (no regression)


## 18. Findings Summary

### Prior Findings (F01–F07)

| ID | Previous Severity | Status | Rationale |
|----|-------------------|--------|-----------|
| M11-INT01-P2-F01 | CRITICAL | **CLOSED** | Non-atomic frontier replaced by single-RPC `invokeAtomicPlannerMutationV2` |
| M11-INT01-P2-F02 | HIGH | **NOT CLOSED** | Hash parity passes prior vector but SQL `text::bytea` cast crashes on `"` and `\n` payload characters (R1-N2) |
| M11-INT01-P2-F03 | HIGH | **CLOSED** | DELETE revoked for all client roles, confirmed by real behavioral attempts |
| M11-INT01-P2-F04 | HIGH | **CLOSED** | Three-way classification verified: 9 ambiguous vectors → P0010 fail-closed, no state change |
| M11-INT01-P2-F05 | HIGH | **CLOSED** | Partial unique index + idempotent helper + real concurrent dedup → exactly-once |
| M11-INT01-P2-F06 | MEDIUM | **CLOSED** | Documentation corrected; 12 legacy vectors verified; 5xx → abandoned consistently |
| M11-INT01-P2-F07 | MEDIUM | **NOT CLOSED** | 6 material documentation discrepancies remain (fictional exports, properties, error codes, wrong counts) |

### New Blockers (Discovered During this Reaudit)

**ID:** M11-INT01-P2-R1-N2
**SEVERITY:** HIGH
**TITLE:** SQL canonical hash crash on `"` and `\n` characters in JSON payloads
**CONTRACT:** `planner_canonical_request_hash_v2` must produce valid SHA-256 for
any legal JSON payload matching the canonicalization contract.
**EVIDENCE:** DB Evidence Command 6. Payloads with `"` (escaped quotes) or `\n`
(newlines) inside JSON string values cause SQLSTATE 22P02 "invalid input syntax
for type bytea" inside `encode(sha256(text::bytea), 'hex')`. JS `hashIdempotencyRequestV2`
computes valid hashes for same payloads. SQL cannot.
**FILE/LINES:** `supabase/migrations/20260722090000_...sql`, PART C.2, line 370:
`return encode(sha256(public.planner_canonical_request_text_v2(...)::bytea), 'hex');`
**BEHAVIORAL REPRODUCTION:** Pass JSON payload with a string value containing
`"` or `\n` to `planner_canonical_request_hash_v2`. `planner_canonical_request_text_v2`
produces valid canonical text. The `::bytea` cast fails with 22P02.
**OBSERVED RESULT:** SQLSTATE 22P02, hash computation aborted.
**EXPECTED RESULT:** Valid 64-char hex SHA-256 digest for same canonical text.
**IMPACT:** Payload hash binding unavailable for any Planner mutation whose
payload contains double-quotes or newlines — extremely common in real-world
user content (descriptions, rich text, display names). Breaks reservation
binding, replay detection, and completion for these payloads.
**MINIMUM RECOMMENDED CORRECTION:** Replace `text::bytea` with
`convert_to(text, 'UTF8')` or `digest(text, 'sha256')` (pgcrypto supports
text input directly). Eliminate the legacy text-to-bytea cast dependency.
**OWNER:** Integration
**BLOCKS R1 PASS:** YES

**ID:** M11-INT01-P2-R1-N1
**SEVERITY:** LOW
**TITLE:** TRUNCATE privilege remains true for authenticated on planner_idempotency_keys
**CONTRACT:** Legacy table surface must preserve only SELECT, INSERT, UPDATE for
authenticated; destructive operations must be prohibited.
**EVIDENCE:** DB Evidence Command 7. `has_table_privilege('authenticated',
'public.planner_idempotency_keys', 'TRUNCATE')` = true. R1 correction only
revoked DELETE; TRUNCATE, REFERENCES, and TRIGGER were not revoked.
**IMPACT:** TRUNCATE is mass-DELETE equivalent and cannot be RLS-restricted.
Authenticated could wipe all idempotency rows.
**MINIMUM RECOMMENDED CORRECTION:** Add `REVOKE TRUNCATE, REFERENCES, TRIGGER ON
TABLE public.planner_idempotency_keys FROM public, anon, authenticated` to
the lockdown migration (`20260722090010`).
**OWNER:** Integration
**BLOCKS R1 PASS:** NO (latent, gated by lockdown)


## 19. Residual Risks

1. **F02 hash breakage (R1-N2)**: Currently blocking. Until `text::bytea` replaced
   with safe UTF-8 encoding, payload hash binding is unreliable for practical Planner
   payloads containing `"` or `\n` characters. Every mutation that passes such payloads
   will crash the SQL hash function → no reservation possible.

2. **TRUNCATE privilege (R1-N1)**: Authenticated retains TRUNCATE on
   `planner_idempotency_keys`. Requires explicit revocation in lockdown migration.

3. **Empty allowlist**: `invokeAtomicPlannerMutationV2` requires operation-specific
   RPCs that do not yet exist. The atomic frontier is structurally correct but
   not productively activated until domain RPCs are implemented and registered.

4. **Documentation overstatement (F07)**: The corrected Implementation Report still
   describes software features that do not exist. Downstream consumers reading the
   report may assume availability of `withIdempotencyV2`, `.effective` outcome
   properties, or error codes that are absent from the codebase.

5. **Integration suite coverage gaps**: Suite does not test hash output against
   real PostgreSQL, does not cover bytea-sensitive payloads, does not test TRUNCATE
   revocation. These are expected to be addressed in domain-level tests.


## 20. Cleanup Sensitivity

- Integration `--assert-global-clean`: PASS (4 assertions, zero fixtures) ✓
- QA `zero-checks`: PASS (qa_idempotency=0, qa_leases=0, qa_tables=0,
  qa_functions=0, temp_relations=0, idle_transactions=0) ✓
- No `|| true` or catch suppression detected ✓
- Runner propagation: failure would trigger non-zero exit ✓
- Final reset completed ✓


## 21. Supabase Final State

- Final reset: `supabase db reset --local --no-seed --yes` completed ✓
- Final migration list: `20260722090000` exactly once ✓
- Final lint: `supabase db lint --local --level error` — zero findings ✓
- Final assert-clean: 4/4 assertions PASS ✓
- Zero checks: all 6 counts = 0 ✓
- Lock: FREE ✓
- Remote: NOT ACCESSED ✓


## 22. Documentation Consistency

The corrected Implementation Report (`M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md`)
has six material discrepancies (see F07 section 15 for full enumeration):
fictional exports, fictional class properties, fictional error codes,
incorrect assertion counts, inaccurate file count.

The R1 Correction Report (`M11_INT_01_PHASE_2_R1_CORRECTION_REPORT.md`)
correctly identifies the R1 changes and does not overstate readiness.
Its declared state ("completamente addressed", "READY FOR INDEPENDENT
REAUDIT") is consistent with the lane's self-assessment posture.

The Integration Queue, Migration Ledger, Ownership Matrix, and Shared
Contracts coordination docs have been updated and are consistent with
the R1 state.


## 23. Final Git Verification

QA before-and-after: only untracked QA probes added under
`docs/implementation/planner/qa-evidence/`. No Integration files modified.
No commit.

Integration pre-reaudit and post-reaudit snapshot identical:
- HEAD: `26e29f9684aaaea032b2ce051ac6d297081ceb8e`
- 8 modified tracked + 8 untracked files unchanged
- No MERGE_HEAD, REBASE_HEAD, CHERRY_PICK_HEAD, REVERT_HEAD, BISECT_LOG
- No unmerged paths
- QA did not alter Integration state ✓


## 24. Final Verdict

```text
M11_INT_01_PHASE_2_R1_REAUDIT_FAIL
```

PASS is prohibited because:

1. **F02 NOT CLOSED** — R1-N2: SQL canonical hash function crashes on
   practical JSON payloads with `"` or `\n` characters. JS produces valid
   hash; SQL raises 22P02. Payload hash binding is broken for common
   Planner content.

2. **F07 NOT CLOSED** — Corrected Implementation Report continues to
   describe software features that do not exist (export `withIdempotencyV2`,
   `V2IdempotencyOutcome` properties, three fictional error codes) and
   reports incorrect assertion counts.

Blocking findings unresolved: F02 (regression), F07 (documentation).
F01, F03, F04, F05, F06 are independently verified as CLOSED.

State posterior: RETURN TO INTEGRATION FOR BOUNDED CORRECTION.
Correction remains within the current wave (M11.INT-01 Phase 2 R1).


## 25. Normalized Status

LANE: Global QA & Release
MILESTONE: M11.INT-01 Phase 2 R1
BRANCH: planner-v1-qa
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\qa
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
VERDICT: M11_INT_01_PHASE_2_R1_REAUDIT_FAIL
COMMIT: None. No commit was made or authorized by this reaudit.
BLOCKERS: F02 (R1-N2: SQL `text::bytea` crash on `"` and `\n` in JSON payloads);
  F07 (6 documentation discrepancies). Non-blocking residual: R1-N1 (TRUNCATE
  privilege excess on planner_idempotency_keys for authenticated).
RISKS: Hash binding unreliability for realistic payloads; documentation
  overclaim may misguide domain consumers. Domain consumption, route
  integration, lockdown, and remote deployment remain blocked.
INTEGRATION REQUESTS: Fix `planner_canonical_request_hash_v2` to use
  `convert_to(canonical_text, 'UTF8')` or `pgcrypto.digest(text, 'sha256')`
  instead of fragile `text::bytea` cast. Correct the six material
  documentation discrepancies in the Implementation Report. Then resubmit
  for independent scope-limited reaudit of F02 and F07 only.
SUPABASE: Final state CLEAN. Lock FREE. Remote NOT ACCESSED.
FILES/REPORTS:
  `docs/implementation/planner/M11_INT_01_PHASE_2_R1_INDEPENDENT_REAUDIT.md`
  `docs/implementation/planner/M11_INT_01_PHASE_2_R1_DB_EVIDENCE.md`
  `docs/implementation/planner/qa-evidence/m11_int_01_phase_2_r1/` (probes + outputs)

NEXT ACTION: Control General should treat M11.INT-01 Phase 2 R1 as FAIL.
F02 and F07 corrections are required within Integration lane. Do NOT
authorize domain consumption, route integration, lockdown, or remote
deployment. Do NOT authorize commit. Upon corrected re-submission, QA
will execute a scope-limited reaudit focused on F02 and F07 only.

---

HANDOFF PARA CONTROL GENERAL

LANE: Global QA & Release
MILESTONE: M11.INT-01 Phase 2 R1
BRANCH: planner-v1-qa
WORKTREE: C:\Users\thega\Desktop\HomePlus-worktrees\qa
BASE: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
VERDICT: M11_INT_01_PHASE_2_R1_REAUDIT_FAIL
COMMIT: none
BLOCKERS:
  - F02 (R1-N2): planner_canonical_request_hash_v2 crashes with SQLSTATE
    22P02 on JSON payloads containing `"` (escaped quote) or `\n` (newline)
    characters. Root cause: `encode(sha256(text::bytea), 'hex')` — the
    text::bytea cast is not UTF-8 safe for all valid JSON scalar values.
    JS hashIdempotencyRequestV2 works correctly for same inputs. Fix:
    replace text::bytea with convert_to(text, 'UTF8') or digest(text, 'sha256').
    Affected file: supabase/migrations/20260722090000_...sql, PART C.2, line 370.
  - F07 (documentation): six material discrepancies between corrected
    Implementation Report and real code — fictional export, fictional
    class properties, fictional error codes, wrong assertion counts,
    inaccurate file count. Affected file: docs/.../M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md.
  - F03 (R1-N1 residual): TRUNCATE privilege remains true for authenticated
    on planner_idempotency_keys. Non-blocking, gated to lockdown migration.
RISKS: Hash binding unreliable for realistic payloads; documentation
  overclaim may misguide domain consumers.
INTEGRATION REQUESTS: Bound correction of F02 and F07 within Integration
  lane. Resubmit for scope-limited reaudit (F02 + F07 only).
SUPABASE: Final state CLEAN. Lock FREE. Remote NOT ACCESSED.
FILES/REPORTS:
  docs/implementation/planner/M11_INT_01_PHASE_2_R1_INDEPENDENT_REAUDIT.md
  docs/implementation/planner/M11_INT_01_PHASE_2_R1_DB_EVIDENCE.md
  docs/implementation/planner/qa-evidence/m11_int_01_phase_2_r1/ (probes)
NEXT ACTION: Integration lane corrects F02 and F07. QA reaudits scope-limited.
  Domain consumption, route integration, lockdown (20260722090010), commit,
  remote — ALL REMAIN NOT AUTHORIZED.


## 17. Integration Suite Review (Secondary Evidence)

### Contract Tests

- Command: `(Integration worktree) node scripts/planner_m11_int_01_shared_contract_tests.js`
- Exit: 0
- Assertions: **76** (report claimed 74)
- Verdict: PASS
- ADAPTER-07: `invokeAtomicPlannerMutationV2` exists ✓
- ADAPTER-12: `withIdempotencyV2` NOT exported ✓
- ADAPTER-13: P0010 maps to `idempotency_conflict` ✓
- Hash vectors: all PASS ✓
- Syntax checks: all OK ✓

### DB Tests (mainSuite, `--seed-legacy` mode)

- Command: `(Integration worktree) node scripts/planner_m11_int_01_shared_database_tests.js`
  (mainSuite after clean reset)
- Exit: 0
- Assertions: **93** (report claimed 68)
- Verdict: PASS
- SHARED-21-R1-01 through R1-06: exactly-once audit dedup ✓
- SHARED-21-R1-REC-02 through REC-07: ambiguous recovery P0010 ✓
- SHARED-21-R1-F03-01 through F03-03: DELETE revoked ✓
- Concurrent dedup: SHARED-21-R1-05/R1-06 ✓
- No raw 23505 exposed on legitimate paths ✓

### Assessment

Integration suites corroborate F03, F04, and F05 closure. The assertion
counts differ materially from the report (76 vs 74, 93 vs 68). This
discrepancy feeds F07 (documentation coherence).

Suite strengths: real DB connection, V2 helper invocation via service_role,
true `Promise.all` concurrent dedup for SHARED-21-R1-05.

Suite limitations: regression tests are regex presence-based (not hash
comparisons against real SQL output), hash parity tests compare against
local JS reference not PostgreSQL output, no assertion for the bytea cast
issue, no assertion for TRUNCATE on planner_idempotency_keys. These
limitations do not invalidate the F03/F04/F05 passes above; they define
the gap that QA independent probes fill.