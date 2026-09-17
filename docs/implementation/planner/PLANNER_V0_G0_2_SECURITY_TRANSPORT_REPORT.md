# Planner V0 — G0.2 Security and Transport Report

> This document was reconstructed during G0.3.1 closure from the implemented G0.2 contracts, source code, tests and repository history. It describes the verified current state and is not presented as contemporaneous evidence from the original G0.2 execution.

## 1. Metadata

| Field | Value |
| --- | --- |
| Reconstructed | 2026-07-14 |
| Original G0.2 commit | `2642ba9bc622a13afe07f7ddb47e577106778db7` |
| Commit subject | `feat(planner): close V0 G0.2 security and transport contracts` |
| Current audited base | `6a018a577530d2cb28135afc41deaab59ba81d14` + uncommitted G0.3.1 closure |
| Branch | `homeplus-core-infrastructure-parity` |
| Evidence class | current runtime evidence, not original execution evidence |

## 2. Original scope

G0.2 introduced the Planner capability projection/enforcement contract, canonical API errors, request/mutation correlation, idempotent replay and optimistic concurrency. It added no product screen, Planner V1 behavior or G0.4 work.

## 3. Files implemented by the original commit

Git history records 13 changed files: the Planner capabilities controller and catalog; task/event/goal controllers; `httpErrors`; idempotency and mutation helpers; request-context middleware; Planner routes; frontend API/capability services; and `scripts/planner_g0_2_contract_tests.js`.

After G0.3.1, reusable mechanisms live in HomePlus Core (`capabilityEngine`, `mutationContracts`, global request/error middleware and frontend transport). Planner retains adapters, catalog, endpoint policies and idempotency persistence.

## 4. Capability catalog

The canonical Planner catalog contains 38 boolean capabilities in four groups: `planner.*`, `task.*`, `event.*` and `goal.*`. `GET /api/planner/capabilities` returns the complete projection plus `membershipId`, `householdId` and `role` for the active context.

## 5. Frontend projection

`plannerCapabilities.ts` defines the matching union/catalog and consumes only the server projection. UI helpers are deny-safe and do not derive grants from roles. G0.3 adds household/membership-scoped caching; G0.3.1 moves the storage mechanism into Core without moving Planner policy.

## 6. Backend enforcement

Every Planner controller obtains an authenticated `person`, active household and active membership through `getPlannerContext`, resolves the projection server-side, and asserts the required capability before calling services. RLS and ownership checks remain a second boundary. Current runtime evidence includes a child fixture with `task.create_household=false` receiving `403/planner_forbidden` for a household task create.

## 7. Error envelope

Canonical form:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "request_id": "string|null",
    "details": {}
  }
}
```

Details are omitted from 5xx and server messages are redacted. G0.3.1 applies the envelope globally and preserves Planner's direct `sendApiError` use.

## 8. Request ID

`requestContextMiddleware` validates an incoming safe identifier or generates a UUID, exposes `req.requestId` and returns `X-Request-Id`. It is now mounted globally before JSON parsing and routes, so Planner, non-Planner, 404 and parser failures share correlation.

## 9. Mutation ID

Planner mutations require a safe `X-Mutation-Id`; the selected value is exposed as `req.mutationId` and echoed as `X-Mutation-Id`. Missing required identity produces `422/mutation_id_required`.

## 10. Idempotency

Planner creates and mutations require `Idempotency-Key`. The request hash covers method, operation, params, body and expected version. `plannerIdempotencyAdapter` reserves/completes keys through Planner RPCs, detects in-flight/conflicting payloads, and replays the stored status/body. Persistence remains Planner policy, not a Core table.

## 11. Concurrency and If-Match

Mutations over existing versioned entities require `If-Match` or `expected_version`. Invalid/missing values return 400/422. A stale version returns `412/version_conflict_v2` with sanitized `details.current` and `details.expected`. Creates do not require a version.

## 12. Compatibility

`plannerMutationContracts.js`, `idempotencyHelpers.js` and `versionHelpers.js` are documented compatibility adapters over current Core/Planner ownership. `errorEnvelopeMiddleware` normalizes legacy controllers while Planner controllers remain canonical. Their retirement conditions are defined in `HOMEPLUS_CORE_CONTRACTS.md`.

## 13. Runtime test defects found during reconstruction

The original test had never been executable as written: it sent Planner API requests to `SUPABASE_URL`, omitted the bearer token from `fetch`, accepted skipped create blocks as success, had no cleanup, and expected a non-existent `source` response object. The route also registered `getCapabilities` while the controller exported `getPlannerCapabilities`, preventing the audited backend from starting. Closure corrected these demonstrated `TEST_DEFECT`/`CONTRACT_FAILURE` items only.

## 14. Tests and current evidence

On 2026-07-14, `planner_g0_2_runtime_runner.js` created an isolated local household containing coordinator and child memberships, generated a real child session in memory, and executed nine blocks:

| Block | Result |
| --- | --- |
| Capability projection (38 keys) | PASS |
| Server-side denied capability | PASS |
| Error envelope | PASS |
| Request-ID correlation | PASS |
| Mutation-ID echo | PASS |
| Required idempotency / 422 | PASS |
| Required If-Match / 422 | PASS |
| Stale If-Match / 412 details | PASS |
| Idempotent replay | PASS |

Assertions: **115**. Exit code: **0**.

## 15. Exact commands and environment

Backend runtime (isolated from an existing process on 3001):

```powershell
$env:PORT='3101'
node backend/index.js
```

Contract runtime from repository root:

```powershell
$env:API_BASE_URL='http://127.0.0.1:3101'
node scripts/planner_g0_2_runtime_runner.js
```

The harness loads ignored `backend/.env` into its own process. Required names are `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; the child contract receives only `API_BASE_URL` and an in-memory `TEST_ACCESS_TOKEN`. No values are printed.

## 16. Fixtures, effects and cleanup

The runner creates two random, email-confirmed local Auth users, two People rows, one household, one coordinator membership and one child membership. The contract creates three personal tasks, performs one update and one replay. Contract cleanup trashes 3/3 tasks. Runner cleanup then hard-deletes Planner activity/idempotency/entity rows, the household, People rows, legacy user rows and Auth users. No permanent QA token or credential is stored.

## 17. Risks

- The runtime harness is intentionally restricted to `localhost/127.0.0.1` because it uses the service role for deterministic fixture cleanup.
- Durable Planner activity/idempotency records are expected during the contract and are removed only with the isolated household.
- Running the child test without the harness leaves soft-deleted test tasks and therefore is not the recommended closure command.

## 18. Rollback

No schema or dependency was added. The route-name correction can be reverted independently, but doing so makes startup fail. Test-only changes can be reverted without affecting product code; the prior harness would again be non-executable and would lose current evidence.

## 19. Final status

```text
G0.2 CONTRACT TESTS: PASS
G0.2 CURRENT RUNTIME EVIDENCE: VERIFIED (115 assertions, exit 0)
```

This is current reconstructed evidence, not a claim about an unrecorded original G0.2 execution.

## Post-G0.5 test infrastructure update

G0.2 ahora se ejecuta desde la raíz con `npm run test:g0.2` o como parte de `npm run test:integration`. El runner final es `tests/integration/run.js`: inicia un backend aislado en un puerto libre, carga únicamente entorno local mediante `tests/helpers/environment.js`, genera una sesión QA real en proceso y delega los 115 contratos históricos a `scripts/planner_g0_2_runtime_runner.js`. El cleanup se ejecuta en `finally`, el proceso backend se espera/cierra y una falta de runtime produce `RUNTIME_REQUIRED`, nunca PASS. Resultado G0.5: 115/115 assertions PASS; fixture cleanup PASS. El wrapper histórico se conserva por compatibilidad.
