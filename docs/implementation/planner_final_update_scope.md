# Planner Final Update Scope

## 1. Objetivo

Esta etapa redefine el alcance final de Planner usando `planner.md` (documento maestro fusionado), las specs profesionales recientes y el codigo actual. No implementa codigo, no toca backend, no toca DB.

Compara la vision completa de Planner (que incluye Goals, Milestones, Streaks, Load Metrics, Templates, Verification Flow, Workload, Planner Summary, Geni, Automations, Notifications, Realtime) contra lo que realmente existe en codigo y DB para producir recomendaciones definitivas de que implementar en esta etapa final.

## 2. Fuentes revisadas

### Documentacion
- `docs/planner_final.md` — documento maestro fusionado (MVP Real Minimo)
- `docs/implementation/planner_premium_screen_design_spec.md` — diseno premium de todas las pantallas
- `docs/professionalization/uix_007_planner_full_experience_audit.md` — auditoria completa de experiencia
- `docs/implementation/planner_final_flow_spec.md` — spec de flujo final
- `docsGeneral/Entrega/Planner/planner_final.md` — copia identica del documento maestro
- `docsGeneral/Basura/Contrato DB-API Planner MVP.md` — contrato DB/API original
- `docsGeneral/Basura/planner_frontend_ideal_spec_actualizado.md` — spec ideal frontend

### Backend actual
- `backend/src/controllers/planner.tasks.controller.js` — CRUD tasks + complete + verify
- `backend/src/controllers/planner.events.controller.js` — CRUD events
- `backend/src/controllers/planner.summary.controller.js` — endpoint summary
- `backend/src/services/planner.tasks.service.js` — logica completa de tasks con estados `awaiting_verification`, `verified`, anti-autoverificacion
- `backend/src/services/planner.summary.service.js` — summary desde `planner_tasks` + `planner_events`
- `backend/src/services/planner.calendar.service.js` — composicion events + tasks por fecha
- `backend/src/services/planner.events.service.js` — CRUD events + ocurrencias
- `backend/src/constants/planner.constants.js` — statuses, priorities, template keys

### DB actual
- `supabase/migrations/202606230001_planner_mvp.sql` — `planner_tasks` (status: pending/completed/awaiting_verification/verified/cancelled) + `planner_events`
- `supabase/migrations/202606210004_tasks.sql` — tabla legacy `tasks` (status: pendiente/en_progreso/completada, prioridad: alta/media/baja)
- `supabase/migrations/202606230005_planner_event_occurrence_overrides.sql` — overrides de ocurrencias

### Frontend actual
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx` — shell con tabs Tasks/Calendar/Metas, sheet, toast
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx` — lista de tareas con filtros
- `front/mi-front-limpio/screens/planner/TaskForm.tsx` — formulario crear/editar
- `front/mi-front-limpio/screens/planner/PlannerCalendarScreen.tsx` — calendario Month/Week/Day
- `front/mi-front-limpio/screens/planner/PlannerCalendarComponents.tsx` — componentes calendario
- `front/mi-front-limpio/screens/planner/EventForm.tsx` — formulario eventos
- `front/mi-front-limpio/screens/planner/plannerShared.ts` — estilos, labels, helpers compartidos
- `front/mi-front-limpio/services/plannerTasks.ts` — service tasks con estados `awaiting_verification` y `verified`
- `front/mi-front-limpio/services/plannerEvents.ts` — service eventos
- `front/mi-front-limpio/services/plannerCalendar.ts` — service calendario combinado
- `front/mi-front-limpio/services/plannerSummary.ts` — service summary
- `front/mi-front-limpio/services/plannerTemplates.ts` — constantes de templates hardcodeadas
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx` — secciones Planner en Home
- `front/mi-front-limpio/components/ui/QuickActionSheet.tsx` — Quick Actions global

### Busquedas realizadas
- `streak|racha|goal|meta|milestone|load|carga|summary|verification|template|responsibility` en frontend, backend, supabase, docs
- DB migrations completas revisadas
- Backend services/controllers completos revisados

## 3. Mapa de features de Planner

| Feature | Aparece en planner.md | Existe en codigo actual | Existe backend/DB | Nivel recomendado | Implementar en esta etapa |
|---|---|---|---|---|---|
| **Tasks** | SI (REAL MINIMO) | SI (completo) | SI (completo: `planner_tasks` + service) | P0 premium polish | SI |
| **Events** | SI (REAL MINIMO) | SI (completo) | SI (completo: `planner_events` + service) | P1 premium polish | SI |
| **Calendar** | SI (REAL MINIMO) | SI (Month/Week/Day) | SI (calendar service combinado) | P0 cleanup | SI |
| **TaskForm** | SI (REAL MINIMO) | SI | SI | P0 premium redesign | SI |
| **EventForm** | SI (REAL MINIMO) | SI | SI | P1 premium ligero | SI |
| **Goals** | NO (POST_MVP) | SOLO PLACEHOLDER MOCK | NO | P2 placeholder sobrio | SI (limpiar mock) |
| **Milestones** | NO (POST_MVP) | NO | NO | P3 futuro | NO |
| **Streaks/Rachas** | NO (POST_MVP) | NO | NO | Real-lite sin DB nueva | SI (ver seccion 4) |
| **LoadMetrics/Carga familiar** | NO explicitamente; aparece como DEMO/MOCK | NO | NO | Real-lite derivado | SI (ver seccion 5) |
| **Task Templates CRUD** | NO (POST_MVP) | NO (solo hardcodeadas) | NO endpoint CRUD | P3 futuro | NO |
| **Suggested Tasks** | SI (presets hardcodeados) | SI (via `TaskForm` templates) | N/A (frontend-only) | P0 en TaskForm | SI |
| **Responsibilities** | SI (como `responsibility_id`) | SI (mapeado como `template_key`/`category`) | Parcial: `template_key` en `planner_tasks` | Mantener Tipo como UI mapping | SI (mantener actual) |
| **Verification Flow** | SI (REAL MINIMO parcial) | SI (complete/verify endpoints) | SI (status `awaiting_verification`, `verified`; `verified_at`; anti-autoverificacion) | P1 correcto | SI (mantener actual) |
| **Home Summary** | SI (REAL MINIMO) | SI (endpoint `/api/planner/summary`) | SI (summary service) | P1 limpiar mock Geni | SI |
| **Quick Actions** | SI (acciones universales) | SI (sin presets Planner) | N/A (navegacion) | P2 mantener | SI (mantener) |
| **Realtime/refetch** | NO (mencionado como POST_MVP) | NO (solo `refreshKey` + `plannerChangedAt`) | N/A | P2 futuro | NO |
| **Notifications** | NO (POST_MVP) | NO | NO | P3 futuro | NO |
| **Automations** | NO (POST_MVP) | NO | NO | P3 futuro | NO |
| **Geni** | NO (POST_MVP) | NO | NO | P3 futuro; retirar fake | SI (retirar copy Geni) |
| **Offline** | NO (POST_MVP) | NO | NO | P3 futuro | NO |

## 4. Streaks / Rachas

### Que dice planner.md
- Streaks aparecen en POST_MVP (seccion 2: "Streaks"). No se implementan ahora.
- Los fragments detectan "streaks" como concepto futuro, sin contrato DB/API.

### Estado actual
- **No existe en DB**: no hay tabla `streaks`, no hay campos de racha en `planner_tasks`.
- **No existe en backend**: no hay endpoint, service ni logica de streaks.
- **No existe en frontend**: no se muestran rachas en ningun lugar.
- **Campos disponibles para calcular**: `completed_at`, `verified_at`, `assigned_to_member_id`, `status`, `due_date`, `template_key` existen en `planner_tasks`.

### Opciones

#### A. Real ahora sin DB nueva — DESCARTADO
Crear tabla `streaks` y endpoints dedicados. Requiere DB y backend nuevo. Contradice el principio de no tocar backend/DB en esta etapa.

#### B. Real-lite derivado en frontend/backend summary (RECOMENDADO)
Calcular rachas simples desde datos existentes en `planner_tasks`:
- Contar dias consecutivos con tareas completadas/verificadas por `template_key` o `category`.
- Derivar desde `completed_at` ordenado por fecha.
- Implementar como funcion pura en el summary service (backend) o como derivacion en frontend.
- No requiere DB nueva. Solo logica sobre datos existentes.
- Mostrar en Home o Planner como indicador suave: "3 dias seguidos completando Limpieza".
- Sin ranking entre miembros. Sin gamificacion.

#### C. Requiere DB/backend nuevo — POST_MVP
Tabla `streaks` con `household_id`, `member_id`, `template_key`, `streak_count`, `last_active_date`. Esto es Phase 2c/3.

#### D. Solo visual, no recomendado como real — DESCARTADO
Mostrar texto decorativo sin calculo. Contradice la regla "no progreso falso".

### Recomendacion final
**Opcion B — Real-lite derivado.** Implementar en backend summary (sin DB nueva):
1. Agregar campo opcional `streaks` al response de `getSummary`.
2. Calcular desde `planner_tasks`: para cada `template_key` (o `category`), contar dias consecutivos hacia atras desde hoy donde exista al menos una tarea `completed` o `verified` con `completed_at` en ese dia.
3. Frontend muestra en Home como "Rachas del hogar" con formato: "Limpieza: 5 dias seguidos".
4. Si no hay datos suficientes, no mostrar. Nunca inventar.

**NO implementar: ranking entre personas, gamificacion, tabla dedicada de streaks, endpoints CRUD de streaks.**

## 5. LoadMetrics / Carga familiar

### Que dice planner.md
- Seccion 11 (Home integration): "Carga Familiar mock" aparece en DEMO/MOCK.
- Seccion 2 (POST_MVP): "metricas avanzadas de carga familiar".
- Seccion 13 (checklist impl): "getFamilyLoadMock(...)" clasificado como DEMO/MOCK, "No calculo real".

### Estado actual
- **No existe en DB**: no hay tabla `load_metrics`.
- **No existe en backend**: no hay endpoint de carga familiar.
- **No existe en frontend real**: solo mock visual en la tab Metas ("Carga equilibrada" con badge "Proximamente").
- **Datos disponibles**: `planner_tasks` tiene `assigned_to_member_id`, `status`, `template_key`/`category`, `due_date`.

### Que se puede calcular sin DB nueva
- Distribucion simple por miembro: count de tareas `pending` + `awaiting_verification` agrupadas por `assigned_to_member_id`.
- Distribucion por tipo (`template_key`/`category`) por miembro.
- Total pendientes del hogar.
- Esto es puramente derivativo desde `planner_tasks`.

### Opciones

#### Real-lite derivado (RECOMENDADO)
1. En backend summary, agregar campo `member_load` (array de `{ member_id, pending_count, awaiting_count, total }`).
2. En frontend, mostrar en Home o Planner como indicador simple: "Ana: 3 pendientes, Juan: 1 pendiente".
3. Sin porcentajes falsos. Sin "87% equilibrado". Solo distribucion real.
4. Si un miembro tiene 0 tareas, mostrar "sin tareas asignadas".

#### Real con backend nuevo — POST_MVP
Endpoint dedicado `/api/planner/workload`, calculos de equilibrio, metricas historicas, alertas de sobrecarga. Phase 2c.

### Recomendacion final
**Real-lite derivado en backend summary.** Sin DB nueva. Mostrar en Home como seccion "Carga del hogar" con distribucion real por miembro. Nunca inventar porcentajes de equilibrio.

## 6. Goals / Metas

### Que dice planner.md
- Seccion 2 (POST_MVP): Goals queda fuera del MVP real. "Goals" aparece como POST_MVP.
- Seccion 3.1 (pantalla visualmente terminada): "`Goals` puede aparecer deshabilitado o no aparecer; no implementar logica."
- La spec premium dice: "Goals es futuro/no implementado todavia. Tab Metas se mantiene visible, pero solo como placeholder sobrio."

### Estado actual
- **No existe backend/DB de goals**: no hay tabla `goals`, no hay endpoints. `goal_id` existe como campo en `planner_tasks` pero esta vacio y es POST_MVP.
- **Frontend actual**: tiene placeholder con mock (barra 60%, "Semana organizada", "Carga equilibrada", "Rutinas del hogar" con badges "Proximamente").
- **Contradiccion detectada**: la spec premium dice "sin progreso falso" pero el codigo actual muestra barra 60%.

### Recomendacion
**Placeholder sobrio sin progreso falso.** La spec premium ya define exactamente como debe verse:
- Header: "Metas familiares" + badge "Proximamente".
- Texto: "Mas adelante vas a poder transformar tareas y rutinas en objetivos familiares."
- Card: "No hay metas activas todavia" + copy futuro.
- Lista de capacidades futuras sin metricas.
- **Eliminar**: barra 60%, "Semana organizada", "Carga equilibrada", "Rutinas del hogar", rankings, gamificacion.

**NO implementar Goals reales.** Requiere tabla `goals`, endpoints CRUD, conexion con `planner_tasks.goal_id`. Esto es Phase 2c/3.

### Se puede conectar a tareas completadas sin backend nuevo?
Tecnicamente si (derivar "progreso" desde count de tareas completadas por categoria), pero sin tabla `goals` no hay definicion de objetivos, metas ni targets. Seria progreso sin meta → falso. No implementar.

## 7. Templates / Sugeridas

### Diferenciacion
- **Sugeridas hardcodeadas**: existen en `front/mi-front-limpio/services/plannerTemplates.ts` como array constante `PLANNER_TASK_TEMPLATES`. Son las que aparecen en `TaskForm` como chips de Tipo y sugeridas de titulo. Esto ya esta implementado.
- **Templates CRUD**: requeririan tabla `task_templates` (o similar), endpoints `GET/POST/PATCH/DELETE /api/households/:hid/task-templates`, UI de administracion. Esto es POST_MVP.

### Estado actual
- **Hardcodeadas**: SI. Existen 6 tipos: cleaning, shopping, pets, medication, studies, payments + "General" + "Otro". El backend valida `template_key` contra el mismo set.
- **CRUD**: NO. `planner.md` seccion 4 (Template): "no crear tabla propia; no crear endpoints propios; no implementar CRUD; no convertir templates en feature real."
- **Endpoints actuales**: no hay endpoints de templates. El unico contrato es `template_key` como string validado en `planner_tasks.template_key`.

### Recomendacion
**Mantener sugeridas hardcodeadas. NO implementar CRUD.** Las sugeridas hardcodeadas son suficientes para la etapa actual. Templates CRUD requieren DB nueva (`task_templates`), endpoints nuevos, UI de gestion. Queda para Phase 3 (personalizacion avanzada).

## 8. Responsibilities vs Tipo actual

### Que dice planner.md
- `planner.md` seccion 4 (Task): `responsibility_id` es "obligatorio segun API/DB". Es "REAL MINIMO / dependencia Responsibilities".
- Seccion 5 (Reglas de negocio): "requiere `responsibility_id` segun API/DB".
- Seccion 6 (API): `GET /api/households/:hid/responsibilities` aparece como dependencia externa necesaria.

### Contrato actual implementado
- El MVP real (`supabase/migrations/202606230001_planner_mvp.sql`) **NO uso `responsibility_id`**. En su lugar creo `template_key` + `category`.
- El backend actual (`planner.tasks.service.js`) valida `template_key` contra 6 keys predefinidas (`cleaning`, `shopping`, `pets`, `medication`, `studies`, `payments`).
- El frontend actual (`TaskForm.tsx`) usa `template_key` y `category` como "Tipo" en UI.
- **No existe tabla `responsibilities`** en las migraciones actuales del planner MVP.

### Contradiccion
`planner.md` asume `responsibility_id` como FK a una tabla `responsibilities`, pero la implementacion real del MVP reemplazo eso con `template_key` + `category`. Esto fue una decision de implementacion practica (documentada en el codigo y migraciones, no en `planner.md`).

### Recomendacion
**Mantener Tipo como UI mapping actual (`template_key` + `category`). No migrar a `responsibility_id`.** Migrar ahora requeriria:
1. Crear tabla `responsibilities` (DB nueva).
2. Crear endpoint CRUD de responsibilities (backend nuevo).
3. Crear seeder de responsibilities.
4. Migrar todas las tareas existentes a `responsibility_id`.
5. Cambiar todo el frontend.

Esto es desproporcionado para esta etapa. El contrato actual (`template_key` + `category`) funciona, esta validado en backend, y el usuario nunca ve los nombres tecnicos. La spec premium ya define el mapping UI correcto:
- `template_key='cleaning'` → UI muestra "Limpieza".
- `category='General'` → UI muestra "General" sin `template_key`.

**NO crear tabla `responsibilities` ahora. NO crear endpoints de responsibilities. Mantener el contrato actual.**

## 9. Verification Flow actual vs docs

### Que dicen los docs finales

**planner.md (documento maestro):**
- Estados: `pending`, `in_progress`, `completed`, `cancelled` (persistidos).
- Verification derivada: `awaiting_verification` = `status='completed'` + `requires_verification=true` + `verified_at IS NULL`. `verified` = `status='completed'` + `requires_verification=true` + `verified_at IS NOT NULL`.
- Decision explicita: "no crear enum persistido `awaiting_verification` ni `verified`, porque los fragments detectan verificacion por campos y contradicen estado separado."

**planner_premium_screen_design_spec.md:**
- Estados de UI: `pending`, `completed`, `awaiting_verification`, `verified`, `cancelled`.
- Acciones: completar → si `requires_verification=true` → `awaiting_verification`. Verificar → `verified`.
- Toast: "Tarea enviada a revision", "Tarea verificada".

**planner_final_flow_spec.md:**
- Estados: `pending`, `completed`, `awaiting_verification`, `verified`, `cancelled`.
- Vencida no es status persistido.

### Codigo actual
- **DB (`planner_tasks` status check)**: `pending`, `completed`, `awaiting_verification`, `verified`, `cancelled`. **CONTRADICE `planner.md`** que dice no crear estos estados como persistidos.
- **Backend (`planner.constants.js`)**: mismos 5 estados. `completeTask`: si `requires_verification=true` → setea `status='awaiting_verification'`. `verifyTask`: setea `status='verified'` + `verified_at` + `verified_by_person_id`. Anti-autoverificacion implementada.
- **Frontend (`plannerTasks.ts`)**: `PlannerTaskStatus = 'pending' | 'completed' | 'awaiting_verification' | 'verified' | 'cancelled'`. Coincide con DB/backend reales.

### Contradiccion
Hay una contradiccion entre `planner.md` (que dice NO persistir `awaiting_verification`/`verified`) y la **implementacion real** del MVP (que SI los persiste como estados en `planner_tasks.status`). La implementacion real gano sobre la especificacion original porque era mas simple y directa.

### Recomendacion
**Mantener el contrato actual del backend sin cambios.** El backend ya tiene:
- `POST /api/planner/tasks/:id/complete` → transiciona `pending` → `completed` o `awaiting_verification`.
- `POST /api/planner/tasks/:id/verify` → transiciona `awaiting_verification` → `verified` (con anti-autoverificacion).
- Estados `awaiting_verification` y `verified` son columnas reales en DB.

Modificar esto para que sean "derivados de campos" requeriria cambiar el backend, las migraciones, los CHECK constraints, y todo el frontend. Es un refactor grande sin beneficio de producto.

**Lo que SI debe alinearse**: el `planner.md` documento maestro deberia actualizarse para reflejar la realidad implementada, no al reves. Pero eso no es scope de esta etapa.

## 10. Home Summary

### Que existe hoy
- **Endpoint real**: `GET /api/planner/summary` → `PlannerSummary` con `pending_tasks_count`, `today_tasks_count`, `overdue_tasks_count`, `awaiting_verification_count`, `upcoming_events_count`, `tasks_today`, `overdue_tasks`, `awaiting_verification_tasks`, `upcoming_events`, `briefing_text`.
- **Backend**: `planner.summary.service.js` consulta `planner_tasks` + `planner_events`. Funciona.
- **Frontend Home**: `HomePlannerSections.tsx` consume summary real, muestra briefing, atencion requerida, tareas del hogar (3), proximos eventos (3).
- **Frontend Planner**: `PlannerScreen.tsx` consume summary para stats (Pendientes, Hoy, Vencidas, A revisar).

### Que puede mostrar real hoy
- Stats de tareas (pendientes, hoy, vencidas, a revisar) — YA funciona.
- Proximos eventos — YA funciona.
- Briefing deterministico — YA funciona (texto simple desde backend).
- Lista de 3 tareas urgentes — YA funciona.
- Lista de 3 proximos eventos — YA funciona.

### Que debe dejar de prometer
- **"Geni · resumen del hogar"**: `HomePlannerSections.tsx` linea 93 muestra este copy. Geni no existe. Debe cambiar a "Resumen del hogar".
- **"Chatear con Geni"**: linea 98 muestra CTA falso. Debe eliminarse o reemplazarse por algo no-fake.
- **Icono de Geni**: linea 92 usa `APP_ICONS.home.geni`. Si Geni no es real, usar icono neutro.

### Donde podrian vivir rachas/carga familiar si se implementan real-lite
- Rachas: en Home como seccion nueva "Rachas del hogar" debajo del briefing, o como campo adicional en el summary endpoint.
- Carga familiar: en Home como seccion "Carga del hogar" con distribucion por miembro, o dentro del summary como `member_load`.

Ambos pueden ser campos adicionales en el response de `/api/planner/summary` sin DB nueva.

## 11. Quick Actions

### Confirmaciones
- **NO debe contener presets Planner**: YA se cumple. `QuickActionSheet.tsx` solo tiene "Nueva tarea", "Nuevo evento", "Invitar persona". Sin presets como "Barrer la casa".
- **NO debe incluir "Crear meta"**: YA se cumple. No hay accion de crear meta en Quick Actions. Goals es placeholder.

### Recomendacion
Mantener Quick Actions exactamente como esta. No agregar nada. Si en alguna etapa futura se implementan Goals reales, evaluar si "Crear meta" es accion universal (probablemente no, seria accion dentro de Planner).

## 12. Realtime / refetch

### Que existe hoy
- `PlannerScreen.tsx`: `refreshKey` (incrementado en focus, refresh manual, y `changed()`). `useFocusEffect` dispara refresh.
- `HomePlannerSections.tsx`: escucha `plannerChangedAt` desde `AppRefreshContext`. Refresca en focus y cuando `plannerChangedAt` cambia.
- `planner_final_flow_spec.md` seccion 18 documenta el problema: requests duplicadas, multiples fuentes de refresh, falta de centralizacion.

### Que es suficiente para demo multi-dispositivo
- El sistema actual **funciona** para demo: un dispositivo crea tarea → `markPlannerChanged` → otro dispositivo ve el cambio al re-enfocar.
- No es "tiempo real" (no hay WebSocket/SSE/polling), pero es suficiente para mostrar que los datos se sincronizan entre dispositivos tras interaccion.

### Que queda para robusto
- Centralizar invalidacion (un solo mecanismo, no 3).
- Refetch silencioso (no reemplazar pantalla con spinner si hay datos previos).
- Dedupe de requests.
- WebSocket/Realtime para multi-dispositivo verdadero.

### Recomendacion
**No implementar WebSocket/Realtime ahora.** El mecanismo actual (`refreshKey` + `plannerChangedAt`) es suficiente para demo. Documentar como "P2 futuro". La spec premium ya dice: "Refresh silencioso: no reemplaza toda la pantalla por spinner." Eso es polish, no arquitectura nueva.

## 13. Decisiones finales recomendadas

| Area | Decision | Motivo | Etapa |
|---|---|---|---|
| **Streaks** | Real-lite en backend summary (sin DB nueva). Derivar desde `completed_at` en `planner_tasks`. | No requiere DB nueva. Usa datos reales existentes. No inventa progreso. | P2 esta etapa |
| **LoadMetrics** | Real-lite en backend summary. Agrupar tareas pendientes por `assigned_to_member_id`. | No requiere DB nueva. Distribucion real, no porcentajes falsos. | P2 esta etapa |
| **Goals** | Placeholder sobrio sin progreso falso. Eliminar barra 60%, "Semana organizada", "Carga equilibrada". | Ya definido en spec premium. No hay backend/DB de goals. | P1 esta etapa |
| **Templates** | Mantener sugeridas hardcodeadas. NO implementar CRUD. | CRUD requiere DB nueva (`task_templates`), endpoints nuevos. POST_MVP. | NO esta etapa |
| **Responsibilities** | Mantener contrato actual `template_key` + `category`. NO migrar a `responsibility_id`. | Migrar requeriria tabla `responsibilities` (DB nueva), endpoints, seeders, refactor frontend completo. | NO esta etapa |
| **Verification Flow** | Mantener estados persistidos actuales (`awaiting_verification`, `verified`). NO cambiar a derivados. | Backend ya funciona con estados reales. `planner.md` esta desactualizado. Cambiar romperia DB+backend. | NO tocar |
| **Home Summary** | Retirar copy "Geni" falso. Usar "Resumen del hogar". Agregar streaks/load real-lite si entran. | Geni no existe. No prometer features inexistentes. | P1 esta etapa |
| **Quick Actions** | Mantener exactamente como esta. Sin presets, sin "Crear meta". | Ya cumple las reglas. Universal, no especifico de Planner. | NO tocar |
| **Realtime** | Mantener `refreshKey` + `plannerChangedAt`. NO implementar WebSocket. | Suficiente para demo multi-dispositivo. WebSocket es POST_MVP. | NO tocar |
| **Geni** | Retirar copy "Geni" de Home. NO implementar Geni real. | Geni no existe. "Chatear con Geni" es CTA falso. | P1 esta etapa |

## 14. Nuevo roadmap de implementacion final

### 5D completada (AHORA)
Planner Final Scope Reconciliation — este documento.

### Etapa 5E — Calendar Cleanup (P0)
- Quitar CTAs superiores ("Crear tarea", "Nuevo").
- Month compacto sin superposiciones, solo dots + agenda inferior.
- Crear task/event desde `selectedDate` (CTA inferiores).
- Header compacto con navegacion temporal por iconos.

### Etapa 5F — TaskCards (P1)
- Quitar checkbox visible permanente.
- Swipe derecha completa, swipe izquierda cancela.
- Menu accesible (long press).
- Avatar/inicial para responsable.
- Prioridad por borde lateral.

### Etapa 5G — Tasks Filters (P1)
- Filtros visibles minimos: Hoy, Pendientes, Mias, Atencion.
- Tipo como control secundario colapsado.
- Narrativa visual: Atencion → Hoy → Proximas.

### Etapa 5H — EventForm (P1)
- Fecha contextual desde `selectedDate`.
- `initialDate` equivalente a `TaskForm.initialDueDate`.
- Descripcion/repeticion colapsadas.
- Footer sticky unificado.

### Etapa 5I — Goals Placeholder (P1/P2)
- Eliminar barra 60%, progreso falso.
- Placeholder sobrio: "Proximamente" + lista de capacidades futuras.
- Sin metricas falsas.

### Etapa 5J — Home/QuickActions Alignment (P2)
- Retirar copy "Geni" de Home.
- Usar "Resumen del hogar" deterministico.
- Eliminar CTA "Chatear con Geni".
- Si se decide: agregar streaks y carga familiar real-lite al summary.

### Etapa 5K — Streaks/LoadMetrics real-lite (P2, opcional)
- Agregar `streaks` y `member_load` al response de `/api/planner/summary`.
- Solo si el backend lo permite sin DB nueva.
- Frontend muestra en Home si hay datos.

### Etapa 5L — Performance/refetch (P2)
- Refetch silencioso (no reemplazar pantalla con spinner).
- Mantener datos previos durante refresh.
- Skeleton solo en carga inicial.

### Etapa 5M — QA final (P2)
- Consola limpia de warnings/ logs debug.
- Empty/loading/error consistente en todas las pantallas.
- Safe area, touch targets, keyboard avoidance.
- Mobile small/large verificados.

## 15. Que requiere backend/DB

| Feature | Requiere DB | Requiere backend | Riesgo | Recomendacion |
|---|---|---|---|---|
| **Goals reales** | SI — tabla `goals` | SI — endpoints CRUD goals | Alto: define dominio nuevo | POST_MVP / Phase 2c |
| **Milestones** | SI — tabla `milestones` | SI — endpoints | Alto: acoplado a goals | POST_MVP / Phase 2c |
| **Templates CRUD** | SI — tabla `task_templates` | SI — CRUD endpoints | Medio: rompe contrato actual `template_key` | POST_MVP / Phase 3 |
| **Responsibilities table** | SI — tabla `responsibilities` | SI — CRUD + seeders | Alto: migrar todas las tasks existentes | POST_MVP / No prioritario |
| **Streaks tabla dedicada** | SI — tabla `streaks` | SI — endpoints streaks | Medio | POST_MVP / Phase 2c |
| **Load metrics avanzados** | SI — tabla `workload_history` | SI — endpoints workload | Medio | POST_MVP / Phase 2c |
| **Geni real** | SI — infraestructura AI | SI — endpoints Geni | Critico: requiere AI pipeline | POST_MVP / Phase 3 |
| **Automations** | SI — tabla `automation_rules` | SI — scheduler + endpoints | Alto | POST_MVP / Phase 3 |
| **Notifications push** | SI — tokens + jobs | SI — push service | Alto | POST_MVP / Phase 3 |
| **Realtime WebSocket** | NO | SI — WebSocket server | Medio: infraestructura nueva | POST_MVP / Phase 2c |
| **Offline sync** | NO | SI — sync engine | Alto: complejidad alta | POST_MVP |

## 16. Que puede hacerse solo frontend

| Feature | Solo frontend? | Datos necesarios |
|---|---|---|
| **Calendar cleanup** | SI | Ninguno nuevo (usa `getPlannerCalendar`) |
| **TaskCards premium** | SI | Ninguno nuevo (usa `listPlannerTasks`) |
| **Tasks filters** | SI | Ninguno nuevo (filtrado client-side) |
| **EventForm polish** | SI | Ninguno nuevo (usa `createPlannerEvent`) |
| **Goals placeholder** | SI | Ninguno (no consume API) |
| **Home copy cleanup** | SI | Ninguno nuevo (usa `getPlannerSummary`) |
| **Quick Actions mantenimiento** | SI | Ninguno nuevo (solo navegacion) |
| **Skeletons/loading polish** | SI | Ninguno nuevo |
| **Empty states premium** | SI | Ninguno nuevo |
| **Microcopy/toast/alerts** | SI | Ninguno nuevo |

## 17. Que NO mostrar como real

Lista de cosas que el codigo actual muestra como "reales" pero no lo son, y deben retirarse o marcarse claramente como "Proximamente":

| Elemento | Ubicacion actual | Por que es falso | Accion |
|---|---|---|---|
| **Barra 60% "Semana organizada"** | `PlannerScreen.tsx` linea 278 | No hay datos de progreso. Es mock visual. | Eliminar |
| **"Carga equilibrada" card** | `PlannerScreen.tsx` linea 286 | No existe distribucion real calculada. | Eliminar o reemplazar con real-lite |
| **"Rutinas del hogar" card** | `PlannerScreen.tsx` linea 303 | No hay habitos reales. Es futuro. | Eliminar |
| **"Geni · resumen del hogar"** | `HomePlannerSections.tsx` linea 93 | Geni no existe. Briefing es deterministico. | Cambiar a "Resumen del hogar" |
| **"Chatear con Geni" CTA** | `HomePlannerSections.tsx` linea 98 | No hay chat real con Geni. | Eliminar |
| **Icono Geni en briefing** | `HomePlannerSections.tsx` linea 92 | Geni no existe. | Cambiar a icono neutro |

## 18. Conclusion

Planner actual tiene una base solida real: tasks CRUD, events CRUD, calendar Month/Week/Day, verification flow completo con anti-autoverificacion, summary endpoint, Home integration y Quick Actions universales. Todo esta conectado a `/api/planner`.

La deuda principal NO es de funcionalidad faltante, sino de:
1. **Jerarquia visual**: Calendar compite consigo mismo, TaskForm mezcla fases, TaskCard satura con botones.
2. **Promesas falsas**: Goals muestra progreso fake, Home muestra "Geni" inexistente.
3. **Consistencia premium**: loading/empty/error no unificados, skeletons vs spinners.

Los features "nuevos" de esta etapa son realmente **polish premium sobre features existentes**, mas dos adiciones real-lite opcionales (streaks + carga familiar) que pueden derivarse de datos existentes sin DB nueva.

Los features grandes (Goals reales, Templates CRUD, Responsibilities table, Geni, Automations, Realtime) son POST_MVP y requieren DB/backend nuevos. Ninguno debe implementarse ahora.

### Roadmap ejecutivo
1. Calendar cleanup (quitar CTAs duplicados, Month compacto).
2. TaskCards premium (sin checkbox visible, gestos, avatares).
3. Tasks filters (filtros minimos, Tipo secundario).
4. EventForm polish (fecha contextual, footer sticky).
5. Goals placeholder (eliminar mock, placeholder sobrio).
6. Home alignment (retirar Geni fake, opcional: streaks/load real-lite).
7. QA final (estados, skeletons, microcopy).