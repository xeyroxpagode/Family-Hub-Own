# Planner V1 — matriz de pruebas

Estado: infraestructura V0 verificada; tests funcionales V1 todavía no implementados.

## 1. Infraestructura y baseline

| Check | Estado | Resultado contemporáneo |
|---|---|---|
| `npm.cmd run typecheck` | `PREREQUISITE PASS` | exit 0; frontend + fuentes TS de tests |
| `npm.cmd run lint` | `PREREQUISITE PASS` | exit 0; syntax 90 JS; backend ESLint PASS; frontend 0 errores/22 warnings aceptados |
| `npm.cmd run test:backend` | `PREREQUISITE PASS` | 4 node tests, skipped 0; 23 Core backend |
| `npm.cmd run test:frontend` | `PREREQUISITE PASS` | 19 Core frontend + 46 Planner cache/context |
| `npm.cmd run test:contracts` | `PREREQUISITE PASS` | 23 Core + 33 flags/telemetry/privacy/outbox |
| `npm.cmd run test:core` | `PREREQUISITE PASS` | Testing Core + 23 backend + 19 frontend |
| `npm.cmd run test:planner` | `PREREQUISITE PASS` | 46 Planner assertions |
| `npm.cmd run test:g0.2` | `PREREQUISITE PASS` | 115 assertions; QA session real; cleanup PASS |
| `npm.cmd run test:g0.3` | `PREREQUISITE PASS` | 46 assertions |
| `npm.cmd run test:g0.4` | `PREREQUISITE PASS` | 33 contracts + 27 DB + 5 runtime; cleanup PASS |
| `npm.cmd run test:db` | `PREREQUISITE PASS` | 7 runner + 27 transaccionales; schema 75 PASS rows; lint 0 |
| `npm.cmd run test:integration` | `PREREQUISITE PASS` | G0.2 115 + G0.4 runtime 5; cleanup PASS |
| `npm.cmd run test:g0` | `PREREQUISITE PASS` | 17 comandos; exit 0; sin skips |
| `npm.cmd run quality` | `PREREQUISITE PASS` | 16 comandos; coverage/scans/CI/whitespace PASS |
| `npm.cmd run test:db:remote` | `PREREQUISITE PASS` | read-only; parity 33/33, lint 0, 8 schema assertions |
| `npm.cmd run test:secrets` | `PREREQUISITE PASS` | 572 paths; valores nunca impresos |
| `npm.cmd run test:telemetry` | `PREREQUISITE PASS` | 33 assertions de flags/telemetry/privacy/outbox |
| `git diff --check` | `PREREQUISITE PASS` | exit 0 antes de la edición documental |

Versiones: Node `v24.13.0`, npm `11.6.2`, Supabase CLI `2.90.0`. No se instalaron dependencias.

## 2. Runner, framework y destinos V1

| Capa | Runner/framework real | Fuente destino autorizada | Helper real | Comando público |
|---|---|---|---|---|
| Frontend puro/type/navigation | Node 24 assertions + TypeScript compilado por `scripts/tsconfig.test.json` desde `tests/run.js` | `scripts/planner_v1_frontend_tests.ts`, `scripts/planner_v1_navigation_tests.ts` | `createServerState`, `plannerCache`, `plannerKeys`; helpers de proceso existentes | `npm.cmd run test:planner` / `npm.cmd run test:frontend` |
| Backend contract/service | Node 24 assertions invocadas por `tests/run.js` | `scripts/planner_v1_backend_contract_tests.js` | `createHttpError`, capability/telemetry test sinks, service stubs | `npm.cmd run test:contracts` / `npm.cmd run test:backend` |
| API/runtime local | Orquestador Node `tests/integration/run.js`, backend aislado, puerto libre, Supabase local | `scripts/planner_v1_integration_tests.js` | `tests/helpers/environment.js`, `fixtures.js`, `process.js` | `npm.cmd run test:integration` |
| DB | Node + `pg`, transacciones rollback | extensión del test V1 en `scripts/planner_v1_integration_tests.js` o suite DB focalizada | `tests/db/run.js`, RPC/schema fixtures | `npm.cmd run test:db` |
| Remoto | Supabase CLI read-only | sin fixtures remotas | `tests/db/remote.js` | `npm.cmd run test:db:remote` |
| Gate | Runner root + CI | todas las anteriores | `.github/workflows/homeplus-quality.yml` | `npm.cmd run test:g0`, `npm.cmd run quality` |

No se introduce Jest/Vitest/Detox ni una dependencia de test nueva en M1. La lógica automatizable se extrae a módulos puros y se ejecuta con el runner oficial. Gestures, cold start móvil real, VoiceOver/TalkBack, teclado y safe areas conservan validación runtime.

## 3. Fichas V1 planificadas

Abreviaturas de archivo: `FE` = `scripts/planner_v1_frontend_tests.ts`; `NAV` = `scripts/planner_v1_navigation_tests.ts`; `BE` = `scripts/planner_v1_backend_contract_tests.js`; `INT` = `scripts/planner_v1_integration_tests.js`.

| ID | Tipo / estado | Framework y archivo | Helper/fixture real | Expectativa | Comando | Fase |
|---|---|---|---|---|---|---|
| V1-NAV-01 | type/navigation — `PLANNED` | Node+TS / `NAV` | navigation types + path parser puro | Solo IDs/metadata; paths Task/Event/Goal/Search tipados | `test:planner` | M1 |
| V1-NAV-02 | navigation runtime — `RUNTIME_REQUIRED` | build app + checklist M12 | sesión local de `tests/helpers/environment.js` | Cold/warm deep link y back stack determinístico | `test:integration` + runtime | M10/M12 |
| V1-NAV-03 | integration — `PLANNED` | Node / `INT` | fixture auth+household local | ID inválido/forbidden → 404/403 envelope, sin crash | `test:integration` | M10 |
| V1-NAV-04 | flag/navigation — `PLANNED` | Node+TS / `NAV`,`FE` | `featureFlagStore`, capability projection | Search false no expone entry; true+capability lo permite | `test:planner` | M7 |
| V1-SHL-01 | state reducer — `PLANNED` | Node+TS / `FE` | ApiError/status fixtures | Loading/refresh/content no duplican fetch | `test:planner` | M2 |
| V1-SHL-02 | states — `PLANNED` | Node+TS / `FE` | matriz 403/404/409/412/422/5xx/offline | Estado y retry correcto para cada clase | `test:planner` | M2 |
| V1-SHL-03 | boundary contract — `PLANNED` | Node+TS / `FE` | throwing-child adapter puro + telemetry test sink | Fallback recuperable y evento sin PII | `test:frontend`, `test:contracts` | M2 |
| V1-TAB-01 | preference unit — `PLANNED` | Node+TS / `FE` | storage adapter in-memory | Primera visita usa Tasks | `test:planner` | M6 |
| V1-TAB-02 | preference isolation — `PLANNED` | Node+TS / `FE` | dos accounts/dos households | Persiste/restaura por ambos IDs | `test:planner` | M6 |
| V1-TAB-03 | corruption/sign-out — `PLANNED` | Node+TS / `FE` | storage corrupto + session lifecycle | Valor inválido usa Tasks; cleanup scoped | `test:planner` | M6 |
| V1-SHEET-01 | host state — `PLANNED` | Node+TS / `FE` | state machine del SheetContext | Una instancia/apertura aunque cambie navegación | `test:planner` | M3 |
| V1-SHEET-02 | input dedupe — `PLANNED` | Node+TS / `FE` | fake clock + mutation ID factory | Tap/double tap produce un open/intent | `test:planner` | M3 |
| V1-SHEET-03 | gestures/focus — `RUNTIME_REQUIRED` | build app | trigger refs, back/backdrop/swipe real | Cierre idempotente y foco restaurado | runtime M11/M12 | M3/M11 |
| V1-SHEET-04 | submit lock — `PLANNED` | Node+TS / `FE` | deferred promise helper | Ninguna vía cierra durante submit | `test:planner` | M3 |
| V1-SHEET-05 | layout — `RUNTIME_REQUIRED` | build app | teclado/orientación/safe-area/fuente grande | CTA y errores visibles | runtime M11/M12 | M3/M11 |
| V1-QA-01 | capability unit/contract — `PLANNED` | Node+TS+Node / `FE`,`BE` | catálogo real y matrix fixture | Cada acción se muestra solo con capability pertinente | `test:planner`, `test:contracts` | M4 |
| V1-QA-02 | API security — `PLANNED` | Node / `INT` | child/coordinator fixture G0.2 | POST forzado sin grant → 403, sin side effect | `test:integration` | M4 |
| V1-QA-04 | idempotency — `PLANNED` | Node / `INT` | same-intent helper, DB cleanup | Double tap/retry crea una entidad | `test:integration` | M4/M5 |
| V1-QA-05 | mutation correlation — `PLANNED` | Node / `INT` | request/mutation capture + audit query | ID cruza response/audit/telemetry permitido | `test:integration`, `test:db` | M4/M5 |
| V1-QA-06 | menu content — `PLANNED` | Node+TS / `FE` | quick-action descriptor puro | Exactamente Task/Event/Goal; sin Invite | `test:planner` | M4 |
| V1-QA-07 | visual contract — `PLANNED` | Node+TS / `FE` | descriptor icon/name/state | Icono no emoji, círculo y nombre visible | `test:planner` | M4 |
| V1-QA-08 | activation — `PLANNED` | Node+TS / `FE` | fake press stream | Una activación por tap; no submit/open duplicado | `test:planner` | M4 |
| V1-QA-09 | state contract — `PLANNED` | Node+TS / `FE` | normal/pressed/disabled/loading/focus matrix | Estados diferenciables | `test:planner` | M4 |
| V1-QA-10 | a11y visual — `RUNTIME_REQUIRED` | build app + VoiceOver/TalkBack | dispositivo/emulador | Target, contraste, foco y anuncio correctos | runtime M11/M12 | M4/M11 |
| V1-GOAL-01 | quick form — `PLANNED` | Node+TS / `FE` | draft reducer/payload builder | Campos/orden/defaults; opcionales no bloquean | `test:planner` | M5 |
| V1-GOAL-02 | API contract — `PLANNED` | Node / `BE`,`INT` | goal request fixture | Backend persiste `current_value=0` aunque input lo altere | `test:contracts`, `test:integration` | M5 |
| V1-GOAL-03 | navigation — `PLANNED` | Node+TS / `NAV` | canonical goal response | Success abre GoalDetail con source/justCreated | `test:planner` | M5 |
| V1-GOAL-04 | fault/retry — `PLANNED` | Node+TS+Node / `FE`,`INT` | 409/412/422/5xx/offline matrix | Draft/identity intactos; sin duplicado | `test:planner`, `test:integration` | M5 |
| V1-GOAL-05 | cache sequence — `PLANNED` | Node+TS / `FE` | `plannerCache` snapshot | Response canónica → Goals/Summary → detail | `test:planner` | M5 |
| V1-GOAL-06 | post-create — `PLANNED` | Node+TS / `FE` | mode matrix + consumed token | Acción por modo aparece exactamente una vez | `test:planner` | M5 |
| V1-SRCH-01 | flag/capability — `PLANNED` | Node+TS+Node / `FE`,`BE` | registry/store/projection real | false oculta; true requiere `planner.search`; no endpoint | `test:planner`, `test:contracts` | M7 |
| V1-SRCH-02 | entry state/privacy — `PLANNED` | Node+TS / `FE` | telemetry test sink | Fallback/back/estados; evento sin query | `test:planner`, `test:contracts` | M7 |
| V1-SUM-01 | API shape — `PLANNED` | Node / `BE`,`INT` | seeded local tasks/events/goals | Shape/counts/3/3/1 exactos | `test:contracts`, `test:integration` | M8 |
| V1-SUM-02 | service determinism — `PLANNED` | Node / `BE` | fixed clock/timezone/tie fixtures | Orden estable para empates/timezone | `test:contracts` | M8 |
| V1-SUM-03 | partial sections — `PLANNED` | Node / `BE` | injected repo failure | Una sección falla; otras sobreviven; code/section correctos | `test:contracts` | M8 |
| V1-SUM-04 | frontend projection — `PLANNED` | Node+TS / `FE` | request counter adapter | Una request; cero ranking/fan-out cliente | `test:planner` | M9 |
| V1-SUM-05 | optimistic success — `PLANNED` | Node+TS / `FE` | detail/list/Summary snapshot | Patch y reconcile con versión server | `test:planner` | M9 |
| V1-SUM-06 | rollback — `PLANNED` | Node+TS / `FE` | fault matrix + snapshots | 403/409/412/422/5xx/offline restaura todas las keys | `test:planner` | M9 |
| V1-SUM-07 | counts — `PLANNED` | Node / `BE` | seeded counts fixture | Counts siempre presentes y coherentes | `test:contracts` | M8 |
| V1-CACHE-01 | isolation — `PLANNED` | Node+TS / `FE` | existing two-household helper | Ninguna key omite household; late write rechazada | `test:planner` | M7 |
| V1-CACHE-02 | invalidation — `PLANNED` | Node+TS / `FE` | `getInvalidationKeys`, dump | Solo grafo dirigido; nunca global refetch | `test:planner` | M4/M9 |
| V1-CTX-01 | switch ordering — `PLANNED` | Node+TS / `FE` | lifecycle handlers + deferred activation | Host cierra antes de activar B | `test:frontend`, `test:planner` | M7 |
| V1-CTX-02 | late response — `PLANNED` | Node+TS+Node / `FE`,`INT` | two-household delayed fixture | Respuesta A no escribe/renderiza en B | `test:planner`, `test:integration` | M7 |
| V1-CTX-03 | sign-out — `PLANNED` | Node+TS / `FE` | session lifecycle + store dumps | Host/requests/cache/flags/prefs limpiados | `test:frontend`, `test:planner` | M7 |
| V1-ERR-01 | error envelope — `PLANNED` | Node / `BE`,`INT` | status/error matrix | Status/code/request_id coherentes; 5xx redactado | `test:contracts`, `test:integration` | M1 |
| V1-OUT-01 | outbox chaos — `PLANNED` | Node+DB / `INT` | existing outbox registry/DB helpers | Retry/lease/dedupe/dead-letter; efecto lógico idempotente | `test:integration`, `test:db` | M12 |
| V1-TEL-01 | schema — `PLANNED` | Node / `BE` | `createTestTelemetrySink` | Todos los eventos/required props válidos | `test:contracts` | M11 |
| V1-TEL-02 | privacy — `PLANNED` | Node / `BE` | PII/secret matcher existente | Sin títulos/nombres/emails/IDs/query cruda | `test:contracts`, `test:secrets` | M11 |
| V1-A11Y-01 | screen reader — `RUNTIME_REQUIRED` | build app | VoiceOver+TalkBack | Roles/labels/selected/foco/anuncios correctos | runtime M11/M12 | M11 |
| V1-A11Y-02 | interaction — `RUNTIME_REQUIRED` | build app | device font/motion/keyboard matrix | Targets, contraste, teclado y reduced motion | runtime M11/M12 | M11 |
| V1-CHAOS-01 | network — `PLANNED` | Node / `INT` | timeout/abort/offline/429 adapter | Estado recuperable; sin corrupción/duplicado | `test:integration` | M12 |
| V1-CHAOS-02 | concurrency — `PLANNED` | Node / `INT` | two-client version fixture | Cliente B recibe 412 y refresca controladamente | `test:integration` | M12 |
| V1-CHAOS-03 | process/outbox — `PLANNED` | Node+DB / `INT` | worker restart + lease expiry fixture | Entrega recuperable y dedupe lógico | `test:integration`, `test:db` | M12 |

## 4. Matriz de capabilities Quick Actions

| Contexto | Task | Event | Goal | Esperado |
|---|---:|---:|---:|---|
| Sin grants | no | no | no | No sheet vacío; API deniega request forzada |
| Personal | `task.create_personal` | `event.create_personal` | `goal.create_personal` | Acción personal visible; scope personal |
| Household | `task.create_household` | `event.create_household` | `goal.create_household` | Acción hogar visible; membership server-side |
| Mezcla | por capability | por capability | por capability | Cada acción independiente; nunca derivar de role |
| UI manipulada | cualquiera | cualquiera | cualquiera | Servidor decide; 403 tipado; sin side effect |

## 5. Invalidación y rollback

| Mutación | Keys reales | Optimismo | Confirmación/rollback |
|---|---|---|---|
| Create task/event/goal | `*.all/list`, detail si existe, `summary`; trash/calendar según grafo | Insertar solo con orden determinístico; si no, invalidar | Reemplazar temp por entidad/version server; error retira temp/restaura snapshots |
| Complete task one-tap | `tasks.detail/all/list`, `summary` | Snapshot completo + patch | Reconcile server; 403/409/412/422/5xx/offline usa `rollbackOptimistic` |
| Update/cancel/trash/restore | detail + collections + Summary; trash cuando corresponde | Patch dirigido | Reconcile o restaurar status/version/posición exactos |
| Switch/sign-out | scope anterior / sesión | Ninguno entre contextos | Cancelar requests, avanzar generation, limpiar scope/session |

## 6. Gate de cada fase

Cada fase ejecuta `typecheck`, `lint`, el comando focalizado y `git diff --check`. M12/M13 ejecutan además `test:g0`, `quality`, `test:integration`, `test:db`, `test:db:remote`, secret/privacy scans y evidencia runtime. Ningún caso V1 se marca PASS antes de que su implementación y assertion existan.
