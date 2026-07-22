# M11.1A — Code Audit

## 1. Veredicto ejecutivo

**Veredicto: FAIL.**

La implementación contiene una base aditiva útil y varios controles correctos:

- no elimina ni renombra columnas legacy;
- separa assignment y fulfillment;
- deriva el actor autenticado en completion, verification y restore;
- mantiene complete/verify y la proyección V0 dentro de una misma transacción;
- no presenta loops de triggers;
- Goal/Milestone restore exige versión y rechaza actor spoofing;
- los helpers internos y el reporte de backfill no son ejecutables por
  `authenticated`.

No está lista para commit ni para ser la base de M11.1B. Hay defectos
bloqueantes verificables en el código:

1. RLS permite INSERT/UPDATE directo de `planner_tasks` sin validar el
   assignee contra el household y sin aplicar las capabilities/ownership del
   backend. Los triggers propagan ese dato a las tablas canónicas, cuyos FKs
   tampoco relacionan Task, household y member entre sí.
2. Un cambio V0 de assignee cuando existe historia cambia config y assignees,
   pero deja como actual el fulfillment de la asignación anterior.
3. Los índices permiten coexistencia de un fulfillment compartido actual y
   fulfillments individuales actuales para la misma Task.
4. El guard de proyección permite mutaciones directas como
   `completed/verified -> pending`; el fulfillment permanece completado o
   verificado y la proyección V0 queda desincronizada.
5. La completion concurrente evita duplicados, pero el segundo actor recibe
   `version_conflict`; no cumple el no-op silencioso congelado.
6. La suite DB no es autocontenida ni limpia sus fixtures y no detecta varios
   de los defectos anteriores.

El esquema compartido/remoto no fue inspeccionado. Su drift y sus datos son
**UNKNOWN**. El esquema local tiene 34 migraciones aplicadas y estaba vacío al
momento de esta auditoría.

### Clasificación por bloque obligatorio

| Bloque | Resultado | Motivo principal |
|---|---|---|
| Migración aditiva | **FAIL** | Es aditiva, pero el backfill no rechaza todas las inconsistencias y faltan constraints relacionales/modales. |
| Assignment | **FAIL** | Cross-household directo posible y cambio con historia deja config/fulfillment contradictorios. |
| Fulfillment | **FAIL** | Puede coexistir scope shared e individual actual; carrera no es silenciosamente idempotente. |
| Dual-write y triggers | **FAIL** | Sin loops, pero existen rutas de desincronización y assignment histórico inconsistente. |
| Seguridad SQL | **PASS_WITH_RISK** | Definers/grants correctos; queda fallback duplicado y grants de service role no utilizables sin actor JWT. |
| RLS | **FAIL** | `planner_tasks` sigue autorizado solo por membresía, no por capability/ownership ni por assignee válido. |
| Capabilities | **FAIL** | Backend, RLS y RPC toman decisiones distintas en varios flujos. |
| Compatibilidad V0 | **PASS_WITH_RISK** | DTOs siguen; NULL no autoasigna ni notifica, pero UI/capability semantics divergen. |
| Restore Goal/Milestone | **PASS** | If-Match, stale, privacidad, actor derivado y un incremento de versión verificados. |
| Pruebas | **FAIL** | Suite DB no autocontenida/limpia; suite contractual es mayormente búsqueda de strings y deja huecos críticos. |

## 2. Seguridad inicial y archivos revisados

Snapshot inicial:

- raíz: `C:/Users/thega/Desktop/HomePlus`;
- rama: `v1`;
- HEAD: `c2a544b docs(planner): freeze Planner V1 functional specification`;
- merge/rebase/cherry-pick/conflictos: ninguno;
- cambios iniciales: exactamente los nueve archivos M11.1A declarados.

Archivos M11.1A revisados:

- `supabase/migrations/20260722010000_m11_1a_task_fulfillment_foundation.sql`;
- `backend/src/services/planner.tasks.service.js`;
- `backend/src/controllers/planner.tasks.controller.js`;
- `backend/src/services/planner.goals.service.js`;
- `front/mi-front-limpio/services/plannerGoals.ts`;
- `front/mi-front-limpio/screens/planner/PlannerTrashScreen.tsx`;
- `scripts/planner_m11_1a_database_tests.js`;
- `scripts/planner_m11_1a_contract_tests.js`;
- `docs/implementation/planner/M11_1A_TASK_FULFILLMENT_FOUNDATION_REPORT.md`.

Autoridades y dependencias revisadas:

- `PLANNER_V1_M11_FUNCTIONAL_FREEZE.md`;
- `M11_PLANNER_V1_TECHNICAL_GAP_AUDIT.md`;
- migraciones base de Tasks, Goals/Milestones, versionado, trash, cancellation,
  idempotencia y completion audit;
- `plannerCapabilities.js`, context, mutation/idempotency helpers;
- controllers de Goals y rutas Planner;
- Summary, Calendar, listas, Task form y eligibility de Home.

El informe de implementación se usó como lista de afirmaciones a contrastar,
no como evidencia de conformidad.

## 3. Migración y backfill

### Resultado: FAIL

Aspectos correctos:

- la migración es aditiva;
- no contiene DROP/RENAME de columnas o tablas legacy;
- `assigned_to_member_id IS NULL` histórico se convierte en
  `legacy_unassigned`, no en `anyone`;
- el mapeo de estados no cancelados es explícito;
- cancelled conserva un estado previo conservador e `inactive_at`;
- se aborta ante assignee de otro household y ante estados completed/awaiting
  sin `completed_at` o verified sin `verified_at`;
- hay conteo final Task/config/current fulfillment;
- la PK de config garantiza una config por Task.

Defectos:

1. Las validaciones de backfill no comprueban que completion, verification o
   cancellation member actors pertenezcan al household de la Task ni que el
   person actor corresponda al member actor. Esas filas se copian.
2. Una Task `pending` puede contener completion/verification actors o
   timestamps y se migra sin error. Tampoco hay constraints de coherencia
   status↔actors↔timestamps en fulfillment.
3. Las tablas nuevas usan FKs independientes. No existe un constraint que
   garantice:
   - `config.household_id = task.household_id`;
   - `assignee.household_id = task.household_id`;
   - `assignee.member_id` perteneciente a ese household;
   - `fulfillment.household_id = task.household_id`;
   - responsible/completion/verification members pertenecientes al scope.
4. Dos índices parciales separados impiden duplicados shared/shared e
   individual/individual, pero no impiden un shared actual y uno o más
   individuales actuales para la misma Task.
5. La forma anyone/members/legacy y la presencia de assignees se valida solo al
   invocar `planner_create_current_task_fulfillments()`, no como invariant
   persistente del esquema.

Por lo anterior, quitar una ruta backend o ejecutar un import con service role
puede persistir estados que el modelo declara inválidos.

## 4. Assignment

### Resultado: FAIL

Se verificó:

- config actual única: **PASS**, por PK `task_id`;
- anyone sin assignees en el helper nominal: **PASS**;
- members con al menos un assignee en el helper nominal: **PASS**;
- each_person solo con `assignment_kind = members`: **PASS** por check;
- shared_once para anyone y grupos: **PASS** en el helper;
- legacy_unassigned solo generado por backfill/product API: **PASS_WITH_RISK**;
- filas revocadas preservadas: **PASS**;
- rechazo integral de assignee de otro household: **FAIL**.

El backend `validateAssignment()` sí exige member activo del household. La
policy INSERT de `planner_tasks` no valida `assigned_to_member_id`, y la policy
UPDATE sigue aceptando cualquier fila cuyo household tenga membresía activa.
Un cliente autenticado directo puede usar un member de otro household; el
trigger lo copiará a `planner_task_assignees` porque el esquema solo verifica
que ese member exista.

Además, en `planner_sync_task_foundation_from_v0()`:

```text
assignee cambia
→ config y assignees cambian siempre
→ si hay historia en fulfillment, el fulfillment no se retira ni reemplaza
```

El resultado puede ser config=`members` para B, assignee actual=B y
fulfillment actual individual responsable=A. Completion por B selecciona esa
obligación vieja en shared_once y puede devolver noop si A ya la completó.
Preservar historia no exige conservar la obligación vieja como obligación
actual.

## 5. Fulfillment

### Resultado: FAIL

Los caminos nominales crean:

- anyone: un shared;
- una persona: un individual;
- grupo shared_once: un shared;
- grupo each_person: un individual por member.

`retired_at` e `inactive_at` tienen intenciones distintas y útiles:

- `retired_at`: obligación reemplazada, ya no es la obligación actual;
- `inactive_at`: misma obligación actual, temporalmente no operativa por
  cancellation.

Las siguientes condiciones impiden aprobar el bloque:

- no hay exclusión global de modalidad shared vs individual actual;
- trash no marca fulfillment inactive; la no-operatividad depende de que todos
  los consumidores consulten también `planner_tasks.trashed_at`;
- assignment con historia deja fulfillment viejo como actual;
- verify selecciona el fulfillment awaiting más antiguo y no acepta un
  fulfillment ID, por lo que no puede dirigirse de forma inequívoca a una
  obligación each_person;
- una completion concurrente tiene un winner y un `version_conflict`, no un
  winner y un noop silencioso.

No se halló duplicación en el camino nominal probado, pero el invariant
estructural completo no está expresado en el esquema.

## 6. Flujo completo V0 → canónico → V0

| Flujo | Fuente al entrar | Trigger/RPC | Cambio canónico | Proyección `planner_tasks` | Versión |
|---|---|---|---|---|---|
| Create V0 | INSERT `planner_tasks` | `trg_planner_tasks_bootstrap_foundation` | config + assignee opcional + fulfillment | La fila insertada ya es V0 | Task nace 1; fulfillment nace 1 y el UPDATE de bootstrap lo lleva a 2 |
| Edit assignee V0 sin historia | PATCH `planner_tasks` | sync after-update | config cambia; assignee anterior revocado; fulfillment anterior retirado y nuevo creado | El PATCH ya cambió assignee V0 | Task +1; config +1; filas actualizadas +1 |
| Edit assignee V0 con historia | PATCH `planner_tasks` | sync after-update | config/assignees cambian; fulfillment queda intacto | Assignee V0 nuevo | **Inconsistente** |
| Complete V0 | fulfillment canónico | `complete_planner_task_with_audit` | fulfillment cambia + audit durable | refresh deriva status/actors/timestamps | Fulfillment +1; Task +1 |
| Verify V0 | fulfillment canónico | `verify_planner_task_fulfillment_with_audit` | fulfillment cambia + audit durable | refresh deriva verified | Fulfillment +1; Task +1 |
| Cancel | Task lifecycle V0 | sync after-update | current fulfillment recibe `inactive_at` | Task pasa a cancelled | Task +1; fulfillment +1 |
| Reactivate | Task lifecycle V0 | sync after-update | se limpia `inactive_at` | restaura `cancelled_from_status` | Task +1; fulfillment +1 |
| Trash | Task lifecycle V0 | no trigger canónico específico | fulfillment no cambia | `trashed_at` cambia | Task +1 |
| Restore | Task lifecycle V0 | no trigger canónico específico | fulfillment no cambia | se limpia `trashed_at` | Task +1 |

Complete/verify son atómicos: si falla fulfillment, proyección o audit, la
sentencia completa revierte. Cancel/reactivate también mantienen Task y
fulfillment en la misma sentencia SQL gracias al trigger. El activity log
legacy del service sigue siendo best-effort y queda fuera de esas transacciones.

## 7. Triggers y recursión

### Resultado: PASS_WITH_RISK

Orden efectivo local en `planner_tasks`:

```text
BEFORE UPDATE
1. guard_fulfillment_projection
2. increment_version
3. updated_at

AFTER UPDATE OF assigned_to_member_id, requires_verification, status
4. sync_foundation_from_v0
```

No se halló loop:

- refresh configura `homeplus.planner_internal_projection=on`;
- el guard permite la actualización interna;
- el sync after-update retorna inmediatamente;
- refresh apaga el flag antes de terminar.

No hay doble incremento de `planner_tasks.version` en una mutación nominal. Sí
hay un UPDATE redundante del fulfillment inmediatamente después de crearlo en
bootstrap, por lo que un fulfillment nuevo normal empieza expuesto con versión
2.

Defecto bloqueante del guard: solo bloquea cambios hacia
completed/awaiting/verified. Un cliente directo puede cambiar una Task
completed o verified a pending. El sync no proyecta ese cambio al fulfillment,
por lo que V0 queda pending mientras el fulfillment canónico sigue terminal.

## 8. Seguridad SQL, grants y owners

### Resultado: PASS_WITH_RISK

Catálogo PostgreSQL local verificado:

- owner de tablas y funciones: `postgres`;
- RLS habilitado en las tres tablas nuevas y `planner_tasks`;
- tablas nuevas: SELECT para `authenticated`, ALL para `service_role`, sin
  INSERT/UPDATE/DELETE para `authenticated`;
- todos los SECURITY DEFINER M11.1A: `search_path=pg_catalog, public`;
- helpers internos: EXECUTE solo para owner y `service_role`;
- backfill report: EXECUTE solo para owner y `service_role`;
- complete/verify/restore/capability: EXECUTE para `authenticated` y
  `service_role` además del owner.

`planner_m11_1a_backfill_report()` no filtra datos globales, pero tampoco los
expone a usuarios autenticados; por tanto no hay fuga a `authenticated`.

Complete, verify y restore:

- derivan `auth.uid()` y person/member actuales;
- exigen membership activa mediante `current_household_member_id()`;
- validan capability;
- complete valida los actor IDs legacy contra los derivados;
- Goal/Milestone restore solo usa `p_member_id` como comprobación de mismatch;
- Goal personal solo puede restaurarlo su creator member.

Riesgos:

- SQL duplica un subconjunto de la matriz backend como fallback. Coincide hoy,
  pero no es la autoridad única exigida por el freeze;
- `service_role` tiene EXECUTE, pero las RPCs requieren actor JWT; una llamada
  puramente service role sin `auth.uid()` falla. El grant es más amplio de lo
  operacionalmente útil, aunque no abre acceso sin actor.

## 9. RLS

### Resultado: FAIL

Tres tablas canónicas:

- mismo household + membership activa + `planner.view`: SELECT permitido;
- otro household: SELECT denegado;
- membership suspendida o ausente: SELECT denegado;
- escritura directa authenticated: denegada por grants.

`planner_tasks` conserva problemas bloqueantes:

- SELECT solo comprueba membership activa y omite `planner.view`;
- UPDATE solo comprueba membership activa y omite edit/cancel/restore,
  ownership, estado y assignee válido;
- INSERT comprueba create_household y creator derivado, pero no valida assignee;
- un usuario activo en dos hogares podría mover `household_id` entre ambos; el
  trigger no sincroniza `household_id` de las tablas canónicas;
- controller/service tampoco aplican realmente la promesa comentada de
  `task.edit_any` basada en ownership.

Por tanto, backend y RLS no producen decisiones equivalentes y un consumidor
directo de Supabase puede saltarse decisiones que el API pretende aplicar.

Tasks personales no existen todavía en el modelo. El controller acepta
`visibility=personal` para elegir `task.create_personal`, pero el service ignora
visibility y la policy siempre exige `task.create_household`. Para roles como
child, el controller puede permitir y RLS rechazar el mismo request.

## 10. Capabilities

### Resultado: FAIL

Paridad del fallback puro SQL vs `DEFAULT_CAPABILITY_MATRIX`:

| Capability | SQL fallback | Backend fallback | Paridad |
|---|---|---|---|
| planner.view | todos los roles activos | igual | Sí |
| task.create_household | coordinator/adult/adolescent/senior | igual | Sí |
| task.complete_assigned | todos los roles activos | igual | Sí |
| task.complete_unassigned | coordinator | igual | Sí |
| task.complete_any | coordinator | igual | Sí |
| task.verify | coordinator/adult/senior | igual | Sí |
| goal.restore | todos salvo guest | igual | Sí |

La lectura de `households.config.permissions[capability][role]` también coincide
en ambas implementaciones y el fallback SQL no concede más que backend.

La decisión de extremo a extremo diverge:

- RLS SELECT Task ignora `planner.view`;
- RLS UPDATE Task ignora capabilities y ownership;
- controller complete exige siempre `task.complete_assigned`;
- RPC exige complete_unassigned/complete_any para `legacy_unassigned`,
  complete_assigned para anyone, y assignee/complete_any para members;
- create personal del controller no tiene representación DB y la policy exige
  create_household;
- Goal restore agrega privacidad personal solo en RPC.

La capa final suele ser más estricta en legacy completion/restore, pero no es
equivalente. En UPDATE/SELECT directo es más permisiva.

## 11. Compatibilidad V0

### Resultado: PASS_WITH_RISK

Task create/edit/complete/verify/cancel/reactivate/trash/restore siguen usando
las rutas y DTO V0. Summary, Calendar y listas siguen leyendo
`planner_tasks`; no hubo cambio de forma visible ni de query base. TypeScript,
M8 y M9 pasan.

Para una Task V0 nueva con `assigned_to_member_id = NULL`:

```text
V0: NULL / “Sin asignar”
canónico: anyone + shared fulfillment
```

Se verificó que M11.1A:

- no crea un assignee concreto;
- no cambia `assigned_to_member_id`;
- no cambia household/visibilidad;
- no inserta outbox ni código de notificaciones;
- conserva los DTOs V0.

Riesgos de la diferencia temporal:

- Planner List muestra “Sin asignar” y ofrece Completar;
- el RPC trata anyone como completable con `task.complete_assigned`;
- Home sigue clasificando NULL como unassigned y usa
  `task.complete_unassigned`, por lo que distintos surfaces pueden mostrar
  elegibilidad distinta al mismo usuario;
- un NULL histórico es legacy_unassigned, mientras un NULL nuevo es anyone,
  aunque ambos son indistinguibles en el DTO V0.

No se detectó autoasignación ni efecto de notificación nuevo, pero la semántica
de acción no es uniforme entre surfaces.

## 12. Restore Goal/Milestone

### Resultado: PASS

Traza verificada:

```text
PlannerTrashScreen item.version
→ plannerGoals.ts expectedVersion obligatorio + If-Match
→ controller parseRequiredExpectedVersion()
→ backend service omite p_member_id
→ RPC deriva auth/person/member, bloquea fila y compara version
→ UPDATE único
→ trigger increment_planner_version una vez
```

Se confirmó:

- expectedVersion obligatorio en frontend y controller;
- If-Match se emite siempre en restore Goal/Milestone;
- stale produce SQLSTATE 40007 y conflicto de API;
- `p_member_id` compatible no es autoridad y un mismatch se rechaza;
- Goal personal exige creator member;
- Goal y Milestone incrementan versión exactamente una vez al restaurar;
- already-restored con versión actual no incrementa.

El activity log posterior del service sigue siendo best-effort y no forma parte
de la transacción de restore, pero no compromete la restauración ni el actor.

## 13. Calidad de pruebas

### Resultado: FAIL

Comandos ejecutados:

- `node scripts/planner_m11_1a_contract_tests.js`: **24/24 PASS**;
- `node tests/static/backend-syntax.js`: **97 archivos PASS**;
- frontend `tsc --noEmit`: **PASS**;
- M8: **115/115 PASS**;
- M9: **50/50 PASS**;
- `supabase migration list --local`: **34/34**;
- `supabase db lint --local --level error`: **PASS**;
- `git diff --check`: **PASS**;
- `node scripts/planner_m11_1a_database_tests.js` sobre el reset final:
  **FAIL**, porque presupone seis fixtures legacy inexistentes.

La suite contractual tiene 24 assertions, de las cuales 16 son búsquedas de
strings/regex en archivos y 8 prueban un fake en memoria de idempotencia. No
ejecuta SQL, PostgREST ni services reales para esas 16 garantías.

La suite DB sí ejecuta comportamiento PostgreSQL real, pero:

- requiere una orquestación externa de reset parcial, seed y migration up;
- `seedLegacy()` hace COMMIT y no limpia;
- `cleanupFixture()` está definida pero nunca se llama;
- el flujo principal vacía sus listas de cleanup a propósito y deja fixtures;
- no puede ejecutarse autónomamente desde el estado limpio documentado;
- no prueba cross-household assignee en INSERT/UPDATE Task;
- no prueba config/assignee SELECT RLS cross-household;
- no prueba el guard `terminal -> pending`;
- no prueba assignment change con historia;
- no prueba coexistencia shared + individual actual;
- no prueba coherencia status/actors/timestamps;
- no prueba spoofing de creator en INSERT ni de Milestone restore;
- no prueba que retirar cada constraint/index haga fallar la suite;
- no comprueba el header If-Match real; el test estático comprueba la firma y
  el callsite de Trash;
- codifica `version_conflict` como resultado correcto de la carrera shared,
  contradiciendo la idempotencia silenciosa del freeze.

Quitar varios constraints, abrir algunas policies o eliminar el índice de
exclusión modal inexistente no haría fallar estas pruebas. La afirmación de
limpieza completa del informe de implementación tampoco está respaldada por el
script.

## 14. Contradicciones con el freeze

1. **Active new Task → valid assignment configuration:** no se garantiza para
   escritura directa con assignee cross-household.
2. **Each person → one fulfillment per concrete person / Shared once → one
   shared fulfillment:** los helpers lo producen, pero el esquema no impide
   ambas modalidades actuales simultáneas.
3. **Backend and RLS must agree:** incumplido en view, update, ownership,
   personal create y completion legacy.
4. **Household is the capability authority / one authority:** el fallback SQL
   duplica la matriz backend; hoy coincide, pero puede derivar.
5. **Repeated operation never duplicates effect:** no duplica filas en la
   carrera probada, pero el segundo actor recibe conflicto visible en vez de
   idempotencia silenciosa.
6. **Changing assignees preserves history:** la historia se preserva, pero
   también queda erróneamente como obligación actual después de cambiar config.
7. **Trash precedence:** Task trash bloquea RPC por consulta de Task, pero el
   fulfillment sigue marcado como operativo si se consulta aislado.
8. **Task completion belongs to fulfillment:** cumplido para complete/verify
   por API, pero puede romperse con UPDATE directo de status a pending.

## 15. Defectos bloqueantes

### B1 — Integridad y autorización de assignee

Agregar validación RLS/trigger y constraints compuestos para que Task, config,
assignees, fulfillments y members compartan household. Cerrar UPDATE directo de
Task por capability/ownership y evitar cambio de household no coordinado.

### B2 — Assignment edit con historia

Definir y ejecutar una transición atómica: preservar el fulfillment histórico
como retired y crear la obligación correspondiente a la nueva config, o
rechazar el cambio hasta que exista la operación V1. No dejar config y current
fulfillment contradictorios.

### B3 — Invariant único de modalidad actual

Impedir que una Task tenga simultáneamente shared e individual current
fulfillments. Los dos índices parciales actuales no son suficientes.

### B4 — Guard/proyección incompleto

Bloquear toda mutación directa de los campos de proyección de fulfillment,
incluyendo transiciones a pending, salvo flags internos/RPCs autorizados.

### B5 — Idempotencia concurrente

Después de adquirir el lock, reconocer que la obligación compartida ya fue
resuelta y devolver noop/replay coherente antes de exponer el stale conflict al
segundo completion equivalente.

### B6 — Backfill incompleto

Abortar o reportar explícitamente actores cross-household, pares member/person
inconsistentes y estados/timestamps contradictorios antes de desplegar sobre
datos reales.

### B7 — Gate de pruebas insuficiente

Hacer la suite autocontenida y con cleanup garantizado; añadir casos negativos
para cada invariant, policy y ruta de spoofing descritos arriba.

## 16. Riesgos no bloqueantes

- fulfillment nuevo empieza en versión 2 por UPDATE redundante de bootstrap;
- `verify` no recibe fulfillment ID y elige por orden temporal;
- trash depende de join/guard externo para no considerar operativo el
  fulfillment;
- función backend `verifyTask` V0 anterior queda muerta junto a la nueva
  `verifyTaskViaFulfillment`, aumentando riesgo de reexport accidental;
- activity legacy fuera de complete/verify sigue siendo best-effort;
- SQL/backend capability fallback puede divergir en cambios futuros;
- drift y conteos remotos siguen sin verificar;
- legacy_unassigned necesita resolución explícita antes de retirar V0.

## 17. Readiness

### Readiness para commit: NO

Los defectos B1–B7 afectan seguridad, integridad canónica, cumplimiento del
freeze y confiabilidad del gate. Deben corregirse y volver a auditarse antes de
commit.

### Readiness para M11.1B: NO

M11.1B no debería construir operaciones multi-assignee/correction/revert sobre
una base que permite scopes actuales mixtos, assignment histórico inconsistente
y bypass de RLS. Primero debe cerrarse M11.1A.

## 18. Git status final

La única escritura de esta auditoría es este informe. Los nueve cambios M11.1A
iniciales permanecen y se agrega:

```text
?? docs/implementation/planner/M11_1A_CODE_AUDIT.md
```

No se modificó código, migraciones, tests existentes, dependencias ni Git.

M11_1A_AUDIT_FAIL
