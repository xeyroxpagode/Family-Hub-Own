# Planner Total Progress Audit

**Branch:** `integrate/inventario-planner-20260708-1634`
**Fecha de creación:** 2026-07-10
**Tipo:** documentation-only. No se modificó código, DB ni migraciones en esta tarea.
**Alcance:** Auditoría total de progreso real de Planner (Tareas + Calendario/Eventos + Metas/Goals + Quick Actions + Home integration + Backend/API + DB/RLS + Frontend/UX).
**Hermana:** `docs/implementation/planner_goals_final_gap_audit.md` (Goals-only, actualizada con el progreso real nuevo de Goals en su sección superior).

Categorías de estado:
- ✅ Hecho y validado (con evidencia en código + flujo)
- 🟡 Parcial (algunos flujos funcionan, otros no)
- 🔴 Roto (no funciona o falla en el flujo core)
- ⚪ Documentado pero no implementado
- 🔵 Futuro / fuera de MVP

---

## Update — Planner Total Progress Audit — 2026-07-10

Esta es la primera versión de la auditoría total. Se crea porque la auditoría existente (`planner_goals_final_gap_audit.md`) es solo de Goals y no debe convertirse en auditoría total. Aquí se consolida el estado real de todo Planner.

### Cambios contra el estado del repositorio al momento de auditar

`git status --short` (antes de esta tarea, sin contar este doc):
```
 M backend/src/services/planner.goals.service.js   (calculateProgress steps + tasks implementado)
 M backend/src/services/planner.tasks.service.js   (goal_id filter en GET /tasks)
 M front/mi-front-limpio/components/ui/CenterTabButton.tsx
 M front/mi-front-limpio/navigation/HomeTabNavigator.tsx
 M front/mi-front-limpio/navigation/types.ts        (CreateTask: goalId/fromGoal/returnToGoalId)
 M front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx  (T1 implementado)
 M front/mi-front-limpio/screens/planner/TaskForm.tsx          (goal_id contextual)
 M front/mi-front-limpio/services/plannerTasks.ts  (filters.goal_id)
?? .idea/
```

Estos cambios son preexistentes del trabajo T1 (Goals Tasks Core). **Esta auditoría no los tocó.** Solo crea este archivo y actualiza la sección superior de `planner_goals_final_gap_audit.md`.

### Archivos leídos para esta auditoría

Documentación:
- `docs/implementation/planner_goals_final_gap_audit.md` (852 líneas, Goals-only, refiere `calculateProgress` steps/tasks como TODO `null` — **DESACTUALIZADO**)
- `docs/implementation/planner_goals_source_map.md` (239 líneas, ya documenta la refresh del 10/07/2026)
- `docs/professionalization/00_current_state_deep_audit.md` (existente)

Backend:
- `backend/src/routes/planner.js` (42 líneas)
- `backend/src/controllers/planner.goals.controller.js` (172 líneas)
- `backend/src/controllers/planner.calendar.controller.js` (23 líneas)
- `backend/src/controllers/planner.summary.controller.js` (23 líneas)
- `backend/src/services/planner.tasks.service.js` (629 líneas)
- `backend/src/services/planner.events.service.js` (329 líneas)
- `backend/src/services/planner.goals.service.js` (741 líneas)
- `backend/src/services/planner.calendar.service.js` (268 líneas)
- `backend/src/services/planner.summary.service.js` (66 líneas)
- `backend/src/services/planner.context.service.js` (73 líneas)
- `backend/src/constants/planner.constants.js` (108 líneas)

DB/Supabase:
- `supabase/migrations/202606230001_planner_mvp.sql` (213 líneas)
- `supabase/migrations/202607080004_planner_goals.sql` (272 líneas)
- `supabase/migrations/202607100001_add_progress_mode_to_goals.sql` (27 líneas)

Frontend:
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` (287 líneas)
- `front/mi-front-limpio/navigation/types.ts` (52 líneas)
- `front/mi-front-limpio/components/ui/QuickActionSheet.tsx` (251 líneas)
- `front/mi-front-limpio/components/ui/CenterTabButton.tsx` (85 líneas)
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` (316 líneas)
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` (742 líneas, inspección parcial)
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx` (425 líneas, inspección parcial)
- `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` (689 líneas)
- `front/mi-front-limpio/screens/planner/GoalForm.tsx` (1061 líneas)
- `front/mi-front-limpio/screens/planner/TaskForm.tsx` (1212 líneas)
- `front/mi-front-limpio/screens/planner/EventForm.tsx` (612 líneas, inspección parcial)
- `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx` (410 líneas)
- `front/mi-front-limpio/screens/planner/plannerShared.ts` (1475 líneas)
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` (528 líneas)
- `front/mi-front-limpio/services/plannerTasks.ts` (142 líneas)
- `front/mi-front-limpio/services/plannerGoals.ts` (231 líneas)
- `front/mi-front-limpio/services/plannerEvents.ts` (106 líneas)
- `front/mi-front-limpio/services/plannerSummary.ts` (19 líneas)
- `front/mi-front-limpio/services/plannerTemplates.ts` (45 líneas, estática de Task templates, NO Goal templates)

---

## #1. Resumen ejecutivo

| Área | Estado | Comentario |
|---|---|---|
| Tareas | ✅ | CRUD completo + verify + cancel + filtros. Visualmente cargado. Goal linking funciona. |
| Calendario/Eventos | ✅ | CRUD + recurrence simple + occurrence override + vista day/week/month + agenda. Backend merge events+tasks. |
| Metas/Goals | 🟡 | Backend sólido (5 modos, milestones, complete/fail, progreso derivado steps+tasks+numeric). Flujo T1 implementado. UX todavía tipo CRUD, no accion-first, pero **sin progreso falso**. Faltan: post-create prompt, read-only en finalized, reopen/duplicate/archive, templates, collaboration. |
| Quick Actions | 🟡 (con riesgo 🔴) | El sheet SÍ existe y SÍ renderiza acciones (`Nueva tarea`, `Nuevo evento`, `Invitar persona`). FALTA "Crear meta". El array existe, los labels son visibles, los handlers navegan. El reportado "no muestra acciones" probablemente sea expectativa de "Crear meta" ausente o navegación `initialSheet` que no abre el sheet visualmente en algunos casos — ver §6. |
| Home integration | ✅ | Muestra tareas reales, eventos reales, 1 meta en riesgo/destacada. Usa `hasRealGoalProgress` (no progreso falso). NO contiene "Geni" (ya removido). |
| Backend/API | ✅ | Rutas /tasks /events /calendar /summary /goals /milestones. Context server-side. Validaciones completas. `GET /tasks?goal_id` implementado. |
| DB/RLS | ✅ | planner_tasks, planner_events, planner_goals, planner_goal_milestones + goal_id FK + RLS completa + RLS fix de INSERT. |
| Frontend/UX | 🟡 | Functional peroVisualmente cargado en Tasks/Goals/GoalDetail. Forms mejorados (rutas rápidas colapsadas). Sin rediseño accion-first todavía. |

**Conclusión ejecutiva:** Planner está técnicamente usable end-to-end. El flujo core de Goals-Tasks (T1) está **realmente implementado y verificado en código**. Los P0 restantes son: (a) confirmar visualmente Quick Actions en runtime (ya que el código luce correcto), (b) añadir "Crear meta" a Quick Actions, (c) pulir UX visual. Goals puede considerarse MVP-closed a nivel técnico si no se exige rediseño accion-first.

---

## #2. Matriz de progreso por módulo

| Módulo | Estado | Evidencia en código | Evidencia en docs | Problemas | Próximo paso |
|---|---|---|---|---|---|
| Planner shell / navegación | ✅ | `HomeTabNavigator.tsx`, `types.ts:30-50` (PlannerStack), `PlannerScreen.tsx` tabs interno | gap_audit §3 | Tab central sobresale (`CenterTabButton.tsx:62-66` `top: -20`) — correcto pero revisar en runtime | — |
| Tareas | ✅ | `planner.tasks.service.js:315-619` (list/create/update/cancel/complete/verify), `PlannerTasksScreen.tsx` | — | Filtros typeFilters (7) + priorityFilters (4) + statusFilters (4) en misma pantalla = sobrecarga | Simplificar filtros |
| TaskForm | ✅ | `TaskForm.tsx` (1212 líneas) | — | Banner goal contextual implementado (`TaskForm.tsx:451-456`); post-save navega a GoalDetail si `fromGoal` (`TaskForm.tsx:411-416`) | — |
| Eventos | ✅ | `planner.events.service.js` (329 líneas), `EventForm.tsx` (612 líneas) | — | Recurrence simple (none/daily/weekly/monthly) + override de occurrencia | Recurrence avanzada = futuro |
| EventForm | ✅ | `EventForm.tsx`, edit scope occurrence/series | — | Edit de occurrencia recurrente bien modelado | — |
| Calendario | ✅ | `planner.calendar.service.js:193-262` (merge events+tasks, expand recurrences, overrides), `PlannerCalendarScreen.tsx` | — | Vista day/week/month + agenda. Tareas con `due_date` aparecen (`calendar.service.js:206-213`) | — |
| Summary/Home | ✅ | `planner.summary.service.js`, `HomePlannerSections.tsx` | — | `briefing_text` es template (no Geni). Home carga summary + tasks + events + 1 goal. Usa `hasRealGoalProgress` | — |
| Goals list | ✅ | `PlannerGoalsScreen.tsx`, `planner.goals.service.js:252-295` | gap_audit §3 | Sin 0% falso (`shouldShowGoalProgressBar`). Filtros: 3 ScrollView horizontales (status/visibility/category) — visualmente cargado | Sheet de filtros |
| GoalForm | ✅ | `GoalForm.tsx` (1061 líneas), ruta simple + secciones colapsadas | gap_audit Phase 3 | 5 modos, presets de fecha, validaciones, post-create→GoalDetail | Post-create prompt (mejora) |
| GoalDetail | 🟡 | `GoalDetailScreen.tsx` (689 líneas), T1 implementado (`GoalDetailScreen.tsx:462-479` botón Crear tarea) | gap_audit Phase 1/5 | Diferencia modos, pero sigue monolítico; acciones terminales prominence media; sin read-only en completed/failed (delete sí visible) | Read-only + menú ••• |
| Goals tasks mode | ✅ | `planner.goals.service.js:81-108` `calculateProgressFromTasks` (completed+verified / total computable), `GoalDetailScreen.tsx:82-88` carga via `listPlannerTasks({goal_id})`, `GoalDetailScreen.tsx:665-674` "X de Y tareas terminadas" | gap_audit §5 (gap_audit lo marMissing pero está implementado) | NO auto-completa goal al 100%. Query efficiente. 0 tareas → null. | — |
| Goals steps mode | ✅ | `planner.goals.service.js:137-155` (achieved/total, 0 hitos→null) | gap_audit §5 (marcadMissing pero implementado) | Combo create/toggle/delete funcional; sin reorder UI; sin nota/fecha | Reorder + nota (futuro) |
| Goals numeric mode | ✅ | `planner.goals.service.js:124-134` (current/target*100, target null→null), `GoalDetailScreen.tsx:392-449` UI numeric | — | "Falta definir objetivo" cuando null (`plannerShared.ts:127-130`); input "Actualizar" | "Sumar avance" accion-first (futuro) |
| Goals boolean mode | ✅ | `planner.goals.service.js:117-122` (current>=1→100), `GoalDetailScreen.tsx:481-496` "Marcar como lograda" | — | Sin barra (`shouldShowGoalProgressBar` false), sin porcentaje | — |
| Goals none mode | ✅ | `planner.goals.service.js:161-163` (null), `GoalDetailScreen.tsx:451-456` progressText "Sin una medida fija" | — | Sin barra ni porcentaje | — |
| Milestones | ✅ | `planner.goals.service.js:564-726` (list/create/update/delete soft) | gap_audit Phase 4 | No nota, no target_date, no reorder UI, no `goal_milestone_id` en tasks | Futuro |
| Quick Actions | 🟡 | `QuickActionSheet.tsx` (acciones hardcodeadas), `CenterTabButton.tsx`, `HomeTabNavigator.tsx:220-266` | — | FALTA "Crear meta"; el array existe y los handlers navegan; reportado como "no muestra acciones" | QA visual + añadir Crear meta |
| API Planner | ✅ | `routes/planner.js` (42 líneas, endpoints completos) | — | Sin endpoints de progress atómico, reopen, duplicate, templates, collaboration | Futuro P1/P2 |
| DB/RLS Planner | ✅ | 6 migraciones Planner, RLS completa, helpers `can_select/update_planner_goal` | gap_audit §3 | DELETE no tiene policy (soft delete via UPDATE cubre); milestones con `on delete cascade` (conflict spec §17.5) | Futuro |

---

## #3. Auditoría de Tareas

### Backend (todos implementados)

| Endpoint | Estado | Evidencia |
|---|---|---|
| `GET /api/planner/tasks` | ✅ | `planner.tasks.service.js:315-386`. Filtros: status, include_cancelled, **goal_id** (`:328-349` valida UUID + existencia + household), assigned_to_member_id, template_key, from, to (due_date), limit. Household scoping (`:320`). Sort por status + due_date (`:52-67`). Hydrate members (`:226-294`). |
| `POST /api/planner/tasks` | ✅ | `:388-441`. Valida title, assignment, goal_id (`:401`), priority, origin_*. Arma `household_id` y `created_by_person_id` server-side (`:407-408`). Insert + select. |
| `PATCH /api/planner/tasks/:id` | ✅ | `:444-533`. Rechaza `status` del body (`:447-449`). buildTaskPatch permite goal_id (`:497-503`). Re-valida assignment y goal_id. |
| `DELETE /api/planner/tasks/:id` | ✅ | `:535-551` → cancelTask (soft: status='cancelled'). |
| `POST /api/planner/tasks/:id/complete` | ✅ | `:553-583`. Idempotente (si ya completed/verified/awaiting/cancelled, retorna). Si `requires_verification`→`awaiting_verification`, sino `completed`. Setea `completed_by_person_id` y `completed_at`. |
| `POST /api/planner/tasks/:id/verify` | ✅ | `:586-618`. Requiere `awaiting_verification` y `completed_by_person_id !== context.personId` (no auto-verificarse). Setea `verified`. |
| goal_id filter | ✅ | `:328-349` en GET; `validateGoalId` (`:172-200`) valida UUID + existe en planner_goals + mismo household + no soft-deleted. |
| household scoping | ✅ | `:320` `.eq('household_id', context.householdId)`; context server-side (`planner.context.service.js:59-68`). |
| active household | ✅ | Contexto resuelve via token + `active_household_id` (`planner.context.service.js:25-27`). |
| RLS | ✅ | `202606230001_planner_mvp.sql:183-197` (select/insert/update via `is_active_household_member`). |

### Frontend

`PlannerTasksScreen.tsx`:
- Filtros `today/open/mine/attention` (4) + `typeFilters` (8: all+7) en ScrollView horizontal (`:39-57`) — **visualmente cargado**.
- TaskCard (`:72-291`) muestra: typeDot+emoji, título, overflow `⋮`, origin badge (inventory), **goal link badge** (`:230-236`, si `task.goal_id && goalTitleById.has`), fecha/hora, priority badge (solo high/critical), status badge, descripción truncada, owner row, "Requiere revisión"/"Por revisar".
- Long-press → action menu (Alert) con Completar/Verificar/Editar/Cancelar (`:166-201`).
- Carga goal titles via `listGoals` independiente (`:343-356`).

`TaskForm.tsx`:
- Crea/edita funcionales, con `embedded` (sheet) y standalone (screen).
- **Banner contextual**: si `routeGoalTitle`, muestra "Para: {titulo}" (`:451-456`) con fondo terracotta.
- Selector "Meta vinculada (opcional)" solo appears si `!isGoalPreassigned && goals.length > 0` (`:615`). Botón "Sin meta" + chips por goal.
- Si `routeGoalId` viene (desde GoalDetail), `isGoalPreassigned` true → selector oculto, `goalId` pre-cargado (`:181`).
- Post-save: si `routeFromGoal && routeReturnToGoalId` → navega a `GoalDetail` (`:411-413`); sino a `PlannerHome` con refreshKey (`:414-416`).
- Tipos predefinidos (cleaning/shopping/pets/medication/studies/payments) con sugerencias de título.
- Priority 4 chips (low/medium/high/critical) — siempre visibles.

**Veredicto Tasks**:
- **Funciona**: crear, editar, completar, verificar, cancelar, filtrar por status/tipo/asignado, badges de meta, navegación desde GoalDetail (contextual).
- **Falta**:了他 vincular tareas existentes a múltiples metas (solo selector opcional en create/edit); sheet multi-select; mover entre goals.
- **Cargado visualmente**: TaskCard acumula ~6 chips/badges por tarjeta; filtros 8+ visibles; priority visible aun siendo low. Recomendable: filtros en sheet, acciones destructivas en menú, agrupar por sección.

---

## #4. Auditoría de Eventos / Calendario

### Backend

| Endpoint | Estado | Evidencia |
|---|---|---|
| `GET /api/planner/events` | ✅ | `planner.events.service.js:93-132`. Filtros from/to, status/include_cancelled, include_recurring. Recurrence filter frontend. |
| `POST /api/planner/events` | ✅ | `:134-169`. title, starts_at (ISO obligatorio), ends_at opcional, all_day, location_name, recurrence (default none), status='scheduled' server-side. |
| `PATCH /api/planner/events/:id` | ✅ | `:216-246`. Sub-patch select, no permite status. |
| `DELETE /api/planner/events/:id` | ✅ | `:248-264` → cancel (status='cancelled'). |
| `GET /api/planner/calendar` | ✅ | `planner.calendar.service.js:193-262`. Range por view (day/week/month). Merge events (con recurrence expansion `:119-168` y override fusion `:226-247`) + tasks con due_date en range (`:206-213`). Sort cronológico. |
| `POST /api/planner/events/:id/occurrences/override` | ✅ | `:266-319`. Crea override con parent_event_id + original_occurrence_start_at. Recurrence='none' en override. |
| recurrence simple | ✅ | none/daily/weekly/monthly (`planner.constants.js:30-35`). Expansion en `calendar.service.js`. |
| household scoping | ✅ | `.eq('household_id', context.householdId)` en todo. |

### Frontend

`PlannerCalendarScreen.tsx`:
- Vista day/week/month (`:42-46`), chips de view, navegación `< Hoy >`, grid mensual con event dots.
- Agenda (selectedDateItems) muestra items del día (`:127-131`).
- Items totales (eventos + tasks con due_date) backend-driven; recurrences expandidas backend.
- Tareas CON due_date aparecen en calendar (merge).

`EventForm.tsx`:
- Create/edit, embedded/standalone, **edit scope occurrence/series** para recurring (`:111`, `:145-153`).
- Validaciones fecha (AAAA-MM-DD) y hora (HH:mm) + endTime > startTime.
- Recurrence chips (none/daily/weekly/monthly).
- All-day toggle oculta horas.

**Veredicto Calendar**: ✅ Funciona completo. Recurrence simple + override bien modelado. Visualmente correcto. Faltante: recurrence avanzada (custom exrule), recordatorios (futuro).

---

## #5. Auditoría de Goals

### A. GoalForm / Create/Edit ✅

- create ✅ (`GoalForm.tsx:423-430`)
- edit ✅ (`:431-438`), fallback inferencia mode desde target_type (`:209-229`)
- progress_mode `steps/tasks/numeric/boolean/none` ✅ (`:675`)
- subopciones numeric (count/amount/percentage) ✅ (`:280-298`, unidad/preset porcentaje %)
- fechas ✅ (`:300-315`), presets week/month/year/custom/none (`:68-74`)
- validaciones ✅ (`:317-411`): title not blank, fechas parciales inválidas, ends < starts, target no negativo
- post-create → `GoalDetail` (`:429`)
- eficiencia: ruta simple = Nombre + Descripción + Categoría + Visibilidad siempre visibles; "Cómo avanzar" y "Fechas" colapsados
- no technical labels en Chips

### B. GoalDetail ✅ (con UX a pulir)

- carga goal real ✅ (`GoalDetailScreen.tsx:72-97`)
- refresh al volver ✅ (`useIsFocused` + useEffect load, `:99-103`)
- UI por modo ✅ (tasks/numeric/boolean/none/steps branches, `:460-662`)
- acciones principales ✅ (Crear tarea en tasks, Marcar lograda en boolean, Marcar lograda + Cerrar sin lograr en numeric/steps)
- completed/failed: 🔴 solo muestra `Eliminar meta` en el footer + `status badge` en header (`:103-119`). Faltan acciones de duplicar/reabrir/archivar. **Match ok con spec (solo read-only + delete mínimo)**, pero UX flojo.
- delete ✅ (`:156-177`)
- loading/error ✅ (`:279-303`)
- **no 0% falso** ✅ (`hasRealGoalProgress` + `shouldShowGoalProgressBar`)
- **no 0/?** ✅ (texto "Sin pasos todavía", "Sin tareas vinculadas", "Falta definir objetivo" via `getGoalProgressText`)

### C. progress_mode='tasks' ✅ (T1 cerrado con evidencia)

Cadena verificada end-to-end:

1. GoalDetail tiene botón "Crear tarea" cuando `progressMode === 'tasks'` y `active` (`GoalDetailScreen.tsx:462-479`).
2. Navega a `CreateTask` con `{ goalId, goalTitle, fromGoal: true, returnToGoalId: goal.id }` (`:467-472`).
3. TaskForm recibe `routeGoalId = route.params.goalId` y `routeGoalTitle` (`TaskForm.tsx:154-155`).
4. `goalId` state inicializa con `routeGoalId ?? null` (`:181`); `isGoalPreassigned = routeGoalId !== undefined` (`:183`).
5. Selector "Meta vinculada" oculto si preasignado (`:615`).
6. Banner "Para: {titulo}" aparece (`:451-456`).
7. Payload `goal_id: goalId ?? null` (`:379`).
8. POST /api/planner/tasks → `createTask` persiste `goal_id` tras `validateGoalId` (`planner.tasks.service.js:419`).
9. Post-save si `routeFromGoal && routeReturnToGoalId` → `navigation.navigate('GoalDetail', { goalId: routeReturnToGoalId })` (`TaskForm.tsx:411-413`).
10. GoalDetail recarga via `useIsFocused` (`:99-103`).
11. Carga `listPlannerTasks(accessToken, { goal_id: goalId, limit: 100 })` (`:82-88`).
12. Muestra tareas vinculadas (`:536-574`): título, status legible, due_date, chevron.
13. Texto secundario "X de Y tareas terminadas" (`:665-674`) solo si `hasRealProgress && linkedTasks.length > 0`.
14. `calculateProgressFromTasks` (`planner.goals.service.js:81-108`):
    - consulta status de planner_tasks where `goal_id && deleted_at null && status neq cancelled`.
    - total = computableTasks.length. **0 → null** ✅
    - completed = filter `status === 'completed' || 'verified'` ✅ (pending y awaiting no cuentan)
    - cancelled/deleted excluidos ✅
    - percentage = round(completed/total * 100)
    - **no auto-completa goal al 100%** ✅ (sólo `goal.status === 'completed'` hardcodea 100, no se setea automáticamente el status).

Casos esperados:
- 1 pending → total=1, completed=0 → 0% ✅ (no null, es 0 real)
- 1 completed → total=1, completed=1 → 100% (pero goal sigue active) ✅
- 1 completed + 1 pending → total=2, completed=1 → 50% ✅
- 1 awaiting → total=1, completed=0 → 0% (awaiting no cuenta) ✅
- 1 cancelled → total=0 → null ✅ (excluido del query)
- 0 tareas → no tasks en BD → null ✅

**T1 Goals Tasks Core: CERRADO con evidencia.**

### D. progress_mode='steps' ✅

- milestones CRUD ✅
- crear ✅, toggle ✅, delete soft ✅
- progreso derivado de achieved/total (`planner.goals.service.js:137-155`)
- 0 hitos → null ✅
- **no auto-completa** ✅ (sólo `goal.status==='completed'` → 100 en `:111-113`)
- falta: editar título inline, reorder UI, nota/fecha goal_milestone_id

### E. numeric ✅

- current_value/target_value ✅
- target null → null (no barra, muestra "Falta definir objetivo") ✅
- controles solo numeric (`GoalDetailScreen.tsx:267, :392-449`) ✅
- current > target: backend no bloquea (`:133` clamp a 100), UI muestra hasta 100% ⚠️ sin "Objetivo superado por X"
- copy correcto ✅

### F. boolean ✅

- "Marcar como lograda" como acción primaria (`:481-496`)
- active = pendiente, complete = lograda
- sin barra (`shouldShowGoalProgressBar` false para boolean) ✅
- sin porcentaje ✅

### G. none ✅

- sin barra ✅
- sin porcentaje ✅
- progressText "Sin una medida fija" (`plannerShared.ts:134`) ✅

### H. estados finales 🟡

- active ✅ (acciones visibles)
- completed ✅ (badge success, link + delete visible)
- failed ✅ (badge danger, link + delete visible)
- deleted/soft-deleted ✅ (DELETE endpoint soft-delete)
- **read-only visual** 🔴 cuando completed/failed: header no oculta botón crearpaso/crear tarea porque están dentro de `goal.status === 'active'` block; delete visible igual. Spec §17.1 exige read-only estricto + acciones no destructivas ya cubiertas pero no hay reabrir/duplicar/archivar. UX parcial.
- **no acciones de avance en completed/failed** ✅ (bloque `goal.status === 'active'` `:460`)
- delete no rompe listas/home/tasks ✅ (FK set null)

---

## #6. Auditoría de Quick Actions

### Componentes inspeccionados

- `HomeTabNavigator.tsx:220-266` (tab `AddTab` con `tabBarButton: () => <CenterTabButton onPress={handleQuickActionPress} />`, sheet `<QuickActionSheet visible={showQuickActions} .../>`)
- `CenterTabButton.tsx` (botón central animado, onPress dispara `handleQuickActionPress`)
- `QuickActionSheet.tsx` (Modal con header "Crear / Acciones rápidas para tu hogar", ScrollView con Pressables)

### Respuestas a las preguntas

1. **¿El botón central abre?** ✅ — `handleQuickActionPress` setea `showQuickActions=true` (`HomeTabNavigator.tsx:158-160`), el Modal lo respeta (`QuickActionSheet.tsx:65-69`).
2. **¿El sheet se renderiza?** ✅ — Modal transparent + animation slide + handle + header + body.
3. **¿El array de acciones existe?** ✅ — hardcodeado en JSX (no `array.map`, sino 2-3 Pressables directos) (`QuickActionSheet.tsx:103-171`).
4. **¿Tiene Crear tarea / Crear evento / Crear meta?** 🔴 — Tiene Crear tarea ✅ y Crear evento ✅. **No tiene Crear meta**. La tercera (condicional) es "Invitar persona" (solo si `isCoordinator || currentRole === 'adulto'`).
5. **¿Labels visibles?** ✅ — "Nueva tarea", "Nuevo evento", "Invitar persona" todos con label `body/700` + subcaption.
6. **¿Estilos los ocultan?** 🔴 No — todos los styles `actionRow` tienen `backgroundColor: surface.soft`, border visible, padding. El fallback `visibleActionCount === 0` solo aparece si `!canInvite` AND se eliminó algo, pero actualmente 2 acciones siempre + la condicional (3 o 2). Nunca 0 en runtime normal.
7. **¿Handlers existen?** ✅ — `openCreateTask` (`:23-36`), `openCreateEvent` (`:38-51`), `openInvitePeople` (`:53-59`).
8. **¿Las acciones navegan?** ✅ — task/event navegan a `PlannerTab → PlannerHome` con `{ initialTab, initialSheet, sheetKey, refreshKey }`. `openPlanner` reset y `setTimeout(250)`.
9. **¿Por qué actualmente no se muestran?** — El código SÍ muestra las acciones (2-3 según rol). El reporte "no muestra acciones rápidas útiles" puede venir de:
   - Expectativa de ver "Crear meta" que NO existe → frustración reportada;
   - O bien el `setTimeout(250)` + `navigation.navigate('PlannerTab', {screen:'PlannerHome', params:{initialSheet:'task'}})` abre PlannerScreen pero `PlannerScreen.tsx:69-98` procesa `initialSheet='task'` seteando `sheet { type:'task', mode:'create' }` — puede que en runtime el sheet visual no aparezca si `processedNavKeyRef` ya matchea o el state se resetea; require QA visual real.
   - **Sin QA runtime no podemos confirmar el problema** — el código del sheet en sí SÍ renderiza acciones.

### Veredicto

No marca como 🔴 "abre vacío" porque el array inicia (mínimo 2 acciones visibles siempre, `:62` `visibleActionCount = (canInvite ? 1 : 0) + 2`). Pero marca como 🟡-🔴 por:
- Falta "Crear meta" como tercera acción documentada (spec §5).
- Posible bug en `PlannerScreen` al recibir `initialSheet` que NO será visible en este audit estático.

**Quick Actions está roto respecto a la spec (no: Crear tarea + Crear evento + Crear meta)**, y debe añadirse "Crear meta" con `navigation.navigate('PlannerTab', { screen:'PlannerHome', params:{ initialTab:'goals' } })` o equivalente y navegar a `CreateGoal`. Cuando se añada puede marcarse ✅.

---

## #7. Auditoría Home integration

`HomePlannerSections.tsx`:
- Muestra tareas reales (3) ✅ (`:200`, `sortHomeTasks` filter pending+awaiting)
- Muestra eventos reales (3) ✅ (`:201`)
- Muestra máximo una meta relevante ✅ (`:286-354`): atRisk (en riesgo con progreso <40% y fecha <7d) o fallback sort por fecha
- **NO muestra Geni fake** ✅ — busqueda de "Geni" en `screens/home` solo encuentra "¡Genial!" en HomeAdolescente (emoji irrelevante). "Chatear con Geni" no existe.
- **No progreso falso** ✅ — usa `hasRealGoalProgress(highlight)` antes de mostrar `progressPct` (`:309`)
- No muta Planner desde Home ✅ — solo navega (`openPlanner` y a GoalDetail)
- Loading/error/empty states ✅ (`Skeleton`, `ErrorState`, `<Sin tareas pendientes>`)

`useHomePlannerData`: Promise.all (summary + tasks + events + goals), re-fetch en `plannerChangedAt`.

Resumen: ✅ Prácticamente según spec.

---

## #8. Auditoría estética / UX

| Pantalla | Nivel de carga visual | Problemas | Recomendación |
|---|:---:|---|---|
| PlannerScreen | Medio | 4 statCards + topbar 3 tabs + toast | OK |
| PlannerTasksScreen | **Alto** | 8 typeFilters + 4 statusFilters + TaskCard con ~6 badges/chips; long-press menu | Filtros en sheet; agrupar; reducir badges |
| PlannerCalendarScreen | Medio | chips view + nav + grid + agenda | OK |
| PlannerGoalsScreen | **Alto** | 3 ScrollView horizontales de filtros (status + visibility + category) — North/South de chips; card pesada con `current/target` + `progressPct` + chips | Sheet de filtros; reducir tiras; cards minimal |
| GoalDetailScreen | Medio-Alto | CRUD completo: header + card + barra + input numeric + secciones tareas/hitos + acciones terminales + delete | Mover terminales a menú •••; fluido según modo |
| TaskForm | Medio-Alto | Tipo + sugeridas + nota + avatar + meta + fecha + prioridad + detalles opcionales — 8 scroll sections | Compactar; agrupar en "más opciones" |
| EventForm | Medio | Title + fecha/hora + all-day + ubicación + recurrence + scope | OK |
| GoalForm | **Mejor** | Secciones colapsadas (progreso, fechas) — bueno | Bueno |
| HomePlannerSections | Bajo-Medio | Cards summary + 1 goal + 3 tasks + 3 events | OK |
| QuickActionSheet | Bajo | Sheet con 2-3 filas + header | OK (pero falta "Crear meta") |

**¿Parece "consola de Homero Simpson"?** — Tasks y Goals tienen esa tendencia (muchos buttons/chips en pila). GoalDetail es monolítico. GoalForm logró evadirlo con secciones colapsadas. EventForm está OK. Recomendación P1: simplificar Tasks+Goals visualmente.

---

## #9. Estado real vs documentación

| Requisito documentado | Estado real | Evidencia | Gap |
|---|---|---|---|
| Linked tasks in goals (T1) | ✅ | `GoalDetailScreen.tsx:462-479`, `TaskForm.tsx:154-181`, `planner.tasks.service.js:419` | Cerrado |
| Task progress in goals | ✅ | `planner.goals.service.js:81-108` `calculateProgressFromTasks` (cuenta completed+verified; excluye cancelled/deleted) | Cerrado |
| Steps progress | ✅ | `planner.goals.service.js:137-155` achieved/total | Cerrado (gap_audit lo desactualizó como TODO) |
| No fake progress | ✅ | `plannerShared.ts:104-112` `hasRealGoalProgress` + `shouldShowGoalProgressBar`; PlannerGoalsScreen/GoalDetail/Home usan | Cerrado |
| Quick Actions visible | 🟡/🔴 | `QuickActionSheet.tsx` abre y muestra 2-3 acciones, FALTA "Crear meta" | Falta añadir meta + QA visual |
| Home no fake Geni | ✅ | "Geni" removido; `briefing_text` es template `planner.summary.service.js:60` | Cerrado |
| Refresh/navigation | ✅ | `AppRefreshContext`, `useIsFocused`, `plannerChangedAt` | Cerrado |
| Completed/failed | 🟡 | Estados persistidos; acciones avanzas ocultas en finalizados; faltan reabrir/duplicar/archivar | Faltan P1 |
| Forms efficiency | 🟡 | GoalForm tiene ruta simple colapsada; TaskForm/EventForm OK; pero TaskForm muestra prioridad siempre | Pulir |
| Visual overload | 🟡 | Tasks/Goals cargados; GoalDetail monolítico | P1 simplificar |

---

## #10. Progreso porcentual realista

| Área | Técnico | UX | QA confidence | Comentario |
|---|---:|---:|---:|---|
| Backend Planner | **95%** | n/a | 75% | Tareas, eventos, calendar con recurrence, summary, goals con 5 modos + milestones + progress derivado: todos implementados. Faltan endpoints P1 (progress atómico, reopen, duplicate, archive) y P2/P3 (templates, collaboration). |
| DB/RLS Planner | **92%** | n/a | 80% | 4 tablas core + goal_id FK + índices + RLS completa + fix de INSERT. Faltan columnas futuras (priority/responsible/archived/version) y 11 tablas colaborativas (out of MVP). DELETE policy ausente pero soft-delete cubre. |
| Frontend Tasks | **88%** | 70% | 70% | CRUD + verify + filtros + goal link. Cargado visualmente; falta multi-link y mover entre goals. |
| Frontend Calendar | **92%** | 85% | 80% | day/week/month + agenda + recurrence + override. Recurrence avanzada y recordatorios = futuro. |
| Frontend Goals | **88%** | 68% | 72% | 5 modos implementados, T1 cerrado, sin progreso falso. GoalDetail monolítico, PLC floja en finalized, sin post-create prompt. |
| Quick Actions | **70%** | 65% | 50% | Sheet existe y renderiza, FALTA "Crear meta". Necesita QA visual real para validar `initialSheet`. |
| Home integration | **95%** | 88% | 82% | Tareas reales + eventos reales + 1 goal en riesgo; sin Geni; sin progreso falso. |
| UX polish | n/a | **62%** | 60% | Functional pero cargado en Tasks/Goals. GoalDetail CRUD. Forms OK. Falta rediseño accion-first del Detail. |
| QA confidence general | n/a | n/a | **65%** | No hay suite de tests automatizada de Planner. Faltan verify visuales runtime en Quick Actions y GoalDetail finalized. |

Promedio ponderado ( 데코 MVP técnico: **~85%**). **No marcar 90%** mientras Quick Actions falte "Crear meta" y QA visually no verifique `initialSheet`.

---

## #11. Lista priorizada de pendientes

### P0 — bloquea considerar Planner usable

1. 🔴 **Quick Actions: añadir "Crear meta"** — `QuickActionSheet.tsx` añadir tercer Pressable que navegue a `PlannerTab → PlannerHome → initialTab:'goals'` o `CreateGoal` directo.
2. 🟡 **QA visual runtime de Quick Actions**: verificar que `initialSheet='task'/'event'` abra el sheet en PlannerScreen correctamente y no se trague el state (`PlannerScreen.tsx:69-98`).
3. 🔴 ~~Progreso falso 0% / Geni fake~~ — **RESUELTO** (`hasRealGoalProgress`, Geni removido). Solo mantener.
4. 🔴 ~~T1 Goals Tasks link~~ — **RESUELTO** (`calculateProgressFromTasks` + TaskForm contextual + post-save a GoalDetail).

### P1 — necesario para Planner pulido

5. 🟡 GoalDetail: read-only estricto cuando completed/failed (ocultar input/createar + mostrar acciones duplicar reabrir archivar).
6. 🟡 GoalDetail: menú ••• en header (Edit + Duplicate + Reopen + Archive + Delete).
7. 🟡 Backend: `POST /goals/:id/progress` atómico + reopen + duplicate + archive (P1 de spec §6/§7).
8. 🟡 Tareas: filtros en sheet (no ScrollView horizontales todo visibles).
9. 🟡 Goals: sheet de filtros (ver planner_goals_final_gap_audit §9 P1).
10. 🟡 GoalDetail: post-create prompt "Agregar paso / Crear tarea / Ahora no" cuando `justCreated`.

### P2 — producto usable avanzado

11. ⚪ `goal_milestone_id` en planner_tasks (vincular tarea a hito).
12. ⚪ Templates de goals (T2): 8 presets + TemplatePicker + preview (3 tablas).
13. ⚪ Vincular tareas existentes a meta (sheet multi-select).
14. ⚪ Reorder de hitos (drag handles).
15. ⚪ Nota opcional + fecha objetivo del hito.

### P3 — futuro

16. 🔵 Streaks (T3 spec + T4 impl).
17. 🔵 Recurrence avanzada (custom RRULE).
18. 🔵 Recordatorios (planner_goal_reminders).
19. 🔵 Colaboración: roles por meta, comentarios, notas, activity, file links.
20. 🔵 Geni real (estima progreso metas).
21. 🔵 Feed de logros.
22. 🔵 Concurrencia optimista (version), offline, deep-link validation.

---

## #12. Recomendación final

1. **¿Planner está listo?** —— Técnicamente usable end-to-end (Tareas/Calendar/Goals/Quick Actions/Home), Quick Actions tiene una acción pendiente simple (**falta "Crear meta"**). Marcar MVP-close cuando #P0.1 resolvido.
2. **¿Goals está listo?** —— **Sí a nivel técnico T1** (link, progreso derivado tasks/steps, sin progreso falso). Falta pulir GoalDetail finalized (P1), pero el MVP funcional existe.
3. **¿Tasks está listo?** —— **Sí** (CRUD + verify + filtros + goal link). UX cargada pero funcional.
4. **¿Calendar está listo?** —— **Sí** (recurrence simple + override + agenda).
5. **¿Quick Actions está listo?** —— **No**. FALTA "Crear meta". El sheet abre y renderiza, handlers navegan, pero no cumple spec ("Crear tarea + Crear evento + Crear meta").
6. **¿Home integration está lista?** —— **Sí** (tareas reales, eventos reales, 1 meta en riesgo/destacada, sin Geni, sin progreso falso).

**Párrafo final:** Planner está en un estado MVP-cerrable. T1 (Goals Tasks Core) está realmente implementado y verificado en código. El principal pendiente inmediato es añadir "Crear meta" a `QuickActionSheet.tsx` (acción P0.1) y hacer QA visual runtime del flujo `initialSheet` → sheet, porque el código estático luce correcto pero sin verlo en metro/bundler no se puede confirmar 100%. Una vez que #P0.1 cierre, Planner puede considerarse MVP usable; los P1 son pulido de detail y eliminar sobrecarga visual.

---

## #13. Output

- **Archivo creado:** `docs/implementation/planner_total_progress_audit.md` (este archivo).
- **Archivo actualizado:** `docs/implementation/planner_goals_final_gap_audit.md` (sección superior agregada arriba de todo, marcando T1 implementado contra lo que estaba como TODO).
- No se modificó código, DB ni migraciones.
- No se hizo commit.
- `git status --short` sigue mostrando los cambios preexistentes del repo + este nuevo doc + la actualización de gap_audit.
