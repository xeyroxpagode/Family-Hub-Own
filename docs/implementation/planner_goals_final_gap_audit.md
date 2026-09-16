> **Update — Planner Total Progress Audit — 2026-07-10**
>
> Esta auditoría (gap audit, Phase 0) se creó cuando `calculateProgress` para steps y tasks devolvía `null` (TODO). **Eso ya NO es cierto.** Verificación al 2026-07-10 contra el código real del branch:
>
> - `backend/src/services/planner.goals.service.js:81-108` — `calculateProgressFromTasks` IMPLEMENTADO: consulta status de `planner_tasks` where `goal_id && deleted_at null && status neq cancelled`; total = computableTasks.length; **0 → null**; completed = filter `status === 'completed' || 'verified'` (pending y awaiting NO cuentan); cancelled/deleted excluidos; percentage = round(completed/total*100); **no auto-completa goal al 100%**.
> - `planner.goals.service.js:137-155` — `calculateProgress` para `steps` IMPLEMENTADO: milestones achieved/total; **0 hitos → null**; no auto-completa.
> - En consecuencia, las tablas de abajo que marcan "MISSING" en:
>   - Phase 4 ("Progreso steps derivado de hitos") — **RESUELTO**.
>   - Phase 5 ("Progreso tasks derivado de completadas/total") — **RESUELTO**.
>   - Phase 1 ("Eliminar progreso falso (null ≠ 0)") — **RESUELTO** en `plannerShared.ts:104-112` `hasRealGoalProgress` + `shouldShowGoalProgressBar`, usado por PlannerGoalsScreen, GoalDetailScreen y HomePlannerSections.
>   - Phase 3 ("Post-create `justCreated` state" y "Quick Action global 'Crear meta'") — siguen **MISSING** (no hay prompt post-create y QuickActionSheet.tsx no incluye "Crear meta"; ver `planner_total_progress_audit.md` §6).
>   - Phase 10 ("No 0% falso" en Home) — **RESUELTO** (`HomePlannerSections.tsx:309` usa `hasRealGoalProgress`).
>   - Phase 14 ("Geni real (no simular)" CONFLICT) — **RESUELTO** (Geni removido de Home; `planner.summary.service.js:60` usa `briefing_text` template, sin Geni).
>   - Phase 5 ("Crear tarea desde GoalDetail ya vinculada" MISSING) — **RESUELTO**: `GoalDetailScreen.tsx:462-479` botón "Crear tarea" navega a `CreateTask` con `{ goalId, goalTitle, fromGoal: true, returnToGoalId }`; `TaskForm.tsx:154-181` recibe y persiste `goal_id`; post-save vuelve a `GoalDetail` (`TaskForm.tsx:411-413`).
>   - Phase 5 ("Query eficiente de tasks por goal_id" MISSING) — **RESUELTO parcialmente**: backend `planner.tasks.service.js:328-349` filtra `?goal_id` en la query SQL (eficiente); frontend `GoalDetailScreen.tsx:82-88` llama `listPlannerTasks(accessToken, { goal_id: goalId, limit: 100 })`. Ya no trae 100 y filtra en cliente.
>   - Phase 5 ("Prellenado goal_id/milestone_id + retorno GoalDetail" MISSING) — **RESUELTO para goal_id** (no para milestone_id, que requiere `goal_milestone_id` en planner_tasks — sigue MISSING porque la columna no existe en DB).
>
> **T1 — Goals Tasks Core: CERRADO con evidencia.**
>
> El resto del contenido histórico de este archivo (Phase 0 spec-gap por phase, migraciones requeridas Phase 2, 11 tablas nuevas, component modular, etc.) sigue siendo válido como roadmap de largo plazo (T2 templates, P1 polish, P2/P3 futuro). Ver `planner_total_progress_audit.md` para el estado total de Planner (Tareas + Calendar + Goals + Quick Actions + Home + Backend + DB).

---

# Planner Goals FINAL Spec — Gap Audit (Phase 0)

**Branch:** `integrate/inventario-planner-20260708-1634`
**Fecha:** 10/07/2026 (actualizado con decisiones de producto del 10/07/2026: T1-T4 reorganización)
**Alcance:** comparar `HomePlus_Planner_Goals_UX_Implementation_Spec_FINAL.md` contra el código real y producir un gap map antes de reestructurar Goals.
**Tipo:** documentation-only. No se modificó código, backend, frontend, DB ni migraciones.
**No incluye:** Auth, Household, Inventory, Calendar/Events.

---

## 1. Documentos fuente leídos

| Documento | Aporte |
|---|---|
| `docs/implementation/HomePlus_Planner_Goals_UX_Implementation_Spec_FINAL.md` (2244 líneas) | Spec final integral: producto, UX, arquitectura, fases 0–15, edge cases, copy. |
| `docs/implementation/planner_goals_final.md` (1103 líneas) | Fuente de verdad previa, estado real implementado hasta Phase 2, problemas UX. |
| `docs/implementation/planner_goals_product_ux_spec.md` (343 líneas) | Complemento Product/UX: modos, creación 10s, anti-patrones. |
| `docs/implementation/planner_goals_source_map.md` (225 líneas) | Trazabilidad documental, relaciones históricas, contradicciones. |

## 2. Código inspeccionado

### Migraciones
- `supabase/migrations/202606230001_planner_mvp.sql` — `planner_tasks`, `planner_events`, RLS.
- `supabase/migrations/202607080003_planner_tasks_origin_fields.sql` — origin_* en tasks.
- `supabase/migrations/202607080004_planner_goals.sql` — `planner_goals`, `planner_goal_milestones`, `planner_tasks.goal_id`, helpers RLS.
- `supabase/migrations/202607080005_fix_planner_goals_insert_rls.sql` — fix RLS INSERT/SELECT.
- `supabase/migrations/202607100001_add_progress_mode_to_goals.sql` — `progress_mode` column + backfill.
- Helpers RLS: `effective_uid()`, `current_person_id()`, `is_active_household_member()`, `current_household_member_id()`, `can_select_planner_goal()`, `can_update_planner_goal()` (en `202606210009` y `202607080004`).

### Backend
- `backend/src/routes/planner.js` (42 líneas)
- `backend/src/controllers/planner.goals.controller.js` (172 líneas)
- `backend/src/services/planner.goals.service.js` (698 líneas)
- `backend/src/services/planner.tasks.service.js` (605 líneas)
- `backend/src/services/planner.context.service.js` (73 líneas)
- `backend/src/constants/planner.constants.js` (108 líneas)

### Frontend
- `front/mi-front-limpio/services/plannerGoals.ts` (231 líneas)
- `front/mi-front-limpio/services/plannerTasks.ts` (141 líneas)
- `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx` (388 líneas)
- `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` (585 líneas)
- `front/mi-front-limpio/screens/planner/GoalForm.tsx` (1061 líneas)
- `front/mi-front-limpio/screens/planner/TaskForm.tsx` (1177 líneas)
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` (742 líneas)
- `front/mi-front-limpio/screens/planner/plannerShared.ts` (1439 líneas)
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` (551 líneas)
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` (288 líneas)
- `front/mi-front-limpio/navigation/types.ts` (46 líneas)
- `front/mi-front-limpio/screens/planner/CreateGoalScreen.tsx` (6 líneas)
- `front/mi-front-limpio/screens/planner/EditGoalScreen.tsx` (6 líneas)

---

## 3. Estado implementado actual (REAL_NOW)

### DB

**`planner_goals`** (`202607080004_planner_goals.sql:5-33`, `202607100001_add_progress_mode_to_goals.sql:6-7`):
- `id`, `household_id`, `title`, `description`, `visibility`, `category`, `progress_mode` (default `'steps'`), `target_type`, `target_value`, `current_value`, `unit`, `starts_at`, `ends_at`, `status`, `created_by_member_id`, `completed_at`, `failed_at`, `deleted_at`, `created_at`, `updated_at`.
- Constraints: status `active|completed|failed`, visibility `household|personal`, category `home|family|finance|health|education|other`, target_type `count|percentage|amount|boolean|null`, title not blank, values >= 0, progress_mode `steps|tasks|numeric|boolean|none`.

**`planner_goal_milestones`** (`202607080004_planner_goals.sql:80-95`):
- `id`, `goal_id`, `title`, `target_value`, `achieved`, `achieved_at`, `sort_order`, `deleted_at`, `created_at`, `updated_at`.
- Constraints: title not blank, target_value >= 0, sort_order >= 0.

**`planner_tasks.goal_id`** (`202607080004_planner_goals.sql:115-116`):
- FK opcional a `planner_goals.id` con `on delete set null`.
- Índice `idx_planner_tasks_goal` en `(household_id, goal_id)` where `goal_id is not null`.

**RLS** (`202607080004_planner_goals.sql:221-272`, `202607080005_fix_planner_goals_insert_rls.sql:7-27`):
- Goals SELECT: `is_active_household_member(household_id)` AND (`visibility='household'` OR `created_by_member_id = current_household_member_id(household_id)`).
- Goals INSERT: `is_active_household_member(household_id)` AND `created_by_member_id = current_household_member_id(household_id)`.
- Goals UPDATE: `can_update_planner_goal(id)` (mismo predicado que SELECT).
- Milestones: SELECT/INSERT/UPDATE delegan a `can_select_planner_goal`/`can_update_planner_goal`.
- No hay DELETE policy (soft delete via UPDATE).
- No hay DELETE grant (solo `select, insert, update`).

### Backend

**Rutas** (`backend/src/routes/planner.js:29-40`):
- `GET /api/planner/goals` (list con filtros status, category, visibility, only_mine, ends_at_from, ends_at_to, limit).
- `GET /api/planner/goals/:id` (detalle + milestones).
- `POST /api/planner/goals` (create).
- `PATCH /api/planner/goals/:id` (update, no permite `status`).
- `DELETE /api/planner/goals/:id` (soft delete).
- `POST /api/planner/goals/:id/complete`.
- `POST /api/planner/goals/:id/fail`.
- Milestones: `GET/POST /api/planner/goals/:goalId/milestones`, `PATCH/DELETE /api/planner/goals/:goalId/milestones/:milestoneId`.

**Validaciones** (`backend/src/services/planner.goals.service.js:43-79`, `backend/src/constants/planner.constants.js:78-92`):
- `validateProgressMode`: default `'steps'`, 400 si inválido.
- `validateProgressModeTargetTypeCompatibility`: 400 si mode no admite target_type y llega uno, 400 si requiere target_type y no llega, 400 si no está en lista permitida.
- Mapa `steps→null`, `tasks→null`, `numeric→[count,amount,percentage]`, `boolean→[boolean]`, `none→null`.

**Cálculo de progreso** (`planner.goals.service.js:81-123` `calculateProgress`):
- `completed` → 100.
- `boolean` → `current_value >= 1 ? 100 : 0`.
- `numeric` → `current/target * 100` acotado 0..100; `null` si target null/undefined.
- `steps` → `null` (TODO Phase 4, `planner.goals.service.js:108-111`).
- `tasks` → `null` (TODO Phase 5, `planner.goals.service.js:113-116`).
- `none` → `null`.

**Contexto server-side** (`planner.context.service.js:4-69`):
- Resuelve `person`, `household`, `membership`, `householdId`, `personId`, `membershipId`, `role` desde token.
- Backend arma `household_id` y `created_by_member_id` server-side; no confía en body (`planner.goals.service.js:284-298`).
- `status` no se acepta del body; se setea `'active'` en create (`planner.goals.service.js:297`). PATCH rechaza `status` (`planner.goals.service.js:367-369`).

**Task ↔ Goal** (`planner.tasks.service.js:172-200` `validateGoalId`):
- Valida `goal_id` como UUID, existe en `planner_goals`, mismo household, no soft-deleted.
- `createTask` y `updateTask` persisten `goal_id` (`planner.tasks.service.js:395`, `planner.tasks.service.js:473-478`).

### Frontend

**Tipos TS** (`services/plannerGoals.ts:21-101`):
- `PlannerGoalProgressMode = 'steps'|'tasks'|'numeric'|'boolean'|'none'`.
- `PlannerGoal` incluye `progress_mode`, `progress_percentage: number | null`.
- `CreatePlannerGoalInput` incluye `progress_mode?`.
- `PlannerGoalMilestone` con `id, goal_id, title, target_value, achieved, achieved_at, sort_order, created_at, deleted_at`.

**Cliente API** (`services/plannerGoals.ts:137-230`):
- `listGoals`, `getGoalById`, `createGoal`, `updateGoal`, `deleteGoal`, `completeGoal`, `failGoal`.
- `listGoalMilestones`, `createGoalMilestone`, `updateGoalMilestone`, `deleteGoalMilestone`.

**GoalForm** (`GoalForm.tsx`, Phase 2 completada):
- Ruta simple: Nombre, Descripción opcional, Categoria, Visibilidad. Progreso y Fechas colapsados por defecto (`GoalForm.tsx:151-152`).
- Sección "Cómo querés avanzar" con chips `steps|tasks|numeric|boolean|none` (`GoalForm.tsx:675`).
- Sub-opciones numeric: Cantidad / Dinero / Porcentaje (`GoalForm.tsx:56-60`).
- Presets de fecha: Sin fecha / Esta semana / Este mes / Este año / Personalizada (`GoalForm.tsx:68-74`).
- Validación: bloquea fechas parciales inválidas y `ends_at < starts_at` (`GoalForm.tsx:383-396`).
- Edit mode: carga `progress_mode` directo; fallback para metas viejas (`GoalForm.tsx:208-229`).
- Post-create navega a `GoalDetail` (`GoalForm.tsx:429`).

**PlannerGoalsScreen** (`PlannerGoalsScreen.tsx`):
- Lista con filtros status/visibility/categoria (`PlannerGoalsScreen.tsx:40-61`).
- Cards con barra, porcentaje, chips.
- Empty state, error, loading, refresh.

**GoalDetailScreen** (`GoalDetailScreen.tsx`):
- Muestra goal, barra, hitos (crear/toggle/delete), tareas vinculadas (fetch 100 + filtro frontend `GoalDetailScreen.tsx:78-79`), input progreso manual, complete/fail/delete.

**TaskForm** (`TaskForm.tsx`):
- Selector opcional de meta vinculada (`TaskForm.tsx:598-632`).
- Oculta selector si `listGoals` falla (`TaskForm.tsx:263-265`).

**PlannerTasksScreen** (`PlannerTasksScreen.tsx`):
- Badge de meta vinculada en task card (`PlannerTasksScreen.tsx:230-236`).
- Carga goal titles via `listGoals` (`PlannerTasksScreen.tsx:343-357`).

**plannerShared.ts**:
- `goalProgressModeLabels` (`plannerShared.ts:96-102`).
- Labels humans para status, visibility, category, target type.

**HomePlannerSections** (`HomePlannerSections.tsx`):
- Card de meta destacada/en riesgo (`HomePlannerSections.tsx:317-377`).
- Carga `listGoals` directo (`HomePlannerSections.tsx:226`).
- Riesgo calculado en frontend (`HomePlannerSections.tsx:320-325`).

**Navegación** (`navigation/types.ts:30-44`, `navigation/HomeTabNavigator.tsx:113-126`):
- `PlannerStackParamList`: `PlannerHome`, `CreateTask`, `EditTask`, `CreateEvent`, `EditEvent`, `CreateGoal`, `EditGoal`, `GoalDetail`.
- `CreateGoal: undefined`, `EditGoal: { goalId: string }`, `GoalDetail: { goalId: string }`.

---

## 4. Matriz de gap por Phase (FINAL spec §33)

### Phase 0 — Contrato y auditoría

| Ítem | Estado | Referencia |
|---|---|---|
| Estado actual documentado | REAL_NOW | Este reporte + `planner_goals_final.md` §16 bis |
| RLS inspectada | REAL_NOW | `202607080004_planner_goals.sql:221-272`, `202607080005` |
| Task statuses inspectados | REAL_NOW | `planner.constants.js:1-7`, `planner_mvp.sql:40-47` |
| Navegación inspectada | REAL_NOW | `navigation/types.ts:30-44` |
| Compatibilidad progress_mode/target_type | REAL_NOW | `planner.constants.js:86-92`, `planner.goals.service.js:53-79` |
| Migraciones planificadas | MISSING | No existe migration plan para las 11 tablas nuevas |

### Phase 1 — Verdad visual y GoalDetail modular

| Ítem | Estado | Referencia |
|---|---|---|
| Eliminar progreso falso (null ≠ 0) | CONFLICT | `PlannerGoalsScreen.tsx:72` (`?? 0`), `PlannerGoalsScreen.tsx:150` (`current/target ?? '?'`), `GoalDetailScreen.tsx:246` (`?? 0`) |
| Shell común GoalDetail (back, título, metadata mínima, menú •••) | MISSING | `GoalDetailScreen.tsx:295-309` usa header plano sin menú ••• |
| Modos diferenciados en GoalDetail | MISSING | `GoalDetailScreen.tsx` no diferencia UX por `progress_mode`; muestra barra + input + hitos + tareas + terminales siempre |
| Acciones terminales menos prominentes | CONFLICT | `GoalDetailScreen.tsx:426-447` muestra Lograda/Fallida como acciones primarias competiendo con el modo |
| Errors/loading states | PARTIAL | Existe loading/error (`GoalDetailScreen.tsx:262-286`); faltan errors específicos de §32 |
| Componentes modulares recomendados | MISSING | Ninguno de los 21 componentes de §27 existe (GoalDetailHeader, GoalStepsSection, GoalNumericSection, etc.) |
| GoalDetail no monolítico | CONFLICT | `GoalDetailScreen.tsx` 585 líneas monolíticas |

### Phase 2 — Modelo estructural final

| Ítem | Estado | Referencia |
|---|---|---|
| `owner_member_id` en planner_goals | MISSING | No existe en `202607080004_planner_goals.sql:5-33` |
| `responsible_member_id` nullable | MISSING | No existe |
| `priority` (baja/normal/alta) | MISSING | No existe; spec usa `low|normal|high` (§18.11), no `critical` |
| `archived_at` + `archived_by_member_id` | MISSING | No existe (§17.4) |
| `reopened_at` + `reopen_count` | MISSING | No existe (§17.2) |
| `recurrence_rule` nullable | MISSING | No existe (§24.2) |
| `template_id` nullable | MISSING | No existe (§24) |
| `qualitative_status` opcional | MISSING | No existe (§16) |
| `version` para concurrencia optimista | MISSING | No existe (§29) |
| `goal_milestone_id` en planner_tasks | MISSING | Confirmado: no existe en ninguna migración |
| Constraint milestone pertenece al goal | MISSING | No existe; spec §18.1 exige `goal_milestone_id` solo puede referenciar hito de ese `goal_id` |
| `note` en planner_goal_milestones | MISSING | No existe (§9.1) |
| `target_date` en planner_goal_milestones | MISSING | No existe (§9.1) |
| `version` en milestones | MISSING | No existe (§29) |
| `planner_goal_participants` | MISSING | Tabla no existe (§22) |
| `planner_goal_comments` | MISSING | Tabla no existe (§23.2) |
| `planner_goal_notes` | MISSING | Tabla no existe (§23.1) |
| `planner_goal_activity` | MISSING | Tabla no existe (§23.3) |
| `planner_goal_progress_entries` | MISSING | Tabla no existe (§14.3) |
| `planner_goal_reminders` | MISSING | Tabla no existe (§21.2) |
| `planner_goal_user_preferences` (pin por usuario) | MISSING | Tabla no existe (§18.12) |
| `planner_goal_templates` | MISSING | Tabla no existe (§24.1) |
| `planner_goal_template_milestones` | MISSING | Tabla no existe |
| `planner_goal_template_tasks` | MISSING | Tabla no existe |
| `planner_goal_file_links` | MISSING | Tabla no existe (§25) |
| Tabla/estructura de recurrencia | MISSING | No existe (§24.2) |
| RLS en todas las nuevas tablas | MISSING | — |

### Phase 3 — CreateGoal y post-create

| Ítem | Estado | Referencia |
|---|---|---|
| Ruta rápida (nombre, categoría, visibilidad) | REAL_NOW | `GoalForm.tsx:503-644` (Nombre, Categoria, Visibilidad visibles; Progreso/Fechas colapsados) |
| Defaults correctos | REAL_NOW | `planner.goals.service.js:43-51` (progress_mode default steps), `GoalForm.tsx:149-150` (category home, visibility household) |
| Más opciones colapsadas | REAL_NOW | `GoalForm.tsx:151-152` (progressOpen, datesOpen false por defecto) |
| Post-create `justCreated` state | MISSING | `GoalForm.tsx:429` navega a GoalDetail sin param `justCreated`; `navigation/types.ts:43` `GoalDetail: { goalId: string }` no incluye `justCreated` |
| Post-create prompt ("Agregar paso / Crear tarea / Ahora no") | MISSING | No existe; `GoalDetailScreen.tsx` abre directo al CRUD completo |
| Post-create acciones adaptadas al modo | MISSING | §7.4 define acciones por modo; no implementado |
| Quick Action global "Crear meta" | MISSING | `HomeTabNavigator.tsx:264-267` usa `QuickActionSheet` pero spec §5 exige "Crear meta" como tercera acción; no confirmado que la incluya |
| Sin barra falsa ni terminales durante prompt | MISSING | — |

### Phase 4 — Hitos completos

| Ítem | Estado | Referencia |
|---|---|---|
| Listar hitos | REAL_NOW | `planner.goals.service.js:521-537`, `GoalDetailScreen.tsx:481-533` |
| Crear hito | REAL_NOW | `planner.goals.service.js:539-574`, `GoalDetailScreen.tsx:188-204` |
| Toggle achieved | REAL_NOW | `planner.goals.service.js:616-623`, `GoalDetailScreen.tsx:206-220` |
| Editar título inline | MISSING | `GoalDetailScreen.tsx` no permite editar título del hito inline (solo create/delete) |
| Eliminar con soft delete | REAL_NOW | `planner.goals.service.js:648-683` |
| Eliminar hito logrado con confirmación "El progreso puede cambiar" | MISSING | `GoalDetailScreen.tsx:222-243` confirma pero sin copy de §9.5 |
| Composer inline (AddStep pattern) | PARTIAL | `GoalDetailScreen.tsx:455-478` usa input + botón; no es composer con Cancelar/Agregar, autofocus, submit-from-keyboard, trim, max 120, contador desde 100, "Listo" para cerrar (§9.2) |
| Reordenar (modo específico, drag handles temporales) | MISSING | No existe UI ni persistencia de reorder; `sort_order` existe en DB pero no se expone |
| Nota breve opcional del hito | MISSING | `note` no existe en DB ni UI |
| Fecha objetivo opcional del hito | MISSING | `target_date` no existe en DB ni UI |
| Tareas dentro de un hito | MISSING | `goal_milestone_id` no existe; no se puede asignar task a hito |
| Convertir hito en tarea | MISSING | No existe (§9.8) |
| Usar tarea como hito | MISSING | No existe (§9.9) |
| "Todas las tareas listas" → sugerir marcar paso | MISSING | No existe (§9.10) |
| Optimistic toggle + rollback + snackbar Deshacer | MISSING | `GoalDetailScreen.tsx:206-220` es await sin optimistic ni snackbar |
| Progreso steps derivado de hitos | MISSING | `planner.goals.service.js:108-111` devuelve `null` (TODO Phase 4) |

### Phase 5 — Tasks completas

| Ítem | Estado | Referencia |
|---|---|---|
| `planner_tasks.goal_id` FK existe | REAL_NOW | `202607080004_planner_goals.sql:115-116` |
| Validación goal_id en backend | REAL_NOW | `planner.tasks.service.js:172-200` |
| TaskForm selector de meta opcional | REAL_NOW | `TaskForm.tsx:598-632` |
| TaskForm oculta selector si falla | REAL_NOW | `TaskForm.tsx:263-265` |
| Badge de meta en TaskCard | REAL_NOW | `PlannerTasksScreen.tsx:230-236` |
| `goal_milestone_id` en tasks | MISSING | No existe en DB |
| Crear tarea desde GoalDetail ya vinculada | MISSING | `GoalDetailScreen.tsx` no tiene botón "Crear tarea"; hay que ir a TaskForm y elegir meta |
| Vincular tareas existentes (sheet selector) | MISSING | No existe selector de vinculación multi-select (§11) |
| Selección múltiple de tasks | MISSING | §11.2 exige selección múltiple; no existe |
| Mover task entre goals | MISSING | Solo `goal_id` en PATCH; no hay flujo de "cambiar meta" con limpieza de milestone (§10.5) |
| Mover task entre milestones | MISSING | `goal_milestone_id` no existe |
| Desvincular "Quitar de esta meta" | MISSING | No existe acción contextual (§11.5) |
| Desvincular "Quitar de este paso" | MISSING | No existe (§11.5) |
| Privacidad: task privada en goal familiar | MISSING | No hay validación de privacidad cruzada (§11.6) |
| Filtración: task no expande metadata de goal inaccesible | MISSING | No hay validación (§22.6) |
| Progreso tasks derivado de completadas/total | MISSING | `planner.goals.service.js:113-116` devuelve `null` (TODO Phase 5) |
| Query eficiente de tasks por goal_id | MISSING | `GoalDetailScreen.tsx:78-79` trae 100 tasks y filtra en frontend; spec §28 exige query backend |
| Prellenado goal_id/milestone_id + retorno GoalDetail | MISSING | `TaskForm.tsx` no recibe `goalId`/`milestoneId` por route params |
| Sugerencias contextuales (fecha objetivo meta, responsable) | MISSING | §10.4 no implementado |
| "Crear otra tarea" post-save | MISSING | §10.7 no implementado |
| Sección tasks con subsecciones (vencidas/hoy/próximas/sin fecha/verificación/terminadas) | MISSING | `GoalDetailScreen.tsx:536-571` lista plana de hasta 6 tasks |

### Phase 6 — Numeric e historial

| Ítem | Estado | Referencia |
|---|---|---|
| Progreso numeric calculado | REAL_NOW | `planner.goals.service.js:95-106` |
| PATCH current_value | REAL_NOW | `planner.goals.service.js:348-353` |
| Actualizar progreso manual en UI | REAL_NOW | `GoalDetailScreen.tsx:168-186` (input + "Actualizar") |
| Endpoint atómico POST /goals/:id/progress | MISSING | No existe en `planner.js:29-40` (§14.2) |
| Validar permisos en progress | MISSING | — |
| Delta positivo | MISSING | — |
| Idempotency key | MISSING | — |
| `planner_goal_progress_entries` | MISSING | Tabla no existe (§14.3) |
| Campos entry (delta, previous, resulting, note, source, reversed_at, etc.) | MISSING | — |
| Quick increments (+1/+5/+10, $1K/$5K/$10K, +5%/+10%/+25%) | MISSING | No existe UI (§14.4) |
| Recordar último incremento | MISSING | §14.4 |
| Formato ARS sin centavos | MISSING | §14.5 no implementado |
| Moneda configurable | MISSING | — |
| Superar target permitido | PARTIAL | Backend no bloquea; UI no muestra "Objetivo superado por X" (§14.6) |
| Corregir avance (valor absoluto, genera entry de corrección) | MISSING | §14.7 |
| Revertir movement (snackbar Deshacer + historial) | MISSING | §14.8 |
| Target inválido (null o 0) → "Falta definir objetivo" | MISSING | §14.9; UI actual permite sumar sin validación |
| Acción principal "Sumar avance" | MISSING | `GoalDetailScreen.tsx` usa input + "Actualizar", no "Sumar avance" (§14.1) |

### Phase 7 — Finalización completa

| Ítem | Estado | Referencia |
|---|---|---|
| Complete (POST /goals/:id/complete) | REAL_NOW | `planner.js:34`, `planner.goals.service.js:443-471` |
| Fail (POST /goals/:id/fail) | REAL_NOW | `planner.js:35`, `planner.goals.service.js:473-501` |
| Complete abre read-only | MISSING | `GoalDetailScreen.tsx` no abre en modo read-only cuando completed/failed (§17.1) |
| Delete (soft) | REAL_NOW | `planner.js:33`, `planner.goals.service.js:411-431` |
| Delete limpia goal_id de tasks (FK set null) | REAL_NOW | `202607080004_planner_goals.sql:116` (`on delete set null`) |
| Snackbar "Meta lograda · Deshacer" | MISSING | `GoalDetailScreen.tsx:100-120` usa Alert.alert sin undo (§15) |
| Reopen (endpoint + UI) | MISSING | No existe; `GOAL_STATUS_TRANSITIONS` en `planner.constants.js:51-55` tiene `completed: []`, `failed: []` (§17.2) |
| Duplicate (con opciones) | MISSING | No existe endpoint ni UI (§17.3) |
| Archive (archived_at) | MISSING | No existe campo ni endpoint ni UI (§17.4) |
| Unarchive | MISSING | — |
| Completed/failed permiten ver, navegar, duplicar, reabrir, archivar, eliminar, exportar | MISSING | `GoalDetailScreen.tsx:426-447` solo muestra acciones cuando `active`; cuando completed/failed no muestra nada salvo delete (§17.1) |
| Export (PDF/CSV/JSON) | MISSING | §18.20 |

### Phase 8 — Colaboración

| Ítem | Estado | Referencia |
|---|---|---|
| Roles por meta (owner/editor/participant/viewer) | MISSING | No existe tabla ni lógica (§22.1) |
| Matriz de permisos (§22.2) | MISSING | — |
| `planner_goal_participants` | MISSING | Tabla no existe |
| Participant management endpoints | MISSING | — |
| Role authorization en endpoints | MISSING | Backend solo valida household membership + visibility; no roles por meta |
| Coordinador no ve personales automáticamente | REAL_NOW | RLS: personal solo `created_by_member_id = current_household_member_id` (`202607080005:16-17`) |
| Comentarios | MISSING | `planner_goal_comments` no existe (§23.2) |
| Notas (principal, adicionales, hito, entry) | MISSING | `planner_goal_notes` no existe (§23.1) |
| Activity log con eventos mínimos | MISSING | `planner_goal_activity` no existe (§23.3) |
| Personal compartible selectivamente | MISSING | §22.3; no hay mecanismo |
| Transferencia de ownership | MISSING | §22.5; no existe |
| Meta colaborativa sin owner válido | MISSING | §22.5; no hay validación |

### Phase 9 — PlannerGoalsScreen y summary

| Ítem | Estado | Referencia |
|---|---|---|
| Lista de metas | REAL_NOW | `PlannerGoalsScreen.tsx` |
| Filtros Activas / Finalizadas | PARTIAL | `PlannerGoalsScreen.tsx:40-45` usa `all|active|completed|failed`; spec §19.1 usa tabs `Activas / Finalizadas` |
| Búsqueda por texto | MISSING | `PlannerGoalsScreen.tsx` no tiene search (§19.1) |
| Botón `+` | REAL_NOW | `PlannerGoalsScreen.tsx:261-269` (botón "Nueva") |
| "Para continuar" (max 1 card) | MISSING | No existe algoritmo de §19.2 (meta fijada, task vencida, task hoy, hito con fecha, etc.) |
| Sin botones internos permanentes en card | CONFLICT | `PlannerGoalsScreen.tsx:63-157` mostraba onDelete pero actualmente solo onPress; spec §19.3 "sin botones internos permanentes" |
| Card minimal (título, una línea, barra solo si real, fecha/privacidad) | CONFLICT | `PlannerGoalsScreen.tsx:118-156` muestra barra + porcentaje + `current/target` + 3 chips siempre (§19.3 exige minimal) |
| Filtros sheet (personales, familiares, compartidas, categoría, modo, participantes, prioridad, con/sin fecha, fijadas, archivadas) | MISSING | Solo 3 tiras (status, visibility, category); no hay sheet (§19.4) |
| Subfiltros finalizadas (Todas/Logradas/Cerradas/Archivadas) | MISSING | §19.5 |
| Orden finalizadas por fecha terminal desc | MISSING | `PlannerGoalsScreen.tsx:238-250` ordena por `ends_at`; no por `completed_at`/`failed_at` |
| Pin por usuario | MISSING | `planner_goal_user_preferences` no existe (§18.12) |
| Summary backend determinístico | MISSING | No existe endpoint de summary; Home consume `listGoals` directo (`HomePlannerSections.tsx:226`) |
| Filtros colapsados en un solo control | CONFLICT | `PlannerGoalsScreen.tsx:272-350` muestra 3 `ScrollView` horizontales de filtros visibles a la vez (§16 ter) |

### Phase 10 — Home

| Ítem | Estado | Referencia |
|---|---|---|
| Una card máxima de Goals | REAL_NOW | `HomePlannerSections.tsx:317-377` muestra 1 card |
| No mostrar si no hay metas reales | REAL_NOW | `HomePlannerSections.tsx:317` condiciona `goals.length > 0` |
| No 0% falso | CONFLICT | `HomePlannerSections.tsx:339` usa `highlight.progress_percentage ?? 0` → muestra 0% si null (§20) |
| Pin por usuario | MISSING | No existe; spec §20 exige mismo summary que PlannerGoalsScreen |
| Selección compartida (mismo algoritmo) | MISSING | `HomePlannerSections.tsx:320-335` usa lógica local distinta a spec §20 |
| Personal solo visible al propietario/autorizado | PARTIAL | RLS protege; pero Home carga `listGoals` sin validar si la card debe ocultarse según viewer |
| None: aparece si fijada o señal real | MISSING | No hay lógica de pin; None no tiene señal beyond fecha |
| Home nunca muta Goals | REAL_NOW | `HomePlannerSections.tsx` solo navega, no muta |

### Phase 11 — Recordatorios y continuidad

| Ítem | Estado | Referencia |
|---|---|---|
| `planner_goal_reminders` | MISSING | Tabla no existe |
| Tipos de reminder (fecha inicio, días antes, personalizado, siguiente paso, task vinculada, resumen semanal, check-in) | MISSING | §21.2 |
| Canales (push, email, in-app) | MISSING | Infra no existe |
| Estados claros de configuración | MISSING | §18.15 |
| `starts_at` label "Empieza" opcional | PARTIAL | DB existe; `GoalDetailScreen.tsx:362-364` muestra "Inicio:" pero no maneja fecha pasada |
| `ends_at` label "Fecha objetivo" | PARTIAL | DB existe; `GoalDetailScreen.tsx:367-369` muestra "Fin:" no "Fecha objetivo" |
| Fecha pasada: "La fecha objetivo fue el [fecha]" | MISSING | §21.1; no cambia status (correcto) pero no muestra copy |
| Riesgo determinístico (fecha cercana + progreso real + tasks vencidas) | PARTIAL | `HomePlannerSections.tsx:320-325` calcula riesgo en frontend pero usa `?? 0` (progreso falso) |
| Riesgo explicable sin puntajes ocultos | MISSING | No mostrar "La fecha objetivo está cerca y quedan N tareas" (§21.3) |

### Phase 12 — Plantillas y recurrencia

| Ítem | Estado | Referencia |
|---|---|---|
| `planner_goal_templates` | MISSING | Tabla no existe |
| `planner_goal_template_milestones` | MISSING | — |
| `planner_goal_template_tasks` | MISSING | — |
| Fuentes (HomePlus, household, personales) | MISSING | §24.1 |
| Vista previa antes de crear | MISSING | §24.1 |
| Recurrencia (semanal/mensual/anual/personalizada) | MISSING | §24.2 |
| `recurrence_rule` en planner_goals | MISSING | Campo no existe |
| Recurrencia crea nueva instancia | MISSING | §24.2 |
| No resetea meta anterior | MISSING | — |

### Phase 13 — Evidencia

| Ítem | Estado | Referencia |
|---|---|---|
| `planner_goal_file_links` | MISSING | Tabla no existe |
| Adjuntar a goal/milestone/comentario/progress entry | MISSING | §25 |
| Permisos heredan de Goal | MISSING | — |
| Home no muestra archivos | REAL_NOW | `HomePlannerSections.tsx` no muestra archivos |
| No exponer archivos de personal en Activity familiar | MISSING | Activity no existe |
| Integración Documents/Storage | MISSING | §26.5 |

### Phase 14 — Integraciones

| Ítem | Estado | Referencia |
|---|---|---|
| Tasks integration | REAL_NOW | `goal_id` existe; resto en Phase 5 |
| Calendar opcional (start, target, reminders, hitos fechados) | MISSING | §26.2; Events no tienen `goal_id` |
| No convertir Goals en Events automáticamente | REAL_NOW | No existe conversión (correcto) |
| Finance/Fund vinculado | MISSING | §26.3; Finance no implementado |
| Inventory → Task → Goal | MISSING | §26.4; `origin_module` existe en tasks pero cadena completa futura |
| Assets/Medication | MISSING | §26.4 |
| Documents (evidencia) | MISSING | §26.5 |
| Feed celebra completed, nunca failed | MISSING | §26.6; Feed no implementado |
| Geni real (no simular) | CONFLICT | `HomePlannerSections.tsx:95-100` muestra "Geni · resumen del hogar" y "Chatear con Geni" sin Geni real (§26.7; red-line "no prometer Geni") |

### Phase 15 — QA integral

| Ítem | Estado | Referencia |
|---|---|---|
| Seguridad (permisos, RLS) | PARTIAL | RLS básica existe; roles por meta faltan |
| Concurrencia (dos toggles, dos deltas) | MISSING | No hay `version`/concurrencia optimista (§31) |
| Offline / retry / conflictos al reconectar | MISSING | No hay cola offline (§31) |
| Multi-hogar aislado | REAL_NOW | RLS filtra por `household_id`; contexto server-side |
| Deep link sin acceso | MISSING | No validación (§31) |
| Accesibilidad (targets táctiles, no solo color) | PARTIAL | Chips usan color + texto; targets >= 36px |
| Performance query tasks por goal | MISSING | Frontend filtra 100 tasks (§28) |
| Regresión | MISSING | No hay suite de tests automatizada para Goals |

---

## 5. Cambios DB requeridos

### Columnas nuevas en `planner_goals`

| Campo | Tipo | Notas |
|---|---|---|
| `owner_member_id` | uuid not null references household_members(id) | §18.13; distinto de `created_by_member_id` |
| `responsible_member_id` | uuid null references household_members(id) | §18.13 |
| `priority` | text not null default 'normal' check in('low','normal','high') | §18.11; NO usar 'critical' |
| `archived_at` | timestamptz null | §17.4 |
| `archived_by_member_id` | uuid null references household_members(id) | §17.4 |
| `reopened_at` | timestamptz null | §17.2 |
| `reopen_count` | integer not null default 0 | §17.2 |
| `recurrence_rule` | jsonb null | §24.2 |
| `template_id` | uuid null references planner_goal_templates(id) | §24 |
| `qualitative_status` | text null | §16 |
| `version` | integer not null default 1 | §29 concurrencia optimista |

### Columnas nuevas en `planner_goal_milestones`

| Campo | Tipo | Notas |
|---|---|---|
| `note` | text null | §9.1 |
| `target_date` | date null | §9.1 |
| `version` | integer not null default 1 | §29 |

### Columna nueva en `planner_tasks`

| Campo | Tipo | Notas |
|---|---|---|
| `goal_milestone_id` | uuid null references planner_goal_milestones(id) on delete set null | §18.1 |

**Constraint requerida:** `goal_milestone_id` solo puede referenciar un hito cuyo `goal_id` sea igual al `goal_id` de la task. Implementar via trigger o CHECK con función.

### Nuevas tablas (11 + recurrencia)

1. `planner_goal_participants` — `id, goal_id, member_id, role('owner'|'editor'|'participant'|'viewer'), created_at, updated_at`
2. `planner_goal_comments` — `id, goal_id, member_id, body, edited_at, deleted_at, created_at, updated_at`
3. `planner_goal_notes` — `id, goal_id, milestone_id null, progress_entry_id null, body, created_by_member_id, created_at, updated_at`
4. `planner_goal_activity` — `id, goal_id, event_type, metadata jsonb, member_id, created_at`
5. `planner_goal_progress_entries` — `id, goal_id, delta, previous_value, resulting_value, note, source, created_by_member_id, created_at, reversed_at, reversed_by_member_id, reversal_reason`
6. `planner_goal_reminders` — `id, goal_id, type, config jsonb, active, created_by_member_id, created_at, updated_at`
7. `planner_goal_user_preferences` — `id, goal_id, member_id, pinned boolean default false, created_at, updated_at` (unique goal_id+member_id)
8. `planner_goal_templates` — `id, household_id null, owner_member_id null, scope('homeplus'|'household'|'personal'), title, category, progress_mode, recurrence_rule jsonb, created_at, updated_at`
9. `planner_goal_template_milestones` — `id, template_id, title, sort_order`
10. `planner_goal_template_tasks` — `id, template_id, title, sort_order`
11. `planner_goal_file_links` — `id, goal_id, milestone_id null, comment_id null, progress_entry_id null, file_ref, created_by_member_id, created_at`

**Recurrencia:** si no se resuelve con `recurrence_rule` jsonb en `planner_goals`, agregar tabla dedicada.

**Todas con RLS.**

---

## 6. Backend endpoints/services requeridos

### Endpoints faltantes

| Endpoint | Phase | Notas |
|---|---|---|
| `POST /api/planner/goals/:id/progress` | 6 | Atómico, delta positivo, idempotency key, devuelve goal+entry |
| `POST /api/planner/goals/:id/reopen` | 7 | Transición completed/failed → active, setea reopened_at, reopen_count++ |
| `POST /api/planner/goals/:id/duplicate` | 7 | Crea nueva active; opciones de copia |
| `POST /api/planner/goals/:id/archive` | 7 | Set archived_at |
| `POST /api/planner/goals/:id/unarchive` | 7 | Limpia archived_at |
| `GET /api/planner/goals/:id/participants` | 8 | Lista |
| `POST /api/planner/goals/:id/participants` | 8 | Agregar |
| `PATCH /api/planner/goals/:id/participants/:memberId` | 8 | Cambiar rol |
| `DELETE /api/planner/goals/:id/participants/:memberId` | 8 | Quitar |
| `GET /api/planner/goals/:id/comments` | 8 | Lista |
| `POST /api/planner/goals/:id/comments` | 8 | Crear |
| `PATCH /api/planner/goals/:id/comments/:commentId` | 8 | Editar |
| `DELETE /api/planner/goals/:id/comments/:commentId` | 8 | Eliminar |
| `GET /api/planner/goals/:id/notes` | 8 | Lista |
| `POST /api/planner/goals/:id/notes` | 8 | Crear |
| `PATCH /api/planner/goals/:id/notes/:noteId` | 8 | Editar |
| `DELETE /api/planner/goals/:id/notes/:noteId` | 8 | Eliminar |
| `GET /api/planner/goals/:id/activity` | 8 | Log |
| `GET /api/planner/goals/:id/reminders` | 11 | Lista |
| `POST /api/planner/goals/:id/reminders` | 11 | Crear |
| `PATCH /api/planner/goals/:id/reminders/:reminderId` | 11 | Editar |
| `DELETE /api/planner/goals/:id/reminders/:reminderId` | 11 | Eliminar |
| `POST /api/planner/goals/:id/pin` | 9 | Pin por usuario |
| `DELETE /api/planner/goals/:id/pin` | 9 | Unpin |
| `GET /api/planner/goals/summary` | 9 | Summary determinístico para Planner + Home |
| `POST /api/planner/goals/:id/tasks/link` | 5 | Batch link múltiples tasks |
| `POST /api/planner/goals/:id/tasks/unlink` | 5 | Batch unlink |
| `POST /api/planner/goals/:id/tasks/move` | 5 | Mover task a otro goal/milestone |
| `GET /api/planner/goal-templates` | 12 | Listar templates |
| `POST /api/planner/goal-templates` | 12 | Crear |
| `POST /api/planner/goals/:id/recurrence` | 12 | Generar nueva instancia |
| `GET /api/planner/goals/:id/files` | 13 | Listar |
| `POST /api/planner/goals/:id/files` | 13 | Adjuntar |
| `DELETE /api/planner/goals/:id/files/:fileId` | 13 | Quitar |

### Services requeridos

- `planner.goals.progress.service.js` — progress atómico + entries + reversal.
- `planner.goals.participants.service.js` — roles + permisos.
- `planner.goals.comments.service.js`
- `planner.goals.notes.service.js`
- `planner.goals.activity.service.js` — registrar eventos mínimos de §23.3.
- `planner.goals.reminders.service.js`
- `planner.goals.summary.service.js` — algoritmo determinístico de §19.2/§20.
- `planner.goals.templates.service.js`
- `planner.goals.files.service.js`

### Cambios en services existentes

- `calculateProgress` (`planner.goals.service.js:108-116`): implementar derivación steps (hitos logrados/total) y tasks (computables completadas/total).
- `GOAL_STATUS_TRANSITIONS` (`planner.constants.js:51-55`): agregar `reopen` desde completed/failed.
- `validateGoalId` (`planner.tasks.service.js:172-200`): extender para validar `goal_milestone_id` pertenece al goal.
- Goals list: filtro por `archived` y `pinned`.
- Goals list: query params para búsqueda texto y filtros de §19.4.

---

## 7. Componentes/screens frontend requeridos

### Componentes modulares (§27) — todos MISSING

1. `GoalCard` — card minimal para lista (reemplaza inline en `PlannerGoalsScreen.tsx:63-157`).
2. `GoalContinueCard` — card "Para continuar" (§19.2).
3. `GoalDetailHeader` — shell común (back, título, metadata, menú •••).
4. `GoalPostCreatePrompt` — prompt post-create con acciones por modo (§7.4).
5. `GoalStepsSection` — hitos con composer, toggle, reorder.
6. `GoalTasksSection` — tasks vinculadas con crear/vincular/secciones.
7. `GoalNumericSection` — sumar avance, quick increments, historial.
8. `GoalBooleanSection` — marcar como lograda, sin barra.
9. `GoalQualitativeSection` — modo none, sin barra.
10. `GoalMilestoneRow` — row de hito con toggle inline.
11. `GoalMilestoneComposer` — composer inline con Autofocus, Cancelar/Agregar, max 120, contador (§9.2).
12. `GoalTaskPicker` — sheet selector multi-select para vincular (§11.2).
13. `GoalTaskContext` — contexto de task dentro de goal/milestone.
14. `GoalProgressSheet` — sheet para sumar avance numeric.
15. `GoalProgressHistory` — historial de entries con revert.
16. `GoalParticipantsSection` — lista + agregar + roles.
17. `GoalCommentsSection` — comentarios.
18. `GoalActivitySection` — activity log.
19. `GoalFilesSection` — evidencia.
20. `GoalRemindersSection` — recordatorios.
21. `GoalAdminMenu` — menú ••• con reopen/duplicate/archive/delete/export.
22. `GoalFiltersSheet` — sheet de filtros (§19.4).

### Screens nuevas — MISSING

- `GoalParticipantsScreen`
- `GoalActivityScreen`
- `GoalFilesScreen`
- `GoalRemindersScreen`
- `GoalTemplatesScreen`

### Modificaciones requeridas en existentes

| Archivo | Cambio | Phase |
|---|---|---|
| `PlannerGoalsScreen.tsx` | Eliminar `?? 0` (line 72), eliminar `current/target ?? '?'` (line 150), tabs Activas/Finalizadas (§19.1), search, filtros sheet, card minimal, "Para continuar" | 1, 9 |
| `GoalDetailScreen.tsx` | Refactor modular, eliminar `?? 0` (line 246), eliminar "Actual: 0 / Objetivo: ?" (line 397), shell con menú •••, acciones por modo, read-only cuando finalizada, post-create prompt | 1, 7 |
| `GoalForm.tsx` | Pasar `justCreated` post-create; simplificar más secciones | 3 |
| `TaskForm.tsx` | Recibir `goalId`/`milestoneId` por route params; prellenado contextual; "Crear otra" post-save | 5 |
| `plannerShared.ts` | Sin barra cuando progress null; labels "Fecha objetivo" en vez de "Fin"; "Empieza" en vez de "Inicio" | 1, 11 |
| `HomePlannerSections.tsx` | Eliminar "Geni · resumen del hogar" y "Chatear con Geni" (lines 95-100); eliminar `?? 0` (line 339); usar summary backend | 10, 14 |
| `navigation/types.ts` | Agregar params: `justCreated`, `milestoneId`, `fromGoal`, rutas nuevas | 3, 4, 5, 8, 11, 12, 13 |
| `navigation/HomeTabNavigator.tsx` | Registrar screens nuevas | — |

---

## 8. Navigation params requeridos

### `PlannerStackParamList` actual (`navigation/types.ts:30-44`)

```typescript
GoalDetail: { goalId: string };
CreateGoal: undefined;
EditGoal: { goalId: string };
```

### Params requeridos por la spec FINAL

```typescript
GoalDetail: { goalId: string; justCreated?: boolean; milestoneId?: string };
CreateGoal: { fromQuickAction?: boolean } | undefined;
EditGoal: { goalId: string };
GoalParticipants: { goalId: string };
GoalActivity: { goalId: string };
GoalFiles: { goalId: string };
GoalReminders: { goalId: string };
GoalTemplates: undefined | { householdId?: string };
// TaskForm contextual
CreateTask: { goalId?: string; milestoneId?: string; fromGoal?: boolean } | undefined;
EditTask: { taskId: string; goalId?: string; milestoneId?: string };
```

- `justCreated` (Phase 3): activa el `GoalPostCreatePrompt` en `GoalDetail`.
- `goalId`/`milestoneId` en CreateTask (Phase 5): preasigna meta y paso, oculta selector.
- `fromGoal` (Phase 5): asegura retorno a `GoalDetail` post-save.

---

## 9. RLS / privacidad riesgos

### Riesgos existentes

| Riesgo | Estado | Referencia |
|---|---|---|
| Personal visible solo al creador | REAL_NOW | RLS correcta en `202607080005:14-17` |
| Coordinador no ve personales por defecto | REAL_NOW | RLS no da acceso por rol |
| Household meta editable por cualquier miembro activo | PARTIAL | `can_update_planner_goal` permite update a cualquier miembro activo; spec §22.2 exige roles por meta | 
| DELETE no tiene RLS policy | PARTIAL | Soft delete via UPDATE está cubierto; pero si se agregara hard DELETE, no hay policy |
| Milestones sin DELETE policy | MISSING | `202607080004:252-272` solo tiene SELECT/INSERT/UPDATE para milestones; DELETE soft via UPDATE cubierto, pero no hard DELETE |

### Riesgos nuevos a cubrir

| Riesgo | Phase |
|---|---|
| Roles por meta (owner/editor/participant/viewer) en todas las operaciones | 2, 8 |
| Participants deben tener acceso a la meta pero no a metas personales de otros | 8 |
| Task privada en goal familiar: no permitir o advertir | 5 (§11.6) |
| Task no expande metadata de goal inaccesible | 5 (§22.6); afecta TaskCard badge |
| Activity log respeta privacidad (no filtra metas personales) | 8 |
| Archivos de meta personal no aparecen en Activity familiar | 13 |
| Deep link a goal sin acceso → 403/404 clean | 15 |
| Owner abandona household: transferir/convertir/cerrar | 8 (§22.5) |
| Multi-hogar: goals solo del household activo | REAL_NOW via contexto, pero debe validarse en nuevos endpoints |
| Concurrencia: `version` para optimistic locking en todos los updates | 2, 15 |

---

## 10. Edge cases no cubiertos (spec §31)

| Edge case | Estado | Notas |
|---|---|---|
| Borrar Goal con Tasks | REAL_NOW | FK set null; tasks sobreviven |
| Borrar Goal con milestones | REAL_NOW | FK cascade en milestones (`202607080004:82` on delete cascade); milestones se borran físicamente — **conflict con §17.5 que exige preservar para auditoría** |
| Borrar milestone con Tasks | MISSING | `goal_milestone_id` no existe; cuando exista, borrar milestone debe hacer set null en tasks |
| Mover Task entre Goals | MISSING | No hay flujo |
| Mover Task entre milestones | MISSING | `goal_milestone_id` no existe |
| Task privada en Goal familiar | MISSING | No hay validación |
| Goal personal con Task compartida | MISSING | No hay validación |
| Owner abandona household | MISSING | No hay transferencia |
| Último owner | MISSING | — |
| Participante suspendido | MISSING | — |
| Permisos revocados con pantalla abierta | MISSING | — |
| Active household cambia | PARTIAL | Contexto server-side; but no hay re-validación en sesión activa |
| Multi-hogar | REAL_NOW | RLS aísla por household_id |
| Deep link sin acceso | MISSING | — |
| Dos toggles simultáneos | MISSING | No hay optimistic locking |
| Dos progress deltas simultáneos | MISSING | No hay endpoint atómico ni idempotency |
| Duplicación de requests | MISSING | — |
| Cambio de modo con datos | PARTIAL | Backend valida compatibilidad target_type; no hay migración de datos al cambiar mode |
| Cambio de moneda | MISSING | No hay moneda configurable |
| Target superado | PARTIAL | Backend permite; UI no muestra "superado por X" |
| Target reducido debajo del current | MISSING | No hay validación |
| Reopen | MISSING | No existe |
| Archive | MISSING | No existe |
| Duplicate | MISSING | No existe |
| Recurrence | MISSING | No existe |
| Template con campos incompatibles | MISSING | — |
| Archivos inaccesibles | MISSING | — |
| Comments eliminados | MISSING | Comments no existen |
| Offline | MISSING | No hay cola offline |
| Retry | PARTIAL | Error states con retry; no hay retry de mutaciones |
| Conflictos al reconectar | MISSING | — |
| Timezone | MISSING | Fechas son `date` (sin zona); spec §31 exige manejo |
| Fecha sin hora | PARTIAL | DB usa `date`; UI usa presets |
| Task recurring vinculada | MISSING | Tasks no tienen recurrencia |
| Verification rejected | MISSING | Solo verify positivo; no hay reject |
| Meta personal compartida selectivamente | MISSING | — |

**Conflicto crítico detectado:** `planner_goal_milestones` usa `on delete cascade` (`202607080004_planner_goals.sql:82`) pero spec §17.5 exige que al borrar una Goal, "Hitos, comentarios, recordatorios y relaciones: quedan inaccesibles; se preservan para integridad/auditoría." El cascade borra físicamente los milestones. Si se requiere preservar, cambiar a soft-delete + filtrado.

---

## 11. Orden de implementación recomendado (reorganizado 10/07/2026)

La prioridad se reorganiza en tiers (T1-T4). El orden legacy de fases 1-15 sigue siendo válido como mapa de largo plazo, pero la prioridad inmediata cambia.

### T1 — Goals Tasks Core (PRIORIDAD INMEDIATA)

```
Phase 0 (este audit) ✅
  │
  ├─► T1 Goals Tasks Core
  │     - Fix null ≠ 0 (CONFLICT crítico) en PlannerGoalsScreen, GoalDetail, Home
  │     - Eliminar "Geni" de Home (CONFLICT red-line)
  │     - calculateProgress para tasks (backend): reglas precisas de §13 FINAL spec
  │     - GET /api/planner/tasks?goal_id=X (query eficiente)
  │     - TaskForm contextual desde GoalDetail (goal_id preasignado)
  │     - Retorno a GoalDetail post-save, refresh tareas + progreso
  │     - GoalDetail muestra tareas vinculadas con progreso real
  │     - goal_milestone_id en planner_tasks (DB)
  │     - NO requiere 11 tablas nuevas de Phase 2
```

### T2 — Templates / Presets (DESPUÉS de T1 estable)

```
  │
  ├─► T2 Templates
  │     - planner_goal_templates + _milestones + _tasks (DB)
  │     - Seed de 8 presets iniciales
  │     - POST /api/planner/goals/from-template
  │     - Template Picker + Preview + confirmación
  │     - Sin recurrencia, sin streaks, sin auto-asignación
```

### T3 — Streaks product spec (SOLO DOCUMENTAR)

```
  │
  ├─► T3 Streaks spec
  │     - Documentar reglas de rachas por oportunidad programada
  │     - Copys sin culpa
  │     - DB conceptual (streaks + streak_events)
  │     - No implementar código
```

### T4 — Streaks implementation (DESPUÉS de T3)

```
  │
  ├─► T4 Streaks implementation
  │     - streaks + streak_events (DB)
  │     - StreakService, endpoints, cron
  │     - Badges en TaskCard, GoalDetail, Profile, Home opcional
```

### Fases legacy (referencia para después de T1)

Las fases 1-15 del orden original se retoman después de T1. El orden legacy completo:

```
Phase 0 ✅ → T1 → T2 → T3 → T4 → Phase 2 → Phase 3 → Phase 4 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 13 → Phase 14 → Phase 15
```

**Cambios respecto al orden original:**
- Phase 1 (visual truth) se absorbe parcialmente en T1 (fix null≠0, eliminar Geni).
- Phase 5 (tasks completas) se absorbe en T1 (crear desde GoalDetail, progreso tasks).
- Phase 12 (templates) se mueve a T2.
- Las fases de streaks (nuevas) se insertan como T3/T4.
- Phase 2 (modelo estructural con 11 tablas) se pospone después de T1-T4.

**Prioridad inmediata post-audit (actualizada):**
1. **T1 Backend**: `calculateProgress` para tasks con reglas precisas (§13 FINAL spec).
2. **T1 Backend**: `GET /api/planner/tasks?goal_id=X` eficiente.
3. **T1 Frontend**: TaskForm contextual desde GoalDetail.
4. **T1 Frontend**: Fix de `0%` falso en todas las pantallas.
5. **T1 Frontend**: Eliminar "Geni" de Home.

---

## 12. Apéndice: git status + files changed

### Estado antes de este reporte

Branch: `integrate/inventario-planner-20260708-1634`

Archivos modified (preexistentes):
```
 M backend/src/constants/planner.constants.js
 M backend/src/controllers/planner.goals.controller.js
 M backend/src/services/planner.goals.service.js
 M backend/src/services/planner.tasks.service.js
 M front/mi-front-limpio/context/AuthContext.tsx
 M front/mi-front-limpio/navigation/HomeTabNavigator.tsx
 M front/mi-front-limpio/navigation/types.ts
 M front/mi-front-limpio/screens/home/HomePlannerSections.tsx
 M front/mi-front-limpio/screens/planner/PlannerScreen.tsx
 M front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx
 M front/mi-front-limpio/screens/planner/TaskForm.tsx
 M front/mi-front-limpio/screens/planner/plannerShared.ts
 M front/mi-front-limpio/services/api.ts
 M front/mi-front-limpio/services/plannerGoals.ts
 M front/mi-front-limpio/services/plannerTasks.ts
 M front/mi-front-limpio/supabase/index.ts
```

Untracked (preexistentes):
```
?? front/mi-front-limpio/screens/planner/CreateGoalScreen.tsx
?? front/mi-front-limpio/screens/planner/EditGoalScreen.tsx
?? front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx
?? front/mi-front-limpio/screens/planner/GoalForm.tsx
?? front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx
?? supabase/migrations/202607080005_fix_planner_goals_insert_rls.sql
?? supabase/migrations/202607100001_add_progress_mode_to_goals.sql
```

### Archivo creado por este reporte (Phase 0)

```
?? docs/implementation/planner_goals_final_gap_audit.md  (este archivo)
```

### No se modificó

- Ningún archivo de backend.
- Ningún archivo de frontend.
- Ningún archivo de migraciones.
- Ningún archivo de Auth, Household, Inventory, Calendar/Events.
- No se commit.

---

## 13. Resumen de clasificaciones

| Clasificación | Cantidad aprox. de ítems |
|---|---|
| REAL_NOW | ~35 |
| PARTIAL | ~15 |
| MISSING | ~110 |
| CONFLICT | ~10 |
| FUTURE | ~15 (integraciones que requieren otros módulos) |

**Conclusión:** El backend de Goals funciona técnicamente (DB, API, RLS básica, progress_mode, milestones, complete/fail), pero la UX visible no es la final. Los CONFLICT más urgentes son el `0%` falso y el "Geni" en Home. El grueso del trabajo son las Phases 2–8 (modelo estructural, hitos completos, tasks completas, numeric + historial, finalización, colaboración), que requieren migraciones, ~30 endpoints nuevos, 20+ componentes modulares y 5 screens nuevas.
