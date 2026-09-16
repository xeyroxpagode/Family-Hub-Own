# PLANNER fragment — HomePlus — FinalSpec

## 1. Información encontrada

### Objetivo del módulo

Planner es el núcleo operativo de HomePlus. Administra Tasks, Calendar y Responsabilidades. Para este fragment se extrae únicamente información aplicable a Tasks, Events y Calendar dentro del alcance MVP.

### Submódulos encontrados

- Tasks.
- Calendar.
- Events dentro de Calendar.
- Responsabilidades como propiedad/eje organizador de Tasks.

### Entidades

#### Tasks

- **Task**
  - Representa trabajo pendiente o realizado.
- **Responsibility / Responsabilidad**
  - Agrupa áreas operativas del hogar.
  - Es una propiedad de la tarea.
  - Es eje organizador dentro de Tasks.
- **TaskTemplate**
  - El documento indica que existen plantillas de tareas.
  - Inicialmente solo para Tasks.
- **AuditLog**
  - Registra acciones importantes de Planner.

#### Events / Calendar

- **Calendar**
  - Administra eventos.
- **Event**
  - Evento del calendario.
- **EventParticipant**
  - El documento indica que los eventos pueden tener múltiples participantes.

### Campos

#### Task

Campos principales encontrados:

- Título.
- Descripción.
- Responsable.
- Fecha de inicio.
- Fecha de vencimiento.
- Prioridad.
- Estado.
- Responsabilidad asociada.

Campos encontrados en el documento pero clasificados fuera del MVP de este fragment:

- Archivos.
- Comentarios.

#### Event

No se encontró una lista formal de campos de Event.

Información encontrada:

- Los eventos pueden ser familiares.
- Los eventos pueden ser personales.
- Los eventos pueden tener participantes múltiples.
- Los eventos tienen estado.

No se encontraron campos explícitos como título, descripción, fecha de inicio, fecha de fin, ubicación o recurrencia.

#### Calendar

No se encontraron campos formales de Calendar.

### Tipos

#### Prioridades de Task

- Baja.
- Media.
- Alta.
- Crítica.

#### Tipos de Event

- Familiar.
- Personal.

### Valores por defecto

No se encontraron valores por defecto para Tasks, Events o Calendar.

### Estados posibles

#### Task

Estados encontrados en el documento:

- Pendiente.
- En progreso.
- Completada.
- Cancelada.

Estado derivado:

- Vencida no es un estado.
- Vencida se calcula automáticamente.

#### Verification Flow de Task

Información encontrada:

- Las tareas pueden requerir verificación.
- La verificación es opcional.
- Cuando se verifica, el documento describe el flujo como: Completada → Estado final.
- El documento indica explícitamente que no existe un estado separado para verificación.

#### Event

Estados encontrados:

- Programado.
- Completado.
- Cancelado.

Regla encontrada:

- No existe Postergado.
- Postergar equivale a modificar fecha.

### Reglas de negocio

#### Tasks

- Las tareas representan trabajo pendiente o realizado.
- Las tareas pueden asignarse a terceros.
- Los responsables pueden variar según permisos.
- La reasignación puede realizarse según permisos del hogar.
- Una tarea posee una única responsabilidad principal.
- No hay múltiples responsabilidades por tarea.
- Las tareas pueden requerir verificación de forma opcional.
- Vencida se calcula automáticamente y no debe tratarse como estado manual.
- Las tareas se pueden agrupar por Responsabilidad, Prioridad o Fecha.

#### Templates

Información encontrada:

- Existen plantillas de tareas.
- Inicialmente solo para Tasks.

Nombres encontrados relacionados con responsabilidades operativas:

- Compras.
- Mascotas.
- Limpieza.

No se encontró la lista completa de templates predefinidas MVP:

- Medicación.
- Estudios.
- Pagos.

No se encontró que las templates sean editables.
No se encontró CRUD de templates.
No se encontraron endpoints de templates.

#### Events / Calendar

- Calendar administra eventos.
- Los eventos pueden ser familiares o personales.
- Los eventos pueden tener múltiples participantes.
- Postergar un evento equivale a modificar su fecha.
- Home puede redirigir Próximos eventos hacia Calendar.

### Permisos

#### Adult / Adulto

Puede:

- Crear tareas.
- Reasignar tareas.
- Crear eventos.

#### Adolescent / Adolescente

Puede:

- Crear eventos familiares.
- Administrar tareas propias.

#### Senior / Adulto Mayor

- Mantiene acceso a tareas y briefing.
- La experiencia prioriza eventos y recordatorios.

#### Child / Niño

- Posee acceso simplificado.
- No administra información familiar crítica.

#### Guest / Invitado

- Acceso mínimo.
- Participación limitada.

No se encontraron permisos detallados para:

- Editar tareas.
- Eliminar tareas.
- Completar tareas.
- Verificar tareas.
- Crear tareas por todos los roles.
- Editar eventos.
- Eliminar eventos.
- Listar eventos.
- Ver Calendar por rol.

### Flujos

#### Crear tarea

Información encontrada:

- Adulto puede crear tareas.
- Crear tarea aparece como acción posible en Quick Actions.
- Crear tarea aparece como acción ejecutable en Search.
- La creación de tareas es auditable.

No se encontró contrato técnico del flujo.

#### Editar tarea

Información encontrada:

- La navegación define stack: Tasks → Task Detail → Edit Task → History.
- La edición de tareas es auditable.

No se encontró contrato técnico del flujo.

#### Eliminar tarea

No encontrado.

#### Completar tarea

Información encontrada:

- La actividad automática de una tarea puede registrar “Completada”.
- El completado de tareas es auditable.
- Cuando las tareas se completan, los widgets de Home desaparecen y Home se reorganiza.

No se encontró contrato técnico del flujo.

#### Verificar tarea

Información encontrada:

- Una tarea puede requerir verificación.
- Verificación es opcional.
- El documento no define estados separados para verificación.

Contradicción con MVP esperado:

- El MVP espera estados `pending`, `completed`, `awaiting_verification`, `verified`.
- El documento dice que no existe estado separado.

#### Listar tareas

Información encontrada:

- Planner contiene Tasks.
- Tasks tiene filtros:
  - Todas.
  - Mías.
  - Familia.
  - Recurrentes.
  - Completadas.
- Tasks puede agruparse por:
  - Responsabilidad.
  - Prioridad.
  - Fecha.

No se encontró endpoint ni contrato de listado.

#### Asignar miembro

Información encontrada:

- Task tiene Responsable.
- Las tareas pueden asignarse a terceros.
- Los responsables pueden variar según permisos.

No se encontró contrato técnico.

#### Fecha límite

Información encontrada:

- Task tiene Fecha de vencimiento.
- Vencida se calcula automáticamente.

#### Crear evento

Información encontrada:

- Adulto puede crear eventos.
- Adolescente puede crear eventos familiares.
- Crear evento aparece como acción posible en Quick Actions.
- Crear evento aparece como acción corta que puede abrirse en modal.

No se encontró contrato técnico.

#### Editar evento

Información encontrada:

- Postergar equivale a modificar fecha.

No se encontró contrato técnico.

#### Eliminar evento

No encontrado.

#### Listar evento

Información encontrada:

- Calendar administra eventos.
- Home muestra Próximos eventos y redirige a Calendar.

No se encontró contrato técnico de listado.

#### Ver calendario

Información encontrada:

- Planner contiene Calendar.
- Home puede redirigir Próximos eventos hacia Calendar.

No se encontraron vistas Día, Semana o Mes.

#### Recurrencia simple de eventos

No se encontró recurrencia de eventos.

No se encontraron valores:

- none.
- daily.
- weekly.
- monthly.

### APIs

No se encontraron endpoints, métodos, rutas, request, response ni errores para Planner.

Acciones mencionadas sin contrato API:

- Crear tarea.
- Editar tarea.
- Completar tarea.
- Verificar tarea.
- Reasignar tarea.
- Listar tareas.
- Crear evento.
- Editar evento por modificación de fecha.
- Listar eventos.
- Ver Calendar.

Acciones MVP no encontradas:

- Eliminar tarea.
- Eliminar evento.

### UI

#### Planner

Estructura interna encontrada:

```txt
Planner
├─ Tasks
├─ Calendar
```

#### Tasks

Filtros encontrados:

- Todas.
- Mías.
- Familia.
- Recurrentes.
- Completadas.

Agrupaciones encontradas:

- Responsabilidad.
- Prioridad.
- Fecha.

Navegación encontrada:

```txt
Tasks → Task Detail → Edit Task → History
```

Modales:

- Crear tarea puede ser modal porque es una acción corta.

#### Calendar

- Calendar vive dentro de Planner.
- No se definieron vistas Día/Semana/Mes.
- No se definieron estados vacíos.
- No se definieron filtros.

#### Events

- Crear evento puede ser modal porque es una acción corta.

#### Quick Actions

Acciones aplicables al alcance MVP encontradas:

- Crear tarea.
- Crear evento.
- Ver pendientes.

#### Search

Acciones ejecutables aplicables al alcance MVP encontradas:

- “crear tarea” → Crear tarea.

### Navegación

- Planner es un tab de Bottom Navigation.
- Calendar vive dentro de Planner.
- Tasks vive dentro de Planner.
- Responsabilidades no son dominio independiente.
- Modales se usan solo para acciones cortas como crear tarea o crear evento.

### Eventos del sistema

Eventos conceptuales encontrados para Task, sin nombres técnicos:

- Tarea creada.
- Responsable cambiado.
- Fecha modificada.
- Completada.

Acciones auditables de Planner:

- Creación.
- Edición.
- Asignación.
- Reasignación.
- Completado.

Eventos conceptuales encontrados para Event, sin nombres técnicos:

- Evento creado.
- Evento modificado por cambio de fecha.

No se encontró evento conceptual para eliminación de evento.

### Dependencias

- Task depende de Person como Responsable.
- Task depende de Responsibility como eje organizador.
- Task puede relacionarse con Event.
- Calendar depende de Event.
- Event depende de Person cuando hay participantes.
- Home consume Tasks y Events para mostrar resúmenes.
- AuditLog registra acciones de Planner.

### Restricciones arquitectónicas

- Responsabilidades no son dominio independiente.
- Responsabilidades son propiedad de Task y eje organizador dentro de Tasks.
- Una tarea siempre tiene una Responsabilidad asociada, según la estructura de navegación.
- Vencida no es un estado.
- Home no administra tareas ni eventos; solo resume y redirige.
- Los cambios importantes de Planner deben quedar auditados.

### Casos especiales / Edge cases

- Tarea vencida debe calcularse automáticamente.
- Postergar evento equivale a modificar fecha, no a crear estado nuevo.
- La verificación de tarea contradice el estado esperado por el MVP.

### Funcionalidades REAL

- Crear tarea aparece como acción.
- Editar tarea aparece en navegación.
- Completar tarea aparece en actividad/auditoría.
- Listar tareas aparece mediante vista Tasks, filtros y agrupaciones.
- Prioridades existen.
- Responsable existe.
- Fecha de vencimiento existe.
- Responsabilidad asociada existe.
- Crear evento aparece como acción.
- Calendar existe dentro de Planner.
- Eventos tienen estados.
- Home muestra próximos eventos.

### Funcionalidades MOCK

No se encontró información mockeable dentro de Planner.

### Funcionalidades POST_MVP

- Adjuntos en tareas.
- Comentarios en tareas.
- Participantes avanzados de eventos.
- TaskTemplate como entidad reutilizable si se interpreta más allá de constantes del sistema.
- Recurrencias de tareas.
- Dependencias entre tareas.
- Subtareas.
- Timeline avanzado con comentarios humanos.

## 2. Clasificación para implementación

### REAL

#### Tasks

- Task como entidad de trabajo pendiente o realizado.
- Campos básicos encontrados:
  - Título.
  - Descripción.
  - Responsable.
  - Fecha de inicio.
  - Fecha de vencimiento.
  - Prioridad.
  - Estado.
  - Responsabilidad asociada.
- Prioridades:
  - Baja.
  - Media.
  - Alta.
  - Crítica.
- Estados encontrados en documento:
  - Pendiente.
  - En progreso.
  - Completada.
  - Cancelada.
- Estado derivado:
  - Vencida calculada automáticamente.
- Crear tarea como acción mencionada.
- Editar tarea como navegación mencionada.
- Completar tarea como actividad/auditoría mencionada.
- Listar tareas mediante vista Tasks con filtros.
- Asignar responsable.
- Reasignar según permisos del hogar.
- Fecha de vencimiento.
- Agrupación por Responsabilidad, Prioridad y Fecha.
- Plantillas de tareas existen, sin CRUD definido.

#### Verification Flow

- Las tareas pueden requerir verificación.
- Verificación es opcional.
- El documento no define estados separados de verificación.

#### Events / Calendar

- Calendar administra eventos.
- Eventos familiares y personales.
- Estados de Event:
  - Programado.
  - Completado.
  - Cancelado.
- Crear evento como acción mencionada.
- Editar evento implícito como modificación de fecha.
- Próximos eventos se muestran en Home y redirigen a Calendar.

### MOCK

No se encontró información mockeable para Planner.

### POST_MVP

- Adjuntos.
- Comentarios.
- Participantes avanzados para eventos.
- Templates personalizadas no están definidas en el documento; si se incorporan, deben quedar fuera del MVP.
- TaskTemplate como entidad persistente o editable no debe convertirse en MVP desde este fragment.
- Dependencias entre tareas.
- Subtareas.
- Recurrencias de tareas.
- Timeline avanzado.

### IGNORAR

No se incorpora contenido clasificado fuera de alcance.

## 3. Información faltante

### Tasks

- Falta contrato API para crear tarea.
- Falta contrato API para editar tarea.
- Falta contrato API para eliminar tarea.
- Falta contrato API para completar tarea.
- Falta contrato API para listar tareas.
- Falta contrato API para verificar tarea.
- Falta request/response para todas las acciones.
- Falta definición de errores.
- Falta tipo de cada campo.
- Falta definición de campos obligatorios/opcionales.
- Falta definición técnica de prioridad.
- Falta mapping oficial entre estados en español y estados técnicos MVP.
- Falta permiso explícito para editar tarea.
- Falta permiso explícito para eliminar tarea.
- Falta permiso explícito para completar tarea.
- Falta permiso explícito para verificar tarea.
- Falta definir quién puede verificar una tarea.
- Falta definir si la persona asignada puede completar siempre la tarea.
- Falta definir comportamiento cuando una tarea requiere verificación.
- Falta resolver contradicción entre estados del documento y estados MVP esperados.
- Falta lista completa de templates predefinidas MVP.
- Falta confirmar que templates son constantes del sistema.
- Falta confirmar que templates no tienen CRUD.
- Falta confirmar que templates no requieren tabla ni endpoints.

### Events

- Falta lista de campos de Event.
- Falta contrato API para crear evento.
- Falta contrato API para editar evento.
- Falta contrato API para eliminar evento.
- Falta contrato API para listar eventos.
- Falta request/response para Events.
- Falta definición de errores.
- Falta permiso explícito para editar evento.
- Falta permiso explícito para eliminar evento.
- Falta recurrencia simple de eventos.
- Faltan valores `none`, `daily`, `weekly`, `monthly`.
- Falta definición de participantes dentro del alcance MVP.

### Calendar

- Falta vista Día.
- Falta vista Semana.
- Falta vista Mes.
- Falta definición de rango de fechas.
- Falta definición de calendario mostrando tareas con fecha.
- Falta definición de filtros.
- Falta navegación interna de Calendar.
- Falta estados vacíos de Calendar.
- Falta contrato API para consultar calendario.

## 4. Fuente

- Archivo: `HomePlus — FinalSpec(1).md`
- Sección: `04.04 Adulto`
- Sección: `04.05 Adolescente`
- Sección: `04.06 Niño`
- Sección: `04.07 Adulto Mayor`
- Sección: `04.08 Invitado`
- Sección: `06.01 Objetivo`
- Sección: `06.02 Objetivo`
- Sección: `06.03 Campos principales`
- Sección: `06.04 Estados`
- Sección: `06.05 Prioridades`
- Sección: `06.12 Timeline`
- Sección: `06.13 Verificación`
- Sección: `06.14 Asignación`
- Sección: `06.15 Reasignación`
- Sección: `06.16 Plantillas`
- Sección: `06.17 Objetivo`
- Sección: `06.18 Responsabilidad principal`
- Sección: `06.19 Miembros`
- Sección: `06.20 Responsables múltiples`
- Sección: `06.21 Objetivo`
- Sección: `06.22 Eventos`
- Sección: `06.23 Estados`
- Sección: `06.24 Participantes`
- Sección: `18.03 Navegación contextual`
- Sección: `18.14 Filosofía`
- Sección: `18.15 Dinamismo`
- Sección: `18.16 Estado final`
- Sección: `21.03 Task`
- Sección: `21.04 Estado derivado`
- Sección: `21.05 Event`
- Sección: `23.05 Planner`
- Sección: `24.08 Planner — Estructura interna`
- Sección: `24.09 Quick Actions — Congelado V1`
- Sección: `24.10 Search Global`
- Sección: `24.16 Reglas globales de navegación`
- Archivo: `Final Spec(1).txt`
- Sección: `OUTPUT 2 — CORE ENTITIES`
- Sección: `OUTPUT 3 — CANONICAL RELATIONSHIPS`
- Archivo: `source_map_HomePlus_FinalSpec(1).md`
- Sección: `4.7 PLANNER`
- Sección: `4.8 TASKS`
- Sección: `4.9 EVENTS`
- Sección: `4.10 CALENDAR`
