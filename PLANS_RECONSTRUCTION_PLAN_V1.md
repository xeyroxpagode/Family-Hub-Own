# PLANS · RECONSTRUCTION PLAN V1

**Estado:** plan ejecutable. **NO implementar hasta aprobación humana.**
**Evidencia:** `PLANS_RECONSTRUCTION_DISCOVERY_V1.md` (mismo worktree, misma sesión)
**Producto authority:** `C:\Users\thega\Downloads\PLANS_PRODUCT_TRUTH_V1_AND_FIGMA_AUDIT.md` — CLOSED, **no se reabre**
**Worktree:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
**HEAD de referencia:** `79f877f152072e759c11511bd91807273c4e1c13` (detached)

---

## 0. REGLAS DE ESTA PLANIFICACIÓN

1. Este plan **no implementa**. Los slices se aprueban uno por uno.
2. El orden sale de las **dependencias descubiertas**, no de un roadmap prefijado.
3. Cada slice es **mínimo, verificable, mergeable y reversible cuando sea razonable**, con **una sola responsabilidad principal**.
4. Ningún slice mezcla relación Task + relación Event + Measurements + Lifecycle.
5. Antes de tocar persistencia, la verificación debe ser **evidencia** (§ Baseline gate).
6. Prohibido en toda la reconstrucción: `supabase db reset`, `supabase db push`, borrado de filas, "arreglar" `UPDATE` de datos, reescribir historial.
7. **Ninguna migración que haga `DROP` se escribe antes del export frío y de un ciclo completo sin incidentes.**
8. `OWNER DECISION` bloqueante ⇒ el slice no arranca.

### 0.1 Precondición global — gate de verificación (debe estar verde ANTES de cualquier slice de persistencia)

| Bloque | Acción | Criterio |
|---|---|---|
| **G0** | `npm run typecheck` → exit 0 en `frontend-typecheck` **y** `test-typecheck`. Se corrige **contra el código** (`plannerNavigationContract.ts:144,151`; `PlannerScreen.tsx:799-810`), no contra el test | verde |
| **G1** | `node tests/run.js planner-m1` | `Failed: 0` |
| **G2** | `node tests/run.js planner-frontend-core-integration` (alinear `:49` → `'Calendario'`, `:52` → `PlannerPlanListScreen`) | exit 0 |
| **G3** | `node tests/run.js planner-m4` + `planner-m5` (resolver las 6 asserts contradictorias de `create_goal` contra `plannerQuickActions.ts:126`) | exit 0 |
| **G4** | `HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 npm run test:db` (con `supabase status` verificado) | exit 0, **sin SKIPPED** |
| **G5** | Registrar `planner-p1-structure-db` como script npm **y** añadirlo a `quality` | wired |

**Por qué es bloqueante y no un extra:** hoy `quality` **aborta en el comando 2 de 18** con 5 errores TS, todos en `scripts/planner_v1_navigation_tests.ts`. Los comandos 3-18 — incluidos `g0.3` y `db` — **nunca se ejecutan**. Cualquier slice posterior se verificaría contra una suite que no significa nada.
**Coste:** ~1 día. **Riesgo:** nulo (no toca producto). **Reversible:** sí, commit aislado.

---

## 1. `OWNER DECISION` BLOQUEANTES

Ninguno de estos es técnico. Ningún slice de persistencia arranca sin los tres primeros.

| ID | Decisión | Opciones | Impacto si no se decide |
|---|---|---|---|
| **OD-1** | **¿Cuál es la autoridad canónica de Plan?** | (a) `planner_plans` **(recomendada)** · (b) `planner_goals` · (c) mantener dos | Bloquea S2-S11. `RC-001`, `RC-002` |
| **OD-2** | **¿Cómo se llama el terminal en la tabla canónica?** | (a) renombrar `closed` → `cancelled`, alineado con Product Truth §13 **(recomendada)** · (b) mantener `closed` y anotar la divergencia | Bloquea S6. Afecta el CHECK, la función de transición, `availableActions` y todos los clientes |
| **OD-3** | **¿Archive es alcanzable y totalmente ortogonal?** | (a) habilitar `plan.archive` + `plan.unarchive` y **relajar** `archive_terminal_only` **(recomendada**, Product Truth §14) · (b) mantener la restricción a terminales | Bloquea S8 |
| OD-4 | ¿`planner_goals.current_value/target_value` se re-expresan como Measurements, o se descartan? | (a) re-expresar sólo los que tengan `unit` + semántica clara · (b) descartar con export frío | Bloquea S11 |
| OD-5 | ¿El activation gate sigue siendo un umbral duro (exigir ≥1 componente útil)? | Product Truth §01 permite Plan vacío; §08 dice que un Plan sin Required también puede estar listo ⇒ **propuesta: eliminar el gate** | Bloquea S6 |
| OD-6 | ¿`finalization_kind` se conserva? | (a) conservar (es inocuo) · (b) `DROP` (el Target no lo pide; hoy nunca se lee) | Bloquea S11 |
| OD-7 | ¿Dónde vive la información de producción para dimensionar la migración? | Contar filas en el proyecto Supabase remoto | **Bloquea S11 de forma dura** |
| OD-8 | ¿`create_goal` de Quick Actions debe quedar implementado (escritura en `planner_plans`)? | hoy `implemented:false` ⇒ **`planner_plans` es inaccesible desde la UI** | Bloquea S4 |

---

## 2. ORDEN DE SLICES

```
G0-G5  Verification gate (no toca producto)
  │
  ├─ S1  Route & Navigation Authority        ← repara el P0 que el usuario ve HOY
  ├─ S2  Canonical Plan Contract + plan.*    ← sin migración de datos
  │
  └─ S3  Canonical Plan Persistence + Data Cutover   ← 1 migración de datos + copia de 1 fila
       │
       ├─ S4  Create/Edit Plan over canonical  ← cierra "no hay forma de escribir planner_plans"
       │
       ├─ S5  Plan Component Relation (Task+Event)  ← 1 tabla, 1 autoridad
       │      │
       │      ├─ S6  Required/Optional + Lifecycle + Archive    ← band plana, vocabulario único
       │      │
       │      └─ S7  Readiness + factual Progress (backend)
       │
       ├─ S8  Completion + Lifecycle + Archive/Trash/Restore  ← reality test de S6
       │
       ├─ S9  Measurement Surface             ← desbloquea Figma
       │
       ├─ S10 Cross-Planner Cutover            ← Home, Trash, Attention, Activity, Deep links
       │
       ├─ S11 Legacy Retirement + Data Export ← lo ÚLTIMO
       │
       └─ S12 Full QA Matrix                  ← cierra los 8 gaps de test
```

**`S1` y `S2` no dependen de la Od-1 para empezar** (S1 depende de OD-1 sólo para decidir a qué sistema apunta cada ruta; si OD-1 recomienda `planner_plans`, S1 es inmediato).

---

## S0 — VERIFICATION GATE
**ID:** `S0` · **PRIORITY: P0** · **BLOQUEA TODO: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Que `npm run quality` sea verde y que la verificación de Plan sea evidencia. Sin esto, ningún slice posterior es verificable. |
| **CURRENT** | `quality` rojo en el comando 2/18 (5 errores TS en `scripts/planner_v1_navigation_tests.ts:217,218,219,387,393`). `planner-frontend-core-integration` afirma `'Eventos'` y `'PlannerPlansScreen'` contra código que dice `'Calendario'` (`PlannerScreen.tsx:804`) y `PlannerPlanListScreen` (`:50,787`). 6 asserts cableados contradicen `implemented:false`. `tests/db/run.js:34-38` hace skip silencioso. `planner-p1-structure-db` sin script npm y fuera de `quality`. `PLANNER_V0_SCHEMA_CHECKS.sql` no menciona `planner_plan*`. |
| **TARGET** | `quality` verde, sin skips de DB, incluyendo `planner` y `planner-p1-structure-db`. |
| **REAL GAP** | Los asserts contradictorios están **verificados contra código real en esta sesión**, no suponidos. |
| **ROOT CAUSES** | RC-026 (corregida), RC-029, RC-032 |
| **FILES / AREAS** | `scripts/planner_v1_navigation_tests.ts` · `scripts/planner_v1_frontend_core_integration_tests.ts` · `scripts/planner_v1_quick_actions_tests.ts` · `scripts/planner_v1_goal_quick_create_tests.ts` · `package.json` · `tests/run.js` · `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql` (extender) |
| **DB IMPACT** | Ninguno |
| **BACKEND IMPACT** | Ninguno |
| **FRONTEND IMPACT** | Ninguno |
| **CROSS-MODULE IMPACT** | Ninguno |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | No aplica |
| **TESTS** | Es el slice de tests. Cablear `planner_m11_3a_contract_tests.js` (17 554 B) — valida el SQL de `planner_plans`/`_milestones`/`_measurements`/`_requirements` y hoy está DEAD. Añadir `planner_plan_*` a `PLANNER_V0_SCHEMA_CHECKS.sql`. Retirar los 2 tautológicos (`:165-187` de `goal_quick_create`, `:258` de `p2a`) **sólo después** de que el resto cubra lo mismo. |
| **RUNTIME VERIFICATION** | `npm run typecheck` · `npm run quality` · `HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 npm run test:db` · `node tests/run.js planner` — **los cuatro deben salir con exit 0 y sin `SKIPPED`** |
| **MIGRATION RISK** | Ninguno |
| **ROLLBACK RISK** | Ninguno (commit aislado) |
| **PREREQUISITES** | Ninguno |
| **DONE CONDITION** | 4 comandos verdes; `planner-p1-structure-db` tiene script npm y está en `quality`; `grep -c SKIPPED` = 0 en la salida de `test:db` |
| **HUMAN VALIDATION** | Ninguna |

---

## S1 — ROUTE & NAVIGATION AUTHORITY
**ID:** `S1` · **PRIORITY: P0** · **BLOQUEA S2-S11: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Que ningún id de Plan cruce de tabla. Repara el único defecto P0 que el usuario ve hoy, **sin tocar persistencia**. |
| **CURRENT** | La lista lee `planner_goals` (`PlannerPlanListScreen.tsx:64`) y navega a `ROUTE_NAMES.PlanDetail = 'GoalDetail'` (`:144`) que monta `PlannerPlanDetailScreen` → `GET /api/planner/plans/:id` → `planner_plans`. `RUNTIME VERIFIED`: `read_planner_plan_graph_rpc(<goal_id>)` devuelve NULL ⇒ **404**. Además `GoalForm.tsx:475` navega igual tras crear. Y `PlannerPlanDetailScreenV1` (que lee `planner_goals`) **es alcanzable** por la ruta literal `'PlanDetail'` desde `PlannerPlanCreateScreen.tsx:105` y `TaskForm.tsx:535`. |
| **TARGET** | Una sola familia de rutas de Plan, un solo sistema de tablas, un solo id space. |
| **REAL GAP** | La clase de bug "el id cruza de tabla" es estructural, no un typo. |
| **ROOT CAUSES** | RC-003 · RC-041 |
| **FILES / AREAS** | `navigation/plannerNavigationContract.ts:144,151-152,411` · `navigation/HomeTabNavigator.tsx:197-202,219` · `screens/planner/PlannerPlanListScreen.tsx:81-90` · `screens/planner/GoalForm.tsx:463-475` · `screens/planner/PlannerPlanCreateScreen.tsx:105` · `screens/planner/TaskForm.tsx:535` · `services/planner/plannerNavigationHelpers.ts:171-177,408-416,427-429` · `services/planner/plannerDeepLinkParser.ts:277-283` · `services/planner/plannerDeepLinkCoordinator.ts:273-280` · `services/planner/plannerNotificationAdapter.ts:160` · borrar `services/plannerPlansV1.ts` |
| **DB IMPACT** | Ninguno |
| **BACKEND IMPACT** | Ninguno |
| **FRONTEND IMPACT** | Contrato de navegación + 5 pantallas + deep links + notificaciones |
| **CROSS-MODULE IMPACT** | Search, Deep links, Notifications (los tres aterrizan en `GoalDetail` → `planner_plans`) |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | No aplica |
| **TESTS** | `scripts/planner_v1_navigation_tests.ts` **re-escribir contra el contrato real**; **añadir** un test que confirme "el id de detalle pertenece a la familia de tablas del cliente que lo emitió" (éste es el que hoy nadie tiene). `PlannerPlanDetailScreenV1` queda registrado y alcanzable o se marca explícitamente como no-navegable. |
| **RUNTIME VERIFICATION** | 1) Abrir tab Planes. 2) Crear Plan. 3) Confirmar aparición en lista. 4) Abrir recién creado ⇒ **debe cargar, no 404**. 5) Refresh. 6) Editar. 7) Buscar el Plan y abrirlo desde Search. 8) Deep link `homeplus://planner/goals/:id`. Cada uno: PASS/FAIL/BLOCKED con captura. |
| **MIGRATION RISK** | Ninguno |
| **ROLLBACK RISK** | **Bajo.** Un commit. |
| **PREREQUISITES** | **S0** · **OD-1** |
| **DONE CONDITION** | Abrir un Plan creado desde la lista **no** produce 404. Ninguna ruta canónica monta una pantalla de la otra familia. `grep -r "plannerPlansV1'"` = 0 importadores. |
| **HUMAN VALIDATION** | **Sí** — abrir y crear un Plan en la app, en dispositivo, y confirmar que el detalle carga. |

> **Nota de alcance:** S1 **repara el síntoma**, no la autoridad. La lista seguirá leyendo `planner_goals` y el detalle `planner_plans` **hasta que S3 unifique la tabla**. Por eso S1 debe apuntar ambas rutas al sistema que S3 hará canónico; si S1 se hace "en local" y luego S3 cambia la tabla, hay retrabajo mínimo (2 constantes de ruta).

---

## S2 — CANONICAL PLAN CONTRACT + `plan.*` CAPABILITY NAMESPACE
**ID:** `S2` · **PRIORITY: P0** · **BLOQUEA S3+: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Un solo DTO, un solo vocabulario de lifecycle, un solo namespace `plan.*`, una sola matriz de capabilities. |
| **CURRENT** | 3 DTOs divergentes (`planner.plans.service.js:151-169` vs `planner.plans.v1.service.js:111-137` vs fila cruda de goals). `planner_plan_can_mutate:411-418` mapea acciones de Plan a capabilities `goal.*`. **No existe namespace `plan.*`** (0 hits de `plan\.` en `backend/src`). Las matrices JS y SQL divergen (`goal.create_personal` y `goal.manage_participants`: ✅JS / ❌SQL). `goal.archive` es `false` ×6 en JS y `else false` en SQL. |
| **TARGET** | `plan.*` con una matriz única; un DTO canónico; `PlannerPlan` como único tipo. |
| **REAL GAP** | Plan no puede expressar "crear Plan personal" (oculto+denegado en SQL) ni archivar (denegado en ambos). |
| **ROOT CAUSES** | RC-011 · RC-012 · RC-030 · RC-002 |
| **FILES / AREAS** | `services/planner.plans.service.js:14-36,140-169` · `lib/plannerCapabilities.js:53-63,91-332` · `routes/planner.plans.controller.js:43,83-101` · `types/PlannerPlan.ts` · borrar `types/PlannerPlanV1.ts` · borrar `validateLifecycle` (`planner.plans.v1.service.js:71,700`) |
| **DB IMPACT** | **1 migración**: `CREATE OR REPLACE FUNCTION planner_plan_actor_has_capability` con la matriz `plan.*`. **Sin backfill, sin `DROP` de columna.** |
| **BACKEND IMPACT** | capabilities + DTO + controller |
| **FRONTEND IMPACT** | 1 tipo |
| **CROSS-MODULE IMPACT** | Ninguno todavía |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | La migración **no** cambia ninguna policy ni ningún `SECURITY DEFINER`. Sólo la matriz de返回值 de una función ya `DEF`。 Habilitar `plan.archive` es el fix de `goal.archive` muerto. |
| **TESTS** | Un test que falle si `goal.archive` es `false` en la matriz por defecto. Un test que falle si existe más de un `toPlanDto` en `backend/src`. Cablear `planner_m11_3a_contract_tests.js`. |
| **RUNTIME VERIFICATION** | 1) `archive` como `adult` ⇒ **debe pasar** (hoy la capability es falsa). 2) `grep "'plan\." backend/src` > 0. 3) Un Plan personal debe poder crearse. |
| **MIGRATION RISK** | **Medio** — cambiar la matriz puede romper superficies que hoy "funcionan" por permiso accidental. Mitigación: el override por `households.config.permissions` ya está soportado (`20260722040000:341-344`). |
| **ROLLBACK RISK** | Medio. Mitigación: la migración es un `CREATE OR REPLACE` revertsible; capability-first. |
| **PREREQUISITES** | **S0** · **OD-1** |
| **DONE CONDITION** | `plan.*` existe · `goal.archive` deja de estar muerto · 1 solo `toPlanDto` · 1 solo tipo `PlannerPlan` en el frontend · `validateLifecycle` y `PlannerPlanV1.ts` eliminados |
| **HUMAN VALIDATION** | **Sí** — archivar y desarchivar un Plan desde la app, como un adulto del hogar. |

---

## S3 — CANONICAL PLAN PERSISTENCE + DATA CUTOVER
**ID:** `S3` · **PRIORITY: P0** · **BLOQUEA S4-S11: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Una sola tabla de Plan. `planner_plans` pasa de 0 filas a ser el system of record. |
| **CURRENT** | `planner_plans` = **0 filas** (`RUNTIME VERIFIED`). `planner_goals` = **1 fila QA** (`"hdjs"`, `household`, `preparation`/`active`, `progress_mode=steps`). `planner_plan_legacy_goal_links` = **0 filas**. |
| **TARGET** | La fila QA existe en `planner_plans` con `scope='household'`, `objective`, `lifecycle='draft'`, y un registro en `planner_plan_legacy_goal_links` con `mapping_kind='reviewed_manual'`. |
| **REAL GAP** | Hoy la lista y el create usan `planner_goals`; el detalle y Search usan `planner_plans`. Ninguno tiene datos. |
| **ROOT CAUSES** | RC-001 · RC-002 · RC-023 · RC-029 |
| **FILES / AREAS** | **nueva** migración; `services/planner.plans.v1.service.js:191` (listar pasa a `planner.plans.service:242`); `controllers/planner.plans.controller.js` (alta de `GET /api/planner/plans` ya existe en `:69-74`); `screens/planner/PlannerPlanListScreen.tsx:57-71`; `screens/planner/GoalForm.tsx:463` |
| **DB IMPACT** | **1-2 migraciones**: (1) ampliar `planner_plan_legacy_goal_links` si hace falta; (2) **copia dirigida, fila por fila, con reporte**: `planner_goals` → `planner_plans` (`title→objective`, `visibility→scope`, `lifecycle: preparation→draft / cancelled→closed`, `target_date→target_date`, `created_by_member_id` → `created_by_person_id` vía `household_members.person_id`). **Con 0 goals `personal`, el mapeo a `owner_person_id` no se ejercita localmente** ⇒ dejar constancia de que está sin probar. |
| **BACKEND IMPACT** | `GET /api/planner/v1/plans` y `POST /api/planner/goals` pasan a **read-only** o devuelven 410; el tab y el create usan `/api/planner/plans` |
| **FRONTEND IMPACT** | El tab lista y el create apuntan al cliente canónico |
| **CROSS-MODULE IMPACT** | **Home** (§13) y **Trash** (§13) leen `planner_goals` ⇒ pasan a leer `planner_plans` **o** se acepta degradación temporal. **Trash rompe con fallo duro** si no se cambia. |
| **DATA MIGRATION** | **1 fila.** Con reporte de orphans. **Sin `DELETE`.** `planner_goals` queda **congelada en lectura**. |
| **SECURITY / RLS** | El bridge ya tiene policy (`planner_plan_can_read(plan_id,true)`). **`NEW`: esa policy usa `can_read(...,true)`, que incluye papelera ⇒ un Plan trasteado expone su link. Registrar como deuda; no cambiar en este slice.** |
| **TESTS** | Test de DB: tras el backfill, `count(planner_plans) = count(planner_goals antes)` y `select count(*) from planner_plan_legacy_goal_links where plan_id is not null = count(planner_goals)`. Test de que el lifecycle traducido es `draft`. Test de que `owner_person_id` se resolvió (o se registra explícitamente como no ejercitado). |
| **RUNTIME VERIFICATION** | 1) Tab Planes lista. 2) Crear Plan. 3) Aparece. 4) Abre sin 404. 5) Refresh. 6) Editar. 7) Buscar. Cada uno con resultado. |
| **MIGRATION RISK** | **Medio.** Con 1 fila, el riesgo técnico es bajo; el riesgo real es que **este hallazgo es local** ⇒ antes de aplicar en remoto hay que contar filas allí (**OD-7**). |
| **ROLLBACK RISK** | **Bajo.** La copia es aditiva; se revierte con `DELETE` de las filas copiadas usando `planner_plan_legacy_goal_links` como lista exacta. `planner_goals` intacta. |
| **PREREQUISITES** | **S0, S1, S2** · **OD-1** |
| **DONE CONDITION** | 0 escrituras nuevas en `planner_goals` desde la app · la fila QA existe en `planner_plans` · el puente tiene 1 fila `reviewed_manual` · el tab y el create usan el sistema canónico |
| **HUMAN VALIDATION** | **Sí** — crear un Plan real, comprobar que aparece, abre, y que el Trash sigue funcionando. |

> **Guardarraíl:** la migración debe **fallar** si `count(planner_goals) > un umbral acordado`. Si producción tiene datos, este slice **se detiene** y vuelve a §OD-7.

---

## S4 — CREATE / EDIT PLAN SOBRE LA AUTORIDAD CANÓNICA
**ID:** `S4` · **PRIORITY: P0** · **BLOQUEA S5+: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Que exista **una sola forma** de crear y editar un Plan, y que escriba en la autoridad canónica. |
| **CURRENT** | **Dos editores**: `GoalForm` (alcanzable, escribe `planner_goals`) y `PlannerPlanMinimalCreateSurface` + `planMilestoneEditor` (muerto, escribe `planner_plans`). `create_goal` de Quick Actions tiene `implemented:false` (`plannerQuickActions.ts:126`) ⇒ **no hay ruta de usuario que escriba `planner_plans`**. No existe "editar Plan" sobre `planner_goals` (`EditGoalScreen.tsx:4` no registrado). |
| **TARGET** | Un editor, alcanzable, que escribe `planner_plans` vía `write_planner_plan_graph_rpc`. |
| **REAL GAP** | `planner_plans` es inaccesible desde la UI. `OD-8` sin resolver ⇒ el sistema canónico no se puede poblar. |
| **ROOT CAUSES** | RC-028 · RC-004 (parcial) |
| **FILES / AREAS** | `screens/planner/GoalForm.tsx` / `components/planner/PlannerSheetHost.tsx:391,465` / `screens/planner/PlannerPlansSurfaces.tsx:252` / `services/planner/plannerQuickActions.ts:126` / `services/planner/plannerPlans.ts:89-98,363` |
| **DB IMPACT** | Ninguno |
| **BACKEND IMPACT** | `writePlanGraph` ya soporta el alta. Falta exponer `GET /api/planner/plans` como lista (ya existe `planner.plans.service.js:242`) |
| **FRONTEND IMPACT** | Un editor; quitar el otro |
| **CROSS-MODULE IMPACT** | Quick Actions |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | `write_planner_plan_graph_rpc` tiene `EXECUTE` para `PUBLIC`/`anon` (`RUNTIME VERIFIED`) **pero** guard `authenticated actor required` en `:75` ⇒ **falla cerrado**. **Registrar como deuda (RC-035) y endurecer el grant en un slice de seguridad, no aquí.** |
| **TESTS** | Test de payload de create (ya existe `planner_v1_frontend_plans_tests.ts:317-348`, hay que hacerlo asserts de persistencia). Test de que `create_goal` queda `implemented:true` **y** el filtro del menú lo deja visible (`QuickActionsMenu.tsx:98`) |
| **RUNTIME VERIFICATION** | Crear Plan desde la lista · Crear Plan desde Quick Actions · Editar ambos · Verificar que **no** aparece nada nuevo en `planner_goals` (`select count(*)` antes y después) |
| **MIGRATION RISK** | Ninguno |
| **ROLLBACK RISK** | Bajo |
| **PREREQUISITES** | **S3** · **OD-8** |
| **DONE CONDITION** | Un editor alcanzable · crear/edita escribe `planner_plans` · `planner_goals` no recibe escrituras |
| **HUMAN VALIDATION** | **Sí** |

---

## S5 — PLAN COMPONENT RELATION (Task + Event)
**ID:** `S5` · **PRIORITY: P0** · **BLOQUEA S6-S8: YES**

> ⚠️ **Slice único con dos `component_kind` por diseño, no por atajo.** La tabla es **una**; los dos discriminadores comparten RLS, unicidad y `classification`. Partirlo en dos slices duplicaría la autoridad de derivación de Required/Optional, Readiness y Progress, que es exactamente lo que §5 de Discovery quiere evitar. La verificación sí es separada por `component_kind`.

| Campo | Valor |
|---|---|
| **OBJECTIVE** | `Task → 0..1 Plan` y `Event → 0..1 Plan`, con FK, unicidad global, Required/Optional en la fila, y `unlink ≠ delete` garantizado estructuralmente. **Y que vincular nunca amplíe visibilidad.** |
| **CURRENT** | Task: `goal_id` (FK a goals) + requirement externo sin FK + `origin_*` sin FK ⇒ **double-link posible**, sin 0..1 para `planner_plans`, imposible en Plan personal (`:165-171`). Event: **sólo** requirement externo sin FK, **nunca satisfacible** (`v_subject_satisfied := false` `:534-537`), dos escritores con garantías distintas, sin unicidad, sin writer de UI, deep-link que da 404 para Events personales. |
| **TARGET** | `planner_plan_components(plan_id, component_kind, entity_id, classification, sort_order, version, trashed_at, …)` con `UNIQUE (component_kind, entity_id) WHERE trashed_at IS NULL`, FK a `planner_plans`, y RLS que interseca permiso de Plan **y** de la entidad. |
| **REAL GAP** | No existe ninguna relación canónica. `planner_plan_task_links` y `planner_plan_event_links`: **NOT FOUND**. |
| **ROOT CAUSES** | RC-004 · RC-005 · RC-006 · RC-020 · RC-031 · RC-037 |
| **FILES / AREAS** | **nueva** migración · `services/planner.plans.service.js` (endpoints link/unlink) · `routes/planner.plans.controller.js` · `services/planner/plannerPlans.ts` · `screens/planner/PlannerPlanDetailScreen.tsx` · `screens/planner/PlannerPlanStructureEditScreen.tsx:90` |
| **DB IMPACT** | **2 migraciones**: (1) `planner_plan_components` + índices + RLS + CHECK; (2) **ninguna** en `planner_tasks` ni `planner_events`. **Cero backfill necesario**: `planner_tasks.goal_id` tiene **0 filas no nulas** y hay **0 requirements external** (`RUNTIME VERIFIED`). Función de validación de scope **reutilizada y endurecida** de `planner_plan_validate_external_link:153-188` (que ya es correcta para Event; se le añade: exigir `trashed_at IS NULL` en la entidad, y exigir `scope` compatible en ambos sentidos). |
| **BACKEND IMPACT** | Endpoints link/unlink **distinguidos** (no `action='trash'` sobre un requirement). Unlink = `DELETE` de la fila de relación. **No** se toca `planner_tasks` ni `planner_events`. |
| **FRONTEND IMPACT** | Superficie de link/unlink reutilizando el patrón de `planMilestoneEditor`. Deep-link por scope: leer Event por la ruta **V1** (`GET /api/planner/v1/events/:id`), no por `EventDetailScreen` (V0). |
| **CROSS-MODULE IMPACT** | **Tasks**: `goal_id` queda **read-only** (no se escribe). **Events**: sin cambios. |
| **DATA MIGRATION** | **Ninguna.** Se registra explícitamente: el backfill es vacío porque los datos son vacíos. Si aparece data en remoto, el backfill desde `goal_id` **requiere** el mapeo goals→plans de S3 y debe hacerse **con reporte de orphans, nunca con borrado**. |
| **SECURITY / RLS** | **P0 de este slice.** La policy de la relación **debe** ser `planner_plan_can_read(plan_id,false) AND <permiso de la entidad>`. Crear la tabla **sin** el segundo término reproduce el armado S1. **Verificar los 8 casos de §12.2 contra DB real con `SET LOCAL ROLE authenticated` + JWT de actor**, no contra `postgres`. Añadir la intersección al `external_link_dto` si se conserva. |
| **TESTS** | **Contra DB real:** `UNIQUE (component_kind, entity_id) WHERE trashed_at IS NULL` rechaza el multi-homing · unlink preserva la fila de Task/Event · los 8 casos de scope de §12.2 · **link desde Plan personal a Task household → RECHAZADO** · **link desde Plan household a Event personal → RECHAZADO** · Measurement en Plan personal no expone nada extra. **Frontend:** link, unlink, y que unlink no borre. |
| **RUNTIME VERIFICATION** | 1) Task sin Plan. 2) Crear Task desde Plan. 3) Vincular Task existente. 4) Abrir la Task desde el Plan. 5) Desvincular ⇒ **la Task sigue existiendo** (verificable en el tab Tareas). 6) Event independiente. 7) Vincular Event. 8) Abrir Event desde Plan ⇒ **no 404, incluso personal**. 9) Desvincular ⇒ el Event sigue. |
| **MIGRATION RISK** | **Alto** — es la primera migración que toca el dominio de componentes. **Mitigación:** puramente aditiva (una tabla nueva). No se altera ninguna columna de `planner_tasks` ni de `planner_events`. |
| **ROLLBACK RISK** | **Bajo.** `DROP TABLE planner_plan_components` y nada más se pierde (0 filas). El danger es la lógica de servidor, que se revierte con el commit. |
| **PREREQUISITES** | **S0, S2, S3, S4** · **OD-1** |
| **DONE CONDITION** | Existe 1 relación · `UNIQUE` parcial rechaza multi-homing · los 8 casos de scope pasan contra DB real con actor real · unlink preserva la entidad · `planner_tasks.goal_id` deja de escribirse · **link Plan→componente nunca amplía visibilidad** |
| **HUMAN VALIDATION** | **Sí** — con **dos cuentas** del mismo household y **una cuenta de otro household**, para comprobar que nadie ve lo que no debe. |

---

## S6 — REQUIRED / OPTIONAL + LIFECYCLE + ARCHIVE
**ID:** `S6` · **PRIORITY: P0** · **BLOQUEA S7-S9: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Band plana Required/Optional sobre componentes con FK directo, vocabulario de lifecycle único, y Archive funcional y ortogonal. |
| **CURRENT** | `classification` en **4** tablas, duplicada en `planner_plan_requirements` y **coaccionada de forma no fiable** (el camino `changeset` puede divergir en silencio, `20260722090002:397`). El grafo (parent, ciclos, cross-plan, 4 índices únicos, trigger, recursión) está vivo. 3 vocabularios de lifecycle. `goal.archive` muerta. `reopen` borra `archived_at`. `resume` da 409 en Sistema B. |
| **TARGET** | `classification` en 1 lugar por componente (S5 la creó para Task/Event; measurements ya la tiene). Lifecycle único. Archive alcanzable y ortogonal. |
| **REAL GAP** | La bandRequired/Optional ya existe y es correcta; lo que sobra es el grafo que la duplica y la coacciona mal. |
| **ROOT CAUSES** | RC-010 · RC-011 · RC-017 · RC-018 · RC-008 |
| **FILES / AREAS** | **2 migraciones** · `services/planner.plans.service.js:140-149` (`structuralActions`) · `types/PlannerPlan.ts:4` · `services/planner/planStructureContract.ts:124-151,256-304` |
| **DB IMPACT** | (1) **Congelar** `planner_plan_requirements` y `planner_plan_milestones` en lectura (**no `DROP`**). (2) **Apagar** `planner_plan_recompute_automatic_milestones`: dejar de anular `completed_by_*` y eliminar el tope silencioso de 64 — **preservando** `lifecycle` y `completed_at` actuales. (3) Relajar `planner_plans_archive_terminal_only` ⇒ Archive en cualquier lifecycle. (4) Quitar `archived_at = null` del `reopen` (`20260722049000:282`). (5) Traducir el terminal `closed`→`cancelled` (**OD-2**) en CHECK + RPC + `availableActions`. (6) Añadir `plan.archive`/`plan.unarchive` a la matriz (si S2 no lo hizo). |
| **BACKEND IMPACT** | `availableActions` refleja el vocabulario único; se **quita** `'close'` y se usa `'cancel'`; Archive sale de la lista de acciones de lifecycle y pasa a ortogonal |
| **FRONTEND IMPACT** | `PlanLifecycle` único; quitar `'trash'` del union y modelarlo como bandera |
| **CROSS-MODULE IMPACT** | `planner_goals.status` (S11) |
| **DATA MIGRATION** | Traducción de vocabulario: con **0 filas** en `planner_plans` ⇒ **cero filas que traducir**. Si hay datos en remoto, la traducción `closed→cancelled` es un `UPDATE` dirigido **con reporte**, no un `DROP`. |
| **SECURITY / RLS** | Habilitar `plan.archive` es un cambio de autorización: **documentar** a quién se le da y por qué. Ninguna policy cambia. |
| **TESTS** | Los 4 tests de readiness de `p1_structure_contract_tests.ts:233-255` y los 10 escenarios de `p1_structure_database_tests.js:320-329` **deben migrarse** de "milestones/requirements" a "componentes". Nuevos: archive sin lifecycle terminal · reopen **no** desarchiva · `resume` funciona en ambos sistemas · `recompute` **no** invocado · `completed_by_*` preservado. |
| **RUNTIME VERIFICATION** | 1) Pause. 2) Resume ⇒ **sin 409**. 3) Complete con pendientes (debe pedir confirmación y no tocar hijos). 4) Cancel. 5) Reopen desde Completed **y** desde Cancelled. 6) Archive. 7) Unarchive. 8) Completar un Plan y comprobar que **ninguna** Task/Event/Measurement hijo cambió. 9) Pausar y comprobar que **ningún** hijo se pausó. |
| **MIGRATION RISK** | **Medio-Alto.** Toca CHECKs y funciones de 600-1500 líneas. **Mitigación: congelar antes de reescribir, y NO dropear el grafo en este slice.** |
| **ROLLBACK RISK** | **Medio.** Cada migración es un `CREATE OR REPLACE` revertsible por separado. |
| **PREREQUISITES** | **S0, S2, S5** · **OD-2, OD-3, OD-5** |
| **DONE CONDITION** | 1 vocabulario de lifecycle · Archive alcanzable por `adult` · Archive posible en lifecycle activo · Reopen no desarchiva · `recompute_automatic_milestones` no se invoca · `classification` en 1 lugar por componente · el grafo congelado y exportado |
| **HUMAN VALIDATION** | **Sí** — la matriz completa de lifecycle desde la app, incluyendo el caso "completar con pendientes" y comprobar que los hijos quedan intactos. |

---

## S7 — READINESS + FACTUAL PROGRESS (BACKEND)
**ID:** `S7` · **PRIORITY: P0** · **BLOQUEA S10: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Las 3 lecturas factuales (Tasks N/total · Events ocurridos/total · Measurements current/target) y Readiness, **derivadas en SQL**, sin porcentaje universal. |
| **CURRENT** | 7 contadores honestos **del dominio equivocado** (milestones + requirements, **cero** Task/Event). `%` universal sintetizado en JS (`attachProgress`). Lectura de **6 columnas inexistentes** (`planner.plans.v1.service.js:111-118`). 4 barras de `%` en frontend (2 alcanzables, **siempre vacías**). Readiness calculada **sólo en frontend**, con el gate autoritativo en DB y **sin endpoint**. Los external requirements **nunca** se satisfacen ⇒ bloquean para siempre. El activation gate nunca cuenta Task ni Event. Attention consulta literales **imposibles** (`blocked`, `review`). |
| **TARGET** | `planner_plan_indicators` reescrita con Task/Event/Measurement. RPC `read_planner_plan_readiness_rpc(uuid)`. Frontend **consume**, no recalcula. Cero `percentage`. |
| **REAL GAP** | **Ninguna de las 3 lecturas del Product Truth §10 existe hoy**, en ninguna capa. |
| **ROOT CAUSES** | RC-015 · RC-019 · RC-020 · RC-014 |
| **FILES / AREAS** | **1 migración** (vista + 1 RPC de lectura) · `services/planner.plans.service.js:242-266` · `services/planner.attention.service.js:238,269` · `services/planner/planStructureContract.ts:354-431` (deja de ser motor) · `screens/planner/PlannerPlanListScreen.tsx:199,206-211` · `screens/planner/PlannerPlanDetailScreenV1.tsx:415-437` · `screens/planner/GoalForm.tsx:195,304-305` |
| **DB IMPACT** | **1 migración**: `CREATE OR REPLACE VIEW planner_plan_indicators` con `task_total/task_completed/event_total/event_occurred/measurement_total/measurement_reached`, y **eliminar** `milestone_count`/`completed_milestone_count`/`*_requirement_count`. **Nuevo** `read_planner_plan_readiness_rpc(uuid)` con la forma de `projectCompletionReadiness`. **Sin escrituras.** |
| **BACKEND IMPACT** | DTO expone `progress:{tasks,events,measurements}` y `readiness:{canComplete,blockers[]}`. Attention: corregir las 2 queries muertas. Eliminar `attachProgress` del camino de Plan (el de Goals se retira en S11). |
| **FRONTEND IMPACT** | Las 4 barras de `%` desaparecen. `planStructureContract` pasa a presentador. |
| **CROSS-MODULE IMPACT** | Attention (badge de Home vía `useHomeDailySignals`) empieza a devolver ítems reales por primera vez ⇒ **el badge de Home puede cambiar de número**. Es el efectodesired, pero hay que avisarlo. |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | La vista es `security_invoker=true` y el RPC debe validar `planner_plan_can_read(id,false)`. **No** usar `SECURITY DEFINER` sin esa comprobación explícita (deuda S8/RC-036). |
| **TESTS** | `planner_p1_structure_database_tests.js` ampliado a las 3 lecturas fácticas contra DB real, con 1 Task completada/1 pendiente y 1 Event ocurrido/1 futuro. Test de que `grep percentage` no devuelve nada en superficies de Plan. Test de que Attention devuelve ítems **con datos reales** (hoy devuelve `[]` siempre). Test de que `readiness` es `READY` con Plan vacío (Product Truth §08) — **si OD-5 elimina el activation gate**. |
| **RUNTIME VERIFICATION** | 1) Abrir lista: cada Plan muestra progreso factual, sin %. 2) Detalle: Tasks N/5, Events N/3, Measurements $650k/$1M. 3) "Falta: Reservar hotel" o "Listo para completar". 4) Attention con un Plan Required pendiente ⇒ **aparece**. 5) Medir el badge de Home antes y después. |
| **MIGRATION RISK** | **Bajo.** Sólo lectura. |
| **ROLLBACK RISK** | Bajo |
| **PREREQUISITES** | **S0, S2, S5, S6** · **OD-5** |
| **DONE CONDITION** | Las 3 lecturas existen en backend · existe endpoint de readiness · `percentage` no aparece en ninguna superficie de Plan · Attention devuelve datos reales · el frontend no recalcula |
| **HUMAN VALIDATION** | **Sí** — comparar la lista y el detalle contra el Product Truth §10 y §08, literalmente. |

---

## S8 — MEASUREMENT SURFACE
**ID:** `S8` · **PRIORITY: P1** · **BLOQUEA Figma: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Que Measurement sea alcanzable desde la app: crear, editar, registrar valor, ver `targetReached`, historizar. |
| **CURRENT** | La capa de datos está **completa**: 7/7 campos del Product Truth §06, `classification`, historial append-only con corrección, `targetReached` en backend (JS **y** SQL). **0 filas.** **Ninguna superficie.** `PlannerPlanStructureEditScreen.tsx:17-28` sólo importa `planMilestoneEditor`. |
| **TARGET** | Editor de Measurement sobre la infraestructura de estructura que ya existe. |
| **REAL GAP** | La pieza más cercana al Target es la más sub-explotada. |
| **ROOT CAUSES** | RC-016 · RC-032 · RC-040 |
| **FILES / AREAS** | `services/planner/planMilestoneEditor.ts:73-128` (reparametrizar a `entityType:'measurement'`) · `screens/planner/PlannerPlanStructureEditScreen.tsx:17-28` (registrarlo) · `services/planner/planStructureContract.ts:488-496` (`deriveMeasurementIndicator` → `measurementProgress`) · `services/planner/plannerPlans.ts:1133-1143` (`measurementToSummary` ya existe) |
| **DB IMPACT** | **0**. Opcional: 1 CHECK de rango si OD lo decide (hoy no hay CHECK, y `planner_goals` sí lo tenía ⇒ divergencia a cerrar) |
| **BACKEND IMPACT** | `apply_planner_plan_structure_changeset_rpc` ya acepta `entityType:'measurement'` (`:371-381,391-399`) |
| **FRONTEND IMPACT** | Superficie completa de Measurement |
| **CROSS-MODULE IMPACT** | Ninguno |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | ConFORMME: measurement hereda el Plan (`can_read(plan_id,false)`), verificado. **Deuda a registrar:** el historial de una measurement trasteada sigue legible (S11 o ninguno). |
| **TESTS** | Crear / editar / registrar valor / ver `targetReached` / historia con `previous_value` / `correction_of_id`. **Y** el test que falla si el insert de historia usa `on conflict do nothing` (hoy `:405` descarta silenciosamente) y el que falla si no se escribe `previous_value` en el camino `changeset`. |
| **RUNTIME VERIFICATION** | Crear "Ahorro $650.000 / $5.000.000" · registrar 650000 · ver `targetReached=false` · registrar 5.000.000 · ver `targetReached=true` · comprobar **que el Plan NO se completa solo** (Product Truth §12) |
| **MIGRATION RISK** | **Ninguno** |
| **ROLLBACK RISK** | **Bajo.** Puramente aditivo. |
| **PREREQUISITES** | **S2, S5, S6** |
| **DONE CONDITION** | Crear, editar, registrar, historizar y ver `targetReached` desde la app. Measurement reached **no** completa el Plan. |
| **HUMAN VALIDATION** | **Sí** |

> **Este es el slice de menor riesgo y mayor retorno de todo el plan.** Es puramente aditivo (0 migraciones), reutiliza infraestructura que ya funciona, y **es el único que bloquea directamente la migración del frontend de Figma.**

---

## S9 — COMPLETION REAL (listar piezas abiertas)
**ID:** `S9` · **PRIORITY: P1** · **BLOQUEA S10: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Que completar un Plan **muestre qué queda** y pida confirmación, sin tocar ningún hijo. |
| **CURRENT** | El canónico **exige** `confirm_unresolved` si hay requirements raíz `necessary` insatisfechos (`:269-273`) pero **no lista Tasks ni Events abiertos**. `close` no verifica **nada**. `planner_goals.completeGoal` **cierra a ciegas** y devuelve `progress_percentage:100` hardcodeado. La cascada silenciosa de `recompute` es la única cascada de negocio del sistema. |
| **TARGET** | Product Truth §11 y §16: la hoja de cierre lista los hijos reales (Task pendiente, Event no ocurrido, Measurement no alcanzada) y ofrece "Dejarlas como están" / "Completar también estas tareas". **Sin cascada silenciosa.** |
| **REAL GAP** | El gate existe pero es ciego; y la cascada que sí existe está prohibida. |
| **ROOT CAUSES** | RC-008 · RC-019 · RC-020 |
| **FILES / AREAS** | **1 migración** (extender la verificación de `complete` para considerar componentes, no requirements) · `services/planner.plans.service.js:184-240` (el DTO ya trae todo) · `screens/planner/PlannerPlanDetailScreen.tsx` (hoja de cierre) |
| **DB IMPACT** | 1 migración, `CREATE OR REPLACE` de la rama `complete` del RPC. **Sin drop.** |
| **BACKEND IMPACT** | El DTO de readiness de S7 **es** la lista de piezas abiertas ⇒ **no hay trabajo adicional de backend** |
| **FRONTEND IMPACT** | La hoja de cierre muestra la lista real, no un número inventado (el `pending` hardcodeado del Figma audit era `plan.id === "p-mudanza" ? 25 : 1`) |
| **CROSS-MODULE IMPACT** | Ninguno |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | Sin cambios |
| **TESTS** | Completar con Task pendiente sin confirmar ⇒ error. Con `confirm_unresolved` ⇒ OK. **Y el test que falla si `recompute_automatic_milestones` es invocado** (ya existe `planner_m11_3a_database_tests.js:759` para Task/Event ⇒ extender a "ningún hijo"). **Y** verificar que `completed_by_*` de milestones se preserva. |
| **RUNTIME VERIFICATION** | 1) Plan con 2 Tasks pendientes. 2) Completar ⇒ **aparece la hoja con las 2 Tasks reales**. 3) "Dejarlas como están" ⇒ Plan Completed, **las 2 Tasks siguen pendientes**. 4) Volver a abrir ⇒ las Tasks siguen ahí, con su Plan. |
| **MIGRATION RISK** | Bajo |
| **ROLLBACK RISK** | Bajo |
| **PREREQUISITES** | **S6, S7** |
| **DONE CONDITION** | La hoja de cierre lista hijos reales · completar **no** modifica ningún hijo · `recompute` no se invoca |
| **HUMAN VALIDATION** | **Sí** — es el momento que más se acerca a la promesa de producto. Comprobarlo con cuidado. |

---

## S10 — CROSS-PLANNER CUTOVER
**ID:** `S10` · **PRIORITY: P1** · **BLOQUEA S11: YES**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Que Home, Trash, Attention, Activity y Deep links usen la autoridad canónica, y que la relación **no amplíe visibilidad** en ninguna de ellas. |
| **CURRENT** | **Divergencia de proyección**: Home→`planner_goals` (**y no renderiza el goal**), Search→`planner_plans` (correcto), Attention→`planner_plans` (2 de 4 fuentes muertas), Activity→`planner_activity_log` (**sin `plan`** en el CHECK, y **sin filtro de privacidad**), Trash→`planner_goals` **con `supabaseAdmin`** y **`planner_plans` ausente**, Deep links→`planner_plans` (destino correcto, id equivocado). |
| **TARGET** | Las 6 superficies leen `planner_plans`. `supabaseAdmin` fuera de Trash. Privacy simétrica. |
| **REAL GAP** | La privacidad es asimétrica entre Attention y Activity (**`NEW` RC-039**), y `planner_activity_log.household_id NOT NULL` impide registrar Events/Planes personales (**RC-038**). |
| **ROOT CAUSES** | RC-013 · RC-014 · RC-022 · RC-024 · RC-029 · RC-038 · RC-039 |
| **FILES / AREAS** | `services/planner.summary.service.js:227-234,371-379` · `services/planner.trash.service.js:63-195` · `services/planner.activity.service.js:90-207` · `controllers/planner.activity.controller.js:53-55,95-119` · `screens/home/HomePlannerSections.tsx` · `screens/planner/PlannerTrashScreen.tsx:117-138` · `services/planner/plannerDeepLink*` |
| **DB IMPACT** | **1-2 migraciones**: corregir `planner_goals_select_visible` para filtrar `trashed_at`; hacer `household_id` nullable en `planner_activity_log` **o** no registrar Activity para entidades personales; añadir `'plan'` a `ALLOWED_ENTITY_TYPES` y al CHECK. |
| **BACKEND IMPACT** | Home: leer `planner_plans` y **renderizar** el Plan (hoy `HomeSummaryGoal` es tipo muerto). Trash: incluir `planner_plans`, quitar `supabaseAdmin`. Activity: aplicar el filtro de privacidad que Attention sí aplica. |
| **FRONTEND IMPACT** | Trash restaura `planner_plans`. Home muestra el Plan. |
| **CROSS-MODULE IMPACT** | **Este slice ES la integración cross-Planner.** |
| **DATA MIGRATION** | `planner_activity_log.entity_type='goal'` → `'plan'` (**1 fila**). **Sin `DELETE`.** |
| **SECURITY / RLS** | **P0.** (1) **`trash_goal_rpc` es P0 y se arregla aquí o en un slice de seguridad propio** (ejecutable por `anon`, `SECURITY DEFINER`, sin capability, con `p_member_id` del llamante). (2) **`planner_legacy_goal_plan_projection` es auto-updatable con `arwdDxtm` para `anon`** ⇒ **verificar en runtime si permite escribir y, si sí, revocar a `SELECT`.** (3) Eliminar `supabaseAdmin` de Trash. (4) Privacy simétrica Attention/Activity. (5) Verificar que un Plan personal no filtra nada por las 6 superficies. |
| **TESTS** | Privacy contra DB real con 2 households · Trash round-trip del sistema canónico · Activity con filtro de privacidad · Home renderiza el Plan · Deep link abre el Plan correcto · **test de seguridad que falle si `anon` tiene EXECUTE sobre cualquier RPC de escritura de Plan/Goal** |
| **RUNTIME VERIFICATION** | Las 17 comprobaciones del PHASE 14 del encargo, ahora **todas** ejecutables: Planes, crear, lista, detalle, refresh, editar, pause/resume, complete, cancel/reopen, archive, trash/restore, Task sin Plan, Task relacionada, Event independiente, Search, Home, Attention |
| **MIGRATION RISK** | **Medio** — son 6 superficies. **Mitigación: feature flag por superficie, una a la vez, cada una con su test.** |
| **ROLLBACK RISK** | Medio. Mitigado por los flags. |
| **PREREQUISITES** | **S3, S5, S6, S7, S9** |
| **DONE CONDITION** | Las 6 superficies leen `planner_plans` · `planner_plans` aparece en Trash y se restaura · `supabaseAdmin` fuera de Trash · `anon` sin EXECUTE sobre ningún RPC de escritura · privacy simétrica · Home renderiza el Plan |
| **HUMAN VALIDATION** | **Sí** — con dos cuentas de households distintos, para comprobar la no-visibilidad cruzada. |

---

## S11 — SECURITY DEBT + LEGACY RETIREMENT + DATA EXPORT
**ID:** `S11` · **PRIORITY: P1 (con un P0 dentro)** · **BLOQUEA nada: NO**

> **Se hace al final a propósito.** Los hallazgos de seguridad de S10 se resuelven **allí**, donde ya se toca el servicio transversal y las policies. Este slice **no puede** hacer `DROP` de nada: primero exporta, congela y verifica.

| Campo | Valor |
|---|---|
| **OBJECTIVE** | (a) Cerrar la deuda de seguridad acumulada. (b) Exportar todo lo retirable a archivo frío. (c) Congelar legacy. (d) **Borrar** sólo después de un ciclo completo sin incidentes. |
| **CURRENT** | 2 tablas + 2 de milestones + 2 de grafo + `planner_tasks.goal_id` + `status` + `progress_mode` + `deleted_at` + `failed_at` + 17 endpoints + 4 pantallas muertas + 2 clients duplicados + 33 archivos de test muertos + 3 P0 de seguridad abiertos. `planner_m11_3a_legacy_compatibility_report` declara `automaticBackfillSafe:false` y `visualGoalRetirementReady:false`. |
| **TARGET** | Export verificado. Legacy congelado. Cero código muerto. Deuda de seguridad cerrada. |
| **REAL GAP** | El legacy está vacío (1 fila), así que el coste es **de limpieza, no de datos**. |
| **ROOT CAUSES** | RC-007 · RC-021 · RC-022 · RC-023 · RC-024 · RC-025 · RC-027 · RC-028 · RC-029 · RC-030 · RC-033 · RC-034 · RC-035 · RC-036 · RC-040 · RC-042 |
| **FILES / AREAS** | `supabase/migrations/**` (nuevas) · `services/planner.goals.service.js` completo · `services/planner.plans.v1.service.js` completo · `services/planner.trash.service.js` · `screens/planner/{GoalDetailScreen,PlannerGoalsScreen,EditGoalScreen,PlannerPlansScreen}.tsx` · `services/plannerGoals.ts` · `services/plannerPlansV1.ts` · `tests/planner_*.test.js` (8) · `scripts/planner_*` DEAD (25) · `supabase/migrations/20260713003000:129-175` (`trash_goal_rpc`) · `planner_legacy_goal_plan_projection` |
| **DB IMPACT** | **(0a) Seguridad, 3 migraciones:** `trash_goal_rpc` → añadir guard `authenticated actor required` + `can_update_planner_goal` + `revoke execute … from public, anon`; revocar `arwdDxtm` en las 2 vistas a `anon`/`authenticated` (dejar `SELECT`); revocar `PUBLIC` EXECUTE de `write_planner_plan_graph_rpc` (el guard de `:75` se queda como defensa). **(0b) Export:** `planner_plan_requirements` (incl. `parent_requirement_id`) y `planner_plan_milestones` (incl. `classification`, `completed_by_*`) a CSV/JSON **antes** de congelar. **(0c) Congelar:** `planner_goals`, `planner_goal_milestones`, `planner_plan_milestones`, `planner_plan_requirements`, `planner_plan_manual_conditions` ⇒ revocar `INSERT/UPDATE/DELETE` a `authenticated`. **(0d) Backups:** `planner_goals`, `planner_goal_milestones`, `planner_tasks.goal_id` (valor previo), `planner_goals.status`, `failed_at`. **(0e) `DROP`:** sólo en un ciclo posterior, uno por uno, cada uno con su reporte de orphans. |
| **BACKEND IMPACT** | Borrar 2 services completos + 17 endpoints + 6 endpoints de milestones |
| **FRONTEND IMPACT** | Borrar 4 pantallas muertas + 2 tipos + 1 client duplicado + 8 tests muertos |
| **CROSS-MODULE IMPACT** | `planner.tasks.service` deja de validar `goal_id`; `inventory.service.js` no se toca |
| **DATA MIGRATION** | **Export primero. `DROP` después. Nunca al revés.** Con `planner_plan_legacy_goal_links` como lista exacta de qué se copió en S3. |
| **SECURITY / RLS** | **El P0 (`trash_goal_rpc`) se cierra AQUÍ si no se cerró en S10.** Los otros dos P1 (`projection` auto-updatable, `PUBLIC` EXECUTE) se cierran aquí si no en S10. Los P2 (`FORCE ROW LEVEL SECURITY` ausente, `can_mutate` sin `trashed_at`, policy de history) se **documentan** como deuda con issue, no se arreglan en este lote. |
| **TESTS** | Test que falle si algún RPC de escritura de Plan/Goal es ejecutable por `anon`. Test que falle si `planner_goals` recibe escrituras. Test que falle si `progress_mode` existe en el esquema tras el `DROP`. **Los 8 `tests/planner_*.test.js` y los 25 `scripts/planner_*` DEAD se borran** — salvo los que S0 haya cableado. |
| **RUNTIME VERIFICATION** | 1) Trash: mover un Plan, comprobar que aparece en la papelera, restaurarlo. 2) Con una cuenta de otro household, comprobar que no aparece. 3) `select has_function_privilege('anon','trash_goal_rpc','EXECUTE')` = false. |
| **MIGRATION RISK** | **El más alto del plan**, por ser el único que hace `DROP`. **Mitigación: split en S11a (seguridad + export + congelar) y S11b (`DROP`), con un ciclo completo de producción entre ambos.** |
| **ROLLBACK RISK** | **Alto en S11b, y no reversible.** Por eso S11b exige: export verificado, ciclo completo sin incidentes, y aprobación humana explícita. |
| **PREREQUISITES** | **S10** · **OD-4, OD-6, OD-7** |
| **DONE CONDITION** | 3 P0 de seguridad cerrados · export verificado (reproducible desde el archivo) · legacy congelado · `progress_mode`/`target_type`/`status`/`deleted_at`/`failed_at`/`planner_tasks.goal_id`/`finalization_kind` eliminados · 0 código muerto · `planner_m11_3a_legacy_compatibility_report` devuelve `visualGoalRetirementReady: true` |
| **HUMAN VALIDATION** | **Sí, y explícita antes de cualquier `DROP`.** |

---

## S12 — FULL QA MATRIX
**ID:** `S12` · **PRIORITY: P1** · **BLOQUEA nada: NO**

| Campo | Valor |
|---|---|
| **OBJECTIVE** | Que exista un test por cada capacidad del Product Truth, cableado a `quality`, y que la matriz del Discovery §14.10 quede completa. |
| **CURRENT** | `quality` corre 2 superficies de Plan. `planner_v1_frontend_plans_tests.ts` cubre lifecycle **sólo como string de write** (`buildPlanLifecycleWrite`), sin persistir. **`Task unlink` y `Event unlink`: 0 tests** (`grep unlink` en los 27 wired = 0). **`Measurement create`/`update`: 0 tests**. **`Activity`: 0 tests**. **Attention: el archivo real está NOT WIRED.** `Archive` nunca prueba el 403. `Resume` nunca prueba el 409. La única red DB de Plan estaba huérfana (arreglado en S0). |
| **TARGET** | Las 28 capacidades con test, `quality` verde y sin skips. |
| **REAL GAP** | La cobertura existente es de **pure functions y fixtures**, no de persistencia. |
| **ROOT CAUSES** | RC-026 |
| **FILES / AREAS** | `scripts/planner_*` · `tests/run.js` · `package.json` · `scripts/planner_p1_structure_database_tests.js` |
| **DB IMPACT** | Ninguno (sólo lectura) |
| **BACKEND IMPACT** | Ninguno |
| **FRONTEND IMPACT** | Ninguno |
| **CROSS-MODULE IMPACT** | Ninguno |
| **DATA MIGRATION** | No aplica |
| **SECURITY / RLS** | Tests de los 8 casos de scope de §12.2 **con actor real** (JWT), no con `postgres`. |
| **TESTS** | Las 28 filas de §14.10, cada una marcada WIRED + TRUSTWORTHY. Regla nueva: **un test de Plan que no toca persistencia real se marca `UNTRUSTWORTHY` y no cuenta como cobertura.** |
| **RUNTIME VERIFICATION** | `npm run quality` verde y sin `SKIPPED`; `node tests/run.js planner` verde; `HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 npm run test:db` verde |
| **MIGRATION RISK** | Ninguno |
| **ROLLBACK RISK** | Ninguno |
| **PREREQUISITES** | **Todos** |
| **DONE CONDITION** | Las 28 capacidades con test cableado y confiable · `quality` verde · 0 `SKIPPED` |
| **HUMAN VALIDATION** | **Sí** |

---

## 3. MATRIZ DE PRIORIDADES

| Slice | P | Bloquea siguiente | Riesgo de migración | Reversible |
|---|---|---|---|---|
| **S0** Verification gate | **P0** | **S1-S12** | — | Sí |
| **S1** Route authority | **P0** | S2+ | Ninguno | Sí |
| **S2** Contract + `plan.*` | **P0** | S3+ | 1 migración de función | Sí |
| **S3** Persistence + cutover | **P0** | S4-S11 | **1 fila + copia dirigida** | Sí |
| **S4** Create/Edit canónico | **P0** | S5+ | Ninguno | Sí |
| **S5** Component relation | **P0** | S6-S9 | **Tabla nueva (aditiva)** | Sí (`DROP TABLE`) |
| **S6** Required/Optional + lifecycle | **P0** | S7-S9 | CHECKs + funciones largas | Medio |
| **S7** Progress + Readiness | **P0** | S10 | Sólo lectura | Sí |
| **S8** Measurement surface | **P1** | **Figma** | **Ninguno** | Sí |
| **S9** Completion real | P1 | S10 | 1 `CREATE OR REPLACE` | Sí |
| **S10** Cross-planner cutover | P1 | S11 | 1-2 migraciones | Sí (flags) |
| **S11** Security + legacy retirement | P1 (**P0 dentro**) | — | **El más alto** | **NO en S11b** |
| **S12** Full QA matrix | P1 | — | Ninguno | Sí |

**P0: 7 · P1: 6 · Total: 13**

---

## 4. DEPENDENCIAS DE DATOS QUE BLOQUEAN

| # | Bloqueador | Estado | Quién lo resuelve |
|---|---|---|---|
| **B1** | **`planner-current` en detached HEAD** | **ABIERTO** | Propietario del repo. **Ningún commit es mergeable hasta que se fije una rama.** |
| **B2** | `count(*)` en el proyecto Supabase **remoto** | **ABIERTO (OD-7)** | Propietario. **S3 y S11 no se pueden autorizar sin esto.** El dato local (todo vacío) **no es evidencia de producción** |
| **B3** | Nombre del terminal (`closed` vs `cancelled`) | **ABIERTO (OD-2)** | Propietario |
| **B4** | ¿Archive totalmente ortogonal? | **ABIERTO (OD-3)** | Propietario |
| **B5** | ¿Activation gate sigue siendo umbral duro? | **ABIERTO (OD-5)** | Propietario |
| **B6** | ¿`create_goal` debe quedar implementado? | **ABIERTO (OD-8)** | Propietario |
| **B7** | Runtime de la app para verificar PHASE 14 | **ABIERTO** | El dev server corre en **otro worktree**. Hace falta una sesión de app en `planner-current` para ejecutar S1 y S4 |
| **B8** | Validación de si `planner_legacy_goal_plan_projection` es explotable | **ABIERTO** | Requiere runtime con escritura controlada. **No se ejecuta sin autorización** |
| **B9** | `planner_tasks.goal_id` FK no compuesto | **Registrado (RC-042)** | Decisión: ¿se acepta como deuda? Afecta sólo a Goals, que se retiran en S11 |

---

## 5. RECOMENDACIÓN DE PRIMER SLICE

**Slice técnico: `S0` — Verification Gate.**
No es "un extra de calidad". Hoy `quality` **aborta en el comando 2 de 18**, así que **no existe ninguna evidencia自动化 disponible**, y cualquier slice posterior se verificaría contra nada. Cuesta ~1 día, no toca producto, y es un commit aislado.

**Slice de valor: `S8` — Measurement Surface.**
0 migraciones, puramente aditivo, reutiliza infraestructura que ya funciona, y es **el único que bloquea directamente la migración del frontend de Figma**.

**Slice que repara el defecto que el usuario ve: `S1` — Route & Navigation Authority.**
Sin tocar DB, sin tocar datos, un commit reversible, y elimina la clase de bug "el id cruza de tabla".

**Si hubiera que elegir dos: `S0` y `S1`.**

---

## 6. GATE FINAL

```
FINAL GATE: BLOCKED — esperando aprobación humana
```

**Motivos verificables:**

1. **`OWNER DECISION` abiertos: 8.** Los tres bloqueantes son OD-1 (autoridad), OD-2 (terminal), OD-3 (archive). Sin ellos, S2 en adelante no se puede diseñar sin suposiciones.
2. **Worktree en detached HEAD.** No hay autoridad de rama donde landedear. **Ningún commit sería mergeable.**
3. **Dos bloqueadores de datos sin resolver:** `count(*)` en remoto (OD-7) y disponibilidad de runtime de la app en este worktree (B7).
4. **Un P0 de autorización sin corregir** (`trash_goal_rpc` ejecutable por `anon`) que **ya está en producción** y no depende de Plans. Debe reportarse aparte, con su propio ritmo.
5. **El gate de verificación está rojo.** Sin S0, nada de este plan es verificable.

**Lo que SÍ está confirmado y no depende del gate:**
- El inventario completo (2 tablas, 3 familias de ruta, 4 vocabularios, 3 tipos frontend).
- La ruptura de espacio de IDs, **`RUNTIME VERIFIED`** (la RPC devuelve NULL).
- La ausencia de cascada de completion a Task/Event.
- La ausencia de auto-completion (correcto respecto al Target).
- Measurement completo en backend e **inalcanzable en producto**.
- Los 8 casos de privacy de §12.2, con 5 conformes y 3 gaps de modelo.
- El dominio Plan **vacío** en la DB local (11 `UNKNOWN` resueltos).
- Los 3 P0 de seguridad abiertos.
- **La DB local no es producción**, y este plan **no** está autorizado para migrar datos reales hasta tener los conteos de remoto.

---

## 7. LO QUE ESTE PLAN NO HACE

- **No reabre Product Truth.** §19 (Milestone fuera), §20 (fuera de alcance) y §22 (frontera de Planner) se respetan tal cual.
- **No rediseña Tasks ni Calendar.** `planner_tasks` y `planner_events` **no se alteran** en ninguna columna.
- **No crea una tercera autoridad permanente.** La relación de S5 **es** la autoridad única; `goal_id` y la rama `external` de requirements quedan read-only.
- **No implementa Milestones, Requirements, Manual Conditions, progress modes, porcentaje universal, participantes de Plan, Gantt ni dependencias.**
- **No borra nada sin export previo y un ciclo completo.**
- **No toca Figma.**

**Archivos escritos por la sesión de planificación (únicos):**
- `PLANS_RECONSTRUCTION_DISCOVERY_V1.md`
- `PLANS_RECONSTRUCTION_PLAN_V1.md`

**Nada más fue creado, modificado, commiteado, movido ni borrado.**