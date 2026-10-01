# M11.7A R1 Reliability Foundation Correction Report

## Identidad

- Milestone: M11.7A R1 - Reliability Operation Foundation Hardening
- Worktree: `C:\Users\thega\Desktop\HomePlus-worktrees\reliability-m11-7a`
- Branch: `planner-v1-reliability-m11-7a`
- Base canonica: `c8bb7cf407b2bdbb5d0ecbc64e0f8cb062168fe9`
- Checkpoint inicial: `63670adceb58c4592495314713d0141abbda8221`
- Rama historica preservada: `planner-v1-reliability`
- Commit historico preservado: `678e88ed1e0ba4572b8d1035c5243546d78cfc8f`
- Starting verdict: `RELIABILITY_FOUNDATION_INDEPENDENT_VALIDATION_FAIL`

## Archivos Reales

- `front/mi-front-limpio/services/planner/reliability/operationIdentity.ts`
- `front/mi-front-limpio/services/planner/reliability/operationStore.ts`
- `front/mi-front-limpio/services/planner/reliability/observability.ts`
- `front/mi-front-limpio/services/planner/plannerMutationIntent.ts`
- `scripts/planner_m11_7a_reliability_tests.ts`
- `tests/run.js`
- `docs/implementation/planner/M11_7A_RELIABILITY_FOUNDATION_R1_CORRECTION_REPORT.md`

## Hallazgo 1 - expectedVersion

Root cause: `createPlannerPendingOperation` convertia `ifMatch` con `Number(...)`, y el puente `toRequestJsonOptions` usaba `parseInt(...)`. Eso permitia coercion silenciosa de strings numericos o parciales antes de encolar/despachar.

Comportamiento anterior: valores como `"2"` podian convertirse a `2`; floats, `NaN`, infinitos u otros tipos no tenian una politica runtime unica en Reliability.

Politica corregida: `validatePlannerExpectedVersion` acepta solo `number` finito, entero, no negativo y dentro de `Number.MAX_SAFE_INTEGER`. Si la version es obligatoria para `VERSIONED_MUTATION`, debe existir. Si es opcional, solo la ausencia real se permite; cualquier valor presente debe cumplir la misma regla. No hay coercion.

## Hallazgo 2 - requestHash Canonico

Root cause: el `stableStringify` previo ordenaba claves, pero delegaba demasiado en `JSON.stringify` y no rechazaba antes material no representable. Podia colapsar o serializar mal `undefined`, arrays sparse, `Date`, prototipos custom, ciclos y otros valores runtime.

Comportamiento anterior: el hasher no tenia una politica JSON canonica cerrada y podia aceptar material fuera del contrato.

Politica corregida: el material permitido es `null`, boolean, string, numero finito, array denso y plain object. Las claves se ordenan recursivamente, el orden de arrays se preserva, los tipos no se mezclan, y se rechazan `Date`, `undefined`, arrays sparse, `NaN`, infinitos, bigint, function, symbol, Map, Set, RegExp, typed arrays, class instances y ciclos antes de `JSON.stringify`.

La retry de una misma intencion conserva el `requestHash` ya asignado; no se genera una nueva mutation identity.

## Hallazgo 3 - schemaVersion Durable

Root cause: el restore aceptaba un array legacy directo o cualquier objeto con `operations` array, aunque el wrapper no tuviera `schemaVersion` valida.

Comportamiento anterior: un wrapper sin version o con version incompatible podia restaurar operaciones silenciosamente si contenia un array.

Politica corregida: el restore acepta solo wrapper object con `schemaVersion: 1` y `operations` array. Se rechazan/quarantinan JSON invalido, wrapper no-object, wrapper array, `schemaVersion` faltante/string/null/desconocida/futura/antigua sin migrador, y `operations` no-array. Un wrapper incompatible no ejecuta operaciones ni se sobreescribe indiscriminadamente durante `hydrate`. Un wrapper valido con records corruptos preserva los records validos vecinos.

## Hallazgo 4 - storage_record_quarantined

Root cause: `parseStoredOperations` solo devolvia un contador de cuarentena; no conectaba la observabilidad real.

Comportamiento anterior: los records corruptos se filtraban, pero no habia evento real `storage_record_quarantined`.

Politica corregida: `createPlannerDurableOperationStore` acepta un observer opcional y emite `storage_record_quarantined` para JSON invalido, wrapper invalido, schema incompatible, operation record invalido, expectedVersion invalida, request material/hash invalido, dependencia invalida e incomplete record. El observer es tolerante a ausencia de consumidor y a excepciones.

Payload sanitizado permitido: `reason`, `source`, `count`, `schemaVersion` solo cuando es numero seguro, `operationKind` solo cuando es string segura, y timestamp del evento. El sanitizer bloquea campos privados por nombre: payload/body/draft/title/description/token/secret/mutation/idempotency/user/household/uuid/raw/stack/header, entre otros.

## Regresion Arquitectonica

Se preservo la arquitectura existente:

- mutation identity, mutationId e idempotencyKey;
- cola durable y almacenamiento AsyncStorage existentes;
- retry/backoff/replay;
- restart `in_flight` a `uncertain`;
- reconciliacion y cleanup;
- dependency graph;
- realtime neutral;
- observabilidad existente.

No se agregaron adapters productivos, UI, frontend Reliability, Supabase, migraciones, backend productivo, scheduler global, segundo storage, segunda cola ni segundo sistema de mutaciones.

## Tests y Conteos

- `node tests/run.js planner-reliability`: PASS, `M11.7A Reliability tests: 122 passed, 0 failed`.
- `npm run typecheck`: PASS, Frontend TypeScript + Test TypeScript.
- `npm run test:core`: PASS, core total cubierto por harness; backend contracts 23 assertions, frontend contracts 19 assertions, testing-core 4 tests.
- `npm run test:frontend`: PASS, Core frontend 19 assertions, G0.3 46 assertions.
- `npm run test:planner`: PASS, 20 commands. Incluye Reliability 122 assertions, frontend foundation 56, Events frontend 98, Plans frontend 106, Presets/Drafts frontend 66, Presets/Drafts integration 86, Frontend Core Integration 50, y suites Planner M1-M10 existentes.
- `npm run test:contracts`: PASS, Core backend contracts 23 assertions, G0.4 contracts 33 assertions.
- `node tests/run.js planner-foundation`: PASS, 56 assertions.
- `node tests/run.js planner-frontend-core-integration`: PASS, 50 assertions.
- `node tests/run.js planner-presets-drafts-integration`: PASS, 86 assertions.
- `node tests/run.js planner-frontend-events`: PASS, 98 assertions.
- `node tests/run.js planner-frontend-plans`: PASS, 106 assertions.
- `node tests/run.js planner-presets-drafts`: PASS, 66 assertions.
- `git diff --check`: PASS con warnings de line endings LF -> CRLF solamente.

No se redujeron las 64 assertions anteriores; la suite Reliability ahora reporta 122 assertions.

## Junctions

No se instalo ninguna dependencia y no se ejecuto `npm install`.

Junctions temporales creados para gates:

- `node_modules` -> `C:\Users\thega\Desktop\HomePlus-worktrees\reliability\node_modules`
- `backend\node_modules` -> `C:\Users\thega\Desktop\HomePlus-worktrees\integration\backend\node_modules`
- `front\mi-front-limpio\node_modules` -> `C:\Users\thega\Desktop\HomePlus-worktrees\integration\front\mi-front-limpio\node_modules`

Antes de crearlos se verifico ausencia de destinos y compatibilidad de package/lock/tsconfig aplicable. Fueron eliminados con `rmdir`. Verificacion posterior: no quedan reparse points, no quedan `node_modules` junctions y no queda `scripts/compiled-reliability`.

## Scope Excluido

- No Reliability Frontend.
- No UI.
- No adapters productivos.
- No Supabase.
- No DB-heavy gates.
- No backend productivo.
- No package manifests ni lockfiles modificados.

## Riesgos Residuales

- La inconsistencia historica documental del hash queda como `P3 DOCUMENTAL NO BLOQUEANTE`.
- El hasher mantiene el prefijo/formato `fnv1a:<8 hex>` existente; no se cambio el algoritmo para evitar romper identidad durable.
- Wrappers incompatibles se preservan durante `hydrate` en vez de ser sobrescritos automaticamente; su remediacion operativa queda fuera de este R1.

## Estado Git

Pre-commit esperado: cambios acotados a Reliability, tests y este informe. Sin backend productivo, sin migraciones, sin Supabase, sin package manifests, sin lockfiles, sin dependencias versionadas, sin outputs compilados y sin junctions.

Verdict de correccion: `RELIABILITY_FOUNDATION_R1_READY_FOR_INDEPENDENT_REAUDIT`.
