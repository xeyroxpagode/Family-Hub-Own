# HomePlus Audit and Outbox Contract

**Version:** G0.4
**Owner:** HomePlus Core mechanism; domains own actions, payload schemas and real handlers

## Durable audit

`public.audit_events` records UUID, server timestamp, household, actor membership/account, domain/action, aggregate type/id, result, request/mutation IDs, metadata version and sanitized metadata. RLS is enabled, direct `anon`/`authenticated` access is revoked, and service-role grants are select/insert only.

A trigger rejects every ordinary update/delete, including service-role DML. Audit is append-only. Metadata must be an object, <=4096 bytes, version >=1 and pass recursive sensitive-data constraints. Indexes cover household/date, actor/date, aggregate/date, request and mutation.

Retention target is 24 months unless legal/product policy later sets a longer period. G0.4 implements no purge; a future retention job must use a separately reviewed privileged maintenance path because ordinary delete is intentionally impossible. Audit failure is visible and fails the transactional mutation.

## Planner adoption

`task.complete` is the first real consumer. `complete_planner_task_with_audit` validates the authenticated account/active membership, locks the row, enforces expected version, updates the task and appends `planner/task.completed` in one PostgreSQL transaction. Response correlation includes `audit_event_id`; the audit preserves request/mutation IDs.

Task completion currently has no side effect, so it intentionally enqueues no outbox event. Existing create/update/verify/cancel/close/reopen/trash/restore actions were evaluated as auditable; migration is incremental after this low-risk proof so G0.4 does not rewrite every Planner mutation at once.

## `planner_activity_log`

Classification: `KEEP_AS_DOMAIN_ACTIVITY` plus temporary `COMPATIBILITY_ADAPTER`, not audit authority.

- It preserves historical Planner state snapshots for the internal activity endpoint.
- It is best-effort, may contain domain content and is not append-only enough for global audit.
- New `task.complete` writes stop using it; durable audit is authoritative for that action.
- Other legacy Planner actions continue temporarily to avoid a risky broad rewrite.
- No historical rows are copied into `audit_events`: their content/privacy and missing correlation do not satisfy the audit contract.
- Removal condition: every required Planner action uses transactional `audit_events`, the activity endpoint has a product ownership decision, and any allowed domain timeline has a content-specific store/retention contract.

## Transactional outbox

`public.outbox_events` stores minimal versioned payload, unique household+event-type+dedupe key, closed status, attempts, next attempt, lease, processed timestamp, sanitized error code, audit link, and request/mutation correlation. Statuses are:

```text
pending -> processing -> processed
                    -> retry -> processing
                    -> dead_letter -> retry (manual operation)
```

Payload must be an object <=4096 bytes and pass recursive sensitive-data constraints. Direct client access is revoked. Poll and correlation indexes are partial where appropriate.

`record_audit_and_enqueue_outbox` appends audit and enqueues/deduplicates outbox in one database transaction for domain RPCs with a real side effect. Domain mutations that need delivery must call it inside the same PostgreSQL transaction as their state change. Node double-write after a successful mutation is prohibited.

## Processor, leases and retry

`claim_outbox_events` uses `FOR UPDATE SKIP LOCKED`; only the lease owner can complete/fail a claim. Expired leases return to retry on the next claim, enabling crash recovery. Handler registration is global and keyed by `event_type`; Core does not import domain handlers.

Policy:

- batch default 20, maximum 100;
- lease 60 seconds (allowed 15–900);
- handler timeout 15 seconds;
- maximum attempts 5;
- failures after attempts 1–4 use bases 30s, 2m, 10m, 30m with deterministic bounded ±10% jitter;
- validation, permission, invalid payload/type and missing handler are permanent;
- attempt 5 or permanent error goes to `dead_letter`;
- handlers must be idempotent by outbox event ID/dedupe key.

Only sanitized error codes persist. Raw exception, stack and payload are never stored. G0.4 registers no fictitious production side effect; tests use an in-memory `core.contract_test` handler.

## Commands

```powershell
npm.cmd run test:audit-outbox
npm.cmd run outbox:process
npm.cmd run outbox:inspect
npm.cmd run outbox:retry -- <event-uuid>
```

Worker commands require existing backend Supabase variables including `SUPABASE_SERVICE_ROLE_KEY`. Inspect prints counts only. Manual retry preserves attempts/correlation and must follow cause remediation.

## Rollback and recovery

Stop workers first. Disable new domain enqueue paths, drain/reconcile pending events, then roll back callers. Do not drop tables with undelivered/audit data. A schema rollback is a new reviewed migration, never an edit to the applied file. Restore from the normal Supabase/PostgreSQL backup process; no G0.4 command writes dumps or sensitive data.

## Tests

Database tests cover append/update/delete rejection, restricted access, sensitive metadata/payload, atomic rollback, dedupe, concurrent claim, success, retry, crash recovery, dead-letter and manual retry. Pure tests cover retry policy, timeout paths, handler success, missing handler and retryable failures.
