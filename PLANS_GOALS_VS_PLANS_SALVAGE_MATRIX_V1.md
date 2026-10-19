# PLANS · `planner_goals` vs `planner_plans` · SALVAGE MATRIX V1

**Tipo de documento:** comparación estructural exhaustiva READ-ONLY. **NO decide. NO recomienda. NO diseña migrations. NO elige autoridad canónica. NO modifica código, DB ni documentos existentes.**

**Worktree auditado:** `C:\Users\thega\Desktop\HomePlus-worktrees\planner-current`
**HEAD auditado:** `79f877f152072e759c11511bd91807273c4e1c13` (detached, no corregido)
**Fecha:** 2026-10-03
**Documento hermano:** `PLANS_CREATE_FAILURE_TRACE_V1.md` (misma sesión, mismos gates)

> **Este documento NO toma la decisión.** Su propósito es que una revisión humana pueda tomarla con evidencia. Todas las clasificaciones de §17 llevan el sufijo **`CANDIDATE`**. No aparece `MUST KEEP`, `MUST DELETE`, `ganador` ni `target canónico` en ninguna fila.

---

## 0. MÉTODO, ETIQUETAS Y ALCANCE

| Etiqueta | Significado |
|---|---|
| `STATIC CONFIRMED` | Evidencia en archivo con `file:line`, re-leída en esta sesión |
| `RUNTIME RO VERIFIED` | Observado contra la DB local real (`supabase_db_HomePlus`, `127.0.0.1:56222`), sólo `SELECT`, con `SET LOCAL default_transaction_read_only = on` |
| `STATIC CONFIRMED (carry-over)` | Afirmado por `PLANS_CAPABILITY_MAP_CURRENT_V1.md` / `PLANS_RECONSTRUCTION_DISCOVERY_V1.md` y **no re-leído** aquí; se marca como tal |
| `NOT FOUND` | Buscado explícitamente en 112 migraciones + `front/` + `backend/src`, ausente |
| `DEAD` | Código existente sin ningún consumidor alcanzable |
| `UNREACHABLE` | Código cableado pero que ningún actor puede ejecutar sin un override de configuración |
| `LIVE` | Con consumidor alcanzable desde la app |
| `LEGACY ACTIVE` | Código vivo que pertenece al sistema que Product Truth ya no reconoce como autoridad |
| `EMPTY DB FOUNDATION` | Estructura correcta, 0 filas |
| `UNKNOWN` / `INFERRED` | Sin evidencia / razonamiento |

**Alcance de la verificación runtime:** la fase de escritura quedó **BLOCKED** (`PLANS_CREATE_FAILURE_TRACE_V1.md §2.6`: el `.env` del frontend de `planner-current` apunta a dos hostnames `trycloudflare.com` **no resolubles**, y los únicos runtimes vivos pertenecen a `homecloud-current`). Por lo tanto:

> **Ninguna afirmación de este documento está respaldada por ejecución de la app.** Todo el bloque "runtime usado" de §17 responde con `NO` o `NOT REPRODUCED`. La columna `RUNTIME USED?` **no tiene ningún `YES`** y eso es un resultado, no una omisión.

### 0.1 Clasificación de piezas exigida en B19 (aplicada en todo el documento)

| Clase | Definición |
|---|---|
| `LIVE CURRENT` | Alcanzable desde la app y en uso |
| `DEAD CODE` | Existe, 0 importadores / 0 llamadas |
| `LEGACY ACTIVE` | Alcanzable y vivo, pero pertenece al sistema retirado |
| `UNREACHABLE` | Cableado pero denegado en todas las rutas de rol |
| `EMPTY DB FOUNDATION` | Tabla/estructura correcta y vacía |

---

## 1. EXECUTIVE FACTUAL SUMMARY

1. **Dos raíces de Plan, dos espacios de id, tres familias de ruta.** `planner_goals` (28 columnas, 1 fila) y `planner_plans` (25 columnas, 0 filas). `/api/planner/goals` y `/api/planner/v1/plans` → `planner_goals`; `/api/planner/plans` → `planner_plans`. `STATIC CONFIRMED` + `RUNTIME RO VERIFIED`.

2. **La nomenclatura de versión está invertida.** El prefijo `"v1"` apunta al sistema **legacy**. `routes/planner.v1.js:6-13` (goals) vs `routes/planner.js:69-74` (plans). `STATIC CONFIRMED`.

3. **`planner_goals` tiene la ruta de escritura viva; `planner_plans` no tiene ninguna alcanzable desde la UI.** El único Quick Action de create (`create_goal`) tiene `implemented: false` (`plannerQuickActions.ts:126`); el sheet `plan_form` no tiene opener; la ruta `'CreatePlan'` no tiene navegador. `STATIC CONFIRMED`.

4. **El productor y el consumidor del create usan tablas distintas.** `POST /goals` inserta en `planner_goals`; la pantalla de detalle lee `planner_plans` vía `read_planner_plan_graph_rpc`. Precondición **probada en runtime**: el id real de `planner_goals` no existe en `planner_plans` y la RPC devuelve `NULL`. `RUNTIME RO VERIFIED`.

5. **Sólo `planner_plans` tiene `scope` + `owner_person_id`.** `planner_goals` **no tiene `scope`** y **no tiene `owner_person_id`** (la columna no existe); usa `visibility IN ('household','personal')` como sustituto. `RUNTIME RO VERIFIED` (28 columnas listadas, `owner_person_id` ausente).

6. **Sólo `planner_goals` tiene Task relation con FK.** `planner_tasks.goal_id uuid REFERENCES planner_goals(id) ON DELETE SET NULL` (`planner_tasks_goal_id_fkey`, `RUNTIME RO VERIFIED`), 0 filas no-nulas. `planner_plans` **no tiene ninguna** columna de Task ni tabla puente (`planner_plan_task_links`: `NOT FOUND`).

7. **Events no tienen relación con ninguno de los dos.** `planner_events` no tiene ninguna columna `plan*` ni `goal*` (`RUNTIME RO VERIFIED`, 0 columnas). El único vínculo posible es `planner_plan_requirements(subject_type='external', external_kind='event')`, sin FK, con 0 filas.

8. **Measurements sólo existen en `planner_plans`.** `planner_plan_measurements` (15 col) + `planner_plan_measurement_history` (10 col), 0 filas, **sin ninguna superficie UI** (`PlannerPlanStructureEditScreen` sólo importa `planMilestoneEditor` — carry-over). `planner_goals` tiene campos numéricos (`current_value`, `target_value`, `unit`, `target_type`) que **no son Measurement**: no tienen nombre, ni operador, ni historia, ni `classification`.

9. **Required/Optional (`classification`) existe en 4 tablas, todas de `planner_plans`; 0 en `planner_goals`.** `RUNTIME RO VERIFIED`. Semántica ya 1:1 con Product Truth §07 (`necessary`≡Required, `supporting`≡Optional).

10. **Progress tiene 4 autoridades incompatibles, ninguna generada por datos reales.** `planner_plan_indicators` (7 contadores de Milestones+Requirements, **cero Task/Event**); `attachProgress` (% universal sintetizado en JS); lectura de 6 columnas inexistentes; 4 barras de % en frontend alimentadas por un campo inexistente. Product Truth §10 prohíbe el % universal. `RUNTIME RO VERIFIED` (definición de la vista) + `STATIC CONFIRMED` (código).

11. **Readiness tiene dos autoridades divergentes:** el gate autoritativo en DB (`planner_plans`, `20260722040000:1000-1027`) y un recálculo en frontend (`planStructureContract.ts`) que tiene **0 consumidores UI** (carry-over, `PLANS_CAPABILITY_MAP_CURRENT_V1.md §13`).

12. **Auth: los dos sistemas comparten las 11 capabilities `goal.*`, pero `planner_plans` es el único con RPC de escritura `SECURITY DEFINER` + `SELECT`-only para `authenticated`.** `planner_goals` conserva `anon=arwdDxtm` y `authenticated=arwdDxtm`, y sus policies **no verifican capability**. `RUNTIME RO VERIFIED` (`pg_class.relacl`, `pg_policies`).

13. **`goal.archive` es `false` en los 6 roles en JS y en SQL** ⇒ Archive inalcanzable en **ambos** sistemas sin override de `households.config`. Carry-over + `RUNTIME RO VERIFIED` (0 overrides `goal.*` reales).

14. **Proyección cross-Planner dividida:** Home→`planner_goals` (y no lo renderiza), Search/Attention→`planner_plans`, Trash→`planner_goals` con `supabaseAdmin`, Activity→`planner_activity_log` (cuyo CHECK **no admite `'plan'`**). `RUNTIME RO VERIFIED` (`pg_constraint`).

15. **La DB local está vacía en todo el dominio Plan salvo 1 fila QA de `planner_goals` y 3 `planner_tasks`.** 112 migraciones aplicadas = worktree exacto. `RUNTIME RO VERIFIED`. **Esto no dice nada sobre producción.**

16. **Ninguna pieza de `planner_plans` ha sido ejercitada por un usuario.** 0 filas, 0 writers alcanzables, y los únicos readers (Search/Attention/Deep-links) devuelven vacío. Es `EMPTY DB FOUNDATION` en su totalidad.

---

## 2. ROOT FIELD MATRIX (B1)

**Convención:** `—` = la columna no existe. Definiciones de columna, nullability, defaults y CHECK son `RUNTIME RO VERIFIED` (`information_schema.columns` + `pg_constraint`).

### 2.1 Conceptos obligatorios

| CONCEPT | GOALS COLUMN | GOALS TYPE | GOALS NULL | GOALS DEFAULT | GOALS CHECK | GOALS CURRENT USAGE | PLANS COLUMN | PLANS TYPE | PLANS NULL | PLANS DEFAULT | PLANS CHECK | PLANS CURRENT USAGE | PT NEED? | DATA LOCAL? | NOTES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **id** | `id` | `uuid` | NO | `gen_random_uuid()` | (PK) | identidad de Plan del flujo real | `id` | `uuid` | NO | `gen_random_uuid()` | (PK) | identidad de Plan en Search/Attention/DeepLinks | INDIRECT | goals 1 · plans **0** | **Espacios DISJUNTOS.** Sin FK ni trigger que los una |
| **title / objective** | `title` | `text` | NO | — | `planner_goals_title_not_blank_check` (`length(btrim(title))>0`) | `GoalForm` campo principal `:567-586` | `objective` | `text` | NO | — | `planner_plans_objective_not_blank` | `PlannerPlanMinimalCreateSurface` (inalcanzable) | **YES** (§02) | goals `'hdjs'` · plans 0 | **Mismo concepto, nombre de columna distinto** |
| **description** | `description` | `text` | YES | — | — | `GoalForm:594-609`; payload `description.trim()\|\|null` `:417` | `description` | `text` | YES | — | — | payload del RPC canónico | **YES** (§02 opcional) | goals NULL · plans 0 | Sin divergencia |
| **target_date** | **`target_date`** | `date` | YES | — | — | **NO escrita por el formulario.** `GoalForm` sólo ofrece `starts_at`/`ends_at`; `CreatePlannerGoalInput` (`:78-90`) no la expone | `target_date` | `date` | YES | — | — | escrita por el RPC canónico | **YES** (§02 opcional) | goals NULL · plans 0 | **Columna huérfana en goals**: existe en DB y nadie la escribe |
| **starts_at / ends_at** | `starts_at`, `ends_at` | `date` | YES | — | — | **VIVOS**: selector "Fechas" `GoalForm:863-986`; payload `:425-426` | — | — | — | — | — | — | **NO** (§02: fecha objetivo, no rango) | goals NULL/NULL | **Goals tiene rango de fechas; Plans no.** Semántica distinta |
| **visibility** | `visibility` | `text` | NO | `'household'` | `in ('household','personal')` | **VIVO**: chips `GoalForm:664-704`; `PlannerPlanListScreen` filtra por `scope` mapeado desde `visibility` | — | — | — | — | — | — | NO (§02 usa "Alcance") | goals `'household'` ×1 | Goals tiene el concepto con otro nombre |
| **scope** | — | — | — | — | — | — | `scope` | `text` | NO | — | `in ('personal','household')` | RPC writer; filtro `listPlans` `planner.plans.service.js:249` | **YES** (§02) | plans 0 | **UNIQUE TO PLANS** |
| **owner_person_id** | **NO EXISTE** | — | — | — | — | — | `owner_person_id` | `uuid` | YES | — | `planner_plans_owner_shape` | `planner_plan_can_read/can_mutate` | **YES** (implícito §02/§16) | plans 0 | **CONFIRMED ausente en goals.** Goals no puede expresar "personal" con owner |
| **household_id** | `household_id` | `uuid` | **NO** | — | FK→`households` **ON DELETE CASCADE** | obligatorio siempre, incluso con `visibility='personal'` | `household_id` | `uuid` | YES | — | `planner_plans_owner_shape` (household⇒NOT NULL; personal⇒**NULL**) |idem | INDIRECT | goals 1 · plans 0 | **DIVERGENCIA CRÍTICA**: en goals es `NOT NULL` ⇒ una meta "personal" sigue anclada a un hogar |
| **created_by_person_id** | **NO EXISTE** | — | — | — | — | — | `created_by_person_id` | `uuid` | **NO** | — | (implícito en `owner_shape`) | identidad del creador | INDIRECT | plans 0 | Goals no registra persona creadora, sólo miembro |
| **created_by_member_id** | `created_by_member_id` | `uuid` | YES | — | FK→`household_members` **SET NULL** | `createGoal` lo fija con `context.membershipId` (`planner.goals.service.js:401`) | `created_by_member_id` | `uuid` | YES | — | `owner_shape` (**household⇒NOT NULL, personal⇒NULL**) | RPC writer | INDIRECT | goals `4e1ded1b-…` · plans 0 | Goals: `SET NULL` ⇒ **el autor puede perderse**. Plans: convive con `created_by_person_id NOT NULL` |
| **modelo de actor** | `visibility` + `created_by_member_id` | — | — | — | `planner_goals_select_visible` | policy SELECT | `owner_person_id` + `created_by_person_id` + `scope` | — | — | — | `planner_plan_can_read(id,false)` | policy SELECT | INDIRECT | 0 | **MEMBER-based (goals) vs PERSON-based (plans).** Incompatibles |
| **lifecycle** | `lifecycle` | `text` | NO | `'preparation'` | `in ('preparation','active','paused','completed','cancelled')` | **NO escrito por `createGoal`** ⇒ toda fila nace en `preparation` | `lifecycle` | `text` | NO | `'draft'` | `in ('draft','active','paused','completed','closed')` | RPC writer | **YES** (§13) | goals `preparation` ×1 · plans 0 | **VOCABULARIOS DIVERGENTES**: `preparation`↔`draft`, `cancelled`↔`closed` |
| **status (2ª autoridad)** | `status` | `text` | NO | `'active'` | `in ('active','completed','closed')` | **DERIVADA** por trigger `planner_goals_sync_status` + `planner_goal_project_status` | — | — | — | — | — | — | **NO** (el Target no pide 2ª columna) | goals `'active'` ×1 | **DOBLE AUTORIDAD.** El bridge colapsa `preparation` y `paused` a `'active'` ⇒ un Plan pausado es indistinguible de uno activo |
| **archived_at** | `archived_at` | `timestamptz` | YES | — | **NINGUNO** | `planner.plans.v1.service.js:462` | `archived_at` | `timestamptz` | YES | — | `planner_plans_archive_terminal_only` (`lifecycle IN ('completed','closed')`) | writer `:1036-1038` | **YES** (§14 ortogonal) | goals NULL · plans 0 | **CONFLICTO SEMÁNTICO**: en plans está **atado al terminal** (contradice §14); en goals **no tiene CHECK** |
| **trashed_at** | `trashed_at` | `timestamptz` | YES | — | — | `trashGoal` UPDATE directo; V1 `:533` | `trashed_at` | `timestamptz` | YES | — | `planner_plans_trash_actor_shape` | writer `:1042-1044` | **YES** (§15) | 0 / 0 | ambos |
| **trashed_by_member_id** | `trashed_by_member_id` | `uuid` | YES | — | FK→`household_members` SET NULL | `context.membershipId` | `trashed_by_member_id` | `uuid` | YES | — | `owner_shape` exige actor si `trashed_at` | derivado en SQL | INDIRECT | 0 | ambos |
| **trashed_by_person_id** | **NO EXISTE** | — | — | — | — | — | `trashed_by_person_id` | `uuid` | YES | — | `owner_shape` **lo exige** si `trashed_at IS NOT NULL` | derivado en SQL | INDIRECT | 0 | **UNIQUE TO PLANS** |
| **trash_operation_id** | **NO EXISTE** | — | — | — | — | — | `trash_operation_id` | `text` | YES | — | `owner_shape` **lo exige** si `trashed_at IS NOT NULL` | = `p_mutation_id` | INDIRECT (auditoría) | 0 | **UNIQUE TO PLANS.** Registra *quién y qué operación*, **no** el lifecycle previo |
| **version** | `version` | `integer` | NO | `1` | `>= 1` | trigger `trg_planner_goals_increment_version` | `version` | `integer` | NO | `1` | `>= 1` | trigger `planner_plans_touch_version` | INDIRECT | goals 1 · plans 0 | **AMBOS lo tienen** |
| **created_at** | `created_at` | `timestamptz` | NO | `now()` | — | — | `created_at` | `timestamptz` | NO | `now()` | — | — | NO | goals `2026-09-25 12:56:32.903036+00` | ambos |
| **updated_at** | `updated_at` | `timestamptz` | NO | `now()` | — | trigger `trg_planner_goals_updated_at` | `updated_at` | `timestamptz` | NO | `now()` | — | `planner_plans_touch_version` | NO | — | ambos |
| **completed_at** | `completed_at` | `timestamptz` | YES | — | — | `completeGoal` / V1 `:443` | `completed_at` | `timestamptz` | YES | — | — | writer `:1028` | INDIRECT | 0 / 0 | ambos. **Plans no limpia `completed_at` en `reopen`** |
| **completed_by_\*** | **NO EXISTE** | — | — | — | — | — | **NO EXISTE** | — | — | — | — | — | (sólo milestones) | — | **Ambos carecen.** No se sabe quién completó el Plan |
| **closed_at** | `closed_at` | `timestamptz` | YES | — | — | V1 `:448` | `closed_at` | `timestamptz` | YES | — | — | writer `:1031` | INDIRECT | 0 | ambos |
| **closed_reason** | `closed_reason` | `text` | YES | — | — | V1 `:449` | `closed_reason` | `text` | YES | — | — | writer `:1031` | NO (PT no pide motivo) | 0 | ambos |
| **cancelled\*** | `lifecycle='cancelled'` | — | — | — | en el CHECK de lifecycle | V1 `:445-450` | `lifecycle='closed'` | — | — | — | en el CHECK de lifecycle | writer `:1030-1032` | **YES** (§13 `Cancelled`) | 0 filas / 0 | **CONFLICTO DE NOMBRE**: el Target dice `Cancelled`; goals lo cumple, plans lo llama `closed` |
| **failed_at** | **`failed_at`** | `timestamptz` | YES | — | — | `failGoal` (`planner.goals.controller.js:242`) | — | — | — | — | — | — | **NO** (PT no tiene estado `Failed`) | goals 0 | **VACUO**: el CHECK de `status` **prohíbe** un estado `failed` y `planner_goal_project_status` nunca lo devuelve (`RUNTIME RO VERIFIED`) |
| **deleted_at** | **`deleted_at`** | `timestamptz` | YES | — | — | filtrado en **todas** las queries de goals | — | — | — | — | — | — | **NO** (§15 usa Trash) | goals 0 | **SEGUNDA MARCA DE BORRADO**. `planner_goals_select_visible` filtra `deleted_at` pero **no** `trashed_at` ⇒ metas trasteadas visibles por SELECT |
| **progress_mode** | **`progress_mode`** | `text` | NO | `'steps'` | `in ('steps','tasks','numeric','boolean','none')` | **VIVO**: `GoalForm` lo envía siempre (`:353,420`); `attachProgress` lo lee | — | — | — | — | — | — | **NO — §10 lo prohíbe explícitamente** | goals `'steps'` ×1 | Goals **obliga** a un concepto que PT retiró |
| **target_type** | **`target_type`** | `text` | YES | — | NULL o `in ('count','percentage','amount','boolean')` | `GoalForm:363-393`; `attachProgress` | — | — | — | — | — | — | **NO (§02)** | goals NULL | 4 valores; combinaciones con `progress_mode` sin traducción al modelo factual |
| **current_value** | **`current_value`** | `numeric` | NO | `0` | **`>= 0`** | `attachProgress` (modo `numeric`) | `planner_plan_measurements.current_value` | `numeric` | NO | `0` | **NINGUNO (sin rango)** | writers del RPC | **INDIRECT** (§06) | goals `0` · plans 0 | **CONFLICTO DE RANGO**: goals sólo ≥0; plans admite negativos |
| **target_value** | **`target_value`** | `numeric` | YES | — | **NULL o `>= 0`** | `attachProgress` | `planner_plan_measurements.target_value` | `numeric` | YES | — | **NINGUNO** | writers del RPC | **INDIRECT** | goals NULL · plans 0 | ídem |
| **unit** | **`unit`** | `text` | YES | — | — | `GoalForm:840-853` | `planner_plan_measurements.unit` | `text` | **NO** | — | `length(btrim(unit))>0` (**obligatorio y no vacío**) | writers del RPC | **YES** (§06) | goals NULL · plans 0 | En goals **opcional**; en plans **obligatorio** |
| **category** | **`category`** | `text` | NO | `'home'` | 6 valores (`home,family,finance,health,education,other`) | **VIVO**: chips `GoalForm:611-662` | — | — | — | — | — | — | **NO (§02)** | goals `'home'` | **Obligatorio en DB y en la UI**, rechazado por PT |
| **activated_at** | — | — | — | — | — | — | `activated_at` | `timestamptz` | YES | — | — | writer `:1011` | NO | plans 0 | **UNIQUE TO PLANS** |
| **paused_at** | — | — | — | — | — | — | `paused_at` | `timestamptz` | YES | — | — | writers `:1014,:1017,:1028,:1031` | NO | plans 0 | **UNIQUE TO PLANS** |
| **finalization_kind** | **NO EXISTE** | — | — | — | — | — | **`finalization_kind`** | `text` | NO | `'none'` | `in ('none','date','event')` | escrito por el RPC, **nunca leído** (carry-over `RC-030`) | **NO** | plans 0 | **VACUO**: sin consumidor, y el nombre evoca el concepto retirado "Finalization" (§21) |
| **restore_review_required** | — | — | — | — | — | — | `restore_review_required` | `boolean` | NO | `false` | — | escrita por el RPC | **NO** | plans 0 | **UNIQUE TO PLANS**, sin consumidor UI conocido |
| **autores de transición** | — | — | — | — | — | — | — | — | — | — | — | — | — | **NINGÚN SISTEMA registra quién pausó/completó/cerró el Plan.** En plans los `*_by` sólo existen en `trashed_at` y `created_by_*` |

### 2.2 Recuento comparativo

| | `planner_goals` | `planner_plans` |
|---|---|---|
| Columnas | **28** | **25** |
| CHECK constraints | **10** | **8** |
| FKs salientes | 3 | 6 |
| FKs entrantes | 1 (`planner_tasks.goal_id`) | 6 (`planner_plan_*`) |
| Triggers | **3** | **1** |
| Columnas prohibidas por PT §02/§10 | **6** (`category`, `progress_mode`, `target_type`, `current_value`, `target_value`, `unit`) | **1** (`finalization_kind`) |
| `NOT NULL` sin default | `household_id`, `title` | `scope`, `objective`, `created_by_person_id` |

---

## 3. LIFECYCLE COMPARISON (B2)

### 3.1 Vocabularios

| Sistema / capa | Valores | Fuente |
|---|---|---|
| `planner_goals` (DB) | `preparation · active · paused · completed · cancelled` | CHECK `planner_goals_lifecycle_check` — `RUNTIME RO VERIFIED` |
| `planner_goals` (proyección `status`) | `active · completed · closed` | CHECK + `planner_goal_project_status` — `RUNTIME RO VERIFIED` |
| `planner_plans` (DB) | `draft · active · paused · completed · closed` | CHECK `planner_plans_lifecycle_check` — `RUNTIME RO VERIFIED` |
| `planner_plans` (DTO) | + `trash` **sintético** | `planner.plans.service.js:160` (carry-over) |
| Frontend `PlannerPlanV1` | `preparation · active · paused · completed · cancelled` | `types/PlannerPlanV1.ts:5-10` |
| Frontend `PlannerPlan` | `draft · active · paused · completed · closed · trash` | `types/PlannerPlan.ts:4` |
| Frontend `PlannerGoal` | **sin `lifecycle`** | `services/plannerGoals.ts:29-61` |
| Attention | literales `blocked`, `review` | `planner.attention.service.js:238,269` — **prohibidos por todos los CHECK** ⇒ `DEAD` |

### 3.2 Matriz de transiciones

| Transición | GOALS — public | GOALS — DB | GOALS — implementación | PLANS — public | PLANS — DB | PLANS — implementación | Side effects | ¿Hijos mutados? | Archive | Trash | Activity | Bug conocido |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **CREATE** | — | `lifecycle='preparation'` (default; **`createGoal` no lo escribe**) | `planner.goals.service.js:405-409` | — | `lifecycle='draft'` (default) | `write_planner_plan_graph_rpc` | goals: `status='active'` explícito + trigger sync | — | — | — | goals: `goal.created` **fire-and-forget** (`.catch(()=>{})`) | goals: depende del default DB |
| **PREPARATION / DRAFT** | `preparation` | `preparation` | default | `draft` | `draft` | default | — | — | — | — | — | PT §13 dice que Preparation **no debe ser superficie de navegación**; en ambos **lo es** (`PlannerPlanListScreen:106,155`) |
| **ACTIVATE** | `active` | `preparation → active` | `POST /v1/plans/:id/transition` `active`; cap. `goal.edit_own` | `activate` | `draft → active` + `activated_at=now()` | `:1000-1012`; **GATE**: ≥1 `milestone\|measurement\|manual_condition` **y** cero external `necessary` sin bind | `activated_at` | **NINGUNO** | — | — | `goal.activated` | **plans: el gate cuenta cero Tasks y cero Events** ⇒ un Plan con sólo Tasks/Events **no puede activarse** |
| **PAUSE** | `paused` | `active → paused` | V1 `:406-409` | `pause` | `active → paused` + `paused_at=now()` | `:1013-1015` | `paused_at` | **NINGUNO** ✔ | — | — | `goal.paused` | goals no registra `paused_at` |
| **RESUME** | `resume` | **`409`**: `paused → ['active','completed','cancelled']` **no incluye `'resume'`**, pero `case 'resume':` existe en `:404` | `planner.plans.v1.service.js:29-35,101-109,404` | `resume` | `paused → active` + `paused_at=null` | `:1016-1018` | — | **NINGUNO** ✔ | — | — | — | **CONFIRMED (re-verificado aquí)**: `resume` **inalcanzable** en goals aunque la UI lo ofrece |
| **COMPLETE** | `completed` | `active\|paused → completed` | `completeGoal` **sin ninguna verificación**; devuelve `progress_percentage:100` hardcodeado (carry-over) · V1 `:439-443` | `complete` | `active\|paused → completed` + `completed_at` | `:1019-1029`; **GATE**: requirement raíz `necessary` insatisfecho ⇒ `55000` salvo `confirm_unresolved` | `completed_at` | **NINGUNO en ambos** ✔ (§11) | — | — | `goal.completed` | plans: el gate mira **requirements**, no componentes ⇒ **no puede listar qué Task/Event queda** (§11) |
| **CANCEL / CLOSE** | `cancelled` | `→ cancelled` + `status='closed'` + `closed_at` + `closed_reason` | V1 `:445-450`; `closeGoal` | `close` | `active\|paused → closed` + `closed_at` + `closed_reason` | `:1030-1032` | `closed_*` | **NINGUNO**, y **cero verificación** | — | — | `goal.closed` | ambos: cap. `goal.close_own/any` |
| **REOPEN** | `reopen` | `completed\|cancelled → active`; limpia `closed_at`, `closed_reason`, `completed_at` | V1 `:451-457` | `reopen` | `completed\|closed → active` **y `archived_at=null`** | `:1033-1035` | plans: **desarchiva** | NINGUNO | **plans: reopen borra `archived_at`** ⇒ viola §14 | — | `goal.reopened` | plans **no** limpia `completed_at`/`closed_at`/`closed_reason` |
| **ARCHIVE** | `archive` | sólo desde `completed\|cancelled`; `archived_at=now()` **sin CHECK** | V1 `:458-463`; cap. **`goal.archive`** | `archive` | sólo desde `completed\|closed` **y `trashed_at IS NULL`** | `:1036-1038`; cap. **`goal.archive`** | `archived_at` | — | **CHECK ata archive al terminal** ⇒ contradice §14 | — | `goal.archived` | **`goal.archive` = `false` ×6 (JS y SQL) ⇒ INALCANZABLE EN AMBOS** |
| **UNARCHIVE** | endpoint dedicado `/v1/plans/:id/unarchive` | `archived_at=null` | `planner.plans.v1.service.js:630-654` | `unarchive` | `completed\|closed` | `:1039-1041` | `archived_at=null` | — | igual | — | — | cap. denegada ⇒ inalcanzable. `unarchivePlanV1` tiene **0 llamadores** (`plannerPlansV1Frontend.ts:144-161`). `ROUTE_NAMES.PlanArchive` **no registrado** |
| **TRASH** | `/v1/plans/:id/trash` · `DELETE /goals/:id` (alias) | `trashed_at` + `trashed_by_member_id`; **`lifecycle` intacto** | V1 `:530-541` UPDATE directo; `trashGoal` | `trash` (mutations) | 4 campos + **CHECK `trash_actor_shape`** | `:1042-1046` | `lifecycle` intacto en ambos | **NINGUNO en ambos** ✔ | — | sí | `goal.trashed` | **`planner_plans` NO aparece en la papelera** ⇒ irrecuperable desde la UI |
| **RESTORE** | `/v1/plans/:id/restore` → **`restore_goal_rpc`** | limpia `trashed_at` + `trashed_by_member_id` | V1 `:567-579` | `restore` (mutations) | limpia los 4 campos | `:1047-1051` | — | **NO restaura hijos** en ambos | — | sí | — | goals: **pierde el lifecycle previo** (el bridge colapsa `preparation` y `paused` a `status='active'`). plans: no lo pierde, porque trash nunca cambió `lifecycle` |
| **FAIL** | `POST /goals/:id/fail` | escribe `failed_at` | `planner.goals.controller.js:242` | — | **no existe** | — | — | — | — | — | `goal.failed`? | **VOCUO**: CHECK prohíbe `failed`; `planner_goal_project_status` nunca lo devuelve |
| **CASCADA a hijos** | — | — | — | — | — | — | — | **NINGUNA en ambos** ✔ | | | | plans: `planner_plan_recompute_automatic_milestones` **sí** existe (VOLATILE, 5 call-sites) y completa/reabre milestones en silencio |

### 3.3 Observaciones estructurales (sin juicio)

| # | Observación |
|---|---|
| L-1 | `planner_goals` tiene **más** estados (`preparation`, `cancelled`); `planner_plans` tiene `draft`, `closed`. El nombre del Target (`Cancelled`) coincide con **goals**. |
| L-2 | `planner_goals` necesita **dos** columnas de estado (`lifecycle` + `status`); `planner_plans` **una** (+ `trash` sintético). |
| L-3 | `planner_plans` tiene 3 timestamps de lifecycle; `planner_goals` sólo `completed_at`/`closed_at`. |
| L-4 | `archive` está **atado al terminal** en `planner_plans` (CHECK) y **libre** en `planner_goals`, pero **inalcanzable en ambos**. |
| L-5 | `resume` funciona en `planner_plans`, da **409** en `planner_goals`. |
| L-6 | `reopen` **desarchiva** en `planner_plans`. |
| L-7 | **Ningún** sistema registra quién ejecutó la transición. `planner_plan_milestones` sí tiene `completed_by_*`; la raíz no. |

---

## 4. TASK RELATION (B3)

### 4.1 `planner_goals` — `planner_tasks.goal_id`

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| FK? | **SÍ**: `planner_tasks_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES planner_goals(id) ON DELETE SET NULL` | `RUNTIME RO VERIFIED` |
| ¿Compuesta con `household_id`? | **NO.** FK simple; la co-propiedad se valida **sólo dentro del RPC** de Tasks | `RUNTIME RO VERIFIED` + carry-over `RC-042` |
| Cardinalidad | Task → **0..1** Goal (columna escalar) | `RUNTIME RO VERIFIED` |
| ¿0..1 garantizado en DB? | **SÍ, estructuralmente** | |
| ¿Multi-homing posible? | **NO** | |
| Link writer | **UNO**: RPC `mutate_planner_task_v0` (create y update) | carry-over |
| Unlink writer | **SÍ, y es un update a `NULL`, no un delete** ⇒ **la Task sobrevive** | `planner.tasks.service.js:787-795` (carry-over) |
| UI reachable? | **SÍ**: `PlannerPlanDetailScreenV1.tsx:198-238` (link/unlink), alcanzable por la ruta literal `'PlanDetail'` desde `TaskForm.tsx:535` | `STATIC CONFIRMED` |
| Backend reachable? | **SÍ**: `PATCH /api/planner/tasks/:id`, autorizada como *ordinary edit* de Task (`task.edit_own/any`), **no** con capability de Plan | `routes/planner.js:96` |
| Scope validation | **IMPOSIBLE**: `planner_tasks` **no tiene `scope`** (`household_id uuid NOT NULL`, inmutable) | `RUNTIME RO VERIFIED` (39 columnas) |
| Visibility validation | **NINGUNA**: `visibility='personal'` en goals **no** se propaga, porque Tasks no tiene visibilidad | |
| RLS | `planner_tasks`: 3 policies capability-based (`select/insert/update`), **sin policy DELETE** ⇒ borrado duro bloqueado | carry-over |
| Trash behavior | Trash de Task **no** toca `goal_id`; Trash de Goal **no** toca Tasks ⇒ **un link a una Task trasteada sobrevive al Trash del Plan** | `INFERRED` |
| Delete behavior | `ON DELETE SET NULL` ⇒ si el Goal se borrara duro, la Task queda huérfana sin Plan | `RUNTIME RO VERIFIED` |
| Consumidores | `planner.goals.service.js:109-136`, `planner.tasks.service.js:488-511`, `planner.activity.service.js:33`, DB `:1026,1105`, FE `PlannerPlanDetailScreenV1.tsx:68,82,202`, `TaskForm.tsx:308,629`, `PlannerTasksScreen.tsx:132` | carry-over |
| Filas locales | **0 de 3 Tasks tienen `goal_id`** | `RUNTIME RO VERIFIED` |

### 4.2 `planner_plans` — sin relación directa

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| FK? | **NO existe ninguna.** `pg_constraint` de `planner_plans` sólo muestra 6 FKs de identidad | `RUNTIME RO VERIFIED` |
| Tabla puente | **`planner_plan_task_links`: NOT FOUND** | `NOT FOUND` |
| Relación disponible | **Sólo** `planner_plan_requirements(subject_type='external', external_kind='task')` con `external_entity_id uuid` **SIN FK** | `RUNTIME RO VERIFIED` |
| Cardinalidad | **N..1 por Plan** (índice único `(plan_id, external_kind, external_reference_key) WHERE subject_type='external' AND trashed_at IS NULL`) ⇒ la misma Task puede estar en N Plans | `RUNTIME RO VERIFIED` |
| ¿0..1 garantizado? | **NO** | |
| Link writer | **2 con garantías distintas**: `apply_planner_plan_structure_changeset_rpc` (valida) y `write_planner_plan_graph_rpc` (**fuerza `external_entity_id = NULL`**, no valida) | carry-over |
| Unlink writer | `action='trash'` **borra/trastea la fila del requirement** y no distingue "desvincular" de "eliminar" | carry-over |
| UI reachable? | **NO**: `PlannerPlanStructureEditScreen.tsx:90` sólo produce hitos | carry-over |
| Backend reachable? | **Parcial**: endpoints existen, sin superficie | |
| Scope validation | **SÍ, y es una restricción**: el validador **rechaza** Task en Plan personal ⇒ **un Plan personal no puede tener Tasks hoy** | carry-over |
| RLS | `trashed_at IS NULL AND planner_plan_can_read(plan_id,false)` | `RUNTIME RO VERIFIED` |
| Trash behavior | **Asimétrico**: trash de Plan **no** cascada a requirements; trash de milestone/measurement **sí** | carry-over |
| Delete behavior | `plan_id` FK **ON DELETE RESTRICT** | `RUNTIME RO VERIFIED` |
| Filas locales | **0 requirements** ⇒ 0 external, 0 task, 0 event | `RUNTIME RO VERIFIED` |

### 4.3 Doble autoridad / double-link

| Afirmación | Estado |
|---|---|
| Una Task puede estar enlazada **a la vez** por `goal_id` **y** por un requirement externo de `planner_plans` | **POSIBLE**: ningún CHECK, trigger ni FK los relaciona (`RUNTIME RO VERIFIED`) |
| La UI usa ambos mecanismos a la vez | carry-over: `PlannerPlanDetailScreenV1.tsx:202` escribe `goal_id` mientras el grafo puede traer un requirement externo de la misma Task |
| Nº de mecanismos de relación Plan↔Task hoy | **3**: `goal_id` (FK), requirement externo (sin FK), `origin_*` (sin FK) | `STATIC CONFIRMED (carry-over)` |

---

## 5. EVENT RELATION (B4)

### 5.1 ¿Tiene `planner_events` alguna columna de Plan o Goal?

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='planner_events' AND (column_name LIKE '%plan%' OR column_name LIKE '%goal%');
-- → 0 rows
```
`RUNTIME RO VERIFIED`. **NO existe `goal_id`. NO existe `plan_id`. NO existe FK a ninguna de las dos.**

### 5.2 Comparación

| Pregunta | `planner_goals` | `planner_plans` |
|---|---|---|
| FK a entidad raíz | **NO** | **NO** |
| Tabla puente | **NO** (`NOT FOUND`) | **NO** (`NOT FOUND`) |
| Único mecanismo | **NINGUNO** | `planner_plan_requirements(subject_type='external', external_kind='event')`, **sin FK** |
| Cardinalidad | — | **N..1 por Plan** |
| ¿0..1 garantizado? | — | **NO** |
| Link writer | — | `apply_…_changeset_rpc` (con validación) y `write_planner_plan_graph_rpc` (sin validación) |
| Unlink writer | — | `action='trash'` sobre el requirement |
| UI reachable? | **NO** | **NO** |
| Backend reachable? | **NO** | **Parcial** |
| Scope validation | — | **SÍ y correcta**: valida `(scope, household_id)` y `(scope, owner_person_id)` de `planner_events` |
| Visibility validation | — | Manual dentro del validador; **no** hay intersección con la policy de `planner_events` |
| RLS | — | Requirements: `can_read(plan_id,false)`. **`planner_plan_external_link_dto` es `SECURITY DEFINER`, lee `planner_events` y devuelve su `title` bypasseando RLS** (carry-over `S1`) |
| Trash behavior | — | trash de Plan **no** cascada a requirements |
| Delete behavior | — | `RESTRICT` |
| Filas locales | `planner_events` = **0 filas** | requirements external = **0 filas** |

### 5.3 Satisfaction de un Event vinculado

```sql
-- 20260722040000:534-537
-- External Task/Event requirements remain unbound and unsatisfied in M11.3A.
v_subject_satisfied := false;
```
`STATIC CONFIRMED` (re-leído).

**Consecuencia factual:** `planner_plan_requirement_satisfied` devuelve **`false` para todo requirement `external`**, sin excepción. Como el gate de completado exige que **no** haya requirement raíz `necessary` insatisfecho (`:1019-1027`), **un Event (o Task) marcado `necessary` bloquea el completado de forma permanente**, salvo `confirm_unresolved`.

**Contradicción con Product Truth §09:** un Event Required debería resolverse cuando "termina normalmente" y quedar "no resuelto" si se cancela. **Ninguna de las dos ramas existe.** `STATIC CONFIRMED`.

### 5.4 ¿El "external requirement" está realmente operativo?

| Dimensión | Estado |
|---|---|
| SQL | **SÍ** — escritores, lector, validador, CHECK e índice existen |
| Datos | **NO** — 0 filas |
| UI | **NO** — ningún writer de UI |
| Semántica de satisfacción | **ROTA por construcción** |
| Alcance de Task | **ROTO por construcción** (`planner_tasks` sin `scope`) |

⇒ **`RPC CAPABLE / PRODUCT UNREACHABLE / SEMANTICS BROKEN`**

---

## 6. MEASUREMENTS (B5)

### 6.1 Campo por campo

| Capacidad | `planner_goals` | `planner_plans` | ¿Duplicado? | ¿Semántica distinta? |
|---|---|---|---|---|
| **name** | **NO EXISTE** | `planner_plan_measurements.name text NOT NULL` + CHECK `length(btrim(name))>0` | — | goals no tiene noción de "nombre de medición" |
| **current** | `current_value numeric NOT NULL DEFAULT 0` + CHECK **`>= 0`** | `current_value numeric NOT NULL DEFAULT 0` + **sin CHECK** | **SÍ** | **SÍ**: goals no admite negativos; plans sí |
| **target** | `target_value numeric NULL` + CHECK `NULL or >= 0` | `target_value numeric NULL` + **sin CHECK** | **SÍ** | **SÍ** |
| **unit** | `unit text NULL` (**opcional**) | `unit text NOT NULL` + CHECK `length(btrim(unit))>0` (**obligatorio**) | **SÍ** | **SÍ** |
| **operator** | **NO EXISTE** | `target_operator text NOT NULL DEFAULT 'gte'` + CHECK `in ('gte','lte','eq')` | — | plans sí; goals no |
| **classification** | **NO EXISTE** | `classification text NOT NULL DEFAULT 'necessary'` + CHECK `in ('necessary','supporting')` | — | plans sí; goals no |
| **sort_order** | **NO EXISTE** | `sort_order integer NOT NULL DEFAULT 0` + CHECK `>= 0` | — | plans sí |
| **version** | (la de la raíz) | `version integer NOT NULL DEFAULT 1` + CHECK `>= 1` | — | |
| **history** | **NO EXISTE** | `planner_plan_measurement_history` (10 col): `value`, **`previous_value`**, `recorded_by_person_id NOT NULL`, `recorded_by_member_id`, `correction_of_id` (FK autorreferente), `operation_id NOT NULL` + `UNIQUE (measurement_id, operation_id)`, `recorded_at` | — | plans sí; goals no |
| **targetReached** | **NO EXISTE como tal**; se *calcula* en `attachProgress` (modo `numeric`) como **%** | **SÍ, dos veces**: vista `planner_plan_indicators` (`CASE target_operator`) y `planner.plans.service.js:133-138`, como **booleano** | **SÍ** | **SÍ**: % vs booleano |
| **trash** | `trashed_at` en la raíz | `trashed_at` + `trashed_by_person_id` + `trashed_by_member_id` + CHECK `trash_actor_shape` | — | |
| **RLS** | (la de la raíz) | `..._measurements_select`: `(trashed_at IS NULL) AND planner_plan_can_read(plan_id,false)` · `..._measurement_history_select`: `planner_plan_can_read(plan_id,false)` **sin filtro de `trashed_at`** | — | |
| **Writers** | `planner.goals.service.js` (UPDATE directo de `current_value`) | `write_planner_plan_graph_rpc` · `apply_…_changeset_rpc` · trigger `planner_plan_measurements_touch_version` | — | |
| **Readers** | `attachProgress` · `calculateProgress` | `planner_plan_indicators` · `read_planner_plan_graph_rpc` · `planner_plan_requirement_satisfied` | — | |
| **UI** | **VIVA**: `GoalForm:757-855` | **NINGUNA**: `PlannerPlanStructureEditScreen.tsx:17-28` sólo importa `planMilestoneEditor` | — | |

### 6.2 Veredictos fáctuales

| Pregunta | Respuesta |
|---|---|
| **CAPABILITY EXISTS IN GOALS?** | **PARCIAL.** Los 3 números (`current`, `target`, `unit`) existen y son editables desde la UI. **Faltan `name`, `operator`, `classification`, `history`, `targetReached` booleano y `sort_order`.** Los valores no tienen nombre: son atributos de la meta, no de una medición |
| **CAPABILITY EXISTS IN PLANS?** | **SÍ, completa.** 7/7 campos de PT §06 + `classification` + `sort_order` + `version` + `trash` + historial con corrección. **0 filas, 0 superficie UI** |
| **DUPLICATED?** | **SÍ, en 3 de 6 campos**: `current_value`, `target_value`, `unit` |
| **DIFFERENT SEMANTICS?** | **SÍ, en los 3 duplicados**: (a) rango `>= 0` vs sin CHECK; (b) `unit` opcional vs obligatorio; (c) resultado `%` vs booleano. Y goals **no tiene `name` ni `operator`** ⇒ `current/target` en goals **no es una Measurement conforme a §06** |

---

## 7. REQUIRED / OPTIONAL (B6)

**Objetivo declarado por PT §07/§19/§20:** band **plana** por componente, `Required`/`Optional`, sin grafo, sin jerarquía, sin condiciones manuales.

### 7.1 Inventario completo de lugares donde CURRENT guarda o deriva la clasificación

| # | Tabla | Columna | Tipo / Null / Default | CHECK | Writer | Reader | UI | Trigger | ¿Autoridad duplicada? | Filas |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `planner_plan_measurements` | `classification` | `text NOT NULL DEFAULT 'necessary'` | `in ('necessary','supporting')` | `write_planner_plan_graph_rpc` · `apply_…_changeset_rpc` | `planner_plan_indicators` · `planner_plan_requirement_satisfied` | **NINGUNA** | `planner_plan_measurements_touch_version` (sólo version) | **SÍ** | **0** |
| 2 | `planner_plan_milestones` | `classification` | `text NOT NULL DEFAULT 'necessary'` | `in ('necessary','supporting')` | ídem | ídem | `planMilestoneEditor` | + `planner_plan_recompute_automatic_milestones` | **SÍ** | **0** |
| 3 | `planner_plan_manual_conditions` | `classification` | `text NOT NULL DEFAULT 'necessary'` | `in ('necessary','supporting')` | RPC writers | ídem | **NINGUNA** | — | **SÍ** | **0** |
| 4 | `planner_plan_requirements` | `classification` | `text NOT NULL` **SIN DEFAULT** | `in ('necessary','supporting')` | RPC writers | ídem | **NINGUNA** | constraint trigger de grafo (`20260722040000:450-469`) | **SÍ — 4ª copia** | **0** |
| 5 | `planner_goals` | **NINGUNA** | — | — | — | — | — | — | — | — |
| 6 | `planner_plans` | **NINGUNA** | — | — | — | — | — | — | — | — |
| 7 | `planner_tasks` | **NINGUNA** | — | — | — | — | — | — | — | — |
| 8 | `planner_events` | **NINGUNA** | — | — | — | — | — | — | — | — |

`RUNTIME RO VERIFIED` para columnas/defaults/CHECKs; trigger de grafo `STATIC CONFIRMED (carry-over)`.

### 7.2 Hallazgos fácticos

| # | Hallazgo | Etiqueta |
|---|---|---|
| O-1 | La band'semántica **ya es 1:1 con PT**: `necessary`≡Required, `supporting`≡Optional | `STATIC CONFIRMED` |
| O-2 | Los gates de activación (`:1006-1010`) y de completado (`:1023`) filtran por `classification='necessary'` ⇒ **`supporting` ya puede quedar pendiente sin bloquear** ✔ | `STATIC CONFIRMED` |
| O-3 | `supporting_requirement_count` se reporta **aparte** en la vista ⇒ honesto | `RUNTIME RO VERIFIED` |
| O-4 | **La coacción sujeto↔requirement es un invariante NO fiable**: el trigger sólo valida subjects `milestone\|measurement\|manual_condition`; para `external` hay autorreferencia; y `apply_…_changeset_rpc:397` actualiza la `classification` del sujeto **sin** sincronizar el requirement ⇒ **divergencia silenciosa** | `STATIC CONFIRMED (carry-over)` |
| O-5 | **Required/Optional no puede existir hoy sobre Task ni Event enlazados a un Plan goals**, porque `planner_goals` no tiene ninguna tabla de componentes | `RUNTIME RO VERIFIED` |
| O-6 | Con 4 tablas y 0 filas, la "autoridad duplicada" es **de esquema, no de datos** | `RUNTIME RO VERIFIED` |
| O-7 | `planner_plan_requirements` arrastra vocabulario retirado: `subject_type`, `subject_shape`, `parent_requirement_id` (CHECK `planner_plan_requirements_not_self_parent`) | `RUNTIME RO VERIFIED` |
---

## 8. PROGRESS (B7)

### 8.1 Inventario de autoridades CURRENT de Progress

| # | Autoridad | Sistema | ¿Almacenada o derivada? | Entidades de entrada | Consumidor | ¿Alcanzable? | ¿Compatible con PT §10? |
|---|---|---|---|---|---|---|---|
| P-1 | `planner_plan_indicators` (7 contadores) | PLANS | **Derivada** (vista) | `planner_plan_milestones`, `planner_plan_measurements`, `planner_plan_requirements` | `toPlanGraphDto` (`planner.plans.service.js:189-197`) | **No** (0 filas de Plan ⇒ siempre vacío) | **NO.** El comentario de la vista es `'There is intentionally no percentage column.'` ✔ pero cuenta **Milestones y Requirements** (retirados) y **cero Tasks, cero Events** |
| P-2 | `attachProgress` → `progress_percentage` | GOALS | **Derivada en JS** | `planner_goals.progress_mode/current_value/target_value/status` + `planner_tasks` (modo `tasks`) + `planner_goal_milestones` (modo `steps`) | `listGoals:353`, `getGoalById:374`, `createGoal:423` | **SÍ — VIVA** | **NO.** §10 prohíbe explícitamente "un único porcentaje universal que mezcle Tasks, Events y Measurements" |
| P-3 | Lectura de 6 columnas inexistentes | GOALS | Derivada (siempre `undefined`) | `progress_percentage`, `tasks_total/completed/pending`, `milestones_total/completed` | `toPlanDto` del V1 (`planner.plans.v1.service.js:112-117`) | **SÍ, pero muerta en runtime** (`?? null`) | **NO** |
| P-4 | Barras de % en frontend | ambos | Derivada | campo inexistente | `PlannerPlanListScreen.tsx:199,206-211` · `PlannerPlanDetailScreenV1.tsx:415-437` | **SÍ — siempre vacías en runtime** | **NO** |
| P-5 | Tasks dentro del progreso de Plan | GOALS | Derivada | `calculateProgressFromTasks` (`planner.goals.service.js:174-176`, sólo modo `tasks`) | `attachProgress` | **Condicional** (el create siempre manda `steps` ⇒ **inalcanzable desde la app actual**) | **PARCIAL**: es "Tasks N/total" de §10, pero mezclado en un % |
| P-6 | Tasks en el progreso de Plan **canónico** | PLANS | — | — | — | **NO EXISTE**: `planner.plans.service.js` **no lee `planner_tasks` en absoluto** | **NO** |
| P-7 | Progreso en Home | GOALS | Sort **JS en memoria** (no SQL) | `attachProgress` | `planner.summary.service.js:227-234` | El Home **no renderiza** `summary.goal` ni `counts.goals` | **NO** |
| P-8 | Measurements como progreso | PLANS | Derivada | `planner_plan_indicators.reached_measurement_count` | DTO `measurements[].targetReached` | **No** (sin UI) | **PARCIAL**: el dato es correcto (§06/§10) pero **no se expone etiquetado como progreso** |

### 8.2 Veredictos fácticos

| Pregunta | Respuesta |
|---|---|
| ¿Cuántas autoridades de Progress hay? | **8** (`P-1`…`P-8`); **4 alcanzables**; **ninguna** produce una lectura factual de las 3 formas de §10 |
| ¿"Tasks N/total"? | **Parcial**: `P-5`, pero como **porcentaje**, y sólo si `progress_mode='tasks'` |
| ¿"Events ocurrido/total"? | **NO. EN NINGUNA CAPA** |
| ¿"Measurements current/target"? | Los datos existen, pero **no se exponen como progreso** |
| ¿Se persiste algo derivado? | GOALS: **SÍ** (`status` duplica `lifecycle`). PLANS: **NO** |
| ¿`progress_mode` con datos no nulos? | **SÍ**: 1 fila con `'steps'` (`RUNTIME RO VERIFIED`) |

---

## 9. READINESS (B8)

| Autoridad | Sistema | ¿Almacenada o derivada? | Inputs | Consumidor | ¿Alcanzable? | Divergencia conocida |
|---|---|---|---|---|---|---|
| Gate de **activación** (autoritativo) | PLANS | Derivada, en el RPC | ≥1 `milestone\|measurement\|manual_condition` no trasteado; **y** cero requirement `external` `necessary` | `write_planner_plan_graph_rpc:1000-1010` | Backend sí, **UI no** (0 Planes) | **Cuenta cero Tasks y cero Events** ⇒ un Plan cuyo único contenido sea Tasks/Events **no puede activarse**. Contradice §01/§18 |
| Gate de **completado** (autoritativo) | PLANS | Derivada, en el RPC | requirement raíz `necessary` insatisfecho | mismo RPC `:1019-1027` | Backend sí, UI no | Mira **requirements**, no componentes ⇒ no puede listar "qué Task/Event queda" (§11) |
| Satisfacción | PLANS | Derivada, **recursiva** con detección de ciclo por `uuid[]` | `planner_plan_requirement_satisfied_internal:491-556` | gates + vista + DTO | Backend sí, UI no | `external ⇒ false` **siempre** ⇒ un componente Required externo bloquea para siempre |
| `projectActivationReadiness` / `projectCompletionReadiness` | frontend | **Derivada en cliente** | grafo del DTO | `services/planner/planStructureContract.ts:354-431` | **NO — 0 consumidores UI** | **Doble autoridad** que además está muerta |
| Readiness en goals | GOALS | **NO EXISTE** | — | — | — | `attachProgress` no es readiness; `completeGoal` cierra **a ciegas** |

- `read_planner_plan_readiness_rpc`: **`NOT FOUND`**. No existe endpoint de readiness.
- `confirm_unresolved` (`write_planner_plan_graph_rpc:1025`): escape hatch del gate de completado.

---

## 10. SATISFACTION SEMANTICS (B9)

### 10.1 Task — qué estados se consideran satisfied/completed

| Sistema | Regla | Implementación | Etiqueta |
|---|---|---|---|
| `planner_goals` | `status IN ('completed','verified')` | `calculateProgressFromTasks` `planner.goals.service.js:130-132` | `STATIC CONFIRMED` |
| `planner_plans` | **NO EXISTE** (`planner.plans.service.js` no lee `planner_tasks`) | — | `STATIC CONFIRMED` |
| DB (vía requirement external task) | **`false` siempre** | `20260722040000:534-537` | `STATIC CONFIRMED` |

PT §04 no define "satisfied" para Task; define "completar la Task" y "desvincular nunca elimina". Ambas cosas las cumple **ninguno** de forma contradicting (unlink≠delete ✔ en goals; complete no cascada a hijos ✔ en ambos).

### 10.2 Event — qué estados/fechas se consideran satisfied

| Sistema | Regla |
|---|---|
| `planner_goals` | **NO EXISTE** (no hay relación) |
| `planner_plans` | **`false` siempre** (`20260722040000:534-537`) |

PT §09 define 4 reglas (futuro→pendiente, en curso→pendiente, terminado normalmente→resuelto, cancelado→no resuelto, eliminado→deja de participar). **Ninguna está implementada.** `STATIC CONFIRMED`.

### 10.3 Measurement — cómo se calcula `targetReached`

| Sistema | Fórmula | Dónde | Nota |
|---|---|---|---|
| `planner_goals` | `round(current/target*100)` con clamp `[0,100]`; `target<=0` ⇒ `current>0?100:0`; `target NULL` ⇒ `null` | `calculateProgress` `planner.goals.service.js:156-167` | devuelve **%**, no booleano; `mode='boolean'` ⇒ `current_value>=1 ? 100 : 0` |
| `planner_plans` | `CASE target_operator WHEN 'gte' THEN current>=target WHEN 'lte' THEN current<=target WHEN 'eq' THEN current=target ELSE NULL END` | vista `planner_plan_indicators` (`RUNTIME RO VERIFIED`) **y** `planner.plans.service.js:133-138` | **dos implementaciones del mismo cálculo**, sin test que demuestre paridad |

### 10.4 Separación exigida en B9

| Categoría | Contenido |
|---|---|
| **actual implementation** | Task: `status in (completed,verified)` (goals) · Event: ninguno · Measurement: 2 implementaciones (SQL + JS) |
| **dead implementation** | `planner_plan_recompute_automatic_milestones` (VOLATILE, `SECURITY INVOKER`, `revoke all` a `authenticated`) — 5 call-sites vivos, 0 filas ⇒ nunca ejecutado con datos · rama `external` de la satisfacción · `projectCompletionReadiness` (0 consumidores) · literales `blocked`/`review` en Attention |
| **Product Truth comparison** | §09 **no implementado en ninguna capa** · §12 (`Measurement reached ≠ Plan completed`) **CUMPLIDO en ambos** · §11 (`Completar un Plan NO completa sus hijos`) **CUMPLIDO en ambos** |

---

## 11. AUTH / RLS (B10)

> Input: `PLANS_CAPABILITY_MAP_CURRENT_V1.md`. **No se repite la auditoría**; sólo la comparación. Filas `carry-over` no fueron re-leídas línea a línea aquí.

| Dimensión | `planner_goals` | `planner_plans` | Etiqueta |
|---|---|---|---|
| **read (HTTP)** | `GET /goals*` → `assertCapability(planner.view)` | `GET /plans*` → **sin `assertCapability`** en `getPlanGraph`; el RPC sí llama `planner_plan_can_read` | `STATIC CONFIRMED` (`planner.plans.controller.js:93-101`) |
| **read (RLS)** | `planner_goals_select_visible`: `deleted_at IS NULL AND is_active_household_member AND (visibility='household' OR created_by_member_id = current_household_member_id)` — **NO filtra `trashed_at`** | `planner_plans_select`: `planner_plan_can_read(id,false)` — que **sí** exige `trashed_at IS NULL` | `RUNTIME RO VERIFIED` |
| **insert** | `POST /goals` → `goal.create_household`/`goal.create_personal` (JS) + policy INSERT **sin capability** | `POST /plans` → `goal.create_household` (JS) + `planner_plan_actor_has_capability` dentro del RPC | `STATIC CONFIRMED` |
| **update** | `PATCH /goals/:id` → `goal.edit_own` (**siempre own**) + policy UPDATE **sin capability** | mutations → `capabilityForWrite` own/any + `planner_plan_can_mutate` | `STATIC CONFIRMED` |
| **delete** | **No hay DELETE físico**: `DELETE /goals/:id` es **alias de trash** | Sin `grant delete`; `authenticated` no puede borrar | `STATIC CONFIRMED` |
| **RPC** | `restore_goal_rpc` (endurecido), `trash_goal_rpc` (**sin guard** — carry-over `RC-033` P0), `trash_milestone_rpc`, `soft_delete_goal_milestone_rpc`, `reserve/complete_planner_idempotency_key` | `read_planner_plan_graph_rpc`, `write_planner_plan_graph_rpc`, `apply_planner_plan_structure_changeset_rpc`, `planner_plan_authorization_context_rpc` | `STATIC CONFIRMED` / carry-over |
| **direct write** | **SÍ y es el camino real**: INSERT/UPDATE directos con el cliente del actor | **PROHIBIDO**: `revoke all` a `public/anon/authenticated`, `grant select` only | `RUNTIME RO VERIFIED` |
| **RLS strength** | `relacl = {postgres, **anon**, **authenticated**, service_role} = arwdDxtm` ⇒ `anon` puede **escribir**, sujeto sólo a RLS | `relacl = {postgres, service_role=arwdDxtm, authenticated=**r**}` ⇒ `anon` sin nada, `authenticated` sólo lectura | `RUNTIME RO VERIFIED` |
| **`goal.*` namespace** | 11 keys en JS; SQL representa **9** (faltan `create_personal`, `manage_participants`) | igual | carry-over |
| **`planner.view`** | gate de lectura JS | precondición de `planner_plan_can_read`/`can_mutate` | carry-over |
| **actor identity** | `account → person → household → member`; `membershipId` servidor; **`p_member_id` del llamante NO validado** en `trash_goal_rpc` | `auth.uid()` → `current_person_id()` / `current_household_member_id`; **sin params de actor**; `restore_goal_rpc` **rechaza** `p_member_id ≠ actor` | carry-over + `STATIC CONFIRMED` |
| **personal ownership** | `visibility='personal'` + "soy el creador" (comparación con `member_id`) | `owner_person_id = current_person_id()` | `RUNTIME RO VERIFIED` |
| **household ownership** | `household_id NOT NULL` + `is_active_household_member` | `scope='household'` ⇒ `household_id NOT NULL` + `owner_person_id IS NULL` + `created_by_member_id NOT NULL` (CHECK `owner_shape`) | `RUNTIME RO VERIFIED` |
| **SECURITY DEFINER** | 2 de 4 RPC de Plan/Goal | 3 de 3 RPC de Plan | `RUNTIME RO VERIFIED` (`proacl`, `prosecdef`) carry-over |
| **idempotency** | `withIdempotency` V0 + `reserve/complete_planner_idempotency_key`; `planner_idempotency_keys` = **11 filas** | `planner_plan_operations` (18 col: `mutation_id`, `idempotency_key`, `request_hash`, `before_state`, `result_state`, `outcome`, `response_body`) = **0 filas** | `RUNTIME RO VERIFIED` |
| **version** | `version` + trigger `trg_planner_goals_increment_version` | `version` + trigger `planner_plans_touch_version` + `p_expected_version` | `RUNTIME RO VERIFIED` |
| **optimistic conflict** | `If-Match` / `expected_version` obligatorio (`parseRequiredExpectedVersion`) | igual, más `expected_plan_version` | `STATIC CONFIRMED` |
| **audit trail** | `planner_activity_log` (1 fila), `household_id NOT NULL`, `entity_type IN ('task','event','goal','milestone')` — **`'plan'` NO admitido** | `planner_plan_operations` (0 filas) + `planner_plan_measurement_history.operation_id` | `RUNTIME RO VERIFIED` |
| **`FORCE ROW LEVEL SECURITY`** | `false` | `false` | `RUNTIME RO VERIFIED` |
| **Policies** | 3 (SELECT, INSERT, UPDATE) | 1 (SELECT) | `RUNTIME RO VERIFIED` |

### 11.1 Veredictos de la comparación (vocabulario permitido, sin jerarquía)

| Dimensión | Veredicto |
|---|---|
| ROLE MODEL | **BOTH** |
| READ AUTH | **DIVERGENT** |
| CREATE AUTH | **DIVERGENT** |
| EDIT AUTH | **DIVERGENT** |
| LIFECYCLE AUTH | **DIVERGENT** |
| ARCHIVE AUTH | **BOTH (denegado)** |
| TRASH AUTH | **BOTH** (`goal.restore`) |
| RESTORE AUTH | **DIVERGENT** (RPC endurecido vs `can_mutate`) |
| PERSONAL AUTH | **DIVERGENT** |
| HOUSEHOLD AUTH | **BOTH** |
| TASK LINK AUTH | **A HAS** (vía Tasks) · **B NOT IMPLEMENTED** como superficie |
| EVENT LINK AUTH | **NEITHER** |
| MEASUREMENT AUTH | **B HAS** · **A NEITHER** |
| OVERRIDE SUPPORT | **BOTH** (`households.config.permissions`; 0 overrides `goal.*` reales) |
| RLS STRENGTH | **DIVERGENT** |
| RPC GUARDS | **B HAS** · **A parcial** |
| IDENTITY MODEL | **DIVERGENT** (member vs person) |

---

## 12. API / SERVICE / CLIENT MAP (B11)

### 12.1 Las tres familias

| | **GOALS** | **V1 PLANS** | **CANONICAL PLANS** |
|---|---|---|---|
| **Root path** | `/api/planner/goals` | `/api/planner/v1/plans` | `/api/planner/plans` |
| **Route file** | `routes/planner.js:123-140` | `routes/planner.v1.js:6-13`, montado en `routes/planner.js:143` | `routes/planner.js:69-74` |
| **Controller** | `planner.goals.controller.js` (485 líneas) | `planner.plans.v1.controller.js` (8 asserts) | `planner.plans.controller.js` (229 líneas) |
| **Service** | `planner.goals.service.js` (1170 líneas) | `planner.plans.v1.service.js` (706 líneas) | `planner.plans.service.js` (373 líneas) |
| **TABLE** | **`planner_goals`** | **`planner_goals`** | **`planner_plans`** + 6 tablas `planner_plan_*` |
| **RPC** | `restore_goal_rpc`, `trash_goal_rpc` | `restore_goal_rpc` | `read/write_planner_plan_graph_rpc`, `apply_…_changeset_rpc`, `planner_plan_authorization_context_rpc` |
| **Frontend client** | `services/plannerGoals.ts` (454 líneas) | `services/plannerPlansV1Frontend.ts` (187) + **`services/plannerPlansV1.ts` (172, DUPLICADO MUERTO, 0 importadores)** | `services/planner/plannerPlans.ts` |
| **Frontend type** | `PlannerGoal` (30 campos, sin `lifecycle`) | `PlannerPlanV1` | `PlannerPlan` |
| **Endpoints** | 11 (`list,create,get,patch,delete,trash,restore,complete,close,reopen,fail`) + 6 de milestones | 8 | 5 + 1 report |
| **Alcanzable desde la app** | **create ✔, list ✔ (vía V1), detail ✘, lifecycle ✔, trash ✔, restore ✔** | **list ✔, detail ✔ (vía ruta literal `'PlanDetail'`), create ✘ (pantalla inalcanzable)** | **create ✘, detail ✔ (montada pero 404), lifecycle ✔, edit-structure ✔** |
| **Consumers (frontend)** | `GoalForm`(vivo), `TaskForm`(vivo), `PlannerTasksScreen`(vivo: `listGoals`), `plannerSubmitAdapter`(vivo), `reliability/productiveAdapters`(vivo), `plannerKeys`(tipos), `GoalDetailScreen`(MUERTO), `PlannerGoalsScreen`(MUERTO) | `PlannerPlanListScreen`(vivo), `PlannerPlanDetailScreenV1`(vivo), `PlannerPlanCreateScreen`(MUERTO) | `PlannerPlanDetailScreen`(vivo, 404), `PlannerPlansScreen`(MUERTO) |
| **ID space** | `planner_goals.id` | `planner_goals.id` | `planner_plans.id` |

### 12.2 Qué habría que cortar si una autoridad desaparece (objetivo de B11)

**Si `planner_goals` desaparece:**

| Consumer | Tipo | Efecto |
|---|---|---|
| `PlannerPlanListScreen` (`listPlansV1`) | cliente | hay que re-apuntar a `/api/planner/plans` |
| `GoalForm` (`createGoal`) | cliente + pantalla | hay que re-apuntar |
| `PlannerPlanDetailScreenV1` | pantalla | 4 endpoints (`getPlanByIdV1`, `transitionPlanV1`, `trashPlanV1`, `restorePlanV1`) + `openTaskForm` |
| `PlannerPlanCreateScreen` | pantalla (muerta) | 1 endpoint |
| `PlannerTasksScreen` (`listGoals`) | cliente | **el tab Tareas lee `planner_goals`** |
| `TaskForm` | cliente | 2 rutas de retorno (`'PlanDetail'`, `'GoalDetail'`) |
| `plannerSubmitAdapter` + `reliability/productiveAdapters` | servicio de mutaciones | quick-create de goal |
| `planner.goals.controller.js` + `planner.goals.service.js` | backend | 11 endpoints + 6 de milestones + `attachProgress` |
| `planner.plans.v1.controller.js` + `planner.plans.v1.service.js` | backend | 8 endpoints |
| `planner.summary.service.js:373` | backend | Home summary (degradado, no renderizado) |
| `planner.trash.service.js:69,125,133,136,195` | backend | **fallo duro** de la papelera |
| `planner.tasks.service.js:495` | backend | filtro `?goal_id=` ⇒ 404 `goal_not_found` |
| `planner.activity.service.js` | backend | 11 call-sites de `recordPlannerActivity` |
| `planner_goals` + `planner_goal_milestones` | DB | 2 tablas + la vista projection |
| `PlannerGoal` + `PlannerGoalMilestone` + `CreatePlannerGoalInput` | tipos | 3 tipos |
| `services/plannerGoals.ts` | cliente | 20+ funciones |
| `GoalDetailScreen`, `PlannerGoalsScreen`, `EditGoalScreen`, `PlannerGoalsForm` | pantallas | 4 (3 ya muertas) |
| `services/plannerPlansV1.ts` + `plannerPlansV1Frontend.ts` | clientes | 2 |
| `types/PlannerPlanV1.ts` | tipo | 1 |

**Si `planner_plans` desaparece:**

| Consumer | Tipo | Efecto |
|---|---|---|
| `PlannerPlanDetailScreen` + `PlannerPlansSurfaces` + `PlannerPlanStructureEditScreen` | 3 pantallas | re-apuntar a goals ⇒ **imposible sin perder campos que goals no tiene** (`scope`, `finalization_kind`, `restore_review_required`) |
| `planner.plans.controller.js` + `planner.plans.service.js` | backend | 6 endpoints |
| `services/planner/plannerPlans.ts` | cliente | `getCanonicalPlanGraph`, `buildPlanLifecycleWrite`, `createPlanWriteIntent`, `listCanonicalPlans`, `writePlanGraph`, `applyStructure` |
| `services/planner/reliability/` + `planWriteTrace` + `planWriteSingleFlight` + `planCompositionTrace` | infraestructura | cola de escrituras, single-flight, trazas |
| `planner.search.service.js:245` | backend | Search deja de indexar Planes |
| `planner.attention.service.js:233,264` | backend | Attention deja de leer Plans |
| `planner.trash.service.js` | backend | **(no está)** ⇒ nada que cortar, pero tampoco está |
| 8 tablas `planner_plan_*` | DB | `planner_plans`, `_milestones`, `_measurements`, `_measurement_history`, `_requirements`, `_manual_conditions`, `_operations`, `_legacy_goal_links` |
| 2 vistas | DB | `planner_plan_indicators`, `planner_legacy_goal_plan_projection` |
| ~12 funciones SQL | DB | `read/write_planner_plan_graph_rpc`, `apply_…_changeset_rpc`, `planner_plan_can_read/mutate`, `planner_plan_actor_has_capability`, `planner_plan_requirement_satisfied[_internal]`, `planner_plan_authorization_context_rpc`, `planner_plan_external_link_dto`, `planner_plan_validate_external_link`, `planner_plan_recompute_automatic_milestones` |
| `PlannerPlan` + `PlannerPlanGraphDto` + `PlanStructureChangeset` | tipos | 3+ |
| `planStructureContract.ts`, `planMilestoneEditor.ts` | servicios | derivaciones de readiness/structure |
| `plannerDeepLinkCoordinator.ts:276` | navegación | destino de deep links |

### 12.3 Conteo de "cosas que cortar" (factual)

| | `planner_goals` | `planner_plans` |
|---|---|---|
| Tablas | 2 | 8 |
| Vistas | 1 | 1 |
| Funciones SQL de dominio | ~8 | ~12 |
| Endpoints HTTP | 17 (+6 milestones) | 6 |
| Controllers | 2 | 1 |
| Services | 2 | 1 |
| Clientes frontend | 2 + 1 duplicado muerto | 1 |
| Tipos frontend | 2 | 1 + `PlannerPlanV1` (parcial) |
| Pantallas | 3 vivas + 4 muertas | 2 vivas + 2 muertas |
| Filas locales | 1 | **0** |
---

## 13. FRONTEND CONSUMERS (B12)

**App real, no Figma.** `Figma-app` excluido como authority (regla del encargo).

| Superficie | Screen | Client | Backend | Tabla | Sistema | Estado |
|---|---|---|---|---|---|---|
| **Plan list** | `PlannerPlanListScreen` (`PlannerScreen:787`) | `listPlansV1` | `GET /api/planner/v1/plans` | **`planner_goals`** | goals | **LIVE** |
| **Plan create** | `CreateGoalScreen` → `GoalForm` | `createGoal` | `POST /api/planner/goals` | **`planner_goals`** | goals | **LIVE** |
| Plan create (canónico) | `PlannerPlanMinimalCreateSurface` en `PlannerSheetHost:512` | `enqueuePlannerPlanGraphWrite(…,'create')` | `POST /api/planner/plans` | `planner_plans` | plans | **UNREACHABLE** (`create_goal implemented:false`; `plan_form` sin opener) |
| Plan create (V1 alterno) | `PlannerPlanCreateScreen` | `createPlanV1` | `POST /api/planner/v1/plans` | `planner_goals` | goals | **UNREACHABLE** (nadie navega a `'CreatePlan'`) |
| **Detail** | `PlannerPlanDetailScreen` (`'GoalDetail'`) | `getCanonicalPlanGraph` | `GET /api/planner/plans/:id` → RPC | **`planner_plans`** | plans | **LIVE pero 404** para todo id creado por la app |
| Detail (V1) | `PlannerPlanDetailScreenV1` (ruta literal `'PlanDetail'`) | `getPlanByIdV1` | `GET /api/planner/v1/plans/:id` | **`planner_goals`** | goals | **LIVE** (coherente) |
| Detail (legacy) | `GoalDetailScreen` | `getGoalById` | `GET /api/planner/goals/:id` | `planner_goals` | goals | **DEAD** (0 importadores) |
| **Edit** | `PlannerPlanStructureEditScreen` (rutas `'EditGoal'` **y** `'EditPlan'`) | `applyStructureChangeset` | `POST /api/planner/plans/:id/structure` | `planner_plans` | plans | **LIVE** (sin Plan que editar) |
| Edit sobre goals | `EditGoalScreen` | — | — | `planner_goals` | goals | **DEAD** (no registrado) |
| **Task link** | `PlannerPlanDetailScreenV1:198-211` | `PATCH /api/planner/tasks/:id` (`goal_id`) | `mutate_planner_task_v0` | `planner_tasks.goal_id` | goals | **LIVE** |
| **Task unlink** | `PlannerPlanDetailScreenV1:213-238` | `PATCH /api/planner/tasks/:id` (`goal_id:null`) | mismo | `planner_tasks` | goals | **LIVE** |
| Task link/unlink (plans) | — | — | `planner_plan_requirements` | `planner_plans` | plans | **NOT IMPLEMENTED** |
| **Lifecycle** | `PlannerPlanDetailScreenV1:114-152,441-494,597-623` | `transitionPlanV1`, `trashPlanV1`, `restorePlanV1` | `/v1/plans/:id/transition|trash|restore` | `planner_goals` | goals | **LIVE** (botones HARDCODED, sin gate de capabilities) |
| Lifecycle (canónico) | `PlannerPlanDetailScreen:65-151` → `PlannerPlansSurfaces:147-199` | `buildPlanLifecycleWrite` | `POST /api/planner/plans/:id/mutations` | `planner_plans` | plans | **LIVE** (renderiza `availableActions` del backend) |
| **Archive** | `PlannerPlanDetailScreenV1` lista `archive` pero las ramas terminal **sólo renderizan Reabrir** | `transitionPlanV1('archive')` | `/v1/plans/:id/transition` | `planner_goals` | goals | **UNREACHABLE** (UI + capability) |
| Archive (canónico) | `PlannerPlansSurfaces:189-197` | `writePlanGraph` | mutations | `planner_plans` | plans | **UNREACHABLE** (`goal.archive=false`) |
| **Trash** | `PlannerPlanDetailScreenV1:597-603` (incondicional) | `trashPlanV1` | `/v1/plans/:id/trash` | `planner_goals` | goals | **LIVE** |
| **Restore** | `PlannerTrashScreen:112-161` | `restoreGoal` / `restorePlanV1` | `POST /goals/:id/restore` → `restore_goal_rpc` | `planner_goals` | goals | **LIVE** |
| Trash/Restore (plans) | `PlannerTrashScreen` `handleRestore` `case 'task'\|'event'\|'goal'\|'milestone'` | — | `GET /api/planner/trash` | **no consulta `planner_plans`** | plans | **AUSENTE** |
| **Measurements** | — | — | mutations / changeset | `planner_plan_measurements` | plans | **NO EXISTE** en frontend |
| Measurements (goals) | `GoalForm:757-855` | `createGoal`/`updateGoal` | `POST/PATCH /goals` | `planner_goals.current/target_value/unit` | goals | **LIVE**, pero es un progreso numérico, no una Measurement |
| **Search** | `PlannerSearchScreen` | `searchPlanner` | `GET /api/planner/search` | **`planner_plans`** (`:245`) + tasks + events | plans | **LIVE** ⇒ siempre vacío para Plan |
| **Attention** | `PlannerAttentionActivityScreen` | `getAttention` | `GET /api/planner/attention` | **`planner_plans`** (`:233,264`) | plans | **LIVE** ⇒ 2 de 4 fuentes vacías; navega a `'GoalDetail'` (coherente) |
| **Home** | `useHomePlannerSummary` | `getSummary` | `GET /api/planner/summary` | **`planner_goals`** (`:373`) | goals | **LIVE, pero NO renderiza el Plan** (`summary.goal`/`counts.goals` sólo en checks de vacío) |
| **Activity** | `PlannerAttentionActivityScreen` | `listActivity` | `GET /api/planner/activity` | `planner_activity_log` | transversal | **LIVE**; `entity_type` **no admite `'plan'`**; **sin filtro de privacidad** |
| **Deep links** | `PlannerDeepLinkProvider` | `plannerDeepLinkCoordinator` | `homeplus://planner/goals/:id` | destino `planner_plans` | **MISMATCH** | **LIVE**: produce intent con id de `planner_goals` y lo manda a un lector de `planner_plans` |
| **Notifications** | `plannerNotificationAdapter:198-206` | `NoopNotifications` | — | — | — | **STUB** sin transporte |
| **Task detail → Plan** | `TaskDetailScreen:1243` · `TaskForm:535,714` | — | — | `planner_goals` | goals | **LIVE** con dos destinos incoherentes entre sí |
| Goals list (legacy) | `PlannerGoalsScreen` | `listGoals` | `GET /api/planner/goals` | `planner_goals` | goals | **DEAD** (0 importadores) |
| Canonical plans list | `PlannerPlansScreen` | `listCanonicalPlans` | `GET /api/planner/plans` | `planner_plans` | plans | **DEAD** (0 importadores) |
| Goal form (legacy) | `PlannerGoalsForm` | — | — | — | goals | **DEAD** |

---

## 14. CROSS-PLANNER (B13)

| Superficie | Fuente CURRENT | ID system | Qué se rompería si **`planner_goals`** desaparece | Qué se rompería si **`planner_plans`** desaparece | Etiqueta |
|---|---|---|---|---|---|
| **Home** | `planner.summary.service.js:373` → `planner_goals` | `planner_goals` | Sección degradada (`partial_errors`), `counts.goals=0`, `goal=null`. **Impacto de UI: CERO** | **Nada** (Home nunca leyó `planner_plans`) | `STATIC CONFIRMED` |
| **Search** | `planner.search.service.js:245` → `planner_plans` (+ tasks `:217`, events `:231`) | `planner_plans` | **Nada** | **Search deja de indexar Plans** | `STATIC CONFIRMED` |
| **Attention** | `planner.attention.service.js:233,264` → `planner_plans` | `planner_plans` | **Nada** | **Attention deja de leer Plans** (2 de 4 fuentes) | `STATIC CONFIRMED` |
| **Activity** | `planner_activity_log` (`entity_type IN task/event/goal/milestone`) | transversal (`entity_id` polimórfico) | Segue funcionando con DTOs huérfanos; el presenter remapea `goal→plan` **sólo en presentación** | Segue funcionando; pero **`'plan'` no es un `entity_type` válido en DB**, así que un Plan canónico **no puede registrarse** | `RUNTIME RO VERIFIED` + `STATIC CONFIRMED` |
| **Trash** | `planner.trash.service.js:69,125,133,136,195` → `planner_goals` (**con `supabaseAdmin`**) | `planner_goals` | **FALLO DURO** ⇒ `PlannerTrashScreen` → `ErrorState` | **Nada adicional** (ya no está) | `STATIC CONFIRMED` |
| **Notifications** | `plannerNotificationAdapter:198-206` | `goal_detail` | El deep link ya apunta a `planner_plans` ⇒ ya no hay destino coherente | igual | carry-over |
| **Deep links** | `plannerDeepLinkCoordinator.ts:273-280` → destino `planner_plans`, path `goals/:id` | **MISMATCH** | El parser sigue produciendo el intent; el destino lee otra tabla | El parser debe cambiar de path | `STATIC CONFIRMED` |
| **Quick Actions** | `PlannerSheetHost:465` → `write_planner_plan_graph_rpc` → `planner_plans` | `planner_plans` | **No afectado** — pero `create_goal` está oculto ⇒ la escritura es inalcanzable | Se pierde el único writer canónico | `STATIC CONFIRMED` |
| **Tasks tab** | `PlannerTasksScreen:14` → `listGoals` → `planner_goals` | `planner_goals` | **El tab Tareas deja de listar metas** | Nada | `STATIC CONFIRMED` |
| **Tasks filter** | `GET /api/planner/tasks?goal_id=` → `planner.tasks.service.js:495` | `planner_goals` | 404 `goal_not_found` para cualquier `goal_id` | El filtro queda sin destino ⇒ **pregunta abierta** | `STATIC CONFIRMED` |
| **Calendar / Schedules** | `household_schedule_*` | — | Sin dependencia | Sin dependencia | `STATIC CONFIRMED` |
| **Inventory** | `planner_tasks` (vía `origin_*`) | — | Sin dependencia | Sin dependencia | `STATIC CONFIRMED` |
| **Responsibilities** | `planner_tasks.responsibility_id` | — | Sin dependencia | Sin dependencia | `STATIC CONFIRMED` |
| **Homi / AI** | — | — | `NOT FOUND` | `NOT FOUND` | `NOT FOUND` |

### 14.1 Quién toca cada tabla

| Tabla | `.from()` en `backend/src` |
|---|---|
| `planner_goals` | **27** (summary 1 · trash 5 · tasks 1 · goals 13 · plans.v1 7) — carry-over, re-verificado en trash/tasks/summary/plans.v1 |
| `planner_plans` | **4 SELECT directos + 4 RPC** (`planner.plans.service.js:244`, `planner.attention.service.js:233,264`, `planner.search.service.js:245`, RPCs en `planner.plans.service.js:260,269,279,326`) |

---

## 15. SECURITY / RELIABILITY PIECES (B14)

Inventario **sin recomendar**. `SYSTEM`: `BOTH` / `GOALS ONLY` / `PLANS ONLY` / `NEITHER`.

| # | Pieza | System | Implementación | ¿Usada? | ¿Runtime verified? | ¿Defecto conocido? |
|---|---|---|---|---|---|---|
| SEC-1 | **Escritura sólo por RPC** | **PLANS ONLY** | `revoke all` a `public/anon/authenticated` + `grant select`; `authenticated` sin `insert/update/delete` | **SÍ** | **SÍ** (`relacl`) | Ninguno |
| SEC-2 | **Escritura directa con cliente del actor** | GOALS | INSERT/UPDATE directos con `createSupabaseForToken` | **SÍ** | **SÍ** | `anon` conserva `arwdDxtm` |
| SEC-3 | **`auth.uid()` derivado del actor** | **PLANS ONLY** | `current_person_id()` / `current_household_member_id()` en el RPC; **sin params de actor** | **SÍ** | `STATIC CONFIRMED` | `write_planner_plan_graph_rpc` tiene `EXECUTE` para `PUBLIC`/`anon` (`RC-035`, P2), mitigado por un guard en el cuerpo |
| SEC-4 | **Actor supplied por el cliente** | **GOALS ONLY** | `trash_goal_rpc(p_member_id)` acepta el `member_id` del llamante sin validarlo | **NO por el backend** (trash es UPDATE directo) | `RUNTIME RO VERIFIED` (ACL) | **P0 carry-over (`RC-033`)**: `SECURITY DEFINER` + `anon EXECUTE` + sin capability. **No explotado** |
| SEC-5 | **Anti-spoofing de `p_member_id`** | **BOTH** (más fuerte en goals) | `restore_goal_rpc` **rechaza** `p_member_id ≠ actor` | goals: **SÍ** · plans: no acepta el param | `STATIC CONFIRMED (carry-over)` | Ninguno |
| SEC-6 | **`version` + conflicto optimista** | **BOTH** | `version` + trigger de incremento + `If-Match`/`expected_version` ⇒ 409/412 | **SÍ** en ambos | **SÍ** (`pg_constraint`) | goals: el trigger `increment_planner_version` es **global**, sin `p_expected_version` en SQL ⇒ el compare-guard vive en el service |
| SEC-7 | **Idempotency (V0)** | **GOALS ONLY (vivo)** | `withIdempotency` + `reserve/complete_planner_idempotency_key` | **SÍ** — `planner_idempotency_keys` = **11 filas** | **SÍ** | `in_flight` ⇒ 409; la persistencia de respuestas 4xx puede fallar silenciosamente (`console.error` + continue) |
| SEC-8 | **Idempotency / operations (V2)** | **PLANS ONLY (0 filas)** | `planner_plan_operations` (18 col) + `write_planner_plan_graph_rpc(p_mutation_id, p_idempotency_key, p_request_hash, …)` | **NUNCA** | **SÍ** (`0 filas`) | **EMPTY DB FOUNDATION**: la pieza más completa y la menos ejercitada |
| SEC-9 | **Tabla de operaciones con before/after state** | **PLANS ONLY** | `before_state` / `result_state` / `outcome` / `response_body` jsonb | **NUNCA** | **SÍ** | Sin consumidor UI |
| SEC-10 | **Historial append-only con corrección** | **PLANS ONLY** | `planner_plan_measurement_history` con `previous_value`, `correction_of_id`, `operation_id` UNIQUE | **NUNCA** | **SÍ** (`0 filas`) | **Append-only sólo por GRANT**, no por constraint (`service_role` tiene `INSERT/UPDATE/DELETE`) — `RC-040` |
| SEC-11 | **`trash` actor shape CHECK** | **PLANS ONLY** | `planner_plans_trash_actor_shape` (+ 3 más) | **NUNCA** | **SÍ** | goals **no tiene** ningún CHECK de trash ⇒ `trashed_at` sin actor es representable |
| SEC-12 | **`owner_shape` CHECK** | **PLANS ONLY** | scope XOR ownership + `created_by_member_id` condicional | **NUNCA** | **SÍ** | goals no tiene equivalente: `household_id NOT NULL` sea cual sea la visibilidad |
| SEC-13 | **Guard de `trashed_at` en el restore** | **BOTH (parcial)** | plans: `write_planner_plan_graph_rpc:986` rechaza transiciones ≠ `restore` en Plan trasteado | plans: Backend | `STATIC CONFIRMED` | **El restore de requirements/milestones NO filtra `trashed_at IS NULL`** ⇒ resucita decisiones del usuario (`RC-021`, carry-over) |
| SEC-14 | **`FORCE ROW LEVEL SECURITY`** | **NEITHER** | `relforcerowsecurity = false` en todas las tablas del dominio | — | **SÍ** | P3 |
| SEC-15 | **Privacy simétrica** | **NEITHER** | Attention aplica `buildPlannerAccessContext` en 5 de 6 loaders; Activity **no** | — | carry-over | `RC-039` (P1) |
| SEC-16 | **`household_id NOT NULL` en activity log** | **NEITHER** | `planner_activity_log.household_id NOT NULL` | **SÍ** (1 fila) | **SÍ** | Un Plan/Event **personal no deja rastro** (`RC-038`) |
| SEC-17 | **RLS de lectura que no excluye `trashed_at`** | **GOALS ONLY** | `planner_goals_select_visible` filtra `deleted_at`, no `trashed_at` | **SÍ** | **SÍ** | Metas trasteadas visibles por SELECT directo (`RC-022`) |
| SEC-18 | **RPC que bypassea RLS devolviendo `title` de otras tablas** | **PLANS ONLY** | `planner_plan_external_link_dto` es `SECURITY DEFINER`, `EXECUTE` sólo `service_role`, lee `planner_tasks`/`planner_events` y devuelve títulos | **NUNCA** | `RUNTIME RO VERIFIED` (arm) | `S1` (P1 armado) — **no explotado**, y **0 filas** que lo ejerciten |
| SEC-19 | **Views con `arwdDxtm` para `anon`** | **PLANS ONLY** | `planner_plan_indicators`, `planner_legacy_goal_plan_projection` | — | **SÍ** (`relacl`) | `RC-034` (P1): la projection es auto-updatable ⇒ escritura en `planner_goal_milestones` saltando triggers y policies. `information_schema` dice `is_updatable=NO` ⇒ **señales en conflicto, `INCONCLUSIVE`** |
| SEC-20 | **Capability denegada a todos los roles** | **BOTH** | `goal.archive = false` en 6 roles (JS y SQL) | cableada, **no ejecutable** | **SÍ** (matrices) + `RUNTIME RO VERIFIED` (0 overrides) | Archive inalcanzable en ambos |
| SEC-21 | **Capability sin consumidor** | **BOTH** | `goal.manage_participants` (catálogo + matriz, 0 asserts, 0 SQL, 0 UI) | **NO** | carry-over | `DEAD` |
| SEC-22 | **Capability declarada en JS y ausente en SQL** | **BOTH** | `goal.create_personal`, `goal.manage_participants` | `create_personal` la exige el backend; SQL nunca la pide | carry-over | `DIVERGENCE` latente: sin efecto bloqueante hoy |
| SEC-23 | **`task.archive` denegada a los 6 roles** | **NEITHER** (Tasks) | `false`×6; existen RPCs `archive/unarchive_planner_task_v1` | cableada, no ejecutable | carry-over | Fuera del dominio Plan, pero afecta la relación Task↔Plan |
| SEC-24 | **Override de `households.config.permissions`** | **BOTH** | `{permissions:{cap:{role:bool}}}`; JS y SQL con la misma precedencia | **SÍ**, pero **0 overrides `goal.*`/`planner.*`/`task.*`/`event.*`** (10 de 97 households con `permissions`, 6 keys, todas household-membership) | **SÍ** | Claves desconocidas se **ignoran** ⇒ un renombre de capability se degrada en silencio |
---

## 16. LOCAL DATA DEPENDENCY (B15)

**LOCAL SÓLO. No se infiere producción.**

### 16.1 Conteos completos (26 tablas `planner_*`)

| Tabla | Filas | Clasificacion |
|---|---|---|
| `planner_goals` | **1** | `LEGACY ACTIVE` (unica fila viva) |
| `planner_tasks` | **3** | `LIVE` |
| `planner_task_fulfillments` | 3 | `LIVE` |
| `planner_task_assignment_configs` | 3 | `LIVE` |
| `planner_activity_log` | **1** | `LIVE` (1 fila, `entity_type='goal'`) |
| `planner_idempotency_keys` | **11** | `LIVE` (evidencia de escrituras idempotentes previas) |
| `planner_plans` | **0** | `EMPTY DB FOUNDATION` |
| `planner_plan_milestones` | **0** | `EMPTY DB FOUNDATION` |
| `planner_plan_measurements` | **0** | `EMPTY DB FOUNDATION` |
| `planner_plan_measurement_history` | **0** | `EMPTY DB FOUNDATION` |
| `planner_plan_requirements` | **0** | `EMPTY DB FOUNDATION` |
| `planner_plan_manual_conditions` | **0** | `EMPTY DB FOUNDATION` |
| `planner_plan_operations` | **0** | `EMPTY DB FOUNDATION` |
| `planner_plan_legacy_goal_links` | **0** | `EMPTY DB FOUNDATION` |
| `planner_goal_milestones` | **0** | `EMPTY DB FOUNDATION` |
| `planner_events` | **0** | `EMPTY` |
| `planner_event_series` | **0** | `EMPTY` |
| `planner_event_participants` | **0** | `EMPTY` |
| `planner_responsibilities` | **0** | `EMPTY` |
| `planner_responsibility_members` | **0** | `EMPTY` |
| `planner_responsibility_occurrences` | **0** | `EMPTY` |
| `planner_presets` | **0** | `EMPTY` |
| `planner_preset_revisions` | **0** | `EMPTY` |
| `planner_drafts` | **0** | `EMPTY` |
| `planner_task_assignees` | **0** | `EMPTY` |
| `planner_task_evidence_attempts` | **0** | `EMPTY` |
| `supabase_migrations.schema_migrations` | **112** | — |

### 16.2 Columnas legacy con datos no-null

| Columna | Valor | Cobertura |
|---|---|---|
| `title` | `'hdjs'` | 1/1 |
| `household_id` | `df17a2bc-fdf9-49cd-b0d3-411f2e394b72` | 1/1 |
| `visibility` | `'household'` | 1/1 |
| `category` | `'home'` | 1/1 |
| `progress_mode` | `'steps'` | 1/1 |
| `current_value` | `0` | 1/1 |
| `status` | `'active'` | 1/1 |
| `lifecycle` | `'preparation'` | 1/1 |
| `created_by_member_id` | `4e1ded1b-b7d5-49af-8a98-37f2d629dfaf` | 1/1 (**NO es NULL**) |
| `version` | `1` | 1/1 |
| `target_type`, `target_value`, `unit`, `starts_at`, `ends_at`, **`target_date`**, `completed_at`, `closed_at`, `closed_reason`, `failed_at`, `deleted_at`, `trashed_at`, `archived_at`, `trashed_by_member_id` | NULL | 0/1 |

### 16.3 Relaciones con filas

| Relacion | Filas | Nota |
|---|---|---|
| `planner_tasks.goal_id` no nulo | **0 de 3** | **La relacion Task-Goal no tiene datos** |
| `planner_tasks.responsibility_id` no nulo | 0 | |
| `planner_tasks.origin_entity_id` no nulo | 0 | |
| `planner_plan_requirements` (cualquier `subject_type`) | **0** | |
| `planner_plan_legacy_goal_links` | **0** | **No existe puente goals-plans** |
| `planner_activity_log.entity_type='goal'` | 1 | |
| `planner_idempotency_keys` | 11 | de que operaciones: `UNKNOWN` (no inspeccionado) |

### 16.4 Estructuras vacias

**Las 8 tablas `planner_plan_*`, `planner_goal_milestones`, `planner_events` y sus 3 tablas satelite estan vacias.** Con 0 filas:
- ningun CHECK de `planner_plans` ha sido ejercitado por datos
- ningun trigger `planner_plans_touch_version` ha corrido
- ningun RPC `write_planner_plan_graph_rpc` ha escrito nada
- `planner_plan_indicators` devuelve 0 filas
- `planner_legacy_goal_plan_projection` devuelve 1 fila con `compatibility_state='requires_review'` (derivado, sin writer)

### 16.5 Lo que esta seccion NO autoriza

> `RUNTIME RO VERIFIED` para local. **No se ejecuto ninguna consulta contra el proyecto Supabase remoto** y **esta seccion no dice nada sobre produccion**. Cualquier decision que dependa del volumen de datos reales requiere un `count(*)` remoto, que es una **decision humana** (OD-7 del Reconstruction Plan).
---

## 17. SALVAGE CANDIDATE MATRIX (B16)

> **AVISO.** Esta matriz **NO decide**. Todas las categorias llevan el sufijo **`CANDIDATE`**. `RUNTIME USED?` es `NO` en **todas** las filas, por la razon declarada en §0.

### 17.1 Plan root

| AREA | PIECE | CURRENT SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | KNOWN DEFECTS | SALVAGE CANDIDATE | WHY FACTUALLY | HUMAN DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Plan root | Tabla `planner_goals` (28 col) | GOALS | Raiz de Plan del flujo real | **NO** | Cubre §02 salvo `scope`/`target_date`; **contradice §02/§10** (`category`, `progress_mode`, `target_type`) | 3 FKs, 3 triggers, 27 `.from()`, FK desde `planner_tasks` | `household_id NOT NULL` impide scope personal real; doble autoridad `lifecycle`+`status`; `deleted_at`+`trashed_at`; `failed_at` vacuo | **NEEDS HUMAN DECISION** | Es la unica raiz con escritura alcanzable y tambien la que tiene 6 columnas prohibidas por PT | **SI** — OD-1 |
| Plan root | Tabla `planner_plans` (25 col) | PLANS | Raiz de Plan canonica | **NO** | Cubre §02 (`scope`, `target_date`, `objective`) y §13/§14/§15 con columnas dedicadas | 6 FKs, 8 CHECKs, 1 trigger, 4 RPC, 6 tablas hijas | 0 filas; ningun writer alcanzable; `archived_at` atado al terminal (§14); `finalization_kind`/`restore_review_required` sin consumidor | **NEEDS HUMAN DECISION** | Es la unica raiz con `scope`+`owner_person_id`, y tambien la que ninguna operacion de usuario ha tocado | **SI** — OD-1 |
| Plan root | Vista `planner_legacy_goal_plan_projection` | BOTH | Proyecta goals + link de mapeo | **NO** | INDIRECT | `planner_plan_legacy_goal_links` (0 filas) | **`RC-034` P1**: `arwdDxtm` para `anon`, auto-updatable ⇒ escritura en `planner_goal_milestones` saltando triggers/policies | **RETIRE CANDIDATE** | Con el bridge en 0 filas, su unica funcion (registrar mapeo) no se esta usando | **NO** |

### 17.2 Identity

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY FACTUALLY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Identity | `owner_person_id` + `scope` + `owner_shape` CHECK | PLANS | Expresa Personal/Hogar con XOR verificado en DB | **NO** | **YES** (§02, §16) | `planner_plan_can_read/can_mutate` | 0 filas ⇒ CHECK no ejercitado | **KEEP FROM PLANS CANDIDATE** | Es la unica forma existente de expresar "Alcance: Personal/Hogar" con owner verificable | **NO** |
| Identity | `visibility` (`household\|personal`) | GOALS | Sustituto de scope | **NO** | PARCIAL (§02 dice "Alcance") | `planner_goals_select_visible` | `personal` **no** desancla el `household_id` ⇒ una meta personal sigue atada a un hogar | **MOVE/ADAPT CANDIDATE** | Semantica equivalente pero sin owner; el nombre no es el de §02 | **NO** |
| Identity | `created_by_member_id` (member-based) | BOTH | Identidad de autorizacion | **NO** | INDIRECT | `household_members` | `SET NULL` al borrar el miembro ⇒ **el autor puede perderse** | **MOVE/ADAPT CANDIDATE** | Ambos lo tienen; en plans convive con `created_by_person_id NOT NULL` | **NO** |
| Identity | `created_by_person_id NOT NULL` | PLANS | Autor persona, no puede perderse | **NO** | INDIRECT | `people(id)` `ON DELETE RESTRICT` | 0 filas | **KEEP FROM PLANS CANDIDATE** | Es la unica forma de preservar la autoria de Plan a nivel persona | **NO** |
| Identity | `household_id NOT NULL` | GOALS | Ancla de hogar | **NO** | INDIRECT | FK `households` `CASCADE` | Impide scope personal | **MOVE/ADAPT CANDIDATE** | Necesario en household, falso en personal | **NO** |

### 17.3 Scope

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Scope | `planner_plan_can_read(id,false)` con creator-privacy en `draft` | PLANS | household ⇒ miembro + `planner.view` + (`lifecycle<>'draft'` OR creador) | **NO** | **YES** (§16) | `planner_plan_actor_has_capability` | `read_planner_plan_graph_rpc` paso a DEFINER ⇒ la barrera es una comprobacion manual, no RLS (`RC-036`) | **KEEP FROM PLANS CANDIDATE** | Los drafts de household privados al creador es exactamente lo que §16 exige | **NO** |
| Scope | `planner_goals_select_visible` | GOALS | `visibility='household'` **o** soy creador | **NO** | PARCIAL | `is_active_household_member` | **No filtra `trashed_at`** ⇒ metas trasteadas visibles | **RETIRE CANDIDATE** | La visibilidad por creador es correcta; el filtro de `trashed_at` es un defecto | **NO** |

### 17.4 Lifecycle

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Lifecycle | CHECK `preparation\|active\|paused\|completed\|cancelled` | GOALS | Vocabulario **identico al nombre del Target** | **NO** | **YES** (§13, salvo el nombre `preparation`) | trigger proyector | `preparation` **si** es superficie de navegacion (`PlannerPlanListScreen:106,155`), contra §13 | **KEEP FROM GOALS CANDIDATE** | El Target llama `Cancelled` a algo que goals llama `cancelled` y plans llama `closed` | **SI** — OD-2 |
| Lifecycle | CHECK `draft\|active\|paused\|completed\|closed` | PLANS | Vocabulario con `draft` | **NO** | PARCIAL (el terminal se llama `closed`) | RPC writer | El terminal **no** se llama `Cancelled` | **MOVE/ADAPT CANDIDATE** | `draft` es mejor nombre interno que `preparation`; el terminal diverge del Target | **SI** — OD-2 |
| Lifecycle | `activated_at` / `paused_at` | PLANS | Timestamps de lifecycle | **NO** | NO | RPC writer | Ninguno | **KEEP FROM PLANS CANDIDATE** | Goals no puede decir cuando se activo o pausa un Plan | **NO** |
| Lifecycle | Columna `status` + trigger proyector | GOALS | Segunda autoridad de estado | **NO** | **NO** | `planner_goals_sync_status` + `planner_goal_project_status` | Colapsa `preparation` y `paused` a `'active'`; el trigger **solo** re-proyecta si cambia `lifecycle` | **RETIRE CANDIDATE** | Es duplicacion de `lifecycle` con perdida de informacion | **NO** |
| Lifecycle | `trash` sintetico en el DTO | PLANS | Trash como proyeccion, no estado | **NO** | **YES** (§15 ortogonal) | `toPlanDto:160` | Mezcla el concepto con el lifecycle en el union TS | **KEEP FROM PLANS CANDIDATE** | Coherente con §15 (Trash es eliminacion reversible, no un estado funcional) | **NO** |
| Lifecycle | `PLAN_LIFECYCLE_TRANSITIONS` (goals) | GOALS | Maquina de transiciones | **NO** | PARCIAL | `validateLifecycleTransition` | **`resume` ⇒ 409**; `preparation` no puede ir a `paused`; `completed` no va a `active` sin `reopen` | **MOVE/ADAPT CANDIDATE** | La tabla es explicita y auditable; el defecto es una entrada ausente, no el diseno | **NO** |
| Lifecycle | Tabla de transiciones del RPC (plans) | PLANS | Maquina de transiciones en SQL | **NO** | PARCIAL | `write_planner_plan_graph_rpc:979-1051` | `reopen` **borra `archived_at`** (viola §14); no limpia `completed_at`/`closed_at` | **MOVE/ADAPT CANDIDATE** | Los gates de estructura/satisfaccion son reales; el side-effect de reopen es un defecto | **NO** |
| Lifecycle | `case 'resume'` inalcanzable | GOALS | Handler muerto | **NO** | — | — | 409 determinista | **RETIRE CANDIDATE** | Codigo que nunca puede ejecutarse | **NO** |

### 17.5 Task relation

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Task relation | `planner_tasks.goal_id` (FK, `SET NULL`) | GOALS | Task → 0..1 Goal con integridad referencial real | **NO** (0 filas) | **YES** (§04) | RPC `mutate_planner_task_v0`; `PATCH /tasks/:id`; `GET /tasks?goal_id=` | FK **no compuesta** con `household_id` ⇒ co-propiedad solo en el RPC (`RC-042`); `planner_tasks` sin `scope` ⇒ imposible en Plan personal | **KEEP FROM GOALS CANDIDATE** | Es la **unica** relacion Task-Plan con FK y unicidad en DB de todo el sistema | **NO** |
| Task relation | UI link/unlink (`PlannerPlanDetailScreenV1:198-238`) | GOALS | Vincular/desvincular sin borrar | **NO** | **YES** (§04 "desvincular nunca elimina") | `PATCH /tasks/:id` | Vive en una pantalla que solo se alcanza por la ruta literal `'PlanDetail'` | **KEEP FROM GOALS CANDIDATE** | Es la **unica** implementacion de link/unlink Task de todo el sistema | **NO** |
| Task relation | `planner_plan_requirements` rama `external` | PLANS | Task → N..1 Plan sin FK | **NO** (0 filas) | PARCIAL (§04) | RPC writers ×2 | Sin FK; multi-homing; `unlink` = `trash`; satisfaction `false` siempre; sin writer UI | **RETIRE CANDIDATE** | Duplica la autoridad de `goal_id` sin aportar integridad | **NO** |
| Task relation | `planner_tasks.origin_*` (3 col, sin FK) | NEITHER | Tracking de origen | **NO** (0 filas) | NO | — | Sin FK; un solo lector (`inventory.service.js:482-484`) | **NEEDS HUMAN DECISION** | No pertenece a ninguno de los dos sistemas de Plan | **NO** |
### 17.6 Event relation

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Event relation | `requirements` rama `external`/`event` | PLANS | Event → N..1 Plan sin FK | **NO** (0 filas) | **NO** (§09 no implementado) | validador de scope | `satisfied=false` **siempre**; sin writer UI; deep-link 404 para Events personales | **REBUILD CANDIDATE** | La unica pieza existente, y su semantica contradice §09 de forma constructiva | **NO** |
| Event relation | `planner_plan_validate_external_link` rama `event` | PLANS | Valida `(scope, household_id)` y `(scope, owner_person_id)` | **NO** | **YES** (§16) | `planner_events` | No excluye `lifecycle='trash'`; NULL-safety divergente (`=` vs `is not distinct from`) | **KEEP FROM PLANS CANDIDATE** | Es la unica validacion de scope Event-Plan existente y es correcta en el caso que PT exige | **NO** |
| Event relation | Direccion de dependencia (Event nunca referencia Plan) | NEITHER | El FK vive del lado Plan | **N/A** | **YES** (§05) | `planner_events` sin columnas plan/goal | Ninguno | **KEEP FROM PLANS CANDIDATE** | Preservar esta direccionalidad es una restriccion estructural ya cumplida | **NO** |

### 17.7 Measurement / Measurement history

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Measurement | `planner_plan_measurements` (15 col: 7/7 de §06 + `classification` + `sort_order` + `version` + trash) | PLANS | Medicion con nombre, current, target, unidad, operador | **NO** (0 filas, 0 UI) | **YES** (§06 completo) | FK `plan_id` RESTRICT; 5 CHECKs | **Sin CHECK de rango**; sin superficie UI | **KEEP FROM PLANS CANDIDATE** | Es la unica implementacion conforme a §06 | **NO** |
| Measurement history | `planner_plan_measurement_history` (10 col) | PLANS | Historial con `previous_value` y correccion | **NO** (0 filas) | **YES** (§12) | FK compuesta `(measurement_id, plan_id)`; `operation_id` UNIQUE | **Append-only solo por GRANT**; sin `trashed_at` ⇒ legible tras trash | **KEEP FROM PLANS CANDIDATE** | `previous_value` + `correction_of_id` resuelven un problema que ya esta resuelto | **NO** |
| Measurement | `target_operator` (`gte\|lte\|eq`) | PLANS | Condicion de cumplimiento | **NO** | **YES** (§06) | CHECK | Ninguno | **KEEP FROM PLANS CANDIDATE** | §06 lo pide explicitamente; goals **no** lo tiene | **NO** |
| Measurement | `current_value/target_value/unit` en `planner_goals` | GOALS | Progreso numerico de la meta | **NO** | **NO** (§02 retira `progress_mode`/`target_type`) | `attachProgress` | Sin `name`, sin `operator`, sin historia, `unit` opcional, rango `>= 0` ⇒ **no es Measurement** | **RETIRE CANDIDATE** | No cumple §06: no tiene nombre ni operador, y devuelve un % | **NO** |
| Measurement | `targetReached` en JS **y** SQL | PLANS | Booleano de cumplimiento | **NO** | **YES** (§12) | `planner_plan_indicators`; `planner.plans.service.js:133-138` | **Dos implementaciones del mismo calculo**, sin test de paridad | **MOVE/ADAPT CANDIDATE** | El calculo es correcto; la duplicacion SQL/JS es deuda | **NO** |

### 17.8 Required / Optional

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Required/Optional | `classification IN ('necessary','supporting')` | PLANS | Required/Optional por fila de componente | **NO** (0 filas) | **YES** (§07) | 4 gates la leen | 4 copias, una con trigger de grafo | **KEEP FROM PLANS CANDIDATE** | Semantica ya 1:1 con §07; los gates ya respetan que `supporting` no bloquea | **NO** |
| Required/Optional | Constraint trigger de grafo | PLANS | "Coacciona" la clasificacion del subject con la del requirement | **NO** | **NO** (§19/§20) | `planner_plan_requirements` | **Invariante NO fiable**: solo valida subjects internos; `external` se autorreferencia; el camino `changeset` puede divergir | **RETIRE CANDIDATE** | Un invariante que a veces se cumple no es un invariante | **NO** |
| Required/Optional | `planner_plan_requirements` (18 col, grafo) | PLANS | Grafo de requirements con jerarquia | **NO** (0 filas) | **NO** (§19/§20: Requirement Graph y jerarquicos fuera de alcance) | 4 indices unicos, trigger, recursion | Arrastra `subject_type`, `subject_shape`, `parent_requirement_id` | **RETIRE CANDIDATE** | Representa un concepto que PT retiro explicitamente | **NO** |
| Required/Optional | `planner_plan_milestones` + `planMilestoneEditor` | PLANS | Hitos con `completion_mode` y recompute | **NO** (0 filas) | **NO** (§19: Milestone deja de ser entidad) | `recompute_automatic_milestones` | **Cascada silenciosa** que completa/reabre milestones y destruye `completed_by_*`; tope de 64 iteraciones sin error | **RETIRE CANDIDATE** | Concepto retirado por PT, con un defecto de comportamiento P0 | **NO** |
| Required/Optional | `planner_plan_manual_conditions` | PLANS | Condiciones manuales | **NO** (0 filas) | **NO** (§20) | gates | — | **RETIRE CANDIDATE** | Fuera de alcance explicito | **NO** |

### 17.9 Progress

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Progress | `planner_plan_indicators` (7 contadores, sin %) | PLANS | Contadores honestos | **NO** (0 Planes) | **PARCIAL**: el *contrato* de honestidad es correcto; el *contenido* cuenta Milestones+Requirements | vista | Cuenta **cero Tasks, cero Events** | **MOVE/ADAPT CANDIDATE** | El comentario `'There is intentionally no percentage column.'` es la forma correcta; el contenido es del dominio retirado | **NO** |
| Progress | `attachProgress` + `progress_mode` + `progress_percentage` | GOALS | % universal | **NO** | **NO** (§10 lo prohibe) | `planner_tasks`, `planner_goal_milestones` | Mezcla naturalezas; 5 modos sin traduccion | **RETIRE CANDIDATE** | Prohibido por PT; alimentado por un campo que ninguna columna produce | **NO** |
| Progress | `calculateProgressFromTasks` | GOALS | `status IN (completed,verified)` / total | **NO** | **PARCIAL** (§10 quiere "3 de 5 tareas completas") | `planner_tasks.goal_id` | Se devuelve como **%**, no como N/total; solo si `progress_mode='tasks'` | **MOVE/ADAPT CANDIDATE** | Es el calculo correcto (usa `goal_id`) presentado como porcentaje | **NO** |
| Progress | Lectura de 6 columnas inexistentes | GOALS | DTO `progress` | **NO** | **NO** | — | `progress` siempre `null` | **RETIRE CANDIDATE** | Lee 6 columnas: **0 de 6 existen** | **NO** |
| Progress | Barras de % en 4 superficies FE | BOTH | Render | **NO** | **NO** | campo inexistente | Siempre vacias en runtime | **RETIRE CANDIDATE** | `planner_p1_structure_contract_tests.ts:278` y `planner_v1_frontend_plans_tests.ts:279,443-451` **ya prohiben** `percentage` | **NO** |

### 17.10 Readiness / Completion

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Readiness | Gate de activacion (`:1000-1010`) | PLANS | Exige ≥1 componente util y cero external necessary sin bind | **NO** | **NO** (§01 y §18: Plan vacio valido) | `planner_plan_*` | **Cuenta cero Tasks y cero Events** ⇒ un Plan con solo Tasks **no puede activarse** | **MOVE/ADAPT CANDIDATE** | El gate es la autoridad correcta; su **umbral** contradice §01/§08 | **SI** — OD-5 |
| Readiness | Gate de completado con `confirm_unresolved` | PLANS | Bloquea el cierre si hay requirement `necessary` raiz insatisfecho | **NO** | **PARCIAL** (§11 pide poder entender que queda) | `planner_plan_requirement_satisfied` | No lista **que** componente queda; mira requirements, no componentes | **MOVE/ADAPT CANDIDATE** | La *confirmacion explicita* ya existe; lo que falta es la lista | **NO** |
| Readiness | `planner_plan_requirement_satisfied[_internal]` | PLANS | Recursion con deteccion de ciclo | **NO** | **NO** (§20 retira el grafo) | requirements | `external ⇒ false` **siempre** | **RETIRE CANDIDATE** | La recursion existe solo para el grafo retirado | **NO** |
| Completion | `completeGoal` sin verificaciones | GOALS | Cierra a ciegas, devuelve `progress_percentage:100` | **NO** | **NO** (§11) | — | Cero verificacion de hijos | **RETIRE CANDIDATE** | Contradice §11 | **NO** |
| Completion | Ausencia de cascada a hijos | **BOTH** | Completar/pausar/cerrar no toca hijos | **NO** | **YES** (§11, §13) | — | Ninguno | **KEEP FROM PLANS CANDIDATE** | Es la unica pieza que cumple §11 y §13 hoy, en ambos sistemas | **NO** |
| Completion | "Measurement reached != Plan completed" | **BOTH** | Ningun sistema auto-completa el Plan | **NO** | **YES** (§12) | — | Ninguno | **KEEP FROM PLANS CANDIDATE** | Cumplido por omision, y es correcto | **NO** |

### 17.11 Archive

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Archive | Columna `archived_at` separada del lifecycle | **BOTH** | Senal ortogonal por columna | **NO** | **YES** (§14) | — | — | **KEEP FROM PLANS CANDIDATE** | La separacion columna/estado es la forma correcta de §14 | **NO** |
| Archive | CHECK `planner_plans_archive_terminal_only` | PLANS | Ata archive a terminales | **NO** | **NO** (§14 declara la ortogonalidad; `Active + Archived` tambien deberia valer) | — | Contradice la ortogonalidad | **RETIRE CANDIDATE** | Restriccion que el Product Truth no pide | **SI** — OD-3 |
| Archive | `reopen` que borra `archived_at` | PLANS | Desarchiva implicitamente | **NO** | **NO** (§14) | — | Mezcla de lifecycle y archive | **RETIRE CANDIDATE** | Archive debe ser ortogonal tambien en esa direccion | **SI** — OD-3 |
| Archive | `goal.archive = false` en 6 roles | **BOTH** | Cerrojo de autorizacion | cableada, **no ejecutable** | **NO** (deja §14 inalcanzable) | `households.config` | Archive y Unarchive **inalcanzables** | **NEEDS HUMAN DECISION** | Es la unica razon por la que Archive no existe para el usuario, en los dos sistemas | **SI** — OD-3 |
### 17.12 Trash / Restore

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Trash | `trashed_at` + actor shape (4 campos, CHECK) | PLANS | Trash reversible con actor verificado en DB | **NO** | **YES** (§15) | `planner_plans_trash_actor_shape` | 0 filas | **KEEP FROM PLANS CANDIDATE** | El CHECK impide `trashed_at` sin actor; goals no tiene equivalente | **NO** |
| Trash | `trashed_at` + `trashed_by_member_id` sin CHECK | GOALS | Trash por UPDATE directo | **NO** | PARCIAL | RLS UPDATE | Sin shape verificado; `deleted_at` coexiste como 2ª marca | **MOVE/ADAPT CANDIDATE** | La operacion existe y es alcanzable; le falta la garantia de shape | **NO** |
| Trash | Ausencia de cascada a hijos | **BOTH** | Trasear un Plan no trash a sus hijos | **NO** | **YES** (§15) | — | Ninguno | **KEEP FROM PLANS CANDIDATE** | Es la unica interpretacion de §15 que no pierde datos hijos | **NO** |
| Trash | `planner_plans` ausente de `planner.trash.service.js` | PLANS | El Trash transversal no lista Planes canonicos | **NO** | **NO** (§15: Trash es transversal) | — | **Un Plan canonico trasteado es irrecuperable desde la UI** | **MOVE/ADAPT CANDIDATE** | Es una pieza de integracion ausente, no una pieza de datos | **NO** |
| Restore | `restore_goal_rpc` endurecido | GOALS | Restore con capability + anti-spoofing + actor derivado | **NO** | **YES** (§15) | `planner_current_actor_has_capability('goal.restore')` | Ninguno | **KEEP FROM GOALS CANDIDATE** | Es el RPC de Restore mas endurecido de los dos sistemas | **NO** |
| Restore | `restore` como transicion del writer canonico | PLANS | Limpia los 4 campos | **NO** | PARCIAL | `can_mutate('restore')` | **No restaura hijos**; el restore de requirements **no filtra `trashed_at`** ⇒ resucita decisiones del usuario (`RC-021`) | **MOVE/ADAPT CANDIDATE** | La operacion existe; el defecto de requirements es concreto y acotado | **NO** |
| Restore | Perdida de lifecycle previo en goals | GOALS | El bridge colapsa estados al restaurar | **NO** | **NO** (§15: Restore no debe inventar lifecycle) | `planner_goal_project_status` | Un Plan pausado restaurado es indistinguible de uno activo | **RETIRE CANDIDATE** | Es consecuencia de la doble autoridad `status` | **NO** |

### 17.13 RLS

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| RLS | 1 policy SELECT + `can_read`, `draft` creator-private | PLANS | Deny-by-default en escritura | **NO** | **YES** (§16) | `planner_plan_actor_has_capability` | `read_planner_plan_graph_rpc` DEFINER ⇒ barrera manual (`RC-036`) | **KEEP FROM PLANS CANDIDATE** | Es el diseno correcto y el mas estricto de los dos | **NO** |
| RLS | 3 policies sin capability + `anon=arwdDxtm` | GOALS | Deny por membresia/visibilidad/creador | **NO** | PARCIAL | `is_active_household_member` | Sin verificacion de capability; `anon` puede escribir; SELECT no excluye `trashed_at` | **RETIRE CANDIDATE** | La politica no expresa la autorizacion que el backend si exige | **NO** |
| RLS | `relforcerowsecurity = false` en todas las tablas | **BOTH** | — | — | — | — | Depende de que el rol no sea table owner | **NEEDS HUMAN DECISION** | Es deuda horizontal, ajena a la eleccion de raiz | **NO** |

### 17.14 Capabilities

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Capabilities | Catalogo de 11 keys `goal.*` + 6 roles + override | **BOTH** (JS) | Autorizacion fina con override por household | **SI** como codigo; ejecucion no verificada | INDIRECT | `households.config.permissions` | Namespace `goal.*` para un Plan; 2 keys ausentes en SQL | **MOVE/ADAPT CANDIDATE** | Es la pieza de autorizacion viva de ambos; el nombre es lo discutible | **NO** |
| Capabilities | `planner_plan_actor_has_capability` (9 keys) | PLANS | Mismo catalogo en SQL | **SI** como codigo | INDIRECT | `households.config` | 2 keys ausentes ⇒ `else false` | **MOVE/ADAPT CANDIDATE** | Paridad JS/SQL pendiente | **NO** |
| Capabilities | `goal.archive = false` ×6 | **BOTH** | Cerrojo | no ejecutable | **NO** | overrides | Deja §14 inalcanzable | **NEEDS HUMAN DECISION** | OD-3 | **SI** |
| Capabilities | `goal.manage_participants` sin consumidor | **BOTH** | — | **NO** | **NO** (§17: sin Plan Participants) | — | `DEAD` | **RETIRE CANDIDATE** | PT §17 dice que no existe sistema de Plan Participants | **NO** |
| Capabilities | `task.*` para la relacion Task-Goal | NEITHER | Autoriza el link/unlink | **NO** | INDIRECT | `planner_tasks` RLS | El vinculo de Plan se autoriza como *ordinary edit* de Task, no con capability de Plan | **NEEDS HUMAN DECISION** | Es correcto y esta cableado en el unico link Task-Plan vivo | **NO** |
| Capabilities | `event.*` | NEITHER | Autoriza Events | **NO** | INDIRECT | `planner_events` RLS | Sin superficie Event-Plan | **NEEDS HUMAN DECISION** | No hay nada que autorizar todavia | **NO** |

### 17.15 RPC authorization / Versioning / Idempotency / Operations-audit

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| RPC authorization | `planner_plan_can_mutate(plan_id, action)` | PLANS | Mapea accion → capability `goal.*`, con draft-creator y owner personal | **NO** | INDIRECT | `planner_plan_actor_has_capability` | **No comprueba `trashed_at`** (P2) | **KEEP FROM PLANS CANDIDATE** | Es la unica pieza que traduce una accion de Plan a una autorizacion, con owner real | **NO** |
| RPC authorization | `planner_plan_authorization_context_rpc` | PLANS | Devuelve el contexto de autorizacion al backend | **NO** | INDIRECT | — | `planner_plan_v1_authorization_context_rpc` gemela **nunca invocada** | **KEEP FROM PLANS CANDIDATE** | Es la pieza que permite al backend no duplicar reglas | **NO** |
| RPC authorization | create personal sin check de capability | PLANS | Crea Plan personal | **NO** | **YES** (§02) | — | Sin capability en ninguna capa para create personal | **MOVE/ADAPT CANDIDATE** | `goal.create_personal` existe en JS y es `true` ×5, pero SQL nunca la pide | **NO** |
| Versioning | `version` + trigger + `p_expected_version` + `expected_plan_version` | PLANS | Concurrencia optimista a dos niveles | **NO** | INDIRECT | RPC | 0 filas ⇒ nunca ejercitado | **KEEP FROM PLANS CANDIDATE** | Es mas fino que goals (que solo tiene `version` de la raiz) | **NO** |
| Versioning | `version` + `If-Match`/`expected_version` + trigger | GOALS | Concurrencia optimista | **NO** | INDIRECT | `parseRequiredExpectedVersion` | El trigger de incremento es global; la comparacion vive en el service | **KEEP FROM GOALS CANDIDATE** | Funciona y esta cableado en 11 endpoints | **NO** |
| Idempotency | `withIdempotency` + `planner_idempotency_keys` (11 filas) | GOALS | Replay, in-flight, persistencia de respuestas | **SI** como mecanismo (11 filas lo prueban) | INDIRECT | `reserve/complete_planner_idempotency_key` | `in_flight` ⇒ 409; persistencia 4xx puede fallar en silencio | **KEEP FROM GOALS CANDIDATE** | Es la unica pieza de idempotencia con evidencia de ejecucion | **NO** |
| Idempotency | `planner_plan_operations` + `p_request_hash` V2 | PLANS | Idempotencia atomica con before/after state | **NO** (0 filas) | INDIRECT | `write_planner_plan_graph_rpc` | 0 filas | **KEEP FROM PLANS CANDIDATE** | Es mas completa (guarda `before_state`, `result_state`, `outcome`) | **NO** |
| Operations / audit | `planner_activity_log` (1 fila) | BOTH | Log de actividad por entidad | **SI** como mecanismo | INDIRECT | `recordPlannerActivity` | `entity_type` **no admite `'plan'`**; `household_id NOT NULL` ⇒ nada personal; sin filtro de privacidad | **MOVE/ADAPT CANDIDATE** | Es la unica superficie de actividad y funciona; el vocabulario esta desalineado | **NO** |
| Operations / audit | `planner_plan_operations` (0 filas) | PLANS | Auditoria por mutacion | **NO** | INDIRECT | RPC writers | Sin lector UI | **KEEP FROM PLANS CANDIDATE** | Estructura correcta, 0 filas | **NO** |
| Operations / audit | `planner_plan_measurement_history.operation_id` | PLANS | Trazabilidad de mediciones | **NO** | INDIRECT | writers del RPC | Append-only solo por GRANT | **KEEP FROM PLANS CANDIDATE** | — | **NO** |

### 17.16 Activity / Search / Attention / Home / Deep links / Notifications

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Activity | `planner_activity_log` + `recordPlannerActivity` (20 call-sites) | BOTH | Registro de actividad | **SI** como mecanismo | INDIRECT | `supabaseAdmin` | sin `'plan'`; `household_id NOT NULL`; sin privacy | **MOVE/ADAPT CANDIDATE** | Vive; solo requiere alinear vocabulario y privacy | **NO** |
| Search | `planner_plans` como fuente unica de Plan | PLANS | Search indexa Planes | **NO** (0 filas) | INDIRECT (§22 cross-Planner) | `planner.search.service.js:245` | Consistente con el detalle canonico | **KEEP FROM PLANS CANDIDATE** | Es el unico consumidor de Plan que ya apunta a la tabla que el detalle lee | **NO** |
| Attention | 2 fuentes de `planner_plans` | PLANS | Attention sobre Planes | **NO** (0 filas) | INDIRECT | `planner.attention.service.js:233,264` | 2 de 4 fuentes con literales **imposibles** (`blocked`,`review`) | **MOVE/ADAPT CANDIDATE** | Aplica privacy (a diferencia de Activity); las 2 fuentes vivas son correctas | **NO** |
| Home | `planner.summary.service.js:373` (`counts.goals`, `goal`) | GOALS | Home lee goals y **no lo renderiza** | **NO** (nada se renderiza) | INDIRECT | — | `HomeSummaryGoal` es tipo muerto | **NEEDS HUMAN DECISION** | El impacto de UI de cambiarlo es CERO hoy | **NO** |
| Deep links | `plannerDeepLinkCoordinator:273-280` | MISMATCH | `homeplus://planner/goals/:id` → `planner_plans` | **NO** | INDIRECT | — | El path dice `goals`, el destino lee `planner_plans` | **MOVE/ADAPT CANDIDATE** | El parser funciona; solo el binding de destino esta cruzado | **NO** |
| Notifications | `plannerNotificationAdapter` (`NoopNotifications`) | BOTH | Stub sin transporte | **NO** | INDIRECT | — | Sin transporte | **NEEDS HUMAN DECISION** | No hay sistema de notificaciones operativo que reparar | **NO** |

### 17.17 Frontend types / Clients / Routes / Tests

| AREA | PIECE | SYSTEM | WHAT IT DOES | RUNTIME USED? | PT RELEVANCE | DEPENDENCIES | DEFECTS | SALVAGE CANDIDATE | WHY | DECISION? |
|---|---|---|---|---|---|---|---|---|---|---|
| Frontend types | `PlannerPlan` (`types/PlannerPlan.ts`) | PLANS | Tipo canonico + `availableActions` + `objective` | **SI** (usado por la pantalla de detalle) | PARCIAL | — | Incluye `'trash'` en el union de lifecycle | **MOVE/ADAPT CANDIDATE** | El mas fiel a PT §13/§15 de los tres | **NO** |
| Frontend types | `PlannerPlanV1` | GOALS/V1 | Tipo del sistema goals | **SI** | PARCIAL | — | `preparation` como estado visible | **MOVE/ADAPT CANDIDATE** | Coherente con el nombre del Target | **NO** |
| Frontend types | `PlannerGoal` (30 campos, sin `lifecycle`) | GOALS | Tipo de `planner_goals` | **SI** | **NO** | — | **Contradice la fila real**: la fila si trae `lifecycle`, `target_date`, `archived_at`, `trashed_at` | **RETIRE CANDIDATE** | El tipo no describe la tabla que el sistema produce | **NO** |
| Frontend clients | `plannerGoals.ts` (20+ funciones) | GOALS | Cliente CRUD completo de goals | **SI** | INDIRECT | `api.ts` | Mezcla create/list/milestones/trash/restore en un archivo | **MOVE/ADAPT CANDIDATE** | Es el cliente con mas superficie viva | **NO** |
| Frontend clients | `plannerPlans.ts` | PLANS | Cliente canonico + cola de escrituras | **SI** (parcial) | INDIRECT | `reliability/` | `listCanonicalPlans` con 1 solo consumidor y ese es muerto | **MOVE/ADAPT CANDIDATE** | Es el cliente con la mejor forma (intents, single-flight, trazas) | **NO** |
| Frontend clients | `plannerPlansV1Frontend.ts` | GOALS/V1 | Cliente V1 | **SI** | INDIRECT | — | `unarchivePlanV1` con 0 llamadores | **MOVE/ADAPT CANDIDATE** | Es el cliente del sistema goals con alcance de Plan | **NO** |
| Frontend clients | `plannerPlansV1.ts` | GOALS/V1 | **Duplicado exacto** | **NO** | — | — | **0 importadores** | **RETIRE CANDIDATE** | Duplicacion literal sin consumidores | **NO** |
| Routes | `/api/planner/goals` (11 + 6) | GOALS | Contrato HTTP de goals | **SI** (create, list via V1, lifecycle, trash, restore) | INDIRECT | — | `DELETE` es alias de trash (confuso) | **MOVE/ADAPT CANDIDATE** | Es el contrato con mas superficie viva | **NO** |
| Routes | `/api/planner/v1/plans` (8) | GOALS/V1 | Contrato HTTP "v1" | **SI** (list, detail, lifecycle, trash, restore) | INDIRECT | — | El nombre "v1" apunta al legacy; `resume` 409 | **MOVE/ADAPT CANDIDATE** | Vive, pero la nomenclatura es invertida | **NO** |
| Routes | `/api/planner/plans` (6) | PLANS | Contrato HTTP canonico | **Parcial** (detail 404, structure sin Plan, create inalcanzable) | INDIRECT | — | El create esta detras de `implemented:false` | **MOVE/ADAPT CANDIDATE** | Es el unico contrato con RPC-only y gates reales | **NO** |
| Tests | `planner_p1_structure_contract_tests.ts` + `planner_p1_structure_database_tests.js` | PLANS | Contrato y DB de estructura | Wired (`db` corre el `.sql`; el `.js` **no** esta en `quality`) | PARCIAL | — | Afirman **Milestones** como contenido del Plan, contra PT §19; la suite DB esta **huerfana** | **NEEDS HUMAN DECISION** | Son las unicas pruebas del sistema canonico y fijan semantica de PT retirado | **NO** |
| Tests | `planner_v1_frontend_plans_tests.ts` | GOALS/V1 | Contrato frontend de lifecycle y progreso | Wired | PARCIAL | — | Cubre lifecycle como **string de write**, sin persistir; `Task unlink` y `Event unlink`: 0 tests | **MOVE/ADAPT CANDIDATE** | Ya prohibe `percentage`, lo que es compatible con PT §10 | **NO** |
| Tests | `scripts/planner_v1_navigation_tests.ts` | BOTH | Contrato de navegacion | Wired, **ROJO** | INDIRECT | — | 5 errores TS por afirmar `PlanDetail==='PlanDetail'`, `PlanList`, `PlanCreate==='CreatePlan'` | **MOVE/ADAPT CANDIDATE** | Bloquea el gate de calidad | **NO** |
| Tests | `planner_m11_3a_*` (2 archivos, 82 KB) | PLANS | Contrato SQL de `planner_plans` | **DEAD** (no cableados) | INDIRECT | — | No los corre nadie | **MOVE/ADAPT CANDIDATE** | Son la mayor red de pruebas del sistema canonico y esta muerta | **NO** |
---

## 18. "IF GOALS ROOT" — IMPACT MAP (B17)

> **NO se recomienda. NO se disena.** Esto responde una sola pregunta factual: *si una revision humana eligiera `planner_goals` como raiz, que piezas de `planner_plans` no existen en goals y habria que tratar?* Clasificacion: `ADD` (no existe nada equivalente) · `ADAPT` (existe algo parecido pero incompatible) · `PORT` (existe la pieza, hay que moverla) · `REBUILD` (existe pero su semantica esta rota).

| AREA | Pieza de `planner_plans` ausente en goals | Tratamiento | Por que (factual) |
|---|---|---|---|
| Plan root | **Scope/owner** | `ADD` | Goals no tiene `scope` ni `owner_person_id` (28 columnas, ausente) y su `household_id` es `NOT NULL` ⇒ un Plan personal real es imposible |
| Plan root | `created_by_person_id NOT NULL` | `ADD` | Goals sólo tiene `created_by_member_id`, que es `SET NULL` al borrar el miembro ⇒ autoría perdible |
| Plan root | `activated_at`, `paused_at` | `ADD` | No existen en goals: no se sabe cuándo se activó/pausó |
| Plan root | `finalization_kind` | `ADD` (o no) | No existe en goals; y en plans **nunca se lee** ⇒ decidir si se porta o se descarta |
| Plan root | `restore_review_required` | `ADD` (o no) | No existe en goals; sin consumidor UI conocido |
| Plan root | `lifecycle` terminal `closed` vs `cancelled` | `ADAPT` | Goals ya tiene `cancelled` (el nombre del Target); si se adopta `closed` hay que renombrar |
| Plan root | `planner_plan_legacy_goal_links` + vista projection | `RETIRE` | Sirven para mapear goals→plans; si goals es la raiz no hay nada que mapear |
| Identity | CHECK `planner_plans_owner_shape` | `ADD` | Goals no tiene ninguna invariante de shape |
| Identity | CHECK `planner_plans_trash_actor_shape` | `ADD` | Goals trasta con `trashed_at`+`trashed_by_member_id` **sin** CHECK ⇒ `trashed_at` sin actor es representable |
| Lifecycle | Gate de activacion (`:1000-1010`) | `PORT` (semantica a revisar) | Goals no tiene gate de activacion: `preparation → active` sin condiciones |
| Lifecycle | Gate de completado con `confirm_unresolved` | `ADD` | `completeGoal` cierra a ciegas, sin verificación alguna |
| Lifecycle | Exclusión de trash en transiciones (`:984-989`) | `ADD` | Goals no bloquea transiciones sobre un Plan trasteado |
| Lifecycle | Machine de transiciones en SQL | `PORT` | Goals tiene la tabla en JS (`PLAN_LIFECYCLE_TRANSITIONS`), con el defecto de `resume` |
| Lifecycle | `trash` como proyección, no como estado | `PORT` (o `ADD`) | Goals ya tiene `lifecycle` intacto al trastear ⇒ la proyección ya existe de hecho |
| Task relation | `planner_plan_task_links` / `planner_plan_components` | `NOT APPLICABLE` | Goals ya tiene `planner_tasks.goal_id` con FK y 0..1 ⇒ **no hay que portar nada** |
| Task relation | Validacion de scope Task↔Plan | `ADD` | El validador rechaza Task en Plan personal; si goals es la raiz, `planner_tasks` sigue sin `scope` ⇒ el gap de modelo persiste |
| Event relation | `planner_plan_requirements` rama `external` | `REBUILD` | Es la unica estructura de relacion Event↔Plan; goals no tiene ninguna |
| Event relation | Satisfaccion de Event (§09) | `REBUILD` | `external ⇒ false` siempre; hay que reescribir la semantica |
| Event relation | `planner_plan_validate_external_link` | `PORT` | Es la unica validacion de scope Event↔Plan y es correcta |
| Event relation | Direccion de dependencia (FK del lado Plan) | `KEEP AS IS` | Ya se cumple en `planner_events` |
| Measurement | `planner_plan_measurements` (15 col) | `PORT` | Goals no tiene tabla de mediciones; sólo 3 columnas sueltas sin nombre ni operador |
| Measurement | `planner_plan_measurement_history` (10 col) | `PORT` | Goals no tiene historial |
| Measurement | `target_operator` | `PORT` | Goals no tiene operador |
| Measurement | `classification` en measurements | `PORT` | Goals no tiene `classification` en ninguna tabla |
| Measurement | CHECKs de nombre/unidad no vacíos | `PORT` | Goals no valida ninguno |
| Required/Optional | `classification` (4 tablas) | `PORT` | Goals tiene **0** |
| Progress | `planner_plan_indicators` (contrato sin %) | `PORT` (contenido a rehacer) | La forma es correcta; el contenido cuenta Milestones+Requirements |
| Readiness | Gates de DB | `PORT` | Goals no tiene ninguna autoridad de readiness |
| Readiness | Recursion con deteccion de ciclo | `RETIRE` | Existe solo para el grafo retirado |
| Archive | CHECK `archive_terminal_only` | `NO** (goals no lo tiene)** | Si se quiere la ortogonalidad de §14, goals ya está **más cerca** (sin CHECK) |
| Archive | Escritura de `archived_at` alcanzable | `ADD` | En goals existe la columna pero la capability la hace inalcanzable |
| Trash | Trash actor shape + `trash_operation_id` | `ADD` | Goals tiene 2 de 4 campos, sin CHECK |
| Trash | `planner_plans` en la papelera transversal | **RESUELTO** | Si goals es la raiz, la papelera ya la incluye |
| Restore | `restore_goal_rpc` endurecido | **YA EXISTE EN GOALS** | Es la pieza mas fuerte de los dos sistemas y ya es de goals |
| Restore | Restaurar sin resucitar requirements | **RESUELTO** | Sin requirements, no hay resurreccion |
| RLS | Escritura sólo por RPC + `SELECT`-only | `PORT` | Goals escribe directo con `anon=arwdDxtm` y policies sin capability |
| RLS | `planner_plan_can_read` con draft creator-private | `PORT` | Goals no tiene no-opcion de draft |
| RLS | `planner_plan_external_link_dto` (arm P1) | `RETIRE` | Desaparece con el grafo |
| Capabilities | `planner_plan_can_mutate` (accion→capability) | `PORT` | Goals autoriza por endpoint, no por accion |
| Capabilities | `planner_plan_authorization_context_rpc` | `PORT` | Evita duplicar reglas en el backend |
| Capabilities | Namespace `plan.*` | `ADD` (o no) | Depende de OD-1; si goals es la raiz, `goal.*` es coherente |
| RPC authorization | `write_planner_plan_graph_rpc` como unico writer | `PORT` | Goals tiene 3 writers distintos (goals, plans.v1, milestones) |
| Versioning | `expected_plan_version` (2 niveles) | `ADD` | Goals tiene un solo nivel |
| Idempotency | `planner_plan_operations` con before/after state | `PORT` | Goals tiene `planner_idempotency_keys`, sin estado |
| Operations/audit | `planner_plan_operations` | `PORT` | — |
| Activity | `entity_type='plan'` | `ADD** (CHECK)** | El CHECK admite `goal` pero no `plan` ⇒ si goals es la raiz, `'goal'` **ya** es valido ⇒ resuelto |
| Activity | `household_id` nullable | `ADD** (o no)** | Depende de si se quiere Plan personal en Activity |
| Search | `planner_plans` como fuente | `PORT` (cambiar a `planner_goals`) | Rebajo de Search |
| Attention | 2 fuentes de `planner_plans` | `PORT** + `ADD** (las 2 fuentes de `blocked`/`review`)** | Las 2 fuentes de Plan funcionan; las 2 de planes siguen muertas |
| Deep links | binding de destino | `ADD** (oarrejar)** | El path `goals/:id` ya coincide con la raiz elegida ⇒ el mismatch desaparece |
| Frontend types | `PlannerPlan` | `PORT** (o `ADAPT` `PlannerPlanV1`)** | Si goals es la raiz, `PlannerGoal` es el tipo natural, pero **contradice la fila real** |
| Frontend clients | `plannerPlans.ts` + `reliability/` | `ADD** (o no)** | Goals ya tiene `plannerGoals.ts`; la cola de escrituras de plans no tiene equivalente |
| Routes | `/api/planner/plans` | `RETIRE** (o `REDIRECT`)** | — |
| Routes | `/api/planner/v1/plans` | `PORT** (fusionar con `/goals`)** | Hoy son dos contratos para la misma tabla |
| Tests | `planner_p1_structure_*` | `PORT** (reescribir contra `planner_goals`)** | Hoy afirman Milestones |
| Tests | `planner_m11_3a_*` | `RETIRE** o `PORT`** | Validan el SQL de `planner_plans` |

**Conteo factual:** de ~60 piezas evaluadas, **~5 son `RESUELTO` o `KEEP AS IS`** (Task relation, Trash en papelera, `restore_goal_rpc`, direccion de dependencia de Events, `entity_type='goal'`), **~7 requieren `ADD` puro**, **~20 `ADAPT`/`PORT`**, y **~15 `RETIRE`** por pertenecer al grafo o al dominio retirado por Product Truth.

---

## 19. "IF PLANS ROOT" — IMPACT MAP (B18)

> **NO se recomienda. NO se disena.** Misma disciplina: *si una revision humana eligiera `planner_plans` como raiz, que piezas del flujo que hoy SI funciona sobre goals habria que portar?*

| AREA | Pieza que hoy funciona sobre goals | Tratamiento | Por que (factual) |
|---|---|---|---|
| Plan create | `GoalForm` completo (titulo, descripcion, categoria, visibilidad, fechas, modo de avance) | `PORT` | La superficie canonica de create (`PlannerPlanMinimalCreateSurface`) esta **morta** (sin opener de sheet) y no tiene campos de categoria/visibilidad/fechas |
| Plan create | Quick Action `create_goal` | `ADD** (implementar `implemented:true`)** | Hoy `implemented:false` ⇒ `planner_plans` no tiene writer alcanzable |
| Plan list | `PlannerPlanListScreen` (selector de vista, filtro de scope, agrupacion por lifecycle) | `PORT` | La lista canonica (`PlannerPlansScreen`) esta **muerta** (0 importadores) y no tiene selector de vista |
| Plan detail (V1) | `PlannerPlanDetailScreenV1` (transiciones, trash, link/unlink Task) | `PORT` | El detalle canonico (`PlannerPlanDetailScreen`) monta pero da **404** para todo id creado por la app |
| Plan edit | `EditGoalScreen` | `NO EXISTE** (esta muerto y no esta registrado)** | Hay que construir el editor de Plan desde cero |
| Task link | `PlannerPlanDetailScreenV1:198-211` → `PATCH /tasks/:id` con `goal_id` | `PORT` | Es la **unica** UI de link Task de todo el sistema; no hay equivalente en plans |
| Task unlink | `PlannerPlanDetailScreenV1:213-238` | `PORT` | Ídem |
| Task filter | `GET /api/planner/tasks?goal_id=` | `PORT** (o `RETIRE`)** | El filtro existe y lee `planner_goals` |
| Lifecycle (V1) | `transitionPlan` con 7 verbos + capability propia por verbo | `PORT** (o `REBUILD`)** | El canonico tiene verbos equivalentes pero `goal.archive=false` lo deja inalcanzable |
| Lifecycle `resume` | En goals da **409** | `ADD** (arreglar)** | En plans ya funciona ⇒ es un bug **de goals**, no de plans |
| Lifecycle (goals) | `POST /goals/:id/{complete,close,fail,reopen}` | `PORT` | `fail` no existe en plans y es ademas vacuo en goals |
| Trash (goals) | `POST /v1/plans/:id/trash` + `DELETE /goals/:id` | `PORT** (o `REBUILD`)** | En plans el trash es una transicion del writer, con 4 campos y CHECK |
| Restore | `restore_goal_rpc` (con capability + anti-spoofing) | `PORT` | En plans el restore es una transicion comun, sin RPC dedicado |
| Trash screen | `PlannerTrashScreen` con `case 'goal'` | `ADD** (o re-apuntar)** | En plans `planner_plans` **no esta** en `planner.trash.service.js` ⇒ hay que anadirlo |
| Home | `planner.summary.service.js:373` lee goals | `PORT** (o `RETIRE`)** | Home hoy **no renderiza** el Plan ⇒ el coste de UI es 0 |
| Tasks tab | `PlannerTasksScreen:14` → `listGoals` | `ADD** o `RETIRE`** | El tab Tareas lee `planner_goals`; hay que re-apuntar o dejar de listar metas ahi |
| Deep links | path `homeplus://planner/goals/:id` | `ADAPT` | El path ya dice `goals` ⇒ hay que cambiarlo (o dejarlo, si el destino es la raiz) |
| `planner_tasks.goal_id` (FK) | Relacion Task↔Goal con FK y 0..1 | `PORT** o `RETIRE`** | Es la unica relacion Task-Plan con integridad en DB; en plans no hay equivalente |
| `planner_idempotency_keys` (11 filas) | Idempotencia V0 **con evidencia de ejecucion** | `PORT` | En plans la idempotencia existe pero tiene **0 filas** |
| `planner_goals` visibility creator-based | `visibility='personal'` + creador | `PORT** o `RETIRE`** | En plans la propiedad personal es por `owner_person_id`, que es **mas correcta** |
| `PlannerGoal` / `plannerGoals.ts` | Cliente CRUD completo | `PORT` o `RETIRE` | `plannerGoals.ts` cubre create/read/update/trash/restore/milestones en un archivo |
| `PlannerGoal` tipo | Tipo de 30 campos | `RETIRE` | **Contradice la fila real** (la fila si trae `lifecycle`, `target_date`, `archived_at`, `trashed_at`) |
| `PlannerPlanV1` | Tipo con el nombre del Target (`cancelled`) | `PORT` o `RETIRE` | — |
| `GoalDetailScreen` / `PlannerGoalsScreen` / `EditGoalScreen` / `PlannerGoalsForm` | — | `RETIRE CANDIDATE` | 4 pantallas **muertas** |
| `services/plannerPlansV1.ts` | Duplicado | `RETIRE CANDIDATE** | 0 importadores |
| 6 endpoints de milestones + 3 RPC `*_milestone_rpc` | Milestones legacy | `RETIRE CANDIDATE** | PT §19 retira Milestone |
| `planner_goal_milestones` | Tabla de hitos legacy | `RETIRE CANDIDATE** | 0 filas |
| `progress_mode` / `target_type` / `category` en la raiz | Campos que PT retira | `RETIRE CANDIDATE** | PT §02/§10 |
| `failed_at` | Campo de estado imposible | `RETIRE CANDIDATE** | El CHECK lo prohibe |
| `deleted_at` | 2ª marca de borrado | `RETIRE CANDIDATE** | PT §15 usa Trash |
| `planner_goals.status` + trigger proyector | Doble autoridad | `RETIRE CANDIDATE** | Consecuencia de usar `planner_plans` |
| `planner_legacy_goal_plan_projection` | Vista de compatibilidad | `RETIRE CANDIDATE** | Sin bridge que mantener |

**Conteo factual:** ~30 piezas habrian que portar o re-apuntar (de las cuales **~8 son superficies muertas o campos prohibidos por PT, es decir que no son "coste real"**), ~4 habrian que **construir desde cero** (editor de Plan, lista canonica, writer alcanzable, Trash de `planner_plans`), y ~15 serian **retirables** porque pertenecen al sistema que se estaria abandonando o al dominio que PT retiró.

---

## 20. UNKNOWNS

### 20.1 Blocked por esta sesion

| # | Unknown | Por que |
|---|---|---|
| U1 | Si `POST /api/planner/goals` devuelve 201 en runtime con sesion real | Requiere app + sesion autenticada en entorno local probado (blocked, ver Create Trace §2.6) |
| U2 | Si el INSERT tiene efectos colaterales no previstos (idempotency keys, activity log, `updated_at`) | Requiere la escritura |
| U3 | Status HTTP y body exactos observados | Ídem |
| U4 | Logs de backend y frontend durante el intento | No existen logs persistidos |
| U5 | Si algun rol real obtiene 403 en `goal.create_household` en este flujo | Requiere sesion por rol |
| U6 | Que pantalla y mensaje ve exactamente el usuario | Requiere pantalla real |
| U7 | Comportamiento runtime de `resume` (409) y `archive` (403) | Requiere escritura |
| U8 | Si `planner_plan_indicators` y la vista projection se pueden escribir con `anon` | `RC-034`: `INCONCLUSIVE` (señales en conflicto); no se intentó |
| U9 | Si `trash_goal_rpc` es explotable por `anon` | No intentado (sería escritura) |
| U10 | Si `planner_plan_external_link_dto` fuga un titulo en el caso real | 0 requirements ⇒ no reproducible |

### 20.2 Unknowns que persisten aunque se levante el runtime

| # | Unknown |
|---|---|
| U11 | Si `planner_goals` tiene datos en **produccion**. `RUNTIME RO VERIFIED` sólo para local (1 fila QA). **Nada de este documento autoriza asumir que remoto esta vacio** |
| U12 | Si existe algun cliente fuera de este repo (web, otro branch) que cree Plans |
| U13 | Cuál es la autoridad canonica deseada. **No es una pregunta tecnica y no se responde aqui** |
| U14 | De que operaciones son las 11 filas de `planner_idempotency_keys` (no inspeccionado) |
| U15 | Si `households.config.permissions` se usa en produccion (en local: 0 overrides `goal.*`) |
| U16 | Por que `homecloud-current` y no `planner-current` es el worktree con runtimes vivos |
| U17 | Si el gate `planner_p1_structure_database_tests.js` pasaria hoy (nunca se ha ejecutado con DB) |
| U18 | Si las 2 implementaciones de `targetReached` (SQL y JS) coinciden en todos los casos (no hay test) |

### 20.3 Lo que hace falta para cerrar U1-U10

Decision humana, no tecnica:
1. Un entorno donde `front/.env` de `planner-current` apunte a **loopback** en vez de `trycloudflare.com` (implica **modificar un archivo existente**, prohibido aqui).
2. Un backend **de `planner-current`** corriendo (o autorizacion para tomar el puerto `:3001`).
3. Una sesion autenticada real, o credenciales QA.

---

## 21. EVIDENCE REGISTRY

### 21.1 Runtime read-only (todas con `SET LOCAL default_transaction_read_only = on`)

- Conteos de 13 tablas del dominio + `schema_migrations = 112` + 26 tablas `planner_*`
- Fila completa de `planner_goals` (`22f53d7f-…`) y NULL en 14 columnas
- Búsqueda de `__QA_PLANS_CREATE_TRACE_20261003__` en ambas tablas → 0 filas
- `planner_tasks.goal_id` no nulo → 0 de 3
- `LEFT JOIN planner_goals → planner_plans` → `exists_in_plans = false`
- `read_planner_plan_graph_rpc('22f53d7f-…') IS NULL` → `true`
- `planner_activity_log` (1 fila) y `planner_idempotency_keys` (11 filas)
- `information_schema.columns`: `planner_goals` (28), `planner_plans` (25), `planner_plan_measurements` (15), `planner_plan_measurement_history` (10), `planner_plan_requirements` (18), `planner_plan_milestones` (17), `planner_plan_operations` (18), `planner_goal_milestones` (13), `planner_plan_legacy_goal_links` (5), `planner_activity_log` (11), `planner_tasks` (39)
- `classification` presente en exactamente 4 tablas
- `planner_events`: 0 columnas `plan*`/`goal*`
- `pg_constraint`: 10 CHECK + 3 FK en `planner_goals`; 8 CHECK + 6 FK en `planner_plans`; 6 FK hacia `planner_plans`; 18 FK en `planner_tasks` (incl. `planner_tasks_goal_id_fkey → planner_goals(id) ON DELETE SET NULL`); 8 CHECK en `planner_plan_requirements`; 7 CHECK en `planner_plan_measurements`; 3 CHECK en `planner_activity_log`
- Índices únicos de `planner_plan_requirements` (5, incl. `one_external_reference_idx`)
- `pg_trigger` de ambas raíz (3 y 1)
- `pg_policies` de `planner_goals` (3) y `planner_plans` (1)
- `pg_class.relacl` / `relrowsecurity` / `relforcerowsecurity` de 4 tablas
- `pg_proc.prosrc` de `planner_goals_sync_status_from_lifecycle` y `planner_goal_project_status`
- `pg_get_viewdef` de `planner_plan_indicators` y `planner_legacy_goal_plan_projection`
- `information_schema.views` → 2 vistas del dominio

### 21.2 Static re-leida en esta sesion

**Frontend:** `plannerNavigationContract.ts` (`:141-163,405-416`), `HomeTabNavigator.tsx` (`:192-220`), `PlannerScreen.tsx` (`:786-806`), `PlannerPlanListScreen.tsx` (`:42-160`), `CreateGoalScreen.tsx` (completo), `GoalForm.tsx` (completo, 1121 líneas), `PlannerPlanDetailScreen.tsx` (completo, 198 líneas), `plannerGoals.ts` (`:1-61,78-90,166-183`), `api.ts` (`:5-29,308-324,379-469`), `idempotency.ts` (completo), `plannerPlans.ts` (`:335-413`), `plannerPlansV1Frontend.ts` (`:1-80`), `plannerPlansV1.ts` (`:28-172`), `plannerQuickActions.ts` (`:27-159`), `plannerSheetState.ts` (`:23,56,216,220`), `QuickActionsMenu.tsx` (`:51,98`), `PlannerSheetHost.tsx` (`:44-84,402-656`), `PlannerPlanCreateScreen.tsx` (`:103-132`), `TaskForm.tsx` (`:535-742`), `PlannerAttentionActivityScreen.tsx` (`:188`), `PlannerGoalsScreen.tsx` (`:413`), `plannerDeepLinkCoordinator.ts` (`:276`), `plannerNavigationHelpers.ts` (`:48,128,175,318`), `PlannerTrashScreen.tsx` (`:112-226`)

**Búsquedas de consumidores:** `'CreatePlan'`, `ROUTE_NAMES.PlanCreate`, `'GoalDetail'`, `'PlanDetail'` (14 hits, todos inventariados); `GoalDetailScreen`/`PlannerGoalsScreen`/`EditGoalScreen`/`PlannerPlansScreen`/`PlannerGoalsForm` (0 importadores); `PlannerTasksScreen` (4 refs, LIVE)

**Backend:** `index.js` (`:1-108`), `routes/planner.js` (`:18-143`), `routes/planner.v1.js` (completo), `planner.goals.controller.js` (`:1-130`), `planner.goals.service.js` (`:130-429`), `planner.plans.v1.service.js` (`:1-130,380-579`), `planner.plans.service.js` (`:180-299`), `planner.plans.controller.js` (`:80-189`), `planner.trash.service.js` (`:2,6,35,63-195`), `planner.search.service.js` (`:217,231,245`), `planner.attention.service.js` (`:128-309`), `planner.summary.service.js` (`:301,337,373`), `plannerMutationContracts.js` (completo), `plannerIdempotencyAdapter.js` (`:1-232,282-325`), `mutationContracts.js` (`:1-135`)

**Migraciones:** `20260722040000_m11_3a_plan_graph_foundation.sql` (`:180-210,279-281,491-577,975-1044`)

### 21.3 Static de entorno (OS)

`Get-CimInstance Win32_Process` (PIDs 3076, 26464, 29676, 2748, 18104, 8296, 26904, 3392) · `Get-NetTCPConnection -State Listen` (`8081`, `3001`, `8443`, `8085`, `8086`, `56221`-`56227`) · `docker ps` (10 contenedores) · `Get-NetIPAddress` (`192.168.0.26` = LAN de esta máquina) · `LastAccessTime` de 7 archivos backend en 2 worktrees · `Get-Process -Id 2748 | Select StartTime` · DNS de los 2 hostnames `trycloudflare.com` → `Host desconocido` · `GET /health` y `GET /` en `127.0.0.1:3001`

### 21.4 Secondary (no re-leida en esta sesion)

- `PLANS_CAPABILITY_MAP_CURRENT_V1.md §4-§18` (matrices de capabilities, `households.config`, grants, consumer graph, identity model) — citado por referencia, marcado `carry-over`
- `PLANS_RECONSTRUCTION_DISCOVERY_V1.md` (RC-001…RC-042, detalle de lifecycle de Events/Tasks, tests) — citado por referencia, marcado `carry-over`
- Resto de `planner.goals.service.js` (430-1170), `planner.plans.service.js` (1-179, 300-373), `planner.plans.v1.service.js` (131-379, 580-706), `planner.goals.controller.js` (131-485), `plannerCapabilities.js` — **no re-leídos línea a línea**
- Migraciones `20260722090002_*`, `20260722049000_*`, `20260908000001_*`, `20260908000002_*`, `20260914000002_*` — citados vía carry-over
- `planner.capabilities.js` / `plannerEvents*` / `plannerTasks*` (dominios Tasks y Events) — fuera del alcance salvo referencia

### 21.5 Lo que NO se hizo (declaracion de limites)

- **0 escrituras** en DB, en schema o en archivos de codigo
- **0 comandos git** de escritura (`add`, `commit`, `push`, `reset`, `clean`, `stash`, `switch`, `checkout`, `merge`, `rebase`)
- **0** `supabase db reset` / `db push` / SQL de mutacion
- **0** consultas al proyecto Supabase remoto
- **0** filas QA creadas (la autorizacion de "como maximo una" queda sin usar)
- **0** dev servers arrancados en este worktree
- **0** pantallas abiertas

---

*Fin de PLANS_GOALS_VS_PLANS_SALVAGE_MATRIX_V1. No hay ganador. No hay target. No hay "MUST". Esperar revision humana.*