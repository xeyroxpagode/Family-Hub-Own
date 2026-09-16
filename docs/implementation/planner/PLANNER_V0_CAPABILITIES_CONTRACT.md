# Planner V0 Capabilities Contract

> This document was reconstructed during G0.3.1 closure from the implemented G0.2 contracts, source code, tests and repository history. It describes the verified current state and is not presented as contemporaneous evidence from the original G0.2 execution.

## Ownership after G0.3.1

HomePlus Core owns the generic engine in `backend/src/lib/capabilityEngine.js`: catalog validation, boolean projection, deny-safe lookup and enforcement errors. Planner owns `plannerCapabilities.js`: capability names, default role matrix, household configuration overrides and Planner-specific enforcement code. Planner may import Core; Core cannot import Planner.

Household permissions such as `invite_members` are a separate real Household catalog/adapter. They are not Planner capabilities. Auth has no capability requirement for login/register.

## Canonical sources

- Backend catalog and matrix: `backend/src/lib/plannerCapabilities.js`.
- Frontend type/catalog: `front/mi-front-limpio/services/plannerCapabilities.ts`.
- Context authority: authenticated user -> `people.active_household_id` -> active `household_members` row.
- Normative Planner behavior referenced by source: `docs/polish-final/planner_final_polish.md` section 6.

The backend catalog is authoritative for enforcement. The frontend catalog must match it for typing and UX only.

## Planner catalog

```text
planner.view, planner.search

task.create_household, task.create_personal, task.assign_self,
task.assign_members, task.edit_own, task.edit_any,
task.complete_assigned, task.complete_unassigned, task.complete_any,
task.verify, task.cancel_own, task.cancel_any, task.archive, task.restore

event.create_household, event.create_personal, event.edit_own,
event.edit_any, event.cancel_own, event.cancel_any,
event.manage_participants

goal.create_household, goal.create_personal, goal.edit_own,
goal.edit_any, goal.complete_own, goal.complete_any, goal.close_own,
goal.close_any, goal.manage_participants, goal.archive, goal.restore

planner.templates.use, planner.templates.manage,
planner.audit.view, planner.settings.manage
```

Total: **38**.

## Resolution

`resolveCapabilities({role, membershipStatus, household})` returns all 38 booleans. A valid grant requires:

1. membership status exactly `active`;
2. role in `coordinator|adult|adolescent|child|senior|guest`;
3. an explicit boolean household config override, or the role default matrix.

Non-boolean configuration falls back to the default. Invalid role/status returns an all-false projection.

## Projection endpoint

`GET /api/planner/capabilities` returns:

```ts
{
  capabilities: Record<PlannerCapability, boolean>;
  membershipId: string;
  householdId: string;
  role: string;
}
```

The response is scoped by the bearer token and active household. It is read-only and uses no mutation headers.

## Enforcement and deny-safe behavior

`hasCapability` is true only for literal `projection[capability] === true`. Missing projection, missing key, unknown capability, invalid membership or resolution error denies. `assertCapability` returns `403/planner_forbidden` with sanitized capability detail.

Controllers resolve server-side for every operation. Frontend helpers only hide/disable controls and never authorize a request. Services/RLS still enforce household and ownership boundaries.

## Personal and household scope

Create endpoints select the capability from request visibility:

| Entity | Personal | Household/default |
| --- | --- | --- |
| Task | `task.create_personal` | `task.create_household` |
| Event | `event.create_personal` | `event.create_household` |
| Goal | `goal.create_personal` | `goal.create_household` |

Existing-entity controllers currently assert their concrete V0 action (`*.edit_own`, `*.cancel_own`, `task.complete_assigned`, `task.verify`, `*.restore`, `goal.complete_own`, `goal.close_own`). `*_any` distinctions are additionally constrained by service/RLS ownership logic; the frontend cannot promote an `_own` grant into `_any`.

## Endpoint/action map

| Endpoint/action | Required capability |
| --- | --- |
| task/event/goal lists; goal detail; milestone list | `planner.view` |
| task create | `task.create_personal|household` |
| task update | `task.edit_own` + service/RLS ownership |
| task cancel/reactivate | `task.cancel_own` |
| task complete | `task.complete_assigned` |
| task verify | `task.verify` |
| task trash/restore | `task.restore` |
| event create | `event.create_personal|household` |
| event update/occurrence override | `event.edit_own` |
| event cancel/trash/restore/reactivate | `event.cancel_own` |
| goal create | `goal.create_personal|household` |
| goal update/milestone create-update | `goal.edit_own` |
| goal complete | `goal.complete_own` |
| goal close/reopen/fail | `goal.close_own` |
| goal/milestone trash/restore | `goal.restore` |

## Frontend integration

The frontend fetches the projection through shared `requestJson`, stores it using the Planner key containing account/household/membership, and uses Core `hasCapability/hasAll/hasAny` helpers. Absence and fetch errors remain deny-safe. G0.3.1 lifecycle invalidates the prior generation on household/session transitions.

## Tests

- Current G0.2 runtime verifies all 38 keys exist and are boolean.
- An isolated child membership with `task.create_household=false` receives `403/planner_forbidden` from the real create endpoint.
- Backend boundary tests verify Planner and Household catalogs both use Core without mixing namespaces.
- Frontend TypeScript verifies the projection union and consumers.

Commands:

```powershell
$env:API_BASE_URL='http://127.0.0.1:3101'
node scripts/planner_g0_2_runtime_runner.js
node scripts/homeplus_core_contract_tests.js
```

Current evidence: G0.2 **115 assertions PASS**, including projection and server-side denial; boundary backend **23 assertions PASS** at the closure checkpoint before final revalidation.
