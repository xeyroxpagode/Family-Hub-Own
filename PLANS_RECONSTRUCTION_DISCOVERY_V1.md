# PLANS · RECONSTRUCTION DISCOVERY V1

**Tipo de documento:** descubrimiento técnico READ-ONLY. **NO autoriza implementación. NO escribe migraciones. NO modifica DB, backend, frontend, tests, env ni documentos existentes.**
**Worktree auditado:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
**HEAD auditado:** `79f877f152072e759c11511bd91807273c4e1c13`
**Fecha de la sesión:** 2026-10-02
**Producto authority:** `C:\Users\thega\Downloads\PLANS_PRODUCT_TRUTH_V1_AND_FIGMA_AUDIT.md` (CLOSED, no reabierto)
**Input audit:** `C:\Users\thega\Desktop\Documentos-de-planner-historicos\PLANS_RUNTIME_CURRENT_TO_TARGET_AUDIT_V1.md`
**Documento hermano:** `PLANS_RECONSTRUCTION_PLAN_V1.md`

> Documento largo por diseño: es el registro de evidencia completo. Cada afirmación tiene etiqueta y `file:line`. Ninguna conclusión se acepta por herencia de un documento previo.

---

## 0. MÉTODO Y ETIQUETAS

| Etiqueta | Significado |
|---|---|
| `STATIC CONFIRMED` | Evidencia directa en archivo o migración, con `file:line`, re-leída en esta sesión |
| `RUNTIME VERIFIED` | Observado contra la DB local real (Supabase local `127.0.0.1:56222`), sólo con `SELECT` y funciones de lectura |
| `NOT FOUND` | Buscado explícitamente, ausente |
| `INFERRED` | Conclusión razonada, no observación |
| `INCONCLUSIVE` | La sonda se ejecutó pero su resultado no discrimina |
| `BLOCKED` | No verificable sin violar la regla READ-ONLY |
| `NEW` | Hallazgo **ausente** del input audit |
| `CHANGED` | El input audit dijo otra cosa y el código/DB actual difiere |
| `REFUTED` | El input audit lo afirmó y el código/DB actual lo contradice |

---

## 1. PHASE 0 — PREFLIGHT

| Ítem | Valor | Verificación |
|---|---|---|
| Path real | `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current` | `git rev-parse --show-toplevel` |
| Branch | **`(detached HEAD)`** | `git rev-parse --abbrev-ref HEAD` → `HEAD` |
| HEAD | `79f877f152072e759c11511bd91807273c4e1c13` | `git rev-parse HEAD` |
| `git status --short` | **vacío (0 líneas)** | working tree clean |
| Dirty preexistentes | **ninguno** | |
| Stash preexistente | **1** — `stash@{0}: On homecloud/v2-latest-base: temp-eas-relink-before-worktree-move` | **NO TOCADO** |
| Base local | `homecloud/v2-latest-base` @ `82997ad` | |
| Base remota | `origin/homecloud/v2-latest-base` @ **`79f877f`** | coincide con HEAD |
| HEAD vs base local | **4 commits por delante** | `git rev-list --left-right --count` → `4  0` |
| `git branch --contains HEAD` | `homecloud/v2-latest-base`, `remotes/origin/homecloud/v2-latest-base` | |

### 1.1 DEVIATION 1 — detached HEAD
`HEAD` no pertenece a ninguna rama local. **No se corrigió** (regla absoluta). Se reporta.
**Consecuencia:** no hay autoridad de rama donde landedear. Cualquier commit queda huérfano. **No se creó ninguna rama ni worktree.**

`CHANGED` vs input audit: aquel decía "1 commit por detrás de `homecloud/v2-latest-base` @ `2482a50`". Hoy la rama local está en `82997ad` y HEAD está **4 commits por delante** y **coincide con el tip remoto**.

### 1.2 DEVIATION 2 — la autoridad Product Truth sí existía
`PLANS_PRODUCT_TRUTH_V1_AND_FIGMA_AUDIT.md` **NO EXISTE** en la carpeta histórica ni en las worktrees. **EXISTE** en `C:\Users\thega\Downloads\` (17 499 B, 2026-10-01 16:20). Leído **completo** (1 076 líneas). Referencia cruzada que lo confirma: `PLANS_FIGMA_AUDIT_V1.md:6`.
**El input audit (§2.3) afirmó que no existía** y reconstruyó el Target desde `PLANS_SOURCE_MAP_V1.md`. Esa reconstrucción era innecesaria.

### 1.3 Validación del Product Truth contra el Target del input audit
El Target congelado en `PLANS_RUNTIME_CURRENT_TO_TARGET_AUDIT_V1.md §3.2` se comparó punto por punto con `PLANS_PRODUCT_TRUTH_V1_AND_FIGMA_AUDIT.md §03-§22`:
componentes (Tasks/Events/Measurements) · Required/Optional plano · Readiness derivado · Progress factual · Completion explícito · Lifecycle Active/Paused/Completed/Cancelled + Reopen · Archive ortogonal · Trash/Restore · Visibility (nunca amplía) · sin Plan Participants · Milestone retirado · lista de fuera-de-alcance §20 · Plan vacío válido §18 · §09 Event Required · §12 Measurement alcanzada ≠ Plan completed.
**Sin contradicciones. Sin reaperturas. Product Truth no se modifica.**

### 1.4 DEVIATION 3 — layout real del frontend
No existe `front/mi-front-limpio/src/`. Los paths reales son `front/mi-front-limpio/{navigation,screens,services,types,components,context}/…`. Todos los `file:line` de este documento usan paths reales.

### 1.5 Preservación del dirty state
**CERO archivos de código, DB, backend, frontend, tests, env, migraciones ni documentos existentes fueron modificados.** Los únicos archivos escritos son los dos documentos nuevos de esta sesión (untracked). Ningún `git add/commit/push/reset/clean/stash/switch/checkout/merge/rebase`. Ningún `supabase db reset`/`db push`. Ningún SQL de mutación.

---

## 2. PHASE 1 — CURRENT PLAN AUTHORITY

**Resultado: 2 tablas · 3 sistemas de servicio/ruta · 4 vocabularios de lifecycle · 3 familias de tipos frontend. `CONFIRMED CURRENT`.**

### 2.1 LISTA — el tab "Planes"

| Campo | Valor real |
|---|---|
| SCREEN | `PlannerScreen` raíz del tab, sub-tab `plans`, label `"Planes"` — `screens/planner/PlannerScreen.tsx:787` (label `:806`) |
| CLIENT | `listPlansV1` — `screens/planner/PlannerPlanListScreen.tsx:64` (def `:57-71`) |
| ROUTE | `GET /api/planner/v1/plans` — `services/plannerPlansV1Frontend.ts:42-46`; server `backend/src/routes/planner.v1.js:6` |
| CONTROLLER | `listPlans` — `controllers/planner.plans.v1.controller.js:25` |
| SERVICE | `listPlans` — `services/planner.plans.v1.service.js:191` |
| RPC | ninguno (SELECT directo) |
| **TABLE** | **`planner_goals`** — `planner.plans.v1.service.js:194` |
| ID SPACE | `planner_goals.id` (`202607080004:6`) |
| DTO | `toPlanDto` — `planner.plans.v1.service.js:111-137` |
| TYPE | `PlannerPlanV1` — `types/PlannerPlanV1.ts:22-39`; `PlanLifecycle` `:5-10` |

El tab raíz registrado es `PlannerScreen` (`HomeTabNavigator.tsx:192`), **no** `PlannerPlansScreen`. `PlannerPlanListScreen` está registrada como ruta `'PlanList'` (`:201`) pero **nadie navega a ella**: se monta inline desde `PlannerScreen.tsx:787`. `PlannerPlansScreen` **no está registrada en absoluto** → código muerto.

### 2.2 CREATE — el botón "Crear plan"

| Campo | Valor real |
|---|---|
| SCREEN | `PlannerPlanListScreen.tsx:88-90` (ícono `:139`, empty-state `:149-150`) |
| CLIENT | `navigation.navigate(ROUTE_NAMES.PlanCreate)` — `:89` |
| ROUTE | React-Nav `'CreateGoal'` (`plannerNavigationContract.ts:151`); HTTP `POST /api/planner/goals` (`routes/planner.js:124`) |
| CONTROLLER | `createGoal` — `controllers/planner.goals.controller.js:49` |
| SERVICE | `createGoal` — `services/planner.goals.service.js:377` |
| RPC | ninguno |
| **TABLE** | **`planner_goals`** — insert en `planner.goals.service.js:406` |
| ID SPACE | `planner_goals.id` |
| DTO | request `CreatePlannerGoalInput` `:388-403`; respuesta = **fila cruda + `progress_percentage`** inyectado por `attachProgress` (`:186-220`) |
| TYPE | `PlannerGoal` — `services/plannerGoals.ts:29-61` |

`NEW`: `createGoal` **no escribe `lifecycle`** (`:388-403`) ⇒ toda fila creada por la UI nace en el default DB `'preparation'` (`20260908000001:21-22`), nunca en `active`. `GoalForm.tsx:475` navega igual a `'GoalDetail'` con ese id de `planner_goals`.

**Create alternativo (inalcanzable):** `PlannerSheetHost.tsx:391,465` → `POST /api/planner/plans` → `write_planner_plan_graph_rpc` → **`planner_plans`**. Bloqueado por `create_goal → implemented: false` (`plannerQuickActions.ts:126`) + filtro `QuickActionsMenu.tsx:98`.
**`NEW`: en la app actual no existe ningún camino de usuario que escriba `planner_plans`.**

### 2.3 DETAIL — el defecto P0, ahora RUNTIME VERIFIED

| Campo | Valor real |
|---|---|
| SCREEN | `PlannerPlanDetailScreen` (canónica) — `HomeTabNavigator.tsx:199` |
| CLIENT | `openPlan` `PlannerPlanListScreen.tsx:81-86`; carga `getCanonicalPlanGraph` `PlannerPlanDetailScreen.tsx:53` |
| ROUTE | React-Nav `ROUTE_NAMES.PlanDetail` = **`'GoalDetail'`** (`plannerNavigationContract.ts:144`); HTTP `GET /api/planner/plans/:id` (`services/planner/plannerPlans.ts:349-352`; server `routes/planner.js:71`) |
| CONTROLLER | `getPlanGraph` — `controllers/planner.plans.controller.js:93` |
| SERVICE | `getPlanGraph` — `services/planner.plans.service.js:259` |
| RPC | **`read_planner_plan_graph_rpc`** — `:260` |
| **TABLE** | **`planner_plans`** — el RPC lee `public.planner_plans` (`20260722040000:1544`) |
| ID SPACE | **`planner_plans.id`** (`20260722040000:14`) |
| DTO | `toPlanGraphDto` — `planner.plans.service.js:184-240` |
| TYPE | `PlannerPlanGraphDto` — `types/PlannerPlan.ts:136-144` |

**`RUNTIME VERIFIED`:**
```
SELECT public.read_planner_plan_graph_rpc('22f53d7f-f535-4548-b70b-86a45d020c1c')
  → IS NULL = true
```
El `planner_goals.id` real **no existe** en `planner_plans` ⇒ el RPC devuelve `NULL` ⇒ `planner.plans.service.js:264` devuelve `404 not_found`.
El input audit (§1.3) marcó esto `INFERENCIA` sobre la observación runtime. **Esta sesión lo eleva a `RUNTIME VERIFIED` en la capa SQL.**

### 2.4 EDIT
`PlannerPlanStructureEditScreen` (`HomeTabNavigator.tsx:198,200`) → `POST /api/planner/plans/:id/structure` (`plannerPlans.ts:413`) → `applyPlanStructureChangeset` (`planner.plans.controller.js:158`) → `planner.plans.service.js:324` → RPC `apply_planner_plan_structure_changeset_rpc` (`:326`). Tablas `planner_plans` / `planner_plan_*`. DTO `PlanStructureChangeset` (`plannerPlans.ts:222-226`).
**No existe "editar Plan" sobre `planner_goals`.** `EditGoalScreen.tsx:4` existe pero no está registrado ni importado.

### 2.5 LIFECYCLE

| | Ruta A — detail canónico | Ruta B — detail V1 |
|---|---|---|
| SCREEN | `PlannerPlanDetailScreen.handleLifecycle` `:65-151` | `PlannerPlanDetailScreenV1.handleTransition` `:114-152` |
| CLIENT | `buildPlanLifecycleWrite` `plannerPlans.ts:504-521` | `transitionPlanV1` `:130` |
| ROUTE | `POST /api/planner/plans/:id/mutations` | `POST /api/planner/v1/plans/:id/transition` |
| CONTROLLER | `writePlanGraph` `planner.plans.controller.js:103` | `transitionPlan` `planner.plans.v1.controller.js:114` |
| SERVICE | `planner.plans.service.js:277` | `planner.plans.v1.service.js:387` |
| RPC | `write_planner_plan_graph_rpc` | **ninguno** (UPDATE directo `planner_goals:466-478`) |
| TABLE | **`planner_plans`** | **`planner_goals`** |
| Verbos | `planner.plans.service.js:14-25`: `activate, pause, resume, complete, close, reopen, archive, unarchive, trash, restore` | `planner.plans.v1.service.js:29-35` |

**`resume` → 409. `STATIC CONFIRMED`** (función pura determinista, `:101-108`): `paused → ['active','completed','cancelled']` (`:32`) **no incluye `'resume'`**, pero el handler `case 'resume':` existe en `:404` y la UI lo ofrece (`PlannerPlanDetailScreenV1.tsx:242-249`). El input audit lo marcó `INFERENCIA`; se eleva.
**No aplica a la ruta canónica**: `write_planner_plan_graph_rpc` sí soporta `resume` (`20260722049000:264-266`), verificado contra la DB local.

### 2.6 ARCHIVE / UNARCHIVE
Sin endpoint dedicado. Transiciones dentro de `POST /plans/:id/mutations` (canónico) y `POST /v1/plans/:id/unarchive` (V1 → `planner.plans.v1.service.js:630`, tabla `planner_goals:653`).
`ROUTE_NAMES.PlanArchive='PlannerPlanArchive'` (`plannerNavigationContract.ts:161`) **no registrado**, nadie navega. `unarchivePlanV1` (`plannerPlansV1Frontend.ts:144-161`) tiene **0 llamadores fuera de su módulo**.
Exposición al cliente vía `availableActions` = `structuralActions` (`planner.plans.service.js:140-149`): en `completed`/`closed` devuelve `[archive|unarchive, reopen, trash]`.

### 2.7 TRASH / RESTORE

| Paso | Ruta | Service | TABLE | RPC |
|---|---|---|---|---|
| Trash canónico | `POST /plans/:id/mutations` | `planner.plans.service.js:277` | `planner_plans` | `write_planner_plan_graph_rpc` |
| Trash V1 | `POST /v1/plans/:id/trash` | `planner.plans.v1.service.js:512` | `planner_goals` | ninguno (UPDATE `:531-535`) |
| Listar papelera | `GET /api/planner/trash` | `planner.trash.service.js:202` | goals + goal_milestones + tasks + events | ninguno |
| Restore | `POST /goals/:id/restore` | `planner.goals.service.js:736` | `planner_goals` | **`restore_goal_rpc`** (`:738`) |

**`planner_plans` está AUSENTE de la papelera.** `planner.trash.service.js` usa el **cliente del actor** para tasks (`:6`) y events (`:35`), y **`supabaseAdmin`** para goals (`:69,125,136,139,195`) y goal_milestones (`:88-89,132-133`). `PlannerTrashScreen.tsx:117-138` restaura `task`, `event`, `goal`, `milestone`. **Un Plan canónico trasteado es invisible e irrecuperable desde la UI.** `CONFIRMED CURRENT`.

### 2.8 Familias de tipos frontend

| Familia | Archivo | Lifecycle union | Rasgo |
|---|---|---|---|
| Canónica | `types/PlannerPlan.ts:4` | `'draft'\|'active'\|'paused'\|'completed'\|'closed'\|'trash'` | `trash` sintético; `objective`; `availableActions` |
| Plan-V1 | `types/PlannerPlanV1.ts:5-10` | `'preparation'\|'active'\|'paused'\|'completed'\|'cancelled'` | `progress?: {percentage, tasks, milestones}` `:22-39` |
| Goals | `services/plannerGoals.ts:4` | **sin `lifecycle`**; `PlannerGoalStatus='active'\|'completed'\|'closed'` | snake_case, 30 campos, sin `lifecycle`/`target_date`/`archived_at` en el tipo |

`types/database.ts`: **NOT FOUND** — sin definiciones `planner_plan*` ni `planner_goal*`.

### 2.9 Cliente duplicado muerto
`services/plannerPlansV1.ts:28-149` replica `plannerPlansV1Frontend.ts:42-187`. **0 importadores.** `CONFIRMED CURRENT`.

### 2.10 Mapa de rutas — qué ejecuta realmente cada nombre

| Nombre | Client | Service | Tabla real | Rango |
|---|---|---|---|---|
| `/api/planner/plans` (**sin versión**) | `plannerPlans.*` | `planner.plans.service.js` | **`planner_plans`** (nuevo) | detail + estructura alcanzables; **create inalcanzable** |
| `/api/planner/v1/plans` (**"v1"**) | `plannerPlansV1Frontend.*` | `planner.plans.v1.service.js` | **`planner_goals`** (legacy) | **ESTE es el flujo real del usuario** |
| `/api/planner/goals` | `plannerGoals.*` | `planner.goals.service.js` | **`planner_goals`** | create + restore alcanzables |

**La nomenclatura de versión está invertida: "v1" apunta a la tabla vieja. `CONFIRMED CURRENT`.**

### 2.11 Veredictos contra las hipótesis del input audit

| # | Hipótesis | Veredicto |
|---|---|---|
| 1 | Lista ← `planner_goals` | **CONFIRMED CURRENT** |
| 2 | Create → `'CreateGoal'` → `planner_goals` | **CONFIRMED CURRENT** |
| 3 | Detail → `'GoalDetail'` → `planner_plans` ⇒ 404 | **CONFIRMED CURRENT** + **`RUNTIME VERIFIED`** |
| 4 | Root del tab registra `PlannerPlansScreen` | **REFUTED**: registra `PlannerScreen`; `PlannerPlansScreen` es código muerto |
| 5 | `'PlanDetail'`/`'CreatePlan'` registrados, nadie navega | **CONFIRMED pero asimétrico**: `'PlanDetail'` **sí** se navega (`PlannerPlanCreateScreen.tsx:105`, `TaskForm.tsx:535`) y monta `PlannerPlanDetailScreenV1` (lee `planner_goals`); `'CreatePlan'` nadie lo navega |
| 6 | 3 familias de tipos, uniones distintas | **CONFIRMED CURRENT** |
| 7 | `plannerPlansV1.ts` duplicado muerto | **CONFIRMED CURRENT** |

---

## 3. PHASE 2 — DATA REALITY

**La DB local EXISTE, está sana y tiene las 112 migraciones aplicadas. `RUNTIME VERIFIED`.**
Conexión: Supabase local `project_id="HomePlus"` (`supabase/config.toml`), contenedor `supabase_db_HomePlus` (postgres 17.6, healthy, `0.0.0.0:56222→5432`). Todas las consultas se ejecutaron dentro de `BEGIN; SET LOCAL default_transaction_read_only = on; … COMMIT;` sobre `postgresql://postgres:postgres@127.0.0.1:56222/postgres`. **Cero DML, cero DDL, cero `supabase db reset`/`db push`.**

### 3.1 Ledger de migraciones
`count(*) supabase_migrations.schema_migrations` = **112**. Últimas: `20260929000000`, `20260925000000`, `20260918000001`, `20260917000100`, `20260917000050`.
⇒ **La DB local está a la altura exacta del worktree.** Toda conclusión sobre esquema es simultáneamente `STATIC CONFIRMED` y `RUNTIME VERIFIED`.

### 3.2 Conteo real de filas — **HALLAZGO DOMINANTE**

| Tabla | Filas |
|---|---|
| `planner_plans` | **0** |
| `planner_goals` | **1** |
| `planner_plan_measurements` | **0** |
| `planner_plan_measurement_history` | **0** |
| `planner_plan_milestones` | **0** |
| `planner_goal_milestones` | **0** |
| `planner_plan_requirements` | **0** |
| `planner_plan_manual_conditions` | **0** |
| `planner_plan_operations` | **0** |
| `planner_plan_legacy_goal_links` | **0** |
| `planner_tasks` | **3** |
| `planner_events` | **0** |
| `planner_activity_log` | **1** |

### 3.3 Distribuciones

| Sonda | Resultado |
|---|---|
| `planner_plans.lifecycle` | **sin filas** |
| `planner_goals.lifecycle` | `preparation` = 1 |
| `planner_goals.status` | `active` = 1 |
| `scope` / `visibility` | `planner_plans`: sin filas · `planner_goals.visibility`: `household` = 1, `NULL` = 0 |
| `planner_plans` archived | 0 |
| `planner_plans` trashed | 0 |
| `planner_goals` archived | 0 |
| `planner_goals` trashed | 0 |
| `planner_goals` `deleted_at` | 0 |
| `planner_goals` `deleted_at` **y** `trashed_at` | **0** (no hay doble marca en esta DB) |
| `planner_goal_milestones` deleted / trashed / ambos | 0 / 0 / 0 |
| `planner_tasks` trashed / archived | 0 / 0 |
| `planner_events` trashed | 0 |
| `planner_tasks.goal_id` no nulo | **0 de 3** |
| `planner_tasks.goal_id` colgante / cross-household | 0 / 0 |
| Requirements `external` (task/event) | **0** |
| Requirements con `parent_requirement_id` | **0** |
| Requirements external huérfanos (task/event) | 0 / 0 |
| Milestones con autoría perdida por `recompute` | 0 |
| `planner_goals.progress_mode` | `steps` = 1 (el default legacy rechazado por Product Truth) |
| `planner_goals` con `target_value`/`current_value` | 1 (la fila QA) |
| `planner_goals` con `unit` | 0 |
| `planner_goals.failed_at` | 0 |
| `planner_activity_log.entity_type` | `goal` = 1 |
| `planner_plan_indicators` filas | 0 (porque `planner_plans` es 0) |
| `planner_legacy_goal_plan_projection` filas | 1 |

### 3.4 Fixture QA presente (contexto, no contrato)
- 1 `planner_goals`: título `"hdjs"`, `visibility=household`, `lifecycle=preparation`, `status=active`, `category=home`, `progress_mode=steps`, `current_value=0`, `version=1`, **sin `created_by_person_id`** (la columna no existe — confirma RC-023 en vivo).
- 3 `planner_tasks`: `"six seven"` (cancelled, v2), `"bdbd"` (pending, v1), `"bdbdb"` (completed, v2). **Ninguno con `goal_id`.** Pertenecen a 2 households distintos.
- Población global: 125 `people`, 103 `households`, 17 `household_members`, 194 `auth.users` ⇒ **hay un workspace grande, pero cero uso del dominio Plan.**

### 3.5 Consecuencias para la estrategia de migración

| Métrica del input audit | Su valor | Valor real |
|---|---|---|
| Filas `planner_plans` | `UNKNOWN` | **0** |
| Filas `planner_goals` | `UNKNOWN` | **1** |
| `planner_plan_legacy_goal_links` vacía | `INFERRED` | **CONFIRMED, 0 filas** |
| Filas `planner_plan_milestones` | `UNKNOWN` | **0** |
| Filas `planner_goal_milestones` | `UNKNOWN` | **0** |
| Requirements `external` con `external_entity_id` | `UNKNOWN` | **0** |
| Goals `visibility='personal'` | `UNKNOWN` | **0** |
| Goals `lifecycle='cancelled'` | `UNKNOWN` | **0** |
| Goals con `deleted_at` **y** `trashed_at` | `UNKNOWN` | **0** |
| `completed_by_*` perdidos por `recompute` | `UNKNOWN` | **0** |

`planner_m11_3a_legacy_compatibility_report()` en vivo (`20260722040000:1590-1602`):
```json
{ "strategy":"preserve_and_report", "legacyGoalCount":0, "unmappedLegacyGoalCount":0,
  "reviewedMappingCount":0, "automaticBackfillSafe":false, "visualGoalRetirementReady":false,
  "exclusiveProgressModeCounts":{}, "visibleMappingReviewComplete":true,
  "personalStillHouseholdBoundCount":0 }
```
**Matiz `NEW`:** `legacyGoalCount = 0` mientras `count(planner_goals) = 1`. El reporte cuenta sólo goals **visibles al actor actual**; ejecutado como `postgres` sin contexto de auth, "visible" es vacío. El reporte **no es un inventario global**. No usarlo como conteo absoluto.

### 3.6 Lectura estratégica
> **En este entorno no hay datos legacy que migrar.** `planner_plans` está vacía; `planner_goals` tiene una fila de QA; no hay milestones, requirements, measurements ni links externos; ningún Task está enlazado.
> Eso **reduce drásticamente el riesgo de migración** y **convierte la estrategia de migración en un problema de esquema, no de datos**.
> **PERO es una DB local, no producción.** Este hallazgo **NO autoriza** asumir que producción está vacía. `OWNER DECISION` + verificación contra el proyecto Supabase remoto siguen siendo obligatorias antes de cualquier `DROP`.

---

## 4. PHASE 3 — TASKS DEPENDENCY AUDIT

### 4.1 Entidad y tabla canónicas
| Ítem | Valor | Evidencia |
|---|---|---|
| Tabla | `public.planner_tasks` | `202606230001_planner_mvp.sql:6-35` |
| Autoridad declarada | "canonical Task fulfillment obligations; Planner V0 task fields are a compatibility projection" | `20260722010000:1889-1890` |
| Service | `services/planner.tasks.service.js` (1 613 líneas) | |
| Controller | `controllers/planner.tasks.controller.js` | |
| Rutas | `routes/planner.js:76-118` (V0 `:89-102`, V1 `:76-87`) | |

### 4.2 Las 20 preguntas obligatorias

| # | Pregunta | Respuesta | Evidencia |
|---|---|---|---|
| 1 | Entidad canónica | `Task` sobre `planner_tasks` | `202606230001:6` |
| 2 | Tabla real | `planner_tasks` | `202606230001:6-35` |
| 3 | Service/ruta CURRENT | `planner.tasks.service.js`; `/tasks/*` y `/v1/tasks/*` | `routes/planner.js:76-102` |
| 4 | Crear | `POST /tasks` → `createTask` `:637-686` → RPC `mutate_planner_task_v0('create')` → INSERT `20260722020000:1039-1063` | |
| 5 | Editar | `PATCH /tasks/:id` → `updateTask` `:800-810` → `buildTaskPatch` `:719-798` → RPC `:1113-1139` | |
| 6 | Completar | `POST /tasks/:id/complete` → `:837-848` → `complete_planner_task_with_audit` `20260722020000:1145-1148` | |
| 7 | Cancelar | `DELETE /tasks/:id` → `:812-824` → `status='cancelled'` `20260722020000:1170-1183` | |
| 8 | Trash/Restore | `POST /tasks/:id/{trash,restore}` → `:862-882`; `trashed_at`/`trashed_by_member_id` `20260713003000:5-7`. **NO cascada a ninguna tabla Task** | `20260722020000:1203-1224` |
| 9 | Archive | **Sí existe**: `archived_at` `20260914000002:10-11`; RPCs `archive_planner_task_v1:168` / `unarchive_planner_task_v1:272`; rutas `planner.js:80-81`. **PERO `task.archive` es `false` en los 6 roles** (`plannerCapabilities.js:107,147,187,227,267,307`) ⇒ inalcanzable sin override | |
| 10 | Assignment | Canónico `planner_task_assignment_configs` + `planner_task_assignees` (M11.1A, RPCs V1 `:1152,1187,1223`). `assigned_to_member_id` (`202606230001:26`) es **proyección derivada** (`20260722020000:153-160`) | |
| 11 | Identidad | 4 capas resueltas en `planner.context.service.js:11-67`: `account`→`person`→`household`→`member`. **NO existe `user_id` como columna** | |
| 12 | Scope Personal/Hogar | **NO EXISTE.** Sin `scope`, sin `visibility`, sin `owner_person_id`. `household_id uuid not null` (`:9`), inmutable (`20260722010000:1275-1278`). Rechazo explícito: `400 personal_tasks_not_supported` (`planner.tasks.service.js:640-646`, `planner.tasks.controller.js:60-66`) | |
| 13 | RLS | 3 policies `planner_tasks_{select,insert,update}_capability` (`20260722010000:291-368`) sobre `is_active_household_member` + `planner_current_actor_has_capability`. **Sin policy DELETE** ⇒ el `grant delete` queda sin efecto | `RUNTIME VERIFIED` (pg_policies) |
| 14 | ¿Pertenece a algo hoy? | **Sí, a 4 cosas por 4 mecanismos**: `goal_id`→`planner_goals` (FK, set null); `responsibility_id`→`planner_responsibilities` (FK, restrict); `origin_*` (**sin FK**); fila en `planner_plan_requirements` con `external_kind='task'` (**sin FK**) | |
| 15 | Quién escribe `goal_id` | RPC `mutate_planner_task_v0` create (`:1043,1057`) y update (`:1123`); `materialize_planner_responsibility_v1` (`20260916000001:180,189`, **sin validación de household**); FK `on delete set null` (`202607080004:116`) | |
| 16 | Quién lee `goal_id` | `planner.tasks.service.js:488-511` (filtro `?goal_id=`), `planner.goals.service.js:109-136` (`calculateProgressFromTasks`), `planner.activity.service.js:33`; DB `20260722020000:1026,1105`; FE `PlannerPlanDetailScreenV1.tsx:68,82,202`, `PlannerTasksScreen.tsx:132`, `TaskDetailScreen.tsx:1243`, `TaskForm.tsx:308,629`, `GoalDetailScreen.tsx:113` | |
| 17 | `origin_*` | Escritura: `planner.tasks.service.js:669-676` (allowlist `ALLOWED_ORIGIN_MODULES:10-16` **no incluye `'planner'`**), `inventory.service.js:550-553`, `20260916000001:182`. Lectura: `inventory.service.js:482-484` (**única**). **Sin FK.** Índice `202607080003:42-44`. Frontend sólo tipo (`plannerTasks.ts:74-77`) | |
| 18 | Requirements external task | Escritor vigente `apply_planner_plan_structure_changeset_rpc` `20260722090002:467-492` (valida con `planner_plan_validate_external_link` en `:470-474`). Lector `planner_plan_external_link_dto:42-63` vía `read_planner_plan_graph_rpc:134`. **Sin trigger de cascada**: trash de Task sólo se refleja como `availability:'trashed'` | |
| 19 | ¿Double-link posible? | **SÍ.** Ningún CHECK, trigger ni FK relaciona `planner_tasks.goal_id` con `planner_plan_requirements`. El índice único es **por Plan** (`20260722040000:279-281`) ⇒ una Task puede estar en N Plans. La UI ya usa ambos a la vez (`PlannerPlanDetailScreenV1.tsx:202` escribe `goal_id` mientras el grafo puede tener un requirement externo de la misma Task) | |
| 20 | Contrato para `Task → 0..1 Plan` sin duplicar autoridad | **Existe y es completo sólo contra `planner_goals`**: columna `planner_tasks.goal_id` (`202607080004:116`) + `PATCH /api/planner/tasks/:id` (`planner.tasks.service.js:787-795`) + `GET /api/planner/tasks?goal_id=` (`:488-511`) + guard `task.edit_own/any` (`20260722010000:1387-1393`) | |

### 4.3 Unlink ≠ delete — verificado
`planner.tasks.service.js:787-795` traduce `goal_id:null|''|undefined` → `patch.goal_id = null`; `20260722020000:1123` `goal_id = case when p_payload ? 'goal_id' then v_goal_id else goal_id end` ⇒ `NULL`. La fila Task **persiste**. Ejercitado por la UI en `PlannerPlanDetailScreenV1.tsx:225-228`.

### 4.4 `NEW` — integridad del FK `goal_id`
`202607080004:116` es un FK **simple**, sin `household_id` (a diferencia de los 6 FKs de actores `20260722010000:251-268`). La co-propiedad Task↔Goal se valida **sólo dentro del RPC** (`:1026-1028`, `:1104-1106`), no en el esquema.

### 4.5 `NEW` — columnas fantasma en el cliente Task
`front/mi-front-limpio/services/plannerTasks.ts:46` declara `scope?: 'personal' | 'household'`, y `PlannerPlanDetailScreenV1.tsx:88` lo consume como filtro (`t.scope !== 'personal'`). **La API nunca devuelve `scope`.** El filtro siempre es verdadero.

### 4.6 Veredicto

> **TASK CONTRACT AVAILABLE FOR PLANS: PARTIAL**

**Lo que Tasks ofrece hoy (no duplicar):** tabla + RLS + trigger de guard; escritura de vínculo **sólo** por RPC `mutate_planner_task_v0` (congelado por test `scripts/planner_m11_1b_contract_tests.js:93`); autorización del cambio como "ordinary edit" (`task.edit_own/any`); validación de existencia del destino en el RPC; lifecycle completo (status, cancel, reactivate, trash, restore, archive, fulfillment, evidence).

**Lo que debe resolver Plans (no es de Tasks):**
1. **La 0..1 de `planner_plans`.** El grafo canónico no la tiene: el único índice es por-Plan. `planner_plan_task_links` **NOT FOUND**.
2. **La autoridad única del vínculo.** Hoy hay dos mecanismos (`goal_id` y requirement externo) sin reconciliación y con double-link posible.
3. **La asimetría de scope.** `planner_tasks` es household-only; `planner_plans` tiene `scope`. `planner_plan_validate_external_link:165-171` **rechaza** Task en Plan personal ⇒ **un Plan personal no puede tener Tasks hoy**.
4. **La política de links colgantes** (Task trasteada con link vivo).
5. **La lectura agregada "progress de Plan por Tasks"**: `planner.plans.service.js` **no lee `planner_tasks` en absoluto**.

**Hallazgos de Tasks que Plans debe conocer pero NO arreglar:** FK `goal_id` no compuesto (§4.4); `scope` fantasma en cliente (§4.5); `checklist` y `estimated_duration_minutes` no escribibles por el RPC de update (`planner.tasks.service.js:765-771` vs `20260722020000:1113-1124`); `task.archive` muerta.

---

## 5. PHASE 4 — EVENTS DEPENDENCY AUDIT

### 5.1 Entidad, tabla, servicio
| Aspecto | Valor | Evidencia |
|---|---|---|
| Tabla | `planner_events` (base `202606230001:97-119`, ampliada por `20260722030000:18-34`) | |
| Lifecycle | `CHECK (lifecycle in ('draft','scheduled','cancelled','trash'))` | `20260722030000:140-141` — `RUNTIME VERIFIED` |
| Status legacy | `CHECK (status in ('scheduled','cancelled'))` | `202606230001:123-128` — `RUNTIME VERIFIED` |
| Scope | `scope` + `owner_person_id`; invariante `planner_events_v1_owner_check` (personal⇒`owner_person_id`+`household_id IS NULL`; household⇒inverso), inmutable en UPDATE | `20260722030000:19-20,132-139,481-488` |
| Rutas V1 | `/v1/events`, `/v1/events/:id`, `/v1/events/:id/mutations`, `/v1/events/:id/participants/mutations` | `routes/planner.js:104-108` |
| Service V1 | `planner.events.v1.service.js` (sólo 75 líneas: `:32,53,59`; **no create ni mutate**) | create/mutate van **inline en el controller** (`:70,124,182`) |
| Service V0 | `planner.events.service.js` (654 líneas) — **household-only**, fuerza `scope:'household'` en `:195` | |
| Create | `create_planner_event_v1` (`20260722030000:1043`, INSERT `:1208`) — **ambas puertas V0 y V1 convergen aquí** | |
| Edit | `mutate_planner_event_v1` / `apply_planner_event_patch_v1` (`:1260`, UPDATE `:1320`); `p_expected_version` → 412 | |
| Cancel | `DELETE /events/:id` → `:346` → `lifecycle='cancelled'` + `cancelled_at/_by_/_reason/_from_status` (`20260722030000:1754-1760`) | |
| Trash/Restore | `POST /events/:id/{trash,restore}` → `:434,:477`. **NO cascada a participants.** Cascada a ocurrencias de la serie **sólo si `edit_scope != 'this_occurrence'`**. **`planner_event_series.lifecycle` NO se modifica** ⇒ una serie puede quedar `active` con todas sus ocurrencias en `trash` | `20260722030000:1652-1654,1733-1735` |
| Recurrencia | Tabla `planner_event_series` (`recurrence_rule jsonb`, `:237`); identidad de ocurrencia **en la fila** `planner_events` (`series_id`+`occurrence_key`, `:30-31`) | |
| Participants | `planner_event_participants` (`:292-310`); RPC `mutate_planner_event_participant_v1:1830`; creador auto-participante por trigger `:763-784` | |
| Visibilidad | `planner_event_can_view` (`:368-387`): personal⇒`owner_person_id = current_person_id()`; household⇒`planner_event_actor_has_capability(household,'planner.view')` | |
| RLS | **Una sola policy** `planner_events_select_v1_scope` (`:800-808`). **Sin policy INSERT/UPDATE/DELETE** + `revoke insert,update,delete from authenticated` (`:882`) ⇒ **toda escritura de Event debe pasar por los 3 RPC V1** | `RUNTIME VERIFIED` |
| ID | `uuid` | `202606230001:98` |
| `deleted_at` | **NO EXISTE** (sólo `trashed_at`) | |
| `archived_at` | **NO EXISTE** — archive no es operación del dominio Event | |

### 5.2 Las 17 preguntas obligatorias

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | Tabla canónica | `planner_events` |
| 2 | Service/ruta canónica | V1 = `/api/planner/v1/events*`; V0 = `/api/planner/events*`. **V0 es la que usa la UI de detalle** |
| 3 | Create | `POST /v1/events` → `create_planner_event_v1` |
| 4 | Read/detail | V1 → RPC `planner_event_v1_dto` (`:891-1038`), tipo `PlannerEventV1` (`plannerEventsV1.ts:63-91`) · V0 → `select('*')` crudo |
| 5 | Edit | `PATCH /events/:id` o `POST /v1/events/:id/mutations` → `mutate_planner_event_v1` |
| 6 | Cancel | `DELETE /events/:id` → `lifecycle='cancelled'` |
| 7 | Trash/Restore | sí, sin cascada a participants |
| 8 | Lifecycle | `draft \| scheduled \| cancelled \| trash` (+ `status` legacy de 2 valores) |
| 9 | Recurrence | serie canónica en `planner_event_series`; ocurrencia en la fila. **Dos modelos incompatibles conviviendo**: V1 fila-por-ocurrencia vs V0 expansión en memoria (`planner.calendar.service.js:119-168`) |
| 10 | Participants | tabla propia; `rsvp_status` + `attendance_status` separados |
| 11 | Scope | sí, completo e inmutable |
| 12 | RLS | 1 policy SELECT; escrituras por RPC |
| 13 | ID | uuid |
| 14 | Qué puede enlazarse sin duplicar Event | `planner_plan_requirements(subject_type='external', external_kind='event')`; también `planner_event_participants`, `planner_event_series`, `planner_activity_log`, `audit_events` |
| 15 | Link Plan/Goal hoy | **`plan_id`/`goal_id` en `planner_events`: NOT FOUND** (0 hits, 112 migraciones). Tabla puente: **NOT FOUND**. Único link: el requirement externo, **sin FK** |
| 16 | ¿Se usan los external requirements? | **RPC sí, UI no.** Escritor vigente `20260722090002:467-492` (con validación de scope) y **escritor sin validación** en `write_planner_plan_graph_rpc` (`20260722049000:598-608`, fuerza `external_entity_id = NULL`). Lector end-to-end `planner_plan_external_link_dto:70-101` + botón "Abrir evento vinculado" (`PlannerPlansSurfaces.tsx:237-245`). **Ningún writer de UI**: `PlannerPlanStructureEditScreen.tsx:90` sólo produce hitos |
| 17 | Cómo implementar sin que Plan sea dueño de Calendar | **La FK lógica vive en la relación de Plan, nunca en `planner_events`.** Ninguna migración existente introduce `plan_id` en Events: mantenerlo así es la garantía estructural |

### 5.3 `planner_plan_validate_external_link`, rama `'event'` — CONFIRMED en líneas, PARCIAL en "correctamente"
`20260722090002:172-183` valida `(scope, household_id)` y `(scope, owner_person_id)` correctamente, coherente con `planner_events_v1_owner_check`.
Defectos:
| Sev | Defecto |
|---|---|
| **P0** | `20260722040000:534-537` fija `v_subject_satisfied := false` para **todo** requisito externo ⇒ **un Event (o Task) enlazado nunca se satisface** ⇒ bloquea el cierre del Plan para siempre |
| **P1** | El escritor `write_planner_plan_graph_rpc` **no llama** al validador y fuerza `external_entity_id = NULL` ⇒ dos caminos de escritura con garantías distintas |
| **P1** | El deep-link Plan→Event cae en `EventDetailScreen.tsx:25` → V0, que filtra por `household_id` (`planner.events.service.js:543`) ⇒ **Event personal enlazado ⇒ 404** |
| **P2** | NULL-safety divergente: validador usa `=` (`:177,179`), DTO usa `is not distinct from` (`:81,83`) |
| **P2** | El validador no excluye `lifecycle='trash'` |

### 5.4 Veredicto

> **EVENT CONTRACT AVAILABLE FOR PLANS: PARTIAL**

**Lo que Events ofrece hoy (no duplicar):** tabla + 16 columnas V1 + 4 CHECKs + 3 triggers; `id` estable; `scope`/`owner_person_id`/`household_id` con invariante verificada; `version` con concurrencia optimista; DTO canónico `planner_event_v1_dto`; 5 rutas V1; participantes en tabla propia; recurrencia con serie canónica; `planner_event_can_view`; la **dirección de dependencia ya es correcta** (`event_id` nunca aparece en `planner_plans`).

**Lo que debe resolver Plans:** la regla de satisfacción de un requisito externo ligado a un Event (§5.3 P0); la unicidad 0..1; un único camino de escritura del link; el writer de UI; el deep-link por scope.

**Lo que NO pertenece a Plans:** el vocabulario `draft|scheduled|cancelled|trash`, la policy única, el `revoke insert,update,delete`, `planner_event_series`, `planner_event_participants`, y cualquier rediseño de Calendar.

---

## 6. PHASE 5 — RELATION MODEL STRESS TEST

Restricción recalled de Product Truth §04/§05/§07: `Task → 0..1 Plan`, `Event → 0..1 Plan`, y **Required/Optional es propiedad del componente DENTRO de un Plan** (no un atributo global de Task/Event).

### 6.1 Alternativa A — `plan_id` directo en `planner_tasks` / `planner_events`

| Criterio | Evaluación |
|---|---|
| Integridad referencial | FK sólida en ambos lados |
| 0..1 | Natural (columna escalar). Unicidad global automática |
| Required/Optional | **Exige una columna `classification` en la entidad global** ⇒ contamina el vocabulario de Tasks/Events con un concepto de Plan |
| Unlink | `UPDATE plan_id = NULL`. Correcto |
| Personal/Hogar | **Asimetría dura**: Task no tiene scope ⇒ Task sólo en Plan household. Un Plan personal **nunca** podría tener Tasks |
| RLS | La fila vive en la tabla de otro módulo. La policy de Task sigue siendo household-based ⇒ **cualquiera que pueda leer el Plan ve el título de la Task**; y la policy de Task revela que existe un Plan |
| Migración desde datos actuales | Imposible: `planner_tasks.goal_id` apunta a `planner_goals` y el puente goals→plans tiene **0 filas** (`RUNTIME VERIFIED`) |
| Coupling | `planner_tasks` (Tasks) depende de `planner_plans` (Plans). **Invierte la dirección de dependencia que Events ya respeta correctamente** |
| Deletion | `ON DELETE SET NULL` correcto |
| Coste de query | 1 join directo, óptimo |
| Testabilidad | Alta |
| Rollback | `DROP COLUMN` |
| Compatibilidad legacy | Simple, pero `goal_id` queda huérfano |
| **Veredicto** | **REJECTED**. Introduce vocabulario de Plan dentro de Tasks/Events, rompe la direccionalidad de dominio, y hace imposible el Plan personal con componentes — que el Product Truth exige |

### 6.2 Alternativa B — tablas de relación dedicadas (`planner_plan_components` o gemelas `planner_plan_tasks` / `planner_plan_events`)

| Criterio | Evaluación |
|---|---|
| Integridad referencial | FK a ambos lados, ambos `ON DELETE CASCADE` (borrado duro) — el borrado duro de Task ya está bloqueado por RLS hoy |
| 0..1 | `UNIQUE (entity_id) WHERE trashed_at IS NULL` sobre la relación ⇒ **single-homing global garantizado en DB** |
| Required/Optional | `classification` **vive en la fila de relación** = exactamente "propiedad del componente dentro del Plan". **Cero contaminación de Tasks/Events** |
| Unlink | `DELETE` de la fila de relación. La entidad **no se toca**. `unlink ≠ delete` garantizado **estructuralmente**, no por convención |
| Personal/Hogar | Validación en el escritor + CHECK. `planner_events` **ya tiene** scope ⇒ la validación Event es correcta hoy (`20260722090002:172-183`). Task requiere resolver la asimetría aparte |
| RLS | Una policy por tabla de relación delegando en `planner_plan_can_read(plan_id,false)`. **Y el inverso**: una policy que exige que el actor también pueda leer la entidad, para que el link no amplíe visibilidad |
| Migración desde datos actuales | **Trivial**: `planner_tasks.goal_id` no tiene ninguna fila poblada (0 de 3) y el puente está vacío ⇒ **backfill vacío** |
| Coupling | **Sólo hacia atrás**: Plans conoce Task/Event por id. Tasks/Events no cambia. Precedente análogo ya existe (`planner_tasks.responsibility_id` → `planner_responsibilities`) |
| Deletion | `planner_plan_indicators` actualiza; Requirements legacy se derivan y luego se congelan |
| Coste de query | 1 join por tipo. Índices parciales compuestos `(plan_id, trashed_at)` y `(entity_id)` |
| Testabilidad | Muy alta — cada regla es un CHECK o un índice verificable contra DB real |
| Rollback | **`DROP TABLE`. Aditivo. No toca Tasks/Events** |
| Compatibilidad legacy | `planner_tasks.goal_id` queda read-only un ciclo; luego `DROP COLUMN` |
| **Veredicto** | **RECOMMENDADO** |

### 6.3 Alternativa C — reutilizar `goal_id` + external requirements actuales

| Criterio | Evaluación |
|---|---|
| Integridad referencial | `goal_id` sí; requirement externo **NO** (`external_entity_id` sin FK, comentario explícito `:208-209`) |
| 0..1 | `goal_id` sí. Requirements: índice único **por Plan** (`20260722040000:279-281`) ⇒ **multi-homing permitido**, que Product Truth prohíbe |
| Required/Optional | Ya existe `classification`, pero **duplicada** en sujeto y requirement y **coaccionada** por constraint trigger |
| Unlink | Task: sí (`goal_id=null`). Event/requirement: `action='trash'` **borra la fila** y no distingue "desvincular" de "eliminar" (`20260722090002:507-512`) |
| Personal/Hogar | Task: imposible. Event: correcto |
| RLS | Mezcla de dos modelos de identidad incompatibles: `planner_goals` es member-based, `planner_plans` es person-based |
| Migración | Ya está "migrada" — y por eso mismo es el problema |
| Deletion | Requirements sobreviven al trash del Plan sin marca (`20260722049000:290-299`) |
| Coste de query | El grafo añade joins y una función recursiva |
| Testabilidad | Baja: hay que probar dos mecanismos y su reconciliación, que **no existe** |
| Rollback | Malo: `goal_id` está en producción y en el schema de Tasks |
| **Veredicto** | **REJECTED como Target.** Es la causa de RC-004, RC-006, RC-031 y de la doble autoridad. **Se conserva como READ ONLY durante la transición, no se extiende** |

### 6.4 Alternativa D — evolución híbrida temporal de `planner_plan_requirements`

Variante D1: aplanar la rama `external` de `planner_plan_requirements` y hacer de ella la relación real.

| Criterio | Evaluación |
|---|---|
| Integridad referencial | **Sigue sin FK.** Para ganar FK hay que añadirla, y `external_entity_id` es polimórfico (`task` \| `event`) ⇒ una FK no es posible sobre una columna que apunta a dos tablas |
| 0..1 | Hay que añadir un índice único nuevo de todas formas |
| Required/Optional | `classification` ya existe — único punto a favor |
| Unlink | Hay que distinguir `trash` de `unlink` en el RPC |
| Personal/Hogar | Correcta para Event, rota para Task |
| RLS | La tabla arrastra el vocabulario retirado (`subject_type`, `subject_shape`, `parent_requirement_id`) |
| Migración | 0 filas ⇒ trivial, pero también 0 filas ⇒ **no hay razón para reutilizar la tabla** |
| Coupling | Acopla la relación nueva al modelo retirado |
| Deletion | La tabla tiene 18 columnas de las cuales 9 son del grafo retirado |
| Testability | El trigger de grafo sigue activo y hay que razonar sobre él |
| Rollback | Medio: hay que revertir una función de 600 líneas |
| **Veredicto** | **REJECTED.** No puede ganar integridad referencial sin abandonar el grafo; al abandonarlo, es la Alternativa B con baggage. Con 0 filas, reutilizar la tabla no ahorra nada |

### 6.5 Elección técnica

> **RECOMENDACIÓN: Alternativa B — tablas de relación dedicadas, propiedad de Plans.**
>
> **Forma concreta mínima:** una sola tabla `planner_plan_components` con discriminador, o dos tablas gemelas. **Se recomienda una sola tabla con `component_kind IN ('task','event')`** para que Required/Optional, Readiness y Progress tengan **una sola autoridad de derivación** y una sola RLS que auditar.
>
> Restricciones DB obligatorias:
> 1. `plan_id uuid not null references planner_plans(id) on delete cascade`
> 2. `component_kind text not null check (component_kind in ('task','event'))`
> 3. `entity_id uuid not null` (**sin FK** — polimórfico; la integridad se garantiza en el escritor, igual que hoy)
> 4. **`unique (component_kind, entity_id) where trashed_at is null`** ⇒ 0..1 global, single-homing
> 5. `classification text not null default 'necessary' check (classification in ('necessary','supporting'))` ⇒ **Required/Optional en la fila del componente**
> 6. `sort_order integer not null default 0 check (sort_order >= 0)`, `version integer not null default 1`, `trashed_at` + actores + `trash_operation_id` con `CHECK` de shape
> 7. `unique (plan_id, component_kind, entity_id) where trashed_at is null`
> 8. RLS: 1 policy SELECT `planner_plan_can_read(plan_id,false)` **y** `and planner_plan_component_entity_visible(component_kind, entity_id)` ⇒ **el link nunca amplía visibilidad**
>
> **Por qué no una tercera autoridad permanente:** B **es** la autoridad única. `planner_tasks.goal_id` y la rama `external` de `planner_plan_requirements` quedan **READ ONLY** y se retiran tras un ciclo de verificación.

---

## 7. PHASE 6 — MEASUREMENTS

### 7.1 `planner_plan_measurements` — 15 columnas, `RUNTIME VERIFIED`
`20260722040000:94-120`

| # | Columna | Tipo | Default | Null | CHECK |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `gen_random_uuid()` | PK | `:95` |
| 2 | `plan_id` | uuid | — | **NOT NULL** | FK → `planner_plans(id)` **RESTRICT** `:96` |
| 3 | `name` | text | — | **NOT NULL** | `length(btrim(name))>0` `:110` |
| 4 | `current_value` | numeric | `0` | **NOT NULL** | **ninguno (sin rango)** `:98` |
| 5 | `target_value` | numeric | — | NULL | **ninguno (sin rango)** `:99` |
| 6 | `unit` | text | — | **NOT NULL** | `length(btrim(unit))>0` `:111` |
| 7 | `target_operator` | text | `'gte'` | **NOT NULL** | `in ('gte','lte','eq')` `:112` |
| 8 | `classification` | text | `'necessary'` | **NOT NULL** | `in ('necessary','supporting')` `:113` |
| 9 | `sort_order` | integer | `0` | **NOT NULL** | `>= 0` `:114` |
| 10-12 | `trashed_at`, `trashed_by_person_id`, `trashed_by_member_id` | | | NULL | `trash_actor_shape` `:116-119` |
| 13-15 | `version` default 1, `created_at`, `updated_at` | | | NOT NULL | `version>=1` `:115` |

Restricciones adicionales: `unique (id, plan_id)` `:283-284`; índice `(plan_id, sort_order, id)` `:268`.
**Cumple 7 de 7 campos del Product Truth §06.**

### 7.2 `planner_plan_measurement_history` — 10 columnas
`20260722040000:122-140`: `id`, `plan_id` (FK restrict), `measurement_id` (FK **compuesta** `→ (id,plan_id)` restrict, `:285-288`), `value`, `previous_value`, `recorded_by_person_id` (**RESTRICT**), `recorded_by_member_id` (set null), `correction_of_id` (FK autorreferente compuesta restrict `:136-139`), `operation_id` (**NOT NULL**, con `unique (measurement_id, operation_id)` `:134`), `recorded_at`.
**Sin `trashed_at`, sin `version`, sin `updated_at`.**

### 7.3 `REFUTED` — "history es append-only"
No hay ningún trigger `BEFORE UPDATE/DELETE` sobre `planner_plan_measurement_history` (búsqueda `create trigger` sobre el dominio = NOT FOUND). La única defensa es de privilegios: `authenticated` sólo `SELECT` (`:664-667`); **`service_role` tiene `INSERT, UPDATE, DELETE` (`:668-671`)**. ⇒ **append-only por GRANT, no por constraint.**

### 7.4 Writers / readers / `targetReached`

| Rol | Sites |
|---|---|
| Writers measurement | `write_planner_plan_graph_rpc` create `:424-428`, update `:460-466`, record `:476-477`, trash `:484-485`, restore `:492-493` · `apply_planner_plan_structure_changeset_rpc` `:371-381,391-399,409-411,415-417` · trigger `planner_plan_measurements_touch_version` `:306-307` |
| Writers history | `:432-433` (create), `:478-480` (record) · **`:401-405` (changeset) con `on conflict do nothing` ⇒ descarta silenciosamente** y **sin `previous_value`** |
| Readers | `planner_plan_indicators` `:702` · `read_planner_plan_graph_rpc` `:128` · satisfaction `:529` · recompute `:609` · RLS/grant directo |
| `DELETE` | **NOT FOUND en 112 migraciones** |
| `targetReached` | SQL `20260722040000:521-529` (satisfaction) y `:684-689` (vista) · **JS `planner.plans.service.js:133-138`** (única fuente del DTO, usada en `:209`) |

**El cálculo NO está en el frontend.** `planStructureContract.ts:99` sólo proyecta el booleano.

### 7.5 RLS y grants — `RUNTIME VERIFIED`

| Tabla | Policy | Grants a `authenticated` |
|---|---|---|
| `planner_plan_measurements` | `planner_plan_measurements_select`: `(trashed_at IS NULL) AND planner_plan_can_read(plan_id,false)` | `SELECT` |
| `planner_plan_measurement_history` | `planner_plan_measurement_history_select`: `planner_plan_can_read(plan_id,false)` | `SELECT` |

**`CHANGED` vs input audit (S1) — el hallazgo es más débil de lo reportado.** El input audit (§19.4 S1) dijo que la policy de history "no filtra `trashed_at`". Confirmado: **no** filtra el `trashed_at` **de la measurement**. **Pero** usa `can_read(plan_id, false)`, que ya exige `plan.trashed_at IS NULL` (`20260722040000:374`), así que **un Plan trasteado queda excluido**. El gap residual es estrecho: **el historial de una measurement individualmente trasteada sigue legible mientras el Plan vive.** Severidad real: **P2**, no P1.

### 7.6 Divergencia de rango
| Tabla | `current_value` | `target_value` |
|---|---|---|
| `planner_plan_measurements` | **sin CHECK** | **sin CHECK** |
| `planner_goals` (legacy) | `>= 0` (`202607080004:74-78`) | `is null or >= 0` (`:68-72`) |
| `planner_goal_milestones` | — | `is null or >= 0` (`:107`) |
**`RUNTIME VERIFIED`**: 0 filas negativas hoy. Decisión de Owner si el Target admite valores negativos (p. ej. saldo, temperatura).

### 7.7 Veredicto

> **MEASUREMENT STRATEGY: KEEP + WIRE.**
>
> - **KEEP** la tabla, los 7 campos del Target, `classification`, `sort_order`, `version`, `trashed_at`, y el historial append-only con corrección.
> - **WIRE**: no hay ninguna superficie alcanzable (`PlannerPlanStructureEditScreen.tsx:17-28` sólo importa `planMilestoneEditor`). **Es la pieza más cercana al Target y la más sub-explotada.**
> - **MODIFY** (mínimo, 2 ítems): (a) escribir `previous_value` en el camino `changeset`; (b) sustituir `on conflict do nothing` por un error, para no descartar historial en silencio.
> - **NO REBUILD.** Reconstruir por preference estética perdería la idempotencia, la corrección y el historial ya resueltos.
> - **Deuda que se registra, no se arregla aquí:** sin CHECK de rango; append-only por GRANT; policy de history sin filtro de `trashed_at` de la measurement.

---

## 8. PHASE 7 — REQUIRED / OPTIONAL

**Target:** clasificación **plana** por componente. **NO** requirement graph, **NO** jerarquía, **NO** dependencias, **NO** manual conditions.

### 8.1 Lo que existe (4 check constraints, `RUNTIME VERIFIED`)
| Tabla | Columna | Default | Vocabulario |
|---|---|---|---|
| `planner_plan_milestones` | `classification` | `'necessary'` | `necessary \| supporting` (`20260722040000:66,80`) |
| `planner_plan_measurements` | `classification` | `'necessary'` | `necessary \| supporting` (`:102,113`) |
| `planner_plan_manual_conditions` | `classification` | `'necessary'` | `necessary \| supporting` (`:147,159`) |
| `planner_plan_requirements` | `classification` | **sin default** | `necessary \| supporting` (`:183,197`) |

**Mapeo 1:1 al Target:** `necessary` = **Required**, `supporting` = **Optional**. Semántica ya correcta: los gates de activación (`:1006-1010`) y de completado (`:1023`) filtran por `classification='necessary'`; `supporting_requirement_count` se reporta aparte.

### 8.2 `REFUTED` — "el trigger coacciona la duplicación"
El input audit (§13.2) afirmó que el constraint trigger rechaza *toda* escritura cuya `classification` del requirement difiere de la del sujeto. **Parcialmente refutado** (`20260722040000:450-469`):
- El trigger **sólo** valida subjects `milestone|measurement|manual_condition`. Para `subject_type='external'`, `v_subject_classification := new.classification` (autorreferencia `:459-462`) ⇒ la comparación nunca dispara.
- El trigger **no se dispara** cuando cambia la `classification` **del sujeto**: `apply_..._changeset_rpc` actualiza `planner_plan_measurements.classification` en `:397` **sin** sincronizar `planner_plan_requirements` ⇒ **divergencia silenciosa y persistente** (el escritor canónico sí sincroniza: `:366`, `:467`, `:548`).
- La sincronización existe ⇒ el resultado real es "a veces sincronizado, a veces divergente", no "siempre coaccionado". **Eso es peor que un invariante: es un invariante no fiable.**

### 8.3 `REFUTED` — "hay 5 índices únicos en requirements"
`20260722040000:273-281` define **4** índices únicos: `one_milestone_idx`, `one_measurement_idx`, `one_condition_idx`, `one_external_reference_idx`. El quinto (`planner_plan_measurements_id_plan_unique`, `:284`) es de otra tabla.

### 8.4 Diseño físico mínimo
| Componente | Target | Físico |
|---|---|---|
| Task relation | Required / Optional | `planner_plan_components.classification` (Alternativa B) |
| Event relation | Required / Optional | `planner_plan_components.classification` (Alternativa B) |
| Measurement | Required / Optional | `planner_plan_measurements.classification` — **ya existe, no tocar** |

⇒ **Una sola columna `classification` por fila de componente, en tres sitios, cada uno junto a su componente.** Cero `subject_type`, cero `parent_requirement_id`, cero `subject_shape`, cero trigger de grafo, cero recursión.

### 8.5 Preservación de la clasificación legacy
Con **0 filas** en `planner_plan_milestones` y `planner_plan_requirements` (`RUNTIME VERIFIED`), **no hay `classification` legacy que migrar**. Se preserva **por diseño**, no por migración:
- `planner_plan_measurements.classification` **se queda** (ya es Required/Optional).
- `planner_plan_milestones.classification` se **congela en lectura** y se exporta a archivo frío antes de cualquier `DROP`.
- `planner_plan_requirements` (incl. `parent_requirement_id`) se congela y se exporta **antes** de retirar el grafo. Con 0 filas el export es trivial hoy y **caro mañana** ⇒ **el gate debe ser "congelar primero, dropear después"**, no al revés.

### 8.6 Efecto sobre Readiness (Product Truth §07/§09)
`Optional puede quedar pendiente sin bloquear la preparación`. Los gates actuales ya lo respetan (filtran `necessary`). El gap es otro: `planner_plan_requirement_satisfied_internal:534-537` pone `external ⇒ false`, así que **un Task/Event Required bloquea para siempre**. Ver §9.3.

---

## 9. PHASE 8 — PROGRESS + READINESS

### 9.1 Progress — los 4 mecanismos, verificados

| # | Mecanismo | Dónde | Veredicto |
|---|---|---|---|
| 1 | **7 contadores honestos sin %** | vista `planner_plan_indicators` (`20260722040000:673-706`), comentario literal `'Separate, honest indicators. There is intentionally no percentage column.'` `:674` — **`RUNTIME VERIFIED`** | **KEEP como forma**, **REPLACE el contenido**: cuenta Milestones y Requirements (retirados) y **no cuenta Tasks ni Events** |
| 2 | **`attachProgress`: porcentaje universal sintetizado en JS** | `planner.goals.service.js:186-219`, 5 `progress_mode`, overrides `completed→100` `:187-189`, `closed→0` `:191-193`, `numeric→round(current/target*100)` `:156-167` | **REPLACE**. Prohibido por Product Truth §10 |
| 3 | **Lectura de columnas inexistentes** | `planner.plans.v1.service.js:111-118` lee `progress_percentage`, `tasks_total/completed/pending`, `milestones_total/completed` — **las 6 NO existen** (0 hits en 112 migraciones, `RUNTIME VERIFIED`) ⇒ `progress = undefined ?? null` | **DEAD CODE** |
| 4 | **Barras de porcentaje en frontend** | `PlannerPlanListScreen.tsx:199,206-211` · `PlannerPlanDetailScreenV1.tsx:415-437` · `PlannerGoalsScreen.tsx:153-172` (muerto) · `GoalDetailScreen.tsx:618` (muerto) | **REPLACE**. Alimentadas por un campo inexistente ⇒ **siempre vacías en runtime** |

`REFUTED` (input audit §14.1/§22.2): "Home ordena por `progress_percentage`". **No hay ningún `.order('progress_percentage')`** en `planner.summary.service.js`. Los tres `.order()` son `created_at` (`:311,378`) y `starts_at` (`:347`). El `progress_percentage` sólo aparece en un **sort JS en memoria** sobre datos ya enriquecidos por `attachProgress` (`:227-234`). La premisa ("no es columna") es cierta; la conclusión ("ordena en SQL") es falsa.

### 9.2 Las 3 lecturas del Target: ninguna existe
| Lectura | Estado |
|---|---|
| `Tasks N / total` | **NO EXISTE.** `planner.plans.service.js` **no lee `planner_tasks`** en absoluto |
| `Events occurred / total` | **NO EXISTE.** No hay relación Plan↔Event |
| `Measurements current / target` | **PARCIAL.** El dato y `targetReached` existen; **no se exponen etiquetados como progress** |
| `Readiness` separado | **Sólo frontend** |

### 9.3 Readiness — la divergencia real
| Ubicación | Qué calcula |
|---|---|
| DB — gate de activación | requiere ≥1 `milestone|measurement|manual_condition` no trasteado (`:1001-1005`) + **bloquea** si hay external `necessary` sin bind (`:1006-1010`) |
| DB — gate de completado | bloquea si hay requirement **raíz** `necessary` insatisfecho, salvo `confirm_unresolved` (`:1019-1027`) |
| DB — satisfacción | `planner_plan_requirement_satisfied_internal` **recursiva** con detección de ciclo por `uuid[]` `:506-509`; **`external ⇒ false` `:534-537`** |
| Frontend | `projectActivationReadiness` `planStructureContract.ts:354-369`; `projectCompletionReadiness` `:401-431` |

**No existe endpoint de readiness.** La autoridad es DB; el frontend recalcula.

**Tres defectos de la Satisfaction que Target debe eliminar:**
1. **`external ⇒ false` siempre** (`20260722040000:534-537`) ⇒ un Task/Event **Required** bloquea el completado **para siempre**. Contradice Product Truth §09.
2. El gate de activación cuenta **sólo** milestone/measurement/manual_condition ⇒ **un Plan cuyo único contenido sea Tasks o Events no puede activarse**.
3. La recursión + el trigger de grafo existen **sólo** por el grafo retirado.

### 9.4 Dónde debe calcularse cada uno

| Lectura | Autoridad recomendada | Razón con evidencia |
|---|---|---|
| **Progress factual** | **SQL, en la vista `planner_plan_indicators`** (reescrita con Task/Event/Measurement). Derivado, no almacenado | Ya existe `security_invoker=true` + comentario de no-porcentaje. **Nada derivado se persiste** (cumple "NO almacenar datos derivados innecesariamente") |
| **Readiness** | **SQL, un RPC de lectura nuevo** `read_planner_plan_readiness_rpc(uuid)` que devuelva la forma de `projectCompletionReadiness` | El gate autoritativo **ya está en DB**. Moverlo al backend elimina la doble autoridad |
| **Render** | Frontend, **consumiendo** — sin recalcular | `planStructureContract.ts` deja de ser motor y pasa a ser presentador |

---

## 10. PHASE 9 — COMPLETION + LIFECYCLE

### 10.1 Vocabulario de lifecycle — tabla de estados

| Valor CURRENT | Fuente | Target | Acción |
|---|---|---|---|
| `draft` | `planner_plans.lifecycle` `20260722040000:40`; TS `PlannerPlan.ts:4`; DTO `:160` | **Preparation** (interno) | **KEEP** como interno; no exponer |
| `preparation` | `planner_goals.lifecycle` `20260908000001:40`; TS `PlannerPlanV1.ts:5-10` | Preparation | **REPLACE** por `draft` |
| `active` | ambas | Active | **KEEP** |
| `paused` | ambas | Paused | **KEEP** |
| `completed` | ambas | Completed | **KEEP** |
| `closed` | **`planner_plans` sólo** `:40` + `closed_at`/`closed_reason` `:28-29` | **Cancelled** | **CONFLICTO DE NOMBRE** → `OWNER DECISION` |
| `cancelled` | **`planner_goals` sólo** `20260908000001:40` + `status='closed'` | **Cancelled** | **KEEP** (es el nombre del Target) |
| `trash` | **sintético**: `plan.trashed_at ? 'trash' : plan.lifecycle` `planner.plans.service.js:160` | Trash (ortogonal) | **KEEP**, pero es proyección, no columna |
| `archived` | **no es estado**: `archived_at` `:30` + CHECK `archive_terminal_only` `:49-51` | Archive (ortogonal) | **KEEP** |
| `blocked`, `review` | `planner.attention.service.js:238,269` | — | **DEAD CODE** — `RUNTIME VERIFIED`: 0 filas, y el CHECK no los admite |
| `status` (`active/completed/closed`) | `planner_goals.status` `20260713002000:26` + trigger proyector `20260908000002:26-47` | derivado | **REPLACE**: eliminar la columna |
| `failed_at` | `planner_goals:28` | — | **RETIRE LATER** — la función de validación contempla `'failed'` que el CHECK **prohíbe** (`RUNTIME VERIFIED`) |
| `deleted_at` | `planner_goals:30`, `planner_goal_milestones:92` | Trash | **REPLACE** por `trashed_at` único |
| `pending`/`completed` (milestone) | `planner_plan_milestones.lifecycle:79` | — | **RETIRE LATER** |
| `achieved` (bool) | `planner_goal_milestones:87` | — | **RETIRE LATER** |

### 10.2 Comportamiento real de cada transición (canónico, `20260722049000`)

| Transition | Precondición | Efecto | Cascada a hijos |
|---|---|---|---|
| `activate` | `draft` | `lifecycle='active'`, `activated_at=now()`, `paused_at=null` `:248-260` | — |
| `pause` | `active` | `lifecycle='paused'`, `paused_at=now()` `:261-263` | **NINGUNA** ✔ |
| `resume` | `paused` | `lifecycle='active'`, `paused_at=null` `:264-266` | **NINGUNA** ✔ |
| `complete` | `active` \| `paused` | `lifecycle='completed'`, `completed_at`, `paused_at=null` `:267-277` | **NINGUNA** ✔ (bloquea sólo requirements raíz `necessary` sin `confirm_unresolved`) |
| `close` | `active` \| `paused` | `lifecycle='closed'`, `closed_at`, `closed_reason` `:278-280` | **NINGUNA**, y **cero verificación** de hijos |
| `reopen` | `completed` \| `closed` | `lifecycle='active'`, **`archived_at=null`** `:281-283` | **NINGUNA**; **no** limpia `completed_at`/`closed_at`/`closed_reason` ⇒ dato obsoleto |
| `archive` | `completed` \| `closed` AND `trashed_at IS NULL` | `archived_at=now()` `:284-286` | — |
| `unarchive` | `completed` \| `closed` | `archived_at=null` `:287-289` | — |
| `trash` | `trashed_at IS NULL` | 4 campos de trash `:290-294` | **NINGUNA** ⇒ hijos sobreviven |
| `restore` | `trashed_at IS NOT NULL` | limpia los 4 `:295-299` | **NINGUNA** ⇒ hijos no se restauran |

**Conformidad con Product Truth §11/§13:**
- Completar **no** completa Tasks ✔ (no hay cascada)
- Completar **no** modifica Events ✔
- Completar **no** modifica Measurements ✔
- Pausar **no** pausa hijos ✔
- Reopen `Completed → Active` ✔ · `Cancelled → Active` — **no hay `reopen` desde `cancelled` en `planner_plans`**; en `planner_goals` sí (`planner.goals.service.js:917-928`)

### 10.3 `NEW` — Reopen limpia `archived_at` (implicitación)
`20260722049000:282` `set lifecycle='active', archived_at=null`. **Un Plan archivado que se reabre se desarchiva sin que nadie lo pida.** Product Truth §14 declara Archive **ortogonal**. ⇒ **Mezcla confirmed.**

### 10.4 La cascada silenciosa (P0)
`planner_plan_recompute_automatic_milestones` (`20260722040000:584-623`), **VOLATILE** (`provolatile='v'`, `RUNTIME VERIFIED`; el input audit dijo `stable` — **`CHANGED`**), `SECURITY INVOKER` (`prosecurity_definer='f'`), `revoke all` a `authenticated` (`:1625`).

**5 call sites vigentes**: `20260722049000:410,503,587,657` + `20260722090002:538`. Los 4 de `20260722040000` pertenecen a la v1 dropeada.

Comportamiento:
1. Completa milestones `automatic` cuando todos sus hijos `necessary` están satisfechos
2. **Reabre** milestones `automatic`, incluidos los completados **a mano**, cuando un hijo deja de estar satisfecho
3. `SET completed_by_person_id = null, completed_by_member_id = null` **sin condición en la lista SET** (`:615-616`), pero el `WHERE` filtra `m.lifecycle is distinct from d.lifecycle` (`:618`) ⇒ sólo afecta filas cuyo lifecycle **cambia** en esa pasada. **Confirmado con matiz.**
4. **Loop hasta 64 iteraciones** (`exit when v_changed = 0 or v_iteration >= 64;` `:620`) y **sale sin error, sin warning, sin código de salida** ⇒ estado parcialmente recomputado sin señal. **Confirmado.**
5. `apply_..._changeset_rpc` **no comprueba `completion_mode`** al completar (`:342-347`), a diferencia del escritor canónico (`20260722049000:373`) ⇒ un `automatic` marcado `completed` a mano es revertido por el recompute.

**Clasificación P0: viola "Nunca cascada silenciosa".**

### 10.5 Comportamiento en `planner_goals` (sistema alcanzable)
`completeGoal` (`planner.goals.service.js:807-824`): `status='completed'`, `lifecycle='completed'`, `completed_at=now()` y **devuelve `progress_percentage: 100` hardcodeado** (`:855`). **Cero verificaciones**, cierra a ciegas. Sin cascada a milestones (`:168-171`, `:219-223`) ni a Tasks (`goal_id` sobrevive: es UPDATE, no DELETE).
`trashGoal`/`restoreGoal` (`:690-704`, `:736-764`): sin cascada. **`DELETE /goals/:id` es alias de trash.**

### 10.6 Comportamiento legacy que debe eliminarse — lista exacta

| # | Legado a eliminar | Evidencia |
|---|---|---|
| L1 | `planner_goals.status` + trigger proyector sobrescritor `20260908000002:26-47` (que además **sólo re-proyecta si cambia `lifecycle`** ⇒ divergencia silenciosa en UPDATE de `status` sin cambio de `lifecycle`) | `20260908000002:34-36` |
| L2 | `attachProgress` + 5 `progress_mode` + `progress_percentage` | `planner.goals.service.js:139-219` |
| L3 | `failed_at` y la rama `'failed'` de validación que el CHECK prohíbe | `202607080004:28` vs `RUNTIME VERIFIED` |
| L4 | `deleted_at` en `planner_goals` y `planner_goal_milestones` | `202607080004:30,92` |
| L5 | `closed` vs `cancelled` como nombre del terminal | `OWNER DECISION` |
| L6 | `reopen` que borra `archived_at` | `20260722049000:282` |
| L7 | `planner_plan_recompute_automatic_milestones` (cascada + pérdida de autoría + tope silencioso) | `20260722040000:584-623` |
| L8 | `resume` fuera de la whitelist de transiciones (409) | `planner.plans.v1.service.js:32,101-108,404` |
| L9 | `validateLifecycle` exportada y nunca invocada; `PLAN_LIFECYCLE_VALUES` sólo la consume | `planner.plans.v1.service.js:71,700` |
| L10 | `GoalForm.tsx:195` presenta un selector de modo con formato `% / %`; `:304-305` inventan `('100','%')` | |
| L11 | Barras de porcentaje en 4 superficies (2 alcanzables) | §9.1 |

---

## 11. PHASE 10 — ARCHIVE / TRASH / RESTORE

**Se auditan por separado. `CONFIRMED CURRENT`.**

### 11.1 ARCHIVE

| Aspecto | Sistema canónico (`planner_plans`) | Sistema Goals |
|---|---|---|
| Columna | `archived_at timestamptz` `20260722040000:30` | `archived_at` `20260908000001:46-47` |
| Restricción | `CHECK (archived_at IS NULL OR lifecycle IN ('completed','closed'))` `:49-51` — **`RUNTIME VERIFIED`** | — |
| Endpoint | **NINGUNO dedicado**: transición `archive` dentro de `POST /plans/:id/mutations` | `POST /v1/plans/:id/unarchive` → `planner.plans.v1.service.js:630` |
| Servicio | `structuralActions` `planner.plans.service.js:140-149` lo expone en `availableActions` | `:458-463,630-654` |
| UI | botón en `PlannerPlansSurfaces.tsx:189-197` | — |
| **Capability** | **`goal.archive` = `false` en los 6 roles** (`plannerCapabilities.js:125,165,205,245,285,325`; SQL `20260722040000:355`) | `planner.plans.v1.controller.js:211` la exige |
| **Efectivo** | **NINGÚN rol puede archivar ni desarchivar** en ninguno de los dos sistemas, salvo override de `households.config` | idem |
| Mezcla con lifecycle | **SÍ**: el CHECK ata archive a terminales, `availableActions` lo expone dentro de acciones de lifecycle, y `reopen` **borra `archived_at`** | |
| Pantalla | `ROUTE_NAMES.PlanArchive='PlannerPlanArchive'` declarado y **no registrado** | |

**`RUNTIME VERIFIED` parcial:** la sonda `planner_plan_actor_has_capability(household,'goal.archive')` devolvió `false` para los 5 roles, **pero también `false` para `planner.view`** ⇒ la función retorna falso por falta de contexto de actor, no por la matriz. La sonda es **`INCONCLUSIVE`**; la afirmación de la matriz muerta sigue siendo **`STATIC CONFIRMED`** (SQL `:355` + JS ×6).

### 11.2 TRASH

| Aspecto | Canonical | Goals |
|---|---|---|
| Columnas | `trashed_at`, `trashed_by_person_id`, `trashed_by_member_id`, `trash_operation_id` + `CHECK trash_actor_shape` `:31-34,52-56` | `trashed_at`, `trashed_by_member_id` |
| Endpoint | transición `trash` en `/mutations` | `POST /v1/plans/:id/trash` · `DELETE /goals/:id` |
| Estado resultante | `lifecycle` **intacto**; DTO re-deriva a `'trash'` (`planner.plans.service.js:160`) | |
| Cascada a hijos | **NINGUNA** `20260722049000:290-294` | NINGUNA |
| En la papelera transversal | **AUSENTE**: `planner.trash.service.js` no consulta `planner_plans` ⇒ **un Plan canónico trasteado desaparece sin salida** | presente (vía `supabaseAdmin`) |

### 11.3 RESTORE

| Aspecto | Canonical | Goals |
|---|---|---|
| Endpoint | transición `restore` en `/mutations` | `POST /v1/plans/:id/restore` → RPC `restore_goal_rpc` (`20260722010000:1744-1794`, con guard `authenticated actor required` `:1759`) |
| Efecto | limpia los 4 campos de trash; **no restaura hijos** | |
| Conoce prior state | **NO.** `trash_operation_id` registra quién y qué operación, **no** el `lifecycle` previo. Como trash no cambia `lifecycle`, el prior state es recuperable **por accidente de diseño** | **PÉRDIDA REAL**: el bridge `lifecycle→status` colapsa `preparation` y `paused` a `status='active'` (`20260908000002:16,18`) ⇒ tras restaurar, un Plan pausado es indistinguible de uno activo |
| Asimetría | trash de Plan **no** cascada a hijos, pero trash de milestone/measurement/condition **sí** cascada a requirements | |
| `NEW` | El `restore` de milestone/measurement/condition **no filtra `trashed_at IS NULL`** en requirements (`20260722049000:397-400,494-495,578-579`) ⇒ **resucita requirements que el actor había trasteado explícitamente** | |
| `NEW` | `planner_plan_measurement_history` **no tiene `trashed_at`** ⇒ al trastear el Plan, **todo su histórico sigue legible** por la policy `:645-646` | |
| `RUNTIME VERIFIED` | `planner_goals_select_visible` **no filtra `trashed_at`** (sí `deleted_at`) ⇒ **los Goals trasteados son visibles por SELECT directo**, mientras `can_select_planner_goal` sí los excluye ⇒ **asimetría verificada** | |

### 11.4 Veredictos de fase
> - **Archive ≠ Complete** ✔ ya separado por columnas. **Pero** el CHECK ata archive a terminales y `reopen` lo borra ⇒ **mezcla confirmed**.
> - **Archive es inalcanzable** (`goal.archive` muerta). **P0.**
> - **Trash ≠ Archive** ✔ conceptualmente, pero **`planner_plans` no está en la papelera** ⇒ el Trash transversal está incompleto.
> - **Restore no inventa lifecycle nuevo** ✔ en canónico; **pierde información de estado previo** en Goals.
> - **Restore resucita decisiones del usuario** (requirements) y **deja historial de Plan trasteado legible**. Ambos deben cerrarse.

---

## 12. PHASE 11 — PRIVACY / RLS  (P0)

### 12.1 Modelo de scope por tabla

| Tabla | Scope | Ownership | Evidencia |
|---|---|---|---|
| `planner_plans` | `scope IN ('personal','household')` | `owner_person_id` XOR `household_id`, **más** `created_by_member_id` NOT NULL en household y NULL en personal (`planner_plans_owner_shape`) | `20260722040000:15-17,39,44-48` — `RUNTIME VERIFIED` |
| `planner_events` | `scope` | `owner_person_id` XOR `household_id`, **inmutable en UPDATE** | `20260722030000:19-20,132-139,481-488` |
| `planner_goals` | **no tiene `scope`**; usa `visibility IN ('household','personal')` | **no tiene `owner_person_id`** (la columna no existe — `RUNTIME VERIFIED`) | `202607080004:12,44-45` |
| `planner_tasks` | **NINGUNO** | **NINGUNO** — sólo `household_id uuid not null` | `202606230001:9` |
| `planner_plan_*` (hijos) | heredan del Plan | — | |
| Measurement | **no tiene scope** — visibilidad 100% derivada del Plan | | `RUNTIME VERIFIED` |

### 12.2 Los 8 casos obligatorios

| Caso | Estado | Veredicto |
|---|---|---|
| Plan personal + Task personal | **LA ENTIDAD NO EXISTE** (`planner_tasks` sin scope). Si se interpreta "Task creada por una persona y no asignada", la validación **lo permite** (sólo compara `household_id`) | **GAP DE MODELO (P0)**, no fuga hoy |
| Plan personal + Task household | **RECHAZADO** `20260722090002:165-171` | **CONFORME** |
| Plan household + Task personal | **N/A** — la entidad no existe | **GAP DE MODELO** |
| Plan household + Task household | Permitido si `household_id` coincide `:165-171` | **CONFORME en superficie**; armado por S1 |
| Plan personal + Event personal | Permitido si `owner_person_id` coincide `:172-183` | **CONFORME** |
| Plan household + Event household | Permitido si `household_id` coincide `:172-183` | **CONFORME** |
| Plan personal + Event household | **RECHAZADO** `:179` | **CONFORME** |
| Plan household + Event personal | **RECHAZADO** `:177` | **CONFORME** |
| Measurement en Plan personal | Visibilidad derivada del Plan; RLS `can_read(plan_id,false)` | **CONFORME** |
| Measurement en Plan household | idem | **CONFORME** |

> **Measurement pertenece al Plan y hereda su boundary sin crear bypass. `CONFIRMED`.**

### 12.3 Modelo RLS de `planner_plans` — correcto y bien diseñado
`RUNTIME VERIFIED` (`pg_policies`): **una sola policy** `planner_plans_select` USING `planner_plan_can_read(id,false)`.
Grants (`RUNTIME VERIFIED`): `revoke all` a `public/anon/authenticated` `:656` + **`grant select`** `:664-667`. **Ningún `grant insert/update/delete to authenticated` en las 8 tablas del dominio.** Escritura exclusiva vía `write_planner_plan_graph_rpc` y `apply_planner_plan_structure_changeset_rpc`, ambos `SECURITY DEFINER`.
`planner_plan_can_read` (`:362-382`): personal ⇒ `owner_person_id = current_person_id()`; household ⇒ `current_household_member_id IS NOT NULL` **AND** `planner_plan_actor_has_capability(...,'planner.view')` **AND** (`lifecycle <> 'draft'` OR `created_by_person_id = current_person_id()`) ⇒ **los drafts de household son creator-privados. Correcto.**

### 12.4 `RUNTIME VERIFIED` — superficie de privilegios `authenticated`

| Función | `SECURITY DEFINER` | `authenticated` EXECUTE | `anon` EXECUTE |
|---|---|---|---|
| `planner_plan_actor_has_capability` | sí | sí | **no** |
| `planner_plan_can_read` | sí | sí | **no** |
| `planner_plan_can_mutate` | sí | sí | **no** |
| `planner_plan_authorization_context_rpc` | sí | sí | — |
| `planner_plan_requirement_satisfied` | sí | sí | — |
| `planner_plan_requirement_satisfied_internal` | sí | **no** | no |
| `planner_plan_external_link_dto` | sí | **no** | no |
| `planner_plan_validate_external_link` | **no** | **no** | no |
| `planner_plan_recompute_automatic_milestones` | **no** | **no** | no |
| `planner_plan_safe_audit_state` | **no** | no | no |
| `read_planner_plan_graph_rpc` | sí | sí | no |
| `apply_planner_plan_structure_changeset_rpc` | sí | sí | no |
| `write_planner_plan_graph_rpc` | sí | sí | **SÍ** |
| `restore_goal_rpc` | sí | sí | no |
| **`trash_goal_rpc`** | sí | sí | **SÍ** |

`planner_plan_external_link_dto` es `SECURITY DEFINER`, `EXECUTE` restringido a `service_role`, pero **selecciona `planner_tasks` (`:42`) y `planner_events` (`:71`) y devuelve sus `title` (`:63`, `:96`)**, bypasseando RLS. Sus filtros manuales de scope (`:51`, `:80-84`) son equivalentes a las policies actuales ⇒ **no hay fuga neta hoy**, pero la dependencia es **duplicada y manual, no estructural**. Arm cargado.

### 12.5 `NEW` — P0: `trash_goal_rpc` es ejecutable por `anon` y no verifica capability

`proacl` en vivo:
```
trash_goal_rpc            = {=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}
write_planner_plan_graph_rpc = {=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}
restore_goal_rpc          = {postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
```
`=X` = **EXECUTE otorgada a `PUBLIC`**. El `grant execute … to authenticated` explícito de `20260713003000:177` **no explica** el `PUBLIC` ⇒ hay un otorgamiento a `PUBLIC` sin origen identificado. **Hallazgo ausente del input audit.**

Cuerpo de `trash_goal_rpc` (`20260713003000:129-175`):
- `security definer` `:136` ⇒ bypasa RLS
- **NO** tiene guard `authenticated actor required` (el hermano `restore_goal_rpc` v2 **sí** lo tiene, `20260722010000:1759`)
- **NO** llama a `can_update_planner_goal` ni a ninguna capability
- Único filtro: `household_id in (select household_id from household_members where id = v_member_id)` `:152`
- `v_member_id := public.current_household_member_id(null)` si `p_member_id` es null `:143-145` — **pero `p_member_id` es un parámetro del llamante**

`anon` tiene `SELECT` sobre `household_members` y `people` (`RUNTIME VERIFIED`). Por tanto:
> **Un llamante no autenticado (`anon`) puede invocar `trash_goal_rpc(goal_id, expected_version, <cualquier member_id>)` y escribir `trashed_at` sobre cualquier goal de ese household**, porque corre con privilegios del owner, no valida capability, y el parámetro `p_member_id` es controlado por el llamante.

**No se ejecutó la llamada (habría mutado datos). El hallazgo es `STATIC CONFIRMED` en el cuerpo de la función + `RUNTIME VERIFIED` en la superficie de privilegios.**
`write_planner_plan_graph_rpc` también tiene `=X`, **pero** tiene el guard `authenticated actor required` en `:75` ⇒ **falla cerrado**. Severidad: **`trash_goal_rpc` = P0**.

### 12.6 `NEW` — over-grant sobre dos vistas del dominio Plans
`RUNTIME VERIFIED` (`pg_class.relacl`):
```
planner_plan_indicators            = {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}
planner_legacy_goal_plan_projection= {postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}
```
`arwdDxtm` = INSERT/SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER **para `anon` incluido**, mientras la migración sólo otorgan `select` (`20260722040000:706`, `:1605`).
Impacto real: `planner_plan_indicators` tiene `GROUP BY` ⇒ **no es auto-updatable** ⇒ INSERT/UPDATE/DELETE fallarían en parse, noNrisk de datos. `planner_legacy_goal_plan_projection` es un `LEFT JOIN` simple ⇒ **es auto-updatable** ⇒ `authenticated`/`anon` **podrían escribir en `planner_goal_milestones` a través de la vista**, saltándose el trigger de versión y las policies de la tabla base. **P1, requiere verificación runtime antes de tocar nada.**

### 12.7 Regla absoluta y veredicto
> **RELATIONSHIP MUST NEVER WIDEN VISIBILITY.**

| # | Hallazgo | Sev | Evidencia |
|---|---|---|---|
| **NEW-A** | `trash_goal_rpc` ejecutable por `anon`, `SECURITY DEFINER`, sin verificación de capability, con `p_member_id` del llamante | **P0** | `20260713003000:129-175` + `proacl` en vivo |
| **NEW-B** | `planner_legacy_goal_plan_projection` auto-updatable con `arwdDxtm` a `anon`/`authenticated` | **P1** | `relacl` en vivo + `:1549-1568` |
| **NEW-C** | `planner_plan_indicators` con `arwdDxtm` a `anon` (no explotable: no auto-updatable) | **P2** | `relacl` en vivo |
| S1 | `planner_plan_external_link_dto` definer lee Tasks/Events y devuelve titles sin pasar por RLS | **P1 armado** | `20260722090002:29,42,63,71,96` |
| S2 | `planner_plan_validate_external_link` INVOKER llamada desde un RPC DEFINER ⇒ corre con privilegios del owner | **P2** | `:161` + único call site `:470` dentro de `:201` |
| S3 | El escritor del link **no valida `trashed_at`** de la entidad enlazada | **P1** | `:472-476` |
| S4 | `planner_goals_select_visible` no filtra `trashed_at` | **P1** | **RUNTIME VERIFIED** |
| S5 | `planner_goals` sin `owner_person_id` | **P2** | `RUNTIME VERIFIED` (columna inexistente) |
| S6 | Dos modelos de identidad incompatibles (`visibility`/member vs `scope`/person) | **P1 estructural** | |
| S7 | `planner_tasks` sin scope ⇒ **Task personal no existe** | **P0 de modelo** | `202606230001:6-35` |
| S8 | `read_planner_plan_graph_rpc` pasó de INVOKER a DEFINER (`20260722090002:116`); la barrera es la comprobación manual `:149-150`, no la RLS | **P2 de fragilidad** | `RUNTIME VERIFIED` |
| S9 | `relforcerowsecurity = false` en **todas** las tablas del dominio | **P3** | `RUNTIME VERIFIED` (pg_class) |
| S10 | `planner_plan_can_mutate` no comprueba `trashed_at` | **P2** | `:384-422` |
| S11 | `planner_plan_measurement_history` legible para una measurement individualmente trasteada | **P2** | `:645-646` |

> **No hay fuga P0 de datos *de Plan* demostrada.** Hay **1 P0 de autorización** (`trash_goal_rpc`, NEW-A), **1 P0 de modelo** (Task sin scope, S7), y **1 P1 armado** (S1). **La relación Plan↔componente que se construya debe Nacerse con la intersección de permisos**, no con la unión.

---

## 13. PHASE 12 — CROSS-PLANNER DEPENDENCIES

| Superficie | Fuente CURRENT | Servicio | Tabla | Sistema Plan | Si se corta `planner_goals` |
|---|---|---|---|---|---|
| **Home summary** | `GET /api/planner/summary` | `planner.summary.service.js:519` | `planner_goals:373` | **C (legacy)** | Sección degradada (`partial_errors`), `counts.goals=0`, `goal=null`. **Impacto de UI: CERO** (§13.1) |
| **Home render** | — | — | — | — | **Nunca lee `summary.goal` ni `counts.goals`. `HomeSummaryGoal` es tipo muerto** |
| **Search** | `GET /api/planner/search` | `planner.search.service.js:257` | **`planner_plans:245`** | **A (canónico)** | **Nada.** Coherente — y es el único sistema correcto |
| **Attention** | `GET /api/planner/attention` | `planner.attention.service.js:347` | **`planner_plans:233,264`** | **A** | Nada (ya roto: literales `blocked`/`review`) |
| **Activity** | `GET /api/planner/activity` | `planner.activity.service.js:159` (**huérfano**) | `planner_activity_log` | **ninguno** | Segue funcionando con DTOs huérfanos |
| **Trash** | `GET /api/planner/trash` | `planner.trash.service.js:202` | `planner_goals` + `planner_goal_milestones` (**`supabaseAdmin`**) | **C** | **FALLO DURO** (`:80`,`:151`), `PlannerTrashScreen` → `ErrorState` |
| **Tasks filter** | `GET /api/planner/tasks?goal_id=` | `planner.tasks.service.js:488-511` | `planner_goals:495` | **C** | 404 `goal_not_found` para cualquier `goal_id` |
| **Quick Actions** | — | `planner.plans.service.js:277` | `write_planner_plan_graph_rpc` → **`planner_plans`** | **A** | **No afectado.** Pero `create_goal` está **oculto** (`implemented:false`) ⇒ la escritura en `planner_plans` es inalcanzable |
| **Deep links** | `homeplus://planner/goals/:id` | `plannerDeepLinkCoordinator.ts:273-280` | destino **`planner_plans`** | **A** | El parser sigue produciendo el intent, pero el destino lee `planner_plans` ⇒ ya no hay lectura coherente para un goal id |
| **Notifications** | `plannerNotificationAdapter.ts:198-206` | `NoopNotifications` | — | — | `goal_detail` → mismo cross-system. Stub sin transporte |
| **Calendar / Schedules** | `GET /api/planner/schedules` | `planner.schedules.service.js` | `household_schedule_*` | **ninguno** | **Ninguna dependencia de Plan.** `PlannerSchedulesScreen` **no registrada** |
| **Inventory** | `/api/inventory/*` | `inventory.service.js` | `planner_tasks` | **ninguno** | Sin dependencia de Plan/Goal |
| **Homi / AI** | — | — | — | — | **NOT FOUND** — 0 coincidencias de `homi`/`ai.service`/`openai` en `backend/src` |

### 13.1 `RUNTIME VERIFIED`/`STATIC CONFIRMED` — Home no renderiza el Plan
El summary emite `counts.goals` y `goal` desde `planner_goals` (`planner.summary.service.js:373,445,569`). En el frontend, `counts.goals` aparece **sólo** en la validación de tipos (`homeSummaryTypes.ts:436`) y `summary.goal` **sólo** en checks de vacío (`useHomePlannerSummary.ts:150,220,243`). Ninguna pantalla los renderiza. **`HomeSummaryGoal` (`homeSummaryTypes.ts:65-80`) es un tipo muerto.**

### 13.2 `NEW` — Privacy asimétrica entre Attention y Activity
- `planner.attention.service.js:3-5` importa `buildPlannerAccessContext` / `isVisibleInPlannerContext` y lo aplica en **5 de 6 loaders** (`:156,208,245,276,324`).
- `planner.activity.service.js:159-207` **no aplica ningún filtro de privacidad**; su único filtro de alcance es `household_id` `:183`.
- El controller real de Activity (`planner.activity.controller.js:102-119`) **tampoco** aplica visibilidad.
**Asimetría de privacidad confirmada. P1.**

### 13.3 `REFUTED` — "planner_activity_log no tiene writer"
**Sí tiene writer**: `planner.activity.service.js:90-145` (`INSERT` vía `supabaseAdmin` en `:135-137`), con **20 call-sites** (`planner.plans.v1.service.js` 6, `planner.goals.service.js` 11, `planner.events.service.js` 3).
Lo que **es** cierto: `entity_type` **no admite `'plan'`** — ni en JS (`ALLOWED_ENTITY_TYPES` `activity.service.js:147`) ni en DB (`CHECK in ('task','event','goal','milestone')` `20260713005000:18-20`). El controller remapea `goal→plan` **sólo en presentación** (`planner.activity.controller.js:53-55`).
**`NEW`:** `planner.tasks.service.js` **no** llama `recordPlannerActivity` ⇒ **la actividad de Tasks nunca se registra**.

### 13.4 `NEW` — `planner_activity_log.household_id NOT NULL` vs Events personales
`20260713005000:7` — `household_id NOT NULL`. `planner.events.service.js:232` loguea Events con `context.householdId` ⇒ **un Event personal no puede registrarse en Activity**. Los RPC V1 esquivan esto con `planner_v2_append_audit`. **Consecuencia directa para Plans**: un Plan personal enlazado a un Event personal **no deja rastro en Activity**.

### 13.5 Lectura exhaustiva — quién toca cada tabla
`planner_goals` — **27 `.from()` en `backend/src`**: summary `:373` · trash `:69,125,136,139,195` (**admin**) · tasks `:495` · goals `:224,243,315,406,509,616,701,764,820,877,928,970,976` · plans.v1 `:141,160,194,275,352,467,531,595,608,653`
`planner_plans` — **4 SELECT directos + 4 RPC**: `planner.plans.service.js:244` · `planner.attention.service.js:233,264` · `planner.search.service.js:245` · RPCs en `planner.plans.service.js:260,269,279,326`

---

## 14. PHASE 13 — TEST SYSTEM AUDIT

### 14.1 Cómo funciona el cableado
`tests/run.js` **no descubre tests por glob**. `const commands = {…}` con **116 claves** (`:12-683`) y `const suites = {…}` con **96 suites** (`:685-824`). Ejecución por `process.argv[2]` (`:826-839`) vía `spawnSync`, y `tests/helpers/process.js:47-51` **aborta la suite en el primer fallo**.
`tests/db/run.js` y `tests/integration/run.js`: también listas hardcodeadas, sin glob.

### 14.2 `REFUTED` — "`npm run quality` corre 0 tests de Plan"
`quality` = 18 comandos (`tests/run.js:814-818`). **Dos tocan Plan**:
- `g0.3` → `scripts/planner_g0_3_cache_tests.js` (~90 asserts reales sobre `plannerCache`/`plannerKeys`)
- `db` → `tests/db/run.js:76-77` corre `planner_m11_int_01_shared_database_tests.js` + `…_s1_matrix_tests.js`, y `:63` corre `docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql`

**Pero el gate está ROJO hoy.** Ejecutado en esta sesión (`node tests/run.js typecheck`, sólo `tsc --noEmit`):
```
frontend-typecheck exit=0
test-typecheck     exit=1   → 5 errores TS, TODOS en scripts/planner_v1_navigation_tests.ts
                          :217 TS2367 · :218 TS2339 · :219 TS2367 · :387 TS2367 · :393 TS2367
```
`quality` **aborta en el comando 2 de 18**. **Los comandos 3-18 nunca se ejecutan.** `.github/workflows/homeplus-quality.yml:42` corre `npm run quality` ⇒ **CI está bloqueado por un archivo de test de Plan desalineado con el contrato de producción.**

### 14.3 Los 5 errores TS, causa raíz
| Assert | Test afirma | Contrato real |
|---|---|---|
| `:217` | `ROUTE_NAMES.PlanDetail === 'PlanDetail'` | `'GoalDetail'` (`plannerNavigationContract.ts:144`) |
| `:218` | `ROUTE_NAMES.PlanList` | **no existe** en `ROUTE_NAMES` (`:140-163`) |
| `:219` | `ROUTE_NAMES.PlanCreate === 'CreatePlan'` | `'CreateGoal'` (`:151`) |
| `:387` | `ENTITY_DETAIL_ROUTES.plan === 'PlanDetail'` | `'GoalDetail'` (`:411`) |
| `:393` | `resolveDetailRouteName('plan') === 'PlanDetail'` | `'GoalDetail'` (`:411`) |

### 14.4 Otros asserts falsos contra el código
| Test | Afirma | Realidad |
|---|---|---|
| `planner_v1_frontend_core_integration_tests.ts:49` | `PlannerScreen` contiene `return 'Eventos'` | **`return 'Calendario'`** (`PlannerScreen.tsx:804`) |
| `…:52` | `PlannerScreen` incluye `PlannerPlansScreen` | importa `PlannerPlanListScreen` (`:50`, render `:787`). `PlannerPlansScreen` es código muerto |

Ambos usan `node:assert` ⇒ **abortan**. La suite `planner-frontend-core-integration` **está rota en runtime**.

### 14.5 `NEW` — contradicción `create_goal`: **6 asserts cableados fallan hoy**
| Test | Assert | Resultado |
|---|---|---|
| `planner_v1_quick_actions_tests.ts:207,213,220` | `!goal.implemented` | ✅ pasa |
| `planner_v1_quick_actions_tests.ts:547,549,550` | `goal.implemented` + lista de 3 | ❌ **FALLA** |
| `planner_v1_goal_quick_create_tests.ts:119,122,136,152,156` | `goal.implemented`, 3 acciones visibles | ❌ **FALLA** |
La verdad del código es `implemented: false` (`plannerQuickActions.ts:126`). `planner_v1_quick_actions_tests.ts` **se contradice a sí mismo** (`:213` vs `:547`).
⇒ **`node tests/run.js planner` está roto en `planner-v1-m4` y `planner-v1-m5`.**

### 14.6 Dead / tautológicos
| Archivo | Bytes | Problema |
|---|---|---|
| `tests/planner_plans_v1_lifecycle_pure.test.js` | 10 560 | **Reimplementa todo el dominio localmente** (`:5-87`) y se autoafirma (`:111-116,143-147,216`). **0 imports.** |
| `tests/planner_slice2_pure.test.js` | 13 167 | Copia literal del anterior + `:91-107`. Autoafirmaciones `:136-137,240,266,277-279,319`. **0 imports.** |
| `tests/planner_slice2_integration.test.js` | 8 492 | 21 asserts, pero **10 son tautológicos**; **3 de 14 tests sólo tienen `console.log`** (`:153-156`, `:170-173`, `:176-178`). **Nunca se ejecuta.** |
| `planner_v1_goal_quick_create_tests.ts:165-187` | — | **5 tautologías exactas**: `const expectedDefault='home'; assert(expectedDefault==='home')` |
| `planner_v1_p2a_milestone_editor_tests.ts:258-259` | — | Assert permisivo `(:258)` **subsumido** por el estricto `(:259)` ⇒ `:258` es código muerto |

Los 8 `tests/planner_*.test.js` están **git-tracked y jamás referenciados** por `package.json`, `tests/run.js`, `tests/db/run.js`, `tests/integration/run.js` ni los workflows.

### 14.7 Los 25 archivos DEAD de `scripts/` (los más pesados son los de Plan)
`planner_m11_3a_database_tests.js` (**64 646 B**, Plan Graph contra Postgres), `planner_m11_3a_contract_tests.js` (**17 554 B**, valida el SQL de `planner_plans`/`_milestones`/`_measurements`/`_requirements`), `planner_m11_1a_database_tests.js` (58 054), `planner_m11_1b_database_tests.js` (59 368), `planner_m11_2a_event_database_tests.js` (36 982), `planner_m11_11a_2b_active_search_tests.ts`, `planner_m11_11a_2c_attention_activity_tests.ts` (**NOT WIRED**, 13 763), `planner_v1_presets_drafts_frontend_tests.ts` (47 675, se corre el gemelo `.js` de 8 208).
⚠️ `planner_m11_3a_test_runner.js:22-24` ejecuta **`supabase db reset --local`** ⇒ **prohibido por la regla absoluta de esta sesión.**

### 14.8 `NEW` — el gate de DB de `quality` no cubre el dominio Plan
`docs/implementation/planner/PLANNER_V0_SCHEMA_CHECKS.sql` (ejecutado por `tests/db/run.js:63`) valida `planner_tasks`/`planner_events`/`planner_goals` legacy. **Cero referencias** a `planner_plans`, `planner_plan_milestones`, `planner_plan_measurements`, `planner_plan_requirements`.
Y `scripts/planner_p1_structure_database_tests.js` — **la única red DB de Plan** — está cableado (`:379-383`) pero **no tiene script npm** y la suite `planner-p1-structure-db` (`:761`) **no está** en `planner` ni en `quality`. **Está huérfana.**

### 14.9 `NEW` — skip silencioso de DB
`tests/db/run.js:34-38`: si `client.connect()` falla y `HOMEPLUS_TEST_REQUIRE_LOCAL_DB !== '1'` ⇒ `console.log('SKIPPED: …')` y `return` con **exit 0**.
⇒ **Un `quality` verde en local no prueba nada sobre persistencia.** Sólo en CI se vuelve fatal (`homeplus-quality.yml:44`).

### 14.10 Matriz de cobertura Target

| Capacidad | Test existente | Wired | Confiable | Acción |
|---|---|---|---|---|
| Plan create | `planner_v1_frontend_plans_tests.ts:317-348` | sí | MEDIA (payload/adapter, sin HTTP ni DB) | agregar |
| Plan list | `planner_v1_frontend_plans_tests.ts:282-296` | sí | MEDIA (fixtures). `listCanonicalPlans` sin test | agregar |
| Plan detail | `planner_v1_frontend_plans_tests.ts:298-315` | sí | MEDIA (proyección sobre fixture). `getCanonicalPlanGraph` sin test | agregar |
| **Task link** | `…:311-312` (sólo lectura de intents) | sí | BAJA | **agregar escritura** |
| **Task unlink** | **NINGUNO** | — | — | **agregar** (`grep unlink` en los 27 wired = **0**) |
| Event link | `…:313` (fixture) | sí | BAJA | agregar |
| **Event unlink** | **NINGUNO** | — | — | **agregar** |
| **Measurement create** | **NINGUNO** (el DB test inserta por SQL crudo sólo como setup) | — | — | **agregar** |
| **Measurement update** | **NINGUNO** | — | — | **agregar** |
| Required | `planner_p1_structure_contract_tests.ts:277,243` | sí | **ALTA** | mantener |
| Optional | `planner_p1_structure_database_tests.js:324` | por CLI | **ALTA** | cablear |
| Readiness | `planner_p1_structure_contract_tests.ts:233-255` | sí | **ALTA** | mover a backend |
| Progress | — | — | — | **crear** (factual) |
| Pause | `planner_v1_frontend_plans_tests.ts:383` | sí | BAJA (sólo string, sin persistir) | agregar |
| **Resume** | `…:383` | sí | **BAJA** — y el 409 está **sin test** | agregar |
| Complete | `…:383` + `p1_structure_contract:250` | sí | MEDIA | agregar |
| Complete with pending | `p1_structure_contract:247-252` + DB `:345,348` | por CLI | **ALTA** | cablear |
| Cancel | `…:383` (acepta `'close'`) | sí | MEDIA — vocab divergente | agregar |
| Reopen | `…:383,402-409` | sí | MEDIA | agregar |
| **Archive** | `…:402-409` | sí | MEDIA — **el 403 nunca se prueba** | agregar |
| Unarchive | `…:407` | sí | MEDIA | agregar |
| Trash | `…:404,406` | sí | MEDIA | agregar |
| Restore | `…:408` | sí | MEDIA — `restorePlan` sin test | agregar |
| **Privacy** | `p1_structure_contract:257-268` | sí | MEDIA (alcance de Plan). **RLS sin ejecutar** | agregar DB |
| Home | `planner_v1_m8_tests.js`, `planner_v1_m9_tests.js` | sí | MEDIA/BAJA. m9 `:35` "Minimal re-implementation" ⇒ **0 requires** | reescribir |
| Search | `planner_v1_m7_tests.ts` | sí | **ALTA** (navegación) | mantener |
| **Attention** | — | — | — | **crear** (el archivo real, 13 763 B, es NOT WIRED) |
| **Activity** | **NINGUNO** | — | — | **crear** |

### 14.10bis Tests queelsen el Product Truth
| Test | Afirma |
|---|---|
| `planner_p1_structure_contract_tests.ts:278` | `!JSON.stringify(snapshot).includes('percentage')` |
| `planner_v1_frontend_plans_tests.ts:279,443-451` | sin `percentage` / `progress_percentage` / `universal percentage` en `plannerPlans.ts` y `PlannerPlansSurfaces.tsx` |
| `planner_p1_structure_contract_tests.ts:236` | sin milestones/measurements/manualConditions/requirements ⇒ `NO_USEFUL_STRUCTURE` |
| `planner_v1_p2a_milestone_editor_tests.ts:259` | 1 milestone ⇒ `READY` |
| `planner_p1_structure_database_tests.js:320-329` | matriz de 10 escenarios de activación con milestones |
Los tres primeros **prohíben el porcentaje** ⇒ **compatible con el Target.** Los tres últimos **afirman Milestones como contenido del Plan** ⇒ **contradicen el Product Truth §19.**
**Contraprueba**: `planner_v1_m9_tests.js:142` y `planner_v1_m8_tests.js:342` **exigen** `progress_percentage` en Goals/Home ⇒ **doble verdad de producto, sin reconciliar.**

### 14.11 Baseline QA mínima antes de tocar persistencia

| # | Bloque | Comando | Criterio |
|---|---|---|---|
| **B0** | **Reparar el gate rojo** | `npm run typecheck` | exit 0 en **ambos** typechecks. Las correcciones se hacen **contra `plannerNavigationContract.ts:144,151` y `PlannerScreen.tsx:799-810`**, no contra el test |
| **B1** | Contrato de navegación | `node tests/run.js planner-m1` | `Failed: 0` |
| **B2** | Verdad de estructura | `node tests/run.js planner-p1-structure-contract` + `planner-p2a-milestone-editor` | exit 0 |
| **B3** | Puente frontend core | `node tests/run.js planner-frontend-core-integration` | exit 0 tras alinear `:49`/`:52` |
| **B4** | Mutaciones de Plan + quick actions | `planner-frontend-plans`, `planner-plan-duplicate-dispatch`, `planner-m4`, `planner-m5` | exit 0 |
| **B5** | Persistencia real **forzada** | `HOMEPLUS_TEST_REQUIRE_LOCAL_DB=1 node tests/run.js planner-p1-structure-db` + `npm run test:db` | exit 0 con `supabase status` verificado |

**B0 es bloqueante absoluto**: sin él no existe evidencia, porque `quality` muere en el comando 2.

---

## 15. PHASE 14 — RUNTIME CHECK

### 15.1 Qué se pudo verificar y qué no

| Capa | Estado | Nota |
|---|---|---|
| **DB / SQL** | ✅ **`RUNTIME VERIFIED`** | 20+ sondas read-only (`SELECT`, `pg_policies`, `pg_class`, `pg_proc`, `has_function_privilege`, `has_table_privilege`, y funciones de lectura). `SET LOCAL default_transaction_read_only = on` en cada bloque |
| **Backend HTTP / app** | ⛔ **`BLOCKED`** | El dev server en `:8081` pertenece al worktree **`homecloud-current`**, no a `planner-current` (`Get-CimInstance Win32_Process` → `...homecloud-current\front\mi-front-limpio\node_modules\...expo`). El puerto `:8443` es el Vite de **`Figma-app`**. Arrancar un dev server nuevo escribiría cachés en el worktree ⇒ viola la regla READ-ONLY |
| **Auth / sesión real** | ⛔ **`BLOCKED`** | Sin token de usuario no hay `current_person_id()`; las sondas con `SET ROLE authenticated`angleron 0 filas por falta de actor, no por policy |

### 15.2 Resultados de las 17 comprobaciones del runtime

| # | Verificación | Resultado | Etiqueta |
|---|---|---|---|
| 1 | Abrir Plan recién creado desde la lista | El `SELECT read_planner_plan_graph_rpc(goal_id)` devuelve **NULL** ⇒ 404 | **`RUNTIME VERIFIED`** (capa SQL) |
| 2 | `GET /api/planner/attention` con lifecycle `blocked`/`review` | 0 filas; el CHECK no los admite | **`RUNTIME VERIFIED`** |
| 3 | `archive` como `adult` ⇒ ¿403? | matriz `goal.archive=false` en SQL+JS. Sonda de actor **`INCONCLUSIVE`** | `STATIC CONFIRMED` |
| 4 | `resume` en Sistema B ⇒ ¿409? | `paused→['active','completed','cancelled']` no incluye `'resume'`; el handler `:404` existe | **`STATIC CONFIRMED`** (función pura) |
| 5 | `count(*)` por tabla | §3.2 | **`RUNTIME VERIFIED`** |
| 6 | ¿`planner_plans` tiene filas? | **0** | **`RUNTIME VERIFIED`** |
| 7 | ¿`planner_plan_legacy_goal_links` vacía? | **0 filas** | **`RUNTIME VERIFIED`** |
| 8 | Requirements external con `external_entity_id` | **0** | **`RUNTIME VERIFIED`** |
| 9 | Goals `visibility='personal'` | **0** | **`RUNTIME VERIFIED`** |
| 10 | Goals `lifecycle='cancelled'` | **0** | **`RUNTIME VERIFIED`** |
| 11 | Filas con `deleted_at` **y** `trashed_at` | **0** | **`RUNTIME VERIFIED`** |
| 12 | `completed_by_*` de milestones perdidos | **0** | **`RUNTIME VERIFIED`** |
| 13 | ¿el actor puede SELECTear goals trasteados? | La policy `planner_goals_select_visible` **no filtra `trashed_at`** ⇒ **SÍ** (policy inspeccionada en vivo) | **`RUNTIME VERIFIED` (policy)** / `NOT REPRODUCED` (con filas) |
| 14 | `planner_plan_external_link_dto` con Task personal ajena | **0 requirements ⇒ no reproducible.** Sonda alternativa: **`prosecdef = true`** y EXECUTE restringido a `service_role` ⇒ **arm confirmado, no explotado** | **`RUNTIME VERIFIED` (superficie)** |
| 15 | `node tests/run.js planner` | **typecheck falla** (5 errores TS) ⇒ la suite no arranca | **`RUNTIME VERIFIED`** |
| 16 | `npm run quality` | **ROJO** en el comando 2/18 | **`RUNTIME VERIFIED`** |
| 17 | `planner-p1-structure-db` con Postgres | Postgres disponible; el comando no tiene script npm. **No ejecutado** (no autorizado a mutar) | `NOT RUN` |

### 15.3 Checklist PHASE 14 del encargo

| # | Paso | Resultado |
|---|---|---|
| 1 | Abrir tab Planes | **NOT RUN** (app no disponible) |
| 2-11 | crear/list/detail/edit/pause/complete/cancel/archive/trash/restore | **NOT RUN** |
| 12 | Task sin Plan | **`PASS`** a nivel datos: 3 Tasks, **0** con `goal_id` |
| 13 | Task relacionada | **`NOT APPLICABLE`** a nivel datos: **0** requirements external |
| 14 | Event independiente | **`PASS`** a nivel datos: 0 Events (`planner_events` vacío ⇒ un Event independiente es el estado real) |
| 15 | Search Plan | **NOT RUN** |
| 16 | Home Plan | **STATIC CONFIRMED**: Home lee `planner_goals` y **no renderiza** `goal`/`counts.goals` |
| 17 | Attention Plan | **`RUNTIME VERIFIED`**: 2 de 4 fuentes permanentemente vacías |

---

## 16. PHASE 15 — LEGACY / MIGRATION MAP

`RUNTIME VERIFIED`: **el 100 % del dominio Plan legacy está vacío** salvo 1 `planner_goals`, 3 `planner_tasks` y 1 `planner_activity_log`. Esto cambia el perfil de riesgo radicalmente.

| # | Objeto | Ubicación | Filas | Clasificación |
|---|---|---|---|---|
| L-01 | `planner_goals` | `202607080004:5-33` | **1** | **MIGRATE** (1 fila QA) → `planner_plans`, luego `DELETE LATER` |
| L-02 | `planner_goal_milestones` | `202607080004:80-95` | **0** | **READ ONLY** → `DROP` tras un ciclo |
| L-03 | `planner_plan_milestones` | `20260722040000:59-92` | **0** | **READ ONLY** → export frío (vacío) → `DROP` |
| L-04 | `planner_plan_requirements` | `20260722040000:172-216` | **0** | **READ ONLY** → export frío (incl. `parent_requirement_id`) → `DROP` |
| L-05 | `planner_plan_manual_conditions` | `20260722040000:142-170` | **0** | **READ ONLY** → `DROP` |
| L-06 | `planner_plan_legacy_goal_links` | `20260722040000:250-257` | **0** | **KEEP TEMPORARILY** — conserva `mapping_kind='reviewed_manual'`, el mecanismo legal de mapeo |
| L-07 | `planner_goals.status` + trigger proyector | `20260713002000:26`, `20260908000002:26-47` | — | **DELETE LATER** |
| L-08 | `progress_mode` / `target_type` | `202607100001:13-14`, `202607080004:56-60` | 1 fila `steps` | **DELETE LATER** |
| L-09 | `attachProgress` + `progress_percentage` | `planner.goals.service.js:139-219` | — | **DELETE LATER** |
| L-10 | `deleted_at` (`planner_goals`, `planner_goal_milestones`) | `202607080004:30,92` | 0 | **DELETE LATER** |
| L-11 | `failed_at` | `202607080004:28` | 0 | **DELETE LATER** |
| L-12 | `planner_tasks.goal_id` | `202607080004:116` | **0 no nulo** | **READ ONLY** → `DELETE LATER` |
| L-13 | Goal screens (`GoalDetailScreen` 939 L, `PlannerGoalsScreen`, `EditGoalScreen`, `PlannerGoalsForm`) | `HomeTabNavigator.tsx` (ausentes) | — | **DELETE LATER** (código muerto) |
| L-14 | `PlannerPlansScreen` | `screens/planner/PlannerPlansScreen.tsx:23` | — | **DELETE LATER** (código muerto) |
| L-15 | `services/plannerPlansV1.ts` | `:28-149` | — | **DELETE** (0 importadores) |
| L-16 | `planner.plans.v1.service.js` (transición `resume` rota, DTO muerto) | `:29-35,71,111-118,700` | — | **DELETE LATER** tras el cutover |
| L-17 | 6 endpoints de milestones legacy + 3 RPC `*_milestone_rpc` | `routes/planner.js:123-140`, `20260713003000:232,288`, `20260712120000:18` | — | **DELETE LATER** |
| L-18 | `planner_goal_project_status` vista/trigger | `20260908000002` | — | **DELETE LATER** |
| L-19 | 8 `tests/planner_*.test.js` tracked, sin referencias | `tests/` | — | **DELETE** (tautológicos) |
| L-20 | 25 archivos `scripts/planner_*` DEAD | `scripts/` | — | **DELETE LATER** — salvo los de Plan Graph, que hay **cablear** antes (§14.7) |
| L-21 | `validateLifecycle` + `PLAN_LIFECYCLE_VALUES` muertos | `planner.plans.v1.service.js:71,700` | — | **DELETE** |
| L-22 | `attention` literals `blocked`/`review` | `planner.attention.service.js:238,269` | — | **DELETE** (o reescribir contra el Target) |

### 16.1 Milestone NO migra automáticamente a Measurement
`NEW` — con **0 filas** en ambas tablas de milestones, **la clasificación pedida se resuelve trivialmente**: no hay nada que clasificar.

| Contenido | Destino | Filas a migrar |
|---|---|---|
| acción → **Task** | `planner_plan_components(component_kind='task')` | **0** |
| acontecimiento → **Event** | `planner_plan_components(component_kind='event')` | **0** |
| magnitud → **Measurement** | `planner_plan_measurements` | **0** |
| ambiguo → preserve / manual review | export frío | **0** |

**Regla que sí queda fijada para producción:**
- `planner_goal_milestones.target_value` es un **número sin `unit` ni operador** ⇒ **NO** es un Measurement conforme al Product Truth §06. Se descarta o se re-expresa con `unit` explícito, con decisión de Owner.
- `planner_plan_milestones.classification` (`necessary`/`supporting`) **es** Required/Optional ⇒ se preserva como tal si alguna vez hay filas.
- `planner_plan_milestones.completed_by_*` ya fue destruido por `recompute` — **pérdida ya ocurrida, irreversible**.
- **Ninguna migración automática de Milestone a Measurement debe escribirse antes de contar filas en el proyecto Supabase remoto.**

---

## 17. PHASE 16 — ROOT CAUSE REVALIDATION (32 causas)

| ID | Root cause (input audit §25) | Veredicto 2026-10-02 | Nota |
|---|---|---|---|
| **RC-001** | 2 sistemas Plan vivos, ambas tablas canónicas | **CONFIRMED CURRENT** | `20260722040000:1629` vs `20260908000001:96-97`; ambas `RUNTIME VERIFIED` |
| **RC-002** | Nomenclatura de versión invertida | **CONFIRMED CURRENT** | `routes/planner.js:70` vs `:143` |
| **RC-003** | `PlanDetail`→`GoalDetail` ⇒ cruce de tabla | **CONFIRMED CURRENT** + **`RUNTIME VERIFIED`** | `plannerNavigationContract.ts:144,151`; RPC devuelve NULL en vivo |
| **RC-004** | Relación Plan↔Task triplicada | **CONFIRMED CURRENT** | FK + requirement sin FK + `origin_*` sin FK |
| **RC-005** | Relación Plan↔Event sólo como requirement sin FK | **CONFIRMED CURRENT** | `plan_id`/`goal_id` en `planner_events`: NOT FOUND |
| **RC-006** | Vínculo Task hardcodeado a household | **CONFIRMED CURRENT** | `20260722090002:165-171`; `planner_tasks` sin scope |
| **RC-007** | Milestones en 2 tablas, vocabularios incomparables | **CONFIRMED CURRENT** | `lifecycle` vs `achieved`; restrict vs cascade |
| **RC-008** | Recompute completa/reabre en silencio + destruye autoría | **CONFIRMED CURRENT** | `20260722040000:584-623`; 5 call sites; `RUNTIME VERIFIED` (`provolatile=v`) |
| **RC-009** | 2 RPC de escritura con semánticas divergentes | **CONFIRMED CURRENT** | `:335-336,373,479,642` vs `20260722090002:316-324,342-347,400-406,507-512` |
| **RC-010** | Drift de vocabulario de lifecycle | **CONFIRMED CURRENT** | Los 3 CHECK `RUNTIME VERIFIED` |
| **RC-011** | `goal.archive` denegada a los 6 roles | **CONFIRMED CURRENT** | SQL `:355` + JS ×6; sonda de actor `INCONCLUSIVE` |
| **RC-012** | No existe namespace `plan.*`; JS≠SQL | **CONFIRMED CURRENT** | `planner_plan_can_mutate:411-418` mapea a `goal.*` |
| **RC-013** | Divergencia de proyección entre superficies | **CONFIRMED CURRENT** + **reprecisada** | Home→goals · Search/Attention→plans · Trash→goals+admin · Activity→log |
| **RC-014** | Attention consulta literales imposibles | **CONFIRMED CURRENT** + **`RUNTIME VERIFIED`** | 0 filas |
| **RC-015** | Contrato de progreso triple | **CONFIRMED CURRENT** | `REFUTED` el detalle de Home: el sort es JS en memoria (`:227-234`), no SQL |
| **RC-016** | Measurement completo en DB, sin superficie | **CONFIRMED CURRENT** | `PlannerPlanStructureEditScreen.tsx:17-28` |
| **RC-017** | `classification` duplicada | **CONFIRMED CURRENT** + **`REFUTED` en "coaccionada"** | La duplicación existe, pero la coacción **sólo** aplica a subjects internos y **el changeset puede divergir** (`20260722090002:397`) ⇒ invariante no fiable |
| **RC-018** | Requirement graph vivo para un concepto retirado | **CONFIRMED CURRENT** | **Corrección: son 4 índices únicos, no 5** |
| **RC-019** | Readiness sólo en frontend, sin endpoint | **CONFIRMED CURRENT** | |
| **RC-020** | Activation gate nunca cuenta Task ni Event | **CONFIRMED CURRENT** | `:1001-1010` |
| **RC-021** | Asimetría trash/restore | **CONFIRMED CURRENT** + **`NEW`** | Se añade: el restore de requirement **no filtra `trashed_at`** ⇒ resucita decisiones del actor |
| **RC-022** | `planner_goals` SELECT policy no filtra `trashed_at` | **CONFIRMED** + **`RUNTIME VERIFIED`** | policy inspeccionada en vivo |
| **RC-023** | `planner_goals` sin `owner_person_id` | **CONFIRMED** + **`RUNTIME VERIFIED`** | la columna **no existe**; el SELECT crashea si se pide |
| **RC-024** | `trash_goal_rpc` no verifica capability | **CONFIRMED** — **elevado a P0** | **`NEW`**: `proacl` con `=X` (PUBLIC) ⇒ `anon` ejecutable + `p_member_id` del llamante |
| **RC-025** | Dos marcas de borrado | **CONFIRMED CURRENT** — **0 filas** | `RUNTIME VERIFIED`: 0 doble-marca |
| **RC-026** | 0 tests de Plan en CI | **`REFUTED`** | `quality` corre `g0.3` y `db`. **PERO el gate está ROJO por 5 errores TS en un test de Plan** ⇒ el problema real es peor: no es ausencia de cobertura, es **cobertura que bloquea el gate** |
| **RC-027** | Client duplicado muerto | **CONFIRMED CURRENT** | 0 importadores |
| **RC-028** | Pantallas muertas con superficie de mutación | **CONFIRMED CURRENT** | |
| **RC-029** | `planner_plan_legacy_goal_links` sin escritor ni consumidor | **CONFIRMED** + **`RUNTIME VERIFIED: 0 filas`**; 2 readers (`planner_legacy_goal_plan_projection:1568`, reporte `:1580`) |
| **RC-030** | `finalization_kind` nunca leído | **CONFIRMED CURRENT** | |
| **RC-031** | `planner_tasks` sin scope ⇒ Task personal no existe | **CONFIRMED CURRENT** | |
| **RC-032** | Measurements sin CHECK de rango | **CONFIRMED CURRENT** | 0 filas negativas hoy |

### 17.1 Root causes NUEVOS (no estaban en el input audit)

| ID | Root cause | Evidencia | Sev |
|---|---|---|---|
| **RC-033** | **`trash_goal_rpc` es `SECURITY DEFINER`, ejecutable por `anon` (EXECUTE a PUBLIC), sin verificación de capability y con `p_member_id` controlado por el llamante** ⇒ escritura no autenticada sobre `planner_goals.trashed_at` | `20260713003000:129-175` + `proacl` en vivo | **P0** |
| **RC-034** | **`planner_legacy_goal_plan_projection` es auto-updatable y tiene `arwdDxtm` para `anon` y `authenticated`**, mientras la migración sólo otorga `select` ⇒ **se puede escribir en `planner_goal_milestones` saltándose triggers y policies** | `relacl` en vivo + `20260722040000:1549-1568` | **P1** |
| **RC-035** | **`write_planner_plan_graph_rpc` tiene EXECUTE para `PUBLIC`/`anon`**, mitigado sólo por un guard en el cuerpo (`:75`) ⇒ **si alguien mueve ese guard, la escritura del Plan canónico queda abierta a `anon`** | `proacl` en vivo + `:75` | **P2** (deuda de robustez) |
| **RC-036** | **`read_planner_plan_graph_rpc` cambió de `SECURITY INVOKER` a `SECURITY DEFINER`** ⇒ la barrera es una comprobación manual, no la RLS ⇒ cualquier endurecimiento futuro de RLS no se propaga | `20260722040000:1518` vs `20260722090002:116,149-150` | **P2** |
| **RC-037** | **La clasificación de requirement puede divergir de la del sujeto en silencio** (`apply_..._changeset_rpc:397` actualiza el sujeto sin sincronizar el requirement) ⇒ el "invariante" no es un invariante | `20260722090002:397` vs `:459-469` | **P1** |
| **RC-038** | **`planner_activity_log` tiene `household_id NOT NULL`** ⇒ los Events personales y, por extensión, los Planes personales **no dejan rastro en Activity** | `20260713005000:7` + `planner.events.service.js:232` | **P2** |
| **RC-039** | **La privacy es asimétrica**: Attention filtra visibilidad, Activity no. Y `planner.tasks.service` no registra actividad ⇒ **Tasks no aparecen en Activity en absoluto** | `attention:3-5,156` vs `activity:159-207` | **P1** |
| **RC-040** | **`planner_plan_measurement_history` es append-only sólo por GRANT**, no por constraint; y `service_role` tiene `INSERT/UPDATE/DELETE` | `RUNTIME VERIFIED` grants + ausencia de trigger | **P2** |
| **RC-041** | **`PlannerPlanDetailScreenV1` es alcanzable por la ruta literal `'PlanDetail'`** (`PlannerPlanCreateScreen.tsx:105`, `TaskForm.tsx:535`) ⇒ **el segundo cliente de Plan (el que lee `planner_goals`) sí tiene usuarios** | `HomeTabNavigator.tsx:202` | **P1** |
| **RC-042** | **`planner_tasks.goal_id` FK no compuesto con `household_id`** ⇒ la co-propiedad Task↔Goal se valida sólo en el RPC, no en el esquema | `202607080004:116` vs `20260722010000:251-268` | **P1** |

**Totales: 42 root causes — P0 17 · P1 18 · P2 7.**
*(32 heredadas: P0 15 · P1 11 · P2 6. + 10 nuevas: P0 2 · P1 6 · P2 2 — ver RC-041 que reclasifica y RC-026 que se corrige.)*

---

## 18. PHASE 17 — FINAL TECHNICAL DECISIONS

Formato: CURRENT · TARGET · EVIDENCE · WHY · RISK · ALTERNATIVES REJECTED.

### D1 — canonical Plan persistence
- **CURRENT:** `planner_plans` (grafo, 8 tablas, RLS, RPC-only, **0 filas**) y `planner_goals` (legacy, escritura directa, Home, Trash, la UI, **1 fila**).
- **TARGET:** `planner_plans`.
- **EVIDENCE:** `20260722040000:13-57` + grants `:656-671`; `20260908000001:96-97`; §3.2 runtime (0 vs 1); el flujo real del usuario es goals (`PlannerPlanListScreen.tsx:64`, `GoalForm.tsx:463`).
- **WHY:** `planner_plans` tiene el shape del Target, RLS correcto (select-only + RPC DEFINER), idempotencia, `version`, auditoría, constraint trigger, scope/owner, archive/trash. `planner_goals` tiene identidad por member (incompatible con `scope`/person) y sin `owner_person_id`.
- **RISK:** 8 superficies hay que cortar (§13). **Mitigación:** la única fila goals es QA; el backfill es trivial.
- **ALTERNATIVES REJECTED:** (a) quedarnos con `planner_goals` — no soporta `scope`, ni archive con CHECK, ni measurements, ni requirements; (b) mantener dos — es RC-001.

### D2 — canonical Plan API
- **CURRENT:** `/api/planner/plans` → `planner_plans` · `/api/planner/v1/plans` → `planner_goals` · `/api/planner/goals` → `planner_goals`.
- **TARGET:** **un** recurso `/api/planner/plans`, con sub-rutas explícitas.
- **EVIDENCE:** `routes/planner.js:70-74` vs `:143` vs `:123-133`; §2.10.
- **WHY:** la nomenclatura invertida ("v1" = legacy) es la causa de que la UI escriba en una tabla y lea de otra.
- **RISK:** 3 rutas registradas, clientes duplicados, y `planner_v1_navigation_tests.ts` afirma el contrato invertido.
- **ALTERNATIVES REJECTED:** mantener `/v1/plans` como canónico ( perpetuaría la ambigüedad); mantener las tres (no hay contrato).

### D3 — canonical Plan ID space
- **CURRENT:** dos espacios disjuntos (`planner_goals.id`, `planner_plans.id`), ambos `gen_random_uuid()`, sin FK ni trigger entre ellos.
- **TARGET:** **`planner_plans.id`.**
- **EVIDENCE:** `202607080004:6` vs `20260722040000:14`; `RUNTIME VERIFIED`: la RPC devuelve NULL para un id de goals.
- **WHY:** un solo espacio elimina por construcción la clase de bug "el id cruza de tabla".
- **RISK:** `planner_tasks.goal_id` y todos los deep links existentes apuntan al espacio viejo.
- **ALTERNATIVES REJECTED:** tabla puente de ids (tercera autoridad); un prefijo de tipo en el id (`plan:`) — ya existe para Search (`planner.search.service.js:182`) pero no se propaga.

### D4 — canonical frontend type
- **CURRENT:** 3 familias (`PlannerPlan.ts`, `PlannerPlanV1.ts`, tipos en `plannerGoals.ts`) + el tipo fantasma `scope` en `plannerTasks.ts:46`.
- **TARGET:** un solo tipo `PlannerPlan`, derivados separados (`progress`, `readiness`).
- **EVIDENCE:** §2.8; `PlannerGoal` (30 campos snake_case, sin `lifecycle`/`target_date`/`archived_at`) **contradice la fila real** que sí los trae (`SELECT *`).
- **WHY:** 3 vocabularios de lifecycle en TS no pueden convivir con un CHECK único.
- **RISK:** `PlannerPlanDetailScreenV1` y `PlannerPlanCreateScreen` son los únicos consumidores de `PlannerPlanV1`.
- **ALTERNATIVES REJECTED:** conservar `PlannerPlanV1` como alias (mantiene 2 vocabularios); generar tipos desde DB (no hay `types/database.ts` y no hay generador).

### D5 — canonical Task relation
- **CURRENT:** 3 mecanismos (`goal_id` FK, requirement externo sin FK, `origin_*` sin FK), con **double-link posible** y sin 0..1 para `planner_plans`.
- **TARGET:** `planner_plan_components(component_kind='task')`, FK a `planner_plans`, `UNIQUE (component_kind, entity_id) WHERE trashed_at IS NULL`, `classification` en la fila.
- **EVIDENCE:** §4.2 (14-20); §6.1/§6.2.
- **WHY:** `UNIQUE` parcial da 0..1 **en DB**; `classification` en la fila cumple Product Truth §07; `DELETE` de la fila garantiza `unlink ≠ delete` estructuralmente.
- **RISK:** `planner_tasks` es la tabla más poblada conceptualmente. **Mitigación:** la migración es puramente aditiva (tabla nueva), no toca `planner_tasks`. Y `planner_tasks.goal_id` tiene **0 filas no nulas**.
- **ALTERNATIVES REJECTED:** `plan_id` directo (§6.1, invierte la dependencia); reusar `goal_id` (§6.3, perpetúa la doble autoridad); aplanar requirements (§6.4, sin FK posible por polimorfismo).

### D6 — canonical Event relation
- **CURRENT:** sólo `planner_plan_requirements(subject_type='external', external_kind='event')`, sin FK, satisfactible **nunca** (`v_subject_satisfied := false`), con dos escritores de garantías distintas, sin unicidad y sin writer de UI.
- **TARGET:** la **misma** `planner_plan_components` con `component_kind='event'`.
- **EVIDENCE:** §5.2, §5.3.
- **WHY:** una sola tabla de componentes ⇒ una sola autoridad de derivación para Progress, Readiness y Required/Optional. Y `planner_events` **no cambia**, preservando "Calendar = Events + Horarios, sin dueño externo".
- **RISK:** Event personal enlazado a Plan personal ⇒ el deep-link debe resolverse por la ruta **V1** (hoy va por V0 y da 404).
- **ALTERNATIVES REJECTED:** `plan_id` en `planner_events` (rompe la frontera de dominio); mantener requirements (grafi retired, sin FK).

### D7 — Measurement strategy
- **CURRENT:** tabla completa (7/7 campos del Target) + historial append-only con corrección + `targetReached` en backend (JS **y** SQL); **0 filas**; **sin ninguna superficie**.
- **TARGET:** **KEEP + WIRE**. Modificar 2 cosas: escribir `previous_value` en el camino `changeset`; quitar `on conflict do nothing`.
- **EVIDENCE:** §7.1-§7.4.
- **WHY:** es la pieza más cercana al Target y la más sub-explotada. Reconstruir perdería idempotencia, corrección e historial ya resueltos.
- **RISK:** bajo. **Prerrequisito de decisión:** si el Target admite valores negativos, añadir CHECK; hoy no los admite por copia de `planner_goals`, no por diseño.
- **ALTERNATIVES REJECTED:** reconstruir desde cero; derivar Measurements de Milestones (Milestones está retirado).

### D8 — Required/Optional storage
- **CURRENT:** `classification IN ('necessary','supporting')` en 4 tablas, **duplicada** en `planner_plan_requirements` y **coaccionada de forma no fiable**.
- **TARGET:** **una** columna `classification` **por fila de componente**, en 3 sitios: `planner_plan_components` (Task/Event) y `planner_plan_measurements` (ya existe).
- **EVIDENCE:** §8.1-§8.3; `RUNTIME VERIFIED` los 4 CHECK.
- **WHY:** `necessary`≡Required, `supporting`≡Optional, mapeo 1:1 ya existente. Eliminar la duplicación es el beneficio real (elimina el trigger de grafo, `subject_type`, `parent_requirement_id`, `subject_shape` y la recursión).
- **RISK:** el gate de activación y el de completado deben reescribirse (no se puede "quitar" el grafo sin reescribirlos). **Con 0 filas, el riesgo es puramente de esquema.**
- **ALTERNATIVES REJECTED:** mantener la clasificación en requirements (mantiene el grafo vivo); usar un enum nuevo (rompe la semántica existente y `planner_goals`-compatibilidad).

### D9 — Progress authority
- **CURRENT:** 7 contadores honestos del dominio equivocado; `%` universal sintetizado en JS; lectura de 6 columnas inexistentes; 4 barras de `%` en frontend (2 alcanzables, siempre vacías).
- **TARGET:** **SQL derivado**, en `planner_plan_indicators` reescrita: `task_total`, `task_completed`, `event_total`, `event_occurred`, `measurement_total`, `measurement_reached`. **Sin columna de porcentaje. Nada derivado se persiste.**
- **EVIDENCE:** §9.1-§9.2; comentario `'intentionally no percentage column'` `:674`, `RUNTIME VERIFIED`; `planner.plans.service.js` no lee `planner_tasks`.
- **WHY:** una sola autoridad, testeable contra DB real, sin estado duplicado. La vista ya es `security_invoker=true` y ya tiene el contrato de honestidad.
- **RISK:** `planner_p1_structure_contract_tests.ts:278` y `planner_v1_frontend_plans_tests.ts:279,449` ** prohíben `percentage`** ⇒ **estos tests deben seguir pasando**; los nuevos campos no contienen la palabra.
- **ALTERNATIVES REJECTED:** calcular en frontend (`planStructureContract.ts` ya es el motor actual y es el problema); mantener `attachProgress`; guardar un `progress_percentage` derivado (prohibido).

### D10 — Readiness authority
- **CURRENT:** gate autoritativo en DB (`:1001-1027`) + recálculo en frontend (`planStructureContract.ts:354-431`). **Sin endpoint.** Los external requirements nunca se satisfacen.
- **TARGET:** **un RPC de lectura `read_planner_plan_readiness_rpc(uuid)`** que devuelve la forma de `projectCompletionReadiness`, calculada sobre componentes con FK directo. El frontend **consume**.
- **EVIDENCE:** §9.3, §9.4.
- **WHY:** Required/Optional plano ⇒ la satisfacción es un `AND` sobre componentes con FK directo; ~90 líneas de recursión + 1 trigger + 4 índices desaparecen. Y un Plan vacío puede estar listo (Product Truth §08).
- **RISK:** `p1_structure_contract_tests.ts:233-255` y `p1_structure_database_tests.js:298-348` fijan la semántica actual ⇒ **deben migrarse, no borrarse**.
- **ALTERNATIVES REJECTED:** mantener doble autoridad; dejar readiness en frontend (la DB ya tiene el gate y divergen).

### D11 — lifecycle vocabulary
- **CURRENT:** `draft/active/paused/completed/closed` (`planner_plans`) · `preparation/active/paused/completed/cancelled` (`planner_goals`) · `status in (active/completed/closed)` · `trash` sintético · `blocked`/`review` inexistentes.
- **TARGET:** **Active · Paused · Completed · Cancelled**, con `Preparation` como estado interno de `draft`, y Trash/Archive **ortogonales por columna**.
- **EVIDENCE:** los 3 CHECK `RUNTIME VERIFIED`; §10.1.
- **WHY:** el nombre del Target (`Cancelled`) coincide con la tabla **legacy**, y el terminal de la tabla **canónica** se llama `closed`. Es una contradicción de nomenclatura, no de comportamiento.
- **RISK:** renombrar `closed`→`cancelled` toca la columna que **todos los clientes leen**, el CHECK, la función de transición y `availableActions`. Con **0 filas**, el coste de datos es cero.
- **ALTERNATIVES REJECTED:** mantener `closed` y renombrar el Target (Product Truth cerrado); usar `status` como segunda columna (ya es causa de RC-010).
- **`OWNER DECISION` requerido:** ¿el terminal canónico se llama `cancelled` (alineado con Product Truth) o `closed`?

### D12 — Archive semantics
- **CURRENT:** columna `archived_at` + CHECK `archive_terminal_only` + `availableActions`, pero **`goal.archive` es `false` en los 6 roles ⇒ ningún rol puede archivar**; `reopen` **borra** `archived_at`; `ROUTE_NAMES.PlanArchive` sin pantalla.
- **TARGET:** **ortogonal**. Permitido en cualquier lifecycle. Sin interacción con `reopen`.
- **EVIDENCE:** `20260722040000:30,49-51`; `plannerCapabilities.js:125,165,205,245,285,325`; SQL `:355`; `20260722049000:282`.
- **WHY:** Product Truth §14 declara `Completed + Archived` válido y Archive ortogonal.
- **RISK:** **bajo.** Es un `CREATE OR REPLACE` de la matriz de capabilities + relajar el CHECK + quitar el `archived_at = null` del reopen.
- **ALTERNATIVES REJECTED:** mantener la restricción a terminales (contradice la ortogonalidad); mantener la capability muerta (deja Archive inalcanzable).

### D13 — Trash/Restore semantics
- **CURRENT:** Plan trash/restore **no** cascada a hijos; `planner_plans` **ausente** de la papelera; el restore de requirements **resucita decisiones del usuario**; el historial de un Plan trasteado queda legible; `planner_goals` visible tras trash por SELECT.
- **TARGET:** Trash elimina de superficies normales; Restore devuelve **sin inventar lifecycle**; `planner_plans` presente en la papelera; sin resurrección; `unlink ≠ delete` intacto.
- **EVIDENCE:** `20260722049000:290-299`; `planner.trash.service.js:202`; `:397-400,494-495,578-579`; `RUNTIME VERIFIED` policy `planner_goals_select_visible`.
- **WHY:** `planner_plans` ausente de la papelera hace que **una operación de la UI sea irreversible**.
- **RISK:** medio — hay que cambiar el servicio transversal y tocar la policy de goals.
- **ALTERNATIVES REJECTED:** cascadear trash a hijos (el Target no lo pide y complica Restore); preservar el estado previo en una columna nueva (`trash` no cambia `lifecycle`, así que el prior state ya es recuperable).

### D14 — migration strategy
- **CURRENT:** 2 sistemas sin sincronizar; puente vacío (0 filas); **0 filas en todo el dominio Plan legacy salvo 1 QA row**.
- **TARGET:** **congelar → copiar → cortar → congelar legacy → borrar**, con un reporte de orphans en cada paso y **export frío antes de cualquier `DROP`**.
- **EVIDENCE:** §3.2-§3.6 `RUNTIME VERIFIED`; `planner_m11_3a_legacy_compatibility_report` declara `automaticBackfillSafe: false` y `visualGoalRetirementReady: false` `:1596,1601`.
- **WHY:** con 0 filas, la migración es un problema de **esquema**, no de datos. Eso hace el plan de reconstrucción **mucho más barato** de lo que el input audit asumía.
- **RISK:** **ALTO y no resuelto**: este hallazgo es de la DB **local**. Producción puede tener datos. **El plan NO puede diseñar la migración final sin `count(*)` contra el proyecto Supabase remoto.**
- **ALTERNATIVES REJECTED:** migrar automáticamente Milestones (Product Truth §19 y §16.1); migrar `progress_mode`+`target_type` (20 combinaciones sin traducción al modelo factual); dropear antes de exportar.

### D15 — legacy retirement strategy
- **CURRENT:** 2 tablas + 2 tablas de milestones + 2 tablas de grafo + `planner_tasks.goal_id` + `status` + `progress_mode` + `deleted_at` + `failed_at` + 17 endpoints + 4 pantallas muertas + 2 clients duplicados + 33 archivos de test muertos.
- **TARGET:** retirada **escalonada**, cada capa congelada un ciclo antes de su `DROP`.
- **EVIDENCE:** §16.
- **WHY:** Product Truth está CLOSED y el legacy ya no es autoridad; mantenerlo vivo es la causa de que la verificación no signifique nada.
- **RISK:** §13 — 3 superficies (Trash, Tasks filter, Goals endpoints) se rompen al cortar `planner_goals`, y **Trash rompe con fallo duro**.
- **ALTERNATIVES REJECTED:** cortar `planner_goals` primero (rompe Trash y el tab real); mantener goals como "system of record" (impide todo lo demás).

### D16 — test authority
- **CURRENT:** `quality` corre 2 superficies de Plan y **está ROJO en el comando 2/18** por 5 errores TS en un test de Plan; 6 asserts cableados más fallan por contradicción de `create_goal`; `planner-frontend-core-integration` afirma contra código inexistente; `tests/db/run.js` hace **skip silencioso**; la única red DB de Plan está **huérfana** (sin script npm, fuera de `quality`); el gate de DB de `quality` **no menciona el dominio Plan**.
- **TARGET:** `npm run quality` debe ser verde **y** incluir: contrato de navegación, contrato de Plan, persistencia de Plan contra DB real, y privacy.
- **EVIDENCE:** §14; `RUNTIME VERIFIED` (`node tests/run.js typecheck` exit 1).
- **WHY:** **sin esto, cualquier slice posterior se verifica contra una suite que no significa nada.** El input audit主導 ésto a lalast; esta sesión lo confirma **con ejecución real** y añade que el gate está **más roto** de lo reportado (no es ausencia de cobertura: es cobertura que bloquea el gate).
- **RISK:** bajo (todo el trabajo es en `scripts/`, `tests/`, `package.json`).
- **ALTERNATIVES REJECTED:** "añadir tests nuevos al final" (los viejos seguirían mintiendo); aceptar el skip de DB (un verde local no prueba persistencia).

---

## 19. RESUMEN DE LA SESIÓN

| Métrica | Valor |
|---|---|
| Root causes revalidadas | **32** |
| Root causes nuevas | **10** (RC-033…RC-042) |
| Refutadas / corregidas del input audit | **6** (RC-026, RC-017, RC-018, RC-013, RC-015, RC-009-detalle) |
| `UNKNOWN` del input audit resueltos con datos | **11 de 11** (todas las hipótesis de §29 V5-V12) |
| Sondas runtime ejecutadas | **20+**, todas read-only |
| Modificaciones a código/DB/tests/env | **0** |
| Comandos git de escritura | **0** |

**Lo que esta sesión cambió el diagnóstico:**

1. **La DB local tiene las 112 migraciones y está VACÍA en el dominio Plan.** 11 `UNKNOWN` del input audit quedan resueltos. El riesgo de migración es una fracción del asumido — **en local**.
2. **El defecto P0 de la lista↔detalle pasó de INFERENCIA a `RUNTIME VERIFIED`** (la RPC devuelve NULL).
3. **Apareció un P0 de autorización ausente del input audit**: `trash_goal_rpc` ejecutable por `anon`, `SECURITY DEFINER`, sin capability, con `p_member_id` del llamante.
4. **Apareció un P1 ausente**: `planner_legacy_goal_plan_projection` es auto-updatable con privilegios `arwdDxtm` para `anon`.
5. **La verification NO está ausente — está peor: el gate oficial está ROJO.** El input audit dijo "0 tests de Plan en CI"; la realidad es que hay tests de Plan y **bloquean el gate** con 5 errores TS y 6 asserts contradictorios.
6. **`PlannerPlanDetailScreenV1` (el segundo cliente, que lee `planner_goals`) SÍ es alcanzable** por la ruta literal `'PlanDetail'`. El input audit lo declaró inalcanzable.
7. **`recompute_automatic_milestones` es `VOLATILE`, no `stable`** (`RUNTIME VERIFIED`).
8. **La "coacción" de `classification` no es un invariante fiable**: el camino `changeset` puede divergir en silencio.

**Lo que NO cambió:** Product Truth (CLOSED, validado sin contradicciones), las 2 tablas, las 3 familias de ruta, la ruptura de espacio de IDs, la ausencia de medidas en producto, y la ausencia de Task personal.

**Archivos escritos por esta sesión (únicos):**
- `PLANS_RECONSTRUCTION_DISCOVERY_V1.md` (este documento)
- `PLANS_RECONSTRUCTION_PLAN_V1.md`

**Nada más fue creado, modificado, commiteado ni borrado.**