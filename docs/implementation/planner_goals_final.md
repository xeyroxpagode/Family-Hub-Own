# Planner Goals - Especificacion final de implementacion

Estado: fuente de verdad para implementar Planner Goals. Actualizado el 10/07/2026 con el estado real implementado (Phase 0 a Phase 2 completadas) y las decisiones de producto del 10/07/2026 sobre Goals como planes accionables, templates y streaks.
Alcance: producto, UX, modelo de datos, API esperada, RLS, integracion con Tasks/Home y auditoria del estado actual.
Regla de esta tarea: no se implementa codigo, no se modifica backend, frontend, servicios ni migraciones.

Aviso: el backend de Goals funciona tecnicamente (DB, API, RLS, progress_mode, milestones, complete/fail), pero la UI actual todavia no es la UX final aceptada. Ver "Estado actual implementado" y "Problemas UX observados en prueba real" mas abajo. El siguiente paso es implementar T1 — Goals Tasks Core: progreso real de tasks, crear tarea desde GoalDetail y TaskForm contextual.

## 1. Objetivo del documento

Este documento es la fuente de verdad para implementar Goals/Metas dentro de Planner.

Antes de modificar codigo, backend, frontend, servicios o DB, el agente de implementacion debe leer este documento y seguir sus decisiones. Si encuentra una contradiccion entre documentos historicos y esta especificacion, prevalece esta especificacion.

La razon de este cierre es que Planner Goals empezo a implementarse demasiado pronto y aparecieron inconsistencias de UX/backend. La siguiente etapa debe corregir el rumbo: primero especificacion final, despues implementacion por fases.

## Complemento Product/UX

El complemento Product/UX vive en `docs/implementation/planner_goals_product_ux_spec.md`.

Ese documento forma parte de esta fuente de verdad. La implementacion final debe seguir ambos documentos: esta especificacion general define el contrato integral de producto, datos, API, permisos e integracion; el complemento Product/UX define la experiencia concreta, los modos de progreso y las decisiones de interaccion.

Si una decision de implementacion parece contradecir cualquiera de los dos documentos, se debe actualizar la documentacion primero y recien despues implementar.

## 2. Fuentes revisadas

### Documentacion de Planner reciente

- `docs/planner_final.md`: define Planner MVP real minimo con Tasks, Events, Calendar y Home; Goals queda fuera del MVP y solo puede aparecer deshabilitado o no aparecer.
- `docs/implementation/planner_final_flow_spec.md`: aporta la jerarquia final: Home resume, Planner administra, Quick Actions inicia acciones universales. Refuerza que Planner tiene tabs internas y no debe mostrar lenguaje tecnico.
- `docs/implementation/planner_final_update_scope.md`: identifica Goals y Milestones como POST_MVP en la etapa anterior; detecta que el placeholder con progreso falso era incorrecto; aporta la regla "no progreso falso".
- `docs/implementation/homeplus_planner_design_spec.md`: define Planner como agenda familiar accionable y mantiene tabs Tareas, Calendario y Metas; Metas se describe como expansion futura.
- `docs/implementation/planner_premium_screen_design_spec.md`: refuerza que Goals era futuro/no implementado, pero deja reglas utiles para UX: Metas dentro de Planner, microcopy claro, loading/empty/error, y evitar mocks con progreso falso.
- `docs/professionalization/uix_006_planner_premium_audit.md`: audita el estado visual anterior de Planner; detecta Goals como mock dentro de `PlannerScreen` y deuda de Home/TaskForm.
- `docs/professionalization/uix_007_planner_full_experience_audit.md`: aporta problemas actuales de UX: Goals parecia feature semi-real sin backend, Home prometia Geni, TaskForm usaba fechas tecnicas y habia demasiada carga visual.

### Documentacion historica y producto

- `docsGeneral/HomePlus — FinalSpec.md`: fuente conceptual principal de Goals. Define Goals para objetivos personales/familiares, estructura Goal -> Hitos -> Tasks, estados Activa/Completada/Fallida, integracion con Tasks, Finance, Fondos y Geni. Tambien define que Goals vive dentro de Planner, no como dominio independiente.
- `docsGeneral/HomePlus — Esquema de base de datos v1.md`: define modelo historico de `goals` y `milestones`, privacidad personal, RLS y permisos esperados. La migracion actual usa nombres `planner_goals` y `planner_goal_milestones`, pero conserva la idea central.
- `docsGeneral/HomePlus — Api + TestCases + Edgecases V1.md`: define contrato historico bajo `/api/households/:hid/goals`; la ruta actual encontrada es `/api/planner/goals`. Aporta request/response esperados, eventos `goal.completed` y `goal.failed`, y privacidad de goals personales.
- `docsGeneral/HomePlus — Diseño de Pantallas de Home V1.md`: ubica Planner como Tasks/Calendar/Goals y aporta la idea de Home con progreso/logros sin leaderboard ni comparacion agresiva.
- `docsGeneral/HomePlus — Desing system v1.md`: aporta uso de progress bar para Tasks/Goals y regla emocional: la barra de progreso no debe mostrar "deuda" ni culpa.
- `docsGeneral/HomePlus — SECCION 1 PRODUCTO.md`: confirma que Planner administra tareas, calendario y metas.
- `docsGeneral/HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md`: aporta reglas de producto: dashboards muestran realidad, no aspiraciones; metas privadas son privadas; una meta en riesgo puede mostrarse como alerta si el dato es real.
- `docsGeneral/HomePlus — SECCION 6 UX PHILOSOPHY.md`: aporta progressive disclosure, navegacion corta, Planner como Tasks/Calendar/Goals y relacion Task -> Goal.
- `docsGeneral/HomePlus — SECCION 8 DATA PHILOSOPHY.md`: define metas individuales como datos personales privados por defecto y logros integrados dentro de Goals, no como dominio separado.

### Fragmentos y documentos duplicados relevantes

- `docsGeneral/Entrega/Planner/planner_final.md`: copia equivalente de `docs/planner_final.md`; confirma Goals fuera del MVP anterior.
- `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_Api_TestCases_Edgecases_V1_2.md`: fragmento API; aporta lo mismo que la API historica, sin reglas nuevas.
- `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_Esquema_de_base_de_datos_v1.md`: fragmento DB; aporta lo mismo que el esquema historico, sin reglas nuevas.
- `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_Design_System_V2.md`: confirma Goals dentro de Planner, pero POST_MVP en ese fragmento; aporta ProgressBar.
- `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_SECCION_1_PRODUCTO.md`: confirma Planner como Tasks/Calendar/Goals, con Goals conceptual.
- `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_SECCION_2_PRINCIPIOS_DEL_PRODUCTO.md`: confirma Goals/Hitos/progreso como conceptos.
- `docsGeneral/Entrega/Planner/planner_fragment_HomePlus_SECCION_6_UX_PHILOSOPHY.md`: confirma Task -> Goal, Goal progress y Milestones; los marca POST_MVP para la etapa anterior.
- `docsGeneral/Entrega/Planner/planner_fragment_SECCION_8_DATA_PHILOSOPHY.md`: aporta privacidad y contradicciones historicas de estados.
- `docsGeneral/Basura/planner_frontend_ideal_spec_actualizado.md`: documento viejo pero util porque explicita que Goals reales requieren modelo propio y lista futuro: Goals personales/familiares, hitos, progreso, relacion Goal -> Tasks, cards en Home y progress bars.
- `docsGeneral/Basura/frontend_planner_ux_final.md`: aporta advertencia de no prometer progreso real si no existe backend real.
- `docsGeneral/Basura/Contrato DB-API Planner MVP.md`: no aporto contenido nuevo util de Goals final; sirve como contexto de contrato MVP viejo.
- `docsGeneral/Basura/planner_fragment.md`: no aporto reglas nuevas; confirma ubicacion conceptual.
- `docsGeneral/Basura/ALL_FRAGMENTS_FROM_PLANNER_TO_MERGE.md`: confirma que los fragments mezclaban Goals conceptual con POST_MVP.

### Documentacion relacionada sin contenido decisivo de Goals

- `docs/deploy/planner_inventory.md`: aporta que `planner_tasks.goal_id` existe como relacion posible y que Inventory debe generar Tasks, no Goals, en la fase actual.
- `docs/deploy/planner_inventory_qa.md`: no agrega reglas utiles para Goals; solo QA de Planner/Inventory.

## 3. Ubicacion de Goals dentro de Planner

Goals vive dentro de Planner. No es un modulo independiente de bottom navigation.

Planner contiene:

- Tasks / Tareas.
- Calendar / Events / Calendario.
- Goals / Metas.

La navegacion final esperada:

- Bottom Nav mantiene `Home | People | + | Planner | More`.
- `Planner` abre un stack o shell interna.
- Dentro de Planner debe existir una entrada `Metas` junto a `Tareas` y `Calendario`.
- `CreateGoalScreen`, `EditGoalScreen` y `GoalDetailScreen`, si existen, pertenecen al stack de Planner.
- Home puede navegar a una meta destacada, pero no administra Goals.

Goals no debe aparecer como tab principal fuera de Planner ni como herramienta aislada en More.

## 4. Definicion funcional de Goals

Goals representa objetivos reales del hogar o de una persona.

**Goals son planes accionables.** Una meta puede empezar simple, pero debe poder convertirse en un conjunto de tareas reales para avanzar.

Tipos funcionales:

- Meta personal: objetivo privado de un miembro.
- Meta familiar / household: objetivo compartido del hogar.
- Meta financiera: soportada conceptualmente por la documentacion historica, pero la integracion con Finance/Fondos queda futura salvo que exista soporte tecnico real.

Una Goal puede funcionar como:

- **Meta simple:** objetivo con progreso medible, sin tareas vinculadas.
- **Plan con tareas:** meta que contiene un conjunto de tareas reales para avanzar.
- **Plan con hitos y tareas:** meta dividida en pasos (hitos), cada uno con tareas opcionales.
- **Task pack generado desde template:** meta creada a partir de una plantilla que incluye tareas sugeridas, hitos opcionales y responsables sugeridos (futuro: T2 — Templates).

Una Goal puede tener:

- titulo y descripcion;
- visibilidad personal o familiar;
- categoria;
- modo de progreso (`progress_mode`);
- medicion tecnica opcional (`target_type`);
- progreso (`current_value`, `target_value`, `unit`, `progress_percentage`);
- fechas opcionales de inicio y fin;
- estado;
- hitos;
- tareas vinculadas mediante `planner_tasks.goal_id`.

Goals es action-driven, no solo un registro CRUD. La experiencia principal debe permitir crear la meta rapido y luego registrar progreso con acciones concretas:

- checkear un paso;
- completar una tarea vinculada;
- sumar avance numerico;
- marcar la meta como lograda.

`target_type` ya no alcanza por si solo para decidir la UX. `target_type=null` es ambiguo porque puede significar sin medicion, progreso por pasos o progreso por tareas. La decision final es usar `progress_mode` como campo principal de experiencia y dejar `target_type` como detalle de compatibilidad para medicion numerica/booleana.

Achievements/logros se integran dentro de Goals. No se crea un dominio separado de Achievements.

Fuera de alcance para primera implementacion real:

- Geni estimando progreso;
- Finance/Fondos actualizando progreso automaticamente;
- ranking, XP, gamificacion agresiva o comparacion entre miembros;
- automatizaciones que creen o completen metas;
- notificaciones/event feed de Goals, salvo que ya exista infraestructura y se habilite en una fase posterior.

## 5. Modelo de datos final esperado

### Migracion actual encontrada

Migracion actual de Goals:

- `supabase/migrations/202607080004_planner_goals.sql`

Migraciones relacionadas:

- `supabase/migrations/202606230001_planner_mvp.sql`: crea `planner_tasks`.
- `supabase/migrations/202607080003_planner_tasks_origin_fields.sql`: agrega origen de tareas desde modulos externos.

### `planner_goals`

Campos esperados:

- `id`
- `household_id`
- `title`
- `description`
- `visibility`
- `category`
- `progress_mode`
- `target_type`
- `target_value`
- `current_value`
- `unit`
- `starts_at`
- `ends_at`
- `status`
- `created_by_member_id`
- `completed_at`
- `failed_at`
- `deleted_at`
- `created_at`
- `updated_at`

Enums esperados:

- `visibility`: `household`, `personal`.
- `category`: `home`, `family`, `finance`, `health`, `education`, `other`.
- `progress_mode`: `steps`, `tasks`, `numeric`, `boolean`, `none`.
- `target_type`: `count`, `percentage`, `amount`, `boolean`, o `null`.
- `status`: `active`, `completed`, `failed`.

Compatibilidad `progress_mode` + `target_type`:

- `steps`: `target_type=null`.
- `tasks`: `target_type=null`.
- `numeric`: `target_type=count`, `amount` o `percentage`.
- `boolean`: `target_type=boolean`.
- `none`: `target_type=null`.

`planner_goals.progress_mode` debe agregarse como `text` con check/enum equivalente si la schema actual no lo tiene. El default recomendado es `steps`, porque permite crear una meta rapidamente y dividirla en pasos desde el detalle.

### `planner_goal_milestones`

Campos esperados:

- `id`
- `goal_id`
- `title`
- `target_value`
- `achieved`
- `achieved_at`
- `sort_order`
- `deleted_at`
- `created_at`
- `updated_at`

### Relacion con Tasks

`planner_tasks.goal_id` debe existir como FK opcional hacia `planner_goals.id`.

Reglas:

- Una task puede no estar vinculada a ninguna meta.
- Una task solo puede vincularse a una meta visible/editable del mismo household.
- Al borrar una meta, las tareas vinculadas no deben borrarse; la FK actual `on delete set null` es correcta.

## 6. Estados y transiciones

Estados oficiales:

- `active`: meta activa.
- `completed`: meta lograda.
- `failed`: meta fallida/no lograda.

Transiciones:

- `active -> completed`
- `active -> failed`

Estados terminales:

- `completed` es terminal.
- `failed` es terminal.

No existe `cancelled` para Goals, salvo que una fuente futura lo apruebe explicitamente y haya migracion/contrato nuevo.

Comportamiento temporal:

- Al completar: setear `status='completed'`, setear `completed_at=now()`, no setear `failed_at`.
- Al fallar: setear `status='failed'`, setear `failed_at=now()`, no setear `completed_at`.
- No se debe permitir cambiar `status` con PATCH generico. Usar endpoints explicitos `complete` y `fail`.
- Delete debe ser soft-delete con `deleted_at`.

## 7. Visibilidad y permisos

Visibilidades:

- `household`: visible para miembros activos del household.
- `personal`: visible solo para quien la creo, salvo una regla futura explicita.

Reglas de privacidad:

- Las metas personales son privadas para su creador.
- Un coordinador no debe poder ver o editar automaticamente metas personales de otro miembro sin una regla aprobada.
- La privacidad personal prevalece sobre la conveniencia administrativa.

Creacion:

- Usuario autenticado.
- Debe existir `person`.
- Debe existir `active_household_id`.
- Debe existir membership activa en ese household.
- Backend debe resolver `household_id` desde el contexto autenticado.
- Backend debe resolver `created_by_member_id` desde membership activa.
- Backend no debe confiar en `household_id` ni `created_by_member_id` enviados por cliente.

Edicion/eliminacion:

- Meta `personal`: solo su `created_by_member_id`.
- Meta `household`: puede editar/eliminar el creador y, si producto lo aprueba, otros adultos/coordinadores del household. La implementacion actual permite miembros activos con acceso; esto debe revisarse contra roles antes de cerrar permisos finales.
- Milestones heredan permisos de la Goal.

RLS esperada:

- SELECT household: miembros activos.
- SELECT personal: creador.
- INSERT: miembro activo y `created_by_member_id = current_household_member_id(household_id)`.
- UPDATE personal: creador.
- UPDATE household: reglas de rol aprobadas, sin saltarse household activo.
- Milestones: solo si la Goal es visible/editable.

## 8. Progress calculation

`progress_percentage` es dato derivado. Debe calcularse primero por `progress_mode`; `target_type` solo aplica dentro de `numeric` y `boolean`.

Reglas por `progress_mode`:

- `steps`: `hitos logrados / hitos totales * 100`, limitado a 0..100. Si no hay hitos, `progress_percentage` debe ser `null` y la UI no debe mostrar 0% falso.
- `tasks`: `tareas computables completadas / tareas computables totales * 100`, limitado a 0..100. Si no hay tareas vinculadas computables, `progress_percentage` debe ser `null`.
- `numeric`: usar `current_value / target_value * 100` para `count` y `amount`; para `percentage`, `current_value` representa el porcentaje o se compara contra `target_value` si se definio explicitamente.
- `boolean`: pendiente/lograda. Pendiente es 0%; lograda es 100%.
- `none`: no hay porcentaje ni barra de progreso.

### Reglas precisas para tasks progress (decision del 10/07/2026)

Para `progress_mode='tasks'`, la fuente de progreso son las tareas vinculadas computables.

**Numerador (completed_tasks):**
- `status='completed'`
- `status='verified'`

**No completada:**
- `status='pending'`
- `status='awaiting_verification'`

**Excluidas del total:**
- `status='cancelled'`
- tareas con `deleted_at` no null (soft-deleted)

**Importante:** `goal.requires_verification` NO controla el progreso de tasks. La verificacion pertenece a Task, no a Goal. `awaiting_verification` nunca cuenta como completada hasta que pasa a `verified`.

Una task cuenta una sola vez aunque este asociada a un hito.

**Resultados por estado:**

| Total computable | Completadas | progress_percentage | UI copy |
|---:|---:|---|---|
| 0 | 0 | `null` | "Todavia no hay tareas" |
| >0 | 0 | `0` real | "0 de N tareas terminadas" |
| >0 | < total | de 1 a 99 | "X de N tareas terminadas" |
| total | total | `100` | "Todas las tareas estan listas" |

**Al llegar a 100%:** NO auto-completar la meta. La app sugiere la accion siguiente; el usuario confirma el resultado (principio §4.6).

Reglas de `target_type`:

- `target_type` solo decide la unidad tecnica dentro de `numeric` y `boolean`.
- `numeric` permite `count`, `amount` o `percentage`.
- `boolean` usa `target_type=boolean`.
- `steps`, `tasks` y `none` usan `target_type=null`.

Reglas numericas:

- `current_value` no puede ser negativo.
- `target_value` no puede ser negativo.
- Si `progress_mode=numeric`, `target_value` deberia estar definido y ser mayor a 0 salvo decision explicita de producto.
- Si `target_value` es 0 o null, no se debe fingir avance cuantitativo.

Milestones:

- En `steps`, milestones son la fuente primaria de progreso.
- Marcar/desmarcar un milestone recalcula el progreso derivado de pasos.
- No deben modificar automaticamente `current_value` salvo que el contrato backend lo implemente de forma explicita para compatibilidad.

Tasks:

- En `tasks`, las tareas vinculadas son la fuente primaria de progreso.
- Completar/descompletar una tarea vinculada puede cambiar el progreso derivado si esa fase esta implementada.
- En otros modos, una tarea vinculada puede mostrarse como contexto sin cambiar el porcentaje.

Finance/Fondos:

- Las metas financieras y fondos vinculados quedan como futuro hasta que Finance/Fondos tenga soporte tecnico disponible.

Visualizacion:

- Mostrar `progress_percentage` redondeado para lectura (`42%`) solo si existe un porcentaje real.
- No mostrar barra si `progress_percentage === null`; usar texto como "Sin progreso medible" o un estado especifico del modo.
- La barra nunca debe comunicar culpa/deuda. Para "en riesgo", usar copy informativo y datos reales.

## 9. Milestones

Milestones/Hitos son avances parciales de una Goal.

Funcionalidad esperada:

- listar hitos por goal;
- crear hito;
- editar titulo, `target_value`, `sort_order`;
- marcar logrado/no logrado;
- eliminar con soft-delete;
- ordenar por `sort_order`, luego `created_at`;
- setear `achieved_at` cuando `achieved=true`;
- limpiar `achieved_at` cuando `achieved=false`.

UX esperada:

- En `GoalDetailScreen`, mostrar seccion "Hitos".
- Crear hito con input corto y accion clara.
- Marcar logrado con control tactil accesible.
- Confirmar borrado de hito.
- No saturar la pantalla con progreso tecnico.

Relacion con progreso:

- En `progress_mode=steps`, hitos son el mecanismo primario de progreso.
- Progreso de pasos = hitos logrados / hitos totales.
- Marcar un hito como logrado/no logrado debe actualizar el progreso de pasos.
- No recalculan `current_value` automaticamente hasta que se implemente una regla server-side explicita para compatibilidad.
- Si no hay hitos, la UI no debe mostrar 0% falso.

## 10. Tasks <-> Goals integration

### Lo que debe ser real ahora (T1 — Goals Tasks Core)

Prioridad inmediata de implementacion. No es streaks, no es templates. Es hacer que las tareas vinculadas muevan progreso real.

- `GET /api/planner/tasks?goal_id=:goalId`: query backend eficiente de tareas por goal.
- `calculateProgress` para `progress_mode='tasks'`: derivar progreso real usando las reglas definidas en §8 (completed+verified / computables totales).
- `GoalDetailScreen` debe mostrar tareas vinculadas con el progreso real calculado por backend.
- Desde `GoalDetailScreen`, el usuario debe poder crear una tarea ya vinculada a la meta (TaskForm contextual).
- TaskForm contextual: `goal_id` preasignado, `goal_milestone_id` preasignado si proviene de hito, titulo "Nueva tarea", subtitulo "Para: [goal title]", sin selector de meta visible.
- Al guardar task desde GoalDetail: volver a GoalDetail, refrescar tareas vinculadas, refrescar goal/progreso, mostrar "Tarea creada".
- Sin herencia silenciosa de categoria, prioridad, responsable o fecha. Solo sugerencias si el usuario las acepta.
- `PlannerTasksScreen`: badge de meta vinculada en task card.

### Lo que queda para T2 — Templates / Presets

- Templates como plantillas reutilizables para crear Goals con tareas sugeridas.
- Template Picker + Preview antes de crear goal.
- Crear Goal + tareas desde template.
- Sin recurrencia, sin streaks, sin auto-asignacion en T2.

### Lo que queda para T3/T4 — Streaks / Rachas

- Rachas basadas en oportunidad programada, no obligacion diaria.
- Si una task toca lunes/miercoles/viernes, la racha se evalua esos dias.
- Dias sin tarea programada no rompen racha.
- Completar dentro de ventana de gracia mantiene racha.
- Copys sin culpa: "Seguis en ritmo", "Se corto el ritmo. Podes retomar ahora."
- T3: especificacion de producto detallada de streaks.
- T4: implementacion de streaks (DB, endpoints, UI).

## 11. Home integration

Home resume. Planner administra.

Home puede mostrar:

- una meta destacada;
- una meta en riesgo;
- resumen corto de progreso real;
- CTA "Ver" hacia `GoalDetailScreen` dentro de Planner.

Reglas para no abrumar Home:

- Mostrar como maximo una card de Goals.
- No mostrar Goals si no hay metas activas reales.
- No mostrar progreso inventado.
- No mezclar Goals con Geni si no hay Geni real.
- No permitir crear/editar goals desde Home.
- Home no administra goals; solo resume y navega a Planner.

Meta en riesgo:

- Solo si `ends_at` existe, `status='active'`, quedan pocos dias y `progress_percentage` es real y bajo.
- Si `progress_percentage` es null, no marcar "en riesgo" por progreso.

Real ahora vs despues:

- Ahora: una card destacada/en riesgo si hay Goals reales cargadas.
- Despues: summary backend dedicado, alertas, eventos de activity/feed y recomendaciones.

## 12. UX final specification

Pantallas/componentes esperados:

- `PlannerGoalsScreen`: lista de metas dentro de Planner.
- `GoalDetailScreen`: detalle, progreso, hitos, tareas vinculadas y acciones terminales.
- `GoalForm`: crear/editar meta.
- `CreateGoalScreen` y `EditGoalScreen`: wrappers de navegacion si el stack lo requiere.

Estados:

- Loading inicial: skeleton o indicador consistente con el sistema.
- Refresh: no reemplazar toda la pantalla si ya hay datos.
- Empty: copy claro, sin prometer funcionalidades futuras no implementadas.
- Error: mensaje recuperable con retry.
- Confirmaciones: completar/fallar/eliminar goal; eliminar hito.

Mobile-first:

- Controles tactiles comodos.
- Form scrollable con submit visible o al final claro.
- Keyboard-safe con `KeyboardAwareScrollView` o equivalente.
- No texto tecnico visible: no mostrar `target_type`, `goal_id`, `current_value`, `created_by_member_id`.
- Evitar que el usuario escriba fechas `YYYY-MM-DD` a ciegas. Usar presets, calendario, selector o al menos inputs guiados con validacion y no enviar parciales invalidos.

Crear en 10 segundos:

- La pantalla de creacion solo pregunta por defecto titulo, categoria y visibilidad.
- `description` es opcional.
- El modo recomendado por defecto es `progress_mode=steps`.
- Despues de crear, navegar a `GoalDetailScreen`.
- En el detalle, mostrar acciones inmediatas: "Agregar paso", "Crear tarea", "Ahora no".

Acciones rapidas de progreso:

- `steps`: check/uncheck de hito.
- `tasks`: completar tarea vinculada y crear tarea ya vinculada.
- `numeric`: accion "Sumar avance".
- `boolean`: accion "Marcar como lograda".
- `none`: no mostrar barra ni porcentaje.

Progressive disclosure:

- Form simple primero.
- Opciones de progreso colapsadas.
- Opciones de fecha colapsadas.
- Hitos se administran en detalle, no en create simple.

## 13. GoalForm final UX

Ruta simple por defecto:

- `title`: requerido.
- `description`: opcional.
- `category`: requerido con default `home`.
- `visibility`: requerido con default `household`.
- `progress_mode`: default recomendado `steps`, sin exponer nombre tecnico.

Opciones colapsadas por defecto:

- Progreso / medicion.
- Fechas.

Reglas de validacion:

- Titulo no vacio.
- Categoria en enum permitido.
- Visibilidad en enum permitido.
- Si no se abre Progreso, enviar `progress_mode=steps`, `target_type=null`, `target_value=null`, `current_value=0`, `unit=null`.
- Si se abre Progreso:
  - elegir primero un modo humano: pasos, tareas, numero, logrado/no logrado o sin progreso.
  - mapear ese modo a `progress_mode`.
  - `current_value` numerico >= 0.
  - `target_value` numerico >= 0 cuando aplique.
  - `boolean` no necesita valor objetivo visible.
  - `percentage` debe guiar con `%`.
  - `amount` debe pedir unidad/moneda o mostrar default.
- Si se abre Fechas:
  - No enviar strings vacios.
  - No enviar fechas parciales.
  - `starts_at` y `ends_at` deben ser fechas validas.
  - Si ambas existen, `ends_at >= starts_at`.

Labels en espanol:

- `Nombre de la meta`
- `Descripcion`
- `Categoria`
- `Visibilidad`
- `Progreso`
- `Fechas`
- `Avance`
- `Objetivo`
- `Unidad`
- `Agregar paso`
- `Crear tarea`
- `Sumar avance`
- `Marcar como lograda`
- `Crear meta`
- `Guardar cambios`

Problemas a evitar:

- No pedir `YYYY-MM-DD` como unico camino.
- No mostrar todas las opciones avanzadas al crear una meta simple.
- No mostrar labels tecnicos como `target_type`, `current_value` o `target_value`.
- No enviar `current_value` invalido o `NaN`.
- No enviar `target_value` como `NaN`.

## 14. API contract expected

Ruta actual encontrada:

- Base: `/api/planner/goals`

La documentacion historica usaba `/api/households/:hid/goals`; la implementacion actual debe mantener `/api/planner/goals` porque el backend resuelve household activo desde el token.

`progress_mode` debe existir en request/response. Si la schema actual no lo tiene, se requiere una migracion DB/API/client types antes de la implementacion final de Product/UX.

### List

`GET /api/planner/goals`

Query opcional:

- `status`
- `category`
- `visibility`
- `only_mine`
- `ends_at_from`
- `ends_at_to`
- `limit`

Response:

```json
{
  "goals": [
    {
      "id": "uuid",
      "household_id": "uuid",
      "title": "Organizar la casa",
      "description": null,
      "visibility": "household",
      "category": "home",
      "progress_mode": "numeric",
      "target_type": "count",
      "target_value": 10,
      "current_value": 3,
      "unit": "tareas",
      "starts_at": null,
      "ends_at": "2026-07-31",
      "status": "active",
      "created_by_member_id": "uuid",
      "completed_at": null,
      "failed_at": null,
      "deleted_at": null,
      "created_at": "iso",
      "updated_at": "iso",
      "progress_percentage": 30
    }
  ]
}
```

### Get detail

`GET /api/planner/goals/:id`

Response:

```json
{
  "goal": { "id": "uuid", "title": "Organizar la casa", "progress_mode": "numeric", "progress_percentage": 30 },
  "milestones": []
}
```

### Create

`POST /api/planner/goals`

Request permitido:

```json
{
  "title": "Organizar la casa",
  "description": "Mantener orden semanal",
  "visibility": "household",
  "category": "home",
  "progress_mode": "numeric",
  "target_type": "count",
  "target_value": 10,
  "current_value": 0,
  "unit": "tareas",
  "starts_at": "2026-07-09",
  "ends_at": "2026-07-31"
}
```

No aceptar desde cliente:

- `household_id`
- `created_by_member_id`
- `status`
- `completed_at`
- `failed_at`
- `deleted_at`

Response:

```json
{
  "goal": { "id": "uuid", "status": "active", "progress_mode": "numeric", "progress_percentage": 0 }
}
```

### Update

`PATCH /api/planner/goals/:id`

Permite editar campos no terminales:

- `title`
- `description`
- `visibility`
- `category`
- `progress_mode`
- `target_type`
- `target_value`
- `current_value`
- `unit`
- `starts_at`
- `ends_at`

No permite `status`; usar endpoints explicitos.

### Delete

`DELETE /api/planner/goals/:id`

Soft-delete con `deleted_at`.

### Complete / Fail

- `POST /api/planner/goals/:id/complete`
- `POST /api/planner/goals/:id/fail`

Response:

```json
{
  "goal": { "id": "uuid", "status": "completed", "completed_at": "iso" }
}
```

### Milestones

- `GET /api/planner/goals/:goalId/milestones`
- `POST /api/planner/goals/:goalId/milestones`
- `PATCH /api/planner/goals/:goalId/milestones/:milestoneId`
- `DELETE /api/planner/goals/:goalId/milestones/:milestoneId`

Create request:

```json
{
  "title": "Primera semana completa",
  "target_value": 5,
  "sort_order": 0
}
```

Update request:

```json
{
  "title": "Primera semana completa",
  "target_value": 5,
  "achieved": true,
  "sort_order": 1
}
```

Errores:

- 400: validacion.
- 401: sin sesion.
- 403: RLS/permisos.
- 404: goal/hito no encontrado o sin acceso.
- 409: transicion invalida.
- 500: error interno.

RLS/403 debe mapearse a un mensaje humano: "No tenes permiso para realizar esta accion sobre metas."

## 15. RLS/backend creation rules

`createGoal` debe hacer exactamente esto:

1. Validar usuario autenticado.
2. Resolver `person` desde el token.
3. Resolver `active_household_id` desde `people`.
4. Resolver membership activa (`household_members.id`) para ese household.
5. Validar payload permitido.
6. Construir insert server-side con:
   - `household_id = context.householdId`
   - `created_by_member_id = context.membershipId`
   - `status = 'active'`
7. Insertar en `planner_goals`.
8. Devolver goal con `progress_percentage`.

Nunca debe confiar en:

- `body.household_id`
- `body.created_by_member_id`
- `body.status`

Si RLS bloquea inserts validos:

- Primero verificar que el token usado por Supabase resuelva `public.effective_uid()`.
- Verificar que `public.current_person_id()` devuelve la misma persona que `getPlannerContext`.
- Verificar que `public.current_household_member_id(household_id)` devuelve `context.membershipId`.
- Si el contexto Express es correcto pero RLS no lo reconoce, el fix pertenece a servicio de Supabase token/RLS helper o a migracion RLS, no al frontend.
- No resolver enviando `household_id` o `created_by_member_id` desde el cliente.

## 16. Current implementation audit

Archivos auditados:

- `supabase/migrations/202607080004_planner_goals.sql`
- `backend/src/routes/planner.js`
- `backend/src/controllers/planner.goals.controller.js`
- `backend/src/services/planner.goals.service.js`
- `backend/src/services/planner.tasks.service.js`
- `backend/src/services/planner.context.service.js`
- `backend/src/constants/planner.constants.js`
- `front/mi-front-limpio/services/plannerGoals.ts`
- `front/mi-front-limpio/screens/planner/PlannerGoalsScreen.tsx`
- `front/mi-front-limpio/screens/planner/GoalDetailScreen.tsx`
- `front/mi-front-limpio/screens/planner/GoalForm.tsx`
- `front/mi-front-limpio/screens/planner/TaskForm.tsx`
- `front/mi-front-limpio/screens/planner/PlannerTasksScreen.tsx`
- `front/mi-front-limpio/screens/home/HomePlannerSections.tsx`
- `front/mi-front-limpio/screens/planner/PlannerScreen.tsx`
- `front/mi-front-limpio/navigation/HomeTabNavigator.tsx`
- `front/mi-front-limpio/navigation/types.ts`

### Correcto actualmente

- Goals vive dentro de Planner, no como bottom tab independiente.
- Existen rutas actuales `/api/planner/goals`.
- Existen tablas `planner_goals` y `planner_goal_milestones`.
- Existen estados `active`, `completed`, `failed`.
- Existen visibilidades `household`, `personal`.
- Existe `planner_tasks.goal_id`.
- Servicio backend arma `household_id` y `created_by_member_id` server-side.
- Servicio backend no permite cambiar `status` por PATCH generico.
- Existen endpoints `complete` y `fail`.
- Milestones tienen create/update/delete y `achieved_at`.
- TaskForm ya intenta listar metas activas y enviar `goal_id`.
- PlannerTasksScreen ya intenta mostrar badge de meta vinculada.
- GoalDetail ya lista hitos y filtra tareas vinculadas en frontend.
- Home ya intenta mostrar meta destacada/en riesgo.

### Incorrecto o riesgoso actualmente

- POST `/api/planner/goals` presenta falla RLS/403 reportada en esta rama. Aunque el servicio arma `household_id` y `created_by_member_id`, hay que verificar la concordancia entre contexto Express y funciones RLS de Supabase.
- `GoalForm` muestra demasiadas opciones avanzadas en la ruta simple.
- `GoalForm` usa inputs de fecha con placeholder `YYYY-MM-DD`; esto es UX tecnico y puede enviar fechas parciales si no se bloquea en submit.
- `GoalForm` calcula `Number(targetValue)` y `Number(currentValue)` sin validar suficiente `NaN` antes del submit.
- `GoalForm` no colapsa progreso/fechas por defecto.
- `GoalForm` muestra copy de permisos "Cualquiera puede editar" para household, pero permisos finales deben validarse por rol/RLS.
- `PlannerGoalsScreen` muestra progreso como `0%` cuando `progress_percentage` es null; para metas sin medicion debe mostrar "Sin medicion".
- `GoalDetailScreen` permite actualizar progreso manual con input numerico plano; necesita validacion y UX mas clara.
- `GoalDetailScreen` lista tareas vinculadas trayendo hasta 100 tasks y filtrando en frontend; sirve como fase inicial, pero idealmente debe existir query/backend eficiente.
- Home consume `listGoals` directo y mezcla Goals con carga de Home; a futuro deberia venir de summary/endpoint optimizado.
- Home calcula "meta en riesgo" en frontend; aceptable temporalmente, pero debe evitar riesgo si progreso es null.
- `TaskForm` oculta selector si falla `listGoals`; correcto para no bloquear, pero no muestra estado recuperable.

### Faltante actualmente

- QA de RLS de metas personales vs familiares.
- Verificacion real de permisos por rol para metas household.
- UX final mobile-first de GoalForm.
- Date picker o mecanismo no tecnico para fechas.
- Summary backend de Goals para Home.
- Query eficiente de tareas vinculadas por `goal_id`.
- Regla clara de si hitos afectan progreso.
- Reglas futuras Finance/Fondos todavia no implementadas.
- Eventos/feed/notificaciones de `goal.completed` y `goal.failed`.

## 16 bis. Estado actual implementado (10/07/2026)

Esta seccion documente el estado real del codigo en el branch actual. Lo que figura aqui es lo correcto hoy; la auditoria de la seccion 16 refleja el momento de creacion y ya no es el estado actual exacto.

### DB real

Migraciones reales:

- `supabase/migrations/202607080004_planner_goals.sql`: crea `planner_goals`, `planner_goal_milestones`, `planner_tasks.goal_id`, indices, triggers `updated_at`, helpers `current_household_member_id` y `can_select_planner_goal`/`can_update_planner_goal`, y RLS para goals y milestones.
- `supabase/migrations/202607080005_fix_planner_goals_insert_rls.sql`: corrige la RLS INSERT/SELECT de `planner_goals`. La poliza SELECT se reescribio con predicados directos porque `INSERT ... RETURNING` evalua visibilidad SELECT antes de que un helper de self-lookup pueda ver la nueva fila. Esto desbloqueo el 403/RLS reportado al crear goals.
- `supabase/migrations/202607100001_add_progress_mode_to_goals.sql`: agrega `planner_goals.progress_mode` (text not null default 'steps') con check `steps | tasks | numeric | boolean | none`, y backfill: `boolean` -> mode boolean, `count`/`amount`/`percentage` -> mode numeric, `null` -> mantiene 'steps' por el default.

Tablas reales:

- `planner_goals`: id, household_id, title, description, visibility, category, progress_mode, target_type, target_value, current_value, unit, starts_at, ends_at, status, created_by_member_id, completed_at, failed_at, deleted_at, created_at, updated_at. Constraints de status, visibility, category, target_type, no-blank title, valores >= 0.
- `planner_goal_milestones`: id, goal_id, title, target_value, achieved, achieved_at, sort_order, deleted_at, created_at, updated_at. Constraints de no-blank title, target_value >= 0, sort_order >= 0.
- `planner_tasks.goal_id`: FK opcional a `planner_goals.id` con `on delete set null`.

RLS real:

- Goals: SELECT visible para miembros activos del household, con excepcion de metas personales (solo creador). INSERT requiere `is_active_household_member` y `created_by_member_id = current_household_member_id`. UPDATE con `can_update_planner_goal` (mismo predicado que SELECT).
- Milestones: SELECT/INSERT/UPDATE delegan a `can_select_planner_goal`/`can_update_planner_goal` segun corresponda.

### API real

Ruta base: `/api/planner/goals`.

Endpoints reales:

- `GET /api/planner/goals` (listado con filtros `status`, `category`, `visibility`, `only_mine`, `ends_at_from`, `ends_at_to`, `limit`).
- `GET /api/planner/goals/:id` (detalle con milestones en la misma respuesta).
- `POST /api/planner/goals` (create). Backend valida `progress_mode`, target_type compatibility, y resuelve `household_id` y `created_by_member_id` server-side desde el contexto autenticado. No acepta `status`, `household_id` ni `created_by_member_id` del cliente.
- `PATCH /api/planner/goals/:id` (update). Permite editar campos no terminales, incluyendo `progress_mode` con validacion de compatibilidad contra `target_type`.
- `DELETE /api/planner/goals/:id` (soft delete con `deleted_at`).
- `POST /api/planner/goals/:id/complete` (transicion a `completed`, setea `completed_at`).
- `POST /api/planner/goals/:id/fail` (transicion a `failed`, setea `failed_at`).
- Milestones: `GET/POST /api/planner/goals/:goalId/milestones`, `PATCH/DELETE /api/planner/goals/:goalId/milestones/:milestoneId`.

Validaciones backend reales:

- `GOAL_PROGRESS_MODES = ['steps', 'tasks', 'numeric', 'boolean', 'none']`.
- `GOAL_PROGRESS_MODE_TARGET_TYPE_MAP`: `steps -> null`, `tasks -> null`, `numeric -> [count, amount, percentage]`, `boolean -> [boolean]`, `none -> null`.
- `validateProgressMode`: default 'steps' si vacio, 400 si valor invalido.
- `validateProgressModeTargetTypeCompatibility`: 400 si progress_mode no admite target_type y llega uno, 400 si requiere target_type y no llega, 400 si el target_type no esta en la lista permitida para ese mode.

Calculo de progreso backend real (`calculateProgress`):

- `status=completed` -> 100.
- `boolean`: si `target_type=boolean`, `current_value >= 1 ? 100 : 0`.
- `numeric`: si `target_value` es null/undefined -> null; sino `current / target * 100`, acotado 0..100.
- `steps`/`tasks`/`none`: el backend actualmente no deriva progreso de hitos ni de tareas; segun el modo devuelve null (no porcentaje falso) salvo en casos puntuales. Ver Problemas UX abajo para el desfase entre backend y frontend.

### progress_mode como fuente de verdad

`progress_mode` es el campo primario de UX. `target_type` queda como detalle tecnico de compatibilidad para `numeric` y `boolean`.

Mapa final (igual a la spec):

- `steps` -> `target_type=null`.
- `tasks` -> `target_type=null`.
- `numeric` -> `target_type=count | amount | percentage`.
- `boolean` -> `target_type=boolean`.
- `none` -> `target_type=null`.

### Frontend real

Tipos cliente (`services/plannerGoals.ts`):

- `PlannerGoalProgressMode = 'steps' | 'tasks' | 'numeric' | 'boolean' | 'none'`.
- `PlannerGoal` incluye `progress_mode: PlannerGoalProgressMode`.
- `CreatePlannerGoalInput` incluye `progress_mode?` y permite `target_type`, `target_value`, `current_value`, `unit`, `starts_at`, `ends_at` como nullables.

`GoalForm.tsx` (Phase 2 completada):

- Ruta simple: Nombre, Descripcion opcional, Categoria, Visibilidad, Crear meta. Progreso y Fechas colapsados por defecto.
- Seccion "Como queres avanzar" con chips: Por pasos / Por tareas / Con numero / Si / No / Sin progreso.
- Sub-opciones para "Con numero": Cantidad / Dinero / Porcentaje con labels Avance / Objetivo / Unidad.
- Payload default si no se abre progreso: `progress_mode='steps'`, `target_type=null`, `target_value=null`, `current_value=0`, `unit=null`.
- Edit mode: carga `progress_mode` directamente; fallback para metas viejas sin progress_mode (boolean -> boolean, count/amount/percentage -> numeric, null -> steps).
- Validacion de fechas: bloquea parciales invalidos y `ends_at < starts_at`.
- `npx tsc --noEmit` pasa sin errores.

`PlannerGoalsScreen.tsx`:

- Lista de goals con filtros por status, visibility y categoria. Cards con barra de progreso y resumen `current_value / target_value`.

`GoalDetailScreen.tsx`:

- Muestra el goal, barra de progreso, hitos (crear/toggle/delete), tareas vinculadas (trayendo hasta 100 tasks y filtrando por `goal_id` en frontend), input de progreso manual `current_value`, y acciones terminales complete/fail/delete.

`plannerShared.ts`:

- Agregado `goalProgressModeLabels` con labels humanos.

`HomePlannerSections.tsx`:

- Home ya intenta mostrar meta destacada/en riesgo consumiendo `listGoals` directo y calculando riesgo en frontend.

### Lo real ahora, lo pendiente y lo futuro

Real ahora (10/07/2026):

- DB de goals, milestones, `goal_id`, RLS y progress_mode existen y funcionan tecnicamente.
- API CRUD de goals + milestones + complete/fail existe y valida progress_mode/target_type.
- Frontend cliente tipos incluyen progress_mode.
- GoalForm usa progress_mode y labels humanos; typecheck pasa.

Pendiente (Phase 3 en adelante):

- GoalDetail: acciones de progreso por modo (steps check hito, tasks crear/completar tarea, numeric sumar avance, boolean marcar lograda, none sin barra).
- GoalForm: la UX aun necesita menos taps y menos carga visual; ver Problemas UX.
- PlannerGoalsScreen y HomePlannerSections: rediseño visual, no mas features.
- Tratar milestones como fuente primaria de progreso para steps.
- Progreso derivado de tareas para tasks.
- Query eficiente de tareas vinculadas por goal_id.

Futuro (no planificar todavia):

- Geni estimando progreso de metas (solo cuando sea real y filtrado por permisos).
- Finance/Fondos vinculados y progreso automatico desde saldo acumulado.
- Documentos/HomeCloud como evidencia de progreso de metas.
- Feed/logros celebrando logros sin exponer fracasos.
- Eventos `goal.completed` y `goal.failed` en un feed real.
- Inventory/Assets/Medication generando tasks que luego se vinculan a goals.

## 16 ter. Problemas UX observados en prueba real

Backend funciona, pero la UX visible NO es la final. Esta seccion captura lo observado en la prueba visual del 10/07/2026. El siguiente paso es rediseño UX, no mas features.

### GoalDetail se siente como CRUD, no como tracker de metas

- En una sola pantalla se ven: barra de progreso, resumen numerico, input "Actual" + "Objetivo", boton "Actualizar", lista de hitos con input para agregar, lista de tareas vinculadas y acciones terminales (Lograda / Fallida / Eliminar).
- No hay una accion primaria clara; hay varias acciones compitiendo por la atencion.
- Falta el flujo post-create "Agregar paso / Crear tarea / Ahora no" que la spec define.

### Progreso todavia se ve como 0% o `0 / ?` de forma engañosa

- `PlannerGoalsScreen.tsx:150` muestra `{goal.current_value} / {goal.target_value ?? '?'}`. Para metas `steps`/`tasks`/`none` esto muestra `0 / ?` aunque no haya nada que medir.
- `PlannerGoalsScreen.tsx:72` y `GoalDetailScreen.tsx:246` hacen fallback `progress ?? 0`, lo que muestra `0%` cuando `progress_percentage` es `null` (modo steps sin hitos, tasks sin tareas, none).
- El backend ya devuelve `progress_percentage = null` para modo sin progreso medible, pero el frontend reemplaza null por 0 y despues lo muestra como porcentaje real. Es la regression mas marcada de "progreso falso".

### Agregar y checkear hitos no es una experiencia fluida

- El input de hito vive en la misma pantalla que el input de progreso manual y las acciones terminales.
- No hay diferenciacion por `progress_mode`: en modo `steps` checkear un hito deberia ser la accion primaria y unica medida, pero hoy compite con "Actualizar valor".
- Marcar/desmarcar un hito no recalcula un porcentaje derivado en el detalle.

### Crear / completar tareas vinculadas no es el flujo principal (modo tasks)

- `GoalDetailScreen.tsx:78` trae hasta 100 tasks y filtra por `goal_id` en el frontend. Funciona como prueba pero no escala.
- No existe "Crear tarea vinculada" desde el detalle de la meta; hay que ir a TaskForm y elegir la meta en el selector.
- Completar una task vinculada no recalcula el progreso de una meta `tasks`.

### PlannerGoalsScreen visualmente pesado

- Hay tres tiras de filtros (status, visibility, categoria) todas visibles a la vez.
- Cada card muestra barra + porcentaje + `current/target` + chips de categoria, estado y visibility.
- Para una meta simple recien creada (`steps` sin hitos) la card ya muestra `0 / ?` y `0%`.

### GoalForm mejoro pero sigue cargado

- Ruta simple existe (Nombre, Descripcion, Categoria, Visibilidad), pero las secciones colapsadas aun muestran iconos grandes y resumenes.
- La transicion "crear meta rapida -> ver acciones" no esta lograda: el post-create actual navega a GoalDetail que sigue siendo la pantalla CRUD completa.

### Reglas UX a reforzar para el rediseño

- Una sola accion primaria por modo en GoalDetail.
- Sin texto tecnico tipo `Actual: 0 / Objetivo: ?`.
- Sin barra ni `0%` cuando `progress_percentage` es null.
- Acciones terminales menos prominentes; no compiten con la accion primaria del modo.
- Post-create: invitar a "Agregar paso / Crear tarea / Ahora no" antes del detalle completo.

## 16 quater. Relaciones históricas de Goals con otros módulos

Esta seccion captura las relaciones concepto que los docs historicos definen entre Goals y el resto de HomePlus. Sirve para no perder trazabilidad cuando llegue el rediseño o la integracion futura. Estado: spec/concepto. Implementacion actual: la mayoria futura.

| # | Relacion | Resumen | Estado en spec | Implementado ahora |
|---|---|---|---|---|
| R1 | Goal -> Hitos (Milestones) -> Tasks | Una meta se descompone en hitos; los hitos pueden tener tareas vinculadas. | Spec current (FinalSpec 06.27, DB 2.8/2.9) | DB y API si; logica de progreso no |
| R2 | Tasks advance Goals | Las tareas vinculadas a una meta pueden hacerla avanzar. | Spec current (FinalSpec 06.31, SECCION 5 5.2.3) | `planner_tasks.goal_id` FK existe; logica de progreso no |
| R3 | Goals <-> Finance / Fondos / Account_Finance | Las metas financieras pueden calcular progreso automatico desde saldo acumulado y vincularse a fondos. | Spec current (FinalSpec 06.30, 06.32) | No (Finance/Fondos no implementados) |
| R4 | Documents / HomeCloud <-> Goals | Un documento puede ser evidencia de progreso de una meta. | Spec current (FinalSpec 22.12, SECCION 5 5.2.4) | No (no hay `goal_id` en documents) |
| R5 | Briefing / Home referencia Goals; sin Geni fake | Home puede mostrar resumen de metas reales, pero no debe mentir progreso ni prometer Geni. | Spec current + regla actual (planner_final_update_scope 13) | Home consume `listGoals` directo; riesgo de 0% falso |
| R6 | Geni estima progreso de metas complejas (real + permisos) | Geni puede estimar progreso sin configuracion manual, pero nunca expone metas privadas ni ignora permisos. | Capability spec (FinalSpec 06.33, SECCION 7 7.2.2) | No ("Geni real" do-not-touch) |
| R7 | Feed / logros celebra logros; nunca expone fracasos | El feed puede celebrar `goal.completed` y logros familiares, pero nunca expone faltas ni convierte fracaso en logro. | Red-line current (SECCION 2 principio 5, SECCION 4) | Feed/logros no implementado enteramente; red-line activa |
| R8 | Inventory / Assets / Medication -> Tasks -> Goals | Inventory puede generar tasks (reposicion, vencimientos, medicacion); esas tasks pueden vincularse a metas via `goal_id`. | Spec/relacion conceptual (planner_inventory 4.2, 5.1) | Inventory/Assets no implementados; `goal_id` existe pero cadena completa futura |
| R9 | Responsibilities / Tipo conecta a Goals (indirecto, futuro) | Una Responsabilidad agrupa tasks; esas tasks podrian vincularse a metas. No existe link directo Responsibility <-> Goal. | Conceptual (SECCION 5 5.2.x, ALL_FRAGMENTS 9) | No (`responsibilities` no existe en MVP; se uso `template_key`+`category`) |
| R10 | "sin progreso falso" / "no prometer Geni" / "no exponer fracasos" | Reglas producto: nunca mostrar progreso falso, 0% falso ni prometer Geni/features inexistentes. | Red-line current | Frontend actual viola "no 0% falso" para steps/tasks/none |

### Decisiones historicas relevantes para el rediseño

- Goals vive dentro de Planner. No es modulo de bottom nav.
- Planner contiene Tasks, Calendar, Goals y (conceptualmente) Responsabilidades. Home resume; Planner administra.
- Logros se integran dentro de Goals (Goals cumplidas = logros), no como dominio separado.
- Metas personales son privadas por defecto.
- La barra de progreso nunca debe comunicar culpa ni deuda visual.
- Quick Actions global NO debe tener "Crear meta": Goals se administra dentro de Planner.

## 17. Implementation plan after this doc

### Nueva prioridad de fases (decision del 10/07/2026)

La implementacion se reorganiza en 4 tiers (T1-T4). Cada tier tiene un objetivo claro y no mezcla responsabilidades.

### T1 — Goals Tasks Core (implementar AHORA)

Prioridad inmediata. Hacer que las tareas vinculadas muevan progreso real.

Backend:
- `calculateProgress` para `progress_mode='tasks'` con las reglas precisas de §8.
- `GET /api/planner/tasks?goal_id=:goalId` (query eficiente).
- Validacion de `goal_milestone_id` si corresponde (future: constraint milestone pertenece al goal).

Frontend:
- `GoalDetailScreen`: seccion de tareas vinculadas con progreso real.
- TaskForm contextual desde GoalDetail con `goal_id` preasignado.
- Retorno a GoalDetail tras guardar, refresh de tareas y progreso.
- Fix de `0%` falso en `PlannerGoalsScreen`, `GoalDetailScreen` y `HomePlannerSections`.

DB:
- Agregar `goal_milestone_id` a `planner_tasks` si se decide que entra en T1 (opcional: puede ser T2).

### T2 — Templates / Presets (implementar DESPUES de T1 estable)

Templates como plantillas reutilizables para crear Goals con tareas sugeridas.

Backend:
- Seed de 8 presets basicos (ver lista abajo).
- Endpoint `POST /api/planner/goals/from-template`.
- Sin recurrencia, sin streaks, sin auto-asignacion.

Frontend:
- Template Picker: elegir preset desde "Nueva meta".
- Template Preview: vista previa con tareas editables antes de crear.
- Crear Goal + tareas desde template confirmado.

Presets iniciales (conceptuales para T2):
1. Mantener la casa ordenada esta semana (weekly, progress_mode='tasks')
2. Limpieza profunda de cocina (monthly, progress_mode='tasks')
3. Limpieza de bano (weekly, progress_mode='tasks')
4. Ordenar habitacion (weekly, progress_mode='tasks')
5. Preparar cumpleanos (once, progress_mode='tasks')
6. Preparar vacaciones (once, progress_mode='tasks')
7. Rutina de mascotas (weekly, progress_mode='tasks')
8. Revision mensual del hogar (monthly, progress_mode='tasks')

### T3 — Streaks product spec (SOLO DOCUMENTAR)

Especificacion de producto detallada de streaks/rachas. No implementar codigo.

Decisiones clave ya tomadas:
- Rachas basadas en oportunidad programada, no obligacion diaria.
- Si una task toca lunes/miercoles/viernes, la racha se evalua esos dias.
- Dias sin tarea programada no rompen racha.
- Ventana de gracia: 24h (daily), 2 dias (weekly), 3 dias (monthly).
- Completar dentro de gracia mantiene racha; fuera de gracia cuenta para progreso pero no para racha.
- Copys sin culpa: ver §17 bis.
- Tipos de rachas: por task, por template/rutina, por goal, personal, familiar, por categoria/responsabilidad.
- Rachas familiares no requieren que todos cumplan; basta con que el plan del hogar se complete.

### T4 — Streaks implementation (implementar DESPUES de T3 spec)

Implementacion real de streaks con DB, endpoints y UI.

Backend:
- Tabla `streaks` + `streak_events`.
- Servicio `StreakService` con reglas de T3.
- Cron `recalculate_streaks` (diario/semanal).
- Endpoints: `GET /streaks/:id`, `POST /streaks/:id/pause`, `POST /streaks/:id/resume`.

Frontend:
- Badge de racha en TaskCard (dot discreto).
- Seccion "Mis rachas" en Profile.
- Card opcional "Tu ritmo esta semana" en Home.
- Sin rankings, sin comparacion agresiva, sin culpa.

### Que NO implementar

- Rankings agresivos entre miembros.
- Comparativas entre hogares.
- Gamificacion avanzada (puntos, niveles, XP).
- Geni (asistente automatico) hasta que exista infraestructura real.
- Auto-completar meta al llegar a 100% de tareas/hitos.

### Fases anteriores (Phase 0 a Phase 2) — COMPLETADAS

- Phase 0: alineacion Product/UX y documentacion. Completado.
- Phase 1: agregar `progress_mode` en DB/API/client types. Completado.
- Phase 2: actualizar `GoalForm` para crear metas simples y usar `progress_mode`. Completado.

### Fases legacy (Phases 3-15 del gap audit)

Las fases 3-15 definidas en el gap audit (`planner_goals_final_gap_audit.md`) siguen siendo validas como mapa de largo plazo, pero la prioridad inmediata se reorganiza en T1-T4 como se define arriba. Las fases legacy se retoman despues de T1.

## 17 bis. Streaks copy philosophy

Copys aprobados para streaks (no usar culpa, no usar "fallaste", no usar rankings agresivos):

| Estado | Copy |
|--------|------|
| Racha activa | "Seguis en ritmo" |
| Racha de 3+ | "3 veces seguidas cuando tocaba" |
| Racha fuerte | "Esta rutina viene bien" |
| Racha cortada | "Se corto el ritmo. Podes retomar ahora." |
| Ultima vez | "Ultima vez completada: [fecha]" |
| Proxima oportunidad | "Proxima oportunidad: [fecha]" |
| Tarea atrasada (dentro de gracia) | "Llegaste tarde, pero seguis en ritmo" |
| Tarea atrasada (fuera de gracia) | "Te perdiste esta, pero podes recuperar el ritmo" |
| Racha larga (7+) | "7 veces seguidas. Segui asi!" |
| Racha muy larga (30+) | "30 veces seguidas. Impresionante!" |
| Sin racha todavia | "Empeza a completar para armar tu ritmo" |
| Racha familiar | "La casa lleva [X] dias en ritmo" |

Reglas de copy:
- Usar lenguaje de ritmo/continuidad.
- Reconocer esfuerzo sin presion.
- Ofrecer recuperacion sin culpa.
- No usar "fallaste", "rompiste", "fracasaste".
- No comparar miembros entre si.

## 18. QA checklist

- [ ] Crear meta familiar simple.
- [ ] Crear meta personal.
- [ ] Crear meta `steps`.
- [ ] Despues de crear, ver acciones `Agregar paso`, `Crear tarea`, `Ahora no`.
- [ ] Agregar hito y verlo en detalle.
- [ ] Marcar hito logrado y ver progreso.
- [ ] Marcar hito no logrado y ver progreso.
- [ ] Crear meta `tasks`.
- [ ] Vincular task existente a meta.
- [ ] Crear task desde detalle de meta y verificar que queda vinculada.
- [ ] Completar task vinculada y ver progreso si la derivacion esta implementada.
- [ ] Crear meta con progreso `count`.
- [ ] Crear meta con progreso `amount`.
- [ ] Crear meta con progreso `percentage`.
- [ ] Usar quick action `Sumar avance`.
- [ ] Crear meta booleana.
- [ ] Completar meta booleana con `Marcar como lograda`.
- [ ] Crear meta `none`.
- [ ] Verificar que `none` no muestra progreso falso.
- [ ] Crear hito.
- [ ] Editar hito.
- [ ] Eliminar hito.
- [ ] Marcar hito logrado.
- [ ] Marcar hito no logrado.
- [ ] Completar meta.
- [ ] Fallar meta.
- [ ] Eliminar meta.
- [ ] Vincular task a meta.
- [ ] Mostrar badge de meta en task.
- [ ] Mostrar tareas vinculadas en detalle de meta.
- [ ] Mostrar meta destacada en Home.
- [ ] Verificar privacidad de meta personal.
- [ ] Verificar que miembro del household ve meta familiar.
- [ ] Verificar que no se envia fecha invalida.
- [ ] Verificar `npx tsc --noEmit`.
- [ ] Verificar `node --check` en archivos backend modificados.
- [ ] Verificar `supabase db lint` si DB cambio.
- [ ] Verificar `supabase db reset` si DB cambio.
