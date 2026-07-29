# M11 Frontend Core Integration R1 Correction Report

Date: 2026-07-29

Lane: Frontend Core Integration
Branch: planner-v1-frontend-core-integration
Worktree: C:\Users\thega\Desktop\HomePlus-worktrees\integration
Checkpoint base: PLANNER_FRONTEND_CORE_INTEGRATION_CHECKPOINT_ACCEPTED
Base foundation: 3d5df9a407f1c540a776843ca3ded81b9ba2fb1a
Backend canonical: ce805ba5f7e4ab3647a7a29727416dfe358491c5

## Scenarios Found

Plan Structure: C. No whole-structure atomic RPC existed. The previous backend had single-entity Plan graph mutations only.

Plan Links: C/A. The schema had reserved external reference columns, but M11.3A intentionally forced bound external ids to remain unbound and the DTO mapper published `pending_integration`.

## Root Cause

Structure was blocked because the frontend could not honestly save a composed Plan structure without orchestrating multiple backend calls. Links were blocked because Plan Detail did not receive a stable Task/Event destination id with safe availability metadata.

## Backend

Migration: `supabase/migrations/20260722090002_m11_frontend_core_plan_structure_links.sql`.

Endpoint: `POST /api/planner/plans/:id/structure`.

Required headers: authenticated session, `If-Match`, `X-Mutation-Id`, `Idempotency-Key`.

Request payload:

```json
{
  "operations": [
    {
      "localId": "client-local-id",
      "entityType": "milestone|measurement|manual_condition|requirement",
      "action": "create|update|set|record|complete|reopen|trash|restore",
      "entityId": "uuid-or-null",
      "expectedVersion": 1,
      "classification": "necessary|supporting",
      "parentRequirementId": "uuid-or-null",
      "sortOrder": 0,
      "payload": {}
    }
  ]
}
```

Response envelope returns `data` as the authoritative Plan graph snapshot, `outcome`, `noop`, `replay`, `planVersion`, `operationId`, `mutationId`, `idempotencyKey`, and per-operation results.

Atomicity/idempotency: the RPC reserves through `planner_v2_reserve_idempotency` before version checks, applies all changes in one SQL transaction, advances the Plan graph version once for effective changes, audits through `planner_v2_append_audit`, completes through `planner_v2_complete_idempotency`, and returns stable replay.

## Link DTOs

External requirements now expose `externalEntityId`, `bindingState`, and `linkedEntity` with `entityType`, `externalEntityId`, `planRequirementId`, authorized title/lifecycle, relation kind, and availability: `available`, `missing`, `trashed`, `forbidden`, or `stale`.

## Frontend

`PlannerPlanStructureEditScreen` calls the new endpoint via Foundation mutation identity/If-Match/idempotency, blocks double submit, preserves the same intent for retry, keeps local draft state on error, and replaces local state from the authoritative response.

`PlannerPlanDetailScreen` opens linked Tasks/Events through canonical detail routes only when availability is `available`; unavailable links show safe messages.

## Integration Requests

PROPOSED IR-FE-PLAN-STRUCTURE-001: CLOSED.
Evidence: SQL RPC, `POST /plans/:id/structure`, backend service/controller, frontend writer/editor, R1 tests.

PROPOSED IR-FE-PLAN-LINK-001: CLOSED.
Evidence: link DTO migration, backend mapper, frontend types, Plan Detail navigation tests.

PROPOSED IR-FE-PLAN-ROUTES-001: CLOSED.
Evidence: Structure route now persists through backend and Plan-to-Task/Event detail navigation is wired.

## Tests

- `npm run typecheck`: PASS.
- `node tests/static/backend-syntax.js`: PASS, 128 JavaScript files.
- `node tests/run.js planner-frontend-core-integration`: PASS, 50 assertions.
- `node scripts/planner_m11_frontend_core_r1_contract_tests.js`: PASS, 37 assertions.
- `node scripts/planner_m11_3a_contract_tests.js`: PASS, 105 assertions.
- `npm exec tsc -- -p scripts/tsconfig.planner-plans.test.json`: PASS.
- `NODE_PATH=tests/stubs node scripts/compiled-plans/scripts/planner_v1_frontend_plans_tests.js`: PASS, 106 assertions.
- `supabase db reset --local`: PASS.
- `supabase migration list --local`: PASS, includes `20260722090002`.
- `supabase db lint --local`: PASS with preexisting warnings only; no R1 warnings after cleanup.
- Catalog inspection: PASS, new RPC/helper functions present.
- Cleanup counters: idempotency in-flight 0, abandoned 0, idle transactions 0.
- `npm run test:core`: PASS.
- `npm run test:frontend`: PASS.
- `npm run test:contracts`: PASS.
- `npm run test:planner`: PASS.
- `npm run test:db`: PASS.
- `npm run test:g0.4`: PASS.
- `node front/mi-front-limpio/tests/plannerTasksContract.test.js`: functional assertions passed 84; standalone ownership guard failed on Integration-owned changed files, documented P3. Guard was not weakened.
- `git diff --check`: PASS.

## Supabase

Lock reserved by Integration for DB validation and released `FREE/CLEAN` by Integration. No Supabase reservation remains.

## Cleanup

Generated `scripts/compiled-plans` was removed. No package or lockfile changes. No remote access, fetch, pull, push, rebase, extra worktree, or branch creation.

## Risks

Residual risk is limited to DB runtime paths not covered by a full end-to-end product UI flow for hand-authored complex structure operations. Contract, reset, lint, and frontend/backend suites passed.

## Scope Excluded

No Presets/Drafts, Reliability, Search, Home global, Quick Actions global, Trash global, Attention, cosmetic refactors, package changes, or historical report edits.

## Git Final State

Pending before commit: intended R1 migration, backend Plans contract, frontend Plans wiring, focused tests, and this report.
