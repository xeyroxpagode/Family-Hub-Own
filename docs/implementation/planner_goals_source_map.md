# Planner Goals - Source Map

Estado: documento auxiliar de trazabilidad para `docs/implementation/planner_goals_final.md`. Actualizado el 10/07/2026 con la refresh de documentacion tras Phase 2 completada y las decisiones de producto del 10/07/2026 sobre Goals como planes accionables, tasks progress, templates y streaks.

## Actualizacion del 10/07/2026 — Decisiones de producto

Se incorporaron las siguientes decisiones tras el analisis de OpenCode "Goals as Task Packs + Streaks":

### Decisiones principales incorporadas a la documentacion

1. **Goals como planes accionables:** una meta puede empezar simple pero debe poder convertirse en un conjunto de tareas reales. Agregado a §4 de `planner_goals_final.md` y §3 de la spec FINAL.

2. **Prioridad inmediata T1 — Goals Tasks Core:** no es streaks, no es templates. Es hacer que las tareas vinculadas muevan progreso real. Backend: calculateProgress para tasks + query eficiente. Frontend: TaskForm contextual desde GoalDetail.

3. **Reglas precisas de tasks progress:**
   - Numerador: `completed` + `verified`.
   - NO completada: `pending` + `awaiting_verification` (nunca cuenta hasta verified).
   - Excluidas: `cancelled` + soft-deleted.
   - `goal.requires_verification` NO existe ni controla progreso. La verificacion pertenece a Task, no a Goal.
   - 0 tareas computables → null. >0 con 0 completadas → 0% real. Todas completadas → 100% (no auto-completar).

4. **T2 — Templates / Presets (despues de T1):** 8 presets conceptuales. Template Picker + Preview. Sin recurrencia, sin streaks, sin auto-asignacion.

5. **T3/T4 — Streaks (futuro):** rachas por oportunidad programada, no obligacion diaria. Dias sin tarea no rompen racha. Ventanas de gracia. Copys sin culpa. T3 = spec, T4 = implementacion.

### Contradicciones resueltas

- **C-resuelta-1:** La spec legacy (gap audit Phase 11) sugeria que `awaiting_verification` podria contar como completada segun `goal.requires_verification`. Resuelto: `goal.requires_verification` NO existe. `awaiting_verification` nunca cuenta hasta `verified`.
- **C-resuelta-2:** El gap audit priorizaba Phase 1 (visual truth + modular GoalDetail) y Phase 2 (11 tablas nuevas) como siguientes pasos inmediatos. Resuelto: T1 (tasks progress + TaskForm contextual) es la prioridad inmediata. Las 11 tablas de Phase 2 se posponen.
- **C-resuelta-3:** El gap audit listaba templates como Phase 12 con dependencia de Phase 2. Resuelto: templates se mueven a T2 con DB minima (3 tablas de templates), sin depender de las 11 tablas de Phase 2.
- **C-resuelta-4:** Streaks no existian en las fases legacy. Resuelto: se agregan como T3 (spec) y T4 (implementacion), con diseño conceptual completo en §24.3 de la spec FINAL.

### Archivos modificados en esta actualizacion

| Archivo | Cambios |
|---------|---------|
| `planner_goals_final.md` | Header actualizado. §4: Goals como planes accionables. §8: reglas precisas de tasks progress. §10: reorganizado en T1/T2/T3/T4. §17: nuevo plan de fases T1-T4 + §17 bis: streaks copy. |
| `planner_goals_product_ux_spec.md` | Header actualizado. §11: reglas precisas de tasks progress + flujo TaskForm contextual. §18: plan reorganizado T1-T4. |
| `HomePlus_Planner_Goals_UX_Implementation_Spec_FINAL.md` | Header actualizado. §1: bullets nuevos. §3: Goals como planes accionables. §13: reglas precisas de tasks progress con tabla de resultados. §24: expandido con T2 templates + presets + §24.3 streaks completo. §33: fases reorganizadas T1-T4 + legacy. |
| `planner_goals_final_gap_audit.md` | Header actualizado. §11: orden reorganizado T1-T4 + prioridad inmediata actualizada. |
| `planner_goals_source_map.md` | Esta seccion agregada. |

## Busqueda inicial obligatoria

Se ejecuto `git status --short` antes de editar. Resultado relevante:

- Hay cambios locales previos en backend, frontend y pantallas nuevas de Goals.
- No se modificaron esos archivos en esta tarea.
- Esta tarea solo agrega documentacion bajo `docs/implementation`.

Terminos solicitados usados para busqueda documental:

- Goals
- Metas
- Milestones
- Hitos
- Objetivos
- Goal
- GoalForm
- GoalsView
- GoalDetail
- progress
- progreso
- target_type
- current_value
- target_value
- visibility
- category
- goal_id
- tasks vinculadas
- Home summary
- PlannerDashboard

## Documentacion inspeccionada directamente

| Archivo | Aporte para la spec final |
|---|---|
| `docs/implementation/planner_goals_product_ux_spec.md` | Nuevo complemento Product/UX: modos de progreso, flujo de creacion en 10 segundos, post-create flow, acciones rapidas, Home card y anti-patrones. |
| `docs/planner_final.md` | Define Planner MVP real minimo, deja Goals fuera de MVP y permite Metas solo deshabilitado/placeholder. |
| `docs/implementation/planner_final_flow_spec.md` | Define Home resume, Planner administra, tabs internas, UX mobile y regla de no mostrar lenguaje tecnico. |
| `docs/implementation/planner_final_update_scope.md` | Audita Goals como POST_MVP, detecta placeholder/mock y explicita que Goals requiere modelo propio. |
| `docs/implementation/homeplus_planner_design_spec.md` | Define Planner como agenda familiar accionable con tabs Tareas/Calendario/Metas y Metas como futura expansion. |
| `docs/implementation/planner_premium_screen_design_spec.md` | Cierra reglas de UX: no progreso falso, Metas placeholder sobrio hasta backend real, microcopy y prioridad de pantallas. |
| `docs/professionalization/uix_006_planner_premium_audit.md` | Audita shell Planner, HomePlannerSections, TaskForm, services y deuda visual de Goals mock. |
| `docs/professionalization/uix_007_planner_full_experience_audit.md` | Audita experiencia completa y problemas: Goals parece mock decorativo, Home usa Geni sin backend real, TaskForm fecha tecnica. |
| `docs/deploy/planner_inventory.md` | Mapea relacion Planner-Inventory y enumera `Task.goal_id` como campo relevante; integra Inventory a Tasks, no a Goals en fase actual. |
| `docs/deploy/planner_inventory_qa.md` | Aporta QA de Planner/Inventory; no agrega reglas utiles especificas para Goals. |
| `docsGeneral/HomePlus — FinalSpec.md` | Fuente historica conceptual de Goals: personales/familiares, hitos, estados, integracion Tasks/Finance/Fondos/Geni, ubicacion dentro de Planner. |
| `docsGeneral/HomePlus — Esquema de base de datos v1.md` | Modelo historico de `goals` y `milestones`, RLS esperada y privacidad personal. |
| `docsGeneral/HomePlus — Api + TestCases + Edgecases V1.md` | Contrato historico de endpoints `/api/households/:hid/goals` y eventos `goal.completed`/`goal.failed`. |
| `docsGeneral/HomePlus — Diseño de Pantallas de Home V1.md` | Ubica Planner como Tasks/Calendar/Goals y define Home con resumen/progreso/logros sin leaderboard. |
| `docsGeneral/HomePlus — Desing system v1.md` | Define indicador de progreso y regla emocional: progress bar no debe comunicar deuda visual. |
| `docsGeneral/HomePlus — SECCION 1 PRODUCTO.md` | Define HomePlus como sistema que unifica Planner: tareas, calendario y metas. |
| `docsGeneral/HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md` | Define dashboards con realidad, no aspiraciones; privacidad de metas privadas; meta en riesgo. |
| `docsGeneral/HomePlus — SECCION 6 UX PHILOSOPHY.md` | Define progressive disclosure, navegacion <= 3 niveles, Planner agrupa Tasks/Calendar/Goals y Task -> Goal. |
| `docsGeneral/HomePlus — SECCION 8 DATA PHILOSOPHY.md` | Define metas individuales como datos personales privados por defecto y logros integrados dentro de Goals. |
| `docsGeneral/Basura/Contrato DB-API Planner MVP.md` | Contrato antiguo de Planner; no aporto modelo final nuevo de Goals mas alla de contexto MVP. |
| `docsGeneral/Basura/planner_frontend_ideal_spec_actualizado.md` | Repite decision MVP: no Goals reales; lista futuro de Goals personales/familiares, hitos, progreso y relacion Goal -> Tasks. |
| `docsGeneral/Basura/frontend_planner_ux_final.md` | Refuerza Metas como proximo paso sin backend real, y advierte no prometer progreso real si no existe. |
| `docsGeneral/Basura/planner_fragment.md` | Fragmento historico de Planner; aporta ubicacion conceptual pero no contrato final adicional. |
| `docsGeneral/Basura/ALL_FRAGMENTS_FROM_PLANNER_TO_MERGE.md` | Mapa de fragments Planner; confirma Goals dentro de Planner y varios puntos como POST_MVP. |
| `docsGeneral/Entrega/Planner/planner_final.md` | Copia equivalente de `docs/planner_final.md`; aporta confirmacion duplicada. |
| `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_Api_TestCases_Edgecases_V1_2.md` | Fragmento API; aporta referencia duplicada a contratos y eventos. |
| `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_Esquema_de_base_de_datos_v1.md` | Fragmento DB; aporta referencia duplicada a modelo Goals/Milestones. |
| `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_Design_System_V2.md` | Refuerza progress bar para tareas/Goals y Goals como POST_MVP en ese fragmento. |
| `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_SECCION_1_PRODUCTO.md` | Confirma Planner como Tasks/Calendar/Goals y Goal como POST_MVP en fragmento. |
| `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_SECCION_2_PRINCIPIOS_DEL_PRODUCTO.md` | Confirma Goals/Hitos/progreso como parte conceptual de Planner. |
| `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_SECCION_6_UX_PHILOSOPHY.md` | Confirma Task -> Goal, Goal progress y Milestones, pero clasificados como POST_MVP en ese fragmento. |
| `docsGeneral/Entrega/Planner/planner_fragment_SECCION_8_DATA_PHILOSOPHY.md` | Aporta privacidad/datos y confirma contradicciones historicas de estados. |

## Codigo y migraciones inspeccionados para auditoria actual

| Archivo | Aporte |
|---|---|
| `supabase/migrations/202607080004_planner_goals.sql` | Migracion actual real: `planner_goals`, `planner_goal_milestones`, `planner_tasks.goal_id`, RLS e indices. |
| `supabase/migrations/202606230001_planner_mvp.sql` | Base actual de `planner_tasks` y RLS de Planner MVP. |
| `supabase/migrations/202606210009_auth_onboarding_final.sql` | Helpers RLS: `current_person_id`, `is_active_household_member`. |
| `backend/src/routes/planner.js` | Ruta actual `/api/planner/goals` y subrutas de milestones. |
| `backend/src/controllers/planner.goals.controller.js` | Mapeo de errores/RLS y controladores actuales de Goals. |
| `backend/src/services/planner.goals.service.js` | Contrato real actual, validaciones, progreso y transiciones. |
| `backend/src/services/planner.tasks.service.js` | Validacion actual de `goal_id` para tareas. |
| `backend/src/services/planner.context.service.js` | Fuente server-side de `householdId` y `membershipId`. |
| `backend/src/constants/planner.constants.js` | Enums actuales de Goals. |
| `front/mi-front-limpio/services/plannerGoals.ts` | Cliente actual de Goals y tipos TS. |
| `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx` | Lista actual real de Goals. |
| `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` | Detalle actual con hitos, progreso y tareas vinculadas. |
| `front/mi-front-limpio/screens/planner/GoalForm.tsx` | Form actual y problemas UX de progreso/fechas. |
| `front/mi-front-limpio/screens/planner/TaskForm.tsx` | Selector actual de meta vinculada. |
| `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` | Badge actual de meta en task card. |
| `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` | Card actual de meta destacada/en riesgo en Home. |
| `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` | Tab interna Metas dentro de Planner. |
| `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` | Rutas `CreateGoal`, `EditGoal`, `GoalDetail` dentro del stack de Planner. |
| `front/mi-front-limpio/navigation/types.ts` | Tipos de navegacion de Goals dentro de Planner. |

## Actualizacion de documentacion 10/07/2026

Esta seccion documenta la refresh de documentacion realizada tras completar Phase 0 a Phase 2 de Planner Goals. No se implemento codigo en esta tarea; solo se actualizaron docs.

### Motivo de la refresh

- Backend de Goals funciona tecnicamente (DB, API, RLS, progress_mode, milestones, complete/fail).
- La UI actual no es la UX final aceptada: GoalDetail sigue siendo CRUD completo, PlannerGoalsScreen es visualmente pesado y GoalForm mejoro pero sigue cargado.
- Las cards pueden mostrar `0%` o `0 / ?` de forma engañosa cuando `progress_percentage` es null.
- Era necesario dejar documentado el estado real implementado, los problemas UX observados en prueba visual y las relaciones historicas de Goals con otros modulos para que el siguiente paso sea rediseño UX y no mas features.

### Archivos modificados en esta refresh

- `docs/implementation/planner_goals_final.md`: agregadas secciones 16 bis (Estado actual implementado), 16 ter (Problemas UX observados en prueba real) y 16 quater (Relaciones históricas de Goals con otros módulos). Aviso en el header de que la UI actual no es final.
- `docs/implementation/planner_goals_product_ux_spec.md`: agregada seccion 16 bis (Problemas detectados en la prueba visual actual) y 16 ter (UX final reforzada: menos chips, menos controles, accion-first, una accion primaria por modo, sin `Actual: 0 / Objetivo: ?`, sin 0% falso, acciones terminales menos prominentes). Aviso en el header.
- `docs/implementation/planner_goals_source_map.md`: agregada esta seccion y los archivos inspeccionados listados abajo.

### Codigo inspeccionado en esta refresh (no modificado)

| Archivo | Aporte para la refresh |
|---|---|
| `supabase/migrations/202607080004_planner_goals.sql` | Confirmacion de tablas reales `planner_goals`, `planner_goal_milestones`, `planner_tasks.goal_id`, helpers RLS y constraints. |
| `supabase/migrations/202607080005_fix_planner_goals_insert_rls.sql` | Confirmacion del fix de RLS INSERT/SELECT por el problema de `INSERT ... RETURNING`. |
| `supabase/migrations/202607100001_add_progress_mode_to_goals.sql` | Confirmacion de la columna `progress_mode` con default 'steps', check y backfill. |
| `backend/src/constants/planner.constants.js` | Confirmacion de `GOAL_PROGRESS_MODES` y `GOAL_PROGRESS_MODE_TARGET_TYPE_MAP` reales. |
| `backend/src/services/planner.goals.service.js` (`lines 1-100`) | Confirmacion de `validateProgressMode`, `validateProgressModeTargetTypeCompatibility` y `calculateProgress`. |
| `backend/src/controllers/planner.goals.controller.js` | Mapeo de errores/RLS y controladores actuales. |
| `front/mi-front-limpio/services/plannerGoals.ts` | Confirmacion de que `PlannerGoalProgressMode` existe en tipos cliente y `CreatePlannerGoalInput` incluye `progress_mode`. |
| `front/mi-front-limpio/screens/planner/GoalForm.tsx` | Confirmacion de Phase 2 completada: progress_mode, labels humanos, typecheck pasa. |
| `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx` (`lines 1-300`) | Deteccion del `progress ?? 0` en `line 72` y `current/target` en `line 150` como regression de progreso falso. |
| `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx` (`lines 1-300`) | Deteccion de CRUD completo, input "Actualizar", falta de flujo post-create, fetch de 100 tasks y filtro por `goal_id` en frontend. |
| `front/mi-front-limpio/screens/planner/plannerShared.ts` | Confirmacion de `goalProgressModeLabels` agregado. |
| `front/mi-front-limpio/screens/planner/TaskForm.tsx` | Selector actual de meta vinculada (no modificado). |
| `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` | Consumo de `listGoals` directo y calculo de riesgo en frontend. |
| `front/mi-front-limpio/navigation/HomeTabNavigator.tsx` (`lines 100-139`) | Confirmacion de rutas `CreateGoal`, `EditGoal`, `GoalDetail` dentro del stack Planner. |

### Documentos historicos inspeccionados para relaciones

- `docsGeneral/HomePlus — FinalSpec.md` (06.27, 06.30, 06.31, 06.32, 06.33, 12.07-12.08, 14.07, 18.08, 22.04, 22.06, 22.07, 22.10, 22.11, 22.12, 24.07)
- `docsGeneral/HomePlus — Esquema de base de datos v1.md` (2.8 goals, 2.9 milestones, 2.10 responsibilities, decision tables D-11/D-14)
- `docsGeneral/HomePlus — Api + TestCases + Edgecases V1.md` (2.4 goals, 2.5 responsibilities, 4 documents)
- `docsGeneral/HomePlus — SECCION 1 PRODUCTO.md`
- `docsGeneral/HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md` (principio 5 "Nunca celebramos el fracaso")
- `docsGeneral/HomePlus — SECCION 4 EMOTIONAL DESING.md` (Feed de logros, nunca expone faltas)
- `docsGeneral/HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY.md` (5.2.3 Goal, 5.2.4 Documento, 5.3 Geni)
- `docsGeneral/HomePlus — SECCION 6 UX PHILOSOPHY.md` (ecosistema graph, metricas visibles por rol)
- `docsGeneral/HomePlus — SECCION 7 AI PHILOSOPHY - GENI.md` (7.2.2 restricciones, metas privadas)
- `docsGeneral/HomePlus — SECCION 8 DATA PHILOSOPHY.md` (8.2.2 logros integrados en Goals)
- `docsGeneral/HomePlus — Diseño de Pantallas de Home V1.md`
- `docsGeneral/HomePlus — Desing system v1.md` (progress bar sin deuda visual)
- `docsGeneral/HomePlus — UX writing guide para geni.md` (copy/logro)
- `docsGeneral/HomePlus — Eventos del sistema v1.md` (4.2, 5.10-5.12, 10.4)
- `docsGeneral/docs/00_MAPA_ARQUITECTURA.md` (Goal vincula Tasks con Fondos)
- `docsGeneral/Basura/planner_frontend_ideal_spec_actualizado.md` (Goals, Geni, Inventory links futuros)
- `docsGeneral/Basura/ALL_FRAGMENTS-TO-FRONTEND-TO-MERGE.md` (relaciones explicitas Goals/Tasks/Finance/Geni)
- `docs/planner_final.md` (Goals y Milestones fuera de MVP)
- `docs/deploy/planner_inventory.md` (Inventory -> Task, `goal_id` en `planner_tasks`)
- `docs/implementation/planner_final_flow_spec.md` (Home resume, Planner administra, "no tocar Goals reales")
- `docs/implementation/planner_final_update_scope.md` (decisiones finales: Goals placeholder, retirar Geni, no progreso falso)
- `docs/implementation/homeplus_planner_design_spec.md` (Metas placeholder)
- `docs/professionalization/00_current_state_deep_audit.md` (auditoria: Goals era mock con progreso falso)

### Relaciones históricas encontradas

Resumen de relaciones concepto (detalle completo en `planner_goals_final.md` seccion 16 quater):

1. Goal -> Hitos (Milestones) -> Tasks. DB y API existen; logica de progreso derivada no.
2. Tasks advance Goals. `planner_tasks.goal_id` FK existe; derivacion de progreso no.
3. Goals <-> Finance / Fondos / Account_Finance. Spec current; no implementado.
4. Documents / HomeCloud <-> Goals. Spec current; no hay `goal_id` en documents.
5. Briefing / Home referencia Goals; sin Geni fake. Regla actual; la violacion de "0% falso" es la regression mas marcada.
6. Geni estima progreso de metas complejas (real + permisos). Capability spec; no implementado (do-not-touch).
7. Feed / logros celebra logros; nunca expone fracasos. Red-line current; Feed/logros no implementado enteramente.
8. Inventory / Assets / Medication -> Tasks -> Goals. Relacion conceptual; cadena completa futura.
9. Responsibilities / Tipo conecta a Goals (indirecto, futuro). No existe link directo.
10. Reglas producto: "sin progreso falso", "no prometer Geni", "no exponer fracasos". Red-line current; frontend actual viola "no 0% falso".

### Contradicciones detectadas

- C1: Spec historica describe Goals como feature completa con Finanzas/Fondos/Geni; MVP define Goals como POST_MVP y placeholder; implementacion actual implementa backend pero no UX final.
- C2: Spec premium exige "sin progreso falso"; frontend actual muestra `0%` o `0 / ?` cuando `progress_percentage` es null.
- C3: Spec usa `responsibility_id`; MVP reemplazo con `template_key`+`category`; no existe tabla `responsibilities`.
- C4: Spec establece Briefing Geni como real; implementacion actual debe retirar el copy "Geni" / "Chatear con Geni" y no prometer features inexistentes.
- C5: Spec lista Documento <-> Goal como relacion canonica; API de documents no tiene `goal_id`.
- C6: Spec describe cadena Inventory -> Task -> Goal; Inventory no implementado; `goal_id` existe pero cadena completa futura.
- C7: `planner.md` describe verificacion flow como derivada de campos; implementacion real usa estados persistidos `awaiting_verification` y `verified`.
- C8: Spec no define explicitamente un link Inventory-task pre-vinculado a Goal; es implicito via `goal_id` (futuro).

### Resumen visual QA (10/07/2026)

- GoalDetail: card con 0%, "Actual: 0 / Objetivo: ?" y "Actualizar"; hitos + acciones terminales mezclados en una sola pantalla. CRUD completo, no tracker.
- PlannerGoalsScreen: muchas chips/filtros visibles + card pesada con `0 / ?` y `0%`.
- GoalForm: progreso mejorado con progress_mode y labels humanos, pero sigue cargado visualmente en las secciones colapsadas.
- Conclusion visual: el backend funciona, la UX no es final y necesita rediseño, no mas features.

### Proxima tarea de diseño recomendada

Rediseño UX de GoalDetail y PlannerGoalsScreen siguiendo `planner_goals_product_ux_spec.md` seccion 16 ter:

- GoalDetail: accion-first por modo, sin `Actual: 0 / Objetivo: ?`, sin `0%` cuando `progress_percentage` es null, acciones terminales menos prominentes, flujo post-create "Agregar paso / Crear tarea / Ahora no".
- PlannerGoalsScreen: filtros minimos, card minimal, sin `0 / ?` ni `0%` cuando progress es null.
- HomePlannerSections: una sola card real, sin 0% falso, sin Geni.

No mas features: el siguiente paso es rediseño UX, no agregar logica backend ni nuevos endpoints.

