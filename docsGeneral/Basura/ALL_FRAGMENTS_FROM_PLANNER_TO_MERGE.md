**\# PLANNER fragment — HomePlus — Sección 1 PRODUCTO**

\> Fragment crudo de implementación visual/interactiva.    
\> Alcance estricto: extraído solamente de \`HomePlus — SECCION 1 PRODUCTO.md\`, \`Seccion 1 Producto.txt\` y \`source\_map\_HomePlus\_SECCION\_1\_PRODUCTO.md\`.    
\> No fusiona con otros documentos. No completa huecos. No define spec final.

**\---**

**\#\# 1\. Rol del módulo en la demo**

**\#\#\# Información explícita encontrada**

\* Planner aparece como parte central de la propuesta de valor de HomePlus: unifica tareas, calendario y metas dentro del sistema operativo del hogar.  
\* Planner es definido como **\*\*núcleo operativo\*\***.  
\* Planner administra:  
  \* Tasks.  
  \* Calendar.  
  \* Goals.  
\* Planner ayuda a que las tareas y responsabilidades se ejecuten sin tener que pedirlas dos veces.  
\* Planner reduce la carga mental del Coordinador cuando funciona incluso con un solo usuario activo.  
\* En adopción individual, Planner permite administrar tareas, calendario y metas aunque nadie más vea todavía esa información.  
\* En adopción familiar, cada miembro ve sus propias tareas, eventos y metas para saber qué le toca hacer sin preguntar.  
\* Planner participa en la visibilidad del esfuerzo: hace visible quién hace qué y cómo se distribuye la carga.  
\* Planner se integra en el ecosistema: no funciona como app separada.  
\* Planner debe convivir con Home: Home referencia Tasks y Calendar, pero Home resume, no administra.  
\* Planner aparece como un módulo de navegación primaria en Bottom Navigation V1.

**\#\#\# Valor mostrado al usuario**

\* Control sobre tareas y calendario.  
\* Claridad sobre responsabilidades propias.  
\* Reducción de coordinación manual por WhatsApp o memoria personal.  
\* Visibilidad del esfuerzo familiar.  
\* Utilidad desde el primer uso, incluso si solo hay un usuario activo.

**\#\#\# Problema familiar que resuelve**

\* Reduce la asimetría de coordinación.  
\* Evita que una sola persona tenga que recordar, pedir, organizar y perseguir a los demás.  
\* Centraliza trabajo pendiente y eventos familiares/personales.  
\* Hace más visible quién tiene responsabilidades asignadas.

**\#\#\# Qué debe sentir el usuario**

\* Que sabe qué le toca hacer.  
\* Que no necesita preguntar por tareas o eventos.  
\* Que el hogar tiene un sistema operativo visible, no una suma de mensajes sueltos.  
\* Que puede usar Planner solo, sin depender de que toda la familia adopte la app.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Pantallas / componentes encontrados**

\* \`Planner\` como módulo principal dentro de Bottom Navigation.  
\* \`Tasks\` como feature del Planner.  
\* \`Calendar\` como feature del Planner.  
\* \`Task Detail\` como pantalla de detalle de tarea.  
\* \`Event Detail\` como pantalla de detalle de evento.  
\* \`Home\` referencia Tasks y Calendar como fuente de resumen.

**\#\#\#\# Navegación visual detectada**

\* Bottom Navigation V1:  
  \* Home.  
  \* People.  
  \* \+.  
  \* Planner.  
  \* More.  
\* Planner está en navegación primaria.  
\* Home es la pantalla inicial y conduce a módulos dueños.  
\* Quick Actions existe como botón \`+\` central en Bottom Nav, pero el documento asociado solo confirma que contiene Geni Chat; no detalla acciones rápidas de Planner.

**\#\#\#\# UI explícita de Tasks**

\* \`Task Detail\` muestra timeline de actividad automática y comentarios humanos.  
\* No se encontró lista de tareas explícita.  
\* No se encontró pantalla Crear tarea.  
\* No se encontró pantalla Editar tarea.  
\* No se encontraron tabs, filtros, botones ni inputs concretos.

**\#\#\#\# UI explícita de Events / Calendar**

\* \`Event Detail\` muestra participantes e información asociada.  
\* No se encontró lista de eventos explícita.  
\* No se encontró pantalla Crear evento.  
\* No se encontró pantalla Editar evento.  
\* No se encontraron vistas día, semana o mes.  
\* No se encontraron filtros, rangos ni estados vacíos de Calendar.

**\#\#\#\# Jerarquía visual detectada**

\* Home muestra resúmenes y redirige al módulo que administra.  
\* Planner administra Tasks y Calendar.  
\* Calendar administra eventos familiares y personales.

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Datos / categorías encontrados**

\* Tasks representan trabajo pendiente o realizado.  
\* Campos mencionados para Tasks:  
  \* título.  
  \* descripción.  
  \* responsable.  
  \* fechas.  
  \* prioridad.  
  \* estado.  
  \* responsabilidad asociada.  
  \* goal.  
  \* archivos.  
  \* comentarios.  
\* Responsabilidades agrupan áreas operativas del hogar.  
\* Ejemplos de responsabilidades / áreas operativas encontrados:  
  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
  \* Vehículos.  
\* Event representa evento familiar o personal.  
\* Event puede tener múltiples participantes.  
\* Calendar administra eventos familiares y personales.  
\* Receptor ve sus tareas y eventos.  
\* El Coordinador administra sus tareas y calendario.

**\#\#\#\# Estados encontrados para Task**

\* Pendiente.  
\* En progreso.  
\* Completada.  
\* Cancelada.  
\* Vencida no es estado: se calcula.

**\#\#\#\# Estados encontrados para Event**

\* Programado.  
\* Completado.  
\* Cancelado.

**\#\#\#\# Datos pedidos por el prompt pero no encontrados en este documento**

\* No se encontraron templates predefinidas MVP como constantes del sistema:  
  \* Limpieza aparece como responsabilidad/área operativa, no como template formal.  
  \* Compras aparece como responsabilidad/área operativa, no como template formal.  
  \* Mascotas aparece como responsabilidad/área operativa, no como template formal.  
  \* Medicación no aparece como template de Planner; aparece asociada a Adulto Mayor/medicación o medicamentos en Inventory/Presence, fuera de este fragment.  
  \* Estudios no aparece.  
  \* Pagos no aparece como template de Planner; pagos/deudas aparecen en Finance, fuera de este fragment.  
\* No se encontraron ejemplos concretos de tareas con texto real.  
\* No se encontraron ejemplos concretos de eventos con texto real.  
\* No se encontraron fechas/hora de ejemplo.  
\* No se encontraron nombres de miembros concretos.

**\#\#\# 2.3 Acción interactiva**

**\#\#\#\# Acciones de Tasks encontradas**

| Acción | Evidencia | Clasificación |  
| \------ | \--------- | \------------- |  
| Crear tarea | Adulto puede crear tareas; Tasks representan trabajo pendiente/realizado | REAL parcial |  
| Reasignar tarea | Adulto puede crear/reasignar tareas | REAL parcial |  
| Administrar tareas propias | Adolescente puede administrar tareas propias | REAL parcial |  
| Completar tarea | Se menciona que Geni no puede marcar tareas completadas automáticamente; implica acción humana de completar | REAL parcial / requiere definición |  
| Verificar tarea | Aparece Verificación de tareas | Ambigua / contradicción |  
| Abrir detalle de tarea | Existe \`Task Detail\` | DEMO PREMIUM / UI parcial |  
| Generar tarea desde Inventory/Assets | InventoryItem/Asset generan Task | POST\_MVP / dependencia externa, no desarrollar |

**\#\#\#\# Acciones de Events / Calendar encontradas**

| Acción | Evidencia | Clasificación |  
| \------ | \--------- | \------------- |  
| Crear evento | Adulto puede crear eventos; Adolescente puede crear eventos familiares | REAL parcial |  
| Abrir detalle de evento | Existe \`Event Detail\` | DEMO PREMIUM / UI parcial |  
| Modificar evento | Eventos modificados pueden generar notificaciones según archivo de comprensión | Mencionado sin contrato / POST\_MVP si implica notificación real |  
| Cancelar evento | Event tiene estado Cancelado; eventos cancelados pueden generar notificaciones | REAL parcial para estado / POST\_MVP para notificación real |  
| Ver tareas y eventos propios | Receptor ve sus tareas y eventos | REAL parcial / navegación-adopción |

**\#\#\#\# Acciones no encontradas**

\* Editar tarea no aparece como acción explícita.  
\* Eliminar tarea no aparece.  
\* Listar tareas no aparece como pantalla/acción explícita, aunque Tasks como feature existe.  
\* Filtrar tareas no aparece.  
\* Crear evento con formulario no aparece.  
\* Editar evento con formulario no aparece.  
\* Eliminar evento no aparece.  
\* Cambiar vista día/semana/mes no aparece.  
\* Mostrar tareas con fecha dentro del calendario no aparece explícitamente.

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Feedback encontrado**

\* Vencida se calcula por fecha de vencimiento vs fecha actual.  
\* Estados visibles de Task:  
  \* Pendiente.  
  \* En progreso.  
  \* Completada.  
  \* Cancelada.  
\* Estados visibles de Event:  
  \* Programado.  
  \* Completado.  
  \* Cancelado.  
\* Recurrencia genera nuevas instancias y preserva historial.  
\* Dependencias de tareas bloquean tareas dependientes.

**\#\#\#\# Feedback no encontrado**

\* No se encontraron toasts.  
\* No se encontraron loading states.  
\* No se encontraron skeletons.  
\* No se encontraron spinners.  
\* No se encontraron mensajes de error.  
\* No se encontraron success messages.  
\* No se encontraron empty states.  
\* No se encontraron disabled states.  
\* No se encontraron confirmaciones de eliminación o cancelación.  
\* No se encontraron estados de red.  
\* No se encontró retry.

**\#\#\# 2.5 Service aislado**

**\#\#\#\# Pistas encontradas para service**

\* Planner lista/administra Tasks, Calendar y Goals.  
\* Tasks contienen datos de trabajo pendiente/realizado.  
\* Calendar administra eventos familiares y personales.  
\* Home referencia Tasks y Calendar.  
\* El usuario receptor ve sus propias tareas y eventos.  
\* El Coordinador usa Planner como sistema personal completo.  
\* Tasks pueden tener responsable, fechas, prioridad, estado y responsabilidad asociada.  
\* Event puede tener participantes.  
\* Event tiene estados.  
\* Task tiene estados.  
\* Vencida se calcula, no se almacena como estado.  
\* Acciones importantes deberían quedar registradas por transparencia/auditoría, pero auditoría completa queda fuera de esta implementación.

**\#\#\#\# Naturaleza sugerida por la fuente**

\* No se encontró service explícito.  
\* No se encontraron endpoints.  
\* No se encontraron fuentes de datos técnicas.  
\* Para demo visual/interactiva, este documento solo permite inferir un service local/mock desde datos mencionados, pero no define nombres de funciones ni contratos.

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Entradas detectadas**

\* Bottom Navigation V1 incluye Planner como item principal.  
\* Home es siempre pantalla inicial.  
\* Home referencia Tasks y Calendar.  
\* Home debe conducir al módulo dueño de la información.  
\* Quick Actions existe como botón \`+\` central.

**\#\#\#\# Salidas / navegación interna detectada**

\* Desde Planner se puede llegar conceptualmente a Task Detail.  
\* Desde Planner/Calendar se puede llegar conceptualmente a Event Detail.  
\* No se encontraron tabs internas de Planner.  
\* No se encontró flujo específico entre lista y detalle.  
\* No se encontraron deep links.  
\* No se encontró navegación día/semana/mes.

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

\* Home referencia Tasks.  
\* Home referencia Calendar.  
\* Home es centro operativo que resume información, no la administra.  
\* Home siempre es la pantalla inicial.  
\* Home debe conducir al módulo que administra.  
\* Home puede mostrar tareas pendientes a nivel conceptual.  
\* Home puede mostrar próximos eventos a nivel conceptual.  
\* Home puede mostrar Briefing como primer widget, pero para este fragment es dependencia externa / no desarrollar como IA real.

**\#\#\#\# More**

\* Planner no vive en More.  
\* Planner vive en Bottom Navigation.  
\* More contiene módulos especializados como Finance, Inventory, FamilyCloud y Settings.

**\#\#\#\# Quick Actions**

\* Quick Actions existe como botón \`+\` central en Bottom Navigation.  
\* El archivo asociado define Quick Actions como panel flotante con Geni fijo y acciones dinámicas ordenadas por frecuencia y contexto.  
\* No se encontraron acciones explícitas de Planner dentro de Quick Actions.  
\* Cualquier acción rápida de crear tarea/evento no está definida por este documento.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

\* Planner como módulo de navegación primaria.  
\* Planner como núcleo operativo.  
\* Planner contiene Tasks y Calendar.  
\* Tasks como trabajo pendiente/realizado.  
\* Calendar como administración de eventos familiares y personales.  
\* Event como evento familiar o personal.  
\* El usuario puede ver sus tareas y eventos propios.  
\* El Coordinador puede administrar tareas y calendario solo, sin adopción familiar.  
\* Adulto puede crear/reasignar tareas.  
\* Adulto puede crear eventos.  
\* Adolescente puede administrar tareas propias.  
\* Adolescente puede crear eventos familiares.  
\* Adulto Mayor mantiene permisos equivalentes a Adulto.  
\* Home referencia Tasks y Calendar.  
\* Home resume; Planner administra.  
\* Vencida calculada, no estado.  
\* Responsabilidades como propiedad/eje organizador de Task.

**\#\#\# DEMO PREMIUM**

\* \`Task Detail\` como detalle visual de tarea.  
\* \`Event Detail\` como detalle visual de evento.  
\* Timeline de actividad en Task Detail, si se usa solo visualmente.  
\* Participantes básicos visibles en Event Detail.  
\* Cards/resúmenes en Home para Tasks y Calendar.  
\* Planner conectado desde Bottom Navigation.  
\* Uso de datos locales creíbles basados en campos encontrados.  
\* Mostrar estados visuales de Task: Pendiente, En progreso, Completada, Cancelada.  
\* Mostrar estados visuales de Event: Programado, Completado, Cancelado.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

\* El documento no menciona AsyncStorage ni storage local.  
\* El documento no menciona service aislado.  
\* Para demo, podría existir estado local/mock solamente como implementación posterior, pero este fragment no define contrato.  
\* Datos que podrían abastecer un mock service sin inventar campos:  
  \* Task.  
  \* Event.  
  \* Calendar.  
  \* Responsabilidad.  
  \* Persona/responsable como dependencia externa.

**\#\#\# POST\_MVP**

\* Goals dentro de Planner.  
\* Streaks, si aparecieran en otra fuente, no aparecen aquí.  
\* Plantillas de tareas si se interpretan como reutilizables/editables o CRUD.  
\* Templates personalizadas.  
\* Subtareas.  
\* Comentarios.  
\* Adjuntos.  
\* Dependencias entre tareas.  
\* Recurrencia avanzada.  
\* Recurrencia como generación de nuevas instancias con historial, salvo que otra fuente lo recorte a simple.  
\* Notificaciones reales por tareas/eventos.  
\* Auditoría completa.  
\* Integraciones automáticas desde Inventory o Assets.  
\* Geni real sobre Planner.  
\* Web app de invitación que muestra tareas/eventos/responsabilidades.  
\* Álbum automático desde Calendar.  
\* Reconocimiento facial relacionado con Calendar.

**\#\#\# IGNORAR**

\* Feed real.  
\* SOS real.  
\* Finance backend real.  
\* Inventory backend real.  
\* Assets backend real.  
\* FamilyCloud real.  
\* Presence GPS real.  
\* Automatizaciones reales.  
\* Geni IA avanzada.  
\* Offline sync.  
\* Multi-hogar avanzado.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner | Módulo núcleo operativo con Tasks, Calendar y Goals | No se detallan acciones de pantalla | No encontrados | Bottom Navigation: Home / People / \+ / Planner / More | REAL mínimo |  
| Tasks | Trabajo pendiente o realizado | Crear/reasignar por Adulto; administrar propias por Adolescente; completar implícito | Pendiente, En progreso, Completada, Cancelada; vencida calculada | Dentro de Planner | REAL parcial |  
| Task Detail | Timeline de actividad automática \+ comentarios humanos | Abrir detalle; comentarios aparecen pero son Post-MVP | No encontrados | Desde Tasks, flujo no especificado | DEMO PREMIUM / POST\_MVP para comentarios |  
| Calendar | Administración de eventos familiares y personales | Ver eventos no detallado; crear evento por Adulto/Adolescente | No encontrados | Dentro de Planner; Home referencia Calendar | REAL parcial |  
| Event Detail | Participantes e información asociada | Abrir detalle | Programado, Completado, Cancelado | Desde Calendar/Event, flujo no especificado | DEMO PREMIUM |  
| Home cards/resumen de Planner | Tareas y Calendar referenciados por Home | Ir al módulo dueño implícito | No encontrados | Home siempre pantalla inicial; conduce a Planner | Dependencia externa / no desarrollar en este fragment |  
| Bottom Navigation | Home, People, \+, Planner, More | Navegar a Planner | No encontrados | Navegación global V1 | REAL mínimo |  
| Quick Actions | Panel flotante con Geni fijo y acciones dinámicas | No aparecen acciones Planner explícitas | No encontrados | Botón \+ central | Dependencia externa / no desarrollar en este fragment |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| Tasks | Planner | Lista o sección de tareas | Documento principal / comprensión / source\_map | REAL mínimo |  
| Calendar | Planner | Sección de calendario/eventos | Documento principal / comprensión / source\_map | REAL mínimo |  
| Goals | Planner | Mostrar como parte conceptual de Planner, no implementar real | Documento principal / comprensión / source\_map | POST\_MVP |  
| Task | Planner | Modelo visual de tarea | Archivo de comprensión / source\_map | REAL parcial |  
| título | Task | Texto principal de una tarea | Archivo de comprensión / source\_map | REAL parcial |  
| descripción | Task | Detalle secundario de una tarea | Archivo de comprensión / source\_map | REAL parcial |  
| responsable | Task | Asignación visible | Archivo de comprensión / source\_map | REAL parcial |  
| fechas | Task | Fecha visible / cálculo de vencida | Archivo de comprensión / source\_map | REAL parcial |  
| prioridad | Task | Badge o filtro visual | Archivo de comprensión / source\_map | REAL parcial |  
| estado | Task | Badge/estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| responsabilidad asociada | Task | Categoría/eje visual | Archivo de comprensión / source\_map | REAL parcial |  
| Compras | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source\_map | REAL parcial |  
| Mascotas | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source\_map | REAL parcial |  
| Limpieza | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source\_map | REAL parcial |  
| Vehículos | Responsabilidades | Categoría/eje visual de tarea | Archivo de comprensión / source\_map | REAL parcial |  
| Pendiente | Task | Estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| En progreso | Task | Estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| Completada | Task | Estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| Cancelada | Task | Estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| Vencida calculada | Task | Badge/condición visual, no estado | Archivo de comprensión / source\_map | REAL parcial |  
| Event | Planner / Calendar | Modelo visual de evento | Archivo de comprensión / source\_map | REAL parcial |  
| Evento familiar | Event | Tipo/concepto visual | Archivo de comprensión / source\_map | REAL parcial |  
| Evento personal | Event | Tipo/concepto visual | Archivo de comprensión / source\_map | REAL parcial |  
| Participantes | Event | Avatares/listado simple | Archivo de comprensión / source\_map | REAL parcial / POST\_MVP si avanzado |  
| Programado | Event | Estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| Completado | Event | Estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| Cancelado | Event | Estado visible | Archivo de comprensión / source\_map | REAL parcial |  
| Tareas propias | Planner | Vista personalizada para receptor | Documento principal / source\_map | REAL parcial |  
| Eventos propios | Planner | Vista personalizada para receptor | Documento principal / source\_map | REAL parcial |

**\#\#\# Datos demo faltantes**

\* No hay nombres concretos de tareas.  
\* No hay nombres concretos de eventos.  
\* No hay fechas concretas.  
\* No hay horas concretas.  
\* No hay miembros concretos.  
\* No hay prioridades con valores concretos.  
\* No hay textos de empty state.  
\* No hay textos de toast/error/success.

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Ver tareas propias | Receptor / miembro | Sabe qué le toca hacer sin preguntar | REAL parcial | Documento principal: ADOPCIÓN — Etapa 2 |  
| Ver eventos propios | Receptor / miembro | Sabe qué eventos le corresponden | REAL parcial | Documento principal: ADOPCIÓN — Etapa 2 |  
| Administrar tareas | Coordinador / usuario único | Reduce carga mental usando Planner solo | REAL parcial | Documento principal: ADOPCIÓN — Etapa 1 / mitigación MVP |  
| Administrar calendario | Coordinador / usuario único | Control personal del calendario | REAL parcial | Documento principal: ADOPCIÓN — Etapa 1 / mitigación MVP |  
| Crear tarea | Adulto | Nueva tarea visible | REAL parcial, sin contrato UI/API | Archivo de comprensión / source\_map |  
| Reasignar tarea | Adulto | Responsable cambia | REAL parcial, sin contrato UI/API | Archivo de comprensión / source\_map |  
| Administrar tareas propias | Adolescente | Cambios sobre tareas propias | REAL parcial, sin contrato UI/API | Archivo de comprensión / source\_map |  
| Completar tarea | Usuario humano no especificado | Estado completado visible | REAL parcial / inferido desde restricción de Geni | Archivo de comprensión / source\_map |  
| Verificar tarea | Usuario no especificado | Verificación de tarea | Ambiguo / contradicción | Archivo de comprensión / source\_map |  
| Abrir detalle de tarea | Usuario no especificado | Muestra Task Detail | DEMO PREMIUM | Archivo de comprensión / source\_map |  
| Crear evento | Adulto | Nuevo evento visible | REAL parcial, sin contrato UI/API | Archivo de comprensión / source\_map |  
| Crear evento familiar | Adolescente | Nuevo evento familiar visible | REAL parcial, sin contrato UI/API | Archivo de comprensión / source\_map |  
| Abrir detalle de evento | Usuario no especificado | Muestra Event Detail | DEMO PREMIUM | Archivo de comprensión / source\_map |  
| Cancelar evento | Usuario no especificado | Estado Cancelado visible | REAL parcial para estado; permisos faltantes | Archivo de comprensión / source\_map |  
| Generar tarea desde Inventory | Sistema / Inventory | Tarea de compra automática | POST\_MVP / dependencia externa, no desarrollar | Archivo de comprensión / source\_map |  
| Generar tarea desde Assets | Sistema / Assets | Tarea de mantenimiento/vencimiento | POST\_MVP / dependencia externa, no desarrollar | Archivo de comprensión / source\_map |  
| Generar notificación por tarea | Sistema | Notificación | POST\_MVP | Archivo de comprensión / source\_map |  
| Generar notificación por evento | Sistema | Notificación | POST\_MVP | Archivo de comprensión / source\_map |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Home referencia Tasks.  
\* Home referencia Calendar.  
\* Home puede mostrar tareas pendientes a nivel conceptual.  
\* Home puede mostrar próximos eventos a nivel conceptual.  
\* Home resume información, no administra.  
\* Home debe conducir al módulo dueño de la información.  
\* Home siempre es la pantalla inicial.  
\* Briefing puede incluir Planner, eventos y alertas, pero Briefing con Geni real queda fuera de este fragment.  
\* Para esta extracción: Home es **\*\*dependencia externa / no desarrollar en este fragment\*\***.

**\#\#\# More**

\* Planner no vive en More.  
\* Planner está en Bottom Navigation V1.  
\* More contiene Finance, Inventory, FamilyCloud y Settings.  
\* Para esta extracción: More no afecta implementación de Planner salvo como contraste de navegación.

**\#\#\# Quick Actions**

\* Quick Actions es el botón \`+\` central en Bottom Navigation.  
\* Quick Actions aparece como panel flotante con Geni fijo y acciones dinámicas.  
\* No se encontró acción explícita “crear tarea” o “crear evento” dentro de Quick Actions en este documento.  
\* Para esta extracción: Quick Actions es **\*\*dependencia externa / no desarrollar en este fragment\*\***.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |  
| Reasignar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |  
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción implícita sin contrato API | REAL parcial / requiere definición |  
| Verificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | Ambigua |  
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |  
| Cancelar evento | No encontrado | No encontrado | No encontrado | No encontrado | Estado mencionado sin contrato API | REAL parcial |  
| Listar tareas | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |  
| Listar eventos | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Planner | Tasks | no especificado | no especificado | Sección/feature del módulo | REAL mínimo |  
| Planner | Calendar | no especificado | no especificado | Sección/feature del módulo | REAL mínimo |  
| Planner | Goals | no especificado | no especificado | Parte conceptual de Planner | POST\_MVP |  
| Task | título | no especificado | no especificado | Texto principal | REAL parcial |  
| Task | descripción | no especificado | no especificado | Detalle | REAL parcial |  
| Task | responsable | no especificado | Persona / miembro implícito | Asignación visible | REAL parcial |  
| Task | fechas | no especificado | permite calcular vencida | Fecha visible / vencimiento calculado | REAL parcial |  
| Task | prioridad | no especificado | valores no encontrados | Badge/filtro potencial | REAL parcial |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/estado visible | REAL parcial |  
| Task | responsabilidad asociada | no especificado | Compras, Mascotas, Limpieza, Vehículos como ejemplos de responsabilidades | Categoría/eje visual | REAL parcial |  
| Task | goal | no especificado | no especificado | Relación con Goals | POST\_MVP |  
| Task | archivos | no especificado | no especificado | Adjuntos | POST\_MVP |  
| Task | comentarios | no especificado | no especificado | Comentarios/timeline | POST\_MVP |  
| Task | subtareas | no especificado | un único nivel | Progreso calculado | POST\_MVP |  
| Task | dependencia | no especificado | bloquea tarea dependiente | Estado bloqueado | POST\_MVP |  
| Task | recurrencia | no especificado | genera nuevas instancias | Repetición/historial | POST\_MVP salvo recorte futuro |  
| Event | participantes | no especificado | múltiples personas | Avatares/listado | REAL parcial / POST\_MVP si avanzado |  
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge/estado visible | REAL parcial |  
| Event | información asociada | no especificado | no especificado | Event Detail | REAL parcial |  
| Calendar | eventos familiares | no especificado | no especificado | Lista/calendario | REAL parcial |  
| Calendar | eventos personales | no especificado | no especificado | Lista/calendario | REAL parcial |  
| Responsabilidades | nombre/área | no especificado | Compras, Mascotas, Limpieza, Vehículos | Categoría/eje organizador | REAL parcial |  
| Plantillas de tareas | no encontrado | no especificado | reutilizables | No hay CRUD ni categorías MVP explícitas | POST\_MVP / faltante |  
| Verificación de tareas | no encontrado | no especificado | no existe estado separado según comprensión | Conflicto con MVP esperado | Ambiguo |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Tarea vencida | Vencida se calcula; no es estado almacenado | Archivo de comprensión / source\_map | REAL parcial |  
| Tarea recurrente | Genera nuevas instancias; no reutiliza la misma; preserva historial | Archivo de comprensión / source\_map | POST\_MVP |  
| Tarea con dependencia | Si la tarea previa no se completa, la dependiente queda bloqueada | Archivo de comprensión / source\_map | POST\_MVP |  
| Subtareas | Un único nivel; progreso calculado automáticamente | Archivo de comprensión / source\_map | POST\_MVP |  
| Verificación de tareas | Fuente dice que no existe estado separado | Archivo de comprensión / source\_map | Contradicción con MVP esperado |  
| Geni completa tareas | Geni no puede marcar tareas completadas automáticamente | Archivo de comprensión / source\_map | Restricción real / Geni no desarrollar |  
| Event cancelado | Event puede estar Cancelado | Archivo de comprensión / source\_map | REAL parcial |  
| Event completado | Event puede estar Completado | Archivo de comprensión / source\_map | REAL parcial |  
| Event programado | Event puede estar Programado | Archivo de comprensión / source\_map | REAL parcial |  
| Calendar sin vistas | No se encontraron Día/Semana/Mes | source\_map | Información faltante |  
| Task List ausente | No se encontró lista de tareas explícita | source\_map | Información faltante |  
| Create/Edit ausente | No se encontraron formularios | source\_map | Información faltante |  
| Estados vacíos | No encontrados | source\_map | Información faltante |  
| Errores de API | No encontrados | source\_map | Información faltante |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* No convertir Planner en módulo aislado: pertenece al ecosistema integrado.  
\* No desarrollar Goals como MVP real desde esta fuente.  
\* No desarrollar comentarios reales en Tasks.  
\* No desarrollar adjuntos reales en Tasks.  
\* No desarrollar subtareas complejas.  
\* No desarrollar dependencias entre tareas.  
\* No desarrollar recurrencia avanzada desde esta fuente.  
\* No desarrollar notificaciones reales.  
\* No desarrollar auditoría completa, aunque la trazabilidad sea principio transversal.  
\* No desarrollar Geni real para Planner.  
\* No permitir que Geni complete tareas automáticamente.  
\* No desarrollar automatizaciones reales.  
\* No desarrollar generación real de tareas desde Inventory/Assets.  
\* No desarrollar Feed derivado de tareas completadas.  
\* No desarrollar Web App como puente de adopción.  
\* No desarrollar Calendar → FamilyCloud / álbum automático.  
\* No desarrollar reconocimiento facial asociado a Calendar.  
\* No asumir vistas día/semana/mes porque no aparecen en este documento.  
\* No asumir endpoints.  
\* No asumir permisos faltantes.  
\* No asumir valores de prioridad.  
\* No asumir textos de tareas/eventos que no aparecen.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| Lista de tareas explícita | Codex necesita saber layout, filtros, agrupación y acciones visibles | Alta |  
| Pantalla Crear tarea | Falta formulario, campos obligatorios, botones y validaciones | Alta |  
| Pantalla Editar tarea | Falta flujo de edición y estados de guardado | Media |  
| Eliminar tarea | El prompt lo pide, pero el documento no lo menciona | Media |  
| Completar tarea con detalle | Se infiere por restricción de Geni, pero no hay flujo humano definido | Alta |  
| Verification Flow MVP | Fuente contradice estados esperados del prompt; no hay \`requires\_verification\` | Alta |  
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

**\---**

**\#\# 13\. Fuente**

**\#\#\# Archivo principal**

\* \`HomePlus — SECCION 1 PRODUCTO.md\`

**\#\#\#\# Secciones usadas**

\* \`PROPUESTA DE VALOR\`  
\* \`DIFERENCIACIÓN\`  
\* \`TARGET USERS\`  
\* \`GENI\`  
\* \`PRINCIPIO DE VISIBILIDAD\`  
\* \`DOMINIOS OFICIALES\`  
\* \`ADOPCIÓN — MODELO Y RIESGOS\`  
\* \`DECISIONES DE PRODUCTO TOMADAS\`  
\* \`FUERA DEL SCOPE DE ESTA SECCIÓN\`

**\#\#\# Archivo de comprensión asociado**

\* \`Seccion 1 Producto.txt\`

**\#\#\#\# Bloques usados**

\* \`OUTPUT 1 — ENTITIES\`  
\* \`OUTPUT 2 — RELATIONSHIPS\`  
\* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`  
\* \`OUTPUT 4 — DATA FLOWS\`  
\* \`OUTPUT 5 — BUSINESS RULES\`  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
\* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`  
\* \`OUTPUT 8 — GRAPH EDGES\`

**\#\#\# Source map usado**

\* \`source\_map\_HomePlus\_SECCION\_1\_PRODUCTO.md\`

**\#\#\#\# Secciones usadas**

\* \`4.7 PLANNER\`  
\* \`4.8 TASKS\`  
\* \`4.9 EVENTS\`  
\* \`4.10 CALENDAR\`  
\* \`4.11 HOME\` solo como dependencia externa de conexión Home/Planner  
\* \`5. Mapa de entidades\`  
\* \`6. Mapa de relaciones\`  
\* \`7. Mapa de estados\`  
\* \`8. Mapa de permisos\`  
\* \`9. Mapa de flujos\`  
\* \`10. Mapa de APIs\`  
\* \`11. Mapa de UI\`  
\* \`13. Restricciones arquitectónicas detectadas\`  
\* \`15. Información POST\_MVP detectada\`  
\* \`18. Información faltante\`

**\---**

**\#\# Nota de alcance final**

Este fragment es útil como base parcial para una demo visual/interactiva de Planner, pero esta fuente no alcanza para construir un Planner completo sin decisiones posteriores. Lo más sólido de esta sección es:

\* rol de Planner dentro del producto;  
\* Tasks y Calendar como subpartes;  
\* relación con Home;  
\* navegación primaria;  
\* campos parciales de Task;  
\* estados parciales de Task y Event;  
\* permisos parciales por Adulto/Adolescente;  
\* restricciones fuertes sobre Geni, visibilidad y post-MVP.

Lo menos definido es:

\* UI concreta;  
\* datos demo concretos;  
\* APIs;  
\* service contract;  
\* formularios;  
\* feedback inmediato;  
\* recurrencia simple;  
\* verification flow alineado al MVP esperado.

**\# PLANNER fragment — HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO**

**\#\# 1\. Rol del módulo en la demo**

Información explícita o claramente presente en este documento:

\* Planner aparece como parte propia de cada Hogar: cada hogar tiene su propio Planner.  
\* Planner contiene al menos \`Task\`, \`Calendar\`, \`Goal\` y \`Responsabilidad\`, según el archivo de comprensión.  
\* Para este fragment se extrae solo lo relacionado con Planner visual/interactivo: tareas, eventos, calendario, responsabilidades, señales de vencimiento, navegación y conexión con Home.  
\* Tasks y Calendar están ubicados en funciones de uso diario. En la jerarquía de frecuencia del documento, \`Home\`, \`Tasks\` y \`Calendar\` aparecen en Tier 1 / Diario, ubicados en Bottom Nav o Home.  
\* El valor del módulo es hacer visible la realidad operativa del hogar: tareas pendientes, tareas vencidas, carga/asimetría de tareas, eventos familiares y conflictos de horarios.  
\* El documento marca que los compromisos compartidos son visibles: tareas asignadas, estado de tareas, calendario y eventos familiares.  
\* La experiencia debe priorizar datos concretos por encima de mensajes suaves. Ejemplos explícitos: “Tres tareas pendientes desde el lunes”, “Tres tareas completadas de ocho”, “2 de 8”, “87%”.  
\* El usuario no debe sentir que Planner oculta problemas para mantener la paz. El módulo debe mostrar tareas vencidas, tareas pendientes y métricas incómodas si existen.  
\* Geni puede sugerir acciones o presentar datos, pero no completa tareas automáticamente y no ejecuta acciones unilateralmente. Para este fragment, cualquier uso de Geni debe tratarse como dependencia externa / no desarrollar en este fragment.

Dependencias externas / no desarrollar en este fragment:

\* Home: muestra resúmenes de Planner, pero Home no administra.  
\* People / Members: las personas pueden ser responsables de tareas o participantes de eventos.  
\* Household: Planner pertenece a un hogar.  
\* Notificaciones: aparecen como consecuencia de tareas próximas/vencidas o conflictos, pero no hay que implementar push real desde este fragment.  
\* Geni: aparece como capa de sugerencias, briefing y guardrails, pero no como IA real para este fragment.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

Información visual extraíble:

\* \`Planner\` como destino de navegación en Bottom Navigation: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`Tasks\` y \`Calendar\` son funciones diarias: deben estar accesibles en navegación primaria o desde Home.  
\* Home muestra información de Planner en este orden relativo:  
  \* Atención Requerida: incluye tareas vencidas.  
  \* Próximos Eventos: agenda inmediata.  
  \* Tareas: agrupadas por Responsabilidad.  
\* Widget \`WidgetPróximosEventos\`: agenda inmediata.  
\* Widget \`WidgetTareas\`: tareas agrupadas por Responsabilidad; el archivo de comprensión indica que es dinámico y desaparece al completar.  
\* Home resume. Los módulos administran. Por lo tanto, desde Home se debe poder conducir al módulo Planner que administra tareas/eventos.  
\* El documento no define una pantalla propia de Task List, Create Task, Edit Task, Event Form ni Calendar View.  
\* El documento no define tabs internos concretos para Planner.  
\* El documento no define iconos concretos.  
\* El documento no define estados visuales detallados como skeleton, spinner, toast o snackbar.

Secciones/elementos visuales que sí se pueden extraer para demo:

\* Header o entrada de Planner desde Bottom Nav.  
\* Bloque/lista de tareas.  
\* Agrupación visual por Responsabilidad.  
\* Indicador de tarea vencida.  
\* Indicador de tarea próxima a vencer.  
\* Indicador de tarea asignada/responsable.  
\* Lista o bloque de próximos eventos.  
\* Vista simple de calendario como parte de Planner, aunque el documento no define día/semana/mes.  
\* Acceso de Home hacia Planner desde tareas o próximos eventos.

**\#\#\# 2.2 Datos creíbles**

Datos, frases o categorías presentes en documento/comprensión que pueden alimentar mock/demo data sin inventar:

\* “Tres tareas pendientes desde el lunes”.  
\* “Tres tareas atrasadas en una semana”.  
\* “Tres tareas completadas de ocho”.  
\* “2 de 8”.  
\* “87%” de tareas sostenidas por un miembro.  
\* Tarea vencida.  
\* Tarea próxima a vencer.  
\* Tarea asignada.  
\* Tareas asignadas y estado visibles para todo el hogar.  
\* Calendario y eventos familiares visibles para todo el hogar.  
\* Próximos Eventos / agenda inmediata.  
\* Tareas agrupadas por Responsabilidad.  
\* Responsabilidades mencionadas en el archivo de comprensión: Compras, Mascotas, Limpieza, Vehículos.  
\* Documento o vencimiento próximo produce recordatorio.  
\* Conflicto de horarios por solapamiento detectado.  
\* Evento familiar o personal.  
\* Estados de Task en archivo de comprensión: Pendiente, En progreso, Completada, Cancelada.  
\* Vencida es calculado; no es estado de tarea.  
\* Estados de Evento en archivo de comprensión: Programado, Completado, Cancelado.  
\* No existe Postergado para eventos; postergar equivale a modificar fecha.

No se encontraron ejemplos concretos de tareas con título tipo “comprar leche” o “pagar luz”.

**\#\#\# 2.3 Acción interactiva**

Acciones visibles o inferibles desde documento/comprensión, clasificadas sin inventar contratos:

\* Completar tarea: REAL/LOCAL posible para demo. El documento afirma que Geni nunca completa tareas automáticamente y que la responsabilidad de completar es humana.  
\* Ver tareas asignadas y estado: REAL/LOCAL posible para demo.  
\* Ver tareas vencidas: REAL/LOCAL posible para demo, porque el documento exige mostrar tareas vencidas y métricas operativas.  
\* Ver tareas agrupadas por Responsabilidad: REAL/LOCAL posible para demo desde Home/Planner.  
\* Ver próximos eventos: REAL/LOCAL posible para demo.  
\* Ver calendario/eventos familiares: REAL/LOCAL posible para demo.  
\* Modificar fecha de evento: acción mencionada indirectamente, porque “postergar equivale a modificar fecha”. No hay UI ni API.  
\* Crear tareas: aparece como permiso de Adulto en archivo de comprensión. REAL/LOCAL posible para demo, sin contrato API.  
\* Reasignar tareas: aparece como permiso de Adulto en archivo de comprensión. REAL/LOCAL posible para demo, sin contrato API.  
\* Crear eventos: aparece como permiso de Adulto y Adolescente en archivo de comprensión. REAL/LOCAL posible para demo, sin contrato API.  
\* Geni sugiere recordatorio sobre tareas: DEMO/POST\_MVP para este fragment, no IA real.  
\* Geni sugiere reorganización/redistribución ante patrón de tareas vencidas: DEMO/POST\_MVP para este fragment, no IA real.  
\* Stock bajo puede sugerir crear tarea de compra: dependencia externa / no desarrollar en este fragment.  
\* Asset/Mantenimiento puede generar Task: dependencia externa / no desarrollar en este fragment.

**\#\#\# 2.4 Feedback inmediato**

Señales de UX encontradas:

\* Tarea asignada → notificación inmediata al responsable.  
\* Tarea próxima a vencer → recordatorio al responsable.  
\* Tarea vencida → notificación al responsable.  
\* Tarea vencida persistente → alerta al Coordinador.  
\* Patrón de tareas vencidas → sugerencia de reorganización o redistribución.  
\* Conflicto de horarios → alerta proactiva con sugerencia.  
\* Documento o vencimiento próximo → recordatorio.  
\* Regla de oro de notificaciones: si Geni interrumpe, el contenido debe justificar la interrupción.  
\* No notificar sobre cosas que el usuario no puede actuar inmediatamente.  
\* No notificar sobre insights interesantes pero no urgentes de forma repetitiva.  
\* No notificar sobre el mismo problema múltiples veces sin nueva información.  
\* El WidgetTareas del Home es dinámico y desaparece al completar, según el archivo de comprensión.

No encontrado:

\* Toast de éxito.  
\* Toast de error.  
\* Skeleton.  
\* Spinner.  
\* Loading state.  
\* Retry.  
\* Empty state formal.  
\* Disabled state.  
\* Mensajes exactos de success/error para acciones de Planner.

**\#\#\# 2.5 Service aislado**

Pistas encontradas para un service de Planner:

\* Debe listar tareas, estados y vencimientos para mostrarlos en Planner/Home.  
\* Debe exponer tareas agrupadas por Responsabilidad.  
\* Debe exponer próximos eventos para Home.  
\* Debe exponer eventos familiares/personales para Calendar.  
\* Debe poder actualizar el estado de una Task cuando una persona la completa.  
\* Debe poder calcular \`vencida\` a partir del vencimiento, porque el documento indica que vencida no es estado, sino cálculo automático.  
\* Debe poder detectar, aunque sea de forma local/mock para demo, tareas próximas a vencer y tareas vencidas.  
\* Debe poder detectar, aunque sea de forma local/mock para demo, conflicto de horarios por solapamiento.  
\* Debe enviar datos a Home: Task completada → Home reorganiza widgets dinámicamente, según el archivo de comprensión.  
\* Debe entregar agenda inmediata / próximos eventos.  
\* No se encontró ningún \`service\` explícito de Planner.  
\* No se encontraron nombres de funciones.  
\* No se encontraron endpoints.  
\* No se encontró contrato request/response.

Clasificación sugerida por lo encontrado:

\* Service aislado mock/local para demo: compatible con el documento.  
\* Backend real: no definido en esta fuente.

**\#\#\# 2.6 Navegación coherente**

Navegación encontrada:

\* BottomNavigation congelado V1: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Tasks y Calendar son Tier 1 / Diario, ubicados en Bottom Nav o Home.  
\* Home muestra tareas y próximos eventos, pero no administra; debe conducir al módulo que administra.  
\* Planner administra tareas, eventos y calendario.  
\* QuickActions existe como panel flotante desde \`+\`, con Geni fijo primero y acciones dinámicas por frecuencia.  
\* No se encontró una acción rápida explícita “crear tarea” o “crear evento” en este documento.  
\* No se encontró flujo pantalla a pantalla de Planner.  
\* No se encontraron deep links.  
\* No se encontró navegación desde More hacia Planner.

Dependencias externas / no desarrollar:

\* Home puede abrir Planner desde widgets de tareas o próximos eventos.  
\* People puede proveer miembros/responsables para asignación.  
\* QuickActions existe, pero el documento no define acciones concretas de Planner dentro del panel.

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\# Home**

Información encontrada:

\* Home es centro operativo, resume información y no administra.  
\* Home debe conducir al módulo que administra cada información.  
\* Home tiene \`Próximos Eventos\` como agenda inmediata.  
\* Home tiene \`Tareas\` agrupadas por Responsabilidad.  
\* Home tiene \`Atención Requerida\`, donde aparecen tareas vencidas.  
\* Home puede reorganizar widgets dinámicamente cuando una tarea se completa, según archivo de comprensión.  
\* Home adaptado por rol:  
  \* Coordinador: visión completa del hogar.  
  \* Adulto: visión operativa.  
  \* Adolescente: más foco en tareas, eventos y coordinación.  
  \* Niño: experiencia simplificada.  
  \* Adulto Mayor: prioridad en personas, eventos, recordatorios y medicación.  
  \* Invitado: acceso mínimo.  
  \* Empleado Familiar: visión centrada en trabajo asignado. Dependencia externa / no desarrollar en este fragment.

**\#\#\# More**

\* No se encontró que Planner viva en More.  
\* No se encontró card/list item de More para Planner.

**\#\#\# Quick Actions**

\* QuickActions existe como panel flotante desde \`+\`.  
\* Geni aparece fijo siempre primero.  
\* Las acciones son dinámicas por frecuencia.  
\* No se encontró una acción rápida explícita para crear tarea o crear evento.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

Extraíble como interacción real/local mínima del módulo:

\* Ver lista de tareas.  
\* Ver estado de tareas.  
\* Ver tareas vencidas.  
\* Ver tareas próximas a vencer.  
\* Completar tarea manualmente.  
\* Ver tareas agrupadas por Responsabilidad.  
\* Ver próximos eventos.  
\* Ver calendario/eventos familiares.  
\* Ver conflicto de horarios como alerta conceptual/local si hay solapamiento.  
\* Ver Planner desde Bottom Nav.  
\* Abrir Planner desde Home a partir de \`Tareas\` o \`Próximos Eventos\`.  
\* Mostrar que tareas asignadas y estado son visibles para todo el hogar.  
\* Mostrar que calendario y eventos familiares son visibles para todo el hogar.  
\* Mantener \`vencida\` como cálculo, no como estado guardado, si se implementa lógica local.

**\#\#\# DEMO PREMIUM**

Información útil para que Planner parezca completo sin backend real:

\* Datos duros en cards: “3 tareas pendientes”, “3 completadas de 8”, “2 de 8”, “87%”.  
\* Card de tareas vencidas en Atención Requerida.  
\* Card de Próximos Eventos.  
\* Agrupación por Responsabilidad: Compras, Mascotas, Limpieza, Vehículos.  
\* Sugerencia visible tipo Geni para patrón de tareas vencidas, sin IA real.  
\* Alerta visual de conflicto de horarios, sin motor real complejo.  
\* Feedback local al completar una tarea: el widget/lista se reorganiza o desaparece si no quedan tareas.  
\* Recordatorio local/mock de tarea próxima a vencer.  
\* Alerta local/mock de tarea vencida persistente al Coordinador.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

Información que podría vivir como estado local o mock service en demo:

\* Tasks mock/locales.  
\* Eventos mock/locales.  
\* Responsabilidades mock/locales usando categorías encontradas.  
\* Estado de completado de tarea.  
\* Cálculo local de tarea vencida.  
\* Cálculo local de tarea próxima a vencer.  
\* Próximos eventos para Home.  
\* Reorganización local de Home cuando se completa una tarea.  
\* Detección simple de solapamiento de eventos como demo local.  
\* Mensajes/sugerencias de Geni como texto fijo/mock.

**\#\#\# POST\_MVP**

Información valiosa, pero no implementable ahora como backend real desde este fragment:

\* Geni real que detecta patrones.  
\* Geni real que sugiere reorganización o redistribución.  
\* Automatizaciones permanentes.  
\* Notificaciones push/email/in-app reales.  
\* Auditoría completa.  
\* Timeline de tareas.  
\* Comentarios de tareas.  
\* Adjuntos de tareas.  
\* Subtareas.  
\* Dependencias de tareas.  
\* Recurrencia avanzada.  
\* Goals / Hitos / progreso de metas.  
\* Evento que genera Recuerdo automáticamente.  
\* Participantes heredados para recuerdos.  
\* Presence/Lugar/geocerca relacionado con eventos.  
\* Offline sync completo.

**\#\#\# IGNORAR**

No desarrollar como parte de este fragment:

\* Implementación real de módulos externos que solo generan o consumen tareas/eventos.  
\* Backend real de IA, automatizaciones, notificaciones, auditoría, storage, offline o ubicación.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner en Bottom Nav | Entrada principal a Planner | Abrir Planner | No especificado | \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\` | REAL MÍNIMO |  
| Tasks / Lista de tareas | Tareas asignadas, estados, vencimientos | Ver / completar / posiblemente crear o reasignar si se toma permiso de Adulto | Vencida, próxima a vencer, completada | Desde Planner; desde Home por widget Tareas | REAL MÍNIMO |  
| Tareas agrupadas por Responsabilidad | Agrupación de tareas por área operativa | Ver grupo / completar tarea | Widget dinámico; desaparece al completar según comprensión | Home conduce a Planner | REAL MÍNIMO / DEMO PREMIUM |  
| Atención Requerida — tareas vencidas | Tareas vencidas como elemento urgente | Abrir detalle o Planner | Alerta/urgente conceptual | Desde Home hacia Planner | DEMO PREMIUM |  
| Próximos Eventos | Agenda inmediata | Ver evento / abrir Calendar | No especificado | Desde Home hacia Calendar/Planner | REAL MÍNIMO |  
| Calendar | Eventos familiares/personales | Ver eventos; crear evento según permisos encontrados | Conflicto de horarios conceptual | Planner / Bottom Nav | REAL MÍNIMO |  
| Alerta de conflicto de horarios | Solapamiento detectado | Ver sugerencia | Alerta proactiva con sugerencia | Dentro de Calendar/Planner o Home | DEMO PREMIUM |  
| QuickActions panel | Panel desde \`+\`; Geni fijo primero; acciones dinámicas | No se encontró acción Planner explícita | No especificado | Desde botón \`+\` | Dependencia externa / no desarrollar |  
| Home widgets de Planner | Tareas, tareas vencidas y próximos eventos | Abrir módulo administrador | Reorganización al completar tarea según comprensión | Home → Planner | DEMO PREMIUM |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| “Tres tareas pendientes desde el lunes” | Planner / Tasks | Texto de card, briefing mock o resumen de tareas | Documento principal \> Principio 2 | DEMO PREMIUM |  
| “Tres tareas atrasadas en una semana” | Planner / Tasks | Patrón de tareas vencidas | Documento principal \> Principio 2 | DEMO PREMIUM |  
| “Tres tareas completadas de ocho” | Planner / Tasks | Métrica de progreso dura | Documento principal \> Prioridades arquitectónicas | DEMO PREMIUM |  
| “2 de 8” | Planner / Tasks | Métrica visual de completado | Documento principal \> Qué nunca hacemos | DEMO PREMIUM |  
| “87%” | Planner / Tasks / Carga | Métrica de asimetría/carga | Documento principal \> Principio 1 | DEMO PREMIUM |  
| Tarea asignada | Planner / Tasks | Estado/trigger visual | Documento principal \> Principio 5 | REAL MÍNIMO |  
| Tarea próxima a vencer | Planner / Tasks | Badge/alerta local | Documento principal \> Principio 5 | REAL MÍNIMO |  
| Tarea vencida | Planner / Tasks | Badge/alerta/card urgente | Documento principal \> Principio 1 y 5 | REAL MÍNIMO |  
| Tareas agrupadas por Responsabilidad | Planner / Tasks | Secciones de lista | Documento principal \> Principio 6 / comprensión | REAL MÍNIMO |  
| Compras | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión \> Responsabilidad | DEMO PREMIUM |  
| Mascotas | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión \> Responsabilidad | DEMO PREMIUM |  
| Limpieza | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión \> Responsabilidad | DEMO PREMIUM |  
| Vehículos | Planner / Responsabilidad | Categoría/grupo visual | Archivo de comprensión \> Responsabilidad | DEMO PREMIUM |  
| Próximos Eventos | Planner / Calendar | Card Home / lista Planner | Documento principal \> Principio 6 | REAL MÍNIMO |  
| Agenda inmediata | Planner / Calendar | Label de widget | Documento principal \> Principio 6 | REAL MÍNIMO |  
| Conflicto de horarios | Planner / Calendar | Alerta por solapamiento | Documento principal \> Principio 5 | DEMO PREMIUM |  
| Programado | Planner / Evento | Estado de evento | Archivo de comprensión \> Evento | REAL MÍNIMO |  
| Completado | Planner / Evento | Estado de evento | Archivo de comprensión \> Evento | REAL MÍNIMO |  
| Cancelado | Planner / Evento | Estado de evento | Archivo de comprensión \> Evento | REAL MÍNIMO |  
| Pendiente | Planner / Task | Estado de tarea encontrado | Archivo de comprensión \> Task | REAL MÍNIMO |  
| En progreso | Planner / Task | Estado de tarea encontrado | Archivo de comprensión \> Task | REAL MÍNIMO |  
| Completada | Planner / Task | Estado de tarea encontrado | Archivo de comprensión \> Task | REAL MÍNIMO |  
| Cancelada | Planner / Task | Estado de tarea encontrado | Archivo de comprensión \> Task | REAL MÍNIMO |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Ver tareas asignadas y estado | Todo el hogar según visibilidad compartida | Lista/cards de tareas visibles | REAL MÍNIMO | Documento principal \> Principio 4 |  
| Completar tarea | Humano / responsable no especificado | Tarea pasa a completada; Home puede reorganizar widgets | REAL MÍNIMO / LOCAL | Documento principal \> Principio 2; comprensión \> data flow Task completada → Home |  
| Crear tarea | Adulto | Nueva tarea visible | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión \> reglas de rol Adulto |  
| Reasignar tarea | Adulto | Responsable cambiado | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión \> reglas de rol Adulto |  
| Ver tarea próxima a vencer | Responsable | Recordatorio/badge | DEMO PREMIUM / MOCK | Documento principal \> Principio 5 |  
| Ver tarea vencida | Responsable / Coordinador si persiste | Notificación/alerta/card urgente | DEMO PREMIUM / MOCK | Documento principal \> Principio 5 |  
| Ver patrón de tareas vencidas | No especificado | Sugerencia de reorganización/redistribución | POST\_MVP / DEMO MOCK | Documento principal \> Principio 5 |  
| Crear evento | Adulto / Adolescente según comprensión | Nuevo evento visible | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión \> roles Adulto y Adolescente |  
| Ver calendario/eventos familiares | Todo el hogar según visibilidad compartida | Lista/calendario de eventos | REAL MÍNIMO | Documento principal \> Principio 4 |  
| Modificar fecha de evento | Usuario no especificado | Evento cambia fecha; no existe “postergado” | REAL MÍNIMO / LOCAL, sin API | Archivo de comprensión \> regla Evento |  
| Ver conflicto de horarios | Usuario no especificado | Alerta proactiva con sugerencia | DEMO PREMIUM / MOCK | Documento principal \> Principio 5 |  
| Geni sugiere recordar tarea | Usuario con patrón de revisión o tarea ajena | Mensaje de sugerencia, sin acción automática | DEMO PREMIUM / POST\_MVP | Documento principal \> Principio 2 y 7 |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Puede mostrar tareas vencidas en \`Atención Requerida\`.  
\* Puede mostrar \`Próximos Eventos\` como agenda inmediata.  
\* Puede mostrar \`Tareas\` agrupadas por Responsabilidad.  
\* Puede conducir desde cada bloque al módulo Planner, porque Home resume y los módulos administran.  
\* Puede reorganizarse dinámicamente cuando una Task se completa, según archivo de comprensión.  
\* Puede adaptar foco por rol:  
  \* Adolescente: más foco en tareas, eventos y coordinación.  
  \* Adulto Mayor: prioridad en eventos, recordatorios y medicación.  
  \* Empleado Familiar: trabajo asignado; dependencia externa / no desarrollar en este fragment.

**\#\#\# More**

\* No se encontró relación de Planner con More.  
\* Planner no aparece como módulo de More en esta fuente.

**\#\#\# Quick Actions**

\* Existe \`+\` como panel flotante de QuickActions.  
\* Geni fijo siempre primero.  
\* Acciones dinámicas por frecuencia.  
\* No se encontró acción rápida explícita para Planner.  
\* Cualquier Quick Action de crear tarea/evento sería una decisión posterior, no extraída de este documento.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Crear tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |  
| Reasignar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |  
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción conceptual; responsabilidad humana | REAL MÍNIMO / LOCAL |  
| Listar/ver tareas | No especificado | No especificado | No especificado | No especificado | Acción visual inferida por visibilidad de tareas | REAL MÍNIMO / LOCAL |  
| Crear evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |  
| Modificar fecha de evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |  
| Ver calendario/eventos | No especificado | No especificado | No especificado | No especificado | Acción visual inferida por visibilidad de calendario | REAL MÍNIMO / LOCAL |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Planner | contiene | no especificado | Task, Calendar, Goal, Responsabilidad | Estructura del módulo | REAL MÍNIMO con Goal fuera de este fragment |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge, filtro o estado visual | REAL MÍNIMO |  
| Task | vencida | calculado / no especificado | Vencida no es estado | Badge/alerta visual | REAL MÍNIMO |  
| Task | vencimiento | no especificado | próxima a vencer, vencida | Recordatorios/alertas | REAL MÍNIMO |  
| Task | responsable | no especificado | responsable no tipado | Asignación/notificación | REAL MÍNIMO |  
| Task | responsabilidad principal | no especificado | única responsabilidad principal | Agrupación visual | REAL MÍNIMO |  
| Task | requiere verificación | no especificado | opcional | Flujo de verificación; contradicción con estados MVP de otros prompts | POST\_MVP / requiere definición |  
| Task | recurrencia | no especificado | genera nuevas instancias | No reutiliza misma tarea | POST\_MVP |  
| Task | dependencia | no especificado | depende de otra Task | Bloqueo si previa no completa | POST\_MVP |  
| Task | subtareas | no especificado | único nivel | Progreso automático | POST\_MVP |  
| Task | comentarios | no especificado | ComentarioTask | Comentarios | POST\_MVP |  
| Task | adjuntos | no especificado | imágenes, PDFs, archivos, audio | Evidencia/archivos | POST\_MVP |  
| Task | timeline | no especificado | creación, cambios de responsable, fechas, completado, comentarios | Historial visual | POST\_MVP |  
| Responsabilidad | nombre/categoría | no especificado | Compras, Mascotas, Limpieza, Vehículos | Agrupar tareas | REAL MÍNIMO / DEMO PREMIUM |  
| Plantilla de Tarea | no especificado | no especificado | Plantillas predefinidas | Base de tareas prearmadas; fuente no da campos | DEMO PREMIUM / requiere definición |  
| Calendar | administración | módulo | eventos familiares/personales | Pantalla calendario/lista eventos | REAL MÍNIMO |  
| Evento | estado | no especificado | Programado, Completado, Cancelado | Badge/estado visual | REAL MÍNIMO |  
| Evento | fecha | no especificado | modificar fecha \= postergar | Orden/calendario | REAL MÍNIMO |  
| Evento | participantes | no especificado | Persona participa en Evento | Avatares/lista de participantes | REAL MÍNIMO / parcial |  
| Evento | lugar | no especificado | relación con Lugar | Integración externa | POST\_MVP |  
| Home | WidgetPróximosEventos | Screen | agenda inmediata | Card/resumen | DEMO PREMIUM |  
| Home | WidgetTareas | Screen | tareas agrupadas por Responsabilidad | Card/lista dinámica | DEMO PREMIUM |  
| Notificación | categoría | no especificado | Planner, Calendar | Alertas de tareas/eventos | MOCK / POST\_MVP |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Tarea vencida | Mostrarla; no suavizarla; notificar al responsable | Documento principal \> Principio 1 y 5 | REAL MÍNIMO / DEMO |  
| Tarea vencida persistente | Alertar al Coordinador si la situación persiste | Documento principal \> Principio 5 | DEMO PREMIUM |  
| Patrón de tareas vencidas | Geni sugiere reorganización o redistribución | Documento principal \> Principio 5 | POST\_MVP / DEMO MOCK |  
| Tarea próxima a vencer | Recordatorio al responsable | Documento principal \> Principio 5 | DEMO PREMIUM |  
| Tarea asignada | Notificación inmediata al responsable | Documento principal \> Principio 5 | DEMO PREMIUM |  
| Geni intenta completar tarea | No permitido; Geni nunca completa tareas automáticamente | Documento principal \> Principio 2 | Restricción REAL |  
| Tarea completada | Home puede reorganizar widgets dinámicamente | Archivo de comprensión \> data flow | DEMO PREMIUM |  
| Vencida como estado persistido | No corresponde; vencida es calculado | Archivo de comprensión \> reglas de negocio | Restricción REAL |  
| Evento postergado | No existe estado Postergado; postergar equivale a modificar fecha | Archivo de comprensión \> regla de Evento | Restricción REAL |  
| Conflicto de horarios | Alerta proactiva con sugerencia | Documento principal \> Principio 5 | DEMO PREMIUM |  
| Notificación no accionable | No debe notificarse | Documento principal \> Principio 5 | Restricción REAL |  
| Notificación repetida sin nueva información | No debe notificarse | Documento principal \> Principio 5 | Restricción REAL |  
| Miembro completamente invisible para coordinación | No permitido para compromisos compartidos como tareas/eventos | Documento principal \> Principio 4 / líneas rojas | Restricción REAL |  
| Sin conexión | Lectura de tareas/eventos y completar tareas aparece como capacidad offline limitada, pero offline sync real queda fuera | Documento principal \> tradeoff offline | POST\_MVP / fuera del fragment |

Estados vacíos:

\* No se encontró empty state formal para Planner, Tasks, Events o Calendar.  
\* No se encontró pantalla “sin tareas”.  
\* No se encontró pantalla “sin eventos”.

Errores:

\* No se encontraron mensajes de error específicos.  
\* No se encontraron errores de permisos para Planner.  
\* No se encontraron errores de API.

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* No ocultar asimetrías de carga.  
\* No suavizar patrones problemáticos.  
\* No eufemizar métricas incómodas.  
\* No permitir que el Coordinador desactive la visibilidad de datos de coordinación compartida.  
\* Tareas asignadas y estado son visibles para todo el hogar.  
\* Calendario y eventos familiares son visibles para todo el hogar.  
\* Compromisos compartidos son visibles por defecto.  
\* Geni presenta datos, no juicios.  
\* Geni sugiere acciones, no las ejecuta unilateralmente.  
\* Geni nunca completa tareas automáticamente.  
\* Geni no resuelve tareas por nadie.  
\* Geni no manda mensajes en nombre de un miembro a otro sin permiso explícito.  
\* Geni no crea automatizaciones permanentes sin aprobación humana.  
\* Si Geni interrumpe, el contenido debe justificar la interrupción.  
\* No notificar sobre cosas que el usuario no puede actuar inmediatamente.  
\* No notificar repetidamente sobre el mismo problema sin información nueva.  
\* Home no administra; Home resume y conduce al módulo administrador.  
\* Tasks y Calendar deben estar priorizados por frecuencia de uso diaria.  
\* Cada hogar tiene su propio Planner; datos de un hogar no filtran hacia otro.  
\* Vencida no es estado de Task; se calcula automáticamente.  
\* Una tarea posee una única responsabilidad principal.  
\* No existe Postergado para eventos; postergar equivale a modificar fecha.  
\* Las tareas con verificación tienen información contradictoria: la fuente dice que no existe un estado separado, pero otros prompts de MVP pueden exigir estados separados. No resolver en este fragment.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| Pantalla explícita de Planner | Define layout real, tabs, header, filtros | Codex deberá usar este fragment solo como base cruda, no como spec final |  
| Pantalla Task List | Define cards, secciones, acciones y empty states | Falta diseño concreto |  
| Form Crear/Editar Task | Define inputs y validaciones | No hay campos suficientes para formulario real |  
| Form Crear/Editar Event | Define inputs, fecha/hora, ubicación, participantes | No hay contrato visual suficiente |  
| Vista día/semana/mes | El prompt de MVP la pide, pero este documento no la define | Requiere otra fuente o decisión posterior |  
| Tareas con fecha dentro del calendario | El prompt de MVP lo pide, pero esta fuente solo relaciona tareas con vencimiento y eventos/calendar | Requiere validación posterior |  
| Prioridades de tarea | El prompt general puede pedirlas, pero este documento no las menciona | No implementar desde esta fuente |  
| Templates concretas | La fuente menciona Plantilla de Tarea y responsabilidades, pero no lista templates MVP como datos | No inventar templates desde este fragment |  
| Campos de Task | Faltan title, description, dueDate, assignedTo, priority, householdId | No hay modelo implementable completo |  
| Campos de Evento | Faltan title, description, start/end, location, recurrence | No hay modelo implementable completo |  
| Tipos de campos | No se especifican tipos | No definir DB/schema real desde este fragment |  
| Endpoints | No hay rutas, métodos, request ni response | No generar API real |  
| Permisos finos | Solo aparecen permisos de Adulto/Adolescente y visibilidad general | No cerrar matriz de permisos |  
| Verification Flow | La fuente contradice estados separados | Requiere decisión posterior antes de implementación real |  
| Recurrencia simple | No aparece \`none/daily/weekly/monthly\` en esta fuente | No extraer como dato encontrado |  
| Feedback de éxito/error | No hay toast, loading, error o success copy | Codex deberá usar defaults en etapa posterior si se decide |  
| Empty states | No hay estados vacíos explícitos | Falta para demo pulida |  
| Criterio de “completado” de evento | Estados existen, pero no flujo | No cerrar comportamiento |  
| Integración real con Home | Hay regla conceptual, pero no contrato de props/service | Requiere definición posterior |

**\---**

**\#\# 13\. Fuente**

Archivo principal:

\* \`HomePlus — SECCION 2 PRINCIPIOS DEL PRODUCTO.md\`

Secciones usadas:

\* \`DECISIONES FUNDACIONALES\`  
\* \`PRINCIPIOS RECTORES\`  
\* \`1. La verdad primero, el confort después\`  
\* \`2. Geni no reemplaza conversaciones. Las hace inevitables.\`  
\* \`4. Privacidad no es opacidad\`  
\* \`5. Proactividad calibrada. No notificación constante.\`  
\* \`6. Priorización por frecuencia de uso. No por complejidad técnica.\`  
\* \`7. Datos accesibles. Geni interviene cuando detecta patrones problemáticos.\`  
\* \`PRIORIDADES ARQUITECTÓNICAS\`  
\* \`TRADEOFFS ACEPTADOS\`  
\* \`Qué nunca hacemos\`, cuando aparece como líneas rojas sobre tareas, Home, visibilidad y Geni.

Archivo de comprensión asociado:

\* \`Seccion 2 Principios de producto.txt\`

Secciones usadas:

\* \`OUTPUT 1 — ENTITIES\`  
\* \`OUTPUT 2 — RELATIONSHIPS\`  
\* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`  
\* \`OUTPUT 4 — DATA FLOWS\`  
\* \`OUTPUT 5 — BUSINESS RULES\`  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
\* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`, solo cuando afecta directamente Planner y marcada como dependencia externa o POST\_MVP.  
\* \`OUTPUT 8 — GRAPH EDGES\`, solo como confirmación de relaciones.

Source map usado:

\* \`source\_map\_HomePlus\_SECCION\_2\_PRINCIPIOS\_DEL\_PRODUCTO.md\`

Secciones usadas:

\* \`4.7 PLANNER\`  
\* \`4.8 TASKS\`  
\* \`4.9 EVENTS\`  
\* \`4.10 CALENDAR\`  
\* \`4.11 HOME\`, solo para conexión directa con Planner.  
\* \`5. Mapa de entidades\`, solo entidades de Planner y dependencias directas.  
\* \`6. Mapa de relaciones\`, solo relaciones de Planner y dependencias directas.  
\* \`7. Mapa de estados\`, solo estados de Task/Event/Verification.  
\* \`8. Mapa de permisos\`, solo permisos que afectan tareas/eventos.  
\* \`9. Mapa de flujos\`, solo flujos de Planner.  
\* \`10. Mapa de APIs\`, para confirmar ausencia de contratos explícitos.  
\* \`11. Mapa de UI\`, solo UI de Planner/Home relacionada.  
\* \`13. Restricciones arquitectónicas detectadas\`, solo restricciones que afectan Planner.

**\# PLANNER fragment — HomePlus — SECCION 3 FILOSOFIA**

**\#\# 1\. Rol del módulo en la demo**

Información explícita o claramente presente en este documento:

\* Planner aparece como parte del núcleo operativo de HomePlus.  
\* El archivo de comprensión describe \`Planner\` como el módulo que administra \`Tasks\`, \`Calendar\` y \`Goals\`, con responsabilidades como eje organizador.  
\* Para este fragment, \`Goals\` queda como POST\_MVP y no se desarrolla.  
\* Las tareas del hogar y el calendario familiar forman parte del núcleo obligatorio de coordinación.  
\* El documento establece que HomePlus no permite usar “solo el calendario” ni desactivar tareas si se forma parte del hogar.  
\* Las tareas y el calendario son áreas de transparencia forzada:  
  \* todos ven quién hizo qué;  
  \* todos ven quién no cumplió;  
  \* todos ven cómo se distribuye la carga;  
  \* todos ven los compromisos del calendario compartido.  
\* Planner ayuda a hacer visible el esfuerzo familiar y la coordinación diaria.  
\* HomePlus no presenta Planner como una app de productividad neutra; tiene postura sobre asimetría, evasión e incumplimiento.  
\* Geni puede alertar, insistir y escalar problemas de tareas, pero no reemplaza la conversación humana.  
\* Geni no reasigna tareas automáticamente.  
\* Geni no completa tareas automáticamente.  
\* Geni no cambia eventos del calendario sin confirmación humana.  
\* Las responsabilidades no son un dominio independiente; el archivo de comprensión las ubica como propiedad/eje organizador dentro de Tasks.  
\* Calendar vive dentro de Planner según el archivo de comprensión.  
\* Bottom Navigation incluye \`Planner\` como tab principal: \`Home\`, \`People\`, \`+\`, \`Planner\`, \`More\`.  
\* Home resume información de Planner, pero no administra Planner.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Pantallas / secciones / componentes detectados**

\* \`Planner\` como tab principal en Bottom Navigation.  
\* \`Tasks\` como parte del núcleo operativo de Planner.  
\* \`Calendar\` como parte del núcleo operativo de Planner.  
\* \`Task\` como entidad visualizable por estado, responsable, cumplimiento e incumplimiento.  
\* \`Calendar\` como espacio de eventos familiares y compromisos compartidos.  
\* Dashboard o visualización de distribución de tareas semanal/mensual.  
\* Datos siempre visibles en dashboards de coordinación:  
  \* distribución de tareas semanal/mensual;  
  \* próximos vencimientos.  
\* Home puede mostrar datos provenientes de Planner:  
  \* estado de tareas completadas/pendientes;  
  \* tareas vencidas en Atención Requerida;  
  \* próximos eventos del calendario.  
\* \`CargaFamiliar\` aparece como widget de Home para mostrar distribución de carga de tareas.  
\* \`ProximosEventos\` aparece como widget de Home con próximos eventos del calendario.  
\* \`AtencionRequerida\` aparece como bloque de Home para elementos urgentes, incluyendo tareas vencidas.  
\* Quick Actions aparece como botón \`+\` central en Bottom Nav; el documento no detalla acciones específicas de Planner, pero el archivo de comprensión lo define como panel flotante con Geni como slot fijo.  
\* SearchGlobal indexa Planner según archivo de comprensión.

**\#\#\#\# Jerarquía visual / navegación detectada**

\* Bottom Nav V1 congelada:  
  \* Home;  
  \* People;  
  \* \`+\`;  
  \* Planner;  
  \* More.  
\* Los módulos Tier 1 tienen acceso directo; Tasks y Calendar aparecen como núcleo diario.  
\* Home es pantalla inicial inmutable.  
\* Home resume, no administra: cada dato debe conducir al módulo que lo administra.  
\* Máximo de navegación detectado: no más de 4 niveles; objetivo de 95% de acciones en 3 niveles o menos.  
\* Mobile First.  
\* Tablet: 2 columnas.  
\* Desktop sidebar: pendiente de confirmación.

**\#\#\#\# Estados visibles detectados**

\* Task:  
  \* Pendiente;  
  \* En progreso;  
  \* Completada;  
  \* Cancelada.  
\* Event:  
  \* Programado;  
  \* Completado;  
  \* Cancelado.  
\* Vencida no es un estado de Task; se calcula automáticamente.  
\* Para eventos, no existe estado \`Postergado\`; postergar equivale a modificar fecha.  
\* Estados visuales por incumplimiento de tarea:  
  \* por vencer;  
  \* vencida;  
  \* primera falta;  
  \* segunda falta o patrón emergente;  
  \* tercera falta o patrón confirmado.  
\* Estados visuales de escalamiento de tarea:  
  \* recordatorio privado al responsable;  
  \* alerta privada al responsable;  
  \* alerta al coordinador;  
  \* exposición del patrón a toda la familia.

**\#\#\#\# Textos / labels encontrados que pueden servir para demo visual**

\* “Tu tarea ‘lavar los platos’ vence en 2 horas.”  
\* “Tu tarea ‘lavar los platos’ venció hace 3 horas y sigue sin completarse.”  
\* “Tomás no completó ‘lavar los platos’ por segunda vez esta semana. ¿Querés reasignar la tarea o hablar con él?”  
\* “Tomás no completó 8 de las últimas 10 tareas asignadas.”  
\* “La distribución de carga esta semana fue: Valeria 15 tareas, Tomás 2, Roberto 1.”  
\* “Valeria, completaste 15 de 18 tareas esta semana — el 83% del esfuerzo total del hogar. Tomás completó 2, Roberto 1.”  
\* “La familia completó las 18 tareas asignadas esta semana. Es la primera vez en 3 semanas que todas las tareas se cumplen. 💜”  
\* “La distribución de tareas esta semana fue: Valeria 83%, Tomás 11%, Roberto 6%.”  
\* “La distribución de tareas viene cambiando en las últimas 3 semanas. Semana 1: 60-40. Semana 2: 65-35. Semana 3: 70-30. La carga sobre Valeria está aumentando.”  
\* “Tomás está en época de exámenes hasta el 15 de junio. Su carga de tareas se redujo temporalmente. Roberto y Valeria están cubriendo las tareas redistribuidas.”  
\* “Tomás declaró disponibilidad de 1-2hs pero no completó ninguna de las 3 tareas asignadas en las últimas 2 semanas.”

**\#\#\#\# Iconos / emojis mencionados**

\* 💜 para reconocimiento.  
\* ⚠️ para alertas urgentes.  
\* 🎯 para logros cumplidos.  
\* El documento indica no usar 3+ emojis ni emojis genéricos de celebración como 🎉🎊🥳.

**\---**

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Personas / miembros usados en ejemplos**

\* Valeria.  
\* Tomás.  
\* Roberto.  
\* Familia García.

**\#\#\#\# Tareas / responsabilidades usadas como ejemplos**

\* “lavar los platos”.  
\* “sacar la basura”.  
\* Tareas del hogar.  
\* Responsabilidades asignadas.  
\* Tarea crítica.  
\* Tareas mínimas asignadas.  
\* Próximos vencimientos.

**\#\#\#\# Distribución y métricas de tareas encontradas**

\* Valeria 15 tareas.  
\* Tomás 2 tareas.  
\* Roberto 1 tarea.  
\* 15 de 18 tareas completadas.  
\* 83% del esfuerzo total del hogar.  
\* Tomás no completó 8 de las últimas 10 tareas asignadas.  
\* Familia completó 18 tareas asignadas en una semana.  
\* Primera vez en 3 semanas que todas las tareas se cumplen.  
\* Valeria 88% / Tomás 12%.  
\* Valeria 57% / Tomás 43%.  
\* Tendencia semanal:  
  \* semana 1: 60-40;  
  \* semana 2: 65-35;  
  \* semana 3: 70-30.  
\* Umbral de alerta por asimetría: diferencia mayor al 40%.  
\* Patrón confirmado: 3+ semanas consecutivas.

**\#\#\#\# Disponibilidad / carga contextual encontrada**

\* Disponibilidad 1-2hs por día.  
\* Disponibilidad 3-4hs por día.  
\* Disponibilidad 5+hs por día.  
\* Valeria: trabaja 10hs \+ estudia → disponibilidad 1-2hs por día.  
\* Tomás: trabajo híbrido 6hs → disponibilidad 3-4hs por día.  
\* Roberto: jubilado en casa → disponibilidad 5+hs por día.  
\* Época de exámenes.  
\* Proyecto laboral intenso.  
\* Enfermedad / gripe.  
\* Cuidado de alguien.  
\* Capacidad física/mental.  
\* Contexto familiar.

**\#\#\#\# Asignación semanal de ejemplo**

\* 18 tareas semanales.  
\* Valeria: 3 tareas livianas/rápidas.  
\* Tomás: 6 tareas medianas.  
\* Roberto: 9 tareas, incluyendo tareas que requieren más tiempo.  
\* Distribución numérica: 17% / 33% / 50%.  
\* Interpretación del documento: desigual en cantidad, equitativa en esfuerzo real.

**\#\#\#\# Eventos / Calendar**

\* Calendario familiar.  
\* Compromisos del calendario compartido.  
\* Horarios de todos.  
\* No se encontraron ejemplos concretos de eventos con título, fecha u hora.  
\* No se encontraron datos demo específicos para vista día/semana/mes.

**\#\#\#\# Templates**

\* El archivo de comprensión menciona \`Plantilla\` como feature de Planner, inicialmente solo para Tasks.  
\* No se encontraron en este documento las templates exactas: Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos.  
\* No se encontraron ejemplos concretos de templates predefinidas dentro del documento principal.

**\---**

**\#\#\# 2.3 Acción interactiva**

Acciones visibles o conceptuales detectadas:

\* Ver tareas del hogar.  
\* Ver quién hizo qué.  
\* Ver quién no cumplió.  
\* Ver distribución de carga.  
\* Completar tarea.  
\* Consultar calendario familiar.  
\* Ver compromisos del calendario compartido.  
\* Modificar fecha de evento para postergar.  
\* Confirmar cambios de evento cuando Geni propone o intenta modificar.  
\* Ver próximos vencimientos.  
\* Actualizar disponibilidad personal.  
\* Silenciar notificaciones después de las 22hs.  
\* Configurar tipos de alertas recibidas: urgentes, diarias, semanales.  
\* El coordinador puede decidir si reasigna una tarea o habla con el responsable cuando Geni alerta.  
\* Adulto puede crear/reasignar tareas según archivo de comprensión.  
\* Adolescente puede crear eventos familiares según archivo de comprensión.  
\* Empleado Familiar puede completar tareas asignadas, comentar tareas y adjuntar evidencia; esto queda POST\_MVP / dependencia externa, no desarrollar.  
\* Geni puede sugerir responsable, pero no reasignar automáticamente.  
\* Geni puede alertar, recordar, insistir y escalar.  
\* SearchGlobal indexa Planner y ejecuta acciones según archivo de comprensión, pero no se detallan acciones específicas de búsqueda para Planner.

Clasificación de acciones:

\* Ver/listar tareas: REAL MÍNIMO, aunque no hay UI detallada.  
\* Completar tarea: REAL MÍNIMO.  
\* Cambiar estado visible de tarea: REAL MÍNIMO si deriva de completar/cancelar, pero no se define contrato.  
\* Ver calendario/eventos: REAL MÍNIMO.  
\* Editar fecha de evento/postergar: REAL MÍNIMO como concepto, sin contrato.  
\* Crear/reasignar tarea por Adulto: REAL MÍNIMO si se usa el permiso encontrado, sin matriz completa.  
\* Crear evento por Adolescente: REAL MÍNIMO si se usa el permiso encontrado, sin matriz completa.  
\* Escalamiento de Geni: DEMO PREMIUM / POST\_MVP; puede simularse visualmente, no como IA real ni notificaciones reales.  
\* Actualizar disponibilidad y ajuste dinámico de carga: POST\_MVP / DEMO PREMIUM si se simula localmente.  
\* Comentarios, adjuntos y evidencia: POST\_MVP.  
\* SearchGlobal sobre Planner: POST\_MVP o demo visual si ya existe buscador.

**\---**

**\#\#\# 2.4 Feedback inmediato**

Feedback UX encontrado o inferible directamente desde el documento:

\* Recordatorio privado al responsable antes de vencer una tarea.  
\* Alerta privada al responsable cuando una tarea venció.  
\* Alerta al coordinador por segunda falta o patrón emergente.  
\* Notificación de que el coordinador fue alertado.  
\* Exposición del patrón a toda la familia.  
\* Datos siempre visibles en dashboard sin push constante.  
\* Alertas activas solo cuando cruzan umbrales.  
\* Feedback factual de logro:  
  \* “La familia completó las 18 tareas asignadas esta semana. Es la primera vez en 3 semanas que todas las tareas se cumplen. 💜”  
\* Feedback de reconocimiento individual:  
  \* “Valeria, completaste 15 de 18 tareas esta semana — el 83% del esfuerzo total del hogar.”  
\* Feedback de asimetría:  
  \* “La distribución de tareas esta semana fue: Valeria 83%, Tomás 11%, Roberto 6%.”  
\* Feedback de tendencia:  
  \* “La distribución de tareas viene cambiando en las últimas 3 semanas...”  
\* Tono requerido:  
  \* neutral;  
  \* útil;  
  \* sin juicio;  
  \* factual;  
  \* cálido pero no efusivo;  
  \* sin adjetivos valorativos.

No encontrado:

\* loading.  
\* skeleton.  
\* spinner.  
\* toast explícito.  
\* retry.  
\* error técnico.  
\* estado de red.  
\* confirmación visual de guardado.  
\* disabled state.  
\* empty state específico para Planner.

**\---**

**\#\#\# 2.5 Service aislado**

No se encontró un service explícito ni nombres de funciones.

Pistas útiles para un service aislado de demo/local:

\* Debe listar tareas por estado visible:  
  \* pendiente;  
  \* en progreso;  
  \* completada;  
  \* cancelada;  
  \* vencida calculada.  
\* Debe exponer estado de tareas completadas/pendientes a Home.  
\* Debe exponer tareas vencidas a Atención Requerida.  
\* Debe exponer distribución de carga a CargaFamiliar si se simula.  
\* Debe listar eventos del Calendar.  
\* Debe exponer próximos eventos a Home.  
\* Debe poder completar una tarea.  
\* Debe poder modificar fecha de evento si se usa “postergar \= modificar fecha”.  
\* Debe respetar que Geni no completa tareas automáticamente.  
\* Debe respetar que Geni no reasigna tareas automáticamente.  
\* Debe respetar que Geni no cambia eventos sin confirmación humana.  
\* Debe tratar “vencida” como cálculo, no como estado persistido.  
\* Debe tratar Tasks y Calendar dentro del contexto del hogar activo, aunque el documento no define API.  
\* Puede simular escalamiento como datos locales/visuales, no notificaciones reales.

No encontrado:

\* Endpoints.  
\* Request/response.  
\* Nombre de service.  
\* Storage local.  
\* AsyncStorage.  
\* Tabla real.  
\* Contrato de sincronización.

**\---**

**\#\#\# 2.6 Navegación coherente**

Información encontrada:

\* Bottom Navigation V1:  
  \* Home;  
  \* People;  
  \* \`+\`;  
  \* Planner;  
  \* More.  
\* Planner tiene acceso directo desde Bottom Nav.  
\* Home puede navegar a Planner.  
\* Home puede navegar a Calendar.  
\* Calendar vive dentro de Planner.  
\* Goals vive dentro de Planner, pero queda POST\_MVP/no desarrollar.  
\* Responsabilidades no son dominio independiente; se tratan dentro de Tasks.  
\* Quick Actions es el botón \`+\` central en Bottom Nav.  
\* Geni tiene acceso principal vía Quick Actions, slot fijo siempre primero.  
\* SearchGlobal indexa Planner.  
\* Home es siempre la pantalla inicial; el usuario no puede cambiarlo.  
\* El modelo de navegación debe evitar más de 4 niveles.  
\* Objetivo: 95% de acciones en 3 niveles o menos.  
\* More no contiene dashboards; Planner no vive en More.

Dependencia externa / no desarrollar en este fragment:

\* People/Members aporta Persona para asignar tareas o participar en eventos.  
\* Household/Membership aporta hogar activo y separación por hogar.  
\* Home muestra resumen de Planner pero no administra.  
\* Quick Actions puede abrir acciones relacionadas con Planner, pero el documento no lista “crear tarea” o “crear evento” explícitamente.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

Información encontrada:

\* Task aparece en Home.  
\* El estado de tarea completada/pendiente actualiza widgets de tareas en Home.  
\* Tarea vencida va a Atención Requerida.  
\* Calendar alimenta ProximosEventos.  
\* Home navega a Planner.  
\* Home navega a Calendar.  
\* CargaFamiliar muestra distribución de carga de tareas.  
\* GeniPlanner analiza carga familiar para mostrarla en Home, pero esto queda DEMO PREMIUM/POST\_MVP, no IA real.  
\* Home resume, no administra.

Clasificación:

\* Próximos eventos: REAL MÍNIMO como salida de Calendar hacia Home.  
\* Tareas pendientes/vencidas: REAL MÍNIMO como salida de Tasks hacia Home.  
\* CargaFamiliar: DEMO PREMIUM / MOCK.  
\* Briefing con datos de Planner: DEMO PREMIUM / MOCK.  
\* ActividadFamiliar: no desarrollar en Planner.

**\#\#\#\# More**

Información encontrada:

\* Planner no vive en More.  
\* More contiene herramientas especializadas y no dashboards.  
\* Planner está en Bottom Nav como tab directo.

**\#\#\#\# Quick Actions**

Información encontrada:

\* QuickActions es botón \`+\` central en Bottom Nav.  
\* QuickActions tiene panel flotante.  
\* Geni es slot fijo.  
\* No se encontraron acciones explícitas de Planner dentro de Quick Actions en este documento.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

\* Planner como tab principal en Bottom Nav.  
\* Planner contiene Tasks y Calendar.  
\* Calendar contiene Events.  
\* Task como entidad visible del núcleo operativo.  
\* Event como entidad visible del calendario familiar.  
\* Las tareas del hogar son visibles para todos los miembros del hogar.  
\* El calendario familiar es visible para los miembros del hogar.  
\* No se puede ocultar una tarea pendiente/completada asignada dentro de la coordinación del hogar.  
\* No se puede ocultar un evento del calendario compartido si afecta coordinación familiar.  
\* Ver/listar tareas.  
\* Completar tarea.  
\* Ver tareas pendientes/completadas/canceladas/en progreso si se usan estados encontrados.  
\* Calcular tarea vencida, sin guardarla como estado.  
\* Ver calendario familiar.  
\* Ver próximos eventos.  
\* Editar fecha de evento para postergar, si se incluye edición mínima.  
\* Geni no completa tareas automáticamente.  
\* Geni no reasigna tareas automáticamente.  
\* Geni no cambia eventos sin confirmación humana.  
\* Home recibe estado de tareas completadas/pendientes.  
\* Home recibe tareas vencidas para Atención Requerida.  
\* Home recibe próximos eventos desde Calendar.  
\* Responsabilidad puede usarse como agrupador de Task si ya existe en otro fragment, pero no como módulo independiente.  
\* Persona/Membership como dependencia para asignación o participación, sin desarrollar People/Auth/Household.

**\#\#\# DEMO PREMIUM**

\* Visualización de distribución de carga familiar.  
\* Card de CargaFamiliar en Home con porcentajes/datos dummy.  
\* Escalamiento visual de tareas en 4 niveles.  
\* Mensajes de Geni sobre tareas como mock/local.  
\* Reconocimiento factual con tono cálido.  
\* Asimetría por porcentajes:  
  \* 83% / 11% / 6%;  
  \* 88% / 12%;  
  \* 57% / 43%.  
\* Tendencia de carga por semanas.  
\* Simular recordatorios privados y alertas como estados visuales, no push real.  
\* Simular sugerencia de responsable sin ejecutar reasignación automática.  
\* Simular ajuste de carga por disponibilidad, sin IA real.  
\* Simular tarjetas de próximas tareas/vencimientos para que Planner parezca vivo.  
\* Simular SearchGlobal indexando Planner si ya hay UI de búsqueda.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

Información que puede resolverse localmente o con service demo, sin backend real, porque el documento no trae contrato API:

\* Lista de tareas.  
\* Estados locales de tarea.  
\* Completar tarea.  
\* Vencimiento calculado.  
\* Métricas de distribución de tareas.  
\* Mensajes de feedback de tarea.  
\* Lista de eventos.  
\* Próximos eventos.  
\* Modificar fecha de evento localmente.  
\* Simular escalamiento por conteo local de incumplimientos.  
\* Simular carga familiar con datos de ejemplo del documento.  
\* Exponer resumen local a Home.

**\#\#\# POST\_MVP**

\* Escalamiento real de Geni en 4 niveles.  
\* Push/notificaciones reales.  
\* Detección real de patrones por IA.  
\* Equidad contextual dinámica automática.  
\* Sugerencia real de responsable por GeniPlanner.  
\* Reprogramación inteligente.  
\* Subtareas.  
\* Dependencias entre tareas.  
\* Comentarios en tareas.  
\* Adjuntos/evidencia en tareas.  
\* Timeline de tareas.  
\* Auditoría completa.  
\* Recurrencia avanzada.  
\* Goals/Hitos dentro de Planner.  
\* Participantes avanzados de Event.  
\* Álbum automático desde evento finalizado.  
\* Integraciones donde otros dominios generan tareas.  
\* Multi-hogar avanzado como selector/contexto visible si no está resuelto por Auth/Household.

**\#\#\# IGNORAR**

\* No desarrollar otros dominios desde este fragment.  
\* No desarrollar IA real.  
\* No desarrollar automatizaciones reales.  
\* No desarrollar notificaciones reales.  
\* No desarrollar auditoría completa.  
\* No desarrollar módulos externos que puedan generar tareas.  
\* No desarrollar storage/OCR/archivos desde Planner.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner tab | Entrada principal al núcleo Planner | Abrir Planner | No especificado | Bottom Nav: Home / People / \+ / Planner / More | REAL MÍNIMO |  
| Tasks dentro de Planner | Tareas del hogar, responsable, cumplimiento/incumplimiento, distribución | Ver/listar, completar, posiblemente crear/reasignar si rol lo permite | Pendiente, En progreso, Completada, Cancelada, vencida calculada | Desde Planner; Home puede conducir a tareas | REAL MÍNIMO |  
| Calendar dentro de Planner | Calendario familiar, compromisos compartidos, eventos | Ver eventos; modificar fecha si se posterga | Programado, Completado, Cancelado | Desde Planner; Home puede conducir a Calendar | REAL MÍNIMO |  
| Dashboard de distribución de tareas | Distribución semanal/mensual de carga | Consultar datos | Datos siempre visibles; alertas solo por umbral | Planner o Home/CargaFamiliar | DEMO PREMIUM |  
| Card de tarea vencida / Atención Requerida | Tarea crítica o vencida | Abrir detalle de tarea; completar si se permite | Vencida calculada; urgente | Home → Planner/Task | REAL MÍNIMO / DEMO PREMIUM |  
| CargaFamiliar | Porcentajes y conteo de tareas por persona | Ver distribución | Asimetría visible; alerta si supera umbral | Home → Planner | DEMO PREMIUM / MOCK |  
| ProximosEventos | Eventos próximos del calendario | Abrir calendario/evento | Próximo / programado | Home → Calendar/Planner | REAL MÍNIMO |  
| Quick Actions panel | Panel flotante desde \`+\`; Geni slot fijo | No se encontraron acciones específicas de Planner | No especificado | Bottom Nav centro | DEMO PREMIUM si se usa para Planner |  
| SearchGlobal | Búsqueda universal indexando Planner | Buscar/ejecutar acciones | No especificado | Acceso global no detallado | POST\_MVP / DEMO PREMIUM |  
| Vista día/semana/mes | No encontrada en este documento | No encontrado | No encontrado | No encontrado | Información faltante |  
| Crear/Edit Task UI | No encontrada en este documento | No encontrado | No encontrado | No encontrado | Información faltante |  
| Crear/Edit Event UI | No encontrada en este documento | No encontrado | No encontrado | No encontrado | Información faltante |  
| Empty state Planner | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| Valeria | Planner / Tasks | Miembro demo para distribución de carga | Documento principal, Polaridad 2/3/5 | DEMO PREMIUM |  
| Tomás | Planner / Tasks | Responsable demo para tarea vencida/incumplida | Documento principal, Polaridad 2/5/7 | DEMO PREMIUM |  
| Roberto | Planner / Tasks | Miembro demo para distribución de carga | Documento principal, Polaridad 2/5 | DEMO PREMIUM |  
| Familia García | Planner / Home | Hogar demo para métricas semanales | Documento principal, Polaridad 3/5 | DEMO PREMIUM |  
| lavar los platos | Tasks | Tarea demo vencida / recordatorio | Documento principal, Polaridad 2 | DEMO PREMIUM |  
| sacar la basura | Tasks | Tarea demo leve con recordatorio/escalamiento | Documento principal, Polaridad 7 | DEMO PREMIUM |  
| 18 tareas semanales | Tasks / CargaFamiliar | Métrica semanal | Documento principal, Polaridad 3/5 | DEMO PREMIUM |  
| Valeria 15 tareas, Tomás 2, Roberto 1 | Tasks / CargaFamiliar | Distribución de carga | Documento principal, Polaridad 2/3 | DEMO PREMIUM |  
| Valeria 83%, Tomás 11%, Roberto 6% | Tasks / CargaFamiliar | Distribución porcentual | Documento principal, Polaridad 3 | DEMO PREMIUM |  
| Valeria 88%, Tomás 12% | Tasks / CargaFamiliar | Asimetría grave | Documento principal, Polaridad 4 | DEMO PREMIUM |  
| Valeria 57%, Tomás 43% | Tasks / CargaFamiliar | Asimetría menor sin alerta | Documento principal, Polaridad 4 | DEMO PREMIUM |  
| Semana 1: 60-40; Semana 2: 65-35; Semana 3: 70-30 | Tasks / CargaFamiliar | Tendencia de carga | Documento principal, Polaridad 4 | DEMO PREMIUM |  
| Umbral de asimetría \> 40% | Tasks / Alerts | Activar alerta demo | Documento principal, Polaridad 4 | DEMO PREMIUM / POST\_MVP |  
| Deuda interna \> 30 días | No Planner | No usar para Planner salvo patrón de umbrales visuales | Documento principal, Polaridad 4 | Dependencia externa / no desarrollar |  
| Tarea crítica vencida | Tasks / Atención Requerida | Card urgente | Documento principal, Polaridad 4 | REAL MÍNIMO / DEMO PREMIUM |  
| 3+ semanas consecutivas | Tasks / Escalamiento | Patrón confirmado | Documento principal, Polaridad 4/7 | DEMO PREMIUM / POST\_MVP |  
| 1-2hs / 3-4hs / 5+hs | Tasks / Disponibilidad | Filtros o chips demo de disponibilidad | Documento principal, Polaridad 5 | DEMO PREMIUM / POST\_MVP |  
| Valeria trabaja 10hs \+ estudia | Tasks | Contexto de carga | Documento principal, Polaridad 5 | DEMO PREMIUM / POST\_MVP |  
| Tomás trabajo híbrido 6hs | Tasks | Contexto de carga | Documento principal, Polaridad 5 | DEMO PREMIUM / POST\_MVP |  
| Roberto jubilado en casa | Tasks | Contexto de carga | Documento principal, Polaridad 5 | DEMO PREMIUM / POST\_MVP |  
| Época de exámenes hasta el 15 de junio | Tasks | Ajuste de carga visual | Documento principal, Polaridad 5 | DEMO PREMIUM / POST\_MVP |  
| Pendiente | Task | Estado encontrado | Archivo de comprensión, OUTPUT 1/5 | REAL MÍNIMO |  
| En progreso | Task | Estado encontrado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| Completada | Task | Estado encontrado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| Cancelada | Task | Estado encontrado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| Programado | Event | Estado encontrado | Archivo de comprensión, OUTPUT 1/5 | REAL MÍNIMO |  
| Completado | Event | Estado encontrado | Archivo de comprensión, OUTPUT 1/5 | REAL MÍNIMO |  
| Cancelado | Event | Estado encontrado | Archivo de comprensión, OUTPUT 1/5 | REAL MÍNIMO |  
| Plantilla | Tasks | Feature de Task; no hay templates concretas | Archivo de comprensión, OUTPUT 1/6 | REAL MÍNIMO parcial / faltante |  
| Verificacion | Tasks | Feature opcional contradictoria | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO parcial / riesgo |

Datos faltantes sin inventar:

\* No se encontraron títulos de eventos.  
\* No se encontraron fechas/horas concretas de eventos.  
\* No se encontraron templates predefinidas exactas: Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos.  
\* No se encontraron prioridades concretas de tarea.  
\* No se encontraron categorías concretas de tareas salvo ejemplos de tareas domésticas.  
\* No se encontraron datos para vista día/semana/mes.  
\* No se encontraron estados vacíos de Planner.

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Ver tareas del hogar | Miembros del hogar | Todos ven quién hizo qué, quién no cumplió y carga distribuida | REAL MÍNIMO | Documento principal, Polaridad 1 |  
| Completar tarea | Responsable / miembro asignado | Tarea pasa a completada; Home puede actualizar widgets | REAL MÍNIMO | Documento principal, Polaridad 2; comprensión OUTPUT 4 |  
| Ver tarea vencida | Miembros / responsable / Home | Tarea vencida visible; puede aparecer en Atención Requerida | REAL MÍNIMO | Documento principal, Polaridad 4; comprensión OUTPUT 4 |  
| Recordar tarea antes de vencer | Geni mock / sistema visual | Mensaje privado al responsable | DEMO PREMIUM / POST\_MVP | Documento principal, Polaridad 2 |  
| Alertar tarea vencida | Geni mock / sistema visual | Mensaje privado al responsable | DEMO PREMIUM / POST\_MVP | Documento principal, Polaridad 2 |  
| Escalar al coordinador | Geni mock / sistema visual | Coordinador ve incumplimiento y opciones | DEMO PREMIUM / POST\_MVP | Documento principal, Polaridad 2 |  
| Exponer patrón a familia | Geni mock / sistema visual | Toda la familia ve patrón de incumplimiento | DEMO PREMIUM / POST\_MVP | Documento principal, Polaridad 2 |  
| Crear/reasignar tareas | Adulto | Adulto puede crear/reasignar tareas | REAL MÍNIMO parcial, permisos incompletos | Archivo de comprensión, OUTPUT 1/roles |  
| Sugerir responsable | GeniPlanner | Sugerencia de asignación óptima sin ejecución automática | DEMO PREMIUM / POST\_MVP | Archivo de comprensión, OUTPUT 4 |  
| Reasignar automáticamente tarea | Geni | Prohibido; no debe ocurrir | Restricción REAL | Documento principal, Polaridad 2 |  
| Completar automáticamente tarea | Geni | Prohibido; no debe ocurrir | Restricción REAL | Documento principal, Polaridad 2 |  
| Ver calendario familiar | Miembros del hogar | Compromisos compartidos visibles | REAL MÍNIMO | Documento principal, Polaridad 1/6 |  
| Crear evento familiar | Adolescente | Evento familiar creado | REAL MÍNIMO parcial, permisos incompletos | Archivo de comprensión, OUTPUT 1/roles |  
| Cambiar evento sin confirmación humana | Geni | Prohibido; no debe ocurrir | Restricción REAL | Documento principal, Polaridad 2 |  
| Postergar evento | Usuario autorizado no especificado | Se modifica la fecha; no existe estado Postergado | REAL MÍNIMO parcial | Archivo de comprensión, OUTPUT 5/source map |  
| Ver próximos eventos | Miembro / Home | Home muestra ProximosEventos | REAL MÍNIMO | Archivo de comprensión, OUTPUT 1/2/4 |  
| Actualizar disponibilidad | Miembro | Geni ajusta carga esperada según disponibilidad | POST\_MVP / DEMO PREMIUM | Documento principal, Polaridad 5 |  
| Completar tareas asignadas | Empleado Familiar | Marca tarea asignada como completada | POST\_MVP / dependencia externa | Documento principal, Ejemplo B |  
| Comentar tarea | Empleado Familiar | Agrega comentario | POST\_MVP | Documento principal, Ejemplo B |  
| Adjuntar evidencia | Empleado Familiar | Agrega evidencia | POST\_MVP | Documento principal, Ejemplo B |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Home puede mostrar estado de tareas completadas/pendientes.  
\* Home puede mostrar tareas vencidas en Atención Requerida.  
\* Home puede mostrar próximos eventos del calendario.  
\* Home puede mostrar CargaFamiliar como distribución de carga de tareas.  
\* Home navega a Planner.  
\* Home navega a Calendar.  
\* Home resume Planner; no administra Planner.  
\* La card/widget CargaFamiliar debe tratarse como DEMO PREMIUM / MOCK si se usa sin IA real.  
\* Briefing puede incluir frases basadas en tareas/eventos como DEMO PREMIUM / MOCK, sin IA real.

**\#\#\# More**

\* Planner no vive en More.  
\* More no contiene dashboards.  
\* Planner tiene acceso directo desde Bottom Nav.

**\#\#\# Quick Actions**

\* Quick Actions existe como botón \`+\` central.  
\* Quick Actions abre panel flotante.  
\* Geni es slot fijo en Quick Actions.  
\* No se encontraron acciones explícitas de Planner dentro de Quick Actions.  
\* Si se usa Quick Actions para Planner en demo, debe marcarse como DEMO PREMIUM o venir de otro documento.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Listar tareas | No especificado | No especificado | No especificado | No especificado | Acción/módulo mencionado sin contrato API | REAL MÍNIMO parcial |  
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO parcial |  
| Crear tarea | No especificado | No especificado | No especificado | No especificado | Permiso mencionado para Adulto, sin contrato API | REAL MÍNIMO parcial |  
| Reasignar tarea | No especificado | No especificado | No especificado | No especificado | Permiso mencionado para Adulto; Geni no puede hacerlo automáticamente | REAL MÍNIMO parcial |  
| Listar eventos | No especificado | No especificado | No especificado | No especificado | Calendar/Event mencionados sin contrato API | REAL MÍNIMO parcial |  
| Crear evento | No especificado | No especificado | No especificado | No especificado | Permiso mencionado para Adolescente, sin contrato API | REAL MÍNIMO parcial |  
| Editar evento / modificar fecha | No especificado | No especificado | No especificado | No especificado | Postergar \= modificar fecha; sin contrato API | REAL MÍNIMO parcial |  
| Eliminar/cancelar evento | No especificado | No especificado | No especificado | No especificado | Estado Cancelado encontrado; sin contrato API | REAL MÍNIMO parcial |  
| Exponer tareas a Home | No especificado | No especificado | No especificado | No especificado | Data flow encontrado | REAL MÍNIMO parcial |  
| Exponer próximos eventos a Home | No especificado | No especificado | No especificado | No especificado | Data flow encontrado | REAL MÍNIMO parcial |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Planner | contiene | no especificado | Task, Calendar, Goal | Agrupar Tasks y Calendar dentro de Planner | REAL MÍNIMO |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badges/listas/filtros de tarea | REAL MÍNIMO con riesgo |  
| Task | responsable | no especificado | Persona/miembro asignado | Mostrar asignación y recordatorios | REAL MÍNIMO |  
| Task | vencimiento | no especificado | Por vencer / vencida calculada | Próximos vencimientos, Atención Requerida | REAL MÍNIMO |  
| Task | completada/pendiente | no especificado | completada, pendiente | Actualizar Home y widgets | REAL MÍNIMO |  
| Task | crítica | no especificado | tarea crítica | Alertas/Atención Requerida | DEMO PREMIUM / REAL parcial |  
| Task | responsabilidad principal | no especificado | única Responsabilidad principal | Agrupación interna de tareas | REAL parcial / POST\_MVP según alcance |  
| Task | subtareas | no especificado | un único nivel; no anidadas | Progreso automático si se implementara | POST\_MVP |  
| Task | dependencias | no especificado | bloqueada si previa no se completa | Estado bloqueado | POST\_MVP |  
| Task | recurrencia | no especificado | genera nuevas instancias, preserva historial | Tareas recurrentes | POST\_MVP en este documento |  
| Task | verificación | no especificado | opcional; “Completada \= estado final” según comprensión | Verification flow, contradictorio con MVP esperado | REAL parcial / riesgo |  
| Task | comentarios | no especificado | comentario en tareas | Comentarios visuales | POST\_MVP |  
| Task | adjuntos/evidencia | no especificado | imágenes, PDFs, audio | Adjuntar evidencia | POST\_MVP |  
| Task | timeline | no especificado | línea temporal de actividad | Historial visual | POST\_MVP |  
| Plantilla | aplica a | no especificado | Task | Templates de tareas | REAL parcial, faltan templates exactas |  
| Responsabilidad | miembros asignados | no especificado | no especificado | Agrupar tareas / responsables | POST\_MVP o REAL parcial si se usa como atributo |  
| Calendar | contiene | no especificado | Event | Vista de calendario | REAL MÍNIMO |  
| Event | estado | no especificado | Programado, Completado, Cancelado | Badges/estado de evento | REAL MÍNIMO |  
| Event | fecha | no especificado | modificar fecha equivale a postergar | Editar/postergar evento | REAL MÍNIMO parcial |  
| Event | participantes | no especificado | Persona | Participación en evento | POST\_MVP si es avanzado |  
| ProximosEventos | origen | no especificado | Calendar/Event | Widget Home | REAL MÍNIMO |  
| CargaFamiliar | distribución | no especificado | porcentajes / conteo de tareas | Widget Home / dashboard demo | DEMO PREMIUM / MOCK |  
| Persona | disponibilidad | no especificado | 1-2hs, 3-4hs, 5+hs | Ajuste de carga demo | POST\_MVP / DEMO PREMIUM |  
| Persona | carga externa | no especificado | exámenes, proyecto laboral, cuidado de alguien | Ajuste contextual demo | POST\_MVP / DEMO PREMIUM |  
| Persona | capacidad física/mental | no especificado | limitaciones físicas/salud | Ajuste contextual demo | POST\_MVP / DEMO PREMIUM |

Notas de conflicto:

\* Los estados encontrados para Task no coinciden con los estados MVP esperados en otros prompts: \`pending\`, \`completed\`, \`awaiting\_verification\`, \`verified\`.  
\* Este documento no provee traducción técnica entre estados en español y enum final.  
\* Este documento dice que \`vencida\` no es estado; debe calcularse.  
\* Este documento indica \`Completada \= estado final\` para Verificacion, lo cual contradice un flujo con \`awaiting\_verification\` y \`verified\`.

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Tarea vencida | No es estado persistido; se calcula automáticamente | Archivo de comprensión, OUTPUT 5 / source\_map | REAL MÍNIMO |  
| Evento postergado | No existe estado Postergado; postergar equivale a modificar fecha | Archivo de comprensión / source\_map | REAL MÍNIMO parcial |  
| Geni quiere reasignar tarea | No puede reasignar automáticamente | Documento principal, Polaridad 2 | Restricción REAL |  
| Geni quiere completar tarea | No puede completar automáticamente | Documento principal, Polaridad 2 | Restricción REAL |  
| Geni quiere cambiar evento | No puede cambiar eventos del calendario sin confirmación humana | Documento principal, Polaridad 2 | Restricción REAL |  
| Primer olvido de tarea menor | Recordatorio privado al responsable | Documento principal, Polaridad 2/7 | DEMO PREMIUM / POST\_MVP |  
| Tarea vencida por primera falta | Alerta privada al responsable | Documento principal, Polaridad 2 | DEMO PREMIUM / POST\_MVP |  
| Segunda falta o patrón emergente | Alerta al coordinador; responsable sabe que fue alertado | Documento principal, Polaridad 2 | DEMO PREMIUM / POST\_MVP |  
| Tercera falta o patrón confirmado | Exposición del patrón a toda la familia | Documento principal, Polaridad 2/7 | DEMO PREMIUM / POST\_MVP |  
| Asimetría menor 57/43 | Datos visibles, sin alerta push | Documento principal, Polaridad 4 | DEMO PREMIUM |  
| Asimetría grave 88/12 | Datos visibles y alerta activa | Documento principal, Polaridad 4 | DEMO PREMIUM |  
| Patrón de 3 semanas | Alerta por tendencia creciente | Documento principal, Polaridad 4/7 | DEMO PREMIUM / POST\_MVP |  
| Usuario declara baja disponibilidad pero no cumple mínimos | Geni detecta patrón y alerta al coordinador | Documento principal, Polaridad 5 | POST\_MVP / DEMO PREMIUM |  
| Familia intenta usar solo calendario | No permitido; Tasks \+ Calendar son núcleo obligatorio | Documento principal, Polaridad 6 | Restricción REAL |  
| Usuario intenta ocultar tarea asignada | No permitido en coordinación del hogar | Documento principal, Polaridad 1 | Restricción REAL |  
| Usuario intenta ocultar evento compartido | No permitido si pertenece al calendario familiar | Documento principal, Polaridad 1 | Restricción REAL |  
| Sin tareas | No se encontró empty state específico | No encontrado | Información faltante |  
| Sin eventos | No se encontró empty state específico | No encontrado | Información faltante |  
| Error de permisos | No se encontró error específico | No encontrado | Información faltante |  
| Error de red | No se encontró | No encontrado | Información faltante |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* HomePlus no es una app de productividad neutra.  
\* Planner no debe ocultar asimetrías de tareas.  
\* Las tareas del hogar son transparencia forzada.  
\* El calendario familiar es transparencia forzada.  
\* Nadie puede ocultar sus tareas completadas o pendientes dentro del hogar.  
\* Nadie puede ocultar un evento del calendario compartido.  
\* El núcleo inicial incluye Calendario familiar y Tareas del hogar.  
\* No se puede adoptar solo el calendario y desactivar tareas.  
\* Geni no reasigna tareas automáticamente.  
\* Geni no completa tareas automáticamente.  
\* Geni no cambia eventos sin confirmación humana.  
\* Geni no toma decisiones operativas del hogar en nombre de la familia.  
\* Geni debe presentar datos con números, contexto y tono, sin acusar.  
\* Geni no usa adjetivos valorativos como “increíble”, “extraordinario”, “terrible”, “mal”.  
\* Geni no debe usar 3+ emojis ni emojis genéricos de celebración.  
\* Datos de coordinación siempre visibles; alertas activas solo al cruzar umbrales.  
\* Vencida no es un estado de tarea; se calcula automáticamente.  
\* Una tarea tiene una única Responsabilidad principal.  
\* Responsabilidades no son dominio independiente.  
\* No existen subtareas anidadas; si se implementaran, solo un nivel, pero queda POST\_MVP para esta entrega.  
\* Recurrencias generan nuevas instancias y preservan historial; en este documento queda POST\_MVP porque no se define recurrencia simple MVP.  
\* Calendar vive dentro de Planner.  
\* Goals vive dentro de Planner, pero no desarrollar para este fragment.  
\* Home resume Planner, no administra Planner.  
\* Planner tiene acceso directo desde Bottom Nav; no vive en More.  
\* No más de 4 niveles de navegación.  
\* Objetivo: 95% de acciones en 3 niveles o menos.  
\* Mobile First.  
\* Cada hogar tiene su propio Planner; los datos no se cruzan entre hogares. Esto es dependencia de Household/Auth, no desarrollar acá.  
\* Empleado Familiar tiene permisos operativos sobre tareas asignadas, pero queda fuera de MVP de este fragment salvo como dependencia externa/no desarrollar.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| No hay pantalla explícita de Planner | Codex no tiene layout final para construir pantalla completa | Necesita merge con diseño/UX de otro documento |  
| No hay Task List UI explícita | Falta estructura de lista, filtros, tabs, empty state | Puede hacerse demo solo con patrones generales, pero no desde este documento |  
| No hay Create Task UI | Crear tarea es acción MVP, pero no hay formulario/campos | No se deben inventar campos en este fragment |  
| No hay Edit Task UI | Editar tarea aparece en objetivo MVP, pero no en documento | Queda pendiente de otros documentos |  
| No hay Delete Task UI | Eliminar tarea aparece en objetivo MVP, pero no en documento | Queda pendiente de otros documentos |  
| No hay prioridades de tarea | MVP pide prioridad, pero el documento no define valores | No inventar prioridades |  
| No hay templates predefinidas exactas | MVP pide Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos | Este documento solo menciona Plantilla de Tasks sin detalle |  
| Verification Flow contradictorio | MVP espera awaiting\_verification/verified; comprensión dice Completada \= estado final | Requiere resolución en merge posterior |  
| Estados Task no coinciden con MVP esperado | Documento trae Pendiente/En progreso/Completada/Cancelada | No mapear automáticamente sin decisión de merge |  
| No hay Event Create/Edit UI | MVP pide crear/editar evento, pero documento no define formulario | Pendiente de otro documento |  
| No hay Event Delete UI | MVP pide eliminar evento, pero documento solo trae Cancelado | Pendiente de otro documento |  
| No hay campos de Event | Falta título, fecha, hora, ubicación, descripción, etc. | No inventar payload ni UI |  
| No hay vista día/semana/mes | MVP la pide, pero documento no la menciona | Pendiente de otro documento |  
| No hay tareas con fecha dentro del calendario | MVP lo pide, pero este documento no lo explicita | Pendiente de otro documento |  
| No hay recurrencia simple none/daily/weekly/monthly | Documento menciona recurrencia solo como concepto y reglas de instancia | Pendiente de otro documento |  
| No hay endpoints | No se puede derivar API real | Usar service local/mock si se hace demo desde este fragment |  
| No hay requests/responses | Falta contrato para backend | No inventar |  
| No hay errores técnicos | Faltan estados de error/loading/retry | Codex necesitará defaults desde otra fuente o etapa posterior |  
| No hay permisos completos por rol | Solo aparecen Adulto, Adolescente y Empleado Familiar con algunas acciones | No construir matriz completa desde este documento |  
| No hay criterios de empty state | Falta qué mostrar sin tareas/eventos | Pendiente |  
| No hay criterios visuales para tabs/filtros | Faltan labels concretos | Pendiente |  
| No hay service contract | Falta nombre de servicio, funciones y storage | Puede simularse pero no como contrato final |  
| No hay relación técnica con hogar activo | El documento dice cada hogar tiene Planner propio, pero no define implementación | Depende de Auth/Household |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Documento principal**

\* Archivo: \`HomePlus — SECCION 3 FILOSOFIA.md\`  
\* Secciones usadas:  
  \* \`DEFINICIÓN DE SISTEMA\`  
  \* \`POSTURA FUNDACIONAL\`  
  \* \`POLARIDADES RESUELTAS\`  
  \* \`1. AUTONOMÍA INDIVIDUAL vs COHESIÓN GRUPAL\`  
  \* \`2. EFICIENCIA vs PROCESO HUMANO\`  
  \* \`3. RECONOCIMIENTO EMPÁTICO vs NEUTRALIDAD DE DATOS\`  
  \* \`4. PREVENCIÓN DE CONFLICTOS vs EXPOSICIÓN DE CONFLICTOS\`  
  \* \`5. OPTIMIZACIÓN DE TAREAS vs RESPETO AL CONTEXTO HUMANO\`  
  \* \`6. ADOPCIÓN GRADUAL vs COMPROMISO TOTAL\`  
  \* \`7. INTERVENCIÓN TEMPRANA vs RESPETO AL RITMO FAMILIAR\`  
  \* \`A. Multi-hogar real\`  
  \* \`B. Empleado Familiar: la coordinación no requiere parentesco\`  
  \* \`CONSECUENCIAS SISTÉMICAS\`  
  \* \`LO QUE HomePlus NO ES\`  
  \* \`DECISIONES FILOSÓFICAS TOMADAS\`

**\#\#\# Archivo de comprensión asociado**

\* Archivo: \`Seccion 3 Filosofia.txt\`  
\* Secciones usadas:  
  \* \`OUTPUT 1 — ENTITIES\`  
  \* \`OUTPUT 2 — RELATIONSHIPS\`  
  \* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`  
  \* \`OUTPUT 4 — DATA FLOWS\`  
  \* \`OUTPUT 5 — BUSINESS RULES\`  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
  \* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`  
  \* \`OUTPUT 8 — GRAPH EDGES\`

**\#\#\# Source map usado**

\* Archivo: \`source\_map\_HomePlus\_SECCION\_3\_FILOSOFIA.md\`  
\* Secciones usadas:  
  \* \`4.7 PLANNER\`  
  \* \`4.8 TASKS\`  
  \* \`4.9 EVENTS\`  
  \* \`4.10 CALENDAR\`  
  \* \`4.11 HOME\`  
  \* \`5. Mapa de entidades\`  
  \* \`6. Mapa de relaciones\`  
  \* \`7. Mapa de estados\`  
  \* \`8. Mapa de permisos\`  
  \* \`9. Mapa de flujos\`  
  \* \`10. Mapa de APIs\`  
  \* \`11. Mapa de UI\`  
  \* \`13. Restricciones arquitectónicas detectadas\`  
  \* \`17. Contradicciones detectadas\`  
  \* \`18. Información faltante\`

**\# PLANNER fragment — HomePlus — SECCIÓN 4 EMOTIONAL DESING**

\> Fragment crudo de implementación visual/interactiva.    
\> Alcance estricto: módulo **\*\*PLANNER\*\*** únicamente.    
\> Fuente única: \`HomePlus — SECCION 4 EMOTIONAL DESING.md\`, \`Seccion 4 Emotional Design.txt\` y \`source\_map\_HomePlus\_SECCION\_4\_EMOTIONAL\_DESING.md\` generado para este mismo documento.    
\> No es spec final. No contiene implementación. No fusiona con otros documentos.

**\---**

**\#\# 1\. Rol del módulo en la demo**

**\#\#\# Información explícita encontrada**

\* Planner aparece en el archivo de comprensión como módulo del dominio \`planner\`.  
\* Planner se describe como **\*\*núcleo operativo\*\***.  
\* Planner administra:  
  \* Tasks.  
  \* Calendar.  
  \* Goals.  
  \* Responsabilidades.  
\* Para este fragment, \`Goals\` queda fuera de desarrollo por alcance del prompt.  
\* El documento principal no define Planner como pantalla, pero sí define cómo deben sentirse y comportarse emocionalmente las tareas, el calendario y la carga de coordinación.  
\* El sistema debe reducir la carga cognitiva del coordinador: las cosas pasan sin que nadie tenga que sostenerlas en la cabeza.  
\* El sistema recuerda, organiza y anticipa.  
\* Cada miembro debe saber:  
  \* qué le toca;  
  \* qué hizo el resto;  
  \* cuál es el estado del hogar.  
\* Las tareas deben tener:  
  \* responsable visible;  
  \* estado claro.  
\* El sistema debe mostrar datos con contexto.  
\* El sistema debe dar información, no órdenes.  
\* El sistema debe evitar generar:  
  \* culpa acumulada;  
  \* presión social;  
  \* ansiedad por notificaciones;  
  \* sensación de juicio;  
  \* sensación de denuncia.

**\#\#\# Valor visible para demo**

\* El Planner puede mostrar coordinación operativa del hogar a través de tareas, responsables, estados, eventos y calendario.  
\* El valor visible más claro extraído de este documento es: **\*\*claridad operativa sin sobrecarga emocional\*\***.  
\* El usuario debe poder ver tareas asignadas, estados y eventos sin sentir que la app lo acusa o lo presiona.

**\#\#\# Dependencias externas / no desarrollar en este fragment**

\* Home resume información de Planner mediante widgets o cards.  
\* People/Members aporta personas responsables o participantes.  
\* Geni puede intervenir sobre incumplimientos, pero Geni real queda fuera del fragment.  
\* Notificaciones afectan tareas/eventos, pero push real queda fuera del fragment.  
\* Se menciona información social de logros, pero no debe desarrollarse en este fragment.  
\* Inventory/Assets/Automations pueden generar tareas según el archivo de comprensión, pero no deben desarrollarse desde este fragment.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Elementos visuales explícitos o claramente presentes**

\* Planner está en Bottom Navigation.  
\* Bottom Navigation contiene:  
  \* Home;  
  \* People;  
  \* QuickActions;  
  \* Planner;  
  \* More.  
\* Calendar existe como feature dentro de Planner.  
\* Task existe como entidad dentro de Planner.  
\* Event existe como entidad dentro de Calendar.  
\* Responsibility existe como área operativa del hogar que agrupa tareas.  
\* Home contiene widgets relacionados con Planner:  
  \* \`Widget\_UpcomingEvents\`.  
  \* \`Widget\_TasksByResponsibility\`.  
\* Las tareas tienen responsable visible.  
\* Las tareas tienen estado claro.  
\* La información debe presentarse con contexto.  
\* La interfaz no debe reflejar complejidad interna.  
\* El Home nunca debe sentirse abrumador.  
\* Más de 4 niveles de navegación es considerado fallo; objetivo: 95% de acciones en 3 niveles o menos.

**\#\#\#\# Elementos visuales mencionados sin estructura completa**

\* No se describe pantalla concreta de Planner.  
\* No se describen tabs de Planner.  
\* No se describen headers.  
\* No se describen cards de Task.  
\* No se describen formularios de creación/edición.  
\* No se describen filtros.  
\* No se describen vista día/semana/mes del calendario.  
\* No se describen estados visuales de loading, error o skeleton.

**\#\#\#\# Señales útiles para UI demo sin inventar arquitectura**

\* La demo puede priorizar claridad visual:  
  \* tarea;  
  \* responsable;  
  \* estado;  
  \* agrupación por responsabilidad;  
  \* eventos próximos;  
  \* calendario simple;  
  \* acceso desde Bottom Navigation.  
\* El documento no da layout final, por lo que cualquier layout debe quedar para etapa posterior.

**\---**

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Datos explícitos encontrados**

\* Áreas/responsabilidades de ejemplo:  
  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
\* Contextos de carga elevada mencionados:  
  \* semana de exámenes;  
  \* día laboral cargado;  
  \* evento familiar significativo.  
\* Ejemplo textual de rendimiento presentado por Geni:  
  \* “Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10.”  
\* Ejemplo de mensaje ante tareas sin resolver:  
  \* “Hay tareas sin resolver desde hace una semana. Puede ser un buen momento para hablar.”  
\* Ejemplo de consulta operativa de trabajo asignado:  
  \* “¿Qué tareas tengo hoy?”  
\* Entidades de datos extraídas del archivo de comprensión:  
  \* Task.  
  \* TaskTemplate.  
  \* TaskComment.  
  \* TaskAttachment.  
  \* TaskDependency.  
  \* TaskRecurrence.  
  \* TaskVerification.  
  \* Responsibility.  
  \* Calendar.  
  \* Event.  
  \* Streak.  
  \* ReducedLoadMode.  
  \* GeniEscalation.  
\* Estados de Task detectados en archivo de comprensión:  
  \* Pendiente.  
  \* En progreso.  
  \* Completada.  
  \* Cancelada.  
\* Regla detectada:  
  \* Vencida no es un estado de tarea; se calcula automáticamente.  
\* Estados de Event detectados en archivo de comprensión:  
  \* Programado.  
  \* Completado.  
  \* Cancelado.

**\#\#\#\# Datos faltantes para demo**

\* No hay nombres de tareas concretas.  
\* No hay nombres de eventos concretos.  
\* No hay fechas concretas.  
\* No hay prioridades concretas.  
\* No hay nombres de miembros.  
\* No hay avatares.  
\* No hay labels de filtros.  
\* No hay textos de empty state.  
\* No hay microcopy de botones.

**\---**

**\#\#\# 2.3 Acción interactiva**

**\#\#\#\# Acciones encontradas**

| Acción | Evidencia encontrada | Clasificación |  
| \------ | \-------------------- | \------------- |  
| Ver tareas asignadas | El documento menciona tareas asignadas y responsable visible. | REAL MÍNIMO / DEMO PREMIUM |  
| Ver estado de tareas | El documento dice que las tareas tienen estado claro. | REAL MÍNIMO / DEMO PREMIUM |  
| Ver tareas completadas | Memoria histórica registra tareas completadas. | POST\_MVP si es historial; DEMO PREMIUM si es estado visible simple |  
| Ver tareas de hoy | Aparece como consulta operativa: “¿Qué tareas tengo hoy?”. | DEMO PREMIUM |  
| Completar tarea | Aparece como tarea completada y rendimiento por tareas completadas. | REAL MÍNIMO si la acción existe en MVP; este documento solo la menciona indirectamente |  
| Asignar tarea compensatoria | Día 2 de escalada de Geni asigna tarea de compensación menor. | POST\_MVP |  
| Declarar modo carga reducida | Cualquier miembro puede declarar período más liviano. | POST\_MVP |  
| Aprobar carga reducida | Coordinador responde aprobar o proponer conversación. | POST\_MVP |  
| Proponer conversación | Opción del coordinador ante carga reducida. | POST\_MVP |  
| Ver historial de rendimiento | Miembro ve propio historial; coordinador puede ver historial de todos. | POST\_MVP |  
| Ver calendario como contexto de carga | Carga reducida se detecta por calendario. | POST\_MVP / DEMO PREMIUM si solo se visualiza calendario |  
| Ver eventos | Calendar contiene Event; Home contiene Upcoming Events. | REAL MÍNIMO / DEMO PREMIUM |

**\#\#\#\# Acciones no encontradas explícitamente**

\* Crear tarea.  
\* Editar tarea.  
\* Eliminar tarea.  
\* Crear evento.  
\* Editar evento.  
\* Cancelar evento.  
\* Crear plantilla.  
\* Elegir prioridad.  
\* Filtrar tareas.  
\* Buscar tareas.  
\* Cambiar vista día/semana/mes.  
\* Arrastrar eventos.  
\* Ver detalle de evento.  
\* Ver detalle de tarea.

**\---**

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Feedback / UX explícito o derivado directamente del documento**

\* Las tareas deben tener estado claro.  
\* Los datos deben presentarse con contexto.  
\* Geni no debe usar etiquetas evaluativas.  
\* El sistema debe evitar juicio, denuncia o humillación pública.  
\* Las faltas no deben exponerse públicamente.  
\* El sistema no debe notificar dos veces lo mismo.  
\* Las alertas de bajo impacto se agrupan en resúmenes.  
\* Ante incumplimientos, la secuencia de Geni da tiempo al miembro antes de involucrar al coordinador.  
\* Modo carga reducida:  
  \* si se aprueba: carga reducida o pausada sin penalización en racha;  
  \* si el coordinador propone conversación: el flujo normal continúa hasta que haya acuerdo.

**\#\#\#\# Feedback útil para demo, sin asumir implementación final**

\* Estado visible de tarea.  
\* Cambio visible al completar una tarea.  
\* Mensaje de contexto no evaluativo.  
\* Resumen de progreso con números concretos.  
\* Evitar mensajes tipo “fallaste” o “rendimiento bajo”.

**\#\#\#\# Feedback no encontrado**

\* Toast de success.  
\* Toast de error.  
\* Loading.  
\* Skeleton.  
\* Retry.  
\* Spinner.  
\* Error de red.  
\* Estado disabled.  
\* Empty state textual.  
\* Confirmación modal para completar tarea.  
\* Confirmación para cancelar evento.

**\---**

**\#\#\# 2.5 Service aislado**

**\#\#\#\# Datos/acciones que el service podría exponer según información encontrada**

\* Listado de tareas asignadas.  
\* Estado de tareas.  
\* Responsable visible de tareas.  
\* Tareas completadas para datos de rendimiento.  
\* Responsabilidades que agrupan tareas.  
\* Eventos del calendario.  
\* Eventos próximos para Home.  
\* Tareas agrupadas por responsabilidad para Home.  
\* Detección de vencida como cálculo, no como estado persistente.

**\#\#\#\# Integraciones detectadas**

\* Planner contiene Task.  
\* Planner contiene Calendar.  
\* Planner contiene Responsibility.  
\* Calendar contiene Event.  
\* Event tiene Person.  
\* Task asignada a Person.  
\* Task pertenece a Responsibility.  
\* Home contiene \`Widget\_UpcomingEvents\`.  
\* Home contiene \`Widget\_TasksByResponsibility\`.  
\* Bottom Navigation contiene Planner.

**\#\#\#\# Service real / mock / local**

\* El documento no menciona services.  
\* No se encontraron nombres de funciones.  
\* No se encontraron endpoints.  
\* Para demo, lo extraído permite un service local/mock que alimente:  
  \* tareas;  
  \* estados;  
  \* responsables;  
  \* responsabilidades;  
  \* eventos próximos;  
  \* resumen de Home.  
\* Cualquier service concreto debe definirse en etapa posterior.

**\---**

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Navegación encontrada**

\* Bottom Navigation contiene Planner.  
\* Home es pantalla inicial y no puede cambiarse como punto de entrada.  
\* Home resume información; la administración ocurre en el módulo correspondiente.  
\* Bottom Navigation contiene Home, People, QuickActions, Planner y More.  
\* QuickActions contiene Geni.  
\* Geni no tiene tab dedicado en Bottom Nav.  
\* Más de 4 niveles de navegación es fallo; objetivo: 95% de acciones en 3 niveles o menos.

**\#\#\#\# Navegación aplicable a Planner**

\* Entrada principal: Bottom Navigation → Planner.  
\* Relación con Home: Home resume tareas/eventos, pero no administra.  
\* Administración de tareas/eventos debe ocurrir en Planner.  
\* Dependencia externa / no desarrollar en este fragment: People/Members para responsables.  
\* Dependencia externa / no desarrollar en este fragment: Quick Actions/Geni como acceso contextual, no tab propio.

**\#\#\#\# Navegación no encontrada**

\* No hay rutas específicas.  
\* No hay nombres de pantallas.  
\* No hay deep links.  
\* No hay navegación interna Planner → Task Detail.  
\* No hay navegación interna Planner → Event Detail.  
\* No hay modal de creación.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

\* Home contiene \`Widget\_UpcomingEvents\`.  
\* Home contiene \`Widget\_TasksByResponsibility\`.  
\* Home resume información, no administra.  
\* La administración ocurre en el módulo correspondiente.  
\* Home nunca debe sentirse abrumador.  
\* La complejidad interna no debe reflejarse en la interfaz.  
\* Home es pantalla inicial.

**\#\#\#\# More**

\* No se detectó que Planner viva en More.  
\* Planner vive en Bottom Navigation.  
\* More contiene Finance, Inventory, FamilyCloud y Settings.  
\* Settings vive exclusivamente en More.

**\#\#\#\# Quick Actions**

\* QuickActions contiene Geni.  
\* Geni no tiene tab dedicado en Bottom Nav.  
\* No se encontró acción rápida explícita “crear tarea” o “crear evento” en este documento.  
\* Dependencia externa / no desarrollar en este fragment: Geni puede crear tareas en Planner según el archivo de comprensión, pero Geni real y automatizaciones reales quedan fuera.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

Información aplicable como base mínima del Planner visual/interactivo:

\* Planner existe como módulo de navegación principal.  
\* Planner está en Bottom Navigation.  
\* Planner contiene Tasks.  
\* Planner contiene Calendar.  
\* Planner contiene Responsabilidades.  
\* Calendar contiene Events.  
\* Task debe mostrar responsable visible.  
\* Task debe mostrar estado claro.  
\* Task puede estar asignada a Person.  
\* Task pertenece a Responsibility.  
\* Responsibility agrupa tareas.  
\* Responsibility puede tener múltiples miembros.  
\* Responsibility tiene ejemplos explícitos:  
  \* Compras;  
  \* Mascotas;  
  \* Limpieza.  
\* Event puede tener Person.  
\* Home puede mostrar próximos eventos.  
\* Home puede mostrar tareas agrupadas por responsabilidad.  
\* Home resume; Planner administra.  
\* Vencida no es un estado de tarea; se calcula automáticamente.  
\* La UI debe evitar complejidad interna.  
\* La navegación debe evitar profundidad excesiva.

**\#\#\# DEMO PREMIUM**

Información útil para que Planner parezca completo sin backend perfecto:

\* Mostrar resumen de rendimiento con datos concretos y sin juicio.  
\* Mostrar “tareas de hoy” como vista o sección si se usa la consulta textual encontrada.  
\* Mostrar estado visual simple de tareas.  
\* Mostrar responsables en tareas.  
\* Mostrar eventos próximos.  
\* Mostrar calendario simple como parte de Planner.  
\* Mostrar agrupación por responsabilidad.  
\* Mostrar contexto de carga elevada como dato visual:  
  \* semana de exámenes;  
  \* día laboral cargado;  
  \* evento familiar significativo.  
\* Mostrar mensaje no evaluativo cuando hay tareas sin resolver.  
\* Mostrar cambio visual inmediato al completar tarea.  
\* Mostrar Home con preview de eventos/tareas y navegación a Planner.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

Información que podría mantenerse en estado local o service mock para demo:

\* Listado de tareas.  
\* Estados de tareas.  
\* Responsables visibles.  
\* Agrupación por responsabilidad.  
\* Eventos próximos.  
\* Eventos del calendario.  
\* Resumen numérico de tareas completadas.  
\* Cálculo local de “vencida”.  
\* Mensajes no evaluativos.  
\* Preview de Home basado en datos locales del Planner.

No se encontraron services ni endpoints explícitos.

**\#\#\# POST\_MVP**

Información encontrada pero no debe convertirse en obligación real para este MVP visual/interactivo:

\* Streaks / rachas individuales y familiares.  
\* Recuperación de racha con resta de 5 días.  
\* current streak o historial avanzado de racha.  
\* Memoria histórica permanente de rendimiento.  
\* Modo carga reducida.  
\* Aprobación de modo carga reducida.  
\* Historial de activaciones de carga reducida.  
\* Escalada de Geni Día 1 a Día 4\.  
\* Asignación automática de tarea compensatoria.  
\* Notificación automática al coordinador por incumplimientos.  
\* Geni real presentando rendimiento.  
\* Privacidad avanzada por módulo.  
\* Subtareas.  
\* Comentarios en tarea.  
\* Adjuntos en tarea.  
\* Dependencias entre tareas.  
\* Recurrencia avanzada de tareas.  
\* Automatizaciones reales que disparan tareas.  
\* Tareas generadas desde otros dominios.  
\* CalendarAutoAlbum generado desde evento.  
\* Participantes avanzados de eventos.  
\* Auditoría completa de cambios.

**\#\#\# IGNORAR**

No desarrollar en este fragment:

\* Módulos externos completos.  
\* IA real.  
\* Automatización real.  
\* Emergencia real.  
\* Ubicación/GPS real.  
\* Storage/OCR real.  
\* Finanzas reales.  
\* Inventario real.  
\* Activos reales.  
\* Nube documental real.  
\* Metas reales.  
\* Milestones reales.  
\* Offline sync.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner en Bottom Navigation | Acceso principal al módulo Planner. | Abrir Planner. | No especificado. | Bottom Nav → Planner. | REAL MÍNIMO |  
| Lista de tareas | Tareas asignadas, responsable visible, estado claro. | Ver tarea; completar si se toma como acción mínima por MVP posterior. | Estado claro; vencida calculada, no persistida como estado. | Planner. | REAL MÍNIMO / DEMO PREMIUM |  
| Tareas por responsabilidad | Tareas agrupadas por áreas operativas del hogar. | Abrir grupo o tarea, no especificado. | No especificado. | Home preview → Planner; Planner. | REAL MÍNIMO / DEMO PREMIUM |  
| Responsibility group/card | Área operativa: Compras, Mascotas, Limpieza. | No especificado. | No especificado. | Planner. | DEMO PREMIUM |  
| Calendar dentro de Planner | Administración de eventos dentro de Planner. | Ver eventos; crear/editar no aparece explícito. | No especificado. | Planner → Calendar. | REAL MÍNIMO / DEMO PREMIUM |  
| Eventos próximos | Eventos próximos expuestos en Home. | Abrir Planner/Calendar, no especificado. | No especificado. | Home → Planner/Calendar. | REAL MÍNIMO / DEMO PREMIUM |  
| Home widget: UpcomingEvents | Resumen de próximos eventos. | Navegar al módulo correspondiente, no especificado. | Home no debe abrumar. | Home → Planner. | REAL MÍNIMO |  
| Home widget: TasksByResponsibility | Resumen de tareas agrupadas por responsabilidad. | Navegar al módulo correspondiente, no especificado. | Home no administra. | Home → Planner. | REAL MÍNIMO |  
| Rendimiento contextual | Datos concretos: “Esta semana completaste 6 de 10 tareas...” | Ver información; no se especifica acción. | Sin etiquetas evaluativas; con contexto. | Planner o Geni contextual. | POST\_MVP / DEMO PREMIUM si es card mock |  
| Carga reducida | Solicitud de período más liviano y respuesta del coordinador. | Declarar; aprobar; proponer conversación. | Sin juicio; no tribunal. | No especificado. | POST\_MVP |  
| Escalada por incumplimiento | Día 1–4 con recordatorio/compensación/aviso/notificación. | No especificado para UI directa. | Privado, progresivo, no acusatorio. | No especificado. | POST\_MVP |  
| Streak/racha | Racha individual/familiar. | Retomar cumplimiento. | Recuperación; evitar culpa acumulada. | No especificado. | POST\_MVP |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| Compras | Planner / Responsibility | Categoría o grupo visual de tareas. | Archivo de comprensión, entidad Responsibility. | REAL MÍNIMO / DEMO PREMIUM |  
| Mascotas | Planner / Responsibility | Categoría o grupo visual de tareas. | Archivo de comprensión, entidad Responsibility. | REAL MÍNIMO / DEMO PREMIUM |  
| Limpieza | Planner / Responsibility | Categoría o grupo visual de tareas. | Archivo de comprensión, entidad Responsibility. | REAL MÍNIMO / DEMO PREMIUM |  
| Pendiente | Task | Estado visible de tarea. | Archivo de comprensión, entidad Task. | REAL MÍNIMO |  
| En progreso | Task | Estado visible de tarea. | Archivo de comprensión, entidad Task. | DEMO PREMIUM / posible POST\_MVP si el merge define otros estados |  
| Completada | Task | Estado visible de tarea completada. | Archivo de comprensión, entidad Task. | REAL MÍNIMO |  
| Cancelada | Task | Estado visible si se soporta cancelar. | Archivo de comprensión, entidad Task. | DEMO PREMIUM / POST\_MVP según recorte posterior |  
| Vencida calculada | Task | Badge/calculado visual, no estado persistido. | Archivo de comprensión, business rule. | REAL MÍNIMO |  
| Programado | Event | Estado visible de evento. | Archivo de comprensión, entidad Event. | REAL MÍNIMO / DEMO PREMIUM |  
| Completado | Event | Estado visible de evento finalizado. | Archivo de comprensión, entidad Event. | DEMO PREMIUM |  
| Cancelado | Event | Estado visible de evento cancelado. | Archivo de comprensión, entidad Event. | DEMO PREMIUM |  
| “¿Qué tareas tengo hoy?” | Planner / Task | Texto de consulta o acceso contextual. | Documento principal, Empleado Familiar. | DEMO PREMIUM; dependencia externa de rol laboral no desarrollar |  
| “Esta semana completaste 6 de 10 tareas. Tu mejor semana del mes fue la segunda, con 9 de 10.” | Planner / rendimiento | Card de rendimiento mock o mensaje contextual sin juicio. | Documento principal, Memoria histórica. | POST\_MVP / DEMO PREMIUM mock |  
| “Hay tareas sin resolver desde hace una semana. Puede ser un buen momento para hablar.” | Planner / incumplimiento | Mensaje contextual no acusatorio. | Documento principal, Escalada de Geni. | POST\_MVP / DEMO PREMIUM mock |  
| Semana de exámenes | Calendar / carga | Contexto visual de calendario o carga. | Documento principal, Calibración de carga por contexto. | POST\_MVP / DEMO PREMIUM mock |  
| Día laboral cargado | Calendar / carga | Contexto visual de calendario o carga. | Documento principal, Calibración de carga por contexto. | POST\_MVP / DEMO PREMIUM mock |  
| Evento familiar significativo | Calendar / carga | Contexto visual de calendario o carga. | Documento principal, Calibración de carga por contexto. | POST\_MVP / DEMO PREMIUM mock |

**\#\#\# Datos que faltan para demo**

\* Títulos concretos de tareas.  
\* Títulos concretos de eventos.  
\* Fechas y horas concretas.  
\* Prioridades concretas.  
\* Responsables concretos.  
\* Avatares.  
\* Colores.  
\* Iconos.  
\* Labels de botones.  
\* Texto de estados vacíos.

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Abrir Planner | Usuario general | Entra al módulo desde Bottom Nav. | REAL MÍNIMO | Archivo de comprensión: BottomNavigation contiene Planner. |  
| Ver tareas asignadas | Miembro | Sabe qué le toca. | REAL MÍNIMO / DEMO PREMIUM | Documento principal: claridad; tareas con responsable visible y estado claro. |  
| Ver responsable de tarea | Miembro / hogar | Responsable visible en la tarea. | REAL MÍNIMO | Documento principal: Claridad. |  
| Ver estado de tarea | Miembro / hogar | Estado claro de la tarea. | REAL MÍNIMO | Documento principal: Claridad. |  
| Completar tarea | Miembro | Tarea aparece como completada; impacta rendimiento si se muestra. | DEMO PREMIUM; indirecto en documento | Documento principal: tareas completadas / memoria histórica. |  
| Ver tareas completadas | Miembro | Rendimiento o historial. | POST\_MVP / DEMO PREMIUM mock | Documento principal: memoria histórica. |  
| Ver eventos próximos | Miembro / hogar | Próximos eventos visibles. | REAL MÍNIMO / DEMO PREMIUM | Archivo de comprensión: Home contiene UpcomingEvents; Calendar contiene Event. |  
| Ver calendario | Miembro | Eventos en Calendar. | REAL MÍNIMO / DEMO PREMIUM | Archivo de comprensión: Calendar dentro de Planner. |  
| Declarar período más liviano | Cualquier miembro | Solicitud al coordinador. | POST\_MVP | Documento principal: Modo carga reducida. |  
| Aprobar carga reducida | Coordinator | Carga reducida o pausada. | POST\_MVP | Documento principal: Modo carga reducida. |  
| Proponer conversación | Coordinator | Flujo continúa hasta acuerdo. | POST\_MVP | Documento principal: Modo carga reducida. |  
| Asignar tarea compensatoria | Geni | Tarea compensatoria menor. | POST\_MVP | Documento principal: Escalada de Geni Día 2\. |  
| Notificar al coordinador por incumplimiento | Geni | Mensaje no acusatorio al coordinador. | POST\_MVP | Documento principal: Escalada de Geni Día 4\. |  
| Ver datos de rendimiento | Miembro / Coordinator | Datos concretos con contexto. | POST\_MVP / DEMO PREMIUM mock | Documento principal: Memoria histórica y visibilidad. |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Home puede mostrar información proveniente de Planner mediante:  
  \* \`Widget\_UpcomingEvents\`.  
  \* \`Widget\_TasksByResponsibility\`.  
\* Home resume información, no administra.  
\* La administración debe ocurrir en Planner.  
\* Home es pantalla inicial.  
\* Home no debe sentirse abrumador.  
\* La complejidad interna no debe reflejarse en Home.  
\* Para demo, Planner puede exponer a Home:  
  \* próximos eventos;  
  \* tareas agrupadas por responsabilidad;  
  \* posiblemente tareas pendientes o vencidas calculadas, si el merge posterior lo permite.

**\#\#\# More**

\* Planner no vive en More según el archivo de comprensión.  
\* Planner vive en Bottom Navigation.  
\* More contiene otros módulos y Settings.  
\* No extraer More para Planner salvo esta aclaración.

**\#\#\# Quick Actions**

\* QuickActions contiene Geni.  
\* Geni no tiene tab dedicado en Bottom Nav.  
\* No se encontró acción rápida explícita de Planner.  
\* Dependencia externa / no desarrollar en este fragment:  
  \* Geni puede crear tareas en Planner según el archivo de comprensión.  
  \* Geni real queda fuera de este fragment.  
  \* Automatizaciones reales quedan fuera de este fragment.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Listar tareas | No especificado | No especificado | No especificado | No especificado | Acción/entidad mencionada sin contrato API | REAL MÍNIMO / DEMO PREMIUM |  
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción inferida indirectamente desde tareas completadas | DEMO PREMIUM / requiere validación |  
| Listar eventos | No especificado | No especificado | No especificado | No especificado | Entidad mencionada sin contrato API | REAL MÍNIMO / DEMO PREMIUM |  
| Exponer próximos eventos a Home | No especificado | No especificado | No especificado | No especificado | Relación mencionada sin contrato API | DEMO PREMIUM |  
| Exponer tareas por responsabilidad a Home | No especificado | No especificado | No especificado | No especificado | Relación mencionada sin contrato API | DEMO PREMIUM |  
| Declarar carga reducida | No especificado | No especificado | No especificado | No especificado | Flujo mencionado sin contrato API | POST\_MVP |  
| Aprobar carga reducida | No especificado | No especificado | No especificado | No especificado | Flujo mencionado sin contrato API | POST\_MVP |  
| Escalada de Geni por incumplimiento | No especificado | No especificado | No especificado | No especificado | Workflow mencionado sin contrato API | POST\_MVP |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Planner | contiene | no especificado | Task, Calendar, Responsibility, Goals | Estructura del módulo. | REAL MÍNIMO, excepto Goals fuera de este fragment |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/estado visual de tarea. | REAL MÍNIMO / DEMO PREMIUM; requiere merge con estados oficiales posteriores |  
| Task | responsable | Person, tipo no especificado | Responsable visible | Mostrar asignado en card/lista. | REAL MÍNIMO |  
| Task | vencida | calculado, tipo no especificado | No es estado persistente | Badge calculado por fecha o criterio posterior. | REAL MÍNIMO |  
| Task | completed count / completadas | no especificado | cantidad de tareas completadas | Mensaje de rendimiento. | POST\_MVP / DEMO PREMIUM mock |  
| Task | template | TaskTemplate, tipo no especificado | Plantilla de tareas | No hay campos ni CRUD. | POST\_MVP / requiere validación para templates MVP de otros documentos |  
| Task | comment | TaskComment, tipo no especificado | Comentario | No desarrollar ahora. | POST\_MVP |  
| Task | attachment | TaskAttachment, tipo no especificado | imágenes, PDFs, archivos, audio | No desarrollar ahora. | POST\_MVP |  
| Task | dependency | TaskDependency, tipo no especificado | tarea previa bloquea dependiente | No desarrollar ahora. | POST\_MVP |  
| Task | recurrence | TaskRecurrence, tipo no especificado | genera nuevas instancias | No desarrollar ahora salvo merge posterior. | POST\_MVP |  
| Task | verification | TaskVerification, tipo no especificado | verificación opcional | No hay flujo ni estados en este documento. | POST\_MVP / requiere validación |  
| Responsibility | nombre/categoría | no especificado | Compras, Mascotas, Limpieza | Agrupar tareas. | REAL MÍNIMO / DEMO PREMIUM |  
| Responsibility | miembros | Person, tipo no especificado | múltiples miembros | Mostrar responsables o grupo. | DEMO PREMIUM |  
| Calendar | contiene | no especificado | Event | Estructura de calendario. | REAL MÍNIMO / DEMO PREMIUM |  
| Event | estado | no especificado | Programado, Completado, Cancelado | Estado visible de evento. | DEMO PREMIUM |  
| Event | participante/persona | Person, tipo no especificado | Person | Mostrar participante/responsable si aplica. | DEMO PREMIUM |  
| Streak | días consecutivos | no especificado | individual / familiar | No desarrollar ahora. | POST\_MVP |  
| StreakRecovery | resta | número | resta de 5 días si retoma al día siguiente | No desarrollar ahora. | POST\_MVP |  
| ReducedLoadMode | solicitud | no especificado | período más liviano | No desarrollar ahora. | POST\_MVP |  
| ReducedLoadMode | aprobación | no especificado | aprobar / proponer conversación | No desarrollar ahora. | POST\_MVP |  
| GeniEscalation | día | no especificado | Día 1, Día 2, Día 3, Día 4 | No desarrollar ahora. | POST\_MVP |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Tarea vencida | No tratar “vencida” como estado persistente; se calcula automáticamente. | Archivo de comprensión, business rule. | REAL MÍNIMO |  
| Tareas sin resolver | Geni escala con tono de conversación, no denuncia. | Documento principal, Arquitectura de escalada de Geni. | POST\_MVP |  
| Incumplimiento Día 1 | Recordatorio privado y neutro al miembro. | Documento principal, Arquitectura de escalada de Geni. | POST\_MVP |  
| Incumplimiento Día 2 | Asignación automática de tarea compensatoria menor, sin aviso al coordinador. | Documento principal, Arquitectura de escalada de Geni. | POST\_MVP |  
| Incumplimiento Día 3 | Aviso al miembro: en 24 horas se notifica al coordinador si no hay acción. | Documento principal, Arquitectura de escalada de Geni. | POST\_MVP |  
| Incumplimiento Día 4 | Notificación al coordinador con mensaje de conversación. | Documento principal, Arquitectura de escalada de Geni. | POST\_MVP |  
| Racha rota | Si retoma al día siguiente, resta 5 días; si no, reinicio completo. | Documento principal, Mecánica de racha. | POST\_MVP |  
| Carga personal alta | La carga de tareas se reduce automáticamente según calendario. | Documento principal, Calibración de carga. | POST\_MVP |  
| Solicitud de carga reducida | Cualquier miembro puede declarar período más liviano; requiere respuesta del coordinador. | Documento principal, Modo carga reducida. | POST\_MVP |  
| Coordinador aprueba carga reducida | Carga se reduce o pausa sin penalización en racha. | Documento principal, Modo carga reducida. | POST\_MVP |  
| Coordinador propone conversación | El flujo normal continúa hasta acuerdo. | Documento principal, Modo carga reducida. | POST\_MVP |  
| Miembro fantasma | No exponer públicamente la ausencia; trabajo privado y conversación real. | Documento principal, edge case miembro fantasma. | POST\_MVP |  
| Conflicto activo entre miembros | El sistema no interfiere, no fuerza interacción, no expone un miembro frente al otro. | Documento principal, edge case conflicto. | CONTEXTO / restricción emocional |  
| Nuevo miembro | Integración gradual con primera tarea visible. | Documento principal, edge case incorporación de miembro nuevo. | POST\_MVP / dependencia externa de onboarding |  
| Ansiedad por notificaciones | No notificar constantemente; bajo impacto agrupado; no repetir lo mismo. | Documento principal, ansiedad por notificaciones; archivo de comprensión. | POST\_MVP / restricción UX |  
| Estado vacío de tareas | No encontrado. | No aplica. | Información faltante |  
| Error de completar tarea | No encontrado. | No aplica. | Información faltante |  
| Error de evento | No encontrado. | No aplica. | Información faltante |  
| Sin permisos para editar tarea/evento | No encontrado. | No aplica. | Información faltante |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

**\#\#\# Restricciones aplicables al Planner visual/interactivo**

\* Las tareas deben tener responsable visible.  
\* Las tareas deben tener estado claro.  
\* Los datos deben presentarse con contexto.  
\* El sistema da información, no órdenes.  
\* La complejidad interna no debe reflejarse en la interfaz.  
\* Home resume información; no administra.  
\* La administración ocurre en el módulo correspondiente.  
\* Planner vive en Bottom Navigation.  
\* Home es pantalla inicial.  
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones en 3 niveles o menos.  
\* Vencida no es estado de tarea; se calcula automáticamente.  
\* Los módulos no deben comportarse como aplicaciones separadas.  
\* Todos los dominios deben poder relacionarse, pero no se deben desarrollar dominios externos en este fragment.  
\* Las acciones que afectan al hogar deben ser visibles y los cambios relevantes quedan registrados; auditoría completa no desarrollar ahora.  
\* Coordinación por encima de jerarquía: coordinadores administran el hogar, no la vida privada.  
\* Ningún rol obtiene acceso automático a memoria privada, metas privadas, documentos privados o finanzas personales.

**\#\#\# Restricciones emocionales relevantes**

\* No generar resentimiento, desgaste ni explosión.  
\* No generar culpa acumulada.  
\* No generar presión social.  
\* No generar ansiedad por notificaciones.  
\* No generar acusación, juicio, humillación pública ni sensación de denuncia.  
\* Los datos de rendimiento deben ser concretos, con contexto y sin etiquetas evaluativas.  
\* Los incumplimientos no deben exponerse públicamente.  
\* El sistema no debe notificar dos veces lo mismo.

**\#\#\# Fuera de scope explícito de esta sección**

\* Cómo el tono emocional se expresa visualmente en cada pantalla queda derivado a otra sección.  
\* Cómo Geni procesa contexto familiar queda derivado a otra sección.  
\* Cómo se diseña la pantalla de aprobación de carga reducida queda derivado a otra sección.  
\* Qué datos específicos se almacenan del historial y por cuánto tiempo queda derivado a otra sección.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| Pantalla concreta de Planner | Codex necesita layout, secciones y jerarquía visual. | Alto |  
| Tabs de Planner | No se sabe si separar Tasks, Calendar, Events o usar una pantalla unificada. | Alto |  
| UI de crear tarea | Acción clave de MVP visual no está definida en este documento. | Alto |  
| UI de editar tarea | No se puede construir flujo de edición fiel a este documento. | Medio |  
| UI de eliminar tarea | No aparece patrón de confirmación ni permisos. | Medio |  
| UI de completar tarea | Solo aparece indirectamente por tareas completadas. | Alto |  
| UI de crear evento | No aparece formulario ni campos. | Alto |  
| UI de editar/cancelar evento | No aparece flujo ni confirmación. | Medio |  
| Vista día/semana/mes | Calendar aparece, pero no estas vistas. | Alto |  
| Campos de Task | No hay tipos ni campos completos. | Alto |  
| Campos de Event | No hay fecha/hora, ubicación, participantes ni tipos. | Alto |  
| Prioridades de Task | No aparecen prioridades. | Medio |  
| Fecha límite | No aparece campo explícito de deadline. | Alto |  
| Templates predefinidas MVP | Este documento solo da Responsabilidades y TaskTemplate general; no define las templates obligatorias del prompt. | Alto |  
| Verification Flow MVP | Se menciona TaskVerification opcional, pero no se describen estados \`pending\`, \`completed\`, \`awaiting\_verification\`, \`verified\`. | Alto |  
| Estados oficiales del prompt | El archivo de comprensión trae estados distintos para Task. Requiere merge posterior. | Alto |  
| Recurrencia simple de eventos | No aparecen \`none\`, \`daily\`, \`weekly\`, \`monthly\`. | Medio |  
| Service contract | No hay nombre de service, métodos ni estructura de datos. | Alto |  
| API | No hay endpoints, request, response ni errores. | Alto |  
| Datos demo concretos | No hay títulos reales de tareas/eventos ni miembros. | Alto |  
| Empty state | No hay copy ni comportamiento. | Medio |  
| Error states | No hay errores definidos. | Medio |  
| Feedback inmediato | No hay toast/loading/skeleton; solo restricciones de tono. | Medio |  
| Permisos Planner por rol | No se define quién crea/edita/elimina/verifica tareas o eventos. | Alto |  
| Integración con People/Members | Se sabe que Task puede asignarse a Person, pero no hay datos visuales de miembros. | Alto |  
| Integración con Home | Existen widgets, pero no estructura visual ni interacción. | Medio |  
| Quick Actions de Planner | No aparece crear tarea/evento desde QuickActions. | Bajo/Medio |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Archivo principal**

\* Archivo: \`HomePlus — SECCION 4 EMOTIONAL DESING.md\`  
\* Secciones utilizadas:  
  \* \`Sobre esta sección\`  
  \* \`Principio central\`  
  \* \`Emociones objetivo / Calma\`  
  \* \`Emociones objetivo / Claridad\`  
  \* \`Emociones objetivo / Reconocimiento\`  
  \* \`Emociones objetivo / Control saludable\`  
  \* \`Emociones a evitar / Culpa acumulada\`  
  \* \`Emociones a evitar / Presión social dentro del hogar\`  
  \* \`Emociones a evitar / Ansiedad por notificaciones\`  
  \* \`Arquitectura de escalada de Geni\`  
  \* \`Mecánica de racha, culpa y recuperación\`  
  \* \`Rachas\`  
  \* \`Recuperación de racha\`  
  \* \`Calibración de carga por contexto\`  
  \* \`Modo carga reducida\`  
  \* \`Memoria histórica y visibilidad del rendimiento\`  
  \* \`Qué registra el sistema\`  
  \* \`Cómo presenta Geni el rendimiento\`  
  \* \`Visibilidad por rol\`  
  \* \`Edge cases emocionales / Miembro fantasma\`  
  \* \`Edge cases emocionales / Conflicto entre miembros\`  
  \* \`Edge cases emocionales / Incorporación de miembro nuevo\`  
  \* \`Tabla de decisiones — Emotional Design\`  
  \* \`Fuera del scope de esta sección\`

**\#\#\# Archivo de comprensión asociado**

\* Archivo: \`Seccion 4 Emotional Design.txt\`  
\* Bloques utilizados:  
  \* \`OUTPUT 1 — ENTITIES\`  
  \* \`OUTPUT 2 — RELATIONSHIPS\`  
  \* \`OUTPUT 3 — CROSS-DOMAIN RELATIONSHIPS\`  
  \* \`OUTPUT 4 — DATA FLOWS\`  
  \* \`OUTPUT 5 — BUSINESS RULES\`  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
  \* \`OUTPUT 8 — GRAPH EDGES\`  
\* Entidades y relaciones usadas:  
  \* \`Planner\`  
  \* \`Task\`  
  \* \`TaskTemplate\`  
  \* \`TaskComment\`  
  \* \`TaskAttachment\`  
  \* \`TaskDependency\`  
  \* \`TaskRecurrence\`  
  \* \`TaskVerification\`  
  \* \`Responsibility\`  
  \* \`Calendar\`  
  \* \`Event\`  
  \* \`Streak\`  
  \* \`ReducedLoadMode\`  
  \* \`GeniEscalation\`  
  \* \`Widget\_UpcomingEvents\`  
  \* \`Widget\_TasksByResponsibility\`  
  \* \`BottomNavigation → Planner\`

**\#\#\# Source map usado**

\* Archivo: \`source\_map\_HomePlus\_SECCION\_4\_EMOTIONAL\_DESING.md\`  
\* Secciones consultadas:  
  \* \`2. Resumen técnico del contenido\`  
  \* \`3. Índice de secciones relevantes\`  
  \* \`4.7 PLANNER\`  
  \* \`4.8 TASKS\`  
  \* \`4.9 EVENTS\`  
  \* \`4.10 CALENDAR\`  
  \* \`4.11 HOME\`  
  \* \`5. Mapa de entidades\`  
  \* \`6. Mapa de relaciones\`  
  \* \`7. Mapa de estados\`  
  \* \`11. Mapa de UI\`  
  \* \`13. Restricciones arquitectónicas detectadas\`  
  \* \`15. Información POST\_MVP detectada\`  
  \* \`18. Información faltante\`

**\---**

**\#\# Nota de fidelidad**

Este fragment contiene solamente información encontrada en este documento, su archivo de comprensión asociado y el source map generado para este mismo documento. No completa huecos, no inventa endpoints, no inventa campos, no define UI final y no convierte Post-MVP en MVP real.

**\# PLANNER fragment — HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY**

\> Fragment crudo de implementación visual/interactiva para extracción posterior.    
\> Fuente cerrada: \`HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY(1).md\`, \`Seccion 5 filsofia de las relaciones(1).txt\` y \`source\_map\_HomePlus\_SECCION\_5\_RELATIONSHIP\_PHILOSOPHY.md\`.    
\> No es spec final. No fusiona con otros documentos. No completa huecos.

**\---**

**\#\# 1\. Rol del módulo en la demo**

**\#\#\# Información explícita encontrada**

\* Planner aparece como parte del ecosistema de dominios conectados de HomePlus.  
\* El archivo de comprensión describe **\*\*Planner\*\*** como “núcleo operativo” que administra **\*\*Tasks\*\***, **\*\*Calendar\*\***, **\*\*Goals\*\*** y **\*\*Responsabilidades\*\***.  
\* El documento principal muestra que Planner no funciona aislado: una **\*\*Persona\*\*** puede ser responsable de tareas, participante de eventos y dueña de metas.  
\* Una **\*\*Tarea\*\*** puede relacionarse con una **\*\*Responsabilidad\*\***, un **\*\*Evento\*\*** y una **\*\*Persona\*\***.  
\* Un **\*\*Evento\*\*** puede relacionarse con **\*\*Personas\*\*** y con Calendar.  
\* Las relaciones del ecosistema deben ser navegables y visibles solo si el rol del usuario tiene permiso para ver cada entidad relacionada.  
\* Planner aporta información a Home a través de tareas, eventos y briefing/resúmenes, según el archivo de comprensión.

**\#\#\# Valor para demo extraíble**

\* Mostrar Planner como módulo operativo donde se ven tareas y eventos relacionados con personas/responsabilidades.  
\* Mostrar que una tarea puede abrir detalle y navegar hacia un evento relacionado.  
\* Mostrar que Home puede entrar a Planner desde una tarea o evento.  
\* Mostrar que el módulo respeta visibilidad por rol de manera visual, aunque este documento no define CRUD completo ni contratos API.

**\#\#\# Problema familiar que resuelve según fuente**

\* Coordinar trabajo pendiente, eventos y responsabilidades familiares dentro de un hogar.  
\* Evitar que el usuario tenga que volver al menú principal para seguir una relación entre entidades.  
\* Mantener el hilo de intención cuando el usuario navega entre Home, tareas y eventos.

**\#\#\# Qué debe sentir el usuario**

\* El documento no define emociones explícitas para Planner.  
\* Sí establece que la navegación entre entidades debe evitar fricción y permitir continuar la intención sin perder contexto.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Pantallas o componentes detectados**

\* **\*\*Planner\*\*** como tab principal dentro de Bottom Nav.  
\* **\*\*Calendar\*\*** como feature dentro de Planner.  
\* **\*\*Task Detail\*\*** o vista de detalle de tarea, porque toda entidad relacionada debe exponer sus relaciones como enlaces navegables.  
\* **\*\*Event Detail\*\*** o vista de detalle de evento, implícita por navegación desde una tarea hacia un evento.  
\* **\*\*TareasHome\*\*** como widget/card de Home relacionado con Planner.  
\* **\*\*PróximosEventos\*\*** como widget/card de Home relacionado con Calendar/Event.  
\* **\*\*Briefing\*\*** como card de Home que puede agregar datos de Planner, pero para este fragment queda como dependencia externa / no desarrollar.

**\#\#\#\# Secciones visuales extraíbles**

\* Lista o agrupación de tareas por **\*\*Responsabilidad\*\***.  
\* Vista de detalle de una tarea con enlaces hacia entidades relacionadas.  
\* Enlace desde detalle de tarea hacia evento relacionado.  
\* Calendar como lugar donde se administran o visualizan eventos familiares/personales.  
\* Home como punto de entrada hacia tarea/evento.  
\* Bottom Nav con estructura: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.

**\#\#\#\# Labels, badges o estados visibles encontrados**

\* Task states encontrados en archivo de comprensión: \`Pendiente\`, \`En progreso\`, \`Completada\`, \`Cancelada\`.  
\* Event states encontrados en archivo de comprensión: \`Programado\`, \`Completado\`, \`Cancelado\`.  
\* No se encontraron tabs concretos de Planner.  
\* No se encontraron filtros concretos.  
\* No se encontraron iconos concretos.  
\* No se encontraron headers concretos.  
\* No se encontraron textos de botones concretos para crear/editar/eliminar.

**\#\#\#\# Jerarquía visual implícita útil**

\* Home puede mostrar tarjetas/resúmenes y conducir al módulo dueño.  
\* Planner debe permitir detalle y enlaces contextuales.  
\* Calendar vive dentro de Planner.  
\* Las relaciones entre entidades se muestran si el usuario puede verlas.

**\---**

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Ejemplos explícitos de tareas/eventos/personas/responsabilidades**

\* Persona: \`Mamá\`, rol \`Adulto\`.  
\* Tarea: \`Comprar alimento para perro\`.  
\* Responsabilidad: \`Mascotas\`.  
\* Asset relacionado en ejemplo: \`Perro (Toby)\` — **\*\*Dependencia externa / no desarrollar en este fragment.\*\***  
\* Documento relacionado en ejemplo: \`Carnet de vacunación\` — **\*\*Dependencia externa / no desarrollar en este fragment.\*\***  
\* Evento: \`Visita al veterinario — sábado 11:00\`.  
\* Lugar: \`Veterinaria San Roque\` — **\*\*Dependencia externa / no desarrollar en este fragment.\*\***  
\* Responsabilidad \`Mascotas\` agrupa tareas como \`alimentar\` y \`pasear\`.  
\* Ejemplo de navegación desde Home: tarea \`Preparar comida para el asado\`.  
\* Evento relacionado: \`Asado del sábado 13:00\`.  
\* Documento relacionado: \`Lista de compras\` — **\*\*Dependencia externa / no desarrollar en este fragment.\*\***  
\* Gasto relacionado: \`$150 — Carnicería\` — **\*\*Dependencia externa / no desarrollar en este fragment.\*\***  
\* Sugerencia Geni: \`Detecté 3 tareas relacionadas con el evento 'Cumpleaños de Gaby'. ¿Querés agruparlas?\` — **\*\*POST\_MVP / Geni real no desarrollar.\*\***  
\* Pregunta Geni: \`¿Qué tareas pendientes tiene Mateo esta semana?\` — **\*\*POST\_MVP / Geni real no desarrollar.\*\***  
\* Análisis Geni: \`Mateo completó todas sus tareas escolares 5 días seguidos\` — **\*\*POST\_MVP / Geni real / streaks no desarrollar.\*\***  
\* Sugerencia externa: \`El stock de leche está bajo. ¿Creo una tarea de compras?\` — **\*\*Dependencia externa / no desarrollar Inventory.\*\***  
\* Sugerencia externa: \`Hace 6 meses que no se hace el service del auto. ¿Agendo un recordatorio?\` — **\*\*Dependencia externa / no desarrollar Assets.\*\***

**\#\#\#\# Categorías/responsabilidades encontradas**

\* \`Mascotas\`.  
\* \`Compras\`.  
\* \`Limpieza\`.

**\#\#\#\# Datos esperados por el prompt pero no encontrados en esta fuente**

\* No aparecen datos explícitos para \`Medicación\`, \`Estudios\` ni \`Pagos\` como templates MVP.  
\* No aparecen prioridades de tarea.  
\* No aparecen fechas límite de tareas como campo explícito.  
\* No aparecen vistas día/semana/mes con ejemplos concretos.  
\* No aparecen datos demo de tareas vencidas, hoy, mañana o sin asignar.

**\---**

**\#\#\# 2.3 Acción interactiva**

**\#\#\#\# Acciones visibles o conceptuales encontradas**

\* Abrir detalle de tarea.  
\* Navegar desde tarea hacia evento relacionado.  
\* Navegar desde Home hacia tarea.  
\* Navegar desde evento hacia entidades relacionadas si el usuario tiene visibilidad.  
\* Reutilizar una instancia existente del stack si una navegación vuelve a una entidad ya abierta.  
\* Confirmar o descartar sugerencias de Geni para relacionar entidades — **\*\*POST\_MVP / Geni real no desarrollar.\*\***  
\* Geni puede sugerir crear tarea de compra desde stock bajo — **\*\*Dependencia externa / no desarrollar Inventory.\*\***  
\* Geni puede sugerir agendar recordatorio desde mantenimiento de asset — **\*\*Dependencia externa / no desarrollar Assets.\*\***

**\#\#\#\# Acciones MVP esperadas pero no encontradas en esta fuente**

\* Crear tarea.  
\* Editar tarea.  
\* Eliminar tarea.  
\* Completar tarea como flujo de usuario.  
\* Verificar tarea con \`awaiting\_verification\` / \`verified\`.  
\* Crear evento.  
\* Editar evento con formulario.  
\* Eliminar/cancelar evento con flujo UI.  
\* Listar tareas con filtros/tabs.  
\* Listar eventos con vista día/semana/mes.

**\#\#\#\# Clasificación de acciones encontradas**

\* Abrir detalle: **\*\*REAL mínimo\*\***.  
\* Navegar entre entidades relacionadas: **\*\*REAL mínimo\*\***.  
\* Confirmar/descartar sugerencia Geni: **\*\*POST\_MVP\*\***.  
\* Sugerencias desde Inventory/Assets hacia Planner: **\*\*POST\_MVP / dependencia externa\*\***.

**\---**

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Feedback explícito encontrado**

\* No se encontraron toasts, success messages, errores, skeletons, spinners, retries ni mensajes de loading.  
\* La única regla de feedback/navegación concreta es que el botón back del sistema operativo siempre debe retroceder un nivel real.  
\* Si una relación no puede mostrarse por privacidad, el sistema/Geni la omite sin revelar que existe.

**\#\#\#\# Estados UX derivados de la fuente, sin inventar comportamiento**

\* Relación visible si el rol puede ver todos los eslabones.  
\* Relación omitida si el usuario no tiene visibilidad.  
\* Back real al navegar A → B → C.  
\* Reutilización de instancia existente para evitar ciclos infinitos.

**\---**

**\#\#\# 2.5 Service aislado**

**\#\#\#\# Datos que el service podría listar según fuente**

\* Tasks relacionadas con Persona.  
\* Tasks agrupadas por Responsabilidad.  
\* Tasks vinculadas a Event.  
\* Events vinculados a Personas.  
\* Calendar como feature que administra eventos familiares y personales.  
\* Widgets de Home que consumen datos de Planner: \`TareasHome\`, \`ProximosEventos\`, \`Briefing\`.

**\#\#\#\# Acciones que el service podría ejecutar según fuente**

\* No se encontró contrato de service.  
\* No se encontraron nombres de funciones.  
\* No se encontraron endpoints.  
\* No se encontraron request/response.

**\#\#\#\# Integración con Home detectada**

\* Home contiene \`TareasHome\`.  
\* Home contiene \`ProximosEventos\`.  
\* Briefing puede agregar datos desde Planner.  
\* Planner actualiza Home cuando una tarea se completa, según el archivo de comprensión; no hay contrato técnico.

**\#\#\#\# Fuente de datos**

\* No se define si es mock, local, AsyncStorage, API o backend real.  
\* Para demo, este documento solo permite extraer relaciones y datos de ejemplo, no un service contract.

**\---**

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Entrada al módulo**

\* Planner aparece como tab de Bottom Nav.  
\* Bottom Nav V1: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Home puede llevar a una tarea.  
\* Una tarea puede llevar a un evento relacionado.

**\#\#\#\# Flujo explícito de navegación**

\`\`\`text  
Home → Tarea "Preparar comida para el asado"  
→ Evento "Asado del sábado 13:00"  
→ Documento "Lista de compras"  
→ Gasto "$150 — Carnicería"  
\`\`\`

Para este fragment Planner:

\`\`\`text  
Home → Tarea  
Tarea → Evento  
Evento → volver por stack real  
\`\`\`

Los pasos hacia Documento/Gasto son **\*\*Dependencia externa / no desarrollar en este fragment.\*\***

**\#\#\#\# Reglas de navegación**

\* El usuario no debería tener que volver al menú principal para seguir una relación entre entidades.  
\* Toda entidad que tenga relación con otra debe exponer esa relación como enlace navegable en su vista de detalle.  
\* Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento.  
\* Si el usuario navega A → B → C y desde C existe enlace a A, se reutiliza la instancia existente de A en el stack.  
\* El botón back del sistema operativo retrocede un nivel real.  
\* Las relaciones se exponen solo si el usuario puede ver cada entidad vinculada.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

\* \`Home\` aparece como centro operativo que resume información.  
\* \`TareasHome\` aparece como widget/card de Home con tareas agrupadas por responsabilidad.  
\* \`ProximosEventos\` aparece como widget/card de Home con próximos eventos.  
\* \`Briefing\` aparece como primer widget/card de Home y puede agregar datos de Planner, pero para este fragment se trata como **\*\*Dependencia externa / no desarrollar Geni real\*\***.  
\* Data flow: \`Planner → Home\` cuando una tarea completada actualiza widget de tareas y reorganiza Home, según archivo de comprensión.

**\#\#\#\# More**

\* Planner no vive en More.  
\* Planner aparece en Bottom Nav como tab principal.  
\* More contiene otros módulos, no Planner.

**\#\#\#\# Quick Actions**

\* QuickActions existe como panel accesible desde botón \`+\` en Bottom Nav.  
\* El archivo de comprensión indica que QuickActions contiene Geni como slot fijo.  
\* No se encontró acción rápida explícita “crear tarea” o “crear evento” en esta fuente.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

\* Planner como módulo/tab principal del Bottom Nav.  
\* Calendar como feature dentro de Planner.  
\* Task como entidad de Planner.  
\* Event como entidad de Planner/Calendar.  
\* Persona como responsable de tareas y participante de eventos.  
\* Task pertenece a una única Responsabilidad.  
\* Task puede vincularse a Event.  
\* Event puede vincularse a Personas.  
\* Vista de detalle de Task debe mostrar Event relacionado si existe y si el usuario tiene permiso para verlo.  
\* Navegación contextual entre entidades relacionadas.  
\* Back stack sin ciclos infinitos.  
\* Filtrado visual por rol/ámbito: no mostrar relaciones que el usuario no puede ver.  
\* Home puede mostrar tareas y próximos eventos como resumen del Planner.

**\#\#\# DEMO PREMIUM**

\* Usar ejemplos textuales encontrados como datos demo:  
  \* \`Comprar alimento para perro\`.  
  \* \`Mascotas\`.  
  \* \`Mamá\`.  
  \* \`Visita al veterinario — sábado 11:00\`.  
  \* \`Preparar comida para el asado\`.  
  \* \`Asado del sábado 13:00\`.  
\* Mostrar cards de tarea con responsable y responsabilidad.  
\* Mostrar enlace visual “evento relacionado” dentro de detalle de tarea.  
\* Mostrar desde Home un resumen de tareas y próximos eventos.  
\* Mostrar Calendar como sección simple de eventos, sin afirmar día/semana/mes si no viene de otra fuente.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

\* Este documento no menciona AsyncStorage, local state ni service mock.  
\* Para una demo posterior, los datos encontrados podrían cargarse como mock/local, pero esta decisión no está definida por la fuente.  
\* No se deben inventar nombres de métodos ni endpoints desde esta fuente.

**\#\#\# POST\_MVP**

\* Goals, Hitos y tareas que avanzan metas.  
\* Subtareas.  
\* Comentarios.  
\* Adjuntos.  
\* Dependencias entre tareas.  
\* PlantillaTarea como entidad editable o tabla propia.  
\* Verificación avanzada si implica estados distintos a los encontrados.  
\* Geni Planner real.  
\* Geni relacionando, recomendando o automatizando tareas/eventos.  
\* Automatizaciones reales.  
\* Inventory/Assets creando tareas automáticamente.  
\* Participantes avanzados de eventos.  
\* Event → HomeCloud / álbum automático.  
\* Event → Presence real.  
\* Streaks o análisis como “5 días seguidos”.  
\* Recurrencia compleja.

**\#\#\# IGNORAR**

\* No se detallan módulos externos por regla del prompt.  
\* Cuando aparecen como relación futura con Planner, se conservan solo como **\*\*Dependencia externa / no desarrollar en este fragment.\*\***

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \--- | \--- | \--- | \--- | \--- | \--- |  
| Planner tab | Entrada principal al módulo Planner | Abrir Planner | No encontrado | Bottom Nav \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\` | REAL MÍNIMO |  
| Task List / sección de tareas | Tareas, potencialmente agrupadas por Responsabilidad | Abrir detalle de tarea | No encontrado | Desde Planner o Home | DEMO PREMIUM / REAL parcial |  
| Task Card | Tarea, Persona responsable, Responsabilidad, posible Evento relacionado | Abrir detalle | No encontrado | Task Card → Task Detail | DEMO PREMIUM |  
| Task Detail | Tarea y enlaces a entidades relacionadas visibles | Abrir evento relacionado | Relación omitida si no hay permiso; back real | Task Detail → Event Detail | REAL MÍNIMO |  
| Calendar | Eventos familiares y personales | Abrir evento | No encontrado | Planner → Calendar | REAL parcial |  
| Event Card | Evento relacionado con Personas | Abrir detalle | No encontrado | Calendar/Home/Task → Event Detail | DEMO PREMIUM / REAL parcial |  
| Event Detail | Evento y posibles participantes/personas | Volver por stack; abrir relaciones si visibles | Back real; evitar ciclos | Event Detail → entidad relacionada visible | REAL MÍNIMO |  
| TareasHome | Tareas agrupadas por responsabilidad | Abrir tarea | Desaparece al completarse según archivo de comprensión; no hay detalle técnico | Home → Task Detail | REAL parcial / DEMO PREMIUM |  
| ProximosEventos | Próximos eventos | Abrir evento | No encontrado | Home → Event Detail | REAL parcial / DEMO PREMIUM |  
| Briefing con datos Planner | Resumen de tareas/eventos | No encontrado | Resumen diario; Geni real no desarrollar | Home → módulos relevantes si se define después | MOCK / Dependencia externa |  
| QuickActions \`+\` | Panel de acción rápida; Geni fijo | No se encontró crear tarea/evento | No encontrado | Bottom Nav \`+\` | CONTEXTO / no implementar acción desde esta fuente |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \--- | \--- | \--- | \--- | \--- |  
| \`Mamá\` | Planner / People | Responsable visible en tarea o participante de evento | Documento principal §5.1 | DEMO PREMIUM |  
| \`Adulto\` | Planner / Roles | Rol de ejemplo para visibilidad | Documento principal §5.1 | REAL parcial |  
| \`Comprar alimento para perro\` | Tasks | Tarea demo | Documento principal §5.1 | DEMO PREMIUM |  
| \`Mascotas\` | Tasks / Responsabilidad | Agrupación/categoría de tarea | Documento principal §5.1 / §5.2.2 | REAL parcial / DEMO PREMIUM |  
| \`Perro (Toby)\` | Dependencia externa | Relación visual futura desde tarea | Documento principal §5.1 | Dependencia externa / no desarrollar |  
| \`Carnet de vacunación\` | Dependencia externa | Relación visual futura desde tarea/evento | Documento principal §5.1 | Dependencia externa / no desarrollar |  
| \`Visita al veterinario — sábado 11:00\` | Events / Calendar | Evento demo | Documento principal §5.1 | DEMO PREMIUM |  
| \`Veterinaria San Roque\` | Dependencia externa / Event location | Dato visual de evento si se usa como texto simple | Documento principal §5.1 | DEMO PREMIUM como texto; no Presence real |  
| \`alimentar\` | Tasks | Tarea demo dentro de Responsabilidad Mascotas | Documento principal §5.2.2 | DEMO PREMIUM |  
| \`pasear\` | Tasks | Tarea demo dentro de Responsabilidad Mascotas | Documento principal §5.2.2 | DEMO PREMIUM |  
| \`Compras\` | Tasks / Responsabilidad | Categoría/responsabilidad demo | Documento principal §5.3.4 / archivo comprensión | DEMO PREMIUM |  
| \`Limpieza\` | Tasks / Responsabilidad | Categoría/responsabilidad demo | Archivo comprensión | DEMO PREMIUM |  
| \`Preparar comida para el asado\` | Tasks / Home | Tarea demo para navegación Home → Task | Documento principal §5.4.1 | DEMO PREMIUM |  
| \`Asado del sábado 13:00\` | Events / Calendar | Evento relacionado con tarea | Documento principal §5.4.1 | DEMO PREMIUM |  
| \`Cumpleaños de Gaby\` | Events / Tasks | Ejemplo de evento con tareas relacionadas | Documento principal §5.3.3 | POST\_MVP / Geni real |  
| \`3 tareas relacionadas\` | Tasks / Events | Badge/contador de relación sugerida | Documento principal §5.3.3 | POST\_MVP / Geni real |  
| \`Mateo\` | Tasks / People | Persona en pregunta sobre tareas pendientes | Documento principal §5.3.1 / §5.3.2 | POST\_MVP si usado por Geni real; DEMO si solo texto |  
| \`tareas escolares\` | Tasks | Tipo de tarea ejemplo | Documento principal §5.3.2 | POST\_MVP por análisis/streaks |  
| \`Pendiente\` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / requiere mapeo posterior |  
| \`En progreso\` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / contradicción con MVP solicitado |  
| \`Completada\` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / requiere mapeo posterior |  
| \`Cancelada\` | Tasks | Estado visual de tarea | Archivo comprensión OUTPUT 1 | REAL parcial / contradicción con MVP solicitado |  
| \`Programado\` | Events | Estado visual de evento | Archivo comprensión OUTPUT 1 | REAL parcial |  
| \`Completado\` | Events | Estado visual de evento | Archivo comprensión OUTPUT 1 | REAL parcial |  
| \`Cancelado\` | Events | Estado visual de evento | Archivo comprensión OUTPUT 1 | REAL parcial |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \--- | \--- | \--- | \--- | \--- |  
| Abrir Planner desde Bottom Nav | Usuario autenticado con acceso al hogar | Entra al módulo Planner | REAL MÍNIMO | Archivo comprensión OUTPUT 1 / OUTPUT 6 |  
| Abrir tarea desde Home | Usuario con visibilidad sobre la tarea | Abre detalle de tarea | REAL MÍNIMO | Documento principal §5.4.1 |  
| Abrir evento desde detalle de tarea | Usuario con visibilidad sobre el evento | Abre evento relacionado | REAL MÍNIMO | Documento principal §5.4.2 |  
| Volver usando back del sistema | Usuario | Retrocede un nivel real | REAL MÍNIMO | Documento principal §5.4.3 |  
| Ver relación Tarea → Responsable | Coordinador, Adulto, Adolescente según caso, Niño solo propias; Invitado no; Empleado Familiar solo asignadas | Muestra u oculta responsable según rol | REAL parcial | Documento principal §5.5.4 |  
| Ver eventos familiares/personales en Calendar | Usuario con permisos | Muestra eventos permitidos | REAL parcial | Archivo comprensión OUTPUT 1 |  
| Modificar fecha de evento para postergar | No especificado | Cambia fecha; no crea estado \`Postergado\` | REAL parcial / sin UI/API | Source map desde archivo comprensión |  
| Completar tarea | No especificado | Tarea completada / actualiza Home según comprensión | Mencionado indirecto / falta flujo | Archivo comprensión OUTPUT 1 / OUTPUT 4 |  
| Verificar tarea | No especificado | Verificación opcional; “Completada → Estado final” | POST\_MVP o contradicción con MVP del prompt | Archivo comprensión OUTPUT 1 |  
| Geni sugiere agrupar tareas con evento | Usuario confirma o descarta | Sugerencia optativa | POST\_MVP | Documento principal §5.3.3 |  
| Geni sugiere crear tarea de compra | Usuario confirma o descarta | Crea/sugiere tarea desde stock bajo | POST\_MVP / dependencia externa | Documento principal §5.3.4 |  
| Geni sugiere agendar recordatorio de service | Usuario confirma o descarta | Crea/sugiere recordatorio | POST\_MVP / dependencia externa | Documento principal §5.3.4 |  
| Crear automatización relacionada con tareas/eventos | Usuario aprueba explícitamente | Automatización permanente solo con aprobación | POST\_MVP / no desarrollar | Documento principal §5.3.5 |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Home puede mostrar \`TareasHome\`.  
\* \`TareasHome\` se describe como widget de Home con tareas agrupadas por responsabilidad.  
\* Home puede mostrar \`ProximosEventos\`.  
\* \`ProximosEventos\` se describe como widget de Home con próximos eventos.  
\* Briefing puede agregar datos desde Planner, pero **\*\*Geni real no se desarrolla en este fragment.\*\***  
\* El archivo de comprensión indica un data flow: una tarea completada en Planner actualiza widget de tareas y reorganiza Home.  
\* El documento principal muestra navegación \`Home → Tarea → Evento\`.

**\#\#\# More**

\* Planner no vive en More.  
\* Planner vive como tab principal en Bottom Nav.  
\* More contiene otros módulos y Settings, sin acción directa de Planner encontrada en esta fuente.

**\#\#\# Quick Actions**

\* QuickActions existe como botón \`+\` en Bottom Nav.  
\* Geni es slot fijo dentro de QuickActions, según archivo de comprensión.  
\* No se encontró en esta fuente una acción rápida explícita \`crear tarea\` o \`crear evento\`.  
\* Cualquier acción de QuickActions hacia Planner queda pendiente de otras fuentes.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--- | \--- | \--- | \--- | \--- | \--- | \--- |  
| Crear tarea | No definido | No definido | No encontrado | No encontrado | Acción conceptual / sin contrato | Faltante |  
| Editar tarea | No definido | No definido | No encontrado | No encontrado | No encontrado | Faltante |  
| Eliminar tarea | No definido | No definido | No encontrado | No encontrado | No encontrado | Faltante |  
| Completar tarea | No definido | No definido | No encontrado | No encontrado | Mencionado indirecto | Faltante |  
| Verificar tarea | No definido | No definido | No encontrado | No encontrado | Mencionado contradictorio | Faltante / POST\_MVP |  
| Listar tareas | No definido | No definido | No encontrado | No encontrado | No encontrado como API | Faltante |  
| Crear evento | No definido | No definido | No encontrado | No encontrado | Acción conceptual / sin contrato | Faltante |  
| Editar evento | No definido | No definido | No encontrado | No encontrado | Postergar \= modificar fecha | Faltante |  
| Eliminar/cancelar evento | No definido | No definido | No encontrado | No encontrado | No encontrado como API | Faltante |  
| Listar eventos | No definido | No definido | No encontrado | No encontrado | No encontrado como API | Faltante |  
| Ver calendario | No definido | No definido | No encontrado | No encontrado | Feature conceptual | Faltante |  
| Obtener datos para Home | No definido | No definido | No encontrado | No encontrado | Data flow conceptual | Faltante |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \--- | \--- | \--- | \--- | \--- | \--- |  
| Task | responsable / assigned\_to / Persona | no especificado | Persona visible según rol | Mostrar responsable de tarea | REAL parcial |  
| Task | responsabilidad | no especificado | Una única Responsabilidad | Agrupar tareas / mostrar categoría | REAL parcial |  
| Task | event / relación con Event | no especificado | Event relacionado si existe | Enlace en Task Detail | REAL parcial |  
| Task | estado | no especificado | \`Pendiente\`, \`En progreso\`, \`Completada\`, \`Cancelada\` | Badge de estado, con contradicción MVP | REAL parcial / riesgo |  
| Task | subtareas | no especificado | no especificado | No desarrollar | POST\_MVP |  
| Task | comentarios | no especificado | no especificado | No desarrollar | POST\_MVP |  
| Task | adjuntos | no especificado | no especificado | No desarrollar | POST\_MVP |  
| Task | dependencias | no especificado | Si previa no se completa, dependiente bloqueada | No desarrollar | POST\_MVP |  
| Responsabilidad | nombre | no especificado | \`Mascotas\`, \`Compras\`, \`Limpieza\` encontrados | Agrupar tareas | REAL parcial / DEMO PREMIUM |  
| Persona | relación con Task | no especificado | Responsable/asignado | Mostrar responsable | REAL parcial |  
| Persona | relación con Event | no especificado | Participante | Mostrar participantes si se define UI | REAL parcial |  
| Event | participantes / Personas | no especificado | no especificado | Mostrar personas asociadas | REAL parcial |  
| Event | estado | no especificado | \`Programado\`, \`Completado\`, \`Cancelado\` | Badge de evento | REAL parcial |  
| Event | presencia | no especificado | relación externa | No desarrollar Presence real | POST\_MVP / dependencia externa |  
| Event | HomeCloud | no especificado | relación externa | No desarrollar storage/documentos | POST\_MVP / dependencia externa |  
| Calendar | eventos familiares/personales | no especificado | no especificado | Listar eventos | REAL parcial |  
| PlantillaTarea | entidad | no especificado | no especificado | No usar como CRUD MVP desde esta fuente | POST\_MVP / riesgo |  
| Verificacion | opcional | no especificado | \`Completada → Estado final\` | Contradice flow MVP del prompt | Riesgo / no implementar desde esta fuente |  
| TareasHome | tasks agrupadas | no especificado | por Responsabilidad | Widget Home | REAL parcial |  
| ProximosEventos | eventos | no especificado | próximos eventos | Widget Home | REAL parcial |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \--- | \--- | \--- | \--- |  
| Relación no visible por permisos | No mostrar la relación | Documento principal §5.5.1 / §5.5.2 | REAL MÍNIMO |  
| Entidad privada relacionada con entidad familiar | Mostrar contenido privado solo al propietario | Documento principal §5.5.2 | REAL MÍNIMO |  
| Geni cruza dominios con información privada | Omitir información privada de terceros sin mencionar su existencia | Documento principal §5.5.3 | POST\_MVP para Geni; regla de privacidad útil |  
| Tarea familiar → Responsable | Coordinador y Adulto ven; Adolescente ve si propia o familiar; Niño solo propias; Invitado no; Empleado Familiar solo asignadas | Documento principal §5.5.4 | REAL parcial |  
| Evento → Documentos asociados | Coordinador/Adulto ven; Adolescente si participa; Niño no; Invitado según permisos; Empleado Familiar no | Documento principal §5.5.4 | Dependencia externa / no desarrollar documentos |  
| Navegación A → B → C → A | Reutilizar instancia existente de A; no duplicar stack | Documento principal §5.4.3 | REAL MÍNIMO |  
| Back del sistema operativo | Retrocede un nivel real | Documento principal §5.4.3 | REAL MÍNIMO |  
| Task vencida | Vencida no es estado; se calcula por fecha de vencimiento | Source map desde archivo comprensión | REAL parcial / faltan campos |  
| Postergar evento | Equivale a modificar fecha; no existe estado \`Postergado\` | Source map desde archivo comprensión | REAL parcial |  
| Geni intenta completar tarea automáticamente | No puede completar tareas automáticamente | Source map desde archivo comprensión | POST\_MVP / restricción útil |  
| Tarea bloqueada por dependencia | Dependencia puede bloquear si previa no se completa | Archivo comprensión OUTPUT 1 | POST\_MVP |  
| Estado vacío de tareas | No encontrado | — | Faltante |  
| Error al crear/editar/eliminar | No encontrado | — | Faltante |  
| Tarea sin responsable | No encontrado | — | Faltante |  
| Evento sin participantes | No encontrado | — | Faltante |  
| Sin conexión / retry | No encontrado para Planner en esta extracción | — | Faltante |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* Ningún módulo funciona aislado; Planner debe integrarse mediante relaciones navegables.  
\* La coordinación no autoriza acceso indiscriminado.  
\* Toda relación visible debe respetar rol y ámbito.  
\* Si una Tarea pertenece a un Evento, el detalle de la Tarea muestra el Evento.  
\* Toda entidad con relación debe exponer la relación como enlace navegable en su vista de detalle.  
\* Evitar ciclos infinitos en navegación; no duplicar instancias en stack.  
\* El botón back debe retroceder un nivel real.  
\* Las relaciones familiares son informativas y no modifican permisos automáticamente.  
\* No existen relaciones entre hogares; una tarea de un Hogar A no puede relacionarse con un evento del Hogar B.  
\* Un usuario puede pertenecer a múltiples hogares, pero Planner debe operar en contexto del hogar activo.  
\* Geni no debe imponer relaciones automáticas sin consentimiento.  
\* Geni nunca crea automatizaciones permanentes sin aprobación explícita.  
\* Geni no puede completar tareas automáticamente, según source\_map/archivo de comprensión.  
\* Goals, subtareas, comentarios, adjuntos, dependencias, Geni real y automatizaciones reales quedan fuera de este fragment como implementación MVP.  
\* PlantillaTarea aparece como entidad en el conocimiento asociado, pero este documento no confirma las templates MVP como constantes sin CRUD.  
\* Recurrencia simple \`none/daily/weekly/monthly\` no aparece en esta fuente.  
\* Vistas día/semana/mes no aparecen en esta fuente.  
\* No inventar campos, endpoints, pantallas, tabs ni datos demo no presentes.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \--- | \--- | \--- |  
| Pantalla principal de Planner | Codex necesita layout, secciones, tabs y jerarquía visual | Alto |  
| Lista de tareas completa | No hay estructura de filas/cards, filtros ni orden | Alto |  
| Create/Edit Task UI | Falta acción principal para demo interactiva | Alto |  
| Complete Task flow | El prompt lo pide, pero esta fuente no define interacción ni feedback | Alto |  
| Verification Flow MVP | Fuente contradice estados esperados; no aparecen \`awaiting\_verification\` ni \`verified\` | Alto |  
| Estados oficiales en inglés | Fuente trae estados en español y distintos al MVP esperado | Alto |  
| Prioridades | No hay valores ni uso visual | Medio |  
| Fecha límite de tareas | Se menciona vencida como calculada, pero falta campo explícito | Alto |  
| Templates MVP completas | Solo aparecen Compras/Mascotas/Limpieza; faltan Medicación/Estudios/Pagos | Medio |  
| Regla de templates como constantes sin CRUD | No aparece en esta fuente | Medio |  
| Vista día/semana/mes | Calendar aparece, pero no sus vistas | Alto |  
| Crear/Edit/Delete/List Event | No hay contratos ni UI | Alto |  
| Recurrencia simple | No aparece \`none/daily/weekly/monthly\` | Medio |  
| Acciones rápidas desde \`+\` | QuickActions existe, pero no se define crear tarea/evento | Medio |  
| Feedback inmediato | No hay toast, loading, empty state, success/error | Alto |  
| Service contract | No hay nombres de funciones, endpoints ni formato de datos | Alto |  
| API backend | No hay rutas, métodos, request/response ni errores | Alto |  
| Permisos CRUD | Solo hay visibilidad de relaciones, no permisos para crear/editar/completar/eliminar | Alto |  
| UI de Calendar | No hay estructura visual | Alto |  
| Estado vacío | No hay diseño para sin tareas/sin eventos | Medio |  
| Datos demo suficientes | Hay ejemplos sueltos, no dataset completo | Medio |  
| Household activo | Se menciona aislamiento por hogar, pero no cómo Planner recibe household activo | Alto |  
| Error por relación no visible | Se sabe que se omite, pero no hay UI/error state | Medio |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Archivo principal**

\* \`HomePlus — SECCION 5 RELATIONSHIP PHILOSOPHY(1).md\`

Secciones usadas:

\* Metadata del documento.  
\* \`\# 5\. Filosofía de Relaciones del Ecosistema\`.  
\* \`\#\# 5.1 El ecosistema como red de entidades\`.  
\* \`\#\# 5.2 Entidades transversales\`.  
\* \`\#\#\# 5.2.1 Persona\`.  
\* \`\#\#\# 5.2.2 Responsabilidad\`.  
\* \`\#\#\# 5.2.3 Goal\`.  
\* \`\#\#\# 5.2.4 Documento\`.  
\* \`\#\# 5.3 Geni como capa de conexión transversal\`.  
\* \`\#\#\# 5.3.1 Consultar\`.  
\* \`\#\#\# 5.3.2 Analizar\`.  
\* \`\#\#\# 5.3.3 Relacionar\`.  
\* \`\#\#\# 5.3.4 Recomendar\`.  
\* \`\#\#\# 5.3.5 Automatizar\`.  
\* \`\#\# 5.4 Reglas de navegación entre dominios\`.  
\* \`\#\#\# 5.4.1 Principio de «no volver atrás»\`.  
\* \`\#\#\# 5.4.2 Regla de implementación\`.  
\* \`\#\#\# 5.4.3 Evitar ciclos infinitos\`.  
\* \`\#\# 5.5 Límites de privacidad en las relaciones entre módulos\`.  
\* \`\#\#\# 5.5.1 Principio de privacidad individual\`.  
\* \`\#\#\# 5.5.2 Ámbitos de visibilidad\`.  
\* \`\#\#\# 5.5.3 Comportamiento de Geni ante entidades privadas\`.  
\* \`\#\#\# 5.5.4 Tabla de visibilidad por rol en relaciones cruzadas\`.  
\* \`\#\# 5.6 Patrones oficiales de integración entre dominios\`.  
\* \`\#\#\# 5.6.2 Planner ↔ ecosistema\`.  
\* \`\#\# 5.7 Relaciones familiares: informativas, no permisivas\`.  
\* \`\#\# 5.8 Multi-Hogar y aislamiento entre hogares\`.  
\* \`\#\# 5.9 Principios de diseño para nuevas relaciones\`.

**\#\#\# Archivo de comprensión asociado**

\* \`Seccion 5 filsofia de las relaciones(1).txt\`

Secciones/outputs usados:

\* \`HOMEPLUS KNOWLEDGE GRAPH — EXTRACCIÓN COMPLETA\`.  
\* \`OUTPUT 1 — ENTITIES\`.  
\* \`OUTPUT 2 — RELATIONSHIPS\`.  
\* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`.  
\* \`OUTPUT 4 — DATA FLOWS\`.  
\* \`OUTPUT 5 — BUSINESS RULES\`.  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.  
\* \`OUTPUT 7 — MISSING/IMPLIED\`.  
\* \`OUTPUT 8 — GRAPH EDGES\`.

**\#\#\# Source map previo**

\* \`source\_map\_HomePlus\_SECCION\_5\_RELATIONSHIP\_PHILOSOPHY.md\`

Secciones usadas:

\* \`4.7 PLANNER\`.  
\* \`4.8 TASKS\`.  
\* \`4.9 EVENTS\`.  
\* \`4.10 CALENDAR\`.  
\* \`4.11 HOME\`, solo como dependencia directa de Planner.  
\* \`5. Mapa de entidades\`.  
\* \`6. Mapa de relaciones\`.  
\* \`7. Mapa de estados\`.  
\* \`8. Mapa de permisos\`.  
\* \`9. Mapa de flujos\`.  
\* \`10. Mapa de APIs\`.  
\* \`11. Mapa de UI\`.  
\* \`12. Mapa de eventos del sistema\`.  
\* \`13. Restricciones arquitectónicas detectadas\`.  
\* \`17. Contradicciones detectadas\`.  
\* \`18. Información faltante\`.

**\# PLANNER fragment — HomePlus — SECCION 6 UX PHILOSOPHY**

**\#\# 1\. Rol del módulo en la demo**

Información explícita encontrada:

\* Planner es un tab principal dentro de la Bottom Navigation congelada V1: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Planner agrupa internamente \`Tasks\`, \`Calendar\` y \`Goals\`.  
\* \`Goals\` aparece dentro de Planner, pero para este fragment queda como **\*\*POST\_MVP / no desarrollar\*\***, salvo como relación visible si una tarea lo menciona.  
\* Tasks y Calendar son los subdominios de Planner más útiles para demo visual/interactiva.  
\* Tasks representa trabajo pendiente o realizado dentro del hogar.  
\* Calendar administra eventos familiares o personales.  
\* Planner es descrito en el archivo de comprensión como “Núcleo operativo”.  
\* El documento no define Planner como backend completo; lo define principalmente como experiencia visual, navegación, interacción y relaciones entre entidades.  
\* El usuario debe poder usar Tasks y Events con patrones equivalentes: “el usuario que aprendió a usar Tasks debe poder usar Events sin reaprender nada”.  
\* El módulo debe conectarse con Home: Home muestra tareas pendientes propias, próximos eventos y puede conducir al módulo correspondiente.  
\* Home resume información, no administra. Toda información mostrada en Home debe llevar al módulo que la administra.  
\* El valor inmediato del Planner aparece en onboarding y primer uso:  
  \* Adulto ve tareas y eventos del día.  
  \* Adolescente ve su lista personal y puede completar algo.  
  \* Niño ve su lista del día con íconos y completa su primera tarea.  
  \* Coordinador ve tareas pendientes del hogar y próximos eventos.

No encontrado explícitamente:

\* No se encontró un objetivo funcional backend de Planner.  
\* No se encontró contrato de service.  
\* No se encontró endpoint API.  
\* No se encontró modelo técnico final para estado MVP de verificación.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Estructura general de pantalla aplicable a Planner**

Toda pantalla en HomePlus sigue cuatro capas:

1\. **\*\*Capa 1 — Atención\*\***  
   \* Qué necesita saber el usuario ya.  
   \* Máximo 2 elementos.  
   \* Tiempo de lectura menor a 3 segundos.  
   \* Siempre visible sin scroll.

2\. **\*\*Capa 2 — Acción\*\***  
   \* Acción principal \+ acciones rápidas.  
   \* Máximo 3 acciones visibles.  
   \* La acción principal debe estar en zona de pulgar si es de frecuencia diaria.

3\. **\*\*Capa 3 — Contexto\*\***  
   \* Lista de items, métricas, estado.  
   \* Scroll vertical si excede pantalla.  
   \* Agrupado por relevancia, no por cronología.

4\. **\*\*Capa 4 — Exploración\*\***  
   \* Bottom nav \+ enlaces cruzados.  
   \* Navegación a otros dominios, configuración o histórico.  
   \* Nunca compite con Capa 1 o Capa 2\.

**\#\#\#\# Tasks dentro de Planner**

Pantalla detectada: **\*\*Tasks (Planner)\*\***.

Elementos visuales encontrados:

\* Capa 1:  
  \* chip de filtro activo.  
  \* contador de pendientes.  
\* Capa 2:  
  \* checkbox en el primer item.  
  \* acción principal: completar tarea asignada.  
\* Capa 3:  
  \* lista de tareas agrupadas por Responsabilidad.  
  \* lista de tareas del día.  
  \* checkboxes en items.  
\* Capa 4:  
  \* Bottom Nav.  
  \* enlace a Eventos relacionados.  
  \* enlace a Goals relacionados, clasificado como **\*\*POST\_MVP / no desarrollar\*\***.

Reglas visuales específicas:

\* La acción principal de Tasks debe ser completar una tarea asignada.  
\* Completar tarea debe ejecutarse desde un checkbox táctil en el list item.  
\* No debe requerir abrir el detalle.  
\* Tap en list item abre el detalle del item.  
\* El botón \`+\` flotante crea nuevo item del dominio actual.  
\* Crear/editar usa bottom sheet.  
\* Eliminar tarea usa bottom sheet de confirmación: “¿Eliminar esta tarea?”  
\* Cerrar formulario con cambios usa bottom sheet: “Tenés cambios sin guardar. ¿Salir?”  
\* La lista de items tiene scroll vertical infinito con paginación.  
\* La acción principal no debe quedar oculta por scroll.  
\* Si un formulario requiere scroll, guardar/cancelar deben quedar fijos en zona inferior.  
\* Detalle de item usa scroll vertical y acciones frecuentes fijas abajo.

**\#\#\#\# Calendar / Events dentro de Planner**

Pantalla detectada: **\*\*Calendar (Planner)\*\***.

Elementos visuales encontrados:

\* Capa 1:  
  \* próximo evento como card expandida.  
\* Capa 2:  
  \* ver detalle.  
  \* confirmar asistencia.  
\* Capa 3:  
  \* timeline del día/semana.  
\* Capa 4:  
  \* Bottom Nav.  
  \* enlace a Tasks vinculadas.

Reglas visuales específicas:

\* La acción principal de Calendar es ver evento del día.  
\* El primer item de la lista aparece expandido por defecto.  
\* Tap en list item abre detalle.  
\* Crear/editar evento usa bottom sheet.  
\* Eliminar evento recurrente exige confirmación doble: “¿Este evento o toda la serie?” → confirmar.  
\* Calendar vive dentro de Planner, no como tab independiente.  
\* El documento menciona día y semana.  
\* No se encontró vista mes explícita.

**\#\#\#\# Navegación visual**

\* Bottom Navigation congelada V1:  
  \* \`Home\`  
  \* \`People\`  
  \* \`+\`  
  \* \`Planner\`  
  \* \`More\`  
\* Planner tiene ícono 📋 en la tabla de navegación.  
\* El tab Planner lleva a Planner (§24.08).  
\* Planner contiene Tasks, Calendar y Goals.  
\* Responsabilidades no son un dominio independiente; son propiedad de la tarea y eje organizador dentro de Tasks.  
\* El tap en tab activo hace scroll to top \+ refresh en la pantalla actual.  
\* El badge en un tab solo usa colores success o alert; nunca error en la barra de navegación.  
\* Estado activo del tab: ícono filled \+ texto peso 600\.  
\* Estado inactivo: ícono outline \+ texto peso 400\.

**\#\#\#\# Filtros / chips por rol**

Chips encontrados para listas:

\* Coordinador:  
  \* Todo.  
  \* Hoy.  
  \* Mío.  
  \* Por miembro.  
  \* Tipo.  
\* Adulto:  
  \* Todo.  
  \* Hoy.  
  \* Mío.  
\* Adolescente:  
  \* Hoy.  
  \* Mío.  
\* Niño:  
  \* Hoy.  
\* Adulto Mayor:  
  \* Hoy.

Reglas:

\* La densidad se reduce quitando elementos, no achicando fuentes.  
\* Nunca bajar de 14px para body.  
\* Adulto Mayor no usa chips múltiples: un solo botón “Hoy” fijo.

**\#\#\#\# Densidad visual por rol aplicable a Planner**

Items visibles en lista sin scroll:

\* Coordinador: 5–6.  
\* Adulto: 4–5.  
\* Adolescente: 3–4.  
\* Niño: 2–3.  
\* Adulto Mayor: 2–3.

Métricas visibles:

\* Coordinador: carga del hogar, tendencias, presupuesto.  
\* Adulto: mis tareas, eventos próximos.  
\* Adolescente: mis tareas.  
\* Niño: mi lista.  
\* Adulto Mayor: sin métricas.

Badges de estado:

\* Coordinador: todos.  
\* Adulto: propios \+ urgentes del hogar.  
\* Adolescente: solo propios.  
\* Niño: solo propios positivos.  
\* Adulto Mayor: solo alertas.

**\#\#\#\# Accesibilidad visual aplicable**

\* Target táctil mínimo: 44×44px.  
\* Niño: target 48px.  
\* Adulto Mayor: target 56px.  
\* Tamaños mínimos:  
  \* Body Coordinador/Adulto/Adolescente: 16px.  
  \* Body Niño: 18px.  
  \* Body Adulto Mayor: 18px.  
  \* H1 Coordinador/Adulto/Adolescente: 28px.  
  \* H1 Niño: 32px.  
  \* H1 Adulto Mayor: 36px.  
\* Adulto Mayor respeta reducción de movimiento.  
\* Adulto Mayor usa modo de alto contraste.  
\* Todos los gestos deben tener alternativa por tap.  
\* En modo Adulto Mayor: solo tap; swipe, long press y pull-to-refresh desactivados.

**\---**

**\#\#\# 2.2 Datos creíbles**

Datos y ejemplos encontrados explícitamente:

**\#\#\#\# Ejemplos de Tasks**

\* “Tenés 2 tareas para hoy”.  
\* “Preparar comida”.  
\* “Tu primera tarea. Cuando alguien la complete, te avisamos.”  
\* “Primer día completo.”  
\* “Jose, estas son tus tareas para mañana.”  
\* “Luca, tu lista de hoy”.  
\* La tarea puede estar agrupada por Responsabilidad.  
\* Una tarea puede pertenecer a la responsabilidad “Compras”.  
\* Responsabilidades encontradas:  
  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
  \* Vehículos.

**\#\#\#\# Ejemplos de Events / Calendar**

\* “Asado del sábado”.  
\* “Hoy tenés 2 tareas y 1 evento.”  
\* Próximo evento.  
\* Evento del día.  
\* Timeline del día/semana.

**\#\#\#\# Ejemplos de relación Task ↔ Event**

\* “Esta tarea es parte del Asado del sábado →”.  
\* Event muestra “2 tareas dependen de este evento →”.  
\* Flujo ejemplo:  
  \* Home muestra “Tenés que preparar comida para el asado del sábado”.  
  \* Tap abre detalle de tarea.  
  \* En detalle aparece enlace al evento.  
  \* Tap abre detalle del evento.

**\#\#\#\# Datos de miembros/personas útiles para Planner**

\* Task tiene responsable.  
\* Event tiene múltiples participantes.  
\* Person se relaciona con Task.  
\* Person se relaciona con Event.  
\* Tap en avatar abre perfil de la persona.  
\* Avatar de miembro tiene accessibility label: “\[Nombre\], \[rol\]”.

**\#\#\#\# Datos temporales / estados visuales**

\* Tareas para hoy.  
\* Tareas para mañana.  
\* Próximos eventos.  
\* Eventos del día.  
\* Tarea vencida aparece como dato calculado, no como estado persistido.  
\* Task overdue puede mostrarse en Attention Required de Home.

Datos no encontrados:

\* No se encontraron nombres concretos de miembros salvo Jose y Luca.  
\* No se encontraron listas completas de tareas demo.  
\* No se encontraron fechas reales.  
\* No se encontraron horas reales de eventos.  
\* No se encontraron prioridades concretas como Alta/Media/Baja.  
\* No se encontraron templates MVP completas como Estudios, Pagos o Medicación dentro de este documento.

**\---**

**\#\#\# 2.3 Acción interactiva**

Acciones detectadas:

**\#\#\#\# Tasks**

\* Completar tarea asignada.  
  \* Tipo: REAL MÍNIMO para demo.  
  \* Interacción: checkbox táctil en el list item.  
  \* No requiere abrir detalle.  
\* Crear tarea.  
  \* Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.  
  \* Interacción: botón \`+\` flotante del dominio actual o Quick Actions.  
  \* UI: bottom sheet.  
\* Editar tarea.  
  \* Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.  
  \* UI: bottom sheet.  
\* Eliminar tarea.  
  \* Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.  
  \* Protección: confirmación en bottom sheet.  
\* Abrir detalle de tarea.  
  \* Tipo: REAL visual.  
  \* Interacción: tap en list item.  
\* Cambiar responsable.  
  \* Tipo: acción puntual mencionada en navegación Nivel 4\.  
  \* Detalle no encontrado.  
\* Refresh de lista.  
  \* Tipo: interacción UI.  
  \* Interacción: pull down en scroll superior, excepto Adulto Mayor.  
\* Deshacer completado.  
  \* Tipo: interacción de perdón.  
  \* Interacción: botón “Deshacer” en toast durante 5 segundos.  
\* Filtrar tareas.  
  \* Tipo: interacción UI.  
  \* Interacción: chips de filtro.

**\#\#\#\# Calendar / Events**

\* Ver evento del día.  
  \* Tipo: REAL visual.  
  \* Interacción: primer item de lista expandido por defecto.  
\* Ver detalle de evento.  
  \* Tipo: REAL visual.  
  \* Interacción: tap en list item / card.  
\* Crear evento.  
  \* Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.  
  \* UI: bottom sheet.  
\* Editar evento.  
  \* Tipo: REAL/LOCAL según implementación posterior; el documento no define backend.  
  \* UI: bottom sheet.  
\* Eliminar evento recurrente.  
  \* Tipo: POST\_MVP si implica recurrencia compleja; como patrón UX aparece con confirmación doble.  
  \* UI: “¿Este evento o toda la serie?” → confirmar.  
\* Confirmar asistencia.  
  \* Tipo: POST\_MVP / acción visual no desarrollada, porque no hay contrato ni estados de asistencia.  
\* Ver timeline día/semana.  
  \* Tipo: REAL visual.

**\#\#\#\# Navegación**

\* Entrar a Planner desde Bottom Nav.  
\* Entrar a Tasks dentro de Planner.  
\* Entrar a Calendar dentro de Planner.  
\* Task → Event asociado.  
\* Event → Tasks vinculadas.  
\* Home → Detalle de tarea.  
\* Home → Detalle de evento o Planner.  
\* Botón \`+\` central → Quick Actions.  
\* Botón \`+\` flotante del dominio actual → crear nuevo item.

**\---**

**\#\#\# 2.4 Feedback inmediato**

Reglas generales encontradas:

\* Toda acción del usuario debe recibir respuesta en menos de 100ms.  
\* Si la operación tarda más, el sistema acusa recibo en menos de 100ms y luego resuelve.  
\* Ninguna acción queda sin respuesta visual o háptica.  
\* Los botones siempre responden al press, incluso si la acción falla después.  
\* Spinners solo aparecen si la operación excede 300ms.  
\* Antes de 300ms, la UI ya respondió.  
\* Háptico sutil:  
  \* iOS: \`light\`.  
  \* Android: \`clockTick\`.  
\* Nunca usar háptico heavy fuera de emergencia.  
\* HomePlus no usa sonidos propios.

**\#\#\#\# Feedback para Tasks**

\* Tap en botón:  
  \* escala 0.97 → 1.0.  
  \* háptico ligero.  
\* Completar tarea:  
  \* checkbox se rellena.  
  \* háptico.  
  \* tachado.  
  \* toast de confirmación opcional, no bloqueante.  
\* Completar tarea accidental:  
  \* toast con “Deshacer” durante 5 segundos.  
\* Crear tarea:  
  \* item aparece en la lista con opacidad 0 → 1\.  
\* Guardar formulario:  
  \* botón muestra spinner.  
  \* mantiene ancho.  
  \* toast success o error.  
\* Error de red:  
  \* toast informativo inmediato.  
\* Error al guardar:  
  \* háptico warning solo en errores bloqueantes.  
\* Pull-to-refresh completo:  
  \* háptico light al terminar sincronización.

**\#\#\#\# Feedback para Events / Calendar**

\* Crear evento:  
  \* item aparece en la lista con opacidad 0 → 1\.  
\* Guardar formulario:  
  \* spinner si excede 300ms.  
  \* toast success o error.  
\* Ver evento del día:  
  \* primer item expandido por defecto.  
\* Error:  
  \* toast zona superior con slide-down \+ fade-in.  
  \* sin shake.  
  \* sin parpadeo rojo.

**\#\#\#\# Estados UI de componentes**

Estados detectados:

\* NORMAL.  
\* LOADING.  
\* EMPTY.  
\* ERROR.  
\* SUCCESS.

Transiciones detectadas:

\* NORMAL → LOADING:  
  \* skeleton screen si es carga inicial.  
  \* si es refresh, indicador sutil en zona superior sin bloquear UI actual.  
\* LOADING → NORMAL:  
  \* fade-in de contenido de 300ms.  
  \* skeletons se disuelven.  
\* LOADING → ERROR:  
  \* skeleton se reemplaza por mensaje de error \+ botón de reintento.  
\* LOADING → EMPTY:  
  \* si query devuelve 0 resultados, se muestra empty state con acción sugerida.  
\* NORMAL → ERROR:  
  \* toast en zona superior.  
  \* UI actual permanece visible y funcional.  
\* NORMAL → SUCCESS:  
  \* toast o microinteracción local.  
  \* no se reemplaza toda la pantalla.  
\* EMPTY → NORMAL:  
  \* fade-in del primer item.  
  \* acción sugerida del empty state desaparece.  
\* ERROR → NORMAL:  
  \* al reintentar vuelve a LOADING, luego NORMAL.

**\#\#\#\# Animaciones aplicables**

\* Microinteracción de completado:  
  \* checkbox → relleno \+ tachado.  
  \* máximo 400ms.  
  \* no usar en listas con más de 3 items completándose simultáneamente.  
\* Skeleton:  
  \* listas que tardan más de 300ms.  
  \* no en pantallas con datos cacheados.  
\* Cambio empty → normal:  
  \* fade-in 300ms.  
\* Error:  
  \* toast con slide-down \+ fade-in.  
  \* máximo 300ms.  
\* Quick Actions:  
  \* fade in \+ slide up con blur de fondo.  
  \* máximo 200ms.  
\* Duración máxima de cualquier animación: 500ms.  
\* Nada parpadea.  
\* Nada rebota repetidamente.

**\---**

**\#\#\# 2.5 Service aislado**

No se encontró un service explícito nombrado para Planner.

No se encontraron nombres de funciones, endpoints ni contratos.

Información útil encontrada para definir posteriormente un service demo o local:

**\#\#\#\# Datos que Planner debe listar o exponer visualmente**

\* Lista de tareas del día.  
\* Tareas pendientes propias.  
\* Tareas agrupadas por Responsabilidad.  
\* Tareas asignadas a una persona.  
\* Tareas vencidas como dato calculado.  
\* Próximo evento.  
\* Evento del día.  
\* Timeline día/semana.  
\* Eventos próximos.  
\* Tasks vinculadas a un Event.  
\* Event asociado a una Task.

**\#\#\#\# Acciones que Planner ejecuta visualmente**

\* Crear tarea.  
\* Editar tarea.  
\* Eliminar tarea.  
\* Completar tarea.  
\* Deshacer completar tarea.  
\* Abrir detalle de tarea.  
\* Crear evento.  
\* Editar evento.  
\* Eliminar evento.  
\* Abrir detalle de evento.  
\* Refrescar listas.

**\#\#\#\# Datos que Planner entrega a Home**

\* Tareas pendientes propias.  
\* Tareas para hoy.  
\* Tareas vencidas para Attention Required.  
\* Próximos eventos.  
\* Eventos del día.  
\* Resumen para Briefing si se usa como mock/simple.

**\#\#\#\# Data flows detectados desde archivo de comprensión**

\* PlannerModule → Notification:  
  \* dato: Task assigned.  
  \* propósito: notificar a la persona asignada.  
  \* Clasificación: POST\_MVP si implica push/notificación real.  
\* PlannerModule → HomeScreen:  
  \* dato: Task overdue.  
  \* propósito: mostrar en Attention Required.  
  \* Clasificación: REAL visual / puede ser demo local.  
\* HomeScreen → PlannerModule:  
  \* Home resume Planner.  
  \* Clasificación: conexión visible con Home.  
\* Briefing → PlannerModule:  
  \* Briefing agrega información desde Planner.  
  \* Clasificación: para MVP visual, Briefing debe tratarse como MOCK si se usa.

No encontrado:

\* No se encontró storage real.  
\* No se encontró AsyncStorage.  
\* No se encontró mock service explícito.  
\* No se encontró API externa.  
\* No se encontró source of truth técnico.

**\---**

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Entrada principal**

\* Planner se accede desde Bottom Navigation.  
\* Bottom Nav oficial:  
  \* Home.  
  \* People.  
  \* \`+\`.  
  \* Planner.  
  \* More.  
\* Planner es un destino de Nivel 2 / Dominio.  
\* Tasks y Calendar viven dentro de Planner.

**\#\#\#\# Niveles de navegación relevantes**

\* Nivel 0:  
  \* Home.  
  \* Punto de entrada principal.  
  \* Siempre pantalla inicial.  
\* Nivel 1:  
  \* Bottom Nav.  
\* Nivel 2:  
  \* Dominio Planner.  
  \* Subdominios: Tasks, Calendar, Goals.  
\* Nivel 3:  
  \* Task Detail.  
  \* Event Detail.  
\* Nivel 4:  
  \* Acción puntual.  
  \* Editar tarea.  
  \* Cambiar responsable.  
  \* Configuración avanzada.

Restricciones:

\* Más de 4 niveles es fallo de navegación.  
\* 95% de acciones deben resolverse en 3 niveles o menos.  
\* Navegación entre dominios no suma nivel; es movimiento lateral.  
\* Enlaces cruzados abren stack push.  
\* Back vuelve normalmente.  
\* Si A → B → C, el stack es A \> B \> C.  
\* Si B enlaza a A, se reutiliza la instancia existente de A y no se duplica.

**\#\#\#\# Transiciones**

\* Home → Dominio:  
  \* Stack push.  
  \* Slide right → left.  
  \* 250ms ease-out.  
\* Dominio → Detalle:  
  \* Stack push.  
  \* Slide right → left.  
  \* 250ms ease-out.  
\* Detalle → Configuración avanzada:  
  \* Stack push.  
  \* Slide right → left.  
  \* 250ms ease-out.  
\* Cualquier nivel → Crear/Editar:  
  \* Bottom sheet.  
  \* Slide up \+ fade.  
  \* 300ms ease-out.  
\* Cualquier nivel → Confirmación:  
  \* Modal centrado.  
  \* Scale 0.95 → 1 \+ fade.  
  \* 250ms ease-out.  
\* Dominio A → Dominio B:  
  \* Stack push.  
  \* Slide right → left.  
  \* 250ms ease-out.  
\* Botón \`+\` → Quick Actions:  
  \* Panel flotante \+ blur.  
  \* Fade in \+ slide up.  
  \* 200ms ease-out.  
\* Cualquier nivel → Home:  
  \* Pop to root.  
\* Back:  
  \* Stack pop.  
  \* Slide left → right.  
  \* 200ms ease-in.

**\#\#\#\# Navegación cruzada detectada**

\* Task → Event asociado.  
\* Task → Responsabilidad.  
\* Task → Goal.  
  \* Clasificación: POST\_MVP / no desarrollar, salvo label visual si ya existe en mock.  
\* Event → Tasks vinculadas.  
\* Event → Documentos.  
  \* Dependencia externa / no desarrollar en este fragment.  
\* Inventory Item → Task.  
  \* Dependencia externa / no desarrollar en este fragment.  
\* Asset → Tasks.  
  \* Dependencia externa / no desarrollar en este fragment.

**\#\#\#\# Ejemplo explícito de flujo**

\* Usuario en Home ve “Tenés que preparar comida para el asado del sábado”.  
\* Tap → Detalle de la tarea.  
\* En detalle ve enlace “Parte del evento: Asado del sábado →”.  
\* Tap → Detalle del evento.  
\* En evento ve “1 documento pendiente: Lista de compras →”.  
\* Tap → Detalle del documento.  
\* Back → evento → back → tarea → back → Home.

Para este fragment:

\* El tramo Home → Task → Event es útil para Planner.  
\* El tramo Event → Documento queda como **\*\*Dependencia externa / no desarrollar en este fragment\*\***.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

Conexiones encontradas:

\* Home muestra tareas pendientes propias con 1-tap para completar.  
\* Home muestra próximos eventos.  
\* Home muestra “Tenés 2 tareas para hoy”.  
\* Home muestra “Hoy tenés 2 tareas y 1 evento.”  
\* Home puede mostrar tareas agrupadas por Responsabilidad.  
\* Home conduce al módulo correspondiente.  
\* Home no administra Planner.  
\* Attention Required puede mostrar tareas vencidas.  
\* Briefing puede agregar eventos y tareas del día.  
\* Para MVP visual, Briefing debe tratarse como MOCK si se usa en este fragment.

Orden o prioridad de Home desde comprensión:

\* HomeScreen contiene Briefing.  
\* HomeScreen contiene AttentionRequired.  
\* HomeScreen usa PriorityEngine.  
\* HomeScreen resume PlannerModule.  
\* PriorityEngine tiene orden oficial donde Tasks y Events aparecen después de Attention Required y Briefing.

Clasificación:

\* Tareas pendientes en Home: REAL visual / conexión real mínima.  
\* Próximos eventos en Home: REAL visual / conexión real mínima.  
\* Briefing con tareas/eventos: MOCK si se implementa como texto fijo/simple.  
\* Attention Required con tareas vencidas: REAL visual si la app calcula vencidas localmente; no hay backend en documento.

**\#\#\#\# More**

\* Planner no vive en More.  
\* More contiene Finance, Inventory, HomeCloud y Settings.  
\* More no contiene dashboards.  
\* More solo tiene accesos a dominios \+ indicadores rápidos opcionales.  
\* Conexiones de More hacia Planner detectadas:  
  \* Inventory puede generar Task.  
  \* Asset/Maintenance puede generar Task.  
  \* Documentos pueden relacionarse con Event.  
\* Estas conexiones quedan como **\*\*Dependencia externa / no desarrollar en este fragment\*\***.

**\#\#\#\# Quick Actions**

\* Botón \`+\` central de Bottom Nav abre Quick Actions.  
\* Quick Actions es panel flotante con blur.  
\* Geni es slot fijo.  
\* Acciones dinámicas están ordenadas por uso.  
\* Quick Actions permite acceso a crear tarea y crear evento según archivo de comprensión.  
\* Quick Actions se adapta por rol y permisos según archivo de comprensión.  
\* Para este fragment:  
  \* crear tarea desde Quick Actions: DEMO PREMIUM / navegación visible.  
  \* crear evento desde Quick Actions: DEMO PREMIUM / navegación visible.  
  \* Geni no desarrollar como IA real.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

Información que sí sirve para MVP visual/interactivo de Planner:

\* Planner como tab principal en Bottom Nav.  
\* Planner agrupa Tasks y Calendar.  
\* Tasks muestra lista de tareas del día.  
\* Tasks usa checkboxes.  
\* Completar tarea desde list item en 1 tap.  
\* Completar tarea no requiere abrir detalle.  
\* Completar tarea muestra checkbox relleno, háptico y tachado.  
\* Completar tarea tiene “Deshacer” 5 segundos.  
\* Crear tarea/evento muestra item en lista con opacidad 0 → 1\.  
\* Tap en tarea abre detalle.  
\* Tap en evento abre detalle.  
\* Crear/editar tarea o evento usa bottom sheet.  
\* Eliminar tarea pide confirmación.  
\* Calendar muestra evento del día.  
\* Calendar muestra primer item expandido por defecto.  
\* Calendar muestra timeline día/semana.  
\* Home muestra tareas pendientes propias.  
\* Home muestra próximos eventos.  
\* Home puede navegar a detalle de tarea/evento.  
\* Tarea puede tener responsable.  
\* Tarea puede tener fecha.  
\* Tarea puede tener prioridad.  
\* Tarea puede tener estado.  
\* Event tiene participantes múltiples, sin desarrollar participantes avanzados.  
\* Event tiene estados Programado, Completado, Cancelado según archivo de comprensión.  
\* Vencida no es estado de Task; se calcula automáticamente.  
\* Postergado no existe como estado de Event; postergar equivale a modificar fecha.  
\* Responsabilidad es eje organizador interno de Tasks, no dominio separado.

**\#\#\# DEMO PREMIUM**

Información útil para que el módulo parezca completo sin backend perfecto:

\* Lista agrupada por Responsabilidad.  
\* Chips por rol.  
\* Contador de pendientes.  
\* Próximo evento como card expandida.  
\* Timeline día/semana.  
\* Navegación cruzada Task → Event.  
\* Navegación cruzada Event → Tasks vinculadas.  
\* Empty state con acción sugerida.  
\* Skeleton si carga supera 300ms.  
\* Toasts de success/error.  
\* Item creado con fade/opacidad 0 → 1\.  
\* Quick Actions abre crear tarea/evento.  
\* Home muestra “Tenés 2 tareas para hoy”.  
\* Home muestra “Hoy tenés 2 tareas y 1 evento.”  
\* Primer valor por rol:  
  \* Adulto ve tareas y eventos del día.  
  \* Adolescente ve lista personal y completa algo.  
  \* Niño ve lista del día con íconos y completa primera tarea.  
\* Modo Niño con lista simple, íconos grandes y confirmación positiva.  
\* Modo Adulto Mayor con botón explícito, sin gestos, menos items y alto contraste.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

No se encontró mención explícita a AsyncStorage, storage local o mock service.

Información que podría quedar aislada en un service demo en una etapa posterior, sin que el documento lo nombre:

\* listado de tareas.  
\* listado de eventos.  
\* completar tarea.  
\* crear tarea.  
\* editar tarea.  
\* eliminar tarea.  
\* deshacer completar.  
\* crear evento.  
\* editar evento.  
\* eliminar evento.  
\* resumen para Home.  
\* cálculo de tareas vencidas.  
\* filtrado por Hoy/Mío/Por miembro/Tipo.

Estado de esta clasificación:

\* Requiere decisión posterior.  
\* No está definido por el documento.  
\* No hay contrato de persistencia.

**\#\#\# POST\_MVP**

Información valiosa pero no implementable ahora como backend real:

\* Goals dentro de Planner.  
\* Relación Task → Goal.  
\* Goal progress.  
\* Milestones.  
\* TaskDependency.  
\* Subtask.  
\* TaskComment.  
\* TaskAttachment.  
\* TaskTimeline.  
\* TaskRecurrence avanzada.  
\* Recurrencia compleja.  
\* Verificación como configuración avanzada, porque contradice los estados MVP esperados y no define \`awaiting\_verification\`/\`verified\`.  
\* TaskTemplate si implica CRUD o personalización.  
\* Confirmar asistencia si implica estados \`accepted/declined/maybe\`.  
\* Event → Memory.  
\* Event → Document.  
\* Auto-create Memory cuando termina un evento.  
\* Geni task suggestions/rescheduling.  
\* Geni real.  
\* Notificaciones reales/push reales.  
\* Automatizaciones reales.  
\* Auditoría completa.  
\* Offline sync real.

**\#\#\# IGNORAR**

No desarrollar en este fragment:

\* Feed real.  
\* SOS real.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* HomeCloud/FamilyCloud real.  
\* Presence GPS real.  
\* Automations reales.  
\* Offline sync.  
\* OCR/storage real.  
\* Multi-hogar avanzado.

Dependencias externas que pueden aparecer solo como enlace o mención visual:

\* Inventory → Task.  
\* Assets/Maintenance → Task.  
\* Event → Documento.  
\* Event → Memory.  
\* Geni → Planner.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner tab | Entrada al módulo Planner desde Bottom Nav | Tap en Planner | Activo: ícono filled \+ texto 600; inactivo: outline \+ texto 400; badge success/alert | Bottom Nav \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\` | REAL MÍNIMO |  
| Tasks (Planner) | Chip de filtro activo, contador de pendientes, lista de tareas agrupadas por Responsabilidad | Completar con checkbox, abrir detalle, crear con \`+\`, filtrar, refresh | NORMAL, LOADING, EMPTY, ERROR, SUCCESS; skeleton \>300ms; toast | Planner → Tasks; Home → Task Detail; Task → Event | REAL MÍNIMO |  
| Task list item | Tarea, checkbox, posible responsable/fecha/prioridad/estado según comprensión | Checkbox completa; tap abre detalle | Checkbox relleno, háptico, tachado, toast opcional, undo 5s | Tasks list → Task Detail | REAL MÍNIMO |  
| Task Detail | Descripción, responsable, fecha, dependencias, comentarios, timeline, adjuntos según documento; varios elementos son POST\_MVP | Ver enlaces relacionados; editar; cambiar responsable | Scroll vertical; acciones frecuentes fijas abajo | Task Detail → Event asociado; Task Detail → Responsabilidad; Task Detail → Goal POST\_MVP | MIXTO |  
| Create/Edit Task bottom sheet | Formulario de creación/edición; campos concretos no tipados | Guardar, cerrar, cancelar | Spinner si \>300ms; toast success/error; sticky footer; confirmar salida con cambios | Cualquier nivel → bottom sheet | REAL VISUAL / datos faltantes |  
| Delete Task confirmation | Pregunta “¿Eliminar esta tarea?” | Confirmar / cancelar | Bottom sheet; lectura \<2s | Desde Task Detail o acción de tarea | REAL MÍNIMO |  
| Calendar (Planner) | Próximo evento como card expandida; timeline día/semana | Ver detalle, confirmar asistencia, refresh | NORMAL, LOADING, EMPTY, ERROR, SUCCESS; primer item expandido | Planner → Calendar; Calendar → Event Detail | REAL MÍNIMO para día/semana; mes faltante |  
| Event list item / Event card | Evento del día / próximo evento | Tap abre detalle | Expandido por defecto para primer item | Calendar → Event Detail; Home → Event Detail | REAL MÍNIMO |  
| Event Detail | Evento, participantes, enlaces a tasks vinculadas/documentos | Ver tasks vinculadas; editar; cancelar/eliminar | Scroll vertical; acciones frecuentes fijas abajo | Event Detail → Tasks vinculadas; Event → Document externo | MIXTO |  
| Create/Edit Event bottom sheet | Formulario de evento; campos no definidos | Guardar, cerrar, cancelar | Spinner \>300ms; toast success/error; confirmar salida con cambios | Cualquier nivel → bottom sheet | REAL VISUAL / datos faltantes |  
| Delete recurring event confirmation | “¿Este evento o toda la serie?” → confirmar | Elegir instancia/serie, confirmar | Confirmación doble | Event Detail → confirmación | POST\_MVP si implica recurrencia compleja |  
| Home Planner widgets | Tareas pendientes propias, próximos eventos, “Tenés 2 tareas para hoy”, “Hoy tenés 2 tareas y 1 evento” | Tap navega al módulo/detalle; completar tarea 1-tap desde Home | Briefing/no scroll; widgets con scroll en Capa 3; Attention Required | Home → Planner / Task Detail / Event Detail | Dependencia externa / REAL visual |  
| Quick Actions panel | Panel flotante con blur; Geni fijo; acciones dinámicas | Crear tarea; crear evento | Fade in \+ slide up; 200ms; blur | Botón \`+\` central → Quick Actions → bottom sheet | Dependencia externa / DEMO PREMIUM |  
| Empty state de dominio | Explica qué aparecerá y sugiere primera acción | Crear primer item | EMPTY → NORMAL con fade-in primer item | Dentro de Tasks/Calendar | DEMO PREMIUM |  
| Error state | Mensaje de error \+ reintento | Retry | LOADING → ERROR; ERROR → LOADING → NORMAL | Dentro de listas/formularios | DEMO PREMIUM |  
| Adulto Mayor variant | Menos items, botón Hoy fijo, botones visibles, alto contraste | Solo tap; sin pull-to-refresh | Animaciones reducidas, target 56px | Misma navegación; contenido adaptado | DEMO PREMIUM |  
| Niño variant | Lista del día, íconos, completar primera tarea | Completar tarea | Confirmación visual/háptica; sin sonidos | Misma navegación; contenido adaptado | DEMO PREMIUM |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| “Tenés 2 tareas para hoy” | Planner / Tasks / Home | Card Home o header de Tasks | Documento principal §1.5 | DEMO PREMIUM |  
| “Hoy tenés 2 tareas y 1 evento.” | Planner / Home | Briefing mock o resumen del día | Documento principal §6.1 | DEMO PREMIUM |  
| “Preparar comida” | Tasks | Tarea demo vinculada a evento | Documento principal §3.3/3.4 | DEMO PREMIUM |  
| “Asado del sábado” | Events | Evento demo | Documento principal §3.3/3.4 | DEMO PREMIUM |  
| “Esta tarea es parte del Asado del sábado →” | Task Detail | Enlace Task → Event | Documento principal §3.3 | DEMO PREMIUM |  
| “2 tareas dependen de este evento →” | Event Detail | Enlace Event → Tasks | Documento principal §3.3 | DEMO PREMIUM |  
| “Tu primera tarea. Cuando alguien la complete, te avisamos.” | Tasks / Onboarding | Toast tras crear primera tarea | Documento principal §6.2 | DEMO PREMIUM |  
| “Primer día completo.” | Tasks / Home | Reconocimiento por completar 3 tareas | Documento principal §6.2 | POST\_MVP si depende de Geni real; DEMO si texto fijo |  
| “Jose, estas son tus tareas para mañana.” | Tasks / Onboarding por rol | Lista personal adolescente | Documento principal §6.1 | DEMO PREMIUM |  
| “Luca, tu lista de hoy” | Tasks / Onboarding niño | Lista infantil con íconos | Documento principal §6.1 | DEMO PREMIUM |  
| Compras | Responsibility / Tasks | Grupo o categoría de tareas | Documento principal §3.3; comprensión OUTPUT 1 | REAL VISUAL |  
| Mascotas | Responsibility / Tasks | Grupo o categoría de tareas | Comprensión OUTPUT 1 | REAL VISUAL |  
| Limpieza | Responsibility / Tasks | Grupo o categoría de tareas | Comprensión OUTPUT 1 | REAL VISUAL |  
| Vehículos | Responsibility / Tasks | Grupo o categoría de tareas | Comprensión OUTPUT 1 | REAL VISUAL |  
| Pendiente | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / requiere mapeo posterior |  
| En progreso | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / contradice prompt MVP si se usa como estado técnico |  
| Completada | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / requiere mapeo posterior |  
| Cancelada | Task status | Estado de tarea encontrado | Comprensión OUTPUT 1 | REAL VISUAL / requiere mapeo posterior |  
| Programado | Event status | Estado de evento | Comprensión OUTPUT 1 | REAL VISUAL |  
| Completado | Event status | Estado de evento | Comprensión OUTPUT 1 | REAL VISUAL |  
| Cancelado | Event status | Estado de evento | Comprensión OUTPUT 1 | REAL VISUAL |  
| “¿Eliminar esta tarea?” | Tasks | Confirmación de eliminación | Documento principal §1.4 | REAL MÍNIMO |  
| “¿Este evento o toda la serie?” | Events | Confirmación recurrente | Documento principal §1.4 | POST\_MVP / UX disponible |  
| “Tenés cambios sin guardar. ¿Salir?” | Tasks/Events forms | Confirmación al cerrar formulario | Documento principal §1.4 | REAL MÍNIMO |  
| “Completar \[nombre de tarea\]” | Tasks accessibility | accessibilityLabel | Documento principal §7.5 | REAL MÍNIMO |  
| “Marca la tarea como completada” | Tasks accessibility | accessibilityHint | Documento principal §7.5 | REAL MÍNIMO |  
| “Crear \[tarea/evento/gasto\]” | Planner / Quick Actions | accessibilityLabel del botón \`+\` flotante | Documento principal §7.5 | REAL MÍNIMO para tarea/evento |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Completar tarea asignada | Todos según visibilidad; Niño/Adolescente/Adulto explícitos en primer valor | Checkbox se rellena, háptico, tachado, toast opcional | REAL MÍNIMO | Documento §1.1, §1.2, §5.1 |  
| Deshacer completar tarea | Usuario que completó | Toast con “Deshacer” durante 5s | REAL MÍNIMO | Documento §1.4, UX-08 |  
| Crear tarea | Usuario con acceso al dominio; rol no detallado | Item aparece en lista con opacidad 0→1 | REAL/LOCAL; contrato faltante | Documento §1.2, §1.3 |  
| Editar tarea | Usuario con permiso; rol no detallado | Bottom sheet de edición | REAL/LOCAL; contrato faltante | Documento §3.1, §3.2, UX-03 |  
| Eliminar tarea | Usuario con permiso; rol no detallado | Bottom sheet “¿Eliminar esta tarea?” | REAL/LOCAL; contrato faltante | Documento §1.4 |  
| Abrir detalle de tarea | Todos según visibilidad | Navega a Task Detail | REAL VISUAL | Documento §1.3, §3.1 |  
| Cambiar responsable | No especificado | Acción puntual Nivel 4 | REAL VISUAL parcial; falta detalle | Documento §3.1 |  
| Filtrar tareas | Varía por rol | Chip activo cambia lista y accessibilityLabel seleccionado | REAL VISUAL | Documento §2.4, §7.5 |  
| Pull-to-refresh | Todos excepto Adulto Mayor | Indicador sutil; al terminar háptico light | REAL VISUAL | Documento §1.3, §5.1, UX-20 |  
| Ver evento del día | Todos según visibilidad | Primer evento expandido por defecto | REAL MÍNIMO | Documento §1.1 |  
| Crear evento | Usuario con acceso; rol no detallado | Item aparece en lista con opacidad 0→1 | REAL/LOCAL; contrato faltante | Documento §1.2, §1.3 |  
| Editar evento | Usuario con permiso; rol no detallado | Bottom sheet | REAL/LOCAL; contrato faltante | Documento §3.2, UX-03 |  
| Eliminar evento recurrente | Usuario con permiso; rol no detallado | Confirmación doble | POST\_MVP si implica recurrencia compleja | Documento §1.4 |  
| Abrir detalle de evento | Todos según visibilidad | Navega a Event Detail | REAL VISUAL | Documento §1.3, §3.1 |  
| Confirmar asistencia | Usuario participante; no detallado | Acción en Calendar | POST\_MVP / no contrato | Documento §2.1 |  
| Navegar Task → Event | Usuario desde detalle de tarea | Stack push al detalle de evento | DEMO PREMIUM | Documento §3.3/3.4 |  
| Navegar Event → Tasks | Usuario desde detalle de evento | Stack push o enlace a tareas vinculadas | DEMO PREMIUM | Documento §3.3 |  
| Abrir Quick Actions | Todos | Panel flotante con blur | Dependencia externa / DEMO PREMIUM | Documento §3.5, §5.2 |  
| Crear tarea/evento desde Quick Actions | Todos según rol/permisos; no detallado | Abre flujo de creación | Dependencia externa / DEMO PREMIUM | Comprensión OUTPUT 1/7 |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

Qué puede mostrarse en Home desde Planner:

\* Tareas pendientes propias.  
\* Tareas para hoy.  
\* Próximos eventos.  
\* Evento del día.  
\* Attention Required con tareas vencidas.  
\* Briefing simple con tareas/eventos del día.  
\* Widget “Tareas agrupadas por Responsabilidad”.  
\* Texto “Tenés 2 tareas para hoy”.  
\* Texto “Hoy tenés 2 tareas y 1 evento.”

Clasificación:

\* Tareas pendientes propias: REAL visual.  
\* Próximos eventos: REAL visual.  
\* Atención requerida por tareas vencidas: REAL visual si se calcula localmente; no hay backend.  
\* Briefing: MOCK si se usa texto fijo/simple.  
\* Carga Familiar: no desarrollar desde Planner.  
\* Presence: no desarrollar desde Planner.  
\* Actividad Familiar: no desarrollar desde Planner.

Regla clave:

\* Home resume, no administra.  
\* Toda información de Planner mostrada en Home debe conducir a Planner, Task Detail o Event Detail.

**\#\#\# More**

\* Planner no vive en More.  
\* Planner vive en Bottom Nav.  
\* More no debe usarse como entrada principal de Planner.  
\* Integraciones desde More hacia Planner quedan como dependencia externa:  
  \* Inventory puede generar tareas.  
  \* Assets/mantenimiento puede generar tareas.  
  \* HomeCloud/documentos puede relacionarse con eventos.

Clasificación:

\* More: Dependencia externa / no desarrollar en este fragment.

**\#\#\# Quick Actions**

Acciones relacionadas encontradas:

\* Botón \`+\` central abre Quick Actions.  
\* Quick Actions es panel flotante con blur.  
\* Geni es slot fijo.  
\* Acciones dinámicas ordenadas por uso.  
\* Acceso a crear tarea.  
\* Acceso a crear evento.  
\* Quick Actions se adapta por rol y permisos.

Clasificación:

\* Crear tarea desde Quick Actions: DEMO PREMIUM / dependencia externa.  
\* Crear evento desde Quick Actions: DEMO PREMIUM / dependencia externa.  
\* Geni real: POST\_MVP / no desarrollar.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

No se encontraron rutas, métodos, request ni response.

Acciones mencionadas sin contrato API:

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Crear tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |  
| Editar tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |  
| Eliminar tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |  
| Completar tarea | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO visual |  
| Listar tareas | No especificado | No especificada | No especificado | No especificado | Acción deducida por lista visible; sin contrato | REAL VISUAL |  
| Crear evento | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |  
| Editar evento | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |  
| Eliminar evento | No especificado | No especificada | No especificado | No especificado | Acción mencionada sin contrato API | REAL/LOCAL pendiente |  
| Listar eventos | No especificado | No especificada | No especificado | No especificado | Acción deducida por lista/timeline visible; sin contrato | REAL VISUAL |  
| Ver calendario | No especificado | No especificada | No especificado | No especificado | Acción mencionada como UI, sin contrato | REAL VISUAL |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| PlannerModule | contiene | no especificado | Tasks, Calendar, Goals, Responsibility | Organización del módulo | REAL para Tasks/Calendar; Goals POST\_MVP |  
| Task | título | no especificado | no especificado | Mostrar item/list/detail | REAL MÍNIMO |  
| Task | descripción | no especificado | no especificado | Detalle de tarea | REAL VISUAL / opcional no definido |  
| Task | responsable | no especificado | Person / miembro | Asignación, agrupación, avatar | REAL MÍNIMO |  
| Task | fechas | no especificado | hoy, mañana, vencida calculada | Lista de hoy, Home, Calendar si se usa | REAL MÍNIMO |  
| Task | prioridad | no especificado | no especificado | Badge/filtro posible | REAL VISUAL, enum faltante |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/checkbox/filtrado | REAL VISUAL; contradicción con MVP esperado |  
| Task | responsabilidad asociada | no especificado | Compras, Mascotas, Limpieza, Vehículos | Agrupación de lista | REAL VISUAL |  
| Task | goal asociada | no especificado | Goal | Enlace en detalle | POST\_MVP |  
| Task | archivos | no especificado | imágenes, PDFs, archivos, audio según TaskAttachment | Detalle/timeline | POST\_MVP |  
| Task | comentarios | no especificado | comentarios humanos | Detalle/timeline | POST\_MVP |  
| TaskDependency | previa/dependiente | no especificado | bloqueada si previa no se completa | Dependencia entre tareas | POST\_MVP |  
| TaskRecurrence | regla | no especificado | genera nuevas instancias | Configuración avanzada | POST\_MVP salvo recurrencia simple definida en otra fuente |  
| Subtask | progreso | no especificado | calculado automáticamente | Detalle/progreso | POST\_MVP |  
| TaskComment | comentario | no especificado | no especificado | Timeline de tarea | POST\_MVP |  
| TaskAttachment | adjunto | no especificado | imágenes, PDFs, archivos, audio | Detalle de tarea | POST\_MVP |  
| TaskTimeline | actividad | no especificado | automática \+ comentarios humanos | Detalle de tarea | POST\_MVP |  
| TaskVerification | verificación | no especificado | estado final Completada, sin estado separado | Configuración avanzada | POST\_MVP / contradicción MVP |  
| TaskTemplate | plantilla | no especificado | inicialmente solo para Tasks | Nivel 3 / configuración | POST\_MVP si no son constantes MVP definidas |  
| Responsibility | nombre | no especificado | Compras, Mascotas, Limpieza, Vehículos | Agrupar tareas | REAL VISUAL |  
| Responsibility | miembros asignados | no especificado | Person/Membership | Asignación visual | REAL VISUAL parcial; permisos faltan |  
| Calendar | contiene | no especificado | Event | Sub-sección Planner | REAL MÍNIMO |  
| Event | tipo/contexto | no especificado | familiar o personal | List/detail | REAL VISUAL |  
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge/filtrado | REAL VISUAL |  
| Event | participantes | no especificado | múltiples participantes | Avatares/lista | REAL VISUAL; estados de asistencia POST\_MVP |  
| Event | fecha modificable | no especificado | Postergar \= modificar fecha | Editar evento | REAL VISUAL |  
| Person | relación con Task | no especificado | responsable/asignado | Avatar, asignación | Dependencia externa necesaria |  
| Person | relación con Event | no especificado | participante | Avatar/lista participantes | Dependencia externa necesaria |  
| HomeScreen | resume | no especificado | PlannerModule | Home widgets/cards | Dependencia externa necesaria |  
| AttentionRequired | agrega desde Planner | no especificado | tareas vencidas | Home alerta | Dependencia externa necesaria |  
| QuickActions | acciones | no especificado | crear tarea/evento | Panel \`+\` | Dependencia externa / demo |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Completar tarea accidentalmente | Toast con “Deshacer” durante 5 segundos | Documento §1.4 | REAL MÍNIMO |  
| Eliminar tarea | Bottom sheet de confirmación “¿Eliminar esta tarea?” | Documento §1.4 | REAL MÍNIMO |  
| Eliminar evento recurrente | Confirmación doble: “¿Este evento o toda la serie?” → confirmar | Documento §1.4 | POST\_MVP si implica recurrencia compleja |  
| Cerrar formulario con cambios | Bottom sheet “Tenés cambios sin guardar. ¿Salir?” | Documento §1.4 | REAL MÍNIMO |  
| Guardar formulario tarda \>300ms | Botón con spinner, mantiene ancho | Documento §1.2 | REAL VISUAL |  
| Carga inicial tarda \>300ms | Skeleton screen | Documento §5.2/5.3 | DEMO PREMIUM |  
| Refresh | Indicador sutil en zona superior sin bloquear UI | Documento §1.2/5.3 | DEMO PREMIUM |  
| Error de red | Toast informativo inmediato | Documento §1.2 | DEMO PREMIUM |  
| Loading falla | Mensaje de error \+ botón de reintento | Documento §5.3 | DEMO PREMIUM |  
| Query sin resultados | Empty state con acción sugerida | Documento §5.3/6.2 | DEMO PREMIUM |  
| Empty → primer item | Fade-in del primer item; acción sugerida desaparece | Documento §5.3 | DEMO PREMIUM |  
| Tap en botón | Escala 0.97 → 1.0 \+ háptico ligero | Documento §1.2 | REAL VISUAL |  
| Completar tarea | Checkbox relleno \+ háptico \+ tachado | Documento §1.2/5.1 | REAL MÍNIMO |  
| Tarea vencida | No es estado; se calcula automáticamente | Comprensión OUTPUT 5 | REAL VISUAL / regla importante |  
| Event postergado | No existe estado Postergado; postergar equivale a modificar fecha | Comprensión OUTPUT 5 | REAL VISUAL / regla importante |  
| Adulto Mayor usando gestos | Swipe, long press y pull-to-refresh desactivados; cada acción con botón visible | Documento §7.3 | DEMO PREMIUM |  
| List item con swipe/long press | No definido; requiere enmienda a especificación canónica | Documento §1.3 | IGNORAR / no implementar |  
| Listas largas | Scroll vertical infinito con paginación; indicador de carga al final | Documento §2.3 | DEMO PREMIUM |  
| Modal centrado demasiado largo | No debe scrollear; si no cabe, usar bottom sheet | Documento §2.3 | REAL VISUAL |  
| Más de 4 niveles de navegación | Fallo de navegación | Documento §3.1 | Restricción real |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

**\#\#\# Restricciones de interacción**

\* La acción principal de cada pantalla debe ejecutarse con un solo toque.  
\* En Tasks, completar tarea asignada debe hacerse con checkbox táctil en el list item.  
\* En Calendar, ver evento del día debe estar como primer item expandido por defecto.  
\* Si el usuario necesita más de un toque para completar la acción más frecuente, el diseño debe rehacerse.  
\* Las acciones secundarias pueden requerir navegación adicional.  
\* Toda acción debe responder en menos de 100ms.  
\* Spinners solo si la operación excede 300ms.  
\* Ninguna acción queda sin respuesta visual o háptica.  
\* No usar sonidos propios.  
\* No usar heavy haptic fuera de emergencia.

**\#\#\# Restricciones de navegación**

\* Bottom Nav congelada V1: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Planner no debe moverse a More.  
\* Calendar no es tab independiente; vive dentro de Planner.  
\* Más de 4 niveles es fallo de navegación.  
\* 95% de acciones deben resolverse en 3 niveles o menos.  
\* Bottom sheet para crear/editar; pantalla completa solo si el contenido lo exige.  
\* Modal centrado solo para confirmaciones; nunca para formularios.  
\* No usar modal para navegación entre niveles.  
\* Navegación cruzada siempre se abre como stack push.  
\* Back debe funcionar normalmente.

**\#\#\# Restricciones de UI**

\* La acción principal no debe requerir scroll.  
\* Si un formulario requiere scroll, acciones guardar/cancelar fijas en zona inferior.  
\* Nunca scroll horizontal para contenido de lectura.  
\* Scroll horizontal solo para chips de filtro o galería de fotos.  
\* Scroll infinito siempre tiene indicador de carga al final.  
\* La zona superior solo contiene lectura o navegación; nunca la acción principal.  
\* Botón \`+\` flotante siempre en esquina inferior derecha.  
\* Toast en zona superior, no inferior.  
\* Badge de tab nunca usa color error/rojo.

**\#\#\# Restricciones por rol**

\* Diseño por rol, no por feature.  
\* La adaptación es estructural, no solo filtros.  
\* Niño no administra información familiar crítica.  
\* Adulto Mayor mantiene estructura de navegación, pero cambia contenido y presentación.  
\* Adulto Mayor: solo tap, sin gestos.  
\* Adulto Mayor: máximo 3 items visibles en lista sin scroll.  
\* Niño: target táctil 48px.  
\* Adulto Mayor: target táctil 56px.

**\#\#\# Restricciones de dominio**

\* Responsabilidades no son dominio independiente; son propiedad de Task y eje organizador dentro de Tasks.  
\* Home resume, no administra.  
\* Toda información mostrada en Home debe conducir al módulo correspondiente.  
\* Vencida no es estado de Task; se calcula automáticamente.  
\* Postergado no existe como estado de Event; postergar equivale a modificar fecha.  
\* Geni no puede marcar tareas completadas automáticamente.  
\* Subtareas no tienen anidamiento múltiple, pero subtareas quedan POST\_MVP.  
\* Recurrencias generan nuevas instancias y preservan historial, pero recurrencia avanzada queda POST\_MVP.

**\#\#\# Prohibiciones para este fragment**

\* No desarrollar Goals real.  
\* No desarrollar comentarios/adjuntos/timeline/subtareas/dependencias como MVP real.  
\* No desarrollar Geni real.  
\* No desarrollar notificaciones reales.  
\* No desarrollar Inventory/Assets/HomeCloud/Finance.  
\* No desarrollar Feed/SOS/Presence GPS.  
\* No inventar API ni modelos no presentes.  
\* No implementar estados técnicos no resueltos de verification flow.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| Campos técnicos finales de Task | Codex necesita nombres concretos para forms, mocks y state | Debe usar nombres provisionales solo si etapa posterior lo decide; este fragment no los inventa |  
| Tipos de campos de Task | No hay string/date/enum definidos | Forms y validaciones quedan incompletas |  
| Enum de prioridad | Prioridad aparece, pero no sus valores | No se puede diseñar badge real de prioridad sin decisión posterior |  
| Estados MVP de Tasks | Documento dice Pendiente/En progreso/Completada/Cancelada; prompt MVP espera pending/completed/awaiting\_verification/verified | Contradicción crítica para merge posterior |  
| Verification Flow | Documento dice verificación opcional y estado final Completada sin estado separado | No se puede implementar \`awaiting\_verification\`/\`verified\` desde este documento sin otra fuente |  
| Quién puede verificar tareas | MVP pide verificar desde otro usuario autorizado, pero este documento no define rol/permiso | Permisos faltantes |  
| Templates MVP completas | Documento menciona plantillas, pero no define Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos como constantes | Templates quedan incompletas |  
| CRUD de templates | No se debe implementar si es Post-MVP; documento no aclara MVP constants | Riesgo de sobredesarrollar |  
| Campos técnicos de Event | No hay title/start/end/location/description definidos | Crear/editar evento queda visual, no contractual |  
| Recurrencia simple de eventos | Documento menciona evento recurrente, pero no define \`none/daily/weekly/monthly\` | Calendar/Event recurrence no implementable desde este documento |  
| Vista mes | Documento menciona día/semana, pero no mes | MVP Calendar queda incompleto si mes es obligatorio |  
| Tareas con fecha dentro de Calendar | Documento relaciona Tasks y Calendar, pero no define calendario unificado | Requiere decisión posterior |  
| Endpoints/API | No hay rutas, métodos, request ni response | Backend real no se puede derivar |  
| Service contract | No hay service nombrado ni fuente de datos | Para demo debe decidirse local/mock en etapa posterior |  
| Permisos por rol para crear/editar/eliminar | Hay UX por rol, pero no permisos de dominio | No se puede bloquear acciones por rol sin otra fuente |  
| Empty state copy específico de Planner | Se define regla general, pero no texto exacto para Tasks/Calendar | Codex necesitará copy provisional o fuente externa |  
| Error messages específicos | Se define patrón, pero no mensajes concretos | Estados de error quedan genéricos |  
| Datos demo suficientes | Hay frases y ejemplos sueltos, no dataset completo | Hay que completar en merge/prompt posterior sin atribuirlo a este documento |  
| Integración Home exacta | Se define que Home muestra tareas/eventos, pero no contrato de datos | Resumen Home-Planner queda visual/local |  
| Participantes avanzados de eventos | Event tiene múltiples participantes, pero no accepted/declined/maybe | Mantener fuera del MVP real |  
| Confirmar asistencia | Aparece como acción UI, pero sin contrato | Clasificar como POST\_MVP o demo visual no persistente |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Archivo principal**

\* Archivo: \`HomePlus — SECCION 6 UX PHILOSOPHY(1).md\`  
\* Secciones usadas:  
  \* Encabezado del documento: producto, versión, alcance mobile-first.  
  \* \`\#\# 1\. PRINCIPIOS DE INTERACCIÓN\`  
  \* \`\#\#\# 1.1 Regla del 1-tap\`  
  \* \`\#\#\# 1.2 Feedback inmediato\`  
  \* \`\#\#\# 1.3 Previsibilidad\`  
  \* \`\#\#\# 1.4 Perdón\`  
  \* \`\#\#\# 1.5 Progressive Disclosure\`  
  \* \`\#\# 2\. ARQUITECTURA DE PANTALLA\`  
  \* \`\#\#\# 2.1 Jerarquía visual universal\`  
  \* \`\#\#\# 2.2 Zonas de la pantalla\`  
  \* \`\#\#\# 2.3 Reglas de scroll\`  
  \* \`\#\#\# 2.4 Densidad de información por rol\`  
  \* \`\#\# 3\. NAVEGACIÓN\`  
  \* \`\#\#\# 3.1 El modelo de niveles según Final Spec V1\`  
  \* \`\#\#\# 3.2 Transiciones entre niveles\`  
  \* \`\#\#\# 3.3 Navegación contextual entre entidades\`  
  \* \`\#\#\# 3.4 Regla de "no volver atrás"\`  
  \* \`\#\#\# 3.5 Bottom Navigation — Congelado V1\`  
  \* \`\#\# 4\. ADAPTACIÓN POR ROL\`  
  \* \`\#\#\# 4.1 Tabla comparativa de adaptación UX por rol\`  
  \* \`\#\#\# 4.3 Adulto Mayor: diseño asistivo, no solo "fuente grande"\`  
  \* \`\#\# 5\. MICROINTERACCIONES\`  
  \* \`\#\#\# 5.1 Feedback háptico\`  
  \* \`\#\#\# 5.2 Animaciones\`  
  \* \`\#\#\# 5.3 Transiciones entre estados\`  
  \* \`\#\#\# 5.4 Sonidos\`  
  \* \`\#\# 6\. ONBOARDING Y PRIMER VALOR\`  
  \* \`\#\#\# 6.1 Principio: 60 segundos hasta valor visible\`  
  \* \`\#\#\# 6.2 No tutoriales largos\`  
  \* \`\#\#\# 6.3 Flujo de onboarding por rol\`  
  \* \`\#\# 7\. ACCESIBILIDAD\`  
  \* \`\#\#\# 7.1 WCAG objetivo\`  
  \* \`\#\#\# 7.2 Tamaños de fuente mínimos por rol\`  
  \* \`\#\#\# 7.3 Alternativas a gestos\`  
  \* \`\#\#\# 7.5 Etiquetas para lectores de pantalla\`  
  \* \`\#\# 8\. TABLA DE DECISIONES UX TOMADAS\`  
  \* \`\#\# 9\. PRINCIPIOS DE IMPLEMENTACIÓN UX\`

**\#\#\# Archivo de comprensión asociado**

\* Archivo: \`Seccion 6 filosofia ux(1).txt\`  
\* Secciones usadas:  
  \* \`OUTPUT 1 — ENTITIES\`  
  \* \`OUTPUT 2 — RELATIONSHIPS\`  
  \* \`OUTPUT 3 — CROSS\_DOMAIN\_RELATIONSHIPS\`  
  \* \`OUTPUT 4 — DATA FLOWS\`  
  \* \`OUTPUT 5 — BUSINESS RULES\`  
  \* \`OUTPUT 6 — DECISIONS\`  
  \* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`  
  \* CSV final de relaciones.

**\#\#\# Source map generado previamente**

\* Archivo: \`source\_map\_HomePlus\_SECCION\_6\_UX\_PHILOSOPHY.md\`  
\* Secciones consultadas:  
  \* \`\# 4.7 PLANNER\`  
  \* \`\# 4.8 TASKS\`  
  \* \`\# 4.9 EVENTS\`  
  \* \`\# 4.10 CALENDAR\`  
  \* \`\#\# 15\. Información POST\_MVP detectada\`  
  \* \`\#\# 18\. Información faltante\`  
  \* \`\#\# 19\. Recomendación de fragments a generar\`

**\# PLANNER fragment — HomePlus — SECCION 7 AI PHILOSOPHY \- GENI**

**\#\# 1\. Rol del módulo en la demo**

Información explícita o presente en el documento actual:

\* Planner aparece como uno de los dominios autorizados sobre los que opera Geni.  
\* Planner se relaciona con tareas, eventos, carga de trabajo por miembro y coordinación de distribución de tareas.  
\* Geni puede leer, analizar y recomendar sobre Planner, pero no debe convertirse en ejecutor autónomo.  
\* El valor familiar asociado a Planner en este documento es reducir omisiones operativas, detectar acumulación de tareas atrasadas, detectar asimetría de carga y coordinar eventos entre miembros.  
\* El documento enfatiza que Geni no acusa, no culpa y no reemplaza la conversación humana; presenta datos objetivos para que la familia hable.  
\* En este documento, Planner no aparece como una pantalla detallada de CRUD. Aparece principalmente como dominio operativo usado por Geni, Home, Briefing, notificaciones conceptuales y reglas de permisos.

Dependencia externa / no desarrollar en este fragment:

\* Home puede resumir Tasks y Events.  
\* Briefing puede mostrar información de Planner como card/resumen.  
\* People/Members aporta Persona, responsables, participantes, roles y permisos.  
\* Household aporta pertenencia de Task/Event al hogar y separación por hogar.  
\* Geni aporta recomendaciones y análisis, pero IA real queda fuera de este fragment.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

Información encontrada:

\* No se encontró una pantalla explícita de Planner.  
\* No se encontró UI explícita de lista de tareas.  
\* No se encontró UI explícita de crear/editar tarea.  
\* No se encontró UI explícita de calendario con vistas Día/Semana/Mes.  
\* No se encontró UI explícita de crear/editar evento.  
\* Planner aparece como item fijo en Bottom Navigation V1: \`Home\`, \`People\`, \`+\`, \`Planner\`, \`More\`.  
\* Home es pantalla inicial y resume información, no administra.  
\* Toda información en Home conduce al módulo que la administra.  
\* Briefing aparece como primer widget/card de Home.  
\* Briefing puede resumir información de Planner.  
\* Carga Familiar aparece como bloque de Home que muestra distribución de tareas entre miembros.  
\* Atención Requerida aparece como bloque de Home que centraliza elementos urgentes, incluyendo tareas vencidas.  
\* Las notificaciones contextuales pueden aparecer relacionadas con Planner.  
\* Las sugerencias inline pueden aparecer dentro de Planner.

Dependencia externa / no desarrollar en este fragment:

\* Home, Briefing, Atención Requerida y Carga Familiar son conexiones visuales desde Home; no desarrollar Home completo aquí.  
\* Bottom Navigation es navegación global; no desarrollar la navegación global completa aquí.  
\* Geni como pantalla completa vía Quick Actions no es Planner; no desarrollar Geni aquí.

**\#\#\# 2.2 Datos creíbles**

Datos encontrados que pueden servir como mock/demo data sin inventar nuevos ejemplos:

\* Ejemplo de tarea atrasada: \`Pagar servicios\`.  
\* Ejemplo de tareas atrasadas asignadas: \`Hay 3 tareas pendientes asignadas a Juan\`.  
\* Ejemplo de alerta privada por tareas atrasadas: \`Tienes una tarea atrasada: 'Pagar servicios'. ¿La revisas hoy?\`  
\* Ejemplo de patrón de tareas atrasadas: \`Ya van 3 tareas atrasadas. Esto está generando desbalance. ¿Quieres que te ayude a reorganizar? Si no se resuelve, mañana debo informar al Coordinador.\`  
\* Ejemplo de informe al Coordinador: \`Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.\`  
\* Ejemplo de visibilidad familiar en Briefing: \`Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?\`  
\* Ejemplo de conflicto de agenda: \`Tienes dos eventos el mismo día a la misma hora.\`  
\* Ejemplo de conflicto recurrente de agenda: \`Juan y María han tenido conflictos de horario 3 semanas seguidas. ¿Quieren revisar su rutina juntos?\`  
\* Ejemplo de fechas importantes sin registro: \`¿El 15 es el cumpleaños de Sofía? ¿Quieres planear algo?\`  
\* Ejemplo de Coordinador inactivo visible en Briefing: \`El Coordinador lleva 14 días inactivo. ¿Quieren designar un Coordinador temporal?\`  
\* Prioridades encontradas para Task: \`Baja\`, \`Media\`, \`Alta\`, \`Crítica\`.  
\* Estados encontrados para Task: \`Pendiente\`, \`En progreso\`, \`Completada\`, \`Cancelada\`.  
\* Estado calculado: \`Vencida\` no es estado; se calcula.  
\* Estados encontrados para Event: \`Programado\`, \`Completado\`, \`Cancelado\`.  
\* \`Postergado\` no existe como estado de Event; equivale a modificar fecha.  
\* Responsabilidades/áreas operativas encontradas: \`Compras\`, \`Mascotas\`, \`Limpieza\`, \`Vehículos\`.

Datos pedidos por el MVP visual/interactivo pero no encontrados en este documento:

\* No aparecen las templates predefinidas exactas del prompt: \`Limpieza\`, \`Compras\`, \`Mascotas\`, \`Medicación\`, \`Estudios\`, \`Pagos\` como set cerrado MVP.  
\* No aparecen ejemplos concretos de tareas de medicación, estudios o pagos salvo \`Pagar servicios\`.  
\* No aparecen datos de eventos con fecha/hora concreta salvo ejemplos narrativos de conflictos.  
\* No aparecen nombres de calendario, tabs, filtros ni labels visuales de Planner.

**\#\#\# 2.3 Acción interactiva**

Acciones encontradas:

\* Crear tareas.  
  \* Clasificación: POST\_MVP si la acción la ejecuta Geni; REAL si se toma solo como acción humana/base mencionada en el archivo de comprensión.  
\* Reprogramar fechas de tareas.  
  \* Clasificación: POST\_MVP si lo hace Geni; REAL/LOCAL solo como edición humana si otra fuente lo valida.  
\* Sugerir responsables.  
  \* Clasificación: DEMO PREMIUM / POST\_MVP, porque es recomendación de Geni.  
\* Analizar carga de trabajo por miembro.  
  \* Clasificación: DEMO PREMIUM / POST\_MVP, útil como visual de Carga Familiar mock.  
\* Coordinar distribución de tareas.  
  \* Clasificación: DEMO PREMIUM / POST\_MVP, porque aparece asociado a Geni.  
\* Completar tarea.  
  \* Clasificación: REAL como acción humana; prohibido que Geni la ejecute automáticamente.  
\* Reasignar tarea.  
  \* Clasificación: REAL solo si la ejecuta un Adulto, Coordinador o responsable actual según permisos; prohibido que Geni reasigne unilateralmente.  
\* Verificar tarea.  
  \* Clasificación: REAL con contradicción documental; el archivo de comprensión dice que la verificación confirma completitud y pasa a Completada, pero no tiene estado separado.  
\* Crear evento.  
  \* Clasificación: REAL parcial; aparece como acción permitida para Adulto y Adolescente.  
\* Modificar fecha de evento.  
  \* Clasificación: REAL parcial; \`postergar\` equivale a modificar fecha.  
\* Cancelar evento.  
  \* Clasificación: REAL parcial; Geni no puede cancelar sin aprobación.  
\* Detectar eventos solapados.  
  \* Clasificación: DEMO PREMIUM / POST\_MVP si lo hace Geni.  
\* Detectar retraso de evento con otros miembros.  
  \* Clasificación: DEMO PREMIUM / POST\_MVP, ligado a Presence/ubicación.  
\* Mostrar información de Planner en Home/Briefing.  
  \* Clasificación: DEMO PREMIUM / MOCK para Home.  
\* Tocar información en Home para ir al módulo dueño.  
  \* Clasificación: REAL navegación, según regla de Home.

**\#\#\# 2.4 Feedback inmediato**

Señales UX encontradas:

\* Notificación sutil y privada para tarea atrasada.  
\* Alerta privada reforzada para patrón de tareas atrasadas.  
\* Informe informativo al Coordinador.  
\* Visibilidad en Briefing familiar.  
\* Alertas solo cuando se superan umbrales.  
\* Datos siempre visibles para quien tiene permiso de verlos.  
\* Geni no emite juicio de valor; feedback debe usar lenguaje neutral y objetivo.  
\* Ejemplos de mensajes de feedback:  
  \* \`Tienes una tarea atrasada: 'Pagar servicios'. ¿La revisas hoy?\`  
  \* \`Ya van 3 tareas atrasadas. Esto está generando desbalance. ¿Quieres que te ayude a reorganizar? Si no se resuelve, mañana debo informar al Coordinador.\`  
  \* \`Juan tiene 3 tareas atrasadas esta semana. Te informo como Coordinador para que evalúes si corresponde intervenir.\`  
  \* \`Hay 3 tareas sin dueño activo esta semana. Como familia, ¿quieren redistribuirlas?\`  
  \* \`Tienes dos eventos el mismo día a la misma hora.\`

No encontrado:

\* No se encontró loading.  
\* No se encontró toast.  
\* No se encontró success state para crear/completar tarea.  
\* No se encontró error state de Planner.  
\* No se encontró skeleton/spinner/retry.  
\* No se encontró empty state de Planner.  
\* No se encontró estado disabled.

**\#\#\# 2.5 Service aislado**

Pistas encontradas para un service, sin inventar nombres de funciones:

\* El service de Planner podría listar o exponer Tasks como trabajo pendiente o realizado.  
\* El service de Planner podría listar o exponer Events como eventos familiares o personales.  
\* El service de Planner podría permitir acciones humanas/base: crear tarea, completar tarea, reasignar tarea, verificar tarea, crear evento, modificar fecha, cancelar evento.  
\* El service de Planner debe exponer datos que Home pueda resumir: tareas, eventos, tareas vencidas, distribución/carga por miembro.  
\* El service de Planner debe respetar Household, Persona, Membership, Role y permisos.  
\* El service de Planner no debe permitir que Geni complete tareas automáticamente.  
\* El service de Planner no debe permitir que Geni reasigne tareas unilateralmente.  
\* El service de Planner no debe permitir que Geni cancele o modifique eventos sin aprobación.  
\* El documento no menciona endpoints ni contratos API.  
\* El documento no menciona request/response.  
\* El documento no menciona nombres de funciones de service.  
\* Para demo visual/interactiva, la información encontrada alcanza mejor para un service local/mock que para backend real.

**\#\#\# 2.6 Navegación coherente**

Información encontrada:

\* Bottom Navigation V1 está congelado con: \`Home\`, \`People\`, \`+\`, \`Planner\`, \`More\`.  
\* Planner vive como item directo del Bottom Navigation.  
\* Home siempre es pantalla inicial.  
\* Home resume información y no administra.  
\* Toda información en Home conduce al módulo que la administra.  
\* Geni no tiene tab dedicado en Bottom Navigation.  
\* Geni se accede principalmente vía Quick Actions como slot fijo.  
\* Más de 4 niveles de profundidad en navegación es fallo de navegación.  
\* Objetivo de navegación: 95% de acciones en 3 niveles o menos.

Dependencia externa / no desarrollar en este fragment:

\* Bottom Navigation global.  
\* Home global.  
\* Quick Actions/Geni.  
\* More/Settings.

**\#\#\# 2.7 Conexión con Home o More**

Home:

\* Home resume Tasks.  
\* Home resume Events.  
\* Briefing puede resumir Tasks y Events.  
\* Briefing es primer widget de Home.  
\* Carga Familiar muestra distribución de tareas entre miembros.  
\* Atención Requerida centraliza tareas vencidas.  
\* Escalamiento Nivel 4 puede hacer visible un asunto en Briefing familiar.  
\* Tareas atrasadas sin dueño activo pueden aparecer en Briefing familiar.  
\* Home conduce al módulo que administra la información.

More:

\* Planner no aparece como módulo dentro de More en este documento.  
\* More aparece como parte de Bottom Navigation, pero no es el acceso principal a Planner.

Quick Actions:

\* Geni es slot fijo en Quick Actions.  
\* El documento no especifica una Quick Action explícita de crear tarea o crear evento.  
\* Sugerencias de Geni pueden relacionarse con Planner, pero Geni real queda fuera de este fragment.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

Información directamente útil para implementar o simular una experiencia base de Planner sin IA real:

\* Planner como item directo de Bottom Navigation.  
\* Task como entidad de trabajo pendiente o realizado.  
\* Event como entidad de evento familiar o personal.  
\* Task pertenece a Hogar.  
\* Event pertenece a Hogar.  
\* Task se asigna a Persona.  
\* Event tiene participantes Persona.  
\* Task puede tener responsable.  
\* Task puede tener prioridad.  
\* Task puede tener fecha de vencimiento; \`vencida\` se calcula, no es estado.  
\* Crear tarea aparece como acción conceptual/base.  
\* Completar tarea aparece como acción conceptual/base.  
\* Reasignar tarea aparece como acción conceptual/base con restricciones de permisos.  
\* Verificar tarea aparece como acción conceptual/base con contradicción en estados.  
\* Crear evento aparece como acción conceptual/base.  
\* Modificar fecha de evento aparece como acción conceptual/base.  
\* Cancelar evento aparece como acción conceptual/base.  
\* Estados encontrados para Task: \`Pendiente\`, \`En progreso\`, \`Completada\`, \`Cancelada\`.  
\* Estados encontrados para Event: \`Programado\`, \`Completado\`, \`Cancelado\`.  
\* \`Postergado\` no existe como estado de Event; equivale a modificar fecha.  
\* Home puede resumir Tasks y Events y navegar al módulo dueño.  
\* Planner debe respetar roles/permisos.

**\#\#\# DEMO PREMIUM**

Información útil para que Planner parezca más vivo, sin backend ni IA real:

\* Card/mock de tareas atrasadas.  
\* Card/mock de conflicto de agenda.  
\* Card/mock de carga familiar por miembro.  
\* Mensajes neutrales de feedback ante tareas atrasadas.  
\* Visualización de asimetría de carga de tareas.  
\* Resumen de Planner en Briefing mock.  
\* Detección simulada de 3+ tareas atrasadas.  
\* Detección simulada de 2+ eventos solapados.  
\* Detección simulada de tareas sin dueño activo.  
\* Sugerencia simulada de reorganización.  
\* Sugerencia simulada de revisar rutina ante conflicto recurrente.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

Información compatible con estado local o service demo:

\* Lista local de Tasks con estados encontrados.  
\* Lista local de Events con estados encontrados.  
\* Marcar Task como completada localmente.  
\* Cambiar responsable localmente, si se muestra como acción humana autorizada.  
\* Cambiar fecha de Event localmente para representar \`postergar\`.  
\* Cancelar Event localmente.  
\* Calcular \`vencida\` localmente a partir de fecha de vencimiento y estado distinto de Completada.  
\* Calcular badges locales para:  
  \* \`3+ tareas atrasadas\`.  
  \* \`5+ tareas atrasadas\`.  
  \* \`3+ tareas sin dueño activo\`.  
  \* \`\>40% de diferencia de carga\`.  
  \* \`2+ eventos en conflicto\`.  
\* Exponer resumen local a Home:  
  \* tareas pendientes.  
  \* tareas vencidas.  
  \* próximos eventos.  
  \* distribución de tareas por miembro.

**\#\#\# POST\_MVP**

No convertir en MVP real desde este documento:

\* Geni real creando tareas.  
\* Geni real reprogramando fechas.  
\* Geni real sugiriendo responsables con IA.  
\* Geni real analizando carga familiar.  
\* Geni real coordinando distribución de tareas.  
\* Escalamiento completo N1-N4.  
\* Umbrales configurables por hogar.  
\* Notificaciones reales.  
\* Push real.  
\* Auditoría completa.  
\* Recurrencia de Tasks.  
\* Subtareas.  
\* Dependencias de tareas.  
\* Comentarios.  
\* Adjuntos.  
\* Timeline.  
\* Participantes avanzados de eventos.  
\* Detección real de conflictos con IA.  
\* Detección real de retrasos por ubicación.  
\* Integración real de ubicación/presencia.  
\* Automatización real de creación de tareas o eventos.  
\* Búsqueda global contextual real.

**\#\#\# IGNORAR**

\* Se omite el contenido de dominios no solicitados por este fragment.  
\* Se omite cualquier desarrollo de IA real, automatización real, ubicación real, storage real o módulos externos completos.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner en Bottom Navigation | Acceso directo al módulo Planner como tab fijo | Abrir Planner | No encontrado | Bottom Nav: Home / People / \+ / Planner / More | REAL MÍNIMO |  
| Home Briefing relacionado con Planner | Resumen de información importante del hogar, puede incluir Tasks y Events | Abrir módulo dueño desde Home | Versión resumida permanente y versión ampliada cuando hay cambios relevantes | Home → Planner | DEMO PREMIUM / MOCK |  
| Carga Familiar en Home | Distribución de tareas entre miembros | No encontrado | Puede representar asimetría de carga | Home → Planner | DEMO PREMIUM / MOCK |  
| Atención Requerida en Home | Elementos urgentes; incluye tareas vencidas | Abrir detalle/módulo dueño no especificado | Urgencia visual no detallada | Home → Planner | DEMO PREMIUM / MOCK |  
| Notificación privada de tarea atrasada | Mensaje neutral sobre tarea atrasada | Revisar tarea, no especificado como botón | Notificación sutil | Desde notificación hacia Planner no especificado | DEMO PREMIUM |  
| Alerta privada reforzada por patrón | Mensaje de 3 tareas atrasadas y posible reorganización | Ayuda/reorganización no especificada | Alerta más directa | No especificado | DEMO PREMIUM / POST\_MVP |  
| Informe al Coordinador | Datos objetivos de tareas atrasadas | Coordinador decide si interviene | Informativo, sin juicio | No especificado | DEMO PREMIUM / POST\_MVP |  
| Briefing familiar por tareas sin dueño activo | Mensaje familiar neutral para redistribuir | Redistribuir no especificado como acción UI | Visibilidad familiar | Home / Briefing | DEMO PREMIUM / POST\_MVP |  
| Alerta de evento solapado | Informa dos eventos en conflicto | Revisar agenda no especificado | Alerta privada | No especificado | DEMO PREMIUM / POST\_MVP |  
| Task List | No se encontró UI explícita | No encontrado | No encontrado | No encontrado | FALTANTE |  
| Create/Edit Task | No se encontró UI explícita | No encontrado | No encontrado | No encontrado | FALTANTE |  
| Calendar | No se encontró UI explícita | No encontrado | No se encontraron vistas Día/Semana/Mes | Planner implícito | FALTANTE |  
| Create/Edit Event | No se encontró UI explícita | No encontrado | No encontrado | No encontrado | FALTANTE |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| \`Pagar servicios\` | Tasks | Ejemplo de tarea atrasada | Documento principal, 7.3.1 | DEMO PREMIUM |  
| \`Hay 3 tareas pendientes asignadas a Juan\` | Tasks | Copy neutral de estado de tareas | Documento principal, 7.2.2 | DEMO PREMIUM |  
| \`Tienes una tarea atrasada: 'Pagar servicios'. ¿La revisas hoy?\` | Tasks | Notificación privada | Documento principal, 7.3.1 | DEMO PREMIUM |  
| \`Ya van 3 tareas atrasadas...\` | Tasks | Alerta reforzada | Documento principal, 7.3.1 | DEMO PREMIUM / POST\_MVP |  
| \`Juan tiene 3 tareas atrasadas esta semana...\` | Tasks | Informe al Coordinador | Documento principal, 7.3.1 | DEMO PREMIUM / POST\_MVP |  
| \`Hay 3 tareas sin dueño activo esta semana...\` | Tasks/Home | Briefing familiar | Documento principal, 7.3.1 y 7.4.1 | DEMO PREMIUM / POST\_MVP |  
| \`Tienes dos eventos el mismo día a la misma hora.\` | Events/Calendar | Alerta de conflicto simple | Documento principal, 7.4.1 | DEMO PREMIUM / POST\_MVP |  
| \`Juan y María han tenido conflictos de horario 3 semanas seguidas...\` | Events/Calendar | Conflicto recurrente de agenda | Documento principal, 7.6.1 | DEMO PREMIUM / POST\_MVP |  
| \`¿El 15 es el cumpleaños de Sofía? ¿Quieres planear algo?\` | Events/Calendar | Sugerencia de posible evento | Documento principal, 7.4.1 | DEMO PREMIUM / POST\_MVP |  
| \`El Coordinador lleva 14 días inactivo...\` | Home/Planner indirecto | Briefing familiar contextual | Documento principal, 7.4.1 | DEMO PREMIUM / POST\_MVP |  
| \`Baja\` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| \`Media\` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| \`Alta\` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| \`Crítica\` | Tasks | Prioridad | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |  
| \`Pendiente\` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |  
| \`En progreso\` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |  
| \`Completada\` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |  
| \`Cancelada\` | Tasks | Estado | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO con riesgo |  
| \`Vencida\` calculada | Tasks | Badge/derivado visual | Archivo de comprensión, OUTPUT 5 / source\_map | REAL MÍNIMO con riesgo |  
| \`Programado\` | Events | Estado de evento | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| \`Completado\` | Events | Estado de evento | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| \`Cancelado\` | Events | Estado de evento | Archivo de comprensión, OUTPUT 1 | REAL MÍNIMO |  
| \`Compras\` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |  
| \`Mascotas\` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |  
| \`Limpieza\` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |  
| \`Vehículos\` | Tasks/Responsabilidad | Categoría/responsabilidad visual | Archivo de comprensión, OUTPUT 1 | POST\_MVP / dependencia externa |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Crear tarea | Geni según documento; Persona según comprensión | Nueva Task | POST\_MVP si la hace Geni; REAL parcial si la hace usuario | Documento principal 7.2.1; comprensión OUTPUT 4 |  
| Completar tarea | Humano / miembro responsable no detallado | Task pasa a completada | REAL parcial | Documento principal 7.2.2; comprensión OUTPUT 4 |  
| Marcar tarea completada automáticamente | Geni | Prohibido | PROHIBICIÓN | Documento principal 7.2.2 |  
| Reasignar tarea | Adulto, Coordinador o responsable actual según permisos citados | Responsable cambia | REAL parcial con permisos; Geni prohibido unilateralmente | Documento principal 7.2.2 |  
| Sugerir responsable | Geni | Sugerencia visual | DEMO PREMIUM / POST\_MVP | Documento principal 7.2.1 |  
| Reprogramar fecha de tarea | Geni según documento | Fecha modificada | POST\_MVP si la hace Geni; REAL parcial si usuario edita | Documento principal 7.2.1 |  
| Analizar carga de trabajo | Geni | Carga/asimetría visible | DEMO PREMIUM / POST\_MVP | Documento principal 7.2.1, 7.4.1 |  
| Coordinar distribución de tareas | Geni | Recomendación de redistribución | DEMO PREMIUM / POST\_MVP | Documento principal 7.2.1 |  
| Verificar tarea | No especificado | Tarea finalizada/completada | REAL con contradicción | Comprensión OUTPUT 1/4/5; source\_map 4.8 |  
| Crear evento | Adulto / Adolescente | Nuevo Event | REAL parcial | Comprensión OUTPUT 5; source\_map 4.9 |  
| Modificar fecha de evento | No especificado; Geni no sin aprobación | Event actualizado | REAL parcial / POST\_MVP si Geni | Documento principal 7.2.1; source\_map 4.9 |  
| Cancelar evento | No especificado; Geni no sin aprobación | Event cancelado | REAL parcial / POST\_MVP si Geni | Documento principal 7.2.1; source\_map 4.9 |  
| Detectar eventos solapados | Geni | Alerta privada | DEMO PREMIUM / POST\_MVP | Documento principal 7.4.1 |  
| Detectar conflicto recurrente de agenda | Geni | Sugerencia de conversación | DEMO PREMIUM / POST\_MVP | Documento principal 7.6.1 |  
| Mostrar tareas atrasadas en Briefing | Geni/Home | Card/resumen familiar | MOCK / POST\_MVP | Documento principal 7.3.1, 7.4.1 |  
| Abrir Planner desde Home | Usuario | Navega al módulo dueño | REAL navegación | Archivo de comprensión OUTPUT 5 |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Home puede mostrar información de Planner como resumen, no como administración.  
\* Home resume Tasks.  
\* Home resume Events.  
\* Toda información en Home conduce al módulo que la administra.  
\* Briefing es el primer widget de Home.  
\* Briefing puede resumir información de Tasks y Events.  
\* Briefing puede mostrar tareas sin dueño activo cuando el caso escala a visibilidad familiar.  
\* Carga Familiar puede mostrar distribución de tareas entre miembros.  
\* Atención Requerida puede centralizar tareas vencidas.  
\* Para MVP visual/interactivo de Planner, estas conexiones sirven como DEMO PREMIUM/MOCK de entrada y resumen.  
\* IA real de Briefing no debe implementarse desde este fragment.

**\#\#\# More**

\* Planner no vive en More según este documento.  
\* Planner aparece como tab propio en Bottom Navigation.  
\* More es parte de navegación global, pero no es acceso principal de Planner.

**\#\#\# Quick Actions**

\* Geni tiene slot fijo en Quick Actions.  
\* El documento no define Quick Actions concretas de Planner como \`crear tarea\` o \`crear evento\`.  
\* Cualquier acción de Geni sobre Planner debe tratarse como DEMO PREMIUM/POST\_MVP, no como IA real.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / POST\_MVP si Geni |  
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |  
| Reasignar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial con permisos |  
| Verificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL con contradicción |  
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |  
| Modificar fecha de evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |  
| Cancelar evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial |  
| Resumen Planner para Home | No encontrado | No encontrado | No encontrado | No encontrado | Acción conceptual sin contrato API | MOCK / DEMO PREMIUM |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/filtro/lista | REAL MÍNIMO con riesgo |  
| Task | vencida | calculado, no tipo | Se calcula cuando fecha de vencimiento pasó y no está completada | Badge de vencida / Atención Requerida | REAL MÍNIMO con riesgo |  
| Task | prioridad | no especificado | Baja, Media, Alta, Crítica | Badge/filtro/orden visual | REAL MÍNIMO con riesgo |  
| Task | responsable | no especificado | Persona asignada | Avatar/nombre de responsable | REAL MÍNIMO |  
| Task | hogar | no especificado | Pertenece a Hogar | Separación por hogar | REAL MÍNIMO |  
| Task | responsabilidad principal | no especificado | Una única responsabilidad principal | Categoría visual | DEMO PREMIUM / requiere validación |  
| Task | miembros de responsabilidad | no especificado | Responsabilidad puede tener múltiples miembros | Carga por miembro | DEMO PREMIUM / requiere validación |  
| Task | requiere verificación | no especificado | Verificación opcional | Flow de completar/verificar | REAL con contradicción |  
| Verificación | estado final | no especificado | Al verificarse pasa a Completada; no existe estado separado según comprensión | Contradice estados MVP solicitados | REAL con contradicción |  
| PlantillaTarea | categoría/template | no especificado | Plantillas predefinidas, inicialmente solo para Tasks | Presets visuales | REAL mínimo / faltan categorías MVP |  
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge/filtro/lista | REAL MÍNIMO |  
| Event | participantes | no especificado | Persona | Avatares/lista de participantes | REAL parcial |  
| Event | hogar | no especificado | Pertenece a Hogar | Separación por hogar | REAL MÍNIMO |  
| Event | postergado | no aplica | No existe; equivale a modificar fecha | Evitar badge \`postergado\` | REAL MÍNIMO |  
| Calendar | vista | no encontrado | No se encontraron Día/Semana/Mes | Faltante para UI | FALTANTE |  
| Calendar | recurrence | no encontrado | No se encontró none/daily/weekly/monthly | Faltante para Events MVP | FALTANTE |  
| Home/Briefing | resumen de Planner | no especificado | Una card; versión resumida/ampliada | Resumen de tareas/eventos | MOCK / DEMO PREMIUM |  
| Notificación | categoría | no especificado | Planner, Calendar entre categorías | Feedback contextual | POST\_MVP / conceptual |  
| Notificación | prioridad | no especificado | Crítica, Alta, Media, Baja | Severidad visual | POST\_MVP / conceptual |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Una tarea atrasada | Geni no actúa; silencio | Documento principal 7.4 | DEMO PREMIUM / POST\_MVP |  
| 3+ tareas atrasadas del mismo miembro | Alerta privada / reorganización sugerida | Documento principal 7.4.1 | DEMO PREMIUM / POST\_MVP |  
| 5+ tareas atrasadas del mismo miembro | Informe al Coordinador | Documento principal 7.4.1 | DEMO PREMIUM / POST\_MVP |  
| 3+ tareas atrasadas sin dueño activo | Visible en Briefing familiar | Documento principal 7.4.1 | MOCK / POST\_MVP |  
| \>40% diferencia de carga entre miembros | Informe al Coordinador con datos objetivos | Documento principal 7.4.1 y 7.6.1 | DEMO PREMIUM / POST\_MVP |  
| Tarea vencida | No es estado; se calcula | Archivo de comprensión OUTPUT 1/5; source\_map | REAL MÍNIMO con riesgo |  
| Geni intenta completar tarea | Prohibido; completitud es responsabilidad humana | Documento principal 7.2.2 | PROHIBICIÓN |  
| Geni intenta reasignar unilateralmente | Prohibido; solo sugiere | Documento principal 7.2.2 | PROHIBICIÓN |  
| Reasignación efectiva | Requiere acción de Adulto, Coordinador o responsable actual según permisos | Documento principal 7.2.2 | REAL parcial |  
| Verificación de tarea | Comprensión dice que pasa a Completada y no existe estado separado | Archivo de comprensión OUTPUT 1/5; source\_map | REAL con contradicción |  
| 2+ eventos en conflicto para un miembro | Alerta privada | Documento principal 7.4.1 | DEMO PREMIUM / POST\_MVP |  
| 3+ semanas con eventos solapados entre los mismos dos miembros | Sugerencia de conversación | Documento principal 7.6.1 | DEMO PREMIUM / POST\_MVP |  
| 15+ minutos de retraso en evento con otros miembros | Notificación a asistentes | Documento principal 7.4.1 | POST\_MVP |  
| Postergar evento | No existe como estado; equivale a modificar fecha | Archivo de comprensión OUTPUT 1/5; source\_map | REAL parcial |  
| Geni cancela/modifica evento sin aprobación | Prohibido | Documento principal 7.2.1 | PROHIBICIÓN |  
| Calendar Día/Semana/Mes | No encontrado | Source\_map 4.10 | FALTANTE |  
| Tareas con fecha dentro del calendario | No definido explícitamente en este documento | Source\_map 4.10 | FALTANTE |  
| Empty state de Planner | No encontrado | Documento/source\_map | FALTANTE |  
| Error state de Planner | No encontrado | Documento/source\_map | FALTANTE |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* Geni nunca ignora permisos.  
\* El output de Geni se filtra por los permisos del miembro que consulta.  
\* Geni nunca accede a información privada sin autorización.  
\* Información privada no se comparte automáticamente.  
\* Geni nunca marca tareas como completadas automáticamente.  
\* La verificación de completitud es responsabilidad humana.  
\* Geni nunca reasigna tareas unilateralmente.  
\* Geni solo puede sugerir responsables o redistribución de carga.  
\* La reasignación efectiva requiere acción de Adulto, Coordinador o responsable actual según permisos citados.  
\* Geni no toma decisiones operativas sin aprobación humana.  
\* Geni no cancela ni modifica eventos de calendario sin aprobación.  
\* Geni no debe exponer a un miembro frente a todos sin escalamiento previo.  
\* El lenguaje debe ser neutral, objetivo, sin acusaciones ni juicios de valor.  
\* Datos siempre visibles para quien tiene permiso de verlos; las alertas activas solo aparecen al superar umbrales.  
\* Home resume información; no administra.  
\* Toda información en Home conduce al módulo que la administra.  
\* Planner debe respetar pertenencia a Hogar y permisos de Membership/Role.  
\* \`Vencida\` no es estado de Task; es cálculo.  
\* \`Postergado\` no es estado de Event; equivale a modificar fecha.  
\* IA real, automatizaciones reales, notificaciones reales, auditoría completa, ubicación real y detección inteligente real no deben implementarse desde este fragment.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| Pantalla explícita de Planner | Codex necesita layout base | Hay que tomar UI de otra fuente o generar fragment parcial |  
| Task List UI | Necesaria para demo de listar/completar tareas | Falta estructura visual |  
| Create Task UI | Necesaria para acción interactiva principal | Falta formulario/campos/buttons |  
| Edit Task UI | Necesaria para editar/reprogramar | Falta contrato visual |  
| Calendar UI | Necesaria para eventos y calendario | No hay vista implementable en este documento |  
| Vistas Día/Semana/Mes | MVP Planner las pide | No aparecen en esta fuente |  
| Mostrar tareas con fecha en calendario | MVP Planner lo pide | No aparece explícitamente |  
| Recurrencia simple de eventos | MVP pide none/daily/weekly/monthly | No aparece en esta fuente |  
| Templates MVP exactas | MVP pide Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos | Documento solo menciona PlantillaTarea y algunas responsabilidades/categorías |  
| Estados oficiales MVP de Task | Prompt pide pending/completed/awaiting\_verification/verified | Documento trae otros estados y contradice verificación separada |  
| Tipos de campos | Codex necesita modelo local/API | La fuente no tipa campos |  
| Endpoint/API | Codex necesita integración backend si fuera real | No hay método/ruta/request/response |  
| Permisos detallados por rol para Planner | Necesario para bloquear acciones | Solo hay permisos parciales y restricciones de Geni |  
| Error states | Necesarios para UX robusta | No encontrados |  
| Loading/skeleton/toast | Necesarios para feedback inmediato | No encontrados |  
| Empty state | Necesario si no hay tareas/eventos | No encontrado |  
| Datos demo suficientes de eventos | Necesarios para calendario creíble | Solo hay ejemplos de conflictos, no eventos normales |  
| Criterio exacto de completar/verificar | Necesario para Verification Flow | Contradicción entre fuente y estados MVP del prompt |  
| Service contract | Necesario para aislar lógica | Solo hay pistas conceptuales |  
| Navegación interna de Planner | Necesaria para tabs o stack | Solo se encuentra acceso global por Bottom Nav |

**\---**

**\#\# 13\. Fuente**

Archivo principal:

\* \`HomePlus — SECCION 7 AI PHILOSOPHY \- GENI(1).md\`

Secciones usadas del archivo principal:

\* \`7.1 Definición de Geni\`  
\* \`7.1.1 Qué es Geni\`  
\* \`7.1.2 Qué NO es Geni\`  
\* \`7.2 Capacidades y Restricciones\`  
\* \`7.2.1 Tabla de Capacidades por Dominio\`  
\* \`7.2.2 Restricciones Absolutas\`  
\* \`7.3 Sistema de Escalamiento\`  
\* \`7.3.1 Los Cuatro Niveles\`  
\* \`7.3.3 Tiempos de Referencia para Problemas Leves\`  
\* \`7.3.4 Prevención vs. Exposición\`  
\* \`7.4 Umbrales de Intervención\`  
\* \`7.4.1 Tabla de Triggers, Umbrales y Acciones\`  
\* \`7.4.2 Umbrales Configurables\`  
\* \`7.5.4 Cómo Contextualiza Geni\`  
\* \`7.6 Guardrails\`  
\* \`7.6.1 Detección de Conflictos Operativos\`

Archivo de comprensión asociado:

\* \`Seccion 7 Filosofia de la ai \- geni(1).txt\`

Secciones usadas del archivo de comprensión:

\* \`OUTPUT 1 — ENTITIES\`  
\* \`OUTPUT 2 — RELATIONSHIPS\`  
\* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`  
\* \`OUTPUT 4 — DATA FLOWS\`  
\* \`OUTPUT 5 — BUSINESS RULES\`  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
\* \`OUTPUT 7 — IMPLEMENTATION NOTES\`

Source map usado:

\* \`source\_map\_HomePlus\_SECCION\_7\_AI\_PHILOSOPHY\_GENI.md\`

Secciones usadas del source map:

\* \`4.7 PLANNER\`  
\* \`4.8 TASKS\`  
\* \`4.9 EVENTS\`  
\* \`4.10 CALENDAR\`  
\* \`4.11 HOME\`  
\* \`6. Mapa de relaciones\`  
\* \`7. Mapa de estados\`  
\* \`12. Mapa de eventos del sistema\`  
\* \`13. Restricciones arquitectónicas detectadas\`  
\* \`17. Contradicciones detectadas\`  
\* \`18. Información faltante\`  
\* \`19. Recomendación de fragments a generar\`

**\# PLANNER fragment — SECCION 8 DATA PHILOSOPHY**

**\#\# 1\. Rol del módulo en la demo**

**\#\#\# Información encontrada**

\* Planner aparece como parte del sistema del hogar: el hogar contiene Planner y Planner contiene Task y Calendar, según el archivo de comprensión.  
\* El documento principal no define una pantalla funcional de Planner, pero sí clasifica tareas y eventos como datos centrales de coordinación del hogar.  
\* Las tareas, eventos y gastos se guardan porque son “el núcleo de coordinación”. Para este fragment, solo se extrae Tasks / Events / Calendar.  
\* Las tareas del hogar y los eventos del hogar pertenecen a datos de coordinación: son visibles para quienes necesitan coordinar.  
\* Las tareas personales y eventos personales pertenecen a datos personales: son privados por defecto y el miembro decide si los comparte.  
\* Las tareas completadas y los eventos pasados son memoria histórica / narrativa del hogar.  
\* El Planner se conecta con Home porque Home “resume, no administra” y contiene bloques de Próximos Eventos y Tareas.  
\* El Planner se conecta con Bottom Nav porque existe navegación congelada V1: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* El Planner se conecta con Quick Actions porque el botón \`+\` permite seleccionar acciones que llevan a formularios modales de creación, incluyendo crear tarea y crear evento.

**\#\#\# Valor mostrado al usuario**

\* Coordinación familiar mediante tareas y eventos.  
\* Memoria del hogar mediante historial permanente de tareas completadas y eventos pasados.  
\* Privacidad por defecto para tareas/eventos personales.  
\* Visibilidad compartida para tareas/eventos del hogar.  
\* Eliminación segura mediante papelera de 30 días.

**\#\#\# Problema familiar que resuelve**

\* Coordinar responsabilidades y eventos del hogar sin mezclar datos personales con datos compartidos.  
\* Evitar pérdida accidental de tareas/eventos mediante papelera.  
\* Evitar que lo completado o lo vivido se pierda del historial familiar.

**\#\#\# Qué debe sentir el usuario**

\* No aparece una emoción de UI específica para Planner en este documento.  
\* Sí aparece una intención de confianza: los datos del hogar son tratados como propios de la familia, con control, privacidad, trazabilidad y portabilidad.

**\#\#\# Importancia dentro del ecosistema**

\* Planner es una fuente directa para Home.  
\* Planner participa en auditoría, exportación, RLS y privacidad por defecto.  
\* Planner se apoya en People/Members para responsables, permisos, roles y visibilidad.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Pantallas / secciones detectadas**

\* **\*\*Planner\*\***: aparece como tab directo en Bottom Nav.  
\* **\*\*Calendar\*\***: aparece como feature de Planner que administra eventos familiares y personales.  
\* **\*\*Home → Próximos Eventos\*\***: bloque de Home relacionado con Events.  
\* **\*\*Home → Tareas\*\***: bloque de Home relacionado con Tasks.  
\* **\*\*Home → Atención Requerida\*\***: bloque que centraliza urgentes, incluyendo tareas vencidas.  
\* **\*\*Quick Actions (+)\*\***: panel flotante / selector de acción que deriva a formulario modal de creación.

**\#\#\#\# Cards / widgets / bloques detectados**

\* Home contiene:  
  \* Briefing.  
  \* Atención Requerida.  
  \* Carga Familiar.  
  \* Próximos Eventos.  
  \* Tareas.  
  \* Presence Resumido.  
  \* Actividad Familiar.  
\* Para este fragment, solo se extraen como dependencias visibles de Planner:  
  \* Próximos Eventos.  
  \* Tareas.  
  \* Atención Requerida cuando muestra tareas vencidas.  
  \* Carga Familiar cuando deriva de distribución de tareas.  
  \* Briefing cuando referencia tareas/eventos.

**\#\#\#\# Headers / tabs / navegación visual**

\* Bottom Nav V1 congelado: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`+\` representa Quick Actions.  
\* Home no administra información: resume y redirige al módulo correspondiente.  
\* Regla de navegación detectada: más de 4 niveles de navegación es fallo; objetivo 95% de acciones en ≤3 niveles.

**\#\#\#\# Listas / filtros / badges / iconos / labels**

\* No se encontró UI explícita para lista de tareas.  
\* No se encontró UI explícita para lista de eventos.  
\* No se encontraron filtros/tabs internos de Planner.  
\* No se encontraron badges visuales específicos, salvo estados conceptuales.  
\* No se encontraron iconos de Planner.

**\#\#\#\# Estados visibles detectados**

\* Task:  
  \* Pendiente.  
  \* En progreso.  
  \* Completada.  
  \* Cancelada.  
  \* Vencida calculada.  
  \* Activa.  
  \* Eliminada.  
\* Event:  
  \* Programado.  
  \* Completado.  
  \* Cancelado.  
  \* Futuro.  
  \* Pasado.  
  \* Eliminado.  
  \* Recurrente como caso especial.  
\* Papelera:  
  \* 30 días para tareas y eventos eliminados.

**\#\#\#\# Textos o labels encontrados**

\* “este evento”.  
\* “toda la serie”.  
\* “Completada \= histórico”.  
\* “Eliminada \= papelera 30 días → borrado”.  
\* “Pasado \= histórico”.  
\* “Eliminado \= papelera 30 días → borrado”.  
\* “Tareas del hogar”.  
\* “Tareas personales”.  
\* “Eventos del hogar”.  
\* “Eventos personales”.  
\* “Próximos Eventos”.  
\* “Tareas”.  
\* “Atención Requerida”.  
\* “Carga Familiar”.

**\---**

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Datos / categorías encontradas para Tasks**

\* Tareas del hogar.  
\* Tareas personales.  
\* Tareas activas.  
\* Tareas completadas.  
\* Tareas eliminadas.  
\* Tareas vencidas, como estado calculado desde el archivo de comprensión.  
\* Responsabilidad como eje organizador de tareas.  
\* Responsabilidades / áreas operativas encontradas:  
  \* Compras.  
  \* Mascotas.  
  \* Limpieza.  
  \* Vehículos.

**\#\#\#\# Datos / categorías encontradas para Events / Calendar**

\* Eventos del hogar.  
\* Eventos personales.  
\* Eventos futuros.  
\* Eventos pasados.  
\* Eventos eliminados.  
\* Eventos recurrentes.  
\* Evento individual.  
\* Serie completa.  
\* Calendar administra eventos familiares y personales.

**\#\#\#\# Ejemplos familiares concretos encontrados**

\* “el asado del sábado”.  
\* “el cumpleaños de la abuela”.

**\#\#\#\# Datos de miembros / roles útiles para Planner**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Persona participa en uno o más hogares.  
\* Persona tiene rol.  
\* Task referencia Persona.  
\* Event referencia Persona.  
\* Adulto puede crear/reasignar tareas y crear eventos.  
\* Adolescente administra tareas propias y puede crear eventos familiares.  
\* Coordinador puede eliminar cualquier tarea.  
\* Creador o Coordinador puede eliminar eventos.  
\* Empleado Familiar puede completar tareas y no puede crear tareas.

**\#\#\#\# Datos de Home útiles para Planner**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Home muestra Próximos Eventos.  
\* Home muestra Tareas.  
\* Home puede mostrar tareas vencidas dentro de Atención Requerida.  
\* Carga Familiar deriva de Task.  
\* Briefing referencia Task y Event.

**\#\#\#\# Datos no encontrados**

\* No se encontraron nombres concretos de tareas de demo.  
\* No se encontraron nombres concretos de eventos de demo, salvo ejemplos narrativos de eventos familiares.  
\* No se encontraron prioridades.  
\* No se encontraron fechas límite de tareas.  
\* No se encontró lista completa de templates MVP requerida por el prompt.  
\* No se encontró “Medicación”, “Estudios” ni “Pagos” como templates de Task.  
\* “Compras”, “Mascotas” y “Limpieza” aparecen como responsabilidades/áreas, no como templates MVP.

**\---**

**\#\#\# 2.3 Acción interactiva**

**\#\#\#\# Acciones detectadas para Tasks**

| Acción | Qué se encontró | Clasificación |  
| \------ | \--------------- | \------------- |  
| Crear tarea | Toda acción de crear datos del hogar genera auditoría; Quick Actions puede abrir formulario modal de creación de tarea; Geni puede crear Task en comprensión. | REAL parcial / DEMO para Quick Actions / POST\_MVP para Geni real |  
| Modificar tarea | Toda acción de modificar datos del hogar genera auditoría. | REAL parcial |  
| Eliminar tarea propia | Cualquier miembro puede eliminar sus propias tareas. | REAL MÍNIMO |  
| Eliminar cualquier tarea | Coordinador puede eliminar cualquier tarea. | REAL MÍNIMO |  
| Recuperar tarea eliminada | Tarea eliminada va a papelera 30 días y es recuperable por dueño o Coordinador. | REAL MÍNIMO |  
| Completar tarea | Existe estado/retención de tareas completadas; no se describe flujo de completar. | REAL parcial / faltante de flujo |  
| Compartir tarea personal | Tareas personales pueden compartirse con miembros específicos o todo el hogar. | POST\_MVP / permisos finos |  
| Cambiar tarea del hogar a personal | Tareas del hogar visibles por todos; el creador puede cambiar a “personal”. | POST\_MVP / permisos finos |  
| Exportar tareas | Tareas propias y tareas del hogar pueden exportarse según permisos. | POST\_MVP |  
| Asignar/reasignar tarea | Adulto puede crear/reasignar tareas según archivo de comprensión. | REAL parcial / falta UI y contrato |

**\#\#\#\# Acciones detectadas para Events / Calendar**

| Acción | Qué se encontró | Clasificación |  
| \------ | \--------------- | \------------- |  
| Crear evento | Toda acción de crear datos del hogar genera auditoría; Quick Actions puede abrir formulario modal de creación de evento. | REAL parcial / DEMO para Quick Actions |  
| Modificar evento | Toda acción de modificar datos del hogar genera auditoría. | REAL parcial |  
| Eliminar evento | Creador o Coordinador puede eliminar evento. | REAL MÍNIMO |  
| Eliminar evento recurrente individual | Al eliminar evento recurrente, el usuario elige “este evento”. | REAL parcial |  
| Eliminar serie recurrente | Al eliminar evento recurrente, el usuario elige “toda la serie”. | POST\_MVP si excede recurrencia simple |  
| Exportar eventos | Eventos propios y eventos del hogar pueden exportarse; eventos soportan iCalendar. | POST\_MVP |  
| Compartir evento personal | Eventos personales pueden compartirse con miembros específicos o todo el hogar. | POST\_MVP / permisos finos |  
| Cambiar evento del hogar a personal | Eventos del hogar visibles por todos; el creador puede cambiar a “personal”. | POST\_MVP / permisos finos |

**\#\#\#\# Acciones de navegación detectadas**

| Acción | Resultado visible | Clasificación |  
| \------ | \----------------- | \------------- |  
| Tocar Planner en Bottom Nav | Navega a Planner. | REAL MÍNIMO |  
| Tocar \`+\` en Bottom Nav | Abre Quick Actions. | DEMO PREMIUM / LOCAL |  
| Seleccionar crear tarea en Quick Actions | Abre formulario modal de creación. | DEMO PREMIUM / LOCAL |  
| Seleccionar crear evento en Quick Actions | Abre formulario modal de creación. | DEMO PREMIUM / LOCAL |  
| Tocar bloque de Home relacionado con tareas/eventos | Home redirige al módulo correspondiente. | DEMO PREMIUM / REAL parcial |

**\---**

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Feedback / estados encontrados**

\* Papelera 30 días para tarea eliminada.  
\* Papelera 30 días para evento eliminado.  
\* Tarea eliminada recuperable por dueño o Coordinador.  
\* Evento eliminado va a papelera 30 días.  
\* En evento recurrente, al eliminar se muestra una decisión: “este evento” o “toda la serie”.  
\* Tarea completada queda como histórico.  
\* Evento pasado queda como histórico.  
\* Tarea vencida es calculada, según archivo de comprensión.  
\* Evento postergado no existe, según archivo de comprensión.

**\#\#\#\# Feedback no encontrado**

\* No se encontraron toasts.  
\* No se encontraron mensajes de success.  
\* No se encontraron mensajes de error.  
\* No se encontraron skeletons.  
\* No se encontraron spinners.  
\* No se encontraron loading states.  
\* No se encontraron disabled states.  
\* No se encontraron empty states.  
\* No se encontró retry.  
\* No se encontraron estados de red.

**\---**

**\#\#\# 2.5 Service aislado**

**\#\#\#\# Datos que el service podría listar, según información encontrada**

\* Tareas del hogar.  
\* Tareas personales.  
\* Tareas activas.  
\* Tareas completadas.  
\* Tareas eliminadas en papelera.  
\* Tareas vencidas calculadas.  
\* Eventos del hogar.  
\* Eventos personales.  
\* Eventos futuros.  
\* Eventos pasados.  
\* Eventos eliminados en papelera.  
\* Eventos recurrentes.  
\* Calendar con eventos familiares y personales.

**\#\#\#\# Acciones que el service podría ejecutar, según información encontrada**

\* Crear tarea, como acción auditable, pero sin contrato API.  
\* Modificar tarea, como acción auditable, pero sin contrato API.  
\* Eliminar tarea propia.  
\* Eliminar cualquier tarea si el usuario es Coordinador.  
\* Recuperar tarea de papelera si el usuario es dueño o Coordinador.  
\* Crear evento, como acción auditable, pero sin contrato API.  
\* Modificar evento, como acción auditable, pero sin contrato API.  
\* Eliminar evento si el usuario es creador o Coordinador.  
\* Eliminar evento recurrente como “este evento” o “toda la serie”.  
\* Exportar tareas/eventos, clasificado como POST\_MVP.

**\#\#\#\# Resumen que entrega a Home**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Próximos eventos.  
\* Tareas.  
\* Tareas vencidas para Atención Requerida.  
\* Datos de tareas para Carga Familiar.  
\* Tareas/eventos para Briefing.

**\#\#\#\# Integraciones detectadas**

\* Home resume y redirige a Planner.  
\* Quick Actions abre formularios modales para crear tarea/evento.  
\* Bottom Nav incluye Planner.  
\* RLS filtra por permisos del miembro.  
\* Auditoría registra acciones importantes.  
\* Exportación puede exportar Tasks y Events.

**\#\#\#\# Endpoints**

\* No se encontró contrato API explícito.  
\* No se encontraron rutas.  
\* No se encontraron request/response.  
\* No se encontraron nombres de funciones service.

**\#\#\#\# Tipo de service recomendado desde este documento**

\* El documento no menciona services.  
\* Por ausencia de API y UI detallada, el fragment solo soporta un service local/mock para demo visual, más restricciones reales para permisos, visibilidad, retención y papelera.

**\---**

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Entrada al módulo**

\* Planner se accede desde Bottom Nav.  
\* Bottom Nav V1: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.

**\#\#\#\# Entrada rápida**

\* Quick Actions se abre desde el botón \`+\`.  
\* Quick Actions deriva a formulario modal de creación.  
\* La selección de acción puede llevar a crear tarea o crear evento.

**\#\#\#\# Relación con Home**

\* Home no administra información: resume y redirige al módulo correspondiente.  
\* Home contiene bloques que pueden mostrar datos de Planner:  
  \* Próximos Eventos.  
  \* Tareas.  
  \* Atención Requerida, si hay tareas vencidas.  
  \* Carga Familiar, derivada de Task.  
  \* Briefing, si referencia Task/Event.

**\#\#\#\# Relación con More**

\* More aparece como pantalla con herramientas especializadas y Settings.  
\* No se encontró que Planner viva dentro de More.  
\* No se encontró card de Planner dentro de More.

**\#\#\#\# Reglas de navegación detectadas**

\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones ≤3 niveles.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

\* Home puede mostrar Próximos Eventos.  
\* Home puede mostrar Tareas.  
\* Home puede mostrar tareas vencidas dentro de Atención Requerida.  
\* Home puede mostrar Carga Familiar derivada de Task.  
\* Home puede mostrar Briefing que referencia Task/Event.  
\* Home resume y redirige; no administra Planner.

**\#\#\#\# More**

\* No se encontró Planner como módulo de More.  
\* More contiene Settings, que puede incluir privacidad, permisos y auditoría, pero eso es dependencia externa.

**\#\#\#\# Quick Actions**

\* \`+\` en Bottom Nav abre Quick Actions.  
\* Quick Actions permite selección de acción.  
\* Quick Actions lleva a formulario modal de creación.  
\* Crear tarea y crear evento aparecen como acciones rápidas.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

**\#\#\#\# Tasks**

\* Tareas del hogar visibles para todos los miembros.  
\* Tareas personales visibles solo para el dueño.  
\* Tareas personales pueden compartirse, aunque el mecanismo fino no está definido.  
\* Tareas del hogar pueden cambiarse a personales por el creador, aunque el mecanismo fino no está definido.  
\* Tareas activas se guardan mientras el hogar existe y no expiran.  
\* Tareas completadas se guardan como historial permanente.  
\* Tareas eliminadas van a papelera durante 30 días y luego se eliminan definitivamente.  
\* Cualquier miembro puede eliminar sus propias tareas.  
\* Coordinador puede eliminar cualquier tarea.  
\* Tarea eliminada es recuperable por dueño o Coordinador durante los 30 días.  
\* Tarea vencida es calculada, no estado persistido, según archivo de comprensión.

**\#\#\#\# Events / Calendar**

\* Eventos del hogar visibles para todos los miembros.  
\* Eventos personales visibles solo para el dueño.  
\* Eventos personales pueden compartirse, aunque el mecanismo fino no está definido.  
\* Eventos del hogar pueden cambiarse a personales por el creador, aunque el mecanismo fino no está definido.  
\* Eventos futuros se guardan indefinidamente mientras el hogar existe.  
\* Eventos pasados se guardan como historial permanente.  
\* Eventos eliminados van a papelera 30 días y luego se eliminan definitivamente.  
\* Creador o Coordinador puede eliminar un evento.  
\* Eventos recurrentes tienen decisión de eliminación: “este evento” o “toda la serie”.  
\* Si se elimina toda la serie, los eventos futuros van a papelera 30 días y los pasados se preservan como historial.  
\* Calendar administra eventos familiares y personales.

**\#\#\#\# Navegación**

\* Planner vive en Bottom Nav.  
\* Home redirige al módulo correspondiente.  
\* Quick Actions puede abrir formulario modal para crear tarea o evento.

**\#\#\#\# Restricciones reales transversales**

\* RLS filtra consultas por permisos del miembro a nivel de datos.  
\* Cada acción sobre datos del hogar —crear, modificar, eliminar, compartir, exportar— genera auditoría.  
\* Datos de un hogar no se cruzan con otros hogares.  
\* Datos personales y datos del hogar deben separarse.

**\---**

**\#\#\# DEMO PREMIUM**

\* Planner visual puede usar Bottom Nav y Quick Actions como integración visible.  
\* Home puede mostrar cards/resúmenes de Planner:  
  \* Próximos Eventos.  
  \* Tareas.  
  \* Tareas vencidas en Atención Requerida.  
\* Quick Actions puede mostrar crear tarea y crear evento como acciones visuales.  
\* Carga Familiar puede mostrar distribución de tareas, pero para este MVP visual debe tratarse como demo/mock salvo que otra fuente la haga real.  
\* Briefing puede referenciar tareas/eventos, pero no implementar Geni real desde este fragment.  
\* Eventos familiares creíbles pueden inspirarse en los ejemplos textuales “asado del sábado” y “cumpleaños de la abuela”.

**\---**

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

\* Por ausencia de endpoints, rutas y contratos API, el módulo puede sostenerse para demo con service local/mock.  
\* El service local puede simular:  
  \* listado de tareas;  
  \* listado de eventos;  
  \* completar tarea como cambio local;  
  \* eliminar tarea enviándola a papelera local;  
  \* recuperar tarea local desde papelera;  
  \* eliminar evento enviándolo a papelera local;  
  \* crear tarea desde Quick Actions;  
  \* crear evento desde Quick Actions;  
  \* calcular “vencida” visualmente;  
  \* alimentar cards de Home con próximos eventos y tareas.  
\* Esta clasificación no convierte la simulación en backend real.

**\---**

**\#\#\# POST\_MVP**

\* Exportación de tareas y eventos.  
\* iCalendar como exportación real.  
\* Auditoría completa e inmutable.  
\* Plantillas personalizadas / CRUD de templates.  
\* Subtareas.  
\* Dependencias entre tareas.  
\* Recurrencia avanzada.  
\* Serie recurrente compleja si excede una interacción demo.  
\* Participantes avanzados de eventos.  
\* Adjuntos o documentos vinculados a tareas/eventos.  
\* Comentarios.  
\* Rachas.  
\* Métricas reales de Carga Familiar.  
\* Briefing real de Geni.  
\* Notificaciones reales.  
\* Permisos finos de compartir/cambiar visibilidad.

**\---**

**\#\#\# IGNORAR**

\* No se extrae implementación de módulos fuera de Planner.  
\* No se desarrolla IA real, auditoría completa, exportación completa, permisos finos, storage, sincronización offline ni módulos externos.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner tab | Entrada principal al módulo Planner. No se define contenido interno. | Abrir Planner desde Bottom Nav. | No encontrados. | Bottom Nav \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`. | REAL MÍNIMO |  
| Calendar | Administra eventos familiares y personales. No se definen vistas. | No se define acción directa. | Eventos programados/completados/cancelados desde comprensión. | Dentro de Planner. | REAL parcial |  
| Task list | No se encontró UI explícita. | No se encontró UI explícita. | Estados de Task encontrados: pendiente, en progreso, completada, cancelada, vencida calculada, activa, eliminada. | Planner / Home como resumen. | Faltante / posible demo local |  
| Event list | No se encontró UI explícita. | No se encontró UI explícita. | Estados de Event encontrados: programado, completado, cancelado, futuro, pasado, eliminado. | Planner / Calendar / Home como resumen. | Faltante / posible demo local |  
| Quick Actions (+) | Panel flotante de selección de acción. | Seleccionar crear tarea o crear evento. | No encontrados. | Botón \`+\` en Bottom Nav; deriva a formulario modal. | DEMO PREMIUM / LOCAL |  
| Formulario modal de creación | Formulario modal luego de elegir acción desde Quick Actions. | Crear tarea / crear evento. | No encontrados. | Desde Quick Actions. | DEMO PREMIUM / LOCAL |  
| Home — Próximos Eventos | Eventos próximos. | Redirigir al módulo correspondiente. | No encontrados. | Desde Home hacia Planner/Calendar. | DEMO PREMIUM / REAL parcial |  
| Home — Tareas | Tareas del hogar o pendientes, sin detalle de UI. | Redirigir al módulo correspondiente. | No encontrados. | Desde Home hacia Planner. | DEMO PREMIUM / REAL parcial |  
| Home — Atención Requerida | Urgentes, incluyendo tareas vencidas. | Redirigir al módulo correspondiente. | Tarea vencida calculada. | Desde Home hacia Planner. | DEMO PREMIUM |  
| Home — Carga Familiar | Métricas de distribución de tareas. | No encontradas. | No encontrados. | Desde Home; dependencia de Task. | MOCK / POST\_MVP real |  
| Papelera de tareas/eventos | Elementos eliminados durante 30 días. No se define pantalla. | Recuperar tarea por dueño o Coordinador; eliminación definitiva luego de 30 días. | Estado eliminado/en papelera. | No encontrada. | REAL parcial |  
| Selector eliminación evento recurrente | Opción “este evento” o “toda la serie”. | Elegir alcance de eliminación. | Confirmación implícita por decisión. | Desde eliminación de evento recurrente. | REAL parcial / POST\_MVP si serie compleja |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| Tareas del hogar | Tasks | Filtro/lista/card compartida. | Documento principal, 8.2.2 / 8.4.2 | REAL MÍNIMO |  
| Tareas personales | Tasks | Filtro/lista/card privada. | Documento principal, 8.2.2 / 8.4.1 | REAL MÍNIMO |  
| Tareas activas | Tasks | Tab/listado de activas. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Tareas completadas | Tasks | Estado completado / historial. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Tareas eliminadas | Tasks | Papelera / estado eliminado. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Pendiente | Tasks | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial / conflicto con prompt MVP |  
| En progreso | Tasks | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial / conflicto con prompt MVP |  
| Completada | Tasks | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial |  
| Cancelada | Tasks | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial / conflicto con prompt MVP |  
| Vencida calculada | Tasks | Badge/estado calculado. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM / REAL parcial |  
| Compras | Tasks / Responsabilidad | Categoría/área visual. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |  
| Mascotas | Tasks / Responsabilidad | Categoría/área visual. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |  
| Limpieza | Tasks / Responsabilidad | Categoría/área visual. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |  
| Vehículos | Tasks / Responsabilidad | Categoría/área visual. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM / POST\_MVP si depende de módulo externo |  
| Eventos del hogar | Events | Lista/calendario compartido. | Documento principal, 8.2.2 / 8.4.2 | REAL MÍNIMO |  
| Eventos personales | Events | Lista/calendario privado. | Documento principal, 8.2.2 / 8.4.1 | REAL MÍNIMO |  
| Eventos futuros | Events | Próximos eventos. | Documento principal, 8.3.2 | REAL MÍNIMO |  
| Eventos pasados | Events | Historial. | Documento principal, 8.3.2 | REAL MÍNIMO |  
| Eventos eliminados | Events | Papelera. | Documento principal, 8.3.2 | REAL MÍNIMO |  
| Eventos recurrentes | Events | Caso especial de eliminación. | Documento principal, 8.3.2 | REAL parcial / POST\_MVP si excede simple |  
| Programado | Events | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial |  
| Completado | Events | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial |  
| Cancelado | Events | Estado visual. | Archivo de comprensión, OUTPUT 1 | REAL parcial |  
| “este evento” | Events | Opción de eliminación recurrente. | Documento principal, 8.3.2 | REAL parcial |  
| “toda la serie” | Events | Opción de eliminación recurrente. | Documento principal, 8.3.2 | REAL parcial / POST\_MVP si serie compleja |  
| “el asado del sábado” | Events | Ejemplo narrativo para evento familiar. | Documento principal, 8.3.2 | DEMO PREMIUM |  
| “el cumpleaños de la abuela” | Events | Ejemplo narrativo para evento familiar. | Documento principal, 8.3.2 | DEMO PREMIUM |  
| Próximos Eventos | Home / Events | Card de Home conectada con Planner. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM / REAL parcial |  
| Tareas | Home / Tasks | Card de Home conectada con Planner. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM / REAL parcial |  
| Tareas vencidas | Home / Tasks | Atención Requerida. | Archivo de comprensión, OUTPUT 1 | DEMO PREMIUM |  
| Carga Familiar | Home / Tasks | Widget mock derivado de tareas. | Archivo de comprensión, OUTPUT 1 / OUTPUT relaciones | MOCK / POST\_MVP real |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Abrir Planner | Cualquier usuario con acceso a la app | Se navega al tab Planner. | REAL MÍNIMO | Archivo de comprensión, BottomNav |  
| Abrir Quick Actions | Cualquier usuario con acceso a Bottom Nav | Se abre panel flotante. | DEMO PREMIUM / LOCAL | Archivo de comprensión, QuickActions |  
| Seleccionar crear tarea | Usuario desde Quick Actions | Abre formulario modal de creación. | DEMO PREMIUM / LOCAL | Archivo de comprensión, OUTPUT 4 |  
| Seleccionar crear evento | Usuario desde Quick Actions | Abre formulario modal de creación. | DEMO PREMIUM / LOCAL | Archivo de comprensión, OUTPUT 4 |  
| Crear tarea | No se especifica rol exacto general; Adulto puede crear tareas según comprensión | Tarea nueva; acción auditable. | REAL parcial / falta contrato | Documento principal, 8.1.5; comprensión roles |  
| Modificar tarea | No se especifica rol exacto | Tarea modificada; acción auditable. | REAL parcial / falta contrato | Documento principal, 8.1.5 |  
| Completar tarea | No se especifica rol exacto; Empleado Familiar puede completar tareas según comprensión | Tarea queda completada / historial permanente. | REAL parcial / falta flujo | Documento principal, 8.3.1; comprensión relaciones |  
| Eliminar tarea propia | Cualquier miembro | Tarea pasa a papelera 30 días. | REAL MÍNIMO | Documento principal, 8.3.1 |  
| Eliminar cualquier tarea | Coordinador | Tarea pasa a papelera 30 días. | REAL MÍNIMO | Documento principal, 8.3.1 |  
| Recuperar tarea eliminada | Dueño o Coordinador | Tarea recuperada desde papelera dentro de 30 días. | REAL MÍNIMO | Documento principal, 8.3.1 |  
| Compartir tarea personal | Dueño | Tarea visible para miembros específicos o todo el hogar. | POST\_MVP / permisos finos | Documento principal, 8.4.1 |  
| Cambiar tarea del hogar a personal | Creador | Tarea deja de ser visible para todos. | POST\_MVP / permisos finos | Documento principal, 8.4.2 |  
| Exportar tareas propias | Usuario | Archivo CSV/JSON. | POST\_MVP | Documento principal, 8.6.1 / 8.6.2 |  
| Exportar tareas del hogar | Coordinador | Archivo CSV/JSON. | POST\_MVP | Documento principal, 8.6.1 / 8.6.2 |  
| Crear evento | Adulto puede crear eventos; Adolescente puede crear eventos familiares según comprensión | Evento nuevo; acción auditable. | REAL parcial / falta contrato | Documento principal, 8.1.5; comprensión roles |  
| Modificar evento | No se especifica rol exacto | Evento modificado; acción auditable. | REAL parcial / falta contrato | Documento principal, 8.1.5 |  
| Eliminar evento | Creador o Coordinador | Evento pasa a papelera 30 días. | REAL MÍNIMO | Documento principal, 8.3.2 |  
| Eliminar este evento recurrente | Creador o Coordinador | Evento individual va a papelera. | REAL parcial | Documento principal, 8.3.2 |  
| Eliminar toda la serie | Creador o Coordinador | Futuros van a papelera; pasados se preservan. | POST\_MVP si excede simple | Documento principal, 8.3.2 |  
| Compartir evento personal | Dueño | Evento visible para miembros específicos o todo el hogar. | POST\_MVP / permisos finos | Documento principal, 8.4.1 |  
| Cambiar evento del hogar a personal | Creador | Evento deja de ser visible para todos. | POST\_MVP / permisos finos | Documento principal, 8.4.2 |  
| Exportar eventos propios | Usuario | CSV/JSON/iCalendar. | POST\_MVP | Documento principal, 8.6.1 / 8.6.2 |  
| Exportar eventos del hogar | Coordinador | CSV/JSON/iCalendar. | POST\_MVP | Documento principal, 8.6.1 / 8.6.2 |  
| Redirigir desde Home hacia Planner | Usuario que toca bloque relacionado | Abre módulo correspondiente. | DEMO PREMIUM / REAL parcial | Archivo de comprensión, Home rule |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

**\#\#\#\# Qué puede mostrarse en Home**

\* Próximos Eventos.  
\* Tareas.  
\* Tareas vencidas dentro de Atención Requerida.  
\* Carga Familiar derivada de tareas.  
\* Briefing que referencia Task y Event.

**\#\#\#\# Real o mock**

\* Próximos Eventos: REAL parcial si se alimenta desde Events.  
\* Tareas: REAL parcial si se alimenta desde Tasks.  
\* Atención Requerida con tareas vencidas: DEMO PREMIUM / calculado.  
\* Carga Familiar: MOCK para demo visual; cálculo real queda POST\_MVP.  
\* Briefing con tareas/eventos: MOCK; no implementar Geni real.

**\#\#\#\# Card / widget / resumen mencionado**

\* Home es centro operativo.  
\* Home resume, no administra.  
\* Home contiene Próximos Eventos y Tareas.  
\* Atención Requerida centraliza urgentes, incluyendo tareas vencidas.  
\* Carga Familiar muestra métricas de distribución de tareas entre miembros.  
\* Briefing es primer widget de Home y puede resumir eventos y tareas.

**\---**

**\#\#\# More**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* More aparece como pantalla separada para herramientas especializadas y Settings.  
\* Planner no aparece como módulo dentro de More.  
\* Settings vive exclusivamente en More.  
\* Configuración/privacidad/exportación/auditoría pueden afectar datos de Planner, pero no son parte del fragment Planner visual.

**\---**

**\#\#\# Quick Actions**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Quick Actions vive en el botón \`+\` del Bottom Nav.  
\* Quick Actions abre un panel flotante.  
\* Quick Actions deriva a formulario modal de creación.  
\* Acciones relacionadas con Planner:  
  \* crear tarea;  
  \* crear evento.  
\* Quick Actions dinámicas y aprendizaje por frecuencia quedan POST\_MVP.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |  
| Modificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |  
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Estado mencionado; flujo no definido | REAL parcial / LOCAL para demo |  
| Eliminar tarea | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL MÍNIMO / LOCAL para demo |  
| Recuperar tarea de papelera | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL parcial / LOCAL para demo |  
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |  
| Modificar evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción mencionada sin contrato API | REAL parcial / LOCAL para demo |  
| Eliminar evento | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL MÍNIMO / LOCAL para demo |  
| Eliminar evento recurrente | No encontrado | No encontrado | No encontrado | No encontrado | Acción con regla de negocio, sin contrato API | REAL parcial / POST\_MVP si serie compleja |  
| Exportar tareas | No encontrado | No encontrado | Dominio/rango/formato según exportación general | Archivo CSV/JSON | Mecanismo de exportación general, no endpoint | POST\_MVP |  
| Exportar eventos | No encontrado | No encontrado | Dominio/rango/formato según exportación general | Archivo CSV/JSON/iCalendar | Mecanismo de exportación general, no endpoint | POST\_MVP |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Planner | contains | no especificado | Task, Calendar, Responsabilidad | Estructura interna del módulo. | REAL parcial |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badge/estado de task. | REAL parcial / conflicto con prompt MVP |  
| Task | vencida | calculada según comprensión; tipo no especificado | Vencida calculada | Badge o filtro visual. | DEMO PREMIUM / REAL parcial |  
| Task | tipo/visibilidad | no especificado | Tarea del hogar, tarea personal | Separar compartidas vs privadas. | REAL MÍNIMO |  
| Task | retención | no especificado | Activa, completada, eliminada | Filtros/estados/papelera. | REAL MÍNIMO |  
| Task | papelera | no especificado | 30 días | Feedback de eliminación/recuperación. | REAL MÍNIMO |  
| Task | dueño | no especificado | dueño puede ver/recuperar/eliminar propias | Permisos visuales. | REAL MÍNIMO |  
| Task | creador | no especificado | creador puede cambiar tarea del hogar a personal | Permiso fino. | POST\_MVP |  
| Task | responsable/persona | no especificado | Task referencia Persona | Asignación o responsable visual. | REAL parcial / falta contrato |  
| Task | responsabilidad principal | no especificado | Compras, Mascotas, Limpieza, Vehículos | Categoría visual. | DEMO PREMIUM / POST\_MVP si se complejiza |  
| Task | subtarea | no especificado | único nivel de anidamiento | No usar en MVP visual salvo decisión posterior. | POST\_MVP |  
| Task | dependencia | no especificado | bloquea dependiente hasta completar previa | Estado bloqueado. | POST\_MVP |  
| Task | verificación | no especificado | Opcional; “Completada → Estado final”; no existe estado separado | Conflicto con verification flow MVP del prompt. | REAL conflictivo / faltante |  
| Task | plantilla | no especificado | PlantillaTarea; inicialmente solo para Tasks | Instanciar tarea desde plantilla. | POST\_MVP / faltan templates MVP |  
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge/estado de evento. | REAL parcial |  
| Event | tipo/visibilidad | no especificado | Evento del hogar, evento personal | Separar compartidos vs privados. | REAL MÍNIMO |  
| Event | temporalidad | no especificado | futuro, pasado, eliminado | Próximos eventos/historial/papelera. | REAL MÍNIMO |  
| Event | recurrente | no especificado | este evento, toda la serie | Confirmación de eliminación. | REAL parcial / POST\_MVP si complejo |  
| Event | papelera | no especificado | 30 días | Feedback de eliminación. | REAL MÍNIMO |  
| Event | creador | no especificado | creador puede eliminar; puede cambiar evento del hogar a personal | Permisos visuales. | REAL parcial / POST\_MVP en cambio de visibilidad |  
| Event | persona/participantes | no especificado | Event referencia Persona | Mostrar personas vinculadas. | REAL parcial / participantes avanzados POST\_MVP |  
| Event | calendar | no especificado | Event belongs\_to Calendar | Ubicación de evento en Calendar. | REAL MÍNIMO |  
| Calendar | administra | no especificado | eventos familiares y personales | Vista de calendario/listado. | REAL parcial |  
| Calendar | formato exportación | no especificado | iCalendar (.ics) | Exportación. | POST\_MVP |  
| Home | bloque | no especificado | Próximos Eventos, Tareas, Atención Requerida, Carga Familiar, Briefing | Cards/resúmenes conectados. | DEMO PREMIUM / REAL parcial |  
| QuickActions | acción seleccionada | no especificado | crear tarea, crear evento | Abre modal. | DEMO PREMIUM / LOCAL |  
| Auditoría | campos | no especificado | autor, fecha, hora, acción, entidad afectada, valor anterior, valor nuevo, origen | No UI Planner directa; restricción. | POST\_MVP / restricción real |  
| Exportación | formato | no especificado | CSV, JSON, iCalendar | Exportar Task/Event. | POST\_MVP |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Tarea completada | Se guarda como historial permanente. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Tarea eliminada | Va a papelera 30 días y luego se elimina definitivamente. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Recuperar tarea eliminada | Recuperable por dueño o Coordinador durante papelera. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Tarea activa | Se guarda mientras el hogar existe; no expira. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Tarea vencida | Es calculada, no estado persistido. | Archivo de comprensión, OUTPUT 1 | REAL parcial / DEMO PREMIUM |  
| Tareas completadas no archivables | Completada \= histórico; no se archiva. | Documento principal, 8.3.1 | REAL MÍNIMO |  
| Contradicción sobre eliminación de completadas | Documento dice cualquier miembro puede eliminar sus propias tareas, pero tabla resumen dice completadas permanentes/no eliminables. | Documento principal, 8.3.1 / 8.3.12; source\_map | FALTANTE / riesgo |  
| Evento futuro | Se guarda indefinidamente mientras el hogar existe. | Documento principal, 8.3.2 | REAL MÍNIMO |  
| Evento pasado | Se guarda como historial permanente. | Documento principal, 8.3.2 | REAL MÍNIMO |  
| Evento eliminado | Va a papelera 30 días y luego se elimina definitivamente. | Documento principal, 8.3.2 | REAL MÍNIMO |  
| Evento recurrente eliminado como “este evento” | El evento individual va a papelera 30 días. | Documento principal, 8.3.2 | REAL parcial |  
| Evento recurrente eliminado como “toda la serie” | Eventos futuros de la serie van a papelera 30 días; pasados se preservan como historial. | Documento principal, 8.3.2 | POST\_MVP si excede simple |  
| Evento pasado no archivable | Pasado \= histórico; no se archiva. | Documento principal, 8.3.2 | REAL MÍNIMO |  
| Evento “Postergado” | No existe Postergado. | Archivo de comprensión, OUTPUT 1 | REAL parcial |  
| Datos personales de Planner | Solo dueño puede ver por defecto. | Documento principal, 8.2.2 / 8.4.1 | REAL MÍNIMO |  
| Datos del hogar de Planner | Todos los miembros pueden ver por defecto. | Documento principal, 8.2.2 / 8.4.2 | REAL MÍNIMO |  
| RLS | Si la capa de app falla, la base de datos no entrega datos que el miembro no debería ver. | Documento principal, 8.5.3 | REAL MÍNIMO / restricción |  
| Sin datos / empty state | No encontrado. | No aplica | FALTANTE |  
| Error de permisos | No encontrado como UX; solo existe restricción RLS. | Documento principal, 8.5.3 | FALTANTE |  
| Loading / red / retry | No encontrado. | No aplica | FALTANTE |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

**\#\#\# Restricciones de privacidad**

\* Tareas personales: visibles solo para el dueño por defecto.  
\* Eventos personales: visibles solo para el dueño por defecto.  
\* Tareas del hogar: visibles para todos los miembros por defecto.  
\* Eventos del hogar: visibles para todos los miembros por defecto.  
\* El usuario puede abrir datos personales; el sistema no debe abrirlos automáticamente.  
\* RLS filtra a nivel de base de datos por permisos del miembro.  
\* Geni hereda permisos del miembro que consulta.

**\#\#\# Restricciones de retención**

\* Tareas activas no expiran.  
\* Tareas completadas son historial permanente.  
\* Tareas eliminadas van a papelera 30 días y luego borrado definitivo.  
\* Eventos futuros se guardan indefinidamente mientras el hogar existe.  
\* Eventos pasados son historial permanente.  
\* Eventos eliminados van a papelera 30 días y luego borrado definitivo.  
\* No se archivan tareas ni eventos: completado/pasado \= histórico; eliminado \= papelera.

**\#\#\# Restricciones de permisos**

\* Cualquier miembro puede eliminar sus propias tareas.  
\* Coordinador puede eliminar cualquier tarea.  
\* Dueño o Coordinador puede recuperar tarea eliminada.  
\* Creador o Coordinador puede eliminar eventos.  
\* Adulto puede crear/reasignar tareas y crear eventos, según archivo de comprensión.  
\* Adolescente puede crear eventos familiares y administrar tareas propias, según archivo de comprensión.  
\* Empleado Familiar puede completar tareas y no puede crear tareas, según archivo de comprensión.

**\#\#\# Restricciones de navegación**

\* Planner está en Bottom Nav.  
\* Home resume y redirige; no administra.  
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones ≤3 niveles.

**\#\#\# Restricciones arquitectónicas**

\* Toda acción sobre datos del hogar —crear, modificar, eliminar, compartir, exportar— genera auditoría.  
\* Auditoría cruda no es visible para miembros.  
\* Datos del hogar no se venden, no se usan para publicidad, no se cruzan entre hogares y no entrenan modelos externos.  
\* Cada hogar es una bóveda aislada.  
\* Exportación de tareas/eventos existe como portabilidad, pero debe quedar POST\_MVP para este fragment demo.

**\#\#\# Prohibiciones / límites del MVP visual**

\* No convertir exportación en obligación del Planner demo.  
\* No implementar auditoría completa desde este fragment.  
\* No implementar permisos finos de compartir/cambiar visibilidad salvo como restricción documentada.  
\* No implementar Geni real para crear/reprogramar tareas.  
\* No implementar notificaciones reales.  
\* No implementar subtareas, dependencias, rachas, métricas reales de carga ni plantillas personalizadas.  
\* No implementar recurrencia compleja, RRULE, EXDATE ni excepciones avanzadas.  
\* No implementar módulos externos desde relaciones con Planner.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| UI explícita de Planner | Codex necesita saber layout, secciones, botones, tabs y jerarquía visual. | Alto: habrá que usar otra fuente o hacer demo local muy básica. |  
| UI explícita de Task List | Faltan cards, filtros, tabs, empty states, acciones por item. | Alto. |  
| UI explícita de Create/Edit Task | Faltan inputs, validaciones, labels y botones. | Alto. |  
| UI explícita de Event List / Calendar | Faltan vista día/semana/mes, layout de calendario y navegación. | Alto. |  
| UI explícita de Create/Edit Event | Faltan inputs de fecha/hora, lugar, título, participantes. | Alto. |  
| Datos demo concretos | No hay nombres suficientes de tareas/eventos de demo. | Alto para demo visual convincente. |  
| Prioridades | El prompt pide prioridad si aparece, pero este documento no la define. | Medio. |  
| Fecha límite de tareas | El prompt pide fecha límite si aparece, pero este documento no la define. | Alto para calendario/tareas de hoy. |  
| Asignación de responsable | Task referencia Persona, pero no define campo, UI ni reglas. | Alto. |  
| Estados MVP oficiales de Task | Documento/comprensión usa Pendiente/En progreso/Completada/Cancelada; prompt exige pending/completed/awaiting\_verification/verified. | Alto: contradicción a resolver en merge. |  
| Verification Flow MVP | Comprensión dice que no existe estado separado; prompt exige awaiting\_verification y verified. | Alto: no se puede extraer sin contradicción. |  
| Templates predefinidas MVP | Aparece PlantillaTarea y responsabilidades Compras/Mascotas/Limpieza/Vehículos, pero no la lista MVP completa ni regla de constantes. | Alto. |  
| Recurrencia simple | Documento menciona eventos recurrentes y serie al eliminar, pero no define none/daily/weekly/monthly. | Alto. |  
| Mostrar tareas con fecha en Calendar | No aparece explícitamente. | Alto para Calendar MVP. |  
| Endpoints/API | No hay métodos, rutas, request, response ni errores. | Alto. |  
| Service contract | No se nombran services ni funciones. | Medio; usar mock/local. |  
| Feedback UX | No hay toasts, loading, empty, error, disabled, retry. | Medio/alto para demo. |  
| Permisos de crear/editar tareas | Solo aparecen algunos permisos por rol; no hay matriz completa. | Alto. |  
| Permisos de crear/editar eventos | Solo aparecen algunos permisos por rol; no hay matriz completa. | Alto. |  
| Diferencia cancelado vs eliminado en Event | Comprensión habla de Cancelado; documento habla de eliminado/papelera. | Medio. |  
| Eliminación de tareas completadas | Hay tensión entre “cualquier miembro puede eliminar sus propias tareas” y “tareas completadas permanentes/no eliminables”. | Medio/alto. |  
| Criterio de “tareas pendientes” para Home | Home muestra Tareas, pero no define filtros ni conteo. | Medio. |  
| Criterio de “próximos eventos” para Home | Home muestra Próximos Eventos, pero no define rango. | Medio. |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Archivo principal**

\* \`HomePlus — SECCION 8 DATA PHILOSOPHY.md\`

**\#\#\#\# Secciones usadas**

\* \`8.1 Principios de Datos\`  
\* \`8.1.3 Minimización — Solo se guarda lo necesario para coordinar\`  
\* \`8.1.5 Trazabilidad — Las acciones importantes dejan huella\`  
\* \`8.2 Clasificación de Datos\`  
\* \`8.2.1 Las Cuatro Categorías\`  
\* \`8.2.2 Tabla Completa de Clasificación por Tipo de Dato\`  
\* \`8.3 Políticas de Retención\`  
\* \`8.3.1 Tareas — Historial\`  
\* \`8.3.2 Eventos — Historial\`  
\* \`8.3.10 Rachas\`  
\* \`8.3.12 Tabla Resumen de Retención\`  
\* \`8.4 Privacidad por Defecto\`  
\* \`8.4.1 Qué es Privado por Defecto\`  
\* \`8.4.2 Qué es Visible por Defecto\`  
\* \`8.5.3 Row Level Security (RLS)\`  
\* \`8.6 Exportación y Portabilidad\`  
\* \`8.6.1 Qué Puede Exportar el Usuario\`  
\* \`8.6.2 Formatos de Exportación\`  
\* \`8.6.3 Mecanismo de Exportación\`  
\* \`8.6.4 Qué Pasa al Cerrar la Cuenta\`  
\* \`8.8 Decisiones de Datos Tomadas\`

**\#\#\# Archivo de comprensión asociado**

\* \`Seccion 8 Filosofia de la Informacion.txt\`

**\#\#\#\# Bloques usados**

\* \`OUTPUT 1 — ENTITIES\`  
  \* Task.  
  \* Recurrencia.  
  \* Verificación.  
  \* PlantillaTarea.  
  \* Responsabilidad.  
  \* Calendar.  
  \* Event.  
  \* Home.  
  \* Atención Requerida.  
  \* CargaFamiliar.  
  \* QuickActions.  
  \* BottomNav.  
  \* Auditoria.  
  \* Exportacion.  
  \* RLS.  
\* \`OUTPUT 2 — RELATIONSHIPS\`  
  \* Planner contains Task.  
  \* Planner contains Calendar.  
  \* Task references Persona.  
  \* Event belongs\_to Calendar.  
  \* Event references Persona.  
  \* Briefing references Task/Event.  
  \* Auditoria tracks Task/Event.  
  \* Exportacion exports\_to Task/Event.  
  \* BottomNav navigates\_to Planner.  
\* \`OUTPUT 4 — DATA FLOWS\`  
  \* QuickActions (+) → Formulario modal de creación.  
  \* Usuario solicita exportación → archivo CSV/JSON/iCalendar.  
\* \`OUTPUT 5 — BUSINESS RULES\`  
  \* Papelera universal de 30 días.  
  \* Tareas completadas y eventos pasados como historial permanente.  
  \* Recurrencias generan nuevas instancias de tareas.  
  \* Una tarea posee una única responsabilidad principal.  
  \* Dependencias bloquean tareas dependientes.  
  \* RLS filtra por permisos.  
  \* Home resume y redirige.  
  \* Navegación ≤3 niveles como objetivo.  
  \* QuickActions y BottomNav.  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
  \* D-01 Historial de tareas y eventos permanente.  
  \* D-08 Papelera de 30 días para eliminaciones.

**\#\#\# Source map generado previamente**

\* \`source\_map\_SECCION\_8\_DATA\_PHILOSOPHY.md\`

**\#\#\#\# Secciones usadas**

\* \`4.7 PLANNER\`  
\* \`4.8 TASKS\`  
\* \`4.9 EVENTS\`  
\* \`4.10 CALENDAR\`  
\* \`4.11 HOME\`, solo como dependencia directa de Planner.  
\* \`5. Mapa de entidades\`  
\* \`6. Mapa de relaciones\`  
\* \`7. Mapa de estados\`  
\* \`8. Mapa de permisos\`  
\* \`9. Mapa de flujos\`  
\* \`10. Mapa de APIs\`  
\* \`11. Mapa de UI\`  
\* \`13. Restricciones arquitectónicas detectadas\`  
\* \`15. Información POST\_MVP detectada\`  
\* \`17. Contradicciones detectadas\`  
\* \`18. Información faltante\`

**\# PLANNER fragment — HomePlus — Esquema de base de datos v1**

\> Fragment crudo de implementación visual/interactiva.    
\> Fuente única: documento principal \`HomePlus — Esquema de base de datos v1(1).md\`, archivo de comprensión \`Esquema de base de datos v1(2).txt\` y \`source\_map\_HomePlus\_Esquema\_de\_base\_de\_datos\_v1.md\`.    
\> No fusionar con otros documentos. No convertir en spec final. No completar huecos.

**\---**

**\#\# 1\. Rol del módulo en la demo**

**\#\#\# Información explícita encontrada**

\* \`Planner\` aparece como dominio principal dentro del diagrama relacional conceptual del producto.  
\* El dominio \`Planner\` contiene, en el documento principal, al menos: \`tasks\`, \`events\`, \`goals\`, \`responsibilities\`, \`streaks\`.  
\* Para este fragment se extrae únicamente lo relacionado con \`tasks\`, \`events\`, \`calendar\` y dependencias directas útiles.  
\* El archivo de comprensión identifica:  
  \* \`PlannerDashboard\`: “Vista principal de Planner con Tasks, Calendar y Goals”.  
  \* \`CalendarView\`: “Vista de calendario de eventos”.  
\* \`tasks\` se describe como tareas del hogar. Pueden ser personales o del hogar.  
\* \`events\` se describe como eventos del hogar.  
\* \`responsibilities\` se describe como áreas operativas del hogar.  
\* El documento asocia tareas a responsables, fechas, estado, prioridad, verificación opcional y visibilidad.  
\* El documento asocia eventos a fecha/hora, estado, visibilidad, \`all\_day\`, ubicación textual y creador.

**\#\#\# Valor mostrado al usuario**

\* Coordinar tareas del hogar.  
\* Ver y operar tareas asignadas o creadas.  
\* Ver eventos del hogar o personales.  
\* Usar calendario como vista de eventos.  
\* Mostrar en Home resúmenes de tareas y eventos, porque \`HomeDashboard\` incluye \`Eventos\` y \`Tareas\`.

**\#\#\# Problema familiar que resuelve**

\* El documento no lo describe de forma narrativa.  
\* A nivel técnico, permite coordinar tareas, responsables, vencimientos y eventos dentro del hogar.

**\#\#\# Qué debe sentir el usuario**

\* No encontrado explícitamente.

**\#\#\# Importancia dentro del ecosistema**

\* Planner es un dominio central del diagrama conceptual.  
\* \`HomeDashboard\` consume \`Eventos\` y \`Tareas\` como secciones visibles.  
\* \`BottomNavigation\` incluye \`\[Planner\]\` como tab principal.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Pantallas / componentes encontrados**

\* \`PlannerDashboard\`  
  \* Tipo: Screen.  
  \* Descripción del archivo de comprensión: vista principal de Planner con Tasks, Calendar y Goals.  
  \* Para este fragment: extraer solo Tasks y Calendar. Goals queda fuera de este fragment.

\* \`CalendarView\`  
  \* Tipo: Screen.  
  \* Descripción del archivo de comprensión: vista de calendario de eventos.

\* \`HomeDashboard\`  
  \* Dependencia externa / no desarrollar en este fragment.  
  \* Incluye en orden: \`Briefing → Atención Requerida → Carga Familiar → Eventos → Tareas → Finanzas → Presence → Actividad\`.  
  \* Para Planner solo importa que Home puede mostrar \`Eventos\` y \`Tareas\`.

\* \`BottomNavigation\`  
  \* Dependencia externa / no desarrollar en este fragment.  
  \* Estructura encontrada: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
  \* \`Planner\` está en navegación principal.

\* \`QuickActions\`  
  \* Dependencia externa / no desarrollar en este fragment.  
  \* Panel flotante desde \`+\`.  
  \* Acciones dinámicas por frecuencia.  
  \* No se especifican acciones concretas de Planner en el documento.

**\#\#\#\# Secciones visuales extraíbles para Planner**

\* Tasks dentro de \`PlannerDashboard\`.  
\* Calendar dentro de \`PlannerDashboard\`.  
\* \`CalendarView\` como pantalla de calendario de eventos.  
\* Card/sección de \`Eventos\` en Home.  
\* Card/sección de \`Tareas\` en Home.

**\#\#\#\# UI explícita no encontrada**

\* No se encontró estructura visual detallada para lista de tareas.  
\* No se encontró pantalla detallada de crear tarea.  
\* No se encontró pantalla detallada de editar tarea.  
\* No se encontró pantalla detallada de detalle de tarea.  
\* No se encontró estructura visual detallada para crear evento.  
\* No se encontró estructura visual detallada para editar evento.  
\* No se encontró modal, drawer, formulario ni layout específico.  
\* No se encontraron tabs explícitos para Tasks/Events/Calendar, salvo que \`PlannerDashboard\` contiene Tasks y Calendar.  
\* No se encontraron vistas Día/Semana/Mes explícitas en el documento.  
\* No se encontraron estados vacíos visuales explícitos.

**\---**

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Datos encontrados directamente útiles para demo**

**\#\#\#\#\# Tasks**

\* Estados de tarea encontrados en documento:  
  \* \`pending\`  
  \* \`in\_progress\`  
  \* \`completed\`  
  \* \`cancelled\`  
\* Estado inicial/default de tarea:  
  \* \`pending\`  
\* Nota explícita:  
  \* “Vencida es calculada”.  
\* Prioridades encontradas:  
  \* \`low\`  
  \* \`medium\`  
  \* \`high\`  
  \* \`critical\`  
\* Prioridad default:  
  \* \`medium\`  
\* Visibilidad:  
  \* \`household\`  
  \* \`personal\`  
\* Visibilidad default:  
  \* \`household\`  
\* Fechas disponibles:  
  \* \`start\_date\`  
  \* \`due\_date\`  
  \* \`due\_time\`  
\* Asignación:  
  \* \`assigned\_to\`  
  \* \`created\_by\`  
  \* \`completed\_by\`  
\* Verificación:  
  \* \`requires\_verification\`  
  \* \`verified\_by\`  
  \* \`verified\_at\`  
\* Papelera / soft-delete:  
  \* \`deleted\_at\`  
  \* papelera 30 días.

**\#\#\#\#\# Responsibilities / categorías operativas**

\* \`responsibilities\` agrupa áreas operativas del hogar.  
\* Ejemplos explícitos encontrados en archivo de comprensión:  
  \* \`Compras\`  
  \* \`Limpieza\`  
  \* \`Mascotas\`  
\* Campo de categoría:  
  \* \`category\`  
\* Estado activo:  
  \* \`is\_active\`, default \`true\`.  
\* Relación con tasks:  
  \* \`responsibility\_id\` en \`tasks\` es obligatorio.  
  \* El documento dice que una tarea siempre tiene una Responsabilidad asociada.

**\#\#\#\#\# Events**

\* Estados de evento encontrados:  
  \* \`scheduled\`  
  \* \`completed\`  
  \* \`cancelled\`  
\* Estado inicial/default de evento:  
  \* \`scheduled\`  
\* Visibilidad:  
  \* \`household\`  
  \* \`personal\`  
\* Visibilidad default:  
  \* \`household\`  
\* Fecha/hora:  
  \* \`starts\_at\`  
  \* \`ends\_at\`  
  \* \`all\_day\`  
\* \`all\_day\` default:  
  \* \`false\`  
\* Ubicación textual:  
  \* \`location\_name\`  
  \* \`location\_address\`  
\* Ubicación geográfica:  
  \* \`location\_coordinates\` tipo \`point\`  
  \* Clasificar como POST\_MVP para este fragment si implica mapas/GPS real.

**\#\#\#\#\# Calendar**

\* \`CalendarView\`: vista de calendario de eventos.  
\* \`events.starts\_at\`, \`events.ends\_at\`, \`events.all\_day\` sirven como base de visualización.  
\* \`tasks.due\_date\`, \`tasks.due\_time\`, \`tasks.start\_date\` son datos disponibles para mostrar tareas con fecha.  
\* No hay tabla \`calendar\`.

**\#\#\#\# Datos demo no encontrados**

\* No se encontraron nombres concretos de tareas como “comprar leche” o “dar medicación”.  
\* No se encontraron nombres concretos de eventos.  
\* No se encontraron miembros con nombres reales/demo.  
\* No se encontraron textos de empty state.  
\* No se encontraron frases de success/error/toast.  
\* No se encontraron filtros concretos por label visual, salvo campos técnicos como status, visibility, due\_date, assigned\_to, priority.

**\---**

**\#\#\# 2.3 Acción interactiva**

**\#\#\#\# Acciones de Tasks encontradas**

\* Listar tareas.  
  \* Base documental: RLS SELECT de \`tasks\`.  
  \* Clasificación: REAL MÍNIMO.

\* Crear tarea.  
  \* Base documental: RLS INSERT de \`tasks\`.  
  \* Roles permitidos según documento: Adulto, Coordinador, Senior. Adolescente puede crear tareas propias.  
  \* Clasificación: REAL MÍNIMO.

\* Editar tarea.  
  \* Base documental: RLS UPDATE de \`tasks\`.  
  \* Reglas: \`assigned\_to\` puede marcar completada/editar; \`created\_by\` puede editar; coordinador puede todo.  
  \* Clasificación: REAL MÍNIMO.

\* Completar tarea.  
  \* Base documental: RLS UPDATE de \`tasks\`, \`completed\_by\`, \`completed\_at\`, \`status\`.  
  \* El archivo de comprensión identifica relación \`HouseholdMember completes Task\`.  
  \* Clasificación: REAL MÍNIMO.

\* Verificar tarea.  
  \* Base documental: campos \`requires\_verification\`, \`verified\_by\`, \`verified\_at\`.  
  \* El archivo de comprensión identifica \`TaskVerification\` como verificación opcional de completitud.  
  \* Clasificación: REAL MÍNIMO PARCIAL.  
  \* Riesgo: el documento no define estado \`awaiting\_verification\` ni \`verified\` como \`tasks.status\`.

\* Eliminar tarea.  
  \* Base documental: RLS DELETE de \`tasks\` como soft-delete \`deleted\_at=now()\`.  
  \* Clasificación: REAL MÍNIMO.

\* Asignar responsable.  
  \* Base documental: campo \`assigned\_to\`.  
  \* Clasificación: REAL MÍNIMO.

\* Cambiar prioridad.  
  \* Base documental: campo \`priority\`.  
  \* Clasificación: REAL MÍNIMO.

\* Definir fecha límite.  
  \* Base documental: \`due\_date\`, \`due\_time\`.  
  \* Clasificación: REAL MÍNIMO.

**\#\#\#\# Acciones de Events encontradas**

\* Listar eventos.  
  \* Base documental: RLS SELECT de \`events\`.  
  \* Clasificación: REAL MÍNIMO.

\* Crear evento.  
  \* Base documental: RLS INSERT de \`events\`.  
  \* Roles permitidos: Adulto, Coordinador, Senior, Adolescente.  
  \* Clasificación: REAL MÍNIMO.

\* Editar evento.  
  \* Base documental: RLS UPDATE de \`events\`.  
  \* Reglas: \`created\_by\` o coordinador.  
  \* Clasificación: REAL MÍNIMO.

\* Eliminar/cancelar evento.  
  \* Base documental: \`status='cancelled'\` existe; RLS DELETE usa soft-delete \`deleted\_at=now()\`.  
  \* Clasificación: REAL MÍNIMO.  
  \* Riesgo: el documento no detalla si “cancelar” debe ser cambio de status o soft-delete.

\* Marcar evento completado.  
  \* Base documental: estado \`completed\`.  
  \* Clasificación: REAL MÍNIMO PARCIAL.  
  \* Riesgo: no hay flujo UI ni regla de quién lo completa más allá de UPDATE.

**\#\#\#\# Acciones de Calendar encontradas**

\* Ver calendario.  
  \* Base documental: \`CalendarView\`.  
  \* Clasificación: REAL MÍNIMO / DEMO PREMIUM.

\* Mostrar eventos.  
  \* Base documental: \`events\` \+ \`CalendarView\`.  
  \* Clasificación: REAL MÍNIMO.

\* Mostrar tareas con fecha.  
  \* Base documental: \`tasks.due\_date\`, \`tasks.due\_time\`, \`tasks.start\_date\`.  
  \* Clasificación: DEMO PREMIUM / REAL PARCIAL.  
  \* Riesgo: el documento no dice explícitamente que \`CalendarView\` muestre tareas con fecha; la relación es útil pero implícita.

**\#\#\#\# Acciones POST\_MVP encontradas**

\* Crear/gestionar comentarios de tareas.  
\* Crear/gestionar adjuntos de tareas.  
\* Gestionar dependencias entre tareas.  
\* Gestionar subtareas.  
\* Gestionar templates editables por tabla \`task\_templates\`.  
\* Gestionar participantes avanzados de eventos.  
\* Responder evento con \`accepted\`, \`declined\`, \`maybe\`.  
\* Recalcular streaks.  
\* Recurrencia avanzada RRULE.

**\---**

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Feedback / estados explícitos encontrados**

\* \`status\` de tarea puede mostrar feedback visual:  
  \* \`pending\`  
  \* \`in\_progress\`  
  \* \`completed\`  
  \* \`cancelled\`  
\* \`status\` de evento puede mostrar feedback visual:  
  \* \`scheduled\`  
  \* \`completed\`  
  \* \`cancelled\`  
\* Tarea vencida:  
  \* No es estado persistido.  
  \* Se calcula por fecha.  
  \* Puede servir como badge o alerta visual, pero el documento no define UI específica.  
\* Soft-delete:  
  \* \`deleted\_at\` indica papelera 30 días.  
  \* Puede usarse como feedback de eliminación, pero el documento no define toast ni confirmación.  
\* Verificación:  
  \* \`requires\_verification\`, \`verified\_by\`, \`verified\_at\` pueden mostrar si una tarea requiere o ya recibió verificación.  
\* \`all\_day\` en eventos puede mostrarse como etiqueta visual.  
\* \`visibility='personal'\` puede mostrarse como badge o estado visible, aunque no se especifica UI.

**\#\#\#\# Feedback no encontrado**

\* No hay loading.  
\* No hay toast.  
\* No hay success message.  
\* No hay error message.  
\* No hay empty state textual.  
\* No hay skeleton.  
\* No hay spinner.  
\* No hay retry.  
\* No hay disabled state.  
\* No hay confirmación modal.  
\* No hay mensajes de espera.

**\---**

**\#\#\# 2.5 Service aislado**

**\#\#\#\# Services explícitos**

No se encontró definición explícita de services, nombres de funciones, clases, hooks o módulos de frontend.

**\#\#\#\# Pistas extraíbles para un service aislado**

**\#\#\#\#\# Fuente de datos \`tasks\`**

El service de Planner podría leer/escribir sobre la entidad \`tasks\`, pero el documento no define contrato de service.

Datos fuente:

\* \`id\`  
\* \`household\_id\`  
\* \`title\`  
\* \`description\`  
\* \`visibility\`  
\* \`status\`  
\* \`priority\`  
\* \`start\_date\`  
\* \`due\_date\`  
\* \`due\_time\`  
\* \`responsibility\_id\`  
\* \`created\_by\`  
\* \`assigned\_to\`  
\* \`completed\_by\`  
\* \`completed\_at\`  
\* \`requires\_verification\`  
\* \`verified\_by\`  
\* \`verified\_at\`  
\* \`event\_id\`  
\* \`deleted\_at\`  
\* \`created\_at\`  
\* \`updated\_at\`

Acciones fuente:

\* listar  
\* crear  
\* editar  
\* completar  
\* verificar  
\* eliminar mediante soft-delete

**\#\#\#\#\# Fuente de datos \`events\`**

Datos fuente:

\* \`id\`  
\* \`household\_id\`  
\* \`title\`  
\* \`description\`  
\* \`visibility\`  
\* \`status\`  
\* \`all\_day\`  
\* \`starts\_at\`  
\* \`ends\_at\`  
\* \`location\_name\`  
\* \`location\_address\`  
\* \`created\_by\`  
\* \`deleted\_at\`  
\* \`created\_at\`  
\* \`updated\_at\`

Acciones fuente:

\* listar  
\* crear  
\* editar  
\* eliminar/cancelar

**\#\#\#\#\# Fuente de datos \`responsibilities\`**

Datos fuente:

\* \`id\`  
\* \`household\_id\`  
\* \`title\`  
\* \`description\`  
\* \`category\`  
\* \`is\_active\`  
\* \`created\_by\`  
\* \`created\_at\`  
\* \`updated\_at\`

Uso en Planner:

\* \`responsibility\_id\` es obligatorio en \`tasks\`.  
\* Sirve como agrupación operativa de tareas.

**\#\#\#\#\# Integración con Home**

\* \`HomeDashboard\` incluye \`Eventos\` y \`Tareas\`.  
\* El archivo de comprensión indica que Home resume y redirige al módulo correspondiente.  
\* El documento no define payload ni endpoint para Home.

**\#\#\#\#\# Integración con Members / Household**

Dependencia externa / no desarrollar en este fragment.

\* \`tasks.household\_id\` aísla por hogar.  
\* \`tasks.assigned\_to\`, \`created\_by\`, \`completed\_by\`, \`verified\_by\` referencian \`household\_members.id\`.  
\* \`events.created\_by\` referencia \`household\_members.id\`.  
\* RLS usa membresía del hogar.

**\---**

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Navegación encontrada**

\* \`BottomNavigation\`: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`Planner\` está en la navegación principal.  
\* \`QuickActions\`: panel flotante desde \`+\`.  
\* \`HomeDashboard\` contiene \`Eventos\` y \`Tareas\`.  
\* \`Home\` no administra información; solo resume y redirige al módulo correspondiente.  
\* Regla de navegación: más de 4 niveles de navegación es fallo de diseño; objetivo 95% de acciones en ≤3 niveles.

**\#\#\#\# Flujo de navegación extraíble**

\* Entrar a Planner desde tab \`\[Planner\]\`.  
\* Ver \`PlannerDashboard\`.  
\* Desde \`PlannerDashboard\`, acceder a Tasks y Calendar.  
\* Ver calendario desde \`CalendarView\`.  
\* Desde Home, entrar a secciones/cards de \`Eventos\` o \`Tareas\` y redirigir a Planner.  
\* Desde \`+\`, potencialmente abrir acciones dinámicas; el documento no especifica acción rápida concreta para crear tarea/evento.

**\#\#\#\# Navegación no encontrada**

\* No se define navegación interna entre Task List, Task Detail, Create Task y Edit Task.  
\* No se define navegación interna entre Calendar, Event Detail, Create Event y Edit Event.  
\* No se definen deep links.  
\* No se define acceso desde More para Planner.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

\* \`HomeDashboard\` contiene sección/card de \`Eventos\`.  
\* \`HomeDashboard\` contiene sección/card de \`Tareas\`.  
\* \`Home\` resume y redirige al módulo correspondiente.  
\* \`tasks table\` alimenta:  
  \* tareas asignadas;  
  \* tareas completadas;  
  \* tareas vencidas;  
  \* métricas de carga para Geni y Home.  
\* Para este fragment, la conexión útil es:  
  \* mostrar tareas pendientes/vencidas en Home;  
  \* mostrar eventos próximos en Home;  
  \* abrir Planner desde esas secciones.

**\#\#\#\# More**

\* No se encontró acceso de Planner desde More.  
\* \`MoreMenu\` contiene Finance, Inventory, FamilyCloud, Settings.  
\* Planner está en Bottom Nav, no en More.

**\#\#\#\# Quick Actions**

\* Existe \`QuickActions\` como panel desde \`+\`.  
\* El documento dice que las acciones son dinámicas por frecuencia.  
\* No se encontró acción rápida concreta “crear tarea” o “crear evento” dentro de este documento.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

**\#\#\#\# Tasks**

\* Listar tareas por hogar.  
\* Crear tarea.  
\* Editar tarea.  
\* Completar tarea.  
\* Eliminar tarea con soft-delete \`deleted\_at=now()\`.  
\* Asignar responsable con \`assigned\_to\`.  
\* Usar prioridad \`low\`, \`medium\`, \`high\`, \`critical\`.  
\* Usar default \`priority='medium'\`.  
\* Usar fecha límite \`due\_date\` y hora \`due\_time\`.  
\* Usar \`start\_date\` si se necesita fecha de inicio.  
\* Usar visibilidad \`household\` / \`personal\`.  
\* Usar default \`visibility='household'\`.  
\* Usar \`status\` del documento: \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\`.  
\* Calcular tarea vencida por fecha; no persistir \`overdue\` como status.  
\* Usar verificación parcial mediante \`requires\_verification\`, \`verified\_by\`, \`verified\_at\`.  
\* Respetar que \`responsibility\_id\` es obligatorio según documento.

**\#\#\#\# Events**

\* Listar eventos por hogar.  
\* Crear evento.  
\* Editar evento.  
\* Eliminar evento con soft-delete \`deleted\_at=now()\`.  
\* Usar status \`scheduled\`, \`completed\`, \`cancelled\`.  
\* Usar default \`status='scheduled'\`.  
\* Usar \`starts\_at\`, \`ends\_at\`, \`all\_day\`.  
\* Usar \`location\_name\` y \`location\_address\` si se muestra ubicación textual.  
\* Usar \`visibility='household'/'personal'\`.  
\* Usar \`created\_by\`.

**\#\#\#\# Calendar**

\* Mostrar eventos desde \`events\`.  
\* Mostrar \`CalendarView\` como vista de eventos.  
\* Usar campos de fecha de tasks como base para mostrar tareas con fecha, marcando que la relación con Calendar es implícita.

**\#\#\#\# Navegación**

\* Planner vive en Bottom Nav.  
\* Home puede mostrar Tareas y Eventos y redirigir a Planner.

**\---**

**\#\#\# DEMO PREMIUM**

\* \`PlannerDashboard\` con secciones visibles de Tasks y Calendar.  
\* \`CalendarView\` como vista visual de eventos.  
\* Cards de Home para \`Eventos\` y \`Tareas\` que redirijan a Planner.  
\* Mostrar tareas vencidas calculadas por \`due\_date\`/\`due\_time\`.  
\* Mostrar badges por prioridad.  
\* Mostrar badges por estado.  
\* Mostrar badges por visibilidad.  
\* Mostrar badges de verificación usando \`requires\_verification\` / \`verified\_at\`.  
\* Mostrar categorías/áreas operativas desde \`responsibilities\`, con ejemplos encontrados: \`Compras\`, \`Limpieza\`, \`Mascotas\`.  
\* Mostrar evento \`all\_day\` como label.  
\* Mostrar ubicación textual de evento con \`location\_name\` o \`location\_address\`.

**\---**

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

No se encontró instrucción explícita de AsyncStorage, mock service ni estado local.

Información que podría alimentar un service demo/local sin inventar contratos:

\* Arrays locales de \`tasks\` con campos explícitos del modelo.  
\* Arrays locales de \`events\` con campos explícitos del modelo.  
\* Arrays locales de \`responsibilities\` con campos explícitos del modelo.  
\* Operaciones locales equivalentes a las acciones encontradas:  
  \* listar;  
  \* crear;  
  \* editar;  
  \* completar;  
  \* verificar;  
  \* soft-delete;  
  \* crear/editar/eliminar eventos.

No se deben inventar nombres de funciones ni endpoints desde este fragment.

**\---**

**\#\#\# POST\_MVP**

\* \`task\_dependencies\`.  
\* \`task\_comments\`.  
\* \`task\_attachments\`.  
\* \`task\_templates\` como tabla editable/CRUD.  
\* Subtareas por \`parent\_task\_id\`.  
\* Relación con \`goal\_id\`.  
\* Goals.  
\* Milestones.  
\* Streaks.  
\* \`recurrence\_rule\` RFC 5545\.  
\* \`recurrence\_end\` asociado a RRULE.  
\* Participantes avanzados de eventos.  
\* \`event\_participants.response\`: \`accepted\`, \`declined\`, \`maybe\`.  
\* \`location\_coordinates\` si implica mapas, GPS o geospatial real.  
\* Notificaciones reales/push por tareas vencidas.  
\* Auditoría completa aunque \`tasks\` y \`events\` tienen audit trigger.  
\* Métricas reales de carga derivadas de tareas.

**\---**

**\#\#\# IGNORAR**

No desarrollar desde este fragment.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| \`PlannerDashboard\` | Tasks y Calendar dentro de Planner. El archivo asociado también menciona Goals, pero Goals queda fuera de este fragment. | No se especifican acciones concretas. | No se especifican loading/empty/toast. Puede mostrar estados de tasks/events porque existen en modelo. | Acceso desde \`\[Planner\]\` en Bottom Nav. | DEMO PREMIUM / REAL PARCIAL |  
| \`CalendarView\` | Vista de calendario de eventos. | Ver eventos. No se especifican acciones concretas. | Estados de evento: \`scheduled\`, \`completed\`, \`cancelled\`. | Dentro de Planner. | REAL PARCIAL |  
| Sección/card \`Eventos\` en \`HomeDashboard\` | Eventos dentro de Home. | Redirigir al módulo correspondiente según regla de Home. | No se especifican estados UX. | Desde Home hacia Planner/Eventos. | Dependencia externa / DEMO PREMIUM |  
| Sección/card \`Tareas\` en \`HomeDashboard\` | Tareas dentro de Home. | Redirigir al módulo correspondiente según regla de Home. | Puede mostrar pendientes/vencidas por modelo; no hay UI explícita. | Desde Home hacia Planner/Tasks. | Dependencia externa / DEMO PREMIUM |  
| \`BottomNavigation\` | \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`. | Abrir Planner. | No se especifican estados. | Tab principal. | Dependencia externa / REAL |  
| \`QuickActions\` | Panel flotante desde \`+\`; acciones dinámicas por frecuencia. | No se especifica crear tarea/evento en este documento. | No se especifican estados. | Desde botón \`+\`. | Dependencia externa / CONTEXTO |  
| Task List | No se encontró UI explícita. | Listar/completar/editar/eliminar están soportadas por modelo/RLS, pero no por UI explícita. | No encontrado. | No encontrado. | Información faltante |  
| Create/Edit Task | No se encontró UI explícita. | Crear/editar existe a nivel RLS/campos. | No encontrado. | No encontrado. | Información faltante |  
| Event List | No se encontró UI explícita separada. | Listar eventos existe a nivel RLS/campos. | No encontrado. | No encontrado. | Información faltante |  
| Create/Edit Event | No se encontró UI explícita. | Crear/editar existe a nivel RLS/campos. | No encontrado. | No encontrado. | Información faltante |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| \`pending\` | Tasks | Badge/estado inicial de tarea | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO |  
| \`in\_progress\` | Tasks | Badge/estado intermedio | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO, pero contradice estados MVP del prompt |  
| \`completed\` | Tasks | Badge/estado completado; feedback al completar | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO |  
| \`cancelled\` | Tasks | Badge/estado cancelado | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO, pero fuera de estados MVP del prompt |  
| \`low\` | Tasks | Badge de prioridad | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO |  
| \`medium\` | Tasks | Badge/default de prioridad | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO |  
| \`high\` | Tasks | Badge de prioridad | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO |  
| \`critical\` | Tasks | Badge de prioridad crítica | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO |  
| \`household\` | Tasks/Events | Badge de visibilidad hogar | Documento principal \`\#\#\# 2.1 tasks\`, \`\#\#\# 2.6 events\` | REAL MÍNIMO |  
| \`personal\` | Tasks/Events | Badge de visibilidad personal | Documento principal \`\#\#\# 2.1 tasks\`, \`\#\#\# 2.6 events\` | REAL MÍNIMO |  
| \`Compras\` | Responsibilities/Tasks | Categoría/área operativa para tareas | Archivo de comprensión \`OUTPUT 1 — ENTITIES\`, \`Responsibility\` | DEMO PREMIUM |  
| \`Limpieza\` | Responsibilities/Tasks | Categoría/área operativa para tareas | Archivo de comprensión \`OUTPUT 1 — ENTITIES\`, \`Responsibility\` | DEMO PREMIUM |  
| \`Mascotas\` | Responsibilities/Tasks | Categoría/área operativa para tareas | Archivo de comprensión \`OUTPUT 1 — ENTITIES\`, \`Responsibility\` | DEMO PREMIUM |  
| \`requires\_verification\` | Tasks | Badge “requiere verificación” | Documento principal \`\#\#\# 2.1 tasks\`; archivo de comprensión \`TaskVerification\` | REAL MÍNIMO PARCIAL |  
| \`verified\_at\` | Tasks | Badge/estado visual de verificación realizada | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO PARCIAL |  
| \`scheduled\` | Events | Badge/estado programado | Documento principal \`\#\#\# 2.6 events\` | REAL MÍNIMO |  
| \`completed\` | Events | Badge/estado completado | Documento principal \`\#\#\# 2.6 events\` | REAL MÍNIMO |  
| \`cancelled\` | Events | Badge/estado cancelado | Documento principal \`\#\#\# 2.6 events\` | REAL MÍNIMO |  
| \`all\_day=false\` | Events | Label o toggle de evento de día completo | Documento principal \`\#\#\# 2.6 events\` | REAL MÍNIMO |  
| \`location\_name\` | Events | Mostrar lugar del evento | Documento principal \`\#\#\# 2.6 events\` | DEMO PREMIUM |  
| \`location\_address\` | Events | Mostrar dirección del evento | Documento principal \`\#\#\# 2.6 events\` | DEMO PREMIUM |

**\#\#\# Datos demo faltantes**

\* Faltan nombres concretos de tareas.  
\* Faltan nombres concretos de eventos.  
\* Faltan nombres de miembros demo.  
\* Faltan horarios o fechas de ejemplo.  
\* Faltan textos de botones.  
\* Faltan textos de empty state.  
\* Faltan mensajes de feedback.

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Listar tareas | Miembros del household; personal solo \`assigned\_to\` y \`created\_by\` | Lista de tareas filtrada por hogar/visibilidad | REAL MÍNIMO | Documento principal \`\#\#\# 2.1 tasks\`, RLS SELECT |  
| Crear tarea | Adulto, Coordinador, Senior; Adolescente puede crear tareas propias | Nueva tarea con estado \`pending\` | REAL MÍNIMO | Documento principal \`\#\#\# 2.1 tasks\`, RLS INSERT |  
| Editar tarea | \`assigned\_to\`, \`created\_by\` o Coordinador | Tarea actualizada | REAL MÍNIMO | Documento principal \`\#\#\# 2.1 tasks\`, RLS UPDATE |  
| Completar tarea | \`assigned\_to\`; también Coordinador por regla “todo” | Tarea con status \`completed\`, \`completed\_by\`, \`completed\_at\` | REAL MÍNIMO | Documento principal \`\#\#\# 2.1 tasks\`; archivo de comprensión relaciones |  
| Verificar tarea | Miembro del hogar no detallado; campos apuntan a \`household\_members\` | \`verified\_by\` y \`verified\_at\` completos | REAL PARCIAL | Documento principal \`\#\#\# 2.1 tasks\`; archivo de comprensión \`TaskVerification\` |  
| Eliminar tarea | \`created\_by\` o Coordinador | Soft-delete con \`deleted\_at=now()\` | REAL MÍNIMO | Documento principal \`\#\#\# 2.1 tasks\`, RLS DELETE |  
| Asignar responsable | No se detalla como acción separada; se infiere por campo \`assigned\_to\` y UPDATE | Tarea muestra responsable | REAL PARCIAL | Documento principal \`\#\#\# 2.1 tasks\` |  
| Cambiar prioridad | No se detalla como acción separada; se infiere por campo \`priority\` y UPDATE | Badge/valor de prioridad actualizado | REAL PARCIAL | Documento principal \`\#\#\# 2.1 tasks\` |  
| Definir fecha límite | No se detalla como acción separada; se infiere por campos \`due\_date\`, \`due\_time\` y UPDATE | Tarea muestra vencimiento | REAL PARCIAL | Documento principal \`\#\#\# 2.1 tasks\` |  
| Listar eventos | Miembros del household; personal solo \`created\_by\` | Lista/calendario de eventos | REAL MÍNIMO | Documento principal \`\#\#\# 2.6 events\`, RLS SELECT |  
| Crear evento | Adulto, Coordinador, Senior, Adolescente | Evento nuevo con estado \`scheduled\` | REAL MÍNIMO | Documento principal \`\#\#\# 2.6 events\`, RLS INSERT |  
| Editar evento | \`created\_by\` o Coordinador | Evento actualizado | REAL MÍNIMO | Documento principal \`\#\#\# 2.6 events\`, RLS UPDATE |  
| Eliminar evento | \`created\_by\` o Coordinador | Soft-delete con \`deleted\_at=now()\` | REAL MÍNIMO | Documento principal \`\#\#\# 2.6 events\`, RLS DELETE |  
| Cancelar evento | No se define acción, pero existe status \`cancelled\` | Evento visible como cancelado | REAL PARCIAL | Documento principal \`\#\#\# 2.6 events\` |  
| Ver calendario | No especificado por rol; hereda RLS de eventos/tareas | \`CalendarView\` con eventos | REAL PARCIAL / DEMO PREMIUM | Archivo de comprensión \`CalendarView\` |  
| Crear comentario de tarea | Miembros del household de la task | Comentario agregado | POST\_MVP | Documento principal \`\#\#\# 2.3 task\_comments\` |  
| Agregar adjunto a tarea | Miembros con acceso a la task | Archivo agregado | POST\_MVP | Documento principal \`\#\#\# 2.4 task\_attachments\` |  
| Gestionar dependencia de tarea | Misma política que tasks | Tarea bloqueada por otra | POST\_MVP | Documento principal \`\#\#\# 2.2 task\_dependencies\` |  
| Responder participación de evento | EventParticipant/member | Response \`pending/accepted/declined/maybe\` | POST\_MVP | Documento principal \`\#\#\# 2.7 event\_participants\` |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Puede mostrar \`Eventos\`.  
\* Puede mostrar \`Tareas\`.  
\* \`HomeDashboard\` incluye explícitamente \`Eventos\` y \`Tareas\` en su orden de widgets/secciones.  
\* \`Home\` no administra información; solo resume y redirige al módulo correspondiente.  
\* Para Planner, Home puede usar:  
  \* próximos eventos desde \`events.starts\_at\`, \`events.ends\_at\`, \`events.status\`;  
  \* tareas pendientes desde \`tasks.status\`, \`tasks.due\_date\`, \`tasks.assigned\_to\`;  
  \* tareas vencidas calculadas por \`due\_date\`/\`due\_time\`.  
\* \`tasks table\` alimenta métricas de carga y Home según el archivo de comprensión, pero métricas reales quedan fuera de este fragment.

**\#\#\# More**

\* Planner no vive en More según el documento.  
\* Planner vive en Bottom Nav.  
\* \`MoreMenu\` lista Finance, Inventory, FamilyCloud, Settings; no incluye Planner.

**\#\#\# Quick Actions**

\* Existe panel \`QuickActions\` desde \`+\`.  
\* Se define como panel de acciones dinámicas por frecuencia.  
\* No se encontró una acción explícita de Planner como “crear tarea” o “crear evento”.  
\* Se puede registrar solo como dependencia de navegación, no como contrato de acción.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Listar tareas | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS SELECT, sin contrato API | REAL MÍNIMO |  
| Crear tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS INSERT, sin contrato API | REAL MÍNIMO |  
| Editar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS UPDATE, sin contrato API | REAL MÍNIMO |  
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS UPDATE/campos, sin contrato API | REAL MÍNIMO |  
| Verificar tarea | No especificado | No especificado | No especificado | No especificado | Campos presentes, sin contrato API | REAL PARCIAL |  
| Eliminar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS DELETE soft-delete, sin contrato API | REAL MÍNIMO |  
| Listar eventos | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS SELECT, sin contrato API | REAL MÍNIMO |  
| Crear evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS INSERT, sin contrato API | REAL MÍNIMO |  
| Editar evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS UPDATE, sin contrato API | REAL MÍNIMO |  
| Eliminar evento | No especificado | No especificado | No especificado | No especificado | Acción mencionada por RLS DELETE soft-delete, sin contrato API | REAL MÍNIMO |  
| Ver calendario | No especificado | No especificado | No especificado | No especificado | Pantalla mencionada, sin contrato API | REAL PARCIAL |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| \`tasks\` | \`id\` | \`uuid\` | default \`gen\_random\_uuid()\` | Identificador interno | REAL MÍNIMO |  
| \`tasks\` | \`household\_id\` | \`uuid\` | FK → \`households.id\` | Aislamiento por hogar | REAL MÍNIMO |  
| \`tasks\` | \`title\` | \`text\` | requerido | Título visible de tarea | REAL MÍNIMO |  
| \`tasks\` | \`description\` | \`text\` | nullable | Descripción visible | REAL MÍNIMO |  
| \`tasks\` | \`visibility\` | \`text\` | default \`household\`; \`household\`, \`personal\` | Badge/filtro de visibilidad | REAL MÍNIMO |  
| \`tasks\` | \`status\` | \`text\` | default \`pending\`; \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\` | Estado visual/interacción completar/cancelar | REAL MÍNIMO con contradicción MVP |  
| \`tasks\` | \`priority\` | \`text\` | default \`medium\`; \`low\`, \`medium\`, \`high\`, \`critical\` | Badge/filtro de prioridad | REAL MÍNIMO |  
| \`tasks\` | \`start\_date\` | \`date\` | nullable | Fecha de inicio | REAL MÍNIMO |  
| \`tasks\` | \`due\_date\` | \`date\` | nullable | Fecha límite; cálculo de vencida | REAL MÍNIMO |  
| \`tasks\` | \`due\_time\` | \`time\` | nullable | Hora límite | REAL MÍNIMO |  
| \`tasks\` | \`recurrence\_rule\` | \`text\` | nullable; RFC 5545 RRULE | No usar para recurrencia simple MVP desde este documento | POST\_MVP |  
| \`tasks\` | \`recurrence\_end\` | \`date\` | nullable | Fin de recurrencia avanzada | POST\_MVP |  
| \`tasks\` | \`responsibility\_id\` | \`uuid\` | requerido; FK → \`responsibilities.id\` | Categoría/área operativa obligatoria | REAL MÍNIMO / RIESGO |  
| \`tasks\` | \`goal\_id\` | \`uuid\` | nullable; FK → \`goals.id\` | Relación con Goals | POST\_MVP |  
| \`tasks\` | \`created\_by\` | \`uuid\` | requerido; FK → \`household\_members.id\` | Mostrar creador/permisos edición | REAL MÍNIMO |  
| \`tasks\` | \`assigned\_to\` | \`uuid\` | nullable; FK → \`household\_members.id\` | Responsable visible/asignación | REAL MÍNIMO |  
| \`tasks\` | \`completed\_by\` | \`uuid\` | nullable; FK → \`household\_members.id\` | Feedback de completado | REAL MÍNIMO |  
| \`tasks\` | \`completed\_at\` | \`timestamptz\` | nullable | Fecha de completado | REAL MÍNIMO |  
| \`tasks\` | \`requires\_verification\` | \`boolean\` | default \`false\` | Badge/requiere verificación | REAL MÍNIMO PARCIAL |  
| \`tasks\` | \`verified\_by\` | \`uuid\` | nullable; FK → \`household\_members.id\` | Quién verificó | REAL MÍNIMO PARCIAL |  
| \`tasks\` | \`verified\_at\` | \`timestamptz\` | nullable | Fecha de verificación | REAL MÍNIMO PARCIAL |  
| \`tasks\` | \`parent\_task\_id\` | \`uuid\` | nullable; FK → \`tasks.id\` | Subtarea un nivel | POST\_MVP |  
| \`tasks\` | \`event\_id\` | \`uuid\` | nullable; FK → \`events.id\` | Relación tarea-evento | REAL PARCIAL / DEPENDENCIA |  
| \`tasks\` | \`deleted\_at\` | \`timestamptz\` | nullable; papelera 30 días | Soft-delete/ocultar eliminadas | REAL MÍNIMO |  
| \`tasks\` | \`created\_at\` | \`timestamptz\` | default \`now()\` | Orden/listado | REAL MÍNIMO |  
| \`tasks\` | \`updated\_at\` | \`timestamptz\` | default \`now()\` | Última actualización | REAL MÍNIMO |  
| \`task\_dependencies\` | \`task\_id\` | \`uuid\` | FK → \`tasks.id\` | Dependencia bloqueante | POST\_MVP |  
| \`task\_dependencies\` | \`depends\_on\_task\_id\` | \`uuid\` | FK → \`tasks.id\` | Tarea bloqueante | POST\_MVP |  
| \`task\_comments\` | \`content\` | \`text\` | requerido | Comentarios | POST\_MVP |  
| \`task\_attachments\` | \`file\_name\` | \`text\` | requerido | Adjuntos | POST\_MVP |  
| \`task\_attachments\` | \`file\_path\` | \`text\` | requerido | Storage real | POST\_MVP |  
| \`task\_templates\` | \`title\` | \`text\` | requerido | Template editable | POST\_MVP; contradice templates constantes MVP |  
| \`task\_templates\` | \`default\_assignee\_id\` | \`uuid\` | nullable | Asignación default | POST\_MVP |  
| \`task\_templates\` | \`default\_priority\` | \`text\` | default \`medium\` | Prioridad default | POST\_MVP |  
| \`task\_templates\` | \`default\_due\_time\` | \`time\` | nullable | Hora default | POST\_MVP |  
| \`task\_templates\` | \`category\` | \`text\` | nullable | Categoría | POST\_MVP |  
| \`events\` | \`id\` | \`uuid\` | default \`gen\_random\_uuid()\` | Identificador interno | REAL MÍNIMO |  
| \`events\` | \`household\_id\` | \`uuid\` | FK → \`households.id\` | Aislamiento por hogar | REAL MÍNIMO |  
| \`events\` | \`title\` | \`text\` | requerido | Título visible de evento | REAL MÍNIMO |  
| \`events\` | \`description\` | \`text\` | nullable | Descripción visible | REAL MÍNIMO |  
| \`events\` | \`visibility\` | \`text\` | default \`household\`; \`household\`, \`personal\` | Badge/filtro de visibilidad | REAL MÍNIMO |  
| \`events\` | \`status\` | \`text\` | default \`scheduled\`; \`scheduled\`, \`completed\`, \`cancelled\` | Estado visible | REAL MÍNIMO |  
| \`events\` | \`all\_day\` | \`boolean\` | default \`false\` | Label/toggle día completo | REAL MÍNIMO |  
| \`events\` | \`starts\_at\` | \`timestamptz\` | requerido | Fecha/hora de inicio | REAL MÍNIMO |  
| \`events\` | \`ends\_at\` | \`timestamptz\` | nullable | Fecha/hora de fin | REAL MÍNIMO |  
| \`events\` | \`recurrence\_rule\` | \`text\` | nullable; RFC 5545 RRULE | Recurrencia avanzada | POST\_MVP |  
| \`events\` | \`recurrence\_end\` | \`date\` | nullable | Fin recurrencia avanzada | POST\_MVP |  
| \`events\` | \`location\_name\` | \`text\` | nullable | Lugar visible | DEMO PREMIUM |  
| \`events\` | \`location\_address\` | \`text\` | nullable | Dirección visible | DEMO PREMIUM |  
| \`events\` | \`location\_coordinates\` | \`point\` | nullable | Mapa/GPS real | POST\_MVP |  
| \`events\` | \`created\_by\` | \`uuid\` | FK → \`household\_members.id\` | Creador/permisos edición | REAL MÍNIMO |  
| \`events\` | \`deleted\_at\` | \`timestamptz\` | nullable; papelera 30 días | Soft-delete | REAL MÍNIMO |  
| \`events\` | \`created\_at\` | \`timestamptz\` | default \`now()\` | Orden/listado | REAL MÍNIMO |  
| \`events\` | \`updated\_at\` | \`timestamptz\` | default \`now()\` | Última actualización | REAL MÍNIMO |  
| \`event\_participants\` | \`event\_id\` | \`uuid\` | FK → \`events.id\` | Participantes de evento | POST\_MVP |  
| \`event\_participants\` | \`member\_id\` | \`uuid\` | FK → \`household\_members.id\` | Participante | POST\_MVP |  
| \`event\_participants\` | \`response\` | \`text\` | default \`pending\`; \`pending\`, \`accepted\`, \`declined\`, \`maybe\` | RSVP avanzado | POST\_MVP |  
| \`responsibilities\` | \`id\` | \`uuid\` | default \`gen\_random\_uuid()\` | Identificador de área | REAL MÍNIMO / DEPENDENCIA |  
| \`responsibilities\` | \`household\_id\` | \`uuid\` | FK → \`households.id\` | Aislamiento por hogar | REAL MÍNIMO / DEPENDENCIA |  
| \`responsibilities\` | \`title\` | \`text\` | requerido | Categoría/área visible | REAL MÍNIMO / DEPENDENCIA |  
| \`responsibilities\` | \`description\` | \`text\` | nullable | Descripción de área | DEMO PREMIUM |  
| \`responsibilities\` | \`category\` | \`text\` | nullable | Agrupación visual | DEMO PREMIUM |  
| \`responsibilities\` | \`is\_active\` | \`boolean\` | default \`true\` | Filtrar activas | DEMO PREMIUM |  
| \`responsibility\_members\` | \`member\_id\` | \`uuid\` | FK → \`household\_members.id\` | Miembros por responsabilidad | POST\_MVP |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Tarea vencida | No usar status persistido; calcular por \`due\_date\`/\`due\_time\`. | Documento principal \`\#\#\# 2.1 tasks\` | REAL MÍNIMO |  
| Tarea personal | Solo visible para \`assigned\_to\` y \`created\_by\`. | Documento principal \`\#\#\# 2.1 tasks\`, RLS SELECT | REAL MÍNIMO |  
| Evento personal | Solo visible para \`created\_by\`. | Documento principal \`\#\#\# 2.6 events\`, RLS SELECT | REAL MÍNIMO |  
| Tarea eliminada | Soft-delete con \`deleted\_at=now()\`; no mezclar con enum de status. | Documento principal \`\#\#\# 2.1 tasks\`, \`15.1\`, \`15.3\` | REAL MÍNIMO |  
| Evento eliminado | Soft-delete con \`deleted\_at=now()\`; no mezclar con enum de status. | Documento principal \`\#\#\# 2.6 events\`, \`15.1\`, \`15.3\` | REAL MÍNIMO |  
| Papelera 30 días | Items eliminados se conservan 30 días antes de limpieza. | Documento principal \`14.2 cleanup\_jobs\`, \`15.1\` | REAL MÍNIMO |  
| \`responsibility\_id\` obligatorio | Toda tarea debe tener responsabilidad asociada. | Documento principal \`\#\#\# 2.1 tasks\`, \`15.1 D-13\` | REAL MÍNIMO / RIESGO |  
| Verificación de tareas | Existe por campos, pero no por estados oficiales \`awaiting\_verification\`/\`verified\`. | Documento principal \`\#\#\# 2.1 tasks\`; archivo asociado \`TaskVerification\`; source\_map | REAL PARCIAL / CONTRADICCIÓN |  
| Recurrencia | Documento usa RRULE; prompt MVP pide recurrencia simple. | Documento principal \`\#\#\# 2.1 tasks\`, \`\#\#\# 2.6 events\`; source\_map | POST\_MVP / CONTRADICCIÓN |  
| \`ends\_at\` nullable | Evento puede no tener fin explícito. | Documento principal \`\#\#\# 2.6 events\` | REAL MÍNIMO / EDGE CASE |  
| \`all\_day=false\` default | Eventos no son de día completo por defecto. | Documento principal \`\#\#\# 2.6 events\` | REAL MÍNIMO |  
| Participantes de eventos | RSVP \`accepted/declined/maybe\` queda fuera del MVP de este fragment. | Documento principal \`\#\#\# 2.7 event\_participants\` | POST\_MVP |  
| Dependencias entre tareas | Tarea puede quedar bloqueada si previa no se completa, pero queda fuera del MVP visual actual. | Documento principal \`\#\#\# 2.2 task\_dependencies\` | POST\_MVP |  
| Comentarios | Existen como tabla pero no se desarrollan. | Documento principal \`\#\#\# 2.3 task\_comments\` | POST\_MVP |  
| Adjuntos | Existen como tabla y storage path, pero no se desarrollan. | Documento principal \`\#\#\# 2.4 task\_attachments\` | POST\_MVP |  
| Templates editables | Existen como tabla, pero contradicen regla de templates constantes sin CRUD. | Documento principal \`\#\#\# 2.5 task\_templates\`; source\_map | POST\_MVP / CONTRADICCIÓN |  
| Streaks | Derivan de completitud de tareas, permanentes y recalculables. | Documento principal \`\#\#\# 2.12 streaks\` | POST\_MVP |  
| Sin UI explícita | No hay estructura de pantallas/formularios/listas. | Documento completo \+ source\_map | Información faltante |  
| Sin API explícita | No hay endpoint, request ni response. | Documento completo \+ source\_map | Información faltante |  
| Sin empty states | No hay textos ni comportamiento para listas vacías. | Documento completo \+ source\_map | Información faltante |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

**\#\#\# Restricciones aplicables al fragment**

\* RLS por \`household\_id\`.  
\* Toda política usa \`household\_id IN (SELECT household\_id FROM household\_members WHERE user\_id \= auth.uid())\` como base.  
\* \`deleted\_at IS NULL\` se agrega en SELECT para soft-delete.  
\* Las políticas de INSERT/UPDATE/DELETE restringen por rol.  
\* \`tasks\` SELECT:  
  \* miembros del household;  
  \* si \`visibility='personal'\`, solo \`assigned\_to\` y \`created\_by\`.  
\* \`events\` SELECT:  
  \* miembros del household;  
  \* si \`visibility='personal'\`, solo \`created\_by\`.  
\* \`tasks\` INSERT:  
  \* Adulto, Coordinador, Senior;  
  \* Adolescente puede crear tareas propias.  
\* \`events\` INSERT:  
  \* Adulto, Coordinador, Senior, Adolescente.  
\* \`tasks\` UPDATE:  
  \* \`assigned\_to\` puede marcar completada/editar;  
  \* \`created\_by\` puede editar;  
  \* Coordinador puede todo.  
\* \`events\` UPDATE:  
  \* \`created\_by\` o Coordinador.  
\* \`tasks\` DELETE:  
  \* \`created\_by\` o Coordinador;  
  \* soft-delete: \`deleted\_at=now()\`.  
\* \`events\` DELETE:  
  \* \`created\_by\` o Coordinador;  
  \* soft-delete: \`deleted\_at=now()\`.  
\* \`status\` no incluye \`deleted\`.  
\* Soft-delete no se mezcla con enum de status.  
\* Tarea vencida es calculada, no estado persistido.  
\* Una tarea siempre tiene una responsabilidad principal.  
\* \`audit\_trigger\` existe para \`tasks\` y \`events\`, pero auditoría completa no se debe desarrollar en este fragment.

**\#\#\# Prohibiciones / límites para este fragment**

\* No implementar RRULE como MVP visual obligatorio.  
\* No implementar EXDATE ni excepciones avanzadas.  
\* No implementar comentarios.  
\* No implementar adjuntos/storage.  
\* No implementar subtareas.  
\* No implementar dependencias bloqueantes.  
\* No implementar Goals ni Milestones.  
\* No implementar Streaks.  
\* No implementar participantes avanzados/RSVP.  
\* No implementar push real ni notificaciones reales.  
\* No implementar auditoría completa.  
\* No implementar mapas ni GPS real.  
\* No convertir \`task\_templates\` en CRUD MVP; el documento las define como tabla, pero el prompt las deja fuera si son personalizadas/editables.  
\* No desarrollar Home; solo registrar conexión \`Eventos\`/\`Tareas\`.  
\* No desarrollar People/Members; solo usarlo como dependencia para \`assigned\_to\`, \`created\_by\`, permisos y RLS.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| UI detallada de Planner | Codex no tiene layout exacto para pantalla principal, secciones, tabs, cards o header. | Necesita resolver visual con criterio de demo en etapa posterior. |  
| UI de Task List | No hay estructura de lista, cards, filtros, agrupación ni empty state. | La implementación visual queda incompleta si no se decide después. |  
| UI de Create/Edit Task | No hay formulario, inputs, labels ni validaciones visuales. | Codex no puede derivar pantalla de creación sin completar huecos. |  
| UI de Event List/Calendar | Solo existe \`CalendarView\`, sin día/semana/mes ni estructura. | La demo necesita decidir vista simple después. |  
| UI de Create/Edit Event | No hay formulario ni botones. | Codex no puede construir interacción completa sin decisión posterior. |  
| Acciones Quick Actions concretas | El documento menciona QuickActions dinámicas, pero no crear tarea/evento. | No se puede exigir acción rápida de Planner desde este documento. |  
| Contrato API | No hay endpoints, métodos, request, response ni errores. | Codex debe usar service/mock/local o esperar otra fuente. |  
| Service aislado explícito | No hay nombre ni contrato de service. | Solo se pueden extraer entidades y acciones fuente. |  
| Datos demo concretos | No hay ejemplos reales de tareas/eventos/miembros/fechas. | La demo necesita mocks creados en otra etapa. |  
| Feedback UX | No hay toast, loading, success, error, empty state, disabled state. | Codex necesita definir feedback desde otra fuente o etapa de diseño. |  
| Estados MVP de verification flow | El prompt espera \`awaiting\_verification\` y \`verified\`, pero el documento no los define como \`status\`. | Riesgo de contradicción con modelo de datos. |  
| Templates predefinidas MVP | El documento define \`task\_templates\` como tabla editable y no lista las templates del prompt. | No usar tabla como MVP; faltan constantes explícitas desde documento. |  
| Recurrencia simple | El prompt pide \`none/daily/weekly/monthly\`; el documento solo trae RRULE. | No hay fuente para UI simple de recurrencia salvo clasificación posterior. |  
| Vistas día/semana/mes | No aparecen en documento. | No se pueden extraer como UI explícita. |  
| Permisos finos para verificación | Hay campos de verificación, pero no quién puede verificar ni reglas anti-autoverificación. | No se puede implementar regla real sin otra fuente. |  
| Criterio de cancelar evento | Existe \`status='cancelled'\` y también soft-delete. | Falta decidir si cancelar es status o eliminación. |  
| Relación explícita Calendar ↔ tasks con fecha | El documento tiene campos de fecha en tasks, pero no dice que CalendarView los renderiza. | Mostrar tareas en calendario queda como relación implícita. |  
| Validaciones de fecha de evento | No se define si \`ends\_at\` debe ser mayor que \`starts\_at\`. | Faltan errores/validación. |  
| Reglas para Guest/Child en Planner | El documento no detalla acciones permitidas para Guest/Child en tasks/events salvo roles mencionados en RLS. | Permisos visuales incompletos. |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Documento principal**

\* Archivo: \`HomePlus — Esquema de base de datos v1(1).md\`  
\* Secciones usadas:  
  \* \`\#\# 0\. Diagrama Relacional Conceptual\`  
  \* \`\#\#\# Relaciones clave\`  
  \* \`\#\#\# 1.2 household\_members\` como dependencia externa de miembros/roles/RLS.  
  \* \`\#\# 2\. DOMINIO: Planner\`  
  \* \`\#\#\# 2.1 tasks\`  
  \* \`\#\#\# 2.2 task\_dependencies\` — POST\_MVP.  
  \* \`\#\#\# 2.3 task\_comments\` — POST\_MVP.  
  \* \`\#\#\# 2.4 task\_attachments\` — POST\_MVP.  
  \* \`\#\#\# 2.5 task\_templates\` — POST\_MVP/contradicción con templates constantes.  
  \* \`\#\#\# 2.6 events\`  
  \* \`\#\#\# 2.7 event\_participants\` — POST\_MVP.  
  \* \`\#\#\# 2.10 responsibilities\` — dependencia directa de Tasks.  
  \* \`\#\#\# 2.11 responsibility\_members\` — POST\_MVP.  
  \* \`\#\#\# 2.12 streaks\` — POST\_MVP.  
  \* \`\#\#\# 14.1 trigger\_audit\_log\` — solo restricción/POST\_MVP de auditoría.  
  \* \`14.2 cleanup\_jobs (cron)\` — soft-delete/papelera 30 días.  
  \* \`15.1 Decisiones Arquitectónicas\`  
  \* \`15.2 Tradeoffs\`  
  \* \`15.3 Convenciones de Nomenclatura\`  
  \* \`15.4 Principios de RLS\`

**\#\#\# Archivo de comprensión asociado**

\* Archivo: \`Esquema de base de datos v1(2).txt\`  
\* Secciones usadas:  
  \* \`OUTPUT 1 — ENTITIES\`  
    \* \`Task\`  
    \* \`TaskVerification\`  
    \* \`Event\`  
    \* \`Responsibility\`  
    \* \`PlannerDashboard\`  
    \* \`CalendarView\`  
    \* \`BottomNavigation\`  
    \* \`QuickActions\`  
    \* \`HomeDashboard\`  
  \* \`OUTPUT 2 — RELATIONSHIPS\`  
    \* relaciones \`HouseholdMember\` → \`Task\`  
    \* relaciones \`HouseholdMember\` → \`Event\`  
    \* relaciones \`Task\` → \`Event\`  
  \* \`OUTPUT 4 — DATA FLOWS\`  
    \* tareas completadas/asignadas/vencidas hacia métricas/Home/notificaciones/audit.  
    \* evento finalizado hacia sugerencia de álbum: clasificado POST\_MVP/no desarrollar.  
  \* \`OUTPUT 5 — BUSINESS RULES\`  
    \* Home resume y redirige.  
    \* navegación ≤3 niveles objetivo, \>4 niveles fallo.  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`  
    \* usado solo cuando refuerza RLS/soft-delete/recurrencia/streaks.

**\#\#\# Source map previo**

\* Archivo: \`source\_map\_HomePlus\_Esquema\_de\_base\_de\_datos\_v1.md\`  
\* Secciones usadas:  
  \* \`\# 4.7 PLANNER\`  
  \* \`\# 4.8 TASKS\`  
  \* \`\# 4.9 EVENTS\`  
  \* \`\# 4.10 CALENDAR\`  
  \* \`\# 4.11 HOME\`  
  \* \`\#\# 5\. Mapa de entidades\`  
  \* \`\#\# 6\. Mapa de relaciones\`  
  \* \`\#\# 7\. Mapa de estados\`  
  \* \`\#\# 8\. Mapa de permisos\`  
  \* \`\#\# 9\. Mapa de flujos\`  
  \* \`\#\# 10\. Mapa de APIs\`  
  \* \`\#\# 11\. Mapa de UI\`  
  \* \`\#\# 13\. Restricciones arquitectónicas detectadas\`  
  \* \`\#\# 17\. Contradicciones detectadas\`  
  \* \`\#\# 18\. Información faltante\`

**\---**

**\#\# Nota de uso para merge posterior**

Este fragment no resuelve contradicciones. Para merge posterior, tratar especialmente:

\* \`tasks.status\` del documento (\`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\`) vs estados MVP esperados para verification flow.  
\* Verificación por campos (\`requires\_verification\`, \`verified\_by\`, \`verified\_at\`) vs estados \`awaiting\_verification\`/\`verified\` no encontrados.  
\* \`task\_templates\` como tabla editable vs templates MVP como constantes sin CRUD.  
\* \`recurrence\_rule\` RRULE vs recurrencia simple MVP.  
\* \`responsibility\_id\` obligatorio vs necesidad de demo barata/simple.  
\* \`CalendarView\` solo menciona eventos; mostrar tareas con fecha es implícito, no explícito.

**\# PLANNER fragment — HomePlus — Eventos del sistema v1**

**\#\# 1\. Rol del módulo en la demo**

Información explícita encontrada:

\* Planner aparece como dominio con \`Task\`, \`Event\`, \`EventParticipant\`, \`Responsibility\`, \`TaskVerification\`, \`PlannerDashboard\` y \`CalendarView\`.  
\* \`PlannerDashboard\` se describe como “Vista principal de Planner con Tasks, Calendar y Goals”. Para este fragment se extraen solo Tasks, Events y Calendar; no se desarrolla Goals.  
\* \`CalendarView\` se describe como “Vista de calendario de eventos”.  
\* Tasks cubre tareas del hogar o personales.  
\* Events cubre eventos del hogar o personales.  
\* Planner se conecta con miembros del hogar porque \`HouseholdMember\` crea, recibe, completa y verifica tareas, y crea eventos.  
\* Planner se conecta con Home porque eventos de tareas y calendario consumen \`B\` / Briefing, y \`HomeDashboard\` incluye Eventos y Tareas dentro de su orden visual.  
\* El documento principal está escrito como catálogo de eventos; sirve mejor para extraer acciones, payloads, estados, consumidores, prioridades y casos especiales que para extraer UI detallada.

No encontrado explícitamente:

\* Qué debe sentir el usuario.  
\* Problema familiar formulado como texto de producto.  
\* Copy de pantalla del Planner.  
\* Layout completo de pantalla.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

Pantallas / vistas encontradas:

\* \`PlannerDashboard\`: vista principal de Planner con Tasks y Calendar.  
\* \`CalendarView\`: vista de calendario de eventos.  
\* \`BottomNavigation\`: navegación congelada V1 con \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`QuickActions\`: panel flotante desde \`+\`; no se encontraron acciones específicas de Planner dentro de este documento.  
\* \`HomeDashboard\`: orden visual detectado: \`Briefing → Atención Requerida → Carga Familiar → Eventos → Tareas → Finanzas → Presence → Actividad\`.

Componentes o estructuras inferibles solo por nombre de entidad/pantalla:

\* Lista o sección de Tasks dentro de \`PlannerDashboard\`.  
\* Vista Calendar dentro de \`PlannerDashboard\` o como \`CalendarView\`.  
\* Cards/widgets de Eventos y Tareas dentro de Home.

Estados visibles encontrados en eventos:

\* Task: \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\`.  
\* Event: \`scheduled\`, \`completed\`, \`cancelled\`.  
\* Vencida no es estado de Task; se calcula por \`due\_date \< today()\`.  
\* Evento cancelado usa \`status → 'cancelled'\`.  
\* Evento completado puede ser automático o manual cuando pasa \`ends\_at\`.

Textos / labels encontrados que pueden servir como feedback visual:

\* \`Nueva tarea: \[title\]\`.  
\* \`Te asignaron: \[title\]\`.  
\* \`\[Display\_name\] empezó \[title\]\`.  
\* \`¡\[Verificador\] confirmó tu tarea\!\`.  
\* \`Tienes dos eventos solapados\`.  
\* \`Te invitaron a \[event\_title\]\`.  
\* Mensaje de briefing familiar encontrado en escalamiento: \`Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?\`.

No encontrado explícitamente:

\* Wireframe de Planner.  
\* Header, tabs, filtros, badges, botones o iconos específicos para Planner.  
\* Vista día / semana / mes.  
\* Estado vacío de tareas.  
\* Estado vacío de calendario.  
\* Form visual de crear/editar tarea.  
\* Form visual de crear/editar evento.

**\#\#\# 2.2 Datos creíbles**

Datos / ejemplos encontrados que pueden servir como mock o demo, sin inventar nuevos:

\* Categorías/responsabilidades explícitas: \`Compras\`, \`Limpieza\`, \`Mascotas\`.  
\* Campos de task que permiten construir datos creíbles: \`title\`, \`description\`, \`visibility\`, \`priority\`, \`due\_date\`, \`due\_time\`, \`responsibility\_id\`, \`created\_by\`, \`assigned\_to\`.  
\* Campos de vencimiento: \`due\_date\`, \`days\_overdue\`, \`hours\_remaining\`.  
\* Campos de verificación: \`requires\_verification\`, \`verified\_by\`, \`verified\_at\`, \`completed\_by\`, \`completed\_at\`.  
\* Campos de event que permiten construir datos creíbles: \`title\`, \`description\`, \`visibility\`, \`all\_day\`, \`starts\_at\`, \`ends\_at\`, \`location\_name\`, \`created\_by\`, \`participants\`.  
\* Campos de cambios de evento: \`changed\_fields\`, \`old\_starts\_at\`, \`new\_starts\_at\`, \`old\_ends\_at\`, \`new\_ends\_at\`.  
\* Recordatorios de eventos: \`30min\`, \`1h\`, \`1d\` según preferencia.  
\* Prioridades del sistema: \`🟢 BA\`, \`🟡 ME\`, \`🟠 AL\`.  
\* Condición de urgencia de task overdue: día 1 \= \`🟡 ME\`; \`days\_overdue \> 1\` \= \`🟠 AL\`.  
\* Condición de urgencia en evento actualizado: cambio con \`\<24h\` de anticipación \= \`🟠 AL\`.  
\* Condición de urgencia en evento cancelado: evento \`≤2h\` \= \`🟠 AL\`.

Datos no encontrados:

\* Títulos concretos de tareas como “Comprar leche” dentro de Planner real. La frase “Comprar leche” aparece solo como razonamiento de conexión implícita y no como dato de pantalla.  
\* Títulos concretos de eventos.  
\* Nombres concretos de miembros.  
\* Lista completa de templates MVP \`Limpieza\`, \`Compras\`, \`Mascotas\`, \`Medicación\`, \`Estudios\`, \`Pagos\` como constantes de sistema.  
\* \`Medicación\`, \`Estudios\` y \`Pagos\` no aparecen como templates Planner en las fuentes usadas.

**\#\#\# 2.3 Acción interactiva**

Acciones encontradas para Tasks:

\* Crear tarea: \`task.created\`.  
\* Asignar o reasignar tarea: \`task.assigned\` y \`task.reassigned\`.  
\* Iniciar tarea: \`task.started\`.  
\* Completar tarea: \`task.completed\`.  
\* Verificar tarea completada: \`task.verified\`.  
\* Cancelar tarea: \`task.cancelled\`.  
\* Detectar tarea vencida por cron: \`task.overdue\`.  
\* Generar recordatorio de tarea por cron: \`task.reminder\_due\`.  
\* Comentar tarea: \`task.commented\`.  
\* Completar subtarea: \`subtask.completed\`.  
\* Actualizar progreso de tarea con subtareas: \`task.progress\_updated\`.

Acciones encontradas para Events / Calendar:

\* Crear evento: \`event.created\`.  
\* Actualizar evento: \`event.updated\`.  
\* Cancelar evento: \`event.cancelled\`.  
\* Completar evento: \`event.completed\`.  
\* Detectar conflicto entre eventos: \`event.conflict\_detected\`.  
\* Generar recordatorio de evento: \`event.reminder\_due\`.  
\* Agregar participante: \`event.participant\_added\`.  
\* Remover participante: \`event.participant\_removed\`.

Clasificación de acciones:

\* REAL mínimo útil para demo: crear tarea, asignar tarea, completar tarea, verificar tarea, cancelar tarea como equivalente visual de eliminar/cancelar; crear evento, actualizar evento, cancelar evento, mostrar evento completado.  
\* LOCAL / MOCK SERVICE posible según documento: acciones con \`Offline Q\` pueden mostrar feedback local inmediato, pero no implementar Offline Sync real en este fragment.  
\* POST\_MVP: comentarios, subtareas, progreso por subtareas, escalamiento Geni, conflicto Geni, recordatorios reales, notificaciones reales, auditoría completa, automations reales, streaks.

No encontrado explícitamente:

\* Acción “listar tareas” como evento o API.  
\* Acción “listar eventos” como evento o API.  
\* Acción “vista día/semana/mes”.  
\* Acción “filtrar”.  
\* Acción “buscar”.  
\* Acción “eliminar” como delete; aparece \`cancelled\` y regla de soft-delete, pero no endpoint de delete.

**\#\#\# 2.4 Feedback inmediato**

Feedback explícito o reusable desde consumidores/eventos:

\* Al crear tarea: notificación al asignado con \`Nueva tarea: \[title\]\`.  
\* Al asignar tarea: notificación al nuevo asignado con \`Te asignaron: \[title\]\`.  
\* Al iniciar tarea: notificación al creador con \`\[Display\_name\] empezó \[title\]\`.  
\* Al completar tarea: notificación al creador y al asignado si son diferentes.  
\* Al verificar tarea: notificación al usuario que completó con \`¡\[Verificador\] confirmó tu tarea\!\`.  
\* Al cancelar tarea: notificación al asignado si no es quien cancela.  
\* Al vencer tarea: notificación al asignado.  
\* Al crear evento: notificación a participantes.  
\* Al actualizar evento: notificación a participantes si cambió fecha/hora/ubicación.  
\* Al cancelar evento: notificación a todos los participantes.  
\* Al detectar conflicto: notificación al miembro afectado con \`Tienes dos eventos solapados\`.  
\* Al agregar participante: notificación con \`Te invitaron a \[event\_title\]\`.  
\* Al remover participante: notificación al miembro removido.

Estados de feedback por prioridad:

\* \`🟢 BA\`: baja, solo in-app, respeta quiet hours.  
\* \`🟡 ME\`: media, push estándar, se agrupa si hay múltiples en ventana corta.  
\* \`🟠 AL\`: alta, ignora quiet hours, respeta opt-in.

No encontrado explícitamente:

\* Toast.  
\* Loading.  
\* Skeleton.  
\* Spinner.  
\* Error visual.  
\* Retry.  
\* Disabled state.  
\* Confirmación modal.  
\* Empty state.

**\#\#\# 2.5 Service aislado**

No se encontró un service nombrado ni contrato de service.

Pistas extraídas para un service aislado de demo:

\* Fuente de datos de tareas: \`tasks\`.  
\* Fuente de datos de eventos: \`events\`.  
\* Fuente de participantes: \`event\_participants\`.  
\* Fuente de responsables/usuarios asignables: \`household\_members\`.  
\* Fuente de responsabilidades: \`responsibilities\`.  
\* Acción de task create usa payload con \`task\_id\`, \`household\_id\`, \`title\`, \`description\`, \`visibility\`, \`priority\`, \`due\_date\`, \`due\_time\`, \`recurrence\_rule\`, \`responsibility\_id\`, \`created\_by\`, \`assigned\_to\`.  
\* Acción de task complete usa \`completed\_by\`, \`completed\_at\`, \`was\_overdue\`.  
\* Acción de task verify usa \`verified\_by\`, \`verified\_at\`.  
\* Acción de task cancel usa \`cancelled\_by\`, \`reason\`.  
\* Acción de event create usa \`event\_id\`, \`household\_id\`, \`title\`, \`description\`, \`visibility\`, \`all\_day\`, \`starts\_at\`, \`ends\_at\`, \`location\_name\`, \`recurrence\_rule\`, \`created\_by\`, \`participants\`.  
\* Acción de event update usa \`changed\_fields\`, fechas anteriores/nuevas y \`updated\_by\`.  
\* Acción de event cancel usa \`cancelled\_by\`, \`reason\`, \`was\_recurring\`.  
\* Home puede consumir tareas/eventos por consumidor \`B\` / Briefing y por \`HomeDashboard\` con widgets de Eventos y Tareas.

Clasificación:

\* Service real/backend: no encontrado como contrato.  
\* Service mock/local: posible para demo a partir de payloads y acciones, pero el documento no lo nombra.  
\* Offline real: POST\_MVP / no implementar como sync real en este fragment.

**\#\#\# 2.6 Navegación coherente**

Navegación encontrada:

\* \`BottomNavigation\`: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`Planner\` existe como tab principal dentro de Bottom Navigation.  
\* \`QuickActions\`: panel flotante desde \`+\`; acciones dinámicas por frecuencia. No se encontró acción Planner específica dentro del documento.  
\* \`HomeDashboard\` resume y redirige al módulo correspondiente.  
\* Regla de navegación: más de 4 niveles de navegación es fallo de diseño; objetivo 95% de acciones en ≤3 niveles.

Dependencia externa / no desarrollar en este fragment:

\* \`People\` / \`HouseholdMember\` aporta miembros responsables, creadores, participantes y verificadores.  
\* \`Home\` muestra resumen de Tareas y Eventos y puede redirigir a Planner.  
\* \`QuickActions\` existe como acceso global por \`+\`, pero no se encontró acción concreta “crear tarea” o “crear evento” en este documento.

No encontrado explícitamente:

\* Flujo pantalla a pantalla dentro de Planner.  
\* Deep links.  
\* Back behavior.  
\* Rutas internas.  
\* Tabs internas Tasks / Calendar.  
\* Día / semana / mes.

**\#\#\# 2.7 Conexión con Home o More**

Home:

\* \`HomeDashboard\` incluye \`Eventos\` y \`Tareas\` en su orden visual.  
\* Regla: Home no administra información; solo resume y redirige al módulo correspondiente.  
\* Task events que consumen \`B\` / Briefing: \`task.created\`, \`task.started\`, \`task.completed\`, \`task.verified\`, \`task.cancelled\`, \`task.overdue\`, \`task.escalation\_level\_3\`, \`task.escalation\_level\_4\`, \`task.reassigned\`, \`subtask.completed\`, \`task.progress\_updated\`.  
\* Event events que consumen \`B\` / Briefing: \`event.created\`, \`event.updated\`, \`event.cancelled\`, \`event.completed\`, \`event.conflict\_detected\`.  
\* \`GeniBriefing\` resume/agrega Task y Event según el archivo de comprensión.

More:

\* No se encontró que Planner viva en More.  
\* Planner vive en Bottom Navigation como tab principal.

Quick Actions:

\* Existe el botón \`+\` como \`QuickActions\`.  
\* No se encontró acción específica de Planner en Quick Actions dentro de este documento.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

Tasks:

\* Mostrar tareas del hogar o personales desde entidad \`Task\`.  
\* Crear tarea con campos explícitos: \`title\`, \`description\`, \`visibility\`, \`priority\`, \`due\_date\`, \`due\_time\`, \`responsibility\_id\`, \`created\_by\`, \`assigned\_to\`, \`household\_id\`.  
\* Asignar/reasignar responsable con \`assigned\_to\`.  
\* Completar tarea con \`completed\_by\`, \`completed\_at\`, \`was\_overdue\`.  
\* Verificar tarea completada con \`verified\_by\`, \`verified\_at\`.  
\* Cancelar tarea con \`status → 'cancelled'\`, \`cancelled\_by\`, \`reason\`.  
\* Mostrar vencida como cálculo, no como estado: \`due\_date \< today()\` y \`status IN ('pending','in\_progress')\`.  
\* Mostrar prioridad usando el campo \`priority\` y prioridad del evento si aplica.  
\* Respetar roles encontrados: Adulto, Coordinador y Senior crean tareas del hogar; Adolescente crea tareas propias; asignado o adulto/coordinador completa; Coordinador o adulto verifica; creador o coordinador cancela.

Events / Calendar:

\* Mostrar eventos del hogar o personales desde entidad \`Event\`.  
\* Crear evento con \`title\`, \`description\`, \`visibility\`, \`all\_day\`, \`starts\_at\`, \`ends\_at\`, \`location\_name\`, \`created\_by\`, \`participants\`, \`household\_id\`.  
\* Actualizar evento con \`updated\_by\` y \`changed\_fields\`.  
\* Cancelar evento con \`status → 'cancelled'\`, \`cancelled\_by\`, \`reason\`, \`was\_recurring\`.  
\* Mostrar estados \`scheduled\`, \`completed\`, \`cancelled\`.  
\* Mostrar calendario como \`CalendarView\` de eventos.  
\* Usar \`starts\_at\`, \`ends\_at\`, \`all\_day\` y \`location\_name\` para visualización.  
\* Permisos encontrados: Adultos, Coordinador, Senior y Adolescente pueden crear eventos familiares; creador o coordinador modifica/cancela.

Home / navegación:

\* Planner es tab principal en BottomNavigation.  
\* Home puede mostrar widgets/cards de Eventos y Tareas.  
\* Home resume y redirige, no administra Planner.

**\#\#\# DEMO PREMIUM**

\* Usar \`PlannerDashboard\` como pantalla integrada con Tasks y Calendar.  
\* Usar \`CalendarView\` para mostrar eventos.  
\* Mostrar feedback visual usando textos de notificación encontrados.  
\* Mostrar estados de prioridad \`BA\`, \`ME\`, \`AL\` como badges visuales si se usa la prioridad del evento.  
\* Mostrar overdue como badge calculado, no estado.  
\* Mostrar \`Compras\`, \`Limpieza\`, \`Mascotas\` como responsabilidades/categorías, porque aparecen explícitamente como ejemplos de \`Responsibility\`.  
\* Mostrar una card en Home para Eventos y otra para Tareas, porque \`HomeDashboard\` las incluye.  
\* Mostrar Briefing simple de Planner con datos de Tasks/Events, pero sin IA real.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

\* El documento marca muchas acciones de Tasks/Events con \`Offline Q\`, lo que permite feedback local inmediato en demo, pero no implica implementar Offline Sync real.  
\* Crear tarea puede usar UUID pre-generado en demo porque el evento \`task.created\` menciona UUID pre-generado offline.  
\* Completar tarea puede marcarse localmente y sincronizar después según \`task.completed\`, pero la sincronización real queda fuera.  
\* Crear/actualizar/cancelar eventos puede simularse localmente porque \`event.created\`, \`event.updated\` y \`event.cancelled\` tienen \`Offline Q\`.  
\* No se encontró AsyncStorage mencionado explícitamente.

**\#\#\# POST\_MVP**

\* \`TaskComment\` / comentarios.  
\* \`TaskAttachment\` / adjuntos.  
\* \`TaskTemplate\` como tabla o CRUD de plantillas.  
\* \`TaskDependency\` / dependencias bloqueantes.  
\* \`Subtask\` y progreso por subtareas.  
\* \`TaskTimeline\`.  
\* \`Streak\` y consumidores \`ST\`.  
\* Escalamiento Geni de tareas.  
\* Detección de conflictos por Geni.  
\* Notificaciones reales push/email.  
\* Auditoría completa append-only.  
\* Automatizaciones reales.  
\* Recurrencia compleja con \`recurrence\_rule\` / RRULE.  
\* Participantes avanzados de eventos con respuestas.  
\* Offline Sync real.  
\* Exportación de datos.

**\#\#\# IGNORAR**

Sin detalle por regla de extracción. No desarrollar en este fragment.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| PlannerDashboard | Vista principal de Planner con Tasks y Calendar | No se detallan acciones de UI; eventos permiten crear/asignar/completar/verificar/cancelar tarea y crear/actualizar/cancelar evento | No se detallan loading/empty/error; estados de Task/Event sí aparecen | Tab \`Planner\` en BottomNavigation | REAL MÍNIMO / DEMO PREMIUM |  
| CalendarView | Vista de calendario de eventos | Crear/actualizar/cancelar/completar evento según eventos del sistema | Estados: \`scheduled\`, \`completed\`, \`cancelled\`; prioridad alta en cambios/cancelaciones urgentes | Desde Planner; Home puede redirigir a Eventos | REAL MÍNIMO |  
| HomeDashboard — Eventos | Widget/sección Eventos dentro de Home | Redirigir al módulo correspondiente según regla Home | Puede mostrar eventos próximos; el documento no define empty/loading | Home → Planner/Eventos | REAL MÍNIMO |  
| HomeDashboard — Tareas | Widget/sección Tareas dentro de Home | Redirigir al módulo correspondiente según regla Home | Puede mostrar tareas pendientes/vencidas; el documento no define empty/loading | Home → Planner/Tasks | REAL MÍNIMO |  
| BottomNavigation | \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\` | Entrar a Planner | No encontrado | Navegación global | REAL MÍNIMO |  
| QuickActions | Panel flotante desde \`+\`; acciones dinámicas por frecuencia | No se encontró acción Planner específica | No encontrado | Acceso global por \`+\` | Dependencia externa / no desarrollar en este fragment |  
| People/PersonProfile — Tareas/Eventos | Perfil individual incluye Tareas y Eventos | No se detallan acciones | No encontrado | People → perfil → tareas/eventos | Dependencia externa / no desarrollar en este fragment |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| \`Compras\` | Planner / Responsibility | Categoría o responsabilidad visual de tarea | Archivo de comprensión, OUTPUT 1, \`Responsibility\` | DEMO PREMIUM |  
| \`Limpieza\` | Planner / Responsibility | Categoría o responsabilidad visual de tarea | Archivo de comprensión, OUTPUT 1, \`Responsibility\` | DEMO PREMIUM |  
| \`Mascotas\` | Planner / Responsibility | Categoría o responsabilidad visual de tarea | Archivo de comprensión, OUTPUT 1, \`Responsibility\` | DEMO PREMIUM |  
| \`Nueva tarea: \[title\]\` | Tasks | Feedback al crear tarea para asignado | Documento principal, §2.1 \`task.created\` | REAL MÍNIMO / DEMO PREMIUM |  
| \`Te asignaron: \[title\]\` | Tasks | Feedback al reasignar responsable | Documento principal, §2.2 \`task.assigned\` | REAL MÍNIMO / DEMO PREMIUM |  
| \`\[Display\_name\] empezó \[title\]\` | Tasks | Feedback al iniciar tarea | Documento principal, §2.3 \`task.started\` | DEMO PREMIUM |  
| \`¡\[Verificador\] confirmó tu tarea\!\` | Tasks / Verification | Feedback al verificar tarea | Documento principal, §2.5 \`task.verified\` | REAL MÍNIMO / DEMO PREMIUM |  
| \`Hay 3 tareas sin dueño activo. Como familia, ¿quieren redistribuirlas?\` | Tasks / Home Briefing | Texto de briefing visual; no implementar Geni real | Documento principal, §2.12 \`task.escalation\_level\_4\` | DEMO PREMIUM / POST\_MVP |  
| \`Tienes dos eventos solapados\` | Events / Calendar | Feedback de conflicto visual; no implementar Geni real | Documento principal, §3.5 \`event.conflict\_detected\` | POST\_MVP visual |  
| \`Te invitaron a \[event\_title\]\` | Events | Feedback al agregar participante | Documento principal, §3.7 \`event.participant\_added\` | DEMO PREMIUM / POST\_MVP |  
| \`30min\`, \`1h\`, \`1d\` | Events | Labels de recordatorio visual | Documento principal, §3.6 \`event.reminder\_due\` | POST\_MVP |  
| \`days\_overdue \> 1\` | Tasks | Badge de tarea atrasada alta prioridad | Documento principal, §2.7 \`task.overdue\` | DEMO PREMIUM |  
| \`\<24h\` | Events | Badge/alerta por cambio urgente de evento | Documento principal, §3.2 \`event.updated\` | DEMO PREMIUM |  
| \`≤2h\` | Events | Badge/alerta por cancelación urgente | Documento principal, §3.3 \`event.cancelled\` | DEMO PREMIUM |

Faltan datos demo explícitos:

\* No hay nombres de miembros.  
\* No hay títulos concretos de tareas.  
\* No hay títulos concretos de eventos.  
\* No hay lugares concretos.  
\* No hay lista completa de templates MVP como constantes.

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Crear tarea | Adulto, Coordinador, Senior para tareas del hogar; Adolescente para tareas propias | Nueva tarea; feedback \`Nueva tarea: \[title\]\` al asignado | REAL MÍNIMO | Documento principal, §2.1 \`task.created\` |  
| Asignar tarea | No se especifica rol exacto en trigger; payload incluye \`assigned\_by\` | Feedback \`Te asignaron: \[title\]\` al nuevo asignado | REAL MÍNIMO | Documento principal, §2.2 \`task.assigned\` |  
| Iniciar tarea | Asignado | Feedback al creador: \`\[Display\_name\] empezó \[title\]\` | DEMO PREMIUM | Documento principal, §2.3 \`task.started\` |  
| Completar tarea | Asignado o adulto/coordinador | Estado \`completed\`, \`completed\_by\`, \`completed\_at\`; feedback al creador/asignado si corresponde | REAL MÍNIMO | Documento principal, §2.4 \`task.completed\` |  
| Verificar tarea | Coordinador o adulto | \`verified\_by\`, \`verified\_at\`; feedback \`¡\[Verificador\] confirmó tu tarea\!\` | REAL MÍNIMO | Documento principal, §2.5 \`task.verified\` |  
| Cancelar tarea | Creador o coordinador | Estado \`cancelled\`; feedback al asignado si no es quien cancela | REAL MÍNIMO como cancelar; no delete real | Documento principal, §2.6 \`task.cancelled\` |  
| Detectar tarea vencida | CRON server-side | Notificación al asignado; prioridad ME o AL según días vencidos | DEMO PREMIUM / POST\_MVP cron real | Documento principal, §2.7 \`task.overdue\` |  
| Recordatorio de tarea | CRON server-side | Notificación al asignado y email si configurado | POST\_MVP | Documento principal, §2.8 \`task.reminder\_due\` |  
| Reasignar tarea | No se especifica rol exacto; payload incluye \`reassigned\_by\` | Notifica a old/new assignee; recalcula asimetría vía Geni | POST\_MVP si se toma como reasignación avanzada; puede ser DEMO si se usa como asignar | Documento principal, §2.13 \`task.reassigned\` |  
| Comentar tarea | Miembro | Notifica a assigned\_to, created\_by y mencionados | POST\_MVP | Documento principal, §2.14 \`task.commented\` |  
| Completar subtarea | No especificado | Actualiza conteo de subtareas restantes | POST\_MVP | Documento principal, §2.15 \`subtask.completed\` |  
| Crear evento | Adulto, Coordinador, Senior, Adolescente para eventos familiares | Nuevo evento; notificación a participantes | REAL MÍNIMO | Documento principal, §3.1 \`event.created\` |  
| Actualizar evento | Creador o coordinador | Notificación a participantes si cambió fecha/hora/ubicación | REAL MÍNIMO | Documento principal, §3.2 \`event.updated\` |  
| Cancelar evento | Creador o coordinador | Estado \`cancelled\`; notificación a participantes | REAL MÍNIMO como cancelar; no delete real | Documento principal, §3.3 \`event.cancelled\` |  
| Completar evento | Automático o manual cuando pasa \`ends\_at\` | Estado \`completed\`; puede entrar a Briefing | DEMO PREMIUM | Documento principal, §3.4 \`event.completed\` |  
| Detectar conflicto | Geni server-side | Feedback \`Tienes dos eventos solapados\` | POST\_MVP | Documento principal, §3.5 \`event.conflict\_detected\` |  
| Recordatorio de evento | CRON server-side | Notificación a participantes que aceptaron | POST\_MVP | Documento principal, §3.6 \`event.reminder\_due\` |  
| Agregar participante | No especificado; payload incluye \`added\_by\` | Feedback \`Te invitaron a \[event\_title\]\` | POST\_MVP / participantes avanzados | Documento principal, §3.7 \`event.participant\_added\` |  
| Remover participante | No especificado; payload incluye \`removed\_by\` | Notificación al miembro removido | POST\_MVP / participantes avanzados | Documento principal, §3.8 \`event.participant\_removed\` |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

Información encontrada:

\* \`HomeDashboard\` incluye Eventos y Tareas.  
\* \`HomeDashboard\` ordena: \`Briefing → Atención Requerida → Carga Familiar → Eventos → Tareas → Finanzas → Presence → Actividad\`.  
\* Home no administra información; solo resume y redirige al módulo correspondiente.  
\* Consumidor \`B\` significa inclusión en Briefing.  
\* Tareas pueden alimentar Briefing por eventos \`task.created\`, \`task.completed\`, \`task.verified\`, \`task.cancelled\`, \`task.overdue\`, \`task.reassigned\`, etc.  
\* Eventos pueden alimentar Briefing por \`event.created\`, \`event.updated\`, \`event.cancelled\`, \`event.completed\`, \`event.conflict\_detected\`.  
\* \`GeniBriefing\` resume/agrega Task y Event según el archivo de comprensión.

Clasificación:

\* Mostrar próximos eventos en Home: REAL MÍNIMO si se alimenta de events.  
\* Mostrar tareas pendientes/vencidas en Home: REAL MÍNIMO si se alimenta de tasks.  
\* Briefing de Planner: DEMO PREMIUM / MOCK, sin IA real.  
\* Carga Familiar derivada de LoadMetric: MOCK / POST\_MVP, no implementar métricas reales.

**\#\#\# More**

\* No se encontró que Planner viva en More.  
\* Planner vive en Bottom Navigation.

**\#\#\# Quick Actions**

\* \`QuickActions\` existe como panel flotante desde \`+\`.  
\* El documento indica “acciones dinámicas por frecuencia”.  
\* No se encontró acción rápida explícita de Planner como crear tarea o crear evento.  
\* Dependencia externa / no desarrollar en este fragment: Quick Actions como contenedor global.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Crear tarea | No encontrado | No encontrado | Payload de evento \`task.created\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Asignar tarea | No encontrado | No encontrado | Payload de evento \`task.assigned\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Completar tarea | No encontrado | No encontrado | Payload de evento \`task.completed\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Verificar tarea | No encontrado | No encontrado | Payload de evento \`task.verified\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Cancelar tarea | No encontrado | No encontrado | Payload de evento \`task.cancelled\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Listar tareas | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |  
| Crear evento | No encontrado | No encontrado | Payload de evento \`event.created\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Actualizar evento | No encontrado | No encontrado | Payload de evento \`event.updated\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Cancelar evento | No encontrado | No encontrado | Payload de evento \`event.cancelled\` | No encontrado | Acción mencionada sin contrato API | REAL MÍNIMO |  
| Listar eventos | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |  
| Ver calendario | No encontrado | No encontrado | No encontrado | No encontrado | No encontrado | Información faltante |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Task | \`task\_id\` | no especificado | UUID pre-generado mencionado para offline | Identificador de tarea | REAL MÍNIMO |  
| Task | \`household\_id\` | no especificado | requerido por aislamiento/RLS | Separación por hogar | REAL MÍNIMO |  
| Task | \`title\` | no especificado | no especificado | Título visible | REAL MÍNIMO |  
| Task | \`description\` | no especificado | no especificado | Detalle visible | REAL MÍNIMO |  
| Task | \`visibility\` | no especificado | \`household\` aparece en condición de Feed; decisión de visibilidad binaria menciona \`household/personal\` | Badge o filtro visual | REAL MÍNIMO |  
| Task | \`priority\` | no especificado | no especificado | Prioridad visual | REAL MÍNIMO |  
| Task | \`due\_date\` | no especificado | usado para vencimiento y recordatorios | Fecha límite / overdue | REAL MÍNIMO |  
| Task | \`due\_time\` | no especificado | usado para recordatorios | Hora límite | REAL MÍNIMO |  
| Task | \`recurrence\_rule\` | no especificado | RRULE/recurrencia compleja | No usar como MVP simple desde este documento | POST\_MVP |  
| Task | \`responsibility\_id\` | no especificado | regla: una tarea tiene una única responsabilidad asociada | Categoría/responsabilidad visual | DEMO PREMIUM / REAL con riesgo |  
| Task | \`created\_by\` | \`member\_id\` | no especificado | Autor visible / permisos | REAL MÍNIMO |  
| Task | \`assigned\_to\` | \`member\_id\` | puede ser old/new assignee | Responsable visible | REAL MÍNIMO |  
| Task | \`status\` | texto según decisión global | \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\` | Estado visual | REAL MÍNIMO con contradicción MVP |  
| Task | \`completed\_by\` | \`member\_id\` | no especificado | Feedback de completado | REAL MÍNIMO |  
| Task | \`completed\_at\` | no especificado | no especificado | Fecha de completado | REAL MÍNIMO |  
| Task | \`was\_overdue\` | boolean | \`true/false\` | Badge completada tarde | DEMO PREMIUM |  
| TaskVerification | \`requires\_verification\` | no especificado | no especificado | Indicar tarea verificable | REAL MÍNIMO con falta de flujo intermedio |  
| TaskVerification | \`verified\_by\` | no especificado | no especificado | Quién verificó | REAL MÍNIMO |  
| TaskVerification | \`verified\_at\` | no especificado | no especificado | Cuándo se verificó | REAL MÍNIMO |  
| Task | \`cancelled\_by\` | \`member\_id\` | no especificado | Quién canceló | REAL MÍNIMO |  
| Task | \`reason\` | no especificado | no especificado | Motivo de cancelación | DEMO PREMIUM |  
| Task | \`deleted\_at\` | no especificado | soft-delete \+ papelera 30 días | No usar como estado de negocio | POST\_MVP / restricción |  
| Task overdue | \`days\_overdue\` | integer | día 1 ME; \>1 AL | Badge vencida | DEMO PREMIUM |  
| Task reminder | \`hours\_remaining\` | no especificado | no especificado | Recordatorio visual | POST\_MVP |  
| Event | \`event\_id\` | no especificado | no especificado | Identificador de evento | REAL MÍNIMO |  
| Event | \`household\_id\` | no especificado | requerido por aislamiento/RLS | Separación por hogar | REAL MÍNIMO |  
| Event | \`title\` | no especificado | no especificado | Título visible | REAL MÍNIMO |  
| Event | \`description\` | no especificado | no especificado | Detalle visible | REAL MÍNIMO |  
| Event | \`visibility\` | no especificado | no especificado | Badge/filtro visual | REAL MÍNIMO |  
| Event | \`all\_day\` | no especificado | boolean implícito por nombre | Evento de día completo | REAL MÍNIMO |  
| Event | \`starts\_at\` | no especificado | usado para calendario/recordatorio/conflicto | Fecha/hora inicio | REAL MÍNIMO |  
| Event | \`ends\_at\` | no especificado | evento completa al pasar \`ends\_at\` | Fecha/hora fin | REAL MÍNIMO |  
| Event | \`location\_name\` | no especificado | no especificado | Lugar textual | REAL MÍNIMO |  
| Event | \`recurrence\_rule\` | no especificado | RRULE/recurrencia compleja | No usar como MVP simple desde este documento | POST\_MVP |  
| Event | \`created\_by\` | \`member\_id\` | no especificado | Autor visible / permisos | REAL MÍNIMO |  
| Event | \`participants\` | array | \`\[\]\` | Participantes visibles | POST\_MVP si incluye respuestas avanzadas; DEMO visual simple posible |  
| Event | \`status\` | texto según decisión global | \`scheduled\`, \`completed\`, \`cancelled\` | Estado visual | REAL MÍNIMO |  
| Event | \`updated\_by\` | \`member\_id\` | no especificado | Quién editó | DEMO PREMIUM |  
| Event | \`changed\_fields\` | array | \`\[\]\` | Mostrar cambios | DEMO PREMIUM |  
| Event | \`old\_starts\_at\` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |  
| Event | \`new\_starts\_at\` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |  
| Event | \`old\_ends\_at\` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |  
| Event | \`new\_ends\_at\` | no especificado | no especificado | Comparación de edición | DEMO PREMIUM |  
| Event | \`cancelled\_by\` | \`member\_id\` | no especificado | Quién canceló | REAL MÍNIMO |  
| Event | \`reason\` | no especificado | no especificado | Motivo visible | DEMO PREMIUM |  
| Event | \`was\_recurring\` | boolean | \`true/false\` | Badge/nota de recurrencia | POST\_MVP |  
| EventParticipant | \`member\_id\` | no especificado | no especificado | Miembro participante | POST\_MVP / DEMO visual simple |  
| EventParticipant | \`added\_by\` | \`member\_id\` | no especificado | Quién agregó | POST\_MVP |  
| EventParticipant | \`removed\_by\` | \`member\_id\` | no especificado | Quién removió | POST\_MVP |  
| Responsibility | \`responsibility\_id\` | no especificado | ejemplos: Compras, Limpieza, Mascotas | Categoría de tarea | DEMO PREMIUM |  
| CalendarView | no aplica | Screen | vista de calendario de eventos | Pantalla calendario | REAL MÍNIMO |  
| PlannerDashboard | no aplica | Screen | vista principal de Planner con Tasks y Calendar | Pantalla principal Planner | REAL MÍNIMO |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Tarea vencida | Se calcula con \`due\_date \< today()\` y \`status IN ('pending','in\_progress')\`; no es estado | Documento principal §2.7; archivo de comprensión OUTPUT 5 | REAL MÍNIMO / DEMO PREMIUM |  
| Tarea vencida día 1 | Prioridad \`🟡 ME\` | Documento principal §2.7 | DEMO PREMIUM |  
| Tarea vencida más de 1 día | Prioridad \`🟠 AL\` | Documento principal §2.7 | DEMO PREMIUM |  
| Tarea completada tarde | Payload incluye \`was\_overdue\` | Documento principal §2.4 | DEMO PREMIUM |  
| Tarea con verificación | Coordinador o adulto verifica tarea completada con \`verified\_by\`, \`verified\_at\` | Documento principal §2.5 | REAL MÍNIMO |  
| Estado intermedio de verificación | El MVP esperado usa \`awaiting\_verification\`, pero no aparece en documento | Source map §4.8 TASKS | Información faltante / contradicción |  
| Tarea cancelada | Creador o coordinador marca \`status → 'cancelled'\`; notifica al asignado si corresponde | Documento principal §2.6 | REAL MÍNIMO como cancelar; no delete real |  
| Delete / eliminar task | No aparece delete explícito; aparece soft-delete global con \`deleted\_at\` y papelera 30 días | Archivo de comprensión OUTPUT 5/6 | Información faltante / POST\_MVP |  
| Evento actualizado con menos de 24h | Prioridad sube a \`🟠 AL\` | Documento principal §3.2 | DEMO PREMIUM |  
| Evento cancelado con ≤2h | Prioridad sube a \`🟠 AL\` | Documento principal §3.3 | DEMO PREMIUM |  
| Evento completado | Evento pasa \`ends\_at\` y se marca \`status → 'completed'\`, automático o manual | Documento principal §3.4 | DEMO PREMIUM |  
| Conflicto de eventos | Geni detecta dos eventos solapados y avisa al miembro afectado | Documento principal §3.5 | POST\_MVP |  
| Recordatorio de evento | CRON evalúa 30min, 1h, 1d según preferencia | Documento principal §3.6 | POST\_MVP |  
| Participante agregado | Notifica \`Te invitaron a \[event\_title\]\` | Documento principal §3.7 | POST\_MVP / DEMO visual |  
| Participante removido | Notifica al miembro removido | Documento principal §3.8 | POST\_MVP / DEMO visual |  
| Estado vacío Tasks | No encontrado | Source map §4.8 | Información faltante |  
| Estado vacío Calendar | No encontrado | Source map §4.10 | Información faltante |  
| Error de permisos | Permisos parciales encontrados; no hay mensajes de error | Documento principal §2/§3 | Información faltante |  
| Offline Q | Se encola y sincroniza después / feedback local posible | Documento principal §2/§3 | POST\_MVP si implica sync real; DEMO si solo local |  
| Offline S | Solo online; cron/server-side | Documento principal §2.7, §2.8, §3.5, §3.6 | POST\_MVP |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* \`household\_id\` en todas las tablas de coordinación; RLS filtra por hogar del miembro autenticado.  
\* RLS es última línea de defensa en todas las tablas.  
\* Soft-delete usa \`deleted\_at\` \+ papelera 30 días; el status de negocio no incluye \`deleted\`.  
\* UUID como PK en entidades; permite generación offline.  
\* Estados como texto, no PostgreSQL enum.  
\* Visibilidad binaria \`household/personal\` aparece como decisión general.  
\* Una tarea siempre tiene una única responsabilidad asociada (\`responsibility\_id NOT NULL\`). Riesgo para MVP visual si responsabilidades no están implementadas.  
\* Las responsabilidades no son dominio independiente; son propiedad de la tarea.  
\* Vencida no es estado de tarea; se calcula.  
\* Eventos solo tienen \`scheduled\`, \`completed\`, \`cancelled\`; no \`in\_progress\` ni \`deleted\` como estado.  
\* Las recurrencias generan nuevas instancias; no reutilizan la misma tarea/evento.  
\* Geni no puede marcar tareas como completadas automáticamente.  
\* Home no administra información; solo resume y redirige al módulo correspondiente.  
\* Más de 4 niveles de navegación es fallo de diseño; objetivo 95% de acciones en ≤3 niveles.  
\* No implementar notificaciones reales, auditoría completa, Offline Sync real, Geni real ni automatizaciones reales desde este fragment.  
\* No convertir \`TaskTemplate\` de tabla/CRUD en MVP real; para MVP visual, solo usar responsabilidades/categorías encontradas si sirven.  
\* No convertir \`recurrence\_rule\` / RRULE en recurrencia compleja MVP.  
\* No convertir participantes avanzados en obligación MVP.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| UI detallada de PlannerDashboard | Codex necesita estructura de pantalla, tabs, header, cards y botones | Habrá que definir visualmente en etapa posterior sin atribuirlo a este documento |  
| UI de Task List | No hay lista/tabs/filtros/empty state | El fragment solo aporta datos/eventos, no layout |  
| UI de Create/Edit Task | No hay formulario ni campos obligatorios/opcionales definidos visualmente | Codex necesitará decisión posterior |  
| UI de CalendarView | No hay día/semana/mes ni navegación por rango | Calendar MVP queda parcial |  
| Vista día/semana/mes | Requisito del MVP visual, pero no aparece en documento | No se puede extraer de esta fuente |  
| Mostrar tareas con fecha dentro del calendario | Requisito del prompt, pero relación Calendar→Task con due\_date no aparece explícita | Requiere validación posterior |  
| Acción listar tareas | No hay evento ni API de listar | Service/API queda incompleto |  
| Acción listar eventos | No hay evento ni API de listar | Service/API queda incompleto |  
| Contrato API | No hay método, ruta, request/response ni errores | Implementación real backend no sale de este documento |  
| Service nombrado | No hay nombre de service ni funciones | Solo se pueden extraer payloads y acciones |  
| Templates MVP completas | Solo aparecen \`TaskTemplate\` como tabla y responsabilidades \`Compras\`, \`Limpieza\`, \`Mascotas\`; no aparecen todas las constantes MVP | No crear CRUD ni inventar templates faltantes |  
| Estados MVP \`awaiting\_verification\` y \`verified\` como status | El documento trae \`task.verified\` y campos \`verified\_by/at\`, pero no status \`awaiting\_verification\` | Contradicción a resolver en merge posterior |  
| Eliminar tarea/evento | Aparece cancelar y soft-delete global, no delete explícito de Planner | No llamar “eliminar” real sin decisión posterior |  
| Recurrencia simple \`none/daily/weekly/monthly\` | El documento usa \`recurrence\_rule\`/RRULE y decisión de instancias | No implementar recurrencia compleja; simple requiere decisión externa |  
| Participantes básicos vs avanzados | El documento tiene \`event\_participants\`, pero no define respuestas accepted/declined/maybe en el fragment principal | Mantener visual simple o postergar |  
| Datos demo concretos | No hay nombres de tareas/eventos/miembros/lugares | Hacen falta datos mock en etapa posterior |  
| Loading/toast/error/empty states | No aparecen como UI | Codex necesitará patrones de UI externos o decisión posterior |  
| Quick Action específica de Planner | QuickActions existe, pero no se define crear tarea/evento | No atribuir esa acción a este documento |  
| Permisos de Guest/Child para Planner | Roles existen, pero no se detallan permisos Planner específicos para Guest/Child | No asumir comportamiento |

**\---**

**\#\# 13\. Fuente**

Archivo principal:

\* \`HomePlus — Eventos del sistema v1.md\`  
\* Secciones usadas:  
  \* Portada / principio rector.  
  \* Leyenda de Consumidores.  
  \* Leyenda de Prioridades.  
  \* Leyenda de Comportamiento Offline.  
  \* \`\#\# 2\. TASKS\`  
  \* \`\#\#\# 2.1 task.created\`  
  \* \`\#\#\# 2.2 task.assigned\`  
  \* \`\#\#\# 2.3 task.started\`  
  \* \`\#\#\# 2.4 task.completed\`  
  \* \`\#\#\# 2.5 task.verified\`  
  \* \`\#\#\# 2.6 task.cancelled\`  
  \* \`\#\#\# 2.7 task.overdue\`  
  \* \`\#\#\# 2.8 task.reminder\_due\`  
  \* \`\#\#\# 2.9 task.escalation\_level\_1\`  
  \* \`\#\#\# 2.10 task.escalation\_level\_2\`  
  \* \`\#\#\# 2.11 task.escalation\_level\_3\`  
  \* \`\#\#\# 2.12 task.escalation\_level\_4\`  
  \* \`\#\#\# 2.13 task.reassigned\`  
  \* \`\#\#\# 2.14 task.commented\`  
  \* \`\#\#\# 2.15 subtask.completed\`  
  \* \`\#\#\# 2.16 task.progress\_updated\`  
  \* \`\#\# 3\. CALENDAR\`  
  \* \`\#\#\# 3.1 event.created\`  
  \* \`\#\#\# 3.2 event.updated\`  
  \* \`\#\#\# 3.3 event.cancelled\`  
  \* \`\#\#\# 3.4 event.completed\`  
  \* \`\#\#\# 3.5 event.conflict\_detected\`  
  \* \`\#\#\# 3.6 event.reminder\_due\`  
  \* \`\#\#\# 3.7 event.participant\_added\`  
  \* \`\#\#\# 3.8 event.participant\_removed\`  
  \* Matriz eventos × consumidores, solo para confirmar consumidores \`B\`, \`N\`, \`AU\`, \`A\`, \`G\`, \`ST\` en eventos Planner.

Archivo de comprensión asociado:

\* \`Esquema de base de datos v1.txt\`  
\* Secciones usadas:  
  \* \`OUTPUT 1 — ENTITIES\`, bloque \`PLANNER\`.  
  \* \`OUTPUT 1 — ENTITIES\`, bloques \`ROLES\` y \`NAVIGATION\` solo como dependencias directas.  
  \* \`OUTPUT 2 — RELATIONSHIPS\`, bloque \`PLANNER\`.  
  \* \`OUTPUT 3 — CROSS DOMAIN RELATIONSHIPS\`, solo relaciones directas Task/Event/Home/GeniBriefing/Notifications/AuditLog.  
  \* \`OUTPUT 4 — DATA FLOWS\`, solo flujos directos desde \`tasks\` y \`events\`.  
  \* \`OUTPUT 5 — BUSINESS RULES\`, solo reglas que afectan Task/Event/Planner/Home/Navegación.  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`, solo decisiones que afectan Planner.

Source map usado:

\* \`source\_map\_HomePlus\_Eventos\_del\_sistema\_v1.md\`  
\* Secciones usadas:  
  \* \`\# 4.7 PLANNER\`  
  \* \`\# 4.8 TASKS\`  
  \* \`\# 4.9 EVENTS\`  
  \* \`\# 4.10 CALENDAR\`  
  \* \`\# 4.11 HOME\`, solo conexión directa Planner → Home.

**\# PLANNER fragment — HomePlus Api \+ TestCases \+ Edgecases V1(2)**

**\#\# 1\. Rol del módulo en la demo**

Información explícita encontrada:

\* \`Planner\` aparece en el archivo de comprensión como módulo Core y núcleo operativo.  
\* El archivo de comprensión indica que Planner administra \`Tasks\`, \`Calendar\`, \`Goals\` y \`Responsabilidades\`.  
\* \`Tasks\` representan trabajo pendiente o realizado con estados, prioridades, dependencias y recurrencias.  
\* \`Calendar\` administra eventos familiares y personales.  
\* \`Responsabilidades\` agrupan áreas operativas del hogar y son eje organizador de tareas.  
\* En el documento principal, Planner contiene contratos API para:  
  \* Tasks.  
  \* Task Templates.  
  \* Events.  
  \* Goals.  
  \* Responsibilities.  
  \* Streaks.  
\* Para este fragment se extrae solo lo útil para PLANNER visual/interactivo MVP: tareas, eventos, calendario simple y dependencias mínimas.

No se encontró descripción emocional o UX explícita sobre “qué debe sentir el usuario” dentro de la sección Planner del documento principal.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Planner / Tasks**

\* El documento define una lista de tareas mediante \`GET /api/households/:hid/tasks\`.  
\* La lista permite filtros por:  
  \* \`status\`.  
  \* \`assigned\_to\`.  
  \* \`responsibility\_id\`.  
  \* \`goal\_id\`.  
  \* \`sort=due\_date\`.  
  \* \`cursor\`.  
  \* \`limit=20\`.  
\* La respuesta de listado incluye \`{ tasks: \[...\], next\_cursor }\`.  
\* El detalle de tarea incluye campos visibles:  
  \* \`id\`.  
  \* \`title\`.  
  \* \`description\`.  
  \* \`visibility\`.  
  \* \`status\`.  
  \* \`priority\`.  
  \* \`start\_date\`.  
  \* \`due\_date\`.  
  \* \`due\_time\`.  
  \* \`responsibility\_id\`.  
  \* \`created\_by\`.  
  \* \`assigned\_to\`.  
  \* \`completed\_by\`.  
  \* \`completed\_at\`.  
  \* \`requires\_verification\`.  
  \* \`verified\_by\`.  
  \* \`verified\_at\`.  
  \* \`created\_at\`.  
  \* \`updated\_at\`.  
\* El test case \`TC-T1\` indica que una tarea creada queda “visible en lista”.  
\* El documento permite ordenar por \`due\_date\`, útil para vista de tareas próximas o vencidas.  
\* El documento define \`visibility='household'\` y \`visibility='personal'\`, útil para badges o filtros visuales.  
\* El documento define \`priority\` con default \`medium\`, pero no enum completo.  
\* El documento define \`status='completed'\` y \`status='cancelled'\` como estados accionables desde PATCH.  
\* El documento menciona \`pending\` e \`in\_progress\` en filtros de listado.  
\* El documento indica que “overdue” no es estado de tarea: se calcula con \`due\_date \< today AND status IN ('pending','in\_progress')\`.

**\#\#\#\# Planner / Events / Calendar**

\* El documento define una lista de eventos mediante \`GET /api/households/:hid/events\`.  
\* La lista de eventos requiere rango de fechas:  
  \* \`from=ISO\`.  
  \* \`to=ISO\`.  
\* La lista permite filtrar por:  
  \* \`status=scheduled\`.  
  \* \`visibility=household\`.  
\* La respuesta de eventos incluye campos visibles:  
  \* \`id\`.  
  \* \`title\`.  
  \* \`description\`.  
  \* \`visibility\`.  
  \* \`status\`.  
  \* \`all\_day\`.  
  \* \`starts\_at\`.  
  \* \`ends\_at\`.  
  \* \`recurrence\_rule\`.  
  \* \`location\_name\`.  
  \* \`created\_by\`.  
  \* \`created\_at\`.  
\* El detalle de evento agrega:  
  \* \`recurrence\_end\`.  
  \* \`location\_address\`.  
  \* \`location\_coordinates\`.  
  \* \`updated\_at\`.  
\* El test case \`TC-C1\` indica que el evento creado queda “visible en calendario”.  
\* El documento no define pantallas \`día\`, \`semana\` o \`mes\`.  
\* El documento no define componentes visuales concretos del calendario.  
\* El documento no define estado vacío de calendario.

**\#\#\#\# Responsibilities como dependencia de Planner**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* \`responsibility\_id\` es obligatorio para crear tareas.  
\* El documento define endpoints de \`Responsibilities\`.  
\* Una responsabilidad agrupa áreas operativas.  
\* El listado de responsabilidades devuelve:  
  \* \`id\`.  
  \* \`title\`.  
  \* \`description\`.  
  \* \`category\`.  
  \* \`recurrence\_rule\`.  
  \* \`is\_active\`.  
  \* \`members\` con \`member\_id\`, \`display\_name\`, \`is\_primary\`.  
\* Para este fragment, Responsibilities se usa solo como dependencia visual/dato necesario para crear o filtrar tareas.

**\#\#\#\# Members como dependencia de Planner**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Las tareas pueden usar \`assigned\_to\`.  
\* Los eventos guardan \`created\_by\`.  
\* Verificación de tareas guarda \`verified\_by\`.  
\* El test case \`TC-T1\` crea una tarea con \`assigned\_to=child\`.  
\* El documento de Members define miembros con \`id\`, \`display\_name\`, \`role\`, \`status\`, \`avatar\_url\`, pero esa sección pertenece a otro módulo.

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Tasks**

\* Campos de tarea utilizables como datos demo:  
  \* \`title\`.  
  \* \`description\`.  
  \* \`visibility\`.  
  \* \`status\`.  
  \* \`priority\`.  
  \* \`start\_date\`.  
  \* \`due\_date\`.  
  \* \`due\_time\`.  
  \* \`assigned\_to\`.  
  \* \`created\_by\`.  
  \* \`completed\_by\`.  
  \* \`completed\_at\`.  
  \* \`requires\_verification\`.  
  \* \`verified\_by\`.  
  \* \`verified\_at\`.  
\* Estados encontrados:  
  \* \`pending\`.  
  \* \`in\_progress\`.  
  \* \`completed\`.  
  \* \`cancelled\`.  
\* Filtro de listado encontrado:  
  \* \`status=pending,in\_progress\`.  
\* Visibilidades encontradas:  
  \* \`household\`.  
  \* \`personal\`.  
\* Prioridad encontrada:  
  \* default \`medium\`.  
\* Ejemplo de tarea del test case:  
  \* tarea con \`title\` \+ \`responsibility\_id\` \+ \`assigned\_to=child\` \+ \`due\_date\`.  
\* Tareas vencidas:  
  \* no son estado; se calculan con \`due\_date \< today AND status IN ('pending','in\_progress')\`.  
\* Verification flow:  
  \* \`requires\_verification=true\`.  
  \* \`verified\_by\`.  
  \* \`verified\_at\`.

No se encontraron ejemplos concretos de títulos como “limpieza”, “compras”, “mascotas”, “medicación”, “estudios” o “pagos” dentro del documento actual.

**\#\#\#\# Events / Calendar**

\* Campos de evento utilizables como datos demo:  
  \* \`title\`.  
  \* \`description\`.  
  \* \`visibility\`.  
  \* \`status\`.  
  \* \`all\_day\`.  
  \* \`starts\_at\`.  
  \* \`ends\_at\`.  
  \* \`location\_name\`.  
  \* \`location\_address\`.  
  \* \`location\_coordinates\`.  
  \* \`created\_by\`.  
  \* \`created\_at\`.  
  \* \`updated\_at\`.  
\* Estado default:  
  \* \`scheduled\`.  
\* Estado de cancelación:  
  \* \`cancelled\`.  
\* \`all\_day\` default:  
  \* \`false\`.  
\* \`visibility\` default:  
  \* \`household\`.  
\* Ejemplo textual encontrado en edge case POST\_MVP:  
  \* evento semanal “Clase de piano”.  
\* Test case de evento:  
  \* evento con \`starts\_at\`, \`ends\_at\`, participantes y visible en calendario.

**\#\#\#\# Templates**

\* El documento define \`Task Templates\` como plantillas para crear tareas rápidamente.  
\* Campos encontrados:  
  \* \`title\`.  
  \* \`description\`.  
  \* \`default\_assignee\_id\`.  
  \* \`default\_priority\`.  
  \* \`default\_due\_time\`.  
  \* \`default\_responsibility\_id\`.  
  \* \`recurrence\_rule\`.  
  \* \`category\`.  
  \* \`is\_active\`.  
\* Para el alcance dado, el CRUD de templates queda POST\_MVP porque el prompt exige templates predefinidas como constantes sin CRUD.  
\* No se encontraron en este documento las templates predefinidas “Limpieza”, “Compras”, “Mascotas”, “Medicación”, “Estudios”, “Pagos”.

**\#\#\# 2.3 Acción interactiva**

**\#\#\#\# Tasks**

\* Crear tarea.  
  \* REAL.  
  \* Endpoint: \`POST /api/households/:hid/tasks\`.  
  \* Resultado visible: \`task\_id\`, \`created\_by\`, \`created\_at\`; test indica tarea visible en lista.  
\* Listar tareas.  
  \* REAL.  
  \* Endpoint: \`GET /api/households/:hid/tasks\`.  
  \* Resultado visible: lista y paginación \`next\_cursor\`.  
\* Abrir detalle de tarea.  
  \* REAL.  
  \* Endpoint: \`GET /api/households/:hid/tasks/:tid\`.  
\* Editar tarea.  
  \* REAL.  
  \* Endpoint: \`PATCH /api/households/:hid/tasks/:tid\`.  
  \* Resultado visible: \`updated\_fields\`, \`updated\_at\`.  
\* Completar tarea.  
  \* REAL.  
  \* Se hace vía \`PATCH /tasks/:tid\` con \`status='completed'\`.  
  \* Dispara \`task.completed\`.  
\* Reasignar tarea.  
  \* REAL parcial.  
  \* Se hace vía PATCH con \`assigned\_to\`.  
  \* Dispara \`task.reassigned\`.  
\* Eliminar tarea.  
  \* REAL.  
  \* Endpoint: \`DELETE /api/households/:hid/tasks/:tid\`.  
  \* Soft-delete con \`deleted\_at\`.  
\* Verificar tarea.  
  \* REAL.  
  \* Endpoint: \`POST /api/households/:hid/tasks/:tid/verify\`.  
  \* Solo si \`status='completed'\` y \`requires\_verification=true\`.  
  \* Adulto o Coordinador.  
  \* Dispara \`task.verified\`.  
\* Crear comentario.  
  \* POST\_MVP.  
\* Subir adjunto.  
  \* POST\_MVP.  
\* Crear/eliminar dependencia.  
  \* POST\_MVP.  
\* Crear/editar/eliminar templates.  
  \* POST\_MVP.

**\#\#\#\# Events / Calendar**

\* Crear evento.  
  \* REAL.  
  \* Endpoint: \`POST /api/households/:hid/events\`.  
  \* Resultado visible: \`event\_id\`, \`created\_by\`, \`created\_at\`; test indica visible en calendario.  
\* Listar eventos.  
  \* REAL.  
  \* Endpoint: \`GET /api/households/:hid/events\`.  
  \* Requiere rango \`from/to\`.  
\* Abrir detalle de evento.  
  \* REAL.  
  \* Endpoint: \`GET /api/households/:hid/events/:eid\`.  
\* Editar evento.  
  \* REAL.  
  \* Endpoint: \`PATCH /api/households/:hid/events/:eid\`.  
  \* Cambio de fecha dispara \`event.updated\`.  
\* Cancelar evento.  
  \* REAL.  
  \* Se hace con PATCH \`status='cancelled'\`.  
  \* Dispara \`event.cancelled\`.  
\* Eliminar evento.  
  \* REAL.  
  \* Endpoint: \`DELETE /api/households/:hid/events/:eid\`.  
  \* Soft-delete con \`deleted\_at\`.  
\* Agregar/listar/responder/eliminar participantes.  
  \* POST\_MVP para este fragment.  
\* Resolver recurrencia con “Solo esta / Esta y siguientes / Todas”.  
  \* POST\_MVP.

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Feedback API general**

\* Convención global de errores:  
  \* \`{ error: string, code: string, field?: string, details?: any }\`.  
\* Paginación:  
  \* \`next\_cursor\`.  
\* Soft-delete:  
  \* respuestas con \`deleted\_at\`.

**\#\#\#\# Tasks**

\* Crear tarea sin \`responsibility\_id\`:  
  \* \`400\`, mensaje \`"responsibility\_id is required"\` según test case.  
\* Niño creando tareas:  
  \* \`403\`, RLS bloquea INSERT.  
\* Adolescente crea tarea para otro:  
  \* \`403\`, RLS bloquea.  
\* Completar tarea:  
  \* \`200\`, dispara \`task.completed\`.  
\* Completar tarea ya completada:  
  \* \`409\`, error \`task\_already\_completed\` con \`completed\_by\` y \`completed\_at\`.  
\* Verificar tarea completada:  
  \* \`200\`, dispara \`task.verified\`, notificación al asignado.  
\* Verificar tarea no completada:  
  \* \`409\`, error \`task\_not\_completed\`.  
\* Responsabilidad sin miembros activos:  
  \* tareas existentes se preservan.  
  \* nuevas tareas con esa responsabilidad requieren \`assigned\_to\` explícito.  
\* Tarea vencida:  
  \* no es estado; se calcula.

**\#\#\#\# Events / Calendar**

\* Crear evento:  
  \* \`201\`, notificación a participantes, visible en calendario.  
\* Cancelar evento inminente:  
  \* \`200\`, dispara \`event.cancelled\` con prioridad alta.  
\* Evento que empieza en ≤2h:  
  \* prioridad 🟠 AL.  
\* Evento recurrente con modificación de una instancia:  
  \* POST\_MVP; UI con radio buttons “Solo esta / Esta y siguientes / Todas”.

No se encontraron explícitamente:

\* loading.  
\* toast.  
\* success toast.  
\* skeleton.  
\* spinner.  
\* retry.  
\* disabled state.  
\* estado vacío visual.

**\#\#\# 2.5 Service aislado**

**\#\#\#\# Fuente de datos real**

\* Base URL global: \`https://api.HomePlus.app/api\`.  
\* Auth: Bearer token JWT de Supabase.  
\* Content-Type: \`application/json\` salvo multipart.  
\* RLS: toda query se filtra por \`household\_id\` del miembro autenticado.  
\* Soft-delete: DELETE aplica \`deleted\_at \= now()\`.

**\#\#\#\# Datos que debe listar el service de Planner**

\* Tasks:  
  \* listado de tareas por household.  
  \* detalle de una tarea.  
  \* filtros por status, assigned\_to, responsibility\_id, goal\_id, sort, cursor, limit.  
\* Events:  
  \* listado de eventos por household.  
  \* detalle de un evento.  
  \* filtro por rango \`from/to\`, status, visibility.  
\* Responsibilities:  
  \* dependencia externa para selector o validación de \`responsibility\_id\`.

**\#\#\#\# Acciones que ejecuta el service de Planner**

\* Crear tarea.  
\* Editar tarea.  
\* Completar tarea vía PATCH status.  
\* Eliminar tarea.  
\* Verificar tarea.  
\* Crear evento.  
\* Editar evento.  
\* Cancelar evento vía PATCH status.  
\* Eliminar evento.  
\* Listar eventos para calendario.

**\#\#\#\# Integración Realtime**

\* Canal \`household:{hid}\`.  
\* Eventos Planner relevantes:  
  \* \`task.created\`.  
  \* \`task.completed\`.  
  \* \`task.verified\`.  
  \* \`task.reassigned\`.  
  \* \`event.created\`.  
  \* \`event.cancelled\`.  
  \* \`event.updated\`.  
  \* \`event.conflict\_detected\` POST\_MVP.

**\#\#\#\# Mock/local**

\* No se menciona explícitamente AsyncStorage ni mock service para Planner.  
\* El documento menciona UUID pre-generado en cliente para soporte offline, pero Offline Sync está fuera de este fragment.

**\#\#\# 2.6 Navegación coherente**

\* \`BottomNavigation\` aparece en el archivo de comprensión con estructura:  
  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`Planner\` aparece como tab principal en Bottom Nav.  
\* \`QuickActions\` aparece como panel de acción rápida desde botón \`+\` en Bottom Nav.  
\* El archivo de comprensión indica \`QuickActions,accesses,Geni\`; no se encontraron acciones Planner detalladas desde QuickActions en el documento principal.  
\* Home siempre es la pantalla inicial.  
\* Home no administra información, solo resume y redirige al módulo correspondiente.  
\* Para Planner, navegación explícita derivada:  
  \* entrar desde Bottom Nav \> Planner.  
  \* Home puede redirigir al módulo correspondiente al tocar resumen de tareas/eventos.

No se encontraron rutas de pantalla internas como:

\* Planner \> Task Detail.  
\* Planner \> Create Task.  
\* Planner \> Event Detail.  
\* Planner \> Create Event.  
\* Planner \> Calendar Day/Week/Month.

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

\* Home se define en comprensión como centro operativo del hogar.  
\* Home resume información, no administra.  
\* Home siempre es pantalla inicial.  
\* Home redirige al módulo correspondiente al tocar un resumen.  
\* Relaciones encontradas en comprensión/source map:  
  \* Home summarizes Tasks.  
  \* Home summarizes Events.  
\* Para Planner, Home puede mostrar información derivada de:  
  \* \`GET /tasks\` para tareas pendientes o vencidas.  
  \* \`GET /events\` para próximos eventos.  
\* No hay endpoint \`/home\` ni contrato específico de card Home para Planner.  
\* No hay UI explícita de widget “tareas pendientes” ni “próximos eventos” en el documento principal.

**\#\#\#\# More**

\* No se encontró que Planner viva en More.  
\* Planner aparece como tab principal en Bottom Nav.

**\#\#\#\# Quick Actions**

\* QuickActions existe como panel desde botón \`+\` en Bottom Nav.  
\* No se encontraron acciones específicas de Planner desde QuickActions en el documento actual.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

Extraíble como implementación MVP real o real mínima:

\* Listar tareas.  
\* Crear tarea.  
\* Editar tarea.  
\* Completar tarea vía PATCH \`status='completed'\`.  
\* Cambiar estado de tarea con PATCH cuando aplique.  
\* Reasignar tarea vía \`assigned\_to\`.  
\* Eliminar tarea con soft-delete.  
\* Ver detalle de tarea.  
\* Verificar tarea vía endpoint \`verify\`.  
\* Listar eventos por rango.  
\* Crear evento.  
\* Editar evento.  
\* Cancelar evento vía \`status='cancelled'\`.  
\* Eliminar evento con soft-delete.  
\* Ver detalle de evento.  
\* Mostrar eventos en calendario, porque el test case indica evento visible en calendario.  
\* Usar \`due\_date\` y \`due\_time\` de tasks como datos visuales de fecha límite.  
\* Usar \`priority\` con default \`medium\`.  
\* Usar \`visibility='household'\` y \`visibility='personal'\` como información visual si se necesita.  
\* Usar \`responsibility\_id\` como dependencia obligatoria de creación de tarea.  
\* Usar members como dependencia para \`assigned\_to\`, \`completed\_by\`, \`verified\_by\`, \`created\_by\`.  
\* Consumir eventos realtime \`task.created\`, \`task.completed\`, \`task.verified\`, \`task.reassigned\`, \`event.created\`, \`event.updated\`, \`event.cancelled\` si la demo ya tiene realtime disponible.

**\#\#\# DEMO PREMIUM**

Información que puede ayudar a que Planner parezca más usable sin exigir backend adicional:

\* Mostrar filtros/tabs derivados de query params:  
  \* status.  
  \* assigned\_to.  
  \* responsibility\_id.  
  \* sort by due\_date.  
\* Mostrar badges:  
  \* \`status\`.  
  \* \`priority\`.  
  \* \`visibility\`.  
  \* \`requires\_verification\`.  
  \* \`overdue\` calculado.  
\* Mostrar cards de tareas con:  
  \* title.  
  \* due\_date/due\_time.  
  \* assigned\_to.  
  \* priority.  
  \* status.  
  \* requires\_verification.  
\* Mostrar cards de eventos con:  
  \* title.  
  \* starts\_at.  
  \* ends\_at.  
  \* all\_day.  
  \* location\_name.  
  \* status.  
\* Mostrar calendario simple como lista agrupada por rango, porque no hay UI día/semana/mes explícita.  
\* Mostrar “visible en calendario” después de crear evento, porque aparece en test case.  
\* Mostrar error/feedback local usando los errores API documentados.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

No se encontró mención explícita a AsyncStorage o mock service en Planner.

Sí se puede clasificar como candidato local/mock, sin convertirlo en obligación backend:

\* Estados visuales no definidos por API:  
  \* loading.  
  \* empty state.  
  \* success toast.  
  \* disabled state.  
\* Datos demo de cards si no hay backend disponible.  
\* Filtros visuales basados en campos reales.  
\* Calendario día/semana/mes solo como navegación visual si la etapa de merge decide usarlo, porque el documento actual no lo define.

**\#\#\# POST\_MVP**

Del módulo Planner, clasificado como POST\_MVP para este fragment:

\* Task Templates CRUD.  
\* Templates personalizadas.  
\* Comentarios de tareas.  
\* Adjuntos de tareas.  
\* Archivos/imágenes/audio en tareas.  
\* Dependencias entre tareas.  
\* Dependencia circular.  
\* Subtareas vía \`parent\_task\_id\`.  
\* Recurrencia compleja de tasks con \`recurrence\_rule\` y \`recurrence\_end\`.  
\* Ajuste de tarea recurrente al último día del mes.  
\* Goals.  
\* Milestones.  
\* Streaks.  
\* LoadMetrics / carga real.  
\* Participantes avanzados de eventos.  
\* Respuestas de participantes \`accepted\`, \`declined\`, \`maybe\`.  
\* Conflictos de eventos detectados por Geni.  
\* Recordatorios CRON avanzados.  
\* RRULE / EXDATE / excepciones de eventos recurrentes.  
\* UI de recurrencia “Solo esta / Esta y siguientes / Todas”.  
\* Notificaciones reales/push/email.  
\* Offline Sync, aunque se menciona UUID pre-generado en cliente.  
\* Auditoría completa.

**\#\#\# IGNORAR**

No desarrollar como parte real de este fragment:

\* Feed real y post automático al completar tarea.  
\* Geni real.  
\* Automations reales.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* HomeCloud/MediaItems desde eventos.  
\* SOS real.  
\* Presence GPS real.  
\* Multi-hogar avanzado.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \------------------- | \----------- | \-------- | \---------- | \---------- | \------------- |  
| Planner tab | Módulo operativo de Tasks/Calendar según comprensión | No se detallan acciones UI | No encontrado | Bottom Nav \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\` | REAL MÍNIMO |  
| Task List | Lista \`{ tasks: \[...\], next\_cursor }\`; filtros status, assigned\_to, responsibility\_id, goal\_id, sort due\_date | Listar, filtrar, abrir detalle implícito por endpoint detail | Errores no aplican a listado; empty state no encontrado | Planner | REAL MÍNIMO |  
| Task Detail | id, title, description, visibility, status, priority, dates, assignee, completed/verified fields | Editar, completar, reasignar, eliminar, verificar si aplica | 409 completed race; 409 verify not completed | Desde Task List, navegación no explícita | REAL MÍNIMO |  
| Create Task | title, responsibility\_id, description, visibility, priority, start\_date, due\_date, due\_time, assigned\_to, requires\_verification | Crear tarea | 400 missing responsibility; 403 niño; 403 adolescente asignando a otro | No encontrado | REAL MÍNIMO |  
| Edit Task | title, description, visibility, status, priority, start\_date, due\_date, due\_time, assigned\_to, requires\_verification | Guardar cambios, completar, reasignar | 409 task\_already\_completed | No encontrado | REAL MÍNIMO |  
| Verify Task | Tarea completed \+ requires\_verification | Verificar | 200 task.verified; 409 task\_not\_completed | No encontrado | REAL MÍNIMO |  
| Calendar / Events List | Eventos por rango from/to; status, visibility; campos title, starts\_at, ends\_at, all\_day, location\_name | Listar eventos, abrir detalle | Rango obligatorio para rendimiento; empty state no encontrado | Planner / Calendar | REAL MÍNIMO |  
| Create Event | title, starts\_at, description, visibility, all\_day, ends\_at, location fields | Crear evento | 201; visible en calendario | No encontrado | REAL MÍNIMO |  
| Event Detail | title, description, status, all\_day, starts\_at, ends\_at, location, created\_by, updated\_at | Editar, cancelar, eliminar | Cancelar inminente prioridad alta | Desde calendario/lista, navegación no explícita | REAL MÍNIMO |  
| Recurrence Exception UI | Radio buttons “Solo esta / Esta y siguientes / Todas” | Elegir alcance de modificación recurrente | No detallado | Desde evento recurrente | POST\_MVP |  
| Task Comments | Lista/crear comentarios | Comentar | No detallado | Desde task detail | POST\_MVP |  
| Task Attachments | Subir archivo multipart | Adjuntar archivo | No detallado | Desde task detail | POST\_MVP |  
| Task Templates | Templates con defaults | Crear/listar/editar/eliminar template | No detallado | Planner | POST\_MVP |  
| Event Participants | Participantes y response | Agregar/responder/remover | pending/accepted/declined/maybe | Desde event detail | POST\_MVP |  
| Home Planner summary | Resumen de tareas/eventos | Tocar para redirigir al módulo | No encontrado | Home → Planner | REAL parcial / dependencia externa |  
| Quick Actions | Botón \`+\` en Bottom Nav | No se encontraron acciones Planner específicas | No encontrado | Bottom Nav | Dependencia externa / no desarrollar |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \------------ | \------ | \----------- | \------ | \------------- |  
| \`title\` | Tasks | Título de card/list item/create form | 2.1 Tasks | REAL MÍNIMO |  
| \`description\` | Tasks | Texto secundario o detalle | 2.1 Tasks | REAL MÍNIMO |  
| \`status\` | Tasks | Badge/filtro | 2.1 Tasks | REAL MÍNIMO |  
| \`pending\` | Tasks | Filtro/estado visible | GET tasks query | REAL MÍNIMO |  
| \`in\_progress\` | Tasks | Filtro/estado visible; cálculo overdue | GET tasks query / business rules | REAL MÍNIMO |  
| \`completed\` | Tasks | Estado completado | PATCH task / test cases | REAL MÍNIMO |  
| \`cancelled\` | Tasks | Estado cancelado | PATCH task notes | POST\_MVP o REAL parcial, no está en estados MVP del prompt |  
| \`priority\` | Tasks | Badge o selector | 2.1 Tasks | REAL MÍNIMO |  
| \`medium\` | Tasks | Default de prioridad | POST tasks notes | REAL MÍNIMO |  
| \`due\_date\` | Tasks | Fecha límite; orden; overdue | 2.1 Tasks | REAL MÍNIMO |  
| \`due\_time\` | Tasks | Hora límite | 2.1 Tasks | REAL MÍNIMO |  
| \`assigned\_to=child\` | Tasks | Ejemplo de asignación | TC-T1 | REAL MÍNIMO |  
| \`requires\_verification\` | Tasks | Badge/flujo de verificación | 2.1 Tasks | REAL MÍNIMO |  
| \`verified\_by\`, \`verified\_at\` | Tasks | Mostrar verificación | 2.1 Tasks | REAL MÍNIMO |  
| \`responsibility\_id\` | Tasks | Selector obligatorio de área | POST tasks / apéndice | Dependencia externa / REAL MÍNIMO |  
| \`visibility='household'\` | Tasks/Events | Badge/filtro | Tasks/Events notes | REAL MÍNIMO |  
| \`visibility='personal'\` | Tasks/Events | Badge/filtro privado | Tasks/Events notes | REAL MÍNIMO |  
| \`title\` | Events | Título de evento | 2.3 Events | REAL MÍNIMO |  
| \`starts\_at\` | Events | Fecha/hora de inicio | 2.3 Events / apéndice | REAL MÍNIMO |  
| \`ends\_at\` | Events | Fecha/hora de fin | 2.3 Events | REAL MÍNIMO |  
| \`all\_day=false\` | Events | Toggle todo el día default | POST events notes | REAL MÍNIMO |  
| \`scheduled\` | Events | Estado default | POST events notes | REAL MÍNIMO |  
| \`cancelled\` | Events | Estado de cancelación | PATCH events notes | REAL MÍNIMO |  
| \`location\_name\` | Events | Lugar visible en card | 2.3 Events | REAL MÍNIMO |  
| “Clase de piano” | Events/Calendar | Ejemplo textual de evento recurrente | EC-7 | POST\_MVP |  
| \`pending\`, \`accepted\`, \`declined\`, \`maybe\` | EventParticipants | Estados de respuesta de participante | 2.3 participants | POST\_MVP |  
| \`display\_name\` | Members dependency | Mostrar nombres en assignee/creator/verifier | Members API / comprensión | Dependencia externa / no desarrollar |  
| \`avatar\_url\` | Members dependency | Avatar en cards si se usa members | Members API | Dependencia externa / no desarrollar |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \------ | \----------- | \----------------- | \------------------ | \------ |  
| Crear tarea | Adulto, Coordinador, Senior; Adolescente solo si \`assigned\_to\` es él mismo | \`201\`, \`{ task\_id, created\_by, created\_at }\`, tarea visible en lista | REAL MÍNIMO | 2.1 Tasks; TC-T1; TC-T4 |  
| Crear tarea sin responsabilidad | Adulto autenticado | \`400\`, \`responsibility\_id is required\` | REAL MÍNIMO | TC-T2 |  
| Intentar crear tarea como Niño | Niño autenticado | \`403\`, RLS bloquea INSERT | REAL MÍNIMO | TC-T3 |  
| Adolescente asigna tarea a otro | Adolescente autenticado | \`403\`, RLS bloquea | REAL MÍNIMO | TC-T5 |  
| Listar tareas | Miembro del hogar | \`{ tasks: \[...\], next\_cursor }\` | REAL MÍNIMO | GET tasks |  
| Ver detalle de tarea | Miembro con acceso | Objeto task detail | REAL MÍNIMO | GET task detail |  
| Editar tarea | \`created\_by\` o \`coordinator\`; \`assigned\_to\` para completar | \`{ task\_id, updated\_fields, updated\_at }\` | REAL MÍNIMO | PATCH task |  
| Completar tarea | Miembro con tarea pendiente asignada | \`200\`, \`task.completed\` | REAL MÍNIMO | PATCH task; TC-T6 |  
| Completar tarea ya completada | Asignado/adulto en carrera | \`409\`, \`task\_already\_completed\` con \`completed\_by\`, \`completed\_at\` | REAL MÍNIMO | PATCH task; TC-T7; EC-2 |  
| Reasignar tarea | No especificado con detalle; PATCH permitido según permisos | \`task.reassigned\` | REAL MÍNIMO parcial | PATCH task notes; Realtime |  
| Eliminar tarea | \`created\_by\` o \`coordinator\` | \`{ task\_id, deleted\_at }\` | REAL MÍNIMO | DELETE task |  
| Verificar tarea completada | Adulto o Coordinador | \`200\`, \`{ verified\_by, verified\_at }\`, \`task.verified\` | REAL MÍNIMO | POST verify; TC-T8 |  
| Verificar tarea no completada | Adulto | \`409\`, \`task\_not\_completed\` | REAL MÍNIMO | POST verify; TC-T9 |  
| Crear comentario en tarea | Miembro del hogar | \`{ comment\_id, author\_id, created\_at }\` | POST\_MVP | Task comments |  
| Subir adjunto a tarea | Miembro del hogar | \`{ attachment\_id, file\_name, file\_size, created\_at }\` | POST\_MVP | Task attachments |  
| Crear dependencia | Adulto o Coordinador | \`{ dependency\_id, task\_id, depends\_on\_task\_id }\` | POST\_MVP | Task dependencies |  
| Eliminar dependencia | Adulto o Coordinador | \`{ removed: true }\` | POST\_MVP | Task dependencies |  
| Crear task template | Adulto o Coordinador | \`{ template\_id, created\_at }\` | POST\_MVP | Task Templates |  
| Listar task templates | Miembro del hogar | \`{ templates: \[...\] }\` | POST\_MVP | Task Templates |  
| Crear evento | Adulto, Coordinador, Senior, Adolescente | \`201\`, \`{ event\_id, created\_by, created\_at }\`, visible en calendario | REAL MÍNIMO | 2.3 Events; TC-C1 |  
| Listar eventos | Miembro del hogar | \`{ events: \[...\] }\` | REAL MÍNIMO | GET events |  
| Ver detalle evento | Miembro con acceso | Objeto event detail | REAL MÍNIMO | GET event detail |  
| Editar evento | \`created\_by\` o \`coordinator\` | \`{ event\_id, updated\_fields, updated\_at }\`; cambio fecha dispara \`event.updated\` | REAL MÍNIMO | PATCH event |  
| Cancelar evento | \`created\_by\` o \`coordinator\` | \`event.cancelled\`; si empieza en ≤2h, prioridad alta | REAL MÍNIMO | PATCH event; TC-C3 |  
| Eliminar evento | \`created\_by\` o \`coordinator\` | \`{ event\_id, deleted\_at }\` | REAL MÍNIMO | DELETE event |  
| Agregar participante | \`created\_by\` o \`coordinator\` | \`{ participant\_id, member\_id, response: 'pending' }\` | POST\_MVP | Event participants |  
| Responder evento | Propio participante | \`{ participant\_id, response, responded\_at }\` | POST\_MVP | Event participants |  
| Detectar conflicto de evento | Geni async | \`event.conflict\_detected\`, notificación | POST\_MVP | TC-C2; Realtime |  
| Recordatorio de evento | CRON | \`event.reminder\_due\`, push/email | POST\_MVP | TC-C4 |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Home puede mostrar información de Planner porque el archivo de comprensión/source map registra:  
  \* Home summarizes Tasks.  
  \* Home summarizes Events.  
\* Home no administra información; solo resume y redirige al módulo correspondiente.  
\* Home siempre es pantalla inicial.  
\* Para Planner, Home puede exponer:  
  \* tareas pendientes derivadas de \`GET /tasks\` con status \`pending,in\_progress\`.  
  \* tareas vencidas calculadas por \`due\_date \< today AND status IN ('pending','in\_progress')\`.  
  \* próximos eventos derivados de \`GET /events\` con rango \`from/to\`.  
\* No se encontró endpoint \`/home\` ni contrato de widget específico.  
\* No se encontró card visual concreta para Planner en Home.

**\#\#\# More**

\* Planner no vive en More según el archivo de comprensión.  
\* Planner aparece como tab principal en Bottom Nav.  
\* No se encontró card/list item de More para Planner.

**\#\#\# Quick Actions**

\* QuickActions existe como panel de acción rápida desde botón \`+\` en Bottom Nav.  
\* No se encontraron acciones específicas de Planner desde QuickActions dentro del documento actual.  
\* Cualquier acceso “crear tarea” o “crear evento” desde QuickActions queda como no encontrado en este documento y debe definirse en otra etapa/fuente.

**\---**

**\#\# 8\. Backend/API detectado**

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--------------- | \------ | \---- | \------- | \-------- | \------ | \------------- |  
| Create task | POST | \`/api/households/:hid/tasks\` | \`{ title, responsibility\_id, description?, visibility?, priority?, start\_date?, due\_date?, due\_time?, recurrence\_rule?, recurrence\_end?, goal\_id?, assigned\_to?, requires\_verification?, parent\_task\_id?, event\_id? }\` | \`{ task\_id, created\_by, created\_at }\` | Definido | REAL MÍNIMO con campos POST\_MVP a recortar |  
| List tasks | GET | \`/api/households/:hid/tasks\` | Query \`status\`, \`assigned\_to\`, \`responsibility\_id\`, \`goal\_id\`, \`sort\`, \`cursor\`, \`limit\` | \`{ tasks: \[...\], next\_cursor }\` | Definido | REAL MÍNIMO |  
| Get task detail | GET | \`/api/households/:hid/tasks/:tid\` | No encontrado | Task detail completo | Definido | REAL MÍNIMO |  
| Patch task | PATCH | \`/api/households/:hid/tasks/:tid\` | \`{ title?, description?, visibility?, status?, priority?, start\_date?, due\_date?, due\_time?, assigned\_to?, goal\_id?, requires\_verification? }\` | \`{ task\_id, updated\_fields, updated\_at }\` | Definido | REAL MÍNIMO con campos POST\_MVP a recortar |  
| Delete task | DELETE | \`/api/households/:hid/tasks/:tid\` | No encontrado | \`{ task\_id, deleted\_at }\` | Definido | REAL MÍNIMO |  
| Verify task | POST | \`/api/households/:hid/tasks/:tid/verify\` | \`{}\` | \`{ verified\_by, verified\_at }\` | Definido | REAL MÍNIMO |  
| Create task comment | POST | \`/api/households/:hid/tasks/:tid/comments\` | \`{ content }\` | \`{ comment\_id, author\_id, created\_at }\` | Definido | POST\_MVP |  
| List task comments | GET | \`/api/households/:hid/tasks/:tid/comments\` | No encontrado | \`{ comments: \[...\] }\` | Definido | POST\_MVP |  
| Upload task attachment | POST | \`/api/households/:hid/tasks/:tid/attachments\` | \`multipart/form-data: file\` | \`{ attachment\_id, file\_name, file\_size, created\_at }\` | Definido | POST\_MVP |  
| Create task dependency | POST | \`/api/households/:hid/tasks/:tid/dependencies\` | \`{ depends\_on\_task\_id }\` | \`{ dependency\_id, task\_id, depends\_on\_task\_id }\` | Definido | POST\_MVP |  
| Delete task dependency | DELETE | \`/api/households/:hid/tasks/:tid/dependencies/:did\` | No encontrado | \`{ removed: true }\` | Definido | POST\_MVP |  
| Create task template | POST | \`/api/households/:hid/task-templates\` | \`{ title, description?, default\_assignee\_id?, default\_priority?, default\_due\_time?, default\_responsibility\_id?, recurrence\_rule?, category? }\` | \`{ template\_id, created\_at }\` | Definido | POST\_MVP |  
| List task templates | GET | \`/api/households/:hid/task-templates\` | Query \`category\`, \`is\_active\` | \`{ templates: \[...\] }\` | Definido | POST\_MVP |  
| Patch task template | PATCH | \`/api/households/:hid/task-templates/:tid\` | Template optional fields | \`{ template\_id, updated\_fields }\` | Definido | POST\_MVP |  
| Delete task template | DELETE | \`/api/households/:hid/task-templates/:tid\` | No encontrado | \`{ template\_id, deleted: true }\` | Definido | POST\_MVP |  
| Create event | POST | \`/api/households/:hid/events\` | \`{ title, starts\_at, description?, visibility?, all\_day?, ends\_at?, recurrence\_rule?, recurrence\_end?, location\_name?, location\_address?, location\_coordinates? }\` | \`{ event\_id, created\_by, created\_at }\` | Definido | REAL MÍNIMO con recurrencia compleja a recortar |  
| List events | GET | \`/api/households/:hid/events\` | Query \`from\`, \`to\`, \`status\`, \`visibility\` | \`{ events: \[...\] }\` | Definido | REAL MÍNIMO |  
| Get event detail | GET | \`/api/households/:hid/events/:eid\` | No encontrado | Event detail completo | Definido | REAL MÍNIMO |  
| Patch event | PATCH | \`/api/households/:hid/events/:eid\` | \`{ title?, description?, starts\_at?, ends\_at?, all\_day?, location\_name?, location\_address?, location\_coordinates?, status?, recurrence\_rule?, recurrence\_end? }\` | \`{ event\_id, updated\_fields, updated\_at }\` | Definido | REAL MÍNIMO con recurrencia compleja a recortar |  
| Delete event | DELETE | \`/api/households/:hid/events/:eid\` | No encontrado | \`{ event\_id, deleted\_at }\` | Definido | REAL MÍNIMO con excepción recurrente POST\_MVP |  
| Add event participant | POST | \`/api/households/:hid/events/:eid/participants\` | \`{ member\_id }\` | \`{ participant\_id, member\_id, response: 'pending' }\` | Definido | POST\_MVP |  
| List event participants | GET | \`/api/households/:hid/events/:eid/participants\` | No encontrado | \`{ participants: \[...\] }\` | Definido | POST\_MVP |  
| Respond event participant | PATCH | \`/api/households/:hid/events/:eid/participants/:pid\` | \`{ response }\` — accepted/declined/maybe | \`{ participant\_id, response, responded\_at }\` | Definido | POST\_MVP |  
| Delete event participant | DELETE | \`/api/households/:hid/events/:eid/participants/:pid\` | No encontrado | \`{ removed: true }\` | Definido | POST\_MVP |  
| List responsibilities | GET | \`/api/households/:hid/responsibilities\` | Query \`is\_active\`, \`category\` | \`{ responsibilities: \[...\] }\` | Definido | Dependencia externa / no desarrollar |  
| Calendar combined view | Acción mencionada | No encontrado | No encontrado | No encontrado | No encontrado | Faltante |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \------- | \----- | \--------------- | \-------------- | \------------------------ | \------------- |  
| Task | \`id\` | no especificado | no especificado | Identificador detalle/lista | REAL MÍNIMO |  
| Task | \`title\` | no especificado | requerido en create | Título de tarea | REAL MÍNIMO |  
| Task | \`description\` | no especificado | opcional | Detalle/preview | REAL MÍNIMO |  
| Task | \`visibility\` | no especificado | \`household\`, \`personal\`; default \`household\` | Badge/filtro/RLS | REAL MÍNIMO |  
| Task | \`status\` | no especificado | \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\` encontrados | Badge, filtros, completar/cancelar | REAL MÍNIMO con contradicción de estados MVP |  
| Task | \`priority\` | no especificado | default \`medium\` | Badge/orden visual | REAL MÍNIMO |  
| Task | \`start\_date\` | no especificado | opcional | Fecha de inicio | REAL MÍNIMO |  
| Task | \`due\_date\` | no especificado | opcional | Fecha límite, overdue | REAL MÍNIMO |  
| Task | \`due\_time\` | no especificado | opcional | Hora límite | REAL MÍNIMO |  
| Task | \`recurrence\_rule\` | no especificado | no especificado | Recurrencia | POST\_MVP |  
| Task | \`recurrence\_end\` | no especificado | no especificado | Fin recurrencia | POST\_MVP |  
| Task | \`responsibility\_id\` | no especificado | obligatorio | Selector/validación de área | Dependencia externa / REAL MÍNIMO |  
| Task | \`goal\_id\` | no especificado | opcional | Relación con Goals | POST\_MVP |  
| Task | \`created\_by\` | no especificado | response | Autor/permiso edición | REAL MÍNIMO |  
| Task | \`assigned\_to\` | no especificado | opcional | Responsable | REAL MÍNIMO |  
| Task | \`completed\_by\` | no especificado | response detail/error | Feedback de completado | REAL MÍNIMO |  
| Task | \`completed\_at\` | no especificado | response detail/error | Timestamp completado | REAL MÍNIMO |  
| Task | \`requires\_verification\` | no especificado | booleano implícito por true/false | Badge/flujo verificación | REAL MÍNIMO |  
| Task | \`verified\_by\` | no especificado | response detail | Mostrar verificador | REAL MÍNIMO |  
| Task | \`verified\_at\` | no especificado | response detail | Timestamp verificación | REAL MÍNIMO |  
| Task | \`parent\_task\_id\` | no especificado | opcional | Subtarea | POST\_MVP |  
| Task | \`event\_id\` | no especificado | opcional | Relación con evento | POST\_MVP/parcial |  
| Task | \`created\_at\` | no especificado | response | Orden/meta | REAL MÍNIMO |  
| Task | \`updated\_at\` | no especificado | response | Feedback edición | REAL MÍNIMO |  
| TaskTemplate | \`title\` | no especificado | requerido | Plantilla | POST\_MVP |  
| TaskTemplate | \`default\_assignee\_id\` | no especificado | opcional | Default responsable | POST\_MVP |  
| TaskTemplate | \`default\_priority\` | no especificado | opcional | Default prioridad | POST\_MVP |  
| TaskTemplate | \`category\` | no especificado | opcional | Categoría | POST\_MVP |  
| TaskTemplate | \`is\_active\` | no especificado | query/response | Estado activo | POST\_MVP |  
| Event | \`id\` | no especificado | no especificado | Identificador detalle/lista | REAL MÍNIMO |  
| Event | \`title\` | no especificado | requerido | Título evento | REAL MÍNIMO |  
| Event | \`description\` | no especificado | opcional | Detalle | REAL MÍNIMO |  
| Event | \`visibility\` | no especificado | default \`household\`; \`personal\` | Badge/RLS | REAL MÍNIMO |  
| Event | \`status\` | no especificado | default \`scheduled\`; \`cancelled\` | Badge/cancelar | REAL MÍNIMO |  
| Event | \`all\_day\` | no especificado | default \`false\` | Toggle/card | REAL MÍNIMO |  
| Event | \`starts\_at\` | no especificado | requerido | Fecha/hora inicio | REAL MÍNIMO |  
| Event | \`ends\_at\` | no especificado | opcional | Fecha/hora fin | REAL MÍNIMO |  
| Event | \`recurrence\_rule\` | no especificado | no especificado | Recurrencia | POST\_MVP salvo recorte simple posterior |  
| Event | \`recurrence\_end\` | no especificado | no especificado | Fin recurrencia | POST\_MVP |  
| Event | \`location\_name\` | no especificado | opcional | Lugar en card | REAL MÍNIMO |  
| Event | \`location\_address\` | no especificado | opcional | Detalle lugar | REAL MÍNIMO |  
| Event | \`location\_coordinates\` | no especificado | opcional | Mapa/ubicación | POST\_MVP para no usar mapas reales |  
| Event | \`created\_by\` | no especificado | response | Autor/permiso | REAL MÍNIMO |  
| Event | \`created\_at\` | no especificado | response | Metadata | REAL MÍNIMO |  
| Event | \`updated\_at\` | no especificado | response | Feedback edición | REAL MÍNIMO |  
| EventParticipant | \`member\_id\` | no especificado | request | Participante | POST\_MVP |  
| EventParticipant | \`response\` | no especificado | \`pending\`, \`accepted\`, \`declined\`, \`maybe\` | Estado asistencia | POST\_MVP |  
| Responsibility | \`id\` | no especificado | response | Selector para task | Dependencia externa / no desarrollar |  
| Responsibility | \`title\` | no especificado | response | Label selector/filtro | Dependencia externa / no desarrollar |  
| Responsibility | \`category\` | no especificado | query/response | Filtro | Dependencia externa / no desarrollar |  
| Responsibility | \`is\_active\` | no especificado | query/response | Filtrar activas | Dependencia externa / no desarrollar |  
| ResponsibilityMember | \`member\_id\` | no especificado | response | Asignados a responsabilidad | Dependencia externa / no desarrollar |  
| ResponsibilityMember | \`display\_name\` | no especificado | response | Nombre visible | Dependencia externa / no desarrollar |  
| ResponsibilityMember | \`is\_primary\` | no especificado | default false | Badge responsable principal | Dependencia externa / no desarrollar |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \---- | \----------------------- | \------ | \------------- |  
| Crear tarea sin \`responsibility\_id\` | \`400\`, \`responsibility\_id is required\` | TC-T2 / Apéndice | REAL MÍNIMO |  
| Niño crea tarea | \`403\`, RLS bloquea INSERT | TC-T3 | REAL MÍNIMO |  
| Adolescente crea tarea propia | \`201\` | TC-T4 | REAL MÍNIMO |  
| Adolescente crea tarea para otro | \`403\`, RLS bloquea | TC-T5 | REAL MÍNIMO |  
| Completar tarea asignada pendiente | \`200\`, dispara \`task.completed\` | TC-T6 | REAL MÍNIMO |  
| Completar tarea ya completada | \`409\`, \`task\_already\_completed\`, muestra quién completó primero y cuándo | TC-T7 / EC-2 | REAL MÍNIMO |  
| Race condition al completar tarea | Primera escritura gana; segunda recibe 409; mitigación \`SELECT FOR UPDATE\` | EC-2 | REAL MÍNIMO |  
| Verificar tarea completada con \`requires\_verification=true\` | \`200\`, \`task.verified\`, notificación al asignado | TC-T8 | REAL MÍNIMO |  
| Verificar tarea no completada | \`409\`, \`task\_not\_completed\` | TC-T9 / verify endpoint | REAL MÍNIMO |  
| Tareas vencidas | Overdue se calcula; no es estado de tarea | Business rules comprensión | REAL MÍNIMO |  
| Miembro con 3+ tareas overdue día 3 | Notificación \`task\_escalation\` nivel 1 | TC-T10 | POST\_MVP |  
| Sin respuesta 5 días tras escalamiento | Notificación al coordinator sobre carga acumulada | TC-T11 | POST\_MVP |  
| Tarea recurrente con día inexistente | Ajusta al último día del mes; notifica ajuste | EC-11 | POST\_MVP |  
| Dependencia circular | \`409\`, \`circular\_dependency\`; BFS/DFS | EC-16 | POST\_MVP |  
| Responsabilidad sin miembros activos | Tareas existentes se preservan; nuevas tareas requieren \`assigned\_to\` explícito; Geni sugiere reasignar | EC-17 | MIXTO: dependencia real \+ sugerencia Geni POST\_MVP |  
| Crear evento con participantes | \`201\`, notificación a participantes, visible en calendario | TC-C1 | REAL para evento visible; participantes POST\_MVP |  
| Evento solapado | Geni dispara \`event.conflict\_detected\` async | TC-C2 | POST\_MVP |  
| Cancelar evento inminente | \`200\`, dispara \`event.cancelled\` con prioridad alta, push inmediato | TC-C3 | REAL para cancelación; push real POST\_MVP |  
| Recordatorio de evento | CRON dispara \`event.reminder\_due\`, push \+ email | TC-C4 | POST\_MVP |  
| Evento recurrente con modificación de instancia | EXDATE, radio buttons “Solo esta / Esta y siguientes / Todas” | EC-7 | POST\_MVP |  
| Estado vacío Task List | No encontrado | No aplica | FALTANTE |  
| Estado vacío Calendar | No encontrado | No aplica | FALTANTE |  
| Loading / skeleton / spinner | No encontrado | No aplica | FALTANTE |  
| Toast success/error visual | No encontrado | No aplica | FALTANTE |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* \`responsibility\_id\` es obligatorio para crear tareas.  
\* \`title\` es obligatorio para crear tareas.  
\* \`starts\_at\` es obligatorio para crear eventos.  
\* RLS filtra por \`household\_id\` del miembro autenticado.  
\* \`visibility='household'\` permite ver a miembros del hogar.  
\* \`visibility='personal'\` solo visible para \`assigned\_to\` y \`created\_by\` en tasks; en events solo para \`created\_by\`.  
\* DELETE aplica soft-delete con \`deleted\_at=now()\`.  
\* Papelera 30 días como regla general del documento.  
\* \`created\_by\` o \`coordinator\` pueden eliminar tareas/eventos.  
\* \`assigned\_to\` puede marcar completada una tarea.  
\* Adulto o Coordinador pueden verificar tareas.  
\* Niños no pueden crear tareas.  
\* Adolescente solo puede crear tarea propia.  
\* Adulto, Coordinador, Senior y Adolescente pueden crear eventos.  
\* \`GET /events\` requiere rango de fechas por rendimiento.  
\* Completar una tarea ya completada debe manejar race condition.  
\* Verificar tarea no completada debe fallar.  
\* Geni no puede marcar tareas como completadas automáticamente, según regla del archivo de comprensión.  
\* Home no administra: solo resume y redirige.  
\* Usuario no puede cambiar Home como punto de entrada inicial.  
\* RRULE, EXDATE y excepciones avanzadas quedan POST\_MVP para este fragment.  
\* Comentarios, adjuntos, dependencias, templates CRUD, streaks, goals, milestones quedan POST\_MVP o fuera de este fragment.  
\* No desarrollar Feed real aunque el documento mencione post al completar tarea.  
\* No desarrollar Geni real aunque el documento mencione conflictos o sugerencias.  
\* No desarrollar notificaciones reales/push/email aunque los test cases las mencionen.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \----- | \-------------------------- | \------- |  
| UI explícita de Planner | Codex necesitaría saber layout, secciones, jerarquía visual | Riesgo de inventar pantalla |  
| Tabs internos de Planner | El prompt pide visual/interactivo; el documento no define tabs Tasks/Calendar/etc. | Requiere decisión posterior |  
| Vista Día/Semana/Mes | El MVP pide vistas calendario, pero el documento solo define \`GET /events\` por rango | Requiere otra fuente o decisión de merge |  
| Mostrar tareas con fecha en calendario | El documento tiene \`due\_date\`/\`due\_time\`, pero no explicita render en Calendar | Requiere validación posterior |  
| Endpoint calendario combinado | No hay endpoint events+tasks | Service debe componerse en otra etapa o usar endpoints separados |  
| Estado vacío de tareas | Necesario para demo usable sin datos | No encontrado |  
| Estado vacío de calendario | Necesario para demo usable sin eventos | No encontrado |  
| Loading/skeleton/spinner | Feedback inmediato visual | No encontrado |  
| Toast success/error | Feedback tras crear/completar/cancelar | No encontrado |  
| Enum completo de priority | Solo aparece default \`medium\` | No se pueden construir filtros completos sin inventar |  
| Enum completo de task status | Aparecen \`pending\`, \`in\_progress\`, \`completed\`, \`cancelled\`; prompt MVP espera \`pending\`, \`completed\`, \`awaiting\_verification\`, \`verified\` | Contradicción de estados |  
| \`awaiting\_verification\` y \`verified\` como status | Documento usa \`verified\_by\`/\`verified\_at\`, no status \`verified\` | Requiere decisión de merge |  
| Templates predefinidas MVP | El documento define CRUD templates, no constantes “Limpieza/Compras/Mascotas/Medicación/Estudios/Pagos” | No se pueden extraer datos de templates desde esta fuente |  
| Recurrencia simple \`none/daily/weekly/monthly\` | Documento usa \`recurrence\_rule\` y \`recurrence\_end\`, no enum simple | Requiere recorte/normalización posterior |  
| Acción Quick Actions para crear task/event | QuickActions existe, pero no hay acción Planner concreta | Falta conexión demo rápida |  
| Home card concreta de Planner | Home resume tasks/events, pero no hay card layout ni copy | Falta UI para conexión Home |  
| Service mock/local explícito | No hay mención a AsyncStorage ni mock Planner | Codex necesitaría decisión externa si no hay backend |  
| Datos demo concretos de tareas | No hay títulos familiares concretos salvo estructura de test | Demo puede quedar genérica |  
| Datos demo concretos de eventos | Solo aparece “Clase de piano” en caso POST\_MVP | Demo puede quedar genérica |  
| Permiso de Senior para verificar | Verify endpoint dice Adulto o Coordinador; Senior crea tasks/events pero no verifica | Requiere no asumir |  
| Timezone para calendario | Household tiene timezone, pero events no detallan conversión | Puede afectar calendario |  
| Restaurar soft-delete | DELETE soft-delete existe, pero no se define restore | No implementar restauración |  
| Confirmación visual al eliminar | No encontrada | Requiere diseño posterior |  
| Confirmación visual al cancelar evento | No encontrada salvo status/cancelled | Requiere diseño posterior |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Documento principal**

Archivo:

\* \`HomePlus — Api \+ TestCases \+ Edgecases V1(2).md\`

Secciones usadas:

\* \`\# PARTE 1: API Contracts\`.  
\* \`\#\# Convenciones Generales\`.  
\* \`\#\# 2\. Planner\`.  
\* \`\#\#\# 2.1 Tasks\`.  
\* \`\#\#\# 2.2 Task Templates\`.  
\* \`\#\#\# 2.3 Events\`.  
\* \`\#\#\# 2.5 Responsibilities\`.  
\* \`\#\#\# 2.6 Streaks\`.  
\* \`\# PARTE 2: Realtime Events (Supabase Realtime / Broadcast)\`.  
\* \`\# PARTE 3: Test Cases\`.  
\* \`\#\# Tasks\`.  
\* \`\#\# Events\`.  
\* \`\# PARTE 4: Edge Cases — Top 20\`.  
\* \`EC-2 Tasks\`.  
\* \`EC-7 Calendar\`.  
\* \`EC-11 Tasks\`.  
\* \`EC-16 Tasks\`.  
\* \`EC-17 Planner\`.  
\* \`\# APÉNDICE: Verificación de Consistencia\`.  
\* \`\#\# Campos NOT NULL cubiertos en API\`.  
\* \`\#\# Roles y permisos verificados contra FinalSpec V1\`.

**\#\#\# Archivo de comprensión asociado**

Archivo:

\* \`Api \+ Testcases \+ Edge cases v1(2).txt\`

Secciones / outputs usados:

\* \`OUTPUT 1 — ENTITIES\`.  
\* \`OUTPUT 2 — RELATIONSHIPS\`.  
\* \`OUTPUT 5 — BUSINESS RULES\`.  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.  
\* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`.

**\#\#\# Source map del mismo documento**

Archivo:

\* \`source\_map\_HomePlus\_Api\_TestCases\_Edgecases\_V1\_2.md\`

Secciones usadas:

\* \`4.7 PLANNER\`.  
\* \`4.8 TASKS\`.  
\* \`4.9 EVENTS\`.  
\* \`4.10 CALENDAR\`.  
\* \`4.11 HOME\` como dependencia directa para Home summaries.  
\* Mapas de entidades, relaciones, flujos, APIs, UI, estados, permisos, edge cases y faltantes relacionados con Planner.

**\# PLANNER fragment — HomePlus — Design System V2**

\> Fragment crudo de implementación visual/interactiva.  
\> Fuente única: documento principal \`HomePlus — Desing system v1(1).md\`, archivo de comprensión \`Design system v1(1).txt\` y \`source\_map\_HomePlus\_Design\_System\_V2.md\` generado para este mismo documento.  
\> No fusionar con otros documentos.

**\---**

**\#\# 1\. Rol del módulo en la demo**

\* \`Planner\` aparece como módulo de navegación y como núcleo operativo del hogar.  
\* \`Planner\` agrupa internamente:  
  \* \`Tasks\`.  
  \* \`Calendar\`.  
  \* \`Goals\`.  
\* Para este fragment MVP visual/interactivo:  
  \* \`Tasks\` y \`Calendar\` son extraíbles para demo.  
  \* \`Goals\` aparece dentro de Planner, pero queda **\*\*POST\_MVP / no desarrollar en este fragment\*\***.  
\* \`Responsabilidades\` aparece como eje organizador interno de \`Tasks\`.  
\* \`Tasks\` aparece como gestión de tareas con dependencias, recurrencias, subtareas y verificación, pero varias de esas capacidades quedan **\*\*POST\_MVP\*\*** para este fragment.  
\* \`Calendar\` aparece como gestión de eventos familiares y personales.  
\* Planner tiene lugar propio en la navegación principal: \`Home | People | \+ | Planner | More\`.  
\* Planner no vive en More.  
\* El módulo debe sentirse integrado al ecosistema porque Home muestra tareas/eventos y conduce al módulo que administra esa información.  
\* El documento aporta principalmente UI, navegación, componentes, feedback y reglas de interacción. No aporta contratos backend completos.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Navegación principal**

\* Bottom Navigation congelada V1:  
  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Planner usa ícono \`📋\` en Bottom Nav.  
\* Planner es visible para todos.  
\* Estado visual de tab:  
  \* activo: ícono filled, texto \`prim-600\`, peso \`600\`;  
  \* inactivo: ícono outline, texto \`text-tertiary\`, peso \`400\`.  
\* Badge sobre tab:  
  \* \`badge sm\` anclado top-right del ícono;  
  \* solo \`success\` o \`alert\` en Bottom Nav;  
  \* nunca \`error\` en Bottom Nav;  
  \* siempre texto \+ color, nunca solo color.  
\* Tap en tab activo:  
  \* scroll to top;  
  \* refresh de pantalla actual.

**\#\#\#\# Navegación interna de Planner**

\* \`TabBar\` para subsecciones internas de dominio.  
\* Uso explícito:  
  \* \`Planner: Tasks | Calendar | Goals\`.  
\* Altura: \`44px\`.  
\* Indicador activo:  
  \* \`3px prim-500\`;  
  \* \`radius-full\`;  
  \* animado con slide.  
\* Tab activo:  
  \* \`text prim-600\`;  
  \* \`weight 600\`.  
\* Tab inactivo:  
  \* \`text text-tertiary\`;  
  \* \`weight 400\`.  
\* Máximo 5 tabs por dominio.  
\* \`Goals\` queda como tab presente en la estructura de diseño, pero **\*\*POST\_MVP / no desarrollar lógica\*\***.

**\#\#\#\# Estructura de archivos/rutas detectada**

\* \`app/(tabs)/\_layout.tsx\` — Bottom Nav: \`Home | People | \+ | Planner | More\`.  
\* \`app/(tabs)/planner/\_layout.tsx\` — Tab Bar: \`Tasks | Calendar | Goals\`.  
\* \`app/(tabs)/planner/tasks.tsx\` — sección Tasks.  
\* \`app/(tabs)/planner/calendar.tsx\` — sección Calendar.  
\* \`app/(tabs)/planner/goals.tsx\` — aparece en estructura, pero queda **\*\*POST\_MVP / no desarrollar en este fragment\*\***.

**\#\#\#\# FAB / acción principal**

\* FAB es acción principal de creación.  
\* Posición: esquina inferior derecha, zona de pulgar.  
\* Diámetro normal: \`56px\`.  
\* Diámetro Adulto Mayor: \`64px\`.  
\* Fondo: \`prim-500\`.  
\* Texto/icono: blanco.  
\* Sombra: \`elevated\`.  
\* Ícono: \`+\`.  
\* Visible en:  
  \* \`Tasks (Planner) → Crear tarea\`.  
  \* \`Calendar (Planner) → Crear evento\`.  
\* No visible en Home.  
\* Acción principal siempre debe estar en zona de pulgar.

**\#\#\#\# Tasks visual**

\* Acción principal de Tasks: checkbox 1-tap.  
\* Tarea se completa con un solo toque en el checkbox, sin abrir detalle.  
\* Checkbox:  
  \* tamaño visual normal: \`24×24px\`;  
  \* touch target normal: \`44×44px\`;  
  \* borde \`divider-strong 1.5px\`;  
  \* radio \`radius-sm 6px\`.  
\* Checkbox Adulto Mayor:  
  \* \`32×32px\`;  
  \* touch target \`56×56px\`.  
\* Estados visuales del checkbox:  
  \* \`Unchecked\`: borde \`divider-strong\`, fondo transparente.  
  \* \`Pressed\`: fondo \`prim-50\`, borde \`prim-300\`, feedback inmediato \`\<100ms\`.  
  \* \`Checked\`: fondo \`success-500\`, borde \`success-500\`.  
\* Checked muestra ícono check blanco \`14px\`.  
\* Al completar:  
  \* háptico \`light\`;  
  \* título de tarea tachado;  
  \* color de título \`text-tertiary\`;  
  \* animación \`fill 300ms ease-out\`;  
  \* animación \`scale 0.9→1.0 200ms ease-out\`.  
\* Regla validación UX:  
  \* acción principal de Tasks \= checkbox 1-tap;  
  \* no abrir detalle para completar.

**\#\#\#\# Listas / items**

\* \`ListItem\` base:  
  \* leading \+ título \+ trailing;  
  \* subtítulo debajo.  
\* Altura:  
  \* estándar \`56px\`;  
  \* compacto \`48px\`.  
\* Padding horizontal: \`20px\`.  
\* Gap leading-contenido: \`12px\`.  
\* Touch target mínimo: \`44px\`.  
\* Adulto Mayor:  
  \* altura \`64px\`;  
  \* touch target \`56px\`.  
\* Leading posible relevante para Planner:  
  \* \`Checkbox\`;  
  \* \`Avatar\`;  
  \* \`Icon\`.  
\* Trailing posible relevante para Planner:  
  \* \`Badge\`;  
  \* \`Chip\`;  
  \* \`chevron\`.  
\* Estados del list item:  
  \* default: fondo transparente;  
  \* pressed: \`bg prim-50\`, feedback inmediato \`\<100ms\`;  
  \* selected: \`bg prim-50 \+ borde izquierdo 3px prim-500\`;  
  \* disabled: \`opacity 0.5\`.  
\* Separador:  
  \* \`1px divider\`;  
  \* indentado al contenido, no al leading;  
  \* o sin separador entre grupos lógicos.

**\#\#\#\# Chips / filtros**

\* Chips son seleccionables y accionables para filtros de dominio.  
\* Variantes:  
  \* default;  
  \* outline.  
\* Estado selected:  
  \* fondo \`prim-500\`;  
  \* texto blanco;  
  \* borde \`prim-500\`.  
\* Estado default:  
  \* fondo \`prim-50\`;  
  \* texto \`prim-600\`;  
  \* borde \`prim-200\`.  
\* Tamaños:  
  \* \`sm\`: altura \`28px\`, padding horizontal \`10px\`, fuente \`caption\`, radio \`radius-sm\`;  
  \* \`md\`: altura \`32px\`, padding horizontal \`12px\`, fuente \`body S\`, radio \`radius-sm\`.  
\* El documento no define nombres concretos de filtros para la pantalla Planner en el documento principal.

**\#\#\#\# Badges**

\* Badges son indicadores de estado no interactivos.  
\* Variantes disponibles:  
  \* Success;  
  \* Warning;  
  \* Error;  
  \* Info;  
  \* Neutral.  
\* Tamaños:  
  \* \`sm\`: altura \`20px\`, padding horizontal \`8px\`, fuente \`label\`, dot \`6px\`;  
  \* \`md\`: altura \`24px\`, padding horizontal \`10px\`, fuente \`caption\`, dot \`8px\`.  
\* Regla de accesibilidad:  
  \* siempre texto \+ color;  
  \* ejemplo de \`accessibilityLabel\`: \`\[N\] tareas pendientes\`.

**\#\#\#\# Cards aplicables**

\* Card estándar:  
  \* \`bg surface-card\`;  
  \* \`radius-md 12px\`;  
  \* padding \`16px\`;  
  \* sombra \`0px 2px 8px rgba(0,0,0,0.06)\`;  
  \* borde ninguno por defecto u opcional \`1px divider-strong\`.  
\* Card destacada:  
  \* para Briefing, Atención Requerida, Reconocimiento;  
  \* \`border-left 4px prim-500\`;  
  \* sombra \`0px 4px 16px rgba(193,127,89,0.12)\`.  
\* Card alerta:  
  \* contexto de atención/vencimiento;  
  \* \`bg alert-100\`;  
  \* \`border-left 4px alert-500\`;  
  \* acción principal en \`prim-600\`.  
\* Regla de cards:  
  \* no más de 1 acción primaria por card;  
  \* acciones secundarias como ghost button o link text.

**\#\#\#\# Bottom Sheet para crear/editar**

\* Bottom Sheet es la opción principal mobile para crear/editar.  
\* Sirve para:  
  \* crear/editar tarea;  
  \* crear/editar evento;  
  \* filtros simples si aplica.  
\* Estructura visual:  
  \* drag handle \`32×4px\`, color \`divider\`;  
  \* título \`H3 text-primary\`;  
  \* contenido;  
  \* footer sticky con \`\[Acción secundaria\] \[Acción primaria\]\`.  
\* Fondo: \`surface-card\`.  
\* Radio superior: \`radius-lg 16px\`.  
\* Padding: \`24px\`.  
\* Overlay: \`surface-overlay\`.  
\* Backdrop: blur \`4px\` si el SO lo soporta.  
\* Alturas:  
  \* \`25%\` quick actions / confirmaciones simples;  
  \* \`50%\` formularios simples / filtros;  
  \* \`75%\` formularios complejos / listas;  
  \* \`90%\` casi full screen / edición detallada.  
\* Animación:  
  \* entrada \`slide-up \+ fade-in 300ms ease-out\`;  
  \* salida \`slide-down \+ fade-out 200ms ease-in\`;  
  \* overlay \`fade-in 300ms / fade-out 200ms\`.

**\#\#\#\# Modal de confirmación**

\* Modal centrado solo para confirmaciones con consecuencia.  
\* Aplicable a eliminación de tarea/evento si se implementa esa acción visual.  
\* Estructura:  
  \* ícono contextual \`48px\`;  
  \* título \`H3 center\`;  
  \* descripción opcional \`body text-secondary\`;  
  \* \`\[Cancelar\] \[Confirmar\]\`.  
\* Fondo: \`surface-card\`.  
\* Radio: \`radius-lg 16px\`.  
\* Padding: \`24px\`.  
\* Max-width: \`320px\`.  
\* Gap: \`16px\`.  
\* Overlay: \`surface-overlay\`.  
\* Animación: \`scale(0.95→1) \+ fade-in 250ms ease-out\`.  
\* Prohibición:  
  \* nunca para formularios;  
  \* nunca para navegación entre niveles.

**\#\#\#\# Progress Bar**

\* ProgressBar aparece para tareas / Goals con color \`prim-500\`.  
\* Track: \`bg-secondary\`, altura \`6px\`, \`radius-full\`.  
\* Fill: \`prim-500\`, altura \`6px\`, \`radius-full\`.  
\* Transición: \`width 600ms ease-out\`.  
\* Regla emocional:  
  \* nunca muestra “atraso” o “deuda” visual;  
  \* si alguien está atrasado en una tarea, se muestra como “pendiente” sin color de error;  
  \* color de error solo en bloqueos reales.  
\* Para este fragment:  
  \* ProgressBar puede inspirar progreso visual de tareas si hay datos;  
  \* Goals queda **\*\*POST\_MVP\*\***.

**\#\#\#\# Empty State**

\* Empty State es la primera experiencia por dominio.  
\* Estructura:  
  \* ilustración sutil \`120px\`, tint \`prim-100\`;  
  \* título \`H3 text-primary\`;  
  \* descripción \`body text-secondary\`;  
  \* acción sugerida con botón secondary o ghost.  
\* Copy explícito para Tasks:  
  \* título: \`Acá van a aparecer tus tareas\`.  
  \* descripción: \`Cuando alguien te asigne una tarea, la vas a ver acá.\`  
\* Empty state funciona como tutorial implícito.  
\* No usar tooltips.  
\* No usar carruseles de features.  
\* Conexión implícita en archivo de comprensión:  
  \* \`EmptyState\` puede sugerir \`FabButton\` para primera acción.

**\#\#\#\# Skeleton / Loading**

\* Skeleton aparece cuando los datos tardan más de \`300ms\` en cargar.  
\* Card skeleton con fondo \`prim-50\`.  
\* Animación pulse:  
  \* opacidad \`0.3 → 0.6 → 0.3\`;  
  \* ciclo \`1.5s ease-in-out\`.  
\* Transición a contenido:  
  \* fade-in \`300ms\`;  
  \* skeletons se disuelven.

**\#\#\#\# Pantallas Home que exponen Planner como dependencia externa**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Home — Coordinador muestra card de tareas agrupadas:  
  \* \`Mis pendientes (2)\`;  
  \* agrupación \`Compras\`;  
  \* tareas con checkbox 1-tap.  
\* Home — Coordinador muestra próximos eventos:  
  \* card \`📅 Sábado: Asado familiar\`;  
  \* hora y participantes.  
\* Home — Adulto Mayor muestra eventos:  
  \* \`📅 Miércoles: Control médico\`;  
  \* \`10:30 · Clínica Familiar\`.  
\* Home resume información y debe conducir al módulo correspondiente.

**\---**

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Datos explícitos para tareas**

| Dato encontrado | Contexto | Uso posible en demo | Clasificación |  
| \--- | \--- | \--- | \--- |  
| \`Mis pendientes (2)\` | Home Coordinador | título/resumen de tareas pendientes | DEMO PREMIUM / dependencia Home |  
| \`Compras\` | agrupación de tareas en Home | responsabilidad/grupo visual | REAL parcial / demo |  
| \`Comprar leche y pan\` | tarea visible en Home | tarea mock de lista | DEMO PREMIUM |  
| \`Pagar servicios\` | tarea visible en Home | tarea mock de lista | DEMO PREMIUM |  
| \`tareas pendientes/vencidas\` | flujo de datos hacia Home \> Atención Requerida | filtro o resumen de tareas urgentes | REAL parcial |  
| \`Lista de tareas con prioridad, responsable y fecha\` | flujo de datos hacia Home \> Atención Requerida | datos mínimos para cards/lista | REAL parcial, campos sin tipo |  
| \`Tareas por responsable\` | flujo de datos hacia Home \> Carga Familiar | resumen por miembro | MOCK / dependencia Home |  
| \`Distribución de carga semanal\` | Home \> Carga Familiar | dato de balance de tareas | MOCK / dependencia Home |  
| \`Checkbox 1-tap \+ timestamp\` | flujo Usuario completa tarea → Planner \> Tasks | dato de completado local | REAL parcial |

**\#\#\#\# Responsabilidades / categorías explícitas**

| Dato encontrado | Contexto | Uso posible en demo | Clasificación |  
| \--- | \--- | \--- | \--- |  
| \`Responsabilidades\` | eje organizador de Tasks | agrupación de tareas | REAL parcial |  
| \`Compras\` | responsabilidad tipo | categoría visible | REAL parcial / demo |  
| \`Mascotas\` | responsabilidad tipo | categoría visible | REAL parcial / demo |  
| \`Limpieza\` | responsabilidad tipo | categoría visible | REAL parcial / demo |  
| \`Vehículos\` | responsabilidad tipo | categoría visible | POST\_MVP / puede ser categoría visual si ya aparece |

**\#\#\#\# Datos explícitos para eventos**

| Dato encontrado | Contexto | Uso posible en demo | Clasificación |  
| \--- | \--- | \--- | \--- |  
| \`Sábado: Asado familiar\` | Home Coordinador \> Próximos Eventos | evento mock | DEMO PREMIUM |  
| \`14:00 · Participan 5 personas\` | Home Coordinador \> Próximos Eventos | hora \+ participantes | DEMO PREMIUM |  
| \`Miércoles: Control médico\` | Home Adulto Mayor \> Eventos | evento mock | DEMO PREMIUM |  
| \`10:30 · Clínica Familiar\` | Home Adulto Mayor \> Eventos | hora \+ lugar | DEMO PREMIUM |  
| \`Evento con fecha, participantes, ubicación\` | flujo Calendar → FamilyCloud | campos visibles de evento | REAL parcial / POST\_MVP para integración externa |

**\#\#\#\# Datos temporales / estados visibles**

| Dato encontrado | Uso posible | Clasificación |  
| \--- | \--- | \--- |  
| \`pendiente\` | mostrar tarea atrasada sin error visual | REAL parcial |  
| \`vencida\` | condición calculada, no estado | REAL parcial |  
| \`checked\` | estado visual de checkbox | REAL visual |  
| \`unchecked\` | estado visual de checkbox | REAL visual |  
| \`pressed\` | feedback inmediato | REAL visual |  
| \`selected\` | estado de ListItem / Chip | REAL visual |  
| \`disabled\` | estado de ListItem / Input/Button | REAL visual |

**\---**

**\#\#\# 2.3 Acción interactiva**

| Acción encontrada | Dónde aparece | Resultado visible | Clasificación |  
| \--- | \--- | \--- | \--- |  
| Crear tarea | FAB visible en Tasks | abre creación desde acción principal | REAL parcial, sin formulario/API |  
| Crear tarea | Quick Actions | acción rápida desde botón \`+\` central | REAL parcial / dependencia externa |  
| Crear evento | FAB visible en Calendar | abre creación desde acción principal | REAL parcial, sin formulario/API |  
| Crear evento | Quick Actions | acción rápida desde botón \`+\` central | REAL parcial / dependencia externa |  
| Ver pendientes | Quick Actions | acceso a pendientes | REAL parcial / dependencia externa |  
| Completar tarea | Checkbox 1-tap | checked \+ tachado \+ háptico \+ animación | REAL visual |  
| Editar tarea | Bottom Sheet crear/editar | edición en contexto | REAL parcial, campos no definidos |  
| Editar evento | Bottom Sheet crear/editar | edición en contexto | REAL parcial, campos no definidos |  
| Eliminar tarea | Modal de confirmación | cancelar/confirmar | REAL parcial, sin API |  
| Eliminar evento | Modal de confirmación | cancelar/confirmar | REAL parcial, sin API |  
| Cambiar tab interna | TabBar Tasks/Calendar/Goals | indicador activo cambia con slide | REAL visual |  
| Refrescar pantalla actual | tap en tab activo de Bottom Nav | scroll to top \+ refresh | REAL visual |  
| Filtrar | Chips de dominio | chip selected/unselected | REAL visual, filtros no nombrados |  
| Abrir perfil por avatar | Avatar | perfil de persona | Dependencia externa / no desarrollar en este fragment |  
| Buscar Tasks | SearchGlobal busca Tasks | resultados agrupados / acción ejecutable | Dependencia externa / no desarrollar en este fragment |

**\#\#\#\# Acciones por rol encontradas en archivo de comprensión**

| Rol | Acción Planner encontrada | Clasificación | Nota |  
| \--- | \--- | \--- | \--- |  
| Adulto | puede crear tareas | REAL parcial | permisos incompletos; no extrapolar backend |  
| Adulto | puede reasignar | REAL parcial | permisos incompletos; no hay contrato |  
| Adolescente | crea tareas propias | REAL parcial | permisos ampliables; no hay detalle técnico |  
| Adolescente | crea eventos | REAL parcial | no hay contrato de Calendar |  
| Niño | solo completa tareas | REAL parcial / visual | experiencia simplificada |  
| Adulto Mayor | experiencia adaptada: fuente grande, alto contraste, sin gestos complejos | REAL visual | afecta Tasks/Calendar UI |

**\---**

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Feedback de botones**

\* Todo tap en botón recibe háptico:  
  \* iOS: \`light\`;  
  \* Android: \`clockTick\`.  
\* Adulto Mayor:  
  \* háptico \`medium\`.  
\* Loading de botón:  
  \* mantiene ancho;  
  \* texto se reemplaza por spinner;  
  \* botón permanece visualmente en estado active;  
  \* mínimo \`400ms\` de loading para evitar flicker;  
  \* spinner aparece solo si operación \`\>300ms\`.

**\#\#\#\# Feedback de checkbox de tarea**

\* Feedback inmediato \`\<100ms\` en pressed.  
\* Checked:  
  \* fondo \`success-500\`;  
  \* borde \`success-500\`;  
  \* check blanco;  
  \* título tachado;  
  \* texto \`text-tertiary\`;  
  \* háptico \`light\`;  
  \* animación fill \+ scale.

**\#\#\#\# Toast**

\* Toast aparece arriba, nunca abajo.  
\* No compite con Bottom Nav ni acciones inferiores.  
\* Duración default: \`4s\`.  
\* Adulto Mayor: \`8s\`.  
\* Variantes:  
  \* Success;  
  \* Alert;  
  \* Error;  
  \* Info.  
\* Máximo 1 toast visible a la vez.  
\* Si llega otro, el actual se descarta.  
\* Nunca toast para tareas completadas por otros miembros.  
\* Toast con \`Deshacer\` dura \`5s\`.  
\* Deshacer se usa como ventana de reversión para completado.

**\#\#\#\# Modal / eliminación**

\* Toda eliminación requiere confirmación.  
\* Modal solo para confirmaciones con consecuencia.  
\* Eliminar es grave; completar es cotidiano y debe tener deshacer.

**\#\#\#\# Skeleton / carga**

\* Skeleton si datos tardan \`\>300ms\`.  
\* Pulse animation.  
\* Fade-in al contenido.

**\#\#\#\# Empty state**

\* Empty state como tutorial implícito.  
\* Acción sugerida con botón secondary o ghost.  
\* No tooltips.  
\* No carruseles.

**\#\#\#\# Motion / senior**

\* Modo Adulto Mayor respeta \`prefers-reduced-motion\`.  
\* Si el SO pide reducción, animaciones se eliminan.  
\* Adulto Mayor evita gestos complejos.

**\---**

**\#\#\# 2.5 Service aislado**

No se encontró contrato explícito de service ni nombres de funciones.

Pistas extraíbles para un service local/mock o aislado:

| Dato/acción | Qué debería entregar/ejecutar según documento | Clasificación |  
| \--- | \--- | \--- |  
| Lista de tareas | tareas con prioridad, responsable y fecha para Home \> Atención Requerida | REAL parcial / campos sin tipo |  
| Tareas pendientes/vencidas | resumen para Atención Requerida | REAL parcial |  
| Tareas por responsable | distribución semanal para Carga Familiar | MOCK / dependencia Home |  
| Completar tarea | \`Checkbox 1-tap \+ timestamp\` hacia Planner \> Tasks | REAL parcial |  
| Crear tarea | acción desde FAB o Quick Actions | REAL parcial, sin contrato |  
| Crear evento | acción desde FAB o Quick Actions | REAL parcial, sin contrato |  
| Eventos próximos | eventos con fecha, hora, participantes y ubicación si aparecen | REAL parcial / demo |  
| Home summary | Home consume tareas/eventos, pero no administra | Dependencia externa |

Restricciones para service:

\* No se encontraron endpoints.  
\* No se encontraron request/response.  
\* No se encontraron nombres de métodos.  
\* No se encontraron tipos de campos.  
\* Para demo puede ser local/mock, pero el documento no define implementación.

**\---**

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Entrada principal**

\* Planner se entra desde Bottom Nav.  
\* Planner no vive en More.  
\* Calendar no es tab principal; vive dentro de Planner.  
\* Tasks no es tab principal independiente; vive dentro de Planner.  
\* Goals vive dentro de Planner, pero queda **\*\*POST\_MVP\*\*** para este fragment.

**\#\#\#\# Bottom Nav**

\`\`\`txt  
\[ Home \] \[ People \] \[ \+ \] \[ Planner \] \[ More \]  
\`\`\`

\* Estructura oficial inmutable.  
\* No modificar sin enmienda a la Final Spec.  
\* Planner destino:  
  \* \`Planner (§24.08)\`;  
  \* contenido principal: \`Tasks, Calendar, Goals\`;  
  \* visible para todos.

**\#\#\#\# Quick Actions**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* El botón \`+\` central abre panel flotante.  
\* Quick Actions tiene Geni fijo primero.  
\* Acciones relacionadas con Planner:  
  \* Crear tarea;  
  \* Crear evento;  
  \* Ver pendientes.  
\* Orden:  
  \* fijadas por usuario;  
  \* más usadas por frecuencia \+ recencia;  
  \* menos usadas.

**\#\#\#\# Navegación interna**

\* Planner usa Tab Bar interna:  
  \* \`Tasks | Calendar | Goals\`.  
\* Máximo 5 tabs por dominio.  
\* No crear un tab separado de Calendar en Bottom Nav.

**\#\#\#\# Progressive Disclosure**

\* 4 niveles:  
  \* Home → Dominio → Detalle → Configuración avanzada.  
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo:  
  \* 95% de acciones en ≤3 niveles.  
\* Complejidad avanzada nunca visible por defecto.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

**\*\*Dependencia externa / no desarrollar Home en este fragment.\*\***

\* Home contiene enlaces a Planner.  
\* Home contiene enlaces a Calendar.  
\* Home muestra tareas agrupadas.  
\* Home muestra próximos eventos.  
\* Home puede mostrar tareas pendientes/vencidas en Atención Requerida.  
\* Home puede mostrar distribución de tareas por responsable en Carga Familiar.  
\* Home resume información, no la administra.  
\* Toda información mostrada en Home debe conducir al módulo correspondiente.  
\* Home siempre es la pantalla inicial.

**\#\#\#\# More**

\* Planner no vive en More.  
\* More contiene herramientas especializadas Tier 3\.  
\* More no afecta implementación de Planner salvo como contraste de navegación.

**\#\#\#\# Quick Actions**

**\*\*Dependencia externa / no desarrollar Quick Actions en este fragment.\*\***

\* Quick Actions se abre desde el botón \`+\` central.  
\* Acciones extraíbles relacionadas con Planner:  
  \* Crear tarea.  
  \* Crear evento.  
  \* Ver pendientes.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

\* Planner como tab de Bottom Nav.  
\* Estructura de Bottom Nav:  
  \* \`Home | People | \+ | Planner | More\`.  
\* Planner como contenedor de:  
  \* Tasks;  
  \* Calendar;  
  \* Goals solo como tab contextual **\*\*POST\_MVP\*\***, sin lógica.  
\* TabBar interna:  
  \* \`Tasks | Calendar | Goals\`.  
\* Tasks:  
  \* listar visualmente tareas;  
  \* completar tarea con checkbox 1-tap;  
  \* estado visual checked/unchecked/pressed;  
  \* tarea completada con título tachado;  
  \* feedback háptico;  
  \* toast con Deshacer 5s;  
  \* empty state de tareas;  
  \* skeleton loading si carga \>300ms.  
\* Crear tarea:  
  \* FAB en Tasks;  
  \* BottomSheet para crear/editar;  
  \* sin contrato API.  
\* Editar tarea:  
  \* BottomSheet;  
  \* sin campos definidos.  
\* Eliminar tarea:  
  \* Modal centrado de confirmación;  
  \* sin API.  
\* Calendar:  
  \* sección dentro de Planner;  
  \* FAB en Calendar para crear evento;  
  \* crear/editar evento con BottomSheet;  
  \* eliminar evento con Modal si aparece en demo;  
  \* sin vistas día/semana/mes definidas en este documento.  
\* Feedback global:  
  \* botón con loading/spinner si operación \>300ms;  
  \* skeleton \>300ms;  
  \* acciones con feedback \<100ms.

**\#\#\# DEMO PREMIUM**

\* Datos mock extraíbles:  
  \* \`Comprar leche y pan\`;  
  \* \`Pagar servicios\`;  
  \* \`Mis pendientes (2)\`;  
  \* \`Compras\`;  
  \* \`Sábado: Asado familiar\`;  
  \* \`14:00 · Participan 5 personas\`;  
  \* \`Miércoles: Control médico\`;  
  \* \`10:30 · Clínica Familiar\`.  
\* Home puede mostrar snippets de Planner, pero Home no se desarrolla en este fragment.  
\* Carga Familiar usa tareas por responsable y distribución semanal, pero para MVP visual queda como mock externo de Home.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

El documento no menciona AsyncStorage ni service local, pero sí aporta datos/acciones que podrían aislarse en una capa demo sin backend real:

\* lista local de tareas;  
\* lista local de eventos;  
\* completar tarea con timestamp;  
\* filtrar visualmente por estado/categoría si se usan Chips;  
\* crear tarea desde FAB/QuickActions;  
\* crear evento desde FAB/QuickActions;  
\* resumen local de pendientes para Home;  
\* resumen local de próximos eventos para Home.

No se deben inventar nombres de funciones ni endpoints desde este fragment.

**\#\#\# POST\_MVP**

\* Goals dentro de Planner.  
\* Hitos / Milestones.  
\* Dependencias de tareas.  
\* Recurrencias de tareas.  
\* Subtareas.  
\* Verificación como aprobación opcional post-completado, porque el documento dice que no crea estado separado y contradice los estados MVP esperados.  
\* Plantillas reutilizables, porque el documento no define templates MVP constantes ni CRUD.  
\* Adjuntos en tareas.  
\* Comentarios en tareas.  
\* Timeline de tarea.  
\* Automatizaciones que generan tareas.  
\* Integraciones externas que generan tareas.  
\* Auditoría completa de Planner.  
\* Offline sync / cola de sincronización.  
\* Geni real sobre Planner.  
\* FamilyCloud derivado de eventos.  
\* Recap anual con datos de Planner.

**\#\#\# IGNORAR**

\* No desarrollar dominios externos desde este fragment.  
\* No desarrollar Goals como feature real.  
\* No desarrollar IA real.  
\* No desarrollar automatizaciones reales.  
\* No desarrollar auditoría real.  
\* No desarrollar offline sync.  
\* No desarrollar storage/OCR.  
\* No desarrollar presencia GPS ni geocercas.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
| \--- | \--- | \--- | \--- | \--- | \--- |  
| BottomNav | \`Home | People | \+ | Planner | More\` | tocar Planner, tocar tab activo para refresh | active/inactive/badge | navegación principal | REAL MÍNIMO |  
| Planner Tab | entrada principal al módulo | abrir Planner | tab activo/inactivo | BottomNav → Planner | REAL MÍNIMO |  
| Planner TabBar | \`Tasks | Calendar | Goals\` | cambiar sección | active/inactive, indicador slide | dentro de Planner | REAL MÍNIMO / Goals POST\_MVP |  
| Tasks Screen | lista de tareas | crear, completar, editar, eliminar visualmente | empty, skeleton, checkbox states, toast | Planner → Tasks | REAL MÍNIMO |  
| Task ListItem | checkbox \+ título \+ subtítulo/trailing | completar 1-tap, abrir detalle si se decide después | default/pressed/selected/disabled | dentro de Tasks | REAL MÍNIMO |  
| CheckboxTarea | estado de una tarea | completar tarea sin abrir detalle | unchecked/pressed/checked, haptic, tachado | dentro de Task List | REAL MÍNIMO |  
| FAB en Tasks | botón \`+\` | crear tarea | pressed/loading según botón | Tasks | REAL MÍNIMO |  
| Create/Edit Task BottomSheet | formulario no especificado | acción secundaria \+ acción primaria | 50/75/90%, overlay, slide/fade | desde FAB o edición | REAL parcial |  
| Delete Task Modal | confirmación de eliminación | cancelar/confirmar | scale/fade, overlay | desde acción de eliminar | REAL parcial |  
| Calendar Screen | sección Calendar dentro de Planner | crear evento | no define day/week/month | Planner → Calendar | REAL parcial |  
| FAB en Calendar | botón \`+\` | crear evento | pressed/loading según botón | Calendar | REAL MÍNIMO |  
| Create/Edit Event BottomSheet | formulario no especificado | acción secundaria \+ acción primaria | 50/75/90%, overlay, slide/fade | desde Calendar/FAB | REAL parcial |  
| Delete Event Modal | confirmación de eliminación | cancelar/confirmar | scale/fade, overlay | desde acción de eliminar | REAL parcial |  
| Quick Actions Panel | Geni fijo \+ acciones dinámicas Planner | crear tarea, crear evento, ver pendientes | fade \+ slide up, backdrop blur | botón \`+\` central | Dependencia externa |  
| Empty State Tasks | ilustración \+ título \+ descripción \+ acción sugerida | acción sugerida | primera experiencia | Tasks sin datos | REAL visual |  
| Skeleton | cards/lista en carga | no interactivo | pulse, fade-in contenido | carga inicial/refresh | REAL visual |  
| Toast | mensaje breve \+ acción | deshacer completado | success/alert/error/info, top | feedback global | REAL visual |  
| Home Task Card | \`Mis pendientes (2)\`, tareas agrupadas | checkbox 1-tap visible en Home | card/lista | Home → Planner | Dependencia externa |  
| Home Event Card | próximos eventos | abrir Calendar si se conecta | card | Home → Calendar | Dependencia externa |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
| \--- | \--- | \--- | \--- | \--- |  
| \`Mis pendientes (2)\` | Tasks/Home | encabezado de resumen o card | Documento principal §6.1 | DEMO PREMIUM / dependencia Home |  
| \`Compras\` | Tasks | grupo/responsabilidad | Documento principal §6.1 / comprensión OUTPUT 1 | REAL parcial / demo |  
| \`Comprar leche y pan\` | Tasks | tarea visible | Documento principal §6.1 | DEMO PREMIUM |  
| \`Pagar servicios\` | Tasks | tarea visible | Documento principal §6.1 | DEMO PREMIUM |  
| \`Sábado: Asado familiar\` | Events/Calendar | evento visible | Documento principal §6.1 | DEMO PREMIUM |  
| \`14:00 · Participan 5 personas\` | Events/Calendar | hora \+ participantes | Documento principal §6.1 | DEMO PREMIUM |  
| \`Miércoles: Control médico\` | Events/Calendar | evento visible senior | Documento principal §6.2 | DEMO PREMIUM |  
| \`10:30 · Clínica Familiar\` | Events/Calendar | hora \+ ubicación | Documento principal §6.2 | DEMO PREMIUM |  
| \`priority / responsable / fecha\` | Tasks | campos visuales para lista/resumen | Comprensión OUTPUT 4 | REAL parcial, tipos ausentes |  
| \`timestamp\` | Tasks | marca de completado | Comprensión OUTPUT 4 | REAL parcial |  
| \`Compras\` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | REAL parcial |  
| \`Mascotas\` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | REAL parcial |  
| \`Limpieza\` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | REAL parcial |  
| \`Vehículos\` | Responsabilidades | responsabilidad tipo | Comprensión OUTPUT 1 | POST\_MVP / demo visual si se conserva |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
| \--- | \--- | \--- | \--- | \--- |  
| Abrir Planner | Todos | tab Planner activo | REAL MÍNIMO | Documento principal §4.8 |  
| Cambiar a Tasks | Todos | tab Tasks activo | REAL MÍNIMO | Documento principal §4.17 |  
| Cambiar a Calendar | Todos | tab Calendar activo | REAL MÍNIMO | Documento principal §4.17 |  
| Crear tarea | no especificado | FAB abre creación | REAL parcial | Documento principal §4.2 |  
| Crear tarea | no especificado | Quick Actions ofrece acción | REAL parcial / dependencia externa | Documento principal §4.9 |  
| Crear evento | no especificado | FAB abre creación | REAL parcial | Documento principal §4.2 |  
| Crear evento | no especificado | Quick Actions ofrece acción | REAL parcial / dependencia externa | Documento principal §4.9 |  
| Ver pendientes | no especificado | Quick Actions ofrece acceso | REAL parcial / dependencia externa | Documento principal §4.9 |  
| Completar tarea | no especificado | checkbox checked, tachado, háptico, animación | REAL visual | Documento principal §4.6 |  
| Completar tarea | Usuario | checkbox 1-tap \+ timestamp hacia Planner \> Tasks | REAL parcial | Comprensión OUTPUT 4 |  
| Editar tarea | no especificado | BottomSheet crear/editar | REAL parcial | Documento principal §4.11 |  
| Editar evento | no especificado | BottomSheet crear/editar | REAL parcial | Documento principal §4.11 |  
| Eliminar tarea | no especificado | Modal de confirmación | REAL parcial | Documento principal §4.11 / comprensión OUTPUT 5 |  
| Eliminar evento | no especificado | Modal de confirmación | REAL parcial | Documento principal §4.11 / comprensión OUTPUT 5 |  
| Filtrar | no especificado | Chip selected/unselected | REAL visual, filtros no definidos | Documento principal §4.5 |  
| Refresh pantalla | no especificado | scroll to top \+ refresh | REAL visual | Documento principal §4.8 |  
| Crear tareas | Adulto | puede crear tareas | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |  
| Reasignar | Adulto | puede reasignar | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |  
| Crear tareas propias | Adolescente | tareas propias visibles | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |  
| Crear eventos | Adolescente | eventos visibles | REAL parcial, permisos incompletos | Comprensión OUTPUT 1 |  
| Completar tareas | Niño | tarea completada | REAL visual/parcial | Comprensión OUTPUT 1 |  
| Verificar tarea | no especificado | aprobación post-completado | POST\_MVP / contradictorio | Comprensión OUTPUT 1 / source\_map |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Home puede mostrar información de Planner:  
  \* tareas pendientes;  
  \* tareas vencidas;  
  \* tareas agrupadas por responsabilidad;  
  \* próximos eventos.  
\* Home \> Atención Requerida puede recibir:  
  \* tareas pendientes/vencidas;  
  \* lista de tareas con prioridad, responsable y fecha.  
\* Home \> Carga Familiar puede recibir:  
  \* tareas por responsable;  
  \* distribución de carga semanal.  
\* Carga Familiar es visible solo para Coordinador.  
\* Para este fragment:  
  \* tareas/eventos que aparecen en Home sirven como snippets/demo;  
  \* Home no administra tareas ni eventos;  
  \* Home debe conducir al módulo dueño.

**\#\#\# More**

\* Planner no vive en More.  
\* Planner vive en Bottom Nav.  
\* More es solo contraste de navegación para este fragment.  
\* No extraer cards de More para Planner.

**\#\#\# Quick Actions**

**\*\*Dependencia externa / no desarrollar en este fragment.\*\***

\* Quick Actions se abre desde el botón \`+\` central de Bottom Nav.  
\* Panel flotante:  
  \* fondo con blur \`4px\` \+ overlay;  
  \* card \`surface-card\`;  
  \* radio \`radius-lg 16px\`;  
  \* padding \`8px\`;  
  \* animación \`fade in \+ slide up 200ms ease-out\`.  
\* Geni es slot fijo primero, pero IA real no se desarrolla en este fragment.  
\* Acciones Planner encontradas:  
  \* Crear tarea;  
  \* Crear evento;  
  \* Ver pendientes.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
| \--- | \--- | \--- | \--- | \--- | \--- | \--- |  
| Listar tareas | No encontrado | No encontrado | No encontrado | No encontrado | acción necesaria para UI, sin contrato | Información faltante |  
| Crear tarea | No encontrado | No encontrado | No encontrado | No encontrado | acción mencionada sin contrato API | REAL parcial |  
| Editar tarea | No encontrado | No encontrado | No encontrado | No encontrado | acción mencionada sin contrato API | REAL parcial |  
| Completar tarea | No encontrado | No encontrado | No encontrado | No encontrado | acción UI definida; sin contrato API | REAL visual/parcial |  
| Eliminar tarea | No encontrado | No encontrado | No encontrado | No encontrado | confirmación UI definida; sin contrato API | REAL parcial |  
| Verificar tarea | No encontrado | No encontrado | No encontrado | No encontrado | concepto mencionado; contradicción de estado | POST\_MVP / requiere definición |  
| Listar eventos | No encontrado | No encontrado | No encontrado | No encontrado | acción necesaria para Calendar/Home; sin contrato | Información faltante |  
| Crear evento | No encontrado | No encontrado | No encontrado | No encontrado | acción mencionada sin contrato API | REAL parcial |  
| Editar evento | No encontrado | No encontrado | No encontrado | No encontrado | BottomSheet crear/editar; sin contrato | REAL parcial |  
| Eliminar evento | No encontrado | No encontrado | No encontrado | No encontrado | confirmación UI definida; sin contrato API | REAL parcial |  
| Ver calendario | No encontrado | No encontrado | No encontrado | No encontrado | navegación UI mencionada | REAL parcial |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
| \--- | \--- | \--- | \--- | \--- | \--- |  
| Planner | Tasks | no especificado | sección interna | tab interna / pantalla | REAL MÍNIMO |  
| Planner | Calendar | no especificado | sección interna | tab interna / pantalla | REAL MÍNIMO |  
| Planner | Goals | no especificado | sección interna | tab visible, lógica no desarrollada | POST\_MVP |  
| Task | título | no especificado | ejemplo: \`Comprar leche y pan\`, \`Pagar servicios\` | texto principal de item | DEMO PREMIUM / REAL visual |  
| Task | responsabilidad | no especificado | \`Compras\`, \`Mascotas\`, \`Limpieza\`, \`Vehículos\` | agrupación/eje organizador | REAL parcial |  
| Task | prioridad | no especificado | no se listan valores | Home \> Atención Requerida | REAL parcial, incompleto |  
| Task | responsable | no especificado | no se listan entidades concretas | Home \> Atención Requerida / Carga Familiar | REAL parcial, incompleto |  
| Task | fecha | no especificado | fecha de vencimiento implícita | calcular pendiente/vencida | REAL parcial, incompleto |  
| Task | timestamp completado | no especificado | \`timestamp\` | completar tarea | REAL parcial |  
| Task | estado visual checkbox | visual | unchecked / pressed / checked | completar tarea 1-tap | REAL visual |  
| Task | vencida | calculado | no es estado | mostrar como pendiente, no error | REAL parcial |  
| Task | verificación | no especificado | aprobación opcional post-completado; no crea estado separado | flujo ambiguo | POST\_MVP / contradicción |  
| Event | título | no especificado | \`Sábado: Asado familiar\`, \`Miércoles: Control médico\` | card/lista de eventos | DEMO PREMIUM |  
| Event | fecha | no especificado | sábado, miércoles | ordenar/mostrar próximos eventos | DEMO PREMIUM / REAL parcial |  
| Event | hora | no especificado | \`14:00\`, \`10:30\` | mostrar evento | DEMO PREMIUM |  
| Event | participantes | no especificado | \`Participan 5 personas\` | subtítulo de evento | DEMO PREMIUM |  
| Event | ubicación | no especificado | \`Clínica Familiar\` | subtítulo de evento | DEMO PREMIUM |  
| Calendar | evento | no especificado | evento con fecha, participantes, ubicación | listar eventos | REAL parcial |  
| Chip | selected | visual | selected/unselected | filtros | REAL visual |  
| Badge | variante | visual | success/warning/error/info/neutral | indicadores | REAL visual |  
| ListItem | estado | visual | default/pressed/selected/disabled | lista de tareas/eventos | REAL visual |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
| \--- | \--- | \--- | \--- |  
| Tareas sin datos | mostrar Empty State: \`Acá van a aparecer tus tareas\` | Documento principal §4.15 | REAL visual |  
| Datos tardan \>300ms | mostrar Skeleton | Documento principal §4.16 | REAL visual |  
| Operación de botón \>300ms | mostrar spinner | Documento principal §4.1 | REAL visual |  
| Loading muy corto | mantener mínimo 400ms para evitar flicker | Documento principal §4.1 | REAL visual |  
| Completar tarea | 1 tap, no abrir detalle | Documento principal §4.6 / §8.4 | REAL MÍNIMO |  
| Completar por error | toast con \`Deshacer\` por 5s | Documento principal §4.13 / comprensión OUTPUT 5 | REAL visual |  
| Otra persona completa tarea | nunca mostrar toast | Documento principal §4.13 / comprensión OUTPUT 5 | REAL visual |  
| Tarea atrasada | mostrar como \`pendiente\`; no color de error por atraso | Documento principal §4.14 / comprensión OUTPUT 5 | REAL visual |  
| Tarea vencida | no es estado; se calcula por fecha de vencimiento vs hoy | Comprensión OUTPUT 5 | REAL parcial |  
| Eliminar tarea/evento | requiere modal de confirmación | Documento principal §4.11 / comprensión OUTPUT 5 | REAL parcial |  
| Formulario en modal | prohibido; usar BottomSheet | Documento principal §4.11 | REAL restricción |  
| Navegación en modal | prohibido; modal no navega entre niveles | Documento principal §4.11 | REAL restricción |  
| Badge en Bottom Nav | nunca rojo/error; solo success o alert | Documento principal §4.5 / §4.8 | REAL restricción |  
| Adulto Mayor | touch targets ≥56px, sin gestos complejos | Documento principal §4.6 / §4.12 / §8.3 | REAL visual |  
| Reduced motion | eliminar animaciones si SO lo pide | Comprensión OUTPUT 5 / Documento principal §8.3 | REAL accesibilidad |  
| Postergar evento | equivale a modificar fecha; no existe estado Postergado | Comprensión OUTPUT 5 | REAL parcial |  
| Verificación de tarea | documento dice que no crea estado separado | Comprensión OUTPUT 1 / source\_map | POST\_MVP / contradicción |  
| Calendar día/semana/mes | no encontrado | source\_map | Información faltante |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

\* Bottom Nav congelada:  
  \* \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Planner no debe moverse a More.  
\* Calendar no debe tener tab propio en Bottom Nav.  
\* Goals aparece dentro de Planner, pero no desarrollar lógica para este fragment.  
\* Responsabilidades no aparecen como dominio independiente; son eje organizador de Tasks.  
\* Acción principal de cada pantalla debe ser 1 tap.  
\* Si una acción principal requiere más pasos, el diseño debe rehacerse.  
\* Completar tarea no abre detalle.  
\* Toda acción del usuario recibe feedback en \`\<100ms\`.  
\* Spinner solo si operación \`\>300ms\`.  
\* Skeleton si carga \`\>300ms\`.  
\* Toda eliminación requiere confirmación.  
\* Completar tarea tiene deshacer de \`5s\`.  
\* Toast arriba, no abajo.  
\* Máximo 1 toast visible.  
\* Nunca toast para tareas completadas por otros miembros.  
\* Sin badges rojos/error en Bottom Nav.  
\* Badge nunca comunica solo con color.  
\* No mostrar atraso como deuda visual.  
\* Tarea vencida no es estado; se calcula.  
\* Postergar evento no es estado; equivale a modificar fecha.  
\* No usar modales para formularios.  
\* No usar modales para navegación entre niveles.  
\* No usar tooltips ni carruseles para enseñar el módulo; usar Empty State.  
\* Más de 4 niveles de navegación es fallo.  
\* Objetivo: 95% de acciones en ≤3 niveles.  
\* Configuración avanzada nunca visible por defecto.  
\* Modo Adulto Mayor no es zoom; es re-arquitectura de interacción.  
\* Adulto Mayor:  
  \* fuente mayor;  
  \* alto contraste;  
  \* touch targets mayores;  
  \* sin gestos complejos.  
\* No inventar endpoints desde este documento.  
\* No asumir permisos de tasks/events desde la matriz de otros módulos.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
| \--- | \--- | \--- |  
| Campos completos de Task | permite crear formulario real | BottomSheet queda visual sin contrato |  
| Tipos de campos de Task | evita inventar schema | service/API no definible desde este documento |  
| Estados backend de Task | MVP espera estados específicos, pero documento solo define estados visuales | riesgo de contradicción |  
| Verification Flow MVP | documento dice que verificación no crea estado separado | requiere otra fuente para estados \`pending/completed/awaiting\_verification/verified\` |  
| Permisos para crear/editar/completar/verificar tareas | evita extrapolar roles | permisos incompletos |  
| Request/response de tasks | necesario para backend real | no implementar API desde este fragment |  
| Endpoint de listar tareas | necesario para datos reales | usar mock/local si es demo |  
| Endpoint de completar tarea | necesario para sincronización real | solo hay interacción UI |  
| Formulario de crear tarea | faltan labels/campos | Codex debería usar otra fuente o mock mínimo |  
| Campos completos de Event | permite crear formulario real | Calendar queda visual parcial |  
| Tipos de campos de Event | evita inventar schema | service/API no definible desde este documento |  
| Recurrencia simple de eventos | MVP la pide, documento no la define | no extraer RRULE/EXDATE ni inventar simple recurrence |  
| Vistas día/semana/mes | MVP las pide, documento solo dice Calendar | Calendar queda mínimo/parcial |  
| Tareas con fecha dentro de Calendar | MVP la pide, documento no lo explicita | marcar como faltante |  
| Estados vacíos de Calendar | no hay copy específico | Calendar empty state no definido |  
| Filtros concretos de Tasks | Chips existen, pero no filtros del módulo | no inventar filtros |  
| Prioridades | aparece como dato, sin valores | no inventar \`low/medium/high\` |  
| Responsables | aparece como dato, sin entidad/campo concreto | depende de Members/People |  
| Datos reales de Members | asignación de tareas/eventos depende de miembros | dependencia externa |  
| Contrato de Home summary | Home consume Planner pero no hay API | integración real incompleta |  
| Service aislado | no hay nombre ni contrato | solo se puede extraer como pista de mock/local |  
| Errores de API | no se definen errores | no inventar mensajes backend |  
| Criterio de orden de tareas/eventos | no aparece | listas quedan mock/visuales |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Documento principal**

\* Archivo: \`HomePlus — Desing system v1(1).md\`  
\* Secciones usadas:  
  \* Encabezado / alcance mobile-first React Native / Expo.  
  \* \`1. Paleta de colores\`.  
  \* \`2. Tipografía\`.  
  \* \`3. Espaciado y Grid\`.  
  \* \`4.1 Botones\`.  
  \* \`4.2 Botón Flotante (FAB)\`.  
  \* \`4.3 Cards\`.  
  \* \`4.5 Chips / Badges\`.  
  \* \`4.6 Checkbox de Tarea (1-tap)\`.  
  \* \`4.7 Avatar\`.  
  \* \`4.8 Bottom Navigation Bar\`.  
  \* \`4.9 Quick Actions Panel\`.  
  \* \`4.11 Modal y Bottom Sheet\`.  
  \* \`4.12 List Item\`.  
  \* \`4.13 Toast / Snackbar\`.  
  \* \`4.14 Indicador de Progreso\`.  
  \* \`4.15 Empty State\`.  
  \* \`4.16 Skeleton / Loading\`.  
  \* \`4.17 Tab Bar\`.  
  \* \`6.1 Pantalla Home — Coordinador (Happy Path)\`.  
  \* \`6.2 Pantalla Home — Adulto Mayor\`.  
  \* \`7. Implementación recomendada\` / estructura de archivos.  
  \* \`8. Lista de verificación de implementación\`.

**\#\#\# Archivo de comprensión asociado**

\* Archivo: \`Design system v1(1).txt\`  
\* Secciones usadas:  
  \* \`OUTPUT 1 — ENTITIES\`.  
  \* \`OUTPUT 2 — RELATIONSHIPS\`.  
  \* \`OUTPUT 4 — DATA FLOWS\`.  
  \* \`OUTPUT 5 — BUSINESS RULES\`.  
  \* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`.  
  \* \`OUTPUT 7 — MISSING OR IMPLIED CONNECTIONS\`.  
  \* \`OUTPUT 8 — GRAPH EDGES\`.

**\#\#\# Source map generado previamente**

\* Archivo: \`source\_map\_HomePlus\_Design\_System\_V2.md\`  
\* Secciones usadas:  
  \* \`4.7 PLANNER\`.  
  \* \`4.8 TASKS\`.  
  \* \`4.9 EVENTS\`.  
  \* \`4.10 CALENDAR\`.  
  \* \`10. Mapa de APIs\`.  
  \* \`11. Mapa de UI\`.  
  \* \`12. Mapa de eventos del sistema\`.  
  \* \`13. Restricciones arquitectónicas detectadas\`.  
  \* \`17. Contradicciones detectadas\`.  
  \* \`18. Información faltante\`.  
  \* \`19. Recomendación de fragments a generar\`.

**\# PLANNER fragment — HomePlus UX writing guide para geni**

\> Fragment crudo de implementación visual/interactiva extraído únicamente de:  
\>  
\> \* Documento principal: \`HomePlus — UX writing guide para geni(1).md\`  
\> \* Archivo de comprensión asociado: \`UX writing guide para geni(1).txt\`  
\> \* Source map previo del mismo documento: \`source\_map\_HomePlus\_UX\_writing\_guide\_para\_geni.md\`  
\>  
\> Módulo solicitado: **\*\*PLANNER\*\***.  
\>  
\> No es spec final. No fusiona con otros documentos. No completa huecos.

**\---**

**\#\# 1\. Rol del módulo en la demo**

**\#\#\# Información explícita encontrada**

\* \`Planner\` aparece como núcleo operativo que administra \`Tasks\`, \`Calendar\`, \`Goals\` y \`Responsabilidades\`.  
\* Para este fragment, \`Goals\` queda fuera de implementación MVP/demo del módulo solicitado y se clasifica como POST\_MVP.  
\* \`Task\` representa trabajo pendiente o realizado.  
\* \`Calendar\` aparece como feature dentro de Planner y administra eventos.  
\* \`Event\` aparece como evento de calendario.  
\* Planner se conecta visualmente con Home mediante:  
  \* tareas pendientes;  
  \* tareas vencidas;  
  \* próximos eventos;  
  \* briefing/resumen de tareas y eventos;  
  \* widgets de tareas y próximos eventos;  
  \* atención requerida agregada desde tareas vencidas.  
\* El valor visible del módulo es coordinación familiar operativa: tareas, responsables, fechas, eventos, pendientes, vencimientos y conflictos de horario.  
\* El tono del módulo debe presentar hechos sin juicio, con acciones sugeridas y puerta de salida.

**\#\#\# Dependencias externas / no desarrollar en este fragment**

\* **\*\*Home:\*\*** muestra resúmenes de tareas/eventos y conduce al módulo que administra cada dato. No desarrollar Home completo.  
\* **\*\*People / Members:\*\*** aporta personas responsables y participantes. No desarrollar gestión de miembros.  
\* **\*\*Geni:\*\*** aporta microcopy, sugerencias y escalamiento. Para esta demo no implementar IA real.  
\* **\*\*Notifications:\*\*** aparecen recordatorios y avisos, pero no implementar push real.  
\* **\*\*Quick Actions:\*\*** aparece como acceso transversal, pero no hay acción explícita de crear tarea/evento en este documento.  
\* **\*\*Automatizaciones:\*\*** Planner puede disparar o ser leído por automatizaciones en archivo asociado, pero no implementar automatizaciones reales.

**\---**

**\#\# 2\. Información encontrada para las 7 condiciones MVP**

**\#\#\# 2.1 Pantalla visualmente terminada**

**\#\#\#\# Pantallas / zonas detectadas o inferibles desde el documento**

\* **\*\*Planner\*\*** como destino en Bottom Nav.  
\* **\*\*Calendar\*\*** dentro de Planner.  
\* **\*\*Task list / lista de tareas\*\***: no aparece como pantalla detallada, pero sí como entidad visible en Home y en notificaciones.  
\* **\*\*Event list / próximos eventos\*\***: no aparece como pantalla detallada, pero sí como \`WidgetPróximosEventos\` y \`Calendar\`.  
\* **\*\*Home widgets conectados a Planner\*\***:  
  \* \`WidgetTareas\`.  
  \* \`WidgetPróximosEventos\`.  
  \* \`WidgetAtenciónRequerida\` agregando tareas vencidas.  
  \* \`WidgetCargaFamiliar\` analizando tareas, solo visible al Coordinador según documento, pero para MVP visual debe tratarse como mock/dummy si se usa.

**\#\#\#\# Componentes visuales extraíbles**

\* Cards/list rows de tareas con:  
  \* estado;  
  \* responsable;  
  \* fecha;  
  \* prioridad si se usa desde data flow, aunque el modelo formal no la define como campo tipado;  
  \* vencimiento calculado;  
  \* copy contextual.  
\* Cards/list rows de eventos con:  
  \* fecha;  
  \* hora;  
  \* participantes;  
  \* estado;  
  \* tipo \`Familiar\` o \`Personal\`.  
\* Empty states:  
  \* \`Sin tareas asignadas\`: “No tenés tareas pendientes. Cuando te asignen una, aparece acá.”  
  \* \`Sin eventos próximos\`: “Calendario libre por ahora. ¿Agregamos un evento?”  
\* Estados visibles para tareas:  
  \* pendiente;  
  \* completada;  
  \* vencida como condición calculada, no estado persistido;  
  \* bloqueada por dependencia, si se muestra como POST\_MVP/demo no real;  
  \* requiere verificación, si se usa como estado visual derivado de \`Verificación\`.  
\* Estados visibles para eventos:  
  \* programado;  
  \* completado;  
  \* cancelado;  
  \* postergado no existe como estado; postergar equivale a modificar fecha.  
\* Copy de notificaciones/tarjetas:  
  \* tarea simple: “Luca, mañana te toca sacar el reciclaje antes de las 8.”  
  \* tarea con dependencia: “Mati, la reunión del cole es mañana a las 17\. ¿Tenés los papeles listos?”  
  \* tarea recurrente: “Martes de compras. ¿Mantienen la lista de siempre?”  
  \* tarea vencida día 1: “Luca, tenés una tarea pendiente desde ayer. ¿La revisás hoy?”  
  \* tarea vencida día 3: “Luca, tu tarea sigue pendiente desde el lunes. ¿Necesitás ayuda para completarla?”  
  \* tarea vencida día 4: “Luca, ya van 3 días con esta tarea sin completar. Si no se resuelve hoy, mañana debo informar al Coordinador. ¿La revisamos juntos?”  
  \* tarea vencida día 5 al Coordinador: “Te informo como Coordinador: Luca tiene 1 tarea pendiente desde el lunes. ¿Querés intervenir o esperamos?”  
  \* tarea completada standard: “Listo el reciclaje. 💜”  
  \* tarea completada para niño: “Luca completó su lista de hoy. 🎯”  
  \* conflicto leve: “El martes coinciden el dentista de Luca y la reunión de Mariana a las 16\. ¿Revisan?”  
  \* conflicto con recurso compartido: “El viernes dos personas necesitan el auto a las 15\. ¿Coordinan quién lo usa?”  
\* Home/Briefing relacionado:  
  \* “Hoy: 4 tareas, 2 eventos y 1 documento por vencer. ¿Empezamos por las tareas?”  
  \* “Hoy tranquilo: 1 evento a las 16 y sin vencimientos. ☀️”  
  \* “Sábado. 1 tarea pendiente y la lista de compras por armar.”  
  \* “Todo al día por acá. Nada pendiente.”  
  \* “Sin tareas, sin vencimientos. Buen momento para lo que quieras.”  
  \* “Tenés 2 tareas para hoy y 1 del lunes.”  
  \* “Pendientes: 3 tareas, 1 documento. ¿Empezamos por lo urgente?”

**\#\#\#\# Jerarquía visual sugerida por fuentes**

\* Bottom Nav congelada: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* Home es pantalla inicial y resume, no administra.  
\* Toda información de Home debe conducir al módulo que la administra.  
\* Planner no aparece en More; aparece como tab principal en Bottom Nav.  
\* Máximo 5 tabs por dominio.  
\* Más de 4 niveles de navegación es fallo; objetivo de acciones en ≤ 3 niveles.  
\* Modales solo para acciones cortas.  
\* Drawers solo para filtros y opciones contextuales.

**\---**

**\#\#\# 2.2 Datos creíbles**

**\#\#\#\# Tareas / ejemplos explícitos**

| Dato encontrado | Uso posible en demo | Clasificación |  
|---|---|---|  
| Sacar el reciclaje antes de las 8 | Task card / reminder / completar tarea | DEMO PREMIUM / LOCAL |  
| Reunión del cole mañana a las 17 con papeles listos | Tarea con fecha o evento escolar con tarea asociada | DEMO PREMIUM |  
| Martes de compras / lista de siempre | Tarea recurrente visual / categoría Compras | DEMO PREMIUM |  
| Tarea pendiente desde ayer | Estado visual vencido/pendiente | DEMO PREMIUM / LOCAL |  
| Tarea pendiente desde el lunes | Estado vencido con fecha relativa | DEMO PREMIUM / LOCAL |  
| 2 tareas del finde quedaron sin completar | Agrupación por fecha/filtro fin de semana | DEMO PREMIUM |  
| 1 tarea pendiente desde el jueves | Estado vencido para adulto | DEMO PREMIUM |  
| Reciclaje completado | Feedback success de completar tarea | LOCAL |  
| Lista de hoy completada por Luca | Feedback success para niño | LOCAL |  
| Tareas atrasadas ≥3 | Umbral para mostrar alerta o badge de atención | POST\_MVP si automatizado; DEMO si solo visual |  
| 3 tareas pendientes asignadas a Juan | Ejemplo de dato objetivo sin juicio | DEMO PREMIUM |  
| 4 tareas | Conteo en briefing/home | MOCK / DEMO |  
| 2 tareas para hoy y 1 del lunes | Resumen de tareas pendientes | MOCK / DEMO |  
| 3 tareas, 1 documento | Resumen de pendientes; documento es dependencia externa | MOCK / DEMO |  
| 3 tareas sin dueño activo | Escalamiento/briefing familiar | POST\_MVP / DEMO visual |  
| Lista de compras por armar | Task/compras como dato demo | DEMO PREMIUM |  
| Recordatorio de medicación a las 9 | Task de medicación / reminder | DEMO PREMIUM |  
| Medicación de la tarde para Luca | Task de medicación con supervisión | DEMO PREMIUM |

**\#\#\#\# Eventos / ejemplos explícitos**

| Dato encontrado | Uso posible en demo | Clasificación |  
|---|---|---|  
| 2 eventos | Conteo en briefing/home | MOCK / DEMO |  
| 1 evento a las 16 | Próximo evento en Home o Calendar | DEMO PREMIUM |  
| Dentista de Luca el martes a las 16 | Event card / conflicto | DEMO PREMIUM |  
| Reunión de Mariana el martes a las 16 | Event card / conflicto | DEMO PREMIUM |  
| Dos personas necesitan el auto el viernes a las 15 | Conflicto de evento/recurso compartido | DEMO PREMIUM / POST\_MVP si recurso real |  
| Reunión del cole mañana a las 17 | Event o task asociada | DEMO PREMIUM |

**\#\#\#\# Categorías / responsabilidades explícitas**

| Dato encontrado | Uso posible | Clasificación |  
|---|---|---|  
| Compras | Categoría/template visual de tarea | DEMO PREMIUM / REAL mínimo si se usa como constante visual |  
| Mascotas | Responsabilidad/categoría extraída del archivo asociado | DEMO PREMIUM |  
| Limpieza | No aparece explícita como ejemplo en el documento leído; falta para template MVP | Información faltante |  
| Medicación | Recordatorio explícito; puede servir como categoría de tarea | DEMO PREMIUM |  
| Estudios | No aparece explícita como template; “reunión del cole” puede servir de contexto, no template formal | Información faltante |  
| Pagos | No aparece como template Planner; pagos aparecen vinculados a Home/Finance fuera de Planner | Información faltante / dependencia externa |  
| Vehículos | Responsabilidad mencionada en archivo asociado; recurso auto aparece en conflicto | DEMO / POST\_MVP si se desarrolla recurso |

**\#\#\#\# Personas / nombres explícitos**

\* Luca.  
\* Mati.  
\* Jose.  
\* Mariana.  
\* Tomás.  
\* Juan.  
\* Don Carlos.

Usos posibles: responsables, participantes, destinatarios de notificación, ejemplos de carga familiar mock.

**\#\#\#\# Labels temporales explícitos**

\* mañana;  
\* antes de las 8;  
\* martes;  
\* lunes;  
\* jueves;  
\* finde;  
\* viernes a las 15;  
\* 16;  
\* 17;  
\* las 9;  
\* tarde;  
\* desde ayer;  
\* desde el lunes;  
\* 30 minutos después.

**\---**

**\#\#\# 2.3 Acción interactiva**

**\#\#\#\# Acciones encontradas o mencionadas**

| Acción | Evidencia | Resultado visible posible | Clasificación |  
|---|---|---|---|  
| Completar tarea | “Listo el reciclaje. 💜”; “Luca completó su lista de hoy. 🎯” | Cambia visualmente a completada \+ mensaje factual | REAL MÍNIMO / LOCAL |  
| Revisar tarea pendiente | “¿La revisás hoy?” | Abrir detalle o enfocar tarea pendiente | DEMO PREMIUM / LOCAL |  
| Pedir ayuda para completar/reorganizar | “¿Necesitás ayuda para completarla?” / “¿Querés que te ayude a reorganizarlas?” | Acción sugerida, no automática | DEMO PREMIUM |  
| Pasar tarea a otro día | “¿La pasamos al finde o la revisás hoy?” | Reprogramar fecha si se implementa local | DEMO PREMIUM / LOCAL |  
| Revisar distribución | “¿Revisan la distribución?” | Abrir vista de carga/responsables | DEMO PREMIUM / MOCK |  
| Ajustar distribución | “¿Ajustan algo entre todos?” | Abrir selector/reasignación; no automática | DEMO PREMIUM / LOCAL |  
| Revisar conflicto | “¿Revisan?” | Abrir eventos conflictivos | DEMO PREMIUM |  
| Coordinar uso de recurso | “¿Coordinan quién lo usa?” | Acción visual de resolver conflicto | POST\_MVP / DEMO visual |  
| Agregar evento | Empty state: “¿Agregamos un evento?” | Abrir crear evento | REAL MÍNIMO / LOCAL |  
| Recordar de nuevo en 30 minutos | Medicación: reconfirmación | Feedback de recordatorio local/mock | DEMO PREMIUM / MOCK |  
| Verificar completitud | Archivo asociado: verificación humana de tareas | Estado visual verificado | REAL parcial / LOCAL si no hay backend |  
| Reasignar tarea | Archivo asociado: requiere acción de Adulto, Coordinador o responsable | Cambia responsable localmente | DEMO PREMIUM / LOCAL |  
| Crear tarea desde plantilla | \`PlantillaTarea generates Task\` | Crear task prellenada | DEMO PREMIUM / LOCAL |

**\#\#\#\# Acciones explícitamente restringidas**

\* Geni nunca marca tareas como completadas automáticamente.  
\* Geni nunca reasigna tareas unilateralmente.  
\* Reasignación requiere acción de Adulto, Coordinador o responsable.  
\* Verificación de completitud es responsabilidad humana.  
\* Automatizaciones requieren aprobación explícita antes de activarse; no desarrollar automatizaciones reales.

**\---**

**\#\#\# 2.4 Feedback inmediato**

**\#\#\#\# Success / confirmación**

\* Al completar tarea standard: “Listo el reciclaje. 💜”  
\* Al completar lista de niño: “Luca completó su lista de hoy. 🎯”  
\* Reconocimiento debe ser factual, sin adjetivos valorativos ni comparaciones.

**\#\#\#\# Empty states**

| Caso | Copy extraíble | Clasificación |  
|---|---|---|  
| Sin tareas asignadas | “No tenés tareas pendientes. Cuando te asignen una, aparece acá.” | REAL MÍNIMO / DEMO |  
| Sin eventos próximos | “Calendario libre por ahora. ¿Agregamos un evento?” | REAL MÍNIMO / DEMO |

**\#\#\#\# Error / edge states reutilizables para Planner**

| Caso | Copy extraíble | Uso en Planner |  
|---|---|---|  
| Error de conexión | “Sin conexión. Tus datos están seguros, se sincronizan cuando vuelvas.” | Error banner/toast en lista o formulario |  
| Sincronización pendiente | “Falta sincronizar. Los cambios de hoy se guardaron en el teléfono.” | Estado local pendiente si se usa AsyncStorage/mock |  
| Permiso denegado general | “No tenés acceso a esta sección. Solo visible para el Coordinador del hogar.” | Acciones restringidas por rol |  
| Permiso denegado Niño | “Esta sección es solo para adultos del hogar.” | Crear/reasignar/editar si se bloquea para niño |  
| Error al guardar | “No se pudo guardar. ¿Probás de nuevo? Si persiste, revisamos la conexión.” | Crear/editar task/event |  
| Datos inconsistentes | “Hay un dato que no coincide. ¿Lo revisamos juntos?” | Conflict/invalid state |  
| Funcionalidad no disponible | “Esta función todavía no está lista. Te avisamos cuando se active.” | Post-MVP o acción demo no implementada |

**\#\#\#\# Loading / skeleton / spinner**

\* No se encontró mención explícita a loading, skeleton, spinner ni estados de espera.

**\#\#\#\# Disabled state**

\* No se encontró patrón explícito de disabled state.  
\* Se puede derivar visualmente de permisos denegados, pero el documento no define diseño ni comportamiento.

**\---**

**\#\#\# 2.5 Service aislado**

**\#\#\#\# Datos que un service de Planner podría listar según fuentes**

\* Tasks:  
  \* estado;  
  \* responsable;  
  \* fecha;  
  \* prioridad;  
  \* progreso de subtareas, POST\_MVP;  
  \* responsabilidad/categoría;  
  \* si está vencida como cálculo;  
  \* si requiere verificación;  
  \* si está bloqueada por dependencia, POST\_MVP.  
\* Events:  
  \* fecha;  
  \* participantes;  
  \* estado;  
  \* tipo \`Familiar\` / \`Personal\`.  
\* Calendar:  
  \* eventos próximos;  
  \* conflictos de horario.  
\* Home integration:  
  \* \`Task\` → \`WidgetTareas\`.  
  \* \`Event\` → \`WidgetPróximosEventos\`.  
  \* \`WidgetAtenciónRequerida\` agrega tareas vencidas.  
  \* \`WidgetCargaFamiliar\` analiza Task, pero para MVP visual tratar como mock.

**\#\#\#\# Acciones que el service podría ejecutar según documento**

\* Completar tarea.  
\* Reprogramar/pasar tarea a otro día, si se usa el copy “¿La pasamos al finde...?”.  
\* Reasignar tarea por acción humana autorizada.  
\* Verificar tarea por acción humana.  
\* Crear task desde plantilla, por relación \`PlantillaTarea generates Task\`.  
\* Agregar evento, por empty state de calendario.  
\* Modificar fecha de evento para postergar, porque no existe estado \`Postergado\`.

**\#\#\#\# Contrato service/API**

\* No se encontró contrato API explícito.  
\* No se encontraron endpoints.  
\* Para demo visual, la fuente permite un service **\*\*local/mock\*\*** que devuelva datos y mutaciones inmediatas.  
\* Si se usa persistencia local, el documento menciona estados de “sincronización pendiente” y que cambios de hoy se guardaron en el teléfono; sin embargo, Offline Sync real queda POST\_MVP/IGNORAR como implementación real.

**\---**

**\#\#\# 2.6 Navegación coherente**

**\#\#\#\# Navegación encontrada**

\* Bottom Navigation congelada: \`\[Home\] \[People\] \[+\] \[Planner\] \[More\]\`.  
\* \`BottomNav\` navega a \`Planner\`.  
\* \`BottomNav\` abre \`QuickActions\` con el botón \`+\`.  
\* \`Home\` es pantalla inicial y el usuario no puede cambiarlo.  
\* \`Home\` resume información, no administra.  
\* Toda información en Home conduce al módulo que la administra.  
\* \`Calendar\` vive dentro de \`Planner\`; no aparece como tab separado.  
\* \`More\` contiene herramientas especializadas, pero Planner no vive en More.

**\#\#\#\# Navegación recomendada desde fuentes para el fragment**

\* Entrar a Planner desde Bottom Nav.  
\* Desde Home:  
  \* tocar \`WidgetTareas\` → abrir Planner / Tasks.  
  \* tocar tarea vencida en \`Atención Requerida\` → abrir detalle/lista de Tasks.  
  \* tocar \`WidgetPróximosEventos\` → abrir Planner / Calendar o Events.  
\* Desde empty state de Calendar:  
  \* “¿Agregamos un evento?” → crear evento, si se implementa localmente.  
\* Desde Quick Actions:  
  \* no hay acción explícita de crear tarea/evento en el documento actual; no inventar.

**\---**

**\#\#\# 2.7 Conexión con Home o More**

**\#\#\#\# Home**

\* \`Home\` contiene widgets conectados a Planner:  
  \* \`WidgetTareas\`.  
  \* \`WidgetPróximosEventos\`.  
  \* \`WidgetAtenciónRequerida\` con tareas vencidas.  
  \* \`WidgetCargaFamiliar\` que analiza tareas, pero para esta demo tratar como MOCK si aparece.  
\* Briefing puede mostrar:  
  \* conteo de tareas;  
  \* conteo de eventos;  
  \* tareas pendientes;  
  \* día cargado/tranquilo;  
  \* estado “todo al día”.  
\* Home no administra tareas/eventos; conduce a Planner.

**\#\#\#\# More**

\* Planner no vive en More.  
\* \`More\` se reserva para herramientas especializadas como Finance, Inventory, FamilyCloud y Settings.  
\* No crear card de Planner en More desde este documento.

**\#\#\#\# Quick Actions**

\* El botón \`+\` abre Quick Actions.  
\* El documento dice que Geni es accesible vía Quick Actions.  
\* No se encontró acción explícita “crear tarea” o “crear evento” dentro de Quick Actions en este documento.

**\---**

**\#\# 3\. Clasificación para implementación**

**\#\#\# REAL MÍNIMO**

\* Planner como tab principal de Bottom Nav.  
\* Calendar como feature dentro de Planner.  
\* Task como entidad visual/interactiva.  
\* Event como entidad visual/interactiva.  
\* Completar tarea por acción humana.  
\* Reasignar tarea solo por acción humana autorizada si se implementa.  
\* Verificación humana de tarea si se implementa; no automática.  
\* Vencida como cálculo visual, no estado persistido.  
\* Eventos con estados \`Programado\`, \`Completado\`, \`Cancelado\` según archivo asociado.  
\* Postergar evento \= modificar fecha, no crear estado \`Postergado\`.  
\* Home resume tareas/eventos y navega a Planner.  
\* Empty states de tareas y eventos.  
\* Error al guardar y error de conexión como feedback visual.

**\#\#\# DEMO PREMIUM**

\* Cards de tareas con copy contextual:  
  \* reciclaje;  
  \* reunión del cole;  
  \* martes de compras;  
  \* medicación;  
  \* tareas del finde;  
  \* tareas pendientes desde lunes/jueves/ayer.  
\* Cards de eventos con conflictos:  
  \* dentista de Luca;  
  \* reunión de Mariana;  
  \* evento a las 16;  
  \* reunión del cole a las 17;  
  \* conflicto de auto como recurso compartido, sin desarrollar Assets.  
\* Filtros/tabs visuales posibles si se quiere demostrar:  
  \* pendientes;  
  \* hoy;  
  \* vencidas;  
  \* completadas;  
  \* calendario.  
  Estos tabs no aparecen explícitamente como UI, pero las categorías de datos sí aparecen como estados/copies. Si se usan, marcarlos como decisión posterior de UI, no extracción literal.  
\* Carga familiar visual desde tareas, solo como mock/dummy si se muestra.  
\* Briefing simple con tareas/eventos, mock/simple.  
\* Estado “todo al día”.  
\* Estado “pendientes”.  
\* Conflictos de horario como badge/card.

**\#\#\# LOCAL / ASYNCSTORAGE / MOCK SERVICE**

\* Listar tareas mock/locales.  
\* Completar tarea con estado local y feedback inmediato.  
\* Crear tarea desde plantilla visual si se usa \`PlantillaTarea generates Task\`.  
\* Reasignar responsable localmente si se usa acción humana autorizada.  
\* Marcar/verificar tarea localmente si se usa verification flow visual.  
\* Listar eventos mock/locales.  
\* Agregar evento local desde empty state.  
\* Editar fecha de evento local para simular postergación.  
\* Mostrar mensajes de “sincronización pendiente” como estado visual local si se decide simular.

**\#\#\# POST\_MVP**

\* Goals.  
\* Hitos/Milestones.  
\* Rachita/Streaks.  
\* Subtareas.  
\* Dependencias reales entre tareas.  
\* Bloqueo real por dependencia.  
\* Comentarios.  
\* Adjuntos.  
\* Timeline.  
\* Recurrencia compleja o generación real de instancias.  
\* Automatizaciones reales.  
\* Notificaciones push reales.  
\* Auditoría completa.  
\* Offline sync real.  
\* Geni real detectando patrones, escalando y personalizando.  
\* Search global ejecutando acciones.  
\* Participantes avanzados con estados de asistencia.  
\* Recursos compartidos reales.

**\#\#\# IGNORAR**

\* Implementación real de módulos externos.  
\* IA real.  
\* Automatizaciones reales.  
\* Auditoría completa.  
\* Offline sync real.  
\* GPS, geocercas o presencia real.  
\* Finance real.  
\* Inventory real.  
\* Assets real.  
\* FamilyCloud real.  
\* SOS real.  
\* Feed real.

**\---**

**\#\# 4\. UI extraíble**

| Pantalla/Componente | Qué muestra | Acciones | Estados UX | Navegación | Clasificación |  
|---|---|---|---|---|---|  
| Planner tab | Entrada principal del módulo Planner | Abrir Planner | No especificado | Bottom Nav → Planner | REAL MÍNIMO |  
| Calendar dentro de Planner | Eventos de calendario | Agregar evento desde empty state; modificar fecha si se usa postergar | Sin eventos próximos / conflicto de horario | Planner → Calendar | REAL MÍNIMO / DEMO |  
| Task list | Tareas pendientes/completadas/vencidas | Completar, revisar, reprogramar, reasignar si autorizado | Sin tareas, vencida, completada, error guardar | Planner / Home → Tasks | DEMO PREMIUM / LOCAL |  
| Task card | Tarea, responsable, fecha, estado, copy contextual | Completar, revisar, pedir ayuda, reprogramar | Pendiente, vencida, completada, requiere verificación | Abre detalle si existe | DEMO PREMIUM / LOCAL |  
| Task detail | No se encontró UI explícita | Revisar, completar, reasignar, verificar si se implementa | Error, permiso denegado | Desde Task card | No encontrado / decisión posterior |  
| Event card | Evento con fecha/hora/participantes/estado | Revisar conflicto, modificar fecha | Programado, completado, cancelado, conflicto | Calendar / Home próximos eventos | DEMO PREMIUM / LOCAL |  
| Empty tareas | Mensaje “No tenés tareas pendientes...” | Ninguna explícita | Estado vacío | Dentro de Tasks | REAL MÍNIMO |  
| Empty calendario/eventos | Mensaje “Calendario libre por ahora. ¿Agregamos un evento?” | Agregar evento | Estado vacío | Calendar → crear evento | REAL MÍNIMO / LOCAL |  
| Home WidgetTareas | Tareas agrupadas por responsabilidad según archivo asociado | Navegar a Planner/Tasks | Desaparece al completarse según archivo asociado | Home → Planner | Dependencia externa / REAL relación |  
| Home WidgetPróximosEventos | Eventos próximos del calendario | Navegar a Calendar/Event | Sin eventos próximos | Home → Planner/Calendar | Dependencia externa / REAL relación |  
| Home WidgetAtenciónRequerida | Elementos urgentes, incluidas tareas vencidas | Abrir elemento relacionado | Pendiente/vencido | Home → Planner | Dependencia externa / DEMO |  
| Home WidgetCargaFamiliar | Distribución de carga de tareas | Revisar distribución | Solo Coordinador; dummy para MVP visual | Home → Planner/Responsables | Dependencia externa / MOCK |  
| Briefing card | Conteos y resumen de tareas/eventos | Empezar por tareas / revisar pendientes | Día cargado, tranquilo, todo al día | Home → Planner | Dependencia externa / MOCK |  
| Error toast/banner | Mensajes de conexión, guardado, permiso | Retry/probar de nuevo | Error conexión, error guardar, permiso denegado | En formularios/listas | DEMO PREMIUM / LOCAL |

**\---**

**\#\# 5\. Datos demo extraíbles**

| Dato/ejemplo | Módulo | Uso posible | Fuente | Clasificación |  
|---|---|---|---|---|  
| Luca | Planner/People | Responsable/miembro/participante | Documento principal §3.1 | DEMO PREMIUM |  
| Mati | Planner/People | Responsable/participante | Documento principal §3.1 | DEMO PREMIUM |  
| Jose | Planner/People | Adolescente con tareas vencidas | Documento principal §3.1 | DEMO PREMIUM |  
| Mariana | Planner/People | Adulto/participante/responsable | Documento principal §3.1, §3.2 | DEMO PREMIUM |  
| Tomás | Planner/People | Miembro en carga familiar | Documento principal §3.2 | DEMO PREMIUM / MOCK |  
| Juan | Planner/People | Miembro con tareas pendientes | Documento principal §1.2, §2.2 | DEMO PREMIUM |  
| Don Carlos | Planner/People | Adulto mayor / medicación | Documento principal §3.1 | DEMO PREMIUM |  
| Sacar el reciclaje antes de las 8 | Task | Tarea simple con deadline | Documento principal §3.1 | DEMO PREMIUM |  
| Reunión del cole mañana a las 17 | Task/Event | Tarea con dependencia o evento escolar | Documento principal §3.1 | DEMO PREMIUM |  
| Papeles listos | Task | Subtarea visual o checklist, POST\_MVP si subtarea real | Documento principal §3.1 | DEMO / POST\_MVP |  
| Martes de compras | Task | Tarea recurrente visual / categoría compras | Documento principal §3.1 | DEMO PREMIUM |  
| Lista de siempre | Task | Template visual de compras | Documento principal §3.1 | DEMO PREMIUM |  
| Tarea pendiente desde ayer | Task | Vencida calculada | Documento principal §3.1 | LOCAL |  
| Tarea pendiente desde lunes/jueves | Task | Vencida con fecha relativa | Documento principal §3.1 | LOCAL |  
| 2 tareas del finde | Task | Grupo/filtro visual | Documento principal §3.1 | DEMO PREMIUM |  
| Dentista de Luca martes a las 16 | Event/Calendar | Evento y conflicto | Documento principal §3.1 | DEMO PREMIUM |  
| Reunión de Mariana martes a las 16 | Event/Calendar | Evento y conflicto | Documento principal §3.1 | DEMO PREMIUM |  
| Dos personas necesitan el auto viernes a las 15 | Event/Calendar | Conflicto de recurso | Documento principal §3.1 | DEMO / POST\_MVP |  
| 4 tareas, 2 eventos | Home/Planner | Briefing mock | Documento principal §3.2 | MOCK |  
| 1 evento a las 16 | Event/Home | Próximo evento | Documento principal §3.2 | DEMO PREMIUM |  
| 1 tarea pendiente y lista de compras por armar | Task/Home | Resumen fin de semana | Documento principal §3.2 | MOCK / DEMO |  
| 2 tareas para hoy y 1 del lunes | Task/Home | Resumen pendientes | Documento principal §3.2 | MOCK / DEMO |  
| 70% Mariana / 30% Tomás | Home/Planner | Carga familiar dummy | Documento principal §3.2 | MOCK |  
| Tomás tiene 5 tareas, Luca 1 | Home/Planner | Carga familiar dummy | Documento principal §3.2 | MOCK |  
| Don Carlos, pastilla de la presión a las 9 | Task/Reminder | Tarea de medicación | Documento principal §3.1 | DEMO PREMIUM |  
| Medicación de la tarde de Luca | Task/Reminder | Tarea supervisada | Documento principal §3.1 | DEMO PREMIUM |  
| Compras | Task/Responsabilidad | Categoría/template visual | Documento principal §3.1 / Comprensión OUTPUT 1 | DEMO PREMIUM |  
| Mascotas | Task/Responsabilidad | Categoría visual | Comprensión OUTPUT 1 | DEMO PREMIUM |  
| Vehículos | Responsabilidad/Event conflict | Categoría/recurso visual | Comprensión OUTPUT 1 / Documento principal §3.1 | POST\_MVP / DEMO |  
| Familiar / Personal | Event | Tipo de evento | Comprensión OUTPUT 1 | REAL parcial |  
| Programado / Completado / Cancelado | Event | Estados visuales | Comprensión OUTPUT 1 | REAL parcial |  
| Pendiente / En progreso / Completada / Cancelada | Task | Estados encontrados, no coinciden con estados MVP oficiales | Comprensión OUTPUT 1 | Riesgo / REAL parcial |

**\---**

**\#\# 6\. Acciones extraíbles**

| Acción | Usuario/Rol | Resultado visible | Real/Mock/Post-MVP | Fuente |  
|---|---|---|---|---|  
| Abrir Planner | Usuario autenticado | Pantalla Planner | REAL MÍNIMO | Archivo asociado: BottomNav navigates\_to Planner |  
| Completar tarea | Miembro/responsable | Copy “Listo el reciclaje. 💜” o “Luca completó su lista de hoy. 🎯” | REAL MÍNIMO / LOCAL | Documento principal §3.1 |  
| Revisar tarea vencida | Miembro/responsable | Abre tarea o lista pendiente | DEMO PREMIUM / LOCAL | Documento principal §3.1 |  
| Pedir ayuda/reorganizar tarea | Miembro | Acción sugerida sin ejecución automática | DEMO PREMIUM | Documento principal §3.1 |  
| Pasar tarea al finde | Adulto/Responsable | Fecha cambia localmente si se implementa | DEMO PREMIUM / LOCAL | Documento principal §3.1 |  
| Reasignar tarea | Adulto, Coordinador o responsable | Responsable cambia por acción humana | DEMO PREMIUM / LOCAL | Archivo asociado OUTPUT 5 |  
| Verificar tarea | Usuario humano autorizado, no Geni | Estado visual final/verificado | REAL parcial / LOCAL | Archivo asociado OUTPUT 1/5 |  
| Crear tarea desde plantilla | Usuario autorizado | Nueva tarea prellenada | DEMO PREMIUM / LOCAL | Archivo asociado: PlantillaTarea generates Task |  
| Agregar evento | Usuario autorizado no especificado | Nuevo evento local | REAL MÍNIMO / LOCAL | Documento principal §3.3 empty state |  
| Modificar fecha de evento | Usuario autorizado no especificado | Evento cambia de fecha; no se usa estado postergado | REAL MÍNIMO / LOCAL | Archivo asociado OUTPUT 5 |  
| Revisar conflicto horario | Usuario | Abre eventos conflictivos | DEMO PREMIUM | Documento principal §3.1 |  
| Coordinar recurso compartido | Usuario | Resolver conflicto visual | POST\_MVP / DEMO | Documento principal §3.1 |  
| Ver tareas desde Home | Usuario | Navega de WidgetTareas a Planner | REAL relación | Archivo asociado OUTPUT 2/4/5 |  
| Ver próximos eventos desde Home | Usuario | Navega de WidgetPróximosEventos a Planner/Calendar | REAL relación | Archivo asociado OUTPUT 2/4/5 |  
| Reintentar guardado | Usuario | Retry tras error | DEMO PREMIUM / LOCAL | Documento principal §3.4 |

**\---**

**\#\# 7\. Home / More / Quick Actions**

**\#\#\# Home**

\* Puede mostrar tareas pendientes.  
\* Puede mostrar eventos próximos.  
\* Puede mostrar estado “todo al día”.  
\* Puede mostrar estado con pendientes.  
\* Puede mostrar briefing mock con conteos simples de tareas/eventos.  
\* Puede mostrar \`WidgetTareas\`.  
\* Puede mostrar \`WidgetPróximosEventos\`.  
\* Puede mostrar \`WidgetAtenciónRequerida\` si hay tareas vencidas.  
\* Puede mostrar \`WidgetCargaFamiliar\` como mock/dummy si se quiere demo premium.  
\* Home resume, no administra.  
\* Toda información en Home conduce al módulo que la administra.  
\* \`Task\` alimenta \`WidgetTareas\`.  
\* \`Event\` alimenta \`WidgetPróximosEventos\`.

**\#\#\# More**

\* Planner no vive en More.  
\* No crear acceso de Planner en More desde este documento.  
\* More contiene módulos especializados externos y Settings, no desarrollar en este fragment.

**\#\#\# Quick Actions**

\* El botón \`+\` abre Quick Actions.  
\* Quick Actions accede a PantallaGeni como slot fijo.  
\* No se encontró acción explícita de Planner desde Quick Actions en el documento actual.  
\* No inventar \`crear tarea\` o \`crear evento\` en Quick Actions desde este documento.

**\---**

**\#\# 8\. Backend/API detectado**

No se encontró contrato API explícito en este documento.

| Endpoint/Acción | Método | Ruta | Request | Response | Estado | Clasificación |  
|---|---|---|---|---|---|---|  
| Completar tarea | No especificado | No especificado | No especificado | No especificado | Acción mencionada sin contrato API | REAL MÍNIMO / LOCAL |  
| Reasignar tarea | No especificado | No especificado | No especificado | No especificado | Acción/regla mencionada sin contrato API | DEMO PREMIUM / LOCAL |  
| Verificar tarea | No especificado | No especificado | No especificado | No especificado | Feature mencionada sin contrato API | REAL parcial / LOCAL |  
| Crear tarea desde plantilla | No especificado | No especificado | No especificado | No especificado | Relación mencionada sin contrato API | DEMO PREMIUM / LOCAL |  
| Agregar evento | No especificado | No especificado | No especificado | No especificado | Acción sugerida por empty state sin contrato API | REAL MÍNIMO / LOCAL |  
| Modificar fecha de evento | No especificado | No especificado | No especificado | No especificado | Regla mencionada sin contrato API | REAL MÍNIMO / LOCAL |  
| Listar tareas | No especificado | No especificado | No especificado | No especificado | No encontrado como contrato | Información faltante |  
| Listar eventos | No especificado | No especificado | No especificado | No especificado | No encontrado como contrato | Información faltante |

**\---**

**\#\# 9\. Modelo de datos detectado**

| Entidad | Campo | Tipo si aparece | Estado/valores | Uso visual o interacción | Clasificación |  
|---|---|---|---|---|---|  
| Planner | contains | no especificado | Task, Calendar, Goal, Responsabilidad | Estructura del módulo | REAL parcial / POST\_MVP para Goal |  
| Task | estado | no especificado | Pendiente, En progreso, Completada, Cancelada | Badges/filters/cards | REAL parcial / riesgo |  
| Task | vencida | calculada según regla, tipo no especificado | No es estado persistido | Badge visual/Atención requerida | REAL MÍNIMO |  
| Task | responsable | no especificado | Persona | Avatar/nombre/asignación | REAL MÍNIMO |  
| Task | fecha | no especificado | Fecha/deadline implícito | Agrupar hoy/vencidas/calendar | REAL MÍNIMO parcial |  
| Task | prioridad | no especificado | No aparecen valores | Orden visual si se decide; falta definición | Información faltante |  
| Task | responsabilidad | no especificado | Compras, Mascotas, Limpieza, Vehículos como ejemplos del asociado | Agrupación/categoría | DEMO PREMIUM |  
| Task | dependencia | no especificado | Task depends\_on Task | Mostrar bloqueada, pero no implementar real | POST\_MVP |  
| Task | recurrencia | no especificado | Genera nuevas instancias, no reutiliza | Mostrar “Martes de compras” visual | POST\_MVP / DEMO |  
| Task | verificación | no especificado | Opcional; al verificarse pasa a estado final | Badge “requiere verificación” / acción verificar | REAL parcial |  
| Task | subtarea | no especificado | Único nivel, sin anidamiento | Checklist visual | POST\_MVP |  
| Task | comentario | no especificado | Comentario en tareas | No implementar MVP | POST\_MVP |  
| Task | adjunto | no especificado | Imágenes, PDFs, archivos, audio | No implementar MVP | POST\_MVP |  
| Task | timeline | no especificado | Actividad automática y comentarios humanos | No implementar MVP | POST\_MVP |  
| PlantillaTarea | genera | no especificado | Task | Crear task prellenada | DEMO PREMIUM / REAL parcial |  
| Responsabilidad | miembros asignados | no especificado | Persona | Agrupación de tareas/responsables | DEMO PREMIUM |  
| Event | tipo | no especificado | Familiar, Personal | Badge/filtro | REAL parcial |  
| Event | estado | no especificado | Programado, Completado, Cancelado | Badge estado | REAL MÍNIMO parcial |  
| Event | fecha | no especificado | Fecha | Calendar/list/home | REAL MÍNIMO |  
| Event | hora | no especificado | Hora | Calendar/list/home | REAL MÍNIMO |  
| Event | participantes | no especificado | Persona | Avatares/lista | REAL parcial |  
| Event | postergado | no aplica | No existe estado Postergado | Modificar fecha si se posterga | Restricción |  
| Calendar | administra | no especificado | Event | Vista calendario | REAL parcial |  
| WidgetTareas | data | no especificado | Estado, progreso subtareas desde Task en archivo asociado | Home preview | Dependencia externa |  
| WidgetPróximosEventos | data | no especificado | Fecha, participantes, estado desde Event | Home preview | Dependencia externa |  
| WidgetCargaFamiliar | data | no especificado | Análisis de carga de tareas | Mock/dummy si se muestra | MOCK / POST\_MVP real |

**\---**

**\#\# 10\. Edge cases / errores / estados vacíos**

| Caso | Comportamiento esperado | Fuente | Clasificación |  
|---|---|---|---|  
| Sin tareas asignadas | Mostrar “No tenés tareas pendientes. Cuando te asignen una, aparece acá.” | Documento principal §3.3 | REAL MÍNIMO |  
| Sin eventos próximos | Mostrar “Calendario libre por ahora. ¿Agregamos un evento?” | Documento principal §3.3 | REAL MÍNIMO |  
| Tarea vencida día 1 | Mostrar aviso privado sutil | Documento principal §3.1 | DEMO PREMIUM |  
| Tarea vencida día 3 | Mostrar aviso con pregunta de ayuda | Documento principal §3.1 | DEMO PREMIUM |  
| Tarea vencida día 4 | Mostrar alerta privada reforzada con preaviso de escalar | Documento principal §3.1 | POST\_MVP si automatizado / DEMO visual |  
| Tarea vencida día 5 | Informar al Coordinador | Documento principal §3.1 | POST\_MVP si automatizado / DEMO visual |  
| ≥3 tareas atrasadas | Umbral de intervención | Archivo asociado OUTPUT 5/6 | POST\_MVP si automatizado / DEMO badge |  
| Tarea con dependencia | Pregunta abierta, puerta de salida; dependencia real queda POST\_MVP | Documento principal §3.1 / asociado OUTPUT 1 | POST\_MVP / DEMO |  
| Tarea bloqueada por dependencia | Si la previa no se completa, dependiente queda bloqueada | Archivo asociado OUTPUT 7 | POST\_MVP |  
| Tarea recurrente | Reconoce patrón; recurrencias generan nuevas instancias | Documento principal §3.1 / asociado OUTPUT 5 | POST\_MVP / DEMO |  
| Tarea completada | Feedback factual; no comparar ni elogiar excesivamente | Documento principal §3.1 | REAL MÍNIMO |  
| Conflicto de horario leve | Mostrar conflicto y preguntar “¿Revisan?” | Documento principal §3.1 | DEMO PREMIUM |  
| Conflicto con recurso compartido | Mostrar conflicto de uso de auto; no desarrollar Assets | Documento principal §3.1 | POST\_MVP / DEMO |  
| Evento postergado | No existe estado Postergado; cambiar fecha | Archivo asociado OUTPUT 5 | REAL MÍNIMO |  
| Error de conexión | Mostrar “Sin conexión...” | Documento principal §3.4 | DEMO PREMIUM / LOCAL |  
| Sincronización pendiente | Mostrar “Falta sincronizar...” si se usa estado local | Documento principal §3.4 | LOCAL / POST\_MVP si sync real |  
| Permiso denegado general | Mostrar acceso restringido | Documento principal §3.4 | DEMO PREMIUM |  
| Permiso denegado Niño | Mostrar “Esta sección es solo para adultos del hogar.” | Documento principal §3.4 | DEMO PREMIUM |  
| Error al guardar | Mostrar retry copy | Documento principal §3.4 | DEMO PREMIUM |  
| Datos inconsistentes | Mostrar revisión conjunta | Documento principal §3.4 | DEMO PREMIUM |  
| Funcionalidad no disponible | Mostrar no disponible todavía | Documento principal §3.4 | DEMO PREMIUM / POST\_MVP |  
| Carga desbalanceada | Solo visible para Coordinador; no-coordinadores no ven comparaciones | Documento principal §3.2 / asociado OUTPUT 5 | MOCK / POST\_MVP real |

**\---**

**\#\# 11\. Restricciones y prohibiciones detectadas**

**\#\#\# Restricciones funcionales para Planner**

\* Vencida no es un estado de tarea; se calcula automáticamente.  
\* Geni nunca completa tareas automáticamente.  
\* Verificación de completitud es responsabilidad humana.  
\* Geni nunca reasigna tareas unilateralmente.  
\* Reasignación requiere acción de Adulto, Coordinador o responsable.  
\* No existe estado \`Postergado\` para eventos; postergar equivale a modificar fecha.  
\* Las recurrencias generan nuevas instancias de tarea, no reutilizan la misma.  
\* Empleado Familiar no puede crear tareas; solo completar, comentar y adjuntar evidencia. Para MVP del prompt, Empleado Familiar queda fuera salvo dependencia visual.  
\* No-coordinadores no deben ver comparaciones de carga entre miembros.  
\* Invitado no recibe contexto del hogar, no ve nombres de otros miembros, tareas ajenas ni métricas familiares.

**\#\#\# Restricciones de copy/UX aplicables a Planner**

\* Objetivo, nunca juzga.  
\* Sugiere, no ordena.  
\* Pregunta antes de actuar.  
\* Reconocimiento factual, no elogio valorativo.  
\* No usar adjetivos valorativos sobre personas.  
\* No usar copy acusatorio: “No hiciste”, “Estás fallando”, “Otra vez”, “Siempre lo mismo”.  
\* No usar imperativos paternalistas: “Tenés que”, “Debés”, “Es tu obligación”.  
\* No usar comparativas entre miembros salvo vista del Coordinador y con cuidado.  
\* Máximo un emoji por mensaje.  
\* Emojis autorizados en el documento: 💜 reconocimiento, ⚠️ urgencia/SOS, 🎯 logro.  
\* En Planner evitar SOS/urgencia real salvo que otra fuente lo pida; SOS queda fuera.

**\#\#\# Restricciones de navegación**

\* Planner debe estar en Bottom Nav.  
\* Calendar no aparece como tab global separado; vive dentro de Planner.  
\* Home es inicial y no se cambia.  
\* Home resume, no administra.  
\* Toda información en Home conduce al módulo que la administra.  
\* Máximo 5 tabs por dominio.  
\* Más de 4 niveles de navegación es fallo.  
\* Modales solo para acciones cortas.  
\* Drawers solo para filtros/opciones contextuales.

**\#\#\# Restricciones de implementación para este fragment**

\* No implementar Geni real.  
\* No implementar notificaciones push reales.  
\* No implementar automatizaciones reales.  
\* No implementar auditoría completa.  
\* No implementar offline sync real.  
\* No implementar recursos compartidos reales desde Assets.  
\* No implementar Goals, Hitos ni Streaks.  
\* No implementar comentarios, adjuntos, timeline ni dependencias reales.

**\---**

**\#\# 12\. Información faltante**

| Falta | Por qué importa para Codex | Impacto |  
|---|---|---|  
| Pantalla Planner detallada | No hay layout específico de tabs/listas/cards | Codex deberá usar fragment como materia prima, no spec final |  
| Create Task UI | No se encontró formulario ni campos exactos | Acción crear tarea requiere diseño posterior |  
| Edit Task UI | No hay flujo ni permisos completos | Editar puede quedar fuera o local mínimo |  
| Delete Task UI | No aparece eliminación de tareas | No implementar salvo otra fuente lo diga |  
| List Task API/service contract | No hay endpoint, request ni response | Service deberá ser mock/local si se usa |  
| Estados MVP oficiales \`pending\`, \`completed\`, \`awaiting\_verification\`, \`verified\` | Documento usa Pendiente, En progreso, Completada, Cancelada y Verificación | Riesgo de merge; no mapear automáticamente sin fuente de merge |  
| Prioridades | Data flow menciona prioridad, pero no aparecen valores ni UI | No crear prioridad real sin otra fuente |  
| Templates MVP completas | No aparecen todas: Limpieza, Compras, Mascotas, Medicación, Estudios, Pagos | Usar solo datos encontrados o marcar faltante |  
| Verification Flow completo | Existe Verificación, pero sin estados ni pasos completos | Implementación real requiere otra fuente |  
| Calendar día/semana/mes | No aparecen vistas explícitas | No inventar UI final |  
| Recurrencia simple de eventos | No aparecen \`none/daily/weekly/monthly\` | No implementar recurrencia real desde este documento |  
| Create/Edit/Delete Event contracts | No hay endpoints ni formularios | Mantener local/demo si se necesita |  
| Participantes de evento con permisos | Solo aparece relación Event → Persona | No implementar participantes avanzados |  
| Home integration payload | No hay shape de datos | Home cards deben usar datos mock/locales si se integran |  
| Loading/skeleton/spinner | No aparecen | Feedback visual debe basarse en errores/success encontrados |  
| Permisos por rol completos para Planner | Solo hay restricciones parciales y algunas reglas | No cerrar matriz de permisos desde este documento |  
| Búsqueda/filtros | SearchGlobal indexa Task/Event, pero es avanzado; no hay filtros Planner | No desarrollar search real |  
| Criterio de cierre demo | No hay definición de “done” | Se resolverá en merge/prompt Codex |

**\---**

**\#\# 13\. Fuente**

**\#\#\# Documento principal**

Archivo: \`HomePlus — UX writing guide para geni(1).md\`

Secciones usadas:

\* Metadata: líneas 1–6.  
\* \`\#\# 1\. PERSONALIDAD DE GENI\`.  
\* \`\#\#\# 1.1 Qué es Geni\`: líneas 10–29.  
\* \`\#\#\# 1.2 Principios de comunicación\`: líneas 30–48.  
\* \`\#\#\# 1.3 Dónde aparece Geni\`: líneas 49–57.  
\* \`\#\# 2\. TABLA DE TONO POR ROL\`: líneas 58–68.  
\* \`\#\#\# 2.1 Reglas de tratamiento\`: líneas 69–74.  
\* \`\#\#\# 2.2 Sistema de escalamiento y tono\`: líneas 75–82.  
\* \`\#\#\# 3.1 NOTIFICACIONES\`: líneas 84–149.  
\* \`\#\#\# 3.2 HOME / BRIEFING\`: líneas 150–173.  
\* \`\#\#\# 3.3 EMPTY STATES\`: líneas 174–183.  
\* \`\#\#\# 3.4 ERRORES Y EDGE CASES\`: líneas 184–195.  
\* \`\#\# 4\. REGLAS DE VOZ\`: líneas 221–258.

**\#\#\# Archivo de comprensión asociado**

Archivo: \`UX writing guide para geni(1).txt\`

Secciones usadas:

\* \`OUTPUT 1 — ENTITIES\`: Planner, Task, Responsabilidad, Event, Goal, Dependencia, Recurrencia, PlantillaTarea, Verificación, Comentario, Adjunto, Timeline, Calendar, Home widgets, roles y navegación.  
\* \`OUTPUT 2 — RELATIONSHIPS\`: relaciones Planner/Task/Calendar/Event/Persona/Home/BottomNav.  
\* \`OUTPUT 3 — CROSS-DOMAIN RELATIONSHIPS\`: relación People → Task/Event, Home widgets → Planner/Event, Notificación → Task/Event.  
\* \`OUTPUT 4 — DATA FLOWS\`: Task → WidgetTareas, Event → WidgetPróximosEventos, Geni → WidgetCargaFamiliar.  
\* \`OUTPUT 5 — BUSINESS RULES\`: reglas de tareas, eventos, Home, navegación, copy y restricciones.  
\* \`OUTPUT 6 — ARCHITECTURAL DECISIONS\`: Home como centro operativo, Bottom Nav congelada, Quick Actions, More, navegación mobile-first.  
\* \`OUTPUT 7 — DERIVED\_RELATIONSHIPS\`: Task blocks Task, WidgetCargaFamiliar visible\_only\_to Coordinador, WidgetAtenciónRequerida aggregates\_from Task.  
\* \`OUTPUT 8 — GRAPH EDGES\`: relaciones grafo para Planner, Task, Calendar, Event, Home, BottomNav y QuickActions.

**\#\#\# Source map previo**

Archivo: \`source\_map\_HomePlus\_UX\_writing\_guide\_para\_geni.md\`

Secciones usadas:

\* \`\# 4.7 PLANNER\`.  
\* \`\# 4.8 TASKS\`.  
\* \`\# 4.9 EVENTS\`.  
\* \`\# 4.10 CALENDAR\`.  
\* \`\# 4.11 HOME\`, solo como dependencia externa de Planner.  
\* \`\#\# 5\. Mapa de entidades\`, solo entidades relacionadas con Planner.

