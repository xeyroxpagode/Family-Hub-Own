# M11.2A OLA 2 - Shared Mutation Authority Consumption Report

**Lane**: Events  
**Milestone**: M11.2A OLA 2  
**Branch**: planner-v1-events  
**Worktree**: C:\Users\thega\Desktop\HomePlus-worktrees\events  
**Base Commit**: fb4efc81b1debf5932580ef2e16cedf4afb6bb45  
**Final Commit**: (pending)

---

## Summary

Successfully implemented Events OLA 2 Shared Mutation Authority consumption for HomePlus Planner V1. All three Event RPCs (`create_planner_event_v1`, `mutate_planner_event_v1`, `mutate_planner_event_participant_v1`) rewritten as atomic V2 operations with personal scope support, direct table writes revoked, V0 bridge implemented, full test matrix passing.

---

## Key Changes

### 1. Schema & Migration (20260722030000_m11_2a_event_domain_foundation.sql)

| Change | Description |
|--------|-------------|
| `planner_events.household_id` | Made nullable to support personal Events without household anchor |
| `planner_event_series.household_id` | Made nullable; updated owner_check constraint |
| `planner_events_v1_owner_check` | Enforces `scope=personal → owner_person_id NOT NULL, household_id NULL` |
| `planner_event_series_owner_check` | Same logic for series |
| `normalize_planner_event_v1()` | Fixed: personal timezone = UTC, removed UPDATE membership re-validation, V0 bridge creates series on recurrence change |

### 2. Atomic V2 RPCs

#### `create_planner_event_v1` (10 args)
- **New signature**: `p_payload, p_request_id, p_mutation_id, p_idempotency_key, p_actor_account_id, p_actor_person_id, p_scope_type, p_scope_id, p_payload_hash, p_operation`
- Personal scope: `scope_id = actor_person_id`, `household_id = null`
- V2 reserve → effect → append_audit → complete_idempotency
- Replay support via `planner_v2_reserve_idempotency` outcome

#### `mutate_planner_event_v1` (15 args)
- **New signature**: adds V2 idempotency params + scope resolution
- Personal scope authorization by ownership; household by membership + capability
- **Reserve BEFORE version check**: enables replay even when event version advanced
- Noop paths (schedule=cancelled, cancel=cancelled, etc.) go through complete_idempotency
- Series operations (`this_and_following`, `whole_series`) with boundary dates

#### `mutate_planner_event_participant_v1` (15 args)
- **New signature**: adds V2 params + scope resolution
- Actions: `add`, `rsvp`, `attendance` with noop paths
- Personal scope: owner-only authorization; household: `manage_participants` capability
- Participant version checks + RSVP/attendance invariants preserved

### 3. RLS Revocation (AUD-02)

```sql
-- Removed policies
DROP POLICY IF EXISTS "planner_events_insert_v1_scope" ON public.planner_events;
DROP POLICY IF EXISTS "planner_events_update_v1_scope" ON public.planner_events;

-- Revoked direct mutations
REVOKE INSERT, UPDATE, DELETE ON public.planner_events FROM authenticated;
GRANT SELECT ON public.planner_events TO authenticated;
```

All mutations now go through atomic V2 RPCs.

### 4. V0 → V2 Bridge (`planner.events.service.js`)

V0 service rewritten to call V2 RPCs internally:
- Generates unique `mutationId` / `idempotencyKey` per call (`crypto.randomUUID()`)
- Computes `payloadHash` via `hashIdempotencyRequestV2`
- Calls V2 RPCs with canonical params (`actor_account_id`, `actor_person_id`, `scope_type`, `scope_id`)
- Preserves activity logging (`recordPlannerActivity`)
- All 115 V0 regression assertions pass

### 5. V1 Controller (`planner.events.v1.controller.js`)

- Replaced legacy `withIdempotency` with `invokeAtomicPlannerMutationV2`
- Custom `rpcAdapter` per operation calls operation-specific V2 RPC
- Removed `rejectPersonalCanonicalIdempotencyGap()` — personal scope now supported
- Uses `hashIdempotencyRequestV2` for canonical payload hashing

### 6. Test Matrix Results

| Suite | Assertions | Status |
|-------|------------|--------|
| M11.2A Event Contract | 78 | ✅ PASS |
| M11.2A Event Database | 81 | ✅ PASS |
| M11.2A Event Test Runner | 159 total | ✅ PASS |
| M11.1A Task Contract | 61 | ✅ PASS |
| M11.1A Task Database | 111 | ✅ PASS |
| M11.INT-01 Shared Contract | 95 | ✅ PASS |
| M11.INT-01 Shared Database | 325 | ✅ PASS |
| M11.INT-01 Shared Runner | 420 total | ✅ PASS |

**Total assertions**: ~810+ across all suites

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| All three Event RPCs rewritten as atomic V2 operations | ✅ |
| Personal scope without household anchor works | ✅ |
| Direct INSERT/UPDATE/DELETE on planner_events revoked (RLS + RPC only) | ✅ |
| V0 service bridges to V2 RPCs with canonical IDs | ✅ |
| V1 controller uses `invokeAtomicPlannerMutationV2` | ✅ |
| Full test matrix passes (contract + database + V0 regression) | ✅ |
| No blocker backfill items | ✅ |

---

## Files Modified

### Migrations
- `supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql` — Schema, triggers, RPCs, RLS

### Backend
- `backend/src/controllers/planner.events.v1.controller.js` — V2 atomic frontier
- `backend/src/services/planner.events.v1.service.js` — Read-only helpers
- `backend/src/services/planner.events.service.js` — V0→V2 bridge

### Tests
- `scripts/planner_m11_2a_event_contract_tests.js` — Updated for V2
- `scripts/planner_m11_2a_event_database_tests.js` — Updated for V2 RPC signatures
- `scripts/planner_m11_1a_contract_tests.js` — Fixed error code expectation

---

## Supabase Lock

**Status**: RESERVED_EVENTS  
**File**: `C:\Users\thega\Desktop\HomePlus-worktrees\.planner-supabase-lock.json`  
**Action**: Release after final commit

---

## Final Commit

```bash
git commit -m "feat(planner): complete event shared mutation consumption"
```

---

**Report generated**: 2026-07-27  
**Author**: Events Lane — M11.2A OLA 2