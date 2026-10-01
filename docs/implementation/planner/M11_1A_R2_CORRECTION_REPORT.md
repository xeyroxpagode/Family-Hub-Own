# M11.1A-R2 — Final Security and Test-Gate Correction Report

Fecha local: 2026-07-22.

Resultado de la corrección: **completa dentro del alcance R2**.  
Estado de aprobación: **no aprobado**; queda listo únicamente para una nueva
auditoría técnica read-only independiente.

## 1. Estado Git inicial y seguridad

- Root: `C:/Users/thega/Desktop/HomePlus`.
- Branch: `v1`.
- HEAD inicial y final: `c2a544b docs(planner): freeze Planner V1 functional specification`.
- La implementación M11.1A/R1 y sus informes continuaban sin commit.
- `M11_1A_R1_CODE_AUDIT.md` estaba presente.
- No había merge, rebase, cherry-pick, conflictos ni otro cambio ajeno.
- No se usó stash, reset destructivo, restore ni checkout destructivo.
- No se hizo commit, push ni despliegue remoto.

Estado inicial observado:

```text
 M backend/src/controllers/planner.tasks.controller.js
 M backend/src/services/planner.goals.service.js
 M backend/src/services/planner.tasks.service.js
 M front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx
 M front/mi-front-limpio/services/plannerGoals.ts
?? docs/implementation/planner/M11_1A_CODE_AUDIT.md
?? docs/implementation/planner/M11_1A_CORRECTION_REPORT.md
?? docs/implementation/planner/M11_1A_R1_CODE_AUDIT.md
?? docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md
?? scripts/planner_m11_1a_contract_tests.js
?? scripts/planner_m11_1a_database_tests.js
?? scripts/planner_m11_1a_test_runner.js
?? supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql
```

## 2. R1-01 — Estado inicial de Task cerrado

### Policy INSERT final

`planner_tasks_insert_capability` exige ahora en PostgreSQL:

```text
membership activa
+ task.create_household
+ creator member/person derivados
+ status = pending
+ completion actor/person/timestamp = NULL
+ verification actor/person/timestamp = NULL
+ cancelled_at = NULL
+ cancelled_by_member_id = NULL
+ cancelled_reason = NULL
+ cancelled_from_status = NULL
+ trashed_at = NULL
+ trashed_by_member_id = NULL
+ assignee NULL o activo del mismo household
```

El catálogo local confirmó la policy efectiva con todas esas condiciones.

Se agregó además el CHECK validado
`planner_tasks_cancellation_lifecycle_shape_check`:

- una Task cancelada requiere `cancelled_at` y un `cancelled_from_status`
  válido entre pending/completed/awaiting_verification/verified;
- una Task no cancelada no puede conservar timestamp, actor, razón ni estado
  previo de cancelación.

No se agregó un CHECK global status/completion que contradijera la proyección
V0 válida de `each_person`: una Task agregada puede seguir pending mientras una
obligación individual ya aporta metadata de completion.

### Backend

Controller y service llaman `assertTaskCreateBody()` antes de persistir. El
service vuelve a ejecutarlo como defensa si se invoca sin controller.

Se rechazan como client-owned:

- `status`;
- completion member/person/timestamp;
- verification member/person/timestamp;
- cancellation timestamp/actor/reason/from-status;
- trash timestamp/actor;
- `version`.

El error estable es HTTP 400 con código:

```text
protected_task_lifecycle_field
```

No se modificó el DTO visible V0.

### Pruebas reales de INSERT

La DB suite probó individualmente:

- `cancelled_at`;
- `cancelled_by_member_id` propio;
- `cancelled_by_member_id` de otro miembro del mismo household;
- `cancelled_reason`;
- `cancelled_from_status`;
- `trashed_at`;
- `trashed_by_member_id` propio;
- `trashed_by_member_id` de otro miembro del mismo household;
- una combinación de todos los campos anteriores.

Cada intento fue rechazado y un snapshot antes/después confirmó cero efectos
nuevos en Task, config, assignee, fulfillment y audit.

El control positivo confirmó:

- Task `pending` limpia;
- bootstrap de config y fulfillment;
- fulfillment inicial en versión 1.

## 3. R1-02 — Reset garantizado del runner

### Arquitectura

`planner_m11_1a_test_runner.js` separa ahora:

```text
mainBody()
→ ejecución de escenarios y suites

executeWithGuaranteedReset()
→ captura el error principal
→ finally intenta siempre final clean reconstruction
→ conserva por separado un posible error de reset
→ falla si existió cualquiera de los dos
```

Si fallan prueba y reset, el output contiene ambos bloques:

```text
PRIMARY FAILURE
FINAL RESET FAILURE
```

El cleanup exitoso nunca transforma un fallo principal en PASS.

### Fallo determinista automatizado

Se agregó la variable exclusiva de tests:

```text
M11_1A_TEST_FAIL_AFTER=<stage>
```

Stages implementados:

- `invalid-fixture-seeded`;
- `valid-backfill`;
- `database-suite-1`;
- `database-suite-2`.

El modo:

```text
node scripts/planner_m11_1a_test_runner.js --verify-failure-path
```

ejecutó un hijo que falló después de crear un fixture inválido. Resultado:

- hijo con exit code distinto de cero;
- causa original preservada:
  `M11.1A deterministic test failure after invalid-fixture-seeded`;
- marcador `final clean reconstruction (always)` presente;
- reset final exitoso;
- cero fixtures M11.1A;
- audit/outbox en cero;
- migración `20260722010000` aplicada;
- `supabase migration list --local` alineada;
- verificador padre: `M11.1A RUNNER FAILURE PATH: PASS`;
- duración observada: 78,3 s.

## 4. R1-03 — Reporte y preflight alineados

### Preflight final

La migración aborta con mensajes específicos, no genéricos, para:

1. creator no mapeable;
2. assignee cross-household;
3. completion actor cross-household;
4. verification actor cross-household;
5. cancellation actor cross-household;
6. trash actor cross-household;
7. member/person mismatch;
8. pending con metadata terminal;
9. completed inconsistente;
10. awaiting_verification inconsistente;
11. verified inconsistente;
12. cancelled inconsistente.

El runner crea un fixture pre-M11 independiente para cada una de esas doce
categorías, exige el mensaje esperado, reconstruye la base después de cada
blocker y confirma que el fixture desapareció.

Los actores completion/verification legacy con person pero sin member siguen
siendo reportables como no mapeables y no se reinterpretan silenciosamente.

### Reporte final

`planner_m11_1a_backfill_report()` expone:

- `tasks_total`;
- `assignment_configs`;
- `assignees_active`;
- `fulfillments_current`;
- `legacy_unassigned`;
- `unmappable_actors`, con breakdown creator/completion/verification;
- cada actor cross-household por separado, incluido trash;
- `member_person_mismatch`;
- cada inconsistencia de estado por separado;
- `derived_household_inconsistent`;
- `count_inconsistent`;
- `blocking_rows`;
- `cancelled_inactive`.

`blocking_rows` cuenta Tasks distintas de la unión de todas las categorías
bloqueantes; una Task que viola varias condiciones se cuenta una sola vez.

Las categorías derivadas y de conteos sólo existen después de crear el modelo
canónico. Se prueban con intentos transaccionales independientes en la DB suite:
household derivado distinto, member/Task de otro household, scopes mixtos,
cantidad insuficiente en `each_person` y set de responsible members inválido.
El backfill válido y el estado vivo válido `each_person` produjeron
`blocking_rows=0` y `count_inconsistent=0`.

Snapshot final real del reporte:

```text
tasks_total=0
assignment_configs=0
assignees_active=0
fulfillments_current=0
legacy_unassigned=0
blocking_rows=0
derived_household_inconsistent=0
count_inconsistent=0
```

## 5. R1-04 — Paridad planner.view + complete/verify

Regla aplicada en todas las capas:

```text
complete
→ planner.view
+ task.complete_assigned / task.complete_unassigned / task.complete_any

verify
→ planner.view
+ task.verify
```

- Controller hace `assertCapability(..., 'planner.view')` antes de complete y
  verify.
- Service resuelve nuevamente las capabilities desde membership, role y
  `household.config.permissions`.
- RPC complete rechaza antes de resolver assignment si no existe
  `planner.view`.
- RPC verify exige conjuntamente `planner.view` y `task.verify`.
- No se creó una capability nueva ni se modificó `plannerCapabilities.js`.

Backend y RPC probaron los tres overrides de completion:

| planner.view | task.complete_assigned | Resultado |
|---|---|---|
| false | true | rechazo |
| true | false | rechazo |
| true | true | permitido |

Y los equivalentes de verification:

| planner.view | task.verify | Resultado |
|---|---|---|
| false | true | rechazo |
| true | false | rechazo |
| true | true | permitido |

Los rechazos RPC reales usaron SQLSTATE `42501`.

## 6. No regresiones B2–B5

La DB suite revalidó:

- assignment con historia rechazado con
  `assignment_history_requires_explicit_transition` y snapshot completo
  inalterado;
- una única modalidad current mediante constraint triggers diferidos;
- `each_person` con exactamente una obligación por assignee;
- guard bidireccional terminal→pending y protección de actores/timestamps;
- proyección V0 sin loop y versiones unitarias;
- carrera `shared_once`: exactamente un `updated` y un `noop`;
- un único actor ganador coincidente en Task/fulfillment;
- Task `+1`, fulfillment `+1`;
- un único audit `task.completed`;
- cero fulfillments duplicados.

## 7. Restore Goal/Milestone

Sin cambios R2. Se preservó y volvió a probar:

- expectedVersion obligatorio;
- If-Match desde frontend;
- stale conflict;
- actor derivado y spoofing rechazado;
- privacidad/capability;
- incremento único de versión;
- Goal y Milestone restore funcionales.

## 8. Gates ejecutados

| Gate | Resultado exacto |
|---|---|
| Reset Supabase completo sobre migración final | PASS |
| 12 escenarios inválidos de backfill | PASS; causa específica y cleanup por escenario |
| Backfill legacy válido | PASS; reporte sin blockers y cleanup |
| DB suite real final | PASS, 111 assertions + cleanup |
| Camino de error automatizado | PASS; hijo non-zero, causa preservada, reset final y cero residuos |
| Runner normal final | PASS, `M11.1A SELF-CONTAINED DATABASE RUNNER: PASS`, 627,5 s |
| Segunda DB suite desde estado limpio | PASS; incluida en runner y repetida manualmente |
| Contract suite final | PASS, 61 assertions |
| Frontend TypeScript `--noEmit` | PASS, 0 errores |
| Backend/test syntax | PASS, 98 archivos JavaScript |
| Planner M8 | PASS, 115/115 |
| Planner M9 | PASS, 50/50 |
| `supabase migration list --local` | PASS, 34/34; `20260722010000` Local/Remote local alineada |
| `supabase db lint --local --level error` | PASS, 0 errores |
| `git diff --check` | PASS |

La advertencia intencional de la contract suite sobre una persistencia fake de
idempotency es parte del escenario negativo y no representa un fallo del gate.

## 9. Limpieza final

La aserción final devolvió:

```json
{
  "tasks": 0,
  "configs": 0,
  "assignees": 0,
  "fulfillments": 0,
  "households": 0,
  "people": 0,
  "users": 0,
  "audits": 0,
  "outbox": 0,
  "target_migration": true
}
```

## 10. Archivos R2 modificados

- `supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql`.
- `backend/src/controllers/planner.tasks.controller.js`.
- `backend/src/services/planner.tasks.service.js`.
- `scripts/planner_m11_1a_database_tests.js`.
- `scripts/planner_m11_1a_contract_tests.js`.
- `scripts/planner_m11_1a_test_runner.js`.
- `docs/implementation/planner/M11_1A_R2_CORRECTION_REPORT.md` — nuevo.

No se modificó `plannerCapabilities.js`. Tampoco se modificaron en R2 los
archivos de restore Goal/Milestone, frontend visible, formularios, listas,
Home, Calendar, Events, Plans, package files, lockfiles ni autoridades
congeladas.

## 11. Riesgos restantes

- M11.1A requiere una auditoría read-only independiente; este informe no es
  aprobación.
- El cambio explícito de assignment con historia continúa fuera de alcance y
  se rechaza atómicamente hasta M11.1B.
- Tasks personales permanecen explícitamente no soportadas.
- `legacy_unassigned` requiere resolución explícita antes de retirar V0.
- El fallback SQL replica el subset backend de capabilities; los tests de
  paridad reducen el riesgo, pero Household todavía no publica una única
  autoridad normalizada consumida por ambas capas.
- Trash bloquea operaciones públicas por la Task; el fulfillment aislado
  conserva su estado canónico, riesgo de consumo que requiere joins correctos.
- El runner exhaustivo es seguro pero costoso: la última corrida normal tardó
  627,5 s por sus reconstrucciones completas.
- Drift y datos del entorno compartido no fueron inspeccionados ni modificados.

## 12. Estado remoto y readiness

- Supabase local: reconstruido desde cero con la migración final y sin
  fixtures.
- Supabase remoto: no desplegado ni mutado.
- Git: sin commit ni push; HEAD continúa en `c2a544b`.
- Readiness: listo para una nueva auditoría técnica read-only independiente.
- No está autorizado comenzar M11.1B ni declarar M11.1A aprobado.

## 13. Git status final

```text
 M backend/src/controllers/planner.tasks.controller.js
 M backend/src/services/planner.goals.service.js
 M backend/src/services/planner.tasks.service.js
 M front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx
 M front/mi-front-limpio/services/plannerGoals.ts
?? docs/implementation/planner/M11_1A_CODE_AUDIT.md
?? docs/implementation/planner/M11_1A_CORRECTION_REPORT.md
?? docs/implementation/planner/M11_1A_R1_CODE_AUDIT.md
?? docs/implementation/planner/M11_1A_R2_CORRECTION_REPORT.md
?? docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md
?? scripts/planner_m11_1a_contract_tests.js
?? scripts/planner_m11_1a_database_tests.js
?? scripts/planner_m11_1a_test_runner.js
?? supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql
```

M11_1A_R2_CORRECTION_COMPLETE
