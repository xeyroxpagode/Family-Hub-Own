# Planner V1 — Transport Contract

> **Authority**: Single source of truth for Planner mutation intent, transport options, error classification, version/concurrency, and capability gating.  
> **Location**:  
> - `front/mi-front-limpio/services/planner/plannerMutationIntent.ts` (intent + transport)  
> - `front/mi-front-limpio/services/planner/plannerErrorAdapter.ts` (error classification)  
> - `front/mi-front-limpio/services/planner/plannerCapabilitiesAdapter.ts` (capability guards)  
> - `front/mi-front-limpio/services/planner/plannerSearchGate.ts` (Search flag)  
> **Consumers**: All Planner service adapters (`plannerTasks.ts`, `plannerEvents.ts`, `plannerGoals.ts`), Quick Actions (M4), Create Goal (M5), One-tap (M9).  
> **Non-goals**: Sheet host submit lock (M3), optimistic patch/reconcile/rollback (M2/M4/M5), post-create redirect (M5).

---

## 1. Mutation Intent Identity

### 1.1 `PlannerMutationIntent`
```typescript
type PlannerMutationIntent = {
  readonly mutationId: string;           // stable across retries
  readonly idempotencyKey?: string;      // stable for CREATE_IDEMPOTENT
  readonly ifMatch?: string | number;    // entity version for VERSIONED_MUTATION
  readonly operationKind: 'CREATE_IDEMPOTENT' | 'VERSIONED_MUTATION' | 'NON_VERSIONED_MUTATION';
};
```

### 1.2 Factories
```typescript
createPlannerMutationIntent({ kind: 'create', entityKind: 'task' })
  → { mutationId, idempotencyKey, operationKind: 'CREATE_IDEMPOTENT' }

createPlannerVersionedMutationIntent({ kind: 'versioned', entityKind: 'task', entityVersion: 5 })
  → { mutationId, idempotencyKey, ifMatch: '5', operationKind: 'VERSIONED_MUTATION' }

clonePlannerMutationIntent(original)
  → preserves mutationId, idempotencyKey, ifMatch, operationKind

activeMutationIntent(intent | null)
  → { mutationId, idempotencyKey?, ifMatch? } | null
```

### 1.3 Guarantees
| Property | Guarantee |
|----------|-----------|
| `mutationId` | Stable per user intent; regenerated **only** for a genuinely new intent. Retries reuse same ID. |
| `idempotencyKey` | Stable per create intent; regenerated only for new intent. Double-tap while pending → **no second key**. |
| `ifMatch` | Required for all versioned mutations; absent for creates. |
| Transport abort | Does **not** auto-convert retry into new intent. Caller decides. |
| Conflict 412 | **Never** resolved with last-write-wins. Classified as `conflict`, triggers directed refetch. |
| UI exposure | Mutation IDs **never** shown in UI. |
| Persistence | IDs **not** persisted indefinitely (in-memory per session). |
| Cross-entity | IDs **never** reused across different entities. |

---

## 2. Transport Options

### 2.1 `PlannerTransportOptions`
```typescript
type PlannerTransportOptions = {
  accessToken: string;
  intent?: PlannerMutationIntent | null;  // attaches mutation headers
  signal?: AbortSignal | null;            // household switch, unmount, timeout
  timeoutMs?: number;                     // auto-abort after ms
};
```

### 2.2 Mapping to Core `RequestJsonOptions`
```typescript
toRequestJsonOptions({ accessToken, intent, signal, timeoutMs })
  → {
    accessToken,
    mutationId: intent?.mutationId,
    operationKind: intent?.operationKind,
    idempotencyKey: intent?.idempotencyKey,
    expectedVersion: intent?.ifMatch ? parseInt(intent.ifMatch, 10) : undefined,
    signal,
    timeoutMs,
  }
```

### 2.3 Read-Only Helper
```typescript
toPlannerReadOptions({ accessToken, signal, timeoutMs })
  → { accessToken, operationKind: 'READ_ONLY', signal, timeoutMs }
```
**No** mutation headers added.

### 2.4 Operation Kind Policy (Core-enforced)
| Kind | Mutation-ID | Idempotency-Key | If-Match | Use |
|------|-------------|-----------------|----------|-----|
| `READ_ONLY` | N/A | N/A | N/A | GET |
| `CREATE_IDEMPOTENT` | required | required | N/A | Create (replay-safe) |
| `VERSIONED_MUTATION` | required | required | required | Update/Complete/Trash/Restore |
| `NON_VERSIONED_MUTATION` | required | optional | N/A | Mutations without version |
| `AUTH_SESSION_MUTATION` | optional | N/A | N/A | Login/Register/Logout |

Core validates headers; each endpoint declares its policy. Planner services **MUST** pass `intent` with correct `operationKind`.

---

## 3. Error Classification

### 3.1 `classifyPlannerError(error) → PlannerError`
```typescript
type PlannerError = {
  original: ApiError | Error;
  class: 'validation' | 'forbidden' | 'not_found' | 'conflict'
         | 'timeout' | 'abort' | 'offline' | 'server' | 'unknown';
  code: string | null;
  requestId: string | null;
  isRetryable: boolean;
};
```

### 3.2 Classification Table
| HTTP Status / Error | Class | Retryable | Notes |
|---------------------|-------|-----------|-------|
| 400, 422 | `validation` | ❌ | Malformed headers/body, invalid UUID, missing required headers |
| 401 | `forbidden` | ❌ | Expired/missing token |
| 403 | `forbidden` | ❌ | Capability denied, RLS violation, no active household |
| 404 | `not_found` | ❌ | Entity/household not found |
| 409 | `conflict` | ❌ | Idempotency key conflict, in-flight duplicate |
| 412 | `conflict` | ❌ | `version_conflict_v2` — details: `{ current, expected }` |
| 429 | `server` | ✅ | Rate limited — retry after `Retry-After` |
| 5xx | `server` | ✅ | Redacted message (`Error interno.`) |
| `AbortError` / `DOMException(name=AbortError)` | `abort` | ✅ | Household switch, unmount, timeout — **suppress UI error** |
| `TypeError` (network) | `offline` | ✅ | Offline / DNS failure |
| Other | `unknown` | ❌ | Logged, not retried |

### 3.3 Helpers
```typescript
isPlannerAbort(error) → boolean          // true for AbortError / DOM AbortError
isRetryable(class) → boolean              // server / offline / abort
isVersionConflict(plannerError) → boolean // true iff class=conflict && code=version_conflict_v2
extractConflictVersions(plannerError) → { current: number|null, expected: number|null }
getPlannerErrorRequestId(plannerError) → string | null
```

### 3.4 Request ID Preservation
- `ApiError.requestId` populated from `X-Request-Id` response header or envelope `error.request_id`.
- Available via `getPlannerErrorRequestId` for **secondary/support display only**.
- Never primary user-facing message.

---

## 4. Version & Concurrency Contract

### 4.1 Flow
```
READ entity → capture entity.version
→ MUTATE with intent.ifMatch = String(version)
→ SUCCESS → response includes new version
→ UPDATE cache with new version (reconcile)
→ 412 conflict → ROLLBACK to exact pre-mutation snapshot
   → classify as 'conflict' (not retryable)
   → UI shows conflict modal with current/expected versions
   → User re-fetches, re-applies intent
```

### 4.2 Helpers
```typescript
extractEntityVersion(response) → number | undefined
  // from { ..., version: 7 } or { task: { ..., version: 7 } }

parseEntityVersionForIfMatch(version) → string | undefined
  // validates >= 1, returns stringified

extractConflictVersions(plannerError) → { current: number|null, expected: number|null }
  // from error.details.current / expected
```

### 4.3 Rules
- **Create**: No `If-Match` (entity doesn't exist).
- **Update/Complete/Cancel/Trash/Restore**: Require `If-Match` with current version.
- **Success**: New version returned in response; cache reconciled.
- **412**: Rollback to exact pre-mutation snapshot (data + version). **No silent retry**.
- **Directed refetch**: Only the conflicting entity, not global refetch.
- **Cache**: `plannerCache.rollbackOptimistic(mutationId)` restores precise snapshot.

---

## 5. Idempotency Contract

| Operation | Idempotency-Key | Behavior |
|-----------|-----------------|----------|
| Create (Task/Event/Goal) | Required | Exact replay returns stored 201 + entity |
| Versioned mutation | Required | Exact replay returns stored response (2xx or 412) |
| Read | N/A | No key sent |

**Key format**: `idem_${entityKind}_${timestamp}_${random}` via `createIdempotencyKey(entityKind)`.

**Replay rules** (server-enforced):
- Same key + same hash → return stored response (2xx or 412).
- Same key + different hash → `409 idempotency_key_conflict`.
- In-flight → `409 idempotency_in_flight`.

---

## 6. Abort & Timeout

```typescript
// Via PlannerTransportOptions
{ signal: externalAbortSignal, timeoutMs: 15000 }
```
- Merged into single `AbortController` (Core `createRequestControl`).
- Abort → throws `AbortError` (subclass of `Error`, `name === 'AbortError'`).
- **Consumers MUST** discriminate `isPlannerAbort(error)` and **suppress error UI**.
- Household switch / sign-out / unmount → external signal aborted.

---

## 7. Capability Guards (Deny-Safe)

### 7.1 Per-Action Helpers
```typescript
// Create
canCreatePersonalTask(projection)
canCreateHouseholdTask(projection)
canCreateAnyTask(projection)
canCreatePersonalEvent(projection)
canCreateHouseholdEvent(projection)
canCreateAnyEvent(projection)
canCreatePersonalGoal(projection)
canCreateHouseholdGoal(projection)
canCreateAnyGoal(projection)

// View
canViewPlanner(projection)
canSearchPlanner(projection)

// Detail actions
canEditOwnTask(projection)
canCompleteAssignedTask(projection)
canCancelOwnTask(projection)
canRestoreFromTrash(projection)
canEditOwnEvent(projection)
canCancelOwnEvent(projection)
canManageEventParticipants(projection)
canEditOwnGoal(projection)
canCompleteOwnGoal(projection)
canCloseOwnGoal(projection)
canManageGoalParticipants(projection)
canRestoreGoal(projection)
```

### 7.2 Generic
```typescript
can(projection, 'task.create_personal')           // single
canAny(projection, 'task.create_personal', 'task.create_household')  // OR
canAll(projection, 'task.edit_own', 'task.complete_assigned')        // AND
```

### 7.3 Quick Actions Matrix (M4)
```typescript
type QuickActionKind = 'task' | 'event' | 'goal';

evaluateQuickActionCapabilities(projection)
  → [{ kind: 'task', visible: boolean, scope: 'personal'|'household'|'none' }, ...]

isQuickActionEnabled(projection, 'task') → boolean
```

### 7.4 Deny-Safe Rules
- Missing/undefined projection → `false`.
- Unknown capability key → `false`.
- Non-boolean value → `false`.
- **Backend ALWAYS re-validates** — frontend only hides/disables.

---

## 8. Search Feature Flag Guard

```typescript
const PLANNER_SEARCH_FLAG_KEY = 'planner.search_entry';
const PLANNER_SEARCH_CAPABILITY = 'planner.search';

canOpenPlannerSearch(flags, capabilities)
  → flags['planner.search_entry'] === true && capabilities['planner.search'] === true

getPlannerSearchFlag(flags) → boolean
plannerSearchFallbackAction(flags, capabilities)
  → { allowed: true, reason: 'unknown' }
     | { allowed: false, reason: 'flag_off' | 'capability_missing' | 'both' }
```

**Rules**:
- Default `false`, server-evaluated, client-visible.
- Kill switch (`HOMEPLUS_FEATURE_FLAGS_KILL_SWITCH`) wins.
- Missing/error projection → `false` (deny-safe).
- No second authority (`planner_search_enabled`, `enablePlannerSearch`, etc.).
- Unexpected navigation with flag OFF → safe fallback (Planner root).

---

## 9. Error Message Catalog (Planner-Specific)

Registered via `plannerErrorMessages.ts` → Core `apiErrorCatalog`:
| Code | User Message |
|------|--------------|
| `version_conflict` | "Este elemento cambió en otro dispositivo. Actualizá y volvé a intentar." |
| `version_conflict_v2` | "La versión de la entidad cambió. Actualizá y reintentá." |
| `idempotency_in_flight` | "La operación ya está en curso. Esperá un momento e intentá de nuevo." |
| `idempotency_key_conflict` | "Esta operación ya se procesó con otros datos." |
| `task_in_trash` | "Esta tarea está en la papelera. Restaurala primero desde Papelera." |
| `event_in_trash` | "Este evento está en la papelera. Restauralo primero desde Papelera." |
| `parent_goal_in_trash` | "La meta padre está en la papelera. Restaurala primero." |
| `planner_forbidden` | "No tenés permiso para realizar esta acción." |
| `goal_not_found` | "Meta no encontrada." |
| `milestone_not_found` | "Hito no encontrado." |
| `invalid_status_transition` | "Transición de estado no permitida." |
| `cannot_verify_own_completion` | "No podés verificar tu propia completación." |
| `invalid_template_key` | "Tipo de plantilla inválido." |
| `invalid_task_priority` | "Prioridad de tarea inválida." |
| `invalid_recurrence` | "Recurrencia inválida." |
| `invalid_visibility` | "Visibilidad inválida." |
| `invalid_category` | "Categoría inválida." |
| `incompatible_progress_mode_target_type` | "Modo de progreso incompatible con el tipo de objetivo." |

**Rule**: Messages are **catalog-registered**, not inline. Core `ApiError` carries `code` + `requestId`; UI resolves message via catalog.

---

## 10. Cross-References

- Mutation intent: `plannerMutationIntent.ts`
- Error adapter: `plannerErrorAdapter.ts`
- Capabilities adapter: `plannerCapabilitiesAdapter.ts`
- Search gate: `plannerSearchGate.ts`
- Service adapters: `plannerTasks.ts`, `plannerEvents.ts`, `plannerGoals.ts`
- Quick Actions (M4): `QuickActionSheet.tsx` → `evaluateQuickActionCapabilities`
- Create Goal (M5): `GoalForm.tsx` → `canCreatePersonalGoal` / `canCreateHouseholdGoal`
- One-tap (M9): `plannerTasks.ts` `completePlannerTaskOptimistic` → `intent` + `isRetryable`