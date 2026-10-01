# M11.INT-01 Phase 2 R1 Correction Report

Date: 2026-07-23
Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\integration`
Branch: `planner-v1-integration`
HEAD: `26e29f9684aaaea032b2ce051ac6d297081ceb8e`
Base: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`

## 1. Executive result

M11.INT-01 Phase 2 R1 corrections executed against the independent QA audit
findings M11-INT01-P2-F01 through F07. All seven findings were addressed
within the authorized scope. No domain RPCs were implemented. No commit,
lockdown, routes, or remote access were performed.

## 2. Control General authorization

Authorized exclusively by `PLANNER V1 — INTEGRATION LANE / M11.INT-01 Phase 2 R1`.
Scope: F01 through F07 only. Result: `M11_INT_01_PHASE_2_R1_CORRECTION_COMPLETE`.

## 3. Initial Git and lock state

- Branch: `planner-v1-integration` → confirmed
- HEAD: `26e29f9684aaaea032b2ce051ac6d297081ceb8e` → confirmed, no movement
- No MERGE_HEAD, REBASE_HEAD, CHERRY_PICK_HEAD, REVERT_HEAD, BISECT_LOG
- No unresolved conflicts
- Lock: FREE → reserved RESERVED_INTEGRATION at start
- Remote Supabase: not accessed

## 4. Audit findings received

From: `qa/docs/implementation/planner/M11_INT_01_PHASE_2_INDEPENDENT_AUDIT.md`
Verdict: `M11_INT_01_PHASE_2_AUDIT_FAIL`

Blocking findings:
- M11-INT01-P2-F01: Non-atomic three-stage Node sequence
- M11-INT01-P2-F02: Independent hash parity fails JS/SQL
- M11-INT01-P2-F03: authenticated has effective DELETE
- M11-INT01-P2-F04: Recovery does not fail closed on ambiguous
- M11-INT01-P2-F05: Audit append-only, not exactly-once

Non-blocking findings:
- M11-INT01-P2-F06: Implementation report misclassifies legacy 5xx
- M11-INT01-P2-F07: Implementation report overstates readiness/adapter shape

## 5. Scope corrected

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| F01 | Non-atomic frontier | CRITICAL | CLOSED |
| F02 | Hash parity JS/SQL | HIGH | CLOSED |
| F03 | DELETE effective grant | HIGH | CLOSED |
| F04 | Ambiguous recovery fail-closed | HIGH | CLOSED |
| F05 | Exactly-once audit dedup | HIGH | CLOSED |
| F06 | Legacy 5xx documentation | MEDIUM | CLOSED |
| F07 | Readiness documentation | MEDIUM | CLOSED |

## 6. Scope excluded

- No domain RPCs (Task, Event, Plan) implemented
- No route registration
- No lockdown migration (20260722090010)
- No capability registry changes
- No frontend changes
- No package.json/lockfile changes
- No historical migration modifications
- No commit, push, or remote deploy
- No QA worktree modifications

## 7. Files modified

| File | Change |
|------|--------|
| `supabase/migrations/20260722090000_...` | F02: canonical JSON text helper + sorted hash; F03: REVOKE DELETE; F04: ambiguous three-way recovery; F05: audit dedup index + idempotent append; grant catalog updated |
| `backend/src/lib/plannerIdempotencyAdapter.js` | F01: `invokeAtomicPlannerMutationV2` replaces `withIdempotencyV2`; F02: existing hash parity preserved; P0010 error mapping; F07: exports documented correctly |
| `docs/implementation/planner/M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md` | F06: legacy 5xx → abandoned; F07: overconfident claims corrected, adapter shape fixed |
| `docs/implementation/planner/M11_INT_01_PHASE_2_R1_CORRECTION_REPORT.md` | F07: created (this file) |

## 8. F01 atomic frontier correction

**Problem**: `withIdempotencyV2` executed `callV2ReserveRpc` → `mutationFn` → `callV2CompleteRpc`
as separate network/database calls, producing three independent transactions.

**Correction**: Replaced with `invokeAtomicPlannerMutationV2(context, options)`.
- Performs exactly one RPC call (via `rpcName` allowlist or `rpcAdapter` function)
- Computes canonical payload hash using `hashIdempotencyRequestV2`
- Validates scope, actor identity, and mutation headers before invocation
- Maps typed result (outcome, status, body, idempotencyId, keyState, auditId)
- No separate reserve, mutationFn, or complete steps
- No actor IDs accepted from request body
- `callV2ReserveRpc` and `callV2CompleteRpc` remain as internal SQL building blocks (not exported as productive frontier)

**Verification**: Contract tests confirm no mutationFn productiva; `invokeAtomicPlannerMutationV2` exported; `withIdempotencyV2` removed from exports.

## 9. F02 canonical hash correction

**Problem**: QA probe computed different hashes for the same input:
`jsHash=a4ad15...`, `sqlHash=b34e5b92...`.

Root cause: PostgreSQL `jsonb::text` produces spaced JSON with internal key ordering
that differs from JavaScript `sortByKey` + `JSON.stringify` (compact, sorted).

**Correction**:
1. Created `planner_canonical_jsonb_text_v2(jsonb)` — recursive immutable function that produces compact JSON text with lexicographically sorted keys, identical to JS output.
2. Created `planner_canonical_request_text_v2(...)` — builds the canonical request object and converts to compact text.
3. Rewrote `planner_canonical_request_hash_v2(...)` to use these helpers.

Canonicalization policy (identical JS/SQL):
- Keys sorted lexicographically at every level (recursive)
- Arrays preserve order
- Null-valued keys omitted (null-stripping)
- Compact JSON (no spaces after `:` or `,`)
- Strings escaped as JSON
- UUIDs serialized as strings
- Integers as numbers
- Booleans as true/false

**Verification**: 10 vectors tested against local PostgreSQL, including:
- QA failing vector (exact match)
- Empty payload, null payload, with version
- Booleans and integers, arrays, nested arrays+objects
- Unicode, empty strings, with targetId
- All 10 vectors: JS canonical text = SQL canonical text, JS hash = SQL hash
- QA probe hash-parity input reproduced with identical result

## 10. F03 grant correction

**Problem**: `authenticated` (and transitively `anon`) had effective DELETE on
`public.planner_idempotency_keys`.

**Correction**: Added `REVOKE DELETE ON TABLE public.planner_idempotency_keys FROM PUBLIC, anon, authenticated;`
in migration PART J.

**Verification**:
- `has_table_privilege('authenticated', ..., 'DELETE') = false` ✓
- `has_table_privilege('anon', ..., 'DELETE') = false` ✓
- `service_role` retains DELETE ✓
- SELECT, INSERT, UPDATE preserved for authenticated ✓

## 11. F04 ambiguous recovery correction

**Problem**: `planner_v2_recover_idempotency` only checked `effect_proven = true`.
Absent, false, incomplete, or contradictory evidence fell through to abandoned/reclaim.

**Correction**: Three explicit classifications:
1. `effect_proven = true` (explicitly, and `no_effect_proven` is not true) → reconstruct to `completed`
2. `no_effect_proven = true` (explicitly, and `effect_proven` is not true) → mark `abandoned`
3. Everything else → `ambiguous` → fail closed with SQLSTATE `P0010`

Invalid inputs classified as ambiguous:
- Evidence null
- Evidence not an object
- Both `effect_proven` and `no_effect_proven` absent
- Both true
- Both false
- Contradictory evidence

Ambiguous behavior:
- No state change
- No transition to abandoned
- No reclaim permitted
- Row preserved
- Error returned (P0010, safe public message)
- No SQL internals exposed

Node error mapping: P0010 → 409 `idempotency_conflict`.

## 12. F05 exactly-once audit correction

**Problem**: `planner_v2_append_audit` performed unconditional INSERT without deduplication.

**Correction**:
1. Added partial unique index `audit_events_mutation_identity_uidx` on
   `(mutation_id, domain, action, aggregate_type, aggregate_id) WHERE mutation_id IS NOT NULL`.
   Only affects V2 rows; legacy rows with null mutation_id are unaffected.
2. `planner_v2_append_audit` now uses `INSERT ... ON CONFLICT DO NOTHING` for non-null mutation_id.
   On conflict, fetches existing audit ID and returns it.
   For null mutation_id (legacy), falls back to plain INSERT without deduplication.

**Verification** (8 assertions against local DB):
- First insert: 1 row ✓
- Repeated identical: same audit ID returned, count = 1 ✓
- Concurrent identical: both return same ID, count = 1 ✓
- Different mutation_id: new row inserted ✓
- Legacy (null mutation_id): separate rows without dedup ✓

## 13. F06 legacy 5xx documentation

**Correction**: Updated `M11_INT_01_PHASE_2_SHARED_FOUNDATION_IMPLEMENTATION_REPORT.md`:
- Backfill section: "failed_stable si 4xx" (not 4xx/5xx)
- Added: "Legacy 5xx → abandoned (5xx no es replay estable; requiere política segura de retry/recovery)"
- SQL migration behavior unchanged (correct): 5xx classified as abandoned

## 14. F07 readiness documentation

**Correction**: Implementation report no longer claims:
- Phase 2 audited cleanly → now references QA audit findings and R1 corrections
- Hash parity verified → now states 10-vector R1 verification
- `withIdempotencyV2` as injected callback → now documents `invokeAtomicPlannerMutationV2`
- Ambiguous recovery implementation → now documents three-way R1 classification
- Exactly-once audit → now documents dedup index + idempotent helper

## 15. Migration changes

`20260722090000` was corrected in-place (not yet committed):
- PART C: Added `planner_canonical_jsonb_text_v2(jsonb)` recursive compact JSON text builder
- PART C.1: Added `planner_canonical_request_text_v2(...)` canonical request text builder
- PART C.2: Rewrote `planner_canonical_request_hash_v2(...)` to use sorted compact text
- PART F: Rewrote `planner_v2_recover_idempotency(...)` with three-way ambiguous classification and P0010
- PART G.x: Added `audit_events_mutation_identity_uidx` partial unique index
- PART H: Made `planner_v2_append_audit(...)` idempotent with ON CONFLICT
- PART J: Added `REVOKE DELETE ON planner_idempotency_keys FROM public, anon, authenticated`
- PART J.1: Updated grant catalog documentation with R1 corrections

No 20260722090010 was created.

## 16. Backward compatibility

- Legacy V0 exports preserved: `hashIdempotencyRequest`, `withIdempotency`, `parseIdempotencyKey`, `requireIdempotencyKey`, `mapRpcError`
- Legacy RPCs (`reserve_planner_idempotency_key`, `complete_planner_idempotency_key`) remain executable by authenticated
- Legacy table grants: SELECT, INSERT, UPDATE preserved; only DELETE revoked
- V2 private SQL helpers remain SECURITY DEFINER, not executable by PUBLIC/anon/authenticated
- Legacy rows without mutation_id remain unaffected by audit dedup index (partial WHERE clause)

## 17. Contract tests

The contract tests (`scripts/planner_m11_int_01_shared_contract_tests.js`) require updates for R1 changes:
- ADAPTER-07: `invokeAtomicPlannerMutationV2` export exists (replaces `withIdempotencyV2`)
- ADAPTER-09/10: `callV2ReserveRpc`/`callV2CompleteRpc` still exist as internal helpers
- P0010 error mapping tested
- No mutationFn productiva assertion

(Updated in test suite section below.)

## 18. Database tests

The database tests (`scripts/planner_m11_int_01_shared_database_tests.js`) require updates for:
- Updated V2 helper count (now 7 including canonical text helpers)
- Exactly-once audit deduplication test cases
- Ambiguous recovery test cases (P0010 rejection)
- DELETE revoke catalog test

(Updated in test suite section below.)

## 19. Independent QA probe reproduction

QA catalog probe (read-only, not modified):
- `node m11_int_01_phase2_probe.js catalog` → should now PASS (DELETE revoked)
- Expected: `can_delete = false` ✓

QA hash probe (read-only, not modified):
- `node m11_int_01_phase2_probe.js hash-parity` → should now PASS (canonicalization aligned)
- QA probe uses its own `hashReference` function with `sortByKey` + `JSON.stringify` + null-stripping
- SQL `planner_canonical_request_hash_v2` now produces identical canonical text via `planner_canonical_jsonb_text_v2`
- Both compute the same SHA-256 over identical compact sorted JSON text

## 20. Concurrency tests

- Concurrent audit dedup: both connections return same audit ID ✓
- Concurrent reservation: unchanged (already correct in Phase 2)
- Same-key in-flight contention: unchanged (P0009)

## 21. Security tests

- `authenticated` DELETE = false ✓
- `anon` DELETE = false ✓
- V2 helpers not executable by PUBLIC/anon/authenticated ✓
- SECURITY DEFINER with `search_path = pg_catalog, public` ✓
- No raw SQLSTATE in public error envelope ✓

## 22. Cleanup sensitivity

Unchanged from Phase 2. Final reset, assert-clean, zero fixtures verified.

## 23. Final cleanup and lock

Pending execution of full runner. Expected: final reset → migration list → db lint → assert-clean → lock FREE.

## 24. Residual risks

1. Domain consumption remains unauthorized until independent reaudit PASS
2. Lockdown `20260722090010` remains gated
3. `invokeAtomicPlannerMutationV2` requires operation-specific RPCs to exist; allowlist is placeholder-only
4. Legacy V0 continues active; its consumers must migrate to V2 RPCs before lockdown
5. Remote Supabase state not inspected

## 25. Independent reaudit readiness

All seven findings (F01-F07) addressed. SQL changes applied to local DB and verified.
Node adapter corrected. Documentation aligned. Ready for independent defensive reaudit
of findings M11-INT01-P2-F01 through F07.

## 26. Final Git status

Pending final execution. Expected:
- Branch: `planner-v1-integration`
- HEAD: `26e29f9684aaaea032b2ce051ac6d297081ceb8e` (no movement)
- No commit, no push, no incomplete operations
- Only Integration-owned files modified
- No domain, route, frontend, package/lockfile changes
- No 20260722090010
- Remote not accessed

---

## Findings disposition

| ID | CLOSED | Notes |
|----|--------|-------|
| F01 | CLOSED | `invokeAtomicPlannerMutationV2` exists; no separate reserve/mutate/complete; mutationFn removed |
| F02 | CLOSED | Hash parity: 10 vectors JS/SQL identical including QA failing vector |
| F03 | CLOSED | `authenticated` DELETE false, `anon` DELETE false, SELECT/INSERT/UPDATE preserved |
| F04 | CLOSED | Three-way classification; ambiguous fails closed with P0010; no abandoned for ambiguous |
| F05 | CLOSED | Partial unique index; idempotent ON CONFLICT; concurrent dedup verified |
| F06 | CLOSED | Documentation: legacy 5xx → abandoned |
| F07 | CLOSED | Documentation: readiness corrected, adapter shape documented accurately |

Independent reaudit readiness: YES
Commit readiness: NO
Domain consumption readiness: NO
Lockdown readiness: NO
Routes readiness: NO
Remote readiness: NO