# Planner V1 — especificación lista para implementación

> **V1 STATUS: IMPLEMENTATION READY**
>
> Revalidación: 2026-07-14 (America/Buenos_Aires)
>
> Rama: `v1`
>
> Commit auditado: `cec151b5e6b2d063d60a5f614cbf7134c800de9f`
>
> Working tree inicial: limpio
>
> Node/npm/Supabase CLI: `v24.13.0` / `11.6.2` / `2.90.0`

```text
V0 CONTRACT GATE: PASSED
M1 STATUS: AUTHORIZED
```

| Metadata de cierre | Valor |
|---|---|
| Commit G0.5 | `cec151b5e6b2d063d60a5f614cbf7134c800de9f` — `test(core): close G0.5 and HomePlus V0 contract gate` |
| Commit final V0 gate | `cec151b5e6b2d063d60a5f614cbf7134c800de9f` |
| Migration state | 33 local / 33 remoto, sin divergencia |
| CI | `.github/workflows/homeplus-quality.yml` |

## 1. Dictamen

Planner V1 puede comenzar desde el commit auditado. Los 17 contratos de V0 están `AVAILABLE`: identidad y hogar activos, capabilities, errores, concurrencia, idempotencia, mutation identity, feature flags, cache/invalidation, lifecycle, telemetría, audit/outbox, migraciones, runners y baseline global.

Este estado no afirma que V1 ya exista. Shell, host, Search entry, Summary, deep links, accesibilidad y QA siguen siendo trabajo M1–M13. No se implementó M1 durante esta revalidación.

## 2. Evidencia de la base satisfecha

| Base | API real | Evidencia actual |
|---|---|---|
| Contexto | `getPlannerContext` en `backend/src/services/planner.context.service.js` | G0.2 runtime PASS, 115 assertions |
| Capabilities | `PLANNER_CAPABILITIES`, `resolveCapabilities`, `GET /api/planner/capabilities`, `fetchPlannerCapabilitiesCached` | 38 claves, denial server-side PASS |
| Transport/errors | `requestJson`, `ApiError`, `AbortError`, `buildApiErrorEnvelope`, `sendApiError` | Core 23 + G0.2 runtime PASS |
| Mutation contracts | `generateMutationId`, `requireMutationId`, `requireIdempotencyKey`, `parseRequiredExpectedVersion` | required/echo/replay/412 PASS |
| Cache/context | `createServerState`, `plannerKeys`, `plannerCache`, `runHouseholdSwitch`, `runSessionCleanup` | Core frontend 19 + Planner 46 PASS |
| Feature flag | `planner.search_entry`, `GET /api/feature-flags`, `FeatureFlagsProvider` | default false, override, kill switch y proyección PASS |
| Telemetry/privacy | `telemetry`, `telemetryCatalog`, allowlists y `assertSafeStructuredData` | 33 contratos; PII/secret scans PASS |
| Audit/outbox | `audit_events`, `outbox_events`, RPCs transaccionales, processor/retry | 27 DB + 33 contracts + 5 runtime PASS |
| DB/CI | `tests/db/*`, `tests/run.js`, `.github/workflows/homeplus-quality.yml` | parity 33/33; lint 0 local/remoto; quality/G0 PASS |

Detalle por contrato: `planner_v1_v0_contract_check.md`.

## 3. Estado por bloque V1

Estados autorizados: `READY_TO_IMPLEMENT`, `EXISTING_PARTIAL`, `EXISTING_CONFLICT_TO_REFACTOR`, `RUNTIME_REQUIRED`, `BLOCKED`.

| Bloque | Estado | Punto de partida y trabajo V1 |
|---|---|---|
| Shell Planner | `EXISTING_PARTIAL` | `screens/planner/PlannerScreen.tsx` existe; M2 lo reduce a shell/header/tabs/states y retira slogan/stat cards |
| Tabs Tasks/Calendar/Goals | `EXISTING_PARTIAL` | Existen; M6 tipa `PlannerTabKey` y persiste por account+household |
| Sheet Host | `READY_TO_IMPLEMENT` | Lifecycle/cancelación/headers están disponibles; M3 crea un host singleton y migra los modales existentes |
| Quick Actions | `EXISTING_PARTIAL` | Task/Event/Goal ya existen; M4 aplica capabilities reales, una activación por intención, estados y accesibilidad |
| Create Goal | `EXISTING_PARTIAL` | `GoalForm` embedded existe; M5 implementa quick path, progreso inicial 0, retry estable y post-create one-shot |
| Search entry | `READY_TO_IMPLEMENT` | `planner.search_entry` default false, proyección frontend y `planner.search` disponibles; M7 agrega solo entry/route/fallback. Search productiva queda fuera |
| Estados globales | `READY_TO_IMPLEMENT` | Envelope, cache y telemetry existen; M2 agrega `PlannerStateView` y `PlannerErrorBoundary` |
| Household switch/sign-out | `EXISTING_PARTIAL` | Core lifecycle ya cancela y limpia cache/flags; M7 agrega cierre de host, preferencias y restauración de tab |
| Home Summary backend | `EXISTING_CONFLICT_TO_REFACTOR` | `GET /api/planner/summary` existe, pero el shape/ranking actual se reemplaza en M8 por 3/3/1 con counts y errores parciales |
| Home Summary frontend | `EXISTING_CONFLICT_TO_REFACTOR` | `HomePlannerSections.tsx` hace fan-out/ranking cliente; M9 consume una proyección y one-tap con rollback |
| Deep links | `EXISTING_PARTIAL` | Linking raíz existe; M1/M10 agrega rutas tipadas y cold/warm paths con IDs solamente |
| Telemetría V1 | `READY_TO_IMPLEMENT` | Provider, sinks, privacidad y catálogo registrable existen; M2–M11 agrega eventos V1 sin PII |
| Accesibilidad | `RUNTIME_REQUIRED` | Primitives existentes permiten implementación; VoiceOver/TalkBack, gestures, teclado, safe areas, fuente grande y reduced motion se validan en runtime M11/M12 |
| QA/rollback/DONE | `READY_TO_IMPLEMENT` | Runners root, integration, DB, CI, scans y coverage existen; M1–M13 agregan tests V1 y evidencia runtime |

Totales: `READY_TO_IMPLEMENT 5`, `EXISTING_PARTIAL 6`, `EXISTING_CONFLICT_TO_REFACTOR 2`, `RUNTIME_REQUIRED 1`, `BLOCKED 0`.

## 4. Contratos físicos vinculantes

### 4.1 Navegación y shell

- Shell: `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`; se refactoriza, no se duplica.
- Composición: `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`.
- Tipos: `front/mi-front-limpio/navigation/types.ts` exportará `PlannerTabKey = 'tasks' | 'calendar' | 'goals'`.
- Rutas actuales conservadas: `PlannerHome`, `CreateTask`, `EditTask`, `CreateEvent`, `EditEvent`, `CreateGoal`, `EditGoal`, `GoalDetail`, `PlannerTrash`.
- Rutas V1 autorizadas: `TaskDetail`, `EventDetail`, `PlannerSearch`; params solo IDs y metadata `source`, `returnTo`, `justCreated`.
- Linking: `front/mi-front-limpio/App.tsx`; no se transportan objetos de dominio en URLs o route params.

### 4.2 Sheet Host y Quick Actions

- Nuevos: `context/PlannerSheetContext.tsx` y `components/planner/PlannerSheetHost.tsx`.
- Mount único en `HomeTabNavigator.tsx`.
- API pública: `open(kind, source)`, `close(reason)`, `activeKind`, `isOpen`, `isSubmitting`.
- `QuickActionSheet.tsx` pasa a presentacional; `PlannerScreen.tsx` deja de montar sheets propios.
- `CenterTabButton.tsx` conserva una sola vía de activación.
- Durante submit se bloquean back/backdrop/swipe; el draft y la identidad sobreviven al error; cierre restaura foco cuando el trigger sigue montado.
- Acciones exactas y orden: Crear tarea, Crear evento, Crear meta. Invite pertenece a Household/People y no forma parte de Planner V1.
- Visibilidad: `hasAnyCapability` sobre capabilities personal/household de cada entidad; el servidor siempre revalida.

### 4.3 Create Goal

- Se reutiliza `screens/planner/GoalForm.tsx` y su wrapper `CreateGoalScreen.tsx`.
- Inicial: título, categoría `home`, visibilidad `household`, Guardar.
- “Más opciones”: descripción, modo de progreso, prioridad, responsable, participantes, inicio, fecha objetivo, target/unidad, template, recurrencia e hitos.
- Create no acepta progreso inicial autoritativo; backend fija `current_value = 0`.
- Una intención conserva mutation ID e idempotency key entre retry; submit lock impide duplicación.
- Éxito: respuesta canónica → goal detail/list → Summary → `GoalDetail({ goalId, source: 'quick_action', justCreated: true })`.
- Post-create one-shot: Steps (primer paso), Tasks (crear/vincular), Numeric (primer avance), Boolean (abrir), None (nota/tarea); no se repite al reingresar.

### 4.4 Search entry

- Flag exacto: `planner.search_entry`; default `false`; client-visible; deny-safe; kill switch server-side.
- Capability exacta: `planner.search`.
- Nuevo screen autorizado: `screens/planner/PlannerSearchScreen.tsx`.
- V1 incluye icono/header, route, deep-link readiness, fallback, back behavior, estados base y `planner_search_opened`.
- V1 no incluye endpoint, índice, resultados, ranking, filtros, paginación ni query cache productiva. La key `plannerKeys.search` permanece reservada.

### 4.5 Query keys, cache e invalidación

Fuente única: `front/mi-front-limpio/services/planner/plannerKeys.ts`.

| Uso | Factory real |
|---|---|
| Capabilities | `plannerKeys.capabilities({ accountId, householdId, membershipId })` |
| Task list/detail | `plannerKeys.tasks.list/all/detail` |
| Event list/detail | `plannerKeys.events.list/all/detail` |
| Goal list/detail/milestones | `plannerKeys.goals.list/all/detail/milestones/milestoneDetail` |
| Summary | `plannerKeys.summary({ householdId })` |
| Trash | `plannerKeys.trash({ householdId }, type?)` |
| Calendar | `plannerKeys.calendar({ householdId }, view?, date?)` |
| Search reservada | `plannerKeys.search({ householdId }, query, filters?)` |

Mutaciones usan `plannerCache.getInvalidationKeys`/`executeInvalidation`. Optimismo usa `registerPendingMutation`, `applyOptimisticPatch`, `reconcileOptimistic`, `rollbackOptimistic`. Requests capturan generación y escriben con `setForContext`; switch/sign-out cancelan y avanzan generación monótona.

### 4.6 Home Summary

Se conserva `GET /api/planner/summary`; M8 refactoriza `backend/src/services/planner.summary.service.js` y `backend/src/controllers/planner.summary.controller.js`.

```ts
type PlannerSummary = {
  household_id: string;
  generated_at: string;
  projection_version: string;
  counts: {
    overdue_tasks: number;
    today_tasks: number;
    awaiting_verification: number;
    upcoming_events: number;
    active_goals: number;
  };
  tasks: Array<{ id: string; title: string; status: string; priority: string; due_at: string | null; assigned_membership_id: string | null; version: number }>;
  events: Array<{ id: string; title: string; starts_at: string; ends_at: string | null; version: number }>;
  goal: { id: string; name: string; target_value: number | null; current_value: number; unit: string | null; target_date: string | null; version: number } | null;
  partial_errors: Array<{ section: 'tasks' | 'events' | 'goals'; code: string; request_id?: string }>;
};
```

Reglas: máximo 3 tasks, 3 events y 1 goal; orden backend determinístico; secciones aisladas; counts siempre presentes; sin ranking cliente. M9 usa `plannerKeys.summary` y rollback dirigido para one-tap task.

### 4.7 Telemetría y privacidad

M1–M11 registra en `PLANNER_TELEMETRY_EVENTS` los eventos: `planner_opened`, `planner_tab_changed`, `planner_quick_actions_opened`, `planner_quick_action_selected`, `planner_sheet_opened`, `planner_sheet_closed`, `planner_create_submitted`, `planner_create_succeeded`, `planner_create_failed`, `planner_search_opened`, `planner_summary_loaded`, `planner_summary_partial`, `planner_task_quick_completed`, `planner_household_switched`, `planner_error_shown`.

Solo propiedades técnicas allowlisted: `entity_kind`, `source`, `tab`, `result_count_bucket`, `latency_bucket`, `error_code`, `has_partial_errors`, `household_context_changed`. Se prohíben títulos, descripciones, nombres, emails, IDs de persona/hogar/entidad y query cruda.

### 4.8 Audit/outbox

- Audit durable append-only: `audit_events`.
- Outbox transaccional: `record_audit_and_enqueue_outbox` dentro de la transacción del dominio.
- Worker: `processOutboxBatch`; registry `outboxHandlerRegistry`; retry `computeRetryDecision`; leases/dedupe/dead-letter mediante RPCs G0.4.
- Una mutación sin side effect real no inventa evento outbox.
- `planner_activity_log` puede conservarse como actividad de dominio temporal, nunca como autoridad audit.

### 4.9 Accesibilidad

Shell, tabs, Search, botón central, Quick Actions, forms y CTA usan roles/labels/selected state. Sheet mueve foco al título/primer control y lo restaura al cerrar; error de submit conserva draft, se anuncia y se enfoca. Targets, contraste, fuente grande, reduced motion, safe areas y teclado requieren evidencia runtime. VoiceOver y TalkBack se ejecutan en M11/M12.

## 5. Orden, tests y rollback

- Orden vinculante: `planner_v1_implementation_order.md`; G0 queda `COMPLETE / VERIFIED`; M1–M13 se conservan.
- File map vinculante: `planner_v1_file_map.md` con rutas reales sin el árbol `src/` inexistente.
- Matriz: `planner_v1_test_matrix.md`; infraestructura V0 figura `PREREQUISITE PASS` y casos V1 como `PLANNED` o `RUNTIME_REQUIRED`.
- Baseline por microfase: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:planner`, suites focalizadas y `git diff --check`.
- Gate ensamblado: `npm.cmd run test:g0`, `npm.cmd run quality`, `npm.cmd run test:integration`, `npm.cmd run test:db`, `npm.cmd run test:db:remote`.
- Rollback es por microfase; no se edita una migración aplicada ni se conserva un camino duplicado.

## 6. Definition of Ready satisfecha

1. Los 17 contratos están `AVAILABLE` y ninguno está `BLOCKED`.
2. V0 final gate y G0.5 están aprobados.
3. Capabilities, flags, query keys, cache, lifecycle, telemetry y outbox tienen nombres y archivos físicos.
4. Migration parity local/remoto es 33/33; lint local/remoto es 0.
5. Typecheck, lint, backend, frontend, contracts, Core, Planner, G0.2, G0.3, G0.4, DB, integration, G0 y quality devolvieron exit 0.
6. Secret/privacy scans pasaron; no hubo skips.
7. M1 tiene archivos, APIs y comandos reales.
8. `planner_v1_open_decisions.md` declara que no existen decisiones abiertas.

```text
PLANNER V1 FOCUSED READINESS REVALIDATION: PASSED
V0 CONTRACT GATE: PASSED
V1 STATUS: IMPLEMENTATION READY
M1 STATUS: AUTHORIZED
```

---

## 7. Post-M6 Implementation Update

**Commit**: `e9a47c6` (M5) → working tree modified for M6

| Block | Pre-M6 Status | Post-M6 Status | Notes |
|-------|---------------|----------------|-------|
| Tabs Tasks/Calendar/Goals | `EXISTING_PARTIAL` | `IMPLEMENTED` | `PlannerTabKey` canonical; persistence via `plannerPreferences.ts` |
| Shell Planner | `IMPLEMENTED` (M2) | `ENHANCED` | M6 adds hydration, persistence, lifecycle guards |
| Household switch/sign-out | `EXISTING_PARTIAL` | `ENHANCED` | M6 adds preference isolation + durable retention policy |

### Files Created
- `front/mi-front-limpio/services/plannerPreferences.ts` — single adapter, codec, key builder
- `scripts/planner_v1_tab_preferences_tests.ts` — 50 assertions
- `docs/implementation/planner/PLANNER_V1_M6_PERSISTENT_TABS_REPORT.md`
- `docs/implementation/planner/PLANNER_V1_TAB_PREFERENCES_CONTRACT.md`
- `docs/implementation/planner/PLANNER_V1_TAB_HYDRATION_LIFECYCLE.md`

### Files Modified
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — M6 integration
- `scripts/tsconfig.test.json` — includes new source/test
- `tests/run.js` — `planner-v1-m6`, `planner-m6` suite
- `package.json` (root) — `test:planner:m6` script

### Tests
- M6 suite: 50 pass / 0 fail
- M1–M5 regression: all green
- Quality: 16 commands PASS

### Contracts Established
- `PLANNER_V1_TAB_PREFERENCES_CONTRACT.md` — keys, payload, parser, storage, retention
- `PLANNER_V1_TAB_HYDRATION_LIFECYCLE.md` — generation tokens, manual selection protection, late-response guards

### Compliance
- Canonical tabs: `tasks | calendar | goals` ✅
- Default: `tasks` ✅
- Account+Household scope ✅
- Versioned key ✅
- Single adapter ✅
- Deny-safe parser ✅
- Storage failure non-blocking ✅
- Household/account isolation ✅
- Navigation `initialTab` priority ✅
- Late hydration protection ✅
- No Search, no Home Summary changes, no backend, no migrations ✅

---

## 8. Post-M7 Implementation Update

**Commit**: `d0c5d4e` (M6) → working tree modified for M7

| Block | Pre-M7 Status | Post-M7 Status | Notes |
|-------|---------------|----------------|-------|
| Search entry | `READY_TO_IMPLEMENT` | `IMPLEMENTED` | Gate, entry point, route, screen, fallback, back, deep-link readiness |
| Household switch/sign-out | `ENHANCED` (M6) | `IMPLEMENTED` | M7 adds context identity, transition coordinator, late-response guards |
| Shell Planner | `ENHANCED` (M6) | `ENHANCED` | M7 adds Search icon (gated, hidden by default) + identity guards on load |

### Files Created
- `front/mi-front-limpio/services/planner/plannerContextIdentity.ts` — typed identity + pure helpers
- `front/mi-front-limpio/services/planner/plannerTransitionTypes.ts` — state union + late-response guard (pure, no RN)
- `front/mi-front-limpio/services/planner/plannerTransitionCoordinator.ts` — transition lifecycle coordinator
- `front/mi-front-limpio/services/planner/plannerSearchAccess.ts` — canonical gate (loading/disabled/forbidden/available)
- `front/mi-front-limpio/services/planner/plannerSearchStates.ts` — base states + descriptors
- `front/mi-front-limpio/services/planner/plannerSearchTelemetry.ts` — `planner_search_opened` emission
- `front/mi-front-limpio/navigation/plannerSearchNavigation.ts` — navigate, back, fallback helpers
- `front/mi-front-limpio/screens/planner/PlannerSearchScreen.tsx` — contractual screen (no backend)
- `scripts/planner_v1_m7_tests.ts` — 133 assertions
- `docs/implementation/planner/PLANNER_V1_M7_HOUSEHOLD_SEARCH_ENTRY_REPORT.md`
- `docs/implementation/planner/PLANNER_V1_HOUSEHOLD_TRANSITION_CONTRACT.md`
- `docs/implementation/planner/PLANNER_V1_SEARCH_ENTRY_CONTRACT.md`

### Files Modified
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` — register `PlannerSearch` screen
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — M7 context identity, late-response guards, Search entry point
- `front/mi-front-limpio/services/planner/plannerSearchGate.ts` — proper hook implementation + direct `featureFlagStore` import
- `scripts/tsconfig.test.json` — includes M7 test + new modules
- `tests/run.js` — `planner-v1-m7` command + `planner-m7` suite + `planner` includes M7
- `package.json` — `test:planner:m7` script

### Tests
- M7 suite: 133 pass / 0 fail
- M1–M6 regression: all green
- Quality: 16 commands PASS
- G0: 17 commands PASS

### Contracts Established
- `PLANNER_V1_HOUSEHOLD_TRANSITION_CONTRACT.md` — context identity, generation, ordering, abort, late guards, cache, preferences, mutations, session, error recovery, prohibitions
- `PLANNER_V1_SEARCH_ENTRY_CONTRACT.md` — flag, capability, gate, visibility, route, params, entry point, screen states, fallback, back, deep links, telemetry, privacy, out of scope

### Compliance
- Context identity has generation ✅
- Transition ordering deterministic ✅
- Sheets close on switch ✅
- Requests abort on switch ✅
- Late responses ignored ✅
- Cache A does not contaminate B ✅
- Capabilities A do not authorize B ✅
- Preferences A do not overwrite B ✅
- Late mutations do not navigate ✅
- Search uses `planner.search_entry` ✅
- Search uses capability `planner.search` ✅
- Deny-safe works ✅
- Entry point hidden by default ✅
- Route connected ✅
- Fallback safe ✅
- Back deterministic ✅
- Deep-link contract ready ✅
- Telemetry no query/PII ✅
- Search productiva NOT implemented ✅
- No Home Summary changes ✅
- No backend Search ✅
- No migrations ✅
- No dependencies installed ✅
- M8 not started ✅

```text
M7 STATUS: PASSED
M8 STATUS: AUTHORIZED
```

---

## Post-M8 Implementation Update

**Date**: 2026-07-16 (America/Buenos_Aires)
**Branch**: `v1`
**Commit**: not created (per instructions — no commit, no push)

### M8 Completion Evidence

| Test Suite | Result |
|------------|--------|
| `test:planner:m8` (hermetic unit/contract) | **PASS** (115 assertions) |
| `test:integration --suite=m8` (runtime on Supabase local) | **PASS** (86 assertions: isolation, privacy, limits 3/3/1, counts, determinism, exclusions, cleanup) |
| `test:planner` (full M1–M8 regression) | **PASS** (724 assertions across 9 suites) |
| `test:backend` | **PASS** (27 assertions) |
| `test:contracts` | **PASS** (56 assertions) |
| `test:core` | **PASS** (46 assertions) |
| `typecheck` (frontend + test TS) | **PASS** |
| `lint` (backend + frontend ESLint) | **PASS** |
| `quality` (full gate) | **PASS** |
| `test:db` | **PASS** (migration parity 33/33, lint 0) |
| `test:secrets` | **PASS** (636 paths) |
| `git diff --check` | **PASS** |

### M8 Files

| File | Action |
|------|--------|
| `backend/src/services/planner.summary.service.js` | **REPLACE** — selectors, loaders, counts, partial errors, legacy compat |
| `backend/src/controllers/planner.summary.controller.js` | **REPLACE** — canonical envelope, `planner.view` capability, telemetry |
| `backend/src/constants/plannerTelemetryEvents.js` | **MODIFY** — 3 summary events registered |
| `scripts/planner_v1_m8_tests.js` | **NEW** — 115 hermetic assertions |
| `tests/run.js` | **MODIFY** — `planner-v1-m8` command + `planner-m8` + `planner` aggregate |
| `package.json` | **MODIFY** — `test:planner:m8` script |
| `docs/implementation/planner/PLANNER_V1_M8_HOME_SUMMARY_BACKEND_REPORT.md` | **NEW** |
| `docs/implementation/planner/PLANNER_V1_HOME_SUMMARY_API_CONTRACT.md` | **NEW** |
| `docs/implementation/planner/PLANNER_V1_HOME_SUMMARY_SELECTION_CONTRACT.md` | **NEW** |

### V1 Home Summary Backend (M8)

- **Endpoint**: `GET /api/planner/summary` (unchanged)
- **Projection version**: `planner.home_summary.v1`
- **Backend is single authority** for selection (3 Tasks / 3 Events / 1 Goal)
- **Selection deterministic**: stable tie-breakers per section (documented in Selection Contract)
- **Counts**: `counts.{tasks,events,goals}` = eligible pool sizes (plural keys, not capped)
- **Partial errors**: `partial_errors[]` array with `section: 'tasks'|'events'|'goals'` entries
- **Visibility**: personal goals hidden from non-owners; tasks/events household-wide
- **Capabilities**: endpoint guarded by `planner.view` (deny-safe)
- **Legacy compat**: V0 fields emitted until M9 removes them
- **Telemetry**: 3 events (`planner_summary_loaded/partial/failed`) with allowlisted tech props only
- **Read-only**: no mutation headers required

### Constraints Verified

- No frontend Home modified ✓
- No one-tap ✓
- No M9 ✓
- No Search productive ✓
- No endpoint Summary alternative ✓
- No migrations ✓
- No new dependencies ✓
- No secrets ✓
- 3/3/1 ✓
- `counts` present ✓
- `generated_at` present ✓
- `projection_version` present ✓
- `partial_errors` format correct ✓ (plural section keys)
- Household/personal isolation ✓ (selectors enforce)
- M1–M7 regression green ✓

```text
M8 STATUS: PASSED
M9 STATUS: AUTHORIZED
```
