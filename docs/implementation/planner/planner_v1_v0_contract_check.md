# Planner V1 — revalidación de contratos V0

Auditado el 2026-07-14 (America/Buenos_Aires) sobre rama `v1`, commit `cec151b5e6b2d063d60a5f614cbf7134c800de9f`, con working tree inicial limpio.

```text
V0 CONTRACT GATE: PASSED
```

## Resumen

| Estado | Cantidad |
|---|---:|
| AVAILABLE | 17 |
| BLOCKED | 0 |
| RUNTIME_REQUIRED | 0 |
| Total | 17 |

Los estados califican la infraestructura que V1 necesita para comenzar, no la implementación de las funciones V1. Las suites V1 continúan planificadas.

## Matriz contractual reproducible

| ID | Contrato / estado | API física, archivo y símbolos reales | Verificación y resultado actual | Uso exacto en V1 |
|---|---|---|---|---|
| V0-C01 | Identidad canónica — `AVAILABLE` | `backend/src/services/planner.context.service.js`: `getPlannerContext`; devuelve `accountId`, `personId`, `membershipId`, `householdId` | `npm.cmd run test:g0.2` → exit 0, 115 assertions, cleanup PASS | IDs de actor, ownership, assignment y navegación; nunca aliases de persona como autoridad |
| V0-C02 | Hogar activo server-side — `AVAILABLE` | `getPlannerContext` deriva `people.active_household_id`, carga `household_members` activo y `households` | `npm.cmd run test:g0.2` → exit 0; `npm.cmd run test:integration` → exit 0 | Todas las lecturas/mutaciones V1 quedan scoped por el contexto autenticado; ningún body decide el hogar |
| V0-C03 | Membresía y capabilities — `AVAILABLE` | Engine `backend/src/lib/capabilityEngine.js`: `createCapabilityCatalog`, `projectCapabilities`, `hasCapability`, `assertCapability`; catálogo `backend/src/lib/plannerCapabilities.js`: `PLANNER_CAPABILITIES`, `resolveCapabilities`; endpoint `GET /api/planner/capabilities`; frontend `services/plannerCapabilities.ts` | `npm.cmd run test:contracts` → Core 23 + G0.4 33; `npm.cmd run test:g0.2` → proyección de 38 claves y denial server-side, 115 assertions | Shell/acciones usan proyección para UX; controladores vuelven a verificar. Quick Actions usa `task.create_household|personal`, `event.create_household|personal`, `goal.create_household|personal`; Search requiere además `planner.search` |
| V0-C04 | Errores tipados — `AVAILABLE` | `backend/src/lib/httpErrors.js`: `buildApiErrorEnvelope`, `sendApiError`; `backend/src/middleware/errorEnvelopeMiddleware.js`; `front/mi-front-limpio/services/api.ts`: `ApiError`, `requestJson`; forma `{ error: { code, message, request_id, details? } }` | `npm.cmd run test:backend` → 4 node tests + 23 assertions; `npm.cmd run test:g0.2` → 401/403/404/412/422 y correlación reales | `PlannerStateView`, retries, conflictos y soporte muestran status/code/request ID sin exponer detalles 5xx |
| V0-C05 | Versionado y concurrencia — `AVAILABLE` | `backend/src/lib/mutationContracts.js`: `parseRequiredExpectedVersion`, `assertExpectedVersionMatches`; `If-Match` obligatorio en controladores; ausencia → `422/expected_version_required`; stale → `412/version_conflict_v2` con `details.current/expected`; triggers `version` en las cuatro tablas | `npm.cmd run test:g0.2` → absence/stale PASS; `npm.cmd run test:db` → exit 0; paridad 33/33 | Toda mutación V1 sobre entidad existente envía versión canónica; éxito reemplaza cache con la nueva versión; 412 revierte y refresca, sin retry ciego |
| V0-C06 | Idempotencia — `AVAILABLE` | `backend/src/lib/plannerIdempotencyAdapter.js`: `hashIdempotencyRequest`, `withIdempotency`; RPCs `reserve_planner_idempotency_key`, `complete_planner_idempotency_key`; store `planner_idempotency_keys`; controladores exigen `Idempotency-Key` | `npm.cmd run test:g0.2` → required/replay PASS; `npm.cmd run test:db` → store/schema/paridad PASS | Una intención de create/update conserva key en retries; replay devuelve status/body; misma key con payload distinto produce `idempotency_key_conflict` |
| V0-C07 | Headers de mutación — `AVAILABLE` | `front/mi-front-limpio/services/api.ts`: `generateMutationId`, `OPERATION_KINDS`, `requestJson`; backend `requireMutationId`; middleware expone/eco `X-Mutation-Id` | `npm.cmd run test:g0.2` → mutation echo, required headers y replay PASS; `npm.cmd run test:contracts` → parsing/echo Core PASS | `PlannerSheetHost` mantiene una identidad por intención; transporta `X-Mutation-Id`, `Idempotency-Key` y `If-Match`; correlaciona errores, telemetry y audit |
| V0-C08 | Feature flags — `AVAILABLE` | Registry `backend/src/lib/featureFlagRegistry.js`; composición `backend/src/config/featureFlags.js`; definición `backend/src/constants/plannerFeatureFlags.js`; endpoint `GET /api/feature-flags`; frontend `FeatureFlagsContext`, `fetchFeatureFlagProjection`, `featureFlagStore`; clave `planner.search_entry`, default `false` | `npm.cmd run test:telemetry` → 33 assertions; `npm.cmd run test:g0.4` → 33+27+5; default/override/kill/environment/rollout/proyección PASS | Search entry se muestra solo si `planner.search_entry === true` y capability `planner.search`; kill switch y error dejan el entry oculto; Search productiva sigue fuera de V1 |
| V0-C09 | Cache por hogar — `AVAILABLE` | Core `services/core/serverState.ts`: `createServerState`; Planner `services/planner/plannerCache.ts`; keys `services/planner/plannerKeys.ts`; scopes explícitos por household y capabilities por account+household+membership | `npm.cmd run test:frontend` → Core 19 + Planner 46; `npm.cmd run test:planner` → exit 0 | Lists/detail/summary/capabilities usan keys canónicas; ninguna respuesta ni snapshot cruza hogares |
| V0-C10 | Invalidación dirigida — `AVAILABLE` | `plannerCache.getInvalidationKeys`, `executeInvalidation`, `applyOptimisticPatch`, `reconcileOptimistic`, `rollbackOptimistic`; prefix estructural en `serverState.invalidatePrefix` | `npm.cmd run test:g0.3` → 46 assertions; `npm.cmd run test:core` → 19 frontend + 23 backend | Mutaciones V1 invalidan detail/collection/summary/trash/calendar según grafo; one-tap captura snapshot y revierte exactamente; no `refetchAll` |
| V0-C11 | Telemetría — `AVAILABLE` | `backend/src/lib/telemetry.js`: catálogo, `track`, sinks noop/console/test; composición `backend/src/config/telemetry.js`; catálogo Planner `plannerTelemetryEvents.js`; privacidad `dataPrivacy.js` | `npm.cmd run test:telemetry` → 33 assertions, PII directa/anidada/valor/payload PASS; `npm.cmd run test:secrets` → 572 paths PASS | M2–M11 registra eventos V1 agregando esquemas Planner; properties técnicas allowlisted y correlación segura; no títulos, nombres, queries ni IDs de dominio |
| V0-C12 | Audit/outbox — `AVAILABLE` | Tablas `audit_events`, `outbox_events`; RPCs `record_audit_and_enqueue_outbox`, `claim_outbox_events`, `complete_outbox_event`, `fail_outbox_event`, `retry_dead_letter_outbox_event`; `outboxRegistry`, `outboxRetryPolicy`, `outboxProcessor.service`; `task.complete` usa `complete_planner_task_with_audit` | `npm.cmd run test:audit-outbox` está publicado; evidencia contemporánea equivalente: `test:g0.4` → 27 DB + 33 contratos + 5 runtime; remoto confirma ambas tablas | Las mutaciones V1 auditable usan transacción DB; solo side effects reales crean outbox; worker conserva leases, dedupe, retry y dead-letter. `planner_activity_log` no es autoridad |
| V0-C13 | Cancel/archive/trash — `AVAILABLE` | Rutas reales task/event cancel/reactivate/trash/restore y goal/milestone trash/restore en `backend/src/routes/planner.js`; estados y servicios V0 | `npm.cmd run test:g0.2`, `npm.cmd run test:planner`, `npm.cmd run test:db` → exit 0 | V1 reutiliza cancel/trash/restore. Archive está explícitamente fuera de V1 y sus capabilities reservadas permanecen false; no se mapea archive a trash |
| V0-C14 | Migraciones aplicadas — `AVAILABLE` | 33 archivos en `supabase/migrations`, hasta `20260715010000_remove_broken_legacy_rpcs.sql`; G0.4 en `20260714010000_homeplus_g0_4_operation_rollout.sql` | `supabase migration list` → 33 local = 33 remoto; `npm.cmd run test:db:remote` → exit 0, lint 0, 8 schema assertions | M1 parte del mismo SHA y schema; V1 no crea migración por adelantado ni modifica historia aplicada |
| V0-C15 | Tests V0 — `AVAILABLE` | Runner raíz `tests/run.js`; integración `tests/integration/run.js`; DB `tests/db/run.js`, `tests/db/remote.js`; helpers `tests/helpers/*`; CI `.github/workflows/homeplus-quality.yml` | Todos los comandos oficiales listados abajo devolvieron exit 0, sin skips | Las suites V1 se agregan al runner y conservan comandos root; runtime móvil sigue siendo validación futura, no ausencia de runner |
| V0-C16 | Compilación/lint — `AVAILABLE` | Scripts root `typecheck`, `lint`, `quality`; TypeScript root/frontend, ESLint backend/Expo frontend y syntax global | `npm.cmd run typecheck` y `npm.cmd run lint` → exit 0; frontend 0 errores/22 warnings aceptados; backend/test syntax 90 archivos | M1 tiene baseline verde; cada microfase ejecuta typecheck/lint y su suite; warnings no bloquean por contrato G0.5 |
| V0-C17 | Compatibilidad cliente-servidor — `AVAILABLE` | `requestJson` soporta canonical/legacy envelope, headers/policies/abort; servicios Planner usan rutas reales; adapters documentados: `plannerMutationContracts`, `versionHelpers`, `idempotencyHelpers`, `plannerCache` | `npm.cmd run test:g0`, `npm.cmd run quality`, `npm.cmd run test:integration` → exit 0 | M1 puede tipar navegación/transporte sin cambiar protocolo V0. Los shapes Summary y pantallas son trabajo V1 planificado, no contradicción del gate |

## APIs físicas consumidas por M1

- Transporte: `requestJson`, `ApiError`, `AbortError`, `OPERATION_KINDS`, `generateMutationId`.
- Capabilities: `PLANNER_CAPABILITIES`, `fetchPlannerCapabilitiesCached`, `hasCapability`, `hasAnyCapability`.
- Cache: `plannerKeys`, `plannerCache`, `createServerState`.
- Lifecycle: `runHouseholdSwitch`, `runSessionCleanup`, `registerLifecycleHandlers`.
- Feature flags: `useFeatureFlags`, `planner.search_entry`.
- Telemetría: `telemetry.track`, `telemetryCatalog`.
- Audit/outbox: RPCs y processor enumerados en V0-C12.

## Evidencia de ejecución contemporánea

| Comando | Exit | Evidencia |
|---|---:|---|
| `npm.cmd run typecheck` | 0 | 2 comandos |
| `npm.cmd run lint` | 0 | backend/test syntax 90; frontend 0 errores/22 warnings |
| `npm.cmd run test:backend` | 0 | Testing Core 4 tests, skipped 0; Core 23 |
| `npm.cmd run test:frontend` | 0 | Core frontend 19 + Planner 46 |
| `npm.cmd run test:contracts` | 0 | Core 23 + G0.4 33 |
| `npm.cmd run test:core` | 0 | Testing Core + 23 backend + 19 frontend |
| `npm.cmd run test:planner` | 0 | Planner cache/context 46 |
| `npm.cmd run test:g0.2` | 0 | 115 assertions; fixture cleanup PASS |
| `npm.cmd run test:g0.3` | 0 | 46 assertions |
| `npm.cmd run test:g0.4` | 0 | 33 contratos + 27 DB + 5 runtime; cleanup PASS |
| `npm.cmd run test:db` | 0 | 7 runner + 27 transaccionales; schema 75 PASS rows; lint 0 |
| `npm.cmd run test:integration` | 0 | G0.2 115 + G0.4 runtime 5; cleanup PASS |
| `npm.cmd run test:g0` | 0 | 17 comandos; sin skips |
| `npm.cmd run quality` | 0 | 16 comandos; coverage/scans/CI/whitespace PASS |
| `npm.cmd run test:db:remote` | 0 | parity 33/33, lint 0, 8 schema assertions |
| `npm.cmd run test:secrets` | 0 | 572 paths; valores nunca impresos |
| `npm.cmd run test:telemetry` | 0 | 33 assertions de flags/telemetry/privacy/outbox |
| `supabase db lint --local --level error --fail-on error` | 0 | 0 errores |
| `supabase db lint --linked --level error --fail-on error` | 0 | 0 errores |
| `git diff --check` (antes de editar docs) | 0 | sin errores |

## Dictamen

Los 17 contratos requeridos están disponibles mediante APIs físicas, schema desplegado y comandos reproducibles. No se implementó Planner V1 durante esta revalidación.

```text
PLANNER V1 FOCUSED READINESS REVALIDATION: PASSED
V0 CONTRACT GATE: PASSED
```
