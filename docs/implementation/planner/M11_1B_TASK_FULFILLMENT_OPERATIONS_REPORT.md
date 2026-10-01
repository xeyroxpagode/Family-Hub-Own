# M11.1B — Task Assignment & Fulfillment Operations

Fecha local: 2026-07-22.

## 1. Resultado

M11.1B quedó implementado y listo para una auditoría técnica independiente.
No se declara aprobado. No se hizo commit, push, merge ni despliegue remoto.
No se inició M11.1C ni se agregó UI visible de Tasks.

Resultado terminal: `M11_1B_IMPLEMENTATION_COMPLETE`.

## 2. Base y ramas

- Root: `C:/Users/thega/Desktop/HomePlus`.
- Commit documental anterior: `c2a544b docs(planner): freeze Planner V1 functional specification`.
- `M11_1A_BASE_COMMIT`: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`.
- Commit base: `feat(planner): add task fulfillment foundation`.
- `v1`: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`.
- `planner-v1-integration`: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`.
- `planner-v1-tasks-m11-1b`: `fb4efc81b1debf5932580ef2e16cedf4afb6bb45`.
- Rama activa: `planner-v1-tasks-m11-1b`.
- `planner-v1-integration` no fue modificada después de crearla.

M11.1A ya estaba commiteado al comenzar esta ejecución. Se verificó que su
padre era `c2a544b`, que contenía exactamente la allowlist aprobada y que el
working tree estaba limpio. Los gates rápidos previos pasaron: TypeScript,
sintaxis backend, M8, M9 y `git diff --check`.

## 3. Estado Git inicial

Snapshot inicial observado:

```text
branch: v1
HEAD: fb4efc81b1debf5932580ef2e16cedf4afb6bb45
working tree: limpio
merge/rebase/cherry-pick/conflictos: ninguno
```

No se usó stash, reset destructivo, restore, checkout destructivo, force ni
amend.

## 4. Migración

Se agregó exclusivamente:

```text
supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql
```

La migración M11.1A commiteada no fue modificada.

La migración M11.1B:

- es aditiva sobre M11.1A;
- agrega metadata durable de resubmission al fulfillment;
- amplía las constraints de estado para correction/resubmit;
- define una proyección agregada V1 explícita;
- reemplaza el helper de proyección V0 para derivar status y assignee desde la
  autoridad canónica;
- agrega una escritura de audit agrupada y segura;
- implementa RPCs atómicas de assignment, claim y transición de fulfillment;
- deriva account/person/member desde `auth.uid()` y el contexto autenticado;
- usa `SECURITY DEFINER` con `search_path = pg_catalog, public`;
- revoca EXECUTE de `PUBLIC`/`anon` y concede solamente a los roles requeridos;
- mantiene RLS y los grants read-only de las tablas canónicas;
- no elimina `assigned_to_member_id` ni ningún campo V0.

Rollback conceptual documentado en la migración:

1. detener escritores V1;
2. proyectar el último estado canónico a `planner_tasks`;
3. retirar rutas V1;
4. conservar fulfillments y audit como recuperación;
5. retirar RPCs/columnas nuevas sólo mediante otra migración explícita.

## 5. Contrato API final

Se conservaron intactas las rutas V0 y se agregaron:

```text
GET  /api/planner/v1/tasks/:taskId/fulfillment
PUT  /api/planner/v1/tasks/:taskId/assignment
POST /api/planner/v1/tasks/:taskId/claim
POST /api/planner/v1/tasks/:taskId/fulfillments/:fulfillmentId/complete
POST /api/planner/v1/tasks/:taskId/fulfillments/:fulfillmentId/verify
POST /api/planner/v1/tasks/:taskId/fulfillments/:fulfillmentId/request-correction
POST /api/planner/v1/tasks/:taskId/fulfillments/:fulfillmentId/resubmit
POST /api/planner/v1/tasks/:taskId/fulfillments/:fulfillmentId/revert
POST /api/planner/v1/tasks/:taskId/fulfillments/:fulfillmentId/reopen
```

Todas las mutaciones exigen las convenciones existentes:

- `If-Match` o `expected_version`;
- `X-Mutation-Id` como operation ID estable;
- `Idempotency-Key`;
- actor derivado desde la autenticación;
- envelope de error HomePlus sin mensajes SQL internos.

El backend reutiliza `withIdempotency`, `hashIdempotencyRequest` y las RPCs
`reserve_planner_idempotency_key`/`complete_planner_idempotency_key`. No se creó
un segundo sistema de idempotencia o versionado.

## 6. DTO V1

`GET fulfillment` devuelve aditivamente:

```text
taskId
taskVersion
assignment
  kind
  mode
  version
  legacyResolutionRequired
  assignees[]
fulfillments[]
  id
  scope
  responsibleMember
  status
  version
  completedBy / completedAt
  verifiedBy / verifiedAt
  correctionRequestedBy / correctionRequestedAt / correctionComment
  resubmittedBy / resubmittedAt / resubmissionNote
  inactiveAt / retiredAt
aggregate
  state
  total
  pending
  completed
  awaitingVerification
  correctionRequested
  verified
availableActions[]
```

Los fulfillments retirados permanecen legibles como historia; sólo los current
y activos participan del agregado. Los miembros se hidratan únicamente dentro
del household del contexto. `availableActions` es una ayuda de presentación y
no sustituye la seguridad backend/RPC.

## 7. Assignment

La operación canónica soporta:

- `anyone + shared_once`;
- una o varias personas + `shared_once`;
- una o varias personas + `each_person`;
- validación de miembros activos del mismo household;
- rechazo de duplicados y formas incompatibles;
- expected version sobre la configuración de assignment;
- actualización atómica de config, assignees, fulfillments, Task V0 y audit.

Sin historia operativa, las obligaciones anteriores quedan retiradas y se
crea la forma current nueva. Con historia, la operación responde
`assignment_history_requires_explicit_transition` salvo que
`confirmHistoricalTransition=true`. La transición confirmada preserva filas,
actores, estados y timestamps anteriores como retired y nunca reutiliza una
obligación histórica.

## 8. Resolución legacy

`legacy_unassigned` nunca se crea desde las operaciones V1 y nunca se convierte
silenciosamente a `anyone`.

La resolución exige `confirmLegacyResolution=true` y un destino válido. Si la
fila además contiene historia, también se aplica la confirmación explícita de
transición histórica. El evento durable es
`task.assignment.legacy_resolved`.

## 9. Claim — “Me encargo”

Claim está disponible sólo para una Task activa `anyone + shared_once` cuyo
fulfillment shared permanece pending.

La RPC bloquea Task, config y fulfillment:

- el primer actor gana;
- el mismo ganador al repetir recibe noop/replay;
- otro actor recibe `already_claimed` y el backend adjunta el DTO V1 actual;
- no se crea un fulfillment duplicado;
- el ganador se proyecta a `assigned_to_member_id` para V0;
- se escribe un único `task.claimed`.

## 10. Operaciones de fulfillment

Todas apuntan a un fulfillment ID concreto.

- Complete: `pending -> completed` o `awaiting_verification`.
- Verify: `awaiting_verification -> verified`, sin self-verification.
- Request correction: `awaiting_verification -> correction_requested`, con
  comentario opcional normalizado y limitado a 500 caracteres.
- Resubmit: `correction_requested -> awaiting_verification`, preservando la
  corrección y aceptando nota opcional normalizada.
- Revert: `completed -> pending`, limpiando sólo la proyección current.
- Reopen: `verified -> pending`, sin crear otra Task.

Responsibility se decide por scope, assignee/responsible/completing actor y
`task.complete_any`. Verify, correction y reopen requieren `task.verify`.
Todas requieren además `planner.view`, Task operativa, fulfillment current y
expected version.

## 11. Estado agregado V1

La proyección es determinista:

```text
algún correction_requested -> correction_requested
todos pending o ninguno -> pending
pending + cualquier resuelto -> partially_completed
algún awaiting_verification sin pending/correction -> awaiting_verification
todos verified -> verified
completed + verified sin pendientes -> completed
```

No se usa porcentaje universal. El DTO devuelve conteos reales.

## 12. Proyección V0

La única dirección de autoridad es:

```text
fulfillment canónico
-> agregado V1
-> planner_tasks V0
```

Mapeo implementado:

- cancelled permanece cancelled;
- correction, pending y partial proyectan pending;
- awaiting sin pending/correction proyecta awaiting_verification;
- todos verified proyectan verified;
- obligaciones resueltas sin espera proyectan completed;
- assignment con exactamente un miembro proyecta ese member;
- anyone o multi-assignment proyecta `assigned_to_member_id = NULL`.

Home Summary, Calendar y listados V0 continúan leyendo `planner_tasks`.

## 13. RLS y capabilities

Backend y RPC exigen conjuntamente:

- actor autenticado;
- person y membership activos;
- household correcto;
- `planner.view`;
- capability operativa específica;
- responsibility/ownership cuando corresponde.

Assignment usa `task.edit_own` o `task.edit_any`. Claim usa
`task.complete_assigned`. Complete usa `task.complete_assigned`,
`task.complete_unassigned` o `task.complete_any` según la forma. Review usa
`task.verify`.

Las RPC públicas no aceptan actor IDs como autoridad. Los reads canónicos
siguen protegidos por RLS y las escrituras directas authenticated permanecen
revocadas.

## 14. Idempotencia, concurrencia y audit

La reserva común utiliza operation, key y payload hash:

- misma key + mismo payload: replay/in-flight coherente;
- misma key + payload distinto: `idempotency_conflict`;
- respuesta perdida: la reserva impide repetir el efecto;
- un noop no cambia actores, versiones ni audit.

Carreras DB reales probadas:

- claim: un winner y un `already_claimed`;
- assignment update: un winner y un `version_conflict`;
- complete shared: un winner y un noop;
- complete `each_person`: ambas obligaciones independientes se completan;
- verify: un winner y un noop;
- request correction vs verify: un winner y un `version_conflict`;
- resubmit vs reopen: una transición válida y un competidor rechazado;
- stale fulfillment/config versions: rechazo estable.

Eventos auditados exactamente una vez:

- `task.assignment.changed`;
- `task.assignment.history_transition`;
- `task.assignment.legacy_resolved`;
- `task.claimed`;
- `task.fulfillment.completed`;
- `task.fulfillment.verified`;
- `task.fulfillment.correction_requested`;
- `task.fulfillment.resubmitted`;
- `task.fulfillment.reverted`;
- `task.fulfillment.reopened`.

Cada audit conserva household, actor, Task, fulfillment cuando corresponde,
estado anterior, estado nuevo, timestamp y operation ID. Comentarios/notas
permanecen en fulfillment y el audit registra sólo su presencia para respetar
la política de metadata sensible.

## 15. Pruebas y gates

Resultados finales:

| Gate | Resultado |
|---|---|
| `node scripts/planner_m11_1b_test_runner.js --no-reset` | PASS |
| DB suite real | PASS, 65 assertions, fixtures propios y cleanup en `finally` |
| Contract/API/DTO/frontend suite | PASS, 99 assertions |
| M11.1A contract dirigido | PASS, 61 assertions |
| Frontend TypeScript `--noEmit` | PASS |
| Backend/test syntax | PASS, 101 archivos JavaScript |
| Planner M8 | PASS, 115/115 |
| Planner M9 | PASS, 50/50 |
| `supabase migration list --local` | PASS; `20260722020000` alineada |
| `supabase db lint --local --level error` | PASS, 0 errores |
| `git diff --check` | PASS; sólo avisos LF/CRLF |
| Cleanup final | PASS; cero Tasks/households/people/users M11.1B |

La suite DB cubre assignment válido/inválido, wrong household, inactive,
duplicados, anyone, multi shared/each-person, legacy, historia, claim,
fulfillment concreto, correction/resubmit, revert/reopen, self-verification,
stale versions, concurrencia, aggregates, V0 projection, RLS, escritura directa
y audit exactly-once.

No se repitió el runner exhaustivo M11.1A de 665 segundos.

## 16. Incidente CLI 502

Durante dos reconstrucciones locales previas a la continuación, Supabase CLI
aplicó todas las migraciones y luego devolvió 502/timeout durante su
comprobación post-restart de servicios. No fue un fallo SQL.

Resolución verificada sin reaplicar ni resetear:

- PostgreSQL respondió correctamente;
- catálogo: `20260722020000` aplicada;
- lista de migraciones: alineada;
- fixtures: cero;
- REST health: HTTP 200;
- Storage sin credenciales: HTTP 400, confirmando conectividad del servicio;
- `supabase status`: entorno local en ejecución.

## 17. Archivos propios de M11.1B

- `supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql`
- `backend/src/routes/planner.js`
- `backend/src/controllers/planner.tasks.controller.js`
- `backend/src/services/planner.tasks.service.js`
- `front/mi-front-limpio/services/plannerTasks.ts`
- `scripts/planner_m11_1b_database_tests.js`
- `scripts/planner_m11_1b_contract_tests.js`
- `scripts/planner_m11_1b_test_runner.js`
- `docs/implementation/planner/M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md`

No se modificaron pantallas, formularios, Task Detail/List, Home, Calendar,
Events, Plans, Presets, Functional Freeze, informes M11.1A, package files,
lockfiles o configuración de app.

## 18. Documentos externos autorizados

Los siguientes archivos aparecieron durante la ejecución, fueron confirmados
por el usuario como cambios externos autorizados y deben coexistir:

- `docs/implementation/planner/PLANNER_V1_INTEGRATION_QUEUE.md`
- `docs/implementation/planner/PLANNER_V1_MIGRATION_LEDGER.md`
- `docs/implementation/planner/PLANNER_V1_PARALLEL_OWNERSHIP_MATRIX.md`
- `docs/implementation/planner/PLANNER_V1_PARALLEL_SHARED_CONTRACTS.md`

M11.1B no los creó, modificó, eliminó, preparó ni usó para ampliar alcance.
No forman parte de los archivos propios de esta implementación.

## 19. Riesgos restantes

1. El esquema y los datos remotos siguen `UNKNOWN`; no fueron inspeccionados ni
   modificados.
2. El fallback SQL de capabilities todavía replica el subset backend de
   Household heredado de M11.1A.
3. V0 continúa representando anyone y multi-assignment con NULL; el DTO V1 es
   la lectura semántica y la migración visual pertenece a M11.1C.
4. El historial durable se preserva mediante fulfillments retired y audit; no
   existe todavía una UI visible de historia.
5. Evidence, recurrence, notifications, widgets, offline queue y Tasks
   personales permanecen fuera de alcance.
6. El modo normal del runner incluye resets para auditorías limpias; en esta
   continuación se usó `--no-reset` por instrucción expresa y se verificó
   catálogo/cleanup antes y después.

## 20. Estado remoto y readiness

- Supabase remoto: no consultado, no desplegado, no modificado.
- Git: sin commit y sin push.
- Readiness para auditoría independiente: **SÍ**.
- Aprobación de M11.1B: **NO declarada**.
- Readiness para M11.1C: no evaluada y no iniciada.

## 21. Git status final esperado

Archivos propios M11.1B sin commit:

```text
 M backend/src/controllers/planner.tasks.controller.js
 M backend/src/routes/planner.js
 M backend/src/services/planner.tasks.service.js
 M front/mi-front-limpio/services/plannerTasks.ts
?? docs/implementation/planner/M11_1B_TASK_FULFILLMENT_OPERATIONS_REPORT.md
?? scripts/planner_m11_1b_contract_tests.js
?? scripts/planner_m11_1b_database_tests.js
?? scripts/planner_m11_1b_test_runner.js
?? supabase/migrations/20260722020000_m11_1b_task_fulfillment_operations.sql
```

Además permanecen los cuatro documentos externos autorizados de la sección 18.

`M11_1B_IMPLEMENTATION_COMPLETE`
