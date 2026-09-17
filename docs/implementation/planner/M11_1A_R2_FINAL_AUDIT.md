# M11.1A-R2 — Final Defensive Read-Only Audit

**Fecha local:** 2026-07-22  
**Alcance:** repositorio local y Supabase local  
**Tipo:** auditoría defensiva read-only; sin correcciones de implementación  
**Veredicto:** **PASS**

## 1. Resumen ejecutivo

La revisión independiente confirma que R2 cerró los cuatro gaps identificados
por la reauditoría R1:

- R1-01 — una Task nueva sólo puede comenzar con lifecycle limpio;
- R1-02 — el runner intenta el reset final tanto en éxito como en error y
  conserva la causa primaria;
- R1-03 — preflight, reporte, fixtures y aserciones DB cubren separadamente las
  categorías declaradas;
- R1-04 — completion y verification exigen conjuntamente `planner.view` y la
  capability operativa en backend y RPC.

La regresión real de B2–B5, restore Goal/Milestone y la compatibilidad Planner
V0 también pasó. No se encontró ningún defecto bloqueante dentro del alcance
M11.1A-R2.

El resultado no afirma nada sobre el esquema ni los datos remotos: no se
inspeccionaron ni modificaron por límite expreso de la tarea.

### Clasificación

| Bloque | Resultado |
|---|---|
| R1-01 — INSERT inicial limpio | **PASS** |
| R1-02 — reset garantizado | **PASS** |
| R1-03 — preflight y reporte | **PASS** |
| R1-04 — paridad view + operación | **PASS** |
| B2 — assignment edit e historia | **PASS** |
| B3 — modalidad current | **PASS** |
| B4 — guard/proyección | **PASS** |
| B5 — concurrencia shared_once | **PASS** |
| Restore Goal/Milestone | **PASS** |
| Compatibilidad Planner V0 | **PASS_WITH_RISK** |
| Gates y limpieza local | **PASS** |
| Estado remoto | **UNKNOWN** |

## 2. Seguridad y baseline

Baseline inicial y final:

```text
root: C:/Users/thega/Desktop/HomePlus
branch: v1
HEAD: c2a544b docs(planner): freeze Planner V1 functional specification
merge/rebase/cherry-pick/conflictos: ninguno
```

Los cambios M11.1A/R1/R2 permanecían sin commit. No apareció ningún cambio
ajeno al conjunto ya documentado. No se usó stash, reset, restore ni checkout
destructivo. No se instaló ninguna dependencia. No hubo commit, push ni deploy.

Se leyeron completamente las cinco autoridades indicadas. El informe de
corrección R2 se trató como una lista de afirmaciones a contrastar, no como
evidencia suficiente.

## 3. R1-01 — INSERT inicial limpio

**Resultado: PASS.**

La policy efectiva `planner_tasks_insert_capability`, leída desde
`pg_policy`, exige:

```text
status = pending
completed_by_member_id = NULL
completed_by_person_id = NULL
completed_at = NULL
verified_by_member_id = NULL
verified_by_person_id = NULL
verified_at = NULL
cancelled_at = NULL
cancelled_by_member_id = NULL
cancelled_reason = NULL
cancelled_from_status = NULL
trashed_at = NULL
trashed_by_member_id = NULL
```

También exige membership activa, `task.create_household`, creator
member/person derivados y assignee nulo o activo en el mismo household.

El catálogo confirmó
`planner_tasks_cancellation_lifecycle_shape_check` con
`convalidated = true`. El CHECK obliga a que una Task cancelada tenga
`cancelled_at` y un `cancelled_from_status` permitido, y a que una Task no
cancelada no conserve metadata de cancelación.

La suite DB real rechazó individualmente:

- `cancelled_at`;
- `cancelled_by_member_id` propio;
- `cancelled_by_member_id` de otro miembro del mismo household;
- `cancelled_reason`;
- `cancelled_from_status`;
- `trashed_at`;
- `trashed_by_member_id` propio;
- `trashed_by_member_id` de otro miembro del mismo household;
- varios campos lifecycle juntos.

Cada rechazo comparó snapshots y dejó sin efecto adicional Task, config,
assignee, fulfillment y audit. El control positivo creó una Task `pending`
limpia, hizo bootstrap de config/fulfillment y dejó el fulfillment en versión
1.

En aplicación, controller y service ejecutan `assertTaskCreateBody()`. Los
payloads protegidos se rechazan antes de persistir con HTTP 400 y código
estable:

```text
protected_task_lifecycle_field
```

## 4. R1-02 — reset garantizado

**Resultado: PASS.**

`executeWithGuaranteedReset()` captura por separado `primaryError` y
`resetError`; el reset `final clean reconstruction (always)` está dentro de
`finally`. Si fallan prueba y reset, ambos errores se incluyen y la causa
primaria no se convierte en PASS.

Ejecución requerida:

```text
node scripts/planner_m11_1a_test_runner.js --verify-failure-path
exit: 0
duración: 80,7 s
resultado: M11.1A RUNNER FAILURE PATH: PASS
```

El hijo salió distinto de cero por la causa determinista exacta:

```text
M11.1A deterministic test failure after invalid-fixture-seeded
```

La salida conservó `PRIMARY FAILURE`, mostró el intento de reset final y el
padre verificó luego base limpia, migración `20260722010000` aplicada y lista
de migraciones alineada.

Ejecución normal única requerida:

```text
node scripts/planner_m11_1a_test_runner.js
exit: 0
duración: 665,8 s
líneas de salida: 5526
resultado: M11.1A SELF-CONTAINED DATABASE RUNNER: PASS
```

## 5. R1-03 — preflight y reporte

**Resultado: PASS.**

La comparación directa entre migración, runner y suite DB confirmó cobertura
separada para:

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

El runner crea un fixture independiente por categoría, exige el substring
específico del error de preflight y reconstruye la base antes de continuar. No
acepta cualquier error genérico como evidencia.

`planner_m11_1a_backfill_report()` expone cada categoría anterior, además de:

- breakdown de actores no mapeables;
- `derived_household_inconsistent`;
- `count_inconsistent`;
- `blocking_rows`;
- `legacy_unassigned`;
- `cancelled_inactive`.

`blocking_rows` se calcula sobre una fila categorizada por Task y cuenta la
unión booleana de categorías; una Task con más de una violación se cuenta una
sola vez. Las inconsistencias derivadas y de conteo se ejercitan con intentos
transaccionales reales en la suite DB.

El mapeo de backfill mantiene:

```text
assigned_to_member_id histórico NULL
→ legacy_unassigned
```

No existe conversión automática a `anyone`.

Reporte final leído desde la función instalada:

```text
tasks_total=0
assignment_configs=0
assignees_active=0
fulfillments_current=0
legacy_unassigned=0
unmappable_actors=0
actors_cross_household=0
member_person_mismatch=0
pending_terminal_metadata=0
completed_inconsistent=0
awaiting_verification_inconsistent=0
verified_inconsistent=0
cancelled_inconsistent=0
derived_household_inconsistent=0
count_inconsistent=0
blocking_rows=0
```

## 6. R1-04 — paridad `planner.view` + operación

**Resultado: PASS.**

La cadena inspeccionada aplica la misma conjunción:

```text
completion
→ planner.view
+ task.complete_assigned / task.complete_unassigned / task.complete_any

verification
→ planner.view
+ task.verify
```

- controller exige explícitamente `planner.view` antes de complete y verify;
- service vuelve a resolver los overrides Household y valida view + operación;
- el helper SQL lee la misma configuración/fallback;
- las RPC complete y verify rechazan si falta `planner.view` antes de mutar.

Backend y RPC reales pasaron las seis combinaciones requeridas:

| Operación | `planner.view` | capability operativa | Resultado |
|---|---:|---:|---|
| complete | false | true | rechazo backend + RPC |
| complete | true | false | rechazo backend + RPC |
| complete | true | true | permitido backend + RPC |
| verify | false | true | rechazo backend + RPC |
| verify | true | false | rechazo backend + RPC |
| verify | true | true | permitido backend + RPC |

Los rechazos RPC usaron SQLSTATE `42501`. No se observó divergencia entre
controller, service, helper SQL y RPC en estas decisiones.

## 7. Regresión B2–B5

### B2 — PASS

- Sin historia: el fulfillment anterior se retira y se crea el correspondiente
  a la asignación nueva.
- Con historia: la mutación se rechaza con
  `assignment_history_requires_explicit_transition`.
- El snapshot atómico deja Task, config, assignees, fulfillments y audit sin
  cambios en el rechazo.

### B3 — PASS

El catálogo instalado contiene cuatro constraint triggers `DEFERRABLE
INITIALLY DEFERRED`, sobre Task, config, assignees y fulfillments. La suite
rechaza modalidades current mixtas y valida:

- anyone + shared;
- members + shared_once;
- members + each_person;
- Task cancelada con obligaciones inactivas;
- Task activa con obligaciones activas.

`authenticated` conserva únicamente `SELECT` sobre las tres tablas canónicas;
no tiene grants directos de INSERT/UPDATE/DELETE.

### B4 — PASS

El guard bidireccional rechaza mutaciones directas de la proyección V0,
incluidas terminal → pending, actores, timestamps y version. Las RPC canónicas
proyectan mediante el flag SQL interno acotado y cada versión aumenta una sola
vez.

### B5 — PASS

La carrera real `shared_once` produjo:

```text
1 updated
1 noop
1 actor ganador
1 fulfillment current
1 audit task.completed
0 version_conflict visible
Task version +1
fulfillment version +1
```

## 8. Restore Goal/Milestone

**Resultado: PASS.**

La traza preservada es:

```text
item.version
→ expectedVersion obligatorio
→ If-Match
→ controller parsea versión requerida
→ service no envía actor como autoridad
→ RPC deriva auth/person/member
→ lock + comparación de versión
→ UPDATE único
```

Goal y Milestone restore mantienen actor derivado, spoofing rechazado, stale
rechazado e incremento único de versión. Already-restored con la versión actual
no agrega otro incremento.

## 9. Compatibilidad Planner V0

**Resultado: PASS_WITH_RISK.**

Los flujos create, edit, complete, verify, cancel, reactivate, trash y restore
pasaron en la suite DB. Summary, Calendar, listados y DTO V0 conservan su
contrato; M8 y M9 pasaron completos. No se eliminó
`assigned_to_member_id` ni se agregó un efecto de notificación.

El riesgo aceptado es temporal: una Task nueva V0 con assignee NULL se modela
canónicamente como `anyone`, mientras una fila histórica NULL permanece
`legacy_unassigned`; ambos estados todavía comparten la proyección V0 NULL. La
resolución visual/migratoria definitiva pertenece a un submilestone posterior
y no invalida este foundation compatible.

## 10. Gates exactos

| Gate | Resultado |
|---|---|
| Failure path del runner | **PASS**, exit 0 del verificador; hijo non-zero; 80,7 s |
| Runner normal | **PASS**, exit 0; 665,8 s; marcador final presente |
| Suite DB dentro del runner | **PASS**, 111 assertions por corrida, ejecutada dos veces |
| Contract suite | **PASS**, 61 assertions |
| Frontend TypeScript `--noEmit` | **PASS**, 0 errores |
| Backend/test syntax | **PASS**, 98 archivos JavaScript |
| Planner M8 | **PASS**, 115/115 |
| Planner M9 | **PASS**, 50/50 |
| `supabase migration list --local` | **PASS**, 34/34 alineadas |
| `supabase db lint --local --level error` | **PASS**, 0 errores |
| `git diff --check` | **PASS**, sólo avisos de normalización LF/CRLF |

La advertencia de la contract suite sobre la falla simulada de persistencia de
idempotency pertenece a su escenario negativo y el proceso terminó exit 0.

## 11. Limpieza final local

La aserción independiente posterior a todos los gates devolvió:

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

## 12. Defectos bloqueantes

**Ninguno encontrado dentro del alcance auditado.**

## 13. Riesgos no bloqueantes

1. El esquema y los datos remotos no fueron inspeccionados; drift y calidad del
   backfill remoto siguen `UNKNOWN` hasta un gate de despliegue separado.
2. El fallback SQL replica el subset backend de capabilities. Los tests de
   paridad pasan, pero una autoridad Household normalizada única reduciría el
   riesgo futuro de divergencia.
3. `legacy_unassigned` requiere resolución explícita antes de retirar la
   compatibilidad V0; no debe convertirse automáticamente en `anyone`.
4. El cambio de assignment con historia se rechaza de forma segura hasta que
   exista la transición explícita de M11.1B.
5. Trash bloquea las operaciones públicas mediante la Task; un consumidor
   canónico aislado debe mantener el join/precedencia de lifecycle para no
   interpretar el fulfillment preservado como operativo.
6. Tasks personales continúan fuera del soporte de este slice y se rechazan
   explícitamente.
7. El runner es exhaustivo pero lento: esta corrida normal tardó 665,8 s.

## 14. Readiness

### Readiness para commit: SÍ

M11.1A-R2 está técnicamente listo para commit: no quedan bloqueantes locales,
todos los gates exigidos pasan y la base quedó limpia. Esta auditoría no hace
ni autoriza por sí misma el commit.

### Readiness para M11.1B: SÍ, después del commit/aprobación de M11.1A

La foundation local está lista para que el siguiente submilestone autorizado
construya transiciones explícitas de fulfillment/assignment. Esta auditoría no
inició M11.1B.

### Estado remoto: UNKNOWN / no modificado

No hubo acceso, inspección, deploy ni mutación de Supabase remoto.

## 15. Git status final

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
?? docs/implementation/planner/M11_1A_R2_FINAL_AUDIT.md
?? docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md
?? scripts/planner_m11_1a_contract_tests.js
?? scripts/planner_m11_1a_database_tests.js
?? scripts/planner_m11_1a_test_runner.js
?? supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql
```

Branch y HEAD permanecen en `v1` / `c2a544b`. No hay operación Git activa ni
conflictos.

M11_1A_R2_FINAL_AUDIT_PASS
