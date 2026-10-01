# PLANNER fragment — HomePlus — Sección 1 PRODUCTO

> Fragment crudo de implementación visual/interactiva.  
> Alcance estricto: extraído solamente de `HomePlus — SECCION 1 PRODUCTO.md`, `Seccion 1 Producto.txt` y `source_map_HomePlus_SECCION_1_PRODUCTO.md`.  
> No fusiona con otros documentos. No completa huecos. No define spec final.

---

## 1. Rol del módulo en la demo

### Información explícita encontrada

* Planner aparece como parte central de la propuesta de valor de HomePlus: unifica tareas, calendario y metas dentro del sistema operativo del hogar.
* Planner es definido como **núcleo operativo**.
* Planner administra:
  * Tasks.
  * Calendar.
  * Goals.
* Planner ayuda a que las tareas y responsabilidades se ejecuten sin tener que pedirlas dos veces.
* Planner reduce la carga mental del Coordinador cuando funciona incluso con un solo usuario activo.
* En adopción individual, Planner permite administrar tareas, calendario y metas aunque nadie más vea todavía esa información.
* En adopción familiar, cada miembro ve sus propias tareas, eventos y metas para saber qué le toca hacer sin preguntar.
* Planner participa en la visibilidad del esfuerzo: hace visible quién hace qué y cómo se distribuye la carga.
* Planner se integra en el ecosistema: no funciona como app separada.
* Planner debe convivir con Home: Home referencia Tasks y Calendar, pero Home resume, no administra.
* Planner aparece como un módulo de navegación primaria en Bottom Navigation V1.

### Valor mostrado al usuario

* Control sobre tareas y calendario.
* Claridad sobre responsabilidades propias.
* Reducción de coordinación manual por WhatsApp o memoria personal.
* Visibilidad del esfuerzo familiar.
* Utilidad desde el primer uso, incluso si solo hay un usuario activo.

### Problema familiar que resuelve

* Reduce la asimetría de coordinación.
* Evita que una sola persona tenga que recordar, pedir, organizar y perseguir a los demás.
* Centraliza trabajo pendiente y eventos familiares/personales.
* Hace más visible quién tiene responsabilidades asignadas.

### Qué debe sentir el usuario

* Que sabe qué le toca hacer.
* Que no necesita preguntar por tareas o eventos.
* Que el hogar tiene un sistema operativo visible, no una suma de mensajes sueltos.
* Que puede usar Planner solo, sin depender de que toda la familia adopte la app.

---

## 2. Información encontrada para las 7 condiciones MVP

### 2.1 Pantalla visualmente terminada

#### Pantallas / componentes encontrados

* `Planner` como módulo principal dentro de Bottom Navigation.
* `Tasks` como feature del Planner.
* `Calendar` como feature del Planner.
* `Task Detail` como pantalla de detalle de tarea.
* `Event Detail` como pantalla de detalle de evento.
* `Home` referencia Tasks y Calendar como fuente de resumen.

#### Navegación visual detectada

* Bottom Navigation V1:
  * Home.
  * People.
  * +.
  * Planner.
  * More.
* Planner está en navegación primaria.
* Home es la pantalla inicial y conduce a módulos dueños.
* Quick Actions existe como botón `+` central en Bottom Nav, pero el documento asociado solo confirma que contiene Geni Chat; no detalla acciones rápidas de Planner.

#### UI explícita de Tasks

* `Task Detail` muestra timeline de actividad automática y comentarios humanos.
* No se encontró lista de tareas explícita.
* No se encontró pantalla Crear tarea.
* No se encontró pantalla Editar tarea.
* No se encontraron tabs, filtros, botones ni inputs concretos.

#### UI explícita de Events / Calendar

* `Event Detail` muestra participantes e información asociada.
* No se encontró lista de eventos explícita.
* No se encontró pantalla Crear evento.
* No se encontró pantalla Editar evento.
* No se encontraron vistas día, semana o mes.
* No se encontraron filtros, rangos ni estados vacíos de Calendar.

#### Jerarquía visual detectada

* Home muestra resúmenes y redirige al módulo que administra.
* Planner administra Tasks y Calendar.
* Calendar administra eventos familiares y personales.

### 2.2 Datos creíbles

#### Datos / categorías encontrados

* Tasks representan trabajo pendiente o realizado.
* Campos mencionados para Tasks:
  * título.
  * descripción.
  * responsable.
  * fechas.
  * prioridad.
  * estado.
  * responsabilidad asociada.
  * goal.
  * archivos.
  * comentarios.
* Responsabilidades agrupan áreas operativas del hogar.
* Ejemplos de responsabilidades / áreas operativas encontrados:
  * Compras.
  * Mascotas.
  * Limpieza.
  * Vehículos.
* Event representa evento familiar o personal.
* Event puede tener múltiples participantes.
* Calendar administra eventos familiares y personales.
* Receptor ve sus tareas y eventos.
* El Coordinador administra sus tareas y calendario.

#### Estados encontrados para Task

* Pendiente.
* En progreso.
* Completada.
* Cancelada.
* Vencida no es estado: se calcula.

#### Estados encontrados para Event

* Programado.
* Completado.
* Cancelado.

#### Datos pedidos por el prompt pero no encontrados en este documento

* No se encontraron templates predefinidas MVP como constantes del sistema:
  * Limpieza aparece como responsabilidad/área operativa, no como template formal.
  * Compras aparece como responsabilidad/área operativa, no como template formal.
  * Mascotas aparece como responsabilidad/área operativa, no como template formal.
  * Medicación no aparece como template de Planner; aparece asociada a Adulto Mayor/medicación o medicamentos en Inventory/Presence, fuera de este fragment.
  * Estudios no aparece.
  * Pagos no aparece como template de Planner; pagos/deudas aparecen en Finance, fuera de este fragment.
* No se encontraron ejemplos concretos de tareas con texto real.
* No se encontraron ejemplos concretos de eventos con texto real.
* No se encontraron fechas/hora de ejemplo.
* No se encontraron nombres de miembros concretos.

### 2.3 Acción interactiva

#### Acciones de Tasks encontradas

| Acción | Evidencia | Clasificación |
| ------ | --------- | ------------- |
| Crear tarea | Adulto puede crear tareas; Tasks representan trabajo pendiente/realizado | REAL parcial |
| Reasignar tarea | Adulto puede crear/reasignar tareas | REAL parcial |
| Administrar tareas propias | Adolescente puede administrar tareas propias | REAL parcial |
| Completar tarea | Se menciona que Geni no puede marcar tareas completadas automáticamente; implica acción humana de completar | REAL parcial / requiere definición |
| Verificar tarea | Aparece Verificación de tareas | Ambigua / contradicción |
| Abrir detalle de tarea | Existe `Task Detail` | DEMO PREMIUM / UI parcial |
| Generar tarea desde Inventory/Assets | InventoryItem/Asset generan Task | POST_MVP / dependencia externa, no desarrollar |

#### Acciones de Events / Calendar encontradas

| Acción | Evidencia | Clasificación |
| ------ | --------- | ------------- |
| Crear evento | Adulto puede crear eventos; Adolescente puede crear eventos familiares | REAL parcial |
| Abrir detalle de evento | Existe `Event Detail` | DEMO PREMIUM / UI parcial |
| Modificar evento | Eventos modificados pueden generar notificaciones según archivo de comprensión | Mencionado sin contrato / POST_MVP si implica notificación real |
| Cancelar evento | Event tiene estado Cancelado; eventos cancelados pueden generar notificaciones | REAL parcial para estado / POST_MVP para notificación real |
| Ver tareas y eventos propios | Receptor ve sus tareas y eventos | REAL parcial / navegación-adopción |

#### Acciones no encontradas

* Editar tarea no aparece como acción explícita.
* Eliminar tarea no aparece.
* Listar tareas no aparece como pantalla/acción explícita, aunque Tasks como feature existe.
* Filtrar tareas no aparece.
* Crear evento con formulario no aparece.
* Editar evento con formulario no aparece.
* Eliminar evento no aparece.
* Cambiar vista día/semana/mes no aparece.
* Mostrar tareas con fecha dentro del calendario no aparece explícitamente.

### 2.4 Feedback inmediato

#### Feedback encontrado

* Vencida se calcula por fecha de vencimiento vs fecha actual.
* Estados visibles de Task:
  * Pendiente.
  * En progreso.
  * Completada.
  * Cancelada.
* Estados visibles de Event:
  * Programado.
  * Completado.
  * Cancelado.
* Recurrencia genera nuevas instancias y preserva historial.
* Dependencias de tareas bloquean tareas dependientes.

#### Feedback no encontrado

* No se encontraron toasts.
* No se encontraron loading states.
* No se encontraron skeletons.
* No se encontraron spinners.
* No se encontraron mensajes de error.
* No se encontraron success messages.
* No se encontraron empty states.
* No se encontraron disabled states.
* No se encontraron confirmaciones de eliminación o cancelación.
* No se encontraron estados de red.
* No se encontró retry.

### 2.5 Service aislado

#### Pistas encontradas para service

* Planner lista/administra Tasks, Calendar y Goals.
* Tasks contienen datos de trabajo pendiente/realizado.
* Calendar administra eventos familiares y personales.
* Home referencia Tasks y Calendar.
* El usuario receptor ve sus propias tareas y eventos.
* El Coordinador usa Planner como sistema personal completo.
* Tasks pueden tener responsable, fechas, prioridad, estado y responsabilidad asociada.
* Event puede tener participantes.
* Event tiene estados.
* Task tiene estados.
* Vencida se calcula, no se almacena como estado.
* Acciones importantes deberían quedar registradas por transparencia/auditoría, pero auditoría completa queda fuera de esta implementación.

#### Naturaleza sugerida por la fuente

* No se encontró service explícito.
* No se encontraron endpoints.
* No se encontraron fuentes de datos técnicas.
* Para demo visual/interactiva, este documento solo permite inferir un service local/mock desde datos mencionados, pero no define nombres de funciones ni contratos.

### 2.6 Navegación coherente

#### Entradas detectadas

* Bottom Navigation V1 incluye Planner como item principal.
* Home es siempre pantalla inicial.
* Home referencia Tasks y Calendar.
* Home debe conducir al módulo dueño de la información.
* Quick Actions existe como botón `+` central.

#### Salidas / navegación interna detectada

* Desde Planner se puede llegar conceptualmente a Task Detail.
* Desde Planner/Calendar se puede llegar conceptualmente a Event Detail.
* No se encontraron tabs internas de Planner.
* No se encontró flujo específico entre lista y detalle.
* No se encontraron deep links.
* No se encontró navegación día/semana/mes.

### 2.7 Conexión con Home o More

#### Home

* Home referencia Tasks.
* Home referencia Calendar.
* Home es centro operativo que resume información, no la administra.
* Home siempre es la pantalla inicial.
* Home debe conducir al módulo que administra.
* Home puede mostrar tareas pendientes a nivel conceptual.
* Home puede mostrar próximos eventos a nivel conceptual.
* Home puede mostrar Briefing como primer widget, pero para este fragment es dependencia externa / no desarrollar como IA real.

#### More

* Planner no vive en More.
* Planner vive en Bottom Navigation.
* More contiene módulos especializados como Finance, Inventory, FamilyCloud y Settings.

#### Quick Actions

* Quick Actions existe como botón `+` central en Bottom Navigation.
* El archivo asociado define Quick Actions como panel flotante con Geni fijo y acciones dinámicas ordenadas por frecuencia y contexto.
* No se encontraron acciones explícitas de Planner dentro de Quick Actions.
* Cualquier acción rápida de crear tarea/evento no está definida por este documento.

---

## 3. Clasificación para implementación

### REAL MÍNIMO

* Planner como módulo de navegación primaria.
* Planner como núcleo operativo.
* Planner contiene Tasks y Calendar.
* Tasks como trabajo pendiente/realizado.
* Calendar como administración de eventos familiares y personales.
* Event como evento familiar o personal.
* El usuario puede ver sus tareas y eventos propios.
* El Coordinador puede administrar tareas y calendario solo, sin adopción familiar.
* Adulto puede crear/reasignar tareas.
* Adulto puede crear eventos.
* Adolescente puede administrar tareas propias.
* Adolescente puede crear eventos familiares.
* Adulto Mayor mantiene permisos equivalentes a Adulto.
* Home referencia Tasks y Calendar.
* Home resume; Planner administra.
* Vencida calculada, no estado.
* Responsabilidades como propiedad/eje organizador de Task.

### DEMO PREMIUM

* `Task Detail` como detalle visual de tarea.
* `Event Detail` como detalle visual de evento.
* Timeline de actividad en Task Detail, si se usa solo visualmente.
* Participantes básicos visibles en Event Detail.
* Cards/resúmenes en Home para Tasks y Calendar.
* Planner conectado desde Bottom Navigation.
* Uso de datos locales creíbles basados en campos encontrados.
* Mostrar estados visuales de Task: Pendiente, En progreso, Completada, Cancelada.
* Mostrar estados visuales de Event: Programado, Completado, Cancelado.

### LOCAL / ASYNCSTORAGE / MOCK SERVICE

* El documento no menciona AsyncStorage ni storage local.
* El documento no menciona service aislado.
* Para demo, podría existir estado local/mock solamente como implementación posterior, pero este fragment no define contrato.
* Datos que podrían abastecer un mock service sin inventar campos:
  * Task.
  * Event.
  * Calendar.
  * Responsabilidad.
  * Persona/responsable como dependencia externa.

### POST_MVP

* Goals dentro de Planner.
* Streaks, si aparecieran en otra fuente, no aparecen aquí.
* Plantillas de tareas si se interpretan como reutilizables/editables o CRUD.
* Templates personalizadas.
* Subtareas.
* Comentarios.
* Adjuntos.
* Dependencias entre tareas.
* Recurrencia avanzada.
* Recurrencia como generación de nuevas instancias con historial, salvo que otra fuente lo recorte a simple.
* Notificaciones reales por tareas/eventos.
* Auditoría completa.
* Integraciones automáticas desde Inventory o Assets.
* Geni real sobre Planner.
* Web app de invitación que muestra tareas/eventos/responsabilidades.
* Álbum automático desde Calendar.
* Reconocimiento facial relacionado con Calendar.

### IGNORAR

* Feed real.
* SOS real.
* Finance backend real.
* Inventory backend real.
* Assets backend real.
* FamilyCloud real.
* Presence GPS real.
* Automatizaciones reales.
* Geni IA avanzada.
* Offline sync.
* Multi-hogar avanzado.

---

## 4. UI extraíble

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |
| ------------------- | ----------- | -------- | ---------- | ---------- | ------------- |
| Planner | Módulo núcleo operativo con Tasks, Calendar y Goals | No se detallan acciones de pantalla | No encontrados | Bottom Navigation: Home / People / + / Planner / More | REAL mínimo |
| Tasks | Trabajo pendiente o realizado | Crear/reasignar por Adulto; administrar propias por Adolescente; completar implícito | Pendiente, En progreso, Completada, Cancelada; vencida calculada | Dentro de Planner | REAL parcial |
| Task Detail | Timeline de actividad automática + comentarios humanos | Abrir detalle; comentarios aparecen pero son Post-MVP | No encontrados | Desde Tasks, flujo no especificado | DEMO PREMIUM / POST_MVP para comentarios |
| Calendar | Administración de eventos familiares y personales | Ver eventos no detallado; crear evento por Adulto/Adolescente | No encontrados | Dentro de Planner; Home referencia Calendar | REAL parcial |
| Event Detail | Participantes e información asociada | Abrir detalle | Programado, Completado, Cancelado | Desde Calendar/Event, flujo no especificado | DEMO PREMIUM |
| Home cards/resumen de Planner | Tareas y Calendar referenciados por Home | Ir al módulo dueño implícito | No encontrados | Home siempre pantalla inicial; conduce a Planner | Dependencia externa / no desarrollar en este fragment |
| Bottom Navigation | Home, People, +, Planner, More | Navegar a Planner | No encontrados | Navegación global V1 | REAL mínimo |
| Quick Actions | Panel flotante con Geni fijo y acciones dinámicas | No aparecen acciones Planner explícitas | No encontrados | Botón + central | Dependencia externa / no desarrollar en este fragment |

---

## 5. Datos demo extraíbles

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |
| ------------ | ------ | ----------- | ------ | ------------- |
| Tasks | Planner | Lista o sección de tareas | Documento principal / comprensión / source_map | REAL mínimo |
| Calendar | Planner | Sección de calendario/eventos | Documento principal / comprensión / source_map | REAL mínimo |
| Goals | Planner | Mostrar como parte conceptual de Planner, no implementar real | Documento principal / comprensión / source_map | POST_MVP |
| Task | Planner | Modelo visual de tarea | Archivo de comprensión / source_map | REAL parcial |
| título | Task | Texto principal de una tarea | Archivo de comprensión / source_map | REAL parcial |
| descripción | Task | Detalle secundario de una tarea | Archivo de comprensión / source_map | REAL parcial |
| responsable | Task | Asignación visible | Archivo de comprensión / source_map | REAL parcial |
| fechas | Task | Fecha visible / cálculo de vencida | Archivo de comprensión / source_map | REAL parcial |
| prioridad | Task | Badge o filtro visual | Archivo de comprensión / source_map | REAL parcial |
| estado | Task | Badge/estado visible | Archivo de comprensión / source_map | REAL parcial |
| responsabilidad asociada | Task | Categoría/eje visual | Archivo de comprensión / source_map | REAL parcial |
| Compras | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source_map | REAL parcial |
| Mascotas | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source_map | REAL parcial |
| Limpieza | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source_map | REAL parcial |
| Vehículos | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source_map | REAL parcial |
| Pendiente | Task | Estado visible | Archivo de comprensión / source_map | REAL parcial |
| En progreso | Task | Estado visible | Archivo de comprensión / source_map | REAL parcial |
| Completada | Task | Estado visible | Archivo de comprensión / source_map | REAL parcial |
| Cancelada | Task | Estado visible | Archivo de comprensión / source_map | REAL parcial |
| Vencida calculada | Task | Badge/condición visual, no estado | Archivo de comprensión / source_map | REAL parcial |
| Event | Planner / Calendar | Modelo visual de evento | Archivo de comprensión / source_map | REAL parcial |
| Evento familiar | Event | Tipo/concepto visual | Archivo de comprensión / source_map | REAL parcial |
| Evento personal | Event | Tipo/concepto visual | Archivo de comprensión / source_map | REAL parcial |
| Participantes | Event | Avatares/listado simple | Archivo de comprensión / source_map | REAL parcial / POST_MVP si avanzado |
| Programado | Event | Estado visible | Archivo de comprensión / source_map | REAL parcial |
| Completado | Event | Estado visible | Archivo de comprensión / source_map | REAL parcial |
| Cancelado | Event | Estado visible | Archivo de comprensión / source_map | REAL parcial |
| Tareas propias | Planner | Vista personalizada para receptor | Documento principal / source_map | REAL parcial |
| Eventos propios | Planner | Vista personalizada para receptor | Documento principal / source_map | REAL parcial |

### Datos demo faltantes

* No hay nombres concretos de tareas.
* No hay nombres concretos de eventos.
* No hay fechas concretas.
* No hay horas concretas.
* No hay miembros concretos.
* No hay prioridades con valores concretos.
* No hay textos de empty state.
* No hay textos de toast/error/success.

---

## 6. Acciones extraíbles

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |
| ------ | ----------- | ----------------- | ------------------ | ------ |
| Ver tareas propias | Receptor / miembro | Sabe qué le toca hacer sin preguntar | REAL parcial | Documento principal: ADOPCIÓN — Etapa 2 |
| Ver eventos propios | Receptor / miembro | Sabe qué eventos le corresponden | REAL parcial | Documento principal: ADOPCIÓN — Etapa 2 |
| Administrar tareas | Coordinador / usuario único | Reduce carga mental usando Planner solo | REAL parcial | Documento principal: ADOPCIÓN — Etapa 1 / mitigación MVP |
| Administrar calendario | Coordinador / usuario único | Control personal del calendario | REAL parcial | Documento principal: ADOPCIÓN — Etapa 1 / mitigación MVP |
| Crear tarea | Adulto | Nueva tarea visible | REAL parcial, sin contrato UI/API | Archivo de comprensión / source_map |
| Reasignar tarea | Adulto | Responsable cambia | REAL parcial, sin contrato UI/API | Archivo de comprensión / source_map |
| Administrar tareas propias | Adolescente | Cambios sobre tareas propias | REAL parcial, sin contrato UI/API | Archivo de comprensión / source_map |
| Completar tarea | Usuario humano no especificado | Estado completado visible | REAL parcial / inferido desde restricción de Geni | Archivo de comprensión / source_map |
| Verificar tarea | Usuario no especificado | Verificación de tarea | Ambiguo / contradicción | Archivo de comprensión / source_map |
| Abrir detalle de tarea | Usuario no especificado | Muestra Task Detail | DEMO PREMIUM | Archivo de comprensión / source_map |
| Crear evento | Adulto | Nuevo evento visible | REAL parcial, sin contrato UI/API | Archivo de comprensión / source_map |
| Crear evento familiar | Adolescente | Nuevo evento familiar visible | REAL parcial, sin contrato UI/API | Archivo de comprensión / source_map |
| Abrir detalle de evento | Usuario no especificado | Muestra Event Detail | DEMO PREMIUM | Archivo de comprensión / source_map |
| Cancelar evento | Usuario no especificado | Estado Cancelado visible | REAL parcial para estado; permisos faltantes | Archivo de comprensión / source_map |
| Generar tarea desde Inventory | Sistema / Inventory | Tarea de compra automática | POST_MVP / dependencia externa, no desarrollar | Archivo de comprensión / source_map |
| Generar tarea desde Assets | Sistema / Assets | Tarea de mantenimiento/vencimiento | POST_MVP / dependencia externa, no desarrollar | Archivo de comprensión / source_map |
| Generar notificación por tarea | Sistema | Notificación | POST_MVP | Archivo de comprensión / source_map |
| Generar notificación por evento | Sistema | Notificación | POST_MVP | Archivo de comprensión / source_map |

---

## 7. Home / More / Quick Actions

### Home

* Home referencia Tasks.
* Home referencia Calendar.
* Home puede mostrar tareas pendientes a nivel conceptual.
* Home puede mostrar próximos eventos a nivel conceptual.
* Home resume información, no administra.
* Home debe conducir al módulo dueño de la información.
* Home siempre es la pantalla inicial.
* Briefing puede incluir Planner, eventos y alertas, pero Briefing con Geni real queda fuera de este fragment.
* Para esta extracción: Home es **dependencia externa / no desarrollar en este fragment**.

### More

* Planner no vive en More.
* Planner está en Bottom Navigation V1.
* More contiene Finance, Inventory, FamilyCloud y Settings.
* Para esta extracción: More no afecta implementación de Planner salvo como contraste de navegación.

### Quick Actions

* Quick Actions es el botón `+` central en Bottom Navigation.
* Quick Actions aparece como panel flotante con Geni fijo y acciones dinámicas.
* No se encontró acción explícita “crear tarea” o “crear evento” dentro de Quick Actions en este documento.
* Para esta extracción: Quick Actions es **dependencia externa / no desarrollar en este fragment**.

---

## 8. Backend/API detectado

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |
| --------------- | ------ | ---- | ------- | -------- | ------ | ------------- |
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |
| Reasignar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción implícita sin contrato API | REAL parcial / requiere definición |
| Verificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | Ambigua |
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |
| Cancelar evento | No encontrado | No encontrado | No encontrado | No encontrado | Estado mencionado sin contrato API | REAL parcial |
| Listar tareas | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |
| Listar eventos | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |

---

## 9. Modelo de datos detectado

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |
| ------- | ----- | --------------- | -------------- | ------------------------ | ------------- |
| Planner | Tasks | no especificado | no especificado | Sección/feature del módulo | REAL mínimo |
| Planner | Calendar | no especificado | no especificado | Sección/feature del módulo | REAL mínimo |
| Planner | Goals | no especificado | no especificado | Parte conceptual de Planner | POST_MVP |
| Task | título | no especificado | no especificado | Texto principal | REAL parcial |
| Task | descripción | no especificado | no especificado | Detalle | REAL parcial |
| Task | responsable | no especificado | Persona / miembro implícito | Asignación visible | REAL parcial |
| Task | fechas | no especificado | permite calcular vencida | Fecha visible / vencimiento calculado | REAL parcial |
| Task | prioridad | no especificado | valores no encontrados | Badge/filtro potencial | REAL parcial |
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/estado visible | REAL parcial |
| Task | responsabilidad asociada | no especificado | Compras, Mascotas, Limpieza, Vehículos como ejemplos de responsabilidades | Categoría/eje visual | REAL parcial |
| Task | goal | no especificado | no especificado | Relación con Goals | POST_MVP |
| Task | archivos | no especificado | no especificado | Adjuntos | POST_MVP |
| Task | comentarios | no especificado | no especificado | Comentarios/timeline | POST_MVP |
| Task | subtareas | no especificado | un único nivel | Progreso calculado | POST_MVP |
| Task | dependencia | no especificado | bloquea tarea dependiente | Estado bloqueado | POST_MVP |
| Task | recurrencia | no especificado | genera nuevas instancias | Repetición/historial | POST_MVP salvo recorte futuro |
| Event | participantes | no especificado | múltiples personas | Avatares/listado | REAL parcial / POST_MVP si avanzado |
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge/estado visible | REAL parcial |
| Event | información asociada | no especificado | no especificado | Event Detail | REAL parcial |
| Calendar | eventos familiares | no especificado | no especificado | Lista/calendario | REAL parcial |
| Calendar | eventos personales | no especificado | no especificado | Lista/calendario | REAL parcial |
| Responsabilidades | nombre/área | no especificado | Compras, Mascotas, Limpieza, Vehículos | Categoría/eje organizador | REAL parcial |
| Plantillas de tareas | no encontrado | no especificado | reutilizables | No hay CRUD ni categorías MVP explícitas | POST_MVP / faltante |
| Verificación de tareas | no encontrado | no especificado | no existe estado separado según comprensión | Conflicto con MVP esperado | Ambiguo |

---

## 10. Edge cases / errores / estados vacíos

| Caso | Comportamiento esperado | Fuente | Clasificación |
| ---- | ----------------------- | ------ | ------------- |
| Tarea vencida | Vencida se calcula; no es estado almacenado | Archivo de comprensión / source_map | REAL parcial |
| Tarea recurrente | Genera nuevas instancias; no reutiliza la misma; preserva historial | Archivo de comprensión / source_map | POST_MVP |
| Tarea con dependencia | Si la tarea previa no se completa, la dependiente queda bloqueada | Archivo de comprensión / source_map | POST_MVP |
| Subtareas | Un único nivel; progreso calculado automáticamente | Archivo de comprensión / source_map | POST_MVP |
| Verificación de tareas | Fuente dice que no existe estado separado | Archivo de comprensión / source_map | Contradicción con MVP esperado |
| Geni completa tareas | Geni no puede marcar tareas completadas automáticamente | Archivo de comprensión / source_map | Restricción real / Geni no desarrollar |
| Event cancelado | Event puede estar Cancelado | Archivo de comprensión / source_map | REAL parcial |
| Event completado | Event puede estar Completado | Archivo de comprensión / source_map | REAL parcial |
| Event programado | Event puede estar Programado | Archivo de comprensión / source_map | REAL parcial |
| Calendar sin vistas | No se encontraron Día/Semana/Mes | source_map | Información faltante |
| Task List ausente | No se encontró lista de tareas explícita | source_map | Información faltante |
| Create/Edit ausente | No se encontraron formularios | source_map | Información faltante |
| Estados vacíos | No encontrados | source_map | Información faltante |
| Errores de API | No encontrados | source_map | Información faltante |

---

## 11. Restricciones y prohibiciones detectadas

* No convertir Planner en módulo aislado: pertenece al ecosistema integrado.
* No desarrollar Goals como MVP real desde esta fuente.
* No desarrollar comentarios reales en Tasks.
* No desarrollar adjuntos reales en Tasks.
* No desarrollar subtareas complejas.
* No desarrollar dependencias entre tareas.
* No desarrollar recurrencia avanzada desde esta fuente.
* No desarrollar notificaciones reales.
* No desarrollar auditoría completa, aunque la trazabilidad sea principio transversal.
* No desarrollar Geni real para Planner.
* No permitir que Geni complete tareas automáticamente.
* No desarrollar automatizaciones reales.
* No desarrollar generación real de tareas desde Inventory/Assets.
* No desarrollar Feed derivado de tareas completadas.
* No desarrollar Web App como puente de adopción.
* No desarrollar Calendar → FamilyCloud / álbum automático.
* No desarrollar reconocimiento facial asociado a Calendar.
* No asumir vistas día/semana/mes porque no aparecen en este documento.
* No asumir endpoints.
* No asumir permisos faltantes.
* No asumir valores de prioridad.
* No asumir textos de tareas/eventos que no aparecen.

---

## 12. Información faltante

| Falta | Por qué importa para Codex | Impacto |
| ----- | -------------------------- | ------- |
| Lista de tareas explícita | Codex necesita saber layout, filtros, agrupación y acciones visibles | Alta |
| Pantalla Crear tarea | Falta formulario, campos obligatorios, botones y validaciones | Alta |
| Pantalla Editar tarea | Falta flujo de edición y estados de guardado | Media |
| Eliminar tarea | El prompt lo pide, pero el documento no lo menciona | Media |
| Completar tarea con detalle | Se infiere por restricción de Geni, pero no hay flujo humano definido | Alta |
| Verification Flow MVP | Fuente contradice estados esperados del prompt; no hay `requires_verification` | Alta |
| Templates predefinidas MVP | No aparecen como constantes ni con las seis categorías pedidas | Alta |
| Prioridades con valores | Se menciona prioridad, pero no valores | Media |
| Fecha límite | Se mencionan fechas y vencida calculada, pero no campo formal deadline | Media |
| Permisos de verificar tarea | No se define quién verifica | Alta |
| Permisos de eliminar tarea | No se define quién elimina | Media |
| Permisos de editar tarea | No se define explícitamente | Media |
| Lista de eventos explícita | Falta layout y agrupación | Alta |
| Crear evento | Acción aparece, pero no hay campos ni UI | Alta |
| Editar evento | No aparece | Media |
| Eliminar evento | No aparece | Media |
| Fecha/hora de evento | No aparecen campos start/end | Alta |
| Recurrencia simple | No aparecen valores none/daily/weekly/monthly | Alta |
| Vistas día/semana/mes | No aparecen | Alta |
| Tareas con fecha dentro del calendario | Prompt lo pide, pero no aparece explícitamente | Alta |
| Estados vacíos | No hay textos ni comportamiento | Media |
| Loading/error/success | No hay feedback inmediato definido | Media |
| Service contract | No hay endpoints ni nombres de operaciones | Alta |
| Relación concreta con Home cards | Home referencia Tasks/Calendar pero no define card/layout | Media |
| Quick Actions para Planner | No aparecen crear tarea/evento como acciones rápidas | Media |
| Datos demo concretos | No hay ejemplos textuales de tareas/eventos | Alta |

---

## 13. Fuente

### Archivo principal

* `HomePlus — SECCION 1 PRODUCTO.md`

#### Secciones usadas

* `PROPUESTA DE VALOR`
* `DIFERENCIACIÓN`
* `TARGET USERS`
* `GENI`
* `PRINCIPIO DE VISIBILIDAD`
* `DOMINIOS OFICIALES`
* `ADOPCIÓN — MODELO Y RIESGOS`
* `DECISIONES DE PRODUCTO TOMADAS`
* `FUERA DEL SCOPE DE ESTA SECCIÓN`

### Archivo de comprensión asociado

* `Seccion 1 Producto.txt`

#### Bloques usados

* `OUTPUT 1 — ENTITIES`
* `OUTPUT 2 — RELATIONSHIPS`
* `OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS`
* `OUTPUT 4 — DATA FLOWS`
* `OUTPUT 5 — BUSINESS RULES`
* `OUTPUT 6 — ARCHITECTURAL DECISIONS`
* `OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS`
* `OUTPUT 8 — GRAPH EDGES`

### Source map usado

* `source_map_HomePlus_SECCION_1_PRODUCTO.md`

#### Secciones usadas

* `4.7 PLANNER`
* `4.8 TASKS`
* `4.9 EVENTS`
* `4.10 CALENDAR`
* `4.11 HOME` solo como dependencia externa de conexión Home/Planner
* `5. Mapa de entidades`
* `6. Mapa de relaciones`
* `7. Mapa de estados`
* `8. Mapa de permisos`
* `9. Mapa de flujos`
* `10. Mapa de APIs`
* `11. Mapa de UI`
* `13. Restricciones arquitectónicas detectadas`
* `15. Información POST_MVP detectada`
* `18. Información faltante`

---

## Nota de alcance final

Este fragment es útil como base parcial para una demo visual/interactiva de Planner, pero esta fuente no alcanza para construir un Planner completo sin decisiones posteriores. Lo más sólido de esta sección es:

* rol de Planner dentro del producto;
* Tasks y Calendar como subpartes;
* relación con Home;
* navegación primaria;
* campos parciales de Task;
* estados parciales de Task y Event;
* permisos parciales por Adulto/Adolescente;
* restricciones fuertes sobre Geni, visibilidad y post-MVP.

Lo menos definido es:

* UI concreta;
* datos demo concretos;
* APIs;
* service contract;
* formularios;
* feedback inmediato;
* recurrencia simple;
* verification flow alineado al MVP esperado.
