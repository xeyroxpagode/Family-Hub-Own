# Planner V1 — Home Summary API Contract

> Canonical HTTP contract for `GET /api/planner/summary`.
> Authority: `PLANNER_V1_M8_HOME_SUMMARY_BACKEND_REPORT.md`
> Projection version: `planner.home_summary.v1`

---

## 1. Endpoint

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/api/planner/summary` |
| Auth | Bearer token (valid session) |
| Capability | `planner.view` (deny-safe, server-side) |
| Operation kind | `READ_ONLY` — no mutation headers required |
| Cache | `Cache-Control: private, no-store, no-cache, must-revalidate` |

**Headers accepted**:
- `Authorization: Bearer <access_token>` — required
- `X-Request-Id` — optional, validated `[A-Za-z0-9._:-]{1,128}`, echoed in response + telemetry
- `AbortSignal` — via fetch/axios cancellation (infrastructure)

**Headers NOT required**:
- `X-Mutation-Id`
- `Idempotency-Key`
- `If-Match`

---

## 2. Success Response (200)

```json
{
  "household_id": "string (UUID)",
  "projection_version": "planner.home_summary.v1",
  "generated_at": "string (ISO-8601, server clock)",
  "counts": {
    "tasks": "number (≥0)",
    "events": "number (≥0)",
    "goals": "number (≥0)"
  },
  "tasks": [
    {
      "id": "string (UUID)",
      "title": "string",
      "status": "pending | awaiting_verification",
      "priority": "low | normal | high",
      "due_date": "string (YYYY-MM-DD) | null",
      "due_time": "string (HH:mm:ss) | null",
      "assigned_to_member_id": "string (UUID) | null",
      "requires_verification": "boolean",
      "version": "number (≥1)"
    }
  ],
  "events": [
    {
      "id": "string (UUID)",
      "title": "string",
      "starts_at": "string (ISO-8601)",
      "ends_at": "string (ISO-8601) | null",
      "all_day": "boolean",
      "location_name": "string | null",
      "recurrence": "none | daily | weekly | monthly",
      "is_recurring": "boolean",
      "status": "scheduled",
      "version": "number (≥1)"
    }
  ],
  "goal": {
    "id": "string (UUID)",
    "title": "string",
    "category": "string | null",
    "visibility": "household | personal",
    "progress_mode": "steps | tasks | numeric | boolean | none",
    "target_type": "count | percentage | amount | boolean | null",
    "target_value": "number | null",
    "current_value": "number",
    "unit": "string | null",
    "progress_percentage": "number | null",
    "status": "active",
    "starts_at": "string (YYYY-MM-DD) | null",
    "ends_at": "string (YYYY-MM-DD) | null",
    "version": "number (≥1)"
  } | null,
  "partial_errors": [
    { "section": "tasks", "code": "summary_tasks_failed", "request_id": "string?" },
    { "section": "events", "code": "summary_events_failed", "request_id": "string?" },
    { "section": "goals", "code": "summary_goals_failed", "request_id": "string?" }
  ],

  "pending_tasks_count": "number",
  "today_tasks_count": "number",
  "overdue_tasks_count": "number",
  "awaiting_verification_count": "number",
  "upcoming_events_count": "number",
  "tasks_today": "PlannerTask[]",
  "overdue_tasks": "PlannerTask[]",
  "awaiting_verification_tasks": "PlannerTask[]",
  "upcoming_events": "PlannerEvent[]",
  "briefing_text": "string"
}
```

### Field Notes

| Field | Notes |
|-------|-------|
| `household_id` | Active household from server-side context (never client-supplied) |
| `projection_version` | Stable identifier; bumped only when selection/DTOS change |
| `generated_at` | Single temporal reference for the whole projection |
| `counts.*` | Eligible pool sizes (not capped to 3/3/1). Section in error → `0`. |
| `tasks` | Max 3, ordered: awaiting_verification → due_date asc → priority desc → created_at desc → id asc |
| `events` | Max 3, within [now, now+7d], ordered: starts_at asc → title asc → id asc |
| `goal` | Max 1 (or `null`), ordered: progress_percentage desc → ends_at asc → created_at desc → id asc |
| `partial_errors` | Array of entries; plural `section` keys; empty array when all ok; never omitted |
| Legacy fields | `*_count`, `tasks_today`, `upcoming_events`, `briefing_text` — **deprecated, remove in M9** |

---

## 3. Error Responses

### 3.1 Global Failure (canonical envelope)

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "request_id": "string | null",
    "details": {}
  }
}
```

| HTTP | Code | Cause |
|------|------|-------|
| 401 | `not_authenticated` | Missing/invalid bearer token |
| 403 | `person_not_found` | No `people` row for auth user |
| 403 | `no_active_household` | User has no `active_household_id` |
| 403 | `not_active_household_member` | Membership not active |
| 403 | `planner_forbidden` | `planner.view` capability denied |
| 500 | `summary_failed` | All three sections failed (details.sections lists them) |
| 500 | `internal_error` | Unexpected server error (message redacted) |

### 3.2 Partial Failure

**HTTP 200** with `partial_errors` populated (see success shape). Surviving sections contain data; failed sections are empty arrays / `null` with `counts.section = 0`.

---

## 4. Request/Response Examples

### 4.1 Nominal (all sections ok)

```http
GET /api/planner/summary
Authorization: Bearer eyJ...
X-Request-Id: req-abc123

HTTP/1.1 200 OK
X-Request-Id: req-abc123
Cache-Control: private, no-store, no-cache, must-revalidate
Content-Type: application/json

{
  "household_id": "hh-111",
  "projection_version": "planner.home_summary.v1",
  "generated_at": "2026-07-16T12:00:00.000Z",
  "counts": { "tasks": 5, "events": 2, "goals": 3 },
  "tasks": [
    { "id": "t-1", "title": "Comprar leche", "status": "awaiting_verification", "priority": "high", "due_date": "2026-07-16", "due_time": null, "assigned_to_member_id": "mem-2", "requires_verification": true, "version": 4 }
  ],
  "events": [
    { "id": "e-1", "title": "Cita médica", "starts_at": "2026-07-17T10:00:00.000Z", "ends_at": "2026-07-17T11:00:00.000Z", "all_day": false, "location_name": "Clínica", "recurrence": "none", "is_recurring": false, "status": "scheduled", "version": 1 }
  ],
  "goal": { "id": "g-1", "title": "Ahorro vacaciones", "category": "finance", "visibility": "household", "progress_mode": "numeric", "target_type": "amount", "target_value": 5000, "current_value": 1250, "unit": "USD", "progress_percentage": 25, "status": "active", "starts_at": "2026-01-01", "ends_at": "2026-12-31", "version": 2 },
  "partial_errors": [],
  "pending_tasks_count": 4,
  "today_tasks_count": 1,
  "overdue_tasks_count": 0,
  "awaiting_verification_count": 1,
  "upcoming_events_count": 2,
  "tasks_today": [{ ... }],
  "overdue_tasks": [],
  "awaiting_verification_tasks": [{ ... }],
  "upcoming_events": [{ ... }],
  "briefing_text": "Hoy tienes 1 tareas y 2 eventos."
}
```

### 4.2 Partial — Goals section failed

```json
{
  "household_id": "hh-111",
  "projection_version": "planner.home_summary.v1",
  "generated_at": "2026-07-16T12:00:00.000Z",
  "counts": { "tasks": 5, "events": 2, "goals": 0 },
  "tasks": [ ... ],
  "events": [ ... ],
  "goal": null,
  "partial_errors": [
    { "section": "goals", "code": "summary_goals_failed", "request_id": "req-abc123" }
  ],
  "pending_tasks_count": 4,
  ...
}
```

### 4.3 Global failure (all sections)

```http
HTTP/1.1 500 Internal Server Error
X-Request-Id: req-abc123

{
  "error": {
    "code": "summary_failed",
    "message": "Error interno.",
    "request_id": "req-abc123",
    "details": { "sections": ["tasks", "events", "goals"] }
  }
}
```

### 4.4 Capability denied

```http
HTTP/1.1 403 Forbidden
X-Request-Id: req-abc123

{
  "error": {
    "code": "planner_forbidden",
    "message": "No tenés permiso para realizar esta acción.",
    "request_id": "req-abc123",
    "details": { "capability": "planner.view" }
  }
}
```

---

## 5. Compatibility

- **V0 consumers** (Home `HomePlannerSections`, Planner `PlannerScreen`) continue to read legacy fields (`pending_tasks_count`, `tasks_today`, `upcoming_events`, `briefing_text`, etc.) — present and derived from V1 selection.
- **V1 consumers** (M9 Home) read V1 authority surface (`tasks/events/goal`, `counts`, `partial_errors`, `projection_version`, `generated_at`).
- **No dual endpoints** — single `GET /api/planner/summary` serves both.
- **Migration path**: M9 switches Home to V1 fields; legacy fields removed in M9 (`REMOVE_LEGACY`).

---

## 6. Telemetry Events (Server)

| Event | Properties |
|-------|------------|
| `planner_summary_loaded` | `result:'success'`, `has_partial_errors:false`, `task_count_bucket`, `event_count_bucket`, `goal_count_bucket`, `latency_bucket` |
| `planner_summary_partial` | `result:'partial'`, `failed_sections`, `task_count_bucket`, `event_count_bucket`, `goal_count_bucket`, `latency_bucket` |
| `planner_summary_failed` | `result:'failure'`, `error_code`, `latency_bucket` |

Buckets: `0 | 1-3 | 4-10 | 11+` (counts), `<100ms | 100-300ms | 300ms-1s | >1s` (latency).

---

## 7. Change Log

| Version | Date | Changes |
|---------|------|---------|
| `planner.home_summary.v1` | 2026-07-16 | Initial V1 projection (M8) — replaces V0 informal shape |