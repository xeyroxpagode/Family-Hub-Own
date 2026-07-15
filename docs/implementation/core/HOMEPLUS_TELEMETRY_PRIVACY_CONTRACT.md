# HomePlus Telemetry and Privacy Contract

**Version:** G0.4
**Owner:** HomePlus Core mechanism; domain event catalogs remain domain policy
**External analytics provider:** none

## Responsibilities

Logs are short-lived technical diagnostics and are not authority. Telemetry is schema-validated product behavior without content. Audit is a durable append-only record of important actions. Outbox is durable side-effect delivery. A table or console stream cannot serve more than one of these responsibilities.

`backend/src/lib/telemetry.js` provides a registrable catalog, `track(eventName, properties, context)`, replaceable sink, safe no-op default, explicit console sink and in-memory test sink. `backend/src/config/telemetry.js` is the composition root. Console output is enabled only with `HOMEPLUS_TELEMETRY_SINK=console`; default is no-op.

## Validation

Every event must be registered. Each property must be allowlisted and match its primitive type, enum and length. Unknown events/properties, malformed values and payloads over 4096 bytes fail. Correlation accepts only safe `request_id` and `mutation_id`; telemetry is never authority.

Initial Core events:

- `feature_flag_evaluated`
- `feature_flag_projection_loaded`
- `feature_flag_projection_failed`
- `outbox_event_enqueued`
- `outbox_event_processed`
- `outbox_event_retry_scheduled`
- `outbox_event_dead_lettered`

Initial Planner events:

- `planner_capabilities_loaded`
- `planner_mutation_succeeded`
- `planner_mutation_failed`
- `planner_search_opened` (registered/reserved, not emitted because Search UI does not exist)

## Strict content policy

Telemetry, audit metadata and outbox payload validation recursively rejects keys representing email, phone, person/display/full names, address, title, description, notes, Search query, tokens, secrets, passwords, authorization, cookies, headers, raw body/payload and stack. Values are also inspected for email, bearer/JWT material and secret-bearing URLs. Nested arrays/objects and cycles are inspected; size is bounded.

Allowed telemetry is closed categorical/technical data such as outcome, entity kind, error code, status, latency bucket, app/platform version, flag key/state, attempt, and safe request/mutation correlation. Titles, descriptions, Goal names, notes, household content, raw Search queries, full payloads and raw errors are prohibited even in development.

`event_name` is a safe structural envelope key, not person content. Domain schemas still prevent arbitrary nested data.

## Failure behavior

Privacy/schema validation fails before sink delivery. Product operations do not fail because an optional telemetry sink fails: instrumented call sites explicitly contain sink errors after validation. Audit and outbox failures remain visible and are not treated like optional telemetry.

## Tests and operations

`npm.cmd run test:telemetry` verifies valid/unknown events, allowlists, direct and nested PII, PII values, excessive payload, correlation, no-op and test sink. No real title/description/query is emitted by G0.4.

Required optional variable: `HOMEPLUS_TELEMETRY_SINK=noop|console`. An external provider requires a later authorized adapter and unchanged validation boundary.
