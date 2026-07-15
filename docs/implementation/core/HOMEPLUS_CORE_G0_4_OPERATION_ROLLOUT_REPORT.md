# HomePlus Core — G0.4 Operation and Rollout Closure Report

## 1. Metadata

| Field | Value |
| --- | --- |
| Date | 2026-07-14 |
| Branch | `v1` |
| Commit audited | `c7f7a06ed18f06f90a10d51dafd6e10b18acec16` |
| Scope | global operation/rollout infrastructure; Planner first consumer |
| Product UI | unchanged |
| Commit/push | no/no |
| Final status | `G0.4 STATUS: PASSED` |

## 2. Baseline

Preconditions matched: clean `v1`, expected integration commit at HEAD, Node v24.13.0, npm 11.6.2, Supabase CLI 2.90.0, G0.3.1 present, and Core boundary tests showed no Core→Planner dependency. Local/remote migrations were 31/31 before G0.4.

Baseline results: frontend TypeScript PASS; backend syntax PASS (56 JS); backend ESLint PASS; Core/backend 23 PASS; Core/frontend 15 PASS; G0.3 46 PASS; G0.2 runtime 115 PASS on isolated port 3101; DB lint PASS with two pre-existing unused-variable warnings; Planner schema checks PASS; migration parity PASS; diff-check PASS. Root test dependencies were declared/locked but absent from the checkout and were installed without adding a dependency.

An unrelated stale backend process on port 3001 returned 404 for capabilities; the current source on isolated port 3101 passed all G0.2 contracts. No source regression was hidden.

## 3. Initial operation inventory

| Concern | Initial state | Evidence | Scope | Gap |
| --- | --- | --- | --- | --- |
| Feature flags | MISSING | no registry/provider/name | global | no authority |
| Server evaluation | MISSING | none | global | frontend could invent policy |
| Frontend projection | MISSING | none | global | no lifecycle/cache |
| Rollout | MISSING | none | global | no kill/override |
| Telemetry | PARTIAL | `plannerObservability`, console | Planner | diagnostics only |
| PII redaction | PARTIAL | API logging redaction | mixed | no recursive schema gate |
| Durable audit | MISSING | no `audit_events` | global | no append-only authority |
| Activity log | LEGACY_DUPLICATE | `planner_activity_log` | Planner | best-effort/content snapshots |
| Outbox | MISSING | none | global | no atomic delivery |
| Worker | MISSING | none | global | no claims/handlers |
| Retry | MISSING | none | global | no backoff/dead-letter |
| Correlation | PARTIAL | request/mutation IDs | global/Planner | stopped before audit/outbox/telemetry |

## 4. Final architecture

Core mechanisms are registries/evaluators/validators, privacy gates, audit/outbox tables/functions, handler registry, retry policy and processor. Composition roots register Core and Planner policies. Planner owns `planner.search_entry`, Planner telemetry definitions and the adopted `task.complete` action. Core libraries import no Planner code.

```text
Domain policy -> Core registry/evaluator/provider
HTTP request -> authenticated context -> server flag projection
Planner task.complete -> one DB RPC -> task update + audit append
Domain transaction with side effect -> audit + outbox enqueue
Worker -> safe claim -> registered handler -> success/retry/dead-letter
```

## 5. Feature flag registry

Definitions are validated for stable namespaced key, description, owner, default, exposure, environments and expiry. Duplicate/unknown/malformed definitions fail or deny safely. Planner registers its definition through the composition root rather than a Planner engine.

## 6. Planner Search flag

`planner.search_entry` exists, is client-visible and defaults false. It can be overridden/killed server-side. No Search icon, route, screen, endpoint or product behavior was added; `planner_search_opened` is reserved but not emitted.

## 7. Rollout

Precedence is global process kill, persisted kill, lifecycle/environment, household override, global override, default. Optional percentage rollout uses deterministic household buckets 0–99 from SHA-256; 0–100 is constrained. No email/name/person identity is used.

## 8. Frontend projection

Authenticated `/api/feature-flags` returns booleans only. Frontend storage is account+household scoped, failures become `{}`, household switch clears A before B is used, and sign-out clears the session. Server-only metadata is not projected; the frontend does not calculate rollout.

## 9. Telemetry

The global provider has registrable schemas, primitive allowlists, no-op/console/test sinks and safe correlation. No external analytics dependency was installed. G0.4 emits flag projection/evaluation, Planner capability and adopted mutation events, plus processor events.

## 10. PII policy

Recursive key/value inspection and 4096-byte limits protect telemetry, audit metadata and outbox payloads. Direct/nested email, phone, content fields, Search queries, tokens, headers, raw payload/body and stacks are rejected. Only closed categorical/technical properties are accepted.

## 11. Event catalog

Seven requested Core events and three active Planner events are registered. `planner_search_opened` is registered as reserved only. No speculative product event set was created.

## 12. Durable audit

`audit_events` is UUID-based, server-timestamped, actor/household/aggregate indexed, correlated and metadata-versioned. Client access is revoked. A trigger rejects ordinary update/delete, including service-role DML. Failure is transactional/visible.

## 13. Outbox

`outbox_events` has minimal versioned payload, unique dedupe scope, closed statuses, polling indexes, leases, attempts, correlation and optional audit link. It is server-only and distinct from audit/telemetry/logs.

## 14. Transactions

`record_audit_and_enqueue_outbox` is the reusable atomic primitive for a domain RPC that has a real side effect. Tests prove rollback of the domain mutation also rolls back audit/outbox. Node best-effort double-write is not accepted. Planner completion uses a separate task+audit transaction because it has no side effect.

## 15. Processor

The processor claims with `FOR UPDATE SKIP LOCKED`, dispatches registered handlers, completes under lease ownership, persists only sanitized error codes, and recovers expired leases. Official commands process, inspect counts and manually retry dead letters.

## 16. Retry

Maximum five attempts; bases after failures 1–4 are 30s/2m/10m/30m with deterministic ±10% jitter. Handler timeout is 15s and lease default 60s. Validation/permission/missing-handler errors are permanent. Attempt five dead-letters. Handlers must use event/dedupe identity idempotently.

## 17. Correlation

Request ID remains one HTTP request; mutation ID remains one intent; audit UUID identifies authority; outbox UUID identifies delivery; telemetry carries safe request/mutation references but is not authority. Retries preserve outbox/mutation/dedupe and get their own worker identity.

## 18. Planner integration

`task.complete` was selected because it is existing, versioned and low risk. The RPC locks and updates the task, validates the authenticated account/active membership, and appends audit with request/mutation correlation. The response exposes `correlation.audit_event_id`. It deliberately creates no outbox row.

All create/update/complete/verify/cancel/close/reopen/trash/restore actions were evaluated as audit candidates. Only completion migrates in G0.4; broad mutation rewrites were avoided.

## 19. Migrations

New migration: `20260714010000_homeplus_g0_4_operation_rollout.sql`. It creates override/audit/outbox schema, constraints, RLS/grants, privacy function, append-only trigger, atomic enqueue, worker transition functions and Planner adoption RPC. `supabase db reset` applied the entire history locally. Rollback requires a forward reviewed migration and worker drain; no applied file is edited.

## 20. Tests

Final evidence: Core G0.4 contracts 33 PASS; DB contracts 27 PASS; authenticated projection runtime 5 PASS. Core regression is 23 backend + 19 frontend; G0.3 is 46; G0.2 runtime is 115. Coverage includes known/unknown/default/override/kill/environment/deterministic rollout/server-only projection; telemetry schema/PII/size/correlation/sinks; audit append/immutability/access/privacy; atomic rollback/dedupe/claim/success/retry/crash/dead-letter/manual retry; Planner transactional adoption.

## 21. Official commands

```powershell
npm.cmd run test:feature-flags
npm.cmd run test:telemetry
npm.cmd run test:audit-outbox
npm.cmd run test:g0.4:runtime
npm.cmd run test:g0.4
npm.cmd run outbox:process
npm.cmd run outbox:inspect
npm.cmd run outbox:retry -- <event-uuid>
```

## 22. Files

Created: Core privacy/flag/telemetry/outbox libraries and config, domain flag/event definitions, feature route/controller/service, outbox CLI/services, frontend provider/store/service, migration, three test runners and four G0.4 documents. Modified: backend composition/Planner context+completion+capabilities, frontend composition/lifecycle/tests, root scripts/gitignore and Core/Planner documents.

## 23. Dependencies

No new runtime or dev dependency was added. Existing locked root TypeScript packages were installed locally to make declared test commands executable.

## 24. Compatibility

Existing API clients tolerate the optional `correlation` field on completion. Idempotency replay stores it with the response. `planner_activity_log` remains historical/domain activity and is not copied into audit; task completion stops duplicate activity writes. Other Planner activity writes remain temporary compatibility until transactional audit adoption.

## 25. Risks

- The current override DB allowlist requires a migration for each new persisted flag.
- Audit retention deletion intentionally has no ordinary path; policy/maintenance is future authorized work.
- Only one Planner mutation is transactionally adopted; remaining action migration is explicit follow-up debt, not hidden PASS for those actions.
- Worker deployment/scheduling is operational environment work; the official one-shot command is restart-safe.
- The linked remote schema has three pre-existing lint errors in legacy Finance/invitation/household functions that are absent from local migrations and unrelated to G0.4. They were not changed because Finance and unrelated legacy repair are outside scope. Local DB lint passes; targeted remote G0.4 schema verification passes.
- Remote physical backup service reports WALG enabled, PITR disabled and no timestamp in the CLI list. The migration is additive; recovery uses the provider backup process or a reviewed forward rollback, never destructive ad-hoc DDL.

## 26. Rollback

Kill `planner.search_entry`; stop workers; disable new enqueue/adopted RPC callers; reconcile pending deliveries; revert application consumers; use a new reviewed rollback migration only after data retention/export decisions. Never drop an undelivered outbox or authoritative audit blindly. Frontend projection can be removed independently after keeping default false.

## 27. Final status

```text
G0.4 STATUS: PASSED
```

The complete static/runtime/local-schema/targeted-remote-schema sweep passes and migration parity is 32/32. Planner V1 and G0.5 were not started.

## 28. Final console report

```text
HOMEPLUS CORE — G0.4 COMPLETED

Status: PASSED
Branch: v1
Commit audited: c7f7a06ed18f06f90a10d51dafd6e10b18acec16

Feature flag registry: PASS
Server evaluator: PASS
Frontend projection: PASS
Planner Search flag: planner.search_entry / default false
Kill switch: PASS
Rollout: deterministic household bucket / PASS

Telemetry provider: PASS
Event schemas: PASS
PII protection: PASS

Audit durable: PASS
Audit append-only: PASS
Outbox: PASS
Transactional enqueue: PASS
Processor: PASS
Retry: PASS
Dead-letter: PASS
Correlation: PASS

Frontend TypeScript: PASS
Backend syntax: PASS (73 files)
Backend ESLint: PASS
G0.2 tests: PASS (115)
G0.3 tests: PASS (46)
Boundary tests: PASS (23 backend + 19 frontend)
G0.4 tests: PASS (33 contracts + 27 DB + 5 runtime)
DB lint: PASS local; two pre-existing warnings
Local schema checks: PASS
Remote schema checks: PASS for all G0.4 objects; unrelated legacy drift documented
Migration parity: PASS (32/32)
git diff --check: PASS

Files created: 28
Files modified: 16 (package-lock has no content diff)
New migrations: 1
Dependencies installed: 0 new; declared lock dependencies materialized locally
Reports created: 4

Productive behavior changed: infrastructure only; task.complete now writes authoritative audit
Planner V1 implemented: NO
Search implemented: NO
G0.5 implemented: NO
Commit created: NO
Push performed: NO

Next authorized phase: G0.5 only if G0.4 PASSED
```
