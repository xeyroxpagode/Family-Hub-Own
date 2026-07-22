# M11.1A-R1 — Defensive Local Code Review

**Fecha:** 2026-07-22  
**Alcance:** repositorio local y Supabase local  
**Tipo:** auditoría defensiva; implementación read-only  
**Veredicto:** **FAIL**

## 1. Resumen ejecutivo

La corrección R1 resuelve de forma convincente B2, B3, B4 y B5. La migración
instalada presenta constraints compuestos validados, triggers diferidos para la
forma canónica, tablas canónicas sin grants de escritura para `authenticated`,
guard bidireccional de la proyección V0 y una carrera real `shared_once` que
termina con un único efecto.

El runner autocontenido también completó su camino feliz y terminó con reset
limpio. Sin embargo, la reauditoría no puede aprobar R1 porque persisten dos
defectos dentro de los bloqueantes originales:

1. **B1 FAIL:** la policy efectiva de INSERT de `planner_tasks` no exige una
   Task inicialmente limpia en metadata de cancelación y papelera. Permite
   proporcionar `cancelled_*` y `trashed_*` durante un INSERT autenticado aunque
   `status = 'pending'`; `trashed_by_member_id` sólo queda limitado al household,
   no derivado del actor. Esto contradice la afirmación de estado inicial limpio
   y deja una vía de escritura lifecycle fuera de las operaciones autorizadas.
2. **B7 FAIL:** el reset final sólo está en el camino exitoso de `main()`. El
   `catch` exterior asigna exit code 1, pero no ejecuta cleanup/reset. Por lo
   tanto, la suite no ofrece el cleanup garantizado requerido si un paso falla.

B6 queda en `PASS_WITH_RISK`: el preflight sí contiene los blockers declarados,
pero el reporte estable y la sensibilidad del runner no cubren de manera
separada todas las categorías que el correction report afirma cubrir.

## 2. Límites respetados

- No se modificaron migraciones, backend, frontend ni tests.
- No se crearon simulaciones adicionales.
- No se provocaron fallos de infraestructura ni se alteró el runner.
- No se accedió a sistemas remotos, credenciales ni destinos de red.
- No hubo deploy, commit ni push.
- La única escritura de esta auditoría es este documento.

## 3. Autoridades y artefactos revisados

Se leyeron como autoridades principales:

- `docs/implementation/planner/PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`;
- `docs/implementation/planner/M11_1A_CODE_AUDIT.md`;
- `docs/implementation/planner/M11_1A_CORRECTION_REPORT.md`.

También se contrastaron la migración R1, las migraciones Planner V0 relevantes,
los services/controllers de Task y restore de Goal/Milestone, el frontend de
Trash, y los tres scripts M11.1A existentes.

## 4. Baseline local

- Repositorio: `C:\Users\thega\Desktop\HomePlus`.
- Branch: `v1`.
- HEAD inicial: `c2a544b docs(planner): freeze Planner V1 functional specification`.
- El worktree ya contenía exactamente los cambios y archivos R1 esperados; no
  había merge, rebase, cherry-pick ni conflictos activos.
- La auditoría preservó todos esos cambios preexistentes.

## 5. Etapa A — Revisión estática y catálogo real

### 5.1 Integridad relacional

**Resultado: PASS_WITH_RISK.**

El catálogo PostgreSQL confirmó como existentes y `convalidated = true`:

- uniques compuestos de `household_members` y `planner_tasks`;
- FKs compuestas Task/member/person/household para creator, assignee,
  completion, verification, cancellation y trash;
- FKs compuestas de config, assignees y fulfillments hacia Task/household;
- FKs de actores y responsible member hacia el mismo household;
- CHECKs de modalidad, scope, estado, actores, timestamps y versión positiva.

También confirmó los constraint triggers `DEFERRABLE INITIALLY DEFERRED` sobre
Task, config, assignees y fulfillments. Estos impiden cerrar una transacción con
modalidad/cantidad current contradictoria.

El riesgo bloqueante está en el punto de entrada INSERT: la policy
`planner_tasks_insert_capability` valida membership, `task.create_household`,
creator, `status = 'pending'`, completion/verification vacíos y assignee activo,
pero no valida `cancelled_at`, `cancelled_by_member_id`, `cancelled_reason`,
`cancelled_from_status`, `trashed_at` ni `trashed_by_member_id`. Tampoco existe un
CHECK equivalente que cierre esas combinaciones iniciales.

### 5.2 RLS, grants y funciones

**Resultado: PASS_WITH_RISK.**

- SELECT de Task y tablas canónicas exige membership activo y `planner.view`.
- Las tablas canónicas conceden a `authenticated` únicamente SELECT.
- Los helpers internos inspeccionados son `SECURITY DEFINER`, fijan
  `search_path = pg_catalog, public` y no conceden EXECUTE a `authenticated`.
- Las RPC públicas de complete/verify y restore mantienen firmas acotadas y
  derivan el actor desde el contexto autenticado.
- UPDATE de Task requiere `planner.view` y una capability candidata; el guard
  decide la operación exacta y el ownership.

La excepción es nuevamente el INSERT lifecycle incompleto descrito arriba. Una
FK same-household no sustituye derivar el actor de trash/cancel ni exigir que
esa metadata sea nula al crear.

### 5.3 Paridad aplicación / RLS / RPC

**Resultado: PASS_WITH_RISK.**

La matriz fallback SQL coincide con `DEFAULT_CAPABILITY_MATRIX` para las once
capabilities utilizadas. Personal Task se rechaza en controller y service con
`personal_tasks_not_supported`. Complete/verify, edit, cancel/reactivate y
trash/restore usan la misma familia de capabilities y actor autenticado.

Riesgo adicional no bloqueante para este cierre: el controller de complete
lee primero Task/config/assignees bajo RLS, que requiere `planner.view`, mientras
la RPC de completion evalúa directamente las capabilities de completion. Un
override que niegue view y conceda completion puede producir una respuesta
distinta entre backend y RPC. La suite existente no contiene ese override.

### 5.4 Compatibilidad Planner V0

**Resultado: PASS_WITH_RISK.**

- `assigned_to_member_id` continúa como proyección compatible.
- Complete/verify actualizan primero fulfillment y proyectan Task con un flag
  SQL local restaurado incluso ante excepción.
- El guard protege en ambas direcciones status, actores, timestamps y version.
- Cancel/reactivate conserva e inactiva/reactiva la obligación canónica.
- Trash/restore preserva fulfillment y las operaciones públicas lo bloquean por
  la Task; no obstante, el fulfillment aislado sigue visible como activo a un
  lector canónico con `planner.view`, riesgo ya reconocido por la auditoría
  anterior.
- Goal/Milestone restore deriva actor y exige expected version; backend y
  frontend pasan la versión requerida.

## 6. Etapa B — Runner existente

Se ejecutó exactamente una vez:

```text
node scripts/planner_m11_1a_test_runner.js
```

Resultado observado:

```text
Exit code: 0
Duración: 295.3 s
M11.1A SELF-CONTAINED DATABASE RUNNER: PASS
```

El runner verificó sus tres fixtures legacy inválidos, backfill válido, dos
corridas de la suite DB real y reconstrucción final. Una consulta posterior al
catálogo confirmó:

```text
planner_tasks=0
planner_task_assignment_configs=0
planner_task_assignees=0
planner_task_fulfillments=0
```

Esto acredita el camino feliz y su cleanup final. No acredita cleanup ante
error: estáticamente, cualquier excepción anterior salta al `catch` exterior y
omite `resetCurrent('final clean reconstruction')`.

## 7. Reclasificación B1–B7

| Bloque | Resultado | Fundamento |
|---|---|---|
| B1 — Integridad y autorización de assignee | **FAIL** | Las relaciones same-household, ownership, personal Task y grants quedaron corregidos, pero INSERT no exige metadata lifecycle limpia ni deriva actores de trash/cancel. La afirmación de corrección completa es falsa. |
| B2 — Assignment edit con historia | **PASS** | El sincronizador inspecciona historia antes de mutar, rechaza con `assignment_history_requires_explicit_transition` y la suite compara snapshots atómicos antes/después. |
| B3 — Invariant único de modalidad actual | **PASS** | Constraint triggers diferidos y función de invariant exigen exactamente shared o exactly-one-per-assignee según config y lifecycle activo/cancelado. El catálogo confirmó su instalación. |
| B4 — Guard/proyección incompleto | **PASS** | El guard es bidireccional, protege campos derivados/version y sólo permite la proyección mediante flag interno acotado. La suite cubre retornos directos a pending. |
| B5 — Idempotencia concurrente | **PASS** | La suite real `shared_once` exige y obtuvo un `updated`, un `noop`, un solo actor, incrementos `+1` y un solo audit. |
| B6 — Backfill incompleto | **PASS_WITH_RISK** | El preflight implementa los blockers enumerados y los fixtures incluidos son rechazados. Sin embargo, `planner_m11_1a_backfill_report()` omite trash actor en `actors_cross_household`, no incluye inconsistencias cancelled en `state_timestamp_inconsistent` y `blocking_rows` no replica todas sus propias categorías. El runner sólo prueba tres variantes inválidas. |
| B7 — Gate de pruebas insuficiente | **FAIL** | El camino feliz es autocontenido y pasó, pero el cleanup no está en `finally`; una falla previa omite el reset final. Además, la suite no detecta el hueco de INSERT de B1 ni los riesgos de override/reporte señalados. |

## 8. Hallazgos accionables

### R1-01 — Bloqueante — Estado inicial lifecycle no cerrado

La policy INSERT debe exigir nulos todos los campos de cancelación y papelera,
además de los campos terminales ya protegidos. Los actores lifecycle no deben
aceptarse desde el payload de creación. Deben agregarse pruebas reales negativas
para esos campos y para spoofing de un miembro del mismo household.

### R1-02 — Bloqueante — Cleanup del runner no garantizado

El reset final debe ejecutarse desde un `finally` o mecanismo equivalente que
se intente tanto en éxito como en error, sin ocultar el error original. Debe
existir evidencia automatizada de que una falla intermedia deja Supabase local
en el estado completo esperado.

### R1-03 — Riesgo — Reporte de backfill no refleja todo el preflight

El reporte estable debe usar las mismas condiciones/categorías que el preflight
o declarar explícitamente que sólo informa inconsistencias sobrevivientes. La
suite debe cubrir cada clase bloqueante declarada, no sólo tres ejemplos.

### R1-04 — Riesgo — Dependencia implícita de `planner.view` en backend complete

Debe definirse una única semántica para overrides que separen view de complete y
probarse en backend y RPC. La lectura previa del backend y la autorización dentro
de la RPC no deberían producir decisiones distintas.

## 9. Readiness

- **Commit de R1:** NO.
- **Inicio de M11.1B:** NO.
- **Motivo:** B1 y B7 continúan en FAIL. El runner exitoso no compensa una vía
  INSERT lifecycle incompleta ni la ausencia de cleanup garantizado ante error.
- **Estado remoto/deploy:** no verificado y no modificado, por alcance.

M11_1A_R1_AUDIT_FAIL
