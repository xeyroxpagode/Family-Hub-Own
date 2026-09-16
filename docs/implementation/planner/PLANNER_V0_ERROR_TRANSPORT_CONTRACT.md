# Planner V0 Error and Transport Contract

> This document was reconstructed during G0.3.1 closure from the implemented G0.2 contracts, source code, tests and repository history. It describes the verified current state and is not presented as contemporaneous evidence from the original G0.2 execution.

## Canonical error envelope

```ts
{
  error: {
    code: string;
    message: string;
    request_id: string | null;
    details?: unknown;
  }
}
```

Planner controllers call `sendApiError`; G0.3.1's global compatibility middleware guarantees the same shape for other active routes. An already canonical body is not double-wrapped.

## Status contract

| Status | Meaning/examples |
| ---: | --- |
| 400 | malformed header/body (`invalid_expected_version`, invalid key) |
| 401 | missing/invalid authentication |
| 403 | capability, active-household or RLS denial |
| 404 | entity/route not found |
| 409 | idempotency key conflicts/in-flight policy where applicable |
| 412 | `version_conflict_v2` |
| 422 | required mutation/idempotency/version header absent |
| 500+ | redacted internal failure |

For 5xx the public message is `Error interno.` and `details` is omitted. Server logs retain code/request ID and diagnostics without returning stack/SQL details.

## Request identity

Every request receives `X-Request-Id`. Incoming values are accepted only when they match `[A-Za-z0-9._:-]{1,128}`; otherwise Core generates a UUID. The value is exposed as `req.requestId`, returned in the response header and copied to `error.request_id`.

The middleware is global and precedes JSON parsing, routes, 404 and final error handling.

## Mutation identity

Planner mutations require `X-Mutation-Id` with the same safe correlation format. Missing required identity produces `422/mutation_id_required`. A valid value becomes `req.mutationId` and is echoed as `X-Mutation-Id`, including contract-error responses because request context runs first.

## Idempotency-Key

Create and versioned Planner mutations require `Idempotency-Key`; reads do not. Missing/invalid values produce `422/idempotency_key_required` or `400/invalid_idempotency_key`. The Planner persistence adapter hashes the request contract, reserves by household/member/key/operation and returns the stored status/body on exact replay. A reused key with different input is rejected.

## If-Match and validation

Versioned entity mutations require `If-Match` or numeric `expected_version`. Quotes around the header are accepted. Value must be an integer `>=1`.

```text
missing -> 422 expected_version_required
invalid -> 400 invalid_expected_version
stale   -> 412 version_conflict_v2
```

Stale details contain only numeric `current` and `expected`. Create endpoints do not require If-Match.

## Operation policies after G0.3.1

| Kind | Mutation ID | Idempotency | Version |
| --- | --- | --- | --- |
| `READ_ONLY` | N/A | N/A | N/A |
| `CREATE_IDEMPOTENT` | required | required | N/A |
| `VERSIONED_MUTATION` | required | required | required |
| `NON_VERSIONED_MUTATION` | required | optional | N/A |
| `AUTH_SESSION_MUTATION` | optional | N/A | N/A |

Core validates the mechanism; each endpoint/domain chooses its policy. Auth is not forced into Planner semantics.

## Frontend parsing

Shared `requestJson` sends bearer auth and request identity, applies explicit operation kind, serializes JSON/FormData, reads canonical or legacy-compatible errors and throws `ApiError` containing status, code, request ID and sanitized details. Planner-specific user messages are registered through the domain error catalog rather than embedded in Core.

## Abort and timeout

Every request has an internal `AbortController` linked to an optional external signal and timeout through `createRequestControl`. Cleanup removes timers/listeners and the global request registry entry. Abort throws `AbortError`, not `ApiError`, allowing household/session transitions to suppress a user-visible functional error.

## Redaction

Development request logging redacts sensitive body fields and never logs bearer tokens. Backend 5xx logs stay server-side. Runtime/test commands print environment variable names and status only; tokens and QA credentials remain process-local.

## Global compatibility after G0.3.1

`errorEnvelopeMiddleware` converts active legacy flat bodies into the canonical shape while preserving status and request identity. Retirement requires migrating all controllers to `sendApiError` and verifying clients. Planner is already canonical for its main controllers.

## Runtime tests

The reconstructed G0.2 suite currently verifies:

- invalid bearer -> 401 canonical envelope;
- 404/403 canonical envelope;
- response/header request-ID correlation;
- mutation-ID echo;
- missing idempotency -> 422;
- exact replay returns 201 and the same entity ID;
- missing If-Match -> 422;
- stale If-Match -> 412 with code/current/expected;
- cleanup of created test tasks.

The Core frontend suite separately verifies timeout and external abort propagation. Boundary tests verify global middleware order and compatibility.

Commands:

```powershell
$env:API_BASE_URL='http://127.0.0.1:3101'
node scripts/planner_g0_2_runtime_runner.js
npm.cmd run test:core
```

Current G0.2 runtime evidence: **9/9 blocks, 115 assertions, exit code 0, fixture cleanup PASS**. No secrets were persisted.
