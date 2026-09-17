# HomePlus — Planner Goals UX Implementation Spec

**Estado:** Especificación final integral de producto, UX y arquitectura funcional  
**Fecha:** 10/07/2026 (actualizada con decisiones de producto: Goals como planes accionables, tasks progress, templates, streaks)  
**Alcance:** Planner Goals mobile, backend, base de datos e integraciones de HomePlus  
**Tipo de documento:** Fuente de verdad previa a implementación  
**No incluye:** código ni prompts de implementación

---

# 1. Objetivo

Implementar la experiencia final de Planner Goals para que una persona o familia pueda definir, organizar, ejecutar y comprender una meta sin sentir que administra una planilla.

Goals debe permitir:

- crear una meta básica en aproximadamente diez segundos;
- elegir una forma de progreso comprensible;
- empezar con un paso, una tarea o un avance concreto;
- dividir metas complejas en hitos;
- asociar acciones operativas a la meta o a un hito;
- reutilizar tareas ya existentes;
- **funcionar como plan accionable: una meta puede empezar simple, pero debe poder convertirse en un conjunto de tareas reales para avanzar;**
- **crear metas desde plantillas (templates) que incluyen tareas sugeridas, hitos y responsables sugeridos (futuro: T2);**
- registrar progreso con uno o dos taps en el uso cotidiano;
- colaborar con otras personas del hogar;
- mantener privacidad cuando la meta sea personal;
- recuperar contexto mediante notas, comentarios, evidencia e historial;
- usar recordatorios reales;
- cerrar, reabrir, duplicar, archivar o eliminar una meta;
- integrar Goals con Tasks, Home y, cuando existan, Documents, Finance, Inventory, Assets, Medication, Feed y Geni;
- mostrar únicamente información real, nunca progreso, riesgo o inteligencia simulados;
- **reconocer continuidad mediante rachas basadas en oportunidad programada, no en obligación diaria (futuro: T4).**

La implementación debe transformar Goals de una interfaz CRUD generalista en una herramienta de avance.

La regla central es:

> **Máxima capacidad estructural, mínima carga visible.**

La complejidad del sistema debe resolverse mediante progressive disclosure. No debe eliminarse capacidad útil solo para reducir tiempo de implementación.

---

# 2. Regla de precedencia

Esta especificación reemplaza las decisiones visuales, de interacción y de alcance anteriores de:

- `PlannerGoalsScreen`;
- `GoalDetailScreen`;
- `GoalForm`;
- `HomePlannerSections`;
- creación y vinculación de tareas desde una meta;
- relación entre Goal, milestones y Tasks;
- acciones de progreso;
- tratamiento de metas finalizadas;
- permisos de colaboración;
- alcance de notas, historial, recordatorios, plantillas, recurrencia, evidencia e integraciones.

Se mantienen, salvo contradicción expresa:

- Goals dentro de Planner;
- `planner_goals`;
- `planner_goal_milestones`;
- `planner_tasks.goal_id`;
- API `/api/planner/goals`;
- RLS;
- household activo resuelto por backend;
- estados técnicos existentes `active | completed | failed`;
- visibilidad técnica existente `household | personal`;
- `progress_mode`;
- `target_type`;
- endpoints explícitos de complete/fail;
- soft delete;
- Home resume y Planner administra;
- metas personales privadas por defecto;
- ausencia de progreso falso;
- ausencia de Geni fake;
- ausencia de culpa, rankings o gamificación agresiva.

Cuando esta spec defina capacidades que el modelo actual todavía no soporta, deben implementarse mediante migraciones y contratos nuevos. No se debe degradar la UX final para adaptarla permanentemente al modelo incompleto actual.

---

# 3. Modelo mental final

Goals se organiza en cuatro niveles:

1. **Meta:** resultado que una persona o familia quiere alcanzar.
2. **Hito:** resultado parcial o punto de avance dentro de la meta.
3. **Tarea:** acción operativa asignable, fechable y verificable.
4. **Actualización:** evidencia de avance, comentario, nota, archivo, movimiento numérico o evento de actividad.

**Goals son planes accionables.** Una meta puede empezar simple (solo título + categoría + visibilidad), pero debe poder convertirse en un conjunto de tareas reales para avanzar. Una Goal puede funcionar como:

- **Meta simple:** objetivo con progreso medible, sin tareas vinculadas.
- **Plan con tareas:** meta que contiene un conjunto de tareas reales para avanzar.
- **Plan con hitos y tareas:** meta dividida en pasos (hitos), cada uno con tareas opcionales.
- **Task pack desde template:** meta creada a partir de una plantilla que incluye tareas sugeridas, hitos opcionales y responsables sugeridos (futuro: T2).

Estructura final:

```text
Goal
├── Información y configuración
├── Progreso principal
├── Hitos
│   ├── Estado
│   ├── Nota opcional
│   ├── Fecha objetivo opcional
│   └── Tareas opcionales
├── Tareas generales de la meta
├── Participantes y permisos
├── Notas y comentarios
├── Historial de actividad
├── Recordatorios
├── Archivos y evidencia
└── Integraciones
```

Una tarea pertenece como máximo a una meta y, opcionalmente, a un hito de esa misma meta.

No se permiten múltiples metas simultáneas por tarea.

---

# 4. Principios UX finales

## 4.1 Una acción principal por modo

Cada `progress_mode` define la acción cotidiana dominante:

| Modo | Acción principal |
|---|---|
| `steps` | marcar o desmarcar un hito |
| `tasks` | completar, crear o vincular una tarea |
| `numeric` | sumar avance |
| `boolean` | marcar como lograda |
| `none` | registrar contexto o ejecutar tareas relacionadas, sin porcentaje |

Las funciones secundarias existen, pero no compiten en primer nivel.

## 4.2 Null no equivale a cero

`progress_percentage = null` significa ausencia de medición válida.

En ese caso:

- no mostrar barra;
- no mostrar porcentaje;
- no usar fallback a cero;
- no mostrar `0 / ?`;
- mostrar un estado contextual.

## 4.3 Crear primero, estructurar después

La ruta rápida solicita:

- nombre;
- categoría;
- visibilidad.

El resto puede configurarse después.

## 4.4 El contexto elimina elecciones repetidas

Desde una meta o hito:

- `goal_id` se preasigna;
- `goal_milestone_id` se preasigna cuando corresponda;
- la pantalla explica el contexto;
- no se obliga a elegir nuevamente la meta.

## 4.5 Hito y tarea no son equivalentes

- Hito: resultado parcial.
- Tarea: acción para conseguirlo.

Pueden relacionarse y convertirse con confirmación, pero no se completan automáticamente entre sí.

## 4.6 La automatización nunca reemplaza intención humana

- completar todas las tareas de un hito no marca el hito automáticamente;
- completar todos los hitos no completa la meta automáticamente;
- alcanzar un target numérico no completa la meta automáticamente;
- vencer la fecha no cambia la meta a `failed`.

La app sugiere la acción siguiente; el usuario confirma el resultado.

## 4.7 Estados finales recuperables

Una meta completed o failed abre en modo read-only, pero puede:

- reabrirse;
- duplicarse;
- archivarse;
- eliminarse.

No debe quedar bloqueada irreversiblemente por un error humano.

## 4.8 Colaboración explícita

Los permisos de una meta no deben depender únicamente del rol global del household.

Goals final distingue:

- propietario;
- editor;
- participante;
- observador.

## 4.9 Home señala, Planner organiza

Home puede mostrar una sola meta relevante. Nunca:

- crea;
- edita;
- suma progreso;
- completa hitos;
- completa tareas;
- cambia estados.

## 4.10 Capacidad profunda mediante progressive disclosure

Nivel diario:

- siguiente paso;
- tarea;
- check;
- sumar avance;
- comentario rápido.

Nivel organizativo:

- hitos;
- tareas relacionadas;
- participantes;
- fechas;
- recordatorios;
- evidencia.

Nivel administrativo:

- modo;
- privacidad;
- permisos;
- duplicar;
- archivar;
- cerrar;
- eliminar.

---

# 5. Navegación

Bottom navigation:

```text
Home | People | + | Planner | More
```

Planner:

```text
Tareas | Calendario | Metas
```

Rutas de Goals dentro del stack de Planner:

- `PlannerGoals`;
- `CreateGoal`;
- `GoalDetail`;
- `EditGoal`;
- `GoalParticipants`;
- `GoalActivity`;
- `GoalFiles`;
- `GoalReminders`;
- `GoalTemplates`, cuando corresponda;
- selectores contextuales como sheets o rutas internas.

Quick Actions global incluye:

1. Crear tarea.
2. Crear evento.
3. Crear meta.

`Crear meta` abre la misma ruta `CreateGoal` y termina en GoalDetail post-create. No existe un formulario alternativo.

---

# 6. Modos de progreso

Se mantienen:

```text
steps | tasks | numeric | boolean | none
```

Mapeo visible:

| Técnico | Copy |
|---|---|
| `steps` | Con pasos |
| `tasks` | Con tareas |
| `numeric` | Con una cantidad |
| `boolean` | Solo marcarla como lograda |
| `none` | Sin una medida fija |

`target_type` nunca aparece como lenguaje visible.

## 6.1 Default

`steps` continúa como default.

## 6.2 Elección humana

Pregunta:

`¿Cómo vas a notar que avanzás?`

Opciones principales:

- Con pasos.
- Con tareas.
- Con una cantidad.
- Solo marcarla como lograda.

Opción secundaria:

- Sin una medida fija.

---

# 7. CreateGoal final

## 7.1 Ruta rápida

```text
Nueva meta

¿Qué querés lograr?
[Ej. Organizar el cumpleaños]

Categoría
[Casa] [Familia] [Salud] [Estudios] [Finanzas] [Otra]

¿Quién puede verla?
[Mi hogar]
[Solo yo]

[Crear meta]

Más opciones
```

## 7.2 Más opciones

- descripción;
- modo de progreso;
- fecha de inicio;
- fecha objetivo;
- prioridad opcional;
- responsable principal;
- participantes;
- recordatorio inicial;
- destacar en Home.

No se muestran todos los campos simultáneamente. Se usan filas resumidas.

## 7.3 Defaults

- `progress_mode = steps`;
- `visibility = household`;
- `category = home`;
- sin fecha;
- sin prioridad;
- creador como propietario;
- sin participantes adicionales explícitos;
- no destacada;
- sin recordatorios.

## 7.4 Post-create

Después de crear, abrir GoalDetail con estado `justCreated`.

```text
Meta creada

¿Cómo querés empezar?

[Agregar un paso]
[Crear una tarea]
[Vincular tareas existentes]
[Agregar una nota]
Ahora no
```

Las acciones visibles pueden adaptarse al modo:

- `steps`: Agregar paso, Crear tarea, Vincular tareas.
- `tasks`: Crear tarea, Vincular tareas.
- `numeric`: Sumar primer avance, Crear tarea.
- `boolean`: Crear tarea, Ahora no.
- `none`: Agregar nota, Crear tarea, Vincular tareas.

No mostrar barra falsa ni acciones terminales durante el prompt.

---

# 8. GoalDetail final

## 8.1 Shell común

- back;
- título;
- metadata mínima;
- menú `•••`;
- resumen principal según modo;
- siguiente acción;
- secciones secundarias;
- actividad reciente.

Metadata visible máxima:

- categoría;
- privacidad;
- fecha objetivo;
- responsable principal, cuando aporte contexto.

No mostrar una nube de chips.

## 8.2 Secciones

El orden se adapta al modo, pero la arquitectura disponible es:

1. Resumen y acción principal.
2. Hitos.
3. Tareas.
4. Notas y comentarios.
5. Archivos y evidencia.
6. Participantes.
7. Recordatorios.
8. Actividad.
9. Información.

Las secciones sin contenido se ocultan o muestran un único CTA liviano.

---

# 9. Hitos

## 9.1 Definición

Un hito es un resultado parcial.

Puede tener:

- título;
- nota breve opcional;
- estado;
- fecha objetivo opcional;
- orden;
- tareas vinculadas;
- evidencia opcional;
- actividad.

No tiene prioridad ni verificación propia. Esas capacidades pertenecen a Tasks.

## 9.2 AddStep

Patrón principal: composer inline.

Estado cerrado:

`Agregar paso`

Estado abierto:

```text
[Nombre del paso]
Cancelar                         Agregar
```

Reglas:

- autofocus;
- submit desde teclado;
- trim;
- vacío inválido;
- máximo 120 caracteres;
- contador visible desde 100;
- tras guardar, input limpio y abierto;
- CTA `Listo` para cerrar composer.

Crear puede ser optimistic si existe rollback robusto. Si no, debe mostrar guardado inmediato sin borrar el texto hasta confirmación.

## 9.3 Toggle

- optimistic;
- rollback ante error;
- snackbar `Paso marcado · Deshacer`;
- recalcular progreso local y luego confirmar con backend.

## 9.4 Editar

Edición inline:

- autofocus;
- Cancelar;
- Guardar;
- mismas validaciones.

## 9.5 Eliminar

Pendiente:

- eliminar;
- snackbar con Deshacer.

Logrado:

Confirmación:

`¿Eliminar este paso completado?`

`El progreso de la meta puede cambiar.`

## 9.6 Reordenar

Acción de sección:

`Ordenar pasos`

Activa drag handles temporalmente.

Persistir `sort_order`.

Optimistic con rollback.

## 9.7 Tareas dentro de un hito

Cada hito puede:

- crear una tarea;
- vincular tareas existentes;
- mostrar tareas asociadas;
- mover una tarea a otro hito;
- quitar una tarea del hito manteniéndola en la meta;
- convertir el hito en tarea.

Las tareas del hito siguen contando una sola vez en el progreso `tasks`.

## 9.8 Convertir hito en tarea

Acción:

`Convertir en tarea`

TaskForm prellena:

- título;
- goal;
- milestone.

Luego pregunta:

`¿Qué querés hacer con el paso original?`

- Mantenerlo como paso. Default.
- Reemplazarlo por la tarea.

Si se reemplaza, eliminar el hito solo después de que la tarea se haya creado correctamente.

## 9.9 Usar tarea como hito

Desde una tarea de la meta:

`Usar como hito`

Crea un hito con el mismo título y vincula la tarea al nuevo hito.

No modifica el estado de la tarea.

## 9.10 Tareas listas

Si todas las tareas computables del hito están completadas y el hito sigue pendiente:

```text
Todas las tareas de este paso están listas.

[Marcar paso como completado]
```

No marcar automáticamente.

---

# 10. Crear tareas desde una meta

## 10.1 Botones

En sección Tasks:

- `Crear tarea`;
- `Vincular existentes`.

En un hito:

- `Crear tarea`;
- `Vincular`.

## 10.2 TaskForm contextual

Título:

`Nueva tarea`

Subtítulo:

`Para: [meta]`

Si proviene de hito:

`Paso: [hito]`

## 10.3 Prellenado

Siempre:

- `goal_id`;
- `goal_milestone_id` cuando corresponda;
- retorno a GoalDetail.

No heredar silenciosamente:

- categoría;
- prioridad;
- responsable;
- verificación;
- fecha.

## 10.4 Sugerencias contextuales

Puede ofrecer:

- `Usar fecha objetivo de la meta`;
- `Asignar al responsable principal`;
- categoría equivalente si existe mapeo explícito;
- fecha del hito si existe.

Las sugerencias requieren acción del usuario.

## 10.5 Selector de meta

Oculto en flujo principal.

Dentro de Más opciones:

- Cambiar meta.
- Quitar meta.
- Cambiar paso.

Cambiar meta limpia cualquier milestone incompatible.

## 10.6 Guardado

Al guardar:

1. volver a GoalDetail;
2. refrescar Tasks;
3. refrescar Goal;
4. recalcular progreso;
5. mostrar `Tarea creada`.

Error:

- permanecer;
- conservar campos;
- mostrar reintento.

## 10.7 Crear varias

Después de guardar puede aparecer:

- `Listo`;
- `Crear otra tarea`.

`Crear otra` conserva goal/milestone, pero limpia el resto.

---

# 11. Vincular tareas existentes

## 11.1 Entrada

Desde meta:

`Vincular existentes`

Desde hito:

`Vincular`

## 11.2 Selector

Sheet o pantalla de selección con:

- búsqueda;
- filtros;
- selección múltiple;
- resumen de seleccionadas;
- CTA `Vincular tareas`.

## 11.3 Elegibles

Por defecto:

- pendientes;
- awaiting verification;
- accesibles;
- household activo;
- sin meta primero.

Filtro opcional:

`Mostrar terminadas`

No mostrar:

- canceladas;
- eliminadas;
- otro household;
- privadas inaccesibles;
- metas inaccesibles.

## 11.4 Ya vinculadas

Mostrar la meta actual.

Al elegir:

`Esta tarea ya pertenece a “[meta]”.`

`¿Querés moverla a “[nueva meta]”?`

Acciones:

- Cancelar.
- Mover tarea.

En selección múltiple, confirmar todas las tareas en conflicto dentro de un resumen antes de aplicar.

## 11.5 Desvincular

Acción contextual:

`Quitar de esta meta`

La tarea no se elimina.

Si estaba en un hito, otra acción:

`Quitar de este paso`

Esto mantiene `goal_id` y limpia solo `goal_milestone_id`.

## 11.6 Privacidad

No permitir una tarea privada inaccesible en una meta familiar.

Una meta personal puede relacionar una tarea compartida, pero:

- la meta no se revela;
- el badge se omite a personas sin acceso;
- se advierte al propietario.

## 11.7 Progreso

En `tasks`, vincular/mover/desvincular recalcula inmediatamente.

En otros modos, las tareas son contexto y no modifican el porcentaje principal.

---

# 12. Progress mode: steps

Fuente:

```text
hitos logrados / hitos activos
```

Reglas:

| Total | Logrados | Resultado |
|---:|---:|---|
| 0 | 0 | null |
| 1 | 0 | 0% real |
| 1 | 1 | 100% |
| 4 | 1 | 25% |

Sin hitos:

`Todavía no hay pasos`

`Empezá con un resultado pequeño que acerque esta meta.`

Todos logrados:

`Todos los pasos están listos`

`¿La meta ya está lograda?`

- Marcar como lograda.
- Seguir organizando.

No completar automáticamente.

Las Tasks no afectan directamente este porcentaje.

---

# 13. Progress mode: tasks

Fuente:

```text
tareas computables completadas / tareas computables totales
```

Numerador (completed_tasks):
- `status='completed'`
- `status='verified'`

No completada:
- `status='pending'`
- `status='awaiting_verification'` (nunca cuenta hasta que pasa a `verified`)

Excluidas del total:
- `status='cancelled'`
- soft-deleted (deleted_at no null)

**Importante:** `goal.requires_verification` NO existe ni controla el progreso de tasks. La verificación pertenece a Task, no a Goal. `awaiting_verification` nunca cuenta como completada hasta que se verifica.

Una task cuenta una vez aunque esté asociada a un hito.

**Resultados según estado:**

| Total computable | Completadas | progress_percentage | UI copy |
|---:|---:|---|---|
| 0 | 0 | `null` | "Todavía no hay tareas" |
| >0 | 0 | `0` real | "0 de N tareas terminadas" |
| >0 | < total | de 1 a 99 | "X de N tareas terminadas" |
| total | total | `100` | "Todas las tareas están listas" |

**Al llegar a 100%:** NO auto-completar la meta. Mostrar prompt: "¿La meta ya está lograda?" con acciones "Marcar como lograda" y "Seguir organizando".

Secciones:

1. Vencidas.
2. Hoy.
3. Próximas.
4. Sin fecha.
5. Esperando verificación.
6. Terminadas, colapsada.

Orden interno:

- prioridad;
- fecha;
- creación.

Sin tareas:

`Todavía no hay tareas`

- Crear primera tarea.
- Vincular existentes.

Todas computables completadas:

`Todas las tareas están listas`

`¿La meta ya está lograda?`

No completar automáticamente.

---

# 14. Progress mode: numeric

## 14.1 Acción principal

`Sumar avance`

Siempre suma un delta.

## 14.2 Endpoint atómico

Requerido:

```text
POST /api/planner/goals/:id/progress
```

Debe:

- aceptar meta numeric activa;
- validar permisos;
- aceptar delta positivo;
- actualizar atómicamente;
- permitir superar target;
- generar progress entry;
- devolver meta y entry;
- rechazar doble operación idempotente cuando se provea idempotency key.

## 14.3 Historial

Nueva entidad requerida:

`planner_goal_progress_entries`

Campos conceptuales:

- id;
- goal_id;
- delta;
- previous_value;
- resulting_value;
- note;
- source;
- created_by_member_id;
- created_at;
- reversed_at;
- reversed_by_member_id;
- reversal_reason.

No borrar físicamente movimientos.

## 14.4 Quick increments

Count:

- +1;
- +5;
- +10.

Amount ARS:

- +$1.000;
- +$5.000;
- +$10.000.

Percentage:

- +5%;
- +10%;
- +25%.

Además:

- recordar último incremento de esa meta;
- mostrar incrementos frecuentes sin llamarlos IA.

## 14.5 Formato

ARS:

- `$1.000`;
- `$120.000`;
- sin centavos por defecto.

Arquitectura:

- moneda configurable;
- ARS default local.

Percentage:

- entero si aplica;
- máximo un decimal.

## 14.6 Superar target

Permitido.

Mostrar:

`120 de 100`

`Objetivo superado por 20`

Barra visual 100%.

No completar automáticamente.

## 14.7 Corregir

Menú:

`Corregir avance`

Permite valor absoluto.

Genera una entry de corrección, no sobrescribe historial sin rastro.

## 14.8 Revertir

Snackbar inmediato:

`+$5.000 registrado · Deshacer`

Deshacer revierte la entry.

Historial permite:

`Revertir movimiento`

con permiso y confirmación.

## 14.9 Target inválido

Si null o 0:

`Falta definir el objetivo`

`Configurá una cantidad mayor que cero.`

No permitir sumar.

---

# 15. Progress mode: boolean

Active:

- `Pendiente`;
- CTA `Marcar como lograda`.

Completed:

- `Meta lograda`;
- fecha.

Failed:

- `Cerrada sin lograr`;
- fecha.

Sin barra.

Completar pide confirmación.

Snackbar inmediato:

`Meta lograda · Deshacer`

Después del periodo de undo, puede reabrirse mediante menú con permiso.

---

# 16. Progress mode: none

Nombre:

`Sin una medida fija`

No tiene barra ni porcentaje.

Puede contener:

- hitos opcionales sin cálculo principal;
- tareas;
- notas;
- comentarios;
- participantes;
- fechas;
- recordatorios;
- archivos;
- evidencia;
- actividad;
- actualizaciones cualitativas.

Acción principal contextual:

- próxima tarea;
- agregar actualización;
- agregar nota;
- marcar como lograda.

Puede aparecer en Home si:

- está fijada;
- tiene una tarea relevante;
- tiene una fecha cercana;
- tiene una actualización importante.

No mostrar progreso falso.

---

# 17. Metas finalizadas, reapertura, duplicación y archivo

## 17.1 Completed y failed

Abren read-only.

No permiten modificar contenido hasta reabrir.

Sí permiten:

- ver;
- navegar Tasks;
- historial;
- archivos;
- comentarios anteriores;
- duplicar;
- reabrir;
- archivar;
- eliminar;
- exportar.

## 17.2 Reabrir

Disponible para propietario y roles autorizados.

Confirmación:

`¿Reabrir esta meta?`

`Volverá a Activas y podrá modificarse otra vez.`

Conserva todo.

Registra actividad.

## 17.3 Duplicar

Disponible en cualquier estado.

Opciones:

- copiar información;
- copiar hitos;
- copiar Tasks como nuevas Tasks;
- copiar participantes;
- copiar recordatorios;
- copiar archivos como referencias, no duplicar bytes;
- elegir nuevas fechas.

Default:

- información + hitos;
- no copiar Tasks completadas;
- no copiar historial;
- no copiar comentarios;
- no copiar estados terminales;
- nueva meta active.

## 17.4 Archivar

Archivar no es estado de resultado.

Oculta la meta de listas normales.

Requiere nuevo campo:

- `archived_at`;
- `archived_by_member_id`.

Solo metas finalizadas pueden archivarse por defecto. Una meta active puede archivarse únicamente después de confirmación explícita de que seguirá active pero oculta; recomendación final: no permitir archivar active, usar cerrar o completar.

## 17.5 Eliminar

Soft delete.

Tareas:

- no se eliminan;
- `goal_id` y `goal_milestone_id` pasan a null.

Hitos, comentarios, recordatorios y relaciones:

- quedan inaccesibles;
- se preservan para integridad/auditoría según política;
- no se exponen.

---

# 18. Decisiones finas pendientes antes de implementar

Esta sección cierra decisiones que no deben quedar a criterio del agente.

## 18.1 Tarea general versus tarea de hito

- Toda Task asociada a un hito también tiene `goal_id`.
- `goal_milestone_id` solo puede referenciar un hito de ese `goal_id`.
- Una Task sin milestone es una tarea general.
- Mover de hito no cambia la meta.
- Mover de meta limpia el milestone.

## 18.2 Herencia de TaskForm

No existe herencia silenciosa.

Solo sugerencias explícitas y reversibles.

## 18.3 Selección múltiple de Tasks

Entra en el producto final.

Los conflictos se resuelven antes de aplicar el batch.

## 18.4 Hitos y Tasks

- Tasks no completan hitos automáticamente.
- Hitos no completan Tasks.
- La app puede sugerir la acción.
- Conversión disponible en ambas direcciones con confirmación.

## 18.5 Reordenamiento

Entra.

Se activa mediante modo específico, no handles permanentes.

## 18.6 Optimistic updates

Permitido en:

- toggle;
- reorder;
- cambio de pin;
- vínculo/desvínculo simple;
- reacciones futuras.

Requiere rollback.

Creaciones pueden ser optimistic solo con IDs temporales robustos.

## 18.7 Reapertura

Entra.

No se considera corrupción del estado; es una acción auditada.

## 18.8 None

No significa “sin acciones”, sino “sin fórmula de progreso”.

## 18.9 Quick Actions

Crear meta entra como tercera acción.

## 18.10 Home

Puede mostrar cualquier modo activo si existe una señal real o la meta está fijada.

## 18.11 Prioridad

Goals final soporta prioridad opcional:

- baja;
- normal;
- alta.

No usar prioridad como evaluación moral ni ordenar siempre por “peor”.

## 18.12 Meta fijada

Nuevo campo:

- `pinned_by_member_id` mediante tabla de preferencias por usuario, no campo global simple.

Cada persona puede fijar una meta diferente para su Home.

## 18.13 Responsabilidad

Una meta tiene:

- propietario obligatorio;
- responsable principal opcional;
- participantes.

El propietario administra. El responsable principal guía ejecución, pero no recibe automáticamente permisos de propietario.

## 18.14 Comentarios y notas

- Nota: contenido privado de organización de la meta según sus permisos.
- Comentario: mensaje colaborativo con autor y fecha.
- Actividad: evento generado por el sistema.

No mezclar las tres entidades.

## 18.15 Recordatorios

Entran como capacidad final.

No inventar notificaciones si la infraestructura todavía no está habilitada; deben existir estados claros de configuración.

## 18.16 Riesgo

Puede existir determinísticamente, nunca como predicción opaca.

Copy:

`La fecha objetivo está cerca`

No:

`Vas mal`

## 18.17 Recurrentes

Una meta recurrente genera una nueva instancia basada en plantilla.

No resetea silenciosamente una meta anterior.

## 18.18 Plantillas

Entran.

Pueden incluir:

- título;
- categoría;
- modo;
- hitos;
- Tasks sugeridas;
- recordatorios;
- duración relativa.

Nunca crean Tasks sin confirmación en la vista previa.

## 18.19 Evidencia

Puede asociarse a:

- meta;
- hito;
- actualización numeric/cualitativa.

No es requisito para completar salvo configuración futura explícita.

## 18.20 Exportación

Entra como capacidad final administrativa.

Formatos objetivo:

- PDF legible;
- CSV para datos estructurados;
- JSON solo para backup/interoperabilidad avanzada.

---

# 19. PlannerGoalsScreen final

## 19.1 Header

- título;
- búsqueda;
- `+`;
- tabs Activas / Finalizadas.

## 19.2 Para continuar

Máximo una card.

Prioridad:

1. meta fijada por el usuario;
2. Task vencida;
3. Task de hoy;
4. hito con fecha hoy/próxima;
5. fecha objetivo próxima;
6. meta sin estructura que necesita comenzar;
7. actividad reciente con acción concreta.

Desempate:

- fecha;
- prioridad;
- updated_at.

No usar IA.

## 19.3 Cards

Toda la card abre detalle.

Sin botones internos permanentes.

Contenido máximo:

- título;
- una línea secundaria;
- barra solo si real;
- fecha o privacidad cuando sea necesaria.

## 19.4 Filtros

Visibles:

- Activas;
- Finalizadas.

Sheet:

- personales;
- familiares;
- compartidas conmigo;
- categoría;
- modo;
- participantes;
- prioridad;
- con fecha;
- sin fecha;
- fijadas;
- archivadas.

Búsqueda por texto.

## 19.5 Finalizadas

Subfiltros:

- Todas.
- Logradas.
- Cerradas sin lograr.
- Archivadas.

Orden por fecha terminal descendente.

---

# 20. HomePlannerSections

Máximo una card.

Usar el mismo summary backend que PlannerGoalsScreen.

Selección:

1. fijada;
2. acción vencida;
3. hoy;
4. fecha cercana;
5. actualización relevante.

Personal:

- solo visible al propietario o participante autorizado.

None:

- puede aparecer si tiene señal real o está fijada.

Progress null:

- sin barra.

Home nunca muta Goals.

---

# 21. Fechas, recordatorios y riesgo

## 21.1 Fechas

`starts_at`:

- label `Empieza`;
- opcional;
- no visible en ruta rápida.

`ends_at`:

- label `Fecha objetivo`;
- opcional.

Fecha pasada:

`La fecha objetivo fue el [fecha]`

No cambia status.

## 21.2 Recordatorios

Tipos:

- fecha de inicio;
- días antes de fecha objetivo;
- fecha y hora personalizada;
- siguiente paso;
- Task vinculada;
- resumen semanal;
- check-in cualitativo.

Canales dependen de infraestructura:

- push;
- email;
- in-app.

## 21.3 Riesgo determinístico

Puede calcularse con:

- fecha cercana;
- progreso real;
- Tasks vencidas.

Debe ser explicable.

Ejemplo:

`La fecha objetivo está cerca y quedan 3 tareas.`

No usar puntajes ocultos.

---

# 22. Colaboración, permisos y privacidad

## 22.1 Roles por meta

- Owner.
- Editor.
- Participant.
- Viewer.

## 22.2 Matriz

| Acción | Owner | Editor | Participant | Viewer |
|---|---:|---:|---:|---:|
| Ver | Sí | Sí | Sí | Sí |
| Editar información | Sí | Sí | No | No |
| Agregar hitos | Sí | Sí | Según configuración | No |
| Toggle hitos | Sí | Sí | Sí | No |
| Crear/vincular Tasks | Sí | Sí | Sí | No |
| Comentar | Sí | Sí | Sí | Según configuración |
| Agregar evidencia | Sí | Sí | Sí | No |
| Completar meta | Sí | Configurable | No | No |
| Cerrar sin lograr | Sí | No | No | No |
| Reabrir | Sí | Configurable | No | No |
| Participantes | Sí | No | No | No |
| Eliminar | Sí | No | No | No |

## 22.3 Personal

Default owner-only.

Puede compartirse explícitamente sin convertirse automáticamente en household-wide.

Coordinador no obtiene acceso automático.

## 22.4 Familiar

Puede ser:

- todo el household;
- participantes seleccionados;
- segmento permitido por reglas futuras.

## 22.5 Salida del owner

Antes de abandonar el household:

- transferir ownership;
- cerrar/eliminar metas;
- convertir personal compartida según decisión.

No permitir meta colaborativa sin owner.

## 22.6 Filtraciones

Tasks nunca expanden metadata de Goals inaccesibles.

No mostrar `Meta privada`; omitir la referencia.

---

# 23. Notas, comentarios y actividad

## 23.1 Notas

Contenido de referencia editable.

Puede existir:

- nota principal de la meta;
- notas adicionales;
- nota de hito;
- nota de progress entry.

## 23.2 Comentarios

Para colaboración:

- autor;
- timestamp;
- edición limitada;
- eliminación;
- menciones futuras;
- permisos.

No son obligatorios para metas personales.

## 23.3 Activity log

Eventos mínimos:

- goal created;
- info updated;
- mode changed;
- visibility changed;
- participant added/removed;
- milestone created/toggled/edited/deleted;
- task linked/unlinked/moved;
- progress added/corrected/reversed;
- file added/removed;
- reminder configured;
- completed;
- failed;
- reopened;
- duplicated;
- archived;
- deleted.

El log debe respetar privacidad.

---

# 24. Plantillas y recurrencia

## 24.1 Plantillas (T2 — Templates / Presets)

Las plantillas son una capacidad confirmada para T2 (después de T1 estable). No se implementan en la fase inmediata.

Fuentes:
- HomePlus (presets globales);
- household (creadas por el hogar);
- personales (creadas por un miembro).

Vista previa antes de crear. El usuario elige qué copiar.

Pueden incluir:
- título;
- categoría;
- modo (`tasks` por defecto en presets);
- hitos sugeridos;
- Tasks sugeridas con responsables sugeridos;
- duración relativa sugerida;
- frecuencia sugerida (diaria, semanal, mensual, única);
- indicador de si genera racha.

Nunca crean Tasks sin confirmación en la vista previa.

### Presets iniciales (conceptuales para T2)

| Key | Título | Frecuencia | Duración | Genera racha |
|-----|--------|-----------|----------|-------------|
| `weekly_tidy_home` | Mantener la casa ordenada esta semana | weekly | 7 días | Sí |
| `deep_clean_kitchen` | Limpieza profunda de cocina | monthly | 1 día | No |
| `clean_bathroom` | Limpieza de baño | weekly | 1 día | Sí |
| `tidy_bedroom` | Ordenar habitación | weekly | 1 día | Sí |
| `prepare_birthday` | Preparar cumpleaños | once | 14 días | No |
| `prepare_vacation` | Preparar vacaciones | once | 21 días | No |
| `pet_care` | Rutina de mascotas | weekly | 7 días | Sí |
| `monthly_home_check` | Revisión mensual del hogar | monthly | 1 día | Sí |

Todos los presets usan `progress_mode='tasks'`.

Cada preset incluye tareas sugeridas con título, responsable sugerido (por rol: adulto, adolescente, todos) y frecuencia sugerida. El usuario puede editar todo antes de confirmar la creación.

## 24.2 Recurrencia

La recurrencia crea nuevas Goals. Opciones: semanal, mensual, anual, personalizada.

Cada instancia anterior conserva su resultado e historial.

No convertir Goals en Tasks rutinarias. Para acciones repetitivas simples se usa Planner Tasks.

La recurrencia no entra en T1 ni T2. Se implementa cuando exista infraestructura de recurrencia/occurrences (T4 o posterior).

## 24.3 Streaks / Rachas (T3 spec, T4 implementación)

Las rachas son una capacidad investigada y aprobada en concepto, pero no se implementan en T1 ni T2.

### Filosofía

**Racha por oportunidad programada, no por ejecución diaria obligatoria.**

Principios:
- No culpar por descansos.
- Reconocer continuidad cuando vuelve la actividad.
- Respetar la frecuencia natural de cada tarea.
- Rachas familiares sin presión de "todos tienen que cumplir".

### Reglas

- Si una task toca lunes/miércoles/viernes, la racha se evalúa esos días.
- Días sin tarea programada no rompen racha.
- Completar dentro de ventana de gracia mantiene racha.
- Completar fuera de ventana de gracia cuenta para progreso pero no para racha.
- Ventanas de gracia: 24h (daily), 2 días (weekly), 3 días (monthly).

### Tipos de rachas

- **Racha por task:** continuidad en una tarea recurrente específica.
- **Racha por template/rutina:** todas las tareas de la rutina completadas en el período.
- **Racha por goal:** goal completada en períodos recurrentes.
- **Racha personal:** al menos 1 tarea completada por día (del miembro).
- **Racha familiar:** al menos 1 tarea completada por día (de cualquier miembro).
- **Racha por responsabilidad:** continuidad en categoría (limpieza, mascotas, etc.).

### Rachas familiares

No requieren que todos cumplan. Basta con que el plan del hogar se complete.

Ejemplo: "Barrer" asignado a adulto → si adulto lo hace, racha familiar avanza. Si nadie lo hace → racha se corta.

### Copys (sin culpa)

| Estado | Copy |
|--------|------|
| Racha activa | "Seguís en ritmo" |
| Racha de 3+ | "3 veces seguidas cuando tocaba" |
| Racha fuerte | "Esta rutina viene bien" |
| Racha cortada | "Se cortó el ritmo. Podés retomar ahora." |
| Última vez | "Última vez completada: [fecha]" |
| Próxima oportunidad | "Próxima oportunidad: [fecha]" |
| Tarea atrasada (dentro de gracia) | "Llegaste tarde, pero seguís en ritmo" |
| Tarea atrasada (fuera de gracia) | "Te perdiste esta, pero podés recuperar el ritmo" |

Prohibido:
- "Fallaste", "Rompiste la racha", "Fracasaste".
- Rankings agresivos entre miembros.
- Comparaciones tipo leaderboard.

### UX de rachas

Dónde aparece:
- **Task card:** dot pequeño de racha (si aplica, discreto).
- **GoalDetail:** badge "Racha: X veces" (si Goal es recurrente y tiene streak).
- **Home:** card opcional "Tu ritmo esta semana" (toggle en settings, off por defecto).
- **Profile:** sección "Mis rachas" (principal, historial completo).
- **Planner summary:** badge "Racha familiar: X días".

Dónde NO aparece:
- TaskForm, GoalForm (evitar ruido al crear).
- Notificaciones agresivas.
- Colores de alerta (rojo, naranja).

### DB conceptual (para T4)

Tablas necesarias:
- `streaks`: `id, household_id, member_id (null = familiar), streak_type, entity_id, entity_type, current_count, longest_count, last_activity_date, is_active, started_at, paused_at, resumed_at`.
- `streak_events`: `id, streak_id, event_type (increment/reset/pause/resume), event_date, reason, metadata`.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Complejidad excesiva (6 tipos de rachas) | MVP solo rachas por task recurrente; resto en T4 |
| Presión familiar | Rachas personales privadas por defecto; familiares opt-in |
| Sensación de vigilancia | Cada uno ve solo sus propias rachas; padres configurable |
| Culpa por perder racha | Copys de recuperación; ventanas de gracia generosas; opción de pausar |
| Ruido visual | Dot discreto en TaskCard; Profile como lugar principal; Home opcional |

---

# 25. Archivos, fotos y evidencia

Goals final soporta evidencia mediante infraestructura Documents/Storage.

Puede adjuntarse a:

- Goal;
- milestone;
- comentario;
- progress entry.

Permisos heredan de Goal y pueden restringirse adicionalmente.

Home no muestra archivos.

No exponer archivos de una meta personal en Activity familiar.

---

# 26. Integraciones

## 26.1 Tasks

Integración completa definida en esta spec.

## 26.2 Calendar

Opcionalmente puede mostrar:

- start;
- target;
- recordatorios;
- hitos fechados.

No convertir Goals en Events automáticamente.

## 26.3 Finance/Fund

Metas financieras pueden vincular un Fund real.

El progreso puede derivarse del saldo del Fund.

Debe quedar claro si el progreso es:

- automático;
- manual;
- mixto.

No simular antes de Finance real.

## 26.4 Inventory, Assets, Medication

Integración mediante Tasks y eventos de dominio.

Ejemplo:

- Inventory genera Task;
- Task se vincula a Goal/hito.

## 26.5 Documents

Evidencia y archivos.

## 26.6 Feed

Puede celebrar completed y actividad permitida.

Nunca publica failed automáticamente.

## 26.7 Geni

Cuando sea real:

- sugiere descomposición;
- detecta próximos pasos;
- resume actividad;
- nunca modifica sin confirmación;
- respeta permisos;
- no usa metas personales ajenas.

---

# 27. Cambios frontend

Archivos principales actuales:

- `PlannerGoalsScreen.tsx`;
- `GoalDetailScreen.tsx`;
- `GoalForm.tsx`;
- `TaskForm.tsx`;
- `PlannerTasksScreen.tsx`;
- `plannerShared.ts`;
- `HomePlannerSections.tsx`;
- `plannerGoals.ts`;
- `plannerTasks.ts`;
- navegación y tipos.

Componentes recomendados:

- `GoalCard`;
- `GoalContinueCard`;
- `GoalDetailHeader`;
- `GoalPostCreatePrompt`;
- `GoalStepsSection`;
- `GoalTasksSection`;
- `GoalNumericSection`;
- `GoalBooleanSection`;
- `GoalQualitativeSection`;
- `GoalMilestoneRow`;
- `GoalMilestoneComposer`;
- `GoalTaskPicker`;
- `GoalTaskContext`;
- `GoalProgressSheet`;
- `GoalProgressHistory`;
- `GoalParticipantsSection`;
- `GoalCommentsSection`;
- `GoalActivitySection`;
- `GoalFilesSection`;
- `GoalRemindersSection`;
- `GoalAdminMenu`;
- `GoalFiltersSheet`.

No mantener GoalDetail monolítico.

---

# 28. Cambios backend

Mantener CRUD existente, pero ampliar.

Capacidades requeridas:

- progreso steps derivado;
- progreso tasks derivado;
- query Tasks por goal/milestone;
- batch link/unlink/move;
- atomic numeric progress;
- progress history;
- reopen;
- archive/unarchive;
- duplicate;
- participant management;
- role authorization;
- comments;
- notes;
- activity;
- reminders;
- pin preferences;
- templates;
- recurrence generation;
- file relations;
- deterministic summary para Planner/Home;
- integration hooks.

Todos los endpoints deben resolver household y usuario server-side.

---

# 29. Cambios DB

Modelo actual se conserva y amplía.

Cambios requeridos conceptuales:

## `planner_goals`

Agregar según necesidad:

- owner_member_id;
- responsible_member_id nullable;
- priority;
- archived_at;
- archived_by_member_id;
- recurrence_rule nullable;
- template_id nullable;
- reopened_at;
- reopen_count;
- qualitative_status opcional;
- version para concurrencia optimista.

No usar un único `pinned` global.

## `planner_goal_milestones`

Agregar:

- note;
- target_date;
- version.

## `planner_tasks`

Agregar:

- goal_milestone_id nullable;
- constraint de milestone perteneciente al goal.

## Nuevas tablas

- `planner_goal_participants`;
- `planner_goal_comments`;
- `planner_goal_notes`;
- `planner_goal_activity`;
- `planner_goal_progress_entries`;
- `planner_goal_reminders`;
- `planner_goal_user_preferences`;
- `planner_goal_templates`;
- `planner_goal_template_milestones`;
- `planner_goal_template_tasks`;
- `planner_goal_file_links`;
- tabla/estructura de recurrencia si no se resuelve en Goals.

Todas con RLS.

---

# 30. Archivos que no deben tocarse sin necesidad

No rediseñar ni reescribir:

- Auth;
- onboarding;
- households;
- invites;
- Planner Events;
- Calendar general;
- Tasks generales fuera de integración;
- Home completa;
- módulos Finance/Documents/Inventory/etc. antes de integrar;
- tablas legacy;
- migraciones ya aplicadas.

Se permiten cambios contractuales mínimos cuando Goals los necesite, pero deben estar aislados y cubiertos por QA.

---

# 31. Edge cases obligatorios

- borrar Goal con Tasks;
- borrar Goal con milestones;
- borrar milestone con Tasks;
- mover Task entre Goals;
- mover Task entre milestones;
- Task privada en Goal familiar;
- Goal personal con Task compartida;
- owner abandona household;
- último owner;
- participante suspendido;
- permisos revocados con pantalla abierta;
- active household cambia;
- multi-hogar;
- deep link sin acceso;
- dos toggles simultáneos;
- dos progress deltas simultáneos;
- duplicación de requests;
- cambio de modo con datos;
- cambio de moneda;
- target superado;
- target reducido debajo del current;
- reopen;
- archive;
- duplicate;
- recurrence;
- template con campos incompatibles;
- archivos inaccesibles;
- comments eliminados;
- offline;
- retry;
- conflictos al reconectar;
- timezone;
- fecha sin hora;
- Task recurring vinculada;
- verification rejected;
- meta personal compartida selectivamente.

---

# 32. Copy UX final esencial

## Empty

`Todavía no hay metas`

`Creá una meta para organizar algo que quieras lograr, solo o con otras personas.`

## Post-create

`Meta creada`

`¿Cómo querés empezar?`

## Hitos

`Agregar paso`

`Todas las tareas de este paso están listas.`

`Marcar paso como completado`

## Tasks

`Crear tarea`

`Vincular existentes`

`Para: [meta]`

`Paso: [hito]`

`Quitar de esta meta`

`Quitar de este paso`

## Numeric

`Sumar avance`

`Corregir avance`

`Historial de avances`

`Objetivo superado por [valor]`

## Complete

`¿Marcar esta meta como lograda?`

`La meta pasará a Finalizadas.`

## Close

`¿Cerrar esta meta sin lograrla?`

`Podrás reabrirla más adelante si lo necesitás.`

## Reopen

`¿Reabrir esta meta?`

`Volverá a Activas y podrá modificarse otra vez.`

## Archive

`Archivar meta`

`Dejará de aparecer en Finalizadas, pero no se eliminará.`

## Delete

`¿Eliminar esta meta?`

`Las tareas vinculadas no se eliminarán.`

## Errors

- `No pudimos cargar tus metas.`
- `No pudimos abrir esta meta.`
- `No pudimos guardar los cambios.`
- `No pudimos agregar el paso.`
- `No pudimos vincular las tareas.`
- `No pudimos registrar el avance.`
- `No pudimos actualizar los participantes.`
- `No pudimos configurar el recordatorio.`
- `Reintentar`.

---

# 33. Fases de implementación (reorganizadas 10/07/2026)

Las fases ordenan dependencias. No reducen el producto final.

La implementación se reorganiza en tiers (T1-T4) que agrupan las fases legacy según prioridad inmediata.

## T1 — Goals Tasks Core (IMPLEMENTAR AHORA)

Prioridad inmediata. Hacer que las tareas vinculadas muevan progreso real.

Incluye partes de las fases legacy: 1, 5.

**Backend:**
- `calculateProgress` para `progress_mode='tasks'` con reglas precisas de §13.
- `GET /api/planner/tasks?goal_id=:goalId` (query eficiente).
- Excluir cancelled y soft-deleted del total computable.
- `awaiting_verification` nunca cuenta como completada.
- `progress_percentage = null` si total computable = 0.
- `progress_percentage = 0` real si total > 0 y completadas = 0.
- Devolver `progress_percentage = 100` si todas completadas (pero NO auto-completar goal).

**Frontend:**
- Fix de `0%` falso en `PlannerGoalsScreen`, `GoalDetailScreen`, `HomePlannerSections` (null ≠ 0).
- GoalDetail: sección de tareas vinculadas con progreso real desde backend.
- TaskForm contextual desde GoalDetail:
  - título "Nueva tarea", subtítulo "Para: [goal title]".
  - si proviene de hito: "Paso: [milestone title]".
  - `goal_id` preasignado, sin selector de meta en UI primaria.
  - `goal_milestone_id` preasignado si DB lo soporta (sino marcar como future).
  - resto de campos normales (título, fecha, prioridad, responsable, verificación).
  - sin herencia silenciosa de categoría/prioridad/responsable/fecha.
  - sugerencias solo si el usuario las acepta explícitamente.
- Post-save: volver a GoalDetail, refrescar tareas, refrescar goal/progreso, "Tarea creada".
- Opción "Crear otra tarea" (conserva goal/milestone, limpia resto).

**DB (mínimo para T1):**
- Agregar `goal_milestone_id` a `planner_tasks` (FK opcional a `planner_goal_milestones`).
- Constraint: milestone debe pertenecer al mismo goal que la task.

## T2 — Templates / Presets (DESPUÉS de T1 estable)

Incluye partes de las fases legacy: 12.

**Backend:**
- Tablas: `planner_goal_templates`, `planner_goal_template_milestones`, `planner_goal_template_tasks`.
- Seed de 8 presets iniciales (ver §24.1).
- Endpoint `POST /api/planner/goals/from-template`.
- Sin recurrencia, sin streaks, sin auto-asignación.

**Frontend:**
- Template Picker desde "Nueva meta" (elegir preset o crear desde cero).
- Template Preview: lista de tareas sugeridas con checkboxes para activar/desactivar.
- Editar títulos, responsables y fechas antes de confirmar.
- Confirmar → crear Goal + tareas vinculadas → navegar a GoalDetail.

**Presets incluidos (conceptuales):**
1. Mantener la casa ordenada esta semana
2. Limpieza profunda de cocina
3. Limpieza de baño
4. Ordenar habitación
5. Preparar cumpleaños
6. Preparar vacaciones
7. Rutina de mascotas
8. Revisión mensual del hogar

## T3 — Streaks product spec (SOLO DOCUMENTAR)

Nueva fase. No implementar código. Especificar reglas de producto detalladas.

Ver §24.3 para las decisiones ya tomadas.

## T4 — Streaks implementation (DESPUÉS de T3 spec)

Incluye partes de las fases legacy: 11 (recordatorios/continuidad).

**DB:** `streaks` + `streak_events`.
**Backend:** `StreakService`, endpoints, cron.
**Frontend:** badges en TaskCard/GoalDetail, Profile, Home opcional.

Ver §24.3 para el diseño conceptual completo.

## Fases legacy (referencia, se retoman después de T1)

Las fases 1-15 definidas originalmente siguen siendo válidas como mapa de largo plazo. Se retoman en orden después de completar T1.

### Fase 0 — Contrato y auditoría ✅ COMPLETADA
### Fase 1 — Verdad visual y GoalDetail modular (cubierta parcialmente en T1)
### Fase 2 — Modelo estructural final
### Fase 3 — CreateGoal y post-create
### Fase 4 — Hitos completos
### Fase 5 — Tasks completas (cubierta en T1)
### Fase 6 — Numeric e historial
### Fase 7 — Finalización completa
### Fase 8 — Colaboración
### Fase 9 — PlannerGoalsScreen y summary
### Fase 10 — Home
### Fase 11 — Recordatorios y continuidad
### Fase 12 — Plantillas y recurrencia (cubierta en T2)
### Fase 13 — Evidencia
### Fase 14 — Integraciones
### Fase 15 — QA integral

### Qué NO implementar

- Rankings agresivos entre miembros.
- Comparativas entre hogares.
- Gamificación avanzada (puntos, niveles, XP).
- Geni (asistente automático) hasta que exista infraestructura real.
- Auto-completar meta al llegar a 100% de tareas/hitos.
- `goal.requires_verification` como campo que controle progreso de tasks (la verificación pertenece a Task, no a Goal).

---

# 34. Checklist de aceptación global

## Producto

- [ ] Goals es una herramienta de avance, no CRUD.
- [ ] Crear sigue siendo rápido.
- [ ] La profundidad no carga la pantalla diaria.
- [ ] Ninguna función se excluye solo por tiempo.

## Progreso

- [ ] Null no es cero.
- [ ] Steps deriva de hitos.
- [ ] Tasks deriva de Tasks.
- [ ] Numeric es atómico y auditable.
- [ ] Boolean no usa barra.
- [ ] None admite acciones sin fórmula.

## Hitos y Tasks

- [ ] Se distinguen conceptualmente.
- [ ] Una Task puede pertenecer a un hito.
- [ ] Se puede crear, vincular, mover y desvincular.
- [ ] Hay selección múltiple.
- [ ] Se puede convertir hito/tarea.
- [ ] Nada se completa automáticamente sin confirmación.

## Finalización

- [ ] Complete y close son claros.
- [ ] Reopen existe.
- [ ] Duplicate existe.
- [ ] Archive existe.
- [ ] Delete no elimina Tasks.

## Colaboración

- [ ] Owner, editor, participant y viewer están definidos.
- [ ] Coordinador no ve personales por defecto.
- [ ] No hay filtración mediante Tasks.
- [ ] Existe transferencia de ownership.

## Home y lista

- [ ] Una card máxima en Home.
- [ ] Pin por usuario.
- [ ] Algoritmo determinístico.
- [ ] Búsqueda y filtros.
- [ ] Finalizadas y archivadas separadas.

## Continuidad

- [ ] Fechas no generan fracaso automático.
- [ ] Recordatorios reales.
- [ ] Recurrencia genera nuevas instancias.
- [ ] Plantillas tienen preview.

## Evidencia e integraciones

- [ ] Archivos respetan permisos.
- [ ] Finance no se simula.
- [ ] Geni no se simula.
- [ ] Feed no expone fracasos.
- [ ] Integraciones conservan ownership y privacidad.

## Calidad

- [ ] Targets táctiles accesibles.
- [ ] No dependencia exclusiva de color.
- [ ] Estados de error recuperables.
- [ ] Optimistic updates con rollback.
- [ ] Concurrencia cubierta.
- [ ] Multi-hogar aislado.
- [ ] Sin cola offline falsa.
- [ ] Sin progreso, riesgo o inteligencia inventados.

---

# 35. Resultado esperado

Goals final debe poder representar desde una meta simple de un solo toque hasta un proyecto familiar con hitos, tareas, responsables, archivos, comentarios, recordatorios e integraciones.

Sin embargo, la experiencia cotidiana debe seguir respondiendo una pregunta:

> **¿Qué puedo hacer ahora para acercarme a esta meta?**

La implementación queda aceptada cuando HomePlus puede ofrecer toda la profundidad necesaria sin obligar a una persona a comprender la arquitectura interna del sistema.
