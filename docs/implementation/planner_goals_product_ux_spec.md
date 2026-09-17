# Planner Goals - Product/UX spec

Estado: complemento Product/UX de `docs/implementation/planner_goals_final.md`. Actualizado el 10/07/2026 con "Problemas detectados en la prueba visual actual", UX final reforzada para GoalDetail/PlannerGoalsScreen, y las decisiones de producto del 10/07/2026 sobre Goals como planes accionables, tasks progress, templates y streaks.

Este documento forma parte de la fuente de verdad de Planner Goals. La implementacion debe leerlo junto con `planner_goals_final.md`; si aparece una contradiccion, se debe actualizar la especificacion general para mantener ambas alineadas antes de escribir codigo.

Aviso: el backend de Goals funciona tecnicamente, pero la UI actual NO es la UX final aceptada. Ver seccion 16 bis. El siguiente paso es T1 — Goals Tasks Core: progreso real de tasks, crear tarea desde GoalDetail y TaskForm contextual.

## 1. Objetivo

Definir la experiencia final de producto para Metas dentro de Planner, con foco en que una persona pueda crear, entender y actualizar una meta sin convertir Planner en una planilla.

Una meta debe permitir:

- crear un objetivo en alrededor de 10 segundos;
- entender como se mide;
- actualizar progreso sin pensar;
- dividir el objetivo en pasos;
- vincular tareas;
- ver si va bien sin cargar datos innecesarios.

## 2. Problema a resolver

El modelo anterior dependia demasiado de `target_type`. Eso no alcanza para representar la intencion real de la meta, porque `target_type=null` puede significar tres cosas distintas:

- la meta no tiene medicion;
- la meta avanza por hitos o pasos;
- la meta avanza por tareas vinculadas.

Esa ambiguedad genera UX confusa: la app puede mostrar 0% falso, pedir valores numericos cuando no hacen falta o forzar al usuario a editar toda la meta para registrar progreso. La solucion final es separar el modo de progreso de la medicion tecnica.

## 3. Investigacion externa y patrones utiles

Patrones utiles para HomePlus Goals:

- Checklists y pasos breves funcionan mejor que formularios largos cuando el usuario esta creando una meta cotidiana.
- El progreso debe estar cerca de la accion que lo modifica: check de paso, completar tarea, sumar avance o marcar lograda.
- Las pantallas de resumen deben mostrar datos reales y accionables, no predicciones o inteligencia simulada.
- La configuracion avanzada debe aparecer despues de crear la meta o dentro del detalle, no como requisito inicial.
- La presion por rachas, culpa o deuda visual reduce confianza en herramientas familiares; el tono debe ser claro, calmo y no punitivo.

## 4. Principios HomePlus Goals

- Planner administra metas; Home solo resume.
- La ruta simple es la ruta principal.
- El usuario no ve nombres tecnicos como `target_type`, `current_value` o `target_value`.
- El progreso se registra por acciones concretas, no por edicion de registros.
- Una meta sin progreso medible no muestra porcentaje falso.
- Las metas personales son privadas por defecto.
- Geni, Finance/Fondos y recomendaciones automaticas quedan fuera hasta que exista soporte real.

## 5. Modos de progreso

Modo recomendado por defecto: `steps`.

Modos finales:

| progress_mode | Uso | Relacion con target_type |
|---|---|---|
| `steps` | La meta avanza por hitos/pasos checkeables. | `target_type=null` |
| `tasks` | La meta avanza por tareas vinculadas. | `target_type=null` |
| `numeric` | La meta avanza por cantidad, monto o porcentaje. | `target_type=count`, `amount` o `percentage` |
| `boolean` | La meta esta pendiente o lograda. | `target_type=boolean` |
| `none` | La meta no muestra porcentaje ni barra. | `target_type=null` |

Implicacion final de modelo:

- `planner_goals.progress_mode` debe existir como texto/check enum con valores `steps | tasks | numeric | boolean | none`.
- `target_type` queda como campo de compatibilidad y detalle para `numeric`/`boolean`.
- `target_type` no debe decidir por si solo la experiencia de progreso.

## 6. Crear meta en 10 segundos

La pantalla de creacion pregunta por defecto solo:

- titulo;
- categoria;
- visibilidad.

Descripcion es opcional. Progreso avanzado, fechas, valores y unidad no aparecen como carga inicial. La experiencia recomendada crea una meta `steps` por defecto, con `target_type=null`, y luego invita a definir el siguiente paso.

No se muestran labels tecnicos. En vez de "target_type" se usa "Como queres avanzar" o un selector con opciones humanas si el usuario abre configuracion avanzada.

## 7. Post-create flow

Despues de crear una meta, la app navega a `GoalDetail` y muestra una decision inmediata:

- `Agregar paso`
- `Crear tarea`
- `Ahora no`

Este flujo evita que el formulario inicial cargue toda la planificacion. La meta nace rapido y el detalle se convierte en el lugar natural para dividirla.

## 8. GoalDetail por modo

`GoalDetail` debe ajustar su informacion principal segun `progress_mode`:

- `steps`: lista de pasos/hitos con check tactil y porcentaje derivado.
- `tasks`: tareas vinculadas, accion para crear tarea ya vinculada y progreso derivado de completadas/total.
- `numeric`: valor actual, objetivo, unidad y accion rapida para sumar avance.
- `boolean`: estado pendiente/lograda y accion para marcar como lograda.
- `none`: informacion de la meta sin barra ni porcentaje.

El detalle no debe obligar a editar la meta completa para actualizar progreso.

## 9. Registro de progreso por modo

- `steps`: tocar un hito alterna logrado/no logrado.
- `tasks`: completar una tarea vinculada puede actualizar el progreso derivado.
- `numeric`: usar accion rapida `Sumar avance`.
- `boolean`: usar accion `Marcar como lograda`.
- `none`: no registra porcentaje; puede permitir notas o edicion basica en fases futuras.

## 10. Milestones/hitos

Los hitos son el mecanismo principal de progreso para `steps`.

Reglas:

- cada hito tiene titulo, orden y estado logrado/no logrado;
- marcar un hito como logrado setea `achieved_at`;
- desmarcarlo limpia `achieved_at`;
- el progreso de `steps` es `hitos logrados / hitos totales`;
- si no hay hitos, no se muestra 0% falso como fracaso.

UX:

- input corto para agregar paso;
- check tactil accesible;
- orden estable;
- confirmacion para eliminar si hay riesgo de perdida.

## 11. Tasks vinculadas

Las tareas conectan una meta con trabajo concreto.

En modo `tasks`:

- el progreso se deriva de `tareas computables completadas / tareas computables totales`;
- `GoalDetail` debe permitir crear una tarea ya vinculada a la meta;
- las tareas vinculadas deben mostrarse sin cargar listas enormes cuando exista soporte backend eficiente.

### Reglas precisas de progreso (decision del 10/07/2026)

**Que cuenta como completada:**
- `status='completed'`
- `status='verified'`

**Que NO cuenta:**
- `status='pending'`
- `status='awaiting_verification'` (nunca cuenta hasta que pasa a `verified`)

**Que se excluye del total:**
- `status='cancelled'`
- tareas soft-deleted

**Importante:** `goal.requires_verification` NO existe ni controla el progreso. La verificacion pertenece a Task, no a Goal. `awaiting_verification` nunca cuenta como completada.

**Resultados:**
- 0 tareas computables → `progress_percentage = null`, copy: "Todavia no hay tareas"
- >0 tareas, 0 completadas → `progress_percentage = 0` real, copy: "0 de N tareas terminadas"
- todas completadas → `progress_percentage = 100`, copy: "Todas las tareas estan listas"
- NO auto-completar la meta al llegar a 100%.

### Crear tarea desde GoalDetail (T1 — MVP flow)

GoalDetail → boton "Crear tarea" → TaskForm contextual.

TaskForm contextual:
- titulo: "Nueva tarea"
- subtitulo: "Para: [goal title]"
- si proviene de hito: "Paso: [milestone title]"
- `goal_id` preasignado, no editable en UI primaria
- `goal_milestone_id` preasignado si aplica (future: T2 o cuando DB lo soporte)
- sin selector de meta visible en la UI primaria
- resto de campos normales (titulo, fecha, prioridad, responsable, verificacion)
- sin herencia silenciosa de categoria/prioridad/responsable/fecha
- sugerencias solo si el usuario las acepta explicitamente

Post-save:
- volver a GoalDetail
- refrescar lista de tareas vinculadas
- refrescar goal/progreso
- mostrar "Tarea creada"
- opcion "Crear otra tarea" que conserva goal/milestone pero limpia el resto

Reglas:

- una tarea puede no tener meta;
- una tarea solo puede vincularse a metas visibles/editables del mismo household;
- Home no administra la relacion tarea-meta.

## 12. Numeric quick update

En modo `numeric`, la accion principal es `Sumar avance`.

Ejemplos:

- sumar 3 unidades a una meta `count`;
- sumar 1000 a una meta `amount`;
- sumar 10 puntos a una meta `percentage`.

La UI debe mostrar valor actual, objetivo y unidad con lenguaje humano. No debe exponer `current_value` ni `target_value` como nombres de campos tecnicos en la ruta principal.

## 13. Boolean completion

En modo `boolean`, la accion principal es `Marcar como lograda`.

Una meta booleana no necesita valores visibles. Su progreso es:

- pendiente: 0%;
- lograda: 100%.

La accion debe usar endpoint explicito de completar cuando aplique, no un PATCH generico de `status`.

## 14. Home card

Home puede mostrar como maximo una card real de Goals.

Reglas:

- no mostrar card si no hay metas reales;
- no mostrar progreso inventado;
- no mostrar 0% falso cuando no hay medicion;
- no mezclar Goals con Geni ni inteligencia simulada;
- no crear, editar ni administrar metas desde Home;
- navegar a `GoalDetail` dentro de Planner.

Home resume. Planner administra.

## 15. Copy UX en espanol

Copy recomendado:

- `Meta`
- `Metas`
- `Nombre de la meta`
- `Categoria`
- `Visibilidad`
- `Agregar paso`
- `Crear tarea`
- `Ahora no`
- `Sumar avance`
- `Marcar como lograda`
- `Sin progreso medible`
- `Sin pasos todavia`
- `Tareas vinculadas`
- `Meta personal`
- `Meta familiar`

Evitar:

- `target_type`
- `current_value`
- `target_value`
- `goal_id`
- `YYYY-MM-DD` como unico camino visible.

## 16. Anti-patrones

- No mostrar 0% falso.
- No usar culpa, verguenza, deuda visual, rachas o presion artificial.
- No usar formulario tipo planilla como experiencia principal.
- No pedir fechas crudas `YYYY-MM-DD` como unico camino.
- No forzar al usuario a editar toda la meta para actualizar progreso.
- No prometer Geni, predicciones o automatizaciones si no existen.
- No cargar datos innecesarios en Home para simular inteligencia.

## 16 bis. Problemas detectados en la prueba visual actual (10/07/2026)

Backend funciona, pero la UX visible NO es la final. Esta seccion capta lo observado en la prueba real. El siguiente paso es rediseño UX.

### GoalDetail muestra demasiado a la vez

`GoalDetailScreen.tsx` hoy muestra en una sola pantalla: barra de progreso + resumen "Actual/Objetivo" + input + boton "Actualizar" + lista de hitos con input para agregar + lista de tareas vinculadas + acciones terminales "Lograda / Fallida / Eliminar". No hay una accion primaria clara; varias compiten por la atencion. No existe el flujo post-create "Agregar paso / Crear tarea / Ahora no".

### Progreso se ve como `0%` o `0 / ?` aunque no haya nada que medir

- `PlannerGoalsScreen.tsx:150` muestra `{goal.current_value} / {goal.target_value ?? '?'}` -> para metas `steps`/`tasks`/`none` muestra `0 / ?`.
- `PlannerGoalsScreen.tsx:72` y `GoalDetailScreen.tsx:246` hacen fallback `progress ?? 0` -> muestra `0%` cuando `progress_percentage` es `null` (modo steps sin hitos, tasks sin tareas, none). Es regression de "progreso falso".
- El backend ya devuelve `progress_percentage = null` para modo sin progreso medible; el frontend lo reemplaza por 0.

### Anadir/checkear hitos no es fluido

En modo `steps` checkear un hito deberia ser la accion primaria y unica medida, pero hoy compite con "Actualizar valor" en la misma pantalla. No hay diferenciacion por `progress_mode`. Marcar/desmarcar un hito no recalcula el porcentaje derivado en el detalle.

### Crear/completar tareas vinculadas no es el flujo principal (modo tasks)

`GoalDetailScreen.tsx:78` trae hasta 100 tasks y filtra por `goal_id` en frontend. No existe "Crear tarea vinculada" desde el detalle; hay que ir a `TaskForm` y elegir la meta. Completar una task vinculada no recalcula el progreso de una meta `tasks`.

### PlannerGoalsScreen visualmente pesado

Tres tiras de filtros (status, visibility, categoria) todas visibles a la vez. Cada card muestra barra + porcentaje + `current/target` + chips de categoria, estado y visibility. Para una meta simple `steps` recien creada la card ya muestra `0 / ?` y `0%`.

### GoalForm mejoro pero sigue cargado

La ruta simple existe, pero las secciones colapsadas muestran iconos grandes y resumenes. La transicion "crear rapido -> ver acciones" no esta lograda: el post-create actual navega a GoalDetail que sigue siendo CRUD completo.

## 16 ter. UX final reforzada (post-rediseño)

Esta seccion refuerza las reglas finales de UX para GoalDetail, PlannerGoalsScreen y Home. Es lo que se busca en el rediseño, no el estado actual.

### Reglas generales

- Una sola accion primaria por modo en GoalDetail. Nada compite con esa accion.
- Sin texto tecnico tipo `Actual: 0 / Objetivo: ?`, `current_value`, `target_value`, `goal_id`.
- Sin barra ni `0%` cuando `progress_percentage` es null. Mostrar texto del modo: "Sin pasos todavia", "Tareas vinculadas", "Sin progreso medible".
- Acciones terminales menos prominentes; no compiten con la accion primaria del modo. Preferible un menu secundario o al final de la pantalla.
- Post-create: invitar a "Agregar paso / Crear tarea / Ahora no" antes de mostrar el detalle completo.
- Filtros minimos en PlannerGoalsScreen. Si tres tiras compiten, colapsarlas en un solo control.
- Menos controles visibles por defecto; progressive disclosure.

### Accion primaria por modo en GoalDetail

| progress_mode | Accion primaria | Sin datos |
|---|---|---|
| `steps` | Check/uncheck de hitos | "Sin pasos todavia" + CTA "Agregar paso" |
| `tasks` | "Crear tarea" vinculada + ver tareas vinculadas y completarlas | "Sin tareas vinculadas" + CTA "Crear tarea" |
| `numeric` | "Sumar avance" (input corto) | Mostrar Avance / Objetivo / Unidad con labels humanos |
| `boolean` | "Marcar como lograda" | "Pendiente" |
| `none` | Sin barra ni porcentaje | Sin progreso visible |

### PlannerGoalsScreen

- Una sola tira de filtros o filtros colapsados; no tres visibles a la vez.
- Card minimal: titulo, categoria, estado. Solo mostrar barbaja/progreso si `progress_percentage` no es null.
- Empty state calmo: "Aun no hay metas. Crear una meta." sin prometer features futuros.

### HomePlannerSections

- Mostrar maximo una card real de meta.
- No mostrar 0% falso. Si `progress_percentage` es null, no mostrar barra.
- No mostrar Geni ni inteligencia simulada.
- Resumen, no administracion.

## 17. Implicaciones DB/API

Agregar a `planner_goals`:

- `progress_mode text not null default 'steps'`
- check/enum: `steps | tasks | numeric | boolean | none`

Compatibilidad esperada:

- `steps -> target_type=null`
- `tasks -> target_type=null`
- `numeric -> target_type=count | amount | percentage`
- `boolean -> target_type=boolean`
- `none -> target_type=null`

API:

- request y response de Goals deben incluir `progress_mode`;
- create puede defaultar a `steps`;
- update puede cambiar `progress_mode` solo con validaciones de compatibilidad;
- si la schema actual no tiene `progress_mode`, se requiere migracion DB/API/client types antes de la implementacion final.

## 18. Plan de implementacion (reorganizado 10/07/2026)

### T1 — Goals Tasks Core (implementar AHORA)

Prioridad inmediata. No es streaks, no es templates.

- Backend: `calculateProgress` para `tasks` con reglas precisas de §11.
- Backend: `GET /api/planner/tasks?goal_id=:goalId` eficiente.
- Frontend: TaskForm contextual desde GoalDetail con `goal_id` preasignado.
- Frontend: GoalDetail muestra tareas vinculadas con progreso real.
- Frontend: Fix de `0%` falso en todas las pantallas (null ≠ 0).
- Frontend: Retorno a GoalDetail post-save, refresh de tareas y progreso.

### T2 — Templates / Presets (DESPUES de T1 estable)

- DB: seed de 8 presets basicos.
- Backend: endpoint `POST /api/planner/goals/from-template`.
- Frontend: Template Picker + Preview + confirmacion.
- Sin recurrencia, sin streaks, sin auto-asignacion en T2.

### T3 — Streaks product spec (SOLO DOCUMENTAR)

- Definir reglas de rachas por oportunidad programada.
- Definir copys sin culpa.
- Definir privacidad y riesgos.
- No implementar codigo.

### T4 — Streaks implementation (DESPUES de T3)

- DB: `streaks` + `streak_events`.
- Backend: `StreakService`, endpoints, cron.
- Frontend: badges, Profile, Home opcional.

### Fases legacy (Phase 0 a Phase 2) — COMPLETADAS

- Phase 0: alineacion Product/UX y documentacion.
- Phase 1: agregar `progress_mode` en DB/API/client types.
- Phase 2: actualizar `GoalForm` para crear metas simples y usar `progress_mode`.

## 19. QA final

- [ ] Crear meta `steps` con ruta simple.
- [ ] Despues de crear, ver `Agregar paso`, `Crear tarea`, `Ahora no`.
- [ ] Agregar hito y ver que aparece en detalle.
- [ ] Marcar/desmarcar hito y ver progreso de pasos.
- [ ] Crear meta `tasks`.
- [ ] Crear tarea desde la meta y verificar que queda vinculada.
- [ ] Completar tarea vinculada y ver progreso si la fase esta implementada.
- [ ] Crear meta numerica `count`.
- [ ] Crear meta numerica `amount`.
- [ ] Crear meta numerica `percentage`.
- [ ] Usar `Sumar avance`.
- [ ] Crear meta booleana.
- [ ] Usar `Marcar como lograda`.
- [ ] Crear meta `none` y verificar que no muestra progreso falso.
- [ ] Verificar que Home muestra como maximo una meta real.
- [ ] Verificar que Home no muestra Geni/fake intelligence.
- [ ] Verificar que no aparecen labels tecnicos en UX.
