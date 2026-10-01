# M11.1A-R1 — Correction Report

Fecha local: 2026-07-22.

Resultado de la corrección: `M11_1A_CORRECTION_COMPLETE`.
Estado de aprobación: **no aprobado**; queda listo solamente para una nueva auditoría técnica read-only independiente.

## 1. Estado Git inicial y seguridad

- Root: `C:/Users/thega/Desktop/HomePlus`.
- Branch: `v1`.
- HEAD inicial y final: `c2a544b docs(planner): freeze Planner V1 functional specification`.
- La implementación M11.1A y los cambios de restore seguían sin commit, tal como requería la tarea.
- Existían `M11_1A_CODE_AUDIT.md` y `M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md` como archivos no trackeados.
- No había merge, rebase, cherry-pick ni conflictos en curso.
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
?? docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md
?? scripts/planner_m11_1a_contract_tests.js
?? scripts/planner_m11_1a_database_tests.js
?? supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql
```

## 2. B1 — Integridad relacional, RLS y personal Tasks

### Causa

La primera implementación validaba parte del household por helpers, pero no cerraba todas las relaciones con constraints compuestos. RLS de `planner_tasks` seguía siendo demasiado amplia para SELECT/UPDATE y el backend aceptaba `visibility=personal` aunque el modelo persistido era household.

### Corrección

Se agregaron claves únicas auxiliares y FKs compuestas para que PostgreSQL garantice la coherencia de household y de actor:

- `household_members (id, household_id)`.
- `household_members (id, person_id, household_id)`.
- `planner_tasks (id, household_id)`.
- Task/assignee-household.
- Task/creator-member-person-household.
- Task/completion-member-person-household.
- Task/verification-member-person-household.
- Task/cancellation-member-household.
- Task/trash-member-household.
- config/Task-household.
- canonical assignee/Task-household y member-household.
- fulfillment/Task-household.
- fulfillment/responsible-member-household.
- fulfillment/completion-member-person-household.
- fulfillment/verification-member-person-household.
- fulfillment/correction-member-household.

Los CHECKs exigen pares actor member/person coherentes y combinaciones válidas de estado, actores y timestamps. El guard hace `household_id` inmutable.

Policies finales de `planner_tasks`:

- SELECT: membership activo + `planner.view`.
- INSERT: membership activo + `task.create_household`; creator derivado del actor; estado inicial limpio; assignee, si existe, activo y del household.
- UPDATE: membership activo + `planner.view`; RLS habilita solamente candidatos own/any/restore y el trigger aplica la capability exacta por operación y ownership.

Tablas canónicas:

- `authenticated` conserva únicamente SELECT.
- SELECT requiere membership activo + `planner.view`.
- INSERT/UPDATE/DELETE directos continúan revocados para `public`, `anon` y `authenticated`.
- Mutaciones canónicas se realizan por RPCs `SECURITY DEFINER` acotadas o helpers internos sin grants públicos.

`visibility=personal` se rechaza en controller y service con HTTP 400 y código estable `personal_tasks_not_supported`, antes de acceder a persistencia.

## 3. B2 — Cambio de assignment con historia

### Causa

El sincronizador V0 alteraba config/assignees antes de decidir si el fulfillment previo ya tenía historia, con riesgo de transición parcial o semántica ambigua.

### Corrección

El trigger ahora bloquea y examina Task, config y fulfillment actual antes de mutar assignment:

- Sin historia operativa: revoca assignees previos, actualiza config, retira la obligación pendiente y crea la obligación nueva dentro de la misma transacción.
- Con completion, verification, correction, actores o timestamps: aborta toda la sentencia con SQLSTATE `P0001` y código estable `assignment_history_requires_explicit_transition`.
- El service traduce ese error a HTTP 409 con el mismo código estable.

La suite compara snapshots completos antes/después del rechazo y confirma que Task, config, assignees y fulfillments quedan idénticos.

## 4. B3 — Una sola modalidad actual

### Causa

Dos índices parciales separados impedían algunos duplicados por scope, pero permitían persistir simultáneamente un shared y uno o más individual, o cantidades incompatibles con la config.

### Corrección

Se implementó `planner_assert_task_fulfillment_invariants` y cuatro constraint triggers `DEFERRABLE INITIALLY DEFERRED` sobre Task, config, assignees y fulfillments. En el estado final de cada transacción exigen:

- `anyone + shared_once`: exactamente un shared actual y cero individual.
- `legacy_unassigned + shared_once`: exactamente un shared actual y cero individual.
- `members + shared_once`: exactamente un shared actual y cero individual.
- `members + each_person`: cero shared y exactamente un individual actual por assignee activo.
- Task cancelada: todas las obligaciones actuales inactivas.
- Task no cancelada: todas las obligaciones actuales activas.

El backfill y la creación V0 usan shared para todo `shared_once`; `responsible_member_id` solo se usa en `each_person`.

## 5. B4 — Guard y proyección V0

### Causa

El guard anterior protegía principalmente transiciones hacia estados terminales, pero dejaba huecos de retorno directo a pending y mutaciones directas de actores/timestamps. El bootstrap además incrementaba innecesariamente un fulfillment nuevo a versión 2.

### Corrección

El guard protege bidireccionalmente status y todos los campos derivados de fulfillment. Bloquea, entre otras, estas escrituras externas:

- `completed -> pending`.
- `awaiting_verification -> pending`.
- `verified -> pending`.
- edición directa de completion/verification actors y timestamps.
- edición directa de `version`.

Cancel/reactivate y trash/restore siguen siendo transiciones lifecycle explícitas con capability y metadata exactas. El helper de proyección usa un flag SQL local, acotado, restaurado también en excepción. Una RPC canónica actualiza fulfillment y luego proyecta Task; el incremento de versión ocurre una sola vez por tabla. Se eliminó el UPDATE bootstrap redundante, por lo que un fulfillment nuevo empieza en versión 1.

## 6. B5 — Completion concurrente shared_once

### Causa

La primera versión resolvía el expected version antes de releer el fulfillment bajo lock, por lo que el segundo intento equivalente podía recibir un `version_conflict` visible.

### Corrección

La RPC bloquea Task y fulfillment, relee el estado canónico y decide después:

1. El primer actor pendiente realiza la única mutación.
2. Si el segundo pedido `shared_once` encuentra la obligación ya completed/awaiting/verified, devuelve `outcome=noop` y la Task canónica actual.
3. No cambia el actor ganador, no incrementa otra versión y no escribe otro audit.
4. Los conflictos no equivalentes conservan `version_conflict`.

Prueba real concurrente: un `updated`, un `noop`, un fulfillment actual, un actor ganador coincidente en Task/fulfillment, Task `+1`, fulfillment `+1` y exactamente un audit `task.completed`.

## 7. B6 — Preflight y backfill

### Causa

El preflight anterior no cubría todos los cruces household, inconsistencias member/person ni combinaciones estado/actor/timestamp. El reporte no separaba suficientemente filas bloqueantes.

### Corrección

Antes de crear constraints o copiar datos, la migración aborta ante:

- creator ausente o incoherente.
- assignee/completion/verification/cancellation member de otro household.
- creator/completion/verification member-person inconsistente.
- pending con actores o timestamps terminales.
- completed/awaiting/verified sin completion person/timestamp.
- completed/awaiting con verification metadata.
- verified sin verification person/timestamp.
- cancelled cuyo estado previo y metadata operativa son incoherentes.

`planner_m11_1a_backfill_report()` separa total Tasks, configs, assignees, fulfillments, legacy_unassigned, actores no mapeados, actores cross-household, member/person inconsistentes, estados/timestamps inconsistentes, household derivado inconsistente, filas bloqueantes y canceladas inactivas.

El escenario válido cubre pending asignada, pending NULL histórico, completed, awaiting_verification, verified y cancelled. El NULL histórico se conserva como `legacy_unassigned`; nunca se convierte automáticamente en anyone.

El runner demuestra en bases reconstruidas hasta la migración anterior que M11.1A bloquea por separado:

- completion actor cross-household.
- completion member/person mismatch.
- estado/timestamp incoherente.

## 8. B7 — Suite autocontenida

### Causa

La suite previa dependía de un seed manual, dejaba fixtures/audits, aceptaba `version_conflict` en la carrera equivalente y usaba checks estáticos como evidencia principal.

### Corrección

`planner_m11_1a_test_runner.js` orquesta:

1. Tres resets hasta `20260715010000`, cada uno con un fixture inválido y una migración que debe fallar por el blocker exacto.
2. Reset pre-M11.1A, seed legacy válido, `migration up`, aserciones de backfill y cleanup.
3. Reconstrucción completa limpia.
4. Suite DB real, con fixtures propios y cleanup verificado.
5. Segunda reconstrucción completa limpia.
6. Segunda suite DB real.
7. Reset completo final.

La suite DB usa PostgreSQL real con roles/JWT claims, RLS, constraints, triggers y RPCs. Crea sus cuentas/households/tasks; en `finally` elimina outbox/audits sintéticos de forma local controlada, elimina datos dependientes y confirma cero household, Task, audit, person y auth user del fixture. Toda falla produce exit code distinto de cero.

## 9. Paridad backend / RLS / RPC

| Operación | Backend | RLS / guard | RPC |
|---|---|---|---|
| View | `planner.view` | `planner.view` + membership activo | SELECT canónico igual |
| Create household | `task.create_household` | misma capability, creator derivado, assignee válido | no RPC nueva |
| Create personal | rechazo `personal_tasks_not_supported` | no modelo personal | no RPC |
| Edit | `task.edit_own` / `task.edit_any` por creator | misma decisión exacta en guard | no RPC nueva |
| Cancel/reactivate | `task.cancel_own` / `task.cancel_any` | misma decisión y transición lifecycle exacta | compatibilidad V0 transaccional |
| Trash/restore | `task.restore` | misma capability y actor derivado | sin alterar fulfillment |
| Complete anyone/assigned | `task.complete_assigned` | tablas canónicas no escribibles | RPC exige la misma capability |
| Complete legacy NULL | `task.complete_unassigned` o `task.complete_any` | tablas canónicas no escribibles | misma alternativa |
| Complete member no asignado | `task.complete_any` | tablas canónicas no escribibles | misma capability |
| Verify | `task.verify` | tablas canónicas no escribibles | misma capability y no self-verify |

Fallback SQL y `DEFAULT_CAPABILITY_MATRIX` coinciden para las once capabilities usadas y los seis roles. `households.config.permissions[capability][role]`, cuando contiene boolean, sigue siendo la autoridad de override en ambas capas. El fallback SQL no concede más que backend.

## 10. Gates ejecutados

| Gate | Resultado |
|---|---|
| `node scripts/planner_m11_1a_test_runner.js` | PASS; 3 blockers, backfill válido, DB suite dos veces, reset final |
| DB suite | PASS, 82 aserciones por corrida + cleanup verificado |
| Contract suite | PASS, 40 aserciones |
| Frontend `tsc --noEmit` | PASS, 0 errores |
| Backend `node --check` | PASS, 14 archivos Planner/backend |
| Planner M8 | PASS, 115/115 |
| Planner M9 | PASS, 50/50 |
| `supabase migration list --local` | PASS; `20260722010000` alineada en la base local |
| `supabase db lint --local` | PASS, 0 errores; 2 warnings preexistentes ajenos a M11.1A |
| `git diff --check` | PASS |

Warnings DB lint preexistentes:

- `soft_delete_goal_milestone_rpc`: variable `v_result` no usada.
- `approve_household_member`: variable `v_active_coordinators_count` nunca leída.

## 11. Archivos de la corrección

- `supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql`.
- `backend/src/services/planner.tasks.service.js`.
- `backend/src/controllers/planner.tasks.controller.js`.
- `scripts/planner_m11_1a_database_tests.js`.
- `scripts/planner_m11_1a_contract_tests.js`.
- `scripts/planner_m11_1a_test_runner.js`.
- `docs/implementation/planner/M11_1A_CORRECTION_REPORT.md`.

Se preservaron sin reescritura durante R1 los cambios M11.1A previos de restore en:

- `backend/src/services/planner.goals.service.js`.
- `front/mi-front-limpio/services/plannerGoals.ts`.
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx`.

No fue necesario modificar `plannerCapabilities.js`: su matriz ya coincidía con la autoridad funcional; se amplió el fallback SQL y se alinearon controller, service, policies y RPCs.

## 12. Riesgos restantes y alcance

- M11.1A aún requiere una nueva auditoría read-only independiente; este informe no constituye aprobación.
- El cambio explícito de assignment con historia queda para M11.1B; hasta entonces se rechaza de forma atómica y estable.
- Tasks personales permanecen explícitamente no soportadas en este submilestone.
- Los campos V0 continúan como proyección de compatibilidad; la autoridad operativa es fulfillment.
- Los dos warnings de DB lint son anteriores y están fuera del alcance autorizado.
- No se implementó UI multi-assignee, evidencia, recurrence, Plans, Presets, notificaciones ni widgets.

## 13. Estado local, remoto y readiness

- Supabase local: reconstruido desde cero con todas las migraciones, sin fixtures M11.1A residuales.
- Migraciones locales: alineadas; target final `20260722010000` aplicado.
- Supabase remoto: no se ejecutó ningún comando de deploy ni mutación remota; estado remoto no modificado por esta corrección.
- Git: sin commit ni push; HEAD sigue en `c2a544b`.
- Readiness: listo para una nueva auditoría técnica read-only independiente, no para declarar aprobación.

Estado Git final esperado de la entrega:

```text
 M backend/src/controllers/planner.tasks.controller.js
 M backend/src/services/planner.goals.service.js
 M backend/src/services/planner.tasks.service.js
 M front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx
 M front/mi-front-limpio/services/plannerGoals.ts
?? docs/implementation/planner/M11_1A_CODE_AUDIT.md
?? docs/implementation/planner/M11_1A_CORRECTION_REPORT.md
?? docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md
?? scripts/planner_m11_1a_contract_tests.js
?? scripts/planner_m11_1a_database_tests.js
?? scripts/planner_m11_1a_test_runner.js
?? supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql
```

`M11_1A_CORRECTION_COMPLETE`
